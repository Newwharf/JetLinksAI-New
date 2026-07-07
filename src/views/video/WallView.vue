<script setup lang="ts">
/**
 * 实时视频 / 监控墙
 * 左侧监控墙列表 + 中部深色剧院风视频墙（占满右侧）
 * 点击「管理视频」后，右侧弹出「选择视频」面板，支持两种视图：
 *   1) 按区域：a-tree 树形（摄像头叶子节点可拖拽）
 *   2) 按网关：卡片分组（可展开/收起，摄像头卡片可拖拽）
 * 把视频拖到对应格子即完成上墙；同一视频不会同时出现在两个格子。
 * 每次进入界面默认展示标记为「默认」的监控墙。
 */
import {
  videoCameras,
  areaTree,
  countLeafAreas,
  buildGatewayGroups,
  type AreaTreeNode,
  type GatewayGroup
} from './video.mock'

// ===== 监控墙数据模型 =====
interface MonitorWall {
  id: string
  name: string
  /** 格子序号 → 摄像头 id（精确到格，分屏切换不丢数据） */
  cellMap: Record<number, string>
  isDefault?: boolean
}

const walls = ref<MonitorWall[]>([
  { id: 'w1', name: '一层大厅监控墙', cellMap: { 0: 'vc-rd-1', 1: 'vc-rd-2', 2: 'vc-pm-2', 3: 'vc-2f-2' }, isDefault: true },
  { id: 'w2', name: '周界安防监控墙', cellMap: { 0: 'vc-2f-1', 1: 'vc-2f-4' } },
  { id: 'w3', name: 'E栋4F办公区', cellMap: {} }
])

// 默认展示标记为「默认」的监控墙
const defaultWallId = computed(() => walls.value.find(w => w.isDefault)?.id || walls.value[0]?.id || '')
const activeWallId = ref(defaultWallId.value)
const activeWall = computed(() => walls.value.find(w => w.id === activeWallId.value) || walls.value[0])

// 当前墙已上墙的摄像头 id 集合（用于列表标记「在播」）
// 草稿模式时基于草稿，否则基于 cellMap
const onWallCamIds = computed(() => {
  const set = new Set<string>()
  const map = currentCellMap.value
  for (const k in map) set.add(map[k])
  return set
})

// ===== 摄像头查找 =====
const cameraMap = computed(() => {
  const m = new Map<string, typeof videoCameras[number]>()
  videoCameras.forEach(c => m.set(c.id, c))
  return m
})

// ===== 草稿模式：进入「管理视频」后，格子改动先写草稿，保存才落地 =====
const manageMode = ref(false)
const draftCellMap = ref<Record<number, string>>({})

// 当前生效的 cellMap：草稿模式用草稿，否则用当前墙的 cellMap
const currentCellMap = computed(() =>
  manageMode.value ? draftCellMap.value : (activeWall.value?.cellMap || {})
)

// 进入草稿模式：把当前墙的 cellMap 拷成草稿
function enterManageMode() {
  draftCellMap.value = { ...(activeWall.value?.cellMap || {}) }
  manageMode.value = true
}

// 退出但不改 manageMode（供保存/取消调用）
function saveDraft() {
  if (activeWall.value) {
    activeWall.value.cellMap = { ...draftCellMap.value }
  }
  manageMode.value = false
}
function cancelDraft() {
  draftCellMap.value = {}
  manageMode.value = false
}

// 切换监控墙时，若处于草稿模式则退出（避免草稿串到新墙）
watch(activeWallId, () => {
  if (manageMode.value) {
    draftCellMap.value = {}
    manageMode.value = false
  }
})

// ===== 设置格子：同一摄像头不重复出现；目标格原视频被顶回列表 =====
function setCell(idx: number, camId: string) {
  // 只在草稿模式允许（按钮/拖拽入口已限制，这里双保险）
  if (!manageMode.value) return
  const map = draftCellMap.value
  // 先清掉该摄像头在其它格子的旧记录（移动语义）
  for (const k in map) {
    if (map[k] === camId && Number(k) !== idx) delete map[Number(k)]
  }
  map[idx] = camId
}

// 清空某格
function clearCell(idx: number) {
  if (!manageMode.value) return
  delete draftCellMap.value[idx]
}

// ===== 分屏布局 =====
type Layout = '1' | '4' | '9'
const activeLayout = ref<Layout>('4')
const layouts: { key: Layout; cols: number; label: string }[] = [
  { key: '1', cols: 1, label: '单画面' },
  { key: '4', cols: 2, label: '四画面' },
  { key: '9', cols: 3, label: '九画面' }
]
const cellCount = computed(() => Number(activeLayout.value))

interface Cell {
  index: number
  camera: typeof videoCameras[number] | null
}
const cells = computed<Cell[]>(() => {
  const arr: Cell[] = []
  const map = currentCellMap.value
  for (let i = 0; i < cellCount.value; i++) {
    const camId = map[i]
    arr.push({ index: i, camera: camId ? (cameraMap.value.get(camId) || null) : null })
  }
  return arr
})

// 已上墙总数 / 超出当前分屏数
const onWallCount = computed(() => onWallCamIds.value.size)
const overflowCount = computed(() => Math.max(0, onWallCount.value - cellCount.value))

// ===== 全屏 =====
const isFullscreen = ref(false)
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

// ===== 监控墙列表（左侧）=====
const wallSearchKey = ref('')
const filteredWalls = computed(() => {
  const kw = wallSearchKey.value.trim().toLowerCase()
  if (!kw) return walls.value
  return walls.value.filter(w => w.name.toLowerCase().includes(kw))
})

// 新增监控墙
const addModalOpen = ref(false)
const addName = ref('')
function openAddModal() {
  addName.value = ''
  addModalOpen.value = true
  nextTick(() => document.querySelector<HTMLInputElement>('.wall-add-input')?.focus())
}
function confirmAdd() {
  const name = addName.value.trim()
  if (!name) return
  const id = 'w' + Date.now()
  walls.value.push({ id, name, cellMap: {} })
  activeWallId.value = id
  addModalOpen.value = false
  addName.value = ''
}
function cancelAdd() {
  addModalOpen.value = false
  addName.value = ''
}

// 设为/取消默认
function setDefault(w: MonitorWall) {
  if (w.isDefault) return
  walls.value.forEach(x => (x.isDefault = false))
  w.isDefault = true
}
function unsetDefault(w: MonitorWall) {
  w.isDefault = false
}

// 重命名（inline）
const renamingId = ref<string | null>(null)
const renamingText = ref('')
function startRename(w: MonitorWall) {
  renamingId.value = w.id
  renamingText.value = w.name
  nextTick(() => {
    document.querySelector<HTMLInputElement>('.wall-rename-input')?.focus()
    document.querySelector<HTMLInputElement>('.wall-rename-input')?.select()
  })
}
function confirmRename() {
  if (renamingId.value) {
    const w = walls.value.find(x => x.id === renamingId.value)
    if (w && renamingText.value.trim()) w.name = renamingText.value.trim()
    renamingId.value = null
  }
}
function cancelRename() {
  renamingId.value = null
}

// 删除（二次确认）
const deleteConfirmId = ref<string | null>(null)
function requestDelete(w: MonitorWall) {
  deleteConfirmId.value = w.id
}
function confirmDelete() {
  if (!deleteConfirmId.value) return
  const idx = walls.value.findIndex(w => w.id === deleteConfirmId.value)
  if (idx >= 0) {
    const removedActive = walls.value[idx].id === activeWallId.value
    walls.value.splice(idx, 1)
    if (removedActive) activeWallId.value = defaultWallId.value || walls.value[0]?.id || ''
  }
  deleteConfirmId.value = null
}
function cancelDelete() {
  deleteConfirmId.value = null
}

// ===== 选择视频面板（分段/搜索/区域树/网关卡片）=====
// 分段：区域 / 网关
const segValue = ref<'area' | 'gateway'>('area')
const segOptions = [
  { label: '区域', value: 'area' },
  { label: '网关', value: 'gateway' }
]

// 搜索（两个视图共用，按摄像头名过滤）
const searchValue = ref('')

// 区域数（顶部统计）
const areaCount = countLeafAreas()

// 默认展开区域树的关键节点（含末级区域，让摄像头叶子可见）
const expandedKeys = ref<string[]>([
  'area-物联网产业园区',
  'area-物联网产业园区/E栋',
  'area-物联网产业园区/E栋/4F',
  'area-物联网产业园区/E栋/4F/研发部办公区',
  'area-物联网产业园区/E栋/4F/项目部办公区',
  'area-物联网产业园区/E栋/2F',
  'area-物联网产业园区/E栋/2F/公共区域',
  'area-物联网产业园区/A栋',
  'area-物联网产业园区/A栋/1F',
  'area-物联网产业园区/A栋/1F/运营办公室'
])

// 区域树：按搜索词过滤（保留命中子树的祖先链）
const filteredAreaTree = computed<AreaTreeNode[]>(() => {
  const kw = searchValue.value.trim().toLowerCase()
  if (!kw) return areaTree
  function filterNodes(nodes: AreaTreeNode[]): AreaTreeNode[] {
    const result: AreaTreeNode[] = []
    for (const node of nodes) {
      const matched = node.title.toLowerCase().includes(kw)
      const children = node.children ? filterNodes(node.children) : []
      if (matched || children.length) {
        result.push({ ...node, children: children.length ? children : node.children })
      }
    }
    return result
  }
  return filterNodes(areaTree)
})

// 网关分组
const gatewayGroups = ref<GatewayGroup[]>(buildGatewayGroups())
const filteredGatewayGroups = computed(() => {
  if (!searchValue.value.trim()) return gatewayGroups.value
  const key = searchValue.value.toLowerCase()
  return gatewayGroups.value
    .map(g => ({ ...g, cameras: g.cameras.filter(c => c.name.toLowerCase().includes(key)) }))
    .filter(g => g.cameras.length > 0 || g.name.toLowerCase().includes(key))
})

function toggleGateway(g: GatewayGroup) {
  g.expanded = !g.expanded
}

// ===== 拖拽：从列表拖到视频格（HTML5 Drag）=====
const dragGhostVisible = ref(false)
// 同步标志：dragstart 立即置 true，避免 dragover 依赖响应式更新的时序问题
let isDragging = false
const dragGhost = reactive({ x: 0, y: 0, name: '' })
const dropTargetIdx = ref<number | null>(null)

function onCameraDragStart(e: DragEvent, camId: string, camName: string) {
  if (!e.dataTransfer) return
  e.dataTransfer.setData('text/plain', camId)
  e.dataTransfer.effectAllowed = 'copy'
  // 隐藏默认快照，改用自定义 ghost
  const empty = document.createElement('div')
  empty.style.width = '1px'
  empty.style.height = '1px'
  document.body.appendChild(empty)
  e.dataTransfer.setDragImage(empty, 0, 0)
  setTimeout(() => document.body.removeChild(empty), 0)

  dragGhost.name = camName
  dragGhostVisible.value = true
  isDragging = true
}

function onCameraDragEnd() {
  dragGhostVisible.value = false
  isDragging = false
  dropTargetIdx.value = null
}

// 视频格允许 drop
function onCellDragOver(e: DragEvent, idx: number) {
  if (!isDragging) return
  e.preventDefault()
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
  dropTargetIdx.value = idx
  dragGhost.x = e.clientX
  dragGhost.y = e.clientY
}

function onCellDragLeave(idx: number) {
  if (dropTargetIdx.value === idx) dropTargetIdx.value = null
}

// 视频格 drop
function onCellDrop(e: DragEvent, idx: number) {
  e.preventDefault()
  dropTargetIdx.value = null
  const camId = e.dataTransfer?.getData('text/plain')
  dragGhostVisible.value = false
  isDragging = false
  if (!camId) return
  setCell(idx, camId)
}

// ===== 点击摄像头 → 弹窗播放 =====
const playModalVisible = ref(false)
const playTarget = ref<typeof videoCameras[number] | null>(null)

function playCamera(camId: string) {
  const cam = cameraMap.value.get(camId)
  if (!cam) return
  playTarget.value = cam
  playModalVisible.value = true
}

// 区域树叶子点击：播放（不阻止 drag）
function onTreeNodeClick(node: AreaTreeNode) {
  if (node.isLeaf && node.camId) playCamera(node.camId)
}

// ===== 节点图标 =====
function areaNodeIcon(node: AreaTreeNode): string {
  if (node.isLeaf) return 'i-ant-design-video-camera-outlined'
  const segs = node.title
  // 园区
  if (segs.includes('园区') || segs.includes('产业')) return 'i-ant-design-apartment-outlined'
  // 楼栋
  if (segs.endsWith('栋')) return 'i-ant-design-home-outlined'
  // 楼层
  if (/^\d+F$/.test(segs)) return 'i-ant-design-appstore-outlined'
  // 区域
  return 'i-ant-design-environment-outlined'
}

// ===== 监控墙列表项弹出菜单 =====
const openMenuId = ref<string | null>(null)
function toggleWallMenu(w: MonitorWall, e: Event) {
  e.stopPropagation()
  openMenuId.value = openMenuId.value === w.id ? null : w.id
}
function closeMenu() {
  openMenuId.value = null
}
function menuRename(w: MonitorWall) {
  closeMenu()
  startRename(w)
}
function menuManage() {
  closeMenu()
  enterManageMode()
}
function menuDelete(w: MonitorWall) {
  closeMenu()
  requestDelete(w)
}
function onDocumentClick() {
  openMenuId.value = null
}
onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
  <div class="video-page">
    <!-- 主体 -->
    <div class="full-page-warp">
      <!-- ===== 左侧:监控墙列表 ===== -->
      <aside class="wall-list-panel">
        <div class="wall-list__head">
          <h4>监控墙</h4>
          <button class="wall-list__add" title="新建监控墙" @click="openAddModal">
            <i class="i-ant-design-plus-outlined" />
          </button>
        </div>

        <!-- 搜索框 -->
        <div class="wall-list__toolbar">
          <a-input
            v-model:value="wallSearchKey"
            class="wall-list__search"
            placeholder="搜索监控墙"
            allow-clear
          >
            <template #prefix>
              <i class="i-ant-design-search-outlined" />
            </template>
          </a-input>
        </div>

        <div class="wall-list__body">
          <div
            v-for="wall in filteredWalls"
            :key="wall.id"
            class="wall-item"
            :class="{ 'is-active': wall.id === activeWallId }"
            @click="activeWallId = wall.id"
          >
            <i class="i-ant-design-video-camera-outlined wall-item__icon" />

            <!-- 名称(普通态 / inline 编辑态) -->
            <input
              v-if="renamingId === wall.id"
              v-model="renamingText"
              class="wall-rename-input"
              @click.stop
              @keyup.enter="confirmRename"
              @keyup.esc="cancelRename"
              @blur="confirmRename"
            />
            <span v-else class="wall-item__name">{{ wall.name }}</span>

            <!-- 默认标记 -->
            <i
              v-if="wall.isDefault && renamingId !== wall.id"
              class="i-ant-design-star-filled wall-item__default"
              title="默认监控墙"
            />

            <!-- 更多按钮 -->
            <a-dropdown
              :open="openMenuId === wall.id"
              :trigger="['click']"
              @open-change="(o: boolean) => !o && (openMenuId = null)"
            >
              <button class="wall-item__more" @click="toggleWallMenu(wall, $event)">
                <i class="i-ant-design-more-outlined" />
              </button>
              <template #overlay>
                <a-menu class="wall-menu">
                  <a-menu-item key="rename" @click="menuRename(wall)">
                    <i class="i-ant-design-edit-outlined" />
                    <span>重命名</span>
                  </a-menu-item>
                  <a-menu-item key="manage" @click="menuManage">
                    <i class="i-ant-design-video-camera-add-outlined" />
                    <span>管理视频</span>
                  </a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="delete" class="wall-menu__danger" @click="menuDelete(wall)">
                    <i class="i-ant-design-delete-outlined" />
                    <span>删除</span>
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>

          <!-- 空状态 -->
          <div v-if="walls.length === 0" class="wall-list__empty">
            <i class="i-ant-design-desktop-outlined wall-list__empty-icon" />
            <p>暂无监控墙</p>
          </div>
        </div>
      </aside>

      <!-- ===== 右侧:视频墙(占满) ===== -->
      <div class="vlw">
        <!-- 视频墙(深色剧院风) -->
        <div class="vlw__stage" :class="{ 'is-fullscreen': isFullscreen }">
          <!-- 工具栏 -->
          <div class="vlw__toolbar">
            <!-- 当前墙名称 + 分屏组 -->
            <div class="vlw__toolbar-left">
              <span class="vlw__current-name">{{ activeWall?.name }}</span>
              <div class="vlw__layout-group">
                <button
                  v-for="lay in layouts"
                  :key="lay.key"
                  class="vlw__layout-btn"
                  :class="{ 'is-active': activeLayout === lay.key }"
                  :title="lay.label"
                  @click="activeLayout = lay.key"
                >
                  <span class="vlw__layout-grid" :class="'is-' + lay.key + 'x' + lay.key">
                    <span v-for="c in Number(lay.key)" :key="c" class="vlw__layout-cell" />
                  </span>
                </button>
              </div>
            </div>

            <!-- 操作按钮 -->
            <div class="vlw__actions">
              <!-- 浏览态：全屏 + 默认设置（草稿模式下隐藏） -->
              <template v-if="!manageMode">
                <button class="vlw__action" @click="toggleFullscreen">
                  <i :class="isFullscreen ? 'i-ant-design-fullscreen-exit-outlined' : 'i-ant-design-fullscreen-outlined'" />
                  <span>{{ isFullscreen ? '退出全屏' : '全屏' }}</span>
                </button>
                <button
                  v-if="!activeWall?.isDefault"
                  class="vlw__action"
                  title="设为默认监控墙"
                  @click="activeWall && setDefault(activeWall)"
                >
                  <i class="i-ant-design-star-outlined" />
                  <span>设为默认</span>
                </button>
                <button
                  v-else
                  class="vlw__action"
                  title="取消默认监控墙"
                  @click="activeWall && unsetDefault(activeWall)"
                >
                  <i class="i-ant-design-star-filled" />
                  <span>取消默认</span>
                </button>
              </template>
              <!-- 草稿模式：取消 / 保存 -->
              <template v-if="manageMode">
                <button class="vlw__action" @click="cancelDraft">
                  <i class="i-ant-design-close-outlined" />
                  <span>取消</span>
                </button>
                <button class="vlw__action vlw__action--primary" @click="saveDraft">
                  <i class="i-ant-design-check-outlined" />
                  <span>保存</span>
                </button>
              </template>
              <!-- 浏览模式：管理视频入口 -->
              <button
                v-else
                class="vlw__action"
                title="勾选通道"
                @click="enterManageMode"
              >
                <i class="i-ant-design-video-camera-add-outlined" />
                <span>管理视频</span>
              </button>
            </div>
          </div>

          <!-- 视频格画布 -->
          <div class="vlw__canvas">
            <div class="vmpg">
              <div
                class="vmpg__grid"
                :style="{ gridTemplateColumns: 'repeat(' + Math.sqrt(cellCount) + ', 1fr)' }"
              >
                <div
                  v-for="cell in cells"
                  :key="cell.index"
                  class="vmpg__cell"
                  :class="{
                    'is-playing': cell.camera,
                    'is-drop-target': dropTargetIdx === cell.index
                  }"
                  @dragover="onCellDragOver($event, cell.index)"
                  @dragleave="onCellDragLeave(cell.index)"
                  @drop="onCellDrop($event, cell.index)"
                >
                  <template v-if="cell.camera">
                    <!-- 缩略图铺底 -->
                    <img
                      :src="cell.camera.thumb"
                      class="cell-thumb"
                      draggable="false"
                      alt="视频画面"
                    />
                    <div class="cell-overlay" />
                    <!-- 顶部：通道名 + 关闭 -->
                    <div class="cell-top">
                      <div class="cell-top__name" :title="cell.camera.name">
                        <span
                          class="cell-status-dot"
                          :class="cell.camera.status"
                        />
                        <span>{{ cell.camera.name }}</span>
                      </div>
                      <!-- 移出按钮：仅草稿模式可操作 -->
                      <button
                        v-if="manageMode"
                        class="cell-close"
                        title="移出该格"
                        @click="clearCell(cell.index)"
                      >
                        <i class="i-ant-design-close-outlined" />
                      </button>
                    </div>
                  </template>
                  <div v-else class="vmpg__cell-empty">
                    {{ manageMode ? `拖拽到第 ${cell.index + 1} 格` : `第 ${cell.index + 1} 格` }}
                  </div>
                </div>
              </div>
              <p v-if="overflowCount > 0" class="vmpg__hint">
                <span class="hint-overflow">
                  已超出 {{ overflowCount }} 路，将无法全部显示。
                </span>
              </p>
            </div>
          </div>
        </div>

        <!-- ===== 选择视频面板（管理视频模式，平时隐藏） ===== -->
        <transition name="channel-slide">
          <aside v-show="manageMode" class="vcp">
            <div class="vcp__head">
              <h4>选择视频</h4>
              <span class="vcp__count">{{ areaCount }} 个区域</span>
              <button class="vcp__close" title="关闭" @click="manageMode = false">
                <i class="i-ant-design-close-outlined" />
              </button>
            </div>

            <a-input
              v-model:value="searchValue"
              class="vcp__keyword"
              placeholder="搜索摄像头名称"
              allow-clear
            >
              <template #prefix>
                <i class="i-ant-design-search-outlined" />
              </template>
            </a-input>

            <a-segmented
              v-model:value="segValue"
              class="vcp__segmented"
              block
              :options="segOptions"
            />

            <div class="vcp__content">
              <!-- 按区域：a-tree -->
              <template v-if="segValue === 'area'">
                <a-tree
                  v-model:expanded-keys="expandedKeys"
                  :tree-data="filteredAreaTree"
                  :field-names="{ title: 'title', key: 'key', children: 'children' }"
                  class="vcp__tree"
                >
                  <template #title="node">
                    <a-tooltip :title="node.title" placement="top">
                      <!-- 非叶子：区域节点（单行省略号） -->
                      <div
                        v-if="!node.isLeaf"
                        class="tree-node-label"
                        @click.stop
                      >
                        <i :class="areaNodeIcon(node)" class="tree-node-icon" />
                        <span class="tree-node-title">{{ node.title }}</span>
                        <span v-if="node.count !== undefined" class="tree-node-count">{{ node.count }}</span>
                      </div>
                      <!-- 叶子：摄像头（可拖拽 + 状态点 + 在播标记） -->
                      <div
                        v-else
                        class="tree-node-label tree-node-leaf"
                        :class="node.status"
                        draggable="true"
                        @click.stop="onTreeNodeClick(node)"
                        @dragstart="onCameraDragStart($event, node.camId, node.title)"
                        @dragend="onCameraDragEnd"
                      >
                        <i class="i-ant-design-video-camera-outlined tree-node-icon" />
                        <span class="tree-node-title">{{ node.title }}</span>
                        <span class="tree-node-status" :class="node.status">
                          {{ node.status === 'online' ? '在线' : '离线' }}
                        </span>
                        <i
                          v-if="onWallCamIds.has(node.camId)"
                          class="i-ant-design-check-circle-filled tree-node-onair"
                          title="已上墙"
                        />
                      </div>
                    </a-tooltip>
                  </template>
                </a-tree>
              </template>

              <!-- 按网关：卡片分组 -->
              <template v-else>
                <div class="gw-list">
                  <div v-for="gw in filteredGatewayGroups" :key="gw.id" class="opt-gw-group">
                    <div class="opt-gw-header" @click="toggleGateway(gw)">
                      <i
                        class="i-ant-design-cluster-outlined opt-gw-icon"
                        :style="{ color: gw.status === 'online' ? '#6e4bff' : '#bfbfbf' }"
                      />
                      <span class="opt-gw-name">{{ gw.name }}</span>
                      <span class="opt-gw-count">{{ gw.cameras.length }} 个通道</span>
                      <i
                        class="opt-gw-arrow"
                        :class="gw.expanded ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'"
                      />
                    </div>
                    <div v-if="gw.expanded" class="opt-cam-grid">
                      <div
                        v-for="cam in gw.cameras"
                        :key="cam.id"
                        class="opt-cam-card"
                        :class="{ marked: onWallCamIds.has(cam.id) }"
                        draggable="true"
                        @click="playCamera(cam.id)"
                        @dragstart="onCameraDragStart($event, cam.id, cam.name)"
                        @dragend="onCameraDragEnd"
                      >
                        <div class="opt-cam-thumb">
                          <img :src="cam.thumb" alt="截帧" draggable="false" />
                          <div v-if="onWallCamIds.has(cam.id)" class="opt-cam-onair">
                            <i class="i-ant-design-check-outlined" />
                          </div>
                        </div>
                        <div class="opt-cam-info">
                          <span class="opt-cam-name">{{ cam.name }}</span>
                          <span class="opt-cam-status" :class="cam.status">
                            {{ cam.status === 'online' ? '在线' : '离线' }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-if="filteredGatewayGroups.length === 0" class="gw-empty">
                    <i class="i-ant-design-video-camera-outlined gw-empty-icon" />
                    <p>{{ searchValue ? '没有找到匹配的摄像头' : '暂无视频设备' }}</p>
                  </div>
                </div>
              </template>
            </div>
          </aside>
        </transition>
      </div>
    </div>

    <!-- 拖拽跟随预览 -->
    <div
      v-if="dragGhostVisible"
      class="drag-ghost"
      :style="{ left: dragGhost.x + 'px', top: dragGhost.y + 'px' }"
    >
      <i class="i-ant-design-video-camera-outlined" />
      <span>{{ dragGhost.name }}</span>
    </div>

    <!-- 删除二次确认 -->
    <a-modal
      :open="deleteConfirmId !== null"
      title="删除监控墙"
      cancel-text="取消"
      @cancel="cancelDelete"
    >
      <p class="delete-confirm-text">
        确定删除监控墙「{{ walls.find(w => w.id === deleteConfirmId)?.name }}」吗？删除后不可恢复。
      </p>
      <template #footer>
        <a-button @click="cancelDelete">取消</a-button>
        <a-button danger type="primary" @click="confirmDelete">删 除</a-button>
      </template>
    </a-modal>

    <!-- 新建监控墙 -->
    <a-modal
      :open="addModalOpen"
      title="新建监控墙"
      cancel-text="取消"
      @cancel="cancelAdd"
    >
      <div class="add-wall-form">
        <label class="add-wall-label">监控墙名称</label>
        <input
          v-model="addName"
          class="wall-add-input"
          placeholder="请输入监控墙名称"
          @keyup.enter="confirmAdd"
        />
      </div>
      <template #footer>
        <a-button @click="cancelAdd">取消</a-button>
        <a-button type="primary" :disabled="!addName.trim()" @click="confirmAdd">确 定</a-button>
      </template>
    </a-modal>

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
          <span class="player-status" :class="playTarget?.status">
            {{ playTarget?.status === 'online' ? '● LIVE' : '● 离线' }}
          </span>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.video-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-page;
  overflow: hidden;
}

/* ===== 主体 ===== */
.full-page-warp {
  flex: 1;
  display: flex;
  gap: 16px;
  overflow: hidden;
  padding: 12px 16px 0;
}

/* ===== 左侧:监控墙列表 ===== */
.wall-list-panel {
  width: $video-panel-width;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: $bg-card;
  border: 1px solid $border-color-card;
  border-radius: 12px;
}

.wall-list__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px solid $border-color-card;

  h4 {
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
    margin: 0;
  }

  .wall-list__add {
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 6px;
    background: $color-primary;
    color: #fff;
    font-size: 14px;
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
      background: $color-primary-hover;
      transform: scale(1.06);
    }

    &:active {
      transform: scale(0.96);
    }
  }
}

/* 搜索框工具栏 */
.wall-list__toolbar {
  flex-shrink: 0;

  .wall-list__search {
    width: 100%;
    :deep(.ant-input) {
      border-radius: 6px;
    }
  }
}

.wall-list__body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 监控墙列表项 */
.wall-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 36px;
  padding: 0 8px 0 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: $bg-hover;

    .wall-item__more {
      opacity: 1;
    }
  }

  &.is-active {
    background: $color-primary-bg;

    .wall-item__icon,
    .wall-item__name {
      color: $color-primary;
    }

    .wall-item__more {
      color: $color-primary;

      &:hover {
        background: rgba(110, 75, 255, 0.12);
      }
    }
  }

  .wall-item__icon {
    font-size: 15px;
    color: $text-secondary;
    flex-shrink: 0;
  }

  .wall-item__name {
    flex: 1;
    font-size: 14px;
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* 默认监控墙标记 */
  .wall-item__default {
    font-size: 13px;
    color: #faad14;
    flex-shrink: 0;
  }

  /* 更多按钮 */
  .wall-item__more {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: $text-secondary;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;

    &:hover {
      background: rgba(0, 0, 0, 0.06);
      color: $text-base;
    }
  }
}

/* inline 重命名输入框 */
.wall-rename-input {
  flex: 1;
  height: 26px;
  padding: 0 6px;
  border: 1px solid $color-primary;
  border-radius: 4px;
  background: $bg-card;
  color: $text-base;
  font-size: 14px;
  font-family: inherit;
  outline: none;

  &::selection {
    background: $color-primary-bg;
  }
}

/* 空状态 */
.wall-list__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  gap: 8px;
  color: $text-muted;

  .wall-list__empty-icon {
    font-size: 40px;
    opacity: 0.35;
  }

  p {
    font-size: 13px;
    margin: 0;
  }
}

/* 弹出菜单:危险项红色 */
.wall-menu {
  :deep(.wall-menu__danger) {
    color: #ff4d4f;

    &:hover {
      color: #ff7875;
      background: rgba(255, 77, 79, 0.06) !important;
    }
  }
}

/* ===== 右侧:视频墙 ===== */
.vlw {
  flex: 1;
  display: flex;
  gap: 16px;
  overflow: hidden;
}

/* 视频墙(深色面板) */
.vlw__stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  background: $video-stage-bg-start;
  border: 1px solid $video-stage-border;
  border-radius: 12px;
  box-shadow: $video-stage-shadow;
  overflow: hidden;
  min-width: 0;

  &.is-fullscreen {
    position: fixed;
    inset: 0;
    z-index: 1000;
    border-radius: 0;
    border: none;
  }
}

/* 工具栏 */
.vlw__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;
}

.vlw__toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.vlw__current-name {
  font-size: 14px;
  font-weight: 500;
  color: $video-stage-text-strong;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

/* 分屏按钮组 */
.vlw__layout-group {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  background: $video-stage-group-bg;
  border-radius: 10px;
}

.vlw__layout-btn {
  width: 32px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  color: $video-stage-text;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  &.is-active {
    background: $video-stage-btn-bg;
    color: $video-stage-text-strong;
  }
}

.vlw__layout-grid {
  display: grid;
  gap: 2px;
  width: 16px;
  height: 16px;

  &.is-1x1 {
    grid-template-columns: 1fr;
  }
  &.is-4x4,
  &.is-2x2 {
    grid-template-columns: 1fr 1fr;
  }
  &.is-9x9,
  &.is-3x3 {
    grid-template-columns: 1fr 1fr 1fr;
  }

  .vlw__layout-cell {
    background: currentColor;
    border-radius: 1px;
  }
}

/* 操作按钮 */
.vlw__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vlw__action {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid $video-stage-border;
  border-radius: 9999px;
  color: $video-stage-text-strong;
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
  }

  // 激活态(管理视频已打开)
  &.is-active {
    background: $video-stage-btn-bg;
    border-color: transparent;
  }

  // 主操作（保存）：紫色实心，在深色工具栏上突出
  &--primary {
    background: $color-primary;
    border-color: $color-primary;
    color: #fff;

    &:hover {
      background: $color-primary-hover;
      border-color: $color-primary-hover;
    }
  }

  i {
    font-size: 14px;
  }
}

/* 视频画布 */
.vlw__canvas {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.vmpg {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vmpg__grid {
  flex: 1;
  display: grid;
  gap: 10px;
}

.vmpg__cell {
  position: relative;
  border-radius: $video-cell-radius;
  background: #2c2f36;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

  &.is-playing {
    background: #000;
  }

  /* 拖入高亮 */
  &.is-drop-target {
    box-shadow: inset 0 0 0 3px rgba(110, 75, 255, 0.7);
  }
}

.vmpg__cell-empty {
  font-size: 14px;
  color: $video-stage-text-weak;
}

/* 视频格缩略图铺底 */
.cell-thumb {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
  user-select: none;
}

.cell-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.45) 0%, transparent 22%, transparent 78%, rgba(0, 0, 0, 0.5) 100%);
  pointer-events: none;
}

.cell-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  z-index: 2;

  &__name {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    max-width: calc(100% - 28px);
    font-size: 13px;
    color: #fff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);

    > span:last-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

.cell-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);

  &.online {
    background: $color-online;
  }

  &.offline {
    background: #bfbfbf;
  }
}

.cell-close {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;

  i {
    font-size: 12px;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.7);
  }
}

.vmpg__hint {
  font-size: 14px;
  color: $video-stage-text-weak;
  margin: 0;
  flex-shrink: 0;

  .hint-overflow {
    color: #ff7875;
  }
}

/* ===== 选择视频面板 ===== */
.vcp {
  width: $video-panel-width;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: $bg-card;
  border: 1px solid $border-color-card;
  border-radius: 12px;
}

.vcp__head {
  display: flex;
  align-items: baseline;
  gap: 8px;

  h4 {
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
    margin: 0;
    flex: 1;
  }

  .vcp__count {
    font-size: 14px;
    color: $text-muted;
  }

  .vcp__close {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 4px;
    color: $text-muted;
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
      background: $bg-hover;
      color: $text-base;
    }
  }
}

.vcp__keyword {
  flex-shrink: 0;
}

.vcp__segmented {
  flex-shrink: 0;
  :deep(.ant-segmented) {
    background: $bg-page;
    border-radius: 6px;
  }
  :deep(.ant-segmented-item-selected) {
    background: $bg-card;
    color: $text-base;
    box-shadow: 0 4px 16px 0 rgba(20, 22, 30, 0.06);
  }
}

.vcp__content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* ===== 区域树 ===== */
.vcp__tree {
  background: transparent;
  border-radius: 6px;

  :deep(.ant-tree-node-content-wrapper) {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
    overflow: hidden;

    &:hover {
      background: $bg-hover;
    }
  }

  :deep(.ant-tree-switcher) {
    color: $text-muted;
  }

  /* 缩进单元：见文件底部非 scoped 全局样式（antd cssinjs 会覆盖 scoped 样式） */
}

/* 树节点：严格单行 + 省略号 */
.tree-node-label {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-width: 0;
  font-size: 13px;

  .tree-node-icon {
    font-size: 14px;
    color: $text-secondary;
    flex-shrink: 0;
  }

  .tree-node-title {
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex: 1;
  }

  .tree-node-count {
    font-size: 12px;
    color: $text-muted;
    flex-shrink: 0;
  }
}

/* 叶子（摄像头）：可拖拽、状态色 */
.tree-node-leaf {
  cursor: grab;

  &:active {
    cursor: grabbing;
  }

  /* 在线图标绿色，离线灰色 */
  &.online .tree-node-icon {
    color: $color-online;
  }

  &.offline .tree-node-icon {
    color: #bfbfbf;
  }

  .tree-node-status {
    font-size: 11px;
    flex-shrink: 0;
    padding: 0 4px;
    border-radius: 3px;

    &.online {
      color: $color-online;
      background: $color-online-bg;
    }

    &.offline {
      color: #bfbfbf;
      background: rgba(191, 191, 191, 0.12);
    }
  }

  .tree-node-onair {
    font-size: 12px;
    color: $color-primary;
    flex-shrink: 0;
  }
}

/* ===== 网关卡片（复刻 FloorPlanView 标记设备抽屉样式） ===== */
.gw-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.opt-gw-group {
  border: 1px solid $border-color-card;
  border-radius: 8px;
  overflow: hidden;
}

.opt-gw-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  background: #f7f8fa;
  cursor: pointer;

  .opt-gw-icon {
    font-size: 14px;
  }

  .opt-gw-name {
    font-size: 13px;
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

.opt-cam-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 8px;
}

.opt-cam-card {
  border: 1px solid $border-color-card;
  border-radius: 6px;
  overflow: hidden;
  cursor: grab;
  transition: all 0.15s;
  background: #fff;

  &:hover {
    border-color: $color-primary;
  }

  &:active {
    cursor: grabbing;
  }

  /* 已上墙：整体灰度（参考空间管理 marked 样式） */
  &.marked {
    opacity: 0.55;

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

    /* 已上墙角标：主题色（紫）勾 */
    .opt-cam-onair {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: $color-primary;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 1.5px rgba(255, 255, 255, 0.85);

      i {
        color: #fff;
        /* UnoCSS 图标走 mask 渲染，需显式给尺寸 */
        font-size: 12px;
        width: 12px;
        height: 12px;
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
    background: rgba(191, 191, 191, 0.12);
  }
}

.gw-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 16px;
  gap: 8px;
  color: $text-muted;

  .gw-empty-icon {
    font-size: 36px;
    opacity: 0.35;
  }

  p {
    font-size: 13px;
    margin: 0;
  }
}

/* ===== 面板滑入/滑出动画 ===== */
.channel-slide-enter-active,
.channel-slide-leave-active {
  transition: all 0.28s ease;
}

.channel-slide-enter-from,
.channel-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* ===== 拖拽跟随预览（圆形徽章） ===== */
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
    color: #1890ff;
  }
}

/* ===== 删除确认弹窗 ===== */
.delete-confirm-text {
  font-size: 14px;
  color: $text-base;
  margin: 0;
}

/* ===== 新建监控墙表单 ===== */
.add-wall-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;

  .add-wall-label {
    font-size: 14px;
    color: $text-secondary;
  }

  .wall-add-input {
    height: 36px;
    padding: 0 12px;
    border: 1px solid $border-color-input;
    border-radius: 6px;
    background: $bg-card;
    color: $text-base;
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;

    &:focus {
      border-color: $color-primary;
    }

    &::placeholder {
      color: $text-tertiary;
    }
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

<!-- 非 scoped 全局样式：覆盖 antd cssinjs 注入的 a-tree 缩进单元宽度 -->
<!-- 限定在 .vcp__tree 作用域，对齐空间管理「每层 8px」的紧凑风格 -->
<style lang="scss">
.vcp__tree.ant-tree .ant-tree-indent-unit {
  width: 8px !important;
  min-width: 8px !important;
}
</style>
