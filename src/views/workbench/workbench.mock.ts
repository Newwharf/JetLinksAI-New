/**
 * SaaS 工作台 mock 数据：项目 + 网关
 */

// ===== 项目 =====
export interface Project {
  id: string
  name: string
  region: string                 // 项目所在区域，如「西南1」
  description: string            // 项目说明
  subscriptionDays: number       // 剩余订阅天数
  status: 'running'              // 运行中
  alarmCount: number             // 待处理告警数
  iconColor: string              // 图标背景色
  iconChar: string               // 图标里的单字
  template?: string              // 创建时选择的项目模板
  urlSuffix?: string             // 项目访问地址后缀
  logoImg?: string               // 上传或生成的 Logo 图片
  createdAt?: string             // 创建时间
}

export const projects = ref<Project[]>([
  {
    id: 'p1',
    name: '办公室场景项目',
    region: '西南1',
    description: '园区智能化办公安防监控平台，覆盖门禁、监控、告警全链路',
    subscriptionDays: 156,
    status: 'running',
    alarmCount: 3,
    iconColor: '#3b82f6',
    iconChar: '办'
  },
  {
    id: 'p2',
    name: '商场安防项目',
    region: '华东2',
    description: '大型商业综合体智慧安防系统，含客流分析与周界防护',
    subscriptionDays: 89,
    status: 'running',
    alarmCount: 7,
    iconColor: '#f59e0b',
    iconChar: '商'
  },
  {
    id: 'p3',
    name: '工厂 EHS 项目',
    region: '华北1',
    description: '工业园区环境健康安全监测，含废气废水实时管控',
    subscriptionDays: 23,
    status: 'running',
    alarmCount: 0,
    iconColor: '#10b981',
    iconChar: '厂'
  },
  {
    id: 'p4',
    name: '人才公寓项目',
    region: '华南1',
    description: '智慧公寓人通行与安全管理，含人脸门禁与访客系统',
    subscriptionDays: 267,
    status: 'running',
    alarmCount: 1,
    iconColor: '#8b5cf6',
    iconChar: '寓'
  },
  {
    id: 'p5',
    name: '智慧养老项目',
    region: '西南1',
    description: '养老机构安全看护与老人行为分析平台',
    subscriptionDays: 45,
    status: 'running',
    alarmCount: 2,
    iconColor: '#ec4899',
    iconChar: '老'
  },
  {
    id: 'p6',
    name: '物流园区项目',
    region: '华东1',
    description: '物流园区车辆调度与周界安防一体化管理',
    subscriptionDays: 12,
    status: 'running',
    alarmCount: 0,
    iconColor: '#06b6d4',
    iconChar: '流'
  }
])

// ===== 网关 =====
export interface Gateway {
  id: string
  sn: string                     // 网关 SN 号
  projectId: string | null       // 所属项目 id（null = 未绑定）
  projectName: string | null     // 所属项目名（null = 未绑定项目）
  model: string                  // 网关型号
  cpu: number                    // CPU 使用率 %
  memory: number                 // 内存使用率 %
  disk: number                   // 硬盘使用率 %
  status: 'online' | 'offline'
}

export const gateways = ref<Gateway[]>([
  { id: 'g1', sn: 'JLE-2000-A8F3D1', projectId: 'p1', projectName: '办公室场景项目', model: 'JetLinks-Edge-2000', cpu: 42, memory: 58, disk: 35, status: 'online' },
  { id: 'g2', sn: 'JLE-1000-B2C9E7', projectId: 'p1', projectName: '办公室场景项目', model: 'JetLinks-Edge-1000', cpu: 28, memory: 46, disk: 22, status: 'online' },
  { id: 'g3', sn: 'JLE-2000-C5D4A8', projectId: 'p2', projectName: '商场安防项目', model: 'JetLinks-Edge-2000', cpu: 67, memory: 72, disk: 51, status: 'online' },
  { id: 'g4', sn: 'JLE-2000-D8F1B3', projectId: 'p2', projectName: '商场安防项目', model: 'JetLinks-Edge-2000', cpu: 55, memory: 63, disk: 48, status: 'offline' },
  { id: 'g5', sn: 'JLE-3000-E9A2C6', projectId: 'p4', projectName: '人才公寓项目', model: 'JetLinks-Edge-3000', cpu: 31, memory: 39, disk: 18, status: 'online' },
  { id: 'g6', sn: 'JLE-1000-F3B7D5', projectId: 'p5', projectName: '智慧养老项目', model: 'JetLinks-Edge-1000', cpu: 44, memory: 51, disk: 29, status: 'online' },
  { id: 'g7', sn: 'JLE-2000-A1C8E4', projectId: null, projectName: null, model: 'JetLinks-Edge-2000', cpu: 12, memory: 18, disk: 8, status: 'offline' },
  { id: 'g8', sn: 'JLE-3000-B6D9F2', projectId: null, projectName: null, model: 'JetLinks-Edge-3000', cpu: 9, memory: 15, disk: 6, status: 'online' }
])
