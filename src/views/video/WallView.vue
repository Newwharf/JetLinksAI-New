<script setup lang="ts">
/**
 * 实时视频 / 监控墙
 * 左侧监控墙列表 + 中部深色剧院风视频墙(占满右侧)
 * 点击「管理视频」时,视频墙右边弹出通道选择树(平时隐藏)
 */

// ===== 通道树数据(选择通道用) =====
interface ChannelNode {
  key: string
  title: string
  count?: number
  type: 'park' | 'building' | 'floor' | 'area' | 'channel'
  isLeaf?: boolean
  children?: ChannelNode[]
}

const channelTree = ref<ChannelNode[]>([
  {
    key: 'park-1',
    title: '物联网产业园区',
    type: 'park',
    children: [
      {
        key: 'b-a',
        title: 'A栋',
        count: 0,
        type: 'building',
        children: [
          {
            key: 'b-a-1f',
            title: '1F',
            count: 0,
            type: 'floor',
            children: [
              {
                key: 'b-a-1f-op',
                title: '运营办公室',
                count: 0,
                type: 'area',
                children: []
              }
            ]
          }
        ]
      },
      {
        key: 'b-e',
        title: 'E栋',
        count: 7,
        type: 'building',
        children: [
          {
            key: 'b-e-2f',
            title: '2F',
            count: 0,
            type: 'floor',
            children: [
              {
                key: 'b-e-2f-public',
                title: '公共区域',
                count: 0,
                type: 'area',
                children: []
              }
            ]
          },
          {
            key: 'b-e-4f',
            title: '4F',
            count: 7,
            type: 'floor',
            children: [
              {
                key: 'b-e-4f-pm',
                title: '项目部办公区',
                count: 3,
                type: 'area',
                children: [
                  { key: 'ch-pm-1', title: '产品部窗外高通21网关', type: 'channel', isLeaf: true },
                  { key: 'ch-pm-2', title: '产品部设备墙高通21网关', type: 'channel', isLeaf: true },
                  { key: 'ch-pm-3', title: '产品部原机房位置高通21网关', type: 'channel', isLeaf: true }
                ]
              },
              {
                key: 'b-e-4f-rd',
                title: '研发部办公区',
                count: 4,
                type: 'area',
                children: [
                  { key: 'ch-rd-1', title: '研发部门口高通21网关', type: 'channel', isLeaf: true },
                  { key: 'ch-rd-2', title: '研发部工位区高通21网关', type: 'channel', isLeaf: true },
                  { key: 'ch-rd-3', title: '研发部会议室高通21网关', type: 'channel', isLeaf: true },
                  { key: 'ch-rd-4', title: '研发部走廊高通21网关', type: 'channel', isLeaf: true }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
])

const expandedKeys = ref<string[]>(['park-1', 'b-e', 'b-e-4f', 'b-e-4f-rd'])

// 分段控件:区域 / 网关 / 通道
const segValue = ref('area')
const segOptions = [
  { label: '区域', value: 'area' },
  { label: '网关', value: 'gateway' },
  { label: '通道', value: 'channel' }
]

// 节点图标
function nodeIcon(type: ChannelNode['type']): string {
  switch (type) {
    case 'park':
      return 'i-ant-design-apartment-outlined'
    case 'building':
      return 'i-ant-design-home-outlined'
    case 'floor':
      return 'i-ant-design-appstore-outlined'
    case 'area':
      return 'i-ant-design-environment-outlined'
    default:
      return 'i-ant-design-video-camera-outlined'
  }
}

// 通道搜索
const searchValue = ref('')
const filteredTree = computed(() => {
  const kw = searchValue.value.trim().toLowerCase()
  if (!kw) return channelTree.value
  function filterNodes(nodes: ChannelNode[]): ChannelNode[] {
    const result: ChannelNode[] = []
    for (const node of nodes) {
      const matched = node.title.toLowerCase().includes(kw)
      const children = node.children ? filterNodes(node.children) : []
      if (matched || children.length) {
        result.push({ ...node, children: children.length ? children : node.children })
      }
    }
    return result
  }
  return filterNodes(channelTree.value)
})

// ===== 监控墙列表(左侧) =====
interface MonitorWall {
  id: string
  name: string
  /** 绑定的通道 key 列表 */
  channels: string[]
  /** 是否默认监控墙 */
  isDefault?: boolean
}

const walls = ref<MonitorWall[]>([
  { id: 'w1', name: '一层大厅监控墙', channels: ['ch-pm-1', 'ch-pm-2', 'ch-rd-1'], isDefault: true },
  { id: 'w2', name: '周界安防监控墙', channels: ['ch-rd-2', 'ch-rd-3'] },
  { id: 'w3', name: 'E栋4F办公区', channels: [] }
])

const activeWallId = ref('w1')
const activeWall = computed(() => walls.value.find(w => w.id === activeWallId.value) || walls.value[0])

// 列表搜索
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
  walls.value.push({ id, name, channels: [] })
  activeWallId.value = id
  addModalOpen.value = false
  addName.value = ''
}
function cancelAdd() {
  addModalOpen.value = false
  addName.value = ''
}

// 设为默认
function setDefault(w: MonitorWall) {
  if (w.isDefault) return
  walls.value.forEach(x => (x.isDefault = false))
  w.isDefault = true
}

// 取消默认
function unsetDefault(w: MonitorWall) {
  w.isDefault = false
}

// 监控墙重命名(inline)
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
    if (w && renamingText.value.trim()) {
      w.name = renamingText.value.trim()
    }
    renamingId.value = null
  }
}
function cancelRename() {
  renamingId.value = null
}

// 删除(二次确认)
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
    if (removedActive) {
      activeWallId.value = walls.value[0]?.id || ''
    }
  }
  deleteConfirmId.value = null
}
function cancelDelete() {
  deleteConfirmId.value = null
}

// ===== 管理视频模式 =====
// 点击「管理视频」后,视频墙右侧显示通道树面板
const manageMode = ref(false)

// 当前墙已勾选的通道
const checkedKeys = computed<string[]>({
  get: () => activeWall.value?.channels || [],
  set: (val) => {
    if (activeWall.value) activeWall.value.channels = val
  }
})

// ===== 分屏布局 =====
type Layout = '1' | '4' | '9'
const activeLayout = ref<Layout>('4')
const layouts: { key: Layout; cols: number; label: string }[] = [
  { key: '1', cols: 1, label: '单画面' },
  { key: '4', cols: 2, label: '四画面' },
  { key: '9', cols: 3, label: '九画面' }
]
const cellCount = computed(() => Number(activeLayout.value))

// 已勾选通道扁平化(按树顺序)
const flatChannels = computed(() => {
  const list: { key: string; title: string }[] = []
  function walk(nodes: ChannelNode[]) {
    for (const node of nodes) {
      if (node.isLeaf && checkedKeys.value.includes(node.key)) {
        list.push({ key: node.key, title: node.title })
      }
      if (node.children?.length) walk(node.children)
    }
  }
  walk(channelTree.value)
  return list
})

// 视频格
interface Cell {
  index: number
  channel: { key: string; title: string } | null
}
const cells = computed<Cell[]>(() => {
  const arr: Cell[] = []
  for (let i = 0; i < cellCount.value; i++) {
    arr.push({ index: i, channel: flatChannels.value[i] || null })
  }
  return arr
})

const overflowCount = computed(() => Math.max(0, flatChannels.value.length - cellCount.value))

// 全屏
const isFullscreen = ref(false)
function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value
}

// 弹出菜单控制(每个监控墙一个,用 ref 避免冲突)
const openMenuId = ref<string | null>(null)
function toggleWallMenu(w: MonitorWall, e: Event) {
  e.stopPropagation()
  openMenuId.value = openMenuId.value === w.id ? null : w.id
}
function closeMenu() {
  openMenuId.value = null
}

// 菜单项操作
function menuRename(w: MonitorWall) {
  closeMenu()
  startRename(w)
}
function menuManage() {
  closeMenu()
  manageMode.value = true
}
function menuDelete(w: MonitorWall) {
  closeMenu()
  requestDelete(w)
}

// 点击页面其他地方关闭菜单
function onDocumentClick() {
  openMenuId.value = null
}
onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))

// 通道总数(所有叶子)
const channelCount = computed(() => {
  let n = 0
  function walk(nodes: ChannelNode[]) {
    for (const node of nodes) {
      if (node.isLeaf) n++
      if (node.children?.length) walk(node.children)
    }
  }
  walk(channelTree.value)
  return n
})
</script>

<template>
  <div class="video-page">
    <!-- 页头 -->
    <header class="video-page__header">
      <div class="cloud-page-header__title">
        <i class="i-ant-design-play-circle-outlined header-icon" />
        <h1>实时视频</h1>
        <span class="cloud-page-header__description">
          快速预览在线通道画面，支持多画面监控和监控墙工作流
        </span>
      </div>
    </header>

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
            <i class="i-ant-desktop-outlined wall-list__empty-icon" />
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
              <button class="vlw__action" @click="toggleFullscreen">
                <i :class="isFullscreen ? 'i-ant-design-fullscreen-exit-outlined' : 'i-ant-design-fullscreen-outlined'" />
                <span>{{ isFullscreen ? '退出全屏' : '全屏' }}</span>
              </button>
              <button
                class="vlw__action"
                :class="{ 'is-active': manageMode }"
                title="勾选通道"
                @click="manageMode = !manageMode"
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
                  :class="{ 'is-playing': cell.channel }"
                >
                  <template v-if="cell.channel">
                    <div class="cell-playing">
                      <i class="i-ant-design-video-camera-outlined cell-playing-icon" />
                      <span class="cell-playing-name">{{ cell.channel.title }}</span>
                    </div>
                  </template>
                  <div v-else class="vmpg__cell-empty">
                    {{ manageMode ? `第 ${cell.index + 1} 格` : `拖拽到第 ${cell.index + 1} 格播放` }}
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

        <!-- ===== 通道选择树(管理视频模式,平时隐藏) ===== -->
        <transition name="channel-slide">
          <aside v-show="manageMode" class="vcp">
            <div class="vcp__head">
              <h4>选择通道</h4>
              <span class="vcp__count">{{ channelCount }} 路</span>
              <button class="vcp__close" title="关闭" @click="manageMode = false">
                <i class="i-ant-design-close-outlined" />
              </button>
            </div>

            <a-input-search
              v-model:value="searchValue"
              class="vcp__keyword"
              placeholder="搜索通道名称"
              allow-clear
            />

            <a-segmented
              v-model:value="segValue"
              class="vcp__segmented"
              block
              :options="segOptions"
            />

            <div class="vcp__content">
              <a-tree
                v-model:expanded-keys="expandedKeys"
                v-model:checked-keys="checkedKeys"
                :tree-data="filteredTree"
                checkable
                :field-names="{ title: 'title', key: 'key', children: 'children' }"
                class="vcp__tree"
              >
                <template #title="{ title, type, count, isLeaf }">
                  <span class="tree-node-label">
                    <i :class="nodeIcon(type)" class="tree-node-icon" />
                    <span class="tree-node-title">{{ title }}</span>
                    <span v-if="!isLeaf && count !== undefined" class="tree-node-count">{{ count }}</span>
                  </span>
                </template>
              </a-tree>
            </div>
          </aside>
        </transition>
      </div>
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
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.video-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-page;
  padding: 0 0 12px;
  overflow: hidden;
}

/* ===== 页头 ===== */
.video-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 0;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.cloud-page-header__title {
  display: flex;
  align-items: center;
  gap: 12px;

  .header-icon {
    font-size: 18px;
    color: $text-base;
  }

  h1 {
    font-size: 18px;
    font-weight: 650;
    color: $text-base;
    margin: 0;
  }

  .cloud-page-header__description {
    font-size: 14px;
    line-height: 21px;
    color: $text-muted;
    margin-left: 4px;
  }
}

/* ===== 主体 ===== */
.full-page-warp {
  flex: 1;
  display: flex;
  gap: 16px;
  overflow: hidden;
  padding: 0 16px;
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
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: $text-secondary;
    font-size: 16px;
    cursor: pointer;
    transition: all 0.15s;

    &:hover {
      background: rgba(0, 0, 0, 0.06);
      color: $color-primary;
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

  /* 更多按钮 - 无背景,纯图标(与空间管理列表一致) */
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

/* 视频墙(深色面板,纯色无渐变) */
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

  // 禁用态(已设为默认)
  &.is-disabled,
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;

    &:hover {
      background: rgba(255, 255, 255, 0.06);
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
    background: #2c2f36;
  }
}

.vmpg__cell-empty {
  font-size: 14px;
  color: $video-stage-text-weak;
}

.cell-playing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: $video-stage-text-strong;

  .cell-playing-icon {
    font-size: 36px;
    color: $color-primary;
    opacity: 0.9;
  }

  .cell-playing-name {
    font-size: 13px;
    text-align: center;
    padding: 0 16px;
    line-height: 1.4;
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

/* ===== 通道选择树面板(管理视频模式) ===== */
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

.vcp__tree {
  background: $bg-card;
  border-radius: 6px;

  :deep(.ant-tree-node-content-wrapper) {
    display: flex;
    align-items: center;

    &:hover {
      background: $bg-hover;
    }
  }

  :deep(.ant-tree-node-selected) {
    background: $color-primary-bg;
  }

  :deep(.ant-tree-checkbox-checked .ant-tree-checkbox-inner) {
    background-color: $color-primary;
    border-color: $color-primary;
  }

  :deep(.ant-tree-switcher) {
    color: $text-muted;
  }
}

.tree-node-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  .tree-node-icon {
    font-size: 14px;
    color: $text-secondary;
  }

  .tree-node-title {
    color: $text-base;
  }

  .tree-node-count {
    font-size: 12px;
    color: $text-muted;
  }
}

/* ===== 通道树滑入/滑出动画 ===== */
.channel-slide-enter-active,
.channel-slide-leave-active {
  transition: all 0.28s ease;
}

.channel-slide-enter-from,
.channel-slide-leave-to {
  opacity: 0;
  transform: translateX(20px);
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
</style>
