<script setup lang="ts">
/**
 * 工作台（综合仪表盘）
 * 设备接入总览 / 告警分析 / 最近告警事件 / 识别趋势 / 最近出现人员车辆
 */
import ECharts from '@/components/ECharts.vue'
import {
  deviceStats,
  alarmTrendDays,
  alarmTrendSeries,
  alarmRegionBars,
  recentAlarms,
  personTrend,
  vehicleTrend,
  recentPersons,
  recentVehicles,
  type DeviceStat,
  type AlarmLevel
} from './mock'

// ===== ① 设备总览：在线率 =====
function onlineRate(s: DeviceStat): number {
  if (s.total === 0) return 0
  return Math.round((s.online / s.total) * 1000) / 10
}
const deviceCards = computed(() => [
  {
    key: 'gateway',
    title: '网关设备',
    icon: 'i-ant-design-cloud-server-outlined',
    color: '#faad14',
    stat: deviceStats.gateway,
    rate: onlineRate(deviceStats.gateway)
  },
  {
    key: 'video',
    title: '视频设备',
    icon: 'i-ant-design-video-camera-outlined',
    color: '#6e4bff',
    stat: deviceStats.video,
    rate: onlineRate(deviceStats.video)
  },
  {
    key: 'iot',
    title: '物联设备',
    icon: 'i-ant-design-api-outlined',
    color: '#2bb3a3',
    stat: deviceStats.iot,
    rate: onlineRate(deviceStats.iot)
  }
])

// ===== ② 告警趋势：多序列折线 =====
const alarmTrendOption = computed(() => ({
  color: ['#6e4bff', '#1d4ed8', '#2bb3a3', '#faad14'],
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
    data: alarmTrendSeries.map(s => s.name),
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
    data: alarmTrendDays,
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
  series: alarmTrendSeries.map(s => ({
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

// 区域告警分布：水平条形
const alarmRegionOption = computed(() => ({
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
  grid: { left: 4, right: 36, top: 8, bottom: 8, containLabel: true },
  xAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: '#f0f4f8' } },
    axisLabel: { color: '#8c8c8c', fontSize: 12 }
  },
  yAxis: {
    type: 'category',
    inverse: true,
    data: alarmRegionBars.map(r => r.region),
    axisLine: { lineStyle: { color: '#dbe4f1' } },
    axisTick: { show: false },
    axisLabel: { color: '#3a3f47', fontSize: 12 }
  },
  series: [
    {
      type: 'bar',
      data: alarmRegionBars.map(r => r.count),
      barWidth: '52%',
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: 'rgba(110,75,255,0.45)' },
            { offset: 1, color: '#6e4bff' }
          ]
        }
      },
      label: {
        show: true,
        position: 'right',
        color: '#111418',
        fontSize: 12,
        fontWeight: 600
      }
    }
  ]
}))

// ===== ④ 识别趋势：单序列面积折线 =====
function recognitionOption(days: string[], data: number[], color: string, rgba: (a: number) => string) {
  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#f0f4f8',
      borderWidth: 1,
      borderRadius: 8,
      padding: [10, 14],
      textStyle: { color: '#111418', fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color, type: 'dashed', width: 1 } }
    },
    grid: { left: 44, right: 16, top: 16, bottom: 32 },
    xAxis: {
      type: 'category',
      data: days,
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
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: true,
        data,
        itemStyle: { color },
        lineStyle: { width: 2, color },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: rgba(0.18) },
              { offset: 1, color: rgba(0) }
            ]
          }
        }
      }
    ]
  }
}
const personTrendOption = computed(() =>
  recognitionOption(personTrend.days, personTrend.data, '#6e4bff', (a: number) => `rgba(110,75,255,${a})`)
)
const vehicleTrendOption = computed(() =>
  recognitionOption(vehicleTrend.days, vehicleTrend.data, '#1d4ed8', (a: number) => `rgba(29,78,216,${a})`)
)

// ===== 环比：涨/跌显示 =====
function deltaText(d: number) {
  return (d > 0 ? '+' : '') + d.toFixed(1) + '%'
}

// ===== 告警级别 tag 配色 =====
const levelClass: Record<AlarmLevel, string> = {
  紧急: 'is-urgent',
  警告: 'is-warning',
  提示: 'is-info'
}
</script>

<template>
  <div class="dashboard-page">
    <!-- ① 设备接入总览 -->
    <section class="db-section">
      <div class="device-grid">
        <article
          v-for="card in deviceCards"
          :key="card.key"
          class="device-card"
        >
          <div class="device-card__head">
            <span class="device-icon" :style="{ background: card.color }">
              <i :class="card.icon" />
            </span>
            <span class="device-title">{{ card.title }}</span>
          </div>
          <div class="device-card__stats">
            <div class="stat-main">
              <strong class="stat-main__value">{{ card.stat.total }}</strong>
              <small class="stat-main__label">接入总数</small>
            </div>
            <div class="stat-sub">
              <span class="stat-sub__item">
                <i class="dot is-online" />
                在线 <strong>{{ card.stat.online }}</strong>
              </span>
              <span class="stat-sub__item">
                <i class="dot is-offline" />
                离线 <strong>{{ card.stat.offline }}</strong>
              </span>
            </div>
          </div>
          <div class="device-progress">
            <div class="device-progress__track">
              <div class="device-progress__online" :style="{ width: card.rate + '%', background: card.color }" />
            </div>
            <span class="device-progress__rate">{{ card.rate }}% 在线</span>
          </div>
        </article>
      </div>
    </section>

    <!-- ② 告警分析 -->
    <section class="db-section">
      <div class="alarm-grid">
        <div class="db-card alarm-trend">
          <div class="db-card__head">
            <strong>告警趋势 · 近 7 日</strong>
          </div>
          <ECharts :option="alarmTrendOption" height="260px" />
        </div>
        <div class="db-card alarm-region">
          <div class="db-card__head">
            <strong>区域告警分布</strong>
          </div>
          <ECharts :option="alarmRegionOption" height="260px" />
        </div>
      </div>
    </section>

    <!-- ③ 最近告警事件 -->
    <section class="db-section">
      <div class="db-card alarm-stream-card">
        <div class="db-card__head">
          <strong>最近告警事件</strong>
          <span class="db-card__hint">含视频截图</span>
        </div>
        <div class="alarm-stream">
          <article
            v-for="a in recentAlarms"
            :key="a.id"
            class="alarm-card"
          >
            <div class="alarm-card__thumb">
              <img :src="a.thumb" :alt="a.title" draggable="false" />
              <span class="alarm-card__level" :class="levelClass[a.level]">{{ a.level }}</span>
            </div>
            <div class="alarm-card__title" :title="a.title">{{ a.title }}</div>
            <div class="alarm-card__meta">
              <span class="alarm-card__area">{{ a.area }}</span>
              <span class="alarm-card__time">
                <i class="i-ant-design-clock-circle-outlined" />
                {{ a.time }}
              </span>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ④ 识别趋势 -->
    <section class="db-section">
      <div class="rec-grid">
        <div class="db-card">
          <div class="db-card__head rec-head">
            <strong>人员识别趋势</strong>
            <span class="rec-kpi">
              今日 <strong>{{ personTrend.today.toLocaleString() }}</strong>
              <em class="rec-delta" :class="{ 'is-up': personTrend.delta > 0, 'is-down': personTrend.delta < 0 }">
                <i :class="personTrend.delta > 0 ? 'i-ant-design-arrow-up-outlined' : 'i-ant-design-arrow-down-outlined'" />
                {{ deltaText(personTrend.delta) }}
              </em>
            </span>
          </div>
          <ECharts :option="personTrendOption" height="220px" />
        </div>
        <div class="db-card">
          <div class="db-card__head rec-head">
            <strong>车辆识别趋势</strong>
            <span class="rec-kpi">
              今日 <strong>{{ vehicleTrend.today.toLocaleString() }}</strong>
              <em class="rec-delta" :class="{ 'is-up': vehicleTrend.delta > 0, 'is-down': vehicleTrend.delta < 0 }">
                <i :class="vehicleTrend.delta > 0 ? 'i-ant-design-arrow-up-outlined' : 'i-ant-design-arrow-down-outlined'" />
                {{ deltaText(vehicleTrend.delta) }}
              </em>
            </span>
          </div>
          <ECharts :option="vehicleTrendOption" height="220px" />
        </div>
      </div>
    </section>

    <!-- ⑤ 最近出现人员 / 车辆 -->
    <section class="db-section">
      <div class="recent-grid">
        <div class="db-card">
          <div class="db-card__head">
            <strong>最近出现人员</strong>
          </div>
          <div class="gallery">
            <article
              v-for="p in recentPersons"
              :key="p.id"
              class="gallery-item"
            >
              <div class="gallery-item__thumb">
                <img :src="p.thumb" alt="人员截图" draggable="false" />
              </div>
              <div class="gallery-item__meta">
                <span class="gallery-item__area">{{ p.area }}</span>
                <span class="gallery-item__time">
                  <i class="i-ant-design-clock-circle-outlined" />
                  {{ p.time }}
                </span>
              </div>
            </article>
          </div>
        </div>
        <div class="db-card">
          <div class="db-card__head">
            <strong>最近出现车辆</strong>
          </div>
          <div class="gallery">
            <article
              v-for="v in recentVehicles"
              :key="v.id"
              class="gallery-item"
            >
              <div class="gallery-item__thumb">
                <img :src="v.thumb" alt="车辆截图" draggable="false" />
                <span class="gallery-item__plate">{{ v.plate }}</span>
              </div>
              <div class="gallery-item__meta">
                <span class="gallery-item__plate-text">
                  {{ v.plate }} · {{ v.color }}
                </span>
                <span class="gallery-item__area">{{ v.area }}</span>
                <span class="gallery-item__time">
                  <i class="i-ant-design-clock-circle-outlined" />
                  {{ v.time }}
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

.dashboard-page {
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
.db-section {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 卡片通用 */
.db-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
}

.db-card__head {
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

  .db-card__hint {
    font-size: 12px;
    font-weight: 400;
    color: $text-muted;
  }
}

/* ===== ① 设备总览 ===== */
.device-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.device-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.device-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.device-icon {
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

.device-title {
  font-size: 15px;
  font-weight: 600;
  color: $text-base;
}

.device-card__stats {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
}

.stat-main {
  display: flex;
  flex-direction: column;
  gap: 2px;

  &__value {
    font-size: 30px;
    font-weight: 650;
    color: $text-base;
    line-height: 1.1;
  }

  &__label {
    font-size: 12px;
    color: $text-muted;
  }
}

.stat-sub {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-end;

  &__item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
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

  &.is-online {
    background: $color-online;
  }

  &.is-offline {
    background: #bfbfbf;
  }
}

.device-progress {
  display: flex;
  align-items: center;
  gap: 12px;

  &__track {
    flex: 1;
    height: 8px;
    background: #f0f4f8;
    border-radius: 999px;
    overflow: hidden;
  }

  &__online {
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

/* ===== ② 告警分析 ===== */
.alarm-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 8px;
}

/* ===== ③ 最近告警事件 ===== */
.alarm-stream-card {
  padding: 16px 20px;
}

.alarm-stream {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 4px;

  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #d9e2f0;
    border-radius: 3px;
  }
}

.alarm-card {
  flex: 0 0 168px;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: $color-primary;
    box-shadow: $shadow-card-active;

    .alarm-card__thumb img {
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

    &.is-urgent {
      background: #ff4d4f;
    }
    &.is-warning {
      background: #faad14;
    }
    &.is-info {
      background: $color-online;
    }
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

  &__time {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: $text-muted;

    i {
      font-size: 11px;
    }
  }

  &__area {
    font-size: 11px;
    color: $text-tertiary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

/* ===== ④ 识别趋势 ===== */
.rec-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.rec-head {
  margin-bottom: 8px;
}

.rec-kpi {
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

.rec-delta {
  font-style: normal;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 500;

  i {
    font-size: 11px;
  }

  &.is-up {
    color: #ff4d4f;
  }
  &.is-down {
    color: $color-online;
  }
}

/* ===== ⑤ 最近出现 ===== */
.recent-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.gallery-item {
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    .gallery-item__thumb {
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

  &__plate {
    position: absolute;
    bottom: 6px;
    left: 6px;
    font-size: 11px;
    font-weight: 500;
    padding: 1px 6px;
    border-radius: 3px;
    color: #fff;
    background: rgba(0, 21, 136, 0.85);
    font-family: 'Courier New', monospace;
    letter-spacing: 0.5px;
  }

  &__meta {
    padding: 6px 2px 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__plate-text {
    font-size: 12px;
    font-weight: 500;
    color: $text-base;
    font-family: 'Courier New', monospace;
    letter-spacing: 0.3px;
  }

  &__time {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: $text-muted;

    i {
      font-size: 11px;
    }
  }

  &__area {
    font-size: 11px;
    color: $text-tertiary;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
