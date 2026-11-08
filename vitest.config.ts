import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./app"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  test: {
    // Each database test file boots its own in-memory Postgres, which is slow on a small machine.
    hookTimeout: 90_000,
    testTimeout: 30_000,
    maxWorkers: 2,
    env: { DATABASE_URL: "pglite:memory" },
    exclude: [
      "**/node_modules/**",
      "**/.git/**",
      "**/dist/**",
      "**/.react-router/**",
    ],
  },
});
