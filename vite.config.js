import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
  },
  plugins: [
    react({ jsxRuntime: 'automatic' }),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'favicon.png',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-192-maskable.png',
        'icon-512-maskable.png',
        'og-image.png',
        'mark.svg',
        'mark-maskable.svg',
        'robots.txt',
        'sitemap.xml',
        'google6eb5c1ba2c31c81f.html',
      ],
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,svg,webmanifest}', 'icon-*.png', 'favicon.png', 'apple-touch-icon.png', 'og-image.png'],
        globIgnores: ['**/splash/**'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
