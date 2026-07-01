<script setup lang="ts">
/**
 * 空间态势二级布局
 * 顶部 tab（空间态势 / 区域空间管理）+ 内容区
 */
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const tabs = [
  { key: 'situation', label: '空间态势', path: '/space/situation' },
  { key: 'area', label: '空间管理', path: '/space/area' }
]

const activeTab = computed(() => {
  if (route.path.includes('/area')) return 'area'
  return 'situation'
})

function switchTab(tab: { key: string; path: string }) {
  router.push(tab.path)
}
</script>

<template>
  <div class="space-layout">
    <!-- 二级 tab -->
    <div class="sub-tabs">
      <div
        v-for="t in tabs"
        :key="t.key"
        class="sub-tab"
        :class="{ active: activeTab === t.key }"
        @click="switchTab(t)"
      >
        {{ t.label }}
      </div>
    </div>
    <!-- 内容区 -->
    <div class="sub-content">
      <RouterView />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.space-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-page;
}

.sub-tabs {
  height: 44px;
  background: #fff;
  border-bottom: 1px solid $border-color-card;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 4px;
  flex-shrink: 0;
}

.sub-tab {
  position: relative;
  height: 44px;
  line-height: 44px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  color: $text-secondary;
  cursor: pointer;
  transition: color 0.2s;

  &:hover {
    color: $color-primary;
  }

  // 选中态：紫色文字 + 底部紫色下划线
  &.active {
    color: $color-primary;

    &::after {
      content: '';
      position: absolute;
      left: 16px;
      right: 16px;
      bottom: 0;
      height: 2px;
      background: $color-primary;
      border-radius: 1px;
    }
  }
}

.sub-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
