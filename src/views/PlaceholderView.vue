<script setup lang="ts">
/**
 * 通用占位页
 */
import { useRoute } from 'vue-router'

const route = useRoute()
const title = computed(() => (route.meta.title as string) || '页面')
</script>

<template>
  <div class="placeholder-page">
    <div class="placeholder-box">
      <i class="i-ant-design-appstore-outlined placeholder-icon" />
      <h2>{{ title }}</h2>
      <p>该页面待开发</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.placeholder-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-page;
}

.placeholder-box {
  text-align: center;
  color: $text-tertiary;

  .placeholder-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.4;
  }

  h2 {
    font-size: 18px;
    font-weight: 500;
    color: $text-secondary;
    margin: 0 0 8px;
  }

  p {
    font-size: 14px;
    margin: 0;
  }
}
</style>
