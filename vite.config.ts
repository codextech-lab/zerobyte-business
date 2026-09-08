import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        user: 'index.html',
        admin: 'admin.html',
      },
    },
  },
})
