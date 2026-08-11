import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Absolute project base so GitHub Pages loads JS/CSS with or without trailing slash
export default defineConfig({
  base: '/Account-Demand-Tracker/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
})
