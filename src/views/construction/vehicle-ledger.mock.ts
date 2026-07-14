/**
 * 车辆违章 + 车辆进出 mock 数据
 * 基于 constructionSites（10个工地）和车辆信息生成
 */
import { constructionSites } from './posture.mock'
import vehicleImg1 from '@/assets/construction/vehicle/1.png'
import vehicleImg2 from '@/assets/construction/vehicle/2.png'
import vehicleImg3 from '@/assets/construction/vehicle/3.png'
import vehicleImg4 from '@/assets/construction/vehicle/4.png'

const vehicleThumbs = [vehicleImg1, vehicleImg2, vehicleImg3, vehicleImg4]

// 车辆基础信息（与 ConstructionVehicleProfileView 的 mock 一致）
export interface VehicleInfo {
  plate: string
  vehicleType: string
  unit: string
  driver: string
}

export const vehicleList: VehicleInfo[] = [
  { plate: '浙A·8F2K6', vehicleType: '渣土车',       unit: '滨江土方工程公司',     driver: '张建国' },
  { plate: '浙A·3H9L2', vehicleType: '混凝土泵车',   unit: '中建三局混凝土分公司', driver: '李志强' },
  { plate: '浙A·1D5X8', vehicleType: '汽车吊',       unit: '杭州大件运输公司',     driver: '王德发' },
  { plate: '浙A·9P4N3', vehicleType: '材料运输车',   unit: '滨江建材供应公司',     driver: '刘明远' },
  { plate: '浙B·7K2M0', vehicleType: '渣土车',       unit: '城北土方工程公司',     driver: '陈永福' },
  { plate: '浙A·6Y8R1', vehicleType: '混凝土搅拌车', unit: '中建三局混凝土分公司', driver: '赵铁柱' },
  { plate: '浙A·2J6T5', vehicleType: '随车吊',       unit: '杭州大件运输公司',     driver: '孙伟' },
  { plate: '浙A·5G3W9', vehicleType: '材料运输车',   unit: '萧山建材供应公司',     driver: '周强' }
]

// ===== 确定性伪随机 =====
function seededRandom(seed: number): () => number {
  let s = seed
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
}

// ===== 违章类型（工地规章制度违规）=====
export type ViolationType =
  | 'speeding_in_site'    // 场内超速
  | 'wrong_route'         // 未按规定路线行驶
  | 'illegal_park'        // 违规停放
  | 'no_permit'           // 无通行证/证件过期
  | 'night_violation'     // 夜间违规运输
  | 'over_load'           // 超载运输
  | 'env_violation'       // 渣土车违规（沿途遗撒/未覆盖）

export const violationTypeMeta: Record<ViolationType, { label: string; color: string }> = {
  speeding_in_site: { label: '场内超速',     color: '#ff4d4f' },
  wrong_route:      { label: '未按规定路线', color: '#fa541c' },
  illegal_park:     { label: '违规停放',     color: '#fa8c16' },
  no_permit:        { label: '无通行证/过期', color: '#faad14' },
  night_violation:  { label: '夜间违规运输', color: '#1677ff' },
  over_load:        { label: '超载运输',     color: '#722ed1' },
  env_violation:    { label: '渣土车违规',   color: '#13c2c2' }
}

export const violationTypeOptions = Object.entries(violationTypeMeta).map(([value, m]) => ({ value: value as ViolationType, label: m.label }))

// 违章处理状态
export type ViolationStatus = 'pending' | 'processed' | 'closed'

export const violationStatusMeta: Record<ViolationStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: '待处理', color: '#8c8c8c', bg: 'rgba(140,140,140,0.1)' },
  processed: { label: '已处理', color: '#52c41a', bg: 'rgba(82,196,26,0.1)' },
  closed:    { label: '已关闭', color: '#6e4bff', bg: 'rgba(110,75,255,0.1)' }
}

// 上报来源
export type ViolationSource = 'manual' | 'ai'

export const violationSourceMeta: Record<ViolationSource, { label: string; icon: string; color: string }> = {
  manual: { label: '人工上报', icon: 'i-ant-design-user-outlined',  color: '#1677ff' },
  ai:     { label: 'AI上报',   icon: 'i-ant-design-robot-outlined', color: '#722ed1' }
}

// 违章记录
export interface ViolationRecord {
  id: string
  siteId: string
  siteName: string
  plate: string
  vehicleType: string
  driver: string
  unit: string
  violationType: ViolationType
  reportSource: ViolationSource
  reporter: string             // 上报人（人工上报时有值）
  location: string
  violationTime: string        // YYYY-MM-DD HH:mm
  fineAmount: number           // 罚款金额
  status: ViolationStatus
  description: string
  thumb: string
}

function generateViolations(): ViolationRecord[] {
  const records: ViolationRecord[] = []
  const rand = seededRandom(123)
  const types = Object.keys(violationTypeMeta) as ViolationType[]
  const sources = Object.keys(violationSourceMeta) as ViolationSource[]
  const reporters = ['赵安全', '钱班长', '孙工', '周安全', '吴主管']

  let idx = 0
  for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
    const dailyCount = Math.floor(rand() * 3) // 每天 0~2 条
    for (let i = 0; i < dailyCount; i++) {
      const site = constructionSites[Math.floor(rand() * constructionSites.length)]
      const vehicle = vehicleList[Math.floor(rand() * vehicleList.length)]
      const vType = types[Math.floor(rand() * types.length)]
      const source = sources[Math.floor(rand() * sources.length)]
      // 状态分布：60%已处理, 25%待处理, 15%已关闭
      const r = rand()
      const status: ViolationStatus = r < 0.6 ? 'processed' : r < 0.85 ? 'pending' : 'closed'
      idx++

      const month = dayOffset < 13 ? '07' : '06'
      const day = dayOffset < 13 ? String(13 - dayOffset).padStart(2, '0') : String(30 - (dayOffset - 13)).padStart(2, '0')
      const hour = String(6 + Math.floor(rand() * 16)).padStart(2, '0')
      const minute = String(Math.floor(rand() * 60)).padStart(2, '0')

      records.push({
        id: `vio-${idx}`,
        siteId: site.id,
        siteName: site.name,
        plate: vehicle.plate,
        vehicleType: vehicle.vehicleType,
        driver: vehicle.driver,
        unit: vehicle.unit,
        violationType: vType,
        reportSource: source,
        reporter: source === 'manual' ? reporters[Math.floor(rand() * reporters.length)] : 'AI识别系统',
        location: `${site.name}·${['东门', '南门', '北门', '施工区'][Math.floor(rand() * 4)]}`,
        violationTime: `2026-${month}-${day} ${hour}:${minute}`,
        fineAmount: [100, 200, 200, 500, 500, 1000, 2000][Math.floor(rand() * 7)],
        status,
        description: source === 'ai'
          ? violationTypeMeta[vType].label + '，被 AI 视频识别系统抓拍记录。'
          : violationTypeMeta[vType].label + '，由现场管理人员巡查发现并上报。',
        thumb: vehicleThumbs[idx % 4]
      })
    }
  }

  records.sort((a, b) => b.violationTime.localeCompare(a.violationTime))
  return records
}

export const violationRecords: ViolationRecord[] = generateViolations()

// ===== 进出记录 =====
export type AccessDirection = 'in' | 'out'
export type AccessMethod = 'plate_recognition' | 'manual' | 'permit_pass'

export const accessMethodMeta: Record<AccessMethod, { label: string; color: string }> = {
  plate_recognition: { label: '车牌识别', color: '#52c41a' },
  manual:            { label: '人工登记', color: '#1677ff' },
  permit_pass:       { label: '通行证', color: '#722ed1' }
}

export interface AccessRecord {
  id: string
  siteId: string
  siteName: string
  plate: string
  vehicleType: string
  driver: string
  unit: string
  direction: AccessDirection
  accessTime: string           // YYYY-MM-DD HH:mm
  gate: string                 // 进出闸口
  method: AccessMethod
  stayMinutes: number          // 停留时长（分钟），仅出场有
  thumb: string
}

function generateAccessRecords(): AccessRecord[] {
  const records: AccessRecord[] = []
  const rand = seededRandom(456)
  const methods = Object.keys(accessMethodMeta) as AccessMethod[]
  const gates = ['东门闸机', '南门闸机', '北门闸机', '西门闸机']

  let idx = 0
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const dailyCount = 4 + Math.floor(rand() * 8) // 每天 4~11 条
    for (let i = 0; i < dailyCount; i++) {
      const site = constructionSites[Math.floor(rand() * constructionSites.length)]
      const vehicle = vehicleList[Math.floor(rand() * vehicleList.length)]
      const direction: AccessDirection = rand() > 0.5 ? 'in' : 'out'
      const method = methods[Math.floor(rand() * methods.length)]
      idx++

      const month = dayOffset < 13 ? '07' : '06'
      const day = dayOffset < 13 ? String(13 - dayOffset).padStart(2, '0') : String(30 - (dayOffset - 13)).padStart(2, '0')
      const hour = String(6 + Math.floor(rand() * 16)).padStart(2, '0')
      const minute = String(Math.floor(rand() * 60)).padStart(2, '0')

      records.push({
        id: `acc-${idx}`,
        siteId: site.id,
        siteName: site.name,
        plate: vehicle.plate,
        vehicleType: vehicle.vehicleType,
        driver: vehicle.driver,
        unit: vehicle.unit,
        direction,
        accessTime: `2026-${month}-${day} ${hour}:${minute}`,
        gate: gates[Math.floor(rand() * gates.length)],
        method,
        stayMinutes: direction === 'out' ? 15 + Math.floor(rand() * 285) : 0,
        thumb: vehicleThumbs[idx % 4]
      })
    }
  }

  records.sort((a, b) => b.accessTime.localeCompare(a.accessTime))
  return records
}

export const accessRecords: AccessRecord[] = generateAccessRecords()
