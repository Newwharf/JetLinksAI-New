<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'

interface OpsMenuItem {
  key: string
  label: string
  path?: string
  icon: string
  children?: Array<{ key: string; label: string; path: string }>
}

const route = useRoute()
const router = useRouter()

const menus: OpsMenuItem[] = [
  { key: 'basic', label: '基础配置', path: '/ops/basic-config', icon: 'i-ant-design-setting-outlined' },
  { key: 'agent', label: '智能体开发', path: '/ops/agent-dev', icon: 'i-ant-design-robot-outlined' },
  { key: 'apps', label: '应用中心', path: '/ops/app-center', icon: 'i-ant-design-appstore-outlined' },
  {
    key: 'operation',
    label: '运营管理',
    icon: 'i-ant-design-control-outlined',
    children: [
      { key: 'customer', label: '客户管理', path: '/ops/operation/customer' },
      { key: 'work-order', label: '工单管理', path: '/ops/operation/work-order' }
    ]
  },
  { key: 'market', label: '能力市场', path: '/ops/capability-market', icon: 'i-ant-design-shop-outlined' },
  { key: 'asset', label: '资产管理', path: '/ops/asset', icon: 'i-ant-design-database-outlined' }
]

function isActive(item: OpsMenuItem) {
  if (item.children?.length) return item.children.some(child => route.path === child.path || route.path.startsWith(child.path + '/'))
  return !!item.path && (route.path === item.path || route.path.startsWith(item.path + '/'))
}

function isChildActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <div class="ops-layout">
    <aside class="ops-sidebar">
      <nav class="ops-menu">
        <div v-for="item in menus" :key="item.key" class="ops-menu__group">
          <button
            class="ops-menu__item"
            :class="{ active: isActive(item), expanded: item.children?.length }"
            type="button"
            @click="item.path && router.push(item.path)"
          >
            <i :class="item.icon" />
            <span>{{ item.label }}</span>
            <i v-if="item.children?.length" class="i-ant-design-down-outlined ops-menu__arrow" />
          </button>

          <div v-if="item.children?.length" class="ops-submenu">
            <button
              v-for="child in item.children"
              :key="child.key"
              class="ops-submenu__item"
              :class="{ active: isChildActive(child.path) }"
              type="button"
              @click="router.push(child.path)"
            >
              {{ child.label }}
            </button>
          </div>
        </div>
      </nav>
    </aside>

    <main class="ops-main">
      <RouterView />
    </main>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.ops-layout {
  height: 100%;
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  background: $bg-page;
}

.ops-sidebar {
  min-height: 0;
  border-right: 1px solid $border-color-card;
  background: rgba(255, 255, 255, 0.86);
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
}

.ops-menu {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ops-menu__group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.ops-menu__item,
.ops-submenu__item {
  width: 100%;
  border: none;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s, color 0.15s;
}

.ops-menu__item {
  height: 36px;
  padding: 0 10px;
  border-radius: 6px;
  background: transparent;
  color: $text-secondary;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;

  > i:first-child {
    font-size: 15px;
    color: $text-muted;
  }

  span {
    flex: 1;
    min-width: 0;
  }

  &:hover,
  &.active {
    color: $saas-primary;
    background: $saas-primary-bg;

    > i:first-child {
      color: $saas-primary;
    }
  }

  &.expanded {
    cursor: default;
  }
}

.ops-menu__arrow {
  font-size: 10px;
  color: $text-muted;
}

.ops-submenu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: 33px;
}

.ops-submenu__item {
  height: 30px;
  padding: 0 10px;
  border-radius: 6px;
  background: transparent;
  color: $text-tertiary;
  font-size: 13px;

  &:hover,
  &.active {
    color: $saas-primary;
    background: $saas-primary-bg;
  }
}

.ops-main {
  min-width: 0;
  min-height: 0;
  overflow: auto;
}
</style>
