<script setup lang="ts">
/**
 * 客流/车流趋势分析仪表盘
 * 聚焦关键指标、趋势变化、点位排行和点位明细。
 */
import ECharts from '@/components/ECharts.vue'

type StatMode = 'people' | 'vehicle'
type TrendRange = 'today' | '7d'
type RankingRange = 'today' | '7d'

interface PointStat {
  key: string
  name: string
  in: number
  out: number
  peak: string
}

interface DashboardData {
  unit: string
  totalLabel: string
  peakLabel: string
  pointLabel: string
  cameraLabel: string
  total: number
  todayIn: number
  todayOut: number
  yoy: number
  peakValue: number
  peakHour: string
  pointCount: number
  cameraCount: number
  todayInSeries: number[]
  todayOutSeries: number[]
  sevenDayLabels: string[]
  sevenDayInSeries: number[]
  sevenDayOutSeries: number[]
  todayRanking: PointStat[]
  sevenDayRanking: PointStat[]
}

const mode = ref<StatMode>('people')
const trendRange = ref<TrendRange>('today')
const rankingRange = ref<RankingRange>('today')

const hourLabels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

const datasets: Record<StatMode, DashboardData> = {
  people: {
    unit: '人',
    totalLabel: '今日累计总客流',
    peakLabel: '今日高峰峰值客流',
    pointLabel: '当前配置点位个数',
    cameraLabel: '摄像头个数',
    total: 20341,
    todayIn: 10866,
    todayOut: 9475,
    yoy: 12.8,
    peakValue: 1585,
    peakHour: '16:00-17:00',
    pointCount: 18,
    cameraCount: 15,
    todayInSeries: [8, 5, 4, 3, 4, 11, 45, 320, 780, 920, 760, 650, 710, 680, 860, 1120, 1585, 1320, 940, 620, 310, 150, 60, 25],
    todayOutSeries: [6, 4, 3, 2, 3, 8, 32, 180, 420, 650, 690, 580, 620, 710, 790, 980, 1180, 1510, 1220, 730, 410, 190, 75, 22],
    sevenDayLabels: ['07-04', '07-05', '07-06', '07-07', '07-08', '07-09', '07-10'],
    sevenDayInSeries: [3420, 1980, 1240, 2860, 3220, 2980, 10866],
    sevenDayOutSeries: [3105, 1720, 1080, 2740, 2980, 2870, 9475],
    todayRanking: [
      { key: 'p1', name: '东门入口', in: 8742, out: 0, peak: '08:00-09:00' },
      { key: 'p2', name: '西门通道', in: 2601, out: 2717, peak: '17:00-18:00' },
      { key: 'p3', name: '研发部办公区主通道', in: 1988, out: 1818, peak: '10:00-11:00' },
      { key: 'p4', name: '产品部原机房位置', in: 1135, out: 1330, peak: '15:00-16:00' },
      { key: 'p5', name: '电梯厅', in: 636, out: 588, peak: '09:00-10:00' }
    ],
    sevenDayRanking: [
      { key: 'p1', name: '东门入口', in: 38560, out: 3120, peak: '08:00-09:00' },
      { key: 'p2', name: '西门通道', in: 18220, out: 19046, peak: '17:00-18:00' },
      { key: 'p3', name: '研发部办公区主通道', in: 13918, out: 12726, peak: '10:00-11:00' },
      { key: 'p4', name: '产品部原机房位置', in: 7945, out: 9310, peak: '15:00-16:00' },
      { key: 'p5', name: '电梯厅', in: 4452, out: 4116, peak: '09:00-10:00' }
    ]
  },
  vehicle: {
    unit: '辆',
    totalLabel: '今日累计总车流',
    peakLabel: '今日高峰峰值车流',
    pointLabel: '当前配置车流点位',
    cameraLabel: '摄像头个数',
    total: 5248,
    todayIn: 2784,
    todayOut: 2464,
    yoy: -4.6,
    peakValue: 438,
    peakHour: '18:00-19:00',
    pointCount: 11,
    cameraCount: 9,
    todayInSeries: [3, 2, 2, 1, 2, 6, 22, 180, 280, 210, 150, 120, 135, 160, 190, 240, 310, 380, 438, 255, 160, 90, 38, 12],
    todayOutSeries: [2, 2, 1, 1, 2, 4, 15, 90, 165, 180, 130, 110, 128, 142, 170, 210, 288, 350, 410, 300, 190, 95, 42, 14],
    sevenDayLabels: ['07-04', '07-05', '07-06', '07-07', '07-08', '07-09', '07-10'],
    sevenDayInSeries: [1820, 1640, 1190, 2310, 2480, 2605, 2784],
    sevenDayOutSeries: [1710, 1595, 1040, 2100, 2328, 2510, 2464],
    todayRanking: [
      { key: 'v1', name: '东门车行入口', in: 980, out: 642, peak: '08:00-09:00' },
      { key: 'v2', name: '地下车库入口', in: 714, out: 620, peak: '18:00-19:00' },
      { key: 'v3', name: '西门车行通道', in: 488, out: 532, peak: '17:00-18:00' },
      { key: 'v4', name: '访客停车区入口', in: 350, out: 310, peak: '10:00-11:00' },
      { key: 'v5', name: '货运通道', in: 252, out: 360, peak: '14:00-15:00' }
    ],
    sevenDayRanking: [
      { key: 'v1', name: '东门车行入口', in: 6860, out: 4494, peak: '08:00-09:00' },
      { key: 'v2', name: '地下车库入口', in: 4998, out: 4340, peak: '18:00-19:00' },
      { key: 'v3', name: '西门车行通道', in: 3416, out: 3724, peak: '17:00-18:00' },
      { key: 'v4', name: '访客停车区入口', in: 2450, out: 2170, peak: '10:00-11:00' },
      { key: 'v5', name: '货运通道', in: 1764, out: 2520, peak: '14:00-15:00' }
    ]
  }
}

const currentData = computed(() => datasets[mode.value])
const rankingRows = computed(() => rankingRange.value === 'today' ? currentData.value.todayRanking : currentData.value.sevenDayRanking)
const detailRows = computed(() => currentData.value.todayRanking)

const trendLabels = computed(() => trendRange.value === 'today' ? hourLabels : currentData.value.sevenDayLabels)
const trendIn = computed(() => trendRange.value === 'today' ? currentData.value.todayInSeries : currentData.value.sevenDayInSeries)
const trendOut = computed(() => trendRange.value === 'today' ? currentData.value.todayOutSeries : currentData.value.sevenDayOutSeries)
const trendNet = computed(() => {
  let net = 0
  return trendIn.value.map((value, index) => {
    net += value - trendOut.value[index]
    return Math.max(net, 0)
  })
})

function formatNumber(value: number) {
  return value.toLocaleString()
}

function totalOf(row: PointStat) {
  return row.in + row.out
}

function ratioPercent(row: PointStat, type: 'in' | 'out') {
  const total = totalOf(row)
  if (!total) return '0%'
  return `${(row[type] / total * 100).toFixed(1)}%`
}

const trendOption = computed(() => ({
  color: ['#6e4bff', '#1d4ed8', '#16a34a'],
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#fff',
    borderColor: '#eef2f7',
    borderWidth: 1,
    padding: [10, 14],
    textStyle: { color: '#111418', fontSize: 12 },
    axisPointer: { type: 'line', lineStyle: { color: '#6e4bff', type: 'dashed' } }
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
  grid: { left: 46, right: 18, top: 42, bottom: 30 },
  xAxis: {
    type: 'category',
    data: trendLabels.value,
    boundaryGap: false,
    axisLine: { lineStyle: { color: '#dbe4f1' } },
    axisTick: { show: false },
    axisLabel: { color: '#8c8c8c', fontSize: 11, interval: trendRange.value === 'today' ? 2 : 0 }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#f0f4f8' } },
    axisLabel: { color: '#8c8c8c', fontSize: 12 }
  },
  series: [
    { name: '进', type: 'line', smooth: true, symbolSize: 5, data: trendIn.value, lineStyle: { width: 2 } },
    { name: '出', type: 'line', smooth: true, symbolSize: 5, data: trendOut.value, lineStyle: { width: 2 } },
    { name: '净在场', type: 'line', smooth: true, symbolSize: 4, data: trendNet.value, lineStyle: { width: 2, type: 'dashed' } }
  ]
}))

const rankingOption = computed(() => {
  const rows = rankingRows.value
  return {
    color: ['#6e4bff'],
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#fff',
      borderColor: '#eef2f7',
      borderWidth: 1,
      textStyle: { color: '#111418', fontSize: 12 }
    },
    grid: { left: 96, right: 20, top: 14, bottom: 20 },
    xAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: '#f0f4f8' } },
      axisLabel: { color: '#8c8c8c', fontSize: 12 }
    },
    yAxis: {
      type: 'category',
      inverse: true,
      data: rows.map(row => row.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#3a3f47', fontSize: 12, width: 86, overflow: 'truncate' }
    },
    series: [
      {
        name: mode.value === 'people' ? '总客流' : '总车流',
        type: 'bar',
        data: rows.map(row => totalOf(row)),
        barWidth: 14,
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#6e4bff' },
              { offset: 1, color: '#21c4c0' }
            ]
          }
        }
      }
    ]
  }
})
</script>

<template>
  <div class="flow-dashboard-page">
    <header class="dashboard-head">
      <div>
        <h1>{{ mode === 'people' ? '客流趋势分析' : '车流趋势分析' }}</h1>
        <span>{{ mode === 'people' ? '全面分析园区人员进出、峰值和点位贡献' : '全面分析园区车辆进出、峰值和点位贡献' }}</span>
      </div>
      <div class="mode-switch">
        <button :class="{ active: mode === 'people' }" @click="mode = 'people'">客流</button>
        <button :class="{ active: mode === 'vehicle' }" @click="mode = 'vehicle'">车流</button>
      </div>
    </header>

    <section class="metric-grid">
      <article class="metric-card metric-card--primary">
        <div class="metric-icon">
          <i class="i-ant-design-team-outlined" />
        </div>
        <div class="metric-content">
          <span>{{ currentData.totalLabel }}</span>
          <strong>{{ formatNumber(currentData.total) }}</strong>
          <small>
            进 {{ formatNumber(currentData.todayIn) }} / 出 {{ formatNumber(currentData.todayOut) }}
            <em :class="{ down: currentData.yoy < 0 }">同比昨日 {{ currentData.yoy > 0 ? '+' : '' }}{{ currentData.yoy }}%</em>
          </small>
        </div>
      </article>
      <article class="metric-card metric-card--peak">
        <div class="metric-icon">
          <i class="i-ant-design-line-chart-outlined" />
        </div>
        <div class="metric-content">
          <span>{{ currentData.peakLabel }}</span>
          <strong>{{ formatNumber(currentData.peakValue) }}</strong>
          <small>最高峰 {{ currentData.peakHour }} · 瞬时 {{ formatNumber(currentData.peakValue) }} {{ currentData.unit }}</small>
        </div>
      </article>
      <article class="metric-card metric-card--point">
        <div class="metric-icon">
          <i class="i-ant-design-environment-outlined" />
        </div>
        <div class="metric-content">
          <span>{{ currentData.pointLabel }}</span>
          <strong>{{ currentData.pointCount }}</strong>
          <small>{{ currentData.cameraLabel }} {{ currentData.cameraCount }} 个</small>
        </div>
      </article>
    </section>

    <section class="analysis-grid">
      <article class="panel trend-panel">
        <header class="panel-head">
          <strong>{{ mode === 'people' ? '客流趋势曲线' : '车流趋势曲线' }}</strong>
          <div class="mini-segment">
            <button :class="{ active: trendRange === 'today' }" @click="trendRange = 'today'">今日</button>
            <button :class="{ active: trendRange === '7d' }" @click="trendRange = '7d'">近7日</button>
          </div>
        </header>
        <ECharts :option="trendOption" height="270px" />
      </article>

      <article class="panel ranking-panel">
        <header class="panel-head">
          <strong>{{ mode === 'people' ? '点位客流排行' : '点位车流排行' }}</strong>
          <div class="mini-segment">
            <button :class="{ active: rankingRange === 'today' }" @click="rankingRange = 'today'">今日</button>
            <button :class="{ active: rankingRange === '7d' }" @click="rankingRange = '7d'">近7天</button>
          </div>
        </header>
        <ECharts :option="rankingOption" height="270px" />
      </article>
    </section>

    <section class="panel detail-panel">
      <header class="panel-head">
        <strong>{{ mode === 'people' ? '点位明细' : '车流点位明细' }}</strong>
      </header>
      <div class="detail-list">
        <article v-for="row in detailRows" :key="row.key" class="detail-row">
          <div class="detail-name">
            <strong>{{ row.name }}</strong>
            <span>{{ mode === 'people' ? '客流点位' : '车流点位' }}</span>
          </div>
          <div class="ratio-cell">
            <div class="ratio-bar">
              <div class="ratio-in" :style="{ width: ratioPercent(row, 'in') }" />
              <div class="ratio-out" :style="{ width: ratioPercent(row, 'out') }" />
            </div>
            <div class="ratio-text">
              <span>进 {{ formatNumber(row.in) }}</span>
              <span>出 {{ formatNumber(row.out) }}</span>
            </div>
          </div>
          <div class="detail-total">
            <span>{{ mode === 'people' ? '总客流' : '总车流' }}</span>
            <strong>{{ formatNumber(totalOf(row)) }}</strong>
          </div>
          <div class="detail-peak">
            <span>高峰时段</span>
            <strong>{{ row.peak }}</strong>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.flow-dashboard-page {
  height: 100%;
  padding: 8px;
  background: $bg-page;
  color: $text-base;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}

.dashboard-head {
  min-height: 54px;
  padding: 0 14px 0 16px;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  h1 {
    margin: 0 0 3px;
    color: $text-base;
    font-size: 16px;
    font-weight: 650;
  }

  span {
    color: $text-tertiary;
    font-size: 13px;
  }
}

.mode-switch,
.mini-segment {
  padding: 3px;
  border-radius: 6px;
  background: $bg-page;
  display: flex;
  align-items: center;
  gap: 2px;

  button {
    height: 28px;
    min-width: 56px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: $text-secondary;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;

    &.active {
      background: #fff;
      color: $color-primary;
      box-shadow: 0 1px 4px rgba(20, 22, 30, 0.08);
      font-weight: 600;
    }
  }
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.metric-card {
  position: relative;
  min-height: 104px;
  padding: 16px 18px;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 14px;
  overflow: hidden;
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: $color-primary-bg;
  color: $color-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  i {
    font-size: 24px;
  }
}

.metric-card--peak .metric-icon {
  background: rgba(33, 196, 192, 0.12);
  color: #0f9f9a;
}

.metric-card--point .metric-icon {
  background: rgba(29, 78, 216, 0.1);
  color: #1d4ed8;
}

.metric-content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;

  span {
    color: $text-secondary;
    font-size: 13px;
  }

  strong {
    color: $text-base;
    font-size: 28px;
    font-weight: 700;
    line-height: 1.15;
  }

  small {
    color: $text-tertiary;
    font-size: 13px;
    line-height: 1.5;
  }

  em {
    margin-left: 10px;
    color: #16a34a;
    font-style: normal;
    font-weight: 600;

    &.down {
      color: #fa541c;
    }
  }
}

.analysis-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.trend-panel {
  grid-column: span 2;
}

.ranking-panel {
  grid-column: span 1;
}

.panel {
  border: 1px solid $border-color-card;
  border-radius: 12px;
  background: #fff;
  padding: 14px 16px;
}

.panel-head {
  height: 32px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  strong {
    color: $text-base;
    font-size: 15px;
    font-weight: 650;
  }
}

.mini-segment button {
  height: 26px;
  min-width: 54px;
  font-size: 12px;
}

.detail-panel {
  padding-bottom: 10px;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-row {
  min-height: 64px;
  padding: 8px 12px;
  border: 1px solid rgb(235, 237, 240);
  border-radius: 8px;
  display: grid;
  grid-template-columns: minmax(220px, 1.1fr) minmax(360px, 2fr) 112px 92px;
  align-items: center;
  gap: 18px;
  background: #fff;
  transition: background 0.15s, border-color 0.15s;

  &:hover {
    border-color: rgba(110, 75, 255, 0.24);
    background: #fbfcff;
  }
}

.detail-name {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;

  strong {
    color: $text-base;
    font-size: 14px;
    font-weight: 650;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  span {
    color: $text-tertiary;
    font-size: 12px;
  }
}

.ratio-cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ratio-bar {
  height: 12px;
  border-radius: 999px;
  background: $bg-page;
  overflow: hidden;
  display: flex;
}

.ratio-in {
  height: 100%;
  background: #6e4bff;
}

.ratio-out {
  height: 100%;
  background: #21c4c0;
}

.ratio-text {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: $text-tertiary;
  font-size: 12px;
}

.detail-total,
.detail-peak {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: right;

  span {
    color: $text-muted;
    font-size: 12px;
  }

  strong {
    color: $text-base;
    font-size: 15px;
    font-weight: 700;
  }
}

.detail-peak strong {
  font-size: 14px;
}

@media (max-width: 1280px) {
  .analysis-grid {
    grid-template-columns: 1fr;
  }

  .trend-panel,
  .ranking-panel {
    grid-column: span 1;
  }

  .detail-row {
    grid-template-columns: minmax(180px, 1fr) minmax(280px, 1.4fr) 100px 86px;
  }
}
</style>
