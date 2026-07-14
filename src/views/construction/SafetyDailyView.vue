<script setup lang="ts">
/**
 * 工地安全报告
 * 左侧：工地列表（省市区树）
 * 右侧：搜索栏 + 表格 + 分页 + 详情/编辑弹窗（支持 AI 生成）
 */
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { ref, computed, reactive } from 'vue'
import {
  constructionSites
} from './posture.mock'
import {
  safetyDailyReports,
  siteOptions,
  inspectionItemOptions,
  weatherOptions,
  statusMeta,
  sourceMeta,
  generateAiDailyReport,
  type SafetyDailyReport,
  type DailyStatus,
  type DailySource
} from './safety-daily.mock'
import SiteTreePanel from './SiteTreePanel.vue'

// ===== 左侧：工地列表（使用共享组件）=====
const selectedSiteIds = ref<Set<string>>(new Set(constructionSites.map(s => s.id)))
function handleSiteSelect(selected: { type: 'all' | 'site' | 'region'; id: string; siteIds: Set<string> }) {
  selectedSiteIds.value = selected.siteIds
}

// ===== 搜索条件 =====
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs]>()
const statusFilter = ref<DailyStatus | 'all'>('all')
const keyword = ref('')

// ===== 过滤 =====
const filteredReports = computed<SafetyDailyReport[]>(() => {
  let list = safetyDailyReports.filter(r => selectedSiteIds.value.has(r.siteId))

  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value
    const startStr = start.format('YYYY-MM-DD')
    const endStr = end.format('YYYY-MM-DD')
    list = list.filter(r => r.date >= startStr && r.date <= endStr)
  }

  if (statusFilter.value !== 'all') {
    list = list.filter(r => r.status === statusFilter.value)
  }

  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(r =>
      r.reporter.toLowerCase().includes(kw) ||
      r.siteName.toLowerCase().includes(kw) ||
      r.hazardDetail.toLowerCase().includes(kw) ||
      r.inspectionItems.some(i => i.toLowerCase().includes(kw))
    )
  }

  return list
})

// ===== 分页 =====
const currentPage = ref(1)
const pageSize = ref(10)

watch([dateRange, statusFilter, keyword, selectedSiteIds], () => {
  currentPage.value = 1
})

const pagedReports = computed<SafetyDailyReport[]>(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredReports.value.slice(start, start + pageSize.value)
})

// ===== 操作 =====
function handleReset() {
  dateRange.value = undefined
  statusFilter.value = 'all'
  keyword.value = ''
  currentPage.value = 1
}

function handleExport() {
  message.success(`已导出 ${filteredReports.value.length} 份安全日报`)
}

// ===== 查看详情弹窗 =====
const detailVisible = ref(false)
const detailData = ref<SafetyDailyReport | null>(null)

function openDetail(row: SafetyDailyReport) {
  detailData.value = row
  detailVisible.value = true
}

function downloadReport() {
  if (!detailData.value) return
  const r = detailData.value
  let text = `${r.siteName} 安全日报\n`
  text += `日期：${r.date}\n天气：${r.weather}  出勤：${r.attendance} 人\n`
  text += `填报人：${r.reporter}  来源：${sourceMeta[r.source].label}\n\n`
  text += `【隐患排查】发现 ${r.hazardCount} 项，已整改 ${r.resolvedCount} 项，待整改 ${r.pendingCount} 项\n`
  text += `检查项目：${r.inspectionItems.join('、')}\n\n`
  text += `【隐患情况】${r.hazardDetail}\n\n`
  text += `【整改措施】${r.rectification}\n\n`
  text += `【安全教育】${r.safetyEducation}\n\n`
  text += `【事故记录】${r.accidentRecord}\n`
  if (r.remark) text += `\n【其他说明】${r.remark}\n`
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${r.siteName}-安全日报-${r.date}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// ===== 新增/编辑弹窗 =====
const editVisible = ref(false)
const isEdit = ref(false)
const generating = ref(false)

const editForm = reactive({
  id: '',
  date: '',
  siteId: '' as string,
  siteName: '',
  reporter: '',
  weather: '晴',
  attendance: 0,
  hazardCount: 0,
  resolvedCount: 0,
  pendingCount: 0,
  inspectionItems: [] as string[],
  hazardDetail: '',
  rectification: '',
  safetyEducation: '',
  accidentRecord: '无',
  remark: '',
  source: 'manual' as DailySource,
  status: 'submitted' as DailyStatus
})

function openAdd() {
  isEdit.value = false
  const today = dayjs().format('YYYY-MM-DD')
  Object.assign(editForm, {
    id: '',
    date: today,
    siteId: siteOptions[0]?.value || '',
    siteName: siteOptions[0]?.label || '',
    reporter: '',
    weather: '晴',
    attendance: 0,
    hazardCount: 0,
    resolvedCount: 0,
    pendingCount: 0,
    inspectionItems: [],
    hazardDetail: '',
    rectification: '',
    safetyEducation: '',
    accidentRecord: '无',
    remark: '',
    source: 'manual',
    status: 'submitted'
  })
  editVisible.value = true
}

function openEdit(row: SafetyDailyReport) {
  isEdit.value = true
  Object.assign(editForm, row)
  editVisible.value = true
}

function onSiteChange(value: any) {
  const v = String(value)
  const opt = siteOptions.find(s => s.value === v)
  if (opt) {
    editForm.siteId = opt.value
    editForm.siteName = opt.label
  }
}

// 待整改自动计算
const computedPending = computed(() => Math.max(0, editForm.hazardCount - editForm.resolvedCount))

watch(computedPending, (v) => {
  editForm.pendingCount = v
})

function aiGenerate() {
  if (!editForm.siteName || !editForm.date) {
    message.warning('请先选择工地和日期')
    return
  }
  generating.value = true
  setTimeout(() => {
    const generated = generateAiDailyReport(editForm.siteName, editForm.date)
    Object.assign(editForm, generated)
    editForm.source = 'ai'
    generating.value = false
    message.success('AI 已生成日报草稿，请核对后提交')
  }, 1200)
}

const editError = computed(() => {
  if (!editForm.reporter.trim()) return '请输入填报人'
  if (!editForm.date) return '请选择日期'
  if (!editForm.siteName) return '请选择工地'
  return ''
})

function handleEditSave() {
  if (editError.value) return
  if (isEdit.value) {
    const idx = safetyDailyReports.findIndex(r => r.id === editForm.id)
    if (idx > -1) {
      const original = safetyDailyReports[idx]
      safetyDailyReports[idx] = {
        ...original,
        date: editForm.date,
        siteId: editForm.siteId,
        siteName: editForm.siteName,
        reporter: editForm.reporter,
        weather: editForm.weather,
        attendance: editForm.attendance,
        hazardCount: editForm.hazardCount,
        resolvedCount: editForm.resolvedCount,
        pendingCount: computedPending.value,
        inspectionItems: [...editForm.inspectionItems],
        hazardDetail: editForm.hazardDetail,
        rectification: editForm.rectification,
        safetyEducation: editForm.safetyEducation,
        accidentRecord: editForm.accidentRecord,
        remark: editForm.remark,
        source: editForm.source,
        status: editForm.status
      }
    }
    message.success('日报已更新')
  } else {
    const newReport: SafetyDailyReport = {
      id: `sd-${Date.now()}`,
      date: editForm.date,
      siteId: editForm.siteId,
      siteName: editForm.siteName,
      reporter: editForm.reporter,
      weather: editForm.weather,
      attendance: editForm.attendance,
      hazardCount: editForm.hazardCount,
      resolvedCount: editForm.resolvedCount,
      pendingCount: computedPending.value,
      inspectionItems: [...editForm.inspectionItems],
      hazardDetail: editForm.hazardDetail,
      rectification: editForm.rectification,
      safetyEducation: editForm.safetyEducation,
      accidentRecord: editForm.accidentRecord,
      remark: editForm.remark,
      source: editForm.source,
      status: editForm.status,
      createdAt: `${editForm.date} ${new Date().toTimeString().slice(0, 5)}`
    }
    safetyDailyReports.unshift(newReport)
    message.success('日报已创建')
  }
  editVisible.value = false
}
</script>

<template>
  <div class="sd-page">
    <!-- ===== 左侧工地列表 ===== -->
    <SiteTreePanel @select="handleSiteSelect" />

    <!-- ===== 右侧：搜索 + 表格 ===== -->
    <main class="right-panel">
    <!-- ===== 搜索栏 ===== -->
    <div class="search-bar">
      <div class="search-row">
        <div class="search-fields">
          <div class="search-item">
            <label>日期</label>
            <a-range-picker v-model:value="dateRange" :allow-clear="true" />
          </div>
          <div class="search-item">
            <label>状态</label>
            <a-select v-model:value="statusFilter" allow-clear placeholder="全部状态">
              <a-select-option value="all">全部状态</a-select-option>
              <a-select-option value="draft">草稿</a-select-option>
              <a-select-option value="submitted">已提交</a-select-option>
            </a-select>
          </div>
          <div class="search-item search-item--kw">
            <label>关键字</label>
            <a-input v-model:value="keyword" placeholder="搜索填报人/隐患/检查项目" allow-clear />
          </div>
          <div class="search-actions search-actions--inline">
            <button class="s-btn s-btn--primary" @click="currentPage = 1">
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
            <i class="i-ant-design-plus-outlined" />新增日报
          </button>
        </div>
      </div>
    </div>

    <!-- ===== 表格区 ===== -->
    <div class="table-card">
      <div class="table-body-wrap">
        <a-table
          :data-source="pagedReports"
          :pagination="false"
          row-key="id"
          :scroll="{ x: 1400 }"
          size="middle"
          class="report-table"
          :custom-row="(record: SafetyDailyReport) => ({ onClick: () => openDetail(record) })"
        >
          <a-table-column title="日期" data-index="date" :width="120" />

          <a-table-column title="工地" data-index="siteName" :width="160" :ellipsis="true" />

          <a-table-column title="填报人" data-index="reporter" :width="100" />

          <a-table-column title="天气" data-index="weather" :width="80" />

          <a-table-column title="出勤" :width="80">
            <template #default="{ record }">
              <span>{{ record.attendance }} 人</span>
            </template>
          </a-table-column>

          <a-table-column title="隐患排查" :width="150">
            <template #default="{ record }">
              <div class="hazard-cell">
                <span class="hazard-item">发现 <b>{{ record.hazardCount }}</b></span>
                <span class="hazard-item hazard-item--ok">已改 <b>{{ record.resolvedCount }}</b></span>
                <span v-if="record.pendingCount > 0" class="hazard-item hazard-item--warn">待改 <b>{{ record.pendingCount }}</b></span>
              </div>
            </template>
          </a-table-column>

          <a-table-column title="检查项目" :width="220">
            <template #default="{ record }">
              <div class="tag-group">
                <span v-for="item in record.inspectionItems" :key="item" class="inspect-tag">{{ item }}</span>
              </div>
            </template>
          </a-table-column>

          <a-table-column title="来源" data-index="source" :width="90">
            <template #default="{ record }">
              <span class="source-tag" :style="{ background: sourceMeta[record.source as DailySource].bg, color: sourceMeta[record.source as DailySource].color }">
                <i :class="sourceMeta[record.source as DailySource].icon" />
                {{ sourceMeta[record.source as DailySource].label }}
              </span>
            </template>
          </a-table-column>

          <a-table-column title="状态" data-index="status" :width="90">
            <template #default="{ record }">
              <span class="status-tag" :style="{ background: statusMeta[record.status as DailyStatus].bg, color: statusMeta[record.status as DailyStatus].color }">
                <span class="status-dot" :style="{ background: statusMeta[record.status as DailyStatus].color }" />
                {{ statusMeta[record.status as DailyStatus].label }}
              </span>
            </template>
          </a-table-column>

          <a-table-column title="操作" :width="140" fixed="right">
            <template #default="{ record }">
              <div class="row-actions" @click.stop>
                <button class="action-btn" @click="openDetail(record)">
                  <i class="i-ant-design-eye-outlined" />详情
                </button>
                <button class="action-btn action-btn--edit" @click="openEdit(record)">
                  <i class="i-ant-design-edit-outlined" />编辑
                </button>
              </div>
            </template>
          </a-table-column>
        </a-table>
      </div>

      <!-- ===== 分页 ===== -->
      <div class="pagination-bar">
        <span class="page-total">共 {{ filteredReports.length }} 份</span>
        <a-pagination
          v-model:current="currentPage"
          v-model:page-size="pageSize"
          :total="filteredReports.length"
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
      title="安全日报详情"
      :footer="null"
      @cancel="detailVisible = false"
    >
      <template v-if="detailData">
        <div class="detail-modal">
          <!-- 头部信息 -->
          <div class="detail-head">
            <div class="detail-head-left">
              <h3 class="detail-title">{{ detailData.siteName }}</h3>
              <span class="detail-date">{{ detailData.date }}</span>
            </div>
            <div class="detail-head-right">
              <span class="source-tag" :style="{ background: sourceMeta[detailData.source].bg, color: sourceMeta[detailData.source].color }">
                <i :class="sourceMeta[detailData.source].icon" />
                {{ sourceMeta[detailData.source].label }}
              </span>
              <span class="status-tag lg" :style="{ background: statusMeta[detailData.status].bg, color: statusMeta[detailData.status].color }">
                <span class="status-dot" :style="{ background: statusMeta[detailData.status].color }" />
                {{ statusMeta[detailData.status].label }}
              </span>
            </div>
          </div>

          <!-- 基本信息栏 -->
          <div class="detail-info-bar">
            <span class="info-item"><i class="i-ant-design-user-outlined" />{{ detailData.reporter }}</span>
            <span class="info-item"><i class="i-ant-design-cloud-outlined" />{{ detailData.weather }}</span>
            <span class="info-item"><i class="i-ant-design-team-outlined" />出勤 {{ detailData.attendance }} 人</span>
            <span class="info-item"><i class="i-ant-design-clock-circle-outlined" />{{ detailData.createdAt.substring(11) }}</span>
          </div>

          <!-- 隐患排查统计 -->
          <div class="detail-stats">
            <div class="stat-box stat-box--total">
              <span class="stat-label">发现隐患</span>
              <span class="stat-value">{{ detailData.hazardCount }}</span>
            </div>
            <div class="stat-box stat-box--ok">
              <span class="stat-label">已整改</span>
              <span class="stat-value">{{ detailData.resolvedCount }}</span>
            </div>
            <div class="stat-box stat-box--warn">
              <span class="stat-label">待整改</span>
              <span class="stat-value">{{ detailData.pendingCount }}</span>
            </div>
          </div>

          <!-- 检查项目 -->
          <div class="detail-section">
            <span class="detail-section-label">检查项目</span>
            <div class="tag-group">
              <span v-for="item in detailData.inspectionItems" :key="item" class="inspect-tag">{{ item }}</span>
            </div>
          </div>

          <!-- 内容区块 -->
          <div class="detail-content-blocks">
            <div class="detail-block">
              <span class="detail-block-label"><i class="i-ant-design-alert-outlined" />隐患情况</span>
              <p class="detail-block-text">{{ detailData.hazardDetail }}</p>
            </div>
            <div class="detail-block">
              <span class="detail-block-label"><i class="i-ant-design-tool-outlined" />整改措施</span>
              <p class="detail-block-text">{{ detailData.rectification }}</p>
            </div>
            <div class="detail-block">
              <span class="detail-block-label"><i class="i-ant-design-read-outlined" />安全教育/交底</span>
              <p class="detail-block-text">{{ detailData.safetyEducation }}</p>
            </div>
            <div class="detail-block">
              <span class="detail-block-label"><i class="i-ant-design-warning-outlined" />事故/未遂事件</span>
              <p class="detail-block-text" :class="{ 'text-warn': detailData.accidentRecord !== '无' }">{{ detailData.accidentRecord }}</p>
            </div>
            <div v-if="detailData.remark" class="detail-block">
              <span class="detail-block-label"><i class="i-ant-design-file-text-outlined" />其他说明</span>
              <p class="detail-block-text">{{ detailData.remark }}</p>
            </div>
          </div>

          <!-- 底部操作 -->
          <div class="detail-footer">
            <button class="s-btn s-btn--export" @click="downloadReport">
              <i class="i-ant-design-download-outlined" />下载日报
            </button>
            <button class="s-btn s-btn--primary" @click="openEdit(detailData); detailVisible = false">
              <i class="i-ant-design-edit-outlined" />编辑
            </button>
          </div>
        </div>
      </template>
    </a-modal>

    <!-- ===== 新增/编辑弹窗 ===== -->
    <a-modal
      v-model:open="editVisible"
      :width="760"
      centered
      :title="isEdit ? '编辑安全日报' : '新增安全日报'"
      ok-text="保存"
      cancel-text="取消"
      :ok-button-props="{ disabled: !!editError }"
      @ok="handleEditSave"
    >
      <div class="edit-form">
        <!-- AI 生成按钮 -->
        <div class="ai-bar">
          <button class="ai-gen-btn" :disabled="generating" @click="aiGenerate">
            <i :class="generating ? 'i-ant-design-loading-outlined' : 'i-ant-design-thunderbolt-outlined'" />
            {{ generating ? 'AI 生成中...' : 'AI 生成日报' }}
          </button>
          <span class="ai-hint">基于当日监控数据和隐患记录，AI 自动生成日报草稿</span>
        </div>

        <!-- 基本信息 -->
        <div class="form-row-2">
          <div class="form-item">
            <label><span class="req">*</span>日期</label>
            <a-date-picker v-model:value="editForm.date" value-format="YYYY-MM-DD" style="width:100%" placeholder="选择日期" />
          </div>
          <div class="form-item">
            <label><span class="req">*</span>工地</label>
            <a-select :value="editForm.siteId" @change="onSiteChange" style="width:100%">
              <a-select-option v-for="s in siteOptions" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
            </a-select>
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-item">
            <label><span class="req">*</span>填报人</label>
            <a-input v-model:value="editForm.reporter" placeholder="请输入填报人姓名" />
          </div>
          <div class="form-item">
            <label>天气</label>
            <a-select v-model:value="editForm.weather" style="width:100%">
              <a-select-option v-for="w in weatherOptions" :key="w" :value="w">{{ w }}</a-select-option>
            </a-select>
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-item">
            <label>出勤人数</label>
            <a-input-number v-model:value="editForm.attendance" :min="0" style="width:100%" placeholder="出勤人数" />
          </div>
          <div class="form-item">
            <label>状态</label>
            <a-select v-model:value="editForm.status" style="width:100%">
              <a-select-option value="draft">草稿</a-select-option>
              <a-select-option value="submitted">已提交</a-select-option>
            </a-select>
          </div>
        </div>

        <!-- 隐患统计 -->
        <div class="form-row-3">
          <div class="form-item">
            <label>发现隐患数</label>
            <a-input-number v-model:value="editForm.hazardCount" :min="0" style="width:100%" />
          </div>
          <div class="form-item">
            <label>已整改数</label>
            <a-input-number v-model:value="editForm.resolvedCount" :min="0" :max="editForm.hazardCount" style="width:100%" />
          </div>
          <div class="form-item">
            <label>待整改数</label>
            <a-input :value="computedPending" readonly style="width:100%" />
          </div>
        </div>

        <!-- 检查项目 -->
        <div class="form-item">
          <label>检查项目</label>
          <a-select v-model:value="editForm.inspectionItems" mode="multiple" style="width:100%" placeholder="选择检查项目">
            <a-select-option v-for="item in inspectionItemOptions" :key="item" :value="item">{{ item }}</a-select-option>
          </a-select>
        </div>

        <!-- 文本区 -->
        <div class="form-item">
          <label>隐患情况描述</label>
          <a-textarea v-model:value="editForm.hazardDetail" :rows="2" placeholder="描述发现的隐患情况" />
        </div>

        <div class="form-item">
          <label>整改措施</label>
          <a-textarea v-model:value="editForm.rectification" :rows="2" placeholder="已采取或计划的整改措施" />
        </div>

        <div class="form-item">
          <label>安全教育/交底情况</label>
          <a-textarea v-model:value="editForm.safetyEducation" :rows="2" placeholder="当日安全教育、交底记录" />
        </div>

        <div class="form-item">
          <label>事故/未遂事件记录</label>
          <a-textarea v-model:value="editForm.accidentRecord" :rows="2" placeholder="无事故则填「无」" />
        </div>

        <div class="form-item">
          <label>其他说明</label>
          <a-textarea v-model:value="editForm.remark" :rows="2" placeholder="选填" />
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.sd-page {
  height: 100%;
  display: flex;
  gap: 8px;
  padding: 8px;
  overflow: hidden;
}

/* ===== 左侧工地列表 ===== */
/* ===== 右侧 ===== */
.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

/* ===== 搜索栏 ===== */
.search-bar {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  padding: 12px 16px;
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

  &--inline { align-items: flex-end; }
  &--right { align-items: flex-end; }
}

.search-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 12px;
    font-weight: 500;
    color: $text-muted;
    white-space: nowrap;
  }

  :deep(.ant-select),
  :deep(.ant-picker) {
    width: 180px;
  }

  :deep(.ant-picker) {
    width: 240px;
  }

  :deep(.ant-select-selector),
  :deep(.ant-input),
  :deep(.ant-picker) {
    border-radius: 6px !important;
    font-size: 13px;
  }

  &--kw {
    :deep(.ant-input) {
      width: 220px;
    }
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

  &:hover {
    color: $color-primary;
    border-color: $color-primary;
  }

  &--primary {
    background: $color-primary;
    border-color: $color-primary;
    color: #fff;

    &:hover {
      background: $color-primary-hover;
      border-color: $color-primary-hover;
      color: #fff;
    }
  }

  &--export {
    border-color: $color-primary;
    color: $color-primary;
    background: $color-primary-bg;

    &:hover {
      background: $color-primary;
      color: #fff;
    }
  }

  &--add {
    background: $color-primary;
    border-color: $color-primary;
    color: #fff;

    &:hover {
      background: $color-primary-hover;
      border-color: $color-primary-hover;
      color: #fff;
    }
  }
}

/* ===== 表格卡片 ===== */
.table-card {
  flex: 1;
  min-height: 0;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
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

.report-table {
  :deep(.ant-table-thead > tr > th) {
    background: #fafbfc;
    font-size: 13px;
    font-weight: 600;
    color: $text-base;
    border-bottom: 1px solid $border-color-card;
  }

  :deep(.ant-table-tbody > tr) {
    cursor: pointer;
  }

  :deep(.ant-table-tbody > tr > td) {
    font-size: 13px;
    color: $text-secondary;
  }

  :deep(.ant-table-tbody > tr:hover > td) {
    background: #faf9ff;
  }
}

/* 隐患排查单元格 */
.hazard-cell {
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 12px;
  line-height: 1.5;

  b { font-weight: 600; }

  .hazard-item { color: $text-tertiary; }
  .hazard-item--ok b { color: #2bb3a3; }
  .hazard-item--warn b { color: #fa8c16; }
}

/* 检查项目标签 */
.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.inspect-tag {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 3px;
  background: $color-primary-bg;
  color: $color-primary;
  white-space: nowrap;
}

/* 来源标签 */
.source-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;

  i { font-size: 12px; }
}

/* 状态标签 */
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &.lg {
    font-size: 13px;
    padding: 4px 12px;
    border-radius: 6px;

    .status-dot {
      width: 7px;
      height: 7px;
    }
  }
}

/* 行操作按钮 */
.row-actions {
  display: flex;
  gap: 6px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 3px;
  border: none;
  background: transparent;
  color: $color-primary;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  padding: 2px 4px;
  transition: opacity 0.15s;

  i { font-size: 14px; }

  &:hover { opacity: 0.8; text-decoration: underline; }

  &--edit {
    color: $text-secondary;
    &:hover { color: $color-primary; }
  }
}

/* ===== 分页 ===== */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid $border-color-card;
  flex-shrink: 0;

  .page-total {
    font-size: 13px;
    color: $text-muted;
  }

  :deep(.ant-pagination-item) {
    border-radius: 6px;
  }

  :deep(.ant-pagination-item-active) {
    border-color: $color-primary;
    a { color: $color-primary; }
  }
}

/* ===== 详情弹窗 ===== */
.detail-modal {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px;
}

.detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detail-head-left {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.detail-title {
  font-size: 18px;
  font-weight: 600;
  color: $text-base;
  margin: 0;
}

.detail-date {
  font-size: 14px;
  color: $text-secondary;
}

.detail-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-info-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  padding: 10px 14px;
  background: #f7f8fa;
  border-radius: 8px;

  .info-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: $text-secondary;

    i { font-size: 13px; color: $text-muted; }
  }
}

/* 隐患统计三宫格 */
.detail-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid $border-color-card;

  .stat-label {
    font-size: 12px;
    color: $text-muted;
  }

  .stat-value {
    font-size: 28px;
    font-weight: 800;
    line-height: 1;
  }

  &--total .stat-value { color: $color-primary; }
  &--ok .stat-value { color: #2bb3a3; }
  &--warn .stat-value { color: #fa8c16; }
}

/* 内容区块 */
.detail-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-section-label {
  font-size: 13px;
  font-weight: 600;
  color: $text-base;
}

.detail-content-blocks {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-block {
  padding: 10px 14px;
  background: #f7f8fa;
  border-radius: 8px;
}

.detail-block-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 600;
  color: $text-muted;
  margin-bottom: 4px;

  i { font-size: 13px; }
}

.detail-block-text {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: $text-secondary;

  &.text-warn { color: #ff4d4f; }
}

.detail-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}

/* ===== 编辑弹窗 ===== */
.edit-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px;
}

/* AI 生成栏 */
.ai-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: linear-gradient(135deg, #f5f0ff, #fff);
  border: 1px solid rgba(110, 75, 255, 0.15);
  border-radius: 10px;
}

.ai-gen-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  height: 32px;
  padding: 0 16px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(135deg, #7d5cff, #6e4bff);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(110, 75, 255, 0.25);

  i { font-size: 14px; }

  &:hover:not(:disabled) {
    box-shadow: 0 4px 14px rgba(110, 75, 255, 0.4);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.ai-hint {
  font-size: 12px;
  color: $text-muted;
}

/* 表单布局 */
.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-row-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.form-item {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 13px;
    font-weight: 500;
    color: $text-base;

    .req { color: #ff4d4f; margin-right: 2px; }
  }
}
</style>
