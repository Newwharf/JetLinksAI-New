<script setup lang="ts">
/**
 * 工地安全 - 历史风险事件
 * 顶部搜索栏（工地树选择 / 事件类型 / 时间 / 状态 / 关键字）+ 事件列表表格 + 分页 + 详情弹窗
 */
import { message } from 'ant-design-vue'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import {
  riskIncidents,
  eventTypeOptions,
  statusMeta,
  resolveMethodMeta,
  type HistoryIncident,
  type ResolveStatus,
  type ResolveMethod
} from './risk-incident.mock'
import {
  regionTree,
  type RegionNode,
  type EventType
} from './posture.mock'

// ===== 搜索条件 =====
const siteIds = ref<string[]>([])        // 工地树多选值（叶子 = siteId）
const eventType = ref<EventType | 'all'>('all')
const timeRange = ref<[dayjs.Dayjs, dayjs.Dayjs]>()
const status = ref<ResolveStatus | 'all'>('all')
const keyword = ref('')

// ===== 工地树：从 regionTree 提取，叶子节点为工地 =====
// 需要构造 a-tree-select 可用的 treeData（省→市→区→工地）
interface TreeDataNode {
  value: string
  title: string
  children?: TreeDataNode[]
}
function buildSiteTreeData(nodes: RegionNode[]): TreeDataNode[] {
  return nodes.map(n => {
    if (n.sites && n.sites.length > 0) {
      return {
        value: n.code,
        title: n.label,
        children: n.sites.map(s => ({
          value: s.id,
          title: s.name
        }))
      }
    }
    return {
      value: n.code,
      title: n.label,
      children: n.children ? buildSiteTreeData(n.children) : undefined
    }
  })
}
const siteTreeData = buildSiteTreeData(regionTree)

// 选中工地 id 集合（含选中的区/市级 code 时，展开为其下所有工地）
const selectedSiteIdSet = computed<Set<string>>(() => {
  if (siteIds.value.length === 0) return new Set()
  const result = new Set<string>()

  function collectSiteIdsFromRegion(node: RegionNode): string[] {
    const ids: string[] = []
    if (node.sites) node.sites.forEach(s => ids.push(s.id))
    if (node.children) node.children.forEach(c => ids.push(...collectSiteIdsFromRegion(c)))
    return ids
  }

  for (const val of siteIds.value) {
    // 叶子节点 = siteId（如 c1, c2），区域节点 = 6位 code
    if (val.startsWith('c')) {
      result.add(val)
    } else {
      // 在 regionTree 中查找该 code
      const findAndCollect = (nodes: RegionNode[]): boolean => {
        for (const n of nodes) {
          if (n.code === val) {
            collectSiteIdsFromRegion(n).forEach(id => result.add(id))
            return true
          }
          if (n.children && findAndCollect(n.children)) return true
        }
        return false
      }
      findAndCollect(regionTree)
    }
  }
  return result
})

// ===== 过滤后的列表 =====
const filteredIncidents = computed<HistoryIncident[]>(() => {
  let list = riskIncidents

  // 工地
  if (selectedSiteIdSet.value.size > 0) {
    list = list.filter(e => selectedSiteIdSet.value.has(e.siteId))
  }

  // 事件类型
  if (eventType.value !== 'all') {
    list = list.filter(e => e.type === eventType.value)
  }

  // 时间范围
  if (timeRange.value && timeRange.value.length === 2) {
    const [start, end] = timeRange.value
    const startStr = start.format('YYYY-MM-DD')
    const endStr = end.format('YYYY-MM-DD')
    list = list.filter(e => {
      const dateStr = e.occurTime.substring(0, 10)
      return dateStr >= startStr && dateStr <= endStr
    })
  }

  // 状态
  if (status.value !== 'all') {
    list = list.filter(e => e.status === status.value)
  }

  // 关键字（工地名 / 事件描述 / 地址 / 位置）
  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(e =>
      e.siteName.toLowerCase().includes(kw) ||
      e.description.toLowerCase().includes(kw) ||
      e.siteAddress.toLowerCase().includes(kw) ||
      e.location.toLowerCase().includes(kw)
    )
  }

  return list
})

// ===== 分页 =====
const currentPage = ref(1)
const pageSize = ref(10)

// 搜索条件变化时重置到第一页
watch([siteIds, eventType, timeRange, status, keyword], () => {
  currentPage.value = 1
})

const pagedIncidents = computed<HistoryIncident[]>(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredIncidents.value.slice(start, start + pageSize.value)
})

// ===== 表格列 =====
function typeLabel(t: EventType): string {
  return eventTypeOptions.find(o => o.value === t)?.label || t
}
function typeColor(t: EventType): string {
  return eventTypeOptions.find(o => o.value === t)?.color || '#6e4bff'
}
function typeIcon(t: EventType): string {
  return eventTypeOptions.find(o => o.value === t)?.icon || 'i-ant-design-alert-outlined'
}

// ===== 详情弹窗 =====
const detailVisible = ref(false)
const detailData = ref<HistoryIncident | null>(null)

function openDetail(row: HistoryIncident) {
  detailData.value = row
  detailVisible.value = true
}

// ===== 操作 =====
function handleSearch() {
  currentPage.value = 1
}

function handleReset() {
  siteIds.value = []
  eventType.value = 'all'
  timeRange.value = undefined
  status.value = 'all'
  keyword.value = ''
  currentPage.value = 1
}

function handleExport() {
  message.success(`已导出 ${filteredIncidents.value.length} 条历史风险事件`)
}

// 解除方式标签颜色
function methodColor(m: ResolveMethod): string {
  if (m === 'auto') return '#6e4bff'
  if (m === 'manual') return '#1677ff'
  return '#fa8c16'
}
</script>

<template>
  <div class="hi-page">
    <!-- ===== 搜索栏 ===== -->
    <div class="search-bar">
      <div class="search-row">
        <div class="search-fields">
          <div class="search-item search-item--site">
            <label>工地</label>
            <a-tree-select
              v-model:value="siteIds"
              :tree-data="siteTreeData"
              tree-checkable
              tree-default-expand-all
              allow-clear
              :max-tag-count="2"
              placeholder="选择工地"
              :field-names="{ label: 'title', value: 'value', children: 'children' }"
              :dropdown-style="{ maxHeight: '400px', overflow: 'auto' }"
            />
          </div>
          <div class="search-item">
            <label>事件类型</label>
            <a-select v-model:value="eventType" allow-clear placeholder="全部类型">
              <a-select-option value="all">全部类型</a-select-option>
              <a-select-option v-for="t in eventTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</a-select-option>
            </a-select>
          </div>
          <div class="search-item">
            <label>时间</label>
            <a-range-picker v-model:value="timeRange" :allow-clear="true" />
          </div>
          <div class="search-item">
            <label>状态</label>
            <a-select v-model:value="status" allow-clear placeholder="全部状态">
              <a-select-option value="all">全部状态</a-select-option>
              <a-select-option value="resolved">已解除</a-select-option>
              <a-select-option value="unresolved">未解除</a-select-option>
            </a-select>
          </div>
          <div class="search-item search-item--kw">
            <label>关键字</label>
            <a-input v-model:value="keyword" placeholder="搜索工地名/描述/地址" allow-clear />
          </div>
        </div>
        <div class="search-actions">
          <button class="s-btn s-btn--primary" @click="handleSearch">
            <i class="i-ant-design-search-outlined" />查询
          </button>
          <button class="s-btn" @click="handleReset">
            <i class="i-ant-design-reload-outlined" />重置
          </button>
          <button class="s-btn s-btn--export" @click="handleExport">
            <i class="i-ant-design-download-outlined" />导出
          </button>
        </div>
      </div>
    </div>

    <!-- ===== 表格区 ===== -->
    <div class="table-card">
      <div class="table-scroll-area">
        <a-table
          :data-source="pagedIncidents"
          :pagination="false"
          row-key="id"
          :scroll="{ x: 1300 }"
          size="middle"
          class="incident-table"
          :custom-row="(record: HistoryIncident) => ({ onClick: () => openDetail(record) })"
        >
        <a-table-column title="工地名称" data-index="siteName" :width="180" :ellipsis="true">
          <template #default="{ record }">
            <div class="cell-site">
              <i class="i-ant-design-environment-outlined cell-site-icon" />
              <span>{{ record.siteName }}</span>
            </div>
          </template>
        </a-table-column>

        <a-table-column title="工地地址" data-index="siteAddress" :width="200" :ellipsis="true" />

        <a-table-column title="事件类型" data-index="type" :width="120">
          <template #default="{ record }">
            <span
              class="type-tag"
              :style="{ background: typeColor(record.type) + '18', color: typeColor(record.type) }"
            >
              <i :class="typeIcon(record.type)" />
              {{ typeLabel(record.type) }}
            </span>
          </template>
        </a-table-column>

        <a-table-column title="事件描述" data-index="description" :width="180" :ellipsis="true" />

        <a-table-column title="发生时间" data-index="occurTime" :width="160" />

        <a-table-column title="解除时间" data-index="resolveTime" :width="160">
          <template #default="{ record }">
            <span v-if="record.resolveTime">{{ record.resolveTime }}</span>
            <span v-else class="cell-placeholder">—</span>
          </template>
        </a-table-column>

        <a-table-column title="解除状态" data-index="status" :width="120">
          <template #default="{ record }">
            <span class="status-tag" :style="{ background: statusMeta[record.status as ResolveStatus].bg, color: statusMeta[record.status as ResolveStatus].color }">
              <span class="status-dot" :style="{ background: statusMeta[record.status as ResolveStatus].color }" />
              {{ statusMeta[record.status as ResolveStatus].label }}
            </span>
          </template>
        </a-table-column>

        <a-table-column title="操作" :width="100" fixed="right">
          <template #default="{ record }">
            <button class="detail-btn" @click="openDetail(record)">
              <i class="i-ant-design-eye-outlined" />查看详情
            </button>
          </template>
        </a-table-column>
      </a-table>
      </div>

      <!-- ===== 分页 ===== -->
      <div class="pagination-bar">
        <span class="page-total">共 {{ filteredIncidents.length }} 条</span>
        <a-pagination
          v-model:current="currentPage"
          v-model:page-size="pageSize"
          :total="filteredIncidents.length"
          :page-size-options="['10', '20', '50']"
          show-size-changer
          show-quick-jumper
        />
      </div>
    </div>

    <!-- ===== 详情弹窗 ===== -->
    <a-modal
      v-model:open="detailVisible"
      :width="680"
      centered
      title="事件详情"
      :footer="null"
      @cancel="detailVisible = false"
    >
      <template v-if="detailData">
        <div class="detail-modal">
          <!-- 截图 -->
          <div class="detail-thumb">
            <img :src="detailData.thumb" :alt="detailData.description" />
            <span
              class="detail-thumb-type"
              :style="{ background: typeColor(detailData.type) }"
            >
              {{ typeLabel(detailData.type) }}
            </span>
          </div>

          <!-- 状态横幅 -->
          <div class="detail-status-banner">
            <span
              class="status-tag lg"
              :style="{ background: statusMeta[detailData.status].bg, color: statusMeta[detailData.status].color }"
            >
              <span class="status-dot" :style="{ background: statusMeta[detailData.status].color }" />
              {{ statusMeta[detailData.status].label }}
            </span>
            <span
              v-if="detailData.status === 'resolved'"
              class="detail-method"
              :style="{ color: methodColor(detailData.resolveMethod) }"
            >
              <i :class="resolveMethodMeta[detailData.resolveMethod].icon" />
              {{ resolveMethodMeta[detailData.resolveMethod].label }}
            </span>
          </div>

          <!-- 字段列表 -->
          <ul class="detail-fields">
            <li class="detail-field">
              <span class="detail-field-label">工地名称</span>
              <span class="detail-field-value">{{ detailData.siteName }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field-label">工地地址</span>
              <span class="detail-field-value">{{ detailData.siteAddress }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field-label">事件类型</span>
              <span class="detail-field-value">
                <span class="type-tag" :style="{ background: typeColor(detailData.type) + '18', color: typeColor(detailData.type) }">
                  <i :class="typeIcon(detailData.type)" />
                  {{ typeLabel(detailData.type) }}
                </span>
              </span>
            </li>
            <li class="detail-field">
              <span class="detail-field-label">事件位置</span>
              <span class="detail-field-value">
                <i class="i-ant-design-environment-outlined detail-field-icon" />
                {{ detailData.location }}
              </span>
            </li>
            <li class="detail-field">
              <span class="detail-field-label">发生时间</span>
              <span class="detail-field-value">
                <i class="i-ant-design-clock-circle-outlined detail-field-icon" />
                {{ detailData.occurTime }}
              </span>
            </li>
            <li class="detail-field">
              <span class="detail-field-label">解除时间</span>
              <span class="detail-field-value">
                <template v-if="detailData.resolveTime">
                  <i class="i-ant-design-check-circle-outlined detail-field-icon detail-field-icon--ok" />
                  {{ detailData.resolveTime }}
                </template>
                <span v-else class="cell-placeholder">—</span>
              </span>
            </li>
          </ul>

          <!-- 事件描述（合并描述+详情） -->
          <div class="detail-desc-box">
            <span class="detail-desc-label">事件描述</span>
            <p class="detail-desc-text">{{ detailData.description }}</p>
            <p class="detail-desc-text">{{ detailData.detail }}</p>
          </div>
        </div>
      </template>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.hi-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 16px;
  overflow: hidden;
}

/* ===== 搜索栏 ===== */
.search-bar {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 14px 16px 12px;
  flex-shrink: 0;
}

.search-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  align-items: flex-end;
  justify-content: space-between;
}

.search-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 16px;
  align-items: flex-end;
  flex: 1;
}

.search-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.search-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 12px;
    font-weight: 500;
    color: $text-muted;
    white-space: nowrap;
  }

  :deep(.ant-select),
  :deep(.ant-picker) {
    width: 180px;
  }

  :deep(.ant-picker) {
    width: 240px;
  }

  :deep(.ant-select-selector),
  :deep(.ant-input),
  :deep(.ant-picker) {
    border-radius: 6px !important;
    font-size: 13px;
  }

  &--site {
    :deep(.ant-tree-select) {
      width: 260px;
    }
  }

  &--kw {
    :deep(.ant-input) {
      width: 220px;
    }
  }
}

.s-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 16px;
  border: 1px solid $border-color-light;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  i { font-size: 14px; }

  &:hover {
    color: $color-primary;
    border-color: $color-primary;
  }

  &--primary {
    background: $color-primary;
    border-color: $color-primary;
    color: #fff;

    &:hover {
      background: $color-primary-hover;
      border-color: $color-primary-hover;
      color: #fff;
    }
  }

  &--export {
    border-color: $color-primary;
    color: $color-primary;
    background: $color-primary-bg;

    &:hover {
      background: $color-primary;
      color: #fff;
    }
  }
}

/* ===== 表格卡片 ===== */
.table-card {
  flex: 1;
  min-height: 0;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-scroll-area {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
}

.incident-table {
  :deep(.ant-table-thead > tr > th) {
    background: #fafbfc;
    font-size: 13px;
    font-weight: 600;
    color: $text-base;
    border-bottom: 1px solid $border-color-card;
  }

  :deep(.ant-table-tbody > tr) {
    cursor: pointer;
  }

  :deep(.ant-table-tbody > tr > td) {
    font-size: 13px;
    color: $text-secondary;
  }

  :deep(.ant-table-tbody > tr:hover > td) {
    background: #faf9ff;
  }
}

/* 单元格样式 */
.cell-site {
  display: flex;
  align-items: center;
  gap: 4px;

  .cell-site-icon {
    font-size: 12px;
    color: $text-muted;
    flex-shrink: 0;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.cell-placeholder {
  color: $text-muted;
}

/* 事件类型标签 */
.type-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;

  i {
    font-size: 12px;
  }
}

/* 解除状态标签 */
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &.lg {
    font-size: 13px;
    padding: 4px 12px;
    border-radius: 6px;

    .status-dot {
      width: 7px;
      height: 7px;
    }
  }
}

/* 查看详情按钮 */
.detail-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  border: none;
  background: transparent;
  color: $color-primary;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  padding: 2px 4px;
  transition: opacity 0.15s;

  i { font-size: 14px; }

  &:hover {
    opacity: 0.8;
    text-decoration: underline;
  }
}

/* ===== 分页栏 ===== */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid $border-color-card;
  flex-shrink: 0;

  .page-total {
    font-size: 13px;
    color: $text-muted;
  }

  :deep(.ant-pagination-item) {
    border-radius: 6px;
  }

  :deep(.ant-pagination-item-active) {
    border-color: $color-primary;
    a { color: $color-primary; }
  }
}

/* ===== 详情弹窗 ===== */
.detail-modal {
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

.detail-thumb-type {
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 4px;
  color: #fff;
}

.detail-status-banner {
  display: flex;
  align-items: center;
  gap: 16px;
}

.detail-method {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;

  i { font-size: 14px; }
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
    display: flex;
    align-items: center;
    gap: 4px;
    word-break: break-all;
  }

  &-icon {
    font-size: 13px;
    color: $text-muted;

    &--ok { color: #52c41a; }
  }
}

.detail-desc-box {
  padding: 10px 14px;
  background: #f7f8fa;
  border-radius: 8px;
}

.detail-desc-label {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: $text-muted;
  margin-bottom: 4px;
}

.detail-desc-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: $text-secondary;
}
</style>
