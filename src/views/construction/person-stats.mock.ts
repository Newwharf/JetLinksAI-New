/**
 * 人员统计 - 共享 mock 数据
 * 包含人员违章、安全事件、进出记录、资质证件
 */
import { constructionSites } from './posture.mock'
import workerImg1 from '@/assets/construction/worker/1.png'
import workerImg2 from '@/assets/construction/worker/2.png'
import workerImg3 from '@/assets/construction/worker/3.png'
import workerImg4 from '@/assets/construction/worker/4.png'

const workerAvatars = [workerImg1, workerImg2, workerImg3, workerImg4]
const workerNames = ['张伟', '李强', '王勇', '刘洋', '陈刚', '赵磊', '孙杰', '周斌', '吴鹏', '郑辉', '马俊', '黄涛', '林峰', '徐亮', '胡军', '杨明', '赵刚', '钱波', '冯雷', '蒋涛']

// 确定性伪随机
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// ============================================================
// 1. 人员违章
// ============================================================
export type ViolationType = 'no-helmet' | 'no-vest' | 'danger-zone' | 'fire' | 'height' | 'block'
export type ViolationStatus = 'pending' | 'processing' | 'resolved'

export const violationTypeMeta: Record<ViolationType, { label: string; icon: string; color: string }> = {
  'no-helmet':   { label: '未戴安全帽',   icon: 'i-ant-design-safety-outlined',       color: '#ff4d4f' },
  'no-vest':     { label: '未穿反光衣',   icon: 'i-ant-design-skin-outlined',         color: '#fa8c16' },
  'danger-zone': { label: '危险区域闯入', icon: 'i-ant-design-warning-outlined',      color: '#faad14' },
  'fire':        { label: '违规动火',     icon: 'i-ant-design-fire-outlined',         color: '#f5222d' },
  'height':      { label: '高处作业违规', icon: 'i-ant-design-vertical-align-top-outlined', color: '#722ed1' },
  'block':       { label: '通道堵塞',     icon: 'i-ant-design-block-outlined',        color: '#13c2c2' }
}

export const violationTypeOptions = Object.entries(violationTypeMeta).map(([value, meta]) => ({ value: value as ViolationType, label: meta.label }))

export const violationStatusMeta: Record<ViolationStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: '待处理', color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)' },
  processing:{ label: '处理中', color: '#fa8c16', bg: 'rgba(250,140,22,0.1)' },
  resolved:  { label: '已处理', color: '#2bb3a3', bg: 'rgba(43,179,163,0.1)' }
}

export type ViolationSource = 'ai' | 'manual'

export const violationSourceMeta: Record<ViolationSource, { label: string; color: string; bg: string; icon: string }> = {
  ai:     { label: 'AI识别', color: '#6e4bff', bg: 'rgba(110,75,255,0.1)', icon: 'i-ant-design-thunderbolt-outlined' },
  manual: { label: '人工上报', color: '#8895ab', bg: 'rgba(136,149,171,0.1)', icon: 'i-ant-design-edit-outlined' }
}

export interface ViolationRecord {
  id: string
  personName: string
  personAvatar: string
  siteId: string
  siteName: string
  type: ViolationType
  desc: string
  time: string
  location: string
  status: ViolationStatus
  source: ViolationSource
}

const violationDescs: Record<ViolationType, string[]> = {
  'no-helmet':   ['施工区域未佩戴安全帽', '进入现场未戴安全帽', '安全帽未系紧下颚带'],
  'no-vest':     ['未穿反光背心进入施工区', '反光衣磨损严重未更换'],
  'danger-zone': ['进入塔吊作业禁入区域', '靠近深基坑边缘', '进入吊装作业区'],
  'fire':        ['未办理动火证进行焊接', '焊接区域无灭火器', '易燃物旁吸烟'],
  'height':      ['高处作业未系安全绳', '脚手架作业无防护栏', '未佩戴安全带上高架'],
  'block':       ['材料堆放占用消防通道', '施工道路堵塞', '安全出口被遮挡']
}

function generateViolations(): ViolationRecord[] {
  const rand = seededRandom(101)
  const records: ViolationRecord[] = []
  let idx = 0
  const types = Object.keys(violationTypeMeta) as ViolationType[]
  const statuses: ViolationStatus[] = ['pending', 'processing', 'resolved']

  for (let day = 1; day <= 15; day++) {
    const count = Math.floor(rand() * 3) + 1
    for (let i = 0; i < count; i++) {
      const site = constructionSites[Math.floor(rand() * constructionSites.length)]
      const type = types[Math.floor(rand() * types.length)]
      const descs = violationDescs[type]
      const nameIdx = Math.floor(rand() * workerNames.length)
      records.push({
        id: `v-${idx + 1}`,
        personName: workerNames[nameIdx],
        personAvatar: workerAvatars[nameIdx % 4],
        siteId: site.id,
        siteName: site.name,
        type,
        desc: descs[Math.floor(rand() * descs.length)],
        time: `2026-07-${String(day).padStart(2, '0')} ${String(7 + Math.floor(rand() * 13)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`,
        location: ['工地东门', '施工楼层', '材料堆放区', '塔吊作业区', '基坑边缘'][Math.floor(rand() * 5)],
        status: rand() > 0.3 ? 'resolved' : statuses[Math.floor(rand() * 2)],
        source: rand() > 0.35 ? 'ai' : 'manual'
      })
      idx++
    }
  }
  records.sort((a, b) => b.time.localeCompare(a.time))
  return records
}

export const violationRecords: ViolationRecord[] = generateViolations()

// 违章趋势 + 类型分布构建
export function buildViolationTrend(siteIds: Set<string>) {
  const days = ['07-09', '07-10', '07-11', '07-12', '07-13', '07-14', '07-15']
  return {
    days,
    counts: days.map(d => {
      const dateStr = `2026-${d}`
      return violationRecords.filter(v => siteIds.has(v.siteId) && v.time.startsWith(dateStr)).length
    })
  }
}

export function buildViolationPie(siteIds: Set<string>) {
  const types = Object.keys(violationTypeMeta) as ViolationType[]
  return types.map(t => ({
    name: violationTypeMeta[t].label,
    value: violationRecords.filter(v => siteIds.has(v.siteId) && v.type === t).length,
    itemStyle: { color: violationTypeMeta[t].color }
  })).filter(d => d.value > 0)
}

// ============================================================
// 2. 人员安全事件
// ============================================================
export type SafetyEventType = 'injury' | 'strike' | 'fall' | 'mechanical' | 'shock' | 'collapse'
export type Severity = 'minor' | 'moderate' | 'serious'
export type EventStatus = 'reported' | 'investigating' | 'closed'

export const safetyEventTypeMeta: Record<SafetyEventType, { label: string; icon: string; color: string }> = {
  injury:      { label: '人员受伤',   icon: 'i-ant-design-medicine-box-outlined', color: '#ff4d4f' },
  strike:      { label: '物体打击',   icon: 'i-ant-design-alert-outlined',        color: '#fa541c' },
  fall:        { label: '高处坠落',   icon: 'i-ant-design-fall-outlined',         color: '#fa8c16' },
  mechanical:  { label: '机械伤害',   icon: 'i-ant-design-tool-outlined',         color: '#faad14' },
  shock:       { label: '触电',       icon: 'i-ant-design-thunderbolt-outlined',  color: '#722ed1' },
  collapse:    { label: '坍塌',       icon: 'i-ant-design-warning-outlined',      color: '#ff4d4f' }
}

export const safetyEventTypeOptions = Object.entries(safetyEventTypeMeta).map(([value, meta]) => ({ value: value as SafetyEventType, label: meta.label }))

export const severityMeta: Record<Severity, { label: string; color: string; bg: string }> = {
  minor:     { label: '轻伤', color: '#fa8c16', bg: 'rgba(250,140,22,0.1)' },
  moderate:  { label: '中伤', color: '#fa541c', bg: 'rgba(250,84,28,0.1)' },
  serious:   { label: '重伤', color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)' }
}

export const eventStatusMeta: Record<EventStatus, { label: string; color: string; bg: string }> = {
  reported:      { label: '已上报', color: '#6e4bff', bg: 'rgba(110,75,255,0.1)' },
  investigating: { label: '调查中', color: '#fa8c16', bg: 'rgba(250,140,22,0.1)' },
  closed:        { label: '已结案', color: '#2bb3a3', bg: 'rgba(43,179,163,0.1)' }
}

export interface SafetyEventRecord {
  id: string
  personName: string
  personAvatar: string
  siteId: string
  siteName: string
  type: SafetyEventType
  desc: string
  time: string
  severity: Severity
  status: EventStatus
}

const eventDescs: Record<SafetyEventType, string[]> = {
  injury:     ['搬运材料时手部擦伤', '行走时脚部扭伤', '钢筋划伤手臂'],
  strike:     ['掉落物击中肩部', '材料搬运中碰撞受伤', '塔吊吊物摆动碰伤'],
  fall:       ['脚手架失足跌落', '临边防护处滑倒', '下楼梯踩空'],
  mechanical: ['切割机割伤手指', '搅拌机绞伤', '弯曲机夹伤'],
  shock:      ['临时用电触电', '配电箱漏电触电', '电缆破损触电'],
  collapse:   ['基坑边坡局部坍塌掩埋', '脚手架局部变形', '模板支撑位移']
}

function generateSafetyEvents(): SafetyEventRecord[] {
  const rand = seededRandom(202)
  const records: SafetyEventRecord[] = []
  let idx = 0
  const types = Object.keys(safetyEventTypeMeta) as SafetyEventType[]
  const severities: Severity[] = ['minor', 'moderate', 'serious']
  const statuses: EventStatus[] = ['reported', 'investigating', 'closed']

  for (let day = 1; day <= 20; day++) {
    if (rand() > 0.6) continue
    const site = constructionSites[Math.floor(rand() * constructionSites.length)]
    const type = types[Math.floor(rand() * types.length)]
    const descs = eventDescs[type]
    const nameIdx = Math.floor(rand() * workerNames.length)
    const sevIdx = type === 'fall' || type === 'collapse' ? Math.min(2, Math.floor(rand() * 3)) : Math.floor(rand() * 2)
    records.push({
      id: `se-${idx + 1}`,
      personName: workerNames[nameIdx],
      personAvatar: workerAvatars[nameIdx % 4],
      siteId: site.id,
      siteName: site.name,
      type,
      desc: descs[Math.floor(rand() * descs.length)],
      time: `2026-07-${String(Math.min(day, 13)).padStart(2, '0')} ${String(8 + Math.floor(rand() * 10)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`,
      severity: severities[sevIdx],
      status: rand() > 0.4 ? 'closed' : statuses[Math.floor(rand() * 2)]
    })
    idx++
  }
  records.sort((a, b) => b.time.localeCompare(a.time))
  return records
}

export const safetyEventRecords: SafetyEventRecord[] = generateSafetyEvents()

export function buildEventTrend(siteIds: Set<string>) {
  const days = ['07-09', '07-10', '07-11', '07-12', '07-13', '07-14', '07-15']
  return {
    days,
    counts: days.map(d => {
      const dateStr = `2026-${d}`
      return safetyEventRecords.filter(e => siteIds.has(e.siteId) && e.time.startsWith(dateStr)).length
    })
  }
}

export function buildEventPie(siteIds: Set<string>) {
  const types = Object.keys(safetyEventTypeMeta) as SafetyEventType[]
  return types.map(t => ({
    name: safetyEventTypeMeta[t].label,
    value: safetyEventRecords.filter(e => siteIds.has(e.siteId) && e.type === t).length,
    itemStyle: { color: safetyEventTypeMeta[t].color }
  })).filter(d => d.value > 0)
}

// ============================================================
// 3. 人员进出
// ============================================================
export type AccessDirection = 'in' | 'out'

export const directionMeta: Record<AccessDirection, { label: string; color: string; bg: string; icon: string }> = {
  in:  { label: '进场', color: '#2bb3a3', bg: 'rgba(43,179,163,0.1)', icon: 'i-ant-design-login-outlined' },
  out: { label: '出场', color: '#fa8c16', bg: 'rgba(250,140,22,0.1)', icon: 'i-ant-design-logout-outlined' }
}

export interface AccessRecord {
  id: string
  personName: string
  personAvatar: string
  siteId: string
  siteName: string
  direction: AccessDirection
  time: string
  gate: string
}

const gateNames = ['东门门禁', '南门门禁', '西门门禁', '北门门禁', '主入口通道', '车辆通道']

function generateAccessRecords(): AccessRecord[] {
  const rand = seededRandom(303)
  const records: AccessRecord[] = []
  let idx = 0

  for (let day = 13; day >= 1; day--) {
    const dailyCount = Math.floor(rand() * 4) + 2
    for (let i = 0; i < dailyCount; i++) {
      const site = constructionSites[Math.floor(rand() * constructionSites.length)]
      const nameIdx = Math.floor(rand() * workerNames.length)
      const hour = 6 + Math.floor(rand() * 15)
      records.push({
        id: `ac-${idx + 1}`,
        personName: workerNames[nameIdx],
        personAvatar: workerAvatars[nameIdx % 4],
        siteId: site.id,
        siteName: site.name,
        direction: hour < 14 ? 'in' : 'out',
        time: `2026-07-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`,
        gate: gateNames[Math.floor(rand() * gateNames.length)]
      })
      idx++
    }
  }
  records.sort((a, b) => b.time.localeCompare(a.time))
  return records
}

export const accessRecords: AccessRecord[] = generateAccessRecords()

export function buildAccessTrend(siteIds: Set<string>) {
  const days = ['07-09', '07-10', '07-11', '07-12', '07-13', '07-14', '07-15']
  const dayFiltered = accessRecords.filter(a => siteIds.has(a.siteId))
  return {
    days,
    inCounts: days.map(d => dayFiltered.filter(a => a.direction === 'in' && a.time.includes(`2026-${d}`)).length),
    outCounts: days.map(d => dayFiltered.filter(a => a.direction === 'out' && a.time.includes(`2026-${d}`)).length)
  }
}

export function buildAccessHourBar(siteIds: Set<string>) {
  const hours = ['6时', '8时', '10时', '12时', '14时', '16时', '18时']
  const ranges = [[6, 8], [8, 10], [10, 12], [12, 14], [14, 16], [16, 18], [18, 20]]
  const dayFiltered = accessRecords.filter(a => siteIds.has(a.siteId) && a.time.startsWith('2026-07-13'))
  return {
    hours,
    counts: ranges.map(([s, e]) => dayFiltered.filter(a => {
      const h = parseInt(a.time.substring(11, 13))
      return h >= s && h < e
    }).length)
  }
}

// ============================================================
// 4. 资质证件
// ============================================================
export type CertType = 'special' | 'safety' | 'professional' | 'health' | 'skill'
export type CertStatus = 'valid' | 'expiring' | 'expired'

export const certTypeMeta: Record<CertType, { label: string; icon: string; color: string }> = {
  special:      { label: '特种作业操作证',     icon: 'i-ant-design-safety-certificate-outlined', color: '#6e4bff' },
  safety:       { label: '安全生产考核合格证', icon: 'i-ant-design-shield-outlined',             color: '#2bb3a3' },
  professional: { label: '职业资格证书',       icon: 'i-ant-design-idcard-outlined',             color: '#1890ff' },
  health:       { label: '健康证',             icon: 'i-ant-design-heart-outlined',              color: '#eb2f96' },
  skill:        { label: '技能等级证',         icon: 'i-ant-design-trophy-outlined',             color: '#fa8c16' }
}

export const certTypeOptions = Object.entries(certTypeMeta).map(([value, meta]) => ({ value: value as CertType, label: meta.label }))

export const certStatusMeta: Record<CertStatus, { label: string; color: string; bg: string }> = {
  valid:    { label: '有效',     color: '#2bb3a3', bg: 'rgba(43,179,163,0.1)' },
  expiring: { label: '即将过期', color: '#fa8c16', bg: 'rgba(250,140,22,0.1)' },
  expired:  { label: '已过期',   color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)' }
}

export interface CertRecord {
  id: string
  personName: string
  personAvatar: string
  siteId: string
  siteName: string
  type: CertType
  certNo: string
  issueDate: string
  expireDate: string
  status: CertStatus
}

function getCertStatus(expireDate: string): CertStatus {
  const now = new Date('2026-07-13')
  const expire = new Date(expireDate)
  const diffDays = Math.floor((expire.getTime() - now.getTime()) / 86400000)
  if (diffDays < 0) return 'expired'
  if (diffDays <= 30) return 'expiring'
  return 'valid'
}

function generateCertRecords(): CertRecord[] {
  const rand = seededRandom(404)
  const records: CertRecord[] = []
  const types = Object.keys(certTypeMeta) as CertType[]

  for (const site of constructionSites) {
    const workerCount = site.activePersonnel
    for (let i = 0; i < workerCount; i++) {
      const certCount = Math.floor(rand() * 2) + 1
      for (let c = 0; c < certCount; c++) {
        const type = types[Math.floor(rand() * types.length)]
        const nameIdx = (parseInt(site.id.replace('c', '')) * 7 + i * 3) % workerNames.length
        const issueYear = 2023 + Math.floor(rand() * 3)
        const issueMonth = Math.floor(rand() * 12) + 1
        const issueDay = Math.floor(rand() * 28) + 1
        const validYears = type === 'health' ? 1 : type === 'special' ? 3 : 6
        const issueDate = `${issueYear}-${String(issueMonth).padStart(2, '0')}-${String(issueDay).padStart(2, '0')}`
        const expire = new Date(issueDate)
        expire.setFullYear(expire.getFullYear() + validYears)
        const expireDate = `${expire.getFullYear()}-${String(expire.getMonth() + 1).padStart(2, '0')}-${String(expire.getDate()).padStart(2, '0')}`

        records.push({
          id: `cert-${site.id}-${i}-${c}`,
          personName: workerNames[nameIdx],
          personAvatar: workerAvatars[nameIdx % 4],
          siteId: site.id,
          siteName: site.name,
          type,
          certNo: `${type.toUpperCase()}-${String(issueYear).slice(2)}${String(issueMonth).padStart(2, '0')}${String(1000 + Math.floor(rand() * 9000))}`,
          issueDate,
          expireDate,
          status: getCertStatus(expireDate)
        })
      }
    }
  }
  return records
}

export const certRecords: CertRecord[] = generateCertRecords()

export function buildCertTypePie(siteIds: Set<string>) {
  const types = Object.keys(certTypeMeta) as CertType[]
  const filtered = certRecords.filter(c => siteIds.has(c.siteId))
  return types.map(t => ({
    name: certTypeMeta[t].label,
    value: filtered.filter(c => c.type === t).length,
    itemStyle: { color: certTypeMeta[t].color }
  })).filter(d => d.value > 0)
}

export function buildCertExpiryBar(siteIds: Set<string>) {
  const months = ['已过期', '7月', '8月', '9月', '10月', '11月', '12月+']
  const filtered = certRecords.filter(c => siteIds.has(c.siteId))
  const now = new Date('2026-07-13')
  return {
    months,
    counts: months.map((_, i) => {
      if (i === 0) return filtered.filter(c => c.status === 'expired').length
      if (i === 6) return filtered.filter(c => {
        const diff = (new Date(c.expireDate).getTime() - now.getTime()) / 86400000
        return diff > 150 && c.status !== 'expired'
      }).length
      const monthOffset = i
      return filtered.filter(c => {
        const diff = (new Date(c.expireDate).getTime() - now.getTime()) / 86400000
        return diff > (monthOffset - 1) * 30 && diff <= monthOffset * 30
      }).length
    })
  }
}
