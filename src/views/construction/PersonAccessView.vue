<script setup lang="ts">
/**
 * 人员进出统计
 * 左侧：工地树（省市区树 + 工地列表）
 * 右侧：指标卡片 + 图表（进出趋势 / 时段分布）+ 明细表格
 */
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import ECharts from '@/components/ECharts.vue'
import SiteTreePanel from './SiteTreePanel.vue'
import { constructionSites } from './posture.mock'
import {
  accessRecords,
  directionMeta,
  buildAccessTrend,
  buildAccessHourBar,
  type AccessRecord,
  type AccessDirection
} from './person-stats.mock'

// ===== 左侧工地树 =====
const selectedSiteIds = ref<Set<string>>(new Set(constructionSites.map(s => s.id)))

function handleSiteSelect(selected: { type: 'all' | 'site' | 'region'; id: string; siteIds: Set<string> }) {
  selectedSiteIds.value = selected.siteIds
}

// ===== 指标卡片 =====
const todayStr = '2026-07-13'
const monthStr = '2026-07'

const metrics = computed(() => {
  const filtered = accessRecords.filter(a => selectedSiteIds.value.has(a.siteId))
  const today = filtered.filter(a => a.time.startsWith(todayStr))
  const month = filtered.filter(a => a.time.startsWith(monthStr))
  const todayIn = today.filter(a => a.direction === 'in').length
  const todayOut = today.filter(a => a.direction === 'out').length
  // 当前在场 = 今日进场 - 今日出场（近似）
  const present = Math.max(0, todayIn - todayOut)
  return [
    { key: 'todayIn', title: '今日进场', icon: 'i-ant-design-login-outlined', color: '#2bb3a3', value: todayIn, sub: '今日进场合计' },
    { key: 'todayOut', title: '今日出场', icon: 'i-ant-design-logout-outlined', color: '#fa8c16', value: todayOut, sub: '今日出场合计' },
    { key: 'present', title: '当前在场', icon: 'i-ant-design-team-outlined', color: '#6e4bff', value: present, sub: '在场人员估算' },
    { key: 'month', title: '本月累计', icon: 'i-ant-design-calendar-outlined', color: '#1890ff', value: month.length, sub: '本月进出次数' }
  ]
})

// ===== 图表：进出趋势（近7天双折线）=====
const trendOption = computed(() => {
  const trend = buildAccessTrend(selectedSiteIds.value)
  return {
    color: ['#2bb3a3', '#fa8c16'],
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#f0f4f8',
      borderWidth: 1,
      borderRadius: 8,
      padding: [10, 14],
      textStyle: { color: '#111418', fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: '#6e4bff', type: 'dashed', width: 1 } }
    },
    legend: { data: ['进场', '出场'], right: 0, top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: '#3a3f47', fontSize: 12 } },
    grid: { left: 44, right: 16, top: 40, bottom: 32 },
    xAxis: {
      type: 'category',
      data: trend.days,
      boundaryGap: false,
      axisLine: { lineStyle: { color: '#dbe4f1' } },
      axisTick: { show: false },
      axisLabel: { color: '#8c8c8c', fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f0f4f8' } },
      axisLabel: { color: '#8c8c8c', fontSize: 12 }
    },
    series: [
      { name: '进场', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: trend.inCounts, lineStyle: { width: 2 }, areaStyle: { color: 'rgba(43,179,163,0.1)' } },
      { name: '出场', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, data: trend.outCounts, lineStyle: { width: 2 }, areaStyle: { color: 'rgba(250,140,22,0.1)' } }
    ]
  }
})

// ===== 图表：时段分布（柱状图）=====
const hourOption = computed(() => {
  const bar = buildAccessHourBar(selectedSiteIds.value)
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
      data: bar.hours,
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
      data: bar.counts,
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
          { offset: 0, color: '#7d5cff' },
          { offset: 1, color: 'rgba(110,75,255,0.3)' }
        ] }
      },
      label: { show: true, position: 'top', color: '#6e4bff', fontSize: 12, fontWeight: 600 }
    }]
  }
})

// ===== 搜索条件 =====
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs]>()
const directionFilter = ref<AccessDirection | 'all'>('all')
const keyword = ref('')

const filteredRecords = computed<AccessRecord[]>(() => {
  let list = accessRecords.filter(a => selectedSiteIds.value.has(a.siteId))

  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value
    const startStr = start.format('YYYY-MM-DD')
    const endStr = end.format('YYYY-MM-DD')
    list = list.filter(a => {
      const d = a.time.substring(0, 10)
      return d >= startStr && d <= endStr
    })
  }

  if (directionFilter.value !== 'all') {
    list = list.filter(a => a.direction === directionFilter.value)
  }

  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(a =>
      a.personName.toLowerCase().includes(kw) ||
      a.siteName.toLowerCase().includes(kw) ||
      a.gate.toLowerCase().includes(kw)
    )
  }

  return list
})

// ===== 分页 =====
const currentPage = ref(1)
const pageSize = ref(10)

watch([dateRange, directionFilter, keyword, selectedSiteIds], () => {
  currentPage.value = 1
})

const pagedRecords = computed<AccessRecord[]>(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRecords.value.slice(start, start + pageSize.value)
})

// ===== 操作 =====
function handleReset() {
  dateRange.value = undefined
  directionFilter.value = 'all'
  keyword.value = ''
  currentPage.value = 1
}

function handleExport() {
  message.success(`已导出 ${filteredRecords.value.length} 条进出记录`)
}

// ===== 详情弹窗 =====
const detailVisible = ref(false)
const detailData = ref<AccessRecord | null>(null)

function openDetail(row: AccessRecord) {
  detailData.value = row
  detailVisible.value = true
}
</script>

<template>
  <div class="pa-page">
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
          <div class="chart-card__head"><strong>进出趋势 · 近 7 天</strong></div>
          <ECharts :option="trendOption" height="180px" />
        </div>
        <div class="chart-card">
          <div class="chart-card__head"><strong>时段分布 · 今日</strong></div>
          <ECharts :option="hourOption" height="180px" />
        </div>
      </section>

      <!-- ===== 明细表格 ===== -->
      <div class="table-card">
        <!-- 搜索栏 -->
        <div class="search-bar">
          <div class="search-row">
            <div class="search-fields">
              <div class="search-item">
                <label>日期范围</label>
                <a-range-picker v-model:value="dateRange" :allow-clear="true" />
              </div>
              <div class="search-item">
                <label>进出类型</label>
                <a-select v-model:value="directionFilter" allow-clear placeholder="全部类型">
                  <a-select-option value="all">全部类型</a-select-option>
                  <a-select-option value="in">进场</a-select-option>
                  <a-select-option value="out">出场</a-select-option>
                </a-select>
              </div>
              <div class="search-item search-item--kw">
                <label>关键字</label>
                <a-input v-model:value="keyword" placeholder="搜索人员/工地/通道" allow-clear />
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
            :scroll="{ x: 1100 }"
            size="middle"
            class="pa-table"
            :custom-row="(record: AccessRecord) => ({ onClick: () => openDetail(record) })"
          >
            <a-table-column title="人员姓名" :width="160">
              <template #default="{ record }">
                <div class="cell-person">
                  <img :src="record.personAvatar" class="cell-person__avatar" alt="" />
                  <span class="cell-person__name">{{ record.personName }}</span>
                </div>
              </template>
            </a-table-column>

            <a-table-column title="进/出" :width="90">
              <template #default="{ record }">
                <span class="dir-tag" :style="{ background: directionMeta[record.direction as AccessDirection].bg, color: directionMeta[record.direction as AccessDirection].color }">
                  <i :class="directionMeta[record.direction as AccessDirection].icon" />
                  {{ directionMeta[record.direction as AccessDirection].label }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="时间" data-index="time" :width="160" />

            <a-table-column title="通道门禁" data-index="gate" :width="140" :ellipsis="true" />

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
      title="进出记录详情"
      :footer="null"
      @cancel="detailVisible = false"
    >
      <template v-if="detailData">
        <div class="detail-modal">
          <div class="detail-head">
            <img :src="detailData.personAvatar" class="detail-head__avatar" alt="" />
            <div class="detail-head__info">
              <h3 class="detail-head__name">{{ detailData.personName }}</h3>
              <span class="dir-tag" :style="{ background: directionMeta[detailData.direction].bg, color: directionMeta[detailData.direction].color }">
                <i :class="directionMeta[detailData.direction].icon" />
                {{ directionMeta[detailData.direction].label }}
              </span>
            </div>
          </div>
          <ul class="detail-fields">
            <li class="detail-field">
              <span class="detail-field__label">所属工地</span>
              <span class="detail-field__value">{{ detailData.siteName }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field__label">进出时间</span>
              <span class="detail-field__value">{{ detailData.time }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field__label">通道门禁</span>
              <span class="detail-field__value">{{ detailData.gate }}</span>
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

.pa-page {
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
    strong { font-size: 13px; font-weight: 600; color: $text-base; }
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

  :deep(.ant-select) { width: 160px; }
  :deep(.ant-picker) { width: 240px; }

  :deep(.ant-select-selector),
  :deep(.ant-input),
  :deep(.ant-picker) {
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

.pa-table {
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

/* 进出标签 */
.dir-tag {
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
