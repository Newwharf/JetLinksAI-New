/**
 * 人员档案 mock 数据
 * 字段说明：
 *  - faces: 人脸图片集合（至少一张），首张作为封面
 *  - keyFocus: 是否为重点关注
 *  - lastSeen: 最后出现信息（时间 + 摄像头 + 区域路径）
 *  - events: 识别到该人员的事件列表（详情页展示）
 *  - weekHeat: 周热力矩阵 [7][24]，值 = 该时段事件数，0 = 无事件（空格）
 */
import face01 from '@/assets/text-search/result-01.jpg'
import face02 from '@/assets/text-search/result-02.jpg'
import face03 from '@/assets/text-search/result-03.jpg'
import face04 from '@/assets/text-search/result-04.jpg'
import face05 from '@/assets/text-search/result-05.jpg'
import face06 from '@/assets/text-search/result-06.jpg'
import face07 from '@/assets/text-search/result-07.jpg'
import face08 from '@/assets/text-search/result-08.jpg'
import face09 from '@/assets/text-search/result-09.jpg'
import face10 from '@/assets/text-search/result-10.jpg'

export interface BBox {
  x: number // %
  y: number // %
  w: number // %
  h: number // %
}

export interface PersonProfile {
  id: string
  name: string
  remark: string
  faces: string[]          // 人脸图片（至少一张），首张为封面
  faceBoxes: BBox[]        // 封面图人脸检测框
  keyFocus: boolean        // 重点关注
  createdAt: string
  lastSeenAt: string       // 最后出现时间
  lastSeenCamera: string   // 最后出现摄像头
  lastSeenArea: string     // 最后出现区域路径
  eventCount: number       // 事件总数
  events: ProfileEvent[]   // 事件列表（含 weekday/hour，热力由其聚合）
  weekHeat: number[][]     // 周热力矩阵 [7][24]
}

export interface ProfileEvent {
  id: string
  time: string             // 'MM-DD HH:mm'
  weekday: number          // 0~6 周一~周日（用于周热力关联）
  hour: number             // 0~23 小时（用于周热力关联）
  camera: string
  areaPath: string
  snapshot: string         // 抓拍图
  snapshotBox: BBox        // 抓拍图人脸框
  similarity: number       // 相似度 %
}

// ---- 由事件列表聚合生成周热力矩阵 ----
export function buildWeekHeat(events: ProfileEvent[]): number[][] {
  const week: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0))
  for (const ev of events) {
    week[ev.weekday][ev.hour] += 1
  }
  return week
}

const facePool = [face01, face02, face03, face04, face05, face06, face07, face08, face09, face10]
const camNames = ['东门摄像头', '大厅摄像头A', '走廊摄像头B', '车库摄像头', '南门摄像头', '前台摄像头', '电梯口摄像头', '会议室摄像头']
const areaPaths = [
  'E栋/4F/研发部办公区',
  'E栋/4F/项目部办公区',
  'E栋/2F/停车区',
  'E栋/2F/前台',
  'A栋/1F/运营办公室',
  'A栋/1F/入口'
]

// 初始人员档案
export function buildPersonProfiles(): PersonProfile[] {
  const base: Array<Partial<PersonProfile> & { name: string; remark: string }> = [
    { name: '张伟', remark: '研发部工程师，日常出入 E 栋', keyFocus: true },
    { name: '李娜', remark: '项目部产品经理' },
    { name: '王强', remark: '访客，需关注行踪', keyFocus: true },
    { name: '刘洋', remark: '运营办公室员工' },
    { name: '陈静', remark: '前台接待' },
    { name: '赵磊', remark: '供应商，每月来访' },
    { name: '孙芳', remark: '保洁人员' },
    { name: '周杰', remark: '运维工程师' }
  ]

  return base.map((p, i) => {
    const face = facePool[i % facePool.length]
    const face2 = facePool[(i + 3) % facePool.length]
    const eventCount = 6 + (i % 7)
    const faces = i % 2 === 0 ? [face, face2] : [face]
    const events = genEvents(`pf-${i + 1}`, faces, eventCount, i + 1)
    // 最近一次事件作为 lastSeen
    const latest = events[0]
    return {
      id: `pf-${i + 1}`,
      name: p.name,
      remark: p.remark || '',
      faces,
      faceBoxes: [{ x: 25, y: 12, w: 50, h: 65 }],
      keyFocus: p.keyFocus === true,
      createdAt: '2026-06-2' + (i % 9),
      lastSeenAt: latest ? latest.time : '—',
      lastSeenCamera: latest ? latest.camera : '—',
      lastSeenArea: latest ? latest.areaPath : '—',
      eventCount,
      events,
      weekHeat: buildWeekHeat(events)
    } as PersonProfile
  })
}

// 确定性生成人员事件列表（含 weekday/hour，与周热力一致）
function genEvents(profileId: string, faces: string[], n: number, seed: number): ProfileEvent[] {
  const evs: ProfileEvent[] = []
  for (let i = 0; i < n; i++) {
    const ci = (i + profileId.length) % camNames.length
    const ai = (i + profileId.length) % areaPaths.length
    const hour = 8 + (i * 2) % 12
    const minute = (i * 13) % 60
    const weekday = (seed * 3 + i * 2) % 7
    evs.push({
      id: `${profileId}-ev-${i + 1}`,
      time: `07-0${(weekday + 1)} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      weekday,
      hour,
      camera: camNames[ci],
      areaPath: areaPaths[ai],
      snapshot: faces[i % faces.length],
      snapshotBox: { x: 25, y: 15, w: 45, h: 60 },
      similarity: 88 + ((i * 7) % 11)
    })
  }
  return evs
}

// 人员事件列表（详情页）：优先用 profile.events，否则按规则生成
export function buildPersonEvents(profile: PersonProfile): ProfileEvent[] {
  if (profile.events && profile.events.length > 0) return profile.events
  return genEvents(profile.id, profile.faces.length ? profile.faces : [facePool[0]], profile.eventCount, profile.id.length)
}

// 共享摄像头区域（新增弹窗 / 详情使用）
export const cameraOptions = camNames
export const areaPathOptions = areaPaths

export const WEEK_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
export const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => i)
