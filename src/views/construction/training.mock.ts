/**
 * 安全培训 mock 数据
 * 培训类型 + 状态 + 数据模型 + 生成函数 + AI 生成
 */
import { constructionSites } from './posture.mock'

// ===== 培训类型 =====
export type TrainingType = 'induction' | 'special' | 'regular' | 'drill'

export const trainingTypeMeta: Record<TrainingType, { label: string; icon: string; color: string }> = {
  induction: { label: '入场培训',   icon: 'i-ant-design-safety-certificate-outlined', color: '#6e4bff' },
  special:   { label: '专项培训',   icon: 'i-ant-design-book-outlined',                color: '#1677ff' },
  regular:   { label: '日常培训',   icon: 'i-ant-design-read-outlined',                color: '#2bb3a3' },
  drill:     { label: '应急演练',   icon: 'i-ant-design-alert-outlined',               color: '#ff4d4f' }
}

export const trainingTypeOptions = [
  { value: 'induction', label: '入场培训' },
  { value: 'special', label: '专项培训' },
  { value: 'regular', label: '日常培训' },
  { value: 'drill', label: '应急演练' }
]

// ===== 培训状态 =====
export type TrainingStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled'

export const trainingStatusMeta: Record<TrainingStatus, { label: string; color: string; bg: string }> = {
  planned:   { label: '待开始', color: '#8c8c8c', bg: 'rgba(140,140,140,0.1)' },
  ongoing:   { label: '进行中', color: '#1677ff', bg: 'rgba(22,119,255,0.1)' },
  completed: { label: '已完成', color: '#52c41a', bg: 'rgba(82,196,26,0.1)' },
  cancelled: { label: '已取消', color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)' }
}

export const trainingStatusOptions = [
  { value: 'planned', label: '待开始' },
  { value: 'ongoing', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' }
]

// 培训讲师名单
const trainers = ['张安全', '李安全', '王安全', '赵安全', '陈安全', '刘安全', '周安全', '吴安全']

// 培训地点
const locations = ['项目部会议室', '工地安全体验区', '施工现场培训点', '工人生活区培训室', '项目多功能厅']

// 确定性伪随机
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// 培训主题模板
const titleTemplates: Record<TrainingType, string[]> = {
  induction: [
    '新入场工人三级安全教育',
    '新员工入场安全培训',
    '新进场班组安全教育',
    '管理人员入场安全培训'
  ],
  special: [
    '高处作业安全专项培训',
    '临时用电安全专项培训',
    '起重吊装作业专项培训',
    '脚手架搭设安全专项培训',
    '深基坑施工安全专项培训',
    '动火作业安全专项培训',
    '有限空间作业安全专项培训'
  ],
  regular: [
    '本月安全例会培训',
    '每周安全晨会教育',
    '劳动防护用品正确使用培训',
    '施工现场安全文明规范培训',
    '机械设备安全操作规程培训'
  ],
  drill: [
    '消防应急疏散演练',
    '高处坠落应急救援演练',
    '触电事故应急处置演练',
    '基坑坍塌应急疏散演练',
    '塔吊故障应急处置演练'
  ]
}

// 培训内容模板
const contentTemplates: Record<TrainingType, string[]> = {
  induction: [
    '1. 国家安全生产法律法规及企业安全管理制度；2. 施工现场危险源辨识与风险防控；3. 安全防护用品的正确使用方法；4. 施工现场安全注意事项及禁止行为；5. 应急处置流程与逃生路线；6. 典型事故案例分析。',
    '1. 公司级安全教育：企业安全文化与管理体系；2. 项目级安全教育：项目特点与安全风险；3. 班组级安全教育：岗位安全操作规程；4. 安全防护用品使用演示；5. 考核与签字确认。'
  ],
  special: [
    '1. 高处作业定义与分级标准；2. 高处作业安全防护设施要求；3. 安全带的正确使用与系挂方法；4. 脚手架和操作平台安全要求；5. 高处作业禁止行为；6. 高处坠落事故案例与原因分析。',
    '1. 临时用电管理基本要求；2. 配电系统"三级配电两级保护"原则；3. 漏电保护器的选择与使用；4. 电动工具安全操作规程；5. 触电急救方法；6. 临时用电常见隐患与整改。'
  ],
  regular: [
    '1. 本周安全隐患排查情况通报；2. 典型违章行为分析与纠正；3. 安全操作规程复习；4. 防护用品使用检查；5. 下周重点作业安全注意事项。',
    '1. 安全帽、安全带、反光背心等防护用品检查标准；2. 防护用品更换周期与判废标准；3. 正确佩戴方法演示；4. 常见使用错误纠正；5. 现场实操考核。'
  ],
  drill: [
    '1. 火灾报警与初期扑救流程；2. 疏散路线与集合点确认；3. 灭火器实操演练；4. 伤员搜救与转运；5. 演练总结与改进措施。',
    '1. 高处坠落事故应急处置流程；2. 现场急救包扎与固定技术；3. 伤员搬运注意事项；4. 120 急救联动演练；5. 演练效果评估。'
  ]
}

// 考核情况模板
const examTemplates = [
  '采用笔试+实操考核，全员通过。',
  '笔试考核，合格率 95%，不合格 1 人已安排补考。',
  '现场问答+实操演示，全部合格。',
  '笔试 50 分 + 实操 50 分，通过率 92%。',
  '本次培训为演练，不设考核。'
]

// AI 生成培训（模拟）
export function generateAiTraining(siteName: string, type: TrainingType): Partial<TrainingRecord> {
  const seed = (siteName.length * 100 + type.length * 10 + siteName.charCodeAt(siteName.length - 1)) || 1
  const rand = seededRandom(seed)

  const titles = titleTemplates[type]
  const contents = contentTemplates[type]
  const requiredCount = Math.floor(rand() * 30) + 15
  const actualCount = requiredCount - Math.floor(rand() * 5)
  const examPassed = type === 'drill' ? actualCount : Math.floor(actualCount * (0.85 + rand() * 0.15))
  const passRate = actualCount > 0 ? Math.round(examPassed / actualCount * 100) : 100

  return {
    type,
    title: titles[Math.floor(rand() * titles.length)],
    content: contents[Math.floor(rand() * contents.length)],
    trainer: trainers[Math.floor(rand() * trainers.length)],
    duration: type === 'induction' ? 8 : type === 'drill' ? 2 : Math.floor(rand() * 3) + 1,
    location: locations[Math.floor(rand() * locations.length)],
    requiredCount,
    actualCount,
    examPassed,
    examFailed: actualCount - examPassed,
    passRate,
    status: 'planned',
    source: 'ai'
  }
}

// ===== 培训记录数据模型 =====
export type TrainingSource = 'manual' | 'ai'

export const trainingSourceMeta: Record<TrainingSource, { label: string; color: string; bg: string; icon: string }> = {
  ai:     { label: 'AI生成', color: '#6e4bff', bg: 'rgba(110,75,255,0.1)', icon: 'i-ant-design-thunderbolt-outlined' },
  manual: { label: '人工',   color: '#8895ab', bg: 'rgba(136,149,171,0.1)', icon: 'i-ant-design-edit-outlined' }
}

export interface TrainingRecord {
  id: string
  date: string                    // 培训日期 YYYY-MM-DD
  siteId: string
  siteName: string
  title: string                   // 培训主题
  type: TrainingType              // 培训类型
  trainer: string                 // 培训讲师
  duration: number                // 培训时长(小时)
  location: string                // 培训地点
  requiredCount: number           // 应到人数
  actualCount: number             // 实到人数
  examPassed: number              // 考核通过人数
  examFailed: number              // 未通过人数
  passRate: number                // 通过率(%)
  content: string                 // 培训内容摘要
  examResult: string              // 考核情况
  remark: string                  // 备注
  status: TrainingStatus
  source: TrainingSource
  createdAt: string
}

// 生成历史培训数据
function generateTrainings(): TrainingRecord[] {
  const records: TrainingRecord[] = []
  const rand = seededRandom(20260713)

  // 生成近 6 个月数据，每月 5~8 条
  const months: { year: number; month: number }[] = []
  let m = 7, y = 2026
  for (let i = 0; i < 6; i++) {
    months.push({ year: y, month: m })
    m--
    if (m < 1) { m = 12; y-- }
  }

  let idCounter = 0
  for (const { year, month } of months.reverse()) {
    const count = Math.floor(rand() * 4) + 5
    for (let i = 0; i < count; i++) {
      idCounter++
      const site = constructionSites[Math.floor(rand() * constructionSites.length)]
      const day = Math.floor(rand() * 28) + 1
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      // 类型权重：regular 40%, induction 25%, special 25%, drill 10%
      const typeRoll = rand()
      const type: TrainingType =
        typeRoll < 0.4 ? 'regular' :
        typeRoll < 0.65 ? 'induction' :
        typeRoll < 0.9 ? 'special' : 'drill'

      const titles = titleTemplates[type]
      const contents = contentTemplates[type]
      const requiredCount = Math.floor(rand() * 30) + 12
      const actualCount = requiredCount - Math.floor(rand() * 5)
      const examPassed = type === 'drill' ? actualCount : Math.floor(actualCount * (0.82 + rand() * 0.18))
      const passRate = actualCount > 0 ? Math.round(examPassed / actualCount * 100) : 100

      // 状态：7月数据有 planned/ongoing，历史月全 completed
      const isCurrentMonth = year === 2026 && month === 7
      let status: TrainingStatus
      if (isCurrentMonth) {
        const sRoll = rand()
        status = sRoll < 0.35 ? 'planned' : sRoll < 0.45 ? 'ongoing' : sRoll < 0.5 ? 'cancelled' : 'completed'
      } else {
        status = rand() > 0.95 ? 'cancelled' : 'completed'
      }

      const isAi = rand() > 0.55

      records.push({
        id: `tr-${idCounter}`,
        date,
        siteId: site.id,
        siteName: site.name,
        title: titles[Math.floor(rand() * titles.length)],
        type,
        trainer: trainers[Math.floor(rand() * trainers.length)],
        duration: type === 'induction' ? 8 : type === 'drill' ? 2 : Math.floor(rand() * 3) + 1,
        location: locations[Math.floor(rand() * locations.length)],
        requiredCount,
        actualCount: status === 'planned' || status === 'cancelled' ? 0 : actualCount,
        examPassed: status === 'completed' ? examPassed : 0,
        examFailed: status === 'completed' ? actualCount - examPassed : 0,
        passRate: status === 'completed' ? passRate : 0,
        content: contents[Math.floor(rand() * contents.length)],
        examResult: status === 'completed' ? examTemplates[Math.floor(rand() * examTemplates.length)] : '',
        remark: rand() > 0.7 ? '培训资料已归档，签到表已签字确认。' : '',
        status,
        source: isAi ? 'ai' : 'manual',
        createdAt: `${date} ${String(9 + Math.floor(rand() * 4)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`
      })
    }
  }

  // 按日期倒序
  records.sort((a, b) => b.date.localeCompare(a.date))
  return records
}

export const trainingRecords: TrainingRecord[] = generateTrainings()

// 工地选项（用于下拉筛选）
export const siteOptions = constructionSites.map(s => ({ value: s.id, label: s.name }))

// ===== 总览统计函数 =====
export function buildTrainingOverviewMetrics(siteIds: Set<string>) {
  const list = trainingRecords.filter(r => siteIds.has(r.siteId))
  const monthList = list.filter(r => r.date.startsWith('2026-07'))

  const planned = monthList.filter(r => r.status === 'planned').length
  const ongoing = monthList.filter(r => r.status === 'ongoing').length
  const completed = monthList.filter(r => r.status === 'completed').length
  const totalPersons = monthList.filter(r => r.status === 'completed').reduce((s, r) => s + r.actualCount, 0)

  return {
    monthPlanned: planned + ongoing + completed,
    completed,
    ongoing,
    planned,
    totalPersons
  }
}

export function buildTrainingTrend(siteIds: Set<string>) {
  const list = trainingRecords.filter(r => siteIds.has(r.siteId))
  const months: string[] = []
  const plannedCounts: number[] = []
  const completedCounts: number[] = []

  let m = 7, y = 2026
  const monthList: { year: number; month: number; label: string }[] = []
  for (let i = 0; i < 6; i++) {
    monthList.push({ year: y, month: m, label: `${m}月` })
    m--
    if (m < 1) { m = 12; y-- }
  }
  monthList.reverse()

  for (const { year, month, label } of monthList) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    const monthData = list.filter(r => r.date.startsWith(prefix))
    months.push(label)
    plannedCounts.push(monthData.length)
    completedCounts.push(monthData.filter(r => r.status === 'completed').length)
  }

  return { months, plannedCounts, completedCounts }
}

export function buildTrainingTypePie(siteIds: Set<string>) {
  const list = trainingRecords.filter(r => siteIds.has(r.siteId))
  const types: TrainingType[] = ['induction', 'special', 'regular', 'drill']
  return types.map(t => ({
    name: trainingTypeMeta[t].label,
    value: list.filter(r => r.type === t).length
  })).filter(d => d.value > 0)
}
