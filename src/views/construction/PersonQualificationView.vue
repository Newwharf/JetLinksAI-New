<script setup lang="ts">
/**
 * 资质证件统计
 * 左侧：工地树（省市区树 + 工地列表）
 * 右侧：指标卡片 + 图表（证件类型分布 / 有效期分布）+ 明细表格
 */
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import ECharts from '@/components/ECharts.vue'
import SiteTreePanel from './SiteTreePanel.vue'
import { constructionSites } from './posture.mock'
import {
  certRecords,
  certTypeMeta,
  certTypeOptions,
  certStatusMeta,
  buildCertTypePie,
  buildCertExpiryBar,
  type CertRecord,
  type CertType,
  type CertStatus
} from './person-stats.mock'

// ===== 左侧工地树 =====
const selectedSiteIds = ref<Set<string>>(new Set(constructionSites.map(s => s.id)))

function handleSiteSelect(selected: { type: 'all' | 'site' | 'region'; id: string; siteIds: Set<string> }) {
  selectedSiteIds.value = selected.siteIds
}

// ===== 指标卡片 =====
const metrics = computed(() => {
  const filtered = certRecords.filter(c => selectedSiteIds.value.has(c.siteId))
  const expiring = filtered.filter(c => c.status === 'expiring').length
  const expired = filtered.filter(c => c.status === 'expired').length
  const holders = new Set(filtered.map(c => c.personName + c.siteId)).size
  return [
    { key: 'holders', title: '持证人数', icon: 'i-ant-design-idcard-outlined', color: '#6e4bff', value: holders, sub: '在册持证人员' },
    { key: 'expiring', title: '即将过期', icon: 'i-ant-design-clock-circle-outlined', color: '#fa8c16', value: expiring, sub: '30天内到期' },
    { key: 'expired', title: '已过期', icon: 'i-ant-design-close-circle-outlined', color: '#ff4d4f', value: expired, sub: '需立即复审' },
    { key: 'total', title: '证件总数', icon: 'i-ant-design-safety-certificate-outlined', color: '#2bb3a3', value: filtered.length, sub: '全部证件记录' }
  ]
})

// ===== 图表：证件类型分布（饼图）=====
const typePieOption = computed(() => {
  const pie = buildCertTypePie(selectedSiteIds.value)
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: '#f0f4f8',
      borderWidth: 1,
      borderRadius: 8,
      padding: [8, 12],
      textStyle: { color: '#111418', fontSize: 12 },
      formatter: '{b}: {c} 本 ({d}%)'
    },
    legend: { bottom: 0, icon: 'circle', itemWidth: 10, itemHeight: 10, textStyle: { color: '#3a3f47', fontSize: 12 } },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '42%'],
      avoidLabelOverlap: true,
      label: { show: true, formatter: '{b}\n{c}本', fontSize: 12, color: '#3a3f47' },
      labelLine: { length: 8, length2: 8 },
      data: pie
    }]
  }
})

// ===== 图表：有效期分布（柱状图，紫色系）=====
const expiryBarOption = computed(() => {
  const bar = buildCertExpiryBar(selectedSiteIds.value)
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#f0f4f8',
      borderWidth: 1,
      borderRadius: 8,
      padding: [8, 12],
      textStyle: { color: '#111418', fontSize: 12 },
      axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(110,75,255,0.06)' } }
    },
    grid: { left: 44, right: 16, top: 16, bottom: 32 },
    xAxis: {
      type: 'category',
      data: bar.months,
      axisLine: { lineStyle: { color: '#dbe4f1' } },
      axisTick: { show: false },
      axisLabel: { color: '#8c8c8c', fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f0f4f8' } },
      axisLabel: { color: '#8c8c8c', fontSize: 12 }
    },
    series: [{
      type: 'bar',
      barWidth: '46%',
      data: bar.counts.map((v, i) => ({
        value: v,
        itemStyle: {
          borderRadius: [4, 4, 0, 0],
          color: i === 0
            ? '#ff4d4f'
            : { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
                { offset: 0, color: '#7d5cff' },
                { offset: 1, color: 'rgba(110,75,255,0.3)' }
              ] }
        }
      })),
      label: { show: true, position: 'top', color: '#6e4bff', fontSize: 12, fontWeight: 600 }
    }]
  }
})

// ===== 搜索条件 =====
const typeFilter = ref<CertType | 'all'>('all')
const statusFilter = ref<CertStatus | 'all'>('all')
const keyword = ref('')

const filteredRecords = computed<CertRecord[]>(() => {
  let list = certRecords.filter(c => selectedSiteIds.value.has(c.siteId))

  if (typeFilter.value !== 'all') {
    list = list.filter(c => c.type === typeFilter.value)
  }

  if (statusFilter.value !== 'all') {
    list = list.filter(c => c.status === statusFilter.value)
  }

  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(c =>
      c.personName.toLowerCase().includes(kw) ||
      c.siteName.toLowerCase().includes(kw) ||
      c.certNo.toLowerCase().includes(kw)
    )
  }

  return list
})

// ===== 分页 =====
const currentPage = ref(1)
const pageSize = ref(10)

watch([typeFilter, statusFilter, keyword, selectedSiteIds], () => {
  currentPage.value = 1
})

const pagedRecords = computed<CertRecord[]>(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRecords.value.slice(start, start + pageSize.value)
})

// ===== 操作 =====
function handleReset() {
  typeFilter.value = 'all'
  statusFilter.value = 'all'
  keyword.value = ''
  currentPage.value = 1
}

function handleExport() {
  message.success(`已导出 ${filteredRecords.value.length} 条资质证件记录`)
}

// ===== 详情弹窗 =====
const detailVisible = ref(false)
const detailData = ref<CertRecord | null>(null)

function openDetail(row: CertRecord) {
  detailData.value = row
  detailVisible.value = true
}
</script>

<template>
  <div class="pq-page">
    <!-- ===== 左侧工地树 ===== -->
    <SiteTreePanel @select="handleSiteSelect" />

    <!-- ===== 右侧 ===== -->
    <main class="right-panel">
      <!-- ===== 指标卡片 ===== -->
      <section class="metric-grid">
        <article v-for="card in metrics" :key="card.key" class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" :style="{ background: card.color }">
              <i :class="card.icon" />
            </span>
            <span class="metric-title">{{ card.title }}</span>
          </div>
          <div class="metric-card__body">
            <strong class="metric-value">{{ card.value }}</strong>
            <span class="metric-sub-text">{{ card.sub }}</span>
          </div>
        </article>
      </section>

      <!-- ===== 图表区 ===== -->
      <section class="chart-grid">
        <div class="chart-card">
          <div class="chart-card__head"><strong>证件类型分布</strong></div>
          <ECharts :option="typePieOption" height="180px" />
        </div>
        <div class="chart-card">
          <div class="chart-card__head"><strong>有效期分布 · 按月分组</strong></div>
          <ECharts :option="expiryBarOption" height="180px" />
        </div>
      </section>

      <!-- ===== 明细表格 ===== -->
      <div class="table-card">
        <!-- 搜索栏 -->
        <div class="search-bar">
          <div class="search-row">
            <div class="search-fields">
              <div class="search-item">
                <label>证件类型</label>
                <a-select v-model:value="typeFilter" allow-clear placeholder="全部类型">
                  <a-select-option value="all">全部类型</a-select-option>
                  <a-select-option v-for="t in certTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</a-select-option>
                </a-select>
              </div>
              <div class="search-item">
                <label>状态</label>
                <a-select v-model:value="statusFilter" allow-clear placeholder="全部状态">
                  <a-select-option value="all">全部状态</a-select-option>
                  <a-select-option value="valid">有效</a-select-option>
                  <a-select-option value="expiring">即将过期</a-select-option>
                  <a-select-option value="expired">已过期</a-select-option>
                </a-select>
              </div>
              <div class="search-item search-item--kw">
                <label>关键字</label>
                <a-input v-model:value="keyword" placeholder="搜索人员/工地/证件编号" allow-clear />
              </div>
              <div class="search-actions search-actions--inline">
                <button class="s-btn s-btn--primary" @click="currentPage = 1">
                  <i class="i-ant-design-search-outlined" />查询
                </button>
                <button class="s-btn" @click="handleReset">
                  <i class="i-ant-design-reload-outlined" />重置
                </button>
              </div>
            </div>
            <div class="search-actions search-actions--right">
              <button class="s-btn s-btn--export" @click="handleExport">
                <i class="i-ant-design-download-outlined" />导出
              </button>
            </div>
          </div>
        </div>

        <!-- 表格 -->
        <div class="table-body-wrap">
          <a-table
            :data-source="pagedRecords"
            :pagination="false"
            row-key="id"
            :scroll="{ x: 1400 }"
            size="middle"
            class="pq-table"
            :custom-row="(record: CertRecord) => ({ onClick: () => openDetail(record) })"
          >
            <a-table-column title="人员姓名" :width="160">
              <template #default="{ record }">
                <div class="cell-person">
                  <img :src="record.personAvatar" class="cell-person__avatar" alt="" />
                  <span class="cell-person__name">{{ record.personName }}</span>
                </div>
              </template>
            </a-table-column>

            <a-table-column title="证件类型" :width="160">
              <template #default="{ record }">
                <span class="type-tag" :style="{ background: certTypeMeta[record.type as CertType].color + '18', color: certTypeMeta[record.type as CertType].color }">
                  <i :class="certTypeMeta[record.type as CertType].icon" />
                  {{ certTypeMeta[record.type as CertType].label }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="证件编号" data-index="certNo" :width="180" :ellipsis="true" />

            <a-table-column title="发证日期" data-index="issueDate" :width="120" />

            <a-table-column title="到期日期" data-index="expireDate" :width="120" />

            <a-table-column title="状态" :width="110">
              <template #default="{ record }">
                <span class="status-tag" :style="{ background: certStatusMeta[record.status as CertStatus].bg, color: certStatusMeta[record.status as CertStatus].color }">
                  <span class="status-dot" :style="{ background: certStatusMeta[record.status as CertStatus].color }" />
                  {{ certStatusMeta[record.status as CertStatus].label }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="工地" data-index="siteName" :width="180" :ellipsis="true" />

            <a-table-column title="操作" :width="100" fixed="right">
              <template #default="{ record }">
                <div class="row-actions" @click.stop>
                  <button class="action-btn" @click="openDetail(record)">
                    <i class="i-ant-design-eye-outlined" />详情
                  </button>
                </div>
              </template>
            </a-table-column>
          </a-table>
        </div>

        <!-- 分页 -->
        <div class="pagination-bar">
          <span class="page-total">共 {{ filteredRecords.length }} 条</span>
          <a-pagination
            v-model:current="currentPage"
            v-model:page-size="pageSize"
            :total="filteredRecords.length"
            :page-size-options="['10', '20', '50']"
            show-size-changer
            show-quick-jumper
          />
        </div>
      </div>
    </main>

    <!-- ===== 详情弹窗 ===== -->
    <a-modal
      v-model:open="detailVisible"
      :width="520"
      centered
      title="资质证件详情"
      :footer="null"
      @cancel="detailVisible = false"
    >
      <template v-if="detailData">
        <div class="detail-modal">
          <div class="detail-head">
            <img :src="detailData.personAvatar" class="detail-head__avatar" alt="" />
            <div class="detail-head__info">
              <h3 class="detail-head__name">{{ detailData.personName }}</h3>
              <span class="type-tag" :style="{ background: certTypeMeta[detailData.type].color + '18', color: certTypeMeta[detailData.type].color }">
                <i :class="certTypeMeta[detailData.type].icon" />
                {{ certTypeMeta[detailData.type].label }}
              </span>
            </div>
          </div>
          <ul class="detail-fields">
            <li class="detail-field">
              <span class="detail-field__label">所属工地</span>
              <span class="detail-field__value">{{ detailData.siteName }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field__label">证件编号</span>
              <span class="detail-field__value">{{ detailData.certNo }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field__label">发证日期</span>
              <span class="detail-field__value">{{ detailData.issueDate }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field__label">到期日期</span>
              <span class="detail-field__value">{{ detailData.expireDate }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field__label">证件状态</span>
              <span class="detail-field__value">
                <span class="status-tag" :style="{ background: certStatusMeta[detailData.status].bg, color: certStatusMeta[detailData.status].color }">
                  <span class="status-dot" :style="{ background: certStatusMeta[detailData.status].color }" />
                  {{ certStatusMeta[detailData.status].label }}
                </span>
              </span>
            </li>
            <li class="detail-field">
              <span class="detail-field__label">记录编号</span>
              <span class="detail-field__value">{{ detailData.id }}</span>
            </li>
          </ul>
        </div>
      </template>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.pq-page {
  height: 100%;
  display: flex;
  gap: 8px;
  padding: 8px;
  overflow: hidden;
}

/* ===== 右侧 ===== */
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  min-width: 0;
}

/* ===== 指标卡片 ===== */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  flex-shrink: 0;
}

.metric-card {
  background: #fff;
  border-radius: 10px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;

  &__head { display: flex; align-items: center; gap: 8px; }
  &__body { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
}

.metric-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;

  i { font-size: 16px; }
}

.metric-title { font-size: 12px; font-weight: 500; color: $text-secondary; }
.metric-value { font-size: 22px; font-weight: 700; color: $text-base; line-height: 1.1; }
.metric-sub-text { font-size: 11px; color: $text-muted; }

/* ===== 图表区 ===== */
.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  flex-shrink: 0;
}

.chart-card {
  background: #fff;
  border-radius: 10px;
  padding: 8px 14px;
  display: flex;
  flex-direction: column;

  &__head {
    margin-bottom: 4px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    strong { font-size: 15px; font-weight: 600; color: $text-base; }
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

/* ===== 搜索栏 ===== */
.search-bar {
  background: #fff;
  border-bottom: 1px solid $border-color-card;
  padding: 16px;
  flex-shrink: 0;
}

.search-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: flex-end;
  justify-content: space-between;
}

.search-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: flex-end;
  flex: 1;
}

.search-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;

  &--inline { align-items: flex-end; }
  &--right { align-items: flex-end; }
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

  :deep(.ant-select) { width: 180px; }

  :deep(.ant-select-selector),
  :deep(.ant-input) {
    border-radius: 6px !important;
    font-size: 13px;
  }

  &--kw {
    :deep(.ant-input) { width: 220px; }
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

/* ===== 表格 ===== */
.table-body-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
}

.pq-table {
  :deep(.ant-table-thead > tr > th) {
    background: #fafbfc;
    font-size: 13px;
    font-weight: 600;
    color: $text-base;
    border-bottom: 1px solid $border-color-card;
  }

  :deep(.ant-table-tbody > tr) { cursor: pointer; }

  :deep(.ant-table-tbody > tr > td) {
    font-size: 13px;
    color: $text-secondary;
  }

  :deep(.ant-table-tbody > tr:hover > td) {
    background: #faf9ff;
  }
}

/* 人员单元格 */
.cell-person {
  display: flex;
  align-items: center;
  gap: 8px;

  &__avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  &__name {
    font-size: 13px;
    font-weight: 500;
    color: $text-base;
  }
}

/* 证件类型标签 */
.type-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;

  i { font-size: 12px; }
}

/* 状态标签 */
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
}

/* 行操作 */
.row-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
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

  &:hover { opacity: 0.8; text-decoration: underline; }
}

/* ===== 分页 ===== */
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

  :deep(.ant-pagination-item) { border-radius: 6px; }

  :deep(.ant-pagination-item-active) {
    border-color: $color-primary;
    a { color: $color-primary; }
  }
}

/* ===== 详情弹窗 ===== */
.detail-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px;
}

.detail-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 8px 0;

  &__avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__name {
    font-size: 20px;
    font-weight: 600;
    color: $text-base;
    margin: 0;
  }
}

.detail-fields {
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  overflow: hidden;
}

.detail-field {
  display: flex;
  gap: 16px;
  padding: 10px 14px;
  border-bottom: 1px solid $border-color-card;

  &:last-child { border-bottom: none; }

  &__label {
    width: 100px;
    flex-shrink: 0;
    font-size: 13px;
    color: $text-muted;
  }

  &__value {
    flex: 1;
    font-size: 13px;
    color: $text-base;
  }
}
</style>
