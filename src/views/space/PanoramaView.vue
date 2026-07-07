<script setup lang="ts">
/**
 * 空间 3D 图（PanoramaView）
 * 1. 上传/更换等距柱状投影全景图
 * 2. Three.js 球形全景 + WASD 自由移动 + 鼠标视角 + 滚轮缩放
 */
import * as THREE from 'three'
import type { TreeNode } from './AreaView.vue'
import defaultPanorama from '@/assets/panorama/room-panorama.jpg'

// ===== Props =====
interface BoundDevice {
  id: string
  name: string
  type: 'video' | 'iot'
  status: 'online' | 'offline'
  icon: string
}
const props = defineProps<{
  node: TreeNode
  devices: BoundDevice[]
}>()

// ===== 阶段状态：'empty'(未上传) | 'generating'(生成中) | 'ready'(3D 场景就绪) =====
const stage = ref<'empty' | 'generating' | 'ready'>('empty')

// ===== Three.js 引用 =====
const containerRef = ref<HTMLDivElement | null>(null)
let renderer: THREE.WebGLRenderer | null = null
let scene: THREE.Scene | null = null
let camera: THREE.PerspectiveCamera | null = null
let sphereMesh: THREE.Mesh | null = null
let sphereTexture: THREE.Texture | null = null
let animationId = 0
let resizeObserver: ResizeObserver | null = null

// ===== 鼠标视角控制 =====
const isDragging = ref(false)
const dragStart = reactive({ x: 0, y: 0 })
// 相机朝向：yaw 绕 Y 轴（左右），pitch 绕 X 轴（上下，clamp ±85°）
const yaw = ref(0)
const pitch = ref(0)
const MOUSE_SENSITIVITY = 0.0025

function onMouseDown(e: MouseEvent) {
  isDragging.value = true
  dragStart.x = e.clientX
  dragStart.y = e.clientY
}
function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  const dx = e.clientX - dragStart.x
  const dy = e.clientY - dragStart.y
  dragStart.x = e.clientX
  dragStart.y = e.clientY
  yaw.value -= dx * MOUSE_SENSITIVITY
  pitch.value -= dy * MOUSE_SENSITIVITY
  // clamp pitch
  const limit = Math.PI / 2 - 0.05
  pitch.value = Math.max(-limit, Math.min(limit, pitch.value))
}
function onMouseUp() {
  isDragging.value = false
}

// ===== 滚轮缩放（FOV）=====
function onWheel(e: WheelEvent) {
  e.preventDefault()
  if (!camera) return
  const delta = e.deltaY > 0 ? 2 : -2
  camera.fov = Math.max(30, Math.min(100, camera.fov + delta))
  camera.updateProjectionMatrix()
}

// ===== WASD 移动 =====
const keys = reactive({ w: false, a: false, s: false, d: false })
const MOVE_SPEED = 80 // 单位/秒

function onKeydown(e: KeyboardEvent) {
  const k = e.key.toLowerCase()
  if (k === 'w' || k === 'a' || k === 's' || k === 'd') {
    keys[k as 'w' | 'a' | 's' | 'd'] = true
    e.preventDefault()
  }
}
function onKeyup(e: KeyboardEvent) {
  const k = e.key.toLowerCase()
  if (k === 'w' || k === 'a' || k === 's' || k === 'd') {
    keys[k as 'w' | 'a' | 's' | 'd'] = false
  }
}

// ===== 上传全景图 =====
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

function triggerUpload() {
  fileInputRef.value?.click()
}
function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) readImage(file)
  target.value = ''
}
function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) readImage(file)
}
function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}
function handleDragLeave() {
  isDragOver.value = false
}
function readImage(file: File) {
  const reader = new FileReader()
  reader.onload = () => {
    // 不管上传什么图，都用默认 mock 全景图生成演示场景
    props.node.panoramaImage = defaultPanorama
    // 进入"生成中"阶段
    stage.value = 'generating'
    // 模拟 AI 生成 3D 场景耗时
    setTimeout(() => {
      stage.value = 'ready'
      nextTick(() => {
        initThree(defaultPanorama)
      })
    }, 2500)
  }
  reader.readAsDataURL(file)
}

// ===== 工具栏：缩放控件 =====
function zoomIn() {
  if (!camera) return
  camera.fov = Math.max(30, camera.fov - 5)
  camera.updateProjectionMatrix()
}
function zoomOut() {
  if (!camera) return
  camera.fov = Math.min(100, camera.fov + 5)
  camera.updateProjectionMatrix()
}
function resetView() {
  if (!camera) return
  camera.fov = 75
  camera.position.set(0, 0, 0.1)
  yaw.value = 0
  pitch.value = 0
  camera.updateProjectionMatrix()
}

const fovPercent = computed(() => {
  if (!camera) return 100
  // FOV 越小越"放大"，反过来显示
  return Math.round(((100 - camera.fov) / 70) * 100 + 30)
})

// ===== 初始化 Three.js 场景 =====
function initThree(imgUrl: string) {
  if (!containerRef.value) return
  // 清理旧实例
  disposeThree()

  const container = containerRef.value
  scene = new THREE.Scene()

  camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1100)
  camera.position.set(0, 0, 0.1)

  // 全景球
  const geometry = new THREE.SphereGeometry(500, 60, 40)
  geometry.scale(-1, 1, 1) // 翻转到内表面

  const loader = new THREE.TextureLoader()
  sphereTexture = loader.load(imgUrl, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace
  })
  const material = new THREE.MeshBasicMaterial({ map: sphereTexture })
  sphereMesh = new THREE.Mesh(geometry, material)
  scene.add(sphereMesh)

  renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(container.clientWidth, container.clientHeight)
  container.appendChild(renderer.domElement)

  // 渲染循环
  let lastTime = performance.now()
  function animate() {
    animationId = requestAnimationFrame(animate)
    const now = performance.now()
    const dt = (now - lastTime) / 1000
    lastTime = now

    if (camera) {
      // 应用 yaw/pitch 到相机
      camera.rotation.order = 'YXZ'
      camera.rotation.y = yaw.value
      camera.rotation.x = pitch.value

      // WASD 移动（沿相机朝向的水平投影）
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
      forward.y = 0
      forward.normalize()
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
      right.y = 0
      right.normalize()

      const move = new THREE.Vector3()
      if (keys.w) move.add(forward)
      if (keys.s) move.sub(forward)
      if (keys.a) move.sub(right)
      if (keys.d) move.add(right)
      if (move.lengthSq() > 0) {
        move.normalize().multiplyScalar(MOVE_SPEED * dt)
        camera.position.add(move)
      }
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera)
    }
  }
  animate()

  // 自适应大小
  resizeObserver = new ResizeObserver(() => {
    if (!renderer || !camera || !container) return
    const w = container.clientWidth
    const h = container.clientHeight
    camera.aspect = w / h
    camera.updateProjectionMatrix()
    renderer.setSize(w, h)
  })
  resizeObserver.observe(container)
}

function disposeThree() {
  if (animationId) {
    cancelAnimationFrame(animationId)
    animationId = 0
  }
  if (sphereMesh) {
    sphereMesh.geometry.dispose()
    ;(sphereMesh.material as THREE.Material).dispose()
    sphereMesh = null
  }
  if (sphereTexture) {
    sphereTexture.dispose()
    sphereTexture = null
  }
  if (renderer) {
    renderer.dispose()
    if (containerRef.value && renderer.domElement.parentNode === containerRef.value) {
      containerRef.value.removeChild(renderer.domElement)
    }
    renderer = null
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  scene = null
  camera = null
}

// watch 不再自动初始化（由 readImage 的 stage 流程控制）

// 组件挂载后，如果已有图则初始化
onMounted(() => {
  // 初始为空状态，等用户上传
  stage.value = 'empty'
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('keyup', onKeyup)
})

onBeforeUnmount(() => {
  disposeThree()
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('keyup', onKeyup)
})
</script>

<template>
  <div class="panorama-view">
    <!-- 隐藏的文件 input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden-file-input"
      @change="handleFileChange"
    />

    <!-- 空状态：未上传全景图 -->
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
        <i class="i-ant-design-eye-outlined empty-icon" />
        <p class="empty-title">上传原始图片，生成可探索的 3D 场景</p>
        <p class="empty-hint">点击此处选择图片，或将图片拖拽到此处</p>
        <p class="empty-tip">系统会自动将上传的图片转换为 3D 全景场景，支持 WASD 移动、鼠标控制视角</p>
      </div>
    </div>

    <!-- 生成中：等待 -->
    <div v-else-if="stage === 'generating'" class="generating">
      <div class="generating-inner">
        <div class="generating-spinner">
          <i class="i-ant-design-eye-outlined spinner-icon" />
        </div>
        <h3 class="generating-title">正在生成 3D 场景</h3>
        <p class="generating-sub">系统正在分析图片并构建 3D 全景空间，请稍候...</p>
        <div class="generating-progress">
          <div class="progress-bar" />
        </div>
      </div>
    </div>

    <!-- 已就绪：工具栏 + 3D 容器 -->
    <template v-else>
      <!-- 工具栏 -->
      <div class="pano-toolbar">
        <div class="toolbar-left">
          <button class="tool-btn" @click="triggerUpload">
            <i class="i-ant-design-picture-outlined" />
            <span>更改原始图片</span>
          </button>
          <div class="zoom-group">
            <button class="zoom-btn" title="缩小视野" @click="zoomOut">
              <i class="i-ant-design-minus-outlined" />
            </button>
            <span class="zoom-text">{{ fovPercent }}%</span>
            <button class="zoom-btn" title="放大视野" @click="zoomIn">
              <i class="i-ant-design-plus-outlined" />
            </button>
            <button class="zoom-btn" title="重置" @click="resetView">
              <i class="i-ant-design-aim-outlined" />
            </button>
          </div>
        </div>
      </div>

      <!-- 3D 渲染容器 -->
      <div
        ref="containerRef"
        class="pano-canvas"
        :class="{ dragging: isDragging }"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseup="onMouseUp"
        @mouseleave="onMouseUp"
        @wheel="onWheel"
      />

      <!-- 操作提示浮层（首次进入时显示） -->
      <div class="pano-overlay-tip">
        <div class="tip-item">
          <span class="tip-keys"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span>
          <span>移动位置</span>
        </div>
        <div class="tip-item">
          <i class="i-ant-design-drag-outlined tip-icon" />
          <span>拖拽视角</span>
        </div>
        <div class="tip-item">
          <i class="i-ant-design-zoom-in-outlined tip-icon" />
          <span>滚轮缩放</span>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.panorama-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 480px;
  position: relative;
  background-color: #0a0a14;
  background-image:
    linear-gradient(to right, rgba(110, 75, 255, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(110, 75, 255, 0.06) 1px, transparent 1px),
    linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
  border-radius: 8px;
}

.hidden-file-input {
  display: none;
}

/* ===== 生成中 ===== */
.generating {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 8px;
  border-radius: 12px;
  background: radial-gradient(ellipse at center, rgba(110, 75, 255, 0.12) 0%, rgba(10, 10, 20, 0.6) 70%);

  .generating-inner {
    text-align: center;
    padding: 40px;
  }

  .generating-spinner {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, $color-primary-bg, rgba(110, 75, 255, 0.2));
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(110, 75, 255, 0.3);
    animation: generating-pulse 1.8s ease-in-out infinite;
  }

  .spinner-icon {
    font-size: 36px;
    color: $color-primary;
    animation: generating-rotate 2.5s linear infinite;
  }

  .generating-title {
    font-size: 18px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.95);
    margin: 0 0 8px;
  }

  .generating-sub {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.55);
    margin: 0 0 20px;
    line-height: 1.6;
  }

  .generating-progress {
    width: 240px;
    margin: 0 auto;
    height: 4px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 2px;
    overflow: hidden;

    .progress-bar {
      height: 100%;
      width: 40%;
      background: linear-gradient(90deg, $color-primary, $color-primary-hover);
      border-radius: 2px;
      animation: generating-loading 1.8s ease-in-out infinite;
    }
  }
}

@keyframes generating-rotate {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
}

@keyframes generating-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(110, 75, 255, 0.3); }
  50% { box-shadow: 0 0 30px 8px rgba(110, 75, 255, 0.15); }
}

@keyframes generating-loading {
  0% { width: 10%; transform: translateX(-30%); }
  50% { width: 60%; }
  100% { width: 80%; transform: translateX(150%); }
}

/* ===== 空状态 ===== */
.empty-upload {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 8px;
  border: 2px dashed rgba(110, 75, 255, 0.3);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.03);

  &:hover {
    border-color: $color-primary;
    background: rgba(110, 75, 255, 0.08);
  }

  &.drag-over {
    border-color: $color-primary;
    background: rgba(110, 75, 255, 0.15);
  }

  .empty-inner {
    text-align: center;
    color: rgba(255, 255, 255, 0.7);
    padding: 40px;

    .empty-icon {
      font-size: 56px;
      color: $color-primary;
      opacity: 0.7;
      margin-bottom: 16px;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.9);
      margin: 0 0 6px;
    }

    .empty-hint {
      font-size: 13px;
      color: rgba(255, 255, 255, 0.6);
      margin: 0 0 4px;
    }

    .empty-tip {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.4);
      margin: 0;
    }
  }
}

/* ===== 工具栏 ===== */
.pano-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 2;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  i { font-size: 14px; }

  &:hover {
    border-color: $color-primary;
    color: #fff;
    background: rgba(110, 75, 255, 0.15);
  }
}

.zoom-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  height: 28px;

  .zoom-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    border-radius: 4px;

    i { font-size: 12px; }

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }
  }

  .zoom-text {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.85);
    min-width: 38px;
    text-align: center;
  }
}

/* ===== 3D 画布 ===== */
.pano-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
  cursor: grab;

  &.dragging {
    cursor: grabbing;
  }

  :deep(canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }
}

/* 底部操作提示浮层 */
.pano-overlay-tip {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  border-radius: 20px;
  z-index: 3;
  pointer-events: none;

  .tip-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);

    .tip-keys {
      display: flex;
      gap: 2px;
    }

    .tip-icon {
      font-size: 14px;
      color: $color-primary;
    }

    kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 16px;
      height: 16px;
      padding: 0 3px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 3px;
      font-size: 9px;
      font-family: monospace;
      color: #fff;
    }
  }
}
</style>
