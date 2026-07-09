<script setup lang="ts">
/**
 * 监控设备管理
 * 顶部 4 个 KPI（网关/通道/区域/PTZ，各带在线离线明细）
 * 左侧网关列表 + 右侧该网关下通道卡片（含搜索）
 * 点击通道卡片 → 弹窗播放（复用监控墙弹窗结构：左直播 + 右告警/回放）
 */
import { message } from 'ant-design-vue'
import { gateways, channels, areaText, type GatewayDevice, type VideoChannel } from './device.mock'

// ===== KPI =====
const kpiCards = computed(() => {
  const gwOnline = gateways.filter(g => g.status === 'online').length
  const gwOffline = gateways.length - gwOnline

  const chOnline = channels.value.filter(c => c.status === 'online').length
  const chOffline = channels.value.length - chOnline

  const covered = new Set(channels.value.filter(c => c.areaPath.length > 0).map(c => areaText(c.areaPath))).size
  // 未覆盖：未绑定区域的通道数
  const uncoveredCount = channels.value.filter(c => c.areaPath.length === 0).length

  const ptzYes = channels.value.filter(c => c.ptz).length
  const ptzNo = channels.value.length - ptzYes

  return [
    {
      key: 'gateway',
      label: '边缘网关',
      value: gateways.length,
      unit: '个',
      icon: 'i-ant-design-cloud-server-outlined',
      color: '#6e4bff',
      detail: [
        { dot: 'online', text: `在线 ${gwOnline}` },
        { dot: 'offline', text: `离线 ${gwOffline}` }
      ]
    },
    {
      key: 'channel',
      label: '视频通道',
      value: channels.value.length,
      unit: '路',
      icon: 'i-ant-design-video-camera-outlined',
      color: '#2bb3a3',
      detail: [
        { dot: 'online', text: `在线 ${chOnline}` },
        { dot: 'offline', text: `离线 ${chOffline}` }
      ]
    },
    {
      key: 'area',
      label: '区域覆盖',
      value: covered,
      unit: '个',
      icon: 'i-ant-design-environment-outlined',
      color: '#faad14',
      detail: [
        { dot: 'online', text: `已覆盖 ${covered}` },
        { dot: 'offline', text: `未绑定 ${uncoveredCount}` }
      ]
    },
    {
      key: 'ptz',
      label: 'PTZ 可控',
      value: ptzYes,
      unit: '路',
      icon: 'i-ant-design-control-outlined',
      color: '#13c2c2',
      detail: [
        { dot: 'online', text: `可控 ${ptzYes}` },
        { dot: 'offline', text: `不可控 ${ptzNo}` }
      ]
    }
  ]
})

// ===== 当前选中的网关 =====
const activeGatewayId = ref<string>(gateways[0]?.id || '')
const activeGateway = computed<GatewayDevice | undefined>(() =>
  gateways.find(g => g.id === activeGatewayId.value)
)

// 通道搜索关键字
const searchKey = ref('')

// 当前网关下、命中搜索的通道
const gatewayChannels = computed(() => {
  const list = channels.value.filter(c => c.gatewayId === activeGatewayId.value)
  const kw = searchKey.value.trim().toLowerCase()
  if (!kw) return list
  return list.filter(c =>
    c.name.toLowerCase().includes(kw) ||
    areaText(c.areaPath).toLowerCase().includes(kw)
  )
})

// 选中网关
function selectGateway(id: string) {
  activeGatewayId.value = id
  searchKey.value = ''
}

// ===== 同步通道：占位交互（无未同步概念，仅给反馈）=====
const syncingId = ref<string | null>(null)
function syncChannels(gw: GatewayDevice, e: Event) {
  e.stopPropagation()
  if (syncingId.value) return
  syncingId.value = gw.id
  setTimeout(() => {
    syncingId.value = null
    message.success(`「${gw.name}」通道已同步`)
  }, 800)
}

// ===== 点击通道 → 弹窗播放（复用监控墙弹窗结构）=====
const playModalVisible = ref(false)
const playTarget = ref<VideoChannel | null>(null)
function playChannel(ch: VideoChannel) {
  playTarget.value = ch
  playTab.value = 'alarm'
  playModalVisible.value = true
}

// 弹窗宽度：屏幕宽度的 2/3（与监控墙 WallView 保持一致）
const viewportWidth = ref(window.innerWidth)
function onResize() {
  viewportWidth.value = window.innerWidth
}
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
const playModalWidth = computed(() => Math.floor(viewportWidth.value * 2 / 3))

// ===== 弹窗右侧：告警事件 / 录像回放 tab =====
const playTab = ref<'alarm' | 'replay'>('alarm')

interface PlayAlarmRow {
  id: string
  level: '紧急' | '警告' | '提示'
  title: string
  time: string
  status: '待处理' | '已处理'
}
const allPlayAlarms = computed<PlayAlarmRow[]>(() => {
  const name = playTarget.value?.name || ''
  if (name.includes('东门')) {
    return [
      { id: 'a1', level: '紧急', title: '人员闯入', time: '2026-07-07 09:12', status: '待处理' },
      { id: 'a2', level: '警告', title: '人员徘徊', time: '2026-07-07 08:40', status: '待处理' },
      { id: 'a3', level: '提示', title: '物品遗留', time: '2026-07-06 18:22', status: '已处理' },
      { id: 'a6', level: '紧急', title: '夜间未归', time: '2026-07-05 23:10', status: '已处理' },
      { id: 'a7', level: '警告', title: '人员聚集', time: '2026-07-05 14:30', status: '已处理' }
    ]
  }
  if (name.includes('南门')) {
    return [
      { id: 'a4', level: '警告', title: '车辆违停', time: '2026-07-07 10:05', status: '待处理' },
      { id: 'a5', level: '紧急', title: '烟火疑似', time: '2026-07-07 07:30', status: '已处理' },
      { id: 'a8', level: '提示', title: '物品遗留', time: '2026-07-06 11:20', status: '已处理' }
    ]
  }
  return []
})
const alarmSearchKey = ref('')
const alarmDateModel = ref<any>(null)
const alarmDate = computed<string | null>(() => {
  if (!alarmDateModel.value) return null
  return alarmDateModel.value.format('YYYY-MM-DD')
})
const playAlarms = computed<PlayAlarmRow[]>(() => {
  let list = allPlayAlarms.value
  const kw = alarmSearchKey.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(r => r.title.toLowerCase().includes(kw) || r.level.includes(kw) || r.status.includes(kw))
  }
  if (alarmDate.value) {
    list = list.filter(r => r.time.slice(0, 10) === alarmDate.value)
  }
  return list
})

interface ReplayClip {
  id: string
  time: string
  label: string
  thumb: string
  duration: string
}
const allReplayClips = computed<ReplayClip[]>(() => {
  const thumb = playTarget.value?.thumb || ''
  return [
    { id: 'r1', time: '2026-07-07 09:10-09:15', label: '人员闯入告警时段', thumb, duration: '5 分钟' },
    { id: 'r2', time: '2026-07-07 08:38-08:45', label: '人员徘徊告警时段', thumb, duration: '7 分钟' },
    { id: 'r3', time: '2026-07-07 06:00-06:10', label: '晨间例行画面', thumb, duration: '10 分钟' },
    { id: 'r4', time: '2026-07-06 18:20-18:25', label: '物品遗留告警时段', thumb, duration: '5 分钟' },
    { id: 'r5', time: '2026-07-06 14:00-14:15', label: '午后例行画面', thumb, duration: '15 分钟' }
  ]
})
const replayDateModel = ref<any>(null)
const replayDate = computed<string | null>(() => {
  if (!replayDateModel.value) return null
  return replayDateModel.value.format('YYYY-MM-DD')
})
const replayClips = computed<ReplayClip[]>(() => {
  if (!replayDate.value) return allReplayClips.value
  return allReplayClips.value.filter(c => c.time.slice(0, 10) === replayDate.value)
})
</script>

<template>
  <div class="device-page">
    <!-- 顶部 KPI -->
    <section class="kpi-grid">
      <article v-for="k in kpiCards" :key="k.key" class="kpi-card">
        <div class="kpi-card__head">
          <span class="kpi-icon" :style="{ background: k.color }">
            <i :class="k.icon" />
          </span>
          <div class="kpi-body">
            <strong class="kpi-value">
              {{ k.value }}<small class="kpi-unit">{{ k.unit }}</small>
            </strong>
            <small class="kpi-label">{{ k.label }}</small>
          </div>
        </div>
        <div class="kpi-detail">
          <span
            v-for="(d, i) in k.detail"
            :key="i"
            class="kpi-detail__item"
          >
            <i class="kpi-detail__dot" :class="d.dot" />
            {{ d.text }}
          </span>
        </div>
      </article>
    </section>

    <!-- 左右两栏 -->
    <section class="split">
      <!-- 左：网关列表 -->
      <aside class="gw-panel">
        <div class="panel-head">
          <strong>边缘网关</strong>
          <span class="panel-count">{{ gateways.length }} 个</span>
        </div>
        <div class="gw-list">
          <div
            v-for="gw in gateways"
            :key="gw.id"
            class="gw-item"
            :class="{ 'is-active': gw.id === activeGatewayId }"
            @click="selectGateway(gw.id)"
          >
            <!-- 第一行：图标 + 名称 + 状态文案 + 状态点 + 同步按钮 -->
            <div class="gw-item__top">
              <i
                class="gw-item__icon"
                :class="gw.status === 'online' ? 'is-online' : 'is-offline'"
              />
              <span class="gw-item__name" :title="gw.name">{{ gw.name }}</span>
              <span class="gw-item__status-text" :class="gw.status">
                {{ gw.status === 'online' ? '在线' : '离线' }}
              </span>
              <span class="gw-status-dot" :class="gw.status" />
              <button
                class="sync-btn"
                :disabled="syncingId === gw.id"
                title="同步该网关下所有通道"
                @click="syncChannels(gw, $event)"
              >
                <i :class="syncingId === gw.id ? 'i-ant-design-loading-outlined sync-spin' : 'i-ant-design-sync-outlined'" />
                <span>{{ syncingId === gw.id ? '同步中' : '同步通道' }}</span>
              </button>
            </div>
            <!-- 第二行：品牌型号 + IP -->
            <div class="gw-item__meta">
              <span class="gw-item__brand">{{ gw.brand }} · {{ gw.model }}</span>
              <span class="gw-item__ip">{{ gw.ip }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- 右：通道卡片 -->
      <div class="ch-panel">
        <div class="ch-panel-head">
          <div class="ch-panel-title">
            <strong>{{ activeGateway?.name }} · 通道列表</strong>
            <span class="panel-count">{{ gatewayChannels.length }} 路</span>
          </div>
          <a-input
            v-model:value="searchKey"
            class="ch-search"
            placeholder="搜索通道名称或区域"
            allow-clear
          >
            <template #prefix>
              <i class="i-ant-design-search-outlined" />
            </template>
          </a-input>
        </div>
        <div class="ch-grid">
          <article
            v-for="ch in gatewayChannels"
            :key="ch.id"
            class="ch-card"
            @click="playChannel(ch)"
          >
            <div class="ch-card__thumb">
              <img :src="ch.thumb" :alt="ch.name" draggable="false" />
              <div class="ch-card__overlay" />
              <div class="ch-card__top">
                <span class="ch-status" :class="ch.status">
                  <i class="ch-status__dot" />
                  {{ ch.status === 'online' ? '在线' : '离线' }}
                </span>
                <span v-if="ch.ptz" class="ch-ptz" title="支持 PTZ 云台控制">
                  <i class="i-ant-design-control-outlined" />
                  PTZ
                </span>
              </div>
              <div class="ch-card__play">
                <i class="i-ant-design-play-circle-outlined" />
              </div>
            </div>
            <div class="ch-card__body">
              <div class="ch-card__title" :title="ch.name">{{ ch.name }}</div>
              <div class="ch-card__row">
                <i class="i-ant-design-cloud-server-outlined ch-card__row-icon" />
                <span class="ch-card__gateway">{{ activeGateway?.name }}</span>
              </div>
              <div class="ch-card__row">
                <i class="i-ant-design-environment-outlined ch-card__row-icon" />
                <span
                  class="ch-card__area"
                  :class="{ 'is-empty': ch.areaPath.length === 0 }"
                  :title="ch.areaPath.length > 0 ? areaText(ch.areaPath) : '未绑定'"
                >
                  {{ ch.areaPath.length > 0 ? areaText(ch.areaPath) : '未绑定' }}
                </span>
              </div>
            </div>
          </article>

          <!-- 空状态 -->
          <div v-if="gatewayChannels.length === 0" class="ch-empty">
            <i class="i-ant-design-video-camera-outlined ch-empty__icon" />
            <p>{{ searchKey ? '没有找到匹配的通道' : '该网关暂无通道' }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 视频播放弹窗（复用监控墙弹窗结构：左直播 + 右告警/回放） -->
    <a-modal
      v-model:open="playModalVisible"
      :title="playTarget?.name || '视频播放'"
      :footer="null"
      :width="playModalWidth"
      :body-style="{ padding: '0' }"
      wrap-class-name="video-player-modal"
    >
      <div class="player-layout">
        <!-- 左：直播视频 -->
        <div class="player-live">
          <img v-if="playTarget?.thumb" :src="playTarget.thumb" class="player-frame" alt="视频流" />
          <div class="player-overlay">
            <div class="player-controls">
              <i class="i-ant-design-pause-circle-filled player-play-icon" />
              <div class="player-progress">
                <div class="player-progress-bar" />
              </div>
              <span class="player-time">实时</span>
            </div>
          </div>
          <div class="player-info">
            <span class="player-name">{{ playTarget?.name }}</span>
            <span class="player-status" :class="playTarget?.status">
              {{ playTarget?.status === 'online' ? '● LIVE' : '● 离线' }}
            </span>
          </div>
        </div>

        <!-- 右：告警事件 / 录像回放 -->
        <div class="player-side">
          <div class="side-tabs">
            <button
              class="side-tab"
              :class="{ active: playTab === 'alarm' }"
              @click="playTab = 'alarm'"
            >
              <i class="i-ant-design-alert-outlined" />
              <span>告警事件</span>
              <em v-if="allPlayAlarms.length" class="side-tab-badge">{{ allPlayAlarms.filter(a => a.status === '待处理').length }}</em>
            </button>
            <button
              class="side-tab"
              :class="{ active: playTab === 'replay' }"
              @click="playTab = 'replay'"
            >
              <i class="i-ant-design-history-outlined" />
              <span>录像回放</span>
            </button>
          </div>

          <!-- 告警事件 -->
          <div v-if="playTab === 'alarm'" class="side-body">
            <div class="side-search">
              <a-input
                v-model:value="alarmSearchKey"
                class="side-search__input"
                placeholder="搜索告警标题"
                allow-clear
              >
                <template #prefix>
                  <i class="i-ant-design-search-outlined" />
                </template>
              </a-input>
              <a-date-picker
                v-model:value="alarmDateModel"
                class="side-search__date"
                style="width: 100%"
                placeholder="选择日期"
              />
            </div>
            <div class="alarm-list">
              <div
                v-for="row in playAlarms"
                :key="row.id"
                class="alarm-row"
                :class="['lv-' + row.level, 'st-' + row.status]"
              >
                <div class="alarm-row__main">
                  <span class="alarm-title">{{ row.title }}</span>
                  <span class="alarm-time">
                    <i class="i-ant-design-clock-circle-outlined" />
                    {{ row.time }}
                  </span>
                </div>
                <div class="alarm-row__tags">
                  <span class="alarm-level">{{ row.level }}</span>
                  <span class="alarm-status">{{ row.status }}</span>
                </div>
              </div>
              <div v-if="playAlarms.length === 0" class="side-empty">
                <i class="i-ant-design-check-circle-outlined side-empty-icon" />
                <p>该通道暂无告警事件</p>
              </div>
            </div>
          </div>

          <!-- 录像回放 -->
          <div v-else class="side-body">
            <div class="side-search">
              <a-date-picker
                v-model:value="replayDateModel"
                class="side-search__date"
                style="width: 100%"
                placeholder="选择日期"
              />
            </div>
            <div class="replay-list">
              <div
                v-for="clip in replayClips"
                :key="clip.id"
                class="replay-clip"
              >
                <div class="replay-clip__thumb">
                  <img :src="clip.thumb" alt="截帧" draggable="false" />
                  <div class="replay-clip__play">
                    <i class="i-ant-design-caret-right-filled" />
                  </div>
                  <span class="replay-clip__dur">{{ clip.duration }}</span>
                </div>
                <div class="replay-clip__info">
                  <strong class="replay-clip__time">{{ clip.time }}</strong>
                  <span class="replay-clip__label">{{ clip.label }}</span>
                </div>
              </div>
              <div v-if="replayClips.length === 0" class="side-empty">
                <i class="i-ant-design-video-camera-outlined side-empty-icon" />
                <p>所选时段暂无录像</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.device-page {
  height: 100%;
  background: transparent;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  color: $text-base;
}

/* ===== KPI ===== */
.kpi-grid {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.kpi-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kpi-card__head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;

  i { font-size: 24px; }
}

.kpi-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.kpi-value {
  font-size: 26px;
  font-weight: 650;
  color: $text-base;
  line-height: 1.1;
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.kpi-unit {
  font-size: 13px;
  font-weight: 400;
  color: $text-muted;
}

.kpi-label {
  font-size: 13px;
  color: $text-secondary;
}

.kpi-detail {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 10px;
  border-top: 1px solid $border-color-card;

  &__item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: $text-secondary;
  }

  &__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;

    &.online { background: $color-online; }
    &.offline { background: #bfbfbf; }
  }
}

/* ===== 左右两栏 ===== */
.split {
  flex: 1;
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 8px;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  strong {
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
  }

  .panel-count {
    font-size: 12px;
    color: $text-muted;
  }
}

/* ===== 左：网关列表 ===== */
.gw-panel {
  background: #fff;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gw-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gw-item {
  border: 1px solid $border-color-card;
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.18s;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &:hover {
    border-color: rgba(110, 75, 255, 0.4);
    background: #faf9ff;
  }

  &.is-active {
    border-color: $color-primary;
    background: $color-primary-bg;
  }

  &__top {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  &__icon {
    font-size: 18px;
    flex-shrink: 0;

    &.is-online { color: $color-online; }
    &.is-offline { color: #bfbfbf; }
  }

  &__name {
    flex: 1;
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  &__status-text {
    font-size: 12px;
    flex-shrink: 0;

    &.online { color: $color-online; }
    &.offline { color: #bfbfbf; }
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-left: 24px;
  }

  &__brand {
    font-size: 12px;
    color: $text-secondary;
  }

  &__ip {
    font-size: 11px;
    color: $text-muted;
    font-family: 'Courier New', monospace;
  }
}

.gw-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &.online { background: $color-online; }
  &.offline { background: #bfbfbf; }
}

/* 同步通道按钮 */
.sync-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border: 1px solid $color-primary;
  border-radius: 6px;
  background: $color-primary;
  color: #fff;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.18s;
  flex-shrink: 0;
  margin-left: 4px;

  i { font-size: 12px; }

  &:hover:not(:disabled) {
    background: $color-primary-hover;
    border-color: $color-primary-hover;
  }

  &:disabled {
    opacity: 0.7;
    cursor: progress;
  }
}

.sync-spin {
  animation: sync-spin 1s linear infinite;
}
@keyframes sync-spin {
  to { transform: rotate(360deg); }
}

/* ===== 右：通道面板 ===== */
.ch-panel {
  background: #fff;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.ch-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.ch-panel-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;

  strong {
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .panel-count {
    font-size: 12px;
    color: $text-muted;
    flex-shrink: 0;
  }
}

.ch-search {
  width: 260px;
  flex-shrink: 0;
}

.ch-grid {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
  align-content: start;
}

.ch-card {
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;

  &:hover {
    border-color: $color-primary;
    box-shadow: $shadow-card-active;

    .ch-card__thumb img {
      transform: scale(1.04);
    }

    .ch-card__play {
      opacity: 1;
    }
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
      transition: transform 0.3s;
    }
  }

  &__overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, transparent 30%);
    pointer-events: none;
  }

  &__top {
    position: absolute;
    top: 8px;
    left: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 2;
  }

  &__play {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    z-index: 2;

    i {
      font-size: 26px;
      color: #fff;
    }
  }

  &__body {
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: $text-secondary;
    min-width: 0;
  }

  &__row-icon {
    font-size: 13px;
    color: $text-muted;
    flex-shrink: 0;
  }

  &__gateway,
  &__area {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__area.is-empty {
    color: $text-muted;
    font-style: italic;
  }
}

/* 状态标签 */
.ch-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 3px;
  color: #fff;

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fff;
  }

  &.online { background: rgba(43, 179, 163, 0.85); }
  &.offline { background: rgba(0, 0, 0, 0.55); }
}

/* PTZ 标签 */
.ch-ptz {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 3px;
  color: #fff;
  background: rgba(19, 194, 194, 0.85);

  i { font-size: 11px; }
}

/* 空状态 */
.ch-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 10px;
  color: $text-muted;

  &__icon {
    font-size: 44px;
    opacity: 0.3;
  }

  p {
    font-size: 13px;
    margin: 0;
  }
}

/* ===== 视频播放弹窗（与监控墙 WallView 一致） ===== */
.player-layout {
  display: flex;
  height: 600px;
  background: #000;
}

.player-live {
  position: relative;
  flex: 2;
  min-width: 0;
  background: #000;
  overflow: hidden;

  .player-frame {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .player-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.35) 0%, transparent 30%, transparent 70%, rgba(0, 0, 0, 0.6) 100%);

    .player-controls {
      position: absolute;
      bottom: 12px;
      left: 16px;
      right: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      pointer-events: auto;

      .player-play-icon {
        font-size: 28px;
        color: #fff;
        cursor: pointer;
      }

      .player-progress {
        flex: 1;
        height: 3px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        overflow: hidden;

        .player-progress-bar {
          height: 100%;
          width: 60%;
          background: $color-primary;
          border-radius: 2px;
        }
      }

      .player-time {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.85);
      }
    }
  }

  .player-info {
    position: absolute;
    top: 12px;
    left: 16px;
    display: flex;
    align-items: center;
    gap: 10px;

    .player-name {
      font-size: 14px;
      font-weight: 500;
      color: #fff;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    }

    .player-status {
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 3px;

      &.online {
        color: #95de64;
        background: rgba(43, 179, 163, 0.2);
      }

      &.offline {
        color: #d9d9d9;
        background: rgba(0, 0, 0, 0.3);
      }
    }
  }
}

.player-side {
  flex: 1;
  min-width: 0;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.side-tabs {
  display: flex;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  .side-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 44px;
    border: none;
    background: transparent;
    font-size: 14px;
    color: $text-secondary;
    cursor: pointer;
    font-family: inherit;
    position: relative;
    transition: color 0.2s;

    i { font-size: 15px; }

    &:hover { color: $color-primary; }

    &.active {
      color: $color-primary;
      font-weight: 500;

      &::after {
        content: '';
        position: absolute;
        left: 16px;
        right: 16px;
        bottom: 0;
        height: 2px;
        background: $color-primary;
        border-radius: 1px;
      }
    }

    .side-tab-badge {
      font-style: normal;
      font-size: 11px;
      min-width: 18px;
      height: 18px;
      line-height: 18px;
      text-align: center;
      padding: 0 5px;
      border-radius: 9px;
      background: #ff4d4f;
      color: #fff;
    }
  }
}

.side-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.side-search {
  display: flex;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
  flex-wrap: wrap;

  .side-search__input {
    flex: 1;
    min-width: 120px;
  }

  .side-search__date {
    flex: 1;
    min-width: 160px;
  }
}

.side-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 10px;
  color: $text-muted;

  .side-empty-icon {
    font-size: 40px;
    color: $color-online;
    opacity: 0.6;
  }

  p {
    font-size: 13px;
    margin: 0;
  }
}

.alarm-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alarm-row {
  border: 1px solid $border-color-card;
  border-radius: 8px;
  padding: 10px 12px;
  transition: box-shadow 0.15s;
  display: flex;
  align-items: center;
  gap: 12px;

  &:hover { box-shadow: $shadow-card-active; }

  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .alarm-title {
      font-size: 14px;
      font-weight: 500;
      color: $text-base;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .alarm-time {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: $text-muted;

      i { font-size: 12px; }
    }
  }

  &__tags {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .alarm-level,
  .alarm-status {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 3px;
  }
}

.alarm-row.lv-紧急 .alarm-level {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}
.alarm-row.lv-警告 .alarm-level {
  color: #d46b08;
  background: rgba(250, 173, 20, 0.12);
}
.alarm-row.lv-提示 .alarm-level {
  color: $color-online;
  background: $color-online-bg;
}
.alarm-row.st-待处理 .alarm-status {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}
.alarm-row.st-已处理 .alarm-status {
  color: $color-online;
  background: $color-online-bg;
}

.replay-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.replay-clip {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid $border-color-card;
  cursor: pointer;
  transition: background 0.15s;

  &:last-child { border-bottom: none; }

  &:hover {
    .replay-clip__thumb {
      border-color: $color-primary;

      .replay-clip__play {
        background: rgba(110, 75, 255, 0.85);
      }
    }
  }

  &__thumb {
    position: relative;
    width: 120px;
    height: 68px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    border: 1px solid $border-color-card;
    background: #000;
    transition: border-color 0.15s;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .replay-clip__play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;

      i {
        font-size: 14px;
        color: #fff;
      }
    }

    .replay-clip__dur {
      position: absolute;
      bottom: 4px;
      right: 4px;
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 2px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
    }
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;

    .replay-clip__time {
      font-size: 13px;
      font-weight: 500;
      color: $text-base;
    }

    .replay-clip__label {
      font-size: 12px;
      color: $text-muted;
    }
  }
}
</style>
