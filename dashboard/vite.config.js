import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/command': 'http://localhost:8000',
      '/devices':  'http://localhost:8000',
      '/stats':    'http://localhost:8000',
      '/logs':     'http://localhost:8000',
      '/ws': {
        target:    'ws://localhost:8000',
        ws:        true,
        rewriteWsOrigin: true,
      },
    },
  },
})
