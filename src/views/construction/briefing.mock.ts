/**
 * 班前交底 mock 数据
 * 交底类型 + 状态 + 数据模型 + 生成函数 + AI 生成
 */
import { constructionSites } from './posture.mock'

// ===== 交底类型 =====
export type BriefingType = 'daily' | 'special' | 'seasonal' | 'emergency'

export const briefingTypeMeta: Record<BriefingType, { label: string; icon: string; color: string }> = {
  daily:     { label: '每日班前', icon: 'i-ant-design-sun-outlined',         color: '#6e4bff' },
  special:   { label: '专项交底', icon: 'i-ant-design-flag-outlined',        color: '#1677ff' },
  seasonal:  { label: '季节性交底', icon: 'i-ant-design-cloud-outlined',      color: '#fa8c16' },
  emergency: { label: '应急交底', icon: 'i-ant-design-warning-outlined',     color: '#ff4d4f' }
}

export const briefingTypeOptions = [
  { value: 'daily', label: '每日班前' },
  { value: 'special', label: '专项交底' },
  { value: 'seasonal', label: '季节性交底' },
  { value: 'emergency', label: '应急交底' }
]

// ===== 交底状态 =====
export type BriefingStatus = 'pending' | 'completed' | 'missed'

export const briefingStatusMeta: Record<BriefingStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: '待交底', color: '#fa8c16', bg: 'rgba(250,140,22,0.1)' },
  completed: { label: '已交底', color: '#52c41a', bg: 'rgba(82,196,26,0.1)' },
  missed:    { label: '缺交',   color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)' }
}

export const briefingStatusOptions = [
  { value: 'pending', label: '待交底' },
  { value: 'completed', label: '已交底' },
  { value: 'missed', label: '缺交' }
]

// ===== 关键风险点选项 =====
export const keyRiskOptions = [
  '高处坠落', '物体打击', '机械伤害', '触电事故', '坍塌事故',
  '火灾爆炸', '中毒窒息', '起重伤害', '车辆伤害', '高温中暑'
]

// ===== 劳保用品检查项 =====
export const ppeCheckOptions = [
  '安全帽', '安全带', '反光背心', '防护眼镜', '防护手套',
  '防滑鞋', '防尘口罩', '绝缘鞋', '焊接面罩', '听力防护'
]

// 天气选项
export const weatherOptions = ['晴', '多云', '阴', '小雨', '中雨', '大雨', '雷阵雨', '高温']

// 交底人名单
const briefers = ['张安全', '李安全', '王安全', '赵安全', '陈安全', '刘安全']

// 确定性伪随机
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// 交底主题模板
const topicTemplates: Record<BriefingType, string[]> = {
  daily: [
    '今日施工作业安全交底',
    '班前安全交底——高处作业注意事项',
    '班前安全交底——临时用电安全',
    '班前安全交底——脚手架作业规范',
    '班前安全交底——起重吊装安全'
  ],
  special: [
    '深基坑施工专项安全交底',
    '塔吊安装与拆卸专项交底',
    '动火作业专项安全交底',
    '大体积混凝土浇筑专项交底',
    '高处作业平台专项安全交底',
    '有限空间作业专项安全交底'
  ],
  seasonal: [
    '夏季高温施工安全交底',
    '雨季施工安全交底',
    '冬季防冻防滑安全交底',
    '台风季节安全交底',
    '汛期施工安全交底'
  ],
  emergency: [
    '突发火灾应急疏散交底',
    '塔吊故障应急处置交底',
    '基坑坍塌应急预案交底',
    '触电事故应急处置交底'
  ]
}

// 交底内容模板
const contentTemplates: Record<BriefingType, string[]> = {
  daily: [
    '1. 进入施工现场必须正确佩戴安全帽，系好下颚带；2. 高处作业人员必须系挂安全带，做到"高挂低用"；3. 严禁酒后上岗、疲劳作业；4. 施工区域禁止吸烟，动火需办理许可证；5. 注意防滑防跌，行走时注意脚下孔洞和临边。',
    '1. 临时用电必须由专业电工操作，非电工不得私自接线；2. 配电箱必须上锁，做到"一机一闸一漏一箱"；3. 电缆线应架空或穿管保护，严禁拖地或浸水；4. 使用电动工具前检查绝缘和漏电保护；5. 发现漏电跳闸必须排查原因后再送电。',
    '1. 脚手架搭设必须按方案执行，杆件间距符合规范；2. 连墙件必须随施工进度同步设置，严禁擅自拆除；3. 脚手板必须满铺并固定，不得有探头板；4. 操作层必须设置挡脚板和防护栏杆；5. 恶劣天气后应检查脚手架稳定性方可使用。'
  ],
  special: [
    '1. 深基坑施工前必须进行安全技术交底，了解地质条件和支护方案；2. 基坑边缘 1.5m 范围内严禁堆载；3. 基坑内必须设置安全通道和应急爬梯；4. 每日检查支护结构和排水设施；5. 发现异常变形立即撤离并上报。',
    '1. 塔吊安装/拆卸必须由专业队伍操作，持证上岗；2. 安装前检查基础混凝土强度和预埋件；3. 风力 6 级以上禁止安装/拆卸作业；4. 各连接螺栓必须按规定力矩紧固；5. 安装完成后必须经检测合格方可使用。'
  ],
  seasonal: [
    '1. 合理安排作息时间，避开高温时段（11:00-15:00）室外作业；2. 现场配备防暑降温药品和清凉饮料；3. 出现头晕、恶心等中暑症状立即到阴凉处休息；4. 加强通风，密闭空间作业注意空气流通；5. 注意饮食卫生，防止肠道疾病。',
    '1. 雨季施工注意防滑防跌，走道和操作平台保持干燥；2. 电气设备做好防雨措施，雨天禁止露天用电作业；3. 基坑和边坡加强排水和监测；4. 脚手架和塔吊雨后检查稳定性；5. 雷雨天气停止室外高处作业。'
  ],
  emergency: [
    '1. 发现火情立即大声呼救并按下报警按钮；2. 初起火灾可用灭火器扑救，火势大时立即撤离；3. 撤离时沿安全通道低姿前行，用湿毛巾捂住口鼻；4. 到达集结点后清点人数，报告指挥部；5. 严禁使用电梯逃生。',
    '1. 发生触电事故立即切断电源或用绝缘物挑开电线；2. 严禁徒手拉拽触电者；3. 伤员脱离电源后立即进行心肺复苏；4. 同时拨打 120 急救电话；5. 保护现场，等待事故调查。'
  ]
}

// 缺勤说明模板
const absentTemplates = [
  '1 人请假就医，已安排补交底。',
  '2 人迟到，到场后单独交底。',
  '1 人事假，已通知班组长安排补课。',
  '全员到齐，无缺勤。',
  '1 人调休，次日补交底。'
]

// AI 生成交底（模拟）
export function generateAiBriefing(siteName: string, date: string): Partial<BriefingRecord> {
  const seed = (siteName.length * 100 + date.length * 10 + date.charCodeAt(date.length - 1)) || 1
  const rand = seededRandom(seed)

  const type: BriefingType = rand() > 0.7 ? 'special' : 'daily'
  const topics = topicTemplates[type]
  const contents = contentTemplates[type]
  const requiredCount = Math.floor(rand() * 30) + 15
  const actualCount = requiredCount - Math.floor(rand() * 4)
  const riskCount = Math.floor(rand() * 3) + 2
  const ppeCount = Math.floor(rand() * 3) + 3

  return {
    type,
    weather: weatherOptions[Math.floor(rand() * 5)],
    topic: topics[Math.floor(rand() * topics.length)],
    content: contents[Math.floor(rand() * contents.length)],
    fullContent: contents[Math.floor(rand() * contents.length)],
    requiredCount,
    actualCount,
    keyRisks: [...keyRiskOptions].sort(() => rand() - 0.5).slice(0, riskCount),
    ppeChecks: [...ppeCheckOptions].sort(() => rand() - 0.5).slice(0, ppeCount),
    absentees: actualCount < requiredCount ? [`${requiredCount - actualCount} 人请假/迟到`] : [],
    status: 'completed',
    source: 'ai'
  }
}

// ===== 交底记录数据模型 =====
export type BriefingSource = 'manual' | 'ai'

export const briefingSourceMeta: Record<BriefingSource, { label: string; color: string; bg: string; icon: string }> = {
  ai:     { label: 'AI生成', color: '#6e4bff', bg: 'rgba(110,75,255,0.1)', icon: 'i-ant-design-thunderbolt-outlined' },
  manual: { label: '人工',   color: '#8895ab', bg: 'rgba(136,149,171,0.1)', icon: 'i-ant-design-edit-outlined' }
}

export interface BriefingRecord {
  id: string
  date: string                    // 交底日期 YYYY-MM-DD
  siteId: string
  siteName: string
  briefer: string                 // 交底人
  type: BriefingType              // 交底类型
  topic: string                   // 交底主题
  content: string                 // 交底内容摘要
  fullContent: string             // 完整交底内容
  requiredCount: number           // 应到人数
  actualCount: number             // 实到人数
  absentees: string[]             // 缺勤说明
  weather: string
  keyRisks: string[]              // 关键风险点
  ppeChecks: string[]             // 劳保检查项
  status: BriefingStatus
  source: BriefingSource
  createdAt: string
}

// 生成历史交底数据
function generateBriefings(): BriefingRecord[] {
  const records: BriefingRecord[] = []
  const rand = seededRandom(20260713)

  for (let dayOffset = 0; dayOffset < 15; dayOffset++) {
    const day = 13 - dayOffset
    if (day < 1) break
    const date = `2026-07-${String(day).padStart(2, '0')}`

    // 每天 3~5 个工地有交底记录
    const siteCount = Math.floor(rand() * 3) + 3
    const usedSites = new Set<number>()
    for (let s = 0; s < siteCount; s++) {
      let siteIdx: number
      do {
        siteIdx = Math.floor(rand() * constructionSites.length)
      } while (usedSites.has(siteIdx))
      usedSites.add(siteIdx)
      const site = constructionSites[siteIdx]

      // 类型权重：daily 70%, special 18%, seasonal 8%, emergency 4%
      const typeRoll = rand()
      const type: BriefingType =
        typeRoll < 0.7 ? 'daily' :
        typeRoll < 0.88 ? 'special' :
        typeRoll < 0.96 ? 'seasonal' : 'emergency'

      const topics = topicTemplates[type]
      const contents = contentTemplates[type]
      const requiredCount = Math.floor(rand() * 35) + 12
      const actualCount = requiredCount - Math.floor(rand() * 5)
      const riskCount = Math.floor(rand() * 3) + 2
      const ppeCount = Math.floor(rand() * 3) + 3

      // 状态权重：completed 82%, pending 12%, missed 6%
      const statusRoll = rand()
      const status: BriefingStatus =
        statusRoll < 0.82 ? 'completed' :
        statusRoll < 0.94 ? 'pending' : 'missed'

      const isAi = rand() > 0.55
      const briefer = briefers[Math.floor(rand() * briefers.length)]

      records.push({
        id: `bf-${date}-${site.id}`,
        date,
        siteId: site.id,
        siteName: site.name,
        briefer,
        type,
        topic: topics[Math.floor(rand() * topics.length)],
        content: contents[Math.floor(rand() * contents.length)],
        fullContent: contents[Math.floor(rand() * contents.length)],
        requiredCount,
        actualCount: status === 'missed' ? 0 : actualCount,
        absentees: actualCount < requiredCount && status === 'completed'
          ? [absentTemplates[Math.floor(rand() * absentTemplates.length)]]
          : [],
        weather: weatherOptions[Math.floor(rand() * 5)],
        keyRisks: [...keyRiskOptions].sort(() => rand() - 0.5).slice(0, riskCount),
        ppeChecks: [...ppeCheckOptions].sort(() => rand() - 0.5).slice(0, ppeCount),
        status,
        source: isAi ? 'ai' : 'manual',
        createdAt: `${date} ${String(7 + Math.floor(rand() * 2)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`
      })
    }
  }

  // 按日期倒序
  records.sort((a, b) => b.date.localeCompare(a.date) || b.siteName.localeCompare(a.siteName))
  return records
}

export const briefingRecords: BriefingRecord[] = generateBriefings()

// 工地选项（用于下拉筛选）
export const siteOptions = constructionSites.map(s => ({ value: s.id, label: s.name }))

// ===== 总览统计函数 =====
export function buildBriefingOverviewMetrics(siteIds: Set<string>) {
  const today = '2026-07-13'
  const list = briefingRecords.filter(r => siteIds.has(r.siteId))
  const todayList = list.filter(r => r.date === today)
  const weekList = list.filter(r => r.date >= '2026-07-07' && r.date <= today)

  const required = constructionSites.filter(s => siteIds.has(s.id)).length
  const completed = todayList.filter(r => r.status === 'completed').length
  const missed = weekList.filter(r => r.status === 'missed').length
  const weekRate = weekList.length > 0
    ? Math.round(weekList.filter(r => r.status === 'completed').length / weekList.length * 100)
    : 0

  return {
    todayRequired: required,
    todayCompleted: completed,
    weekRate,
    missedCount: missed
  }
}

export function buildBriefingTrend(siteIds: Set<string>) {
  const list = briefingRecords.filter(r => siteIds.has(r.siteId))
  const days: string[] = []
  const requiredCounts: number[] = []
  const completedCounts: number[] = []

  for (let i = 6; i >= 0; i--) {
    const day = 13 - i
    if (day < 1) continue
    const date = `2026-07-${String(day).padStart(2, '0')}`
    const dayList = list.filter(r => r.date === date)
    days.push(date.substring(5))
    requiredCounts.push(constructionSites.filter(s => siteIds.has(s.id)).length)
    completedCounts.push(dayList.filter(r => r.status === 'completed').length)
  }

  return { days, requiredCounts, completedCounts }
}

export function buildBriefingTypePie(siteIds: Set<string>) {
  const list = briefingRecords.filter(r => siteIds.has(r.siteId))
  const types: BriefingType[] = ['daily', 'special', 'seasonal', 'emergency']
  return types.map(t => ({
    name: briefingTypeMeta[t].label,
    value: list.filter(r => r.type === t).length
  })).filter(d => d.value > 0)
}
