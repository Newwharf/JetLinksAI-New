import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 引导步骤枚举
 */
export type GuideStep =
  | ''               // 未激活
  | 'add-gateway'    // 指向「新增网关」按钮
  | 'bind-gateway'   // 绑定弹窗内
  | 'gw-online-configured'  // 网关在线且已配置摄像头（center 提示页）
  | 'gw-online-empty'       // 网关在线但无摄像头（center 提示页）
  | 'gw-offline'            // 网关离线（center 提示页）
  | 'gw-address'            // 网关地址页：指向「新增」按钮
  | 'goto-config'    // 指向「配置设备」按钮
  | 'scan-device'    // 配置页内指向「一键同步」
  | 'select-device'  // 配置页内提示选择设备
  | 'bind-device'    // 配置页内提示绑定
  | 'done'           // 完成提示（仪表盘引导）
  | 'video-done'     // 视联引导完成结束语
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
  const scenario = ref<string>('general')

  function setScenario(s: string) {
    scenario.value = s
  }

  // ===== 引导流程状态 =====
  const GUIDE_STORAGE_KEY = 'jetlinks-guide-finished'

  // 欢迎弹窗是否显示
  const welcomeVisible = ref(false)
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
  // 离线网关更新通道触发标记（DeviceManageView watch 此标记来切换网关状态）
  const guideOfflineUpdateTrigger = ref(0)

  function showWelcome() {
    welcomeVisible.value = true
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

  /** 启动视联设备引导 */
  function startVideoGuide() {
    welcomeVisible.value = false
    guideActive.value = true
    guideStep.value = 'add-gateway'
  }

  /** 从监控设备管理页直接启动引导（不跳转路由） */
  function startVideoGuideDirect() {
    guideActive.value = true
    guideStep.value = 'add-gateway'
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
    welcomeVisible, guideActive, guideStep, guideFinished,
    guideGatewayId, guideBindResult, guideOfflineUpdateTrigger,
    showWelcome, closeWelcome, skipGuide,
    startVideoGuide, startVideoGuideDirect, startIotGuideDirect, startAlarmGuideDirect,
    setGuideStep, finishGuide, triggerOfflineUpdate
  }
})
