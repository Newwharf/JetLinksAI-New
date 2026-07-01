import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { AntDesignVueResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    UnoCSS(),
    AutoImport({
      // 自动导入 Vue / Vue Router / Pinia 的常用 API
      imports: ['vue', 'vue-router', 'pinia'],
      dts: 'src/types/auto-imports.d.ts',
      eslintrc: { enabled: false }
    }),
    Components({
      // 自动注册 Ant Design Vue 组件（与原站点一致）
      resolvers: [
        AntDesignVueResolver({
          importStyle: false // 原站点使用自定义主题，不引入默认样式
        })
      ],
      dts: 'src/types/components.d.ts'
    })
  ],
  css: {
    preprocessorOptions: {
      scss: {
        // 使用现代 Sass API，消除 legacy-js-api 弃用警告
        api: 'modern-compiler'
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true
  }
})
