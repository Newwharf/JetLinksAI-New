<script setup lang="ts">
/**
 * 老人行为分析
 * 布局：横向3列 × 纵向2行（上矮下高）
 *  上排：告警趋势 / 类型分布 / 房间分布（各自带时间筛选，可钻取）
 *  下排：左=告警排行（老人/类型/房间 三维度tab，可钻取）+ 右=老人明细（侧边栏树+搜索 → 行为统计）
 */
import { useRouter } from 'vue-router'
import ECharts from '@/components/ECharts.vue'
import BehaviorDrillModal from './BehaviorDrillModal.vue'
import {
  buildEvents,
  buildTrendOption,
  buildPieOption,
  buildRoomOption,
  filterByRange,
  rankByPerson,
  rankByType,
  rankByRoom,
  buildElderlyTree,
  buildBehaviorStatsOption,
  behaviorTypes,
  timeRanges,
  rankMedalColors,
  rankBarColors,
  personInfoMap,
  type BehaviorEvent
} from './behavior.mock'

const allEvents = ref<BehaviorEvent[]>(buildEvents())

// ===== 上排：三个图表各自的时间筛选 =====
const trendRange = ref('近7天')
const pieRange = ref('近7天')
const roomRange = ref('近7天')

const trendEvents = computed(() => filterByRange(allEvents.value, trendRange.value))
const pieEvents = computed(() => filterByRange(allEvents.value, pieRange.value))
const roomEvents = computed(() => filterByRange(allEvents.value, roomRange.value))

const trendOption = computed(() => buildTrendOption(trendEvents.value))
const pieOption = computed(() => buildPieOption(pieEvents.value))
const roomOption = computed(() => buildRoomOption(roomEvents.value))

// ===== 下排左：告警排行 =====
const rankTab = ref<'person' | 'type' | 'room'>('person')
const rankRange = ref('近7天')
const rankEvents = computed(() => filterByRange(allEvents.value, rankRange.value))

const rankData = computed(() => {
  if (rankTab.value === 'person') return rankByPerson(rankEvents.value)
  if (rankTab.value === 'type') return rankByType(rankEvents.value)
  return rankByRoom(rankEvents.value)
})

const rankMax = computed(() => Math.max(1, ...rankData.value.map(r => r.count)))

const rankTabMeta = [
  { key: 'person', label: '按老人' },
  { key: 'type', label: '按事件类型' },
  { key: 'room', label: '按房间' }
] as const

// ===== 下排右：老人明细 =====
const elderlyTree = buildElderlyTree()
const treeSearchKey = ref('')
// 选中老人
const selectedPersonId = ref('p1')

// 过滤树（前端 mock：用关键字过滤展示，简化处理）
const filteredTree = computed(() => {
  if (!treeSearchKey.value.trim()) return elderlyTree
  const k = treeSearchKey.value.trim()
  return elderlyTree.map(b => ({
    ...b,
    children: b.children!.map(r => ({
      ...r,
      children: r.children!.filter(p => p.label.includes(k) || r.label.includes(k))
    })).filter(r => r.children!.length > 0)
  })).filter(b => b.children!.length > 0)
})

// 右侧：行为统计（天数切换）
const statDays = ref<number>(7)
const statDaysOptions = [
  { value: 7, label: '近7天' },
  { value: 14, label: '近14天' },
  { value: 30, label: '近30天' }
]
const statEvents = computed(() => {
  const from = Date.now() - statDays.value * 86400000
  return allEvents.value.filter(e => e.timestamp >= from)
})
const behaviorStatsOption = computed(() =>
  buildBehaviorStatsOption(selectedPersonId.value, statEvents.value, statDays.value)
)

// 选中老人完整信息（从 personInfoMap 取）
const selectedPersonInfo = computed(() => personInfoMap[selectedPersonId.value] || null)

// 排行名次颜色：1/2/3 名用奖牌色，其余序号灰
function rankNoBg(i: number): string {
  if (i < 3) return rankMedalColors[i]
  return '#f0f0f0'
}
function rankNoColor(i: number): string {
  if (i < 3) return '#fff'
  return '#9aa1ab'
}
// 进度条颜色：第4名起循环色
function rankBarColor(i: number, itemColor?: string): string {
  if (i < 3) return rankMedalColors[i]
  if (itemColor) return itemColor
  return rankBarColors[(i - 3) % rankBarColors.length]
}

function onTreeSelect(value: string) {
  // 只在选择叶子节点（老人）时切换
  if (value.startsWith('p')) selectedPersonId.value = value
}

const router = useRouter()
function goProfile() {
  router.push('/elderly-behavior/profile')
}

// ===== 钻取弹窗 =====
const drillVisible = ref(false)
const drillPreset = ref<{
  timeRange?: string
  typeKey?: string
  personId?: string
  room?: string
}>({})

function openDrill(preset: { timeRange?: string; typeKey?: string; personId?: string; room?: string }) {
  drillPreset.value = preset
  drillVisible.value = true
}

// 告警趋势图点击：某天某类型
function onTrendClick(params: any) {
  const seriesName = params.seriesName  // 如 "跌倒"
  const typeKey = behaviorTypes.find(t => t.label === seriesName)?.key
  openDrill({ timeRange: trendRange.value, typeKey })
}

// 类型分布饼图点击
function onPieClick(params: any) {
  const typeName = params.name
  const typeKey = behaviorTypes.find(t => t.label === typeName)?.key
  openDrill({ timeRange: pieRange.value, typeKey })
}

// 房间分布柱状图点击
function onRoomClick(params: any) {
  const room = params.name
  openDrill({ timeRange: roomRange.value, room })
}

// 行为统计堆叠条形图点击：钻取选中老人的该类型告警
function onStatsClick(params: any) {
  const seriesName = params.seriesName  // 事件类型名
  const typeKey = behaviorTypes.find(t => t.label === seriesName)?.key
  openDrill({ timeRange: statDays.value === 7 ? '近7天' : statDays.value === 14 ? '近14天' : '近30天', typeKey, personId: selectedPersonId.value })
}

// 排行点击
function onRankClick(r: { key: string }) {
  if (rankTab.value === 'person') {
    // 按老人维度：跳转到老人档案管理页
    router.push('/elderly-behavior/profile')
  } else if (rankTab.value === 'type') {
    openDrill({ timeRange: rankRange.value, typeKey: r.key })
  } else if (rankTab.value === 'room') {
    openDrill({ timeRange: rankRange.value, room: r.key })
  }
}
</script>

<template>
  <div class="eb-page">
    <!-- ===== 上排：三个图表（横向3列，较矮）===== -->
    <div class="eb-top">
      <!-- 趋势 -->
      <div class="chart-card">
        <div class="chart-head">
          <span class="chart-title">告警事件趋势</span>
          <a-select v-model:value="trendRange" :options="timeRanges.map(r => ({ value: r, label: r }))" size="small" class="range-sel" />
        </div>
        <ECharts :option="trendOption" class="chart-body" @chart-click="onTrendClick" />
      </div>
      <!-- 类型分布 -->
      <div class="chart-card">
        <div class="chart-head">
          <span class="chart-title">告警类型分布</span>
          <a-select v-model:value="pieRange" :options="timeRanges.map(r => ({ value: r, label: r }))" size="small" class="range-sel" />
        </div>
        <ECharts :option="pieOption" class="chart-body" @chart-click="onPieClick" />
      </div>
      <!-- 房间分布 -->
      <div class="chart-card">
        <div class="chart-head">
          <span class="chart-title">房间告警分布</span>
          <a-select v-model:value="roomRange" :options="timeRanges.map(r => ({ value: r, label: r }))" size="small" class="range-sel" />
        </div>
        <ECharts :option="roomOption" class="chart-body" @chart-click="onRoomClick" />
      </div>
    </div>

    <!-- ===== 下排：左排行 + 右明细（占2列）===== -->
    <div class="eb-bottom">
      <!-- 左：告警排行 -->
      <div class="rank-panel">
        <div class="panel-head">
          <div class="panel-title-row">
            <span class="panel-title">告警事件排行</span>
            <a-select v-model:value="rankRange" :options="timeRanges.map(r => ({ value: r, label: r }))" size="small" class="range-sel" />
          </div>
          <div class="rank-tabs">
            <button
              v-for="t in rankTabMeta"
              :key="t.key"
              class="rank-tab"
              :class="{ active: rankTab === t.key }"
              @click="rankTab = t.key"
            >{{ t.label }}</button>
          </div>
        </div>
        <div class="rank-list scroll-thin">
          <div
            v-for="(r, i) in rankData"
            :key="r.key"
            class="rank-item"
            :class="{ clickable: rankTab === 'person' || rankTab === 'type' || rankTab === 'room' }"
            @click="onRankClick(r)"
          >
            <span class="rank-no" :style="{ background: rankNoBg(i), color: rankNoColor(i) }">{{ i + 1 }}</span>
            <!-- 老人头像 / 类型图标 -->
            <div v-if="r.avatar" class="rank-avatar">
              <img :src="r.avatar" alt="" />
            </div>
            <div v-else-if="r.icon" class="rank-type-icon" :style="{ background: (r.color || '#6e4bff') + '18', color: r.color || '#6e4bff' }">
              <i :class="r.icon" />
            </div>
            <div v-else class="rank-room-icon">
              <i class="i-ant-design-home-outlined" />
            </div>
            <div class="rank-main">
              <div class="rank-label-row">
                <span class="rank-label">{{ r.label }}</span>
                <span v-if="r.sub" class="rank-sub">{{ r.sub }}</span>
              </div>
              <div class="rank-bar-wrap">
                <div class="rank-bar" :style="{ width: (r.count / rankMax * 100) + '%', background: rankBarColor(i, r.color) }" />
              </div>
            </div>
            <span class="rank-count">{{ r.count }}</span>
          </div>
          <div v-if="rankData.length === 0" class="rank-empty">暂无数据</div>
        </div>
      </div>

      <!-- 右：老人明细（占2列）-->
      <div class="detail-panel">
        <!-- 侧边栏：老人树 -->
        <aside class="elder-sidebar">
          <div class="sidebar-head">老人列表</div>
          <div class="sidebar-search">
            <a-input v-model:value="treeSearchKey" placeholder="搜索姓名/房间" allow-clear size="small">
              <template #prefix><i class="i-ant-design-search-outlined" /></template>
            </a-input>
          </div>
          <div class="sidebar-tree scroll-thin">
            <a-tree
              :tree-data="filteredTree"
              :selected-keys="[selectedPersonId]"
              :default-expand-all="true"
              :show-line="false"
              @select="(_k: any, info: any) => onTreeSelect(info.node.value)"
            >
              <template #title="node">
                <span class="tree-node" :class="node.nodeType">
                  <i v-if="node.nodeType === 'room'" class="tree-icon i-ant-design-home-outlined" />
                  <img v-else-if="node.nodeType === 'person'" class="tree-avatar" :class="node.gender" :src="node.photo" alt="" />
                  <span class="tree-label">{{ node.label }}</span>
                  <span v-if="node.subLabel" class="tree-sub">{{ node.subLabel }}</span>
                </span>
              </template>
            </a-tree>
          </div>
        </aside>

        <!-- 明细内容 -->
        <div class="detail-content">
          <!-- 老人详细信息卡 -->
          <div v-if="selectedPersonInfo" class="person-info-card">
            <div class="pi-avatar" :class="selectedPersonInfo.gender">
              <img :src="selectedPersonInfo.photo" alt="老人照片" />
            </div>
            <div class="pi-main">
              <div class="pi-name-row">
                <span class="pi-name">{{ selectedPersonInfo.name }}</span>
                <span class="pi-tag" :class="selectedPersonInfo.gender">{{ selectedPersonInfo.gender }}</span>
                <span class="pi-age">{{ selectedPersonInfo.age }}岁</span>
              </div>
              <div class="pi-location">
                <span class="pi-loc-item"><i class="i-ant-design-environment-outlined" />{{ selectedPersonInfo.building }}</span>
                <span class="pi-loc-item"><i class="i-ant-design-home-outlined" />{{ selectedPersonInfo.room }}</span>
                <span class="pi-loc-item"><i class="i-ant-design-bed-outlined" />{{ selectedPersonInfo.bedNo }}</span>
              </div>
            </div>
            <!-- 备注区域 -->
            <div v-if="selectedPersonInfo.remark" class="pi-remark-area">
              <span class="pi-remark-label">备注</span>
              <p class="pi-remark-text">{{ selectedPersonInfo.remark }}</p>
            </div>
            <!-- 档案详情按钮 -->
            <button class="pi-detail-btn" @click="goProfile">
              <i class="i-ant-design-profile-outlined" />档案详情
            </button>
          </div>

          <!-- 行为统计工具栏 -->
          <div class="detail-toolbar">
            <span class="stat-title">行为统计</span>
            <a-select
              v-model:value="statDays"
              :options="statDaysOptions"
              size="small"
              class="stat-days-sel"
              :field-names="{ label: 'label', value: 'value' }"
            />
          </div>

          <!-- 行为统计：横向堆叠条形图 -->
          <div class="stat-chart-wrap">
            <ECharts :option="behaviorStatsOption" class="stat-chart" @chart-click="onStatsClick" />
          </div>
        </div>
      </div>
    </div>

    <!-- 钻取弹窗 -->
    <BehaviorDrillModal
      v-model:open="drillVisible"
      :events="allEvents"
      :preset="drillPreset"
    />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.eb-page {
  display: grid;
  grid-template-rows: 240px 1fr;
  gap: 12px;
  height: 100%;
  padding: 12px 16px;
  overflow: hidden;
}

/* ===== 上排图表 ===== */
.eb-top {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  min-height: 0;
}

.chart-card {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  flex-shrink: 0;

  .chart-title {
    font-size: 13px;
    font-weight: 600;
    color: $text-base;
  }
}

.range-sel {
  width: 90px;
  :deep(.ant-select-selector) {
    border-radius: 4px !important;
    font-size: 12px;
  }
}

.chart-body {
  flex: 1;
  min-height: 0;
}

/* ===== 下排 ===== */
.eb-bottom {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 12px;
  min-height: 0;
}

/* 左：排行 */
.rank-panel {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-head {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px 8px;
  border-bottom: 1px solid $border-color-card;
}

.panel-title {
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
}

.rank-tabs {
  display: flex;
  gap: 2px;
  padding: 8px 12px;
  border-bottom: 1px solid $border-color-card;
}

.rank-tab {
  padding: 3px 10px;
  border: none;
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: $text-secondary;
  cursor: pointer;
  border-radius: 4px;
  font-family: inherit;
  transition: all 0.15s;

  &:hover { color: $color-primary; }
  &.active { background: $color-primary-bg; color: $color-primary; }
}

.rank-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
}

.rank-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.03);

  &:last-child { border-bottom: none; }
}

.rank-no {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #f0f0f0;
  color: $text-tertiary;
  font-size: 11px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

/* 老人头像 */
.rank-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid $border-color-card;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

/* 事件类型图标 */
.rank-type-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  i { font-size: 16px; }
}

/* 房间图标 */
.rank-room-icon {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #f5f5f5;
  color: $text-muted;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  i { font-size: 15px; }
}

.rank-main {
  flex: 1;
  min-width: 0;
}

.rank-label-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-bottom: 3px;
}

.rank-label {
  font-size: 13px;
  font-weight: 500;
  color: $text-base;
}

.rank-sub {
  font-size: 10px;
  color: $text-muted;
}

.rank-bar-wrap {
  height: 5px;
  background: #f5f5f5;
  border-radius: 3px;
  overflow: hidden;
}

.rank-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.rank-count {
  font-size: 13px;
  font-weight: 700;
  color: $text-base;
  min-width: 24px;
  text-align: right;
}

.rank-empty {
  text-align: center;
  padding: 40px;
  color: $text-muted;
  font-size: 13px;
}

/* 右：明细 */
.detail-panel {
  display: flex;
  gap: 0;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
}

.elder-sidebar {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid $border-color-card;
  display: flex;
  flex-direction: column;
}

.sidebar-head {
  padding: 12px;
  font-size: 13px;
  font-weight: 600;
  color: $text-base;
  border-bottom: 1px solid $border-color-card;
}

.sidebar-search {
  padding: 8px 10px;
  border-bottom: 1px solid $border-color-card;
}

.sidebar-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 6px;

  :deep(.ant-tree) {
    font-size: 12px;
  }
  /* 缩进调到最小 */
  :deep(.ant-tree-indent-unit) {
    width: 8px !important;
    min-width: 8px !important;
  }
  :deep(.ant-tree-switcher) {
    width: 16px !important;
    min-width: 16px !important;
  }
  :deep(.ant-tree-treenode) {
    padding-top: 1px;
    padding-bottom: 1px;
  }
  :deep(.ant-tree .ant-tree-node-content-wrapper) {
    padding: 2px 4px;
    flex: 1;
  }
  :deep(.ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected) {
    background: $color-primary-bg;
  }
}

/* 自定义树节点 */
.tree-node {
  display: inline-flex;
  align-items: center;
  gap: 5px;

  .tree-icon {
    font-size: 13px;
    color: $text-muted;
    flex-shrink: 0;
  }

  /* 老人圆头像 */
  .tree-avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    border: 1px solid $border-color-card;
  }

  .tree-label {
    font-size: 12px;
    color: $text-base;
    white-space: nowrap;
  }

  .tree-sub {
    font-size: 10px;
    color: $text-muted;
    margin-left: 2px;
    white-space: nowrap;
  }

  &.person .tree-label {
    font-weight: 500;
  }
}

.detail-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
  gap: 12px;
}

.stat-title {
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
}

.stat-days-sel {
  width: 100px;
  :deep(.ant-select-selector) { border-radius: 4px !important; font-size: 12px; }
}

/* 行为统计图表 */
.stat-chart-wrap {
  flex: 1;
  min-height: 0;
  padding: 8px 12px;
  overflow: hidden;
}

.stat-chart {
  width: 100%;
  height: 100%;
}

/* 老人详细信息卡 */
.person-info-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.pi-avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px $border-color-card;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.pi-main {
  flex: 0 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.pi-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pi-name {
  font-size: 15px;
  font-weight: 600;
  color: $text-base;
}

.pi-tag {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 3px;
  font-weight: 500;

  &.男 { background: #e6f4ff; color: #1677ff; }
  &.女 { background: #fff0f6; color: #eb2f96; }
}

.pi-age {
  font-size: 12px;
  color: $text-tertiary;
}

.pi-location {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.pi-loc-item {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: $text-secondary;
  white-space: nowrap;

  i { font-size: 12px; color: $text-muted; }
}

/* 备注区域（右侧） */
.pi-remark-area {
  flex: 1;
  min-width: 0;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.pi-remark-label {
  font-size: 11px;
  color: $text-muted;
  font-weight: 500;
}

.pi-remark-text {
  font-size: 12px;
  color: $text-tertiary;
  line-height: 1.4;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 档案详情按钮 */
.pi-detail-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 14px;
  border: 1px solid $color-primary;
  border-radius: 6px;
  background: $color-primary-bg;
  color: $color-primary;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
  align-self: center;
  margin-left: auto;
  transition: all 0.15s;

  i { font-size: 13px; }
  &:hover { background: $color-primary; color: #fff; }
}

/* 排行项可点击 */
.rank-item.clickable {
  cursor: pointer;
  &:hover {
    background: #faf9ff;
  }
}

/* 时间轴 */
.timeline-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
}

.tl-item {
  display: flex;
  gap: 12px;
  margin-bottom: 2px;
  &:last-child { margin-bottom: 0; }
}

.tl-axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 10px;
  flex-shrink: 0;

  .tl-dot {
    width: 9px; height: 9px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.08);
    margin-top: 6px;
    flex-shrink: 0;
  }
  .tl-line {
    flex: 1;
    width: 2px;
    background: $border-color-card;
    margin: 1px 0;
  }
}

.tl-card {
  flex: 1;
  padding: 8px 12px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  margin-bottom: 6px;
}

.tl-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

/* 事件卡片正文：缩略图 + 信息 */
.tl-body {
  display: flex;
  gap: 10px;
}

.tl-snap {
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

.tl-snap-tag {
  position: absolute;
  left: 3px;
  bottom: 3px;
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tl-body-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tl-type {
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 3px;
  font-weight: 500;
}

.tl-time { font-size: 11px; color: $text-tertiary; }

.tl-status {
  margin-left: auto;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  &.done { background: #f6ffed; color: #52c41a; }
  &.pending { background: #fff7e6; color: #fa8c16; }
}

.tl-desc {
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.5;
  margin: 0 0 4px;
}

.tl-loc {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: $text-muted;
  i { font-size: 11px; }
}

.tl-empty {
  text-align: center;
  padding: 50px;
  color: $text-muted;
  i { font-size: 36px; opacity: 0.4; }
  p { font-size: 13px; margin: 8px 0 0; }
}

/* 预测 */
.predict-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.predict-card {
  padding: 12px 14px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-left: 3px solid;
  border-radius: 8px;

  &.high { border-left-color: #ff4d4f; }
  &.medium { border-left-color: #fa8c16; }
  &.low { border-left-color: #52c41a; }
}

.predict-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.predict-type {
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
}

.predict-risk-tag {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 3px;
  font-weight: 500;
}

.predict-prob-bar {
  /* 固定宽度，保证所有卡片进度条等长、起止对齐 */
  width: 180px;
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin: 0 8px 0 auto;
}

.predict-prob-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.predict-prob-text {
  font-size: 14px;
  font-weight: 700;
  min-width: 36px;
  text-align: right;
}

.predict-desc {
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.5;
  margin: 0 0 6px;
}

.predict-suggest {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $color-primary;
  background: $color-primary-bg;
  padding: 5px 10px;
  border-radius: 5px;
  i { font-size: 13px; }
}
</style>
