<script setup lang="ts">
/**
 * 视频播放弹窗（共享组件）
 * 左：直播画面 + 事件时间轴（2h 一窗，可翻页）
 * 右：告警事件 / 录像回放 tab
 *
 * 调用方通过 v-model:open 控制显隐，:target 传入摄像头最小信息。
 * 告警 / 录像 / 时间轴事件均为内置 mock。
 */
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'

// 弹窗显隐：v-model:open
const open = defineModel<boolean>('open', { default: false })

// 摄像头最小契约
interface PlayTarget {
  name: string
  thumb?: string
  status: 'online' | 'offline'
}
const props = defineProps<{ target: PlayTarget | null }>()

// ===== 弹窗宽度：屏幕宽度的 2/3（响应 resize） =====
const viewportWidth = ref(window.innerWidth)
function onResize() {
  viewportWidth.value = window.innerWidth
}
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
const playModalWidth = computed(() => Math.floor(viewportWidth.value * 2 / 3))

// ===== 右侧 tab：告警事件 / 录像回放 =====
const playTab = ref<'alarm' | 'replay'>('alarm')

// 告警事件 mock（按摄像头名匹配）
interface PlayAlarmRow {
  id: string
  level: '紧急' | '警告' | '提示'
  title: string
  time: string
  status: '待处理' | '已处理'
}
const allPlayAlarms = computed<PlayAlarmRow[]>(() => {
  const name = props.target?.name || ''
  if (name.includes('东门')) {
    return [
      { id: 'a1', level: '紧急', title: '人员闯入', time: '2026-07-07 09:12', status: '待处理' },
      { id: 'a2', level: '警告', title: '人员徘徊', time: '2026-07-07 08:40', status: '待处理' },
      { id: 'a3', level: '提示', title: '物品遗留', time: '2026-07-06 18:22', status: '已处理' },
      { id: 'a6', level: '紧急', title: '夜间未归', time: '2026-07-05 23:10', status: '已处理' },
      { id: 'a7', level: '警告', title: '人员聚集', time: '2026-07-05 14:30', status: '已处理' }
    ]
  }
  if (name.includes('南门')) {
    return [
      { id: 'a4', level: '警告', title: '车辆违停', time: '2026-07-07 10:05', status: '待处理' },
      { id: 'a5', level: '紧急', title: '烟火疑似', time: '2026-07-07 07:30', status: '已处理' },
      { id: 'a8', level: '提示', title: '物品遗留', time: '2026-07-06 11:20', status: '已处理' }
    ]
  }
  return []
})

// 告警搜索条件
const alarmSearchKey = ref('')
const alarmDateModel = ref<any>(null)
const alarmDate = computed<string | null>(() => {
  if (!alarmDateModel.value) return null
  return alarmDateModel.value.format('YYYY-MM-DD')
})
const playAlarms = computed<PlayAlarmRow[]>(() => {
  let list = allPlayAlarms.value
  const kw = alarmSearchKey.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(r => r.title.toLowerCase().includes(kw) || r.level.includes(kw) || r.status.includes(kw))
  }
  if (alarmDate.value) {
    list = list.filter(r => r.time.slice(0, 10) === alarmDate.value)
  }
  return list
})

// 录像回放 mock
interface ReplayClip {
  id: string
  time: string
  label: string
  thumb: string
  duration: string
}
const allReplayClips = computed<ReplayClip[]>(() => {
  const thumb = props.target?.thumb || ''
  return [
    { id: 'r1', time: '2026-07-07 09:10-09:15', label: '人员闯入告警时段', thumb, duration: '5 分钟' },
    { id: 'r2', time: '2026-07-07 08:38-08:45', label: '人员徘徊告警时段', thumb, duration: '7 分钟' },
    { id: 'r3', time: '2026-07-07 06:00-06:10', label: '晨间例行画面', thumb, duration: '10 分钟' },
    { id: 'r4', time: '2026-07-06 18:20-18:25', label: '物品遗留告警时段', thumb, duration: '5 分钟' },
    { id: 'r5', time: '2026-07-06 14:00-14:15', label: '午后例行画面', thumb, duration: '15 分钟' }
  ]
})
const replayDateModel = ref<any>(null)
const replayDate = computed<string | null>(() => {
  if (!replayDateModel.value) return null
  return replayDateModel.value.format('YYYY-MM-DD')
})
const replayClips = computed<ReplayClip[]>(() => {
  if (!replayDate.value) return allReplayClips.value
  return allReplayClips.value.filter(c => c.time.slice(0, 10) === replayDate.value)
})

// ===== 事件时间轴：2 小时一窗，半小时一刻度，左右可翻页 =====
const SECONDS_PER_DAY = 24 * 3600
const WINDOW_SECONDS = 2 * 3600

const playSecond = ref(8 * 3600)
const windowStartSecond = ref(8 * 3600)

interface EventCategory {
  key: string
  label: string
  color: string
  icon: string
}
const eventCategories: EventCategory[] = [
  { key: 'crowd', label: '识别到聚集', color: '#ff4d4f', icon: 'i-ant-design-team-outlined' },
  { key: 'person', label: '识别到人员', color: '#1890ff', icon: 'i-ant-design-user-outlined' },
  { key: 'profile', label: '档案中人员', color: '#722ed1', icon: 'i-ant-design-idcard-outlined' },
  { key: 'track', label: '临时跟踪人员', color: '#13c2c2', icon: 'i-ant-design-aim-outlined' },
  { key: 'vehicle', label: '识别到车辆', color: '#faad14', icon: 'i-ant-design-car-outlined' },
  { key: 'weapon', label: '识别到武器', color: '#fa541c', icon: 'i-ant-design-alert-outlined' }
]
const categoryVisible = reactive<Record<string, boolean>>(
  Object.fromEntries(eventCategories.map(c => [c.key, true]))
)
function toggleCategory(key: string) {
  categoryVisible[key] = !categoryVisible[key]
}
const colorOfCategory = (key: string) => eventCategories.find(c => c.key === key)?.color || '#999'

interface TimelineEvent {
  id: string
  category: string
  title: string
  time: string
  second: number
}
function buildTimelineEvents(): TimelineEvent[] {
  const today = '2026-07-07'
  const raw: Array<[string, string, string]> = [
    ['01:12', 'person', '识别到人员'],
    ['02:48', 'vehicle', '识别到车辆'],
    ['04:20', 'person', '识别到人员'],
    ['06:05', 'crowd', '识别到聚集'],
    ['07:30', 'weapon', '识别到武器'],
    ['08:15', 'profile', '档案中人员'],
    ['08:42', 'track', '临时跟踪人员'],
    ['09:12', 'crowd', '识别到聚集'],
    ['09:40', 'vehicle', '识别到车辆'],
    ['10:25', 'person', '识别到人员'],
    ['11:08', 'track', '临时跟踪人员'],
    ['12:33', 'crowd', '识别到聚集'],
    ['13:50', 'profile', '档案中人员'],
    ['14:22', 'weapon', '识别到武器'],
    ['15:40', 'vehicle', '识别到车辆'],
    ['16:18', 'person', '识别到人员'],
    ['17:55', 'crowd', '识别到聚集'],
    ['18:30', 'track', '临时跟踪人员'],
    ['19:45', 'profile', '档案中人员'],
    ['21:10', 'person', '识别到人员'],
    ['22:38', 'vehicle', '识别到车辆'],
    ['23:20', 'crowd', '识别到聚集']
  ]
  return raw.map(([hhmm, cat, title], i) => {
    const [h, m] = hhmm.split(':').map(Number)
    return {
      id: `ev-${i + 1}`,
      category: cat,
      title,
      time: `${today} ${hhmm}`,
      second: h * 3600 + m * 60
    }
  }).sort((a, b) => a.second - b.second)
}
const allTimelineEvents = buildTimelineEvents()

const windowEndSecond = computed(() => windowStartSecond.value + WINDOW_SECONDS)
function fmtHm(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0')
}
const windowRangeLabel = computed(() => `${fmtHm(windowStartSecond.value)} - ${fmtHm(windowEndSecond.value)}`)
const timelineEvents = computed(() => {
  const start = windowStartSecond.value
  const end = windowEndSecond.value
  return allTimelineEvents
    .filter(e => e.second >= start && e.second < end && categoryVisible[e.category])
    .map(e => ({
      ...e,
      percent: +((e.second - start) / WINDOW_SECONDS * 100).toFixed(2)
    }))
})
const timelineTicks = [0, 30, 60, 90, 120].map(min => {
  const off = min * 60
  return {
    label: fmtHm(off),
    percent: +(off / WINDOW_SECONDS * 100).toFixed(2)
  }
})
const playPercent = computed(() => {
  const start = windowStartSecond.value
  const p = (playSecond.value - start) / WINDOW_SECONDS * 100
  return Math.min(100, Math.max(0, +p.toFixed(2)))
})

function shiftWindow(deltaSeconds: number) {
  const next = windowStartSecond.value + deltaSeconds
  windowStartSecond.value = Math.min(SECONDS_PER_DAY - WINDOW_SECONDS, Math.max(0, next))
}
const prevWindow = () => shiftWindow(-WINDOW_SECONDS)
const nextWindow = () => shiftWindow(WINDOW_SECONDS)

function seekToEvent(ev: TimelineEvent) {
  playSecond.value = ev.second
}
function onTimelineClick(e: MouseEvent) {
  const el = e.currentTarget as HTMLElement
  const rect = el.getBoundingClientRect()
  const p = Math.min(100, Math.max(0, (e.clientX - rect.left) / rect.width * 100))
  playSecond.value = Math.round(windowStartSecond.value + p / 100 * WINDOW_SECONDS)
}
function fmtClock(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':')
}
</script>

<template>
  <a-modal
    v-model:open="open"
    :title="target?.name || '视频播放'"
    :footer="null"
    :width="playModalWidth"
    :body-style="{ padding: '0' }"
    wrap-class-name="video-player-modal"
  >
    <div class="player-layout">
      <!-- 左：直播视频 -->
      <div class="player-live">
        <img v-if="target?.thumb" :src="target.thumb" class="player-frame" alt="视频流" />
        <div class="player-overlay">
          <div class="player-controls">
            <i class="i-ant-design-pause-circle-filled player-play-icon" />
            <div class="player-progress">
              <div class="player-progress-bar" />
            </div>
            <span class="player-time">实时</span>
          </div>
        </div>
        <div class="player-info">
          <span class="player-name">{{ target?.name }}</span>
          <span class="player-status" :class="target?.status">
            {{ target?.status === 'online' ? '● LIVE' : '● 离线' }}
          </span>
        </div>

        <!-- 事件时间轴：2 小时一窗，左右可翻页 -->
        <div class="player-timeline">
          <div class="timeline-head">
            <button class="timeline-nav" @click="prevWindow">
              <i class="i-ant-design-left-outlined" />
            </button>
            <span class="timeline-range">{{ windowRangeLabel }}</span>
            <button class="timeline-nav" @click="nextWindow">
              <i class="i-ant-design-right-outlined" />
            </button>
          </div>
          <div class="timeline-track" @click="onTimelineClick">
            <!-- 刻度 -->
            <div
              v-for="t in timelineTicks"
              :key="t.label"
              class="timeline-tick"
              :style="{ left: t.percent + '%' }"
            >
              <span class="timeline-tick-label">{{ t.label }}</span>
            </div>
            <!-- 已播放进度 -->
            <div class="timeline-played" :style="{ width: playPercent + '%' }" />
            <!-- 当前播放游标 -->
            <div class="timeline-cursor" :style="{ left: playPercent + '%' }">
              <span class="timeline-cursor-time">{{ fmtClock(playSecond) }}</span>
            </div>
            <!-- 事件标记：按类别配色 -->
            <button
              v-for="ev in timelineEvents"
              :key="ev.id"
              class="timeline-event"
              :class="{ passed: ev.second <= playSecond }"
              :style="{ left: ev.percent + '%', background: colorOfCategory(ev.category), borderColor: colorOfCategory(ev.category) }"
              :title="`${ev.time} ${ev.title}`"
              @click.stop="seekToEvent(ev)"
            >
              <span class="timeline-event-tip">
                <strong>{{ ev.title }}</strong>
                <em>{{ ev.time.slice(11) }}</em>
              </span>
            </button>
          </div>

          <!-- 图例：横向排列，点击切换该类事件显隐 -->
          <div class="timeline-legend">
            <button
              v-for="c in eventCategories"
              :key="c.key"
              class="legend-item"
              :class="{ off: !categoryVisible[c.key] }"
              @click="toggleCategory(c.key)"
            >
              <span class="legend-dot" :style="{ background: c.color }">
                <i :class="c.icon" />
              </span>
              <span class="legend-label">{{ c.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 右：告警事件 / 录像回放 -->
      <div class="player-side">
        <div class="side-tabs">
          <button
            class="side-tab"
            :class="{ active: playTab === 'alarm' }"
            @click="playTab = 'alarm'"
          >
            <i class="i-ant-design-alert-outlined" />
            <span>告警事件</span>
            <em v-if="allPlayAlarms.length" class="side-tab-badge">{{ allPlayAlarms.filter(a => a.status === '待处理').length }}</em>
          </button>
          <button
            class="side-tab"
            :class="{ active: playTab === 'replay' }"
            @click="playTab = 'replay'"
          >
            <i class="i-ant-design-history-outlined" />
            <span>录像回放</span>
          </button>
        </div>

        <!-- 告警事件 -->
        <div v-if="playTab === 'alarm'" class="side-body">
          <div class="side-search">
            <a-input
              v-model:value="alarmSearchKey"
              class="side-search__input"
              placeholder="搜索告警标题"
              allow-clear
            >
              <template #prefix>
                <i class="i-ant-design-search-outlined" />
              </template>
            </a-input>
            <a-date-picker
              v-model:value="alarmDateModel"
              class="side-search__date"
              style="width: 100%"
              placeholder="选择日期"
            />
          </div>

          <div class="alarm-list">
            <div
              v-for="row in playAlarms"
              :key="row.id"
              class="alarm-row"
              :class="['lv-' + row.level, 'st-' + row.status]"
            >
              <div class="alarm-row__main">
                <span class="alarm-title">{{ row.title }}</span>
                <span class="alarm-time">
                  <i class="i-ant-design-clock-circle-outlined" />
                  {{ row.time }}
                </span>
              </div>
              <div class="alarm-row__tags">
                <span class="alarm-level">{{ row.level }}</span>
                <span class="alarm-status">{{ row.status }}</span>
              </div>
            </div>
            <div v-if="playAlarms.length === 0" class="side-empty">
              <i class="i-ant-design-check-circle-outlined side-empty-icon" />
              <p>该通道暂无告警事件</p>
            </div>
          </div>
        </div>

        <!-- 录像回放 -->
        <div v-else class="side-body">
          <div class="side-search">
            <a-date-picker
              v-model:value="replayDateModel"
              class="side-search__date"
              style="width: 100%"
              placeholder="选择日期"
            />
          </div>

          <div class="replay-list">
            <div
              v-for="clip in replayClips"
              :key="clip.id"
              class="replay-clip"
            >
              <div class="replay-clip__thumb">
                <img :src="clip.thumb" alt="截帧" draggable="false" />
                <div class="replay-clip__play">
                  <i class="i-ant-design-caret-right-filled" />
                </div>
                <span class="replay-clip__dur">{{ clip.duration }}</span>
              </div>
              <div class="replay-clip__info">
                <strong class="replay-clip__time">{{ clip.time }}</strong>
                <span class="replay-clip__label">{{ clip.label }}</span>
              </div>
            </div>
            <div v-if="replayClips.length === 0" class="side-empty">
              <i class="i-ant-design-video-camera-outlined side-empty-icon" />
              <p>所选时段暂无录像</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

/* ===== 视频播放弹窗：左直播 + 右告警/回放 ===== */
.player-layout {
  display: flex;
  height: 600px;
  background: #000;
}

/* 左：直播 */
.player-live {
  position: relative;
  flex: 2;
  min-width: 0;
  background: #000;
  overflow: hidden;

  .player-frame {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .player-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.35) 0%, transparent 30%, transparent 70%, rgba(0, 0, 0, 0.6) 100%);

    .player-controls {
      position: absolute;
      bottom: 140px; /* 上移，避开底部事件时间轴 + 图例 */
      left: 16px;
      right: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      pointer-events: auto;

      .player-play-icon {
        font-size: 28px;
        color: #fff;
        cursor: pointer;
      }

      .player-progress {
        flex: 1;
        height: 3px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        overflow: hidden;

        .player-progress-bar {
          height: 100%;
          width: 60%;
          background: $color-primary;
          border-radius: 2px;
        }
      }

      .player-time {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.85);
      }
    }
  }

  .player-info {
    position: absolute;
    top: 12px;
    left: 16px;
    display: flex;
    align-items: center;
    gap: 10px;

    .player-name {
      font-size: 14px;
      font-weight: 500;
      color: #fff;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    }

    .player-status {
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 3px;

      &.online {
        color: #95de64;
        background: rgba(43, 179, 163, 0.2);
      }

      &.offline {
        color: #d9d9d9;
        background: rgba(0, 0, 0, 0.3);
      }
    }
  }

  /* ===== 事件时间轴（叠在播放器底部）===== */
  .player-timeline {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2;
    padding: 8px 16px 10px;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.82), rgba(0, 0, 0, 0.45));
    backdrop-filter: blur(2px);
  }

  .timeline-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;

    /* 当前窗口范围 */
    .timeline-range {
      flex: 1;
      text-align: center;
      font-size: 12px;
      font-family: 'SF Mono', Menlo, Consolas, monospace;
      color: rgba(255, 255, 255, 0.78);
      letter-spacing: 0.5px;
    }

    /* 翻页箭头按钮 */
    .timeline-nav {
      width: 22px;
      height: 22px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      border: 1px solid rgba(255, 255, 255, 0.28);
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.85);
      cursor: pointer;
      font-family: inherit;
      transition: background 0.15s, border-color 0.15s;

      i {
        font-size: 12px;
      }

      &:hover {
        background: rgba(110, 75, 255, 0.5);
        border-color: $color-primary-hover;
        color: #fff;
      }
    }
  }

  /* 轨道：点击可跳转 */
  .timeline-track {
    position: relative;
    height: 26px;
    cursor: pointer;
    margin-top: 12px; /* 给刻度文字留空 */
  }

  /* 刻度线 + 文字 */
  .timeline-tick {
    position: absolute;
    top: 10px;
    bottom: 0;
    width: 1px;
    background: rgba(255, 255, 255, 0.22);

    .timeline-tick-label {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 2px;
      font-size: 10px;
      color: rgba(255, 255, 255, 0.55);
      white-space: nowrap;
    }
  }

  /* 已播放进度填充 */
  .timeline-played {
    position: absolute;
    top: 10px;
    bottom: 0;
    left: 0;
    background: linear-gradient(to right, rgba(110, 75, 255, 0.55), rgba(110, 75, 255, 0.25));
    pointer-events: none;
  }

  /* 当前游标 */
  .timeline-cursor {
    position: absolute;
    top: 6px;
    bottom: -4px;
    width: 2px;
    background: $color-primary-hover;
    pointer-events: none;
    z-index: 3;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: $color-primary-hover;
      box-shadow: 0 0 0 3px rgba(125, 92, 255, 0.3);
    }

    .timeline-cursor-time {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      margin-bottom: 4px;
      padding: 1px 5px;
      font-size: 10px;
      white-space: nowrap;
      color: #fff;
      background: $color-primary;
      border-radius: 3px;
    }
  }

  /* 事件标记：颜色由内联 style（按类别）控制 */
  .timeline-event {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 12px;
    height: 12px;
    padding: 0;
    border: 2px solid #fff;
    border-radius: 50%;
    cursor: pointer;
    z-index: 2;
    transition: transform 0.15s, box-shadow 0.15s;

    &.passed {
      opacity: 0.55;
    }

    &:hover {
      transform: translate(-50%, -50%) scale(1.4);
      box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.18);
    }

    /* 悬浮提示 */
    .timeline-event-tip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      padding: 5px 8px;
      background: rgba(0, 0, 0, 0.88);
      border-radius: 4px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s;

      strong {
        font-size: 11px;
        font-weight: 500;
        color: #fff;
      }

      em {
        font-style: normal;
        font-size: 10px;
        color: rgba(255, 255, 255, 0.6);
      }
    }

    &:hover .timeline-event-tip {
      opacity: 1;
    }
  }

  /* ===== 图例：横向排列，点击切换显隐 ===== */
  .timeline-legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 14px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 0.15s;

    .legend-dot {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      flex-shrink: 0;

      i {
        font-size: 9px;
        color: #fff;
      }
    }

    .legend-label {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.85);
      white-space: nowrap;
    }

    /* 隐藏态：整体变灰 + 删除线 */
    &.off {
      opacity: 0.4;

      .legend-dot {
        filter: grayscale(1);
      }

      .legend-label {
        text-decoration: line-through;
      }
    }

    &:hover {
      opacity: 0.85;
    }
  }
}

/* 右：告警 / 回放面板 */
.player-side {
  flex: 1;
  min-width: 0;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.side-tabs {
  display: flex;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  .side-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 44px;
    border: none;
    background: transparent;
    font-size: 14px;
    color: $text-secondary;
    cursor: pointer;
    font-family: inherit;
    position: relative;
    transition: color 0.2s;

    i {
      font-size: 15px;
    }

    &:hover {
      color: $color-primary;
    }

    &.active {
      color: $color-primary;
      font-weight: 500;

      &::after {
        content: '';
        position: absolute;
        left: 16px;
        right: 16px;
        bottom: 0;
        height: 2px;
        background: $color-primary;
        border-radius: 1px;
      }
    }

    .side-tab-badge {
      font-style: normal;
      font-size: 11px;
      min-width: 18px;
      height: 18px;
      line-height: 18px;
      text-align: center;
      padding: 0 5px;
      border-radius: 9px;
      background: #ff4d4f;
      color: #fff;
    }
  }
}

.side-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* 搜索栏（告警 + 录像共用） */
.side-search {
  display: flex;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  .side-search__input {
    flex: 1;
    min-width: 0;
  }

  .side-search__date {
    flex: 1;
    min-width: 0;
  }
}

.side-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 10px;
  color: $text-muted;

  .side-empty-icon {
    font-size: 40px;
    color: $color-online;
    opacity: 0.6;
  }

  p {
    font-size: 13px;
    margin: 0;
  }
}

/* —— 告警事件列表 —— */
.alarm-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alarm-row {
  border: 1px solid $border-color-card;
  border-radius: 8px;
  padding: 10px 12px;
  transition: box-shadow 0.15s;
  display: flex;
  align-items: center;
  gap: 12px;

  &:hover {
    box-shadow: $shadow-card-active;
  }

  /* 左侧：标题 + 时间 */
  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .alarm-title {
      font-size: 14px;
      font-weight: 500;
      color: $text-base;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .alarm-time {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: $text-muted;

      i {
        font-size: 12px;
      }
    }
  }

  /* 右侧：级别 + 状态 */
  &__tags {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  /* 级别标签 */
  .alarm-level {
    font-size: 11px;
    font-weight: 500;
    padding: 2px 7px;
    border-radius: 3px;
  }

  /* 状态标签（仅 待处理 / 已处理） */
  .alarm-status {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 3px;
  }
}

/* 级别标签配色 */
.alarm-row.lv-紧急 .alarm-level {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}
.alarm-row.lv-警告 .alarm-level {
  color: #d46b08;
  background: rgba(250, 173, 20, 0.12);
}
.alarm-row.lv-提示 .alarm-level {
  color: $color-online;
  background: $color-online-bg;
}

/* 状态标签配色（二态） */
.alarm-row.st-待处理 .alarm-status {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}
.alarm-row.st-已处理 .alarm-status {
  color: $color-online;
  background: $color-online-bg;
}

/* —— 录像回放 —— */
.replay-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.replay-clip {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid $border-color-card;
  cursor: pointer;
  transition: background 0.15s;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    .replay-clip__thumb {
      border-color: $color-primary;

      .replay-clip__play {
        background: rgba(110, 75, 255, 0.85);
      }
    }
  }

  &__thumb {
    position: relative;
    width: 120px;
    height: 68px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    border: 1px solid $border-color-card;
    background: #000;
    transition: border-color 0.15s;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .replay-clip__play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;

      i {
        font-size: 14px;
        color: #fff;
      }
    }

    .replay-clip__dur {
      position: absolute;
      bottom: 4px;
      right: 4px;
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 2px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
    }
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;

    .replay-clip__time {
      font-size: 13px;
      font-weight: 500;
      color: $text-base;
    }

    .replay-clip__label {
      font-size: 12px;
      color: $text-muted;
    }
  }
}
</style>
