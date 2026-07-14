<script setup lang="ts">
/**
 * 安全培训台账
 * 左侧：工地列表（SiteTreePanel）
 * 右侧：搜索栏 + 表格 + 分页 + 详情/编辑弹窗（支持 AI 生成）
 */
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'
import { ref, computed, reactive } from 'vue'
import {
  constructionSites
} from './posture.mock'
import {
  trainingRecords,
  siteOptions,
  trainingTypeMeta,
  trainingTypeOptions,
  trainingStatusMeta,
  trainingStatusOptions,
  trainingSourceMeta,
  generateAiTraining,
  type TrainingRecord,
  type TrainingType,
  type TrainingStatus,
  type TrainingSource
} from './training.mock'
import SiteTreePanel from './SiteTreePanel.vue'

// ===== 左侧工地列表 =====
const selectedSiteIds = ref<Set<string>>(new Set(constructionSites.map(s => s.id)))
function handleSiteSelect(selected: { type: 'all' | 'site' | 'region'; id: string; siteIds: Set<string> }) {
  selectedSiteIds.value = selected.siteIds
}

// ===== 搜索条件 =====
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs]>()
const typeFilter = ref<TrainingType | 'all'>('all')
const statusFilter = ref<TrainingStatus | 'all'>('all')
const keyword = ref('')

// ===== 过滤 =====
const filteredRecords = computed<TrainingRecord[]>(() => {
  let list = trainingRecords.filter(r => selectedSiteIds.value.has(r.siteId))

  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value
    const startStr = start.format('YYYY-MM-DD')
    const endStr = end.format('YYYY-MM-DD')
    list = list.filter(r => r.date >= startStr && r.date <= endStr)
  }

  if (typeFilter.value !== 'all') {
    list = list.filter(r => r.type === typeFilter.value)
  }

  if (statusFilter.value !== 'all') {
    list = list.filter(r => r.status === statusFilter.value)
  }

  const kw = keyword.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(r =>
      r.trainer.toLowerCase().includes(kw) ||
      r.siteName.toLowerCase().includes(kw) ||
      r.title.toLowerCase().includes(kw) ||
      r.content.toLowerCase().includes(kw)
    )
  }

  return list
})

// ===== 分页 =====
const currentPage = ref(1)
const pageSize = ref(10)

watch([dateRange, typeFilter, statusFilter, keyword, selectedSiteIds], () => {
  currentPage.value = 1
})

const pagedRecords = computed<TrainingRecord[]>(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRecords.value.slice(start, start + pageSize.value)
})

// ===== 操作 =====
function handleReset() {
  dateRange.value = undefined
  typeFilter.value = 'all'
  statusFilter.value = 'all'
  keyword.value = ''
  currentPage.value = 1
}

function handleExport() {
  message.success(`已导出 ${filteredRecords.value.length} 条培训记录`)
}

// ===== 查看详情弹窗 =====
const detailVisible = ref(false)
const detailData = ref<TrainingRecord | null>(null)

function openDetail(row: TrainingRecord) {
  detailData.value = row
  detailVisible.value = true
}

function downloadRecord() {
  if (!detailData.value) return
  const r = detailData.value
  let text = `${r.siteName} 安全培训记录\n`
  text += `培训主题：${r.title}\n`
  text += `日期：${r.date}  讲师：${r.trainer}\n`
  text += `类型：${trainingTypeMeta[r.type].label}  时长：${r.duration} 小时\n`
  text += `地点：${r.location}\n`
  text += `应到：${r.requiredCount} 人  实到：${r.actualCount} 人\n`
  if (r.status === 'completed') {
    text += `考核通过：${r.examPassed} 人  通过率：${r.passRate}%\n\n`
  }
  text += `【培训内容】${r.content}\n`
  if (r.examResult) {
    text += `\n【考核情况】${r.examResult}\n`
  }
  if (r.remark) {
    text += `\n【备注】${r.remark}\n`
  }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${r.siteName}-安全培训-${r.date}.txt`
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
  title: '',
  type: 'regular' as TrainingType,
  trainer: '',
  duration: 1,
  location: '项目部会议室',
  requiredCount: 0,
  actualCount: 0,
  examPassed: 0,
  examFailed: 0,
  passRate: 0,
  content: '',
  examResult: '',
  remark: '',
  status: 'planned' as TrainingStatus,
  source: 'manual' as TrainingSource
})

function openAdd() {
  isEdit.value = false
  const today = dayjs().format('YYYY-MM-DD')
  Object.assign(editForm, {
    id: '',
    date: today,
    siteId: siteOptions[0]?.value || '',
    siteName: siteOptions[0]?.label || '',
    title: '',
    type: 'regular',
    trainer: '',
    duration: 1,
    location: '项目部会议室',
    requiredCount: 0,
    actualCount: 0,
    examPassed: 0,
    examFailed: 0,
    passRate: 0,
    content: '',
    examResult: '',
    remark: '',
    status: 'planned',
    source: 'manual'
  })
  editVisible.value = true
}

function openEdit(row: TrainingRecord) {
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

// 通过率自动计算
const computedPassRate = computed(() => {
  if (editForm.actualCount === 0) return 0
  return Math.round(editForm.examPassed / editForm.actualCount * 100)
})

watch(computedPassRate, (v) => {
  editForm.passRate = v
})

watch(() => editForm.examPassed, (v) => {
  editForm.examFailed = Math.max(0, editForm.actualCount - v)
})

function aiGenerate() {
  if (!editForm.siteName) {
    message.warning('请先选择工地')
    return
  }
  generating.value = true
  setTimeout(() => {
    const generated = generateAiTraining(editForm.siteName, editForm.type)
    Object.assign(editForm, generated)
    editForm.source = 'ai'
    generating.value = false
    message.success('AI 已生成培训草稿，请核对后提交')
  }, 1200)
}

const editError = computed(() => {
  if (!editForm.title.trim()) return '请输入培训主题'
  if (!editForm.date) return '请选择日期'
  if (!editForm.siteName) return '请选择工地'
  if (!editForm.trainer.trim()) return '请输入培训讲师'
  return ''
})

function handleEditSave() {
  if (editError.value) return
  if (isEdit.value) {
    const idx = trainingRecords.findIndex(r => r.id === editForm.id)
    if (idx > -1) {
      const original = trainingRecords[idx]
      trainingRecords[idx] = {
        ...original,
        date: editForm.date,
        siteId: editForm.siteId,
        siteName: editForm.siteName,
        title: editForm.title,
        type: editForm.type,
        trainer: editForm.trainer,
        duration: editForm.duration,
        location: editForm.location,
        requiredCount: editForm.requiredCount,
        actualCount: editForm.actualCount,
        examPassed: editForm.examPassed,
        examFailed: editForm.examFailed,
        passRate: computedPassRate.value,
        content: editForm.content,
        examResult: editForm.examResult,
        remark: editForm.remark,
        status: editForm.status,
        source: editForm.source
      }
    }
    message.success('培训记录已更新')
  } else {
    const newRecord: TrainingRecord = {
      id: `tr-${Date.now()}`,
      date: editForm.date,
      siteId: editForm.siteId,
      siteName: editForm.siteName,
      title: editForm.title,
      type: editForm.type,
      trainer: editForm.trainer,
      duration: editForm.duration,
      location: editForm.location,
      requiredCount: editForm.requiredCount,
      actualCount: editForm.actualCount,
      examPassed: editForm.examPassed,
      examFailed: editForm.examFailed,
      passRate: computedPassRate.value,
      content: editForm.content,
      examResult: editForm.examResult,
      remark: editForm.remark,
      status: editForm.status,
      source: editForm.source,
      createdAt: `${editForm.date} ${new Date().toTimeString().slice(0, 5)}`
    }
    trainingRecords.unshift(newRecord)
    message.success('培训记录已创建')
  }
  editVisible.value = false
}
</script>

<template>
  <div class="tl-page">
    <!-- 左侧工地列表 -->
    <SiteTreePanel @select="handleSiteSelect" />

    <!-- 右侧：搜索 + 表格 -->
    <main class="right-panel">
      <!-- 搜索栏 -->
      <div class="search-bar">
        <div class="search-row">
          <div class="search-fields">
            <div class="search-item">
              <label>日期</label>
              <a-range-picker v-model:value="dateRange" :allow-clear="true" />
            </div>
            <div class="search-item">
              <label>培训类型</label>
              <a-select v-model:value="typeFilter" allow-clear placeholder="全部类型">
                <a-select-option value="all">全部类型</a-select-option>
                <a-select-option v-for="t in trainingTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</a-select-option>
              </a-select>
            </div>
            <div class="search-item">
              <label>状态</label>
              <a-select v-model:value="statusFilter" allow-clear placeholder="全部状态">
                <a-select-option value="all">全部状态</a-select-option>
                <a-select-option v-for="s in trainingStatusOptions" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
              </a-select>
            </div>
            <div class="search-item search-item--kw">
              <label>关键字</label>
              <a-input v-model:value="keyword" placeholder="搜索主题/讲师/内容" allow-clear />
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
              <i class="i-ant-design-plus-outlined" />新增培训
            </button>
          </div>
        </div>
      </div>

      <!-- 表格区 -->
      <div class="table-card">
        <div class="table-body-wrap">
          <a-table
            :data-source="pagedRecords"
            :pagination="false"
            row-key="id"
            :scroll="{ x: 1500 }"
            size="middle"
            class="report-table"
            :custom-row="(record: TrainingRecord) => ({ onClick: () => openDetail(record) })"
          >
            <a-table-column title="培训主题" data-index="title" :width="220" :ellipsis="true" />

            <a-table-column title="类型" data-index="type" :width="110">
              <template #default="{ record }">
                <span class="type-tag" :style="{ background: trainingTypeMeta[record.type as TrainingType].color + '18', color: trainingTypeMeta[record.type as TrainingType].color }">
                  <i :class="trainingTypeMeta[record.type as TrainingType].icon" />
                  {{ trainingTypeMeta[record.type as TrainingType].label }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="工地" data-index="siteName" :width="160" :ellipsis="true" />

            <a-table-column title="培训日期" data-index="date" :width="120" />

            <a-table-column title="讲师" data-index="trainer" :width="100" />

            <a-table-column title="应到/实到" :width="110">
              <template #default="{ record }">
                <span class="count-cell">
                  <b>{{ record.actualCount }}</b> / {{ record.requiredCount }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="通过率" :width="90">
              <template #default="{ record }">
                <span v-if="record.status === 'completed'" class="rate-cell" :class="{ 'rate-low': record.passRate < 90 }">
                  {{ record.passRate }}%
                </span>
                <span v-else class="text-muted-cell">—</span>
              </template>
            </a-table-column>

            <a-table-column title="来源" data-index="source" :width="90">
              <template #default="{ record }">
                <span class="source-tag" :style="{ background: trainingSourceMeta[record.source as TrainingSource].bg, color: trainingSourceMeta[record.source as TrainingSource].color }">
                  <i :class="trainingSourceMeta[record.source as TrainingSource].icon" />
                  {{ trainingSourceMeta[record.source as TrainingSource].label }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="状态" data-index="status" :width="90">
              <template #default="{ record }">
                <span class="status-tag" :style="{ background: trainingStatusMeta[record.status as TrainingStatus].bg, color: trainingStatusMeta[record.status as TrainingStatus].color }">
                  <span class="status-dot" :style="{ background: trainingStatusMeta[record.status as TrainingStatus].color }" />
                  {{ trainingStatusMeta[record.status as TrainingStatus].label }}
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

        <!-- 分页 -->
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

    <!-- 详情弹窗 -->
    <a-modal
      v-model:open="detailVisible"
      :width="720"
      centered
      title="安全培训详情"
      :footer="null"
      @cancel="detailVisible = false"
    >
      <template v-if="detailData">
        <div class="detail-modal">
          <!-- 头部信息 -->
          <div class="detail-head">
            <div class="detail-head-left">
              <h3 class="detail-title">{{ detailData.title }}</h3>
            </div>
            <div class="detail-head-right">
              <span class="source-tag" :style="{ background: trainingSourceMeta[detailData.source].bg, color: trainingSourceMeta[detailData.source].color }">
                <i :class="trainingSourceMeta[detailData.source].icon" />
                {{ trainingSourceMeta[detailData.source].label }}
              </span>
              <span class="status-tag lg" :style="{ background: trainingStatusMeta[detailData.status].bg, color: trainingStatusMeta[detailData.status].color }">
                <span class="status-dot" :style="{ background: trainingStatusMeta[detailData.status].color }" />
                {{ trainingStatusMeta[detailData.status].label }}
              </span>
            </div>
          </div>

          <!-- 基本信息栏 -->
          <div class="detail-info-bar">
            <span class="info-item"><i class="i-ant-design-environment-outlined" />{{ detailData.siteName }}</span>
            <span class="info-item"><i class="i-ant-design-user-outlined" />{{ detailData.trainer }}</span>
            <span class="info-item"><i class="i-ant-design-calendar-outlined" />{{ detailData.date }}</span>
            <span class="info-item"><i class="i-ant-design-clock-circle-outlined" />{{ detailData.duration }} 小时</span>
            <span class="info-item"><i class="i-ant-design-environment-outlined" />{{ detailData.location }}</span>
          </div>

          <!-- 考核统计四宫格 -->
          <div v-if="detailData.status === 'completed'" class="detail-stats detail-stats--4">
            <div class="stat-box stat-box--total">
              <span class="stat-label">应到</span>
              <span class="stat-value">{{ detailData.requiredCount }}</span>
            </div>
            <div class="stat-box stat-box--ok">
              <span class="stat-label">实到</span>
              <span class="stat-value">{{ detailData.actualCount }}</span>
            </div>
            <div class="stat-box stat-box--pass">
              <span class="stat-label">通过</span>
              <span class="stat-value">{{ detailData.examPassed }}</span>
            </div>
            <div class="stat-box stat-box--rate">
              <span class="stat-label">通过率</span>
              <span class="stat-value">{{ detailData.passRate }}%</span>
            </div>
          </div>

          <!-- 内容区块 -->
          <div class="detail-content-blocks">
            <div class="detail-block">
              <span class="detail-block-label"><i class="i-ant-design-read-outlined" />培训内容</span>
              <p class="detail-block-text">{{ detailData.content }}</p>
            </div>
            <div v-if="detailData.examResult" class="detail-block">
              <span class="detail-block-label"><i class="i-ant-design-check-circle-outlined" />考核情况</span>
              <p class="detail-block-text">{{ detailData.examResult }}</p>
            </div>
            <div v-if="detailData.remark" class="detail-block">
              <span class="detail-block-label"><i class="i-ant-design-file-text-outlined" />备注</span>
              <p class="detail-block-text">{{ detailData.remark }}</p>
            </div>
          </div>

          <!-- 底部操作 -->
          <div class="detail-footer">
            <button class="s-btn s-btn--export" @click="downloadRecord">
              <i class="i-ant-design-download-outlined" />下载记录
            </button>
            <button class="s-btn s-btn--primary" @click="openEdit(detailData); detailVisible = false">
              <i class="i-ant-design-edit-outlined" />编辑
            </button>
          </div>
        </div>
      </template>
    </a-modal>

    <!-- 新增/编辑弹窗 -->
    <a-modal
      v-model:open="editVisible"
      :width="760"
      centered
      :title="isEdit ? '编辑培训记录' : '新增培训记录'"
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
            {{ generating ? 'AI 生成中...' : 'AI 生成培训' }}
          </button>
          <span class="ai-hint">基于工地类型和培训类型，AI 自动生成培训主题和内容草稿</span>
        </div>

        <!-- 基本信息 -->
        <div class="form-row-2">
          <div class="form-item">
            <label><span class="req">*</span>培训主题</label>
            <a-input v-model:value="editForm.title" placeholder="请输入培训主题" />
          </div>
          <div class="form-item">
            <label>培训类型</label>
            <a-select v-model:value="editForm.type" style="width:100%">
              <a-select-option v-for="t in trainingTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</a-select-option>
            </a-select>
          </div>
        </div>

        <div class="form-row-2">
          <div class="form-item">
            <label><span class="req">*</span>工地</label>
            <a-select :value="editForm.siteId" @change="onSiteChange" style="width:100%">
              <a-select-option v-for="s in siteOptions" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
            </a-select>
          </div>
          <div class="form-item">
            <label><span class="req">*</span>培训讲师</label>
            <a-input v-model:value="editForm.trainer" placeholder="请输入培训讲师" />
          </div>
        </div>

        <div class="form-row-3">
          <div class="form-item">
            <label><span class="req">*</span>培训日期</label>
            <a-date-picker v-model:value="editForm.date" value-format="YYYY-MM-DD" style="width:100%" placeholder="选择日期" />
          </div>
          <div class="form-item">
            <label>时长(小时)</label>
            <a-input-number v-model:value="editForm.duration" :min="0.5" :step="0.5" style="width:100%" />
          </div>
          <div class="form-item">
            <label>培训地点</label>
            <a-input v-model:value="editForm.location" placeholder="培训地点" />
          </div>
        </div>

        <!-- 人数统计 -->
        <div class="form-row-3">
          <div class="form-item">
            <label>应到人数</label>
            <a-input-number v-model:value="editForm.requiredCount" :min="0" style="width:100%" />
          </div>
          <div class="form-item">
            <label>实到人数</label>
            <a-input-number v-model:value="editForm.actualCount" :min="0" :max="editForm.requiredCount" style="width:100%" />
          </div>
          <div class="form-item">
            <label>通过人数</label>
            <a-input-number v-model:value="editForm.examPassed" :min="0" :max="editForm.actualCount" style="width:100%" />
          </div>
        </div>

        <!-- 通过率 -->
        <div class="form-item">
          <label>通过率</label>
          <a-input :value="computedPassRate + '%'" readonly style="width:100%" />
        </div>

        <!-- 文本区 -->
        <div class="form-item">
          <label>培训内容</label>
          <a-textarea v-model:value="editForm.content" :rows="4" placeholder="详细培训内容" />
        </div>

        <div class="form-item">
          <label>考核情况</label>
          <a-textarea v-model:value="editForm.examResult" :rows="2" placeholder="考核方式与结果" />
        </div>

        <div class="form-item">
          <label>备注</label>
          <a-textarea v-model:value="editForm.remark" :rows="2" placeholder="选填" />
        </div>

        <div class="form-row-2">
          <div class="form-item">
            <label>状态</label>
            <a-select v-model:value="editForm.status" style="width:100%">
              <a-select-option v-for="s in trainingStatusOptions" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
            </a-select>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.tl-page {
  height: 100%;
  display: flex;
  gap: 8px;
  padding: 8px;
  overflow: hidden;
}

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
  :deep(.ant-select), :deep(.ant-picker) { width: 180px; }
  :deep(.ant-picker) { width: 240px; }
  :deep(.ant-select-selector), :deep(.ant-input), :deep(.ant-picker) {
    border-radius: 6px !important;
    font-size: 13px;
  }
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
    background: $color-primary; border-color: $color-primary; color: #fff;
    &:hover { background: $color-primary-hover; border-color: $color-primary-hover; color: #fff; }
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
  :deep(.ant-table-tbody > tr) { cursor: pointer; }
  :deep(.ant-table-tbody > tr > td) { font-size: 13px; color: $text-secondary; }
  :deep(.ant-table-tbody > tr:hover > td) { background: #faf9ff; }
}

/* 类型标签 */
.type-tag {
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

/* 应到/实到 */
.count-cell {
  font-size: 13px;
  color: $text-secondary;
  b { font-weight: 600; color: $text-base; }
}

/* 通过率 */
.rate-cell {
  font-size: 13px;
  font-weight: 600;
  color: #52c41a;
  &.rate-low { color: #ff4d4f; }
}

.text-muted-cell {
  font-size: 13px;
  color: $text-muted;
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
    width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
  }
  &.lg {
    font-size: 13px;
    padding: 4px 12px;
    border-radius: 6px;
    .status-dot { width: 7px; height: 7px; }
  }
}

/* 行操作按钮 */
.row-actions { display: flex; gap: 6px; }
.action-btn {
  display: flex; align-items: center; gap: 3px;
  border: none; background: transparent;
  color: $color-primary; font-size: 13px; cursor: pointer;
  font-family: inherit; padding: 2px 4px;
  transition: opacity 0.15s;
  i { font-size: 14px; }
  &:hover { opacity: 0.8; text-decoration: underline; }
  &--edit { color: $text-secondary; &:hover { color: $color-primary; } }
}

/* 分页 */
.pagination-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-top: 1px solid $border-color-card;
  flex-shrink: 0;
  .page-total { font-size: 13px; color: $text-muted; }
  :deep(.ant-pagination-item) { border-radius: 6px; }
  :deep(.ant-pagination-item-active) { border-color: $color-primary; a { color: $color-primary; } }
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
  flex: 1;
  min-width: 0;
}

.detail-title { font-size: 18px; font-weight: 600; color: $text-base; margin: 0; }

.detail-head-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.detail-info-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
  padding: 10px 14px;
  background: #f7f8fa;
  border-radius: 8px;
  .info-item {
    display: flex; align-items: center; gap: 4px;
    font-size: 13px; color: $text-secondary;
    i { font-size: 13px; color: $text-muted; }
  }
}

/* 考核统计四宫格 */
.detail-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  &--4 { grid-template-columns: repeat(4, 1fr); }
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  .stat-label { font-size: 12px; color: $text-muted; }
  .stat-value { font-size: 28px; font-weight: 800; line-height: 1; }
  &--total .stat-value { color: $color-primary; }
  &--ok .stat-value { color: #2bb3a3; }
  &--pass .stat-value { color: #52c41a; }
  &--rate .stat-value { color: #1677ff; }
}

/* 内容区块 */
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
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.ai-hint { font-size: 12px; color: $text-muted; }

/* 表单布局 */
.form-row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-row-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }

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
