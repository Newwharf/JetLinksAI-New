/**
 * 风险隐患分析 — 聚合数据 + ECharts option builder
 * 基于 risk-ledger.mock.ts 的 hazards 数据进行统计分析
 */
import {
  hazards,
  riskLevelMeta,
  categoryOptions,
  statusMeta,
  sourceMeta,
  type Hazard,
  type HazardStatus,
  type ReportSource
} from './risk-ledger.mock'

// ===== ① 顶部指标 =====
export interface RiskMetrics {
  total: number
  majorCount: number
  majorUnclosed: number
  pendingCount: number
  rectifyingCount: number
  closedCount: number
  closeRate: number          // 整改完成率 %
}

function computeMetrics(): RiskMetrics {
  const total = hazards.length
  const major = hazards.filter(h => h.riskLevel === 'major')
  const majorUnclosed = major.filter(h => h.status !== 'closed').length
  const pendingCount = hazards.filter(h => h.status === 'pending').length
  const rectifyingCount = hazards.filter(h => h.status === 'rectifying').length
  const closedCount = hazards.filter(h => h.status === 'closed').length
  const closeRate = total > 0 ? Math.round((closedCount / total) * 1000) / 10 : 0

  return { total, majorCount: major.length, majorUnclosed, pendingCount, rectifyingCount, closedCount, closeRate }
}

export const riskMetrics: RiskMetrics = computeMetrics()

// ===== ② 隐患类别分布（水平条形图）=====
export const categoryDistribution = categoryOptions.map(c => ({
  name: c.label,
  count: hazards.filter(h => h.category === c.value).length,
  color: c.color
})).sort((a, b) => b.count - a.count)

// ===== ③ 风险等级分布（饼图）=====
export const riskLevelDistribution: { name: string; value: number; color: string }[] = [
  { name: '重大', value: hazards.filter(h => h.riskLevel === 'major').length, color: riskLevelMeta.major.color },
  { name: '一般', value: hazards.filter(h => h.riskLevel === 'general').length, color: riskLevelMeta.general.color },
  { name: '轻微', value: hazards.filter(h => h.riskLevel === 'minor').length, color: riskLevelMeta.minor.color }
]

// ===== ④ 流程状态分布（环形图）=====
export const statusDistribution: { name: string; value: number; color: string }[] = (['pending', 'assessing', 'rectifying', 'closed'] as HazardStatus[]).map(s => ({
  name: statusMeta[s].label,
  value: hazards.filter(h => h.status === s).length,
  color: statusMeta[s].color
}))

// ===== ⑤ 近30天隐患上报趋势（折线图）=====
export interface TrendDay {
  date: string         // MM-DD
  major: number
  general: number
  minor: number
  total: number
  closed: number       // 当日整改完成数
}

function computeTrend(): TrendDay[] {
  const days: TrendDay[] = []
  const now = new Date('2026-07-13')
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const fullDate = `2026-${dateStr}`
    const dayReports = hazards.filter(h => h.reportTime.substring(0, 10) === fullDate)
    const dayClosed = hazards.filter(h => h.rectifyTime && h.rectifyTime.substring(0, 10) === fullDate)
    days.push({
      date: dateStr,
      major: dayReports.filter(h => h.riskLevel === 'major').length,
      general: dayReports.filter(h => h.riskLevel === 'general').length,
      minor: dayReports.filter(h => h.riskLevel === 'minor').length,
      total: dayReports.length,
      closed: dayClosed.length
    })
  }
  return days
}

export const trendData: TrendDay[] = computeTrend()

// ===== ⑥ 各工地隐患数量排行 =====
import { constructionSites } from './posture.mock'

export const siteRanking = constructionSites.map(s => ({
  name: s.name,
  count: hazards.filter(h => h.siteId === s.id).length
})).sort((a, b) => b.count - a.count).slice(0, 10)

// ===== ⑦ 上报来源占比 =====
export const sourceDistribution: { name: string; value: number; color: string }[] = (['manual', 'ai'] as ReportSource[]).map(s => ({
  name: sourceMeta[s].label,
  value: hazards.filter(h => h.reportSource === s).length,
  color: sourceMeta[s].color
}))

// ===== ⑧ 最近重大隐患（未整改或未关闭）=====
export const recentMajorHazards: Hazard[] = hazards
  .filter(h => h.riskLevel === 'major' && h.status !== 'closed')
  .sort((a, b) => b.reportTime.localeCompare(a.reportTime))
  .slice(0, 6)
