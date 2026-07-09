<script setup lang="ts">
/**
 * ECharts 轻量封装组件
 * 使用整包导入（echarts 6 的子路径类型声明不完整，整包 types 字段有效）
 * 自适应容器宽高（ResizeObserver）
 */
import * as echarts from 'echarts'

const props = defineProps<{
  option: echarts.EChartsCoreOption
  height?: string
}>()

const emit = defineEmits<{
  chartClick: [params: any]
}>()

const elRef = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null

function render() {
  if (!elRef.value) return
  if (!chart) {
    chart = echarts.init(elRef.value)
    chart.on('click', (params: any) => emit('chartClick', params))
  }
  chart.setOption(props.option, true)
}

onMounted(() => {
  render()
  if (elRef.value) {
    const ro = new ResizeObserver(() => chart?.resize())
    ro.observe(elRef.value)
    onBeforeUnmount(() => ro.disconnect())
  }
})

watch(
  () => props.option,
  () => render(),
  { deep: true }
)

onBeforeUnmount(() => {
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div ref="elRef" class="echarts-box" :style="{ height: height || '100%' }" />
</template>

<style scoped>
.echarts-box {
  width: 100%;
}
</style>
