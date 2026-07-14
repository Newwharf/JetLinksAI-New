<script setup lang="ts">
/**
 * 工地人员安全事件统计
 * 左侧：工地树（省市区三级 + "全部工地"）
 * 右侧：指标卡（4） + 图表（趋势折线 + 类型分布饼图） + 明细表格（搜索 + 分页 + 详情弹窗）
 */
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
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
  safetyEventRecords,
  safetyEventTypeMeta,
  safetyEventTypeOptions,
  severityMeta,
  eventStatusMeta,
  buildEventTrend,
  buildEventPie,
  type SafetyEventRecord,
  type SafetyEventType,
  type Severity,
  type EventStatus
} from './person-stats.mock'

// 严重程度下拉项（mock 未导出 options，本地构建）
const severityOptions = Object.entries(severityMeta).map(([value, meta]) => ({ value: value as Severity, label: meta.label }))

// ===== 左侧：工地树 =====
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

// ===== 指标卡 =====
const scopedEvents = computed(() => safetyEventRecords.filter(e => selectedSiteIds.value.has(e.siteId)))
const metricCards = computed(() => {
  const list = scopedEvents.value
  const minor = list.filter(e => e.severity === 'minor').length
  const middleSerious = list.filter(e => e.severity === 'moderate' || e.severity === 'serious').length
  const closed = list.filter(e => e.status === 'closed').length
  return [
    { key: 'total', title: '事件总数', icon: 'i-ant-design-alert-outlined', color: '#6e4bff', value: list.length, sub: '全部事件' },
    { key: 'minor', title: '轻伤', icon: 'i-ant-design-medicine-box-outlined', color: '#9254de', value: minor, sub: '轻微伤害' },
    { key: 'serious', title: '中伤+重伤', icon: 'i-ant-design-fire-outlined', color: '#b37feb', value: middleSerious, sub: '需重点处置' },
    { key: 'closed', title: '已结案', icon: 'i-ant-design-check-circle-outlined', color: '#722ed1', value: closed, sub: '闭环处理' }
  ]
})

// ===== 图表 =====
const trendOption = computed(() => {
  const t = buildEventTrend(selectedSiteIds.value)
  return {
    color: ['#6e4bff'],
    tooltip: {
      trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [10, 14],
      textStyle: { color: '#111418', fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: '#6e4bff', type: 'dashed', width: 1 } }
    },
    grid: { left: 40, right: 16, top: 24, bottom: 28 },
    xAxis: { type: 'category', data: t.days, boundaryGap: false, axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
    series: [{
      name: '事件数', type: 'line', smooth: true, symbol: 'circle', symbolSize: 6, showSymbol: true,
      data: t.counts,
      lineStyle: { width: 2.5, color: '#6e4bff' },
      itemStyle: { color: '#6e4bff' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(110,75,255,0.25)' }, { offset: 1, color: 'rgba(110,75,255,0.02)' }] } }
    }]
  }
})

const pieOption = computed(() => {
  const data = buildEventPie(selectedSiteIds.value)
  return {
    tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12], textStyle: { color: '#111418', fontSize: 12 } },
    legend: { bottom: 0, icon: 'circle', itemWidth: 10, itemHeight: 10, textStyle: { color: '#3a3f47', fontSize: 12 } },
    series: [{
      type: 'pie', radius: ['42%', '68%'], center: ['50%', '42%'],
      avoidLabelOverlap: true,
      label: { show: true, formatter: '{b}\n{c}件', fontSize: 12, color: '#3a3f47' },
      labelLine: { length: 8, length2: 8 },
      data
    }]
  }
})

// ===== 右侧：搜索条件 =====
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs]>()
const typeFilter = ref<SafetyEventType | 'all'>('all')
const severityFilter = ref<Severity | 'all'>('all')
const keyword = ref('')

const filteredEvents = computed(() => {
  let list = safetyEventRecords.filter(e => selectedSiteIds.value.has(e.siteId))
  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value
    const startStr = start.format('YYYY-MM-DD')
    const endStr = end.format('YYYY-MM-DD')
    list = list.filter(e => {
      const day = e.time.substring(0, 10)
      return day >= startStr && day <= endStr
    })
  }
  if (typeFilter.value !== 'all') list = list.filter(e => e.type === typeFilter.value)
  if (severityFilter.value !== 'all') list = list.filter(e => e.severity === severityFilter.value)
  if (keyword.value.trim()) {
    const kw = keyword.value.trim().toLowerCase()
    list = list.filter(e => e.personName.toLowerCase().includes(kw) || e.desc.toLowerCase().includes(kw) || e.siteName.toLowerCase().includes(kw))
  }
  return list
})

// ===== 分页 =====
const currentPage = ref(1)
const pageSize = ref(10)
const pagedEvents = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredEvents.value.slice(start, start + pageSize.value)
})
watch([keyword, typeFilter, severityFilter, dateRange, selectedNode], () => { currentPage.value = 1 })
function handleSearch() { currentPage.value = 1 }
function handleReset() {
  dateRange.value = undefined
  typeFilter.value = 'all'
  severityFilter.value = 'all'
  keyword.value = ''
  currentPage.value = 1
}
function handleExport() { message.success(`已导出 ${filteredEvents.value.length} 条安全事件记录`) }

// ===== 详情弹窗 =====
const detailVisible = ref(false)
const detailData = ref<SafetyEventRecord | null>(null)

function openDetail(record: SafetyEventRecord) {
  detailData.value = record
  detailVisible.value = true
}
function closeDetail() {
  detailVisible.value = false
}
</script>

<template>
  <div class="ps-page">
    <!-- ===== 左侧工地树 ===== -->
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
      <!-- 指标卡 -->
      <section class="metric-grid">
        <article v-for="card in metricCards" :key="card.key" class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" :style="{ background: card.color }">
              <i :class="card.icon" />
            </span>
            <span class="metric-title">{{ card.title }}</span>
          </div>
          <div class="metric-card__body">
            <strong class="metric-value">{{ card.value }}</strong>
            <span class="metric-sub-text">{{ card.sub }}</span>
          </div>
        </article>
      </section>

      <!-- 图表区 -->
      <section class="chart-row">
        <div class="chart-card">
          <div class="chart-card__head"><strong>事件趋势 · 近 7 天</strong></div>
          <ECharts :option="trendOption" height="180px" />
        </div>
        <div class="chart-card">
          <div class="chart-card__head"><strong>事件类型分布</strong></div>
          <ECharts :option="pieOption" height="180px" />
        </div>
      </section>

      <!-- 明细表格 -->
      <div class="table-card">
        <div class="search-bar">
          <div class="search-row">
            <div class="search-fields">
              <div class="search-item">
                <label>时间范围</label>
                <a-range-picker v-model:value="dateRange" :allow-clear="true" />
              </div>
              <div class="search-item">
                <label>事件类型</label>
                <a-select v-model:value="typeFilter" allow-clear placeholder="全部类型">
                  <a-select-option value="all">全部类型</a-select-option>
                  <a-select-option v-for="t in safetyEventTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</a-select-option>
                </a-select>
              </div>
              <div class="search-item">
                <label>严重程度</label>
                <a-select v-model:value="severityFilter" allow-clear placeholder="全部程度">
                  <a-select-option value="all">全部程度</a-select-option>
                  <a-select-option v-for="s in severityOptions" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
                </a-select>
              </div>
              <div class="search-item search-item--kw">
                <label>关键字</label>
                <a-input v-model:value="keyword" placeholder="搜索人员/描述/工地" allow-clear />
              </div>
              <div class="search-actions search-actions--inline">
                <button class="s-btn s-btn--primary" @click="handleSearch">
                  <i class="i-ant-design-search-outlined" />查询
                </button>
                <button class="s-btn" @click="handleReset">
                  <i class="i-ant-design-reload-outlined" />重置
                </button>
              </div>
            </div>
            <div class="search-actions search-actions--right">
              <button class="s-btn s-btn--export" @click="handleExport">
                <i class="i-ant-design-download-outlined" />导出
              </button>
            </div>
          </div>
        </div>

        <div class="table-body-wrap">
          <a-table
            :data-source="pagedEvents"
            :pagination="false"
            row-key="id"
            :scroll="{ x: 1280 }"
            size="middle"
            class="event-table"
            :custom-row="(record) => ({ onClick: () => openDetail(record) })"
          >
            <a-table-column title="人员" :width="140">
              <template #default="{ record }">
                <div class="cell-person">
                  <img :src="record.personAvatar" class="cell-person__avatar" alt="" />
                  <span class="cell-person__name">{{ record.personName }}</span>
                </div>
              </template>
            </a-table-column>

            <a-table-column title="事件类型" :width="110">
              <template #default="{ record }">
                <span class="type-tag type-tag--fit" :style="{ background: safetyEventTypeMeta[record.type as SafetyEventType].color + '18', color: safetyEventTypeMeta[record.type as SafetyEventType].color }">
                  {{ safetyEventTypeMeta[record.type as SafetyEventType].label }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="事件描述" data-index="desc" :width="220" :ellipsis="true" />

            <a-table-column title="发生时间" data-index="time" :width="160" />

            <a-table-column title="严重程度" :width="100">
              <template #default="{ record }">
                <span class="type-tag type-tag--fit" :style="{ background: severityMeta[record.severity as Severity].bg, color: severityMeta[record.severity as Severity].color }">
                  {{ severityMeta[record.severity as Severity].label }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="工地" data-index="siteName" :width="160" :ellipsis="true" />

            <a-table-column title="处理状态" :width="100">
              <template #default="{ record }">
                <span class="status-tag" :style="{ background: eventStatusMeta[record.status as EventStatus].bg, color: eventStatusMeta[record.status as EventStatus].color }">
                  <span class="status-dot" :style="{ background: eventStatusMeta[record.status as EventStatus].color }" />
                  {{ eventStatusMeta[record.status as EventStatus].label }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="操作" :width="90" fixed="right">
              <template #default="{ record }">
                <div class="action-cell">
                  <button class="detail-btn" @click.stop="openDetail(record)">
                    <i class="i-ant-design-eye-outlined" />详情
                  </button>
                </div>
              </template>
            </a-table-column>
          </a-table>
        </div>

        <div class="pagination-bar">
          <span class="page-total">共 {{ filteredEvents.length }} 条</span>
          <a-pagination
            v-model:current="currentPage"
            v-model:page-size="pageSize"
            :total="filteredEvents.length"
            :page-size-options="['10', '20', '50']"
            show-size-changer
            show-quick-jumper
          />
        </div>
      </div>
    </main>

    <!-- ===== 详情弹窗 ===== -->
    <a-modal
      v-model:open="detailVisible"
      :width="640"
      centered
      title="安全事件详情"
      :footer="null"
      @cancel="closeDetail"
    >
      <template v-if="detailData">
        <div class="detail-modal">
          <!-- 人员头部 -->
          <div class="detail-hero">
            <img :src="detailData.personAvatar" class="detail-hero__avatar" alt="" />
            <div class="detail-hero__info">
              <div class="detail-hero__name-row">
                <span class="detail-hero__name">{{ detailData.personName }}</span>
                <span class="type-tag type-tag--fit" :style="{ background: safetyEventTypeMeta[detailData.type].color + '18', color: safetyEventTypeMeta[detailData.type].color }">
                  <i :class="safetyEventTypeMeta[detailData.type].icon" />
                  {{ safetyEventTypeMeta[detailData.type].label }}
                </span>
              </div>
              <div class="detail-hero__meta">
                <span class="status-tag" :style="{ background: eventStatusMeta[detailData.status].bg, color: eventStatusMeta[detailData.status].color }">
                  <span class="status-dot" :style="{ background: eventStatusMeta[detailData.status].color }" />
                  {{ eventStatusMeta[detailData.status].label }}
                </span>
                <span class="type-tag type-tag--fit" :style="{ background: severityMeta[detailData.severity].bg, color: severityMeta[detailData.severity].color }">
                  {{ severityMeta[detailData.severity].label }}
                </span>
              </div>
            </div>
          </div>

          <!-- 基本信息 -->
          <div class="detail-section">
            <div class="detail-section__title">基本信息</div>
            <ul class="detail-fields">
              <li class="detail-field">
                <span class="detail-field__label">事件编号</span>
                <span class="detail-field__value">{{ detailData.id }}</span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">所属工地</span>
                <span class="detail-field__value">{{ detailData.siteName }}</span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">发生时间</span>
                <span class="detail-field__value">{{ detailData.time }}</span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">事件类型</span>
                <span class="detail-field__value">
                  <i :class="safetyEventTypeMeta[detailData.type].icon" :style="{ color: safetyEventTypeMeta[detailData.type].color }" />
                  {{ safetyEventTypeMeta[detailData.type].label }}
                </span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">严重程度</span>
                <span class="detail-field__value">
                  <span class="type-tag type-tag--fit" :style="{ background: severityMeta[detailData.severity].bg, color: severityMeta[detailData.severity].color }">
                    {{ severityMeta[detailData.severity].label }}
                  </span>
                </span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">处理状态</span>
                <span class="detail-field__value">
                  <span class="status-tag" :style="{ background: eventStatusMeta[detailData.status].bg, color: eventStatusMeta[detailData.status].color }">
                    <span class="status-dot" :style="{ background: eventStatusMeta[detailData.status].color }" />
                    {{ eventStatusMeta[detailData.status].label }}
                  </span>
                </span>
              </li>
            </ul>
            <div class="detail-desc-box">
              <span class="detail-desc-label">事件描述</span>
              <p class="detail-desc-text">{{ detailData.desc }}</p>
            </div>
          </div>
        </div>
      </template>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.ps-page {
  height: 100%; display: flex; gap: 8px; padding: 8px; background: $bg-page; overflow: hidden;
}

/* ===== 左侧 ===== */
.left-panel { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; overflow: hidden; }
.list-section { flex: 1; background: #fff; border-radius: 10px; border: 1px solid $border-color-card; display: flex; flex-direction: column; overflow: hidden; }
.left-header { height: 44px; display: flex; align-items: center; padding: 0 16px; flex-shrink: 0; &__title { font-size: 15px; font-weight: 600; color: $text-base; } }
.left-search { display: flex; align-items: center; gap: 8px; padding: 0 14px; height: 40px; border-top: 1px solid $border-color-card; border-bottom: 1px solid $border-color-card; flex-shrink: 0;
  &__icon { font-size: 15px; color: $text-muted; flex-shrink: 0; }
  &__input { flex: 1; border: none; outline: none; background: transparent; font-size: 13px; color: $text-base; font-family: inherit; &::placeholder { color: $text-muted; } }
  &__clear { font-size: 14px; color: $text-muted; cursor: pointer; &:hover { color: $text-base; } }
}
.site-tree { flex: 1; overflow-y: auto; padding: 6px 8px; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
.tree-node { display: flex; align-items: center; gap: 4px; height: 30px; padding: 0 8px; font-size: 13px; color: $text-base; cursor: pointer; border-radius: 6px; &:hover { background: $bg-hover; }
  .tree-arrow { font-size: 10px; color: $text-muted; width: 14px; flex-shrink: 0; }
  .tree-icon { font-size: 13px; color: $text-secondary; flex-shrink: 0; }
  .tree-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tree-count { font-size: 11px; color: $text-muted; background: $bg-page; border-radius: 8px; padding: 0 6px; line-height: 18px; flex-shrink: 0; }
}
.tree-all { font-weight: 600; color: $color-primary; .tree-icon { color: $color-primary; } &.is-selected { background: $color-primary-bg; } }
.tree-province { font-weight: 600; .tree-icon { color: #6e4bff; } }
.tree-city { font-weight: 500; }
.tree-district { font-size: 12px; color: $text-secondary; &.is-selected { background: $color-primary-bg; color: $color-primary; } }
.site-card { border-radius: 8px; cursor: pointer; border: 1px solid $border-color-card; background: #fff; transition: all 0.2s; margin: 4px 0 4px 34px;
  &:hover { border-color: $color-primary; box-shadow: $shadow-card-active; }
  &.is-selected { border-color: $color-primary; background: $color-primary-bg; }
  &__body { padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  &__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  &__name { font-size: 13px; font-weight: 600; color: $text-base; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__area { font-size: 11px; font-weight: 500; color: $text-tertiary; flex-shrink: 0; }
  &__type { font-size: 11px; font-weight: 500; }
}

/* ===== 右侧 ===== */
.right-panel { flex: 1; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }

/* 指标卡 */
.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; flex-shrink: 0; }
.metric-card { background: #fff; border-radius: 10px; padding: 10px 14px; display: flex; flex-direction: column; gap: 6px;
  &__head { display: flex; align-items: center; gap: 8px; }
  &__body { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
}
.metric-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; i { font-size: 16px; } }
.metric-title { font-size: 12px; font-weight: 500; color: $text-secondary; }
.metric-value { font-size: 22px; font-weight: 700; color: $text-base; line-height: 1.1; }
.metric-sub-text { font-size: 11px; color: $text-muted; }

/* 图表区 */
.chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex-shrink: 0; }
.chart-card { background: #fff; border-radius: 10px; padding: 8px 14px; display: flex; flex-direction: column;
  &__head { margin-bottom: 4px; display: flex; align-items: center; gap: 8px; strong { font-size: 13px; font-weight: 600; color: $text-base; } }
}

/* 表格卡 */
.table-card { flex: 1; min-height: 0; background: #fff; border: 1px solid $border-color-card; border-radius: 10px; display: flex; flex-direction: column; overflow: hidden; }
.search-bar { padding: 16px; border-bottom: 1px solid $border-color-card; flex-shrink: 0; }
.search-row { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-end; justify-content: space-between; }
.search-fields { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-end; flex: 1; }
.search-actions { display: flex; gap: 8px; flex-shrink: 0; &--inline { align-items: flex-end; } &--right { align-items: flex-end; } }
.search-item { display: flex; flex-direction: column; gap: 4px;
  label { font-size: 12px; font-weight: 500; color: $text-muted; white-space: nowrap; }
  :deep(.ant-select) { width: 150px; }
  :deep(.ant-select-selector), :deep(.ant-input) { border-radius: 6px !important; font-size: 13px; }
  :deep(.ant-picker) { border-radius: 6px; font-size: 13px; }
  &--kw { :deep(.ant-input) { width: 220px; } }
}
.s-btn { display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 16px; border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s;
  i { font-size: 14px; }
  &:hover { color: $color-primary; border-color: $color-primary; }
  &--primary { background: $color-primary; border-color: $color-primary; color: #fff; &:hover { background: $color-primary-hover; border-color: $color-primary-hover; color: #fff; } }
  &--export { border-color: $color-primary; color: $color-primary; background: $color-primary-bg; &:hover { background: $color-primary; color: #fff; } }
}

.table-body-wrap { flex: 1; min-height: 0; overflow-y: auto; overflow-x: auto; }
.event-table {
  :deep(.ant-table-thead > tr > th) { background: #fafbfc; font-size: 13px; font-weight: 600; color: $text-base; border-bottom: 1px solid $border-color-card; }
  :deep(.ant-table-tbody > tr > td) { font-size: 13px; color: $text-secondary; }
  :deep(.ant-table-tbody > tr) { cursor: pointer; }
  :deep(.ant-table-tbody > tr:hover > td) { background: #faf9ff; }
}
.type-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px; &--fit { width: fit-content; } }
.status-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px; .status-dot { width: 6px; height: 6px; border-radius: 50%; } }
.cell-person { display: flex; align-items: center; gap: 8px;
  &__avatar { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; background: #f0f0f0; flex-shrink: 0; }
  &__name { font-size: 13px; color: $text-base; font-weight: 500; }
}
.detail-btn { display: inline-flex; align-items: center; gap: 4px; border: none; background: transparent; color: $color-primary; font-size: 13px; cursor: pointer; font-family: inherit; padding: 2px 4px; transition: opacity 0.15s; i { font-size: 14px; } &:hover { opacity: 0.8; text-decoration: underline; } }
.action-cell { display: flex; gap: 8px; }
.pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid $border-color-card; flex-shrink: 0; .page-total { font-size: 13px; color: $text-muted; } :deep(.ant-pagination-item) { border-radius: 6px; } :deep(.ant-pagination-item-active) { border-color: $color-primary; a { color: $color-primary; } } }

/* ===== 详情弹窗 ===== */
.detail-modal { display: flex; flex-direction: column; gap: 16px; padding: 4px; }
.detail-hero { display: flex; align-items: center; gap: 14px; padding: 14px 16px; border-radius: 10px; background: linear-gradient(135deg, rgba(110,75,255,0.08), rgba(110,75,255,0.02));
  &__avatar { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; background: #f0f0f0; flex-shrink: 0; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  &__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
  &__name-row { display: flex; align-items: center; gap: 8px; }
  &__name { font-size: 16px; font-weight: 600; color: $text-base; }
  &__meta { display: flex; align-items: center; gap: 8px; }
}
.detail-section { &__title { font-size: 14px; font-weight: 600; color: $text-base; margin-bottom: 8px; padding-left: 8px; border-left: 3px solid $color-primary; } }
.detail-fields { list-style: none; margin: 0; padding: 0; border: 1px solid $border-color-card; border-radius: 8px; overflow: hidden; }
.detail-field { display: flex; gap: 16px; padding: 10px 14px; border-bottom: 1px solid $border-color-card; &:last-child { border-bottom: none; } &__label { width: 100px; flex-shrink: 0; font-size: 13px; color: $text-muted; } &__value { flex: 1; font-size: 13px; color: $text-base; display: flex; align-items: center; gap: 4px; } }
.detail-desc-box { margin-top: 8px; background: #f7f8fa; border-radius: 8px; padding: 10px 14px; .detail-desc-label { font-size: 12px; font-weight: 500; color: $text-muted; display: block; margin-bottom: 4px; } .detail-desc-text { font-size: 13px; color: $text-secondary; line-height: 1.6; margin: 0; } }
</style>
