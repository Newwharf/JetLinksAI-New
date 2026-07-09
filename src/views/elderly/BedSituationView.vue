<script setup lang="ts">
/**
 * 老人床位态势（重设计版）
 * - 整体卡片视图，按房间分组，房间卡可展开/收起
 * - 每张床位卡：序号 + 老人头像/姓名/年龄 + 自理半护全护 + 心率/血压 + 在床离床组合图标 + 健康异常标识
 * - 四周留白（padding），页面有浅灰背景
 */
import { type Bed, type BedStatus, type ElderlyPerson } from './bed.mock'
import { useBedSituationStore } from '@/stores/bed-situation'
import BedStatusIcon from './BedStatusIcon.vue'

const store = useBedSituationStore()
const beds = computed(() => store.beds)

// 按房间分组
const grouped = computed(() => {
  const map = new Map<string, { room: string; building: string; beds: Bed[] }>()
  for (const b of beds.value) {
    const key = b.building + b.room
    if (!map.has(key)) map.set(key, { room: b.room, building: b.building, beds: [] })
    map.get(key)!.beds.push(b)
  }
  return Array.from(map.values()).sort((a, b) =>
    a.building.localeCompare(b.building, 'zh') || a.room.localeCompare(b.room, 'zh')
  )
})

// 统计
const stats = computed(() => {
  const total = beds.value.length
  const inBed = beds.value.filter(b => b.status === 'in-bed').length
  const leave = beds.value.filter(b => b.status === 'leave').length
  const empty = beds.value.filter(b => b.status === 'empty').length
  const danger = beds.value.filter(b => b.elderly && b.elderly.healthLevel !== 'normal').length
  return { total, inBed, leave, empty, danger }
})

// 状态筛选
const statusFilter = ref<'all' | BedStatus>('all')

// 护理等级颜色
const careMeta: Record<string, { bg: string; color: string }> = {
  '自理': { bg: '#e6fffb', color: '#13c2c2' },
  '半护': { bg: '#fff7e6', color: '#fa8c16' },
  '全护': { bg: '#fff1f0', color: '#ff4d4f' }
}

// 健康等级映射
const healthMeta: Record<string, { label: string; color: string }> = {
  normal: { label: '正常', color: '#52c41a' },
  warn: { label: '关注', color: '#fa8c16' },
  danger: { label: '异常', color: '#ff4d4f' }
}

// 房间展开状态（默认全展开）
const expandedRooms = ref<Set<string>>(new Set(grouped.value.map(g => g.building + g.room)))

function toggleRoom(key: string) {
  const s = expandedRooms.value
  if (s.has(key)) s.delete(key)
  else s.add(key)
}

function filteredBeds(roomBeds: Bed[]) {
  if (statusFilter.value === 'all') return roomBeds
  return roomBeds.filter(b => b.status === statusFilter.value)
}

// 健康图标用的 health 值（床俯视图颜色：在床绿/离床橙/空床灰）
function iconHealth(b: Bed): 'in-bed' | 'leave' | 'empty' {
  return b.status
}

// 详情弹窗
const detailBed = ref<Bed | null>(null)
const detailVisible = ref(false)
function openDetail(b: Bed) {
  if (!b.elderly) return
  detailBed.value = b
  detailVisible.value = true
}

// ===== 空床位绑定老人 =====
const bindVisible = ref(false)
const bindBed = ref<Bed | null>(null)
const bindSearch = ref('')
const bindSelected = ref<string | null>(null)

/** 合并已绑老人 + 未绑老人，标记是否可选 */
const bindCandidates = computed(() => {
  const bound: ElderlyPerson[] = beds.value
    .filter(b => b.elderly)
    .map(b => b.elderly!)
  const all = [...store.unbound, ...bound]
  // 搜索过滤
  const k = bindSearch.value.trim().toLowerCase()
  const filtered = k
    ? all.filter(e =>
        e.name.toLowerCase().includes(k) ||
        String(e.age).includes(k) ||
        e.gender.includes(k) ||
        e.careLevel.includes(k)
      )
    : all
  // 标记是否已绑定（不可选）
  return filtered.map(e => ({
    ...e,
    bound: store.isBound(e.id)
  }))
})

function openBind(b: Bed) {
  if (b.elderly) return
  bindBed.value = b
  bindSearch.value = ''
  bindSelected.value = null
  bindVisible.value = true
}

function selectCandidate(id: string, bound: boolean) {
  if (bound) return
  bindSelected.value = id
}

function confirmBind() {
  if (!bindBed.value || !bindSelected.value) return
  store.bindElderly(bindBed.value.id, bindSelected.value)
  bindVisible.value = false
}
</script>

<template>
  <div class="bed-situation">
    <!-- 顶部统计 + 图例 + 筛选 -->
    <header class="bs-top">
      <div class="bs-stats">
        <div class="bs-stat">
          <span class="num">{{ stats.total }}</span>
          <span class="label">总床位</span>
        </div>
        <div class="bs-stat">
          <span class="num in-bed">{{ stats.inBed }}</span>
          <span class="label">在床</span>
        </div>
        <div class="bs-stat">
          <span class="num leave">{{ stats.leave }}</span>
          <span class="label">离床</span>
        </div>
        <div class="bs-stat">
          <span class="num empty">{{ stats.empty }}</span>
          <span class="label">空床</span>
        </div>
        <div class="bs-stat">
          <span class="num danger">{{ stats.danger }}</span>
          <span class="label">体征异常</span>
        </div>
      </div>

      <div class="bs-filter">
        <button class="filter-btn" :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">全部</button>
        <button class="filter-btn" :class="{ active: statusFilter === 'in-bed' }" @click="statusFilter = 'in-bed'">在床</button>
        <button class="filter-btn" :class="{ active: statusFilter === 'leave' }" @click="statusFilter = 'leave'">离床</button>
        <button class="filter-btn" :class="{ active: statusFilter === 'empty' }" @click="statusFilter = 'empty'">空床</button>
      </div>
    </header>

    <!-- 房间卡片列表 -->
    <div class="bs-content scroll-thin">
      <section
        v-for="g in grouped"
        :key="g.building + g.room"
        class="room-card"
      >
        <!-- 房间头（可点击展开收起） -->
        <header class="room-head" @click="toggleRoom(g.building + g.room)">
          <div class="room-head-left">
            <i
              class="i-ant-design-right-outlined room-arrow"
              :class="{ expanded: expandedRooms.has(g.building + g.room) }"
            />
            <i class="i-ant-design-home-outlined room-home" />
            <span class="room-title">{{ g.building }} · {{ g.room }}</span>
          </div>
          <div class="room-head-right">
            <span class="room-count">
              <em class="in-bed">{{ g.beds.filter(b => b.status === 'in-bed').length }}</em>
              <span class="sep">/</span>
              <em class="total">{{ g.beds.length }}</em>
              床
            </span>
          </div>
        </header>

        <!-- 床位网格（展开时显示） -->
        <transition name="room-expand">
          <div v-if="expandedRooms.has(g.building + g.room)" class="room-body">
            <div v-if="filteredBeds(g.beds).length" class="bed-grid">
              <div
                v-for="b in filteredBeds(g.beds)"
                :key="b.id"
                class="bed-card"
                :class="[b.status, b.elderly ? b.elderly.healthLevel : '']"
                @click="b.elderly ? openDetail(b) : openBind(b)"
              >
                <!-- 标题栏：床位号 + 护理类型标签 + 在床/离床图标 -->
                <div class="bed-title-bar">
                  <span class="bed-no">{{ b.bedNo }}</span>
                  <div class="bed-title-right">
                    <span
                      v-if="b.elderly"
                      class="care-tag"
                      :style="{ background: careMeta[b.elderly.careLevel].bg, color: careMeta[b.elderly.careLevel].color }"
                    >
                      {{ b.elderly.careLevel }}
                    </span>
                    <span class="bed-status-mini" :class="b.status">
                      <BedStatusIcon
                        :in-bed="b.status === 'in-bed'"
                        :health="iconHealth(b)"
                        :size="22"
                      />
                      <em>{{ b.status === 'in-bed' ? '在床' : b.status === 'leave' ? '离床' : '空床' }}</em>
                    </span>
                  </div>
                </div>

                <!-- 空床位 -->
                <div v-if="!b.elderly" class="bed-empty">
                  <span class="empty-text">空床位</span>
                  <span class="empty-hint">点此绑定老人</span>
                </div>

                <!-- 中部：照片 + 名称年龄性别 -->
                <div v-else class="bed-mid">
                  <div class="bed-photo" :class="b.elderly.gender">
                    <img v-if="b.elderly.photo" :src="b.elderly.photo" :alt="b.elderly.name" />
                    <span v-else>{{ b.elderly.name.charAt(0) }}</span>
                  </div>
                  <div class="bed-mid-info">
                    <span class="bed-name">{{ b.elderly.name }}</span>
                    <div class="bed-mid-sub">
                      <span class="bed-age">{{ b.elderly.age }}岁</span>
                      <span class="bed-gender" :class="b.elderly.gender">{{ b.elderly.gender }}</span>
                    </div>
                  </div>
                </div>

                <!-- 底部：心率 + 血压 -->
                <div v-if="b.elderly" class="bed-vitals-bar">
                  <span
                    v-if="b.elderly.healthLevel === 'danger' && b.status !== 'leave'"
                    class="health-tag"
                    :style="{ color: healthMeta.danger.color }"
                  >
                    <i class="i-ant-design-warning-outlined" />
                    {{ healthMeta.danger.label }}
                  </span>
                  <!-- 离床时监测不到，显示占位 -->
                  <span v-if="b.status === 'leave'" class="vital vital-placeholder">
                    <i class="i-ant-design-heart-outlined" />
                    <em>--</em>
                  </span>
                  <span v-if="b.status === 'leave'" class="vital vital-placeholder">
                    <i class="i-ant-design-dashboard-outlined" />
                    <em>--</em>
                  </span>
                  <!-- 在床时正常显示，异常闪烁 -->
                  <span
                    v-if="b.status !== 'leave'"
                    class="vital"
                    :class="{ abnormal: b.elderly.healthLevel === 'danger' }"
                  >
                    <i class="i-ant-design-heart-outlined" />
                    <em>{{ b.elderly.heartRate }}</em>
                  </span>
                  <span
                    v-if="b.status !== 'leave'"
                    class="vital"
                    :class="{ abnormal: b.elderly.healthLevel === 'danger' }"
                  >
                    <i class="i-ant-design-dashboard-outlined" />
                    <em>{{ b.elderly.bloodPressureSys }}/{{ b.elderly.bloodPressureDia }}</em>
                  </span>
                </div>
              </div>
            </div>

            <div v-else class="room-empty-filter">该筛选下无床位</div>
          </div>
        </transition>
      </section>
    </div>

    <!-- 详情弹窗 -->
    <a-modal :open="detailVisible" :width="640" :footer="null" centered @cancel="detailVisible = false">
      <div class="bed-detail" v-if="detailBed && detailBed.elderly">
        <div class="bd-head">
          <div class="bd-avatar" :class="detailBed.elderly.gender">
            <img v-if="detailBed.elderly.photo" :src="detailBed.elderly.photo" :alt="detailBed.elderly.name" />
            <span v-else>{{ detailBed.elderly.name.charAt(0) }}</span>
          </div>
          <div class="bd-title">
            <h3>{{ detailBed.elderly.name }}</h3>
            <div class="bd-sub">
              <span>{{ detailBed.elderly.gender }}</span>
              <span>{{ detailBed.elderly.age }}岁</span>
              <span class="care-tag" :style="{ background: careMeta[detailBed.elderly.careLevel].bg, color: careMeta[detailBed.elderly.careLevel].color }">{{ detailBed.elderly.careLevel }}</span>
            </div>
          </div>
          <span class="bd-status" :style="{ color: detailBed.status === 'in-bed' ? '#52c41a' : '#fa8c16' }">
            <BedStatusIcon
              :in-bed="detailBed.status === 'in-bed'"
              :health="detailBed.status"
              :size="20"
            />
            {{ detailBed.status === 'in-bed' ? '在床' : '离床' }}
          </span>
        </div>
        <div class="bd-meta">
          <div class="bd-meta-row"><i class="i-ant-design-environment-outlined" />{{ detailBed.elderly.building }} · {{ detailBed.elderly.room }} · {{ detailBed.elderly.bedNo }}</div>
          <div class="bd-meta-row"><i class="i-ant-design-clock-circle-outlined" />数据更新于 {{ detailBed.elderly.lastUpdate }}</div>
        </div>
        <div class="bd-vitals">
          <div class="bd-vital" :class="{ abnormal: detailBed.elderly.heartRate < 60 || detailBed.elderly.heartRate > 100 }">
            <span class="v-label">心率</span>
            <span class="v-val">{{ detailBed.elderly.heartRate }}</span>
            <span class="v-unit">bpm</span>
          </div>
          <div class="bd-vital" :class="{ abnormal: detailBed.elderly.bloodPressureSys > 140 || detailBed.elderly.bloodPressureDia > 90 }">
            <span class="v-label">血压</span>
            <span class="v-val">{{ detailBed.elderly.bloodPressureSys }}/{{ detailBed.elderly.bloodPressureDia }}</span>
            <span class="v-unit">mmHg</span>
          </div>
          <div class="bd-vital" :class="{ abnormal: detailBed.elderly.spo2 < 95 }">
            <span class="v-label">血氧</span>
            <span class="v-val">{{ detailBed.elderly.spo2 }}</span>
            <span class="v-unit">%</span>
          </div>
          <div class="bd-vital">
            <span class="v-label">体温</span>
            <span class="v-val">{{ detailBed.elderly.bodyTemp }}</span>
            <span class="v-unit">℃</span>
          </div>
        </div>
        <div v-if="detailBed.elderly.conditions && detailBed.elderly.conditions.length" class="bd-conditions">
          <span class="c-label">健康状况</span>
          <span v-for="c in detailBed.elderly.conditions" :key="c" class="c-tag">{{ c }}</span>
        </div>
      </div>
    </a-modal>

    <!-- 空床位绑定老人弹窗 -->
    <a-modal
      :open="bindVisible"
      :width="920"
      :footer="null"
      centered
      :title="undefined"
      @cancel="bindVisible = false"
    >
      <div class="bind-dialog">
        <div class="bind-head">
          <div class="bind-title">
            <i class="i-ant-design-link-outlined" />
            <span>绑定老人到 {{ bindBed?.building }} · {{ bindBed?.room }} · {{ bindBed?.bedNo }}</span>
          </div>
          <div class="bind-search">
            <i class="i-ant-design-search-outlined" />
            <input
              v-model="bindSearch"
              placeholder="搜索姓名 / 年龄 / 性别 / 护理类型"
            />
          </div>
        </div>

        <div class="bind-list scroll-thin">
          <div
            v-for="e in bindCandidates"
            :key="e.id"
            class="bind-item"
            :class="{ disabled: e.bound, selected: bindSelected === e.id }"
            @click="selectCandidate(e.id, e.bound)"
          >
            <div class="bind-photo" :class="e.gender">
              <img v-if="e.photo" :src="e.photo" :alt="e.name" />
              <span v-else>{{ e.name.charAt(0) }}</span>
            </div>
            <div class="bind-info">
              <div class="bind-name-row">
                <span class="bind-name">{{ e.name }}</span>
                <span class="bind-tag care" :style="{ background: careMeta[e.careLevel].bg, color: careMeta[e.careLevel].color }">{{ e.careLevel }}</span>
              </div>
              <div class="bind-sub">
                <span>{{ e.age }}岁</span>
                <span class="sep">·</span>
                <span :class="e.gender">{{ e.gender }}</span>
              </div>
              <div v-if="e.bound" class="bound-room">
                <i class="i-ant-design-home-outlined" />
                <span>{{ e.building }} · {{ e.room }} · {{ e.bedNo }}</span>
              </div>
            </div>
            <i v-if="bindSelected === e.id" class="i-ant-design-check-circle-filled bind-check" />
          </div>

          <div v-if="bindCandidates.length === 0" class="bind-empty">
            <i class="i-ant-design-search-outlined" />
            <p>没有找到匹配的老人</p>
          </div>
        </div>

        <div class="bind-footer">
          <button class="bind-cancel" @click="bindVisible = false">取消</button>
          <button class="bind-ok" :disabled="!bindSelected" @click="confirmBind">
            确认绑定
          </button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

/* ===== 页面容器：四周留白 ===== */
.bed-situation {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;            /* 作为父级 flex 子项时允许收缩 */
  gap: 16px;
  padding: 16px 20px;
  background: $bg-page;
  overflow: hidden;
}

/* ===== 顶部统计 + 筛选 ===== */
.bs-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 14px 20px;
}

.bs-stats {
  display: flex;
  gap: 28px;
}

.bs-stat {
  display: flex;
  flex-direction: column;

  .num {
    font-size: 26px;
    font-weight: 700;
    color: $text-base;
    line-height: 1.1;
    &.in-bed { color: #52c41a; }
    &.leave { color: #fa8c16; }
    &.empty { color: #bfbfbf; }
    &.danger { color: #ff4d4f; }
  }
  .label {
    font-size: 12px;
    color: $text-tertiary;
    margin-top: 2px;
  }
}

.bs-filter {
  display: flex;
  gap: 6px;

  .filter-btn {
    padding: 5px 14px;
    border: 1px solid $border-color-card;
    border-radius: 6px;
    background: #fff;
    color: $text-secondary;
    font-size: 12px;
    cursor: pointer;
    font-family: inherit;
    transition: all 0.15s;

    &:hover { color: $color-primary; }
    &.active {
      background: $color-primary-bg;
      color: $color-primary;
      border-color: $color-primary;
    }
  }
}

/* ===== 房间卡片列表 ===== */
.bs-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

/* 房间卡片之间间距（用普通块级 + margin，避免 flex column 嵌套导致的滚动失效） */
.bs-content > .room-card + .room-card {
  margin-top: 12px;
}

.room-card {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: $shadow-card-active;
  }
}

.room-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;

  &:hover {
    background: #fafbfc;
  }
}

.room-head-left {
  display: flex;
  align-items: center;
  gap: 8px;

  .room-arrow {
    font-size: 12px;
    color: $text-muted;
    transition: transform 0.2s;
    transform: rotate(0deg);

    &.expanded {
      transform: rotate(90deg);
    }
  }

  .room-home {
    font-size: 16px;
    color: $color-primary;
  }

  .room-title {
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
  }
}

.room-head-right {
  .room-count {
    font-size: 13px;
    color: $text-tertiary;

    em {
      font-style: normal;
      font-weight: 600;
      &.in-bed { color: #52c41a; }
      &.total { color: $text-secondary; }
    }

    .sep {
      margin: 0 3px;
      color: $border-color-input;
    }
  }
}

.room-body {
  padding: 0 20px 16px;
  border-top: 1px solid $border-color-card;
}

.room-empty-filter {
  text-align: center;
  padding: 24px 0;
  font-size: 13px;
  color: $text-muted;
}

/* 展开动画 */
.room-expand-enter-active,
.room-expand-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.room-expand-enter-from,
.room-expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0;
  padding-bottom: 0;
}

/* ===== 床位网格 ===== */
.bed-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  padding-top: 14px;
}

/* ===== 床位卡片：三段式 ===== */
.bed-card {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;

  &:hover {
    border-color: $color-primary;
    box-shadow: 0 2px 12px rgba(110, 75, 255, 0.1);
  }

  &.danger {
    border-color: rgba(255, 77, 79, 0.4);

    .bed-vitals-bar { background: #fff5f5; }
  }

  /* 离床：整张卡片灰色蒙版 */
  &.leave {
    position: relative;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(180, 184, 192, 0.32);
      pointer-events: none;
      z-index: 2;
    }
  }

  &.empty {
    opacity: 0.75;
  }
}

/* 顶部标题栏 */
.bed-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid $border-color-card;
  background: #fafbfc;
}

.bed-no {
  font-size: 14px;
  font-weight: 700;
  color: $text-base;
  letter-spacing: 0.3px;
}

.bed-title-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.care-tag {
  font-size: 10px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

/* 在床/离床迷你状态 */
.bed-status-mini {
  display: flex;
  align-items: center;
  gap: 3px;

  em {
    font-style: normal;
    font-size: 11px;
    font-weight: 600;
  }

  &.in-bed em { color: #52c41a; }
  &.leave em { color: #fa8c16; }
  &.empty em { color: $text-muted; }
}

/* 空床位 */
.bed-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 16px 0;
}

.empty-text {
  font-size: 13px;
  color: $text-muted;
}

.empty-hint {
  font-size: 11px;
  color: $color-primary;
}

/* 中部：照片 + 名称年龄性别（自然高度，照片保持原大小） */
.bed-mid {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
}

.bed-photo {
  width: 56px;
  height: 70px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 500;
  color: #fff;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &.女 { background: linear-gradient(135deg, #ff85c0, #eb2f96); }
  &.男 { background: linear-gradient(135deg, #69b1ff, #1677ff); }
}

.bed-mid-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.bed-name {
  font-size: 15px;
  font-weight: 600;
  color: $text-base;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bed-mid-sub {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bed-age {
  font-size: 12px;
  color: $text-tertiary;
}

.bed-gender {
  font-size: 12px;
  color: $text-tertiary;

  &.女 { color: #eb2f96; }
  &.男 { color: #1677ff; }
}

/* 底部：心率 + 血压 */
.bed-vitals-bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding: 9px 14px;
  border-top: 1px solid $border-color-card;
}

.vital {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $text-secondary;

  i {
    font-size: 13px;
    color: $text-muted;
  }

  em {
    font-style: normal;
    font-weight: 600;
    color: $text-base;
    margin-left: 1px;
  }

  .vital-unit {
    font-size: 10px;
    color: $text-muted;
  }

  /* 占位符（离床时监测不到） */
  &.vital-placeholder {
    em { color: $text-muted; }
    .vital-unit { opacity: 0.6; }
  }

  /* 异常：红色 + 发光闪烁 */
  &.abnormal {
    i {
      color: #ff4d4f;
      animation: vital-blink 1.2s ease-in-out infinite;
    }
    em {
      color: #ff4d4f;
      text-shadow: 0 0 6px rgba(255, 77, 79, 0.6);
      animation: vital-blink 1.2s ease-in-out infinite;
    }
  }
}

@keyframes vital-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

.health-tag {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 500;
  margin-right: auto;

  i { font-size: 12px; }
}

/* ===== 详情弹窗 ===== */
.bed-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 4px 4px;
}

.bd-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.bd-avatar {
  width: 48px; height: 48px;
  border-radius: 50%;
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 500; color: #fff;
  flex-shrink: 0;

  img {
    width: 100%; height: 100%;
    object-fit: cover; display: block;
  }

  &.女 { background: linear-gradient(135deg, #ff85c0, #eb2f96); }
  &.男 { background: linear-gradient(135deg, #69b1ff, #1677ff); }
}

.bd-title {
  flex: 1;
  h3 { margin: 0; font-size: 18px; font-weight: 600; color: $text-base; }
}

.bd-sub {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: $text-tertiary;
  margin-top: 2px;
}

.bd-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 500;
}

.bd-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-bottom: 12px;
  border-bottom: 1px solid $border-color-card;
}

.bd-meta-row {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: $text-secondary;
  i { font-size: 13px; color: $text-muted; }
}

.bd-vitals {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.bd-vital {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 12px 8px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 8px;

  .v-label { font-size: 11px; color: $text-muted; }
  .v-val { font-size: 18px; font-weight: 700; color: $text-base; line-height: 1.1; }
  .v-unit { font-size: 10px; color: $text-tertiary; }

  &.abnormal {
    background: #fff1f0;
    border-color: rgba(255, 77, 79, 0.3);
    .v-val { color: #ff4d4f; }
  }
}

.bd-conditions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;

  .c-label { font-size: 12px; color: $text-muted; }
  .c-tag {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 4px;
    background: #fff7e6;
    color: #fa8c16;
  }
}

/* ===== 空床位绑定弹窗 ===== */
.bind-dialog {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px 4px 0;
}

.bind-head {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bind-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: $text-base;

  i { font-size: 18px; color: $color-primary; }
}

.bind-search {
  position: relative;

  i {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: $text-muted;
  }

  input {
    width: 100%;
    height: 38px;
    padding: 0 12px 0 36px;
    border: 1px solid $border-color-input;
    border-radius: 8px;
    background: $bg-page;
    font-size: 13px;
    font-family: inherit;
    color: $text-base;
    outline: none;
    transition: border-color 0.2s;

    &::placeholder { color: $text-muted; }
    &:focus { border-color: $color-primary; }
  }
}

.bind-list {
  max-height: 380px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding-right: 4px;
}

.bind-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 8px;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;

  &:hover:not(.disabled) {
    border-color: $color-primary;
    background: #faf9ff;
  }

  &.selected {
    border-color: $color-primary;
    background: $color-primary-bg;
  }

  &.disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.bind-photo {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 500;
  color: #fff;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &.女 { background: linear-gradient(135deg, #ff85c0, #eb2f96); }
  &.男 { background: linear-gradient(135deg, #69b1ff, #1677ff); }
}

.bind-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 100%;
}

.bind-name-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  flex-wrap: wrap;
}

.bind-name {
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
}

.bind-tag.care {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 7px;
  border-radius: 4px;
}

.bind-sub {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: $text-tertiary;

  .sep { color: $border-color-input; }
  .女 { color: #eb2f96; }
  .男 { color: #1677ff; }
}

.bound-room {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  margin-top: 2px;
  padding: 1px 7px;
  border-radius: 4px;
  background: $bg-hover;
  color: $text-muted;
  font-size: 10px;
  width: fit-content;
  max-width: 100%;
  overflow: hidden;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  i { font-size: 11px; flex-shrink: 0; }
}

.bind-check {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 18px;
  color: $color-primary;
}

.bind-empty {
  text-align: center;
  padding: 40px 0;
  color: $text-muted;

  i { font-size: 36px; opacity: 0.4; }
  p { font-size: 13px; margin: 8px 0 0; }
}

.bind-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
  border-top: 1px solid $border-color-card;
  padding-top: 14px;
}

.bind-cancel,
.bind-ok {
  height: 34px;
  padding: 0 20px;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}

.bind-cancel {
  border: 1px solid $border-color-light;
  background: #fff;
  color: $text-secondary;

  &:hover { color: $color-primary; border-color: $color-primary; }
}

.bind-ok {
  border: none;
  background: $color-primary;
  color: #fff;

  &:hover:not(:disabled) { background: $color-primary-hover; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}
</style>
