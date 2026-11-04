import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const getOrigin = (value, fallback) => {
  try {
    return new URL(value).origin
  } catch {
    return fallback
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.VITE_API_URL || 'https://api-capstone.sangkolo.my.id/api'
  const wsUrl = env.VITE_WS_URL || apiUrl.replace(/\/api\/?$/, '')
  const apiTarget = getOrigin(apiUrl, 'https://api-capstone.sangkolo.my.id')
  const wsTarget = getOrigin(wsUrl, apiTarget)

  return {
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          headers: {
            Origin: 'http://localhost:3000'
          }
        },
        '/socket.io': {
          target: wsTarget,
          ws: true,
          changeOrigin: true,
          headers: {
            Origin: 'http://localhost:3000'
          }
        }
      }
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          name: 'Maggot Smart Monitoring',
          short_name: 'MagSense',
          description: 'Sistem Otomasi dan Monitoring Budidaya Maggot',
          theme_color: '#10b981',
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/, /^\/socket\.io/],
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/.*\/api\/.*/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https?:\/\/.*\/socket\.io\/.*/i,
              handler: 'NetworkOnly',
            }
          ]
        }
      })
    ]
  }
})
