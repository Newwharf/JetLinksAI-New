<script setup lang="ts">
/**
 * 区域空间管理 - 占位页
 */
</script>

<template>
  <div class="area-page">
    <div class="placeholder">
      <i class="i-ant-design-appstore-outlined placeholder-icon" />
      <h2>空间管理</h2>
      <p>该页面待开发</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.area-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-page;
}

.placeholder {
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
