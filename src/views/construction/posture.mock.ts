/**
 * 工地态势 mock 数据
 * 工地列表（省市区树结构） + 地图经纬度点位 + 事件类型 + 事件明细
 */
import siteImg1 from '@/assets/construction/site-1.jpg'
import siteImg2 from '@/assets/construction/site-2.jpg'
import siteImg3 from '@/assets/construction/site-3.jpg'
import siteImg4 from '@/assets/construction/site-4.jpg'
import eventImg1 from '@/assets/construction/event-1.jpg'
import eventImg2 from '@/assets/construction/event-2.jpg'
import eventImg3 from '@/assets/construction/event-3.jpg'
import eventImg4 from '@/assets/construction/event-4.jpg'
import workerImg1 from '@/assets/construction/worker-1.jpg'
import workerImg2 from '@/assets/construction/worker-2.jpg'
import workerImg3 from '@/assets/construction/worker-3.jpg'
import workerImg4 from '@/assets/construction/worker-4.jpg'

// ===== 事件类型 =====
// safety    安全告警
// risk      风险预警
// health    设备健康异常
// alert     设备告警
export type EventType = 'safety' | 'risk' | 'health' | 'alert'

export interface EventFlag {
  type: EventType
  count: number
}

// 事件类型 → 展示信息
export const eventMeta: Record<EventType, { label: string; shortLabel: string; icon: string; color: string }> = {
  safety: { label: '安全告警', shortLabel: '安全告警', icon: 'i-ant-design-alert-outlined',       color: '#ff4d4f' },
  risk:   { label: '风险预警', shortLabel: '风险预警', icon: 'i-ant-design-warning-outlined',     color: '#faad14' },
  health: { label: '设备健康异常', shortLabel: '健康异常', icon: 'i-ant-design-heart-outlined',    color: '#722ed1' },
  alert:  { label: '设备告警', shortLabel: '设备告警', icon: 'i-ant-design-notification-outlined', color: '#fa8c16' }
}

// ===== 面积类型 =====
export type SizeType = 'large' | 'medium' | 'small'

export const sizeTypeMeta: Record<SizeType, { label: string; color: string }> = {
  large:  { label: '大型', color: '#6e4bff' },
  medium: { label: '中型', color: '#2bb3a3' },
  small:  { label: '小型', color: '#8c8c8c' }
}

// 面积格式化
export function formatArea(area: number): string {
  if (area >= 10000) {
    return (area / 10000).toFixed(1) + ' 万㎡'
  }
  return area.toLocaleString() + ' ㎡'
}

export function inferSizeType(area: number): SizeType {
  if (area >= 50000) return 'large'
  if (area >= 10000) return 'medium'
  return 'small'
}

export function hasAbnormal(site: ConstructionSite): boolean {
  return site.events.length > 0
}

// ===== 事件明细 =====
export interface SiteEvent {
  id: string
  /** 所属工地 id */
  siteId: string
  /** 事件类型 */
  type: EventType
  /** 事件标题 */
  title: string
  /** 事件截图 */
  thumb: string
  /** 触发时间 */
  time: string
  /** 触发位置/设备 */
  location: string
  /** 描述 */
  desc: string
}

// ===== 工地 =====
export interface ConstructionSite {
  id: string
  name: string
  address: string
  desc: string
  thumb: string
  area: number
  sizeType: SizeType
  videoCount: number
  deviceCount: number
  activePersonnel: number
  events: EventFlag[]
  lng: number
  lat: number
  // 以下字段在数据初始化后由循环赋值填充
  gatewayCount?: number
  gatewayOnline?: number
  gatewayOffline?: number
  gatewayHealth?: number
  videoOnline?: number
  videoOffline?: number
  videoHealth?: number
  deviceOnline?: number
  deviceOffline?: number
  deviceHealth?: number
  /** 安全评分（0~100） */
  safetyScore?: number
}

// 工地照片轮换使用
const siteThumbs = [siteImg1, siteImg2, siteImg3, siteImg4]
// 事件截图池（使用工地照片）
const eventThumbs = [eventImg1, eventImg2, eventImg3, eventImg4]

// ===== 10 个工地 =====
export const constructionSites: ConstructionSite[] = [
  {
    id: 'c1', name: '滨江金融中心一期', address: '杭州市滨江区江南大道 588 号',
    desc: '超高层商业综合体，含办公楼、酒店及商业裙楼，地下三层车库',
    thumb: siteThumbs[0], area: 85000, sizeType: 'large',
    videoCount: 48, deviceCount: 126, activePersonnel: 12,
    events: [
      { type: 'safety', count: 8 }, { type: 'health', count: 5 }, { type: 'risk', count: 4 }, { type: 'alert', count: 6 }
    ],
    lng: 120.2116, lat: 30.2084
  },
  {
    id: 'c2', name: '城北科创园二期', address: '杭州市拱墅区祥园路 28 号',
    desc: '产业园区项目，含 4 栋研发楼及配套设施',
    thumb: siteThumbs[1], area: 42000, sizeType: 'medium',
    videoCount: 32, deviceCount: 88, activePersonnel: 8,
    events: [{ type: 'risk', count: 6 }, { type: 'safety', count: 5 }, { type: 'alert', count: 3 }],
    lng: 120.1429, lat: 30.3234
  },
  {
    id: 'c3', name: '萧山国际机场扩建', address: '杭州市萧山区空港大道 1 号',
    desc: '航站楼扩建及停机坪改造工程',
    thumb: siteThumbs[2], area: 120000, sizeType: 'large',
    videoCount: 65, deviceCount: 204, activePersonnel: 15,
    events: [],
    lng: 120.4311, lat: 30.2391
  },
  {
    id: 'c4', name: '西湖文化广场改造', address: '杭州市西湖区文三路 20 号',
    desc: '历史建筑保护性改造，含地下停车场新建',
    thumb: siteThumbs[3], area: 18000, sizeType: 'medium',
    videoCount: 24, deviceCount: 56, activePersonnel: 6,
    events: [{ type: 'safety', count: 4 }, { type: 'health', count: 3 }],
    lng: 120.1593, lat: 30.2741
  },
  {
    id: 'c5', name: '钱江新城地下空间', address: '杭州市上城区四季青街道',
    desc: '地下商业街及综合管廊工程',
    thumb: siteThumbs[0], area: 55000, sizeType: 'large',
    videoCount: 40, deviceCount: 112, activePersonnel: 11,
    events: [
      { type: 'risk', count: 5 }, { type: 'alert', count: 4 }, { type: 'safety', count: 3 }
    ],
    lng: 120.2051, lat: 30.2489
  },
  {
    id: 'c6', name: '余杭未来科技城三期', address: '杭州市余杭区文一西路 1500 号',
    desc: '高新技术企业产业园，含研发中心及人才公寓',
    thumb: siteThumbs[1], area: 38000, sizeType: 'medium',
    videoCount: 28, deviceCount: 74, activePersonnel: 9,
    events: [],
    lng: 119.9684, lat: 30.2873
  },
  {
    id: 'c7', name: '富阳高铁站枢纽', address: '杭州市富阳区站前路',
    desc: '高铁站房及站前广场工程',
    thumb: siteThumbs[2], area: 25000, sizeType: 'medium',
    videoCount: 30, deviceCount: 68, activePersonnel: 7,
    events: [],
    lng: 119.9600, lat: 30.0489
  },
  {
    id: 'c8', name: '临安青山湖科创小镇', address: '杭州市临安区青山湖街道',
    desc: '特色小镇项目，含会展中心及配套商业',
    thumb: siteThumbs[3], area: 68000, sizeType: 'large',
    videoCount: 52, deviceCount: 145, activePersonnel: 14,
    events: [
      { type: 'safety', count: 6 }, { type: 'risk', count: 4 }, { type: 'alert', count: 5 }, { type: 'health', count: 3 }
    ],
    lng: 119.7216, lat: 30.2384
  },
  {
    id: 'c9', name: '桐庐富春江滨水景观', address: '杭州市桐庐县富春江畔',
    desc: '滨江景观带及休闲步道工程',
    thumb: siteThumbs[0], area: 8000, sizeType: 'small',
    videoCount: 12, deviceCount: 28, activePersonnel: 4,
    events: [],
    lng: 119.6919, lat: 29.7936
  },
  {
    id: 'c10', name: '建德高铁新城综合体', address: '杭州市建德市新安江街道',
    desc: '高铁新城核心区综合体，含商业、办公及住宅',
    thumb: siteThumbs[1], area: 32000, sizeType: 'medium',
    videoCount: 26, deviceCount: 62, activePersonnel: 8,
    events: [
      { type: 'health', count: 4 }, { type: 'alert', count: 5 }, { type: 'safety', count: 3 }
    ],
    lng: 119.2812, lat: 29.4748
  }
]

// ===== 事件明细数据生成 =====
const eventTemplates: Record<EventType, { title: string; location: string; desc: string }[]> = {
  safety: [
    { title: '人员未戴安全帽', location: '工地东门入口', desc: 'AI 识别到施工人员进入施工区域未佩戴安全帽，持续 5 分钟。' },
    { title: '人员闯入危险区域', location: '塔吊作业区', desc: '未授权人员进入塔吊作业禁入区域，存在安全隐患。' },
    { title: '临边防护缺失', location: '3F 楼层边缘', desc: '检测到楼层临边防护栏未安装到位，有坠落风险。' },
    { title: '违规动火作业', location: '地下车库焊接区', desc: '未办理动火许可证进行焊接作业，现场无监护人员。' },
    { title: '高空抛物', location: '5F 施工楼层', desc: '检测到高空抛物行为，可能造成下方人员伤害。' },
    { title: '未穿反光背心', location: '工地南门通道', desc: '施工人员未穿戴反光背心进入施工区域。' },
    { title: '安全绳未系挂', location: '2F 外脚手架', desc: '高空作业人员未正确系挂安全绳，存在坠落风险。' },
    { title: '消防通道堵塞', location: '材料堆放区', desc: '建筑材料堆放占用消防通道，影响紧急疏散。' }
  ],
  risk: [
    { title: '基坑变形超限', location: '深基坑北侧', desc: '基坑支护结构位移监测值超出预警阈值，需加强观测。' },
    { title: '脚手架倾斜风险', location: '2F 外脚手架', desc: '脚手架垂直度偏差超过允许值，存在坍塌风险。' },
    { title: '临时用电过载', location: '配电箱 AP-03', desc: '临时用电回路电流持续偏高，接近开关额定容量。' },
    { title: '边坡位移预警', location: '东侧边坡监测点', desc: '边坡位移速率加快，接近预警阈值。' },
    { title: '塔吊基础沉降', location: '1# 塔吊基础', desc: '塔吊基础沉降监测数据异常，需复核。' },
    { title: '支撑轴力异常', location: '基坑内支撑', desc: '基坑内支撑轴力监测值持续增大，存在结构风险。' },
    { title: '风速超限预警', location: '塔吊顶部风速仪', desc: '施工区域风速达到 8 级，建议停止高空作业。' }
  ],
  health: [
    { title: '塔吊振动异常', location: '1# 塔吊回转机构', desc: '塔吊回转轴承振动频率异常，建议安排维保检查。' },
    { title: '扬尘监测仪离线', location: '北门扬尘监测点', desc: '扬尘监测设备已离线超过 2 小时，数据中断。' },
    { title: '混凝土温控异常', location: 'B 区承台浇筑点', desc: '大体积混凝土内部温度超出温控标准，需调整冷却水。' },
    { title: '摄像头画面模糊', location: '西门摄像头', desc: '摄像头画面出现模糊，可能镜头脏污或对焦异常。' },
    { title: '噪音监测仪故障', location: '东侧噪音监测点', desc: '噪音监测设备数据异常跳动，需现场检修。' },
    { title: '温湿度传感器异常', location: '地下车库传感器', desc: '温湿度传感器读数持续异常，可能探头损坏。' },
    { title: '网关通信延迟', location: 'E 区边缘网关', desc: '网关数据上报延迟超过 30 秒，存在通信异常。' }
  ],
  alert: [
    { title: '烟雾报警', location: '焊接作业区烟感探测器', desc: '焊接作业区烟感探测器触发报警，请现场确认。' },
    { title: '配电箱温度报警', location: '配电箱 AP-05', desc: '配电箱内温度超过 65°C，可能存在过热故障。' },
    { title: '水位超限报警', location: '集水坑液位计', desc: '基坑集水坑水位达到高限报警值，请启动排水泵。' },
    { title: '气体浓度报警', location: '有限空间气体检测仪', desc: '有限空间可燃气体浓度超过报警阈值，请立即通风。' },
    { title: '漏电保护器跳闸', location: '配电箱 AP-02', desc: '漏电保护器动作跳闸，请排查漏电原因后恢复供电。' },
    { title: '粉尘浓度超标', location: '切割作业区粉尘仪', desc: '切割作业区粉尘浓度超过报警限值，请开启雾炮降尘。' },
    { title: '轴温报警', location: '2# 塔吊主卷扬机', desc: '塔吊卷扬机轴承温度超过报警阈值，请停机检查。' },
    { title: '电压异常报警', location: '配电箱 AP-01', desc: '配电箱输出电压波动超出允许范围，请检查供电线路。' }
  ]
}

// 为每个工地的事件生成明细
function generateEventDetails(): SiteEvent[] {
  const details: SiteEvent[] = []
  let idx = 0
  for (const site of constructionSites) {
    for (const ev of site.events) {
      const templates = eventTemplates[ev.type]
      for (let i = 0; i < ev.count; i++) {
        const tpl = templates[i % templates.length]
        const round = Math.floor(i / templates.length)
        details.push({
          id: `ev-${site.id}-${ev.type}-${i}`,
          siteId: site.id,
          type: ev.type,
          title: round > 0 ? `${tpl.title}（第${round + 1}次）` : tpl.title,
          thumb: eventThumbs[idx % eventThumbs.length],
          time: `2026-07-${String(5 + (idx % 7)).padStart(2, '0')} ${String(7 + (idx % 12)).padStart(2, '0')}:${String((idx * 7) % 60).padStart(2, '0')}`,
          location: tpl.location,
          desc: tpl.desc
        })
        idx++
      }
    }
  }
  return details
}

export const siteEventDetails: SiteEvent[] = generateEventDetails()

// 获取某工地某类型的事件明细
export function getSiteEvents(siteId: string, type: EventType): SiteEvent[] {
  return siteEventDetails.filter(e => e.siteId === siteId && e.type === type)
}

// 获取某工地全部事件明细
export function getAllSiteEvents(siteId: string): SiteEvent[] {
  return siteEventDetails.filter(e => e.siteId === siteId)
}

// ===== 省市区树结构 =====
export interface RegionNode {
  code: string
  label: string
  level: 'province' | 'city' | 'district'
  sites?: ConstructionSite[]
  children?: RegionNode[]
}

export const regionTree: RegionNode[] = [
  {
    code: '330000', label: '浙江省', level: 'province',
    children: [
      {
        code: '330100', label: '杭州市', level: 'city',
        children: [
          { code: '330108', label: '滨江区', level: 'district', sites: [constructionSites[0]] },
          { code: '330105', label: '拱墅区', level: 'district', sites: [constructionSites[1]] },
          { code: '330109', label: '萧山区', level: 'district', sites: [constructionSites[2]] },
          { code: '330106', label: '西湖区', level: 'district', sites: [constructionSites[3]] },
          { code: '330102', label: '上城区', level: 'district', sites: [constructionSites[4]] },
          { code: '330110', label: '余杭区', level: 'district', sites: [constructionSites[5]] },
          { code: '330111', label: '富阳区', level: 'district', sites: [constructionSites[6]] },
          { code: '330112', label: '临安区', level: 'district', sites: [constructionSites[7]] },
          { code: '330122', label: '桐庐县', level: 'district', sites: [constructionSites[8]] },
          { code: '330182', label: '建德市', level: 'district', sites: [constructionSites[9]] }
        ]
      }
    ]
  }
]

// ===== 为工地生成设备细分数据 =====
// 基于已有的 videoCount/deviceCount 推导 online/offline/health
for (const site of constructionSites) {
  // 网关数 ≈ ceil(deviceCount / 20)
  site.gatewayCount = Math.max(1, Math.ceil(site.deviceCount / 20))
  const gOff = site.events.some(e => e.type === 'health') ? 1 : 0
  site.gatewayOnline = site.gatewayCount - gOff - (gOff > 0 ? 0 : 0)
  site.gatewayOffline = 0
  site.gatewayHealth = gOff

  // 视频细分
  const vHealth = site.events.some(e => e.type === 'health') ? Math.ceil(site.videoCount * 0.04) : 0
  site.videoOnline = site.videoCount - vHealth - 1
  site.videoOffline = 1
  site.videoHealth = vHealth

  // 设备细分
  const dHealth = site.events.some(e => e.type === 'health') ? Math.ceil(site.deviceCount * 0.03) : 0
  site.deviceOnline = site.deviceCount - dHealth - 2
  site.deviceOffline = 2
  site.deviceHealth = dHealth

  // 安全评分：基于安全告警和风险预警扣分
  const safetyEvents = site.events.find(e => e.type === 'safety')
  const riskEvents = site.events.find(e => e.type === 'risk')
  const safetyCount = safetyEvents?.count || 0
  const riskCount = riskEvents?.count || 0
  const safetyDeduct = safetyCount * 4 + riskCount * 2
  site.safetyScore = Math.max(40, 98 - safetyDeduct)
}

// ===== 安全评分原因 =====
export interface ScoreReason {
  /** 评分等级 */
  level: string
  /** 评分摘要 */
  summary: string
  /** 扣分明细 */
  deductions: { label: string; count: number; perScore: number; totalDeduct: number }[]
  /** 建议 */
  suggestions: string[]
}

export function getScoreReason(siteId: string): ScoreReason {
  const site = constructionSites.find(s => s.id === siteId)
  if (!site) return { level: '未知', summary: '', deductions: [], suggestions: [] }

  const safetyCount = site.events.find(e => e.type === 'safety')?.count || 0
  const riskCount = site.events.find(e => e.type === 'risk')?.count || 0
  const score = site.safetyScore || 0

  const deductions: ScoreReason['deductions'] = []
  if (safetyCount > 0) {
    deductions.push({ label: '安全告警事件', count: safetyCount, perScore: 4, totalDeduct: safetyCount * 4 })
  }
  if (riskCount > 0) {
    deductions.push({ label: '风险预警事件', count: riskCount, perScore: 2, totalDeduct: riskCount * 2 })
  }

  const level = score >= 85 ? '安全' : score >= 70 ? '一般' : '风险'
  const summary = deductions.length === 0
    ? '当前无安全告警和风险预警事件，工地安全状况良好。'
    : `当前存在 ${safetyCount} 项安全告警、${riskCount} 项风险预警，共扣 ${deductions.reduce((s, d) => s + d.totalDeduct, 0)} 分。`

  const suggestions: string[] = []
  if (safetyCount >= 5) suggestions.push('安全告警事件较多，建议立即组织安全排查，重点处理高频告警区域。')
  else if (safetyCount > 0) suggestions.push('存在安全告警事件，建议及时处理并复查。')
  if (riskCount >= 4) suggestions.push('风险预警数量较多，建议加强日常巡查频次，重点关注基坑、脚手架等高风险部位。')
  else if (riskCount > 0) suggestions.push('存在风险预警，建议关注并采取预防措施。')
  if (suggestions.length === 0) suggestions.push('继续保持当前安全管理水平，定期开展安全培训。')

  return { level, summary, deductions, suggestions }
}

// ===== 事件趋势（近 7 日）=====
export interface EventTrend {
  days: string[]
  /** 4 种类型，每日数量 */
  safety: number[]
  risk: number[]
  health: number[]
  alert: number[]
}

// 为每个工地生成趋势数据
const trendDays = ['07-05', '07-06', '07-07', '07-08', '07-09', '07-10', '07-11']

function generateTrend(site: ConstructionSite): EventTrend {
  const seed = parseInt(site.id.replace('c', '')) || 1
  const rand = (base: number, variance: number) =>
    Math.max(0, Math.round(base + Math.sin(seed + variance) * variance))

  return {
    days: trendDays,
    safety: trendDays.map((_, i) => rand(2 + (site.events.find(e => e.type === 'safety')?.count || 0), i + 1)),
    risk: trendDays.map((_, i) => rand(1 + (site.events.find(e => e.type === 'risk')?.count || 0), i + 2)),
    health: trendDays.map((_, i) => rand(0 + (site.events.find(e => e.type === 'health')?.count || 0), i + 3)),
    alert: trendDays.map((_, i) => rand(1 + (site.events.find(e => e.type === 'alert')?.count || 0), i + 4))
  }
}

const trendCache: Record<string, EventTrend> = {}
export function getSiteTrend(siteId: string): EventTrend {
  if (!trendCache[siteId]) {
    const site = constructionSites.find(s => s.id === siteId)
    trendCache[siteId] = site ? generateTrend(site) : { days: trendDays, safety: [], risk: [], health: [], alert: [] }
  }
  return trendCache[siteId]
}

// ===== 活跃人员列表 =====
const workerNames = ['张伟', '李强', '王勇', '刘洋', '陈刚', '赵磊', '孙杰', '周斌', '吴鹏', '郑辉', '马俊', '黄涛', '林峰', '徐亮', '胡军']
const workerRoles = ['钢筋工', '木工', '混凝土工', '架子工', '电焊工', '电工', '水暖工', '塔吊司机', '信号工', '测量员', '安全员', '材料员']
const workerAvatars = [workerImg1, workerImg2, workerImg3, workerImg4]

export interface SiteWorker {
  id: string
  name: string
  role: string
  /** 进场时间 */
  enterTime: string
  /** 状态 */
  status: '在场' | '离场'
  avatar: string
}

export function getSiteWorkers(siteId: string): SiteWorker[] {
  const site = constructionSites.find(s => s.id === siteId)
  if (!site) return []
  const count = site.activePersonnel
  const seed = parseInt(siteId.replace('c', '')) || 1
  const workers: SiteWorker[] = []
  for (let i = 0; i < count; i++) {
    const idx = (seed * 3 + i * 7) % workerNames.length
    workers.push({
      id: `w-${siteId}-${i}`,
      name: workerNames[idx],
      role: workerRoles[(seed + i) % workerRoles.length],
      enterTime: `2026-07-11 ${String(7 + (i % 3)).padStart(2, '0')}:${String((i * 13) % 60).padStart(2, '0')}`,
      status: '在场',
      avatar: workerAvatars[i % workerAvatars.length]
    })
  }
  return workers
}

// ===== 3D 模型配置 =====
export interface SiteModel3D {
  /** 楼层数 */
  floors: number
  /** 建筑长（单位） */
  width: number
  /** 建筑宽（单位） */
  depth: number
  /** 塔吊数量 */
  cranes: number
}

export function getSiteModel3D(siteId: string): SiteModel3D {
  const site = constructionSites.find(s => s.id === siteId)
  if (!site) return { floors: 5, width: 12, depth: 8, cranes: 1 }
  const seed = parseInt(siteId.replace('c', '')) || 1
  return {
    floors: Math.max(3, Math.min(20, Math.floor(site.area / 8000) + 3)),
    width: 8 + (seed % 6),
    depth: 6 + (seed % 4),
    cranes: site.area > 50000 ? 2 : 1
  }
}

// ===== 3D 场景标记点 =====
export type MarkerType = 'camera' | 'device' | 'event' | 'worker'

export interface SiteMarker {
  id: string
  type: MarkerType
  name: string
  /** 3D 坐标 */
  x: number
  y: number
  z: number
  /** 2D 平面图百分比坐标 (0~100) */
  planX: number
  planY: number
  /** 关联事件 id（event 类型用） */
  refId?: string
  /** 关联事件对象（event 类型用） */
  event?: SiteEvent
  /** 关联人员（worker 类型用） */
  worker?: SiteWorker
  /** 摄像头信息（camera 类型用） */
  camera?: { name: string; thumb: string; status: 'online' | 'offline' }
}

const cameraNames = ['东门摄像头', '南门摄像头', '西门摄像头', '北门摄像头', '塔吊摄像头', '基坑摄像头']
const deviceNames = ['扬尘监测仪', '噪音监测仪', '温湿度传感器', '配电箱 AP-01', '配电箱 AP-03', '水位计', '气体检测仪']

export function getSiteMarkers(siteId: string): SiteMarker[] {
  const site = constructionSites.find(s => s.id === siteId)
  if (!site) return []
  const config = getSiteModel3D(siteId)
  const { width, depth, floors } = config
  const floorHeight = 3
  const buildingHeight = floors * floorHeight
  const seed = parseInt(siteId.replace('c', '')) || 1
  const markers: SiteMarker[] = []

  // 摄像头标记（3~5 个）
  const camCount = Math.min(5, Math.max(3, Math.floor(width / 3)))
  for (let i = 0; i < camCount; i++) {
    const angle = (i / camCount) * Math.PI * 2
    markers.push({
      id: `cam-${siteId}-${i}`,
      type: 'camera',
      name: cameraNames[(seed + i) % cameraNames.length],
      x: Math.cos(angle) * (width / 2 + 3),
      y: buildingHeight * 0.3 + (i % 2) * floorHeight,
      z: Math.sin(angle) * (depth / 2 + 3),
      planX: 10 + (i / camCount) * 80,
      planY: 8 + (seed % 3) * 15 + i * 12,
      camera: {
        name: cameraNames[(seed + i) % cameraNames.length],
        thumb: site.thumb,
        status: 'online'
      }
    })
  }

  // 设备标记（4~6 个）
  const devCount = Math.min(6, Math.max(4, Math.floor(depth)))
  for (let i = 0; i < devCount; i++) {
    markers.push({
      id: `dev-${siteId}-${i}`,
      type: 'device',
      name: deviceNames[(seed * 2 + i) % deviceNames.length],
      x: (width / 2) * (i % 2 === 0 ? 0.6 : -0.6) + (i - devCount / 2),
      y: 1,
      z: (depth / 2) * (i < devCount / 2 ? 0.5 : -0.5) + ((i * 3) % 5 - 2),
      planX: 20 + (i * 13) % 60,
      planY: 25 + (i * 17) % 50
    })
  }

  // 事件标记（该工地全部事件）
  const allEvents = getAllSiteEvents(siteId)
  for (let i = 0; i < allEvents.length; i++) {
    const ev = allEvents[i]
    markers.push({
      id: `evt-${ev.id}`,
      type: 'event',
      name: ev.title,
      x: (width / 2) * (i % 2 === 0 ? 0.7 : -0.7) + (i % 3 - 1) * 2,
      y: buildingHeight * (0.2 + (i % 3) * 0.25),
      z: (depth / 2) * (i % 3 === 0 ? 0.6 : -0.4) + (i % 4 - 2),
      planX: 15 + (i * 7) % 70,
      planY: 15 + (i * 11) % 65,
      refId: ev.id,
      event: ev
    })
  }

  // 人员标记（前 3 个活跃人员）
  const workers = getSiteWorkers(siteId).slice(0, 3)
  for (let i = 0; i < workers.length; i++) {
    const w = workers[i]
    markers.push({
      id: `wkr-${w.id}`,
      type: 'worker',
      name: w.name,
      x: (width / 2) * (i === 0 ? 0.3 : i === 1 ? -0.5 : 0.1),
      y: 1.5,
      z: (depth / 2) * (i === 0 ? 0.4 : i === 1 ? -0.3 : 0.6),
      planX: 35 + i * 20,
      planY: 40 + i * 15,
      worker: w
    })
  }

  return markers
}

// 标记类型 → 展示元数据
export const markerMeta: Record<MarkerType, { label: string; icon: string; color: string }> = {
  camera: { label: '摄像头', icon: 'i-ant-design-video-camera-outlined', color: '#1890ff' },
  device: { label: '设备', icon: 'i-ant-design-control-outlined', color: '#6e4bff' },
  event:  { label: '事件', icon: 'i-ant-design-alert-outlined', color: '#ff4d4f' },
  worker: { label: '人员', icon: 'i-ant-design-team-outlined', color: '#2bb3a3' }
}
