import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // base relativa: funciona en GitHub Pages (usuario o proyecto), Vercel y Netlify
  base: './',
  plugins: [react(), tailwindcss()],
})
