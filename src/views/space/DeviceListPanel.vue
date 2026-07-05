<script setup lang="ts">
/**
 * 设备列表面板
 * 标题栏（放大缩小 + 视图切换 + 搜索）+ 分类 tab（视频/物联）+ 两级树/卡片
 */
import cam1Img from '@/assets/cameras/cam1.svg'
import cam2Img from '@/assets/cameras/cam2.svg'
import cam3Img from '@/assets/cameras/cam3.svg'
import cam4Img from '@/assets/cameras/cam4.svg'

// ===== 面板展开状态 =====
const props = defineProps<{
  expanded: boolean
}>()
const emit = defineEmits<{
  toggleExpand: []
}>()

// ===== 分类 tab =====
const activeCategory = ref<'video' | 'iot'>('video')

// ===== 视图模式 =====
const viewMode = ref<'list' | 'card'>('list')

// ===== 搜索 =====
const searchKey = ref('')

// ===== 设备状态 =====
type Status = 'online' | 'offline' | 'fault'
function statusColor(s: Status): string {
  return s === 'online' ? '#6e4bff' : s === 'offline' ? '#bfbfbf' : '#ff4d4f'
}
// 设备/摄像头颜色：已绑定=灰色不可用感，未绑定=主题紫色
function itemColor(bound: boolean, _status: Status): string {
  return bound ? '#c0c4cc' : '#6e4bff'
}

// ===== 视频设备数据（网关 → 摄像头） =====
interface Camera {
  id: string
  name: string
  status: Status
  boundSpace?: string
  thumb?: string
}
interface VideoGateway {
  id: string
  name: string
  model: string
  sn: string
  status: Status
  expanded?: boolean
  cameras: Camera[]
}

const videoGateways = ref<VideoGateway[]>([
  {
    id: 'vg1',
    name: 'E栋网关1',
    model: 'JetLinks-Edge-2000',
    sn: 'JE202606081003',
    status: 'online',
    expanded: true,
    cameras: [
      { id: 'cam1', name: '东门摄像头', status: 'online', boundSpace: '物联网产业园区/E栋/1F/大厅', thumb: cam1Img },
      { id: 'cam2', name: '大厅摄像头A', status: 'online', boundSpace: '物联网产业园区/E栋/1F/大厅', thumb: cam2Img },
      { id: 'cam3', name: '走廊摄像头B', status: 'offline', boundSpace: '物联网产业园区/E栋/2F/走廊', thumb: cam3Img },
      { id: 'cam4', name: '办公区摄像头', status: 'online', thumb: cam4Img }
    ]
  },
  {
    id: 'vg2',
    name: 'E栋网关2',
    model: 'JetLinks-Edge-1000',
    sn: 'JE202606081004',
    status: 'fault',
    expanded: false,
    cameras: [
      { id: 'cam5', name: '西门摄像头', status: 'online', boundSpace: '物联网产业园区/E栋/1F/西门', thumb: cam1Img },
      { id: 'cam6', name: '电梯口摄像头', status: 'online', boundSpace: '物联网产业园区/E栋/4F/电梯口', thumb: cam2Img }
    ]
  }
])

// ===== 物联设备数据（网关 → 设备） =====
interface IotDevice {
  id: string
  name: string
  status: Status
  boundSpace?: string
  brand: string
  icon: string
}
interface IotGateway {
  id: string
  name: string
  model: string
  sn: string
  status: Status
  expanded?: boolean
  devices: IotDevice[]
}

const iotGateways = ref<IotGateway[]>([
  {
    id: 'ig1',
    name: '物联网关A',
    model: 'JetLinks-IoT-500',
    sn: 'IOT20260601001',
    status: 'online',
    expanded: true,
    devices: [
      { id: 'iot1', name: '温湿度传感器', status: 'online', boundSpace: '物联网产业园区/E栋/4F/研发部办公区', brand: '华汉维', icon: 'i-ant-design-dashboard-outlined' },
      { id: 'iot2', name: '烟感探测器', status: 'online', boundSpace: '物联网产业园区/E栋/4F/研发部办公区', brand: '独立式', icon: 'i-ant-design-alert-outlined' },
      { id: 'iot3', name: '噪声采集器', status: 'offline', brand: 'XM8165', icon: 'i-ant-design-sound-outlined' }
    ]
  },
  {
    id: 'ig2',
    name: '物联网关B',
    model: 'JetLinks-IoT-300',
    sn: 'IOT20260601002',
    status: 'online',
    expanded: false,
    devices: [
      { id: 'iot4', name: '陀螺仪', status: 'online', boundSpace: '物联网产业园区/E栋/4F/项目部办公区', brand: '维特智能', icon: 'i-ant-design-compass-outlined' },
      { id: 'iot5', name: '声光报警器', status: 'online', boundSpace: '物联网产业园区/E栋/2F/走廊', brand: 'LD9101', icon: 'i-ant-design-bell-outlined' }
    ]
  }
])

// ===== 搜索过滤 =====
function filterVideoGateways() {
  if (!searchKey.value.trim()) return videoGateways.value
  const key = searchKey.value.toLowerCase()
  return videoGateways.value
    .map(g => ({
      ...g,
      cameras: g.cameras.filter(c => c.name.toLowerCase().includes(key))
    }))
    .filter(g => g.name.toLowerCase().includes(key) || g.cameras.length > 0)
}

function filterIotGateways() {
  if (!searchKey.value.trim()) return iotGateways.value
  const key = searchKey.value.toLowerCase()
  return iotGateways.value
    .map(g => ({
      ...g,
      devices: g.devices.filter(d => d.name.toLowerCase().includes(key))
    }))
    .filter(g => g.name.toLowerCase().includes(key) || g.devices.length > 0)
}

const filteredVideo = computed(() => filterVideoGateways())
const filteredIot = computed(() => filterIotGateways())

function toggleVideoGw(gw: VideoGateway) {
  gw.expanded = !gw.expanded
}
function toggleIotGw(gw: IotGateway) {
  gw.expanded = !gw.expanded
}
</script>

<template>
  <div class="device-panel" :class="{ expanded: props.expanded }">
    <!-- 标题栏：分类 tab + 视图切换 + 放大缩小 -->
    <div class="panel-header">
      <!-- 紧凑分类 tab（胶囊样式） -->
      <div class="cat-segmented">
        <div class="cat-seg" :class="{ active: activeCategory === 'video' }" @click="activeCategory = 'video'">
          <i class="i-ant-design-video-camera-outlined" />
          <span>视频</span>
        </div>
        <div class="cat-seg" :class="{ active: activeCategory === 'iot' }" @click="activeCategory = 'iot'">
          <i class="i-ant-design-api-outlined" />
          <span>物联</span>
        </div>
      </div>
      <div class="header-actions">
        <!-- 视图切换 tab -->
        <div class="view-tabs">
          <div class="view-tab" :class="{ active: viewMode === 'card' }" @click="viewMode = 'card'">
            <i class="i-ant-design-appstore-outlined" />
          </div>
          <div class="view-tab" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">
            <i class="i-ant-design-unordered-list-outlined" />
          </div>
        </div>
        <!-- 放大缩小 -->
        <a-tooltip :title="props.expanded ? '缩小' : '放大'">
          <i
            :class="props.expanded ? 'i-ant-design-fullscreen-exit-outlined' : 'i-ant-design-fullscreen-outlined'"
            class="header-icon"
            @click="emit('toggleExpand')"
          />
        </a-tooltip>
      </div>
    </div>

    <!-- 搜索 -->
    <div class="panel-search">
      <a-input v-model:value="searchKey" placeholder="搜索设备名称" class="search-input">
        <template #prefix>
          <i class="i-ant-design-search-outlined" />
        </template>
      </a-input>
    </div>

    <!-- 内容区 -->
    <div class="panel-body scroll-thin">
      <!-- ===== 视频设备 ===== -->
      <template v-if="activeCategory === 'video'">
        <!-- 列表模式 -->
        <div v-if="viewMode === 'list'" class="tree-list">
          <div v-for="gw in filteredVideo" :key="gw.id" class="tree-group">
            <!-- 网关 -->
            <div class="gw-row" @click="toggleVideoGw(gw)">
              <i
                class="gw-arrow"
                :class="gw.expanded ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'"
              />
              <i class="i-ant-design-cluster-outlined gw-icon" style="color: #6e4bff" />
              <div class="gw-info">
                <div class="gw-name">{{ gw.name }}</div>
                <div class="gw-meta">{{ gw.model }}</div>
              </div>
            </div>
            <!-- 摄像头 -->
            <div v-if="gw.expanded" class="cam-list">
              <div v-for="cam in gw.cameras" :key="cam.id" class="cam-row" :class="{ bound: cam.boundSpace }">
                <i class="i-ant-design-video-camera-outlined cam-icon" :style="{ color: itemColor(!!cam.boundSpace, cam.status) }" />
                <div class="cam-info">
                  <div class="cam-name" :style="{ color: itemColor(!!cam.boundSpace, cam.status) }">{{ cam.name }}</div>
                  <a-tooltip :title="cam.boundSpace || '未绑定'" :disabled="!!cam.boundSpace">
                    <div class="cam-space" :class="{ unbound: !cam.boundSpace }">
                      {{ cam.boundSpace || '未绑定' }}
                    </div>
                  </a-tooltip>
                </div>
                <button v-if="!cam.boundSpace" class="bind-action">
                  绑定
                </button>
              </div>
            </div>
          </div>
          <div v-if="filteredVideo.length === 0" class="empty">暂无数据</div>
        </div>

        <!-- 卡片模式 -->
        <div v-else class="card-grid">
          <div v-for="gw in filteredVideo" :key="gw.id" class="card-group">
            <!-- 网关卡片 -->
            <div class="gw-card" @click="toggleVideoGw(gw)">
              <i class="i-ant-design-cluster-outlined gw-card-icon" style="color: #6e4bff" />
              <div class="gw-card-info">
                <div class="gw-card-name">{{ gw.name }}</div>
                <div class="gw-card-meta">{{ gw.model }}</div>
              </div>
              <i class="i-ant-design-caret-down-filled gw-card-arrow" :class="{ rotated: gw.expanded }" />
            </div>
            <!-- 摄像头卡片 -->
            <div v-if="gw.expanded" class="cam-card-list">
              <div v-for="cam in gw.cameras" :key="cam.id" class="cam-card">
                <div class="cam-card-thumb">
                  <img v-if="cam.thumb" :src="cam.thumb" alt="截帧" />
                  <i v-else class="i-ant-design-video-camera-outlined" :style="{ color: statusColor(cam.status) }" />
                  <span class="cam-status-dot" :style="{ background: statusColor(cam.status) }" />
                </div>
                <div class="cam-card-info">
                  <div class="cam-card-name" :style="{ color: itemColor(!!cam.boundSpace, cam.status) }">{{ cam.name }}</div>
                  <a-tooltip :title="cam.boundSpace || '未绑定'" :disabled="!!cam.boundSpace">
                    <div class="cam-card-space" :class="{ unbound: !cam.boundSpace }">
                      {{ cam.boundSpace || '未绑定' }}
                    </div>
                  </a-tooltip>
                  <button v-if="!cam.boundSpace" class="bind-action-card">
                    绑定
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-if="filteredVideo.length === 0" class="empty">暂无数据</div>
        </div>
      </template>

      <!-- ===== 物联设备 ===== -->
      <template v-else>
        <!-- 列表模式 -->
        <div v-if="viewMode === 'list'" class="tree-list">
          <div v-for="gw in filteredIot" :key="gw.id" class="tree-group">
            <!-- 网关 -->
            <div class="gw-row" @click="toggleIotGw(gw)">
              <i
                class="gw-arrow"
                :class="gw.expanded ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'"
              />
              <i class="i-ant-design-cluster-outlined gw-icon" style="color: #6e4bff" />
              <div class="gw-info">
                <div class="gw-name">{{ gw.name }}</div>
                <div class="gw-meta">{{ gw.model }}</div>
              </div>
            </div>
            <!-- 设备 -->
            <div v-if="gw.expanded" class="cam-list">
              <div v-for="dev in gw.devices" :key="dev.id" class="cam-row" :class="{ bound: dev.boundSpace }">
                <i :class="dev.icon" class="cam-icon" :style="{ color: itemColor(!!dev.boundSpace, dev.status) }" />
                <div class="cam-info">
                  <div class="cam-name" :style="{ color: itemColor(!!dev.boundSpace, dev.status) }">{{ dev.name }}</div>
                  <a-tooltip :title="dev.boundSpace || '未绑定'" :disabled="!!dev.boundSpace">
                    <div class="cam-space" :class="{ unbound: !dev.boundSpace }">
                      {{ dev.boundSpace || '未绑定' }}
                    </div>
                  </a-tooltip>
                </div>
                <button v-if="!dev.boundSpace" class="bind-action">
                  绑定
                </button>
              </div>
            </div>
          </div>
          <div v-if="filteredIot.length === 0" class="empty">暂无数据</div>
        </div>

        <!-- 卡片模式 -->
        <div v-else class="card-grid">
          <div v-for="gw in filteredIot" :key="gw.id" class="card-group">
            <div class="gw-card" @click="toggleIotGw(gw)">
              <i class="i-ant-design-cluster-outlined gw-card-icon" style="color: #6e4bff" />
              <div class="gw-card-info">
                <div class="gw-card-name">{{ gw.name }}</div>
                <div class="gw-card-meta">{{ gw.model }}</div>
              </div>
              <i class="i-ant-design-caret-down-filled gw-card-arrow" :class="{ rotated: gw.expanded }" />
            </div>
            <div v-if="gw.expanded" class="cam-card-list">
              <div v-for="dev in gw.devices" :key="dev.id" class="cam-card">
                <div class="cam-card-thumb">
                  <i :class="dev.icon" :style="{ color: statusColor(dev.status) }" />
                </div>
                <div class="cam-card-info">
                  <div class="cam-card-name" :style="{ color: itemColor(!!dev.boundSpace, dev.status) }">{{ dev.name }}</div>
                  <a-tooltip :title="dev.boundSpace || '未绑定'" :disabled="!!dev.boundSpace">
                    <div class="cam-card-space" :class="{ unbound: !dev.boundSpace }">
                      {{ dev.boundSpace || '未绑定' }}
                    </div>
                  </a-tooltip>
                  <button v-if="!dev.boundSpace" class="bind-action-card">
                    绑定
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-if="filteredIot.length === 0" class="empty">暂无数据</div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.device-panel {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  box-shadow: 0 1px rgba(20, 22, 30, 0.04);
  overflow: hidden;
  // 默认占二分之一
  flex: 1;
  min-height: 0;
  transition: flex 0.3s;

  // 展开：占满
  &.expanded {
    flex: 1;
  }

  // 非展开时如果对方展开了，自己收缩
  &:not(.expanded) {
    // 由父级控制
  }

  // 被另一个面板挤到最小
  &.collapsed {
    flex: 0 0 40px;
    overflow: hidden;
  }
}

/* 标题栏 */
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

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  // 视图切换 tab
  .view-tabs {
    display: flex;
    border: 1px solid $border-color-card;
    border-radius: 6px;
    overflow: hidden;
  }

  .view-tab {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 24px;
    cursor: pointer;
    color: $text-tertiary;
    transition: all 0.2s;

    i {
      font-size: 13px;
    }

    &:hover {
      color: $text-secondary;
    }

    &.active {
      background: $color-primary-bg;
      color: $color-primary;
    }
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
}

/* 紧凑分类分段控件 */
.cat-segmented {
  display: flex;
  background: #f0f1f3;
  border-radius: 6px;
  padding: 2px;
}

.cat-seg {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 24px;
  padding: 0 10px;
  font-size: 13px;
  color: $text-secondary;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;

  i {
    font-size: 13px;
  }

  &.active {
    background: #fff;
    color: $text-base;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  }
}

/* 搜索区 */
.panel-search {
  padding: 8px 12px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  .search-input {
    border-radius: 8px;
  }
}

/* 内容区 */
.panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

/* ===== 列表模式 ===== */
.tree-group {
  margin-bottom: 4px;
}

.gw-row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 6px;
  cursor: pointer;
  border-radius: 6px;

  &:hover {
    background: $bg-hover;
  }

  .gw-arrow {
    font-size: 10px;
    color: $text-muted;
    width: 12px;
  }

  .gw-icon {
    font-size: 16px;
  }

  .gw-info {
    flex: 1;
    min-width: 0;

    .gw-name {
      font-size: 14px;
      font-weight: 500;
      color: $text-base;
    }

    .gw-meta {
      font-size: 12px;
      color: $text-tertiary;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
}

.cam-list {
  padding-left: 20px;
}

.cam-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  min-height: 44px;
  padding: 6px 6px;
  border-radius: 6px;

  &:hover {
    background: $bg-hover;
  }

  .cam-icon {
    font-size: 14px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  // 绑定/重新绑定按钮（列表模式）
  .bind-action {
    flex-shrink: 0;
    height: 24px;
    padding: 0 10px;
    border: 1px solid $color-primary;
    border-radius: 4px;
    background: $color-primary-bg;
    color: $color-primary;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.2s;
    white-space: nowrap;

    &:hover {
      background: $color-primary;
      color: #fff;
    }

    // 已绑定的重新绑定：灰色
    &.bound {
      border-color: $border-color-card;
      background: #fff;
      color: $text-secondary;

      &:hover {
        border-color: $color-primary;
        color: $color-primary;
      }
    }
  }

  .cam-info {
    flex: 1;
    min-width: 0;

    .cam-name {
      font-size: 13px;
      color: $text-base;
      line-height: 1.4;
    }

    .cam-space {
      font-size: 12px;
      color: $text-tertiary;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.4;

      &.unbound {
        color: $color-primary;
      }
    }

    .dev-brand {
      font-size: 12px;
      color: $text-tertiary;
      line-height: 1.4;
    }
  }
}

/* ===== 卡片模式 ===== */
.card-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.card-group {
  // 网关卡片 + 摄像头卡片容器
}

.gw-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: $color-primary;
  }

  .gw-card-icon {
    font-size: 20px;
  }

  .gw-card-info {
    flex: 1;
    min-width: 0;

    .gw-card-name {
      font-size: 14px;
      font-weight: 500;
      color: $text-base;
    }

    .gw-card-meta {
      font-size: 12px;
      color: $text-tertiary;
    }
  }

  .gw-card-arrow {
    font-size: 10px;
    color: $text-muted;
    transition: transform 0.2s;

    &.rotated {
      transform: rotate(180deg);
    }
  }
}

.cam-card-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 8px 8px 0 8px;
}

.cam-card {
  border: 1px solid $border-color-card;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.2s;

  &:hover {
    border-color: $color-primary;
    box-shadow: 0 2px 8px rgba(110, 75, 255, 0.1);
  }

  .cam-card-thumb {
    position: relative;
    height: 72px;
    background: #1a1a2e;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    i {
      font-size: 24px;
    }

    .cam-status-dot {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 6px;
      height: 6px;
      border-radius: 50%;
      border: 1px solid rgba(255,255,255,0.5);
    }
  }

  .cam-card-info {
    padding: 6px 8px;

    // 卡片模式绑定按钮
    .bind-action-card {
      width: 100%;
      margin-top: 6px;
      height: 24px;
      border: 1px solid $color-primary;
      border-radius: 4px;
      background: $color-primary-bg;
      color: $color-primary;
      font-size: 12px;
      cursor: pointer;
      font-family: inherit;
      transition: all 0.2s;

      &:hover {
        background: $color-primary;
        color: #fff;
      }

      &.bound {
        border-color: $border-color-card;
        background: #fff;
        color: $text-secondary;

        &:hover {
          border-color: $color-primary;
          color: $color-primary;
        }
      }
    }

    .cam-card-name {
      font-size: 13px;
      font-weight: 500;
      color: $text-base;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cam-card-brand {
      font-size: 11px;
      color: $text-tertiary;
    }

    .cam-card-space {
      font-size: 11px;
      color: $text-tertiary;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      &.unbound {
        color: $color-primary;
      }
    }
  }
}

/* 空状态 */
.empty {
  text-align: center;
  padding: 40px 0;
  font-size: 14px;
  color: $text-tertiary;
}
</style>
