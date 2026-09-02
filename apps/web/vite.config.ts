import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: fileURLToPath(new URL('../..', import.meta.url)), // 루트 .env 하나로 통일. VITE_ 접두어만 클라이언트 노출
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    // xfwd: 프록시가 Host를 3000으로 바꾸므로 원래 origin(5173)을 X-Forwarded-Host/Proto로 전달. 카카오 redirect_uri 계산에 필요
    proxy: { '/api': { target: 'http://localhost:3000', xfwd: true } },
  },
})
