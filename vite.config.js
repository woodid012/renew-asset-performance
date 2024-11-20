import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    extensions: ['.js', '.jsx', '.ts', '.tsx']  // Add this line
  },
  optimizeDeps: {
    include: ['papaparse']
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/]
    },
    rollupOptions: {  // Add this section
      output: {
        manualChunks: undefined
      }
    }
  },
  assetsInclude: ['**/*.csv']
})