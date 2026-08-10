import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base works for GitHub Pages project sites and local preview
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
  },
})
