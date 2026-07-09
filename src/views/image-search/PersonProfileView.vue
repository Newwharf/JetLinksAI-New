<script setup lang="ts">
/**
 * 人员档案 - 列表页
 * 工具栏：搜索 + 视图切换（卡片/列表）+ 新增
 * 卡片视图：网格展示人脸图 + 名称 + 最后出现
 * 列表视图：表格，人脸图小尺寸
 * 新增弹窗：上传人脸图（多张，至少一张）+ 名称 + 备注 + 重点标记
 */
import { useRouter } from 'vue-router'
import PersonCard from './PersonCard.vue'
import PersonProfileAddModal from './PersonProfileAddModal.vue'
import { type PersonProfile } from './person-profile.mock'
import { usePersonProfileStore } from '@/stores/person-profile'

const router = useRouter()
const profileStore = usePersonProfileStore()

// 人员档案（store 持有，跨页面共享）
const profiles = computed(() => profileStore.profiles)

// 搜索
const searchKey = ref('')

// 是否重点关注筛选：all | focus | normal
const focusFilter = ref<'all' | 'focus' | 'normal'>('all')
const focusOptions = [
  { value: 'all', label: '全部人员' },
  { value: 'focus', label: '仅重点关注' },
  { value: 'normal', label: '仅普通人员' }
]

// 视图模式：card | list
const viewMode = ref<'card' | 'list'>('card')

// 过滤后列表
const filtered = computed(() => {
  let list = profiles.value
  // 关注筛选
  if (focusFilter.value === 'focus') list = list.filter(p => p.keyFocus)
  else if (focusFilter.value === 'normal') list = list.filter(p => !p.keyFocus)
  // 关键词搜索
  if (!searchKey.value.trim()) return list
  const k = searchKey.value.trim().toLowerCase()
  return list.filter(p =>
    p.name.toLowerCase().includes(k) ||
    p.remark.toLowerCase().includes(k) ||
    p.lastSeenCamera.toLowerCase().includes(k)
  )
})

// 新增弹窗
const addVisible = ref(false)

function openAdd() {
  addVisible.value = true
}

function handleSubmitAdd(data: Omit<PersonProfile, 'id' | 'createdAt' | 'lastSeenAt' | 'lastSeenCamera' | 'lastSeenArea' | 'eventCount' | 'events' | 'weekHeat'>) {
  const newProfile: PersonProfile = {
    id: `pf-new-${Date.now()}`,
    createdAt: '2026-07-08',
    lastSeenAt: '—',
    lastSeenCamera: '—',
    lastSeenArea: '—',
    eventCount: 0,
    events: [],
    weekHeat: Array.from({ length: 7 }, () => new Array(24).fill(0)),
    ...data
  }
  profileStore.addProfile(newProfile)
}

function onToggleFocus(id: string) {
  profileStore.toggleFocus(id)
}

function onDetail(id: string) {
  router.push(`/image-search/person-profile/${id}`)
}
</script>

<template>
  <div class="pp-page">
    <!-- 工具栏 -->
    <header class="pp-toolbar">
      <div class="pp-search">
        <i class="i-ant-design-search-outlined pp-search-icon" />
        <input
          v-model="searchKey"
          class="pp-search-input"
          placeholder="搜索人员名称、备注或摄像头"
        />
      </div>
      <!-- 是否重点关注筛选 -->
      <a-select
        v-model:value="focusFilter"
        class="pp-focus-select"
        :options="focusOptions"
      />
      <div class="pp-toolbar-right">
        <span class="pp-count">共 {{ filtered.length }} 人</span>
        <div class="pp-view-switch">
          <button
            class="pp-view-btn"
            :class="{ active: viewMode === 'card' }"
            title="卡片视图"
            @click="viewMode = 'card'"
          >
            <i class="i-ant-design-appstore-outlined" />
          </button>
          <button
            class="pp-view-btn"
            :class="{ active: viewMode === 'list' }"
            title="列表视图"
            @click="viewMode = 'list'"
          >
            <i class="i-ant-design-unordered-list-outlined" />
          </button>
        </div>
        <button class="pp-add-btn" @click="openAdd">
          <i class="i-ant-design-plus-outlined" />新增人员
        </button>
      </div>
    </header>

    <!-- 内容区 -->
    <div class="pp-content">
      <!-- 卡片视图 -->
      <div v-if="viewMode === 'card'" class="pp-grid">
        <PersonCard
          v-for="p in filtered"
          :key="p.id"
          :data="p"
          @detail="onDetail"
          @toggle-focus="onToggleFocus"
        />
      </div>

      <!-- 列表视图 -->
      <div v-else class="pp-list-wrap">
        <table class="pp-table">
          <thead>
            <tr>
              <th class="col-face">人脸</th>
              <th class="col-name">姓名</th>
              <th class="col-remark">备注</th>
              <th class="col-last">最后出现</th>
              <th class="col-cam">摄像头</th>
              <th class="col-tag">重点关注</th>
              <th class="col-op">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in filtered" :key="p.id" class="pp-row" @click="onDetail(p.id)">
              <td class="col-face">
                <div class="pp-face-sm">
                  <img :src="p.faces[0]" alt="人脸" />
                </div>
              </td>
              <td class="col-name">{{ p.name }}</td>
              <td class="col-remark" :title="p.remark">{{ p.remark || '—' }}</td>
              <td class="col-last">{{ p.lastSeenAt }}</td>
              <td class="col-cam" :title="p.lastSeenCamera">{{ p.lastSeenCamera }}</td>
              <td class="col-tag">
                <span v-if="p.keyFocus" class="pp-tag-focus">
                  <i class="i-ant-design-star-filled" />重点关注
                </span>
                <span v-else class="pp-tag-none">—</span>
              </td>
              <td class="col-op">
                <button class="pp-row-star" :class="{ active: p.keyFocus }" @click.stop="onToggleFocus(p.id)">
                  <i :class="p.keyFocus ? 'i-ant-design-star-filled' : 'i-ant-design-star-outlined'" />
                </button>
                <button class="pp-row-detail" @click.stop="onDetail(p.id)">详情</button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="7" class="pp-empty">暂无人员档案</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新增弹窗 -->
    <PersonProfileAddModal v-model:open="addVisible" @submit="handleSubmitAdd" />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.pp-page {
  height: 100%;
  background: $bg-page;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: hidden;
}

/* ===== 工具栏 ===== */
.pp-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.pp-focus-select {
  width: 140px;
  flex-shrink: 0;

  :deep(.ant-select-selector) {
    border-radius: 6px !important;
    border-color: rgb(235, 237, 240) !important;
    height: 38px;
  }
}

.pp-search {
  position: relative;
  flex: 1;
  max-width: 420px;

  .pp-search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: $text-muted;
    z-index: 1;
  }

  .pp-search-input {
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

.pp-toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: auto;
}

.pp-count {
  font-size: 13px;
  color: $text-tertiary;
}

.pp-view-switch {
  display: flex;
  border: 1px solid rgb(235, 237, 240);
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.pp-view-btn {
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

.pp-add-btn {
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
.pp-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* 卡片网格 */
.pp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}

/* ===== 列表视图 ===== */
.pp-list-wrap {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
}

.pp-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.pp-table thead {
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

.pp-row {
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
.col-remark {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: $text-tertiary;
}
.col-tag { width: 110px; }
.col-last { white-space: nowrap; color: $text-tertiary; }
.col-cam {
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: $text-tertiary;
}
.col-op { width: 120px; }

.pp-face-sm {
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

.pp-tag-focus {
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

.pp-tag-none { color: $text-muted; }

.pp-row-star {
  border: none;
  background: transparent;
  cursor: pointer;
  color: $text-muted;
  padding: 2px 4px;
  vertical-align: middle;

  i { font-size: 16px; }
  &.active { color: #fa8c16; }
}

.pp-row-detail {
  border: 1px solid $border-color-light;
  background: #fff;
  color: $text-secondary;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: 4px;
  vertical-align: middle;
  transition: all 0.15s;

  &:hover {
    color: $color-primary;
    border-color: $color-primary;
  }
}

.pp-empty {
  text-align: center;
  padding: 60px 0;
  color: $text-muted;
}

</style>
