/**
 * 工地安全 - 历史风险事件 mock 数据
 * 复用 history-incident 的类型/展示元信息，仅生成 risk 类型（风险预警）事件
 */
import {
  constructionSites,
  type EventType
} from './posture.mock'

// 复用类型
export type { HistoryIncident, ResolveStatus, ResolveMethod } from './history-incident.mock'
import type { HistoryIncident, ResolveStatus, ResolveMethod } from './history-incident.mock'
export { statusMeta, resolveMethodMeta, eventTypeOptions } from './history-incident.mock'

// 风险事件模板（仅 risk 类型）
const riskTemplates = [
  { desc: '脚手架倾斜风险',       detail: '脚手架垂直度偏差超过允许值，存在坍塌风险，需立即加固。',                    location: '2F 外脚手架' },
  { desc: '基坑变形超限',         detail: '基坑支护结构位移监测值超出预警阈值，需加强观测并采取加固措施。',           location: '深基坑北侧' },
  { desc: '临时用电过载',         detail: '临时用电回路电流持续偏高，接近开关额定容量，存在电气火灾风险。',           location: '配电箱 AP-03' },
  { desc: '塔吊基础沉降',         detail: '塔吊基础沉降量接近警戒值，建议暂停使用并复测。',                            location: '1# 塔吊基础' },
  { desc: '高支模变形预警',       detail: '高支模体系监测到异常变形，承载能力下降，需检查加固。',                      location: '大厅高支模区域' },
  { desc: '边坡失稳风险',         detail: '边坡位移监测点数据持续增大，存在滑坡风险。',                               location: '东侧边坡监测点' },
  { desc: '脚手架连墙件缺失',     detail: '脚手架连墙件拆除数量超过规范允许值，整体稳定性下降。',                      location: '3F 外脚手架' },
  { desc: '吊装区域地基软化',     detail: '吊装作业区域地基承载力下降，存在设备倾覆风险。',                            location: '吊装作业区' },
  { desc: '支护桩位移预警',       detail: '基坑支护桩顶位移速率增大，需加强支撑体系。',                                location: '基坑西侧支护桩' },
  { desc: '模板支撑体系失稳',     detail: '模板支撑体系检测到局部杆件变形，存在坍塌风险。',                            location: '4F 模板支撑区' },
  { desc: '临时道路路基沉降',     detail: '运输临时道路路基出现不均匀沉降，影响重型车辆通行安全。',                    location: '北侧临时道路' },
  { desc: '高处作业平台超载',     detail: '高处作业平台荷载监测超出设计承载值，需控制上人数量。',                      location: '5F 施工平台' },
  { desc: '盾构隧道渗水预警',     detail: '盾构隧道管片接缝渗水量增大，需注浆封堵。',                                  location: '隧道 K2+100 段' },
  { desc: '钢筋加工棚抗风不足',   detail: '钢筋加工棚结构抗风等级不满足预报风压，需加固或拆除。',                      location: '钢筋加工棚' },
  { desc: '降水井抽水能力不足',   detail: '地下水位下降速率低于设计值，基坑存在突涌风险。',                             location: '降水井 PW-08' }
]

// 确定性伪随机
function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
}

const resolveMethods: ResolveMethod[] = ['auto', 'manual', 'expired']

function generateRiskIncidents(): HistoryIncident[] {
  const incidents: HistoryIncident[] = []
  const rand = seededRandom(77)

  let idx = 0
  for (let dayOffset = 1; dayOffset <= 30; dayOffset++) {
    // 每天 0~2 条
    const dailyCount = Math.floor(rand() * 3)
    for (let i = 0; i < dailyCount; i++) {
      const site = constructionSites[Math.floor(rand() * constructionSites.length)]
      const tpl = riskTemplates[idx % riskTemplates.length]
      idx++

      const month = dayOffset <= 10 ? '07' : '06'
      const day = dayOffset <= 10
        ? String(dayOffset).padStart(2, '0')
        : String(dayOffset - 10).padStart(2, '0')
      const hour = String(7 + Math.floor(rand() * 14)).padStart(2, '0')
      const minute = String(Math.floor(rand() * 60)).padStart(2, '0')
      const occurTime = `2026-${month}-${day} ${hour}:${minute}`

      const isResolved = rand() > 0.2
      let resolveTime = ''
      if (isResolved) {
        const date = new Date(`2026-${month}-${day}T${hour}:${minute}:00`)
        date.setMinutes(date.getMinutes() + Math.floor(rand() * 240) + 10)
        resolveTime = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      }

      const method = resolveMethods[Math.floor(rand() * resolveMethods.length)]

      incidents.push({
        id: `ri-${idx}`,
        siteId: site.id,
        siteName: site.name,
        siteAddress: site.address,
        type: 'risk' as EventType,
        description: tpl.desc,
        detail: tpl.detail,
        location: tpl.location,
        occurTime,
        resolveTime,
        status: isResolved ? 'resolved' as ResolveStatus : 'unresolved' as ResolveStatus,
        resolveMethod: isResolved ? method : 'expired' as ResolveMethod,
        thumb: site.thumb
      })
    }
  }

  // 按发生时间倒序
  incidents.sort((a, b) => b.occurTime.localeCompare(a.occurTime))
  return incidents
}

export const riskIncidents: HistoryIncident[] = generateRiskIncidents()
