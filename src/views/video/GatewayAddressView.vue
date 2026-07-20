<script setup lang="ts">
/**
 * 网关地址页 — 独立全屏静态页面
 * 自带顶部导航 + 左侧菜单，不使用 ProjectLayout
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import GuideOverlay from '@/components/GuideOverlay.vue'
import { useAppStore, type GuideStep } from '@/stores/app'
import aiChatIcon from '@/assets/AIchaticon.png'
import aiTicketImage1 from '@/assets/text-search/result-01.jpg'
import aiTicketImage2 from '@/assets/text-search/result-02.jpg'
import guideImage1 from '@/assets/gatewayGuide/video-device-guide-1.png'
import guideImage2 from '@/assets/gatewayGuide/video-device-guide-2.png'
import guideImage3 from '@/assets/gatewayGuide/video-device-guide-3.png'
import { createTicket } from '@/views/tickets/ticketData'
import cameraImg from '@/assets/cameras/camera.png'
import cam1 from '@/assets/text-search/result-01.jpg'
import cam2 from '@/assets/text-search/result-02.jpg'
import cam3 from '@/assets/text-search/result-03.jpg'
import cam4 from '@/assets/text-search/result-04.jpg'
import workbenchImg from '@/assets/gatewayURL/gongzuotai.png'
import iotImg from '@/assets/gatewayURL/iot.png'
import gatewayConfigImg from '@/assets/gatewayURL/wangguanpeizhi.png'
import systemManageImg from '@/assets/gatewayURL/xitongguanli.png'
import aiImg from '@/assets/gatewayURL/rengongzhineng.png'
import resourceImg from '@/assets/gatewayURL/ziyaunku.png'

type TopNav = 'workbench' | 'iot' | 'gatewayConfig' | 'video' | 'system' | 'ai' | 'resource'
const activeTopNav = ref<TopNav>('video')
const appStore = useAppStore()
const router = useRouter()
const gatewayGuideWelcomeVisible = ref(true)

const gatewayGuideStepToNav: Partial<Record<GuideStep, TopNav>> = {
  'gateway-workbench': 'workbench',
  'gateway-iot': 'iot',
  'gateway-config': 'gatewayConfig',
  'gateway-video': 'video',
  'gateway-system': 'system',
  'gateway-ai': 'ai',
  'gateway-resource': 'resource',
}

function startGatewayGuide() {
  gatewayGuideWelcomeVisible.value = false
  activeTopNav.value = 'workbench'
  appStore.guideActive = true
  appStore.setGuideStep('gateway-workbench')
}

function skipGatewayGuide() {
  gatewayGuideWelcomeVisible.value = false
}

watch(() => appStore.guideStep, (step) => {
  const nav = gatewayGuideStepToNav[step]
  if (nav) {
    activeTopNav.value = nav
    setTimeout(() => window.dispatchEvent(new Event('guide-position-refresh')), 80)
  }
})

function openWorkbenchPage() {
  activeTopNav.value = 'workbench'
}

function openIotPage() {
  activeTopNav.value = 'iot'
}

function openGatewayConfigPage() {
  activeTopNav.value = 'gatewayConfig'
}

function openVideoPage() {
  activeTopNav.value = 'video'
}

function openSystemPage() {
  activeTopNav.value = 'system'
}

function openAiPage() {
  activeTopNav.value = 'ai'
}

function openResourcePage() {
  activeTopNav.value = 'resource'
}

const aiHelpPosition = ref<{ x: number; y: number } | null>(null)
const aiHelpDragOffset = ref({ x: 0, y: 0 })
const aiHelpDragging = ref(false)
const aiHelpMoved = ref(false)
const aiHelpOpen = ref(false)
const legacyAiHelpOpen = ref(false)
const legacyAiSelectedQuestion = ref('')
const aiHelpWide = ref(false)
const aiHelpSize = 48
const aiHelpInput = ref('')

interface AiHelpMessage {
  id: number
  role: 'assistant' | 'user'
  content: string
  ticketDraft?: AiHelpTicketDraft
  submitted?: boolean
  ticketId?: string
}

interface AiHelpTicketDraft {
  categories: string[]
  description: string
  contact: string
  images: string[]
}

const defaultAiHelpMessage = '我可以帮你快速定位网关地址页的功能入口、说明当前板块能做什么，并根据你的问题给出下一步操作建议。'
let aiHelpMessageSeed = Date.now()

function createAiHelpMessageId() {
  aiHelpMessageSeed += 1
  return aiHelpMessageSeed
}

const aiHelpMessages = ref<AiHelpMessage[]>([])
const aiHelpHasConversation = computed(() => aiHelpMessages.value.length > 0)
const aiHelpTicketMode = ref(false)
const aiHelpQuickQuestions = [
  '当前板块可以做什么？',
  '帮我找到视频设备入口',
  '如何新增摄像头设备？',
]
const legacyAiHelpQuestions = [
  '监控墙如何切换布局？',
  '摄像头画面如何预览？',
  '视频设备如何新增？',
  '网关视频如何配置？',
  '视频通道状态在哪里查看？',
  '摄像头回放在哪里查看？',
]

function resetAiHelpConversation() {
  aiHelpInput.value = ''
  aiHelpMessages.value = []
  aiHelpTicketMode.value = false
}

function createAiHelpAnswer(question: string) {
  return `已收到：${question}。你可以继续补充目标，我会帮你定位入口、说明操作路径，或引导你打开对应页面。`
}

function inferAiHelpTicketCategories(content: string) {
  if (/告警|规则|事件|处理/.test(content)) return ['告警中心']
  if (/设备|物联|产品|接入/.test(content)) return ['物联网']
  if (/视频|摄像头|监控|视联/.test(content)) return ['视频中心']
  if (/网关|配置|系统/.test(content)) return ['网关配置']
  return ['其他']
}

function createAiHelpTicketDraft(content: string): AiHelpTicketDraft {
  return {
    categories: inferAiHelpTicketCategories(content),
    description: content,
    contact: '13637564734',
    images: [aiTicketImage1, aiTicketImage2],
  }
}

function sendAiHelpQuestion(question = aiHelpInput.value) {
  const content = question.trim()
  if (!content) return
  aiHelpMessages.value.push({
    id: createAiHelpMessageId(),
    role: 'user',
    content,
  })
  if (aiHelpTicketMode.value) {
    aiHelpMessages.value.push({
      id: createAiHelpMessageId(),
      role: 'assistant',
      content: '我已根据你的描述整理了一份工单，请确认后提交。',
      ticketDraft: createAiHelpTicketDraft(content),
    })
    aiHelpInput.value = ''
    return
  }
  aiHelpMessages.value.push({
    id: createAiHelpMessageId(),
    role: 'assistant',
    content: createAiHelpAnswer(content),
  })
  aiHelpInput.value = ''
}

function toggleAiHelpTicketMode() {
  aiHelpTicketMode.value = !aiHelpTicketMode.value
}

function confirmAiHelpTicket(messageItem: AiHelpMessage) {
  if (!messageItem.ticketDraft || messageItem.submitted) return
  const ticket = createTicket({
    categories: messageItem.ticketDraft.categories,
    description: messageItem.ticketDraft.description,
    contact: messageItem.ticketDraft.contact,
    attachments: ['image1.png', 'image.png'],
  })
  messageItem.submitted = true
  message.success('工单已提交')
  aiHelpMessages.value.push({
    id: createAiHelpMessageId(),
    role: 'assistant',
    content: `工单 ${ticket.id} 已提交，你可以在工单管理中查看处理进度。`,
    ticketId: ticket.id,
  })
}

function openAiHelpTicketList() {
  aiHelpOpen.value = false
  router.push('/tickets')
}

function openAiHelpFeedbackTicket() {
  aiHelpOpen.value = false
  router.push({
    path: '/tickets',
    query: { action: 'create', from: 'assistant', _t: Date.now() },
  })
}

function toggleLegacyAiHelp() {
  aiHelpOpen.value = false
  legacyAiHelpOpen.value = !legacyAiHelpOpen.value
  if (!legacyAiHelpOpen.value) legacyAiSelectedQuestion.value = ''
}

function closeLegacyAiHelp() {
  legacyAiHelpOpen.value = false
  legacyAiSelectedQuestion.value = ''
}

function handleLegacyAiHelpQuestion(question: string) {
  legacyAiSelectedQuestion.value = question
}

function startAiHelpDrag(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  aiHelpDragging.value = true
  aiHelpMoved.value = false
  aiHelpPosition.value = { x: rect.left, y: rect.top }
  aiHelpDragOffset.value = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  }
  document.addEventListener('pointermove', moveAiHelp)
  document.addEventListener('pointerup', stopAiHelpDrag)
}

function moveAiHelp(event: PointerEvent) {
  if (!aiHelpDragging.value) return
  aiHelpMoved.value = true
  const minX = 0
  const maxX = window.innerWidth - aiHelpSize / 2
  const minY = 48
  const maxY = window.innerHeight - aiHelpSize
  aiHelpPosition.value = {
    x: Math.max(minX, Math.min(event.clientX - aiHelpDragOffset.value.x, maxX)),
    y: Math.max(minY, Math.min(event.clientY - aiHelpDragOffset.value.y, maxY)),
  }
}

function stopAiHelpDrag() {
  aiHelpDragging.value = false
  document.removeEventListener('pointermove', moveAiHelp)
  document.removeEventListener('pointerup', stopAiHelpDrag)
}

function toggleAiHelp() {
  if (aiHelpDragging.value || aiHelpMoved.value) {
    setTimeout(() => {
      aiHelpMoved.value = false
    }, 0)
    return
  }
  legacyAiHelpOpen.value = false
  legacyAiSelectedQuestion.value = ''
  aiHelpOpen.value = !aiHelpOpen.value
}

function toggleAiHelpWide() {
  aiHelpWide.value = !aiHelpWide.value
}

onBeforeUnmount(() => {
  stopAiHelpDrag()
})

// 页面视图：list(设备列表) / add(新增设备)
const viewMode = ref<'list' | 'add'>('list')

// 接入方式
type AccessMethod = 'gb28181' | 'fixed' | 'onvif' | 'plugin' | 'agent'
const accessMethod = ref<AccessMethod>('onvif')
const accessMethods: { key: AccessMethod; label: string }[] = [
  { key: 'gb28181', label: 'GB/T28181' },
  { key: 'fixed', label: '固定地址' },
  { key: 'onvif', label: 'Onvif' },
  { key: 'plugin', label: '插件' },
  { key: 'agent', label: 'Agent接入' },
]

// Onvif 表单字段
const onvifForm = ref({
  name: '',
  manufacturer: '',
  deviceIp: '',
  port: '80',
  account: 'admin',
  password: '',
})

// 摄像头列表数据
const cameraList = [
  { id: 1, name: '东门摄像头', ip: '192.168.1.201', manufacturer: '海康威视', status: 'online', thumb: cameraImg },
  { id: 2, name: '大厅摄像头A', ip: '192.168.1.202', manufacturer: '海康威视', status: 'online', thumb: cameraImg },
  { id: 3, name: '会议室摄像头', ip: '192.168.1.203', manufacturer: '大华', status: 'online', thumb: cameraImg },
  { id: 4, name: '车库摄像头', ip: '192.168.1.204', manufacturer: '海康威视', status: 'online', thumb: cameraImg },
  { id: 5, name: '南门摄像头', ip: '192.168.1.205', manufacturer: '宇视', status: 'online', thumb: cameraImg },
  { id: 6, name: '北门摄像头', ip: '192.168.1.206', manufacturer: '宇视', status: 'offline', thumb: cameraImg },
]

// 扫描步骤: scan(扫描) → select(选择)
type AddStep = 'scan' | 'select'
const addStep = ref<AddStep>('scan')
const scanning = ref(false)

// 点击新增按钮 → 进入新增视图
function openAddModal() {
  viewMode.value = 'add'
  addStep.value = 'scan'
}

// 绑定弹窗: auth(认证) → result(结果)
const bindModalVisible = ref(false)
type BindStep = 'auth' | 'result'
const bindStep = ref<BindStep>('auth')
const binding = ref(false)
const bindError = ref('')
// 结果页折叠状态：成功默认折叠，失败默认展开
const successCollapsed = ref(true)
const failCollapsed = ref(false)
const bindSuccessList = ref<typeof scannedDevices.value>([])
const bindFailList = ref<typeof scannedDevices.value>([])

// 扫描结果（静态模拟，部分密码不同用于模拟绑定失败）
const scannedDevices = ref([
  { id: 'd1', name: 'IPC-前门-01', ip: '192.168.1.201', mac: 'AA:BB:CC:00:01:01', manufacturer: '海康威视', model: 'DS-2CD2', selected: false, accessed: true, account: 'admin', password: '123456', thumb: cam1 },
  { id: 'd2', name: 'IPC-前门-02', ip: '192.168.1.202', mac: 'AA:BB:CC:00:01:02', manufacturer: '海康威视', model: 'DS-2CD2', selected: false, accessed: false, account: 'admin', password: '123456', thumb: cam2 },
  { id: 'd3', name: 'IPC-大厅-01', ip: '192.168.1.203', mac: 'AA:BB:CC:00:01:03', manufacturer: '大华', model: 'DH-IPC', selected: false, accessed: true, account: 'admin', password: '123456', thumb: cam3 },
  { id: 'd4', name: 'IPC-大厅-02', ip: '192.168.1.204', mac: 'AA:BB:CC:00:01:04', manufacturer: '大华', model: 'DH-IPC', selected: false, accessed: false, account: 'admin', password: 'admin123', thumb: cam4 },
  { id: 'd5', name: 'IPC-走廊-01', ip: '192.168.1.205', mac: 'AA:BB:CC:00:01:05', manufacturer: '宇视', model: 'HIC6621', selected: false, accessed: false, account: 'admin', password: '123456', thumb: cam1 },
  { id: 'd6', name: 'IPC-走廊-02', ip: '192.168.1.206', mac: 'AA:BB:CC:00:01:06', manufacturer: '宇视', model: 'HIC6621', selected: false, accessed: false, account: 'admin', password: 'pass888', thumb: cam2 },
])

const selectedCount = ref(0)
const rescanning = ref(false)

function toggleDevice(dev: typeof scannedDevices.value[0]) {
  if (dev.accessed) return
  dev.selected = !dev.selected
  selectedCount.value = scannedDevices.value.filter(d => d.selected).length
}

function rescan() {
  if (rescanning.value) return
  rescanning.value = true
  scannedDevices.value.forEach(d => d.selected = false)
  selectedCount.value = 0
  setTimeout(() => {
    rescanning.value = false
  }, 1500)
}

function startScan() {
  scanning.value = true
  setTimeout(() => {
    scanning.value = false
    addStep.value = 'select'
  }, 1500)
}

function goToAuth() {
  if (selectedCount.value === 0) return
  bindStep.value = 'auth'
  bindError.value = ''
  onvifForm.value.account = 'admin'
  onvifForm.value.password = ''
  bindSuccessList.value = []
  bindFailList.value = []
  successCollapsed.value = true
  failCollapsed.value = false
  bindModalVisible.value = true
}

function handleBind() {
  bindError.value = ''
  if (!onvifForm.value.account.trim() || !onvifForm.value.password.trim()) {
    bindError.value = '请输入账号和密码'
    return
  }
  binding.value = true
  setTimeout(() => {
    binding.value = false
    const selected = scannedDevices.value.filter(d => d.selected)
    const success = selected.filter(d => d.account === onvifForm.value.account.trim() && d.password === onvifForm.value.password.trim())
    const fail = selected.filter(d => !(d.account === onvifForm.value.account.trim() && d.password === onvifForm.value.password.trim()))
    bindSuccessList.value = success
    bindFailList.value = fail
    bindStep.value = 'result'
    if (success.length > 0) {
      message.success(`成功绑定 ${success.length} 台摄像头`)
    }
  }, 800)
}

// 结果步：重新输入密码（只针对失败的）
function retryAuth() {
  bindError.value = ''
  onvifForm.value.account = 'admin'
  onvifForm.value.password = ''
  // 只保留失败的在选中列表
  scannedDevices.value.forEach(d => {
    if (!bindFailList.value.some(f => f.id === d.id)) d.selected = false
  })
  selectedCount.value = bindFailList.value.length
  bindStep.value = 'auth'
}

// 结果步：确认绑定成功的
function confirmPartial() {
  if (bindSuccessList.value.length > 0) {
    message.success(`成功绑定 ${bindSuccessList.value.length} 台摄像头`)
  }
  bindModalVisible.value = false
  goBackToList()
}

function closeBindModal() {
  bindModalVisible.value = false
}

// ===== 单设备重试弹窗 =====
const retryModalVisible = ref(false)
const retryTarget = ref<typeof scannedDevices.value[0] | null>(null)
const retryAccount = ref('')
const retryPassword = ref('')
const retryError = ref('')
const retryBinding = ref(false)

function openRetryModal(dev: typeof scannedDevices.value[0]) {
  retryTarget.value = dev
  retryAccount.value = 'admin'
  retryPassword.value = ''
  retryError.value = ''
  retryBinding.value = false
  retryModalVisible.value = true
}

function closeRetryModal() {
  retryModalVisible.value = false
  retryTarget.value = null
}

function handleRetryBind() {
  if (!retryTarget.value) return
  retryError.value = ''
  if (!retryAccount.value.trim() || !retryPassword.value.trim()) {
    retryError.value = '请输入账号和密码'
    return
  }
  retryBinding.value = true
  const dev = retryTarget.value
  setTimeout(() => {
    retryBinding.value = false
    if (dev.account === retryAccount.value.trim() && dev.password === retryPassword.value.trim()) {
      bindFailList.value = bindFailList.value.filter(d => d.id !== dev.id)
      bindSuccessList.value.push(dev)
      message.success(`「${dev.name}」绑定成功`)
      retryModalVisible.value = false
    } else {
      retryError.value = '账号或密码错误，请重试'
    }
  }, 600)
}

function goBackToList() {
  viewMode.value = 'list'
  // 重置
  addStep.value = 'scan'
  scanning.value = false
  scannedDevices.value.forEach(d => d.selected = false)
  selectedCount.value = 0
}
</script>

<template>
  <div class="ga-shell">
    <!-- ===== 顶部导航栏 ===== -->
    <header class="ga-topbar">
      <div class="ga-topbar__logo">
        <i class="i-ant-design-desktop-outlined" />
        <span>高通网关</span>
      </div>
      <nav class="ga-topbar__nav">
        <span
          class="ga-topnav"
          :class="{ 'ga-topnav--active': activeTopNav === 'workbench' }"
          data-guide="gateway-nav-workbench"
          @click="openWorkbenchPage"
        >
          <i class="i-ant-design-home-outlined" />
          <span>工作台</span>
        </span>
        <span
          class="ga-topnav"
          :class="{ 'ga-topnav--active': activeTopNav === 'iot' }"
          data-guide="gateway-nav-iot"
          @click="openIotPage"
        >
          <i class="i-ant-design-api-outlined" />
          <span>物联网</span>
        </span>
        <span
          class="ga-topnav"
          :class="{ 'ga-topnav--active': activeTopNav === 'gatewayConfig' }"
          data-guide="gateway-nav-config"
          @click="openGatewayConfigPage"
        >
          <i class="i-ant-design-cloud-server-outlined" />
          <span>网关配置</span>
        </span>
        <span
          class="ga-topnav"
          :class="{ 'ga-topnav--active': activeTopNav === 'video' }"
          data-guide="gateway-nav-video"
          @click="openVideoPage"
        >
          <i class="i-ant-design-video-camera-outlined" />
          <span>视频中心</span>
        </span>
        <span
          class="ga-topnav"
          :class="{ 'ga-topnav--active': activeTopNav === 'system' }"
          data-guide="gateway-nav-system"
          @click="openSystemPage"
        >
          <i class="i-ant-design-setting-outlined" />
          <span>系统管理</span>
        </span>
        <span
          class="ga-topnav"
          :class="{ 'ga-topnav--active': activeTopNav === 'ai' }"
          data-guide="gateway-nav-ai"
          @click="openAiPage"
        >
          <i class="i-ant-design-robot-outlined" />
          <span>人工智能</span>
        </span>
        <span
          class="ga-topnav"
          :class="{ 'ga-topnav--active': activeTopNav === 'resource' }"
          data-guide="gateway-nav-resource"
          @click="openResourcePage"
        >
          <i class="i-ant-design-database-outlined" />
          <span>资源库</span>
        </span>
      </nav>
      <div class="ga-topbar__right">
        <i class="i-ant-design-user-outlined" />
      </div>
    </header>

    <div class="ga-body">
      <div v-if="activeTopNav === 'workbench'" class="ga-screenshot-page">
        <img :src="workbenchImg" alt="工作台" draggable="false" />
      </div>
      <template v-else-if="activeTopNav === 'iot'">
        <aside class="ga-sider">
          <div class="ga-menu">
            <span class="ga-menu__item ga-menu__item--active">
              <i class="i-ant-design-appstore-outlined" />
              <span>设备管理</span>
            </span>
            <span class="ga-menu__item">
              <i class="i-ant-design-tool-outlined" />
              <span>运维管理</span>
            </span>
            <span class="ga-menu__item">
              <i class="i-ant-design-alert-outlined" />
              <span>告警中心</span>
            </span>
            <span class="ga-menu__item">
              <i class="i-ant-design-branches-outlined" />
              <span>规则引擎</span>
            </span>
            <span class="ga-menu__item">
              <i class="i-ant-design-database-outlined" />
              <span>数据采集</span>
            </span>
          </div>
        </aside>
        <div class="ga-screenshot-page">
          <img :src="iotImg" alt="物联网" draggable="false" />
        </div>
      </template>
      <template v-else-if="activeTopNav === 'gatewayConfig'">
        <aside class="ga-sider">
          <div class="ga-menu">
            <span class="ga-menu__item ga-menu__item--active">
              <i class="i-ant-design-cloud-server-outlined" />
              <span>平台接入</span>
            </span>
            <span class="ga-menu__item">
              <i class="i-ant-design-code-outlined" />
              <span>远程终端</span>
            </span>
            <span class="ga-menu__item">
              <i class="i-ant-design-appstore-add-outlined" />
              <span>插件管理</span>
            </span>
            <span class="ga-menu__item">
              <i class="i-ant-design-upload-outlined" />
              <span>固件升级</span>
            </span>
            <span class="ga-menu__item">
              <i class="i-ant-design-global-outlined" />
              <span>网络配置</span>
            </span>
            <span class="ga-menu__item">
              <i class="i-ant-design-partition-outlined" />
              <span>串口管理</span>
            </span>
          </div>
        </aside>
        <div class="ga-screenshot-page">
          <img :src="gatewayConfigImg" alt="网关配置" draggable="false" />
        </div>
      </template>
      <template v-else-if="activeTopNav === 'system'">
        <aside class="ga-sider">
          <div class="ga-menu">
            <span class="ga-menu__item ga-menu__item--active">
              <i class="i-ant-design-info-circle-outlined" />
              <span>基本信息</span>
            </span>
            <span class="ga-menu__item">
              <i class="i-ant-design-user-outlined" />
              <span>用户管理</span>
            </span>
            <span class="ga-menu__item">
              <i class="i-ant-design-team-outlined" />
              <span>角色管理</span>
            </span>
            <span class="ga-menu__item">
              <i class="i-ant-design-calendar-outlined" />
              <span>日历维护</span>
            </span>
          </div>
        </aside>
        <div class="ga-screenshot-page">
          <img :src="systemManageImg" alt="系统管理" draggable="false" />
        </div>
      </template>
      <template v-else-if="activeTopNav === 'ai'">
        <aside class="ga-sider">
          <div class="ga-menu">
            <span class="ga-menu__item ga-menu__item--active">
              <i class="i-ant-design-robot-outlined" />
              <span>智能体开发</span>
            </span>
            <span class="ga-menu__item">
              <i class="i-ant-design-book-outlined" />
              <span>知识库管理</span>
            </span>
            <span class="ga-menu__item">
              <i class="i-ant-design-eye-outlined" />
              <span>机器视觉</span>
            </span>
          </div>
        </aside>
        <div class="ga-screenshot-page">
          <img :src="aiImg" alt="人工智能" draggable="false" />
        </div>
      </template>
      <template v-else-if="activeTopNav === 'resource'">
        <aside class="ga-sider">
          <div class="ga-menu">
            <span class="ga-menu__item ga-menu__item--active">
              <i class="i-ant-design-file-text-outlined" />
              <span>采集器模版</span>
            </span>
          </div>
        </aside>
        <div class="ga-screenshot-page">
          <img :src="resourceImg" alt="资源库" draggable="false" />
        </div>
      </template>
      <template v-else>
      <!-- ===== 左侧菜单 ===== -->
      <aside class="ga-sider">
        <div class="ga-menu">
          <span class="ga-menu__item ga-menu__item--active">
            <i class="i-ant-design-video-camera-outlined" />
            <span>视频设备</span>
          </span>
          <span class="ga-menu__item">
            <i class="i-ant-design-block-outlined" />
            <span>分屏展示</span>
          </span>
          <span class="ga-menu__item">
            <i class="i-ant-design-share-alt-outlined" />
            <span>国标级联</span>
          </span>
          <span class="ga-menu__item">
            <i class="i-ant-design-clock-circle-outlined" />
            <span>自动录像</span>
          </span>
        </div>
      </aside>

      <!-- ===== 主内容区 ===== -->
      <main class="ga-main">
        <!-- ===== 列表视图 ===== -->
        <template v-if="viewMode === 'list'">
        <!-- 面包屑 -->
        <div class="ga-breadcrumb">
          <span>视频中心</span>
          <i class="i-ant-design-right-outlined" />
          <span>网关地址</span>
        </div>

        <!-- 筛选栏 -->
        <div class="ga-filter">
          <div class="ga-filter__left">
            <div class="ga-filter__item">
              <span class="ga-filter__label">设备名称</span>
              <div class="ga-filter__select">
                <span>全部</span>
                <i class="i-ant-design-down-outlined" />
              </div>
            </div>
            <div class="ga-filter__item">
              <span class="ga-filter__label">设备状态</span>
              <div class="ga-filter__select">
                <span>全部</span>
                <i class="i-ant-design-down-outlined" />
              </div>
            </div>
            <button class="ga-filter__btn">查询</button>
            <button class="ga-filter__btn ga-filter__btn--ghost">重置</button>
          </div>
          <button
            class="ga-filter__add"
            @click="openAddModal"
          >
            <i class="i-ant-design-plus-outlined" />
            <span>新增</span>
          </button>
        </div>

        <!-- 摄像头画面网格 -->
        <div class="ga-camera-grid">
          <div v-for="cam in cameraList" :key="cam.id" class="ga-camera-img">
            <img :src="cam.thumb" :alt="cam.name" draggable="false" />
          </div>
        </div>

        <!-- 分页 -->
        <div class="ga-pagination">
          <span class="ga-pagination__total">共 6 条</span>
          <div class="ga-pagination__pages">
            <span class="ga-page ga-page--disabled">‹</span>
            <span class="ga-page ga-page--active">1</span>
            <span class="ga-page ga-page--disabled">›</span>
          </div>
          <div class="ga-filter__select ga-pagination__size">
            <span>6条/页</span>
            <i class="i-ant-design-down-outlined" />
          </div>
        </div>
        </template>

        <!-- ===== 新增设备视图 ===== -->
        <template v-if="viewMode === 'add'">
          <!-- 面包屑 -->
          <div class="ga-breadcrumb">
            <span class="ga-breadcrumb__link" @click="goBackToList">视频中心</span>
            <i class="i-ant-design-right-outlined" />
            <span class="ga-breadcrumb__link" @click="goBackToList">网关地址</span>
            <i class="i-ant-design-right-outlined" />
            <span>新增设备</span>
          </div>

          <!-- 接入方式选择 -->
          <div class="ga-add-card">
            <div class="ga-access-block">
              <label class="ga-form-label ga-form-label--block"><span class="ga-req">*</span> 接入方式</label>
              <div class="ga-access-cards">
                <div
                  v-for="m in accessMethods"
                  :key="m.key"
                  class="ga-access-card"
                  :class="{ 'ga-access-card--active': accessMethod === m.key }"
                  @click="accessMethod = m.key"
                >
                  <i class="i-ant-design-api-outlined" />
                  <span>{{ m.label }}</span>
                </div>
              </div>
            </div>

            <!-- Onvif 表单内容 -->
            <div v-if="accessMethod === 'onvif'" class="ga-onvif">
              <!-- 步骤一：扫描 -->
              <div v-if="addStep === 'scan'" class="ga-scan-area">
                <div class="ga-scan-hero">
                  <div class="ga-scan-hero__icon" :class="{ scanning }">
                    <i class="i-ant-design-radar-chart-outlined" />
                  </div>
                  <h3 class="ga-scan-hero__title">扫描局域网设备</h3>
                  <p class="ga-scan-hero__desc">点击「一键同步」扫描当前局域网内所有可用的摄像头设备</p>
                  <button class="ga-scan-hero__btn" :disabled="scanning" @click="startScan">
                    <i :class="scanning ? 'i-ant-design-loading-outlined ga-spin' : 'i-ant-design-sync-outlined'" />
                    <span>{{ scanning ? '扫描中...' : '一键同步' }}</span>
                  </button>
                </div>
              </div>

              <!-- 步骤二：选择设备 -->
              <div v-if="addStep === 'select'" class="ga-select-area">
                <div class="ga-select-bar">
                  <span>共扫描到 <strong>{{ scannedDevices.length }}</strong> 台，已选 <strong>{{ selectedCount }}</strong> 台</span>
                </div>
                <div class="ga-device-grid">
                  <div
                    v-for="dev in scannedDevices"
                    :key="dev.id"
                    class="ga-device-card"
                    :class="{ 'is-selected': dev.selected, 'is-disabled': dev.accessed }"
                    @click="toggleDevice(dev)"
                  >
                    <div class="ga-device-card__thumb">
                      <img v-if="dev.accessed" :src="dev.thumb" :alt="dev.name" draggable="false" />
                      <div v-else class="ga-device-card__placeholder">
                        <i class="i-ant-design-video-camera-outlined" />
                      </div>
                      <span class="ga-device-card__badge" :class="dev.accessed ? 'accessed' : 'not-accessed'">
                        {{ dev.accessed ? '已接入' : '未接入' }}
                      </span>
                      <div v-if="!dev.accessed" class="ga-device-card__check" :class="{ checked: dev.selected }">
                        <i class="i-ant-design-check-outlined" />
                      </div>
                    </div>
                    <div class="ga-device-card__body">
                      <span class="ga-device-card__name">{{ dev.name }}</span>
                      <span class="ga-device-card__ip">{{ dev.ip }}</span>
                      <span class="ga-device-card__brand">{{ dev.manufacturer }} · {{ dev.model }}</span>
                    </div>
                  </div>
                </div>
                <div class="ga-select-actions">
                  <button class="ga-form-btn ga-form-btn--default" :disabled="rescanning" @click="rescan">
                    <i v-if="rescanning" class="i-ant-design-loading-outlined ga-spin" />
                    {{ rescanning ? '扫描中...' : '重新扫描' }}
                  </button>
                  <button class="ga-form-btn ga-form-btn--primary" :disabled="selectedCount === 0 || rescanning" @click="goToAuth">
                    绑定（{{ selectedCount }}）
                  </button>
                </div>
              </div>
            </div>

            <!-- 其他接入方式占位 -->
            <div v-else class="ga-placeholder-text">
              <i class="i-ant-design-tool-outlined" />
              <span>{{ accessMethods.find(m => m.key === accessMethod)?.label }} 接入方式（暂未开放）</span>
            </div>
          </div>
        </template>
      </main>
      </template>
      <div
        class="ga-ai-help"
        :class="{ 'is-dragging': aiHelpDragging, 'is-open': aiHelpOpen, 'is-wide': aiHelpWide }"
        :style="aiHelpPosition ? { left: `${aiHelpPosition.x}px`, top: `${aiHelpPosition.y}px`, right: 'auto', bottom: 'auto' } : undefined"
      >
        <button
          class="ga-ai-help__legacy-trigger"
          type="button"
          aria-label="常见问题"
          @click.stop="toggleLegacyAiHelp"
        >
          <i class="i-ant-design-question-circle-outlined" />
        </button>
        <div class="ga-ai-help__legacy-bubble" :class="{ open: legacyAiHelpOpen, 'has-answer': legacyAiSelectedQuestion }">
          <div class="ga-ai-help__legacy-head">
            <div class="ga-ai-help__legacy-head-main">
              <div class="ga-ai-help__legacy-mark">
                <i class="i-ant-design-question-circle-outlined" />
              </div>
              <div>
                <div class="ga-ai-help__legacy-title">视频中心常见问题</div>
                <div class="ga-ai-help__legacy-subtitle">选择问题后在当前页面查看说明</div>
              </div>
            </div>
            <button class="ga-ai-help__legacy-cancel" type="button" aria-label="关闭常见问题" @click.stop="closeLegacyAiHelp">
              <i class="i-ant-design-close-outlined" />
            </button>
          </div>
          <div class="ga-ai-help__legacy-content">
            <div class="ga-ai-help__legacy-questions">
              <button
                v-for="question in legacyAiHelpQuestions"
                :key="question"
                type="button"
                :class="{ active: question === legacyAiSelectedQuestion }"
                @click="handleLegacyAiHelpQuestion(question)"
              >
                {{ question }}
              </button>
            </div>
            <article v-if="legacyAiSelectedQuestion" class="ga-ai-help__legacy-doc">
              <h1>新增视频设备</h1>

              <img class="ga-ai-help__legacy-doc-image" :src="guideImage1" alt="新增视频设备入口" />

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

              <img class="ga-ai-help__legacy-doc-image" :src="guideImage2" alt="扫描摄像头设备" />

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

              <img class="ga-ai-help__legacy-doc-image" :src="guideImage3" alt="摄像头账号认证" />

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
          class="ga-ai-help__trigger"
          v-show="false"
          type="button"
          aria-label="智能对话助手"
          @pointerdown="startAiHelpDrag"
          @click="toggleAiHelp"
        >
          <img :src="aiChatIcon" alt="" draggable="false">
        </button>
        <div v-show="false" class="ga-ai-help__bubble">
          <div class="ga-ai-help__toolbar">
            <div class="ga-ai-help__brand">
              <strong>AI 智能助手</strong>
            </div>
            <div class="ga-ai-help__actions">
              <button type="button" title="新对话" aria-label="新对话" @click.stop="resetAiHelpConversation">
                <i class="i-ant-design-plus-outlined" />
              </button>
              <button type="button" title="对话记录" aria-label="对话记录" @click.stop>
                <i class="i-ant-design-history-outlined" />
              </button>
              <button type="button" title="反馈问题" aria-label="反馈问题" @click.stop="openAiHelpFeedbackTicket">
                <i class="i-ant-design-message-outlined" />
              </button>
              <button
                type="button"
                :title="aiHelpWide ? '恢复宽度' : '放大宽度'"
                :aria-label="aiHelpWide ? '恢复宽度' : '放大宽度'"
                :class="{ active: aiHelpWide }"
                @click.stop="toggleAiHelpWide"
              >
                <i :class="aiHelpWide ? 'i-ant-design-compress-outlined' : 'i-ant-design-expand-alt-outlined'" />
              </button>
            </div>
          </div>
          <div class="ga-ai-help__body">
            <div v-if="!aiHelpHasConversation" class="ga-ai-help__empty">
              <h3>开始和智能体对话</h3>
              <p>{{ defaultAiHelpMessage }}</p>
              <div class="ga-ai-help__quick-list">
                <button
                  v-for="question in aiHelpQuickQuestions"
                  :key="question"
                  type="button"
                  @click="sendAiHelpQuestion(question)"
                >
                  {{ question }}
                </button>
              </div>
            </div>
            <div v-else class="ga-ai-help__messages">
              <div
                v-for="message in aiHelpMessages"
                :key="message.id"
                class="ga-ai-help__message"
                :class="`is-${message.role}`"
              >
                <div class="ga-ai-help__message-bubble">
                  {{ message.content }}
                  <button
                    v-if="message.ticketId"
                    class="ga-ai-help__ticket-link"
                    type="button"
                    @click="openAiHelpTicketList"
                  >
                    <i class="i-ant-design-profile-outlined" />
                    去工单管理
                  </button>
                  <div v-if="message.ticketDraft" class="ga-ai-help__ticket-card">
                    <div class="ga-ai-help__ticket-row">
                      <span>板块分类</span>
                      <div class="ga-ai-help__ticket-tags">
                        <em v-for="category in message.ticketDraft.categories" :key="category">{{ category }}</em>
                      </div>
                    </div>
                    <div class="ga-ai-help__ticket-row">
                      <span>描述</span>
                      <strong>{{ message.ticketDraft.description }}</strong>
                      <div class="ga-ai-help__ticket-images">
                        <img
                          v-for="image in message.ticketDraft.images"
                          :key="image"
                          :src="image"
                          alt="工单补充图片"
                        >
                      </div>
                    </div>
                    <div class="ga-ai-help__ticket-row">
                      <span>联系方式</span>
                      <strong>{{ message.ticketDraft.contact }}</strong>
                    </div>
                    <button
                      class="ga-ai-help__ticket-submit"
                      type="button"
                      :disabled="message.submitted"
                      @click="confirmAiHelpTicket(message)"
                    >
                      {{ message.submitted ? '已提交' : '确认提交' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="ga-ai-help__mode-bar">
            <button
              type="button"
              :class="{ active: aiHelpTicketMode }"
              @click="toggleAiHelpTicketMode"
            >
              工单提交
            </button>
          </div>
          <div class="ga-ai-help__composer">
            <div class="ga-ai-help__composer-input">
              <span v-if="aiHelpTicketMode" class="ga-ai-help__composer-tag">
                工单提交
                <button type="button" title="删除" aria-label="删除工单提交标签" @click="aiHelpTicketMode = false">
                  <i class="i-ant-design-close-outlined" />
                </button>
              </span>
              <input
                v-model="aiHelpInput"
                type="text"
                placeholder="输入问题并回车发送"
                @keydown.enter="sendAiHelpQuestion()"
              >
            </div>
            <div class="ga-ai-help__composer-bottom">
              <div class="ga-ai-help__composer-tools">
                <button class="ga-ai-help__tool-btn" type="button" aria-label="选择图片">
                  <i class="i-ant-design-plus-outlined" />
                </button>
                <button class="ga-ai-help__tool-btn" type="button" aria-label="选择文件夹">
                  <i class="i-ant-design-folder-open-outlined" />
                </button>
              </div>
              <button class="ga-ai-help__send" type="button" aria-label="发送" @click="sendAiHelpQuestion()">
                <i class="i-ant-design-arrow-up-outlined" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <a-modal
    v-model:open="gatewayGuideWelcomeVisible"
    :title="null"
    :footer="null"
    :width="460"
    centered
    :closable="false"
    :mask-closable="false"
    :z-index="1900"
  >
    <div class="gateway-guide-welcome">
      <div class="gateway-guide-welcome__icon">
        <i class="i-ant-design-compass-outlined" />
      </div>
      <h2 class="gateway-guide-welcome__title">欢迎来到边缘网关</h2>
      <p class="gateway-guide-welcome__desc">
        接下来带您快速认识应用各大功能分区，清晰掌握各功能入口对应的操作，快速上手使用。
      </p>
      <div class="gateway-guide-welcome__actions">
        <button class="gateway-guide-welcome__skip" type="button" @click="skipGatewayGuide">跳过</button>
        <button class="gateway-guide-welcome__primary" type="button" @click="startGatewayGuide">开始新手引导</button>
      </div>
    </div>
  </a-modal>

  <GuideOverlay />

  <!-- ===== 绑定弹窗 ===== -->
  <a-modal
    v-model:open="bindModalVisible"
    :title="bindStep === 'auth' ? '输入账号密码' : '绑定结果'"
    :width="440"
    :footer="null"
    centered
    :mask-closable="true"
    :z-index="1000"
    wrap-class-name="add-device-modal-wrap"
    @cancel="closeBindModal"
  >
    <!-- 认证步 -->
    <div v-if="bindStep === 'auth'" class="ga-bind-modal">
      <div class="ga-auth-info">
        <i class="i-ant-design-info-circle-outlined" />
        <span>输入摄像头的账号密码完成绑定（正确账号 admin / 密码 123456）</span>
      </div>
      <div v-if="bindError" class="ga-bind-error">
        <i class="i-ant-design-close-circle-filled" />
        <span>{{ bindError }}</span>
      </div>
      <div class="ga-bind-field">
        <label class="ga-bind-label"><span class="ga-req">*</span> 账号</label>
        <input v-model="onvifForm.account" class="ga-bind-input" placeholder="请输入摄像头账号" />
      </div>
      <div class="ga-bind-field">
        <label class="ga-bind-label"><span class="ga-req">*</span> 密码</label>
        <input v-model="onvifForm.password" type="password" class="ga-bind-input" placeholder="请输入摄像头密码" />
      </div>
      <div class="ga-bind-actions">
        <button class="ga-form-btn ga-form-btn--default" @click="closeBindModal">取消</button>
        <button class="ga-form-btn ga-form-btn--primary" :disabled="binding" @click="handleBind">
          <i v-if="binding" class="i-ant-design-loading-outlined ga-spin" />
          {{ binding ? '绑定中...' : '绑定' }}
        </button>
      </div>
    </div>

    <!-- 结果步 -->
    <div v-if="bindStep === 'result'" class="ga-bind-modal">
      <!-- 绑定成功（默认折叠） -->
      <div class="ga-result-group ga-result-group--success">
        <div class="ga-result-group__header" @click="successCollapsed = !successCollapsed">
          <div class="ga-result-group__title">
            <i class="i-ant-design-check-circle-filled" />
            <span>绑定成功（{{ bindSuccessList.length }}）</span>
          </div>
          <i class="i-ant-design-down-outlined ga-result-group__arrow" :class="{ 'is-collapsed': successCollapsed }" />
        </div>
        <div v-show="!successCollapsed" class="ga-result-list">
          <div v-if="bindSuccessList.length === 0" class="ga-bind-empty">
            <i class="i-ant-design-info-circle-filled" />
            <span>没有成功的设备</span>
          </div>
          <div v-for="dev in bindSuccessList" :key="dev.id" class="ga-bind-success-item">
            <div class="ga-bind-fail-info">
              <span class="ga-bind-fail-name">{{ dev.name }}</span>
              <span class="ga-bind-fail-ip">{{ dev.ip }}</span>
            </div>
            <span class="ga-bind-success-tag">
              <i class="i-ant-design-check-outlined" />
              已绑定
            </span>
          </div>
        </div>
      </div>

      <!-- 绑定失败（默认展开） -->
      <div class="ga-result-group ga-result-group--fail">
        <div class="ga-result-group__header" @click="failCollapsed = !failCollapsed">
          <div class="ga-result-group__title">
            <i class="i-ant-design-close-circle-filled" />
            <span>绑定失败（{{ bindFailList.length }}）</span>
          </div>
          <i class="i-ant-design-down-outlined ga-result-group__arrow" :class="{ 'is-collapsed': failCollapsed }" />
        </div>
        <div v-show="!failCollapsed" class="ga-result-list">
          <div v-if="bindFailList.length === 0" class="ga-bind-empty">
            <i class="i-ant-design-check-circle-filled" />
            <span>没有失败的设备</span>
          </div>
          <div v-for="dev in bindFailList" :key="dev.id" class="ga-bind-fail-item">
            <div class="ga-bind-fail-info">
              <span class="ga-bind-fail-name">{{ dev.name }}</span>
              <span class="ga-bind-fail-ip">{{ dev.ip }}</span>
            </div>
            <button class="ga-bind-fail-retry" @click="openRetryModal(dev)">
              <i class="i-ant-design-edit-outlined" />
              <span>设置账号密码</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="ga-bind-actions">
        <button v-if="bindSuccessList.length > 0" class="ga-form-btn ga-form-btn--default" @click="confirmPartial">
          绑定成功的 {{ bindSuccessList.length }} 台
        </button>
        <button class="ga-form-btn ga-form-btn--primary" @click="retryAuth">重新输入密码</button>
      </div>
    </div>
  </a-modal>

  <!-- ===== 单设备重试弹窗 ===== -->
  <a-modal
    v-model:open="retryModalVisible"
    title="设置设备账号密码"
    :width="420"
    :footer="null"
    centered
    :z-index="2100"
    @cancel="closeRetryModal"
  >
    <div class="ga-bind-modal">
      <!-- 设备信息 -->
      <div v-if="retryTarget" class="ga-retry-device">
        <div class="ga-retry-device__thumb">
          <img v-if="retryTarget.accessed" :src="retryTarget.thumb" :alt="retryTarget.name" />
          <div v-else class="ga-retry-device__placeholder">
            <i class="i-ant-design-video-camera-outlined" />
          </div>
        </div>
        <div class="ga-retry-device__info">
          <strong>{{ retryTarget.name }}</strong>
          <span>{{ retryTarget.ip }}</span>
          <span>{{ retryTarget.manufacturer }} · {{ retryTarget.model }}</span>
        </div>
      </div>

      <div v-if="retryError" class="ga-bind-error">
        <i class="i-ant-design-close-circle-filled" />
        <span>{{ retryError }}</span>
      </div>

      <div class="ga-bind-field">
        <label class="ga-bind-label"><span class="ga-req">*</span> 账号</label>
        <input v-model="retryAccount" class="ga-bind-input" placeholder="请输入摄像头账号" />
      </div>
      <div class="ga-bind-field">
        <label class="ga-bind-label"><span class="ga-req">*</span> 密码</label>
        <input v-model="retryPassword" type="password" class="ga-bind-input" placeholder="请输入摄像头密码" />
      </div>

      <div class="ga-bind-actions">
        <button class="ga-form-btn ga-form-btn--default" @click="closeRetryModal">取消</button>
        <button class="ga-form-btn ga-form-btn--primary" :disabled="retryBinding" @click="handleRetryBind">
          <i v-if="retryBinding" class="i-ant-design-loading-outlined ga-spin" />
          {{ retryBinding ? '绑定中...' : '绑定' }}
        </button>
      </div>
    </div>
  </a-modal>

  <!-- 引导浮层 -->
</template>

<style scoped lang="scss">
/* ===== 全局重置 ===== */
.ga-shell {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
  font-family: AliRegular, 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  line-height: 22px;
  letter-spacing: 0;
  color: #111418;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
}

/* ===== 顶部导航栏 ===== */
.ga-topbar {
  height: 48px;
  background: #132329;
  display: flex;
  align-items: center;
  padding: 0 16px;
  flex-shrink: 0;
  gap: 40px;

  &__logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
    line-height: 22px;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;

    i { font-size: 20px; color: #6e4bff; }
  }

  &__nav {
    display: flex;
    align-items: center;
    gap: 0;
    flex: 1;
  }

  &__right {
    i { font-size: 18px; color: #94a3b8; cursor: pointer; }
  }
}

.ga-topnav {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
  line-height: 22px;
  font-weight: 500;
  color: #94a3b8;
  padding: 0 14px;
  height: 48px;
  cursor: pointer;
  transition: color 0.15s;
  position: relative;

  i {
    font-size: 22px;
    flex-shrink: 0;
  }

  span {
    white-space: nowrap;
  }

  &:hover { color: #e2e8f0; }

  &--active {
    color: #fff;
    font-weight: 500;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 18px;
      right: 18px;
      height: 2px;
      background: #6e4bff;
      border-radius: 1px;
    }
  }
}

/* ===== 主体 ===== */
.ga-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.ga-screenshot-page {
  position: relative;
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: #fff;

  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: fill;
  }
}

.ga-ai-help {
  position: fixed;
  right: 72px;
  bottom: 58px;
  z-index: 120;

  &.is-open {
    .ga-ai-help__bubble {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
      pointer-events: auto;
    }
  }

  &.is-wide {
    .ga-ai-help__bubble {
      width: clamp(620px, 40vw, 720px);
    }
  }

  &.is-dragging {
    .ga-ai-help__trigger {
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

  &__legacy-title {
    color: #111418;
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
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
      white-space: normal;
      cursor: pointer;
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
    }
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
    }

    em {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #6e4bff;
      color: #fff;
      font-style: normal;
      font-size: 12px;
      line-height: 20px;
      font-weight: 600;
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
    min-width: 0;
    color: #111418;

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

      .ga-ai-help__message-bubble {
        border-color: #6e4bff;
        background: #6e4bff;
        color: #fff;
        border-bottom-right-radius: 4px;
      }
    }

    &.is-assistant {
      justify-content: flex-start;

      .ga-ai-help__message-bubble {
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

    .ga-ai-help__composer-tag {
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

    i {
      font-size: 16px;
    }
  }
}

.ga-help {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 5;

  &.is-open {
    .ga-help__bubble {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
      pointer-events: auto;
    }
  }

  &.is-dragging {
    .ga-help__trigger {
      cursor: grabbing;
      transform: none;
    }
  }

  &__trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border: none;
    border-radius: 50%;
    background: #6e4bff;
    color: #fff;
    box-shadow: 0 10px 28px rgba(17, 20, 24, 0.22);
    cursor: grab;
    touch-action: none;
    user-select: none;
    transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;

    i {
      font-size: 22px;
    }

    &:hover,
    &:focus-visible {
      background: #7b5cff;
      box-shadow: 0 12px 32px rgba(17, 20, 24, 0.28);
      transform: translateY(-1px);
      outline: none;
    }
  }

  &__bubble {
    position: absolute;
    right: 0;
    bottom: 54px;
    width: 320px;
    padding: 14px;
    border: 1px solid rgba(15, 23, 42, 0.08);
    border-radius: 8px;
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

  &__title {
    margin-bottom: 10px;
    font-size: 15px;
    line-height: 22px;
    font-weight: 600;
    color: #111418;
  }

  &__list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      display: block;
      min-height: 34px;
      padding: 7px 10px;
      border-radius: 6px;
      font-size: 13px;
      line-height: 20px;
      color: #334155;
      cursor: default;
      transition: background 0.15s ease, color 0.15s ease;

      a {
        color: inherit;
        text-decoration: none;
      }

      &:hover {
        background: rgba(110, 75, 255, 0.08);
        color: #6e4bff;
      }
    }
  }
}

/* ===== 左侧菜单 ===== */
.ga-sider {
  width: 224px;
  background: #132329;
  flex-shrink: 0;
  padding: 8px;
  overflow-y: auto;

  &__group {
    margin-bottom: 8px;
  }

  &__title {
    font-size: 11px;
    color: #64748b;
    padding: 8px 20px 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.ga-menu {
  &__item {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 48px;
    padding: 0 14px;
    margin: 8px 0;
    border-radius: 6px;
    font-size: 15px;
    line-height: 22px;
    font-weight: 500;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.15s;

    i { font-size: 24px; flex-shrink: 0; }

    &:hover { color: #e2e8f0; background: rgba(255, 255, 255, 0.03); }

    &--active {
      color: #fff;
      background: rgba(110, 75, 255, 0.18);

      i { color: #6e4bff; }
    }
  }
}

/* ===== 主内容区 ===== */
.ga-main {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 面包屑 */
.ga-breadcrumb {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  line-height: 20px;
  color: #64748b;

  i { font-size: 11px; }
  span:last-child { color: #111418; }
}

/* 筛选栏 */
.ga-filter {
  background: #fff;
  border-radius: 6px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  &__left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__label {
    font-size: 13px;
    color: #666;
    white-space: nowrap;
  }

  &__select {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    height: 32px;
    padding: 0 10px;
    border: 1px solid #d9d9d9;
    border-radius: 4px;
    background: #fff;
    font-size: 13px;
    color: #333;
    min-width: 100px;
    cursor: pointer;

    i { font-size: 11px; color: #999; }
  }

  &__btn {
    height: 32px;
    padding: 0 16px;
    border: 1px solid #3b82f6;
    border-radius: 4px;
    background: #3b82f6;
    color: #fff;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;

    &:hover { background: #4096ff; border-color: #4096ff; }

    &--ghost {
      background: #fff;
      color: #666;
      border-color: #d9d9d9;

      &:hover { border-color: #3b82f6; color: #3b82f6; }
    }
  }

  &__add {
    height: 32px;
    padding: 0 16px;
    border: none;
    border-radius: 4px;
    background: #3b82f6;
    color: #fff;
    font-size: 13px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: all 0.15s;

    &:hover { background: #4096ff; }
    i { font-size: 14px; }
  }
}

/* ===== 摄像头画面网格 ===== */
.ga-camera-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.ga-camera-img {
  border-radius: 6px;
  overflow: hidden;
  background: #1a1a2e;

  img {
    width: 100%;
    height: auto;
    object-fit: contain;
    display: block;
  }
}

/* ===== 分页 ===== */
.ga-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding: 12px 16px;
  font-size: 13px;
  color: #666;

  &__total { color: #999; }

  &__pages {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__size {
    min-width: 90px;
  }
}

.ga-page {
  min-width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  color: #666;
  cursor: pointer;

  &:hover:not(&--disabled):not(&--active) {
    border-color: #3b82f6;
    color: #3b82f6;
  }

  &--active {
    border-color: #3b82f6;
    background: #3b82f6;
    color: #fff;
  }

  &--disabled {
    color: #d9d9d9;
    cursor: not-allowed;
    border-color: #f0f0f0;
  }
}

/* ===== 新增设备页面 ===== */
.ga-breadcrumb__link {
  cursor: pointer;
  color: #64748b;
  &:hover { color: #3b82f6; }
}

.ga-add-card {
  background: #fff;
  border-radius: 6px;
  padding: 24px;
}

/* 表单行 */
.ga-form-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
}
.ga-form-label {
  font-size: 13px;
  color: #666;
  width: 80px;
  flex-shrink: 0;
  text-align: right;
  line-height: 32px;

  &--block {
    width: auto;
    text-align: left;
    display: block;
    margin-bottom: 12px;
    line-height: 1.5;
  }
}
.ga-req { color: #ff4d4f; margin-right: 2px; }

/* 接入方式卡片 */
.ga-access-block {
  margin-bottom: 24px;
}
.ga-access-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}
.ga-access-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px 12px;
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;

  i { font-size: 28px; color: #999; }
  span { font-size: 13px; color: #666; }

  &:hover {
    border-color: rgba(59, 130, 246, 0.4);
    i { color: #3b82f6; }
    span { color: #3b82f6; }
  }

  &--active {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.04);

    i { color: #3b82f6; }
    span { color: #3b82f6; font-weight: 500; }
  }
}

/* Onvif 内容区 */
.ga-onvif {
  border-top: 1px solid #f0f0f0;
  padding-top: 24px;
  min-height: 400px;
}

/* 扫描 */
.ga-scan-hero {
  text-align: center;
  padding: 50px 20px;
  &__icon {
    font-size: 56px;
    color: #3b82f6;
    margin-bottom: 20px;
    &.scanning { animation: ga-pulse 1.5s ease-in-out infinite; }
  }
  &__title { font-size: 16px; font-weight: 600; color: #333; margin: 0 0 8px; }
  &__desc { font-size: 13px; color: #999; margin: 0 0 24px; }
  &__btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 28px;
    border: 1px solid #3b82f6;
    border-radius: 4px;
    background: #3b82f6;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s;
    &:hover:not(:disabled) { background: #4096ff; }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
    i { font-size: 16px; }
  }
}
@keyframes ga-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.7; }
}
@keyframes ga-spin { to { transform: rotate(360deg); } }
.ga-spin { animation: ga-spin 1s linear infinite; display: inline-block; }

/* 选择设备 */
.ga-select-bar {
  font-size: 13px;
  color: #666;
  margin-bottom: 16px;
  strong { color: #3b82f6; font-weight: 600; }
}
.ga-device-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.ga-device-card {
  border: 2px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.15s;
  background: #fff;
  &:hover { border-color: rgba(59, 130, 246, 0.4); }
  &.is-selected { border-color: #3b82f6; background: rgba(59, 130, 246, 0.04); }
  &.is-disabled { cursor: not-allowed; opacity: 0.6; &:hover { border-color: #e8e8e8; } }

  &__thumb {
    position: relative;
    aspect-ratio: 16 / 10;
    background: #1a1a2e;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
  &__placeholder {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: rgba(255, 255, 255, 0.3);
    i { font-size: 32px; }
  }
  &__badge {
    position: absolute;
    top: 6px;
    left: 6px;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    &.accessed { background: rgba(82, 196, 26, 0.85); color: #fff; }
    &.not-accessed { background: rgba(250, 173, 20, 0.85); color: #fff; }
  }
  &__check {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.6);
    background: rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    i { font-size: 12px; color: #fff; opacity: 0; }
    &.checked { background: #3b82f6; border-color: #3b82f6; i { opacity: 1; } }
  }
  &__body { padding: 8px 10px; display: flex; flex-direction: column; gap: 2px; }
  &__name { font-size: 12px; font-weight: 500; color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__ip { font-size: 11px; color: #999; font-family: 'Courier New', monospace; }
  &__brand { font-size: 10px; color: #999; }
}

/* 认证表单 */
.ga-auth-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgba(59, 130, 246, 0.06);
  border-radius: 6px;
  font-size: 13px;
  color: #3b82f6;
  margin-bottom: 20px;
  i { font-size: 16px; flex-shrink: 0; }
}
.ga-auth-form { max-width: 400px; }
.ga-form-input-wrap { flex: 1; }
.ga-form-input {
  width: 100%;
  height: 32px;
  padding: 0 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  color: #333;
  outline: none;
  transition: border-color 0.15s;
  &:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
}

/* 结果 */
.ga-result-area { text-align: center; padding: 40px 20px; }
.ga-result-icon {
  font-size: 56px;
  color: #52c41a;
  margin-bottom: 16px;
}
.ga-result-title { font-size: 18px; font-weight: 600; color: #333; margin: 0 0 8px; }
.ga-result-desc { font-size: 14px; color: #999; margin: 0 0 24px; }

/* 通用按钮 */
.ga-select-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 20px;
}
.ga-form-btn {
  height: 32px;
  padding: 0 20px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid #d9d9d9;
  &--default {
    background: #fff;
    color: #666;
    &:hover { border-color: #3b82f6; color: #3b82f6; }
  }
  &--primary {
    background: #3b82f6;
    border-color: #3b82f6;
    color: #fff;
    &:hover:not(:disabled) { background: #4096ff; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }
}

/* 占位 */
.ga-placeholder-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 20px;
  color: #ccc;
  i { font-size: 40px; }
  span { font-size: 14px; }
}

.gateway-guide-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 30px 24px;
  text-align: center;

  &__icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 54px;
    height: 54px;
    margin-bottom: 16px;
    border-radius: 14px;
    background: rgba(110, 75, 255, 0.1);
    color: #6e4bff;

    i {
      font-size: 28px;
    }
  }

  &__title {
    margin: 0 0 10px;
    font-size: 18px;
    line-height: 26px;
    font-weight: 600;
    color: #111418;
  }

  &__desc {
    margin: 0 0 22px;
    font-size: 14px;
    line-height: 24px;
    color: #64748b;
    text-align: left;
  }

  &__actions {
    display: flex;
    justify-content: center;
    gap: 10px;
    width: 100%;
  }

  &__skip,
  &__primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 128px;
    height: 36px;
    padding: 0 18px;
    border-radius: 6px;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  &__skip {
    border: 1px solid #d9d9d9;
    background: #fff;
    color: #64748b;

    &:hover {
      border-color: #6e4bff;
      color: #6e4bff;
    }
  }

  &__primary {
    border: 1px solid #6e4bff;
    background: #6e4bff;
    color: #fff;

    &:hover {
      background: #7b5cff;
      border-color: #7b5cff;
    }
  }
}

/* ===== 绑定弹窗 ===== */
.ga-bind-modal {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.ga-bind-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(59, 130, 246, 0.06);
  border-radius: 6px;
  font-size: 13px;
  color: #3b82f6;
  i { font-size: 16px; flex-shrink: 0; }
}
.ga-bind-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255, 77, 79, 0.08);
  border: 1px solid rgba(255, 77, 79, 0.3);
  border-radius: 6px;
  color: #ff4d4f;
  font-size: 13px;
  i { font-size: 16px; flex-shrink: 0; }
}
.ga-bind-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.ga-bind-label {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}
.ga-bind-input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 13px;
  color: #333;
  outline: none;
  transition: border-color 0.15s;
  &:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1); }
}
.ga-bind-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 结果折叠分组 */
.ga-result-group {
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #f0f0f0;

  & + & { margin-top: 10px; }

  /* 成功组 */
  &--success {
    .ga-result-group__header {
      background: rgba(82, 196, 26, 0.06);
      &:hover { background: rgba(82, 196, 26, 0.1); }
    }
    .ga-result-group__title i { color: #52c41a; }
  }

  /* 失败组 */
  &--fail {
    .ga-result-group__header {
      background: rgba(255, 77, 79, 0.06);
      &:hover { background: rgba(255, 77, 79, 0.1); }
    }
    .ga-result-group__title i { color: #ff4d4f; }
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    cursor: pointer;
    transition: background 0.15s;
    user-select: none;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: #333;
    i { font-size: 15px; }
  }

  &__arrow {
    font-size: 12px;
    color: #bbb;
    transition: transform 0.2s ease;
    &.is-collapsed { transform: rotate(-90deg); }
  }
}

/* 结果列表容器 */
.ga-result-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
}

/* 空状态 */
.ga-bind-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 20px 0;
  color: #ccc;
  i { font-size: 28px; }
  span { font-size: 12px; }
}

/* 成功列表项 */
.ga-bind-success-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(82, 196, 26, 0.03);
  border-radius: 8px;
}
.ga-bind-success-tag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
  font-size: 12px;
  i { font-size: 12px; }
}
.ga-bind-fail-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.ga-bind-fail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(255, 77, 79, 0.03);
  border-radius: 8px;
}
.ga-bind-fail-name { font-size: 13px; color: #333; font-weight: 500; }
.ga-bind-fail-ip { font-size: 12px; color: #999; font-family: 'Courier New', monospace; }
.ga-bind-fail-retry {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  background: #fff;
  color: #3b82f6;
  font-size: 12px;
  cursor: pointer;
  flex-shrink: 0;
  &:hover { background: rgba(59, 130, 246, 0.06); }
  i { font-size: 13px; }
}

/* 单设备重试弹窗 */
.ga-retry-device {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;

  &__thumb {
    width: 100px;
    height: 60px;
    border-radius: 6px;
    overflow: hidden;
    background: #1a1a2e;
    flex-shrink: 0;
    img { width: 100%; height: 100%; object-fit: cover; }
  }

  &__placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.3);
    i { font-size: 22px; }
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    strong { font-size: 14px; font-weight: 600; color: #333; }
    span { font-size: 12px; color: #999; }
  }
}
</style>
