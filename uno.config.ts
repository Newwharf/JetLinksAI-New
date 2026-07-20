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
  },
  // 确保动态绑定的图标 class 被生成（mock 数据中的图标名无法被静态扫描）
  safelist: [
    'i-ant-design-safety-outlined',
    'i-ant-design-fire-outlined',
    'i-ant-design-team-outlined',
    'i-ant-design-car-outlined',
    'i-ant-design-property-safety-outlined',
    'i-ant-design-bell-outlined',
    'i-ant-design-radar-chart-outlined',
    'i-ant-design-thermometer-outlined',
    'i-ant-design-experiment-outlined',
    'i-ant-design-bulb-outlined',
    'i-ant-design-door-outlined',
    'i-ant-design-swap-outlined',
    'i-ant-design-thunderbolt-outlined',
    'i-ant-design-sound-outlined',
    'i-ant-design-dashboard-outlined',
    'i-ant-design-environment-outlined',
    'i-ant-design-wifi-outlined',
    // 网关详情顶部 KPI 图标（动态绑定，需 safelist）
    'i-ant-design-api-outlined',
    'i-ant-design-deployment-unit-outlined',
    'i-ant-design-cloud-upload-outlined',
    // 网关详情子设备类型图标（动态绑定，需 safelist）
    'i-ant-design-video-camera-outlined',
    'i-ant-design-radarchart-outlined',
    'i-ant-design-control-outlined',
    'i-ant-design-bell-outlined',
    'i-ant-design-fire-outlined',
    'i-ant-design-compass-outlined',
    'i-ant-design-bar-chart-outlined',
    'i-ant-design-dot-chart-outlined',
    // 远程调试功能菜单图标（动态绑定，需 safelist）
    'i-ant-design-code-outlined',
    'i-ant-design-global-outlined',
    'i-ant-design-desktop-outlined',
    'i-ant-design-folder-outlined',
    // 文件管理文件类型图标
    'i-ant-design-folder-filled',
    'i-ant-design-folder-add-outlined',
    'i-ant-design-folder-open-outlined',
    'i-ant-design-file-outlined',
    'i-ant-design-file-text-outlined',
    'i-ant-design-file-image-outlined',
    'i-ant-design-file-search-outlined',
    'i-ant-design-file-pdf-outlined',
    'i-ant-design-upload-outlined',
    'i-ant-design-code-sandbox-outlined',
    // 视觉模型检测类型 + 操作图标（动态绑定，需 safelist）
    'i-ant-design-user-outlined',
    'i-ant-design-safety-outlined',
    'i-ant-design-shield-outlined',
    'i-ant-design-team-outlined',
    'i-ant-design-apartment-outlined',
    'i-ant-design-history-outlined'
  ]
})
