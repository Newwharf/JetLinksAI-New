<script setup lang="ts">
/**
 * 监理报告 — 左工地树 + 右统一列表（季报/专报/急报合并）+ 新增 + 详情
 */
import { message } from 'ant-design-vue'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import {
  allSupervisionReports,
  reportTypeMeta,
  statusMeta,
  type UnifiedReport,
  type ReportType,
  type ReportStatus
} from './supervision-report.mock'
import { constructionSites } from './posture.mock'
import SiteTreePanel from './SiteTreePanel.vue'

// ===== 左侧工地列表（使用共享组件）=====
const selectedSiteIds = ref<Set<string>>(new Set(constructionSites.map(s => s.id)))
function handleSiteSelect(selected: { type: 'all' | 'site' | 'region'; id: string; siteIds: Set<string> }) {
  selectedSiteIds.value = selected.siteIds
}

// 选中的工地名称（用于新增弹窗预填）
const selectedSiteName = computed(() => {
  if (selectedSiteIds.value.size !== 1) return ''
  const id = Array.from(selectedSiteIds.value)[0]
  return constructionSites.find(s => s.id === id)?.name || ''
})

// ===== 搜索条件 =====
const reportType = ref<ReportType | 'all'>('all')
const status = ref<ReportStatus | 'all'>('all')
const timeRange = ref<[dayjs.Dayjs, dayjs.Dayjs]>()
const keyword = ref('')

const reportTypeOptions = [
  { value: 'all', label: '全部类型' },
  { value: 'quarterly', label: '监理季报' },
  { value: 'special', label: '监理专报' },
  { value: 'urgent', label: '监理急报' }
]

// ===== 过滤 =====
const filtered = computed(() => {
  let list = allSupervisionReports
  // 工地筛选：通过 siteName 匹配选中的工地
  if (selectedSiteIds.value.size < constructionSites.length) {
    const selectedNames = new Set(
      constructionSites.filter(s => selectedSiteIds.value.has(s.id)).map(s => s.name)
    )
    list = list.filter(r => selectedNames.has(r.siteName))
  }
  // 报告类型
  if (reportType.value !== 'all') list = list.filter(r => r.reportType === reportType.value)
  // 状态
  if (status.value !== 'all') list = list.filter(r => r.status === status.value)
  // 时间范围
  if (timeRange.value && timeRange.value.length === 2) {
    const [s, e] = timeRange.value
    const sStr = s.format('YYYY-MM-DD')
    const eStr = e.format('YYYY-MM-DD')
    list = list.filter(r => {
      const d = (r.submitTime || r.eventTime).substring(0, 10)
      return d >= sStr && d <= eStr
    })
  }
  // 关键字
  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(r =>
      r.title.toLowerCase().includes(kw) ||
      r.reportNo.toLowerCase().includes(kw) ||
      r.siteName.toLowerCase().includes(kw) ||
      r.chiefSupervisor.toLowerCase().includes(kw)
    )
  }
  return list
})

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
watch([selectedSiteIds, reportType, status, timeRange, keyword], () => { currentPage.value = 1 })
const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

// ===== 详情弹窗 =====
const detailVisible = ref(false)
const detailData = ref<UnifiedReport | null>(null)
function openDetail(row: UnifiedReport) {
  detailData.value = row
  detailVisible.value = true
}

// ===== 新增弹窗 =====
const addVisible = ref(false)
const addForm = reactive({
  reportType: 'quarterly' as ReportType,
  siteName: '',
  title: '',
  chiefSupervisor: '',
  content: ''
})

function openAdd() {
  addForm.reportType = 'quarterly'
  addForm.siteName = selectedSiteName.value || ''
  addForm.title = ''
  addForm.chiefSupervisor = ''
  addForm.content = ''
  addVisible.value = true
}

const addError = computed(() => {
  if (!addForm.title.trim()) return '请输入报告标题'
  if (!addForm.siteName.trim()) return '请输入工地名称'
  if (!addForm.chiefSupervisor.trim()) return '请输入总监理工程师'
  if (!addForm.content.trim()) return '请输入报告内容'
  return ''
})

function handleAddSubmit() {
  if (addError.value) return
  message.success(`${reportTypeMeta[addForm.reportType].label}已创建`)
  addVisible.value = false
}

// ===== 导出 =====
function handleExport() {
  message.success(`已导出 ${filtered.value.length} 条监理报告`)
}
</script>

<template>
  <div class="sr-page">
    <div class="sr-body">
      <!-- 左侧工地列表 -->
      <SiteTreePanel @select="handleSiteSelect" />

      <!-- 右侧列表 -->
      <section class="right-col">
        <!-- 搜索栏 -->
        <div class="search-bar">
          <div class="search-row">
            <div class="search-fields">
              <div class="search-item">
                <label>报告类型</label>
                <a-select v-model:value="reportType" allow-clear placeholder="全部类型" style="width: 140px">
                  <a-select-option v-for="o in reportTypeOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
                </a-select>
              </div>
              <div class="search-item">
                <label>状态</label>
                <a-select v-model:value="status" allow-clear placeholder="全部状态" style="width: 140px">
                  <a-select-option value="all">全部状态</a-select-option>
                  <a-select-option value="draft">草稿</a-select-option>
                  <a-select-option value="submitted">已报送</a-select-option>
                  <a-select-option value="reviewed">已审阅</a-select-option>
                  <a-select-option value="archived">已归档</a-select-option>
                </a-select>
              </div>
              <div class="search-item">
                <label>时间</label>
                <a-range-picker v-model:value="timeRange" :allow-clear="true" />
              </div>
              <div class="search-item search-item--kw">
                <label>关键字</label>
                <a-input v-model:value="keyword" placeholder="搜索标题/编号/工地名" allow-clear />
              </div>
              <div class="search-item search-item--btns">
                <button class="s-btn s-btn--primary" @click="currentPage = 1"><i class="i-ant-design-search-outlined" />查询</button>
                <button class="s-btn" @click="reportType = 'all'; status = 'all'; timeRange = undefined; keyword = ''; currentPage = 1"><i class="i-ant-design-reload-outlined" />重置</button>
              </div>
            </div>
            <div class="search-actions">
              <button class="s-btn s-btn--export" @click="handleExport"><i class="i-ant-design-download-outlined" />导出</button>
              <button class="s-btn s-btn--primary" @click="openAdd"><i class="i-ant-design-plus-outlined" />新增</button>
            </div>
          </div>
        </div>

        <!-- 表格 -->
        <div class="table-card">
          <div class="table-scroll-area">
            <a-table :data-source="pagedData" :pagination="false" row-key="id" :scroll="{ x: 1300 }" size="middle">
              <a-table-column title="报告编号" data-index="reportNo" :width="150" />
              <a-table-column title="工地名称" data-index="siteName" :width="160" :ellipsis="true" />
              <a-table-column title="报告类型" :width="110">
                <template #default="{ record }">
                  <span class="type-tag" :style="{ background: reportTypeMeta[record.reportType as ReportType].color + '18', color: reportTypeMeta[record.reportType as ReportType].color }">
                    {{ reportTypeMeta[record.reportType as ReportType].label }}
                  </span>
                </template>
              </a-table-column>
              <a-table-column title="报告标题" data-index="title" :width="240" :ellipsis="true" />
              <a-table-column title="分类标签" :width="120">
                <template #default="{ record }">
                  <span class="sub-tag" :style="{ color: record.tagColor }">{{ record.tagLabel }}</span>
                </template>
              </a-table-column>
              <a-table-column title="总监理工程师" data-index="chiefSupervisor" :width="120" />
              <a-table-column title="状态" :width="100">
                <template #default="{ record }">
                  <span class="status-tag" :style="{ background: statusMeta[record.status as ReportStatus].bg, color: statusMeta[record.status as ReportStatus].color }">
                    <span class="status-dot" :style="{ background: statusMeta[record.status as ReportStatus].color }" />
                    {{ statusMeta[record.status as ReportStatus].label }}
                  </span>
                </template>
              </a-table-column>
              <a-table-column title="报送时间" data-index="submitTime" :width="160">
                <template #default="{ record }">
                  <span v-if="record.submitTime">{{ record.submitTime }}</span>
                  <span v-else class="cell-ph">—</span>
                </template>
              </a-table-column>
              <a-table-column title="操作" :width="100" fixed="right">
                <template #default="{ record }">
                  <button class="detail-btn" @click="openDetail(record)"><i class="i-ant-design-eye-outlined" />查看详情</button>
                </template>
              </a-table-column>
            </a-table>
          </div>
          <!-- 分页 -->
          <div class="pagination-bar">
            <span class="page-total">共 {{ filtered.length }} 条</span>
            <a-pagination v-model:current="currentPage" v-model:page-size="pageSize" :total="filtered.length" :page-size-options="['10', '20', '50']" show-size-changer show-quick-jumper />
          </div>
        </div>
      </section>
    </div>

    <!-- 详情弹窗 -->
    <a-modal v-model:open="detailVisible" :width="680" centered :title="detailData ? reportTypeMeta[detailData.reportType].label + '详情' : '详情'" :footer="null">
      <template v-if="detailData">
        <div class="detail-modal">
          <div class="detail-banner">
            <span class="type-tag lg" :style="{ background: reportTypeMeta[detailData.reportType].color + '18', color: reportTypeMeta[detailData.reportType].color }">
              {{ reportTypeMeta[detailData.reportType].label }}
            </span>
            <span class="status-tag lg" :style="{ background: statusMeta[detailData.status].bg, color: statusMeta[detailData.status].color }">
              <span class="status-dot" :style="{ background: statusMeta[detailData.status].color }" />
              {{ statusMeta[detailData.status].label }}
            </span>
            <span class="detail-report-no">{{ detailData.reportNo }}</span>
          </div>
          <!-- 基本字段 -->
          <ul class="detail-fields">
            <li v-for="(value, label) in detailData.detail" :key="label" class="detail-field" :class="{ 'detail-field--full': value.length > 40 }">
              <span class="detail-field-label">{{ label }}</span>
              <span class="detail-field-value">{{ value }}</span>
            </li>
          </ul>
        </div>
      </template>
    </a-modal>

    <!-- 新增弹窗 -->
    <a-modal :open="addVisible" :width="640" centered title="新增监理报告" @cancel="addVisible = false">
      <div class="add-form">
        <div class="add-row">
          <label class="add-label"><span class="req">*</span>报告类型</label>
          <a-radio-group v-model:value="addForm.reportType">
            <a-radio value="quarterly">监理季报</a-radio>
            <a-radio value="special">监理专报</a-radio>
            <a-radio value="urgent">监理急报</a-radio>
          </a-radio-group>
        </div>
        <div class="add-row">
          <label class="add-label"><span class="req">*</span>工地名称</label>
          <a-input v-model:value="addForm.siteName" placeholder="请输入工地名称" allow-clear />
        </div>
        <div class="add-row">
          <label class="add-label"><span class="req">*</span>报告标题</label>
          <a-input v-model:value="addForm.title" placeholder="请输入报告标题" allow-clear />
        </div>
        <div class="add-row">
          <label class="add-label"><span class="req">*</span>总监理工程师</label>
          <a-input v-model:value="addForm.chiefSupervisor" placeholder="请输入总监理工程师姓名" allow-clear />
        </div>
        <div class="add-row">
          <label class="add-label"><span class="req">*</span>报告内容</label>
          <a-textarea v-model:value="addForm.content" :rows="6" placeholder="请输入报告内容" :maxlength="2000" show-count />
        </div>
      </div>
      <template #footer>
        <div class="add-footer">
          <span v-if="addError" class="add-error">{{ addError }}</span>
          <div>
            <button class="add-cancel" @click="addVisible = false">取消</button>
            <button class="add-ok" :disabled="!!addError" @click="handleAddSubmit">确定</button>
          </div>
        </div>
      </template>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.sr-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sr-body {
  flex: 1;
  display: flex;
  gap: 12px;
  overflow: hidden;
}

/* ===== 右侧列表 ===== */
.right-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

/* 搜索栏 */
.search-bar {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 14px 16px 12px;
  flex-shrink: 0;
}
.search-row { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: flex-end; justify-content: space-between; }
.search-fields { display: flex; flex-wrap: wrap; gap: 10px 16px; align-items: flex-end; flex: 1; }
.search-actions { display: flex; gap: 8px; flex-shrink: 0; }
.search-item { display: flex; flex-direction: column; gap: 4px;
  label { font-size: 12px; font-weight: 500; color: $text-muted; white-space: nowrap; }
  :deep(.ant-select), :deep(.ant-picker) { width: 180px; }
  :deep(.ant-picker) { width: 240px; }
  :deep(.ant-select-selector), :deep(.ant-input), :deep(.ant-picker) { border-radius: 6px !important; font-size: 13px; }
  &--kw { :deep(.ant-input) { width: 220px; } }
  &--btns { flex-direction: row; gap: 8px; margin-top: 21px; }
}

.s-btn { display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 14px; border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s;
  i { font-size: 14px; }
  &:hover { color: $color-primary; border-color: $color-primary; }
  &--primary { background: $color-primary; border-color: $color-primary; color: #fff; &:hover { background: $color-primary-hover; border-color: $color-primary-hover; color: #fff; } }
  &--export { border-color: $color-primary; color: $color-primary; background: $color-primary-bg; &:hover { background: $color-primary; color: #fff; } }
}

/* 表格 */
.table-card { flex: 1; min-height: 0; background: #fff; border: 1px solid $border-color-card; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
.table-scroll-area { flex: 1; min-height: 0; overflow-y: auto; overflow-x: auto;
  :deep(.ant-table-thead > tr > th) { background: #fafbfc; font-size: 13px; font-weight: 600; color: $text-base; border-bottom: 1px solid $border-color-card; }
  :deep(.ant-table-tbody > tr > td) { font-size: 13px; color: $text-secondary; }
  :deep(.ant-table-tbody > tr:hover > td) { background: #faf9ff; }
}

.cell-ph { color: $text-muted; }

.type-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px;
  &.lg { font-size: 13px; padding: 4px 12px; border-radius: 6px; }
}
.sub-tag { font-size: 12px; font-weight: 500; }

.status-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px;
  .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
  &.lg { font-size: 13px; padding: 4px 12px; border-radius: 6px; .status-dot { width: 7px; height: 7px; } }
}

.detail-btn { display: flex; align-items: center; gap: 3px; border: none; background: transparent; color: $color-primary; font-size: 13px; cursor: pointer; font-family: inherit; padding: 2px 4px;
  i { font-size: 14px; }
  &:hover { opacity: 0.8; text-decoration: underline; }
}

/* 分页 */
.pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid $border-color-card; flex-shrink: 0;
  .page-total { font-size: 13px; color: $text-muted; }
  :deep(.ant-pagination-item) { border-radius: 6px; }
  :deep(.ant-pagination-item-active) { border-color: $color-primary; a { color: $color-primary; } }
}

/* 详情弹窗 */
.detail-modal { display: flex; flex-direction: column; gap: 14px; padding: 4px; }
.detail-banner { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.detail-report-no { font-size: 13px; color: $text-muted; font-family: monospace; }
.detail-fields { list-style: none; margin: 0; padding: 0; border: 1px solid $border-color-card; border-radius: 10px; overflow: hidden; display: grid; grid-template-columns: 1fr 1fr; }
.detail-field { display: flex; flex-direction: column; gap: 4px; padding: 10px 14px; border-bottom: 1px solid $border-color-card; border-right: 1px solid $border-color-card;
  &:nth-child(2n) { border-right: none; }
  &--full { grid-column: 1 / -1; border-right: none; }
  &-label { font-size: 12px; color: $text-muted; flex-shrink: 0; }
  &-value { font-size: 13px; color: $text-base; word-break: break-all; line-height: 1.6; }
}

/* 新增弹窗 */
.add-form { display: flex; flex-direction: column; gap: 18px; padding: 8px 4px 4px; }
.add-row { display: flex; flex-direction: column; gap: 8px; }
.add-label { font-size: 13px; font-weight: 500; color: $text-base; display: flex; align-items: center; gap: 2px; }
.req { color: #ff4d4f; margin-right: 2px; }
.add-footer { display: flex; align-items: center; justify-content: space-between; }
.add-error { font-size: 12px; color: #ff4d4f; }
.add-cancel, .add-ok { height: 32px; padding: 0 18px; border-radius: 6px; font-size: 13px; cursor: pointer; font-family: inherit; margin-left: 8px; transition: all 0.15s; }
.add-cancel { border: 1px solid $border-color-light; background: #fff; color: $text-secondary; &:hover { color: $color-primary; border-color: $color-primary; } }
.add-ok { border: none; background: $color-primary; color: #fff; &:hover:not(:disabled) { background: $color-primary-hover; } &:disabled { opacity: 0.5; cursor: not-allowed; } }
</style>
