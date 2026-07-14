<script setup lang="ts">
/**
 * 工地人员违章统计
 * 左侧：工地列表（省市区树）
 * 右侧：指标卡片 + 趋势/类型分布图表 + 明细表格 + 详情弹窗
 */
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import ECharts from '@/components/ECharts.vue'
import workerImg1 from '@/assets/construction/worker/1.png'
import workerImg2 from '@/assets/construction/worker/2.png'
import workerImg3 from '@/assets/construction/worker/3.png'
import workerImg4 from '@/assets/construction/worker/4.png'
import {
  constructionSites,
  regionTree,
  formatArea,
  sizeTypeMeta,
  type ConstructionSite,
  type RegionNode
} from './posture.mock'
import {
  violationRecords,
  violationTypeMeta,
  violationTypeOptions,
  violationStatusMeta,
  violationSourceMeta,
  buildViolationTrend,
  buildViolationPie,
  type ViolationRecord,
  type ViolationType,
  type ViolationStatus,
  type ViolationSource
} from './person-stats.mock'

// ===== 左侧：工地列表（复用 AccidentLedgerView 模式）=====
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

// 当前选中范围下的违章记录
const scopedRecords = computed(() => violationRecords.filter(v => selectedSiteIds.value.has(v.siteId)))

// ===== 指标卡片 =====
const monthPrefix = dayjs().format('YYYY-MM')
const metricCards = computed(() => {
  const list = scopedRecords.value.filter(v => v.time.startsWith(monthPrefix))
  return [
    {
      key: 'total', title: '本月违章总数', value: list.length,
      icon: 'i-ant-design-warning-outlined', color: '#6e4bff'
    },
    {
      key: 'pending', title: '待处理', value: list.filter(v => v.status === 'pending').length,
      icon: 'i-ant-design-clock-circle-outlined', color: '#ff4d4f'
    },
    {
      key: 'processing', title: '处理中', value: list.filter(v => v.status === 'processing').length,
      icon: 'i-ant-design-sync-outlined', color: '#fa8c16'
    },
    {
      key: 'resolved', title: '已处理', value: list.filter(v => v.status === 'resolved').length,
      icon: 'i-ant-design-check-circle-outlined', color: '#2bb3a3'
    }
  ]
})

// ===== 图表：趋势折线 + 类型分布饼图 =====
const trendData = computed(() => buildViolationTrend(selectedSiteIds.value))
const pieData = computed(() => buildViolationPie(selectedSiteIds.value))

const trendOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [10, 14],
    textStyle: { color: '#111418', fontSize: 12 },
    axisPointer: { type: 'line', lineStyle: { color: '#6e4bff', type: 'dashed', width: 1 } }
  },
  grid: { left: 36, right: 16, top: 24, bottom: 28 },
  xAxis: {
    type: 'category',
    data: trendData.value.days,
    boundaryGap: false,
    axisLine: { lineStyle: { color: '#dbe4f1' } },
    axisTick: { show: false },
    axisLabel: { color: '#8c8c8c', fontSize: 12 }
  },
  yAxis: {
    type: 'value',
    minInterval: 1,
    splitLine: { lineStyle: { color: '#f0f4f8' } },
    axisLabel: { color: '#8c8c8c', fontSize: 12 }
  },
  series: [{
    name: '违章数',
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 6,
    data: trendData.value.counts,
    lineStyle: { width: 2, color: '#6e4bff' },
    itemStyle: { color: '#6e4bff' },
    areaStyle: {
      color: {
        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [
          { offset: 0, color: 'rgba(110,75,255,0.18)' },
          { offset: 1, color: 'rgba(110,75,255,0)' }
        ]
      }
    }
  }]
}))

const pieOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12],
    textStyle: { color: '#111418', fontSize: 12 }
  },
  legend: { bottom: 0, icon: 'circle', itemWidth: 10, itemHeight: 10, textStyle: { color: '#3a3f47', fontSize: 12 } },
  series: [{
    type: 'pie',
    radius: ['45%', '70%'],
    center: ['50%', '42%'],
    avoidLabelOverlap: true,
    label: { show: true, formatter: '{b}\n{c}次', fontSize: 12, color: '#3a3f47' },
    labelLine: { length: 8, length2: 8 },
    data: pieData.value
  }]
}))

// ===== 搜索条件 =====
const keyword = ref('')
const typeFilter = ref<ViolationType | 'all'>('all')
const statusFilter = ref<ViolationStatus | 'all'>('all')
const timeRange = ref<[dayjs.Dayjs, dayjs.Dayjs]>()

const filteredRecords = computed(() => {
  let list = scopedRecords.value
  if (timeRange.value && timeRange.value.length === 2) {
    const [start, end] = timeRange.value
    const startStr = start.format('YYYY-MM-DD')
    const endStr = end.format('YYYY-MM-DD')
    list = list.filter(v => {
      const dateStr = v.time.substring(0, 10)
      return dateStr >= startStr && dateStr <= endStr
    })
  }
  if (typeFilter.value !== 'all') list = list.filter(v => v.type === typeFilter.value)
  if (statusFilter.value !== 'all') list = list.filter(v => v.status === statusFilter.value)
  if (keyword.value.trim()) {
    const kw = keyword.value.trim().toLowerCase()
    list = list.filter(v => v.personName.toLowerCase().includes(kw) || v.desc.toLowerCase().includes(kw) || v.location.toLowerCase().includes(kw))
  }
  return list
})

// ===== 分页 =====
const currentPage = ref(1)
const pageSize = ref(10)
const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRecords.value.slice(start, start + pageSize.value)
})
watch([keyword, typeFilter, statusFilter, timeRange, selectedNode], () => { currentPage.value = 1 })

function handleSearch() { currentPage.value = 1 }
function handleReset() {
  keyword.value = ''
  typeFilter.value = 'all'
  statusFilter.value = 'all'
  timeRange.value = undefined
  currentPage.value = 1
}
function handleExport() { message.success(`已导出 ${filteredRecords.value.length} 条人员违章记录`) }

// ===== 详情弹窗 =====
const detailVisible = ref(false)
const detailData = ref<ViolationRecord | null>(null)
function openDetail(record: ViolationRecord) {
  detailData.value = record
  detailVisible.value = true
}

// ===== 处理违章 =====
function handleProcess(record: ViolationRecord) {
  record.status = 'resolved'
  message.success(`违章「${record.desc}」已处理`)
}

// ===== 违章上报弹窗 =====
const addVisible = ref(false)
const addForm = reactive({
  personName: '',
  siteId: '' as string,
  type: '' as ViolationType | '',
  desc: '',
  location: ''
})
const workerAvatarPool = [workerImg1, workerImg2, workerImg3, workerImg4]

function openAdd() {
  addForm.personName = ''
  addForm.siteId = constructionSites[0]?.id || ''
  addForm.type = ''
  addForm.desc = ''
  addForm.location = ''
  addVisible.value = true
}

const addError = computed(() => {
  if (!addForm.personName.trim()) return '请输入人员姓名'
  if (!addForm.siteId) return '请选择工地'
  if (!addForm.type) return '请选择违章类型'
  if (!addForm.desc.trim()) return '请输入违章描述'
  return ''
})

function handleAddSubmit() {
  if (addError.value) return
  const site = constructionSites.find(s => s.id === addForm.siteId)
  if (!site) return
  const now = new Date()
  const newRecord: ViolationRecord = {
    id: `v-manual-${Date.now()}`,
    personName: addForm.personName.trim(),
    personAvatar: workerAvatarPool[Math.floor(Math.random() * 4)],
    siteId: site.id,
    siteName: site.name,
    type: addForm.type as ViolationType,
    desc: addForm.desc.trim(),
    time: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    location: addForm.location.trim() || '—',
    status: 'pending',
    source: 'manual'
  }
  violationRecords.unshift(newRecord)
  addVisible.value = false
  message.success('违章上报成功')
}
</script>

<template>
  <div class="pv-page">
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
      <section class="metric-grid">
        <article v-for="card in metricCards" :key="card.key" class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" :style="{ background: card.color }">
              <i :class="card.icon" />
            </span>
            <span class="metric-title">{{ card.title }}</span>
          </div>
          <strong class="metric-value" :style="{ color: card.color }">{{ card.value }}</strong>
        </article>
      </section>

      <!-- 图表区 -->
      <section class="chart-grid">
        <div class="chart-card">
          <div class="chart-card__head">
            <strong>违章趋势（近 7 天）</strong>
          </div>
          <div class="chart-card__body">
            <ECharts :option="trendOption" />
          </div>
        </div>
        <div class="chart-card">
          <div class="chart-card__head">
            <strong>违章类型分布</strong>
          </div>
          <div class="chart-card__body">
            <ECharts :option="pieOption" />
          </div>
        </div>
      </section>

      <!-- 搜索 + 表格 -->
      <div class="table-card">
        <div class="search-bar">
          <div class="search-row">
            <div class="search-fields">
              <div class="search-item">
                <label>时间范围</label>
                <a-range-picker v-model:value="timeRange" :allow-clear="true" />
              </div>
              <div class="search-item">
                <label>违章类型</label>
                <a-select v-model:value="typeFilter" allow-clear placeholder="全部类型">
                  <a-select-option value="all">全部类型</a-select-option>
                  <a-select-option v-for="t in violationTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</a-select-option>
                </a-select>
              </div>
              <div class="search-item">
                <label>处理状态</label>
                <a-select v-model:value="statusFilter" allow-clear placeholder="全部状态">
                  <a-select-option value="all">全部状态</a-select-option>
                  <a-select-option value="pending">待处理</a-select-option>
                  <a-select-option value="processing">处理中</a-select-option>
                  <a-select-option value="resolved">已处理</a-select-option>
                </a-select>
              </div>
              <div class="search-item search-item--kw">
                <label>关键字</label>
                <a-input v-model:value="keyword" placeholder="搜索人员/描述/位置" allow-clear />
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
              <button class="s-btn s-btn--primary" @click="openAdd">
                <i class="i-ant-design-plus-outlined" />违章上报
              </button>
            </div>
          </div>
        </div>

        <div class="table-body-wrap">
          <a-table
            :data-source="pagedRecords"
            :pagination="false"
            row-key="id"
            :scroll="{ x: 1200 }"
            size="middle"
            class="violation-table"
            :custom-row="(record) => ({ onClick: () => openDetail(record) })"
          >
            <a-table-column title="人员" :width="160">
              <template #default="{ record }">
                <div class="cell-person">
                  <img :src="record.personAvatar" :alt="record.personName" class="cell-person__avatar" />
                  <span class="cell-person__name">{{ record.personName }}</span>
                </div>
              </template>
            </a-table-column>

            <a-table-column title="违章类型" :width="130">
              <template #default="{ record }">
                <span class="type-tag type-tag--fit" :style="{ background: violationTypeMeta[record.type as ViolationType].color + '18', color: violationTypeMeta[record.type as ViolationType].color }">
                  <i :class="violationTypeMeta[record.type as ViolationType].icon" />
                  {{ violationTypeMeta[record.type as ViolationType].label }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="违章描述" :width="220" :ellipsis="true">
              <template #default="{ record }">
                <span class="cell-desc">{{ record.desc }}</span>
              </template>
            </a-table-column>

            <a-table-column title="发生时间" data-index="time" :width="160" />

            <a-table-column title="工地" data-index="siteName" :width="160" :ellipsis="true" />

            <a-table-column title="事件来源" :width="100">
              <template #default="{ record }">
                <span class="source-tag" :style="{ background: violationSourceMeta[record.source as ViolationSource].bg, color: violationSourceMeta[record.source as ViolationSource].color }">
                  <i :class="violationSourceMeta[record.source as ViolationSource].icon" />
                  {{ violationSourceMeta[record.source as ViolationSource].label }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="处理状态" :width="100">
              <template #default="{ record }">
                <span class="status-tag" :style="{ background: violationStatusMeta[record.status as ViolationStatus].bg, color: violationStatusMeta[record.status as ViolationStatus].color }">
                  <span class="status-dot" :style="{ background: violationStatusMeta[record.status as ViolationStatus].color }" />
                  {{ violationStatusMeta[record.status as ViolationStatus].label }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="操作" :width="140" fixed="right">
              <template #default="{ record }">
                <div class="row-actions" @click.stop>
                  <button v-if="record.status === 'processing'" class="action-btn action-btn--process" @click="handleProcess(record)">
                    <i class="i-ant-design-tool-outlined" />处理
                  </button>
                  <button class="action-btn" @click="openDetail(record)">
                    <i class="i-ant-design-eye-outlined" />详情
                  </button>
                </div>
              </template>
            </a-table-column>
          </a-table>
        </div>

        <div class="pagination-bar">
          <span class="page-total">共 {{ filteredRecords.length }} 条</span>
          <a-pagination
            v-model:current="currentPage"
            v-model:page-size="pageSize"
            :total="filteredRecords.length"
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
      title="违章详情"
      :footer="null"
      @cancel="detailVisible = false"
    >
      <template v-if="detailData">
        <div class="detail-modal">
          <!-- 人员信息 -->
          <div class="detail-person">
            <img :src="detailData.personAvatar" :alt="detailData.personName" class="detail-person__avatar" />
            <div class="detail-person__info">
              <span class="detail-person__name">{{ detailData.personName }}</span>
              <span class="type-tag type-tag--fit" :style="{ background: violationTypeMeta[detailData.type].color + '18', color: violationTypeMeta[detailData.type].color }">
                <i :class="violationTypeMeta[detailData.type].icon" />
                {{ violationTypeMeta[detailData.type].label }}
              </span>
              <span class="status-tag" :style="{ background: violationStatusMeta[detailData.status].bg, color: violationStatusMeta[detailData.status].color }">
                <span class="status-dot" :style="{ background: violationStatusMeta[detailData.status].color }" />
                {{ violationStatusMeta[detailData.status].label }}
              </span>
            </div>
          </div>

          <!-- 详细信息 -->
          <div class="detail-section">
            <div class="detail-section__title">详细信息</div>
            <ul class="detail-fields">
              <li class="detail-field">
                <span class="detail-field__label">违章描述</span>
                <span class="detail-field__value">{{ detailData.desc }}</span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">发生时间</span>
                <span class="detail-field__value">{{ detailData.time }}</span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">所属工地</span>
                <span class="detail-field__value">{{ detailData.siteName }}</span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">发生位置</span>
                <span class="detail-field__value">{{ detailData.location }}</span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">违章类型</span>
                <span class="detail-field__value">
                  <i :class="violationTypeMeta[detailData.type].icon" :style="{ color: violationTypeMeta[detailData.type].color }" />
                  {{ violationTypeMeta[detailData.type].label }}
                </span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">事件来源</span>
                <span class="detail-field__value">
                  <span class="source-tag" :style="{ background: violationSourceMeta[detailData.source].bg, color: violationSourceMeta[detailData.source].color }">
                    <i :class="violationSourceMeta[detailData.source].icon" />
                    {{ violationSourceMeta[detailData.source].label }}
                  </span>
                </span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">处理状态</span>
                <span class="detail-field__value">
                  <span class="status-tag" :style="{ background: violationStatusMeta[detailData.status].bg, color: violationStatusMeta[detailData.status].color }">
                    <span class="status-dot" :style="{ background: violationStatusMeta[detailData.status].color }" />
                    {{ violationStatusMeta[detailData.status].label }}
                  </span>
                </span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">记录编号</span>
                <span class="detail-field__value">{{ detailData.id }}</span>
              </li>
            </ul>
          </div>
        </div>
      </template>
    </a-modal>

    <!-- ===== 违章上报弹窗 ===== -->
    <a-modal
      v-model:open="addVisible"
      :width="560"
      centered
      title="违章上报"
      ok-text="提交"
      cancel-text="取消"
      :ok-button-props="{ disabled: !!addError }"
      @ok="handleAddSubmit"
    >
      <div class="add-form">
        <div class="add-row-grid">
          <div class="add-row">
            <label class="add-label"><span class="req">*</span>人员姓名</label>
            <a-input v-model:value="addForm.personName" placeholder="请输入人员姓名" allow-clear />
          </div>
          <div class="add-row">
            <label class="add-label"><span class="req">*</span>工地</label>
            <a-select v-model:value="addForm.siteId" style="width:100%">
              <a-select-option v-for="s in constructionSites" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
            </a-select>
          </div>
        </div>
        <div class="add-row-grid">
          <div class="add-row">
            <label class="add-label"><span class="req">*</span>违章类型</label>
            <a-select v-model:value="addForm.type" style="width:100%" placeholder="请选择违章类型">
              <a-select-option v-for="t in violationTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</a-select-option>
            </a-select>
          </div>
          <div class="add-row">
            <label class="add-label">发生位置</label>
            <a-input v-model:value="addForm.location" placeholder="请输入发生位置（选填）" allow-clear />
          </div>
        </div>
        <div class="add-row">
          <label class="add-label"><span class="req">*</span>违章描述</label>
          <a-textarea v-model:value="addForm.desc" :rows="3" placeholder="请描述违章情况" :maxlength="200" show-count />
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.pv-page {
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

/* 指标卡片 */
.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; flex-shrink: 0; }
.metric-card { background: #fff; border-radius: 10px; border: 1px solid $border-color-card; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px; transition: box-shadow 0.2s;
  &:hover { box-shadow: $shadow-card-active; }
  &__head { display: flex; align-items: center; gap: 8px; min-width: 0; }
}
.metric-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; i { font-size: 16px; } }
.metric-title { font-size: 12px; font-weight: 500; color: $text-secondary; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.metric-value { font-size: 24px; font-weight: 700; line-height: 1; flex-shrink: 0; }

/* 图表区 */
.chart-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 8px; flex-shrink: 0; height: 180px; }
.chart-card { background: #fff; border-radius: 10px; border: 1px solid $border-color-card; display: flex; flex-direction: column; overflow: hidden;
  &__head { height: 32px; display: flex; align-items: center; padding: 0 12px; border-bottom: 1px solid $border-color-card; flex-shrink: 0; strong { font-size: 13px; font-weight: 600; color: $text-base; } }
  &__body { flex: 1; min-height: 0; padding: 4px 8px; }
}

/* 搜索栏 */
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

/* 表格 */
.table-card { flex: 1; min-height: 0; background: #fff; border: 1px solid $border-color-card; border-radius: 10px; display: flex; flex-direction: column; overflow: hidden; }
.table-body-wrap { flex: 1; min-height: 0; overflow-y: auto; overflow-x: auto; }
.violation-table {
  :deep(.ant-table-thead > tr > th) { background: #fafbfc; font-size: 13px; font-weight: 600; color: $text-base; border-bottom: 1px solid $border-color-card; }
  :deep(.ant-table-tbody > tr > td) { font-size: 13px; color: $text-secondary; }
  :deep(.ant-table-tbody > tr) { cursor: pointer; }
  :deep(.ant-table-tbody > tr:hover > td) { background: #faf9ff; }
}
.type-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px; i { font-size: 13px; } &--fit { width: fit-content; } }
.cell-person { display: flex; align-items: center; gap: 8px;
  &__avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  &__name { font-size: 13px; font-weight: 500; color: $text-base; }
}
.cell-desc { font-size: 13px; color: $text-secondary; }
.status-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px; .status-dot { width: 6px; height: 6px; border-radius: 50%; } }
.source-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px; white-space: nowrap; i { font-size: 12px; } }
.detail-btn { display: inline-flex; align-items: center; gap: 4px; border: none; background: transparent; color: $color-primary; font-size: 13px; cursor: pointer; font-family: inherit; padding: 2px 4px; transition: opacity 0.15s; i { font-size: 14px; } &:hover { opacity: 0.8; text-decoration: underline; } }

/* 行操作按钮 */
.row-actions { display: flex; gap: 6px; }
.action-btn { display: flex; align-items: center; gap: 3px; border: none; background: transparent; color: $color-primary; font-size: 13px; cursor: pointer; font-family: inherit; padding: 2px 4px; transition: opacity 0.15s;
  i { font-size: 14px; }
  &:hover { opacity: 0.8; text-decoration: underline; }
  &--process { color: #fa8c16; }
}
.pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid $border-color-card; flex-shrink: 0; .page-total { font-size: 13px; color: $text-muted; } :deep(.ant-pagination-item) { border-radius: 6px; } :deep(.ant-pagination-item-active) { border-color: $color-primary; a { color: $color-primary; } } }

/* ===== 详情弹窗 ===== */
.detail-modal { display: flex; flex-direction: column; gap: 16px; padding: 4px; }
.detail-person { display: flex; align-items: center; gap: 14px; padding: 12px 14px; background: #f7f8fa; border-radius: 10px;
  &__avatar { width: 56px; height: 56px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  &__info { display: flex; flex-direction: column; gap: 6px; }
  &__name { font-size: 16px; font-weight: 600; color: $text-base; }
}
.detail-section { &__title { font-size: 14px; font-weight: 600; color: $text-base; margin-bottom: 8px; padding-left: 8px; border-left: 3px solid $color-primary; } }
.detail-fields { list-style: none; margin: 0; padding: 0; border: 1px solid $border-color-card; border-radius: 8px; overflow: hidden; }
.detail-field { display: flex; gap: 16px; padding: 10px 14px; border-bottom: 1px solid $border-color-card; &:last-child { border-bottom: none; } &__label { width: 90px; flex-shrink: 0; font-size: 13px; color: $text-muted; } &__value { flex: 1; font-size: 13px; color: $text-base; display: inline-flex; align-items: center; gap: 4px; } }

/* 违章上报表单 */
.add-form { display: flex; flex-direction: column; gap: 14px; padding: 4px; }
.add-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.add-row { display: flex; flex-direction: column; gap: 4px; }
.add-label { font-size: 13px; font-weight: 500; color: $text-base; .req { color: #ff4d4f; margin-right: 2px; } }
</style>
