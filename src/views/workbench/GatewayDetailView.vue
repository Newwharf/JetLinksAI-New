<script setup lang="ts">
/**
 * SaaS 工作台 · 网关详情
 * 顶部网关信息卡 + 运行状态仪表盘
 */
import dayjs, { type Dayjs } from 'dayjs'
import { useRoute, useRouter } from 'vue-router'
import ECharts from '@/components/ECharts.vue'
import gatewayPic1 from '@/assets/gatewaypic/gatew1.png'
import gatewayPic2 from '@/assets/gatewaypic/gatew2.png'
import gatewayPic3 from '@/assets/gatewaypic/gatew3.png'
import gatewayPic4 from '@/assets/gatewaypic/gatew4.png'
import { gateways } from './workbench.mock'
import { useAppStore } from '@/stores/app'

type GatewayTab = 'status' | 'sub-device' | 'message-log' | 'debug' | 'vision-model'
type TimeRange = '1h' | '1d' | '7d' | '30d' | 'custom'

interface RuntimeMetric {
  key: string
  name: string
  value: number
  unit: string
  percent: number
  desc: string
  color: string
  samples: number[]
}

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const gatewayId = computed(() => String(route.params.id || ''))
const gateway = computed(() => gateways.value.find(g => g.id === gatewayId.value) || gateways.value[0])

const gatewayNameMap: Record<string, string> = {
  g1: '办公室场景网关',
  g2: '办公室备用网关',
  g3: '商场安防网关',
  g4: '商场北区网关',
  g5: '公寓通行网关',
  g6: '养老看护网关',
  g7: '未加入离线网关',
  g8: '未加入在线网关'
}

const gatewaySerialMap: Record<string, string> = {
  g1: 'GT23923011202',
  g2: 'GT23923011203',
  g3: 'GT23923011204',
  g4: 'GT23923011205',
  g5: 'GT23923011206',
  g6: 'GT23923011207',
  g7: 'GT23923011208',
  g8: 'GT23923011209'
}

const gatewayName = computed(() => gatewayNameMap[gateway.value.id] || gateway.value.sn)
const gatewaySn = computed(() => gatewaySerialMap[gateway.value.id] || gateway.value.sn)
const gatewayPics = [gatewayPic1, gatewayPic2, gatewayPic3, gatewayPic4]
const gatewayDisplayImg = computed(() => {
  const seed = [...gateway.value.id].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return gatewayPics[seed % gatewayPics.length]
})

const activeTab = ref<GatewayTab>('status')
const timeRange = ref<TimeRange>('1h')
const customRange = ref<[Dayjs, Dayjs] | undefined>(undefined)

const runtimeMetrics = computed<RuntimeMetric[]>(() => [
  { key: 'cpu', name: 'CPU 实时使用率', value: gateway.value.cpu, unit: '%', percent: gateway.value.cpu, desc: '处理器占用', color: '#6e4bff', samples: [32, 35, 41, 38, 46, gateway.value.cpu, 49, 44, 52, gateway.value.cpu] },
  { key: 'load', name: '系统负载', value: 1.42, unit: '', percent: 47, desc: '1 分钟平均负载', color: '#1d4ed8', samples: [0.72, 0.86, 1.02, 1.21, 1.18, 1.42, 1.35, 1.51, 1.44, 1.42] },
  { key: 'jvm', name: '已使用 JVM 内存', value: 768, unit: 'MB', percent: 58, desc: 'JVM 堆内存占用', color: '#2bb3a3', samples: [486, 512, 548, 592, 634, 681, 724, 736, 752, 768] },
  { key: 'disk-used', name: '已使用磁盘大小', value: 64.8, unit: 'GB', percent: gateway.value.disk, desc: '数据分区占用', color: '#faad14', samples: [58, 59, 60, 61, 62, 62.8, 63.4, 64, 64.3, 64.8] },
  { key: 'memory', name: '系统内存使用率', value: gateway.value.memory, unit: '%', percent: gateway.value.memory, desc: '物理内存占用', color: '#13c2c2', samples: [42, 44, 46, 49, 51, gateway.value.memory, 56, 54, 52, gateway.value.memory] },
  { key: 'network-up', name: '上行流量', value: 18.6, unit: 'Mbps', percent: 37, desc: '发送到平台', color: '#3b82f6', samples: [8, 10, 12, 11, 14, 16, 19, 17, 21, 18.6] },
  { key: 'network-down', name: '下行流量', value: 9.4, unit: 'Mbps', percent: 19, desc: '平台下发到网关', color: '#8b5cf6', samples: [4, 5, 7, 6, 8, 8.5, 9, 8.2, 10, 9.4] },
  { key: 'message-rate', name: '消息吞吐', value: 1260, unit: '条/分', percent: 63, desc: '设备消息处理速率', color: '#10b981', samples: [780, 860, 940, 1010, 1130, 1180, 1240, 1210, 1290, 1260] },
  { key: 'sub-device', name: '在线子设备', value: 86, unit: '台', percent: 86, desc: '当前在线设备数', color: '#1890ff', samples: [72, 73, 76, 80, 81, 84, 86, 85, 87, 86] },
  { key: 'thread', name: '活跃线程', value: 148, unit: '个', percent: 49, desc: '当前工作线程', color: '#f97316', samples: [108, 112, 118, 126, 138, 142, 145, 151, 149, 148] },
  { key: 'heap', name: '堆内存使用率', value: 61, unit: '%', percent: 61, desc: 'JVM Heap 占用', color: '#ec4899', samples: [48, 51, 53, 55, 57, 59, 60, 62, 60, 61] },
  { key: 'non-heap', name: '非堆内存使用率', value: 44, unit: '%', percent: 44, desc: 'Metaspace 等占用', color: '#64748b', samples: [35, 36, 38, 39, 41, 42, 43, 44, 43, 44] },
  { key: 'gc', name: 'GC 次数', value: 12, unit: '次/h', percent: 24, desc: '垃圾回收频率', color: '#a855f7', samples: [6, 7, 8, 8, 9, 10, 12, 11, 13, 12] },
  { key: 'delay', name: '平台通信延迟', value: 38, unit: 'ms', percent: 19, desc: 'MQTT 往返延迟', color: '#06b6d4', samples: [26, 28, 31, 35, 33, 39, 41, 36, 40, 38] },
  { key: 'connections', name: '连接数', value: 214, unit: '个', percent: 71, desc: '设备与服务连接', color: '#84cc16', samples: [168, 176, 188, 192, 204, 210, 216, 212, 218, 214] },
  { key: 'uptime', name: '运行时长', value: 19.6, unit: '天', percent: 82, desc: '连续稳定运行', color: '#0f766e', samples: [12, 13, 14, 15, 16, 17, 18, 19, 19.4, 19.6] }
])

const activeMetricKey = ref('cpu')
const activeMetric = computed(() =>
  runtimeMetrics.value.find(m => m.key === activeMetricKey.value) || runtimeMetrics.value[0]
)

watch(runtimeMetrics, (list) => {
  if (!list.some(item => item.key === activeMetricKey.value)) {
    activeMetricKey.value = list[0]?.key || 'cpu'
  }
})

const rangeOptions: Array<{ key: TimeRange; label: string }> = [
  { key: '1h', label: '1小时' },
  { key: '1d', label: '1天' },
  { key: '7d', label: '近7天' },
  { key: '30d', label: '近30天' },
  { key: 'custom', label: '自定义' }
]

const rangeLabel = computed(() => {
  if (timeRange.value !== 'custom') {
    return rangeOptions.find(item => item.key === timeRange.value)?.label || '1小时'
  }
  if (!customRange.value) return '自定义时间'
  return `${customRange.value[0].format('MM-DD HH:mm')} 至 ${customRange.value[1].format('MM-DD HH:mm')}`
})

function metricSeries(metric: RuntimeMetric) {
  const multiplier: Record<TimeRange, number> = { '1h': 1, '1d': 1.08, '7d': 1.16, '30d': 1.28, custom: 1.12 }
  const labels = axisLabels.value
  return labels.map((_, index) => {
    const sampleIndex = Math.round((index / Math.max(labels.length - 1, 1)) * (metric.samples.length - 1))
    const item = metric.samples[sampleIndex]
    const wave = index % 2 === 0 ? 0.96 : 1.04
    const value = item * multiplier[timeRange.value] * wave
    return Number(value.toFixed(metric.unit === '%' || metric.unit === 'ms' ? 0 : 1))
  })
}

const axisLabels = computed(() => {
  if (timeRange.value === '1h') {
    return Array.from({ length: 13 }, (_, index) => `${index * 5}min`)
  }
  if (timeRange.value === '1d') {
    return Array.from({ length: 24 }, (_, index) => `${String(index).padStart(2, '0')}:00`)
  }
  if (timeRange.value === '7d') {
    return Array.from({ length: 7 }, (_, index) => dayjs().subtract(6 - index, 'day').format('MM-DD'))
  }
  if (timeRange.value === '30d') {
    return Array.from({ length: 30 }, (_, index) => dayjs().subtract(29 - index, 'day').format('MM-DD'))
  }
  return ['开始', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '结束']
})

const activeMetricSeries = computed(() => metricSeries(activeMetric.value))

const activeMetricStats = computed(() => {
  const series = activeMetricSeries.value
  const max = Math.max(...series)
  const min = Math.min(...series)
  const avg = series.reduce((sum, item) => sum + item, 0) / series.length
  const latest = series[series.length - 1]
  const previous = series[series.length - 2] ?? latest
  const trend = latest - previous
  const precision = activeMetric.value.unit === '%' || activeMetric.value.unit === 'ms' ? 0 : 1

  return {
    max: Number(max.toFixed(precision)),
    min: Number(min.toFixed(precision)),
    avg: Number(avg.toFixed(precision)),
    latest: Number(latest.toFixed(precision)),
    trend: Number(trend.toFixed(precision))
  }
})

const metricChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: (params: any[]) => {
      const item = params[0]
      return `${item.axisValue}<br/>${activeMetric.value.name}: ${item.data}${activeMetric.value.unit}`
    }
  },
  grid: { left: 44, right: 18, top: 34, bottom: timeRange.value === '30d' ? 56 : 34 },
  xAxis: {
    type: 'category',
    data: axisLabels.value,
    axisLabel: {
      fontSize: 11,
      color: '#8895ab',
      interval: 0,
      rotate: timeRange.value === '30d' ? 45 : 0
    },
    axisLine: { lineStyle: { color: '#edf0f5' } },
    axisTick: { show: false }
  },
  yAxis: {
    type: 'value',
    axisLabel: { fontSize: 11, color: '#8895ab' },
    splitLine: { lineStyle: { color: '#f4f5f7' } }
  },
  series: [
    {
      name: activeMetric.value.name,
      type: 'line',
      smooth: true,
      symbolSize: 6,
      data: activeMetricSeries.value,
      itemStyle: { color: activeMetric.value.color },
      lineStyle: { width: 2, color: activeMetric.value.color },
      areaStyle: { color: `${activeMetric.value.color}18` }
    }
  ]
}))

function switchTab(tab: GatewayTab) {
  activeTab.value = tab
}

function selectTimeRange(value: TimeRange) {
  timeRange.value = value
  if (value === 'custom' && !customRange.value) {
    customRange.value = [dayjs().subtract(6, 'hour'), dayjs()]
  }
}

function goBack() {
  router.push('/workbench')
}

function goConfigDevice() {
  if (appStore.guideStep === 'gateway-detail-enter') {
    appStore.finishGuide()
  }
  const target = router.resolve(`/video/device/gateway/${gateway.value.id}/address`)
  const url = new URL(target.href, window.location.origin)
  window.open(url.href, '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="gd-page">
    <section class="gd-hero">
      <button class="gd-hero__back" type="button" @click="goBack">
        <i class="i-ant-design-arrow-left-outlined" /><span>返回</span>
      </button>
      <div class="gd-hero__main">
        <div class="gd-hero__icon">
          <img :src="gatewayDisplayImg" alt="网关设备" draggable="false" />
        </div>
        <div class="gd-hero__info">
          <div class="gd-hero__title-row">
            <h2>{{ gatewayName }}</h2>
            <span class="gd-hero__status" :class="gateway.status">
              <i class="gd-hero__status-dot" />{{ gateway.status === 'online' ? '在线' : '离线' }}
            </span>
            <span class="gd-hero__tag">SN: {{ gatewaySn }}</span>
          </div>
          <div class="gd-hero__meta">
            <span><i class="i-ant-design-folder-outlined" />{{ gateway.projectName || '未加入项目' }}</span>
            <span><i class="i-ant-design-clock-circle-outlined" />绑定时间：2026-07-10 14:32</span>
            <span><i class="i-ant-design-code-sandbox-outlined" />当前固件：2.11.0-SNAPSHOT</span>
            <span><i class="i-ant-design-link-outlined" />接入地址：mqtt://iot-uat.jetlinks.cn:1883</span>
          </div>
        </div>
      </div>
      <div class="gd-hero__actions">
        <button
          class="gd-config-btn"
          :class="{ 'is-guide-target': appStore.guideStep === 'gateway-detail-enter' }"
          :data-guide="appStore.guideStep === 'gateway-detail-enter' ? 'gateway-detail-enter' : undefined"
          type="button"
          @click="goConfigDevice"
        >
          <i class="i-ant-design-link-outlined" /><span>进入网关</span>
        </button>
      </div>
    </section>

    <nav class="gd-tabs">
      <button :class="{ active: activeTab === 'status' }" @click="switchTab('status')">运行状态</button>
      <button :class="{ active: activeTab === 'sub-device' }" @click="switchTab('sub-device')">子设备</button>
      <button :class="{ active: activeTab === 'message-log' }" @click="switchTab('message-log')">消息日志</button>
      <button :class="{ active: activeTab === 'debug' }" @click="switchTab('debug')">远程调试</button>
      <button :class="{ active: activeTab === 'vision-model' }" @click="switchTab('vision-model')">视觉模型</button>
    </nav>

    <main class="gd-content">
      <section v-if="activeTab === 'status'" class="gd-status">
        <div class="gd-runtime">
          <section class="gd-metrics-panel">
            <div class="gd-section-head">
              <div>
                <strong>运行属性</strong>
                <span>点击指标查看对应趋势</span>
              </div>
            </div>

            <div class="gd-metric-grid">
              <button
                v-for="metric in runtimeMetrics"
                :key="metric.key"
                class="gd-metric"
                :class="{ active: activeMetricKey === metric.key }"
                type="button"
                @click="activeMetricKey = metric.key"
              >
                <span class="gd-metric__head">
                  <span class="gd-metric__name">{{ metric.name }}</span>
                  <em>{{ metric.desc }}</em>
                </span>
                <strong>{{ metric.value }}<small>{{ metric.unit }}</small></strong>
                <span class="gd-metric__bar">
                  <i :style="{ width: metric.percent + '%', background: metric.color }" />
                </span>
              </button>
            </div>
          </section>

          <section class="gd-chart-panel">
            <div class="gd-chart-panel__head">
              <div>
                <strong>{{ activeMetric.name }}</strong>
                <span>{{ rangeLabel }}</span>
              </div>
              <div class="gd-range">
                <button
                  v-for="item in rangeOptions"
                  :key="item.key"
                  type="button"
                  :class="{ active: timeRange === item.key }"
                  @click="selectTimeRange(item.key)"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>

            <div class="gd-active-metric">
              <div>
                <span>当前值</span>
                <strong :style="{ color: activeMetric.color }">
                  {{ activeMetricStats.latest }}<small>{{ activeMetric.unit }}</small>
                </strong>
              </div>
              <div>
                <span>较上一点</span>
                <strong :class="activeMetricStats.trend >= 0 ? 'is-up' : 'is-down'">
                  {{ activeMetricStats.trend >= 0 ? '+' : '' }}{{ activeMetricStats.trend }}<small>{{ activeMetric.unit }}</small>
                </strong>
              </div>
              <div>
                <span>指标说明</span>
                <em>{{ activeMetric.desc }}</em>
              </div>
            </div>

            <a-range-picker
              v-if="timeRange === 'custom'"
              v-model:value="customRange"
              class="gd-custom-range"
              show-time
            />

            <div class="gd-chart-panel__chart">
              <ECharts :option="metricChartOption" height="100%" />
            </div>

            <div class="gd-stat-row">
              <div>
                <span>平均值</span>
                <strong>{{ activeMetricStats.avg }}<small>{{ activeMetric.unit }}</small></strong>
              </div>
              <div>
                <span>峰值</span>
                <strong>{{ activeMetricStats.max }}<small>{{ activeMetric.unit }}</small></strong>
              </div>
              <div>
                <span>低谷</span>
                <strong>{{ activeMetricStats.min }}<small>{{ activeMetric.unit }}</small></strong>
              </div>
            </div>
          </section>
        </div>
      </section>

      <section v-else class="gd-placeholder">
        <i class="i-ant-design-appstore-outlined gd-placeholder__icon" />
        <p>该模块内容待接入</p>
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.gd-page {
  height: 100%;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  background: $bg-page;
}

.gd-hero {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  background: #fff;
  border-radius: 14px;
  padding: 42px 20px 16px;
  flex-shrink: 0;
}

.gd-hero__back {
  position: absolute;
  top: 12px;
  left: 16px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 24px;
  padding: 0;
  border: none;
  background: transparent;
  color: $text-secondary;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: color 0.15s;

  i {
    font-size: 14px;
  }

  &:hover {
    color: $color-primary;
  }
}

.gd-hero__main {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

.gd-hero__icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 48px;
    height: 38px;
    object-fit: contain;
  }
}

.gd-hero__info {
  min-width: 0;
}

.gd-hero__title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: $text-base;
  }
}

.gd-hero__status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;

  &.online {
    color: $color-online;
    background: $color-online-bg;
  }

  &.offline {
    color: $text-tertiary;
    background: rgba(154, 161, 171, 0.12);
  }
}

.gd-hero__status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.gd-hero__tag {
  font-size: 11px;
  color: $text-muted;
  font-family: 'Courier New', monospace;
  background: $bg-page;
  padding: 2px 8px;
  border-radius: 4px;
}

.gd-hero__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 14px;
  font-size: 12px;
  color: $text-secondary;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
    min-width: 0;
  }

  i {
    font-size: 13px;
    color: $text-muted;
    flex-shrink: 0;
  }
}

.gd-hero__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.gd-config-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;

  i {
    font-size: 14px;
  }
}

.gd-config-btn {
  border: 1px solid $color-primary;
  background: $color-primary;
  color: #fff;

  &:hover {
    background: $color-primary-hover;
  }

  &.is-guide-target {
    position: relative;
    z-index: 1999;
  }
}

.gd-tabs {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  border-bottom: 1px solid $border-color-card;
  background: #fff;
  border-radius: 12px 12px 0 0;
  padding: 0 8px;

  button {
    border: none;
    background: transparent;
    padding: 10px 16px;
    font-size: 14px;
    color: $text-secondary;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    font-family: inherit;
    transition: all 0.15s;

    &.active {
      color: $color-primary;
      border-bottom-color: $color-primary;
      font-weight: 500;
    }
  }
}

.gd-content {
  flex: 1;
  display: flex;
  min-height: 0;
}

.gd-status {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.gd-runtime {
  display: grid;
  grid-template-columns: minmax(420px, 1fr) minmax(420px, 1fr);
  gap: 12px;
  flex: 1;
  min-height: 0;
}

.gd-metrics-panel,
.gd-chart-panel {
  background: #fff;
  border-radius: 12px;
  min-width: 0;
  min-height: 0;
}

.gd-metrics-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gd-section-head,
.gd-chart-panel__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid $border-color-card;

  div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  strong {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
  }

  span {
    font-size: 12px;
    color: $text-muted;
  }
}

.gd-metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 10px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.gd-metric {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  background: #fff;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;

  &:hover,
  &.active {
    border-color: rgba(110, 75, 255, 0.36);
    background: #faf9ff;
  }

  strong {
    font-size: 22px;
    line-height: 1.1;
    color: $text-base;
    font-weight: 700;

    small {
      margin-left: 2px;
      font-size: 12px;
      color: $text-muted;
      font-weight: 400;
    }
  }
}

.gd-metric__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.gd-metric__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: $text-secondary;
}

.gd-metric em {
  flex-shrink: 0;
  font-style: normal;
  font-size: 10px;
  color: $text-muted;
}

.gd-metric__bar {
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
  background: $border-color-card;

  i {
    display: block;
    height: 100%;
    border-radius: 999px;
  }
}

.gd-chart-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gd-range {
  display: flex !important;
  flex-direction: row !important;
  align-items: center;
  gap: 4px !important;
  flex-shrink: 0;

  button {
    height: 28px;
    padding: 0 9px;
    border: 1px solid $border-color-card;
    border-radius: 6px;
    background: #fff;
    color: $text-secondary;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;

    &.active,
    &:hover {
      border-color: $color-primary;
      background: $color-primary-bg;
      color: $color-primary;
    }
  }
}

.gd-custom-range {
  width: calc(100% - 32px);
  margin: 12px 16px 0;
}

.gd-active-metric {
  display: grid;
  grid-template-columns: 1fr 1fr 1.25fr;
  gap: 8px;
  padding: 10px 16px 0;

  div {
    min-width: 0;
    min-height: 76px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid $border-color-card;
    border-radius: 10px;
    background: #fafbfc;
  }

  span {
    font-size: 12px;
    color: $text-muted;
  }

  strong {
    font-size: 24px;
    line-height: 1.1;
    color: $text-base;
    font-weight: 700;

    small {
      margin-left: 2px;
      font-size: 12px;
      font-weight: 400;
      color: $text-muted;
    }

    &.is-up {
      color: #ff4d4f;
    }

    &.is-down {
      color: $color-online;
    }
  }

  em {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-style: normal;
    font-size: 14px;
    color: $text-secondary;
  }
}

.gd-chart-panel__chart {
  flex: 1;
  min-height: 260px;
  padding: 8px 12px 0;
}

.gd-stat-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  padding: 10px 16px 16px;

  div {
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #fff;
    border: 1px solid $border-color-card;
  }

  span {
    font-size: 12px;
    color: $text-tertiary;
  }

  strong {
    font-size: 16px;
    color: $text-base;
    font-weight: 650;

    small {
      margin-left: 2px;
      font-size: 11px;
      font-weight: 400;
      color: $text-muted;
    }
  }
}

.gd-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: #fff;
  border-radius: 0 0 12px 12px;

  p {
    margin: 0;
    font-size: 14px;
    color: $text-muted;
  }
}

.gd-placeholder__icon {
  font-size: 40px;
  color: $color-primary;
  opacity: 0.4;
}

@media (max-width: 1180px) {
  .gd-runtime {
    grid-template-columns: 1fr;
  }

  .gd-active-metric {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 860px) {
  .gd-hero {
    flex-direction: column;
  }

  .gd-metric-grid {
    grid-template-columns: 1fr;
  }

  .gd-tabs {
    overflow-x: auto;
  }

  .gd-stat-row {
    grid-template-columns: 1fr;
  }
}
</style>
