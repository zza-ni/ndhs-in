import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      // 개발 시 별도 백엔드가 필요한 경우 여기에 설정 (현재는 vercel same-origin 가정)
      // '/api': 'http://localhost:3000'
    },
    host: true
  },
  build: {
    outDir: 'dist',
  }
});
