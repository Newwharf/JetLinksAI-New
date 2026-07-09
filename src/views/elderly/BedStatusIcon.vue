<script setup lang="ts">
/**
 * 床位状态图标（侧视图）
 * 在床 = 床 + 床上有人躺卧（头靠枕头、盖被隆起）
 * 离床 = 只有空床（人已离开）
 * 颜色按状态：在床绿 / 离床橙 / 空床灰
 */
interface Props {
  inBed: boolean
  health: 'in-bed' | 'leave' | 'empty'
  size?: number
}

const props = withDefaults(defineProps<Props>(), { size: 22 })

const colorMap: Record<string, string> = {
  'in-bed': '#52c41a',   // 在床 - 绿
  'leave': '#fa8c16',    // 离床 - 橙
  'empty': '#bfbfbf'     // 空床 - 灰
}

const color = computed(() => colorMap[props.health] ?? colorMap['in-bed'])
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 32 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="bed-status-icon"
  >
    <!-- 床头板（左侧高板） -->
    <path d="M3 18 L3 6 Q3 5 4 5 L6 5 Q7 5 7 6 L7 18 Z" :fill="color" opacity="0.9" />
    <!-- 床尾板（右侧矮板） -->
    <path d="M27 18 L27 10 Q27 9 28 9 L29 9 Q30 9 30 10 L30 18 Z" :fill="color" opacity="0.8" />
    <!-- 床垫 -->
    <rect x="5" y="16" width="24" height="5" rx="2" :fill="color" fill-opacity="0.18" :stroke="color" stroke-width="1.6" />
    <!-- 床腿 -->
    <line x1="6.5" y1="21" x2="6.5" y2="25" :stroke="color" stroke-width="1.8" stroke-linecap="round" />
    <line x1="27.5" y1="21" x2="27.5" y2="25" :stroke="color" stroke-width="1.8" stroke-linecap="round" />

    <!-- 在床：床上躺卧的人（侧视，头在枕头/床头一侧） -->
    <g v-if="inBed">
      <!-- 头 -->
      <circle cx="10" cy="14" r="2.6" :fill="color" />
      <!-- 身体（盖被隆起，从床头延伸到床尾） -->
      <path
        d="M8 17 Q8 15 10 15 L23 15 Q26 15 26 17.5 L26 18.5 Q26 19 25.5 19 L8.5 19 Q8 19 8 18.5 Z"
        :fill="color"
        fill-opacity="0.9"
      />
    </g>
  </svg>
</template>

<style scoped>
.bed-status-icon {
  display: block;
  flex-shrink: 0;
}
</style>
