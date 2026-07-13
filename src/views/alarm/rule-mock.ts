/**
 * 告警规则 mock 数据
 * 规则列表 + 场景算法 + 摄像头树 + 通知方式
 */
import cam1 from '@/assets/text-search/result-01.jpg'
import cam2 from '@/assets/text-search/result-02.jpg'
import cam3 from '@/assets/text-search/result-03.jpg'
import cam4 from '@/assets/text-search/result-04.jpg'
import cam5 from '@/assets/text-search/result-05.jpg'
import cam6 from '@/assets/text-search/result-06.jpg'
import cam7 from '@/assets/text-search/result-07.jpg'
import cam8 from '@/assets/text-search/result-08.jpg'

// ===== 告警等级 =====
export type AlarmLevel = '超紧急' | '紧急' | '严重' | '一般' | '提醒'

// ===== 通知配置：影响通知内容模板 =====
export type NotifyCategory = '安全告警' | '合规告警'

// ===== 告警规则 =====
export interface AlarmRule {
  id: string
  name: string
  level: AlarmLevel
  desc: string
  /** 已选算法名称 */
  algorithms: string[]
  /** 已选摄像头 ID */
  cameraIds: string[]
  /** 摄像头数量 */
  cameraCount: number
  /** 生效时段类型 */
  scheduleType: 'all' | 'weekday' | 'night' | 'custom'
  scheduleText: string
  /** 通知方式（固定站内信） */
  notifyMethods: string[]
  /** 通知配置：安全告警 / 合规告警，决定通知内容模板 */
  notifyCategory: NotifyCategory
  /** 通知人员 */
  notifyUsers: string[]
  /** 去重开关 */
  dedup: boolean
  /** 去重间隔（分钟） */
  dedupMinutes?: number
  /** 24h 触发次数 */
  triggerCount24h: number
  /** 状态 */
  enabled: boolean
}

export const alarmRules = ref<AlarmRule[]>([
  {
    id: 'rule-1', name: '园区周界入侵检测', level: '超紧急',
    desc: '检测园区周界区域的非授权人员入侵行为，实时触发告警',
    algorithms: ['人员入侵', '翻越检测'],
    cameraIds: ['cam-1', 'cam-2'], cameraCount: 6,
    scheduleType: 'night', scheduleText: '夜间 (18:00-06:00)',
    notifyMethods: ['站内信', '短信', '钉钉'],
    notifyCategory: '安全告警',
    notifyUsers: ['张伟', '李娜', '安保组'],
    dedup: true, dedupMinutes: 10,
    triggerCount24h: 12, enabled: true
  },
  {
    id: 'rule-2', name: '办公楼烟雾检测', level: '紧急',
    desc: '监测办公楼公共区域的烟雾和火情',
    algorithms: ['烟火检测'],
    cameraIds: ['cam-3', 'cam-4'], cameraCount: 4,
    scheduleType: 'all', scheduleText: '全天',
    notifyMethods: ['站内信', '短信'],
    notifyCategory: '安全告警',
    notifyUsers: ['消防组', '物业中心'],
    dedup: false,
    triggerCount24h: 3, enabled: true
  },
  {
    id: 'rule-3', name: '禁烟区域抽烟识别', level: '严重',
    desc: '识别禁烟区域内的抽烟行为',
    algorithms: ['抽烟检测'],
    cameraIds: ['cam-5'], cameraCount: 3,
    scheduleType: 'weekday', scheduleText: '工作日 (09:00-18:00)',
    notifyMethods: ['站内信', '企业微信'],
    notifyCategory: '合规告警',
    notifyUsers: ['行政部'],
    dedup: true, dedupMinutes: 30,
    triggerCount24h: 28, enabled: true
  },
  {
    id: 'rule-4', name: '停车场车辆违停', level: '提醒',
    desc: '检测停车场内违规停车行为',
    algorithms: ['车辆违停'],
    cameraIds: ['cam-6', 'cam-7'], cameraCount: 5,
    scheduleType: 'all', scheduleText: '全天',
    notifyMethods: ['站内信'],
    notifyCategory: '合规告警',
    notifyUsers: ['物业中心'],
    dedup: false,
    triggerCount24h: 56, enabled: false
  },
  {
    id: 'rule-5', name: '夜间物品遗留检测', level: '严重',
    desc: '检测夜间可疑物品遗留',
    algorithms: ['物品遗留'],
    cameraIds: ['cam-8'], cameraCount: 2,
    scheduleType: 'night', scheduleText: '夜间 (22:00-06:00)',
    notifyMethods: ['站内信', '短信', '企业微信'],
    notifyCategory: '安全告警',
    notifyUsers: ['安保组', '值班人员'],
    dedup: true, dedupMinutes: 15,
    triggerCount24h: 7, enabled: true
  },
  {
    id: 'rule-6', name: '人员聚集异常', level: '一般',
    desc: '检测公共区域人员异常聚集',
    algorithms: ['人员聚集', '人员徘徊'],
    cameraIds: ['cam-1', 'cam-3'], cameraCount: 8,
    scheduleType: 'custom', scheduleText: '自定义时段',
    notifyMethods: ['站内信', '钉钉', 'Webhook'],
    notifyCategory: '安全告警',
    notifyUsers: ['安保组'],
    dedup: false,
    triggerCount24h: 15, enabled: true
  }
])

// ===== 场景和算法 =====
export interface AlgoItem {
  name: string
  desc: string
}
export interface SceneItem {
  id: string
  name: string
  icon: string
  algorithms: AlgoItem[]
}

export const scenes: SceneItem[] = [
  {
    id: 'scene-intrusion', name: '入侵检测', icon: 'i-ant-design-safety-outlined', algorithms: [
      { name: '人员入侵', desc: '检测人员进入禁止区域的行为' },
      { name: '翻越检测', desc: '检测人员翻越围墙或栅栏' },
      { name: '攀爬检测', desc: '识别人员攀爬建筑外围结构' },
      { name: '区域入侵', desc: '监控划定的禁入区域是否有闯入' }
    ]
  },
  {
    id: 'scene-fire', name: '烟火检测', icon: 'i-ant-design-fire-outlined', algorithms: [
      { name: '烟火检测', desc: '同时检测画面中的明火和烟雾' },
      { name: '火焰识别', desc: '识别画面中的明火火源' },
      { name: '烟雾识别', desc: '识别画面中异常的烟雾' }
    ]
  },
  {
    id: 'scene-person', name: '人员行为', icon: 'i-ant-design-team-outlined', algorithms: [
      { name: '人员聚集', desc: '检测区域内人员数量异常增多' },
      { name: '人员徘徊', desc: '识别人员在敏感区域长时间逗留' },
      { name: '抽烟检测', desc: '识别禁烟区域内的抽烟行为' },
      { name: '打架检测', desc: '检测人员之间的肢体冲突行为' },
      { name: '跌倒检测', desc: '识别人员突然摔倒或跌倒' }
    ]
  },
  {
    id: 'scene-vehicle', name: '车辆管理', icon: 'i-ant-design-car-outlined', algorithms: [
      { name: '车辆违停', desc: '检测车辆在禁停区域的违章停车' },
      { name: '车辆逆行', desc: '识别车辆在单行道的逆向行驶' },
      { name: '车牌识别', desc: '自动识别并记录车辆车牌号码' },
      { name: '违停检测', desc: '检测车辆超时停放或违规占道' }
    ]
  },
  {
    id: 'scene-object', name: '物品安全', icon: 'i-ant-design-property-safety-outlined', algorithms: [
      { name: '物品遗留', desc: '检测可疑物品被遗留超过设定时间' },
      { name: '物品搬移', desc: '检测监控物品被移动或搬离' }
    ]
  }
]

// ===== 摄像头树 =====
export interface CameraTreeNode {
  key: string
  title: string
  count?: number
  isLeaf?: boolean
  camId?: string
  status?: 'online' | 'offline'
  thumb?: string
  children?: CameraTreeNode[]
}

export const cameraTree: CameraTreeNode[] = [
  {
    key: 'park', title: '物联网产业园区', count: 8, children: [
      {
        key: 'b-e', title: 'E栋', count: 5, children: [
          { key: 'area-E栋/4F', title: '4F', count: 3, children: [
            { key: 'cam-1', title: '东门摄像头', isLeaf: true, camId: 'cam-1', status: 'online', thumb: cam1 },
            { key: 'cam-2', title: '大厅摄像头A', isLeaf: true, camId: 'cam-2', status: 'online', thumb: cam2 },
            { key: 'cam-3', title: '会议室摄像头', isLeaf: true, camId: 'cam-3', status: 'online', thumb: cam3 }
          ]},
          { key: 'area-E栋/2F', title: '2F', count: 2, children: [
            { key: 'cam-4', title: '车库摄像头', isLeaf: true, camId: 'cam-4', status: 'online', thumb: cam4 },
            { key: 'cam-5', title: '南门摄像头', isLeaf: true, camId: 'cam-5', status: 'offline', thumb: cam5 }
          ]}
        ]
      },
      {
        key: 'b-a', title: 'A栋', count: 3, children: [
          { key: 'area-A栋/1F', title: '1F', count: 3, children: [
            { key: 'cam-6', title: '运营办公室摄像头', isLeaf: true, camId: 'cam-6', status: 'online', thumb: cam6 },
            { key: 'cam-7', title: '入口摄像头', isLeaf: true, camId: 'cam-7', status: 'online', thumb: cam7 },
            { key: 'cam-8', title: '后门摄像头', isLeaf: true, camId: 'cam-8', status: 'offline', thumb: cam8 }
          ]}
        ]
      }
    ]
  }
]

// 收集树中所有叶子（摄像头）节点
export function collectCameras(nodes: CameraTreeNode[]): CameraTreeNode[] {
  const result: CameraTreeNode[] = []
  function walk(list: CameraTreeNode[]) {
    for (const n of list) {
      if (n.isLeaf) result.push(n)
      else if (n.children) walk(n.children)
    }
  }
  walk(nodes)
  return result
}

// 获取某个节点下所有摄像头
export function getCamerasInNode(nodes: CameraTreeNode[], nodeKey: string): CameraTreeNode[] {
  function find(list: CameraTreeNode[]): CameraTreeNode[] | null {
    for (const n of list) {
      if (n.key === nodeKey) {
        return collectCameras([n])
      }
      if (n.children) {
        const r = find(n.children)
        if (r) return r
      }
    }
    return null
  }
  return find(nodes) || []
}

// ===== 通知方式 =====
export interface NotifyMethod {
  key: string
  label: string
  icon: string
}

export const notifyMethods: NotifyMethod[] = [
  { key: '站内信', label: '站内信', icon: 'i-ant-design-message-outlined' },
  { key: '短信', label: '短信', icon: 'i-ant-design-mobile-outlined' },
  { key: '邮箱', label: '邮箱', icon: 'i-ant-design-mail-outlined' },
  { key: '钉钉', label: '钉钉', icon: 'i-ant-design-notification-outlined' },
  { key: '企业微信', label: '企业微信', icon: 'i-ant-design-wechat-outlined' },
  { key: 'Webhook', label: 'Webhook', icon: 'i-ant-design-api-outlined' }
]

// ===== 通知配置：安全告警 / 合规告警 =====
export interface NotifyCategoryOption {
  key: NotifyCategory
  label: string
  desc: string
  icon: string
}

export const notifyCategoryOptions: NotifyCategoryOption[] = [
  {
    key: '安全告警',
    label: '安全告警',
    desc: '面向安保/消防，突出风险等级、现场画面与处置建议',
    icon: 'i-ant-design-safety-certificate-outlined'
  },
  {
    key: '合规告警',
    label: '合规告警',
    desc: '面向行政/合规，突出违规条款引用与整改要求',
    icon: 'i-ant-design-audit-outlined'
  }
]

// 通知内容模板（占位符：{规则名} {等级} {摄像头} {区域} {时间}）
export const notifyTemplates: Record<NotifyCategory, { title: string; lines: string[] }> = {
  '安全告警': {
    title: '【安全告警】{规则名}',
    lines: [
      '风险等级：{等级}',
      '发生位置：{摄像头} · {区域}',
      '触发时间：{时间}',
      '处置建议：请相关人员立即前往现场核实并处置，可通过告警详情查看实时画面。'
    ]
  },
  '合规告警': {
    title: '【合规告警】{规则名}',
    lines: [
      '违规类型：{等级}',
      '发生位置：{摄像头} · {区域}',
      '触发时间：{时间}',
      '整改要求：请责任部门依据《园区安全管理规范》核实并落实整改，保留处置记录以备合规审计。'
    ]
  }
}

// 通知人员候选
export const userOptions = ['张伟', '李娜', '王强', '赵敏', '安保组', '消防组', '物业中心', '行政部', '值班人员', '技术部']

// ===== 时段选项 =====
export const scheduleOptions = [
  { key: 'all', label: '全天', desc: '7×24 小时全天候生效' },
  { key: 'weekday', label: '工作日', desc: '周一至周五 09:00-18:00' },
  { key: 'night', label: '夜间', desc: '每天 18:00-次日 06:00' },
  { key: 'custom', label: '自定义', desc: '按天按小时精细设置' }
]

export const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
