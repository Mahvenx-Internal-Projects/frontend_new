import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://lms.worksupport360.com',   // HTTPS port .NET uses in dev
        changeOrigin: true,
        secure: false,                       // ← ignore self-signed cert
      }
    }
  }
})
