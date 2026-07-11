import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import ProjectLayout from '@/layouts/ProjectLayout.vue'
import SpaceLayout from '@/layouts/SpaceLayout.vue'
import SubTabLayout from '@/layouts/SubTabLayout.vue'
import SaaSLayout from '@/layouts/SaaSLayout.vue'
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
  // 根路径 → SaaS 工作台
  {
    path: '/',
    redirect: '/workbench'
  },

  // ===== SaaS 顶层(SaaSLayout:顶部菜单,项目之外)=====
  {
    path: '/',
    component: SaaSLayout,
    children: [
      {
        path: 'workbench',
        name: 'workbench',
        component: () => import('@/views/workbench/WorkbenchView.vue'),
        meta: { title: '工作台' }
      },
      { path: 'apps', name: 'apps', ...ph('应用中心') },
      { path: 'docs', name: 'docs', ...ph('文档中心') },
      { path: 'dev', name: 'dev', ...ph('开发中心') },
      { path: 'ops', name: 'ops', ...ph('运营中心') },
      { path: 'billing', name: 'billing', ...ph('支付中心') },
      { path: 'saas-system', name: 'saas-system', ...ph('系统管理') }
    ]
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
          { path: 'device', name: 'video-device', component: () => import('@/views/video/DeviceManageView.vue'), meta: { title: '监控设备管理' } }
        ]
      },

      // ===== 问图 =====
      {
        path: 'image-search',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'text', label: '文搜图', path: '/image-search/text', scenarios: ['general'] },
            { key: 'person', label: '人员', path: '/image-search/person' },
            { key: 'vehicle', label: '车辆', path: '/image-search/vehicle', scenarios: ['general', 'security', 'commercial'] },
            { key: 'person-profile', label: '人员档案', path: '/image-search/person-profile', scenarios: ['security'] },
            { key: 'person-track', label: '临时轨迹跟踪', path: '/image-search/person-track', scenarios: ['security'] }
          ]
        },
        children: [
          { path: '', redirect: () => ({ path: imageSearchDefaultPath() }) },
          { path: 'text', name: 'image-text', component: () => import('@/views/image-search/TextSearchView.vue'), meta: { title: '文搜图' } },
          { path: 'person', name: 'image-person', component: () => import('@/views/image-search/TextSearchView.vue'), meta: { title: '人员' } },
          { path: 'vehicle', name: 'image-vehicle', component: () => import('@/views/image-search/VehicleSearchView.vue'), meta: { title: '车辆' } },
          { path: 'person-track', name: 'image-person-track', component: () => import('@/views/image-search/PersonTrackView.vue'), meta: { title: '临时轨迹跟踪' } },
          { path: 'person-track/:id', name: 'image-person-track-detail', component: () => import('@/views/image-search/PersonTrackDetailView.vue'), meta: { title: '轨迹跟踪详情' } },
          { path: 'person-profile', name: 'image-person-profile', component: () => import('@/views/image-search/PersonProfileView.vue'), meta: { title: '人员档案' } },
          { path: 'person-profile/:id', name: 'image-person-profile-detail', component: () => import('@/views/image-search/PersonProfileDetailView.vue'), meta: { title: '人员档案详情' } }
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

      // ===== 归档（通用一级菜单，占位）=====
      {
        path: 'archive',
        name: 'archive',
        ...ph('归档')
      },

      // ===== 安防仪表盘（安防场景，复用通用工作台）=====
      {
        path: 'security-dashboard',
        name: 'security-dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: { title: '仪表盘' }
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
          { path: 'event', name: 'alarm-event', component: () => import('@/views/alarm/AlarmEventView.vue'), meta: { title: '告警事件' } },
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

      // ===== 仪表盘（独立菜单，无二级 tab）=====
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/views/dashboard/DashboardView.vue'),
        meta: { title: '仪表盘' }
      },

      // ===== 可视化 =====
      {
        path: 'visualization',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'board', label: '数据看板', path: '/visualization/board' },
            { key: 'asset', label: '数据资产', path: '/visualization/asset' }
          ]
        },
        children: [
          { path: '', redirect: '/visualization/board' },
          { path: 'board', name: 'visualization-board', ...ph('数据看板') },
          { path: 'asset', name: 'visualization-asset', ...ph('数据资产') }
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
            { key: 'space', label: '空间管理', path: '/elderly-security/space' }
          ]
        },
        children: [
          { path: '', redirect: '/elderly-security/situation' },
          { path: 'situation', name: 'elderly-security-situation', component: () => import('@/views/space/SituationView.vue'), meta: { title: '空间安防态势' } },
          { path: 'space', name: 'elderly-security-space', component: () => import('@/views/space/AreaView.vue'), meta: { title: '空间管理' } }
        ]
      },
      // ===== 老人行为分析（含床位态势/档案管理/床位管理）=====
      {
        path: 'elderly-behavior',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'behavior', label: '老人行为分析', path: '/elderly-behavior/analysis' },
            { key: 'bed-situation', label: '老人床位态势', path: '/elderly-behavior/bed-situation' },
            { key: 'profile', label: '老人档案管理', path: '/elderly-behavior/profile' },
            { key: 'bed', label: '房间床位管理', path: '/elderly-behavior/bed' }
          ]
        },
        children: [
          { path: '', redirect: '/elderly-behavior/analysis' },
          { path: 'analysis', name: 'elderly-behavior-analysis', component: () => import('@/views/elderly/ElderlyBehaviorView.vue'), meta: { title: '老人行为分析' } },
          { path: 'bed-situation', name: 'elderly-behavior-bed-situation', component: () => import('@/views/elderly/BedSituationView.vue'), meta: { title: '老人床位态势' } },
          { path: 'profile', name: 'elderly-behavior-profile', component: () => import('@/views/elderly/ElderlyProfileView.vue'), meta: { title: '老人档案管理' } },
          { path: 'bed', name: 'elderly-behavior-bed', component: () => import('@/views/elderly/BedManageView.vue'), meta: { title: '房间床位管理' } }
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
          { path: 'profile', name: 'elderly-staff-profile', component: () => import('@/views/elderly/StaffProfileView.vue'), meta: { title: '护工档案管理' } }
        ]
      },

      // ==================== 工地场景 ====================

      // ===== 工地仪表盘（无二级 tab）=====
      {
        path: 'construction-dashboard',
        name: 'construction-dashboard',
        component: () => import('@/views/construction/ConstructionDashboardView.vue'),
        meta: { title: '仪表盘' }
      },

      // ===== 工地态势 =====
      {
        path: 'construction-posture',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'overview', label: '工地总览', path: '/construction-posture/overview' },
            { key: 'manage', label: '工地管理', path: '/construction-posture/manage' }
          ]
        },
        children: [
          { path: '', redirect: '/construction-posture/overview' },
          { path: 'overview', name: 'construction-posture-overview', component: () => import('@/views/construction/ConstructionOverviewView.vue'), meta: { title: '工地总览' } },
          { path: 'manage', name: 'construction-posture-manage-list', component: () => import('@/views/construction/manage/SiteManageView.vue'), meta: { title: '工地管理' } },
          { path: 'manage/:id', name: 'construction-posture-manage', component: () => import('@/views/construction/ConstructionDetailView.vue'), meta: { title: '工地详情', hideTabs: true, backPath: '/construction-posture/overview' } }
        ]
      },

      // ===== 工地安全 =====
      {
        path: 'construction-safety',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'report', label: '工地安全报告', path: '/construction-safety/report' },
            { key: 'history-incident', label: '历史安全事件', path: '/construction-safety/history-incident' },
            { key: 'risk-incident', label: '历史风险事件', path: '/construction-safety/risk-incident' }
          ]
        },
        children: [
          { path: '', redirect: '/construction-safety/report' },
          { path: 'report', name: 'construction-safety-report', component: () => import('@/views/construction/SafetyReportView.vue'), meta: { title: '工地安全报告' } },
          { path: 'history-incident', name: 'construction-safety-history-incident', component: () => import('@/views/construction/HistoryIncidentView.vue'), meta: { title: '历史安全事件' } },
          { path: 'risk-incident', name: 'construction-safety-risk-incident', component: () => import('@/views/construction/RiskIncidentView.vue'), meta: { title: '历史风险事件' } }
        ]
      },

      // ===== 文搜图（工地）=====
      {
        path: 'construction-image',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'person', label: '人员', path: '/construction-image/person' },
            { key: 'vehicle', label: '车辆', path: '/construction-image/vehicle' },
            { key: 'profile', label: '人员档案管理', path: '/construction-image/profile' }
          ]
        },
        children: [
          { path: '', redirect: '/construction-image/person' },
          { path: 'person', name: 'construction-image-person', component: () => import('@/views/image-search/TextSearchView.vue'), meta: { title: '人员' } },
          { path: 'vehicle', name: 'construction-image-vehicle', component: () => import('@/views/image-search/VehicleSearchView.vue'), meta: { title: '车辆' } },
          { path: 'profile', name: 'construction-image-profile', component: () => import('@/views/image-search/PersonProfileView.vue'), meta: { title: '人员档案管理' } },
          { path: 'profile/:id', name: 'construction-image-profile-detail', component: () => import('@/views/image-search/PersonProfileDetailView.vue'), meta: { title: '人员档案详情' } }
        ]
      },

      // ===== 视频中心（工地）=====
      {
        path: 'construction-video',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'wall', label: '监控墙', path: '/construction-video/wall' },
            { key: 'manage', label: '视频管理', path: '/construction-video/manage' }
          ]
        },
        children: [
          { path: '', redirect: '/construction-video/wall' },
          { path: 'wall', name: 'construction-video-wall', component: () => import('@/views/video/WallView.vue'), meta: { title: '监控墙' } },
          { path: 'manage', name: 'construction-video-manage', component: () => import('@/views/video/DeviceManageView.vue'), meta: { title: '视频管理' } }
        ]
      },

      // ===== 设备中心（工地）=====
      {
        path: 'construction-device',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'overview', label: '设备总览', path: '/construction-device/overview' },
            { key: 'health', label: '设备健康', path: '/construction-device/health' },
            { key: 'manage', label: '设备管理', path: '/construction-device/manage' }
          ]
        },
        children: [
          { path: '', redirect: '/construction-device/overview' },
          { path: 'overview', name: 'construction-device-overview', ...ph('设备总览') },
          { path: 'health', name: 'construction-device-health', ...ph('设备健康') },
          { path: 'manage', name: 'construction-device-manage', ...ph('设备管理') }
        ]
      },

      // ===== 告警中心（工地）=====
      {
        path: 'construction-alarm',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'event', label: '告警事件', path: '/construction-alarm/event' },
            { key: 'rule', label: '告警规则', path: '/construction-alarm/rule' }
          ]
        },
        children: [
          { path: '', redirect: '/construction-alarm/event' },
          { path: 'event', name: 'construction-alarm-event', component: () => import('@/views/alarm/AlarmEventView.vue'), meta: { title: '告警事件' } },
          { path: 'rule', name: 'construction-alarm-rule', ...ph('告警规则') }
        ]
      },

      // ===== 模型性能分析（无二级 tab）=====
      {
        path: 'construction-model',
        name: 'construction-model',
        ...ph('模型性能分析')
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
