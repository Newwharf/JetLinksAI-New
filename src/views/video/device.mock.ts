/**
 * 视频设备管理 mock 数据
 * 独立于 video.mock.ts（监控墙用），本文件服务于「监控设备管理」页：
 * 网关列表 + 网关下通道（含 PTZ、区域路径）。
 * 列表中所有通道均视为已同步。
 */
import cam1 from '@/assets/text-search/result-01.jpg'
import cam2 from '@/assets/text-search/result-02.jpg'
import cam3 from '@/assets/text-search/result-03.jpg'
import cam4 from '@/assets/text-search/result-04.jpg'
import cam5 from '@/assets/text-search/result-05.jpg'
import cam6 from '@/assets/text-search/result-06.jpg'
import cam7 from '@/assets/text-search/result-07.jpg'
import cam8 from '@/assets/text-search/result-08.jpg'
import cam9 from '@/assets/text-search/result-09.jpg'
import cam10 from '@/assets/text-search/result-10.jpg'
import cam11 from '@/assets/text-search/result-11.jpg'
import cam12 from '@/assets/text-search/result-12.jpg'

// ===== 边缘网关 =====
export interface GatewayDevice {
  id: string
  name: string
  brand: string
  model: string
  ip: string
  location: string
  status: 'online' | 'offline'
}

export const gateways: GatewayDevice[] = [
  { id: 'gw-e1', name: 'E栋网关1', brand: 'JetLinks', model: 'Edge-2000', ip: '192.168.1.101', location: 'E栋 4F 弱电间', status: 'online' },
  { id: 'gw-e2', name: 'E栋网关2', brand: '海康威视', model: 'NVR-8100N', ip: '192.168.1.102', location: 'E栋 2F 弱电间', status: 'online' },
  { id: 'gw-a1', name: 'A栋网关', brand: '大华', model: 'DH-NVR4216', ip: '192.168.2.101', location: 'A栋 1F 弱电间', status: 'offline' }
]

// ===== 视频通道 =====
export interface VideoChannel {
  id: string
  name: string
  thumb: string
  gatewayId: string
  /** 完整区域路径（园区/楼栋/楼层/区域）；空数组表示未绑定 */
  areaPath: string[]
  status: 'online' | 'offline'
  /** 是否支持 PTZ 云台控制 */
  ptz: boolean
}

export const channels = ref<VideoChannel[]>([
  // E栋网关1：6 路
  { id: 'ch-e1-1', name: '东门摄像头', thumb: cam1, gatewayId: 'gw-e1', areaPath: ['物联网产业园区', 'E栋', '4F', '研发部办公区'], status: 'online', ptz: true },
  { id: 'ch-e1-2', name: '大厅摄像头A', thumb: cam2, gatewayId: 'gw-e1', areaPath: ['物联网产业园区', 'E栋', '4F', '研发部办公区'], status: 'online', ptz: true },
  { id: 'ch-e1-3', name: '会议室摄像头', thumb: cam3, gatewayId: 'gw-e1', areaPath: ['物联网产业园区', 'E栋', '4F', '项目部办公区'], status: 'online', ptz: false },
  { id: 'ch-e1-4', name: '车库摄像头', thumb: cam4, gatewayId: 'gw-e1', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], status: 'online', ptz: true },
  { id: 'ch-e1-5', name: '南门摄像头', thumb: cam5, gatewayId: 'gw-e1', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], status: 'online', ptz: false },
  { id: 'ch-e1-6', name: '北门摄像头', thumb: cam6, gatewayId: 'gw-e1', areaPath: [], status: 'online', ptz: true },

  // E栋网关2：3 路
  { id: 'ch-e2-1', name: '走廊摄像头B', thumb: cam7, gatewayId: 'gw-e2', areaPath: ['物联网产业园区', 'E栋', '4F', '项目部办公区'], status: 'offline', ptz: false },
  { id: 'ch-e2-2', name: '前台摄像头', thumb: cam8, gatewayId: 'gw-e2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], status: 'offline', ptz: false },
  { id: 'ch-e2-3', name: '电梯口摄像头', thumb: cam9, gatewayId: 'gw-e2', areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'], status: 'online', ptz: true },

  // A栋网关：3 路
  { id: 'ch-a1-1', name: '运营办公室摄像头', thumb: cam10, gatewayId: 'gw-a1', areaPath: ['物联网产业园区', 'A栋', '1F', '运营办公室'], status: 'online', ptz: true },
  { id: 'ch-a1-2', name: '入口摄像头', thumb: cam11, gatewayId: 'gw-a1', areaPath: ['物联网产业园区', 'A栋', '1F', '运营办公室'], status: 'online', ptz: false },
  { id: 'ch-a1-3', name: '后门摄像头', thumb: cam12, gatewayId: 'gw-a1', areaPath: [], status: 'offline', ptz: true }
])

/** 区域路径转展示字符串 */
export function areaText(path: string[]): string {
  return path.length > 0 ? path.join(' / ') : ''
}
