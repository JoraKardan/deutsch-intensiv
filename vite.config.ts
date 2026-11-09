import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// La build (GitHub Pages) aplicația e servită din /deutsch-intensiv/; local din /.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/deutsch-intensiv/' : '/',
  plugins: [react()],
  server: { port: 5180, open: true },
}))
