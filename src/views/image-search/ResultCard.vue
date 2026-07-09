<script setup lang="ts">
/**
 * 文搜图结果卡片
 * 字段：摄像头名称 + 空间节点 + 时间 + 更多按钮
 * 点击图片打开大图弹窗
 */
import type { ResultCard as ResultCardData } from './mock'
import { personMenuItems } from './mock'

interface MenuItem {
  key: string
  label: string
  icon: string
}

const props = defineProps<{
  data: ResultCardData
  // 「更多」菜单项：默认人员菜单，车辆页传 vehicleMenuItems
  menuItems?: MenuItem[]
}>()

const emit = defineEmits<{
  preview: [data: ResultCardData]
  menu: [key: string, data: ResultCardData]
}>()

// 更多菜单
const moreOpen = ref(false)

const menuItems = computed(() => props.menuItems ?? personMenuItems)

function onPreview() {
  emit('preview', props.data)
}

function onMenuClick({ key }: { key: string | number }) {
  emit('menu', String(key), props.data)
  moreOpen.value = false
}
</script>

<template>
  <article class="vbr">
    <!-- 媒体区：图片 + bbox -->
    <div class="vbr__media" @click="onPreview">
      <img :src="data.img" class="vbr__img" alt="检索结果" />
      <!-- 检测框 -->
      <div
        v-for="(b, i) in data.bboxes"
        :key="i"
        class="vbr__bbox"
        :style="{ left: b.x + '%', top: b.y + '%', width: b.w + '%', height: b.h + '%' }"
      />
      <!-- 悬浮查看提示 -->
      <div class="vbr__zoom-hint">
        <i class="i-ant-design-zoom-in-outlined" />
      </div>
    </div>

    <!-- body：区域路径 + 时间 + 更多按钮 -->
    <div class="vbr__body">
      <div class="vbr__body-info">
        <!-- 完整区域路径 -->
        <span class="vbr__location" :title="data.areaPath">
          <i class="i-ant-design-environment-outlined" />
          <span>{{ data.areaPath }}</span>
        </span>
        <!-- 时间 -->
        <span class="vbr__time-row">
          <i class="i-ant-design-clock-circle-outlined" />
          <span>{{ data.time }}</span>
        </span>
      </div>
      <!-- 更多按钮（垂直居中靠右） -->
      <a-dropdown v-model:open="moreOpen" trigger="click" placement="topRight">
        <button class="vbr__more" @click.stop>
          <i class="i-ant-design-more-outlined" />
        </button>
        <template #overlay>
          <a-menu @click="onMenuClick">
            <a-menu-item v-for="m in menuItems" :key="m.key">
              <i :class="m.icon" />
              <span>{{ m.label }}</span>
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>
    </div>
  </article>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.vbr {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px;
  background: #fff;
  border: 1px solid rgb(235, 237, 240);
  border-radius: 12px;
  transition: box-shadow 0.2s, border-color 0.2s;

  &:hover {
    border-color: $color-primary;
    box-shadow: 0 2px 8px rgba(110, 75, 255, 0.1);
  }
}

/* 媒体区 */
.vbr__media {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  aspect-ratio: 254 / 158;
  background: #f0f0f0;
  cursor: pointer;

  .vbr__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

/* 检测框 */
.vbr__bbox {
  position: absolute;
  border: 1px solid rgb(52, 199, 89);
  box-sizing: border-box;
  pointer-events: none;
}

/* hover 时显示放大镜提示 */
.vbr__zoom-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;

  i {
    font-size: 18px;
    color: #fff;
  }
}

.vbr__media:hover .vbr__zoom-hint {
  opacity: 1;
}

/* 更多按钮（body 右侧，始终显示）*/
.vbr__more {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  border: 1px solid $border-color-card;
  background: transparent;
  color: $text-secondary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s;

  i {
    font-size: 18px;
  }

  &:hover {
    background: $color-primary-bg;
    border-color: $color-primary;
    color: $color-primary;
  }
}

/* body：横向布局，左侧信息 + 右侧更多按钮 */
.vbr__body {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
}

.vbr__body-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.vbr__time-row {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: $text-tertiary;

  i {
    font-size: 11px;
  }
}
</style>
