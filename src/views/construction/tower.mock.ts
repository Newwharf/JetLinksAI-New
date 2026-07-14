/**
 * 塔机管理 mock 数据
 * 塔机台账 + 实时工况 + 司机档案
 * 参考 GB/T 5031《塔式起重机》及 JGJ 215《建筑施工塔式起重机安装、使用、拆卸安全技术规程》
 */
import { constructionSites } from './posture.mock'

// ===== 塔机状态 =====
export type TowerStatus = 'online' | 'offline' | 'alarm'

export const towerStatusMeta: Record<TowerStatus, { label: string; color: string; bg: string }> = {
  online:  { label: '正常运行', color: '#52c41a', bg: 'rgba(82,196,26,0.1)' },
  offline: { label: '离线',     color: '#8c8c8c', bg: 'rgba(140,140,140,0.1)' },
  alarm:   { label: '报警',     color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)' }
}

// ===== 塔机类型 =====
export type TowerType = 'flat_top' | 'hammerhead' | 'luffing'

export const towerTypeMeta: Record<TowerType, { label: string }> = {
  flat_top:  { label: '平头式' },
  hammerhead:{ label: '锤头式' },
  luffing:   { label: '动臂式' }
}

// ===== 塔机台账 =====
export interface Tower {
  id: string
  deviceNo: string             // 设备编号（备案编号）
  model: string                // 规格型号
  manufacturer: string         // 制造厂家
  towerType: TowerType
  siteId: string
  siteName: string
  status: TowerStatus
  maxLift: number              // 最大起重量（吨）
  maxRadius: number            // 最大幅度（米）
  maxHeight: number            // 最大起升高度（米）
  installDate: string          // 安装日期
  inspectDate: string          // 检验日期
  inspectResult: 'passed' | 'failed' | 'pending'
  certNo: string               // 使用登记证号
  // 实时工况
  currentLoad: number          // 当前吊重（吨）
  currentRadius: number        // 当前幅度（米）
  currentHeight: number        // 当前吊钩高度（米）
  currentAngle: number         // 当前回转角度（°）
  windSpeed: number            // 风速（m/s）
  loadRate: number             // 载荷率（%）
}

// ===== 司机档案 =====
export type DriverStatus = 'active' | 'resting' | 'expired'
export type LicenseType = 'tower_crane_operator' | 'tower_crane_signal'

export const driverStatusMeta: Record<DriverStatus, { label: string; color: string }> = {
  active:  { label: '在岗', color: '#52c41a' },
  resting: { label: '休息', color: '#8c8c8c' },
  expired: { label: '证件过期', color: '#ff4d4f' }
}

export const licenseTypeMeta: Record<LicenseType, { label: string }> = {
  tower_crane_operator: { label: '塔式起重机司机' },
  tower_crane_signal:   { label: '塔式起重机信号工' }
}

export interface TowerDriver {
  id: string
  name: string
  phone: string
  licenseType: LicenseType
  licenseNo: string             // 证书编号
  certExpiry: string            // 证件到期日
  status: DriverStatus
  assignedTower: string         // 分配的塔机编号
  siteName: string
  faceRegistered: boolean       // 是否已人脸注册
  workYears: number
  todayHours: number            // 今日已工作时长（小时）
}

// ===== 确定性伪随机 =====
function seededRandom(seed: number): () => number {
  let s = seed
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
}

// ===== 生成塔机数据 =====
const towerModels = [
  { model: 'TC6010-6', manufacturer: '中联重科', type: 'flat_top' as TowerType, maxLift: 6, maxRadius: 60, maxHeight: 50 },
  { model: 'TC5613-6', manufacturer: '中联重科', type: 'flat_top' as TowerType, maxLift: 6, maxRadius: 56, maxHeight: 45 },
  { model: 'QTZ80(TC5610)', manufacturer: '徐工集团', type: 'flat_top' as TowerType, maxLift: 6, maxRadius: 56, maxHeight: 48 },
  { model: 'TC7035-12', manufacturer: '中联重科', type: 'hammerhead' as TowerType, maxLift: 12, maxRadius: 70, maxHeight: 65 },
  { model: 'D800-42', manufacturer: '永茂建机', type: 'luffing' as TowerType, maxLift: 42, maxRadius: 80, maxHeight: 90 },
  { model: 'QTZ125(TC6015)', manufacturer: '徐工集团', type: 'flat_top' as TowerType, maxLift: 8, maxRadius: 60, maxHeight: 55 },
  { model: 'TC7527-16', manufacturer: '中联重科', type: 'hammerhead' as TowerType, maxLift: 16, maxRadius: 75, maxHeight: 70 },
  { model: 'STT293', manufacturer: '四川建机', type: 'hammerhead' as TowerType, maxLift: 12, maxRadius: 70, maxHeight: 60 }
]

function generateTowers(): Tower[] {
  const rand = seededRandom(789)
  const statuses: TowerStatus[] = ['online', 'online', 'online', 'online', 'online', 'offline', 'alarm']
  const towers: Tower[] = []

  // 为前几个工地各分配 1~2 台塔机
  const sitesWithTowers = constructionSites.slice(0, 8)
  let idx = 0
  for (const site of sitesWithTowers) {
    const count = 1 + Math.floor(rand() * 2) // 1~2 台
    for (let i = 0; i < count; i++) {
      const tpl = towerModels[idx % towerModels.length]
      const status = statuses[Math.floor(rand() * statuses.length)]
      idx++
      towers.push({
        id: `tw-${idx}`,
        deviceNo: `浙AB-T${String(1000 + idx)}`,
        model: tpl.model,
        manufacturer: tpl.manufacturer,
        towerType: tpl.type,
        siteId: site.id,
        siteName: site.name,
        status,
        maxLift: tpl.maxLift,
        maxRadius: tpl.maxRadius,
        maxHeight: tpl.maxHeight,
        installDate: `2026-0${1 + Math.floor(rand() * 6)}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`,
        inspectDate: `2026-0${1 + Math.floor(rand() * 6)}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`,
        inspectResult: rand() > 0.1 ? 'passed' : 'pending',
        certNo: `ZJDJ-2026-${String(500 + idx)}`,
        // 实时工况（离线时全 0）
        currentLoad: status === 'offline' ? 0 : +(rand() * tpl.maxLift * 0.8).toFixed(1),
        currentRadius: status === 'offline' ? 0 : +(rand() * tpl.maxRadius * 0.9).toFixed(1),
        currentHeight: status === 'offline' ? 0 : +(rand() * tpl.maxHeight * 0.85).toFixed(1),
        currentAngle: status === 'offline' ? 0 : Math.floor(rand() * 360),
        windSpeed: status === 'offline' ? 0 : +(rand() * 15).toFixed(1),
        loadRate: status === 'offline' ? 0 : Math.floor(rand() * 90)
      })
    }
  }
  return towers
}

export const towers: Tower[] = generateTowers()

// ===== 生成司机数据 =====
const driverNames = ['张塔吊', '李起重', '王信号', '赵司机', '钱师傅', '孙操作', '周指挥', '吴安全', '郑信号', '冯司机']
const phonePrefix = ['138', '139', '137', '136', '135', '133', '158', '159']

function generateDrivers(): TowerDriver[] {
  const rand = seededRandom(321)
  const drivers: TowerDriver[] = []

  for (let i = 0; i < driverNames.length; i++) {
    const isOperator = i % 3 !== 2 // 2/3 司机, 1/3 信号工
    const licenseType: LicenseType = isOperator ? 'tower_crane_operator' : 'tower_crane_signal'
    const r = rand()
    const status: DriverStatus = r < 0.7 ? 'active' : r < 0.9 ? 'resting' : 'expired'
    const tower = towers[Math.floor(rand() * towers.length)]
    drivers.push({
      id: `drv-${i + 1}`,
      name: driverNames[i],
      phone: phonePrefix[i % phonePrefix.length] + '****' + String(1000 + Math.floor(rand() * 9000)),
      licenseType,
      licenseNo: `JX-2026-${String(200 + i)}`,
      certExpiry: status === 'expired' ? '2026-03-15' : `2027-${String(1 + Math.floor(rand() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rand() * 28)).padStart(2, '0')}`,
      status,
      assignedTower: isOperator ? tower.deviceNo : '—',
      siteName: tower.siteName,
      faceRegistered: rand() > 0.2,
      workYears: 2 + Math.floor(rand() * 18),
      todayHours: status === 'active' ? +(rand() * 8).toFixed(1) : 0
    })
  }
  return drivers
}

export const drivers: TowerDriver[] = generateDrivers()
