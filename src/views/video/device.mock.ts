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
  sn: string
  ip: string
  location: string
  status: 'online' | 'offline'
}

export const gateways: GatewayDevice[] = [
  { id: 'gw-e1', name: 'E栋网关1', brand: 'JetLinks', model: 'Edge-2000', sn: 'GW-58740736', ip: '192.168.1.101', location: 'E栋 4F 弱电间', status: 'online' },
  { id: 'gw-e2', name: 'E栋网关2', brand: '海康威视', model: 'NVR-8100N', sn: 'GW-58740892', ip: '192.168.1.102', location: 'E栋 2F 弱电间', status: 'online' },
  { id: 'gw-a1', name: 'A栋网关', brand: '大华', model: 'DH-NVR4216', sn: 'GW-58741051', ip: '192.168.2.101', location: 'A栋 1F 弱电间', status: 'offline' }
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

// ===== 区域树（从通道的区域路径聚合，用于区域筛选） =====
export interface AreaTreeNode {
  key: string
  title: string
  /** 该子树下的通道数（含子孙） */
  count?: number
  /** 该子树下在线通道数 */
  onlineCount?: number
  /** 完整区域路径（仅末级区域节点有效，用于匹配通道） */
  path?: string[]
  children?: AreaTreeNode[]
}

/** 由通道数据动态聚合为区域树 */
export const areaTree = computed<AreaTreeNode[]>(() => {
  const root: AreaTreeNode = { key: 'root', title: '', children: [] }

  for (const ch of channels.value) {
    if (ch.areaPath.length === 0) continue
    let cur = root
    for (let i = 0; i < ch.areaPath.length; i++) {
      const seg = ch.areaPath[i]
      const path = ch.areaPath.slice(0, i + 1).join('/')
      cur.children = cur.children || []
      let next = cur.children.find(c => c.title === seg)
      if (!next) {
        next = {
          key: 'area-' + path,
          title: seg,
          path: ch.areaPath.slice(0, i + 1)
        }
        cur.children.push(next)
      }
      cur = next
    }
  }

  // 递归统计每个节点下的通道数
  function calcCounts(node: AreaTreeNode): { total: number; online: number } {
    if (!node.children || node.children.length === 0) {
      // 末级区域：匹配通道
      const nodePath = node.path || []
      const pathStr = nodePath.join('/')
      const matched = channels.value.filter(c => c.areaPath.join('/') === pathStr)
      const total = matched.length
      const online = matched.filter(c => c.status === 'online').length
      node.count = total
      node.onlineCount = online
      return { total, online }
    }
    let total = 0
    let online = 0
    for (const child of node.children) {
      const r = calcCounts(child)
      total += r.total
      online += r.online
    }
    node.count = total
    node.onlineCount = online
    return { total, online }
  }

  const roots = root.children || []
  roots.forEach(calcCounts)
  return roots
})

/** 展开的 key 列表（默认全部展开） */
export const areaTreeExpandedKeys = computed(() => {
  const keys: string[] = []
  function walk(nodes: AreaTreeNode[]) {
    for (const n of nodes) {
      keys.push(n.key)
      if (n.children) walk(n.children)
    }
  }
  walk(areaTree.value)
  return keys
})

// ===== 局域网扫描到的摄像头（用于网关配置页「新增设备」） =====
export interface ScannedCamera {
  id: string
  name: string
  ip: string
  mac: string
  brand: string
  model: string
  thumb: string
  /** 正确账号（用于 mock 绑定校验） */
  account: string
  /** 正确密码（用于 mock 绑定校验） */
  password: string
  /** 是否已被当前网关绑定 */
  bound: boolean
  /** 是否已完成设备接入（已接入的才可查看画面，未接入的显示占位） */
  accessed: boolean
}

/** 扫描到的摄像头列表（部分密码不同，用于模拟部分绑定失败） */
export const scannedCameras: ScannedCamera[] = [
  { id: 'sc-1', name: 'IPC-前门-01', ip: '192.168.1.201', mac: 'AA:BB:CC:00:01:01', brand: '海康威视', model: 'DS-2CD2', thumb: cam1, account: 'admin', password: '123456', bound: false, accessed: true },
  { id: 'sc-2', name: 'IPC-前门-02', ip: '192.168.1.202', mac: 'AA:BB:CC:00:01:02', brand: '海康威视', model: 'DS-2CD2', thumb: cam2, account: 'admin', password: '123456', bound: false, accessed: false },
  { id: 'sc-3', name: 'IPC-大厅-01', ip: '192.168.1.203', mac: 'AA:BB:CC:00:01:03', brand: '大华', model: 'DH-IPC', thumb: cam3, account: 'admin', password: '123456', bound: false, accessed: true },
  { id: 'sc-4', name: 'IPC-大厅-02', ip: '192.168.1.204', mac: 'AA:BB:CC:00:01:04', brand: '大华', model: 'DH-IPC', thumb: cam4, account: 'admin', password: 'admin123', bound: false, accessed: false },
  { id: 'sc-5', name: 'IPC-走廊-01', ip: '192.168.1.205', mac: 'AA:BB:CC:00:01:05', brand: '宇视', model: 'HIC6621', thumb: cam5, account: 'admin', password: '123456', bound: false, accessed: false },
  { id: 'sc-6', name: 'IPC-走廊-02', ip: '192.168.1.206', mac: 'AA:BB:CC:00:01:06', brand: '宇视', model: 'HIC6621', thumb: cam6, account: 'admin', password: '123456', bound: false, accessed: true },
  { id: 'sc-7', name: 'IPC-车库-01', ip: '192.168.1.207', mac: 'AA:BB:CC:00:01:07', brand: '海康威视', model: 'DS-2CD3', thumb: cam7, account: 'admin', password: '123456', bound: false, accessed: false },
  { id: 'sc-8', name: 'IPC-车库-02', ip: '192.168.1.208', mac: 'AA:BB:CC:00:01:08', brand: '海康威视', model: 'DS-2CD3', thumb: cam8, account: 'admin', password: 'pass888', bound: false, accessed: false },
  { id: 'sc-9', name: 'IPC-电梯-01', ip: '192.168.1.209', mac: 'AA:BB:CC:00:01:09', brand: '大华', model: 'DH-IPC2', thumb: cam9, account: 'admin', password: '123456', bound: false, accessed: false },
  { id: 'sc-10', name: 'IPC-电梯-02', ip: '192.168.1.210', mac: 'AA:BB:CC:00:01:10', brand: '大华', model: 'DH-IPC2', thumb: cam10, account: 'admin', password: '123456', bound: false, accessed: true },
  { id: 'sc-11', name: 'IPC-后门-01', ip: '192.168.1.211', mac: 'AA:BB:CC:00:01:11', brand: '宇视', model: 'HIC6622', thumb: cam11, account: 'admin', password: '123456', bound: false, accessed: false },
  { id: 'sc-12', name: 'IPC-后门-02', ip: '192.168.1.212', mac: 'AA:BB:CC:00:01:12', brand: '宇视', model: 'HIC6622', thumb: cam12, account: 'admin', password: '123456', bound: false, accessed: false }
]

