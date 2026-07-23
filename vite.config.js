import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon.png',
        'apple-touch-icon.png',
        'icon-192.png',
        'icon-512.png',
        'icon-512-maskable.png',
        'og-image.png',
        'robots.txt',
        'sitemap.xml',
        'google6eb5c1ba2c31c81f.html',
      ],
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
