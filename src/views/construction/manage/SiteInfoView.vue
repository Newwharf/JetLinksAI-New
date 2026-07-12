<script setup lang="ts">
/**
 * 工地基本信息 Tab
 * 展示工地的缩略图、名称、说明、面积、地图位置（Leaflet 小地图）、地址
 * 提供编辑功能
 */
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { TreeNode } from './SiteManageView.vue'
import { personOptions } from './persons'
import { formatArea } from '../posture.mock'

const props = defineProps<{
  node: TreeNode
}>()

// emit 编辑完成 / 删除
const emit = defineEmits<{
  edit: [node: TreeNode, data: SiteEditData]
  delete: [node: TreeNode]
}>()

export interface SiteEditData {
  name: string
  desc: string
  area: number
  address: string
  lat: number
  lng: number
  thumb?: string
  permissions?: string[]
}

// ===== 展示用小地图 =====
const miniMapContainer = ref<HTMLDivElement | null>(null)
let miniMap: L.Map | null = null
let mapResizeObserver: ResizeObserver | null = null

function initMiniMap() {
  if (!miniMapContainer.value) return
  if (miniMap) { miniMap.remove(); miniMap = null }
  if (mapResizeObserver) { mapResizeObserver.disconnect(); mapResizeObserver = null }

  const lat = props.node.lat || 30.25
  const lng = props.node.lng || 120.15

  miniMap = L.map(miniMapContainer.value, {
    center: [lat, lng],
    zoom: 14,
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false
  })

  L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: ['1', '2', '3', '4'],
    maxZoom: 18
  }).addTo(miniMap)

  L.marker([lat, lng], {
    icon: L.divIcon({
      className: 'mini-site-marker',
      html: `<div class="mini-marker-pin"><i class="i-ant-design-environment-filled"></i></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    })
  }).addTo(miniMap)

  // 容器尺寸可能还没就绪，强制刷新瓦片
  setTimeout(() => miniMap?.invalidateSize(), 100)

  // 监听容器尺寸变化，自适应地图
  mapResizeObserver = new ResizeObserver(() => {
    miniMap?.invalidateSize()
  })
  mapResizeObserver.observe(miniMapContainer.value)
}

onMounted(() => {
  nextTick(() => initMiniMap())
})

onBeforeUnmount(() => {
  if (mapResizeObserver) { mapResizeObserver.disconnect(); mapResizeObserver = null }
  if (miniMap) { miniMap.remove(); miniMap = null }
})

watch(() => props.node.id, () => {
  nextTick(() => initMiniMap())
})

// ===== 地图选点逆地理编码（模拟）=====
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

// ===== 编辑弹窗 =====
const editVisible = ref(false)
const editForm = reactive({
  name: '',
  desc: '',
  area: 0,
  address: '',
  lat: 30.25,
  lng: 120.15,
  thumb: '',
  permissions: [] as string[]
})

// 编辑弹窗内的 Leaflet 选点地图
const editMapContainer = ref<HTMLDivElement | null>(null)
let editMap: L.Map | null = null
let editMarker: L.Marker | null = null

function openEdit() {
  editForm.name = props.node.label
  editForm.desc = props.node.desc || ''
  editForm.area = props.node.area || 0
  editForm.address = props.node.address || ''
  editForm.lat = props.node.lat || 30.25
  editForm.lng = props.node.lng || 120.15
  editForm.thumb = props.node.siteThumb || ''
  editForm.permissions = [...(props.node.permissions || [])]
  editVisible.value = true

  nextTick(() => initEditMap())
}

function initEditMap() {
  if (!editMapContainer.value) return
  if (editMap) { editMap.remove(); editMap = null }

  editMap = L.map(editMapContainer.value, {
    center: [editForm.lat, editForm.lng],
    zoom: 13,
    zoomControl: true,
    attributionControl: false
  })

  L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: ['1', '2', '3', '4'],
    maxZoom: 18
  }).addTo(editMap)

  editMarker = L.marker([editForm.lat, editForm.lng], {
    icon: L.divIcon({
      className: 'edit-site-marker',
      html: `<div class="edit-marker-pin"><i class="i-ant-design-environment-filled"></i></div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    }),
    draggable: true
  }).addTo(editMap)

  editMarker.on('dragend', () => {
    const ll = editMarker!.getLatLng()
    editForm.lat = +ll.lat.toFixed(6)
    editForm.lng = +ll.lng.toFixed(6)
    editForm.address = reverseGeocode(editForm.lat, editForm.lng)
  })

  // 点击地图选点
  editMap.on('click', (e: L.LeafletMouseEvent) => {
    editForm.lat = +e.latlng.lat.toFixed(6)
    editForm.lng = +e.latlng.lng.toFixed(6)
    editMarker!.setLatLng(e.latlng)
    editForm.address = reverseGeocode(editForm.lat, editForm.lng)
  })

  // 弹窗内地图需要延迟刷新尺寸
  setTimeout(() => editMap?.invalidateSize(), 200)
}

function handleEditOk() {
  if (!editForm.name.trim()) return
  emit('edit', props.node, { ...editForm })
  editVisible.value = false
  if (editMap) { editMap.remove(); editMap = null }
}

function handleEditCancel() {
  editVisible.value = false
  if (editMap) { editMap.remove(); editMap = null }
}

// ===== 缩略图上传 =====
const thumbInputRef = ref<HTMLInputElement | null>(null)

function triggerThumbUpload() {
  thumbInputRef.value?.click()
}

function handleThumbChange(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = () => {
      editForm.thumb = reader.result as string
    }
    reader.readAsDataURL(file)
  }
  target.value = ''
}

// 大图预览
const previewVisible = ref(false)

// 当前工地有权限的人员列表
const permittedPersons = computed(() => {
  const ids = props.node.permissions || []
  return personOptions.filter(p => ids.includes(p.id))
})
</script>

<template>
  <div class="site-info-view">
    <!-- 隐藏的缩略图上传 input -->
    <input
      ref="thumbInputRef"
      type="file"
      accept="image/*"
      class="hidden-input"
      @change="handleThumbChange"
    />

    <!-- 基本信息展示 -->
    <div class="info-layout">
      <!-- 左侧：缩略图 -->
      <div class="info-left">
        <div class="thumb-box" @click="previewVisible = true">
          <img v-if="node.siteThumb" :src="node.siteThumb" alt="工地缩略图" />
          <div v-else class="thumb-placeholder">
            <i class="i-ant-design-picture-outlined" />
            <span>暂无缩略图</span>
          </div>
        </div>
      </div>

      <!-- 右侧：信息列表 -->
      <div class="info-right">
        <div class="info-header">
          <h3 class="site-name">{{ node.label }}</h3>
          <div class="header-actions">
            <button class="action-btn edit-btn" @click="openEdit">
              <i class="i-ant-design-edit-outlined" />
              <span>编辑</span>
            </button>
            <button class="action-btn delete-btn" @click="emit('delete', node)">
              <i class="i-ant-design-delete-outlined" />
              <span>删除</span>
            </button>
          </div>
        </div>

        <dl class="info-list">
          <div class="info-item">
            <dt>说明</dt>
            <dd>{{ node.desc || '暂无' }}</dd>
          </div>
          <div class="info-item">
            <dt>面积</dt>
            <dd>{{ node.area ? formatArea(node.area) : '暂无' }}</dd>
          </div>
          <div class="info-item">
            <dt>地址</dt>
            <dd>{{ node.address || '暂无' }}</dd>
          </div>
          <div class="info-item">
            <dt>地图位置</dt>
            <dd>{{ node.lat ? node.lat.toFixed(4) + ', ' + node.lng!.toFixed(4) : '暂无' }}</dd>
          </div>
        </dl>

        <!-- 人员权限 -->
        <div class="perm-section">
          <div class="perm-section__head">
            <span class="perm-section__label">人员权限</span>
            <span class="perm-section__count">{{ permittedPersons.length }} 人</span>
          </div>
          <div v-if="permittedPersons.length" class="perm-chips">
            <div v-for="p in permittedPersons" :key="p.id" class="perm-chip">
              <img :src="p.avatar" class="perm-chip__avatar" alt="" />
              <span class="perm-chip__name">{{ p.name }}</span>
              <span class="perm-chip__role">{{ p.role }}</span>
            </div>
          </div>
          <div v-else class="perm-empty">暂未设置人员权限</div>
        </div>
      </div>
    </div>

    <!-- 工地定位（独立卡片） -->
    <div class="location-card">
      <div class="location-card__head">
        <strong>工地定位</strong>
        <span class="location-card__hint">{{ node.address || '暂无地址' }}</span>
      </div>
      <div ref="miniMapContainer" class="mini-map" />
    </div>

    <!-- 大图预览弹窗 -->
    <a-modal :open="previewVisible" :width="800" :footer="null" centered @cancel="previewVisible = false">
      <img v-if="node.siteThumb" :src="node.siteThumb" class="preview-img" alt="工地缩略图" />
    </a-modal>

    <!-- 编辑弹窗 -->
    <a-modal
      v-model:open="editVisible"
      title="编辑工地信息"
      :width="680"
      ok-text="保存"
      cancel-text="取消"
      :ok-button-props="{ disabled: !editForm.name.trim() }"
      @ok="handleEditOk"
      @cancel="handleEditCancel"
    >
      <div class="edit-form">
        <!-- 缩略图 -->
        <div class="edit-form-item">
          <label class="edit-label">工地缩略图</label>
          <div class="edit-thumb-upload" @click="triggerThumbUpload">
            <img v-if="editForm.thumb" :src="editForm.thumb" alt="缩略图" />
            <div v-else class="upload-placeholder">
              <i class="i-ant-design-plus-outlined" />
              <span>上传图片</span>
            </div>
          </div>
        </div>

        <!-- 名称 -->
        <div class="edit-form-item">
          <label class="edit-label"><span class="required">*</span>工地名称</label>
          <a-input v-model:value="editForm.name" placeholder="请输入工地名称" />
        </div>

        <!-- 说明 -->
        <div class="edit-form-item">
          <label class="edit-label">说明</label>
          <a-textarea v-model:value="editForm.desc" :rows="2" placeholder="请输入工地说明" />
        </div>

        <!-- 面积 -->
        <div class="edit-form-item">
          <label class="edit-label">面积（㎡）</label>
          <a-input-number v-model:value="editForm.area" :min="0" placeholder="请输入面积" style="width: 100%" />
        </div>

        <!-- 地址 -->
        <div class="edit-form-item">
          <label class="edit-label">地址</label>
          <a-input v-model:value="editForm.address" placeholder="请输入工地地址" />
        </div>

        <!-- 地图选点 -->
        <div class="edit-form-item">
          <label class="edit-label">地图位置</label>
          <div class="edit-coords">
            <span class="coord-text">经度: {{ editForm.lng.toFixed(4) }}</span>
            <span class="coord-text">纬度: {{ editForm.lat.toFixed(4) }}</span>
          </div>
          <div ref="editMapContainer" class="edit-map" />
          <p class="edit-map-tip">点击地图选择位置，或拖动标记调整</p>
        </div>

        <!-- 人员权限 -->
        <div class="edit-form-item">
          <label class="edit-label">人员权限</label>
          <p class="edit-perm-hint">设置哪些人员有权限查看和管理该工地</p>
          <a-checkbox-group v-model:value="editForm.permissions" class="edit-perm-group">
            <div v-for="p in personOptions" :key="p.id" class="edit-perm-item">
              <a-checkbox :value="p.id">
                <div class="edit-perm-info">
                  <img :src="p.avatar" class="edit-perm-avatar" alt="" />
                  <span class="edit-perm-name">{{ p.name }}</span>
                  <span class="edit-perm-role">{{ p.role }}</span>
                </div>
              </a-checkbox>
            </div>
          </a-checkbox-group>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.site-info-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.hidden-input { display: none; }

.info-layout {
  display: flex;
  gap: 24px;
  padding: 8px 0;
  flex-shrink: 0;
}

/* 左侧缩略图 */
.info-left {
  flex-shrink: 0;
}

.thumb-box {
  width: 240px;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid $border-color-card;
  background: #f0f4f8;
  transition: all 0.2s;

  &:hover {
    border-color: $color-primary;
    box-shadow: $shadow-card-active;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: $text-muted;

  i { font-size: 32px; opacity: 0.5; }
  span { font-size: 12px; }
}

/* 右侧信息 */
.info-right {
  flex: 1;
  min-width: 0;
}

.info-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;

  .site-name {
    font-size: 18px;
    font-weight: 600;
    color: $text-base;
    margin: 0;
  }
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  i { font-size: 14px; }
}

.edit-btn {
  border: 1px solid $color-primary;
  background: #fff;
  color: $color-primary;

  &:hover {
    background: $color-primary;
    color: #fff;
  }
}

.delete-btn {
  border: 1px solid #ffccc7;
  background: #fff;
  color: #ff4d4f;

  &:hover {
    background: #ff4d4f;
    color: #fff;
    border-color: #ff4d4f;
  }
}

.info-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 32px;
  margin: 0 0 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  dt {
    font-size: 12px;
    color: $text-muted;
  }

  dd {
    font-size: 14px;
    color: $text-base;
    margin: 0;
    line-height: 1.5;
  }
}

/* 工地定位独立卡片 */
.location-card {
  margin-top: 16px;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  overflow: hidden;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid $border-color-card;
    flex-shrink: 0;

    strong {
      font-size: 15px;
      font-weight: 600;
      color: $text-base;
    }
  }

  &__hint {
    font-size: 12px;
    color: $text-muted;
  }
}

.mini-map {
  width: 100%;
  flex: 1;
  min-height: 200px;
  overflow: hidden;

  :deep(.mini-marker-pin) {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: $color-primary;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 3px rgba(110, 75, 255, 0.2), 0 2px 6px rgba(0, 0, 0, 0.15);

    i { font-size: 14px; color: #fff; }
  }
}

/* 大图预览 */
.preview-img {
  width: 100%;
  border-radius: 8px;
  display: block;
}

/* ===== 编辑弹窗表单 ===== */
.edit-form {
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

.edit-form-item {
  margin-bottom: 16px;

  &:last-child { margin-bottom: 0; }
}

.edit-label {
  display: block;
  font-size: 14px;
  color: $text-base;
  margin-bottom: 6px;

  .required { color: #ff4d4f; margin-right: 2px; }
}

/* 缩略图上传 */
.edit-thumb-upload {
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

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
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

/* 地图选点 */
.edit-coords {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;

  .coord-text {
    font-size: 12px;
    color: $text-secondary;
    font-family: monospace;
  }
}

.edit-map {
  width: 100%;
  height: 280px;
  border-radius: 8px;
  border: 1px solid $border-color-card;
  overflow: hidden;

  :deep(.edit-marker-pin) {
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

.edit-map-tip {
  font-size: 12px;
  color: $text-muted;
  margin: 6px 0 0;
}

/* ===== 展示区：人员权限 ===== */
.perm-section {
  margin-top: 16px;
}

.perm-section__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.perm-section__label {
  font-size: 13px;
  font-weight: 600;
  color: $text-base;
}

.perm-section__count {
  font-size: 12px;
  color: $text-muted;
  background: #f0f4f8;
  padding: 1px 8px;
  border-radius: 10px;
}

.perm-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.perm-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 4px;
  border: 1px solid $border-color-card;
  border-radius: 20px;
  background: #fff;
  transition: all 0.15s;

  &:hover { border-color: $color-primary; }
}

.perm-chip__avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.perm-chip__name {
  font-size: 12px;
  font-weight: 500;
  color: $text-base;
}

.perm-chip__role {
  font-size: 11px;
  color: $color-primary;
}

.perm-empty {
  font-size: 13px;
  color: $text-muted;
}

/* ===== 编辑弹窗：人员权限 ===== */
.edit-perm-hint {
  font-size: 12px;
  color: $text-muted;
  margin: 0 0 8px;
}

.edit-perm-group {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.edit-perm-item {
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

.edit-perm-info {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.edit-perm-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.edit-perm-name {
  font-size: 13px;
  color: $text-base;
  font-weight: 500;
}

.edit-perm-role {
  font-size: 11px;
  color: $text-muted;
}
</style>
