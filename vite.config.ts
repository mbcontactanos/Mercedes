import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    allowedHosts: true,
    port: 3000,
  },
  preview: {
    host: true,
    port: 3001,
  },
  build: {
    // Bun/Rolldown expects manualChunks as a function.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (id.includes("react") || id.includes("scheduler") || id.includes("react-router")) {
            return "vendor-react";
          }

          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }

          if (id.includes("peerjs") || id.includes("sileo")) {
            return "vendor-utils";
          }

          return "vendor";
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    sourcemap: false,
    minify: false,
  },
});
