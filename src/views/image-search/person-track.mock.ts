/**
 * 临时轨迹跟踪 mock 数据
 * 字段说明：
 *  - faces: 人脸图片，首张为封面
 *  - status: 跟踪状态，tracking(跟踪中) / ended(已结束)
 *  - startedAt / endedAt: 跟踪起止时间
 *  - reason: 发起跟踪的原因/备注
 *  - events: 在哪些摄像头、哪个时间段出现过的事件列表
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

export interface BBox {
  x: number // %
  y: number // %
  w: number // %
  h: number // %
}

export interface TrackedPerson {
  id: string
  name: string
  faces: string[]         // 人脸图片，首张封面
  faceBoxes: BBox[]       // 封面图人脸检测框
  gender: '男' | '女' | '未知'
  ageRange: string        // 年龄段，如 '30-40'
  status: 'tracking' | 'ended'  // 跟踪中 / 已结束
  reason: string          // 发起跟踪原因
  startedAt: string       // 跟踪开始时间 'MM-DD HH:mm'
  endedAt: string         // 跟踪结束时间（tracking 中为空）
  lastSeenAt: string      // 最后出现时间
  lastSeenCamera: string  // 最后出现摄像头
  lastSeenArea: string    // 最后出现区域
  eventCount: number      // 出现事件总数
}

export interface TrackEvent {
  id: string
  camera: string          // 摄像头
  areaPath: string        // 区域路径
  startTime: string       // 出现起始 'MM-DD HH:mm'
  endTime: string         // 出现结束 'MM-DD HH:mm'
  duration: number        // 持续秒数
  snapshot: string        // 抓拍图
}

const facePool = [face01, face02, face03, face04, face05, face06, face07, face08, face09]
const camNames = [
  '东门摄像头', '大厅摄像头A', '走廊摄像头B', '车库摄像头',
  '南门摄像头', '前台摄像头', '电梯口摄像头', '会议室摄像头'
]
const areaPaths = [
  'E栋/1F/东门',
  'E栋/1F/大厅',
  'E栋/2F/走廊',
  'E栋/B1/停车区',
  'A栋/1F/南门',
  'A栋/1F/前台',
  'E栋/3F/电梯口',
  'E栋/4F/会议室'
]

// 初始临时跟踪人员
export function buildTrackedPersons(): TrackedPerson[] {
  const base: Array<Partial<TrackedPerson> & { name: string; reason: string }> = [
    { name: '陌生男-黑衣', reason: '凌晨在东门徘徊，行为可疑', status: 'tracking', gender: '男', ageRange: '30-40' },
    { name: '红衣女子', reason: '在多个楼层快速移动，需要关注', status: 'tracking', gender: '女', ageRange: '25-30' },
    { name: '戴帽访客', reason: '未登记访客，逗留时间较长', status: 'ended', gender: '男', ageRange: '40-50' },
    { name: '外卖员A', reason: '非工作时间进入办公区', status: 'tracking', gender: '男', ageRange: '20-25' },
    { name: '蓝衣男子', reason: '多次在车库入口停留', status: 'ended', gender: '男', ageRange: '35-45' },
    { name: '白帽女士', reason: '走失人员家属协助查找', status: 'tracking', gender: '女', ageRange: '60-70' }
  ]

  return base.map((p, i) => {
    const face = facePool[i % facePool.length]
    const face2 = facePool[(i + 4) % facePool.length]
    const camIdx = i % camNames.length
    const areaIdx = i % areaPaths.length
    const isTracking = p.status === 'tracking'
    return {
      id: `pt-${i + 1}`,
      name: p.name,
      faces: i % 2 === 0 ? [face, face2] : [face],
      faceBoxes: [{ x: 25, y: 12, w: 50, h: 65 }],
      gender: p.gender || '未知',
      ageRange: p.ageRange || '未知',
      status: isTracking ? 'tracking' : 'ended',
      reason: p.reason,
      startedAt: `07-0${(i % 7) + 1} ${String(8 + i).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`,
      endedAt: isTracking ? '' : `07-0${(i % 7) + 1} ${String(18 + i).padStart(2, '0')}:${String((i * 11) % 60).padStart(2, '0')}`,
      lastSeenAt: `07-08 ${String(9 + i).padStart(2, '0')}:${String(20 + i * 3).padStart(2, '0')}`,
      lastSeenCamera: camNames[camIdx],
      lastSeenArea: areaPaths[areaIdx],
      eventCount: 4 + (i % 6)
    } as TrackedPerson
  })
}

// 生成某个跟踪人员的出现事件列表（按时间倒序）
export function buildTrackEvents(person: TrackedPerson): TrackEvent[] {
  const evs: TrackEvent[] = []
  const n = person.eventCount
  for (let i = 0; i < n; i++) {
    const ci = (i + person.id.length) % camNames.length
    const ai = (i + person.id.length) % areaPaths.length
    const day = (i % 6) + 1
    const sh = 8 + (i * 2) % 12
    const sm = (i * 13) % 60
    const dur = 30 + (i * 17) % 600  // 30s ~ 10min
    const eh = sh + Math.floor(dur / 3600)
    const em = sm + Math.floor((dur % 3600) / 60)
    evs.push({
      id: `${person.id}-ev-${i + 1}`,
      camera: camNames[ci],
      areaPath: areaPaths[ai],
      startTime: `07-0${day} ${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}`,
      endTime: `07-0${day} ${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`,
      duration: dur,
      snapshot: person.faces[i % person.faces.length]
    })
  }
  // 倒序（最近在前）
  return evs.reverse()
}

// 持续时间格式化：秒 → 'Xm Ys' / 'Xh Ym'
export function formatDuration(sec: number): string {
  if (sec < 60) return `${sec}s`
  if (sec < 3600) return `${Math.floor(sec / 60)}m`
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export const cameraOptions = camNames
export const areaPathOptions = areaPaths
