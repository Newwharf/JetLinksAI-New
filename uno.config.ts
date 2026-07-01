import { defineConfig, presetUno, presetAttributify, presetIcons } from 'unocss'

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    // Element Plus 图标支持：<i class="i-ep-search" />
    presetIcons({
      scale: 1.2,
      warn: true,
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle'
      }
    })
  ],
  // 自定义主题色（与 Element Plus primary 协调）
  theme: {
    colors: {
      primary: '#409eff'
    }
  },
  // 全局快捷类
  shortcuts: {
    'flex-center': 'flex items-center justify-center',
    'flex-between': 'flex items-center justify-between',
    'card-base': 'bg-white rounded-lg shadow p-4'
  }
})
