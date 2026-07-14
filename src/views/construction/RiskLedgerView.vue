<script setup lang="ts">
/**
 * 风险隐患台账
 * 左侧：工地列表（省市区树）
 * 右侧：搜索栏 + 表格 + 分页 + 详情弹窗（评估/整改流程闭环）
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
  hazards,
  statusMeta,
  sourceMeta,
  categoryOptions,
  categoryColor,
  riskLevelMeta,
  riskLevelOptions,
  type Hazard,
  type HazardStatus,
  type ReportSource,
  type RiskLevel
} from './risk-ledger.mock'

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

// 选中的工地/区域
const selectedNode = ref<{ type: 'site' | 'region'; id: string } | null>(null)

function selectSite(site: ConstructionSite) {
  selectedNode.value = { type: 'site', id: site.id }
}

// 根据选中节点获取工地 id 集合
const selectedSiteIds = computed<Set<string>>(() => {
  if (!selectedNode.value) {
    // 默认全部
    return new Set(constructionSites.map(s => s.id))
  }
  if (selectedNode.value.type === 'site') {
    return new Set([selectedNode.value.id])
  }
  // region: 查找该区域下所有工地
  const result = new Set<string>()
  function findAndCollect(nodes: RegionNode[], code: string): boolean {
    for (const n of nodes) {
      if (n.code === code) {
        collectSites(n).forEach(s => result.add(s.id))
        return true
      }
      if (n.children && findAndCollect(n.children, code)) return true
    }
    return false
  }
  findAndCollect(regionTree, selectedNode.value.id)
  return result
})

// ===== 右侧：搜索条件 =====
const keyword = ref('')
const progressFilter = ref<string>('all')
const riskLevelFilter = ref<RiskLevel | 'all'>('all')
const categoryFilter = ref<string>('all')
const sourceFilter = ref<ReportSource | 'all'>('all')

const progressOptions = [
  { value: 'all', label: '全部进度' },
  { value: '0', label: '已上报' },
  { value: '1', label: '评估中' },
  { value: '2', label: '整改中' },
  { value: '3', label: '已整改' },
  { value: '4', label: '已关闭' }
]

// 流程阶段索引（在 progressSteps 返回的数组中的位置）
function progressStage(h: Hazard): number {
  if (h.needRectify) {
    // 需要整改：上报 → 评估 → 整改 → 整改完成
    if (h.status === 'pending') return 0
    if (h.status === 'assessing') return 1
    if (h.status === 'rectifying') return 2
    return 3 // closed
  }
  // 不需要整改：上报 → 评估 → 关闭
  if (h.status === 'pending') return 0
  if (h.status === 'assessing') return 1
  return 2 // closed
}

// 获取步骤条标签（根据是否需要整改返回不同流程）
function progressSteps(h: Hazard): string[] {
  if (h.needRectify) {
    return ['上报', '评估', '整改', '整改完成']
  }
  return ['上报', '评估', '关闭']
}

const filteredHazards = computed(() => {
  let list = hazards.filter(h => selectedSiteIds.value.has(h.siteId))

  if (keyword.value.trim()) {
    const kw = keyword.value.trim().toLowerCase()
    list = list.filter(h =>
      h.title.toLowerCase().includes(kw) ||
      h.description.toLowerCase().includes(kw) ||
      h.location.toLowerCase().includes(kw)
    )
  }
  if (progressFilter.value !== 'all') {
    const idx = parseInt(progressFilter.value)
    // 0=已上报 1=评估中 2=整改中 3=已整改 4=已关闭
    if (idx === 0) {
      list = list.filter(h => h.status === 'pending')
    } else if (idx === 1) {
      list = list.filter(h => h.status === 'assessing')
    } else if (idx === 2) {
      list = list.filter(h => h.status === 'rectifying')
    } else if (idx === 3) {
      // 已整改：需要整改且已关闭
      list = list.filter(h => h.status === 'closed' && h.needRectify)
    } else if (idx === 4) {
      // 已关闭：不需要整改且已关闭
      list = list.filter(h => h.status === 'closed' && !h.needRectify)
    }
  }
  if (riskLevelFilter.value !== 'all') {
    list = list.filter(h => h.riskLevel === riskLevelFilter.value)
  }
  if (categoryFilter.value !== 'all') {
    list = list.filter(h => h.category === categoryFilter.value)
  }
  if (sourceFilter.value !== 'all') {
    list = list.filter(h => h.reportSource === sourceFilter.value)
  }
  return list
})

// ===== 分页 =====
const currentPage = ref(1)
const pageSize = ref(10)
const pagedHazards = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredHazards.value.slice(start, start + pageSize.value)
})

watch([keyword, progressFilter, riskLevelFilter, categoryFilter, sourceFilter, selectedNode], () => {
  currentPage.value = 1
})

function handleSearch() { currentPage.value = 1 }
function handleReset() {
  keyword.value = ''
  progressFilter.value = 'all'
  riskLevelFilter.value = 'all'
  categoryFilter.value = 'all'
  sourceFilter.value = 'all'
  currentPage.value = 1
}
function handleExport() {
  message.success(`已导出 ${filteredHazards.value.length} 条风险隐患记录`)
}

// ===== 新增隐患 =====
const addVisible = ref(false)
const addForm = ref({
  siteId: '' as string,
  title: '',
  category: '' as string,
  riskLevel: 'general' as RiskLevel,
  location: '',
  description: '',
  reportSource: 'manual' as ReportSource,
  reporter: '当前用户'
})

function openAdd() {
  addForm.value = {
    siteId: constructionSites[0]?.id || '',
    title: '', category: '', riskLevel: 'general', location: '', description: '',
    reportSource: 'manual', reporter: '当前用户'
  }
  addVisible.value = true
}

function submitAdd() {
  if (!addForm.value.title.trim()) { message.warning('请输入隐患标题'); return }
  if (!addForm.value.siteId) { message.warning('请选择工地'); return }
  if (!addForm.value.category) { message.warning('请选择隐患类别'); return }
  const site = constructionSites.find(s => s.id === addForm.value.siteId)
  if (!site) return
  const newHazard: Hazard = {
    id: `hz-new-${Date.now()}`,
    siteId: site.id,
    siteName: site.name,
    siteAddress: site.address,
    title: addForm.value.title,
    description: addForm.value.description || '—',
    category: addForm.value.category,
    riskLevel: addForm.value.riskLevel,
    location: addForm.value.location || '—',
    thumb: site.thumb,
    reportSource: addForm.value.reportSource,
    reporter: addForm.value.reporter || '当前用户',
    reportTime: new Date().toISOString().replace('T', ' ').substring(0, 16),
    status: 'pending',
    needRectify: false
  }
  hazards.unshift(newHazard)
  message.success('隐患已上报')
  addVisible.value = false
}

// ===== 详情弹窗 =====
const detailVisible = ref(false)
const detailData = ref<Hazard | null>(null)

// 评估表单
const assessForm = ref({
  result: 'valid' as 'valid' | 'invalid',
  needRectify: true,
  comment: ''
})
// 整改表单
const rectifyForm = ref({
  comment: '',
  thumb: ''
})

function openDetail(record: Hazard) {
  detailData.value = record
  // 重置表单
  assessForm.value = { result: 'valid', needRectify: true, comment: '' }
  rectifyForm.value = { comment: '', thumb: '' }
  detailVisible.value = true
}

function submitAssess() {
  if (!detailData.value) return
  const h = detailData.value
  h.assessResult = assessForm.value.result
  h.assessor = '当前用户'
  h.assessTime = new Date().toISOString().replace('T', ' ').substring(0, 16)
  h.assessComment = assessForm.value.comment || (assessForm.value.result === 'valid' ? '隐患属实' : '不构成隐患')
  h.needRectify = assessForm.value.result === 'valid' && assessForm.value.needRectify
  h.status = h.needRectify ? 'rectifying' : 'closed'
  message.success('评估已提交')
  detailVisible.value = false
}

function submitRectify() {
  if (!detailData.value) return
  const h = detailData.value
  h.rectifier = '当前用户'
  h.rectifyTime = new Date().toISOString().replace('T', ' ').substring(0, 16)
  h.rectifyComment = rectifyForm.value.comment || '已完成整改'
  h.rectifyThumb = rectifyForm.value.thumb || h.thumb
  h.status = 'closed'
  message.success('整改已完成')
  detailVisible.value = false
}

// 操作按钮文字
// 操作按钮：始终有"详情"，根据状态额外显示操作按钮
function actionButtons(h: Hazard): { label: string; icon: string; action: string }[] {
  const buttons: { label: string; icon: string; action: string }[] = []
  if (h.status === 'pending') {
    buttons.push({ label: '评估', icon: 'i-ant-design-audit-outlined', action: 'assess' })
  } else if (h.status === 'rectifying') {
    buttons.push({ label: '整改', icon: 'i-ant-design-tool-outlined', action: 'rectify' })
  }
  buttons.push({ label: '详情', icon: 'i-ant-design-eye-outlined', action: 'detail' })
  return buttons
}

function onActionClick(h: Hazard, _action: string) {
  openDetail(h)
}

// 流程时间线
const timelineSteps = [
  { key: 'report', label: '上报' },
  { key: 'assess', label: '评估' },
  { key: 'rectify', label: '整改' },
  { key: 'close', label: '关闭' }
]

function timelineStatus(h: Hazard, step: string): 'done' | 'current' | 'pending' {
  const order = ['report', 'assess', 'rectify', 'close']
  const statusMap: Record<HazardStatus, number> = {
    pending: 0,
    assessing: 1,
    rectifying: 2,
    closed: 3
  }
  const currentIdx = statusMap[h.status]
  const stepIdx = order.indexOf(step)
  if (stepIdx < currentIdx) return 'done'
  if (stepIdx === currentIdx) return 'current'
  // 特殊：不属实且已关闭，跳过整改
  if (h.status === 'closed' && !h.needRectify && step === 'rectify') return 'pending'
  if (h.status === 'closed' && stepIdx <= 3) return 'done'
  return 'pending'
}

</script>

<template>
  <div class="rl-page">
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
          <!-- 全部工地 -->
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
      <!-- 搜索栏 -->
      <div class="search-bar">
        <div class="search-row">
          <div class="search-fields">
            <div class="search-item">
              <label>流程进度</label>
              <a-select v-model:value="progressFilter" allow-clear placeholder="全部进度">
                <a-select-option v-for="p in progressOptions" :key="p.value" :value="p.value">{{ p.label }}</a-select-option>
              </a-select>
            </div>
            <div class="search-item">
              <label>风险等级</label>
              <a-select v-model:value="riskLevelFilter" allow-clear placeholder="全部等级">
                <a-select-option value="all">全部等级</a-select-option>
                <a-select-option v-for="r in riskLevelOptions" :key="r.value" :value="r.value">{{ r.label }}</a-select-option>
              </a-select>
            </div>
            <div class="search-item">
              <label>隐患类别</label>
              <a-select v-model:value="categoryFilter" allow-clear placeholder="全部类别">
                <a-select-option value="all">全部类别</a-select-option>
                <a-select-option v-for="c in categoryOptions" :key="c.value" :value="c.value">{{ c.label }}</a-select-option>
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
              <a-input v-model:value="keyword" placeholder="搜索标题/描述/位置" allow-clear />
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
              <i class="i-ant-design-plus-outlined" />新增隐患
            </button>
          </div>
        </div>
      </div>

      <!-- 表格 -->
      <div class="table-card">
        <div class="table-body-wrap">
          <a-table
            :data-source="pagedHazards"
            :pagination="false"
            row-key="id"
            :scroll="{ x: 1400 }"
            size="middle"
            class="hazard-table"
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

            <a-table-column title="风险等级" :width="90">
              <template #default="{ record }">
                <span class="type-tag type-tag--fit" :style="{ background: riskLevelMeta[record.riskLevel as RiskLevel].bg, color: riskLevelMeta[record.riskLevel as RiskLevel].color }">
                  {{ riskLevelMeta[record.riskLevel as RiskLevel].label }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="隐患信息" :width="220">
              <template #default="{ record }">
                <div class="cell-info">
                  <span class="type-tag type-tag--fit" :style="{ background: categoryColor(record.category) + '18', color: categoryColor(record.category) }">
                    {{ record.category }}
                  </span>
                  <span class="cell-info__title" :title="record.title">{{ record.title }}</span>
                </div>
              </template>
            </a-table-column>

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

            <a-table-column title="流程进度" :width="240">
              <template #default="{ record }">
                <div class="progress-bar">
                  <div
                    v-for="(label, i) in progressSteps(record)"
                    :key="i"
                    class="progress-step"
                    :class="{
                      'is-done': i < progressStage(record),
                      'is-current': i === progressStage(record)
                    }"
                  >
                    <span class="progress-step__dot" />
                    <span class="progress-step__label">{{ label }}</span>
                  </div>
                </div>
              </template>
            </a-table-column>

            <a-table-column title="上报时间" data-index="reportTime" :width="160" />

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

        <!-- 分页 -->
        <div class="pagination-bar">
          <span class="page-total">共 {{ filteredHazards.length }} 条</span>
          <a-pagination
            v-model:current="currentPage"
            v-model:page-size="pageSize"
            :total="filteredHazards.length"
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
      title="风险隐患详情"
      :footer="null"
      @cancel="detailVisible = false"
    >
      <template v-if="detailData">
        <div class="detail-modal">
          <!-- 截图 -->
          <div class="detail-thumb">
            <img :src="detailData.thumb" :alt="detailData.title" />
            <span class="detail-thumb-type" :style="{ background: categoryColor(detailData.category) }">
              {{ detailData.category }}
            </span>
            <span class="detail-thumb-status" :style="{ background: statusMeta[detailData.status].color }">
              {{ statusMeta[detailData.status].label }}
            </span>
          </div>

          <!-- 基本信息 -->
          <div class="detail-section">
            <div class="detail-section__title">基本信息</div>
            <ul class="detail-fields">
              <li class="detail-field">
                <span class="detail-field__label">隐患标题</span>
                <span class="detail-field__value">{{ detailData.title }}</span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">所属工地</span>
                <span class="detail-field__value">{{ detailData.siteName }}</span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">风险等级</span>
                <span class="detail-field__value">
                  <span class="type-tag type-tag--fit" :style="{ background: riskLevelMeta[detailData.riskLevel].bg, color: riskLevelMeta[detailData.riskLevel].color }">
                    {{ riskLevelMeta[detailData.riskLevel].label }}
                  </span>
                </span>
              </li>
              <li class="detail-field">
                <span class="detail-field__label">隐患位置</span>
                <span class="detail-field__value">{{ detailData.location }}</span>
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
                <span class="detail-field__label">上报时间</span>
                <span class="detail-field__value">{{ detailData.reportTime }}</span>
              </li>
            </ul>
            <div class="detail-desc-box">
              <span class="detail-desc-label">隐患描述</span>
              <p class="detail-desc-text">{{ detailData.description }}</p>
            </div>
          </div>

          <!-- 评估区 -->
          <div class="detail-section">
            <div class="detail-section__title">评估信息</div>
            <template v-if="detailData.status === 'pending'">
              <!-- 评估表单 -->
              <div class="assess-form">
                <div class="form-row">
                  <label class="form-label">评估结果</label>
                  <a-radio-group v-model:value="assessForm.result">
                    <a-radio value="valid">属实</a-radio>
                    <a-radio value="invalid">不属实</a-radio>
                  </a-radio-group>
                </div>
                <div class="form-row" v-if="assessForm.result === 'valid'">
                  <label class="form-label">是否需要整改</label>
                  <a-radio-group v-model:value="assessForm.needRectify">
                    <a-radio :value="true">需要整改</a-radio>
                    <a-radio :value="false">不需要整改</a-radio>
                  </a-radio-group>
                </div>
                <div class="form-row">
                  <label class="form-label">评估意见</label>
                  <a-textarea v-model:value="assessForm.comment" :rows="2" placeholder="请输入评估意见" />
                </div>
                <div class="form-actions">
                  <button class="s-btn s-btn--primary" @click="submitAssess">
                    <i class="i-ant-design-check-outlined" />提交评估
                  </button>
                </div>
              </div>
            </template>
            <template v-else>
              <!-- 评估结果（只读） -->
              <ul class="detail-fields">
                <li class="detail-field">
                  <span class="detail-field__label">评估结果</span>
                  <span class="detail-field__value">
                    <span class="status-tag" :style="{ background: detailData.assessResult === 'valid' ? 'rgba(82,196,26,0.1)' : 'rgba(140,140,140,0.1)', color: detailData.assessResult === 'valid' ? '#52c41a' : '#8c8c8c' }">
                      {{ detailData.assessResult === 'valid' ? '属实' : '不属实' }}
                    </span>
                  </span>
                </li>
                <li class="detail-field">
                  <span class="detail-field__label">是否需整改</span>
                  <span class="detail-field__value">{{ detailData.needRectify ? '是' : '否' }}</span>
                </li>
                <li class="detail-field">
                  <span class="detail-field__label">评估人</span>
                  <span class="detail-field__value">{{ detailData.assessor }}</span>
                </li>
                <li class="detail-field">
                  <span class="detail-field__label">评估时间</span>
                  <span class="detail-field__value">{{ detailData.assessTime }}</span>
                </li>
              </ul>
              <div class="detail-desc-box" v-if="detailData.assessComment">
                <span class="detail-desc-label">评估意见</span>
                <p class="detail-desc-text">{{ detailData.assessComment }}</p>
              </div>
            </template>
          </div>

          <!-- 整改区 -->
          <template v-if="detailData.needRectify">
            <div class="detail-section">
              <div class="detail-section__title">整改信息</div>
              <template v-if="detailData.status === 'rectifying'">
                <!-- 整改表单 -->
                <div class="assess-form">
                  <div class="form-row">
                    <label class="form-label">整改说明</label>
                    <a-textarea v-model:value="rectifyForm.comment" :rows="2" placeholder="请输入整改说明" />
                  </div>
                  <div class="form-actions">
                    <button class="s-btn s-btn--primary" @click="submitRectify">
                      <i class="i-ant-design-check-outlined" />提交整改
                    </button>
                  </div>
                </div>
              </template>
              <template v-else-if="detailData.status === 'closed' && detailData.rectifier">
                <!-- 整改结果（只读） -->
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
                <div class="detail-desc-box" v-if="detailData.rectifyComment">
                  <span class="detail-desc-label">整改说明</span>
                  <p class="detail-desc-text">{{ detailData.rectifyComment }}</p>
                </div>
                <div class="detail-rectify-thumb" v-if="detailData.rectifyThumb">
                  <span class="detail-desc-label">整改后照片</span>
                  <img :src="detailData.rectifyThumb" alt="整改后" />
                </div>
              </template>
            </div>
          </template>

          <!-- 流程时间线 -->
          <div class="detail-timeline">
            <div
              v-for="(step, i) in timelineSteps"
              :key="step.key"
              class="timeline-step"
              :class="timelineStatus(detailData, step.key)"
            >
              <div class="timeline-dot" />
              <span class="timeline-label">{{ step.label }}</span>
              <div v-if="i < timelineSteps.length - 1" class="timeline-line" />
            </div>
          </div>
        </div>
      </template>
    </a-modal>

    <!-- ===== 新增隐患弹窗 ===== -->
    <a-modal
      v-model:open="addVisible"
      :width="560"
      centered
      title="新增风险隐患"
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
          <label class="form-label">隐患标题</label>
          <a-input v-model:value="addForm.title" placeholder="请输入隐患标题" />
        </div>
        <div class="form-row">
          <label class="form-label">隐患类别</label>
          <a-select v-model:value="addForm.category" placeholder="请选择类别" style="width: 100%">
            <a-select-option v-for="c in categoryOptions" :key="c.value" :value="c.value">{{ c.label }}</a-select-option>
          </a-select>
        </div>
        <div class="form-row">
          <label class="form-label">风险等级</label>
          <a-select v-model:value="addForm.riskLevel" placeholder="请选择等级" style="width: 100%">
            <a-select-option v-for="r in riskLevelOptions" :key="r.value" :value="r.value">{{ r.label }}</a-select-option>
          </a-select>
        </div>
        <div class="form-row">
          <label class="form-label">隐患位置</label>
          <a-input v-model:value="addForm.location" placeholder="请输入隐患位置" />
        </div>
        <div class="form-row">
          <label class="form-label">上报来源</label>
          <a-radio-group v-model:value="addForm.reportSource">
            <a-radio value="manual">人工上报</a-radio>
            <a-radio value="ai">AI上报</a-radio>
          </a-radio-group>
        </div>
        <div class="form-row">
          <label class="form-label">隐患描述</label>
          <a-textarea v-model:value="addForm.description" :rows="3" placeholder="请描述隐患详情" />
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

.rl-page {
  height: 100%;
  display: flex;
  gap: 8px;
  padding: 8px;
  background: $bg-page;
  overflow: hidden;
}

/* ===== 左侧 ===== */
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
  height: 44px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  flex-shrink: 0;

  &__title {
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
  }
}

.left-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  height: 40px;
  border-top: 1px solid $border-color-card;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  &__icon { font-size: 15px; color: $text-muted; flex-shrink: 0; }
  &__input {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: 13px; color: $text-base; font-family: inherit;
    &::placeholder { color: $text-muted; }
  }
  &__clear { font-size: 14px; color: $text-muted; cursor: pointer; &:hover { color: $text-base; } }
}

.site-tree {
  flex: 1;
  overflow-y: auto;
  padding: 6px 8px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
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

.tree-all {
  font-weight: 600;
  color: $color-primary;
  .tree-icon { color: $color-primary; }
  &.is-selected { background: $color-primary-bg; }
}
.tree-province { font-weight: 600; .tree-icon { color: #6e4bff; } }
.tree-city { font-weight: 500; }
.tree-district {
  font-size: 12px; color: $text-secondary;
  &.is-selected { background: $color-primary-bg; color: $color-primary; }
}

.site-card {
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid $border-color-card;
  background: #fff;
  transition: all 0.2s;
  margin: 4px 0 4px 34px;
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
  overflow: hidden;
}

/* 搜索栏 */
.search-bar {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  padding: 20px 16px;
  flex-shrink: 0;
}

.search-row {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: flex-end;
  justify-content: space-between;
}

.search-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: flex-end;
  flex: 1;
}

.search-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;

  &--inline {
    align-items: flex-end;
  }

  &--right {
    align-items: flex-end;
  }
}

.search-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  label { font-size: 12px; font-weight: 500; color: $text-muted; white-space: nowrap; }
  :deep(.ant-select) { width: 150px; }
  :deep(.ant-select-selector),
  :deep(.ant-input) { border-radius: 6px !important; font-size: 13px; }
  &--kw {
    :deep(.ant-input) { width: 220px; }
  }
}

.s-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 16px;
  border: 1px solid $border-color-light;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
  i { font-size: 14px; }
  &:hover { color: $color-primary; border-color: $color-primary; }
  &--primary {
    background: $color-primary; border-color: $color-primary; color: #fff;
    &:hover { background: $color-primary-hover; border-color: $color-primary-hover; color: #fff; }
  }
  &--export {
    border-color: $color-primary; color: $color-primary; background: $color-primary-bg;
    &:hover { background: $color-primary; color: #fff; }
  }
  &--add {
    border: none; background: #52c41a; color: #fff;
    &:hover { background: #73d13d; color: #fff; }
  }
}

/* 流程进度步骤条 */
.progress-bar {
  display: flex;
  align-items: center;
  gap: 0;
}

.progress-step {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;

  &__dot {
    width: 8px; height: 8px; border-radius: 50%;
    border: 2px solid #d9d9d9; background: #fff;
    flex-shrink: 0; transition: all 0.2s;
  }

  &__label {
    font-size: 11px; color: $text-muted; white-space: nowrap;
  }

  /* 连接线 */
  &:not(:last-child)::after {
    content: '';
    flex: 1;
    height: 2px;
    background: #e8e8e8;
    margin: 0 4px;
  }

  &.is-done {
    .progress-step__dot { border-color: #52c41a; background: #52c41a; }
    .progress-step__label { color: #52c41a; }
    &::after { background: #52c41a; }
  }

  &.is-current {
    .progress-step__dot {
      border-color: $color-primary; background: $color-primary;
      box-shadow: 0 0 0 3px rgba(110, 75, 255, 0.15);
    }
    .progress-step__label { color: $color-primary; font-weight: 600; }
  }
}

/* 表格 */
.table-card {
  flex: 1;
  min-height: 0;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-body-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
}

.hazard-table {
  :deep(.ant-table-thead > tr > th) {
    background: #fafbfc; font-size: 13px; font-weight: 600; color: $text-base;
    border-bottom: 1px solid $border-color-card;
  }
  :deep(.ant-table-tbody > tr > td) { font-size: 13px; color: $text-secondary; }
  :deep(.ant-table-tbody > tr) { cursor: pointer; }
  :deep(.ant-table-tbody > tr:hover > td) { background: #faf9ff; }
}

.type-tag {
  display: inline-flex; align-items: center; font-size: 12px; font-weight: 500;
  padding: 2px 8px; border-radius: 4px;

  &--fit {
    width: fit-content;
  }
}

.source-tag {
  display: inline-flex; align-items: center; gap: 4px; font-size: 12px;
  i { font-size: 13px; }
}

/* 缩略图单元格 */
.cell-thumb {
  width: 60px; height: 40px; border-radius: 6px; overflow: hidden;
  background: #1a1a2e; flex-shrink: 0;
  img { width: 100%; height: 100%; object-fit: cover; }
}

/* 隐患信息单元格（标题+类别） */
.cell-info {
  display: flex; flex-direction: column; gap: 4px;
  &__title {
    font-size: 13px; font-weight: 400; color: $text-tertiary;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
}

/* 上报人单元格（姓名+来源） */
.cell-reporter {
  display: flex; flex-direction: column; gap: 4px;
  &__name { font-size: 13px; color: $text-base; }
}

.status-tag {
  display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500;
  padding: 2px 8px; border-radius: 4px;
  .status-dot { width: 6px; height: 6px; border-radius: 50%; }
}

.detail-btn {
  display: inline-flex; align-items: center; gap: 4px; border: none; background: transparent;
  color: $color-primary; font-size: 13px; cursor: pointer; font-family: inherit;
  padding: 2px 4px; transition: opacity 0.15s;
  i { font-size: 14px; }
  &:hover { opacity: 0.8; text-decoration: underline; }
}

.action-cell {
  display: flex;
  gap: 8px;
}

/* 分页 */
.pagination-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-top: 1px solid $border-color-card; flex-shrink: 0;
  .page-total { font-size: 13px; color: $text-muted; }
  :deep(.ant-pagination-item) { border-radius: 6px; }
  :deep(.ant-pagination-item-active) { border-color: $color-primary; a { color: $color-primary; } }
}

/* ===== 详情弹窗 ===== */
.detail-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px;
}

.detail-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 10px;
  overflow: hidden;
  background: #1a1a2e;
  img { width: 100%; height: 100%; object-fit: cover; }
  .detail-thumb-type {
    position: absolute; top: 8px; left: 8px;
    font-size: 12px; font-weight: 500; color: #fff; padding: 3px 10px; border-radius: 4px;
  }
  .detail-thumb-status {
    position: absolute; top: 8px; right: 8px;
    font-size: 12px; font-weight: 500; color: #fff; padding: 3px 10px; border-radius: 4px;
  }
}

.detail-section {
  &__title {
    font-size: 14px; font-weight: 600; color: $text-base; margin-bottom: 8px;
    padding-left: 8px; border-left: 3px solid $color-primary;
  }
}

.detail-fields {
  list-style: none; margin: 0; padding: 0;
  border: 1px solid $border-color-card; border-radius: 8px; overflow: hidden;
}

.detail-field {
  display: flex; gap: 16px; padding: 10px 14px;
  border-bottom: 1px solid $border-color-card;
  &:last-child { border-bottom: none; }
  &__label { width: 80px; flex-shrink: 0; font-size: 13px; color: $text-muted; }
  &__value { flex: 1; font-size: 13px; color: $text-base; }
}

.detail-desc-box {
  margin-top: 8px;
  background: #f7f8fa; border-radius: 8px; padding: 10px 14px;
  .detail-desc-label { font-size: 12px; font-weight: 500; color: $text-muted; display: block; margin-bottom: 4px; }
  .detail-desc-text { font-size: 13px; color: $text-secondary; line-height: 1.6; margin: 0; }
}

.detail-rectify-thumb {
  margin-top: 8px;
  .detail-desc-label { font-size: 12px; font-weight: 500; color: $text-muted; display: block; margin-bottom: 6px; }
  img { width: 200px; height: 120px; object-fit: cover; border-radius: 8px; }
}

/* 评估/整改表单 */
.assess-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px 14px;
  background: #f7f8fa;
  border-radius: 8px;
}

.form-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  .form-label {
    width: 80px; flex-shrink: 0; font-size: 13px; color: $text-muted;
    line-height: 32px;
  }
  :deep(.ant-radio-group) { line-height: 32px; }
  :deep(.ant-input) { border-radius: 6px; }
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 流程时间线 */
.detail-timeline {
  display: flex;
  align-items: center;
  padding: 16px 0 4px;
}

.timeline-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex: 1;

  .timeline-dot {
    width: 24px; height: 24px; border-radius: 50%;
    border: 2px solid #d9d9d9; background: #fff;
    display: flex; align-items: center; justify-content: center;
    position: relative; z-index: 2;
    transition: all 0.2s;
  }

  .timeline-label {
    font-size: 12px; color: $text-muted; margin-top: 6px;
  }

  .timeline-line {
    position: absolute; top: 11px; left: 50%; width: 100%; height: 2px;
    background: #d9d9d9; z-index: 1;
  }

  &:last-child .timeline-line { display: none; }

  &.done {
    .timeline-dot { border-color: $color-online; background: $color-online; }
    .timeline-label { color: $color-online; font-weight: 500; }
    .timeline-line { background: $color-online; }
  }

  &.current {
    .timeline-dot {
      border-color: $color-primary; background: $color-primary;
      box-shadow: 0 0 0 4px rgba(110, 75, 255, 0.15);
    }
    .timeline-label { color: $color-primary; font-weight: 600; }
  }
}
</style>
