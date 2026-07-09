<script setup lang="ts">
/**
 * 临时轨迹跟踪 - 列表页
 * 工具栏：搜索 + 视图切换（卡片/列表）+ 新增
 * 卡片视图：网格展示人脸图 + 名称 + 跟踪状态 + 最后出现
 * 列表视图：表格
 * 点击进入详情（左基本信息 + 右出现事件列表）
 */
import { useRouter } from 'vue-router'
import { type TrackedPerson } from './person-track.mock'
import { usePersonTrackStore } from '@/stores/person-track'

const router = useRouter()
const trackStore = usePersonTrackStore()

const persons = computed(() => trackStore.persons)

// 搜索
const searchKey = ref('')
// 状态筛选：all / tracking / ended
const statusFilter = ref<'all' | 'tracking' | 'ended'>('all')

const filtered = computed(() => {
  let list = persons.value
  if (statusFilter.value !== 'all') {
    list = list.filter(p => p.status === statusFilter.value)
  }
  if (!searchKey.value.trim()) return list
  const k = searchKey.value.trim().toLowerCase()
  return list.filter(p =>
    p.name.toLowerCase().includes(k) ||
    p.reason.toLowerCase().includes(k) ||
    p.lastSeenCamera.toLowerCase().includes(k)
  )
})

// 视图模式
const viewMode = ref<'card' | 'list'>('card')

// 新增弹窗
const addVisible = ref(false)
const addForm = reactive({
  name: '',
  reason: '',
  gender: '男' as '男' | '女' | '未知',
  ageRange: '',
  files: [] as { name: string; url: string }[]
})
const fileInput = ref<HTMLInputElement | null>(null)
const addSubmitting = ref(false)

function openAdd() {
  addForm.name = ''
  addForm.reason = ''
  addForm.gender = '男'
  addForm.ageRange = ''
  addForm.files = []
  addVisible.value = true
}

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  Array.from(input.files).forEach(f => {
    const url = URL.createObjectURL(f)
    addForm.files.push({ name: f.name, url })
  })
  input.value = ''
}

function removeFile(idx: number) {
  URL.revokeObjectURL(addForm.files[idx].url)
  addForm.files.splice(idx, 1)
}

const addError = computed(() => {
  if (!addForm.name.trim()) return '请输入人员名称'
  if (addForm.files.length === 0) return '请至少上传一张人脸图片'
  return ''
})

function submitAdd() {
  if (addError.value) return
  addSubmitting.value = true
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mi = String(now.getMinutes()).padStart(2, '0')
  const newPerson: TrackedPerson = {
    id: `pt-new-${Date.now()}`,
    name: addForm.name.trim(),
    faces: addForm.files.map(f => f.url),
    faceBoxes: [],
    gender: addForm.gender,
    ageRange: addForm.ageRange.trim() || '未知',
    status: 'tracking',
    reason: addForm.reason.trim() || '手动添加跟踪',
    startedAt: `${mm}-${dd} ${hh}:${mi}`,
    endedAt: '',
    lastSeenAt: `${mm}-${dd} ${hh}:${mi}`,
    lastSeenCamera: '—',
    lastSeenArea: '—',
    eventCount: 0
  }
  trackStore.addPerson(newPerson)
  addSubmitting.value = false
  addVisible.value = false
}

function onDetail(id: string) {
  router.push(`/image-search/person-track/${id}`)
}
</script>

<template>
  <div class="pt-page">
    <!-- 工具栏 -->
    <header class="pt-toolbar">
      <div class="pt-search">
        <i class="i-ant-design-search-outlined pt-search-icon" />
        <input
          v-model="searchKey"
          class="pt-search-input"
          placeholder="搜索人员名称、原因或摄像头"
        />
      </div>

      <!-- 状态筛选 -->
      <div class="pt-status-filter">
        <button
          v-for="opt in [
            { k: 'all', label: '全部' },
            { k: 'tracking', label: '跟踪中' },
            { k: 'ended', label: '已结束' }
          ]"
          :key="opt.k"
          class="pt-status-btn"
          :class="{ active: statusFilter === opt.k }"
          @click="statusFilter = opt.k as 'all' | 'tracking' | 'ended'"
        >
          {{ opt.label }}
        </button>
      </div>

      <div class="pt-toolbar-right">
        <span class="pt-count">共 {{ filtered.length }} 人</span>
        <div class="pt-view-switch">
          <button
            class="pt-view-btn"
            :class="{ active: viewMode === 'card' }"
            title="卡片视图"
            @click="viewMode = 'card'"
          >
            <i class="i-ant-design-appstore-outlined" />
          </button>
          <button
            class="pt-view-btn"
            :class="{ active: viewMode === 'list' }"
            title="列表视图"
            @click="viewMode = 'list'"
          >
            <i class="i-ant-design-unordered-list-outlined" />
          </button>
        </div>
        <button class="pt-add-btn" @click="openAdd">
          <i class="i-ant-design-plus-outlined" />新增跟踪
        </button>
      </div>
    </header>

    <!-- 内容区 -->
    <div class="pt-content">
      <!-- 卡片视图 -->
      <div v-if="viewMode === 'card'" class="pt-grid">
        <article
          v-for="p in filtered"
          :key="p.id"
          class="ptcard"
          @click="onDetail(p.id)"
        >
          <div class="ptcard__media">
            <img :src="p.faces[0]" class="ptcard__img" alt="人脸" />
            <div
              v-for="(b, i) in p.faceBoxes"
              :key="i"
              class="ptcard__bbox"
              :style="{ left: b.x + '%', top: b.y + '%', width: b.w + '%', height: b.h + '%' }"
            />
            <span class="ptcard__status" :class="p.status">
              <i :class="p.status === 'tracking' ? 'i-ant-design-eye-filled' : 'i-ant-design-check-circle-outlined'" />
              {{ p.status === 'tracking' ? '跟踪中' : '已结束' }}
            </span>
          </div>
          <div class="ptcard__body">
            <div class="ptcard__name">{{ p.name }}</div>
            <div class="ptcard__attrs">
              <span>{{ p.gender }}</span>
              <span class="ptcard__sep">·</span>
              <span>{{ p.ageRange }}岁</span>
            </div>
            <div class="ptcard__foot">
              <div class="ptcard__last-line">
                <i class="i-ant-design-play-circle-outlined" />
                <span>开始 {{ p.startedAt }}</span>
              </div>
              <div class="ptcard__last-line">
                <i class="i-ant-design-clock-circle-outlined" />
                <span>最近 {{ p.lastSeenAt }}</span>
              </div>
            </div>
          </div>
        </article>

        <!-- 空态 -->
        <div v-if="filtered.length === 0" class="pt-empty">
          <i class="i-ant-design-inbox-outlined" />
          <p>暂无跟踪人员</p>
        </div>
      </div>

      <!-- 列表视图 -->
      <div v-else class="pt-list-wrap">
        <table class="pt-table">
          <thead>
            <tr>
              <th class="col-face">人脸</th>
              <th class="col-name">名称</th>
              <th class="col-attr">性别/年龄</th>
              <th class="col-status">状态</th>
              <th class="col-start">开始时间</th>
              <th class="col-last">最后出现</th>
              <th class="col-event">事件</th>
              <th class="col-op">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filtered" :key="p.id" class="pt-row" @click="onDetail(p.id)">
              <td class="col-face">
                <div class="pt-face-sm">
                  <img :src="p.faces[0]" alt="人脸" />
                </div>
              </td>
              <td class="col-name">{{ p.name }}</td>
              <td class="col-attr">{{ p.gender }} · {{ p.ageRange }}</td>
              <td class="col-status">
                <span class="pt-status-dot" :class="p.status">
                  {{ p.status === 'tracking' ? '跟踪中' : '已结束' }}
                </span>
              </td>
              <td class="col-start">{{ p.startedAt }}</td>
              <td class="col-last">{{ p.lastSeenAt }}</td>
              <td class="col-event">{{ p.eventCount }} 次</td>
              <td class="col-op">
                <button class="pt-row-detail" @click.stop="onDetail(p.id)">详情</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="8" class="pt-empty">暂无跟踪人员</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新增弹窗 -->
    <a-modal
      :open="addVisible"
      :width="560"
      centered
      title="新增临时跟踪"
      @cancel="addVisible = false"
    >
      <div class="add-form">
        <div class="add-row">
          <label class="add-label">
            <span class="req">*</span>人脸图片
            <span class="add-label-hint">（至少一张，支持多张）</span>
          </label>
          <div class="add-faces">
            <div v-for="(f, i) in addForm.files" :key="i" class="add-face-item">
              <img :src="f.url" alt="人脸" />
              <button class="add-face-del" @click="removeFile(i)">
                <i class="i-ant-design-close-outlined" />
              </button>
            </div>
            <button class="add-face-upload" @click="fileInput?.click()">
              <i class="i-ant-design-plus-outlined" />
              <span>上传图片</span>
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                multiple
                hidden
                @change="onFileChange"
              />
            </button>
          </div>
        </div>

        <div class="add-row">
          <label class="add-label"><span class="req">*</span>人员名称</label>
          <a-input v-model:value="addForm.name" placeholder="如：陌生男-黑衣" allow-clear />
        </div>

        <div class="add-row add-row--2col">
          <div class="add-col">
            <label class="add-label">性别</label>
            <a-select
              v-model:value="addForm.gender"
              :options="[{ value: '男' }, { value: '女' }, { value: '未知' }]"
              style="width: 100%"
            />
          </div>
          <div class="add-col">
            <label class="add-label">年龄段</label>
            <a-input v-model:value="addForm.ageRange" placeholder="如 30-40" />
          </div>
        </div>

        <div class="add-row">
          <label class="add-label">跟踪原因</label>
          <a-textarea
            v-model:value="addForm.reason"
            placeholder="请输入发起跟踪的原因（选填）"
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
            <button class="add-ok" :disabled="!!addError || addSubmitting" @click="submitAdd">
              确定
            </button>
          </div>
        </div>
      </template>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.pt-page {
  height: 100%;
  background: $bg-page;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

/* ===== 工具栏 ===== */
.pt-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.pt-search {
  position: relative;
  width: 280px;

  .pt-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: $text-muted;
    z-index: 1;
  }

  .pt-search-input {
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

.pt-status-filter {
  display: flex;
  border: 1px solid rgb(235, 237, 240);
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.pt-status-btn {
  height: 38px;
  padding: 0 14px;
  border: none;
  background: transparent;
  color: $text-tertiary;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  &.active {
    background: $color-primary-bg;
    color: $color-primary;
  }

  &:hover:not(.active) {
    color: $text-secondary;
  }
}

.pt-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.pt-count {
  font-size: 13px;
  color: $text-tertiary;
}

.pt-view-switch {
  display: flex;
  border: 1px solid rgb(235, 237, 240);
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.pt-view-btn {
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

.pt-add-btn {
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
.pt-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* ===== 卡片网格 ===== */
.pt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

.ptcard {
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
  }
}

.ptcard__media {
  position: relative;
  aspect-ratio: 4 / 3;
  background: #f0f0f0;
  overflow: hidden;

  .ptcard__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.ptcard__bbox {
  position: absolute;
  border: 2px solid rgb(52, 199, 89);
  box-sizing: border-box;
  pointer-events: none;
}

.ptcard__status {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  backdrop-filter: blur(2px);

  i { font-size: 11px; }

  &.tracking {
    background: rgba(110, 75, 255, 0.92);
  }

  &.ended {
    background: rgba(0, 0, 0, 0.5);
  }
}

.ptcard__body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px 12px;
}

.ptcard__name {
  font-size: 15px;
  font-weight: 600;
  color: $text-base;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ptcard__attrs {
  font-size: 12px;
  color: $text-tertiary;

  .ptcard__sep {
    margin: 0 4px;
    color: $border-color-input;
  }
}

.ptcard__foot {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid $border-color-card;
}

.ptcard__last-line {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: $text-tertiary;
  overflow: hidden;

  i { font-size: 12px; flex-shrink: 0; }
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/* 空态 */
.pt-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 0;
  color: $text-muted;

  i { font-size: 36px; opacity: 0.4; }
  p { font-size: 13px; margin: 8px 0 0; }
}

/* ===== 列表视图 ===== */
.pt-list-wrap {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
}

.pt-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.pt-table thead {
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

.pt-row {
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

.col-face { width: 56px; }
.col-name { font-weight: 500; }
.col-attr { color: $text-tertiary; white-space: nowrap; }
.col-status { width: 90px; white-space: nowrap; }
.col-start, .col-last { white-space: nowrap; color: $text-tertiary; }
.col-event { white-space: nowrap; color: $text-tertiary; }
.col-op { width: 80px; }

.pt-row-detail {
  border: 1px solid $border-color-light;
  background: #fff;
  color: $text-secondary;
  font-size: 12px;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  &:hover {
    color: $color-primary;
    border-color: $color-primary;
  }
}

.pt-face-sm {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  overflow: hidden;
  background: #f0f0f0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.pt-status-dot {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
  }

  &.tracking {
    color: $color-primary;
    background: $color-primary-bg;
  }

  &.ended {
    color: $text-muted;
    background: $bg-hover;
  }
}

/* ===== 新增弹窗（复用人员档案样式） ===== */
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

  &--2col {
    flex-direction: row;
    gap: 16px;

    .add-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
  }
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

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
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
</style>
