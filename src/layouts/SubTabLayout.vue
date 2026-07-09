<script setup lang="ts">
/**
 * 通用二级 tab 布局
 * 从父路由 meta.tabs 读取 tab 配置，顶部 tab 栏 + 内容区
 * 支持按场景过滤：tab 配置 scenarios 字段时只在指定场景显示
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
  scenarios?: string[]  // 不填 = 所有场景都显示
}

// 从匹配链中找到带 tabs 的那一级路由
const layoutRoute = computed(() => {
  return route.matched.find(r => Array.isArray(r.meta.tabs)) || route.matched[route.matched.length - 2]
})

// 按当前场景过滤 tab
const tabs = computed<TabItem[]>(() => {
  const all = (layoutRoute.value?.meta.tabs as TabItem[]) || []
  const sc = appStore.scenario
  return all.filter(t => !t.scenarios || t.scenarios.includes(sc))
})

const activeTab = computed(() => {
  const layoutPath = layoutRoute.value?.path || ''
  const fullPath = route.path
  const rest = fullPath.replace(layoutPath, '').replace(/^\//, '')
  // 详情子路由形如 "person-profile/:id"，只取第一段以匹配 tab key
  return rest.split('/')[0]
})

// 如果当前路由是 layout 根路径（无子路径），或当前 tab 在场景下不可见，
// 自动跳转到第一个可见 tab
watchEffect(() => {
  if (tabs.value.length === 0) return
  const layoutPath = layoutRoute.value?.path || ''
  const rest = route.path.replace(layoutPath, '').replace(/^\//, '')
  // 详情子路由形如 "person-profile/:id"，取第一段判断所属 tab
  const tabKey = rest.split('/')[0]
  // 根路径 或 当前 tab 不在可见列表 → 跳第一个
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
