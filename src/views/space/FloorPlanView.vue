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
    props.node.planImage = reader.result as string
    // 上传成功后，弹出二次提示询问是否进行 AI 美化
    nextTick(() => {
      enhanceAskVisible.value = true
    })
  }
  reader.readAsDataURL(file)
}

// ===== AI 美化（弹窗模式：原图 + 多边形区域 + 提示词 + 多轮次）=====

// 上传后的二次提示弹窗（确认 → 进入美化大弹窗）
const enhanceAskVisible = ref(false)

// 用户确认美化：关闭询问 → 打开美化大弹窗
function confirmEnhanceAsk() {
  enhanceAskVisible.value = false
  enhanceModalVisible.value = true
}

// 用户暂不美化
function cancelEnhanceAsk() {
  enhanceAskVisible.value = false
}

// 区域标记（多边形）
interface EnhanceRegion {
  id: string
  points: { x: number; y: number }[]  // 0~100 百分比
  label: string
  closed: boolean
}

// 美化生成轮次
interface EnhanceVersion {
  id: string
  filter: string   // 模拟美化的 CSS filter
  prompt: string
  regionCount: number
  createdAt: number
}

// 弹窗开关
const enhanceModalVisible = ref(false)
// 当前生成中的 loading
const enhancing = ref(false)
// 所有轮次（最新在末尾）
const enhanceVersions = ref<EnhanceVersion[]>([])
// 当前选中的轮次 id
const currentVersionId = ref<string>('')
// 提示词
const enhancePrompt = ref('')

// 用户绘制的区域（多边形）
const enhanceRegions = ref<EnhanceRegion[]>([])
// 正在绘制的多边形（未闭合）
const drawingPoints = ref<{ x: number; y: number }[]>([])
const isDrawing = ref(false)
// 选中的区域 id
const selectedRegionId = ref<string>('')
// 鼠标当前位置（绘制时实时显示橡皮筋线）
const cursorPos = reactive({ x: 0, y: 0 })

// 当前选中的轮次
const currentVersion = computed(() => enhanceVersions.value.find(v => v.id === currentVersionId.value))

// 当前应用的 filter（来自选中轮次）
const currentFilter = computed(() => currentVersion.value?.filter || 'none')

// 已闭合区域的汇总文案
const regionsSummary = computed(() => {
  const closed = enhanceRegions.value.filter(r => r.closed)
  if (closed.length === 0) return ''
  return closed.map((r, i) => `${toCircledNumber(i + 1)}${r.label}`).join('  ')
})

// 打开美化弹窗
function openEnhanceModal() {
  enhanceModalVisible.value = true
}

// 弹窗打开时的初始化：备份原图，重置区域和轮次
watch(enhanceModalVisible, (open) => {
  if (open) {
    // 备份原图（仅首次打开时）
    if (!props.node.planImageOriginal) {
      props.node.planImageOriginal = props.node.planImage
    }
    // 重置绘制状态
    enhanceRegions.value = []
    drawingPoints.value = []
    isDrawing.value = false
    selectedRegionId.value = ''
    enhancePrompt.value = ''
    // 保留之前已有的轮次（如果有）
  }
})

// ===== 多边形绘制 =====
// 进入绘制模式
function startDrawRegion() {
  isDrawing.value = true
  drawingPoints.value = []
  selectedRegionId.value = ''
}

// 画布点击：添加顶点 / 选中区域
function onEnhanceCanvasClick(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  if (x < 0 || x > 100 || y < 0 || y > 100) return

  if (isDrawing.value) {
    drawingPoints.value.push({ x, y })
  }
}

// 鼠标移动：更新橡皮筋预览线终点
function onEnhanceCanvasMove(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  cursorPos.x = ((e.clientX - rect.left) / rect.width) * 100
  cursorPos.y = ((e.clientY - rect.top) / rect.height) * 100
}

// 双击 / 回车：闭合当前多边形
function closeCurrentPolygon() {
  if (!isDrawing.value || drawingPoints.value.length < 3) return
  const idx = enhanceRegions.value.filter(r => r.closed).length + 1
  enhanceRegions.value.push({
    id: 'r-' + Date.now(),
    points: [...drawingPoints.value],
    label: `区域${idx}`,
    closed: true
  })
  drawingPoints.value = []
  isDrawing.value = false
}

// 取消正在绘制的多边形
function cancelDrawRegion() {
  drawingPoints.value = []
  isDrawing.value = false
}

// 删除某个区域
function deleteRegion(region: EnhanceRegion) {
  enhanceRegions.value = enhanceRegions.value.filter(r => r.id !== region.id)
  if (selectedRegionId.value === region.id) selectedRegionId.value = ''
}

// 清除所有区域
function clearAllRegions() {
  enhanceRegions.value = []
  drawingPoints.value = []
  isDrawing.value = false
  selectedRegionId.value = ''
}

// 选中区域
function selectRegion(region: EnhanceRegion) {
  if (isDrawing.value) return
  selectedRegionId.value = selectedRegionId.value === region.id ? '' : region.id
}

// 弹窗键盘事件：Enter 闭合、Esc 取消绘制/关闭弹窗、Delete 删除选中区域
function onEnhanceKeydown(e: KeyboardEvent) {
  if (!enhanceModalVisible.value) return
  if (e.key === 'Enter' && isDrawing.value) {
    e.preventDefault()
    closeCurrentPolygon()
  } else if (e.key === 'Escape') {
    if (isDrawing.value) {
      cancelDrawRegion()
    }
  } else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedRegionId.value && !isDrawing.value) {
      e.preventDefault()
      const region = enhanceRegions.value.find(r => r.id === selectedRegionId.value)
      if (region) deleteRegion(region)
    }
  }
}

// 计算多边形 svg points 字符串
function pointsToStr(points: { x: number; y: number }[]): string {
  return points.map(p => `${p.x},${p.y}`).join(' ')
}

// 编号转圈号（1→① 2→②...）
function toCircledNumber(n: number): string {
  const map = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']
  return map[n - 1] || String(n)
}

// 计算多边形质心（用于放编号角标）
function regionCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
  if (points.length === 0) return { x: 50, y: 50 }
  const sx = points.reduce((s, p) => s + p.x, 0)
  const sy = points.reduce((s, p) => s + p.y, 0)
  return { x: sx / points.length, y: sy / points.length }
}

// ===== 多轮次生成 =====
// 生成新一轮（mock：用原图 + 随机 filter 模拟）
function generateVersion() {
  if (enhancing.value) return
  enhancing.value = true
  // 根据 prompt 长度和区域数微调 filter，让多轮视觉上有差异
  const seed = (enhancePrompt.value.length + enhanceRegions.value.filter(r => r.closed).length * 7 + enhanceVersions.value.length * 13) % 100
  const sat = 1.2 + (seed % 30) / 100         // 1.20~1.49
  const con = 1.1 + ((seed * 3) % 16) / 100    // 1.10~1.25
  const bri = 1.0 + ((seed * 5) % 11) / 100    // 1.00~1.10
  const hue = -10 + ((seed * 7) % 16)          // -10~+5
  const filter = `saturate(${sat.toFixed(2)}) contrast(${con.toFixed(2)}) brightness(${bri.toFixed(2)}) hue-rotate(${hue}deg)`
  // 模拟 AI 处理耗时
  setTimeout(() => {
    const version: EnhanceVersion = {
      id: 'v-' + Date.now(),
      filter,
      prompt: enhancePrompt.value,
      regionCount: enhanceRegions.value.filter(r => r.closed).length,
      createdAt: Date.now()
    }
    enhanceVersions.value.push(version)
    selectVersion(version)
    enhancing.value = false
  }, 1800)
}

// 选中某个轮次
function selectVersion(v: EnhanceVersion) {
  currentVersionId.value = v.id
  applyVersion(v)
}

// 把某个轮次应用到画布
function applyVersion(_v: EnhanceVersion) {
  // 生成即生效：直接更新画布显示（用 planImageOriginal + 该轮 filter）
  props.node.planImage = props.node.planImageOriginal
  props.node.planImageEnhanced = true
  // filter 通过 currentFilter computed 在模板上应用
}

// 底部三按钮
// 重新生成 = generateVersion
function onRegenerate() {
  generateVersion()
}

// 保存：关闭弹窗，保留当前画布状态
function onEnhanceSave() {
  enhanceModalVisible.value = false
}

// 取消：还原到打开弹窗前的状态
function onEnhanceCancel() {
  // 还原原图
  if (props.node.planImageOriginal) {
    props.node.planImage = props.node.planImageOriginal
  }
  props.node.planImageEnhanced = false
  // 清空轮次（取消等于放弃所有生成结果）
  enhanceVersions.value = []
  currentVersionId.value = ''
  enhanceModalVisible.value = false
}

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

// 物联设备：点选
function chooseDevice(d: BoundDevice) {
  if (markedDeviceIds.value.has(d.id)) return
  if (pendingDevice.value?.id === d.id) {
    pendingDevice.value = null
    viewMode.value = 'view'
    return
  }
  pendingDevice.value = d
  viewMode.value = 'place'
}

// 视频设备：点选卡片（拿到对应 BoundDevice）
function chooseVideoCam(_gw: VideoGwGroup, cam: VideoCamItem) {
  if (markedDeviceIds.value.has(cam.id)) return
  // 再次点同一摄像头 → 取消
  if (pendingDevice.value?.id === cam.id) {
    pendingDevice.value = null
    viewMode.value = 'view'
    return
  }
  pendingDevice.value = {
    id: cam.id, name: cam.name, type: 'video',
    status: cam.status, icon: 'i-ant-design-video-camera-outlined',
    thumb: cam.thumb, gateway: _gw.name
  }
  viewMode.value = 'place'
}

function cancelPlace() {
  viewMode.value = 'view'
  pendingDevice.value = null
}

// ===== 画布点击：放置标记 =====
const canvasRef = ref<HTMLDivElement | null>(null)

function onCanvasClick(e: MouseEvent) {
  if (viewMode.value !== 'place' || !pendingDevice.value) return
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  // 相对画布百分比，画布是 contain 模式，但 markers 层与图片层同尺寸
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  if (x < 0 || x > 100 || y < 0 || y > 100) return

  placeMarker(pendingDevice.value, x, y)

  // 单设备单标记语义：放置后该设备变为已标记，自动取消选中并退出 place 模式
  // （如需连续放置多个不同设备，可在抽屉里继续点选下一个）
  pendingDevice.value = null
  viewMode.value = 'view'
}

// 公共：放置一个标记到指定百分比坐标（写入草稿）
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

// 取消 place 模式的 Esc 快捷键 + 弹窗内的 Enter/Esc/Delete
function onKeydown(e: KeyboardEvent) {
  if (enhanceModalVisible.value) {
    onEnhanceKeydown(e)
    return
  }
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
          <!-- AI 美化（紧跟更换图片） -->
          <button
            class="tool-btn enhance-btn"
            :class="{ enhanced: node.planImageEnhanced }"
            @click="openEnhanceModal"
          >
            <i class="i-ant-design-highlight-filled" />
            <span>{{ node.planImageEnhanced ? '重新美化' : 'AI 美化' }}</span>
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
            <span v-if="viewMode === 'place'" class="placing-hint">
              <i class="i-ant-design-environment-outlined" />
              点击画布放置：{{ pendingDevice?.name }}
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
          :class="{ placing: viewMode === 'place', panning: isPanning, 'drawer-open': drawerOpen, 'drag-active': dragGhostVisible }"
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
              <div v-if="filteredVideoGws.length === 0" class="empty-list">暂无可选摄像头</div>
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
              <div v-if="filteredIotDevices.length === 0" class="empty-list">暂无可选设备</div>
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

    <!-- 上传后二次提示：是否进行 AI 美化 -->
    <a-modal
      v-model:open="enhanceAskVisible"
      :width="440"
      :footer="null"
      :closable="false"
      centered
    >
      <div class="enhance-ask">
        <div class="ask-icon-wrap">
          <i class="i-ant-design-highlight-filled ask-icon" />
        </div>
        <h3 class="ask-title">是否用 AI 美化平面图？</h3>
        <p class="ask-desc">
          检测到原始平面图。AI 美化能自动增强色彩、提升清晰度，并支持在原图上标记重点区域、用提示词描述需求，让平面图更直观易读。
        </p>
        <div class="ask-actions">
          <button class="ask-btn secondary" @click="cancelEnhanceAsk">暂不美化</button>
          <button class="ask-btn primary" @click="confirmEnhanceAsk">
            <i class="i-ant-design-highlight-filled" />
            <span>开始美化</span>
          </button>
        </div>
      </div>
    </a-modal>

    <!-- AI 美化大弹窗 -->
    <a-modal
      v-model:open="enhanceModalVisible"
      title="AI 美化平面图"
      :width="900"
      :footer="null"
      centered
      :mask-closable="false"
      wrap-class-name="enhance-modal-wrap"
    >
      <div class="enhance-modal">
        <!-- 主体：左侧画布 + 右侧轮次列表 -->
        <div class="enhance-body">
          <!-- 左侧：原图 + 多边形标记 -->
          <div class="enhance-canvas-section">
            <div
              class="enhance-canvas"
              :class="{ drawing: isDrawing }"
              @click="onEnhanceCanvasClick"
              @mousemove="onEnhanceCanvasMove"
              @dblclick="closeCurrentPolygon"
            >
              <img
                :src="node.planImageOriginal || node.planImage"
                class="enhance-origin-img"
                :style="{ filter: currentFilter }"
                draggable="false"
                alt="原图"
              />
              <!-- SVG 层：绘制多边形 -->
              <svg class="enhance-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <!-- 已闭合区域 -->
                <polygon
                  v-for="region in enhanceRegions.filter(r => r.closed)"
                  :key="region.id"
                  :points="pointsToStr(region.points)"
                  :class="['region-poly', { selected: selectedRegionId === region.id }]"
                  @click.stop="selectRegion(region)"
                />
                <!-- 正在绘制的多边形（含橡皮筋预览线） -->
                <polyline
                  v-if="drawingPoints.length > 0"
                  :points="pointsToStr(drawingPoints.length > 0 ? [...drawingPoints, cursorPos] : [])"
                  class="region-draft-line"
                />
                <!-- 已绘制的顶点 -->
                <circle
                  v-for="(p, i) in drawingPoints"
                  :key="'dp' + i"
                  :cx="p.x"
                  :cy="p.y"
                  :r="0.8"
                  class="region-vertex"
                />
              </svg>
              <!-- 区域编号角标 -->
              <div
                v-for="(region, idx) in enhanceRegions.filter(r => r.closed)"
                :key="'badge' + region.id"
                class="region-badge"
                :class="{ selected: selectedRegionId === region.id }"
                :style="{ left: regionCentroid(region.points).x + '%', top: regionCentroid(region.points).y + '%' }"
                @click.stop="selectRegion(region)"
              >
                {{ toCircledNumber(idx + 1) }}
                <span class="badge-label">{{ region.label }}</span>
                <i v-if="selectedRegionId === region.id" class="badge-del i-ant-design-close-outlined" @click.stop="deleteRegion(region)" />
              </div>
              <!-- 绘制中提示 -->
              <div v-if="isDrawing" class="drawing-hint">
                <i class="i-ant-design-edit-outlined" />
                <span v-if="drawingPoints.length === 0">点击原图添加顶点，开始绘制区域</span>
                <span v-else>已添加 {{ drawingPoints.length }} 个顶点，双击或回车闭合（Esc 取消）</span>
              </div>
            </div>

            <!-- 左侧底部工具条 -->
            <div class="regions-bar">
              <button class="region-btn" :class="{ active: isDrawing }" @click="startDrawRegion">
                <i class="i-ant-design-plus-outlined" />
                <span>标记区域</span>
              </button>
              <button class="region-btn" :disabled="enhanceRegions.length === 0" @click="clearAllRegions">
                <i class="i-ant-design-clear-outlined" />
                <span>清除全部</span>
              </button>
              <span v-if="regionsSummary" class="regions-summary">已标记：{{ regionsSummary }}</span>
            </div>
          </div>

          <!-- 右侧：轮次列表 -->
          <div class="enhance-versions">
            <div class="versions-header">
              <span>生成轮次</span>
              <span class="versions-count">{{ enhanceVersions.length }}</span>
            </div>

            <!-- 生成中 loading -->
            <div v-if="enhancing" class="versions-loading">
              <i class="i-ant-design-highlight-filled versions-spin" />
              <span>AI 生成中...</span>
            </div>

            <!-- 空状态 -->
            <div v-else-if="enhanceVersions.length === 0" class="versions-empty">
              <i class="i-ant-design-picture-outlined" />
              <p>暂无生成结果</p>
              <p class="empty-sub">输入提示词、标记区域后，点击下方"重新生成"</p>
            </div>

            <!-- 轮次列表（最新在顶部） -->
            <div class="versions-list scroll-thin">
              <div
                v-for="v in [...enhanceVersions].reverse()"
                :key="v.id"
                class="version-item"
                :class="{ active: currentVersionId === v.id }"
                @click="selectVersion(v)"
              >
                <div class="version-thumb">
                  <img :src="node.planImageOriginal" :style="{ filter: v.filter }" alt="缩略图" />
                </div>
                <div class="version-meta">
                  <span class="version-title">第 {{ enhanceVersions.indexOf(v) + 1 }} 轮</span>
                  <span class="version-prompt">{{ v.prompt || '未输入提示词' }}</span>
                  <span class="version-regions">{{ v.regionCount }} 个区域</span>
                </div>
                <i v-if="currentVersionId === v.id" class="i-ant-design-check-circle-filled version-check" />
              </div>
            </div>
          </div>
        </div>

        <!-- 提示词输入 -->
        <div class="enhance-prompt-section">
          <label class="prompt-label">
            <i class="i-ant-design-message-outlined" />
            <span>美化提示词</span>
          </label>
          <a-textarea
            v-model:value="enhancePrompt"
            placeholder="描述你想要的美化效果，例如：增强色彩饱和度，让线条更清晰，添加柔和阴影，整体偏暖色调..."
            :rows="2"
            class="enhance-prompt-input"
          />
        </div>

        <!-- 底部三按钮 -->
        <div class="enhance-footer">
          <button class="enhance-action-btn secondary" @click="onEnhanceCancel">
            取消
          </button>
          <button class="enhance-action-btn outline" :disabled="enhanceVersions.length === 0" @click="onEnhanceSave">
            保存
          </button>
          <button class="enhance-action-btn primary" :disabled="enhancing" @click="onRegenerate">
            <i class="i-ant-design-highlight-filled" />
            <span>{{ enhancing ? '生成中...' : (enhanceVersions.length === 0 ? '开始美化' : '重新生成') }}</span>
          </button>
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
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 6px;
  color: #d46b08;
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

    &.online { color: #52c41a; }
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
    background: #52c41a;
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

/* ===== AI 美化按钮（魔法棒渐变紫） ===== */
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
      background: #52c41a;
      border-color: #52c41a;
      color: #fff;
    }
  }
}

@keyframes magic-glow {
  0%, 100% { filter: drop-shadow(0 0 2px rgba(110, 75, 255, 0.35)); }
  50% { filter: drop-shadow(0 0 5px rgba(110, 75, 255, 0.7)); }
}

/* ===== 上传后二次提示弹窗 ===== */
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

/* ===== AI 美化大弹窗 ===== */
.enhance-modal {
  display: flex;
  flex-direction: column;
}

.enhance-body {
  display: flex;
  gap: 16px;
  height: 420px;
}

/* 左侧画布区 */
.enhance-canvas-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.enhance-canvas {
  flex: 1;
  position: relative;
  background: #1a1a2e;
  border-radius: 8px;
  overflow: hidden;
  cursor: crosshair;

  &.drawing {
    cursor: crosshair;
  }

  .enhance-origin-img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
    transition: filter 0.4s ease;
  }

  .enhance-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  /* 多边形填充与边框 */
  :deep(.region-poly) {
    fill: rgba(110, 75, 255, 0.18);
    stroke: $color-primary;
    stroke-width: 0.4;
    stroke-dasharray: none;
    cursor: pointer;
    pointer-events: auto;
    transition: fill 0.15s;

    &:hover {
      fill: rgba(110, 75, 255, 0.28);
    }

    &.selected {
      fill: rgba(110, 75, 255, 0.35);
      stroke: $color-primary-hover;
      stroke-width: 0.6;
    }
  }

  :deep(.region-draft-line) {
    fill: none;
    stroke: $color-primary;
    stroke-width: 0.4;
    stroke-dasharray: 1 1;
    pointer-events: none;
  }

  :deep(.region-vertex) {
    fill: #fff;
    stroke: $color-primary;
    stroke-width: 0.3;
    pointer-events: none;
  }

  /* 区域编号角标 */
  .region-badge {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px 2px 6px;
    background: rgba(110, 75, 255, 0.85);
    color: #fff;
    font-size: 12px;
    border-radius: 12px;
    cursor: pointer;
    pointer-events: auto;
    white-space: nowrap;
    z-index: 2;

    .badge-label {
      font-size: 11px;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .badge-del {
      font-size: 12px;
      cursor: pointer;
      padding: 1px;

      &:hover {
        color: #ffccc7;
      }
    }

    &.selected {
      background: $color-primary-hover;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
    }
  }

  /* 绘制中提示条 */
  .drawing-hint {
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    font-size: 12px;
    border-radius: 16px;
    pointer-events: none;
    z-index: 3;

    i {
      font-size: 13px;
      color: $color-primary;
    }
  }
}

/* 左侧底部工具条 */
.regions-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  min-height: 32px;

  .region-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 10px;
    border: 1px solid $border-color-input;
    border-radius: 6px;
    background: #fff;
    color: $text-secondary;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;

    i { font-size: 13px; }

    &:hover:not(:disabled) {
      border-color: $color-primary;
      color: $color-primary;
    }

    &.active {
      background: $color-primary;
      border-color: $color-primary;
      color: #fff;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  .regions-summary {
    font-size: 12px;
    color: $text-tertiary;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/* 右侧轮次列表 */
.enhance-versions {
  width: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid $border-color-card;
}

.versions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: $text-base;
  border-bottom: 1px solid $border-color-card;

  .versions-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: $color-primary-bg;
    color: $color-primary;
    font-size: 11px;
    border-radius: 10px;
  }
}

.versions-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 30px 12px;
  color: $color-primary;
  font-size: 12px;

  .versions-spin {
    font-size: 28px;
    animation: enhance-spin 1.5s linear infinite;
  }
}

.versions-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  color: $text-muted;

  i {
    font-size: 36px;
    margin-bottom: 8px;
    opacity: 0.5;
  }

  p {
    font-size: 12px;
    margin: 0 0 4px;
  }

  .empty-sub {
    font-size: 11px;
    color: $text-muted;
    line-height: 1.5;
  }
}

.versions-list {
  flex: 1;
  overflow-y: auto;
  padding: 6px;
}

.version-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 6px;
  border: 1px solid transparent;
  transition: all 0.15s;

  &:hover {
    background: #fff;
  }

  &.active {
    background: #fff;
    border-color: $color-primary;
    box-shadow: 0 0 0 1px rgba(110, 75, 255, 0.15);
  }

  .version-thumb {
    width: 56px;
    height: 42px;
    border-radius: 4px;
    overflow: hidden;
    background: #1a1a2e;
    flex-shrink: 0;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .version-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;

    .version-title {
      font-size: 12px;
      font-weight: 500;
      color: $text-base;
    }

    .version-prompt {
      font-size: 11px;
      color: $text-tertiary;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .version-regions {
      font-size: 10px;
      color: $text-muted;
    }
  }

  .version-check {
    font-size: 14px;
    color: $color-primary;
    flex-shrink: 0;
  }
}

/* 提示词输入 */
.enhance-prompt-section {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  .prompt-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: $text-secondary;

    i {
      font-size: 13px;
      color: $color-primary;
    }
  }

  .enhance-prompt-input {
    :deep(textarea) {
      resize: none;
    }
  }
}

/* 底部三按钮 */
.enhance-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid $border-color-card;
}

.enhance-action-btn {
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

  &.secondary {
    border: 1px solid $border-color-input;
    background: #fff;
    color: $text-secondary;

    &:hover {
      border-color: $text-muted;
      color: $text-base;
    }
  }

  &.outline {
    border: 1px solid $color-primary;
    background: #fff;
    color: $color-primary;

    &:hover:not(:disabled) {
      background: $color-primary-bg;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  &.primary {
    border: none;
    background: linear-gradient(135deg, $color-primary, $color-primary-hover);
    color: #fff;

    &:hover:not(:disabled) {
      opacity: 0.9;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
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
        background: #52c41a;
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
    color: #52c41a;
    background: rgba(82, 196, 26, 0.1);
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
</style>
