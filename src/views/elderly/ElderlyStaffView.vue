<script setup lang="ts">
/**
 * 护工行为分析
 * 顶部：护工护理行为统计 + 趋势
 * 左侧：护工列表（含护理完成率、响应时长等指标）
 * 右侧：选中护工的护理行为时间轴
 */
import ECharts from '@/components/ECharts.vue'

// ===== 护理行为统计卡片 =====
const careStats = [
  { key: 'turn', label: '翻身护理', count: 156, target: 168, unit: '次', color: '#6e4bff', icon: 'i-ant-design-sync-outlined' },
  { key: 'medicine', label: '用药护理', count: 89, target: 92, unit: '次', color: '#52c41a', icon: 'i-ant-design-medicine-box-outlined' },
  { key: 'patrol', label: '巡房记录', count: 240, target: 240, unit: '次', color: '#1890ff', icon: 'i-ant-design-eye-outlined' },
  { key: 'meal', label: '餐饮辅助', count: 78, target: 84, unit: '次', color: '#fa8c16', icon: 'i-ant-design-coffee-outlined' },
  { key: 'response', label: '呼叫响应', count: 32, target: 35, unit: '次', color: '#ff4d4f', icon: 'i-ant-design-bell-outlined' }
]

// 完成率
function completionRate(s: { count: number; target: number }): number {
  if (s.target === 0) return 100
  return Math.round((s.count / s.target) * 100)
}

// 趋势图
const trendOption = {
  tooltip: { trigger: 'axis' },
  legend: { data: ['翻身', '用药', '巡房', '响应'], bottom: 0, textStyle: { fontSize: 11 } },
  grid: { top: 20, left: 40, right: 20, bottom: 40 },
  xAxis: { type: 'category', data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'], axisLabel: { fontSize: 11 } },
  yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
  series: [
    { name: '翻身', type: 'line', smooth: true, areaStyle: { opacity: 0.1 }, data: [10, 8, 22, 25, 30, 35, 26], itemStyle: { color: '#6e4bff' } },
    { name: '用药', type: 'line', smooth: true, areaStyle: { opacity: 0.1 }, data: [5, 3, 18, 22, 15, 18, 8], itemStyle: { color: '#52c41a' } },
    { name: '巡房', type: 'line', smooth: true, areaStyle: { opacity: 0.1 }, data: [30, 30, 35, 40, 38, 35, 32], itemStyle: { color: '#1890ff' } },
    { name: '响应', type: 'line', smooth: true, areaStyle: { opacity: 0.1 }, data: [2, 1, 8, 6, 5, 7, 3], itemStyle: { color: '#ff4d4f' } }
  ]
}

// 平均响应时长柱状图
const responseOption = {
  tooltip: { trigger: 'axis', formatter: '{b}<br/>平均响应：{c} 秒' },
  grid: { top: 20, left: 40, right: 20, bottom: 30 },
  xAxis: { type: 'category', data: ['白班(8-16)', '晚班(16-24)', '夜班(0-8)'], axisLabel: { fontSize: 11 } },
  yAxis: { type: 'value', name: '秒', axisLabel: { fontSize: 11 } },
  series: [{
    type: 'bar',
    data: [
      { value: 95, itemStyle: { color: '#52c41a' } },
      { value: 120, itemStyle: { color: '#fa8c16' } },
      { value: 180, itemStyle: { color: '#ff4d4f' } }
    ],
    barWidth: 30,
    label: { show: true, position: 'top', formatter: '{c}s', fontSize: 11 }
  }]
}

// ===== 护工列表 =====
interface Staff {
  id: string
  name: string
  gender: '男' | '女'
  shift: '白班' | '晚班' | '夜班'
  careCount: number  // 今日护理次数
  completionRate: number  // 完成率
  avgResponse: number  // 平均响应（秒）
  rating: number  // 评分
  responsible: string  // 负责区域
}

const staffs = ref<Staff[]>([
  { id: 's1', name: '李护理', gender: '女', shift: '白班', careCount: 28, completionRate: 100, avgResponse: 85, rating: 4.8, responsible: '3号楼2层（10位老人）' },
  { id: 's2', name: '王护理', gender: '女', shift: '白班', careCount: 25, completionRate: 96, avgResponse: 110, rating: 4.5, responsible: '5号楼3层（8位老人）' },
  { id: 's3', name: '张护理', gender: '男', shift: '晚班', careCount: 22, completionRate: 92, avgResponse: 130, rating: 4.3, responsible: '3号楼1层（12位老人）' },
  { id: 's4', name: '赵护理', gender: '女', shift: '晚班', careCount: 20, completionRate: 88, avgResponse: 145, rating: 4.1, responsible: '5号楼4层（6位老人）' },
  { id: 's5', name: '陈护理', gender: '男', shift: '夜班', careCount: 15, completionRate: 95, avgResponse: 175, rating: 4.0, responsible: '3号楼（夜班巡查）' },
  { id: 's6', name: '刘护理', gender: '女', shift: '夜班', careCount: 18, completionRate: 100, avgResponse: 160, rating: 4.6, responsible: '5号楼（夜班巡查）' }
])

const selectedStaffId = ref<string>('s1')
const selectedStaff = computed(() => staffs.value.find(s => s.id === selectedStaffId.value))

// 排序
const sortBy = ref<'careCount' | 'completionRate' | 'avgResponse' | 'rating'>('careCount')
const sortedStaffs = computed(() => {
  const arr = [...staffs.value]
  if (sortBy.value === 'avgResponse') {
    arr.sort((a, b) => a.avgResponse - b.avgResponse)  // 响应时长升序（短的优先）
  } else {
    arr.sort((a, b) => b[sortBy.value] - a[sortBy.value])  // 其他降序
  }
  return arr
})

// 护工行为时间轴
interface CareEvent {
  id: string
  time: string
  type: string
  typeKey: string
  target: string  // 护理对象
  desc: string
  duration?: string
  status: 'completed' | 'missed' | 'late'
}

const staffTimelines: Record<string, CareEvent[]> = {
  s1: [
    { id: 'e1', time: '14:30', type: '翻身护理', typeKey: 'turn', target: '张奶奶（302室）', desc: '协助老人翻身，调整舒适体位', duration: '3分钟', status: 'completed' },
    { id: 'e2', time: '14:00', type: '用药护理', typeKey: 'medicine', target: '李爷爷（305室）', desc: '按时服药 - 降压药 1片', duration: '2分钟', status: 'completed' },
    { id: 'e3', time: '13:30', type: '巡房', typeKey: 'patrol', target: '3号楼2层', desc: '常规巡房，所有老人状态正常', duration: '15分钟', status: 'completed' },
    { id: 'e4', time: '13:00', type: '餐饮辅助', typeKey: 'meal', target: '王奶奶（401室）', desc: '协助老人午餐，完成进食', duration: '25分钟', status: 'completed' },
    { id: 'e5', time: '12:30', type: '呼叫响应', typeKey: 'response', target: '赵爷爷（203室）', desc: '老人呼叫，响应并解决问题', duration: '90秒', status: 'completed' },
    { id: 'e6', time: '12:00', type: '用药护理', typeKey: 'medicine', target: '张奶奶（302室）', desc: '按时服药 - 降糖药 1片', duration: '2分钟', status: 'completed' },
    { id: 'e7', time: '11:30', type: '翻身护理', typeKey: 'turn', target: '李爷爷（305室）', desc: '协助老人翻身', duration: '3分钟', status: 'completed' },
    { id: 'e8', time: '10:00', type: '巡房', typeKey: 'patrol', target: '3号楼2层', desc: '晨间巡房', duration: '20分钟', status: 'completed' }
  ],
  s2: [
    { id: 'e1', time: '14:00', type: '巡房', typeKey: 'patrol', target: '5号楼3层', desc: '常规巡房', duration: '15分钟', status: 'completed' }
  ],
  s5: [
    { id: 'e1', time: '02:00', type: '巡房', typeKey: 'patrol', target: '3号楼', desc: '夜间巡房（每2小时一次）', duration: '30分钟', status: 'completed' },
    { id: 'e2', time: '00:00', type: '翻身护理', typeKey: 'turn', target: '多位老人', desc: '夜间翻身护理（按计划）', duration: '40分钟', status: 'completed' }
  ]
}

const currentTimeline = computed(() => staffTimelines[selectedStaffId.value] || [])

const statusColor = { completed: '#52c41a', missed: '#ff4d4f', late: '#fa8c16' }
const statusText = { completed: '已完成', missed: '漏做', late: '超时' }
const typeColor: Record<string, string> = {
  turn: '#6e4bff',
  medicine: '#52c41a',
  patrol: '#1890ff',
  meal: '#fa8c16',
  response: '#ff4d4f'
}
</script>

<template>
  <div class="elderly-staff">
    <!-- 顶部：护理统计 -->
    <div class="staff-stats">
      <div class="care-cards">
        <div v-for="s in careStats" :key="s.key" class="care-card">
          <div class="care-icon" :style="{ background: s.color + '15', color: s.color }">
            <i :class="s.icon" />
          </div>
          <div class="care-info">
            <div class="care-numbers">
              <span class="care-count">{{ s.count }}</span>
              <span class="care-target">/ {{ s.target }}{{ s.unit }}</span>
            </div>
            <span class="care-label">{{ s.label }}</span>
          </div>
          <div class="care-progress">
            <div class="progress-ring" :style="{ '--p': completionRate(s) + '%', color: s.color }">
              <span>{{ completionRate(s) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 图表 -->
      <div class="chart-row">
        <div class="chart-card">
          <div class="chart-title">护理行为趋势（24小时）</div>
          <ECharts :option="trendOption" class="chart" />
        </div>
        <div class="chart-card small">
          <div class="chart-title">各班次平均响应时长</div>
          <ECharts :option="responseOption" class="chart" />
        </div>
      </div>
    </div>

    <!-- 主体：左护工列表 + 右时间轴 -->
    <div class="staff-body">
      <!-- 左：护工列表 -->
      <div class="staff-section">
        <div class="section-header">
          <span class="section-title">护工列表（{{ sortedStaffs.length }}）</span>
          <select v-model="sortBy" class="sort-select">
            <option value="careCount">按护理次数</option>
            <option value="completionRate">按完成率</option>
            <option value="avgResponse">按响应速度</option>
            <option value="rating">按评分</option>
          </select>
        </div>
        <div class="staff-list scroll-thin">
          <div
            v-for="s in sortedStaffs"
            :key="s.id"
            class="staff-card"
            :class="{ selected: selectedStaffId === s.id }"
            @click="selectedStaffId = s.id"
          >
            <div class="staff-avatar" :class="s.gender">{{ s.name.charAt(0) }}</div>
            <div class="staff-info">
              <div class="staff-name-row">
                <span class="staff-name">{{ s.name }}</span>
                <span class="shift-tag" :class="s.shift">{{ s.shift }}</span>
              </div>
              <div class="staff-meta">{{ s.responsible }}</div>
              <div class="staff-metrics">
                <span class="metric">
                  <span class="metric-label">护理</span>
                  <span class="metric-val">{{ s.careCount }}次</span>
                </span>
                <span class="metric">
                  <span class="metric-label">完成率</span>
                  <span class="metric-val" :class="{ good: s.completionRate >= 95, warn: s.completionRate < 90 }">{{ s.completionRate }}%</span>
                </span>
                <span class="metric">
                  <span class="metric-label">响应</span>
                  <span class="metric-val" :class="{ good: s.avgResponse <= 120, warn: s.avgResponse > 150 }">{{ s.avgResponse }}s</span>
                </span>
                <span class="metric rating">
                  <i class="i-ant-design-star-filled" />
                  <span class="metric-val">{{ s.rating }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右：护理行为时间轴 -->
      <div class="care-section">
        <div class="section-header" v-if="selectedStaff">
          <div class="staff-detail-header">
            <div class="detail-avatar" :class="selectedStaff.gender">{{ selectedStaff.name.charAt(0) }}</div>
            <div>
              <div class="detail-name">{{ selectedStaff.name }} - {{ selectedStaff.shift }}</div>
              <div class="detail-meta">
                <span>{{ selectedStaff.responsible }}</span>
              </div>
            </div>
            <div class="detail-summary">
              <div class="summary-item">
                <span class="sum-val">{{ selectedStaff.careCount }}</span>
                <span class="sum-label">今日护理</span>
              </div>
              <div class="summary-item">
                <span class="sum-val" :class="{ good: selectedStaff.completionRate >= 95 }">{{ selectedStaff.completionRate }}%</span>
                <span class="sum-label">完成率</span>
              </div>
              <div class="summary-item">
                <span class="sum-val">{{ selectedStaff.avgResponse }}s</span>
                <span class="sum-label">平均响应</span>
              </div>
            </div>
          </div>
        </div>
        <div class="care-content scroll-thin">
          <div class="care-timeline">
            <div v-for="(ev, idx) in currentTimeline" :key="ev.id" class="care-tl-item">
              <div class="care-tl-axis">
                <div class="tl-dot" :style="{ background: typeColor[ev.typeKey] || '#6e4bff' }" />
                <div v-if="idx < currentTimeline.length - 1" class="tl-line" />
              </div>
              <div class="care-tl-card">
                <div class="care-tl-header">
                  <span class="ev-type" :style="{ background: (typeColor[ev.typeKey] || '#6e4bff') + '15', color: typeColor[ev.typeKey] || '#6e4bff' }">{{ ev.type }}</span>
                  <span class="ev-time">{{ ev.time }}</span>
                  <span v-if="ev.duration" class="ev-duration">{{ ev.duration }}</span>
                  <span class="ev-status" :style="{ background: statusColor[ev.status] + '15', color: statusColor[ev.status] }">{{ statusText[ev.status] }}</span>
                </div>
                <p class="ev-target"><i class="i-ant-design-user-outlined" />{{ ev.target }}</p>
                <p class="ev-desc">{{ ev.desc }}</p>
              </div>
            </div>
            <div v-if="currentTimeline.length === 0" class="care-empty">
              <i class="i-ant-design-schedule-outlined" />
              <p>该护工今日暂无护理记录</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.elderly-staff {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
  overflow: hidden;
}

/* ===== 顶部统计 ===== */
.staff-stats {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.care-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.care-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 10px;

  .care-icon {
    width: 38px; height: 38px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    i { font-size: 20px; }
  }
  .care-info { flex: 1; }
  .care-numbers { display: flex; align-items: baseline; gap: 3px; }
  .care-count { font-size: 20px; font-weight: 700; color: $text-base; }
  .care-target { font-size: 11px; color: $text-muted; }
  .care-label { font-size: 11px; color: $text-tertiary; }
}

.care-progress {
  .progress-ring {
    width: 44px; height: 44px;
    border-radius: 50%;
    background: conic-gradient(currentColor var(--p), #f0f0f0 0);
    display: flex; align-items: center; justify-content: center;
    position: relative;

    &::before {
      content: '';
      position: absolute;
      inset: 4px;
      border-radius: 50%;
      background: #fff;
    }

    span {
      position: relative;
      font-size: 10px;
      font-weight: 600;
      color: $text-base;
    }
  }
}

.chart-row {
  display: flex;
  gap: 12px;
}

.chart-card {
  flex: 1;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;

  &.small { flex: 0 0 340px; }

  .chart-title { font-size: 13px; font-weight: 600; color: $text-base; margin-bottom: 4px; }
  .chart { height: 200px; }
}

/* ===== 主体 ===== */
.staff-body {
  flex: 1;
  display: flex;
  gap: 12px;
  min-height: 0;
}

/* 护工列表 */
.staff-section {
  width: 380px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  .section-title { font-size: 14px; font-weight: 600; color: $text-base; }
}

.sort-select {
  height: 26px;
  padding: 0 8px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  font-size: 12px;
  color: $text-secondary;
  background: #fff;
  cursor: pointer;
  outline: none;
}

.staff-list { flex: 1; overflow-y: auto; padding: 8px; }

.staff-card {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 4px;
  border: 1px solid transparent;
  transition: all 0.15s;

  &:hover { background: $bg-hover; }
  &.selected { background: $color-primary-bg; border-color: $color-primary; }
}

.staff-avatar {
  width: 38px; height: 38px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 500; color: #fff;
  flex-shrink: 0;

  &.女 { background: linear-gradient(135deg, #ff85c0, #eb2f96); }
  &.男 { background: linear-gradient(135deg, #69b1ff, #1677ff); }
}

.staff-info { flex: 1; min-width: 0; }
.staff-name-row { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.staff-name { font-size: 14px; font-weight: 500; color: $text-base; }

.shift-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  &.白班 { background: #fff7e6; color: #fa8c16; }
  &.晚班 { background: #f9f0ff; color: #722ed1; }
  &.夜班 { background: #f0f5ff; color: #2f54eb; }
}

.staff-meta { font-size: 11px; color: $text-muted; margin-bottom: 4px; }

.staff-metrics {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  .metric {
    display: flex;
    flex-direction: column;
    gap: 0;

    .metric-label { font-size: 9px; color: $text-muted; }
    .metric-val {
      font-size: 12px;
      font-weight: 600;
      color: $text-base;
      &.good { color: #52c41a; }
      &.warn { color: #ff4d4f; }
    }

    &.rating {
      flex-direction: row;
      align-items: center;
      gap: 2px;
      i { font-size: 11px; color: #faad14; }
      .metric-val { color: #faad14; font-size: 11px; }
    }
  }
}

/* 时间轴 */
.care-section {
  flex: 1;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.staff-detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;

  .detail-avatar {
    width: 44px; height: 44px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 500; color: #fff;
    &.女 { background: linear-gradient(135deg, #ff85c0, #eb2f96); }
    &.男 { background: linear-gradient(135deg, #69b1ff, #1677ff); }
  }

  .detail-name { font-size: 16px; font-weight: 600; color: $text-base; }
  .detail-meta { font-size: 12px; color: $text-tertiary; margin-top: 2px; }

  .detail-summary {
    margin-left: auto;
    display: flex;
    gap: 24px;

    .summary-item {
      display: flex;
      flex-direction: column;
      align-items: center;

      .sum-val {
        font-size: 18px;
        font-weight: 700;
        color: $text-base;
        &.good { color: #52c41a; }
      }
      .sum-label { font-size: 11px; color: $text-tertiary; }
    }
  }
}

.care-content { flex: 1; overflow-y: auto; padding: 20px 24px; }

.care-tl-item {
  display: flex;
  gap: 16px;
  margin-bottom: 4px;
  &:last-child { margin-bottom: 0; }
}

.care-tl-axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 12px;
  flex-shrink: 0;

  .tl-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px rgba(0,0,0,0.06);
    margin-top: 6px;
    flex-shrink: 0;
  }

  .tl-line {
    flex: 1;
    width: 2px;
    background: $border-color-card;
    margin: 2px 0;
  }
}

.care-tl-card {
  flex: 1;
  padding: 10px 14px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  margin-bottom: 8px;
}

.care-tl-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.ev-type {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.ev-time { font-size: 12px; color: $text-tertiary; }
.ev-duration { font-size: 11px; color: $text-muted; }
.ev-status { margin-left: auto; font-size: 10px; padding: 1px 6px; border-radius: 3px; font-weight: 500; }

.ev-target {
  display: flex; align-items: center; gap: 4px;
  font-size: 13px;
  color: $text-base;
  font-weight: 500;
  margin: 0 0 2px;
  i { font-size: 11px; color: $text-muted; }
}

.ev-desc {
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.5;
  margin: 0;
}

.care-empty {
  text-align: center;
  padding: 60px;
  color: $text-tertiary;
  i { font-size: 40px; opacity: 0.4; margin-bottom: 8px; }
  p { font-size: 13px; margin: 0; }
}
</style>
