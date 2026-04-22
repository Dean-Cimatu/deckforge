import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'DeckForge',
        short_name: 'DeckForge',
        description: 'Turn any content into flashcards',
        theme_color: '#0f0f0f',
        background_color: '#0f0f0f',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          // Source list — used by LibraryPage
          {
            urlPattern: /\/api\/sources(\?.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-sources',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          // Individual source detail — used by SourceDetailPage
          {
            urlPattern: /\/api\/sources\/[^/]+$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-source-detail',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          // Deck cards — used by DeckStudyPage
          {
            urlPattern: /\/api\/decks\/[^/]+\/cards$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-deck-cards',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          // Review queue — used by ReviewPage
          {
            urlPattern: /\/api\/review\/queue/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-review-queue',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          // Due summary — used by HomePage
          {
            urlPattern: /\/api\/due$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-due',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 1, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
