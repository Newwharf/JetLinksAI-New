<script setup lang="ts">
/**
 * 空间态势页 - 1:1 复刻 space/Situation
 * 2.5D 楼层可视化（图片占位，可缩放拖拽）+ 浮动控制面板
 */
import floorPlan from '@/assets/floorPlan.png'

// ===== 图片缩放与拖拽 =====
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isDragging = ref(false)
const dragStart = reactive({ x: 0, y: 0, tx: 0, ty: 0 })

function zoomIn() {
  scale.value = Math.min(scale.value + 0.15, 3)
}
function zoomOut() {
  scale.value = Math.max(scale.value - 0.15, 0.4)
}
function resetView() {
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}
function onWheel(e: WheelEvent) {
  e.preventDefault()
  if (e.deltaY < 0) zoomIn()
  else zoomOut()
}
function onDragStart(e: MouseEvent) {
  isDragging.value = true
  dragStart.x = e.clientX
  dragStart.y = e.clientY
  dragStart.tx = translateX.value
  dragStart.ty = translateY.value
}
function onDragMove(e: MouseEvent) {
  if (!isDragging.value) return
  translateX.value = dragStart.tx + (e.clientX - dragStart.x)
  translateY.value = dragStart.ty + (e.clientY - dragStart.y)
}
function onDragEnd() {
  isDragging.value = false
}

// ===== 图层开关 =====
interface LayerSwitch {
  key: string
  label: string
  icon: string
  checked: boolean
}

// 图例分组：设备类型 / 在线离线 / 告警
interface LayerGroup {
  label: string
  items: LayerSwitch[]
}
const layerGroups = ref<LayerGroup[]>([
  {
    label: '设备类型',
    items: [
      { key: 'iot', label: '物联设备', icon: 'i-ant-design-control-outlined', checked: true },
      { key: 'video', label: '视联设备', icon: 'i-ant-design-video-camera-outlined', checked: true }
    ]
  },
  {
    label: '状态',
    items: [
      { key: 'online', label: '在线', icon: 'i-ant-design-check-circle-outlined', checked: true },
      { key: 'offline', label: '离线', icon: 'i-ant-design-disconnect-outlined', checked: true },
      { key: 'fault', label: '故障', icon: 'i-ant-design-close-circle-outlined', checked: true }
    ]
  },
  {
    label: '告警',
    items: [
      { key: 'alarm', label: '告警', icon: 'i-ant-design-alert-outlined', checked: true }
    ]
  }
])

// 图层是否可见（用于筛选点位）
function isLayerOn(key: string): boolean {
  for (const g of layerGroups.value) {
    const item = g.items.find(i => i.key === key)
    if (item) return item.checked
  }
  return false
}

function toggleLayer(layer: LayerSwitch) {
  layer.checked = !layer.checked
}

// ===== 值守栏展开 =====
const watchOpen = ref(false)

// ===== 楼栋选择（多园区） =====
interface BuildingItem {
  label: string
  value: string
  active: boolean
}
interface ParkItem {
  name: string
  children: BuildingItem[]
}
const parks = ref<ParkItem[]>([
  {
    name: '物联网产业园区',
    children: [
      { label: 'A栋', value: '物联网产业园区/A栋', active: false },
      { label: 'B栋', value: '物联网产业园区/B栋', active: false },
      { label: 'C栋', value: '物联网产业园区/C栋', active: false },
      { label: 'D栋', value: '物联网产业园区/D栋', active: false },
      { label: 'E栋', value: '物联网产业园区/E栋', active: true }
    ]
  },
  {
    name: '新媒体创新园区',
    children: [
      { label: '新知楼', value: '新媒体创新园区/新知楼', active: false },
      { label: '信创楼', value: '新媒体创新园区/信创楼', active: false }
    ]
  }
])
const currentBuilding = ref('E栋')
const buildingMenuOpen = ref(false)
function selectBuilding(b: BuildingItem) {
  parks.value.forEach(p => p.children.forEach(item => (item.active = false)))
  b.active = true
  currentBuilding.value = b.label
  buildingMenuOpen.value = false
}

// ===== 状态摘要 =====
const stats = [
  { label: '正常设备', count: '42', desc: '设备在线且工作正常', color: '#6e4bff', iconColor: '#6e4bff', iconBg: 'rgba(110,75,255,0.1)', icon: 'i-ant-design-check-circle-outlined' },
  { label: '离线设备', count: '3', desc: '设备已失联，请及时排查', color: '#8c8c8c', iconColor: '#8c8c8c', iconBg: 'rgba(140,140,140,0.1)', icon: 'i-ant-design-disconnect-outlined' },
  { label: '故障设备', count: '1', desc: '设备存在异常，影响运行', color: '#fa541c', iconColor: '#ff4d4f', iconBg: 'rgba(255,77,79,0.1)', icon: 'i-ant-design-close-circle-outlined' },
  { label: '待处理告警', count: '5', desc: '尚未处理的告警事件', color: '#fa8c16', iconColor: '#fa8c16', iconBg: 'rgba(250,140,22,0.1)', icon: 'i-ant-design-alert-outlined' }
]

// ===== 设备点位 =====
// type: iot 物联 / video 视联；status: online / offline；alarm 告警数（0 表示无）
// x/y 为相对画布的百分比坐标（0~100），跟随图片缩放/移动
interface DevicePoint {
  id: string
  name: string
  type: 'iot' | 'video'
  status: 'online' | 'offline'
  alarm: number
  x: number
  y: number
}

const devices = ref<DevicePoint[]>([
  { id: 'd1', name: '门禁控制器-东门', type: 'iot', status: 'online', alarm: 0, x: 25, y: 30 },
  { id: 'd2', name: '摄像头-大厅A', type: 'video', status: 'online', alarm: 0, x: 45, y: 25 },
  { id: 'd3', name: '温湿度传感器', type: 'iot', status: 'online', alarm: 2, x: 60, y: 40 },
  { id: 'd4', name: '摄像头-走廊B', type: 'video', status: 'offline', alarm: 0, x: 35, y: 55 },
  { id: 'd5', name: '烟感探测器', type: 'iot', status: 'online', alarm: 1, x: 70, y: 60 },
  { id: 'd6', name: '摄像头-西门', type: 'video', status: 'online', alarm: 0, x: 20, y: 65 },
  { id: 'd7', name: '门禁控制器-南门', type: 'iot', status: 'offline', alarm: 0, x: 55, y: 70 },
  { id: 'd8', name: '摄像头-办公区', type: 'video', status: 'online', alarm: 3, x: 80, y: 35 },
  { id: 'd9', name: '漏水检测器', type: 'iot', status: 'online', alarm: 0, x: 40, y: 75 },
  { id: 'd10', name: '摄像头-电梯口', type: 'video', status: 'online', alarm: 0, x: 65, y: 50 }
])

// 点位是否可见（根据图例筛选）
function isDeviceVisible(d: DevicePoint): boolean {
  // 设备类型筛选
  if (!isLayerOn(d.type)) return false
  // 在线/离线筛选
  if (d.status === 'online' && !isLayerOn('online')) return false
  if (d.status === 'offline' && !isLayerOn('offline')) return false
  // 告警筛选：有告警的设备需要告警图层开启
  if (d.alarm > 0 && !isLayerOn('alarm')) return false
  return true
}

// 设备状态文本
function statusText(d: DevicePoint): string {
  if (d.status === 'offline') return '离线'
  if (d.alarm > 0) return `告警中（${d.alarm}条）`
  return '在线'
}

// ===== 楼层 =====
const floors = ['4F', '2F']
const activeFloor = ref('4F')

// ===== 时间轴回放 =====
const playing = ref(false)
const playSpeed = ref('x1')
const currentDate = ref('07/01')
const timelineHours = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']
</script>

<template>
  <div class="situation-page">
    <!-- 2.5D 画布容器（渐变背景） -->
    <div
      class="map-workspace"
      @wheel="onWheel"
      @mousedown="onDragStart"
      @mousemove="onDragMove"
      @mouseup="onDragEnd"
      @mouseleave="onDragEnd"
    >
      <!-- 2.5D 图片 + 设备点位（可缩放拖拽） -->
      <div
        class="canvas-25d"
        :class="{ dragging: isDragging }"
        :style="{ transform: `translate(${translateX}px, ${translateY}px) scale(${scale})` }"
      >
        <img :src="floorPlan" class="canvas-bg-img" alt="2.5D空间态势" draggable="false" />
        <!-- 设备点位（百分比定位，跟随缩放移动） -->
        <a-tooltip
          v-for="d in devices"
          :key="d.id"
          :mouse-enter-delay="0.2"
        >
          <template #title>
            <div class="device-tip">
              <div class="device-tip-name">{{ d.name }}</div>
              <div class="device-tip-status" :class="{ offline: d.status === 'offline', alarm: d.alarm > 0 }">
                状态：{{ statusText(d) }}
              </div>
              <div v-if="d.alarm > 0" class="device-tip-alarm">告警数：{{ d.alarm }}</div>
            </div>
          </template>
          <div
            v-show="isDeviceVisible(d)"
            class="device-point"
            :class="[d.type, d.status, { 'has-alarm': d.alarm > 0 }]"
            :style="{ left: d.x + '%', top: d.y + '%' }"
            @mousedown.stop
            @click.stop
          >
            <i :class="d.type === 'iot' ? 'i-ant-design-control-outlined' : 'i-ant-design-video-camera-outlined'" />
            <span v-if="d.alarm > 0" class="alarm-badge">{{ d.alarm }}</span>
          </div>
        </a-tooltip>
      </div>

      <!-- 左上：值守栏卡片（折叠/展开图标，宽=楼层卡片94px） -->
      <div class="card-btn watch-card" @click="watchOpen = !watchOpen">
        <i :class="watchOpen ? 'i-ant-design-menu-fold-outlined' : 'i-ant-design-menu-unfold-outlined'" class="card-btn-icon" />
        <span>值守栏</span>
      </div>

      <!-- 楼栋选择卡片（楼栋图标 + 文案 + 树菜单） -->
      <div class="building-wrap">
        <div class="card-btn building-card" @click="buildingMenuOpen = !buildingMenuOpen">
          <i class="i-ant-design-home-outlined building-icon" />
          <span class="building-name">物联网产业园区/{{ currentBuilding }}</span>
          <i class="i-ant-design-down-outlined card-btn-arrow" />
        </div>
        <!-- 树菜单（多园区） -->
        <div v-show="buildingMenuOpen" class="building-tree">
          <div v-for="park in parks" :key="park.name" class="tree-park">
            <div class="tree-root">
              <i class="i-ant-design-apartment-outlined tree-root-icon" />
              <span>{{ park.name }}</span>
            </div>
            <div class="tree-children">
              <div
                v-for="b in park.children"
                :key="b.value"
                class="tree-item"
                :class="{ active: b.active }"
                @click="selectBuilding(b)"
              >
                {{ b.label }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右上：图例开关（分组） -->
      <div class="layer-switches">
        <template v-for="(group, gi) in layerGroups" :key="group.label">
          <!-- 分组分隔线 -->
          <div v-if="gi > 0" class="layer-divider" />
          <button
            v-for="layer in group.items"
            :key="layer.key"
            class="layer-chip"
            @click="toggleLayer(layer)"
          >
            <span class="layer-icon-wrap" :class="'icon-' + layer.key">
              <i :class="layer.icon" />
            </span>
            <span class="layer-label">{{ layer.label }}</span>
            <span class="layer-checkbox" :class="{ checked: layer.checked }">
              <i v-if="layer.checked" class="i-ant-design-check-outlined" />
            </span>
          </button>
        </template>
      </div>

      <!-- 左侧：楼层切换 -->
      <div class="floor-stack">
        <button
          v-for="f in floors"
          :key="f"
          class="floor-btn"
          :class="{ active: activeFloor === f }"
          @click="activeFloor = f"
        >
          {{ f }}
        </button>
      </div>

      <!-- 左侧：视图工具（重置、放大、缩小，各自独立卡片） -->
      <div class="map-control-stack">
        <button class="map-control-button" title="重置视图" @click="resetView">
          <i class="i-ant-design-aim-outlined" />
        </button>
        <button class="map-control-button" title="放大" @click="zoomIn">
          <i class="i-ant-design-plus-outlined" />
        </button>
        <button class="map-control-button" title="缩小" @click="zoomOut">
          <i class="i-ant-design-minus-outlined" />
        </button>
      </div>

      <!-- 底部：状态摘要（不占满） -->
      <div class="canvas-stat-overlay">
        <div v-for="(s, i) in stats" :key="i" class="canvas-stat-card">
          <div class="stat-icon" :style="{ background: s.iconBg }">
            <i :class="s.icon" :style="{ color: s.iconColor }" />
          </div>
          <div class="stat-body">
            <div class="stat-label">
              <span class="stat-name">{{ s.label }}</span>
            </div>
            <div class="stat-count" :style="{ color: s.color }">{{ s.count }}</div>
            <div class="stat-desc" :style="{ color: s.color }">{{ s.desc }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部：事件时间轴回放 -->
    <div class="spatial-timeline">
      <!-- 第一行：播放、速度、日期 -->
      <div class="timeline-row timeline-row--controls">
        <div class="timeline-controls">
          <button class="timeline-btn" @click="playing = !playing">
            <i :class="playing ? 'i-ant-design-pause-outlined' : 'i-ant-design-caret-right-outlined'" />
            <span>{{ playing ? '暂停' : '播放' }}</span>
          </button>
          <button class="timeline-btn">
            <span>{{ playSpeed }}</span>
            <i class="i-ant-design-down-outlined" />
          </button>
        </div>
        <div class="timeline-date">
          <i class="i-ant-design-calendar-outlined" />
          <input v-model="currentDate" placeholder="请选择日期" class="date-input" />
        </div>
      </div>
      <!-- 第二行：时间轴 -->
      <div class="timeline-row timeline-row--track">
        <div class="timeline-track">
          <div class="timeline-hours">
            <span v-for="h in timelineHours" :key="h" class="hour-tick">{{ h }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.situation-page {
  height: 100%;
  background: $bg-page;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

/* ===== 2.5D 画布容器（白色到灰色渐变背景） ===== */
.map-workspace {
  flex: 1;
  background: linear-gradient(180deg, #ffffff 0%, #f5f6f8 100%);
  border: 1px solid $border-color-card;
  border-radius: 14px;
  position: relative;
  overflow: hidden;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.canvas-25d {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.05s linear;
  transform-origin: center center;
  user-select: none;

  &.dragging {
    transition: none;
  }

  .canvas-bg-img {
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
    pointer-events: none;
  }
}

/* ===== 设备点位 ===== */
.device-point {
  position: absolute;
  // 整体放大 1.5 倍：原 28px → 42px
  width: 42px;
  height: 42px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s;
  z-index: 5;

  &:hover {
    transform: translate(-50%, -50%) scale(1.2);
    z-index: 6;
  }

  // 图标缩小一点，在圆形中居中更协调
  i {
    font-size: 18px;
  }

  // 物联设备：紫色
  &.iot {
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 0 0 2px #6e4bff, 0 2px 6px rgba(0, 0, 0, 0.15);
    i {
      color: #6e4bff;
    }
  }

  // 视联设备：蓝色
  &.video {
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 0 0 2px #1890ff, 0 2px 6px rgba(0, 0, 0, 0.15);
    i {
      color: #1890ff;
    }
  }

  // 离线：灰色边框 + 灰色图标
  &.offline {
    box-shadow: 0 0 0 2px #bfbfbf, 0 2px 6px rgba(0, 0, 0, 0.15);
    i {
      color: #bfbfbf !important;
    }
  }

  // 告警角标（数字居中）
  .alarm-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    min-width: 20px;
    height: 20px;
    padding: 0;
    border-radius: 50%;
    background: #ff4d4f;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    line-height: 20px;
    text-align: center;
    border: 2px solid #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* 设备 tooltip 内容（黑底，文字偏白增强对比） */
.device-tip {
  .device-tip-name {
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 4px;
    color: #fff;
  }

  .device-tip-status {
    font-size: 12px;
    color: #95de64;

    &.offline {
      color: #d9d9d9;
    }

    &.alarm {
      color: #ff7875;
    }
  }

  .device-tip-alarm {
    font-size: 12px;
    color: #ff7875;
    margin-top: 2px;
  }
}

/* ===== 通用卡片按钮 ===== */
.card-btn {
  position: absolute;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 10px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid $border-color-card;
  border-radius: 12px;
  box-shadow: 0 1px 2px 0 rgba(20, 22, 30, 0.04);
  font-size: 13px;
  color: $text-base;
  cursor: pointer;

  .card-btn-icon {
    font-size: 14px;
    color: $text-secondary;
  }
}

/* 值守栏卡片（宽=楼层卡片94px） */
.watch-card {
  top: 16px;
  left: 16px;
  width: 94px;
  justify-content: flex-start;
}

/* 楼栋选择 */
.building-wrap {
  position: absolute;
  top: 16px;
  left: 121px;
  z-index: 11;
}

.building-card {
  position: relative;
  top: auto;
  left: auto;
  width: 200px;

  .building-icon {
    font-size: 16px;
    color: $text-secondary;
  }

  .building-name {
    font-size: 13px;
    color: $text-base;
    white-space: nowrap;
    flex: 1;
  }

  .card-btn-arrow {
    font-size: 10px;
    color: $text-muted;
  }
}

/* 楼栋树菜单 */
.building-tree {
  position: absolute;
  top: 42px;
  left: 0;
  width: 200px;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1);
  padding: 6px;
  z-index: 12;

  // 园区分组间距
  .tree-park + .tree-park {
    margin-top: 4px;
  }

  .tree-root {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 8px;
    font-size: 13px;
    font-weight: 500;
    color: $text-base;

    .tree-root-icon {
      font-size: 14px;
      color: $text-secondary;
    }
  }

  .tree-children {
    // 不加左侧 padding，让选中背景铺满整行
  }

  .tree-item {
    display: flex;
    align-items: center;
    height: 32px;
    padding: 0 8px 0 28px;
    font-size: 13px;
    color: $text-base;
    cursor: pointer;
    border-radius: 6px;

    &:hover {
      background: $bg-hover;
    }

    &.active {
      background: $color-primary-bg;
      color: $color-primary;
      font-weight: 500;
    }
  }
}

/* ===== 右上：图例开关 ===== */
.layer-switches {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 2px;
  height: 36px;
  padding: 4px 6px;
  background: #fff;
  border: 1px solid #eceef2;
  border-radius: 8px;
  box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.1);
}

// 分组分隔线（更明显、间距更大）
.layer-divider {
  width: 1px;
  height: 20px;
  background: #d9d9d9;
  margin: 0 10px;
}

.layer-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 8px;
  border: none;
  background: transparent;
  color: $text-secondary;
  font-size: 13px;
  cursor: pointer;
  border-radius: 8px;

  &:hover {
    background: $bg-hover;
  }

  // 图标圆形背景（按类型上色，与点位一致）
  .layer-icon-wrap {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid currentColor;

    i {
      font-size: 12px;
    }

    // 物联设备：紫
    &.icon-iot {
      color: #6e4bff;
      background: rgba(110, 75, 255, 0.1);
    }
    // 视联设备：蓝
    &.icon-video {
      color: #1890ff;
      background: rgba(24, 144, 255, 0.1);
    }
    // 在线：绿
    &.icon-online {
      color: #52c41a;
      background: rgba(82, 196, 26, 0.1);
    }
    // 离线：灰
    &.icon-offline {
      color: #bfbfbf;
      background: rgba(191, 191, 191, 0.1);
    }
    // 故障：橙红
    &.icon-fault {
      color: #fa541c;
      background: rgba(250, 84, 28, 0.1);
    }
    // 告警：红
    &.icon-alarm {
      color: #ff4d4f;
      background: rgba(255, 77, 79, 0.1);
    }
  }

  .layer-label {
    font-size: 13px;
    color: $text-base;
  }

  .layer-checkbox {
    width: 14px;
    height: 14px;
    border: 1px solid $border-color-light;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;

    i {
      font-size: 10px;
      color: #fff;
    }

    &.checked {
      background: $color-primary;
      border-color: $color-primary;
    }
  }
}

/* ===== 左侧：楼层切换（宽94px = 与值守栏一致） ===== */
.floor-stack {
  position: absolute;
  top: 68px;
  left: 16px;
  z-index: 10;
  width: 94px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid $border-color-card;
  border-radius: 12px;
  box-shadow: 0 1px 2px 0 rgba(20, 22, 30, 0.04);
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.floor-btn {
  width: 100%;
  height: 34px;
  border: none;
  background: transparent;
  color: $text-base;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  text-align: left;
  padding-left: 12px;

  &:hover {
    background: $bg-hover;
  }

  &.active {
    background: $color-primary-bg;
    color: $color-primary;
  }
}

/* ===== 左侧：视图工具（各自独立卡片，38×36） ===== */
.map-control-stack {
  position: absolute;
  top: 158px;
  left: 16px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: 38px;
}

.map-control-button {
  width: 38px;
  height: 36px;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 1px 2px 0 rgba(20, 22, 30, 0.04);
  color: $text-secondary;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: $color-primary;
    border-color: $color-primary;
  }
}

/* ===== 底部状态摘要（不占满，每张220px） ===== */
.canvas-stat-overlay {
  position: absolute;
  bottom: 12px;
  left: 16px;
  z-index: 18;
  display: flex;
  gap: 12px;
}

.canvas-stat-card {
  width: 220px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid $border-color-card;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(20, 23, 31, 0.06);
  padding: 12px;
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  // 背景和图标颜色由各卡片行内 style 控制

  i {
    font-size: 20px;
  }
}

.stat-body {
  flex: 1;
  min-width: 0;

  .stat-label {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;

    .stat-name {
      font-size: 14px;
      font-weight: 400;
      color: $text-base;
    }
  }

  .stat-count {
    font-size: 24px;
    font-weight: 600;
    line-height: 1.2;
    margin-bottom: 2px;
  }

  .stat-desc {
    font-size: 13px;
    color: $text-secondary;
    line-height: 1.4;
  }
}

/* ===== 底部时间轴（两行布局） ===== */
.spatial-timeline {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 14px;
  padding: 12px 16px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.timeline-row {
  display: flex;
  align-items: center;
}

.timeline-row--controls {
  justify-content: flex-start;
  gap: 12px;
}

.timeline-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.timeline-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  background: #fff;
  color: $text-base;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
  }
}

// 倍速按钮下拉图标调小协调
.timeline-btn .i-ant-design-down-outlined {
  font-size: 9px;
  color: $text-muted;
}

.timeline-date {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  background: #fff;

  .date-input {
    border: none;
    outline: none;
    background: transparent;
    width: 50px;
    font-size: 13px;
    color: $text-base;
    font-family: inherit;
  }

  // 日历图标放右边
  i {
    font-size: 14px;
    color: $text-muted;
    order: 2;
  }
}

.timeline-row--track {
  width: 100%;
}

.timeline-track {
  flex: 1;
  height: 32px;
  display: flex;
  align-items: center;
  border-top: 2px solid $border-color-light;
  padding-top: 10px;
  position: relative;
}

.timeline-hours {
  display: flex;
  justify-content: space-between;
  width: 100%;

  .hour-tick {
    font-size: 14px;
    color: $text-base;
  }
}
</style>
