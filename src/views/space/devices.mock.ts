/**
 * 绑定设备 mock 数据（视频设备 + 物联设备）
 * 由 AssetBindView（绑定设备管理 tab）和 FloorPlanView（平面图 tab）共享，
 * 保证两个 tab 的设备数据语义一致。
 */
import cam1Img from '@/assets/text-search/result-01.jpg'
import cam2Img from '@/assets/text-search/result-02.jpg'
import cam3Img from '@/assets/text-search/result-03.jpg'
import cam4Img from '@/assets/text-search/result-04.jpg'
import cam5Img from '@/assets/text-search/result-05.jpg'

// ===== 物联设备 =====
export interface DeviceItem {
  id: string
  name: string
  icon: string
  brand: string
  model: string
  product: string
  group: string
  gateway: string
  status: 'online' | 'offline'
  selected?: boolean
}

export const iotDevices = ref<DeviceItem[]>([
  { id: '2072288128924188672', name: '温湿度监测器', icon: 'i-ant-design-dashboard-outlined', brand: '华汉维', model: 'WH-TH-200', product: '华汉维温湿度计', group: '环境监测', gateway: '物联网关A', status: 'online' },
  { id: '2071910522102800384', name: '烟温一体探测器', icon: 'i-ant-design-fire-outlined', brand: '独立式', model: 'GYN-100', product: '独立式感烟火灾报警器', group: '消防安全', gateway: '物联网关A', status: 'online' },
  { id: '2071867150675795968', name: '陀螺仪传感器', icon: 'i-ant-design-compass-outlined', brand: '维特智能', model: 'WT-901', product: '维特智能陀螺仪', group: '姿态监测', gateway: '物联网关B', status: 'offline' },
  { id: '2071854479647399936', name: '噪声采集器', icon: 'i-ant-design-sound-outlined', brand: 'XM', model: 'XM8165', product: 'XM8165噪声采集器', group: '环境监测', gateway: '物联网关A', status: 'online' },
  { id: '2069005297439621120', name: '声光报警器', icon: 'i-ant-design-bell-outlined', brand: 'LD', model: 'LD9101', product: 'LD9101报警器', group: '消防安全', gateway: '物联网关B', status: 'online' },
  { id: '2068996813583171584', name: '边缘计算网关', icon: 'i-ant-design-cloud-server-outlined', brand: 'JetLinks', model: 'Edge-2000', product: 'JetLinks边缘网关', group: '边缘计算', gateway: '物联网关A', status: 'online' }
])

// ===== 视频设备 =====
export interface VideoItem {
  id: string
  name: string
  icon: string
  brand: string
  model: string
  product: string
  group: string
  gateway: string
  status: 'online' | 'offline'
  thumb?: string
  selected?: boolean
}

export const videoDevices = ref<VideoItem[]>([
  { id: 'vc-001', name: '东门摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD2', product: '海康IPC-200万', group: '智能识别', gateway: 'E栋网关1', status: 'online', thumb: cam1Img },
  { id: 'vc-002', name: '大厅摄像头A', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD3', product: '海康IPC-400万', group: '智能识别', gateway: 'E栋网关1', status: 'online', thumb: cam2Img },
  { id: 'vc-003', name: '走廊摄像头B', icon: 'i-ant-design-video-camera-outlined', brand: '大华', model: 'DH-IPC', product: '大华IPC-300万', group: '智能识别', gateway: 'E栋网关2', status: 'offline', thumb: cam3Img },
  { id: 'vc-004', name: '车库摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD4', product: '海康车牌识别', group: '车辆定位', gateway: 'E栋网关1', status: 'online', thumb: cam4Img },
  { id: 'vc-005', name: '南门摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD5', product: '海康IPC-200万', group: '智能识别', gateway: 'E栋网关1', status: 'online', thumb: cam5Img }
])
