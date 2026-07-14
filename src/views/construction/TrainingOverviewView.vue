<script setup lang="ts">
/**
 * 安全培训总览
 * 左侧：工地列表（SiteTreePanel）
 * 右侧：4个指标卡片 + 2个图表(趋势+类型分布) + 双栏列表(即将开展+近期完成)
 */
import { ref, computed } from 'vue'
import ECharts from '@/components/ECharts.vue'
import {
  constructionSites
} from './posture.mock'
import {
  trainingRecords,
  trainingTypeMeta,
  trainingStatusMeta,
  buildTrainingOverviewMetrics,
  buildTrainingTrend,
  buildTrainingTypePie,
  type TrainingType,
  type TrainingStatus
} from './training.mock'
import SiteTreePanel from './SiteTreePanel.vue'

// ===== 左侧工地列表 =====
const selectedSiteIds = ref<Set<string>>(new Set(constructionSites.map(s => s.id)))
function handleSiteSelect(selected: { type: 'all' | 'site' | 'region'; id: string; siteIds: Set<string> }) {
  selectedSiteIds.value = selected.siteIds
}

// ===== 聚合数据 =====
const metrics = computed(() => buildTrainingOverviewMetrics(selectedSiteIds.value))

const siteRecords = computed(() =>
  trainingRecords.filter(r => selectedSiteIds.value.has(r.siteId))
)

// 即将开展（planned + ongoing）
const upcomingTrainings = computed(() =>
  siteRecords.value
    .filter(r => r.status === 'planned' || r.status === 'ongoing')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8)
)

// 近期完成
const recentTrainings = computed(() =>
  siteRecords.value
    .filter(r => r.status === 'completed')
    .slice(0, 8)
)

// ===== 图表 =====
const trendOption = computed(() => {
  const trend = buildTrainingTrend(selectedSiteIds.value)
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 11, color: '#8895ab' } },
    grid: { left: 36, right: 12, top: 32, bottom: 24 },
    xAxis: { type: 'category', data: trend.months, axisLine: { lineStyle: { color: '#e8e8e8' } }, axisTick: { show: false }, axisLabel: { fontSize: 10, color: '#9aa1ab' } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#f0f0f0' } }, axisLabel: { fontSize: 10, color: '#9aa1ab' } },
    series: [
      { name: '计划', type: 'bar', data: trend.plannedCounts, barMaxWidth: 18, itemStyle: { color: '#e8eaf6', borderRadius: [4, 4, 0, 0] } },
      { name: '完成', type: 'bar', data: trend.completedCounts, barMaxWidth: 18, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#7d5cff' }, { offset: 1, color: '#6e4bff' }] }, borderRadius: [4, 4, 0, 0] } }
    ]
  }
})

const typePieOption = computed(() => {
  const data = buildTrainingTypePie(selectedSiteIds.value)
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
  <div class="to-page">
    <!-- 左侧工地列表 -->
    <SiteTreePanel @select="handleSiteSelect" />

    <!-- 右侧 -->
    <main class="right-panel">
      <!-- 指标卡片 -->
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" style="background:#6e4bff"><i class="i-ant-design-calendar-outlined" /></span>
            <span class="metric-title">本月培训计划</span>
          </div>
          <span class="metric-value" style="color:#6e4bff">{{ metrics.monthPlanned }}</span>
        </div>
        <div class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" style="background:#52c41a"><i class="i-ant-design-check-circle-outlined" /></span>
            <span class="metric-title">已完成</span>
          </div>
          <span class="metric-value" style="color:#52c41a">{{ metrics.completed }}</span>
        </div>
        <div class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" style="background:#1677ff"><i class="i-ant-design-play-circle-outlined" /></span>
            <span class="metric-title">进行中</span>
          </div>
          <span class="metric-value" style="color:#1677ff">{{ metrics.ongoing }}</span>
        </div>
        <div class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" style="background:#fa8c16"><i class="i-ant-design-team-outlined" /></span>
            <span class="metric-title">培训人次(月)</span>
          </div>
          <span class="metric-value" style="color:#fa8c16">{{ metrics.totalPersons }}</span>
        </div>
      </div>

      <!-- 图表 2×1 -->
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-card__head"><strong>近 6 月培训趋势</strong></div>
          <div class="chart-card__body">
            <ECharts :option="trendOption" />
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-card__head"><strong>培训类型分布</strong></div>
          <div class="chart-card__body">
            <ECharts :option="typePieOption" />
          </div>
        </div>
      </div>

      <!-- 双栏列表 -->
      <div class="list-row">
        <!-- 即将开展 -->
        <div class="list-card">
          <div class="list-card__head">
            <strong><i class="i-ant-design-schedule-outlined" /> 即将开展</strong>
            <span class="list-card__count">{{ upcomingTrainings.length }} 项</span>
          </div>
          <div class="list-body scroll-thin">
            <article v-for="r in upcomingTrainings" :key="r.id" class="train-card">
              <span class="train-card__type" :style="{ background: trainingTypeMeta[r.type as TrainingType].color + '18', color: trainingTypeMeta[r.type as TrainingType].color }">
                <i :class="trainingTypeMeta[r.type as TrainingType].icon" />{{ trainingTypeMeta[r.type as TrainingType].label }}
              </span>
              <div class="train-card__body">
                <span class="train-card__title" :title="r.title">{{ r.title }}</span>
                <span class="train-card__site">{{ r.siteName }}</span>
              </div>
              <div class="train-card__meta">
                <span class="train-card__date">{{ r.date.substring(5) }}</span>
                <span class="train-card__status" :style="{ background: trainingStatusMeta[r.status as TrainingStatus].bg, color: trainingStatusMeta[r.status as TrainingStatus].color }">
                  {{ trainingStatusMeta[r.status as TrainingStatus].label }}
                </span>
              </div>
            </article>
            <div v-if="upcomingTrainings.length === 0" class="list-empty">
              <i class="i-ant-design-check-circle-outlined" />
              <span>暂无即将开展的培训</span>
            </div>
          </div>
        </div>

        <!-- 近期完成 -->
        <div class="list-card">
          <div class="list-card__head">
            <strong><i class="i-ant-design-check-circle-outlined" /> 近期完成</strong>
            <span class="list-card__count">{{ recentTrainings.length }} 条记录</span>
          </div>
          <div class="list-body scroll-thin">
            <article v-for="r in recentTrainings" :key="r.id" class="train-card">
              <span class="train-card__type" :style="{ background: trainingTypeMeta[r.type as TrainingType].color + '18', color: trainingTypeMeta[r.type as TrainingType].color }">
                <i :class="trainingTypeMeta[r.type as TrainingType].icon" />{{ trainingTypeMeta[r.type as TrainingType].label }}
              </span>
              <div class="train-card__body">
                <span class="train-card__title" :title="r.title">{{ r.title }}</span>
                <span class="train-card__site">{{ r.siteName }}</span>
              </div>
              <div class="train-card__meta">
                <span class="train-card__person">{{ r.trainer }}</span>
                <span class="train-card__rate">通过率 {{ r.passRate }}%</span>
              </div>
            </article>
            <div v-if="recentTrainings.length === 0" class="list-empty">
              <i class="i-ant-design-info-circle-outlined" />
              <span>暂无已完成的培训</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.to-page {
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

.train-card {
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

  &__title { font-size: 13px; font-weight: 500; color: $text-base; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__site { font-size: 11px; color: $text-muted; }

  &__meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    flex-shrink: 0;
  }

  &__date { font-size: 12px; color: $text-secondary; }
  &__person { font-size: 12px; color: $text-secondary; }
  &__rate { font-size: 11px; color: #52c41a; }

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
