/**
 * 事故险肇台账 mock 数据
 * 事故数据模型 + 状态流转 + 元数据
 */
import { constructionSites } from './posture.mock'
import eventImg1 from '@/assets/construction/event-1.jpg'
import eventImg2 from '@/assets/construction/event-2.jpg'
import eventImg3 from '@/assets/construction/event-3.jpg'
import eventImg4 from '@/assets/construction/event-4.jpg'

// ===== 事故等级 =====
export type AccidentLevel = 'major' | 'serious' | 'general' | 'minor'

export const accidentLevelMeta: Record<AccidentLevel, { label: string; color: string; bg: string }> = {
  major:   { label: '特大', color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)' },
  serious: { label: '重大', color: '#fa8c16', bg: 'rgba(250,140,22,0.1)' },
  general: { label: '一般', color: '#1677ff', bg: 'rgba(22,119,255,0.1)' },
  minor:   { label: '轻微', color: '#52c41a', bg: 'rgba(82,196,26,0.1)' }
}

export const accidentLevelOptions = [
  { value: 'major', label: '特大' },
  { value: 'serious', label: '重大' },
  { value: 'general', label: '一般' },
  { value: 'minor', label: '轻微' }
]

// ===== 事故类型 =====
export type AccidentType = 'fall' | 'collapse' | 'fire' | 'electric' | 'mechanical' | 'other'

export const accidentTypeMeta: Record<AccidentType, { label: string; icon: string; color: string }> = {
  fall:        { label: '高处坠落', icon: 'i-ant-design-fall-outlined',       color: '#ff4d4f' },
  collapse:    { label: '坍塌',     icon: 'i-ant-design-build-outlined',       color: '#fa541c' },
  fire:        { label: '火灾',     icon: 'i-ant-design-fire-outlined',        color: '#fa8c16' },
  electric:    { label: '触电',     icon: 'i-ant-design-thunderbolt-outlined', color: '#faad14' },
  mechanical:  { label: '机械伤害', icon: 'i-ant-design-tool-outlined',        color: '#722ed1' },
  other:       { label: '其他',     icon: 'i-ant-design-warning-outlined',     color: '#8c8c8c' }
}

export const accidentTypeOptions = [
  { value: 'fall', label: '高处坠落' },
  { value: 'collapse', label: '坍塌' },
  { value: 'fire', label: '火灾' },
  { value: 'electric', label: '触电' },
  { value: 'mechanical', label: '机械伤害' },
  { value: 'other', label: '其他' }
]

// ===== 事故状态 =====
export type AccidentStatus = 'reported' | 'investigating' | 'rectifying' | 'closed'

export const accidentStatusMeta: Record<AccidentStatus, { label: string; color: string; bg: string }> = {
  reported:      { label: '已上报', color: '#8c8c8c', bg: 'rgba(140,140,140,0.1)' },
  investigating: { label: '调查中', color: '#1677ff', bg: 'rgba(22,119,255,0.1)' },
  rectifying:    { label: '整改中', color: '#fa8c16', bg: 'rgba(250,140,22,0.1)' },
  closed:        { label: '已结案', color: '#52c41a', bg: 'rgba(82,196,26,0.1)' }
}

export const accidentStatusOptions = [
  { value: 'reported', label: '已上报' },
  { value: 'investigating', label: '调查中' },
  { value: 'rectifying', label: '整改中' },
  { value: 'closed', label: '已结案' }
]

// ===== 上报来源 =====
export type ReportSource = 'manual' | 'ai'

export const sourceMeta: Record<ReportSource, { label: string; icon: string; color: string }> = {
  manual: { label: '人工上报', icon: 'i-ant-design-user-outlined',  color: '#1677ff' },
  ai:     { label: 'AI上报',   icon: 'i-ant-design-robot-outlined', color: '#722ed1' }
}

// ===== 事故记录 =====
export interface Accident {
  id: string
  siteId: string
  siteName: string
  siteAddress: string
  title: string
  description: string
  accidentLevel: AccidentLevel
  accidentType: AccidentType
  occurTime: string
  location: string
  thumb: string
  involvedParties: string
  casualties: number
  reportSource: ReportSource
  reporter: string
  status: AccidentStatus
  // 调查
  rootCause?: string
  investigator?: string
  investigateTime?: string
  // 整改预防
  rectifyMeasure?: string
  rectifier?: string
  rectifyTime?: string
  rectifyThumb?: string
  // 复查
  reviewResult?: string
  reviewer?: string
  reviewTime?: string
}

// ===== 数据生成 =====
const investigators = ['张安全', '李监理', '王主管', '刘工']
const rectifiers = ['郑工', '冯班长', '陈师傅', '褚工']
const reviewers = ['赵总工', '钱经理', '孙总监']
const eventThumbs = [eventImg1, eventImg2, eventImg3, eventImg4]

const accidentTemplates = [
  { title: '施工人员高处坠落', type: 'fall' as AccidentType, desc: '一名施工人员在 3F 外脚手架作业时未正确系挂安全绳，不慎坠落至 2F 平台，造成右腿骨折。' },
  { title: '基坑边坡局部坍塌', type: 'collapse' as AccidentType, desc: '基坑北侧边坡在连续降雨后发生局部坍塌，约 5 立方米土方滑落，未造成人员伤亡。' },
  { title: '焊接作业引发火灾', type: 'fire' as AccidentType, desc: '地下车库焊接作业时焊渣引燃周边保温材料，现场人员使用灭火器及时扑灭，未造成重大损失。' },
  { title: '临时用电触电事故', type: 'electric' as AccidentType, desc: '施工人员接触漏电电缆线导致触电，经现场断电急救后送医，轻度电击伤。' },
  { title: '塔吊吊物脱落砸伤', type: 'mechanical' as AccidentType, desc: '塔吊起吊钢筋时绑扎不牢导致部分钢筋脱落，砸伤下方 1 名施工人员腿部。' },
  { title: '脚手架搭设不规范致倒塌', type: 'collapse' as AccidentType, desc: '2F 外脚手架因连墙件不足，在风荷载作用下发生局部倒塌，2 名作业人员轻伤。' },
  { title: '配电箱短路引发火情', type: 'fire' as AccidentType, desc: '配电箱 AP-03 因过载短路产生火花引燃箱体周边杂物，现场及时扑灭。' },
  { title: '切割机操作不当致伤', type: 'mechanical' as AccidentType, desc: '施工人员使用切割机时操作不当，导致手部割伤，缝合 5 针。' },
  { title: '楼层临边坠落事故', type: 'fall' as AccidentType, desc: '4F 楼层临边防护栏缺失，施工人员不慎坠落至 3F，造成腰部挫伤。' },
  { title: '电缆破损导致触电', type: 'electric' as AccidentType, desc: '施工区域电缆线长期拖地磨损导致绝缘层破损，施工人员触碰后触电，经急救脱险。' }
]

const locations = ['1F 施工区', '2F 外脚手架', '3F 楼层边缘', '基坑北侧', '塔吊作业区', '材料堆放区', '焊接作业区', '配电箱 AP-03', '地下车库', '工地东门']
const involvedPartiesList = ['钢筋工 张某', '木工 李某', '塔吊司机 王某', '电焊工 刘某', '混凝土工 赵某', '1# 塔吊', '配电箱 AP-03', '脚手架班组', '切割机', '电缆线']

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function generateAccidents(): Accident[] {
  const accidents: Accident[] = []
  const rand = seededRandom(88)

  for (let i = 0; i < 30; i++) {
    const site = constructionSites[Math.floor(rand() * constructionSites.length)]
    const tpl = accidentTemplates[Math.floor(rand() * accidentTemplates.length)]
    const levels: AccidentLevel[] = ['major', 'serious', 'general', 'minor']
    const levelWeights = [0.05, 0.15, 0.5, 0.3]
    let levelRand = rand()
    let level: AccidentLevel = 'minor'
    for (let li = 0; li < levels.length; li++) {
      levelRand -= levelWeights[li]
      if (levelRand <= 0) { level = levels[li]; break }
    }

    const statusRand = rand()
    let status: AccidentStatus
    if (statusRand < 0.15) status = 'reported'
    else if (statusRand < 0.35) status = 'investigating'
    else if (statusRand < 0.6) status = 'rectifying'
    else status = 'closed'

    const isAI = rand() > 0.5
    // AI 上报的事故初始状态强制为调查中（待人工确认）
    if (isAI && status === 'reported') status = 'investigating'

    const day = String(1 + Math.floor(rand() * 13)).padStart(2, '0')
    const hour = String(8 + Math.floor(rand() * 10)).padStart(2, '0')
    const minute = String(Math.floor(rand() * 60)).padStart(2, '0')

    const accident: Accident = {
      id: `ac-${i}`,
      siteId: site.id,
      siteName: site.name,
      siteAddress: site.address,
      title: tpl.title,
      description: tpl.desc,
      accidentLevel: level,
      accidentType: tpl.type,
      occurTime: `2026-07-${day} ${hour}:${minute}`,
      location: locations[Math.floor(rand() * locations.length)],
      thumb: eventThumbs[i % eventThumbs.length],
      involvedParties: involvedPartiesList[Math.floor(rand() * involvedPartiesList.length)],
      casualties: level === 'major' ? Math.floor(rand() * 3) + 1 : level === 'serious' ? Math.floor(rand() * 2) + 1 : rand() > 0.7 ? 1 : 0,
      reportSource: isAI ? 'ai' : 'manual',
      reporter: isAI ? 'AI识别' : ['赵安全', '钱班长', '孙工', '周安全'][Math.floor(rand() * 4)],
      status
    }

    // 调查信息
    if (status !== 'reported') {
      accident.rootCause = [
        '经调查，事故直接原因为作业人员安全意识不足，未按规定佩戴防护用品。间接原因为现场安全监管不到位。',
        '经调查，事故根因为设备维护不到位，安全装置失效。管理原因为设备巡检制度执行不严格。',
        '经调查，事故原因为临时用电线路老化破损，未及时更换。管理原因为用电安全管理缺失。',
        '经调查，事故根因为脚手架搭设不符合规范，连墙件设置不足。间接原因为验收程序未严格执行。'
      ][Math.floor(rand() * 4)]
      accident.investigator = investigators[Math.floor(rand() * investigators.length)]
      accident.investigateTime = `2026-07-${day} ${String(10 + Math.floor(rand() * 6)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`
    }

    // 整改信息
    if (status === 'rectifying' || status === 'closed') {
      accident.rectifyMeasure = [
        '1. 全面排查类似隐患，更换所有破损电缆线；2. 加强用电安全培训；3. 建立每日巡检制度。',
        '1. 立即修复脚手架连墙件；2. 重新组织脚手架验收；3. 对脚手架作业人员进行专项培训。',
        '1. 更换故障设备安全装置；2. 建立设备定期维护台账；3. 强化设备进场验收制度。',
        '1. 补充临边防护设施；2. 加强高处作业安全监管；3. 严格执行安全用品佩戴检查。'
      ][Math.floor(rand() * 4)]
      accident.rectifier = rectifiers[Math.floor(rand() * rectifiers.length)]
      accident.rectifyTime = status === 'closed'
        ? `2026-07-${day} ${String(14 + Math.floor(rand() * 4)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`
        : undefined
      accident.rectifyThumb = status === 'closed' ? eventThumbs[(i + 2) % eventThumbs.length] : undefined
    }

    // 复查信息
    if (status === 'closed') {
      accident.reviewResult = '整改措施已落实到位，经现场复查合格，同意结案。'
      accident.reviewer = reviewers[Math.floor(rand() * reviewers.length)]
      accident.reviewTime = `2026-07-${day} ${String(16 + Math.floor(rand() * 2)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`
    }

    accidents.push(accident)
  }

  accidents.sort((a, b) => b.occurTime.localeCompare(a.occurTime))
  return accidents
}

export const accidents: Accident[] = generateAccidents()

// ===== 分析聚合数据 =====

// 概览统计
export function getAccidentStats() {
  const total = accidents.length
  const casualties = accidents.reduce((s, a) => s + a.casualties, 0)
  const majorCount = accidents.filter(a => a.accidentLevel === 'major' || a.accidentLevel === 'serious').length
  const unclosedCount = accidents.filter(a => a.status !== 'closed').length
  return { total, casualties, majorCount, unclosedCount }
}

// 未结案事故列表
export function getUnclosedAccidents() {
  return accidents.filter(a => a.status !== 'closed').slice(0, 12)
}

// 趋势数据（按天）
export function getAccidentTrend() {
  const days = ['07-01', '07-02', '07-03', '07-04', '07-05', '07-06', '07-07', '07-08', '07-09', '07-10', '07-11', '07-12', '07-13']
  const data = days.map(d => {
    const dayStr = `2026-${d}`
    return accidents.filter(a => a.occurTime.startsWith(dayStr)).length
  })
  return { days, data }
}

// 等级分布
export function getLevelDistribution() {
  const levels: AccidentLevel[] = ['major', 'serious', 'general', 'minor']
  return levels.map(l => ({
    name: accidentLevelMeta[l].label,
    value: accidents.filter(a => a.accidentLevel === l).length,
    color: accidentLevelMeta[l].color
  }))
}

// 类型分布
export function getTypeDistribution() {
  const types: AccidentType[] = ['fall', 'collapse', 'fire', 'electric', 'mechanical', 'other']
  return types.map(t => ({
    name: accidentTypeMeta[t].label,
    value: accidents.filter(a => a.accidentType === t).length,
    color: accidentTypeMeta[t].color
  }))
}

// 工地分布（按事故数排序，取前8）
export function getSiteDistribution() {
  const map = new Map<string, number>()
  for (const a of accidents) {
    map.set(a.siteName, (map.get(a.siteName) || 0) + 1)
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
}

// 上报来源对比
export function getSourceComparison() {
  return [
    { name: '人工上报', value: accidents.filter(a => a.reportSource === 'manual').length, color: sourceMeta.manual.color },
    { name: 'AI上报', value: accidents.filter(a => a.reportSource === 'ai').length, color: sourceMeta.ai.color }
  ]
}

// 处理状态分布
export function getStatusDistribution() {
  const statuses: AccidentStatus[] = ['reported', 'investigating', 'rectifying', 'closed']
  return statuses.map(s => ({
    name: accidentStatusMeta[s].label,
    value: accidents.filter(a => a.status === s).length,
    color: accidentStatusMeta[s].color
  }))
}
