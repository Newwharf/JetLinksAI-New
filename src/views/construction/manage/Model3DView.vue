<script setup lang="ts">
/**
 * 工地 3D 图（Model3DView）
 * 1. 上传文件（不限格式，模拟），自动生成程序化 3D 施工场景
 *    复用 ConstructionDetailView 的 buildScene 逻辑（建筑+塔吊+围栏）
 * 2. 鼠标拖拽旋转 / 滚轮缩放
 * 3. 设备标记：右侧抽屉选设备 → 点击 3D 场景放置 → HTML overlay 投影显示
 */
import * as THREE from 'three'
import type { TreeNode } from './SiteManageView.vue'
import { getSiteModel3D, getSiteMarkers, markerMeta, type MarkerType } from '../posture.mock'
import VideoPlayerModal from '@/components/VideoPlayerModal.vue'

// ===== 3D 标记数据模型 =====
export interface Model3DMarker {
  id: string
  deviceId: string
  deviceName: string
  deviceType: 'video' | 'iot'
  status: 'online' | 'offline'
  icon: string
  x: number
  y: number
  z: number
}

// ===== Props =====
interface BoundDevice {
  id: string
  name: string
  type: 'video' | 'iot'
  status: 'online' | 'offline'
  icon: string
  thumb?: string
  gateway?: string
}
const props = defineProps<{
  node: TreeNode
  devices: BoundDevice[]
}>()

// ===== 阶段：'empty'(未上传) | 'loading'(加载中) | 'ready'(就绪) =====
const stage = ref<'empty' | 'loading' | 'ready'>('empty')

// ===== Three.js 引用 =====
const containerRef = ref<HTMLDivElement | null>(null)
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let animationId = 0
let resizeObserver: ResizeObserver | null = null

// 鼠标轨道控制
const isDragging = ref(false)
let dragStart = { x: 0, y: 0 }
let yaw = 0.4
let pitch = 0.3
let cameraRadius = 60

// ===== 标记点 =====
const markerScreenPos = ref<Record<string, { x: number; y: number; visible: boolean }>>({})

// 草稿 markers（抽屉打开时编辑，关闭时显示 node 数据）
const draftMarkers = ref<Model3DMarker[]>([])
const drawerOpen = ref(false)

// ===== HTML5 拖拽：从抽屉拖到 3D 画布 =====
const dragGhostVisible = ref(false)
const dragGhost = reactive({ x: 0, y: 0, name: '', icon: '', type: '' as 'video' | 'iot' })

// ===== 视频播放弹窗 =====
const playModalVisible = ref(false)
const playTarget = ref<{ name: string; thumb?: string; status: 'online' | 'offline' } | null>(null)

function chooseVideoCam(cam: VideoCamItem) {
  playTarget.value = { name: cam.name, thumb: cam.thumb, status: cam.status }
  playModalVisible.value = true
}

const displayMarkers = computed(() => drawerOpen.value ? draftMarkers.value : (props.node.model3DMarkers || []))
const markedDeviceIds = computed(() => new Set(displayMarkers.value.map(m => m.deviceId)))

// 场景内置标记点（模拟工地已有的摄像头/设备位置标记）
const sceneMarkers = computed(() => {
  // 使用 node.id 作为 siteId 查 mock 标记；如果没有则返回空
  return getSiteMarkers(props.node.id)
})

// 合并：场景内置标记 + 用户自定义设备标记
const allDisplayMarkers = computed(() => {
  const userMarkers = displayMarkers.value.map(m => ({
    id: m.id,
    type: m.deviceType === 'video' ? 'camera' : 'device' as MarkerType,
    name: m.deviceName,
    x: m.x,
    y: m.y,
    z: m.z,
    isUserMarker: true
  }))
  const builtIn = sceneMarkers.value.map(m => ({
    id: m.id,
    type: m.type,
    name: m.name,
    x: m.x,
    y: m.y,
    z: m.z,
    isUserMarker: false
  }))
  return [...builtIn, ...userMarkers]
})

// ===== 上传文件（不限格式）=====
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

function triggerUpload() {
  fileInputRef.value?.click()
}
function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) loadModel(file)
  target.value = ''
}
function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) loadModel(file)
}
function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}
function handleDragLeave() {
  isDragOver.value = false
}

function loadModel(file: File) {
  props.node.model3DFile = file.name
  stage.value = 'loading'

  // 模拟加载过程，然后构建程序化 3D 场景
  setTimeout(() => {
    stage.value = 'ready'
    nextTick(() => buildScene())
  }, 1500)
}

// ===== 构建 3D 场景（复用 ConstructionDetailView 的逻辑）=====
function buildScene() {
  if (!containerRef.value) return
  disposeThree()

  const config = getSiteModel3D(props.node.id)
  const container = containerRef.value
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
  ground.name = '__ground'
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
    [-fenceSize / 2, -fenceSize / 2], [fenceSize / 2, -fenceSize / 2],
    [fenceSize / 2, fenceSize / 2], [-fenceSize / 2, fenceSize / 2]
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
  if (!camera || !containerRef.value) return
  const w = containerRef.value.clientWidth
  const h = containerRef.value.clientHeight
  const pos: Record<string, { x: number; y: number; visible: boolean }> = {}

  for (const m of allDisplayMarkers.value) {
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

onMounted(() => {
  if (props.node.model3DFile) {
    stage.value = 'ready'
    nextTick(() => buildScene())
  } else {
    stage.value = 'empty'
  }
  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !camera || !containerRef.value) return
    const w = containerRef.value.clientWidth
    const h = containerRef.value.clientHeight
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  })
  if (containerRef.value) resizeObserver.observe(containerRef.value)
})

onBeforeUnmount(() => {
  disposeThree()
})

// 切换工地时重建场景
watch(() => props.node.id, () => {
  if (stage.value === 'ready') {
    disposeThree()
    if (props.node.model3DFile) {
      nextTick(() => buildScene())
    } else {
      stage.value = 'empty'
    }
  }
})

// ===== 鼠标控制 =====
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
  if (e.deltaY > 0) cameraRadius = Math.min(120, cameraRadius + 8)
  else cameraRadius = Math.max(25, cameraRadius - 8)
}

// 工具栏缩放
function zoomIn() { cameraRadius = Math.max(25, cameraRadius - 8) }
function zoomOut() { cameraRadius = Math.min(120, cameraRadius + 8) }
function resetView() { yaw = 0.4; pitch = 0.3; cameraRadius = 60 }

// 更换模型
function changeModel() { triggerUpload() }

// ===== HTML5 拖拽：从抽屉拖到 3D 画布 =====
function onDeviceDragStart(e: DragEvent, d: BoundDevice) {
  if (markedDeviceIds.value.has(d.id)) {
    e.preventDefault()
    return
  }
  if (!e.dataTransfer) return
  e.dataTransfer.setData('text/plain', d.id)
  e.dataTransfer.effectAllowed = 'copy'
  // 隐藏默认拖拽快照
  const empty = document.createElement('div')
  empty.style.width = '1px'
  empty.style.height = '1px'
  document.body.appendChild(empty)
  e.dataTransfer.setDragImage(empty, 0, 0)
  setTimeout(() => document.body.removeChild(empty), 0)

  dragGhost.name = d.name
  dragGhost.icon = d.icon
  dragGhost.type = d.type
  dragGhostVisible.value = true
}

function onDeviceDragEnd() {
  dragGhostVisible.value = false
}

// 画布允许 drop
function onCanvasDragOver(e: DragEvent) {
  if (dragGhostVisible.value) {
    e.preventDefault()
    e.dataTransfer!.dropEffect = 'copy'
    dragGhost.x = e.clientX
    dragGhost.y = e.clientY
  }
}

// 画布 drop：raycaster 检测 3D 位置
const raycaster = new THREE.Raycaster()
const mouseVec = new THREE.Vector2()

function onCanvasDrop(e: DragEvent) {
  e.preventDefault()
  dragGhostVisible.value = false
  if (!containerRef.value || !camera || !scene) return

  const deviceId = e.dataTransfer?.getData('text/plain')
  if (!deviceId) return
  if (markedDeviceIds.value.has(deviceId)) return

  const device = props.devices.find(d => d.id === deviceId)
  if (!device) return

  const rect = containerRef.value.getBoundingClientRect()
  mouseVec.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouseVec.y = -((e.clientY - rect.top) / rect.height) * 2 + 1

  raycaster.setFromCamera(mouseVec, camera)
  const intersects = raycaster.intersectObjects(scene.children, true)
  if (intersects.length > 0) {
    const point = intersects[0].point
    const marker: Model3DMarker = {
      id: `${device.id}-${Date.now()}`,
      deviceId: device.id,
      deviceName: device.name,
      deviceType: device.type,
      status: device.status,
      icon: device.icon,
      x: +point.x.toFixed(2),
      y: +point.y.toFixed(2) + 1,
      z: +point.z.toFixed(2)
    }
    draftMarkers.value.push(marker)
  }
}

// ===== 抽屉 =====
const addSearchKey = ref('')
const drawerCat = ref<'video' | 'iot'>('video')

function toggleDrawer() {
  drawerOpen.value = !drawerOpen.value
  if (drawerOpen.value) {
    draftMarkers.value = (props.node.model3DMarkers || []).map(m => ({ ...m }))
  }
}

function saveDrawer() {
  props.node.model3DMarkers = draftMarkers.value.map(m => ({ ...m }))
  drawerOpen.value = false
}

function cancelDrawer() {
  draftMarkers.value = (props.node.model3DMarkers || []).map(m => ({ ...m }))
  drawerOpen.value = false
}

function deleteMarker(marker: Model3DMarker) {
  draftMarkers.value = draftMarkers.value.filter(m => m.id !== marker.id)
  if (!drawerOpen.value) {
    props.node.model3DMarkers = draftMarkers.value.map(m => ({ ...m }))
  }
}

// 标记统计
const markerStat = computed(() => {
  const list = displayMarkers.value
  return {
    total: list.length,
    video: list.filter(m => m.deviceType === 'video').length,
    iot: list.filter(m => m.deviceType === 'iot').length
  }
})

// 设备分组
interface VideoCamItem { id: string; name: string; status: 'online' | 'offline'; thumb: string }
interface VideoGwGroup { id: string; name: string; status: 'online' | 'offline'; expanded: boolean; cameras: VideoCamItem[] }
const videoGws = ref<VideoGwGroup[]>([])

watchEffect(() => {
  const videoDevs = props.devices.filter(d => d.type === 'video' && d.thumb && d.gateway)
  const gwMap = new Map<string, VideoGwGroup>()
  for (const d of videoDevs) {
    const gwName = d.gateway!
    if (!gwMap.has(gwName)) gwMap.set(gwName, { id: 'vg-' + gwName, name: gwName, status: 'online', expanded: true, cameras: [] })
    gwMap.get(gwName)!.cameras.push({ id: d.id, name: d.name, status: d.status, thumb: d.thumb! })
  }
  const oldExpanded = new Map(videoGws.value.map(g => [g.id, g.expanded]))
  const newList = Array.from(gwMap.values())
  newList.forEach(g => { g.expanded = oldExpanded.get(g.id) ?? true })
  videoGws.value = newList
})

const filteredVideoGws = computed(() => {
  if (!addSearchKey.value.trim()) return videoGws.value
  const key = addSearchKey.value.toLowerCase()
  return videoGws.value.map(g => ({ ...g, cameras: g.cameras.filter(c => c.name.toLowerCase().includes(key)) }))
    .filter(g => g.cameras.length > 0 || g.name.toLowerCase().includes(key))
})

const filteredIotDevices = computed(() => {
  const iots = props.devices.filter(d => d.type === 'iot')
  if (!addSearchKey.value.trim()) return iots
  const key = addSearchKey.value.toLowerCase()
  return iots.filter(d => d.name.toLowerCase().includes(key) || d.id.toLowerCase().includes(key))
})

// 无需 Esc 处理（拖拽模式没有 place 状态）
onMounted(() => {})
onUnmounted(() => {})
</script>

<template>
  <div class="model-3d-view">
    <!-- 隐藏的文件 input（不限格式）-->
    <input ref="fileInputRef" type="file" class="hidden-file-input" @change="handleFileChange" />

    <!-- 空状态：未上传模型 -->
    <div
      v-if="stage === 'empty'"
      class="empty-upload"
      :class="{ 'drag-over': isDragOver }"
      @click="triggerUpload"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
    >
      <div class="empty-inner">
        <i class="i-ant-design-cloud-upload-outlined empty-icon" />
        <p class="empty-title">上传 3D 模型文件</p>
        <p class="empty-hint">点击此处选择文件，或将文件拖拽到此处</p>
        <p class="empty-tip">建议使用 GLB / GLTF / OBJ / FBX 等格式</p>
      </div>
    </div>

    <!-- 加载中 -->
    <div v-else-if="stage === 'loading'" class="loading-state">
      <div class="loading-inner">
        <div class="loading-spinner">
          <i class="i-ant-design-loading-outlined spinner-icon" />
        </div>
        <h3 class="loading-title">正在加载 3D 模型</h3>
        <p class="loading-sub">请稍候...</p>
        <div class="loading-progress"><div class="progress-bar" /></div>
      </div>
    </div>

    <!-- 已就绪：工具栏 + 3D 容器 -->
    <template v-else>
      <!-- 工具栏 -->
      <div class="model-toolbar">
        <div class="toolbar-left">
          <button class="tool-btn" @click="changeModel">
            <i class="i-ant-design-swap-outlined" />
            <span>更换模型</span>
          </button>
          <span class="model-name" v-if="node.model3DFile">
            <i class="i-ant-design-file-3d-outlined" />
            {{ node.model3DFile }}
          </span>
          <div class="zoom-group">
            <button class="zoom-btn" title="缩小" @click="zoomOut"><i class="i-ant-design-minus-outlined" /></button>
            <button class="zoom-btn" title="放大" @click="zoomIn"><i class="i-ant-design-plus-outlined" /></button>
            <button class="zoom-btn" title="重置" @click="resetView"><i class="i-ant-design-aim-outlined" /></button>
          </div>
          <span class="marker-stat">设备标记 {{ markerStat.total }} 个（视频 {{ markerStat.video }} / 物联 {{ markerStat.iot }}）</span>
        </div>
        <div class="toolbar-right">
          <template v-if="drawerOpen">
            <span class="placing-hint">
              <i class="i-ant-design drag-outlined" />
              拖拽设备到 3D 模型进行标记
            </span>
            <button class="tool-btn" @click="cancelDrawer">
              <i class="i-ant-design-close-outlined" /><span>取消</span>
            </button>
            <button class="tool-btn primary" @click="saveDrawer">
              <i class="i-ant-design-check-outlined" /><span>保存</span>
            </button>
          </template>
          <template v-else>
            <button class="tool-btn primary" @click="toggleDrawer">
              <i class="i-ant-design-environment-outlined" /><span>设备标记</span>
            </button>
          </template>
        </div>
      </div>

      <!-- 3D 画布 + 抽屉 -->
      <div class="canvas-drawer-wrap">
        <div
          ref="containerRef"
          class="model-canvas"
          :class="{ 'drawer-open': drawerOpen, 'drag-active': dragGhostVisible }"
          @mousedown="onMouseDown"
          @mousemove="onMouseMove"
          @mouseup="onMouseUp"
          @mouseleave="onMouseUp"
          @wheel="onWheel"
          @dragover="onCanvasDragOver"
          @drop="onCanvasDrop"
        />

        <!-- 标记点叠层 -->
        <div class="markers-overlay" :class="{ 'drawer-open': drawerOpen }">
          <template v-for="m in allDisplayMarkers" :key="m.id">
            <div
              v-show="markerScreenPos[m.id]?.visible"
              class="marker"
              :class="'marker--' + m.type"
              :style="{ left: markerScreenPos[m.id]?.x + 'px', top: markerScreenPos[m.id]?.y + 'px' }"
            >
              <a-tooltip :mouse-enter-delay="0.2">
                <template #title><span>{{ m.name }}</span></template>
                <div class="marker-pin">
                  <i :class="markerMeta[m.type].icon" />
                </div>
              </a-tooltip>
              <button
                v-if="m.isUserMarker && drawerOpen"
                class="marker-del"
                @click.stop="deleteMarker({ id: m.id, deviceId: '', deviceName: m.name, deviceType: m.type === 'camera' ? 'video' : 'iot', status: 'online', icon: '', x: 0, y: 0, z: 0 })"
              >
                <i class="i-ant-design-close-outlined" />
              </button>
            </div>
          </template>
        </div>

        <!-- 右侧抽屉：设备列表 -->
        <transition name="drawer-slide">
          <div v-show="drawerOpen" class="device-drawer">
            <div class="drawer-header"><span class="drawer-title">设备标记</span></div>
            <div class="drawer-subtitle">选择设备后在模型上点击位置放置，每个设备只能标记一次</div>

            <div class="drawer-cat">
              <div class="drawer-cat-item" :class="{ active: drawerCat === 'video' }" @click="drawerCat = 'video'">
                <i class="i-ant-design-video-camera-outlined" /><span>视频设备</span>
              </div>
              <div class="drawer-cat-item" :class="{ active: drawerCat === 'iot' }" @click="drawerCat = 'iot'">
                <i class="i-ant-design-control-outlined" /><span>物联设备</span>
              </div>
            </div>

            <div class="drawer-search-wrap">
              <a-input v-model:value="addSearchKey" :placeholder="`搜索${drawerCat === 'video' ? '摄像头' : '设备'}名称`" class="drawer-search" allow-clear>
                <template #prefix><i class="i-ant-design-search-outlined" /></template>
              </a-input>
            </div>

            <!-- 视频设备 -->
            <div v-if="drawerCat === 'video'" class="drawer-list scroll-thin">
              <div v-for="gw in filteredVideoGws" :key="gw.id" class="opt-gw-group">
                <div class="opt-gw-header" @click="gw.expanded = !gw.expanded">
                  <i class="i-ant-design-cluster-outlined opt-gw-icon" :style="{ color: gw.status === 'online' ? '#6e4bff' : '#bfbfbf' }" />
                  <span class="opt-gw-name">{{ gw.name }}</span>
                  <span class="opt-gw-count">{{ gw.cameras.length }} 个通道</span>
                  <i class="opt-gw-arrow" :class="gw.expanded ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'" />
                </div>
                <div v-if="gw.expanded" class="opt-cam-grid">
                  <div
                    v-for="cam in gw.cameras"
                    :key="cam.id"
                    class="opt-cam-card"
                    :class="{ marked: markedDeviceIds.has(cam.id) }"
                    draggable="true"
                    @dragstart="onDeviceDragStart($event, { id: cam.id, name: cam.name, type: 'video', status: cam.status, icon: 'i-ant-design-video-camera-outlined', thumb: cam.thumb, gateway: gw.name })"
                    @dragend="onDeviceDragEnd"
                    @click="chooseVideoCam(cam)"
                  >
                    <div class="opt-cam-thumb">
                      <img :src="cam.thumb" alt="截帧" />
                      <div v-if="markedDeviceIds.has(cam.id)" class="opt-cam-marked-mask">
                        <i class="i-ant-design-environment-filled" />
                      </div>
                    </div>
                    <div class="opt-cam-info">
                      <span class="opt-cam-name">{{ cam.name }}</span>
                      <span class="opt-cam-status" :class="cam.status">{{ cam.status === 'online' ? '在线' : '离线' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="filteredVideoGws.length === 0" class="drawer-empty">
                <i class="i-ant-design-video-camera-outlined drawer-empty-icon" />
                <p class="drawer-empty-title">{{ addSearchKey ? '没有找到匹配的摄像头' : '暂无可标记的摄像头' }}</p>
                <p v-if="!addSearchKey" class="drawer-empty-hint">请先在「绑定设备管理」中绑定视频设备</p>
              </div>
            </div>

            <!-- 物联设备 -->
            <div v-else class="drawer-list scroll-thin">
              <div
                v-for="d in filteredIotDevices"
                :key="d.id"
                class="drawer-row"
                :class="{ disabled: markedDeviceIds.has(d.id) }"
                draggable="true"
                @dragstart="onDeviceDragStart($event, d)"
                @dragend="onDeviceDragEnd"
              >
                <i :class="d.icon" class="row-icon" />
                <div class="row-info">
                  <span class="row-name">{{ d.name }}</span>
                  <span class="row-id">{{ d.id }}</span>
                </div>
                <span class="row-status" :class="d.status">{{ d.status === 'online' ? '在线' : '离线' }}</span>
                <i v-if="markedDeviceIds.has(d.id)" class="i-ant-design-environment-filled row-marked-icon" />
              </div>
              <div v-if="filteredIotDevices.length === 0" class="drawer-empty">
                <i class="i-ant-design-api-outlined drawer-empty-icon" />
                <p class="drawer-empty-title">{{ addSearchKey ? '没有找到匹配的设备' : '暂无可标记的物联设备' }}</p>
                <p v-if="!addSearchKey" class="drawer-empty-hint">请先在「绑定设备管理」中绑定物联设备</p>
              </div>
            </div>

            <div class="drawer-footer">
              <span class="footer-stat">已标记 {{ markerStat.total }} / 共 {{ devices.length }}</span>
            </div>
          </div>
        </transition>
      </div>
    </template>

    <!-- 拖拽设备时的鼠标跟随预览 -->
    <div
      v-if="dragGhostVisible"
      class="drag-ghost"
      :class="dragGhost.type"
      :style="{ left: dragGhost.x + 'px', top: dragGhost.y + 'px' }"
    >
      <i :class="dragGhost.icon" />
      <span>{{ dragGhost.name }}</span>
    </div>

    <!-- 视频播放弹窗 -->
    <VideoPlayerModal v-model:open="playModalVisible" :target="playTarget" />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.model-3d-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 480px;
  position: relative;
  background-color: #eef2f7;
  border-radius: 8px;
}

.hidden-file-input { display: none; }

/* ===== 空状态 ===== */
.empty-upload {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 8px;
  border: 2px dashed $border-color-input;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.5);

  &:hover { border-color: $color-primary; background: rgba(245, 240, 255, 0.7); }
  &.drag-over { border-color: $color-primary; background: rgba(236, 231, 255, 0.8); }

  .empty-inner {
    text-align: center;
    color: $text-tertiary;
    padding: 40px;
    .empty-icon { font-size: 56px; color: $color-primary; opacity: 0.6; margin-bottom: 16px; }
    .empty-title { font-size: 16px; font-weight: 500; color: $text-base; margin: 0 0 6px; }
    .empty-hint { font-size: 13px; color: $text-secondary; margin: 0 0 4px; }
    .empty-tip { font-size: 12px; color: $text-muted; margin: 0; }
  }
}

/* ===== 加载中 ===== */
.loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 8px;
  border-radius: 12px;
  background: radial-gradient(ellipse at center, rgba(110, 75, 255, 0.08) 0%, rgba(238, 242, 247, 0.8) 70%);

  .loading-inner { text-align: center; padding: 40px; }
  .loading-spinner {
    width: 72px; height: 72px; margin: 0 auto 18px;
    border-radius: 50%;
    background: linear-gradient(135deg, $color-primary-bg, rgba(110, 75, 255, 0.2));
    display: flex; align-items: center; justify-content: center;
    animation: loading-pulse 1.8s ease-in-out infinite;
  }
  .spinner-icon { font-size: 32px; color: $color-primary; animation: loading-rotate 2s linear infinite; }
  .loading-title { font-size: 17px; font-weight: 600; color: $text-base; margin: 0 0 6px; }
  .loading-sub { font-size: 13px; color: $text-tertiary; margin: 0 0 18px; }
  .loading-progress {
    width: 200px; margin: 0 auto; height: 4px;
    background: $border-color-card; border-radius: 2px; overflow: hidden;
    .progress-bar {
      height: 100%; width: 40%;
      background: linear-gradient(90deg, $color-primary, $color-primary-hover);
      border-radius: 2px;
      animation: loading-bar 1.8s ease-in-out infinite;
    }
  }
}

@keyframes loading-rotate { from { transform: rotate(0); } to { transform: rotate(360deg); } }
@keyframes loading-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(110,75,255,0.3); } 50% { box-shadow: 0 0 30px 8px rgba(110,75,255,0.15); } }
@keyframes loading-bar { 0% { width: 10%; transform: translateX(-30%); } 50% { width: 60%; } 100% { width: 80%; transform: translateX(150%); } }

/* ===== 工具栏 ===== */
.model-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 4px; flex-shrink: 0; gap: 12px; flex-wrap: wrap;
}

.toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 8px; }

.model-name {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; color: $text-tertiary;
  padding: 4px 8px; background: #f0f4f8; border-radius: 4px;
  i { font-size: 13px; }
}

.tool-btn {
  display: flex; align-items: center; gap: 4px;
  height: 28px; padding: 0 10px;
  border: 1px solid $border-color-input; border-radius: 6px;
  background: #fff; color: $text-secondary; font-size: 13px;
  cursor: pointer; font-family: inherit; transition: all 0.15s;
  i { font-size: 14px; }
  &:hover { border-color: $color-primary; color: $color-primary; }
  &.primary {
    background: $color-primary; border-color: $color-primary; color: #fff;
    &:hover { background: $color-primary-hover; border-color: $color-primary-hover; color: #fff; }
  }
}

.zoom-group {
  display: flex; align-items: center; gap: 4px;
  padding: 0 4px; border: 1px solid $border-color-input; border-radius: 6px; height: 28px;
  .zoom-btn {
    display: flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border: none; background: transparent;
    color: $text-secondary; cursor: pointer; border-radius: 4px;
    i { font-size: 12px; }
    &:hover { background: $bg-hover; color: $color-primary; }
  }
}

.marker-stat { font-size: 12px; color: $text-tertiary; margin-left: 8px; }

.placing-hint {
  display: flex; align-items: center; gap: 4px;
  height: 28px; padding: 0 10px;
  background: #e6f7ff; border: 1px solid #91d5ff; border-radius: 6px;
  color: #096dd9; font-size: 13px;
  i { font-size: 14px; }
}

/* ===== 3D 画布 ===== */
.canvas-drawer-wrap { flex: 1; position: relative; display: flex; min-height: 0; }

.model-canvas {
  flex: 1; position: relative; overflow: hidden;
  border: 1px solid $border-color-card; border-radius: 8px;
  background-color: #eef2f7;
  cursor: grab; transition: margin-right 0.25s ease;
  &:active { cursor: grabbing; }
  &.drag-active { cursor: copy; box-shadow: inset 0 0 0 3px rgba(110, 75, 255, 0.5); }
  &.drawer-open { margin-right: 280px; }
  :deep(canvas) { display: block; }
}

/* 标记点叠层 */
.markers-overlay {
  position: absolute; inset: 0; pointer-events: none;
  transition: right 0.25s ease;
  &.drawer-open { right: 280px; }
}

.marker {
  position: absolute; transform: translate(-50%, -50%);
  z-index: 5; pointer-events: auto; cursor: pointer;
  transition: transform 0.15s;
  &:hover { z-index: 10; }
  &:hover .marker-pin { transform: scale(1.2); }
}

.marker-pin {
  width: 28px; height: 28px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: #fff; transition: transform 0.15s;
  i { font-size: 14px; z-index: 2; }
}

.marker--camera .marker-pin { box-shadow: 0 0 0 2px #1890ff, 0 2px 6px rgba(0,0,0,0.15); i { color: #1890ff; } }
.marker--device .marker-pin { box-shadow: 0 0 0 2px $color-primary, 0 2px 6px rgba(0,0,0,0.15); i { color: $color-primary; } }
.marker--event .marker-pin { box-shadow: 0 0 0 2px #ff4d4f, 0 2px 6px rgba(0,0,0,0.15); i { color: #ff4d4f; } }
.marker--worker .marker-pin { box-shadow: 0 0 0 2px #2bb3a3, 0 2px 6px rgba(0,0,0,0.15); i { color: #2bb3a3; } }

.marker-del {
  position: absolute; top: -6px; right: -6px;
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid #fff; background: #ff4d4f; color: #fff;
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 1px 4px rgba(255, 77, 79, 0.4);
  i { font-size: 10px; }
  &:hover { background: #d9363e; }
}

/* ===== 抽屉 ===== */
.device-drawer {
  position: absolute; top: 0; right: 0; bottom: 0; width: 280px;
  background: #fff; border-left: 1px solid $border-color-card;
  display: flex; flex-direction: column;
  box-shadow: -4px 0 12px rgba(20, 22, 30, 0.06); z-index: 5;
}

.drawer-slide-enter-active, .drawer-slide-leave-active { transition: transform 0.25s ease, opacity 0.25s ease; }
.drawer-slide-enter-from, .drawer-slide-leave-to { transform: translateX(20px); opacity: 0; }

.drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px 8px;
  .drawer-title { font-size: 14px; font-weight: 600; color: $text-base; }
}

.drawer-subtitle { padding: 0 14px 10px; font-size: 12px; color: $text-tertiary; line-height: 1.5; }

.drawer-cat {
  display: flex; gap: 4px; background: #f5f6f8; margin: 0 10px 10px; border-radius: 6px; padding: 4px;
  .drawer-cat-item {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px;
    height: 28px; font-size: 13px; color: $text-secondary; cursor: pointer; border-radius: 4px; transition: all 0.15s;
    i { font-size: 14px; }
    &:hover { color: $color-primary; }
    &.active { background: #fff; color: $color-primary; box-shadow: 0 1px 3px rgba(20, 22, 30, 0.08); }
  }
}

.drawer-search-wrap { padding: 0 14px 10px; }

.drawer-list { flex: 1; overflow-y: auto; border-top: 1px solid $border-color-card; }

.opt-gw-group { border-bottom: 1px solid $border-color-card; }
.opt-gw-header {
  display: flex; align-items: center; gap: 6px; padding: 8px 12px;
  background: #f7f8fa; cursor: pointer; position: sticky; top: 0; z-index: 1;
  .opt-gw-icon { font-size: 14px; }
  .opt-gw-name { font-size: 12px; font-weight: 600; color: $text-base; }
  .opt-gw-count { font-size: 11px; color: $text-tertiary; margin-left: auto; }
  .opt-gw-arrow { font-size: 10px; color: $text-muted; }
}

.opt-cam-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; padding: 10px; }

.opt-cam-card {
  border: 1px solid $border-color-card; border-radius: 6px; overflow: hidden;
  cursor: pointer; transition: all 0.15s; background: #fff;
  &:hover { border-color: $color-primary; }
  &.selected { border-color: $color-primary; box-shadow: 0 0 0 2px rgba(110, 75, 255, 0.25); }
  &.marked { opacity: 0.55; cursor: not-allowed; &:hover { border-color: $border-color-card; } }

  .opt-cam-thumb {
    position: relative; aspect-ratio: 16 / 10; background: #1a1a2e;
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .opt-cam-marked-mask {
      position: absolute; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      i { width: 28px; height: 28px; line-height: 28px; text-align: center; font-size: 14px; color: #fff; background: $color-primary; border-radius: 50%; box-shadow: 0 0 0 2px rgba(255,255,255,0.85); }
    }
    .opt-cam-selected-mask {
      position: absolute; inset: 0; background: rgba(110,75,255,0.45);
      display: flex; align-items: center; justify-content: center; gap: 4px;
      color: #fff; font-size: 12px;
      i { font-size: 16px; }
    }
  }

  .opt-cam-info {
    display: flex; align-items: center; justify-content: space-between; gap: 4px; padding: 5px 7px;
    .opt-cam-name { font-size: 12px; color: $text-base; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
  }
}

.opt-cam-status {
  font-size: 10px; padding: 1px 4px; border-radius: 3px; flex-shrink: 0;
  &.online { color: $color-online; background: $color-online-bg; }
  &.offline { color: #bfbfbf; background: rgba(191,191,191,0.1); }
}

.drawer-row {
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  cursor: pointer; border-bottom: 1px solid $border-color-card; transition: background 0.15s;
  &:last-child { border-bottom: none; }
  &:hover:not(.disabled) { background: $color-primary-bg; }
  &.selected { background: $color-primary-bg; box-shadow: inset 3px 0 0 $color-primary; }
  &.disabled { opacity: 0.5; cursor: not-allowed; }

  .row-icon { font-size: 18px; color: $color-primary; flex-shrink: 0; }
  .row-info { flex: 1; display: flex; flex-direction: column; min-width: 0;
    .row-name { font-size: 13px; color: $text-base; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .row-id { font-size: 11px; color: $text-muted; font-family: monospace; }
  }
  .row-status { font-size: 11px; flex-shrink: 0; &.online { color: $color-online; } &.offline { color: #bfbfbf; } }
  .row-marked-icon {
    width: 22px; height: 22px; line-height: 22px; text-align: center;
    font-size: 12px; color: #fff; background: $color-primary; border-radius: 50%;
    flex-shrink: 0; box-shadow: 0 0 0 1.5px rgba(255,255,255,0.85);
  }
}

.drawer-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 50px 20px; text-align: center;
  .drawer-empty-icon { font-size: 40px; color: $text-muted; opacity: 0.4; margin-bottom: 12px; }
  .drawer-empty-title { font-size: 13px; color: $text-secondary; margin: 0 0 4px; }
  .drawer-empty-hint { font-size: 11px; color: $text-muted; margin: 0; line-height: 1.5; }
}

.drawer-footer {
  display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;
  border-top: 1px solid $border-color-card; background: #fafbfc;
  .footer-stat { font-size: 12px; color: $text-tertiary; }
}

/* ===== 拖拽相关 ===== */
.opt-cam-card:not(.marked),
.drawer-row:not(.disabled) {
  cursor: grab;
  &:active { cursor: grabbing; }
}

.opt-cam-card:not(.marked):where([draggable="true"]):active,
.drawer-row:not(.disabled):where([draggable="true"]):active {
  opacity: 0.6;
}

/* 全局跟随鼠标的拖拽预览 */
.drag-ghost {
  position: fixed;
  z-index: 9999;
  pointer-events: none;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 6px 8px;
  border-radius: 20px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(20, 22, 30, 0.2);
  font-size: 13px;
  color: $text-base;
  white-space: nowrap;

  i { font-size: 16px; }
  &.video i { color: #1890ff; }
  &.iot i { color: $color-primary; }
}
</style>
