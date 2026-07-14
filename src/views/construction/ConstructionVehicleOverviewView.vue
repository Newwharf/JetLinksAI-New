<script setup lang="ts">
/**
 * 车辆总览分析 — 看板
 * ① 顶部指标  ② 违章类型+进出趋势+通行方式  ③ 工地违章排行+工地进出排行  ④ 车型分布+最近违章
 */
import ECharts from '@/components/ECharts.vue'
import {
  violationRecords,
  accessRecords,
  violationTypeMeta,
  violationStatusMeta,
  accessMethodMeta,
  type ViolationType,
  type ViolationStatus,
  type AccessMethod,
  type ViolationRecord
} from './vehicle-ledger.mock'
import { constructionSites } from './posture.mock'

// ===== ① 顶部指标 =====
const metrics = computed(() => {
  const vTotal = violationRecords.length
  const vPending = violationRecords.filter(r => r.status === 'pending').length
  const aTotal = accessRecords.length
  const aToday = accessRecords.filter(r => r.accessTime.substring(0, 10) === '2026-07-13').length
  const autoRate = aTotal > 0 ? Math.round(accessRecords.filter(r => r.method === 'plate_recognition').length / aTotal * 1000) / 10 : 0
  return [
    { key: 'vTotal', title: '违章总数', icon: 'i-ant-design-alert-outlined', color: '#ff4d4f', value: vTotal, sub: '近 60 天' },
    { key: 'vPending', title: '待处理违章', icon: 'i-ant-design-clock-circle-outlined', color: '#fa8c16', value: vPending, sub: '需尽快处理' },
    { key: 'aTotal', title: '进出总次数', icon: 'i-ant-design-swap-outlined', color: '#6e4bff', value: aTotal, sub: '近 30 天' },
    { key: 'aToday', title: '今日进出', icon: 'i-ant-design-today-outlined', color: '#1677ff', value: aToday, sub: '今日记录' },
    { key: 'auto', title: '车牌识别率', icon: 'i-ant-design-scan-outlined', color: '#52c41a', value: autoRate + '%', sub: '自动化通行' }
  ]
})

// ===== ② 违章类型分布（饼图）=====
const violationTypeOption = computed(() => {
  const data = (Object.keys(violationTypeMeta) as ViolationType[]).map(t => ({
    name: violationTypeMeta[t].label,
    value: violationRecords.filter(r => r.violationType === t).length,
    itemStyle: { color: violationTypeMeta[t].color }
  })).filter(d => d.value > 0)
  return {
    tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12], textStyle: { color: '#111418', fontSize: 12 } },
    legend: { bottom: 0, type: 'scroll', icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: '#3a3f47', fontSize: 11 } },
    series: [{ type: 'pie', radius: '55%', center: ['50%', '42%'], label: { formatter: '{b}\n{c}次', fontSize: 11, color: '#3a3f47' }, data }]
  }
})

// ===== ② 进出趋势（双柱状图）=====
const accessTrendOption = computed(() => {
  const days: string[] = []; const ins: number[] = []; const outs: number[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date('2026-07-13'); d.setDate(d.getDate() - i)
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    days.push(`${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
    const dayRecs = accessRecords.filter(r => r.accessTime.substring(0, 10) === ds)
    ins.push(dayRecs.filter(r => r.direction === 'in').length)
    outs.push(dayRecs.filter(r => r.direction === 'out').length)
  }
  return {
    color: ['#52c41a', '#fa8c16'],
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [10, 14], textStyle: { color: '#111418', fontSize: 12 } },
    legend: { data: ['进场', '出场'], right: 0, top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10, textStyle: { color: '#3a3f47', fontSize: 12 } },
    grid: { left: 44, right: 16, top: 40, bottom: 32 },
    xAxis: { type: 'category', data: days, axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#8c8c8c', fontSize: 11 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
    series: [
      { name: '进场', type: 'bar', barWidth: '35%', data: ins, itemStyle: { borderRadius: [3,3,0,0], color: { type: 'linear', x:0,y:0,x2:0,y2:1, colorStops: [{ offset: 0, color: '#52c41a' }, { offset: 1, color: 'rgba(82,196,26,0.3)' }] } } },
      { name: '出场', type: 'bar', barWidth: '35%', data: outs, itemStyle: { borderRadius: [3,3,0,0], color: { type: 'linear', x:0,y:0,x2:0,y2:1, colorStops: [{ offset: 0, color: '#fa8c16' }, { offset: 1, color: 'rgba(250,140,22,0.3)' }] } } }
    ]
  }
})

// ===== ② 通行方式占比（饼图）=====
const methodOption = computed(() => {
  const data = (Object.keys(accessMethodMeta) as AccessMethod[]).map(m => ({
    name: accessMethodMeta[m].label,
    value: accessRecords.filter(r => r.method === m).length,
    itemStyle: { color: accessMethodMeta[m].color }
  })).filter(d => d.value > 0)
  return {
    tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12], textStyle: { color: '#111418', fontSize: 12 } },
    legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: '#3a3f47', fontSize: 11 } },
    series: [{ type: 'pie', radius: '55%', center: ['50%', '42%'], label: { formatter: '{b}\n{c}次', fontSize: 11, color: '#3a3f47' }, data }]
  }
})

// ===== ③ 工地违章排行（水平条形）=====
const siteViolationOption = computed(() => {
  const ranking = constructionSites.map(s => ({
    name: s.name,
    count: violationRecords.filter(r => r.siteId === s.id).length
  })).filter(s => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 10)
  return {
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12], textStyle: { color: '#111418', fontSize: 12 }, axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(255,77,79,0.06)' } } },
    grid: { left: 4, right: 36, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
    yAxis: { type: 'category', inverse: true, data: ranking.map(s => s.name), axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#3a3f47', fontSize: 12 } },
    series: [{ type: 'bar', barWidth: '52%', data: ranking.map(s => s.count), itemStyle: { borderRadius: [0,4,4,0], color: { type: 'linear', x:0,y:0,x2:1,y2:0, colorStops: [{ offset: 0, color: 'rgba(255,77,79,0.35)' }, { offset: 1, color: '#ff4d4f' }] } }, label: { show: true, position: 'right', color: '#111418', fontSize: 12, fontWeight: 600 } }]
  }
})

// ===== ③ 工地进出排行（水平条形）=====
const siteAccessOption = computed(() => {
  const ranking = constructionSites.map(s => ({
    name: s.name,
    count: accessRecords.filter(r => r.siteId === s.id).length
  })).filter(s => s.count > 0).sort((a, b) => b.count - a.count).slice(0, 10)
  return {
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12], textStyle: { color: '#111418', fontSize: 12 }, axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(22,119,255,0.06)' } } },
    grid: { left: 4, right: 36, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
    yAxis: { type: 'category', inverse: true, data: ranking.map(s => s.name), axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#3a3f47', fontSize: 12 } },
    series: [{ type: 'bar', barWidth: '52%', data: ranking.map(s => s.count), itemStyle: { borderRadius: [0,4,4,0], color: { type: 'linear', x:0,y:0,x2:1,y2:0, colorStops: [{ offset: 0, color: 'rgba(22,119,255,0.35)' }, { offset: 1, color: '#1677ff' }] } }, label: { show: true, position: 'right', color: '#111418', fontSize: 12, fontWeight: 600 } }]
  }
})

// ===== ④ 违章处理状态分布（环形）=====
const violationStatusOption = computed(() => {
  const data = (Object.keys(violationStatusMeta) as ViolationStatus[]).map(s => ({
    name: violationStatusMeta[s].label,
    value: violationRecords.filter(r => r.status === s).length,
    itemStyle: { color: violationStatusMeta[s].color }
  })).filter(d => d.value > 0)
  return {
    tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12], textStyle: { color: '#111418', fontSize: 12 } },
    legend: { bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: '#3a3f47', fontSize: 11 } },
    series: [{ type: 'pie', radius: ['40%', '65%'], center: ['50%', '42%'], label: { formatter: '{b}\n{c}条', fontSize: 11, color: '#3a3f47' }, data }]
  }
})

// ===== ④ 违章趋势（面积折线）=====
const violationTrendOption = computed(() => {
  const days: string[] = []; const counts: number[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date('2026-07-13'); d.setDate(d.getDate() - i)
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    days.push(`${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
    counts.push(violationRecords.filter(r => r.violationTime.substring(0, 10) === ds).length)
  }
  return {
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [10, 14], textStyle: { color: '#111418', fontSize: 12 }, axisPointer: { type: 'line', lineStyle: { color: '#ff4d4f', type: 'dashed', width: 1 } } },
    grid: { left: 44, right: 16, top: 24, bottom: 32 },
    xAxis: { type: 'category', data: days, boundaryGap: false, axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#8c8c8c', fontSize: 11 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
    series: [{ type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, showSymbol: false, data: counts, itemStyle: { color: '#ff4d4f' }, lineStyle: { width: 2, color: '#ff4d4f' }, areaStyle: { color: { type: 'linear', x:0,y:0,x2:0,y2:1, colorStops: [{ offset: 0, color: 'rgba(255,77,79,0.18)' }, { offset: 1, color: 'rgba(255,77,79,0)' }] } } }]
  }
})

// ===== ⑤ 最近违章记录（横向卡片）=====
const recentViolations: ViolationRecord[] = violationRecords.slice(0, 6)
</script>

<template>
  <div class="vo-page">
    <!-- ① 顶部指标 -->
    <section class="vo-section">
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

    <!-- ② 最近违章记录 -->
    <section class="vo-section">
      <div class="vo-card">
        <div class="vo-card__head">
          <strong>最近违章记录</strong>
          <span class="vo-card__hint">含识别截图</span>
        </div>
        <div class="event-stream scroll-thin">
          <article v-for="r in recentViolations" :key="r.id" class="event-card">
            <div class="event-card__thumb">
              <img :src="r.thumb" :alt="r.plate" draggable="false" />
              <span class="event-card__level" :style="{ background: violationTypeMeta[r.violationType].color }">{{ violationTypeMeta[r.violationType].label }}</span>
            </div>
            <div class="event-card__plate">{{ r.plate }}</div>
            <div class="event-card__meta">
              <span class="event-card__site">{{ r.siteName }}</span>
              <span class="event-card__time"><i class="i-ant-design-clock-circle-outlined" />{{ r.violationTime.substring(5) }}</span>
            </div>
          </article>
          <div v-if="recentViolations.length === 0" class="stream-empty">暂无违章记录</div>
        </div>
      </div>
    </section>

    <!-- ③ 违章类型 + 进出趋势 + 通行方式 -->
    <section class="vo-section">
      <div class="tri-grid">
        <div class="vo-card"><div class="vo-card__head"><strong>违章类型分布</strong></div><ECharts :option="violationTypeOption" height="240px" /></div>
        <div class="vo-card"><div class="vo-card__head"><strong>车辆进出趋势 · 近 30 天</strong></div><ECharts :option="accessTrendOption" height="240px" /></div>
        <div class="vo-card"><div class="vo-card__head"><strong>通行方式占比</strong></div><ECharts :option="methodOption" height="240px" /></div>
      </div>
    </section>

    <!-- ③ 工地违章排行 + 工地进出排行 -->
    <section class="vo-section">
      <div class="duo-grid">
        <div class="vo-card"><div class="vo-card__head"><strong>各工地违章数量排行</strong></div><ECharts :option="siteViolationOption" height="280px" /></div>
        <div class="vo-card"><div class="vo-card__head"><strong>各工地进出次数排行</strong></div><ECharts :option="siteAccessOption" height="280px" /></div>
      </div>
    </section>

    <!-- ④ 违章处理状态 + 违章趋势 -->
    <section class="vo-section">
      <div class="duo-grid">
        <div class="vo-card"><div class="vo-card__head"><strong>违章处理状态分布</strong></div><ECharts :option="violationStatusOption" height="240px" /></div>
        <div class="vo-card"><div class="vo-card__head"><strong>违章趋势 · 近 30 天</strong></div><ECharts :option="violationTrendOption" height="240px" /></div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.vo-page {
  height: 100%;
  background: transparent;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  color: $text-base;
}

.vo-section {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.vo-card {
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
    .vo-card__hint { font-size: 12px; font-weight: 400; color: $text-muted; }
  }
}

/* ===== ① 顶部指标 ===== */
.metric-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
.metric-card { background: #fff; border-radius: 14px; padding: 20px 22px; display: flex; flex-direction: column; gap: 14px;
  &__head { display: flex; align-items: center; gap: 10px; }
  &__body { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
}
.metric-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; i { font-size: 20px; } }
.metric-title { font-size: 14px; font-weight: 600; color: $text-base; }
.metric-value { font-size: 28px; font-weight: 650; color: $text-base; line-height: 1.1; }
.metric-sub { font-size: 12px; color: $text-muted; }

/* ===== 三栏 / 两栏 ===== */
.tri-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.duo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }

/* ===== 事件流 ===== */
.event-stream { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 4px; }
.event-card {
  flex: 0 0 170px;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { border-color: $color-primary; box-shadow: $shadow-card-active; .event-card__thumb img { transform: scale(1.04); } }
  &__thumb { position: relative; aspect-ratio: 16 / 10; background: #1a1a2e; overflow: hidden; img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; } }
  &__level { position: absolute; top: 6px; left: 6px; font-size: 11px; font-weight: 500; padding: 2px 7px; border-radius: 3px; color: #fff; line-height: 1.4; }
  &__plate { font-size: 13px; font-weight: 600; color: $text-base; padding: 8px 10px 4px; font-family: 'Courier New', monospace; letter-spacing: 0.3px; }
  &__meta { padding: 0 10px 10px; display: flex; flex-direction: column; gap: 3px; }
  &__site { font-size: 11px; color: $text-tertiary; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__time { display: flex; align-items: center; gap: 4px; font-size: 11px; color: $text-muted; i { font-size: 11px; } }
}
.stream-empty { padding: 40px 0; text-align: center; color: $text-muted; font-size: 13px; }
</style>
