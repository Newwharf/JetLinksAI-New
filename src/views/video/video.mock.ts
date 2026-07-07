/**
 * 监控墙 - 视频数据 mock
 * 摄像头清单与 devices.mock.ts 的 videoDevices 保持一致（同名/同状态/同网关），
 * 这里按监控墙的需要补充 areaPath（区域路径）与 thumb。
 */
import { ref } from 'vue'
import cam1Img from '@/assets/text-search/result-01.jpg'
import cam2Img from '@/assets/text-search/result-02.jpg'
import cam3Img from '@/assets/text-search/result-03.jpg'
import cam4Img from '@/assets/text-search/result-04.jpg'
import cam5Img from '@/assets/text-search/result-05.jpg'

// ===== 摄像头扁平数据 =====
export interface VideoCamera {
  id: string
  name: string
  status: 'online' | 'offline'
  thumb: string
  gateway: string
  /** 区域路径：园区 / 楼栋 / 楼层 / 区域 */
  areaPath: string[]
}

const PARK = '物联网产业园区'

export const videoCameras: VideoCamera[] = [
  // E栋 / 4F / 研发部办公区
  { id: 'vc-rd-1', name: '东门摄像头', status: 'online', thumb: cam1Img, gateway: 'E栋网关1', areaPath: [PARK, 'E栋', '4F', '研发部办公区'] },
  { id: 'vc-rd-2', name: '大厅摄像头A', status: 'online', thumb: cam2Img, gateway: 'E栋网关1', areaPath: [PARK, 'E栋', '4F', '研发部办公区'] },
  // E栋 / 4F / 项目部办公区
  { id: 'vc-pm-1', name: '走廊摄像头B', status: 'offline', thumb: cam3Img, gateway: 'E栋网关2', areaPath: [PARK, 'E栋', '4F', '项目部办公区'] },
  { id: 'vc-pm-2', name: '会议室摄像头', status: 'online', thumb: cam4Img, gateway: 'E栋网关1', areaPath: [PARK, 'E栋', '4F', '项目部办公区'] },
  // E栋 / 2F / 公共区域
  { id: 'vc-2f-1', name: '车库摄像头', status: 'online', thumb: cam5Img, gateway: 'E栋网关1', areaPath: [PARK, 'E栋', '2F', '公共区域'] },
  { id: 'vc-2f-2', name: '南门摄像头', status: 'online', thumb: cam1Img, gateway: 'E栋网关1', areaPath: [PARK, 'E栋', '2F', '公共区域'] },
  { id: 'vc-2f-3', name: '前台摄像头', status: 'offline', thumb: cam2Img, gateway: 'E栋网关2', areaPath: [PARK, 'E栋', '2F', '公共区域'] },
  { id: 'vc-2f-4', name: '电梯口摄像头', status: 'online', thumb: cam3Img, gateway: 'E栋网关1', areaPath: [PARK, 'E栋', '2F', '公共区域'] },
  // A栋 / 1F / 运营办公室
  { id: 'vc-op-1', name: '运营办公室摄像头', status: 'online', thumb: cam4Img, gateway: 'A栋网关', areaPath: [PARK, 'A栋', '1F', '运营办公室'] },
  { id: 'vc-op-2', name: '入口摄像头', status: 'online', thumb: cam5Img, gateway: 'A栋网关', areaPath: [PARK, 'A栋', '1F', '运营办公室'] }
]

// ===== 区域树（由 areaPath 聚合）=====
export interface AreaTreeNode {
  key: string
  title: string
  /** 该子树下的摄像头数（含子孙） */
  count?: number
  isLeaf?: boolean
  /** 仅叶子节点（摄像头）有效 */
  camId?: string
  status?: 'online' | 'offline'
  thumb?: string
  children?: AreaTreeNode[]
}

/** 由扁平 videoCameras 聚合成区域树 */
function buildAreaTree(): AreaTreeNode[] {
  const root: AreaTreeNode = { key: 'root', title: '', children: [] }
  for (const cam of videoCameras) {
    let cur = root
    const segments = cam.areaPath
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      const path = segments.slice(0, i + 1).join('/')
      cur.children = cur.children || []
      let next = cur.children.find(c => c.title === seg)
      if (!next) {
        next = { key: 'area-' + path, title: seg, children: [] }
        cur.children.push(next)
      }
      cur = next
    }
    // 叶子：摄像头
    cur.children = cur.children || []
    cur.children.push({
      key: 'cam-' + cam.id,
      title: cam.name,
      isLeaf: true,
      camId: cam.id,
      status: cam.status,
      thumb: cam.thumb
    })
  }
  // 递归计算 count
  function count(node: AreaTreeNode): number {
    const n = node.isLeaf ? 0 : (node.children || []).reduce((s, c) => s + count(c), 0)
    if (!node.isLeaf) node.count = n
    return node.isLeaf ? 1 : n
  }
  const roots = root.children || []
  roots.forEach(count)
  return roots
}

export const areaTree = buildAreaTree()

/** 含摄像头的末级区域数（用于顶部"X 个区域"统计） */
export function countLeafAreas(): number {
  let n = 0
  function walk(node: AreaTreeNode) {
    if (node.isLeaf) return
    const hasCamChildren = (node.children || []).some(c => c.isLeaf)
    if (hasCamChildren) n++
    ;(node.children || []).forEach(walk)
  }
  areaTree.forEach(walk)
  return n
}

// ===== 网关分组（由 gateway 聚合）=====
export interface GatewayGroup {
  id: string
  name: string
  status: 'online' | 'offline'
  expanded: boolean
  cameras: { id: string; name: string; status: 'online' | 'offline'; thumb: string }[]
}

export const gatewayGroups = ref<GatewayGroup[]>([])

/** 由 videoCameras 聚合成网关分组（保留 expanded 状态） */
export function buildGatewayGroups(): GatewayGroup[] {
  const map = new Map<string, GatewayGroup>()
  for (const cam of videoCameras) {
    if (!map.has(cam.gateway)) {
      map.set(cam.gateway, {
        id: 'gw-' + cam.gateway,
        name: cam.gateway,
        status: 'online',
        expanded: true,
        cameras: []
      })
    }
    map.get(cam.gateway)!.cameras.push({
      id: cam.id,
      name: cam.name,
      status: cam.status,
      thumb: cam.thumb
    })
  }
  const list = Array.from(map.values())
  // 网关状态：其下任一摄像头在线即 online
  list.forEach(g => {
    g.status = g.cameras.some(c => c.status === 'online') ? 'online' : 'offline'
    // 保留旧 expanded
    const old = gatewayGroups.value.find(x => x.id === g.id)
    if (old) g.expanded = old.expanded
  })
  return list
}

export { cam1Img, cam2Img, cam3Img, cam4Img, cam5Img }
