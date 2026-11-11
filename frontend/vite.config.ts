/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // En développement, Vite redirige /api vers l'API Express.
    // Le navigateur croit parler à un seul serveur : pas besoin de configurer CORS.
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  test: {
    environment: "jsdom", // un faux navigateur pour tester les composants
    setupFiles: ["./src/tests/setup.ts"],
  },
});
