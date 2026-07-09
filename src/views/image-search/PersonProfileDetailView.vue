<script setup lang="ts">
/**
 * 人员档案 - 详情页（左右两栏，各占 1/2）
 * 左栏：基本信息 + 周热力矩阵 + 最近识别图片
 * 右栏：识别事件列表（点击弹窗查看详情）
 * 联动：点击热力色块 → 右侧事件列表过滤到该 周X+小时Y
 */
import { useRoute, useRouter } from 'vue-router'
import {
  buildPersonEvents,
  WEEK_LABELS,
  HOUR_LABELS,
  type PersonProfile,
  type ProfileEvent
} from './person-profile.mock'
import { usePersonProfileStore } from '@/stores/person-profile'

const route = useRoute()
const router = useRouter()
const profileStore = usePersonProfileStore()

const profileId = computed(() => route.params.id as string)
const profile = computed<PersonProfile | undefined>(() =>
  profileStore.getById(profileId.value)
)

const allEvents = computed<ProfileEvent[]>(() =>
  profile.value ? buildPersonEvents(profile.value) : []
)

// 热力格选中：{ weekday, hour } | null
const heatFilter = ref<{ weekday: number; hour: number } | null>(null)

// 右侧展示的事件：受热力过滤
const visibleEvents = computed(() => {
  if (!heatFilter.value) return allEvents.value
  const { weekday, hour } = heatFilter.value
  return allEvents.value.filter(ev => ev.weekday === weekday && ev.hour === hour)
})

// 最近识别图片（取最新 6 张，去重）
const recentSnaps = computed(() => {
  return allEvents.value.slice(0, 6)
})

// 周热力最大值
const heatMax = computed(() => {
  if (!profile.value) return 1
  return Math.max(1, ...profile.value.weekHeat.flat())
})

function heatStyle(v: number) {
  if (!v) return {}
  const intensity = v / heatMax.value
  const alpha = 0.25 + intensity * 0.7
  return { background: `rgba(110, 75, 255, ${alpha.toFixed(2)})` }
}

// 点击热力格：有值则过滤，再次点击同一格取消
function onHeatClick(weekday: number, hour: number, v: number) {
  if (!v) return
  const cur = heatFilter.value
  if (cur && cur.weekday === weekday && cur.hour === hour) {
    heatFilter.value = null
  } else {
    heatFilter.value = { weekday, hour }
  }
}

function clearHeatFilter() {
  heatFilter.value = null
}

// 右栏 tab：events(事件列表) | track(人员轨迹)
const rightTab = ref<'events' | 'track'>('events')

// 事件详情弹窗
const detailEvent = ref<ProfileEvent | null>(null)
const detailVisible = ref(false)
function openEventDetail(ev: ProfileEvent) {
  detailEvent.value = ev
  detailVisible.value = true
}

function back() {
  router.push('/image-search/person-profile')
}
</script>

<template>
  <div class="pdetail" v-if="profile">
    <!-- 返回 -->
    <header class="pdetail__topbar">
      <button class="pdetail__back" @click="back">
        <i class="i-ant-design-arrow-left-outlined" />返回人员档案
      </button>
    </header>

    <!-- 左右两栏 -->
    <div class="pdetail__cols">
      <!-- ===== 左栏：基本信息 + 热力图 + 最近图片 ===== -->
      <section class="pdetail__left card">
        <!-- 基本信息头 -->
        <div class="info-head">
          <div class="info-face">
            <img :src="profile.faces[0]" alt="人脸" />
            <div
              v-for="(b, i) in profile.faceBoxes"
              :key="i"
              class="info-bbox"
              :style="{ left: b.x + '%', top: b.y + '%', width: b.w + '%', height: b.h + '%' }"
            />
          </div>
          <div class="info-main">
            <div class="info-name-row">
              <h2>{{ profile.name }}</h2>
              <span v-if="profile.keyFocus" class="info-focus">
                <i class="i-ant-design-star-filled" />重点关注
              </span>
            </div>
            <p class="info-remark">{{ profile.remark || '暂无备注' }}</p>
            <div class="info-meta">
              <span><i class="i-ant-design-clock-circle-outlined" />{{ profile.lastSeenAt }}</span>
              <span><i class="i-ant-design-video-camera-outlined" />{{ profile.lastSeenCamera }}</span>
              <span><i class="i-ant-design-history-outlined" />识别 {{ profile.eventCount }} 次</span>
            </div>
          </div>
        </div>

        <!-- 周热力矩阵 -->
        <div class="block">
          <div class="block-head">
            <h3>出现时段热力（本周）</h3>
            <button v-if="heatFilter" class="heat-clear" @click="clearHeatFilter">
              <i class="i-ant-design-close-outlined" />清除筛选
            </button>
          </div>
          <p class="block-sub">点击色块可按对应时段筛选右侧事件</p>
          <div class="heat-wrap">
            <div class="heat-grid">
              <div class="heat-corner"></div>
              <div class="heat-hours">
                <span v-for="h in HOUR_LABELS" :key="h" class="heat-hour">{{ h }}</span>
              </div>
              <template v-for="(day, di) in WEEK_LABELS" :key="day">
                <div class="heat-day">{{ day }}</div>
                <div class="heat-cells">
                  <div
                    v-for="(v, hi) in profile.weekHeat[di]"
                    :key="hi"
                    class="heat-cell"
                    :class="{
                      active: v > 0,
                      selected: heatFilter && heatFilter.weekday === di && heatFilter.hour === hi
                    }"
                    :style="heatStyle(v)"
                    :title="v > 0 ? `${day} ${hi}:00 - 事件 ${v} 次（点击筛选）` : `${day} ${hi}:00 - 无事件`"
                    @click="onHeatClick(di, hi, v)"
                  />
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- 最近识别图片 -->
        <div class="block">
          <h3 class="block-title">最近识别</h3>
          <div class="recent-snaps">
            <div
              v-for="ev in recentSnaps"
              :key="ev.id"
              class="recent-snap"
              @click="openEventDetail(ev)"
            >
              <img :src="ev.snapshot" alt="抓拍" />
            </div>
            <div v-if="recentSnaps.length === 0" class="recent-empty">暂无识别记录</div>
          </div>
        </div>
      </section>

      <!-- ===== 右栏：事件列表 / 人员轨迹（双 tab）===== -->
      <section class="pdetail__right card">
        <!-- tab 头 -->
        <div class="right-tabs">
          <button
            class="right-tab"
            :class="{ active: rightTab === 'events' }"
            @click="rightTab = 'events'"
          >事件列表</button>
          <button
            class="right-tab"
            :class="{ active: rightTab === 'track' }"
            @click="rightTab = 'track'"
          >人员轨迹</button>
          <span v-if="heatFilter" class="ev-filter-tag">
            {{ WEEK_LABELS[heatFilter.weekday] }} {{ heatFilter.hour }}:00
            <i class="i-ant-design-close-outlined" @click="clearHeatFilter" />
          </span>
        </div>

        <!-- tab1：事件列表 -->
        <div v-show="rightTab === 'events'" class="event-list scroll-thin">
          <div
            v-for="ev in visibleEvents"
            :key="ev.id"
            class="event-item"
            @click="openEventDetail(ev)"
          >
            <div class="event-snap">
              <img :src="ev.snapshot" alt="抓拍" />
            </div>
            <div class="event-info">
              <div class="event-time">
                <i class="i-ant-design-clock-circle-outlined" />{{ ev.time }}
              </div>
              <div class="event-cam" :title="ev.camera + ' · ' + ev.areaPath">
                <i class="i-ant-design-video-camera-outlined" />
                <span>{{ ev.camera }}</span>
                <span class="event-area">· {{ ev.areaPath }}</span>
              </div>
            </div>
            <div class="event-similarity">
              <span class="sim-pct">{{ ev.similarity }}%</span>
              <span class="sim-label">相似度</span>
            </div>
            <i class="event-arrow i-ant-design-right-outlined" />
          </div>
          <div v-if="visibleEvents.length === 0" class="event-empty">
            <i class="i-ant-design-inbox-outlined" />
            <p>{{ heatFilter ? '该时段暂无事件' : '暂无识别事件' }}</p>
          </div>
        </div>

        <!-- tab2：人员轨迹（时间轴）-->
        <div v-show="rightTab === 'track'" class="track-list scroll-thin">
          <div
            v-for="(ev, idx) in visibleEvents"
            :key="ev.id"
            class="track-item"
          >
            <div class="track-axis">
              <div class="track-dot" />
              <div v-if="idx < visibleEvents.length - 1" class="track-line" />
            </div>
            <div class="track-card" @click="openEventDetail(ev)">
              <div class="track-snap">
                <img :src="ev.snapshot" alt="视频截图" />
                <div class="track-play"><i class="i-ant-design-play-circle-outlined" /></div>
              </div>
              <div class="track-detail">
                <div class="track-time">{{ ev.time }}</div>
                <div class="track-cam" :title="ev.camera + ' · ' + ev.areaPath">
                  <i class="i-ant-design-video-camera-outlined" />
                  <span>{{ ev.camera }}</span>
                </div>
                <div class="track-area">{{ ev.areaPath }}</div>
              </div>
            </div>
          </div>
          <div v-if="visibleEvents.length === 0" class="event-empty">
            <i class="i-ant-design-environment-outlined" />
            <p>{{ heatFilter ? '该时段暂无轨迹' : '暂无轨迹记录' }}</p>
          </div>
        </div>
      </section>
    </div>

    <!-- 事件详情弹窗 -->
    <a-modal
      :open="detailVisible"
      :width="720"
      :footer="null"
      centered
      @cancel="detailVisible = false"
    >
      <div class="ev-detail" v-if="detailEvent">
        <div class="ev-detail-snap-wrap">
          <img :src="detailEvent.snapshot" class="ev-detail-snap" alt="抓拍" />
          <div
            class="ev-detail-bbox"
            :style="{
              left: detailEvent.snapshotBox.x + '%',
              top: detailEvent.snapshotBox.y + '%',
              width: detailEvent.snapshotBox.w + '%',
              height: detailEvent.snapshotBox.h + '%'
            }"
          />
        </div>
        <div class="ev-detail-info">
          <h3>识别详情</h3>
          <div class="ev-detail-row">
            <span class="label">识别时间</span>
            <span class="value">{{ detailEvent.time }}</span>
          </div>
          <div class="ev-detail-row">
            <span class="label">摄像头</span>
            <span class="value">{{ detailEvent.camera }}</span>
          </div>
          <div class="ev-detail-row">
            <span class="label">区域</span>
            <span class="value">{{ detailEvent.areaPath }}</span>
          </div>
          <div class="ev-detail-row">
            <span class="label">相似度</span>
            <span class="value sim">{{ detailEvent.similarity }}%</span>
          </div>
          <div class="ev-detail-row">
            <span class="label">匹配人员</span>
            <span class="value">{{ profile.name }}</span>
          </div>
        </div>
      </div>
    </a-modal>
  </div>

  <!-- 未找到 -->
  <div v-else class="pdetail__notfound">
    <i class="i-ant-design-user-delete-outlined" />
    <p>未找到该人员档案</p>
    <button @click="back">返回列表</button>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.pdetail {
  height: 100%;
  background: $bg-page;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

/* ===== 顶栏 ===== */
.pdetail__topbar {
  flex-shrink: 0;
}

.pdetail__back {
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

/* ===== 左右两栏 ===== */
.pdetail__cols {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  min-height: 0;
}

.pdetail__left,
.pdetail__right {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.card {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 16px 18px;
}

/* ===== 左栏：信息头 ===== */
.info-head {
  display: flex;
  gap: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.info-face {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f0f0f0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.info-bbox {
  position: absolute;
  border: 2px solid rgb(52, 199, 89);
  box-sizing: border-box;
  pointer-events: none;
}

.info-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.info-name-row {
  display: flex;
  align-items: center;
  gap: 8px;

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: $text-base;
  }
}

.info-focus {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(250, 140, 22, 0.12);
  color: #fa8c16;
  font-size: 11px;
  font-weight: 500;

  i { font-size: 11px; }
}

.info-remark {
  margin: 0;
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.info-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-top: 2px;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: $text-tertiary;

    i { font-size: 12px; }
  }
}

/* ===== 通用 block ===== */
.block {
  padding-top: 14px;
  flex-shrink: 0;
}

.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;

  h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
  }
}

.block-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
}

.block-sub {
  margin: 0 0 10px;
  font-size: 11px;
  color: $text-muted;
}

/* ===== 热力图 ===== */
.heat-clear {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  border: none;
  background: $color-primary-bg;
  color: $color-primary;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-family: inherit;

  i { font-size: 11px; }
}

.heat-wrap {
  overflow-x: auto;
}

.heat-grid {
  display: grid;
  grid-template-columns: 38px 1fr;
  gap: 3px;
  min-width: 440px;
}

.heat-corner { grid-column: 1; }

.heat-hours {
  grid-column: 2;
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  gap: 2px;
  margin-bottom: 2px;
}

.heat-hour {
  text-align: center;
  font-size: 9px;
  color: $text-muted;
  line-height: 1;
}

.heat-day {
  display: flex;
  align-items: center;
  font-size: 11px;
  color: $text-secondary;
  font-weight: 500;
}

.heat-cells {
  display: grid;
  grid-template-columns: repeat(24, 1fr);
  gap: 2px;
  margin-bottom: 2px;
}

.heat-cell {
  height: 18px;
  border-radius: 3px;
  background: #f5f5f7;
  cursor: default;
  transition: transform 0.1s, box-shadow 0.1s;

  &.active {
    cursor: pointer;

    &:hover {
      transform: scale(1.15);
      box-shadow: 0 0 0 1px rgba(110, 75, 255, 0.4);
    }
  }

  &.selected {
    transform: scale(1.15);
    box-shadow: 0 0 0 2px $color-primary;
    z-index: 1;
  }
}

/* ===== 最近识别 ===== */
.recent-snaps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.recent-snap {
  aspect-ratio: 4 / 3;
  border-radius: 6px;
  overflow: hidden;
  background: #f0f0f0;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.recent-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 24px;
  font-size: 12px;
  color: $text-muted;
}

/* ===== 右栏 tab ===== */
.right-tabs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-bottom: 10px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.right-tab {
  position: relative;
  padding: 4px 14px 8px;
  border: none;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: $text-secondary;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.2s;

  &:hover { color: $color-primary; }

  &.active {
    color: $color-primary;

    &::after {
      content: '';
      position: absolute;
      left: 14px;
      right: 14px;
      bottom: -1px;
      height: 2px;
      background: $color-primary;
      border-radius: 1px;
    }
  }
}

/* tab 中的筛选标签跟上移 */
.right-tabs .ev-filter-tag {
  margin-left: auto;
}

/* ===== 人员轨迹时间轴 ===== */
.track-list {
  flex: 1;
  overflow-y: auto;
  padding: 14px 4px 4px;
}

.track-item {
  display: flex;
  gap: 12px;
}

.track-axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 12px;
  flex-shrink: 0;

  .track-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: $color-primary;
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px rgba(110, 75, 255, 0.4);
    margin-top: 14px;
    flex-shrink: 0;
  }

  .track-line {
    flex: 1;
    width: 2px;
    background: $border-color-card;
    margin: 2px 0;
    min-height: 16px;
  }
}

.track-card {
  flex: 1;
  display: flex;
  gap: 12px;
  padding: 8px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;

  &:hover {
    border-color: $color-primary;
    background: #faf9ff;
    box-shadow: 0 2px 8px rgba(110, 75, 255, 0.08);
  }
}

.track-snap {
  position: relative;
  width: 96px;
  height: 64px;
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

.track-play {
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
  opacity: 0;
  transition: opacity 0.2s;

  i { font-size: 16px; color: #fff; }

  .track-card:hover & { opacity: 1; }
}

.track-detail {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  justify-content: center;
}

.track-time {
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
}

.track-cam {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $text-secondary;

  i { font-size: 12px; color: $text-muted; }
}

.track-area {
  font-size: 11px;
  color: $text-tertiary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 右栏：事件列表 ===== */
.ev-count {
  font-weight: 400;
  color: $text-tertiary;
}

.ev-filter-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 4px;
  background: $color-primary-bg;
  color: $color-primary;
  font-size: 12px;
  font-weight: 500;

  i {
    cursor: pointer;
    font-size: 11px;
    &:hover { opacity: 0.7; }
  }
}

.event-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-top: 10px;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;

  &:hover {
    border-color: $color-primary;
    background: #faf9ff;
    box-shadow: 0 2px 8px rgba(110, 75, 255, 0.08);
  }
}

.event-snap {
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

.event-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.event-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
  color: $text-base;

  i { font-size: 12px; color: $text-muted; }
}

.event-cam {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: $text-tertiary;
  overflow: hidden;

  i { font-size: 11px; flex-shrink: 0; }
  .event-area {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.event-similarity {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;

  .sim-pct {
    font-size: 14px;
    font-weight: 600;
    color: $color-primary;
    line-height: 1;
  }
  .sim-label {
    font-size: 10px;
    color: $text-muted;
    margin-top: 2px;
  }
}

.event-arrow {
  font-size: 14px;
  color: $text-muted;
  flex-shrink: 0;
}

.event-empty {
  text-align: center;
  padding: 60px 0;
  color: $text-muted;

  i { font-size: 36px; opacity: 0.4; }
  p { font-size: 13px; margin: 8px 0 0; }
}

/* ===== 事件详情弹窗 ===== */
.ev-detail {
  display: flex;
  gap: 20px;
  padding: 8px 4px 4px;
}

.ev-detail-snap-wrap {
  position: relative;
  width: 320px;
  flex-shrink: 0;
  border-radius: 8px;
  overflow: hidden;
  background: #1a1a2e;
}

.ev-detail-snap {
  width: 100%;
  display: block;
}

.ev-detail-bbox {
  position: absolute;
  border: 2px solid rgb(52, 199, 89);
  box-sizing: border-box;
  pointer-events: none;
}

.ev-detail-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;

  h3 {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 600;
    color: $text-base;
  }
}

.ev-detail-row {
  display: flex;
  flex-direction: column;
  gap: 2px;

  .label {
    font-size: 12px;
    color: $text-muted;
  }
  .value {
    font-size: 14px;
    color: $text-base;
    font-weight: 500;

    &.sim { color: $color-primary; }
  }
}

/* ===== 未找到 ===== */
.pdetail__notfound {
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
</style>
