<script setup lang="ts">
/**
 * 塔机司机管理 — 卡片/列表视图 + 新增弹窗 + 详情弹窗
 */
import { message } from 'ant-design-vue'
import {
  drivers,
  driverStatusMeta,
  licenseTypeMeta,
  type TowerDriver,
  type DriverStatus,
  type LicenseType
} from './tower.mock'

// ===== 搜索 =====
const searchKey = ref('')
const statusFilter = ref<DriverStatus | 'all'>('all')

// ===== 视图模式 =====
const viewMode = ref<'card' | 'list'>('card')

// ===== 星标（仅视觉） =====
const starredIds = ref<Set<string>>(new Set())
function toggleStar(id: string) {
  if (starredIds.value.has(id)) starredIds.value.delete(id)
  else starredIds.value.add(id)
  // 触发响应式更新
  starredIds.value = new Set(starredIds.value)
}

// 过滤
const filtered = computed(() => {
  let list = drivers
  if (statusFilter.value !== 'all') list = list.filter(d => d.status === statusFilter.value)
  const kw = searchKey.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(d =>
      d.name.toLowerCase().includes(kw) ||
      d.phone.toLowerCase().includes(kw) ||
      d.licenseNo.toLowerCase().includes(kw)
    )
  }
  return list
})

// 证件即将到期（90 天内）
function isNearExpiry(certExpiry: string): boolean {
  const expiry = new Date(certExpiry).getTime()
  if (isNaN(expiry)) return false
  const now = new Date('2026-07-13').getTime()
  const days = (expiry - now) / (1000 * 60 * 60 * 24)
  return days >= 0 && days <= 90
}

// 删除确认
const deleteId = ref<string>('')
const deleteVisible = ref(false)
function onDelete(id: string) {
  deleteId.value = id
  deleteVisible.value = true
}
function confirmDelete() {
  const idx = drivers.findIndex(d => d.id === deleteId.value)
  if (idx >= 0) drivers.splice(idx, 1)
  deleteVisible.value = false
  message.success('已删除')
}

// 详情弹窗
const detailVisible = ref(false)
const detailData = ref<TowerDriver | null>(null)
function openDetail(row: TowerDriver) { detailData.value = row; detailVisible.value = true }

// ===== 新增弹窗 =====
const addVisible = ref(false)
const addForm = reactive({
  name: '',
  licenseType: 'tower_crane_operator' as LicenseType,
  licenseNo: '',
  phone: '',
  certExpiry: '',
  siteName: '',
  assignedTower: '',
  faceRegistered: false
})
const addError = computed(() => {
  if (!addForm.name.trim()) return '请输入司机姓名'
  if (!addForm.licenseNo.trim()) return '请输入证书编号'
  return ''
})

function openAdd() {
  addForm.name = ''
  addForm.licenseType = 'tower_crane_operator'
  addForm.licenseNo = ''
  addForm.phone = ''
  addForm.certExpiry = ''
  addForm.siteName = ''
  addForm.assignedTower = ''
  addForm.faceRegistered = false
  addVisible.value = true
}

function handleAddSubmit() {
  if (addError.value) return
  const newDriver: TowerDriver = {
    id: `drv-manual-${Date.now()}`,
    name: addForm.name.trim(),
    phone: addForm.phone.trim(),
    licenseType: addForm.licenseType,
    licenseNo: addForm.licenseNo.trim(),
    certExpiry: addForm.certExpiry || '2027-12-31',
    status: 'active',
    assignedTower: addForm.assignedTower.trim() || '—',
    siteName: addForm.siteName.trim() || '未分配',
    faceRegistered: addForm.faceRegistered,
    workYears: 0,
    todayHours: 0
  }
  drivers.unshift(newDriver)
  addVisible.value = false
  message.success('司机添加成功')
}

// 模板内类型守卫
const _statusMeta = driverStatusMeta
const _licenseMeta = licenseTypeMeta
</script>

<template>
  <div class="td-page">
    <!-- 工具栏 -->
    <header class="td-toolbar">
      <div class="td-search">
        <i class="i-ant-design-search-outlined td-search-icon" />
        <input
          v-model="searchKey"
          class="td-search-input"
          placeholder="搜索姓名、电话或证书编号"
        />
      </div>
      <div class="td-status-filter">
        <a-select v-model:value="statusFilter" style="width: 130px" placeholder="全部状态">
          <a-select-option value="all">全部状态</a-select-option>
          <a-select-option value="active">在岗</a-select-option>
          <a-select-option value="resting">休息</a-select-option>
          <a-select-option value="expired">证件过期</a-select-option>
        </a-select>
      </div>
      <div class="td-toolbar-right">
        <span class="td-count">共 {{ filtered.length }} 人</span>
        <div class="td-view-switch">
          <button class="td-view-btn" :class="{ active: viewMode === 'card' }" title="卡片视图" @click="viewMode = 'card'">
            <i class="i-ant-design-appstore-outlined" />
          </button>
          <button class="td-view-btn" :class="{ active: viewMode === 'list' }" title="列表视图" @click="viewMode = 'list'">
            <i class="i-ant-design-unordered-list-outlined" />
          </button>
        </div>
        <button class="td-add-btn" @click="openAdd">
          <i class="i-ant-design-plus-outlined" />新增司机
        </button>
      </div>
    </header>

    <!-- 内容区 -->
    <div class="td-content">
      <!-- 卡片视图 -->
      <div v-if="viewMode === 'card'" class="td-grid">
        <article v-for="d in filtered" :key="d.id" class="dcard" @click="openDetail(d)">
          <!-- 头像区 -->
          <div class="dcard__media">
            <div class="dcard__photo">
              <i class="i-ant-design-user-outlined" />
            </div>
            <button
              class="dcard__star"
              :class="{ active: starredIds.has(d.id) }"
              @click.stop="toggleStar(d.id)"
              title="重点关注"
            >
              <i :class="starredIds.has(d.id) ? 'i-ant-design-star-filled' : 'i-ant-design-star-outlined'" />
            </button>
            <span
              class="dcard__status-badge"
              :style="{ color: _statusMeta[d.status].color, background: _statusMeta[d.status].color + '18' }"
            >
              {{ _statusMeta[d.status].label }}
            </span>
          </div>

          <!-- 信息区 -->
          <div class="dcard__body">
            <div class="dcard__name-row">
              <span class="dcard__name">{{ d.name }}</span>
              <span
                class="dcard__license-tag"
                :title="_licenseMeta[d.licenseType].label"
              >{{ _licenseMeta[d.licenseType].label }}</span>
            </div>

            <div class="dcard__meta">
              <div class="dcard__meta-line">
                <i class="i-ant-design-build-outlined" />
                <span>{{ d.assignedTower }}</span>
              </div>
              <div class="dcard__meta-line">
                <i class="i-ant-design-environment-outlined" />
                <span>{{ d.siteName }}</span>
              </div>
              <div class="dcard__meta-line">
                <i class="i-ant-design-phone-outlined" />
                <span>{{ d.phone || '—' }}</span>
              </div>
              <div class="dcard__meta-line">
                <i class="i-ant-design-safety-certificate-outlined" />
                <span v-if="d.status === 'expired'" class="dcard__expired">证件已过期</span>
                <span v-else-if="isNearExpiry(d.certExpiry)" class="dcard__expiring">{{ d.certExpiry }} 即将到期</span>
                <span v-else class="dcard__normal">{{ d.certExpiry }}</span>
              </div>
              <div class="dcard__meta-line">
                <i class="i-ant-design-scan-outlined" />
                <span v-if="d.faceRegistered" class="dcard__face-registered">人脸已注册</span>
                <span v-else class="dcard__face-unregistered">未注册人脸</span>
              </div>
            </div>
          </div>

          <!-- 删除按钮 -->
          <button class="dcard__delete" @click.stop="onDelete(d.id)">
            <i class="i-ant-design-delete-outlined" />
          </button>
        </article>
        <div v-if="filtered.length === 0" class="td-empty">暂无司机数据</div>
      </div>

      <!-- 列表视图 -->
      <div v-else class="td-list-wrap">
        <table class="td-table">
          <thead>
            <tr>
              <th class="col-name">姓名</th>
              <th class="col-license">证件类型</th>
              <th class="col-license-no">证书编号</th>
              <th class="col-status">状态</th>
              <th class="col-tower">分配塔机</th>
              <th class="col-site">工地</th>
              <th class="col-phone">联系电话</th>
              <th class="col-face">人脸注册</th>
              <th class="col-expiry">证件到期</th>
              <th class="col-op">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="d in filtered" :key="d.id" class="td-row" @click="openDetail(d)">
              <td class="col-name">{{ d.name }}</td>
              <td class="col-license">{{ _licenseMeta[d.licenseType].label }}</td>
              <td class="col-license-no">{{ d.licenseNo }}</td>
              <td class="col-status">
                <span class="td-tag-status" :style="{ color: _statusMeta[d.status].color, background: _statusMeta[d.status].color + '18' }">{{ _statusMeta[d.status].label }}</span>
              </td>
              <td class="col-tower">{{ d.assignedTower }}</td>
              <td class="col-site" :title="d.siteName">{{ d.siteName }}</td>
              <td class="col-phone">{{ d.phone || '—' }}</td>
              <td class="col-face">
                <span v-if="d.faceRegistered" class="td-tag-yes">是</span>
                <span v-else class="td-tag-no">否</span>
              </td>
              <td class="col-expiry">
                <span v-if="d.status === 'expired'" class="td-tag-expired">{{ d.certExpiry }}</span>
                <span v-else-if="isNearExpiry(d.certExpiry)" class="td-tag-expiring">
                  <i class="i-ant-design-clock-circle-outlined" />{{ d.certExpiry }}
                </span>
                <span v-else>{{ d.certExpiry }}</span>
              </td>
              <td class="col-op" @click.stop>
                <button class="td-row-detail" @click="openDetail(d)">详情</button>
                <button class="td-row-delete" @click="onDelete(d.id)">删除</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="10" class="td-empty-row">暂无司机数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <a-modal v-model:open="detailVisible" :width="600" centered title="司机详情" :footer="null">
      <template v-if="detailData">
        <div class="detail-body">
          <div class="detail-avatar">
            <div class="detail-avatar__icon"><i class="i-ant-design-user-outlined" /></div>
            <div class="detail-avatar__info">
              <strong class="detail-avatar__name">{{ detailData.name }}</strong>
              <span
                class="detail-avatar__status"
                :style="{ color: _statusMeta[detailData.status].color, background: _statusMeta[detailData.status].color + '18' }"
              >{{ _statusMeta[detailData.status].label }}</span>
            </div>
          </div>
          <ul class="detail-fields">
            <li class="detail-field"><span class="df-label">证件类型</span><span class="df-value">{{ _licenseMeta[detailData.licenseType].label }}</span></li>
            <li class="detail-field"><span class="df-label">证书编号</span><span class="df-value">{{ detailData.licenseNo }}</span></li>
            <li class="detail-field"><span class="df-label">证件到期</span><span class="df-value">{{ detailData.certExpiry }}</span></li>
            <li class="detail-field"><span class="df-label">联系电话</span><span class="df-value">{{ detailData.phone || '—' }}</span></li>
            <li class="detail-field"><span class="df-label">分配塔机</span><span class="df-value">{{ detailData.assignedTower }}</span></li>
            <li class="detail-field"><span class="df-label">所属工地</span><span class="df-value">{{ detailData.siteName }}</span></li>
            <li class="detail-field"><span class="df-label">人脸注册</span><span class="df-value">{{ detailData.faceRegistered ? '已注册' : '未注册' }}</span></li>
            <li class="detail-field"><span class="df-label">从业年限</span><span class="df-value">{{ detailData.workYears }} 年</span></li>
            <li class="detail-field"><span class="df-label">今日工时</span><span class="df-value">{{ detailData.todayHours }} 小时</span></li>
          </ul>
        </div>
      </template>
    </a-modal>

    <!-- 新增弹窗 -->
    <a-modal :open="addVisible" :width="560" centered title="新增司机" @cancel="addVisible = false">
      <div class="add-form">
        <div class="add-row">
          <label class="add-label"><span class="req">*</span>司机姓名</label>
          <a-input v-model:value="addForm.name" placeholder="请输入司机姓名" allow-clear />
        </div>
        <div class="add-row">
          <label class="add-label"><span class="req">*</span>证件类型</label>
          <a-select v-model:value="addForm.licenseType" style="width:100%">
            <a-select-option value="tower_crane_operator">塔式起重机司机</a-select-option>
            <a-select-option value="tower_crane_signal">塔式起重机信号工</a-select-option>
          </a-select>
        </div>
        <div class="add-row">
          <label class="add-label"><span class="req">*</span>证书编号</label>
          <a-input v-model:value="addForm.licenseNo" placeholder="请输入证书编号" allow-clear />
        </div>
        <div class="add-row">
          <label class="add-label">联系电话</label>
          <a-input v-model:value="addForm.phone" placeholder="请输入联系电话（选填）" allow-clear />
        </div>
        <div class="add-row">
          <label class="add-label">证件到期日</label>
          <a-input v-model:value="addForm.certExpiry" placeholder="如 2027-12-31（选填）" allow-clear />
        </div>
        <div class="add-row">
          <label class="add-label">所属工地</label>
          <a-input v-model:value="addForm.siteName" placeholder="请输入工地名称（选填）" allow-clear />
        </div>
        <div class="add-row">
          <label class="add-label">分配塔机</label>
          <a-input v-model:value="addForm.assignedTower" placeholder="请输入塔机编号（选填）" allow-clear />
        </div>
        <div class="add-row">
          <label class="add-label">人脸注册</label>
          <a-switch v-model:checked="addForm.faceRegistered" />
        </div>
      </div>
      <template #footer>
        <div class="add-footer">
          <span v-if="addError" class="add-error">{{ addError }}</span>
          <div>
            <button class="add-cancel" @click="addVisible = false">取消</button>
            <button class="add-ok" :disabled="!!addError" @click="handleAddSubmit">确定</button>
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
        <span>确定要删除该司机档案吗？删除后无法恢复。</span>
      </p>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.td-page {
  height: 100%;
  background: transparent;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

/* ===== 工具栏 ===== */
.td-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.td-search {
  position: relative;
  flex: 1;
  max-width: 360px;

  .td-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: $text-muted;
    z-index: 1;
  }

  .td-search-input {
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

.td-status-filter {
  flex-shrink: 0;
  :deep(.ant-select-selector) { border-radius: 6px !important; font-size: 13px; }
}

.td-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.td-count {
  font-size: 13px;
  color: $text-tertiary;
}

.td-view-switch {
  display: flex;
  border: 1px solid rgb(235, 237, 240);
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.td-view-btn {
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

.td-add-btn {
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
.td-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* 卡片网格 */
.td-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

/* ===== 卡片 ===== */
.dcard {
  position: relative;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;

  &:hover {
    border-color: $color-primary;
    box-shadow: 0 2px 12px rgba(110, 75, 255, 0.12);

    .dcard__delete { opacity: 1; }
  }
}

.dcard__media {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px 12px 8px;
  background: #f5f6f8;
}

.dcard__photo {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #e4e7ec;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-muted;

  i { font-size: 28px; }
}

.dcard__star {
  position: absolute;
  top: 8px;
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
  transition: all 0.15s;

  i { font-size: 16px; }

  &:hover { color: #faad14; }

  &.active { color: #faad14; }
}

.dcard__status-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
}

.dcard__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 12px 12px;
}

.dcard__name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.dcard__name {
  font-size: 15px;
  font-weight: 600;
  color: $text-base;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dcard__license-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 4px;
  background: $color-primary-bg;
  color: $color-primary;
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;
  max-width: 90px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dcard__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.dcard__meta-line {
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

  .dcard__expired { color: #ff4d4f; font-weight: 500; }
  .dcard__expiring { color: #fa8c16; font-weight: 500; }
  .dcard__normal { color: $text-tertiary; }
  .dcard__face-registered { color: #2bb3a3; font-weight: 500; }
  .dcard__face-unregistered { color: $text-muted; }
}

.dcard__delete {
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
.td-list-wrap {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
}

.td-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.td-table thead {
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

.td-row {
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

.col-name { font-weight: 500; }
.col-license { white-space: nowrap; }
.col-license-no { white-space: nowrap; color: $text-secondary; }
.col-status { width: 90px; }
.col-tower { white-space: nowrap; color: $color-primary; font-weight: 500; }
.col-site { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: $text-tertiary; }
.col-phone { white-space: nowrap; color: $text-tertiary; }
.col-face { width: 80px; }
.col-expiry { white-space: nowrap; }
.col-op { width: 130px; white-space: nowrap; }

.td-tag-status {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.td-tag-yes {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(43, 179, 163, 0.1);
  color: #2bb3a3;
  font-size: 11px;
  font-weight: 500;
}

.td-tag-no {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(140, 140, 140, 0.1);
  color: #8c8c8c;
  font-size: 11px;
  font-weight: 500;
}

.td-tag-expired {
  color: #ff4d4f;
  font-weight: 500;
}

.td-tag-expiring {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(250, 140, 22, 0.12);
  color: #fa8c16;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;

  i { font-size: 11px; }
}

.td-row-detail {
  border: 1px solid $border-color-light;
  background: #fff;
  color: $color-primary;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  vertical-align: middle;
  transition: all 0.15s;

  &:hover {
    background: $color-primary;
    color: #fff;
    border-color: $color-primary;
  }
}

.td-row-delete {
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

.td-empty, .td-empty-row {
  text-align: center;
  padding: 60px 0;
  color: $text-muted;
}

/* ===== 详情弹窗 ===== */
.detail-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px;
}

.detail-avatar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: #f7f8fa;
  border-radius: 10px;
}

.detail-avatar__icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: #e4e7ec;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-muted;
  flex-shrink: 0;

  i { font-size: 28px; }
}

.detail-avatar__info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-avatar__name {
  font-size: 16px;
  font-weight: 600;
  color: $text-base;
}

.detail-avatar__status {
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  width: fit-content;
}

.detail-fields {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.detail-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  border-bottom: 1px solid $border-color-card;
  border-right: 1px solid $border-color-card;

  &:nth-child(2n) { border-right: none; }

  .df-label { font-size: 12px; color: $text-muted; }
  .df-value { font-size: 13px; color: $text-base; }
}

/* ===== 新增弹窗 ===== */
.add-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 4px 4px;
}

.add-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.add-row:has(.ant-switch) {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.add-label {
  font-size: 13px;
  font-weight: 500;
  color: $text-base;
}

.req {
  color: #ff4d4f;
  margin-right: 2px;
}

.add-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.add-error {
  font-size: 12px;
  color: #ff4d4f;
}

.add-cancel,
.add-ok {
  height: 32px;
  padding: 0 18px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  margin-left: 8px;
  transition: all 0.15s;
}

.add-cancel {
  border: 1px solid $border-color-light;
  background: #fff;
  color: $text-secondary;

  &:hover { color: $color-primary; border-color: $color-primary; }
}

.add-ok {
  border: none;
  background: $color-primary;
  color: #fff;

  &:hover:not(:disabled) { background: $color-primary-hover; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
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
