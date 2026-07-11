<script setup lang="ts">
/**
 * 工地仪表盘
 * ① 顶部指标  ② 安全评分排行+安全事件趋势/事件  ③ 风险预警
 * ④ 设备告警+设备健康  ⑤ 活跃人员趋势+最近活跃人员
 */
import ECharts from '@/components/ECharts.vue'
import {
  topMetrics,
  siteSafetyRanks,
  safetyTrendDays,
  safetyEventTrendSeries,
  recentSafetyEvents,
  riskTrendSeries,
  recentRiskEvents,
  deviceAlarmTrendSeries,
  deviceHealthDays,
  deviceHealthTrendSeries,
  workerTrend,
  recentWorkers,
  type DeviceStat,
  type SafetyLevel,
  type RiskLevel
} from './dashboard.mock'

// ===== ① 顶部指标卡片 =====
function onlineRate(s: DeviceStat): number {
  if (s.total === 0) return 0
  return Math.round((s.online / s.total) * 1000) / 10
}

const metricCards = computed(() => [
  {
    key: 'site',
    title: '工地总数',
    icon: 'i-ant-design-environment-outlined',
    color: '#6e4bff',
    value: topMetrics.siteCount,
    sub: null as null | DeviceStat
  },
  {
    key: 'worker',
    title: '活跃工人数',
    icon: 'i-ant-design-team-outlined',
    color: '#2bb3a3',
    value: topMetrics.activeWorkers,
    sub: null as null | DeviceStat
  },
  {
    key: 'gateway',
    title: '网关数',
    icon: 'i-ant-design-cloud-server-outlined',
    color: '#faad14',
    value: topMetrics.gateway.total,
    sub: topMetrics.gateway
  },
  {
    key: 'video',
    title: '视频数',
    icon: 'i-ant-design-video-camera-outlined',
    color: '#1d4ed8',
    value: topMetrics.video.total,
    sub: topMetrics.video
  },
  {
    key: 'device',
    title: '设备数',
    icon: 'i-ant-design-api-outlined',
    color: '#f97316',
    value: topMetrics.device.total,
    sub: topMetrics.device
  }
])

// ===== ② 安全评分排行：评分颜色（与安全报告页统一紫色调配色）=====
function scoreColor(score: number): string {
  if (score < 70) return '#ff4d4f'
  if (score < 80) return '#925ce0'
  return '#2bb3a3'
}

// ===== ③ 安全事件识别趋势 =====
const safetyTrendOption = computed(() => ({
  color: ['#6e4bff', '#1d4ed8', '#faad14', '#ff4d4f'],
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
  legend: {
    data: safetyEventTrendSeries.map(s => s.name),
    right: 0,
    top: 0,
    icon: 'roundRect',
    itemWidth: 10,
    itemHeight: 10,
    textStyle: { color: '#3a3f47', fontSize: 12 }
  },
  grid: { left: 44, right: 16, top: 40, bottom: 32 },
  xAxis: {
    type: 'category',
    data: safetyTrendDays,
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
  series: safetyEventTrendSeries.map(s => ({
    name: s.name,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    showSymbol: true,
    data: s.data,
    lineStyle: { width: 2 }
  }))
}))

// ===== ⑤ 风险预警趋势 =====
const riskTrendOption = computed(() => ({
  color: ['#ff4d4f', '#faad14', '#6e4bff'],
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#fff',
    borderColor: '#f0f4f8',
    borderWidth: 1,
    borderRadius: 8,
    padding: [10, 14],
    textStyle: { color: '#111418', fontSize: 12 },
    axisPointer: { type: 'line', lineStyle: { color: '#ff4d4f', type: 'dashed', width: 1 } }
  },
  legend: {
    data: riskTrendSeries.map(s => s.name),
    right: 0,
    top: 0,
    icon: 'roundRect',
    itemWidth: 10,
    itemHeight: 10,
    textStyle: { color: '#3a3f47', fontSize: 12 }
  },
  grid: { left: 44, right: 16, top: 40, bottom: 32 },
  xAxis: {
    type: 'category',
    data: safetyTrendDays,
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
  series: riskTrendSeries.map(s => ({
    name: s.name,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    showSymbol: true,
    data: s.data,
    lineStyle: { width: 2 }
  }))
}))

// ===== ⑦ 设备告警趋势 =====
const deviceAlarmOption = computed(() => ({
  color: ['#ff4d4f', '#faad14', '#6e4bff'],
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#fff',
    borderColor: '#f0f4f8',
    borderWidth: 1,
    borderRadius: 8,
    padding: [10, 14],
    textStyle: { color: '#111418', fontSize: 12 },
    axisPointer: { type: 'line', lineStyle: { color: '#ff4d4f', type: 'dashed', width: 1 } }
  },
  legend: {
    data: deviceAlarmTrendSeries.map(s => s.name),
    right: 0,
    top: 0,
    icon: 'roundRect',
    itemWidth: 10,
    itemHeight: 10,
    textStyle: { color: '#3a3f47', fontSize: 12 }
  },
  grid: { left: 44, right: 16, top: 40, bottom: 32 },
  xAxis: {
    type: 'category',
    data: safetyTrendDays,
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
  series: deviceAlarmTrendSeries.map(s => ({
    name: s.name,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    showSymbol: true,
    data: s.data,
    lineStyle: { width: 2 }
  }))
}))

// ===== ⑧ 设备健康趋势 =====
const deviceHealthOption = computed(() => ({
  color: ['#faad14', '#1d4ed8', '#2bb3a3'],
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#fff',
    borderColor: '#f0f4f8',
    borderWidth: 1,
    borderRadius: 8,
    padding: [10, 14],
    textStyle: { color: '#111418', fontSize: 12 },
    axisPointer: { type: 'line', lineStyle: { color: '#2bb3a3', type: 'dashed', width: 1 } }
  },
  legend: {
    data: deviceHealthTrendSeries.map(s => s.name),
    right: 0,
    top: 0,
    icon: 'roundRect',
    itemWidth: 10,
    itemHeight: 10,
    textStyle: { color: '#3a3f47', fontSize: 12 }
  },
  grid: { left: 44, right: 16, top: 40, bottom: 32 },
  xAxis: {
    type: 'category',
    data: deviceHealthDays,
    boundaryGap: false,
    axisLine: { lineStyle: { color: '#dbe4f1' } },
    axisTick: { show: false },
    axisLabel: { color: '#8c8c8c', fontSize: 12 }
  },
  yAxis: {
    type: 'value',
    min: 80,
    max: 100,
    splitLine: { lineStyle: { color: '#f0f4f8' } },
    axisLabel: { color: '#8c8c8c', fontSize: 12, formatter: '{value}%' }
  },
  series: deviceHealthTrendSeries.map(s => ({
    name: s.name,
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    showSymbol: true,
    data: s.data,
    lineStyle: { width: 2 }
  }))
}))

// ===== ⑨ 活跃人员趋势（柱状）=====
const workerTrendOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#fff',
    borderColor: '#f0f4f8',
    borderWidth: 1,
    borderRadius: 8,
    padding: [10, 14],
    textStyle: { color: '#111418', fontSize: 12 },
    axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(43,179,163,0.06)' } }
  },
  grid: { left: 48, right: 16, top: 24, bottom: 32 },
  xAxis: {
    type: 'category',
    data: workerTrend.days,
    axisLine: { lineStyle: { color: '#dbe4f1' } },
    axisTick: { show: false },
    axisLabel: { color: '#8c8c8c', fontSize: 12 }
  },
  yAxis: {
    type: 'value',
    min: 0,
    max: 1500,
    interval: 500,
    splitLine: { lineStyle: { color: '#f0f4f8' } },
    axisLabel: { color: '#8c8c8c', fontSize: 12 }
  },
  series: [
    {
      type: 'bar',
      data: workerTrend.data,
      barWidth: '46%',
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#2bb3a3' },
            { offset: 1, color: 'rgba(43,179,163,0.35)' }
          ]
        }
      }
    }
  ]
}))

// ===== 环比文本 =====
function deltaText(d: number) {
  return (d > 0 ? '+' : '') + d.toFixed(1) + '%'
}

// ===== 级别 tag 配色 =====
const safetyLevelClass: Record<SafetyLevel, string> = {
  紧急: 'is-urgent',
  警告: 'is-warning',
  提示: 'is-info'
}
const riskLevelClass: Record<RiskLevel, string> = {
  高风险: 'is-urgent',
  中风险: 'is-warning',
  低风险: 'is-info'
}
</script>

<template>
  <div class="cd-page">
    <!-- ① 顶部指标区 -->
    <section class="cd-section">
      <div class="metric-grid">
        <article
          v-for="card in metricCards"
          :key="card.key"
          class="metric-card"
        >
          <div class="metric-card__head">
            <span class="metric-icon" :style="{ background: card.color }">
              <i :class="card.icon" />
            </span>
            <span class="metric-title">{{ card.title }}</span>
          </div>
          <div class="metric-card__body">
            <strong class="metric-value">{{ card.value.toLocaleString() }}</strong>
            <div v-if="card.sub" class="metric-sub">
              <span class="metric-sub__item">
                <i class="dot is-online" />
                在线 <strong>{{ card.sub.online }}</strong>
              </span>
              <span class="metric-sub__item">
                <i class="dot is-offline" />
                离线 <strong>{{ card.sub.offline }}</strong>
              </span>
            </div>
          </div>
          <div v-if="card.sub" class="metric-progress">
            <div class="metric-progress__track">
              <div class="metric-progress__bar" :style="{ width: onlineRate(card.sub) + '%', background: card.color }" />
            </div>
            <span class="metric-progress__rate">{{ onlineRate(card.sub) }}% 在线</span>
          </div>
        </article>
      </div>
    </section>

    <!-- ② 中间区域：安全评分排行 + 安全事件趋势/事件 -->
    <section class="cd-section">
      <div class="mid-grid">
        <!-- 左侧：安全评分排行 -->
        <div class="cd-card rank-card">
          <div class="cd-card__head">
            <strong>工地安全评分排行</strong>
            <span class="cd-card__hint">评分最低前 10</span>
          </div>
          <div class="rank-list scroll-thin">
            <article
              v-for="item in siteSafetyRanks"
              :key="item.rank"
              class="rank-item"
            >
              <span class="rank-item__no" :class="{ 'is-top': item.rank <= 3 }">{{ item.rank }}</span>
              <div class="rank-item__info">
                <span class="rank-item__name" :title="item.siteName">{{ item.siteName }}</span>
                <span class="rank-item__meta">
                  近 30 日 {{ item.incidentCount }} 件
                  <em
                    class="rank-item__trend"
                    :class="{ 'is-up': item.trend > 0, 'is-down': item.trend < 0 }"
                  >
                    <i :class="item.trend > 0 ? 'i-ant-design-arrow-up-outlined' : 'i-ant-design-arrow-down-outlined'" />
                    {{ Math.abs(item.trend) }}
                  </em>
                </span>
              </div>
              <div class="rank-item__score" :style="{ color: scoreColor(item.score) }">
                {{ item.score }}
                <small>分</small>
              </div>
            </article>
          </div>
        </div>

        <!-- 右侧上：安全事件趋势 -->
        <div class="cd-card">
          <div class="cd-card__head">
            <strong>安全事件识别趋势 · 近 7 日</strong>
          </div>
          <ECharts :option="safetyTrendOption" height="220px" />
        </div>

        <!-- 右侧下：最近安全事件 -->
        <div class="cd-card">
          <div class="cd-card__head">
            <strong>最近安全事件</strong>
            <span class="cd-card__hint">含识别截图</span>
          </div>
          <div class="event-stream scroll-thin">
            <article
              v-for="e in recentSafetyEvents"
              :key="e.id"
              class="event-card"
            >
              <div class="event-card__thumb">
                <img :src="e.thumb" :alt="e.title" draggable="false" />
                <span class="event-card__level" :class="safetyLevelClass[e.level]">{{ e.level }}</span>
              </div>
              <div class="event-card__title" :title="e.title">{{ e.title }}</div>
              <div class="event-card__meta">
                <span class="event-card__site">{{ e.site }}</span>
                <span class="event-card__time">
                  <i class="i-ant-design-clock-circle-outlined" />
                  {{ e.time }}
                </span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <!-- ③ 风险预警板块 -->
    <section class="cd-section">
      <div class="duo-grid">
        <div class="cd-card">
          <div class="cd-card__head">
            <strong>风险预警趋势 · 近 7 日</strong>
          </div>
          <ECharts :option="riskTrendOption" height="240px" />
        </div>
        <div class="cd-card">
          <div class="cd-card__head">
            <strong>最近风险事件</strong>
            <span class="cd-card__hint">含识别截图</span>
          </div>
          <div class="event-stream scroll-thin">
            <article
              v-for="r in recentRiskEvents"
              :key="r.id"
              class="event-card"
            >
              <div class="event-card__thumb">
                <img :src="r.thumb" :alt="r.title" draggable="false" />
                <span class="event-card__level" :class="riskLevelClass[r.level]">{{ r.level }}</span>
              </div>
              <div class="event-card__title" :title="r.title">{{ r.title }}</div>
              <div class="event-card__meta">
                <span class="event-card__site">{{ r.site }}</span>
                <span class="event-card__time">
                  <i class="i-ant-design-clock-circle-outlined" />
                  {{ r.time }}
                </span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <!-- ④ 设备告警和设备健康 -->
    <section class="cd-section">
      <div class="duo-grid">
        <div class="cd-card">
          <div class="cd-card__head">
            <strong>设备告警趋势 · 近 7 日</strong>
          </div>
          <ECharts :option="deviceAlarmOption" height="240px" />
        </div>
        <div class="cd-card">
          <div class="cd-card__head">
            <strong>设备健康趋势 · 近 7 日</strong>
          </div>
          <ECharts :option="deviceHealthOption" height="240px" />
        </div>
      </div>
    </section>

    <!-- ⑤ 活跃人员 -->
    <section class="cd-section">
      <div class="duo-grid">
        <div class="cd-card">
          <div class="cd-card__head">
            <strong>活跃人员趋势 · 近 7 日</strong>
            <span class="cd-kpi">
              今日 <strong>{{ workerTrend.today.toLocaleString() }}</strong>
              <em class="cd-delta" :class="{ 'is-up': workerTrend.delta > 0, 'is-down': workerTrend.delta < 0 }">
                <i :class="workerTrend.delta > 0 ? 'i-ant-design-arrow-up-outlined' : 'i-ant-design-arrow-down-outlined'" />
                {{ deltaText(workerTrend.delta) }}
              </em>
            </span>
          </div>
          <ECharts :option="workerTrendOption" class="worker-chart" />
        </div>
        <div class="cd-card">
          <div class="cd-card__head">
            <strong>最近识别活跃人员</strong>
            <span class="cd-card__hint">含识别截图</span>
          </div>
          <div class="worker-gallery">
            <article
              v-for="w in recentWorkers"
              :key="w.id"
              class="worker-item"
            >
              <div class="worker-item__thumb">
                <img :src="w.thumb" :alt="w.name" draggable="false" />
              </div>
              <div class="worker-item__meta">
                <span class="worker-item__name">{{ w.name }}</span>
                <span class="worker-item__role">{{ w.role }}</span>
                <span class="worker-item__site">{{ w.site }}</span>
                <span class="worker-item__time">
                  <i class="i-ant-design-clock-circle-outlined" />
                  {{ w.time }}
                </span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.cd-page {
  height: 100%;
  background: transparent;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  color: $text-base;
}

/* 区块 */
.cd-section {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 卡片通用 */
.cd-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
}

.cd-card__head {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  strong {
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
  }

  .cd-card__hint {
    font-size: 12px;
    font-weight: 400;
    color: $text-muted;
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

  &__head {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__body {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }
}

.metric-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;

  i {
    font-size: 20px;
  }
}

.metric-title {
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
}

.metric-value {
  font-size: 28px;
  font-weight: 650;
  color: $text-base;
  line-height: 1.1;
}

.metric-sub {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;

  &__item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: $text-secondary;

    strong {
      font-weight: 600;
      color: $text-base;
    }
  }
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;

  &.is-online { background: $color-online; }
  &.is-offline { background: #bfbfbf; }
}

.metric-progress {
  display: flex;
  align-items: center;
  gap: 12px;

  &__track {
    flex: 1;
    height: 6px;
    background: #f0f4f8;
    border-radius: 999px;
    overflow: hidden;
  }

  &__bar {
    height: 100%;
    border-radius: 999px;
    transition: width 0.4s;
  }

  &__rate {
    font-size: 12px;
    color: $text-muted;
    white-space: nowrap;
  }
}

/* ===== ② 中间区域 ===== */
.mid-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 8px;
}

/* 排行卡片跨两行 */
.rank-card {
  grid-row: span 2;
}

/* 安全评分排行列表 */
.rank-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0 -4px;
  padding: 0 4px;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: $bg-hover;
  }

  &__no {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 600;
    color: $text-muted;
    background: #f0f4f8;
    flex-shrink: 0;

    &.is-top {
      color: #fff;
      background: linear-gradient(135deg, #ff6b6b, #ff4d4f);
    }
  }

  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
  }

  &__name {
    font-size: 13px;
    font-weight: 500;
    color: $text-base;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: $text-muted;
  }

  &__trend {
    font-style: normal;
    display: inline-flex;
    align-items: center;
    gap: 1px;
    font-size: 11px;

    i { font-size: 10px; }

    &.is-up { color: $color-online; }
    &.is-down { color: #ff4d4f; }
  }

  &__score {
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    flex-shrink: 0;

    small {
      font-size: 11px;
      font-weight: 400;
      color: $text-muted;
      margin-left: 1px;
    }
  }
}

/* ===== 通用左右两栏 ===== */
.duo-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

/* 活跃人员趋势图：自适应填满卡片剩余高度 */
.worker-chart {
  flex: 1;
  min-height: 0;
}

/* ===== 事件流（横向滚动卡片）===== */
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

    .event-card__thumb img {
      transform: scale(1.04);
    }
  }

  &__thumb {
    position: relative;
    aspect-ratio: 16 / 10;
    background: #1a1a2e;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }
  }

  &__level {
    position: absolute;
    top: 6px;
    left: 6px;
    font-size: 11px;
    font-weight: 500;
    padding: 2px 7px;
    border-radius: 3px;
    color: #fff;
    line-height: 1.4;

    &.is-urgent { background: #ff4d4f; }
    &.is-warning { background: #faad14; }
    &.is-info { background: $color-online; }
  }

  &__title {
    font-size: 13px;
    font-weight: 500;
    color: $text-base;
    padding: 8px 10px 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    padding: 0 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  &__site {
    font-size: 11px;
    color: $text-tertiary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__time {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: $text-muted;

    i { font-size: 11px; }
  }
}

/* ===== ⑤ 活跃人员 ===== */
.cd-kpi {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: $text-muted;

  strong {
    font-size: 18px;
    font-weight: 650;
    color: $text-base;
  }
}

.cd-delta {
  font-style: normal;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 500;

  i { font-size: 11px; }

  &.is-up { color: #ff4d4f; }
  &.is-down { color: $color-online; }
}

.worker-gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.worker-item {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    .worker-item__thumb {
      border-color: $color-primary;
      box-shadow: $shadow-card-active;
    }
  }

  &__thumb {
    position: relative;
    aspect-ratio: 4 / 3;
    border-radius: 8px;
    overflow: hidden;
    background: #1a1a2e;
    border: 1px solid transparent;
    transition: all 0.2s;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  &__meta {
    padding: 6px 2px 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-size: 13px;
    font-weight: 500;
    color: $text-base;
  }

  &__role {
    font-size: 11px;
    color: $color-primary;
    font-weight: 500;
  }

  &__site {
    font-size: 11px;
    color: $text-tertiary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__time {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: $text-muted;

    i { font-size: 11px; }
  }
}
</style>
