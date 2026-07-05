<script setup lang="ts">
/**
 * 文搜图筛选侧栏 - 1:1 复刻 .vbf
 * 260px 宽：筛选头(筛选/重置) + 时间范围 + 人员标签(上衣/裤子颜色/目标身份/人员穿着) + 车辆标签(基础类型/车身颜色/车牌颜色)
 */
import {
  upperColors,
  lowerColors,
  timeOptions,
  identityChips,
  clothingChips,
  vehicleTypeChips,
  vehicleColorChips,
  plateColorChips
} from './mock'

const timeValue = ref('全部时间')

// 选中的标签（多选集合）
const selected = reactive<Set<string>>(new Set())

function toggle(chip: string) {
  if (selected.has(chip)) selected.delete(chip)
  else selected.add(chip)
  // 触发响应式
  selected.add('__force__')
  selected.delete('__force__')
}

function isSelected(chip: string) {
  return selected.has(chip)
}

// 颜色 chip 选中态
const selectedColors = reactive<Set<string>>(new Set())
function toggleColor(title: string) {
  if (selectedColors.has(title)) selectedColors.delete(title)
  else selectedColors.add(title)
  selectedColors.add('__force__')
  selectedColors.delete('__force__')
}

function reset() {
  selected.clear()
  selectedColors.clear()
  timeValue.value = '全部时间'
}

// 更多折叠（人员标签、车辆标签各有一个"更多"）
const morePersonOpen = ref(false)
const moreVehicleOpen = ref(false)
</script>

<template>
  <aside class="vbf">
    <!-- 筛选头 -->
    <header class="vbf__head">
      <h3>筛选</h3>
      <button class="vbf__reset" @click="reset">重置</button>
    </header>

    <!-- 时间范围 -->
    <section class="vbf__section">
      <h4>时间范围</h4>
      <a-select v-model:value="timeValue" class="vbf__select" :options="timeOptions.map(t => ({ value: t, label: t }))" />
    </section>

    <!-- 人员标签 -->
    <section class="vbf__section vbf__section--tag">
      <div class="vbf__tag-section">
        <h4>人员标签</h4>
        <div class="vbf__tag-sections">
          <!-- 上衣颜色 -->
          <div class="vbf__tag-group">
            <div class="vbf__clothing-row">
              <div class="vbf__clothing-label">上衣颜色</div>
              <div class="vbf__chips">
                <button
                  v-for="c in upperColors"
                  :key="c.title"
                  class="vbf__color-chip"
                  :class="{ active: selectedColors.has(c.title) }"
                  :style="{ background: c.bg }"
                  :title="c.title"
                  @click="toggleColor(c.title)"
                />
              </div>
            </div>
            <!-- 裤子颜色 -->
            <div class="vbf__clothing-row">
              <div class="vbf__clothing-label">裤子颜色</div>
              <div class="vbf__chips">
                <button
                  v-for="c in lowerColors"
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

          <!-- 目标身份 -->
          <div class="vbf__tag-group">
            <div class="vbf__tag-group-title">目标身份</div>
            <div class="vbf__chips">
              <button
                v-for="chip in identityChips"
                :key="chip"
                class="vbf__chip"
                :class="{ active: isSelected(chip) }"
                @click="toggle(chip)"
              >
                {{ chip }}
              </button>
            </div>
          </div>

          <!-- 人员穿着 -->
          <div class="vbf__tag-group">
            <div class="vbf__tag-group-title">人员穿着</div>
            <div class="vbf__chips">
              <button
                v-for="chip in clothingChips"
                :key="chip"
                class="vbf__chip"
                :class="{ active: isSelected(chip) }"
                @click="toggle(chip)"
              >
                {{ chip }}
              </button>
            </div>
          </div>

          <!-- 更多（人员）-->
          <div class="vbf__tag-group">
            <button class="vbf__more" @click="morePersonOpen = !morePersonOpen">
              <span>更多 (2)</span>
              <i class="i-ant-design-down-outlined" :class="{ open: morePersonOpen }" />
            </button>
          </div>
        </div>
      </div>

      <!-- 车辆标签 -->
      <div class="vbf__tag-section">
        <h4>车辆标签</h4>
        <div class="vbf__tag-sections">
          <!-- 基础类型 -->
          <div class="vbf__tag-group">
            <div class="vbf__tag-group-title">基础类型</div>
            <div class="vbf__chips">
              <button
                v-for="chip in vehicleTypeChips"
                :key="chip"
                class="vbf__chip"
                :class="{ active: isSelected(chip) }"
                @click="toggle(chip)"
              >
                {{ chip }}
              </button>
            </div>
          </div>

          <!-- 车身颜色 -->
          <div class="vbf__tag-group">
            <div class="vbf__tag-group-title">车身颜色</div>
            <div class="vbf__chips">
              <button
                v-for="chip in vehicleColorChips"
                :key="chip"
                class="vbf__chip"
                :class="{ active: isSelected(chip) }"
                @click="toggle(chip)"
              >
                {{ chip }}
              </button>
            </div>
          </div>

          <!-- 车牌颜色 -->
          <div class="vbf__tag-group">
            <div class="vbf__tag-group-title">车牌颜色</div>
            <div class="vbf__chips">
              <button
                v-for="chip in plateColorChips"
                :key="chip"
                class="vbf__chip"
                :class="{ active: isSelected(chip) }"
                @click="toggle(chip)"
              >
                {{ chip }}
              </button>
            </div>
          </div>

          <!-- 更多（车辆）-->
          <div class="vbf__tag-group">
            <button class="vbf__more" @click="moreVehicleOpen = !moreVehicleOpen">
              <span>更多 (4)</span>
              <i class="i-ant-design-down-outlined" :class="{ open: moreVehicleOpen }" />
            </button>
          </div>
        </div>
      </div>
    </section>
  </aside>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

/* 侧栏容器：260px（UAT: bg color(srgb 0.9986 0.9983 1), border color(srgb 0.9216 0.9294 0.9412 / 0.78)）*/
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
    gap: 0;
    padding-top: 14px;
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
  }
}

/* tag-section */
.vbf__tag-section {
  display: flex;
  flex-direction: column;
  gap: 12px;

  & + .vbf__tag-section {
    padding-top: 12px;
  }
}

.vbf__tag-sections {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vbf__tag-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 颜色行（上衣/裤子）*/
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

/* chip 容器：自动换行 */
.vbf__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* 文字 chip */
.vbf__chip {
  padding: 6px 12px;
  background: rgb(246, 244, 255);
  color: $text-secondary;
  font-size: 13px;
  border: 1px solid rgb(235, 237, 240);
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  &:hover {
    border-color: $color-primary;
  }

  &.active {
    background: $color-primary;
    border-color: $color-primary;
    color: #fff;
  }
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

/* 更多按钮：虚线边框（UAT: bg color(srgb 0.9972 0.9965 1)）*/
.vbf__more {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 10px 12px;
  background: rgb(254, 253, 255);
  color: $text-secondary;
  font-size: 13px;
  border: 1px dashed rgba(235, 237, 239, 0.8);
  border-radius: 12px;
  cursor: pointer;
  font-family: inherit;

  i {
    font-size: 12px;
    transition: transform 0.2s;

    &.open {
      transform: rotate(180deg);
    }
  }
}
</style>
