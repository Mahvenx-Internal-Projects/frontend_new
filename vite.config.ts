import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://api.worksupport360.com',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          // Remove body size limit on proxy
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.removeHeader('content-length');
          });
        },
      }
    }
  }
})
