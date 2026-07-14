<script setup lang="ts">
/**
 * 车辆基本档案 — 卡片/列表视图 + 新增/编辑/详情/删除
 * 管理工地车辆的基本档案信息（车牌、车型、所属单位等）
 */
import { message } from 'ant-design-vue'
import img1 from '@/assets/construction/vehicle/1.png'
import img2 from '@/assets/construction/vehicle/2.png'
import img3 from '@/assets/construction/vehicle/3.png'
import img4 from '@/assets/construction/vehicle/4.png'

// ===== 车辆数据模型 =====
interface Vehicle {
  id: string
  plate: string          // 车牌号
  vehicleType: string    // 车型
  unit: string           // 所属单位
  photo: string          // 车辆照片
  driver: string         // 驾驶员
  phone: string          // 联系电话
  remark: string         // 备注
  keyFocus: boolean      // 重点关注
  createdAt: string
}

// 全局车辆列表
const vehicles = ref<Vehicle[]>([
  { id: 'vhc-1', plate: '浙A·8F2K6', vehicleType: '渣土车',       unit: '滨江土方工程公司', photo: img1, driver: '张建国', phone: '138****6688', remark: '核定载重 15 吨',       keyFocus: true,  createdAt: '2026-06-01' },
  { id: 'vhc-2', plate: '浙A·3H9L2', vehicleType: '混凝土泵车',   unit: '中建三局混凝土分公司', photo: img2, driver: '李志强', phone: '139****2233', remark: '臂长 37 米',           keyFocus: false, createdAt: '2026-06-05' },
  { id: 'vhc-3', plate: '浙A·1D5X8', vehicleType: '汽车吊',       unit: '杭州大件运输公司',   photo: img3, driver: '王德发', phone: '137****5566', remark: '最大起重量 25 吨',     keyFocus: false, createdAt: '2026-06-10' },
  { id: 'vhc-4', plate: '浙A·9P4N3', vehicleType: '材料运输车',   unit: '滨江建材供应公司',   photo: img4, driver: '刘明远', phone: '136****7788', remark: '',                     keyFocus: true,  createdAt: '2026-06-12' },
  { id: 'vhc-5', plate: '浙B·7K2M0', vehicleType: '渣土车',       unit: '城北土方工程公司',   photo: img1, driver: '陈永福', phone: '135****1100', remark: '夜间运输许可证已办',   keyFocus: false, createdAt: '2026-06-15' },
  { id: 'vhc-6', plate: '浙A·6Y8R1', vehicleType: '混凝土搅拌车', unit: '中建三局混凝土分公司', photo: img2, driver: '赵铁柱', phone: '133****4422', remark: '容量 12 立方米',       keyFocus: false, createdAt: '2026-06-18' },
  { id: 'vhc-7', plate: '浙A·2J6T5', vehicleType: '随车吊',       unit: '杭州大件运输公司',   photo: img3, driver: '孙伟',   phone: '138****3344', remark: '',                     keyFocus: false, createdAt: '2026-06-20' },
  { id: 'vhc-8', plate: '浙A·5G3W9', vehicleType: '材料运输车',   unit: '萧山建材供应公司',   photo: img4, driver: '周强',   phone: '139****8899', remark: '平板车 9.6 米',        keyFocus: true,  createdAt: '2026-06-22' },
  { id: 'vhc-9', plate: '浙B·1F8Q4', vehicleType: '混凝土泵车',   unit: '城北混凝土公司',     photo: img1, driver: '吴明',   phone: '137****6655', remark: '臂长 42 米',           keyFocus: false, createdAt: '2026-06-25' },
  { id: 'vhc-10', plate: '浙A·4H2N7', vehicleType: '渣土车',      unit: '滨江土方工程公司',   photo: img2, driver: '郑大勇', phone: '135****9988', remark: '',                     keyFocus: false, createdAt: '2026-06-28' }
])

// ===== 搜索 =====
const searchKey = ref('')

// ===== 关注筛选 =====
const focusFilter = ref<'all' | 'focus' | 'normal'>('all')
const focusOptions = [
  { value: 'all', label: '全部车辆' },
  { value: 'focus', label: '仅重点关注' },
  { value: 'normal', label: '仅普通车辆' }
]

// ===== 视图模式 =====
const viewMode = ref<'card' | 'list'>('card')

// 过滤
const filtered = computed(() => {
  let list = vehicles.value
  if (focusFilter.value === 'focus') list = list.filter(v => v.keyFocus)
  else if (focusFilter.value === 'normal') list = list.filter(v => !v.keyFocus)
  if (!searchKey.value.trim()) return list
  const k = searchKey.value.trim().toLowerCase()
  return list.filter(v =>
    v.plate.toLowerCase().includes(k) ||
    v.vehicleType.toLowerCase().includes(k) ||
    v.unit.toLowerCase().includes(k) ||
    v.driver.toLowerCase().includes(k)
  )
})

// 重点切换
function onToggleFocus(id: string) {
  const v = vehicles.value.find(x => x.id === id)
  if (v) v.keyFocus = !v.keyFocus
}

// ===== 新增/编辑弹窗（共用） =====
const formVisible = ref(false)
const formMode = ref<'add' | 'edit'>('add')
const editId = ref('')
const form = reactive({
  plate: '',
  vehicleType: '',
  unit: '',
  driver: '',
  phone: '',
  remark: '',
  keyFocus: false,
  files: [] as { name: string; url: string }[]
})
const fileInput = ref<HTMLInputElement | null>(null)

function openAdd() {
  formMode.value = 'add'
  editId.value = ''
  form.plate = ''
  form.vehicleType = ''
  form.unit = ''
  form.driver = ''
  form.phone = ''
  form.remark = ''
  form.keyFocus = false
  form.files = []
  formVisible.value = true
}

function openEdit(v: Vehicle) {
  formMode.value = 'edit'
  editId.value = v.id
  form.plate = v.plate
  form.vehicleType = v.vehicleType
  form.unit = v.unit
  form.driver = v.driver
  form.phone = v.phone
  form.remark = v.remark
  form.keyFocus = v.keyFocus
  form.files = [{ name: v.photo, url: v.photo }]
  formVisible.value = true
}

const formTitle = computed(() => formMode.value === 'add' ? '新增车辆' : '编辑车辆')

const formError = computed(() => {
  if (!form.plate.trim()) return '请输入车牌号'
  if (!form.vehicleType.trim()) return '请输入车型'
  if (!form.unit.trim()) return '请输入所属单位'
  if (form.files.length === 0) return '请至少上传一张车辆照片'
  return ''
})

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  Array.from(input.files).forEach(f => {
    form.files.push({ name: f.name, url: URL.createObjectURL(f) })
  })
  input.value = ''
}

function removeFile(idx: number) {
  URL.revokeObjectURL(form.files[idx].url)
  form.files.splice(idx, 1)
}

function handleFormSubmit() {
  if (formError.value) return
  if (formMode.value === 'add') {
    const newVehicle: Vehicle = {
      id: `vhc-${Date.now()}`,
      plate: form.plate.trim(),
      vehicleType: form.vehicleType.trim(),
      unit: form.unit.trim(),
      driver: form.driver.trim(),
      phone: form.phone.trim(),
      remark: form.remark.trim(),
      photo: form.files[0].url,
      keyFocus: form.keyFocus,
      createdAt: new Date().toISOString().slice(0, 10)
    }
    vehicles.value.unshift(newVehicle)
    message.success('车辆添加成功')
  } else {
    const v = vehicles.value.find(x => x.id === editId.value)
    if (v) {
      v.plate = form.plate.trim()
      v.vehicleType = form.vehicleType.trim()
      v.unit = form.unit.trim()
      v.driver = form.driver.trim()
      v.phone = form.phone.trim()
      v.remark = form.remark.trim()
      v.photo = form.files[0].url
      v.keyFocus = form.keyFocus
      message.success('车辆信息已更新')
    }
  }
  formVisible.value = false
}

// ===== 详情弹窗 =====
const detailVisible = ref(false)
const detailData = ref<Vehicle | null>(null)

function openDetail(v: Vehicle) {
  detailData.value = v
  detailVisible.value = true
}

// ===== 删除 =====
const deleteId = ref<string>('')
const deleteVisible = ref(false)

function onDelete(id: string) {
  deleteId.value = id
  deleteVisible.value = true
}

function confirmDelete() {
  vehicles.value = vehicles.value.filter(v => v.id !== deleteId.value)
  deleteVisible.value = false
  message.success('已删除')
}

onBeforeUnmount(() => {
  form.files.forEach(f => URL.revokeObjectURL(f.url))
})
</script>

<template>
  <div class="vp-page">
    <!-- 工具栏 -->
    <header class="vp-toolbar">
      <div class="vp-search">
        <i class="i-ant-design-search-outlined vp-search-icon" />
        <input
          v-model="searchKey"
          class="vp-search-input"
          placeholder="搜索车牌、车型、所属单位或驾驶员"
        />
      </div>
      <a-select
        v-model:value="focusFilter"
        class="vp-focus-select"
        :options="focusOptions"
      />
      <div class="vp-toolbar-right">
        <span class="vp-count">共 {{ filtered.length }} 辆</span>
        <div class="vp-view-switch">
          <button class="vp-view-btn" :class="{ active: viewMode === 'card' }" title="卡片视图" @click="viewMode = 'card'">
            <i class="i-ant-design-appstore-outlined" />
          </button>
          <button class="vp-view-btn" :class="{ active: viewMode === 'list' }" title="列表视图" @click="viewMode = 'list'">
            <i class="i-ant-design-unordered-list-outlined" />
          </button>
        </div>
        <button class="vp-add-btn" @click="openAdd">
          <i class="i-ant-design-plus-outlined" />新增车辆
        </button>
      </div>
    </header>

    <!-- 内容区 -->
    <div class="vp-content">
      <!-- 卡片视图 -->
      <div v-if="viewMode === 'card'" class="vp-grid">
        <article v-for="v in filtered" :key="v.id" class="vcard" @click="openDetail(v)">
          <div class="vcard__media">
            <img :src="v.photo" class="vcard__img" alt="车辆照片" />
            <span v-if="v.keyFocus" class="vcard__focus">
              <i class="i-ant-design-star-filled" />重点关注
            </span>
            <span class="vcard__plate-badge">{{ v.plate }}</span>
          </div>
          <div class="vcard__body">
            <div class="vcard__name-row">
              <span class="vcard__plate">{{ v.plate }}</span>
              <button
                class="vcard__star"
                :class="{ active: v.keyFocus }"
                :title="v.keyFocus ? '取消重点关注' : '设为重点关注'"
                @click.stop="onToggleFocus(v.id)"
              >
                <i :class="v.keyFocus ? 'i-ant-design-star-filled' : 'i-ant-design-star-outlined'" />
              </button>
            </div>
            <div class="vcard__meta">
              <div class="vcard__meta-line">
                <i class="i-ant-design-car-outlined" />
                <span>{{ v.vehicleType }}</span>
              </div>
              <div class="vcard__meta-line">
                <i class="i-ant-design-bank-outlined" />
                <span>{{ v.unit }}</span>
              </div>
              <div class="vcard__meta-line" v-if="v.driver">
                <i class="i-ant-design-user-outlined" />
                <span>{{ v.driver }}</span>
              </div>
            </div>
            <button class="vcard__delete" @click.stop="onDelete(v.id)">
              <i class="i-ant-design-delete-outlined" />
            </button>
          </div>
        </article>
        <div v-if="filtered.length === 0" class="vp-empty">暂无车辆数据</div>
      </div>

      <!-- 列表视图 -->
      <div v-else class="vp-list-wrap">
        <table class="vp-table">
          <thead>
            <tr>
              <th class="col-photo">照片</th>
              <th class="col-plate">车牌</th>
              <th class="col-type">车型</th>
              <th class="col-unit">所属单位</th>
              <th class="col-driver">驾驶员</th>
              <th class="col-phone">联系电话</th>
              <th class="col-tag">重点关注</th>
              <th class="col-op">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="v in filtered" :key="v.id" class="vp-row" @click="openDetail(v)">
              <td class="col-photo">
                <div class="vp-photo-sm">
                  <img :src="v.photo" alt="车辆照片" />
                </div>
              </td>
              <td class="col-plate">{{ v.plate }}</td>
              <td class="col-type">{{ v.vehicleType }}</td>
              <td class="col-unit" :title="v.unit">{{ v.unit }}</td>
              <td class="col-driver">{{ v.driver || '—' }}</td>
              <td class="col-phone">{{ v.phone || '—' }}</td>
              <td class="col-tag">
                <span v-if="v.keyFocus" class="vp-tag-focus">
                  <i class="i-ant-design-star-filled" />重点关注
                </span>
                <span v-else class="vp-tag-none">—</span>
              </td>
              <td class="col-op">
                <button class="vp-row-detail" @click.stop="openDetail(v)">详情</button>
                <button class="vp-row-star" :class="{ active: v.keyFocus }" @click.stop="onToggleFocus(v.id)">
                  <i :class="v.keyFocus ? 'i-ant-design-star-filled' : 'i-ant-design-star-outlined'" />
                </button>
                <button class="vp-row-delete" @click.stop="onDelete(v.id)">删除</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="8" class="vp-empty-row">暂无车辆数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <a-modal :open="formVisible" :width="560" centered :title="formTitle" @cancel="formVisible = false">
      <div class="form-body">
        <!-- 照片上传 -->
        <div class="form-row">
          <label class="form-label">
            <span class="req">*</span>车辆照片
            <span class="form-label-hint">（至少一张，支持多张）</span>
          </label>
          <div class="form-faces">
            <div v-for="(f, i) in form.files" :key="i" class="form-face-item">
              <img :src="f.url" alt="车辆照片" />
              <button class="form-face-del" @click="removeFile(i)">
                <i class="i-ant-design-close-outlined" />
              </button>
            </div>
            <button class="form-face-upload" @click="fileInput?.click()">
              <i class="i-ant-design-plus-outlined" />
              <span>上传图片</span>
              <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onFileChange" />
            </button>
          </div>
        </div>

        <!-- 车牌号 -->
        <div class="form-row">
          <label class="form-label"><span class="req">*</span>车牌号</label>
          <a-input v-model:value="form.plate" placeholder="请输入车牌号（如 浙A·8F2K6）" allow-clear />
        </div>

        <!-- 车型 -->
        <div class="form-row">
          <label class="form-label"><span class="req">*</span>车型</label>
          <a-input v-model:value="form.vehicleType" placeholder="请输入车型（如渣土车、混凝土车、吊车等）" allow-clear />
        </div>

        <!-- 所属单位 -->
        <div class="form-row">
          <label class="form-label"><span class="req">*</span>所属单位</label>
          <a-input v-model:value="form.unit" placeholder="请输入所属单位" allow-clear />
        </div>

        <!-- 驾驶员 -->
        <div class="form-row">
          <label class="form-label">驾驶员</label>
          <a-input v-model:value="form.driver" placeholder="请输入驾驶员姓名（选填）" allow-clear />
        </div>

        <!-- 联系电话 -->
        <div class="form-row">
          <label class="form-label">联系电话</label>
          <a-input v-model:value="form.phone" placeholder="请输入联系电话（选填）" allow-clear />
        </div>

        <!-- 备注 -->
        <div class="form-row">
          <label class="form-label">备注说明</label>
          <a-textarea
            v-model:value="form.remark"
            placeholder="请输入备注（选填）"
            :rows="3"
            :maxlength="200"
            show-count
          />
        </div>

        <!-- 重点标记 -->
        <div class="form-row form-row--inline">
          <label class="form-label">设为重点关注</label>
          <a-switch v-model:checked="form.keyFocus" />
        </div>
      </div>

      <template #footer>
        <div class="form-footer">
          <span v-if="formError" class="form-error">{{ formError }}</span>
          <div>
            <button class="form-cancel" @click="formVisible = false">取消</button>
            <button class="form-ok" :disabled="!!formError" @click="handleFormSubmit">确定</button>
          </div>
        </div>
      </template>
    </a-modal>

    <!-- 详情弹窗 -->
    <a-modal :open="detailVisible" :width="600" centered title="车辆详情" :footer="null" @cancel="detailVisible = false">
      <template v-if="detailData">
        <div class="detail-body">
          <!-- 照片 -->
          <div class="detail-thumb">
            <img :src="detailData.photo" alt="车辆照片" />
            <span v-if="detailData.keyFocus" class="detail-focus-tag">
              <i class="i-ant-design-star-filled" />重点关注
            </span>
          </div>

          <!-- 字段列表 -->
          <ul class="detail-fields">
            <li class="detail-field">
              <span class="detail-field-label">车牌号</span>
              <span class="detail-field-value detail-field-value--plate">{{ detailData.plate }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field-label">车型</span>
              <span class="detail-field-value">{{ detailData.vehicleType }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field-label">所属单位</span>
              <span class="detail-field-value">{{ detailData.unit }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field-label">驾驶员</span>
              <span class="detail-field-value">{{ detailData.driver || '—' }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field-label">联系电话</span>
              <span class="detail-field-value">{{ detailData.phone || '—' }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field-label">创建时间</span>
              <span class="detail-field-value">{{ detailData.createdAt }}</span>
            </li>
            <li class="detail-field" v-if="detailData.remark">
              <span class="detail-field-label">备注</span>
              <span class="detail-field-value">{{ detailData.remark }}</span>
            </li>
          </ul>

          <!-- 操作按钮 -->
          <div class="detail-actions">
            <button class="detail-edit-btn" @click="detailVisible = false; openEdit(detailData!)">
              <i class="i-ant-design-edit-outlined" />编辑
            </button>
            <button class="detail-delete-btn" @click="detailVisible = false; onDelete(detailData!.id)">
              <i class="i-ant-design-delete-outlined" />删除
            </button>
          </div>
        </div>
      </template>
    </a-modal>

    <!-- 删除确认 -->
    <a-modal
      v-model:open="deleteVisible"
      :width="400"
      centered
      title="确认删除"
      ok-text="删除"
      cancel-text="取消"
      ok-type="danger"
      @ok="confirmDelete"
    >
      <p class="delete-tip">
        <i class="i-ant-design-exclamation-circle-filled warn-icon" />
        <span>确定要删除该车辆档案吗？删除后无法恢复。</span>
      </p>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.vp-page {
  height: 100%;
  background: transparent;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

/* ===== 工具栏 ===== */
.vp-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.vp-focus-select {
  width: 140px;
  flex-shrink: 0;

  :deep(.ant-select-selector) {
    border-radius: 6px !important;
    border-color: rgb(235, 237, 240) !important;
    height: 38px;
  }
}

.vp-search {
  position: relative;
  flex: 1;
  max-width: 420px;

  .vp-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: $text-muted;
    z-index: 1;
  }

  .vp-search-input {
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

    &::placeholder { color: $text-muted; }
    &:focus { border-color: $color-primary; }
  }
}

.vp-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.vp-count {
  font-size: 13px;
  color: $text-tertiary;
}

.vp-view-switch {
  display: flex;
  border: 1px solid rgb(235, 237, 240);
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.vp-view-btn {
  width: 34px;
  height: 32px;
  border: none;
  background: transparent;
  color: $text-tertiary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  i { font-size: 16px; }

  &.active {
    background: $color-primary-bg;
    color: $color-primary;
  }
}

.vp-add-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 14px;
  border: none;
  border-radius: 6px;
  background: $color-primary;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.2s;

  &:hover { background: $color-primary-hover; }
  i { font-size: 14px; }
}

/* ===== 内容区 ===== */
.vp-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* 卡片网格 */
.vp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

/* ===== 卡片 ===== */
.vcard {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;
  position: relative;

  &:hover {
    border-color: $color-primary;
    box-shadow: 0 2px 12px rgba(110, 75, 255, 0.12);

    .vcard__delete { opacity: 1; }
  }
}

.vcard__media {
  position: relative;
  aspect-ratio: 4 / 3;
  background: #f0f0f0;
  overflow: hidden;

  .vcard__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.vcard__focus {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(250, 140, 22, 0.92);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  backdrop-filter: blur(2px);

  i { font-size: 11px; }
}

.vcard__plate-badge {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 21, 136, 0.85);
  color: #fff;
  font-size: 12px;
  font-weight: 500;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.5px;
}

.vcard__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px 12px;
}

.vcard__name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.vcard__plate {
  font-size: 15px;
  font-weight: 600;
  color: $text-base;
  font-family: 'Courier New', monospace;
  letter-spacing: 0.3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vcard__star {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 2px;
  color: $text-muted;
  transition: color 0.15s, transform 0.15s;

  i { font-size: 18px; }

  &:hover { transform: scale(1.15); }
  &.active { color: #fa8c16; }
}

.vcard__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vcard__meta-line {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: $text-tertiary;
  overflow: hidden;

  i { font-size: 12px; flex-shrink: 0; color: $text-muted; }
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.vcard__delete {
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: $text-muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 0.15s;

  i { font-size: 14px; }

  &:hover {
    background: #fff1f0;
    color: #ff4d4f;
  }
}

/* ===== 列表视图 ===== */
.vp-list-wrap {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
}

.vp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.vp-table thead {
  background: #fafbfc;

  th {
    text-align: left;
    padding: 12px 14px;
    font-weight: 600;
    color: $text-secondary;
    border-bottom: 1px solid $border-color-card;
    white-space: nowrap;
  }
}

.vp-row {
  cursor: pointer;
  transition: background 0.15s;

  &:hover { background: #faf9ff; }

  td {
    padding: 10px 14px;
    border-bottom: 1px solid $border-color-card;
    color: $text-base;
    vertical-align: middle;
  }

  &:last-child td { border-bottom: none; }
}

.col-photo { width: 56px; }
.col-plate { font-weight: 600; font-family: 'Courier New', monospace; letter-spacing: 0.3px; }
.col-type { color: $color-primary; font-weight: 500; }
.col-unit {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: $text-tertiary;
}
.col-driver { white-space: nowrap; }
.col-phone { white-space: nowrap; color: $text-tertiary; }
.col-tag { width: 110px; }
.col-op { width: 160px; white-space: nowrap; }

.vp-photo-sm {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  background: #f0f0f0;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.vp-tag-focus {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(250, 140, 22, 0.12);
  color: #fa8c16;
  font-size: 11px;
  font-weight: 500;

  i { font-size: 11px; }
}

.vp-tag-none { color: $text-muted; }

.vp-row-detail {
  border: 1px solid $border-color-light;
  background: #fff;
  color: $text-secondary;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  vertical-align: middle;
  transition: all 0.15s;

  &:hover {
    color: $color-primary;
    border-color: $color-primary;
  }
}

.vp-row-star {
  border: none;
  background: transparent;
  cursor: pointer;
  color: $text-muted;
  padding: 2px 4px;
  vertical-align: middle;

  i { font-size: 16px; }
  &.active { color: #fa8c16; }
}

.vp-row-delete {
  border: 1px solid #ffccc7;
  background: #fff1f0;
  color: #ff4d4f;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 4px;
  vertical-align: middle;
  transition: all 0.15s;

  &:hover {
    background: #ff4d4f;
    color: #fff;
    border-color: #ff4d4f;
  }
}

.vp-empty, .vp-empty-row {
  text-align: center;
  padding: 60px 0;
  color: $text-muted;
}

/* ===== 新增/编辑弹窗 ===== */
.form-body {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 8px 4px 4px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &--inline {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;

    .form-label { margin-bottom: 0; }
  }
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: $text-base;
  display: flex;
  align-items: center;
  gap: 2px;
}

.form-label-hint {
  font-size: 12px;
  font-weight: 400;
  color: $text-muted;
}

.req {
  color: #ff4d4f;
  margin-right: 2px;
}

.form-faces {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.form-face-item {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid $border-color-card;
  background: #f0f0f0;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.form-face-del {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  i { font-size: 12px; }
}

.form-face-upload {
  width: 96px;
  height: 96px;
  border: 1px dashed $border-color-input;
  border-radius: 8px;
  background: #fafbfc;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: $text-tertiary;
  transition: all 0.15s;

  i { font-size: 22px; }
  span { font-size: 12px; }

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
    background: $color-primary-bg;
  }
}

.form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-error {
  font-size: 12px;
  color: #ff4d4f;
}

.form-cancel,
.form-ok {
  height: 32px;
  padding: 0 18px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  margin-left: 8px;
  transition: all 0.15s;
}

.form-cancel {
  border: 1px solid $border-color-light;
  background: #fff;
  color: $text-secondary;

  &:hover { color: $color-primary; border-color: $color-primary; }
}

.form-ok {
  border: none;
  background: $color-primary;
  color: #fff;

  &:hover:not(:disabled) { background: $color-primary-hover; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

/* ===== 详情弹窗 ===== */
.detail-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px;
}

.detail-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  overflow: hidden;
  background: #1a1a2e;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.detail-focus-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 3px 10px;
  border-radius: 4px;
  background: rgba(250, 140, 22, 0.92);
  color: #fff;
  font-size: 12px;
  font-weight: 500;

  i { font-size: 12px; }
}

.detail-fields {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  overflow: hidden;
}

.detail-field {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 10px 14px;
  border-bottom: 1px solid $border-color-card;

  &:last-child { border-bottom: none; }

  &-label {
    width: 80px;
    flex-shrink: 0;
    font-size: 13px;
    color: $text-muted;
  }

  &-value {
    flex: 1;
    font-size: 13px;
    color: $text-base;
    word-break: break-all;

    &--plate {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      letter-spacing: 0.5px;
    }
  }
}

.detail-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.detail-edit-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 34px;
  padding: 0 16px;
  border: 1px solid $color-primary;
  border-radius: 6px;
  background: #fff;
  color: $color-primary;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  i { font-size: 14px; }

  &:hover {
    background: $color-primary;
    color: #fff;
  }
}

.detail-delete-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 34px;
  padding: 0 16px;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  background: #fff1f0;
  color: #ff4d4f;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  i { font-size: 14px; }

  &:hover {
    background: #ff4d4f;
    color: #fff;
    border-color: #ff4d4f;
  }
}

/* 删除确认 */
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
