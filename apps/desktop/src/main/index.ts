import { app, BrowserWindow, Menu, Tray, dialog, ipcMain, nativeImage, protocol } from "electron";
import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { IPC_CHANNELS } from "@aural/contracts";
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
let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;
let closePromptOpen = false;
const preloadPath = path.join(__dirname, "index.mjs");
const rendererIndexPath = path.join(__dirname, "../dist/index.html");
const BEFORE_QUIT_FLUSH_CHANNEL = `${IPC_CHANNELS.system}:beforeQuitFlush`;
const BEFORE_QUIT_FLUSH_ACK_CHANNEL = `${IPC_CHANNELS.system}:beforeQuitFlushAck`;

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
    const parsedUrl = new URL(request.url);
    const targetPath = parsedUrl.searchParams.get("path");
    const targetStreamUrl = parsedUrl.searchParams.get("url");

    if (targetStreamUrl) {
      try {
        const response = await fetch(targetStreamUrl, {
          headers: request.headers.get("range")
            ? {
                range: request.headers.get("range")!
              }
            : undefined
        });

        if (!response.ok && response.status !== 206) {
          return new Response("Upstream stream request failed", { status: response.status });
        }

        const headers = new Headers();
        const passthroughHeaders = [
          "accept-ranges",
          "content-length",
          "content-range",
          "content-type",
          "cache-control"
        ];

        passthroughHeaders.forEach((headerName) => {
          const value = response.headers.get(headerName);
          if (value) {
            headers.set(headerName, value);
          }
        });

        if (!headers.has("content-type")) {
          headers.set("content-type", "audio/mpeg");
        }

        return new Response(response.body, {
          status: response.status,
          headers
        });
      } catch {
        return new Response("Failed to proxy media stream", { status: 502 });
      }
    }

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

const resolveTrayIcon = async () => {
  const candidates = [
    path.join(__dirname, "../build/icon.ico"),
    path.join(process.resourcesPath, "icon.ico"),
    path.join(process.resourcesPath, "build", "icon.ico")
  ];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      const image = nativeImage.createFromPath(candidate);
      if (!image.isEmpty()) {
        return image;
      }
    } catch {
      // Keep checking the next candidate.
    }
  }

  try {
    return await app.getFileIcon(process.execPath, { size: "normal" });
  } catch {
    return nativeImage.createEmpty();
  }
};

const showMainWindow = async () => {
  if (!mainWindow) {
    await createWindow();
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
};

const hideMainWindowToTray = () => {
  if (!mainWindow) {
    return;
  }

  mainWindow.hide();
};

const requestRendererFlushBeforeQuit = async () => {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) {
    return;
  }

  const targetWebContents = mainWindow.webContents;

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      ipcMain.removeListener(BEFORE_QUIT_FLUSH_ACK_CHANNEL, handleAck);
      resolve();
    };
    const handleAck = (event: Electron.IpcMainEvent) => {
      if (event.sender !== targetWebContents) {
        return;
      }
      finish();
    };

    ipcMain.on(BEFORE_QUIT_FLUSH_ACK_CHANNEL, handleAck);
    targetWebContents.send(BEFORE_QUIT_FLUSH_CHANNEL);
    setTimeout(finish, 1500);
  });
};

const quitApplication = () => {
  if (isQuitting) {
    return;
  }

  void (async () => {
    await requestRendererFlushBeforeQuit();
    isQuitting = true;
    app.quit();
  })();
};

const ensureTray = async () => {
  if (tray) {
    return tray;
  }

  tray = new Tray(await resolveTrayIcon());
  tray.setToolTip("Aural");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Open Aural",
        click: () => {
          void showMainWindow();
        }
      },
      {
        type: "separator"
      },
      {
        label: "Exit",
        click: () => {
          quitApplication();
        }
      }
    ])
  );
  tray.on("click", () => {
    void showMainWindow();
  });

  return tray;
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
  mainWindow = window;

  window.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    if (closePromptOpen) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    closePromptOpen = true;

    void (async () => {
      try {
        await ensureTray();
        const { response } = await dialog.showMessageBox(window, {
          type: "question",
          title: "Close Aural",
          message: "How should Aural handle this close action?",
          detail: "Choose background running to hide the app to the system tray, or exit to fully close it.",
          buttons: ["Run in background", "Exit app"],
          defaultId: 0,
          cancelId: 0,
          noLink: true
        });

        if (response === 1) {
          quitApplication();
          return;
        }

        hideMainWindowToTray();
      } finally {
        closePromptOpen = false;
      }
    })();
  });

  window.on("closed", () => {
    if (mainWindow === window) {
      mainWindow = null;
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    await window.loadURL(process.env.VITE_DEV_SERVER_URL);
    window.webContents.openDevTools({ mode: "detach" });
    return window;
  }

  await window.loadFile(rendererIndexPath);
  return window;
};

app.whenReady().then(() => {
  registerMediaProtocol();
  appServices = createAppServices(app.getPath("userData"));
  registerIpcHandlers(appServices.bridge);
  void createWindow();

  app.on("activate", () => {
    if (!mainWindow) {
      void createWindow();
      return;
    }

    void showMainWindow();
  });
});

app.on("before-quit", () => {
  isQuitting = true;
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
