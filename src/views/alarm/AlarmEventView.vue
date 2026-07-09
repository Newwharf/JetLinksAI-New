<script setup lang="ts">
/**
 * 告警事件
 * 三栏：左 告警事件列表（算法维度）｜中 该事件下告警明细｜右 单条明细详情
 */
import { message } from 'ant-design-vue'
import {
  alarmEvents,
  alarmRecords,
  areaText,
  type AlarmLevel,
  type AlarmStatus
} from './mock'

// ===== 左栏：告警事件 =====
const activeEventId = ref<string>(alarmEvents[0]?.id || '')
const activeEvent = computed(() =>
  alarmEvents.find(e => e.id === activeEventId.value) || alarmEvents[0]
)

// 事件搜索
const eventSearch = ref('')
const filteredEvents = computed(() => {
  const kw = eventSearch.value.trim().toLowerCase()
  if (!kw) return alarmEvents
  return alarmEvents.filter(e => e.name.toLowerCase().includes(kw))
})

function selectEvent(id: string) {
  activeEventId.value = id
}

// ===== 中栏：当前事件下的告警明细 =====
const eventRecords = computed(() =>
  alarmRecords.filter(r => r.eventId === activeEventId.value)
)

// 明细状态过滤
const statusFilter = ref<'all' | AlarmStatus>('all')
const filteredRecords = computed(() => {
  if (statusFilter.value === 'all') return eventRecords.value
  return eventRecords.value.filter(r => r.status === statusFilter.value)
})

// 当前选中明细
const activeRecordId = ref<string>(eventRecords.value[0]?.id || '')
const activeRecord = computed(() =>
  alarmRecords.find(r => r.id === activeRecordId.value) || eventRecords.value[0]
)

// 切换事件时，重置选中明细为该事件下第一条
watch(activeEventId, () => {
  const first = alarmRecords.find(r => r.eventId === activeEventId.value)
  activeRecordId.value = first?.id || ''
})

function selectRecord(id: string) {
  activeRecordId.value = id
}

// ===== 右栏：操作 =====
function handleRecord() {
  if (!activeRecord.value) return
  activeRecord.value.status = '处理中'
  message.success('已标记为处理中')
}
function resolveRecord() {
  if (!activeRecord.value) return
  activeRecord.value.status = '已处理'
  message.success('已处理')
}

// ===== 级别 / 状态 配色映射 =====
const levelClass: Record<AlarmLevel, string> = {
  紧急: 'lv-紧急',
  警告: 'lv-警告',
  提示: 'lv-提示'
}
const statusClass: Record<AlarmStatus, string> = {
  待处理: 'st-待处理',
  处理中: 'st-处理中',
  已处理: 'st-已处理'
}

// 待处理总数（顶部小计）
const pendingTotal = computed(() =>
  alarmEvents.reduce((s, e) => s + e.pending, 0)
)
</script>

<template>
  <div class="alarm-page">
    <!-- ===== 左：告警事件列表 ===== -->
    <aside class="col col-events">
      <div class="col-head">
        <div class="col-title">
          <strong>告警事件</strong>
          <span class="col-count">{{ alarmEvents.length }} 个事件 · {{ pendingTotal }} 待处理</span>
        </div>
      </div>
      <div class="col-search">
        <a-input
          v-model:value="eventSearch"
          placeholder="搜索告警事件"
          allow-clear
        >
          <template #prefix>
            <i class="i-ant-design-search-outlined" />
          </template>
        </a-input>
      </div>
      <div class="event-list">
        <div
          v-for="e in filteredEvents"
          :key="e.id"
          class="event-item"
          :class="{ 'is-active': e.id === activeEventId }"
          @click="selectEvent(e.id)"
        >
          <span class="event-item__icon" :class="levelClass[e.level]">
            <i :class="e.icon" />
          </span>
          <div class="event-item__body">
            <div class="event-item__name">{{ e.name }}</div>
            <div class="event-item__meta">
              <span class="event-item__count">{{ e.count }} 条</span>
              <span v-if="e.pending > 0" class="event-item__pending">{{ e.pending }} 待处理</span>
            </div>
          </div>
          <div class="event-item__right">
            <span class="event-item__level" :class="levelClass[e.level]">{{ e.level }}</span>
            <span class="event-item__time">{{ e.lastTime }}</span>
          </div>
        </div>
        <div v-if="filteredEvents.length === 0" class="col-empty">
          <i class="i-ant-design-alert-outlined col-empty__icon" />
          <p>没有找到匹配的事件</p>
        </div>
      </div>
    </aside>

    <!-- ===== 中：告警明细 ===== -->
    <section class="col col-records">
      <div class="col-head">
        <div class="col-title">
          <strong>{{ activeEvent?.name }} · 告警明细</strong>
          <span class="col-count">{{ eventRecords.length }} 条</span>
        </div>
      </div>
      <div class="record-filter">
        <a-segmented
          v-model:value="statusFilter"
          :options="[
            { label: '全部', value: 'all' },
            { label: '待处理', value: '待处理' },
            { label: '处理中', value: '处理中' },
            { label: '已处理', value: '已处理' }
          ]"
          block
        />
      </div>
      <div class="record-list">
        <article
          v-for="r in filteredRecords"
          :key="r.id"
          class="record-item"
          :class="{ 'is-active': r.id === activeRecordId }"
          @click="selectRecord(r.id)"
        >
          <div class="record-item__thumb">
            <img :src="r.thumb" :alt="r.title" draggable="false" />
            <span class="record-item__level" :class="levelClass[r.level]">{{ r.level }}</span>
          </div>
          <div class="record-item__body">
            <div class="record-item__title" :title="r.title">{{ r.title }}</div>
            <div class="record-item__row">
              <i class="i-ant-design-video-camera-outlined" />
              <span>{{ r.camera }}</span>
            </div>
            <div class="record-item__row">
              <i class="i-ant-design-environment-outlined" />
              <span class="record-item__area" :title="areaText(r.areaPath)">{{ areaText(r.areaPath) }}</span>
            </div>
            <div class="record-item__foot">
              <span class="record-item__status" :class="statusClass[r.status]">{{ r.status }}</span>
              <span class="record-item__time">
                <i class="i-ant-design-clock-circle-outlined" />
                {{ r.time }}
              </span>
            </div>
          </div>
        </article>
        <div v-if="filteredRecords.length === 0" class="col-empty">
          <i class="i-ant-design-check-circle-outlined col-empty__icon" />
          <p>没有匹配的告警明细</p>
        </div>
      </div>
    </section>

    <!-- ===== 右：明细详情 ===== -->
    <section class="col col-detail">
      <template v-if="activeRecord">
        <div class="col-head">
          <div class="col-title">
            <strong>告警详情</strong>
          </div>
        </div>
        <div class="detail-body">
          <!-- 截图 -->
          <div class="detail-thumb">
            <img :src="activeRecord.thumb" :alt="activeRecord.title" draggable="false" />
            <div class="detail-thumb__overlay" />
            <span class="detail-thumb__level" :class="levelClass[activeRecord.level]">
              {{ activeRecord.level }}
            </span>
            <div class="detail-thumb__play" title="查看实时视频">
              <i class="i-ant-design-play-circle-outlined" />
            </div>
          </div>

          <!-- 标题 + 状态 -->
          <div class="detail-header">
            <div class="detail-title">{{ activeRecord.title }}</div>
            <span class="detail-status" :class="statusClass[activeRecord.status]">
              {{ activeRecord.status }}
            </span>
          </div>

          <!-- 描述 -->
          <p class="detail-desc">{{ activeRecord.desc }}</p>

          <!-- 字段表 -->
          <ul class="detail-fields">
            <li class="detail-field">
              <span class="detail-field__label">触发时间</span>
              <span class="detail-field__value">{{ activeRecord.time }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field__label">识别算法</span>
              <span class="detail-field__value">{{ activeEvent?.name }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field__label">目标类型</span>
              <span class="detail-field__value">{{ activeRecord.target }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field__label">置信度</span>
              <span class="detail-field__value detail-field__value--accent">{{ activeRecord.confidence }}%</span>
            </li>
            <li class="detail-field">
              <span class="detail-field__label">触发摄像头</span>
              <span class="detail-field__value">{{ activeRecord.camera }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field__label">所属网关</span>
              <span class="detail-field__value">{{ activeRecord.gateway }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field__label">所属区域</span>
              <span class="detail-field__value">{{ areaText(activeRecord.areaPath) }}</span>
            </li>
          </ul>
        </div>

        <!-- 操作 -->
        <div class="detail-actions">
          <button
            v-if="activeRecord.status !== '已处理'"
            class="detail-btn detail-btn--primary"
            @click="handleRecord"
          >
            <i class="i-ant-design-tool-outlined" />
            <span>标记处理中</span>
          </button>
          <button
            v-if="activeRecord.status !== '已处理'"
            class="detail-btn"
            @click="resolveRecord"
          >
            <i class="i-ant-design-check-outlined" />
            <span>标记已处理</span>
          </button>
        </div>
      </template>

      <!-- 无选中 -->
      <div v-else class="col-empty detail-empty">
        <i class="i-ant-design-file-search-outlined col-empty__icon" />
        <p>请选择左侧告警明细查看详情</p>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.alarm-page {
  height: 100%;
  background: transparent;
  padding: 8px;
  display: grid;
  grid-template-columns: 300px 360px 1fr;
  gap: 8px;
  overflow: hidden;
  color: $text-base;
}

/* ===== 通用列样式 ===== */
.col {
  background: #fff;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.col-head {
  padding: 14px 16px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.col-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;

  strong {
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-count {
    font-size: 12px;
    color: $text-muted;
    flex-shrink: 0;
  }
}

.col-search {
  padding: 10px 12px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.record-filter {
  padding: 10px 12px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.col-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: $text-muted;
  padding: 40px 20px;

  &__icon {
    font-size: 40px;
    opacity: 0.3;
  }

  p {
    font-size: 13px;
    margin: 0;
  }
}

/* ===== 左：告警事件列表 ===== */
.event-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.18s;

  &:hover {
    background: #faf9ff;
  }

  &.is-active {
    background: $color-primary-bg;
    border-color: rgba(110, 75, 255, 0.25);
  }

  &__icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    background: #f0f4f8;

    i { font-size: 18px; color: $text-secondary; }

    &.lv-紧急 {
      background: rgba(255, 77, 79, 0.1);
      i { color: #ff4d4f; }
    }
    &.lv-警告 {
      background: rgba(250, 173, 20, 0.12);
      i { color: #d46b08; }
    }
    &.lv-提示 {
      background: $color-online-bg;
      i { color: $color-online; }
    }
  }

  &__body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: $text-muted;
  }

  &__pending {
    color: #ff4d4f;
  }

  &__right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
  }

  &__level {
    font-size: 11px;
    font-weight: 500;
    padding: 1px 6px;
    border-radius: 3px;

    &.lv-紧急 { color: #ff4d4f; background: rgba(255, 77, 79, 0.1); }
    &.lv-警告 { color: #d46b08; background: rgba(250, 173, 20, 0.12); }
    &.lv-提示 { color: $color-online; background: $color-online-bg; }
  }

  &__time {
    font-size: 11px;
    color: $text-muted;
  }
}

/* ===== 中：告警明细列表 ===== */
.record-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.record-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  cursor: pointer;
  transition: all 0.18s;

  &:hover {
    border-color: rgba(110, 75, 255, 0.4);
    box-shadow: $shadow-card-active;
  }

  &.is-active {
    border-color: $color-primary;
    background: $color-primary-bg;
  }

  &__thumb {
    position: relative;
    width: 96px;
    aspect-ratio: 16 / 10;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    background: #1a1a2e;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__level {
    position: absolute;
    top: 4px;
    left: 4px;
    font-size: 10px;
    font-weight: 500;
    padding: 1px 5px;
    border-radius: 3px;
    color: #fff;

    &.lv-紧急 { background: #ff4d4f; }
    &.lv-警告 { background: #faad14; }
    &.lv-提示 { background: $color-online; }
  }

  &__body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: $text-secondary;
    min-width: 0;

    i {
      font-size: 12px;
      color: $text-muted;
      flex-shrink: 0;
    }
  }

  &__area {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 2px;
  }

  &__status {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 3px;

    &.st-待处理 { color: #ff4d4f; background: rgba(255, 77, 79, 0.1); }
    &.st-处理中 { color: #d46b08; background: rgba(250, 173, 20, 0.12); }
    &.st-已处理 { color: $color-online; background: $color-online-bg; }
  }

  &__time {
    display: flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    color: $text-muted;

    i { font-size: 11px; }
  }
}

/* ===== 右：详情 ===== */
.col-detail {
  // 复用 .col
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  background: #1a1a2e;
  cursor: pointer;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s;
  }

  &:hover {
    img { transform: scale(1.03); }
    .detail-thumb__play { opacity: 1; }
  }

  &__overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 0%, transparent 30%);
    pointer-events: none;
  }

  &__level {
    position: absolute;
    top: 12px;
    left: 12px;
    font-size: 12px;
    font-weight: 500;
    padding: 3px 10px;
    border-radius: 4px;
    color: #fff;

    &.lv-紧急 { background: #ff4d4f; }
    &.lv-警告 { background: #faad14; }
    &.lv-提示 { background: $color-online; }
  }

  &__play {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;

    i {
      font-size: 30px;
      color: #fff;
    }
  }
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detail-title {
  font-size: 18px;
  font-weight: 650;
  color: $text-base;
}

.detail-status {
  font-size: 12px;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 4px;
  flex-shrink: 0;

  &.st-待处理 { color: #ff4d4f; background: rgba(255, 77, 79, 0.1); }
  &.st-处理中 { color: #d46b08; background: rgba(250, 173, 20, 0.12); }
  &.st-已处理 { color: $color-online; background: $color-online-bg; }
}

.detail-desc {
  margin: 0;
  padding: 12px 14px;
  background: #f7f8fa;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: $text-secondary;
}

.detail-fields {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.detail-field {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 11px 0;
  border-bottom: 1px solid $border-color-card;

  &:last-child { border-bottom: none; }

  &__label {
    width: 88px;
    flex-shrink: 0;
    font-size: 13px;
    color: $text-muted;
  }

  &__value {
    flex: 1;
    font-size: 13px;
    color: $text-base;
    word-break: break-all;

    &--accent {
      color: $color-primary;
      font-weight: 600;
    }
  }
}

/* 操作区 */
.detail-actions {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid $border-color-card;
  flex-shrink: 0;
}

.detail-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 16px;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  background: #fff;
  color: $text-base;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.18s;

  i { font-size: 14px; }

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
  }

  &--primary {
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

.detail-empty {
  flex: 1;
}
</style>
