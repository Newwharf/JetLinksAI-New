<script setup lang="ts">
/**
 * SaaS 顶层布局
 * 顶部菜单横排(无侧栏)+ 主内容区
 * 与项目内部 ProjectLayout 平级、互不嵌套
 */
import { useRoute, useRouter } from 'vue-router'
import logoImg from '@/assets/saas/logo.png'
import GuideOverlay from '@/components/GuideOverlay.vue'

const route = useRoute()
const router = useRouter()

interface TopMenu {
  key: string
  label: string
  path: string
}

const menus: TopMenu[] = [
  { key: 'workbench', label: '工作台', path: '/workbench' },
  { key: 'apps', label: '应用中心', path: '/apps' },
  { key: 'dev', label: '开发中心', path: '/dev' },
  { key: 'ops', label: '运营中心', path: '/ops' },
  { key: 'billing', label: '支付中心', path: '/billing' },
  { key: 'saas-system', label: '系统管理', path: '/saas-system' }
]

// 当前激活:路由前缀匹配
const activeKey = computed(() => {
  const path = route.path
  for (const m of menus) {
    if (path === m.path || path.startsWith(m.path + '/')) return m.key
  }
  return ''
})

function handleMenuClick(m: TopMenu) {
  router.push(m.path)
}

function openDocs() {
  router.push('/docs')
}
</script>

<template>
  <div class="saas-layout">
    <!-- 顶部菜单 -->
    <header class="saas-header">
      <div class="header-left">
        <img :src="logoImg" alt="JetLinks Cloud" class="logo-img" />
      </div>

      <nav class="header-menu">
        <a
          v-for="m in menus"
          :key="m.key"
          class="menu-item"
          :class="{ 'is-active': activeKey === m.key }"
          @click="handleMenuClick(m)"
        >
          {{ m.label }}
        </a>
      </nav>

      <div class="header-right">
        <div class="header-bell">
          <i class="i-ant-design-bell-outlined header-icon" />
        </div>
        <button class="header-bell header-help" type="button" title="文档中心" @click="openDocs">
          <i class="i-ant-design-question-circle-outlined header-icon" />
        </button>
        <div class="user-trigger">
          <div class="user-avatar">李</div>
          <span class="user-name">李瀚</span>
          <i class="i-ant-design-down-outlined user-arrow" />
        </div>
      </div>
    </header>

    <!-- 主内容 -->
    <main class="saas-main">
      <RouterView />
    </main>

    <GuideOverlay />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.saas-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  /* 全局渐变：从顶部菜单栏延伸到整个屏幕，白色终点推后以保留中部蓝色 */
  background: linear-gradient(180deg, $saas-header-bg-start 0%, $saas-hero-bg-start 10%, $saas-hero-bg-end 45%, #ffffff 90%);
}

/* ===== 顶部菜单（融入渐变，半透明白底）===== */
.saas-header {
  position: relative;
  z-index: 2; /* 始终浮于背景图之上 */
  height: 48px;
  background: transparent;
  display: flex;
  align-items: center;
  padding: 0 20px;
  flex-shrink: 0;
  gap: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;

  .logo-img {
    height: 24px;
    width: auto;
    display: block;
  }
}

/* 菜单横排 */
.header-menu {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  overflow-x: auto;

  &::-webkit-scrollbar {
    display: none;
  }
}

.menu-item {
  position: relative;
  height: 48px;
  line-height: 48px;
  padding: 0 14px;
  font-size: 14px;
  color: $text-secondary;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s;

  &:hover {
    color: $saas-primary;
  }

  &.is-active {
    color: $saas-primary;
    font-weight: 500;

    &::after {
      content: '';
      position: absolute;
      left: 14px;
      right: 14px;
      bottom: 0;
      height: 2px;
      background: $saas-primary;
      border-radius: 1px;
    }
  }
}

/* 右侧用户 */
.header-right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-bell {
  width: 32px;
  height: 32px;
  border: 0;
  padding: 0;
  border-radius: 50%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 2px 10px rgba(59, 130, 246, 0.2);
  }
}

.header-help {
  font: inherit;
}

.header-icon {
  font-size: 16px;
  color: $text-secondary;
  transition: color 0.2s;
}

.header-bell:hover .header-icon {
  color: $saas-primary;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 0 4px;

  .user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: $saas-primary;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    flex-shrink: 0;
  }

  .user-name {
    font-size: 14px;
    color: $text-base;
  }

  .user-arrow {
    font-size: 10px;
    color: $text-muted;
  }
}

/* ===== 主内容 ===== */
.saas-main {
  flex: 1;
  overflow: auto;
}
</style>
