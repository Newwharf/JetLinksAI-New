/**
 * 老人档案管理 mock 数据
 * 护理行为类型 + 护理事件 + 老人习惯
 */
import { personInfoMap, eventSnapPool } from './behavior.mock'
import photo03 from '@/assets/elderly/oldman-3.png'
import photo04 from '@/assets/elderly/oldman-4.png'
import photo05 from '@/assets/elderly/oldman-5.png'
import photo06 from '@/assets/elderly/oldman-6.png'
import photo07 from '@/assets/elderly/oldman-7.png'

// ===== 护理行为类型 =====
export interface CareType {
  key: string
  label: string
  color: string
  icon: string
}
export const careTypes: CareType[] = [
  { key: 'turn', label: '翻身护理', color: '#6e4bff', icon: 'i-ant-design-sync-outlined' },
  { key: 'medicine', label: '用药护理', color: '#52c41a', icon: 'i-ant-design-medicine-box-outlined' },
  { key: 'patrol', label: '巡房查看', color: '#1890ff', icon: 'i-ant-design-eye-outlined' },
  { key: 'meal', label: '餐饮辅助', color: '#fa8c16', icon: 'i-ant-design-coffee-outlined' },
  { key: 'clean', label: '清洁护理', color: '#13c2c2', icon: 'i-ant-design-clear-outlined' },
  { key: 'response', label: '呼叫响应', color: '#ff4d4f', icon: 'i-ant-design-bell-outlined' }
]

// ===== 护工信息 =====
export interface StaffInfo {
  id: string
  name: string
  gender: '男' | '女'
  photo: string
}
const staffPool: StaffInfo[] = [
  { id: 's1', name: '李护理', gender: '女', photo: photo05 },
  { id: 's2', name: '王护理', gender: '女', photo: photo03 },
  { id: 's3', name: '张护理', gender: '男', photo: photo06 },
  { id: 's4', name: '赵护理', gender: '女', photo: photo07 },
  { id: 's5', name: '陈护理', gender: '男', photo: photo04 }
]

// ===== 护理行为事件 =====
export interface CareEvent {
  id: string
  personId: string
  staffId: string
  staffName: string
  staffPhoto: string
  staffGender: '男' | '女'
  time: string
  timestamp: number
  typeKey: string
  typeName: string
  desc: string
  snapshot: string
  camera: string
  duration?: string
}

const careDescs: Record<string, string[]> = {
  turn: ['协助老人翻身，调整舒适体位', '定时翻身预防压疮', '协助侧卧位更换'],
  medicine: ['按时服药 - 降压药 1片', '按时服药 - 降糖药 1片', '餐后服药 - 心血管药物'],
  patrol: ['常规巡房，老人状态正常', '晨间巡房', '夜间巡房，老人已安睡'],
  meal: ['协助老人午餐，完成进食', '协助饮水', '提供营养餐食'],
  clean: ['协助老人清洁面部', '更换衣物', '整理床铺卫生'],
  response: ['老人呼叫，响应并解决问题', '呼叫器响应，协助如厕']
}

// 生成护理事件（近30天）
export function buildCareEvents(): CareEvent[] {
  const out: CareEvent[] = []
  let eid = 0
  const now = Date.now()
  const personIds = Object.keys(personInfoMap)
  for (let day = 0; day < 30; day++) {
    for (const pid of personIds) {
      const count = 2 + ((day * 5 + pid.charCodeAt(1)) % 4) // 每天2~5条
      for (let i = 0; i < count; i++) {
        eid++
        const typeIdx = (eid * 7 + day) % careTypes.length
        const t = careTypes[typeIdx]
        const staff = staffPool[eid % staffPool.length]
        const ts = now - day * 86400000 - (i % 24) * 3600000 - (eid % 60) * 60000
        const d = new Date(ts)
        const mm = String(d.getMonth() + 1).padStart(2, '0')
        const dd = String(d.getDate()).padStart(2, '0')
        const hh = String(d.getHours()).padStart(2, '0')
        const mi = String(d.getMinutes()).padStart(2, '0')
        out.push({
          id: `care-${eid}`,
          personId: pid,
          staffId: staff.id,
          staffName: staff.name,
          staffPhoto: staff.photo,
          staffGender: staff.gender,
          time: `${mm}-${dd} ${hh}:${mi}`,
          timestamp: ts,
          typeKey: t.key,
          typeName: t.label,
          desc: careDescs[t.key][eid % careDescs[t.key].length],
          snapshot: eventSnapPool[eid % eventSnapPool.length],
          camera: `${['走廊', '寝室', '活动室', '卫生间', '楼道'][eid % 5]}摄像头${eid % 2 === 0 ? 'A' : 'B'}`,
          duration: `${2 + (eid % 8)}分钟`
        })
      }
    }
  }
  return out.sort((a, b) => b.timestamp - a.timestamp)
}

// ===== 老人习惯 =====
export interface Habit {
  id: string
  title: string
  desc: string
  icon?: string
}

// 各老人的习惯总结 + 习惯列表
const habitTemplates: Record<string, { summary: string; habits: Habit[] }> = {
  default: {
    summary: '根据近30天行为数据分析，老人整体作息规律，每日6:30左右起床，21:00前就寝，睡眠质量较为稳定。饮食方面三餐规律，偏爱清淡口味，午餐食量略大，早餐偏好粥类和面食，饮水量日均约800ml。活动范围主要集中在寝室和一楼活动室，每日午后有固定的散步习惯，单次持续15-20分钟。社交互动较少，与同房间老人偶有交流，但较少参与集体文娱活动。近30天偶有夜间2-3点离床行为，持续约10分钟后自行返回，未发现明显异常。情绪状态整体平稳，未见明显的焦虑或抑郁倾向。',
    habits: [
      { id: 'h1', title: '规律作息', desc: '每日6:20-6:40起床，20:50-21:10就寝，作息时间稳定', icon: 'i-ant-design-clock-circle-outlined' },
      { id: 'h2', title: '饮食偏好', desc: '偏爱清淡饮食，午餐食量较大，早餐偏好粥类', icon: 'i-ant-design-coffee-outlined' },
      { id: 'h3', title: '活动区域', desc: '主要在寝室和活动室活动，较少去户外', icon: 'i-ant-design-environment-outlined' },
      { id: 'h4', title: '夜间行为', desc: '偶尔凌晨2-3点离床，持续约10分钟后回床', icon: 'i-ant-design-moon-outlined' },
      { id: 'h5', title: '社交习惯', desc: '与同房间老人互动较多，较少参与集体活动', icon: 'i-ant-design-team-outlined' }
    ]
  },
  p1: {
    summary: '张奶奶近30天行为分析显示，老人作息较为规律，每日6:00左右起床，20:30就寝。但跌倒风险较高，已发生3次跌倒事件，集中在6:00-8:00晨起时段和19:00-21:00晚间时段，多发于卫生间和走廊湿滑区域。每日规律如厕4-5次，集中在饭后30分钟内，行动时需搀扶。每日按时服用降压药2次，需护工提醒。饮食方面早餐食量偏少，午餐正常，晚餐偶有剩饭。午后有走廊散步习惯但步态不稳，建议加强行走看护，卫生间加装防滑设施，夜间增加巡视频次。',
    habits: [
      { id: 'h1', title: '跌倒高风险', desc: '近30天发生3次跌倒，集中在6:00-8:00和19:00-21:00时段', icon: 'i-ant-design-alert-outlined' },
      { id: 'h2', title: '如厕规律', desc: '每日规律如厕4-5次，集中在饭后30分钟内', icon: 'i-ant-design-clock-circle-outlined' },
      { id: 'h3', title: '用药依赖', desc: '每日需服用降压药2次，护工需按时提醒', icon: 'i-ant-design-medicine-box-outlined' },
      { id: 'h4', title: '活动偏好', desc: '喜欢在走廊散步，但需搀扶', icon: 'i-ant-design-environment-outlined' }
    ]
  },
  p3: {
    summary: '王奶奶近30天行为分析显示，受阿尔茨海默症影响，老人认知功能下降明显，行为模式存在显著异常。夜间走动频繁，凌晨1-4点平均每周离床3-4次，每次持续15-30分钟，已发生5次夜间未归寝事件，最远走至2层楼梯口。白天存在反复整理床铺和衣物的重复性行为，每日约6-8次。在楼道中容易迷失方向，需护工引导返回。下午15-17点时段易出现焦虑和躁动情绪，需要陪伴安抚。建议加强夜间巡护，使用防走失手环，增加认知训练和情绪疏导。',
    habits: [
      { id: 'h1', title: '夜间走动', desc: '凌晨1-4点频繁离床走动，平均持续15-30分钟', icon: 'i-ant-design-moon-outlined' },
      { id: 'h2', title: '重复行为', desc: '会反复整理床铺和衣物，每日约6-8次', icon: 'i-ant-design-sync-outlined' },
      { id: 'h3', title: '认路困难', desc: '在楼道容易迷失方向，需要引导回寝室', icon: 'i-ant-design-environment-outlined' },
      { id: 'h4', title: '情绪波动', desc: '下午15-17点易出现焦虑情绪，需要陪伴安抚', icon: 'i-ant-design-heart-outlined' }
    ]
  }
}

export function buildHabits(personId: string): { summary: string; habits: Habit[] } {
  return habitTemplates[personId] || JSON.parse(JSON.stringify(habitTemplates.default))
}

// 分析生成（模拟AI生成新习惯）
export function generateHabits(personId: string): Habit[] {
  const seed = personId.charCodeAt(personId.length - 1)
  const pool: Habit[] = [
    { id: `gen-${Date.now()}-1`, title: '晨间活动', desc: `${seed % 2 === 0 ? '习惯在起床后30分钟内进行简单肢体活动' : '起床后倾向于立即进食'}`, icon: 'i-ant-design-sun-outlined' },
    { id: `gen-${Date.now()}-2`, title: '午休规律', desc: `每日${12 + (seed % 2)}:00-${13 + (seed % 2)}:00午休，时长约${40 + (seed % 3) * 15}分钟`, icon: 'i-ant-design-moon-outlined' },
    { id: `gen-${Date.now()}-3`, title: '饮水习惯', desc: '每日饮水量约800ml，集中在上午时段', icon: 'i-ant-design-bubble-chart-outlined' },
    { id: `gen-${Date.now()}-4`, title: '社交互动', desc: `${seed % 2 === 0 ? '与护工互动积极，乐于交流' : '较为安静，主动交流较少'}`, icon: 'i-ant-design-team-outlined' },
    { id: `gen-${Date.now()}-5`, title: '情绪时段', desc: `${seed % 3 === 0 ? '上午情绪状态最佳' : '下午情绪较为平稳'}`, icon: 'i-ant-design-smile-outlined' }
  ]
  return pool.slice(0, 3 + (seed % 3))
}
