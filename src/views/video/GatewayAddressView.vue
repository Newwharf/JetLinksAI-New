<script setup lang="ts">
/**
 * 网关地址页 — 独立全屏静态页面
 * 自带顶部导航 + 左侧菜单，不使用 ProjectLayout
 */
import { ref, nextTick } from 'vue'
import { message } from 'ant-design-vue'
import { useAppStore } from '@/stores/app'
import GuideOverlay from '@/components/GuideOverlay.vue'
import cameraImg from '@/assets/cameras/camera.png'
import cam1 from '@/assets/text-search/result-01.jpg'
import cam2 from '@/assets/text-search/result-02.jpg'
import cam3 from '@/assets/text-search/result-03.jpg'
import cam4 from '@/assets/text-search/result-04.jpg'

const appStore = useAppStore()

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
  // 引导联动：点击新增 → 推进到 scan-device
  if (appStore.guideStep === 'gw-address') {
    nextTick(() => appStore.setGuideStep('scan-device'))
  }
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
    // 引导联动：扫描完成 → 推进到 select-device
    if (appStore.guideStep === 'scan-device') {
      nextTick(() => appStore.setGuideStep('select-device'))
    }
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
  // 引导联动：进入认证步
  if (appStore.guideStep === 'select-device') {
    nextTick(() => appStore.setGuideStep('bind-device'))
  }
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
    // 引导联动：全部成功 → 推进到 done
    if (fail.length === 0 && appStore.guideActive && (appStore.guideStep === 'bind-device' || appStore.guideStep === 'select-device')) {
      nextTick(() => appStore.setGuideStep('done'))
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
  // 引导联动
  if (appStore.guideActive) {
    nextTick(() => appStore.setGuideStep('done'))
  }
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
        <span class="ga-topnav">工作台</span>
        <span class="ga-topnav">物联网</span>
        <span class="ga-topnav">网关配置</span>
        <span class="ga-topnav ga-topnav--active">视频中心</span>
        <span class="ga-topnav">系统管理</span>
        <span class="ga-topnav">人工智能</span>
        <span class="ga-topnav">资源库</span>
      </nav>
      <div class="ga-topbar__right">
        <i class="i-ant-design-user-outlined" />
      </div>
    </header>

    <div class="ga-body">
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
            :data-guide="appStore.guideStep === 'gw-address' ? 'gw-address-add' : undefined"
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
                  <button class="ga-scan-hero__btn" data-guide="scan-device" :disabled="scanning" @click="startScan">
                    <i :class="scanning ? 'i-ant-design-loading-outlined ga-spin' : 'i-ant-design-sync-outlined'" />
                    <span>{{ scanning ? '扫描中...' : '一键同步' }}</span>
                  </button>
                </div>
              </div>

              <!-- 步骤二：选择设备 -->
              <div v-if="addStep === 'select'" class="ga-select-area" data-guide="select-device">
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
    </div>
  </div>

  <!-- ===== 绑定弹窗 ===== -->
  <a-modal
    v-model:open="bindModalVisible"
    :title="bindStep === 'auth' ? '输入账号密码' : '绑定结果'"
    :width="440"
    :footer="null"
    centered
    :mask-closable="!appStore.guideActive"
    :z-index="appStore.guideActive ? 2000 : 1000"
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
  <GuideOverlay />
</template>

<style scoped lang="scss">
/* ===== 全局重置 ===== */
.ga-shell {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  background: #f0f2f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: #333;
  overflow: hidden;
}

/* ===== 顶部导航栏 ===== */
.ga-topbar {
  height: 56px;
  background: #132329;
  display: flex;
  align-items: center;
  padding: 0 20px;
  flex-shrink: 0;
  gap: 40px;

  &__logo {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 17px;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;

    i { font-size: 22px; color: #3b82f6; }
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
  font-size: 14px;
  color: #94a3b8;
  padding: 0 18px;
  height: 56px;
  line-height: 56px;
  cursor: pointer;
  transition: color 0.15s;
  position: relative;

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
      background: #3b82f6;
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

/* ===== 左侧菜单 ===== */
.ga-sider {
  width: 200px;
  background: #132329;
  flex-shrink: 0;
  padding: 12px 0;
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
    gap: 10px;
    padding: 10px 20px;
    font-size: 13px;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.15s;
    border-left: 3px solid transparent;

    i { font-size: 15px; flex-shrink: 0; }

    &:hover { color: #e2e8f0; background: rgba(255, 255, 255, 0.03); }

    &--active {
      color: #fff;
      background: rgba(59, 130, 246, 0.15);
      border-left-color: #3b82f6;

      i { color: #3b82f6; }
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
  color: #64748b;

  i { font-size: 11px; }
  span:last-child { color: #333; }
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
