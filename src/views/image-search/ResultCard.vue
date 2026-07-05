<script setup lang="ts">
/**
 * 文搜图结果卡片 - 1:1 复刻 .vbr
 * 结构：媒体区(图片+检测框) + body(浅紫底：标题/时间行/地点胶囊)
 */
import type { ResultCard as ResultCardData } from './mock'

defineProps<{ data: ResultCardData }>()
</script>

<template>
  <article class="vbr">
    <!-- 媒体区：图片 + bbox -->
    <div class="vbr__media">
      <img :src="data.img" class="vbr__img" alt="检索结果" />
      <!-- 检测框（绿色边框）-->
      <div
        v-for="(b, i) in data.bboxes"
        :key="i"
        class="vbr__bbox"
        :style="{ left: b.x + '%', top: b.y + '%', width: b.w + '%', height: b.h + '%' }"
      />
    </div>

    <!-- body：浅紫底 -->
    <div class="vbr__body">
      <!-- 标题 + 时间行 -->
      <div class="vbr__body-head">
        <div class="vbr__title" :title="data.title">{{ data.title }}</div>
        <div class="vbr__meta-row">
          <span class="vbr__time-pill">
            <i class="i-ant-design-clock-circle-outlined" />
            <span>{{ data.time }}</span>
          </span>
          <span class="vbr__indexed">已索引</span>
        </div>
      </div>
      <!-- 地点胶囊 -->
      <div class="vbr__location" :title="data.location">
        <i class="i-ant-design-environment-outlined" />
        <span>{{ data.location }}</span>
      </div>
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
  cursor: pointer;
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

  .vbr__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

/* 检测框：绿色 1px */
.vbr__bbox {
  position: absolute;
  border: 1px solid rgb(52, 199, 89);
  box-sizing: border-box;
  pointer-events: none;
}

/* body：浅紫底（UAT: color(srgb 0.983 0.979 1)）*/
.vbr__body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 5px;
  background: rgb(251, 249, 255);
  border-radius: 8px;
}

.vbr__body-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.vbr__title {
  font-size: 13px;
  font-weight: 500;
  color: $text-base;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vbr__meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: $text-tertiary;
}

.vbr__time-pill {
  display: inline-flex;
  align-items: center;
  gap: 3px;

  i {
    font-size: 11px;
  }
}

.vbr__indexed {
  color: $text-muted;
}

/* 地点胶囊（UAT: color(srgb 0.971 0.964 1)）*/
.vbr__location {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 7px;
  background: rgb(247, 246, 255);
  border-radius: 8px;
  font-size: 11px;
  color: $text-secondary;
  overflow: hidden;

  i {
    font-size: 11px;
    flex-shrink: 0;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
