<script setup lang="ts">
/**
 * 作业许可台账
 * 左侧工地列表 + 右侧搜索+表格+分页+详情弹窗
 */
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  constructionSites, regionTree, formatArea, sizeTypeMeta,
  type ConstructionSite, type RegionNode
} from './posture.mock'
import {
  permits, permitTypeMeta, permitTypeOptions, permitStatusMeta, permitStatusOptions,
  type Permit, type PermitType, type PermitStatus
} from './permit.mock'

// ===== 左侧工地列表 =====
const searchKeyword = ref('')
const filteredSites = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return constructionSites
  return constructionSites.filter(s => s.name.toLowerCase().includes(kw) || s.address.toLowerCase().includes(kw))
})
const searching = computed(() => searchKeyword.value.trim().length > 0)
const expandedKeys = ref<Set<string>>(new Set(['330000', '330100']))
function toggleExpand(node: RegionNode) { expandedKeys.value.has(node.code) ? expandedKeys.value.delete(node.code) : expandedKeys.value.add(node.code) }
function isExpanded(node: RegionNode): boolean { return searching.value || expandedKeys.value.has(node.code) }
function siteCount(node: RegionNode): number { return node.sites?.length || node.children?.reduce((s, c) => s + siteCount(c), 0) || 0 }
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
function isSiteVisible(site: ConstructionSite): boolean { return filteredSites.value.some(s => s.id === site.id) }
const selectedNode = ref<{ type: 'site' | 'region'; id: string } | null>(null)
function selectSite(site: ConstructionSite) { selectedNode.value = { type: 'site', id: site.id } }

const selectedSiteIds = computed<Set<string>>(() => {
  if (!selectedNode.value) return new Set(constructionSites.map(s => s.id))
  if (selectedNode.value.type === 'site') return new Set([selectedNode.value.id])
  const result = new Set<string>()
  function find(nodes: RegionNode[], code: string): boolean {
    for (const n of nodes) { if (n.code === code) { collectSites(n).forEach(s => result.add(s.id)); return true } if (n.children && find(n.children, code)) return true }
    return false
  }
  find(regionTree, selectedNode.value.id)
  return result
})

// ===== 搜索 =====
const keyword = ref('')
const typeFilter = ref<PermitType | 'all'>('all')
const statusFilter = ref<PermitStatus | 'all'>('all')
const filteredPermits = computed(() => {
  let list = permits.filter(p => selectedSiteIds.value.has(p.siteId))
  if (keyword.value.trim()) {
    const kw = keyword.value.trim().toLowerCase()
    list = list.filter(p => p.title.toLowerCase().includes(kw) || p.location.toLowerCase().includes(kw) || p.applicant.toLowerCase().includes(kw))
  }
  if (typeFilter.value !== 'all') list = list.filter(p => p.permitType === typeFilter.value)
  if (statusFilter.value !== 'all') list = list.filter(p => p.status === statusFilter.value)
  return list
})

// ===== 分页 =====
const currentPage = ref(1)
const pageSize = ref(10)
const pagedPermits = computed(() => filteredPermits.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))
watch([keyword, typeFilter, statusFilter, selectedNode], () => { currentPage.value = 1 })
function handleSearch() { currentPage.value = 1 }
function handleReset() { keyword.value = ''; typeFilter.value = 'all'; statusFilter.value = 'all'; currentPage.value = 1 }
function handleExport() { message.success(`已导出 ${filteredPermits.value.length} 条作业许可记录`) }

// ===== 详情弹窗 =====
const detailVisible = ref(false)
const detailData = ref<Permit | null>(null)
function openDetail(record: Permit) { detailData.value = record; detailVisible.value = true }

// ===== 操作按钮：按状态返回不同操作 =====
function actionButtons(p: Permit): { label: string; icon: string; action: string }[] {
  const buttons: { label: string; icon: string; action: string }[] = []
  if (p.status === 'pending') buttons.push({ label: '审批', icon: 'i-ant-design-audit-outlined', action: 'approve' })
  buttons.push({ label: '详情', icon: 'i-ant-design-eye-outlined', action: 'detail' })
  return buttons
}

function onActionClick(p: Permit, action: string) {
  if (action === 'detail') { openDetail(p); return }
  if (action === 'approve') {
    p.status = 'approved'
    p.approver = '当前用户'
    p.approveTime = new Date().toISOString().replace('T', ' ').substring(0, 16)
    p.approveComment = '安全措施已确认，同意作业。'
    message.success('许可已审批通过')
  }
}

// ===== 新增许可 =====
const addVisible = ref(false)
const addForm = ref({
  siteId: '' as string,
  permitType: '' as PermitType | '',
  title: '',
  location: '',
  applicant: '当前用户',
  workStartTime: '',
  workEndTime: '',
  workers: '',
  description: ''
})

function openAdd() {
  const now = new Date()
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  addForm.value = { siteId: constructionSites[0]?.id || '', permitType: '', title: '', location: '', applicant: '当前用户', workStartTime: ts, workEndTime: ts, workers: '', description: '' }
  addVisible.value = true
}

function submitAdd() {
  if (!addForm.value.title.trim()) { message.warning('请输入作业标题'); return }
  if (!addForm.value.siteId) { message.warning('请选择工地'); return }
  if (!addForm.value.permitType) { message.warning('请选择作业类型'); return }
  const site = constructionSites.find(s => s.id === addForm.value.siteId)
  if (!site) return
  const newPermit: Permit = {
    id: `pm-new-${Date.now()}`,
    siteId: site.id, siteName: site.name, siteAddress: site.address,
    permitType: addForm.value.permitType as PermitType,
    title: addForm.value.title,
    location: addForm.value.location || '—',
    applicant: addForm.value.applicant || '当前用户',
    applyTime: new Date().toISOString().replace('T', ' ').substring(0, 16),
    workStartTime: addForm.value.workStartTime,
    workEndTime: addForm.value.workEndTime,
    status: 'pending',
    workers: addForm.value.workers ? addForm.value.workers.split(/[,，\s]+/).filter(Boolean) : [],
    safetyMeasures: ['佩戴安全帽', '佩戴安全带（高处作业）', '设专人监护'],
    thumb: site.thumb
  }
  permits.unshift(newPermit)
  message.success('许可申请已提交')
  addVisible.value = false
}
</script>

<template>
  <div class="pl-page">
    <!-- 左侧 -->
    <aside class="left-panel">
      <div class="list-section">
        <div class="left-header"><span class="left-header__title">工地列表</span></div>
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
                      <article v-for="site in district.sites.filter(s => isSiteVisible(s))" :key="site.id" class="site-card" :class="{ 'is-selected': selectedNode?.type === 'site' && selectedNode.id === site.id }" @click="selectSite(site)">
                        <div class="site-card__body">
                          <div class="site-card__head"><span class="site-card__name" :title="site.name">{{ site.name }}</span><span class="site-card__area">{{ formatArea(site.area) }}</span></div>
                          <div class="site-card__type"><span :style="{ color: sizeTypeMeta[site.sizeType].color }">{{ sizeTypeMeta[site.sizeType].label }}</span></div>
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

    <!-- 右侧 -->
    <main class="right-panel">
      <div class="search-bar">
        <div class="search-row">
          <div class="search-fields">
            <div class="search-item"><label>作业类型</label>
              <a-select v-model:value="typeFilter" allow-clear placeholder="全部类型"><a-select-option value="all">全部类型</a-select-option><a-select-option v-for="t in permitTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</a-select-option></a-select>
            </div>
            <div class="search-item"><label>许可状态</label>
              <a-select v-model:value="statusFilter" allow-clear placeholder="全部状态"><a-select-option value="all">全部状态</a-select-option><a-select-option v-for="s in permitStatusOptions" :key="s.value" :value="s.value">{{ s.label }}</a-select-option></a-select>
            </div>
            <div class="search-item search-item--kw"><label>关键字</label>
              <a-input v-model:value="keyword" placeholder="搜索标题/位置/申请人" allow-clear />
            </div>
            <div class="search-actions search-actions--inline">
              <button class="s-btn s-btn--primary" @click="handleSearch"><i class="i-ant-design-search-outlined" />查询</button>
              <button class="s-btn" @click="handleReset"><i class="i-ant-design-reload-outlined" />重置</button>
            </div>
          </div>
          <div class="search-actions search-actions--right">
            <button class="s-btn s-btn--export" @click="handleExport"><i class="i-ant-design-download-outlined" />导出</button>
            <button class="s-btn s-btn--add" @click="openAdd"><i class="i-ant-design-plus-outlined" />新增许可申请</button>
          </div>
        </div>
      </div>

      <div class="table-card">
        <div class="table-body-wrap">
          <a-table :data-source="pagedPermits" :pagination="false" row-key="id" :scroll="{ x: 1300 }" size="middle" class="permit-table" :custom-row="(record) => ({ onClick: () => openDetail(record) })">
            <a-table-column title="许可编号" data-index="id" :width="100" />
            <a-table-column title="工地" data-index="siteName" :width="160" :ellipsis="true" />
            <a-table-column title="作业信息" :width="220">
              <template #default="{ record }">
                <div class="cell-info">
                  <span class="type-tag type-tag--fit" :style="{ background: permitTypeMeta[record.permitType as PermitType].color + '18', color: permitTypeMeta[record.permitType as PermitType].color }">
                    <i :class="permitTypeMeta[record.permitType as PermitType].icon" />{{ permitTypeMeta[record.permitType as PermitType].label }}
                  </span>
                  <span class="cell-info__title" :title="record.title">{{ record.title }}</span>
                </div>
              </template>
            </a-table-column>
            <a-table-column title="作业位置" data-index="location" :width="140" :ellipsis="true" />
            <a-table-column title="申请人" data-index="applicant" :width="90" />
            <a-table-column title="许可状态" :width="100">
              <template #default="{ record }">
                <span class="status-tag" :style="{ background: permitStatusMeta[record.status as PermitStatus].bg, color: permitStatusMeta[record.status as PermitStatus].color }">
                  <span class="status-dot" :style="{ background: permitStatusMeta[record.status as PermitStatus].color }" />
                  {{ permitStatusMeta[record.status as PermitStatus].label }}
                </span>
              </template>
            </a-table-column>
            <a-table-column title="作业时间" :width="180">
              <template #default="{ record }">
                {{ record.workStartTime.substring(5) }} ~ {{ record.workEndTime.substring(5) }}
              </template>
            </a-table-column>
            <a-table-column title="操作" :width="150" fixed="right">
              <template #default="{ record }">
                <div class="action-cell">
                  <button v-for="btn in actionButtons(record)" :key="btn.action" class="detail-btn" @click.stop="onActionClick(record, btn.action)">
                    <i :class="btn.icon" />{{ btn.label }}
                  </button>
                </div>
              </template>
            </a-table-column>
          </a-table>
        </div>
        <div class="pagination-bar">
          <span class="page-total">共 {{ filteredPermits.length }} 条</span>
          <a-pagination v-model:current="currentPage" v-model:page-size="pageSize" :total="filteredPermits.length" :page-size-options="['10', '20', '50']" show-size-changer show-quick-jumper />
        </div>
      </div>
    </main>

    <!-- 详情弹窗 -->
    <a-modal v-model:open="detailVisible" :width="680" centered title="作业许可详情" :footer="null" @cancel="detailVisible = false">
      <template v-if="detailData">
        <div class="detail-modal">
          <div class="detail-section">
            <div class="detail-section__title">基本信息</div>
            <ul class="detail-fields">
              <li class="detail-field"><span class="detail-field__label">许可编号</span><span class="detail-field__value">{{ detailData.id }}</span></li>
              <li class="detail-field"><span class="detail-field__label">作业类型</span><span class="detail-field__value"><span class="type-tag type-tag--fit" :style="{ background: permitTypeMeta[detailData.permitType].color + '18', color: permitTypeMeta[detailData.permitType].color }"><i :class="permitTypeMeta[detailData.permitType].icon" />{{ permitTypeMeta[detailData.permitType].label }}</span></span></li>
              <li class="detail-field"><span class="detail-field__label">作业标题</span><span class="detail-field__value">{{ detailData.title }}</span></li>
              <li class="detail-field"><span class="detail-field__label">所属工地</span><span class="detail-field__value">{{ detailData.siteName }}</span></li>
              <li class="detail-field"><span class="detail-field__label">作业位置</span><span class="detail-field__value">{{ detailData.location }}</span></li>
              <li class="detail-field"><span class="detail-field__label">申请人</span><span class="detail-field__value">{{ detailData.applicant }}</span></li>
              <li class="detail-field"><span class="detail-field__label">申请时间</span><span class="detail-field__value">{{ detailData.applyTime }}</span></li>
              <li class="detail-field"><span class="detail-field__label">作业时间</span><span class="detail-field__value">{{ detailData.workStartTime }} ~ {{ detailData.workEndTime }}</span></li>
              <li class="detail-field"><span class="detail-field__label">许可状态</span><span class="detail-field__value"><span class="status-tag" :style="{ background: permitStatusMeta[detailData.status].bg, color: permitStatusMeta[detailData.status].color }"><span class="status-dot" :style="{ background: permitStatusMeta[detailData.status].color }" />{{ permitStatusMeta[detailData.status].label }}</span></span></li>
            </ul>
          </div>
          <div class="detail-section">
            <div class="detail-section__title">作业人员</div>
            <div class="worker-tags">
              <span v-for="w in detailData.workers" :key="w" class="worker-tag">{{ w }}</span>
            </div>
          </div>
          <div class="detail-section">
            <div class="detail-section__title">安全措施</div>
            <ul class="measure-list">
              <li v-for="(m, i) in detailData.safetyMeasures" :key="i" class="measure-item">
                <i class="i-ant-design-check-circle-outlined" />{{ m }}
              </li>
            </ul>
          </div>
          <template v-if="detailData.approver">
            <div class="detail-section">
              <div class="detail-section__title">审批信息</div>
              <ul class="detail-fields">
                <li class="detail-field"><span class="detail-field__label">审批人</span><span class="detail-field__value">{{ detailData.approver }}</span></li>
                <li class="detail-field"><span class="detail-field__label">审批时间</span><span class="detail-field__value">{{ detailData.approveTime }}</span></li>
              </ul>
              <div class="detail-desc-box" v-if="detailData.approveComment">
                <span class="detail-desc-label">审批意见</span>
                <p class="detail-desc-text">{{ detailData.approveComment }}</p>
              </div>
            </div>
          </template>
        </div>
      </template>
    </a-modal>

    <!-- 新增许可弹窗 -->
    <a-modal v-model:open="addVisible" :width="560" centered title="新增作业许可" :footer="null" @cancel="addVisible = false">
      <div class="add-form">
        <div class="form-row"><label class="form-label">所属工地</label>
          <a-select v-model:value="addForm.siteId" placeholder="请选择工地" style="width: 100%"><a-select-option v-for="s in constructionSites" :key="s.id" :value="s.id">{{ s.name }}</a-select-option></a-select>
        </div>
        <div class="form-row"><label class="form-label">作业类型</label>
          <a-select v-model:value="addForm.permitType" placeholder="请选择类型" style="width: 100%"><a-select-option v-for="t in permitTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</a-select-option></a-select>
        </div>
        <div class="form-row"><label class="form-label">作业标题</label>
          <a-input v-model:value="addForm.title" placeholder="请输入作业标题" />
        </div>
        <div class="form-row"><label class="form-label">作业位置</label>
          <a-input v-model:value="addForm.location" placeholder="请输入作业位置" />
        </div>
        <div class="form-row"><label class="form-label">作业人员</label>
          <a-input v-model:value="addForm.workers" placeholder="多人用逗号分隔" />
        </div>
        <div class="form-row"><label class="form-label">开始时间</label>
          <a-input v-model:value="addForm.workStartTime" placeholder="2026-07-13 14:30" />
        </div>
        <div class="form-row"><label class="form-label">结束时间</label>
          <a-input v-model:value="addForm.workEndTime" placeholder="2026-07-13 18:00" />
        </div>
        <div class="form-row"><label class="form-label">作业描述</label>
          <a-textarea v-model:value="addForm.description" :rows="2" placeholder="请描述作业内容" />
        </div>
        <div class="form-actions">
          <button class="s-btn" @click="addVisible = false">取消</button>
          <button class="s-btn s-btn--primary" @click="submitAdd"><i class="i-ant-design-check-outlined" />提交申请</button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;
.pl-page { height: 100%; display: flex; gap: 8px; padding: 8px; background: $bg-page; overflow: hidden; }
.left-panel { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; overflow: hidden; }
.list-section { flex: 1; background: #fff; border-radius: 10px; border: 1px solid $border-color-card; display: flex; flex-direction: column; overflow: hidden; }
.left-header { height: 44px; display: flex; align-items: center; padding: 0 16px; flex-shrink: 0; &__title { font-size: 15px; font-weight: 600; color: $text-base; } }
.left-search { display: flex; align-items: center; gap: 8px; padding: 0 14px; height: 40px; border-top: 1px solid $border-color-card; border-bottom: 1px solid $border-color-card; flex-shrink: 0; &__icon { font-size: 15px; color: $text-muted; flex-shrink: 0; } &__input { flex: 1; border: none; outline: none; background: transparent; font-size: 13px; color: $text-base; font-family: inherit; &::placeholder { color: $text-muted; } } &__clear { font-size: 14px; color: $text-muted; cursor: pointer; &:hover { color: $text-base; } } }
.site-tree { flex: 1; overflow-y: auto; padding: 6px 8px; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
.tree-node { display: flex; align-items: center; gap: 4px; height: 30px; padding: 0 8px; font-size: 13px; color: $text-base; cursor: pointer; border-radius: 6px; &:hover { background: $bg-hover; } .tree-arrow { font-size: 10px; color: $text-muted; width: 14px; flex-shrink: 0; } .tree-icon { font-size: 13px; color: $text-secondary; flex-shrink: 0; } .tree-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .tree-count { font-size: 11px; color: $text-muted; background: $bg-page; border-radius: 8px; padding: 0 6px; line-height: 18px; flex-shrink: 0; } }
.tree-all { font-weight: 600; color: $color-primary; .tree-icon { color: $color-primary; } &.is-selected { background: $color-primary-bg; } }
.tree-province { font-weight: 600; .tree-icon { color: #6e4bff; } }
.tree-city { font-weight: 500; }
.tree-district { font-size: 12px; color: $text-secondary; &.is-selected { background: $color-primary-bg; color: $color-primary; } }
.site-card { border-radius: 8px; cursor: pointer; border: 1px solid $border-color-card; background: #fff; transition: all 0.2s; margin: 4px 0 4px 34px; &:hover { border-color: $color-primary; box-shadow: $shadow-card-active; } &.is-selected { border-color: $color-primary; background: $color-primary-bg; } &__body { padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; min-width: 0; } &__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; } &__name { font-size: 13px; font-weight: 600; color: $text-base; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } &__area { font-size: 11px; font-weight: 500; color: $text-tertiary; flex-shrink: 0; } &__type { font-size: 11px; font-weight: 500; } }
.right-panel { flex: 1; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
.search-bar { background: #fff; border: 1px solid $border-color-card; border-radius: 10px; padding: 20px 16px; flex-shrink: 0; }
.search-row { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-end; justify-content: space-between; }
.search-fields { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-end; flex: 1; }
.search-actions { display: flex; gap: 8px; flex-shrink: 0; &--inline { align-items: flex-end; } &--right { align-items: flex-end; } }
.search-item { display: flex; flex-direction: column; gap: 4px; label { font-size: 12px; font-weight: 500; color: $text-muted; white-space: nowrap; } :deep(.ant-select) { width: 150px; } :deep(.ant-select-selector), :deep(.ant-input) { border-radius: 6px !important; font-size: 13px; } &--kw { :deep(.ant-input) { width: 220px; } } }
.s-btn { display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 16px; border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s; i { font-size: 14px; } &:hover { color: $color-primary; border-color: $color-primary; } &--primary { background: $color-primary; border-color: $color-primary; color: #fff; &:hover { background: $color-primary-hover; border-color: $color-primary-hover; color: #fff; } } &--export { border-color: $color-primary; color: $color-primary; background: $color-primary-bg; &:hover { background: $color-primary; color: #fff; } } }
.table-card { flex: 1; min-height: 0; background: #fff; border: 1px solid $border-color-card; border-radius: 10px; display: flex; flex-direction: column; overflow: hidden; }
.table-body-wrap { flex: 1; min-height: 0; overflow-y: auto; overflow-x: auto; }
.permit-table { :deep(.ant-table-thead > tr > th) { background: #fafbfc; font-size: 13px; font-weight: 600; color: $text-base; border-bottom: 1px solid $border-color-card; } :deep(.ant-table-tbody > tr > td) { font-size: 13px; color: $text-secondary; } :deep(.ant-table-tbody > tr) { cursor: pointer; } :deep(.ant-table-tbody > tr:hover > td) { background: #faf9ff; } }
.type-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px; &--fit { width: fit-content; } i { font-size: 12px; } }
.cell-info { display: flex; flex-direction: column; gap: 4px; &__title { font-size: 13px; font-weight: 400; color: $text-tertiary; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } }
.status-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px; .status-dot { width: 6px; height: 6px; border-radius: 50%; } }
.detail-btn { display: inline-flex; align-items: center; gap: 4px; border: none; background: transparent; color: $color-primary; font-size: 13px; cursor: pointer; font-family: inherit; padding: 2px 4px; &:hover { opacity: 0.8; text-decoration: underline; } i { font-size: 14px; } }
.action-cell { display: flex; gap: 8px; }
.add-form { display: flex; flex-direction: column; gap: 12px; padding: 4px; }
.form-row { display: flex; align-items: flex-start; gap: 12px; .form-label { width: 80px; flex-shrink: 0; font-size: 13px; color: $text-muted; line-height: 32px; } :deep(.ant-input) { border-radius: 6px; } }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; }
.s-btn--add { border: none; background: #52c41a; color: #fff; &:hover { background: #73d13d; color: #fff; } }
.pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid $border-color-card; flex-shrink: 0; .page-total { font-size: 13px; color: $text-muted; } :deep(.ant-pagination-item) { border-radius: 6px; } :deep(.ant-pagination-item-active) { border-color: $color-primary; a { color: $color-primary; } } }
.detail-modal { display: flex; flex-direction: column; gap: 16px; padding: 4px; }
.detail-section { &__title { font-size: 14px; font-weight: 600; color: $text-base; margin-bottom: 8px; padding-left: 8px; border-left: 3px solid $color-primary; } }
.detail-fields { list-style: none; margin: 0; padding: 0; border: 1px solid $border-color-card; border-radius: 8px; overflow: hidden; }
.detail-field { display: flex; gap: 16px; padding: 10px 14px; border-bottom: 1px solid $border-color-card; &:last-child { border-bottom: none; } &__label { width: 80px; flex-shrink: 0; font-size: 13px; color: $text-muted; } &__value { flex: 1; font-size: 13px; color: $text-base; } }
.detail-desc-box { margin-top: 8px; background: #f7f8fa; border-radius: 8px; padding: 10px 14px; .detail-desc-label { font-size: 12px; font-weight: 500; color: $text-muted; display: block; margin-bottom: 4px; } .detail-desc-text { font-size: 13px; color: $text-secondary; line-height: 1.6; margin: 0; } }
.worker-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.worker-tag { font-size: 12px; padding: 4px 10px; border-radius: 6px; background: $color-primary-bg; color: $color-primary; }
.measure-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.measure-item { display: flex; align-items: center; gap: 6px; font-size: 13px; color: $text-secondary; i { font-size: 14px; color: $color-online; } }
</style>
