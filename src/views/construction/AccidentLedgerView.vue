<script setup lang="ts">
/**
 * 事故险肇台账
 * 左侧：工地列表（省市区树）
 * 右侧：搜索栏 + 表格 + 分页 + 详情弹窗（调查/整改/复查流程闭环）
 */
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  constructionSites,
  regionTree,
  formatArea,
  sizeTypeMeta,
  type ConstructionSite,
  type RegionNode
} from './posture.mock'
import {
  accidents,
  accidentLevelMeta,
  accidentLevelOptions,
  accidentTypeMeta,
  accidentTypeOptions,
  accidentStatusMeta,
  accidentStatusOptions,
  sourceMeta,
  type Accident,
  type AccidentLevel,
  type AccidentType,
  type AccidentStatus,
  type ReportSource
} from './accident-ledger.mock'

// ===== 左侧：工地列表 =====
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

// ===== 右侧：搜索条件 =====
const keyword = ref('')
const levelFilter = ref<AccidentLevel | 'all'>('all')
const typeFilter = ref<AccidentType | 'all'>('all')
const statusFilter = ref<AccidentStatus | 'all'>('all')
const sourceFilter = ref<ReportSource | 'all'>('all')

const filteredAccidents = computed(() => {
  let list = accidents.filter(a => selectedSiteIds.value.has(a.siteId))
  if (keyword.value.trim()) {
    const kw = keyword.value.trim().toLowerCase()
    list = list.filter(a => a.title.toLowerCase().includes(kw) || a.description.toLowerCase().includes(kw) || a.location.toLowerCase().includes(kw))
  }
  if (levelFilter.value !== 'all') list = list.filter(a => a.accidentLevel === levelFilter.value)
  if (typeFilter.value !== 'all') list = list.filter(a => a.accidentType === typeFilter.value)
  if (statusFilter.value !== 'all') list = list.filter(a => a.status === statusFilter.value)
  if (sourceFilter.value !== 'all') list = list.filter(a => a.reportSource === sourceFilter.value)
  return list
})

// ===== 分页 =====
const currentPage = ref(1)
const pageSize = ref(10)
const pagedAccidents = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredAccidents.value.slice(start, start + pageSize.value)
})
watch([keyword, levelFilter, typeFilter, statusFilter, sourceFilter, selectedNode], () => { currentPage.value = 1 })
function handleSearch() { currentPage.value = 1 }
function handleReset() {
  keyword.value = ''; levelFilter.value = 'all'; typeFilter.value = 'all'; statusFilter.value = 'all'; sourceFilter.value = 'all'; currentPage.value = 1
}
function handleExport() { message.success(`已导出 ${filteredAccidents.value.length} 条事故险肇记录`) }

// ===== 详情弹窗 =====
const detailVisible = ref(false)
const detailData = ref<Accident | null>(null)
const investigateForm = ref({ rootCause: '' })
const rectifyFormAcc = ref({ measure: '' })
const reviewForm = ref({ result: '' })

function openDetail(record: Accident) {
  detailData.value = record
  investigateForm.value = { rootCause: '' }
  rectifyFormAcc.value = { measure: '' }
  reviewForm.value = { result: '' }
  detailVisible.value = true
}

function submitInvestigate() {
  if (!detailData.value) return
  const a = detailData.value
  a.rootCause = investigateForm.value.rootCause || '待补充'
  a.investigator = '当前用户'
  a.investigateTime = new Date().toISOString().replace('T', ' ').substring(0, 16)
  a.status = 'investigating'
  message.success('调查结果已提交')
  detailVisible.value = false
}

function submitRectifyAcc() {
  if (!detailData.value) return
  const a = detailData.value
  a.rectifyMeasure = rectifyFormAcc.value.measure || '待补充'
  a.rectifier = '当前用户'
  a.rectifyTime = new Date().toISOString().replace('T', ' ').substring(0, 16)
  a.status = 'rectifying'
  message.success('整改措施已提交')
  detailVisible.value = false
}

function submitReview() {
  if (!detailData.value) return
  const a = detailData.value
  a.reviewResult = reviewForm.value.result || '整改措施已落实，经复查合格。'
  a.reviewer = '当前用户'
  a.reviewTime = new Date().toISOString().replace('T', ' ').substring(0, 16)
  a.status = 'closed'
  message.success('复查已完成，事故已结案')
  detailVisible.value = false
}

function actionButtons(a: Accident): { label: string; icon: string; action: string }[] {
  const buttons: { label: string; icon: string; action: string }[] = []
  if (a.status === 'reported') buttons.push({ label: '调查', icon: 'i-ant-design-audit-outlined', action: 'investigate' })
  else if (a.status === 'investigating') buttons.push({ label: '整改', icon: 'i-ant-design-tool-outlined', action: 'rectify' })
  else if (a.status === 'rectifying') buttons.push({ label: '复查', icon: 'i-ant-design-check-circle-outlined', action: 'review' })
  buttons.push({ label: '详情', icon: 'i-ant-design-eye-outlined', action: 'detail' })
  return buttons
}
function onActionClick(a: Accident, _action: string) { openDetail(a) }

// 流程时间线
const timelineSteps = ['上报', '调查', '整改', '结案']
function timelineStatus(a: Accident, stepIdx: number): 'done' | 'current' | 'pending' {
  const statusMap: Record<AccidentStatus, number> = { reported: 0, investigating: 1, rectifying: 2, closed: 3 }
  const currentIdx = statusMap[a.status]
  if (stepIdx < currentIdx) return 'done'
  if (stepIdx === currentIdx) return 'current'
  return 'pending'
}

// ===== 新增事故 =====
const addVisible = ref(false)
const addForm = ref({
  siteId: '' as string,
  title: '',
  accidentType: '' as AccidentType | '',
  accidentLevel: 'general' as AccidentLevel,
  location: '',
  involvedParties: '',
  casualties: 0,
  reportSource: 'manual' as ReportSource,
  reporter: '当前用户',
  occurTime: '',
  description: ''
})
function openAdd() {
  const now = new Date()
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  addForm.value = {
    siteId: constructionSites[0]?.id || '', title: '', accidentType: '', accidentLevel: 'general',
    location: '', involvedParties: '', casualties: 0, reportSource: 'manual', reporter: '当前用户', occurTime: ts, description: ''
  }
  addVisible.value = true
}
function submitAdd() {
  if (!addForm.value.title.trim()) { message.warning('请输入事故标题'); return }
  if (!addForm.value.siteId) { message.warning('请选择工地'); return }
  if (!addForm.value.accidentType) { message.warning('请选择事故类型'); return }
  const site = constructionSites.find(s => s.id === addForm.value.siteId)
  if (!site) return
  const newAcc: Accident = {
    id: `ac-new-${Date.now()}`,
    siteId: site.id, siteName: site.name, siteAddress: site.address,
    title: addForm.value.title,
    description: addForm.value.description || '—',
    accidentLevel: addForm.value.accidentLevel,
    accidentType: addForm.value.accidentType as AccidentType,
    occurTime: addForm.value.occurTime || new Date().toISOString().replace('T', ' ').substring(0, 16),
    location: addForm.value.location || '—',
    thumb: site.thumb,
    involvedParties: addForm.value.involvedParties || '—',
    casualties: addForm.value.casualties || 0,
    reportSource: addForm.value.reportSource,
    reporter: addForm.value.reporter || '当前用户',
    status: addForm.value.reportSource === 'ai' ? 'investigating' : 'reported'
  }
  accidents.unshift(newAcc)
  message.success('事故已上报')
  addVisible.value = false
}
</script>

<template>
  <div class="al-page">
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

    <!-- ===== 右侧：搜索 + 表格 ===== -->
    <main class="right-panel">
      <div class="search-bar">
        <div class="search-row">
          <div class="search-fields">
            <div class="search-item">
              <label>事故等级</label>
              <a-select v-model:value="levelFilter" allow-clear placeholder="全部等级">
                <a-select-option value="all">全部等级</a-select-option>
                <a-select-option v-for="l in accidentLevelOptions" :key="l.value" :value="l.value">{{ l.label }}</a-select-option>
              </a-select>
            </div>
            <div class="search-item">
              <label>事故类型</label>
              <a-select v-model:value="typeFilter" allow-clear placeholder="全部类型">
                <a-select-option value="all">全部类型</a-select-option>
                <a-select-option v-for="t in accidentTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</a-select-option>
              </a-select>
            </div>
            <div class="search-item">
              <label>处理状态</label>
              <a-select v-model:value="statusFilter" allow-clear placeholder="全部状态">
                <a-select-option value="all">全部状态</a-select-option>
                <a-select-option v-for="s in accidentStatusOptions" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
              </a-select>
            </div>
            <div class="search-item">
              <label>上报来源</label>
              <a-select v-model:value="sourceFilter" allow-clear placeholder="全部来源">
                <a-select-option value="all">全部来源</a-select-option>
                <a-select-option value="manual">人工上报</a-select-option>
                <a-select-option value="ai">AI上报</a-select-option>
              </a-select>
            </div>
            <div class="search-item search-item--kw">
              <label>关键字</label>
              <a-input v-model:value="keyword" placeholder="搜索标题/经过/位置" allow-clear />
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
            <button class="s-btn s-btn--add" @click="openAdd">
              <i class="i-ant-design-plus-outlined" />新增事故
            </button>
          </div>
        </div>
      </div>

      <!-- 表格 -->
      <div class="table-card">
        <div class="table-body-wrap">
          <a-table
            :data-source="pagedAccidents"
            :pagination="false"
            row-key="id"
            :scroll="{ x: 1400 }"
            size="middle"
            class="accident-table"
            :custom-row="(record) => ({ onClick: () => openDetail(record) })"
          >
            <a-table-column title="缩略图" :width="80">
              <template #default="{ record }">
                <div class="cell-thumb">
                  <img :src="record.thumb" :alt="record.title" draggable="false" />
                </div>
              </template>
            </a-table-column>

            <a-table-column title="工地" data-index="siteName" :width="160" :ellipsis="true" />

            <a-table-column title="事故信息" :width="220">
              <template #default="{ record }">
                <div class="cell-info">
                  <span class="type-tag type-tag--fit" :style="{ background: accidentTypeMeta[record.accidentType as AccidentType].color + '18', color: accidentTypeMeta[record.accidentType as AccidentType].color }">
                    {{ accidentTypeMeta[record.accidentType as AccidentType].label }}
                  </span>
                  <span class="cell-info__title" :title="record.title">{{ record.title }}</span>
                </div>
              </template>
            </a-table-column>

            <a-table-column title="事故等级" :width="90">
              <template #default="{ record }">
                <span class="type-tag type-tag--fit" :style="{ background: accidentLevelMeta[record.accidentLevel as AccidentLevel].bg, color: accidentLevelMeta[record.accidentLevel as AccidentLevel].color }">
                  {{ accidentLevelMeta[record.accidentLevel as AccidentLevel].label }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="涉事人员/设备" data-index="involvedParties" :width="140" :ellipsis="true" />

            <a-table-column title="上报人" :width="120">
              <template #default="{ record }">
                <div class="cell-reporter">
                  <span class="cell-reporter__name">{{ record.reporter }}</span>
                  <span class="source-tag" :style="{ color: sourceMeta[record.reportSource as ReportSource].color }">
                    <i :class="sourceMeta[record.reportSource as ReportSource].icon" />
                    {{ sourceMeta[record.reportSource as ReportSource].label }}
                  </span>
                </div>
              </template>
            </a-table-column>

            <a-table-column title="伤亡" :width="70">
              <template #default="{ record }">
                <span :style="{ color: record.casualties > 0 ? '#ff4d4f' : '$text-muted', fontWeight: record.casualties > 0 ? 600 : 400 }">
                  {{ record.casualties > 0 ? record.casualties + '人' : '无' }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="处理状态" :width="100">
              <template #default="{ record }">
                <span class="status-tag" :style="{ background: accidentStatusMeta[record.status as AccidentStatus].bg, color: accidentStatusMeta[record.status as AccidentStatus].color }">
                  <span class="status-dot" :style="{ background: accidentStatusMeta[record.status as AccidentStatus].color }" />
                  {{ accidentStatusMeta[record.status as AccidentStatus].label }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="事发时间" data-index="occurTime" :width="160" />

            <a-table-column title="操作" :width="140" fixed="right">
              <template #default="{ record }">
                <div class="action-cell">
                  <button
                    v-for="btn in actionButtons(record)"
                    :key="btn.action"
                    class="detail-btn"
                    @click.stop="onActionClick(record, btn.action)"
                  >
                    <i :class="btn.icon" />{{ btn.label }}
                  </button>
                </div>
              </template>
            </a-table-column>
          </a-table>
        </div>

        <div class="pagination-bar">
          <span class="page-total">共 {{ filteredAccidents.length }} 条</span>
          <a-pagination
            v-model:current="currentPage"
            v-model:page-size="pageSize"
            :total="filteredAccidents.length"
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
      :width="720"
      centered
      title="事故险肇详情"
      :footer="null"
      @cancel="detailVisible = false"
    >
      <template v-if="detailData">
        <div class="detail-modal">
          <!-- 截图 -->
          <div class="detail-thumb">
            <img :src="detailData.thumb" :alt="detailData.title" />
            <span class="detail-thumb-type" :style="{ background: accidentTypeMeta[detailData.accidentType].color }">
              {{ accidentTypeMeta[detailData.accidentType].label }}
            </span>
            <span class="detail-thumb-status" :style="{ background: accidentStatusMeta[detailData.status].color }">
              {{ accidentStatusMeta[detailData.status].label }}
            </span>
          </div>

          <!-- 基本信息 -->
          <div class="detail-section">
            <div class="detail-section__title">基本信息</div>
            <ul class="detail-fields">
              <li class="detail-field">
                <span class="detail-field__label">事故标题</span>
                <span class="detail-field__value">{{ detailData.title }}</span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">所属工地</span>
                <span class="detail-field__value">{{ detailData.siteName }}</span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">事发时间</span>
                <span class="detail-field__value">{{ detailData.occurTime }}</span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">事发位置</span>
                <span class="detail-field__value">{{ detailData.location }}</span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">事故等级</span>
                <span class="detail-field__value">
                  <span class="type-tag type-tag--fit" :style="{ background: accidentLevelMeta[detailData.accidentLevel].bg, color: accidentLevelMeta[detailData.accidentLevel].color }">
                    {{ accidentLevelMeta[detailData.accidentLevel].label }}
                  </span>
                </span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">事故类型</span>
                <span class="detail-field__value">
                  <i :class="accidentTypeMeta[detailData.accidentType].icon" :style="{ color: accidentTypeMeta[detailData.accidentType].color }" />
                  {{ accidentTypeMeta[detailData.accidentType].label }}
                </span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">涉事人员/设备</span>
                <span class="detail-field__value">{{ detailData.involvedParties }}</span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">上报来源</span>
                <span class="detail-field__value">
                  <i :class="sourceMeta[detailData.reportSource].icon" :style="{ color: sourceMeta[detailData.reportSource].color }" />
                  {{ sourceMeta[detailData.reportSource].label }}
                </span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">上报人</span>
                <span class="detail-field__value">{{ detailData.reporter }}</span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">伤亡人数</span>
                <span class="detail-field__value" :style="{ color: detailData.casualties > 0 ? '#ff4d4f' : undefined, fontWeight: detailData.casualties > 0 ? 600 : 400 }">
                  {{ detailData.casualties > 0 ? detailData.casualties + ' 人' : '无伤亡' }}
                </span>
              </li>
            </ul>
            <div class="detail-desc-box">
              <span class="detail-desc-label">事件完整经过</span>
              <p class="detail-desc-text">{{ detailData.description }}</p>
            </div>
          </div>

          <!-- 调查区 -->
          <div class="detail-section">
            <div class="detail-section__title">根因调查</div>
            <template v-if="detailData.status === 'reported'">
              <div class="assess-form">
                <div class="form-row">
                  <label class="form-label">根因判定</label>
                  <a-textarea v-model:value="investigateForm.rootCause" :rows="3" placeholder="请输入事故根因分析" />
                </div>
                <div class="form-actions">
                  <button class="s-btn s-btn--primary" @click="submitInvestigate">
                    <i class="i-ant-design-check-outlined" />提交调查
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <ul class="detail-fields">
                <li class="detail-field">
                  <span class="detail-field__label">调查人</span>
                  <span class="detail-field__value">{{ detailData.investigator }}</span>
                </li>
                <li class="detail-field">
                  <span class="detail-field__label">调查时间</span>
                  <span class="detail-field__value">{{ detailData.investigateTime }}</span>
                </li>
              </ul>
              <div class="detail-desc-box" v-if="detailData.rootCause">
                <span class="detail-desc-label">根因判定</span>
                <p class="detail-desc-text">{{ detailData.rootCause }}</p>
              </div>
            </template>
          </div>

          <!-- 整改预防区 -->
          <template v-if="detailData.status !== 'reported'">
            <div class="detail-section">
              <div class="detail-section__title">整改预防</div>
              <template v-if="detailData.status === 'investigating'">
                <div class="assess-form">
                  <div class="form-row">
                    <label class="form-label">整改预防措施</label>
                    <a-textarea v-model:value="rectifyFormAcc.measure" :rows="3" placeholder="请输入整改预防措施" />
                  </div>
                  <div class="form-actions">
                    <button class="s-btn s-btn--primary" @click="submitRectifyAcc">
                      <i class="i-ant-design-check-outlined" />提交整改
                    </button>
                  </div>
                </div>
              </template>
              <template v-else>
                <ul class="detail-fields">
                  <li class="detail-field">
                    <span class="detail-field__label">整改人</span>
                    <span class="detail-field__value">{{ detailData.rectifier }}</span>
                  </li>
                  <li class="detail-field">
                    <span class="detail-field__label">整改时间</span>
                    <span class="detail-field__value">{{ detailData.rectifyTime }}</span>
                  </li>
                </ul>
                <div class="detail-desc-box" v-if="detailData.rectifyMeasure">
                  <span class="detail-desc-label">整改预防措施</span>
                  <p class="detail-desc-text">{{ detailData.rectifyMeasure }}</p>
                </div>
                <div class="detail-rectify-thumb" v-if="detailData.rectifyThumb">
                  <span class="detail-desc-label">整改后照片</span>
                  <img :src="detailData.rectifyThumb" alt="整改后" />
                </div>
              </template>
            </div>
          </template>

          <!-- 复查区 -->
          <template v-if="detailData.status === 'rectifying' || detailData.status === 'closed'">
            <div class="detail-section">
              <div class="detail-section__title">复查结案</div>
              <template v-if="detailData.status === 'rectifying'">
                <div class="assess-form">
                  <div class="form-row">
                    <label class="form-label">复查记录</label>
                    <a-textarea v-model:value="reviewForm.result" :rows="2" placeholder="请输入复查结果" />
                  </div>
                  <div class="form-actions">
                    <button class="s-btn s-btn--primary" @click="submitReview">
                      <i class="i-ant-design-check-outlined" />提交复查
                    </button>
                  </div>
                </div>
              </template>
              <template v-else>
                <ul class="detail-fields">
                  <li class="detail-field">
                    <span class="detail-field__label">复查人</span>
                    <span class="detail-field__value">{{ detailData.reviewer }}</span>
                  </li>
                  <li class="detail-field">
                    <span class="detail-field__label">复查时间</span>
                    <span class="detail-field__value">{{ detailData.reviewTime }}</span>
                  </li>
                </ul>
                <div class="detail-desc-box" v-if="detailData.reviewResult">
                  <span class="detail-desc-label">复查记录</span>
                  <p class="detail-desc-text">{{ detailData.reviewResult }}</p>
                </div>
              </template>
            </div>
          </template>

          <!-- 流程时间线 -->
          <div class="detail-timeline">
            <div
              v-for="(label, i) in timelineSteps"
              :key="i"
              class="timeline-step"
              :class="timelineStatus(detailData, i)"
            >
              <div class="timeline-dot" />
              <span class="timeline-label">{{ label }}</span>
              <div v-if="i < timelineSteps.length - 1" class="timeline-line" />
            </div>
          </div>
        </div>
      </template>
    </a-modal>

    <!-- ===== 新增事故弹窗 ===== -->
    <a-modal
      v-model:open="addVisible"
      :width="560"
      centered
      title="新增事故险肇"
      :footer="null"
      @cancel="addVisible = false"
    >
      <div class="add-form">
        <div class="form-row">
          <label class="form-label">所属工地</label>
          <a-select v-model:value="addForm.siteId" placeholder="请选择工地" style="width: 100%">
            <a-select-option v-for="s in constructionSites" :key="s.id" :value="s.id">{{ s.name }}</a-select-option>
          </a-select>
        </div>
        <div class="form-row">
          <label class="form-label">事故标题</label>
          <a-input v-model:value="addForm.title" placeholder="请输入事故标题" />
        </div>
        <div class="form-row">
          <label class="form-label">事故类型</label>
          <a-select v-model:value="addForm.accidentType" placeholder="请选择类型" style="width: 100%">
            <a-select-option v-for="t in accidentTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</a-select-option>
          </a-select>
        </div>
        <div class="form-row">
          <label class="form-label">事故等级</label>
          <a-select v-model:value="addForm.accidentLevel" placeholder="请选择等级" style="width: 100%">
            <a-select-option v-for="l in accidentLevelOptions" :key="l.value" :value="l.value">{{ l.label }}</a-select-option>
          </a-select>
        </div>
        <div class="form-row">
          <label class="form-label">事发位置</label>
          <a-input v-model:value="addForm.location" placeholder="请输入事发位置" />
        </div>
        <div class="form-row">
          <label class="form-label">涉事人员/设备</label>
          <a-input v-model:value="addForm.involvedParties" placeholder="请输入涉事人员或设备" />
        </div>
        <div class="form-row">
          <label class="form-label">伤亡人数</label>
          <a-input-number v-model:value="addForm.casualties" :min="0" style="width: 100%" />
        </div>
        <div class="form-row">
          <label class="form-label">事发时间</label>
          <a-input v-model:value="addForm.occurTime" placeholder="2026-07-13 14:30" />
        </div>
        <div class="form-row">
          <label class="form-label">上报来源</label>
          <a-radio-group v-model:value="addForm.reportSource">
            <a-radio value="manual">人工上报</a-radio>
            <a-radio value="ai">AI上报</a-radio>
          </a-radio-group>
        </div>
        <div class="form-row">
          <label class="form-label">事件经过</label>
          <a-textarea v-model:value="addForm.description" :rows="3" placeholder="请描述事故完整经过" />
        </div>
        <div class="form-actions">
          <button class="s-btn" @click="addVisible = false">取消</button>
          <button class="s-btn s-btn--primary" @click="submitAdd">
            <i class="i-ant-design-check-outlined" />提交上报
          </button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.al-page {
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
.search-bar { background: #fff; border: 1px solid $border-color-card; border-radius: 10px; padding: 20px 16px; flex-shrink: 0; }
.search-row { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-end; justify-content: space-between; }
.search-fields { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-end; flex: 1; }
.search-actions { display: flex; gap: 8px; flex-shrink: 0; &--inline { align-items: flex-end; } &--right { align-items: flex-end; } }
.search-item { display: flex; flex-direction: column; gap: 4px;
  label { font-size: 12px; font-weight: 500; color: $text-muted; white-space: nowrap; }
  :deep(.ant-select) { width: 150px; }
  :deep(.ant-select-selector), :deep(.ant-input) { border-radius: 6px !important; font-size: 13px; }
  &--kw { :deep(.ant-input) { width: 220px; } }
}
.s-btn { display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 16px; border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s;
  i { font-size: 14px; }
  &:hover { color: $color-primary; border-color: $color-primary; }
  &--primary { background: $color-primary; border-color: $color-primary; color: #fff; &:hover { background: $color-primary-hover; border-color: $color-primary-hover; color: #fff; } }
  &--export { border-color: $color-primary; color: $color-primary; background: $color-primary-bg; &:hover { background: $color-primary; color: #fff; } }
  &--add { border: none; background: #52c41a; color: #fff; &:hover { background: #73d13d; color: #fff; } }
}

/* 表格 */
.table-card { flex: 1; min-height: 0; background: #fff; border: 1px solid $border-color-card; border-radius: 10px; display: flex; flex-direction: column; overflow: hidden; }
.table-body-wrap { flex: 1; min-height: 0; overflow-y: auto; overflow-x: auto; }
.accident-table {
  :deep(.ant-table-thead > tr > th) { background: #fafbfc; font-size: 13px; font-weight: 600; color: $text-base; border-bottom: 1px solid $border-color-card; }
  :deep(.ant-table-tbody > tr > td) { font-size: 13px; color: $text-secondary; }
  :deep(.ant-table-tbody > tr) { cursor: pointer; }
  :deep(.ant-table-tbody > tr:hover > td) { background: #faf9ff; }
}
.type-tag { display: inline-flex; align-items: center; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px; &--fit { width: fit-content; } }
.cell-thumb { width: 60px; height: 40px; border-radius: 6px; overflow: hidden; background: #1a1a2e; flex-shrink: 0; img { width: 100%; height: 100%; object-fit: cover; } }
.cell-info { display: flex; flex-direction: column; gap: 4px; &__title { font-size: 13px; font-weight: 400; color: $text-tertiary; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } }
.source-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; i { font-size: 13px; } }
.cell-reporter { display: flex; flex-direction: column; gap: 4px; &__name { font-size: 13px; color: $text-base; } }
.status-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px; .status-dot { width: 6px; height: 6px; border-radius: 50%; } }
.detail-btn { display: inline-flex; align-items: center; gap: 4px; border: none; background: transparent; color: $color-primary; font-size: 13px; cursor: pointer; font-family: inherit; padding: 2px 4px; transition: opacity 0.15s; i { font-size: 14px; } &:hover { opacity: 0.8; text-decoration: underline; } }
.action-cell { display: flex; gap: 8px; }
.pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid $border-color-card; flex-shrink: 0; .page-total { font-size: 13px; color: $text-muted; } :deep(.ant-pagination-item) { border-radius: 6px; } :deep(.ant-pagination-item-active) { border-color: $color-primary; a { color: $color-primary; } } }

/* ===== 详情弹窗 ===== */
.detail-modal { display: flex; flex-direction: column; gap: 16px; padding: 4px; }
.detail-thumb { position: relative; aspect-ratio: 16 / 9; border-radius: 10px; overflow: hidden; background: #1a1a2e;
  img { width: 100%; height: 100%; object-fit: cover; }
  .detail-thumb-type { position: absolute; top: 8px; left: 8px; font-size: 12px; font-weight: 500; color: #fff; padding: 3px 10px; border-radius: 4px; }
  .detail-thumb-status { position: absolute; top: 8px; right: 8px; font-size: 12px; font-weight: 500; color: #fff; padding: 3px 10px; border-radius: 4px; }
}
.detail-section { &__title { font-size: 14px; font-weight: 600; color: $text-base; margin-bottom: 8px; padding-left: 8px; border-left: 3px solid $color-primary; } }
.detail-fields { list-style: none; margin: 0; padding: 0; border: 1px solid $border-color-card; border-radius: 8px; overflow: hidden; }
.detail-field { display: flex; gap: 16px; padding: 10px 14px; border-bottom: 1px solid $border-color-card; &:last-child { border-bottom: none; } &__label { width: 100px; flex-shrink: 0; font-size: 13px; color: $text-muted; } &__value { flex: 1; font-size: 13px; color: $text-base; } }
.detail-desc-box { margin-top: 8px; background: #f7f8fa; border-radius: 8px; padding: 10px 14px; .detail-desc-label { font-size: 12px; font-weight: 500; color: $text-muted; display: block; margin-bottom: 4px; } .detail-desc-text { font-size: 13px; color: $text-secondary; line-height: 1.6; margin: 0; } }
.detail-rectify-thumb { margin-top: 8px; .detail-desc-label { font-size: 12px; font-weight: 500; color: $text-muted; display: block; margin-bottom: 6px; } img { width: 200px; height: 120px; object-fit: cover; border-radius: 8px; } }
.assess-form { display: flex; flex-direction: column; gap: 12px; padding: 12px 14px; background: #f7f8fa; border-radius: 8px; }
.form-row { display: flex; align-items: flex-start; gap: 12px; .form-label { width: 100px; flex-shrink: 0; font-size: 13px; color: $text-muted; line-height: 32px; } :deep(.ant-radio-group) { line-height: 32px; } :deep(.ant-input) { border-radius: 6px; } }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; }
.detail-timeline { display: flex; align-items: center; padding: 16px 0 4px; }
.timeline-step { display: flex; flex-direction: column; align-items: center; position: relative; flex: 1;
  .timeline-dot { width: 24px; height: 24px; border-radius: 50%; border: 2px solid #d9d9d9; background: #fff; display: flex; align-items: center; justify-content: center; position: relative; z-index: 2; transition: all 0.2s; }
  .timeline-label { font-size: 12px; color: $text-muted; margin-top: 6px; }
  .timeline-line { position: absolute; top: 11px; left: 50%; width: 100%; height: 2px; background: #d9d9d9; z-index: 1; }
  &:last-child .timeline-line { display: none; }
  &.done { .timeline-dot { border-color: $color-online; background: $color-online; } .timeline-label { color: $color-online; font-weight: 500; } .timeline-line { background: $color-online; } }
  &.current { .timeline-dot { border-color: $color-primary; background: $color-primary; box-shadow: 0 0 0 4px rgba(110, 75, 255, 0.15); } .timeline-label { color: $color-primary; font-weight: 600; } }
}
</style>
