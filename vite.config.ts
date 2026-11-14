import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Mirrors nginx.conf so the dev server and the gateway route identically.
    // Order matters: specific prefixes first, the '/api' catch-all last.
    proxy: {
      '/api/v1/health/identity': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        rewrite: () => '/health',
      },
      '/api/v1/health/rumour': {
        target: 'http://127.0.0.1:8002',
        changeOrigin: true,
        rewrite: () => '/health',
      },
      '/api/v1/health/scam': {
        target: 'http://127.0.0.1:8003',
        changeOrigin: true,
        rewrite: () => '/health',
      },
      '/api/v1/health/image': {
        target: 'http://127.0.0.1:8004',
        changeOrigin: true,
        rewrite: () => '/health',
      },
      '/api/v1/scams': {
        target: 'http://127.0.0.1:8003',
        changeOrigin: true,
        secure: false,
      },
      '/api/v1/images': {
        target: 'http://127.0.0.1:8004',
        changeOrigin: true,
        secure: false,
      },
      '/api/v1/auth': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false,
      },
      '/api/v1/profile': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false,
      },
      '/media': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        secure: false,
      },
      '/api/v1/rumours': {
        target: 'http://127.0.0.1:8002',
        changeOrigin: true,
        secure: false,
      },
      '/v1': {
        target: 'http://127.0.0.1:8002',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://127.0.0.1:8002',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
