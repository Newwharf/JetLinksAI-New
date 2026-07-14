/**
 * 人员总览分析 - 聚合数据构建函数
 * 从 person-stats.mock 和 posture.mock 聚合各维度统计数据
 */
import { constructionSites, getSiteWorkers } from './posture.mock'
import {
  violationRecords,
  violationTypeMeta,
  violationStatusMeta,
  safetyEventRecords,
  eventStatusMeta,
  accessRecords,
  certRecords,
  certTypeMeta,
  certStatusMeta,
  type ViolationType,
  type CertStatus
} from './person-stats.mock'

// 工种列表
const allRoles = ['钢筋工', '木工', '混凝土工', '架子工', '电焊工', '电工', '水暖工', '塔吊司机', '信号工', '测量员', '安全员', '材料员']

// ===== 指标卡片聚合 =====
export function buildOverviewMetrics(siteIds: Set<string>) {
  const today = '2026-07-13'
  const monthPrefix = '2026-07'

  // 进出
  const todayAccess = accessRecords.filter(a => siteIds.has(a.siteId) && a.time.startsWith(today))
  const todayIn = todayAccess.filter(a => a.direction === 'in').length
  const todayOut = todayAccess.filter(a => a.direction === 'out').length
  const present = todayIn - todayOut

  // 违章
  const todayViolations = violationRecords.filter(v => siteIds.has(v.siteId) && v.time.startsWith(today)).length
  const pendingViolations = violationRecords.filter(v => siteIds.has(v.siteId) && v.status !== 'resolved').length

  // 安全事件
  const monthEvents = safetyEventRecords.filter(e => siteIds.has(e.siteId) && e.time.startsWith(monthPrefix)).length
  const unclosedEvents = safetyEventRecords.filter(e => siteIds.has(e.siteId) && e.status !== 'closed').length

  // 资质证件
  const filteredCerts = certRecords.filter(c => siteIds.has(c.siteId))
  const certifiedPersons = new Set(filteredCerts.map(c => c.personName + c.siteId)).size
  const expiringCerts = filteredCerts.filter(c => c.status === 'expiring').length
  const expiredCerts = filteredCerts.filter(c => c.status === 'expired').length

  // 待处理总计
  const totalPending = pendingViolations + unclosedEvents + expiringCerts + expiredCerts

  return {
    present,
    todayViolations,
    pendingViolations,
    monthEvents,
    unclosedEvents,
    certifiedPersons,
    expiringCerts,
    expiredCerts,
    totalPending
  }
}

// ===== 进出趋势（7天双折线）=====
export function buildOverviewAccessTrend(siteIds: Set<string>) {
  const days = ['07-09', '07-10', '07-11', '07-12', '07-13', '07-14', '07-15']
  const filtered = accessRecords.filter(a => siteIds.has(a.siteId))
  return {
    days,
    inCounts: days.map(d => filtered.filter(a => a.direction === 'in' && a.time.includes(`2026-${d}`)).length),
    outCounts: days.map(d => filtered.filter(a => a.direction === 'out' && a.time.includes(`2026-${d}`)).length)
  }
}

// ===== 违章类型分布（饼图）=====
export function buildOverviewViolationPie(siteIds: Set<string>) {
  const types = Object.keys(violationTypeMeta) as ViolationType[]
  const filtered = violationRecords.filter(v => siteIds.has(v.siteId))
  return types.map(t => ({
    name: violationTypeMeta[t].label,
    value: filtered.filter(v => v.type === t).length,
    itemStyle: { color: violationTypeMeta[t].color }
  })).filter(d => d.value > 0)
}

// ===== 工种分布（柱状图）=====
export function buildOverviewRoleBar(siteIds: Set<string>) {
  const roleCounts: Record<string, number> = {}
  for (const site of constructionSites) {
    if (!siteIds.has(site.id)) continue
    const workers = getSiteWorkers(site.id)
    for (const w of workers) {
      roleCounts[w.role] = (roleCounts[w.role] || 0) + 1
    }
  }
  return {
    roles: allRoles.filter(r => roleCounts[r]),
    counts: allRoles.filter(r => roleCounts[r]).map(r => roleCounts[r])
  }
}

// ===== 证件状态分布（环形图）=====
export function buildOverviewCertPie(siteIds: Set<string>) {
  const filtered = certRecords.filter(c => siteIds.has(c.siteId))
  const statuses: CertStatus[] = ['valid', 'expiring', 'expired']
  return statuses.map(s => ({
    name: certStatusMeta[s].label,
    value: filtered.filter(c => c.status === s).length,
    itemStyle: { color: certStatusMeta[s].color }
  })).filter(d => d.value > 0)
}

// ===== 待办事项明细 =====
export interface TodoDetailItem {
  id: string
  category: 'violation' | 'event' | 'cert'
  personName: string
  personAvatar: string
  siteName: string
  title: string
  time: string
  statusLabel: string
  statusColor: string
}

export function buildTodoDetails(siteIds: Set<string>): TodoDetailItem[] {
  const items: TodoDetailItem[] = []

  // 违章（待处理+处理中）
  for (const v of violationRecords.filter(v => siteIds.has(v.siteId) && v.status !== 'resolved')) {
    items.push({
      id: v.id,
      category: 'violation',
      personName: v.personName,
      personAvatar: v.personAvatar,
      siteName: v.siteName,
      title: v.desc,
      time: v.time,
      statusLabel: violationStatusMeta[v.status].label,
      statusColor: violationStatusMeta[v.status].color
    })
  }

  // 安全事件（未结案）
  for (const e of safetyEventRecords.filter(e => siteIds.has(e.siteId) && e.status !== 'closed')) {
    items.push({
      id: e.id,
      category: 'event',
      personName: e.personName,
      personAvatar: e.personAvatar,
      siteName: e.siteName,
      title: e.desc,
      time: e.time,
      statusLabel: eventStatusMeta[e.status].label,
      statusColor: eventStatusMeta[e.status].color
    })
  }

  // 证件（即将过期+已过期）
  for (const c of certRecords.filter(c => siteIds.has(c.siteId) && c.status !== 'valid')) {
    items.push({
      id: c.id,
      category: 'cert',
      personName: c.personName,
      personAvatar: c.personAvatar,
      siteName: c.siteName,
      title: `${certTypeMeta[c.type].label} - 到期日 ${c.expireDate}`,
      time: c.expireDate,
      statusLabel: certStatusMeta[c.status].label,
      statusColor: certStatusMeta[c.status].color
    })
  }

  return items
}

// ===== 在场人员列表 =====
export interface PresentWorker {
  id: string
  name: string
  avatar: string
  role: string
  siteName: string
  enterTime: string
}

const workerRolePool = ['钢筋工', '木工', '混凝土工', '架子工', '电焊工', '电工', '塔吊司机', '信号工', '安全员', '测量员']
const workerNamePool = ['张伟', '李强', '王勇', '刘洋', '陈刚', '赵磊', '孙杰', '周斌', '吴鹏', '郑辉', '马俊', '黄涛', '林峰', '徐亮', '胡军']

export function buildPresentWorkers(siteIds: Set<string>): PresentWorker[] {
  const today = '2026-07-13'
  // 取今天有进场记录的人（去重）
  const seen = new Set<string>()
  const workers: PresentWorker[] = []
  for (const a of accessRecords) {
    if (!siteIds.has(a.siteId)) continue
    if (!a.time.startsWith(today)) continue
    if (a.direction !== 'in') continue
    const key = a.personName + a.siteId
    if (seen.has(key)) continue
    seen.add(key)
    const nameIdx = workerNamePool.indexOf(a.personName)
    workers.push({
      id: `pw-${a.id}`,
      name: a.personName,
      avatar: a.personAvatar,
      role: workerRolePool[Math.abs(nameIdx) % workerRolePool.length],
      siteName: a.siteName,
      enterTime: a.time.substring(11)
    })
  }

  // 补充各工地活跃人员，保证在场列表更丰富
  for (const site of constructionSites) {
    if (!siteIds.has(site.id)) continue
    const siteWorkers = getSiteWorkers(site.id)
    for (const sw of siteWorkers) {
      const key = sw.name + site.id
      if (seen.has(key)) continue
      seen.add(key)
      workers.push({
        id: `pw-sup-${sw.id}`,
        name: sw.name,
        avatar: sw.avatar,
        role: sw.role,
        siteName: site.name,
        enterTime: sw.enterTime.substring(11)
      })
    }
  }

  return workers
}

// ===== 日历：每日各单位在场人员数量 =====
export interface CalendarDayData {
  date: string           // YYYY-MM-DD
  day: number            // 日
  construction: number   // 建设单位在场
  builder: number        // 施工单位在场
  supervisor: number     // 监理单位在场
  total: number
}

function seededRand(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

export function buildCalendarData(year: number, month: number): CalendarDayData[] {
  const daysInMonth = new Date(year, month, 0).getDate()
  const rand = seededRand(year * 100 + month)
  const result: CalendarDayData[] = []
  for (let day = 1; day <= daysInMonth; day++) {
    // 周末人少
    const dateObj = new Date(year, month - 1, day)
    const weekend = dateObj.getDay() === 0 || dateObj.getDay() === 6
    const scale = weekend ? 0.3 : 1
    const construction = Math.floor(rand() * 3 * scale)
    const builder = Math.floor(rand() * 20 * scale) + Math.floor(scale * 5)
    const supervisor = Math.floor(rand() * 3 * scale)
    result.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      day,
      construction,
      builder,
      supervisor,
      total: construction + builder + supervisor
    })
  }
  return result
}

