<script setup lang="ts">
/**
 * 行为告警钻取弹窗（通用组件）
 * 左右分栏：左 1/3 明细列表 + 右 2/3 大图详情
 * 4个筛选：日期范围、事件类型、老人(树形下拉)、关键字
 */
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import {
  behaviorTypes,
  buildElderlyTree,
  type BehaviorEvent
} from './behavior.mock'

const props = defineProps<{
  open: boolean
  events: BehaviorEvent[]
  preset?: {
    timeRange?: string
    typeKey?: string
    personId?: string
    room?: string
  }
}>()

const emit = defineEmits<{
  'update:open': [v: boolean]
}>()

// ===== 筛选条件 =====
const dateRange = ref<any>(null)
const typeKey = ref<string>('all')
const personId = ref<string | undefined>(undefined)
const keyword = ref('')

const elderlyTree = buildElderlyTree()

// 弹窗打开时用 preset 初始化
watch(() => props.open, (v) => {
  if (!v) return
  const p = props.preset || {}
  // 日期范围：根据 preset.timeRange 设置
  const now = dayjs()
  if (p.timeRange === '今天') {
    dateRange.value = [now.startOf('day'), now.endOf('day')]
  } else if (p.timeRange === '近3天') {
    dateRange.value = [now.subtract(2, 'day').startOf('day'), now]
  } else if (p.timeRange === '近7天') {
    dateRange.value = [now.subtract(6, 'day').startOf('day'), now]
  } else {
    dateRange.value = [now.subtract(29, 'day').startOf('day'), now]
  }
  typeKey.value = p.typeKey || 'all'
  personId.value = p.personId
  keyword.value = ''
  selectedEventId.value = null
})

// 过滤后事件
const filteredEvents = computed(() => {
  let list = props.events
  if (dateRange.value) {
    const [start, end] = dateRange.value
    list = list.filter(e => {
      const t = dayjs(e.timestamp)
      return t.isAfter(start.startOf('day')) && t.isBefore(end.endOf('day'))
    })
  }
  if (typeKey.value !== 'all') list = list.filter(e => e.typeKey === typeKey.value)
  if (personId.value) list = list.filter(e => e.personId === personId.value)
  if (keyword.value.trim()) {
    const k = keyword.value.trim()
    list = list.filter(e => e.desc.includes(k) || e.typeName.includes(k) || e.personName.includes(k) || e.location.includes(k))
  }
  return list
})

// 选中的明细（右侧大图详情）
const selectedEventId = ref<string | null>(null)
const selectedEvent = computed(() =>
  filteredEvents.value.find(e => e.id === selectedEventId.value) || filteredEvents.value[0] || null
)

function selectEvent(ev: BehaviorEvent) {
  selectedEventId.value = ev.id
}

function onTreeSelect(value: any) {
  const v = String(value)
  if (v.startsWith('p')) personId.value = v
}

function close() {
  emit('update:open', false)
}

const typeColor = (key: string) => behaviorTypes.find(t => t.key === key)?.color || '#6e4bff'

// 视频播放弹窗
const videoVisible = ref(false)
</script>

<template>
  <a-modal
    :open="open"
    :width="1100"
    :footer="null"
    centered
    destroy-on-close
    title="告警明细"
    @cancel="close"
  >
    <div class="drill-modal">
      <!-- 筛选区 -->
      <div class="drill-filters">
        <div class="filter-item">
          <span class="filter-label">时间</span>
          <a-range-picker
            v-model:value="dateRange"
            size="small"
            class="filter-date"
            :allow-clear="true"
          />
        </div>
        <div class="filter-item">
          <span class="filter-label">类型</span>
          <a-select v-model:value="typeKey" size="small" class="filter-type">
            <a-select-option value="all">全部类型</a-select-option>
            <a-select-option v-for="t in behaviorTypes" :key="t.key" :value="t.key">{{ t.label }}</a-select-option>
          </a-select>
        </div>
        <div class="filter-item">
          <span class="filter-label">老人</span>
          <a-tree-select
            v-model:value="personId"
            :tree-data="elderlyTree"
            :field-names="{ label: 'label', value: 'value', children: 'children' }"
            tree-default-expand-all
            allow-clear
            placeholder="选择老人"
            size="small"
            class="filter-person"
            @select="onTreeSelect"
          />
        </div>
        <div class="filter-item">
          <span class="filter-label">关键字</span>
          <a-input v-model:value="keyword" placeholder="搜索" allow-clear size="small" class="filter-kw" />
        </div>
        <span class="filter-count">共 {{ filteredEvents.length }} 条</span>
      </div>

      <!-- 左右分栏 -->
      <div class="drill-body">
        <!-- 左：明细列表（1/3）-->
        <div class="drill-left scroll-thin">
          <div
            v-for="ev in filteredEvents"
            :key="ev.id"
            class="drill-card"
            :class="{ active: selectedEvent?.id === ev.id }"
            @click="selectEvent(ev)"
          >
            <div class="card-top">
              <div class="card-snap">
                <img :src="ev.snapshot" alt="事件截图" />
              </div>
              <div class="card-info">
                <span class="card-type" :style="{ background: typeColor(ev.typeKey) + '18', color: typeColor(ev.typeKey) }">
                  {{ ev.typeName }}
                </span>
                <p class="card-desc">{{ ev.desc }}</p>
              </div>
            </div>
            <div class="card-meta">
              <span class="meta-name">{{ ev.personName }}</span>
              <span class="meta-time"><i class="i-ant-design-clock-circle-outlined" />{{ ev.time }}</span>
              <span class="meta-room">{{ ev.room }}</span>
            </div>
          </div>
          <div v-if="filteredEvents.length === 0" class="drill-empty">
            <i class="i-ant-design-inbox-outlined" />
            <p>暂无符合条件的告警</p>
          </div>
        </div>

        <!-- 右：大图详情（2/3）-->
        <div class="drill-right">
          <template v-if="selectedEvent">
            <!-- 事件图片（占一半高度）+ 播放按钮 -->
            <div class="detail-media" @click="videoVisible = true">
              <img :src="selectedEvent.snapshot" class="detail-media-img" alt="事件截图" />
              <div class="detail-play-btn">
                <i class="i-ant-design-play-circle-outlined" />
              </div>
              <span class="detail-type-badge" :style="{ background: typeColor(selectedEvent.typeKey) }">
                {{ selectedEvent.typeName }}
              </span>
            </div>
            <!-- 事件详情 -->
            <div class="detail-info scroll-thin">
              <div class="detail-type-row">
                <span class="detail-type-tag" :style="{ background: typeColor(selectedEvent.typeKey) + '18', color: typeColor(selectedEvent.typeKey) }">{{ selectedEvent.typeName }}</span>
              </div>
              <div class="detail-row">
                <i class="i-ant-design-clock-circle-outlined d-icon" />
                <span class="d-value">{{ selectedEvent.time }}</span>
              </div>
              <div class="detail-row">
                <i class="i-ant-design-environment-outlined d-icon" />
                <span class="d-value">{{ selectedEvent.location }}</span>
              </div>
              <div class="detail-row">
                <i class="i-ant-design-video-camera-outlined d-icon" />
                <span class="d-value">{{ selectedEvent.camera }}</span>
              </div>
              <div class="detail-desc-box">
                <span class="d-desc-label">事件描述</span>
                <p class="d-desc-text">{{ selectedEvent.desc }}</p>
              </div>
            </div>
          </template>
          <div v-else class="detail-placeholder">
            <i class="i-ant-design-picture-outlined" />
            <p>点击左侧明细查看详情</p>
          </div>
        </div>
      </div>
    </div>
  </a-modal>

  <!-- 视频播放弹窗 -->
  <a-modal :open="videoVisible" :width="720" :footer="null" centered @cancel="videoVisible = false">
    <div class="video-player" v-if="selectedEvent">
      <img :src="selectedEvent.snapshot" class="video-poster" alt="视频" />
      <div class="video-overlay">
        <i class="i-ant-design-play-circle-outlined video-play-icon" />
        <p>视频播放中（原型演示）</p>
      </div>
    </div>
  </a-modal>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.drill-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 72vh;
  overflow: hidden;
}

/* ===== 筛选区 ===== */
.drill-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding: 10px 14px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  flex-shrink: 0;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-label {
  font-size: 12px;
  color: $text-muted;
  white-space: nowrap;
}

.filter-date {
  :deep(.ant-picker) {
    border-radius: 4px;
  }
}

.filter-type {
  width: 140px;
  :deep(.ant-select-selector) {
    border-radius: 4px !important;
    font-size: 12px;
    min-height: 28px;
  }
}

.filter-person {
  width: 160px;
  :deep(.ant-select-selector) {
    border-radius: 4px !important;
    font-size: 12px;
    min-height: 28px;
  }
}

.filter-kw {
  width: 130px;
  :deep(.ant-input) { font-size: 12px; }
}

.filter-count {
  font-size: 12px;
  color: $text-tertiary;
  margin-left: auto;
}

/* ===== 左右分栏 ===== */
.drill-body {
  display: flex;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 左：明细列表 */
.drill-left {
  width: 33%;
  flex-shrink: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

.drill-card {
  padding: 8px;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;

  &:hover {
    border-color: $color-primary;
    box-shadow: 0 2px 8px rgba(110, 75, 255, 0.08);
  }

  &.active {
    border-color: $color-primary;
    background: $color-primary-bg;
  }
}

.card-top {
  display: flex;
  gap: 8px;
}

.card-snap {
  width: 64px;
  height: 48px;
  border-radius: 5px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f0f0f0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.card-type {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  font-weight: 500;
  align-self: flex-start;
}

.card-desc {
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  padding-top: 5px;
  border-top: 1px solid $border-color-card;
  font-size: 11px;

  .meta-name {
    font-weight: 500;
    color: $text-base;
  }
  .meta-time {
    display: flex;
    align-items: center;
    gap: 2px;
    color: $text-tertiary;
    i { font-size: 10px; }
  }
  .meta-room {
    color: $text-muted;
  }
}

.drill-empty {
  text-align: center;
  padding: 40px;
  color: $text-muted;
  i { font-size: 36px; opacity: 0.4; }
  p { font-size: 13px; margin: 8px 0 0; }
}

/* 右：大图详情 */
.drill-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 事件图片区（占至少一半高度）*/
.detail-media {
  position: relative;
  flex: 1 1 50%;
  min-height: 240px;
  border-radius: 8px;
  overflow: hidden;
  background: #1a1a2e;
  cursor: pointer;
  flex-shrink: 0;
}

.detail-media-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.detail-play-btn {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s, background 0.2s;

  i {
    font-size: 32px;
    color: #fff;
  }

  &:hover {
    transform: translate(-50%, -50%) scale(1.1);
    background: rgba(110, 75, 255, 0.8);
  }
}

.detail-type-badge {
  position: absolute;
  top: 10px;
  left: 10px;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 4px;
  color: #fff;
  font-weight: 500;
}

/* 事件详情区 */
.detail-info {
  flex: 0 0 auto;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 4px 4px;
}

.detail-type-row {
  margin-bottom: 4px;
}

.detail-type-tag {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 4px;
  font-weight: 600;
}

.detail-row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.d-icon {
  font-size: 14px;
  color: $text-muted;
  flex-shrink: 0;
}

.d-value {
  font-size: 13px;
  color: $text-base;
}

.detail-desc-box {
  margin-top: 6px;
  padding: 10px 12px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 8px;
}

.d-desc-label {
  font-size: 11px;
  color: $text-muted;
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
}

.d-desc-text {
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.7;
  margin: 0;
}

/* 视频播放弹窗 */
.video-player {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: #1a1a2e;
}

.video-poster {
  width: 100%;
  max-height: 420px;
  object-fit: cover;
  display: block;
  filter: brightness(0.7);
}

.video-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;

  .video-play-icon {
    font-size: 48px;
    color: #fff;
    opacity: 0.9;
  }

  p {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
  }
}

.detail-placeholder {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: $text-muted;

  i { font-size: 48px; opacity: 0.3; }
  p { font-size: 13px; margin: 0; }
}
</style>
