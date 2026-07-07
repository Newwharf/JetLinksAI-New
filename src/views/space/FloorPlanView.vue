<script setup lang="ts">
/**
 * 平面图（FloorPlanView）
 * 1. 上传/更换空间平面图
 * 2. 在平面图上标记已绑定的设备（百分比坐标，换图后位置仍然合理）
 * 3. 拖拽标记调整位置 / 删除标记 / 缩放与平移画布
 */
import type { TreeNode } from './AreaView.vue'

// ===== 标记数据模型 =====
export interface PlanMarker {
  id: string
  deviceId: string
  deviceName: string
  deviceType: 'video' | 'iot'
  status: 'online' | 'offline'
  icon: string
  x: number // 0~100 百分比
  y: number
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

// ===== 视图缩放 / 平移（参照 SituationView） =====
const scale = ref(1)
const translateX = ref(0)
const translateY = ref(0)
const isPanning = ref(false)
const panStart = reactive({ x: 0, y: 0, tx: 0, ty: 0 })

const MIN_SCALE = 0.4
const MAX_SCALE = 3

function zoomIn() {
  scale.value = Math.min(MAX_SCALE, +(scale.value + 0.15).toFixed(2))
}
function zoomOut() {
  scale.value = Math.max(MIN_SCALE, +(scale.value - 0.15).toFixed(2))
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
function onPanStart(e: MouseEvent) {
  // place 模式或正在拖动标记时不平移
  if (viewMode.value === 'place' || draggingMarkerId.value) return
  isPanning.value = true
  panStart.x = e.clientX
  panStart.y = e.clientY
  panStart.tx = translateX.value
  panStart.ty = translateY.value
}
function onPanMove(e: MouseEvent) {
  if (!isPanning.value) return
  translateX.value = panStart.tx + (e.clientX - panStart.x)
  translateY.value = panStart.ty + (e.clientY - panStart.y)
}
function onPanEnd() {
  isPanning.value = false
}

// ===== 上传平面图 =====
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragOver = ref(false)

function triggerUpload() {
  fileInputRef.value?.click()
}
function handleFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) readImage(file)
  // 重置 input 以便重复选择同一文件
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
    // 重置美化状态（更换图片时也要走美化流程）
    props.node.planImageEnhanced = false
    props.node.planImageOriginal = undefined
    enhancedFilter.value = ''
    props.node.planImage = reader.result as string
    // 上传/更换图片后触发美化询问（除非用户勾选了"不再提示"）
    nextTick(() => {
      if (!dontAskEnhance.value) {
        enhanceStage.value = 'asking'
      }
    })
  }
  reader.readAsDataURL(file)
}

// ===== AI 白模生成（简化版：询问 → 等待 → 结果）=====
// 弹窗阶段：'idle'(关闭) | 'asking'(询问) | 'processing'(处理中) | 'result'(结果展示)
const enhanceStage = ref<'idle' | 'asking' | 'processing' | 'result'>('idle')
// "不再提示"勾选（组件内记忆，刷新后重置）
const dontAskEnhance = ref(false)
// 询问弹窗内的勾选状态
const askDontShow = ref(false)

// 白模生成结果（mock：CSS filter 模拟）
const enhancedFilter = ref('')

// 工具栏按钮入口
function openEnhanceModal() {
  // 已美化过 → 直接展示结果（让用户重新生成/替换/取消）
  if (props.node.planImageEnhanced) {
    enhancedFilter.value = currentFilter.value
    enhanceStage.value = 'result'
  } else {
    enhanceStage.value = 'asking'
  }
}

// 上传后自动询问
// 询问：开始美化 → 进入处理中
function startEnhance() {
  enhanceStage.value = 'processing'
  // 备份原图（仅首次）
  if (!props.node.planImageOriginal) {
    props.node.planImageOriginal = props.node.planImage
  }
  // mock：随机 filter + 2 秒处理
  const seed = Math.floor(Math.random() * 100)
  const sat = (1.25 + (seed % 25) / 100).toFixed(2)
  const con = (1.12 + ((seed * 3) % 16) / 100).toFixed(2)
  const bri = (1.02 + ((seed * 5) % 11) / 100).toFixed(2)
  const hue = -10 + ((seed * 7) % 16)
  enhancedFilter.value = `saturate(${sat}) contrast(${con}) brightness(${bri}) hue-rotate(${hue}deg)`
  setTimeout(() => {
    enhanceStage.value = 'result'
  }, 2200)
}

// 询问：暂不美化
function cancelAsking() {
  if (askDontShow.value) dontAskEnhance.value = true
  askDontShow.value = false
  enhanceStage.value = 'idle'
}

// 大图预览：'original' 看原图，'enhanced' 看美化后
const largePreviewVisible = ref(false)
const largePreviewTab = ref<'original' | 'enhanced'>('enhanced')
// 大图缩放/平移
const lpScale = ref(1)
const lpX = ref(0)
const lpY = ref(0)
const lpPanning = ref(false)
const lpPanStart = reactive({ x: 0, y: 0, tx: 0, ty: 0 })

function openLargePreview(tab: 'original' | 'enhanced') {
  largePreviewTab.value = tab
  // 重置缩放
  lpScale.value = 1
  lpX.value = 0
  lpY.value = 0
  largePreviewVisible.value = true
}

function lpZoomIn() {
  lpScale.value = Math.min(5, +(lpScale.value + 0.2).toFixed(2))
}
function lpZoomOut() {
  lpScale.value = Math.max(0.5, +(lpScale.value - 0.2).toFixed(2))
  if (lpScale.value === 1) { lpX.value = 0; lpY.value = 0 }
}
function lpReset() {
  lpScale.value = 1
  lpX.value = 0
  lpY.value = 0
}
function lpOnWheel(e: WheelEvent) {
  e.preventDefault()
  if (e.deltaY < 0) lpZoomIn()
  else lpZoomOut()
}
function lpOnPanStart(e: MouseEvent) {
  lpPanning.value = true
  lpPanStart.x = e.clientX
  lpPanStart.y = e.clientY
  lpPanStart.tx = lpX.value
  lpPanStart.ty = lpY.value
}
function lpOnPanMove(e: MouseEvent) {
  if (!lpPanning.value) return
  lpX.value = lpPanStart.tx + (e.clientX - lpPanStart.x)
  lpY.value = lpPanStart.ty + (e.clientY - lpPanStart.y)
}
function lpOnPanEnd() {
  lpPanning.value = false
}

// 结果：取消 → 还原原图并关闭
function cancelEnhance() {
  if (props.node.planImageOriginal) {
    props.node.planImage = props.node.planImageOriginal
  }
  props.node.planImageEnhanced = false
  enhancedFilter.value = ''
  enhanceStage.value = 'idle'
}

// 结果：重新生成 → 回到处理中（再随机一次 filter）
function regenerateEnhance() {
  enhanceStage.value = 'processing'
  const seed = Math.floor(Math.random() * 1000)
  const sat = (1.25 + (seed % 25) / 100).toFixed(2)
  const con = (1.12 + ((seed * 7) % 16) / 100).toFixed(2)
  const bri = (1.02 + ((seed * 11) % 11) / 100).toFixed(2)
  const hue = -10 + ((seed * 13) % 16)
  enhancedFilter.value = `saturate(${sat}) contrast(${con}) brightness(${bri}) hue-rotate(${hue}deg)`
  setTimeout(() => {
    enhanceStage.value = 'result'
  }, 2200)
}

// 结果：替换为平面图 → 应用白模生成结果到画布并关闭
function applyEnhance() {
  props.node.planImage = props.node.planImageOriginal
  props.node.planImageEnhanced = true
  // currentFilter 通过 enhancedFilter 应用
  enhanceStage.value = 'idle'
}

// 当前画布应用的 filter（来自最后一次美化）
const currentFilter = computed(() => props.node.planImageEnhanced ? enhancedFilter.value : 'none')

// 注册/卸载弹窗键盘监听（与下方 onKeydown 合并到同一 onMounted/onUnmounted）

const drawerOpen = ref(false)
const addSearchKey = ref('')
// 抽屉内的设备分类 tab：默认视联
const drawerCat = ref<'video' | 'iot'>('video')

// 草稿 markers：打开抽屉时从 node.markers 复制，放置/删除都先改草稿，
// 保存时才写回 node.markers；取消则丢弃草稿。
const draftMarkers = ref<PlanMarker[]>([])

// 画布渲染、markedDeviceIds 全部基于草稿（抽屉打开时）或 node.markers（关闭时）
const displayMarkers = computed(() => drawerOpen.value ? draftMarkers.value : (props.node.markers || []))

// 已经被标记过的 deviceId 集合
const markedDeviceIds = computed(() => new Set(displayMarkers.value.map(m => m.deviceId)))

// 视频设备：按网关分组（用于卡片网格展示）
interface VideoCamItem {
  id: string
  name: string
  status: 'online' | 'offline'
  thumb: string
}
interface VideoGwGroup {
  id: string
  name: string
  status: 'online' | 'offline'
  expanded: boolean
  cameras: VideoCamItem[]
}
const videoGws = ref<VideoGwGroup[]>([])

// 同步 props.devices 中的视频设备 → 按 gateway 分组
watchEffect(() => {
  const videoDevs = props.devices.filter(d => d.type === 'video' && d.thumb && d.gateway)
  const gwMap = new Map<string, VideoGwGroup>()
  for (const d of videoDevs) {
    const gwName = d.gateway!
    if (!gwMap.has(gwName)) {
      gwMap.set(gwName, {
        id: 'vg-' + gwName,
        name: gwName,
        status: 'online',
        expanded: true,
        cameras: []
      })
    }
    gwMap.get(gwName)!.cameras.push({
      id: d.id, name: d.name, status: d.status, thumb: d.thumb!
    })
  }
  // 保留旧的 expanded 状态
  const oldExpanded = new Map(videoGws.value.map(g => [g.id, g.expanded]))
  const newList = Array.from(gwMap.values())
  newList.forEach(g => { g.expanded = oldExpanded.get(g.id) ?? true })
  videoGws.value = newList
})

// 视频按搜索过滤
const filteredVideoGws = computed(() => {
  if (!addSearchKey.value.trim()) return videoGws.value
  const key = addSearchKey.value.toLowerCase()
  return videoGws.value
    .map(g => ({
      ...g,
      cameras: g.cameras.filter(c => c.name.toLowerCase().includes(key))
    }))
    .filter(g => g.cameras.length > 0 || g.name.toLowerCase().includes(key))
})

// 物联设备：扁平过滤
const filteredIotDevices = computed(() => {
  const iots = props.devices.filter(d => d.type === 'iot')
  if (!addSearchKey.value.trim()) return iots
  const key = addSearchKey.value.toLowerCase()
  return iots.filter(d => d.name.toLowerCase().includes(key) || d.id.toLowerCase().includes(key))
})

function toggleDrawer() {
  drawerOpen.value = !drawerOpen.value
  if (drawerOpen.value) {
    // 打开抽屉：把现有 markers 复制成草稿
    draftMarkers.value = (props.node.markers || []).map(m => ({ ...m }))
  } else {
    // 直接收起（如外部触发）当保存处理
    pendingDevice.value = null
    viewMode.value = 'view'
  }
}

// 保存：把草稿写回 node.markers，收起抽屉
function saveDrawer() {
  props.node.markers = draftMarkers.value.map(m => ({ ...m }))
  pendingDevice.value = null
  viewMode.value = 'view'
  drawerOpen.value = false
}

// 取消：丢弃草稿，收起抽屉（node.markers 保持不变）
function cancelDrawer() {
  draftMarkers.value = (props.node.markers || []).map(m => ({ ...m }))
  pendingDevice.value = null
  viewMode.value = 'view'
  drawerOpen.value = false
}

// place 模式：在抽屉里点选某个设备后，等待画布点击
const viewMode = ref<'view' | 'place'>('view')
const pendingDevice = ref<BoundDevice | null>(null)

// 物联设备：点击无操作（仅支持拖拽放置）
function chooseDevice(_d: BoundDevice) {
  // 仅拖拽，单击不触发任何行为
}

// 视频设备：点击卡片 → 弹窗播放实时视频流
const playModalVisible = ref(false)
const playTarget = ref<{ name: string; thumb?: string; status: 'online' | 'offline' } | null>(null)

function chooseVideoCam(_gw: VideoGwGroup, cam: VideoCamItem) {
  // 已标记的也可以播放（查看实时画面）
  playTarget.value = {
    name: cam.name,
    thumb: cam.thumb,
    status: cam.status
  }
  playModalVisible.value = true
}

function cancelPlace() {
  viewMode.value = 'view'
  pendingDevice.value = null
}

// ===== 画布点击：仅用于取消 marker 选中（不再放置）=====
const canvasRef = ref<HTMLDivElement | null>(null)

function onCanvasClick(_e: MouseEvent) {
  // 点击画布空白处：取消当前选中的 marker
  if (selectedMarkerDeviceId.value) {
    selectedMarkerDeviceId.value = ''
  }
}

// 公共：放置一个标记到指定百分比坐标（写入草稿，由拖拽 drop 调用）
function placeMarker(d: BoundDevice, x: number, y: number) {
  const marker: PlanMarker = {
    id: `${d.id}-${Date.now()}`,
    deviceId: d.id,
    deviceName: d.name,
    deviceType: d.type,
    status: d.status,
    icon: d.icon,
    x: +x.toFixed(2),
    y: +y.toFixed(2)
  }
  draftMarkers.value.push(marker)
}

// ===== HTML5 拖拽：从抽屉拖到画布 =====
// 拖拽时鼠标跟随的预览元素
const dragGhostVisible = ref(false)
const dragGhost = reactive({ x: 0, y: 0, name: '', icon: '', type: '' as 'video' | 'iot' })

// 设备项开始拖拽
function onDeviceDragStart(e: DragEvent, d: BoundDevice) {
  if (markedDeviceIds.value.has(d.id)) {
    e.preventDefault()
    return
  }
  if (!e.dataTransfer) return
  // 用 deviceId 作为拖拽数据；同时设置一个透明的拖拽预览（用自定义 ghost）
  e.dataTransfer.setData('text/plain', d.id)
  e.dataTransfer.effectAllowed = 'copy'
  // 自定义 ghost：隐藏默认的元素快照
  const empty = document.createElement('div')
  empty.style.width = '1px'
  empty.style.height = '1px'
  document.body.appendChild(empty)
  e.dataTransfer.setDragImage(empty, 0, 0)
  setTimeout(() => document.body.removeChild(empty), 0)

  // 显示自定义 ghost
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
    // 更新 ghost 跟随
    dragGhost.x = e.clientX
    dragGhost.y = e.clientY
  }
}

// 画布上 drop：根据 deviceId 找到对应设备，算百分比放置
function onCanvasDrop(e: DragEvent) {
  e.preventDefault()
  if (!canvasRef.value) return
  const deviceId = e.dataTransfer?.getData('text/plain')
  if (!deviceId) return

  // 已标记的不允许重复
  if (markedDeviceIds.value.has(deviceId)) {
    dragGhostVisible.value = false
    return
  }

  // 找到对应设备
  const device = props.devices.find(d => d.id === deviceId)
  if (!device) {
    dragGhostVisible.value = false
    return
  }

  const rect = canvasRef.value.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  if (x < 0 || x > 100 || y < 0 || y > 100) {
    dragGhostVisible.value = false
    return
  }

  placeMarker(device, x, y)
  dragGhostVisible.value = false
}

// ===== 拖动标记调整位置 =====
const draggingMarkerId = ref<string | null>(null)
const dragMarkerStart = reactive({ x: 0, y: 0, mx: 0, my: 0 })

// 画布点位 ↔ 设备列表 联动
// hover：鼠标悬停 marker 时临时高亮（移开消失）
const hoverMarkerDeviceId = ref('')
// selected：点击 marker 后持续高亮（再点一次或点空白取消）
const selectedMarkerDeviceId = ref('')

// 点击 marker：切换持续选中
function selectMarker(marker: PlanMarker) {
  if (viewMode.value === 'place') return
  selectedMarkerDeviceId.value = selectedMarkerDeviceId.value === marker.deviceId ? '' : marker.deviceId
}

// 列表 hover：反向高亮画布 marker
function onListHoverIn(deviceId: string) {
  hoverMarkerDeviceId.value = deviceId
}
function onListHoverOut() {
  hoverMarkerDeviceId.value = ''
}

function onMarkerMouseDown(e: MouseEvent, marker: PlanMarker) {
  if (viewMode.value === 'place') return
  e.stopPropagation()
  e.preventDefault()
  draggingMarkerId.value = marker.id
  dragMarkerStart.x = e.clientX
  dragMarkerStart.y = e.clientY
  dragMarkerStart.mx = marker.x
  dragMarkerStart.my = marker.y
  // 拖动期间在 window 上监听
  window.addEventListener('mousemove', onMarkerMouseMove)
  window.addEventListener('mouseup', onMarkerMouseUp)
}

function onMarkerMouseMove(e: MouseEvent) {
  if (!draggingMarkerId.value || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const dx = ((e.clientX - dragMarkerStart.x) / rect.width) * 100
  const dy = ((e.clientY - dragMarkerStart.y) / rect.height) * 100
  let nx = dragMarkerStart.mx + dx
  let ny = dragMarkerStart.my + dy
  nx = Math.max(0, Math.min(100, nx))
  ny = Math.max(0, Math.min(100, ny))
  const marker = displayMarkers.value.find(m => m.id === draggingMarkerId.value)
  if (marker) {
    marker.x = +nx.toFixed(2)
    marker.y = +ny.toFixed(2)
    // 抽屉关闭时（直接在画布上拖动），同步到 node.markers
    if (!drawerOpen.value) {
      props.node.markers = displayMarkers.value.map(m => ({ ...m }))
    }
  }
}

function onMarkerMouseUp() {
  draggingMarkerId.value = null
  window.removeEventListener('mousemove', onMarkerMouseMove)
  window.removeEventListener('mouseup', onMarkerMouseUp)
}

// ===== 删除标记（操作草稿）=====
function deleteMarker(marker: PlanMarker) {
  draftMarkers.value = draftMarkers.value.filter(m => m.id !== marker.id)
  // 若抽屉已关闭（直接在画布上 hover 删除），同步写回 node.markers
  if (!drawerOpen.value) {
    props.node.markers = draftMarkers.value.map(m => ({ ...m }))
  }
}

// ===== 更换图片 =====
function changeImage() {
  triggerUpload()
}

// ===== 标记统计（基于草稿/显示数据）=====
const markerStat = computed(() => {
  const list = displayMarkers.value
  return {
    total: list.length,
    video: list.filter(m => m.deviceType === 'video').length,
    iot: list.filter(m => m.deviceType === 'iot').length
  }
})

// Esc 取消 place 模式
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && viewMode.value === 'place') {
    cancelPlace()
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('mousemove', onMarkerMouseMove)
  window.removeEventListener('mouseup', onMarkerMouseUp)
})
</script>

<template>
  <div class="floor-plan-view">
    <!-- 隐藏的文件 input -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden-file-input"
      @change="handleFileChange"
    />

    <!-- 空状态：未上传平面图 -->
    <div
      v-if="!node.planImage"
      class="empty-upload"
      :class="{ 'drag-over': isDragOver }"
      @click="triggerUpload"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
    >
      <div class="empty-inner">
        <i class="i-ant-design-cloud-upload-outlined empty-icon" />
        <p class="empty-title">上传空间平面图</p>
        <p class="empty-hint">点击此处选择图片，或将图片拖拽到此处</p>
        <p class="empty-tip">支持 PNG / JPG / JPEG，建议上传楼层户型图或CAD导出图</p>
      </div>
    </div>

    <!-- 已上传：工具栏 + 画布 + 抽屉 -->
    <template v-else>
      <!-- 工具栏 -->
      <div class="plan-toolbar">
        <div class="toolbar-left">
          <button class="tool-btn" @click="changeImage">
            <i class="i-ant-design-picture-outlined" />
            <span>更换图片</span>
          </button>
          <!-- 白模生成（紧跟更换图片） -->
          <button
            class="tool-btn enhance-btn"
            :class="{ enhanced: node.planImageEnhanced }"
            @click="openEnhanceModal"
          >
            <i class="i-lucide-wand-sparkles" />
            <span>{{ node.planImageEnhanced ? '重新生成白模' : '白模生成' }}</span>
          </button>
          <div class="zoom-group">
            <button class="zoom-btn" title="缩小" @click="zoomOut">
              <i class="i-ant-design-minus-outlined" />
            </button>
            <span class="zoom-text">{{ Math.round(scale * 100) }}%</span>
            <button class="zoom-btn" title="放大" @click="zoomIn">
              <i class="i-ant-design-plus-outlined" />
            </button>
            <button class="zoom-btn" title="重置" @click="resetView">
              <i class="i-ant-design-aim-outlined" />
            </button>
          </div>
          <span class="marker-stat">共 {{ markerStat.total }} 个标记（视频 {{ markerStat.video }} / 物联 {{ markerStat.iot }}）</span>
        </div>
        <div class="toolbar-right">
          <template v-if="drawerOpen">
            <span class="placing-hint">
              <i class="i-ant-design drag-outlined" />
              拖拽设备到画布进行标记
            </span>
            <button class="tool-btn" @click="cancelDrawer">
              <i class="i-ant-design-close-outlined" />
              <span>取消</span>
            </button>
            <button class="tool-btn primary" @click="saveDrawer">
              <i class="i-ant-design-check-outlined" />
              <span>保存</span>
            </button>
          </template>
          <template v-else>
            <button class="tool-btn primary" @click="toggleDrawer">
              <i class="i-ant-design-environment-outlined" />
              <span>设备标记</span>
            </button>
          </template>
        </div>
      </div>

      <!-- 画布 + 抽屉容器（相对定位，便于抽屉绝对覆盖在右侧） -->
      <div class="canvas-drawer-wrap">
        <!-- 画布 -->
        <div
          ref="canvasRef"
          class="plan-canvas"
          :class="{ panning: isPanning, 'drawer-open': drawerOpen, 'drag-active': dragGhostVisible }"
          @wheel="onWheel"
          @mousedown="onPanStart"
          @mousemove="onPanMove"
          @mouseup="onPanEnd"
          @mouseleave="onPanEnd"
          @click="onCanvasClick"
          @dragover="onCanvasDragOver"
          @drop="onCanvasDrop"
        >
          <div
            class="canvas-transform"
            :style="{ transform: `translate(${translateX}px, ${translateY}px) scale(${scale})` }"
          >
            <img
              :src="node.planImage"
              class="canvas-img"
              :class="{ enhanced: node.planImageEnhanced }"
              :style="{ filter: node.planImageEnhanced ? currentFilter : 'none' }"
              draggable="false"
              alt="平面图"
            />

            <!-- 标记层（百分比定位） -->
            <div class="canvas-markers">
              <div
                v-for="marker in displayMarkers"
                :key="marker.id"
                class="marker-wrap"
                :class="{
                  highlight: hoverMarkerDeviceId === marker.deviceId || selectedMarkerDeviceId === marker.deviceId
                }"
                :style="{ left: marker.x + '%', top: marker.y + '%' }"
              >
                <div
                  class="marker"
                  :class="[marker.deviceType, marker.status, { dragging: draggingMarkerId === marker.id }]"
                  @mousedown="onMarkerMouseDown($event, marker)"
                  @mouseenter="hoverMarkerDeviceId = marker.deviceId"
                  @mouseleave="hoverMarkerDeviceId = ''"
                  @click.stop="selectMarker(marker)"
                >
                  <i :class="marker.icon" />
                </div>
                <!-- 右上角红色删除角标（hover 即显示，无延迟） -->
                <button
                  class="marker-del"
                  title="删除标记"
                  @mousedown.stop
                  @click.stop="deleteMarker(marker)"
                >
                  <i class="i-ant-design-delete-outlined" />
                </button>
                <!-- 设备名小气泡（hover 时显示） -->
                <div class="marker-label">{{ marker.deviceName }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 右侧滑出抽屉：设备列表 -->
        <transition name="drawer-slide">
          <div v-show="drawerOpen" class="device-drawer">
            <div class="drawer-header">
              <span class="drawer-title">设备标记</span>
            </div>
            <div class="drawer-subtitle">选中设备后在画布上点击位置放置，每个设备只能标记一次</div>

            <!-- 视联/物联 切换 tab -->
            <div class="drawer-cat">
              <div class="drawer-cat-item" :class="{ active: drawerCat === 'video' }" @click="drawerCat = 'video'">
                <i class="i-ant-design-video-camera-outlined" />
                <span>视联设备</span>
              </div>
              <div class="drawer-cat-item" :class="{ active: drawerCat === 'iot' }" @click="drawerCat = 'iot'">
                <i class="i-ant-design-control-outlined" />
                <span>物联设备</span>
              </div>
            </div>

            <div class="drawer-search-wrap">
              <a-input
                v-model:value="addSearchKey"
                :placeholder="`搜索${drawerCat === 'video' ? '摄像头' : '设备'}名称`"
                class="drawer-search"
                allow-clear
              >
                <template #prefix>
                  <i class="i-ant-design-search-outlined" />
                </template>
              </a-input>
            </div>

            <!-- 视联设备：按网关分组的卡片网格（带缩略图） -->
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
                    :class="{
                      marked: markedDeviceIds.has(cam.id),
                      selected: pendingDevice?.id === cam.id,
                      highlight: hoverMarkerDeviceId === cam.id || selectedMarkerDeviceId === cam.id
                    }"
                    draggable="true"
                    @dragstart="onDeviceDragStart($event, { id: cam.id, name: cam.name, type: 'video', status: cam.status, icon: 'i-ant-design-video-camera-outlined', thumb: cam.thumb, gateway: gw.name })"
                    @dragend="onDeviceDragEnd"
                    @click="chooseVideoCam(gw, cam)"
                    @mouseenter="onListHoverIn(cam.id)"
                    @mouseleave="onListHoverOut"
                  >
                    <div class="opt-cam-thumb">
                      <img :src="cam.thumb" alt="截帧" />
                      <div v-if="markedDeviceIds.has(cam.id)" class="opt-cam-marked-mask">
                        <i class="i-ant-design-environment-filled" />
                      </div>
                      <div v-if="pendingDevice?.id === cam.id" class="opt-cam-selected-mask">
                        <i class="i-ant-design-aim-outlined" />
                        <span>待放置</span>
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
                <p class="drawer-empty-title">
                  {{ addSearchKey ? '没有找到匹配的摄像头' : '暂无可标记的摄像头' }}
                </p>
                <p v-if="!addSearchKey" class="drawer-empty-hint">请先在「绑定设备管理」中绑定视频设备</p>
              </div>
            </div>

            <!-- 物联设备：扁平列表 -->
            <div v-else class="drawer-list scroll-thin">
              <div
                v-for="d in filteredIotDevices"
                :key="d.id"
                class="drawer-row"
                :class="{
                  disabled: markedDeviceIds.has(d.id),
                  selected: pendingDevice?.id === d.id,
                  highlight: hoverMarkerDeviceId === d.id || selectedMarkerDeviceId === d.id
                }"
                draggable="true"
                @dragstart="onDeviceDragStart($event, d)"
                @dragend="onDeviceDragEnd"
                @click="chooseDevice(d)"
                @mouseenter="onListHoverIn(d.id)"
                @mouseleave="onListHoverOut"
              >
                <i :class="d.icon" class="row-icon" />
                <div class="row-info">
                  <span class="row-name">{{ d.name }}</span>
                  <span class="row-id">{{ d.id }}</span>
                </div>
                <span class="row-status" :class="d.status">
                  {{ d.status === 'online' ? '在线' : '离线' }}
                </span>
                <i v-if="markedDeviceIds.has(d.id)" class="i-ant-design-environment-filled row-marked-icon" />
                <i v-else-if="pendingDevice?.id === d.id" class="i-ant-design-check-circle-filled row-check" />
              </div>
              <div v-if="filteredIotDevices.length === 0" class="drawer-empty">
                <i class="i-ant-design-api-outlined drawer-empty-icon" />
                <p class="drawer-empty-title">
                  {{ addSearchKey ? '没有找到匹配的设备' : '暂无可标记的物联设备' }}
                </p>
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
    <a-modal
      v-model:open="playModalVisible"
      :title="playTarget?.name || '视频播放'"
      :footer="null"
      :width="800"
      :body-style="{ padding: '0', background: '#000' }"
      wrap-class-name="video-player-modal"
    >
      <div class="video-player-wrap">
        <img v-if="playTarget?.thumb" :src="playTarget.thumb" class="video-player-frame" alt="视频流" />
        <div class="video-player-overlay">
          <div class="player-controls">
            <i class="i-ant-design-pause-circle-filled player-play-icon" />
            <div class="player-progress">
              <div class="player-progress-bar" />
            </div>
            <span class="player-time">实时</span>
          </div>
        </div>
        <div class="video-player-info">
          <span class="player-name">{{ playTarget?.name }}</span>
          <span class="player-status" :class="playTarget?.status">{{ playTarget?.status === 'online' ? '● LIVE' : '● 离线' }}</span>
        </div>
      </div>
    </a-modal>

    <!-- 白模生成弹窗（询问 / 处理中 / 结果 三态） -->
    <a-modal
      :open="enhanceStage !== 'idle'"
      :width="enhanceStage === 'result' ? 880 : 440"
      :footer="null"
      :closable="false"
      :mask-closable="false"
      centered
      @cancel="enhanceStage === 'result' ? cancelEnhance() : cancelAsking()"
    >
      <!-- 询问阶段 -->
      <div v-if="enhanceStage === 'asking'" class="enhance-ask">
        <div class="ask-icon-wrap">
          <i class="i-lucide-wand-sparkles ask-icon" />
        </div>
        <h3 class="ask-title">是否用 AI 根据平面图生成白模？</h3>
        <p class="ask-desc">
          AI 会自动根据您上传的原始平面图来生成白模，生成后的白模会替换原有平面图进行展示。处理过程约需 2 秒。
        </p>
        <div class="ask-actions">
          <button class="ask-btn secondary" @click="cancelAsking">暂不生成</button>
          <button class="ask-btn primary" @click="startEnhance">
            <i class="i-lucide-wand-sparkles" />
            <span>开始生成</span>
          </button>
        </div>
        <label class="ask-dont-show">
          <a-checkbox v-model:checked="askDontShow" />
          <span>不再提示，后续上传或更换图片时不自动询问</span>
        </label>
      </div>

      <!-- 处理中阶段 -->
      <div v-else-if="enhanceStage === 'processing'" class="enhance-processing">
        <i class="i-lucide-wand-sparkles processing-spin" />
        <h3 class="processing-title">AI 白模生成中</h3>
        <p class="processing-sub">正在根据平面图构建白模，请稍候...</p>
        <div class="processing-progress">
          <div class="progress-bar" />
        </div>
      </div>

      <!-- 结果阶段 -->
      <div v-else-if="enhanceStage === 'result'" class="enhance-result">
        <div class="result-header">
          <h3 class="result-title">白模生成结果预览</h3>
          <span class="result-tip">如不满意可重新生成，或直接取消还原原图</span>
        </div>
        <div class="result-compare">
          <div class="compare-item">
            <div class="compare-label">原图</div>
            <div class="compare-img-wrap" @click="openLargePreview('original')">
              <img :src="node.planImageOriginal" class="compare-img" draggable="false" alt="原图" />
              <div class="zoom-hint">
                <i class="i-ant-design-zoom-in-outlined" />
                <span>点击查看大图</span>
              </div>
            </div>
          </div>
          <i class="i-ant-design-arrow-right-outlined compare-arrow" />
          <div class="compare-item">
            <div class="compare-label highlighted">AI 生成白模</div>
            <div class="compare-img-wrap" @click="openLargePreview('enhanced')">
              <img
                :src="node.planImageOriginal"
                class="compare-img"
                :style="{ filter: enhancedFilter }"
                draggable="false"
                alt="白模生成结果"
              />
              <div class="zoom-hint">
                <i class="i-ant-design-zoom-in-outlined" />
                <span>点击查看大图</span>
              </div>
            </div>
          </div>
        </div>
        <div class="result-actions">
          <button class="result-btn cancel" @click="cancelEnhance">
            <i class="i-ant-design-close-outlined" />
            <span>取消</span>
          </button>
          <button class="result-btn regenerate" @click="regenerateEnhance">
            <i class="i-ant-design-reload-outlined" />
            <span>重新生成</span>
          </button>
          <button class="result-btn apply" @click="applyEnhance">
            <i class="i-ant-design-check-outlined" />
            <span>替换为平面图</span>
          </button>
        </div>
      </div>
    </a-modal>

    <!-- 大图预览弹窗 -->
    <a-modal
      :open="largePreviewVisible"
      :width="1000"
      :footer="null"
      :closable="true"
      centered
      wrap-class-name="large-preview-modal"
      @cancel="largePreviewVisible = false"
    >
      <div class="large-preview">
        <!-- 切换 tab -->
        <div class="large-preview-tabs">
          <button
            class="lp-tab"
            :class="{ active: largePreviewTab === 'original' }"
            @click="largePreviewTab = 'original'"
          >
            原图
          </button>
          <button
            class="lp-tab"
            :class="{ active: largePreviewTab === 'enhanced' }"
            @click="largePreviewTab = 'enhanced'"
          >
            AI 生成白模
          </button>
        </div>
        <!-- 大图画布（支持缩放/拖拽） -->
        <div
          class="large-preview-body"
          :class="{ panning: lpPanning }"
          @wheel="lpOnWheel"
          @mousedown="lpOnPanStart"
          @mousemove="lpOnPanMove"
          @mouseup="lpOnPanEnd"
          @mouseleave="lpOnPanEnd"
        >
          <img
            v-show="largePreviewTab === 'original'"
            :src="node.planImageOriginal"
            class="lp-img"
            :style="{ transform: `translate(${lpX}px, ${lpY}px) scale(${lpScale})` }"
            draggable="false"
            alt="原图"
          />
          <img
            v-show="largePreviewTab === 'enhanced'"
            :src="node.planImageOriginal"
            class="lp-img"
            :style="{ filter: enhancedFilter, transform: `translate(${lpX}px, ${lpY}px) scale(${lpScale})` }"
            draggable="false"
            alt="白模生成结果"
          />
          <!-- 缩放控件 -->
          <div class="lp-controls">
            <button class="lp-ctrl" title="缩小" @click="lpZoomOut">
              <i class="i-ant-design-minus-outlined" />
            </button>
            <span class="lp-scale">{{ Math.round(lpScale * 100) }}%</span>
            <button class="lp-ctrl" title="放大" @click="lpZoomIn">
              <i class="i-ant-design-plus-outlined" />
            </button>
            <button class="lp-ctrl" title="重置" @click="lpReset">
              <i class="i-ant-design-aim-outlined" />
            </button>
          </div>
        </div>
      </div>
    </a-modal>

  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.floor-plan-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 480px;
  position: relative;
  /* 画板式网格背景（外层容器也有，让空状态时也能看到画板感） */
  background-color: #f5f6f8;
  background-image:
    linear-gradient(to right, rgba(110, 75, 255, 0.07) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(110, 75, 255, 0.07) 1px, transparent 1px),
    linear-gradient(to right, rgba(20, 22, 30, 0.035) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(20, 22, 30, 0.035) 1px, transparent 1px);
  background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
  border-radius: 8px;
}

.hidden-file-input {
  display: none;
}

/* ===== 空状态上传 ===== */
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
  /* 半透明，让画板网格透出 */
  background: rgba(255, 255, 255, 0.5);
  backdrop-filter: blur(1px);

  &:hover {
    border-color: $color-primary;
    background: rgba(245, 240, 255, 0.7);
  }

  &.drag-over {
    border-color: $color-primary;
    background: rgba(236, 231, 255, 0.8);
  }

  .empty-inner {
    text-align: center;
    color: $text-tertiary;
    padding: 40px;

    .empty-icon {
      font-size: 56px;
      color: $color-primary;
      opacity: 0.6;
      margin-bottom: 16px;
    }

    .empty-title {
      font-size: 16px;
      font-weight: 500;
      color: $text-base;
      margin: 0 0 6px;
    }

    .empty-hint {
      font-size: 13px;
      color: $text-secondary;
      margin: 0 0 4px;
    }

    .empty-tip {
      font-size: 12px;
      color: $text-muted;
      margin: 0;
    }
  }
}

/* ===== 工具栏 ===== */
.plan-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 4px;
  flex-shrink: 0;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-right {
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
  border: 1px solid $border-color-input;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  i {
    font-size: 14px;
  }

  &:hover:not(:disabled) {
    border-color: $color-primary;
    color: $color-primary;
  }

  &.primary {
    background: $color-primary;
    border-color: $color-primary;
    color: #fff;

    &:hover {
      background: $color-primary-hover;
      border-color: $color-primary-hover;
      color: #fff;
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.zoom-group {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
  border: 1px solid $border-color-input;
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
    color: $text-secondary;
    cursor: pointer;
    border-radius: 4px;

    i {
      font-size: 12px;
    }

    &:hover {
      background: $bg-hover;
      color: $color-primary;
    }
  }

  .zoom-text {
    font-size: 12px;
    color: $text-secondary;
    min-width: 38px;
    text-align: center;
  }
}

.marker-stat {
  font-size: 12px;
  color: $text-tertiary;
  margin-left: 8px;
}

.placing-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 6px;
  color: #096dd9;
  font-size: 13px;

  i {
    font-size: 14px;
  }
}

/* ===== 画布 + 抽屉容器 ===== */
.canvas-drawer-wrap {
  flex: 1;
  position: relative;
  display: flex;
  min-height: 0;
}

/* ===== 画布 ===== */
.plan-canvas {
  flex: 1;
  position: relative;
  overflow: hidden;
  /* 画板式网格背景：细网格(20px) + 主网格(100px) 双层叠加 */
  background-color: #f5f6f8;
  background-image:
    /* 主网格线 */
    linear-gradient(to right, rgba(110, 75, 255, 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(110, 75, 255, 0.08) 1px, transparent 1px),
    /* 细网格线 */
    linear-gradient(to right, rgba(20, 22, 30, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(20, 22, 30, 0.04) 1px, transparent 1px);
  background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
  background-position: 0 0;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  cursor: grab;
  user-select: none;
  transition: margin-right 0.25s ease;

  /* 抽屉打开时，画布右侧腾出空间，避免被覆盖 */
  &.drawer-open {
    margin-right: 280px;
  }

  &.panning {
    cursor: grabbing;
  }

  &.placing {
    cursor: crosshair;
  }

  /* 拖拽进入画布时高亮 */
  &.drag-active {
    cursor: copy;
    box-shadow: inset 0 0 0 3px rgba(110, 75, 255, 0.5);
  }
}

.canvas-transform {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transform-origin: center center;
  transition: transform 0.05s linear;
}

.plan-canvas.panning .canvas-transform {
  transition: none;
}

.canvas-img {
  max-width: 96%;
  max-height: 96%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  transition: filter 0.5s ease;
}

.canvas-markers {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

/* ===== 标记外层：负责绝对定位 + hover 时显隐删除角标/标签 ===== */
.marker-wrap {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none; /* 外层不挡画布事件 */
  z-index: 2;

  /* 高亮态（hover 或 selected）：放大 + 提升层级 */
  &.highlight {
    z-index: 5;

    .marker {
      transform: scale(1.22);
    }

    .marker-del {
      opacity: 1;
      transform: translate(50%, -50%) scale(1);
    }

    .marker-label {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
}

/* ===== 标记圆点 ===== */
.marker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #fff;
  cursor: move;
  transition: transform 0.15s, box-shadow 0.15s;
  pointer-events: auto;

  i {
    font-size: 16px;
  }

  &:hover {
    transform: scale(1.18);
  }

  &.dragging {
    transition: none;
    transform: scale(1.18);
    cursor: grabbing;
  }

  /* 物联：紫色 */
  &.iot {
    box-shadow: 0 0 0 2px $color-primary, 0 2px 6px rgba(110, 75, 255, 0.3);
    i { color: $color-primary; }
  }

  /* 视频：蓝色 */
  &.video {
    box-shadow: 0 0 0 2px #1890ff, 0 2px 6px rgba(24, 144, 255, 0.3);
    i { color: #1890ff; }
  }

  /* 离线：灰色 */
  &.offline {
    box-shadow: 0 0 0 2px #bfbfbf, 0 2px 6px rgba(0, 0, 0, 0.1);
    i { color: #bfbfbf !important; }
  }
}

/* 右上角红色删除角标：默认隐藏，marker hover 或 wrap.highlight 时显示 */
.marker-del {
  position: absolute;
  top: 0;
  right: 0;
  transform: translate(50%, -50%) scale(0.6);
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: #ff4d4f;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, transform 0.15s;
  pointer-events: auto;
  box-shadow: 0 1px 4px rgba(255, 77, 79, 0.4);
  z-index: 4;

  i {
    /* Iconify 用 mask 渲染，font-size 不直接控制尺寸；用 transform scale 放大 */
    transform: scale(1.6);
    transform-origin: center;
  }

  &:hover {
    background: #d9363e;
    transform: translate(50%, -50%) scale(1.15);
  }
}

/* marker:hover 时也显示（无需 wrap.highlight） */
.marker:hover ~ .marker-del,
.marker-wrap:hover .marker-del {
  opacity: 1;
  transform: translate(50%, -50%) scale(1);
}

.marker-wrap:hover .marker-label {
  opacity: 1;
  transform: translate(-50%, 0);
}

/* 设备名小气泡：marker 下方，hover/selected 时显示 */
.marker-label {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translate(-50%, -4px);
  margin-top: 6px;
  padding: 3px 8px;
  background: rgba(20, 22, 30, 0.85);
  color: #fff;
  font-size: 11px;
  border-radius: 4px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.15s, transform 0.15s;
  pointer-events: none;
  z-index: 4;

  &::before {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-bottom-color: rgba(20, 22, 30, 0.85);
  }
}

/* ===== 右侧滑出抽屉 ===== */
.device-drawer {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  background: #fff;
  border-left: 1px solid $border-color-card;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 12px rgba(20, 22, 30, 0.06);
  z-index: 5;
}

/* 抽屉滑入/滑出动画 */
.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(20px);
  opacity: 0;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px 8px;

  .drawer-title {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
  }

  .drawer-close {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    color: $text-secondary;
    cursor: pointer;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;

    i { font-size: 14px; }

    &:hover {
      background: $bg-hover;
      color: $color-primary;
    }
  }
}

.drawer-subtitle {
  padding: 0 14px 10px;
  font-size: 12px;
  color: $text-tertiary;
  line-height: 1.5;
}

/* 视联/物联 切换 tab */
.drawer-cat {
  display: flex;
  gap: 4px;
  padding: 0 14px 10px;
  background: #f5f6f8;
  margin: 0 10px 10px;
  border-radius: 6px;
  padding: 4px;

  .drawer-cat-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 28px;
    font-size: 13px;
    color: $text-secondary;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.15s;

    i {
      font-size: 14px;
    }

    &:hover {
      color: $color-primary;
    }

    &.active {
      background: #fff;
      color: $color-primary;
      box-shadow: 0 1px 3px rgba(20, 22, 30, 0.08);
    }
  }
}

.drawer-search-wrap {
  padding: 0 14px 10px;
}

.drawer-list {
  flex: 1;
  overflow-y: auto;
  border-top: 1px solid $border-color-card;
}

.drawer-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid $border-color-card;
  transition: background 0.15s;

  &:last-child { border-bottom: none; }

  &:hover:not(.disabled) {
    background: $color-primary-bg;
  }

  /* 已选中（待放置）状态 */
  &.selected {
    background: $color-primary-bg;
    box-shadow: inset 3px 0 0 $color-primary;
  }

  /* 联动高亮（画布 marker hover/select 时）：橙色描边 + 暖色背景 */
  &.highlight {
    background: #fff7e6;
    box-shadow: inset 3px 0 0 #fa8c16;
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .row-icon {
    font-size: 18px;
    color: $color-primary;
    flex-shrink: 0;
  }

  .row-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;

    .row-name {
      font-size: 13px;
      color: $text-base;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .row-id {
      font-size: 11px;
      color: $text-muted;
      font-family: monospace;
    }
  }

  .row-type {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    flex-shrink: 0;

    &.video {
      color: #096dd9;
      background: #e6f7ff;
    }
    &.iot {
      color: $color-primary;
      background: $color-primary-bg;
    }
  }

  .row-status {
    font-size: 11px;
    flex-shrink: 0;

    &.online { color: $color-online; }
    &.offline { color: #bfbfbf; }
  }

  /* 已标记：绿色圆形背景 + 白色定位图标 */
  .row-marked-icon {
    width: 22px;
    height: 22px;
    line-height: 22px;
    text-align: center;
    font-size: 12px;
    color: #fff;
    background: $color-primary;
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.85);
  }

  .row-check {
    font-size: 14px;
    color: $color-primary;
    flex-shrink: 0;
  }

  .row-place {
    font-size: 14px;
    color: $text-muted;
    flex-shrink: 0;
  }
}

/* 旋转动画（供 versions-loading 用） */
@keyframes enhance-spin {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
}

/* ===== 白模生成按钮（魔法棒渐变紫） ===== */
.tool-btn.enhance-btn {
  border: 1px solid #d9cfff;
  background: linear-gradient(135deg, #f5f0ff, #ece7ff);
  color: $color-primary;

  i {
    font-size: 17px;
    color: $color-primary;
    /* 魔法棒图标：发光动效 */
    filter: drop-shadow(0 0 3px rgba(110, 75, 255, 0.5));
    animation: magic-glow 2.4s ease-in-out infinite;
  }

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, $color-primary, $color-primary-hover);
    color: #fff;
    border-color: $color-primary;

    i {
      filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.7));
    }
  }

  /* 已美化状态：浅绿色调 */
  &.enhanced {
    border-color: #b7eb8f;
    background: #f6ffed;
    color: #389e0d;

    i {
      animation: none;
      filter: none;
    }

    &:hover:not(:disabled) {
      background: $color-online;
      border-color: $color-online;
      color: #fff;
    }
  }
}

@keyframes magic-glow {
  0%, 100% { filter: drop-shadow(0 0 2px rgba(110, 75, 255, 0.35)); }
  50% { filter: drop-shadow(0 0 5px rgba(110, 75, 255, 0.7)); }
}


/* ===== 白模生成弹窗（询问 / 处理中 / 结果）===== */

/* —— 询问阶段 —— */
.enhance-ask {
  text-align: center;
  padding: 12px 8px 4px;

  .ask-icon-wrap {
    width: 64px;
    height: 64px;
    margin: 0 auto 14px;
    border-radius: 50%;
    background: linear-gradient(135deg, $color-primary-bg, #e0d4ff);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ask-icon {
    font-size: 32px;
    color: $color-primary;
  }

  .ask-title {
    font-size: 17px;
    font-weight: 600;
    color: $text-base;
    margin: 0 0 10px;
  }

  .ask-desc {
    font-size: 13px;
    color: $text-secondary;
    line-height: 1.7;
    margin: 0 0 20px;
    text-align: left;
    background: #fafbfc;
    padding: 12px;
    border-radius: 8px;
    border: 1px solid $border-color-card;
  }

  .ask-actions {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  /* 不再提示 复选框 */
  .ask-dont-show {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 14px;
    font-size: 12px;
    color: $text-tertiary;
    cursor: pointer;
    user-select: none;

    span {
      line-height: 1.5;
    }
  }

  .ask-btn {
    flex: 1;
    height: 36px;
    border-radius: 8px;
    font-size: 14px;
    cursor: pointer;
    font-family: inherit;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    transition: all 0.15s;

    i { font-size: 15px; }

    &.secondary {
      border: 1px solid $border-color-input;
      background: #fff;
      color: $text-secondary;

      &:hover {
        border-color: $text-muted;
        color: $text-base;
      }
    }

    &.primary {
      border: none;
      background: linear-gradient(135deg, $color-primary, $color-primary-hover);
      color: #fff;

      &:hover {
        opacity: 0.9;
      }
    }
  }
}

/* —— 处理中阶段 —— */
.enhance-processing {
  text-align: center;
  padding: 30px 8px 20px;

  .processing-spin {
    font-size: 48px;
    color: $color-primary;
    margin-bottom: 18px;
    display: inline-block;
    animation: enhance-spin 1.4s linear infinite;
  }

  .processing-title {
    font-size: 17px;
    font-weight: 600;
    color: $text-base;
    margin: 0 0 6px;
  }

  .processing-sub {
    font-size: 13px;
    color: $text-tertiary;
    margin: 0 0 18px;
  }

  .processing-progress {
    width: 80%;
    margin: 0 auto;
    height: 4px;
    background: $border-color-card;
    border-radius: 2px;
    overflow: hidden;

    .progress-bar {
      height: 100%;
      width: 40%;
      background: linear-gradient(90deg, $color-primary, $color-primary-hover);
      border-radius: 2px;
      animation: enhance-loading 1.6s ease-in-out infinite;
    }
  }
}

@keyframes enhance-loading {
  0% { width: 10%; transform: translateX(-20%); }
  50% { width: 60%; }
  100% { width: 80%; transform: translateX(140%); }
}

@keyframes enhance-spin {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
}

/* —— 结果阶段 —— */
.enhance-result {
  padding: 8px 4px 4px;

  .result-header {
    display: flex;
    align-items: baseline;
    gap: 12px;
    margin-bottom: 16px;

    .result-title {
      font-size: 17px;
      font-weight: 600;
      color: $text-base;
      margin: 0;
    }

    .result-tip {
      font-size: 12px;
      color: $text-tertiary;
    }
  }

  .result-compare {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;

    .compare-item {
      flex: 1;
      min-width: 0;
    }

    .compare-label {
      font-size: 12px;
      color: $text-tertiary;
      margin-bottom: 6px;

      &.highlighted {
        color: $color-primary;
        font-weight: 500;
      }
    }

    .compare-img-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 4 / 3;
      border-radius: 8px;
      overflow: hidden;
      background: #1a1a2e;
      border: 1px solid $border-color-card;
      cursor: zoom-in;
      transition: border-color 0.15s, box-shadow 0.15s;

      &:hover {
        border-color: $color-primary;
        box-shadow: 0 4px 12px rgba(110, 75, 255, 0.15);

        .zoom-hint {
          opacity: 1;
        }
      }

      /* hover 时显示的"点击查看大图"提示 */
      .zoom-hint {
        position: absolute;
        bottom: 8px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        background: rgba(0, 0, 0, 0.65);
        color: #fff;
        font-size: 11px;
        border-radius: 12px;
        opacity: 0;
        transition: opacity 0.15s;
        pointer-events: none;
        white-space: nowrap;

        i {
          font-size: 12px;
        }
      }
    }

    .compare-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .compare-arrow {
      font-size: 20px;
      color: $text-muted;
      flex-shrink: 0;
    }
  }

  .result-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding-top: 14px;
    border-top: 1px solid $border-color-card;
  }

  .result-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 34px;
    padding: 0 16px;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;

    i { font-size: 14px; }

    &.cancel {
      border: 1px solid $border-color-input;
      background: #fff;
      color: $text-secondary;

      &:hover {
        border-color: $text-muted;
        color: $text-base;
      }
    }

    &.regenerate {
      border: 1px solid $color-primary;
      background: #fff;
      color: $color-primary;

      &:hover {
        background: $color-primary-bg;
      }
    }

    &.apply {
      border: none;
      background: linear-gradient(135deg, $color-primary, $color-primary-hover);
      color: #fff;

      &:hover {
        opacity: 0.9;
      }
    }
  }
}

/* —— 大图预览弹窗 —— */
.large-preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px;
}

.large-preview-tabs {
  display: flex;
  gap: 6px;
  padding: 4px;
  background: #f5f6f8;
  border-radius: 6px;
  align-self: flex-start;

  .lp-tab {
    padding: 4px 16px;
    border: none;
    background: transparent;
    color: $text-secondary;
    font-size: 13px;
    cursor: pointer;
    border-radius: 4px;
    font-family: inherit;
    transition: all 0.15s;

    &:hover {
      color: $color-primary;
    }

    &.active {
      background: #fff;
      color: $color-primary;
      box-shadow: 0 1px 3px rgba(20, 22, 30, 0.08);
    }
  }
}

.large-preview-body {
  position: relative;
  width: 100%;
  height: 70vh;
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  user-select: none;

  &.panning {
    cursor: grabbing;
  }

  .lp-img {
    max-width: 96%;
    max-height: 96%;
    object-fit: contain;
    display: block;
    pointer-events: none;
    transition: transform 0.05s linear;
  }

  /* 缩放控件（右下角悬浮） */
  .lp-controls {
    position: absolute;
    bottom: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 6px;
    backdrop-filter: blur(4px);
  }

  .lp-ctrl {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: none;
    background: transparent;
    color: #fff;
    cursor: pointer;
    border-radius: 4px;

    i {
      font-size: 13px;
    }

    &:hover {
      background: rgba(255, 255, 255, 0.15);
    }
  }

  .lp-scale {
    min-width: 42px;
    text-align: center;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.85);
  }
}

/* ===== 视频网关分组 + 卡片网格 ===== */
.opt-gw-group {
  border-bottom: 1px solid $border-color-card;
}

.opt-gw-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f7f8fa;
  cursor: pointer;
  position: sticky;
  top: 0;
  z-index: 1;

  .opt-gw-icon {
    font-size: 14px;
  }

  .opt-gw-name {
    font-size: 12px;
    font-weight: 600;
    color: $text-base;
  }

  .opt-gw-count {
    font-size: 11px;
    color: $text-tertiary;
    margin-left: auto;
  }

  .opt-gw-arrow {
    font-size: 10px;
    color: $text-muted;
  }
}

/* 摄像头卡片网格：窄面板用 2 列 */
.opt-cam-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 10px;
}

.opt-cam-card {
  border: 1px solid $border-color-card;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.15s;
  background: #fff;

  &:hover {
    border-color: $color-primary;
  }

  &.selected {
    border-color: $color-primary;
    box-shadow: 0 0 0 2px rgba(110, 75, 255, 0.25);
  }

  /* 联动高亮（画布 marker hover/select 时）：橙色描边 + 暖色阴影 */
  &.highlight {
    border-color: #fa8c16;
    box-shadow: 0 0 0 2px rgba(250, 140, 22, 0.3), 0 2px 8px rgba(250, 140, 22, 0.2);
    background: #fff7e6;
  }

  &.marked {
    opacity: 0.55;
    cursor: not-allowed;

    &:hover {
      border-color: $border-color-card;
    }
  }

  .opt-cam-thumb {
    position: relative;
    aspect-ratio: 16 / 10;
    background: #1a1a2e;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    /* 已标记遮罩：绿色圆形背景 + 定位图标 */
    .opt-cam-marked-mask {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;

      i {
        width: 32px;
        height: 32px;
        line-height: 32px;
        text-align: center;
        font-size: 16px;
        color: #fff;
        background: $color-primary;
        border-radius: 50%;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85);
      }
    }

    /* 待放置遮罩 */
    .opt-cam-selected-mask {
      position: absolute;
      inset: 0;
      background: rgba(110, 75, 255, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      color: #fff;
      font-size: 12px;

      i {
        font-size: 18px;
      }
    }
  }

  .opt-cam-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
    padding: 5px 7px;

    .opt-cam-name {
      font-size: 12px;
      color: $text-base;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
      min-width: 0;
    }
  }
}

.opt-cam-status {
  font-size: 10px;
  padding: 1px 4px;
  border-radius: 3px;
  flex-shrink: 0;

  &.online {
    color: $color-online;
    background: $color-online-bg;
  }

  &.offline {
    color: #bfbfbf;
    background: rgba(191, 191, 191, 0.1);
  }
}

.drawer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-top: 1px solid $border-color-card;
  background: #fafbfc;

  .footer-stat {
    font-size: 12px;
    color: $text-tertiary;
  }

  .footer-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border: 1px solid $border-color-input;
    border-radius: 6px;
    background: #fff;
    color: $text-secondary;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;

    i { font-size: 12px; }

    &:hover:not(:disabled) {
      color: $color-primary;
      border-color: $color-primary;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }
}

/* 抽屉空状态 */
.drawer-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px 20px;
  text-align: center;

  .drawer-empty-icon {
    font-size: 40px;
    color: $text-muted;
    opacity: 0.4;
    margin-bottom: 12px;
  }

  .drawer-empty-title {
    font-size: 13px;
    color: $text-secondary;
    margin: 0 0 4px;
  }

  .drawer-empty-hint {
    font-size: 11px;
    color: $text-muted;
    margin: 0;
    line-height: 1.5;
  }
}

.empty-list {
  padding: 40px 0;
  text-align: center;
  color: $text-tertiary;
  font-size: 13px;
}

/* ===== 拖拽相关样式 ===== */
/* 设备项可拖拽的视觉提示 */
.opt-cam-card,
.drawer-row {
  /* 标记过的（disabled）不允许拖 */
  &.marked,
  &.disabled {
    cursor: not-allowed;
  }
}

.opt-cam-card:not(.marked),
.drawer-row:not(.disabled) {
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

/* 拖拽中源元素半透明 */
.opt-cam-card:not(.marked):where([draggable="true"]):active,
.drawer-row:not(.disabled):where([draggable="true"]):active {
  opacity: 0.6;
}

/* 全局跟随鼠标的拖拽预览（圆形徽章） */
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

  i {
    font-size: 16px;
  }

  /* 视频设备：蓝色 */
  &.video i {
    color: #1890ff;
  }

  /* 物联设备：紫色 */
  &.iot i {
    color: $color-primary;
  }
}

/* ===== 视频播放弹窗 ===== */
.video-player-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
  overflow: hidden;

  .video-player-frame {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .video-player-overlay {
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

  .video-player-info {
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
</style>
