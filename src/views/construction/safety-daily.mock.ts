/**
 * 工地报告 - 安全日报 mock 数据
 * 安全员每日填写的安全日报台账 + AI 生成辅助
 */
import { constructionSites } from './posture.mock'

// 日报状态
export type DailyStatus = 'draft' | 'submitted'
// 填报来源
export type DailySource = 'manual' | 'ai'

// 安全日报数据模型
export interface SafetyDailyReport {
  id: string
  date: string                    // 报告日期 YYYY-MM-DD
  siteId: string
  siteName: string                // 工地名称
  reporter: string                // 填报人（安全员）
  weather: string                 // 天气
  attendance: number              // 出勤人数
  // 安全检查数据
  hazardCount: number             // 发现隐患数
  resolvedCount: number           // 已整改数
  pendingCount: number            // 待整改数
  inspectionItems: string[]       // 检查项目
  hazardDetail: string            // 隐患情况描述
  rectification: string           // 整改措施
  safetyEducation: string         // 安全教育/交底情况
  accidentRecord: string          // 事故/未遂事件记录
  remark: string                  // 其他说明
  // 元信息
  source: DailySource             // 填报方式
  status: DailyStatus             // 状态
  createdAt: string
}

// 状态展示元信息
export const statusMeta: Record<DailyStatus, { label: string; color: string; bg: string }> = {
  draft: { label: '草稿', color: '#fa8c16', bg: 'rgba(250, 140, 22, 0.1)' },
  submitted: { label: '已提交', color: '#2bb3a3', bg: 'rgba(43, 179, 163, 0.1)' }
}

// 来源展示元信息
export const sourceMeta: Record<DailySource, { label: string; color: string; bg: string; icon: string }> = {
  ai: { label: 'AI生成', color: '#6e4bff', bg: 'rgba(110, 75, 255, 0.1)', icon: 'i-ant-design-thunderbolt-outlined' },
  manual: { label: '人工', color: '#8895ab', bg: 'rgba(136, 149, 171, 0.1)', icon: 'i-ant-design-edit-outlined' }
}

// 检查项目选项
export const inspectionItemOptions = [
  '脚手架', '临时用电', '高处作业', '起重机械', '基坑工程',
  '模板工程', '消防安全', '文明施工', '脚手架安全', '安全防护'
]

// 天气选项
export const weatherOptions = ['晴', '多云', '阴', '小雨', '中雨', '大雨', '雷阵雨']

// 安全员名单
const reporters = ['张安全', '李安全', '王安全', '赵安全']

// 确定性伪随机
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

// 隐患描述模板
const hazardTemplates = [
  '2F 外脚手架连墙件缺失 2 处，已通知架子工班组补装。',
  '配电箱 AP-03 临时线路凌乱，部分电缆未穿管保护。',
  '3F 楼层临边防护栏被拆除未恢复，存在坠落风险。',
  '1# 塔吊钢丝绳局部磨损，需安排检查更换。',
  '基坑北侧边坡位移监测数据略有增大，需持续观测。',
  '工人未正确佩戴安全帽（3 人），已现场纠正。',
  '电焊作业区灭火器配备不足，已补充至 4 具。',
  '5F 高处作业平台未满铺脚手板，已要求整改。',
  '施工道路扬尘较大，已开启雾炮机降尘。',
  '夜间施工照明不足，已增设 LED 灯具。'
]

// 整改措施模板
const rectificationTemplates = [
  '已下发整改通知单，要求当日内完成整改并复查。',
  '已现场督促整改，隐患已消除，复查合格。',
  '已通知相关班组限期 2 天内完成整改，将跟踪复查。',
  '已暂停相关作业，待整改完毕并验收合格后方可复工。',
  '已安排专人跟进，预计明日上午完成整改。'
]

// 安全教育模板
const educationTemplates = [
  '开展了班前安全交底，重点强调高处作业安全规范，参加 32 人。',
  '组织了临时用电安全专项培训，参加 28 人。',
  '进行了脚手架安全使用交底，参加 15 人。',
  '开展了消防安全演练，包括灭火器使用和疏散路线，参加 45 人。',
  '进行了入场安全教育（新人 3 名），已考核合格。'
]

// AI 生成日报（模拟）
export function generateAiDailyReport(siteName: string, date: string): Partial<SafetyDailyReport> {
  const seed = (siteName.length * 100 + date.length * 10 + date.charCodeAt(date.length - 1)) || 1
  const rand = seededRandom(seed)

  const hazardCount = Math.floor(rand() * 6) + 1
  const resolvedCount = Math.floor(rand() * (hazardCount + 1))
  const pendingCount = hazardCount - resolvedCount

  const itemCount = Math.floor(rand() * 3) + 2
  const items = [...inspectionItemOptions]
    .sort(() => rand() - 0.5)
    .slice(0, itemCount)

  const hazardIdx = Math.floor(rand() * hazardTemplates.length)
  const rectIdx = Math.floor(rand() * rectificationTemplates.length)
  const eduIdx = Math.floor(rand() * educationTemplates.length)
  const weather = weatherOptions[Math.floor(rand() * weatherOptions.length)]

  return {
    weather,
    attendance: Math.floor(rand() * 40) + 20,
    hazardCount,
    resolvedCount,
    pendingCount,
    inspectionItems: items,
    hazardDetail: hazardTemplates[hazardIdx],
    rectification: rectificationTemplates[rectIdx],
    safetyEducation: educationTemplates[eduIdx],
    accidentRecord: rand() > 0.85 ? '下午 14:30 一名工人在搬运材料时轻微擦伤，已送医务室处理。' : '无',
    remark: rand() > 0.7 ? '明日计划进行基坑支护验收。' : '',
    source: 'ai'
  }
}

// 生成历史日报数据
function generateReports(): SafetyDailyReport[] {
  const reports: SafetyDailyReport[] = []
  const rand = seededRandom(20260713)

  for (let dayOffset = 0; dayOffset < 15; dayOffset++) {
    const day = 13 - dayOffset
    if (day < 1) break
    const date = `2026-07-${String(day).padStart(2, '0')}`

    // 每天 2~3 个工地有日报
    const siteCount = Math.floor(rand() * 2) + 2
    const usedSites = new Set<number>()
    for (let s = 0; s < siteCount; s++) {
      let siteIdx: number
      do {
        siteIdx = Math.floor(rand() * constructionSites.length)
      } while (usedSites.has(siteIdx))
      usedSites.add(siteIdx)
      const site = constructionSites[siteIdx]

      const hazardCount = Math.floor(rand() * 6) + 1
      const resolvedCount = Math.floor(rand() * (hazardCount + 1))
      const pendingCount = hazardCount - resolvedCount
      const itemCount = Math.floor(rand() * 3) + 2
      const items = [...inspectionItemOptions]
        .sort(() => rand() - 0.5)
        .slice(0, itemCount)
      const hazardIdx = Math.floor(rand() * hazardTemplates.length)
      const rectIdx = Math.floor(rand() * rectificationTemplates.length)
      const eduIdx = Math.floor(rand() * educationTemplates.length)
      const reporter = reporters[Math.floor(rand() * reporters.length)]
      const isAi = rand() > 0.5
      const isDraft = rand() > 0.85

      reports.push({
        id: `sd-${date}-${site.id}`,
        date,
        siteId: site.id,
        siteName: site.name,
        reporter,
        weather: weatherOptions[Math.floor(rand() * weatherOptions.length)],
        attendance: Math.floor(rand() * 40) + 20,
        hazardCount,
        resolvedCount,
        pendingCount,
        inspectionItems: items,
        hazardDetail: hazardTemplates[hazardIdx],
        rectification: rectificationTemplates[rectIdx],
        safetyEducation: educationTemplates[eduIdx],
        accidentRecord: rand() > 0.9 ? '一名工人搬运材料时轻微擦伤，已处理。' : '无',
        remark: rand() > 0.7 ? '次日继续跟踪待整改隐患。' : '',
        source: isAi ? 'ai' : 'manual',
        status: isDraft ? 'draft' : 'submitted',
        createdAt: `${date} ${String(17 + Math.floor(rand() * 3)).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`
      })
    }
  }

  // 按日期倒序
  reports.sort((a, b) => b.date.localeCompare(a.date) || b.siteName.localeCompare(a.siteName))
  return reports
}

export const safetyDailyReports: SafetyDailyReport[] = generateReports()

// 工地选项（用于下拉筛选）
export const siteOptions = constructionSites.map(s => ({ value: s.id, label: s.name }))
