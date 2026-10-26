// Builds demo.html as a self-contained page with relative asset paths, so it can be
// hosted anywhere (e.g. a shared link) without the router or a second window.
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist-demo",
    chunkSizeWarningLimit: 1600,
    rollupOptions: { input: "demo.html" },
  },
});
