/**
 * 工地仪表盘 mock 数据
 * 顶部指标 / 安全评分排行 / 安全事件趋势 / 安全事件 / 风险预警 / 设备告警与健康 / 活跃人员
 */
import safetyImg1 from '@/assets/construction/safety/1.png'
import safetyImg2 from '@/assets/construction/safety/2.png'
import safetyImg3 from '@/assets/construction/safety/3.png'
import safetyImg4 from '@/assets/construction/safety/4.png'
import workerImg1 from '@/assets/construction/worker/1.png'
import workerImg2 from '@/assets/construction/worker/2.png'
import workerImg3 from '@/assets/construction/worker/3.png'
import workerImg4 from '@/assets/construction/worker/4.png'

// ===== ① 顶部指标 =====
export interface DeviceStat {
  total: number
  online: number
  offline: number
}

export interface TopMetrics {
  siteCount: number          // 工地总数
  gateway: DeviceStat        // 网关数
  activeWorkers: number      // 活跃工人数
  video: DeviceStat          // 视频数
  device: DeviceStat         // 设备数
}

export const topMetrics: TopMetrics = {
  siteCount: 24,
  gateway: { total: 38, online: 35, offline: 3 },
  activeWorkers: 1268,
  video: { total: 312, online: 298, offline: 14 },
  device: { total: 856, online: 812, offline: 44 }
}

// ===== ② 工地安全评分排行（前 10，评分最低）=====
export interface SiteSafetyRank {
  rank: number
  siteName: string
  score: number       // 安全评分 0-100
  incidentCount: number  // 近 30 日事件数
  trend: number       // 环比变化（正=上升/改善，负=下降/恶化）
}

export const siteSafetyRanks: SiteSafetyRank[] = [
  { rank: 1,  siteName: '滨江商业综合体三期', score: 62, incidentCount: 18, trend: -5 },
  { rank: 2,  siteName: '城东地铁站扩建',     score: 65, incidentCount: 15, trend: -3 },
  { rank: 3,  siteName: '西溪科技园区 B 栋',  score: 68, incidentCount: 12, trend: 2 },
  { rank: 4,  siteName: '钱江新城地下空间',   score: 70, incidentCount: 11, trend: -2 },
  { rank: 5,  siteName: '萧山国际机场 T4',     score: 72, incidentCount: 9,  trend: 4 },
  { rank: 6,  siteName: '之江大桥引桥工程',   score: 74, incidentCount: 8,  trend: 1 },
  { rank: 7,  siteName: '未来科技城枢纽',     score: 76, incidentCount: 7,  trend: 3 },
  { rank: 8,  siteName: '上城坊历史街区改造', score: 78, incidentCount: 6,  trend: -1 },
  { rank: 9,  siteName: '奥体中心配套道路',   score: 80, incidentCount: 5,  trend: 2 },
  { rank: 10, siteName: '余杭高铁新城',       score: 82, incidentCount: 4,  trend: 5 }
]

// ===== ③ 安全事件识别趋势（近 7 日，按类别）=====
export const safetyTrendDays: string[] = [
  '07-05', '07-06', '07-07', '07-08', '07-09', '07-10', '07-11'
]

export interface TrendSeries {
  name: string
  data: number[]
}

export const safetyEventTrendSeries: TrendSeries[] = [
  { name: '未戴安全帽',   data: [28, 35, 22, 30, 38, 25, 32] },
  { name: '未穿反光衣',   data: [12, 15, 18, 10, 14, 20, 16] },
  { name: '危险区域闯入', data: [8, 6, 10, 7, 5, 9, 11] },
  { name: '明火烟雾',     data: [3, 5, 2, 4, 6, 3, 2] }
]

// ===== ④ 最近安全事件（含图片）=====
export type SafetyLevel = '紧急' | '警告' | '提示'

export interface SafetyEventItem {
  id: string
  thumb: string
  title: string
  level: SafetyLevel
  site: string
  time: string
}

export const recentSafetyEvents: SafetyEventItem[] = [
  { id: 'se1', thumb: safetyImg1, title: '未戴安全帽进入施工区',     level: '紧急', site: '滨江商业综合体三期', time: '09:42' },
  { id: 'se2', thumb: safetyImg2, title: '工人未穿反光背心',         level: '警告', site: '城东地铁站扩建',     time: '09:18' },
  { id: 'se3', thumb: safetyImg3, title: '人员闯入吊装禁区',         level: '紧急', site: '钱江新城地下空间',   time: '08:55' },
  { id: 'se4', thumb: safetyImg4, title: '临边防护缺失',             level: '警告', site: '西溪科技园区 B 栋',  time: '08:30' },
  { id: 'se5', thumb: safetyImg1, title: '明火作业无审批',           level: '紧急', site: '之江大桥引桥工程',   time: '08:12' },
  { id: 'se6', thumb: safetyImg2, title: '电箱未上锁',               level: '提示', site: '萧山国际机场 T4',     time: '昨日 18:22' }
]

// ===== ⑤ 风险预警趋势 =====
export const riskTrendSeries: TrendSeries[] = [
  { name: '高处作业风险', data: [15, 12, 18, 14, 20, 16, 22] },
  { name: '基坑坍塌风险', data: [6, 8, 5, 9, 7, 10, 8] },
  { name: '机械伤害风险', data: [4, 3, 6, 5, 3, 7, 4] }
]

// ===== ⑥ 最近风险事件（含图片）=====
export type RiskLevel = '高风险' | '中风险' | '低风险'

export interface RiskEventItem {
  id: string
  thumb: string
  title: string
  level: RiskLevel
  site: string
  time: string
}

export const recentRiskEvents: RiskEventItem[] = [
  { id: 're1', thumb: safetyImg3, title: '基坑边缘裂缝扩展',     level: '高风险', site: '城东地铁站扩建',     time: '10:05' },
  { id: 're2', thumb: safetyImg4, title: '塔吊倾斜角度超标',     level: '高风险', site: '滨江商业综合体三期', time: '09:38' },
  { id: 're3', thumb: safetyImg1, title: '脚手架连墙件缺失',     level: '中风险', site: '钱江新城地下空间',   time: '09:15' },
  { id: 're4', thumb: safetyImg2, title: '临时用电线路破损',     level: '中风险', site: '之江大桥引桥工程',   time: '08:48' },
  { id: 're5', thumb: safetyImg3, title: '高处作业平台护栏低',   level: '低风险', site: '西溪科技园区 B 栋',  time: '昨日 17:20' },
  { id: 're6', thumb: safetyImg4, title: '物料堆载超限',         level: '低风险', site: '未来科技城枢纽',     time: '昨日 16:05' }
]

// ===== ⑦ 设备告警趋势 =====
export const deviceAlarmTrendSeries: TrendSeries[] = [
  { name: '设备离线', data: [8, 12, 6, 10, 14, 9, 7] },
  { name: '设备故障', data: [5, 3, 7, 4, 6, 8, 5] },
  { name: '数据异常', data: [3, 5, 2, 6, 4, 3, 7] }
]

// ===== ⑧ 设备健康趋势 =====
export const deviceHealthDays: string[] = safetyTrendDays

export interface HealthTrendSeries {
  name: string
  data: number[]  // 健康率百分比
}

export const deviceHealthTrendSeries: HealthTrendSeries[] = [
  { name: '网关健康率', data: [94, 93, 95, 92, 94, 96, 95] },
  { name: '视频健康率', data: [97, 96, 95, 96, 97, 95, 96] },
  { name: '设备健康率', data: [95, 94, 96, 95, 93, 94, 95] }
]

// ===== ⑨ 活跃人员趋势（近 7 日）=====
export interface WorkerTrend {
  days: string[]
  data: number[]
  today: number
  delta: number  // 环比 %
}

export const workerTrend: WorkerTrend = {
  days: safetyTrendDays,
  data: [980, 1052, 1120, 990, 1180, 1268, 1268],
  today: 1268,
  delta: 7.5
}

// ===== ⑩ 最近识别到的活跃人员（含图片）=====
export interface RecentWorker {
  id: string
  thumb: string
  name: string
  role: string       // 工种
  site: string
  time: string
}

export const recentWorkers: RecentWorker[] = [
  { id: 'w1', thumb: workerImg1, name: '张建国', role: '钢筋工', site: '滨江商业综合体三期', time: '09:52' },
  { id: 'w2', thumb: workerImg2, name: '李志强', role: '架子工', site: '城东地铁站扩建',     time: '09:46' },
  { id: 'w3', thumb: workerImg3, name: '王德发', role: '电焊工', site: '钱江新城地下空间',   time: '09:35' },
  { id: 'w4', thumb: workerImg4, name: '刘明远', role: '塔吊工', site: '萧山国际机场 T4',     time: '09:22' },
  { id: 'w5', thumb: workerImg1, name: '陈永福', role: '泥瓦工', site: '之江大桥引桥工程',   time: '09:08' },
  { id: 'w6', thumb: workerImg2, name: '赵铁柱', role: '水电工', site: '未来科技城枢纽',     time: '08:55' }
]
