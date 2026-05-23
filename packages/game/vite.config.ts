import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    target: 'es2022',
    assetsInlineLimit: 0,
  },
  server: {
    fs: {
      allow: ['..', '../..'],
    },
  },
})
