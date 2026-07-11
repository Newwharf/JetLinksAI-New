<script setup lang="ts">
/**
 * 通用二级 tab 布局
 * 从父路由 meta.tabs 读取 tab 配置，顶部 tab 栏 + 内容区
 * 支持按场景过滤：tab 配置 scenarios 字段时只在指定场景显示
 * 支持路由 meta.hideTabs=true 隐藏 tab 栏，改为返回栏（返回按钮 + 标题）
 */
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

interface TabItem {
  key: string
  label: string
  path: string
  scenarios?: string[]
}

const layoutRoute = computed(() => {
  return route.matched.find(r => Array.isArray(r.meta.tabs)) || route.matched[route.matched.length - 2]
})

const tabs = computed<TabItem[]>(() => {
  const all = (layoutRoute.value?.meta.tabs as TabItem[]) || []
  const sc = appStore.scenario
  return all.filter(t => !t.scenarios || t.scenarios.includes(sc))
})

const activeTab = computed(() => {
  const layoutPath = layoutRoute.value?.path || ''
  const fullPath = route.path
  const rest = fullPath.replace(layoutPath, '').replace(/^\//, '')
  return rest.split('/')[0]
})

watchEffect(() => {
  if (tabs.value.length === 0) return
  const layoutPath = layoutRoute.value?.path || ''
  const rest = route.path.replace(layoutPath, '').replace(/^\//, '')
  const tabKey = rest.split('/')[0]
  if (!tabKey || !tabs.value.some(t => t.key === tabKey)) {
    const first = tabs.value[0]
    if (first && route.path !== first.path) {
      router.replace(first.path)
    }
  }
})

function switchTab(tab: TabItem) {
  router.push(tab.path)
}

// ===== hideTabs 模式：隐藏 tab 栏，由详情页自行渲染返回栏 =====
const hideTabs = computed(() => !!route.meta.hideTabs)
</script>

<template>
  <div class="sub-tab-layout">
    <!-- 隐藏 tab 栏时：不渲染顶部栏，由详情页自行渲染返回栏 -->
    <!-- 正常 tab 栏 -->
    <div v-if="!hideTabs" class="sub-tabs">
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

/* 返回栏 */
.sub-back-bar {
  height: 44px;
  background: #fff;
  border-bottom: 1px solid $border-color-card;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  flex-shrink: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 10px;
  border: none;
  background: transparent;
  color: $color-primary;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  border-radius: 6px;
  transition: background 0.15s;

  i {
    font-size: 14px;
  }

  &:hover {
    background: $color-primary-bg;
  }
}

.back-title {
  font-size: 15px;
  font-weight: 600;
  color: $text-base;
}

.sub-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
