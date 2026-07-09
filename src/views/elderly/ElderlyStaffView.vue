<script setup lang="ts">
/**
 * 护工行为分析看板
 * 上部：护工负责老人分布柱状图（点击柱子弹窗查看老人列表）
 * 下部左：护工列表；右：选中护工的详情（基本信息+饼图+筛选+护理事件时间轴）
 */
import ECharts from '@/components/ECharts.vue'
import { useStaffStore } from '@/stores/staff'
import { buildNursingEvents, buildElderlyTree, careTypes, type NursingEvent, type ElderlyTreeNode } from './staff.mock'
import { buildElderly, type ElderlyPerson } from './bed.mock'

const staffStore = useStaffStore()
const staffList = computed(() => staffStore.staffList)
const allElderly = buildElderly()
const elderlyMap: Record<string, ElderlyPerson> = Object.fromEntries(allElderly.map(e => [e.id, e]))

// 选中护工
const selectedStaffId = ref<string>(staffList.value[0]?.id || '')
const selectedStaff = computed(() => staffStore.getStaffById(selectedStaffId.value))

// 柱状图展开/收起
const chartExpanded = ref(true)

// ===== 上部：柱状图 =====
const barOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    axisPointer: { type: 'shadow' },
    formatter: (params: any) => {
      const p = params[0]
      return `${p.name}<br/>负责老人：<b>${p.value}</b> 人`
    }
  },
  grid: { left: 50, right: 20, top: 20, bottom: 30 },
  xAxis: {
    type: 'category',
    data: staffList.value.map(s => s.name),
    axisLabel: { fontSize: 12, color: '#8895ab' },
    axisLine: { lineStyle: { color: '#f4f5f7' } }
  },
  yAxis: {
    type: 'value',
    axisLabel: { fontSize: 11, color: '#9aa1ab' },
    splitLine: { lineStyle: { color: '#f4f5f7' } }
  },
  series: [{
    type: 'bar',
    data: staffList.value.map(s => s.elderlyIds.length),
    barWidth: '40%',
    itemStyle: {
      borderRadius: [4, 4, 0, 0],
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: '#7d5cff' },
          { offset: 1, color: '#6e4bff' }
        ]
      }
    },
    label: { show: true, position: 'top', fontSize: 12, fontWeight: 600, color: '#6e4bff' }
  }]
}))

// 柱状图点击 → 老人列表弹窗
const elderlyListVisible = ref(false)
const elderlyListStaff = ref(staffList.value[0]?.id || '')
const elderlyListStaffName = ref('')

function onBarClick(params: any) {
  const idx = params.dataIndex
  const staff = staffList.value[idx]
  if (!staff) return
  elderlyListStaff.value = staff.id
  elderlyListStaffName.value = staff.name
  elderlyListVisible.value = true
}

function openElderlyList(staffId: string) {
  const s = staffStore.getStaffById(staffId)
  if (!s) return
  elderlyListStaff.value = staffId
  elderlyListStaffName.value = s.name
  elderlyListVisible.value = true
}

const elderlyListStaffInfo = computed(() => staffStore.getStaffById(elderlyListStaff.value))

// ===== 饼图：每个老人的护理次数 =====
const pieOption = computed(() => {
  const staff = selectedStaff.value
  if (!staff) return {}
  const events = filteredEvents.value
  const countMap: Record<string, number> = {}
  for (const ev of events) {
    countMap[ev.elderlyId] = (countMap[ev.elderlyId] || 0) + 1
  }
  const data = staff.elderlyIds.map(id => {
    const e = elderlyMap[id]
    return {
      name: e?.name || id,
      value: countMap[id] || 0
    }
  }).filter(d => d.value > 0)

  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} 次 ({d}%)' },
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      center: ['50%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 12, fontWeight: 600 } },
      data,
      color: ['#6e4bff', '#1890ff', '#52c41a', '#fa8c16', '#13c2c2', '#ff4d4f', '#722ed1', '#eb2f96']
    }]
  }
})

// ===== 筛选条件 =====
const filterDateRange = ref<[string, string] | undefined>(undefined)
const filterElderlyId = ref<string | undefined>(undefined)
const filterType = ref<string | undefined>(undefined)
const filterKeyword = ref('')

// 老人树（选中护工的老人）
const elderlyTree = computed<ElderlyTreeNode[]>(() => {
  const staff = selectedStaff.value
  if (!staff) return []
  return buildElderlyTree(staff.elderlyIds)
})

// 过滤后的护理事件
const filteredEvents = computed<NursingEvent[]>(() => {
  const staff = selectedStaff.value
  if (!staff) return []
  return buildNursingEvents(staff.id, staff.elderlyIds, {
    dateRange: filterDateRange.value ?? null,
    elderlyId: filterElderlyId.value ?? null,
    typeKey: filterType.value ?? null,
    keyword: filterKeyword.value.trim() || undefined
  })
})

// ===== 事件详情（右侧面板，非弹窗） =====
const selectedEvent = ref<NursingEvent | null>(null)
function selectEvent(ev: NursingEvent) {
  selectedEvent.value = ev
}

// 饼图图例数据（老人名 + 护理次数）
const pieLegendData = computed(() => {
  const staff = selectedStaff.value
  if (!staff) return []
  const events = filteredEvents.value
  const countMap: Record<string, number> = {}
  for (const ev of events) {
    countMap[ev.elderlyId] = (countMap[ev.elderlyId] || 0) + 1
  }
  const colors = ['#6e4bff', '#1890ff', '#52c41a', '#fa8c16', '#13c2c2', '#ff4d4f', '#722ed1', '#eb2f96']
  return staff.elderlyIds.map((id, i) => {
    const e = elderlyMap[id]
    return {
      name: e?.name || id,
      count: countMap[id] || 0,
      color: colors[i % colors.length]
    }
  }).filter(d => d.count > 0)
})

// 班次颜色
const shiftColor: Record<string, string> = { '白班': '#fa8c16', '晚班': '#722ed1', '夜班': '#2f54eb' }
const positionColor: Record<string, string> = { '初级护工': '#52c41a', '中级护工': '#1890ff', '高级护工': '#722ed1', '护士长': '#fa8c16' }
</script>

<template>
  <div class="es-page">
    <!-- ===== 上部：柱状图 ===== -->
    <section class="es-chart-card">
      <div class="es-chart-head">
        <h3>护工负责老人分布</h3>
        <span class="es-chart-sub" v-if="chartExpanded">点击柱子查看负责的老人列表</span>
        <button class="es-chart-toggle" @click="chartExpanded = !chartExpanded">
          <i :class="chartExpanded ? 'i-ant-design-up-outlined' : 'i-ant-design-down-outlined'" />
          {{ chartExpanded ? '收起' : '展开' }}
        </button>
      </div>
      <ECharts v-show="chartExpanded" :option="barOption" height="150px" class="es-chart-body" @chart-click="onBarClick" />
    </section>

    <!-- ===== 下部：左右分栏 ===== -->
    <div class="es-body">
      <!-- 左：护工列表 -->
      <aside class="es-staff-list scroll-thin">
        <div
          v-for="s in staffList"
          :key="s.id"
          class="es-staff-item"
          :class="{ active: selectedStaffId === s.id }"
          @click="selectedStaffId = s.id"
        >
          <div class="es-staff-avatar" :class="s.gender">
            <img v-if="s.photo" :src="s.photo" :alt="s.name" />
            <span v-else>{{ s.name.charAt(0) }}</span>
          </div>
          <div class="es-staff-info">
            <div class="es-staff-name">{{ s.name }}</div>
            <div class="es-staff-sub">
              <span class="es-tag" :style="{ color: positionColor[s.position], background: positionColor[s.position] + '18' }">{{ s.position }}</span>
              <span class="es-tag" :style="{ color: shiftColor[s.shift], background: shiftColor[s.shift] + '18' }">{{ s.shift }}</span>
            </div>
          </div>
          <div class="es-staff-count">
            <span class="num">{{ s.elderlyIds.length }}</span>
            <span class="label">老人</span>
          </div>
        </div>
      </aside>

      <!-- 右：详情区 -->
      <section v-if="selectedStaff" class="es-detail scroll-thin">
        <!-- 基本信息卡（含饼图+图例） -->
        <div class="es-info-card">
          <div class="es-info-left">
            <div class="es-info-avatar" :class="selectedStaff.gender">
              <img v-if="selectedStaff.photo" :src="selectedStaff.photo" :alt="selectedStaff.name" />
              <span v-else>{{ selectedStaff.name.charAt(0) }}</span>
            </div>
          </div>
          <div class="es-info-main">
            <div class="es-info-name-row">
              <h3>{{ selectedStaff.name }}</h3>
              <span class="es-tag" :style="{ color: positionColor[selectedStaff.position], background: positionColor[selectedStaff.position] + '18' }">{{ selectedStaff.position }}</span>
              <span class="es-tag" :style="{ color: shiftColor[selectedStaff.shift], background: shiftColor[selectedStaff.shift] + '18' }">{{ selectedStaff.shift }}</span>
            </div>
            <div class="es-info-meta">
              <span>{{ selectedStaff.gender }}</span>
              <span class="sep">·</span>
              <span>{{ selectedStaff.age }}岁</span>
              <span class="sep">·</span>
              <span class="es-elderly-link" @click="openElderlyList(selectedStaff.id)">
                负责老人 <em>{{ selectedStaff.elderlyIds.length }}</em> 人
              </span>
            </div>
            <p class="es-info-remark" v-if="selectedStaff.remark">{{ selectedStaff.remark }}</p>
          </div>

          <!-- 饼图 + 自定义图例 -->
          <div class="es-info-pie" v-if="filteredEvents.length">
            <ECharts :option="pieOption" height="80px" style="width: 80px;" />
            <div class="es-pie-legend">
              <div v-for="d in pieLegendData" :key="d.name" class="es-pie-legend-item">
                <span class="es-pie-legend-dot" :style="{ background: d.color }" />
                <span class="es-pie-legend-name">{{ d.name }}</span>
                <span class="es-pie-legend-count">{{ d.count }}次</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 合并卡片：筛选 + 时间轴 + 事件详情 -->
        <div class="es-combined-card">
          <!-- 筛选工具栏 -->
          <div class="es-filter-bar">
            <a-range-picker
              v-model:value="filterDateRange"
              size="small"
              style="width: 200px"
              :placeholder="['开始', '结束']"
              format="MM-DD"
            />
            <a-tree-select
              v-model:value="filterElderlyId"
              size="small"
              style="width: 160px"
              placeholder="护理老人"
              allow-clear
              :tree-data="elderlyTree"
              tree-default-expand-all
              :field-names="{ label: 'label', value: 'value', children: 'children' }"
            />
            <a-select
              v-model:value="filterType"
              size="small"
              style="width: 120px"
              placeholder="护理类型"
              allow-clear
              :options="careTypes.map(t => ({ value: t.key, label: t.label }))"
            />
            <div class="es-filter-search">
              <i class="i-ant-design-search-outlined" />
              <input v-model="filterKeyword" placeholder="关键字搜索" />
            </div>
          </div>

          <!-- 时间轴（左） + 事件详情（右） -->
          <div class="es-timeline-detail">
            <!-- 时间轴 -->
            <div class="es-timeline-section scroll-thin">
              <div class="es-section-head">
                <h3>护理事件时间轴</h3>
                <span class="es-chart-sub">{{ filteredEvents.length }} 条</span>
              </div>

              <div v-if="filteredEvents.length" class="es-timeline-list">
                <div
                  v-for="(ev, i) in filteredEvents"
                  :key="ev.id"
                  class="es-tl-item"
                  :class="{ active: selectedEvent?.id === ev.id }"
                  @click="selectEvent(ev)"
                >
                  <div class="es-tl-rail">
                    <span class="es-tl-dot" :style="{ background: ev.typeColor }" />
                    <span v-if="i < filteredEvents.length - 1" class="es-tl-line" />
                  </div>
                  <div class="es-tl-card">
                    <div class="es-tl-elderly">
                      <div class="es-tl-photo" :class="elderlyMap[ev.elderlyId]?.gender">
                        <img v-if="ev.elderlyPhoto" :src="ev.elderlyPhoto" :alt="ev.elderlyName" />
                        <span v-else>{{ ev.elderlyName.charAt(0) }}</span>
                      </div>
                      <div class="es-tl-elderly-info">
                        <span class="es-tl-elderly-name">{{ ev.elderlyName }}</span>
                        <span class="es-tl-elderly-room">{{ ev.elderlyRoom }}</span>
                      </div>
                    </div>
                    <div class="es-tl-event">
                      <div class="es-tl-event-head">
                        <i :class="ev.typeIcon" :style="{ color: ev.typeColor }" />
                        <span class="es-tl-event-type" :style="{ color: ev.typeColor }">{{ ev.title }}</span>
                        <span class="es-tl-event-time">{{ ev.time }}</span>
                      </div>
                      <div class="es-tl-event-cam">
                        <i class="i-ant-design-video-camera-outlined" />
                        <span>{{ ev.cameraName }}</span>
                        <span class="es-tl-cam-loc">{{ ev.cameraLocation }}</span>
                      </div>
                      <p class="es-tl-event-desc">{{ ev.desc }}</p>
                      <div class="es-tl-event-snap">
                        <img :src="ev.snapshot" alt="护理抓拍" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div v-else class="es-chart-empty sm">
                <i class="i-ant-design-inbox-outlined" />
                <p>暂无护理事件</p>
              </div>
            </div>

            <!-- 事件详情（右） -->
            <div class="es-event-detail scroll-thin">
              <div v-if="selectedEvent" class="es-ev-content">
                <!-- 事件图片（播放按钮） -->
                <div class="es-ev-snap">
                  <img :src="selectedEvent.snapshot" alt="护理抓拍" />
                  <button class="es-ev-play">
                    <i class="i-ant-design-play-circle-filled" />
                  </button>
                </div>

                <!-- 事件类型 -->
                <div class="es-ev-type-row">
                  <i :class="selectedEvent.typeIcon" :style="{ color: selectedEvent.typeColor }" />
                  <span class="es-ev-type" :style="{ color: selectedEvent.typeColor }">{{ selectedEvent.title }}</span>
                  <span class="es-ev-type-tag" :style="{ color: selectedEvent.typeColor, background: selectedEvent.typeColor + '18' }">{{ selectedEvent.typeName }}</span>
                </div>

                <!-- 发生时间 -->
                <div class="es-ev-field">
                  <i class="i-ant-design-clock-circle-outlined" />
                  <span class="es-ev-field-label">发生时间</span>
                  <span class="es-ev-field-value">{{ selectedEvent.time }}</span>
                </div>

                <!-- 老人信息 -->
                <div class="es-ev-elderly">
                  <div class="es-ev-elderly-photo" :class="elderlyMap[selectedEvent.elderlyId]?.gender">
                    <img v-if="selectedEvent.elderlyPhoto" :src="selectedEvent.elderlyPhoto" :alt="selectedEvent.elderlyName" />
                    <span v-else>{{ selectedEvent.elderlyName.charAt(0) }}</span>
                  </div>
                  <div class="es-ev-elderly-info">
                    <div class="es-ev-elderly-name">{{ selectedEvent.elderlyName }}</div>
                    <div class="es-ev-elderly-room">{{ selectedEvent.elderlyRoom }} · {{ elderlyMap[selectedEvent.elderlyId]?.bedNo }}</div>
                  </div>
                </div>

                <!-- 摄像头 -->
                <div class="es-ev-field">
                  <i class="i-ant-design-video-camera-outlined" />
                  <span class="es-ev-field-label">摄像头</span>
                  <span class="es-ev-field-value">{{ selectedEvent.cameraName }}</span>
                  <span class="es-ev-field-sub">{{ selectedEvent.cameraLocation }}</span>
                </div>

                <!-- 护工 -->
                <div class="es-ev-field">
                  <i class="i-ant-design-user-outlined" />
                  <span class="es-ev-field-label">执行护工</span>
                  <span class="es-ev-field-value">{{ selectedStaff.name }}</span>
                </div>

                <!-- 描述 -->
                <div class="es-ev-desc-section">
                  <div class="es-ev-section-title">事件描述</div>
                  <p class="es-ev-desc">{{ selectedEvent.desc }}</p>
                </div>
              </div>

              <!-- 未选中态 -->
              <div v-else class="es-ev-placeholder">
                <i class="i-ant-design-file-text-outlined" />
                <p>点击左侧时间轴中的护理事件查看详情</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- ===== 老人列表弹窗（柱状图点击 / 负责老人数点击） ===== -->
    <a-modal :open="elderlyListVisible" :width="640" :footer="null" centered :title="undefined" @cancel="elderlyListVisible = false">
      <div class="el-dialog" v-if="elderlyListStaffInfo">
        <div class="el-head">
          <i class="i-ant-design-team-outlined" />
          <span>{{ elderlyListStaffName }} 负责的老人</span>
          <em class="el-count">{{ elderlyListStaffInfo.elderlyIds.length }} 人</em>
        </div>
        <div class="el-grid scroll-thin">
          <div v-for="id in elderlyListStaffInfo.elderlyIds" :key="id" class="el-item">
            <div class="el-photo" :class="elderlyMap[id]?.gender">
              <img v-if="elderlyMap[id]?.photo" :src="elderlyMap[id]!.photo" :alt="elderlyMap[id]?.name" />
              <span v-else>{{ elderlyMap[id]?.name.charAt(0) }}</span>
            </div>
            <div class="el-info">
              <span class="el-name">{{ elderlyMap[id]?.name }}</span>
              <span class="el-room">{{ elderlyMap[id]?.building }} · {{ elderlyMap[id]?.room }}</span>
            </div>
          </div>
        </div>
      </div>
    </a-modal>

  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.es-page {
  height: 100%;
  background: $bg-page;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

/* ===== 柱状图卡片 ===== */
.es-chart-card {
  flex-shrink: 0;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 14px 16px;
}

.es-chart-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
}

  h3 {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
  }
}

.es-chart-sub {
  font-size: 12px;
  color: $text-muted;
}

.es-chart-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 12px;
  border: 1px solid $border-color-input;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  i { font-size: 13px; }

  &:hover {
    color: $color-primary;
    border-color: $color-primary;
  }
}

.es-chart-body {
  margin-top: 8px;
}

.es-chart-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 8px;
  color: $text-muted;

  i { font-size: 36px; opacity: 0.4; }
  p { font-size: 13px; margin: 0; }
}

/* ===== 下部布局 ===== */
.es-body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 12px;
}

/* 左：护工列表 */
.es-staff-list {
  width: 280px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.es-staff-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  border: 1px solid transparent;

  &:hover {
    background: #fafaff;
  }

  &.active {
    background: $color-primary-bg;
    border-color: rgba(110, 75, 255, 0.2);
  }
}

.es-staff-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
  color: #fff;

  img { width: 100%; height: 100%; object-fit: cover; }
  &.女 { background: linear-gradient(135deg, #ff85c0, #eb2f96); }
  &.男 { background: linear-gradient(135deg, #69b1ff, #1677ff); }
}

.es-staff-info {
  flex: 1;
  min-width: 0;
}

.es-staff-name {
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
}

.es-staff-sub {
  display: flex;
  gap: 4px;
  margin-top: 3px;
}

.es-tag {
  font-size: 10px;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 3px;
  white-space: nowrap;
}

.es-staff-count {
  text-align: center;
  flex-shrink: 0;

  .num { display: block; font-size: 15px; font-weight: 700; color: $color-primary; line-height: 1; }
  .label { font-size: 9px; color: $text-muted; }
}

/* 右：详情区 */
.es-detail {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* 基本信息卡 */
/* 基本信息卡（含饼图+图例） */
.es-info-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid $border-color-card;
  border-bottom: none;
  border-radius: 12px 12px 0 0;
  padding: 8px 14px;
  flex-shrink: 0;
}

.es-info-left {
  flex-shrink: 0;
}

.es-info-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 500;
  color: #fff;

  img { width: 100%; height: 100%; object-fit: cover; }
  &.女 { background: linear-gradient(135deg, #ff85c0, #eb2f96); }
  &.男 { background: linear-gradient(135deg, #69b1ff, #1677ff); }
}

.es-info-main {
  flex: 1;
  min-width: 0;
}

.es-info-name-row {
  display: flex;
  align-items: center;
  gap: 8px;

  h3 { margin: 0; font-size: 18px; font-weight: 600; color: $text-base; }
}

.es-info-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  font-size: 13px;
  color: $text-tertiary;

  .sep { color: $border-color-input; }
}

.es-elderly-link {
  color: $color-primary;
  cursor: pointer;

  em { font-style: normal; font-weight: 700; }

  &:hover { text-decoration: underline; }
}

.es-info-remark {
  margin: 6px 0 0;
  font-size: 12px;
  color: $text-muted;
}

/* 饼图 + 自定义图例 */
.es-info-pie {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  border-left: 1px solid $border-color-card;
  padding-left: 10px;
  max-height: 80px;
}

.es-pie-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  max-height: 80px;
  overflow-y: auto;
  max-width: 220px;
}

.es-pie-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  white-space: nowrap;
}

.es-pie-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.es-pie-legend-name {
  color: $text-secondary;
}

.es-pie-legend-count {
  color: $text-muted;
  font-weight: 600;
  margin-left: auto;
}

/* 合并卡片：筛选 + 时间轴 + 事件详情 */
.es-combined-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 0 0 12px 12px;
  overflow: hidden;
}

/* 筛选栏（合并卡片内） */
.es-filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.es-filter-search {
  position: relative;
  flex: 1;
  max-width: 200px;

  i {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 13px;
    color: $text-muted;
  }

  input {
    width: 100%;
    height: 30px;
    padding: 0 10px 0 30px;
    border: 1px solid $border-color-input;
    border-radius: 6px;
    font-size: 12px;
    font-family: inherit;
    outline: none;

    &:focus { border-color: $color-primary; }
  }
}

/* 时间轴（左） + 事件详情（右） */
.es-timeline-detail {
  flex: 1;
  min-height: 0;
  display: flex;
}

.es-timeline-section {
  width: 50%;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px;
  border-right: 1px solid $border-color-card;
}

.es-section-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;

  h3 { margin: 0; font-size: 15px; font-weight: 600; color: $text-base; }
}

.es-timeline-list {
  display: flex;
  flex-direction: column;
}

.es-tl-item {
  display: flex;
  gap: 12px;
}

.es-tl-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  padding-top: 14px;
}

.es-tl-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 2px rgba(0,0,0,0.06);
  flex-shrink: 0;
}

.es-tl-line {
  width: 2px;
  flex: 1;
  background: $border-color-card;
  margin: 2px 0;
}

.es-tl-card {
  flex: 1;
  display: flex;
  gap: 12px;
  padding: 10px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;

  &:hover {
    border-color: $color-primary;
    box-shadow: 0 2px 8px rgba(110, 75, 255, 0.08);
  }
}

.es-tl-item.active .es-tl-card {
  background: $color-primary-bg;
  border-color: $color-primary;
}

.es-tl-elderly {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  width: 64px;
  flex-shrink: 0;
}

.es-tl-photo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 500;
  color: #fff;

  img { width: 100%; height: 100%; object-fit: cover; }
  &.女 { background: linear-gradient(135deg, #ff85c0, #eb2f96); }
  &.男 { background: linear-gradient(135deg, #69b1ff, #1677ff); }
}

.es-tl-elderly-info {
  text-align: center;
}

.es-tl-elderly-name {
  font-size: 13px;
  font-weight: 600;
  color: $text-base;
  display: block;
}

.es-tl-elderly-room {
  font-size: 10px;
  color: $text-muted;
  display: block;
  margin-top: 2px;
}

.es-tl-event {
  flex: 1;
  min-width: 0;
}

.es-tl-event-head {
  display: flex;
  align-items: center;
  gap: 6px;

  i { font-size: 15px; }

  .es-tl-event-type { font-size: 14px; font-weight: 600; }
  .es-tl-event-time { margin-left: auto; font-size: 12px; color: $text-muted; }
}

.es-tl-event-cam {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 11px;
  color: $text-muted;

  i { font-size: 12px; }

  .es-tl-cam-loc {
    margin-left: 4px;
    color: $border-color-input;
  }
}

.es-tl-event-desc {
  margin: 6px 0 8px;
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.5;
}

.es-tl-event-snap {
  width: 100px;
  height: 66px;
  border-radius: 6px;
  overflow: hidden;
  background: #f0f0f0;
  flex-shrink: 0;

  img { width: 100%; height: 100%; object-fit: cover; }
}

/* 事件详情面板（右） */
.es-event-detail {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 14px 16px;
}

.es-ev-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 事件图片 + 播放按钮 */
.es-ev-snap {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  overflow: hidden;
  background: #f0f0f0;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.es-ev-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 52px;
  height: 52px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, transform 0.2s;

  i { font-size: 28px; }

  &:hover {
    background: rgba(0, 0, 0, 0.7);
    transform: translate(-50%, -50%) scale(1.1);
  }
}

/* 事件类型行 */
.es-ev-type-row {
  display: flex;
  align-items: center;
  gap: 6px;

  i { font-size: 18px; }
  .es-ev-type { font-size: 16px; font-weight: 600; }
  .es-ev-type-tag {
    font-size: 11px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 4px;
    margin-left: 4px;
  }
}

/* 字段行 */
.es-ev-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;

  i { font-size: 14px; color: $text-muted; }
  .es-ev-field-label { color: $text-tertiary; }
  .es-ev-field-value { color: $text-base; font-weight: 500; }
  .es-ev-field-sub { color: $text-muted; font-size: 12px; }
}

/* 老人信息 */
.es-ev-elderly {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 8px;
}

.es-ev-elderly-photo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 500;
  color: #fff;

  img { width: 100%; height: 100%; object-fit: cover; }
  &.女 { background: linear-gradient(135deg, #ff85c0, #eb2f96); }
  &.男 { background: linear-gradient(135deg, #69b1ff, #1677ff); }
}

.es-ev-elderly-name { font-size: 14px; font-weight: 600; color: $text-base; }
.es-ev-elderly-room { font-size: 12px; color: $text-muted; margin-top: 2px; }

/* 描述 */
.es-ev-desc-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.es-ev-section-title {
  font-size: 13px;
  font-weight: 600;
  color: $text-secondary;
}

.es-ev-desc {
  margin: 0;
  font-size: 13px;
  color: $text-base;
  line-height: 1.7;
}

/* 未选中态 */
.es-ev-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: $text-muted;

  i { font-size: 40px; opacity: 0.3; }
  p { font-size: 13px; margin: 0; }
}

.es-chart-empty.sm {
  height: 200px;
}

/* ===== 老人列表弹窗 ===== */
.el-dialog {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px;
}

.el-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: $text-base;

  i { font-size: 18px; color: $color-primary; }

  .el-count {
    font-style: normal;
    font-size: 13px;
    color: $color-primary;
    background: $color-primary-bg;
    padding: 1px 8px;
    border-radius: 10px;
  }
}

.el-grid {
  max-height: 400px;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.el-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid $border-color-card;
  border-radius: 8px;
}

.el-photo {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 500;
  color: #fff;

  img { width: 100%; height: 100%; object-fit: cover; }
  &.女 { background: linear-gradient(135deg, #ff85c0, #eb2f96); }
  &.男 { background: linear-gradient(135deg, #69b1ff, #1677ff); }
}

.el-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.el-name { font-size: 14px; font-weight: 600; color: $text-base; }
.el-room { font-size: 11px; color: $text-muted; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
