import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import ProjectLayout from '@/layouts/ProjectLayout.vue'
import SpaceLayout from '@/layouts/SpaceLayout.vue'
import SubTabLayout from '@/layouts/SubTabLayout.vue'
import PlaceholderView from '@/views/PlaceholderView.vue'

// 通用占位子路由生成器
function ph(title: string) {
  return {
    component: PlaceholderView,
    meta: { title }
  }
}

// 文搜图默认 tab：所有场景统一进「人员」
function imageSearchDefaultPath(): string {
  return '/image-search/person'
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/ai-search-hub'
  },
  {
    path: '/',
    component: ProjectLayout,
    children: [
      // ===== AI 对话（无二级 tab）=====
      {
        path: 'ai-search-hub',
        name: 'ai-search-hub',
        component: () => import('@/views/ai/AiHubView.vue'),
        meta: { title: 'AI 对话' }
      },

      // ===== 空间态势 =====
      {
        path: 'space',
        component: SpaceLayout,
        children: [
          {
            path: 'situation',
            name: 'space-situation',
            component: () => import('@/views/space/SituationView.vue'),
            meta: { title: '空间态势' }
          },
          {
            path: 'area',
            name: 'space-area',
            component: () => import('@/views/space/AreaView.vue'),
            meta: { title: '空间管理' }
          }
        ]
      },

      // ===== 视联中心 =====
      {
        path: 'video',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'wall', label: '监控墙', path: '/video/wall' },
            { key: 'device', label: '监控设备管理', path: '/video/device' }
          ]
        },
        children: [
          { path: '', redirect: '/video/wall' },
          { path: 'wall', name: 'video-wall', component: () => import('@/views/video/WallView.vue'), meta: { title: '监控墙' } },
          { path: 'device', name: 'video-device', ...ph('监控设备管理') }
        ]
      },

      // ===== 问图 =====
      {
        path: 'image-search',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'text', label: '文搜图', path: '/image-search/text', scenarios: ['general', 'security'] },
            { key: 'person', label: '人员', path: '/image-search/person' },
            { key: 'vehicle', label: '车辆', path: '/image-search/vehicle', scenarios: ['general', 'security', 'commercial'] },
            { key: 'person-track', label: '人员轨迹', path: '/image-search/person-track', scenarios: ['elderly'] },
            { key: 'key-person', label: '重点人员跟踪', path: '/image-search/key-person', scenarios: ['elderly'] }
          ]
        },
        children: [
          { path: '', redirect: () => ({ path: imageSearchDefaultPath() }) },
          { path: 'text', name: 'image-text', component: () => import('@/views/image-search/TextSearchView.vue'), meta: { title: '文搜图' } },
          { path: 'person', name: 'image-person', component: () => import('@/views/image-search/TextSearchView.vue'), meta: { title: '人员' } },
          { path: 'vehicle', name: 'image-vehicle', ...ph('车辆') },
          { path: 'person-track', name: 'image-person-track', ...ph('人员轨迹') },
          { path: 'key-person', name: 'image-key-person', ...ph('重点人员跟踪') }
        ]
      },

      // ===== 客流分析 =====
      {
        path: 'flow',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'analysis', label: '客流趋势分析', path: '/flow/analysis' },
            { key: 'heat', label: '区域人员热力图', path: '/flow/heat' },
            { key: 'point', label: '客流点位管理', path: '/flow/point' },
            { key: 'heat-point', label: '热力图点位管理', path: '/flow/heat-point' }
          ]
        },
        children: [
          { path: '', redirect: '/flow/analysis' },
          { path: 'analysis', name: 'flow-analysis', component: () => import('@/views/flow/TrendView.vue'), meta: { title: '客流趋势分析' } },
          { path: 'heat', name: 'flow-heat', ...ph('区域人员热力图') },
          { path: 'point', name: 'flow-point', component: () => import('@/views/flow/PointView.vue'), meta: { title: '客流点位管理' } },
          { path: 'heat-point', name: 'flow-heat-point', ...ph('热力图点位管理') }
        ]
      },

      // ===== 车辆分析（商业体）=====
      {
        path: 'vehicle',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'trend', label: '车流趋势', path: '/vehicle/trend' },
            { key: 'heat', label: '区域车辆热力图', path: '/vehicle/heat' },
            { key: 'point', label: '车流点位管理', path: '/vehicle/point' },
            { key: 'heat-point', label: '热力图点位管理', path: '/vehicle/heat-point' }
          ]
        },
        children: [
          { path: '', redirect: '/vehicle/trend' },
          { path: 'trend', name: 'vehicle-trend', ...ph('车流趋势') },
          { path: 'heat', name: 'vehicle-heat', ...ph('区域车辆热力图') },
          { path: 'point', name: 'vehicle-point', ...ph('车流点位管理') },
          { path: 'heat-point', name: 'vehicle-heat-point', ...ph('热力图点位管理') }
        ]
      },

      // ===== 安防态势（商业体）=====
      {
        path: 'security-posture',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'situation', label: '空间安防态势', path: '/security-posture/situation' },
            { key: 'staff', label: '安保人员行为分析', path: '/security-posture/staff' },
            { key: 'space', label: '空间管理', path: '/security-posture/space' }
          ]
        },
        children: [
          { path: '', redirect: '/security-posture/situation' },
          { path: 'situation', name: 'sp-situation', component: () => import('@/views/space/SituationView.vue'), meta: { title: '空间安防态势' } },
          { path: 'staff', name: 'sp-staff', ...ph('安保人员行为分析') },
          { path: 'space', name: 'sp-space', component: () => import('@/views/space/AreaView.vue'), meta: { title: '空间管理' } }
        ]
      },

      // ===== 工单（商业体）=====
      {
        path: 'work-order',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'list', label: '工单列表', path: '/work-order/list' }
          ]
        },
        children: [
          { path: '', redirect: '/work-order/list' },
          { path: 'list', name: 'work-order-list', ...ph('工单列表') }
        ]
      },

      // ===== 能耗分析（商业体）=====
      {
        path: 'energy',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'analysis', label: '能耗分析', path: '/energy/analysis' }
          ]
        },
        children: [
          { path: '', redirect: '/energy/analysis' },
          { path: 'analysis', name: 'energy-analysis', ...ph('能耗分析') }
        ]
      },

      // ===== 告警中心 =====
      {
        path: 'alarm',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'event', label: '告警事件', path: '/alarm/event' },
            { key: 'rule', label: '告警规则管理', path: '/alarm/rule' }
          ]
        },
        children: [
          { path: '', redirect: '/alarm/event' },
          { path: 'event', name: 'alarm-event', ...ph('告警事件') },
          { path: 'rule', name: 'alarm-rule', ...ph('告警规则管理') }
        ]
      },

      // ===== 巡检 =====
      {
        path: 'inspection',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'workbench', label: '工作台', path: '/inspection/workbench' },
            { key: 'record', label: '巡检记录', path: '/inspection/record' },
            { key: 'config', label: '巡检配置', path: '/inspection/config' }
          ]
        },
        children: [
          { path: '', redirect: '/inspection/workbench' },
          { path: 'workbench', name: 'inspection-workbench', ...ph('工作台') },
          { path: 'record', name: 'inspection-record', ...ph('巡检记录') },
          { path: 'config', name: 'inspection-config', ...ph('巡检配置') }
        ]
      },

      // ===== 可视化 =====
      {
        path: 'dashboard',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'workbench', label: '工作台', path: '/dashboard/workbench' },
            { key: 'board', label: '数据看板', path: '/dashboard/board' },
            { key: 'asset', label: '数据资产', path: '/dashboard/asset' }
          ]
        },
        children: [
          { path: '', redirect: '/dashboard/workbench' },
          { path: 'workbench', name: 'dashboard-workbench', ...ph('工作台') },
          { path: 'board', name: 'dashboard-board', ...ph('数据看板') },
          { path: 'asset', name: 'dashboard-asset', ...ph('数据资产') }
        ]
      },

      // ===== 物联中心 =====
      {
        path: 'iot',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'device', label: '设备管理', path: '/iot/device' },
            { key: 'product', label: '产品管理', path: '/iot/product' }
          ]
        },
        children: [
          { path: '', redirect: '/iot/device' },
          { path: 'device', name: 'iot-device', ...ph('设备管理') },
          { path: 'product', name: 'iot-product', ...ph('产品管理') }
        ]
      },

      // ===== 系统管理 =====
      {
        path: 'system',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'project', label: '项目配置', path: '/system/project' },
            { key: 'user', label: '用户', path: '/system/user' },
            { key: 'role', label: '角色', path: '/system/role' },
            { key: 'org', label: '组织', path: '/system/org' },
            { key: 'msg-template', label: '消息模版', path: '/system/msg-template' },
            { key: 'msg-channel', label: '消息渠道', path: '/system/msg-channel' },
            { key: 'elderly-space', label: '空间管理', path: '/system/elderly-space', scenarios: ['elderly'] }
          ]
        },
        children: [
          { path: '', redirect: '/system/project' },
          { path: 'project', name: 'system-project', ...ph('项目配置') },
          { path: 'user', name: 'system-user', ...ph('用户') },
          { path: 'role', name: 'system-role', ...ph('角色') },
          { path: 'org', name: 'system-org', ...ph('组织') },
          { path: 'msg-template', name: 'system-msg-template', ...ph('消息模版') },
          { path: 'msg-channel', name: 'system-msg-channel', ...ph('消息渠道') },
          { path: 'elderly-space', name: 'system-elderly-space', ...ph('空间管理') }
        ]
      },

      // ===== 养老场景专属：安防态势（二级 tab）=====
      {
        path: 'elderly-security',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'situation', label: '空间安防态势', path: '/elderly-security/situation' },
            { key: 'bed-situation', label: '老人床位态势', path: '/elderly-security/bed-situation' },
            { key: 'space', label: '空间管理', path: '/elderly-security/space' },
            { key: 'bed', label: '老人床位管理', path: '/elderly-security/bed' }
          ]
        },
        children: [
          { path: '', redirect: '/elderly-security/situation' },
          { path: 'situation', name: 'elderly-security-situation', component: () => import('@/views/elderly/ElderlySecurityView.vue'), meta: { title: '空间安防态势' } },
          { path: 'bed-situation', name: 'elderly-security-bed-situation', ...ph('老人床位态势') },
          { path: 'space', name: 'elderly-security-space', ...ph('空间管理') },
          { path: 'bed', name: 'elderly-security-bed', ...ph('老人床位管理') }
        ]
      },
      // ===== 老人行为分析（含老人档案管理）=====
      {
        path: 'elderly-behavior',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'behavior', label: '老人行为分析', path: '/elderly-behavior/analysis' },
            { key: 'profile', label: '老人档案管理', path: '/elderly-behavior/profile' }
          ]
        },
        children: [
          { path: '', redirect: '/elderly-behavior/analysis' },
          { path: 'analysis', name: 'elderly-behavior-analysis', component: () => import('@/views/elderly/ElderlyBehaviorView.vue'), meta: { title: '老人行为分析' } },
          { path: 'profile', name: 'elderly-behavior-profile', ...ph('老人档案管理') }
        ]
      },

      // ===== 护工行为分析（含护工档案管理）=====
      {
        path: 'elderly-staff',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'behavior', label: '护工行为分析', path: '/elderly-staff/analysis' },
            { key: 'profile', label: '护工档案管理', path: '/elderly-staff/profile' }
          ]
        },
        children: [
          { path: '', redirect: '/elderly-staff/analysis' },
          { path: 'analysis', name: 'elderly-staff-analysis', component: () => import('@/views/elderly/ElderlyStaffView.vue'), meta: { title: '护工行为分析' } },
          { path: 'profile', name: 'elderly-staff-profile', ...ph('护工档案管理') }
        ]
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.afterEach((to) => {
  if (to.meta.title) {
    document.title = `${to.meta.title} - 办公室场景项目`
  }
})

export default router
