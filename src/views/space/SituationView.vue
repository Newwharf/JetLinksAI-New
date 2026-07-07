<script setup lang="ts">
/**
 * 空间态势页 - 1:1 复刻 space/Situation
 * 2.5D 楼层可视化（图片占位，可缩放拖拽）+ 浮动控制面板
 */
import floorPlan from '@/assets/floorPlan.png'
import type { TreeNode } from './AreaView.vue'

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

// ===== 空间树（与空间管理共用结构，含 planImage）=====
const spaceTree = ref<TreeNode[]>([
  {
    id: 'park-1',
    label: '物联网产业园区',
    level: 1,
    type: 'park',
    expanded: true,
    planImage: floorPlan,
    children: [
      {
        id: 'b-e',
        label: 'E栋',
        level: 2,
        type: 'building',
        expanded: true,
        planImage: floorPlan,
        children: [
          {
            id: 'f-4f',
            label: '4F',
            level: 3,
            type: 'floor',
            expanded: true,
            planImage: floorPlan,
            children: [
              { id: 'a-rd', label: '研发部办公区', level: 4, type: 'area', planImage: floorPlan },
              { id: 'a-pm', label: '项目部办公区', level: 4, type: 'area' /* 无平面图 */ }
            ]
          },
          { id: 'f-2f', label: '2F', level: 3, type: 'floor', planImage: floorPlan }
        ]
      },
      {
        id: 'b-a',
        label: 'A栋',
        level: 2,
        type: 'building',
        expanded: false,
        /* 无平面图 */
        children: [
          {
            id: 'f-1f',
            label: '1F',
            level: 3,
            type: 'floor',
            expanded: false,
            children: [
              { id: 'a-op', label: '运营办公室', level: 4, type: 'area' /* 无平面图 */ }
            ]
          }
        ]
      }
    ]
  }
])

// 当前选中节点
const selectedNodeId = ref<string>('park-1')
const buildingMenuOpen = ref(false)

// 扁平查找
function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const f = findNode(n.children, id)
      if (f) return f
    }
  }
  return null
}

const selectedNode = computed(() => findNode(spaceTree.value, selectedNodeId.value))

// 节点完整路径
function getNodePath(id: string): string {
  const path: string[] = []
  function walk(nodes: TreeNode[], parents: string[]): boolean {
    for (const n of nodes) {
      const np = [...parents, n.label]
      if (n.id === id) { path.push(...np); return true }
      if (n.children && walk(n.children, np)) return true
    }
    return false
  }
  walk(spaceTree.value, [])
  return path.join(' / ')
}

function selectSpaceNode(node: TreeNode) {
  selectedNodeId.value = node.id
  buildingMenuOpen.value = false
  // 切换节点后重置视图
  scale.value = 1
  translateX.value = 0
  translateY.value = 0
}

// 切换展开
function toggleNodeExpand(node: TreeNode) {
  node.expanded = !node.expanded
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

// ===== 时间轴回放 =====// ===== 时间轴回放 =====
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
        <!-- 有平面图：显示 -->
        <template v-if="selectedNode?.planImage">
          <img :src="selectedNode.planImage" class="canvas-bg-img" alt="2.5D空间态势" draggable="false" />
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
        </template>
        <!-- 无平面图：提示去上传 -->
        <div v-else class="no-plan-tip">
          <i class="i-ant-design-file-image-outlined no-plan-icon" />
          <h4 class="no-plan-title">该空间暂无平面图</h4>
          <p class="no-plan-desc">
            当前空间「{{ selectedNode?.label }}」尚未上传平面图，
            <br />请前往「空间管理 → {{ selectedNode?.label }} → 空间平面图」上传
          </p>
          <router-link :to="{ path: '/space/area', query: { node: selectedNodeId, tab: 'plan' } }" class="no-plan-btn">
            <i class="i-ant-design-arrow-right-outlined" />
            <span>去上传平面图</span>
          </router-link>
        </div>
      </div>

      <!-- 左上：值守栏卡片（折叠/展开图标，宽=楼层卡片94px） -->
      <div class="card-btn watch-card" @click="watchOpen = !watchOpen">
        <i :class="watchOpen ? 'i-ant-design-menu-fold-outlined' : 'i-ant-design-menu-unfold-outlined'" class="card-btn-icon" />
        <span>值守栏</span>
      </div>

      <!-- 空间选择卡片（图标 + 当前节点路径 + 树菜单） -->
      <div class="building-wrap">
        <div class="card-btn building-card" @click="buildingMenuOpen = !buildingMenuOpen">
          <i class="i-ant-design-apartment-outlined building-icon" />
          <span class="building-name">{{ getNodePath(selectedNodeId) }}</span>
          <i class="i-ant-design-down-outlined card-btn-arrow" />
        </div>
        <!-- 完整空间树菜单 -->
        <div v-show="buildingMenuOpen" class="building-tree scroll-thin">
          <template v-for="node in spaceTree" :key="node.id">
            <div
              class="tree-node-row"
              :class="{ active: selectedNodeId === node.id }"
              :style="{ paddingLeft: '8px' }"
              @click="selectSpaceNode(node)"
            >
              <i
                v-if="node.children?.length"
                class="tree-arrow"
                :class="node.expanded ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'"
                @click.stop="toggleNodeExpand(node)"
              />
              <span v-else class="tree-arrow-placeholder" />
              <i class="tree-node-icon" :class="node.type === 'park' ? 'i-ant-design-apartment-outlined' : node.type === 'building' ? 'i-ant-design-home-outlined' : node.type === 'floor' ? 'i-ant-design-appstore-outlined' : 'i-ant-design-environment-outlined'" />
              <span class="tree-node-label">{{ node.label }}</span>
              <i v-if="!node.planImage" class="tree-no-plan-tip" title="未上传平面图" />
            </div>
            <!-- 子节点（递归一层一层渲染） -->
            <template v-if="node.expanded && node.children">
              <div
                v-for="child in node.children"
                :key="child.id"
              >
                <div
                  class="tree-node-row"
                  :class="{ active: selectedNodeId === child.id }"
                  :style="{ paddingLeft: '24px' }"
                  @click="selectSpaceNode(child)"
                >
                  <i
                    v-if="child.children?.length"
                    class="tree-arrow"
                    :class="child.expanded ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'"
                    @click.stop="toggleNodeExpand(child)"
                  />
                  <span v-else class="tree-arrow-placeholder" />
                  <i class="tree-node-icon" :class="child.type === 'building' ? 'i-ant-design-home-outlined' : child.type === 'floor' ? 'i-ant-design-appstore-outlined' : 'i-ant-design-environment-outlined'" />
                  <span class="tree-node-label">{{ child.label }}</span>
                </div>
                <template v-if="child.expanded && child.children">
                  <div
                    v-for="gc in child.children"
                    :key="gc.id"
                  >
                    <div
                      class="tree-node-row"
                      :class="{ active: selectedNodeId === gc.id }"
                      :style="{ paddingLeft: '40px' }"
                      @click="selectSpaceNode(gc)"
                    >
                      <i
                        v-if="gc.children?.length"
                        class="tree-arrow"
                        :class="gc.expanded ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'"
                        @click.stop="toggleNodeExpand(gc)"
                      />
                      <span v-else class="tree-arrow-placeholder" />
                      <i class="tree-node-icon" :class="gc.type === 'floor' ? 'i-ant-design-appstore-outlined' : 'i-ant-design-environment-outlined'" />
                      <span class="tree-node-label">{{ gc.label }}</span>
                    </div>
                    <template v-if="gc.expanded && gc.children">
                      <div
                        v-for="ggc in gc.children"
                        :key="ggc.id"
                        class="tree-node-row"
                        :class="{ active: selectedNodeId === ggc.id }"
                        :style="{ paddingLeft: '56px' }"
                        @click="selectSpaceNode(ggc)"
                      >
                        <span class="tree-arrow-placeholder" />
                        <i class="tree-node-icon i-ant-design-environment-outlined" />
                        <span class="tree-node-label">{{ ggc.label }}</span>
                      </div>
                    </template>
                  </div>
                </template>
              </div>
            </template>
          </template>
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

  /* 无平面图提示 */
  .no-plan-tip {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    text-align: center;
    background: rgba(255, 255, 255, 0.96);
    border: 1px dashed $border-color-input;
    border-radius: 12px;
    max-width: 460px;

    .no-plan-icon {
      font-size: 56px;
      color: $text-muted;
      opacity: 0.4;
      margin-bottom: 16px;
    }

    .no-plan-title {
      font-size: 17px;
      font-weight: 600;
      color: $text-base;
      margin: 0 0 8px;
    }

    .no-plan-desc {
      font-size: 13px;
      color: $text-tertiary;
      line-height: 1.7;
      margin: 0 0 18px;
    }

    .no-plan-btn {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      height: 34px;
      padding: 0 18px;
      background: $color-primary;
      color: #fff;
      font-size: 13px;
      border-radius: 6px;
      text-decoration: none;
      transition: opacity 0.15s;

      i {
        font-size: 13px;
      }

      &:hover {
        opacity: 0.9;
      }
    }
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
  width: 280px;

  .building-icon {
    font-size: 16px;
    color: $text-secondary;
  }

  .building-name {
    font-size: 13px;
    color: $text-base;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
  }

  .card-btn-arrow {
    font-size: 10px;
    color: $text-muted;
  }
}

/* 楼栋树菜单（完整空间树） */
.building-tree {
  position: absolute;
  top: 42px;
  left: 0;
  width: 240px;
  max-height: 60vh;
  overflow-y: auto;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  box-shadow: 0 4px 16px 0 rgba(0, 0, 0, 0.1);
  padding: 6px;
  z-index: 12;

  .tree-node-row {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 30px;
    padding-right: 8px;
    font-size: 13px;
    color: $text-base;
    cursor: pointer;
    border-radius: 6px;
    transition: background 0.15s;

    &:hover {
      background: $bg-hover;
    }

    &.active {
      background: $color-primary-bg;
      color: $color-primary;
      font-weight: 500;
    }

    .tree-arrow {
      font-size: 10px;
      color: $text-muted;
      width: 14px;
      flex-shrink: 0;
      cursor: pointer;
    }

    .tree-arrow-placeholder {
      width: 14px;
      flex-shrink: 0;
    }

    .tree-node-icon {
      font-size: 13px;
      color: $text-secondary;
      flex-shrink: 0;
    }

    .tree-node-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tree-no-plan-tip {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #faad14;
      flex-shrink: 0;
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
      color: $color-online;
      background: $color-online-bg;
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

/* ===== 左侧：视图工具（各自独立卡片，38×36） ===== */
.map-control-stack {
  position: absolute;
  top: 68px;
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
