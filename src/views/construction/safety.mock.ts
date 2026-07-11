/**
 * 工地安全报告 mock 数据
 * 月度/周度/每日安全评分 + 报告详情
 */
import { constructionSites } from './posture.mock'

// ===== 每日评分 =====
export interface DailyScore {
  /** 日期 YYYY-MM-DD */
  date: string
  /** 评分 0~100 */
  score: number
  /** 安全告警数 */
  safetyCount: number
  /** 风险预警数 */
  riskCount: number
}

// ===== 周度评分 =====
export interface WeeklyScore {
  /** 第几周（从1开始） */
  weekIndex: number
  /** 周标签 */
  weekLabel: string
  /** 日期范围 */
  dateRange: string
  /** 该周每日评分 */
  days: DailyScore[]
  /** 周综合评分 */
  weeklyAvg: number
}

// ===== 报告详情 =====
export interface ReportDetail {
  /** 报告类型 */
  type: 'month' | 'week' | 'day'
  /** 标题 */
  title: string
  /** 时间范围 */
  dateRange: string
  /** 评分 */
  score: number
  /** 评分等级 */
  level: string
  /** 安全告警总数 */
  safetyCount: number
  /** 风险预警总数 */
  riskCount: number
  /** 扣分明细 */
  deductions: { label: string; count: number; perScore: number; totalDeduct: number }[]
  /** 评分摘要 */
  summary: string
  /** 改进建议 */
  suggestions: string[]
}

// 简单确定性随机
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// 评分颜色等级（紫色调安全配色：红→紫红→蓝紫→青蓝）
export function scoreColor(score: number): string {
  if (score >= 85) return '#2bb3a3'  // 安全 — 青绿（与 $color-online 一致）
  if (score >= 70) return '#6e4bff'  // 一般 — 主题紫
  if (score >= 55) return '#925ce0'  // 偏低 — 紫红
  if (score > 0) return '#ff4d4f'    // 危险 — 红（保留警示）
  return '#e8e8e8'
}

export function scoreLevel(score: number): string {
  if (score >= 85) return '安全'
  if (score >= 70) return '一般'
  return '风险'
}

// 获取某月天数
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

// 格式化日期
function formatDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// ===== 获取某工地某月每日评分 =====
const monthlyCache: Record<string, DailyScore[]> = {}

export function getMonthlyScores(siteId: string, year: number, month: number): DailyScore[] {
  const cacheKey = `${siteId}-${year}-${month}`
  if (monthlyCache[cacheKey]) return monthlyCache[cacheKey]

  const site = constructionSites.find(s => s.id === siteId)
  if (!site) return []

  const baseScore = site.safetyScore || 80
  const seed = parseInt(siteId.replace('c', '')) || 1
  const rand = seededRandom(seed * 1000 + year * 100 + month)
  const daysInMonth = getDaysInMonth(year, month)
  const result: DailyScore[] = []

  for (let day = 1; day <= daysInMonth; day++) {
    // 基于基准分做波动
    const fluctuation = (rand() - 0.5) * 30
    const score = Math.max(40, Math.min(98, Math.round(baseScore + fluctuation)))
    // 模拟事件数：评分越低事件越多
    const safetyCount = score < 60 ? Math.floor(rand() * 4) + 1 : score < 75 ? Math.floor(rand() * 2) : 0
    const riskCount = score < 70 ? Math.floor(rand() * 3) + 1 : score < 85 ? Math.floor(rand() * 2) : 0
    result.push({
      date: formatDate(year, month, day),
      score,
      safetyCount,
      riskCount
    })
  }

  monthlyCache[cacheKey] = result
  return result
}

// ===== 获取某工地某月按周分组 =====
export function getWeeklyScores(siteId: string, year: number, month: number): WeeklyScore[] {
  const dailyScores = getMonthlyScores(siteId, year, month)
  if (dailyScores.length === 0) return []

  const weeks: WeeklyScore[] = []
  let currentWeek: DailyScore[] = []
  let weekIndex = 1

  for (const day of dailyScores) {
    currentWeek.push(day)
    const date = new Date(day.date)
    const dayOfWeek = date.getDay() // 0=周日

    // 周日作为一周的结束
    if (dayOfWeek === 0 || day === dailyScores[dailyScores.length - 1]) {
      const avg = Math.round(currentWeek.reduce((s, d) => s + d.score, 0) / currentWeek.length)
      const firstDate = currentWeek[0].date.substring(5)
      const lastDate = currentWeek[currentWeek.length - 1].date.substring(5)
      weeks.push({
        weekIndex,
        weekLabel: `第${weekIndex}周`,
        dateRange: `${firstDate} ~ ${lastDate}`,
        days: [...currentWeek],
        weeklyAvg: avg
      })
      currentWeek = []
      weekIndex++
    }
  }

  // 处理剩余天数
  if (currentWeek.length > 0) {
    const avg = Math.round(currentWeek.reduce((s, d) => s + d.score, 0) / currentWeek.length)
    const firstDate = currentWeek[0].date.substring(5)
    const lastDate = currentWeek[currentWeek.length - 1].date.substring(5)
    weeks.push({
      weekIndex,
      weekLabel: `第${weekIndex}周`,
      dateRange: `${firstDate} ~ ${lastDate}`,
      days: [...currentWeek],
      weeklyAvg: avg
    })
  }

  return weeks
}

// ===== 月综合评分 =====
export function getMonthlyAvg(siteId: string, year: number, month: number): number {
  const scores = getMonthlyScores(siteId, year, month)
  if (scores.length === 0) return 0
  return Math.round(scores.reduce((s, d) => s + d.score, 0) / scores.length)
}

// ===== 生成报告详情 =====
export function getReportDetail(
  siteId: string,
  type: 'month' | 'week' | 'day',
  year: number,
  month: number,
  dayOrWeek?: number
): ReportDetail {
  const site = constructionSites.find(s => s.id === siteId)
  const siteName = site?.name || '未知工地'

  if (type === 'day') {
    const scores = getMonthlyScores(siteId, year, month)
    const dayData = scores.find(d => d.date === formatDate(year, month, dayOrWeek!)) || scores[0]
    const score = dayData?.score || 0
    const safetyCount = dayData?.safetyCount || 0
    const riskCount = dayData?.riskCount || 0
    const deductions: ReportDetail['deductions'] = []
    if (safetyCount > 0) deductions.push({ label: '安全告警事件', count: safetyCount, perScore: 4, totalDeduct: safetyCount * 4 })
    if (riskCount > 0) deductions.push({ label: '风险预警事件', count: riskCount, perScore: 2, totalDeduct: riskCount * 2 })

    const suggestions: string[] = []
    if (safetyCount >= 3) suggestions.push('安全告警事件较多，建议立即组织安全排查。')
    else if (safetyCount > 0) suggestions.push('存在安全告警事件，建议及时处理。')
    if (riskCount >= 2) suggestions.push('风险预警数量较多，建议加强巡查。')
    else if (riskCount > 0) suggestions.push('存在风险预警，建议关注。')
    if (suggestions.length === 0) suggestions.push('当日安全状况良好，继续保持。')

    return {
      type: 'day',
      title: `${siteName} 日报`,
      dateRange: dayData?.date || '',
      score,
      level: scoreLevel(score),
      safetyCount,
      riskCount,
      deductions,
      summary: deductions.length === 0
        ? '当日无安全告警和风险预警事件，安全状况良好。'
        : `当日存在 ${safetyCount} 项安全告警、${riskCount} 项风险预警，共扣 ${deductions.reduce((s, d) => s + d.totalDeduct, 0)} 分。`,
      suggestions
    }
  }

  if (type === 'week') {
    const weeks = getWeeklyScores(siteId, year, month)
    const weekData = weeks.find(w => w.weekIndex === dayOrWeek) || weeks[0]
    const score = weekData?.weeklyAvg || 0
    const safetyCount = weekData?.days.reduce((s, d) => s + d.safetyCount, 0) || 0
    const riskCount = weekData?.days.reduce((s, d) => s + d.riskCount, 0) || 0
    const deductions: ReportDetail['deductions'] = []
    if (safetyCount > 0) deductions.push({ label: '安全告警事件', count: safetyCount, perScore: 4, totalDeduct: safetyCount * 4 })
    if (riskCount > 0) deductions.push({ label: '风险预警事件', count: riskCount, perScore: 2, totalDeduct: riskCount * 2 })

    const suggestions: string[] = []
    if (safetyCount >= 10) suggestions.push('本周安全告警事件较多，建议全面排查安全隐患。')
    else if (safetyCount > 0) suggestions.push('本周存在安全告警事件，建议及时处理。')
    if (riskCount >= 8) suggestions.push('本周风险预警数量较多，建议加强日常巡查。')
    else if (riskCount > 0) suggestions.push('本周存在风险预警，建议采取预防措施。')
    if (suggestions.length === 0) suggestions.push('本周安全状况良好，继续保持。')

    return {
      type: 'week',
      title: `${siteName} 周报`,
      dateRange: weekData?.dateRange || '',
      score,
      level: scoreLevel(score),
      safetyCount,
      riskCount,
      deductions,
      summary: deductions.length === 0
        ? '本周无安全告警和风险预警事件，安全状况良好。'
        : `本周存在 ${safetyCount} 项安全告警、${riskCount} 项风险预警，共扣 ${deductions.reduce((s, d) => s + d.totalDeduct, 0)} 分。`,
      suggestions
    }
  }

  // month
  const scores = getMonthlyScores(siteId, year, month)
  const score = getMonthlyAvg(siteId, year, month)
  const safetyCount = scores.reduce((s, d) => s + d.safetyCount, 0)
  const riskCount = scores.reduce((s, d) => s + d.riskCount, 0)
  const deductions: ReportDetail['deductions'] = []
  if (safetyCount > 0) deductions.push({ label: '安全告警事件', count: safetyCount, perScore: 4, totalDeduct: safetyCount * 4 })
  if (riskCount > 0) deductions.push({ label: '风险预警事件', count: riskCount, perScore: 2, totalDeduct: riskCount * 2 })

  const suggestions: string[] = []
  if (safetyCount >= 30) suggestions.push('本月安全告警事件较多，建议全面开展安全排查整治。')
  else if (safetyCount > 0) suggestions.push('本月存在安全告警事件，建议加强安全管理。')
  if (riskCount >= 20) suggestions.push('本月风险预警数量较多，建议增加巡查频次。')
  else if (riskCount > 0) suggestions.push('本月存在风险预警，建议关注重点部位。')
  if (suggestions.length === 0) suggestions.push('本月安全状况良好，继续保持安全管理水平。')

  return {
    type: 'month',
    title: `${siteName} 月报`,
    dateRange: `${year}年${month}月`,
    score,
    level: scoreLevel(score),
    safetyCount,
    riskCount,
    deductions,
    summary: deductions.length === 0
      ? '本月无安全告警和风险预警事件，安全状况良好。'
      : `本月存在 ${safetyCount} 项安全告警、${riskCount} 项风险预警，共扣 ${deductions.reduce((s, d) => s + d.totalDeduct, 0)} 分。`,
    suggestions
  }
}
