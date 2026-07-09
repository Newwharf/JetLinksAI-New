/**
 * 告警事件 mock 数据
 * 两级结构：
 *   AlarmEvent  —— 一个识别算法/告警源产生的告警事件（聚合）
 *   AlarmRecord —— 该事件下的一条告警明细（单次触发）
 */
import thumb01 from '@/assets/text-search/result-01.jpg'
import thumb02 from '@/assets/text-search/result-02.jpg'
import thumb03 from '@/assets/text-search/result-03.jpg'
import thumb04 from '@/assets/text-search/result-04.jpg'
import thumb05 from '@/assets/text-search/result-05.jpg'
import thumb06 from '@/assets/text-search/result-06.jpg'
import thumb07 from '@/assets/text-search/result-07.jpg'
import thumb08 from '@/assets/text-search/result-08.jpg'
import thumb09 from '@/assets/text-search/result-09.jpg'
import thumb10 from '@/assets/text-search/result-10.jpg'

export type AlarmLevel = '紧急' | '警告' | '提示'
export type AlarmStatus = '待处理' | '处理中' | '已处理'

// ===== 告警事件（算法/规则维度）=====
export interface AlarmEvent {
  id: string
  /** 事件名称（识别算法名） */
  name: string
  /** 图标 */
  icon: string
  /** 事件下告警明细数 */
  count: number
  /** 待处理数 */
  pending: number
  /** 最高级别（用于排序与角标） */
  level: AlarmLevel
  /** 最近触发时间 */
  lastTime: string
}

// ===== 告警明细（单条触发记录）=====
export interface AlarmRecord {
  id: string
  /** 所属事件 id */
  eventId: string
  /** 截图 */
  thumb: string
  /** 告警标题 */
  title: string
  /** 级别 */
  level: AlarmLevel
  /** 状态 */
  status: AlarmStatus
  /** 触发时间 */
  time: string
  /** 触发摄像头 */
  camera: string
  /** 所属网关 */
  gateway: string
  /** 区域完整路径 */
  areaPath: string[]
  /** 目标类型（人员/车辆/物品等） */
  target: string
  /** 置信度 % */
  confidence: number
  /** 描述 */
  desc: string
}

// 5 个告警事件
export const alarmEvents: AlarmEvent[] = [
  { id: 'e1', name: '入侵识别', icon: 'i-ant-design-safety-certificate-outlined', count: 6, pending: 3, level: '紧急', lastTime: '09:12' },
  { id: 'e2', name: '异常烟火', icon: 'i-ant-design-fire-outlined', count: 4, pending: 1, level: '紧急', lastTime: '07:30' },
  { id: 'e3', name: '抽烟识别', icon: 'i-ant-design-safety-outlined', count: 5, pending: 2, level: '警告', lastTime: '10:05' },
  { id: 'e4', name: '车辆逆行', icon: 'i-ant-design-car-outlined', count: 3, pending: 1, level: '警告', lastTime: '08:46' },
  { id: 'e5', name: '物品遗留', icon: 'i-ant-design-shopping-outlined', count: 4, pending: 0, level: '提示', lastTime: '昨日 18:22' }
]

// 各事件下的告警明细
export const alarmRecords: AlarmRecord[] = [
  // 入侵识别
  { id: 'r1', eventId: 'e1', thumb: thumb01, title: '人员闯入禁入区域', level: '紧急', status: '待处理', time: '2026-07-07 09:12', camera: '东门摄像头', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '4F', '研发部办公区'], target: '人员', confidence: 96, desc: 'AI 识别到未授权人员翻越东门围栏进入禁入区域，持续 8 秒。' },
  { id: 'r2', eventId: 'e1', thumb: thumb02, title: '夜间人员闯入', level: '紧急', status: '待处理', time: '2026-07-07 02:14', camera: '北门摄像头', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '人员', confidence: 92, desc: '凌晨时段检测到人员靠近北门禁入边界。' },
  { id: 'r3', eventId: 'e1', thumb: thumb03, title: '围栏翻越', level: '紧急', status: '处理中', time: '2026-07-06 23:40', camera: '南门摄像头', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '人员', confidence: 88, desc: '检测到人员翻越南门围栏。' },
  { id: 'r4', eventId: 'e1', thumb: thumb04, title: '禁入区域滞留', level: '警告', status: '待处理', time: '2026-07-06 18:55', camera: '车库摄像头', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '人员', confidence: 84, desc: '人员在车库禁入区域滞留超过 5 分钟。' },
  { id: 'r5', eventId: 'e1', thumb: thumb05, title: '越界告警', level: '警告', status: '已处理', time: '2026-07-06 14:20', camera: '入口摄像头', gateway: 'A栋网关', areaPath: ['物联网产业园区', 'A栋', '1F', '运营办公室'], target: '人员', confidence: 79, desc: '人员越过运营办公室设定的警戒线。' },
  { id: 'r6', eventId: 'e1', thumb: thumb06, title: '非法闯入', level: '提示', status: '已处理', time: '2026-07-05 11:08', camera: '东门摄像头', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '4F', '研发部办公区'], target: '人员', confidence: 71, desc: '非工作时段检测到人员进入。' },

  // 异常烟火
  { id: 'r7', eventId: 'e2', thumb: thumb07, title: '疑似烟火', level: '紧急', status: '待处理', time: '2026-07-07 07:30', camera: '前台摄像头', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '烟火', confidence: 94, desc: '检测到疑似烟雾火光，请立即现场确认。' },
  { id: 'r8', eventId: 'e2', thumb: thumb08, title: '明火识别', level: '紧急', status: '已处理', time: '2026-07-06 20:15', camera: '电梯口摄像头', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '烟火', confidence: 90, desc: '电梯口区域识别到明火。' },
  { id: 'r9', eventId: 'e2', thumb: thumb09, title: '烟雾告警', level: '警告', status: '已处理', time: '2026-07-06 12:40', camera: '前台摄像头', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '烟火', confidence: 82, desc: '前台区域烟雾浓度异常。' },
  { id: 'r10', eventId: 'e2', thumb: thumb10, title: '高温异常', level: '提示', status: '已处理', time: '2026-07-05 16:22', camera: '电梯口摄像头', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '烟火', confidence: 68, desc: '检测到局部高温区域。' },

  // 抽烟识别
  { id: 'r11', eventId: 'e3', thumb: thumb01, title: '禁烟区吸烟', level: '警告', status: '待处理', time: '2026-07-07 10:05', camera: '大厅摄像头A', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '4F', '研发部办公区'], target: '人员', confidence: 89, desc: '在禁烟区域检测到人员吸烟动作。' },
  { id: 'r12', eventId: 'e3', thumb: thumb02, title: '走廊吸烟', level: '警告', status: '待处理', time: '2026-07-07 09:30', camera: '走廊摄像头B', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '4F', '项目部办公区'], target: '人员', confidence: 85, desc: '项目部走廊检测到吸烟行为。' },
  { id: 'r13', eventId: 'e3', thumb: thumb03, title: '卫生间吸烟', level: '提示', status: '已处理', time: '2026-07-06 15:50', camera: '前台摄像头', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '人员', confidence: 76, desc: '公共卫生间入口检测到吸烟。' },
  { id: 'r14', eventId: 'e3', thumb: thumb04, title: '楼梯间吸烟', level: '提示', status: '已处理', time: '2026-07-06 11:20', camera: '电梯口摄像头', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '人员', confidence: 73, desc: '楼梯间检测到吸烟行为。' },
  { id: 'r15', eventId: 'e3', thumb: thumb05, title: '办公区吸烟', level: '提示', status: '已处理', time: '2026-07-05 17:40', camera: '会议室摄像头', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '4F', '项目部办公区'], target: '人员', confidence: 70, desc: '会议室区域检测到吸烟。' },

  // 车辆逆行
  { id: 'r16', eventId: 'e4', thumb: thumb06, title: '车辆逆行', level: '警告', status: '待处理', time: '2026-07-07 08:46', camera: '车库摄像头', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '车辆', confidence: 91, desc: '地下车库出口检测到车辆逆行驶入。' },
  { id: 'r17', eventId: 'e4', thumb: thumb07, title: '单向道逆行', level: '警告', status: '已处理', time: '2026-07-06 19:10', camera: '入口摄像头', gateway: 'A栋网关', areaPath: ['物联网产业园区', 'A栋', '1F', '运营办公室'], target: '车辆', confidence: 87, desc: 'A 栋入口单向道检测到逆行车辆。' },
  { id: 'r18', eventId: 'e4', thumb: thumb08, title: '禁行方向行驶', level: '提示', status: '已处理', time: '2026-07-05 08:30', camera: '车库摄像头', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '车辆', confidence: 72, desc: '车库禁行方向检测到车辆行驶。' },

  // 物品遗留
  { id: 'r19', eventId: 'e5', thumb: thumb09, title: '物品遗留', level: '提示', status: '已处理', time: '2026-07-06 18:22', camera: '运营办公室摄像头', gateway: 'A栋网关', areaPath: ['物联网产业园区', 'A栋', '1F', '运营办公室'], target: '物品', confidence: 81, desc: '运营办公室检测到遗留物品超过 10 分钟。' },
  { id: 'r20', eventId: 'e5', thumb: thumb10, title: '行李遗留', level: '提示', status: '已处理', time: '2026-07-06 14:05', camera: '前台摄像头', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '物品', confidence: 78, desc: '前台区域检测到无人认领行李。' },
  { id: 'r21', eventId: 'e5', thumb: thumb01, title: '包裹遗留', level: '提示', status: '已处理', time: '2026-07-05 20:18', camera: '电梯口摄像头', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '物品', confidence: 75, desc: '电梯口检测到遗留包裹。' },
  { id: 'r22', eventId: 'e5', thumb: thumb02, title: '杂物堆积', level: '提示', status: '已处理', time: '2026-07-05 10:50', camera: '走廊摄像头B', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '4F', '项目部办公区'], target: '物品', confidence: 69, desc: '项目部走廊检测到杂物长时间堆积。' }
]

/** 区域路径转展示字符串 */
export function areaText(path: string[]): string {
  return path.length > 0 ? path.join(' / ') : ''
}
