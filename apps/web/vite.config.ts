import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: fileURLToPath(new URL('../..', import.meta.url)), // 루트 .env 하나로 통일. VITE_ 접두어만 클라이언트 노출
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
})
