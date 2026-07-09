<script setup lang="ts">
/**
 * 人员档案 - 卡片视图单项
 * 人脸图（含人脸框）+ 名称 + 重点标记 + 最后出现（时间/摄像头/区域）
 * 点击进入详情
 */
import type { PersonProfile } from './person-profile.mock'

defineProps<{ data: PersonProfile }>()

const emit = defineEmits<{
  detail: [id: string]
  toggleFocus: [id: string]
}>()

function onDetail(id: string) {
  emit('detail', id)
}
</script>

<template>
  <article class="pcard" @click="onDetail(data.id)">
    <!-- 人脸图 -->
    <div class="pcard__media">
      <img :src="data.faces[0]" class="pcard__img" alt="人脸" />
      <div
        v-for="(b, i) in data.faceBoxes"
        :key="i"
        class="pcard__bbox"
        :style="{ left: b.x + '%', top: b.y + '%', width: b.w + '%', height: b.h + '%' }"
      />
      <!-- 重点标记 -->
      <span v-if="data.keyFocus" class="pcard__focus">
        <i class="i-ant-design-star-filled" />重点关注
      </span>
    </div>

    <!-- 信息区 -->
    <div class="pcard__body">
      <div class="pcard__name-row">
        <span class="pcard__name">{{ data.name }}</span>
        <button
          class="pcard__star"
          :class="{ active: data.keyFocus }"
          :title="data.keyFocus ? '取消重点关注' : '设为重点关注'"
          @click.stop="emit('toggleFocus', data.id)"
        >
          <i :class="data.keyFocus ? 'i-ant-design-star-filled' : 'i-ant-design-star-outlined'" />
        </button>
      </div>
      <div class="pcard__last">
        <div class="pcard__last-line">
          <i class="i-ant-design-clock-circle-outlined" />
          <span>最后出现 {{ data.lastSeenAt }}</span>
        </div>
        <div class="pcard__last-line" :title="data.lastSeenCamera + ' · ' + data.lastSeenArea">
          <i class="i-ant-design-video-camera-outlined" />
          <span>{{ data.lastSeenCamera }}</span>
        </div>
      </div>
    </div>
  </article>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.pcard {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;

  &:hover {
    border-color: $color-primary;
    box-shadow: 0 2px 12px rgba(110, 75, 255, 0.12);
  }
}

/* 人脸图区 */
.pcard__media {
  position: relative;
  aspect-ratio: 4 / 3;
  background: #f0f0f0;
  overflow: hidden;

  .pcard__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

.pcard__bbox {
  position: absolute;
  border: 2px solid rgb(52, 199, 89);
  box-sizing: border-box;
  pointer-events: none;
}

.pcard__focus {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(250, 140, 22, 0.92);
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  backdrop-filter: blur(2px);

  i { font-size: 11px; }
}

/* 信息区 */
.pcard__body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px 12px;
}

.pcard__name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pcard__name {
  font-size: 15px;
  font-weight: 600;
  color: $text-base;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pcard__star {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 2px;
  color: $text-muted;
  transition: color 0.15s, transform 0.15s;

  i { font-size: 18px; }

  &:hover { transform: scale(1.15); }
  &.active { color: #fa8c16; }
}

.pcard__last {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.pcard__last-line {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: $text-tertiary;
  overflow: hidden;

  i { font-size: 12px; flex-shrink: 0; }
  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
