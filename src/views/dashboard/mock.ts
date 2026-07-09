/**
 * 仪表盘 mock 数据
 * 设备统计与 devices.mock.ts / video.mock.ts 保持一致（视频 10 路、物联 23 台）
 * 告警/识别/出现记录为演示数据，复用 text-search/result-0X.jpg 作为截图
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
import thumb11 from '@/assets/text-search/result-11.jpg'
import thumb12 from '@/assets/text-search/result-12.jpg'

// ===== ① 设备接入总览 =====
export interface DeviceStat {
  total: number
  online: number
  offline: number
}
export interface DeviceStats {
  video: DeviceStat
  iot: DeviceStat
  gateway: DeviceStat
}
export const deviceStats: DeviceStats = {
  // 与 devices.mock.ts / video.mock.ts 对齐：10 路视频（9 在线 / 1 离线）
  video: { total: 10, online: 9, offline: 1 },
  // 23 台物联（21 在线 / 2 离线）
  iot: { total: 23, online: 21, offline: 2 },
  // 接入网关（6 个，5 在线 / 1 离线）
  gateway: { total: 6, online: 5, offline: 1 }
}

// ===== ② 告警趋势（近 7 日，按类别）=====
export const alarmTrendDays: string[] = [
  '07-01', '07-02', '07-03', '07-04', '07-05', '07-06', '07-07'
]
export interface TrendSeries {
  name: string
  data: number[]
}
export const alarmTrendSeries: TrendSeries[] = [
  { name: '异常烟火', data: [12, 9, 15, 11, 18, 22, 16] },
  { name: '抽烟识别', data: [5, 8, 6, 10, 7, 9, 11] },
  { name: '入侵识别', data: [3, 4, 2, 6, 5, 3, 7] },
  { name: '车辆逆行', data: [1, 2, 1, 0, 3, 1, 2] }
]

// 区域告警分布（已按数量倒序）
export interface RegionAlarm {
  region: string
  count: number
}
export const alarmRegionBars: RegionAlarm[] = [
  { region: '研发部办公区', count: 18 },
  { region: '2F 公共区域', count: 14 },
  { region: '项目部办公区', count: 9 },
  { region: '运营办公室', count: 7 },
  { region: '园区出入口', count: 5 },
  { region: '地下车库', count: 3 }
]

// ===== ③ 最近告警事件（带视频截图）=====
export type AlarmLevel = '紧急' | '警告' | '提示'
export interface AlarmItem {
  id: string
  thumb: string
  title: string
  level: AlarmLevel
  time: string
  area: string
}
export const recentAlarms: AlarmItem[] = [
  { id: 'a1', thumb: thumb01, title: '人员闯入禁入区域', level: '紧急', time: '09:12', area: '研发部-东门' },
  { id: 'a2', thumb: thumb02, title: '车辆违停消防通道', level: '警告', time: '10:05', area: '园区南门' },
  { id: 'a3', thumb: thumb03, title: '人员徘徊超 5 分钟', level: '警告', time: '08:40', area: '研发部-东门' },
  { id: 'a4', thumb: thumb04, title: '疑似烟火', level: '紧急', time: '07:30', area: '2F 公共区域' },
  { id: 'a5', thumb: thumb05, title: '温湿度异常', level: '提示', time: '06:55', area: '项目部办公区' },
  { id: 'a6', thumb: thumb06, title: '物品遗留', level: '提示', time: '昨日 18:22', area: '运营办公室' },
  { id: 'a7', thumb: thumb07, title: '门磁长时间未关', level: '提示', time: '昨日 17:10', area: '项目部办公区' },
  { id: 'a8', thumb: thumb08, title: '夜间人员聚集', level: '警告', time: '昨日 23:30', area: '园区出入口' }
]

// ===== ④ 识别趋势（近 7 日）=====
export interface RecognitionTrend {
  days: string[]
  data: number[]
  today: number
  // 较昨日环比（%）
  delta: number
}
export const personTrend: RecognitionTrend = {
  days: alarmTrendDays,
  data: [986, 1102, 1245, 1180, 1356, 1492, 1284],
  today: 1284,
  delta: -13.9
}
export const vehicleTrend: RecognitionTrend = {
  days: alarmTrendDays,
  data: [286, 312, 298, 345, 368, 402, 368],
  today: 368,
  delta: -8.5
}

// ===== ⑤ 最近出现人员 / 车辆 =====
export interface RecentPerson {
  id: string
  thumb: string
  time: string
  area: string
}
export const recentPersons: RecentPerson[] = [
  { id: 'p1', thumb: thumb09, time: '09:42', area: '研发部-东门' },
  { id: 'p2', thumb: thumb10, time: '09:38', area: '2F 公共区域' },
  { id: 'p3', thumb: thumb11, time: '09:25', area: '园区南门' },
  { id: 'p4', thumb: thumb12, time: '09:18', area: '运营办公室' },
  { id: 'p5', thumb: thumb01, time: '09:05', area: '项目部办公区' },
  { id: 'p6', thumb: thumb03, time: '08:56', area: '研发部-东门' }
]

export interface RecentVehicle {
  id: string
  thumb: string
  plate: string
  color: string
  time: string
  area: string
}
export const recentVehicles: RecentVehicle[] = [
  { id: 'v1', thumb: thumb05, plate: '京A·8F2K6', color: '白色', time: '09:48', area: '地下车库入口' },
  { id: 'v2', thumb: thumb06, plate: '京B·3H9L2', color: '黑色', time: '09:31', area: '园区南门' },
  { id: 'v3', thumb: thumb07, plate: '京A·1D5X8', color: '银色', time: '09:14', area: '园区北门' },
  { id: 'v4', thumb: thumb08, plate: '苏E·7K2M0', color: '蓝色', time: '08:52', area: '地下车库入口' },
  { id: 'v5', thumb: thumb02, plate: '京A·9P4N3', color: '白色', time: '08:40', area: '园区南门' },
  { id: 'v6', thumb: thumb04, plate: '津C·6Y8R1', color: '灰色', time: '08:22', area: '园区北门' }
]
