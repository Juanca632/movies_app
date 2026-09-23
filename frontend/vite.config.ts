/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
