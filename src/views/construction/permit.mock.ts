/**
 * 作业许可 mock 数据
 * 许可类型 + 状态 + 数据模型 + 生成函数
 */
import { constructionSites } from './posture.mock'
import eventImg1 from '@/assets/construction/event-1.jpg'
import eventImg2 from '@/assets/construction/event-2.jpg'
import eventImg3 from '@/assets/construction/event-3.jpg'
import eventImg4 from '@/assets/construction/event-4.jpg'

// ===== 许可类型 =====
export type PermitType = 'hotwork' | 'height' | 'lifting' | 'electric' | 'excavation' | 'confinedspace'

export const permitTypeMeta: Record<PermitType, { label: string; icon: string; color: string }> = {
  hotwork:       { label: '动火作业', icon: 'i-ant-design-fire-outlined',        color: '#ff4d4f' },
  height:        { label: '高处作业', icon: 'i-ant-design-vertical-align-top-outlined', color: '#1677ff' },
  lifting:       { label: '吊装作业', icon: 'i-ant-design-vertical-align-middle-outlined', color: '#722ed1' },
  electric:      { label: '临时用电', icon: 'i-ant-design-thunderbolt-outlined', color: '#faad14' },
  excavation:    { label: '基坑作业', icon: 'i-ant-design-build-outlined',       color: '#fa8c16' },
  confinedspace: { label: '有限空间', icon: 'i-ant-design-block-outlined',       color: '#13c2c2' }
}

export const permitTypeOptions = [
  { value: 'hotwork', label: '动火作业' },
  { value: 'height', label: '高处作业' },
  { value: 'lifting', label: '吊装作业' },
  { value: 'electric', label: '临时用电' },
  { value: 'excavation', label: '基坑作业' },
  { value: 'confinedspace', label: '有限空间' }
]

// ===== 许可状态 =====
export type PermitStatus = 'pending' | 'approved' | 'rejected'

export const permitStatusMeta: Record<PermitStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: '待审批', color: '#8c8c8c', bg: 'rgba(140,140,140,0.1)' },
  approved:  { label: '已批准', color: '#52c41a', bg: 'rgba(82,196,26,0.1)' },
  rejected:  { label: '已驳回', color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)' }
}

export const permitStatusOptions = [
  { value: 'pending', label: '待审批' },
  { value: 'approved', label: '已批准' },
  { value: 'rejected', label: '已驳回' }
]

// ===== 作业许可记录 =====
export interface Permit {
  id: string
  siteId: string
  siteName: string
  siteAddress: string
  permitType: PermitType
  title: string
  location: string
  applicant: string       // 申请人
  applyTime: string       // 申请时间
  workStartTime: string   // 作业开始时间
  workEndTime: string     // 作业结束时间
  status: PermitStatus
  workers: string[]       // 作业人员
  safetyMeasures: string[] // 安全措施
  approver?: string       // 审批人
  approveTime?: string    // 审批时间
  approveComment?: string // 审批意见
  thumb: string
}

// ===== 数据生成 =====
const applicants = ['赵安全', '钱班长', '孙工', '周安全', '吴主管', '郑经理']
const approvers = ['李监理', '王主管', '刘工', '陈总']
const workersPool = ['张某', '李某', '王某', '刘某', '赵某', '钱某', '孙某', '周某', '吴某', '郑某']

const permitTemplates: { type: PermitType; title: string; measures: string[] }[] = [
  { type: 'hotwork', title: '地下车库焊接作业', measures: ['配备灭火器 2 具', '清理周边易燃物', '设专人监护', '办理动火证'] },
  { type: 'hotwork', title: '钢筋切割作业', measures: ['配备灭火器', '清理周边易燃物', '设专人监护'] },
  { type: 'height', title: '3F 外脚手架搭设', measures: ['佩戴安全帽和安全带', '系挂安全绳', '设安全警戒区', '配备安全员'] },
  { type: 'height', title: '外墙涂料施工', measures: ['佩戴安全带', '检查吊篮安全装置', '设地面警戒区'] },
  { type: 'lifting', title: '塔吊吊装钢筋', measures: ['检查吊具和索具', '设警戒区域', '信号工指挥', '严禁超载'] },
  { type: 'lifting', title: '预制构件吊装', measures: ['检查吊具', '设警戒区域', '信号工指挥', '严禁人员下方停留'] },
  { type: 'electric', title: '临时用电接入', measures: ['由专业电工操作', '配备漏电保护器', '检查电缆绝缘', '挂警示标志'] },
  { type: 'electric', title: '配电箱改线', measures: ['断电操作', '挂警示标志', '由专业电工操作', '使用绝缘工具'] },
  { type: 'excavation', title: '基坑开挖作业', measures: ['检查边坡稳定性', '设排水措施', '设警戒区域', '配备安全员'] },
  { type: 'excavation', title: '管道沟槽开挖', measures: ['检查边坡稳定性', '设支撑防护', '设警戒区域'] },
  { type: 'confinedspace', title: '地下管井作业', measures: ['先通风检测', '佩戴防毒面具', '设专人监护', '配备救援绳索'] },
  { type: 'confinedspace', title: '污水池清理', measures: ['先通风检测', '佩戴防护装备', '设专人监护', '配备救援设备'] }
]

const locations = ['1F 施工区', '2F 外脚手架', '3F 楼层', '基坑北侧', '塔吊作业区', '材料堆放区', '焊接作业区', '配电箱 AP-03', '地下车库', '工地东门', '地下管井', '污水池']
const eventThumbs = [eventImg1, eventImg2, eventImg3, eventImg4]

function seededRandom(seed: number): () => number {
  let s = seed
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
}

function generatePermits(): Permit[] {
  const permits: Permit[] = []
  const rand = seededRandom(77)

  for (let i = 0; i < 40; i++) {
    const site = constructionSites[Math.floor(rand() * constructionSites.length)]
    const tpl = permitTemplates[Math.floor(rand() * permitTemplates.length)]
    const statusRand = rand()
    let status: PermitStatus
    if (statusRand < 0.25) status = 'pending'
    else if (statusRand < 0.80) status = 'approved'
    else status = 'rejected'

    const day = String(1 + Math.floor(rand() * 13)).padStart(2, '0')
    const hour = String(8 + Math.floor(rand() * 8)).padStart(2, '0')
    const minute = String(Math.floor(rand() * 60)).padStart(2, '0')
    const endHour = String(Math.min(20, parseInt(hour) + 2 + Math.floor(rand() * 4))).padStart(2, '0')

    const workerCount = 2 + Math.floor(rand() * 4)
    const workers: string[] = []
    for (let w = 0; w < workerCount; w++) {
      workers.push(workersPool[Math.floor(rand() * workersPool.length)])
    }

    const permit: Permit = {
      id: `pm-${i}`,
      siteId: site.id,
      siteName: site.name,
      siteAddress: site.address,
      permitType: tpl.type,
      title: tpl.title,
      location: locations[Math.floor(rand() * locations.length)],
      applicant: applicants[Math.floor(rand() * applicants.length)],
      applyTime: `2026-07-${day} ${hour}:${minute}`,
      workStartTime: `2026-07-${day} ${hour}:${minute}`,
      workEndTime: `2026-07-${day} ${endHour}:${minute}`,
      status,
      workers,
      safetyMeasures: tpl.measures,
      thumb: eventThumbs[i % eventThumbs.length]
    }

    // 审批信息
    if (status !== 'pending') {
      permit.approver = status === 'rejected' ? approvers[Math.floor(rand() * approvers.length)] : approvers[Math.floor(rand() * approvers.length)]
      permit.approveTime = `2026-07-${day} ${String(parseInt(hour) - 1 < 8 ? 8 : parseInt(hour) - 1).padStart(2, '0')}:${String(Math.floor(rand() * 60)).padStart(2, '0')}`
      permit.approveComment = status === 'rejected'
        ? '安全措施不到位，需补充防护设施后重新申请。'
        : '安全措施已确认，同意作业。'
    }

    permits.push(permit)
  }

  permits.sort((a, b) => b.applyTime.localeCompare(a.applyTime))
  return permits
}

export const permits: Permit[] = generatePermits()

// ===== 工作台聚合数据 =====
export function getPermitStats() {
  const total = permits.length
  const pendingCount = permits.filter(p => p.status === 'pending').length
  const approvedCount = permits.filter(p => p.status === 'approved').length
  const rejectedCount = permits.filter(p => p.status === 'rejected').length
  return { total, pendingCount, approvedCount, rejectedCount }
}

// 待审批许可
export function getPendingPermits() {
  return permits.filter(p => p.status === 'pending').slice(0, 8)
}

// 已批准许可
export function getApprovedPermits() {
  return permits.filter(p => p.status === 'approved').slice(0, 8)
}

// 各类型统计
export function getTypeStats() {
  const types: PermitType[] = ['hotwork', 'height', 'lifting', 'electric', 'excavation', 'confinedspace']
  return types.map(t => ({
    type: t,
    label: permitTypeMeta[t].label,
    icon: permitTypeMeta[t].icon,
    color: permitTypeMeta[t].color,
    count: permits.filter(p => p.permitType === t).length,
    pending: permits.filter(p => p.permitType === t && p.status === 'pending').length,
    working: permits.filter(p => p.permitType === t && p.status === 'approved').length
  }))
}
