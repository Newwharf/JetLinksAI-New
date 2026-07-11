<script setup lang="ts">
/**
 * 工地安全报告
 * 左侧：工地列表（复用树结构，去掉事件标识和统计）
 * 右侧：绿墙热力图 + 综合评分 + 按周折叠列表 + 报告详情弹窗
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
  getMonthlyScores,
  getWeeklyScores,
  getMonthlyAvg,
  getReportDetail,
  scoreColor,
  scoreLevel,
  type ReportDetail
} from './safety.mock'

// ===== 搜索 =====
const searchKeyword = ref('')
const filteredSites = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return constructionSites
  return constructionSites.filter(
    s => s.name.toLowerCase().includes(kw) || s.address.toLowerCase().includes(kw)
  )
})
const searching = computed(() => searchKeyword.value.trim().length > 0)

// ===== 树展开 =====
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

// ===== 选中工地 =====
const selectedId = ref<string | null>(constructionSites[0]?.id || null)
const selectedSite = computed(() => constructionSites.find(s => s.id === selectedId.value))

function selectSite(site: ConstructionSite) {
  selectedId.value = site.id
}

// ===== 月份选择 =====
const currentYear = ref(2026)
const currentMonth = ref(7)

function prevMonth() {
  if (currentMonth.value === 1) {
    currentMonth.value = 12
    currentYear.value--
  } else {
    currentMonth.value--
  }
}
function nextMonth() {
  if (currentMonth.value === 12) {
    currentMonth.value = 1
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

// ===== 月度评分数据 =====
const monthlyScores = computed(() =>
  selectedId.value ? getMonthlyScores(selectedId.value, currentYear.value, currentMonth.value) : []
)
const monthlyAvg = computed(() =>
  selectedId.value ? getMonthlyAvg(selectedId.value, currentYear.value, currentMonth.value) : 0
)
const weeklyScores = computed(() =>
  selectedId.value ? getWeeklyScores(selectedId.value, currentYear.value, currentMonth.value) : []
)

// ===== 绿墙数据（每行=一周，横向7天）=====
interface HeatCell {
  date: string
  score: number
  day: number
  dayOfWeek: number // 0=周一 ... 6=周日
}

const heatGrid = computed(() => {
  const scores = monthlyScores.value
  const dayLabels = ['一', '二', '三', '四', '五', '六', '日']
  if (scores.length === 0) return { rows: [] as (HeatCell | null)[][], dayLabels, weekLabels: [] as string[] }

  // 找到第一天是星期几（转为周一=0的体系）
  const firstDay = new Date(scores[0].date)
  let firstDayOfWeek = firstDay.getDay() // 0=周日
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  // 前面补空格对齐
  const cells: (HeatCell | null)[] = []
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null)
  for (const s of scores) {
    const d = new Date(s.date)
    let dow = d.getDay()
    dow = dow === 0 ? 6 : dow - 1
    cells.push({ date: s.date, score: s.score, day: d.getDate(), dayOfWeek: dow })
  }
  // 末尾补齐到 7 的倍数
  while (cells.length % 7 !== 0) cells.push(null)

  // 每行 = 一周（7个格子）
  const rows: (HeatCell | null)[][] = []
  const weekLabels: string[] = []
  let weekIdx = 1
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7))
    weekLabels.push(`第${weekIdx}周`)
    weekIdx++
  }

  return { rows, dayLabels, weekLabels }
})

// ===== 事件趋势折线图（本月每日安全告警 + 风险预警）=====
const trendOption = computed(() => {
  const scores = monthlyScores.value
  const days = scores.map(d => d.date.substring(8))
  const safetyData = scores.map(d => d.safetyCount)
  const riskData = scores.map(d => d.riskCount)

  return {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any[]) => {
        const date = scores[params[0].dataIndex]?.date || ''
        let html = `${date}<br/>`
        for (const p of params) {
          html += `${p.marker} ${p.seriesName}: ${p.value}<br/>`
        }
        return html
      }
    },
    legend: {
      top: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { fontSize: 11, color: '#8895ab' }
    },
    grid: { left: 28, right: 12, top: 32, bottom: 24 },
    xAxis: {
      type: 'category',
      data: days,
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisTick: { show: false },
      axisLabel: { fontSize: 10, color: '#9aa1ab', interval: Math.ceil(days.length / 10) - 1 }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { color: '#f0f0f0' } },
      axisLabel: { fontSize: 10, color: '#9aa1ab' }
    },
    series: [
      {
        name: '安全告警',
        type: 'line',
        data: safetyData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { width: 2, color: '#6e4bff' },
        itemStyle: { color: '#6e4bff' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(110,75,255,0.15)' },
              { offset: 1, color: 'rgba(110,75,255,0)' }
            ]
          }
        }
      },
      {
        name: '风险预警',
        type: 'line',
        data: riskData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 4,
        lineStyle: { width: 2, color: '#2bb3a3' },
        itemStyle: { color: '#2bb3a3' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(43,179,163,0.15)' },
              { offset: 1, color: 'rgba(43,179,163,0)' }
            ]
          }
        }
      }
    ]
  }
})

// ===== 周折叠状态 =====
const expandedWeeks = ref<Set<number>>(new Set([1]))

function toggleWeek(weekIndex: number) {
  if (expandedWeeks.value.has(weekIndex)) expandedWeeks.value.delete(weekIndex)
  else expandedWeeks.value.add(weekIndex)
}

// ===== 报告详情弹窗 =====
const reportDetail = ref<ReportDetail | null>(null)

function viewMonthReport() {
  if (!selectedId.value) return
  reportDetail.value = getReportDetail(selectedId.value, 'month', currentYear.value, currentMonth.value)
}
function viewWeekReport(weekIndex: number) {
  if (!selectedId.value) return
  reportDetail.value = getReportDetail(selectedId.value, 'week', currentYear.value, currentMonth.value, weekIndex)
}
function viewDayReport(date: string) {
  if (!selectedId.value) return
  const day = parseInt(date.split('-')[2])
  reportDetail.value = getReportDetail(selectedId.value, 'day', currentYear.value, currentMonth.value, day)
}
function closeReport() {
  reportDetail.value = null
}

// ===== 下载报告 =====
function downloadReport() {
  if (!reportDetail.value) return
  const r = reportDetail.value
  let text = `${r.title}\n时间范围：${r.dateRange}\n评分：${r.score} 分（${r.level}）\n\n`
  text += `摘要：${r.summary}\n\n`
  if (r.deductions.length) {
    text += '扣分明细：\n'
    for (const d of r.deductions) {
      text += `  ${d.label}：${d.count} 项，每项扣 ${d.perScore} 分，共扣 ${d.totalDeduct} 分\n`
    }
    text += '\n'
  }
  text += '改进建议：\n'
  for (const s of r.suggestions) {
    text += `  · ${s}\n`
  }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${r.title}-${r.dateRange}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// 导出月报（暂不实现）
function exportMonthReport() {
  // TODO: 导出月报功能后续实现
}
</script>

<template>
  <div class="safety-page">
    <!-- ===== 左侧工地列表 ===== -->
    <aside class="left-panel">
      <div class="list-section">
        <div class="search-bar">
          <i class="i-ant-design-search-outlined search-icon" />
          <input v-model="searchKeyword" class="search-input" placeholder="搜索工地名称或地址" />
          <i v-if="searchKeyword" class="i-ant-design-close-circle-filled search-clear" @click="searchKeyword = ''" />
        </div>

        <div class="site-tree scroll-thin">
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
                        :class="{ 'is-selected': selectedId === site.id }"
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

    <!-- ===== 右侧报告区 ===== -->
    <main class="report-panel" v-if="selectedSite">
      <!-- 工具栏 -->
      <div class="report-toolbar">
        <div class="toolbar-left">
          <span class="report-site-name">{{ selectedSite.name }}</span>
          <span class="report-site-tag" :style="{ color: sizeTypeMeta[selectedSite.sizeType].color }">{{ sizeTypeMeta[selectedSite.sizeType].label }}</span>
        </div>
        <div class="toolbar-right">
          <button class="toolbar-btn" @click="prevMonth"><i class="i-ant-design-left-outlined" /></button>
          <span class="toolbar-month">{{ currentYear }}年{{ currentMonth }}月</span>
          <button class="toolbar-btn" @click="nextMonth"><i class="i-ant-design-right-outlined" /></button>
          <button class="toolbar-btn toolbar-btn--export" @click="exportMonthReport">
            <i class="i-ant-design-export-outlined" />
            <span>导出月报</span>
          </button>
        </div>
      </div>

      <!-- 上半部分：三栏卡片 -->
      <div class="report-top">
        <!-- 卡片1：安全评分热力图 -->
        <div class="db-card heat-card">
          <div class="card-head">
            <strong>安全评分热力图</strong>
          </div>
          <div class="heat-body">
            <div class="heat-table">
              <!-- 顶部：角标 + 星期标签 -->
              <div class="heat-row heat-row--head">
                <span class="heat-corner"></span>
                <span v-for="w in heatGrid.dayLabels" :key="w" class="heat-weekday">{{ w }}</span>
              </div>
              <!-- 每行 = 一周 -->
              <div v-for="(row, ri) in heatGrid.rows" :key="ri" class="heat-row">
                <span class="heat-row-label">{{ heatGrid.weekLabels[ri] }}</span>
                <a-tooltip v-for="(cell, ci) in row" :key="ci" :mouse-enter-delay="0.1">
                  <template #title>
                    <span v-if="cell">{{ cell.date.substring(5) }} 评分：{{ cell.score }}</span>
                    <span v-else>—</span>
                  </template>
                  <div
                    class="heat-cell"
                    :class="{ 'is-empty': !cell }"
                    :style="cell ? { background: scoreColor(cell.score) } : {}"
                    @click="cell && viewDayReport(cell.date)"
                  >
                    <span v-if="cell" class="heat-cell__day">{{ cell.day }}</span>
                  </div>
                </a-tooltip>
              </div>
            </div>
          </div>
          <!-- 图例 -->
          <div class="heat-legend">
            <span class="heat-legend__label">低</span>
            <span class="heat-legend__cell" style="background: #ff4d4f" />
            <span class="heat-legend__cell" style="background: #925ce0" />
            <span class="heat-legend__cell" style="background: #6e4bff" />
            <span class="heat-legend__cell" style="background: #2bb3a3" />
            <span class="heat-legend__label">高</span>
          </div>
        </div>

        <!-- 卡片2：月综合评分 -->
        <div class="db-card score-card">
          <div class="card-head">
            <strong>月综合评分</strong>
            <button class="view-report-btn" @click="viewMonthReport">
              <i class="i-ant-design-file-text-outlined" />
              <span>月报详情</span>
            </button>
          </div>
          <div class="score-body">
            <div class="score-display" :style="{ color: scoreColor(monthlyAvg) }">
              <span class="score-display__value">{{ monthlyAvg }}</span>
              <span class="score-display__unit">分</span>
            </div>
            <span class="score-display__level" :style="{ color: scoreColor(monthlyAvg), background: scoreColor(monthlyAvg) + '15' }">
              {{ scoreLevel(monthlyAvg) }}
            </span>
            <div class="score-stats">
              <div class="score-stat">
                <span class="score-stat__label">安全告警</span>
                <span class="score-stat__value">{{ monthlyScores.reduce((s, d) => s + d.safetyCount, 0) }}</span>
              </div>
              <div class="score-stat">
                <span class="score-stat__label">风险预警</span>
                <span class="score-stat__value">{{ monthlyScores.reduce((s, d) => s + d.riskCount, 0) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 卡片3：事件趋势图 -->
        <div class="db-card trend-card">
          <div class="card-head"><strong>事件趋势图</strong></div>
          <div class="trend-body">
            <ECharts :option="trendOption" class="trend-chart" />
          </div>
        </div>
      </div>

      <!-- 下半部分：按周折叠列表 -->
      <div class="db-card weekly-card">
        <div class="card-head"><strong>每周安全评分</strong></div>
        <div class="weekly-list">
          <div v-for="week in weeklyScores" :key="week.weekIndex" class="week-item">
            <!-- 周头部（可折叠） -->
            <div class="week-header" @click="toggleWeek(week.weekIndex)">
              <i class="week-arrow" :class="expandedWeeks.has(week.weekIndex) ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'" />
              <span class="week-label">{{ week.weekLabel }}</span>
              <span class="week-range">{{ week.dateRange }}</span>
              <span class="week-score" :style="{ color: scoreColor(week.weeklyAvg) }">{{ week.weeklyAvg }} 分</span>
              <span class="week-stat week-stat--safety">告警 {{ week.days.reduce((s, d) => s + d.safetyCount, 0) }}</span>
              <span class="week-stat week-stat--risk">风险 {{ week.days.reduce((s, d) => s + d.riskCount, 0) }}</span>
              <button class="view-report-btn week-report-btn" @click.stop="viewWeekReport(week.weekIndex)">
                <i class="i-ant-design-file-text-outlined" />
                <span>周报</span>
              </button>
            </div>

            <!-- 展开后：每日列表 -->
            <Transition name="week-expand">
              <div v-if="expandedWeeks.has(week.weekIndex)" class="week-days">
                <div v-for="day in week.days" :key="day.date" class="day-row">
                  <span class="day-row__date">{{ day.date.substring(5) }}</span>
                  <div class="day-row__bar">
                    <div class="day-row__bar-fill" :style="{ width: day.score + '%', background: scoreColor(day.score) }" />
                  </div>
                  <span class="day-row__score" :style="{ color: scoreColor(day.score) }">{{ day.score }} 分</span>
                  <span class="day-row__events">
                    <span class="day-row__event day-row__event--safety">告警 {{ day.safetyCount }}</span>
                    <span class="day-row__event day-row__event--risk">风险 {{ day.riskCount }}</span>
                  </span>
                  <button class="view-report-btn day-report-btn" @click.stop="viewDayReport(day.date)">
                    <i class="i-ant-design-file-text-outlined" />
                    <span>日报</span>
                  </button>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </main>

    <!-- 空状态 -->
    <main class="report-panel report-empty" v-else>
      <i class="i-ant-design-safety-outlined empty-icon" />
      <p>请从左侧选择一个工地查看安全报告</p>
    </main>

    <!-- 报告详情弹窗 -->
    <Transition name="detail-popup">
      <div v-if="reportDetail" class="detail-overlay" @click="closeReport">
        <div class="report-detail-card" @click.stop>
          <button class="detail-close" @click="closeReport"><i class="i-ant-design-close-outlined" /></button>
          <!-- 头部 -->
          <div class="report-detail__head" :style="{ background: scoreColor(reportDetail.score) + '12' }">
            <div class="report-detail__title-area">
              <h3 class="report-detail__title">{{ reportDetail.title }}</h3>
              <span class="report-detail__range">{{ reportDetail.dateRange }}</span>
            </div>
            <div class="report-detail__score-area">
              <span class="report-detail__score" :style="{ color: scoreColor(reportDetail.score) }">{{ reportDetail.score }}</span>
              <span class="report-detail__score-unit">分</span>
              <span class="report-detail__level" :style="{ color: scoreColor(reportDetail.score), background: scoreColor(reportDetail.score) + '20' }">{{ reportDetail.level }}</span>
            </div>
          </div>
          <!-- 内容 -->
          <div class="report-detail__body">
            <p class="report-detail__summary">{{ reportDetail.summary }}</p>

            <template v-if="reportDetail.deductions.length">
              <div class="report-detail__section-title">扣分明细</div>
              <div class="report-detail__table">
                <div v-for="d in reportDetail.deductions" :key="d.label" class="report-detail__row">
                  <span class="report-detail__row-label">{{ d.label }}</span>
                  <span class="report-detail__row-count">{{ d.count }} 项</span>
                  <span class="report-detail__row-per">每项扣 {{ d.perScore }} 分</span>
                  <span class="report-detail__row-deduct">-{{ d.totalDeduct }} 分</span>
                </div>
              </div>
            </template>

            <div class="report-detail__section-title">改进建议</div>
            <ul class="report-detail__suggestions">
              <li v-for="(s, i) in reportDetail.suggestions" :key="i">{{ s }}</li>
            </ul>
          </div>
          <!-- 底部 -->
          <div class="report-detail__footer">
            <button class="download-btn" @click="downloadReport">
              <i class="i-ant-design-download-outlined" />
              <span>下载报告</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.safety-page {
  height: 100%;
  display: flex;
  gap: 8px;
  padding: 8px;
  background: $bg-page;
  overflow: hidden;
}

/* ===== 左侧 ===== */
.left-panel {
  width: 360px;
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

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  height: 44px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  .search-icon { font-size: 15px; color: $text-muted; flex-shrink: 0; }
  .search-input {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: 13px; color: $text-base; font-family: inherit;
    &::placeholder { color: $text-muted; }
  }
  .search-clear { font-size: 14px; color: $text-muted; cursor: pointer; &:hover { color: $text-base; } }
}

.site-tree {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px;
}

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
.report-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

.report-empty {
  align-items: center;
  justify-content: center;
  color: $text-muted;

  .empty-icon { font-size: 48px; opacity: 0.3; margin-bottom: 12px; }
  p { font-size: 14px; }
}

/* 工具栏 */
.report-toolbar {
  height: 44px;
  background: #fff;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  .report-site-name { font-size: 15px; font-weight: 600; color: $text-base; }
  .report-site-tag { font-size: 11px; font-weight: 500; }
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 8px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
  i { font-size: 13px; }
  &:hover { border-color: $color-primary; color: $color-primary; }

  &--export {
    margin-left: 8px;
    padding: 0 12px;
    border-color: $color-primary;
    color: $color-primary;
    &:hover { background: $color-primary-bg; }
  }
}

.toolbar-month {
  font-size: 14px;
  font-weight: 500;
  color: $text-base;
  min-width: 100px;
  text-align: center;
}

/* 卡片通用 */
.db-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  display: flex;
  flex-direction: column;
}

.card-head {
  padding: 12px 16px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  strong { font-size: 14px; font-weight: 600; color: $text-base; }
}

/* 查看报告按钮 */
.view-report-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  color: $color-primary;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
  i { font-size: 12px; }
  &:hover { background: $color-primary-bg; }
}

/* 上半部分：三栏卡片 */
.report-top {
  display: grid;
  grid-template-columns: auto 220px 1fr;
  gap: 8px;
  flex-shrink: 0;
}

.heat-card { overflow: hidden; width: max-content; }

.heat-body {
  min-height: 0;
  overflow-y: auto;
  padding: 4px 16px;
}

/* 月综合评分卡片 */
.score-card {
  overflow: hidden;
}

.score-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px 16px;
}

/* 事件趋势卡片 */
.trend-card {
  overflow: hidden;
}

.trend-body {
  flex: 1;
  min-height: 0;
  padding: 4px 8px 8px;
}

.trend-chart {
  width: 100%;
  height: 100%;
}

.heat-table {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-start;
}

.heat-row {
  display: flex;
  align-items: center;
  gap: 4px;

  &--head {
    gap: 4px;
  }
}

.heat-corner {
  width: 44px;
  flex-shrink: 0;
}

.heat-row-label {
  width: 44px;
  flex-shrink: 0;
  font-size: 11px;
  font-weight: 500;
  color: $text-muted;
  text-align: center;
}

.heat-weekday {
  font-size: 11px;
  color: $text-muted;
  height: 28px;
  width: 28px;
  line-height: 28px;
  text-align: center;
}

.heat-cell {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.1s;

  &:hover { transform: scale(1.3); z-index: 5; }

  &__day { font-size: 10px; color: rgba(255,255,255,0.8); }

  &.is-empty { background: #f0f0f0; cursor: default; &:hover { transform: none; } }
}

.heat-legend {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 16px 12px;

  &__label { font-size: 11px; color: $text-muted; }
  &__cell { width: 12px; height: 12px; border-radius: 2px; }
}

/* 月综合评分 */
.score-display {
  display: flex;
  align-items: baseline;
  gap: 2px;

  &__value { font-size: 44px; font-weight: 800; line-height: 1; }
  &__unit { font-size: 14px; color: $text-muted; }

  &__level {
    font-size: 12px;
    font-weight: 600;
    padding: 2px 10px;
    border-radius: 6px;
  }
}

.score-stats {
  display: flex;
  gap: 20px;
  padding-top: 10px;
  margin-top: 6px;
  border-top: 1px solid $border-color-card;
  width: 100%;
  justify-content: center;
}

.score-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;

  &__label { font-size: 11px; color: $text-muted; }
  &__value { font-size: 20px; font-weight: 700; color: $text-base; }
}

/* 下半部分：按周列表 */
.weekly-card {
  flex: 1;
  overflow: hidden;
}

.weekly-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 12px;
}

.week-item {
  border-bottom: 1px solid $border-color-card;
  &:last-child { border-bottom: none; }
}

.week-header {
  display: grid;
  grid-template-columns: 12px 50px 1fr 56px 64px 64px auto;
  align-items: center;
  gap: 8px;
  padding: 10px 0;
  cursor: pointer;

  &:hover { background: $bg-page; margin: 0 -8px; padding: 10px 8px; border-radius: 6px; }
}

.week-arrow { font-size: 10px; color: $text-muted; }
.week-label { font-size: 13px; font-weight: 600; color: $text-base; }
.week-range { font-size: 12px; color: $text-muted; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.week-stat {
  font-size: 11px;
  font-weight: 500;
  padding: 1px 8px;
  border-radius: 3px;
  text-align: center;
  box-sizing: border-box;

  &--safety { color: #ff4d4f; background: rgba(255,77,79,0.1); }
  &--risk { color: #2bb3a3; background: rgba(43,179,163,0.1); }
}
.week-score { font-size: 14px; font-weight: 700; text-align: right; }
.week-report-btn { height: 24px; padding: 0 8px; font-size: 11px; flex-shrink: 0; }
.day-report-btn { height: 24px; padding: 0 8px; font-size: 11px; }

.week-days {
  overflow: hidden;
}

.day-row {
  display: grid;
  grid-template-columns: 12px 50px 1fr 56px 64px 64px auto;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  cursor: pointer;
  border-radius: 6px;
  transition: background 0.15s;

  &:hover { background: $bg-page; }

  &__date { font-size: 12px; color: $text-secondary; grid-column: 2; }

  &__bar {
    grid-column: 3;
    height: 8px;
    background: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;

    &-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
  }

  &__score { font-size: 14px; font-weight: 400; text-align: right; grid-column: 4; }

  &__events {
    display: contents;
  }

  &__event {
    font-size: 11px;
    font-weight: 500;
    padding: 1px 8px;
    border-radius: 3px;
    text-align: center;
    box-sizing: border-box;

    &--safety { color: #ff4d4f; background: rgba(255,77,79,0.1); }
    &--risk { color: #2bb3a3; background: rgba(43,179,163,0.1); }
  }
}

/* 展开动画 */
.week-expand-enter-active, .week-expand-leave-active {
  transition: max-height 0.25s ease, opacity 0.25s ease;
  overflow: hidden;
}
.week-expand-enter-from, .week-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.week-expand-enter-to, .week-expand-leave-from {
  max-height: 500px;
  opacity: 1;
}

/* ===== 报告详情弹窗 ===== */
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.report-detail-card {
  width: 480px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  position: relative;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.detail-close {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: rgba(255, 255, 255, 0.9);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $text-muted;
  font-size: 14px;
  z-index: 5;
  &:hover { background: $bg-hover; color: $text-base; }
}

.report-detail__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
}

.report-detail__title-area {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.report-detail__title {
  font-size: 17px;
  font-weight: 600;
  color: $text-base;
  margin: 0;
}

.report-detail__range {
  font-size: 12px;
  color: $text-muted;
}

.report-detail__score-area {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.report-detail__score {
  font-size: 36px;
  font-weight: 800;
  line-height: 1;
}

.report-detail__score-unit {
  font-size: 14px;
  color: $text-muted;
}

.report-detail__level {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 6px;
  margin-left: 8px;
}

.report-detail__body {
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.report-detail__summary {
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.6;
  margin: 0;
}

.report-detail__section-title {
  font-size: 13px;
  font-weight: 600;
  color: $text-base;
}

.report-detail__table {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.report-detail__row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: $bg-page;
  border-radius: 8px;
  font-size: 12px;

  &-label { flex: 1; color: $text-base; font-weight: 500; }
  &-count { color: $text-secondary; }
  &-per { color: $text-muted; }
  &-deduct { font-weight: 600; color: #ff4d4f; min-width: 50px; text-align: right; }
}

.report-detail__suggestions {
  margin: 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  li { font-size: 12px; color: $text-secondary; line-height: 1.6; }
}

.report-detail__footer {
  padding: 12px 24px 16px;
  border-top: 1px solid $border-color-card;
  display: flex;
  justify-content: flex-end;
}

.download-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  background: $color-primary;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;
  i { font-size: 14px; }
  &:hover { background: $color-primary-hover; }
}

.detail-popup-enter-active, .detail-popup-leave-active { transition: opacity 0.2s; }
.detail-popup-enter-from, .detail-popup-leave-to { opacity: 0; }
</style>
