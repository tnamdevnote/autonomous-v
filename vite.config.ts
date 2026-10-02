import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // three.js makes one large bundle; fine for a prototype.
  build: { chunkSizeWarningLimit: 1600 },
  test: {
    environment: "node",
  },
});
