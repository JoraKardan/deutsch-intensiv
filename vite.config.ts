import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Pe GitHub Pages (build + preview) aplicația e servită din /deutsch-intensiv/; în dezvoltare din /.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/deutsch-intensiv/' : '/',
  plugins: [react()],
  server: { port: 5180, open: true },
}))
