<script setup lang="ts">
/**
 * 工地管理 — 左侧省市区树 + 右侧 4 个 Tab（基本信息/绑定设备/平面图/3D图）
 */
import SiteTreeNode from './SiteTreeNode.vue'
import AssetBindView from './AssetBindView.vue'
import FloorPlanView from './FloorPlanView.vue'
import Model3DView from './Model3DView.vue'
import type { Model3DMarker } from './Model3DView.vue'
import WorkerManageView from './WorkerManageView.vue'
import SiteInfoView from './SiteInfoView.vue'
import type { PlanMarker } from './FloorPlanView.vue'
import { videoDevices, iotDevices } from './devices.mock'
import siteImg1 from '@/assets/construction/site-1.jpg'
import siteImg2 from '@/assets/construction/site-2.jpg'
import siteImg3 from '@/assets/construction/site-3.jpg'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { personOptions } from './persons'

// ===== 树节点数据模型 =====
export interface TreeNode {
  id: string
  label: string
  level: number                    // 1=省, 2=市, 3=区, 4=工地
  type?: 'province' | 'city' | 'district' | 'site'
  videoCount?: number
  iotCount?: number
  expanded?: boolean
  children?: TreeNode[]
  // 工地专属字段（level 4）
  siteThumb?: string               // 工地缩略图
  desc?: string                    // 说明
  area?: number                    // 面积 ㎡
  address?: string                 // 地址
  lat?: number                     // 纬度
  lng?: number                     // 经度
  // 平面图
  planImage?: string
  planImageOriginal?: string
  planImageEnhanced?: boolean
  markers?: PlanMarker[]
  // 3D 模型
  model3DFile?: string             // 模型文件名
  model3DMarkers?: Model3DMarker[]
  // 人员权限
  permissions?: string[]           // 有权限的人员 id 列表
}

const siteThumbs = [siteImg1, siteImg2, siteImg3]

const treeData = ref<TreeNode[]>([
  {
    id: 'prov-zj',
    label: '浙江省',
    level: 1,
    type: 'province',
    expanded: true,
    children: [
      {
        id: 'city-hz',
        label: '杭州市',
        level: 2,
        type: 'city',
        expanded: true,
        children: [
          {
            id: 'dist-bj',
            label: '滨江区',
            level: 3,
            type: 'district',
            expanded: true,
            children: [
              { id: 'site-1', label: '滨江金融中心一期', level: 4, type: 'site', siteThumb: siteThumbs[0], desc: '超高层商业综合体，含办公楼、酒店及商业裙楼', area: 85000, address: '杭州市滨江区江南大道 588 号', lat: 30.2084, lng: 120.2116, videoCount: 3, iotCount: 4 }
            ]
          },
          {
            id: 'dist-gs',
            label: '拱墅区',
            level: 3,
            type: 'district',
            expanded: true,
            children: [
              { id: 'site-2', label: '城北科创园二期', level: 4, type: 'site', siteThumb: siteThumbs[1], desc: '产业园区项目，含 4 栋研发楼及配套设施', area: 42000, address: '杭州市拱墅区祥园路 28 号', lat: 30.3234, lng: 120.1429, videoCount: 2, iotCount: 3 }
            ]
          },
          {
            id: 'dist-xs',
            label: '萧山区',
            level: 3,
            type: 'district',
            expanded: false,
            children: [
              { id: 'site-3', label: '萧山国际机场扩建', level: 4, type: 'site', siteThumb: siteThumbs[2], desc: '航站楼扩建及停机坪改造工程', area: 120000, address: '杭州市萧山区空港大道 1 号', lat: 30.2391, lng: 120.4311, videoCount: 2, iotCount: 2 }
            ]
          }
        ]
      }
    ]
  }
])

// ===== 设备数量统计 =====
function collectSubtreeIds(node: TreeNode): Set<string> {
  const ids = new Set<string>([node.id])
  if (node.children) {
    for (const c of node.children) {
      for (const id of collectSubtreeIds(c)) ids.add(id)
    }
  }
  return ids
}

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

watch([videoDevices, iotDevices], () => {
  refreshAllCounts()
}, { deep: true })

// ===== 节点路径 =====
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

// ===== 选中节点 =====
const selectedId = ref('site-1')
const selectedNode = computed(() => findNode(treeData.value, selectedId.value))

function selectNode(id: string) {
  selectedId.value = id
  // 选中非工地节点时默认切到基本信息 tab
  const node = findNode(treeData.value, id)
  if (node && node.type !== 'site') {
    activeTab.value = 'info'
  }
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

// ===== 搜索 =====
const searchKey = ref('')

// ===== Tab =====
const activeTab = ref('info')
interface TabConfig { key: string; label: string; icon: string }
const tabs = computed<TabConfig[]>(() => {
  const node = selectedNode.value
  // 非工地节点只显示基本信息 tab（提示选择工地）
  if (node && node.type !== 'site') {
    return [{ key: 'info', label: '工地基本信息', icon: 'i-ant-design-info-circle-outlined' }]
  }
  return [
    { key: 'info', label: '工地基本信息', icon: 'i-ant-design-info-circle-outlined' },
    { key: 'device', label: '绑定设备管理', icon: 'i-ant-design-api-outlined' },
    { key: 'plan', label: '工地平面图', icon: 'i-ant-design-file-image-outlined' },
    { key: 'model', label: '工地3D图', icon: 'i-ant-design-block-outlined' },
    { key: 'worker', label: '工人管理', icon: 'i-ant-design-team-outlined' }
  ]
})

function switchTab(tab: TabConfig) {
  activeTab.value = tab.key
}

// ===== 平面图/3D 设备列表 =====
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
  const sid = selectedId.value
  const videos = videoDevices.value.filter(d => d.spaceId === sid).map(d => ({
    id: d.id, name: d.name, type: 'video' as const, status: d.status, icon: d.icon, thumb: d.thumb, gateway: d.gateway
  }))
  const iots = iotDevices.value.filter(d => d.spaceId === sid).map(d => ({
    id: d.id, name: d.name, type: 'iot' as const, status: d.status, icon: d.icon, gateway: d.gateway
  }))
  return [...videos, ...iots]
})

// ===== 树节点操作 =====
function handleTreeAction(action: string, node: TreeNode) {
  if (action === 'add') openAddModal(node.id)
  else if (action === 'move') openMoveModal(node)
  else if (action === 'delete') openDeleteModal(node)
}

function handleRename(node: TreeNode, newName: string) {
  node.label = newName
}

// ===== 移动弹窗 =====
const moveModalVisible = ref(false)
const moveTargetNode = ref<TreeNode | null>(null)
const moveSelectedParent = ref('')

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
  const currentParent = findParent(treeData.value, node.id, null)
  moveSelectedParent.value = currentParent?.id || ''
  moveModalVisible.value = true
}

function confirmMove() {
  if (!moveTargetNode.value || !moveSelectedParent.value) return
  function removeNode(nodes: TreeNode[], id: string): TreeNode | null {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return nodes.splice(i, 1)[0]
      if (nodes[i].children) {
        const found = removeNode(nodes[i].children!, id)
        if (found) return found
      }
    }
    return null
  }

  const node = removeNode(treeData.value, moveTargetNode.value.id)
  if (!node) { moveModalVisible.value = false; return }

  const newParent = findNode(treeData.value, moveSelectedParent.value)
  if (newParent) {
    if (!newParent.children) newParent.children = []
    newParent.children.push(node)
    newParent.expanded = true
    node.level = newParent.level + 1
  }
  moveModalVisible.value = false
  moveTargetNode.value = null
}

interface TreeSelectNode { value: string; label: string; children?: TreeSelectNode[] }
const moveTreeData = computed<TreeSelectNode[]>(() => {
  if (!moveTargetNode.value) return []
  const excludeId = moveTargetNode.value.id
  function isSelfOrDescendant(nodeId: string, root: TreeNode): boolean {
    if (nodeId === root.id) return true
    if (!root.children) return false
    for (const child of root.children) if (isSelfOrDescendant(nodeId, child)) return true
    return false
  }
  const targetNode = findNode(treeData.value, excludeId)
  function convert(nodes: TreeNode[]): TreeSelectNode[] {
    const result: TreeSelectNode[] = []
    for (const n of nodes) {
      if (n.id === excludeId) continue
      if (targetNode && isSelfOrDescendant(n.id, targetNode)) continue
      const item: TreeSelectNode = { value: n.id, label: n.label }
      if (n.children && n.children.length) item.children = convert(n.children)
      result.push(item)
    }
    return result
  }
  return convert(treeData.value)
})

// ===== 删除弹窗 =====
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
      if (nodes[i].id === targetId) { nodes.splice(i, 1); return true }
      if (nodes[i].children && removeFromList(nodes[i].children!)) return true
    }
    return false
  }
  removeFromList(treeData.value)
  if (selectedId.value === targetId) {
    selectedId.value = treeData.value[0]?.id || ''
  }
  deleteModalVisible.value = false
  deleteTargetNode.value = null
}

// ===== 地图选点逆地理编码（模拟）=====
// 根据经纬度生成一个合理的模拟地址
function reverseGeocode(lat: number, lng: number): string {
  const provinces = ['浙江省']
  const cities = ['杭州市', '宁波市', '温州市', '绍兴市']
  const districts = ['滨江区', '拱墅区', '萧山区', '西湖区', '余杭区', '上城区']
  const roads = ['江南大道', '庆春路', '解放路', '环城东路', '文三路', '莫干山路']
  const seed = Math.floor(Math.abs(lat * 1000 + lng * 1000))
  const p = provinces[seed % provinces.length]
  const c = cities[(seed >> 2) % cities.length]
  const d = districts[(seed >> 4) % districts.length]
  const r = roads[(seed >> 6) % roads.length]
  const num = 100 + (seed % 900)
  return `${p}${c}${d}${r} ${num} 号`
}

// ===== 新增工地弹窗 =====
const addModalVisible = ref(false)
const addTargetParentId = ref('')

const addForm = reactive({
  name: '',
  desc: '',
  area: 0 as number,
  address: '',
  lat: 30.25,
  lng: 120.15,
  thumb: '' as string,
  permissions: [] as string[]
})

const thumbInputRef = ref<HTMLInputElement | null>(null)

function openAddModal(parentId: string) {
  addTargetParentId.value = parentId
  addForm.name = ''
  addForm.desc = ''
  addForm.area = 0
  addForm.address = ''
  addForm.lat = 30.25
  addForm.lng = 120.15
  addForm.thumb = ''
  addForm.permissions = []
  addModalVisible.value = true
}

const addParentName = computed(() => {
  const node = findNode(treeData.value, addTargetParentId.value)
  return node?.label || ''
})

function triggerAddThumbUpload() {
  thumbInputRef.value?.click()
}

function handleAddThumbChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = () => { addForm.thumb = reader.result as string }
    reader.readAsDataURL(file)
  }
  target.value = ''
}

// 新增弹窗内的 Leaflet 选点地图
const addMapContainer = ref<HTMLDivElement | null>(null)
let addMap: L.Map | null = null
let addMarker: L.Marker | null = null

watch(addModalVisible, (v) => {
  if (v) {
    nextTick(() => initAddMap())
  } else {
    if (addMap) { addMap.remove(); addMap = null }
  }
})

async function initAddMap() {
  await nextTick()
  if (!addMapContainer.value) return
  if (addMap) { addMap.remove(); addMap = null }

  addMap = L.map(addMapContainer.value, {
    center: [addForm.lat, addForm.lng],
    zoom: 12,
    zoomControl: true,
    attributionControl: false
  })

  L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: ['1', '2', '3', '4'],
    maxZoom: 18
  }).addTo(addMap)

  addMarker = L.marker([addForm.lat, addForm.lng], {
    icon: L.divIcon({
      className: 'add-site-marker',
      html: `<div class="add-marker-pin"><i class="i-ant-design-environment-filled"></i></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    }),
    draggable: true
  }).addTo(addMap)

  addMarker.on('dragend', () => {
    const ll = addMarker!.getLatLng()
    addForm.lat = +ll.lat.toFixed(6)
    addForm.lng = +ll.lng.toFixed(6)
    addForm.address = reverseGeocode(addForm.lat, addForm.lng)
  })

  addMap.on('click', (e: L.LeafletMouseEvent) => {
    addForm.lat = +e.latlng.lat.toFixed(6)
    addForm.lng = +e.latlng.lng.toFixed(6)
    addMarker!.setLatLng(e.latlng)
    addForm.address = reverseGeocode(addForm.lat, addForm.lng)
  })

  // 弹窗内地图需要延迟刷新尺寸
  setTimeout(() => addMap?.invalidateSize(), 200)
}

function handleAddSave() {
  if (!addForm.name.trim()) return
  const parentNode = findNode(treeData.value, addTargetParentId.value)
  if (!parentNode) return

  const newNode: TreeNode = {
    id: 'site-' + Date.now(),
    label: addForm.name.trim(),
    level: 4,
    type: 'site',
    siteThumb: addForm.thumb || undefined,
    desc: addForm.desc || undefined,
    area: addForm.area || undefined,
    address: addForm.address || undefined,
    lat: addForm.lat,
    lng: addForm.lng,
    permissions: [...addForm.permissions],
    expanded: false
  }

  if (!parentNode.children) parentNode.children = []
  parentNode.children.push(newNode)
  parentNode.expanded = true

  addModalVisible.value = false
  selectedId.value = newNode.id
  activeTab.value = 'info'
}

// ===== SiteInfoView 编辑回调 =====
function handleSiteEdit(node: TreeNode, data: {
  name: string; desc: string; area: number; address: string; lat: number; lng: number; thumb?: string; permissions?: string[]
}) {
  node.label = data.name
  node.desc = data.desc
  node.area = data.area
  node.address = data.address
  node.lat = data.lat
  node.lng = data.lng
  node.siteThumb = data.thumb || node.siteThumb
  node.permissions = data.permissions ? [...data.permissions] : node.permissions
}
</script>

<template>
  <div class="manage-page">
    <div class="manage-body">
      <!-- 左侧：工地列表 -->
      <div class="left-column">
        <div class="list-panel">
          <div class="panel-header">
            <span class="panel-title">工地列表</span>
          </div>
          <div class="tree-toolbar">
            <a-input v-model:value="searchKey" placeholder="搜索省、市、区或工地" class="tree-search-input">
              <template #prefix><i class="i-ant-design-search-outlined" /></template>
            </a-input>
          </div>
          <div class="tree-scroll scroll-thin">
            <SiteTreeNode
              v-for="node in treeData"
              :key="node.id"
              :node="node"
              :selected-id="selectedId"
              :search-key="searchKey"
              @select="selectNode"
              @toggle="toggleExpand"
              @action="handleTreeAction"
              @rename="handleRename"
            />
          </div>
        </div>
      </div>

      <!-- 右侧：详情 -->
      <section class="workspace">
        <div class="workspace-tabs">
          <div
            v-for="tab in tabs"
            :key="tab.key"
            class="ws-tab"
            :class="{ active: activeTab === tab.key }"
            @click="switchTab(tab)"
          >
            <i :class="tab.icon" class="tab-icon" />
            <span>{{ tab.label }}</span>
          </div>
        </div>

        <div class="workspace-content" v-if="selectedNode">
          <!-- 基本信息 -->
          <template v-if="activeTab === 'info'">
            <SiteInfoView v-if="selectedNode.type === 'site'" :node="selectedNode" @edit="handleSiteEdit" @delete="openDeleteModal" />
            <div v-else class="tab-placeholder">
              <i class="i-ant-design-environment-outlined placeholder-icon" />
              <h3>请选择一个工地</h3>
              <p>在左侧列表中选择工地节点后，可查看和编辑工地基本信息</p>
            </div>
          </template>

          <!-- 绑定设备管理 -->
          <template v-else-if="activeTab === 'device'">
            <AssetBindView
              :space-id="selectedNode.id"
              :space-name="selectedNode.label"
              :space-path="getNodePath(selectedNode.id)"
            />
          </template>

          <!-- 工地平面图 -->
          <template v-else-if="activeTab === 'plan'">
            <FloorPlanView :node="selectedNode" :devices="allBoundDevices" />
          </template>

          <!-- 工地3D图 -->
          <template v-else-if="activeTab === 'model'">
            <Model3DView :node="selectedNode" :devices="allBoundDevices" />
          </template>

          <!-- 工人管理 -->
          <template v-else-if="activeTab === 'worker'">
            <WorkerManageView :node="selectedNode" />
          </template>
        </div>
      </section>
    </div>

    <!-- 隐藏的缩略图上传 input -->
    <input ref="thumbInputRef" type="file" accept="image/*" class="hidden-input" @change="handleAddThumbChange" />

    <!-- 新增工地弹窗 -->
    <a-modal
      v-model:open="addModalVisible"
      title="新增工地"
      :width="680"
      ok-text="保存"
      cancel-text="取消"
      :ok-button-props="{ disabled: !addForm.name.trim() }"
      @ok="handleAddSave"
    >
      <div class="add-form">
        <div class="add-form-item">
          <label class="add-label">所属区域</label>
          <div class="add-readonly">{{ addParentName }}</div>
        </div>

        <div class="add-form-item">
          <label class="add-label">工地缩略图</label>
          <div class="add-thumb-upload" @click="triggerAddThumbUpload">
            <img v-if="addForm.thumb" :src="addForm.thumb" alt="缩略图" />
            <div v-else class="upload-placeholder">
              <i class="i-ant-design-plus-outlined" />
              <span>上传图片</span>
            </div>
          </div>
        </div>

        <div class="add-form-item">
          <label class="add-label"><span class="required">*</span>工地名称</label>
          <a-input v-model:value="addForm.name" placeholder="请输入工地名称" />
        </div>

        <div class="add-form-item">
          <label class="add-label">说明</label>
          <a-textarea v-model:value="addForm.desc" :rows="2" placeholder="请输入工地说明" />
        </div>

        <div class="add-form-row">
          <div class="add-form-item" style="flex: 1">
            <label class="add-label">面积（㎡）</label>
            <a-input-number v-model:value="addForm.area" :min="0" placeholder="请输入面积" style="width: 100%" />
          </div>
          <div class="add-form-item" style="flex: 2">
            <label class="add-label">地址</label>
            <a-input v-model:value="addForm.address" placeholder="请输入工地地址" />
          </div>
        </div>

        <div class="add-form-item">
          <label class="add-label">地图位置</label>
          <div class="add-coords">
            <span class="coord-text">经度: {{ addForm.lng.toFixed(4) }}</span>
            <span class="coord-text">纬度: {{ addForm.lat.toFixed(4) }}</span>
          </div>
          <div ref="addMapContainer" class="add-map" />
          <p class="add-map-tip">点击地图选择位置，或拖动标记调整</p>
        </div>

        <div class="add-form-item">
          <label class="add-label">人员权限</label>
          <p class="add-perm-hint">设置哪些人员有权限查看和管理该工地</p>
          <a-checkbox-group v-model:value="addForm.permissions" class="add-perm-group">
            <div v-for="p in personOptions" :key="p.id" class="add-perm-item">
              <a-checkbox :value="p.id">
                <div class="add-perm-info">
                  <img :src="p.avatar" class="add-perm-avatar" alt="" />
                  <span class="add-perm-name">{{ p.name }}</span>
                  <span class="add-perm-role">{{ p.role }}</span>
                </div>
              </a-checkbox>
            </div>
          </a-checkbox-group>
        </div>
      </div>
    </a-modal>

    <!-- 移动节点弹窗 -->
    <a-modal
      v-model:open="moveModalVisible"
      title="移动节点"
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
          <label class="form-label"><span class="required">*</span>选择上级节点</label>
          <a-tree-select
            v-model:value="moveSelectedParent"
            :tree-data="moveTreeData"
            placeholder="请选择上级节点"
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
      title="删除节点"
      :width="440"
      ok-text="删除"
      cancel-text="取消"
      ok-type="danger"
      @ok="confirmDelete"
    >
      <p class="delete-tip">
        <i class="i-ant-design-exclamation-circle-filled warn-icon" />
        <span>
          确定要删除「<strong>{{ deleteTargetNode?.label }}</strong>」吗？
          <br />删除后该节点下的子节点也将一并删除，且无法恢复。
        </span>
      </p>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.manage-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-page;
  padding: 8px;
  overflow: hidden;
}

.manage-body {
  flex: 1;
  display: flex;
  gap: 16px;
  overflow: hidden;
}

/* ===== 左侧 ===== */
.left-column {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-panel {
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

.panel-header {
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
}

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

/* ===== 右侧 ===== */
.workspace {
  flex: 1;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  box-shadow: 0 1px rgba(20, 22, 30, 0.04);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workspace-tabs {
  height: 42px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid $border-color-card;
  padding: 0 16px;
}

.ws-tab {
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

  .tab-icon { font-size: 14px; }

  &:hover:not(.active) { color: $color-primary; }

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
}

.workspace-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;

  &:has(.floor-plan-view),
  &:has(.model-3d-view) {
    overflow: hidden;
    padding: 8px 12px;
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
  h3 { font-size: 18px; font-weight: 500; color: $text-secondary; margin: 0 0 8px; }
  p { font-size: 14px; margin: 0; }
}

.hidden-input { display: none; }

/* ===== 新增工地弹窗表单 ===== */
.add-form {
  padding: 8px 0;
  max-height: 60vh;
  overflow-y: auto;
  /* 默认隐藏滚动条，hover 显示，无背景轨道 */
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: transparent; border-radius: 2px; transition: background 0.2s; }

  &:hover {
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    &::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.2); }
  }
}

.add-form-row {
  display: flex;
  gap: 16px;
}

.add-form-item {
  margin-bottom: 16px;
  &:last-child { margin-bottom: 0; }
}

.add-label {
  display: block;
  font-size: 14px;
  color: $text-base;
  margin-bottom: 6px;
  .required { color: #ff4d4f; margin-right: 2px; }
}

.add-readonly {
  height: 32px;
  line-height: 32px;
  padding: 0 11px;
  background: $bg-page;
  border-radius: 6px;
  font-size: 14px;
  color: $text-secondary;
}

.add-thumb-upload {
  width: 200px;
  aspect-ratio: 4 / 3;
  border: 2px dashed $border-color-input;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    border-color: $color-primary;
    background: rgba(245, 240, 255, 0.5);
  }
  img { width: 100%; height: 100%; object-fit: cover; }
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: $text-muted;
  i { font-size: 24px; }
  span { font-size: 12px; }
}

.add-coords {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
  .coord-text { font-size: 12px; color: $text-secondary; font-family: monospace; }
}

.add-map {
  width: 100%;
  height: 280px;
  border-radius: 8px;
  border: 1px solid $border-color-card;
  overflow: hidden;

  :deep(.add-marker-pin) {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: $color-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 3px rgba(110, 75, 255, 0.2), 0 2px 6px rgba(0, 0, 0, 0.15);
    cursor: move;
    i { font-size: 16px; color: #fff; }
  }
}

.add-map-tip {
  font-size: 12px;
  color: $text-muted;
  margin: 6px 0 0;
}

/* 人员权限选择 */
.add-perm-hint {
  font-size: 12px;
  color: $text-muted;
  margin: 0 0 8px;
}

.add-perm-group {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.add-perm-item {
  border: 1px solid $border-color-card;
  border-radius: 8px;
  padding: 8px 12px;
  transition: all 0.15s;

  &:hover { border-color: $color-primary; }

  :deep(.ant-checkbox-wrapper) {
    margin-right: 0;
    display: flex;
    align-items: center;
  }
}

.add-perm-info {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.add-perm-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.add-perm-name {
  font-size: 13px;
  color: $text-base;
  font-weight: 500;
}

.add-perm-role {
  font-size: 11px;
  color: $text-muted;
}

/* ===== 通用弹窗表单 ===== */
.modal-form {
  padding: 8px 0;

  .form-item {
    margin-bottom: 16px;
    &:last-child { margin-bottom: 0; }
  }

  .form-label {
    display: block;
    font-size: 14px;
    color: $text-base;
    margin-bottom: 6px;
    .required { color: #ff4d4f; margin-right: 2px; }
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

.move-tree-select { width: 100%; }

.delete-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 14px;
  color: $text-base;
  margin: 0;

  .warn-icon {
    font-size: 18px;
    color: #faad14;
    flex-shrink: 0;
    margin-top: 1px;
  }
}
</style>
