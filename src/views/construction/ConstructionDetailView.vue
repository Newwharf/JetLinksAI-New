<script setup lang="ts">
/**
 * 工地详情页（重构版）
 * 标题栏 + 基本信息展开 + 五栏布局（事件列表 | 3D模型+趋势 | 设备统计+人员）
 */
import { useRoute, useRouter } from 'vue-router'
import { ref, computed, onMounted, onUnmounted, watch, reactive } from 'vue'
import * as THREE from 'three'
import ECharts from '@/components/ECharts.vue'
import VideoPlayerModal from '@/components/VideoPlayerModal.vue'
import floorPlanImg from '@/assets/construction/floor-plan.jpg'
import {
  constructionSites,
  eventMeta,
  sizeTypeMeta,
  formatArea,
  getSiteEvents,
  getSiteTrend,
  getSiteWorkers,
  getSiteModel3D,
  getSiteMarkers,
  markerMeta,
  getScoreReason,
  type EventType,
  type SiteEvent,
  type SiteMarker
} from './posture.mock'

const route = useRoute()
const router = useRouter()
const siteId = computed(() => route.params.id as string)
const site = computed(() => constructionSites.find(s => s.id === siteId.value))

function goBack() {
  router.push('/construction-posture/overview')
}

// 安全评分等级
function scoreClass(score: number): string {
  if (score >= 85) return 'score-high'
  if (score >= 70) return 'score-mid'
  return 'score-low'
}

// 安全评分原因弹窗
const scoreReasonVisible = ref(false)
const scoreReason = computed(() => site.value ? getScoreReason(site.value.id) : null)

function openScoreReason() {
  scoreReasonVisible.value = true
}
function closeScoreReason() {
  scoreReasonVisible.value = false
}

// ===== 基本信息展开 =====
const infoExpanded = ref(false)
const previewImage = ref<string | null>(null)

// ===== 事件类型列表 =====
const eventTypes: EventType[] = ['safety', 'risk', 'health', 'alert']

// ===== 左栏：事件列表 =====
const eventListTab = ref<EventType>('safety')
const eventListEvents = computed(() =>
  site.value ? getSiteEvents(site.value.id, eventListTab.value) : []
)
function tabEventCount(type: EventType): number {
  if (!site.value) return 0
  return getSiteEvents(site.value.id, type).length
}

// 标签页横向滚动
const eventTabsRef = ref<HTMLDivElement | null>(null)
function scrollTabs(dir: 'left' | 'right') {
  if (!eventTabsRef.value) return
  eventTabsRef.value.scrollBy({ left: dir === 'left' ? -80 : 80, behavior: 'smooth' })
}

// ===== 中栏下：事件趋势 =====
const trendTab = ref<EventType>('safety')
const trendData = computed(() => site.value ? getSiteTrend(site.value.id) : null)
const trendOption = computed(() => {
  if (!trendData.value) return {}
  const t = trendData.value
  const color = eventMeta[trendTab.value].color
  const data = t[trendTab.value]
  return {
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [10, 14], textStyle: { color: '#111418', fontSize: 12 }, axisPointer: { type: 'line', lineStyle: { color, type: 'dashed', width: 1 } } },
    grid: { left: 40, right: 16, top: 16, bottom: 32 },
    xAxis: { type: 'category', data: t.days, boundaryGap: false, axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
    series: [{ type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, showSymbol: true, data, itemStyle: { color }, lineStyle: { width: 2, color }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: color + '2e' }, { offset: 1, color: color + '00' }] } } }]
  }
})

// ===== 右栏：设备统计 =====
const deviceGroups = computed(() => {
  if (!site.value) return []
  const s = site.value
  return [
    { label: '网关', icon: 'i-ant-design-cloud-server-outlined', color: '#faad14',
      stats: [{ label: '总数', value: s.gatewayCount || 0, color: '#6e4bff' }, { label: '在线', value: s.gatewayOnline || 0, color: '#2bb3a3' }, { label: '离线', value: s.gatewayOffline || 0, color: '#8c8c8c' }, { label: '异常', value: s.gatewayHealth || 0, color: '#722ed1' }] },
    { label: '视频设备', icon: 'i-ant-design-video-camera-outlined', color: '#6e4bff',
      stats: [{ label: '总数', value: s.videoCount, color: '#6e4bff' }, { label: '在线', value: s.videoOnline || 0, color: '#2bb3a3' }, { label: '离线', value: s.videoOffline || 0, color: '#8c8c8c' }, { label: '异常', value: s.videoHealth || 0, color: '#722ed1' }] },
    { label: '生产设备', icon: 'i-ant-design-api-outlined', color: '#2bb3a3',
      stats: [{ label: '总数', value: s.deviceCount, color: '#6e4bff' }, { label: '在线', value: s.deviceOnline || 0, color: '#2bb3a3' }, { label: '离线', value: s.deviceOffline || 0, color: '#8c8c8c' }, { label: '异常', value: s.deviceHealth || 0, color: '#722ed1' }] }
  ]
})

// ===== 右栏：活跃人员 =====
const workers = computed(() => site.value ? getSiteWorkers(site.value.id) : [])

// ===== 事件详情弹窗 =====
const detailEvent = ref<SiteEvent | null>(null)
function openEventDetail(ev: SiteEvent) { detailEvent.value = ev }
function closeEventDetail() { detailEvent.value = null }

// ===== 摄像头弹窗 =====
const videoModalOpen = ref(false)
const videoTarget = ref<{ name: string; thumb: string; status: 'online' | 'offline' } | null>(null)
function openCameraModal(marker: SiteMarker) {
  if (marker.camera) {
    videoTarget.value = marker.camera
    videoModalOpen.value = true
  }
}

// ===== 人员详情弹窗 =====
const detailWorker = ref<SiteMarker | null>(null)
function openWorkerDetail(marker: SiteMarker) { detailWorker.value = marker }
function closeWorkerDetail() { detailWorker.value = null }

// ===== 设备详情占位 =====
const detailDevice = ref<SiteMarker | null>(null)
function openDeviceDetail(marker: SiteMarker) { detailDevice.value = marker }
function closeDeviceDetail() { detailDevice.value = null }

// ===== 3D 模型 =====
const modelContainer = ref<HTMLDivElement | null>(null)
const markersOverlay = ref<HTMLDivElement | null>(null)
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let animationId = 0
let resizeObserver: ResizeObserver | null = null

// 鼠标拖拽
const isDragging = ref(false)
let dragStart = { x: 0, y: 0 }
let yaw = 0.4
let pitch = 0.3

// 缩放
let cameraRadius = 60

// 标记点
const markers = computed(() => site.value ? getSiteMarkers(site.value.id) : [])
const markerScreenPos = ref<Record<string, { x: number; y: number; visible: boolean }>>({})

// 图例开关（6 项：视频、设备、安全告警、风险预警、设备告警、设备异常）
const layerKeys = [
  { key: 'camera', label: '视频', icon: 'i-ant-design-video-camera-outlined', color: '#1890ff' },
  { key: 'device', label: '设备', icon: 'i-ant-design-control-outlined', color: '#6e4bff' },
  { key: 'safety', label: '安全告警', icon: 'i-ant-design-alert-outlined', color: '#ff4d4f' },
  { key: 'risk', label: '风险预警', icon: 'i-ant-design-warning-outlined', color: '#faad14' },
  { key: 'alert', label: '设备告警', icon: 'i-ant-design-notification-outlined', color: '#fa8c16' },
  { key: 'health', label: '设备异常', icon: 'i-ant-design-heart-outlined', color: '#722ed1' }
] as const

const layerVisible = reactive<Record<string, boolean>>({
  camera: true, device: true, safety: true, risk: true, alert: true, health: true, worker: true
})

// 判断标记是否可见（图例控制）
function isMarkerVisible(m: SiteMarker): boolean {
  if (m.type === 'camera') return layerVisible.camera
  if (m.type === 'device') return layerVisible.device
  if (m.type === 'worker') return layerVisible.worker
  if (m.type === 'event' && m.event) return layerVisible[m.event.type]
  return false
}

// 时间轴
const playing = ref(false)
const playSpeed = ref('x1')
const currentDate = ref('07-11')
const timelineHours = ['00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00']

// 缩放控件
function zoomIn() {
  if (viewMode.value === '3d') cameraRadius = Math.max(25, cameraRadius - 8)
  else planScale.value = Math.min(planScale.value + 0.15, 3)
}
function zoomOut() {
  if (viewMode.value === '3d') cameraRadius = Math.min(120, cameraRadius + 8)
  else planScale.value = Math.max(planScale.value - 0.15, 0.4)
}
function resetView() {
  if (viewMode.value === '3d') { yaw = 0.4; pitch = 0.3; cameraRadius = 60 }
  else { planScale.value = 1; planX.value = 0; planY.value = 0 }
}

// ===== 视图模式：3D / 2D =====
const viewMode = ref<'3d' | '2d'>('3d')
const floorPlan = floorPlanImg

// 2D 平面图缩放与拖拽
const planScale = ref(1)
const planX = ref(0)
const planY = ref(0)
const planDragging = ref(false)
const planDragStart = reactive({ x: 0, y: 0, tx: 0, ty: 0 })

function onPlanWheel(e: WheelEvent) {
  e.preventDefault()
  if (e.deltaY < 0) planScale.value = Math.min(planScale.value + 0.15, 3)
  else planScale.value = Math.max(planScale.value - 0.15, 0.4)
}
function onPlanMouseDown(e: MouseEvent) {
  planDragging.value = true
  planDragStart.x = e.clientX
  planDragStart.y = e.clientY
  planDragStart.tx = planX.value
  planDragStart.ty = planY.value
}
function onPlanMouseMove(e: MouseEvent) {
  if (!planDragging.value) return
  planX.value = planDragStart.tx + (e.clientX - planDragStart.x)
  planY.value = planDragStart.ty + (e.clientY - planDragStart.y)
}
function onPlanMouseUp() { planDragging.value = false }

// 切换模式时重置 2D 视图
watch(viewMode, (m) => {
  if (m === '2d') { planScale.value = 1; planX.value = 0; planY.value = 0 }
  else { yaw = 0.4; pitch = 0.3; cameraRadius = 60 }
})

function onMouseDown(e: MouseEvent) {
  isDragging.value = true
  dragStart.x = e.clientX
  dragStart.y = e.clientY
}
function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  yaw -= (e.clientX - dragStart.x) * 0.005
  pitch += (e.clientY - dragStart.y) * 0.005
  pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch))
  dragStart.x = e.clientX
  dragStart.y = e.clientY
}
function onMouseUp() { isDragging.value = false }
function onWheel(e: WheelEvent) {
  e.preventDefault()
  if (e.deltaY > 0) zoomOut()
  else zoomIn()
}

function buildScene() {
  if (!site.value || !modelContainer.value) return
  disposeThree()

  const config = getSiteModel3D(site.value.id)
  const container = modelContainer.value
  const w = container.clientWidth
  const h = container.clientHeight

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0xeef2f7, 1)
  container.appendChild(renderer.domElement)

  scene = new THREE.Scene()
  scene.fog = new THREE.Fog(0xeef2f7, 80, 200)

  camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 500)

  const ambient = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambient)
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(30, 50, 20)
  scene.add(dirLight)

  // 地面
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshLambertMaterial({ color: 0xdfe4ef })
  )
  ground.rotation.x = -Math.PI / 2
  ground.position.y = -0.1
  scene.add(ground)

  // 网格
  const grid = new THREE.GridHelper(100, 40, 0xc0c8d8, 0xdfe4ef)
  scene.add(grid)

  // 建筑主体
  const { floors, width, depth } = config
  const floorHeight = 3
  for (let i = 0; i < floors; i++) {
    const geo = new THREE.BoxGeometry(width, floorHeight, depth)
    const mat = new THREE.MeshLambertMaterial({ color: i % 2 === 0 ? 0xb0c4de : 0xa2b8d0, transparent: true, opacity: 0.85 })
    const floor = new THREE.Mesh(geo, mat)
    floor.position.y = floorHeight / 2 + i * floorHeight
    scene.add(floor)

    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ color: 0x6e4bff, opacity: 0.3, transparent: true })
    )
    edges.position.y = floor.position.y
    scene.add(edges)
  }

  // 塔吊
  const { cranes } = config
  for (let i = 0; i < cranes; i++) {
    const crane = buildCrane()
    crane.position.set((i === 0 ? 1 : -1) * (width / 2 + 6), 0, depth / 2 + 4)
    scene.add(crane)
  }

  // 围栏
  const fenceSize = Math.max(width, depth) + 12
  const corners = [
    [-fenceSize/2, -fenceSize/2], [fenceSize/2, -fenceSize/2],
    [fenceSize/2, fenceSize/2], [-fenceSize/2, fenceSize/2]
  ]
  for (const [x, z] of corners) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 4, 6),
      new THREE.MeshLambertMaterial({ color: 0xff9800 })
    )
    pole.position.set(x, 2, z)
    scene.add(pole)
  }

  animate()
}

function buildCrane(): THREE.Group {
  const group = new THREE.Group()
  const craneHeight = 25
  const metalMat = new THREE.MeshLambertMaterial({ color: 0xff9800 })

  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, craneHeight, 8), metalMat)
  col.position.y = craneHeight / 2
  group.add(col)

  const arm = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 0.4), metalMat)
  arm.position.set(4, craneHeight - 1, 0)
  group.add(arm)

  const counter = new THREE.Mesh(new THREE.BoxGeometry(6, 0.4, 0.4), metalMat)
  counter.position.set(-3, craneHeight - 1, 0)
  group.add(counter)

  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 8, 4), new THREE.MeshLambertMaterial({ color: 0x666666 }))
  rope.position.set(8, craneHeight - 5, 0)
  group.add(rope)

  const hook = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), new THREE.MeshLambertMaterial({ color: 0x444444 }))
  hook.position.set(8, craneHeight - 9, 0)
  group.add(hook)

  return group
}

function updateMarkerPositions() {
  if (!camera || !modelContainer.value) return
  const w = modelContainer.value.clientWidth
  const h = modelContainer.value.clientHeight
  const pos: Record<string, { x: number; y: number; visible: boolean }> = {}

  for (const m of markers.value) {
    const v = new THREE.Vector3(m.x, m.y, m.z)
    v.project(camera)
    const sx = (v.x * 0.5 + 0.5) * w
    const sy = (-v.y * 0.5 + 0.5) * h
    const visible = v.z < 1 && sx >= 0 && sx <= w && sy >= 0 && sy <= h
    pos[m.id] = { x: sx, y: sy, visible }
  }
  markerScreenPos.value = pos
}

function animate() {
  animationId = requestAnimationFrame(animate)
  if (!renderer || !camera || !scene) return
  camera.position.x = cameraRadius * Math.cos(pitch) * Math.sin(yaw)
  camera.position.y = cameraRadius * Math.sin(pitch) + 10
  camera.position.z = cameraRadius * Math.cos(pitch) * Math.cos(yaw)
  camera.lookAt(0, 8, 0)
  renderer.render(scene, camera)
  updateMarkerPositions()
}

function onResize() {
  if (!renderer || !camera || !modelContainer.value) return
  const w = modelContainer.value.clientWidth
  const h = modelContainer.value.clientHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

watch(siteId, () => {
  disposeThree()
  setTimeout(() => buildScene(), 100)
})

onMounted(() => {
  buildScene()
  resizeObserver = new ResizeObserver(onResize)
  if (modelContainer.value) resizeObserver.observe(modelContainer.value)
})

onUnmounted(() => { disposeThree() })

function disposeThree() {
  if (animationId) { cancelAnimationFrame(animationId); animationId = 0 }
  if (resizeObserver) { resizeObserver.disconnect(); resizeObserver = null }
  if (renderer) {
    renderer.dispose()
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    renderer = null
  }
  if (scene) {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose()
        if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
        else obj.material.dispose()
      }
    })
    scene = null
  }
  camera = null
}

// 标记点点击
function onMarkerClick(m: SiteMarker) {
  if (m.type === 'event' && m.event) openEventDetail(m.event)
  else if (m.type === 'camera') openCameraModal(m)
  else if (m.type === 'worker') openWorkerDetail(m)
  else if (m.type === 'device') openDeviceDetail(m)
}
</script>

<template>
  <div v-if="site" class="detail-page">
    <!-- 标题栏 + 基本信息展开（合并为一张卡片） -->
    <div class="title-card">
      <div class="title-bar">
        <div class="title-left">
          <button class="back-btn" @click="goBack">
            <i class="i-ant-design-arrow-left-outlined" />
            <span>返回</span>
          </button>
          <span class="site-name">{{ site.name }}</span>
          <span class="site-score" :class="scoreClass(site.safetyScore || 0)" @click="openScoreReason">
            <i class="i-ant-design-safety-outlined" />
            <span class="site-score__value">{{ site.safetyScore }}</span>
            <span class="site-score__label">分</span>
          </span>
        </div>
        <button class="info-btn" :class="{ 'is-expanded': infoExpanded }" @click="infoExpanded = !infoExpanded">
          <i class="i-ant-design-info-circle-outlined" />
          <span>基本信息</span>
          <i class="i-ant-design-down-outlined info-arrow" />
        </button>
      </div>

      <Transition name="info-slide">
        <div v-if="infoExpanded" class="info-panel">
          <div class="info-panel__divider" />
          <div class="info-panel__body">
            <div class="info-panel__thumb" @click="previewImage = site.thumb">
              <img :src="site.thumb" :alt="site.name" draggable="false" />
              <span class="info-panel__thumb-zoom"><i class="i-ant-design-zoom-in-outlined" /></span>
            </div>
            <div class="info-panel__fields">
              <div class="info-panel__item">
                <span class="info-panel__label">工地名称</span>
                <span class="info-panel__value">{{ site.name }}</span>
              </div>
              <div class="info-panel__item">
                <span class="info-panel__label">地址</span>
                <span class="info-panel__value">{{ site.address }}</span>
              </div>
              <div class="info-panel__item">
                <span class="info-panel__label">说明</span>
                <span class="info-panel__value">{{ site.desc }}</span>
              </div>
              <div class="info-panel__item">
                <span class="info-panel__label">面积</span>
                <span class="info-panel__value">{{ formatArea(site.area) }}</span>
              </div>
              <div class="info-panel__item">
                <span class="info-panel__label">类型</span>
                <span class="info-panel__value" :style="{ color: sizeTypeMeta[site.sizeType].color }">
                  {{ sizeTypeMeta[site.sizeType].label }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 五栏主体 -->
    <div class="main-grid">
      <!-- ===== 左栏：事件列表 ===== -->
      <div class="left-col">
        <div class="col-card">
          <div class="col-card__head"><strong>事件列表</strong></div>
          <div class="event-tabs-wrap">
            <button class="tab-arrow tab-arrow--left" @click="scrollTabs('left')"><i class="i-ant-design-left-outlined" /></button>
            <div ref="eventTabsRef" class="event-tabs">
              <div v-for="t in eventTypes" :key="t"
                class="event-tab" :class="{ 'is-active': eventListTab === t }"
                :style="eventListTab === t ? { color: eventMeta[t].color, borderBottomColor: eventMeta[t].color } : {}"
                @click="eventListTab = t"
              >
                <i :class="eventMeta[t].icon" />
                <span>{{ eventMeta[t].label }}</span>
                <span class="event-tab__count" :style="{ background: eventMeta[t].color + '1a', color: eventMeta[t].color }">{{ tabEventCount(t) }}</span>
              </div>
            </div>
            <button class="tab-arrow tab-arrow--right" @click="scrollTabs('right')"><i class="i-ant-design-right-outlined" /></button>
          </div>
          <div class="event-list scroll-thin">
            <template v-if="eventListEvents.length">
              <div v-for="ev in eventListEvents" :key="ev.id" class="event-item" @click="openEventDetail(ev)">
                <div class="event-item__thumb"><img :src="ev.thumb" :alt="ev.title" draggable="false" /></div>
                <div class="event-item__body">
                  <span class="event-item__title">{{ ev.title }}</span>
                  <span class="event-item__location"><i class="i-ant-design-environment-outlined" /> {{ ev.location }}</span>
                  <span class="event-item__time"><i class="i-ant-design-clock-circle-outlined" /> {{ ev.time }}</span>
                </div>
                <i class="i-ant-design-right-outlined event-item__arrow" />
              </div>
            </template>
            <div v-else class="event-empty">
              <i class="i-ant-design-check-circle-outlined" />
              <span>暂无{{ eventMeta[eventListTab].label }}事件</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 中栏：3D 模型 + 事件趋势 ===== -->
      <div class="center-col">
        <!-- 模型区域（满铺，无白卡） -->
        <div class="model-area">
          <!-- 3D 模式 -->
          <div
            v-show="viewMode === '3d'"
            ref="modelContainer"
            class="model-canvas"
            @mousedown="onMouseDown"
            @mousemove="onMouseMove"
            @mouseup="onMouseUp"
            @mouseleave="onMouseUp"
            @wheel="onWheel"
          />

          <!-- 2D 平面图模式 -->
          <div
            v-show="viewMode === '2d'"
            class="plan-canvas"
            :class="{ dragging: planDragging }"
            @mousedown="onPlanMouseDown"
            @mousemove="onPlanMouseMove"
            @mouseup="onPlanMouseUp"
            @mouseleave="onPlanMouseUp"
            @wheel="onPlanWheel"
          >
            <img
              :src="floorPlan"
              class="plan-img"
              draggable="false"
              :style="{ transform: `translate(${planX}px, ${planY}px) scale(${planScale})` }"
            />
          </div>

          <!-- 标记点叠层 -->
          <div ref="markersOverlay" class="markers-overlay">
            <template v-for="m in markers" :key="m.id">
              <!-- 3D 模式标记 -->
              <div
                v-if="viewMode === '3d'"
                v-show="isMarkerVisible(m) && markerScreenPos[m.id]?.visible"
                class="marker"
                :class="'marker--' + m.type"
                :style="{ left: markerScreenPos[m.id]?.x + 'px', top: markerScreenPos[m.id]?.y + 'px' }"
                @click.stop="onMarkerClick(m)"
              >
                <a-tooltip :mouse-enter-delay="0.2">
                  <template #title>
                    <span>{{ m.name }}</span>
                  </template>
                  <div class="marker-pin">
                    <i :class="markerMeta[m.type].icon" />
                    <span v-if="m.type === 'event'" class="marker-pulse" />
                  </div>
                </a-tooltip>
              </div>
              <!-- 2D 模式标记 -->
              <div
                v-else
                v-show="isMarkerVisible(m)"
                class="marker marker--plan"
                :class="'marker--' + m.type"
                :style="{
                  left: `calc(${m.planX}% * ${planScale} + ${planX}px)`,
                  top: `calc(${m.planY}% * ${planScale} + ${planY}px)`
                }"
                @click.stop="onMarkerClick(m)"
              >
                <a-tooltip :mouse-enter-delay="0.2">
                  <template #title>
                    <span>{{ m.name }}</span>
                  </template>
                  <div class="marker-pin">
                    <i :class="markerMeta[m.type].icon" />
                    <span v-if="m.type === 'event'" class="marker-pulse" />
                  </div>
                </a-tooltip>
              </div>
            </template>
          </div>

          <!-- 左上：3D/2D 切换 -->
          <div class="view-toggle-group">
            <button class="card-btn view-btn" :class="{ 'is-active': viewMode === '3d' }" @click="viewMode = '3d'">
              <i class="i-ant-design-block-outlined card-btn-icon" />
              <span>3D</span>
            </button>
            <button class="card-btn view-btn" :class="{ 'is-active': viewMode === '2d' }" @click="viewMode = '2d'">
              <i class="i-ant-design-picture-outlined card-btn-icon" />
              <span>2D</span>
            </button>
          </div>

          <!-- 右上：图例选择 -->
          <div class="layer-switches">
            <button v-for="lk in layerKeys" :key="lk.key"
              class="layer-chip" @click="layerVisible[lk.key] = !layerVisible[lk.key]"
            >
              <span class="layer-icon-wrap" :style="{ color: lk.color, background: lk.color + '1a' }">
                <i :class="lk.icon" />
              </span>
              <span class="layer-label">{{ lk.label }}</span>
              <span class="layer-checkbox" :class="{ checked: layerVisible[lk.key] }">
                <i v-if="layerVisible[lk.key]" class="i-ant-design-check-outlined" />
              </span>
            </button>
          </div>

          <!-- 左下：缩放控件 -->
          <div class="map-control-stack">
            <button class="map-control-button" title="重置" @click="resetView"><i class="i-ant-design-aim-outlined" /></button>
            <button class="map-control-button" title="放大" @click="zoomIn"><i class="i-ant-design-plus-outlined" /></button>
            <button class="map-control-button" title="缩小" @click="zoomOut"><i class="i-ant-design-minus-outlined" /></button>
          </div>

          <!-- 底部：时间轴 -->
          <div class="model-timeline">
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
                <input v-model="currentDate" class="date-input" />
              </div>
            </div>
            <div class="timeline-row timeline-row--track">
              <div class="timeline-track">
                <div class="timeline-hours">
                  <span v-for="h in timelineHours" :key="h" class="hour-tick">{{ h }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 事件趋势 -->
        <div class="col-card trend-card">
          <div class="col-card__head"><strong>事件趋势</strong></div>
          <div class="event-tabs">
            <div v-for="t in eventTypes" :key="t"
              class="event-tab" :class="{ 'is-active': trendTab === t }"
              :style="trendTab === t ? { color: eventMeta[t].color, borderBottomColor: eventMeta[t].color } : {}"
              @click="trendTab = t"
            >
              <i :class="eventMeta[t].icon" />
              <span>{{ eventMeta[t].label }}</span>
            </div>
          </div>
          <div class="trend-chart">
            <ECharts :option="trendOption" height="140px" />
          </div>
        </div>
      </div>

      <!-- ===== 右栏：设备统计 + 活跃人员 ===== -->
      <div class="right-col">
        <!-- 设备统计 -->
        <div class="col-card">
          <div class="col-card__head"><strong>设备统计</strong></div>
          <div class="device-groups">
            <div v-for="g in deviceGroups" :key="g.label" class="device-group">
              <div class="device-group__head">
                <span class="device-group__icon" :style="{ background: g.color + '1a', color: g.color }">
                  <i :class="g.icon" />
                </span>
                <span class="device-group__label">{{ g.label }}</span>
              </div>
              <div class="device-group__stats">
                <div v-for="s in g.stats" :key="s.label" class="device-stat">
                  <span class="device-stat__value" :style="{ color: s.color }">{{ s.value }}</span>
                  <span class="device-stat__label">{{ s.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 活跃人员 -->
        <div class="col-card col-card--flex">
          <div class="col-card__head">
            <strong>活跃人员</strong>
            <span class="col-card__hint">{{ workers.length }} 人在场</span>
          </div>
          <div class="worker-list scroll-thin">
            <article v-for="w in workers" :key="w.id" class="worker-card">
              <div class="worker-avatar"><img :src="w.avatar" :alt="w.name" draggable="false" /></div>
              <div class="worker-info">
                <span class="worker-name">{{ w.name }}</span>
                <span class="worker-role">{{ w.role }}</span>
              </div>
              <div class="worker-meta">
                <span class="worker-time"><i class="i-ant-design-clock-circle-outlined" /> {{ w.enterTime.split(' ')[1] }}</span>
                <span class="worker-status">{{ w.status }}</span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>

    <!-- 事件详情弹窗 -->
    <Transition name="detail-popup">
      <div v-if="detailEvent" class="detail-overlay" @click="closeEventDetail">
        <div class="detail-card" @click.stop>
          <button class="detail-close" @click="closeEventDetail"><i class="i-ant-design-close-outlined" /></button>
          <div class="detail-thumb">
            <img :src="detailEvent.thumb" :alt="detailEvent.title" draggable="false" />
            <span class="detail-type-tag" :style="{ background: eventMeta[detailEvent.type].color }">
              <i :class="eventMeta[detailEvent.type].icon" /> {{ eventMeta[detailEvent.type].label }}
            </span>
          </div>
          <div class="detail-body">
            <h3 class="detail-title">{{ detailEvent.title }}</h3>
            <div class="detail-row"><i class="i-ant-design-environment-outlined detail-row__icon" /><span>{{ detailEvent.location }}</span></div>
            <div class="detail-row"><i class="i-ant-design-clock-circle-outlined detail-row__icon" /><span>{{ detailEvent.time }}</span></div>
            <div class="detail-row detail-row--desc"><i class="i-ant-design-file-text-outlined detail-row__icon" /><span>{{ detailEvent.desc }}</span></div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 人员详情弹窗 -->
    <Transition name="detail-popup">
      <div v-if="detailWorker" class="detail-overlay" @click="closeWorkerDetail">
        <div class="detail-card detail-card--worker" @click.stop>
          <button class="detail-close" @click="closeWorkerDetail"><i class="i-ant-design-close-outlined" /></button>
          <div class="detail-thumb">
            <img v-if="detailWorker.worker" :src="detailWorker.worker.avatar" alt="人员" draggable="false" />
            <span class="detail-type-tag" style="background: #2bb3a3"><i class="i-ant-design-team-outlined" /> 人员</span>
          </div>
          <div class="detail-body">
            <h3 class="detail-title">{{ detailWorker.worker?.name }}</h3>
            <div class="detail-row"><i class="i-ant-design-tool-outlined detail-row__icon" /><span>岗位：{{ detailWorker.worker?.role }}</span></div>
            <div class="detail-row"><i class="i-ant-design-clock-circle-outlined detail-row__icon" /><span>进场时间：{{ detailWorker.worker?.enterTime }}</span></div>
            <div class="detail-row"><i class="i-ant-design-safety-outlined detail-row__icon" /><span>状态：{{ detailWorker.worker?.status }}</span></div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 设备详情占位 -->
    <Transition name="detail-popup">
      <div v-if="detailDevice" class="detail-overlay" @click="closeDeviceDetail">
        <div class="detail-card detail-card--worker" @click.stop>
          <button class="detail-close" @click="closeDeviceDetail"><i class="i-ant-design-close-outlined" /></button>
          <div class="detail-body" style="padding: 30px 40px; text-align: center;">
            <i class="i-ant-design-api-outlined" style="font-size: 48px; color: #6e4bff; opacity: 0.5; margin-bottom: 12px;" />
            <h3 class="detail-title">{{ detailDevice.name }}</h3>
            <p style="color: #8895ab; font-size: 13px;">设备详情功能待实现</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 安全评分原因弹窗 -->
    <Transition name="detail-popup">
      <div v-if="scoreReasonVisible && scoreReason" class="detail-overlay" @click="closeScoreReason">
        <div class="score-reason-card" @click.stop>
          <button class="detail-close" @click="closeScoreReason"><i class="i-ant-design-close-outlined" /></button>
          <div class="score-reason__head" :class="scoreClass(site?.safetyScore || 0)">
            <div class="score-reason__score">
              <span class="score-reason__value">{{ site?.safetyScore }}</span>
              <span class="score-reason__unit">分</span>
            </div>
            <div class="score-reason__meta">
              <span class="score-reason__level">{{ scoreReason.level }}</span>
              <span class="score-reason__title">安全评分</span>
            </div>
          </div>
          <div class="score-reason__body">
            <p class="score-reason__summary">{{ scoreReason.summary }}</p>

            <template v-if="scoreReason.deductions.length">
              <div class="score-reason__section-title">扣分明细</div>
              <div class="score-reason__table">
                <div v-for="d in scoreReason.deductions" :key="d.label" class="score-reason__row">
                  <span class="score-reason__row-label">{{ d.label }}</span>
                  <span class="score-reason__row-count">{{ d.count }} 项</span>
                  <span class="score-reason__row-per">每项扣 {{ d.perScore }} 分</span>
                  <span class="score-reason__row-deduct">-{{ d.totalDeduct }} 分</span>
                </div>
              </div>
            </template>

            <div class="score-reason__section-title">改进建议</div>
            <ul class="score-reason__suggestions">
              <li v-for="(s, i) in scoreReason.suggestions" :key="i">{{ s }}</li>
            </ul>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 图片大图预览 -->
    <Transition name="detail-popup">
      <div v-if="previewImage" class="image-preview-overlay" @click="previewImage = null">
        <img :src="previewImage" class="image-preview-img" draggable="false" />
      </div>
    </Transition>

    <!-- 摄像头视频弹窗 -->
    <VideoPlayerModal v-model:open="videoModalOpen" :target="videoTarget" />
  </div>

  <div v-else class="not-found">
    <p>未找到该工地信息</p>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.detail-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-page;
  overflow: hidden;
}

/* 五栏主体留白 */

/* ===== 标题栏 + 基本信息（直角拉通，仿 SubTabLayout） ===== */
.title-card {
  background: #fff;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.title-bar {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
}

.title-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 10px;
  border: none;
  background: transparent;
  color: $color-primary;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  border-radius: 6px;
  transition: background 0.15s;
  i { font-size: 14px; }
  &:hover { background: $color-primary-bg; }
}

.site-name {
  font-size: 16px;
  font-weight: 600;
  color: $text-base;
}

.site-score {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 10px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;

  i { font-size: 14px; }

  &__value { font-size: 18px; font-weight: 800; line-height: 1; }
  &__label { font-size: 11px; opacity: 0.8; }

  &:hover { opacity: 0.85; transform: scale(1.02); }

  &.score-high { color: #52c41a; background: rgba(82, 196, 26, 0.1); }
  &.score-mid  { color: #faad14; background: rgba(250, 173, 20, 0.1); }
  &.score-low  { color: #ff4d4f; background: rgba(255, 77, 79, 0.1); }
}

.info-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  background: #fff;
  color: $text-secondary;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  i { font-size: 14px; }
  .info-arrow { font-size: 10px; transition: transform 0.2s; }

  &:hover { border-color: $color-primary; color: $color-primary; }
  &.is-expanded {
    border-color: $color-primary;
    color: $color-primary;
    .info-arrow { transform: rotate(180deg); }
  }
}

/* 基本信息展开面板（在标题卡片内部） */
.info-panel {
  flex-shrink: 0;
}

.info-panel__divider {
  height: 1px;
  background: $border-color-card;
  margin: 0 16px;
}

.info-panel__body {
  display: flex;
  gap: 16px;
  padding: 14px 20px;
}

.info-panel__thumb {
  width: 120px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  background: #1a1a2e;
  flex-shrink: 0;
  position: relative;
  cursor: pointer;

  img { width: 100%; height: 100%; object-fit: cover; }

  .info-panel__thumb-zoom {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
    opacity: 0;
    transition: opacity 0.15s;

    i { font-size: 22px; color: #fff; }
  }

  &:hover .info-panel__thumb-zoom { opacity: 1; }
}

.info-panel__fields {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 16px 24px;
  align-content: center;
}

.info-panel__item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.info-panel__label {
  font-size: 11px;
  color: $text-muted;
  white-space: nowrap;
}

.info-panel__value {
  font-size: 13px;
  font-weight: 500;
  color: $text-base;
}

.info-slide-enter-active, .info-slide-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.info-slide-enter-from, .info-slide-leave-to {
  opacity: 0;
  max-height: 0;
}
.info-slide-enter-to, .info-slide-leave-from {
  opacity: 1;
  max-height: 200px;
}

/* ===== 五栏主体 ===== */
.main-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 3fr 1fr;
  gap: 8px;
  overflow: hidden;
  min-height: 0;
  padding: 8px;
}

.left-col, .center-col, .right-col {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow: hidden;
}

.center-col { gap: 8px; }
.right-col { overflow-y: auto; }

/* 通用卡片 */
.col-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 0;

  &--flex { flex: 1; }
}

.col-card__head {
  padding: 12px 14px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;

  strong { font-size: 14px; font-weight: 600; color: $text-base; }
  .col-card__hint { font-size: 11px; color: $text-muted; }
}

/* 事件标签页（带左右箭头） */
.event-tabs-wrap {
  display: flex;
  align-items: center;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.tab-arrow {
  width: 24px;
  height: 100%;
  min-width: 24px;
  border: none;
  background: transparent;
  color: $text-muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  &:hover { color: $color-primary; }
  i { font-size: 12px; }
}

.event-tabs {
  display: flex;
  overflow-x: auto;
  scrollbar-width: none;
  flex: 1;
  &::-webkit-scrollbar { display: none; }
}

.event-tab {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 500;
  color: $text-secondary;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.15s;
  white-space: nowrap;

  i { font-size: 12px; flex-shrink: 0; }

  &__count {
    font-size: 10px;
    font-weight: 600;
    padding: 0 5px;
    border-radius: 8px;
    line-height: 16px;
    min-width: 16px;
    text-align: center;
    flex-shrink: 0;
  }

  &:hover { color: $text-base; }
}

/* 事件列表 */
.event-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid $border-color-card;
  transition: all 0.15s;

  &:hover { border-color: $color-primary; background: $color-primary-bg; }

  &__thumb {
    width: 44px;
    height: 32px;
    border-radius: 6px;
    overflow: hidden;
    background: #1a1a2e;
    flex-shrink: 0;
    img { width: 100%; height: 100%; object-fit: cover; }
  }

  &__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  &__title { font-size: 12px; font-weight: 500; color: $text-base; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__location, &__time { display: flex; align-items: center; gap: 3px; font-size: 10px; color: $text-muted; i { font-size: 10px; } }
  &__arrow { font-size: 12px; color: $text-muted; flex-shrink: 0; }
}

.event-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 30px 0;
  color: $color-online;
  i { font-size: 24px; }
  span { font-size: 12px; }
}

/* ===== 3D 模型区域 ===== */
.model-area {
  flex: 1;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  overflow: hidden;
  position: relative;
  background: #eef2f7;
  min-height: 0;
}

.model-canvas {
  width: 100%;
  height: 100%;
  cursor: grab;
  &:active { cursor: grabbing; }
  canvas { display: block; }
}

/* 2D 平面图 */
.plan-canvas {
  width: 100%;
  height: 100%;
  cursor: grab;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #eef2f7;

  &.dragging { cursor: grabbing; }
}

.plan-img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  transition: transform 0.05s linear;
}

/* 标记点叠层 */
.markers-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.marker {
  position: absolute;
  transform: translate(-50%, -50%);
  z-index: 5;
  pointer-events: auto;
  cursor: pointer;
  transition: transform 0.15s;

  &:hover { z-index: 10; }
  &:hover .marker-pin { transform: scale(1.2); }
}

.marker-pin {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: #fff;
  transition: transform 0.15s;

  i { font-size: 14px; z-index: 2; }
}

.marker--camera .marker-pin {
  box-shadow: 0 0 0 2px #1890ff, 0 2px 6px rgba(0,0,0,0.15);
  i { color: #1890ff; }
}
.marker--device .marker-pin {
  box-shadow: 0 0 0 2px #6e4bff, 0 2px 6px rgba(0,0,0,0.15);
  i { color: #6e4bff; }
}
.marker--event .marker-pin {
  box-shadow: 0 0 0 2px #ff4d4f, 0 2px 6px rgba(0,0,0,0.15);
  i { color: #ff4d4f; }
}
.marker--worker .marker-pin {
  box-shadow: 0 0 0 2px #2bb3a3, 0 2px 6px rgba(0,0,0,0.15);
  i { color: #2bb3a3; }
}

.marker-pulse {
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: rgba(255, 77, 79, 0.3);
  animation: marker-pulse-anim 1.8s ease-out infinite;
}

@keyframes marker-pulse-anim {
  0% { transform: scale(1); opacity: 0.6; }
  70% { transform: scale(2); opacity: 0; }
  100% { transform: scale(2); opacity: 0; }
}

/* 浮动控制按钮（仿 SituationView） */
.card-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 10px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid $border-color-card;
  border-radius: 10px;
  box-shadow: 0 1px 2px 0 rgba(20, 22, 30, 0.04);
  font-size: 13px;
  color: $text-base;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  .card-btn-icon { font-size: 14px; color: $text-secondary; }
}

/* 3D/2D 切换按钮组（连体 toggle） */
.view-toggle-group {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 10;
  display: flex;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid $border-color-card;
  border-radius: 8px;
  box-shadow: 0 1px 2px 0 rgba(20, 22, 30, 0.04);
  overflow: hidden;
}

.view-btn {
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
  padding: 0 12px;

  &:hover { background: $bg-hover; }

  &.is-active {
    background: $color-primary;
    color: #fff;
    .card-btn-icon { color: #fff; }
  }
}

/* 图例选择 */
.layer-switches {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  background: #fff;
  border: 1px solid #eceef2;
  border-radius: 8px;
  box-shadow: 0 2px 10px 0 rgba(0, 0, 0, 0.1);
}

.layer-chip {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 26px;
  padding: 0 6px;
  border: none;
  background: transparent;
  color: $text-secondary;
  font-size: 12px;
  cursor: pointer;
  border-radius: 6px;
  &:hover { background: $bg-hover; }

  .layer-icon-wrap {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    i { font-size: 11px; }
  }

  .layer-label { font-size: 12px; color: $text-base; }

  .layer-checkbox {
    width: 13px;
    height: 13px;
    border: 1px solid $border-color-light;
    border-radius: 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    i { font-size: 10px; color: #fff; }
    &.checked { background: $color-primary; border-color: $color-primary; }
  }
}

/* 缩放控件 */
.map-control-stack {
  position: absolute;
  bottom: 100px;
  left: 12px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.map-control-button {
  width: 34px;
  height: 32px;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 1px 2px 0 rgba(20, 22, 30, 0.04);
  color: $text-secondary;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { color: $color-primary; border-color: $color-primary; }
}

/* 底部时间轴 */
.model-timeline {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: #fff;
  border-top: 1px solid $border-color-card;
  padding: 8px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.timeline-row { display: flex; align-items: center; }
.timeline-row--controls { justify-content: flex-start; gap: 12px; }

.timeline-controls { display: flex; align-items: center; gap: 8px; }

.timeline-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  color: $text-base;
  font-size: 12px;
  cursor: pointer;
  &:hover { border-color: $color-primary; color: $color-primary; }
  .i-ant-design-down-outlined { font-size: 9px; color: $text-muted; }
}

.timeline-date {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  .date-input { border: none; outline: none; background: transparent; width: 50px; font-size: 12px; color: $text-base; font-family: inherit; }
  i { font-size: 13px; color: $text-muted; }
}

.timeline-row--track { width: 100%; }

.timeline-track {
  flex: 1;
  height: 28px;
  display: flex;
  align-items: center;
  border-top: 2px solid $border-color-light;
  padding-top: 6px;
}

.timeline-hours {
  display: flex;
  justify-content: space-between;
  width: 100%;
  .hour-tick { font-size: 12px; color: $text-base; }
}

/* 趋势卡片 */
.trend-card { flex-shrink: 0; }

.trend-chart {
  padding: 4px 12px 8px;
}

/* ===== 右栏：设备统计 ===== */
.device-groups {
  padding: 0 14px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.device-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__head { display: flex; align-items: center; gap: 8px; }
  &__icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    i { font-size: 14px; }
  }
  &__label { font-size: 13px; font-weight: 600; color: $text-base; }

  &__stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
  }
}

.device-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: center;
  padding: 6px 2px;
  background: $bg-page;
  border-radius: 6px;

  &__value { font-size: 16px; font-weight: 700; line-height: 1.1; }
  &__label { font-size: 10px; color: $text-muted; }
}

/* ===== 右栏：活跃人员 ===== */
.worker-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.worker-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  transition: all 0.15s;

  &:hover { border-color: $color-primary; box-shadow: $shadow-card-active; }
}

.worker-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: #1a1a2e;
  flex-shrink: 0;
  img { width: 100%; height: 100%; object-fit: cover; }
}

.worker-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  .worker-name { font-size: 13px; font-weight: 600; color: $text-base; }
  .worker-role { font-size: 11px; color: $color-primary; }
}

.worker-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  .worker-time { display: flex; align-items: center; gap: 3px; font-size: 11px; color: $text-muted; i { font-size: 11px; } }
  .worker-status { font-size: 10px; font-weight: 500; color: $color-online; background: $color-online-bg; padding: 1px 6px; border-radius: 4px; }
}

/* ===== 弹窗 ===== */
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-card {
  width: 420px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  position: relative;

  &--worker { width: 380px; }
}

.detail-close {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-muted;
  font-size: 14px;
  z-index: 5;
  transition: all 0.15s;
  &:hover { background: $bg-hover; color: $text-base; }
}

.detail-thumb {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #1a1a2e;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
}

.detail-type-tag {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  padding: 3px 10px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
  i { font-size: 13px; }
}

.detail-body {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-title { font-size: 17px; font-weight: 600; color: $text-base; margin: 0; }

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.6;
  &--desc { color: $text-tertiary; }
  &__icon { font-size: 14px; color: $text-muted; flex-shrink: 0; margin-top: 2px; }
}

.detail-popup-enter-active, .detail-popup-leave-active { transition: opacity 0.2s; }
.detail-popup-enter-from, .detail-popup-leave-to { opacity: 0; }

/* 安全评分原因弹窗 */
.score-reason-card {
  width: 440px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  position: relative;
}

.score-reason__head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;

  &.score-high { background: linear-gradient(135deg, rgba(82,196,26,0.12), rgba(82,196,26,0.04)); }
  &.score-mid  { background: linear-gradient(135deg, rgba(250,173,20,0.12), rgba(250,173,20,0.04)); }
  &.score-low  { background: linear-gradient(135deg, rgba(255,77,79,0.12), rgba(255,77,79,0.04)); }
}

.score-reason__score {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.score-reason__value {
  font-size: 42px;
  font-weight: 800;
  line-height: 1;

  .score-high & { color: #52c41a; }
  .score-mid &  { color: #faad14; }
  .score-low &  { color: #ff4d4f; }
}

.score-reason__unit {
  font-size: 14px;
  color: $text-muted;
}

.score-reason__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.score-reason__level {
  font-size: 16px;
  font-weight: 600;

  .score-high & { color: #52c41a; }
  .score-mid &  { color: #faad14; }
  .score-low &  { color: #ff4d4f; }
}

.score-reason__title {
  font-size: 12px;
  color: $text-muted;
}

.score-reason__body {
  padding: 16px 24px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.score-reason__summary {
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.6;
  margin: 0;
}

.score-reason__section-title {
  font-size: 13px;
  font-weight: 600;
  color: $text-base;
}

.score-reason__table {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.score-reason__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: $bg-page;
  border-radius: 8px;
  font-size: 12px;

  &-label { flex: 1; color: $text-base; font-weight: 500; }
  &-count { color: $text-secondary; }
  &-per { color: $text-muted; }
  &-deduct { font-weight: 600; color: #ff4d4f; min-width: 50px; text-align: right; }
}

.score-reason__suggestions {
  margin: 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  li {
    font-size: 12px;
    color: $text-secondary;
    line-height: 1.6;
  }
}

/* 图片大图预览 */
.image-preview-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
}

.image-preview-img {
  max-width: 90vw;
  max-height: 90vh;
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.not-found {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-muted;
  font-size: 14px;
}
</style>
