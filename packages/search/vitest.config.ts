import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(root, "../..");

export default {
  root,
  resolve: {
    alias: {
      "@aural/domain/entities": path.resolve(projectRoot, "packages/domain/src/entities.ts"),
      "@aural/domain/search": path.resolve(projectRoot, "packages/domain/src/search.ts")
    }
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globals: true
  }
};
