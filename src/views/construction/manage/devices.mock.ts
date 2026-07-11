/**
 * 工地管理 - 绑定设备 mock 数据（视频设备 + 物联设备）
 * 每个设备通过 spaceId 标记它直接绑定的工地节点 id。
 *
 * 节点 id 对照：
 *   site-1 滨江金融中心一期
 *   site-2 城北科创园二期
 *   site-3 萧山国际机场扩建
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
  spaceId: string
  selected?: boolean
}

export const iotDevices = ref<DeviceItem[]>([
  // site-1 滨江金融中心一期（4 个）
  { id: 'iot-s1-1', name: '塔吊监测仪', icon: 'i-ant-design-control-outlined', brand: '建机', model: 'TD-800', product: '塔吊安全监测系统', group: '安全监测', gateway: '工地网关A', status: 'online', spaceId: 'site-1' },
  { id: 'iot-s1-2', name: '扬尘监测仪', icon: 'i-ant-design-cloud-outlined', brand: '汉威', model: 'YC-200', product: '扬尘噪声监测仪', group: '环境监测', gateway: '工地网关A', status: 'online', spaceId: 'site-1' },
  { id: 'iot-s1-3', name: '基坑监测传感器', icon: 'i-ant-design-compass-outlined', brand: '基康', model: 'JK-100', product: '基坑位移监测', group: '安全监测', gateway: '工地网关B', status: 'offline', spaceId: 'site-1' },
  { id: 'iot-s1-4', name: '临边防护报警器', icon: 'i-ant-design-bell-outlined', brand: '海康', model: 'LB-50', product: '临边防护监测', group: '安全监测', gateway: '工地网关A', status: 'online', spaceId: 'site-1' },

  // site-2 城北科创园二期（3 个）
  { id: 'iot-s2-1', name: '扬尘监测仪', icon: 'i-ant-design-cloud-outlined', brand: '汉威', model: 'YC-200', product: '扬尘噪声监测仪', group: '环境监测', gateway: '工地网关C', status: 'online', spaceId: 'site-2' },
  { id: 'iot-s2-2', name: '升降机监测仪', icon: 'i-ant-design-arrow-up-outlined', brand: '建机', model: 'SJ-300', product: '施工升降机监控', group: '安全监测', gateway: '工地网关C', status: 'online', spaceId: 'site-2' },
  { id: 'iot-s2-3', name: '水电表', icon: 'i-ant-design-dashboard-outlined', brand: '威胜', model: 'DDS-102', product: '智能电表', group: '能耗监测', gateway: '工地网关C', status: 'offline', spaceId: 'site-2' },

  // site-3 萧山国际机场扩建（2 个）
  { id: 'iot-s3-1', name: '高支模监测仪', icon: 'i-ant-design-safety-outlined', brand: '建研', model: 'GZM-100', product: '高支模变形监测', group: '安全监测', gateway: '工地网关D', status: 'online', spaceId: 'site-3' },
  { id: 'iot-s3-2', name: '气象站', icon: 'i-ant-design-cloud-outlined', brand: '佳格', model: 'WS-1000', product: '自动气象站', group: '环境监测', gateway: '工地网关D', status: 'online', spaceId: 'site-3' }
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
  spaceId: string
  thumb?: string
  selected?: boolean
}

export const videoDevices = ref<VideoItem[]>([
  // site-1 滨江金融中心一期（3 个）
  { id: 'vc-s1-1', name: '工地东门摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD2', product: '海康IPC-200万', group: '智能识别', gateway: '工地网关A', status: 'online', spaceId: 'site-1', thumb: cam1Img },
  { id: 'vc-s1-2', name: '塔吊顶端摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD3', product: '海康IPC-400万', group: '智能识别', gateway: '工地网关A', status: 'online', spaceId: 'site-1', thumb: cam2Img },
  { id: 'vc-s1-3', name: '基坑监控摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '大华', model: 'DH-IPC', product: '大华IPC-300万', group: '智能识别', gateway: '工地网关B', status: 'offline', spaceId: 'site-1', thumb: cam3Img },

  // site-2 城北科创园二期（2 个）
  { id: 'vc-s2-1', name: '工地正门摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD2', product: '海康IPC-200万', group: '智能识别', gateway: '工地网关C', status: 'online', spaceId: 'site-2', thumb: cam4Img },
  { id: 'vc-s2-2', name: '材料堆场摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD4', product: '海康IPC-200万', group: '智能识别', gateway: '工地网关C', status: 'online', spaceId: 'site-2', thumb: cam5Img },

  // site-3 萧山国际机场扩建（2 个）
  { id: 'vc-s3-1', name: '航站楼施工区摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD5', product: '海康球机', group: '智能识别', gateway: '工地网关D', status: 'online', spaceId: 'site-3', thumb: cam1Img },
  { id: 'vc-s3-2', name: '停机坪摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '大华', model: 'DH-IPC', product: '大华球机', group: '智能识别', gateway: '工地网关D', status: 'online', spaceId: 'site-3', thumb: cam2Img }
])
