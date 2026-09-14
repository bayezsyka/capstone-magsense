import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Ini akan mengekspos project ke jaringan lokal (0.0.0.0)
    port: 3000, // Kamu bisa menentukan port spesifik di sini (opsional)
  },
})