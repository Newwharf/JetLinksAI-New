/**
 * 工地安全 - 历史安全事件 mock 数据
 * 基于 posture.mock 的工地数据，生成历史安全事件列表
 */
import {
  constructionSites,
  siteEventDetails,
  eventMeta,
  type EventType
} from './posture.mock'

// 解除状态
export type ResolveStatus = 'resolved' | 'unresolved'
// 解除方式
export type ResolveMethod = 'auto' | 'manual' | 'expired'

// 历史安全事件（列表行模型）
export interface HistoryIncident {
  id: string
  /** 工地 id */
  siteId: string
  /** 工地名称 */
  siteName: string
  /** 工地地址 */
  siteAddress: string
  /** 事件类型 */
  type: EventType
  /** 事件描述（标题） */
  description: string
  /** 事件详情 */
  detail: string
  /** 事件位置/设备 */
  location: string
  /** 发生时间 */
  occurTime: string
  /** 解除时间（未解除为空字符串） */
  resolveTime: string
  /** 解除状态 */
  status: ResolveStatus
  /** 解除方式 */
  resolveMethod: ResolveMethod
  /** 事件截图 */
  thumb: string
}

// 解除状态 → 展示信息
export const statusMeta: Record<ResolveStatus, { label: string; color: string; bg: string }> = {
  resolved: { label: '已解除', color: '#52c41a', bg: 'rgba(82, 196, 26, 0.1)' },
  unresolved: { label: '未解除', color: '#ff4d4f', bg: 'rgba(255, 77, 79, 0.1)' }
}

// 解除方式 → 展示信息
export const resolveMethodMeta: Record<ResolveMethod, { label: string; icon: string }> = {
  auto: { label: '自动解除', icon: 'i-ant-design-thunderbolt-outlined' },
  manual: { label: '人工解除', icon: 'i-ant-design-user-outlined' },
  expired: { label: '超时解除', icon: 'i-ant-design-clock-circle-outlined' }
}

// 历史安全事件只涉及安全类事件类型（不含设备健康异常）
const validEventTypes: EventType[] = ['safety', 'risk', 'alert']

// ===== 生成历史安全事件列表 =====
// 确定性伪随机
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const resolveMethods: ResolveMethod[] = ['auto', 'manual', 'expired']

function generateIncidents(): HistoryIncident[] {
  const incidents: HistoryIncident[] = []
  const rand = seededRandom(42)

  // 基于 siteEventDetails 构建，补充解除时间和状态（过滤掉设备健康异常）
  for (const ev of siteEventDetails) {
    if (!validEventTypes.includes(ev.type)) continue
    const site = constructionSites.find(s => s.id === ev.siteId)
    if (!site) continue

    // 80% 已解除，20% 未解除
    const isResolved = rand() > 0.2
    const status: ResolveStatus = isResolved ? 'resolved' : 'unresolved'

    // 发生时间解析（来自 posture.mock 的 "2026-07-DD HH:mm" 格式）
    const occurTime = ev.time

    // 解除时间：发生时间后 3~120 分钟
    let resolveTime = ''
    if (isResolved) {
      const date = new Date(`2026-${occurTime.substring(5)}`)
      date.setMinutes(date.getMinutes() + Math.floor(rand() * 117) + 3)
      resolveTime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    const method: ResolveMethod = resolveMethods[Math.floor(rand() * resolveMethods.length)]

    incidents.push({
      id: ev.id,
      siteId: ev.siteId,
      siteName: site.name,
      siteAddress: site.address,
      type: ev.type,
      description: ev.title,
      detail: ev.desc,
      location: ev.location,
      occurTime,
      resolveTime,
      status,
      resolveMethod: isResolved ? method : 'expired',
      thumb: ev.thumb
    })
  }

  // 补充更多历史事件（跨工地、跨时间），让分页有足够数据
  const extraTemplates = [
    { type: 'safety' as EventType, desc: '人员未戴安全帽', detail: 'AI 识别到施工人员进入施工区域未佩戴安全帽，持续 5 分钟。', location: '工地东门入口' },
    { type: 'risk' as EventType, desc: '脚手架倾斜风险', detail: '脚手架垂直度偏差超过允许值，存在坍塌风险。', location: '2F 外脚手架' },
    { type: 'alert' as EventType, desc: '配电箱温度报警', detail: '配电箱内温度超过 65°C，可能存在过热故障。', location: '配电箱 AP-05' },
    { type: 'safety' as EventType, desc: '违规动火作业', detail: '未办理动火许可证进行焊接作业，现场无监护人员。', location: '地下车库焊接区' },
    { type: 'risk' as EventType, desc: '基坑变形超限', detail: '基坑支护结构位移监测值超出预警阈值，需加强观测。', location: '深基坑北侧' },
    { type: 'alert' as EventType, desc: '烟雾报警', detail: '焊接作业区烟感探测器触发报警，请现场确认。', location: '焊接作业区烟感探测器' },
    { type: 'safety' as EventType, desc: '临边防护缺失', detail: '检测到楼层临边防护栏未安装到位，有坠落风险。', location: '3F 楼层边缘' },
    { type: 'risk' as EventType, desc: '临时用电过载', detail: '临时用电回路电流持续偏高，接近开关额定容量。', location: '配电箱 AP-03' },
    { type: 'alert' as EventType, desc: '水位超限报警', detail: '基坑集水坑水位达到高限报警值，请启动排水泵。', location: '集水坑液位计' },
    { type: 'safety' as EventType, desc: '高空抛物', detail: '检测到高空抛物行为，可能造成下方人员伤害。', location: '5F 施工楼层' }
  ]

  let extraIdx = 0
  for (let dayOffset = 8; dayOffset <= 30; dayOffset++) {
    // 每天 0~3 条
    const dailyCount = Math.floor(rand() * 4)
    for (let i = 0; i < dailyCount; i++) {
      const site = constructionSites[Math.floor(rand() * constructionSites.length)]
      const tpl = extraTemplates[extraIdx % extraTemplates.length]
      extraIdx++

      const day = String(dayOffset).padStart(2, '0')
      const hour = String(7 + Math.floor(rand() * 14)).padStart(2, '0')
      const minute = String(Math.floor(rand() * 60)).padStart(2, '0')
      const occurTime = `2026-06-${day} ${hour}:${minute}`

      const isResolved = rand() > 0.15
      let resolveTime = ''
      if (isResolved) {
        const date = new Date(`2026-06-${day}T${hour}:${minute}:00`)
        date.setMinutes(date.getMinutes() + Math.floor(rand() * 117) + 3)
        resolveTime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      }

      const method = resolveMethods[Math.floor(rand() * resolveMethods.length)]

      incidents.push({
        id: `hi-${extraIdx}`,
        siteId: site.id,
        siteName: site.name,
        siteAddress: site.address,
        type: tpl.type,
        description: tpl.desc,
        detail: tpl.detail,
        location: tpl.location,
        occurTime,
        resolveTime,
        status: isResolved ? 'resolved' : 'unresolved',
        resolveMethod: isResolved ? method : 'expired',
        thumb: site.thumb
      })
    }
  }

  // 按发生时间倒序
  incidents.sort((a, b) => b.occurTime.localeCompare(a.occurTime))
  return incidents
}

export const historyIncidents: HistoryIncident[] = generateIncidents()

// ===== 事件类型选项（复用 eventMeta，不含设备健康异常）=====
export const eventTypeOptions: { value: EventType; label: string; color: string; icon: string }[] = [
  { value: 'safety', label: eventMeta.safety.label, color: eventMeta.safety.color, icon: eventMeta.safety.icon },
  { value: 'risk', label: eventMeta.risk.label, color: eventMeta.risk.color, icon: eventMeta.risk.icon },
  { value: 'alert', label: eventMeta.alert.label, color: eventMeta.alert.color, icon: eventMeta.alert.icon }
]
