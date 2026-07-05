/**
 * 客流分析模块共用 mock 数据
 * 数据来源：JetLinks UAT 站 cloud-uat.jetlinks.cn/ht_device/#/flow-analysis/people/trends
 */

// ===== 趋势页 KPI 卡片（4 张，1:1 原值）=====
export interface KpiCard {
  value: string
  sub: string
  accent?: boolean // 周末/特殊色
}

export const trendKpis: KpiCard[] = [
  { value: '20,341', sub: '进 10,866 / 出 9,475' },
  { value: '1,585', sub: '2026-06-26 16:00' },
  { value: '16:00-17:00 / 17:00-18:00', sub: '平均小时客流 121.08' },
  { value: '98.6%', sub: '2 在线 / 0 离线 · 3 次中断' }
]

// ===== 周-日分布对比（7 行，1:1 原值）=====
export interface WeekdayRow {
  day: string
  value: number
  display: string
  weekend: boolean
}

export const weekdayRows: WeekdayRow[] = [
  { day: '周一', value: 8987, display: '8,987', weekend: false },
  { day: '周二', value: 736, display: '736', weekend: false },
  { day: '周三', value: 3390, display: '3,390', weekend: false },
  { day: '周四', value: 1348, display: '1,348', weekend: false },
  { day: '周五', value: 4515, display: '4,515', weekend: false },
  { day: '周六', value: 1248, display: '1,248', weekend: true },
  { day: '周日', value: 117, display: '117', weekend: true }
]

// 工作日 / 周末 汇总
export const weekdaySummary = {
  workday: { value: '3,795', sub: '5 天 · 高峰 16:00-17:00 / 17:00-18:00' },
  weekend: { value: '683', sub: '2 天 · 高峰 16:00-17:00 / 17:00-18:00' }
}

// ===== 点位明细表格（1:1 原值，2 行真实数据 + 扩展行）=====
export interface PointDetailRow {
  key: string
  index: number
  point: string
  pointId: string
  area: string
  lines: number
  direction: string
  total: string
  inOut: string
  present: string
  peak: string
}

export const pointDetails: PointDetailRow[] = [
  {
    key: '1',
    index: 1,
    point: '产品部原机房位置',
    pointId: '35dffee6-679a-4a6f-98a1-842b6cd61fde',
    area: '物联网产业园区 / E栋 / 4F / 研发部办公区',
    lines: 1,
    direction: '双向',
    total: '2,465',
    inOut: '1,135 / 1,330',
    present: '-195',
    peak: '15:00-16:00 / 17:00-18:00'
  },
  {
    key: '2',
    index: 2,
    point: '产品部门口',
    pointId: 'a553b3c3-fae3-42e6-887f-a57e8c7cf520',
    area: '物联网产业园区 / E栋 / 4F / 研发部办公区',
    lines: 1,
    direction: '双向',
    total: '475',
    inOut: '223 / 252',
    present: '-29',
    peak: '12:00-13:00 / 11:00-12:00'
  },
  {
    key: '3',
    index: 3,
    point: '东门入口',
    pointId: 'b3c2d1e0-1234-5678-9abc-def012345678',
    area: '物联网产业园区 / E栋 / 1F / 大厅',
    lines: 1,
    direction: '进',
    total: '8,742',
    inOut: '8,742 / 0',
    present: '8,742',
    peak: '08:00-09:00 / 09:00-10:00'
  },
  {
    key: '4',
    index: 4,
    point: '西门通道',
    pointId: 'c4d3e2f1-2345-6789-abcd-ef0123456789',
    area: '物联网产业园区 / E栋 / 1F / 走廊',
    lines: 2,
    direction: '双向',
    total: '5,318',
    inOut: '2,601 / 2,717',
    present: '-116',
    peak: '17:00-18:00 / 18:00-19:00'
  },
  {
    key: '5',
    index: 5,
    point: '研发部办公区主通道',
    pointId: 'd5e4f3a2-3456-789a-bcde-f01234567890',
    area: '物联网产业园区 / E栋 / 4F / 研发部办公区',
    lines: 1,
    direction: '双向',
    total: '3,806',
    inOut: '1,988 / 1,818',
    present: '170',
    peak: '10:00-11:00 / 14:00-15:00'
  }
]

// ===== 客流趋势折线图数据（近7日，按天聚合，1:1 总量吻合 20341）=====
// 进 10866 / 出 9475，按 7 天分布
export const trendLineDays = ['06-26', '06-27', '06-28', '06-29', '06-30', '07-01', '07-02']
export const trendLineIn = [3420, 1980, 1240, 860, 1620, 980, 766]
export const trendLineOut = [3105, 1720, 1080, 740, 1380, 870, 580]
// 净在场 = 累计进 - 累计出
export const trendLineNet = (() => {
  const arr: number[] = []
  let cumIn = 0
  let cumOut = 0
  for (let i = 0; i < trendLineIn.length; i++) {
    cumIn += trendLineIn[i]
    cumOut += trendLineOut[i]
    arr.push(cumIn - cumOut)
  }
  return arr
})()

// ===== 小时分布柱状图（24 小时，典型办公场景双峰）=====
export const hourlyDistribution = [
  8, 5, 3, 2, 2, 4, 12, 45, 128, 186, 142, 95,
  156, 110, 168, 175, 134, 198, 145, 88, 62, 38, 22, 12
]
export const hourlyLabels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

// ===== 点位管理表格 =====
export interface PointManageRow {
  key: string
  name: string
  code: string
  area: string
  device: string
  status: 'online' | 'offline'
  updateTime: string
}

export const pointManageList: PointManageRow[] = [
  {
    key: '1',
    name: '产品部原机房位置',
    code: 'flow-point-001',
    area: 'E栋 / 4F / 研发部办公区',
    device: '摄像头-A1（海康）',
    status: 'online',
    updateTime: '2026-07-02 14:23'
  },
  {
    key: '2',
    name: '产品部门口',
    code: 'flow-point-002',
    area: 'E栋 / 4F / 研发部办公区',
    device: '摄像头-A2（海康）',
    status: 'online',
    updateTime: '2026-07-02 14:23'
  },
  {
    key: '3',
    name: '东门入口',
    code: 'flow-point-003',
    area: 'E栋 / 1F / 大厅',
    device: '摄像头-B1（大华）',
    status: 'online',
    updateTime: '2026-07-02 09:15'
  },
  {
    key: '4',
    name: '西门通道',
    code: 'flow-point-004',
    area: 'E栋 / 1F / 走廊',
    device: '摄像头-B2（大华）',
    status: 'offline',
    updateTime: '2026-06-30 18:42'
  },
  {
    key: '5',
    name: '研发部办公区主通道',
    code: 'flow-point-005',
    area: 'E栋 / 4F / 研发部办公区',
    device: '摄像头-A3（海康）',
    status: 'online',
    updateTime: '2026-07-02 14:23'
  },
  {
    key: '6',
    name: '电梯厅',
    code: 'flow-point-006',
    area: 'E栋 / 2F / 公共区域',
    device: '摄像头-C1（宇视）',
    status: 'online',
    updateTime: '2026-07-01 11:08'
  }
]
