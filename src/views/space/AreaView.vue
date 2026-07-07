<script setup lang="ts">
/**
 * 区域管理（空间管理） - 1:1 复刻 space/AreaManagement
 * 左侧空间结构树 + 右侧详情面板
 */
import AreaTreeNode from './AreaTreeNode.vue'
import AssetBindView from './AssetBindView.vue'
import FloorPlanView from './FloorPlanView.vue'
import PanoramaView from './PanoramaView.vue'
import type { PlanMarker } from './FloorPlanView.vue'
import { videoDevices, iotDevices } from './devices.mock'

// ===== 空间结构树数据 =====
export interface TreeNode {
  id: string
  label: string
  level: number
  type?: 'park' | 'building' | 'floor' | 'area'
  count?: number
  icon?: string
  tip?: string
  desc?: string
  videoCount?: number
  iotCount?: number
  expanded?: boolean
  children?: TreeNode[]
  // 平面图：图片 URL（dataURL）+ 设备标记
  planImage?: string
  planImageOriginal?: string  // 美化前的原图（用于还原）
  planImageEnhanced?: boolean // 是否已美化
  markers?: PlanMarker[]
  // 3D 全景图：等距柱状投影全景图 URL
  panoramaImage?: string
}

// 平面图可选标记的设备池：合并视频 + 物联，统一字段
interface FloorPlanDevice {
  id: string
  name: string
  type: 'video' | 'iot'
  status: 'online' | 'offline'
  icon: string
  thumb?: string
  gateway?: string
}
const allBoundDevices = computed<FloorPlanDevice[]>(() => {
  // 仅当前选中空间的设备（用于平面图标记）
  const sid = selectedId.value
  const videos = videoDevices.value.filter(d => d.spaceId === sid).map(d => ({
    id: d.id, name: d.name, type: 'video' as const, status: d.status, icon: d.icon,
    thumb: d.thumb, gateway: d.gateway
  }))
  const iots = iotDevices.value.filter(d => d.spaceId === sid).map(d => ({
    id: d.id, name: d.name, type: 'iot' as const, status: d.status, icon: d.icon,
    gateway: d.gateway
  }))
  return [...videos, ...iots]
})

const treeData = ref<TreeNode[]>([
  {
    id: 'park-1',
    label: '物联网产业园区',
    level: 1,
    type: 'park',
    count: 2,
    videoCount: 12,
    iotCount: 28,
    expanded: true,
    children: [
      {
        id: 'b-e',
        label: 'E栋',
        level: 2,
        type: 'building',
        count: 2,
        videoCount: 8,
        iotCount: 18,
        expanded: true,
        children: [
          {
            id: 'f-4f',
            label: '4F',
            level: 3,
            type: 'floor',
            count: 2,
            videoCount: 4,
            iotCount: 10,
            expanded: true,
            children: [
              { id: 'a-rd', label: '研发部办公区', level: 4, type: 'area', videoCount: 2, iotCount: 4 },
              { id: 'a-pm', label: '项目部办公区', level: 4, type: 'area', videoCount: 2, iotCount: 6 }
            ]
          },
          { id: 'f-2f', label: '2F', level: 3, type: 'floor', videoCount: 4, iotCount: 8 }
        ]
      },
      {
        id: 'b-a',
        label: 'A栋',
        level: 2,
        type: 'building',
        count: 1,
        videoCount: 4,
        iotCount: 10,
        expanded: true,
        children: [
          {
            id: 'f-1f',
            label: '1F',
            level: 3,
            type: 'floor',
            count: 1,
            videoCount: 2,
            iotCount: 5,
            expanded: true,
            children: [
              { id: 'a-op', label: '运营办公室', level: 4, type: 'area', videoCount: 2, iotCount: 5 }
            ]
          }
        ]
      }
    ]
  }
])

function ensureExpanded(nodes: TreeNode[]) {
  nodes.forEach(n => {
    if (n.expanded === undefined) n.expanded = false
    if (n.children) ensureExpanded(n.children)
  })
}
ensureExpanded(treeData.value)

// 展开某个节点的所有祖先（让该节点在树里可见）
function expandAncestors(targetId: string) {
  function walk(nodes: TreeNode[]): boolean {
    for (const n of nodes) {
      if (n.id === targetId) return true
      if (n.children && walk(n.children)) {
        n.expanded = true
        return true
      }
    }
    return false
  }
  walk(treeData.value)
}

// ===== 设备数量统计：基于 devices.mock 的 spaceId 递归求和 =====
// 收集一个节点及其所有子孙节点的 id 集合
// 收集一个节点及其所有子孙节点的 id 集合
function collectSubtreeIds(node: TreeNode): Set<string> {
  const ids = new Set<string>([node.id])
  if (node.children) {
    for (const c of node.children) {
      for (const id of collectSubtreeIds(c)) ids.add(id)
    }
  }
  return ids
}

// 递归刷新每个节点的 videoCount / iotCount（当前节点 + 所有下级节点设备数之和）
function refreshCounts(node: TreeNode) {
  const idSet = collectSubtreeIds(node)
  node.videoCount = videoDevices.value.filter(d => idSet.has(d.spaceId)).length
  node.iotCount = iotDevices.value.filter(d => idSet.has(d.spaceId)).length
  if (node.children) node.children.forEach(refreshCounts)
}

function refreshAllCounts() {
  treeData.value.forEach(refreshCounts)
}

refreshAllCounts()

// 设备数据变化时重新统计（添加/解绑设备后）
watch([videoDevices, iotDevices], () => {
  refreshAllCounts()
}, { deep: true })

// 计算节点完整路径（如 "物联网产业园区/E栋/4F/研发部办公区"）
function getNodePath(id: string): string {
  const path: string[] = []
  function walk(nodes: TreeNode[], parents: string[]): boolean {
    for (const n of nodes) {
      const newParents = [...parents, n.label]
      if (n.id === id) {
        path.push(...newParents)
        return true
      }
      if (n.children && walk(n.children, newParents)) return true
    }
    return false
  }
  walk(treeData.value, [])
  return path.join(' / ')
}

const route = useRoute()

// 从 query 读取初始节点和 tab（如从空间态势跳转过来）
const initialNode = (route.query.node as string) || 'park-1'
const initialTab = (route.query.tab as string) || 'device'
const selectedId = ref(initialNode)

function selectNode(id: string) {
  selectedId.value = id
}

function toggleExpand(node: TreeNode) {
  node.expanded = !node.expanded
}

function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return n
    if (n.children) {
      const found = findNode(n.children, id)
      if (found) return found
    }
  }
  return null
}

const selectedNode = computed(() => findNode(treeData.value, selectedId.value))

// 应用路由参数：展开祖先让选中节点可见，无效 id 回退到根节点
if (initialNode !== 'park-1') {
  const exists = findNode(treeData.value, initialNode)
  if (exists) {
    expandAncestors(initialNode)
  } else {
    selectedId.value = 'park-1'
  }
}

const searchKey = ref('')

// + 按钮下拉菜单
const addActionOpen = ref(false)

// 当前选中节点的完整路径（如 "物联网产业园区/E栋"）
// 当前激活的 tab
const activeTab = ref(initialTab)

// 根据等级生成 tab 配置
interface TabConfig {
  key: string
  label: string
  icon: string
}

const tabs = computed<TabConfig[]>(() => {
  // 所有等级统一：绑定设备管理、平面图、空间白模
  return [
    { key: 'device', label: '绑定设备管理', icon: 'i-ant-design-api-outlined' },
    { key: 'plan', label: '空间平面图', icon: 'i-ant-design-file-image-outlined' },
    { key: 'model', label: '空间3D图', icon: 'i-ant-design-block-outlined' }
  ]
})

// 默认选中绑定设备管理
watch(selectedId, () => {
  // 切换节点时保持在当前 tab
})

function switchTab(tab: TabConfig) {
  activeTab.value = tab.key
}

// 树节点操作（更多菜单）
function handleTreeAction(action: string, node: TreeNode) {
  if (action === 'add') {
    openAddModal(node.id)
  } else if (action === 'move') {
    openMoveModal(node)
  } else if (action === 'delete') {
    openDeleteModal(node)
  }
}

// 行内重命名（来自 AreaTreeNode 的 rename 事件）
function handleRename(node: TreeNode, newName: string) {
  node.label = newName
}

// ===== 移动节点弹窗 =====
const moveModalVisible = ref(false)
const moveTargetNode = ref<TreeNode | null>(null)
// 选中的目标父节点 id
const moveSelectedParent = ref<string>('')

// 扁平化所有可选目标节点（用于预选父节点查找）
function findParent(nodes: TreeNode[], id: string, parent: TreeNode | null): TreeNode | null {
  for (const n of nodes) {
    if (n.id === id) return parent
    if (n.children) {
      const found = findParent(n.children, id, n)
      if (found !== null) return found
    }
  }
  return null
}

function openMoveModal(node: TreeNode) {
  moveTargetNode.value = node
  // 预选当前父节点
  const currentParent = findParent(treeData.value, node.id, null)
  moveSelectedParent.value = currentParent?.id || ''
  moveModalVisible.value = true
}

function confirmMove() {
  if (!moveTargetNode.value || !moveSelectedParent.value) return

  // 从原位置删除
  function removeNode(nodes: TreeNode[], id: string): TreeNode | null {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {
        return nodes.splice(i, 1)[0]
      }
      if (nodes[i].children) {
        const found = removeNode(nodes[i].children!, id)
        if (found) return found
      }
    }
    return null
  }

  const node = removeNode(treeData.value, moveTargetNode.value.id)
  if (!node) {
    moveModalVisible.value = false
    return
  }

  // 插入到目标父节点下
  function findNodeById(nodes: TreeNode[], id: string): TreeNode | null {
    for (const n of nodes) {
      if (n.id === id) return n
      if (n.children) {
        const found = findNodeById(n.children, id)
        if (found) return found
      }
    }
    return null
  }

  const newParent = findNodeById(treeData.value, moveSelectedParent.value)
  if (newParent) {
    if (!newParent.children) newParent.children = []
    newParent.children.push(node)
    newParent.expanded = true
    // 更新 level（保持与新父节点相对层级）
    node.level = newParent.level + 1
  }

  moveModalVisible.value = false
  moveTargetNode.value = null
}

// ===== 删除节点 =====
const deleteModalVisible = ref(false)
const deleteTargetNode = ref<TreeNode | null>(null)

function openDeleteModal(node: TreeNode) {
  deleteTargetNode.value = node
  deleteModalVisible.value = true
}

function confirmDelete() {
  if (!deleteTargetNode.value) return
  const targetId = deleteTargetNode.value.id

  function removeFromList(nodes: TreeNode[]): boolean {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === targetId) {
        nodes.splice(i, 1)
        return true
      }
      if (nodes[i].children && removeFromList(nodes[i].children!)) {
        return true
      }
    }
    return false
  }
  removeFromList(treeData.value)

  // 如果删除的是当前选中节点，切换到第一个
  if (selectedId.value === targetId) {
    selectedId.value = treeData.value[0]?.id || ''
  }

  deleteModalVisible.value = false
  deleteTargetNode.value = null
}

// ===== 新增空间弹窗 =====
const modalVisible = ref(false)
const modalForm = reactive({
  name: ''
})
// 弹窗目标节点（在哪个节点下新增）
const modalTargetId = ref<string>('')

// 打开弹窗（指定在哪个节点下新增）
function openAddModal(parentId: string) {
  modalTargetId.value = parentId
  modalForm.name = ''
  modalVisible.value = true
  addActionOpen.value = false
}

// 弹窗中显示的上级空间名称
const modalParentName = computed(() => {
  const node = findNode(treeData.value, modalTargetId.value)
  return node?.label || ''
})

// 根据父节点等级推断子节点 type
function childType(parentLevel: number): TreeNode['type'] {
  const types: (TreeNode['type'] | undefined)[] = [undefined, 'park', 'building', 'floor', 'area']
  return types[parentLevel + 1] || 'area'
}

// 保存新增
function handleAddSave() {
  if (!modalForm.name.trim()) return
  const parentNode = findNode(treeData.value, modalTargetId.value)
  if (!parentNode) return

  const newNode: TreeNode = {
    id: 'node-' + Date.now(),
    label: modalForm.name.trim(),
    level: parentNode.level + 1,
    type: childType(parentNode.level),
    tip: parentNode.level + 1 >= 3 ? '使用上级: 可绑定设备和视频通道，图纸继承自上级' : undefined,
    expanded: false
  }

  if (!parentNode.children) {
    parentNode.children = []
  }
  parentNode.children.push(newNode)
  parentNode.expanded = true
  // 更新 count
  if (parentNode.level < 4) {
    parentNode.count = parentNode.children.length
  }

  modalVisible.value = false
  // 选中新节点
  selectedId.value = newNode.id
}

// 是否显示新增下级入口（非第四级且无下级）

// 移动弹窗的 tree-select 数据（排除被移动节点本身及其子孙）
interface TreeSelectNode {
  value: string
  label: string
  children?: TreeSelectNode[]
}
const moveTreeData = computed<TreeSelectNode[]>(() => {
  if (!moveTargetNode.value) return []
  const excludeId = moveTargetNode.value.id

  // 判断 id 为 nodeId 的节点是否是 excludeId 节点本身或其子孙
  // （即：判断 nodeId 是否在以 excludeId 为根的子树内）
  function isSelfOrDescendant(nodeId: string, root: TreeNode): boolean {
    if (nodeId === root.id) return true
    if (!root.children) return false
    for (const child of root.children) {
      if (isSelfOrDescendant(nodeId, child)) return true
    }
    return false
  }

  // 找到被移动节点本身（用于判断其他节点是否是它的子孙）
  function findNodeById(nodes: TreeNode[], id: string): TreeNode | null {
    for (const n of nodes) {
      if (n.id === id) return n
      if (n.children) {
        const f = findNodeById(n.children, id)
        if (f) return f
      }
    }
    return null
  }

  const targetNode = findNodeById(treeData.value, excludeId)

  function convert(nodes: TreeNode[]): TreeSelectNode[] {
    const result: TreeSelectNode[] = []
    for (const n of nodes) {
      // 排除：被移动节点本身，及其所有子孙（避免循环）
      if (n.id === excludeId) continue
      if (targetNode && isSelfOrDescendant(n.id, targetNode)) continue
      const item: TreeSelectNode = { value: n.id, label: n.label }
      if (n.children && n.children.length) {
        item.children = convert(n.children)
      }
      result.push(item)
    }
    return result
  }
  return convert(treeData.value)
})
</script>

<template>
  <div class="area-page">
    <!-- 主体：左树 + 右详情 -->
    <div class="area-body">
      <!-- 左侧：空间列表 + 设备列表 -->
      <div class="left-column">
        <!-- 空间列表面板 -->
        <div class="space-panel">
          <!-- 标题栏 -->
          <div class="space-panel-header">
            <span class="panel-title">空间列表</span>
            <a-dropdown v-model:open="addActionOpen" trigger="click">
              <button class="add-btn">
                <i class="i-ant-design-plus-outlined" />
              </button>
              <template #overlay>
                <a-menu>
                  <a-menu-item key="new" @click="openAddModal(selectedId)">
                    <i class="i-ant-design-plus-outlined" />
                    <span>新增空间</span>
                  </a-menu-item>
                  <a-menu-item key="import">
                    <i class="i-ant-design-upload-outlined" />
                    <span>导入结构</span>
                  </a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </div>
          <!-- 搜索 -->
          <div class="tree-toolbar">
              <a-input v-model:value="searchKey" placeholder="搜索建筑、楼层或区域" class="tree-search-input">
                <template #prefix>
                  <i class="i-ant-design-search-outlined" />
                </template>
              </a-input>
          </div>
          <!-- 树 -->
          <div class="tree-scroll scroll-thin">
            <template v-if="treeData.length > 0">
              <AreaTreeNode
                v-for="node in treeData"
                :key="node.id"
                :node="node"
                :selected-id="selectedId"
                @select="selectNode"
                @toggle="toggleExpand"
                @action="handleTreeAction"
                @rename="handleRename"
              />
            </template>
            <div v-else class="tree-empty">
              <i class="i-ant-design-apartment-outlined tree-empty-icon" />
              <p class="tree-empty-title">暂无空间数据</p>
              <p class="tree-empty-hint">点击右上角 <i class="i-ant-design-plus-outlined" /> 新增空间</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：详情 -->
      <section class="area-workspace">
        <!-- tab -->
        <div class="area-tabs">
          <div
            v-for="tab in tabs"
            :key="tab.key"
            class="area-tab"
            :class="{ active: activeTab === tab.key }"
            @click="switchTab(tab)"
          >
            <i :class="tab.icon" class="tab-icon" />
            <span>{{ tab.label }}</span>
          </div>
        </div>

        <!-- 详情内容 -->
        <div class="workspace-content" v-if="selectedNode">
          <!-- 绑定设备管理 tab 内容 -->
          <template v-if="activeTab === 'device'">
            <AssetBindView
              :space-id="selectedNode.id"
              :space-name="selectedNode.label"
              :space-path="getNodePath(selectedNode.id)"
            />
          </template>

          <!-- 平面图 tab 内容 -->
          <template v-else-if="activeTab === 'plan'">
            <FloorPlanView :node="selectedNode" :devices="allBoundDevices" />
          </template>

          <!-- 空间3D图 tab 内容 -->
          <template v-else-if="activeTab === 'model'">
            <PanoramaView :node="selectedNode" :devices="allBoundDevices" />
          </template>

          <!-- 其他 tab 占位内容 -->
          <template v-else>
            <div class="tab-placeholder">
              <i class="i-ant-design-folder-open-outlined placeholder-icon" />
              <h3>{{ tabs.find(t => t.key === activeTab)?.label }}</h3>
              <p>该功能待开发</p>
            </div>
          </template>
        </div>
      </section>
    </div>
  </div>

  <!-- 新增空间弹窗 -->
  <a-modal
    v-model:open="modalVisible"
    title="新增空间"
    :width="480"
    ok-text="保存"
    cancel-text="取消"
    :ok-button-props="{ disabled: !modalForm.name.trim() }"
    @ok="handleAddSave"
  >
    <div class="modal-form">
      <div class="form-item">
        <label class="form-label">上级空间</label>
        <div class="form-readonly">{{ modalParentName }}</div>
      </div>
      <div class="form-item">
        <label class="form-label"><span class="required">*</span>空间名称</label>
        <a-input v-model:value="modalForm.name" placeholder="请输入空间名称" />
      </div>
    </div>
  </a-modal>

  <!-- 移动节点弹窗 -->
  <a-modal
    v-model:open="moveModalVisible"
    title="移动空间"
    :width="520"
    ok-text="确定"
    cancel-text="取消"
    :ok-button-props="{ disabled: !moveSelectedParent }"
    @ok="confirmMove"
  >
    <div class="modal-form">
      <div class="form-item">
        <label class="form-label">待移动节点</label>
        <div class="form-readonly">{{ moveTargetNode?.label }}</div>
      </div>
      <div class="form-item">
        <label class="form-label"><span class="required">*</span>选择上级空间</label>
        <a-tree-select
          v-model:value="moveSelectedParent"
          :tree-data="moveTreeData"
          placeholder="请选择上级空间"
          allow-clear
          tree-default-expand-all
          class="move-tree-select"
        />
      </div>
    </div>
  </a-modal>

  <!-- 删除节点确认弹窗 -->
  <a-modal
    v-model:open="deleteModalVisible"
    title="删除空间"
    :width="440"
    ok-text="删除"
    cancel-text="取消"
    ok-type="danger"
    @ok="confirmDelete"
  >
    <p class="unbind-tip">
      <i class="i-ant-design-exclamation-circle-filled unbind-warn-icon" />
      <span>
        确定要删除「<strong>{{ deleteTargetNode?.label }}</strong>」吗？
        <br />删除后该空间下的子空间也将一并删除，且无法恢复。
      </span>
    </p>
  </a-modal>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.area-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-page;
  padding: 8px;
  overflow: hidden;
}

/* ===== 主体 ===== */
.area-body {
  flex: 1;
  display: flex;
  gap: 16px;
  overflow: hidden;
}

/* ===== 左列：空间列表 + 设备列表 ===== */
.left-column {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

/* 空间列表面板 */
.space-panel {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  box-shadow: 0 1px rgba(20, 22, 30, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

/* 标题栏 */
.space-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 12px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  .panel-title {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
  }

  .header-icon {
    font-size: 15px;
    color: $text-secondary;
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: $color-primary;
    }
  }

  // 新增按钮（紫色实心 + 白色加号）
  .add-btn {
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
    cursor: pointer;
    transition: all 0.15s;

    i {
      font-size: 14px;
    }

    &:hover {
      background: $color-primary-hover;
      transform: scale(1.06);
    }

    &:active {
      transform: scale(0.96);
    }
  }
}

// 搜索
.tree-toolbar {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  .tree-search-input {
    flex: 1;
    border-radius: 8px;
  }
}

.tree-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  min-height: 0;
}

/* 空间列表空状态 */
.tree-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: $text-tertiary;

  .tree-empty-icon {
    font-size: 44px;
    color: $text-muted;
    opacity: 0.45;
    margin-bottom: 14px;
  }

  .tree-empty-title {
    font-size: 14px;
    color: $text-secondary;
    margin: 0 0 6px;
    font-weight: 500;
  }

  .tree-empty-hint {
    font-size: 12px;
    color: $text-muted;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 2px;

    i {
      font-size: 12px;
      color: $color-primary;
      border: 1px solid $color-primary;
      border-radius: 3px;
      padding: 0 1px;
    }
  }
}

/* ===== 右侧详情 ===== */
.area-workspace {
  flex: 1;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  box-shadow: 0 1px rgba(20, 22, 30, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.area-tabs {
  height: 42px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid $border-color-card;
  padding: 0 16px;
}

.area-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 42px;
  padding: 0 4px;
  margin-right: 16px;
  font-size: 14px;
  color: $text-secondary;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;

  .tab-icon {
    font-size: 14px;
  }

  &:hover:not(.disabled):not(.active) {
    color: $color-primary;
  }

  &.active {
    color: $color-primary;
    font-weight: 500;

    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -1px;
      height: 2px;
      background: $color-primary;
    }
  }

  // 禁用态
  &.disabled {
    color: #c0c4cc;
    cursor: not-allowed;
  }
}

/* 占位页 */
.tab-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: $text-tertiary;
  padding: 60px 0;

  .placeholder-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.4;
  }

  h3 {
    font-size: 18px;
    font-weight: 500;
    color: $text-secondary;
    margin: 0 0 8px;
  }

  p {
    font-size: 14px;
    margin: 0;
  }
}

.workspace-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;

  /* 平面图 / 3D图 tab：撑满、不要内边距和滚动 */
  &:has(.floor-plan-view),
  &:has(.panorama-view) {
    overflow: hidden;
    padding: 8px 12px;
  }
}

/* 详情头 */
.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid $border-color-card;
}

.detail-title-row {
  display: flex;
  align-items: center;
  gap: 10px;

  .detail-icon {
    font-size: 28px;
    color: $color-primary;
  }

  .detail-title-info {
    h3 {
      font-size: 16px;
      font-weight: 650;
      color: $text-base;
      margin: 0 0 2px;
    }

    .detail-tag {
      font-size: 12px;
      color: $text-tertiary;
    }
  }
}

.detail-actions {
  display: flex;
  gap: 4px;
}

.btn-text {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 12px;
  border: none;
  background: transparent;
  color: $text-secondary;
  font-size: 13px;
  cursor: pointer;
  border-radius: 6px;
  font-family: inherit;

  &:hover:not(:disabled) {
    background: $bg-hover;
    color: $color-primary;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

/* 基础资料卡 */
.info-card {
  padding: 16px 0;
  border-bottom: 1px solid $border-color-card;
}

.info-card-header {
  margin-bottom: 12px;

  h3 {
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
    margin: 0 0 4px;
  }

  p {
    font-size: 13px;
    color: $text-tertiary;
    margin: 0;
  }
}

// 基础资料列表（1:1 还原原页面字号颜色）
.info-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 24px;
  margin: 0;
}

.info-item {
  display: flex;
  align-items: baseline;
  gap: 12px;

  // label: 14px rgb(154,161,171)
  dt {
    font-size: 14px;
    color: #9aa1ab;
    white-space: nowrap;
    min-width: 70px;
  }

  // value: 14px rgb(17,20,24) 字重400
  dd {
    font-size: 14px;
    color: $text-base;
    font-weight: 400;
    margin: 0;
    word-break: break-all;
  }
}

/* 下级区域列表 */
.children-card {
  border-top: 1px solid $border-color-card;
  padding-top: 16px;
}

.children-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;

  h3 {
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
    margin: 0;
  }

  .children-count {
    font-size: 13px;
    color: $text-tertiary;
  }
}

.children-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.child-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 11px 12px;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;

  &:hover {
    border-color: $color-primary;
    box-shadow: 0 2px 8px rgba(110, 75, 255, 0.1);
  }

  .child-icon {
    font-size: 18px;
    color: $color-primary;
    flex-shrink: 0;
  }

  .child-info {
    flex: 1;
    text-align: left;

    .child-name {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: $text-base;
    }

    .child-meta {
      font-size: 12px;
      color: $text-tertiary;
    }
  }

  .child-arrow {
    font-size: 12px;
    color: $text-muted;
  }
}

/* 新增下级区域入口 */
.add-child-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 60px;
  border: 1px dashed $border-color-light;
  border-radius: 10px;
  cursor: pointer;
  color: $text-secondary;
  font-size: 14px;
  transition: all 0.2s;

  .add-child-icon {
    font-size: 18px;
  }

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
    background: #faf8ff;
  }
}

/* 弹窗表单 */
.modal-form {
  padding: 8px 0;

  .form-item {
    margin-bottom: 16px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .form-label {
    display: block;
    font-size: 14px;
    color: $text-base;
    margin-bottom: 6px;

    .required {
      color: #ff4d4f;
      margin-right: 2px;
    }
  }

  .form-readonly {
    height: 32px;
    line-height: 32px;
    padding: 0 11px;
    background: $bg-page;
    border-radius: 6px;
    font-size: 14px;
    color: $text-secondary;
  }
}

/* 移动弹窗 tree-select 宽度撑满 */
.move-tree-select {
  width: 100%;
}

/* 删除提示（复用解绑提示样式） */
.unbind-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  color: $text-base;
  margin: 0;

  .unbind-warn-icon {
    font-size: 18px;
    color: #faad14;
    flex-shrink: 0;
    margin-top: 1px;
  }
}
</style>
