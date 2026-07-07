<script setup lang="ts">
// 根组件 - 承载路由出口 + Ant Design 主题配置
const theme = {
  token: {
    colorPrimary: '#6e4bff',
    colorPrimaryHover: '#7d5cff',
    colorPrimaryActive: '#5d3bff',
    // 在线/成功语义色：青蓝绿，与紫色主题同属冷调
    colorSuccess: '#2bb3a3',
    colorSuccessBg: 'rgba(43, 179, 163, 0.1)',
    borderRadius: 6,
    fontFamily:
      "AliRegular, 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif"
  }
}
</script>

<template>
  <a-config-provider :theme="theme">
    <RouterView />
  </a-config-provider>
</template>
