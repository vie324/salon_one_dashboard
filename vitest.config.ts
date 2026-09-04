import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Minimal Vitest setup. We resolve the "@/*" path alias inline (mirroring
// tsconfig.json) so no extra dependency is needed, and run in a node
// environment because every unit under test is pure / server-side logic.
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
  },
});
