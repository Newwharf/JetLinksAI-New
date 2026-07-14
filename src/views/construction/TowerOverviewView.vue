<script setup lang="ts">
/**
 * 塔机总览看板
 * ① 顶部指标  ② 状态分布+各工地塔机数量  ③ 载荷率分布+实时风速监测  ④ 在线/报警塔机实时工况卡片
 */
import ECharts from '@/components/ECharts.vue'
import {
  towers,
  towerStatusMeta,
  towerTypeMeta,
  type TowerStatus,
  type Tower
} from './tower.mock'
import { constructionSites } from './posture.mock'

// ===== ① 顶部指标 =====
const metrics = computed(() => {
  const total = towers.length
  const online = towers.filter(t => t.status === 'online').length
  const alarm = towers.filter(t => t.status === 'alarm').length
  const offline = towers.filter(t => t.status === 'offline').length
  return [
    { key: 'total', title: '塔机总数', icon: 'i-ant-design-build-outlined', color: '#6e4bff', value: total, sub: '在册设备' },
    { key: 'online', title: '正常运行数', icon: 'i-ant-design-check-circle-outlined', color: '#52c41a', value: online, sub: '工况正常' },
    { key: 'alarm', title: '报警数', icon: 'i-ant-design-alert-outlined', color: '#ff4d4f', value: alarm, sub: '需立即处置' },
    { key: 'offline', title: '离线数', icon: 'i-ant-design-cloud-outlined', color: '#8c8c8c', value: offline, sub: '通讯中断' }
  ]
})

// ===== ② 塔机状态分布（饼图）=====
const statusOption = computed(() => {
  const data = (Object.keys(towerStatusMeta) as TowerStatus[]).map(s => ({
    name: towerStatusMeta[s].label,
    value: towers.filter(t => t.status === s).length,
    itemStyle: { color: towerStatusMeta[s].color }
  })).filter(d => d.value > 0)
  return {
    tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12], textStyle: { color: '#111418', fontSize: 12 } },
    legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: '#3a3f47', fontSize: 11 } },
    series: [{ type: 'pie', radius: '55%', center: ['50%', '42%'], label: { formatter: '{b}\n{c}台', fontSize: 11, color: '#3a3f47' }, data }]
  }
})

// ===== ② 各工地塔机数量（水平条形）=====
const siteCountOption = computed(() => {
  const ranking = constructionSites.map(s => ({
    name: s.name,
    count: towers.filter(t => t.siteId === s.id).length
  })).filter(s => s.count > 0).sort((a, b) => b.count - a.count)
  return {
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12], textStyle: { color: '#111418', fontSize: 12 }, axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(110,75,255,0.06)' } } },
    grid: { left: 4, right: 36, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
    yAxis: { type: 'category', inverse: true, data: ranking.map(s => s.name), axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#3a3f47', fontSize: 12 } },
    series: [{ type: 'bar', barWidth: '52%', data: ranking.map(s => s.count), itemStyle: { borderRadius: [0, 4, 4, 0], color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: 'rgba(110,75,255,0.35)' }, { offset: 1, color: '#6e4bff' }] } }, label: { show: true, position: 'right', color: '#111418', fontSize: 12, fontWeight: 600 } }]
  }
})

// ===== ③ 载荷率分布趋势（柱状图）=====
const loadRateOption = computed(() => {
  const list = towers.filter(t => t.status !== 'offline')
  return {
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12], textStyle: { color: '#111418', fontSize: 12 }, axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(110,75,255,0.06)' } } },
    grid: { left: 44, right: 16, top: 40, bottom: 32 },
    xAxis: { type: 'category', data: list.map(t => t.deviceNo), axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#8c8c8c', fontSize: 11, rotate: list.length > 6 ? 25 : 0 } },
    yAxis: { type: 'value', max: 100, splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12, formatter: '{value}%' } },
    series: [{
      type: 'bar', barWidth: '45%',
      data: list.map(t => ({
        value: t.loadRate,
        itemStyle: {
          borderRadius: [3, 3, 0, 0],
          color: t.loadRate > 80 ? '#ff4d4f' : t.loadRate > 50 ? '#fa8c16' : { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#6e4bff' }, { offset: 1, color: 'rgba(110,75,255,0.3)' }] }
        }
      })),
      label: { show: true, position: 'top', color: '#3a3f47', fontSize: 11, formatter: '{c}%' }
    }]
  }
})

// ===== ③ 实时风速监测（柱状图，阈值着色）=====
const windOption = computed(() => {
  const list = towers.filter(t => t.status !== 'offline')
  return {
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12], textStyle: { color: '#111418', fontSize: 12 }, axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(82,196,26,0.06)' } } },
    grid: { left: 44, right: 16, top: 40, bottom: 32 },
    xAxis: { type: 'category', data: list.map(t => t.deviceNo), axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#8c8c8c', fontSize: 11, rotate: list.length > 6 ? 25 : 0 } },
    yAxis: { type: 'value', name: 'm/s', nameTextStyle: { color: '#8c8c8c', fontSize: 11 }, splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
    series: [{
      type: 'bar', barWidth: '45%',
      data: list.map(t => ({
        value: t.windSpeed,
        itemStyle: { borderRadius: [3, 3, 0, 0], color: t.windSpeed > 20 ? '#ff4d4f' : t.windSpeed >= 12 ? '#fa8c16' : '#52c41a' }
      })),
      markLine: {
        symbol: 'none', silent: true,
        lineStyle: { type: 'dashed', width: 1 },
        data: [
          { yAxis: 12, lineStyle: { color: '#fa8c16' }, label: { formatter: '预警 12', color: '#fa8c16', fontSize: 10, position: 'insideEndTop' } },
          { yAxis: 20, lineStyle: { color: '#ff4d4f' }, label: { formatter: '报警 20', color: '#ff4d4f', fontSize: 10, position: 'insideEndTop' } }
        ]
      }
    }]
  }
})

// ===== ④ 在线/报警塔机实时工况卡片 =====
const activeTowers = computed<Tower[]>(() => towers.filter(t => t.status !== 'offline'))

function windColor(v: number): string {
  if (v > 20) return '#ff4d4f'
  if (v > 12) return '#fa8c16'
  return '#52c41a'
}

function loadRateColor(v: number): string {
  if (v > 80) return '#ff4d4f'
  if (v > 50) return '#fa8c16'
  return '#6e4bff'
}
</script>

<template>
  <div class="to-page">
    <!-- ① 顶部指标 -->
    <section class="to-section">
      <div class="metric-grid">
        <article v-for="c in metrics" :key="c.key" class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" :style="{ background: c.color }"><i :class="c.icon" /></span>
            <span class="metric-title">{{ c.title }}</span>
          </div>
          <div class="metric-card__body">
            <strong class="metric-value">{{ c.value }}</strong>
            <span class="metric-sub">{{ c.sub }}</span>
          </div>
        </article>
      </div>
    </section>

    <!-- ② 状态分布 + 各工地塔机数量 -->
    <section class="to-section">
      <div class="duo-grid">
        <div class="to-card"><div class="to-card__head"><strong>塔机状态分布</strong></div><ECharts :option="statusOption" height="280px" /></div>
        <div class="to-card"><div class="to-card__head"><strong>各工地塔机数量</strong></div><ECharts :option="siteCountOption" height="280px" /></div>
      </div>
    </section>

    <!-- ③ 载荷率分布 + 实时风速监测 -->
    <section class="to-section">
      <div class="duo-grid">
        <div class="to-card"><div class="to-card__head"><strong>载荷率分布趋势</strong></div><ECharts :option="loadRateOption" height="280px" /></div>
        <div class="to-card"><div class="to-card__head"><strong>实时风速监测</strong></div><ECharts :option="windOption" height="280px" /></div>
      </div>
    </section>

    <!-- ④ 在线/报警塔机实时工况卡片 -->
    <section class="to-section">
      <div class="to-card">
        <div class="to-card__head">
          <strong>实时工况监测</strong>
          <span class="to-card__hint">在线 / 报警塔机（{{ activeTowers.length }} 台）</span>
        </div>
        <div class="tower-grid">
          <article v-for="t in activeTowers" :key="t.id" class="tower-card">
            <div class="tower-card__header">
              <span class="tower-card__device">{{ t.deviceNo }}</span>
              <span class="tower-card__badge" :style="{ color: towerStatusMeta[t.status].color, background: towerStatusMeta[t.status].bg }">{{ towerStatusMeta[t.status].label }}</span>
            </div>
            <div class="tower-card__sub">
              <span class="tower-card__model">{{ towerTypeMeta[t.towerType].label }} · {{ t.model }}</span>
              <span class="tower-card__site"><i class="i-ant-design-environment-outlined" />{{ t.siteName }}</span>
            </div>
            <div class="tower-card__rows">
              <div class="tower-row">
                <span class="tower-row__label"><i class="i-ant-design-arrow-down-outlined" />吊重</span>
                <span class="tower-row__value">{{ t.currentLoad }}<em>/ {{ t.maxLift }} 吨</em></span>
              </div>
              <div class="tower-row">
                <span class="tower-row__label"><i class="i-ant-design-swap-outlined" />幅度</span>
                <span class="tower-row__value">{{ t.currentRadius }}<em>/ {{ t.maxRadius }} 米</em></span>
              </div>
              <div class="tower-row">
                <span class="tower-row__label"><i class="i-ant-design-arrow-up-outlined" />高度</span>
                <span class="tower-row__value">{{ t.currentHeight }}<em>米</em></span>
              </div>
              <div class="tower-row">
                <span class="tower-row__label"><i class="i-ant-design-cloud-outlined" />风速</span>
                <span class="tower-row__value" :style="{ color: windColor(t.windSpeed) }">{{ t.windSpeed }}<em>m/s</em></span>
              </div>
            </div>
            <div class="tower-card__rate">
              <div class="tower-card__rate-head">
                <span>载荷率</span>
                <strong :style="{ color: loadRateColor(t.loadRate) }">{{ t.loadRate }}%</strong>
              </div>
              <div class="rate-bar">
                <div class="rate-bar__fill" :style="{ width: t.loadRate + '%', background: loadRateColor(t.loadRate) }" />
              </div>
            </div>
          </article>
          <div v-if="activeTowers.length === 0" class="stream-empty">暂无在线塔机</div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.to-page {
  height: 100%;
  background: transparent;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  color: $text-base;
}

.to-section {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.to-card {
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
    .to-card__hint { font-size: 12px; font-weight: 400; color: $text-muted; }
  }
}

/* ===== ① 顶部指标（紧凑） ===== */
.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.metric-card {
  background: #fff;
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__head { display: flex; align-items: center; gap: 8px; }
  &__body { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
}
.metric-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; i { font-size: 16px; } }
.metric-title { font-size: 13px; font-weight: 600; color: $text-base; }
.metric-value { font-size: 22px; font-weight: 650; color: $text-base; line-height: 1.1; }
.metric-sub { font-size: 12px; color: $text-muted; }

/* ===== 两栏 ===== */
.duo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

/* ===== ④ 塔机实时工况卡片 ===== */
.tower-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.tower-card {
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 14px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: all 0.2s;

  &:hover {
    border-color: $color-primary;
    box-shadow: $shadow-card-active;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  &__device { font-size: 15px; font-weight: 700; color: $text-base; font-family: 'Courier New', monospace; letter-spacing: 0.3px; }

  &__badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 9999px; line-height: 1.5; flex-shrink: 0; }

  &__sub {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding-bottom: 8px;
    border-bottom: 1px dashed $border-color-card;
  }

  &__model { font-size: 12px; color: $text-secondary; }

  &__site {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    color: $text-muted;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    i { font-size: 11px; flex-shrink: 0; }
  }

  &__rows { display: flex; flex-direction: column; gap: 6px; }

  &__rate {
    padding-top: 8px;
    border-top: 1px dashed $border-color-card;
    display: flex;
    flex-direction: column;
    gap: 6px;

    &-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 12px;
      color: $text-secondary;
      strong { font-size: 13px; font-weight: 700; }
    }
  }
}

.tower-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  &__label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: $text-muted;
    i { font-size: 12px; color: $text-tertiary; }
  }

  &__value {
    font-size: 13px;
    font-weight: 600;
    color: $text-base;
    em { font-style: normal; font-size: 11px; font-weight: 400; color: $text-muted; margin-left: 2px; }
  }
}

.rate-bar {
  width: 100%;
  height: 6px;
  border-radius: 9999px;
  background: #f0f4f8;
  overflow: hidden;

  &__fill {
    height: 100%;
    border-radius: 9999px;
    transition: width 0.3s;
  }
}

.stream-empty { padding: 40px 0; text-align: center; color: $text-muted; font-size: 13px; grid-column: 1 / -1; }
</style>
