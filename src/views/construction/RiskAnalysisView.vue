<script setup lang="ts">
/**
 * 风险隐患分析看板
 * ① 顶部指标  ② 类别分布+等级饼图+状态环形图  ③ 趋势+整改效率  ④ 工地排行+来源占比  ⑤ 最近重大隐患
 */
import ECharts from '@/components/ECharts.vue'
import {
  riskMetrics,
  categoryDistribution,
  riskLevelDistribution,
  statusDistribution,
  trendData,
  siteRanking,
  sourceDistribution,
  recentMajorHazards
} from './risk-analysis.mock'

// ===== ① 顶部指标卡 =====
const metricCards = computed(() => [
  { key: 'total', title: '隐患总数', icon: 'i-ant-design-alert-outlined', color: '#6e4bff', value: riskMetrics.total, sub: `${riskMetrics.majorCount} 条重大` },
  { key: 'major', title: '未闭合重大隐患', icon: 'i-ant-design-fire-outlined', color: '#ff4d4f', value: riskMetrics.majorUnclosed, sub: '需重点关注' },
  { key: 'pending', title: '待评估', icon: 'i-ant-design-clock-circle-outlined', color: '#8c8c8c', value: riskMetrics.pendingCount, sub: '等待处理' },
  { key: 'rectifying', title: '整改中', icon: 'i-ant-design-tool-outlined', color: '#fa8c16', value: riskMetrics.rectifyingCount, sub: '正在整改' },
  { key: 'rate', title: '整改完成率', icon: 'i-ant-design-check-circle-outlined', color: '#52c41a', value: riskMetrics.closeRate + '%', sub: `${riskMetrics.closedCount} 条已关闭` }
])

// ===== ② 隐患类别分布（水平条形图）=====
const categoryOption = computed(() => ({
  tooltip: {
    trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12],
    textStyle: { color: '#111418', fontSize: 12 },
    axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(110,75,255,0.06)' } }
  },
  grid: { left: 4, right: 36, top: 8, bottom: 8, containLabel: true },
  xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
  yAxis: {
    type: 'category', inverse: true,
    data: categoryDistribution.map(c => c.name),
    axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false },
    axisLabel: { color: '#3a3f47', fontSize: 12 }
  },
  series: [{
    type: 'bar',
    data: categoryDistribution.map(c => ({
      value: c.count,
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [
          { offset: 0, color: c.color + '73' }, { offset: 1, color: c.color }
        ] }
      }
    })),
    barWidth: '52%',
    label: { show: true, position: 'right', color: '#111418', fontSize: 12, fontWeight: 600 }
  }]
}))

// ===== ③ 风险等级分布（饼图）=====
const riskLevelOption = computed(() => ({
  tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12], textStyle: { color: '#111418', fontSize: 12 } },
  legend: { bottom: 0, icon: 'circle', itemWidth: 10, itemHeight: 10, textStyle: { color: '#3a3f47', fontSize: 12 } },
  series: [{
    type: 'pie', radius: ['45%', '70%'], center: ['50%', '42%'],
    avoidLabelOverlap: true,
    label: { show: true, formatter: '{b}\n{c}条', fontSize: 12, color: '#3a3f47' },
    labelLine: { length: 8, length2: 8 },
    data: riskLevelDistribution.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } }))
  }]
}))

// ===== ④ 流程状态分布（环形图）=====
const statusOption = computed(() => ({
  tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12], textStyle: { color: '#111418', fontSize: 12 } },
  legend: { bottom: 0, icon: 'circle', itemWidth: 10, itemHeight: 10, textStyle: { color: '#3a3f47', fontSize: 12 } },
  series: [{
    type: 'pie', radius: '65%', center: ['50%', '42%'],
    label: { show: true, formatter: '{b}\n{c}条', fontSize: 12, color: '#3a3f47' },
    data: statusDistribution.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } }))
  }]
}))

// ===== ⑤ 上报趋势（折线图）=====
const trendDays = trendData.map(d => d.date)
const trendOption = computed(() => ({
  color: ['#ff4d4f', '#fa8c16', '#52c41a'],
  tooltip: {
    trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [10, 14],
    textStyle: { color: '#111418', fontSize: 12 },
    axisPointer: { type: 'line', lineStyle: { color: '#6e4bff', type: 'dashed', width: 1 } }
  },
  legend: { data: ['重大', '一般', '轻微'], right: 0, top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: '#3a3f47', fontSize: 12 } },
  grid: { left: 44, right: 16, top: 40, bottom: 32 },
  xAxis: { type: 'category', data: trendDays, boundaryGap: false, axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
  series: [
    { name: '重大', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, showSymbol: false, data: trendData.map(d => d.major), lineStyle: { width: 2 } },
    { name: '一般', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, showSymbol: false, data: trendData.map(d => d.general), lineStyle: { width: 2 } },
    { name: '轻微', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, showSymbol: false, data: trendData.map(d => d.minor), lineStyle: { width: 2 } }
  ]
}))

// ===== ⑥ 整改效率趋势（上报 vs 整改）=====
const efficiencyOption = computed(() => ({
  color: ['#6e4bff', '#52c41a'],
  tooltip: {
    trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [10, 14],
    textStyle: { color: '#111418', fontSize: 12 },
    axisPointer: { type: 'line', lineStyle: { color: '#6e4bff', type: 'dashed', width: 1 } }
  },
  legend: { data: ['上报数', '整改完成'], right: 0, top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: '#3a3f47', fontSize: 12 } },
  grid: { left: 44, right: 16, top: 40, bottom: 32 },
  xAxis: { type: 'category', data: trendDays, axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
  series: [
    {
      name: '上报数', type: 'bar', barWidth: '40%',
      data: trendData.map(d => d.total),
      itemStyle: { borderRadius: [3, 3, 0, 0], color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#6e4bff' }, { offset: 1, color: 'rgba(110,75,255,0.3)' }] } }
    },
    { name: '整改完成', type: 'line', smooth: true, symbol: 'circle', symbolSize: 5, showSymbol: false, data: trendData.map(d => d.closed), lineStyle: { width: 2, color: '#52c41a' }, itemStyle: { color: '#52c41a' } }
  ]
}))

// ===== ⑦ 工地隐患排行（水平条形图）=====
const siteOption = computed(() => ({
  tooltip: {
    trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12],
    textStyle: { color: '#111418', fontSize: 12 },
    axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(110,75,255,0.06)' } }
  },
  grid: { left: 4, right: 36, top: 8, bottom: 8, containLabel: true },
  xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
  yAxis: {
    type: 'category', inverse: true,
    data: siteRanking.map(s => s.name),
    axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false },
    axisLabel: { color: '#3a3f47', fontSize: 12 }
  },
  series: [{
    type: 'bar', barWidth: '52%',
    data: siteRanking.map(s => s.count),
    itemStyle: {
      borderRadius: [0, 4, 4, 0],
      color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [
        { offset: 0, color: 'rgba(110,75,255,0.35)' }, { offset: 1, color: '#6e4bff' }
      ] }
    },
    label: { show: true, position: 'right', color: '#111418', fontSize: 12, fontWeight: 600 }
  }]
}))

// ===== ⑧ 上报来源占比（饼图）=====
const sourceOption = computed(() => ({
  tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12], textStyle: { color: '#111418', fontSize: 12 } },
  legend: { bottom: 0, icon: 'circle', itemWidth: 10, itemHeight: 10, textStyle: { color: '#3a3f47', fontSize: 12 } },
  series: [{
    type: 'pie', radius: ['45%', '70%'], center: ['50%', '42%'],
    label: { show: true, formatter: '{b}\n{c}条', fontSize: 12, color: '#3a3f47' },
    labelLine: { length: 8, length2: 8 },
    data: sourceDistribution.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } }))
  }]
}))
</script>

<template>
  <div class="ra-page">
    <!-- ① 顶部指标卡 -->
    <section class="ra-section">
      <div class="metric-grid">
        <article v-for="card in metricCards" :key="card.key" class="metric-card">
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
      </div>
    </section>

    <!-- ② 最近重大隐患 -->
    <section class="ra-section">
      <div class="ra-card">
        <div class="ra-card__head">
          <strong>最近重大隐患</strong>
          <span class="ra-card__hint">未整改 / 未关闭</span>
        </div>
        <div class="event-stream scroll-thin">
          <article v-for="h in recentMajorHazards" :key="h.id" class="event-card">
            <div class="event-card__thumb">
              <img :src="h.thumb" :alt="h.title" draggable="false" />
              <span class="event-card__level is-urgent">重大</span>
            </div>
            <div class="event-card__title" :title="h.title">{{ h.title }}</div>
            <div class="event-card__meta">
              <span class="event-card__site">{{ h.siteName }}</span>
              <span class="event-card__time">
                <i class="i-ant-design-clock-circle-outlined" />
                {{ h.reportTime.substring(5) }}
              </span>
            </div>
          </article>
          <div v-if="recentMajorHazards.length === 0" class="stream-empty">暂无未关闭的重大隐患</div>
        </div>
      </div>
    </section>

    <!-- ③ 类别分布 + 等级饼图 + 状态环形图 -->
    <section class="ra-section">
      <div class="tri-grid">
        <div class="ra-card">
          <div class="ra-card__head"><strong>隐患类别分布</strong></div>
          <ECharts :option="categoryOption" height="280px" />
        </div>
        <div class="ra-card">
          <div class="ra-card__head"><strong>风险等级分布</strong></div>
          <ECharts :option="riskLevelOption" height="280px" />
        </div>
        <div class="ra-card">
          <div class="ra-card__head"><strong>流程状态分布</strong></div>
          <ECharts :option="statusOption" height="280px" />
        </div>
      </div>
    </section>

    <!-- ③ 上报趋势 + 整改效率 -->
    <section class="ra-section">
      <div class="duo-grid">
        <div class="ra-card">
          <div class="ra-card__head"><strong>隐患上报趋势 · 近 30 天</strong></div>
          <ECharts :option="trendOption" height="260px" />
        </div>
        <div class="ra-card">
          <div class="ra-card__head"><strong>整改效率 · 上报 vs 整改</strong></div>
          <ECharts :option="efficiencyOption" height="260px" />
        </div>
      </div>
    </section>

    <!-- ④ 工地排行 + 来源占比 -->
    <section class="ra-section">
      <div class="duo-grid">
        <div class="ra-card">
          <div class="ra-card__head"><strong>各工地隐患数量排行</strong></div>
          <ECharts :option="siteOption" height="280px" />
        </div>
        <div class="ra-card">
          <div class="ra-card__head"><strong>上报来源占比</strong></div>
          <ECharts :option="sourceOption" height="280px" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.ra-page {
  height: 100%;
  background: transparent;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  color: $text-base;
}

.ra-section {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ra-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;

  &__head {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    strong { font-size: 15px; font-weight: 600; color: $text-base; }
    .ra-card__hint { font-size: 12px; font-weight: 400; color: $text-muted; }
  }
}

/* ===== ① 顶部指标 ===== */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.metric-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  &__head { display: flex; align-items: center; gap: 10px; }
  &__body { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
}

.metric-icon {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0;
  i { font-size: 20px; }
}

.metric-title { font-size: 14px; font-weight: 600; color: $text-base; }
.metric-value { font-size: 28px; font-weight: 650; color: $text-base; line-height: 1.1; }
.metric-sub-text { font-size: 12px; color: $text-muted; }

/* ===== ② 三栏 ===== */
.tri-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

/* ===== 通用两栏 ===== */
.duo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

/* ===== 事件流 ===== */
.event-stream {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.event-card {
  flex: 0 0 170px;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: $color-primary;
    box-shadow: $shadow-card-active;
    .event-card__thumb img { transform: scale(1.04); }
  }

  &__thumb {
    position: relative;
    aspect-ratio: 16 / 10;
    background: #1a1a2e;
    overflow: hidden;
    img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
  }

  &__level {
    position: absolute; top: 6px; left: 6px;
    font-size: 11px; font-weight: 500; padding: 2px 7px; border-radius: 3px; color: #fff; line-height: 1.4;
    &.is-urgent { background: #ff4d4f; }
  }

  &__title { font-size: 13px; font-weight: 500; color: $text-base; padding: 8px 10px 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__meta { padding: 0 10px 10px; display: flex; flex-direction: column; gap: 3px; }
  &__site { font-size: 11px; color: $text-tertiary; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__time { display: flex; align-items: center; gap: 4px; font-size: 11px; color: $text-muted; i { font-size: 11px; } }
}

.stream-empty { padding: 40px 0; text-align: center; color: $text-muted; font-size: 13px; }
</style>
