<script setup lang="ts">
/**
 * 项目级布局 - 1:1 复刻 JetLinks 项目框架
 * 顶栏 + 侧栏菜单 + 主内容区
 * 数据来源：UAT 站 cloud-uat.jetlinks.cn computedStyle 提取
 */
import { useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// 亮色/暗色模式切换
const isDark = ref(false)
function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

// 菜单数据：左侧只展示一级菜单，二级 tab 在页面顶部展示
interface MenuItem {
  key: string
  label: string
  icon: string
  path?: string
}

const menus: MenuItem[] = [
  { key: 'space', label: '空间态势', icon: 'i-ant-design-apartment-outlined', path: '/space/situation' },
  { key: 'video', label: '视联中心', icon: 'i-ant-design-video-camera-outlined', path: '/video/wall' },
  { key: 'image-search', label: '问图', icon: 'i-ant-design-file-image-outlined', path: '/image-search/person' },
  { key: 'flow', label: '客流分析', icon: 'i-ant-design-line-chart-outlined', path: '/flow/analysis' },
  { key: 'alarm', label: '告警中心', icon: 'i-ant-design-alert-outlined', path: '/alarm/event' },
  { key: 'inspection', label: '巡检', icon: 'i-ant-design-audit-outlined', path: '/inspection/workbench' },
  { key: 'dashboard', label: '可视化', icon: 'i-ant-design-dashboard-outlined', path: '/dashboard/workbench' },
  { key: 'iot', label: '物联中心', icon: 'i-ant-design-api-outlined', path: '/iot/device' },
  { key: 'system', label: '系统管理', icon: 'i-ant-design-setting-outlined', path: '/system/project' }
]

// 当前一级菜单高亮（路由匹配前缀）
const activeTopKey = computed(() => {
  const path = route.path
  for (const m of menus) {
    if (m.path && path.startsWith('/' + m.key)) return m.key
  }
  return 'ai-search-hub'
})

function handleMenuClick(m: MenuItem) {
  if (m.path) {
    router.push(m.path)
  }
}
</script>

<template>
  <div class="project-layout">
    <!-- 顶栏（带阴影） -->
    <header class="layout-header">
      <div class="header-left">
        <div class="logo-box">办</div>
        <span class="project-name">办公室场景项目</span>
      </div>
      <div class="header-right">
        <!-- AI 对话入口（彩虹发光动效） -->
        <button class="ai-entry-btn" @click="router.push('/ai-search-hub')">
          <i class="i-ant-design-robot-outlined ai-entry-icon" />
          <span class="ai-entry-text">AI 对话</span>
        </button>
        <a-dropdown>
          <div class="lang-trigger" @click.prevent>
            <i class="i-ant-design-global-outlined" />
            <span>中文</span>
            <i class="i-ant-design-down-outlined arrow" />
          </div>
          <template #overlay>
            <a-menu>
              <a-menu-item>中文</a-menu-item>
              <a-menu-item>English</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <!-- 消息通知：图标 -->
        <a-badge :count="0" :show-zero="false">
          <i class="i-ant-design-bell-outlined header-icon" />
        </a-badge>
        <!-- 亮色/暗色模式切换：太阳（亮色）/月亮（暗色） -->
        <i
          :class="isDark ? 'i-ant-design-sun-outlined' : 'i-ant-design-moon-outlined'"
          class="header-icon"
          @click="toggleTheme"
        />
      </div>
    </header>

    <div class="layout-body">
      <!-- 侧栏（boxShadow + border 双重分隔） -->
      <aside class="layout-sider">
        <!-- 菜单列表（仅一级） -->
        <nav class="sider-menu">
          <a
            v-for="m in menus"
            :key="m.key"
            class="menu-item"
            :class="{ 'is-selected': activeTopKey === m.key }"
            @click="handleMenuClick(m)"
          >
            <i :class="m.icon" class="menu-icon" />
            <span class="menu-label">{{ m.label }}</span>
          </a>
        </nav>

        <!-- 用户区 -->
        <div class="sider-user">
          <div class="user-avatar">李</div>
          <div class="user-info">
            <div class="user-name">李瀚</div>
            <div class="user-id">pm_cef5d9ed954f11c2</div>
          </div>
          <i class="i-ant-design-up-outlined user-arrow" />
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="layout-main">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.project-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: $bg-page;
}

/* ===== 顶栏（带阴影） ===== */
.layout-header {
  height: $header-h;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  z-index: 10;
  // 关键：顶栏下边框阴影（原 .ant-pro-top-nav-header）
  box-shadow: $shadow-header;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;

  .logo-box {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: $color-primary;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
  }

  .project-name {
    font-size: 16px;
    font-weight: 600;
    color: $text-base;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* ===== AI 对话入口（紫色背景白字） ===== */
.ai-entry-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: #fff;
  background: #6e4bff;
  transition: background 0.2s;

  &:hover {
    background: #7d5cff;
  }

  .ai-entry-icon {
    font-size: 15px;
    color: #fff;
  }
}

.lang-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 14px;
  color: $text-secondary;

  .arrow {
    font-size: 10px;
  }
}

// 顶栏图标（通知、换肤）
.header-icon {
  font-size: 16px;
  cursor: pointer;
  color: $text-base;
  line-height: 1;
}

/* ===== 主体 ===== */
.layout-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ===== 侧栏（boxShadow + border 双重右边框） ===== */
.layout-sider {
  width: $sider-w;
  background: #fff;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  // 原页面：boxShadow 1px 分隔 + border-right 单线
  box-shadow: $shadow-sider;
  border-right: 1px solid $border-color-card;
}

/* 菜单列表 */
.sider-menu {
  flex: 1;
  overflow-y: auto;
  padding: 8px 8px;
}

.menu-item {
  display: flex;
  align-items: center;
  height: $menu-item-h;
  padding: 0 16px 0 4px;
  margin: $menu-item-margin 0;
  border-radius: $radius-menu-item;
  font-size: 14px;
  color: $text-base;
  cursor: pointer;
  line-height: $menu-item-h;
  transition: background 0.2s;

  .menu-icon {
    font-size: 14px;
    color: $text-base;
    margin: 0 10px 0 0;
  }

  // 菜单文字加粗（medium）
  .menu-label {
    font-weight: 500;
  }

  &:hover {
    background: $bg-hover;
  }

  // 选中态：紫底紫字
  &.is-selected {
    background: $color-primary-bg;
    color: $color-primary;

    .menu-icon {
      color: $color-primary;
    }
  }
}

/* 用户区 */
.sider-user {
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 8px;

  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: $color-primary;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
  }

  .user-info {
    flex: 1;
    overflow: hidden;

    .user-name {
      font-size: 13px;
      font-weight: 500;
      color: $text-base;
      line-height: 1.3;
    }

    .user-id {
      font-size: 12px;
      color: $text-tertiary;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .user-arrow {
    font-size: 12px;
    color: $text-tertiary;
    cursor: pointer;
  }
}

/* ===== 主内容 ===== */
.layout-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
