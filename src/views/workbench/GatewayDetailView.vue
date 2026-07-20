<script setup lang="ts">
/**
 * SaaS 工作台 · 网关详情
 * 顶部网关信息卡 + 运行状态仪表盘
 */
import dayjs, { type Dayjs } from 'dayjs'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import ECharts from '@/components/ECharts.vue'
import gatewayPic1 from '@/assets/gatewaypic/gatew1.png'
import gatewayPic2 from '@/assets/gatewaypic/gatew2.png'
import gatewayPic3 from '@/assets/gatewaypic/gatew3.png'
import gatewayPic4 from '@/assets/gatewaypic/gatew4.png'
import { gateways } from './workbench.mock'
import { useAppStore } from '@/stores/app'

type GatewayTab = 'status' | 'sub-device' | 'message-log' | 'debug' | 'vision-model' | 'large-model'
type TimeRange = '1h' | '1d' | '7d' | '30d' | 'custom'

type MetricType = 'trend' | 'capacity' | 'count'
type MetricGroupKey = 'cpu' | 'memory' | 'disk' | 'device' | 'vision'

interface MetricBase {
  key: string
  name: string
  group: MetricGroupKey
  type: MetricType
  desc: string
  clickable: boolean
}

interface TrendMetric extends MetricBase {
  type: 'trend'
  value: number
  unit: string
  percent: number
  color: string
  samples: number[]
  // 读写速率专用：第二条线（如写入）
  subName?: string
  subValue?: number
  subSamples?: number[]
}

interface CapacityMetric extends MetricBase {
  type: 'capacity'
  used: number
  total: number
  unit: string
  color: string
  samples: number[] // 已用量的时序样本（点击后可切换为趋势视图）
}

interface CountMetric extends MetricBase {
  type: 'count'
  value: number
  unit: string
  badge?: number // 角标（视觉模型可升级数）
}

type Metric = TrendMetric | CapacityMetric | CountMetric

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const gatewayId = computed(() => String(route.params.id || ''))
const gateway = computed(() => gateways.value.find(g => g.id === gatewayId.value) || gateways.value[0])

const gatewayNameMap: Record<string, string> = {
  g1: '办公室场景网关',
  g2: '办公室备用网关',
  g3: '商场安防网关',
  g4: '商场北区网关',
  g5: '公寓通行网关',
  g6: '养老看护网关',
  g7: '未加入离线网关',
  g8: '未加入在线网关'
}

const gatewaySerialMap: Record<string, string> = {
  g1: 'GT23923011202',
  g2: 'GT23923011203',
  g3: 'GT23923011204',
  g4: 'GT23923011205',
  g5: 'GT23923011206',
  g6: 'GT23923011207',
  g7: 'GT23923011208',
  g8: 'GT23923011209'
}

const gatewayName = computed(() => gatewayNameMap[gateway.value.id] || gateway.value.sn)
const gatewaySn = computed(() => gatewaySerialMap[gateway.value.id] || gateway.value.sn)
const gatewayPics = [gatewayPic1, gatewayPic2, gatewayPic3, gatewayPic4]
const gatewayDisplayImg = computed(() => {
  const seed = [...gateway.value.id].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return gatewayPics[seed % gatewayPics.length]
})

const activeTab = ref<GatewayTab>('status')
const timeRange = ref<TimeRange>('1h')
const customRange = ref<[Dayjs, Dayjs] | undefined>(undefined)

// 分组元信息（运行属性只保留 CPU/内存/磁盘 三组）
const metricGroups: Array<{ key: MetricGroupKey; label: string }> = [
  { key: 'cpu', label: 'CPU' },
  { key: 'memory', label: '内存' },
  { key: 'disk', label: '磁盘' }
]

// 顶部指标行（不可点击，图标+文案形式，参考视联中心 KPI 卡）
interface TopMetric {
  key: string
  label: string
  value: number
  unit: string
  icon: string
  color: string
  badge?: number
}

const topMetrics = computed<TopMetric[]>(() => [
  { key: 'sub-device', label: '边缘网关子设备总数', value: 86, unit: '台', icon: 'i-ant-design-api-outlined', color: '#6e4bff' },
  { key: 'vision-deploy', label: '部署模型', value: 12, unit: '个', icon: 'i-ant-design-deployment-unit-outlined', color: '#2bb3a3' },
  { key: 'vision-cover', label: '覆盖摄像头', value: 48, unit: '个', icon: 'i-ant-design-video-camera-outlined', color: '#1890ff' },
  { key: 'vision-upgrade', label: '可升级模型', value: 3, unit: '个', icon: 'i-ant-design-cloud-upload-outlined', color: '#fa8c16', badge: 3 }
])

const runtimeMetrics = computed<Metric[]>(() => [
  // ===== CPU 组 =====
  {
    key: 'cpu', name: 'CPU 实时使用率', group: 'cpu', type: 'trend', clickable: true,
    value: gateway.value.cpu, unit: '%', percent: gateway.value.cpu, desc: '处理器实时占用率',
    color: '#6e4bff', samples: [32, 35, 41, 38, 46, 44, 49, 44, 52, gateway.value.cpu]
  },
  {
    key: 'jvm-cpu', name: 'JVM 占用 CPU 率', group: 'cpu', type: 'trend', clickable: true,
    value: 38, unit: '%', percent: 38, desc: 'JVM 进程的 CPU 占用',
    color: '#1d4ed8', samples: [22, 25, 28, 31, 34, 36, 40, 37, 41, 38]
  },
  {
    key: 'load', name: '系统负载', group: 'cpu', type: 'trend', clickable: true,
    value: 1.42, unit: '', percent: 47, desc: '1 分钟平均负载',
    color: '#3b82f6', samples: [0.72, 0.86, 1.02, 1.21, 1.18, 1.42, 1.35, 1.51, 1.44, 1.42]
  },
  // ===== 内存组（容量型，总量+已用合并，点击看已使用趋势）=====
  {
    key: 'sys-mem', name: '系统内存', group: 'memory', type: 'capacity', clickable: true,
    used: 5.2, total: 8, unit: 'GB', desc: '物理内存已使用量趋势',
    color: '#2bb3a3', samples: [4.6, 4.8, 4.9, 5.0, 5.1, 5.15, 5.2, 5.18, 5.22, 5.2]
  },
  {
    key: 'jvm-mem', name: 'JVM 内存', group: 'memory', type: 'capacity', clickable: true,
    used: 768, total: 1536, unit: 'MB', desc: 'JVM 堆内存已使用量趋势',
    color: '#13c2c2', samples: [486, 512, 548, 592, 634, 681, 724, 736, 752, 768]
  },
  // ===== 磁盘组 =====
  {
    key: 'disk', name: '磁盘容量', group: 'disk', type: 'capacity', clickable: true,
    used: 64.8, total: 200, unit: 'GB', desc: '数据分区已使用量趋势',
    color: '#faad14', samples: [58, 59, 60, 61, 62, 62.8, 63.4, 64, 64.3, 64.8]
  },
  {
    key: 'disk-io', name: '磁盘读写速率', group: 'disk', type: 'trend', clickable: true,
    value: 86, unit: 'MB/s', percent: 43, desc: '磁盘实时读取 / 写入速率',
    color: '#6e4bff', samples: [62, 68, 74, 80, 78, 84, 90, 86, 92, 86],
    subName: '写入速率', subValue: 42, subSamples: [28, 32, 36, 38, 40, 44, 46, 42, 48, 42]
  }
])

// 当前选中指标（运行属性只剩 trend / capacity，都带 color/unit/samples）
type ActiveMetric = TrendMetric | CapacityMetric
const activeMetricKey = ref('cpu')
const activeMetric = computed<ActiveMetric>(() => {
  const found = runtimeMetrics.value.find(m => m.key === activeMetricKey.value && m.clickable)
    || runtimeMetrics.value.find(m => m.clickable)
    || runtimeMetrics.value[0]
  return found as ActiveMetric
})

// 按组归类（供模板渲染分组）
const metricsByGroup = computed(() => {
  const map: Record<MetricGroupKey, Metric[]> = { cpu: [], memory: [], disk: [], device: [], vision: [] }
  for (const m of runtimeMetrics.value) {
    map[m.group].push(m)
  }
  return map
})

watch(runtimeMetrics, (list) => {
  if (!list.some(item => item.key === activeMetricKey.value && item.clickable)) {
    activeMetricKey.value = list.find(m => m.clickable)?.key || 'cpu'
  }
})

// 使用率颜色档位（容量进度条 + 环形图）
function usageColor(percent: number): string {
  if (percent >= 80) return '#ff4d4f'
  if (percent >= 60) return '#faad14'
  return '#52c41a'
}

function capacityPercent(m: CapacityMetric): number {
  return m.total > 0 ? Math.round((m.used / m.total) * 100) : 0
}

const rangeOptions: Array<{ key: TimeRange; label: string }> = [
  { key: '1h', label: '1小时' },
  { key: '1d', label: '1天' },
  { key: '7d', label: '近7天' },
  { key: '30d', label: '近30天' },
  { key: 'custom', label: '自定义' }
]

const rangeLabel = computed(() => {
  if (timeRange.value !== 'custom') {
    return rangeOptions.find(item => item.key === timeRange.value)?.label || '1小时'
  }
  if (!customRange.value) return '自定义时间'
  return `${customRange.value[0].format('MM-DD HH:mm')} 至 ${customRange.value[1].format('MM-DD HH:mm')}`
})

function metricSeries(samples: number[], isInt: boolean) {
  const multiplier: Record<TimeRange, number> = { '1h': 1, '1d': 1.08, '7d': 1.16, '30d': 1.28, custom: 1.12 }
  const labels = axisLabels.value
  return labels.map((_, index) => {
    const sampleIndex = Math.round((index / Math.max(labels.length - 1, 1)) * (samples.length - 1))
    const item = samples[sampleIndex]
    const wave = index % 2 === 0 ? 0.96 : 1.04
    const value = item * multiplier[timeRange.value] * wave
    return Number(value.toFixed(isInt ? 0 : 1))
  })
}

const axisLabels = computed(() => {
  if (timeRange.value === '1h') {
    return Array.from({ length: 13 }, (_, index) => `${index * 5}min`)
  }
  if (timeRange.value === '1d') {
    return Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`)
  }
  if (timeRange.value === '7d') {
    return Array.from({ length: 7 }, (_, index) => dayjs().subtract(6 - index, 'day').format('MM-DD'))
  }
  if (timeRange.value === '30d') {
    return Array.from({ length: 30 }, (_, index) => dayjs().subtract(29 - index, 'day').format('MM-DD'))
  }
  return ['开始', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '结束']
})

// 当前指标是否整数单位（% / ms 为整数）
const activeMetricIsInt = computed(() => {
  const m = activeMetric.value
  if (m.type === 'trend') return m.unit === '%' || m.unit === 'ms'
  if (m.type === 'capacity') return m.unit === 'MB'
  return true
})

const activeMetricSeries = computed<number[]>(() => {
  const m = activeMetric.value
  if (m.type === 'trend') return metricSeries(m.samples, activeMetricIsInt.value)
  if (m.type === 'capacity') return metricSeries(m.samples, activeMetricIsInt.value)
  return []
})

const activeMetricSubSeries = computed<number[] | null>(() => {
  const m = activeMetric.value
  if (m.type === 'trend' && m.subSamples) return metricSeries(m.subSamples, activeMetricIsInt.value)
  return null
})

const activeMetricStats = computed(() => {
  const series = activeMetricSeries.value
  if (!series.length) return { max: 0, min: 0, avg: 0, latest: 0, trend: 0 }
  const max = Math.max(...series)
  const min = Math.min(...series)
  const avg = series.reduce((sum, item) => sum + item, 0) / series.length
  const latest = series[series.length - 1]
  const previous = series[series.length - 2] ?? latest
  const trend = latest - previous
  const precision = activeMetricIsInt.value ? 0 : 1
  return {
    max: Number(max.toFixed(precision)),
    min: Number(min.toFixed(precision)),
    avg: Number(avg.toFixed(precision)),
    latest: Number(latest.toFixed(precision)),
    trend: Number(trend.toFixed(precision))
  }
})

const metricChartOption = computed(() => {
  const m = activeMetric.value
  if (m.type !== 'trend' && m.type !== 'capacity') return {}
  const isDual = m.type === 'trend' && !!m.subSamples
  const unit = m.type === 'capacity' ? m.unit : m.unit
  const series: any[] = [
    {
      name: m.type === 'capacity' ? '已使用量' : (isDual ? '读取速率' : m.name),
      type: 'line',
      smooth: true,
      symbolSize: 6,
      data: activeMetricSeries.value,
      itemStyle: { color: m.color },
      lineStyle: { width: 2, color: m.color },
      areaStyle: { color: `${m.color}18` }
    }
  ]
  if (isDual && m.type === 'trend' && m.subSamples && m.subName) {
    series.push({
      name: m.subName,
      type: 'line',
      smooth: true,
      symbolSize: 6,
      data: activeMetricSubSeries.value,
      itemStyle: { color: '#2bb3a3' },
      lineStyle: { width: 2, color: '#2bb3a3' },
      areaStyle: { color: '#2bb3a318' }
    })
  }
  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => params.map((p: any) => `${p.seriesName}: ${p.data}${unit}`).join('<br/>')
    },
    legend: isDual ? { data: ['读取速率', '写入速率'], top: 6, textStyle: { fontSize: 11, color: '#8895ab' } } : undefined,
    grid: { left: 44, right: 18, top: isDual ? 40 : 20, bottom: timeRange.value === '30d' ? 56 : 34 },
    xAxis: {
      type: 'category',
      data: axisLabels.value,
      axisLabel: { fontSize: 11, color: '#8895ab', interval: 0, rotate: timeRange.value === '30d' ? 45 : 0 },
      axisLine: { lineStyle: { color: '#edf0f5' } },
      axisTick: { show: false }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 11, color: '#8895ab' },
      splitLine: { lineStyle: { color: '#f4f5f7' } }
    },
    series
  }
})

// ===== 容量型：点击后右侧显示「已使用量趋势图」（走统一趋势视图）=====
// capacityChartOption / capacityInfo / deviceStats 已移除（右侧统一为趋势图）

function switchTab(tab: GatewayTab) {
  activeTab.value = tab
}

function selectTimeRange(value: TimeRange) {
  timeRange.value = value
  if (value === 'custom' && !customRange.value) {
    customRange.value = [dayjs().subtract(6, 'hour'), dayjs()]
  }
}

function goBack() {
  router.push('/workbench')
}

function goConfigDevice() {
  if (appStore.guideStep === 'gateway-detail-enter') {
    appStore.finishGuide()
  }
  const target = router.resolve(`/video/device/gateway/${gateway.value.id}/address`)
  const url = new URL(target.href, window.location.origin)
  window.open(url.href, '_blank', 'noopener,noreferrer')
}

// ============================================
// 子设备 tab
// ============================================

// 设备类型元信息
// 设备库品类元信息（物联设备，无视联）
const deviceTypeMeta: Record<string, { icon: string; color: string }> = {
  '火灾报警器': { icon: 'i-ant-design-fire-outlined', color: '#fa541c' },
  '智能陀螺仪': { icon: 'i-ant-design-compass-outlined', color: '#6e4bff' },
  '温湿度传感器': { icon: 'i-ant-design-thermometer-outlined', color: '#2bb3a3' },
  '门禁控制器': { icon: 'i-ant-design-control-outlined', color: '#1890ff' },
  '光照传感器': { icon: 'i-ant-design-bulb-outlined', color: '#faad14' },
  '漏水检测器': { icon: 'i-ant-design-experiment-outlined', color: '#13c2c2' },
  '燃气探测器': { icon: 'i-ant-design-fire-outlined', color: '#ff4d4f' },
  '电气火灾监控': { icon: 'i-ant-design-thunderbolt-outlined', color: '#fa8c16' },
  '智能水表': { icon: 'i-ant-design-dot-chart-outlined', color: '#1890ff' },
  '智能电表': { icon: 'i-ant-design-bar-chart-outlined', color: '#52c41a' }
}

interface SubDevice {
  id: string
  name: string
  deviceType: string   // 设备库品类
  model: string        // 型号
  bound: boolean
  status: 'online' | 'offline'
}

const subDevices = ref<SubDevice[]>([
  // 已绑定 12 台
  { id: 'sd1', name: '烟感探测器-01', deviceType: '火灾报警器', model: 'JTY-GD-S8', bound: true, status: 'online' },
  { id: 'sd2', name: '烟感探测器-02', deviceType: '火灾报警器', model: 'JTY-GD-S8', bound: true, status: 'online' },
  { id: 'sd3', name: '温湿度计-01', deviceType: '温湿度传感器', model: 'TH-100Pro', bound: true, status: 'online' },
  { id: 'sd4', name: '温湿度计-02', deviceType: '温湿度传感器', model: 'TH-100Pro', bound: true, status: 'offline' },
  { id: 'sd5', name: '陀螺仪-A1', deviceType: '智能陀螺仪', model: 'GY-200X', bound: true, status: 'online' },
  { id: 'sd6', name: '门禁控制盒-01', deviceType: '门禁控制器', model: 'AC-500S', bound: true, status: 'online' },
  { id: 'sd7', name: '光照感应器-01', deviceType: '光照传感器', model: 'LX-120', bound: true, status: 'online' },
  { id: 'sd8', name: '漏水检测器-01', deviceType: '漏水检测器', model: 'WD-60', bound: true, status: 'online' },
  { id: 'sd9', name: '燃气探测器-01', deviceType: '燃气探测器', model: 'RQ-100', bound: true, status: 'offline' },
  { id: 'sd10', name: '电气火灾监控-01', deviceType: '电气火灾监控', model: 'EFM-300', bound: true, status: 'online' },
  { id: 'sd11', name: '智能水表-01', deviceType: '智能水表', model: 'WM-LXSR', bound: true, status: 'online' },
  { id: 'sd12', name: '智能电表-01', deviceType: '智能电表', model: 'EM-DDS6619', bound: true, status: 'online' },
  // 未绑定 5 台
  { id: 'sd13', name: '烟感探测器-03', deviceType: '火灾报警器', model: 'JTY-GD-S8', bound: false, status: 'online' },
  { id: 'sd14', name: '陀螺仪-A2', deviceType: '智能陀螺仪', model: 'GY-200X', bound: false, status: 'online' },
  { id: 'sd15', name: '温湿度计-03', deviceType: '温湿度传感器', model: 'TH-100Pro', bound: false, status: 'offline' },
  { id: 'sd16', name: '光照感应器-02', deviceType: '光照传感器', model: 'LX-120', bound: false, status: 'online' },
  { id: 'sd17', name: '门禁控制盒-02', deviceType: '门禁控制器', model: 'AC-500S', bound: false, status: 'online' }
])

const subSearchKey = ref('')
const subCurrentPage = ref(1)
const subPageSize = ref(10)
type SubView = 'list' | 'card'
const subView = ref<SubView>('card')

const boundDevices = computed(() => subDevices.value.filter(d => d.bound))
const boundCount = computed(() => boundDevices.value.length)
const unboundCount = computed(() => subDevices.value.filter(d => !d.bound).length)

// 列表只展示已绑定设备
const filteredSubDevices = computed(() => {
  const kw = subSearchKey.value.trim().toLowerCase()
  if (!kw) return boundDevices.value
  return boundDevices.value.filter(d =>
    d.name.toLowerCase().includes(kw) ||
    d.deviceType.toLowerCase().includes(kw) ||
    d.model.toLowerCase().includes(kw)
  )
})

const subTotal = computed(() => filteredSubDevices.value.length)
const pagedSubDevices = computed(() => {
  const start = (subCurrentPage.value - 1) * subPageSize.value
  return filteredSubDevices.value.slice(start, start + subPageSize.value)
})

watch([subSearchKey, subPageSize], () => { subCurrentPage.value = 1 })

// ===== 绑定子设备抽屉（右侧 640px）=====
const bindDrawerVisible = ref(false)
const bindSearchKey = ref('')
const bindSelectedIds = ref<Set<string>>(new Set())

const unboundDevices = computed(() => {
  const kw = bindSearchKey.value.trim().toLowerCase()
  return subDevices.value.filter(d => {
    if (d.bound) return false
    if (kw && !d.name.toLowerCase().includes(kw) && !d.deviceType.toLowerCase().includes(kw) && !d.model.toLowerCase().includes(kw)) return false
    return true
  })
})

function openBindDrawer() {
  bindDrawerVisible.value = true
  bindSearchKey.value = ''
  bindSelectedIds.value = new Set()
}

function toggleBindSelect(id: string) {
  if (bindSelectedIds.value.has(id)) bindSelectedIds.value.delete(id)
  else bindSelectedIds.value.add(id)
}
function toggleBindSelectAll() {
  if (bindSelectedIds.value.size === unboundDevices.value.length) bindSelectedIds.value.clear()
  else bindSelectedIds.value = new Set(unboundDevices.value.map(d => d.id))
}
const bindAllSelected = computed(() => unboundDevices.value.length > 0 && bindSelectedIds.value.size === unboundDevices.value.length)

function confirmBind() {
  if (!bindSelectedIds.value.size) {
    message.warning('请至少选择一台设备')
    return
  }
  const count = bindSelectedIds.value.size
  subDevices.value.forEach(d => {
    if (bindSelectedIds.value.has(d.id)) d.bound = true
  })
  bindDrawerVisible.value = false
  bindSelectedIds.value.clear()
  message.success(`已成功绑定 ${count} 台子设备`)
}

// ============================================
// 消息日志 tab
// ============================================

interface MessageLog {
  id: string
  type: string           // 消息类型（子设备消息）
  time: string           // 完整时间 yyyy-MM-dd HH:mm:ss
  content: string        // 消息摘要（列表单行展示）
  deviceName: string
  headers: Array<{ key: string; value: string }>
  payload: Record<string, any>
}

// 消息摘要模板池
const messageTemplates = [
  '设备属性上报：温度 26.4℃、湿度 58%',
  '设备属性上报：温度 25.8℃、湿度 62%',
  '心跳消息：设备在线状态确认',
  '事件上报：检测到人员经过',
  '事件上报：门禁刷卡记录',
  '事件上报：告警触发 - 烟雾浓度超标',
  '设备属性上报：电池电量 84%',
  '设备属性上报：信号强度 -67dBm',
  '属性设置响应：开关量已更新',
  '事件上报：移动侦测触发',
  '心跳消息：设备在线状态确认',
  '设备属性上报：CPU 温度 42.8℃',
  '生命周期：设备已上线',
  '生命周期：设备已下线',
  '事件上报：车牌识别成功',
  '设备属性上报：存储使用率 38%',
  '属性读取响应：返回当前工作模式',
  '事件上报：人员逗留超时',
  '设备属性上报：网络延迟 38ms',
  '指令响应：重启指令已执行'
]

const messageDeviceNames = [
  'saas演示环境边缘网关',
  '前门摄像头-01',
  '温湿度传感器-01',
  '门禁控制器-01',
  '烟感报警器-01',
  '后门摄像头-02',
  '大厅摄像头-01',
  '光照传感器-01'
]

const messageIds = [
  'Yp9u-mtuoWvsnvIUBrMNkZdbxqDGf9PQ',
  'Kp8n-rtuqWvcnmATrONkZebxqDGf8RP',
  'Mp9o-sturWvdnoBUrPNkZfbxqEHf9QQ',
  'Lp7m-qtspWvemnCTrQNrZdbxqDGf7SP',
  'Np0n-rtvqWvenoDUrRNkZgbxqEHf8QP'
]

// 生成 50 条时间逆序的消息
function generateMessageLogs(): MessageLog[] {
  const baseTime = dayjs('2026-07-17 14:32:08')
  const list: MessageLog[] = []
  for (let i = 0; i < 50; i++) {
    const time = baseTime.subtract(i * 3 + Math.floor(Math.random() * 2), 'minute')
    const tpl = messageTemplates[i % messageTemplates.length]
    const deviceName = messageDeviceNames[i % messageDeviceNames.length]
    const messageId = messageIds[i % messageIds.length]
    const deviceId = String(2071773144544976896n - BigInt(i * 137))
    const productId = String(2064301595122171904n)
    const productName = '办公设备接入项目测试接入网关'

    list.push({
      id: `msg-${i}`,
      type: '子设备消息',
      time: time.format('YYYY-MM-DD HH:mm:ss'),
      content: tpl,
      deviceName,
      headers: [
        { key: 'messageId', value: messageId },
        { key: 'deviceId', value: deviceId },
        { key: 'deviceName', value: deviceName },
        { key: 'productId', value: productId },
        { key: 'productName', value: productName },
        { key: 'accessProvider', value: 'agent-media-device-gateway' }
      ],
      payload: {
        headers: {
          bindings: [{ id: String(2064168682737930240n - BigInt(i)), type: 'tenant' }],
          deviceName,
          productName,
          productId,
          accessProvider: 'agent-media-device-gateway',
          _uid: messageId,
          creatorId: '6a6df8fd621722fdde8887dd52022124',
          traceparent: `00-9f6efa6b6e63be7557b19ab2f50d740c-a2d9fd3aac5dbaf4-0${i}`
        },
        payloadType: i % 3 === 0 ? 'REPORT_PROPERTY' : i % 3 === 1 ? 'EVENT' : 'HEARTBEAT',
        timestamp: time.valueOf(),
        properties: {
          temperature: Number((25 + Math.random() * 3).toFixed(1)),
          humidity: Number((55 + Math.random() * 10).toFixed(0)),
          battery: 70 + Math.floor(Math.random() * 30)
        }
      }
    })
  }
  return list
}

const messageLogs = ref<MessageLog[]>(generateMessageLogs())

// 搜索 + 时间范围筛选
const msgSearchKey = ref('')
const msgTimeRange = ref<[Dayjs, Dayjs] | undefined>(undefined)
const msgCurrentPage = ref(1)
const msgPageSize = ref(20)

const filteredMessageLogs = computed(() => {
  const kw = msgSearchKey.value.trim().toLowerCase()
  return messageLogs.value.filter(m => {
    if (kw && !m.content.toLowerCase().includes(kw) && !m.deviceName.toLowerCase().includes(kw) && !m.type.toLowerCase().includes(kw)) return false
    if (msgTimeRange.value) {
      const t = dayjs(m.time)
      if (t.isBefore(msgTimeRange.value[0], 'second') || t.isAfter(msgTimeRange.value[1], 'second')) return false
    }
    return true
  })
})

const msgTotal = computed(() => filteredMessageLogs.value.length)
const pagedMessageLogs = computed(() => {
  const start = (msgCurrentPage.value - 1) * msgPageSize.value
  return filteredMessageLogs.value.slice(start, start + msgPageSize.value)
})

watch([msgSearchKey, msgTimeRange, msgPageSize], () => { msgCurrentPage.value = 1 })

// 详情抽屉
const msgDrawerVisible = ref(false)
const activeMessage = ref<MessageLog | null>(null)

function openMessageDetail(msg: MessageLog) {
  activeMessage.value = msg
  msgDrawerVisible.value = true
}

function closeMessageDetail() {
  msgDrawerVisible.value = false
}

// Payload 格式化（高亮显示）
const activePayloadText = computed(() => {
  if (!activeMessage.value) return ''
  return JSON.stringify(activeMessage.value.payload, null, 2)
})

function copyPayload() {
  if (!activePayloadText.value) return
  navigator.clipboard?.writeText(activePayloadText.value).then(
    () => message.success('已复制到剪贴板'),
    () => message.error('复制失败')
  )
}

// ============================================
// 远程调试 tab（5 大功能）
// ============================================

type DebugTool = 'terminal' | 'web' | 'desktop' | 'file' | 'network'
const activeDebugTool = ref<DebugTool>('terminal')

const debugTools: Array<{ key: DebugTool; label: string; icon: string; desc: string }> = [
  { key: 'terminal', label: '远程终端', icon: 'i-ant-design-code-outlined', desc: '命令行调试' },
  { key: 'web', label: 'Web 访问', icon: 'i-ant-design-global-outlined', desc: '内网 Web 服务' },
  { key: 'desktop', label: '远程桌面', icon: 'i-ant-design-desktop-outlined', desc: '远程桌面连接' },
  { key: 'file', label: '文件管理', icon: 'i-ant-design-folder-outlined', desc: '设备文件系统' },
  { key: 'network', label: '网络调试', icon: 'i-ant-design-dashboard-outlined', desc: '网络吞吐采样' }
]

// ===== 功能 1：远程终端（多窗口）=====
interface TermLine { type: 'input' | 'output' | 'error'; text: string }
interface Terminal { id: string; name: string; lines: TermLine[] }

let termSeq = 0
function createTerminal(): Terminal {
  termSeq += 1
  return {
    id: `term-${Date.now()}-${termSeq}`,
    name: `终端 ${termSeq}`,
    lines: [
      { type: 'output', text: 'JetLinks Edge Gateway - 远程终端' },
      { type: 'output', text: '连接已建立，当前用户：root' },
      { type: 'output', text: '输入 help 查看可用命令' }
    ]
  }
}

const terminals = ref<Terminal[]>([createTerminal()])
const activeTermId = ref(terminals.value[0].id)
const termInput = ref('')

const activeTerm = computed(() => terminals.value.find(t => t.id === activeTermId.value) || terminals.value[0])

const termOutputRef = ref<HTMLDivElement | null>(null)

function addTerminal() {
  const t = createTerminal()
  terminals.value.push(t)
  activeTermId.value = t.id
}

function closeTerminal(id: string) {
  const idx = terminals.value.findIndex(t => t.id === id)
  if (idx < 0) return
  terminals.value.splice(idx, 1)
  if (!terminals.value.length) {
    terminals.value.push(createTerminal())
  }
  if (activeTermId.value === id) {
    activeTermId.value = terminals.value[Math.min(idx, terminals.value.length - 1)].id
  }
}

function runTermCommand() {
  const cmd = termInput.value.trim()
  if (!cmd) return
  const term = activeTerm.value
  term.lines.push({ type: 'input', text: `root@jetlinks-edge:~# ${cmd}` })
  termInput.value = ''
  const [main] = cmd.split(/\s+/)
  const out = termMockOutput(main)
  out.forEach(line => term.lines.push({ type: line.startsWith('✓') || line.includes('总用量') || line.includes('drwx') ? 'output' : 'output', text: line }))
  if (main !== 'help' && out.length === 1 && out[0].includes('command not found')) {
    term.lines[term.lines.length - 1].type = 'error'
  }
  nextTick(() => {
    if (termOutputRef.value) termOutputRef.value.scrollTop = termOutputRef.value.scrollHeight
  })
}

function termMockOutput(cmd: string): string[] {
  switch (cmd) {
    case 'help':
      return [
        '可用命令：',
        '  ls          列出当前目录文件',
        '  top         查看系统进程',
        '  df -h       查看磁盘使用情况',
        '  free -m     查看内存使用',
        '  uptime      查看运行时长',
        '  ifconfig    查看网络接口',
        '  clear       清空终端'
      ]
    case 'ls':
      return ['data  home  log  opt  etc  bin  sbin  tmp', '总用量 24']
    case 'top':
      return [
        'Tasks: 128 total, 1 running, 127 sleeping',
        '%Cpu(s):  4.2 us,  1.8 sy,  0.0 ni, 93.6 id',
        '',
        '  PID USER      %CPU %MEM    COMMAND',
        ' 1052 root       2.1  4.8  java',
        '  890 root       0.6  1.2  agent-media-gateway',
        '  734 root       0.3  0.8  node'
      ]
    case 'df':
    case 'df -h':
      return [
        '文件系统        容量  已用  可用 已用% 挂载点',
        '/dev/root        30G   12G   18G   40% /',
        '/dev/sda1       200G   65G  135G   33% /data',
        'tmpfs           2.0G     0  2.0G    0% /tmp'
      ]
    case 'free':
    case 'free -m':
      return [
        '              总计         已用        空闲',
        '内存：       8000         5200         2800',
        '交换：       2048            0         2048'
      ]
    case 'uptime':
      return [' 14:32:08 up 19 days,  6:24,  1 user,  load average: 1.42, 1.35, 1.28']
    case 'ifconfig':
      return [
        'eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500',
        '        inet 192.168.1.100  netmask 255.255.255.0',
        '        RX packets 1284603  TX packets 982341',
        'wlan0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500',
        '        inet 192.168.1.108  netmask 255.255.255.0'
      ]
    case 'clear':
      setTimeout(() => { activeTerm.value.lines = [] }, 0)
      return []
    default:
      return [`bash: ${cmd}: command not found`]
  }
}

// ===== 功能 2：Web 访问（多窗口）=====
interface WebTab { id: string; url: string; title: string; loading: boolean; loaded: boolean }
let webSeq = 0
function createWebTab(url = ''): WebTab {
  webSeq += 1
  return { id: `web-${Date.now()}-${webSeq}`, url, title: url ? url.replace(/^https?:\/\//, '') : `新窗口 ${webSeq}`, loading: false, loaded: false }
}
const webTabs = ref<WebTab[]>([createWebTab()])
const activeWebId = ref(webTabs.value[0].id)
const webAddr = ref('')

const activeWeb = computed(() => webTabs.value.find(t => t.id === activeWebId.value) || webTabs.value[0])

function addWebTab() {
  const t = createWebTab()
  webTabs.value.push(t)
  activeWebId.value = t.id
  webAddr.value = ''
}

function closeWebTab(id: string) {
  const idx = webTabs.value.findIndex(t => t.id === id)
  if (idx < 0) return
  webTabs.value.splice(idx, 1)
  if (!webTabs.value.length) webTabs.value.push(createWebTab())
  if (activeWebId.value === id) activeWebId.value = webTabs.value[Math.min(idx, webTabs.value.length - 1)].id
}

function visitWeb() {
  const url = webAddr.value.trim() || activeWeb.value.url
  if (!url) { message.warning('请输入内网地址'); return }
  const tab = activeWeb.value
  tab.url = url
  tab.title = url.replace(/^https?:\/\//, '')
  tab.loading = true
  tab.loaded = false
  setTimeout(() => {
    tab.loading = false
    tab.loaded = true
  }, 1200)
}

// ===== 功能 3：远程桌面 =====
const rdpForm = ref({ ip: '192.168.1.100', port: '5900', username: '', password: '' })
const rdpStatus = ref<'idle' | 'connecting' | 'connected'>('idle')

function connectRdp() {
  if (!rdpForm.value.ip || !rdpForm.value.port) { message.warning('请输入 IP 和端口'); return }
  rdpStatus.value = 'connecting'
  setTimeout(() => { rdpStatus.value = 'connected' }, 1500)
}
function disconnectRdp() { rdpStatus.value = 'idle' }

// ===== 功能 4：文件管理 =====
interface FileNode { name: string; type: 'dir' | 'file'; size?: string; modified: string; ext?: string }

const fileSystem: Record<string, FileNode[]> = {
  '/': [
    { name: 'home', type: 'dir', modified: '2026-07-10 14:32' },
    { name: 'data', type: 'dir', modified: '2026-07-15 09:18' },
    { name: 'log', type: 'dir', modified: '2026-07-17 08:00' },
    { name: 'etc', type: 'dir', modified: '2026-06-28 11:20' },
    { name: 'opt', type: 'dir', modified: '2026-07-01 16:45' }
  ],
  '/home': [
    { name: 'jetlinks', type: 'dir', modified: '2026-07-10 14:32' },
    { name: 'config.json', type: 'file', size: '2.4 KB', modified: '2026-07-12 10:15', ext: 'json' },
    { name: 'readme.txt', type: 'file', size: '512 B', modified: '2026-07-08 09:30', ext: 'txt' }
  ],
  '/data': [
    { name: 'device-data', type: 'dir', modified: '2026-07-15 09:18' },
    { name: 'backup', type: 'dir', modified: '2026-07-14 18:00' },
    { name: 'snapshot-20260715.db', type: 'file', size: '128 MB', modified: '2026-07-15 09:18', ext: 'db' },
    { name: 'metrics.csv', type: 'file', size: '4.8 MB', modified: '2026-07-16 23:59', ext: 'csv' }
  ],
  '/log': [
    { name: 'gateway.log', type: 'file', size: '24 MB', modified: '2026-07-17 14:32', ext: 'log' },
    { name: 'system.log', type: 'file', size: '8.6 MB', modified: '2026-07-17 14:30', ext: 'log' },
    { name: 'error.log', type: 'file', size: '1.2 MB', modified: '2026-07-17 12:18', ext: 'log' }
  ],
  '/home/jetlinks': [
    { name: 'application.yml', type: 'file', size: '6.2 KB', modified: '2026-07-10 14:32', ext: 'yml' },
    { name: 'edge.jar', type: 'file', size: '86 MB', modified: '2026-07-10 14:32', ext: 'jar' }
  ]
}

const currentPath = ref('/')
const breadcrumb = computed(() => {
  const segs = currentPath.value.split('/').filter(Boolean)
  const crumbs = [{ name: '根目录', path: '/' }]
  let acc = ''
  segs.forEach(s => { acc += '/' + s; crumbs.push({ name: s, path: acc }) })
  return crumbs
})

const currentFiles = ref<FileNode[]>(fileSystem['/'] || [])

function enterDir(node: FileNode) {
  if (node.type !== 'dir') return
  const newPath = currentPath.value === '/' ? '/' + node.name : currentPath.value + '/' + node.name
  if (fileSystem[newPath]) {
    currentPath.value = newPath
    currentFiles.value = fileSystem[newPath]
  } else {
    message.info('该目录为空')
    currentPath.value = newPath
    currentFiles.value = []
  }
}

function gotoPath(path: string) {
  currentPath.value = path
  currentFiles.value = fileSystem[path] || []
  fileSearchKey.value = ''
}

// 搜索 + 刷新
const fileSearchKey = ref('')
const fileRefreshing = ref(false)
const filteredFiles = computed(() => {
  const kw = fileSearchKey.value.trim().toLowerCase()
  if (!kw) return currentFiles.value
  return currentFiles.value.filter(f => f.name.toLowerCase().includes(kw))
})
function refreshFiles() {
  fileRefreshing.value = true
  setTimeout(() => {
    fileRefreshing.value = false
    message.success('已刷新')
  }, 600)
}

// 上传文件
const uploading = ref(false)
function simulateUpload() {
  uploading.value = true
  message.loading({ content: '上传中...', key: 'up', duration: 0 })
  setTimeout(() => {
    uploading.value = false
    const names = ['config-backup.json', 'data-20260717.csv', 'firmware.bin', 'report.pdf']
    const name = names[Math.floor(Math.random() * names.length)]
    currentFiles.value.push({
      name,
      type: 'file',
      size: `${(Math.random() * 20 + 1).toFixed(1)} MB`,
      modified: dayjs().format('YYYY-MM-DD HH:mm'),
      ext: name.split('.').pop()
    })
    message.success({ content: `「${name}」上传成功`, key: 'up' })
  }, 1500)
}

// 新建目录
const newDirModalVisible = ref(false)
const newDirName = ref('')
function openNewDirModal() { newDirName.value = ''; newDirModalVisible.value = true }
function confirmNewDir() {
  const name = newDirName.value.trim()
  if (!name) { message.warning('请输入目录名称'); return }
  currentFiles.value.unshift({ name, type: 'dir', modified: dayjs().format('YYYY-MM-DD HH:mm') })
  newDirModalVisible.value = false
  message.success(`已创建目录「${name}」`)
}

function fileIcon(node: FileNode) {
  if (node.type === 'dir') return 'i-ant-design-folder-filled'
  const ext = node.ext || ''
  if (['jpg', 'png', 'gif', 'jpeg'].includes(ext)) return 'i-ant-design-file-image-outlined'
  if (['log', 'txt'].includes(ext)) return 'i-ant-design-file-text-outlined'
  if (['json', 'yml', 'yaml', 'xml'].includes(ext)) return 'i-ant-design-file-search-outlined'
  if (['csv', 'db'].includes(ext)) return 'i-ant-design-database-outlined'
  if (['jar', 'bin'].includes(ext)) return 'i-ant-design-code-sandbox-outlined'
  if (['pdf'].includes(ext)) return 'i-ant-design-file-pdf-outlined'
  return 'i-ant-design-file-outlined'
}

// ===== 功能 5：网络调试 =====
// 采样参数
const netSampling = ref(false)
const netPacketSize = ref(1024)      // 报文大小（字节）
const netPeriod = ref(1)              // 采样周期（秒）
const netConcurrency = ref(1)         // 并发数
const netDuplex = ref(true)           // 双工模式
const netRandomLoad = ref(false)      // 随机负载

// 样本（序号、回显次数、流量、吞吐、时间）
interface NetSample {
  seq: number
  echo: number
  traffic: number    // 流量 KB
  throughput: number // 吞吐 Mbps
  time: string
}
const netSamples = ref<NetSample[]>([])
let netTimer: ReturnType<typeof setInterval> | null = null
let netSeq = 0

// 顶部指标
const netStats = computed(() => {
  const s = netSamples.value
  if (!s.length) return { curSpeed: 0, peakSpeed: 0, totalTraffic: 0, totalEcho: 0 }
  const speeds = s.map(x => x.throughput)
  return {
    curSpeed: speeds[speeds.length - 1],
    peakSpeed: Math.max(...speeds),
    totalTraffic: Number(s.reduce((a, b) => a + b.traffic, 0).toFixed(1)),
    totalEcho: s.reduce((a, b) => a + b.echo, 0)
  }
})

function netPushSample() {
  netSeq += 1
  // 模拟吞吐：基础值受报文大小/并发影响 + 随机波动
  const base = (netPacketSize.value / 1024) * netConcurrency.value * 8 // Mbps 基础
  const wave = netRandomLoad.value ? Math.random() * base : Math.random() * base * 0.4 + base * 0.3
  const throughput = Number((base * 0.6 + wave).toFixed(2))
  const echo = netConcurrency.value * Math.floor(Math.random() * 8 + 8)
  const traffic = Number((throughput * netPeriod.value * 125).toFixed(1)) // Mbps*秒→KB
  const sample: NetSample = {
    seq: netSeq,
    echo,
    traffic,
    throughput,
    time: dayjs().format('YYYY-MM-DD HH:mm:ss')
  }
  // 时间逆序：最新在前
  netSamples.value.unshift(sample)
  if (netSamples.value.length > 20) netSamples.value.pop()
}

function toggleNetSample() {
  if (netSampling.value) {
    // 停止
    netSampling.value = false
    if (netTimer) { clearInterval(netTimer); netTimer = null }
  } else {
    // 开始
    netSampling.value = true
    netSamples.value = []
    netSeq = 0
    netPushSample()
    netTimer = setInterval(netPushSample, Math.max(netPeriod.value, 1) * 1000)
  }
}

function clearNetSamples() {
  netSamples.value = []
  netSeq = 0
}

onBeforeUnmount(() => { if (netTimer) clearInterval(netTimer) })

// ============================================
// 视觉模型 tab
// ============================================

// 检测类型元信息
const detectTypeMeta: Record<string, { icon: string; color: string }> = {
  '人员检测': { icon: 'i-ant-design-user-outlined', color: '#6e4bff' },
  '车辆识别': { icon: 'i-ant-design-car-outlined', color: '#1890ff' },
  '火焰检测': { icon: 'i-ant-design-fire-outlined', color: '#ff4d4f' },
  '安全帽检测': { icon: 'i-ant-design-safety-outlined', color: '#faad14' },
  '周界入侵': { icon: 'i-ant-design-shield-outlined', color: '#fa541c' },
  '周界入侵检测': { icon: 'i-ant-design-shield-outlined', color: '#fa541c' },
  '人流统计': { icon: 'i-ant-design-team-outlined', color: '#2bb3a3' }
}

interface CameraRef { deviceId: string; name: string; status: 'online' | 'offline' }
interface TaskRef { taskId: string; name: string; scene: string; status: 'running' | 'stopped' }
interface ModelVersion { version: string; change: string; time: string; size: string }
interface VisionModel {
  id: string
  name: string
  detectType: string
  version: string
  cameraCount: number
  status: 'enabled' | 'disabled'
  hasUpdate: boolean
  cameras: CameraRef[]
  tasks: TaskRef[]
  versions: ModelVersion[]
}

const visionModels = ref<VisionModel[]>([
  {
    id: 'vm1', name: '通用人员检测模型', detectType: '人员检测', version: 'v2.3.1', cameraCount: 18, status: 'enabled', hasUpdate: true,
    cameras: [
      { deviceId: 'CAM_2071773144544976896', name: '前门摄像头-01', status: 'online' },
      { deviceId: 'CAM_2071773144544976897', name: '后门摄像头-02', status: 'online' },
      { deviceId: 'CAM_2071773144544976898', name: '大厅摄像头-01', status: 'online' },
      { deviceId: 'CAM_2071773144544976899', name: '走廊摄像头-03', status: 'offline' }
    ],
    tasks: [
      { taskId: 'TASK_1002401', name: '前门人员逗留检测', scene: '安防告警', status: 'running' },
      { taskId: 'TASK_1002402', name: '大厅客流统计', scene: '客流分析', status: 'running' }
    ],
    versions: [
      { version: 'v2.3.1', change: '优化夜间低光照环境下的检测准确率', time: '2026-07-12 10:24', size: '24.6 MB' },
      { version: 'v2.3.0', change: '新增多人重叠场景识别', time: '2026-06-28 15:18', size: '24.2 MB' },
      { version: 'v2.2.5', change: '修复远距离目标漏检问题', time: '2026-06-10 09:30', size: '23.8 MB' }
    ]
  },
  {
    id: 'vm2', name: '车牌识别模型', detectType: '车辆识别', version: 'v1.8.0', cameraCount: 6, status: 'enabled', hasUpdate: false,
    cameras: [
      { deviceId: 'CAM_2071773144544976900', name: '停车场入口-01', status: 'online' },
      { deviceId: 'CAM_2071773144544976901', name: '停车场出口-02', status: 'online' }
    ],
    tasks: [
      { taskId: 'TASK_1002403', name: '停车场车牌记录', scene: '车辆通行', status: 'running' }
    ],
    versions: [
      { version: 'v1.8.0', change: '提升新能源车牌识别率', time: '2026-07-01 14:00', size: '18.4 MB' },
      { version: 'v1.7.2', change: '优化雨天环境识别', time: '2026-05-20 11:12', size: '18.0 MB' }
    ]
  },
  {
    id: 'vm3', name: '火焰烟雾检测模型', detectType: '火焰检测', version: 'v3.1.2', cameraCount: 12, status: 'enabled', hasUpdate: true,
    cameras: [
      { deviceId: 'CAM_2071773144544976902', name: '仓库摄像头-01', status: 'online' },
      { deviceId: 'CAM_2071773144544976903', name: '配电室摄像头-02', status: 'online' }
    ],
    tasks: [
      { taskId: 'TASK_1002404', name: '仓库火灾告警', scene: '消防告警', status: 'running' },
      { taskId: 'TASK_1002405', name: '配电室烟雾检测', scene: '消防告警', status: 'running' }
    ],
    versions: [
      { version: 'v3.1.2', change: '增加早期烟雾识别能力', time: '2026-07-15 16:42', size: '32.1 MB' },
      { version: 'v3.1.0', change: '降低误报率', time: '2026-06-18 10:00', size: '31.6 MB' }
    ]
  },
  {
    id: 'vm4', name: '安全帽佩戴检测', detectType: '安全帽检测', version: 'v1.5.3', cameraCount: 8, status: 'disabled', hasUpdate: false,
    cameras: [
      { deviceId: 'CAM_2071773144544976904', name: '施工区摄像头-01', status: 'online' }
    ],
    tasks: [
      { taskId: 'TASK_1002406', name: '施工区安全帽合规检查', scene: '施工安全', status: 'stopped' }
    ],
    versions: [
      { version: 'v1.5.3', change: '支持识别多种颜色安全帽', time: '2026-06-22 13:30', size: '16.8 MB' },
      { version: 'v1.5.0', change: '初始版本', time: '2026-05-01 09:00', size: '16.2 MB' }
    ]
  },
  {
    id: 'vm5', name: '周界入侵检测', detectType: '周界入侵', version: 'v2.0.1', cameraCount: 4, status: 'enabled', hasUpdate: false,
    cameras: [
      { deviceId: 'CAM_2071773144544976905', name: '厂界摄像头-01', status: 'online' },
      { deviceId: 'CAM_2071773144544976906', name: '厂界摄像头-02', status: 'offline' }
    ],
    tasks: [
      { taskId: 'TASK_1002407', name: '厂界入侵告警', scene: '安防告警', status: 'running' }
    ],
    versions: [
      { version: 'v2.0.1', change: '优化小动物过滤，减少误报', time: '2026-07-03 11:20', size: '28.4 MB' },
      { version: 'v2.0.0', change: '支持自定义周界区域绘制', time: '2026-06-05 14:48', size: '28.0 MB' }
    ]
  },
  {
    id: 'vm6', name: '区域人流统计', detectType: '人流统计', version: 'v1.2.0', cameraCount: 9, status: 'enabled', hasUpdate: false,
    cameras: [
      { deviceId: 'CAM_2071773144544976907', name: '大厅摄像头-01', status: 'online' },
      { deviceId: 'CAM_2071773144544976908', name: '会议室摄像头-02', status: 'online' }
    ],
    tasks: [
      { taskId: 'TASK_1002408', name: '大厅实时客流', scene: '客流分析', status: 'running' },
      { taskId: 'TASK_1002409', name: '会议室使用率统计', scene: '客流分析', status: 'running' }
    ],
    versions: [
      { version: 'v1.2.0', change: '提升高密度人群计数准确度', time: '2026-06-25 10:15', size: '20.6 MB' },
      { version: 'v1.1.0', change: '新增停留时长统计', time: '2026-05-18 16:00', size: '20.0 MB' }
    ]
  }
])

// ===== 使用范围抽屉 =====
const scopeDrawerVisible = ref(false)
const scopeModel = ref<VisionModel | null>(null)
function openScopeDrawer(m: VisionModel) {
  scopeModel.value = m
  scopeDrawerVisible.value = true
}

// ===== 历史版本抽屉 =====
const versionDrawerVisible = ref(false)
const versionModel = ref<VisionModel | null>(null)
function openVersionDrawer(m: VisionModel) {
  versionModel.value = m
  versionDrawerVisible.value = true
}

// ===== 搜索 + 视图切换 =====
const vmSearchKey = ref('')
type VisionView = 'card' | 'list'
const vmView = ref<VisionView>('card')

const filteredVisionModels = computed(() => {
  const kw = vmSearchKey.value.trim().toLowerCase()
  if (!kw) return visionModels.value
  return visionModels.value.filter(m =>
    m.name.toLowerCase().includes(kw) ||
    m.detectType.toLowerCase().includes(kw) ||
    m.version.toLowerCase().includes(kw)
  )
})

// ===== 禁用/启用切换 =====
function toggleModelStatus(m: VisionModel) {
  m.status = m.status === 'enabled' ? 'disabled' : 'enabled'
  message.success(`「${m.name}」已${m.status === 'enabled' ? '启用' : '禁用'}`)
}

// ===== 检查升级 =====
const upgrading = ref<Set<string>>(new Set())
function checkUpgrade(m: VisionModel) {
  if (upgrading.value.has(m.id)) return
  upgrading.value.add(m.id)
  message.loading({ content: `正在检查「${m.name}」升级...`, key: m.id, duration: 0 })
  setTimeout(() => {
    upgrading.value.delete(m.id)
    if (m.hasUpdate) {
      message.success({ content: `「${m.name}」发现新版本，已开始升级`, key: m.id })
      m.hasUpdate = false
      const major = Number(m.version.split('.')[0].replace('v', ''))
      const minor = Number(m.version.split('.')[1])
      const patch = Number(m.version.split('.')[2]) + 1
      const newVersion = `v${major}.${minor}.${patch}`
      m.version = newVersion
      m.versions.unshift({
        version: newVersion,
        change: '升级到最新版本，优化检测性能',
        time: dayjs().format('YYYY-MM-DD HH:mm'),
        size: `${(20 + Math.random() * 15).toFixed(1)} MB`
      })
    } else {
      message.info({ content: `「${m.name}」当前已是最新版本`, key: m.id })
    }
  }, 1500)
}

// ============================================
// 大模型 tab
// ============================================

interface LargeModel {
  id: string
  name: string
  desc: string
  version: string
  size: string         // 文件大小
  provider: string     // 适配机型
  abilities: string[]  // 能力标签
  color: string        // 主题色
}

const qwenModelDesc = 'jetlinks/qwen2.5-vl-3b-instruct-qcs8550-int8'
const qwenModelMachine = 'dege-qualcomn-qcs8550'
const qwenModelTags = ['Qwen2.5-VL', 'VLM', '3B', 'QCS8550', 'INT8']

const cloudModels: LargeModel[] = [
  {
    id: 'lm1', name: 'Qwen2.5-VL-3B-Instruct', version: 'v1.0.0', size: '1.8 GB',
    provider: qwenModelMachine, color: '#6e4bff',
    desc: qwenModelDesc,
    abilities: qwenModelTags
  },
  {
    id: 'lm2', name: 'Qwen2.5-VL-3B-INT8', version: 'v1.0.0', size: '1.2 GB',
    provider: qwenModelMachine, color: '#2bb3a3',
    desc: qwenModelDesc,
    abilities: qwenModelTags
  },
  {
    id: 'lm3', name: 'Qwen2.5-VL-QCS8550', version: 'v1.0.0', size: '960 MB',
    provider: qwenModelMachine, color: '#1890ff',
    desc: qwenModelDesc,
    abilities: qwenModelTags
  },
  {
    id: 'lm4', name: 'Qwen2.5-VL-Edge', version: 'v1.0.0', size: '680 MB',
    provider: qwenModelMachine, color: '#fa8c16',
    desc: qwenModelDesc,
    abilities: qwenModelTags
  }
]

// 云端模型列表（默认为空，刷新后加载）
const loadedCloudModels = ref<LargeModel[]>([])
const cloudLoading = ref(false)
const cloudSearchKey = ref('')

const filteredCloudModels = computed(() => {
  const kw = cloudSearchKey.value.trim().toLowerCase()
  if (!kw) return loadedCloudModels.value
  return loadedCloudModels.value.filter(m =>
    m.name.toLowerCase().includes(kw) ||
    m.desc.toLowerCase().includes(kw) ||
    m.provider.toLowerCase().includes(kw) ||
    m.abilities.some(a => a.toLowerCase().includes(kw))
  )
})

function refreshCloudModels() {
  if (cloudLoading.value) return
  cloudLoading.value = true
  loadedCloudModels.value = []
  setTimeout(() => {
    loadedCloudModels.value = [...cloudModels]
    cloudLoading.value = false
    message.success('已获取最新云端模型列表')
  }, 1000)
}

// 当前已配置的大模型（初始为空）
const activeModelId = ref<string>('')
const activeModel = computed<LargeModel | null>(() =>
  cloudModels.find(m => m.id === activeModelId.value) || null
)

// 下载状态
type DownloadState = 'idle' | 'downloading' | 'done'
const downloadState = ref<DownloadState>('idle')
const downloadModelId = ref<string>('')   // 正在下载的模型 id
const downloadProgress = ref(0)            // 0-100
let downloadTimer: ReturnType<typeof setInterval> | null = null

function startDownload(m: LargeModel) {
  // 已有配置模型，不能重复下载
  if (activeModelId.value) {
    message.warning('当前已配置大模型，请先移除后再下载新的模型')
    return
  }
  // 已在下载中
  if (downloadState.value === 'downloading') return

  downloadModelId.value = m.id
  downloadState.value = 'downloading'
  downloadProgress.value = 0
  message.info(`开始下载「${m.name}」，下载完成后系统将自动配置`)

  downloadTimer = setInterval(() => {
    downloadProgress.value += Math.floor(Math.random() * 8 + 4)
    if (downloadProgress.value >= 100) {
      downloadProgress.value = 100
      finishDownload()
    }
  }, 500)
}

function finishDownload() {
  if (downloadTimer) { clearInterval(downloadTimer); downloadTimer = null }
  const m = cloudModels.find(x => x.id === downloadModelId.value)
  if (m) {
    activeModelId.value = m.id
    message.success(`「${m.name}」下载完成，已自动配置为当前大模型`)
  }
  downloadState.value = 'done'
  setTimeout(() => {
    downloadState.value = 'idle'
    downloadModelId.value = ''
    downloadProgress.value = 0
  }, 800)
}

function stopDownload() {
  if (downloadTimer) { clearInterval(downloadTimer); downloadTimer = null }
  const m = cloudModels.find(x => x.id === downloadModelId.value)
  downloadState.value = 'idle'
  downloadModelId.value = ''
  downloadProgress.value = 0
  if (m) message.info(`已停止下载「${m.name}」`)
}

function removeActiveModel() {
  if (!activeModelId.value) return
  const m = activeModel.value
  Modal.confirm({
    title: '确认移除大模型',
    content: `确定要移除「${m?.name}」吗？移除后可重新下载配置其他大模型。`,
    okText: '确认移除',
    cancelText: '取消',
    okType: 'danger',
    onOk() {
      activeModelId.value = ''
      if (m) message.success(`已移除「${m.name}」，可下载配置其他大模型`)
    }
  })
}

function getModelDownloadState(id: string): 'idle' | 'downloading' | 'active' {
  if (activeModelId.value === id) return 'active'
  if (downloadState.value === 'downloading' && downloadModelId.value === id) return 'downloading'
  return 'idle'
}

onBeforeUnmount(() => { if (downloadTimer) clearInterval(downloadTimer) })
</script>

<template>
  <div class="gd-page">
    <section class="gd-hero">
      <button class="gd-hero__back" type="button" @click="goBack">
        <i class="i-ant-design-arrow-left-outlined" /><span>返回</span>
      </button>
      <div class="gd-hero__main">
        <div class="gd-hero__icon">
          <img :src="gatewayDisplayImg" alt="网关设备" draggable="false" />
        </div>
        <div class="gd-hero__info">
          <div class="gd-hero__title-row">
            <h2>{{ gatewayName }}</h2>
            <span class="gd-hero__status" :class="gateway.status">
              <i class="gd-hero__status-dot" />{{ gateway.status === 'online' ? '在线' : '离线' }}
            </span>
            <span class="gd-hero__tag">SN: {{ gatewaySn }}</span>
          </div>
          <div class="gd-hero__meta">
            <span><i class="i-ant-design-folder-outlined" />{{ gateway.projectName || '未加入项目' }}</span>
            <span><i class="i-ant-design-clock-circle-outlined" />绑定时间：2026-07-10 14:32</span>
            <span><i class="i-ant-design-code-sandbox-outlined" />当前固件：2.11.0-SNAPSHOT</span>
            <span><i class="i-ant-design-link-outlined" />接入地址：mqtt://iot-uat.jetlinks.cn:1883</span>
          </div>
        </div>
      </div>
      <div class="gd-hero__actions">
        <button
          class="gd-config-btn"
          :class="{ 'is-guide-target': appStore.guideStep === 'gateway-detail-enter' }"
          :data-guide="appStore.guideStep === 'gateway-detail-enter' ? 'gateway-detail-enter' : undefined"
          type="button"
          @click="goConfigDevice"
        >
          <i class="i-ant-design-link-outlined" /><span>进入网关</span>
        </button>
      </div>
    </section>

    <nav class="gd-tabs">
      <button :class="{ active: activeTab === 'status' }" @click="switchTab('status')">运行状态</button>
      <button :class="{ active: activeTab === 'sub-device' }" @click="switchTab('sub-device')">子设备</button>
      <button :class="{ active: activeTab === 'message-log' }" @click="switchTab('message-log')">消息日志</button>
      <button :class="{ active: activeTab === 'debug' }" @click="switchTab('debug')">远程调试</button>
      <button :class="{ active: activeTab === 'vision-model' }" @click="switchTab('vision-model')">视觉模型</button>
      <button :class="{ active: activeTab === 'large-model' }" @click="switchTab('large-model')">大模型</button>
    </nav>

    <main class="gd-content">
      <section v-if="activeTab === 'status'" class="gd-status">
        <!-- ===== 顶部：指标行（图标+文案，参考视联中心 KPI 卡）===== -->
        <div class="gd-top-metrics">
          <div
            v-for="item in topMetrics"
            :key="item.key"
            class="gd-top-metric"
          >
            <div class="gd-top-metric__head">
              <span class="gd-top-metric__icon" :style="{ background: item.color }">
                <i :class="item.icon" />
              </span>
              <div class="gd-top-metric__body">
                <strong class="gd-top-metric__value">
                  {{ item.value }}<small>{{ item.unit }}</small>
                  <em v-if="item.badge" class="gd-top-metric__badge">{{ item.badge }}</em>
                </strong>
                <small class="gd-top-metric__label">{{ item.label }}</small>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== 运行属性（左右双栏）===== -->
        <div class="gd-runtime">
          <!-- 左侧：指标卡（按组分区）-->
          <section class="gd-metrics-panel">
            <div class="gd-section-head">
              <div>
                <strong>运行属性</strong>
                <span>点击指标查看趋势</span>
              </div>
            </div>

            <div class="gd-metrics-scroll scroll-thin">
              <div
                v-for="group in metricGroups"
                :key="group.key"
                class="gd-metric-group"
              >
                <div class="gd-metric-group__title">{{ group.label }}</div>

                <div class="gd-metric-grid">
                  <button
                    v-for="metric in metricsByGroup[group.key]"
                    :key="metric.key"
                    class="gd-metric"
                    :class="{
                      active: activeMetricKey === metric.key,
                      'is-trend': metric.type === 'trend',
                      'is-capacity': metric.type === 'capacity',
                      'has-dual': metric.type === 'trend' && metric.subName
                    }"
                    type="button"
                    @click="activeMetricKey = metric.key"
                  >
                    <!-- 时序型 -->
                    <template v-if="metric.type === 'trend'">
                      <span class="gd-metric__head">
                        <span class="gd-metric__name">{{ metric.name }}</span>
                        <i class="i-ant-design-line-chart-outlined gd-metric__trend-icon" />
                      </span>
                      <!-- 磁盘读写速率：双数值 -->
                      <div v-if="metric.subName" class="gd-metric__dual">
                        <div>
                          <em>读取</em>
                          <strong>{{ metric.value }}<small>{{ metric.unit }}</small></strong>
                        </div>
                        <div>
                          <em>{{ metric.subName }}</em>
                          <strong>{{ metric.subValue }}<small>{{ metric.unit }}</small></strong>
                        </div>
                      </div>
                      <strong v-else>{{ metric.value }}<small>{{ metric.unit }}</small></strong>
                      <span v-if="!metric.subName" class="gd-metric__bar">
                        <i :style="{ width: metric.percent + '%', background: metric.color }" />
                      </span>
                    </template>

                    <!-- 容量型 -->
                    <template v-else-if="metric.type === 'capacity'">
                      <span class="gd-metric__head">
                        <span class="gd-metric__name">{{ metric.name }}</span>
                        <i class="i-ant-design-line-chart-outlined gd-metric__trend-icon" />
                      </span>
                      <div class="gd-metric__capacity">
                        <strong>{{ metric.used }}<small>/ {{ metric.total }} {{ metric.unit }}</small></strong>
                        <span class="gd-metric__capacity-pct">{{ capacityPercent(metric) }}%</span>
                      </div>
                      <span class="gd-metric__bar">
                        <i :style="{ width: capacityPercent(metric) + '%', background: usageColor(capacityPercent(metric)) }" />
                      </span>
                    </template>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <!-- 右侧：趋势图（统一视图）-->
          <section class="gd-chart-panel">
            <div class="gd-chart-panel__head">
              <div>
                <strong>{{ activeMetric.name }}</strong>
                <span>{{ activeMetric.type === 'capacity' ? '已使用量趋势' : rangeLabel }}</span>
              </div>
              <div class="gd-range">
                <button
                  v-for="item in rangeOptions"
                  :key="item.key"
                  type="button"
                  :class="{ active: timeRange === item.key }"
                  @click="selectTimeRange(item.key)"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>

            <div class="gd-active-metric">
              <div>
                <span>当前值</span>
                <strong :style="{ color: activeMetric.color }">
                  <template v-if="activeMetric.type === 'capacity'">{{ activeMetric.used }}</template>
                  <template v-else>{{ activeMetricStats.latest }}</template>
                  <small>{{ activeMetric.unit }}</small>
                </strong>
              </div>
              <div>
                <span>较上一点</span>
                <strong :class="activeMetricStats.trend >= 0 ? 'is-up' : 'is-down'">
                  {{ activeMetricStats.trend >= 0 ? '+' : '' }}{{ activeMetricStats.trend }}<small>{{ activeMetric.unit }}</small>
                </strong>
              </div>
              <div>
                <span>指标说明</span>
                <em>{{ activeMetric.desc }}</em>
              </div>
            </div>

            <a-range-picker
              v-if="timeRange === 'custom'"
              v-model:value="customRange"
              class="gd-custom-range"
              show-time
            />

            <div class="gd-chart-panel__chart">
              <ECharts :option="metricChartOption" height="100%" />
            </div>

            <div class="gd-stat-row">
              <div>
                <span>平均值</span>
                <strong>{{ activeMetricStats.avg }}<small>{{ activeMetric.unit }}</small></strong>
              </div>
              <div>
                <span>峰值</span>
                <strong>{{ activeMetricStats.max }}<small>{{ activeMetric.unit }}</small></strong>
              </div>
              <div>
                <span>低谷</span>
                <strong>{{ activeMetricStats.min }}<small>{{ activeMetric.unit }}</small></strong>
              </div>
            </div>
          </section>
        </div>
      </section>

      <!-- ===== 子设备 tab ===== -->
      <section v-else-if="activeTab === 'sub-device'" class="gd-sub-device">
        <!-- 统计行 + 绑定按钮 -->
        <div class="gd-sub-stats">
          <div class="gd-sub-stats__info">
            <span class="gd-sub-stats__item">
              已绑定 <strong>{{ boundCount }}</strong> 台
            </span>
            <span class="gd-sub-stats__divider">·</span>
            <span class="gd-sub-stats__item is-unbound">
              未绑定 <strong>{{ unboundCount }}</strong> 台
            </span>
          </div>
          <button class="gd-sub-bind-btn" type="button" :disabled="!unboundCount" @click="openBindDrawer">
            <i class="i-ant-design-link-outlined" /><span>绑定子设备</span>
          </button>
        </div>

        <!-- 工具栏 -->
        <div class="gd-sub-toolbar">
          <a-input
            v-model:value="subSearchKey"
            class="gd-sub-search"
            placeholder="搜索设备名称、设备库、型号"
            allow-clear
          >
            <template #prefix><i class="i-ant-design-search-outlined" /></template>
          </a-input>
          <div class="gd-vision__view-switch">
            <button
              type="button"
              class="gd-vision__view-btn"
              :class="{ active: subView === 'card' }"
              title="卡片视图"
              @click="subView = 'card'"
            ><i class="i-ant-design-appstore-outlined" /></button>
            <button
              type="button"
              class="gd-vision__view-btn"
              :class="{ active: subView === 'list' }"
              title="列表视图"
              @click="subView = 'list'"
            ><i class="i-ant-design-unordered-list-outlined" /></button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="!pagedSubDevices.length" class="gd-sub-table">
          <div class="gd-sub-empty">
            <i class="i-ant-design-inbox-outlined" />
            <p>暂无已绑定的子设备</p>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-else-if="subView === 'list'" class="gd-sub-table">
          <div class="gd-sub-table__head">
            <div class="gd-sub-col gd-sub-col--name">设备名称</div>
            <div class="gd-sub-col gd-sub-col--type">设备库</div>
            <div class="gd-sub-col gd-sub-col--model">型号</div>
            <div class="gd-sub-col gd-sub-col--status">状态</div>
          </div>

          <div class="gd-sub-table__body scroll-thin">
            <div
              v-for="dev in pagedSubDevices"
              :key="dev.id"
              class="gd-sub-row"
            >
              <div class="gd-sub-col gd-sub-col--name">
                <span class="gd-sub-name">{{ dev.name }}</span>
              </div>
              <div class="gd-sub-col gd-sub-col--type">
                <span class="gd-sub-type" :style="{ color: deviceTypeMeta[dev.deviceType]?.color, background: deviceTypeMeta[dev.deviceType]?.color + '14' }">
                  <i :class="deviceTypeMeta[dev.deviceType]?.icon" />{{ dev.deviceType }}
                </span>
              </div>
              <div class="gd-sub-col gd-sub-col--model">{{ dev.model }}</div>
              <div class="gd-sub-col gd-sub-col--status">
                <span class="gd-sub-status" :class="dev.status">
                  <i class="gd-sub-status__dot" />{{ dev.status === 'online' ? '在线' : '离线' }}
                </span>
              </div>
            </div>
          </div>

          <div class="gd-sub-footer">
            <a-pagination
              v-model:current="subCurrentPage"
              v-model:pageSize="subPageSize"
              :total="subTotal"
              :page-size-options="['10', '20', '50']"
              size="small"
              show-size-changer
            />
          </div>
        </div>

        <!-- 卡片视图 -->
        <div v-else class="gd-sub-card-wrap">
          <div class="gd-sub-card-grid scroll-thin">
            <article
              v-for="dev in pagedSubDevices"
              :key="dev.id"
              class="gd-sub-card"
              :class="{ 'is-offline': dev.status === 'offline' }"
            >
              <span class="gd-sub-status gd-sub-card__status" :class="dev.status">
                <i class="gd-sub-status__dot" />{{ dev.status === 'online' ? '在线' : '离线' }}
              </span>
              <div class="gd-sub-card__head">
                <span class="gd-sub-card__icon" :style="{ background: deviceTypeMeta[dev.deviceType]?.color }">
                  <i :class="deviceTypeMeta[dev.deviceType]?.icon" />
                </span>
                <div class="gd-sub-card__title-wrap">
                  <div class="gd-sub-card__name-row">
                    <strong class="gd-sub-card__name">{{ dev.name }}</strong>
                  </div>
                  <span class="gd-sub-card__type">
                    <i :class="deviceTypeMeta[dev.deviceType]?.icon" />{{ dev.deviceType }}
                  </span>
                  <span class="gd-sub-card__model">
                    <i class="i-ant-design-code-sandbox-outlined" /><em class="gd-vm-card__version-num">{{ dev.model }}</em>
                  </span>
                </div>
              </div>
            </article>
          </div>
          <div class="gd-sub-footer">
            <a-pagination
              v-model:current="subCurrentPage"
              v-model:pageSize="subPageSize"
              :total="subTotal"
              :page-size-options="['10', '20', '50']"
              size="small"
              show-size-changer
            />
          </div>
        </div>
      </section>

      <!-- ===== 消息日志 tab ===== -->
      <section v-else-if="activeTab === 'message-log'" class="gd-msglog">
        <!-- 工具栏：搜索 + 时间范围 -->
        <div class="gd-msglog__toolbar">
          <a-input
            v-model:value="msgSearchKey"
            class="gd-msglog__search"
            placeholder="搜索消息内容、设备名称、类型"
            allow-clear
          >
            <template #prefix><i class="i-ant-design-search-outlined" /></template>
          </a-input>
          <a-range-picker
            v-model:value="msgTimeRange"
            class="gd-msglog__range"
            show-time
            format="YYYY-MM-DD HH:mm"
          />
          <span class="gd-msglog__count">共 {{ msgTotal }} 条</span>
        </div>

        <!-- 消息列表 -->
        <div class="gd-msglog__list">
          <!-- 表头（固定不滚动）-->
          <div class="gd-msglog__head">
            <span class="gd-msglog__head-type">消息类型</span>
            <span class="gd-msglog__head-content">消息内容</span>
            <span class="gd-msglog__head-time">时间</span>
            <span class="gd-msglog__head-action"></span>
          </div>

          <!-- 表体（滚动区）-->
          <div class="gd-msglog__body scroll-thin">
            <div v-if="!pagedMessageLogs.length" class="gd-msglog__empty">
              <i class="i-ant-design-inbox-outlined" />
              <p>没有符合条件的消息</p>
            </div>
            <div
              v-for="msg in pagedMessageLogs"
              :key="msg.id"
              class="gd-msglog__item"
              :class="{ active: activeMessage?.id === msg.id }"
              @click="openMessageDetail(msg)"
            >
              <span class="gd-msglog__type">{{ msg.type }}</span>
              <span class="gd-msglog__content">{{ msg.content }}</span>
              <span class="gd-msglog__time">{{ msg.time }}</span>
              <i class="i-ant-design-right-outlined gd-msglog__arrow" />
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div class="gd-msglog__footer">
          <a-pagination
            v-model:current="msgCurrentPage"
            v-model:pageSize="msgPageSize"
            :total="msgTotal"
            :page-size-options="['20', '50', '100']"
            size="small"
            show-size-changer
          />
        </div>
      </section>

      <!-- ===== 远程调试 tab ===== -->
      <section v-else-if="activeTab === 'debug'" class="gd-debug">
        <!-- 左侧功能菜单 -->
        <aside class="gd-debug__menu">
          <button
            v-for="tool in debugTools"
            :key="tool.key"
            type="button"
            class="gd-debug__menu-item"
            :class="{ active: activeDebugTool === tool.key }"
            @click="activeDebugTool = tool.key"
          >
            <i :class="tool.icon" />
            <div class="gd-debug__menu-text">
              <strong>{{ tool.label }}</strong>
              <span>{{ tool.desc }}</span>
            </div>
          </button>
        </aside>

        <!-- 右侧内容区 -->
        <div class="gd-debug__main">
          <!-- 功能 1：远程终端 -->
          <div v-if="activeDebugTool === 'terminal'" class="gd-term">
            <div class="gd-term__tabs">
              <div
                v-for="t in terminals"
                :key="t.id"
                class="gd-term__tab"
                :class="{ active: activeTermId === t.id }"
                @click="activeTermId = t.id"
              >
                <i class="i-ant-design-code-outlined" />
                <span>{{ t.name }}</span>
                <button type="button" class="gd-term__tab-close" @click.stop="closeTerminal(t.id)">
                  <i class="i-ant-design-close-outlined" />
                </button>
              </div>
              <button type="button" class="gd-term__add" @click="addTerminal">
                <i class="i-ant-design-plus-outlined" />
              </button>
            </div>
            <div ref="termOutputRef" class="gd-term__output scroll-thin">
              <div
                v-for="(line, idx) in activeTerm.lines"
                :key="idx"
                class="gd-term__line"
                :class="line.type"
              >{{ line.text }}</div>
            </div>
            <div class="gd-term__input-row">
              <span class="gd-term__prompt">root@jetlinks-edge:~#</span>
              <input
                v-model="termInput"
                class="gd-term__input"
                placeholder="输入命令后回车（试试 help / ls / top）"
                @keydown.enter="runTermCommand"
              />
            </div>
          </div>

          <!-- 功能 2：Web 访问 -->
          <div v-else-if="activeDebugTool === 'web'" class="gd-web">
            <div class="gd-web__tabs">
              <div
                v-for="t in webTabs"
                :key="t.id"
                class="gd-web__tab"
                :class="{ active: activeWebId === t.id }"
                @click="activeWebId = t.id"
              >
                <i class="i-ant-design-global-outlined" />
                <span>{{ t.title || '新窗口' }}</span>
                <button type="button" class="gd-term__tab-close" @click.stop="closeWebTab(t.id)">
                  <i class="i-ant-design-close-outlined" />
                </button>
              </div>
              <button type="button" class="gd-term__add" @click="addWebTab">
                <i class="i-ant-design-plus-outlined" />
              </button>
            </div>
            <div class="gd-web__addr">
              <input
                v-model="webAddr"
                class="gd-web__addr-input"
                :placeholder="activeWeb.url || '输入内网地址，如 http://192.168.1.100:8080'"
                @keydown.enter="visitWeb"
              />
              <button type="button" class="gd-web__addr-btn" @click="visitWeb">
                <i class="i-ant-design-arrow-right-outlined" />访问
              </button>
            </div>
            <div class="gd-web__preview">
              <div v-if="activeWeb.loading" class="gd-web__loading">
                <i class="i-ant-design-loading-outlined" />
                <p>正在访问 {{ activeWeb.url }} ...</p>
              </div>
              <div v-else-if="activeWeb.loaded" class="gd-web__loaded">
                <div class="gd-web__loaded-bar">
                  <i class="i-ant-design-check-circle-outlined" />
                  <span>已加载：{{ activeWeb.url }}</span>
                  <em>响应时间 {{ (Math.random() * 200 + 50).toFixed(0) }} ms</em>
                </div>
                <div class="gd-web__screenshot">
                  <i class="i-ant-design-global-outlined" />
                  <p>内网 Web 服务页面预览</p>
                  <span>（原型环境无法真实访问内网地址，实际使用时将以内嵌网页形式展示）</span>
                </div>
              </div>
              <div v-else class="gd-web__empty">
                <i class="i-ant-design-global-outlined" />
                <p>输入内网地址并点击「访问」</p>
                <span>支持访问设备侧内网的 Web 服务，如设备管理后台、配置页面等</span>
              </div>
            </div>
          </div>

          <!-- 功能 3：远程桌面 -->
          <div v-else-if="activeDebugTool === 'desktop'" class="gd-rdp">
            <aside class="gd-rdp__config">
              <div class="gd-rdp__title">连接配置</div>
              <label class="gd-rdp__field">
                <span>IP 地址</span>
                <input v-model="rdpForm.ip" placeholder="192.168.1.100" />
              </label>
              <label class="gd-rdp__field">
                <span>端口</span>
                <input v-model="rdpForm.port" placeholder="5900" />
              </label>
              <label class="gd-rdp__field">
                <span>用户名（可选）</span>
                <input v-model="rdpForm.username" placeholder="administrator" />
              </label>
              <label class="gd-rdp__field">
                <span>密码（可选）</span>
                <input v-model="rdpForm.password" type="password" placeholder="******" />
              </label>
              <div class="gd-rdp__status">
                <span class="gd-rdp__status-dot" :class="rdpStatus" />
                <em>{{ rdpStatus === 'idle' ? '未连接' : rdpStatus === 'connecting' ? '连接中...' : '已连接' }}</em>
              </div>
              <button
                v-if="rdpStatus !== 'connected'"
                type="button"
                class="gd-rdp__connect"
                :disabled="rdpStatus === 'connecting'"
                @click="connectRdp"
              >{{ rdpStatus === 'connecting' ? '连接中...' : '连接' }}</button>
              <button v-else type="button" class="gd-rdp__disconnect" @click="disconnectRdp">断开连接</button>
            </aside>
            <div class="gd-rdp__preview">
              <div v-if="rdpStatus === 'connected'" class="gd-rdp__connected">
                <div class="gd-rdp__connected-bar">
                  <span class="gd-rdp__status-dot connected" />
                  <strong>桌面已连接</strong>
                  <em>1920 × 1080 · 30 FPS</em>
                </div>
                <div class="gd-rdp__screen">
                  <i class="i-ant-design-desktop-outlined" />
                  <p>远程桌面画面</p>
                  <span>（原型环境模拟，实际使用时将实时显示设备桌面）</span>
                </div>
              </div>
              <div v-else-if="rdpStatus === 'connecting'" class="gd-rdp__empty">
                <i class="i-ant-design-loading-outlined" />
                <p>正在建立连接...</p>
              </div>
              <div v-else class="gd-rdp__empty">
                <i class="i-ant-design-desktop-outlined" />
                <p>填写左侧连接配置后点击「连接」</p>
                <span>通过 IP 和端口访问设备侧内网的远程桌面</span>
              </div>
            </div>
          </div>

          <!-- 功能 4：文件管理 -->
          <div v-else-if="activeDebugTool === 'file'" class="gd-file">
            <div class="gd-file__toolbar">
              <div class="gd-file__toolbar-left">
                <div class="gd-file__breadcrumb">
                  <template v-for="(crumb, idx) in breadcrumb" :key="crumb.path">
                    <span
                      class="gd-file__crumb"
                      :class="{ active: idx === breadcrumb.length - 1 }"
                      @click="gotoPath(crumb.path)"
                    >{{ crumb.name }}</span>
                    <i v-if="idx < breadcrumb.length - 1" class="i-ant-design-right-outlined gd-file__sep" />
                  </template>
                </div>
              </div>
              <div class="gd-file__actions">
                <a-input
                  v-model:value="fileSearchKey"
                  class="gd-file__search"
                  placeholder="搜索文件名"
                  allow-clear
                >
                  <template #prefix><i class="i-ant-design-search-outlined" /></template>
                </a-input>
                <button type="button" class="gd-file__btn" :disabled="fileRefreshing" @click="refreshFiles">
                  <i :class="fileRefreshing ? 'i-ant-design-loading-outlined' : 'i-ant-design-reload-outlined'" /><span>刷新</span>
                </button>
                <button type="button" class="gd-file__btn" :disabled="uploading" @click="simulateUpload">
                  <i class="i-ant-design-upload-outlined" /><span>{{ uploading ? '上传中' : '上传文件' }}</span>
                </button>
                <button type="button" class="gd-file__btn" @click="openNewDirModal">
                  <i class="i-ant-design-folder-add-outlined" /><span>新建目录</span>
                </button>
              </div>
            </div>
            <div class="gd-file__table">
              <div class="gd-file__head">
                <span class="gd-file__col-name">名称</span>
                <span class="gd-file__col-size">大小</span>
                <span class="gd-file__col-time">修改时间</span>
              </div>
              <div class="gd-file__body scroll-thin">
                <div v-if="!filteredFiles.length && fileSearchKey" class="gd-file__empty">
                  <i class="i-ant-design-search-outlined" />
                  <p>没有找到匹配「{{ fileSearchKey }}」的文件</p>
                </div>
                <div v-else-if="!filteredFiles.length" class="gd-file__empty">
                  <i class="i-ant-design-folder-open-outlined" />
                  <p>该目录为空</p>
                </div>
                <div
                  v-for="(node, idx) in filteredFiles"
                  :key="idx"
                  class="gd-file__row"
                  :class="{ 'is-dir': node.type === 'dir' }"
                  @dblclick="enterDir(node)"
                >
                  <span class="gd-file__col-name">
                    <i :class="fileIcon(node)" :style="{ color: node.type === 'dir' ? '#faad14' : '#8895ab' }" />
                    <span class="gd-file__name">{{ node.name }}</span>
                  </span>
                  <span class="gd-file__col-size">{{ node.size || '—' }}</span>
                  <span class="gd-file__col-time">{{ node.modified }}</span>
                </div>
              </div>
              <div class="gd-file__tip">
                <i class="i-ant-design-info-circle-outlined" />
                双击目录可进入；通过边缘代理访问设备侧文件系统，操作方式与本地文件管理一致。
              </div>
            </div>
          </div>

          <!-- 功能 5：网络调试 -->
          <div v-else-if="activeDebugTool === 'network'" class="gd-net">
            <div class="gd-net__notice">
              <span>通过边缘通道持续采样设备网络吞吐，开始后再次点击停止测速。</span>
              <span class="gd-net__status" :class="{ running: netSampling }">
                <i class="gd-net__status-dot" />{{ netSampling ? '采样中' : '已停止' }}
              </span>
            </div>
            <div class="gd-net__body">
              <!-- 左侧采样参数 -->
              <aside class="gd-net__config">
                <div class="gd-net__config-title">采样参数</div>

                <label class="gd-net__field">
                  <span>报文大小</span>
                  <a-input-number v-model:value="netPacketSize" :min="64" :step="64" :disabled="netSampling" size="small" style="width:100%">
                    <template #addonAfter>字节</template>
                  </a-input-number>
                </label>

                <label class="gd-net__field">
                  <span>采样周期</span>
                  <a-input-number v-model:value="netPeriod" :min="1" :max="60" :disabled="netSampling" size="small" style="width:100%">
                    <template #addonAfter>秒</template>
                  </a-input-number>
                </label>

                <label class="gd-net__field">
                  <span>并发数</span>
                  <a-input-number v-model:value="netConcurrency" :min="1" :max="32" :disabled="netSampling" size="small" style="width:100%" />
                </label>

                <div class="gd-net__switch-row">
                  <span>双工模式</span>
                  <button type="button" class="gd-vm-switch" :class="{ on: netDuplex }" :disabled="netSampling" @click="netDuplex = !netDuplex">
                    <i class="gd-vm-switch__dot" />
                  </button>
                  <em>{{ netDuplex ? '开启' : '关闭' }}</em>
                </div>

                <div class="gd-net__switch-row">
                  <span>随机负载</span>
                  <button type="button" class="gd-vm-switch" :class="{ on: netRandomLoad }" :disabled="netSampling" @click="netRandomLoad = !netRandomLoad">
                    <i class="gd-vm-switch__dot" />
                  </button>
                  <em>{{ netRandomLoad ? '开启' : '关闭' }}</em>
                </div>

                <button
                  type="button"
                  class="gd-net__start"
                  :class="{ 'is-running': netSampling }"
                  @click="toggleNetSample"
                >
                  <i :class="netSampling ? 'i-ant-design-pause-circle-outlined' : 'i-ant-design-play-circle-outlined'" />
                  {{ netSampling ? '停止测速' : '开始测速' }}
                </button>
                <p class="gd-net__config-tip">样本按时间逆序排列，最多保留 20 条记录。</p>
              </aside>

              <!-- 右侧结果 -->
              <div class="gd-net__result">
                <!-- 顶部指标卡 -->
                <div class="gd-net__metrics">
                  <div class="gd-net__metric">
                    <span>当前速度</span>
                    <strong>{{ netStats.curSpeed }}<small>Mbps</small></strong>
                  </div>
                  <div class="gd-net__metric">
                    <span>峰值速度</span>
                    <strong>{{ netStats.peakSpeed }}<small>Mbps</small></strong>
                  </div>
                  <div class="gd-net__metric">
                    <span>累计流量</span>
                    <strong>{{ netStats.totalTraffic }}<small>KB</small></strong>
                  </div>
                  <div class="gd-net__metric">
                    <span>回显次数</span>
                    <strong>{{ netStats.totalEcho }}<small>次</small></strong>
                  </div>
                </div>

                <!-- 样本表格 -->
                <div class="gd-net__samples">
                  <div class="gd-net__samples-head">
                    <strong>采样样本</strong>
                    <button type="button" class="gd-net__clear" :disabled="!netSamples.length" @click="clearNetSamples">
                      <i class="i-ant-design-delete-outlined" />清空结果
                    </button>
                  </div>
                  <div class="gd-net__samples-table">
                    <div class="gd-net__samples-thead">
                      <span class="gd-net__col-seq">序号</span>
                      <span class="gd-net__col-echo">回显次数</span>
                      <span class="gd-net__col-traffic">流量</span>
                      <span class="gd-net__col-tp">吞吐</span>
                      <span class="gd-net__col-time">时间</span>
                    </div>
                    <div class="gd-net__samples-body scroll-thin">
                      <div v-if="!netSamples.length" class="gd-net__samples-empty">
                        <i class="i-ant-design-dashboard-outlined" />
                        <p>暂无采样数据，点击「开始测速」开始采集</p>
                      </div>
                      <div
                        v-for="s in netSamples"
                        :key="s.seq"
                        class="gd-net__samples-row"
                      >
                        <span class="gd-net__col-seq">{{ s.seq }}</span>
                        <span class="gd-net__col-echo">{{ s.echo }}</span>
                        <span class="gd-net__col-traffic">{{ s.traffic }} KB</span>
                        <span class="gd-net__col-tp"><strong>{{ s.throughput }}</strong> Mbps</span>
                        <span class="gd-net__col-time">{{ s.time }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== 视觉模型 tab ===== -->
      <section v-else-if="activeTab === 'vision-model'" class="gd-vision">
        <!-- 工具栏：搜索 + 视图切换 -->
        <div class="gd-vision__toolbar">
          <a-input
            v-model:value="vmSearchKey"
            class="gd-vision__search"
            placeholder="搜索模型名称、检测类型、版本号"
            allow-clear
          >
            <template #prefix><i class="i-ant-design-search-outlined" /></template>
          </a-input>
          <div class="gd-vision__view-switch">
            <button
              type="button"
              class="gd-vision__view-btn"
              :class="{ active: vmView === 'card' }"
              title="卡片视图"
              @click="vmView = 'card'"
            ><i class="i-ant-design-appstore-outlined" /></button>
            <button
              type="button"
              class="gd-vision__view-btn"
              :class="{ active: vmView === 'list' }"
              title="列表视图"
              @click="vmView = 'list'"
            ><i class="i-ant-design-unordered-list-outlined" /></button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="!filteredVisionModels.length" class="gd-vision__empty">
          <i class="i-ant-design-inbox-outlined" />
          <p>没有找到匹配的视觉模型</p>
        </div>

        <!-- 卡片视图 -->
        <div v-else-if="vmView === 'card'" class="gd-vision__grid scroll-thin">
          <article
            v-for="m in filteredVisionModels"
            :key="m.id"
            class="gd-vm-card"
            :class="{ 'is-disabled': m.status === 'disabled' }"
          >
            <span class="gd-vm-running gd-vm-card__status" :class="m.status">
              <i class="gd-vm-running__dot" />{{ m.status === 'enabled' ? '运行中' : '已禁用' }}
            </span>
            <!-- 头部：图标 + 名称/类型/版本 -->
            <div class="gd-vm-card__head">
              <span class="gd-vm-card__icon" :style="{ background: detectTypeMeta[m.detectType]?.color }">
                <i :class="detectTypeMeta[m.detectType]?.icon" />
              </span>
              <div class="gd-vm-card__title-wrap">
                <div class="gd-vm-card__name-row">
                  <strong class="gd-vm-card__name">{{ m.name }}</strong>
                </div>
                <span class="gd-vm-card__type">
                  <i :class="detectTypeMeta[m.detectType]?.icon" />{{ m.detectType }}
                </span>
                <span class="gd-vm-card__version">
                  <i class="i-ant-design-code-sandbox-outlined" /><em class="gd-vm-card__version-num">{{ m.version }}</em>
                  <em v-if="m.hasUpdate" class="gd-vm-update-tag">有新版本</em>
                </span>
              </div>
              <a-dropdown :trigger="['click']">
                <button type="button" class="gd-vm-more">
                  <i v-if="m.hasUpdate" class="gd-vm-more__dot" />
                  <i class="i-ant-design-ellipsis-outlined" />
                </button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item :disabled="upgrading.has(m.id)" @click="checkUpgrade(m)">
                      <i :class="upgrading.has(m.id) ? 'i-ant-design-loading-outlined' : 'i-ant-design-cloud-upload-outlined'" />
                      <span :class="{ 'is-update': m.hasUpdate }">{{ m.hasUpdate ? '升级到新版本' : '检查升级' }}</span>
                    </a-menu-item>
                    <a-menu-item @click="openScopeDrawer(m)">
                      <i class="i-ant-design-apartment-outlined" />
                      <span>使用范围</span>
                    </a-menu-item>
                    <a-menu-item @click="openVersionDrawer(m)">
                      <i class="i-ant-design-history-outlined" />
                      <span>历史版本</span>
                    </a-menu-item>
                    <a-menu-item @click="toggleModelStatus(m)">
                      <i :class="m.status === 'enabled' ? 'i-ant-design-stop-outlined' : 'i-ant-design-play-circle-outlined'" />
                      <span>{{ m.status === 'enabled' ? '停用模型' : '启用模型' }}</span>
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </div>

            <!-- 指标 -->
            <div class="gd-vm-card__metrics">
              <div class="gd-vm-metric">
                <i class="i-ant-design-video-camera-outlined" />
                <div>
                  <strong>{{ m.cameraCount }}</strong>
                  <span>覆盖摄像头</span>
                </div>
              </div>
              <div class="gd-vm-metric">
                <i class="i-ant-design-profile-outlined" />
                <div>
                  <strong>{{ m.tasks.length }}</strong>
                  <span>关联任务</span>
                </div>
              </div>
            </div>

          </article>
        </div>

        <!-- 列表视图 -->
        <div v-else class="gd-vision__list-wrap">
          <div class="gd-vm-list">
            <div class="gd-vm-list__head">
              <span class="gd-vm-list__col-name">模型名称</span>
              <span class="gd-vm-list__col-type">检测类型</span>
              <span class="gd-vm-list__col-version">版本</span>
              <span class="gd-vm-list__col-cam">覆盖摄像头</span>
              <span class="gd-vm-list__col-task">关联任务</span>
              <span class="gd-vm-list__col-status">状态</span>
              <span class="gd-vm-list__col-ops">操作</span>
            </div>
            <div class="gd-vm-list__body scroll-thin">
              <div
                v-for="m in filteredVisionModels"
                :key="m.id"
                class="gd-vm-list__row"
                :class="{ 'is-disabled': m.status === 'disabled' }"
              >
                <span class="gd-vm-list__col-name">
                  <i :class="detectTypeMeta[m.detectType]?.icon" :style="{ color: detectTypeMeta[m.detectType]?.color }" />
                  <strong>{{ m.name }}</strong>
                </span>
                <span class="gd-vm-list__col-type">{{ m.detectType }}</span>
                <span class="gd-vm-list__col-version">
                  <i class="i-ant-design-code-sandbox-outlined" /><em class="gd-vm-card__version-num">{{ m.version }}</em>
                  <em v-if="m.hasUpdate" class="gd-vm-update-tag">有新版本</em>
                </span>
                <span class="gd-vm-list__col-cam">{{ m.cameraCount }}</span>
                <span class="gd-vm-list__col-task">{{ m.tasks.length }}</span>
                <span class="gd-vm-list__col-status">
                  <span class="gd-vm-running" :class="m.status">
                    <i class="gd-vm-running__dot" />{{ m.status === 'enabled' ? '运行中' : '已禁用' }}
                  </span>
                </span>
                <span class="gd-vm-list__col-ops">
                  <button type="button" class="gd-vm-list__op" :disabled="upgrading.has(m.id)" @click="checkUpgrade(m)">
                    <i :class="upgrading.has(m.id) ? 'i-ant-design-loading-outlined' : 'i-ant-design-cloud-upload-outlined'" />
                  </button>
                  <button type="button" class="gd-vm-list__op" @click="openScopeDrawer(m)">
                    <i class="i-ant-design-apartment-outlined" />
                  </button>
                  <button type="button" class="gd-vm-list__op" @click="openVersionDrawer(m)">
                    <i class="i-ant-design-history-outlined" />
                  </button>
                  <button type="button" class="gd-vm-list__op" @click="toggleModelStatus(m)">
                    <i :class="m.status === 'enabled' ? 'i-ant-design-stop-outlined' : 'i-ant-design-play-circle-outlined'" />
                  </button>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== 大模型 tab ===== -->
      <section v-else-if="activeTab === 'large-model'" class="gd-lm">
        <div class="gd-lm__scroll scroll-thin">
          <!-- 当前配置的大模型 -->
          <div class="gd-lm__current">
            <div v-if="activeModel" class="gd-lm-current">
              <div class="gd-lm-current__head">
                <span class="gd-lm-current__icon" :style="{ background: activeModel.color }">
                  <i class="i-ant-design-cloud-outlined" />
                </span>
                <div class="gd-lm-current__info">
                  <div class="gd-lm-current__title-row">
                    <strong>{{ activeModel.name }}</strong>
                    <span class="gd-lm-current__tag">当前配置</span>
                  </div>
                  <span class="gd-lm-current__meta">
                    <i class="i-ant-design-code-sandbox-outlined" /><em class="gd-vm-card__version-num">{{ activeModel.version }}</em>
                    <i class="i-ant-design-database-outlined" />{{ activeModel.size }}
                    <i class="i-ant-design-desktop-outlined" />{{ activeModel.provider }}
                  </span>
                </div>
                <button type="button" class="gd-lm-current__remove" @click="removeActiveModel">
                  <i class="i-ant-design-delete-outlined" />移除
                </button>
              </div>
              <p class="gd-lm-current__desc">{{ activeModel.desc }}</p>
              <div class="gd-lm-current__abilities">
                <span v-for="a in activeModel.abilities" :key="a" class="gd-lm-ability">{{ a }}</span>
              </div>
            </div>

            <!-- 未配置时的空状态 -->
            <div v-else class="gd-lm-current-empty">
              <span class="gd-lm-current-empty__icon"><i class="i-ant-design-cloud-outlined" /></span>
              <div>
                <strong>暂未配置大模型</strong>
                <p>从下方云端模型列表中选择一个下载，系统将自动完成配置。每个网关同一时间只能配置一个大模型。</p>
              </div>
            </div>
          </div>

          <!-- 云端大模型列表 -->
          <div class="gd-lm__toolbar">
            <span class="gd-lm__list-title">云端模型</span>
            <a-input
              v-model:value="cloudSearchKey"
              class="gd-lm__search"
              placeholder="搜索模型名称、适配机型、标签"
              allow-clear
              :disabled="!loadedCloudModels.length"
            >
              <template #prefix><i class="i-ant-design-search-outlined" /></template>
            </a-input>
            <button type="button" class="gd-lm__refresh" :disabled="cloudLoading" @click="refreshCloudModels">
              <i :class="cloudLoading ? 'i-ant-design-loading-outlined' : 'i-ant-design-reload-outlined'" /><span>刷新</span>
            </button>
          </div>

          <!-- 加载中 -->
          <div v-if="cloudLoading" class="gd-lm__loading">
            <i class="i-ant-design-loading-outlined" />
            <p>正在获取云端模型列表...</p>
          </div>

          <!-- 空状态（未刷新）-->
          <div v-else-if="!loadedCloudModels.length" class="gd-lm__cloud-empty">
            <i class="i-ant-design-cloud-outlined" />
            <p>暂无云端模型数据</p>
            <span>点击上方「刷新」获取可用的大模型列表</span>
          </div>

          <!-- 搜索无结果 -->
          <div v-else-if="!filteredCloudModels.length" class="gd-lm__cloud-empty">
            <i class="i-ant-design-search-outlined" />
            <p>没有找到匹配「{{ cloudSearchKey }}」的模型</p>
          </div>

          <!-- 模型卡片网格 -->
          <div v-else class="gd-lm__grid">
            <article
              v-for="m in filteredCloudModels"
              :key="m.id"
              class="gd-lm-card"
              :class="{
                'is-active': getModelDownloadState(m.id) === 'active',
                'is-downloading': getModelDownloadState(m.id) === 'downloading'
              }"
            >
              <div class="gd-lm-card__head">
                <span class="gd-lm-card__icon" :style="{ background: m.color }">
                  <i class="i-ant-design-cloud-outlined" />
                </span>
                <div class="gd-lm-card__title-wrap">
                  <strong class="gd-lm-card__name">{{ m.name }}</strong>
                  <span class="gd-lm-card__meta">
                    <i class="i-ant-design-code-sandbox-outlined" /><em class="gd-vm-card__version-num">{{ m.version }}</em>
                    <i class="i-ant-design-database-outlined" /><em>{{ m.size }}</em>
                    <i class="i-ant-design-desktop-outlined" /><em>{{ m.provider }}</em>
                  </span>
                </div>
              </div>
              <p class="gd-lm-card__desc">{{ m.desc }}</p>
              <div class="gd-lm-card__abilities">
                <span v-for="a in m.abilities" :key="a" class="gd-lm-ability">{{ a }}</span>
              </div>

              <!-- 操作区 -->
              <div class="gd-lm-card__footer">
                <!-- 已配置 -->
                <span v-if="getModelDownloadState(m.id) === 'active'" class="gd-lm-card__status is-active">
                  <i class="i-ant-design-check-circle-outlined" />已配置
                </span>
                <!-- 下载中 -->
                <div v-else-if="getModelDownloadState(m.id) === 'downloading'" class="gd-lm-card__downloading">
                  <div class="gd-lm-progress">
                    <div class="gd-lm-progress__bar">
                      <i :style="{ width: downloadProgress + '%' }" />
                    </div>
                    <span>{{ downloadProgress }}%</span>
                  </div>
                  <button type="button" class="gd-lm-card__stop" @click="stopDownload">
                    <i class="i-ant-design-stop-outlined" />停止
                  </button>
                </div>
                <!-- 可下载 -->
                <button
                  v-else
                  type="button"
                  class="gd-lm-card__download"
                  :disabled="!!activeModelId || downloadState === 'downloading'"
                  @click="startDownload(m)"
                >
                  <i class="i-ant-design-download-outlined" />
                  <span>{{ activeModelId ? '已配置其他模型' : '下载配置' }}</span>
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <!-- ===== 其他 tab 占位 ===== -->
      <section v-else class="gd-placeholder">
        <i class="i-ant-design-appstore-outlined gd-placeholder__icon" />
        <p>该模块内容待接入</p>
      </section>
    </main>

    <!-- ===== 使用范围抽屉 ===== -->
    <a-drawer
      :open="scopeDrawerVisible"
      title="使用范围"
      placement="right"
      :width="560"
      :body-style="{ padding: 0 }"
      @close="scopeDrawerVisible = false"
    >
      <div v-if="scopeModel" class="gd-scope">
        <div class="gd-scope__head">
          <span class="gd-vm-card__icon gd-scope__icon" :style="{ background: detectTypeMeta[scopeModel.detectType]?.color }">
            <i :class="detectTypeMeta[scopeModel.detectType]?.icon" />
          </span>
          <div>
            <strong>{{ scopeModel.name }}</strong>
            <span>{{ scopeModel.detectType }} · {{ scopeModel.version }}</span>
          </div>
        </div>

        <div class="gd-scope__section">
          <div class="gd-scope__title">
            <i class="i-ant-design-video-camera-outlined" />关联摄像头
            <em>{{ scopeModel.cameras.length }} 个</em>
          </div>
          <div class="gd-scope__table">
            <div class="gd-scope__thead">
              <span>设备名称</span>
              <span>设备 ID</span>
              <span>状态</span>
            </div>
            <div class="gd-scope__tbody scroll-thin">
              <div v-for="c in scopeModel.cameras" :key="c.deviceId" class="gd-scope__row">
                <span class="gd-scope__row-name">{{ c.name }}</span>
                <span class="gd-scope__row-id">{{ c.deviceId }}</span>
                <em class="gd-scope__row-status" :class="c.status">{{ c.status === 'online' ? '在线' : '离线' }}</em>
              </div>
            </div>
          </div>
        </div>

        <div class="gd-scope__section">
          <div class="gd-scope__title">
            <i class="i-ant-design-profile-outlined" />关联任务
            <em>{{ scopeModel.tasks.length }} 个</em>
          </div>
          <div class="gd-scope__table">
            <div class="gd-scope__thead">
              <span>任务名称</span>
              <span>任务 ID</span>
              <span>任务场景</span>
            </div>
            <div class="gd-scope__tbody">
              <div v-for="t in scopeModel.tasks" :key="t.taskId" class="gd-scope__row">
                <span class="gd-scope__row-name">{{ t.name }}</span>
                <span class="gd-scope__row-id">{{ t.taskId }}</span>
                <span class="gd-scope__row-scene">{{ t.scene }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-drawer>

    <!-- ===== 历史版本抽屉 ===== -->
    <a-drawer
      :open="versionDrawerVisible"
      title="历史版本"
      placement="right"
      :width="560"
      :body-style="{ padding: 0 }"
      @close="versionDrawerVisible = false"
    >
      <div v-if="versionModel" class="gd-version">
        <div class="gd-scope__head">
          <span class="gd-vm-card__icon gd-scope__icon" :style="{ background: detectTypeMeta[versionModel.detectType]?.color }">
            <i :class="detectTypeMeta[versionModel.detectType]?.icon" />
          </span>
          <div>
            <strong>{{ versionModel.name }}</strong>
            <span>当前版本 {{ versionModel.version }}</span>
          </div>
        </div>

        <div class="gd-version__section">
          <div class="gd-version__title">
            <i class="i-ant-design-history-outlined" />版本记录
            <em>{{ versionModel.versions.length }} 个版本</em>
          </div>
          <div class="gd-version__timeline">
            <div
              v-for="(v, idx) in versionModel.versions"
              :key="idx"
              class="gd-version__item"
              :class="{ 'is-current': idx === 0 }"
            >
              <div class="gd-version__dot" />
              <div class="gd-version__item-body">
                <div class="gd-version__item-head">
                  <strong>{{ v.version }}</strong>
                  <em v-if="idx === 0" class="gd-version__current-tag">当前</em>
                  <span class="gd-version__size">{{ v.size }}</span>
                </div>
                <p class="gd-version__change">{{ v.change }}</p>
                <span class="gd-version__time">{{ v.time }}</span>
                <div class="gd-version__ops">
                  <button type="button" :disabled="idx === 0">回滚到此版本</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-drawer>

    <!-- 新建目录弹窗 -->
    <a-modal v-model:open="newDirModalVisible" title="新建目录" :width="420" :footer="null" centered>
      <div class="gd-newdir">
        <label class="gd-newdir__field">
          <span>目录名称</span>
          <input v-model="newDirName" placeholder="请输入目录名称" @keydown.enter="confirmNewDir" />
        </label>
        <div class="gd-newdir__btns">
          <button type="button" class="gd-bind__cancel" @click="newDirModalVisible = false">取消</button>
          <button type="button" class="gd-bind__confirm" @click="confirmNewDir">确认创建</button>
        </div>
      </div>
    </a-modal>

    <!-- ===== 绑定子设备抽屉（右侧 640px）===== -->
    <a-drawer
      :open="bindDrawerVisible"
      title="绑定子设备"
      placement="right"
      :width="640"
      :body-style="{ padding: 0 }"
      @close="bindDrawerVisible = false"
    >
      <div class="gd-bind">
        <div class="gd-bind__top">
          <a-input
            v-model:value="bindSearchKey"
            class="gd-bind__search"
            placeholder="搜索设备名称、设备库、型号"
            allow-clear
          >
            <template #prefix><i class="i-ant-design-search-outlined" /></template>
          </a-input>

          <div class="gd-bind__bar">
            <button class="gd-check gd-check--sm" :class="{ checked: bindAllSelected }" @click="toggleBindSelectAll">
              <i v-if="bindAllSelected" class="i-ant-design-check-outlined" />
            </button>
            <span>全选</span>
            <em>共 {{ unboundDevices.length }} 台未绑定</em>
          </div>
        </div>

        <div class="gd-bind__list scroll-thin">
          <div v-if="!unboundDevices.length" class="gd-bind__empty">
            <i class="i-ant-design-check-circle-outlined" />
            <p>所有子设备均已绑定</p>
          </div>
          <label
            v-for="dev in unboundDevices"
            :key="dev.id"
            class="gd-bind__item"
            :class="{ checked: bindSelectedIds.has(dev.id) }"
          >
            <button type="button" class="gd-check gd-check--sm" :class="{ checked: bindSelectedIds.has(dev.id) }" @click.prevent="toggleBindSelect(dev.id)">
              <i v-if="bindSelectedIds.has(dev.id)" class="i-ant-design-check-outlined" />
            </button>
            <div class="gd-bind__item-main">
              <strong>{{ dev.name }}</strong>
              <div class="gd-bind__item-tags">
                <span class="gd-sub-type" :style="{ color: deviceTypeMeta[dev.deviceType]?.color, background: deviceTypeMeta[dev.deviceType]?.color + '14' }">
                  <i :class="deviceTypeMeta[dev.deviceType]?.icon" />{{ dev.deviceType }}
                </span>
                <span class="gd-bind__model">{{ dev.model }}</span>
              </div>
            </div>
            <span class="gd-sub-status" :class="dev.status">
              <i class="gd-sub-status__dot" />{{ dev.status === 'online' ? '在线' : '离线' }}
            </span>
          </label>
        </div>

        <div class="gd-bind__footer">
          <span v-if="bindSelectedIds.size" class="gd-bind__count">已选 {{ bindSelectedIds.size }} 台</span>
          <div class="gd-bind__btns">
            <button class="gd-bind__cancel" type="button" @click="bindDrawerVisible = false">取消</button>
            <button class="gd-bind__confirm" type="button" :disabled="!bindSelectedIds.size" @click="confirmBind">确认绑定</button>
          </div>
        </div>
      </div>
    </a-drawer>

    <!-- ===== 消息详情抽屉（右侧滑出）===== -->
    <a-drawer
      :open="msgDrawerVisible"
      title="消息详情"
      placement="right"
      :width="640"
      :body-style="{ padding: 0 }"
      @close="closeMessageDetail"
    >
      <div v-if="activeMessage" class="gd-msg-detail">
        <!-- 时间 -->
        <div class="gd-msg-detail__section">
          <div class="gd-msg-detail__label">时间</div>
          <div class="gd-msg-detail__time">{{ activeMessage.time }}</div>
        </div>

        <!-- 消息头 -->
        <div class="gd-msg-detail__section">
          <div class="gd-msg-detail__label">消息头</div>
          <div class="gd-msg-detail__headers">
            <div
              v-for="h in activeMessage.headers"
              :key="h.key"
              class="gd-msg-detail__header-row"
            >
              <span class="gd-msg-detail__header-key">{{ h.key }}</span>
              <span class="gd-msg-detail__header-val">{{ h.value }}</span>
            </div>
          </div>
        </div>

        <!-- 原始 Payload -->
        <div class="gd-msg-detail__section">
          <div class="gd-msg-detail__label">
            原始 Payload
            <button class="gd-msg-detail__copy" type="button" @click="copyPayload">
              <i class="i-ant-design-copy-outlined" />复制
            </button>
          </div>
          <pre class="gd-msg-detail__payload"><code>{{ activePayloadText }}</code></pre>
        </div>
      </div>
    </a-drawer>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.gd-page {
  height: 100%;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  background: $bg-page;
}

.gd-hero {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  background: #fff;
  border-radius: 14px;
  padding: 42px 20px 16px;
  flex-shrink: 0;
}

.gd-hero__back {
  position: absolute;
  top: 12px;
  left: 16px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: $text-secondary;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.15s;

  i {
    font-size: 14px;
  }

  &:hover {
    color: $color-primary;
  }
}

.gd-hero__main {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

.gd-hero__icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 48px;
    height: 38px;
    object-fit: contain;
  }
}

.gd-hero__info {
  min-width: 0;
}

.gd-hero__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: $text-base;
  }
}

.gd-hero__status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;

  &.online {
    color: $color-online;
    background: $color-online-bg;
  }

  &.offline {
    color: $text-tertiary;
    background: rgba(154, 161, 171, 0.12);
  }
}

.gd-hero__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.gd-hero__tag {
  font-size: 11px;
  color: $text-muted;
  font-family: 'Courier New', monospace;
  background: $bg-page;
  padding: 2px 8px;
  border-radius: 4px;
}

.gd-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 14px;
  font-size: 12px;
  color: $text-secondary;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  i {
    font-size: 13px;
    color: $text-muted;
    flex-shrink: 0;
  }
}

.gd-hero__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.gd-config-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;

  i {
    font-size: 14px;
  }
}

.gd-config-btn {
  border: 1px solid $color-primary;
  background: $color-primary;
  color: #fff;

  &:hover {
    background: $color-primary-hover;
  }

  &.is-guide-target {
    position: relative;
    z-index: 1999;
  }
}

.gd-tabs {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  border-bottom: 1px solid $border-color-card;
  background: #fff;
  border-radius: 12px 12px 0 0;
  padding: 0 8px;

  button {
    border: none;
    background: transparent;
    padding: 10px 16px;
    font-size: 14px;
    color: $text-secondary;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    font-family: inherit;
    transition: all 0.15s;

    &.active {
      color: $color-primary;
      border-bottom-color: $color-primary;
      font-weight: 500;
    }
  }
}

.gd-content {
  flex: 1;
  display: flex;
  min-height: 0;
}

.gd-status {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

/* ===== 顶部指标行（图标+文案，参考视联中心 KPI 卡）===== */
.gd-top-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  flex-shrink: 0;
}

.gd-top-metric {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gd-top-metric__head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.gd-top-metric__icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;

  i {
    font-size: 24px;
  }
}

.gd-top-metric__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.gd-top-metric__value {
  font-size: 26px;
  font-weight: 650;
  color: $text-base;
  line-height: 1.1;
  display: flex;
  align-items: baseline;
  gap: 3px;
  position: relative;

  small {
    font-size: 13px;
    font-weight: 400;
    color: $text-muted;
  }
}

.gd-top-metric__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  margin-left: 4px;
  padding: 0 5px;
  border-radius: 999px;
  background: #fa8c16;
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  font-style: normal;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(250, 140, 22, 0.3);
}

.gd-top-metric__label {
  font-size: 13px;
  color: $text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gd-runtime {
  display: grid;
  grid-template-columns: minmax(420px, 1fr) minmax(420px, 1fr);
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.gd-metrics-panel,
.gd-chart-panel,
.gd-capacity-panel,
.gd-device-panel {
  background: #fff;
  border-radius: 12px;
  min-width: 0;
  min-height: 0;
}

.gd-metrics-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gd-section-head,
.gd-chart-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  strong {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
  }

  span {
    font-size: 12px;
    color: $text-muted;
  }
}

/* ===== 左侧滚动区 + 分组 ===== */
.gd-metrics-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 0 8px;
}

.gd-metric-group {
  padding: 8px 10px 4px;

  &.is-vision {
    padding-top: 6px;
  }
}

.gd-metric-group__title {
  font-size: 11px;
  font-weight: 600;
  color: $text-muted;
  letter-spacing: 0.5px;
  padding: 4px 4px 8px;
  text-transform: uppercase;
}

/* ===== 指标卡片网格 ===== */
.gd-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.gd-metric {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;

  &:hover,
  &.active {
    border-color: rgba(110, 75, 255, 0.36);
    background: #faf9ff;
  }

  &.active {
    box-shadow: 0 2px 8px rgba(110, 75, 255, 0.08);
  }

  &.is-static {
    cursor: default;

    &:hover {
      border-color: $border-color-card;
      background: #fff;
    }
  }

  strong {
    font-size: 22px;
    line-height: 1.1;
    color: $text-base;
    font-weight: 700;

    small {
      margin-left: 2px;
      font-size: 12px;
      color: $text-muted;
      font-weight: 400;
    }
  }
}

.gd-metric__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.gd-metric__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: $text-secondary;
}

.gd-metric__trend-icon {
  flex-shrink: 0;
  font-size: 14px;
  color: $color-primary;
  opacity: 0.5;
}

/* 读写速率双数值 */
.gd-metric__dual {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;

  div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  em {
    font-style: normal;
    font-size: 10px;
    color: $text-muted;
  }

  strong {
    font-size: 18px;
  }
}

/* 容量型：已用/总量 */
.gd-metric__capacity {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px;

  strong {
    font-size: 18px;
  }

  small {
    font-size: 11px;
  }
}

.gd-metric__capacity-pct {
  font-size: 12px;
  color: $text-muted;
  font-weight: 500;
}

.gd-metric__bar {
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: $border-color-card;

  i {
    display: block;
    height: 100%;
    border-radius: 999px;
    transition: width 0.3s ease;
  }
}

/* ===== 右侧面板通用 ===== */
.gd-chart-panel,
.gd-capacity-panel,
.gd-device-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gd-range {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  gap: 4px !important;
  flex-shrink: 0;

  button {
    height: 28px;
    padding: 0 9px;
    border: 1px solid $border-color-card;
    border-radius: 6px;
    background: #fff;
    color: $text-secondary;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;

    &.active,
    &:hover {
      border-color: $color-primary;
      background: $color-primary-bg;
      color: $color-primary;
    }
  }
}

.gd-custom-range {
  width: calc(100% - 32px);
  margin: 12px 16px 0;
}

/* ===== 趋势视图：当前值/趋势/说明 ===== */
.gd-active-metric {
  display: grid;
  grid-template-columns: 1fr 1fr 1.25fr;
  gap: 8px;
  padding: 10px 16px 0;

  div {
    min-width: 0;
    min-height: 76px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid $border-color-card;
    border-radius: 10px;
    background: #fafbfc;
  }

  span {
    font-size: 12px;
    color: $text-muted;
  }

  strong {
    font-size: 24px;
    line-height: 1.1;
    color: $text-base;
    font-weight: 700;

    small {
      margin-left: 2px;
      font-size: 12px;
      font-weight: 400;
      color: $text-muted;
    }

    &.is-up {
      color: #ff4d4f;
    }

    &.is-down {
      color: $color-online;
    }
  }

  em {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-style: normal;
    font-size: 14px;
    color: $text-secondary;
  }
}

.gd-chart-panel__chart {
  flex: 1;
  min-height: 260px;
  padding: 8px 12px 0;
}

.gd-stat-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 10px 16px 16px;

  div {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid $border-color-card;
  }

  span {
    font-size: 12px;
    color: $text-tertiary;
  }

  strong {
    font-size: 16px;
    color: $text-base;
    font-weight: 650;

    small {
      margin-left: 2px;
      font-size: 11px;
      font-weight: 400;
      color: $text-muted;
    }
  }
}

/* 容量详情视图、设备统计视图样式已移除（右侧统一为趋势图）*/

/* ===== 子设备 tab ===== */
.gd-sub-device {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.gd-sub-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  flex-shrink: 0;
}

.gd-sub-stats__info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: $text-secondary;
}

.gd-sub-stats__item strong {
  font-size: 18px;
  font-weight: 700;
  color: $color-primary;
  margin: 0 2px;

  .is-unbound & {
    color: #fa8c16;
  }
}

.gd-sub-stats__divider {
  color: $text-muted;
}

.gd-sub-bind-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 14px;
  border: 1px solid $color-primary;
  border-radius: 6px;
  background: $color-primary;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;

  i { font-size: 14px; }

  &:hover { background: $color-primary-hover; }

  &:disabled {
    background: #eef1f6;
    border-color: #eef1f6;
    color: $text-muted;
    cursor: not-allowed;
  }
}

.gd-sub-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  flex-shrink: 0;
}

.gd-sub-search {
  width: 320px;
  flex-shrink: 0;

  :deep(.ant-input-affix-wrapper) {
    border-radius: 6px;
  }
}

/* ===== 子设备表格 ===== */
.gd-sub-table {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
}

.gd-sub-table__head {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 16px;
  height: 42px;
  background: #fafbfc;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  .gd-sub-col {
    font-size: 13px;
    font-weight: 600;
    color: $text-secondary;
  }
}

.gd-sub-table__body {
  flex: 1;
  overflow-y: auto;
}

.gd-sub-col {
  padding: 0 8px;
  flex-shrink: 0;

  &--name { flex: 1.4; min-width: 0; }
  &--type { flex: 1; min-width: 0; }
  &--model { flex: 1; min-width: 0; color: $text-secondary; }
  &--status { flex: 0.8; min-width: 0; }
}

.gd-sub-row {
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 52px;
  border-bottom: 1px solid $border-color-card;
  transition: background 0.15s;

  &:last-child { border-bottom: none; }
  &:hover { background: #faf9ff; }

  .gd-sub-col {
    font-size: 13px;
    color: $text-base;
  }
}

.gd-sub-name {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 设备库标签 */
.gd-sub-type {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;

  i { font-size: 13px; }
}

/* 在线状态 */
.gd-sub-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;

  &.online { color: $color-online; }
  &.offline { color: $text-tertiary; }
}

.gd-sub-status__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;

  .online & {
    box-shadow: 0 0 0 3px rgba(43, 179, 163, 0.12);
  }
}

/* 复选框 */
.gd-check {
  width: 16px;
  height: 16px;
  border: 1px solid #dbe4f1;
  border-radius: 3px;
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
  transition: all 0.15s;

  i {
    font-size: 11px;
    color: #fff;
  }

  &.checked {
    background: $color-primary;
    border-color: $color-primary;
  }

  &--sm { width: 14px; height: 14px; border-radius: 3px; }
}

/* ===== 子设备卡片视图 ===== */
.gd-sub-card-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gd-sub-card-grid {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  align-content: start;
  padding-bottom: 4px;
}

.gd-sub-card {
  position: relative;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  padding: 34px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: box-shadow 0.15s, border-color 0.15s;

  &:hover { box-shadow: 0 2px 8px rgba(110, 75, 255, 0.08); }

  &.is-offline { opacity: 0.7; }
}

.gd-sub-card__status {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(43, 179, 163, 0.1);
  line-height: 1.4;

  &.offline {
    background: #f4f6fa;
  }
}

.gd-sub-card__head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.gd-sub-card__icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;

  i { font-size: 17px; }
}

.gd-sub-card__title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gd-sub-card__name-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  min-width: 0;
}

.gd-sub-card__name {
  font-size: 13px;
  font-weight: 600;
  color: $text-base;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 设备库品类 / 型号：统一 12px + 图标（和视觉模型卡片一致）*/
.gd-sub-card__type {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $text-muted;

  i { font-size: 12px; }
}

.gd-sub-card__model {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $text-muted;

  i { font-size: 12px; }

  em { font-style: normal; font-family: 'Courier New', monospace; color: $text-secondary; }
}

/* 空状态 */
.gd-sub-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 0;
  color: $text-muted;

  i { font-size: 40px; opacity: 0.4; }
  p { margin: 0; font-size: 13px; }
}

/* 分页底栏 */
.gd-sub-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-top: 1px solid $border-color-card;
  flex-shrink: 0;

  :deep(.ant-pagination) {
    margin-left: auto;
  }
}

.gd-sub-selected {
  font-size: 12px;
  color: $color-primary;
  background: $color-primary-bg;
  padding: 2px 8px;
  border-radius: 4px;
}

/* ===== 绑定子设备弹窗 ===== */
.gd-bind {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;

  &__top {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid $border-color-card;
  }

  &__desc {
    margin: 0;
    font-size: 13px;
    color: $text-secondary;
    line-height: 1.6;
  }

  &__search {
    :deep(.ant-input-affix-wrapper) { border-radius: 6px; }
  }

  &__bar {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: $text-secondary;

    em {
      margin-left: auto;
      font-style: normal;
      font-size: 12px;
      color: $text-muted;
    }
  }

  &__list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 12px;
    background: #fafbfc;
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 60px 0;
    color: $color-online;

    i { font-size: 36px; }
    p { margin: 0; font-size: 13px; color: $text-muted; }
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 14px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    transition: all 0.15s;

    &:hover { border-color: rgba(110, 75, 255, 0.24); }

    &.checked {
      border-color: $color-primary;
      background: #faf9ff;
    }
  }

  &__item-main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;

    strong {
      font-size: 13px;
      font-weight: 500;
      color: $text-base;
    }
  }

  &__item-tags {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__model {
    font-size: 11px;
    color: $text-muted;
    font-family: 'Courier New', monospace;
  }

  &__footer {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 20px;
    border-top: 1px solid $border-color-card;
    background: #fff;
  }

  &__count {
    font-size: 13px;
    color: $color-primary;
    font-weight: 500;
  }

  &__btns {
    display: flex;
    gap: 8px;
    margin-left: auto;
  }

  &__cancel {
    height: 32px;
    padding: 0 16px;
    border: 1px solid $border-color-card;
    border-radius: 6px;
    background: #fff;
    color: $text-secondary;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;

    &:hover { border-color: $color-primary; color: $color-primary; }
  }

  &__confirm {
    height: 32px;
    padding: 0 16px;
    border: 1px solid $color-primary;
    border-radius: 6px;
    background: $color-primary;
    color: #fff;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s;

    &:hover { background: $color-primary-hover; }
    &:disabled {
      background: #eef1f6;
      border-color: #eef1f6;
      color: $text-muted;
      cursor: not-allowed;
    }
  }
}

/* ===== 消息日志 tab ===== */
.gd-msglog {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.gd-msglog__toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  flex-shrink: 0;
}

.gd-msglog__search {
  width: 300px;
  flex-shrink: 0;

  :deep(.ant-input-affix-wrapper) { border-radius: 6px; }
}

.gd-msglog__range {
  flex-shrink: 0;
}

.gd-msglog__count {
  margin-left: auto;
  font-size: 12px;
  color: $text-muted;
}

.gd-msglog__list {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
}

.gd-msglog__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 80px 0;
  color: $text-muted;

  i { font-size: 40px; opacity: 0.4; }
  p { margin: 0; font-size: 13px; }
}

/* 表头（与子设备列表一致：42px / 13px / 600）*/
.gd-msglog__head {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 16px;
  height: 42px;
  background: #fafbfc;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  span {
    padding: 0 8px;
    font-size: 13px;
    font-weight: 600;
    color: $text-secondary;
  }
}

.gd-msglog__head-type { width: 120px; flex-shrink: 0; }
.gd-msglog__head-content { flex: 1; min-width: 0; }
.gd-msglog__head-time { width: 180px; flex-shrink: 0; }
.gd-msglog__head-action { width: 16px; flex-shrink: 0; }

/* 表体滚动区 */
.gd-msglog__body {
  flex: 1;
  overflow-y: auto;
}

/* 表行（与子设备列表一致：52px / 13px / hover #faf9ff）*/
.gd-msglog__item {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 0 16px;
  height: 52px;
  border-bottom: 1px solid $border-color-card;
  cursor: pointer;
  transition: background 0.15s;

  &:last-child { border-bottom: none; }
  &:hover { background: #faf9ff; }
  &.active { background: #f5f1ff; }
}

/* 消息类型：标签样式（与子设备「设备库」标签风格统一）*/
.gd-msglog__type {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  color: $color-primary;
  background: $color-primary-bg;
}

.gd-msglog__content {
  flex: 1;
  min-width: 0;
  padding: 0 8px;
  font-size: 13px;
  color: $text-base;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gd-msglog__time {
  width: 180px;
  flex-shrink: 0;
  padding: 0 8px;
  font-size: 13px;
  color: $text-muted;
  font-family: 'Courier New', monospace;
}

.gd-msglog__arrow {
  width: 16px;
  flex-shrink: 0;
  font-size: 12px;
  color: $text-muted;
}

.gd-msglog__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 8px 16px;
  background: #fff;
  border: 1px solid $border-color-card;
  border-top: none;
  border-radius: 0 0 12px 12px;
  flex-shrink: 0;
}

/* ===== 消息详情抽屉 ===== */
.gd-msg-detail {
  display: flex;
  flex-direction: column;
}

.gd-msg-detail__section {
  padding: 16px 20px;
  border-bottom: 1px solid $border-color-card;

  &:last-child { border-bottom: none; }
}

.gd-msg-detail__label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: $text-secondary;
  margin-bottom: 10px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.gd-msg-detail__time {
  font-size: 15px;
  color: $text-base;
  font-weight: 500;
  font-family: 'Courier New', monospace;
}

.gd-msg-detail__copy {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid $border-color-card;
  border-radius: 4px;
  background: #fff;
  color: $text-secondary;
  font-size: 11px;
  font-family: inherit;
  text-transform: none;
  letter-spacing: 0;
  cursor: pointer;
  transition: all 0.15s;

  i { font-size: 12px; }

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
  }
}

.gd-msg-detail__headers {
  display: flex;
  flex-direction: column;
  gap: 0;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  overflow: hidden;
}

.gd-msg-detail__header-row {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid $border-color-card;

  &:last-child { border-bottom: none; }
}

.gd-msg-detail__header-key {
  flex-shrink: 0;
  width: 120px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: $text-secondary;
  background: #fafbfc;
  border-right: 1px solid $border-color-card;
}

.gd-msg-detail__header-val {
  flex: 1;
  min-width: 0;
  padding: 8px 12px;
  font-size: 12px;
  color: $text-base;
  font-family: 'Courier New', monospace;
  word-break: break-all;
}

.gd-msg-detail__payload {
  margin: 0;
  padding: 14px 16px;
  background: #1e1f24;
  border-radius: 8px;
  overflow-x: auto;
  max-height: 420px;

  code {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.7;
    color: #e6e6e6;
    white-space: pre;
  }
}

/* ===== 远程调试 tab ===== */
.gd-debug {
  flex: 1;
  display: flex;
  gap: 8px;
  min-height: 0;
}

.gd-debug__menu {
  width: 180px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gd-debug__menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;

  > i:first-child {
    font-size: 18px;
    color: $text-tertiary;
    flex-shrink: 0;
  }

  &:hover {
    background: $bg-hover;
  }

  &.active {
    background: $color-primary-bg;

    > i:first-child,
    strong { color: $color-primary; }
  }
}

.gd-debug__menu-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;

  strong {
    font-size: 13px;
    font-weight: 500;
    color: $text-base;
  }

  span {
    font-size: 11px;
    color: $text-muted;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.gd-debug__main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* ===== 功能 1：远程终端 ===== */
.gd-term {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.gd-term__tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid $border-color-card;
  background: #fafbfc;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.gd-term__tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 8px 0 10px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: $text-secondary;
  cursor: pointer;
  transition: all 0.15s;

  i { font-size: 12px; }

  &.active {
    border-color: $color-primary;
    background: $color-primary-bg;
    color: $color-primary;
  }
}

.gd-term__tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: $text-muted;
  cursor: pointer;

  i { font-size: 9px; }

  &:hover { background: rgba(0,0,0,0.08); color: $text-base; }
}

.gd-term__add {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px dashed $border-color-light;
  border-radius: 6px;
  background: transparent;
  color: $text-muted;
  cursor: pointer;

  &:hover { border-color: $color-primary; color: $color-primary; }
}

.gd-term__output {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px;
  background: #1e1f24;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.7;
}

.gd-term__line {
  color: #d4d4d4;
  white-space: pre-wrap;
  word-break: break-all;

  &.input { color: #6e4bff; }
  &.error { color: #ff6b6b; }
}

.gd-term__input-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #1e1f24;
  border-top: 1px solid rgba(255,255,255,0.08);
  flex-shrink: 0;
}

.gd-term__prompt {
  color: #52c41a;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;
  flex-shrink: 0;
}

.gd-term__input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  color: #d4d4d4;
  font-family: 'Consolas', 'Courier New', monospace;
  font-size: 12px;

  &::placeholder { color: rgba(255,255,255,0.3); }
}

/* ===== 功能 2：Web 访问 ===== */
.gd-web {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.gd-web__tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid $border-color-card;
  background: #fafbfc;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.gd-web__tab {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 8px 0 10px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: $text-secondary;
  max-width: 220px;
  cursor: pointer;
  transition: all 0.15s;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  i { font-size: 12px; flex-shrink: 0; }

  &.active {
    border-color: $color-primary;
    background: $color-primary-bg;
    color: $color-primary;
  }
}

.gd-web__addr {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.gd-web__addr-input {
  flex: 1;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #ebedf0;
  border-radius: 6px;
  font-size: 13px;
  font-family: 'Courier New', monospace;
  outline: none;

  &:focus { border-color: $color-primary; }
}

.gd-web__addr-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 14px;
  border: 1px solid $color-primary;
  border-radius: 6px;
  background: $color-primary;
  color: #fff;
  font-size: 13px;
  cursor: pointer;

  &:hover { background: $color-primary-hover; }
}

.gd-web__preview {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 16px;
}

.gd-web__loading,
.gd-web__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 100%;
  color: $text-muted;

  i { font-size: 40px; }
  p { margin: 0; font-size: 14px; color: $text-secondary; }
  span { font-size: 12px; }
}

.gd-web__loading i { animation: spin 1s linear infinite; }

@keyframes spin { to { transform: rotate(360deg); } }

.gd-web__loaded-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(43, 179, 163, 0.08);
  color: $color-online;
  font-size: 12px;
  margin-bottom: 12px;

  em { margin-left: auto; font-style: normal; color: $text-muted; }
}

.gd-web__screenshot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 320px;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  background: linear-gradient(135deg, #f6f8fc 0%, #eef2f9 100%);
  color: $text-muted;

  i { font-size: 48px; color: $color-primary; opacity: 0.5; }
  p { margin: 0; font-size: 14px; color: $text-secondary; }
  span { font-size: 12px; max-width: 320px; text-align: center; }
}

/* ===== 功能 3：远程桌面 ===== */
.gd-rdp {
  flex: 1;
  display: flex;
  gap: 12px;
  padding: 12px;
  min-height: 0;
}

.gd-rdp__config {
  width: 260px;
  flex-shrink: 0;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gd-rdp__title {
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
  padding-bottom: 8px;
  border-bottom: 1px solid $border-color-card;
}

.gd-rdp__field {
  display: flex;
  flex-direction: column;
  gap: 5px;

  span { font-size: 12px; color: $text-secondary; }

  input {
    height: 32px;
    padding: 0 12px;
    border: 1px solid #ebedf0;
    border-radius: 6px;
    font-size: 13px;
    font-family: 'Courier New', monospace;
    outline: none;

    &:focus { border-color: $color-primary; }
  }
}

.gd-rdp__status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: $text-secondary;
}

.gd-rdp__status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d9d9d9;

  &.connecting { background: #faad14; animation: pulse 1s ease-in-out infinite; }
  &.connected { background: $color-online; box-shadow: 0 0 0 3px rgba(43,179,163,0.15); }
}

@keyframes pulse { 50% { opacity: 0.4; } }

.gd-rdp__connect,
.gd-rdp__disconnect {
  height: 34px;
  border: 1px solid $color-primary;
  border-radius: 6px;
  background: $color-primary;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  margin-top: auto;

  &:hover:not(:disabled) { background: $color-primary-hover; }
  &:disabled { background: #eef1f6; border-color: #eef1f6; color: $text-muted; cursor: not-allowed; }
}

.gd-rdp__disconnect {
  border-color: #ff4d4f;
  background: #fff;
  color: #ff4d4f;

  &:hover { background: #fff5f5; }
}

.gd-rdp__preview {
  flex: 1;
  min-width: 0;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
}

.gd-rdp__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 100%;
  color: $text-muted;

  i { font-size: 48px; }
  & .i-ant-design-loading-outlined { animation: spin 1s linear infinite; }
  p { margin: 0; font-size: 14px; color: $text-secondary; }
  span { font-size: 12px; }
}

.gd-rdp__connected-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid $border-color-card;
  font-size: 12px;

  strong { color: $color-online; font-size: 13px; }
  em { margin-left: auto; font-style: normal; color: $text-muted; }
}

.gd-rdp__screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 360px;
  background: #1e1f24;
  color: rgba(255,255,255,0.6);

  i { font-size: 56px; color: rgba(255,255,255,0.4); }
  p { margin: 0; font-size: 14px; color: rgba(255,255,255,0.8); }
  span { font-size: 12px; }
}

/* ===== 功能 4：文件管理 ===== */
.gd-file {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.gd-file__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.gd-file__toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex: 1;
}

.gd-file__search {
  width: 200px;
  flex-shrink: 0;

  :deep(.ant-input-affix-wrapper) { border-radius: 6px; }
}

.gd-file__breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex-wrap: wrap;
}

.gd-file__crumb {
  font-size: 13px;
  color: $text-secondary;
  cursor: pointer;

  &:hover { color: $color-primary; }
  &.active { color: $text-base; font-weight: 500; cursor: default; }
}

.gd-file__sep {
  font-size: 11px;
  color: $text-muted;
}

.gd-file__actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.gd-file__btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  font-size: 12px;
  cursor: pointer;

  i { font-size: 13px; }

  &:hover:not(:disabled) { border-color: $color-primary; color: $color-primary; }
  &:disabled { color: $text-muted; cursor: not-allowed; }
}

.gd-file__table {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gd-file__head {
  display: flex;
  align-items: center;
  padding: 0 14px;
  height: 38px;
  background: #fafbfc;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  span {
    font-size: 12px;
    font-weight: 600;
    color: $text-secondary;
  }
}

.gd-file__body {
  flex: 1;
  overflow-y: auto;
}

.gd-file__row {
  display: flex;
  align-items: center;
  padding: 0 14px;
  height: 44px;
  border-bottom: 1px solid $border-color-card;
  font-size: 13px;
  color: $text-base;
  transition: background 0.15s;

  &:last-child { border-bottom: none; }
  &:hover { background: #faf9ff; }

  &.is-dir { cursor: pointer; }
  &.is-dir .gd-file__name { font-weight: 500; }
}

.gd-file__col-name {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  i { font-size: 15px; flex-shrink: 0; }
}

.gd-file__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gd-file__col-size {
  width: 120px;
  flex-shrink: 0;
  color: $text-muted;
  font-family: 'Courier New', monospace;
}

.gd-file__col-time {
  width: 180px;
  flex-shrink: 0;
  color: $text-muted;
  font-family: 'Courier New', monospace;
}

.gd-file__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 60px 0;
  color: $text-muted;

  i { font-size: 40px; opacity: 0.4; }
  p { margin: 0; font-size: 13px; }
}

.gd-file__tip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-top: 1px solid $border-color-card;
  font-size: 12px;
  color: $text-muted;
  background: #fafbfc;
  flex-shrink: 0;

  i { font-size: 13px; color: $color-primary; }
}

/* ===== 功能 5：网络调试 ===== */
.gd-net {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  padding: 12px;
}

.gd-net__notice {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 8px;
  background: #f0f5ff;
  border: 1px solid #d6e4ff;
  font-size: 12px;
  color: $text-secondary;
  flex-shrink: 0;
}

.gd-net__status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: rgba(154,161,171,0.14);
  color: $text-tertiary;

  &.running {
    background: rgba(43,179,163,0.1);
    color: $color-online;
  }
}

.gd-net__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;

  .running & { animation: pulse 1s ease-in-out infinite; }
}

.gd-net__body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
}

.gd-net__config {
  width: 230px;
  flex-shrink: 0;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gd-net__config-title {
  font-size: 13px;
  font-weight: 600;
  color: $text-base;
  padding-bottom: 8px;
  border-bottom: 1px solid $border-color-card;
}

.gd-net__field {
  display: flex;
  flex-direction: column;
  gap: 5px;

  span { font-size: 12px; color: $text-secondary; }
}

.gd-net__switch-row {
  display: flex;
  align-items: center;
  gap: 8px;

  span { font-size: 12px; color: $text-secondary; flex: 1; }

  em {
    font-style: normal;
    font-size: 11px;
    color: $text-muted;
    min-width: 28px;
  }

  .gd-vm-switch:disabled { opacity: 0.5; cursor: not-allowed; }
}

.gd-net__start {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 34px;
  border: 1px solid $color-online;
  border-radius: 6px;
  background: $color-online;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  margin-top: auto;

  &:hover { opacity: 0.9; }

  &.is-running {
    border-color: #ff4d4f;
    background: #ff4d4f;
  }
}

.gd-net__config-tip {
  margin: 0;
  font-size: 11px;
  color: $text-muted;
  line-height: 1.6;
}

.gd-net__result {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* 顶部指标卡（4 个）*/
.gd-net__metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  flex-shrink: 0;
}

.gd-net__metric {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  background: #fff;

  span {
    font-size: 12px;
    color: $text-muted;
  }

  strong {
    font-size: 22px;
    line-height: 1.1;
    font-weight: 700;
    color: $color-primary;

    small { margin-left: 3px; font-size: 12px; color: $text-muted; font-weight: 400; }
  }
}

/* 样本表格 */
.gd-net__samples {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
}

.gd-net__samples-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  strong { font-size: 13px; font-weight: 600; color: $text-base; }
}

.gd-net__clear {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;

  i { font-size: 13px; }

  &:hover:not(:disabled) { border-color: #ff4d4f; color: #ff4d4f; }
  &:disabled { color: $text-muted; cursor: not-allowed; opacity: 0.5; }
}

.gd-net__samples-table {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.gd-net__samples-thead {
  display: flex;
  align-items: center;
  padding: 0 14px;
  height: 38px;
  background: #fafbfc;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  span {
    font-size: 12px;
    font-weight: 600;
    color: $text-secondary;
  }
}

.gd-net__samples-body {
  flex: 1;
  overflow-y: auto;
}

.gd-net__samples-row {
  display: flex;
  align-items: center;
  padding: 0 14px;
  height: 40px;
  border-bottom: 1px solid $border-color-card;
  font-size: 12px;
  color: $text-base;
  transition: background 0.15s;

  &:last-child { border-bottom: none; }
  &:hover { background: #faf9ff; }

  strong { color: #52c41a; font-weight: 650; }
}

.gd-net__col-seq { width: 60px; flex-shrink: 0; color: $text-muted; font-family: 'Courier New', monospace; }
.gd-net__col-echo { width: 90px; flex-shrink: 0; font-family: 'Courier New', monospace; }
.gd-net__col-traffic { width: 110px; flex-shrink: 0; color: $text-secondary; font-family: 'Courier New', monospace; }
.gd-net__col-tp { flex: 1; min-width: 0; font-family: 'Courier New', monospace; }
.gd-net__col-time { width: 170px; flex-shrink: 0; color: $text-muted; font-family: 'Courier New', monospace; }

.gd-net__samples-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: 100%;
  min-height: 200px;
  color: $text-muted;

  i { font-size: 40px; opacity: 0.4; }
  p { margin: 0; font-size: 13px; }
}

/* ===== 新建目录弹窗 ===== */
.gd-newdir {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 0;
}

.gd-newdir__field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  span { font-size: 13px; color: $text-secondary; }

  input {
    height: 36px;
    padding: 0 12px;
    border: 1px solid #ebedf0;
    border-radius: 6px;
    font-size: 13px;
    outline: none;

    &:focus { border-color: $color-primary; }
  }
}

.gd-newdir__btns {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* ===== 视觉模型 tab ===== */
.gd-vision {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 工具栏 */
.gd-vision__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  flex-shrink: 0;
}

.gd-vision__search {
  width: 320px;
  flex-shrink: 0;

  :deep(.ant-input-affix-wrapper) { border-radius: 6px; }
}

.gd-vision__view-switch {
  display: flex;
  gap: 2px;
  margin-left: auto;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  padding: 2px;
}

.gd-vision__view-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 26px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: $text-muted;
  cursor: pointer;
  transition: all 0.15s;

  i { font-size: 14px; }

  &:hover { color: $text-secondary; }

  &.active {
    background: $color-primary-bg;
    color: $color-primary;
  }
}

/* 空状态 */
.gd-vision__empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: $text-muted;

  i { font-size: 40px; opacity: 0.4; }
  p { margin: 0; font-size: 13px; }
}

/* 卡片视图 */
.gd-vision__grid {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  align-content: start;
  padding-bottom: 4px;
}

/* 列表视图 */
.gd-vision__list-wrap {
  flex: 1;
  min-height: 0;
}

.gd-vm-list {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
}

.gd-vm-list__head {
  display: flex;
  align-items: center;
  padding: 0 14px;
  height: 42px;
  background: #fafbfc;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  span {
    font-size: 13px;
    font-weight: 600;
    color: $text-secondary;
  }
}

.gd-vm-list__body {
  flex: 1;
  overflow-y: auto;
}

.gd-vm-list__row {
  display: flex;
  align-items: center;
  padding: 0 14px;
  height: 52px;
  border-bottom: 1px solid $border-color-card;
  font-size: 13px;
  transition: background 0.15s;

  &:last-child { border-bottom: none; }
  &:hover { background: #faf9ff; }
}

.gd-vm-list__col-name {
  flex: 1.6;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;

  i { font-size: 15px; flex-shrink: 0; }

  strong {
    color: $text-base;
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.gd-vm-list__col-type { flex: 1; min-width: 0; color: $text-secondary; }
.gd-vm-list__col-version {
  flex: 0.9;
  min-width: 0;
  color: $text-muted;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.gd-vm-list__col-cam { flex: 0.7; min-width: 0; color: $text-base; font-weight: 500; }
.gd-vm-list__col-task { flex: 0.7; min-width: 0; color: $text-base; font-weight: 500; }
.gd-vm-list__col-status { flex: 0.8; min-width: 0; }
.gd-vm-list__col-ops {
  width: 150px;
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 2px;
}

.gd-vm-list__op {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: $text-tertiary;
  cursor: pointer;
  transition: all 0.15s;

  i { font-size: 15px; }

  &:hover:not(:disabled) {
    background: $color-primary-bg;
    color: $color-primary;
  }

  &:disabled { cursor: progress; opacity: 0.5; }
  .i-ant-design-loading-outlined { animation: spin 1s linear infinite; }
}

.gd-vm-card {
  position: relative;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  padding: 34px 12px 44px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: box-shadow 0.15s, border-color 0.15s;

  &:hover { box-shadow: 0 2px 8px rgba(110, 75, 255, 0.08); }

}

.gd-vm-card__status {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(43, 179, 163, 0.1);
  line-height: 1.4;

  &.disabled {
    background: #f4f6fa;
  }
}

.gd-vm-card__head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.gd-vm-card__icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;

  i { font-size: 17px; }
}

.gd-vm-card__title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gd-vm-card__name-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
  min-width: 0;
}

.gd-vm-card__name {
  font-size: 13px;
  font-weight: 600;
  color: $text-base;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 检测类型 / 版本号：统一 12px + 图标 */
.gd-vm-card__type {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $text-muted;

  i { font-size: 12px; }
}

.gd-vm-card__version {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $text-muted;

  i { font-size: 12px; }

  .gd-vm-update-tag { margin-left: 2px; }
}

.gd-vm-card__version-num {
  font-style: normal;
  font-family: 'Courier New', monospace;
  color: $text-secondary;
}

/* 更多按钮（右上角下拉触发）*/
.gd-vm-more {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  color: $text-tertiary;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;

  i { font-size: 18px; }

  &:hover {
    background: $border-color-card;
    color: $text-base;
  }

  &__dot {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fa8c16;
    box-shadow: 0 0 0 2px #fff;
  }
}

/* 更多菜单项里的“升级”橙色提示 */
.gd-vm-more-menu .is-update { color: #fa8c16; }

/* 启用/禁用开关 */
.gd-vm-switch {
  position: relative;
  width: 36px;
  height: 20px;
  border: none;
  border-radius: 999px;
  background: #d9d9d9;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  transition: background 0.2s;

  &.on { background: $color-primary; }

  &__dot {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    transition: left 0.2s;
  }

  &.on .gd-vm-switch__dot { left: 18px; }
}

/* 运行状态（卡片和列表共用）*/
.gd-vm-running {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  flex-shrink: 0;

  &.enabled { color: $color-online; }
  &.disabled { color: $text-tertiary; }
}

.gd-vm-running__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;

  .enabled & { box-shadow: 0 0 0 3px rgba(43,179,163,0.12); animation: pulse 1.5s ease-in-out infinite; }
}

.gd-vm-update-tag {
  font-style: normal;
  font-size: 10px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 3px;
  background: rgba(250, 140, 22, 0.12);
  color: #fa8c16;
}

/* 指标 */
.gd-vm-card__metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}

.gd-vm-metric {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px;
  border: 1px solid $border-color-card;
  border-radius: 6px;

  > i {
    font-size: 15px;
    color: $color-primary;
    flex-shrink: 0;
  }

  div {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  strong {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
    line-height: 1.1;
  }

  span {
    font-size: 10px;
    color: $text-muted;
  }
}

/* ===== 使用范围 / 历史版本 抽屉共用 ===== */
.gd-scope,
.gd-version {
  display: flex;
  flex-direction: column;
}

.gd-scope__head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid $border-color-card;

  strong {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
  }

  span {
    font-size: 12px;
    color: $text-muted;
  }
}

.gd-scope__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;

  i { font-size: 22px; }
}

.gd-scope__section,
.gd-version__section {
  padding: 16px 20px;

  & + & { border-top: 1px solid $border-color-card; }
}

.gd-scope__title,
.gd-version__title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: $text-base;
  margin-bottom: 10px;

  i { color: $color-primary; font-size: 14px; }

  em {
    margin-left: auto;
    font-style: normal;
    font-size: 12px;
    color: $text-muted;
    font-weight: 400;
  }
}

/* 使用范围表格（关联摄像头 / 关联任务）*/
.gd-scope__table {
  border: 1px solid $border-color-card;
  border-radius: 8px;
  overflow: hidden;
}

.gd-scope__thead {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 8px 12px;
  background: #fafbfc;
  border-bottom: 1px solid $border-color-card;

  span {
    font-size: 11px;
    font-weight: 600;
    color: $text-muted;
    flex: 1;
    min-width: 0;
  }

  span:first-child { flex: 1.2; }
  span:last-child { flex: 0.6; text-align: right; }
}

.gd-scope__tbody {
  display: flex;
  flex-direction: column;

  &.scroll-thin { max-height: 260px; overflow-y: auto; }
}

.gd-scope__row {
  display: flex;
  align-items: center;
  gap: 0;
  padding: 10px 12px;
  border-bottom: 1px solid $border-color-card;
  transition: background 0.15s;

  &:last-child { border-bottom: none; }
  &:hover { background: #fafbfc; }

  > span, > em {
    flex: 1;
    min-width: 0;
  }

  > span:first-child { flex: 1.2; }
  > em:last-child, > span:last-child { flex: 0 0 auto; }
}

.gd-scope__row-name {
  font-size: 13px;
  color: $text-base;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gd-scope__row-id {
  font-size: 12px;
  color: $text-muted;
  font-family: 'Courier New', monospace;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gd-scope__row-scene {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: $color-primary;
  background: rgba(110, 75, 255, 0.08);
  border: 1px solid rgba(110, 75, 255, 0.14);
  padding: 2px 8px;
  border-radius: 999px;
  align-self: center;
  line-height: 18px;
  white-space: nowrap;
}

.gd-scope__row-status {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-style: normal;
  font-size: 12px;
  line-height: 18px;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;

  &.online {
    color: $color-online;
    background: rgba(43,179,163,0.08);
    border: 1px solid rgba(43,179,163,0.16);
  }

  &.offline {
    color: $text-tertiary;
    background: rgba(154,161,171,0.10);
    border: 1px solid rgba(154,161,171,0.16);
  }
}

/* ===== 历史版本时间线 ===== */
.gd-version__timeline {
  position: relative;
  padding-left: 4px;
}

.gd-version__item {
  position: relative;
  display: flex;
  gap: 14px;
  padding-bottom: 16px;

  &:last-child { padding-bottom: 0; }

  &::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 14px;
    bottom: -2px;
    width: 1px;
    background: $border-color-card;
  }

  &:last-child::before { display: none; }
}

.gd-version__dot {
  position: relative;
  z-index: 1;
  width: 9px;
  height: 9px;
  margin-top: 4px;
  border-radius: 50%;
  background: #d9d9d9;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px $border-color-card;
  flex-shrink: 0;

  .is-current & {
    background: $color-primary;
    box-shadow: 0 0 0 1px $color-primary, 0 0 0 4px rgba(110,75,255,0.12);
  }
}

.gd-version__item-body {
  flex: 1;
  min-width: 0;
}

.gd-version__item-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;

  strong {
    font-size: 13px;
    font-weight: 600;
    color: $text-base;
    font-family: 'Courier New', monospace;
  }
}

.gd-version__current-tag {
  font-style: normal;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  background: $color-primary-bg;
  color: $color-primary;
}

.gd-version__size {
  margin-left: auto;
  font-size: 11px;
  color: $text-muted;
  font-family: 'Courier New', monospace;
}

.gd-version__change {
  margin: 0 0 4px;
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.5;
}

.gd-version__time {
  font-size: 11px;
  color: $text-muted;
  font-family: 'Courier New', monospace;
}

.gd-version__ops {
  margin-top: 6px;

  button {
    height: 24px;
    padding: 0 10px;
    border: 1px solid $border-color-card;
    border-radius: 4px;
    background: #fff;
    color: $text-secondary;
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;

    &:hover:not(:disabled) { border-color: $color-primary; color: $color-primary; }
    &:disabled { color: $text-muted; cursor: not-allowed; opacity: 0.5; }
  }
}

/* ===== 大模型 tab ===== */
.gd-lm {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.gd-lm__scroll {
  height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 当前配置的大模型 */
.gd-lm__current {
  flex-shrink: 0;
}

.gd-lm-current {
  background: linear-gradient(135deg, rgba(110, 75, 255, 0.06) 0%, rgba(245, 248, 255, 0.6) 100%);
  border: 1px solid rgba(110, 75, 255, 0.2);
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gd-lm-current__head {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.gd-lm-current__icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;

  i { font-size: 26px; }
}

.gd-lm-current__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gd-lm-current__title-row {
  display: flex;
  align-items: center;
  gap: 10px;

  strong {
    font-size: 16px;
    font-weight: 600;
    color: $text-base;
  }
}

.gd-lm-current__tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  background: $color-primary;
}

.gd-lm-current__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 12px;
  color: $text-muted;

  i { font-size: 12px; margin-right: 3px; }

  em { font-style: normal; color: $text-secondary; }
}

.gd-lm-current__remove {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 12px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;

  i { font-size: 13px; }

  &:hover { border-color: #ff4d4f; color: #ff4d4f; }
}

.gd-lm-current__desc {
  margin: 0;
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.6;
}

.gd-lm-current__abilities {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 未配置空状态 */
.gd-lm-current-empty {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  border: 1px dashed $border-color-light;
  border-radius: 12px;
  background: #fafbfc;

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: $border-color-card;
    color: $text-tertiary;
    flex-shrink: 0;

    i { font-size: 26px; }
  }

  strong {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
    margin-bottom: 4px;
  }

  p {
    margin: 0;
    font-size: 12px;
    color: $text-muted;
    line-height: 1.6;
  }
}

/* 云端模型工具栏 */
.gd-lm__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.gd-lm__list-title {
  font-size: 13px;
  font-weight: 600;
  color: $text-secondary;
  flex-shrink: 0;
}

.gd-lm__search {
  width: 240px;
  flex-shrink: 0;

  :deep(.ant-input-affix-wrapper) { border-radius: 6px; }
}

.gd-lm__refresh {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  margin-left: auto;

  i { font-size: 13px; }

  &:hover:not(:disabled) { border-color: $color-primary; color: $color-primary; }
  &:disabled { color: $text-muted; cursor: not-allowed; }

  .i-ant-design-loading-outlined { animation: spin 1s linear infinite; }
}

/* 加载中 */
.gd-lm__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 60px 0;

  i {
    font-size: 32px;
    color: $color-primary;
    animation: spin 1s linear infinite;
  }

  p { margin: 0; font-size: 13px; color: $text-muted; }
}

/* 空状态（未刷新 / 搜索无结果）*/
.gd-lm__cloud-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 60px 0;
  color: $text-muted;

  i { font-size: 40px; opacity: 0.4; }
  p { margin: 0; font-size: 13px; color: $text-secondary; }
  span { font-size: 12px; }
}

/* 云端模型卡片网格 */
.gd-lm__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.gd-lm-card {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: box-shadow 0.15s, border-color 0.15s;

  &:hover { box-shadow: 0 2px 8px rgba(20, 23, 31, 0.06); }

  &.is-active {
    border-color: $color-primary;
    background: #faf9ff;
  }

  &.is-downloading {
    border-color: $color-primary;
  }
}

.gd-lm-card__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.gd-lm-card__icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;

  i { font-size: 20px; }
}

.gd-lm-card__title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.gd-lm-card__name {
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
  line-height: 1.3;
}

.gd-lm-card__meta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $text-muted;

  i { font-size: 12px; }

  em { font-style: normal; }
}

.gd-lm-card__size { color: $text-muted; }

.gd-lm-card__desc {
  margin: 0;
  font-size: 12px;
  color: $text-muted;
  line-height: 1.6;
}

.gd-lm-card__abilities {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* 能力标签（当前配置和卡片共用）*/
.gd-lm-ability {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: $color-primary;
  background: $color-primary-bg;
}

/* 卡片底部操作区 */
.gd-lm-card__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid $border-color-card;
  min-height: 42px;
}

.gd-lm-card__status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;

  i { font-size: 14px; }

  &.is-active { color: $color-online; }
}

/* 下载中：进度条 + 停止按钮 */
.gd-lm-card__downloading {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
}

.gd-lm-progress {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;

  &__bar {
    flex: 1;
    height: 6px;
    border-radius: 999px;
    background: $border-color-card;
    overflow: hidden;

    i {
      display: block;
      height: 100%;
      border-radius: 999px;
      background: $color-primary;
      transition: width 0.3s ease;
    }
  }

  span {
    font-size: 12px;
    font-weight: 500;
    color: $color-primary;
    min-width: 36px;
    text-align: right;
  }
}

.gd-lm-card__stop {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;

  i { font-size: 13px; }

  &:hover { border-color: #ff4d4f; color: #ff4d4f; }
}

/* 下载按钮 */
.gd-lm-card__download {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 14px;
  border: 1px solid $color-primary;
  border-radius: 6px;
  background: $color-primary;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;

  i { font-size: 14px; }

  &:hover:not(:disabled) { background: $color-primary-hover; }

  &:disabled {
    background: #eef1f6;
    border-color: #eef1f6;
    color: $text-muted;
    cursor: not-allowed;
  }
}

.gd-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #fff;
  border-radius: 0 0 12px 12px;

  p {
    margin: 0;
    font-size: 14px;
    color: $text-muted;
  }
}

.gd-placeholder__icon {
  font-size: 40px;
  color: $color-primary;
  opacity: 0.4;
}

@media (max-width: 1180px) {
  .gd-runtime {
    grid-template-columns: 1fr;
  }

  .gd-active-metric {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .gd-hero {
    flex-direction: column;
  }

  .gd-metric-grid {
    grid-template-columns: 1fr;
  }

  .gd-top-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .gd-tabs {
    overflow-x: auto;
  }

  .gd-stat-row {
    grid-template-columns: 1fr;
  }
}
</style>
