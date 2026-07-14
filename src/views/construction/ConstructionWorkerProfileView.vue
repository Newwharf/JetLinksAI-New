<script setup lang="ts">
/**
 * 人员基本档案 — 卡片/列表视图 + 新增弹窗
 * 从工地管理「工人管理」迁移，去掉对 node 的依赖，改为全局数据
 */
import { message } from 'ant-design-vue'
import workerImg1 from '@/assets/construction/worker/1.png'
import workerImg2 from '@/assets/construction/worker/2.png'
import workerImg3 from '@/assets/construction/worker/3.png'
import workerImg4 from '@/assets/construction/worker/4.png'

// ===== 人员数据模型 =====
type UnitType = 'construction' | 'builder' | 'supervisor'

const unitTypeMeta: Record<UnitType, { label: string; color: string; bg: string }> = {
  construction: { label: '建设单位', color: '#6e4bff', bg: 'rgba(110,75,255,0.1)' },
  builder:      { label: '施工单位', color: '#2bb3a3', bg: 'rgba(43,179,163,0.1)' },
  supervisor:   { label: '监理单位', color: '#fa8c16', bg: 'rgba(250,140,22,0.1)' }
}

const unitTypeOptions = [
  { value: 'construction', label: '建设单位' },
  { value: 'builder', label: '施工单位' },
  { value: 'supervisor', label: '监理单位' }
]

interface Worker {
  id: string
  name: string
  role: string         // 岗位
  unitType: UnitType   // 单位类型
  remark: string       // 备注
  photo: string        // 人员照片
  phone: string        // 联系电话
  expiringCount: number // 即将过期的资质证件数（0 = 正常）
  createdAt: string
}

// 全局人员列表
const workers = ref<Worker[]>([
  { id: 'wk-1', name: '张建国', role: '钢筋工',  unitType: 'builder',     remark: '班组组长',   photo: workerImg1, phone: '138****6688', expiringCount: 2, createdAt: '2026-06-01' },
  { id: 'wk-2', name: '李志强', role: '架子工',  unitType: 'builder',     remark: '',           photo: workerImg2, phone: '139****2233', expiringCount: 0, createdAt: '2026-06-05' },
  { id: 'wk-3', name: '王德发', role: '电焊工',  unitType: 'builder',     remark: '持证焊工',   photo: workerImg3, phone: '137****5566', expiringCount: 1, createdAt: '2026-06-10' },
  { id: 'wk-4', name: '刘明远', role: '塔吊工',  unitType: 'builder',     remark: '',           photo: workerImg4, phone: '136****7788', expiringCount: 0, createdAt: '2026-06-12' },
  { id: 'wk-5', name: '陈永福', role: '泥瓦工',  unitType: 'builder',     remark: '',           photo: workerImg1, phone: '135****1100', expiringCount: 3, createdAt: '2026-06-15' },
  { id: 'wk-6', name: '赵铁柱', role: '水电工',  unitType: 'builder',     remark: '兼职安全员', photo: workerImg2, phone: '133****4422', expiringCount: 0, createdAt: '2026-06-18' },
  { id: 'wk-7', name: '孙伟',   role: '信号工',  unitType: 'builder',     remark: '',           photo: workerImg3, phone: '138****3344', expiringCount: 0, createdAt: '2026-06-20' },
  { id: 'wk-8', name: '周强',   role: '测量员',  unitType: 'builder',     remark: '高级测量工', photo: workerImg4, phone: '139****8899', expiringCount: 1, createdAt: '2026-06-22' },
  { id: 'wk-9', name: '李瀚',   role: '项目经理', unitType: 'construction', remark: '甲方代表',  photo: workerImg1, phone: '139****0011', expiringCount: 0, createdAt: '2026-06-03' },
  { id: 'wk-10', name: '马涛',  role: '项目总监', unitType: 'supervisor',  remark: '总监代表',  photo: workerImg2, phone: '137****2255', expiringCount: 0, createdAt: '2026-06-08' },
  { id: 'wk-11', name: '蒋雷',  role: '监理工程师', unitType: 'supervisor', remark: '安全监理',  photo: workerImg3, phone: '135****6677', expiringCount: 1, createdAt: '2026-06-14' },
  { id: 'wk-12', name: '秦波',  role: '造价工程师', unitType: 'construction', remark: '',         photo: workerImg4, phone: '138****8899', expiringCount: 0, createdAt: '2026-06-19' }
])

// ===== 搜索 =====
const searchKey = ref('')

// ===== 视图模式 =====
const viewMode = ref<'card' | 'list'>('card')

// 过滤
const filtered = computed(() => {
  let list = workers.value
  if (!searchKey.value.trim()) return list
  const k = searchKey.value.trim().toLowerCase()
  return list.filter(w =>
    w.name.toLowerCase().includes(k) ||
    w.role.toLowerCase().includes(k) ||
    w.remark.toLowerCase().includes(k)
  )
})

// ===== 新增弹窗 =====
const addVisible = ref(false)
const addForm = reactive({
  name: '',
  role: '',
  unitType: 'builder' as UnitType,
  remark: '',
  phone: '',
  files: [] as { name: string; url: string }[]
})
const fileInput = ref<HTMLInputElement | null>(null)

function openAdd() {
  addForm.name = ''
  addForm.role = ''
  addForm.unitType = 'builder'
  addForm.remark = ''
  addForm.phone = ''
  addForm.files = []
  addVisible.value = true
}

const addError = computed(() => {
  if (!addForm.name.trim()) return '请输入人员名称'
  if (!addForm.role.trim()) return '请输入岗位'
  if (addForm.files.length === 0) return '请至少上传一张人员照片'
  return ''
})

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  Array.from(input.files).forEach(f => {
    addForm.files.push({ name: f.name, url: URL.createObjectURL(f) })
  })
  input.value = ''
}

function removeFile(idx: number) {
  URL.revokeObjectURL(addForm.files[idx].url)
  addForm.files.splice(idx, 1)
}

function handleAddSubmit() {
  if (addError.value) return
  const newWorker: Worker = {
    id: `wk-${Date.now()}`,
    name: addForm.name.trim(),
    role: addForm.role.trim(),
    unitType: addForm.unitType,
    remark: addForm.remark.trim(),
    phone: addForm.phone.trim(),
    photo: addForm.files[0].url,
    expiringCount: 0,
    createdAt: new Date().toISOString().slice(0, 10)
  }
  workers.value.unshift(newWorker)
  addVisible.value = false
  message.success('人员添加成功')
}

// 删除
const deleteId = ref<string>('')
const deleteVisible = ref(false)

function onDelete(id: string) {
  deleteId.value = id
  deleteVisible.value = true
}

function confirmDelete() {
  workers.value = workers.value.filter(w => w.id !== deleteId.value)
  deleteVisible.value = false
  message.success('已删除')
}

onBeforeUnmount(() => {
  addForm.files.forEach(f => URL.revokeObjectURL(f.url))
})
</script>

<template>
  <div class="wm-page">
    <!-- 工具栏 -->
    <header class="wm-toolbar">
      <div class="wm-search">
        <i class="i-ant-design-search-outlined wm-search-icon" />
        <input
          v-model="searchKey"
          class="wm-search-input"
          placeholder="搜索人员名称、岗位或备注"
        />
      </div>
      <div class="wm-toolbar-right">
        <span class="wm-count">共 {{ filtered.length }} 人</span>
        <div class="wm-view-switch">
          <button class="wm-view-btn" :class="{ active: viewMode === 'card' }" title="卡片视图" @click="viewMode = 'card'">
            <i class="i-ant-design-appstore-outlined" />
          </button>
          <button class="wm-view-btn" :class="{ active: viewMode === 'list' }" title="列表视图" @click="viewMode = 'list'">
            <i class="i-ant-design-unordered-list-outlined" />
          </button>
        </div>
        <button class="wm-add-btn" @click="openAdd">
          <i class="i-ant-design-plus-outlined" />新增人员
        </button>
      </div>
    </header>

    <!-- 内容区 -->
    <div class="wm-content">
      <!-- 卡片视图 -->
      <div v-if="viewMode === 'card'" class="wm-grid">
        <article v-for="w in filtered" :key="w.id" class="wcard">
          <div class="wcard__media">
            <img :src="w.photo" class="wcard__img" alt="人员照片" />
          </div>
          <div class="wcard__body">
            <div class="wcard__name-row">
              <span class="wcard__name">{{ w.name }}</span>
            </div>
            <div class="wcard__meta">
              <div class="wcard__meta-line">
                <i class="i-ant-design-bank-outlined" />
                <span>{{ unitTypeMeta[w.unitType].label }}</span>
              </div>
              <div class="wcard__meta-line">
                <i class="i-ant-design-tool-outlined" />
                <span>{{ w.role }}</span>
              </div>
              <div class="wcard__meta-line" v-if="w.phone">
                <i class="i-ant-design-phone-outlined" />
                <span>{{ w.phone }}</span>
              </div>
              <div class="wcard__meta-line">
                <i class="i-ant-design-safety-certificate-outlined" />
                <span v-if="w.expiringCount > 0" class="wcard__expiring">{{ w.expiringCount }} 个证件即将过期</span>
                <span v-else class="wcard__normal">正常</span>
              </div>
            </div>
            <button class="wcard__delete" @click.stop="onDelete(w.id)">
              <i class="i-ant-design-delete-outlined" />
            </button>
          </div>
        </article>
        <div v-if="filtered.length === 0" class="wm-empty">暂无人员数据</div>
      </div>

      <!-- 列表视图 -->
      <div v-else class="wm-list-wrap">
        <table class="wm-table">
          <thead>
            <tr>
              <th class="col-photo">照片</th>
              <th class="col-name">姓名</th>
              <th class="col-unit">单位</th>
              <th class="col-role">岗位</th>
              <th class="col-phone">联系电话</th>
              <th class="col-remark">备注</th>
              <th class="col-cert">资质证件动态</th>
              <th class="col-op">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in filtered" :key="w.id" class="wm-row">
              <td class="col-photo">
                <div class="wm-photo-sm">
                  <img :src="w.photo" alt="人员照片" />
                </div>
              </td>
              <td class="col-name">{{ w.name }}</td>
              <td class="col-unit">
                <span class="wm-tag-unit" :style="{ color: unitTypeMeta[w.unitType].color, background: unitTypeMeta[w.unitType].bg }">{{ unitTypeMeta[w.unitType].label }}</span>
              </td>
              <td class="col-role">{{ w.role }}</td>
              <td class="col-phone">{{ w.phone || '—' }}</td>
              <td class="col-remark" :title="w.remark">{{ w.remark || '—' }}</td>
              <td class="col-cert">
                <span v-if="w.expiringCount > 0" class="wm-tag-expiring">
                  <i class="i-ant-design-clock-circle-outlined" />{{ w.expiringCount }} 个即将过期
                </span>
                <span v-else class="wm-tag-normal">正常</span>
              </td>
              <td class="col-op">
                <button class="wm-row-delete" @click.stop="onDelete(w.id)">删除</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="8" class="wm-empty-row">暂无人员数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新增弹窗 -->
    <a-modal :open="addVisible" :width="560" centered title="新增人员" @cancel="addVisible = false">
      <div class="add-form">
        <!-- 照片上传 -->
        <div class="add-row">
          <label class="add-label">
            <span class="req">*</span>人员照片
            <span class="add-label-hint">（至少一张，支持多张）</span>
          </label>
          <div class="add-faces">
            <div v-for="(f, i) in addForm.files" :key="i" class="add-face-item">
              <img :src="f.url" alt="人员照片" />
              <button class="add-face-del" @click="removeFile(i)">
                <i class="i-ant-design-close-outlined" />
              </button>
            </div>
            <button class="add-face-upload" @click="fileInput?.click()">
              <i class="i-ant-design-plus-outlined" />
              <span>上传图片</span>
              <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onFileChange" />
            </button>
          </div>
        </div>

        <!-- 人员名称 -->
        <div class="add-row">
          <label class="add-label"><span class="req">*</span>人员名称</label>
          <a-input v-model:value="addForm.name" placeholder="请输入人员名称" allow-clear />
        </div>

        <!-- 单位类型 -->
        <div class="add-row">
          <label class="add-label"><span class="req">*</span>所属单位</label>
          <a-select v-model:value="addForm.unitType" style="width:100%">
            <a-select-option v-for="o in unitTypeOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
          </a-select>
        </div>

        <!-- 岗位 -->
        <div class="add-row">
          <label class="add-label"><span class="req">*</span>岗位</label>
          <a-input v-model:value="addForm.role" placeholder="请输入岗位（如钢筋工、架子工、电焊工等）" allow-clear />
        </div>

        <!-- 联系电话 -->
        <div class="add-row">
          <label class="add-label">联系电话</label>
          <a-input v-model:value="addForm.phone" placeholder="请输入联系电话（选填）" allow-clear />
        </div>

        <!-- 备注 -->
        <div class="add-row">
          <label class="add-label">备注说明</label>
          <a-textarea
            v-model:value="addForm.remark"
            placeholder="请输入备注（选填）"
            :rows="3"
            :maxlength="200"
            show-count
          />
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
        <span>确定要删除该人员档案吗？删除后无法恢复。</span>
      </p>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.wm-page {
  height: 100%;
  background: transparent;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

/* ===== 工具栏 ===== */
.wm-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.wm-search {
  position: relative;
  flex: 1;
  max-width: 420px;

  .wm-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: $text-muted;
    z-index: 1;
  }

  .wm-search-input {
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

.wm-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.wm-count {
  font-size: 13px;
  color: $text-tertiary;
}

.wm-view-switch {
  display: flex;
  border: 1px solid rgb(235, 237, 240);
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.wm-view-btn {
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

.wm-add-btn {
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
.wm-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* 卡片网格 */
.wm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

/* ===== 卡片 ===== */
.wcard {
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

    .wcard__delete { opacity: 1; }
  }
}

.wcard__media {
  position: relative;
  aspect-ratio: 4 / 3;
  background: #f0f0f0;
  overflow: hidden;

  .wcard__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.wcard__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px 12px;
}

.wcard__name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.wcard__name {
  font-size: 15px;
  font-weight: 600;
  color: $text-base;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wcard__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.wcard__meta-line {
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

  .wcard__expiring { color: #fa8c16; font-weight: 500; }
  .wcard__normal { color: #2bb3a3; font-weight: 500; }
}

.wcard__delete {
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
.wm-list-wrap {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
}

.wm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.wm-table thead {
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

.wm-row {
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
.col-name { font-weight: 500; }
.col-unit { width: 90px; }
.col-role { color: $color-primary; font-weight: 500; }
.col-phone { white-space: nowrap; color: $text-tertiary; }
.col-remark {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: $text-tertiary;
}
.col-cert { width: 140px; }
.col-op { width: 80px; }

.wm-photo-sm {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  background: #f0f0f0;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.wm-tag-expiring {
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

.wm-tag-normal {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(43, 179, 163, 0.1);
  color: #2bb3a3;
  font-size: 11px;
  font-weight: 500;
}

.wm-tag-unit {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
}

.wm-row-delete {
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

.wm-empty, .wm-empty-row {
  text-align: center;
  padding: 60px 0;
  color: $text-muted;
}

/* ===== 新增弹窗 ===== */
.add-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 8px 4px 4px;
}

.add-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.add-label {
  font-size: 13px;
  font-weight: 500;
  color: $text-base;
  display: flex;
  align-items: center;
  gap: 2px;
}

.add-label-hint {
  font-size: 12px;
  font-weight: 400;
  color: $text-muted;
}

.req {
  color: #ff4d4f;
  margin-right: 2px;
}

.add-faces {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.add-face-item {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid $border-color-card;
  background: #f0f0f0;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.add-face-del {
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

.add-face-upload {
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
