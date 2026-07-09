/**
 * 老人行为分析 mock 数据
 * 告警类型 + 事件列表 + 趋势 + 排行 + 预测
 */

// 老人头像（真实生成照片）
import photo01 from '@/assets/elderly/oldman-1.png'
import photo02 from '@/assets/elderly/oldman-2.png'
import photo03 from '@/assets/elderly/oldman-3.png'
import photo04 from '@/assets/elderly/oldman-4.png'
import photo05 from '@/assets/elderly/oldman-5.png'
import photo06 from '@/assets/elderly/oldman-6.png'
import photo07 from '@/assets/elderly/oldman-7.png'

// 告警事件截图（场景抓拍图）
import snap01 from '@/assets/text-search/result-01.jpg'
import snap02 from '@/assets/text-search/result-02.jpg'
import snap03 from '@/assets/text-search/result-03.jpg'
import snap04 from '@/assets/text-search/result-04.jpg'
import snap05 from '@/assets/text-search/result-05.jpg'
import snap06 from '@/assets/text-search/result-06.jpg'
import snap07 from '@/assets/text-search/result-07.jpg'
import snap08 from '@/assets/text-search/result-08.jpg'
import snap09 from '@/assets/text-search/result-09.jpg'
import snap10 from '@/assets/text-search/result-10.jpg'
export const eventSnapPool = [snap01, snap02, snap03, snap04, snap05, snap06, snap07, snap08, snap09, snap10]

// ===== 告警类型 =====
export interface BehaviorType {
  key: string
  label: string
  color: string
  icon: string
}
export const behaviorTypes: BehaviorType[] = [
  { key: 'fall', label: '跌倒', color: '#ff4d4f', icon: 'i-ant-design-alert-outlined' },
  { key: 'wander', label: '长时间徘徊', color: '#fa8c16', icon: 'i-ant-design-sync-outlined' },
  { key: 'not-return', label: '夜间未归寝', color: '#722ed1', icon: 'i-ant-design-home-outlined' },
  { key: 'exit', label: '离开安全区域', color: '#13c2c2', icon: 'i-ant-design-export-outlined' },
  { key: 'abnormal', label: '异常静止', color: '#8c8c8c', icon: 'i-ant-design-pause-circle-outlined' }
]

export const typeColorMap: Record<string, string> = Object.fromEntries(
  behaviorTypes.map(t => [t.key, t.color])
)
export const typeLabelMap: Record<string, string> = Object.fromEntries(
  behaviorTypes.map(t => [t.key, t.label])
)

// ===== 时间范围选项 =====
export const timeRanges = ['今天', '近3天', '近7天', '近30天']

// ===== 告警事件 =====
export type EventLevel = 'urgent' | 'warning' | 'info'
export interface BehaviorEvent {
  id: string
  personId: string
  personName: string
  room: string        // '101室'
  building: string    // '3号楼1层'
  time: string        // 'MM-DD HH:mm'
  timestamp: number   // 排序用，越大越新
  snapshot: string    // 告警抓拍图
  typeKey: string
  typeName: string
  level: EventLevel
  desc: string
  location: string
  camera: string      // 摄像头名称
  handled: boolean
}

const persons = [
  { id: 'p1', name: '张奶奶', gender: '女' as const, age: 82, room: '101室', bedNo: '1床', building: '3号楼1层', photo: photo01, remark: '患有高血压，需重点关注跌倒风险' },
  { id: 'p2', name: '李爷爷', gender: '男' as const, age: 78, room: '101室', bedNo: '2床', building: '3号楼1层', photo: photo02, remark: '糖尿病，行动迟缓' },
  { id: 'p3', name: '王奶奶', gender: '女' as const, age: 85, room: '102室', bedNo: '1床', building: '3号楼1层', photo: photo03, remark: '阿尔茨海默症，夜间易走动' },
  { id: 'p4', name: '赵爷爷', gender: '男' as const, age: 76, room: '201室', bedNo: '1床', building: '3号楼2层', photo: photo04, remark: '冠心病，按时服药' },
  { id: 'p5', name: '刘奶奶', gender: '女' as const, age: 80, room: '202室', bedNo: '1床', building: '3号楼2层', photo: photo05, remark: '自理能力良好' },
  { id: 'p6', name: '陈爷爷', gender: '男' as const, age: 79, room: '301室', bedNo: '1床', building: '5号楼3层', photo: photo06, remark: '骨质疏松，搀扶行走' },
  { id: 'p7', name: '孙奶奶', gender: '女' as const, age: 88, room: '302室', bedNo: '1床', building: '5号楼3层', photo: photo07, remark: '全护，需密切监测体征' }
]

// 老人信息字典（供组件查询）
export const personInfoMap: Record<string, { name: string; gender: '男' | '女'; age: number; room: string; bedNo: string; building: string; photo: string; remark: string }> =
  Object.fromEntries(persons.map(p => [p.id, p]))

const descs: Record<string, string[]> = {
  fall: [
    'AI行为分析引擎检测到老人在走廊区域发生跌倒，老人已躺地超过30秒未自行站起，系统已自动触发紧急告警并通知值班护工前往现场处理。',
    '监控画面显示老人在前往卫生间途中于门口处不慎滑倒，身体右侧着地，护工在收到告警后2分钟内到达现场并将老人搀扶至安全位置。',
    '老人在走廊拐角处失去平衡跌倒，头部未触地，AI系统在3秒内识别跌倒行为并持续监测，老人躺地约25秒后在护工协助下起身。'
  ],
  wander: [
    '老人在活动室区域内持续徘徊超过20分钟，行走路线重复且无明确目的，系统判断为异常徘徊行为，建议护工关注老人精神状态及情绪变化。',
    '夜间凌晨时段，老人在2层楼道内长时间徘徊走动，多次经过同一位置，AI引擎持续追踪其运动轨迹，未发现返回寝室的迹象。',
    '老人在活动室门口附近来回踱步，持续时间较长且无明显社交互动，行为模式与日常习惯存在差异，系统标记为需要关注。'
  ],
  'not-return': [
    '就寝时间已过，AI系统检测到老人仍未返回寝室区域，最后一次出现在2层走廊摄像头画面中，方向朝楼梯口，建议立即安排护工寻找。',
    '老人在夜间23:00后离开寝室且超过1小时未归，系统持续追踪其最后出现位置为楼道电梯口附近，已通知夜班护工进行巡查确认。'
  ],
  exit: [
    'AI电子围栏系统检测到老人已离开设定的安全活动区域，最后出现在1层入口附近的摄像头画面中，行走方向朝向建筑外侧，建议立即跟进。',
    '老人接近建筑出口区域，AI系统识别其运动轨迹偏离日常活动范围，已触发越界预警，建议护工及时前往引导老人返回安全区域。',
    '监控显示老人进入平时较少活动的非活动区域，行为轨迹异常，系统已自动标记为越界事件并推送告警至值班人员终端。'
  ],
  abnormal: [
    'AI行为分析检测到老人在寝室床位区域长时间保持静止状态，持续时间超过40分钟且无正常体位变化，建议护工前往查看老人身体状况。',
    '老人在活动室座椅上长时间静止未活动，与日常行为模式相比异常，系统持续监测生命体征数据并建议安排护工进行现场确认。'
  ]
}

const locations = ['走廊', '卫生间', '活动室', '楼道', '寝室', '餐厅', '楼梯口']

// 生成事件列表（近30天，每人每天 3~8 条，类型分布丰富）
export function buildEvents(): BehaviorEvent[] {
  const out: BehaviorEvent[] = []
  let eid = 0
  const now = Date.now()
  for (let day = 0; day < 30; day++) {
    for (const p of persons) {
      // 每人每天 3~8 条事件
      const dayCount = 3 + ((day * 7 + p.id.charCodeAt(1)) % 6)
      // 当天用过的类型集合（保证多样性）
      const usedTypes = new Set<string>()
      for (let i = 0; i < dayCount; i++) {
        eid++
        // 优先选择当天未出现过的类型，保证覆盖多种
        let typeIdx: number
        if (usedTypes.size < behaviorTypes.length) {
          do {
            typeIdx = (eid * 13 + day * 7 + i * 5 + p.id.charCodeAt(1)) % behaviorTypes.length
          } while (usedTypes.has(behaviorTypes[typeIdx].key))
          usedTypes.add(behaviorTypes[typeIdx].key)
        } else {
          typeIdx = (eid * 13 + i * 5) % behaviorTypes.length
        }
        const t = behaviorTypes[typeIdx]
        const ts = now - day * 86400000 - (i % 24) * 3600000 - (eid % 60) * 60000
        const d = new Date(ts)
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const hh = String(d.getHours()).padStart(2, '0')
        const mi = String(d.getMinutes()).padStart(2, '0')
        out.push({
          id: `ev-${eid}`,
          personId: p.id,
          personName: p.name,
          room: p.room,
          building: p.building,
          time: `${mm}-${dd} ${hh}:${mi}`,
          timestamp: ts,
          snapshot: eventSnapPool[eid % eventSnapPool.length],
          typeKey: t.key,
          typeName: t.label,
          level: (['urgent', 'warning', 'info'] as EventLevel[])[typeIdx % 3],
          desc: descs[t.key][eid % descs[t.key].length],
          location: `${p.building}-${locations[eid % locations.length]}`,
          camera: `${locations[eid % locations.length]}${eid % 2 === 0 ? '摄像头A' : '摄像头B'}`,
          handled: eid % 3 !== 0
        })
      }
    }
  }
  return out.sort((a, b) => b.timestamp - a.timestamp)
}

// 时间范围过滤
export function filterByRange(events: BehaviorEvent[], range: string): BehaviorEvent[] {
  if (range === '今天') {
    const today = new Date().setHours(0, 0, 0, 0)
    return events.filter(e => e.timestamp >= today)
  }
  if (range === '近3天') {
    const from = Date.now() - 3 * 86400000
    return events.filter(e => e.timestamp >= from)
  }
  if (range === '近7天') {
    const from = Date.now() - 7 * 86400000
    return events.filter(e => e.timestamp >= from)
  }
  return events // 近30天 = 全部
}

// ===== 趋势图数据（按天）=====
export function buildTrendOption(events: BehaviorEvent[]) {
  const days: string[] = []
  const dayMap = new Map<string, Record<string, number>>()
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = `${d.getMonth() + 1}.${d.getDate()}`
    days.push(key)
    dayMap.set(key, {})
    for (const t of behaviorTypes) dayMap.get(key)![t.key] = 0
  }
  for (const e of events) {
    const d = new Date(e.timestamp)
    const key = `${d.getMonth() + 1}.${d.getDate()}`
    if (dayMap.has(key)) dayMap.get(key)![e.typeKey]++
  }
  const series = behaviorTypes.map(t => ({
    name: t.label,
    type: 'line' as const,
    smooth: true,
    data: days.map(d => dayMap.get(d)![t.key]),
    itemStyle: { color: t.color }
  }))
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: behaviorTypes.map(t => t.label), bottom: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
    grid: { top: 16, left: 36, right: 12, bottom: 36 },
    xAxis: { type: 'category', data: days, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 }, minInterval: 1 },
    series
  }
}

// ===== 类型分布饼图 =====
export function buildPieOption(events: BehaviorEvent[]) {
  const count = new Map<string, number>()
  for (const t of behaviorTypes) count.set(t.key, 0)
  for (const e of events) count.set(e.typeKey, (count.get(e.typeKey) || 0) + 1)
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
    series: [{
      type: 'pie',
      radius: ['38%', '66%'],
      center: ['50%', '40%'],
      label: { show: false },
      data: behaviorTypes.map(t => ({
        value: count.get(t.key) || 0,
        name: t.label,
        itemStyle: { color: t.color }
      }))
    }]
  }
}

// ===== 房间分布柱状图（按事件类型堆叠）=====
export function buildRoomOption(events: BehaviorEvent[]) {
  // 统计每个房间各类型事件数
  const roomCount = new Map<string, number>()
  const roomTypeCount = new Map<string, Record<string, number>>()
  for (const e of events) {
    roomCount.set(e.room, (roomCount.get(e.room) || 0) + 1)
    if (!roomTypeCount.has(e.room)) {
      roomTypeCount.set(e.room, {})
      for (const t of behaviorTypes) roomTypeCount.get(e.room)![t.key] = 0
    }
    roomTypeCount.get(e.room)![e.typeKey] = (roomTypeCount.get(e.room)![e.typeKey] || 0) + 1
  }
  // 按总数排序，取前8
  const rooms = Array.from(roomCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(e => e[0])

  const series = behaviorTypes.map(t => ({
    name: t.label,
    type: 'bar' as const,
    stack: 'total',
    barWidth: 20,
    data: rooms.map(r => roomTypeCount.get(r)?.[t.key] || 0),
    itemStyle: { color: t.color }
  }))

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        let html = `${params[0].axisValue}<br/>`
        let total = 0
        for (const p of params) {
          if (p.value > 0) {
            html += `${p.marker}${p.seriesName}: ${p.value}<br/>`
            total += p.value
          }
        }
        html += `<b>合计: ${total}</b>`
        return html
      }
    },
    legend: { data: behaviorTypes.map(t => t.label), bottom: 0, textStyle: { fontSize: 10 }, itemWidth: 10, itemHeight: 10 },
    grid: { top: 16, left: 40, right: 12, bottom: 36 },
    xAxis: { type: 'category', data: rooms, axisLabel: { fontSize: 10 } },
    yAxis: { type: 'value', axisLabel: { fontSize: 10 }, minInterval: 1 },
    series
  }
}

// ===== 排行数据 =====
export interface RankItem {
  key: string
  label: string
  count: number
  color?: string
  sub?: string
  avatar?: string        // 老人头像（按老人维度）
  icon?: string          // 事件类型图标（按类型维度）
}

// 排名颜色：1金 2银 3铜
export const rankMedalColors = ['#faad14', '#8c8c8c', '#d48806']
// 第4名起进度条循环色
export const rankBarColors = ['#6e4bff', '#1890ff', '#52c41a', '#13c2c2', '#722ed1', '#eb2f96', '#fa541c']

export function rankByPerson(events: BehaviorEvent[]): RankItem[] {
  const count = new Map<string, RankItem>()
  for (const e of events) {
    const info = personInfoMap[e.personId]
    if (!count.has(e.personId)) count.set(e.personId, {
      key: e.personId,
      label: e.personName,
      count: 0,
      avatar: info?.photo,
      sub: info ? `${info.building}` : ''
    })
    count.get(e.personId)!.count++
  }
  return Array.from(count.values()).sort((a, b) => b.count - a.count)
}

export function rankByType(events: BehaviorEvent[]): RankItem[] {
  const count = new Map<string, RankItem>()
  for (const e of events) {
    const t = behaviorTypes.find(x => x.key === e.typeKey)
    if (!count.has(e.typeKey)) count.set(e.typeKey, {
      key: e.typeKey,
      label: e.typeName,
      count: 0,
      color: typeColorMap[e.typeKey],
      icon: t?.icon
    })
    count.get(e.typeKey)!.count++
  }
  return Array.from(count.values()).sort((a, b) => b.count - a.count)
}

export function rankByRoom(events: BehaviorEvent[]): RankItem[] {
  const count = new Map<string, RankItem>()
  for (const e of events) {
    if (!count.has(e.room)) count.set(e.room, { key: e.room, label: e.room, count: 0, sub: e.building })
    count.get(e.room)!.count++
  }
  return Array.from(count.values()).sort((a, b) => b.count - a.count)
}

// ===== 老人树（楼栋→房间→老人）=====
export type NodeType = 'building' | 'room' | 'person'
export interface TreeNode {
  key: string
  value: string
  label: string
  nodeType: NodeType
  gender?: '男' | '女'   // 仅老人节点
  photo?: string          // 老人头像
  age?: number            // 老人年龄
  subLabel?: string       // 房间节点：老人数；老人节点：床位号
  children?: TreeNode[]
}
export function buildElderlyTree(): TreeNode[] {
  const buildingMap = new Map<string, Map<string, typeof persons>>()
  for (const p of persons) {
    if (!buildingMap.has(p.building)) buildingMap.set(p.building, new Map())
    const roomMap = buildingMap.get(p.building)!
    if (!roomMap.has(p.room)) roomMap.set(p.room, [])
    roomMap.get(p.room)!.push(p)
  }
  return Array.from(buildingMap.entries()).map(([building, roomMap]) => ({
    key: building,
    value: building,
    label: building,
    nodeType: 'building' as const,
    children: Array.from(roomMap.entries()).map(([room, list]) => ({
      key: room,
      value: room,
      label: room,
      nodeType: 'room' as const,
      subLabel: `${list.length}位老人`,
      children: list.map(p => ({
        key: p.id,
        value: p.id,
        label: p.name,
        nodeType: 'person' as const,
        gender: p.gender,
        photo: p.photo,
        age: p.age,
        subLabel: p.bedNo
      }))
    }))
  }))
}

// ===== 单个老人的行为时间轴 =====
export interface PersonTimelineEvent {
  id: string
  time: string
  date: string
  typeKey: string
  typeName: string
  desc: string
  location: string
  level: EventLevel
  handled: boolean
  snapshot: string
}

// 时间轴缩略图池（复用文搜图抓拍图）
import snap1 from '@/assets/text-search/result-01.jpg'
import snap2 from '@/assets/text-search/result-02.jpg'
import snap3 from '@/assets/text-search/result-03.jpg'
import snap4 from '@/assets/text-search/result-04.jpg'
import snap5 from '@/assets/text-search/result-05.jpg'
import snap6 from '@/assets/text-search/result-06.jpg'
const snapPool = [snap1, snap2, snap3, snap4, snap5, snap6]

export function buildPersonTimeline(personId: string, events: BehaviorEvent[]): PersonTimelineEvent[] {
  const today = new Date().toDateString()
  let i = 0
  return events
    .filter(e => e.personId === personId)
    .slice(0, 12)
    .map(e => {
      const d = new Date(e.timestamp)
      const isToday = d.toDateString() === today
      return {
        id: e.id,
        time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
        date: isToday ? '今天' : `${d.getMonth() + 1}-${d.getDate()}`,
        typeKey: e.typeKey,
        typeName: e.typeName,
        desc: e.desc,
        location: e.location,
        level: e.level,
        handled: e.handled,
        snapshot: snapPool[i++ % snapPool.length]
      }
    })
}

// ===== 行为预测 =====
export interface PredictionItem {
  typeKey: string
  typeName: string
  risk: 'high' | 'medium' | 'low'
  probability: number
  desc: string
  suggestion: string
}

export function buildPrediction(personId: string): PredictionItem[] {
  // 基于老人 id 确定性生成预测
  const seed = personId.charCodeAt(personId.length - 1)
  const items = [...behaviorTypes]
  return items.slice(0, 3 + (seed % 2)).map((t, i) => {
    const prob = 75 - (i * 18) - (seed % 10)
    const risk: PredictionItem['risk'] = prob > 60 ? 'high' : prob > 35 ? 'medium' : 'low'
    return {
      typeKey: t.key,
      typeName: t.label,
      risk,
      probability: Math.max(15, prob),
      desc: `根据近7日行为模式，该老人发生「${t.label}」的概率较高` ,
      suggestion: risk === 'high'
        ? '建议加强巡查频次，重点关注该老人'
        : risk === 'medium'
          ? '建议安排护工定期关注'
          : '保持常规护理即可'
    }
  })
}

// ===== 行为统计（堆叠条形图）=====
// 纵轴=日期，横轴=事件数，按行为类型色块堆叠
export function buildBehaviorStatsOption(personId: string, events: BehaviorEvent[], days: number) {
  // 生成最近 N 天的日期标签
  const dateList: string[] = []
  const now = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    dateList.push(`${d.getMonth() + 1}.${d.getDate()}`)
  }

  // 每天每类型计数
  const dayTypeCount: Record<string, Record<string, number>> = {}
  for (const dl of dateList) {
    dayTypeCount[dl] = {}
    for (const t of behaviorTypes) dayTypeCount[dl][t.key] = 0
  }
  for (const e of events) {
    if (e.personId !== personId) continue
    const d = new Date(e.timestamp)
    const key = `${d.getMonth() + 1}.${d.getDate()}`
    if (dayTypeCount[key]) {
      dayTypeCount[key][e.typeKey] = (dayTypeCount[key][e.typeKey] || 0) + 1
    }
  }

  const series = behaviorTypes.map(t => ({
    name: t.label,
    type: 'bar' as const,
    stack: 'total',
    barWidth: days <= 7 ? 16 : 8,
    data: dateList.map(dl => dayTypeCount[dl][t.key]),
    itemStyle: { color: t.color }
  }))

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: any) => {
        let html = `${params[0].axisValue}<br/>`
        let total = 0
        for (const p of params) {
          if (p.value > 0) {
            html += `${p.marker}${p.seriesName}: ${p.value}<br/>`
            total += p.value
          }
        }
        html += `<b>合计: ${total}</b>`
        return html
      }
    },
    legend: {
      data: behaviorTypes.map(t => t.label),
      bottom: 0,
      textStyle: { fontSize: 10 },
      itemWidth: 10,
      itemHeight: 10
    },
    grid: { top: 16, left: 44, right: 24, bottom: 40 },
    xAxis: { type: 'value', axisLabel: { fontSize: 10 }, minInterval: 1, splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } } },
    yAxis: {
      type: 'category',
      data: dateList,
      axisLabel: { fontSize: 10 },
      inverse: true
    },
    series
  }
}
