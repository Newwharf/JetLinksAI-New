/**
 * 风险隐患台账 mock 数据
 * 隐患数据模型 + 状态流转 + 元数据
 */
import { constructionSites, siteEventDetails } from './posture.mock'
import eventImg1 from '@/assets/construction/event-1.jpg'
import eventImg2 from '@/assets/construction/event-2.jpg'
import eventImg3 from '@/assets/construction/event-3.jpg'
import eventImg4 from '@/assets/construction/event-4.jpg'

// ===== 状态 =====
export type HazardStatus = 'pending' | 'assessing' | 'rectifying' | 'closed'
export type ReportSource = 'manual' | 'ai'

// ===== 风险等级 =====
export type RiskLevel = 'major' | 'general' | 'minor'

export const riskLevelMeta: Record<RiskLevel, { label: string; color: string; bg: string }> = {
  major:  { label: '重大', color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)' },
  general: { label: '一般', color: '#fa8c16', bg: 'rgba(250,140,22,0.1)' },
  minor:  { label: '轻微', color: '#52c41a', bg: 'rgba(82,196,26,0.1)' }
}

export const riskLevelOptions = [
  { value: 'major', label: '重大' },
  { value: 'general', label: '一般' },
  { value: 'minor', label: '轻微' }
]

// ===== 隐患记录 =====
export interface Hazard {
  id: string
  siteId: string
  siteName: string
  siteAddress: string
  title: string
  description: string
  category: string
  riskLevel: RiskLevel
  location: string
  thumb: string
  reportSource: ReportSource
  reporter: string
  reportTime: string
  status: HazardStatus
  // 评估
  assessResult?: 'valid' | 'invalid'
  assessor?: string
  assessTime?: string
  assessComment?: string
  needRectify: boolean
  // 整改
  rectifier?: string
  rectifyTime?: string
  rectifyComment?: string
  rectifyThumb?: string
}

// ===== 元数据 =====
export const statusMeta: Record<HazardStatus, { label: string; color: string; bg: string; node: string }> = {
  pending:    { label: '待评估', color: '#8c8c8c', bg: 'rgba(140,140,140,0.1)',  node: '待评估' },
  assessing:  { label: '评估中', color: '#1677ff', bg: 'rgba(22,119,255,0.1)',   node: '评估' },
  rectifying: { label: '整改中', color: '#fa8c16', bg: 'rgba(250,140,22,0.1)',   node: '整改' },
  closed:     { label: '已关闭', color: '#52c41a', bg: 'rgba(82,196,26,0.1)',    node: '已结束' }
}

export const sourceMeta: Record<ReportSource, { label: string; icon: string; color: string }> = {
  manual: { label: '人工上报', icon: 'i-ant-design-user-outlined',    color: '#1677ff' },
  ai:     { label: 'AI上报',   icon: 'i-ant-design-robot-outlined',   color: '#722ed1' }
}

export const categoryOptions = [
  { value: '临边防护', label: '临边防护', color: '#fa541c' },
  { value: '临时用电', label: '临时用电', color: '#faad14' },
  { value: '消防安全', label: '消防安全', color: '#ff4d4f' },
  { value: '高处作业', label: '高处作业', color: '#1677ff' },
  { value: '脚手架',   label: '脚手架',   color: '#722ed1' },
  { value: '起重机械', label: '起重机械', color: '#13c2c2' },
  { value: '基坑工程', label: '基坑工程', color: '#eb2f96' },
  { value: '文明施工', label: '文明施工', color: '#52c41a' }
]

export function categoryColor(cat: string): string {
  return categoryOptions.find(c => c.value === cat)?.color || '#6e4bff'
}

// ===== 数据生成 =====
const assessors = ['张安全', '李监理', '王主管', '刘工']
const reporters = ['赵安全', '钱班长', '孙工', '周安全', '吴主管']
const rectifiers = ['郑工', '冯班长', '陈师傅', '褚工']
const eventThumbs = [eventImg1, eventImg2, eventImg3, eventImg4]

const hazardTemplates = [
  { title: '临边防护栏缺失', category: '临边防护', desc: '3F 施工楼层东侧临边防护栏未安装到位，存在坠落风险。' },
  { title: '配电箱未上锁', category: '临时用电', desc: '二层配电箱 AP-03 箱门未锁，非专业人员可触及带电部位。' },
  { title: '灭火器过期', category: '消防安全', desc: '焊接作业区 2 具灭火器已超过有效期，需更换。' },
  { title: '高空作业未系安全绳', category: '高处作业', desc: '5F 外脚手架作业人员未正确系挂安全绳。' },
  { title: '脚手架连墙件缺失', category: '脚手架', desc: '2F 外脚手架第 3 跨连墙件未设置，稳定性不足。' },
  { title: '塔吊限位器故障', category: '起重机械', desc: '1# 塔吊力矩限位器动作不灵敏，需调整。' },
  { title: '基坑周边堆载超限', category: '基坑工程', desc: '基坑北侧 2m 范围内堆放钢筋材料，超过设计荷载。' },
  { title: '施工现场未戴安全帽', category: '文明施工', desc: '工地东门入口处施工人员未佩戴安全帽进入施工区域。' },
  { title: '电缆线随意拖地', category: '临时用电', desc: '一层施工区域电缆线未架空或穿管保护，直接拖地敷设。' },
  { title: '洞口未防护', category: '临边防护', desc: '4F 电梯井口防护门未关闭，存在坠落隐患。' },
  { title: '动火作业无监护', category: '消防安全', desc: '地下车库焊接作业现场无监护人，未配备灭火器材。' },
  { title: '脚手架搭设不规范', category: '脚手架', desc: '3F 外脚手架剪刀撑设置不连续，不符合规范要求。' }
]

const locations = ['1F 施工区', '2F 外脚手架', '3F 楼层边缘', '基坑北侧', '塔吊作业区', '材料堆放区', '焊接作业区', '配电箱 AP-03', '地下车库', '工地东门']

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

function generateHazards(): Hazard[] {
  const hazards: Hazard[] = []
  const rand = seededRandom(42)
  let idx = 0

  // 从事件明细生成隐患
  for (const ev of siteEventDetails) {
    if (ev.type === 'health') continue
    const site = constructionSites.find(s => s.id === ev.siteId)
    if (!site) continue

    const tpl = hazardTemplates[idx % hazardTemplates.length]
    const isAI = rand() > 0.5
    const statusRand = rand()
    let status: HazardStatus
    if (statusRand < 0.2) status = 'pending'
    else if (statusRand < 0.35) status = 'assessing'
    else if (statusRand < 0.6) status = 'rectifying'
    else status = 'closed'

    const levels: RiskLevel[] = ['major', 'general', 'minor']
    const riskLevel = levels[Math.floor(rand() * 3)]

    const hazard: Hazard = {
      id: `hz-${ev.id}`,
      siteId: site.id,
      siteName: site.name,
      siteAddress: site.address,
      title: tpl.title,
      description: tpl.desc,
      category: tpl.category,
      riskLevel,
      location: locations[idx % locations.length],
      thumb: eventThumbs[idx % eventThumbs.length],
      reportSource: isAI ? 'ai' : 'manual',
      reporter: isAI ? 'AI识别' : reporters[idx % reporters.length],
      reportTime: ev.time,
      status,
      needRectify: false
    }

    // 评估信息
    if (status !== 'pending') {
      const valid = rand() > 0.15
      hazard.assessResult = valid ? 'valid' : 'invalid'
      hazard.assessor = assessors[idx % assessors.length]
      hazard.assessTime = `${ev.time.substring(0, 10)} ${String(10 + Math.floor(rand() * 8)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`
      hazard.assessComment = valid ? '经现场核实，隐患属实，需安排整改。' : '经现场核实，该情况不构成安全隐患。'
      hazard.needRectify = valid && rand() > 0.2
    }

    // 整改信息
    if (status === 'rectifying' || (status === 'closed' && hazard.needRectify)) {
      hazard.rectifier = rectifiers[idx % rectifiers.length]
      hazard.rectifyTime = status === 'closed'
        ? `${ev.time.substring(0, 10)} ${String(14 + Math.floor(rand() * 6)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`
        : undefined
      hazard.rectifyComment = status === 'closed' ? '已完成整改，防护设施已恢复，经复查合格。' : undefined
      hazard.rectifyThumb = status === 'closed' ? eventThumbs[(idx + 2) % eventThumbs.length] : undefined
    }

    hazards.push(hazard)
    idx++
  }

  // 额外生成一些隐患
  for (let i = 0; i < 15; i++) {
    const site = constructionSites[Math.floor(rand() * constructionSites.length)]
    const tpl = hazardTemplates[Math.floor(rand() * hazardTemplates.length)]
    const isAI = rand() > 0.5
    const statusRand = rand()
    let status: HazardStatus
    if (statusRand < 0.25) status = 'pending'
    else if (statusRand < 0.4) status = 'assessing'
    else if (statusRand < 0.65) status = 'rectifying'
    else status = 'closed'

    const day = String(5 + Math.floor(rand() * 9)).padStart(2, '0')
    const hour = String(8 + Math.floor(rand() * 10)).padStart(2, '0')
    const minute = String(Math.floor(rand() * 60)).padStart(2, '0')

    const levels2: RiskLevel[] = ['major', 'general', 'minor']
    const riskLevel2 = levels2[Math.floor(rand() * 3)]

    const hazard: Hazard = {
      id: `hz-extra-${i}`,
      siteId: site.id,
      siteName: site.name,
      siteAddress: site.address,
      title: tpl.title,
      description: tpl.desc,
      category: tpl.category,
      riskLevel: riskLevel2,
      location: locations[Math.floor(rand() * locations.length)],
      thumb: eventThumbs[i % eventThumbs.length],
      reportSource: isAI ? 'ai' : 'manual',
      reporter: isAI ? 'AI识别' : reporters[i % reporters.length],
      reportTime: `2026-07-${day} ${hour}:${minute}`,
      status,
      needRectify: false
    }

    if (status !== 'pending') {
      const valid = rand() > 0.15
      hazard.assessResult = valid ? 'valid' : 'invalid'
      hazard.assessor = assessors[i % assessors.length]
      hazard.assessTime = `2026-07-${day} ${String(10 + Math.floor(rand() * 8)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`
      hazard.assessComment = valid ? '经现场核实，隐患属实，需安排整改。' : '经现场核实，该情况不构成安全隐患。'
      hazard.needRectify = valid && rand() > 0.2
    }

    if (status === 'rectifying' || (status === 'closed' && hazard.needRectify)) {
      hazard.rectifier = rectifiers[i % rectifiers.length]
      hazard.rectifyTime = status === 'closed'
        ? `2026-07-${day} ${String(14 + Math.floor(rand() * 6)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`
        : undefined
      hazard.rectifyComment = status === 'closed' ? '已完成整改，经复查合格。' : undefined
      hazard.rectifyThumb = status === 'closed' ? eventThumbs[(i + 2) % eventThumbs.length] : undefined
    }

    hazards.push(hazard)
  }

  // 按时间倒序
  hazards.sort((a, b) => b.reportTime.localeCompare(a.reportTime))
  return hazards
}

export const hazards: Hazard[] = generateHazards()
