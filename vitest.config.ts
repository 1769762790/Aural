import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@aural/contracts": path.resolve(__dirname, "packages/contracts/src"),
      "@aural/domain": path.resolve(__dirname, "packages/domain/src"),
      "@aural/domain/src": path.resolve(__dirname, "packages/domain/src"),
      "@aural/data": path.resolve(__dirname, "packages/data/src"),
      "@aural/library": path.resolve(__dirname, "packages/library/src"),
      "@aural/player": path.resolve(__dirname, "packages/player/src"),
      "@aural/search": path.resolve(__dirname, "packages/search/src"),
      "@aural/ui": path.resolve(__dirname, "packages/ui/src")
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "packages/*/tests/**/*.test.ts"],
    globals: true
  }
});
