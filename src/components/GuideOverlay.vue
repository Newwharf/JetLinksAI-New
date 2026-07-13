<script setup lang="ts">
/**
 * 全局引导覆盖层
 * 通过 data-guide 属性定位目标元素，显示高亮镂空 + 提示气泡
 * 蒙版阻止点击穿透，用户只能操作高亮区域或提示气泡上的按钮
 */
import { useAppStore, type GuideStep } from '@/stores/app'
import { useRouter } from 'vue-router'
import loginImg from '@/assets/cameras/image.png'

const appStore = useAppStore()
const router = useRouter()

// ===== 步骤配置 =====
interface StepConfig {
  target: string         // data-guide 属性值 或 CSS 选择器
  targetSelector?: boolean  // 为 true 时 target 作为 CSS 选择器
  title: string
  desc: string
  placement?: 'bottom' | 'top' | 'right' | 'left' | 'center' | 'highlight-modal'
}

const stepConfigs: Record<Exclude<GuideStep, ''>, StepConfig> = {
  'add-gateway': {
    target: 'add-gateway',
    title: '第一步：新增网关',
    desc: '点击此按钮接入你的第一个边缘网关，网关是管理视频设备的入口。',
    placement: 'bottom'
  },
  'bind-gateway': {
    target: '.bind-modal-wrap .ant-modal',
    targetSelector: true,
    title: '第二步：绑定网关',
    desc: '选择一种接入方式（SN码/Token/扫码），完成输入或扫码识别后，点击「确定绑定」下拉框选择绑定结果场景。',
    placement: 'highlight-modal'
  },
  'gw-online-configured': {
    target: '.gw-online-modal-wrap .ant-modal',
    targetSelector: true,
    title: '第三步：网关已在线',
    desc: '该网关已配置了部分摄像头设备，你可以查看已接入的摄像头画面，也可以继续绑定更多摄像头。',
    placement: 'highlight-modal'
  },
  'gw-online-empty': {
    target: '.gw-online-modal-wrap .ant-modal',
    targetSelector: true,
    title: '第三步：网关已在线',
    desc: '该网关尚未接入任何摄像头设备，请前往绑定摄像头以开始使用视频功能。',
    placement: 'highlight-modal'
  },
  'gw-offline': {
    target: 'gw-offline',
    title: '网关离线',
    desc: '设备接入后发现网关处于离线状态，请排查网关网络连接。可尝试更新通道以重新检测网关状态。',
    placement: 'center'
  },
  'goto-config': {
    target: 'goto-config',
    title: '第四步：配置设备',
    desc: '点击「配置设备」按钮，进入网关地址页面绑定摄像头。',
    placement: 'right'
  },
  'gw-address': {
    target: 'gw-address-add',
    title: '第五步：新增设备',
    desc: '点击「新增」按钮，开始为网关接入摄像头设备。',
    placement: 'bottom'
  },
  'scan-device': {
    target: 'scan-device',
    title: '第六步：一键同步',
    desc: '点击「一键同步」，系统会自动扫描局域网内所有可用的摄像头设备。',
    placement: 'bottom'
  },
  'select-device': {
    target: 'select-device',
    title: '第七步：选择设备',
    desc: '勾选你需要绑定的摄像头，可以多选。选好后点击「绑定」按钮。',
    placement: 'bottom'
  },
  'bind-device': {
    target: '.add-device-modal-wrap .ant-modal',
    targetSelector: true,
    title: '第八步：输入密码绑定',
    desc: '输入摄像头的账号密码，点击绑定完成设备接入。如果部分摄像头的账号或密码错误，可以在结果页中逐个重新输入。',
    placement: 'highlight-modal'
  },
  'done': {
    target: 'done',
    title: '视联设备绑定成功！',
    desc: '你已经完成了视联设备的接入，现在可以开始配置告警规则了。',
    placement: 'center'
  },
  'video-done': {
    target: 'video-done',
    title: '🎉 设备接入成功！',
    desc: '恭喜你完成了视联设备的接入流程。现在你可以在监控墙中查看实时画面，配置告警规则让系统自动守护你的安全。',
    placement: 'center'
  },
  // ===== IoT 引导步骤 =====
  'iot-add': {
    target: 'iot-add-device',
    title: '第一步：新增设备',
    desc: '点击「新增设备」按钮，从设备库中选择设备模板。',
    placement: 'bottom'
  },
  'iot-select': {
    target: '.iot-add-modal .ant-modal',
    targetSelector: true,
    title: '第二步：选择设备库',
    desc: '左侧选择设备大类，右侧选择具体的设备模板，点击模板进入下一步。',
    placement: 'highlight-modal'
  },
  'iot-config': {
    target: '.iot-add-modal .ant-modal',
    targetSelector: true,
    title: '第三步：填写配置信息',
    desc: '填写设备名称、图标、所属区域等信息，完成后点击「添加设备」。',
    placement: 'highlight-modal'
  },
  'iot-detail': {
    target: 'iot-device-name',
    title: '第四步：进入设备详情',
    desc: '点击设备名称进入设备详情页，查看和管理设备。',
    placement: 'bottom'
  },
  'iot-access': {
    target: 'iot-access-tab',
    title: '第五步：设备接入',
    desc: '点击「设备接入」标签，开始配置设备接入。',
    placement: 'bottom'
  },
  'iot-access-config': {
    target: 'iot-access-config',
    title: '第六步：配置设备接入参数',
    desc: '复制对应参数到真实物理设备中进行配置，不同设备接入方式有所不同。详情请参考：https://hanta.yuque.com/px7kg1/yfac2l/wyerndtnhzze17bv',
    placement: 'top'
  },
  'iot-done': {
    target: 'iot-done',
    title: '🎉 设备添加成功！',
    desc: '恭喜你完成了物联设备的添加流程。接下来你可以在设备详情页配置物模型、查看实时数据、下发指令等。',
    placement: 'center'
  },
  // ===== 告警规则引导步骤 =====
  'alarm-create': {
    target: 'alarm-create',
    title: '第一步：新建规则',
    desc: '点击「新建告警规则」按钮开始创建你的第一条告警规则。',
    placement: 'bottom'
  },
  'alarm-step0': {
    target: '.alarm-wizard-modal .ant-modal',
    targetSelector: true,
    title: '第二步：基础信息',
    desc: '填写规则名称、选择告警等级（超紧急/紧急/严重/一般/提醒）和规则描述。',
    placement: 'highlight-modal'
  },
  'alarm-step1': {
    target: '.alarm-wizard-modal .ant-modal',
    targetSelector: true,
    title: '第三步：场景算法',
    desc: '选择检测场景和算法，决定摄像头检测什么行为，可跨场景多选。选好后点击「下一步」。',
    placement: 'highlight-modal'
  },
  'alarm-step2': {
    target: '.alarm-wizard-modal .ant-modal',
    targetSelector: true,
    title: '第四步：生效摄像头',
    desc: '选择生效的摄像头，决定哪些摄像头执行此规则。可点击摄像头预览实时画面。',
    placement: 'highlight-modal'
  },
  'alarm-step3': {
    target: '.alarm-wizard-modal .ant-modal',
    targetSelector: true,
    title: '第五步：生效时段',
    desc: '选择规则生效的时间段，可以全天、工作日、夜间或自定义。',
    placement: 'highlight-modal'
  },
  'alarm-step4': {
    target: '.alarm-wizard-modal .ant-modal',
    targetSelector: true,
    title: '第六步：通知对象',
    desc: '选择告警发生时的通知方式和通知人员，还可以开启去重推送避免频繁打扰。',
    placement: 'highlight-modal'
  },
  'alarm-done': {
    target: 'alarm-done',
    title: '🎉 告警规则创建成功！',
    desc: '系统将按照你设置的规则自动监控，发现异常时实时推送告警通知。',
    placement: 'center'
  }
}

// ===== 高亮元素定位 =====
const highlightRect = ref({ top: 0, left: 0, width: 0, height: 0 })
const tooltipStyle = ref<Record<string, string>>({})
const targetFound = ref(false)
// highlight-modal 模式下弹窗的水平偏移量（右侧空间不足时左移弹窗）
const modalShiftX = ref(0)

const currentStep = computed(() => appStore.guideStep)
const currentConfig = computed(() => currentStep.value ? stepConfigs[currentStep.value] : null)

function updatePosition() {
  if (!currentConfig.value) return

  // 非 highlight-modal 模式重置弹窗偏移
  if (currentConfig.value.placement !== 'highlight-modal') {
    modalShiftX.value = 0
  }

  // center 模式不需要 target 元素，直接居中
  if (currentConfig.value.placement === 'center') {
    targetFound.value = true
    highlightRect.value = { top: 0, left: 0, width: 0, height: 0 }
    tooltipStyle.value = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    }
    return
  }

  const el = currentConfig.value.targetSelector
    ? document.querySelector(currentConfig.value.target) as HTMLElement | null
    : document.querySelector(`[data-guide="${currentConfig.value.target}"]`) as HTMLElement | null
  if (!el) {
    targetFound.value = false
    return
  }
  targetFound.value = true
  const rect = el.getBoundingClientRect()

  if (currentConfig.value.placement === 'highlight-modal') {
    // 高亮弹窗模式：全屏蒙版 + 气泡在弹窗外侧（优先右侧）
    highlightRect.value = { top: 0, left: 0, width: 0, height: 0 }
    const tooltipWidth = 320
    // 测量气泡实际高度，避免与弹窗重叠
    const tipEl = document.querySelector('.guide-tip') as HTMLElement | null
    const tooltipHeight = tipEl ? tipEl.offsetHeight : 160
    const gap = 24
    const margin = 16

    // 计算右侧是否有足够空间放气泡
    const rightSpace = window.innerWidth - rect.right - margin
    const needsShift = rightSpace < tooltipWidth + gap

    if (needsShift) {
      // 右侧空间不足：将弹窗左移，使右侧腾出足够空间
      const shiftLeft = (tooltipWidth + gap) - rightSpace
      // 通过 CSS 变量通知弹窗偏移（只左移，不超出左边屏幕）
      const maxShift = rect.left - margin
      const actualShift = Math.min(shiftLeft, maxShift)
      modalShiftX.value = -actualShift
      // 重新获取偏移后的 rect
      const shiftedRect = el.getBoundingClientRect()
      const tooltipTop = shiftedRect.top + shiftedRect.height / 2 - tooltipHeight / 2
      tooltipStyle.value = {
        top: `${Math.max(margin, tooltipTop)}px`,
        left: `${shiftedRect.right + gap}px`
      }
    } else {
      // 右侧空间充足：弹窗不偏移，气泡放右侧
      modalShiftX.value = 0
      const tooltipTop = rect.top + rect.height / 2 - tooltipHeight / 2
      tooltipStyle.value = {
        top: `${Math.max(margin, tooltipTop)}px`,
        left: `${rect.right + gap}px`
      }
    }
    return
  }

  // 高亮目标元素
  highlightRect.value = {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height
  }

  // 气泡定位
  const tooltipWidth = 320
  const gap = 12
  // 测量气泡实际高度（取 DOM 元素）
  const tipEl = document.querySelector('.guide-tip') as HTMLElement | null
  const tooltipHeight = tipEl ? tipEl.offsetHeight : 160
  switch (currentConfig.value.placement) {
    case 'bottom':
      tooltipStyle.value = {
        top: `${rect.bottom + gap}px`,
        left: `${Math.max(12, Math.min(rect.left, window.innerWidth - tooltipWidth - 12))}px`
      }
      break
    case 'top': {
      // 优先放上方，若空间不足则切换到下方
      const topSpace = rect.top
      const bottomSpace = window.innerHeight - rect.bottom
      let top: number
      if (topSpace >= tooltipHeight + gap + 8) {
        top = rect.top - gap - tooltipHeight
      } else if (bottomSpace >= tooltipHeight + gap + 8) {
        // 上方放不下，放下方（与高亮区不重叠）
        top = rect.bottom + gap
      } else {
        // 两侧都不够，贴顶显示并留出间距
        top = Math.max(8, rect.top - gap - tooltipHeight)
      }
      tooltipStyle.value = {
        top: `${top}px`,
        left: `${Math.max(12, Math.min(rect.left, window.innerWidth - tooltipWidth - 12))}px`
      }
      break
    }
    case 'right': {
      // 优先放右侧，若空间不足则切换到左侧
      const rightSpace = window.innerWidth - rect.right
      let left: number
      if (rightSpace >= tooltipWidth + gap + 12) {
        left = rect.right + gap
      } else {
        // 右侧放不下，放左侧
        left = Math.max(12, rect.left - tooltipWidth - gap)
      }
      // 垂直方向也做避让，不超出屏幕
      const top = Math.max(12, Math.min(rect.top, window.innerHeight - tooltipHeight - 12))
      tooltipStyle.value = { top: `${top}px`, left: `${left}px` }
      break
    }
    case 'left': {
      const leftLeft = rect.left - tooltipWidth - gap
      let left: number
      if (leftLeft >= 12) {
        left = leftLeft
      } else {
        left = rect.right + gap
      }
      const top = Math.max(12, Math.min(rect.top, window.innerHeight - tooltipHeight - 12))
      tooltipStyle.value = { top: `${top}px`, left: `${left}px` }
      break
    }
    default:
      tooltipStyle.value = { top: `${rect.bottom + gap}px`, left: `${rect.left}px` }
  }
}

// 监听步骤变化，更新位置（延迟 + 重试，等 ant-design modal 打开动画完成）
let retryTimer: ReturnType<typeof setTimeout> | null = null
watch(() => appStore.guideStep, () => {
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
  nextTick(() => {
    // 多次更新：覆盖弹窗延迟打开 + 动画过程
    setTimeout(updatePosition, 100)
    setTimeout(updatePosition, 300)
    setTimeout(updatePosition, 500)
    setTimeout(updatePosition, 800)
    setTimeout(updatePosition, 1200)
    // 兜底重试：如果目标还没找到（弹窗未打开），持续重试直到找到后再多更新几次
    retryTimer = setTimeout(() => retryPosition(10, 400), 600)
  })
})

// 重试定位：目标未找到时持续重试；找到后再更新几次确保动画结束后位置正确
function retryPosition(maxRetry: number, interval: number) {
  let count = 0
  let foundCount = 0
  const timer = setInterval(() => {
    updatePosition()
    if (targetFound.value) {
      foundCount++
      // 找到后再更新 3 次，确保动画结束后位置正确
      if (foundCount >= 3) {
        clearInterval(timer)
      }
    } else {
      count++
      if (count >= maxRetry) {
        clearInterval(timer)
      }
    }
  }, interval)
}

// 监听窗口大小变化
function onResize() {
  updatePosition()
}
onMounted(() => {
  window.addEventListener('resize', onResize)
  nextTick(() => setTimeout(updatePosition, 100))
})
onBeforeUnmount(() => window.removeEventListener('resize', onResize))

// ===== 步骤控制 =====
function closeGuide() {
  appStore.finishGuide()
  gwOnlineModalVisible.value = false
}

// ===== 网关在线提示弹窗 =====
const gwOnlineModalVisible = ref(false)
// 离线网关检测状态：idle 待检测 / detecting 检测中 / online 已上线
const detectStatus = ref<'idle' | 'detecting' | 'online'>('idle')
// 上线提示弹窗
const onlineToastVisible = ref(false)

// 监听步骤变化，自动开关网关在线弹窗
watch(() => appStore.guideStep, (step) => {
  if (step === 'gw-online-configured' || step === 'gw-online-empty') {
    nextTick(() => {
      gwOnlineModalVisible.value = true
    })
  } else {
    gwOnlineModalVisible.value = false
  }
  // 离开网关离线步骤时重置检测状态
  if (step !== 'gw-offline') {
    detectStatus.value = 'idle'
    onlineToastVisible.value = false
  }
}, { immediate: true })

function goToAlarm() {
  appStore.setGuideStep('alarm-create')
  router.push('/alarm/rule')
}

/** 从 center 提示页推进到 goto-config（继续绑定/前往绑定） */
function goToConfig() {
  appStore.setGuideStep('goto-config')
}

/** 从 center 提示页直接去配置告警 */
function goToAlarmFromGuide() {
  appStore.setGuideStep('alarm-create')
  router.push('/alarm/rule')
}

// ===== 离线网关：视频教程播放 =====
const tutorialVideoVisible = ref(false)
const tutorialVideoFullscreen = ref(false)

function openTutorialVideo() {
  tutorialVideoVisible.value = true
}
function closeTutorialVideo() {
  tutorialVideoVisible.value = false
  tutorialVideoFullscreen.value = false
}
function toggleFullscreen() {
  tutorialVideoFullscreen.value = !tutorialVideoFullscreen.value
}

// 场景选择弹窗
const detectSelectModalVisible = ref(false)
// 检测结果：has-device 有设备 / no-device 无设备
let detectResult: 'has-device' | 'no-device' = 'has-device'

/** 点击"发现网关上线" → 打开场景选择 */
function openDetectSelect() {
  detectSelectModalVisible.value = true
}

/** 选择场景后开始检测 */
function handleDetectSelect(result: 'has-device' | 'no-device') {
  detectResult = result
  detectSelectModalVisible.value = false
  startDetect()
}

function startDetect() {
  if (detectStatus.value !== 'idle') return
  detectStatus.value = 'detecting'
  // 模拟检测：3 秒后发现网关上线
  const targetStep = detectResult === 'has-device' ? 'gw-online-configured' : 'gw-online-empty'
  setTimeout(() => {
    detectStatus.value = 'online'
    onlineToastVisible.value = true
    appStore.triggerOfflineUpdate()
    // 2 秒后关闭提示，推进到对应步骤
    setTimeout(() => {
      onlineToastVisible.value = false
      appStore.setGuideStep(targetStep as GuideStep)
    }, 2000)
  }, 3000)
}

// ===== 网络配置弹窗（手机模拟器） =====
const networkConfigModalVisible = ref(false)
// 手机页面：login 登录页 / config 网关配置页
const phonePage = ref<'login' | 'config'>('login')

function openNetworkConfig() {
  phonePage.value = 'login'
  networkConfigModalVisible.value = true
}

// 两个网口的配置数据
const portConfigs = ref([
  {
    name: '网口 1',
    connected: true,
    auto: true,
    address: '192.168.1.108',
    gateway: '192.168.1.1',
    mask: '255.255.255.0',
    dns: '8.8.8.8',
    cameras: ['前门摄像头', '大厅摄像头'],
  },
  {
    name: '网口 2',
    connected: false,
    auto: true,
    address: '',
    gateway: '',
    mask: '',
    dns: '',
    cameras: [],
  },
])

// ===== 网关已在线：已接入的摄像头列表 =====
const onlineCameras = [
  { name: '前门摄像头', ip: '192.168.1.201', status: 'online' },
  { name: '大厅摄像头', ip: '192.168.1.202', status: 'online' },
  { name: '走廊摄像头', ip: '192.168.1.203', status: 'offline' },
]

const stepIndex = computed(() => {
  const videoSteps: GuideStep[] = ['add-gateway', 'bind-gateway', 'gw-online-configured', 'goto-config', 'gw-address', 'scan-device', 'select-device', 'bind-device', 'done']
  const iotSteps: GuideStep[] = ['iot-add', 'iot-select', 'iot-config', 'iot-detail', 'iot-access', 'iot-access-config', 'iot-done']
  const alarmSteps: GuideStep[] = ['alarm-create', 'alarm-step0', 'alarm-step1', 'alarm-step2', 'alarm-step3', 'alarm-step4', 'alarm-done']
  let idx = alarmSteps.indexOf(currentStep.value)
  if (idx >= 0) return idx
  idx = iotSteps.indexOf(currentStep.value)
  if (idx >= 0) return idx
  // gw-online-empty 和 gw-online-configured 共享同一步骤位置
  if (currentStep.value === 'gw-online-empty') return videoSteps.indexOf('gw-online-configured')
  return videoSteps.indexOf(currentStep.value)
})
const totalSteps = computed(() => {
  const iotSteps: GuideStep[] = ['iot-add', 'iot-select', 'iot-config', 'iot-detail', 'iot-access', 'iot-access-config', 'iot-done']
  return iotSteps.includes(currentStep.value) ? 7 : 9
})

/** 分支提示页（center 模式，不显示步骤号） */
const isBranchStep = computed(() =>
  currentStep.value === 'gw-offline'
)
</script>

<template>
  <div
    v-if="appStore.guideActive && currentConfig"
    class="guide-overlay"
    :style="{ '--modal-shift-x': modalShiftX + 'px' }"
  >
    <!-- ===== 全屏拦截蒙版（所有模式共用） ===== -->
    <!-- center / highlight-modal：纯蒙版 -->
    <div
      v-if="currentConfig.placement === 'center' || currentConfig.placement === 'highlight-modal'"
      class="guide-mask-full"
    />
    <!-- 普通高亮模式：4 块蒙版拼接镂空（高亮区域可穿透点击） -->
    <template v-if="currentConfig.placement !== 'center' && currentConfig.placement !== 'highlight-modal' && targetFound">
      <!-- 上 -->
      <div class="guide-mask-piece" :style="{ top: '0', left: '0', right: '0', height: (highlightRect.top - 4) + 'px' }" />
      <!-- 下 -->
      <div class="guide-mask-piece" :style="{ top: (highlightRect.top + highlightRect.height + 4) + 'px', left: '0', right: '0', bottom: '0' }" />
      <!-- 左 -->
      <div class="guide-mask-piece" :style="{ top: (highlightRect.top - 4) + 'px', left: '0', width: (highlightRect.left - 4) + 'px', height: (highlightRect.height + 8) + 'px' }" />
      <!-- 右 -->
      <div class="guide-mask-piece" :style="{ top: (highlightRect.top - 4) + 'px', left: (highlightRect.left + highlightRect.width + 4) + 'px', right: '0', height: (highlightRect.height + 8) + 'px' }" />
      <!-- 高亮边框（不拦截点击） -->
      <div
        class="guide-highlight"
        :style="{
          top: highlightRect.top - 4 + 'px',
          left: highlightRect.left - 4 + 'px',
          width: highlightRect.width + 8 + 'px',
          height: highlightRect.height + 8 + 'px'
        }"
      />
    </template>

    <!-- 提示气泡 -->
    <Transition name="guide-tip">
      <div
        v-if="targetFound || currentConfig.placement === 'center' || currentConfig.placement === 'highlight-modal'"
        class="guide-tip"
        :class="[
          currentConfig.placement === 'highlight-modal' ? 'tip-arrow tip-arrow--right guide-tip--above-modal' : (currentConfig.placement ? `tip-arrow tip-arrow--${currentConfig.placement}` : ''),
          currentStep === 'gw-offline' ? 'guide-tip--wide' : ''
        ]"
        :style="tooltipStyle"
      >
        <!-- 步骤指示（完成步骤和分支提示页不显示步骤号） -->
        <div v-if="!isBranchStep && currentStep !== 'video-done' && currentStep !== 'iot-done' && currentStep !== 'alarm-done'" class="guide-tip__header">
          <span class="guide-tip__step">{{ stepIndex >= 0 ? stepIndex + 1 : '' }} / {{ totalSteps }}</span>
          <button class="guide-tip__close" type="button" @click="closeGuide">
            <i class="i-ant-design-close-outlined" />
          </button>
        </div>
        <!-- 分支提示页/完成步骤：只有关闭按钮，无步骤号 -->
        <div v-else class="guide-tip__header">
          <span class="guide-tip__step"></span>
          <button class="guide-tip__close" type="button" @click="closeGuide">
            <i class="i-ant-design-close-outlined" />
          </button>
        </div>

        <h3 class="guide-tip__title">
          <i v-if="currentStep === 'done' || currentStep === 'video-done' || currentStep === 'iot-done' || currentStep === 'alarm-done'" class="i-ant-design-check-circle-filled guide-tip__done-icon" />
          <i v-else-if="currentStep === 'gw-offline'" class="i-ant-design-exclamation-circle-filled guide-tip__done-icon" style="color: #ff4d4f;" />
          {{ currentConfig.title }}
        </h3>
        <p class="guide-tip__desc">{{ currentConfig.desc }}</p>

        <!-- 网关离线：循环检测状态条 -->
        <div v-if="currentStep === 'gw-offline'" class="gw-detect" :class="detectStatus">
          <div class="gw-detect__indicator">
            <span class="gw-detect__dot" />
            <span class="gw-detect__pulse" />
          </div>
          <div class="gw-detect__info">
            <strong class="gw-detect__label">
              {{ detectStatus === 'online' ? '发现网关上线' : '持续检测中' }}
            </strong>
            <span class="gw-detect__hint">
              {{ detectStatus === 'online' ? '设备已恢复连接，检测已停止' : '系统将持续检测网关是否上线' }}
            </span>
          </div>
          <button
            v-if="detectStatus === 'idle'"
            class="gw-detect__btn"
            type="button"
            @click="openDetectSelect"
          >
            发现网关上线
          </button>
          <i v-else-if="detectStatus === 'detecting'" class="gw-detect__icon i-ant-design-loading-outlined ga-spin" />
          <i v-else class="gw-detect__icon i-ant-design-check-circle-filled" />
        </div>

        <!-- 网关离线：视频播放器 + 安装方式说明 -->
        <div v-if="currentStep === 'gw-offline'" class="guide-tip__offline">
          <!-- 视频播放器（内联） -->
          <div class="gw-video">
            <div class="gw-video__player" @click="openTutorialVideo">
              <i class="i-ant-design-play-circle-filled gw-video__play" />
              <span class="gw-video__label">网关安装视频教程</span>
              <div class="gw-video__bar">
                <span class="gw-video__time">02:35 / 08:20</span>
                <i class="i-ant-design-fullscreen-outlined gw-video__fs" @click.stop="openTutorialVideo" />
              </div>
            </div>
          </div>
          <!-- 安装方式说明 -->
          <div class="gw-methods">
            <div class="gw-method">
              <i class="i-ant-design-check-circle-outlined" />
              <span><strong>同网段：</strong>网关与摄像头在同一网段，无需网络配置，排查问题后请更新通道。</span>
            </div>
            <div class="gw-method">
              <i class="i-ant-design-warning-outlined" />
              <span><strong>不同网段：</strong>请前往网络配置再尝试进行设备通信。</span>
            </div>
          </div>
        </div>

        <!-- 告警引导完成 -->
        <div v-if="currentStep === 'alarm-done'" class="guide-tip__actions">
          <button class="guide-tip__btn guide-tip__btn--primary" type="button" @click="closeGuide" style="flex: 1;">
            确定
          </button>
        </div>

        <!-- 完成步骤的按钮 -->
        <div v-if="currentStep === 'done'" class="guide-tip__actions">
          <button class="guide-tip__btn guide-tip__btn--default" type="button" @click="closeGuide">跳过</button>
          <button class="guide-tip__btn guide-tip__btn--primary" type="button" @click="goToAlarm">
            <i class="i-ant-design-bell-outlined" />
            去配置告警
          </button>
        </div>

        <!-- 网关离线：跳过为文案链接 -->
        <div v-if="currentStep === 'gw-offline'" class="guide-tip__offline-actions">
          <button class="guide-tip__skip" type="button" @click="closeGuide">跳过，稍后再说</button>
        </div>

        <!-- 视联引导结束 -->
        <div v-if="currentStep === 'video-done'" class="guide-tip__actions">
          <button class="guide-tip__btn guide-tip__btn--primary" type="button" @click="closeGuide" style="flex: 1;">
            确定
          </button>
        </div>

        <!-- IoT 引导结束 -->
        <div v-if="currentStep === 'iot-done'" class="guide-tip__actions">
          <button class="guide-tip__btn guide-tip__btn--default" type="button" @click="closeGuide">完成</button>
          <button class="guide-tip__btn guide-tip__btn--primary" type="button" @click="goToAlarm">
            <i class="i-ant-design-bell-outlined" />
            去配置告警
          </button>
        </div>

        <!-- 非 center / highlight-modal 步骤的关闭提示 -->
        <div v-if="currentConfig.placement !== 'center' && currentConfig.placement !== 'highlight-modal'" class="guide-tip__footer">
          <span class="guide-tip__hint">
            <i class="i-ant-design-info-circle-outlined" />
            请点击高亮按钮完成此步骤
          </span>
        </div>
      </div>
    </Transition>

    <!-- 网关离线：网络配置按钮（在气泡外侧，表示此操作在 App 上进行） -->
    <div v-if="currentStep === 'gw-offline'" class="gw-offline-app-entry">
      <button class="gw-offline-app-entry__btn" type="button" @click="openNetworkConfig">
        <i class="i-ant-design-mobile-outlined" />
        <span>网络配置</span>
        <small>在 App 上操作</small>
      </button>
    </div>

    <!-- ===== 网关在线提示弹窗（highlight-modal 高亮目标） ===== -->
    <a-modal
      v-model:open="gwOnlineModalVisible"
      :title="null"
      :footer="null"
      :width="400"
      centered
      :mask-closable="false"
      :z-index="2000"
      wrap-class-name="gw-online-modal-wrap"
      @cancel="closeGuide"
    >
      <div class="gw-online-modal">
        <div class="gw-online-modal__icon">
          <i v-if="currentStep === 'gw-online-configured'" class="i-ant-design-video-camera-filled" style="color: #52c41a;" />
          <i v-else class="i-ant-design-info-circle-filled" style="color: #faad14;" />
        </div>
        <h3 class="gw-online-modal__title">网关已在线</h3>
        <p v-if="currentStep === 'gw-online-configured'" class="gw-online-modal__desc">该网关已配置了部分摄像头设备，你可以查看已接入的摄像头画面，也可以继续绑定更多摄像头。</p>
        <p v-else class="gw-online-modal__desc">该网关尚未接入任何摄像头设备，请前往绑定摄像头以开始使用视频功能。</p>
        <!-- 已接入摄像头列表 -->
        <div v-if="currentStep === 'gw-online-configured'" class="gw-online-modal__cameras">
          <div v-for="cam in onlineCameras" :key="cam.name" class="gw-online-modal__camera">
            <span class="gw-online-modal__cam-dot" :class="cam.status" />
            <span class="gw-online-modal__cam-name">{{ cam.name }}</span>
            <span class="gw-online-modal__cam-ip">{{ cam.ip }}</span>
          </div>
        </div>
        <div class="gw-online-modal__actions">
          <template v-if="currentStep === 'gw-online-configured'">
            <button class="guide-tip__btn guide-tip__btn--primary" type="button" @click="goToConfig">
              <i class="i-ant-design-plus-outlined" />
              继续接入
            </button>
            <button class="guide-tip__btn guide-tip__btn--default" type="button" @click="goToAlarmFromGuide">
              <i class="i-ant-design-bell-outlined" />
              去配置告警规则
            </button>
          </template>
          <template v-else>
            <button class="guide-tip__btn guide-tip__btn--primary" type="button" @click="goToConfig">
              <i class="i-ant-design-arrow-right-outlined" />
              前往绑定
            </button>
          </template>
        </div>
        <button class="guide-tip__skip gw-online-modal__skip" type="button" @click="closeGuide">跳过，稍后再说</button>
      </div>
    </a-modal>

    <!-- ===== 视频教程播放弹窗 ===== -->
    <a-modal
      v-model:open="tutorialVideoVisible"
      title="网关安装视频教程"
      :footer="null"
      :width="tutorialVideoFullscreen ? '100vw' : 640"
      :body-style="tutorialVideoFullscreen ? { padding: '0', height: '100vh' } : { padding: '0' }"
      :wrap-class-name="tutorialVideoFullscreen ? 'tutorial-video-modal tutorial-video-modal--fullscreen' : 'tutorial-video-modal'"
      :z-index="2200"
      centered
      @cancel="closeTutorialVideo"
    >
      <div class="tutorial-player" :class="{ 'is-fullscreen': tutorialVideoFullscreen }">
        <div class="tutorial-player__video">
          <!-- 模拟视频播放区域 -->
          <div class="tutorial-player__placeholder">
            <i class="i-ant-design-play-circle-filled" />
            <span>网关安装视频教程</span>
          </div>
        </div>
        <!-- 控制栏 -->
        <div class="tutorial-player__controls">
          <div class="tutorial-player__progress">
            <div class="tutorial-player__progress-bar" />
          </div>
          <div class="tutorial-player__btns">
            <button class="tutorial-player__btn" type="button" title="播放/暂停">
              <i class="i-ant-design-play-circle-outlined" />
            </button>
            <span class="tutorial-player__time">02:35 / 08:20</span>
            <button class="tutorial-player__btn" type="button" title="全屏" @click="toggleFullscreen">
              <i :class="tutorialVideoFullscreen ? 'i-ant-design-fullscreen-exit-outlined' : 'i-ant-design-fullscreen-outlined'" />
            </button>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- ===== 网关上线提示 ===== -->
    <Transition name="online-toast">
      <div v-if="onlineToastVisible" class="online-toast">
        <i class="i-ant-design-check-circle-filled online-toast__icon" />
        <span>网关已上线</span>
      </div>
    </Transition>

    <!-- ===== 发现网关上线：场景选择弹窗 ===== -->
    <a-modal
      v-model:open="detectSelectModalVisible"
      title="发现网关上线"
      :width="400"
      :footer="null"
      centered
      :z-index="2200"
      @cancel="detectSelectModalVisible = false"
    >
      <div class="detect-select">
        <p class="detect-select__desc">请选择网关上线后的设备情况：</p>
        <button class="detect-select__option" type="button" @click="handleDetectSelect('has-device')">
          <i class="i-ant-design-video-camera-outlined" />
          <div class="detect-select__option-body">
            <strong>有设备</strong>
            <span>网关已接入摄像头</span>
          </div>
          <i class="i-ant-design-right-outlined" />
        </button>
        <button class="detect-select__option" type="button" @click="handleDetectSelect('no-device')">
          <i class="i-ant-design-inbox-outlined" />
          <div class="detect-select__option-body">
            <strong>无设备</strong>
            <span>网关未接入任何摄像头</span>
          </div>
          <i class="i-ant-design-right-outlined" />
        </button>
      </div>
    </a-modal>

    <!-- ===== 网络配置弹窗（手机模拟器） ===== -->
    <a-modal
      v-model:open="networkConfigModalVisible"
      :title="null"
      :footer="null"
      :width="340"
      centered
      :z-index="2200"
      :body-style="{ padding: '0', background: 'transparent' }"
      wrap-class-name="phone-modal-wrap"
      @cancel="networkConfigModalVisible = false"
    >
      <div class="phone-mock">
        <!-- 手机刘海 -->
        <div class="phone-mock__notch" />
        <!-- 手机屏幕 -->
        <div class="phone-mock__screen">
          <!-- 页面 1：登录 -->
          <div v-if="phonePage === 'login'" class="phone-login">
            <img :src="loginImg" alt="登录页面" draggable="false" />
            <button class="phone-login__enter" type="button" @click="phonePage = 'config'">
              <span>模拟登录，进入网关配置</span>
              <i class="i-ant-design-arrow-right-outlined" />
            </button>
          </div>

          <!-- 页面 2：网关配置 -->
          <div v-else class="phone-config">
            <!-- 顶部标题 -->
            <div class="phone-config__header">
              <i class="i-ant-design-arrow-left-outlined" @click="phonePage = 'login'" />
              <span>网关配置</span>
            </div>

            <!-- 网口列表 -->
            <div class="phone-config__body">
              <div
                v-for="(port, pi) in portConfigs"
                :key="pi"
                class="phone-port"
                :class="{ 'is-connected': port.connected }"
              >
                <!-- 网口标题行 -->
                <div class="phone-port__head">
                  <span class="phone-port__name">{{ port.name }}</span>
                  <span class="phone-port__status" :class="port.connected ? 'online' : 'offline'">
                    {{ port.connected ? '已接入' : '未接入' }}
                  </span>
                </div>

                <!-- 已接入：显示基本信息 + 摄像头 -->
                <template v-if="port.connected">
                  <!-- 自动开关 -->
                  <div class="phone-port__auto">
                    <span>自动获取</span>
                    <a-switch v-model:checked="port.auto" size="small" />
                  </div>

                  <!-- 手动模式：显示字段 -->
                  <div v-if="!port.auto" class="phone-port__fields">
                    <div class="phone-port__field">
                      <label>地址</label>
                      <input v-model="port.address" />
                    </div>
                    <div class="phone-port__field">
                      <label>网关</label>
                      <input v-model="port.gateway" />
                    </div>
                    <div class="phone-port__field">
                      <label>子网掩码</label>
                      <input v-model="port.mask" />
                    </div>
                    <div class="phone-port__field">
                      <label>DNS</label>
                      <input v-model="port.dns" />
                    </div>
                  </div>

                  <!-- 自动模式：只读显示全部网络信息 -->
                  <div v-else class="phone-port__info">
                    <div class="phone-port__info-row">
                      <span>地址</span>
                      <strong>{{ port.address }}</strong>
                    </div>
                    <div class="phone-port__info-row">
                      <span>网关</span>
                      <strong>{{ port.gateway }}</strong>
                    </div>
                    <div class="phone-port__info-row">
                      <span>子网掩码</span>
                      <strong>{{ port.mask }}</strong>
                    </div>
                    <div class="phone-port__info-row">
                      <span>DNS</span>
                      <strong>{{ port.dns }}</strong>
                    </div>
                  </div>

                  <!-- 发现的摄像头 -->
                  <div class="phone-port__cameras">
                    <div class="phone-port__cameras-title">发现的摄像头（{{ port.cameras.length }}）</div>
                    <div v-for="cam in port.cameras" :key="cam" class="phone-port__camera">
                      <i class="i-ant-design-video-camera-outlined" />
                      <span>{{ cam }}</span>
                    </div>
                  </div>
                </template>

                <!-- 未接入 -->
                <div v-else class="phone-port__empty">
                  <i class="i-ant-design-api-outlined" />
                  <span>等待接入</span>
                </div>
              </div>
            </div>

            <!-- 底部保存 -->
            <div class="phone-config__footer">
              <button class="phone-config__save" type="button" @click="networkConfigModalVisible = false">
                保存配置
              </button>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

/* 全屏拦截蒙版（center / highlight-modal 模式） */
.guide-mask-full {
  position: fixed;
  inset: 0;
  z-index: 1998;
  background: rgba(0, 0, 0, 0.45);
  /* highlight-modal 模式下不拦截点击，让弹窗自带遮罩处理点击关闭 */
  pointer-events: none;
}

/* 普通高亮模式：4 块蒙版拼接镂空 */
.guide-mask-piece {
  position: fixed;
  z-index: 1998;
  background: rgba(0, 0, 0, 0.45);
  pointer-events: auto;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 镂空高亮区域（边框，不拦截点击） */
.guide-highlight {
  position: fixed;
  z-index: 1999;
  border-radius: 8px;
  border: 2px solid $color-primary;
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* 提示气泡 */
.guide-tip {
  position: fixed;
  z-index: 1999;
  width: 320px;
  background: #fff;
  border-radius: 12px;
  padding: 16px 18px;
  box-shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.15);

  /* highlight-modal 模式：气泡浮在弹窗（z-index 2000）之上 */
  &.guide-tip--above-modal {
    z-index: 2001;
  }

  /* 箭头朝向目标元素 */
  &.tip-arrow--left::after {
    content: '';
    position: absolute;
    top: 20px;
    right: -7px;
    width: 0; height: 0;
    border-top: 7px solid transparent;
    border-bottom: 7px solid transparent;
    border-left: 7px solid #fff;
    filter: drop-shadow(2px 0 1px rgba(0,0,0,0.08));
  }
  &.tip-arrow--right::before {
    content: '';
    position: absolute;
    top: 20px;
    left: -7px;
    width: 0; height: 0;
    border-top: 7px solid transparent;
    border-bottom: 7px solid transparent;
    border-right: 7px solid #fff;
    filter: drop-shadow(-2px 0 1px rgba(0,0,0,0.08));
  }
  &.tip-arrow--bottom::after {
    content: '';
    position: absolute;
    top: -7px;
    left: 20px;
    width: 0; height: 0;
    border-left: 7px solid transparent;
    border-right: 7px solid transparent;
    border-bottom: 7px solid #fff;
    filter: drop-shadow(0 -2px 1px rgba(0,0,0,0.08));
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  &__step {
    font-size: 11px;
    font-weight: 600;
    color: $color-primary;
    background: $color-primary-bg;
    padding: 2px 8px;
    border-radius: 9999px;
  }

  &__close {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: $text-muted;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: all 0.15s;
    i { font-size: 14px; }
    &:hover { color: $text-base; background: $bg-hover; }
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
  }

  &__done-icon {
    font-size: 20px;
    color: $color-online;
  }

  &__desc {
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.6;
    color: $text-secondary;
    word-break: break-all;
  }

  &__actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  &__btn {
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 34px;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
    i { font-size: 14px; }

    &--default {
      border: 1px solid $border-color-light;
      background: #fff;
      color: $text-secondary;
      &:hover { border-color: $color-primary; color: $color-primary; }
    }

    &--primary {
      border: 1px solid $color-primary;
      background: $color-primary;
      color: #fff;
      &:hover { background: $color-primary-hover; }
    }
  }

  &__footer {
    padding-top: 8px;
    border-top: 1px solid $border-color-card;
    margin-top: 4px;
  }

  &__hint {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: $text-muted;
    i { font-size: 12px; }
  }

  &__offline-actions {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    margin-top: 4px;

    .guide-tip__actions {
      width: 100%;
    }
  }

  &__skip {
    border: none;
    background: transparent;
    color: $text-muted;
    font-size: 13px;
    cursor: pointer;
    padding: 2px 8px;
    transition: color 0.15s;
    &:hover { color: $color-primary; }
  }
}

/* 动画 */
.guide-tip-enter-active, .guide-tip-leave-active {
  transition: all 0.25s cubic-bezier(0.23, 1, 0.32, 1);
}
.guide-tip-enter-from, .guide-tip-leave-to {
  opacity: 0;
  transform: translate(0, 8px) scale(0.95);
}

/* ===== 网关离线提示页：视频播放器 + 安装方式 ===== */
.guide-tip__offline {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 4px;
}

/* 内联视频播放器 */
.gw-video {
  &__player {
    position: relative;
    aspect-ratio: 16 / 9;
    border-radius: 8px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.15s;

    &:hover {
      .gw-video__play { transform: scale(1.12); }
    }

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at center, rgba(110, 75, 255, 0.15), transparent 70%);
    }
  }

  &__play {
    font-size: 42px;
    color: #fff;
    opacity: 0.9;
    transition: transform 0.2s;
    z-index: 1;
  }

  &__label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 8px;
    z-index: 1;
  }

  &__bar {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 6px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
    z-index: 1;
  }

  &__time {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
    font-family: 'Courier New', monospace;
  }

  &__fs {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: color 0.15s;
    &:hover { color: #fff; }
  }
}

.gw-methods {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gw-method {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.5;

  i {
    font-size: 14px;
    flex-shrink: 0;
    margin-top: 1px;
    &:first-child { color: #52c41a; }
  }

  &:last-child i { color: #faad14; }

  strong { color: $text-base; font-weight: 600; }
}

/* 离线提示页加宽 */
.guide-tip--wide {
  width: 380px;
}

/* ===== 网关在线提示弹窗 ===== */
.gw-online-modal {
  padding: 24px 28px 20px;
  text-align: center;

  &__icon {
    font-size: 48px;
    margin-bottom: 14px;

    i { font-size: 48px; }
  }

  &__title {
    font-size: 18px;
    font-weight: 600;
    color: $text-base;
    margin: 0 0 10px;
  }

  &__desc {
    font-size: 13px;
    color: $text-secondary;
    line-height: 1.7;
    margin: 0 0 16px;
  }

  &__cameras {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0 0 20px;
    padding: 12px 14px;
    background: $bg-page;
    border-radius: 10px;
    text-align: left;
  }

  &__camera {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  &__cam-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;

    &.online { background: $color-online; }
    &.offline { background: #bfbfbf; }
  }

  &__cam-name {
    font-weight: 500;
    color: $text-base;
  }

  &__cam-ip {
    margin-left: auto;
    color: $text-muted;
    font-family: 'Courier New', monospace;
    font-size: 11px;
  }

  &__actions {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 12px;

    .guide-tip__btn { flex: none; min-width: 120px; }
  }

  &__skip {
    margin: 0 auto;
  }
}

/* ===== 视频教程播放弹窗 ===== */
.tutorial-player {
  display: flex;
  flex-direction: column;

  &.is-fullscreen {
    height: 100vh;
  }

  &__video {
    background: #000;
    aspect-ratio: 16 / 9;
    display: flex;
    align-items: center;
    justify-content: center;

    .is-fullscreen & {
      aspect-ratio: unset;
      flex: 1;
    }
  }

  &__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: rgba(255, 255, 255, 0.5);

    i { font-size: 48px; cursor: pointer; transition: all 0.15s; &:hover { color: #fff; transform: scale(1.1); } }
    span { font-size: 14px; }
  }

  &__controls {
    padding: 10px 16px;
    background: #1a1a2e;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__progress {
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    overflow: hidden;
  }

  &__progress-bar {
    height: 100%;
    width: 32%;
    background: $color-primary;
    border-radius: 2px;
  }

  &__btns {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__btn {
    border: none;
    background: transparent;
    color: #fff;
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    i { font-size: 18px; }
    &:hover { color: $color-primary; }
  }

  &__time {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    font-family: 'Courier New', monospace;
  }
}

/* ===== 网关离线：循环检测状态条 ===== */
.gw-detect {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
  color: #fff;
  margin-bottom: 4px;
  transition: background 0.4s ease;

  /* 检测中 */
  &.detecting {
    background: linear-gradient(135deg, #312e81 0%, #1e1b4b 100%);
  }

  /* 已上线 */
  &.online {
    background: linear-gradient(135deg, rgba(82, 196, 26, 0.12) 0%, rgba(82, 196, 26, 0.04) 100%);
    border: 1px solid rgba(82, 196, 26, 0.3);
  }

  &__indicator {
    position: relative;
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }

  &__dot {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.4);

    .detecting & { background: #a78bfa; }
    .online & { background: $color-online; }
  }

  &__pulse {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    opacity: 0;
    pointer-events: none;

    .detecting & {
      background: #a78bfa;
      opacity: 0.5;
      animation: gw-pulse 1s ease-out infinite;
    }
    .online & { display: none; }
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__label {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.9);

    .detecting & { color: #c4b5fd; }
    .online & { color: $color-online; }
  }

  &__hint {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.45);
    line-height: 1.4;

    .online & { color: $text-secondary; }
  }

  &__btn {
    flex-shrink: 0;
    height: 30px;
    padding: 0 16px;
    border: none;
    border-radius: 8px;
    background: $color-primary;
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;

    &:hover { background: $color-primary-hover; }
  }

  &__icon {
    font-size: 18px;
    flex-shrink: 0;

    .detecting & { color: #a78bfa; }
    .online & { color: $color-online; font-size: 20px; }
  }
}

@keyframes gw-pulse {
  0% { transform: scale(1); opacity: 0.5; }
  100% { transform: scale(2.8); opacity: 0; }
}

/* ===== 网关离线：App 操作入口（气泡外侧） ===== */
.gw-offline-app-entry {
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1999;

  &__btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 24px;
    border: 1px dashed rgba(255, 255, 255, 0.4);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(8px);
    color: #fff;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;

    > i { font-size: 24px; }
    span { font-size: 14px; font-weight: 600; }
    small { font-size: 11px; opacity: 0.6; }

    &:hover {
      background: rgba(255, 255, 255, 0.15);
      border-color: rgba(255, 255, 255, 0.6);
    }
  }
}

/* ===== 网关上线提示 toast ===== */
.online-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2200;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 32px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);

  &__icon {
    font-size: 28px;
    color: $color-online;
  }

  span {
    font-size: 18px;
    font-weight: 600;
    color: $text-base;
  }
}

.online-toast-enter-active, .online-toast-leave-active {
  transition: all 0.3s ease;
}
.online-toast-enter-from, .online-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.85);
}

/* ===== 发现网关上线：场景选择弹窗 ===== */
.detect-select {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__desc {
    font-size: 13px;
    color: $text-secondary;
    margin: 0 0 4px;
  }

  &__option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border: 2px solid $border-color-card;
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;
    font-family: inherit;

    > i:first-child {
      font-size: 24px;
      color: $color-primary;
      flex-shrink: 0;
    }

    > i:last-child {
      font-size: 14px;
      color: $text-muted;
      margin-left: auto;
    }

    &:hover {
      border-color: $color-primary;
      background: $color-primary-bg;
    }
  }

  &__option-body {
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong { font-size: 14px; font-weight: 600; color: $text-base; }
    span { font-size: 12px; color: $text-muted; }
  }
}

/* ===== 手机模拟器弹窗 ===== */
.phone-mock {
  width: 300px;
  height: 600px;
  margin: 0 auto;
  background: #1a1a1a;
  border-radius: 36px;
  padding: 10px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.3);

  &__notch {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 22px;
    background: #1a1a1a;
    border-radius: 0 0 14px 14px;
    z-index: 10;
  }

  &__screen {
    width: 100%;
    height: 100%;
    background: #f5f5f5;
    border-radius: 28px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
  }
}

/* 登录页 */
.phone-login {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  img {
    width: 100%;
    flex: 1;
    object-fit: contain;
    object-position: top;
  }

  &__enter {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 12px;
    border: none;
    background: $color-primary;
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    i { font-size: 13px; }
    &:hover { background: $color-primary-hover; }
  }
}

/* 网关配置页 */
.phone-config {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  &__header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 28px 14px 12px;
    background: #fff;
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
    flex-shrink: 0;

    i {
      font-size: 18px;
      cursor: pointer;
      color: $text-secondary;
      &:hover { color: $color-primary; }
    }
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__footer {
    flex-shrink: 0;
    padding: 10px 14px 16px;
    background: #fff;
    border-top: 1px solid #f0f0f0;
  }

  &__save {
    width: 100%;
    height: 38px;
    border: none;
    border-radius: 8px;
    background: $color-primary;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    &:hover { background: $color-primary-hover; }
  }
}

/* 网口卡片 */
.phone-port {
  background: #fff;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #f0f0f0;

  &.is-connected {
    border-color: rgba(82, 196, 26, 0.3);
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    border-bottom: 1px solid #f5f5f5;
  }

  &__name {
    font-size: 13px;
    font-weight: 600;
    color: $text-base;
  }

  &__status {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;

    &.online { background: rgba(82, 196, 26, 0.1); color: #52c41a; }
    &.offline { background: rgba(0, 0, 0, 0.06); color: #999; }
  }

  &__auto {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    font-size: 12px;
    color: $text-secondary;
  }

  &__info {
    padding: 4px 12px 8px;
  }

  &__info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    padding: 3px 0;

    span { color: $text-muted; }
    strong { color: $text-base; font-family: 'Courier New', monospace; }
  }

  &__fields {
    padding: 4px 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 2px;

    label { font-size: 11px; color: $text-muted; }

    input {
      width: 100%;
      height: 30px;
      padding: 0 8px;
      border: 1px solid #e8e8e8;
      border-radius: 6px;
      font-size: 12px;
      color: $text-base;
      font-family: 'Courier New', monospace;
      outline: none;
      &:focus { border-color: $color-primary; }
    }
  }

  &__cameras {
    padding: 8px 12px;
    border-top: 1px solid #f5f5f5;
  }

  &__cameras-title {
    font-size: 11px;
    color: $text-muted;
    margin-bottom: 6px;
  }

  &__camera {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 3px 0;
    font-size: 12px;
    color: $text-base;

    i { font-size: 13px; color: $color-primary; }
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 24px 0;

    i { font-size: 28px; color: #d9d9d9; }
    span { font-size: 12px; color: #bbb; }
  }
}
</style>

<!-- 非 scoped：highlight-modal 模式下隐藏 ant-design 自带遮罩，避免与引导蒙版叠加 -->
<style>
.bind-modal-wrap .ant-modal-mask,
.add-device-modal-wrap .ant-modal-mask,
.alarm-wizard-modal .ant-modal-mask,
.gw-online-modal-wrap .ant-modal-mask {
  background: transparent !important;
}

/* 网关在线弹窗：右侧空间不足时通过 JS 动态左移，给引导气泡留位置 */
.gw-online-modal-wrap.ant-modal-centered .ant-modal {
  margin-left: var(--modal-shift-x, 0px) !important;
  transition: margin-left 0.3s ease;
}
</style>
