/**
 * 护工行为分析 mock 数据
 * - StaffWorkInfo: 护工 + 负责老人
 * - NursingEvent: 护理事件（含老人信息 + 事件信息）
 * - buildNursingEvents: 按条件生成护理事件
 */
import { buildStaffProfiles, buildElderly, type StaffProfile, type ElderlyPerson } from './bed.mock'
import { careTypes, type CareType } from './profile.mock'
import { eventSnapPool } from './behavior.mock'

// ===== 护工工作信息（含负责老人） =====
export interface StaffWorkInfo extends StaffProfile {
  elderlyIds: string[]  // 负责的老人 id 列表
}

const allElderly = buildElderly()

/** 构建护工工作信息：给每个护工分配 3-8 个负责老人 */
export function buildStaffWorkInfo(): StaffWorkInfo[] {
  const staff = buildStaffProfiles()
  const elderlyPool = [...allElderly]
  return staff.map((s, i) => {
    const count = 3 + (i % 6) // 3~8 个
    const elderlyIds: string[] = []
    for (let j = 0; j < count; j++) {
      const idx = (i * 3 + j * 7) % elderlyPool.length
      const e = elderlyPool[idx]
      if (!elderlyIds.includes(e.id)) elderlyIds.push(e.id)
    }
    return { ...s, elderlyIds }
  })
}

// ===== 护理事件 =====
export interface NursingEvent {
  id: string
  staffId: string
  elderlyId: string
  elderlyName: string
  elderlyPhoto: string
  elderlyRoom: string
  cameraName: string     // 摄像头名称
  cameraLocation: string // 摄像头位置
  typeKey: string
  typeName: string
  typeColor: string
  typeIcon: string
  title: string       // 事件类型标题
  desc: string        // 描述
  snapshot: string    // 图片
  time: string        // 'MM-DD HH:mm'
  timestamp: number
  duration: string    // 持续时间
}

const cameraNames = ['走廊摄像头A', '房间摄像头B', '活动室摄像头', '餐厅摄像头', '大厅摄像头', '护理站摄像头']
const cameraLocations = ['E栋/2F/走廊', 'E栋/2F/101室', 'E栋/1F/活动室', 'E栋/1F/餐厅', 'E栋/1F/大厅', 'E栋/2F/护理站']

const careDescs: Record<string, string[]> = {
  turn: ['协助老人完成翻身动作，调整至舒适体位，检查皮肤受压情况，确认无压疮迹象后整理床铺', '按时协助老人翻身预防压疮，同时观察老人面色及呼吸状态，整个过程老人配合良好', '协助老人从仰卧位更换为侧卧位，调整枕头高度确保呼吸道通畅，老人表示体位舒适'],
  medicine: ['按时为老人服用降压药一片，服药后观察十五分钟确认无不良反应，记录血压变化情况', '协助老人服用降糖药，服药前确认空腹血糖值，服药后提醒老人适量饮水并等待进餐', '餐后协助老人服用心血管药物，核对药品名称及剂量，服药后观察老人无明显不适'],
  patrol: ['常规巡房查看老人状态，老人意识清醒生命体征平稳，室内温度适宜，呼叫器功能正常', '晨间巡房确认老人已起床，协助整理床铺及个人卫生，老人精神状态良好食欲正常', '夜间巡房发现老人已安睡，呼吸均匀面色正常，检查护栏已升起，床边呼叫器在可及范围'],
  meal: ['协助老人完成午餐进食，调整坐位至舒适角度，全程观察吞咽情况无呛咳，进食量达到标准', '为老人提供温水协助饮水，确认水温适宜避免烫伤，老人饮水后口唇湿润无脱水迹象', '按照营养餐计划为老人提供餐食，协助老人使用餐具完成进食，餐后清洁口腔及面部'],
  clean: ['协助老人完成面部清洁，使用温水毛巾擦拭，清洁后涂抹润肤霜保持皮肤湿润，老人感觉舒适', '为老人更换干净衣物，协助老人完成穿脱动作，更换后整理旧衣物并检查皮肤有无异常', '整理老人床铺卫生，更换床单被套，清扫床周区域，确保老人休息环境整洁舒适'],
  response: ['老人按下呼叫器，护工两分钟内到达现场，老人表示需要协助如厕，全程搀扶完成无意外发生', '呼叫器响应后立即到达老人床前，老人反映身体不适，测量体温血压后通知值班医生处理']
}

const elderlyMap: Record<string, ElderlyPerson> = Object.fromEntries(allElderly.map(e => [e.id, e]))

/**
 * 生成某护工的护理事件
 * @param staffId 护工 id
 * @param elderlyIds 该护工负责的老人 id 列表
 * @param filters 筛选条件
 */
export function buildNursingEvents(
  staffId: string,
  elderlyIds: string[],
  filters?: {
    dateRange?: [string, string] | null  // ['MM-DD', 'MM-DD']
    elderlyId?: string | null
    typeKey?: string | null
    keyword?: string
  }
): NursingEvent[] {
  const out: NursingEvent[] = []
  let eid = 0
  const now = Date.now()
  const days = filters?.dateRange ? 7 : 30  // 有日期范围则取近 7 天，否则 30 天

  const targetElderly = filters?.elderlyId
    ? elderlyIds.filter(id => id === filters.elderlyId)
    : elderlyIds

  for (let day = 0; day < days; day++) {
    for (const pid of targetElderly) {
      const count = 1 + ((day * 5 + pid.charCodeAt(2)) % 4) // 每天 1~4 条
      for (let i = 0; i < count; i++) {
        eid++
        const typeIdx = (eid * 7 + day) % careTypes.length
        const t = careTypes[typeIdx]

        // 类型筛选
        if (filters?.typeKey && t.key !== filters.typeKey) continue

        const e = elderlyMap[pid]
        if (!e) continue

        const ts = now - day * 86400000 - (i % 24) * 3600000 - (eid % 60) * 60000
        const d = new Date(ts)
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const hh = String(d.getHours()).padStart(2, '0')
        const mi = String(d.getMinutes()).padStart(2, '0')
        const timeStr = `${mm}-${dd} ${hh}:${mi}`

        // 日期范围筛选
        if (filters?.dateRange) {
          const dateStr = `${mm}-${dd}`
          if (dateStr < filters.dateRange[0] || dateStr > filters.dateRange[1]) continue
        }

        const desc = careDescs[t.key][eid % careDescs[t.key].length]

        // 关键字筛选
        if (filters?.keyword) {
          const kw = filters.keyword.toLowerCase()
          if (!e.name.toLowerCase().includes(kw) &&
              !t.label.toLowerCase().includes(kw) &&
              !desc.toLowerCase().includes(kw)) continue
        }

        out.push({
          id: `ne-${staffId}-${eid}`,
          staffId,
          elderlyId: pid,
          elderlyName: e.name,
          elderlyPhoto: e.photo || '',
          elderlyRoom: `${e.building} · ${e.room}`,
          cameraName: cameraNames[eid % cameraNames.length],
          cameraLocation: cameraLocations[eid % cameraLocations.length],
          typeKey: t.key,
          typeName: t.label,
          typeColor: t.color,
          typeIcon: t.icon,
          title: t.label,
          desc,
          snapshot: eventSnapPool[eid % eventSnapPool.length],
          time: timeStr,
          timestamp: ts,
          duration: `${2 + (eid % 8)}分钟`
        })
      }
    }
  }
  return out.sort((a, b) => b.timestamp - a.timestamp)
}

// ===== 护理事件类型选项 =====
export { careTypes, type CareType }

// ===== 老人树（用于 a-tree-select） =====
export interface ElderlyTreeNode {
  value: string
  label: string
  children?: ElderlyTreeNode[]
}

/** 构建房间→老人树（供 tree-select 使用） */
export function buildElderlyTree(elderlyIds?: string[]): ElderlyTreeNode[] {
  const targetIds = elderlyIds ? new Set(elderlyIds) : null
  const targetElderly = targetIds ? allElderly.filter(e => targetIds.has(e.id)) : allElderly

  // 按楼栋+房间分组
  const roomMap = new Map<string, { room: string; building: string; elderly: ElderlyPerson[] }>()
  for (const e of targetElderly) {
    const key = e.building + e.room
    if (!roomMap.has(key)) roomMap.set(key, { room: e.room, building: e.building, elderly: [] })
    roomMap.get(key)!.elderly.push(e)
  }

  // 按楼栋分组
  const buildingMap = new Map<string, { building: string; rooms: typeof roomMap }>()
  for (const [, val] of roomMap) {
    if (!buildingMap.has(val.building)) buildingMap.set(val.building, { building: val.building, rooms: new Map() })
    buildingMap.get(val.building)!.rooms.set(val.room, val)
  }

  return Array.from(buildingMap.values()).map(b => ({
    value: `building-${b.building}`,
    label: b.building,
    children: Array.from(b.rooms.values()).map(r => ({
      value: `room-${r.building}-${r.room}`,
      label: r.room,
      children: r.elderly.map(e => ({
        value: e.id,
        label: `${e.name}（${e.bedNo}）`
      }))
    }))
  }))
}
