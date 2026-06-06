import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/printflow/',
  plugins: [react()],
  server: {
    host: true, // Listen on all local IPs
  }
})
