/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The API lives on the same origin in production; mirror that locally. The browser's Host is
  // kept (the string shorthand would rewrite it), since the backend builds Google's redirect URI
  // and checks Origin against it.
  server: { proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: false } } },
  preview: { proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: false } } },
  build: {
    // Flags are loaded on demand; inlining ~270 of them would bloat the main bundle.
    assetsInlineLimit: (file) => (file.includes('/flag-icons/') ? false : undefined),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-utils/setup.ts'],
    css: false,
  },
})
