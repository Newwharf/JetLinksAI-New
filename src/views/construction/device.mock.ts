/**
 * 物联设备管理 mock 数据
 * 设备类型 + 状态 + 数据模型 + 生成函数
 */
import { constructionSites } from './posture.mock'

// ===== 设备类型 =====
export type DeviceType = 'gateway' | 'camera' | 'sensor_dust' | 'sensor_noise' | 'sensor_temp' | 'sensor_water' | 'sensor_gas' | 'sensor_wind' | 'tower_crane' | 'electric_box'

export const deviceTypeMeta: Record<DeviceType, { label: string; icon: string; color: string }> = {
  gateway:       { label: '边缘网关',   icon: 'i-ant-design-cloud-server-outlined',   color: '#faad14' },
  camera:        { label: '视频设备',   icon: 'i-ant-design-video-camera-outlined',  color: '#6e4bff' },
  sensor_dust:   { label: '扬尘监测仪', icon: 'i-ant-design-cloud-outlined',         color: '#13c2c2' },
  sensor_noise:  { label: '噪音监测仪', icon: 'i-ant-design-sound-outlined',         color: '#1677ff' },
  sensor_temp:   { label: '温湿度传感器', icon: 'i-ant-design-thermometer-outlined', color: '#fa8c16' },
  sensor_water:  { label: '水位计',     icon: 'i-ant-design-column-height-outlined', color: '#1890ff' },
  sensor_gas:    { label: '气体检测仪', icon: 'i-ant-design-experiment-outlined',    color: '#722ed1' },
  sensor_wind:   { label: '风速仪',     icon: 'i-ant-design-fan-outlined',           color: '#52c41a' },
  tower_crane:   { label: '塔吊监控',   icon: 'i-ant-design-control-outlined',       color: '#eb2f96' },
  electric_box:  { label: '配电箱',     icon: 'i-ant-design-api-outlined',           color: '#fa541c' }
}

export const deviceTypeOptions = [
  { value: 'gateway', label: '边缘网关' },
  { value: 'camera', label: '视频设备' },
  { value: 'sensor_dust', label: '扬尘监测仪' },
  { value: 'sensor_noise', label: '噪音监测仪' },
  { value: 'sensor_temp', label: '温湿度传感器' },
  { value: 'sensor_water', label: '水位计' },
  { value: 'sensor_gas', label: '气体检测仪' },
  { value: 'sensor_wind', label: '风速仪' },
  { value: 'tower_crane', label: '塔吊监控' },
  { value: 'electric_box', label: '配电箱' }
]

// ===== 设备状态 =====
export type DeviceStatus = 'online' | 'offline' | 'abnormal'

export const deviceStatusMeta: Record<DeviceStatus, { label: string; color: string; bg: string }> = {
  online:   { label: '在线', color: '#52c41a', bg: 'rgba(82,196,26,0.1)' },
  offline:  { label: '离线', color: '#8c8c8c', bg: 'rgba(140,140,140,0.1)' },
  abnormal: { label: '健康异常', color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)' }
}

export const deviceStatusOptions = [
  { value: 'online', label: '在线' },
  { value: 'offline', label: '离线' },
  { value: 'abnormal', label: '健康异常' }
]

// ===== 设备记录 =====
export interface Device {
  id: string
  siteId: string
  siteName: string
  name: string
  deviceType: DeviceType
  model: string
  vendor: string
  status: DeviceStatus
  location: string
  installTime: string
  lastHeartbeat: string
  gateway: string
  sim?: string
}

// ===== 数据生成 =====
const vendors = ['海康威视', '大华股份', '华为', '中控技术', '安科瑞', '四方达', '力合科技', '雪迪龙']
const models: Record<DeviceType, string[]> = {
  gateway: ['IQ8-100', 'IQ9-200', 'EG-8000'],
  camera: ['DS-2CD3T46', 'IPC-HFW5442', 'DS-2DE4A4'],
  sensor_dust: ['SD-200', 'PM-610', 'DUST-Pro'],
  sensor_noise: ['NS-100', 'N-56', 'NOISE-X'],
  sensor_temp: ['TH-300', 'WS-100', 'SHT-40'],
  sensor_water: ['WL-200', 'WLM-Pro', 'LEVEL-1'],
  sensor_gas: ['GD-100', 'GAS-4', 'GT-901'],
  sensor_wind: ['WS-500', 'AN-200', 'WIND-S'],
  tower_crane: ['TC-900', 'TCM-Pro', 'CRANE-X'],
  electric_box: ['PM-810', 'ACM-300', 'BOX-Pro']
}
const locations = ['工地东门', '工地南门', '塔吊作业区', '基坑北侧', '材料堆放区', '焊接作业区', '配电间', '2F 施工楼层', '3F 楼层边缘', '地下车库']

function seededRandom(seed: number): () => number {
  let s = seed
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
}

function generateDevices(): Device[] {
  const devices: Device[] = []
  const rand = seededRandom(55)
  let idx = 0

  const typeKeys = Object.keys(deviceTypeMeta) as DeviceType[]

  for (const site of constructionSites) {
    // 每个工地 8~15 台设备
    const count = 8 + Math.floor(rand() * 8)
    for (let i = 0; i < count; i++) {
      const type = typeKeys[Math.floor(rand() * typeKeys.length)]
      const modelList = models[type]
      const statusRand = rand()
      let status: DeviceStatus
      if (statusRand < 0.78) status = 'online'
      else if (statusRand < 0.90) status = 'offline'
      else status = 'abnormal'

      const day = String(1 + Math.floor(rand() * 13)).padStart(2, '0')
      const hour = String(8 + Math.floor(rand() * 10)).padStart(2, '0')
      const minute = String(Math.floor(rand() * 60)).padStart(2, '0')

      devices.push({
        id: `dev-${site.id}-${i}`,
        siteId: site.id,
        siteName: site.name,
        name: `${deviceTypeMeta[type].label}-${String(i + 1).padStart(2, '0')}`,
        deviceType: type,
        model: modelList[Math.floor(rand() * modelList.length)],
        vendor: vendors[Math.floor(rand() * vendors.length)],
        status,
        location: locations[Math.floor(rand() * locations.length)],
        installTime: `2026-06-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`,
        lastHeartbeat: status === 'offline'
          ? `2026-07-${day} ${String(parseInt(hour) - 3 < 8 ? 8 : parseInt(hour) - 3).padStart(2, '0')}:${minute}`
          : `2026-07-${day} ${hour}:${minute}`,
        gateway: `网关-${site.id}`,
        sim: rand() > 0.4 ? `8${Math.floor(rand() * 1e10).toString().padStart(10, '0')}` : undefined
      })
      idx++
    }
  }

  return devices
}

export const devices: Device[] = generateDevices()
