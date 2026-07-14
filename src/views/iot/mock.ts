/**
 * 物联中心 mock 数据
 * 设备 + 产品 + 设备分组 + 异常 + 图表数据
 */
import { ref } from 'vue'

// ===== 设备状态 =====
export type DeviceStatus = 'online' | 'offline' | 'alert' | 'silent' | 'disabled'
export type RiskLevel = '无风险' | '低风险' | '中风险' | '高风险'
export type DeviceType = '直连设备' | '网关子设备' | '网关设备'

// ===== 设备 =====
export interface IotDevice {
  id: string
  name: string
  product: string
  productId: string
  vendor: string
  model: string
  status: DeviceStatus
  type: DeviceType
  /** 接入方式描述 */
  accessType: string
  /** 所属区域 */
  area: string
  /** 业务分组 */
  business: string
  healthScore: number
  lastReport: string
  riskLevel: RiskLevel
  sn: string
  /** 图标 iconify 类名 */
  icon: string
  /** 设备说明 */
  desc: string
}

export const devices = ref<IotDevice[]>([
  { id: 'dev-1', name: 'WIFI雷达传感器', product: 'WIFI雷达传感器', productId: 'prod-1', vendor: 'Ustone/韵石', model: 'HA-W24', status: 'online', type: '直连设备', accessType: 'wifi雷达传感器接入网关', area: '研发部办公区', business: '消防安全', healthScore: 92, lastReport: '2026-07-10 14:32', riskLevel: '无风险', sn: '2074432663984652288', icon: 'i-ant-design-radar-chart-outlined', desc: '毫米波人体存在传感器' },
  { id: 'dev-2', name: '导轨温湿度', product: '导轨温湿度', productId: 'prod-2', vendor: '九维健', model: 'LD-13-WS-23', status: 'online', type: '网关子设备', accessType: '子设备接入网关', area: '研发部办公区', business: '环境监测', healthScore: 88, lastReport: '2026-07-10 14:30', riskLevel: '无风险', sn: '2074377763485499392', icon: 'i-ant-design-thermometer-outlined', desc: '工业级温湿度变送器' },
  { id: 'dev-3', name: '双轴倾角传感器', product: '双轴倾角传感器', productId: 'prod-3', vendor: '锡科传感', model: 'GXK162', status: 'online', type: '网关子设备', accessType: '子设备接入网关', area: '研发部办公区', business: '姿态监测', healthScore: 95, lastReport: '2026-07-10 14:28', riskLevel: '无风险', sn: '2072991362678267904', icon: 'i-ant-design-aim-outlined', desc: '双轴倾角测量' },
  { id: 'dev-4', name: '水浸监测器', product: '水浸传感器', productId: 'prod-2', vendor: '塔石', model: 'TAS-SJ-RK-0000', status: 'online', type: '网关子设备', accessType: '子设备接入网关', area: '研发部办公区', business: '环境监测', healthScore: 90, lastReport: '2026-07-10 14:25', riskLevel: '无风险', sn: '2072990507820392448', icon: 'i-ant-design-experiment-outlined', desc: '液体泄漏检测' },
  { id: 'dev-5', name: '光照监测器', product: '光照监测器', productId: 'prod-2', vendor: '塔石', model: 'TAS-GZ-R2X000', status: 'online', type: '网关子设备', accessType: '子设备接入网关', area: '研发部办公区', business: '环境监测', healthScore: 87, lastReport: '2026-07-10 14:20', riskLevel: '无风险', sn: '2072990308616118272', icon: 'i-ant-design-bulb-outlined', desc: '环境光照度检测' },
  { id: 'dev-6', name: '温湿度监测器', product: '华汉维温湿度', productId: 'prod-2', vendor: '华汉维', model: 'TH10W-E', status: 'online', type: '网关子设备', accessType: '子设备接入网关', area: '项目部办公区', business: '环境监测', healthScore: 85, lastReport: '2026-07-10 14:15', riskLevel: '低风险', sn: '2072288128924188672', icon: 'i-ant-design-thermometer-outlined', desc: '壁挂式温湿度计' },
  { id: 'dev-7', name: '海湾主机-研发楼', product: '海湾主机', productId: 'prod-1', vendor: '海湾', model: 'GST200', status: 'online', type: '网关子设备', accessType: '网关子设备接入', area: '研发楼', business: '消防安全', healthScore: 91, lastReport: '2026-07-10 14:10', riskLevel: '无风险', sn: '2074432663984652289', icon: 'i-ant-design-safety-outlined', desc: '消防报警主机' },
  { id: 'dev-8', name: '可燃气体探测器', product: '可燃气体探测器', productId: 'prod-3', vendor: '海湾', model: 'GST-BR', status: 'alert', type: '网关子设备', accessType: '子设备接入网关', area: '厨房', business: '消防安全', healthScore: 62, lastReport: '2026-07-10 14:05', riskLevel: '高风险', sn: '2072990507820392449', icon: 'i-ant-design-fire-outlined', desc: '可燃气体浓度检测' },
  { id: 'dev-9', name: '烟雾探测器A', product: '烟雾探测器', productId: 'prod-1', vendor: '海湾', model: 'GST-YG', status: 'online', type: '网关子设备', accessType: '子设备接入网关', area: '走廊', business: '消防安全', healthScore: 89, lastReport: '2026-07-10 13:58', riskLevel: '无风险', sn: '2072990507820392450', icon: 'i-ant-design-bell-outlined', desc: '光电感烟探测' },
  { id: 'dev-10', name: '烟雾探测器B', product: '烟雾探测器', productId: 'prod-1', vendor: '海湾', model: 'GST-YG', status: 'silent', type: '网关子设备', accessType: '子设备接入网关', area: '仓库', business: '消防安全', healthScore: 55, lastReport: '2026-07-09 08:30', riskLevel: '中风险', sn: '2072990507820392451', icon: 'i-ant-design-bell-outlined', desc: '光电感烟探测' },
  { id: 'dev-11', name: '门磁传感器', product: '门磁传感器', productId: 'prod-3', vendor: '塔石', model: 'TAS-MC', status: 'online', type: '网关子设备', accessType: '子设备接入网关', area: '前门', business: '安全防护', healthScore: 93, lastReport: '2026-07-10 14:00', riskLevel: '无风险', sn: '2072990507820392452', icon: 'i-ant-design-door-outlined', desc: '门开合状态检测' },
  { id: 'dev-12', name: '红外人体感应', product: '红外人体感应器', productId: 'prod-2', vendor: '九维健', model: 'LD-IR-01', status: 'online', type: '网关子设备', accessType: '子设备接入网关', area: '大厅', business: '安全防护', healthScore: 86, lastReport: '2026-07-10 13:55', riskLevel: '无风险', sn: '2072990507820392453', icon: 'i-ant-design-team-outlined', desc: 'PIR 人体感应' },
  { id: 'dev-13', name: '电磁流量计', product: '电磁流量计', productId: 'prod-3', vendor: '上海光华', model: 'IFM4080', status: 'online', type: '直连设备', accessType: 'MQTT直连', area: '水泵房', business: '能耗分析', healthScore: 84, lastReport: '2026-07-10 13:50', riskLevel: '低风险', sn: '2072990507820392454', icon: 'i-ant-design-swap-outlined', desc: '电磁流量测量' },
  { id: 'dev-14', name: '电参数采集仪', product: '电参数采集仪', productId: 'prod-1', vendor: '安科瑞', model: 'ACR220EL', status: 'online', type: '直连设备', accessType: 'MQTT直连', area: '配电室', business: '能耗分析', healthScore: 90, lastReport: '2026-07-10 13:45', riskLevel: '无风险', sn: '2072990507820392455', icon: 'i-ant-design-thunderbolt-outlined', desc: '多功能电力仪表' },
  { id: 'dev-15', name: '智能水表', product: '智能水表', productId: 'prod-2', vendor: '新天科技', model: 'LXSG', status: 'offline', type: '网关子设备', accessType: 'LoRaWAN', area: '地下室', business: '能耗分析', healthScore: 45, lastReport: '2026-07-08 10:20', riskLevel: '中风险', sn: '2072990507820392456', icon: 'i-ant-design-experiment-outlined', desc: '超声波智能水表' },
  { id: 'dev-16', name: '智能电表', product: '智能电表', productId: 'prod-1', vendor: '威胜', model: 'DDZY719', status: 'online', type: '直连设备', accessType: 'MQTT直连', area: '配电室', business: '能耗分析', healthScore: 92, lastReport: '2026-07-10 14:02', riskLevel: '无风险', sn: '2072990507820392457', icon: 'i-ant-design-thunderbolt-outlined', desc: '单相智能电表' },
  { id: 'dev-17', name: '噪音监测器', product: '噪音监测器', productId: 'prod-3', vendor: '爱华', model: 'AWA5636', status: 'online', type: '直连设备', accessType: 'MQTT直连', area: '厂界', business: '环境监测', healthScore: 81, lastReport: '2026-07-10 13:40', riskLevel: '低风险', sn: '2072990507820392458', icon: 'i-ant-design-sound-outlined', desc: '声级监测' },
  { id: 'dev-18', name: '空气质量监测', product: '空气质量监测仪', productId: 'prod-2', vendor: '先河环保', model: 'XHAMS2000', status: 'disabled', type: '直连设备', accessType: 'MQTT直连', area: '厂界', business: '环境监测', healthScore: 0, lastReport: '2026-06-28 16:00', riskLevel: '无风险', sn: '2072990507820392459', icon: 'i-ant-design-cloud-outlined', desc: '空气质量监测站' }
])

// ===== 产品 =====
export interface Product {
  id: string
  name: string
  type: DeviceType
  propertyCount: number
  accessMethod: string
  scene: string
  vendor: string
  model: string
  deviceCount: number
  desc: string
  brand: string
  version: string
  publishDate: string
  refProjectCount: number
  authMethod: string
  /** 设备能力：实时监测属性 */
  monitorProps: string[]
  /** 设备能力：可触发告警事件 */
  alertEvents: string[]
  /** 设备能力：远程控制指令 */
  remoteControls: string[]
}

export const products: Product[] = [
  {
    id: 'prod-1', name: '海湾主机', type: '网关子设备', propertyCount: 1,
    accessMethod: '网关子设备接入', scene: '智慧消防', vendor: '海湾', model: 'GST200',
    deviceCount: 5,
    desc: '用于火灾自动报警及消防联动控制的消防系统设备，能够实现火灾探测、报警、故障监测及消防设施联动控制。',
    brand: '海湾', version: 'v2.12', publishDate: '2026/06/26', refProjectCount: 1, authMethod: '-',
    monitorProps: ['心跳 heartbeat'],
    alertEvents: ['消防主机事件 event'],
    remoteControls: ['复位 reset', '消音 silence', '自动 automatic', '手动 manual', '调试 trace', '自检 selftest', '重置 restart']
  },
  {
    id: 'prod-2', name: '导轨温湿度', type: '网关子设备', propertyCount: 5,
    accessMethod: 'MQTT网关', scene: '环境监测', vendor: '九维健', model: 'LD-13-WS-23',
    deviceCount: 8,
    desc: '导轨式温湿度变送器，采用工业级传感器，适用于各类室内环境的温湿度监测。',
    brand: '九维健', version: 'v1.08', publishDate: '2026/05/15', refProjectCount: 3, authMethod: 'Token',
    monitorProps: ['温度 temperature', '湿度 humidity', '露点 dewPoint'],
    alertEvents: ['温度超限 tempAlarm', '湿度超限 humidityAlarm'],
    remoteControls: ['温度校准 tempCalib', '重启 reboot']
  },
  {
    id: 'prod-3', name: '双轴倾角传感器', type: '网关子设备', propertyCount: 4,
    accessMethod: 'MQTT网关', scene: '姿态监测', vendor: '锡科传感', model: 'GXK162',
    deviceCount: 5,
    desc: '双轴倾角传感器用于测量物体相对于水平面的倾斜角度，适用于结构健康监测、设备姿态检测等场景。',
    brand: '锡科传感', version: 'v1.05', publishDate: '2026/04/20', refProjectCount: 2, authMethod: 'Token',
    monitorProps: ['X轴角度 angleX', 'Y轴角度 angleY', '温度 temperature'],
    alertEvents: ['倾角超限 tiltAlarm'],
    remoteControls: ['零点校准 zeroCalib', '重启 reboot']
  }
]

// ===== 物模型（属性/事件/功能/标签） =====
export interface ThingModelItem {
  name: string
  id: string
  dataType: string
  accessMode: string
  unit: string
  source: string
}

export const thingModelProps: ThingModelItem[] = [
  { name: '心跳', id: 'heartbeat', dataType: '布尔', accessMode: '上报', unit: '-', source: '设备上报' },
]
export const thingModelEvents: ThingModelItem[] = [
  { name: '消防主机事件', id: 'event', dataType: '对象', accessMode: '上报', unit: '-', source: '设备上报' },
]
export const thingModelFunctions: ThingModelItem[] = [
  { name: '复位', id: 'reset', dataType: '布尔', accessMode: '下发', unit: '-', source: '平台定义' },
  { name: '消音', id: 'silence', dataType: '布尔', accessMode: '下发', unit: '-', source: '平台定义' },
  { name: '自动', id: 'automatic', dataType: '枚举', accessMode: '下发', unit: '-', source: '平台定义' },
  { name: '手动', id: 'manual', dataType: '枚举', accessMode: '下发', unit: '-', source: '平台定义' },
  { name: '调试', id: 'trace', dataType: '布尔', accessMode: '下发', unit: '-', source: '平台定义' },
  { name: '自检', id: 'selftest', dataType: '布尔', accessMode: '下发', unit: '-', source: '平台定义' },
  { name: '重置', id: 'restart', dataType: '布尔', accessMode: '下发', unit: '-', source: '平台定义' },
]

// ===== 健康判定规则 =====
export interface HealthRule {
  level: string
  name: string
  desc: string
}

export const healthRules: HealthRule[] = [
  { level: '观察', name: '无数据', desc: '连续 10 分钟未收到关键属性上报' },
  { level: '紧急', name: '设备离线', desc: '离线状态持续 5 分钟' },
  { level: '观察', name: '连接波动', desc: '30 分钟内离线 3 次及以上' }
]

// ===== 版本记录 =====
export interface VersionRecord {
  version: string
  date: string
  desc: string
}

export const versionRecords: VersionRecord[] = [
  { version: 'v2.12', date: '2026/06/26 09:48', desc: '适配海湾 GST200 主机能力模板。' }
]

// ===== 空间分组树 =====
export interface GroupTreeNode {
  key: string
  label: string
  /** 设备数 */
  count?: number
  /** 是否为"未绑定"根节点 */
  unbind?: boolean
  children?: GroupTreeNode[]
}

export const regionGroupTree: GroupTreeNode[] = [
  {
    key: 'park', label: '智谷园区', count: 32, children: [
      {
        key: 'b-e', label: 'E栋', count: 18, children: [
          { key: 'b-e-4f', label: '4F', count: 12, children: [
            { key: 'b-e-4f-rd', label: '研发部办公区', count: 6 },
            { key: 'b-e-4f-pm', label: '项目部办公区', count: 4 },
            { key: 'b-e-4f-meet', label: '会议室', count: 2 }
          ]},
          { key: 'b-e-2f', label: '2F', count: 6, children: [
            { key: 'b-e-2f-hall', label: '大厅', count: 3 },
            { key: 'b-e-2f-corridor', label: '走廊', count: 3 }
          ]}
        ]
      },
      {
        key: 'b-a', label: 'A栋', count: 10, children: [
          { key: 'b-a-1f', label: '1F', count: 6, children: [
            { key: 'b-a-1f-ops', label: '运营办公室', count: 4 },
            { key: 'b-a-1f-front', label: '前台', count: 2 }
          ]},
          { key: 'b-a-b1', label: 'B1', count: 4, children: [
            { key: 'b-a-b1-storage', label: '仓库', count: 2 },
            { key: 'b-a-b1-pump', label: '水泵房', count: 2 }
          ]}
        ]
      },
      { key: 'outdoor', label: '室外区域', count: 4, children: [
        { key: 'outdoor-gate', label: '大门', count: 2 },
        { key: 'outdoor-factory', label: '厂界', count: 2 }
      ]}
    ]
  },
  { key: 'unbind', label: '未绑定区域', count: 4, unbind: true }
]

// ===== 业务分组 =====
export interface BusinessGroup {
  key: string
  label: string
  count: number
  unbind?: boolean
}

export const businessGroups: BusinessGroup[] = [
  { key: 'fire', label: '消防安全', count: 7 },
  { key: 'env', label: '环境监测', count: 9 },
  { key: 'energy', label: '能耗分析', count: 4 },
  { key: 'security', label: '安全防护', count: 2 },
  { key: 'posture', label: '姿态监测', count: 1 },
  { key: 'unbind-biz', label: '未绑定业务', count: 1, unbind: true }
]

// ===== 异常跟进列表 =====
export interface DeviceIssue {
  id: string
  deviceName: string
  tag: '告警' | '数据偏离' | '通讯异常' | '维护'
  desc: string
  group: string
  time: string
}

export const deviceIssues: DeviceIssue[] = [
  { id: 'issue-1', deviceName: '可燃气体探测器', tag: '告警', desc: '可燃气体浓度持续超标，已触发紧急告警', group: '厨房 · 消防安全', time: '2026-07-10 14:05' },
  { id: 'issue-2', deviceName: '烟雾探测器B', tag: '通讯异常', desc: '设备超过 24 小时未上报数据', group: '仓库 · 消防安全', time: '2026-07-09 08:30' },
  { id: 'issue-3', deviceName: '智能水表', tag: '通讯异常', desc: '设备离线，最后上报于 2 天前', group: '地下室 · 能耗分析', time: '2026-07-08 10:20' },
  { id: 'issue-4', deviceName: '温湿度监测器', tag: '数据偏离', desc: '温度读数与历史均值偏差超过 15%', group: '项目部办公区 · 环境监测', time: '2026-07-10 12:00' },
  { id: 'issue-5', deviceName: '噪音监测器', tag: '维护', desc: '设备已运行 365 天，建议进行例行校准', group: '厂界 · 环境监测', time: '2026-07-10 09:00' },
  { id: 'issue-6', deviceName: '光照监测器', tag: '数据偏离', desc: '光照强度读数异常，疑似传感器漂移', group: '研发部办公区 · 环境监测', time: '2026-07-10 08:15' }
]

// ===== 区域/设备告警排行 =====
export interface AlarmRankItem {
  id: string
  name: string
  count: number
  /** 主要告警类型 */
  mainType: string
  trend: 'up' | 'down' | 'flat'
  trendValue: string
}

export const regionAlarmRank: AlarmRankItem[] = [
  { id: 'r-1', name: '研发部办公区', count: 28, mainType: '环境异常', trend: 'up', trendValue: '+15%' },
  { id: 'r-2', name: '厨房', count: 22, mainType: '消防告警', trend: 'up', trendValue: '+8%' },
  { id: 'r-3', name: '仓库', count: 15, mainType: '通讯异常', trend: 'down', trendValue: '-3%' },
  { id: 'r-4', name: '配电室', count: 12, mainType: '能耗异常', trend: 'flat', trendValue: '0%' },
  { id: 'r-5', name: '厂界', count: 9, mainType: '环境监测', trend: 'down', trendValue: '-5%' },
  { id: 'r-6', name: '地下室', count: 7, mainType: '通讯异常', trend: 'flat', trendValue: '0%' },
  { id: 'r-7', name: '大厅', count: 6, mainType: '安全防护', trend: 'up', trendValue: '+2%' },
  { id: 'r-8', name: '走廊', count: 5, mainType: '消防安全', trend: 'down', trendValue: '-1%' },
  { id: 'r-9', name: '前台', count: 3, mainType: '安全防护', trend: 'flat', trendValue: '0%' },
  { id: 'r-10', name: '水泵房', count: 2, mainType: '能耗异常', trend: 'flat', trendValue: '0%' }
]

export const deviceAlarmRank: AlarmRankItem[] = [
  { id: 'd-1', name: '可燃气体探测器', count: 18, mainType: '气体超限', trend: 'up', trendValue: '+20%' },
  { id: 'd-2', name: '烟雾探测器B', count: 12, mainType: '离线', trend: 'down', trendValue: '-2%' },
  { id: 'd-3', name: '智能水表', count: 9, mainType: '离线', trend: 'flat', trendValue: '0%' },
  { id: 'd-4', name: '温湿度监测器', count: 7, mainType: '数据偏离', trend: 'up', trendValue: '+10%' },
  { id: 'd-5', name: '噪音监测器', count: 5, mainType: '数据偏离', trend: 'down', trendValue: '-8%' },
  { id: 'd-6', name: '光照监测器', count: 4, mainType: '数据偏离', trend: 'flat', trendValue: '0%' },
  { id: 'd-7', name: '电磁流量计', count: 3, mainType: '能耗异常', trend: 'up', trendValue: '+1%' },
  { id: 'd-8', name: '红外人体感应', count: 3, mainType: '安全防护', trend: 'flat', trendValue: '0%' },
  { id: 'd-9', name: '门磁传感器', count: 2, mainType: '安全防护', trend: 'down', trendValue: '-1%' },
  { id: 'd-10', name: '电参数采集仪', count: 1, mainType: '能耗异常', trend: 'flat', trendValue: '0%' }
]

// ===== 图表数据 =====
export const messageTrendDays7 = ['07-04', '07-05', '07-06', '07-07', '07-08', '07-09', '07-10']
export const messageTrendSeries7 = [3200, 3500, 3800, 3600, 4280, 4100, 3580]

export const messageTrendHours24 = Array.from({ length: 24 }, (_, i) => `${i}:00`)
export const messageTrendSeries24 = Array.from({ length: 24 }, (_, i) => {
  return Math.floor(100 + Math.sin(i / 3) * 80 + Math.random() * 60)
})

// 在线率趋势（近7天，百分比）
export const onlineRateDays7 = ['07-04', '07-05', '07-06', '07-07', '07-08', '07-09', '07-10']
export const onlineRateSeries7 = [94, 96, 95, 88, 92, 90, 94]

// 告警趋势（近7天，按级别堆叠）
export const alarmTrendDays7 = ['07-04', '07-05', '07-06', '07-07', '07-08', '07-09', '07-10']
export const alarmTrendUrgent = [3, 2, 4, 6, 5, 3, 2]     // 紧急
export const alarmTrendImportant = [8, 10, 7, 12, 9, 8, 6] // 重要
export const alarmTrendGeneral = [15, 12, 18, 14, 10, 11, 9] // 一般

// 设备活跃情况
export const deviceActivityHours = Array.from({ length: 12 }, (_, i) => `${i * 2}:00`)
export const deviceActivityOnline = [18, 20, 22, 25, 28, 30, 29, 28, 30, 31, 30, 30]
export const deviceActivityMessages = [180, 220, 280, 350, 420, 480, 450, 400, 460, 500, 480, 460]

// ===== 设备详情数据 =====

// 概览 KPI
export interface OverviewKpi {
  key: string
  label: string
  value: string
  unit: string
  desc: string
  icon: string
  color: string
}
export const overviewKpis: OverviewKpi[] = [
  { key: 'uptime', label: '累计活跃时长', value: '128', unit: '小时', desc: '近 7 天', icon: 'i-ant-design-clock-circle-outlined', color: '#6e4bff' },
  { key: 'uplink', label: '今日上行', value: '1,248', unit: '条', desc: '峰值 156 条/小时', icon: 'i-ant-design-arrow-up-outlined', color: '#2bb3a3' },
  { key: 'downlink', label: '今日下行', value: '86', unit: '条', desc: '峰值 12 条/小时', icon: 'i-ant-design-arrow-down-outlined', color: '#faad14' },
  { key: 'traffic', label: '今日流量', value: '2.3', unit: 'MB', desc: '上行 2.1MB / 下行 0.2MB', icon: 'i-ant-design-cloud-outlined', color: '#597ef7' }
]

// 消息趋势（24 小时，每 2 小时一个点）
export const messageTrendHours: string[] = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']
export const messageTrendUp: number[] = [12, 8, 6, 15, 48, 92, 156, 134, 98, 76, 54, 32]
export const messageTrendDown: number[] = [2, 1, 1, 3, 5, 8, 12, 10, 8, 6, 4, 3]

export interface DeviceProperty {
  id: string
  name: string
  value: string
  unit: string
  sparkline: number[]
  lastReport: string
}

export const deviceProperties: DeviceProperty[] = [
  { id: 'prop-1', name: '可燃气体浓度', value: '85', unit: 'ppm', sparkline: [30, 35, 40, 55, 60, 72, 85], lastReport: '14:32' },
  { id: 'prop-2', name: '环境温度', value: '26.3', unit: '℃', sparkline: [24, 24.5, 25, 25.5, 26, 26.1, 26.3], lastReport: '14:32' },
  { id: 'prop-3', name: '环境湿度', value: '58', unit: '%RH', sparkline: [65, 63, 62, 60, 59, 58, 58], lastReport: '14:30' },
  { id: 'prop-4', name: '电池电压', value: '3.62', unit: 'V', sparkline: [3.7, 3.68, 3.66, 3.65, 3.64, 3.63, 3.62], lastReport: '14:28' },
  { id: 'prop-5', name: '信号强度', value: '-67', unit: 'dBm', sparkline: [-65, -66, -67, -66, -67, -68, -67], lastReport: '14:28' },
  { id: 'prop-6', name: 'CPU占用', value: '23', unit: '%', sparkline: [18, 20, 19, 22, 21, 23, 23], lastReport: '14:25' },
  { id: 'prop-7', name: '内存占用', value: '41', unit: '%', sparkline: [40, 41, 40, 42, 41, 41, 41], lastReport: '14:25' },
  { id: 'prop-8', name: '工作模式', value: '正常', unit: '', sparkline: [1, 1, 1, 1, 1, 1, 1], lastReport: '14:20' }
]

export type AlarmLevel = '超紧急' | '紧急' | '严重' | '一般' | '提醒'

export interface DeviceEvent {
  id: string
  time: string
  event: string
  level: AlarmLevel
  /** 触发告警的属性名 */
  prop: string
  /** 属性当前值 */
  propValue: string
  /** 属性单位 */
  propUnit: string
}

export const deviceEvents: DeviceEvent[] = [
  { id: 'evt-1', time: '14:05:22', event: '气体浓度超限', level: '超紧急', prop: '可燃气体浓度', propValue: '85', propUnit: 'ppm' },
  { id: 'evt-2', time: '13:20:10', event: '温度持续偏高', level: '紧急', prop: '环境温度', propValue: '35.2', propUnit: '℃' },
  { id: 'evt-3', time: '12:45:33', event: '湿度超出范围', level: '严重', prop: '环境湿度', propValue: '82', propUnit: '%RH' },
  { id: 'evt-4', time: '11:15:08', event: '信号强度弱', level: '一般', prop: '信号强度', propValue: '-92', propUnit: 'dBm' },
  { id: 'evt-5', time: '09:30:01', event: '电池电压偏低', level: '提醒', prop: '电池电压', propValue: '3.15', propUnit: 'V' }
]

export interface DeviceLog {
  id: string
  type: string
  direction: 'up' | 'down'
  time: string
  content: string
}

export const deviceLogs: DeviceLog[] = [
  { id: 'log-1', type: '属性上报', direction: 'up', time: '2026-07-10 14:32:01', content: '{"concentration": 85, "temp": 26.3}' },
  { id: 'log-2', type: '指令下发', direction: 'down', time: '2026-07-10 14:30:15', content: '{"cmd": "get_status"}' },
  { id: 'log-3', type: '属性上报', direction: 'up', time: '2026-07-10 14:28:00', content: '{"concentration": 82, "temp": 26.1}' },
  { id: 'log-4', type: '事件上报', direction: 'up', time: '2026-07-10 14:05:22', content: '{"event": "gas_overload", "level": 1}' },
  { id: 'log-5', type: '指令下发', direction: 'down', time: '2026-07-10 14:00:00', content: '{"cmd": "set_threshold", "value": 50}' }
]

// ===== TCP 设备接入配置 =====
export interface TcpAccessConfig {
  /** 接入协议 */
  protocol: string
  /** 传输协议 */
  transport: string
  /** 是否 TLS 加密 */
  tls: boolean
  /** 心跳间隔（秒） */
  heartbeat: number
  /** 接入 IP 地址 */
  ip: string
  /** 接入端口 */
  port: number
  /** 接入域名 */
  domain: string
}

export const tcpAccessConfig: TcpAccessConfig = {
  protocol: 'TCP',
  transport: 'TCP',
  tls: false,
  heartbeat: 60,
  ip: '116.62.63.108',
  port: 8802,
  domain: 'iot.jetlinks.cn'
}

// ===== 设备凭证 =====
export interface DeviceCredential {
  /** 设备 ID（接入时作为唯一标识） */
  deviceId: string
  /** 设备密钥 */
  secureKey: string
  /** 产品标识 */
  productKey: string
}

export const deviceCredential: DeviceCredential = {
  deviceId: 'test001',
  secureKey: 'a1b2c3d4e5f6g7h8',
  productKey: 'prod-key-001'
}

// ===== Topic 列表 =====
export interface TopicItem {
  /** 消息方向：上行(设备→平台) / 下行(平台→设备) */
  direction: 'up' | 'down'
  /** Topic 名称 */
  name: string
  /** Topic 路径 */
  path: string
  /** 说明 */
  desc: string
}

export const topicList: TopicItem[] = [
  { direction: 'up', name: '属性上报', path: '/test001/properties/report', desc: '设备主动上报属性数据' },
  { direction: 'up', name: '事件上报', path: '/test001/events/report', desc: '设备上报事件（告警/状态变化）' },
  { direction: 'up', name: '生命周期', path: '/test001/lifecycle', desc: '设备上线/下线事件' },
  { direction: 'down', name: '指令下发', path: '/test001/function/invoke', desc: '平台下发功能调用指令' },
  { direction: 'down', name: '属性读取', path: '/test001/properties/read', desc: '平台请求读取设备属性' },
  { direction: 'down', name: '属性设置', path: '/test001/properties/write', desc: '平台设置设备属性值' }
]

// ===== TCP 连接示例代码 =====
export const tcpConnectCode = `// Java TCP 连接示例
TcpClient client = new TcpClient();
client.connect("iot.jetlinks.cn", 8802);

// 发送注册包（设备ID + 密钥）
client.send(RegisterPacket.builder()
    .deviceId("test001")
    .secureKey("a1b2c3d4e5f6g7h8")
    .build());

// 上报属性数据
client.send(PropertyReport.builder()
    .deviceId("test001")
    .properties(Map.of("temperature", 26.5))
    .build());`

// 状态标签映射
export const statusConfig: Record<DeviceStatus, { label: string; dot: string; class: string }> = {
  online: { label: '在线', dot: 'online', class: 'st-online' },
  offline: { label: '离线', dot: 'offline', class: 'st-offline' },
  alert: { label: '告警', dot: 'alert', class: 'st-alert' },
  silent: { label: '沉默', dot: 'silent', class: 'st-silent' },
  disabled: { label: '禁用', dot: 'disabled', class: 'st-disabled' }
}

export const riskConfig: Record<RiskLevel, string> = {
  '无风险': 'risk-none',
  '低风险': 'risk-low',
  '中风险': 'risk-mid',
  '高风险': 'risk-high'
}

// 设备图标缩略图色系（用于列表中的小图标背景）
export const deviceIconColors: string[] = [
  '#6e4bff', '#2bb3a3', '#faad14', '#1890ff', '#13c2c2', '#ff4d4f'
]

// ===== 设备库模板（新增设备 Step 1 选择） =====
export interface DeviceTemplateCategory {
  id: string
  name: string
  icon: string
  templates: DeviceTemplate[]
}

export interface DeviceTemplate {
  id: string
  name: string
  icon: string
  vendor: string
  model: string
  desc: string
}

export const deviceTemplateCategories: DeviceTemplateCategory[] = [
  {
    id: 'cat-sensor', name: '传感器', icon: 'i-ant-design-dashboard-outlined',
    templates: [
      { id: 'tpl-radar', name: '雷达传感器', icon: 'i-ant-design-radar-chart-outlined', vendor: 'Ustone/韵石', model: 'HA-W24', desc: '毫米波人体存在传感器，支持移动检测' },
      { id: 'tpl-tilt', name: '倾角传感器', icon: 'i-ant-design-aim-outlined', vendor: '锡科传感', model: 'GXK162', desc: '双轴倾角测量，适用于结构健康监测' },
      { id: 'tpl-temp', name: '温湿度传感器', icon: 'i-ant-design-thermometer-outlined', vendor: '九维健', model: 'LD-13-WS-23', desc: '工业级温湿度变送器，导轨安装' },
      { id: 'tpl-water', name: '水浸传感器', icon: 'i-ant-design ExperimentOutlined', vendor: '塔石', model: 'TAS-SJ-RK', desc: '液体泄漏检测，适用于机房/仓库' },
      { id: 'tpl-gas', name: '气体传感器', icon: 'i-ant-design-fire-outlined', vendor: '海湾', model: 'GST-BR', desc: '可燃气体浓度检测，消防联动' },
      { id: 'tpl-smoke', name: '烟感传感器', icon: 'i-ant-design-bell-outlined', vendor: '海湾', model: 'GST-YG', desc: '光电感烟火灾探测' },
      { id: 'tpl-light', name: '光照传感器', icon: 'i-ant-design-bulb-outlined', vendor: '塔石', model: 'TAS-GZ-R2X', desc: '环境光照度检测' },
      { id: 'tpl-noise', name: '噪音传感器', icon: 'i-ant-design-sound-outlined', vendor: '爱华', model: 'AWA5636', desc: '声级监测，厂界噪音' }
    ]
  },
  {
    id: 'cat-controller', name: '控制器', icon: 'i-ant-design-control-outlined',
    templates: [
      { id: 'tpl-switch', name: '多路开关控制器', icon: 'i-ant-design-toggle-button-outlined', vendor: '安科瑞', model: 'ACR220EL', desc: '多路继电器输出，支持远程控制' },
      { id: 'tpl-ac', name: '空调控制器', icon: 'i-ant-design-snowflake-outlined', vendor: '安科瑞', model: 'AC-KZ-01', desc: '红外+485双模空调控制' },
      { id: 'tpl-dimmer', name: '调光控制器', icon: 'i-ant-design-setting-outlined', vendor: '欧瑞博', model: 'DIM-01', desc: '0-10V/PWM 调光输出' }
    ]
  },
  {
    id: 'cat-gateway', name: '网关', icon: 'i-ant-design-cloud-server-outlined',
    templates: [
      { id: 'tpl-edge', name: '边缘网关', icon: 'i-ant-design-cloud-server-outlined', vendor: 'JetLinks', model: 'Edge-2000', desc: '工业级边缘计算网关' },
      { id: 'tpl-lora', name: 'LoRaWAN 网关', icon: 'i-ant-design-wifi-outlined', vendor: 'Semtech', model: 'SX1302', desc: 'LoRaWAN 集中式网关' },
      { id: 'tpl-nvr', name: 'NVR', icon: 'i-ant-design-database-outlined', vendor: '海康威视', model: 'NVR-8100N', desc: '网络视频录像机' }
    ]
  },
  {
    id: 'cat-lighting', name: '照明', icon: 'i-ant-design-bulb-outlined',
    templates: [
      { id: 'tpl-led', name: '智能灯具', icon: 'i-ant-design-bulb-outlined', vendor: '雷士', model: 'LED-SM-01', desc: '智能 LED 灯具，支持调光调色' },
      { id: 'tpl-street', name: '智慧路灯', icon: 'i-ant-design-environment-outlined', vendor: '飞利浦', model: 'SL-100', desc: '智慧路灯，单灯控制' }
    ]
  },
  {
    id: 'cat-meter', name: '仪表', icon: 'i-ant-design-dashboard-outlined',
    templates: [
      { id: 'tpl-emeter', name: '智能电表', icon: 'i-ant-design-thunderbolt-outlined', vendor: '威胜', model: 'DDZY719', desc: '单相智能电表' },
      { id: 'tpl-wmeter', name: '智能水表', icon: 'i-ant-design ExperimentOutlined', vendor: '新天科技', model: 'LXSG', desc: '超声波智能水表' },
      { id: 'tpl-flow', name: '电磁流量计', icon: 'i-ant-design-swap-outlined', vendor: '上海光华', model: 'IFM4080', desc: '电磁流量测量仪表' }
    ]
  }
]

// ===== 设备告警规则 =====
export type AlarmNotifyStatus = 'none' | 'disabled' | 'enabled'

export interface AlarmRule {
  id: string
  /** 告警名称 */
  name: string
  /** 产品名称 */
  product: string
  /** 设备名称 */
  device: string
  /** 属性名称 */
  property: string
  /** 触发条件描述，如 "温度不在[10, 30]之间" */
  trigger: string
  /** 告警级别 */
  level: AlarmLevel
  /** 通知配置状态 */
  notifyStatus: AlarmNotifyStatus
}

export const alarmRules = ref<AlarmRule[]>([
  { id: 'alarm-1', name: '温度阈值告警', product: '华汉维温湿度', device: '温湿度监测器', property: '温度', trigger: '温度不在[10, 30]之间', level: '超紧急', notifyStatus: 'enabled' },
  { id: 'alarm-2', name: '湿度超限告警', product: '华汉维温湿度', device: '温湿度监测器', property: '湿度', trigger: '湿度不在[40, 70]之间', level: '紧急', notifyStatus: 'enabled' },
  { id: 'alarm-3', name: '可燃气体浓度超标', product: '可燃气体探测器', device: '可燃气体探测器', property: '可燃气体浓度', trigger: '浓度 ≥ 50 ppm', level: '超紧急', notifyStatus: 'enabled' },
  { id: 'alarm-4', name: '烟雾报警', product: '烟雾探测器', device: '烟雾探测器A', property: '烟雾浓度', trigger: '浓度 ≥ 100 ppm', level: '超紧急', notifyStatus: 'disabled' },
  { id: 'alarm-5', name: '信号强度弱', product: '温湿度监测器', device: '温湿度监测器', property: '信号强度', trigger: '信号强度 ≤ -90 dBm', level: '一般', notifyStatus: 'none' },
  { id: 'alarm-6', name: '电池电压偏低', product: '温湿度监测器', device: '温湿度监测器', property: '电池电压', trigger: '电压 ≤ 3.2 V', level: '提醒', notifyStatus: 'none' },
  { id: 'alarm-7', name: '倾角超限告警', product: '双轴倾角传感器', device: '双轴倾角传感器', property: 'X轴角度', trigger: '角度 ≥ 15°', level: '严重', notifyStatus: 'enabled' },
  { id: 'alarm-8', name: '水浸告警', product: '水浸传感器', device: '水浸监测器', property: '水浸状态', trigger: '状态 = true', level: '严重', notifyStatus: 'disabled' },
  { id: 'alarm-9', name: '噪音超标', product: '噪音监测器', device: '噪音监测器', property: '噪音', trigger: '噪音 ≥ 85 dB', level: '一般', notifyStatus: 'none' },
  { id: 'alarm-10', name: '电压异常告警', product: '电参数采集仪', device: '电参数采集仪', property: '电压', trigger: '电压不在[200, 240]之间', level: '紧急', notifyStatus: 'enabled' },
])

// 告警级别配置
export const alarmLevelConfig: Record<AlarmLevel, { label: string; class: string }> = {
  '超紧急': { label: '超紧急', class: 'alarm-critical' },
  '紧急': { label: '紧急', class: 'alarm-urgent' },
  '严重': { label: '严重', class: 'alarm-serious' },
  '一般': { label: '一般', class: 'alarm-general' },
  '提醒': { label: '提醒', class: 'alarm-notice' },
}

// 通知配置状态
export const alarmNotifyConfig: Record<AlarmNotifyStatus, { label: string; class: string }> = {
  none: { label: '未配置', class: 'notify-none' },
  disabled: { label: '未启用', class: 'notify-disabled' },
  enabled: { label: '已启用', class: 'notify-enabled' },
}

// ===== 相对时间格式化 =====
export function formatRelativeTime(timeStr: string): string {
  if (!timeStr || timeStr === '—') return '—'
  const now = new Date('2026-07-10 15:00')
  const past = new Date(timeStr.replace(/-/g, '/'))
  const diff = now.getTime() - past.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days === 1) return `昨天 ${String(past.getHours()).padStart(2, '0')}:${String(past.getMinutes()).padStart(2, '0')}`
  if (days < 7) return `${days}天前`
  // 超过7天显示完整日期
  const y = past.getFullYear()
  const cy = now.getFullYear()
  const dateStr = y === cy
    ? `${past.getMonth() + 1}月${past.getDate()}日 ${String(past.getHours()).padStart(2, '0')}:${String(past.getMinutes()).padStart(2, '0')}`
    : `${y}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(past.getDate()).padStart(2, '0')} ${String(past.getHours()).padStart(2, '0')}:${String(past.getMinutes()).padStart(2, '0')}`
  return dateStr
}

// 健康评分颜色
export function healthScoreColor(score: number): string {
  if (score >= 80) return '#2bb3a3'
  if (score >= 60) return '#6e4bff'
  if (score >= 40) return '#faad14'
  return '#ff4d4f'
}


