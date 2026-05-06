import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { defineConfig } from 'vite-plus'

// https://vite.dev/config/
export default defineConfig({
  plugins: [nodePolyfills({ globals: { Buffer: 'build', process: 'build' } }), react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@convex': path.resolve(__dirname, '../../convex'),
      'process/': 'process',
      'buffer/': 'buffer',
      'vite-plugin-node-polyfills/shims/process/': 'vite-plugin-node-polyfills/shims/process',
      'vite-plugin-node-polyfills/shims/buffer/': 'vite-plugin-node-polyfills/shims/buffer',
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
