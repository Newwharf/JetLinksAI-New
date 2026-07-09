<script setup lang="ts">
/**
 * 文搜图筛选侧栏（车辆专用）
 * 区域摄像头树 + 时间范围 + 车辆类型多选下拉 + 车辆颜色 chip
 */
import {
  vehicleTypeChips,
  vehicleColorChipsWithBg,
  timeOptions,
  cameraTreeData
} from './mock'

// 时间范围
const timeValue = ref('全部时间')

// 选中的摄像头（树多选）
const selectedCameras = ref<string[]>([])

// 车辆类型（多选 + 可搜索）
const selectedTypes = ref<string[]>([])

// 车辆颜色 chip 选中态
const selectedColors = reactive<Set<string>>(new Set())
function toggleColor(title: string) {
  if (selectedColors.has(title)) selectedColors.delete(title)
  else selectedColors.add(title)
  selectedColors.add('__force__')
  selectedColors.delete('__force__')
}

function reset() {
  timeValue.value = '全部时间'
  selectedCameras.value = []
  selectedTypes.value = []
  selectedColors.clear()
}
</script>

<template>
  <aside class="vbf">
    <!-- 筛选头 -->
    <header class="vbf__head">
      <h3>筛选</h3>
      <button class="vbf__reset" @click="reset">重置</button>
    </header>

    <!-- 区域摄像头（树形多选）-->
    <section class="vbf__section">
      <h4>区域 / 摄像头</h4>
      <a-tree-select
        v-model:value="selectedCameras"
        :tree-data="cameraTreeData"
        tree-checkable
        :show-checked-strategy="'SHOW_CHILD'"
        placeholder="选择区域或摄像头"
        allow-clear
        tree-default-expand-all
        :max-tag-count="2"
        class="vbf__select"
      />
    </section>

    <!-- 时间范围 -->
    <section class="vbf__section">
      <h4>时间范围</h4>
      <a-select
        v-model:value="timeValue"
        class="vbf__select"
        :options="timeOptions.map(t => ({ value: t, label: t }))"
      />
    </section>

    <!-- 车辆标签 -->
    <section class="vbf__section vbf__section--tag">
      <h4>车辆标签</h4>

      <!-- 车辆颜色 -->
      <div class="vbf__tag-group">
        <div class="vbf__clothing-row">
          <div class="vbf__clothing-label">车辆颜色</div>
          <div class="vbf__chips">
            <button
              v-for="c in vehicleColorChipsWithBg"
              :key="c.title"
              class="vbf__color-chip"
              :class="{ active: selectedColors.has(c.title) }"
              :style="{ background: c.bg }"
              :title="c.title"
              @click="toggleColor(c.title)"
            />
          </div>
        </div>
      </div>

      <!-- 车辆类型（多选下拉，可搜索）-->
      <div class="vbf__tag-group">
        <div class="vbf__tag-group-title">车辆类型</div>
        <a-select
          v-model:value="selectedTypes"
          mode="multiple"
          show-search
          allow-clear
          placeholder="选择或搜索车辆类型"
          :options="vehicleTypeChips.map(c => ({ value: c, label: c }))"
          :max-tag-count="3"
          class="vbf__select"
        />
      </div>
    </section>
  </aside>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

/* 侧栏容器 */
.vbf {
  width: 260px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  background: rgb(254, 253, 255);
  border: 1px solid rgba(235, 237, 239, 0.78);
  border-radius: 12px;
  height: fit-content;
}

/* 筛选头 */
.vbf__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(235, 237, 239, 0.78);

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
    color: rgba(0, 0, 0, 0.85);
  }
}

.vbf__reset {
  border: none;
  background: transparent;
  color: $color-primary;
  font-size: 14px;
  cursor: pointer;
  padding: 0;
  font-family: inherit;

  &:hover {
    opacity: 0.8;
  }
}

/* section 通用 */
.vbf__section {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &--tag {
    gap: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(235, 237, 239, 0.78);
  }

  > h4 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: $text-secondary;
  }
}

.vbf__select {
  width: 100%;

  :deep(.ant-select-selector) {
    border-radius: 6px !important;
    border-color: rgb(235, 237, 240) !important;
    min-height: 32px;
  }
}

/* tag group */
.vbf__tag-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 颜色行 */
.vbf__clothing-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.vbf__clothing-label,
.vbf__tag-group-title {
  font-size: 12px;
  color: $text-muted;
}

/* chip 容器 */
.vbf__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 颜色 chip：18x18 圆形 */
.vbf__color-chip {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #fff;
  cursor: pointer;
  padding: 0;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
  transition: transform 0.15s;

  &:hover {
    transform: scale(1.15);
  }

  &.active {
    box-shadow: 0 0 0 2px $color-primary;
  }
}
</style>
