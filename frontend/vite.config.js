import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import seoPrerender from './seoPrerender.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss(),seoPrerender()],
})
