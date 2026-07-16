<script setup lang="ts">
/**
 * 网关设备配置页
 * 从「监控设备管理」点击「配置设备」进入
 * 展示该网关下已绑定的摄像头卡片网格 + 新增设备弹窗（扫描→选择→输入密码→绑定）
 */
import { message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import {
  gateways,
  channels,
  areaText,
  scannedCameras,
  type VideoChannel,
  type ScannedCamera
} from './device.mock'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

// ===== 当前网关 =====
const gatewayId = computed(() => String(route.params.id || ''))
const gateway = computed(() => gateways.find(g => g.id === gatewayId.value))

// ===== 已绑定的摄像头（从 channels 按 gatewayId 过滤） =====
const boundChannels = ref<VideoChannel[]>(
  channels.value.filter(c => c.gatewayId === gatewayId.value)
)

// 搜索
const searchKey = ref('')
const filteredChannels = computed(() => {
  const kw = searchKey.value.trim().toLowerCase()
  if (!kw) return boundChannels.value
  return boundChannels.value.filter(c =>
    c.name.toLowerCase().includes(kw) ||
    areaText(c.areaPath).toLowerCase().includes(kw)
  )
})

// ===== 新增设备弹窗 =====
const addModalVisible = ref(false)

// 弹窗步骤: scan(扫描) → select(选择) → auth(输入密码) → result(结果)
type AddStep = 'scan' | 'select' | 'auth' | 'result'
const addStep = ref<AddStep>('scan')

// 扫描状态
const scanning = ref(false)
const scanDone = ref(false)

// 扫描到的摄像头（本次弹窗的副本，可修改 bound 状态）
const scanList = ref<ScannedCamera[]>([])
// 选中的摄像头 id
const selectedIds = ref<Set<string>>(new Set())

// 认证输入
const authAccount = ref('')
const authPassword = ref('')
const authError = ref('')
const binding = ref(false)

// 绑定结果
const bindSuccessList = ref<ScannedCamera[]>([])
const bindFailList = ref<ScannedCamera[]>([])

function openAddModal() {
  addModalVisible.value = true
  resetAddModal()
}

function resetAddModal() {
  addStep.value = 'scan'
  scanning.value = false
  scanDone.value = false
  scanList.value = []
  selectedIds.value = new Set()
  authAccount.value = ''
  authPassword.value = ''
  authError.value = ''
  binding.value = false
  bindSuccessList.value = []
  bindFailList.value = []
}

function closeAddModal() {
  addModalVisible.value = false
}

// 一键同步 — 扫描局域网
function startScan() {
  scanning.value = true
  scanDone.value = false
  setTimeout(() => {
    // 复制扫描数据，排除已绑定的
    const alreadyBoundIds = new Set(boundChannels.value.map(c => c.id))
    scanList.value = scannedCameras
      .filter(c => !alreadyBoundIds.has(c.id))
      .map(c => ({ ...c }))
    scanning.value = false
    scanDone.value = true
    addStep.value = 'select'
  }, 1500)
}

// 选中/取消选中（已接入的设备不可选）
function toggleSelect(cam: ScannedCamera) {
  if (cam.accessed) return
  if (selectedIds.value.has(cam.id)) {
    selectedIds.value.delete(cam.id)
  } else {
    selectedIds.value.add(cam.id)
  }
}

const selectedCount = computed(() => selectedIds.value.size)
const accessedCount = computed(() => scanList.value.filter(c => c.accessed).length)

// 选择步内重新扫描（不返回同步页，直接刷新列表）
const rescanning = ref(false)
function rescanInSelect() {
  if (rescanning.value) return
  rescanning.value = true
  selectedIds.value = new Set()
  setTimeout(() => {
    const alreadyBoundIds = new Set(boundChannels.value.map(c => c.id))
    scanList.value = scannedCameras
      .filter(c => !alreadyBoundIds.has(c.id))
      .map(c => ({ ...c }))
    rescanning.value = false
  }, 1200)
}

// 从选择步进入认证步
function goToAuth() {
  if (selectedCount.value === 0) return
  authAccount.value = 'admin'
  authPassword.value = ''
  authError.value = ''
  addStep.value = 'auth'
}

// 执行绑定
function handleBind() {
  authError.value = ''
  if (!authAccount.value.trim() || !authPassword.value.trim()) {
    authError.value = '请输入账号和密码'
    return
  }

  binding.value = true
  setTimeout(() => {
    binding.value = false
    const selected = scanList.value.filter(c => selectedIds.value.has(c.id))
    const success: ScannedCamera[] = []
    const fail: ScannedCamera[] = []

    selected.forEach(cam => {
      if (cam.account === authAccount.value.trim() && cam.password === authPassword.value.trim()) {
        success.push(cam)
      } else {
        fail.push(cam)
      }
    })

    bindSuccessList.value = success
    bindFailList.value = fail

    if (fail.length === 0) {
      // 全部成功 — 添加到已绑定列表
      success.forEach(cam => {
        boundChannels.value.push({
          id: 'ch-' + cam.id,
          name: cam.name,
          thumb: cam.thumb,
          gatewayId: gatewayId.value,
          areaPath: [],
          status: 'online',
          ptz: false
        })
      })
      message.success(`成功绑定 ${success.length} 台摄像头`)
      addModalVisible.value = false
    } else {
      // 有失败 — 进入结果步展示错误
      addStep.value = 'result'
    }
  }, 800)
}

// 结果步：重新输入密码（只针对失败的，回到 auth 步统一输入）
function retryAuth() {
  authError.value = ''
  authAccount.value = 'admin'
  authPassword.value = ''
  // 只保留失败的在选中列表
  selectedIds.value = new Set(bindFailList.value.map(c => c.id))
  addStep.value = 'auth'
}

// 结果步：确认绑定成功的，跳过失败的
function confirmPartial() {
  bindSuccessList.value.forEach(cam => {
    boundChannels.value.push({
      id: 'ch-' + cam.id,
      name: cam.name,
      thumb: cam.thumb,
      gatewayId: gatewayId.value,
      areaPath: [],
      status: 'online',
      ptz: false
    })
  })
  if (bindSuccessList.value.length > 0) {
    message.success(`成功绑定 ${bindSuccessList.value.length} 台摄像头`)
  }
  addModalVisible.value = false
}

// ===== 单设备重试弹窗 =====
const retryModalVisible = ref(false)
const retryTarget = ref<ScannedCamera | null>(null)
const retryAccount = ref('')
const retryPassword = ref('')
const retryError = ref('')
const retryBinding = ref(false)

function openRetryModal(cam: ScannedCamera) {
  retryTarget.value = cam
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

// 单设备绑定
function handleRetryBind() {
  if (!retryTarget.value) return
  retryError.value = ''
  if (!retryAccount.value.trim() || !retryPassword.value.trim()) {
    retryError.value = '请输入账号和密码'
    return
  }

  retryBinding.value = true
  const cam = retryTarget.value
  setTimeout(() => {
    retryBinding.value = false
    if (cam.account === retryAccount.value.trim() && cam.password === retryPassword.value.trim()) {
      // 绑定成功：从失败列表移除，加入成功列表
      bindFailList.value = bindFailList.value.filter(c => c.id !== cam.id)
      bindSuccessList.value.push(cam)
      message.success(`「${cam.name}」绑定成功`)
      retryModalVisible.value = false
    } else {
      retryError.value = '账号或密码错误，请重试'
    }
  }, 600)
}

// 解绑摄像头
function unbindChannel(ch: VideoChannel) {
  const idx = boundChannels.value.findIndex(c => c.id === ch.id)
  if (idx >= 0) {
    boundChannels.value.splice(idx, 1)
    message.success(`已解绑「${ch.name}」`)
  }
}

// 返回
function goBack() {
  router.push('/video/device')
}


</script>

<template>
  <div class="gw-config-page">
    <!-- 顶部网关信息卡片 -->
    <div class="gc-info-card">
      <div class="gc-info-card__left">
        <span class="gc-info-card__icon" :class="gateway?.status">
          <i class="i-ant-design-cloud-server-outlined" />
        </span>
        <div class="gc-info-card__detail">
          <div class="gc-info-card__title-row">
            <strong class="gc-info-card__name">{{ gateway?.name || '网关' }}</strong>
            <span class="gc-info-card__status" :class="gateway?.status">
              <i class="gc-info-card__status-dot" />
              {{ gateway?.status === 'online' ? '在线' : '离线' }}
            </span>
          </div>
          <div class="gc-info-card__meta">
            <span>型号：{{ gateway?.model }}</span>
            <em class="gc-info-card__sep">·</em>
            <span>SN：{{ gateway?.sn }}</span>
            <em class="gc-info-card__sep">·</em>
            <span>IP：{{ gateway?.ip }}</span>
          </div>
        </div>
      </div>
      <div class="gc-info-card__right">
        <button class="gc-back-btn" type="button" @click="goBack">
          <i class="i-ant-design-arrow-left-outlined" />
          <span>返回</span>
        </button>
        <button class="gc-add-btn" type="button" @click="openAddModal">
          <i class="i-ant-design-plus-outlined" />
          <span>新增设备</span>
        </button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="gc-search-bar">
      <a-input
        v-model:value="searchKey"
        class="gc-search"
        placeholder="搜索摄像头名称"
        allow-clear
      >
        <template #prefix>
          <i class="i-ant-design-search-outlined" />
        </template>
      </a-input>
      <span class="gc-search-bar__count">共 {{ filteredChannels.length }} 台设备</span>
    </div>

    <!-- 摄像头卡片网格 -->
    <div class="gc-grid">
      <article
        v-for="ch in filteredChannels"
        :key="ch.id"
        class="gc-card"
      >
        <div class="gc-card__thumb">
          <img :src="ch.thumb" :alt="ch.name" draggable="false" />
          <div class="gc-card__overlay" />
          <span class="gc-card__status" :class="ch.status">
            <i class="gc-card__dot" />
            {{ ch.status === 'online' ? '在线' : '离线' }}
          </span>
        </div>
        <div class="gc-card__body">
          <span class="gc-card__name" :title="ch.name">{{ ch.name }}</span>
          <div class="gc-card__actions">
            <span class="gc-card__area">{{ ch.areaPath.length > 0 ? areaText(ch.areaPath) : '未绑定区域' }}</span>
            <button class="gc-card__unbind" type="button" @click="unbindChannel(ch)">解绑</button>
          </div>
        </div>
      </article>

      <!-- 空状态 -->
      <div v-if="filteredChannels.length === 0" class="gc-empty">
        <i class="i-ant-design-video-camera-outlined gc-empty__icon" />
        <p>{{ searchKey ? '没有找到匹配的设备' : '该网关暂未绑定摄像头' }}</p>
        <button v-if="!searchKey" class="gc-add-btn" type="button" @click="openAddModal">
          <i class="i-ant-design-plus-outlined" />
          <span>新增设备</span>
        </button>
      </div>
    </div>

    <!-- ===== 新增设备弹窗 ===== -->
    <a-modal
      v-model:open="addModalVisible"
      title="新增设备"
      :width="720"
      :footer="null"
      centered
      :body-style="{ padding: '0' }"
      :mask-closable="!appStore.guideActive"
      :z-index="appStore.guideActive ? 2000 : 1000"
      wrap-class-name="add-device-modal-wrap"
      @cancel="closeAddModal"
    >
      <div class="add-modal">
        <!-- 步骤一：扫描 -->
        <div v-if="addStep === 'scan'" class="add-step add-step--scan">
          <div class="scan-hero">
            <div class="scan-hero__icon" :class="{ scanning: scanning }">
              <i class="i-ant-design-radar-chart-outlined" />
            </div>
            <h3 class="scan-hero__title">扫描局域网设备</h3>
            <p class="scan-hero__desc">点击「一键同步」扫描当前局域网内所有可用的摄像头设备，扫描完成后可选择需要绑定的设备。</p>
            <button
              class="scan-hero__btn"
              type="button"
              :disabled="scanning"
              @click="startScan"
            >
              <i :class="scanning ? 'i-ant-design-loading-outlined sync-spin' : 'i-ant-design-sync-outlined'" />
              <span>{{ scanning ? '扫描中...' : '一键同步' }}</span>
            </button>
            <div v-if="scanning" class="scan-hero__progress">
              <div class="scan-hero__progress-bar" />
            </div>
          </div>
        </div>

        <!-- 步骤二：选择设备 -->
        <div v-if="addStep === 'select'" class="add-step">
          <div class="select-bar">
            <span class="select-bar__info">
              共扫描到 <strong>{{ scanList.length }}</strong> 台设备，已选择 <strong>{{ selectedCount }}</strong> 台
            </span>
            <span class="select-bar__access">
              其中 <strong class="text-success">{{ accessedCount }}</strong> 台已接入，<strong class="text-muted">{{ scanList.length - accessedCount }}</strong> 台未接入
            </span>
          </div>

          <!-- 重新扫描中的转圈覆盖 -->
          <div v-if="rescanning" class="select-rescanning">
            <i class="i-ant-design-loading-outlined sync-spin" />
            <span>扫描中...</span>
          </div>
          <div class="select-grid">
            <article
              v-for="cam in scanList"
              :key="cam.id"
              class="sc-card"
              :class="{
                'is-selected': selectedIds.has(cam.id),
                'is-accessed': cam.accessed,
                'is-disabled': cam.accessed
              }"
              @click="toggleSelect(cam)"
            >
              <div class="sc-card__thumb">
                <!-- 已接入的摄像头显示画面，未接入的显示占位 -->
                <template v-if="cam.accessed">
                  <img :src="cam.thumb" :alt="cam.name" draggable="false" />
                </template>
                <template v-else>
                  <div class="sc-card__no-preview">
                    <i class="i-ant-design-video-camera-outlined" />
                    <span>未接入，暂无画面</span>
                  </div>
                </template>
                <!-- 接入状态角标 -->
                <span class="sc-card__access" :class="cam.accessed ? 'accessed' : 'not-accessed'">
                  {{ cam.accessed ? '已接入' : '未接入' }}
                </span>
                <div v-if="!cam.accessed" class="sc-card__check" :class="{ checked: selectedIds.has(cam.id) }">
                  <i class="i-ant-design-check-outlined" />
                </div>
              </div>
              <div class="sc-card__body">
                <span class="sc-card__name" :title="cam.name">{{ cam.name }}</span>
                <span class="sc-card__ip">{{ cam.ip }}</span>
                <span class="sc-card__brand">{{ cam.brand }} · {{ cam.model }}</span>
              </div>
            </article>
          </div>
          <div v-if="scanList.length === 0" class="select-empty">
            <p>局域网内未发现可用设备</p>
          </div>
          <div class="select-actions">
            <button class="gc-modal-btn gc-modal-btn--default" type="button" :disabled="rescanning" @click="rescanInSelect">
              <i :class="rescanning ? 'i-ant-design-loading-outlined sync-spin' : 'i-ant-design-reload-outlined'" />
              <span>{{ rescanning ? '扫描中...' : '重新扫描' }}</span>
            </button>
            <button class="gc-modal-btn gc-modal-btn--primary" type="button" :disabled="selectedCount === 0 || rescanning" @click="goToAuth">
              <span>绑定（{{ selectedCount }}）</span>
            </button>
          </div>
        </div>

        <!-- 步骤三：输入账号密码 -->
        <div v-if="addStep === 'auth'" class="add-step add-step--auth">
          <div class="auth-info">
            <i class="i-ant-design-safety-certificate-outlined auth-info__icon" />
            <div>
              <h3 class="auth-info__title">输入设备账号密码</h3>
              <p class="auth-info__desc">将使用相同的账号密码绑定已选中的 <strong>{{ selectedCount }}</strong> 台设备。正确账号：<code>admin</code>，正确密码：<code>123456</code>（部分设备密码不同）。</p>
            </div>
          </div>
          <div v-if="authError" class="auth-error">
            <i class="i-ant-design-close-circle-filled" />
            <span>{{ authError }}</span>
          </div>
          <div class="auth-form">
            <div class="auth-field">
              <label class="auth-field__label">账号</label>
              <a-input
                v-model:value="authAccount"
                class="auth-field__input"
                placeholder="请输入摄像头账号"
                allow-clear
              >
                <template #prefix>
                  <i class="i-ant-design-user-outlined" />
                </template>
              </a-input>
            </div>
            <div class="auth-field">
              <label class="auth-field__label">密码</label>
              <a-input-password
                v-model:value="authPassword"
                class="auth-field__input"
                placeholder="请输入摄像头密码"
              />
            </div>
          </div>
        </div>

        <!-- 步骤四：绑定结果 -->
        <div v-if="addStep === 'result'" class="add-step add-step--result">
          <div class="result-summary">
            <div class="result-summary__item result-summary__item--ok">
              <i class="i-ant-design-check-circle-filled" />
              <span>{{ bindSuccessList.length }} 台绑定成功</span>
            </div>
            <div v-if="bindFailList.length > 0" class="result-summary__item result-summary__item--fail">
              <i class="i-ant-design-close-circle-filled" />
              <span>{{ bindFailList.length }} 台绑定失败</span>
            </div>
          </div>
          <div v-if="bindFailList.length > 0" class="result-error">
            <div class="result-error__head">
              <i class="i-ant-design-warning-filled" />
              <span>以下设备账号或密码错误，可单独设置：</span>
            </div>
            <ul class="result-error__list">
              <li v-for="cam in bindFailList" :key="cam.id" class="result-error__item">
                <div class="result-error__info">
                  <span class="result-error__name">{{ cam.name }}</span>
                  <span class="result-error__ip">{{ cam.ip }}</span>
                </div>
                <button class="result-error__retry" type="button" @click="openRetryModal(cam)">
                  <i class="i-ant-design-edit-outlined" />
                  <span>设置账号密码</span>
                </button>
              </li>
            </ul>
          </div>
        </div>

        <!-- 底部固定操作栏 -->
        <div v-if="addStep === 'auth'" class="add-modal-footer">
          <button class="gc-modal-btn gc-modal-btn--default" type="button" @click="addStep = 'select'">上一步</button>
          <button class="gc-modal-btn gc-modal-btn--primary" type="button" :disabled="binding" @click="handleBind">
            <i v-if="binding" class="i-ant-design-loading-outlined sync-spin" />
            <span>{{ binding ? '绑定中...' : '绑定' }}</span>
          </button>
        </div>
        <div v-if="addStep === 'result'" class="add-modal-footer">
          <button v-if="bindSuccessList.length > 0" class="gc-modal-btn gc-modal-btn--default" type="button" @click="confirmPartial">
            绑定成功的 {{ bindSuccessList.length }} 台
          </button>
          <button class="gc-modal-btn gc-modal-btn--primary" type="button" @click="retryAuth">
            重新输入密码
          </button>
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
      :body-style="{ padding: '0' }"
      :z-index="2100"
      :mask-closable="!appStore.guideActive"
      @cancel="closeRetryModal"
    >
      <div class="retry-modal">
        <!-- 设备信息 -->
        <div v-if="retryTarget" class="retry-modal__device">
          <div class="retry-modal__thumb-wrap">
            <img v-if="retryTarget.accessed" :src="retryTarget.thumb" :alt="retryTarget.name" class="retry-modal__thumb" />
            <div v-else class="retry-modal__thumb-placeholder">
              <i class="i-ant-design-video-camera-outlined" />
              <span>未接入</span>
            </div>
          </div>
          <div class="retry-modal__device-info">
            <strong class="retry-modal__device-name">{{ retryTarget.name }}</strong>
            <span class="retry-modal__device-ip">{{ retryTarget.ip }}</span>
            <span class="retry-modal__device-brand">{{ retryTarget.brand }} · {{ retryTarget.model }}</span>
          </div>
        </div>

        <!-- 错误提示 -->
        <div v-if="retryError" class="retry-error">
          <i class="i-ant-design-close-circle-filled" />
          <span>{{ retryError }}</span>
        </div>

        <!-- 账号密码输入 -->
        <div class="retry-form">
          <div class="auth-field">
            <label class="auth-field__label">账号</label>
            <a-input
              v-model:value="retryAccount"
              class="auth-field__input"
              placeholder="请输入摄像头账号"
              allow-clear
            >
              <template #prefix>
                <i class="i-ant-design-user-outlined" />
              </template>
            </a-input>
          </div>
          <div class="auth-field">
            <label class="auth-field__label">密码</label>
            <a-input-password
              v-model:value="retryPassword"
              class="auth-field__input"
              placeholder="请输入摄像头密码"
            />
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="retry-actions">
          <button class="gc-modal-btn gc-modal-btn--default" type="button" @click="closeRetryModal">取消</button>
          <button class="gc-modal-btn gc-modal-btn--primary" type="button" :disabled="retryBinding" @click="handleRetryBind">
            <i v-if="retryBinding" class="i-ant-design-loading-outlined sync-spin" />
            <span>{{ retryBinding ? '绑定中...' : '确认绑定' }}</span>
          </button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.gw-config-page {
  height: 100%;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  color: $text-base;
}

/* ===== 顶部网关信息卡片 ===== */
.gc-info-card {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: #fff;
  border-radius: 14px;
  padding: 16px 20px;

  &__left {
    display: flex;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  &__icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    background: $color-primary;

    &.online { background: $color-online; }
    &.offline { background: #bfbfbf; }

    i { font-size: 22px; }
  }

  &__detail {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__name {
    font-size: 16px;
    font-weight: 600;
    color: $text-base;
    line-height: 22px;
  }

  &__status {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
    line-height: 18px;

    &.online { color: $color-online; background: rgba(43, 179, 163, 0.1); }
    &.offline { color: #bfbfbf; background: rgba(0, 0, 0, 0.05); }
  }

  &__status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;

    .gc-info-card__status.online & { background: $color-online; }
    .gc-info-card__status.offline & { background: #bfbfbf; }
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: $text-secondary;
    line-height: 20px;
  }

  &__sep {
    font-style: normal;
    color: $text-muted;
  }

  &__ip {
    font-family: 'Courier New', monospace;
  }

  &__right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}

.gc-back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid $border-color-light;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;

  i { font-size: 14px; }
  &:hover { border-color: $color-primary; color: $color-primary; }
}

.gc-add-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid $color-primary;
  border-radius: 6px;
  background: $color-primary;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;

  i { font-size: 13px; }
  &:hover { background: $color-primary-hover; border-color: $color-primary-hover; }
}

/* ===== 搜索栏 ===== */
.gc-search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  padding: 0 4px;
}

.gc-search {
  width: 280px;
  flex-shrink: 0;
}

.gc-search-bar__count {
  font-size: 13px;
  color: $text-tertiary;
}

/* ===== 摄像头卡片网格（一行 6 个） ===== */
.gc-grid {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 10px;
  align-content: start;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
}

.gc-card {
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;

  &:hover {
    border-color: $color-primary;
    box-shadow: 0 2px 8px rgba(110, 75, 255, 0.08);
  }

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

  &__overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 0%, transparent 40%);
    pointer-events: none;
  }

  &__status {
    position: absolute;
    top: 6px;
    left: 6px;
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 10px;
    color: #fff;
    padding: 2px 6px;
    border-radius: 3px;

    &.online { background: rgba(43, 179, 163, 0.85); }
    &.offline { background: rgba(0, 0, 0, 0.55); }
  }

  &__dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #fff;
  }

  &__body {
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__name {
    font-size: 12px;
    font-weight: 500;
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
  }

  &__area {
    font-size: 11px;
    color: $text-muted;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }

  &__unbind {
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: $text-muted;
    font-size: 11px;
    cursor: pointer;
    padding: 0;
    &:hover { color: #ff4d4f; }
  }
}

/* ===== 空状态 ===== */
.gc-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 20px;
  color: $text-muted;

  &__icon { font-size: 48px; opacity: 0.3; }
  p { font-size: 14px; margin: 0; }
}

/* ===== 弹窗通用 ===== */
.add-modal {
  display: flex;
  flex-direction: column;
  min-height: 400px;
  max-height: 620px;
}

.add-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 24px;
  border-top: 1px solid #f4f5f7;
  background: #fff;
  border-radius: 0 0 8px 8px;
  flex-shrink: 0;
}

.gc-modal-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 16px;
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
    &:hover:not(:disabled) { background: $color-primary-hover; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }
}

/* ===== 步骤一：扫描 ===== */
.add-step { padding: 20px 24px; }

.scan-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 20px;

  &__icon {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: $color-primary-bg;
    color: $color-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;

    &.scanning {
      animation: scan-pulse 1s ease-in-out infinite;
    }
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: $text-base;
  }

  &__desc {
    margin: 0;
    text-align: center;
    font-size: 13px;
    color: $text-tertiary;
    line-height: 1.6;
    max-width: 400px;
  }

  &__btn {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 20px;
    margin-top: 8px;
    border: 1px solid $color-primary;
    border-radius: 6px;
    background: $color-primary;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;
    i { font-size: 15px; }
    &:hover:not(:disabled) { background: $color-primary-hover; }
    &:disabled { opacity: 0.6; cursor: progress; }
  }

  &__progress {
    width: 200px;
    height: 3px;
    background: $border-color-card;
    border-radius: 9999px;
    overflow: hidden;
    margin-top: 4px;

    &-bar {
      height: 100%;
      width: 40%;
      background: $color-primary;
      border-radius: 9999px;
      animation: scan-sweep 1.5s ease-in-out infinite;
    }
  }
}

@keyframes scan-pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.08); opacity: 0.8; }
}
@keyframes scan-sweep {
  0% { margin-left: -40%; }
  100% { margin-left: 100%; }
}

/* ===== 步骤二：选择设备 ===== */
.select-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  &__info {
    font-size: 13px;
    color: $text-secondary;
    strong { color: $color-primary; font-weight: 600; }
  }

  &__access {
    font-size: 12px;
    color: $text-muted;
    .text-success { color: #52c41a; font-weight: 600; }
    .text-muted { color: $text-muted; font-weight: 600; }
  }
}

/* 重新扫描转圈覆盖 */
.select-rescanning {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 60px 20px;
  color: $color-primary;

  i { font-size: 32px; }
  span { font-size: 13px; color: $text-secondary; }
}

.select-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  max-height: 360px;
  overflow-y: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
}

.sc-card {
  border: 2px solid $border-color-card;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.15s;
  background: #fff;

  &:hover { border-color: rgba(110, 75, 255, 0.4); }

  &.is-selected {
    border-color: $color-primary;
    background: $color-primary-bg;
  }

  /* 已接入的设备 — 置灰不可选 */
  &.is-disabled {
    cursor: not-allowed;
    opacity: 0.65;

    &:hover { border-color: $border-color-card; }
  }

  &__thumb {
    position: relative;
    aspect-ratio: 16 / 10;
    background: #1a1a2e;
    overflow: hidden;

    img { width: 100%; height: 100%; object-fit: cover; }
  }

  /* 未接入 — 占位提示 */
  &__no-preview {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background: #16162a;
    color: rgba(255, 255, 255, 0.35);

    i { font-size: 28px; }
    span { font-size: 11px; }
  }

  /* 接入状态角标 */
  &__access {
    position: absolute;
    top: 6px;
    left: 6px;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 500;
    line-height: 1.4;
    backdrop-filter: blur(4px);

    &.accessed {
      background: rgba(82, 196, 26, 0.85);
      color: #fff;
    }

    &.not-accessed {
      background: rgba(250, 173, 20, 0.85);
      color: #fff;
    }
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
    transition: all 0.15s;

    i { font-size: 12px; color: #fff; opacity: 0; }

    &.checked {
      background: $color-primary;
      border-color: $color-primary;

      i { opacity: 1; }
    }
  }

  &__body {
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-size: 12px;
    font-weight: 500;
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__ip {
    font-size: 11px;
    color: $text-muted;
    font-family: 'Courier New', monospace;
  }

  &__brand {
    font-size: 10px;
    color: $text-muted;
  }
}

.select-empty {
  text-align: center;
  padding: 60px 0;
  color: $text-muted;
  font-size: 13px;
}

/* 选择步底部操作 */
.select-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid $border-color-card;
}

/* ===== 步骤三：输入账号密码 ===== */
.add-step--auth {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.auth-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: $color-primary-bg;
  border-radius: 10px;

  &__icon {
    font-size: 22px;
    color: $color-primary;
    flex-shrink: 0;
    margin-top: 1px;
  }

  &__title {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
  }

  &__desc {
    margin: 0;
    font-size: 12px;
    color: $text-tertiary;
    line-height: 1.6;

    strong { color: $color-primary; }
    code {
      font-family: 'Courier New', monospace;
      background: rgba(110, 75, 255, 0.1);
      padding: 1px 4px;
      border-radius: 3px;
      font-size: 11px;
      color: $color-primary;
    }
  }
}

.auth-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255, 77, 79, 0.08);
  border: 1px solid rgba(255, 77, 79, 0.3);
  border-radius: 8px;
  color: #ff4d4f;
  font-size: 13px;
  animation: auth-shake 0.3s ease;
  i { font-size: 16px; flex-shrink: 0; }
}

@keyframes auth-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.auth-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &__label {
    font-size: 13px;
    font-weight: 500;
    color: $text-base;
  }

  &__input { width: 100%; }
}

.auth-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

/* ===== 步骤四：绑定结果 ===== */
.result-summary {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;

  &__item {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 14px 16px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;

    i { font-size: 20px; }

    &--ok {
      background: rgba(43, 179, 163, 0.08);
      color: $color-online;
    }

    &--fail {
      background: rgba(255, 77, 79, 0.08);
      color: #ff4d4f;
    }
  }
}

.result-error {
  border: 1px solid rgba(255, 77, 79, 0.2);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 16px;

  &__head {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 14px;
    background: rgba(255, 77, 79, 0.06);
    font-size: 13px;
    font-weight: 500;
    color: #ff4d4f;

    i { font-size: 15px; }
  }

  &__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-top: 1px solid $border-color-card;
    font-size: 13px;
    color: $text-secondary;
  }

  &__info {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  &__name { color: $text-base; font-weight: 500; }
  &__ip { color: $text-muted; font-family: 'Courier New', monospace; font-size: 12px; }

  &__retry {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 12px;
    border: 1px solid $color-primary;
    border-radius: 6px;
    background: $color-primary;
    color: #fff;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;

    i { font-size: 12px; }
    &:hover { background: $color-primary-hover; border-color: $color-primary-hover; }
  }
}

/* ===== 单设备重试弹窗 ===== */
.retry-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px 24px;

  &__device {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: $bg-page;
    border-radius: 10px;
  }

  &__thumb-wrap {
    width: 128px;
    height: 80px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    background: #16162a;
  }

  &__thumb {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__thumb-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    color: rgba(255, 255, 255, 0.35);

    i { font-size: 24px; }
    span { font-size: 11px; }
  }

  &__device-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__device-name {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
  }

  &__device-ip {
    font-size: 12px;
    color: $text-muted;
    font-family: 'Courier New', monospace;
  }

  &__device-brand {
    font-size: 11px;
    color: $text-muted;
  }
}

.retry-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255, 77, 79, 0.08);
  border: 1px solid rgba(255, 77, 79, 0.3);
  border-radius: 8px;
  color: #ff4d4f;
  font-size: 13px;
  animation: auth-shake 0.3s ease;
  i { font-size: 16px; flex-shrink: 0; }
}

.retry-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.retry-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.result-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

/* ===== 响应式 ===== */
@media (max-width: 1400px) {
  .gc-grid { grid-template-columns: repeat(5, 1fr); }
}
@media (max-width: 1200px) {
  .gc-grid { grid-template-columns: repeat(4, 1fr); }
  .select-grid { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 900px) {
  .gc-grid { grid-template-columns: repeat(3, 1fr); }
  .select-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
