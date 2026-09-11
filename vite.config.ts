import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const configuredBase = env.VITE_BASE_PATH?.trim()
  const base = !configuredBase || configuredBase === '/'
    ? '/'
    : `${configuredBase.startsWith('/') ? configuredBase : `/${configuredBase}`}/`.replace(/\/+$/, '/')
  return {
    plugins: [react()],
    base,
    build: {
      rollupOptions: {
        input: {
          user: 'index.html',
          admin: 'admin.html',
        },
      },
    },
  }
})
