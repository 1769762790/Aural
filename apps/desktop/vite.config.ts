import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import electron from "vite-plugin-electron/simple";

const root = path.resolve(__dirname, "../..");

const alias = {
  "@aural/contracts": path.resolve(root, "packages/contracts/src"),
  "@aural/domain": path.resolve(root, "packages/domain/src"),
  "@aural/domain/src": path.resolve(root, "packages/domain/src"),
  "@aural/data": path.resolve(root, "packages/data/src"),
  "@aural/library": path.resolve(root, "packages/library/src"),
  "@aural/player": path.resolve(root, "packages/player/src"),
  "@aural/search": path.resolve(root, "packages/search/src"),
  "@aural/ui": path.resolve(root, "packages/ui/src"),
  "@": path.resolve(__dirname, "src/renderer"),
  "@renderer": path.resolve(__dirname, "src/renderer"),
  "@main": path.resolve(__dirname, "src/main"),
  "@preload": path.resolve(__dirname, "src/preload")
};

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  resolve: {
    alias
  },
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: "src/main/index.ts",
        onstart(options) {
          options.startup()
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ["@ffmpeg-installer/ffmpeg", "fluent-ffmpeg"]
            }
          }
        }
      },
      preload: {
        input: path.join(__dirname, "src/preload/index.ts")
      }
    })
  ],
  server: {
    port: 1420
  }
});
