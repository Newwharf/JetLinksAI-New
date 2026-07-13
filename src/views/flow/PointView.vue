<script setup lang="ts">
/**
 * 客流点位管理
 * 左侧区域/网关树 + 右侧点位卡片视角。
 */
import { flowPointCards, type FlowPointCard, type FlowLineStatus } from './mock'
import { useRouter } from 'vue-router'

type TreeMode = 'area' | 'gateway'

interface TreeNode {
  key: string
  label: string
  level: number
  cameraCount: number
  pointCount: number
  children?: TreeNode[]
}

interface AddCamera {
  key: string
  name: string
  status: 'online' | 'offline'
  thumb: string
  areaPath: string[]
  gatewayName: string
}

const treeMode = ref<TreeMode>('area')
const searchKey = ref('')
const selectedKey = ref('area:物联网产业园区')
const router = useRouter()
const pointCards = ref<FlowPointCard[]>(flowPointCards.map(point => ({ ...point, areaPath: [...point.areaPath] })))
const openMoreKey = ref<string | null>(null)
const editVisible = ref(false)
const deleteVisible = ref(false)
const currentOperatePoint = ref<FlowPointCard | null>(null)
const addVisible = ref(false)
const addStep = ref<1 | 2>(1)
const addTreeMode = ref<TreeMode>('area')
const selectedAddKey = ref('area:物联网产业园区')
const selectedCameraKey = ref('')
const successVisible = ref(false)
const createdPointKey = ref('')
const editForm = reactive({
  name: '',
  processInterval: 5,
  mqttInterval: 10,
  recordBefore: 15,
  recordAfter: 15,
  remark: ''
})
const addForm = reactive({
  name: '',
  processInterval: 5,
  mqttInterval: 10,
  recordBefore: 15,
  recordAfter: 15,
  remark: ''
})
const cameraPool: AddCamera[] = [
  {
    key: 'cam-free-001',
    name: '北门入口摄像头',
    status: 'online',
    thumb: flowPointCards[0].thumb,
    areaPath: ['物联网产业园区', 'A栋', '1F', '北门入口'],
    gatewayName: 'A栋网关'
  },
  {
    key: 'cam-free-002',
    name: '访客大厅摄像头',
    status: 'online',
    thumb: flowPointCards[1].thumb,
    areaPath: ['物联网产业园区', 'A栋', '1F', '访客大厅'],
    gatewayName: 'A栋网关'
  },
  {
    key: 'cam-free-003',
    name: '茶水间通道摄像头',
    status: 'offline',
    thumb: flowPointCards[2].thumb,
    areaPath: ['物联网产业园区', 'E栋', '4F', '茶水间通道'],
    gatewayName: 'E栋网关1'
  },
  {
    key: 'cam-free-004',
    name: '会议区入口摄像头',
    status: 'online',
    thumb: flowPointCards[3].thumb,
    areaPath: ['物联网产业园区', 'E栋', '3F', '会议区'],
    gatewayName: 'E栋网关2'
  },
  {
    key: 'cam-free-005',
    name: '南侧走廊摄像头',
    status: 'online',
    thumb: flowPointCards[4].thumb,
    areaPath: ['物联网产业园区', 'E栋', '2F', '公共区域'],
    gatewayName: 'E栋网关1'
  },
  {
    key: 'cam-free-006',
    name: '货梯厅摄像头',
    status: 'offline',
    thumb: flowPointCards[5].thumb,
    areaPath: ['物联网产业园区', 'B栋', '1F', '货梯厅'],
    gatewayName: 'B栋网关'
  }
]

function formatNumber(n: number) {
  return n.toLocaleString()
}

function fullArea(path: string[]) {
  return path.join(' / ')
}

function netCount(point: FlowPointCard) {
  return point.todayIn - point.todayOut
}

function lineStatusMeta(status: FlowLineStatus) {
  return status === 'done'
    ? { text: '已划线', cls: 'done' }
    : { text: '待划线', cls: 'pending' }
}

function openDetail(point: FlowPointCard) {
  router.push(`/flow/point/${point.key}`)
}

function openMore(point: FlowPointCard) {
  openMoreKey.value = openMoreKey.value === point.key ? null : point.key
}

function openEdit(point: FlowPointCard) {
  currentOperatePoint.value = point
  editForm.name = point.name
  editForm.processInterval = 5
  editForm.mqttInterval = 10
  editForm.recordBefore = 15
  editForm.recordAfter = 15
  editForm.remark = point.remark || ''
  editVisible.value = true
  openMoreKey.value = null
}

function saveEdit() {
  if (!currentOperatePoint.value) return
  const target = pointCards.value.find(point => point.key === currentOperatePoint.value?.key)
  const source = flowPointCards.find(point => point.key === currentOperatePoint.value?.key)
  if (target) {
    target.name = editForm.name.trim() || target.name
    target.remark = editForm.remark.trim()
  }
  if (source) {
    source.name = editForm.name.trim() || source.name
    source.remark = editForm.remark.trim()
  }
  editVisible.value = false
}

function openDelete(point: FlowPointCard) {
  currentOperatePoint.value = point
  deleteVisible.value = true
  openMoreKey.value = null
}

function confirmDelete() {
  if (!currentOperatePoint.value) return
  pointCards.value = pointCards.value.filter(point => point.key !== currentOperatePoint.value?.key)
  deleteVisible.value = false
  currentOperatePoint.value = null
}

function openAddPoint() {
  addVisible.value = true
  addStep.value = 1
  addTreeMode.value = 'area'
  selectedAddKey.value = 'area:物联网产业园区'
  selectedCameraKey.value = availableCameras.value[0]?.key || ''
}

function nextAddStep() {
  if (!selectedCamera.value) return
  addForm.name = selectedCamera.value.name
  addForm.processInterval = 5
  addForm.mqttInterval = 10
  addForm.recordBefore = 15
  addForm.recordAfter = 15
  addForm.remark = ''
  addStep.value = 2
}

function createPoint() {
  if (!selectedCamera.value) return
  const point: FlowPointCard = {
    key: `fp-new-${Date.now()}`,
    name: addForm.name.trim() || selectedCamera.value.name,
    cameraName: selectedCamera.value.name,
    thumb: selectedCamera.value.thumb,
    areaPath: [...selectedCamera.value.areaPath],
    gatewayName: selectedCamera.value.gatewayName,
    lineStatus: 'pending',
    todayIn: 0,
    todayOut: 0,
    remark: addForm.remark.trim()
  }

  pointCards.value.unshift(point)
  flowPointCards.unshift(point)
  createdPointKey.value = point.key
  addVisible.value = false
  successVisible.value = true
}

function goCreatedPoint() {
  successVisible.value = false
  router.push(`/flow/point/${createdPointKey.value}`)
}

function cameraStatusText(status: AddCamera['status']) {
  return status === 'online' ? '在线' : '离线'
}

function uniqueCameraCount(points: FlowPointCard[]) {
  return new Set(points.map(p => p.cameraName)).size
}

function uniqueAddCameraCount(cameras: AddCamera[]) {
  return new Set(cameras.map(camera => camera.name)).size
}

function buildAreaTree(points: FlowPointCard[]): TreeNode[] {
  const root: TreeNode = {
    key: 'area:物联网产业园区',
    label: '物联网产业园区',
    level: 1,
    cameraCount: 0,
    pointCount: 0,
    children: []
  }

  const nodeMap = new Map<string, TreeNode>([[root.key, root]])

  for (const point of points) {
    point.areaPath.forEach((label, idx) => {
      if (idx === 0) return
      const path = point.areaPath.slice(0, idx + 1).join('/')
      const key = 'area:' + path
      const parentPath = point.areaPath.slice(0, idx).join('/')
      const parentKey = 'area:' + parentPath
      const parent = nodeMap.get(parentKey) || root

      if (!nodeMap.has(key)) {
        const node: TreeNode = {
          key,
          label,
          level: idx + 1,
          cameraCount: 0,
          pointCount: 0,
          children: []
        }
        nodeMap.set(key, node)
        parent.children = parent.children || []
        parent.children.push(node)
      }
    })
  }

  for (const node of nodeMap.values()) {
    const scope = points.filter(p => node.key === 'area:' + p.areaPath.slice(0, node.level).join('/'))
    const descendants = points.filter(p => ('area:' + p.areaPath.join('/')).startsWith(node.key))
    const list = node.level === 4 ? scope : descendants
    node.cameraCount = uniqueCameraCount(list)
    node.pointCount = list.length
  }

  root.cameraCount = uniqueCameraCount(points)
  root.pointCount = points.length
  return [root]
}

function buildGatewayTree(points: FlowPointCard[]): TreeNode[] {
  const gateways = Array.from(new Set(points.map(p => p.gatewayName)))
  return [
    {
      key: 'gateway:all',
      label: '全部网关',
      level: 1,
      cameraCount: uniqueCameraCount(points),
      pointCount: points.length,
      children: gateways.map(gateway => {
        const list = points.filter(p => p.gatewayName === gateway)
        return {
          key: 'gateway:' + gateway,
          label: gateway,
          level: 2,
          cameraCount: uniqueCameraCount(list),
          pointCount: list.length
        }
      })
    }
  ]
}

function buildCameraAreaTree(cameras: AddCamera[]): TreeNode[] {
  const root: TreeNode = {
    key: 'area:物联网产业园区',
    label: '物联网产业园区',
    level: 1,
    cameraCount: 0,
    pointCount: 0,
    children: []
  }

  const nodeMap = new Map<string, TreeNode>([[root.key, root]])
  for (const camera of cameras) {
    camera.areaPath.forEach((label, idx) => {
      if (idx === 0) return
      const path = camera.areaPath.slice(0, idx + 1).join('/')
      const key = 'area:' + path
      const parentPath = camera.areaPath.slice(0, idx).join('/')
      const parentKey = 'area:' + parentPath
      const parent = nodeMap.get(parentKey) || root
      if (!nodeMap.has(key)) {
        const node: TreeNode = {
          key,
          label,
          level: idx + 1,
          cameraCount: 0,
          pointCount: 0,
          children: []
        }
        nodeMap.set(key, node)
        parent.children = parent.children || []
        parent.children.push(node)
      }
    })
  }

  for (const node of nodeMap.values()) {
    const descendants = cameras.filter(camera => ('area:' + camera.areaPath.join('/')).startsWith(node.key))
    node.cameraCount = uniqueAddCameraCount(descendants)
    node.pointCount = descendants.length
  }

  root.cameraCount = uniqueAddCameraCount(cameras)
  root.pointCount = cameras.length
  return [root]
}

function buildCameraGatewayTree(cameras: AddCamera[]): TreeNode[] {
  const gateways = Array.from(new Set(cameras.map(camera => camera.gatewayName)))
  return [
    {
      key: 'gateway:all',
      label: '全部网关',
      level: 1,
      cameraCount: uniqueAddCameraCount(cameras),
      pointCount: cameras.length,
      children: gateways.map(gateway => {
        const list = cameras.filter(camera => camera.gatewayName === gateway)
        return {
          key: 'gateway:' + gateway,
          label: gateway,
          level: 2,
          cameraCount: uniqueAddCameraCount(list),
          pointCount: list.length
        }
      })
    }
  ]
}

const areaTree = computed(() => buildAreaTree(pointCards.value))
const gatewayTree = computed(() => buildGatewayTree(pointCards.value))
const treeData = computed(() => treeMode.value === 'area' ? areaTree.value : gatewayTree.value)
const availableCameras = computed(() => {
  const used = new Set(pointCards.value.map(point => point.cameraName))
  return cameraPool.filter(camera => !used.has(camera.name))
})
const addAreaTree = computed(() => buildCameraAreaTree(availableCameras.value))
const addGatewayTree = computed(() => buildCameraGatewayTree(availableCameras.value))
const addTreeData = computed(() => addTreeMode.value === 'area' ? addAreaTree.value : addGatewayTree.value)
const selectedCamera = computed(() => availableCameras.value.find(camera => camera.key === selectedCameraKey.value) || null)
const filteredCameras = computed(() => {
  let list = availableCameras.value
  if (addTreeMode.value === 'area' && selectedAddKey.value.startsWith('area:')) {
    const path = selectedAddKey.value.replace('area:', '')
    list = list.filter(camera => fullArea(camera.areaPath).startsWith(path))
  }
  if (addTreeMode.value === 'gateway' && selectedAddKey.value !== 'gateway:all') {
    const gateway = selectedAddKey.value.replace('gateway:', '')
    list = list.filter(camera => camera.gatewayName === gateway)
  }
  return list
})

watch(treeMode, mode => {
  selectedKey.value = mode === 'area' ? 'area:物联网产业园区' : 'gateway:all'
})

watch(addTreeMode, mode => {
  selectedAddKey.value = mode === 'area' ? 'area:物联网产业园区' : 'gateway:all'
})

const selectedTitle = computed(() => {
  function find(nodes: TreeNode[]): TreeNode | undefined {
    for (const node of nodes) {
      if (node.key === selectedKey.value) return node
      const child = node.children ? find(node.children) : undefined
      if (child) return child
    }
    return undefined
  }
  return find(treeData.value)?.label || '全部'
})

const filteredPoints = computed(() => {
  let list = pointCards.value

  if (treeMode.value === 'area' && selectedKey.value.startsWith('area:')) {
    const path = selectedKey.value.replace('area:', '')
    list = list.filter(p => fullArea(p.areaPath).startsWith(path))
  }

  if (treeMode.value === 'gateway' && selectedKey.value !== 'gateway:all') {
    const gateway = selectedKey.value.replace('gateway:', '')
    list = list.filter(p => p.gatewayName === gateway)
  }

  const keyword = searchKey.value.trim().toLowerCase()
  if (keyword) {
    list = list.filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      p.cameraName.toLowerCase().includes(keyword) ||
      fullArea(p.areaPath).toLowerCase().includes(keyword) ||
      p.gatewayName.toLowerCase().includes(keyword)
    )
  }

  return list
})
</script>

<template>
  <div class="flow-point-page">
    <aside class="point-tree-panel">
      <div class="tree-panel__head">
        <strong>点位范围</strong>
        <span>{{ pointCards.length }} 个点位</span>
      </div>

      <div class="tree-mode">
        <button
          class="tree-mode__btn"
          :class="{ active: treeMode === 'area' }"
          @click="treeMode = 'area'"
        >
          <i class="i-ant-design-apartment-outlined" />
          <span>区域</span>
        </button>
        <button
          class="tree-mode__btn"
          :class="{ active: treeMode === 'gateway' }"
          @click="treeMode = 'gateway'"
        >
          <i class="i-ant-design-cloud-server-outlined" />
          <span>网关</span>
        </button>
      </div>

      <div class="tree-list scroll-thin">
        <template v-for="root in treeData" :key="root.key">
          <button
            class="tree-row"
            :class="{ active: selectedKey === root.key }"
            :style="{ paddingLeft: '10px' }"
            @click="selectedKey = root.key"
          >
            <i class="tree-row__icon" :class="treeMode === 'area' ? 'i-ant-design-apartment-outlined' : 'i-ant-design-cluster-outlined'" />
            <span class="tree-row__label">{{ root.label }}</span>
            <span class="tree-row__count">{{ root.cameraCount }} 摄像头</span>
            <span class="tree-row__count">{{ root.pointCount }} 点位</span>
          </button>
          <template v-for="child in root.children" :key="child.key">
            <button
              class="tree-row"
              :class="{ active: selectedKey === child.key }"
              :style="{ paddingLeft: treeMode === 'area' ? '26px' : '22px' }"
              @click="selectedKey = child.key"
            >
              <i class="tree-row__icon" :class="treeMode === 'area' ? 'i-ant-design-home-outlined' : 'i-ant-design-cloud-server-outlined'" />
              <span class="tree-row__label">{{ child.label }}</span>
              <span class="tree-row__count">{{ child.cameraCount }} 摄像头</span>
              <span class="tree-row__count">{{ child.pointCount }} 点位</span>
            </button>
            <template v-for="grand in child.children" :key="grand.key">
              <button
                class="tree-row"
                :class="{ active: selectedKey === grand.key }"
                :style="{ paddingLeft: '42px' }"
                @click="selectedKey = grand.key"
              >
                <i class="tree-row__icon i-ant-design-appstore-outlined" />
                <span class="tree-row__label">{{ grand.label }}</span>
                <span class="tree-row__count">{{ grand.cameraCount }} 摄像头</span>
                <span class="tree-row__count">{{ grand.pointCount }} 点位</span>
              </button>
              <button
                v-for="leaf in grand.children"
                :key="leaf.key"
                class="tree-row"
                :class="{ active: selectedKey === leaf.key }"
                :style="{ paddingLeft: '58px' }"
                @click="selectedKey = leaf.key"
              >
                <i class="tree-row__icon i-ant-design-environment-outlined" />
                <span class="tree-row__label">{{ leaf.label }}</span>
                <span class="tree-row__count">{{ leaf.cameraCount }} 摄像头</span>
                <span class="tree-row__count">{{ leaf.pointCount }} 点位</span>
              </button>
            </template>
          </template>
        </template>
      </div>
    </aside>

    <section class="point-workspace">
      <header class="point-toolbar">
        <div class="toolbar-title">
          <strong>{{ selectedTitle }}</strong>
          <span>共 {{ filteredPoints.length }} 个点位</span>
        </div>
        <div class="toolbar-actions">
          <div class="point-search">
            <i class="i-ant-design-search-outlined point-search__icon" />
            <input
              v-model="searchKey"
              class="point-search__input"
              placeholder="搜索点位名称、摄像头、区域或网关"
            />
          </div>
          <button class="add-point-btn" @click="openAddPoint">
            <i class="i-ant-design-plus-outlined" />
            新增点位
          </button>
        </div>
      </header>

      <div class="point-card-grid">
        <article
          v-for="point in filteredPoints"
          :key="point.key"
          class="flow-point-card"
          @click="openDetail(point)"
        >
          <div class="point-card__media">
            <img :src="point.thumb" :alt="point.cameraName" draggable="false" />
            <div class="point-card__overlay" />
            <div v-if="point.lineStatus === 'done'" class="point-line-preview">
              <svg viewBox="0 0 240 150" preserveAspectRatio="none" aria-hidden="true">
                <polygon class="preview-zone" points="35,64 98,28 216,70 148,124" />
                <polyline class="preview-edge" points="35,64 98,28 216,70 148,124 35,64" />
                <circle class="preview-node" cx="35" cy="64" r="7" />
                <circle class="preview-node" cx="98" cy="28" r="7" />
                <circle class="preview-node" cx="216" cy="70" r="7" />
                <circle class="preview-node" cx="148" cy="124" r="7" />
                <g class="preview-arrow-group preview-arrow-group--in" transform="translate(96 70) rotate(-20)">
                  <path d="M0 7 H28 V0 L46 14 L28 28 V21 H0 Z" />
                  <text x="18" y="18">进</text>
                </g>
                <g class="preview-arrow-group preview-arrow-group--out" transform="translate(137 88) rotate(24)">
                  <path d="M0 7 H28 V0 L46 14 L28 28 V21 H0 Z" />
                  <text x="18" y="18">出</text>
                </g>
              </svg>
            </div>
            <button class="media-more-btn" title="更多" @click.stop="openMore(point)">
              <i class="i-ant-design-more-outlined" />
            </button>
            <div v-if="openMoreKey === point.key" class="more-popover" @click.stop>
              <button @click="openEdit(point)">
                <i class="i-ant-design-edit-outlined" />
                编辑
              </button>
              <button class="danger" @click="openDelete(point)">
                <i class="i-ant-design-delete-outlined" />
                删除
              </button>
            </div>
            <span class="camera-name">
              <i class="i-ant-design-video-camera-outlined" />
              {{ point.cameraName }}
            </span>
          </div>
          <div class="point-card__body">
            <div class="point-card__title-row">
              <strong class="point-card__title" :title="point.name">{{ point.name }}</strong>
              <span class="line-tag" :class="lineStatusMeta(point.lineStatus).cls">
                {{ lineStatusMeta(point.lineStatus).text }}
              </span>
            </div>
            <div class="point-card__line" :title="fullArea(point.areaPath)">
              <i class="i-ant-design-environment-outlined" />
              <span>{{ fullArea(point.areaPath) }}</span>
            </div>
            <div class="point-card__line" :title="point.gatewayName">
              <i class="i-ant-design-cloud-server-outlined" />
              <span>{{ point.gatewayName }}</span>
            </div>
            <div class="point-card__metrics">
              <div class="metric">
                <span>今日进</span>
                <strong>{{ formatNumber(point.todayIn) }}</strong>
              </div>
              <div class="metric">
                <span>今日出</span>
                <strong>{{ formatNumber(point.todayOut) }}</strong>
              </div>
              <div class="metric">
                <span>净人数</span>
                <strong :class="{ negative: netCount(point) < 0 }">{{ formatNumber(netCount(point)) }}</strong>
              </div>
            </div>
          </div>
        </article>

        <div v-if="filteredPoints.length === 0" class="point-empty">
          <i class="i-ant-design-inbox-outlined" />
          <p>暂无匹配的客流点位</p>
        </div>
      </div>
    </section>

    <div v-if="editVisible" class="modal-mask" @click.self="editVisible = false">
      <section class="edit-modal">
        <header class="modal-head">
          <strong>编辑点位</strong>
          <button @click="editVisible = false">
            <i class="i-ant-design-close-outlined" />
          </button>
        </header>
        <div class="edit-form">
          <label>
            <span>名称</span>
            <input v-model="editForm.name" />
          </label>
          <label>
            <span>处理间隔</span>
            <input v-model.number="editForm.processInterval" type="number" min="1" />
          </label>
          <label>
            <span>MQTT发布间隔</span>
            <input v-model.number="editForm.mqttInterval" type="number" min="1" />
          </label>
          <label>
            <span>录像前置时间</span>
            <input v-model.number="editForm.recordBefore" type="number" min="0" />
          </label>
          <label>
            <span>录像后置时间</span>
            <input v-model.number="editForm.recordAfter" type="number" min="0" />
          </label>
          <label class="full">
            <span>说明</span>
            <textarea v-model="editForm.remark" rows="4" placeholder="请输入点位说明" />
          </label>
        </div>
        <footer class="modal-actions">
          <button class="cancel-btn" @click="editVisible = false">取消</button>
          <button class="save-btn" @click="saveEdit">保存</button>
        </footer>
      </section>
    </div>

    <div v-if="deleteVisible" class="modal-mask" @click.self="deleteVisible = false">
      <section class="confirm-modal">
        <div class="confirm-icon">
          <i class="i-ant-design-exclamation-circle-outlined" />
        </div>
        <strong>删除点位</strong>
        <p>确定删除“{{ currentOperatePoint?.name }}”吗？删除后当前列表将不再显示该点位。</p>
        <footer class="modal-actions">
          <button class="cancel-btn" @click="deleteVisible = false">取消</button>
          <button class="delete-btn" @click="confirmDelete">确定删除</button>
        </footer>
      </section>
    </div>

    <div v-if="addVisible" class="modal-mask" @click.self="addVisible = false">
      <section class="add-modal">
        <header class="modal-head">
          <strong>新增点位</strong>
          <button @click="addVisible = false">
            <i class="i-ant-design-close-outlined" />
          </button>
        </header>

        <div class="step-bar">
          <div class="step-item" :class="{ active: addStep === 1, done: addStep === 2 }">
            <span>1</span>
            选择摄像头
          </div>
          <div class="step-line" />
          <div class="step-item" :class="{ active: addStep === 2 }">
            <span>2</span>
            填写点位信息
          </div>
        </div>

        <div v-if="addStep === 1" class="camera-select-layout">
          <aside class="add-tree-panel">
            <div class="tree-mode compact">
              <button
                class="tree-mode__btn"
                :class="{ active: addTreeMode === 'area' }"
                @click="addTreeMode = 'area'"
              >
                区域
              </button>
              <button
                class="tree-mode__btn"
                :class="{ active: addTreeMode === 'gateway' }"
                @click="addTreeMode = 'gateway'"
              >
                网关
              </button>
            </div>
            <div class="tree-list scroll-thin">
              <template v-for="root in addTreeData" :key="root.key">
                <button
                  class="tree-row"
                  :class="{ active: selectedAddKey === root.key }"
                  :style="{ paddingLeft: '10px' }"
                  @click="selectedAddKey = root.key"
                >
                  <i class="tree-row__icon" :class="addTreeMode === 'area' ? 'i-ant-design-apartment-outlined' : 'i-ant-design-cluster-outlined'" />
                  <span class="tree-row__label">{{ root.label }}</span>
                  <span class="tree-row__count">{{ root.cameraCount }}</span>
                </button>
                <template v-for="child in root.children" :key="child.key">
                  <button
                    class="tree-row"
                    :class="{ active: selectedAddKey === child.key }"
                    :style="{ paddingLeft: addTreeMode === 'area' ? '26px' : '22px' }"
                    @click="selectedAddKey = child.key"
                  >
                    <i class="tree-row__icon" :class="addTreeMode === 'area' ? 'i-ant-design-home-outlined' : 'i-ant-design-cloud-server-outlined'" />
                    <span class="tree-row__label">{{ child.label }}</span>
                    <span class="tree-row__count">{{ child.cameraCount }}</span>
                  </button>
                  <template v-for="grand in child.children" :key="grand.key">
                    <button
                      class="tree-row"
                      :class="{ active: selectedAddKey === grand.key }"
                      :style="{ paddingLeft: '42px' }"
                      @click="selectedAddKey = grand.key"
                    >
                      <i class="tree-row__icon i-ant-design-appstore-outlined" />
                      <span class="tree-row__label">{{ grand.label }}</span>
                      <span class="tree-row__count">{{ grand.cameraCount }}</span>
                    </button>
                    <button
                      v-for="leaf in grand.children"
                      :key="leaf.key"
                      class="tree-row"
                      :class="{ active: selectedAddKey === leaf.key }"
                      :style="{ paddingLeft: '58px' }"
                      @click="selectedAddKey = leaf.key"
                    >
                      <i class="tree-row__icon i-ant-design-environment-outlined" />
                      <span class="tree-row__label">{{ leaf.label }}</span>
                      <span class="tree-row__count">{{ leaf.cameraCount }}</span>
                    </button>
                  </template>
                </template>
              </template>
            </div>
          </aside>

          <section class="camera-cards scroll-thin">
            <article
              v-for="camera in filteredCameras"
              :key="camera.key"
              class="camera-card"
              :class="{ selected: selectedCameraKey === camera.key }"
              @click="selectedCameraKey = camera.key"
            >
              <div class="camera-card__media">
                <img :src="camera.thumb" :alt="camera.name" draggable="false" />
              </div>
              <div class="camera-card__body">
                <div class="camera-card__title-row">
                  <strong :title="camera.name">{{ camera.name }}</strong>
                  <span class="status-tag" :class="camera.status">{{ cameraStatusText(camera.status) }}</span>
                </div>
                <div class="camera-card__line" :title="fullArea(camera.areaPath)">
                  <i class="i-ant-design-environment-outlined" />
                  <span>{{ fullArea(camera.areaPath) }}</span>
                </div>
                <div class="camera-card__line" :title="camera.gatewayName">
                  <i class="i-ant-design-cloud-server-outlined" />
                  <span>{{ camera.gatewayName }}</span>
                </div>
              </div>
            </article>

            <div v-if="filteredCameras.length === 0" class="camera-empty">
              <i class="i-ant-design-video-camera-outlined" />
              <p>当前节点暂无可创建点位的摄像头</p>
            </div>
          </section>
        </div>

        <div v-else class="add-info-step">
          <div v-if="selectedCamera" class="selected-camera-strip">
            <img :src="selectedCamera.thumb" :alt="selectedCamera.name" />
            <div>
              <strong>{{ selectedCamera.name }}</strong>
              <span>{{ fullArea(selectedCamera.areaPath) }} · {{ selectedCamera.gatewayName }}</span>
            </div>
          </div>
          <div class="edit-form add-form">
            <label>
              <span>名称</span>
              <input v-model="addForm.name" />
            </label>
            <label>
              <span>处理间隔</span>
              <input v-model.number="addForm.processInterval" type="number" min="1" />
            </label>
            <label>
              <span>MQTT发布间隔</span>
              <input v-model.number="addForm.mqttInterval" type="number" min="1" />
            </label>
            <label>
              <span>录像前置时间</span>
              <input v-model.number="addForm.recordBefore" type="number" min="0" />
            </label>
            <label>
              <span>录像后置时间</span>
              <input v-model.number="addForm.recordAfter" type="number" min="0" />
            </label>
            <label class="full">
              <span>说明</span>
              <textarea v-model="addForm.remark" rows="4" placeholder="请输入点位说明" />
            </label>
          </div>
        </div>

        <footer class="modal-actions">
          <button class="cancel-btn" @click="addStep === 1 ? (addVisible = false) : (addStep = 1)">
            {{ addStep === 1 ? '取消' : '上一步' }}
          </button>
          <button v-if="addStep === 1" class="save-btn" :disabled="!selectedCamera" @click="nextAddStep">下一步</button>
          <button v-else class="save-btn" @click="createPoint">确定</button>
        </footer>
      </section>
    </div>

    <div v-if="successVisible" class="modal-mask">
      <section class="success-modal">
        <div class="success-icon">
          <i class="i-ant-design-check-outlined" />
        </div>
        <strong>创建成功</strong>
        <p>点位已创建完成，建议立即进入划线配置，设置进出方向后即可开始统计客流。</p>
        <footer class="modal-actions">
          <button class="cancel-btn" @click="successVisible = false">暂时不用</button>
          <button class="save-btn" @click="goCreatedPoint">去划线</button>
        </footer>
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.flow-point-page {
  height: 100%;
  background: $bg-page;
  padding: 8px;
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 16px;
  overflow: hidden;
  color: $text-base;
}

.point-tree-panel,
.point-workspace {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  box-shadow: 0 1px rgba(20, 22, 30, 0.04);
  overflow: hidden;
  min-height: 0;
}

.point-tree-panel {
  display: flex;
  flex-direction: column;
}

.tree-panel__head {
  height: 40px;
  padding: 0 12px;
  border-bottom: 1px solid $border-color-card;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;

  strong {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
  }

  span {
    font-size: 12px;
    color: $text-muted;
  }
}

.tree-mode {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 10px 12px;
  border-bottom: 1px solid $border-color-card;
}

.tree-mode__btn {
  height: 32px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  font-size: 13px;
  font-family: inherit;
  transition: all 0.15s;

  i {
    font-size: 14px;
  }

  &:hover {
    color: $color-primary;
    border-color: $color-primary;
  }

  &.active {
    color: $color-primary;
    background: $color-primary-bg;
    border-color: $color-primary-bg;
  }
}

.tree-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.tree-row {
  width: 100%;
  min-height: 34px;
  border: none;
  border-radius: 6px;
  background: transparent;
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 5px;
  padding-right: 8px;
  padding-bottom: 5px;
  color: $text-base;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background 0.15s, color 0.15s;

  &:hover {
    background: $bg-hover;
  }

  &.active {
    background: $color-primary-bg;
    color: $color-primary;
    font-weight: 500;

    .tree-row__icon {
      color: $color-primary;
    }
  }
}

.tree-row__icon {
  font-size: 14px;
  color: $text-secondary;
  flex-shrink: 0;
}

.tree-row__label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}

.tree-row__count {
  font-size: 11px;
  color: $text-muted;
  white-space: nowrap;
  flex-shrink: 0;
  font-weight: 400;
}

.point-workspace {
  display: flex;
  flex-direction: column;
}

.point-toolbar {
  height: 56px;
  padding: 0 16px;
  border-bottom: 1px solid $border-color-card;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
}

.toolbar-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;

  strong {
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    font-size: 12px;
    color: $text-muted;
    flex-shrink: 0;
  }
}

.point-search {
  position: relative;
  width: 360px;
  flex-shrink: 0;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.point-search__icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: $text-muted;
  z-index: 1;
}

.point-search__input {
  width: 100%;
  height: 38px;
  padding: 4px 11px 4px 36px;
  border: 1px solid rgb(235, 237, 240);
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: $text-base;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: $text-muted;
  }

  &:focus {
    border-color: $color-primary;
  }
}

.add-point-btn {
  height: 38px;
  padding: 0 14px;
  border: 1px solid $color-primary;
  border-radius: 6px;
  background: $color-primary;
  color: #fff;
  font-size: 13px;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: #5a3ee6;
    border-color: #5a3ee6;
  }
}

.point-card-grid {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px;
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  align-content: start;
}

.flow-point-card {
  min-width: 0;
  background: #fff;
  border: 1px solid rgb(235, 237, 240);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.2s, border-color 0.2s;

  &:hover {
    border-color: $color-primary;
    box-shadow: 0 2px 8px rgba(110, 75, 255, 0.1);

    .point-card__media img {
      transform: scale(1.04);
    }
  }
}

.point-card__media {
  position: relative;
  aspect-ratio: 16 / 10;
  background: #1a1a2e;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.3s;
  }
}

.point-card__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.45) 0%, transparent 40%, rgba(0, 0, 0, 0.4) 100%);
  pointer-events: none;
}

.point-line-preview {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;

  svg {
    width: 100%;
    height: 100%;
    display: block;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.35));
  }
}

.preview-zone {
  fill: rgba(47, 215, 236, 0.16);
}

.preview-edge {
  fill: none;
  stroke: #2fd7ec;
  stroke-width: 5;
  stroke-linejoin: round;
}

.preview-node {
  fill: #fff;
  stroke: #1677ff;
  stroke-width: 4;
}

.preview-arrow-group {
  path {
    fill: #22c55e;
  }

  text {
    fill: #fff;
    font-size: 13px;
    font-weight: 700;
    text-anchor: middle;
    dominant-baseline: middle;
  }
}

.preview-arrow-group--in path {
  fill: #ff7a1a;
}

.media-more-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.62);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 3;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    background: rgba(15, 23, 42, 0.86);
    border-color: rgba(255, 255, 255, 0.55);
  }
}

.camera-name {
  position: absolute;
  left: 8px;
  bottom: 8px;
  max-width: calc(100% - 16px);
  display: flex;
  align-items: center;
  gap: 4px;
  color: #fff;
  font-size: 12px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  i {
    font-size: 12px;
    flex-shrink: 0;
  }
}

.point-card__body {
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.point-card__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.point-card__title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
}

.line-tag {
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 7px;
  border-radius: 4px;

  &.done {
    color: $color-online;
    background: $color-online-bg;
  }

  &.pending {
    color: #fa8c16;
    background: rgba(250, 140, 22, 0.12);
  }
}

.point-card__line {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 12px;
  color: $text-tertiary;

  i {
    font-size: 12px;
    color: $text-muted;
    flex-shrink: 0;
  }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.point-card__metrics {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  padding-top: 9px;
  border-top: 1px solid $border-color-card;
}

.metric {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  span {
    font-size: 11px;
    color: $text-muted;
  }

  strong {
    font-size: 14px;
    font-weight: 650;
    color: $text-base;
    line-height: 1.2;

    &.negative {
      color: #fa541c;
    }
  }
}

.more-popover {
  position: absolute;
  right: 8px;
  top: 42px;
  width: 118px;
  padding: 6px;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(20, 22, 30, 0.14);
  z-index: 4;

  button {
    width: 100%;
    height: 32px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: $text-secondary;
    font-size: 13px;
    font-family: inherit;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 8px;
    cursor: pointer;

    &:hover {
      background: $bg-hover;
      color: $color-primary;
    }

    &.danger {
      color: #cf1322;

      &:hover {
        background: rgba(255, 77, 79, 0.08);
      }
    }
  }
}

.point-empty {
  grid-column: 1 / -1;
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: $text-muted;
  gap: 8px;

  i {
    font-size: 40px;
    opacity: 0.4;
  }

  p {
    margin: 0;
    font-size: 13px;
  }
}

.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.edit-modal,
.confirm-modal {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 18px 48px rgba(20, 22, 30, 0.22);
}

.edit-modal {
  width: 560px;
  overflow: hidden;
}

.add-modal {
  width: 980px;
  height: 720px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 18px 48px rgba(20, 22, 30, 0.22);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-head {
  height: 52px;
  padding: 0 18px;
  border-bottom: 1px solid $border-color-card;
  display: flex;
  align-items: center;
  justify-content: space-between;

  strong {
    font-size: 16px;
    font-weight: 600;
  }

  button {
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: $text-muted;
    cursor: pointer;

    &:hover {
      background: $bg-hover;
      color: $text-base;
    }
  }
}

.edit-form {
  padding: 18px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;

  label {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  .full {
    grid-column: 1 / -1;
  }

  span {
    color: $text-secondary;
    font-size: 13px;
  }

  input,
  textarea {
    width: 100%;
    border: 1px solid rgb(235, 237, 240);
    border-radius: 6px;
    background: #fff;
    color: $text-base;
    font-family: inherit;
    font-size: 13px;
    outline: none;
    transition: border-color 0.15s;

    &:focus {
      border-color: $color-primary;
    }
  }

  input {
    height: 36px;
    padding: 0 10px;
  }

  textarea {
    resize: none;
    padding: 9px 10px;
    line-height: 1.5;
  }
}

.step-bar {
  height: 58px;
  padding: 0 24px;
  border-bottom: 1px solid $border-color-card;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  flex-shrink: 0;
}

.step-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: $text-muted;
  font-size: 13px;
  font-weight: 500;

  span {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: $bg-page;
    color: $text-muted;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }

  &.active,
  &.done {
    color: $color-primary;

    span {
      background: $color-primary;
      color: #fff;
    }
  }
}

.step-line {
  width: 96px;
  height: 1px;
  background: $border-color-card;
}

.camera-select-layout {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  background: $bg-page;
}

.add-tree-panel {
  min-height: 0;
  border-right: 1px solid $border-color-card;
  background: #fff;
  display: flex;
  flex-direction: column;

  .tree-mode.compact {
    padding: 10px;
  }

  .tree-list {
    padding: 8px;
  }
}

.camera-cards {
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-content: start;
}

.camera-card {
  min-width: 0;
  border: 1px solid rgb(235, 237, 240);
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover,
  &.selected {
    border-color: $color-primary;
    box-shadow: 0 2px 8px rgba(110, 75, 255, 0.1);
  }

  &.selected {
    outline: 2px solid rgba(110, 75, 255, 0.16);
  }
}

.camera-card__media {
  aspect-ratio: 16 / 9;
  background: #171b25;
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.camera-card__body {
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.camera-card__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  strong {
    flex: 1;
    min-width: 0;
    color: $text-base;
    font-size: 14px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.status-tag {
  flex-shrink: 0;
  padding: 2px 7px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;

  &.online {
    color: $color-online;
    background: $color-online-bg;
  }

  &.offline {
    color: $text-muted;
    background: $bg-page;
  }
}

.camera-card__line {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  color: $text-tertiary;
  font-size: 12px;

  i {
    color: $text-muted;
    flex-shrink: 0;
  }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.camera-empty {
  grid-column: 1 / -1;
  min-height: 360px;
  color: $text-muted;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;

  i {
    font-size: 38px;
    opacity: 0.45;
  }

  p {
    margin: 0;
    font-size: 13px;
  }
}

.add-info-step {
  flex: 1;
  min-height: 0;
  background: $bg-page;
  overflow-y: auto;
}

.selected-camera-strip {
  margin: 18px 18px 0;
  padding: 10px;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 12px;

  img {
    width: 112px;
    height: 64px;
    border-radius: 8px;
    object-fit: cover;
    background: #171b25;
  }

  div {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  strong {
    color: $text-base;
    font-size: 15px;
    font-weight: 600;
  }

  span {
    color: $text-tertiary;
    font-size: 12px;
  }
}

.add-form {
  margin: 0;
  padding: 18px;
}

.modal-actions {
  height: 58px;
  padding: 0 18px;
  border-top: 1px solid $border-color-card;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.cancel-btn,
.save-btn,
.delete-btn {
  height: 34px;
  padding: 0 14px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
}

.cancel-btn {
  border: 1px solid $border-color-card;
  background: #fff;
  color: $text-secondary;
}

.save-btn {
  border: 1px solid $color-primary;
  background: $color-primary;
  color: #fff;
}

.delete-btn {
  border: 1px solid #ff4d4f;
  background: #ff4d4f;
  color: #fff;
}

.save-btn:disabled {
  border-color: #d9d9d9;
  background: #f5f5f5;
  color: $text-muted;
  cursor: not-allowed;
}

.confirm-modal {
  width: 360px;
  padding-top: 26px;
  text-align: center;
  overflow: hidden;

  strong {
    display: block;
    margin-top: 10px;
    color: $text-base;
    font-size: 17px;
  }

  p {
    margin: 8px 28px 22px;
    color: $text-secondary;
    font-size: 13px;
    line-height: 1.6;
  }
}

.success-modal {
  width: 400px;
  padding-top: 28px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 18px 48px rgba(20, 22, 30, 0.22);
  text-align: center;
  overflow: hidden;

  strong {
    display: block;
    margin-top: 12px;
    color: $text-base;
    font-size: 18px;
    font-weight: 650;
  }

  p {
    margin: 10px 34px 24px;
    color: $text-secondary;
    font-size: 13px;
    line-height: 1.7;
  }
}

.success-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto;
  border-radius: 50%;
  background: $color-online-bg;
  color: $color-online;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.confirm-icon {
  width: 44px;
  height: 44px;
  margin: 0 auto;
  border-radius: 50%;
  background: rgba(255, 77, 79, 0.1);
  color: #cf1322;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

@media (max-width: 1240px) {
  .flow-point-page {
    grid-template-columns: 280px minmax(0, 1fr);
    gap: 12px;
  }
}
</style>
