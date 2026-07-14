<script setup lang="ts">
/**
 * 人员总览分析
 * 左侧：工地列表（省市区树）
 * 右侧：6个指标卡片 + 4个图表(2×2) + 待办事项列表
 */
import { ref, computed } from 'vue'
import ECharts from '@/components/ECharts.vue'
import {
  constructionSites,
  regionTree,
  formatArea,
  sizeTypeMeta,
  type ConstructionSite,
  type RegionNode
} from './posture.mock'
import {
  buildOverviewMetrics,
  buildOverviewAccessTrend,
  buildOverviewViolationPie,
  buildOverviewRoleBar,
  buildOverviewCertPie,
  buildTodoDetails,
  buildPresentWorkers,
  buildCalendarData
} from './person-overview.mock'

// ===== 左侧工地树 =====
const searchKeyword = ref('')
const filteredSites = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return constructionSites
  return constructionSites.filter(s => s.name.toLowerCase().includes(kw) || s.address.toLowerCase().includes(kw))
})
const searching = computed(() => searchKeyword.value.trim().length > 0)
const expandedKeys = ref<Set<string>>(new Set(['330000', '330100']))
function toggleExpand(node: RegionNode) {
  if (expandedKeys.value.has(node.code)) expandedKeys.value.delete(node.code)
  else expandedKeys.value.add(node.code)
}
function isExpanded(node: RegionNode): boolean {
  if (searching.value) return true
  return expandedKeys.value.has(node.code)
}
function siteCount(node: RegionNode): number {
  if (node.sites) return node.sites.length
  if (node.children) return node.children.reduce((s, c) => s + siteCount(c), 0)
  return 0
}
function filteredSiteCount(node: RegionNode): number {
  if (!searching.value) return siteCount(node)
  const sites = node.sites || collectSites(node)
  return sites.filter(s => filteredSites.value.some(fs => fs.id === s.id)).length
}
function collectSites(node: RegionNode): ConstructionSite[] {
  const result: ConstructionSite[] = []
  if (node.sites) result.push(...node.sites)
  if (node.children) node.children.forEach(c => result.push(...collectSites(c)))
  return result
}
function isSiteVisible(site: ConstructionSite): boolean {
  return filteredSites.value.some(s => s.id === site.id)
}
const selectedNode = ref<{ type: 'site' | 'region'; id: string } | null>(null)
function selectSite(site: ConstructionSite) { selectedNode.value = { type: 'site', id: site.id } }

const selectedSiteIds = computed<Set<string>>(() => {
  if (!selectedNode.value) return new Set(constructionSites.map(s => s.id))
  if (selectedNode.value.type === 'site') return new Set([selectedNode.value.id])
  const result = new Set<string>()
  function findAndCollect(nodes: RegionNode[], code: string): boolean {
    for (const n of nodes) {
      if (n.code === code) { collectSites(n).forEach(s => result.add(s.id)); return true }
      if (n.children && findAndCollect(n.children, code)) return true
    }
    return false
  }
  findAndCollect(regionTree, selectedNode.value.id)
  return result
})

// ===== 聚合数据 =====
const metrics = computed(() => buildOverviewMetrics(selectedSiteIds.value))
const todoDetails = computed(() => buildTodoDetails(selectedSiteIds.value).slice(0, 5))
const presentWorkers = computed(() => buildPresentWorkers(selectedSiteIds.value).slice(0, 12))

// 待办 tab
const todoTab = ref<'all' | 'violation' | 'event' | 'cert'>('all')
const todoFiltered = computed(() => {
  if (todoTab.value === 'all') return todoDetails.value
  return todoDetails.value.filter(t => t.category === todoTab.value)
})
const todoTabs = [
  { key: 'all' as const, label: '全部' },
  { key: 'violation' as const, label: '违章' },
  { key: 'event' as const, label: '安全事件' },
  { key: 'cert' as const, label: '证件' }
]
function todoTabCount(cat: string): number {
  if (cat === 'all') return todoDetails.value.length
  return todoDetails.value.filter(t => t.category === cat).length
}

// ===== 日历 =====
const calYear = ref(2026)
const calMonth = ref(7)
const calendarData = computed(() => buildCalendarData(calYear.value, calMonth.value))
const weekDays = ['一', '二', '三', '四', '五', '六', '日']

// 日历网格（前置空格补齐星期）
const calendarGrid = computed(() => {
  const firstDay = new Date(calYear.value, calMonth.value - 1, 1)
  let firstDayOfWeek = firstDay.getDay() // 0=周日
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1 // 转为周一=0
  const blanks = Array(firstDayOfWeek).fill(null)
  return [...blanks, ...calendarData.value]
})

function calPrevMonth() {
  if (calMonth.value === 1) { calMonth.value = 12; calYear.value-- }
  else calMonth.value--
}
function calNextMonth() {
  if (calMonth.value === 12) { calMonth.value = 1; calYear.value++ }
  else calMonth.value++
}

// ===== 图表 option =====
const accessTrendOption = computed(() => {
  const trend = buildOverviewAccessTrend(selectedSiteIds.value)
  return {
    tooltip: { trigger: 'axis' },
    legend: { top: 0, right: 0, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 11, color: '#8895ab' } },
    grid: { left: 30, right: 12, top: 32, bottom: 24 },
    xAxis: { type: 'category', data: trend.days, axisLine: { lineStyle: { color: '#e8e8e8' } }, axisTick: { show: false }, axisLabel: { fontSize: 10, color: '#9aa1ab' } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#f0f0f0' } }, axisLabel: { fontSize: 10, color: '#9aa1ab' } },
    series: [
      { name: '进场', type: 'line', data: trend.inCounts, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: '#2bb3a3' }, itemStyle: { color: '#2bb3a3' } },
      { name: '出场', type: 'line', data: trend.outCounts, smooth: true, symbol: 'circle', symbolSize: 4, lineStyle: { width: 2, color: '#fa8c16' }, itemStyle: { color: '#fa8c16' } }
    ]
  }
})

const violationPieOption = computed(() => {
  const data = buildOverviewViolationPie(selectedSiteIds.value)
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { type: 'scroll', bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10, color: '#8895ab' } },
    series: [{
      type: 'pie', radius: ['38%', '62%'], center: ['50%', '42%'],
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
      data
    }]
  }
})

const roleBarOption = computed(() => {
  const bar = buildOverviewRoleBar(selectedSiteIds.value)
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 12, top: 16, bottom: 24 },
    xAxis: { type: 'category', data: bar.roles, axisLine: { lineStyle: { color: '#e8e8e8' } }, axisTick: { show: false }, axisLabel: { fontSize: 10, color: '#9aa1ab', rotate: bar.roles.length > 6 ? 25 : 0 } },
    yAxis: { type: 'value', minInterval: 1, splitLine: { lineStyle: { color: '#f0f0f0' } }, axisLabel: { fontSize: 10, color: '#9aa1ab' } },
    series: [{
      type: 'bar', data: bar.counts, barMaxWidth: 24,
      itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#7d5cff' }, { offset: 1, color: '#6e4bff' }] }, borderRadius: [4, 4, 0, 0] }
    }]
  }
})

const certPieOption = computed(() => {
  const data = buildOverviewCertPie(selectedSiteIds.value)
  return {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0, left: 'center', itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 10, color: '#8895ab' } },
    series: [{
      type: 'pie', radius: ['38%', '62%'], center: ['50%', '42%'],
      itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
      label: { show: false },
      emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' } },
      data
    }]
  }
})
</script>

<template>
  <div class="po-page">
    <!-- ===== 左侧工地列表 ===== -->
    <aside class="left-panel">
      <div class="list-section">
        <div class="left-header">
          <span class="left-header__title">工地列表</span>
        </div>
        <div class="left-search">
          <i class="i-ant-design-search-outlined left-search__icon" />
          <input v-model="searchKeyword" class="left-search__input" placeholder="搜索工地名称或地址" />
          <i v-if="searchKeyword" class="i-ant-design-close-circle-filled left-search__clear" @click="searchKeyword = ''" />
        </div>
        <div class="site-tree scroll-thin">
          <div class="tree-node tree-all" :class="{ 'is-selected': !selectedNode }" @click="selectedNode = null">
            <i class="i-ant-design-appstore-outlined tree-icon" />
            <span class="tree-label">全部工地</span>
            <span class="tree-count">{{ constructionSites.length }}</span>
          </div>
          <template v-for="province in regionTree" :key="province.code">
            <div class="tree-node tree-province" @click="toggleExpand(province)">
              <i class="tree-arrow" :class="isExpanded(province) ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'" />
              <i class="i-ant-design-bank-outlined tree-icon" />
              <span class="tree-label">{{ province.label }}</span>
              <span class="tree-count">{{ filteredSiteCount(province) }}</span>
            </div>
            <template v-if="isExpanded(province) && province.children">
              <template v-for="city in province.children" :key="city.code">
                <div class="tree-node tree-city" :style="{ paddingLeft: '24px' }" @click="toggleExpand(city)">
                  <i class="tree-arrow" :class="isExpanded(city) ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'" />
                  <i class="i-ant-design-home-outlined tree-icon" />
                  <span class="tree-label">{{ city.label }}</span>
                  <span class="tree-count">{{ filteredSiteCount(city) }}</span>
                </div>
                <template v-if="isExpanded(city) && city.children">
                  <template v-for="district in city.children" :key="district.code">
                    <div class="tree-node tree-district" :style="{ paddingLeft: '48px' }" @click="toggleExpand(district)">
                      <i class="tree-arrow" :class="isExpanded(district) ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'" />
                      <i class="i-ant-design-environment-outlined tree-icon" />
                      <span class="tree-label">{{ district.label }}</span>
                      <span class="tree-count">{{ filteredSiteCount(district) }}</span>
                    </div>
                    <template v-if="isExpanded(district) && district.sites">
                      <article
                        v-for="site in district.sites.filter(s => isSiteVisible(s))"
                        :key="site.id"
                        class="site-card"
                        :class="{ 'is-selected': selectedNode?.type === 'site' && selectedNode.id === site.id }"
                        @click="selectSite(site)"
                      >
                        <div class="site-card__body">
                          <div class="site-card__head">
                            <span class="site-card__name" :title="site.name">{{ site.name }}</span>
                            <span class="site-card__area">{{ formatArea(site.area) }}</span>
                          </div>
                          <div class="site-card__type">
                            <span :style="{ color: sizeTypeMeta[site.sizeType].color }">{{ sizeTypeMeta[site.sizeType].label }}</span>
                          </div>
                        </div>
                      </article>
                    </template>
                  </template>
                </template>
              </template>
            </template>
          </template>
        </div>
      </div>
    </aside>

    <!-- ===== 右侧 ===== -->
    <main class="right-panel">
      <!-- 指标卡片 -->
      <div class="metric-grid">
        <div class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" style="background:#2bb3a3"><i class="i-ant-design-team-outlined" /></span>
            <span class="metric-title">当前在场</span>
          </div>
          <span class="metric-value" style="color:#2bb3a3">{{ metrics.present }}</span>
        </div>
        <div class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" style="background:#ff4d4f"><i class="i-ant-design-alert-outlined" /></span>
            <span class="metric-title">今日违章</span>
          </div>
          <span class="metric-value" style="color:#ff4d4f">{{ metrics.todayViolations }}</span>
        </div>
        <div class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" style="background:#fa541c"><i class="i-ant-design-warning-outlined" /></span>
            <span class="metric-title">安全事件(月)</span>
          </div>
          <span class="metric-value" style="color:#fa541c">{{ metrics.monthEvents }}</span>
        </div>
        <div class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" style="background:#6e4bff"><i class="i-ant-design-safety-certificate-outlined" /></span>
            <span class="metric-title">持证人数</span>
          </div>
          <span class="metric-value" style="color:#6e4bff">{{ metrics.certifiedPersons }}</span>
        </div>
        <div class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" style="background:#faad14"><i class="i-ant-design-clock-circle-outlined" /></span>
            <span class="metric-title">证件即将过期</span>
          </div>
          <span class="metric-value" style="color:#faad14">{{ metrics.expiringCerts }}</span>
        </div>
        <div class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" style="background:#fa8c16"><i class="i-ant-design-pause-circle-outlined" /></span>
            <span class="metric-title">待处理事项</span>
          </div>
          <span class="metric-value" style="color:#fa8c16">{{ metrics.totalPending }}</span>
        </div>
      </div>

      <!-- 在场人员 -->
      <div class="present-card">
        <div class="present-card__head">
          <strong><i class="i-ant-design-team-outlined" /> 在场人员</strong>
          <span class="present-card__count">{{ presentWorkers.length }} 人在场</span>
        </div>
        <div class="present-list scroll-thin">
          <div v-for="w in presentWorkers" :key="w.id" class="present-chip">
            <img :src="w.avatar" class="present-chip__avatar" :alt="w.name" />
            <div class="present-chip__info">
              <span class="present-chip__name">{{ w.name }}</span>
              <span class="present-chip__role">{{ w.role }}</span>
            </div>
            <span class="present-chip__time">{{ w.enterTime }}</span>
          </div>
          <div v-if="presentWorkers.length === 0" class="present-empty">今日暂无在场人员</div>
        </div>
      </div>

      <!-- 待办事项 + 日历 -->
      <div class="todo-cal-row">
        <!-- 左：待办事项 -->
        <div class="todo-card">
          <div class="todo-card__head">
            <strong><i class="i-ant-design-bell-outlined" /> 待办事项</strong>
            <span class="todo-card__count">{{ todoDetails.length }} 条</span>
          </div>
          <div class="todo-tabs">
            <button
              v-for="t in todoTabs"
              :key="t.key"
              class="todo-tab"
              :class="{ active: todoTab === t.key }"
              @click="todoTab = t.key"
            >{{ t.label }} <span class="todo-tab__num">{{ todoTabCount(t.key) }}</span></button>
          </div>
          <div class="todo-table scroll-thin">
            <div v-for="item in todoFiltered" :key="item.id" class="todo-row">
              <img :src="item.personAvatar" class="todo-row__avatar" :alt="item.personName" />
              <span class="todo-row__name">{{ item.personName }}</span>
              <span class="todo-row__title" :title="item.title">{{ item.title }}</span>
              <span class="todo-row__site">{{ item.siteName }}</span>
              <span class="todo-row__time">{{ item.time }}</span>
              <span class="todo-row__status" :style="{ color: item.statusColor, background: item.statusColor + '18' }">{{ item.statusLabel }}</span>
            </div>
            <div v-if="todoFiltered.length === 0" class="todo-table-empty">
              <i class="i-ant-design-check-circle-outlined" />
              <span>暂无待办事项</span>
            </div>
          </div>
        </div>

        <!-- 右：日历 -->
        <div class="cal-card">
          <div class="cal-card__head">
            <strong><i class="i-ant-design-calendar-outlined" /> 在场人员日历</strong>
            <div class="cal-month-nav">
              <button class="cal-nav-btn" @click="calPrevMonth"><i class="i-ant-design-left-outlined" /></button>
              <span class="cal-month-label">{{ calYear }}年{{ calMonth }}月</span>
              <button class="cal-nav-btn" @click="calNextMonth"><i class="i-ant-design-right-outlined" /></button>
            </div>
          </div>
          <!-- 星期表头 -->
          <div class="cal-weekdays">
            <span v-for="w in weekDays" :key="w" class="cal-weekday">{{ w }}</span>
          </div>
          <!-- 日历格子 -->
          <div class="cal-grid">
            <template v-for="(cell, i) in calendarGrid" :key="i">
              <div v-if="!cell" class="cal-cell cal-cell--blank" />
              <div v-else class="cal-cell" :class="{ 'cal-cell--today': cell.date === '2026-07-13' }">
                <span class="cal-cell__day">{{ cell.day }}</span>
                <template v-if="cell.total > 0">
                  <div class="cal-cell__bars">
                    <span v-if="cell.construction" class="cal-bar cal-bar--construction" :title="`建设单位 ${cell.construction}`" />
                    <span v-if="cell.builder" class="cal-bar cal-bar--builder" :title="`施工单位 ${cell.builder}`" />
                    <span v-if="cell.supervisor" class="cal-bar cal-bar--supervisor" :title="`监理单位 ${cell.supervisor}`" />
                  </div>
                  <span class="cal-cell__total">{{ cell.total }}</span>
                </template>
              </div>
            </template>
          </div>
          <!-- 图例 -->
          <div class="cal-legend">
            <span class="cal-legend-item"><span class="cal-legend-dot" style="background:#6e4bff" />建设单位</span>
            <span class="cal-legend-item"><span class="cal-legend-dot" style="background:#2bb3a3" />施工单位</span>
            <span class="cal-legend-item"><span class="cal-legend-dot" style="background:#fa8c16" />监理单位</span>
          </div>
        </div>
      </div>

      <!-- 图表区 2×2 -->
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-card__head"><strong>人员进出趋势（近7天）</strong></div>
          <div class="chart-card__body">
            <ECharts :option="accessTrendOption" />
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-card__head"><strong>违章类型分布</strong></div>
          <div class="chart-card__body">
            <ECharts :option="violationPieOption" />
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-card__head"><strong>工种分布</strong></div>
          <div class="chart-card__body">
            <ECharts :option="roleBarOption" />
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-card__head"><strong>证件状态分布</strong></div>
          <div class="chart-card__body">
            <ECharts :option="certPieOption" />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.po-page {
  height: 100%;
  display: flex;
  gap: 8px;
  padding: 8px;
  overflow: hidden;
}

/* ===== 左侧工地列表 ===== */
.left-panel {
  width: 320px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.list-section {
  flex: 1;
  background: #fff;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.left-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 14px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  &__title { font-size: 14px; font-weight: 600; color: $text-base; }
}

.left-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  height: 44px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  &__icon { font-size: 15px; color: $text-muted; flex-shrink: 0; }
  &__input { flex: 1; border: none; outline: none; background: transparent; font-size: 13px; color: $text-base; font-family: inherit; &::placeholder { color: $text-muted; } }
  &__clear { font-size: 14px; color: $text-muted; cursor: pointer; &:hover { color: $text-base; } }
}

.site-tree { flex: 1; overflow-y: auto; padding: 6px 8px; }

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 8px;
  font-size: 13px;
  color: $text-base;
  cursor: pointer;
  border-radius: 6px;
  &:hover { background: $bg-hover; }
  .tree-arrow { font-size: 10px; color: $text-muted; width: 14px; flex-shrink: 0; }
  .tree-icon { font-size: 13px; color: $text-secondary; flex-shrink: 0; }
  .tree-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tree-count { font-size: 11px; color: $text-muted; background: $bg-page; border-radius: 8px; padding: 0 6px; line-height: 18px; flex-shrink: 0; }
  &.is-selected { background: $color-primary-bg; .tree-icon, .tree-label { color: $color-primary; } }
}

.tree-province { font-weight: 600; .tree-icon { color: #6e4bff; } }
.tree-city { font-weight: 500; }
.tree-district { font-size: 12px; color: $text-secondary; }

.site-card {
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid $border-color-card;
  background: #fff;
  transition: all 0.2s;
  margin: 4px 0 4px 68px;
  &:hover { border-color: $color-primary; box-shadow: $shadow-card-active; }
  &.is-selected { border-color: $color-primary; background: $color-primary-bg; }
  &__body { padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  &__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  &__name { font-size: 13px; font-weight: 600; color: $text-base; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__area { font-size: 11px; font-weight: 500; color: $text-tertiary; flex-shrink: 0; }
  &__type { font-size: 11px; font-weight: 500; }
}

/* ===== 右侧 ===== */
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

/* 指标卡片 */
.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  flex-shrink: 0;
}

.metric-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  &__head { display: flex; align-items: center; gap: 8px; min-width: 0; }
}

.metric-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
  i { font-size: 17px; }
}

.metric-title { font-size: 13px; font-weight: 500; color: $text-secondary; }
.metric-value { font-size: 28px; font-weight: 700; line-height: 1; flex-shrink: 0; }

/* 图表区 */
.chart-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  flex-shrink: 0;
}

.chart-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &__head {
    height: 36px;
    display: flex;
    align-items: center;
    padding: 0 14px;
    border-bottom: 1px solid $border-color-card;
    flex-shrink: 0;
    strong { font-size: 13px; font-weight: 600; color: $text-base; }
  }

  &__body {
    flex: 1;
    min-height: 180px;
    padding: 4px 8px;
  }
}

/* 在场人员 */
.present-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;

  &__head {
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid $border-color-card;
    flex-shrink: 0;
    strong { font-size: 14px; font-weight: 600; color: $text-base; display: flex; align-items: center; gap: 6px; i { color: #2bb3a3; } }
  }

  &__count { font-size: 12px; color: $text-muted; }
}

.present-list {
  display: flex;
  gap: 10px;
  padding: 12px 16px;
  overflow-x: auto;
}

.present-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px 8px 8px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover { border-color: #2bb3a3; }

  &__avatar {
    width: 36px; height: 36px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
    border: 2px solid #fff; box-shadow: 0 0 0 1px $border-color-card;
  }

  &__info { display: flex; flex-direction: column; gap: 1px; }
  &__name { font-size: 13px; font-weight: 600; color: $text-base; }
  &__role { font-size: 11px; color: $text-muted; }
  &__time { font-size: 11px; color: $text-tertiary; margin-left: 4px; }
}

.present-empty { padding: 20px; text-align: center; color: $text-muted; font-size: 13px; }

/* 待办+日历行 */
.todo-cal-row {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 8px;
  flex-shrink: 0;
}

/* 待办事项明细 */
.todo-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 320px;

  &__head {
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-bottom: 1px solid $border-color-card;
    flex-shrink: 0;
    strong { font-size: 14px; font-weight: 600; color: $text-base; display: flex; align-items: center; gap: 6px; i { color: $color-primary; } }
  }

  &__count { font-size: 12px; color: $text-muted; }
}

.todo-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 16px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.todo-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: $text-secondary;
  cursor: pointer;
  border-radius: 6px;
  font-family: inherit;
  transition: all 0.15s;

  &:hover { background: $bg-hover; }
  &.active { background: $color-primary-bg; color: $color-primary; }

  &__num {
    font-size: 11px;
    padding: 0 5px;
    border-radius: 8px;
    background: rgba(0,0,0,0.06);
    color: $text-muted;
    line-height: 16px;
  }
  &.active .todo-tab__num { background: rgba(110,75,255,0.15); color: $color-primary; }
}

.todo-table {
  flex: 1;
  overflow-y: auto;
  padding: 4px 8px;
}

.todo-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 8px;
  border-bottom: 1px solid rgba(0,0,0,0.03);
  transition: background 0.15s;

  &:hover { background: #faf9ff; }
  &:last-child { border-bottom: none; }

  &__avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 1px solid $border-color-card; }
  &__name { font-size: 13px; font-weight: 500; color: $text-base; flex-shrink: 0; width: 50px; }
  &__title { font-size: 12px; color: $text-secondary; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__site { font-size: 11px; color: $text-muted; flex-shrink: 0; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__time { font-size: 11px; color: $text-tertiary; flex-shrink: 0; white-space: nowrap; }
  &__status { font-size: 11px; font-weight: 500; padding: 1px 8px; border-radius: 3px; flex-shrink: 0; white-space: nowrap; }
}

.todo-table-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 30px;
  color: $color-online;
  font-size: 13px;
  i { font-size: 18px; }
}

/* ===== 日历卡片 ===== */
.cal-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 320px;

  &__head {
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    border-bottom: 1px solid $border-color-card;
    flex-shrink: 0;
    strong { font-size: 13px; font-weight: 600; color: $text-base; display: flex; align-items: center; gap: 6px; i { color: $color-primary; } }
  }
}

.cal-month-nav {
  display: flex;
  align-items: center;
  gap: 4px;
}

.cal-nav-btn {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 4px;
  background: transparent;
  cursor: pointer;
  color: $text-muted;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  i { font-size: 12px; }
  &:hover { background: $bg-hover; color: $color-primary; }
}

.cal-month-label { font-size: 12px; font-weight: 600; color: $text-base; min-width: 60px; text-align: center; }

.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 6px 8px 2px;
  flex-shrink: 0;
}

.cal-weekday {
  font-size: 11px;
  font-weight: 600;
  color: $text-muted;
  text-align: center;
  line-height: 20px;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  padding: 2px 8px 4px;
  flex: 1;
  overflow-y: auto;
}

.cal-cell {
  aspect-ratio: 1;
  border-radius: 5px;
  border: 1px solid transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: default;
  transition: all 0.15s;
  position: relative;

  &--blank { border: none; }

  &--today {
    border-color: $color-primary;
    background: $color-primary-bg;
    .cal-cell__day { color: $color-primary; font-weight: 700; }
  }

  &:not(.cal-cell--blank):hover {
    background: #fafbfc;
    border-color: $border-color-card;
  }

  &__day { font-size: 11px; color: $text-tertiary; line-height: 1; }

  &__bars { display: flex; gap: 2px; }

  &__total { font-size: 9px; font-weight: 600; color: $text-secondary; line-height: 1; }
}

.cal-bar {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  &--construction { background: #6e4bff; }
  &--builder { background: #2bb3a3; }
  &--supervisor { background: #fa8c16; }
}

.cal-legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 6px 8px 10px;
  border-top: 1px solid $border-color-card;
  flex-shrink: 0;
}

.cal-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: $text-muted;
}

.cal-legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}
</style>
