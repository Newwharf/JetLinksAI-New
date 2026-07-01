<script setup lang="ts">
/**
 * 通用二级 tab 布局
 * 从父路由 meta.tabs 读取 tab 配置，顶部 tab 栏 + 内容区
 */
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

interface TabItem {
  key: string
  label: string
  path: string
}

// 从匹配链中找到带 tabs 的那一级路由
const layoutRoute = computed(() => {
  return route.matched.find(r => Array.isArray(r.meta.tabs)) || route.matched[route.matched.length - 2]
})

const tabs = computed<TabItem[]>(() => (layoutRoute.value?.meta.tabs as TabItem[]) || [])

const activeTab = computed(() => {
  // 用最后一段路径作为 key
  const layoutPath = layoutRoute.value?.path || ''
  const fullPath = route.path
  // 当前路径去掉 layout 前缀后的剩余部分
  const rest = fullPath.replace(layoutPath, '')
  return rest.replace(/^\//, '')
})

function switchTab(tab: TabItem) {
  router.push(tab.path)
}
</script>

<template>
  <div class="sub-tab-layout">
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
    <div class="sub-content">
      <RouterView />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.sub-tab-layout {
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
  overflow-x: auto;
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
  white-space: nowrap;
  transition: color 0.2s;

  &:hover {
    color: $color-primary;
  }

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
