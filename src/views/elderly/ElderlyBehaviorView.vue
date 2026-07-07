<script setup lang="ts">
/**
 * 老人行为分析
 * 顶部：异常行为统计（类型分布 + 趋势）
 * 左侧：老人列表（可搜索筛选）
 * 右侧：选中老人的行为时间轴 + 详细信息
 */
import ECharts from '@/components/ECharts.vue'

// ===== 异常行为类型 =====
const behaviorTypes = [
  { key: 'fall', label: '跌倒', color: '#ff4d4f', icon: 'i-ant-design-alert-outlined', count: 8, trend: '+2' },
  { key: 'wander', label: '长时间徘徊', color: '#fa8c16', icon: 'i-ant-design-sync-outlined', count: 15, trend: '+5' },
  { key: 'not-return', label: '夜间未归寝', color: '#722ed1', icon: 'i-ant-design-home-outlined', count: 3, trend: '-1' },
  { key: 'exit', label: '离开安全区域', color: '#13c2c2', icon: 'i-ant-design-export-outlined', count: 6, trend: '+1' },
  { key: 'abnormal', label: '异常静止', color: '#8c8c8c', icon: 'i-ant-design-pause-circle-outlined', count: 4, trend: '0' }
]

// 近7日趋势数据
const trendOption = {
  tooltip: { trigger: 'axis' },
  legend: { data: ['跌倒', '徘徊', '未归寝', '越界'], bottom: 0, textStyle: { fontSize: 11 } },
  grid: { top: 20, left: 40, right: 20, bottom: 40 },
  xAxis: { type: 'category', data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'], axisLabel: { fontSize: 11 } },
  yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
  series: [
    { name: '跌倒', type: 'line', smooth: true, data: [2, 1, 3, 1, 2, 4, 3], itemStyle: { color: '#ff4d4f' } },
    { name: '徘徊', type: 'line', smooth: true, data: [3, 4, 2, 5, 3, 4, 2], itemStyle: { color: '#fa8c16' } },
    { name: '未归寝', type: 'line', smooth: true, data: [0, 1, 0, 1, 1, 0, 0], itemStyle: { color: '#722ed1' } },
    { name: '越界', type: 'line', smooth: true, data: [1, 0, 2, 1, 1, 0, 1], itemStyle: { color: '#13c2c2' } }
  ]
}

// 类型分布饼图
const pieOption = {
  tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
  legend: { bottom: 0, textStyle: { fontSize: 11 } },
  series: [{
    type: 'pie',
    radius: ['40%', '70%'],
    center: ['50%', '42%'],
    label: { show: false },
    data: behaviorTypes.map(t => ({ value: t.count, name: t.label, itemStyle: { color: t.color } }))
  }]
}

// ===== 老人列表 =====
interface ElderPerson {
  id: string
  name: string
  age: number
  gender: '男' | '女'
  room: string
  floor: string
  careLevel: '自理' | '半护' | '全护'
  alertCount: number
  lastAlert: string
  avatar?: string
}

const persons = ref<ElderPerson[]>([
  { id: 'p1', name: '张奶奶', age: 82, gender: '女', room: '302', floor: '3号楼2层', careLevel: '半护', alertCount: 3, lastAlert: '跌倒 - 2分钟前' },
  { id: 'p2', name: '李爷爷', age: 78, gender: '男', room: '305', floor: '3号楼2层', careLevel: '全护', alertCount: 2, lastAlert: '夜间未归寝 - 15分钟前' },
  { id: 'p3', name: '王奶奶', age: 85, gender: '女', room: '401', floor: '5号楼3层', careLevel: '全护', alertCount: 4, lastAlert: '长时间徘徊 - 45分钟前' },
  { id: 'p4', name: '赵爷爷', age: 76, gender: '男', room: '203', floor: '3号楼1层', careLevel: '自理', alertCount: 1, lastAlert: '离开安全区域 - 2小时前' },
  { id: 'p5', name: '刘奶奶', age: 80, gender: '女', room: '408', floor: '5号楼3层', careLevel: '半护', alertCount: 0, lastAlert: '无' },
  { id: 'p6', name: '陈爷爷', age: 79, gender: '男', room: '210', floor: '3号楼1层', careLevel: '半护', alertCount: 1, lastAlert: '异常静止 - 3小时前' },
  { id: 'p7', name: '孙奶奶', age: 88, gender: '女', room: '502', floor: '5号楼4层', careLevel: '全护', alertCount: 2, lastAlert: '跌倒 - 昨天' }
])

const searchKey = ref('')
const filteredPersons = computed(() => {
  if (!searchKey.value.trim()) return persons.value
  const k = searchKey.value.toLowerCase()
  return persons.value.filter(p => p.name.toLowerCase().includes(k) || p.room.includes(k))
})

// 选中老人
const selectedPersonId = ref<string>('p1')
const selectedPerson = computed(() => persons.value.find(p => p.id === selectedPersonId.value))

// 选中老人的行为时间轴
interface TimelineEvent {
  id: string
  time: string
  date: string
  type: string
  typeKey: string
  desc: string
  location: string
  level: 'urgent' | 'warning' | 'info'
  handled: boolean
}

const personTimelines: Record<string, TimelineEvent[]> = {
  p1: [
    { id: 't1', time: '14:32', date: '今天', type: '跌倒', typeKey: 'fall', desc: 'AI识别到老人在走廊跌倒，已躺地30秒', location: '3号楼-2层-走廊', level: 'urgent', handled: false },
    { id: 't2', time: '11:15', date: '今天', type: '长时间徘徊', typeKey: 'wander', desc: '在活动室区域徘徊超过20分钟', location: '3号楼-2层-活动室', level: 'warning', handled: true },
    { id: 't3', time: '09:48', date: '今天', type: '正常活动', typeKey: 'normal', desc: '正常前往餐厅就餐', location: '3号楼-1层-餐厅', level: 'info', handled: true },
    { id: 't4', time: '22:30', date: '昨天', type: '夜间未归寝', typeKey: 'not-return', desc: '就寝时间未返回寝室', location: '3号楼-2层-走廊', level: 'warning', handled: true },
    { id: 't5', time: '15:20', date: '昨天', type: '跌倒', typeKey: 'fall', desc: '卫生间跌倒，护工2分钟到达', location: '3号楼-2层-卫生间', level: 'urgent', handled: true },
    { id: 't6', time: '10:00', date: '昨天', type: '正常活动', typeKey: 'normal', desc: '参加晨间活动', location: '3号楼-1层-活动厅', level: 'info', handled: true }
  ],
  p2: [
    { id: 't1', time: '23:00', date: '今天', type: '夜间未归寝', typeKey: 'not-return', desc: '就寝时间未返回寝室', location: '3号楼-2层-305室', level: 'urgent', handled: false }
  ],
  p3: [
    { id: 't1', time: '14:00', date: '今天', type: '长时间徘徊', typeKey: 'wander', desc: '在5号楼2层楼道徘徊超过30分钟', location: '5号楼-2层-楼道', level: 'warning', handled: false }
  ]
}

const currentTimeline = computed(() => personTimelines[selectedPersonId.value] || [])

const levelColor = { urgent: '#ff4d4f', warning: '#fa8c16', info: '#1890ff' }
const careLevelColor = { '自理': '#52c41a', '半护': '#fa8c16', '全护': '#ff4d4f' }
</script>

<template>
  <div class="elderly-behavior">
    <!-- 顶部：统计 + 图表 -->
    <div class="behavior-stats">
      <!-- 异常行为类型卡片 -->
      <div class="type-cards">
        <div v-for="t in behaviorTypes" :key="t.key" class="type-card">
          <div class="type-icon" :style="{ background: t.color + '15', color: t.color }">
            <i :class="t.icon" />
          </div>
          <div class="type-info">
            <span class="type-count">{{ t.count }}</span>
            <span class="type-label">{{ t.label }}</span>
          </div>
          <span class="type-trend" :class="{ up: t.trend.startsWith('+'), down: t.trend.startsWith('-'), zero: t.trend === '0' }">
            {{ t.trend }}
          </span>
        </div>
      </div>

      <!-- 图表区 -->
      <div class="chart-row">
        <div class="chart-card">
          <div class="chart-title">异常行为趋势（近7日）</div>
          <ECharts :option="trendOption" class="chart" />
        </div>
        <div class="chart-card small">
          <div class="chart-title">行为类型分布</div>
          <ECharts :option="pieOption" class="chart" />
        </div>
      </div>
    </div>

    <!-- 主体：左老人列表 + 右时间轴 -->
    <div class="behavior-body">
      <!-- 左侧：老人列表 -->
      <div class="person-section">
        <div class="section-header">
          <span class="section-title">老人列表（{{ filteredPersons.length }}）</span>
        </div>
        <div class="person-search">
          <a-input v-model:value="searchKey" placeholder="搜索姓名或房间号" allow-clear>
            <template #prefix><i class="i-ant-design-search-outlined" /></template>
          </a-input>
        </div>
        <div class="person-list scroll-thin">
          <div
            v-for="p in filteredPersons"
            :key="p.id"
            class="person-card"
            :class="{ selected: selectedPersonId === p.id }"
            @click="selectedPersonId = p.id"
          >
            <div class="person-avatar" :class="p.gender">{{ p.name.charAt(0) }}</div>
            <div class="person-info">
              <div class="person-name-row">
                <span class="person-name">{{ p.name }}</span>
                <span class="person-age">{{ p.age }}岁</span>
              </div>
              <div class="person-meta">
                <span>{{ p.room }}室</span>
                <span class="care-tag" :style="{ color: careLevelColor[p.careLevel], background: careLevelColor[p.careLevel] + '15' }">{{ p.careLevel }}</span>
              </div>
              <div class="person-alert" :class="{ has: p.alertCount > 0 }">
                <i class="i-ant-design-alert-outlined" />
                <span>{{ p.lastAlert }}</span>
              </div>
            </div>
            <span v-if="p.alertCount > 0" class="alert-badge">{{ p.alertCount }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧：行为时间轴 -->
      <div class="timeline-section">
        <div class="section-header" v-if="selectedPerson">
          <div class="person-detail-header">
            <div class="detail-avatar" :class="selectedPerson.gender">{{ selectedPerson.name.charAt(0) }}</div>
            <div>
              <div class="detail-name">{{ selectedPerson.name }}（{{ selectedPerson.age }}岁）</div>
              <div class="detail-meta">
                <span>{{ selectedPerson.gender }}</span>
                <span>{{ selectedPerson.room }}室</span>
                <span>{{ selectedPerson.floor }}</span>
                <span class="care-tag" :style="{ color: careLevelColor[selectedPerson.careLevel], background: careLevelColor[selectedPerson.careLevel] + '15' }">{{ selectedPerson.careLevel }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="timeline-content scroll-thin">
          <div class="timeline">
            <div
              v-for="(ev, idx) in currentTimeline"
              :key="ev.id"
              class="timeline-item"
              :class="ev.level"
            >
              <div class="timeline-axis">
                <div class="axis-dot" :style="{ background: levelColor[ev.level] }" />
                <div v-if="idx < currentTimeline.length - 1" class="axis-line" />
              </div>
              <div class="timeline-card">
                <div class="timeline-card-header">
                  <span class="ev-type-tag" :style="{ background: levelColor[ev.level] + '15', color: levelColor[ev.level] }">{{ ev.type }}</span>
                  <span class="ev-time">{{ ev.date }} {{ ev.time }}</span>
                  <span v-if="ev.handled" class="ev-status handled">已处理</span>
                  <span v-else class="ev-status pending">待处理</span>
                </div>
                <p class="ev-desc">{{ ev.desc }}</p>
                <div class="ev-location"><i class="i-ant-design-environment-outlined" />{{ ev.location }}</div>
              </div>
            </div>
            <div v-if="currentTimeline.length === 0" class="timeline-empty">
              <i class="i-ant-design-calendar-outlined" />
              <p>该老人暂无行为记录</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.elderly-behavior {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
  overflow: hidden;
}

/* ===== 顶部统计 ===== */
.behavior-stats {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.type-cards {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
}

.type-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 10px;

  .type-icon {
    width: 38px; height: 38px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    i { font-size: 20px; }
  }
  .type-info { flex: 1; display: flex; flex-direction: column; }
  .type-count { font-size: 22px; font-weight: 700; color: $text-base; }
  .type-label { font-size: 11px; color: $text-tertiary; }

  .type-trend {
    font-size: 12px;
    font-weight: 600;
    &.up { color: #ff4d4f; }
    &.down { color: #52c41a; }
    &.zero { color: $text-muted; }
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

  &.small { flex: 0 0 320px; }

  .chart-title {
    font-size: 13px;
    font-weight: 600;
    color: $text-base;
    margin-bottom: 4px;
  }
  .chart { height: 200px; }
}

/* ===== 主体 ===== */
.behavior-body {
  flex: 1;
  display: flex;
  gap: 12px;
  min-height: 0;
}

/* 老人列表 */
.person-section {
  width: 320px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-header {
  padding: 12px 16px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  .section-title { font-size: 14px; font-weight: 600; color: $text-base; }
}

.person-search { padding: 10px 12px; border-bottom: 1px solid $border-color-card; }

.person-list { flex: 1; overflow-y: auto; padding: 8px; }

.person-card {
  display: flex;
  align-items: center;
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

.person-avatar {
  width: 40px; height: 40px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px;
  font-weight: 500;
  color: #fff;
  flex-shrink: 0;

  &.女 { background: linear-gradient(135deg, #ff85c0, #eb2f96); }
  &.男 { background: linear-gradient(135deg, #69b1ff, #1677ff); }
}

.person-info { flex: 1; min-width: 0; }
.person-name-row { display: flex; align-items: baseline; gap: 6px; margin-bottom: 2px; }
.person-name { font-size: 14px; font-weight: 500; color: $text-base; }
.person-age { font-size: 11px; color: $text-tertiary; }
.person-meta { display: flex; gap: 6px; align-items: center; font-size: 11px; color: $text-muted; margin-bottom: 2px; }

.care-tag { padding: 1px 6px; border-radius: 3px; font-size: 10px; }

.person-alert {
  display: flex; align-items: center; gap: 3px;
  font-size: 11px;
  color: $text-muted;

  &.has { color: #fa8c16; }
  i { font-size: 10px; }
}

.alert-badge {
  min-width: 18px; height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: #ff4d4f;
  color: #fff;
  font-size: 10px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}

/* 时间轴 */
.timeline-section {
  flex: 1;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.person-detail-header {
  display: flex;
  align-items: center;
  gap: 12px;

  .detail-avatar {
    width: 44px; height: 44px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 500; color: #fff;
    &.女 { background: linear-gradient(135deg, #ff85c0, #eb2f96); }
    &.男 { background: linear-gradient(135deg, #69b1ff, #1677ff); }
  }

  .detail-name { font-size: 16px; font-weight: 600; color: $text-base; }
  .detail-meta { display: flex; gap: 8px; font-size: 12px; color: $text-tertiary; margin-top: 2px; }
}

.timeline-content { flex: 1; overflow-y: auto; padding: 20px 24px; }

.timeline { position: relative; }

.timeline-item {
  display: flex;
  gap: 16px;
  margin-bottom: 4px;

  &:last-child { margin-bottom: 0; }
}

.timeline-axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 12px;
  flex-shrink: 0;

  .axis-dot {
    width: 10px; height: 10px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px currentColor;
    margin-top: 6px;
    flex-shrink: 0;
  }

  .axis-line {
    flex: 1;
    width: 2px;
    background: $border-color-card;
    margin: 2px 0;
  }
}

.timeline-card {
  flex: 1;
  padding: 10px 14px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  margin-bottom: 8px;
}

.timeline-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.ev-type-tag {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
}

.ev-time { font-size: 12px; color: $text-tertiary; }

.ev-status {
  margin-left: auto;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 3px;
  &.handled { background: #f6ffed; color: #52c41a; }
  &.pending { background: #fff7e6; color: #fa8c16; }
}

.ev-desc {
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.6;
  margin: 0 0 4px;
}

.ev-location {
  display: flex; align-items: center; gap: 3px;
  font-size: 11px; color: $text-muted;
  i { font-size: 11px; }
}

.timeline-empty {
  text-align: center;
  padding: 60px;
  color: $text-tertiary;
  i { font-size: 40px; opacity: 0.4; margin-bottom: 8px; }
  p { font-size: 13px; margin: 0; }
}
</style>
