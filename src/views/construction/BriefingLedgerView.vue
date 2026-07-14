<script setup lang="ts">
/**
 * 班前交底台账
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
  briefingRecords,
  siteOptions,
  briefingTypeMeta,
  briefingTypeOptions,
  briefingStatusMeta,
  briefingStatusOptions,
  keyRiskOptions,
  ppeCheckOptions,
  weatherOptions,
  briefingSourceMeta,
  generateAiBriefing,
  type BriefingRecord,
  type BriefingType,
  type BriefingStatus,
  type BriefingSource
} from './briefing.mock'
import SiteTreePanel from './SiteTreePanel.vue'

// ===== 左侧工地列表 =====
const selectedSiteIds = ref<Set<string>>(new Set(constructionSites.map(s => s.id)))
function handleSiteSelect(selected: { type: 'all' | 'site' | 'region'; id: string; siteIds: Set<string> }) {
  selectedSiteIds.value = selected.siteIds
}

// ===== 搜索条件 =====
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs]>()
const typeFilter = ref<BriefingType | 'all'>('all')
const statusFilter = ref<BriefingStatus | 'all'>('all')
const keyword = ref('')

// ===== 过滤 =====
const filteredRecords = computed<BriefingRecord[]>(() => {
  let list = briefingRecords.filter(r => selectedSiteIds.value.has(r.siteId))

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
      r.briefer.toLowerCase().includes(kw) ||
      r.siteName.toLowerCase().includes(kw) ||
      r.topic.toLowerCase().includes(kw) ||
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

const pagedRecords = computed<BriefingRecord[]>(() => {
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
  message.success(`已导出 ${filteredRecords.value.length} 条交底记录`)
}

// ===== 查看详情弹窗 =====
const detailVisible = ref(false)
const detailData = ref<BriefingRecord | null>(null)

function openDetail(row: BriefingRecord) {
  detailData.value = row
  detailVisible.value = true
}

function downloadRecord() {
  if (!detailData.value) return
  const r = detailData.value
  let text = `${r.siteName} 班前交底记录\n`
  text += `日期：${r.date}  天气：${r.weather}\n`
  text += `交底人：${r.briefer}  类型：${briefingTypeMeta[r.type].label}\n`
  text += `应到：${r.requiredCount} 人  实到：${r.actualCount} 人\n\n`
  text += `【交底主题】${r.topic}\n\n`
  text += `【关键风险点】${r.keyRisks.join('、')}\n\n`
  text += `【劳保检查项】${r.ppeChecks.join('、')}\n\n`
  text += `【交底内容】${r.fullContent}\n`
  if (r.absentees.length > 0) {
    text += `\n【缺勤说明】${r.absentees.join('；')}\n`
  }
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${r.siteName}-班前交底-${r.date}.txt`
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
  briefer: '',
  type: 'daily' as BriefingType,
  topic: '',
  content: '',
  fullContent: '',
  requiredCount: 0,
  actualCount: 0,
  absentees: [] as string[],
  weather: '晴',
  keyRisks: [] as string[],
  ppeChecks: [] as string[],
  status: 'completed' as BriefingStatus,
  source: 'manual' as BriefingSource
})

function openAdd() {
  isEdit.value = false
  const today = dayjs().format('YYYY-MM-DD')
  Object.assign(editForm, {
    id: '',
    date: today,
    siteId: siteOptions[0]?.value || '',
    siteName: siteOptions[0]?.label || '',
    briefer: '',
    type: 'daily',
    topic: '',
    content: '',
    fullContent: '',
    requiredCount: 0,
    actualCount: 0,
    absentees: [],
    weather: '晴',
    keyRisks: [],
    ppeChecks: [],
    status: 'completed',
    source: 'manual'
  })
  editVisible.value = true
}

function openEdit(row: BriefingRecord) {
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

function aiGenerate() {
  if (!editForm.siteName || !editForm.date) {
    message.warning('请先选择工地和日期')
    return
  }
  generating.value = true
  setTimeout(() => {
    const generated = generateAiBriefing(editForm.siteName, editForm.date)
    Object.assign(editForm, generated)
    editForm.source = 'ai'
    generating.value = false
    message.success('AI 已生成交底草稿，请核对后提交')
  }, 1200)
}

const editError = computed(() => {
  if (!editForm.briefer.trim()) return '请输入交底人'
  if (!editForm.date) return '请选择日期'
  if (!editForm.siteName) return '请选择工地'
  if (!editForm.topic.trim()) return '请输入交底主题'
  return ''
})

function handleEditSave() {
  if (editError.value) return
  if (isEdit.value) {
    const idx = briefingRecords.findIndex(r => r.id === editForm.id)
    if (idx > -1) {
      const original = briefingRecords[idx]
      briefingRecords[idx] = {
        ...original,
        date: editForm.date,
        siteId: editForm.siteId,
        siteName: editForm.siteName,
        briefer: editForm.briefer,
        type: editForm.type,
        topic: editForm.topic,
        content: editForm.content,
        fullContent: editForm.fullContent,
        requiredCount: editForm.requiredCount,
        actualCount: editForm.actualCount,
        absentees: [...editForm.absentees],
        weather: editForm.weather,
        keyRisks: [...editForm.keyRisks],
        ppeChecks: [...editForm.ppeChecks],
        status: editForm.status,
        source: editForm.source
      }
    }
    message.success('交底记录已更新')
  } else {
    const newRecord: BriefingRecord = {
      id: `bf-${Date.now()}`,
      date: editForm.date,
      siteId: editForm.siteId,
      siteName: editForm.siteName,
      briefer: editForm.briefer,
      type: editForm.type,
      topic: editForm.topic,
      content: editForm.content,
      fullContent: editForm.fullContent,
      requiredCount: editForm.requiredCount,
      actualCount: editForm.actualCount,
      absentees: [...editForm.absentees],
      weather: editForm.weather,
      keyRisks: [...editForm.keyRisks],
      ppeChecks: [...editForm.ppeChecks],
      status: editForm.status,
      source: editForm.source,
      createdAt: `${editForm.date} ${new Date().toTimeString().slice(0, 5)}`
    }
    briefingRecords.unshift(newRecord)
    message.success('交底记录已创建')
  }
  editVisible.value = false
}
</script>

<template>
  <div class="bl-page">
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
              <label>交底类型</label>
              <a-select v-model:value="typeFilter" allow-clear placeholder="全部类型">
                <a-select-option value="all">全部类型</a-select-option>
                <a-select-option v-for="t in briefingTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</a-select-option>
              </a-select>
            </div>
            <div class="search-item">
              <label>状态</label>
              <a-select v-model:value="statusFilter" allow-clear placeholder="全部状态">
                <a-select-option value="all">全部状态</a-select-option>
                <a-select-option v-for="s in briefingStatusOptions" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
              </a-select>
            </div>
            <div class="search-item search-item--kw">
              <label>关键字</label>
              <a-input v-model:value="keyword" placeholder="搜索交底人/主题/内容" allow-clear />
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
              <i class="i-ant-design-plus-outlined" />新增交底
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
            :scroll="{ x: 1400 }"
            size="middle"
            class="report-table"
            :custom-row="(record: BriefingRecord) => ({ onClick: () => openDetail(record) })"
          >
            <a-table-column title="日期" data-index="date" :width="120" />

            <a-table-column title="工地" data-index="siteName" :width="160" :ellipsis="true" />

            <a-table-column title="交底人" data-index="briefer" :width="100" />

            <a-table-column title="类型" data-index="type" :width="110">
              <template #default="{ record }">
                <span class="type-tag" :style="{ background: briefingTypeMeta[record.type as BriefingType].color + '18', color: briefingTypeMeta[record.type as BriefingType].color }">
                  <i :class="briefingTypeMeta[record.type as BriefingType].icon" />
                  {{ briefingTypeMeta[record.type as BriefingType].label }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="交底主题" data-index="topic" :width="220" :ellipsis="true" />

            <a-table-column title="应到/实到" :width="110">
              <template #default="{ record }">
                <span class="count-cell">
                  <b>{{ record.actualCount }}</b> / {{ record.requiredCount }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="来源" data-index="source" :width="90">
              <template #default="{ record }">
                <span class="source-tag" :style="{ background: briefingSourceMeta[record.source as BriefingSource].bg, color: briefingSourceMeta[record.source as BriefingSource].color }">
                  <i :class="briefingSourceMeta[record.source as BriefingSource].icon" />
                  {{ briefingSourceMeta[record.source as BriefingSource].label }}
                </span>
              </template>
            </a-table-column>

            <a-table-column title="状态" data-index="status" :width="90">
              <template #default="{ record }">
                <span class="status-tag" :style="{ background: briefingStatusMeta[record.status as BriefingStatus].bg, color: briefingStatusMeta[record.status as BriefingStatus].color }">
                  <span class="status-dot" :style="{ background: briefingStatusMeta[record.status as BriefingStatus].color }" />
                  {{ briefingStatusMeta[record.status as BriefingStatus].label }}
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
      title="班前交底详情"
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
              <span class="source-tag" :style="{ background: briefingSourceMeta[detailData.source].bg, color: briefingSourceMeta[detailData.source].color }">
                <i :class="briefingSourceMeta[detailData.source].icon" />
                {{ briefingSourceMeta[detailData.source].label }}
              </span>
              <span class="status-tag lg" :style="{ background: briefingStatusMeta[detailData.status].bg, color: briefingStatusMeta[detailData.status].color }">
                <span class="status-dot" :style="{ background: briefingStatusMeta[detailData.status].color }" />
                {{ briefingStatusMeta[detailData.status].label }}
              </span>
            </div>
          </div>

          <!-- 基本信息栏 -->
          <div class="detail-info-bar">
            <span class="info-item"><i class="i-ant-design-user-outlined" />{{ detailData.briefer }}</span>
            <span class="info-item"><i class="i-ant-design-cloud-outlined" />{{ detailData.weather }}</span>
            <span class="info-item"><i class="i-ant-design-flag-outlined" />{{ briefingTypeMeta[detailData.type].label }}</span>
            <span class="info-item"><i class="i-ant-design-clock-circle-outlined" />{{ detailData.createdAt.substring(11) }}</span>
          </div>

          <!-- 出勤统计 -->
          <div class="detail-stats">
            <div class="stat-box stat-box--total">
              <span class="stat-label">应到</span>
              <span class="stat-value">{{ detailData.requiredCount }}</span>
            </div>
            <div class="stat-box stat-box--ok">
              <span class="stat-label">实到</span>
              <span class="stat-value">{{ detailData.actualCount }}</span>
            </div>
            <div class="stat-box stat-box--warn">
              <span class="stat-label">缺勤</span>
              <span class="stat-value">{{ detailData.requiredCount - detailData.actualCount }}</span>
            </div>
          </div>

          <!-- 内容区块 -->
          <div class="detail-content-blocks">
            <div class="detail-block">
              <span class="detail-block-label"><i class="i-ant-design-bulb-outlined" />交底主题</span>
              <p class="detail-block-text">{{ detailData.topic }}</p>
            </div>
            <div class="detail-block">
              <span class="detail-block-label"><i class="i-ant-design-alert-outlined" />关键风险点</span>
              <div class="tag-group">
                <span v-for="risk in detailData.keyRisks" :key="risk" class="risk-tag">{{ risk }}</span>
              </div>
            </div>
            <div class="detail-block">
              <span class="detail-block-label"><i class="i-ant-design-safety-outlined" />劳保检查项</span>
              <div class="tag-group">
                <span v-for="ppe in detailData.ppeChecks" :key="ppe" class="ppe-tag">{{ ppe }}</span>
              </div>
            </div>
            <div class="detail-block">
              <span class="detail-block-label"><i class="i-ant-design-file-text-outlined" />交底内容</span>
              <p class="detail-block-text">{{ detailData.fullContent }}</p>
            </div>
            <div v-if="detailData.absentees.length > 0" class="detail-block">
              <span class="detail-block-label"><i class="i-ant-design-team-outlined" />缺勤说明</span>
              <p class="detail-block-text">{{ detailData.absentees.join('；') }}</p>
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
      :title="isEdit ? '编辑交底记录' : '新增交底记录'"
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
            {{ generating ? 'AI 生成中...' : 'AI 生成交底' }}
          </button>
          <span class="ai-hint">基于工地信息和当日作业内容，AI 自动生成交底草稿</span>
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
            <label><span class="req">*</span>交底人</label>
            <a-input v-model:value="editForm.briefer" placeholder="请输入交底人姓名" />
          </div>
          <div class="form-item">
            <label>交底类型</label>
            <a-select v-model:value="editForm.type" style="width:100%">
              <a-select-option v-for="t in briefingTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</a-select-option>
            </a-select>
          </div>
        </div>

        <div class="form-row-3">
          <div class="form-item">
            <label>天气</label>
            <a-select v-model:value="editForm.weather" style="width:100%">
              <a-select-option v-for="w in weatherOptions" :key="w" :value="w">{{ w }}</a-select-option>
            </a-select>
          </div>
          <div class="form-item">
            <label>应到人数</label>
            <a-input-number v-model:value="editForm.requiredCount" :min="0" style="width:100%" />
          </div>
          <div class="form-item">
            <label>实到人数</label>
            <a-input-number v-model:value="editForm.actualCount" :min="0" :max="editForm.requiredCount" style="width:100%" />
          </div>
        </div>

        <div class="form-item">
          <label><span class="req">*</span>交底主题</label>
          <a-input v-model:value="editForm.topic" placeholder="请输入交底主题" />
        </div>

        <!-- 关键风险点 -->
        <div class="form-item">
          <label>关键风险点</label>
          <a-select v-model:value="editForm.keyRisks" mode="multiple" style="width:100%" placeholder="选择关键风险点">
            <a-select-option v-for="risk in keyRiskOptions" :key="risk" :value="risk">{{ risk }}</a-select-option>
          </a-select>
        </div>

        <!-- 劳保检查项 -->
        <div class="form-item">
          <label>劳保检查项</label>
          <a-select v-model:value="editForm.ppeChecks" mode="multiple" style="width:100%" placeholder="选择劳保用品检查项">
            <a-select-option v-for="ppe in ppeCheckOptions" :key="ppe" :value="ppe">{{ ppe }}</a-select-option>
          </a-select>
        </div>

        <!-- 文本区 -->
        <div class="form-item">
          <label>交底内容</label>
          <a-textarea v-model:value="editForm.fullContent" :rows="4" placeholder="详细交底内容" />
        </div>

        <div class="form-item">
          <label>缺勤说明</label>
          <a-textarea v-model:value="editForm.content" :rows="2" placeholder="如有缺勤请说明，无则留空" />
        </div>

        <div class="form-row-2">
          <div class="form-item">
            <label>状态</label>
            <a-select v-model:value="editForm.status" style="width:100%">
              <a-select-option v-for="s in briefingStatusOptions" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
            </a-select>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.bl-page {
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
}

.detail-title { font-size: 18px; font-weight: 600; color: $text-base; margin: 0; }
.detail-date { font-size: 14px; color: $text-secondary; }

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
    display: flex; align-items: center; gap: 4px;
    font-size: 13px; color: $text-secondary;
    i { font-size: 13px; color: $text-muted; }
  }
}

/* 出勤统计三宫格 */
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
  .stat-label { font-size: 12px; color: $text-muted; }
  .stat-value { font-size: 28px; font-weight: 800; line-height: 1; }
  &--total .stat-value { color: $color-primary; }
  &--ok .stat-value { color: #2bb3a3; }
  &--warn .stat-value { color: #fa8c16; }
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

.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.risk-tag {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 3px;
  background: rgba(255, 77, 79, 0.08);
  color: #ff4d4f;
  white-space: nowrap;
}

.ppe-tag {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 3px;
  background: rgba(43, 179, 163, 0.08);
  color: #2bb3a3;
  white-space: nowrap;
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
