import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite-plus'

// https://vite.dev/config/
export default defineConfig({
  plugins: [basicSsl(), react(), tailwindcss()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@convex': path.resolve(__dirname, '../../convex'),
      events: path.resolve(__dirname, 'node_modules/events/events.js'),
    },
  },
  run: {
    enablePrePostScripts: true,
    tasks: {
      build: {
        command: 'vp build',
        input: ['src/**', 'public/**', 'index.html', 'vite.config.ts'],
      },
      check: {
        command: 'vp check',
        input: ['src/**'],
      },
    },
  },
})
