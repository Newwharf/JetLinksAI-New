<script setup lang="ts">
/**
 * 设备详情穿透页
 * Hero(返回+远程调试) + 健康评分色 + 完整区域路径 + 5 个 tab
 */
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { message } from 'ant-design-vue'
import ECharts from '@/components/ECharts.vue'
import {
  devices, statusConfig, healthScoreColor,
  overviewKpis, messageTrendHours, messageTrendUp, messageTrendDown,
  deviceProperties, deviceEvents
} from './mock'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const deviceId = computed(() => String(route.params.id || ''))
const device = computed(() => devices.value.find(d => d.id === deviceId.value) || devices.value[0])

const activeTab = ref<'overview' | 'access' | 'command' | 'data' | 'log'>('overview')

// 引导联动：进入详情页后停留在概览页，引导气泡指向「设备接入」tab 等待用户点击
onMounted(() => {
  if (appStore.guideStep === 'iot-access') {
    activeTab.value = 'overview'
  }
})

// 点击「设备接入」tab 时推进引导
function switchTab(tab: 'overview' | 'access' | 'command' | 'data' | 'log') {
  activeTab.value = tab
  if (tab === 'access' && appStore.guideStep === 'iot-access') {
    setTimeout(() => appStore.setGuideStep('iot-access-config'), 500)
  }
}

// ===== 启用/禁用设备 =====
const isDisabled = computed(() => device.value.status === 'disabled')

function toggleDeviceStatus() {
  if (device.value.status === 'disabled') {
    device.value.status = 'offline'
    message.success(`设备「${device.value.name}」已启用`)
  } else {
    device.value.status = 'disabled'
    message.success(`设备「${device.value.name}」已禁用`)
  }
}

// ===== 设备接入 Tab =====
const accessConfig = {
  ip: 'iot.tcp.jetlinks.io',
  port: 8207,
  clientId: device.value?.sn || 'unknown-device-id',
  token: 'Tk' + (device.value?.sn?.slice(-12) || '000000000000') + 'JL'
}

// 接入步骤：init → waiting → done（自动检测复制完成）
const copiedFlags = reactive({ address: false, params: false })
const accessStep = computed<'init' | 'waiting' | 'done'>(() => {
  if (copiedFlags.address && copiedFlags.params) return 'done'
  if (copiedFlags.address || copiedFlags.params) return 'waiting'
  return 'init'
})

// 引导期间是否已通过复制触发完成（任意一个复制即可）
const guideCopyDone = ref(false)

// 监听步骤变化，done 时自动更新设备状态
watch(accessStep, (step) => {
  if (step === 'done') {
    finishAccess()
  }
})

/** 接入完成：更新设备状态 + 提示 + 推进引导 */
function finishAccess() {
  device.value.status = 'online'
  device.value.lastReport = '刚刚'
  device.value.healthScore = 100
  message.success('设备接入成功！')
  if (appStore.guideActive) {
    setTimeout(() => appStore.setGuideStep('iot-done'), 600)
  }
}

// 复制到剪贴板
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
}

function copyAddress() {
  copyToClipboard(`${accessConfig.ip}:${accessConfig.port}`)
  copiedFlags.address = true
  message.success('接入地址已复制，请配置到设备中')
  // 引导联动：在 iot-access-config 步骤，任意复制即完成
  if (appStore.guideStep === 'iot-access-config' && !guideCopyDone.value) {
    guideCopyDone.value = true
    setTimeout(finishAccess, 300)
  }
}

function copyParams() {
  copyToClipboard(`身份标识: ${accessConfig.clientId}\nToken: ${accessConfig.token}`)
  copiedFlags.params = true
  message.success('连接参数已复制，请配置到设备中')
  // 引导联动：在 iot-access-config 步骤，任意复制即完成
  if (appStore.guideStep === 'iot-access-config' && !guideCopyDone.value) {
    guideCopyDone.value = true
    setTimeout(finishAccess, 300)
  }
}

function goBack() { router.push('/iot/device') }

// 完整区域路径
const areaToPath: Record<string, string> = {
  '研发部办公区': '智谷园区 / E栋 / 4F / 研发部办公区',
  '项目部办公区': '智谷园区 / E栋 / 4F / 项目部办公区',
  '会议室': '智谷园区 / E栋 / 4F / 会议室',
  '大厅': '智谷园区 / E栋 / 2F / 大厅',
  '走廊': '智谷园区 / E栋 / 2F / 走廊',
  '运营办公室': '智谷园区 / A栋 / 1F / 运营办公室',
  '前台': '智谷园区 / A栋 / 1F / 前台',
  '仓库': '智谷园区 / A栋 / B1 / 仓库',
  '水泵房': '智谷园区 / A栋 / B1 / 水泵房',
  '前门': '智谷园区 / 室外区域 / 大门',
  '厂界': '智谷园区 / 室外区域 / 厂界',
  '厨房': '智谷园区 / 厨房',
  '配电室': '智谷园区 / 配电室',
  '地下室': '智谷园区 / 地下室',
  '研发楼': '智谷园区 / 研发楼'
}
const fullAreaPath = computed(() => areaToPath[device.value.area] || device.value.area)
const scoreColor = computed(() => healthScoreColor(device.value.healthScore))

// 消息趋势图配置
const messageTrendOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['上行', '下行'], right: 0, top: 0, textStyle: { fontSize: 12 } },
  grid: { left: 40, right: 10, top: 36, bottom: 28 },
  xAxis: { type: 'category', data: messageTrendHours, axisLabel: { fontSize: 11, color: '#999' }, axisLine: { lineStyle: { color: '#eee' } } },
  yAxis: { type: 'value', axisLabel: { fontSize: 11, color: '#999' }, splitLine: { lineStyle: { color: '#f4f5f7' } } },
  series: [
    { name: '上行', type: 'line', smooth: true, data: messageTrendUp, itemStyle: { color: '#2bb3a3' }, areaStyle: { color: 'rgba(43,179,163,0.08)' } },
    { name: '下行', type: 'line', smooth: true, data: messageTrendDown, itemStyle: { color: '#faad14' }, areaStyle: { color: 'rgba(250,173,20,0.08)' } }
  ]
}))

// 事件等级配色（5 级）
const eventLevelColor: Record<string, string> = {
  '超紧急': '#ff4d4f', '紧急': '#ff7a45', '严重': '#faad14', '一般': '#597ef7', '提醒': '#2bb3a3'
}
</script>

<template>
  <div class="dd-page">
    <!-- Hero -->
    <div class="dd-hero">
      <div class="dd-hero__main">
        <div class="dd-hero__icon" :style="{ background: scoreColor + '15', color: scoreColor }">
          <i v-if="!device.icon.startsWith('data:')" :class="device.icon" />
          <img v-else :src="device.icon" alt="icon" />
        </div>
        <div class="dd-hero__info">
          <div class="dd-hero__title-row">
            <h2>{{ device.name }}</h2>
            <span class="dd-hero__status" :class="statusConfig[device.status].class">
              <i class="dd-hero__status-dot" />{{ statusConfig[device.status].label }}
            </span>
            <span class="dd-hero__tag">SN: {{ device.sn }}</span>
            <span class="dd-hero__score" :style="{ color: scoreColor, background: scoreColor + '15' }">
              <i class="i-ant-design-heart-outlined" />{{ device.healthScore }}
            </span>
          </div>
          <div class="dd-hero__meta">
            <span><i class="i-ant-design-appstore-outlined" />{{ device.product }}</span>
            <span><i class="i-ant-design-environment-outlined" />{{ fullAreaPath }}</span>
            <span><i class="i-ant-design-tag-outlined" />{{ device.business }}</span>
            <span><i class="i-ant-design-clock-circle-outlined" />{{ device.lastReport }}</span>
          </div>
        </div>
      </div>
      <div class="dd-hero__actions">
        <button class="dd-back-btn" type="button" @click="goBack">
          <i class="i-ant-design-arrow-left-outlined" /><span>返回</span>
        </button>
        <button
          class="dd-toggle-btn"
          :class="{ 'dd-toggle-btn--disabled': isDisabled }"
          type="button"
          @click="toggleDeviceStatus"
        >
          <i :class="isDisabled ? 'i-ant-design-play-circle-outlined' : 'i-ant-design-pause-circle-outlined'" />
          <span>{{ isDisabled ? '启用' : '禁用' }}</span>
        </button>
        <button class="dd-debug-btn" type="button">
          <i class="i-ant-design-code-outlined" /><span>远程调试</span>
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="dd-tabs">
      <button :class="{ active: activeTab === 'overview' }" @click="switchTab('overview')">概览</button>
      <button :class="{ active: activeTab === 'access' }" data-guide="iot-access-tab" @click="switchTab('access')">设备接入</button>
      <button :class="{ active: activeTab === 'command' }" @click="switchTab('command')">设备指令</button>
      <button :class="{ active: activeTab === 'data' }" @click="switchTab('data')">设备数据</button>
      <button :class="{ active: activeTab === 'log' }" @click="switchTab('log')">设备日志</button>
    </div>

    <!-- 内容 -->
    <div class="dd-content">
      <!-- ===== 概览 ===== -->
      <div v-if="activeTab === 'overview'" class="ov-page">
        <!-- 顶部 KPI -->
        <div class="ov-kpis">
          <article v-for="kpi in overviewKpis" :key="kpi.key" class="ov-kpi">
            <span class="ov-kpi__icon" :style="{ background: kpi.color }">
              <i :class="kpi.icon" />
            </span>
            <div class="ov-kpi__body">
              <strong class="ov-kpi__value">{{ kpi.value }}<small class="ov-kpi__unit">{{ kpi.unit }}</small></strong>
              <span class="ov-kpi__label">{{ kpi.label }}</span>
              <small class="ov-kpi__desc">{{ kpi.desc }}</small>
            </div>
          </article>
        </div>

        <!-- 消息趋势图 -->
        <div class="ov-chart-card">
          <div class="ov-chart-card__head">
            <strong>消息趋势 · 今日 24h</strong>
          </div>
          <ECharts :option="messageTrendOption" height="240px" />
        </div>

        <!-- 下方左右 -->
        <div class="ov-bottom">
          <!-- 关键属性 -->
          <div class="ov-section">
            <div class="ov-section__head">
              <i class="i-ant-design-dashboard-outlined" />
              <strong>关键属性</strong>
            </div>
            <div class="ov-prop-grid">
              <div v-for="p in deviceProperties" :key="p.id" class="ov-prop-card">
                <div class="ov-prop-card__head">
                  <span class="ov-prop-card__name">{{ p.name }}</span>
                  <span class="ov-prop-card__time">{{ p.lastReport }}</span>
                </div>
                <div class="ov-prop-card__value">{{ p.value }}<small>{{ p.unit }}</small></div>
                <div class="ov-prop-card__spark">
                  <svg viewBox="0 0 100 24" preserveAspectRatio="none">
                    <polyline
                      :points="p.sparkline.map((v, i) => `${(i / (p.sparkline.length - 1)) * 100},${24 - (v / Math.max(...p.sparkline)) * 20}`).join(' ')"
                      fill="none" stroke="#6e4bff" stroke-width="1.5"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <!-- 近期告警 -->
          <div class="ov-section">
            <div class="ov-section__head">
              <i class="i-ant-design-alert-outlined" />
              <strong>近期告警</strong>
            </div>
            <div class="ov-alarms">
              <div v-for="evt in deviceEvents" :key="evt.id" class="ov-alarm">
                <span class="ov-alarm__level" :style="{ background: eventLevelColor[evt.level] + '15', color: eventLevelColor[evt.level] }">{{ evt.level }}</span>
                <div class="ov-alarm__body">
                  <span class="ov-alarm__event">{{ evt.event }}</span>
                  <span class="ov-alarm__desc">{{ evt.prop }}: <strong>{{ evt.propValue }} {{ evt.propUnit }}</strong></span>
                </div>
                <span class="ov-alarm__time">{{ evt.time }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 设备接入 ===== -->
      <div v-else-if="activeTab === 'access'" class="ac-page">
        <!-- 步骤提示条 -->
        <div class="ac-banner" :class="accessStep === 'done' ? 'ac-banner--ok' : 'ac-banner--info'">
          <i :class="accessStep === 'done' ? 'i-ant-design-check-circle-filled' : accessStep === 'waiting' ? 'i-ant-design-loading-outlined ac-spin' : 'i-ant-design-info-circle-filled'" />
          <span v-if="accessStep === 'init'">
            请按照以下步骤完成设备接入：① 复制接入地址配置到设备中 ② 复制设备连接参数完成配置
          </span>
          <span v-else-if="accessStep === 'waiting'">
            正在等待设备上线...（{{ copiedFlags.address ? '✓' : '①' }} 接入地址 {{ copiedFlags.params ? '✓' : '②' }} 连接参数）
          </span>
          <span v-else-if="accessStep === 'done'">设备已成功接入平台！状态实时同步中。</span>
        </div>

        <div class="ac-grid" data-guide="iot-access-config">
          <!-- 左列：接入方式 + 接入地址 -->
          <div class="ac-col">
            <!-- 接入方式 -->
            <div class="ac-card">
              <div class="ac-card__head"><i class="i-ant-design-api-outlined" /><strong>接入方式</strong></div>
              <div class="ac-card__body">
                <div class="ac-method">
                  <div class="ac-method__head">
                    <span class="ac-method__name">TCP 官方协议透传网关</span>
                    <span class="ac-method__tag">TCP</span>
                  </div>
                  <p class="ac-method__desc">当前设备使用标准接入方式接入平台。</p>
                </div>
              </div>
            </div>

            <!-- 接入地址 -->
            <div class="ac-card" :class="{ 'is-done': copiedFlags.address }">
              <div class="ac-card__head">
                <i class="i-ant-design-global-outlined" /><strong>接入地址</strong>
                <span v-if="copiedFlags.address" class="ac-step-done"><i class="i-ant-design-check-circle-filled" />已复制</span>
                <button v-else class="ac-copy-all-btn" type="button" @click="copyAddress">
                  <i class="i-ant-design-copy-outlined" /><span>复制地址</span>
                </button>
              </div>
              <div class="ac-card__body">
                <div class="ac-info-row">
                  <span class="ac-info-row__label">IP 地址</span>
                  <span class="ac-info-row__value ac-info-row__value--mono">{{ accessConfig.ip }}</span>
                </div>
                <div class="ac-info-row">
                  <span class="ac-info-row__label">端口</span>
                  <span class="ac-info-row__value ac-info-row__value--mono">{{ accessConfig.port }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 右列：设备连接参数 -->
          <div class="ac-col">
            <div class="ac-card ac-card--tall" :class="{ 'is-done': copiedFlags.params }">
              <div class="ac-card__head">
                <i class="i-ant-design-key-outlined" /><strong>设备连接参数</strong>
                <span v-if="copiedFlags.params" class="ac-step-done"><i class="i-ant-design-check-circle-filled" />已复制</span>
                <button v-else class="ac-copy-all-btn" type="button" @click="copyParams">
                  <i class="i-ant-design-copy-outlined" /><span>复制参数</span>
                </button>
              </div>
              <div class="ac-card__body">
                <p class="ac-card__hint">将以下参数配置到真实设备中，设备连接后自动完成接入。</p>
                <div class="ac-credential">
                  <div class="ac-credential__label">身份标识</div>
                  <div class="ac-credential__row">
                    <code class="ac-credential__value ac-credential__value--highlight">{{ accessConfig.clientId }}</code>
                  </div>
                </div>
                <div class="ac-credential">
                  <div class="ac-credential__label">Token</div>
                  <div class="ac-credential__row">
                    <code class="ac-credential__value">{{ accessConfig.token }}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 其他 tab 占位 -->
      <div v-else class="dd-placeholder">
        <i class="i-ant-design-info-circle-outlined dd-placeholder__icon" />
        <p>{{ activeTab }} 页面内容开发中</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.dd-page {
  height: 100%; padding: 8px; display: flex; flex-direction: column; gap: 8px; overflow: hidden;
}

/* Hero */
.dd-hero {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
  background: #fff; border-radius: 14px; padding: 16px 20px; flex-shrink: 0;
}
.dd-hero__main { display: flex; align-items: flex-start; gap: 14px; flex: 1; min-width: 0; }
.dd-hero__icon { width: 48px; height: 48px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; overflow: hidden; img { width: 100%; height: 100%; object-fit: cover; } }
.dd-hero__title-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;
  h2 { margin: 0; font-size: 18px; font-weight: 600; color: $text-base; }
}
.dd-hero__status { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 2px 8px; border-radius: 4px;
  &-dot { width: 6px; height: 6px; border-radius: 50%; }
}
.dd-hero__status.st-online { background: rgba(43,179,163,0.1); color: $color-online; .dd-hero__status-dot { background: $color-online; } }
.dd-hero__status.st-alert { background: rgba(255,77,79,0.1); color: #ff4d4f; .dd-hero__status-dot { background: #ff4d4f; } }
.dd-hero__status.st-offline { background: rgba(154,161,171,0.12); color: $text-tertiary; .dd-hero__status-dot { background: #bfbfbf; } }
.dd-hero__status.st-silent { background: rgba(250,173,20,0.12); color: #d48806; .dd-hero__status-dot { background: #faad14; } }
.dd-hero__status.st-disabled { background: rgba(0,0,0,0.06); color: $text-muted; .dd-hero__status-dot { background: #bfbfbf; } }
.dd-hero__tag { font-size: 11px; color: $text-muted; font-family: 'Courier New', monospace; background: $bg-page; padding: 2px 8px; border-radius: 4px; }
.dd-hero__score { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
.dd-hero__meta { display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; color: $text-secondary;
  span { display: flex; align-items: center; gap: 4px; } i { font-size: 13px; color: $text-muted; flex-shrink: 0; }
}
.dd-hero__actions { display: flex; gap: 6px; flex-shrink: 0; }
.dd-back-btn {
  display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 14px;
  border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary;
  font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s;
  &:hover { border-color: $color-primary; color: $color-primary; } i { font-size: 14px; }
}
.dd-toggle-btn {
  display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 14px;
  border: 1px solid $color-online; border-radius: 6px; background: $color-online; color: #fff;
  font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s;
  &:hover { opacity: 0.9; } i { font-size: 14px; }
  &--disabled { border-color: $color-primary; background: $color-primary; &:hover { background: $color-primary-hover; } }
}
.dd-debug-btn {
  display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 14px;
  border: 1px solid $color-primary; border-radius: 6px; background: $color-primary; color: #fff;
  font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s;
  &:hover { background: $color-primary-hover; } i { font-size: 14px; }
}

/* Tabs */
.dd-tabs {
  display: flex; gap: 2px; flex-shrink: 0; border-bottom: 1px solid $border-color-card; background: #fff; border-radius: 12px 12px 0 0; padding: 0 8px;
  button {
    border: none; background: transparent; padding: 10px 16px; font-size: 14px; color: $text-secondary;
    cursor: pointer; border-bottom: 2px solid transparent; font-family: inherit; transition: all 0.15s;
    &.active { color: $color-primary; border-bottom-color: $color-primary; font-weight: 500; }
  }
}

/* 内容占位 */
.dd-content { flex: 1; display: flex; min-height: 0; }
.dd-placeholder {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px;
  background: #fff; border-radius: 0 0 12px 12px;
  &__icon { font-size: 40px; color: $color-primary; opacity: 0.4; }
  p { font-size: 14px; color: $text-muted; margin: 0; }
}

/* ===== 概览 ===== */
.ov-page {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;
  background: transparent; padding: 0;
  scrollbar-width: none; &::-webkit-scrollbar { display: none; }
}

/* KPI */
.ov-kpis {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; flex-shrink: 0;
}
.ov-kpi {
  background: #fff; border-radius: 12px; padding: 16px 18px;
  display: flex; align-items: center; gap: 14px;
  &__icon {
    width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center;
    color: #fff; flex-shrink: 0;
    i { font-size: 22px; }
  }
  &__body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  &__value { font-size: 24px; font-weight: 700; color: $text-base; line-height: 1.1; }
  &__unit { font-size: 13px; font-weight: 400; color: $text-muted; margin-left: 3px; }
  &__label { font-size: 13px; color: $text-secondary; }
  &__desc { font-size: 11px; color: $text-muted; }
}

/* 图表卡片 */
.ov-chart-card {
  background: #fff; border-radius: 12px; padding: 14px 16px; flex-shrink: 0;
  &__head { display: flex; align-items: center; margin-bottom: 4px;
    strong { font-size: 14px; font-weight: 600; color: $text-base; }
  }
}

/* 下方 */
.ov-bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; flex: 1; min-height: 0; }

.ov-section {
  background: #fff; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; min-height: 0;
  &__head {
    display: flex; align-items: center; gap: 6px; padding: 12px 16px; border-bottom: 1px solid $border-color-card; flex-shrink: 0;
    i { font-size: 15px; color: $color-primary; }
    strong { font-size: 14px; font-weight: 600; color: $text-base; }
  }
}

/* 属性卡片网格 */
.ov-prop-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px; padding: 10px;
  flex: 1; overflow-y: auto; scrollbar-width: none; &::-webkit-scrollbar { display: none; }
}
.ov-prop-card {
  border: 1px solid $border-color-card; border-radius: 10px; padding: 12px 14px;
  display: flex; flex-direction: column; gap: 6px; transition: border-color 0.15s;
  &:hover { border-color: rgba(110, 75, 255, 0.3); }
  &__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  &__name { font-size: 12px; color: $text-secondary; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__time { font-size: 10px; color: $text-muted; flex-shrink: 0; }
  &__value { font-size: 22px; font-weight: 700; color: $text-base; line-height: 1.1;
    small { font-size: 12px; font-weight: 400; color: $text-muted; margin-left: 2px; }
  }
  &__spark { height: 20px; svg { width: 100%; height: 100%; } }
}

/* 告警列表 */
.ov-alarms { flex: 1; overflow-y: auto; padding: 4px 0; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
.ov-alarm {
  display: flex; align-items: center; gap: 8px; padding: 10px 16px; border-bottom: 1px solid $border-color-card;
  &:last-child { border-bottom: none; }
  &__level { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 4px; flex-shrink: 0; white-space: nowrap; }
  &__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  &__event { font-size: 13px; font-weight: 500; color: $text-base; }
  &__desc { font-size: 12px; color: $text-muted; strong { color: $text-secondary; font-weight: 600; } }
  &__time { font-size: 11px; color: $text-muted; flex-shrink: 0; white-space: nowrap; }
}

/* ===== 设备接入 Tab ===== */
.ac-page {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px;
  scrollbar-width: none; &::-webkit-scrollbar { display: none; }
}

/* 提示条 */
.ac-banner {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-radius: 10px; font-size: 13px; flex-shrink: 0;
  i { font-size: 16px; flex-shrink: 0; }
  &--ok { background: rgba(43,179,163,0.08); color: $color-online; }
  &--info { background: $color-primary-bg; color: $color-primary; }
}

/* 左右两列 */
.ac-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; flex-shrink: 0; }
.ac-col { display: flex; flex-direction: column; gap: 12px; }

/* 卡片 */
.ac-card {
  background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid $border-color-card;
  &--tall { flex: 1; }
  &__head {
    display: flex; align-items: center; gap: 6px; padding: 12px 14px; border-bottom: 1px solid $border-color-card; flex-shrink: 0;
    i { font-size: 15px; color: $color-primary; }
    strong { font-size: 14px; font-weight: 600; color: $text-base; }
  }
  &__body { padding: 12px 14px; }
  &__hint { margin: 0 0 12px; font-size: 12px; color: $text-muted; line-height: 1.5; }
}

/* 接入方式 */
.ac-method {
  &__head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
  &__name { font-size: 14px; font-weight: 600; color: $text-base; }
  &__tag { font-size: 11px; font-weight: 600; color: $color-primary; background: $color-primary-bg; padding: 1px 8px; border-radius: 4px; }
  &__desc { margin: 0; font-size: 12px; color: $text-muted; }
}

/* 信息行 */
.ac-info-row {
  display: flex; align-items: center; gap: 8px; padding: 6px 0;
  &__label { font-size: 12px; color: $text-muted; width: 60px; flex-shrink: 0; }
  &__value { font-size: 13px; color: $text-base; flex: 1;
    &--mono { font-family: 'Courier New', monospace; }
  }
}

/* 整块复制按钮 */
.ac-copy-all-btn {
  display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 10px;
  border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary;
  font-size: 12px; cursor: pointer; font-family: inherit; transition: all 0.15s; margin-left: auto;
  &:hover { border-color: $color-primary; color: $color-primary; }
  i { font-size: 13px; }
}

/* 已复制状态 */
.ac-card.is-done { border-color: rgba(43,179,163,0.3); }
.ac-step-done {
  display: inline-flex; align-items: center; gap: 3px; margin-left: auto;
  font-size: 12px; color: $color-online; font-weight: 500;
  i { font-size: 14px; }
}

/* 连接参数 */
.ac-credential {
  margin-bottom: 12px;
  &:last-child { margin-bottom: 0; }
  &__label { font-size: 12px; color: $text-muted; margin-bottom: 4px; }
  &__row { display: flex; align-items: center; gap: 8px; }
  &__value {
    flex: 1; font-family: 'Courier New', monospace; font-size: 13px; color: $text-base;
    background: $bg-page; padding: 8px 10px; border-radius: 6px; word-break: break-all;
    &--highlight { background: $color-primary-bg; color: $color-primary; font-weight: 600; }
  }
}

/* 操作按钮 */
.ac-action { display: flex; justify-content: center; padding: 8px 0; flex-shrink: 0; }
.ac-action-btn {
  display: inline-flex; align-items: center; gap: 6px; height: 38px; padding: 0 24px;
  border-radius: 8px; font-size: 14px; cursor: pointer; font-family: inherit; transition: all 0.15s;
  i { font-size: 16px; }
  &--primary { border: 1px solid $color-primary; background: $color-primary; color: #fff; &:hover { background: $color-primary-hover; } }
  &--default { border: 1px solid $border-color-light; background: #fff; color: $text-secondary; &:hover { border-color: $color-primary; color: $color-primary; } }
}

/* 等待上线 */
.ac-waiting {
  display: flex; align-items: center; gap: 14px; padding: 20px; background: #fff; border-radius: 12px; border: 1px solid $border-color-card; flex-shrink: 0;
  &__icon { width: 48px; height: 48px; border-radius: 50%; background: $color-primary-bg; color: $color-primary; display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
  &__body { flex: 1; strong { display: block; font-size: 14px; font-weight: 600; color: $text-base; margin-bottom: 4px; } p { margin: 0; font-size: 12px; color: $text-muted; line-height: 1.5; } }
}

/* 接入成功 */
.ac-success {
  display: flex; align-items: center; gap: 14px; padding: 20px; background: rgba(43,179,163,0.06); border-radius: 12px; border: 1px solid rgba(43,179,163,0.2); flex-shrink: 0;
  &__icon { width: 48px; height: 48px; border-radius: 50%; background: rgba(43,179,163,0.1); color: $color-online; display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0; }
  &__body { strong { display: block; font-size: 16px; font-weight: 600; color: $color-online; margin-bottom: 4px; } p { margin: 0; font-size: 13px; color: $text-secondary; line-height: 1.5; } }
}

.ac-spin { animation: ac-spin 0.8s linear infinite; }
@keyframes ac-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>
