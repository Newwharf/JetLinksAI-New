<script setup lang="ts">
/**
 * 项目级布局 - 1:1 复刻 JetLinks 项目框架
 * 顶栏 + 侧栏菜单 + 主内容区
 * 数据来源：UAT 站 cloud-uat.jetlinks.cn computedStyle 提取
 */
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { useAppStore } from '@/stores/app'
import { scenarioOptions } from '@/views/workbench/templates'
import WelcomeModal from '@/components/WelcomeModal.vue'
import GuideOverlay from '@/components/GuideOverlay.vue'
import aiChatIcon from '@/assets/AIchaticon.png'
import serviceQrImg from '@/assets/iot/erweima.png'
import aiTicketImage1 from '@/assets/text-search/result-01.jpg'
import aiTicketImage2 from '@/assets/text-search/result-02.jpg'
import cameraGuideImage1 from '@/assets/gatewayGuide/video-device-guide-1.png'
import cameraGuideImage2 from '@/assets/gatewayGuide/video-device-guide-2.png'
import cameraGuideImage3 from '@/assets/gatewayGuide/video-device-guide-3.png'
import { createTicket } from '@/views/tickets/ticketData'
import {
  subscriptions,
  packageComparison,
  serviceNameMap,
  formatNumber,
  type Subscription
} from '@/views/system/subscription/mock'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const usageCapacityModalVisible = ref(false)
const usageAlertOpen = ref(false)

const serviceDisplayNames: Record<string, string> = {
  basic: '基础服务',
  dev: '开发',
  alarm: '告警',
  gateway: '网关',
  iot: '物联',
  visual: '可视化',
  spatial: '空间态势',
  inspect: '巡检',
  video: '视联'
}

function usageMetricKey(feature: string, metric: string) {
  return `${feature}:${metric}`
}

function getUsageComparisonGroup(serviceId: string) {
  return packageComparison.find(group => group.service === serviceNameMap[serviceId])
}

interface UsageLimitAlert {
  key: string
  serviceName: string
  metricName: string
  used: number
  total: number
  percent: number
}

function getUsageLimitAlertsForService(sub: Subscription) {
  const group = getUsageComparisonGroup(sub.id)
  if (!group || group.noOwnMetrics || !group.rows) return []
  return group.rows.reduce<UsageLimitAlert[]>((list, row) => {
    const base = row.quotas[sub.tier]
    if (base === undefined) return list
    const key = usageMetricKey(row.feature, row.metric)
    const total = base + (sub.expansions[key] || 0)
    const used = sub.usage[key]?.used || 0
    const percent = total > 0 ? Math.round((used / total) * 100) : 0
    if (percent >= 80) {
      list.push({
        key: `${sub.id}-${key}`,
        serviceName: serviceDisplayNames[sub.id] || sub.name,
        metricName: `${row.feature} · ${row.metric}`,
        used,
        total,
        percent
      })
    }
    return list
  }, [])
}

const usageLimitAlerts = computed(() => subscriptions.flatMap(getUsageLimitAlertsForService))
const topUsageLimitAlerts = computed(() =>
  [...usageLimitAlerts.value]
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 3)
)

function openUsageCapacityModal() {
  usageAlertOpen.value = false
  usageCapacityModalVisible.value = true
}

function goUsageSettings() {
  usageAlertOpen.value = false
  usageCapacityModalVisible.value = false
  router.push('/system/project')
}

// 亮色/暗色模式切换
const isDark = ref(false)
function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

// 菜单数据：左侧只展示一级菜单，二级 tab 在页面顶部展示
interface MenuItem {
  key: string
  label: string
  icon: string
  path?: string
}

// 全部菜单定义（字典，供各场景按 key 引用）
const ALL_MENUS: Record<string, MenuItem> = {
  space: { key: 'space', label: '空间态势', icon: 'i-ant-design-apartment-outlined', path: '/space/situation' },
  video: { key: 'video', label: '视联中心', icon: 'i-ant-design-video-camera-outlined', path: '/video/wall' },
  'image-search': { key: 'image-search', label: '文搜图', icon: 'i-ant-design-search-outlined', path: '/image-search/text' },
  flow: { key: 'flow', label: '客流分析', icon: 'i-ant-design-line-chart-outlined', path: '/flow/analysis' },
  alarm: { key: 'alarm', label: '告警中心', icon: 'i-ant-design-alert-outlined', path: '/alarm/event' },
  inspection: { key: 'inspection', label: '巡检', icon: 'i-ant-design-audit-outlined', path: '/inspection/workbench' },
  dashboard: { key: 'dashboard', label: '仪表盘', icon: 'i-ant-design-dashboard-outlined', path: '/dashboard' },
  visualization: { key: 'visualization', label: '可视化', icon: 'i-ant-design-fund-projection-screen-outlined', path: '/visualization/board' },
  iot: { key: 'iot', label: '物联中心', icon: 'i-ant-design-api-outlined', path: '/iot/device' },
  system: { key: 'system', label: '系统管理', icon: 'i-ant-design-setting-outlined', path: '/system/project' },
  archive: { key: 'archive', label: '归档', icon: 'i-ant-design-inbox-outlined', path: '/archive' },
  // 养老场景专属菜单
  'elderly-security': { key: 'elderly-security', label: '安防态势', icon: 'i-ant-design-safety-outlined', path: '/elderly-security/situation' },
  'elderly-behavior': { key: 'elderly-behavior', label: '老人行为分析', icon: 'i-ant-design-user-outlined', path: '/elderly-behavior/analysis' },
  'elderly-staff': { key: 'elderly-staff', label: '护工行为分析', icon: 'i-ant-design-team-outlined', path: '/elderly-staff/analysis' },
  // 商业体场景专属菜单
  'vehicle': { key: 'vehicle', label: '车辆分析', icon: 'i-ant-design-car-outlined', path: '/vehicle/trend' },
  'security-posture': { key: 'security-posture', label: '安防态势', icon: 'i-ant-design-safety-outlined', path: '/security-posture/situation' },
  'work-order': { key: 'work-order', label: '工单', icon: 'i-ant-design-profile-outlined', path: '/work-order/list' },
  'energy': { key: 'energy', label: '能耗分析', icon: 'i-ant-design-bar-chart-outlined', path: '/energy/analysis' },
  // 安防场景专属菜单（业务名）
  'security-dashboard': { key: 'security-dashboard', label: '仪表盘', icon: 'i-ant-design-dashboard-outlined', path: '/security-dashboard' },
  'security-space': { key: 'security-space', label: '空间态势', icon: 'i-ant-design-apartment-outlined', path: '/space/situation' },
  'security-video': { key: 'security-video', label: '监控墙', icon: 'i-ant-design-video-camera-outlined', path: '/video/wall' },
  'security-image': { key: 'security-image', label: '文搜图', icon: 'i-ant-design-search-outlined', path: '/image-search/person' },
  'security-alarm': { key: 'security-alarm', label: '告警', icon: 'i-ant-design-alert-outlined', path: '/alarm/event' },
  // 工地场景专属菜单
  'construction-dashboard': { key: 'construction-dashboard', label: '仪表盘', icon: 'i-ant-design-dashboard-outlined', path: '/construction-dashboard' },
  'construction-posture': { key: 'construction-posture', label: '工地态势', icon: 'i-ant-design-environment-outlined', path: '/construction-posture/overview' },
  'construction-risk': { key: 'construction-risk', label: '风险隐患', icon: 'i-ant-design-warning-outlined', path: '/construction-risk/analysis' },
  'construction-accident': { key: 'construction-accident', label: '事故险肇', icon: 'i-ant-design-alert-outlined', path: '/construction-accident/analysis' },
  'construction-report': { key: 'construction-report', label: '工地报告', icon: 'i-ant-design-file-text-outlined', path: '/construction-report/safety-daily' },
  'construction-person': { key: 'construction-person', label: '人员', icon: 'i-ant-design-team-outlined', path: '/construction-person/overview' },
  'construction-vehicle': { key: 'construction-vehicle', label: '车辆', icon: 'i-ant-design-car-outlined', path: '/construction-vehicle/overview' },
  'construction-permit': { key: 'construction-permit', label: '作业许可', icon: 'i-ant-design-safety-certificate-outlined', path: '/construction-permit/workbench' },
  'construction-dangerous': { key: 'construction-dangerous', label: '危大工程', icon: 'i-ant-design-build-outlined', path: '/construction-dangerous' },
  'construction-training': { key: 'construction-training', label: '安全培训', icon: 'i-ant-design-read-outlined', path: '/construction-training' },
  'construction-briefing': { key: 'construction-briefing', label: '班前交底', icon: 'i-ant-design-schedule-outlined', path: '/construction-briefing' },
  'construction-device': { key: 'construction-device', label: '物联设备管理', icon: 'i-ant-design-api-outlined', path: '/construction-device/manage' },
  'construction-tower': { key: 'construction-tower', label: '塔机管理', icon: 'i-ant-design-control-outlined', path: '/construction-tower/overview' },
  'construction-monitor': { key: 'construction-monitor', label: '监控墙', icon: 'i-ant-design-video-camera-outlined', path: '/construction-monitor/wall' },
  'construction-image': { key: 'construction-image', label: '文搜图', icon: 'i-ant-design-search-outlined', path: '/construction-image/person' },
  'construction-alarm': { key: 'construction-alarm', label: '告警中心', icon: 'i-ant-design-bell-outlined', path: '/construction-alarm/event' }
}

// 场景 -> 菜单 key 顺序映射
const SCENARIOS: Record<string, string[]> = {
  general: ['dashboard', 'space', 'video', 'image-search', 'flow', 'alarm', 'inspection', 'visualization', 'iot', 'archive'],
  // 安防场景（业务名菜单，不含系统管理——系统管理在底部固定区）
  security: ['security-dashboard', 'security-space', 'security-video', 'security-image', 'security-alarm', 'archive'],
  commercial: ['dashboard', 'flow', 'vehicle', 'security-posture', 'video', 'image-search', 'alarm', 'visualization', 'work-order', 'energy', 'iot', 'archive'],
  // 公寓场景
  apartment: ['dashboard', 'video', 'space', 'image-search', 'alarm', 'archive'],
  elderly: ['dashboard', 'elderly-security', 'elderly-behavior', 'elderly-staff', 'video', 'image-search', 'alarm', 'archive'],
  // 工地场景
  construction: [
    'construction-dashboard',
    'construction-posture',
    'construction-risk',
    'construction-accident',
    'construction-report',
    'construction-person',
    'construction-vehicle',
    'construction-permit',
    'construction-dangerous',
    // 'construction-training',   // 安全培训 — 暂时隐藏
    // 'construction-briefing',   // 班前交底 — 暂时隐藏
    'construction-device',
    'construction-tower',
    'construction-monitor',
    'construction-image',
    'construction-alarm',
    'archive'
  ]
}

// 当前场景对应的 logo 和项目名
const currentScenarioInfo = computed(() =>
  scenarioOptions.find(o => o.value === currentScenario.value) || scenarioOptions[0]
)

// 当前场景（读 store，全局共享给 SubTabLayout/SpaceLayout）
const currentScenario = computed({
  get: () => appStore.scenario,
  set: (v: string) => appStore.setScenario(v)
})
const scenarioSelectedKeys = computed({
  get: () => [currentScenario.value],
  set: () => {}
})

// 当前场景对应的菜单列表
const menus = computed<MenuItem[]>(() => {
  const keys = SCENARIOS[currentScenario.value] || SCENARIOS.general
  return keys.map(k => ALL_MENUS[k]).filter(Boolean)
})

// 切换场景时，跳转到第一个菜单并刷新页面
watch(currentScenario, () => {
  const firstMenu = menus.value[0]
  if (firstMenu?.path) {
    // 跳转到第一个菜单，并带上 _t 时间戳强制刷新
    router.push({ path: firstMenu.path, query: { _t: Date.now() } })
  }
})

// 当前一级菜单高亮（路由匹配前缀）
const activeTopKey = computed(() => {
  const path = route.path
  for (const m of menus.value) {
    if (!m.path) continue
    // 用菜单 path 的第一段做前缀匹配（兼容安防等 key 与 path 前缀不一致的场景）
    const seg = '/' + m.path.split('/')[1]
    if (path.startsWith(seg)) return m.key
  }
  return menus.value[0]?.key ?? 'space'
})

// 侧边栏折叠状态（默认收起）
interface PageHelpConfig {
  title: string
  questions: string[]
}

const pageHelpConfigs: { match: (path: string) => boolean; config: PageHelpConfig }[] = [
  {
    match: path => path.startsWith('/space') || path.startsWith('/security-posture') || path.startsWith('/elderly-security'),
    config: {
      title: '空间态势常见问题',
      questions: ['空间态势在哪里查看？', '空间区域如何新建？', '空间层级如何维护？', '平面图如何上传？', '设备如何绑定到空间？', '设备标记如何放到平面图？'],
    },
  },
  {
    match: path => path.startsWith('/video') || path.startsWith('/construction-video'),
    config: {
      title: '视频中心常见问题',
      questions: ['监控墙如何切换布局？', '摄像头画面如何预览？', '视频设备如何新增？', '网关视频如何配置？', '视频通道状态在哪里查看？', '摄像头回放在哪里查看？'],
    },
  },
  {
    match: path => path.startsWith('/image-search') || path.startsWith('/construction-image'),
    config: {
      title: '文搜图常见问题',
      questions: ['文搜图如何搜索？', '人员记录如何检索？', '车辆记录如何检索？', '人员档案如何新建？', '人员轨迹在哪里查看？', '搜索条件如何筛选？'],
    },
  },
  {
    match: path => path.startsWith('/flow') || path.startsWith('/vehicle'),
    config: {
      title: '客流分析常见问题',
      questions: ['客流趋势在哪里查看？', '客流点位如何新增？', '点位设备如何绑定？', '点位详情在哪里查看？', '车辆趋势在哪里查看？', '热力图点位如何维护？'],
    },
  },
  {
    match: path => path.startsWith('/alarm') || path.startsWith('/construction-alarm'),
    config: {
      title: '告警中心常见问题',
      questions: ['告警事件在哪里查看？', '告警详情如何查看？', '告警状态如何处理？', '告警规则如何新增？', '通知方式如何配置？', '告警等级如何设置？'],
    },
  },
  {
    match: path => path.startsWith('/inspection'),
    config: {
      title: '巡检常见问题',
      questions: ['巡检概况在哪里查看？', '巡检记录在哪里查看？', '巡检任务如何配置？', '巡检点位如何维护？', '巡检计划如何设置？', '异常巡检如何处理？'],
    },
  },
  {
    match: path => path.startsWith('/visualization'),
    config: {
      title: '可视化常见问题',
      questions: ['数据看板在哪里查看？', '看板如何新建？', '看板组件如何配置？', '数据资产在哪里管理？', '数据来源如何绑定？', '看板如何预览？'],
    },
  },
  {
    match: path => path.startsWith('/iot') || path.startsWith('/construction-device'),
    config: {
      title: '物联中心常见问题',
      questions: ['设备总览在哪里查看？', '设备如何新增？', '产品如何创建？', '设备分组如何维护？', '设备告警如何配置？', '设备详情在哪里查看？'],
    },
  },
  {
    match: path => path.startsWith('/archive'),
    config: {
      title: '归档常见问题',
      questions: ['归档内容在哪里查看？', '归档记录如何搜索？', '归档分类如何筛选？', '归档详情如何查看？', '归档文件如何下载？', '归档数据如何追溯？'],
    },
  },
]

const currentPageHelpConfig = computed(() => {
  const item = pageHelpConfigs.find(i => i.match(route.path))
  return item?.config || null
})

const pageHelpPosition = ref<{ x: number; y: number } | null>(null)
const pageHelpDragOffset = ref({ x: 0, y: 0 })
const pageHelpDragging = ref(false)
const pageHelpMoved = ref(false)
const pageHelpOpen = ref(false)
const legacyPageHelpOpen = ref(false)
const legacySelectedQuestion = ref('')
const pageHelpWide = ref(false)
const pageHelpSize = 48
const pageHelpInput = ref('')

interface PageHelpMessage {
  id: number
  role: 'assistant' | 'user'
  content: string
  ticketDraft?: PageHelpTicketDraft
  submitted?: boolean
  ticketId?: string
  cameraGuide?: boolean
}

interface PageHelpTicketDraft {
  categories: string[]
  description: string
  contact: string
  images: string[]
}

const defaultPageHelpMessage =
  '我可以帮你快速定位可用入口、说明当前页面能做什么，并根据你的问题给出下一步操作建议。'
let pageHelpMessageSeed = Date.now()

function createPageHelpMessageId() {
  pageHelpMessageSeed += 1
  return pageHelpMessageSeed
}

const pageHelpMessages = ref<PageHelpMessage[]>([])
const pageHelpHasConversation = computed(() => pageHelpMessages.value.length > 0)
const pageHelpTicketMode = ref(false)
const pageHelpQuickQuestions = [
  '如何新增视联设备？',
  '帮我找到设备管理入口',
  '帮我找到告警处理入口',
]
const cameraDeviceQuestion = '如何新增视联设备？'
const cameraGuideImages = [
  { title: '进入视频设备', desc: '进入网关地址页，点击顶部导航栏中的“视频中心”，在左侧菜单中选择“视频设备”。', image: cameraGuideImage1 },
  { title: '选择接入方式', desc: '点击“新增设备”进入流程，根据摄像头实际接入方式选择 Onvif、GB/T28181、固定地址、插件或 Agent 接入。', image: cameraGuideImage2 },
  { title: '完成绑定认证', desc: '选择需要新增的摄像头，输入账号和密码完成认证，成功后设备会出现在视频设备列表中。', image: cameraGuideImage3 },
]
const cameraGuideSteps = [
  '进入网关地址页，点击顶部导航栏中的“视频中心”。',
  '在左侧菜单中选择“视频设备”。',
  '点击页面中的“新增设备”按钮，进入视频设备新增流程。',
  '选择设备接入方式。',
  '可根据摄像头实际接入方式选择对应类型，例如 Onvif、GB/T28181、固定地址、插件或 Agent 接入。',
  '如果选择 Onvif 接入，可先进行设备扫描。',
  '系统会扫描当前网络环境中的摄像头设备，并展示可接入的设备列表。',
  '在扫描结果中选择需要新增的摄像头。',
  '已接入的设备不可重复选择，未接入的设备可以勾选后继续操作。',
  '点击“下一步”或“绑定设备”，进入账号认证。',
  '输入摄像头账号和密码。',
  '通常需要填写摄像头自身的登录账号和密码，用于完成设备认证和接入。',
  '提交认证信息。',
  '系统会校验账号密码，并返回绑定结果。',
  '查看绑定结果。',
  '绑定成功的摄像头会加入视频设备列表；绑定失败的摄像头可重新输入账号密码后再次尝试。',
  '确认完成新增。',
  '新增成功后，可返回视频设备列表查看摄像头名称、IP、厂商、状态等信息。',
  '后续可点击摄像头进行视频预览，也可以在分屏展示、告警联动、自动录像等功能中使用该摄像头。',
]
const cameraGuideStepGroups = [
  {
    title: '进入新增入口',
    steps: cameraGuideSteps.slice(0, 3),
  },
  {
    title: '选择接入方式',
    steps: cameraGuideSteps.slice(3, 9),
  },
  {
    title: '认证并完成绑定',
    steps: [
      '点击“下一步”或“绑定设备”，进入账号认证。',
      '输入摄像头账号和密码，通常需要填写摄像头自身的登录账号和密码，用于完成设备认证和接入。',
      '提交认证信息，系统会校验账号密码，并返回绑定结果。',
      '绑定成功的摄像头会加入视频设备列表；绑定失败的摄像头可重新输入账号密码后再次尝试。',
    ],
  },
  {
    title: '查看与后续使用',
    steps: cameraGuideSteps.slice(17),
  },
]

watch(() => route.path, () => {
  pageHelpOpen.value = false
  legacyPageHelpOpen.value = false
  legacySelectedQuestion.value = ''
  pageHelpWide.value = false
})

function resetPageHelpConversation() {
  pageHelpInput.value = ''
  pageHelpMessages.value = []
  pageHelpTicketMode.value = false
}

function createTicketDraft(content: string): PageHelpTicketDraft {
  return {
    categories: ['物联中心'],
    description: content,
    contact: '13637564734',
    images: [aiTicketImage1, aiTicketImage2],
  }
}

function sendPageHelpQuestion(question = pageHelpInput.value) {
  const content = question.trim()
  if (!content) return
  pageHelpMessages.value.push({
    id: createPageHelpMessageId(),
    role: 'user',
    content: pageHelpTicketMode.value ? content : cameraDeviceQuestion,
  })
  if (pageHelpTicketMode.value) {
    pageHelpMessages.value.push({
      id: createPageHelpMessageId(),
      role: 'assistant',
      content: '我已根据你的描述整理了一份工单，请确认后提交。',
      ticketDraft: createTicketDraft(content),
    })
    pageHelpInput.value = ''
    return
  }
  pageHelpMessages.value.push({
    id: createPageHelpMessageId(),
    role: 'assistant',
    content: '可以，下面是新增视频设备的操作方式。',
    cameraGuide: true,
  })
  pageHelpInput.value = ''
}

function togglePageHelpTicketMode() {
  pageHelpTicketMode.value = !pageHelpTicketMode.value
}

function confirmPageHelpTicket(messageItem: PageHelpMessage) {
  if (!messageItem.ticketDraft || messageItem.submitted) return
  const ticket = createTicket({
    categories: messageItem.ticketDraft.categories,
    description: messageItem.ticketDraft.description,
    contact: messageItem.ticketDraft.contact,
    attachments: ['image1.png', 'image.png'],
  })
  messageItem.submitted = true
  message.success('工单已提交')
  pageHelpMessages.value.push({
    id: createPageHelpMessageId(),
    role: 'assistant',
    content: `工单 ${ticket.id} 已提交，你可以在工单管理中查看处理进度。`,
    ticketId: ticket.id,
  })
}

function openPageHelpTicketList() {
  pageHelpOpen.value = false
  router.push('/tickets')
}

function toggleLegacyPageHelp() {
  pageHelpOpen.value = false
  legacyPageHelpOpen.value = !legacyPageHelpOpen.value
  if (!legacyPageHelpOpen.value) legacySelectedQuestion.value = ''
}

function closeLegacyPageHelp() {
  legacyPageHelpOpen.value = false
  legacySelectedQuestion.value = ''
}

function handleLegacyHelpQuestion(question: string) {
  legacySelectedQuestion.value = question
}

function startPageHelpDrag(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  pageHelpDragging.value = true
  pageHelpMoved.value = false
  pageHelpPosition.value = { x: rect.left, y: rect.top }
  pageHelpDragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
  document.addEventListener('pointermove', movePageHelp)
  document.addEventListener('pointerup', stopPageHelpDrag)
}

function movePageHelp(event: PointerEvent) {
  if (!pageHelpDragging.value) return
  pageHelpMoved.value = true
  const minX = 0
  const maxX = window.innerWidth - pageHelpSize / 2
  const minY = 48
  const maxY = window.innerHeight - pageHelpSize
  pageHelpPosition.value = {
    x: Math.max(minX, Math.min(event.clientX - pageHelpDragOffset.value.x, maxX)),
    y: Math.max(minY, Math.min(event.clientY - pageHelpDragOffset.value.y, maxY)),
  }
}

function stopPageHelpDrag() {
  pageHelpDragging.value = false
  document.removeEventListener('pointermove', movePageHelp)
  document.removeEventListener('pointerup', stopPageHelpDrag)
}

function togglePageHelp() {
  if (pageHelpDragging.value || pageHelpMoved.value) {
    setTimeout(() => {
      pageHelpMoved.value = false
    }, 0)
    return
  }
  legacyPageHelpOpen.value = false
  pageHelpOpen.value = !pageHelpOpen.value
}

function togglePageHelpWide() {
  pageHelpWide.value = !pageHelpWide.value
}

onBeforeUnmount(() => {
  stopPageHelpDrag()
})

const collapsed = ref(true)
function toggleCollapse() {
  collapsed.value = !collapsed.value
}

function handleMenuClick(m: MenuItem) {
  if (!m.path) return
  // 文搜图：所有场景默认进「人员」
  if (m.key === 'image-search') {
    router.push('/image-search/person')
    return
  }
  router.push(m.path)
}

// 启动新手引导
function startGuide(type: 'system' | 'iot' | 'alarm') {
  if (type === 'system') {
    currentScenario.value = 'general'
    appStore.showWelcome()
    router.push('/dashboard')
  } else if (type === 'iot') {
    appStore.startIotGuideDirect()
    router.push('/iot/device')
  } else {
    appStore.startAlarmGuideDirect()
    router.push('/alarm/rule')
  }
}
</script>

<template>
  <div class="project-layout">
    <!-- 顶栏（带阴影） -->
    <header class="layout-header">
      <div class="header-left">
        <div class="logo-box">{{ currentScenarioInfo.logo }}</div>
        <span class="project-name">{{ currentScenarioInfo.name }}</span>
      </div>
      <div class="header-right">
        <a-popover v-model:open="usageAlertOpen" trigger="click" placement="bottomRight" overlay-class-name="usage-alert-popover">
          <button class="usage-alert-btn" type="button">
            <i class="i-ant-design-warning-outlined" />
            <span>用量提醒</span>
            <em v-if="usageLimitAlerts.length">{{ usageLimitAlerts.length }}</em>
          </button>
          <template #content>
            <div class="usage-alert-panel">
              <div class="usage-alert-panel__head">
                <div class="usage-alert-panel__summary">
                  <strong>{{ usageLimitAlerts.length }}</strong>
                  <span>项指标接近或达到上限</span>
                </div>
                <button type="button" @click="goUsageSettings">查看更多</button>
              </div>
              <div v-if="topUsageLimitAlerts.length" class="usage-alert-panel__list">
                <div v-for="item in topUsageLimitAlerts" :key="item.key" class="usage-alert-item">
                  <span class="usage-alert-item__name">
                    <strong>{{ item.serviceName }}</strong>
                    <span>{{ item.metricName }}</span>
                  </span>
                  <span class="usage-alert-item__value">
                    <strong class="usage-alert-item__percent">{{ item.percent }}%</strong>
                    <span> · </span>
                    <strong>{{ formatNumber(item.used) }}</strong>
                    <span> / {{ formatNumber(item.total) }}</span>
                  </span>
                </div>
              </div>
              <div v-else class="usage-alert-panel__empty">
                当前没有接近上限的指标
              </div>
              <button class="usage-alert-panel__expand" type="button" @click="openUsageCapacityModal">
                扩容
              </button>
            </div>
          </template>
        </a-popover>
        <!-- 工单管理入口 -->
        <button class="ticket-entry-btn" @click="router.push('/tickets')">
          <i class="i-ant-design-profile-outlined ticket-entry-icon" />
          <span class="ticket-entry-text">工单管理</span>
        </button>
        <!-- 新手引导下拉 -->
        <a-dropdown v-if="!appStore.guideActive">
          <div class="guide-trigger" @click.prevent>
            <i class="i-ant-design-question-circle-outlined" />
            <span>引导模拟</span>
            <i class="i-ant-design-down-outlined guide-arrow" />
          </div>
          <template #overlay>
            <a-menu>
              <a-menu-item @click="startGuide('system')">
                <i class="i-ant-design-appstore-outlined" />
                <span>系统总览</span>
              </a-menu-item>
              <a-menu-item @click="startGuide('iot')">
                <i class="i-ant-design-api-outlined" />
                <span>创建物联设备</span>
              </a-menu-item>
              <a-menu-item @click="startGuide('alarm')">
                <i class="i-ant-design-bell-outlined" />
                <span>创建告警规则</span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <!-- 场景切换下拉框 -->
        <a-dropdown>
          <div class="scenario-trigger" @click.prevent>
            <i class="i-ant-design-appstore-outlined" />
            <span>{{ scenarioOptions.find(o => o.value === currentScenario)?.label }}</span>
            <i class="i-ant-design-down-outlined scenario-arrow" />
          </div>
          <template #overlay>
            <a-menu v-model:selected-keys="scenarioSelectedKeys">
              <a-menu-item v-for="o in scenarioOptions" :key="o.value" @click="currentScenario = o.value">
                {{ o.label }}
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
        <a-dropdown>
          <div class="lang-trigger" @click.prevent>
            <i class="i-ant-design-global-outlined" />
            <span>中文</span>
            <i class="i-ant-design-down-outlined arrow" />
          </div>
          <template #overlay>
            <a-menu>
              <a-menu-item>中文</a-menu-item>
              <a-menu-item>English</a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </header>

    <div class="layout-body">
      <!-- 侧栏（支持折叠/展开） -->
      <aside class="layout-sider" :class="{ collapsed }">
        <!-- 折叠按钮 -->
        <div class="collapse-btn" @click="toggleCollapse">
          <i :class="collapsed ? 'i-ant-design-menu-unfold-outlined' : 'i-ant-design-menu-fold-outlined'" />
          <span v-if="!collapsed" class="collapse-text">收起菜单</span>
        </div>

        <!-- 菜单列表（仅一级） -->
        <nav class="sider-menu">
          <a-tooltip
            v-for="m in menus"
            :key="m.key"
            :title="collapsed ? m.label : ''"
            placement="right"
          >
            <a
              class="menu-item"
              :class="{ 'is-selected': activeTopKey === m.key }"
              :data-guide="`nav-${m.key}`"
              @click="handleMenuClick(m)"
            >
              <i :class="m.icon" class="menu-icon" />
              <span v-if="!collapsed" class="menu-label">{{ m.label }}</span>
            </a>
          </a-tooltip>
        </nav>

        <!-- 底部固定区：用户信息 + 系统管理 + 换肤 -->
        <div class="sider-footer">
          <!-- 用户信息 -->
          <div class="sider-user">
            <div class="user-avatar">李</div>
            <template v-if="!collapsed">
              <div class="user-info">
                <div class="user-name">李瀚</div>
                <div class="user-id">pm_cef5d9ed954f11c2</div>
              </div>
              <i class="i-ant-design-up-outlined user-arrow" />
            </template>
          </div>

          <!-- 操作按钮组（水平居中） -->
          <div class="footer-actions">
            <!-- 消息中心 -->
            <a-tooltip :title="collapsed ? '消息中心' : ''" placement="right">
              <a class="footer-icon-btn">
                <a-badge :count="0" :show-zero="false" :offset="[6, 0]">
                  <i class="i-ant-design-bell-outlined" />
                </a-badge>
                <span v-if="!collapsed" class="footer-icon-label">消息中心</span>
              </a>
            </a-tooltip>
            <!-- 系统管理（固定，不随场景变） -->
            <a-tooltip :title="collapsed ? '系统管理' : ''" placement="right">
              <a
                class="footer-icon-btn"
                :class="{ 'is-selected': route.path.startsWith('/system') }"
                @click="router.push('/system/project')"
              >
                <i class="i-ant-design-setting-outlined" />
                <span v-if="!collapsed" class="footer-icon-label">系统管理</span>
              </a>
            </a-tooltip>
            <!-- 换肤 -->
            <a-tooltip :title="collapsed ? (isDark ? '亮色模式' : '暗色模式') : ''" placement="right">
              <a class="footer-icon-btn" @click="toggleTheme">
                <i :class="isDark ? 'i-ant-design-sun-outlined' : 'i-ant-design-moon-outlined'" />
                <span v-if="!collapsed" class="footer-icon-label">{{ isDark ? '亮色模式' : '暗色模式' }}</span>
              </a>
            </a-tooltip>
          </div>
        </div>
      </aside>

      <!-- 主内容区 -->
      <main class="layout-main">
        <RouterView :key="route.path + (route.query._t as string || '')" />
      </main>
    </div>

    <!-- 欢迎弹窗 -->
    <WelcomeModal />
    <!-- 全局引导覆盖层 -->
    <GuideOverlay />
    <a-modal
      v-model:open="usageCapacityModalVisible"
      :width="420"
      :footer="null"
      centered
      :title="null"
    >
      <div class="usage-capacity-modal">
        <div class="usage-capacity-modal__icon">
          <i class="i-ant-design-customer-service-outlined" />
        </div>
        <h3>请联系技术支持</h3>
        <p>如需扩容项目用量，请扫码联系售后服务人员。</p>
        <img :src="serviceQrImg" alt="售后服务二维码" class="usage-capacity-modal__qr">
        <button class="usage-capacity-modal__btn" type="button" @click="goUsageSettings">
          查看当前用量
        </button>
      </div>
    </a-modal>
    <div
      v-if="currentPageHelpConfig"
      class="page-help"
      :class="{ 'is-dragging': pageHelpDragging, 'is-open': pageHelpOpen, 'is-wide': pageHelpWide }"
      :style="pageHelpPosition ? { left: `${pageHelpPosition.x}px`, top: `${pageHelpPosition.y}px`, right: 'auto', bottom: 'auto' } : undefined"
    >
      <button
        class="page-help__legacy-trigger"
        type="button"
        aria-label="常见问题"
        @click.stop="toggleLegacyPageHelp"
      >
        <i class="i-ant-design-question-circle-outlined" />
      </button>
      <div class="page-help__legacy-bubble" :class="{ open: legacyPageHelpOpen, 'has-answer': legacySelectedQuestion }">
        <div class="page-help__legacy-head">
          <div class="page-help__legacy-head-main">
            <div class="page-help__legacy-mark">
              <i class="i-ant-design-question-circle-outlined" />
            </div>
            <div>
              <div class="page-help__legacy-title">{{ currentPageHelpConfig.title }}</div>
              <div class="page-help__legacy-subtitle">选择问题后在当前页面查看说明</div>
            </div>
          </div>
          <button class="page-help__legacy-cancel" type="button" aria-label="关闭常见问题" @click.stop="closeLegacyPageHelp">
            <i class="i-ant-design-close-outlined" />
          </button>
        </div>
        <div class="page-help__legacy-content">
          <div class="page-help__legacy-questions">
            <button
              v-for="question in currentPageHelpConfig.questions"
              :key="question"
              type="button"
              :class="{ active: question === legacySelectedQuestion }"
              @click="handleLegacyHelpQuestion(question)"
            >
              {{ question }}
            </button>
          </div>
          <article v-if="legacySelectedQuestion" class="page-help__legacy-doc">
            <h1>新增视频设备</h1>

            <img class="page-help__legacy-doc-image" :src="cameraGuideImage1" alt="新增视频设备入口" />

            <h2>路径</h2>
            <p>视频中心 → 视频设备 → 新增设备</p>

            <h2>概要</h2>
            <p>
              视频设备新增功能用于将摄像头接入边缘网关的视频中心。用户可以通过新增设备入口进入接入流程，选择摄像头接入方式，扫描或填写摄像头信息，并完成账号认证。新增成功后，摄像头会出现在视频设备列表中，后续可用于实时预览、分屏展示、告警联动和录像查看。
            </p>

            <h2>操作步骤</h2>
            <ol>
              <li>进入网关地址页，点击顶部导航栏中的“视频中心”。</li>
              <li>在左侧菜单中选择“视频设备”。</li>
              <li>点击页面中的“新增设备”按钮，进入视频设备新增流程。</li>
              <li>
                选择设备接入方式。
                <br />
                可根据摄像头实际接入方式选择对应类型，例如 Onvif、GB/T28181、固定地址、插件或 Agent 接入。
              </li>
              <li>
                如果选择 Onvif 接入，可先进行设备扫描。
                <br />
                系统会扫描当前网络环境中的摄像头设备，并展示可接入的设备列表。
              </li>
            </ol>

            <img class="page-help__legacy-doc-image" :src="cameraGuideImage2" alt="扫描摄像头设备" />

            <ol start="6">
              <li>
                在扫描结果中选择需要新增的摄像头。
                <br />
                已接入的设备不可重复选择，未接入的设备可以勾选后继续操作。
              </li>
              <li>点击“下一步”或“绑定设备”，进入账号认证。</li>
              <li>
                输入摄像头账号和密码。
                <br />
                通常需要填写摄像头自身的登录账号和密码，用于完成设备认证和接入。
              </li>
            </ol>

            <img class="page-help__legacy-doc-image" :src="cameraGuideImage3" alt="摄像头账号认证" />

            <ol start="9">
              <li>
                提交认证信息。
                <br />
                系统会校验账号密码，并返回绑定结果。
              </li>
              <li>
                查看绑定结果。
                <br />
                绑定成功的摄像头会加入视频设备列表；绑定失败的摄像头可重新输入账号密码后再次尝试。
              </li>
              <li>
                确认完成新增。
                <br />
                新增成功后，可返回视频设备列表查看摄像头名称、IP、厂商、状态等信息。
              </li>
            </ol>

            <p>
              后续可点击摄像头进行视频预览，也可以在分屏展示、告警联动、自动录像等功能中使用该摄像头。
            </p>
          </article>
        </div>
      </div>
      <button
        class="page-help__trigger"
        v-show="false"
        type="button"
        aria-label="智能对话助手"
        @pointerdown="startPageHelpDrag"
        @click="togglePageHelp"
      >
        <img :src="aiChatIcon" alt="" draggable="false">
      </button>
      <div v-show="false" class="page-help__bubble">
        <div class="page-help__toolbar">
          <div class="page-help__brand">
            <div>
              <strong>AI 智能助手</strong>
            </div>
          </div>
          <div class="page-help__actions">
            <button type="button" title="新对话" aria-label="新对话" @click.stop="resetPageHelpConversation">
              <i class="i-ant-design-plus-outlined" />
            </button>
            <button type="button" title="对话记录" aria-label="对话记录" @click.stop>
              <i class="i-ant-design-history-outlined" />
            </button>
            <button
              type="button"
              :title="pageHelpWide ? '恢复宽度' : '放大宽度'"
              :aria-label="pageHelpWide ? '恢复宽度' : '放大宽度'"
              :class="{ active: pageHelpWide }"
              @click.stop="togglePageHelpWide"
            >
              <i :class="pageHelpWide ? 'i-ant-design-compress-outlined' : 'i-ant-design-expand-alt-outlined'" />
            </button>
            <button type="button" title="关闭" aria-label="关闭智能助手" @click.stop="pageHelpOpen = false">
              <i class="i-ant-design-close-outlined" />
            </button>
          </div>
        </div>
        <div class="page-help__body">
          <div v-if="!pageHelpHasConversation" class="page-help__empty">
            <h3>开始和智能体对话</h3>
            <p>{{ defaultPageHelpMessage }}</p>
            <div class="page-help__quick-list">
              <button
                v-for="question in pageHelpQuickQuestions"
                :key="question"
                type="button"
                @click="sendPageHelpQuestion(question)"
              >
                {{ question }}
              </button>
            </div>
          </div>
          <div v-else class="page-help__messages">
            <div
              v-for="message in pageHelpMessages"
              :key="message.id"
              class="page-help__message"
              :class="`is-${message.role}`"
            >
              <div class="page-help__message-bubble">
                {{ message.content }}
                <div v-if="message.cameraGuide" class="page-help__camera-guide">
                  <div class="page-help__camera-guide-hero">
                    <div>
                      <span>视频中心</span>
                      <strong>新增视频设备</strong>
                      <p>将摄像头接入边缘网关的视频中心，完成后可用于实时预览、分屏展示、告警联动和录像查看。</p>
                    </div>
                    <i class="i-ant-design-video-camera-outlined" />
                  </div>
                  <div class="page-help__camera-guide-info">
                    <div>
                      <span>路径</span>
                      <strong>视频中心 → 视频设备 → 新增设备</strong>
                    </div>
                    <div>
                      <span>适用场景</span>
                      <strong>Onvif、GB/T28181、固定地址、插件或 Agent 接入</strong>
                    </div>
                  </div>
                  <div class="page-help__camera-guide-summary">
                    <span>概要</span>
                    <p>视频设备新增功能用于将摄像头接入边缘网关的视频中心。用户可以通过新增设备入口进入接入流程，选择摄像头接入方式，扫描或填写摄像头信息，并完成账号认证。新增成功后，摄像头会出现在视频设备列表中，后续可用于实时预览、分屏展示、告警联动和录像查看。</p>
                  </div>
                  <div class="page-help__camera-guide-flow">
                    <article
                      v-for="(item, index) in cameraGuideImages"
                      :key="item.title"
                      class="page-help__camera-guide-step"
                    >
                      <div class="page-help__camera-guide-shot">
                        <img :src="item.image" :alt="item.title">
                      </div>
                      <div class="page-help__camera-guide-copy">
                        <em>{{ index + 1 }}</em>
                        <div>
                          <strong>{{ item.title }}</strong>
                          <p>{{ item.desc }}</p>
                        </div>
                      </div>
                    </article>
                  </div>
                  <div class="page-help__camera-guide-steps">
                    <span>操作步骤</span>
                    <section
                      v-for="(group, groupIndex) in cameraGuideStepGroups"
                      :key="group.title"
                      class="page-help__camera-guide-step-group"
                    >
                      <h4>
                        <em>{{ groupIndex + 1 }}</em>
                        {{ group.title }}
                      </h4>
                      <ol>
                        <li v-for="step in group.steps" :key="step">{{ step }}</li>
                      </ol>
                    </section>
                  </div>
                </div>
                <button
                  v-if="message.ticketId"
                  class="page-help__ticket-link"
                  type="button"
                  @click="openPageHelpTicketList"
                >
                  <i class="i-ant-design-profile-outlined" />
                  去工单管理
                </button>
                <div v-if="message.ticketDraft" class="page-help__ticket-card">
                  <div class="page-help__ticket-row">
                    <span>板块分类</span>
                    <div class="page-help__ticket-tags">
                      <em v-for="category in message.ticketDraft.categories" :key="category">{{ category }}</em>
                    </div>
                  </div>
                  <div class="page-help__ticket-row">
                    <span>描述</span>
                    <strong>{{ message.ticketDraft.description }}</strong>
                    <div class="page-help__ticket-images">
                      <img
                        v-for="image in message.ticketDraft.images"
                        :key="image"
                        :src="image"
                        alt="工单补充图片"
                      >
                    </div>
                  </div>
                  <div class="page-help__ticket-row">
                    <span>联系方式</span>
                    <strong>{{ message.ticketDraft.contact }}</strong>
                  </div>
                  <button
                    class="page-help__ticket-submit"
                    type="button"
                    :disabled="message.submitted"
                    @click="confirmPageHelpTicket(message)"
                  >
                    {{ message.submitted ? '已提交' : '确认提交' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="page-help__mode-bar">
          <button
            type="button"
            :class="{ active: pageHelpTicketMode }"
            @click="togglePageHelpTicketMode"
          >
            工单提交
          </button>
        </div>
        <div class="page-help__composer">
          <div class="page-help__composer-input">
            <span v-if="pageHelpTicketMode" class="page-help__composer-tag">
              工单提交
              <button type="button" title="删除" aria-label="删除工单提交标签" @click="pageHelpTicketMode = false">
                <i class="i-ant-design-close-outlined" />
              </button>
            </span>
            <input
              v-model="pageHelpInput"
              type="text"
              placeholder="输入问题并回车发送"
              @keydown.enter="sendPageHelpQuestion()"
            >
          </div>
          <div class="page-help__composer-bottom">
            <div class="page-help__composer-tools">
              <button class="page-help__tool-btn" type="button" aria-label="选择图片">
                <i class="i-ant-design-plus-outlined" />
              </button>
              <button class="page-help__tool-btn" type="button" aria-label="选择文件夹">
                <i class="i-ant-design-folder-open-outlined" />
              </button>
            </div>
            <button class="page-help__send" type="button" aria-label="发送" @click="sendPageHelpQuestion()">
              <i class="i-ant-design-arrow-up-outlined" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.project-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: $bg-page;
}

/* ===== 顶栏（带阴影） ===== */
.layout-header {
  height: $header-h;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  z-index: 10;
  // 关键：顶栏下边框阴影（原 .ant-pro-top-nav-header）
  box-shadow: $shadow-header;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;

  .logo-box {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: $color-primary;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
  }

  .project-name {
    font-size: 16px;
    font-weight: 600;
    color: $text-base;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.usage-alert-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(250, 140, 22, 0.34);
  border-radius: 9999px;
  background: rgba(250, 140, 22, 0.08);
  color: #fa8c16;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  transition: all 0.15s;

  i {
    font-size: 14px;
  }

  em {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 999px;
    background: #fa8c16;
    color: #fff;
    font-size: 11px;
    line-height: 18px;
    font-style: normal;
    text-align: center;
  }

  &:hover {
    border-color: #fa8c16;
    background: rgba(250, 140, 22, 0.12);
  }
}

.usage-alert-panel {
  width: 380px;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 2px 0 12px;
    border-bottom: 1px solid $border-color-card;

    button {
      flex: 0 0 auto;
      border: none;
      background: transparent;
      color: $color-primary;
      cursor: pointer;
      font-family: inherit;
      font-size: 12px;
      line-height: 18px;
      padding: 0;

      &:hover {
        color: $color-primary-hover;
      }
    }
  }

  &__summary {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    min-width: 0;

    strong {
      color: #ff4d4f;
      font-size: 20px;
      line-height: 24px;
      font-weight: 700;
    }

    span {
      color: $text-secondary;
      font-size: 12px;
      line-height: 18px;
    }
  }

  &__list {
    display: grid;
    gap: 0;
    max-height: 320px;
    padding: 12px 0;
    overflow-y: auto;
  }

  &__empty {
    padding: 24px 0;
    color: $text-tertiary;
    font-size: 13px;
    text-align: center;
  }

  &__expand {
    width: 100%;
    height: 32px;
    border: 1px solid $color-primary;
    border-radius: 6px;
    background: $color-primary;
    color: #fff;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;

    &:hover {
      background: $color-primary-hover;
    }
  }
}

.usage-alert-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  padding: 8px 0;
  border-bottom: 1px solid #eef1f6;

  &:last-child {
    border-bottom: 0;
  }

  &__name {
    min-width: 0;
    display: grid;
    gap: 2px;
    overflow: hidden;

    strong,
    span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    strong {
      color: $text-base;
      font-size: 13px;
      line-height: 18px;
    }

    span {
      color: $text-secondary;
      font-size: 12px;
      line-height: 18px;
    }
  }

  &__value {
    flex: 0 0 auto;
    font-size: 12px;
    line-height: 18px;
    white-space: nowrap;

    strong {
      color: #ff4d4f;
      font-weight: 700;
    }

    span {
      color: $text-tertiary;
    }
  }
}

.usage-capacity-modal {
  display: grid;
  justify-items: center;
  padding: 10px 8px 4px;
  text-align: center;

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    margin-bottom: 12px;
    border-radius: 50%;
    background: $color-primary-bg;
    color: $color-primary;

    i {
      font-size: 22px;
    }
  }

  h3 {
    margin: 0 0 8px;
    font-size: 18px;
    line-height: 26px;
    color: $text-base;
  }

  p {
    margin: 0 0 16px;
    font-size: 13px;
    line-height: 20px;
    color: $text-tertiary;
  }

  &__qr {
    width: 168px;
    height: 168px;
    object-fit: contain;
    margin-bottom: 18px;
    border: 1px solid #eef1f6;
    border-radius: 8px;
  }

  &__btn {
    min-width: 96px;
    height: 32px;
    border: 1px solid $color-primary;
    border-radius: 6px;
    background: $color-primary;
    color: #fff;
    cursor: pointer;
    font-family: inherit;
    font-size: 13px;
  }
}

/* ===== 工单管理入口 ===== */
.ticket-entry-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid $border-color-card;
  border-radius: 9999px;
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 400;
  color: $text-base;
  background: #fff;
  transition: all 0.2s;

  &:hover {
    color: $color-primary;
    border-color: $color-primary;
  }

  .ticket-entry-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    color: inherit;
  }
}

/* 新手引导下拉 */
.guide-trigger {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid $border-color-card;
  border-radius: 9999px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  color: $text-base;
  transition: all 0.15s;

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
  }

  .guide-arrow { font-size: 10px; color: $text-muted; }
}

/* 场景切换下拉框 */
.scenario-trigger {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid $border-color-card;
  border-radius: 9999px;
  background: #fff;
  cursor: pointer;
  font-size: 13px;
  color: $text-base;
  transition: border-color 0.2s;

  &:hover {
    border-color: $color-primary;
    color: $color-primary;

    .scenario-arrow {
      color: $color-primary;
    }
  }

  .scenario-arrow {
    font-size: 10px;
    color: $text-muted;
    transition: color 0.2s;
  }
}

.lang-trigger {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 14px;
  color: $text-secondary;

  .arrow {
    font-size: 10px;
  }
}

// 顶栏图标（通知、换肤）
.header-icon {
  font-size: 16px;
  cursor: pointer;
  color: $text-base;
  line-height: 1;
}

/* ===== 主体 ===== */
.layout-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* ===== 侧栏（支持折叠/展开） ===== */
.layout-sider {
  width: $sider-w;
  background: #fff;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: $shadow-sider;
  border-right: 1px solid $border-color-card;
  transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1);

  /* 折叠态：窄边栏，只显图标 */
  &.collapsed {
    width: 60px;

    .sider-menu {
      padding: 4px;
      align-items: center;
    }

    .menu-item {
      width: 44px;
      height: 40px;
      padding: 0;
      margin: 2px 0;
      justify-content: center;
      border-radius: 10px;

      .menu-icon {
        font-size: 22px;
        margin: 0;
      }
    }

    .collapse-btn {
      padding: 0;
      justify-content: center;
      height: 36px;

      i { margin: 0; }
    }

    .sider-user {
      justify-content: center;
      padding: 6px 0;
    }
  }
}

/* 折叠按钮 */
.collapse-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 44px;
  padding: 0 16px;
  cursor: pointer;
  color: $text-tertiary;
  font-size: 13px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
  transition: color 0.15s;

  i {
    font-size: 16px;
  }

  .collapse-text {
    font-weight: 500;
  }

  &:hover {
    color: $color-primary;
  }
}

/* 菜单列表 */
.sider-menu {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  display: flex;
  flex-direction: column;
  /* 完全隐藏原生滚动条，不占布局空间 */
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.menu-item {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 14px;
  margin: 2px 0;
  border-radius: $radius-menu-item;
  font-size: 14px;
  color: $text-secondary;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;

  .menu-icon {
    font-size: 22px;
    color: $text-tertiary;
    margin: 0 12px 0 2px;
    flex-shrink: 0;
  }

  .menu-label {
    font-weight: 500;
    white-space: nowrap;
  }

  &:hover {
    background: $bg-hover;

    .menu-icon {
      color: $color-primary;
    }
  }

  &.is-selected {
    background: $color-primary-bg;
    color: $color-primary;

    .menu-icon {
      color: $color-primary;
    }
  }
}

/* 底部固定区：用户信息 + 系统管理 + 换肤 */
.sider-footer {
  flex-shrink: 0;
  border-top: 1px solid $border-color-card;
  margin-top: 8px;       /* 与业务菜单项间距一致（避免归档看起来特殊） */
  background: $bg-card;

  /* 操作按钮组：竖向排列，每个按钮在侧栏宽度内水平居中 */
  .footer-actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 2px;
    padding: 4px 4px 8px;
  }

  /* 缩小版图标按钮（比业务菜单图标小约 1/3） */
  .footer-icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 28px;
    padding: 0 10px;
    border-radius: $radius-menu-item;
    color: $text-secondary;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
    font-size: 13px;

    i {
      font-size: 16px;
      color: $text-tertiary;
    }

    &:hover {
      background: $bg-hover;
      color: $color-primary;

      i {
        color: $color-primary;
      }
    }

    &.is-selected {
      color: $color-primary;

      i {
        color: $color-primary;
      }
    }
  }
}

/* 用户区 */
.sider-user {
  padding: 6px;
  display: flex;
  align-items: center;
  gap: 8px;

  .user-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: $color-primary;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    flex-shrink: 0;
  }

  .user-info {
    flex: 1;
    overflow: hidden;

    .user-name {
      font-size: 13px;
      font-weight: 500;
      color: $text-base;
      line-height: 1.3;
    }

    .user-id {
      font-size: 12px;
      color: $text-tertiary;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .user-arrow {
    font-size: 12px;
    color: $text-tertiary;
    cursor: pointer;
  }
}

/* ===== 主内容 ===== */
.layout-main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.page-help {
  position: fixed;
  right: 72px;
  bottom: 58px;
  z-index: 120;

  &.is-open {
    .page-help__bubble {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
      pointer-events: auto;
    }
  }

  &.is-wide {
    .page-help__bubble {
      width: clamp(620px, 40vw, 720px);
    }
  }

  &.is-dragging {
    .page-help__trigger {
      cursor: grabbing;
      transform: none;
    }
  }

  &__trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: #fff;
    overflow: hidden;
    box-shadow: 0 10px 28px rgba(17, 20, 24, 0.22);
    cursor: grab;
    touch-action: none;
    user-select: none;
    transition: transform 0.15s ease, box-shadow 0.15s ease;

    img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }

    &:hover,
    &:focus-visible {
      box-shadow: 0 12px 32px rgba(17, 20, 24, 0.28);
      transform: translateY(-1px);
      outline: none;
    }
  }

  &__legacy-trigger {
    position: absolute;
    right: 0;
    bottom: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: 1px solid rgba(110, 75, 255, 0.18);
    border-radius: 50%;
    background: #fff;
    color: #6e4bff;
    box-shadow: 0 8px 22px rgba(17, 20, 24, 0.14);
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease;

    i {
      font-size: 21px;
    }

    &:hover,
    &:focus-visible {
      border-color: rgba(110, 75, 255, 0.42);
      box-shadow: 0 10px 26px rgba(17, 20, 24, 0.2);
      transform: translateY(-1px);
      outline: none;
    }
  }

  &__legacy-bubble {
    position: absolute;
    right: 0;
    bottom: 48px;
    width: 340px;
    padding: 14px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 12px;
    background: linear-gradient(180deg, #fbfaff 0%, #fff 34%);
    box-shadow: 0 18px 44px rgba(17, 20, 24, 0.16);
    opacity: 0;
    visibility: hidden;
    transform: translateY(6px);
    pointer-events: none;
    transition: width 0.2s ease, opacity 0.16s ease, transform 0.16s ease, visibility 0.16s ease;

    &.has-answer {
      width: min(920px, calc(100vw - 80px));
    }

    &.open {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
      pointer-events: auto;
    }

    &::after {
      content: '';
      position: absolute;
      right: 13px;
      bottom: -7px;
      width: 14px;
      height: 14px;
      background: #fff;
      border-right: 1px solid rgba(15, 23, 42, 0.08);
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
      transform: rotate(45deg);
    }

  }

  &__legacy-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(15, 23, 42, 0.06);
  }

  &__legacy-head-main {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  &__legacy-cancel {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: #8a94a6;
    font-family: inherit;
    cursor: pointer;
    transition: color 0.15s ease;

    i {
      font-size: 16px;
    }

    &:hover,
    &:focus-visible {
      color: #6e4bff;
      outline: none;
    }
  }

  &__legacy-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: rgba(110, 75, 255, 0.1);
    color: #6e4bff;

    i {
      font-size: 18px;
    }
  }

  &__legacy-subtitle {
    margin-top: 2px;
    color: #8a94a6;
    font-size: 12px;
    line-height: 18px;
  }

  &__legacy-content {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;

    .has-answer & {
      grid-template-columns: 240px minmax(0, 1fr);
      align-items: start;
    }
  }

  &__legacy-questions {
    display: grid;
    gap: 8px;
    counter-reset: legacy-question;

    button {
      display: grid;
      grid-template-columns: 24px minmax(0, 1fr) 14px;
      align-items: center;
      gap: 8px;
      width: 100%;
      min-height: 42px;
      padding: 9px 10px;
      border: 1px solid #edf0f6;
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.86);
      color: #3a3f47;
      font-family: inherit;
      font-size: 13px;
      line-height: 20px;
      text-align: left;
      cursor: pointer;
      white-space: normal;
      box-shadow: 0 4px 12px rgba(17, 20, 24, 0.04);
      transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

      &::before {
        counter-increment: legacy-question;
        content: counter(legacy-question);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        background: #f3f5fa;
        color: #8a94a6;
        font-size: 12px;
        font-weight: 600;
      }

      &::after {
        content: '›';
        color: #aab2c0;
        font-size: 18px;
        line-height: 1;
      }

      &:hover,
      &.active {
        border-color: rgba(110, 75, 255, 0.24);
        background: #fff;
        color: #6e4bff;
        box-shadow: 0 8px 18px rgba(110, 75, 255, 0.12);
        transform: translateY(-1px);

        &::before {
          background: #6e4bff;
          color: #fff;
        }

        &::after {
          color: #6e4bff;
        }
      }

      &.active {
        font-weight: 600;
      }
    }
  }

  &__legacy-title {
    color: #111418;
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
  }

  &__legacy-answer {
    max-height: min(560px, calc(100vh - 180px));
    overflow-y: auto;
    padding: 14px;
    border: 1px solid #eef1f6;
    border-radius: 8px;
    background: linear-gradient(180deg, #fbfcff 0%, #fff 46%);
  }

  &__legacy-answer-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;

    span {
      color: #8a94a6;
      font-size: 12px;
      line-height: 18px;
    }

    strong {
      color: #111418;
      font-size: 15px;
      line-height: 22px;
    }
  }

  &__legacy-path {
    display: grid;
    gap: 4px;
    margin-bottom: 10px;
    padding: 9px 10px;
    border: 1px solid rgba(110, 75, 255, 0.12);
    border-radius: 6px;
    background: rgba(110, 75, 255, 0.06);

    span {
      color: #8a94a6;
      font-size: 12px;
      line-height: 18px;
    }

    strong {
      color: #3a2ab8;
      font-size: 13px;
      line-height: 20px;
      font-weight: 600;
    }
  }

  &__legacy-summary {
    margin: 0 0 12px;
    color: #4b5563;
    font-size: 13px;
    line-height: 22px;
  }

  &__legacy-answer-steps {
    display: grid;
    gap: 10px;

    section {
      padding: 10px 12px;
      border: 1px solid #eef1f6;
      border-radius: 8px;
      background: #fff;
    }

    h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px;
      color: #111418;
      font-size: 13px;
      line-height: 20px;
      font-weight: 600;

      em {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #6e4bff;
        color: #fff;
        font-size: 12px;
        font-style: normal;
        font-weight: 600;
      }
    }

    ol {
      display: grid;
      gap: 5px;
      margin: 0;
      padding-left: 18px;
      color: #4b5563;
      font-size: 13px;
      line-height: 21px;
    }
  }

  &__legacy-doc {
    max-height: min(620px, calc(100vh - 180px));
    overflow-y: auto;
    padding: 6px 6px 18px;
    color: #262626;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
    font-size: 15px;
    line-height: 1.86;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    h1 {
      margin: 0 0 28px;
      color: #1f2329;
      font-size: 32px;
      line-height: 1.35;
      font-weight: 700;
    }

    h2 {
      margin: 28px 0 10px;
      color: #1f2329;
      font-size: 18px;
      line-height: 1.5;
      font-weight: 700;
    }

    p {
      margin: 0 0 16px;
    }

    ol {
      margin: 0 0 18px;
      padding-left: 24px;
    }

    li {
      margin: 8px 0;
      padding-left: 2px;
    }
  }

  &__legacy-doc-image {
    display: block;
    max-width: 100%;
    margin: 18px 0 22px;
    border-radius: 6px;
  }

  @media (max-width: 760px) {
    &__legacy-bubble.has-answer {
      width: min(420px, calc(100vw - 32px));
    }

    &__legacy-content {
      .has-answer & {
        grid-template-columns: 1fr;
      }
    }
  }

  &__bubble {
    position: absolute;
    right: 0;
    bottom: 62px;
    display: flex;
    flex-direction: column;
    width: clamp(500px, 32vw, 560px);
    height: min(700px, calc(100vh - 88px));
    padding: 0;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 16px 42px rgba(17, 20, 24, 0.18);
    opacity: 0;
    visibility: hidden;
    transform: translateY(8px);
    pointer-events: none;
    transition: opacity 0.16s ease, transform 0.16s ease, visibility 0.16s ease;

    &::after {
      content: '';
      position: absolute;
      right: 14px;
      bottom: -7px;
      width: 14px;
      height: 14px;
      background: #fff;
      border-right: 1px solid rgba(15, 23, 42, 0.08);
      border-bottom: 1px solid rgba(15, 23, 42, 0.08);
      transform: rotate(45deg);
    }
  }

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 48px;
    padding: 10px 14px;
    border-bottom: 1px solid #eef1f6;
  }

  &__brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
    color: #111418;

    div {
      min-width: 0;
    }

    strong {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 14px;
      line-height: 20px;
      font-weight: 600;
    }
  }

  &__actions {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex: 0 0 auto;

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      padding: 0;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: #64748b;
      font-size: 16px;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;

      &:hover,
      &.active {
        background: rgba(110, 75, 255, 0.1);
        color: #6e4bff;
      }
    }
  }

  &__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 14px;
    min-height: 0;
    padding: 18px 18px 12px;
    background: linear-gradient(180deg, #fbfcff 0%, #fff 42%);
    overflow: hidden;
  }

  &__empty {
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    max-width: 360px;
    margin: 0 auto;
    text-align: center;

    h3 {
      margin: 0 0 12px;
      color: #111418;
      font-size: 22px;
      line-height: 30px;
      font-weight: 700;
    }

    p {
      margin: 0;
      color: #64748b;
      font-size: 14px;
      line-height: 22px;
    }
  }

  &__quick-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
    margin-top: 24px;

    button {
      max-width: 100%;
      min-height: 32px;
      padding: 6px 12px;
      border: 1px solid #d8e2f0;
      border-radius: 999px;
      background: #fff;
      color: #3a3f47;
      font-size: 12px;
      line-height: 18px;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.04);
      transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;

      &:hover {
        border-color: rgba(110, 75, 255, 0.48);
        background: rgba(110, 75, 255, 0.04);
        color: #6e4bff;
      }
    }
  }

  &__messages {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    padding: 2px 4px 4px;
    scrollbar-width: thin;
  }

  &__message {
    display: flex;
    align-items: flex-start;

    &.is-user {
      justify-content: flex-end;

      .page-help__message-bubble {
        border-color: #6e4bff;
        background: #6e4bff;
        color: #fff;
        border-bottom-right-radius: 4px;
      }
    }

    &.is-assistant {
      justify-content: flex-start;

      .page-help__message-bubble {
        max-width: 92%;
        border-bottom-left-radius: 4px;
      }
    }
  }

  &__message-bubble {
    max-width: 78%;
    padding: 10px 12px;
    border: 1px solid #e5eaf3;
    border-radius: 10px;
    background: #fff;
    color: #273142;
    font-size: 13px;
    line-height: 21px;
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
    word-break: break-word;
  }

  &__ticket-card {
    display: grid;
    gap: 12px;
    margin-top: 12px;
    padding: 12px;
    border: 1px solid #e7edf5;
    border-radius: 10px;
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
    box-shadow: 0 8px 22px rgba(20, 23, 31, 0.05);
  }

  &__ticket-row {
    display: grid;
    gap: 6px;
    padding-bottom: 10px;
    border-bottom: 1px solid #f0f3f8;

    &:last-of-type {
      padding-bottom: 0;
      border-bottom: 0;
    }

    span {
      color: #8a96a8;
      font-size: 12px;
      line-height: 18px;
    }

    strong {
      color: #273142;
      font-size: 13px;
      font-weight: 600;
      line-height: 20px;
    }
  }

  &__ticket-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;

    em {
      height: 24px;
      padding: 0 9px;
      border-radius: 999px;
      background: rgba(110, 75, 255, 0.1);
      color: #6e4bff;
      font-size: 12px;
      font-style: normal;
      line-height: 24px;
      font-weight: 500;
    }
  }

  &__ticket-images {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    margin-top: 4px;

    img {
      width: 100%;
      aspect-ratio: 16 / 9;
      border-radius: 8px;
      border: 1px solid #dbe4f1;
      object-fit: cover;
      background: #f7f9fc;
      box-shadow: 0 1px 3px rgba(20, 23, 31, 0.06);
    }
  }

  &__ticket-submit {
    justify-self: end;
    height: 32px;
    padding: 0 14px;
    border: 0;
    border-radius: 6px;
    background: #6e4bff;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(110, 75, 255, 0.28);
    transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

    &:hover {
      background: #7d5cff;
      box-shadow: 0 4px 16px rgba(110, 75, 255, 0.38);
    }

    &:active {
      background: #5d3bff;
      transform: scale(0.96);
    }

    &:disabled {
      background: #eef1f6;
      color: #8895ab;
      box-shadow: none;
      cursor: default;
      transform: none;
    }
  }

  &__ticket-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 32px;
    margin-top: 10px;
    padding: 0 14px;
    border: 1px solid #6e4bff;
    border-radius: 6px;
    color: #fff;
    background: #6e4bff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 2px 12px rgba(110, 75, 255, 0.28);
    transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

    &:hover {
      background: #7d5cff;
      box-shadow: 0 4px 16px rgba(110, 75, 255, 0.38);
    }

    &:active {
      background: #5d3bff;
      transform: scale(0.96);
    }
  }

  &__camera-guide {
    display: grid;
    gap: 12px;
    width: min(100%, 520px);
    margin-top: 12px;
    padding: 12px;
    border: 1px solid #e7edf5;
    border-radius: 10px;
    background: linear-gradient(180deg, #ffffff 0%, #fafbff 100%);
    box-shadow: 0 8px 22px rgba(20, 23, 31, 0.05);
  }

  &__camera-guide-hero {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 14px;
    border-radius: 10px;
    background: linear-gradient(135deg, rgba(110, 75, 255, 0.10) 0%, rgba(245, 248, 255, 0.95) 100%);

    span {
      display: block;
      margin-bottom: 4px;
      color: #6e4bff;
      font-size: 12px;
      line-height: 18px;
      font-weight: 600;
    }

    strong {
      display: block;
      color: #111418;
      font-size: 18px;
      line-height: 26px;
      font-weight: 700;
    }

    p {
      margin: 6px 0 0;
      color: #64748b;
      font-size: 12px;
      line-height: 20px;
    }

    > i {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: #fff;
      color: #6e4bff;
      font-size: 22px;
      box-shadow: 0 8px 18px rgba(110, 75, 255, 0.12);
    }
  }

  &__camera-guide-flow {
    display: grid;
    gap: 10px;
  }

  &__camera-guide-info {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;

    div {
      display: grid;
      gap: 5px;
      padding: 10px;
      border: 1px solid #eef1f6;
      border-radius: 8px;
      background: #fff;
    }

    span {
      color: #8a96a8;
      font-size: 12px;
      line-height: 18px;
    }

    strong {
      margin: 0;
      color: #273142;
      font-size: 12px;
      line-height: 20px;
      font-weight: 600;
    }
  }

  &__camera-guide-summary {
    display: grid;
    gap: 6px;
    padding: 10px 12px;
    border-left: 3px solid #6e4bff;
    border-radius: 8px;
    background: #fff;

    span {
      color: #8a96a8;
      font-size: 12px;
      line-height: 18px;
    }

    p {
      margin: 0;
      color: #273142;
      font-size: 12px;
      line-height: 20px;
    }
  }

  &__camera-guide-step {
    display: grid;
    grid-template-columns: 132px minmax(0, 1fr);
    gap: 12px;
    align-items: center;
    min-width: 0;
    padding: 10px;
    border: 1px solid #eef1f6;
    border-radius: 8px;
    background: #fff;
  }

  &__camera-guide-shot {
    overflow: hidden;
    aspect-ratio: 16 / 10;
    border: 1px solid #dbe4f1;
    border-radius: 6px;
    background: #f7f9fc;

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__camera-guide-copy {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;

    em {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(110, 75, 255, 0.1);
      color: #6e4bff;
      font-size: 12px;
      line-height: 22px;
      font-style: normal;
      font-weight: 700;
    }

    div {
      min-width: 0;
    }

    strong {
      display: block;
      margin-bottom: 4px;
      color: #273142;
      font-size: 13px;
      line-height: 20px;
      font-weight: 600;
    }

    p {
      margin: 0;
      color: #64748b;
      font-size: 12px;
      line-height: 18px;
    }
  }

  &__camera-guide-tip {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 9px 10px;
    border: 1px solid rgba(110, 75, 255, 0.12);
    border-radius: 8px;
    background: #faf9ff;
    color: #64748b;
    font-size: 12px;
    line-height: 18px;

    i {
      flex: 0 0 auto;
      margin-top: 1px;
      color: #6e4bff;
      font-size: 14px;
    }
  }

  &__camera-guide-steps {
    display: grid;
    gap: 10px;
    padding: 10px;
    border: 1px solid #eef1f6;
    border-radius: 8px;
    background: #fff;

    > span {
      color: #8a96a8;
      font-size: 12px;
      line-height: 18px;
    }

  }

  &__camera-guide-step-group {
    display: grid;
    gap: 7px;
    padding: 10px;
    border-radius: 8px;
    background: #fafbfc;

    h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      color: #273142;
      font-size: 13px;
      line-height: 20px;
      font-weight: 600;

      em {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: rgba(110, 75, 255, 0.10);
        color: #6e4bff;
        font-size: 12px;
        line-height: 20px;
        font-style: normal;
      }
    }

    ol {
      display: grid;
      gap: 6px;
      margin: 0;
      padding-left: 18px;
      color: #273142;
      font-size: 12px;
      line-height: 19px;
    }

    li {
      padding-left: 2px;
    }
  }

  &__welcome {
    display: grid;
    justify-items: center;
    text-align: center;
    max-width: 430px;
    margin: 0 auto 24px;

    h3 {
      margin: 18px 0 10px;
      font-size: 22px;
      line-height: 30px;
      font-weight: 700;
      color: #111418;
    }

    p {
      margin: 0;
      font-size: 14px;
      line-height: 22px;
      color: #64748b;
    }
  }

  &__avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 58px;
    height: 58px;
    flex: 0 0 auto;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 12px 28px rgba(110, 75, 255, 0.18);

    img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }
  }

  &__prompt-grid {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 10px;
    max-width: 520px;
    margin: 0 auto;

    button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 36px;
      max-width: 100%;
      padding: 7px 12px;
      border: 1px solid #cfe0ff;
      border-radius: 999px;
      background: #fff;
      color: #486180;
      font-size: 13px;
      line-height: 20px;
      cursor: pointer;
      box-shadow: 0 6px 18px rgba(20, 23, 31, 0.04);
      transition: border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;

      i {
        flex: 0 0 auto;
        color: #6e4bff;
        font-size: 15px;
      }

      span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      &:hover {
        border-color: rgba(110, 75, 255, 0.48);
        color: #6e4bff;
        box-shadow: 0 8px 22px rgba(110, 75, 255, 0.08);
      }
    }
  }

  &__suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding: 0 22px 18px;

    button {
      min-height: 36px;
      padding: 7px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      background: #f8fafc;
      font-size: 13px;
      line-height: 20px;
      color: #4b5563;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;

      &:hover {
        border-color: rgba(110, 75, 255, 0.36);
        background: rgba(110, 75, 255, 0.08);
        color: #6e4bff;
      }
    }
  }

  &__composer {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    margin: 0 16px 16px;
    min-height: 86px;
    padding: 12px 12px 10px;
    border: 1px solid #d8e2f0;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 10px 30px rgba(20, 23, 31, 0.06);
  }

  &__mode-bar {
    display: flex;
    justify-content: flex-start;
    padding: 0 16px 8px;

    button {
      height: 28px;
      padding: 0 12px;
      border: 1px solid #d8e2f0;
      border-radius: 999px;
      background: #fff;
      color: #64748b;
      font-size: 12px;
      cursor: pointer;
      transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease;

      &.active,
      &:hover {
        border-color: rgba(110, 75, 255, 0.48);
        background: rgba(110, 75, 255, 0.08);
        color: #6e4bff;
      }
    }
  }

  &__composer-input {
    min-width: 0;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 8px;

    .page-help__composer-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 24px;
      padding: 0 4px 0 9px;
      border-radius: 999px;
      background: rgba(110, 75, 255, 0.1);
      color: #6e4bff;
      font-size: 12px;
      line-height: 24px;
      white-space: nowrap;

      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: transparent;
        color: inherit;
        cursor: pointer;

        i {
          font-size: 11px;
        }
      }
    }

    input {
      width: 100%;
      border: none;
      outline: none;
      background: transparent;
      color: #111418;
      font-size: 14px;
      line-height: 22px;

      &::placeholder {
        color: #9aa7b8;
      }
    }
  }

  &__composer-tools {
    display: inline-flex;
    gap: 6px;

    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      border: 1px solid #d8e2f0;
      border-radius: 50%;
      background: #fff;
      color: #64748b;
      cursor: pointer;
      transition: border-color 0.15s ease, color 0.15s ease;

      i {
        font-size: 15px;
      }

      &:hover {
        border-color: rgba(110, 75, 255, 0.48);
        color: #6e4bff;
      }
    }
  }

  &__composer-bottom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  &__send {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 32px;
    flex: 0 0 auto;
    border: none;
    border-radius: 8px;
    background: #6e4bff;
    color: #fff;
    cursor: pointer;
    box-shadow: 0 8px 18px rgba(110, 75, 255, 0.22);

    font-size: 16px;
  }
}

@media (max-width: 720px) {
  .page-help {
    right: 16px;
    bottom: 16px;

    &.is-wide {
      .page-help__bubble {
        width: calc(100vw - 32px);
      }
    }

    &__bubble {
      width: calc(100vw - 32px);
      height: min(700px, calc(100vh - 64px));
    }
  }
}
</style>
