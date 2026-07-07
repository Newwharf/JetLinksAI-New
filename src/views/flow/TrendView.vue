<script setup lang="ts">
/**
 * 趋势分析 - 1:1 复刻 flow-analysis/people/trends
 * 页头 + 工具栏 + KPI + 折线图 + (小时分布 | 周-日分布) + 点位明细表
 */
import ECharts from '@/components/ECharts.vue'
import dayjs, { type Dayjs } from 'dayjs'
import {
  trendKpis,
  weekdayRows,
  pointDetails,
  trendLineDays,
  trendLineIn,
  trendLineOut,
  trendLineNet,
  hourlyDistribution,
  hourlyLabels,
  type PointDetailRow
} from './mock'

// ===== 工具栏分段控件状态 =====
const flowType = ref('people') // 客流 / 车流
const groupBy = ref('all') // 全部 / 按摄像头 / 按区域
const dateRange = ref('7d') // 今日 / 昨日 / 近7日 / 近30日 / 自定义

// 当前点位名（mock）
const currentPointName = ref('全部')

// 日期范围（mock）—— a-range-picker 需要 Dayjs 对象
const dateRangeValue = ref<[Dayjs, Dayjs]>([dayjs('2026-06-26'), dayjs('2026-07-02')])

// ===== 周分布条形最大值（用于计算宽度比例）=====
const maxWeekday = computed(() => Math.max(...weekdayRows.map(r => r.value)))

// ===== 折线图配置 =====
const trendLineOption = computed(() => ({
  color: ['#6e4bff', '#1d4ed8', '#8c8c8c'],
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#fff',
    borderColor: '#f0f4f8',
    borderWidth: 1,
    borderRadius: 8,
    padding: [10, 14],
    textStyle: { color: '#111418', fontSize: 12 },
    axisPointer: { type: 'line', lineStyle: { color: '#6e4bff', type: 'dashed', width: 1 } },
    formatter: (params: any[]) => {
      const t = params[0].axisValue
      let s = `<div style="font-weight:600;margin-bottom:6px">${t}</div>`
      params.forEach((p: any) => {
        s += `<div style="display:flex;align-items:center;gap:6px;line-height:18px">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color}"></span>
          <span style="color:#8c8c8c;margin-right:8px">${p.seriesName}</span>
          <span style="font-weight:600">${p.value.toLocaleString()}</span>
        </div>`
      })
      return s
    }
  },
  legend: {
    data: ['进', '出', '净在场'],
    right: 0,
    top: 0,
    icon: 'roundRect',
    itemWidth: 10,
    itemHeight: 10,
    textStyle: { color: '#3a3f47', fontSize: 12 }
  },
  grid: { left: 48, right: 16, top: 40, bottom: 32 },
  xAxis: {
    type: 'category',
    data: trendLineDays,
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
    {
      name: '进',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      showSymbol: true,
      data: trendLineIn,
      areaStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
          { offset: 0, color: 'rgba(110,75,255,0.15)' },
          { offset: 1, color: 'rgba(110,75,255,0)' }
        ]}
      },
      lineStyle: { width: 2 }
    },
    {
      name: '出',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      showSymbol: true,
      data: trendLineOut,
      areaStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
          { offset: 0, color: 'rgba(29,78,216,0.12)' },
          { offset: 1, color: 'rgba(29,78,216,0)' }
        ]}
      },
      lineStyle: { width: 2 }
    },
    {
      name: '净在场',
      type: 'line',
      smooth: true,
      symbol: 'circle',
      symbolSize: 5,
      showSymbol: true,
      data: trendLineNet,
      lineStyle: { width: 2, type: 'dashed' }
    }
  ]
}))

// ===== 小时分布柱状图 =====
const hourlyOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#fff',
    borderColor: '#f0f4f8',
    borderWidth: 1,
    borderRadius: 8,
    textStyle: { color: '#111418', fontSize: 12 },
    axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(110,75,255,0.06)' } }
  },
  grid: { left: 44, right: 16, top: 16, bottom: 28 },
  xAxis: {
    type: 'category',
    data: hourlyLabels,
    axisLine: { lineStyle: { color: '#dbe4f1' } },
    axisTick: { show: false },
    axisLabel: { color: '#8c8c8c', fontSize: 11, interval: 2 }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#f0f4f8' } },
    axisLabel: { color: '#8c8c8c', fontSize: 12 }
  },
  series: [
    {
      type: 'bar',
      data: hourlyDistribution,
      barWidth: '55%',
      itemStyle: {
        borderRadius: [3, 3, 0, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#6e4bff' },
            { offset: 1, color: 'rgba(110,75,255,0.45)' }
          ]
        }
      }
    }
  ]
}))

// ===== 点位明细表格列 =====
const columns = [
  { title: '#', dataIndex: 'index', width: 50 },
  { title: '点位', dataIndex: 'point', ellipsis: true },
  { title: '所属区域', dataIndex: 'area', ellipsis: true },
  { title: '划线', dataIndex: 'lines', width: 60 },
  { title: '方向', dataIndex: 'direction', width: 70 },
  { title: '累计客流', dataIndex: 'total', width: 100 },
  { title: '进 / 出', dataIndex: 'inOut', width: 110 },
  { title: '当前在场', dataIndex: 'present', width: 100, customRender: ({ record }: { record: PointDetailRow }) => {
    const v = parseInt(record.present.replace(/,/g, ''))
    return h('span', { style: { color: v < 0 ? '#fa541c' : '#2bb3a3', fontWeight: 600 } }, record.present)
  }},
  { title: '高峰时段', dataIndex: 'peak', width: 180 }
]
</script>

<template>
  <div class="flow-trend-page">
    <!-- 页头 -->
    <header class="cloud-page-header">
      <h1>趋势分析</h1>
    </header>

    <!-- 工具栏 -->
    <section class="flow-trend-toolbar">
      <!-- 左侧主筛选 -->
      <div class="toolbar__main">
        <a-segmented v-model:value="flowType" :options="[
          { label: '客流', value: 'people' },
          { label: '车流', value: 'vehicle', disabled: true }
        ]" />
        <a-segmented v-model:value="groupBy" :options="[
          { label: '全部', value: 'all' },
          { label: '按摄像头', value: 'camera' },
          { label: '按区域', value: 'area' }
        ]" />
        <strong class="toolbar__point">{{ currentPointName }}</strong>
      </div>
      <!-- 右侧时间筛选 + 操作 -->
      <div class="toolbar__actions">
        <a-segmented v-model:value="dateRange" :options="[
          { label: '今日', value: 'today' },
          { label: '昨日', value: 'yesterday' },
          { label: '近7日', value: '7d' },
          { label: '近30日', value: '30d' },
          { label: '自定义', value: 'custom' }
        ]" />
        <a-range-picker v-model:value="dateRangeValue" style="width: 264px" />
        <button class="toolbar__btn">
          <i class="i-ant-design-search-outlined" />
          <span>查询</span>
        </button>
        <button class="toolbar__btn">
          <i class="i-ant-design-reload-outlined" />
          <span>重置</span>
        </button>
      </div>
    </section>

    <!-- KPI 卡片 -->
    <section class="flow-trend-kpis">
      <article v-for="(kpi, i) in trendKpis" :key="i" class="flow-trend-kpi">
        <strong class="kpi__value">{{ kpi.value }}</strong>
        <small class="kpi__sub">{{ kpi.sub }}</small>
      </article>
    </section>

    <!-- 客流趋势折线图 -->
    <section class="flow-trend-card">
      <div class="card__head">
        <strong>客流趋势 · 进 / 出 / 净在场</strong>
      </div>
      <div class="trend-chart">
        <ECharts :option="trendLineOption" height="288px" />
      </div>
    </section>

    <!-- 小时分布 + 周-日分布 -->
    <div class="flow-trend-grid">
      <!-- 小时分布 -->
      <section class="flow-trend-card">
        <div class="card__head">
          <strong>小时分布</strong>
        </div>
        <div class="trend-chart">
          <ECharts :option="hourlyOption" height="288px" />
        </div>
      </section>

      <!-- 周-日分布对比 -->
      <section class="flow-trend-card">
        <div class="card__head">
          <strong class="title-accent">周-日分布对比</strong>
        </div>
        <div class="flow-trend-weekday">
          <!-- 汇总 -->
          <div class="weekday__summary">
            <div class="summary__item">
              <strong class="summary__value">3,795</strong>
              <small class="summary__sub">5 天 · 高峰 16:00-17:00 / 17:00-18:00</small>
            </div>
            <div class="summary__item">
              <strong class="summary__value summary__value--weekend">683</strong>
              <small class="summary__sub">2 天 · 高峰 16:00-17:00 / 17:00-18:00</small>
            </div>
          </div>
          <!-- 条形行 -->
          <div class="weekday__rows">
            <div
              v-for="row in weekdayRows"
              :key="row.day"
              class="weekday__row"
              :class="{ 'is-weekend': row.weekend }"
            >
              <span class="row__label">{{ row.day }}</span>
              <div class="row__bar-track">
                <div
                  class="row__bar"
                  :class="{ 'row__bar--weekend': row.weekend }"
                  :style="{ width: (row.value / maxWeekday * 100) + '%' }"
                />
              </div>
              <strong class="row__value" :class="{ 'row__value--weekend': row.weekend }">{{ row.display }}</strong>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 点位明细表 -->
    <section class="flow-trend-card">
      <div class="card__head">
        <strong>点位明细</strong>
      </div>
      <a-table
        :columns="columns"
        :data-source="pointDetails"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        size="middle"
        :scroll="{ x: 1200 }"
        row-key="key"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'point'">
            <div class="cell-point">
              <span class="cell-point__name">{{ record.point }}</span>
              <span class="cell-point__id">{{ record.pointId }}</span>
            </div>
          </template>
          <template v-else-if="column.dataIndex === 'present'">
            <span
              class="cell-present"
              :class="{ 'is-neg': parseInt(record.present.replace(/,/g, '')) < 0 }"
            >{{ record.present }}</span>
          </template>
        </template>
      </a-table>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.flow-trend-page {
  height: 100%;
  background: transparent;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  color: $text-base;
}

/* 页头 */
.cloud-page-header {
  flex-shrink: 0;

  h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 650;
    color: $text-base;
    line-height: 1.4;
  }
}

/* 工具栏 */
.flow-trend-toolbar {
  flex-shrink: 0;
  background: #fff;
  border-radius: 14px;
  padding: 17px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.toolbar__main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar__point {
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
}

.toolbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar__btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 14px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  color: $text-base;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;

  i {
    font-size: 13px;
  }

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
  }

  &:first-of-type {
    background: $color-primary;
    border-color: $color-primary;
    color: #fff;

    &:hover {
      background: $color-primary-hover;
    }
  }
}

/* KPI */
.flow-trend-kpis {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.flow-trend-kpi {
  background: #fff;
  border-radius: 14px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.kpi__value {
  font-size: 26px;
  font-weight: 650;
  color: $text-base;
  line-height: 1.2;
}

.kpi__sub {
  font-size: 13px;
  color: #8c8c8c;
  line-height: 1.4;
}

/* 卡片通用 */
.flow-trend-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
}

.card__head {
  margin-bottom: 12px;

  strong {
    font-size: 16px;
    font-weight: 600;
    color: $text-base;
  }

  .title-accent {
    color: $color-primary;
  }
}

.trend-chart {
  flex: 1;
  min-height: 0;
}

/* 两列网格 */
.flow-trend-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

/* 周-日分布 */
.flow-trend-weekday {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.weekday__summary {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f4f8;
}

.summary__item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.summary__value {
  font-size: 30px;
  font-weight: 650;
  color: $text-base;
  line-height: 1.2;

  &--weekend {
    color: #1d4ed8;
  }
}

.summary__sub {
  font-size: 13px;
  color: #8c8c8c;
}

.weekday__rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.weekday__row {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 24px;
}

.row__label {
  width: 36px;
  font-size: 13px;
  color: $text-secondary;
  flex-shrink: 0;
}

.row__bar-track {
  flex: 1;
  height: 14px;
  background: #f0f4f8;
  border-radius: 999px;
  overflow: hidden;
}

.row__bar {
  height: 100%;
  background: $color-primary;
  border-radius: 999px;
  transition: width 0.3s;

  &--weekend {
    background: #1d4ed8;
  }
}

.row__value {
  width: 60px;
  text-align: right;
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
  flex-shrink: 0;

  &--weekend {
    color: #1d4ed8;
  }
}

/* 表格单元格 */
.cell-point {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__name {
    font-size: 14px;
    color: $text-base;
  }

  &__id {
    font-size: 12px;
    color: $text-tertiary;
  }
}

.cell-present {
  font-weight: 600;

  &.is-neg {
    color: #fa541c;
  }
}

:deep(.ant-table) {
  border-radius: 8px 8px 0 0;
}
</style>
