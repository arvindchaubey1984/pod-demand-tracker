import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Absolute project base so GitHub Pages loads JS/CSS with or without trailing slash.
// Override via VITE_BASE for org vs personal hosting paths.
export default defineConfig({
  base: process.env.VITE_BASE || '/pod-demand-tracker/',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
})
