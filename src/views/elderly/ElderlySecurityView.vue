<script setup lang="ts">
/**
 * 院内安防
 * 左侧：院内平面图 + 告警点位
 * 右侧：待处理告警列表（老人行为告警 + 环境告警）
 */
import floorPlan from '@/assets/floorPlan.png'

// ===== 平面图缩放/拖拽 =====
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isPanning = ref(false)
const panStart = reactive({ x: 0, y: 0, tx: 0, ty: 0 })
function zoomIn() { scale.value = Math.min(3, +(scale.value + 0.15).toFixed(2)) }
function zoomOut() { scale.value = Math.max(0.4, +(scale.value - 0.15).toFixed(2)) }
function resetView() { scale.value = 1; translateX.value = 0; translateY.value = 0 }
function onWheel(e: WheelEvent) { e.preventDefault(); if (e.deltaY < 0) zoomIn(); else zoomOut() }
function onPanStart(e: MouseEvent) { isPanning.value = true; panStart.x = e.clientX; panStart.y = e.clientY; panStart.tx = translateX.value; panStart.ty = translateY.value }
function onPanMove(e: MouseEvent) { if (!isPanning.value) return; translateX.value = panStart.tx + (e.clientX - panStart.x); translateY.value = panStart.ty + (e.clientY - panStart.y) }
function onPanEnd() { isPanning.value = false }

// ===== 告警点位（平面图上的告警位置）=====
interface AlertPoint {
  id: string
  x: number
  y: number
  alertId: string  // 对应告警列表里的 id
}
const alertPoints: AlertPoint[] = [
  { id: 'p1', x: 28, y: 35, alertId: 'a1' },
  { id: 'p2', x: 62, y: 28, alertId: 'a2' },
  { id: 'p3', x: 45, y: 58, alertId: 'a3' },
  { id: 'p4', x: 75, y: 68, alertId: 'a4' },
  { id: 'p5', x: 20, y: 72, alertId: 'a5' }
]

// ===== 告警列表 =====
interface SecurityAlert {
  id: string
  type: 'behavior' | 'environment'  // 老人行为告警 / 环境告警
  level: 'urgent' | 'warning' | 'info'  // 紧急/警告/提示
  title: string
  location: string
  person?: string  // 涉及老人（行为告警有）
  time: string
  desc: string
  status: 'pending' | 'processing'
}

const alerts = ref<SecurityAlert[]>([
  { id: 'a1', type: 'behavior', level: 'urgent', title: '老人跌倒', location: '3号楼-2层-走廊', person: '张奶奶（82岁）', time: '2分钟前', desc: 'AI识别到老人在走廊跌倒，已躺地超过30秒', status: 'pending' },
  { id: 'a2', type: 'environment', level: 'warning', title: '地面杂物', location: '3号楼-2层-活动室门口', time: '8分钟前', desc: '检测到地面有杂物堆积，可能造成绊倒风险', status: 'pending' },
  { id: 'a3', type: 'behavior', level: 'urgent', title: '夜间未归寝', location: '5号楼-3层-302室', person: '李爷爷（78岁）', time: '15分钟前', desc: '老人23:00仍未返回寝室，最后一次出现在楼道', status: 'processing' },
  { id: 'a4', type: 'environment', level: 'urgent', title: '疑似烟火', location: '5号楼-1层-厨房', time: '20分钟前', desc: '检测到疑似烟雾，请立即现场确认', status: 'pending' },
  { id: 'a5', type: 'environment', level: 'warning', title: '地面湿滑', location: '3号楼-1层-卫生间', time: '32分钟前', desc: '卫生间地面有积水，存在滑倒风险', status: 'pending' },
  { id: 'a6', type: 'behavior', level: 'warning', title: '长时间徘徊', location: '5号楼-2层-楼道', person: '王奶奶（85岁）', time: '45分钟前', desc: '老人在同一区域徘徊超过30分钟，建议关注', status: 'processing' },
  { id: 'a7', type: 'environment', level: 'info', title: '垃圾堆积', location: '3号楼-1层-楼梯口', time: '1小时前', desc: '检测到垃圾未及时清理', status: 'pending' }
])

// 过滤
const activeType = ref<'all' | 'behavior' | 'environment'>('all')
const filteredAlerts = computed(() => {
  if (activeType.value === 'all') return alerts.value
  return alerts.value.filter(a => a.type === activeType.value)
})

// 统计
const stats = computed(() => ({
  total: alerts.value.length,
  urgent: alerts.value.filter(a => a.level === 'urgent').length,
  behavior: alerts.value.filter(a => a.type === 'behavior').length,
  environment: alerts.value.filter(a => a.type === 'environment').length,
  pending: alerts.value.filter(a => a.status === 'pending').length
}))

// 选中告警（高亮平面图上的点）
const selectedAlertId = ref<string>('')
function selectAlert(a: SecurityAlert) {
  selectedAlertId.value = selectedAlertId.value === a.id ? '' : a.id
}

// 处理告警
function handleAlert(a: SecurityAlert) {
  a.status = 'processing'
}

function resolveAlert(a: SecurityAlert) {
  alerts.value = alerts.value.filter(x => x.id !== a.id)
  if (selectedAlertId.value === a.id) selectedAlertId.value = ''
}

const levelText = { urgent: '紧急', warning: '警告', info: '提示' }
const typeText = { behavior: '老人行为', environment: '环境' }
</script>

<template>
  <div class="elderly-security">
    <!-- 顶部统计卡片 -->
    <div class="stat-cards">
      <div class="stat-card urgent">
        <div class="stat-icon-wrap"><i class="i-ant-design-alert-outlined" /></div>
        <div class="stat-info">
          <span class="stat-num">{{ stats.urgent }}</span>
          <span class="stat-label">紧急告警</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap purple"><i class="i-ant-design-user-outlined" /></div>
        <div class="stat-info">
          <span class="stat-num">{{ stats.behavior }}</span>
          <span class="stat-label">行为告警</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap orange"><i class="i-ant-design-environment-outlined" /></div>
        <div class="stat-info">
          <span class="stat-num">{{ stats.environment }}</span>
          <span class="stat-label">环境告警</span>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon-wrap gray"><i class="i-ant-design-clock-circle-outlined" /></div>
        <div class="stat-info">
          <span class="stat-num">{{ stats.pending }}</span>
          <span class="stat-label">待处理</span>
        </div>
      </div>
    </div>

    <!-- 主体：左平面图 + 右告警列表 -->
    <div class="security-body">
      <!-- 左侧：平面图 -->
      <div class="map-section">
        <div class="section-header">
          <span class="section-title">院内平面图</span>
          <div class="map-controls">
            <button class="ctrl-btn" @click="zoomOut"><i class="i-ant-design-minus-outlined" /></button>
            <span class="zoom-text">{{ Math.round(scale * 100) }}%</span>
            <button class="ctrl-btn" @click="zoomIn"><i class="i-ant-design-plus-outlined" /></button>
            <button class="ctrl-btn" @click="resetView"><i class="i-ant-design-aim-outlined" /></button>
          </div>
        </div>
        <div
          class="map-canvas"
          @wheel="onWheel"
          @mousedown="onPanStart"
          @mousemove="onPanMove"
          @mouseup="onPanEnd"
          @mouseleave="onPanEnd"
        >
          <div class="map-transform" :style="{ transform: `translate(${translateX}px, ${translateY}px) scale(${scale})` }">
            <img :src="floorPlan" class="map-img" draggable="false" alt="院内平面图" />
            <!-- 告警点位 -->
            <div
              v-for="p in alertPoints"
              :key="p.id"
              class="alert-point"
              :class="[
                alerts.find(a => a.id === p.alertId)?.level,
                { selected: selectedAlertId === p.alertId }
              ]"
              :style="{ left: p.x + '%', top: p.y + '%' }"
              @click.stop="selectAlert(alerts.find(a => a.id === p.alertId)!)"
            >
              <span class="alert-pulse" />
              <i class="i-ant-design-environment-outlined" />
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：告警列表 -->
      <div class="alert-section">
        <div class="section-header">
          <span class="section-title">待处理告警（{{ filteredAlerts.length }}）</span>
          <div class="type-filter">
            <button class="filter-btn" :class="{ active: activeType === 'all' }" @click="activeType = 'all'">全部</button>
            <button class="filter-btn" :class="{ active: activeType === 'behavior' }" @click="activeType = 'behavior'">行为告警</button>
            <button class="filter-btn" :class="{ active: activeType === 'environment' }" @click="activeType = 'environment'">环境告警</button>
          </div>
        </div>
        <div class="alert-list scroll-thin">
          <div
            v-for="a in filteredAlerts"
            :key="a.id"
            class="alert-card"
            :class="[a.level, a.type, { selected: selectedAlertId === a.id, processing: a.status === 'processing' }]"
            @click="selectAlert(a)"
          >
            <div class="alert-card-header">
              <span class="alert-level-tag" :class="a.level">{{ levelText[a.level] }}</span>
              <span class="alert-type-tag" :class="a.type">{{ typeText[a.type] }}</span>
              <span class="alert-title">{{ a.title }}</span>
              <span v-if="a.status === 'processing'" class="status-tag processing">处理中</span>
            </div>
            <div class="alert-meta">
              <span class="meta-item"><i class="i-ant-design-environment-outlined" />{{ a.location }}</span>
              <span v-if="a.person" class="meta-item"><i class="i-ant-design-user-outlined" />{{ a.person }}</span>
              <span class="meta-item"><i class="i-ant-design-clock-circle-outlined" />{{ a.time }}</span>
            </div>
            <p class="alert-desc">{{ a.desc }}</p>
            <div class="alert-actions">
              <button v-if="a.status === 'pending'" class="action-btn handle" @click.stop="handleAlert(a)">
                <i class="i-ant-design-tool-outlined" />开始处理
              </button>
              <button class="action-btn resolve" @click.stop="resolveAlert(a)">
                <i class="i-ant-design-check-outlined" />标记解决
              </button>
            </div>
          </div>
          <div v-if="filteredAlerts.length === 0" class="alert-empty">
            <i class="i-ant-design-safety-certificate-outlined empty-icon" />
            <p>暂无待处理告警</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.elderly-security {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
  overflow: hidden;
}

/* ===== 统计卡片 ===== */
.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  flex-shrink: 0;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  box-shadow: 0 1px rgba(20, 22, 30, 0.04);

  .stat-icon-wrap {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(250, 140, 22, 0.1);
    i { font-size: 22px; color: #fa8c16; }

    &.purple { background: rgba(110, 75, 255, 0.1); i { color: $color-primary; } }
    &.orange { background: rgba(82, 196, 26, 0.1); i { color: #52c41a; } }
    &.gray { background: rgba(140, 140, 140, 0.1); i { color: #8c8c8c; } }
  }

  &.urgent .stat-icon-wrap { background: rgba(255, 77, 79, 0.1); i { color: #ff4d4f; } }

  .stat-info {
    display: flex;
    flex-direction: column;
  }
  .stat-num { font-size: 24px; font-weight: 700; color: $text-base; line-height: 1.2; }
  .stat-label { font-size: 12px; color: $text-tertiary; }
}

/* ===== 主体 ===== */
.security-body {
  flex: 1;
  display: flex;
  gap: 12px;
  min-height: 0;
}

/* 左侧平面图 */
.map-section {
  flex: 1;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
  }
}

.map-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  padding: 2px;

  .ctrl-btn {
    width: 24px; height: 24px;
    border: none; background: transparent;
    color: $text-secondary; cursor: pointer;
    border-radius: 4px;
    i { font-size: 12px; }
    &:hover { background: $bg-hover; color: $color-primary; }
  }
  .zoom-text { font-size: 11px; color: $text-tertiary; min-width: 32px; text-align: center; }
}

.map-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #f5f6f8;
  cursor: grab;
  user-select: none;
  &:active { cursor: grabbing; }
}

.map-transform {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  transform-origin: center center;
}

.map-img {
  max-width: 92%; max-height: 92%;
  object-fit: contain;
  pointer-events: none;
}

/* 告警点位 */
.alert-point {
  position: absolute;
  width: 28px; height: 28px;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  z-index: 2;
  background: #fff;
  box-shadow: 0 0 0 2px currentColor;
  i { font-size: 13px; }

  &.urgent { color: #ff4d4f; i { color: #ff4d4f; } }
  &.warning { color: #fa8c16; i { color: #fa8c16; } }
  &.info { color: #1890ff; i { color: #1890ff; } }

  &.selected {
    transform: translate(-50%, -50%) scale(1.3);
    z-index: 3;
  }

  .alert-pulse {
    position: absolute;
    inset: -4px;
    border-radius: 50%;
    border: 2px solid currentColor;
    opacity: 0.5;
    animation: pulse 1.8s ease-out infinite;
  }

  &.selected .alert-pulse {
    animation-duration: 1s;
  }
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.2); opacity: 0; }
}

/* 右侧告警列表 */
.alert-section {
  width: 380px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.type-filter {
  display: flex;
  gap: 4px;

  .filter-btn {
    padding: 4px 10px;
    border: 1px solid $border-color-card;
    border-radius: 6px;
    background: #fff;
    color: $text-secondary;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;

    &:hover { color: $color-primary; }
    &.active { background: $color-primary-bg; color: $color-primary; border-color: $color-primary; }
  }
}

.alert-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.alert-card {
  padding: 12px;
  border: 1px solid $border-color-card;
  border-left: 3px solid;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  &.selected { background: #fafbff; border-color: $color-primary; }

  &.urgent { border-left-color: #ff4d4f; }
  &.warning { border-left-color: #fa8c16; }
  &.info { border-left-color: #1890ff; }

  &.processing { opacity: 0.75; }
}

.alert-card-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}

.alert-level-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 500;
  &.urgent { background: #fff1f0; color: #ff4d4f; }
  &.warning { background: #fff7e6; color: #fa8c16; }
  &.info { background: #e6f7ff; color: #1890ff; }
}

.alert-type-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  &.behavior { background: rgba(110, 75, 255, 0.08); color: $color-primary; }
  &.environment { background: rgba(82, 196, 26, 0.08); color: #52c41a; }
}

.alert-title {
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
  flex: 1;
}

.status-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  &.processing { background: #fff7e6; color: #fa8c16; }
}

.alert-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 6px;

  .meta-item {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 12px;
    color: $text-tertiary;
    i { font-size: 11px; }
  }
}

.alert-desc {
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.6;
  margin: 0 0 8px;
}

.alert-actions {
  display: flex;
  gap: 6px;

  .action-btn {
    display: flex;
    align-items: center;
    gap: 3px;
    padding: 4px 10px;
    border: 1px solid $border-color-card;
    border-radius: 5px;
    background: #fff;
    color: $text-secondary;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
    i { font-size: 11px; }
    &:hover { color: $color-primary; border-color: $color-primary; }

    &.handle { color: #fa8c16; border-color: #ffd591; &:hover { background: #fff7e6; } }
    &.resolve { color: #52c41a; border-color: #b7eb8f; &:hover { background: #f6ffed; } }
  }
}

.alert-empty {
  text-align: center;
  padding: 40px;
  color: $text-tertiary;
  .empty-icon { font-size: 40px; color: #52c41a; opacity: 0.4; margin-bottom: 8px; }
  p { font-size: 13px; margin: 0; }
}
</style>
