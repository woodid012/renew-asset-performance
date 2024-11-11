import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  },
  optimizeDeps: {
    include: ['papaparse']
  },
  build: {
    commonjsOptions: {
      include: [/node_modules/]
    }
  },
  assetsInclude: ['**/*.csv']  // Add this line to handle CSV files
})