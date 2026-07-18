import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({ resolve: { alias: { "@": path.resolve(__dirname, ".") } }, test: { environment: "jsdom", exclude: ["tests/firestore-rules.test.ts", "node_modules/**"] } });
