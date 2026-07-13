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

export type AlarmLevel = '超紧急' | '紧急' | '严重' | '一般' | '提醒'
export type AlarmStatus = '待处理' | '已处理'

// ===== 告警事件（算法/规则维度）=====
export interface AlarmEvent {
  id: string
  /** 事件名称（识别算法名） */
  name: string
  /** 图标 */
  icon: string
  /** 所属场景 */
  scene: string
  /** 事件下告警明细数 */
  count: number
  /** 待处理数 */
  pending: number
  /** 最高级别 */
  level: AlarmLevel
  /** 最近触发时间 */
  lastTime: string
}

/** 单个检测目标的置信度 */
export interface DetectionTarget {
  /** 目标类型（人员/车辆/物品/烟火等） */
  type: string
  /** 置信度 % */
  confidence: number
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
  /** 是否有效告警（false = AI 复判为误报已拦截） */
  valid: boolean
  /** 触发时间 */
  time: string
  /** 触发摄像头 */
  camera: string
  /** 所属网关 */
  gateway: string
  /** 区域完整路径 */
  areaPath: string[]
  /** 目标类型（兼容旧字段） */
  target: string
  /** 置信度 %（兼容旧字段，取 targets 中最大值） */
  confidence: number
  /** 多目标置信度列表 */
  targets: DetectionTarget[]
  /** 描述 */
  desc: string
}

// 5 个告警事件
export const alarmEvents: AlarmEvent[] = [
  { id: 'e1', name: '入侵识别', icon: 'i-ant-design-safety-certificate-outlined', scene: '入侵检测', count: 6, pending: 3, level: '超紧急', lastTime: '09:12' },
  { id: 'e2', name: '异常烟火', icon: 'i-ant-design-fire-outlined', scene: '烟火检测', count: 4, pending: 1, level: '紧急', lastTime: '07:30' },
  { id: 'e3', name: '抽烟识别', icon: 'i-ant-design-safety-outlined', scene: '人员行为', count: 5, pending: 2, level: '严重', lastTime: '10:05' },
  { id: 'e4', name: '车辆逆行', icon: 'i-ant-design-car-outlined', scene: '车辆管理', count: 3, pending: 1, level: '一般', lastTime: '08:46' },
  { id: 'e5', name: '物品遗留', icon: 'i-ant-design-shopping-outlined', scene: '物品安全', count: 4, pending: 0, level: '提醒', lastTime: '昨日 18:22' }
]

// 场景图标映射
export const sceneIcons: Record<string, string> = {
  '入侵检测': 'i-ant-design-safety-outlined',
  '烟火检测': 'i-ant-design-fire-outlined',
  '人员行为': 'i-ant-design-team-outlined',
  '车辆管理': 'i-ant-design-car-outlined',
  '物品安全': 'i-ant-design-property-safety-outlined'
}

// 各事件下的告警明细
export const alarmRecords: AlarmRecord[] = [
  // 入侵识别
  { id: 'r1', eventId: 'e1', thumb: thumb01, title: '人员闯入禁入区域', level: '超紧急', status: '待处理', valid: true, time: '2026-07-07 09:12', camera: '东门摄像头', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '4F', '研发部办公区'], target: '人员', confidence: 96, targets: [{ type: '人员', confidence: 96 }, { type: '人员', confidence: 88 }, { type: '人员', confidence: 72 }], desc: 'AI 识别到未授权人员翻越东门围栏进入禁入区域，持续 8 秒。' },
  { id: 'r2', eventId: 'e1', thumb: thumb02, title: '夜间人员闯入', level: '超紧急', status: '待处理', valid: true, time: '2026-07-07 02:14', camera: '北门摄像头', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '人员', confidence: 92, targets: [{ type: '人员', confidence: 92 }], desc: '凌晨时段检测到人员靠近北门禁入边界。' },
  { id: 'r3', eventId: 'e1', thumb: thumb03, title: '围栏翻越', level: '紧急', status: '待处理', valid: true, time: '2026-07-06 23:40', camera: '南门摄像头', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '人员', confidence: 88, targets: [{ type: '人员', confidence: 88 }, { type: '人员', confidence: 76 }], desc: '检测到人员翻越南门围栏。' },
  { id: 'r4', eventId: 'e1', thumb: thumb04, title: '禁入区域滞留', level: '严重', status: '待处理', valid: false, time: '2026-07-06 18:55', camera: '车库摄像头', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '人员', confidence: 84, targets: [{ type: '人员', confidence: 84 }], desc: 'AI 复判：检测到的为保洁人员例行清洁，非异常滞留。' },
  { id: 'r5', eventId: 'e1', thumb: thumb05, title: '越界告警', level: '一般', status: '已处理', valid: true, time: '2026-07-06 14:20', camera: '入口摄像头', gateway: 'A栋网关', areaPath: ['物联网产业园区', 'A栋', '1F', '运营办公室'], target: '人员', confidence: 79, targets: [{ type: '人员', confidence: 79 }, { type: '人员', confidence: 65 }], desc: '人员越过运营办公室设定的警戒线。' },
  { id: 'r6', eventId: 'e1', thumb: thumb06, title: '非法闯入', level: '提醒', status: '已处理', valid: true, time: '2026-07-05 11:08', camera: '东门摄像头', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '4F', '研发部办公区'], target: '人员', confidence: 71, targets: [{ type: '人员', confidence: 71 }], desc: '非工作时段检测到人员进入。' },

  // 异常烟火
  { id: 'r7', eventId: 'e2', thumb: thumb07, title: '疑似烟火', level: '紧急', status: '待处理', valid: true, time: '2026-07-07 07:30', camera: '前台摄像头', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '烟火', confidence: 94, targets: [{ type: '烟火', confidence: 94 }], desc: '检测到疑似烟雾火光，请立即现场确认。' },
  { id: 'r8', eventId: 'e2', thumb: thumb08, title: '明火识别', level: '严重', status: '已处理', valid: true, time: '2026-07-06 20:15', camera: '电梯口摄像头', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '烟火', confidence: 90, targets: [{ type: '烟火', confidence: 90 }], desc: '电梯口区域识别到明火。' },
  { id: 'r9', eventId: 'e2', thumb: thumb09, title: '烟雾告警', level: '一般', status: '已处理', valid: false, time: '2026-07-06 12:40', camera: '前台摄像头', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '烟火', confidence: 82, targets: [{ type: '烟火', confidence: 82 }], desc: 'AI 复判：为水蒸气而非烟雾，已拦截误报。' },
  { id: 'r10', eventId: 'e2', thumb: thumb10, title: '高温异常', level: '提醒', status: '已处理', valid: true, time: '2026-07-05 16:22', camera: '电梯口摄像头', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '烟火', confidence: 68, targets: [{ type: '烟火', confidence: 68 }], desc: '检测到局部高温区域。' },

  // 抽烟识别
  { id: 'r11', eventId: 'e3', thumb: thumb01, title: '禁烟区吸烟', level: '严重', status: '待处理', valid: true, time: '2026-07-07 10:05', camera: '大厅摄像头A', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '4F', '研发部办公区'], target: '人员', confidence: 89, targets: [{ type: '人员', confidence: 89 }, { type: '人员', confidence: 75 }], desc: '在禁烟区域检测到人员吸烟动作。' },
  { id: 'r12', eventId: 'e3', thumb: thumb02, title: '走廊吸烟', level: '严重', status: '待处理', valid: true, time: '2026-07-07 09:30', camera: '走廊摄像头B', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '4F', '项目部办公区'], target: '人员', confidence: 85, targets: [{ type: '人员', confidence: 85 }], desc: '项目部走廊检测到吸烟行为。' },
  { id: 'r13', eventId: 'e3', thumb: thumb03, title: '卫生间吸烟', level: '一般', status: '已处理', valid: true, time: '2026-07-06 15:50', camera: '前台摄像头', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '人员', confidence: 76, targets: [{ type: '人员', confidence: 76 }], desc: '公共卫生间入口检测到吸烟。' },
  { id: 'r14', eventId: 'e3', thumb: thumb04, title: '楼梯间吸烟', level: '提醒', status: '已处理', valid: false, time: '2026-07-06 11:20', camera: '电梯口摄像头', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '人员', confidence: 73, targets: [{ type: '人员', confidence: 73 }], desc: 'AI 复判：为手持电子设备反光，非吸烟动作。' },
  { id: 'r15', eventId: 'e3', thumb: thumb05, title: '办公区吸烟', level: '提醒', status: '已处理', valid: true, time: '2026-07-05 17:40', camera: '会议室摄像头', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '4F', '项目部办公区'], target: '人员', confidence: 70, targets: [{ type: '人员', confidence: 70 }], desc: '会议室区域检测到吸烟。' },

  // 车辆逆行
  { id: 'r16', eventId: 'e4', thumb: thumb06, title: '车辆逆行', level: '一般', status: '待处理', valid: true, time: '2026-07-07 08:46', camera: '车库摄像头', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '车辆', confidence: 91, targets: [{ type: '车辆', confidence: 91 }], desc: '地下车库出口检测到车辆逆行驶入。' },
  { id: 'r17', eventId: 'e4', thumb: thumb07, title: '单向道逆行', level: '一般', status: '已处理', valid: true, time: '2026-07-06 19:10', camera: '入口摄像头', gateway: 'A栋网关', areaPath: ['物联网产业园区', 'A栋', '1F', '运营办公室'], target: '车辆', confidence: 87, targets: [{ type: '车辆', confidence: 87 }], desc: 'A 栋入口单向道检测到逆行车辆。' },
  { id: 'r18', eventId: 'e4', thumb: thumb08, title: '禁行方向行驶', level: '提醒', status: '已处理', valid: true, time: '2026-07-05 08:30', camera: '车库摄像头', gateway: 'E栋网关1', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '车辆', confidence: 72, targets: [{ type: '车辆', confidence: 72 }], desc: '车库禁行方向检测到车辆行驶。' },

  // 物品遗留
  { id: 'r19', eventId: 'e5', thumb: thumb09, title: '物品遗留', level: '提醒', status: '已处理', valid: true, time: '2026-07-06 18:22', camera: '运营办公室摄像头', gateway: 'A栋网关', areaPath: ['物联网产业园区', 'A栋', '1F', '运营办公室'], target: '物品', confidence: 81, targets: [{ type: '物品', confidence: 81 }], desc: '运营办公室检测到遗留物品超过 10 分钟。' },
  { id: 'r20', eventId: 'e5', thumb: thumb10, title: '行李遗留', level: '提醒', status: '已处理', valid: true, time: '2026-07-06 14:05', camera: '前台摄像头', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '物品', confidence: 78, targets: [{ type: '物品', confidence: 78 }], desc: '前台区域检测到无人认领行李。' },
  { id: 'r21', eventId: 'e5', thumb: thumb01, title: '包裹遗留', level: '提醒', status: '已处理', valid: false, time: '2026-07-05 20:18', camera: '电梯口摄像头', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], target: '物品', confidence: 75, targets: [{ type: '物品', confidence: 75 }], desc: 'AI 复判：为固定消防器材箱，非遗留物品。' },
  { id: 'r22', eventId: 'e5', thumb: thumb02, title: '杂物堆积', level: '提醒', status: '已处理', valid: true, time: '2026-07-05 10:50', camera: '走廊摄像头B', gateway: 'E栋网关2', areaPath: ['物联网产业园区', 'E栋', '4F', '项目部办公区'], target: '物品', confidence: 69, targets: [{ type: '物品', confidence: 69 }], desc: '项目部走廊检测到杂物长时间堆积。' }
]

/** 区域路径转展示字符串 */
export function areaText(path: string[]): string {
  return path.length > 0 ? path.join(' / ') : ''
}

// ===== 告警历史记录 =====
export interface AlarmHistoryItem {
  id: string
  recordId: string
  /** 时间（作为标题） */
  time: string
  /** AI 场景描述 */
  sceneDesc: string
}

export const alarmHistory: AlarmHistoryItem[] = [
  { id: 'ah1', recordId: 'r1', time: '2026-07-07 09:12:03', sceneDesc: '画面中央可见一名身穿深色外套的人员正从东侧围栏翻越进入禁入区域，动作敏捷且有明显攀爬姿态，地面有踩踏痕迹，符合人员入侵的视觉特征。' },
  { id: 'ah2', recordId: 'r1', time: '2026-07-07 09:12:18', sceneDesc: '该人员已完全翻越围栏进入园区内部，正沿围墙根部向北侧移动，画面右下角可见其离去的背影，滞留时间已超过 8 秒。' },
  { id: 'ah3', recordId: 'r1', time: '2026-07-07 09:12:35', sceneDesc: 'AI 大模型复判：确认为真实入侵行为，人员姿态、运动轨迹及翻越动作均符合入侵检测模型特征，置信度 98%。' },
  { id: 'ah4', recordId: 'r2', time: '2026-07-07 02:14:22', sceneDesc: '凌晨时段画面左侧北门区域检测到一名人员缓慢靠近禁入边界，身穿深色衣物，手持疑似物品，行为轨迹异常，符合夜间人员入侵特征。' },
  { id: 'ah5', recordId: 'r2', time: '2026-07-07 02:15:10', sceneDesc: '该人员在北门禁入边界附近停留约 30 秒后离开，AI 复判为夜间巡逻保安例行检查，但置信度仍为 92%，已记录备案。' },
  { id: 'ah6', recordId: 'r3', time: '2026-07-06 23:40:05', sceneDesc: '画面右侧南门围栏处检测到人员翻越动作，可见双手攀附围栏顶部，一条腿已跨过围栏，动作连贯且速度较快。' },
  { id: 'ah7', recordId: 'r7', time: '2026-07-07 07:30:15', sceneDesc: '画面中央偏左区域可见明显的烟雾从地面升起，呈灰白色扩散状，伴有微弱橙色火光，烟雾面积持续扩大，符合烟火检测的视觉特征。' },
  { id: 'ah8', recordId: 'r7', time: '2026-07-07 07:30:28', sceneDesc: 'AI 大模型复判：烟雾形态、扩散方向及火光特征均符合真实火情，非光线反射或水蒸气，已联动消防系统紧急通知。' },
  { id: 'ah9', recordId: 'r9', time: '2026-07-06 12:40:30', sceneDesc: '画面中前台区域可见白色雾状物，经 AI 大模型复判分析，其形态为水蒸气而非烟雾，边缘扩散规律与温度变化一致，已拦截误报。' },
  { id: 'ah10', recordId: 'r11', time: '2026-07-07 10:05:12', sceneDesc: '画面中央可见一名人员右手持烟状物靠近嘴部，手指间有明灭的红色光点，嘴部有规律性吐出白色烟雾，符合禁烟区吸烟行为的视觉特征。' },
  { id: 'ah11', recordId: 'r16', time: '2026-07-07 08:46:20', sceneDesc: '画面下方车库出口通道检测到一辆白色轿车从出口方向逆向驶入，车头朝向与地面箭头标线方向相反，行驶速度较快，符合车辆逆行特征。' },
  { id: 'ah12', recordId: 'r22', time: '2026-07-05 10:50:03', sceneDesc: '画面左侧墙边可见明显的杂物堆积，包括一个堆叠了多个纸箱的木质柜子以及一个放置在地上的敞开式大纸箱，符合杂物堆积的视觉特征。' }
]

// ===== 处理历史记录 =====
export interface HandleHistoryItem {
  id: string
  recordId: string
  action: string
  operator: string
  time: string
  result: string
}

export const handleHistory: HandleHistoryItem[] = [
  { id: 'hh1', recordId: 'r3', action: '标记处理', operator: '张伟', time: '2026-07-06 23:45:10', result: '安保人员已到达现场，翻越人员已离开' },
  { id: 'hh2', recordId: 'r5', action: '标记已处理', operator: '李娜', time: '2026-07-06 14:35:22', result: '经核实为内部员工正常通行，无需处理' },
  { id: 'hh3', recordId: 'r5', action: '添加备注', operator: '李娜', time: '2026-07-06 14:36:00', result: '建议调整该区域警戒线范围' },
  { id: 'hh4', recordId: 'r6', action: '标记已处理', operator: '安保组', time: '2026-07-05 11:20:15', result: '为加班人员，已登记备案' },
  { id: 'hh5', recordId: 'r8', action: '标记已处理', operator: '消防组', time: '2026-07-06 20:30:00', result: '现场确认无明火，为灯光反射误报，已处理' },
  { id: 'hh6', recordId: 'r10', action: '标记已处理', operator: '物业中心', time: '2026-07-05 16:30:00', result: '电梯设备正常运行，温度在合理范围内' },
  { id: 'hh7', recordId: 'r13', action: '标记已处理', operator: '行政部', time: '2026-07-06 16:00:00', result: '已提醒相关人员遵守禁烟规定' },
  { id: 'hh8', recordId: 'r15', action: '标记已处理', operator: '行政部', time: '2026-07-05 18:00:00', result: '已对相关人员进行警告处理' }
]
