<script setup lang="ts">
/**
 * 临时轨迹跟踪 - 详情页
 * 左侧：人员基本信息（人脸图、名称、性别年龄、跟踪状态、原因、时间）
 * 右侧：出现事件时间线（在哪些摄像头、哪个时间段出现过）
 * 布局：左固定 340px + 右自适应事件列表
 */
import { useRoute, useRouter } from 'vue-router'
import {
  buildTrackEvents,
  formatDuration,
  type TrackEvent
} from './person-track.mock'
import { usePersonTrackStore } from '@/stores/person-track'

const route = useRoute()
const router = useRouter()
const trackStore = usePersonTrackStore()

const personId = computed(() => route.params.id as string)
const person = computed(() => trackStore.getById(personId.value))

const events = computed<TrackEvent[]>(() =>
  person.value ? buildTrackEvents(person.value) : []
)

// 当前选中的事件（点击后弹出详情面板）
const selectedEventId = ref<string | null>(null)
const selectedEvent = computed<TrackEvent | undefined>(() =>
  events.value.find(e => e.id === selectedEventId.value)
)

function back() {
  router.push('/image-search/person-track')
}

function endTrack() {
  if (person.value) trackStore.endTrack(person.value.id)
}

function selectEvent(ev: TrackEvent) {
  selectedEventId.value = ev.id
}

function closeEventPanel() {
  selectedEventId.value = null
}
</script>

<template>
  <div v-if="person" class="td-page">
    <!-- 返回栏 -->
    <header class="td-back-bar">
      <button class="td-back" @click="back">
        <i class="i-ant-design-arrow-left-outlined" />返回列表
      </button>
    </header>

    <!-- 主体：左信息 + 右事件 -->
    <div class="td-body">
      <!-- ===== 左侧：基本信息 ===== -->
      <aside class="td-info">
        <!-- 人脸图 -->
        <div class="td-face-main">
          <img :src="person.faces[0]" alt="人脸" />
          <div
            v-for="(b, i) in person.faceBoxes"
            :key="i"
            class="td-bbox"
            :style="{ left: b.x + '%', top: b.y + '%', width: b.w + '%', height: b.h + '%' }"
          />
          <span class="td-face-status" :class="person.status">
            <i :class="person.status === 'tracking' ? 'i-ant-design-eye-filled' : 'i-ant-design-check-circle-outlined'" />
            {{ person.status === 'tracking' ? '跟踪中' : '已结束' }}
          </span>
        </div>

        <!-- 缩略图 -->
        <div v-if="person.faces.length > 1" class="td-thumbs">
          <div
            v-for="(f, i) in person.faces"
            :key="i"
            class="td-thumb"
            :class="{ active: i === 0 }"
          >
            <img :src="f" alt="缩略图" />
          </div>
        </div>

        <!-- 名称 -->
        <h1 class="td-name">{{ person.name }}</h1>

        <!-- 属性 -->
        <div class="td-attrs">
          <span class="td-attr">{{ person.gender }}</span>
          <span class="td-attr-sep">·</span>
          <span class="td-attr">{{ person.ageRange }}岁</span>
        </div>

        <!-- 信息列表 -->
        <div class="td-fields">
          <div class="td-field">
            <i class="i-ant-design-play-circle-outlined" />
            <span class="td-field-label">开始时间</span>
          </div>
          <div class="td-field-value">{{ person.startedAt }}</div>

          <div v-if="person.endedAt" class="td-field">
            <i class="i-ant-design-stop-circle-outlined" />
            <span class="td-field-label">结束时间</span>
          </div>
          <div v-if="person.endedAt" class="td-field-value">{{ person.endedAt }}</div>

          <div class="td-field">
            <i class="i-ant-design-clock-circle-outlined" />
            <span class="td-field-label">最后出现</span>
          </div>
          <div class="td-field-value">{{ person.lastSeenAt }}</div>

          <div class="td-field">
            <i class="i-ant-design-video-camera-outlined" />
            <span class="td-field-label">最后摄像头</span>
          </div>
          <div class="td-field-value">{{ person.lastSeenCamera }}</div>

          <div class="td-field">
            <i class="i-ant-design-environment-outlined" />
            <span class="td-field-label">最后区域</span>
          </div>
          <div class="td-field-value">{{ person.lastSeenArea }}</div>

          <div class="td-field">
            <i class="i-ant-design-history-outlined" />
            <span class="td-field-label">出现事件</span>
          </div>
          <div class="td-field-value">{{ person.eventCount }} 次</div>
        </div>

        <!-- 操作 -->
        <button
          v-if="person.status === 'tracking'"
          class="td-end-btn"
          @click="endTrack"
        >
          <i class="i-ant-design-stop-outlined" />结束跟踪
        </button>
      </aside>

      <!-- ===== 右侧：出现事件列表 ===== -->
      <section class="td-events">
        <div class="td-events-head">
          <h2>
            识别轨迹
            <em class="td-events-count">{{ events.length }}</em>
          </h2>
          <span class="td-events-hint">按时间倒序，展示该人员在各摄像头的出现记录</span>
        </div>

        <div v-if="events.length" class="td-timeline">
          <div v-for="(ev, i) in events" :key="ev.id" class="td-ev">
            <!-- 时间线轴 -->
            <div class="td-ev-rail">
              <span class="td-ev-dot" :class="{ active: selectedEventId === ev.id }" />
              <span v-if="i < events.length - 1" class="td-ev-line" />
            </div>

            <div
              class="td-ev-card"
              :class="{ selected: selectedEventId === ev.id }"
              @click="selectEvent(ev)"
            >
              <div class="td-ev-snap">
                <img :src="ev.snapshot" alt="抓拍" />
              </div>
              <div class="td-ev-info">
                <div class="td-ev-time">
                  <i class="i-ant-design-clock-circle-outlined" />
                  <span>{{ ev.startTime }}</span>
                  <span class="td-ev-arrow">→</span>
                  <span>{{ ev.endTime }}</span>
                </div>
                <div class="td-ev-cam" :title="ev.camera + ' · ' + ev.areaPath">
                  <i class="i-ant-design-video-camera-outlined" />
                  <span class="td-ev-cam-name">{{ ev.camera }}</span>
                  <span class="td-ev-area">{{ ev.areaPath }}</span>
                </div>
                <div class="td-ev-duration">
                  <i class="i-ant-design-timer-outlined" />
                  出现 {{ formatDuration(ev.duration) }}
                </div>
              </div>
              <i class="i-ant-design-right-outlined td-ev-cheap" />
            </div>
          </div>
        </div>

        <div v-else class="td-events-empty">
          <i class="i-ant-design-inbox-outlined" />
          <p>暂无出现事件</p>
        </div>
      </section>
    </div>

    <!-- ===== 事件详情弹出面板（从右侧滑入） ===== -->
    <transition name="slide-panel">
      <div v-if="selectedEvent" class="ev-panel">
        <!-- 遮罩 -->
        <div class="ev-panel-mask" @click="closeEventPanel" />

        <!-- 面板主体 -->
        <aside class="ev-panel-body">
          <header class="ev-panel-head">
            <div class="ev-panel-title">
              <i class="i-ant-design-eye-outlined" />
              <span>出现事件详情</span>
            </div>
            <button class="ev-panel-close" @click="closeEventPanel">
              <i class="i-ant-design-close-outlined" />
            </button>
          </header>

          <div class="ev-panel-scroll">
            <!-- 大图 -->
            <div class="ev-panel-snap">
              <img :src="selectedEvent.snapshot" alt="抓拍大图" />
              <span class="ev-panel-snap-tag">抓拍画面</span>
            </div>

            <!-- 时间段 -->
            <div class="ev-panel-section">
              <div class="ev-panel-section-title">
                <i class="i-ant-design-clock-circle-outlined" />出现时间段
              </div>
              <div class="ev-panel-time-range">
                <div class="ev-panel-time-item">
                  <span class="ev-panel-time-label">开始</span>
                  <span class="ev-panel-time-val">{{ selectedEvent.startTime }}</span>
                </div>
                <div class="ev-panel-time-sep">
                  <i class="i-ant-design-arrow-right-outlined" />
                </div>
                <div class="ev-panel-time-item">
                  <span class="ev-panel-time-label">结束</span>
                  <span class="ev-panel-time-val">{{ selectedEvent.endTime }}</span>
                </div>
                <div class="ev-panel-time-dur">
                  共 {{ formatDuration(selectedEvent.duration) }}
                </div>
              </div>
            </div>

            <!-- 摄像头 / 区域 -->
            <div class="ev-panel-section">
              <div class="ev-panel-row">
                <i class="i-ant-design-video-camera-outlined" />
                <span class="ev-panel-row-label">摄像头</span>
                <span class="ev-panel-row-value">{{ selectedEvent.camera }}</span>
              </div>
              <div class="ev-panel-row">
                <i class="i-ant-design-environment-outlined" />
                <span class="ev-panel-row-label">区域位置</span>
                <span class="ev-panel-row-value">{{ selectedEvent.areaPath }}</span>
              </div>
            </div>

            <!-- 占位补充信息 -->
            <div class="ev-panel-section">
              <div class="ev-panel-section-title">
                <i class="i-ant-design-info-circle-outlined" />其他信息
              </div>
              <div class="ev-panel-meta-grid">
                <div class="ev-panel-meta-cell">
                  <span class="ev-panel-meta-label">事件编号</span>
                  <span class="ev-panel-meta-value">{{ selectedEvent.id }}</span>
                </div>
                <div class="ev-panel-meta-cell">
                  <span class="ev-panel-meta-label">持续秒数</span>
                  <span class="ev-panel-meta-value">{{ selectedEvent.duration }}s</span>
                </div>
                <div class="ev-panel-meta-cell">
                  <span class="ev-panel-meta-label">所属人员</span>
                  <span class="ev-panel-meta-value">{{ person?.name }}</span>
                </div>
                <div class="ev-panel-meta-cell">
                  <span class="ev-panel-meta-label">跟踪状态</span>
                  <span class="ev-panel-meta-value">
                    {{ person?.status === 'tracking' ? '跟踪中' : '已结束' }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部操作 -->
          <footer class="ev-panel-foot">
            <button class="ev-panel-btn">
              <i class="i-ant-design-play-circle-outlined" />查看回放
            </button>
            <button class="ev-panel-btn primary">
              <i class="i-ant-design-download-outlined" />下载抓拍
            </button>
          </footer>
        </aside>
      </div>
    </transition>
  </div>

  <!-- 未找到 -->
  <div v-else class="td-notfound">
    <i class="i-ant-design-user-delete-outlined" />
    <p>未找到该跟踪人员</p>
    <button @click="back">返回列表</button>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.td-page {
  height: 100%;
  background: $bg-page;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

/* ===== 返回栏 ===== */
.td-back-bar {
  flex-shrink: 0;
}

.td-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: transparent;
  color: $color-primary;
  font-size: 13px;
  cursor: pointer;
  padding: 0;
  font-family: inherit;

  i { font-size: 14px; }
  &:hover { opacity: 0.8; }
}

/* ===== 主体布局：左 + 右 ===== */
.td-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 16px;
  overflow: hidden;
}

/* ===== 左侧信息面板 ===== */
.td-info {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.td-face-main {
  position: relative;
  width: 200px;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  background: #f0f0f0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.td-bbox {
  position: absolute;
  border: 2px solid rgb(52, 199, 89);
  box-sizing: border-box;
  pointer-events: none;
}

.td-face-status {
  position: absolute;
  top: 10px;
  left: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #fff;
  backdrop-filter: blur(2px);

  i { font-size: 12px; }

  &.tracking {
    background: rgba(110, 75, 255, 0.92);
  }

  &.ended {
    background: rgba(0, 0, 0, 0.5);
  }
}

.td-thumbs {
  display: flex;
  gap: 6px;
}

.td-thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  transition: border-color 0.15s;

  &.active { border-color: $color-primary; }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.td-name {
  margin: 4px 0 0;
  font-size: 20px;
  font-weight: 600;
  color: $text-base;
  text-align: center;
}

.td-attrs {
  font-size: 13px;
  color: $text-tertiary;

  .td-attr-sep {
    margin: 0 6px;
    color: $border-color-input;
  }
}

.td-fields {
  width: 100%;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid $border-color-card;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.td-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: $text-muted;
  margin-top: 8px;

  &:first-child { margin-top: 0; }

  i { font-size: 13px; }
}

.td-field-value {
  font-size: 13px;
  color: $text-base;
  line-height: 1.5;
  word-break: break-all;
}

.td-end-btn {
  margin-top: 8px;
  width: 100%;
  height: 36px;
  border: 1px solid $border-color-light;
  border-radius: 8px;
  background: #fff;
  color: $text-secondary;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s;

  i { font-size: 14px; }

  &:hover {
    color: #ff4d4f;
    border-color: #ff4d4f;
  }
}

/* ===== 右侧事件列表 ===== */
.td-events {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 16px 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.td-events-head {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;

  h2 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: $text-base;
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.td-events-count {
  font-style: normal;
  font-size: 13px;
  color: $color-primary;
  background: $color-primary-bg;
  padding: 1px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.td-events-hint {
  font-size: 12px;
  color: $text-muted;
}

/* 时间线 */
.td-timeline {
  display: flex;
  flex-direction: column;
}

.td-ev {
  display: flex;
  gap: 12px;
}

.td-ev-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding-top: 16px;
}

.td-ev-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: $color-primary;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px $color-primary-bg;
  flex-shrink: 0;
  transition: all 0.15s;

  &.active {
    background: $color-primary;
    box-shadow: 0 0 0 3px $color-primary;
    transform: scale(1.15);
  }
}

.td-ev-line {
  width: 2px;
  flex: 1;
  background: $border-color-card;
  margin: 2px 0;
}

.td-ev-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;

  &:hover {
    border-color: $color-primary;
    box-shadow: 0 2px 8px rgba(110, 75, 255, 0.08);
  }

  &.selected {
    background: $color-primary-bg;
    border-color: $color-primary;
    box-shadow: 0 2px 12px rgba(110, 75, 255, 0.15);
  }
}

.td-ev-snap {
  width: 96px;
  height: 72px;
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f0f0f0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.td-ev-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.td-ev-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  color: $text-base;

  i { font-size: 14px; color: $text-muted; }

  .td-ev-arrow {
    color: $text-muted;
    margin: 0 2px;
  }
}

.td-ev-cam {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: $text-tertiary;
  overflow: hidden;

  i { font-size: 13px; flex-shrink: 0; }
  .td-ev-cam-name { color: $text-secondary; flex-shrink: 0; }
  .td-ev-area {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.td-ev-duration {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $color-online;
  background: $color-online-bg;
  padding: 2px 8px;
  border-radius: 4px;
  width: fit-content;

  i { font-size: 12px; }
}

/* 空态 */
.td-events-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: $text-muted;

  i { font-size: 40px; opacity: 0.4; }
  p { font-size: 13px; margin: 0; }
}

/* ===== 未找到 ===== */
.td-notfound {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: $bg-page;

  i { font-size: 48px; color: $text-muted; opacity: 0.5; }
  p { margin: 0; font-size: 14px; color: $text-tertiary; }

  button {
    padding: 6px 18px;
    border: none;
    border-radius: 6px;
    background: $color-primary;
    color: #fff;
    font-size: 13px;
    cursor: pointer;
    font-family: inherit;

    &:hover { background: $color-primary-hover; }
  }
}

/* ===== 事件卡片右侧箭头 ===== */
.td-ev-cheap {
  font-size: 14px;
  color: $text-muted;
  flex-shrink: 0;
  transition: color 0.15s, transform 0.15s;
}

.td-ev-card:hover .td-ev-cheap {
  color: $color-primary;
  transform: translateX(2px);
}

/* ===== 事件详情弹出面板 ===== */
.ev-panel {
  position: fixed;
  inset: 0;
  z-index: 1000;
}

.ev-panel-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.25);
}

.ev-panel-body {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 480px;
  max-width: 90vw;
  background: #fff;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
}

/* 面板头部 */
.ev-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.ev-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: $text-base;

  i {
    font-size: 18px;
    color: $color-primary;
  }
}

.ev-panel-close {
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: $text-muted;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  i { font-size: 16px; }

  &:hover {
    background: $bg-hover;
    color: $text-base;
  }
}

/* 滚动区 */
.ev-panel-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 大图 */
.ev-panel-snap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  background: #f0f0f0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.ev-panel-snap-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 10px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  backdrop-filter: blur(2px);
}

/* 分区 */
.ev-panel-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ev-panel-section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: $text-secondary;

  i {
    font-size: 14px;
    color: $text-muted;
  }
}

/* 时间段范围 */
.ev-panel-time-range {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 10px;
}

.ev-panel-time-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ev-panel-time-label {
  font-size: 11px;
  color: $text-muted;
}

.ev-panel-time-val {
  font-size: 15px;
  font-weight: 600;
  color: $text-base;
}

.ev-panel-time-sep {
  display: flex;
  align-items: center;
  color: $text-muted;

  i { font-size: 16px; }
}

.ev-panel-time-dur {
  margin-left: auto;
  padding: 3px 10px;
  border-radius: 4px;
  background: $color-online-bg;
  color: $color-online;
  font-size: 12px;
  font-weight: 500;
}

/* 属性行 */
.ev-panel-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;

  i {
    font-size: 14px;
    color: $text-muted;
  }

  .ev-panel-row-label {
    color: $text-tertiary;
    flex-shrink: 0;
  }

  .ev-panel-row-value {
    color: $text-base;
    font-weight: 500;
  }
}

/* 元信息网格 */
.ev-panel-meta-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.ev-panel-meta-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 8px;
}

.ev-panel-meta-label {
  font-size: 11px;
  color: $text-muted;
}

.ev-panel-meta-value {
  font-size: 13px;
  font-weight: 500;
  color: $text-base;
}

/* 底部操作 */
.ev-panel-foot {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid $border-color-card;
  flex-shrink: 0;
}

.ev-panel-btn {
  flex: 1;
  height: 38px;
  border: 1px solid $border-color-light;
  border-radius: 8px;
  background: #fff;
  color: $text-secondary;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.15s;

  i { font-size: 15px; }

  &:hover {
    color: $color-primary;
    border-color: $color-primary;
  }

  &.primary {
    background: $color-primary;
    border-color: $color-primary;
    color: #fff;

    &:hover {
      background: $color-primary-hover;
      border-color: $color-primary-hover;
      color: #fff;
    }
  }
}

/* 滑入动画 */
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: opacity 0.2s;

  .ev-panel-body {
    transition: transform 0.25s cubic-bezier(0.23, 1, 0.32, 1);
  }
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  opacity: 0;

  .ev-panel-body {
    transform: translateX(100%);
  }
}
</style>
