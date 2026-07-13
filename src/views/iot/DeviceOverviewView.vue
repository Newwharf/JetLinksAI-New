<script setup lang="ts">
/**
 * 设备总览
 * 第一行：KPI
 * 第二行：异常跟进(左) + 告警排行(右)
 * 第三行：设备健康趋势(在线率走势) + 核心状态分布(圆环)
 * 第四行：告警趋势(堆叠面积) — 全宽
 */
import { useRouter } from 'vue-router'
import ECharts from '@/components/ECharts.vue'
import {
  devices, deviceIssues, regionAlarmRank, deviceAlarmRank,
  onlineRateDays7, onlineRateSeries7,
  alarmTrendDays7, alarmTrendUrgent, alarmTrendImportant, alarmTrendGeneral
} from './mock'

const router = useRouter()

// KPI
const totalDevices = devices.value.length
const onlineDevices = devices.value.filter(d => d.status === 'online').length
const alertDevices = devices.value.filter(d => d.status === 'alert').length
const silentDevices = devices.value.filter(d => d.status === 'silent').length
const offlineDevices = devices.value.filter(d => d.status === 'offline').length
const disabledDevices = devices.value.filter(d => d.status === 'disabled').length
const avgHealth = (devices.value.filter(d => d.healthScore > 0).reduce((s, d) => s + d.healthScore, 0) / devices.value.filter(d => d.healthScore > 0).length).toFixed(1)

const kpiCards = [
  { label: '设备总数', value: totalDevices, unit: '台', icon: 'i-ant-design-appstore-outlined', color: '#6e4bff', detail: `在线率 ${Math.round(onlineDevices / totalDevices * 100)}%` },
  { label: '在线设备', value: onlineDevices, unit: '台', icon: 'i-ant-design-check-circle-outlined', color: '#2bb3a3', detail: `离线 ${offlineDevices + disabledDevices} 台` },
  { label: '告警设备', value: alertDevices, unit: '台', icon: 'i-ant-design-warning-outlined', color: '#ff4d4f', detail: `沉默 ${silentDevices} 台` },
  { label: '健康评分', value: avgHealth, unit: '', icon: 'i-ant-design-heart-outlined', color: '#1890ff', detail: '良好' }
]

// 异常
const issueTagClass: Record<string, string> = { '告警': 'tag-alert', '数据偏离': 'tag-data', '通讯异常': 'tag-comm', '维护': 'tag-maintain' }
const issueRange = ref<'today' | '7d'>('7d')
const visibleIssues = computed(() => deviceIssues.slice(0, 6))

// ===== 健康趋势（在线率走势，固定近7天） =====
const healthOption = computed(() => ({
  tooltip: { trigger: 'axis', formatter: '{b}<br/>在线率: {c}%' },
  grid: { top: 24, right: 16, bottom: 28, left: 38 },
  xAxis: { type: 'category', boundaryGap: false, data: onlineRateDays7, axisLine: { lineStyle: { color: '#dbe4f1' } }, axisLabel: { color: '#8895ab', fontSize: 11 }, axisTick: { show: false } },
  yAxis: { type: 'value', min: 70, max: 100, axisLine: { show: false }, splitLine: { lineStyle: { color: '#f4f5f7' } }, axisLabel: { color: '#8895ab', fontSize: 11, formatter: '{value}%' } },
  series: [{
    type: 'line', data: onlineRateSeries7, smooth: true, symbol: 'circle', symbolSize: 6,
    lineStyle: { color: '#2bb3a3', width: 2.5 }, itemStyle: { color: '#2bb3a3', borderColor: '#fff', borderWidth: 2 },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [
      { offset: 0, color: 'rgba(43,179,163,0.2)' }, { offset: 1, color: 'rgba(43,179,163,0)' }
    ]}},
    markLine: { silent: true, symbol: 'none', lineStyle: { color: '#faad14', type: 'dashed', width: 1 },
      data: [{ yAxis: 80, label: { formatter: '警戒线 80%', color: '#faad14', fontSize: 10, position: 'insideEndTop' } }]
    }
  }]
}))

// ===== 告警趋势（堆叠折线面积图） =====
const alarmTrendOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'cross', label: { backgroundColor: '#6e4bff' } } },
  legend: { data: ['紧急', '重要', '一般'], right: 0, top: 0, textStyle: { color: '#8895ab', fontSize: 12 }, icon: 'roundRect', itemWidth: 10, itemHeight: 6 },
  grid: { top: 32, right: 16, bottom: 28, left: 38 },
  xAxis: { type: 'category', boundaryGap: false, data: alarmTrendDays7, axisLine: { lineStyle: { color: '#dbe4f1' } }, axisLabel: { color: '#8895ab', fontSize: 11 }, axisTick: { show: false } },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f4f5f7' } }, axisLabel: { color: '#8895ab', fontSize: 11 } },
  series: [
    { name: '紧急', type: 'line', stack: 'alarm', data: alarmTrendUrgent, smooth: true, symbol: 'circle', symbolSize: 5,
      lineStyle: { width: 2, color: '#ff4d4f' }, itemStyle: { color: '#ff4d4f' }, areaStyle: { color: 'rgba(255,77,79,0.25)' } },
    { name: '重要', type: 'line', stack: 'alarm', data: alarmTrendImportant, smooth: true, symbol: 'circle', symbolSize: 5,
      lineStyle: { width: 2, color: '#faad14' }, itemStyle: { color: '#faad14' }, areaStyle: { color: 'rgba(250,173,20,0.25)' } },
    { name: '一般', type: 'line', stack: 'alarm', data: alarmTrendGeneral, smooth: true, symbol: 'circle', symbolSize: 5,
      lineStyle: { width: 2, color: '#6e4bff' }, itemStyle: { color: '#6e4bff' }, areaStyle: { color: 'rgba(110,75,255,0.25)' } }
  ]
}))

// 告警趋势摘要
const alarmToday = alarmTrendUrgent[6] + alarmTrendImportant[6] + alarmTrendGeneral[6]
const alarmYesterday = alarmTrendUrgent[5] + alarmTrendImportant[5] + alarmTrendGeneral[5]
const alarmDelta = alarmToday - alarmYesterday

// 告警排行（横向柱状图 Top10）
const rankTab = ref<'region' | 'device'>('region')
const rankList = computed(() => rankTab.value === 'region' ? regionAlarmRank : deviceAlarmRank)

const rankChartOption = computed(() => {
  const data = rankList.value
  const names = data.map(r => r.name)
  const values = data.map(r => r.count)
  const maxVal = Math.max(...values)
  return {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (p: any) => `${p[0].name}<br/>告警次数: <strong>${p[0].value}</strong>` },
    grid: { top: 8, right: 36, bottom: 8, left: 90 },
    xAxis: { type: 'value', max: Math.ceil(maxVal * 1.15), axisLine: { show: false }, axisTick: { show: false }, splitLine: { lineStyle: { color: '#f4f5f7' } }, axisLabel: { color: '#8895ab', fontSize: 11 } },
    yAxis: { type: 'category', data: names, inverse: true, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#3a3f47', fontSize: 12 } },
    series: [{
      type: 'bar', data: values, barWidth: 12, itemStyle: {
        borderRadius: [0, 6, 6, 0],
        color: (params: any) => {
          const colors = ['#6e4bff', '#6e4bff', '#2bb3a3', '#2bb3a3', '#2bb3a3', '#faad14', '#faad14', '#faad14', '#bfbfbf', '#bfbfbf']
          return colors[params.dataIndex] || '#bfbfbf'
        }
      },
      label: { show: true, position: 'right', color: '#111418', fontSize: 12, fontWeight: 600 }
    }]
  }
})

function gotoAlarm() { router.push('/alarm/event') }
</script>

<template>
  <div class="ov-page">
    <!-- 第一行：KPI -->
    <section class="ov-kpi-row">
      <article v-for="k in kpiCards" :key="k.label" class="ov-kpi">
        <div class="ov-kpi__head">
          <span class="ov-kpi__icon" :style="{ background: k.color }"><i :class="k.icon" /></span>
          <div class="ov-kpi__body">
            <strong class="ov-kpi__value">{{ k.value }}<small>{{ k.unit }}</small></strong>
            <small class="ov-kpi__label">{{ k.label }}</small>
          </div>
        </div>
        <div class="ov-kpi__detail">
          <i class="ov-kpi__dot" :style="{ background: k.color }" />
          {{ k.detail }}
        </div>
      </article>
    </section>

    <!-- 第二行：异常跟进 + 告警排行 -->
    <section class="ov-row-2">
      <div class="ov-panel ov-panel--flex">
        <div class="ov-panel__head">
          <div class="ov-panel__title">
            <strong>跟进设备异常闭环</strong>
            <span class="ov-badge">{{ visibleIssues.length }} 待处理</span>
          </div>
          <div class="ov-panel__right">
            <div class="ov-seg">
              <button :class="{ active: issueRange === 'today' }" @click="issueRange = 'today'">今日</button>
              <button :class="{ active: issueRange === '7d' }" @click="issueRange = '7d'">近7天</button>
            </div>
            <button class="ov-more-btn" type="button" @click="gotoAlarm">查看更多<i class="i-ant-design-right-outlined" /></button>
          </div>
        </div>
        <div class="ov-issues">
          <div v-for="issue in visibleIssues" :key="issue.id" class="issue-card">
            <div class="issue-card__body">
              <div class="issue-card__head">
                <span class="issue-tag" :class="issueTagClass[issue.tag]">{{ issue.tag }}</span>
                <span class="issue-card__device">{{ issue.deviceName }}</span>
              </div>
              <p class="issue-card__desc">{{ issue.desc }}</p>
              <span class="issue-card__meta"><i class="i-ant-design-folder-outlined" />{{ issue.group }} · {{ issue.time }}</span>
            </div>
            <button class="issue-card__btn" type="button">去处理</button>
          </div>
        </div>
      </div>

      <div class="ov-panel ov-panel--flex">
        <div class="ov-panel__head">
          <div class="ov-panel__title"><strong>区域/设备告警排行</strong><span class="ov-panel__sub">Top 10</span></div>
          <div class="ov-seg">
            <button :class="{ active: rankTab === 'region' }" @click="rankTab = 'region'">区域</button>
            <button :class="{ active: rankTab === 'device' }" @click="rankTab = 'device'">设备</button>
          </div>
        </div>
        <div class="ov-rank-chart"><ECharts :option="rankChartOption" autoresize style="height: 100%" /></div>
      </div>
    </section>

    <!-- 第三行：设备健康趋势 + 告警趋势 -->
    <section class="ov-row-2">
      <!-- 设备健康趋势（在线率走势） -->
      <div class="ov-panel">
        <div class="ov-panel__head">
          <div class="ov-panel__title">
            <strong>设备健康趋势</strong>
            <span class="ov-panel__sub">在线率走势 · 近7天</span>
          </div>
        </div>
        <div class="ov-health-summary">
          <div class="ov-health-stat">
            <span>当前在线率</span>
            <strong style="color: #2bb3a3">{{ onlineRateSeries7[6] }}%</strong>
          </div>
          <div class="ov-health-stat">
            <span>7日最低</span>
            <strong style="color: #faad14">{{ Math.min(...onlineRateSeries7) }}%</strong>
          </div>
          <div class="ov-health-stat">
            <span>7日均值</span>
            <strong style="color: #6e4bff">{{ (onlineRateSeries7.reduce((a, b) => a + b, 0) / 7).toFixed(1) }}%</strong>
          </div>
        </div>
        <div class="ov-chart"><ECharts :option="healthOption" autoresize style="height: 180px" /></div>
      </div>

      <!-- 告警趋势 -->
      <div class="ov-panel">
        <div class="ov-panel__head">
          <div class="ov-panel__title">
            <strong>告警趋势</strong>
            <span class="ov-panel__sub">近7天 · 按级别</span>
          </div>
          <div class="ov-alarm-summary">
            <span class="ov-alarm-stat">今日 <strong>{{ alarmToday }}</strong></span>
            <span class="ov-alarm-stat" :class="{ up: alarmDelta > 0, down: alarmDelta < 0 }">
              较昨日 <strong>{{ alarmDelta > 0 ? '+' : '' }}{{ alarmDelta }}</strong>
            </span>
          </div>
        </div>
        <div class="ov-chart"><ECharts :option="alarmTrendOption" autoresize style="height: 220px" /></div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.ov-page { height: 100%; padding: 8px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; scrollbar-width: none; -ms-overflow-style: none; &::-webkit-scrollbar { display: none; } }

/* KPI */
.ov-kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; flex-shrink: 0; }
.ov-kpi {
  background: #fff; border-radius: 14px; padding: 16px 20px;
  display: flex; flex-direction: column; gap: 12px;
}
.ov-kpi__head { display: flex; align-items: center; gap: 14px; }
.ov-kpi__icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; i { font-size: 24px; } }
.ov-kpi__body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ov-kpi__value { font-size: 26px; font-weight: 650; color: $text-base; line-height: 1.1; display: flex; align-items: baseline; gap: 3px; small { font-size: 13px; font-weight: 400; color: $text-muted; } }
.ov-kpi__label { font-size: 13px; color: $text-secondary; }
.ov-kpi__detail { display: flex; align-items: center; gap: 5px; padding-top: 10px; border-top: 1px solid $border-color-card; font-size: 12px; color: $text-secondary; }
.ov-kpi__dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

/* Panel */
.ov-panel { background: #fff; border-radius: 14px; display: flex; flex-direction: column; overflow: hidden;
  &--flex { flex: 1; min-height: 0; }
  &__head { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid $border-color-card; flex-shrink: 0; }
  &__title { display: flex; align-items: center; gap: 8px; strong { font-size: 14px; font-weight: 600; color: $text-base; } }
  &__sub { font-size: 12px; color: $text-muted; font-weight: 400; }
  &__right { display: flex; align-items: center; gap: 10px; }
}
.ov-badge { font-size: 11px; color: #ff4d4f; background: rgba(255,77,79,0.1); padding: 1px 8px; border-radius: 9999px; }
.ov-seg { display: flex; gap: 2px; background: $bg-page; border-radius: 6px; padding: 2px;
  button { border: none; background: transparent; padding: 3px 10px; border-radius: 4px; font-size: 12px; color: $text-muted; cursor: pointer; font-family: inherit; transition: all 0.15s;
    &.active { background: #fff; color: $color-primary; font-weight: 500; box-shadow: 0 1px 2px rgba(0,0,0,0.06); } } }
.ov-more-btn { display: flex; align-items: center; gap: 2px; border: none; background: transparent; color: $color-primary; font-size: 12px; cursor: pointer; font-family: inherit; &:hover { opacity: 0.7; } i { font-size: 12px; } }

/* 行布局 */
.ov-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex-shrink: 0; }

/* 异常 */
.ov-issues { padding: 6px 8px; overflow-y: auto; flex: 1; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
.issue-card { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border: 1px solid $border-color-card; border-radius: 8px; margin-bottom: 5px; transition: all 0.15s;
  &:last-child { margin-bottom: 0; } &:hover { border-color: rgba(110,75,255,0.3); background: #faf9ff; }
  &__body { flex: 1; min-width: 0; }
  &__head { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
  &__device { font-size: 13px; font-weight: 600; color: $text-base; }
  &__desc { margin: 0 0 2px; font-size: 12px; color: $text-secondary; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__meta { font-size: 11px; color: $text-muted; display: flex; align-items: center; gap: 3px; }
  &__btn { flex-shrink: 0; height: 26px; padding: 0 12px; border: 1px solid $color-primary; border-radius: 6px; background: $color-primary; color: #fff; font-size: 12px; cursor: pointer; font-family: inherit; &:hover { background: $color-primary-hover; } } }
.issue-tag { font-size: 10px; padding: 1px 6px; border-radius: 3px; font-weight: 500; flex-shrink: 0;
  &.tag-alert { background: rgba(255,77,79,0.1); color: #ff4d4f; } &.tag-data { background: rgba(250,173,20,0.12); color: #d48806; }
  &.tag-comm { background: rgba(24,144,255,0.1); color: #1890ff; } &.tag-maintain { background: $color-primary-bg; color: $color-primary; } }

/* 排行图表 */
.ov-rank-chart { flex: 1; padding: 8px 10px; min-height: 0; }

/* 健康趋势摘要 */
.ov-health-summary { display: flex; gap: 24px; padding: 8px 14px; }
.ov-health-stat { display: flex; flex-direction: column; gap: 2px;
  span { font-size: 11px; color: $text-muted; }
  strong { font-size: 18px; font-weight: 700; }
}

/* 告警趋势摘要 */
.ov-alarm-summary { display: flex; gap: 16px; }
.ov-alarm-stat { font-size: 12px; color: $text-muted; strong { color: $text-base; font-size: 13px; margin-left: 2px; }
  &.up strong { color: #ff4d4f; } &.down strong { color: $color-online; } }

/* 图表 */
.ov-chart { padding: 4px 10px 10px; }
</style>
