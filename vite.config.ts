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
    // Optimización de chunks para mejorar la carga inicial
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-icons': ['lucide-react'],
          'vendor-utils': ['peerjs', 'sileo'],
        },
      },
    },
    // Reducir el tamaño del bundle
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
  },
});
