/**
 * 绑定设备 mock 数据（视频设备 + 物联设备）
 * 每个设备通过 spaceId 标记它直接绑定的空间节点 id。
 * 父级空间的统计数量 = 其所有子孙节点设备数之和（由 AreaView 递归计算）。
 *
 * 节点 id 对照：
 *   park-1 物联网产业园区
 *     b-e E栋
 *       f-4f 4F
 *         a-rd 研发部办公区 (2 视频 / 4 物联)
 *         a-pm 项目部办公区 (2 视频 / 6 物联)
 *       f-2f 2F (4 视频 / 8 物联)
 *     b-a A栋
 *       f-1f 1F (0 视频 / 0 物联，设备都在 a-op 下)
 *         a-op 运营办公室 (2 视频 / 5 物联)
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
  spaceId: string  // 直接绑定的空间节点 id
  selected?: boolean
}

export const iotDevices = ref<DeviceItem[]>([
  // a-rd 研发部办公区（4 个）
  { id: 'iot-rd-1', name: '温湿度监测器', icon: 'i-ant-design-dashboard-outlined', brand: '华汉维', model: 'WH-TH-200', product: '华汉维温湿度计', group: '环境监测', gateway: '物联网关A', status: 'online', spaceId: 'a-rd' },
  { id: 'iot-rd-2', name: '烟温一体探测器', icon: 'i-ant-design-fire-outlined', brand: '独立式', model: 'GYN-100', product: '独立式感烟火灾报警器', group: '消防安全', gateway: '物联网关A', status: 'online', spaceId: 'a-rd' },
  { id: 'iot-rd-3', name: '噪声采集器', icon: 'i-ant-design-sound-outlined', brand: 'XM', model: 'XM8165', product: 'XM8165噪声采集器', group: '环境监测', gateway: '物联网关A', status: 'online', spaceId: 'a-rd' },
  { id: 'iot-rd-4', name: '陀螺仪传感器', icon: 'i-ant-design-compass-outlined', brand: '维特智能', model: 'WT-901', product: '维特智能陀螺仪', group: '姿态监测', gateway: '物联网关B', status: 'offline', spaceId: 'a-rd' },

  // a-pm 项目部办公区（6 个）
  { id: 'iot-pm-1', name: '二氧化碳检测仪', icon: 'i-ant-design-cloud-outlined', brand: '汉威', model: 'CO2-200', product: '汉威CO2检测仪', group: '环境监测', gateway: '物联网关A', status: 'online', spaceId: 'a-pm' },
  { id: 'iot-pm-2', name: '门磁传感器', icon: 'i-ant-design-lock-outlined', brand: '海康', model: 'DS-MAG', product: '海康门磁', group: '消防安全', gateway: '物联网关A', status: 'offline', spaceId: 'a-pm' },
  { id: 'iot-pm-3', name: '声光报警器', icon: 'i-ant-design-bell-outlined', brand: 'LD', model: 'LD9101', product: 'LD9101报警器', group: '消防安全', gateway: '物联网关B', status: 'online', spaceId: 'a-pm' },
  { id: 'iot-pm-4', name: '光照度传感器', icon: 'i-ant-design-bulb-outlined', brand: '汉威', model: 'GZ-100', product: '汉威光照度计', group: '环境监测', gateway: '物联网关A', status: 'online', spaceId: 'a-pm' },
  { id: 'iot-pm-5', name: '空气质量监测仪', icon: 'i-ant-design-cloud-outlined', brand: '汉威', model: 'AQI-300', product: '汉威空气质量仪', group: '环境监测', gateway: '物联网关B', status: 'online', spaceId: 'a-pm' },
  { id: 'iot-pm-6', name: '边缘计算网关', icon: 'i-ant-design-cloud-server-outlined', brand: 'JetLinks', model: 'Edge-2000', product: 'JetLinks边缘网关', group: '边缘计算', gateway: '物联网关A', status: 'online', spaceId: 'a-pm' },

  // f-2f 2F（8 个，2F 自己直接持有）
  { id: 'iot-2f-1', name: '温湿度监测器', icon: 'i-ant-design-dashboard-outlined', brand: '华汉维', model: 'WH-TH-200', product: '华汉维温湿度计', group: '环境监测', gateway: '物联网关A', status: 'online', spaceId: 'f-2f' },
  { id: 'iot-2f-2', name: '烟温一体探测器', icon: 'i-ant-design-fire-outlined', brand: '独立式', model: 'GYN-100', product: '独立式感烟火灾报警器', group: '消防安全', gateway: '物联网关A', status: 'online', spaceId: 'f-2f' },
  { id: 'iot-2f-3', name: '水浸传感器', icon: 'i-ant-design-experiment-outlined', brand: '汉威', model: 'SJ-100', product: '汉威水浸传感器', group: '消防安全', gateway: '物联网关B', status: 'online', spaceId: 'f-2f' },
  { id: 'iot-2f-4', name: '噪声采集器', icon: 'i-ant-design-sound-outlined', brand: 'XM', model: 'XM8165', product: 'XM8165噪声采集器', group: '环境监测', gateway: '物联网关A', status: 'online', spaceId: 'f-2f' },
  { id: 'iot-2f-5', name: '声光报警器', icon: 'i-ant-design-bell-outlined', brand: 'LD', model: 'LD9101', product: 'LD9101报警器', group: '消防安全', gateway: '物联网关B', status: 'offline', spaceId: 'f-2f' },
  { id: 'iot-2f-6', name: '陀螺仪传感器', icon: 'i-ant-design-compass-outlined', brand: '维特智能', model: 'WT-901', product: '维特智能陀螺仪', group: '姿态监测', gateway: '物联网关B', status: 'online', spaceId: 'f-2f' },
  { id: 'iot-2f-7', name: '光照度传感器', icon: 'i-ant-design-bulb-outlined', brand: '汉威', model: 'GZ-100', product: '汉威光照度计', group: '环境监测', gateway: '物联网关A', status: 'online', spaceId: 'f-2f' },
  { id: 'iot-2f-8', name: '门磁传感器', icon: 'i-ant-design-lock-outlined', brand: '海康', model: 'DS-MAG', product: '海康门磁', group: '消防安全', gateway: '物联网关A', status: 'online', spaceId: 'f-2f' },

  // a-op 运营办公室（5 个）
  { id: 'iot-op-1', name: '温湿度监测器', icon: 'i-ant-design-dashboard-outlined', brand: '华汉维', model: 'WH-TH-200', product: '华汉维温湿度计', group: '环境监测', gateway: '物联网关A', status: 'online', spaceId: 'a-op' },
  { id: 'iot-op-2', name: '烟温一体探测器', icon: 'i-ant-design-fire-outlined', brand: '独立式', model: 'GYN-100', product: '独立式感烟火灾报警器', group: '消防安全', gateway: '物联网关A', status: 'online', spaceId: 'a-op' },
  { id: 'iot-op-3', name: '声光报警器', icon: 'i-ant-design-bell-outlined', brand: 'LD', model: 'LD9101', product: 'LD9101报警器', group: '消防安全', gateway: '物联网关B', status: 'online', spaceId: 'a-op' },
  { id: 'iot-op-4', name: '空气质量监测仪', icon: 'i-ant-design-cloud-outlined', brand: '汉威', model: 'AQI-300', product: '汉威空气质量仪', group: '环境监测', gateway: '物联网关B', status: 'offline', spaceId: 'a-op' },
  { id: 'iot-op-5', name: '边缘计算网关', icon: 'i-ant-design-cloud-server-outlined', brand: 'JetLinks', model: 'Edge-2000', product: 'JetLinks边缘网关', group: '边缘计算', gateway: '物联网关A', status: 'online', spaceId: 'a-op' }
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
  spaceId: string  // 直接绑定的空间节点 id
  thumb?: string
  selected?: boolean
}

export const videoDevices = ref<VideoItem[]>([
  // a-rd 研发部办公区（2 个）
  { id: 'vc-rd-1', name: '东门摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD2', product: '海康IPC-200万', group: '智能识别', gateway: 'E栋网关1', status: 'online', spaceId: 'a-rd', thumb: cam1Img },
  { id: 'vc-rd-2', name: '大厅摄像头A', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD3', product: '海康IPC-400万', group: '智能识别', gateway: 'E栋网关1', status: 'online', spaceId: 'a-rd', thumb: cam2Img },

  // a-pm 项目部办公区（2 个）
  { id: 'vc-pm-1', name: '走廊摄像头B', icon: 'i-ant-design-video-camera-outlined', brand: '大华', model: 'DH-IPC', product: '大华IPC-300万', group: '智能识别', gateway: 'E栋网关2', status: 'offline', spaceId: 'a-pm', thumb: cam3Img },
  { id: 'vc-pm-2', name: '会议室摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD4', product: '海康IPC-200万', group: '智能识别', gateway: 'E栋网关1', status: 'online', spaceId: 'a-pm', thumb: cam4Img },

  // f-2f 2F（4 个）
  { id: 'vc-2f-1', name: '车库摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD5', product: '海康车牌识别', group: '车辆定位', gateway: 'E栋网关1', status: 'online', spaceId: 'f-2f', thumb: cam5Img },
  { id: 'vc-2f-2', name: '南门摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD2', product: '海康IPC-200万', group: '智能识别', gateway: 'E栋网关1', status: 'online', spaceId: 'f-2f', thumb: cam1Img },
  { id: 'vc-2f-3', name: '前台摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD3', product: '海康IPC-400万', group: '智能识别', gateway: 'E栋网关2', status: 'offline', spaceId: 'f-2f', thumb: cam2Img },
  { id: 'vc-2f-4', name: '电梯口摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD4', product: '海康IPC-200万', group: '智能识别', gateway: 'E栋网关1', status: 'online', spaceId: 'f-2f', thumb: cam3Img },

  // a-op 运营办公室（2 个）
  { id: 'vc-op-1', name: '运营办公室摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD2', product: '海康IPC-200万', group: '智能识别', gateway: 'A栋网关', status: 'online', spaceId: 'a-op', thumb: cam4Img },
  { id: 'vc-op-2', name: '入口摄像头', icon: 'i-ant-design-video-camera-outlined', brand: '海康威视', model: 'DS-2CD3', product: '海康IPC-400万', group: '智能识别', gateway: 'A栋网关', status: 'online', spaceId: 'a-op', thumb: cam5Img }
])

// ===== 工具：按空间 id 过滤设备 =====
// 返回直接绑定在该 spaceId 上的设备（不含子孙）
export function devicesInSpace(spaceId: string) {
  return {
    videos: videoDevices.value.filter(d => d.spaceId === spaceId),
    iots: iotDevices.value.filter(d => d.spaceId === spaceId)
  }
}
