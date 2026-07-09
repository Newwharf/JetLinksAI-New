<script setup lang="ts">
/**
 * 绑定设备管理 - 空间设备绑定 tab 内容
 * 标题（空间名+路径）+ 工具栏（tab/搜索/添加/批量解绑）+ 设备表格
 */
import { iotDevices, videoDevices } from './devices.mock'
import type { DeviceItem, VideoItem } from './devices.mock'
import VideoPlayerModal from '@/components/VideoPlayerModal.vue'
import cam1Img from '@/assets/text-search/result-01.jpg'
import cam2Img from '@/assets/text-search/result-02.jpg'
import cam3Img from '@/assets/text-search/result-03.jpg'
import cam4Img from '@/assets/text-search/result-04.jpg'
import cam5Img from '@/assets/text-search/result-05.jpg'

// ===== Props：当前空间 =====
const props = defineProps<{
  spaceId: string
  spaceName: string
  spacePath: string
}>()

// ===== 分类 tab =====
const activeCategory = ref<'video' | 'iot'>('video')

// ===== 搜索 =====
const searchKey = ref('')

// 当前空间的设备（按 spaceId 过滤全局数据）
const spaceVideos = computed(() => videoDevices.value.filter(d => d.spaceId === props.spaceId))
const spaceIots = computed(() => iotDevices.value.filter(d => d.spaceId === props.spaceId))

// 当前列表（搜索过滤）
const currentList = computed(() => {
  const source = activeCategory.value === 'video' ? spaceVideos.value : spaceIots.value
  if (!searchKey.value.trim()) return source
  const key = searchKey.value.toLowerCase()
  return source.filter(d =>
    d.name.toLowerCase().includes(key) ||
    d.id.toLowerCase().includes(key) ||
    d.product.toLowerCase().includes(key)
  )
})

// 设备总数（当前空间）
const videoTotal = computed(() => spaceVideos.value.length)
const iotTotal = computed(() => spaceIots.value.length)

// 全选
const allSelected = computed(() => currentList.value.length > 0 && currentList.value.every(d => d.selected))
const someSelected = computed(() => currentList.value.some(d => d.selected) && !allSelected.value)
const selectedCount = computed(() => currentList.value.filter(d => d.selected).length)

function toggleAll() {
  const newVal = !allSelected.value
  currentList.value.forEach(d => { d.selected = newVal })
}

// ===== 解绑 =====
const unbindModalVisible = ref(false)
const unbindTarget = ref<DeviceItem | VideoItem | null>(null)
const unbindBatchMode = ref(false)

function handleUnbind(item: DeviceItem | VideoItem) {
  unbindTarget.value = item
  unbindBatchMode.value = false
  unbindModalVisible.value = true
}

function handleBatchUnbind() {
  if (selectedCount.value === 0) return
  unbindTarget.value = null
  unbindBatchMode.value = true
  unbindModalVisible.value = true
}

function confirmUnbind() {
  if (unbindBatchMode.value) {
    // 批量解绑
    const selectedIds = currentList.value.filter(d => d.selected).map(d => d.id)
    if (activeCategory.value === 'video') {
      videoDevices.value = videoDevices.value.filter(d => !selectedIds.includes(d.id))
    } else {
      iotDevices.value = iotDevices.value.filter(d => !selectedIds.includes(d.id))
    }
  } else if (unbindTarget.value) {
    // 单个解绑
    const id = unbindTarget.value.id
    if (activeCategory.value === 'video') {
      videoDevices.value = videoDevices.value.filter(d => d.id !== id)
    } else {
      iotDevices.value = iotDevices.value.filter(d => d.id !== id)
    }
  }
  unbindModalVisible.value = false
  unbindTarget.value = null
}

// ===== 添加绑定设备弹窗 =====
const addBindModalVisible = ref(false)

// ===== 视频播放弹窗 =====
const playModalVisible = ref(false)
const playTarget = ref<VideoItem | null>(null)

function handlePlay(item: VideoItem) {
  playTarget.value = item
  playModalVisible.value = true
}

// ===== 物联设备详情（交互待实现） =====
function handleDetail(_item: DeviceItem) {
  // TODO: 后续实现详情交互（如打开详情抽屉/弹窗）
}

// 业务分组 -> 标签颜色（不同分组用不同语义色）
const GROUP_TAG_COLORS: Record<string, string> = {
  '环境监测': 'env',
  '消防安全': 'fire',
  '姿态监测': 'pose',
  '边缘计算': 'edge'
}

function groupTagClass(group: string): string {
  return GROUP_TAG_COLORS[group] || 'default'
}

// 可选视频设备（按网关分组）
interface OptionalCamera {
  id: string
  name: string
  status: 'online' | 'offline'
  thumb: string
  boundSpace?: string
  selected?: boolean
}
interface OptionalVideoGw {
  id: string
  name: string
  model: string
  status: 'online' | 'offline'
  expanded?: boolean
  cameras: OptionalCamera[]
}

const optionalVideoGws = ref<OptionalVideoGw[]>([
  {
    id: 'ovg1', name: 'E栋网关1', model: 'JetLinks-Edge-2000', status: 'online', expanded: true,
    cameras: [
      { id: 'ocam1', name: '南门摄像头', status: 'online', thumb: cam1Img },
      { id: 'ocam2', name: '会议室摄像头', status: 'online', thumb: cam2Img, boundSpace: '物联网产业园区/E栋/1F/大厅' },
      { id: 'ocam3', name: '前台摄像头', status: 'offline', thumb: cam3Img },
      { id: 'ocam6', name: '电梯口摄像头', status: 'online', thumb: cam4Img }
    ]
  },
  {
    id: 'ovg2', name: 'E栋网关2', model: 'JetLinks-Edge-1000', status: 'offline', expanded: false,
    cameras: [
      { id: 'ocam4', name: '楼梯口摄像头', status: 'offline', thumb: cam5Img },
      { id: 'ocam5', name: '天台摄像头', status: 'offline', thumb: cam1Img, boundSpace: '物联网产业园区/E栋/4F/项目部办公区' }
    ]
  }
])

// 可选物联设备（按网关分组）
interface OptionalIotDevice {
  id: string
  name: string
  icon: string
  brand: string
  model: string
  product: string
  group: string
  status: 'online' | 'offline'
  boundSpace?: string
  selected?: boolean
}
interface OptionalIotGw {
  id: string
  name: string
  model: string
  status: 'online' | 'offline'
  expanded?: boolean
  devices: OptionalIotDevice[]
}

const optionalIotGws = ref<OptionalIotGw[]>([
  {
    id: 'oig1', name: '物联网关A', model: 'JetLinks-IoT-500', status: 'online', expanded: true,
    devices: [
      { id: 'oiot1', name: '光照度传感器', icon: 'i-ant-design-bulb-outlined', brand: '汉威', model: 'GZ-100', product: '汉威光照度计', group: '环境监测', status: 'online', boundSpace: '物联网产业园区/E栋/2F/走廊' },
      { id: 'oiot2', name: '二氧化碳检测仪', icon: 'i-ant-design-cloud-outlined', brand: '汉威', model: 'CO2-200', product: '汉威CO2检测仪', group: '环境监测', status: 'online' },
      { id: 'oiot3', name: '门磁传感器', icon: 'i-ant-design-lock-outlined', brand: '海康', model: 'DS-MAG', product: '海康门磁', group: '消防安全', status: 'offline' }
    ]
  },
  {
    id: 'oig2', name: '物联网关B', model: 'JetLinks-IoT-300', status: 'online', expanded: false,
    devices: [
      { id: 'oiot4', name: '水浸传感器', icon: 'i-ant-design-experiment-outlined', brand: '汉威', model: 'SJ-100', product: '汉威水浸传感器', group: '消防安全', status: 'online' },
      { id: 'oiot5', name: '空气质量监测仪', icon: 'i-ant-design-cloud-outlined', brand: '汉威', model: 'AQI-300', product: '汉威空气质量仪', group: '环境监测', status: 'online', boundSpace: '物联网产业园区/A栋/1F/运营办公室' }
    ]
  }
])

// 弹窗搜索
const addSearchKey = ref('')
// 物联分页
const iotCurrentPage = ref(1)
const iotPageSize = ref(10)

// 视频搜索过滤
const filteredOptionalVideo = computed(() => {
  if (!addSearchKey.value.trim()) return optionalVideoGws.value
  const key = addSearchKey.value.toLowerCase()
  return optionalVideoGws.value.map(g => ({
    ...g,
    cameras: g.cameras.filter(c => c.name.toLowerCase().includes(key))
  })).filter(g => g.cameras.length > 0 || g.name.toLowerCase().includes(key))
})

// 物联搜索过滤
const filteredOptionalIot = computed(() => {
  if (!addSearchKey.value.trim()) return optionalIotGws.value
  const key = addSearchKey.value.toLowerCase()
  return optionalIotGws.value.map(g => ({
    ...g,
    devices: g.devices.filter(d => d.name.toLowerCase().includes(key))
  })).filter(g => g.devices.length > 0 || g.name.toLowerCase().includes(key))
})

// 弹窗打开时重置
watch(addBindModalVisible, (v) => {
  if (v) {
    addSearchKey.value = ''
    iotCurrentPage.value = 1
  }
})

// 弹窗中选中的数量
const addSelectedCount = computed(() => {
  if (activeCategory.value === 'video') {
    return optionalVideoGws.value.reduce((sum, g) => sum + g.cameras.filter(c => c.selected).length, 0)
  }
  return optionalIotGws.value.reduce((sum, g) => sum + g.devices.filter(d => d.selected).length, 0)
})

// 保存绑定
function handleAddSave() {
  if (activeCategory.value === 'video') {
    optionalVideoGws.value.forEach(g => {
      g.cameras.forEach(c => {
        if (c.selected) {
          videoDevices.value.push({
            id: c.id, name: c.name, icon: 'i-ant-design-video-camera-outlined',
            brand: '-', model: '-', product: c.name, group: '智能识别',
            gateway: g.name, status: c.status, thumb: c.thumb, spaceId: props.spaceId
          })
          c.selected = false
        }
      })
    })
  } else {
    optionalIotGws.value.forEach(g => {
      g.devices.forEach(d => {
        if (d.selected) {
          iotDevices.value.push({
            id: d.id, name: d.name, icon: d.icon, brand: d.brand, model: d.model,
            product: d.product, group: d.group, gateway: g.name, status: d.status, spaceId: props.spaceId
          })
          d.selected = false
        }
      })
    })
  }
  addBindModalVisible.value = false
}
</script>

<template>
  <div class="asset-binding">
    <!-- 标题：空间名称 + 完整路径 -->
    <div class="ab-header">
      <h3 class="ab-title">{{ spaceName }}</h3>
      <p class="ab-path">{{ spacePath }}</p>
    </div>

    <!-- 工具栏：tab + 视图切换 + 批量解绑 | 搜索 + 添加绑定 -->
    <div class="ab-toolbar">
      <div class="toolbar-left">
        <!-- 分类 tab（分段控件样式） -->
        <div class="cat-segmented">
          <div class="cat-seg" :class="{ active: activeCategory === 'video' }" @click="activeCategory = 'video'">
            <i class="i-ant-design-video-camera-outlined" />
            <span>视频设备（{{ videoTotal }}）</span>
          </div>
          <div class="cat-seg" :class="{ active: activeCategory === 'iot' }" @click="activeCategory = 'iot'">
            <i class="i-ant-design-api-outlined" />
            <span>物联设备（{{ iotTotal }}）</span>
          </div>
        </div>
        <!-- 批量解绑 -->
        <a-tooltip :title="selectedCount === 0 ? '请先选择要解绑的设备' : ''">
          <button class="batch-unbind-btn" :disabled="selectedCount === 0" @click="handleBatchUnbind">
            <i class="i-ant-design-disconnect-outlined" />
            <span>批量解绑</span>
          </button>
        </a-tooltip>
      </div>
      <div class="toolbar-right">
        <a-input v-model:value="searchKey" placeholder="搜索设备名称、ID、产品" class="ab-search">
          <template #prefix>
            <i class="i-ant-design-search-outlined" />
          </template>
        </a-input>
        <button class="add-bind-btn" @click="addBindModalVisible = true">
          <i class="i-ant-design-plus-outlined" />
          <span>添加绑定设备</span>
        </button>
      </div>
    </div>

    <!-- 列表模式 -->
    <div class="table-wrap scroll-thin">
      <table class="data-table">
        <colgroup v-if="activeCategory === 'iot'">
          <col style="width: 48px">
          <col style="width: 20%">
          <col style="width: 13%">
          <col style="width: 13%">
          <col style="width: 12%">
          <col style="width: 12%">
          <col style="width: 10%">
          <col style="width: auto">
        </colgroup>
        <colgroup v-else>
          <col style="width: 48px">
          <col style="width: 28%">
          <col style="width: 20%">
          <col style="width: 15%">
          <col style="width: auto">
        </colgroup>
        <thead>
          <tr>
            <th class="col-check">
              <a-checkbox :checked="allSelected" :indeterminate="someSelected" @change="toggleAll" />
            </th>
            <th>设备名称</th>
            <!-- 物联设备特有列 -->
            <th v-if="activeCategory === 'iot'">品牌型号</th>
            <th v-if="activeCategory === 'iot'">产品</th>
            <th v-if="activeCategory === 'iot'">业务分组</th>
            <!-- 共有列 -->
            <th>接入网关</th>
            <th>在线状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in currentList" :key="item.id" :class="{ selected: item.selected }">
            <td class="col-check">
              <a-checkbox :checked="!!item.selected" @change="item.selected = !item.selected" />
            </td>
            <td>
              <div class="device-name-cell">
                <i :class="item.icon" class="device-icon" />
                <div class="device-name-info">
                  <span class="device-name">{{ item.name }}</span>
                  <span class="device-id">{{ item.id }}</span>
                </div>
              </div>
            </td>
            <!-- 物联设备特有列 -->
            <td v-if="activeCategory === 'iot'">
              <div class="brand-cell">
                <span class="brand-name">{{ item.brand }}</span>
                <span class="brand-model">{{ item.model }}</span>
              </div>
            </td>
            <td v-if="activeCategory === 'iot'">{{ item.product }}</td>
            <td v-if="activeCategory === 'iot'">
              <span class="group-tag" :class="groupTagClass(item.group)">{{ item.group }}</span>
            </td>
            <!-- 共有列 -->
            <td>{{ item.gateway }}</td>
            <td>
              <span class="status-tag" :class="item.status">
                {{ item.status === 'online' ? '在线' : '离线' }}
              </span>
            </td>
            <td class="col-actions">
              <button class="unbind-btn" @click="handleUnbind(item)">解绑</button>
              <!-- 视频设备：播放按钮 -->
              <button v-if="activeCategory === 'video'" class="play-btn" title="播放" @click="handlePlay(item)">
                <i class="i-ant-design-play-circle-outlined" />
              </button>
              <!-- 物联设备：详情按钮 -->
              <button v-if="activeCategory === 'iot'" class="detail-btn" @click="handleDetail(item)">详情</button>
            </td>
          </tr>
          <tr v-if="currentList.length === 0">
            <td :colspan="activeCategory === 'iot' ? 8 : 5" class="empty-row">
              <div class="empty-state">
                <i class="i-ant-design-api-outlined empty-state-icon" />
                <p class="empty-state-title">暂无已绑定的{{ activeCategory === 'video' ? '视频' : '物联' }}设备</p>
                <button class="empty-add-btn" @click="addBindModalVisible = true">
                  <i class="i-ant-design-plus-outlined" />
                  <span>添加绑定设备</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 解绑确认弹窗 -->
    <a-modal
      v-model:open="unbindModalVisible"
      :title="unbindBatchMode ? '批量解绑确认' : '解绑确认'"
      ok-text="确认解绑"
      cancel-text="取消"
      :ok-button-props="{ danger: true }"
      @ok="confirmUnbind"
    >
      <p class="unbind-tip">
        <i class="i-ant-design-exclamation-circle-outlined unbind-warn-icon" />
        <span v-if="unbindBatchMode">确认解绑选中的 {{ selectedCount }} 个设备？解绑后设备将不再属于当前空间。</span>
        <span v-else>确认解绑「{{ unbindTarget?.name }}」？解绑后该设备将不再属于当前空间。</span>
      </p>
    </a-modal>

    <!-- 添加绑定设备弹窗 -->
    <a-modal
      v-model:open="addBindModalVisible"
      :title="`添加绑定设备 - ${activeCategory === 'video' ? '视频设备' : '物联设备'}`"
      :width="900"
      :footer="null"
    >
      <!-- 次要文案 -->
      <p class="add-modal-subtitle">
        {{ activeCategory === 'video' ? '请选择要绑定到该空间的摄像头' : '请选择要绑定到该空间的物联设备' }}
      </p>

      <!-- 搜索框 -->
      <a-input
        v-model:value="addSearchKey"
        :placeholder="`搜索${activeCategory === 'video' ? '摄像头' : '设备'}名称`"
        class="add-modal-search"
        allow-clear
      >
        <template #prefix>
          <i class="i-ant-design-search-outlined" />
        </template>
      </a-input>

      <!-- 视频设备：卡片列表 -->
      <div v-if="activeCategory === 'video'" class="add-modal-body scroll-thin">
        <template v-if="filteredOptionalVideo.length > 0">
          <div v-for="gw in filteredOptionalVideo" :key="gw.id" class="opt-gw-group">
            <!-- 网关头（含状态） -->
            <div class="opt-gw-header" @click="gw.expanded = !gw.expanded">
              <i class="i-ant-design-cluster-outlined opt-gw-icon" :style="{ color: gw.status === 'online' ? '#6e4bff' : '#bfbfbf' }" />
              <span class="opt-gw-name">{{ gw.name }}</span>
              <span class="opt-gw-model">{{ gw.model }}</span>
              <span class="gw-status-tag" :class="gw.status">{{ gw.status === 'online' ? '在线' : '离线' }}</span>
              <span class="opt-gw-count">{{ gw.cameras.length }} 个通道</span>
              <i class="opt-gw-arrow" :class="gw.expanded ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'" />
            </div>
            <!-- 摄像头卡片网格 -->
            <div v-if="gw.expanded" class="opt-cam-grid">
              <div
                v-for="cam in gw.cameras"
                :key="cam.id"
                class="opt-cam-card"
                :class="{ selected: cam.selected, disabled: cam.boundSpace }"
              >
                <div class="opt-cam-thumb">
                  <img :src="cam.thumb" alt="截帧" />
                  <!-- 已绑定角标（右上角） -->
                  <div v-if="cam.boundSpace" class="opt-cam-bound-corner">
                    <i class="i-ant-design-lock-outlined" />
                    <span>已绑定</span>
                  </div>
                  <!-- 播放按钮（始终显示，最上层） -->
                  <div class="opt-cam-play-btn">
                    <i class="i-ant-design-caret-right-filled" />
                  </div>
                </div>
                <div class="opt-cam-info">
                  <a-checkbox
                    :checked="!!cam.selected"
                    :disabled="!!cam.boundSpace"
                    @change="() => { cam.selected = !cam.selected }"
                  >
                    <span class="opt-cam-name">{{ cam.name }}</span>
                  </a-checkbox>
                  <span class="opt-cam-status" :class="cam.status">{{ cam.status === 'online' ? '在线' : '离线' }}</span>
                </div>
                <!-- 绑定位置 -->
                <div v-if="cam.boundSpace" class="opt-cam-bound">
                  <i class="i-ant-design-environment-outlined" />
                <span>{{ cam.boundSpace }}</span>
              </div>
              <div v-else class="opt-cam-bound unbound">未绑定</div>
            </div>
          </div>
        </div>
        </template>
        <!-- 视频空状态 -->
        <div v-else class="add-empty">
          <i class="i-ant-design-video-camera-outlined add-empty-icon" />
          <p class="add-empty-title">
            {{ addSearchKey ? '没有找到匹配的摄像头' : '暂无可选摄像头' }}
          </p>
          <p v-if="!addSearchKey" class="add-empty-hint">请先在物联中心接入摄像头设备</p>
        </div>
      </div>

      <!-- 物联设备：合并表格可展开 -->
      <template v-else>
        <div class="add-modal-body scroll-thin">
          <table class="opt-iot-table">
            <thead>
              <tr>
                <th style="width: 40px"></th>
                <th>设备名称</th>
                <th>品牌型号</th>
                <th>产品</th>
                <th>业务分组</th>
                <th>绑定位置</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="gw in filteredOptionalIot" :key="gw.id">
                <!-- 网关行（按列对齐，可展开） -->
                <tr class="opt-iot-gw-row" @click="gw.expanded = !gw.expanded">
                  <td style="text-align: center">
                    <i class="opt-gw-arrow" :class="gw.expanded ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'" />
                  </td>
                  <td>
                    <div class="opt-gw-name-cell">
                      <i class="i-ant-design-cluster-outlined opt-gw-icon" :style="{ color: gw.status === 'online' ? '#6e4bff' : '#bfbfbf' }" />
                      <div>
                        <span class="opt-gw-name">{{ gw.name }}</span>
                        <span class="opt-gw-sub">{{ gw.devices.length }} 个设备</span>
                      </div>
                    </div>
                  </td>
                  <td>{{ gw.model }}</td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td><span class="gw-status-tag" :class="gw.status">{{ gw.status === 'online' ? '在线' : '离线' }}</span></td>
                </tr>
                <!-- 设备行 -->
                <template v-if="gw.expanded">
                  <tr
                    v-for="dev in gw.devices"
                    :key="dev.id"
                    :class="{ selected: dev.selected, 'row-disabled': dev.boundSpace }"
                  >
                    <td style="text-align: center">
                      <a-checkbox
                        :checked="!!dev.selected"
                        :disabled="!!dev.boundSpace"
                        @change="() => { dev.selected = !dev.selected }"
                      />
                    </td>
                    <td>
                      <div class="opt-iot-name-cell">
                        <i :class="dev.icon" class="opt-iot-icon" />
                        <span>{{ dev.name }}</span>
                      </div>
                    </td>
                    <td>{{ dev.brand }} {{ dev.model }}</td>
                    <td>{{ dev.product }}</td>
                    <td>{{ dev.group }}</td>
                    <td>
                      <span v-if="dev.boundSpace" class="opt-bound-text">{{ dev.boundSpace }}</span>
                      <span v-else class="opt-bound-text unbound">未绑定</span>
                    </td>
                    <td>
                      <span class="opt-cam-status" :class="dev.status">{{ dev.status === 'online' ? '在线' : '离线' }}</span>
                    </td>
                  </tr>
                </template>
              </template>
              <!-- 物联空状态 -->
              <tr v-if="filteredOptionalIot.length === 0">
                <td colspan="7" class="opt-iot-empty">
                  <div class="add-empty">
                    <i class="i-ant-design-api-outlined add-empty-icon" />
                    <p class="add-empty-title">
                      {{ addSearchKey ? '没有找到匹配的设备' : '暂无可选物联设备' }}
                    </p>
                    <p v-if="!addSearchKey" class="add-empty-hint">请先在物联中心接入物联设备</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 分页 -->
        <div class="opt-pagination">
          <span class="page-total">共 20 条</span>
          <a-pagination
            v-model:current="iotCurrentPage"
            v-model:pageSize="iotPageSize"
            :total="20"
            show-size-changer
            :page-size-options="['10', '20', '50']"
          >
            <template #buildOptionText="props">
              <span>{{ props.value }}/页</span>
            </template>
          </a-pagination>
        </div>
      </template>

      <!-- 底部按钮 -->
      <div class="modal-footer">
        <span class="footer-count">已选 {{ addSelectedCount }} 个设备</span>
        <div>
          <a-button @click="addBindModalVisible = false">取消</a-button>
          <a-button type="primary" :disabled="addSelectedCount === 0" @click="handleAddSave">保存</a-button>
        </div>
      </div>
    </a-modal>

    <!-- 视频播放弹窗（共享组件） -->
    <VideoPlayerModal v-model:open="playModalVisible" :target="playTarget" />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.asset-binding {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 标题 */
.ab-header {
  padding-bottom: 16px;

  .ab-title {
    font-size: 18px;
    font-weight: 600;
    color: $text-base;
    margin: 0 0 2px;
  }

  .ab-path {
    font-size: 13px;
    color: $text-tertiary;
    margin: 0;
  }
}

/* 工具栏 */
.ab-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 分段分类 tab */
.cat-segmented {
  display: flex;
  background: #f0f1f3;
  border-radius: 6px;
  padding: 2px;
}

.cat-seg {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 12px;
  font-size: 13px;
  color: $text-secondary;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;

  i {
    font-size: 14px;
  }

  &.active {
    background: #fff;
    color: $text-base;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }
}

/* 视图切换 */
/* 批量解绑 */
.batch-unbind-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 12px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;

  &:hover:not(:disabled) {
    border-color: #ff4d4f;
    color: #ff4d4f;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

/* 搜索 */
.ab-search {
  width: 240px;
  border-radius: 6px;
}

/* 添加绑定 */
.add-bind-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 6px;
  background: $color-primary;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;

  &:hover {
    background: $color-primary-hover;
  }
}

/* ===== 列表模式表格 ===== */
.table-wrap {
  flex: 1;
  overflow: auto;
  border: 1px solid $border-color-card;
  border-radius: 8px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  table-layout: fixed;

  thead {
    th {
      background: #f7f8fa;
      padding: 10px 16px;
      text-align: left;
      font-weight: 500;
      color: $text-secondary;
      font-size: 13px;
      white-space: nowrap;
      border-bottom: 1px solid $border-color-card;

      &:last-child {
        text-align: right;
      }
    }

    .col-check {
      width: 48px;
      text-align: center;
    }
  }

  tbody {
    tr {
      &:hover {
        background: #fafafa;
      }

      &.selected {
        background: #f5f0ff;
      }

      td {
        padding: 10px 16px;
        color: $text-base;
        border-bottom: 1px solid #f5f5f5;

        &:last-child {
          text-align: right;
        }
      }

      .col-check {
        text-align: center;
      }

      &:last-child td {
        border-bottom: none;
      }
    }
  }
}

/* 设备名称列 */
.device-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  .device-icon {
    font-size: 18px;
    color: $color-primary;
    flex-shrink: 0;
  }

  .device-name-info {
    .device-name {
      display: block;
      font-size: 14px;
      color: $text-base;
    }

    .device-id {
      font-size: 12px;
      color: $text-tertiary;
      font-family: monospace;
    }
  }
}

/* 品牌型号列 */
.brand-cell {
  .brand-name {
    display: block;
    font-size: 14px;
    color: $text-base;
  }

  .brand-model {
    font-size: 12px;
    color: $text-tertiary;
  }
}

/* 业务分组标签 */
.group-tag {
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 4px;
  line-height: 1.4;

  /* 默认：紫色 */
  &.default {
    color: $color-primary;
    background: $color-primary-bg;
  }

  /* 环境监测：绿色 */
  &.env {
    color: #389e0d;
    background: #f6ffed;
    border: 1px solid #d9f7be;
  }

  /* 消防安全：红色 */
  &.fire {
    color: #cf1322;
    background: #fff1f0;
    border: 1px solid #ffccc7;
  }

  /* 姿态监测：蓝色 */
  &.pose {
    color: #096dd9;
    background: #e6f7ff;
    border: 1px solid #bae7ff;
  }

  /* 边缘计算：橙色 */
  &.edge {
    color: #d46b08;
    background: #fff7e6;
    border: 1px solid #ffd591;
  }
}

/* 状态标签 */
.status-tag {
  display: inline-block;
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 4px;
  font-weight: 500;
  line-height: 1.4;

  &.online {
    color: $color-online;
    background: $color-online-bg;
  }

  &.offline {
    color: #bfbfbf;
    background: rgba(191, 191, 191, 0.1);
  }
}

/* 操作列 */
.col-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

/* 播放按钮 */
.play-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 26px;
  border: 1px solid $border-color-card;
  border-radius: 4px;
  background: #fff;
  color: $text-secondary;
  cursor: pointer;

  i {
    font-size: 14px;
  }

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
  }
}

/* 解绑按钮（红色） */
.unbind-btn {
  height: 26px;
  padding: 0 12px;
  border: 1px solid #ffccc7;
  border-radius: 4px;
  background: #fff1f0;
  color: #ff4d4f;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;

  &:hover {
    background: #ff4d4f;
    color: #fff;
    border-color: #ff4d4f;
  }
}

/* 详情按钮（紫色文字） */
.detail-btn {
  height: 26px;
  padding: 0 12px;
  border: 1px solid #d9cfff;
  border-radius: 4px;
  background: #f5f0ff;
  color: $color-primary;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;

  &:hover {
    background: $color-primary;
    color: #fff;
    border-color: $color-primary;
  }
}

/* 空状态 */
.empty-row {
  padding: 0;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;

  .empty-state-icon {
    font-size: 44px;
    color: $text-muted;
    opacity: 0.4;
    margin-bottom: 14px;
  }

  .empty-state-title {
    font-size: 14px;
    color: $text-secondary;
    margin: 0 0 6px;
    font-weight: 500;
  }

  /* 空状态里的添加按钮 */
  .empty-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 32px;
    padding: 0 16px;
    border: none;
    border-radius: 6px;
    background: $color-primary;
    color: #fff;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;
    margin-top: 4px;
    transition: all 0.15s;

    i {
      font-size: 13px;
    }

    &:hover {
      background: $color-primary-hover;
    }

    &:active {
      transform: scale(0.97);
    }
  }
}

/* 添加绑定弹窗空状态 */
.add-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px 20px;
  text-align: center;

  .add-empty-icon {
    font-size: 40px;
    color: $text-muted;
    opacity: 0.4;
    margin-bottom: 12px;
  }

  .add-empty-title {
    font-size: 13px;
    color: $text-secondary;
    margin: 0 0 4px;
  }

  .add-empty-hint {
    font-size: 12px;
    color: $text-muted;
    margin: 0;
  }
}

.opt-iot-empty {
  padding: 0;
}

/* 解绑提示 */
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

/* 添加绑定弹窗 */
.add-bind-content {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .add-bind-search {
    border-radius: 6px;
  }

  .add-bind-tabs {
    display: flex;
    gap: 4px;
  }

  .add-bind-tab {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 30px;
    padding: 0 12px;
    border: 1px solid $border-color-card;
    border-radius: 6px;
    font-size: 13px;
    color: $text-secondary;
    cursor: pointer;

    &.active {
      background: $color-primary-bg;
      border-color: $color-primary;
      color: $color-primary;
    }
  }

  .add-bind-list {
    max-height: 280px;
    overflow-y: auto;
    border: 1px solid $border-color-card;
    border-radius: 8px;
    padding: 4px;
  }

  .add-bind-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 6px;

    &:hover {
      background: $bg-hover;
    }

    .add-bind-item-info {
      flex: 1;
      min-width: 0;

      .add-bind-item-name {
        display: block;
        font-size: 14px;
        color: $text-base;
      }

      .add-bind-item-meta {
        font-size: 12px;
        color: $text-tertiary;
      }
    }

    .add-bind-item-status {
      font-size: 12px;
      color: $color-online;
    }
  }
}

/* ===== 添加绑定弹窗 ===== */
.add-modal-subtitle {
  font-size: 13px;
  color: $text-tertiary;
  margin: 0 0 12px;
}

.add-modal-search {
  margin-bottom: 12px;
  border-radius: 6px;
}

.add-modal-body {
  height: 520px;
  overflow-y: auto;
}

/* 网关状态标签 */
.gw-status-tag {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;

  &.online {
    color: $color-online;
    background: $color-online-bg;
  }

  &.offline {
    color: #bfbfbf;
    background: rgba(191, 191, 191, 0.1);
  }
}

.opt-gw-group {
  margin-bottom: 12px;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  overflow: hidden;
}

.opt-gw-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f7f8fa;
  cursor: pointer;

  .opt-gw-icon {
    font-size: 16px;
    color: $color-primary;
  }

  .opt-gw-name {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
  }

  .opt-gw-model {
    font-size: 12px;
    color: $text-tertiary;
  }

  .opt-gw-count {
    font-size: 12px;
    color: $text-tertiary;
    margin-left: auto;
  }

  .opt-gw-arrow {
    font-size: 10px;
    color: $text-muted;
  }
}

/* 视频摄像头卡片 */
.opt-cam-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding: 12px;
}

.opt-cam-card {
  border: 1px solid $border-color-card;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  // 整体正方形
  aspect-ratio: 1 / 1;

  &:hover {
    border-color: $color-primary;
  }

  &.selected {
    border-color: $color-primary;
    box-shadow: 0 0 0 2px rgba(110, 75, 255, 0.15);
  }

  &.disabled {
    opacity: 0.6;
  }

  // 缩略图占满剩余空间（长方形）
  .opt-cam-thumb {
    position: relative;
    flex: 1;
    min-height: 0;
    background: #1a1a2e;
    cursor: pointer;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    // 已绑定角标（右上角小标签）
    .opt-cam-bound-corner {
      position: absolute;
      top: 4px;
      right: 4px;
      display: flex;
      align-items: center;
      gap: 2px;
      padding: 2px 6px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      font-size: 10px;
      border-radius: 3px;

      i {
        font-size: 10px;
      }
    }

    // 播放按钮（居中，默认显示，半透明黑底白图标）
    .opt-cam-play-btn {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s;

      i {
        font-size: 20px;
        color: #fff;
      }
    }

    &:hover .opt-cam-play-btn {
      background: rgba(0, 0, 0, 0.7);
    }
  }

  .opt-cam-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;

    .opt-cam-name {
      font-size: 13px;
      color: $text-base;
    }
  }

  // 绑定位置
  .opt-cam-bound {
    padding: 4px 8px 8px;
    font-size: 11px;
    color: $text-tertiary;
    display: flex;
    align-items: center;
    gap: 3px;

    i {
      font-size: 11px;
    }

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &.unbound {
      color: $color-primary;
    }
  }
}

.opt-cam-status {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 3px;

  &.online {
    color: $color-online;
    background: $color-online-bg;
  }

  &.offline {
    color: #bfbfbf;
    background: rgba(191, 191, 191, 0.1);
  }
}

/* 物联设备表格 */
.opt-iot-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  overflow: hidden;

  thead th {
    background: #f7f8fa;
    padding: 8px 12px;
    text-align: left;
    font-weight: 500;
    color: $text-secondary;
    font-size: 12px;
    border-bottom: 1px solid $border-color-card;
  }

  tbody td {
    padding: 8px 12px;
    color: $text-base;
    border-bottom: 1px solid #f5f5f5;
  }

  tbody tr:hover {
    background: #fafafa;
  }

  tbody tr.selected {
    background: #f5f0ff;
  }
}

.opt-iot-name-cell {
  display: flex;
  align-items: center;
  gap: 6px;

  .opt-iot-icon {
    font-size: 14px;
    color: $color-primary;
  }
}

/* 物联网关行（表格内展开行） */
.opt-iot-gw-row {
  cursor: pointer;
  background: #f7f8fa;
  font-weight: 600;

  &:hover {
    background: #f0f1f3;
  }

  td {
    padding: 10px 12px;
  }

  .opt-gw-arrow {
    font-size: 10px;
    color: $text-muted;
  }

  .opt-gw-name-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    .opt-gw-icon {
      font-size: 16px;
    }

    .opt-gw-name {
      display: block;
      font-size: 14px;
      color: $text-base;
    }

    .opt-gw-sub {
      display: block;
      font-size: 12px;
      color: $text-tertiary;
      font-weight: 400;
    }
  }
}

/* 已绑定行灰色 */
.opt-iot-table tbody tr.row-disabled {
  opacity: 0.55;
}

/* 绑定位置文字 */
.opt-bound-text {
  font-size: 12px;
  color: $text-tertiary;

  &.unbound {
    color: $color-primary;
  }
}

/* 分页 */
.opt-pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 12px 16px;

  .page-total {
    font-size: 13px;
    color: $text-secondary;
  }
}

/* 弹窗底部 */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid $border-color-card;

  .footer-count {
    font-size: 13px;
    color: $text-secondary;
  }

  // 取消和保存按钮之间的间隔
  & > div {
    display: flex;
    gap: 12px;
  }
}

</style>
