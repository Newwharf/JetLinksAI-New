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
            { key: 'device', label: '视频设备管理', path: '/video/device' }
          ]
        },
        children: [
          { path: '', redirect: '/video/wall' },
          { path: 'wall', name: 'video-wall', ...ph('监控墙') },
          { path: 'device', name: 'video-device', ...ph('视频设备管理') }
        ]
      },

      // ===== 问图 =====
      {
        path: 'image-search',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'person', label: '人员', path: '/image-search/person' },
            { key: 'vehicle', label: '车辆', path: '/image-search/vehicle' }
          ]
        },
        children: [
          { path: '', redirect: '/image-search/person' },
          { path: 'person', name: 'image-person', ...ph('人员') },
          { path: 'vehicle', name: 'image-vehicle', ...ph('车辆') }
        ]
      },

      // ===== 客流分析 =====
      {
        path: 'flow',
        component: SubTabLayout,
        meta: {
          tabs: [
            { key: 'analysis', label: '客流分析', path: '/flow/analysis' },
            { key: 'point', label: '客流点位管理', path: '/flow/point' }
          ]
        },
        children: [
          { path: '', redirect: '/flow/analysis' },
          { path: 'analysis', name: 'flow-analysis', ...ph('客流分析') },
          { path: 'point', name: 'flow-point', ...ph('客流点位管理') }
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
            { key: 'msg-channel', label: '消息渠道', path: '/system/msg-channel' }
          ]
        },
        children: [
          { path: '', redirect: '/system/project' },
          { path: 'project', name: 'system-project', ...ph('项目配置') },
          { path: 'user', name: 'system-user', ...ph('用户') },
          { path: 'role', name: 'system-role', ...ph('角色') },
          { path: 'org', name: 'system-org', ...ph('组织') },
          { path: 'msg-template', name: 'system-msg-template', ...ph('消息模版') },
          { path: 'msg-channel', name: 'system-msg-channel', ...ph('消息渠道') }
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
