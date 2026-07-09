/**
 * 养老场景 - 床位/老人/护工 mock 数据
 */
import photo1 from '@/assets/elderly/oldman-1.png'
import photo2 from '@/assets/elderly/oldman-2.png'
import photo3 from '@/assets/elderly/oldman-3.png'
import photo4 from '@/assets/elderly/oldman-4.png'
import photo5 from '@/assets/elderly/oldman-5.png'
import photo6 from '@/assets/elderly/oldman-6.png'
import photo7 from '@/assets/elderly/oldman-7.png'
import photo8 from '@/assets/elderly/oldman-8.png'

const photoPool = [photo1, photo2, photo3, photo4, photo5, photo6, photo7, photo8]

// ===== 楼栋/楼层/房间结构 =====
export interface RoomNode {
  value: string
  label: string
  bedCount?: number  // 叶子节点（房间）的床位数，可编辑
  children?: RoomNode[]
}
export const roomTree: RoomNode[] = [
  {
    value: 'b3', label: '3号楼',
    children: [
      {
        value: 'b3-1f', label: '1层',
        children: [
          { value: 'b3-101', label: '101室', bedCount: 6 },
          { value: 'b3-102', label: '102室', bedCount: 4 }
        ]
      },
      {
        value: 'b3-2f', label: '2层',
        children: [
          { value: 'b3-201', label: '201室', bedCount: 6 },
          { value: 'b3-202', label: '202室', bedCount: 4 }
        ]
      }
    ]
  },
  {
    value: 'b5', label: '5号楼',
    children: [
      {
        value: 'b5-3f', label: '3层',
        children: [
          { value: 'b5-301', label: '301室', bedCount: 6 },
          { value: 'b5-302', label: '302室', bedCount: 4 }
        ]
      }
    ]
  }
]

// ===== 床位/老人 =====
export type BedStatus = 'in-bed' | 'leave' | 'empty'  // 在床 / 离床 / 空床
export type HealthLevel = 'normal' | 'warn' | 'danger'

export interface ElderlyPerson {
  id: string
  name: string
  gender: '男' | '女'
  age: number
  room: string        // '101室'
  bedNo: string       // '1床'
  building: string    // '3号楼1层'
  careLevel: '自理' | '半护' | '全护'
  status: BedStatus
  heartRate: number   // 心率
  bloodPressureSys: number  // 收缩压
  bloodPressureDia: number  // 舒张压
  spo2: number        // 血氧 %
  bodyTemp: number    // 体温 ℃
  healthLevel: HealthLevel
  lastUpdate: string
  // 档案字段
  photo?: string
  idCard?: string
  phone?: string
  contactName?: string
  contactPhone?: string
  checkInDate: string
  remark?: string
  conditions?: string[]  // 慢性病/健康状况
}

export interface Bed {
  id: string
  room: string
  bedNo: string
  building: string
  status: BedStatus
  elderly?: ElderlyPerson  // 绑定的老人（空床时无）
}

function healthLevel(hr: number, sys: number, dia: number, spo2: number): HealthLevel {
  if (hr < 50 || hr > 120 || sys > 160 || dia > 100 || spo2 < 90) return 'danger'
  if (hr < 60 || hr > 100 || sys > 140 || dia > 90 || spo2 < 95) return 'warn'
  return 'normal'
}

const names = ['张奶奶', '李爷爷', '王奶奶', '赵爷爷', '刘奶奶', '陈爷爷', '孙奶奶', '周爷爷', '吴奶奶', '郑爷爷', '冯奶奶', '钱爷爷']
const conditionsPool = [['高血压', '糖尿病'], ['冠心病'], ['高血压'], ['老年痴呆'], ['糖尿病', '高血压'], ['骨质疏松'], []]

export function buildElderly(): ElderlyPerson[] {
  const out: ElderlyPerson[] = []
  const rooms = [
    { room: '101室', building: '3号楼1层', beds: 6 },
    { room: '102室', building: '3号楼1层', beds: 4 },
    { room: '201室', building: '3号楼2层', beds: 6 },
    { room: '202室', building: '3号楼2层', beds: 4 },
    { room: '301室', building: '5号楼3层', beds: 6 },
    { room: '302室', building: '5号楼3层', beds: 4 }
  ]
  let idx = 0
  for (const r of rooms) {
    for (let b = 1; b <= r.beds; b++) {
      if (idx % 5 === 4) { idx++; continue }  // 每5个空一张床
      const hr = 60 + (idx * 7) % 50          // 60~109
      const sys = 110 + (idx * 5) % 60        // 110~169
      const dia = 70 + (idx * 3) % 40         // 70~109
      const spo2 = 92 + (idx * 2) % 8         // 92~99
      const isFemale = idx % 2 === 0
      out.push({
        id: `e${idx + 1}`,
        name: names[idx % names.length],
        gender: isFemale ? '女' : '男',
        age: 75 + (idx * 3) % 15,
        room: r.room,
        bedNo: `${b}床`,
        building: r.building,
        photo: photoPool[idx % photoPool.length],
        careLevel: (['自理', '半护', '全护'] as const)[idx % 3],
        status: (idx % 7 === 0 ? 'leave' : 'in-bed') as BedStatus,
        heartRate: hr,
        bloodPressureSys: sys,
        bloodPressureDia: dia,
        spo2: spo2,
        bodyTemp: +(36.3 + (idx % 4) * 0.3).toFixed(1),
        healthLevel: healthLevel(hr, sys, dia, spo2),
        lastUpdate: `${8 + (idx % 10)}:${String((idx * 7) % 60).padStart(2, '0')}`,
        idCard: '3301' + String(20 + idx).padStart(2, '0') + (1960 + idx) + '0' + String(1000 + idx),
        phone: '138' + String(10000000 + idx * 111111),
        contactName: names[(idx + 3) % names.length].replace(/奶奶|爷爷/, '先生'),
        contactPhone: '139' + String(20000000 + idx * 222222),
        checkInDate: `2025-0${(idx % 9) + 1}-1${idx % 9}`,
        remark: ['需重点关注夜间离床', '饮食需控制', '行动不便需搀扶', '按时服药', ''][idx % 5],
        conditions: conditionsPool[idx % conditionsPool.length]
      })
      idx++
    }
  }
  return out
}

// 由老人列表构建床位列表（含空床）
export function buildBeds(): Bed[] {
  const elderly = buildElderly()
  const rooms = [
    { room: '101室', building: '3号楼1层', beds: 6 },
    { room: '102室', building: '3号楼1层', beds: 4 },
    { room: '201室', building: '3号楼2层', beds: 6 },
    { room: '202室', building: '3号楼2层', beds: 4 },
    { room: '301室', building: '5号楼3层', beds: 6 },
    { room: '302室', building: '5号楼3层', beds: 4 }
  ]
  const out: Bed[] = []
  let bid = 0
  for (const r of rooms) {
    for (let b = 1; b <= r.beds; b++) {
      bid++
      const e = elderly.find(x => x.room === r.room && x.bedNo === `${b}床`)
      out.push({
        id: `bed-${bid}`,
        room: r.room,
        bedNo: `${b}床`,
        building: r.building,
        status: e ? e.status : 'empty',
        elderly: e
      })
    }
  }
  return out
}

/**
 * 未绑定床位的候补老人（可用于空床位绑定）
 * room/bedNo 留空，表示尚未分配床位
 */
export function buildUnboundElderly(): ElderlyPerson[] {
  const extraNames = ['唐奶奶', '沈爷爷', '韩奶奶', '杨爷爷', '薛奶奶', '宋爷爷']
  return extraNames.map((name, i) => {
    const idx = i + 30
    const hr = 60 + (idx * 7) % 50
    const sys = 110 + (idx * 5) % 60
    const dia = 70 + (idx * 3) % 40
    const spo2 = 92 + (idx * 2) % 8
    const isFemale = idx % 2 === 0
    return {
      id: `eu-${i + 1}`,
      name,
      gender: isFemale ? '女' : '男',
      age: 75 + (idx * 3) % 15,
      room: '',
      bedNo: '',
      building: '',
      photo: photoPool[idx % photoPool.length],
      careLevel: (['自理', '半护', '全护'] as const)[idx % 3],
      status: 'leave' as BedStatus,
      heartRate: hr,
      bloodPressureSys: sys,
      bloodPressureDia: dia,
      spo2: spo2,
      bodyTemp: +(36.3 + (idx % 4) * 0.3).toFixed(1),
      healthLevel: healthLevel(hr, sys, dia, spo2),
      lastUpdate: '--',
      checkInDate: `2025-0${(i % 6) + 2}-0${(i % 8) + 1}`,
      remark: '待分配床位',
      conditions: conditionsPool[idx % conditionsPool.length]
    }
  })
}

// ===== 护工档案 =====
export interface StaffProfile {
  id: string
  name: string
  gender: '男' | '女'
  age: number
  phone: string
  position: '初级护工' | '中级护工' | '高级护工' | '护士长'
  shift: '白班' | '晚班' | '夜班'
  entryDate: string
  responsible: string        // 负责区域/老人
  elderlyCount: number       // 照护老人数
  careCount: number          // 今日护理次数
  completionRate: number     // 完成率
  avgResponse: number        // 平均响应秒
  rating: number             // 评分
  certificates: string[]     // 资质证书
  remark: string
  photo?: string             // 护工照片
}

const staffNames = ['李护理', '王护理', '张护理', '赵护理', '陈护理', '刘护理', '杨护理', '周护理']
const certsPool = [['养老护理员证', '红十字救护员证'], ['养老护理员证'], ['护士执业资格证', '养老护理员证'], ['养老护理员证', '健康管理师']]

export function buildStaffProfiles(): StaffProfile[] {
  return staffNames.map((name, i) => ({
    id: `s${i + 1}`,
    name,
    gender: (i % 3 === 0 ? '男' : '女') as '男' | '女',
    age: 28 + (i * 3) % 15,
    phone: '137' + String(10000000 + i * 123456),
    position: (['初级护工', '中级护工', '高级护工', '护士长'] as const)[i % 4],
    shift: (['白班', '白班', '晚班', '晚班', '夜班'] as const)[i % 5],
    entryDate: `202${2 + (i % 3)}-0${(i % 9) + 1}-15`,
    responsible: `${i % 2 === 0 ? '3号楼' : '5号楼'}${(i % 3) + 1}层（${8 + i}位老人）`,
    elderlyCount: 8 + i,
    careCount: 20 + (i * 3) % 12,
    completionRate: 88 + (i * 2) % 13,
    avgResponse: 85 + (i * 11) % 100,
    rating: +(4 + (i % 9) / 10).toFixed(1),
    certificates: certsPool[i % certsPool.length],
    remark: ['工作认真负责', '夜间护理经验丰富', '善于与老人沟通', ''][i % 4],
    photo: photoPool[i % photoPool.length]
  }))
}
