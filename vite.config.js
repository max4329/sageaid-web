import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    // 开发环境仍从根路径启动；生产包默认部署到不公开的后台路径。
    base: env.VITE_PUBLIC_BASE || (mode === 'production' ? '/sage-manage-8f3k2/' : '/'),
    plugins: [vue()],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_PROXY_TARGET || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  }
})


