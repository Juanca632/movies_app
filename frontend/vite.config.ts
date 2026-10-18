/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Registered by hand in src/lib/serviceWorker.ts, which also decides when to load a new version.
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png', 'offline.css'],
      manifest: {
        name: 'MoviesApp',
        short_name: 'MoviesApp',
        description:
          "Discover movies, TV shows and actors: what's in theaters, what's trending and where to watch it.",
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0a0a0c',
        theme_color: '#0a0a0c',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // index.html is never cached, so a deploy shows up on the next page load. Only hashed
        // bundles (a new deploy means new names) and the offline page are precached; flags are
        // left to the HTTP cache, since precaching ~270 of them would be wasteful.
        globPatterns: ['**/*.{js,css}', 'offline.html'],
        navigateFallback: null,
        // A new deploy takes over open tabs at once; src/lib/serviceWorker.ts loads it on the next
        // navigation.
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Pages always come from the network; the offline page is only shown when it fails.
            // /api (sign-in redirects included) never goes through the service worker.
            urlPattern: ({ request, url }) =>
              request.mode === 'navigate' && !url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            options: { precacheFallback: { fallbackURL: '/offline.html' } },
          },
        ],
      },
    }),
  ],
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
