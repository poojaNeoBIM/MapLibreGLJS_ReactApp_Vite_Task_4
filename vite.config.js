import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./",
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@babylonjs/core',
      '@babylonjs/loaders',
      '@babylonjs/materials',
      'maplibre-gl'
    ],
    // Optionally, specify any dependencies to exclude
    // exclude: ['some-package']
  }
});
