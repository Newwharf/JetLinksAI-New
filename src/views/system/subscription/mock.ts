/**
 * 订阅服务 - 模拟数据
 * 包含：已订阅服务、服务目录、套餐对比表
 */

// 版本等级
export type TierId = 'free' | 'basic' | 'enterprise'

export const tierLabels: Record<TierId, string> = {
  free: '免费版',
  basic: '基础版',
  enterprise: '企业版'
}

export const tierIds: TierId[] = ['free', 'basic', 'enterprise']

// 计费指标定义
export interface MetricDef {
  id: string
  name: string
  unitPrice: number
  step: number
}

// 功能模块
export interface ServiceFeature {
  id: string
  name: string
  metrics: MetricDef[]
}

// 套餐
export interface ServicePlan {
  id: string
  name: string
  price: number
}

// 服务目录项
export interface ServiceCatalogItem {
  id: string
  name: string
  billingCycle: 'year' | 'month'
  features: ServiceFeature[]
  plans: ServicePlan[]
}

// 对比表行
export interface ComparisonRow {
  feature: string
  metric: string
  quotas: Partial<Record<TierId, number>>
}

// 对比表分组
export interface ComparisonGroup {
  service: string
  tiers?: TierId[]
  noOwnMetrics?: boolean
  referenceNote?: string
  rows?: ComparisonRow[]
}

// 已订阅服务
export interface Subscription {
  id: string
  name: string
  tier: TierId
  remainingDays: number
  statusType: 'normal' | 'warning'
  expansions: Record<string, number>
  usage: Record<string, { used: number }>
}

// 服务名映射
export const serviceNameMap: Record<string, string> = {
  basic: '基础服务',
  dev: '开发',
  alarm: '告警',
  gateway: '网关',
  iot: '物联',
  visual: '可视化',
  spatial: '空间态势',
  inspect: '巡检',
  video: '视联'
}

// 服务简介
export const serviceNarratives: Record<string, string> = {
  basic: '管理用户、角色与基础资源，让团队和项目更快进入正式运行。',
  dev: '承接设备接入、消息处理与属性管理，是项目落地的核心能力底座。',
  alarm: '聚合业务告警与设备告警，帮助团队更早发现风险并完成处置。',
  gateway: '负责边缘网关接入与统一纳管，接入容量会自动归集到关联服务中。',
  iot: '面向大规模设备联网、分组管理与运行监测，适合持续扩张型项目。',
  visual: '面向大屏、看板与组态展示，把关键业务指标转化为更有表达力的界面。',
  spatial: '为园区、楼宇与三维空间项目提供空间实体与态势展示能力。',
  inspect: '围绕巡检计划与路线，形成更轻量、更闭环的运维执行链路。',
  video: '整合监控点位与录像存储能力，让视频资源接入与使用更直观。'
}

// 图标 key 映射
export const serviceIconMap: Record<string, string> = {
  basic: 'users',
  dev: 'chip',
  alarm: 'bell',
  gateway: 'gateway',
  iot: 'spark',
  visual: 'screen',
  spatial: 'map',
  inspect: 'route',
  video: 'camera'
}

export const featureIconMap: Record<string, string> = {
  '用户': 'users',
  '角色': 'shield',
  '设备': 'chip',
  '告警配置': 'bell',
  '设备分组': 'grid',
  '大屏': 'screen',
  '组件': 'layout',
  '空间': 'map',
  '巡检计划': 'clipboard',
  '巡检路线': 'route',
  '监控点位': 'camera',
  '录像存储': 'archive'
}

// 已订阅服务列表
export const subscriptions: Subscription[] = [
  {
    id: 'basic',
    name: '基础服务',
    tier: 'free',
    remainingDays: 363,
    statusType: 'normal',
    expansions: {},
    usage: { '用户:实体数量': { used: 7 }, '角色:实体数量': { used: 5 } }
  },
  {
    id: 'dev',
    name: '开发',
    tier: 'basic',
    remainingDays: 28,
    statusType: 'normal',
    expansions: { '设备:实体数量': 200 },
    usage: {
      '设备:实体数量': { used: 740 },
      '设备:消息数量': { used: 860000 },
      '设备:消息上报频率': { used: 8 },
      '设备:属性数量': { used: 42 }
    }
  },
  {
    id: 'alarm',
    name: '告警',
    tier: 'free',
    remainingDays: 363,
    statusType: 'normal',
    expansions: {},
    usage: { '告警配置:实体数量': { used: 120 } }
  },
  {
    id: 'gateway',
    name: '网关',
    tier: 'basic',
    remainingDays: 28,
    statusType: 'normal',
    expansions: {},
    usage: {}
  },
  {
    id: 'iot',
    name: '物联',
    tier: 'enterprise',
    remainingDays: 28,
    statusType: 'normal',
    expansions: { '设备分组:实体数量': 50 },
    usage: {
      '设备:实体数量': { used: 1280 },
      '设备:消息数量': { used: 860000 },
      '设备:消息上报频率': { used: 9 },
      '设备:属性数量': { used: 45 },
      '设备分组:实体数量': { used: 18 }
    }
  },
  {
    id: 'visual',
    name: '可视化',
    tier: 'basic',
    remainingDays: 28,
    statusType: 'normal',
    expansions: {},
    usage: { '大屏:页面数量': { used: 3 }, '组件:组件数量': { used: 42 } }
  },
  {
    id: 'spatial',
    name: '空间态势',
    tier: 'basic',
    remainingDays: 5,
    statusType: 'warning',
    expansions: {},
    usage: { '空间:实体数量': { used: 86 } }
  },
  {
    id: 'inspect',
    name: '巡检',
    tier: 'free',
    remainingDays: 58,
    statusType: 'normal',
    expansions: {},
    usage: { '巡检计划:实体数量': { used: 2 }, '巡检路线:实体数量': { used: 4 } }
  },
  {
    id: 'video',
    name: '视联',
    tier: 'basic',
    remainingDays: 28,
    statusType: 'normal',
    expansions: {},
    usage: { '监控点位:接入路数': { used: 12 }, '录像存储:存储容量(GB)': { used: 180 } }
  }
]

// 服务目录
export const serviceCatalog: ServiceCatalogItem[] = [
  {
    id: 'basic',
    name: '基础服务',
    billingCycle: 'year',
    features: [
      { id: 'user', name: '用户', metrics: [{ id: 'entity', name: '实体数量', unitPrice: 0.5, step: 1 }] },
      { id: 'role', name: '角色', metrics: [{ id: 'entity', name: '实体数量', unitPrice: 0.5, step: 1 }] }
    ],
    plans: [
      { id: 'standard', name: '基础版', price: 5999 },
      { id: 'enterprise', name: '企业版', price: 19999 }
    ]
  },
  {
    id: 'dev',
    name: '开发',
    billingCycle: 'month',
    features: [
      {
        id: 'device',
        name: '设备',
        metrics: [
          { id: 'entity', name: '实体数量', unitPrice: 0.5, step: 10 },
          { id: 'message', name: '消息数量', unitPrice: 0.001, step: 10000 },
          { id: 'frequency', name: '消息上报频率', unitPrice: 1, step: 1 },
          { id: 'property', name: '属性数量', unitPrice: 0.2, step: 5 }
        ]
      }
    ],
    plans: [
      { id: 'standard', name: '基础版', price: 1299 },
      { id: 'enterprise', name: '企业版', price: 3999 }
    ]
  },
  {
    id: 'alarm',
    name: '告警',
    billingCycle: 'month',
    features: [
      { id: 'config', name: '告警配置', metrics: [{ id: 'entity', name: '实体数量', unitPrice: 0.5, step: 10 }] }
    ],
    plans: [
      { id: 'standard', name: '基础版', price: 699 },
      { id: 'enterprise', name: '企业版', price: 1999 }
    ]
  },
  {
    id: 'gateway',
    name: '网关',
    billingCycle: 'year',
    features: [],
    plans: [
      { id: 'standard', name: '基础版', price: 14999 },
      { id: 'enterprise', name: '企业版', price: 49999 }
    ]
  },
  {
    id: 'iot',
    name: '物联',
    billingCycle: 'month',
    features: [
      {
        id: 'device',
        name: '设备',
        metrics: [
          { id: 'entity', name: '实体数量', unitPrice: 0.5, step: 10 },
          { id: 'message', name: '消息数量', unitPrice: 0.001, step: 10000 },
          { id: 'frequency', name: '消息上报频率', unitPrice: 1, step: 1 },
          { id: 'property', name: '属性数量', unitPrice: 0.2, step: 5 }
        ]
      },
      { id: 'group', name: '设备分组', metrics: [{ id: 'entity', name: '实体数量', unitPrice: 0.5, step: 1 }] }
    ],
    plans: [
      { id: 'standard', name: '基础版', price: 1499 },
      { id: 'enterprise', name: '企业版', price: 4999 }
    ]
  },
  {
    id: 'visual',
    name: '可视化',
    billingCycle: 'month',
    features: [
      { id: 'screen', name: '大屏', metrics: [{ id: 'page', name: '页面数量', unitPrice: 2, step: 1 }] },
      { id: 'widget', name: '组件', metrics: [{ id: 'count', name: '组件数量', unitPrice: 0.1, step: 10 }] }
    ],
    plans: [
      { id: 'standard', name: '基础版', price: 999 },
      { id: 'enterprise', name: '企业版', price: 2999 }
    ]
  },
  {
    id: 'spatial',
    name: '空间态势',
    billingCycle: 'year',
    features: [
      { id: 'space', name: '空间', metrics: [{ id: 'entity', name: '实体数量', unitPrice: 0.5, step: 5 }] }
    ],
    plans: [
      { id: 'standard', name: '基础版', price: 12999 },
      { id: 'enterprise', name: '企业版', price: 39999 }
    ]
  },
  {
    id: 'inspect',
    name: '巡检',
    billingCycle: 'month',
    features: [
      { id: 'plan', name: '巡检计划', metrics: [{ id: 'entity', name: '实体数量', unitPrice: 0.5, step: 1 }] },
      { id: 'route', name: '巡检路线', metrics: [{ id: 'entity', name: '实体数量', unitPrice: 0.5, step: 1 }] }
    ],
    plans: [
      { id: 'standard', name: '基础版', price: 899 },
      { id: 'enterprise', name: '企业版', price: 2499 }
    ]
  },
  {
    id: 'video',
    name: '视联',
    billingCycle: 'month',
    features: [
      { id: 'camera', name: '监控点位', metrics: [{ id: 'channel', name: '接入路数', unitPrice: 5, step: 1 }] },
      { id: 'storage', name: '录像存储', metrics: [{ id: 'gb', name: '存储容量(GB)', unitPrice: 0.05, step: 50 }] }
    ],
    plans: [
      { id: 'standard', name: '基础版', price: 1299 },
      { id: 'enterprise', name: '企业版', price: 3999 }
    ]
  }
]

// 套餐对比表
export const packageComparison: ComparisonGroup[] = [
  {
    service: '基础服务',
    rows: [
      { feature: '用户', metric: '实体数量', quotas: { free: 10, basic: 50, enterprise: 200 } },
      { feature: '角色', metric: '实体数量', quotas: { free: 10, basic: 50, enterprise: 200 } }
    ]
  },
  {
    service: '开发',
    rows: [
      { feature: '设备', metric: '实体数量', quotas: { free: 100, basic: 1000, enterprise: 5000 } },
      { feature: '设备', metric: '消息数量', quotas: { free: 100000, basic: 1000000, enterprise: 5000000 } },
      { feature: '设备', metric: '消息上报频率', quotas: { free: 5, basic: 10, enterprise: 20 } },
      { feature: '设备', metric: '属性数量', quotas: { free: 30, basic: 50, enterprise: 100 } }
    ]
  },
  {
    service: '告警',
    rows: [
      { feature: '告警配置', metric: '实体数量', quotas: { free: 200, basic: 2000, enterprise: 10000 } }
    ]
  },
  {
    service: '网关',
    noOwnMetrics: true,
    referenceNote: '网关不单独配置指标，接入用量计入已订阅服务的配额（如基础服务的用户、开发的设备等）。'
  },
  {
    service: '物联',
    rows: [
      { feature: '设备', metric: '实体数量', quotas: { free: 100, basic: 2000, enterprise: 10000 } },
      { feature: '设备', metric: '消息数量', quotas: { free: 100000, basic: 1000000, enterprise: 5000000 } },
      { feature: '设备', metric: '消息上报频率', quotas: { free: 5, basic: 10, enterprise: 20 } },
      { feature: '设备', metric: '属性数量', quotas: { free: 30, basic: 50, enterprise: 100 } },
      { feature: '设备分组', metric: '实体数量', quotas: { free: 20, basic: 100, enterprise: 500 } }
    ]
  },
  {
    service: '可视化',
    tiers: ['basic', 'enterprise'],
    rows: [
      { feature: '大屏', metric: '页面数量', quotas: { basic: 10, enterprise: 50 } },
      { feature: '组件', metric: '组件数量', quotas: { basic: 100, enterprise: 500 } }
    ]
  },
  {
    service: '空间态势',
    tiers: ['basic', 'enterprise'],
    rows: [{ feature: '空间', metric: '实体数量', quotas: { basic: 500, enterprise: 2000 } }]
  },
  {
    service: '巡检',
    rows: [
      { feature: '巡检计划', metric: '实体数量', quotas: { free: 5, basic: 50, enterprise: 200 } },
      { feature: '巡检路线', metric: '实体数量', quotas: { free: 10, basic: 100, enterprise: 500 } }
    ]
  },
  {
    service: '视联',
    rows: [
      { feature: '监控点位', metric: '接入路数', quotas: { free: 4, basic: 32, enterprise: 128 } },
      { feature: '录像存储', metric: '存储容量(GB)', quotas: { free: 50, basic: 500, enterprise: 2000 } }
    ]
  }
]

// 格式化数字
export function formatNumber(n: number): string {
  return n.toLocaleString('zh-CN')
}

// 格式化价格
export function formatPrice(n: number): string {
  return n % 1 === 0 ? n.toLocaleString('zh-CN') : n.toFixed(2)
}
