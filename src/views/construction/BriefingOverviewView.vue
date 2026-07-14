<script setup lang="ts">
/**
 * 班前交底总览
 * 左侧：工地列表（SiteTreePanel）
 * 右侧：4个指标卡片 + 2个图表(趋势+类型分布) + 双栏列表(今日待交底+今日已交底)
 */
import { ref, computed } from 'vue'
import ECharts from '@/components/ECharts.vue'
import {
  constructionSites
} from './posture.mock'
import {
  briefingRecords,
  briefingTypeMeta,
  briefingStatusMeta,
  buildBriefingOverviewMetrics,
  buildBriefingTrend,
  buildBriefingTypePie
} from './briefing.mock'
import SiteTreePanel from './SiteTreePanel.vue'

// ===== 左侧工地列表 =====
const selectedSiteIds = ref<Set<string>>(new Set(constructionSites.map(s => s.id)))
function handleSiteSelect(selected: { type: 'all' | 'site' | 'region'; id: string; siteIds: Set<string> }) {
  selectedSiteIds.value = selected.siteIds
}

// ===== 聚合数据 =====
const metrics = computed(() => buildBriefingOverviewMetrics(selectedSiteIds.value))

const today = '2026-07-13'
const todayRecords = computed(() =>
  briefingRecords.filter(r => selectedSiteIds.value.has(r.siteId) && r.date === today)
)

// 今日待交底（pending + missed）
const pendingBriefings = computed(() =>
  todayRecords.value.filter(r => r.status === 'pending' || r.status === 'missed').slice(0, 8)
)

// 今日已交底
const completedBriefings = computed(() =>
  todayRecords.value.filter(r => r.status === 'completed').slice(0, 8)
)

// ===== 图表 =====
const trendOption = computed(() => {
  const trend = buildBriefingTrend(selectedSiteIds.value)
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 11, color: '#8895ab' } },
    grid: { left: 36, right: 12, top: 32, bottom: 24 },
    xAxis: { type: 'category', data: trend.days, axisLine: { lineStyle: { color: '#e8e8e8' } }, axisTick: { show: false }, axisLabel: { fontSize: 10, color: '#9aa1ab' } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#f0f0f0' } }, axisLabel: { fontSize: 10, color: '#9aa1ab' } },
    series: [
      { name: '应交底', type: 'bar', data: trend.requiredCounts, barMaxWidth: 18, itemStyle: { color: '#e8eaf6', borderRadius: [4, 4, 0, 0] } },
      { name: '已交底', type: 'line', data: trend.completedCounts, smooth: true, symbol: 'circle', symbolSize: 5, lineStyle: { width: 2, color: '#6e4bff' }, itemStyle: { color: '#6e4bff' } }
    ]
  }
})

const typePieOption = computed(() => {
  const data = buildBriefingTypePie(selectedSiteIds.value)
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { type: 'scroll', bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10, color: '#8895ab' } },
    series: [{
      type: 'pie', radius: ['38%', '62%'], center: ['50%', '42%'],
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
      data
    }]
  }
})
</script>

<template>
  <div class="bo-page">
    <!-- 左侧工地列表 -->
    <SiteTreePanel @select="handleSiteSelect" />

    <!-- 右侧 -->
    <main class="right-panel">
      <!-- 指标卡片 -->
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" style="background:#6e4bff"><i class="i-ant-design-sun-outlined" /></span>
            <span class="metric-title">今日应交底</span>
          </div>
          <span class="metric-value" style="color:#6e4bff">{{ metrics.todayRequired }}</span>
        </div>
        <div class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" style="background:#52c41a"><i class="i-ant-design-check-circle-outlined" /></span>
            <span class="metric-title">今日已交底</span>
          </div>
          <span class="metric-value" style="color:#52c41a">{{ metrics.todayCompleted }}</span>
        </div>
        <div class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" style="background:#2bb3a3"><i class="i-ant-design-pie-chart-outlined" /></span>
            <span class="metric-title">本周覆盖率</span>
          </div>
          <span class="metric-value" style="color:#2bb3a3">{{ metrics.weekRate }}%</span>
        </div>
        <div class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" style="background:#ff4d4f"><i class="i-ant-design-exclamation-circle-outlined" /></span>
            <span class="metric-title">本周缺交</span>
          </div>
          <span class="metric-value" style="color:#ff4d4f">{{ metrics.missedCount }}</span>
        </div>
      </div>

      <!-- 图表 2×1 -->
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-card__head"><strong>近 7 天交底趋势</strong></div>
          <div class="chart-card__body">
            <ECharts :option="trendOption" />
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-card__head"><strong>交底类型分布</strong></div>
          <div class="chart-card__body">
            <ECharts :option="typePieOption" />
          </div>
        </div>
      </div>

      <!-- 双栏列表 -->
      <div class="list-row">
        <!-- 今日待交底 -->
        <div class="list-card">
          <div class="list-card__head">
            <strong><i class="i-ant-design-clock-circle-outlined" /> 今日待交底</strong>
            <span class="list-card__count">{{ pendingBriefings.length }} 个工地</span>
          </div>
          <div class="list-body scroll-thin">
            <article v-for="r in pendingBriefings" :key="r.id" class="brief-card">
              <span class="brief-card__type" :style="{ background: briefingTypeMeta[r.type].color + '18', color: briefingTypeMeta[r.type].color }">
                <i :class="briefingTypeMeta[r.type].icon" />{{ briefingTypeMeta[r.type].label }}
              </span>
              <div class="brief-card__body">
                <span class="brief-card__site">{{ r.siteName }}</span>
                <span class="brief-card__topic" :title="r.topic">{{ r.topic }}</span>
              </div>
              <span class="brief-card__status" :style="{ background: briefingStatusMeta[r.status].bg, color: briefingStatusMeta[r.status].color }">
                {{ briefingStatusMeta[r.status].label }}
              </span>
            </article>
            <div v-if="pendingBriefings.length === 0" class="list-empty">
              <i class="i-ant-design-check-circle-outlined" />
              <span>今日所有工地已完成交底</span>
            </div>
          </div>
        </div>

        <!-- 今日已交底 -->
        <div class="list-card">
          <div class="list-card__head">
            <strong><i class="i-ant-design-check-circle-outlined" /> 今日已交底</strong>
            <span class="list-card__count">{{ completedBriefings.length }} 条记录</span>
          </div>
          <div class="list-body scroll-thin">
            <article v-for="r in completedBriefings" :key="r.id" class="brief-card">
              <span class="brief-card__type" :style="{ background: briefingTypeMeta[r.type].color + '18', color: briefingTypeMeta[r.type].color }">
                <i :class="briefingTypeMeta[r.type].icon" />{{ briefingTypeMeta[r.type].label }}
              </span>
              <div class="brief-card__body">
                <span class="brief-card__site">{{ r.siteName }}</span>
                <span class="brief-card__topic" :title="r.topic">{{ r.topic }}</span>
              </div>
              <div class="brief-card__meta">
                <span class="brief-card__person">{{ r.briefer }}</span>
                <span class="brief-card__count-text">{{ r.actualCount }}/{{ r.requiredCount }} 人</span>
              </div>
            </article>
            <div v-if="completedBriefings.length === 0" class="list-empty">
              <i class="i-ant-design-info-circle-outlined" />
              <span>今日暂无已交底记录</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.bo-page {
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
  overflow-y: auto;
}

/* 指标卡片 */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  flex-shrink: 0;
}

.metric-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  &__head { display: flex; align-items: center; gap: 8px; min-width: 0; }
}

.metric-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  i { font-size: 18px; }
}

.metric-title { font-size: 13px; font-weight: 500; color: $text-secondary; }
.metric-value { font-size: 28px; font-weight: 700; line-height: 1; flex-shrink: 0; }

/* 图表 */
.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  flex-shrink: 0;
}

.chart-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &__head {
    height: 36px;
    display: flex;
    align-items: center;
    padding: 0 14px;
    border-bottom: 1px solid $border-color-card;
    flex-shrink: 0;
    strong { font-size: 13px; font-weight: 600; color: $text-base; }
  }

  &__body {
    flex: 1;
    min-height: 200px;
    padding: 4px 8px;
  }
}

/* 双栏列表 */
.list-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  flex-shrink: 0;
}

.list-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &__head {
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid $border-color-card;
    flex-shrink: 0;
    strong { font-size: 14px; font-weight: 600; color: $text-base; display: flex; align-items: center; gap: 6px; i { color: $color-primary; } }
  }

  &__count { font-size: 12px; color: $text-muted; }
}

.list-body {
  flex: 1;
  max-height: 320px;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.brief-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  transition: all 0.15s;

  &:hover { border-color: $color-primary; box-shadow: $shadow-card-active; }

  &__type {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 500;
    padding: 3px 8px;
    border-radius: 4px;
    white-space: nowrap;
    flex-shrink: 0;
    i { font-size: 13px; }
  }

  &__body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__site { font-size: 13px; font-weight: 500; color: $text-base; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__topic { font-size: 11px; color: $text-muted; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  &__meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    flex-shrink: 0;
  }

  &__person { font-size: 12px; color: $text-secondary; }
  &__count-text { font-size: 11px; color: $text-muted; }

  &__status {
    font-size: 11px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 4px;
    flex-shrink: 0;
    white-space: nowrap;
  }
}

.list-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 40px 0;
  color: $color-online;
  i { font-size: 28px; }
  span { font-size: 13px; }
}
</style>
