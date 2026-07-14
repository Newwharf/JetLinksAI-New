<script setup lang="ts">
/**
 * 事故险肇分析
 * 概览卡片 + 未结案事故列表 + 趋势图 + 等级分布 + 类型分布 + 工地分布 + 来源对比 + 状态分布
 */
import { computed } from 'vue'
import ECharts from '@/components/ECharts.vue'
import {
  accidentLevelMeta,
  accidentTypeMeta,
  accidentStatusMeta,
  getAccidentStats,
  getUnclosedAccidents,
  getAccidentTrend,
  getLevelDistribution,
  getTypeDistribution,
  getSiteDistribution,
  getSourceComparison,
  getStatusDistribution
} from './accident-ledger.mock'

const stats = getAccidentStats()
const unclosedAccidents = getUnclosedAccidents()
const trendData = getAccidentTrend()
const levelDist = getLevelDistribution()
const typeDist = getTypeDistribution()
const siteDist = getSiteDistribution()
const sourceComp = getSourceComparison()
const statusDist = getStatusDistribution()

// 概览卡片
const statCards = computed(() => [
  { label: '事故总数', value: stats.total, icon: 'i-ant-design-alert-outlined', color: '#ff4d4f' },
  { label: '伤亡人数', value: stats.casualties, icon: 'i-ant-design-heart-outlined', color: '#fa541c' },
  { label: '重大及以上', value: stats.majorCount, icon: 'i-ant-design-warning-outlined', color: '#fa8c16' },
  { label: '未结案', value: stats.unclosedCount, icon: 'i-ant-design-clock-circle-outlined', color: '#1677ff' }
])

// 趋势折线图
const trendOption = computed(() => ({
  tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [10, 14], textStyle: { color: '#111418', fontSize: 12 } },
  grid: { left: 40, right: 16, top: 24, bottom: 32 },
  xAxis: { type: 'category', data: trendData.days, boundaryGap: false, axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#8c8c8c', fontSize: 11 } },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
  series: [{
    type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, showSymbol: true,
    data: trendData.data, itemStyle: { color: '#ff4d4f' }, lineStyle: { width: 2, color: '#ff4d4f' },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(255,77,79,0.18)' }, { offset: 1, color: 'rgba(255,77,79,0)' }] } }
  }]
}))

// 等级分布环形图
const levelOption = computed(() => ({
  tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, textStyle: { color: '#111418', fontSize: 12 } },
  legend: { bottom: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: '#3a3f47', fontSize: 12 } },
  series: [{
    type: 'pie', radius: ['45%', '70%'], center: ['50%', '42%'],
    label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 600 } },
    data: levelDist.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } }))
  }]
}))

// 类型分布柱状图
const typeOption = computed(() => ({
  tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, textStyle: { color: '#111418', fontSize: 12 }, axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(110,75,255,0.06)' } } },
  grid: { left: 8, right: 16, top: 16, bottom: 40, containLabel: true },
  xAxis: { type: 'category', data: typeDist.map(d => d.name), axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#8c8c8c', fontSize: 11, rotate: 20 } },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
  series: [{
    type: 'bar', barWidth: '50%',
    data: typeDist.map(d => ({ value: d.value, itemStyle: { color: d.color, borderRadius: [4, 4, 0, 0] } })),
    label: { show: true, position: 'top', color: '#111418', fontSize: 11 }
  }]
}))

// 工地分布排行
const siteOption = computed(() => ({
  tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, textStyle: { color: '#111418', fontSize: 12 }, axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(110,75,255,0.06)' } } },
  grid: { left: 8, right: 30, top: 8, bottom: 8, containLabel: true },
  xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
  yAxis: { type: 'category', inverse: true, data: siteDist.map(d => d.name), axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#3a3f47', fontSize: 12 } },
  series: [{
    type: 'bar', barWidth: '55%',
    data: siteDist.map(d => ({ value: d.count, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: 'rgba(110,75,255,0.45)' }, { offset: 1, color: '#6e4bff' }] }, borderRadius: [0, 4, 4, 0] } })),
    label: { show: true, position: 'right', color: '#111418', fontSize: 11, fontWeight: 600 }
  }]
}))

// 来源对比饼图
const sourceOption = computed(() => ({
  tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, textStyle: { color: '#111418', fontSize: 12 } },
  legend: { bottom: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: '#3a3f47', fontSize: 12 } },
  series: [{
    type: 'pie', radius: ['45%', '70%'], center: ['50%', '42%'],
    label: { show: false }, emphasis: { label: { show: true, fontSize: 14, fontWeight: 600 } },
    data: sourceComp.map(d => ({ name: d.name, value: d.value, itemStyle: { color: d.color } }))
  }]
}))

// 状态分布柱状图
const statusOption = computed(() => ({
  tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, textStyle: { color: '#111418', fontSize: 12 }, axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(110,75,255,0.06)' } } },
  grid: { left: 8, right: 16, top: 16, bottom: 32, containLabel: true },
  xAxis: { type: 'category', data: statusDist.map(d => d.name), axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
  series: [{
    type: 'bar', barWidth: '45%',
    data: statusDist.map(d => ({ value: d.value, itemStyle: { color: d.color, borderRadius: [4, 4, 0, 0] } })),
    label: { show: true, position: 'top', color: '#111418', fontSize: 11 }
  }]
}))
</script>

<template>
  <div class="aa-page scroll-thin">
    <!-- ① 概览统计卡片 -->
    <section class="aa-section">
      <div class="stat-grid">
        <div v-for="s in statCards" :key="s.label" class="stat-card">
          <div class="stat-icon" :style="{ background: s.color + '1a' }">
            <i :class="s.icon" :style="{ color: s.color }" />
          </div>
          <div class="stat-body">
            <span class="stat-value" :style="{ color: s.color }">{{ s.value }}</span>
            <span class="stat-label">{{ s.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ② 未结案事故列表 -->
    <section class="aa-section">
      <div class="db-card">
        <div class="card-head">
          <strong>未结案事故</strong>
          <span class="card-hint">{{ unclosedAccidents.length }} 起待处理</span>
        </div>
        <div class="unclosed-list scroll-thin">
          <article v-for="a in unclosedAccidents" :key="a.id" class="unclosed-card">
            <div class="unclosed-card__thumb">
              <img :src="a.thumb" :alt="a.title" draggable="false" />
              <span class="unclosed-card__level" :style="{ background: accidentLevelMeta[a.accidentLevel].color }">
                {{ accidentLevelMeta[a.accidentLevel].label }}
              </span>
            </div>
            <div class="unclosed-card__body">
              <span class="unclosed-card__title" :title="a.title">{{ a.title }}</span>
              <span class="unclosed-card__site">{{ a.siteName }}</span>
              <div class="unclosed-card__footer">
                <span class="unclosed-card__type" :style="{ color: accidentTypeMeta[a.accidentType].color }">
                  <i :class="accidentTypeMeta[a.accidentType].icon" />
                  {{ accidentTypeMeta[a.accidentType].label }}
                </span>
                <span class="unclosed-card__status" :style="{ background: accidentStatusMeta[a.status].bg, color: accidentStatusMeta[a.status].color }">
                  {{ accidentStatusMeta[a.status].label }}
                </span>
              </div>
              <span class="unclosed-card__time">{{ a.occurTime }}</span>
            </div>
          </article>
          <div v-if="unclosedAccidents.length === 0" class="unclosed-empty">
            <i class="i-ant-design-check-circle-outlined" />
            <span>暂无未结案事故</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ③ 事故趋势 -->
    <section class="aa-section">
      <div class="db-card">
        <div class="card-head"><strong>事故趋势 · 近 13 天</strong></div>
        <ECharts :option="trendOption" height="220px" />
      </div>
    </section>

    <!-- ④⑤ 等级分布 + 类型分布 -->
    <section class="aa-section two-col">
      <div class="db-card">
        <div class="card-head"><strong>事故等级分布</strong></div>
        <ECharts :option="levelOption" height="240px" />
      </div>
      <div class="db-card">
        <div class="card-head"><strong>事故类型分布</strong></div>
        <ECharts :option="typeOption" height="240px" />
      </div>
    </section>

    <!-- ⑥⑦⑧ 工地分布 + 来源对比 + 状态分布 -->
    <section class="aa-section three-col">
      <div class="db-card">
        <div class="card-head"><strong>工地事故排行</strong></div>
        <ECharts :option="siteOption" height="260px" />
      </div>
      <div class="db-card">
        <div class="card-head"><strong>上报来源对比</strong></div>
        <ECharts :option="sourceOption" height="260px" />
      </div>
      <div class="db-card">
        <div class="card-head"><strong>处理状态分布</strong></div>
        <ECharts :option="statusOption" height="260px" />
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.aa-page {
  height: 100%;
  background: transparent;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.aa-section {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.db-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
}

.card-head {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  strong { font-size: 15px; font-weight: 600; color: $text-base; }
  .card-hint { font-size: 12px; font-weight: 400; color: $text-muted; }
}

/* ① 概览统计 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.stat-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  i { font-size: 22px; }
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  .stat-value { font-size: 28px; font-weight: 700; line-height: 1.1; }
  .stat-label { font-size: 13px; color: $text-muted; }
}

/* ② 未结案事故列表 */
.unclosed-list {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;
  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-thumb { background: #d9e2f0; border-radius: 3px; }
}

.unclosed-card {
  flex: 0 0 220px;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    border-color: $color-primary;
    box-shadow: $shadow-card-active;
    .unclosed-card__thumb img { transform: scale(1.04); }
  }

  &__thumb {
    position: relative;
    aspect-ratio: 16 / 10;
    background: #1a1a2e;
    overflow: hidden;
    img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
  }

  &__level {
    position: absolute;
    top: 6px;
    left: 6px;
    font-size: 11px;
    font-weight: 500;
    color: #fff;
    padding: 2px 8px;
    border-radius: 4px;
  }

  &__body {
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__title {
    font-size: 13px;
    font-weight: 600;
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__site {
    font-size: 11px;
    color: $text-tertiary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 4px;
  }

  &__type {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    i { font-size: 12px; }
  }

  &__status {
    font-size: 11px;
    font-weight: 500;
    padding: 1px 6px;
    border-radius: 4px;
  }

  &__time {
    font-size: 11px;
    color: $text-muted;
  }
}

.unclosed-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 30px 0;
  color: $color-online;
  width: 100%;
  i { font-size: 28px; }
  span { font-size: 13px; }
}

/* 双列 / 三列布局 */
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.three-col {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
</style>
