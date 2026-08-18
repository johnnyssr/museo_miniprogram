import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 后台是纯静态站点，构建产物在 dist/，用于 CloudBase 静态网站托管
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
  },
})
