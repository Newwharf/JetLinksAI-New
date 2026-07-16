import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 引导步骤枚举
 */
export type GuideStep =
  | ''               // 未激活
  // 工作台接入网关引导步骤
  | 'workbench-gateway-tab'
  | 'workbench-gateway-access'
  | 'bind-gateway'
  | 'gw-online-configured'  // 网关在线且已配置摄像头（center 提示页）
  | 'gw-online-empty'       // 网关在线但无摄像头（center 提示页）
  | 'gw-offline'            // 网关离线（center 提示页）
  | 'workbench-gateway-detail' // 指向工作台网关卡片的「网关详情」
  | 'gateway-detail-enter'     // 指向网关详情页的「进入网关」
  // IoT 引导步骤
  | 'iot-add'        // 指向「新增设备」按钮
  | 'iot-select'     // 选择设备库弹窗内
  | 'iot-config'     // 填写配置信息弹窗内
  | 'iot-detail'     // 指向设备名称（进入详情页）
  | 'iot-access'       // 指向「设备接入」tab
  | 'iot-access-config' // 框住接入方式 + 接入地址 + 连接参数整体
  | 'iot-done'         // IoT 引导完成结束语
  // 告警规则引导步骤
  | 'alarm-create'   // 指向「新建告警规则」按钮
  | 'alarm-step0'    // 基础信息
  | 'alarm-step1'    // 场景算法
  | 'alarm-step2'    // 生效摄像头
  | 'alarm-step3'    // 生效时段
  | 'alarm-step4'    // 通知对象
  | 'alarm-done'     // 告警引导完成
  // 系统总览引导步骤
  | 'system-dashboard'
  | 'system-space'
  | 'system-video'
  | 'system-image-search'
  | 'system-flow'
  | 'system-alarm'
  | 'system-inspection'
  | 'system-visualization'
  | 'system-iot'
  | 'system-archive'
  | 'system-done'
  // 网关地址页引导步骤
  | 'gateway-workbench'
  | 'gateway-iot'
  | 'gateway-config'
  | 'gateway-video'
  | 'gateway-system'
  | 'gateway-ai'
  | 'gateway-resource'

/**
 * 应用级全局状态
 * 用法：const appStore = useAppStore()
 */
export const useAppStore = defineStore('app', () => {
  const darkMode = ref(false)

  function toggleDark() {
    darkMode.value = !darkMode.value
    document.documentElement.classList.toggle('dark', darkMode.value)
  }

  // 当前场景（决定一级菜单组成 + 二级 tab 过滤）
  // general | commercial | security | apartment | factory | elderly | construction
  const scenario = ref<string>('construction')

  function setScenario(s: string) {
    scenario.value = s
  }

  // ===== 引导流程状态 =====
  const GUIDE_STORAGE_KEY = 'jetlinks-guide-finished'

  // 欢迎弹窗是否显示
  const welcomeVisible = ref(false)
  // 从工作台进入项目后，只在仪表盘消费一次欢迎弹窗
  const projectWelcomePending = ref(false)
  // 引导是否激活
  const guideActive = ref(false)
  // 当前引导步骤
  const guideStep = ref<GuideStep>('')
  // 引导是否已完成（localStorage 持久化，刷新后不再弹出）
  const guideFinished = ref(localStorage.getItem(GUIDE_STORAGE_KEY) === 'true')
  // 引导中创建的网关 ID（用于离线→在线状态切换等跨组件操作）
  const guideGatewayId = ref('')
  // 引导中选择的绑定结果（'configured' | 'empty' | 'offline'）
  const guideBindResult = ref('')
  // 引导中网关所属项目名称
  const guideGatewayProjectName = ref('')
  // 离线网关更新通道触发标记（DeviceManageView watch 此标记来切换网关状态）
  const guideOfflineUpdateTrigger = ref(0)

  function showWelcome() {
    guideActive.value = false
    guideStep.value = ''
    welcomeVisible.value = true
  }

  function requestProjectWelcome() {
    projectWelcomePending.value = true
  }

  function consumeProjectWelcome() {
    if (!projectWelcomePending.value) return false
    projectWelcomePending.value = false
    return true
  }

  function closeWelcome() {
    welcomeVisible.value = false
  }

  /** 跳过引导，标记完成 */
  function skipGuide() {
    welcomeVisible.value = false
    guideActive.value = false
    guideStep.value = ''
    guideFinished.value = true
    localStorage.setItem(GUIDE_STORAGE_KEY, 'true')
  }

  /** 从物联设备列表页直接启动引导 */
  function startIotGuideDirect() {
    guideActive.value = true
    guideStep.value = 'iot-add'
  }

  /** 从告警规则页直接启动引导 */
  function startAlarmGuideDirect() {
    guideActive.value = true
    guideStep.value = 'alarm-create'
  }

  /** 从项目欢迎页启动系统总览引导 */
  function startSystemGuide() {
    welcomeVisible.value = false
    guideActive.value = true
    guideStep.value = 'system-dashboard'
  }

  /** 从工作台项目创建成功页启动接入网关引导 */
  function startWorkbenchGatewayGuide() {
    welcomeVisible.value = false
    guideActive.value = true
    guideStep.value = 'workbench-gateway-tab'
  }

  /** 推进到下一步 */
  function setGuideStep(step: GuideStep) {
    guideStep.value = step
  }

  /** 完成引导 */
  function finishGuide() {
    guideActive.value = false
    guideStep.value = ''
    guideFinished.value = true
    localStorage.setItem(GUIDE_STORAGE_KEY, 'true')
  }

  /** 触发离线网关更新通道（自增标记，DeviceManageView watch 变化） */
  function triggerOfflineUpdate() {
    guideOfflineUpdateTrigger.value++
  }

  return {
    darkMode, toggleDark, scenario, setScenario,
    welcomeVisible, projectWelcomePending, guideActive, guideStep, guideFinished,
    guideGatewayId, guideBindResult, guideGatewayProjectName, guideOfflineUpdateTrigger,
    showWelcome, requestProjectWelcome, consumeProjectWelcome, closeWelcome, skipGuide,
    startIotGuideDirect, startAlarmGuideDirect, startSystemGuide, startWorkbenchGatewayGuide,
    setGuideStep, finishGuide, triggerOfflineUpdate
  }
})
