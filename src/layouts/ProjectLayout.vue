<script setup lang="ts">
/**
 * 项目级布局 - 1:1 复刻 JetLinks 项目框架
 * 顶栏 + 侧栏菜单 + 主内容区
 * 数据来源：UAT 站 cloud-uat.jetlinks.cn computedStyle 提取
 */
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { scenarioOptions } from '@/views/workbench/templates'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

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

// 全部菜单定义（字典，供各场景按 key 引用）
const ALL_MENUS: Record<string, MenuItem> = {
  space: { key: 'space', label: '空间态势', icon: 'i-ant-design-apartment-outlined', path: '/space/situation' },
  video: { key: 'video', label: '视联中心', icon: 'i-ant-design-video-camera-outlined', path: '/video/wall' },
  'image-search': { key: 'image-search', label: '文搜图', icon: 'i-ant-design-search-outlined', path: '/image-search/text' },
  flow: { key: 'flow', label: '客流分析', icon: 'i-ant-design-line-chart-outlined', path: '/flow/analysis' },
  alarm: { key: 'alarm', label: '告警中心', icon: 'i-ant-design-alert-outlined', path: '/alarm/event' },
  inspection: { key: 'inspection', label: '巡检', icon: 'i-ant-design-audit-outlined', path: '/inspection/workbench' },
  dashboard: { key: 'dashboard', label: '仪表盘', icon: 'i-ant-design-dashboard-outlined', path: '/dashboard' },
  visualization: { key: 'visualization', label: '可视化', icon: 'i-ant-design-fund-projection-screen-outlined', path: '/visualization/board' },
  iot: { key: 'iot', label: '物联中心', icon: 'i-ant-design-api-outlined', path: '/iot/device' },
  system: { key: 'system', label: '系统管理', icon: 'i-ant-design-setting-outlined', path: '/system/project' },
  archive: { key: 'archive', label: '归档', icon: 'i-ant-design-inbox-outlined', path: '/archive' },
  // 养老场景专属菜单
  'elderly-security': { key: 'elderly-security', label: '安防态势', icon: 'i-ant-design-safety-outlined', path: '/elderly-security/situation' },
  'elderly-behavior': { key: 'elderly-behavior', label: '老人行为分析', icon: 'i-ant-design-user-outlined', path: '/elderly-behavior/analysis' },
  'elderly-staff': { key: 'elderly-staff', label: '护工行为分析', icon: 'i-ant-design-team-outlined', path: '/elderly-staff/analysis' },
  // 商业体场景专属菜单
  'vehicle': { key: 'vehicle', label: '车辆分析', icon: 'i-ant-design-car-outlined', path: '/vehicle/trend' },
  'security-posture': { key: 'security-posture', label: '安防态势', icon: 'i-ant-design-safety-outlined', path: '/security-posture/situation' },
  'work-order': { key: 'work-order', label: '工单', icon: 'i-ant-design-profile-outlined', path: '/work-order/list' },
  'energy': { key: 'energy', label: '能耗分析', icon: 'i-ant-design-bar-chart-outlined', path: '/energy/analysis' },
  // 安防场景专属菜单（业务名）
  'security-dashboard': { key: 'security-dashboard', label: '仪表盘', icon: 'i-ant-design-dashboard-outlined', path: '/security-dashboard' },
  'security-space': { key: 'security-space', label: '空间态势', icon: 'i-ant-design-apartment-outlined', path: '/space/situation' },
  'security-video': { key: 'security-video', label: '监控墙', icon: 'i-ant-design-video-camera-outlined', path: '/video/wall' },
  'security-image': { key: 'security-image', label: '文搜图', icon: 'i-ant-design-search-outlined', path: '/image-search/person' },
  'security-alarm': { key: 'security-alarm', label: '告警', icon: 'i-ant-design-alert-outlined', path: '/alarm/event' }
}

// 场景 -> 菜单 key 顺序映射
const SCENARIOS: Record<string, string[]> = {
  general: ['dashboard', 'space', 'video', 'image-search', 'flow', 'alarm', 'inspection', 'visualization', 'iot', 'archive'],
  // 安防场景（业务名菜单，不含系统管理——系统管理在底部固定区）
  security: ['security-dashboard', 'security-space', 'security-video', 'security-image', 'security-alarm', 'archive'],
  commercial: ['dashboard', 'flow', 'vehicle', 'security-posture', 'video', 'image-search', 'alarm', 'visualization', 'work-order', 'energy', 'iot', 'archive'],
  // 公寓场景
  apartment: ['dashboard', 'video', 'space', 'image-search', 'alarm', 'archive'],
  elderly: ['dashboard', 'elderly-security', 'elderly-behavior', 'elderly-staff', 'video', 'image-search', 'alarm', 'archive']
}

// 当前场景对应的 logo 和项目名
const currentScenarioInfo = computed(() =>
  scenarioOptions.find(o => o.value === currentScenario.value) || scenarioOptions[0]
)

// 当前场景（读 store，全局共享给 SubTabLayout/SpaceLayout）
const currentScenario = computed({
  get: () => appStore.scenario,
  set: (v: string) => appStore.setScenario(v)
})
const scenarioSelectedKeys = computed({
  get: () => [currentScenario.value],
  set: () => {}
})

// 当前场景对应的菜单列表
const menus = computed<MenuItem[]>(() => {
  const keys = SCENARIOS[currentScenario.value] || SCENARIOS.general
  return keys.map(k => ALL_MENUS[k]).filter(Boolean)
})

// 切换场景时，如果当前页面不在新菜单中，跳到第一个菜单
watch(currentScenario, () => {
  const firstMenu = menus.value[0]
  if (firstMenu?.path) {
    const currentKey = activeTopKey.value
    if (!menus.value.some(m => m.key === currentKey)) {
      router.push(firstMenu.path)
    }
  }
})

// 当前一级菜单高亮（路由匹配前缀）
const activeTopKey = computed(() => {
  const path = route.path
  for (const m of menus.value) {
    if (!m.path) continue
    // 用菜单 path 的第一段做前缀匹配（兼容安防等 key 与 path 前缀不一致的场景）
    const seg = '/' + m.path.split('/')[1]
    if (path.startsWith(seg)) return m.key
  }
  return menus.value[0]?.key ?? 'space'
})

// 侧边栏折叠状态（默认收起）
const collapsed = ref(true)
function toggleCollapse() {
  collapsed.value = !collapsed.value
}

function handleMenuClick(m: MenuItem) {
  if (!m.path) return
  // 文搜图：所有场景默认进「人员」
  if (m.key === 'image-search') {
    router.push('/image-search/person')
    return
  }
  router.push(m.path)
}
</script>

<template>
  <div class="project-layout">
    <!-- 顶栏（带阴影） -->
    <header class="layout-header">
      <div class="header-left">
        <div class="logo-box">{{ currentScenarioInfo.logo }}</div>
        <span class="project-name">{{ currentScenarioInfo.name }}</span>
      </div>
      <div class="header-right">
        <!-- AI 对话入口 -->
        <button class="ai-entry-btn" @click="router.push('/ai-search-hub')">
          <i class="i-ant-design-robot-outlined ai-entry-icon" />
          <span class="ai-entry-text">AI 对话</span>
        </button>
        <!-- 场景切换下拉框 -->
        <a-dropdown>
          <div class="scenario-trigger" @click.prevent>
            <i class="i-ant-design-appstore-outlined" />
            <span>{{ scenarioOptions.find(o => o.value === currentScenario)?.label }}</span>
            <i class="i-ant-design-down-outlined scenario-arrow" />
          </div>
          <template #overlay>
            <a-menu v-model:selected-keys="scenarioSelectedKeys">
              <a-menu-item v-for="o in scenarioOptions" :key="o.value" @click="currentScenario = o.value">
                {{ o.label }}
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
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
      </div>
    </header>

    <div class="layout-body">
      <!-- 侧栏（支持折叠/展开） -->
      <aside class="layout-sider" :class="{ collapsed }">
        <!-- 折叠按钮 -->
        <div class="collapse-btn" @click="toggleCollapse">
          <i :class="collapsed ? 'i-ant-design-menu-unfold-outlined' : 'i-ant-design-menu-fold-outlined'" />
          <span v-if="!collapsed" class="collapse-text">收起菜单</span>
        </div>

        <!-- 菜单列表（仅一级） -->
        <nav class="sider-menu">
          <a-tooltip
            v-for="m in menus"
            :key="m.key"
            :title="collapsed ? m.label : ''"
            placement="right"
          >
            <a
              class="menu-item"
              :class="{ 'is-selected': activeTopKey === m.key }"
              @click="handleMenuClick(m)"
            >
              <i :class="m.icon" class="menu-icon" />
              <span v-if="!collapsed" class="menu-label">{{ m.label }}</span>
            </a>
          </a-tooltip>
        </nav>

        <!-- 底部固定区：用户信息 + 系统管理 + 换肤 -->
        <div class="sider-footer">
          <!-- 用户信息 -->
          <div class="sider-user">
            <div class="user-avatar">李</div>
            <template v-if="!collapsed">
              <div class="user-info">
                <div class="user-name">李瀚</div>
                <div class="user-id">pm_cef5d9ed954f11c2</div>
              </div>
              <i class="i-ant-design-up-outlined user-arrow" />
            </template>
          </div>

          <!-- 操作按钮组（水平居中） -->
          <div class="footer-actions">
            <!-- 消息中心 -->
            <a-tooltip :title="collapsed ? '消息中心' : ''" placement="right">
              <a class="footer-icon-btn">
                <a-badge :count="0" :show-zero="false" :offset="[6, 0]">
                  <i class="i-ant-design-bell-outlined" />
                </a-badge>
                <span v-if="!collapsed" class="footer-icon-label">消息中心</span>
              </a>
            </a-tooltip>
            <!-- 系统管理（固定，不随场景变） -->
            <a-tooltip :title="collapsed ? '系统管理' : ''" placement="right">
              <a
                class="footer-icon-btn"
                :class="{ 'is-selected': route.path.startsWith('/system') }"
                @click="router.push('/system/project')"
              >
                <i class="i-ant-design-setting-outlined" />
                <span v-if="!collapsed" class="footer-icon-label">系统管理</span>
              </a>
            </a-tooltip>
            <!-- 换肤 -->
            <a-tooltip :title="collapsed ? (isDark ? '亮色模式' : '暗色模式') : ''" placement="right">
              <a class="footer-icon-btn" @click="toggleTheme">
                <i :class="isDark ? 'i-ant-design-sun-outlined' : 'i-ant-design-moon-outlined'" />
                <span v-if="!collapsed" class="footer-icon-label">{{ isDark ? '亮色模式' : '暗色模式' }}</span>
              </a>
            </a-tooltip>
          </div>
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

/* ===== AI 对话入口（紫色渐变胶囊 + 发光） ===== */
.ai-entry-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  padding: 0 16px 0 6px;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, #7d5cff 0%, #6e4bff 50%, #5d3bff 100%);
  box-shadow: 0 2px 12px rgba(110, 75, 255, 0.35);
  transition: all 0.2s;

  &:hover {
    box-shadow: 0 4px 18px rgba(110, 75, 255, 0.5);
    transform: translateY(-1px);
  }

  /* 图标圆形浅底 */
  .ai-entry-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    font-size: 15px;
    color: #fff;
  }
}

/* 场景切换下拉框 */
.scenario-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid $border-color-card;
  border-radius: 9999px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  color: $text-base;
  transition: border-color 0.2s;

  &:hover {
    border-color: $color-primary;
    color: $color-primary;

    .scenario-arrow {
      color: $color-primary;
    }
  }

  .scenario-arrow {
    font-size: 10px;
    color: $text-muted;
    transition: color 0.2s;
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

/* ===== 侧栏（支持折叠/展开） ===== */
.layout-sider {
  width: $sider-w;
  background: #fff;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: $shadow-sider;
  border-right: 1px solid $border-color-card;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  /* 折叠态：窄边栏，只显图标 */
  &.collapsed {
    width: 72px;

    .sider-menu {
      padding: 8px;
      align-items: center;
    }

    .menu-item {
      width: 52px;
      height: 52px;
      padding: 0;
      margin: 6px 0;
      justify-content: center;
      border-radius: 12px;

      .menu-icon {
        font-size: 28px;
        margin: 0;
      }
    }

    .collapse-btn {
      padding: 0;
      justify-content: center;

      i { margin: 0; }
    }

    .sider-user {
      justify-content: center;
      padding: 8px 0;
    }
  }
}

/* 折叠按钮 */
.collapse-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 16px;
  cursor: pointer;
  color: $text-tertiary;
  font-size: 13px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
  transition: color 0.15s;

  i {
    font-size: 16px;
  }

  .collapse-text {
    font-weight: 500;
  }

  &:hover {
    color: $color-primary;
  }
}

/* 菜单列表 */
.sider-menu {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  display: flex;
  flex-direction: column;
}

.menu-item {
  display: flex;
  align-items: center;
  height: 48px;
  padding: 0 14px;
  margin: 8px 0;
  border-radius: $radius-menu-item;
  font-size: 15px;
  color: $text-secondary;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;

  .menu-icon {
    font-size: 24px;
    color: $text-tertiary;
    margin: 0 12px 0 2px;
    flex-shrink: 0;
  }

  .menu-label {
    font-weight: 500;
    white-space: nowrap;
  }

  &:hover {
    background: $bg-hover;

    .menu-icon {
      color: $color-primary;
    }
  }

  &.is-selected {
    background: $color-primary-bg;
    color: $color-primary;

    .menu-icon {
      color: $color-primary;
    }
  }
}

/* 底部固定区：用户信息 + 系统管理 + 换肤 */
.sider-footer {
  flex-shrink: 0;
  border-top: 1px solid $border-color-card;
  margin-top: 8px;       /* 与业务菜单项间距一致（避免归档看起来特殊） */
  background: $bg-card;

  /* 操作按钮组：竖向排列，每个按钮在侧栏宽度内水平居中 */
  .footer-actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;   /* 按钮撑满宽度后内部居中 */
    gap: 4px;
    padding: 8px 8px 12px;
  }

  /* 缩小版图标按钮（比业务菜单图标小约 1/3） */
  .footer-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;  /* 图标+文字整体水平居中 */
    gap: 6px;
    height: 32px;
    padding: 0 10px;
    border-radius: $radius-menu-item;
    color: $text-secondary;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    font-size: 13px;

    i {
      font-size: 16px;     /* 业务菜单图标 24px，缩小 1/3 */
      color: $text-tertiary;
    }

    &:hover {
      background: $bg-hover;
      color: $color-primary;

      i {
        color: $color-primary;
      }
    }

    &.is-selected {
      color: $color-primary;

      i {
        color: $color-primary;
      }
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
