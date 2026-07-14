<script setup lang="ts">
/**
 * 车辆进出统计 — 左工地树 + 右（指标+图表+台账表格）
 */
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import ECharts from '@/components/ECharts.vue'
import dayjs from 'dayjs'
import SiteTreePanel from './SiteTreePanel.vue'
import { constructionSites } from './posture.mock'
import {
  accessRecords,
  accessMethodMeta,
  type AccessMethod
} from './vehicle-ledger.mock'

// ===== 左侧工地树 =====
const selectedSiteIds = ref<Set<string>>(new Set(constructionSites.map(s => s.id)))
function handleSiteSelect(selected: { type: 'all' | 'site' | 'region'; id: string; siteIds: Set<string> }) {
  selectedSiteIds.value = selected.siteIds
}

const siteFiltered = computed(() => accessRecords.filter(r => selectedSiteIds.value.has(r.siteId)))

// ===== 指标卡片 =====
const metrics = computed(() => {
  const list = siteFiltered.value
  const total = list.length
  const inCount = list.filter(r => r.direction === 'in').length
  const outCount = list.filter(r => r.direction === 'out').length
  const todayStr = '2026-07-13'
  const todayCount = list.filter(r => r.accessTime.substring(0,10) === todayStr).length
  return [
    { key: 'total', title: '进出总次数', icon: 'i-ant-design-swap-outlined', color: '#6e4bff', value: total, sub: '近 30 天' },
    { key: 'in', title: '进场次数', icon: 'i-ant-design-arrow-down-outlined', color: '#52c41a', value: inCount, sub: '车辆驶入' },
    { key: 'out', title: '出场次数', icon: 'i-ant-design-arrow-up-outlined', color: '#fa8c16', value: outCount, sub: '车辆驶出' },
    { key: 'today', title: '今日进出', icon: 'i-ant-design-today-outlined', color: '#1677ff', value: todayCount, sub: '今日记录' }
  ]
})

// ===== 图表：进出趋势 =====
const trendOption = computed(() => {
  const days: string[] = []
  const inCounts: number[] = []
  const outCounts: number[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date('2026-07-13')
    d.setDate(d.getDate() - i)
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    days.push(`${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
    const dayRecords = siteFiltered.value.filter(r => r.accessTime.substring(0,10) === ds)
    inCounts.push(dayRecords.filter(r => r.direction === 'in').length)
    outCounts.push(dayRecords.filter(r => r.direction === 'out').length)
  }
  return {
    color: ['#52c41a', '#fa8c16'],
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [10,14], textStyle: { color: '#111418', fontSize: 12 } },
    legend: { data: ['进场', '出场'], right: 0, top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: '#3a3f47', fontSize: 12 } },
    grid: { left: 40, right: 12, top: 36, bottom: 28 },
    xAxis: { type: 'category', data: days, axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#8c8c8c', fontSize: 11 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
    series: [
      { name: '进场', type: 'bar', barWidth: '35%', data: inCounts, itemStyle: { borderRadius: [3,3,0,0], color: { type: 'linear', x:0,y:0,x2:0,y2:1, colorStops: [{ offset: 0, color: '#52c41a' }, { offset: 1, color: 'rgba(82,196,26,0.3)' }] } } },
      { name: '出场', type: 'bar', barWidth: '35%', data: outCounts, itemStyle: { borderRadius: [3,3,0,0], color: { type: 'linear', x:0,y:0,x2:0,y2:1, colorStops: [{ offset: 0, color: '#fa8c16' }, { offset: 1, color: 'rgba(250,140,22,0.3)' }] } } }
    ]
  }
})

// ===== 图表：通行方式占比 =====
const methodOption = computed(() => {
  const data = (Object.keys(accessMethodMeta) as AccessMethod[]).map(m => ({
    name: accessMethodMeta[m].label,
    value: siteFiltered.value.filter(r => r.method === m).length,
    itemStyle: { color: accessMethodMeta[m].color }
  })).filter(d => d.value > 0)
  return {
    tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8,12], textStyle: { color: '#111418', fontSize: 12 } },
    legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: '#3a3f47', fontSize: 11 } },
    series: [{ type: 'pie', radius: '55%', center: ['50%','40%'], label: { formatter: '{b}\n{c}次', fontSize: 11, color: '#3a3f47' }, data }]
  }
})

// ===== 台账搜索 =====
const searchKey = ref('')
const directionFilter = ref<'all' | 'in' | 'out'>('all')
const methodFilter = ref<AccessMethod | 'all'>('all')
const timeRange = ref<[dayjs.Dayjs, dayjs.Dayjs]>()

const filtered = computed(() => {
  let list = siteFiltered.value
  if (directionFilter.value !== 'all') list = list.filter(r => r.direction === directionFilter.value)
  if (methodFilter.value !== 'all') list = list.filter(r => r.method === methodFilter.value)
  if (timeRange.value && timeRange.value.length === 2) {
    const [s, e] = timeRange.value
    list = list.filter(r => r.accessTime.substring(0,10) >= s.format('YYYY-MM-DD') && r.accessTime.substring(0,10) <= e.format('YYYY-MM-DD'))
  }
  const kw = searchKey.value.trim().toLowerCase()
  if (kw) list = list.filter(r => r.plate.toLowerCase().includes(kw) || r.driver.toLowerCase().includes(kw) || r.siteName.toLowerCase().includes(kw))
  return list
})

const currentPage = ref(1)
const pageSize = ref(10)
watch([searchKey, directionFilter, methodFilter, timeRange], () => { currentPage.value = 1 })
const pagedData = computed(() => filtered.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))

function handleReset() {
  searchKey.value = ''; directionFilter.value = 'all'; methodFilter.value = 'all'; timeRange.value = undefined; currentPage.value = 1
}
function handleExport() { message.success(`已导出 ${filtered.value.length} 条进出记录`) }
function formatStay(min: number): string {
  if (min === 0) return '—'
  const h = Math.floor(min / 60); const m = min % 60
  return h > 0 ? `${h}小时${m}分钟` : `${m}分钟`
}
</script>

<template>
  <div class="pa-page">
    <SiteTreePanel @select="handleSiteSelect" />

    <main class="right-panel">
      <!-- 指标卡片 -->
      <section class="metric-grid">
        <article v-for="c in metrics" :key="c.key" class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" :style="{ background: c.color }"><i :class="c.icon" /></span>
            <span class="metric-title">{{ c.title }}</span>
          </div>
          <div class="metric-card__body">
            <strong class="metric-value">{{ c.value }}</strong>
            <span class="metric-sub-text">{{ c.sub }}</span>
          </div>
        </article>
      </section>

      <!-- 图表区 -->
      <section class="chart-grid">
        <div class="chart-card">
          <div class="chart-card__head"><strong>进出趋势 · 近 30 天</strong></div>
          <ECharts :option="trendOption" height="180px" />
        </div>
        <div class="chart-card">
          <div class="chart-card__head"><strong>通行方式占比</strong></div>
          <ECharts :option="methodOption" height="180px" />
        </div>
      </section>

      <!-- 台账表格 -->
      <div class="table-card">
        <div class="search-bar">
          <div class="search-row">
            <div class="search-fields">
              <div class="search-item">
                <label>方向</label>
                <a-select v-model:value="directionFilter" allow-clear placeholder="全部">
                  <a-select-option value="all">全部</a-select-option>
                  <a-select-option value="in">进场</a-select-option>
                  <a-select-option value="out">出场</a-select-option>
                </a-select>
              </div>
              <div class="search-item">
                <label>通行方式</label>
                <a-select v-model:value="methodFilter" allow-clear placeholder="全部方式">
                  <a-select-option value="all">全部方式</a-select-option>
                  <a-select-option value="plate_recognition">车牌识别</a-select-option>
                  <a-select-option value="manual">人工登记</a-select-option>
                  <a-select-option value="permit_pass">通行证</a-select-option>
                </a-select>
              </div>
              <div class="search-item">
                <label>时间</label>
                <a-range-picker v-model:value="timeRange" :allow-clear="true" />
              </div>
              <div class="search-item search-item--kw">
                <label>关键字</label>
                <a-input v-model:value="searchKey" placeholder="车牌/驾驶员/工地" allow-clear />
              </div>
              <div class="search-actions search-actions--inline">
                <button class="s-btn s-btn--primary" @click="currentPage = 1"><i class="i-ant-design-search-outlined" />查询</button>
                <button class="s-btn" @click="handleReset"><i class="i-ant-design-reload-outlined" />重置</button>
              </div>
            </div>
            <div class="search-actions search-actions--right">
              <button class="s-btn s-btn--export" @click="handleExport"><i class="i-ant-design-download-outlined" />导出</button>
            </div>
          </div>
        </div>

        <div class="table-body-wrap">
          <a-table :data-source="pagedData" :pagination="false" row-key="id" :scroll="{ x: 1300 }" size="middle" class="va-table">
            <a-table-column title="车牌" data-index="plate" :width="130" />
            <a-table-column title="车型" data-index="vehicleType" :width="110" />
            <a-table-column title="驾驶员" data-index="driver" :width="90" />
            <a-table-column title="工地" data-index="siteName" :width="150" :ellipsis="true" />
            <a-table-column title="方向" :width="80">
              <template #default="{ record }">
                <span v-if="record.direction === 'in'" style="color:#52c41a;font-weight:500">进场</span>
                <span v-else style="color:#fa8c16;font-weight:500">出场</span>
              </template>
            </a-table-column>
            <a-table-column title="闸口" data-index="gate" :width="120" />
            <a-table-column title="通行方式" :width="110">
              <template #default="{ record }">
                <span class="type-tag" :style="{ background: accessMethodMeta[record.method as AccessMethod].color + '18', color: accessMethodMeta[record.method as AccessMethod].color }">{{ accessMethodMeta[record.method as AccessMethod].label }}</span>
              </template>
            </a-table-column>
            <a-table-column title="进出时间" data-index="accessTime" :width="150" />
            <a-table-column title="停留时长" :width="120">
              <template #default="{ record }">{{ formatStay(record.stayMinutes) }}</template>
            </a-table-column>
          </a-table>
        </div>

        <div class="pagination-bar">
          <span class="page-total">共 {{ filtered.length }} 条</span>
          <a-pagination v-model:current="currentPage" v-model:page-size="pageSize" :total="filtered.length" :page-size-options="['10','20','50']" show-size-changer show-quick-jumper />
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.pa-page { height: 100%; display: flex; gap: 8px; padding: 8px; overflow: hidden; }

.right-panel { flex: 1; display: flex; flex-direction: column; gap: 8px; overflow: hidden; min-width: 0; }

/* 指标卡片 */
.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; flex-shrink: 0; }
.metric-card { background: #fff; border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;
  &__head { display: flex; align-items: center; gap: 8px; }
  &__body { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; }
}
.metric-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; i { font-size: 15px; } }
.metric-title { font-size: 12px; font-weight: 500; color: $text-secondary; }
.metric-value { font-size: 22px; font-weight: 700; color: $text-base; line-height: 1.1; }
.metric-sub-text { font-size: 11px; color: $text-muted; }

/* 图表区 */
.chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex-shrink: 0; }
.chart-card { background: #fff; border-radius: 10px; padding: 8px 14px; display: flex; flex-direction: column;
  &__head { margin-bottom: 4px; strong { font-size: 13px; font-weight: 600; color: $text-base; } }
}

/* 表格卡片 */
.table-card { flex: 1; min-height: 0; background: #fff; border: 1px solid $border-color-card; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }

/* 搜索栏 */
.search-bar { background: #fff; border-bottom: 1px solid $border-color-card; padding: 16px; flex-shrink: 0; }
.search-row { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-end; justify-content: space-between; }
.search-fields { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-end; flex: 1; }
.search-actions { display: flex; gap: 8px; flex-shrink: 0; &--inline { align-items: flex-end; } &--right { align-items: flex-end; } }
.search-item { display: flex; flex-direction: column; gap: 4px;
  label { font-size: 12px; font-weight: 500; color: $text-muted; white-space: nowrap; }
  :deep(.ant-select) { width: 160px; }
  :deep(.ant-picker) { width: 240px; }
  :deep(.ant-select-selector), :deep(.ant-input), :deep(.ant-picker) { border-radius: 6px !important; font-size: 13px; }
  &--kw { :deep(.ant-input) { width: 220px; } }
}
.s-btn { display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 16px; border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s;
  i { font-size: 14px; }
  &:hover { color: $color-primary; border-color: $color-primary; }
  &--primary { background: $color-primary; border-color: $color-primary; color: #fff; &:hover { background: $color-primary-hover; border-color: $color-primary-hover; color: #fff; } }
  &--export { border-color: $color-primary; color: $color-primary; background: $color-primary-bg; &:hover { background: $color-primary; color: #fff; } }
}

/* 表格 */
.table-body-wrap { flex: 1; min-height: 0; overflow-y: auto; overflow-x: auto; }
.va-table {
  :deep(.ant-table-thead > tr > th) { background: #fafbfc; font-size: 13px; font-weight: 600; color: $text-base; border-bottom: 1px solid $border-color-card; }
  :deep(.ant-table-tbody > tr > td) { font-size: 13px; color: $text-secondary; }
  :deep(.ant-table-tbody > tr:hover > td) { background: #faf9ff; }
}
.type-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px; }

/* 分页 */
.pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid $border-color-card; flex-shrink: 0;
  .page-total { font-size: 13px; color: $text-muted; }
  :deep(.ant-pagination-item) { border-radius: 6px; }
  :deep(.ant-pagination-item-active) { border-color: $color-primary; a { color: $color-primary; } }
}
</style>
