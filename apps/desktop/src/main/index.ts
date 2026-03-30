import { app, BrowserWindow, protocol } from "electron";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { registerIpcHandlers } from "./ipc";
import { createAppServices } from "./services";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MEDIA_PROTOCOL = "aural-media";
const MEDIA_MIME_TYPES: Record<string, string> = {
  ".aac": "audio/aac",
  ".alac": "audio/mp4",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".webm": "audio/webm",
  ".wma": "audio/x-ms-wma"
};

protocol.registerSchemesAsPrivileged([
  {
    scheme: MEDIA_PROTOCOL,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

let appServices: ReturnType<typeof createAppServices> | null = null;
let didShutdown = false;
const preloadPath = path.join(__dirname, "index.mjs");
const rendererIndexPath = path.join(__dirname, "../dist/index.html");

const toWebStream = (stream: ReturnType<typeof createReadStream>) =>
  Readable.toWeb(stream) as ReadableStream<Uint8Array>;

const inferMediaMimeType = (targetPath: string) =>
  MEDIA_MIME_TYPES[path.extname(targetPath).toLowerCase()] ?? "application/octet-stream";

const parseRangeHeader = (rangeHeader: string | null, fileSize: number) => {
  if (!rangeHeader?.startsWith("bytes=")) {
    return null;
  }

  const [startToken, endToken] = rangeHeader.replace("bytes=", "").split("-", 2);
  if (!startToken && !endToken) {
    return null;
  }

  let start = startToken ? Number.parseInt(startToken, 10) : Number.NaN;
  let end = endToken ? Number.parseInt(endToken, 10) : Number.NaN;

  if (Number.isNaN(start)) {
    const suffixLength = Number.isNaN(end) ? 0 : end;
    if (!suffixLength) {
      return null;
    }
    start = Math.max(0, fileSize - suffixLength);
    end = fileSize - 1;
  } else {
    end = Number.isNaN(end) ? fileSize - 1 : Math.min(end, fileSize - 1);
  }

  if (start < 0 || start >= fileSize || end < start) {
    return "invalid";
  }

  return {
    start,
    end
  };
};

const registerMediaProtocol = () => {
  protocol.handle(MEDIA_PROTOCOL, async (request) => {
    const targetPath = new URL(request.url).searchParams.get("path");
    if (!targetPath) {
      return new Response("Missing media path", { status: 400 });
    }

    try {
      const fileStat = await stat(targetPath);
      if (!fileStat.isFile()) {
        return new Response("Not found", { status: 404 });
      }

      const mimeType = inferMediaMimeType(targetPath);
      const range = parseRangeHeader(request.headers.get("range"), fileStat.size);
      if (range === "invalid") {
        return new Response(null, {
          status: 416,
          headers: {
            "Accept-Ranges": "bytes",
            "Content-Range": `bytes */${fileStat.size}`
          }
        });
      }

      if (range) {
        const stream = createReadStream(targetPath, { start: range.start, end: range.end });
        return new Response(toWebStream(stream), {
          status: 206,
          headers: {
            "Accept-Ranges": "bytes",
            "Content-Length": String(range.end - range.start + 1),
            "Content-Range": `bytes ${range.start}-${range.end}/${fileStat.size}`,
            "Content-Type": mimeType
          }
        });
      }

      const stream = createReadStream(targetPath);
      return new Response(toWebStream(stream), {
        status: 200,
        headers: {
          "Accept-Ranges": "bytes",
          "Content-Length": String(fileStat.size),
          "Content-Type": mimeType
        }
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });
};

const createWindow = async () => {
  const window = new BrowserWindow({
    width: 1540,
    height: 960,
    minWidth: 1280,
    minHeight: 820,
    backgroundColor: "#09090b",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "hidden",
    ...(process.platform !== "darwin"
      ? {
          titleBarOverlay: {
            color: "#09090b00",
            symbolColor: "#f5f7fb",
            height: 52
          }
        }
      : {}),
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
    window.webContents.openDevTools({ mode: "detach" });
    return;
  }

  await window.loadFile(rendererIndexPath);
};

app.whenReady().then(() => {
  registerMediaProtocol();
  appServices = createAppServices(app.getPath("userData"));
  registerIpcHandlers(appServices.bridge);
  void createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on("before-quit", () => {
  if (didShutdown) {
    return;
  }

  didShutdown = true;

  try {
    appServices?.beforeQuit();
  } finally {
    // Ensure settings reads in beforeQuit happen while the DB is still open.
    try {
      appServices?.database.close();
    } catch {
      // ignore already-closed DB
    }
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
