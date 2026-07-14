<script setup lang="ts">
/**
 * 车辆违章统计 — 左工地树 + 右（指标+图表+台账表格+新增）
 * 违章 = 工地规章制度违规（非交通法违章），无扣分
 */
import { ref, computed, watch, reactive } from 'vue'
import { message } from 'ant-design-vue'
import ECharts from '@/components/ECharts.vue'
import dayjs from 'dayjs'
import SiteTreePanel from './SiteTreePanel.vue'
import { constructionSites } from './posture.mock'
import {
  violationRecords,
  violationTypeMeta,
  violationStatusMeta,
  violationSourceMeta,
  violationTypeOptions,
  type ViolationType,
  type ViolationStatus,
  type ViolationSource,
  type ViolationRecord
} from './vehicle-ledger.mock'

// ===== 左侧工地树 =====
const selectedSiteIds = ref<Set<string>>(new Set(constructionSites.map(s => s.id)))
function handleSiteSelect(selected: { type: 'all' | 'site' | 'region'; id: string; siteIds: Set<string> }) {
  selectedSiteIds.value = selected.siteIds
}

const siteFiltered = computed(() => violationRecords.filter(r => selectedSiteIds.value.has(r.siteId)))

// ===== 指标卡片 =====
const metrics = computed(() => {
  const list = siteFiltered.value
  const total = list.length
  const pending = list.filter(r => r.status === 'pending').length
  const totalFine = list.reduce((s, r) => s + r.fineAmount, 0)
  const aiCount = list.filter(r => r.reportSource === 'ai').length
  return [
    { key: 'total', title: '违章总数', icon: 'i-ant-design-alert-outlined', color: '#6e4bff', value: total, sub: '近 60 天' },
    { key: 'pending', title: '待处理', icon: 'i-ant-design-clock-circle-outlined', color: '#fa8c16', value: pending, sub: '需尽快处理' },
    { key: 'fine', title: '罚款总额', icon: 'i-ant-design-money-collect-outlined', color: '#ff4d4f', value: '¥' + totalFine.toLocaleString(), sub: '累计' },
    { key: 'ai', title: 'AI 上报', icon: 'i-ant-design-robot-outlined', color: '#722ed1', value: aiCount, sub: `占比 ${total > 0 ? Math.round(aiCount / total * 100) : 0}%` }
  ]
})

// ===== 图表：违章类型分布（饼图）=====
const typeOption = computed(() => {
  const data = (Object.keys(violationTypeMeta) as ViolationType[]).map(t => ({
    name: violationTypeMeta[t].label,
    value: siteFiltered.value.filter(r => r.violationType === t).length,
    itemStyle: { color: violationTypeMeta[t].color }
  })).filter(d => d.value > 0)
  return {
    tooltip: { trigger: 'item', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [8, 12], textStyle: { color: '#111418', fontSize: 12 } },
    legend: { bottom: 0, type: 'scroll', icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: { color: '#3a3f47', fontSize: 11 } },
    series: [{ type: 'pie', radius: '55%', center: ['50%', '40%'], label: { formatter: '{b}\n{c}次', fontSize: 11, color: '#3a3f47' }, data }]
  }
})

// ===== 图表：违章趋势 =====
const trendOption = computed(() => {
  const days: string[] = []
  const counts: number[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date('2026-07-13')
    d.setDate(d.getDate() - i)
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
    days.push(`${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
    counts.push(siteFiltered.value.filter(r => r.violationTime.substring(0,10) === ds).length)
  }
  return {
    tooltip: { trigger: 'axis', backgroundColor: '#fff', borderColor: '#f0f4f8', borderWidth: 1, borderRadius: 8, padding: [10,14], textStyle: { color: '#111418', fontSize: 12 }, axisPointer: { type: 'line', lineStyle: { color: '#6e4bff', type: 'dashed', width: 1 } } },
    grid: { left: 40, right: 12, top: 16, bottom: 28 },
    xAxis: { type: 'category', data: days, axisLine: { lineStyle: { color: '#dbe4f1' } }, axisTick: { show: false }, axisLabel: { color: '#8c8c8c', fontSize: 11 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: '#f0f4f8' } }, axisLabel: { color: '#8c8c8c', fontSize: 12 } },
    series: [{ type: 'line', smooth: true, symbol: 'circle', symbolSize: 4, showSymbol: false, data: counts, itemStyle: { color: '#ff4d4f' }, lineStyle: { width: 2, color: '#ff4d4f' }, areaStyle: { color: { type: 'linear', x:0,y:0,x2:0,y2:1, colorStops: [{ offset: 0, color: 'rgba(255,77,79,0.18)' }, { offset: 1, color: 'rgba(255,77,79,0)' }] } } }]
  }
})

// ===== 台账搜索 =====
const searchKey = ref('')
const typeFilter = ref<ViolationType | 'all'>('all')
const statusFilter = ref<ViolationStatus | 'all'>('all')
const sourceFilter = ref<ViolationSource | 'all'>('all')
const timeRange = ref<[dayjs.Dayjs, dayjs.Dayjs]>()

const filtered = computed(() => {
  let list = siteFiltered.value
  if (typeFilter.value !== 'all') list = list.filter(r => r.violationType === typeFilter.value)
  if (statusFilter.value !== 'all') list = list.filter(r => r.status === statusFilter.value)
  if (sourceFilter.value !== 'all') list = list.filter(r => r.reportSource === sourceFilter.value)
  if (timeRange.value && timeRange.value.length === 2) {
    const [s, e] = timeRange.value
    list = list.filter(r => r.violationTime.substring(0,10) >= s.format('YYYY-MM-DD') && r.violationTime.substring(0,10) <= e.format('YYYY-MM-DD'))
  }
  const kw = searchKey.value.trim().toLowerCase()
  if (kw) list = list.filter(r => r.plate.toLowerCase().includes(kw) || r.driver.toLowerCase().includes(kw) || r.siteName.toLowerCase().includes(kw))
  return list
})

const currentPage = ref(1)
const pageSize = ref(10)
watch([searchKey, typeFilter, statusFilter, sourceFilter, timeRange], () => { currentPage.value = 1 })
const pagedData = computed(() => filtered.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))

function handleReset() {
  searchKey.value = ''; typeFilter.value = 'all'; statusFilter.value = 'all'; sourceFilter.value = 'all'; timeRange.value = undefined; currentPage.value = 1
}
function handleExport() { message.success(`已导出 ${filtered.value.length} 条违章记录`) }

// 详情弹窗
const detailVisible = ref(false)
const detailData = ref<ViolationRecord | null>(null)
function openDetail(row: ViolationRecord) { detailData.value = row; detailVisible.value = true }

// ===== 处理弹窗 =====
const processVisible = ref(false)
const processTarget = ref<ViolationRecord | null>(null)
const processForm = reactive({
  result: 'processed' as ViolationStatus,
  comment: ''
})
const processResultOptions = [
  { value: 'processed', label: '已处理' },
  { value: 'closed', label: '已关闭（信息错误）' }
]

function openProcess(row: ViolationRecord) {
  processTarget.value = row
  processForm.result = 'processed'
  processForm.comment = ''
  processVisible.value = true
}

function handleProcessSubmit() {
  if (!processTarget.value) return
  processTarget.value.status = processForm.result
  if (processForm.comment.trim()) {
    processTarget.value.description += '\n处理备注：' + processForm.comment.trim()
  }
  processVisible.value = false
  message.success(processForm.result === 'processed' ? '已标记为已处理' : '已关闭')
}

// ===== 新增弹窗 =====
const addVisible = ref(false)
const addForm = reactive({
  plate: '',
  vehicleType: '',
  driver: '',
  unit: '',
  siteName: '',
  violationType: 'speeding_in_site' as ViolationType,
  location: '',
  fineAmount: 200,
  description: ''
})
const addError = computed(() => {
  if (!addForm.plate.trim()) return '请输入车牌号'
  if (!addForm.vehicleType.trim()) return '请输入车型'
  if (!addForm.siteName.trim()) return '请输入工地名称'
  return ''
})
function openAdd() {
  addForm.plate = ''; addForm.vehicleType = ''; addForm.driver = ''; addForm.unit = ''
  addForm.siteName = ''; addForm.violationType = 'speeding_in_site'; addForm.location = ''
  addForm.fineAmount = 200; addForm.description = ''
  addVisible.value = true
}
function handleAddSubmit() {
  if (addError.value) return
  const newRecord: ViolationRecord = {
    id: `vio-manual-${Date.now()}`,
    siteId: '',
    siteName: addForm.siteName.trim(),
    plate: addForm.plate.trim(),
    vehicleType: addForm.vehicleType.trim(),
    driver: addForm.driver.trim(),
    unit: addForm.unit.trim(),
    violationType: addForm.violationType,
    reportSource: 'manual',
    reporter: '当前用户',
    location: addForm.location.trim() || addForm.siteName.trim(),
    violationTime: dayjs().format('YYYY-MM-DD HH:mm'),
    fineAmount: addForm.fineAmount,
    status: 'pending',
    description: addForm.description.trim() || violationTypeMeta[addForm.violationType].label,
    thumb: ''
  }
  violationRecords.unshift(newRecord)
  addVisible.value = false
  message.success('违章记录已添加')
}
</script>

<template>
  <div class="pa-page">
    <SiteTreePanel @select="handleSiteSelect" />

    <main class="right-panel">
      <!-- 指标卡片 -->
      <section class="metric-grid">
        <article v-for="c in metrics" :key="c.key" class="metric-card">
          <div class="metric-card__head">
            <span class="metric-icon" :style="{ background: c.color }"><i :class="c.icon" /></span>
            <span class="metric-title">{{ c.title }}</span>
          </div>
          <div class="metric-card__body">
            <strong class="metric-value">{{ c.value }}</strong>
            <span class="metric-sub-text">{{ c.sub }}</span>
          </div>
        </article>
      </section>

      <!-- 图表区 -->
      <section class="chart-grid">
        <div class="chart-card">
          <div class="chart-card__head"><strong>违章类型分布</strong></div>
          <ECharts :option="typeOption" height="180px" />
        </div>
        <div class="chart-card">
          <div class="chart-card__head"><strong>违章趋势 · 近 30 天</strong></div>
          <ECharts :option="trendOption" height="180px" />
        </div>
      </section>

      <!-- 台账表格 -->
      <div class="table-card">
        <div class="search-bar">
          <div class="search-row">
            <div class="search-fields">
              <div class="search-item">
                <label>违章类型</label>
                <a-select v-model:value="typeFilter" allow-clear placeholder="全部类型">
                  <a-select-option value="all">全部类型</a-select-option>
                  <a-select-option v-for="o in violationTypeOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
                </a-select>
              </div>
              <div class="search-item">
                <label>处理状态</label>
                <a-select v-model:value="statusFilter" allow-clear placeholder="全部状态">
                  <a-select-option value="all">全部状态</a-select-option>
                  <a-select-option value="pending">待处理</a-select-option>
                  <a-select-option value="processed">已处理</a-select-option>
                  <a-select-option value="closed">已关闭</a-select-option>
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
              <div class="search-item">
                <label>时间</label>
                <a-range-picker v-model:value="timeRange" :allow-clear="true" />
              </div>
              <div class="search-item search-item--kw">
                <label>关键字</label>
                <a-input v-model:value="searchKey" placeholder="车牌/驾驶员/工地" allow-clear />
              </div>
              <div class="search-actions search-actions--inline">
                <button class="s-btn s-btn--primary" @click="currentPage = 1"><i class="i-ant-design-search-outlined" />查询</button>
                <button class="s-btn" @click="handleReset"><i class="i-ant-design-reload-outlined" />重置</button>
              </div>
            </div>
            <div class="search-actions search-actions--right">
              <button class="s-btn s-btn--export" @click="handleExport"><i class="i-ant-design-download-outlined" />导出</button>
              <button class="s-btn s-btn--primary" @click="openAdd"><i class="i-ant-design-plus-outlined" />新增</button>
            </div>
          </div>
        </div>

        <div class="table-body-wrap">
          <a-table :data-source="pagedData" :pagination="false" row-key="id" :scroll="{ x: 1400 }" size="middle" class="vv-table">
            <a-table-column title="车牌" data-index="plate" :width="130" />
            <a-table-column title="车型" data-index="vehicleType" :width="110" />
            <a-table-column title="驾驶员" data-index="driver" :width="90" />
            <a-table-column title="工地" data-index="siteName" :width="150" :ellipsis="true" />
            <a-table-column title="违章类型" :width="130">
              <template #default="{ record }">
                <span class="type-tag" :style="{ background: violationTypeMeta[record.violationType as ViolationType].color + '18', color: violationTypeMeta[record.violationType as ViolationType].color }">{{ violationTypeMeta[record.violationType as ViolationType].label }}</span>
              </template>
            </a-table-column>
            <a-table-column title="上报来源" :width="100">
              <template #default="{ record }">
                <span :style="{ color: violationSourceMeta[record.reportSource as ViolationSource].color }">
                  <i :class="violationSourceMeta[record.reportSource as ViolationSource].icon" style="margin-right:2px" />{{ violationSourceMeta[record.reportSource as ViolationSource].label }}
                </span>
              </template>
            </a-table-column>
            <a-table-column title="违章时间" data-index="violationTime" :width="150" />
            <a-table-column title="罚款" :width="90">
              <template #default="{ record }">
                <span style="color:#ff4d4f;font-weight:500">¥{{ record.fineAmount }}</span>
              </template>
            </a-table-column>
            <a-table-column title="状态" :width="100">
              <template #default="{ record }">
                <span class="status-tag" :style="{ background: violationStatusMeta[record.status as ViolationStatus].bg, color: violationStatusMeta[record.status as ViolationStatus].color }">{{ violationStatusMeta[record.status as ViolationStatus].label }}</span>
              </template>
            </a-table-column>
            <a-table-column title="操作" :width="130" fixed="right">
              <template #default="{ record }">
                <div class="row-actions" @click.stop>
                  <button v-if="record.status === 'pending'" class="action-btn action-btn--process" @click="openProcess(record)">
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
          <span class="page-total">共 {{ filtered.length }} 条</span>
          <a-pagination v-model:current="currentPage" v-model:page-size="pageSize" :total="filtered.length" :page-size-options="['10','20','50']" show-size-changer show-quick-jumper />
        </div>
      </div>
    </main>

    <!-- 详情弹窗 -->
    <a-modal v-model:open="detailVisible" :width="600" centered title="违章详情" :footer="null">
      <template v-if="detailData">
        <div class="detail-body">
          <div v-if="detailData.thumb" class="detail-thumb"><img :src="detailData.thumb" alt="截图" /></div>
          <ul class="detail-fields">
            <li class="detail-field"><span class="df-label">车牌号</span><span class="df-value">{{ detailData.plate }}</span></li>
            <li class="detail-field"><span class="df-label">车型</span><span class="df-value">{{ detailData.vehicleType }}</span></li>
            <li class="detail-field"><span class="df-label">驾驶员</span><span class="df-value">{{ detailData.driver || '—' }}</span></li>
            <li class="detail-field"><span class="df-label">所属单位</span><span class="df-value">{{ detailData.unit || '—' }}</span></li>
            <li class="detail-field"><span class="df-label">工地</span><span class="df-value">{{ detailData.siteName }}</span></li>
            <li class="detail-field"><span class="df-label">违章类型</span><span class="df-value">{{ violationTypeMeta[detailData.violationType].label }}</span></li>
            <li class="detail-field"><span class="df-label">上报来源</span><span class="df-value">{{ violationSourceMeta[detailData.reportSource].label }}</span></li>
            <li class="detail-field"><span class="df-label">上报人</span><span class="df-value">{{ detailData.reporter }}</span></li>
            <li class="detail-field"><span class="df-label">违章地点</span><span class="df-value">{{ detailData.location }}</span></li>
            <li class="detail-field"><span class="df-label">违章时间</span><span class="df-value">{{ detailData.violationTime }}</span></li>
            <li class="detail-field"><span class="df-label">罚款金额</span><span class="df-value" style="color:#ff4d4f;font-weight:600">¥{{ detailData.fineAmount }}</span></li>
            <li class="detail-field"><span class="df-label">处理状态</span><span class="df-value">{{ violationStatusMeta[detailData.status].label }}</span></li>
          </ul>
          <div class="detail-desc"><span class="detail-desc-label">违章描述</span><p class="detail-desc-text">{{ detailData.description }}</p></div>
        </div>
      </template>
    </a-modal>

    <!-- 新增弹窗 -->
    <a-modal :open="addVisible" :width="560" centered title="新增违章记录" @cancel="addVisible = false">
      <div class="add-form">
        <div class="add-row"><label class="add-label"><span class="req">*</span>车牌号</label><a-input v-model:value="addForm.plate" placeholder="请输入车牌号" allow-clear /></div>
        <div class="add-row"><label class="add-label"><span class="req">*</span>车型</label><a-input v-model:value="addForm.vehicleType" placeholder="如渣土车、混凝土车" allow-clear /></div>
        <div class="add-row"><label class="add-label">驾驶员</label><a-input v-model:value="addForm.driver" placeholder="选填" allow-clear /></div>
        <div class="add-row"><label class="add-label">所属单位</label><a-input v-model:value="addForm.unit" placeholder="选填" allow-clear /></div>
        <div class="add-row"><label class="add-label"><span class="req">*</span>工地名称</label><a-input v-model:value="addForm.siteName" placeholder="请输入工地名称" allow-clear /></div>
        <div class="add-row"><label class="add-label"><span class="req">*</span>违章类型</label>
          <a-select v-model:value="addForm.violationType" style="width:100%">
            <a-select-option v-for="o in violationTypeOptions" :key="o.value" :value="o.value">{{ o.label }}</a-select-option>
          </a-select>
        </div>
        <div class="add-row"><label class="add-label">违章地点</label><a-input v-model:value="addForm.location" placeholder="选填" allow-clear /></div>
        <div class="add-row"><label class="add-label">罚款金额（元）</label><a-input-number v-model:value="addForm.fineAmount" :min="0" style="width:100%" /></div>
        <div class="add-row"><label class="add-label">违章描述</label><a-textarea v-model:value="addForm.description" :rows="3" placeholder="选填" /></div>
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

    <!-- 处理弹窗 -->
    <a-modal :open="processVisible" :width="480" centered title="处理违章记录" ok-text="确定" cancel-text="取消" @ok="handleProcessSubmit" @cancel="processVisible = false">
      <template v-if="processTarget">
        <div class="process-info">
          <p>车牌：<strong>{{ processTarget.plate }}</strong></p>
          <p>违章类型：{{ violationTypeMeta[processTarget.violationType].label }}</p>
          <p>工地：{{ processTarget.siteName }}</p>
        </div>
        <div class="add-row" style="margin-top:16px">
          <label class="add-label">处理结果</label>
          <a-radio-group v-model:value="processForm.result">
            <a-radio v-for="o in processResultOptions" :key="o.value" :value="o.value">{{ o.label }}</a-radio>
          </a-radio-group>
        </div>
        <div class="add-row" style="margin-top:16px">
          <label class="add-label">处理备注</label>
          <a-textarea v-model:value="processForm.comment" :rows="3" placeholder="请输入处理说明（选填）" />
        </div>
      </template>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.pa-page { height: 100%; display: flex; gap: 8px; padding: 8px; overflow: hidden; }
.right-panel { flex: 1; display: flex; flex-direction: column; gap: 8px; overflow: hidden; min-width: 0; }

.metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; flex-shrink: 0; }
.metric-card { background: #fff; border-radius: 10px; padding: 12px 14px; display: flex; flex-direction: column; gap: 8px;
  &__head { display: flex; align-items: center; gap: 8px; }
  &__body { display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; }
}
.metric-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; i { font-size: 15px; } }
.metric-title { font-size: 12px; font-weight: 500; color: $text-secondary; }
.metric-value { font-size: 22px; font-weight: 700; color: $text-base; line-height: 1.1; }
.metric-sub-text { font-size: 11px; color: $text-muted; }

.chart-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; flex-shrink: 0; }
.chart-card { background: #fff; border-radius: 10px; padding: 8px 14px; display: flex; flex-direction: column;
  &__head { margin-bottom: 4px; strong { font-size: 13px; font-weight: 600; color: $text-base; } }
}

.table-card { flex: 1; min-height: 0; background: #fff; border: 1px solid $border-color-card; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
.search-bar { background: #fff; border-bottom: 1px solid $border-color-card; padding: 16px; flex-shrink: 0; }
.search-row { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-end; justify-content: space-between; }
.search-fields { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-end; flex: 1; }
.search-actions { display: flex; gap: 8px; flex-shrink: 0; &--inline { align-items: flex-end; } &--right { align-items: flex-end; } }
.search-item { display: flex; flex-direction: column; gap: 4px;
  label { font-size: 12px; font-weight: 500; color: $text-muted; white-space: nowrap; }
  :deep(.ant-select) { width: 150px; }
  :deep(.ant-picker) { width: 240px; }
  :deep(.ant-select-selector), :deep(.ant-input), :deep(.ant-picker) { border-radius: 6px !important; font-size: 13px; }
  &--kw { :deep(.ant-input) { width: 200px; } }
}
.s-btn { display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 14px; border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s;
  i { font-size: 14px; }
  &:hover { color: $color-primary; border-color: $color-primary; }
  &--primary { background: $color-primary; border-color: $color-primary; color: #fff; &:hover { background: $color-primary-hover; border-color: $color-primary-hover; color: #fff; } }
  &--export { border-color: $color-primary; color: $color-primary; background: $color-primary-bg; &:hover { background: $color-primary; color: #fff; } }
}

.table-body-wrap { flex: 1; min-height: 0; overflow-y: auto; overflow-x: auto; }
.vv-table {
  :deep(.ant-table-thead > tr > th) { background: #fafbfc; font-size: 13px; font-weight: 600; color: $text-base; border-bottom: 1px solid $border-color-card; }
  :deep(.ant-table-tbody > tr > td) { font-size: 13px; color: $text-secondary; }
  :deep(.ant-table-tbody > tr:hover > td) { background: #faf9ff; }
}
.type-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px; }
.status-tag { display: inline-flex; align-items: center; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px; }

/* 行操作按钮（透明文字链接，与人员台账一致）*/
.row-actions { display: flex; gap: 6px; }
.action-btn { display: flex; align-items: center; gap: 3px; border: none; background: transparent; color: $color-primary; font-size: 13px; cursor: pointer; font-family: inherit; padding: 2px 4px; transition: opacity 0.15s;
  i { font-size: 14px; }
  &:hover { opacity: 0.8; text-decoration: underline; }
  &--process { color: #fa8c16; }
}

/* 处理弹窗信息 */
.process-info {
  background: #f7f8fa; border-radius: 8px; padding: 12px 14px;
  p { margin: 0 0 4px; font-size: 13px; color: $text-secondary; line-height: 1.6;
    strong { color: $text-base; }
  }
}

.pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid $border-color-card; flex-shrink: 0;
  .page-total { font-size: 13px; color: $text-muted; }
  :deep(.ant-pagination-item) { border-radius: 6px; }
  :deep(.ant-pagination-item-active) { border-color: $color-primary; a { color: $color-primary; } }
}

.detail-body { display: flex; flex-direction: column; gap: 14px; padding: 4px; }
.detail-thumb { aspect-ratio: 16/9; border-radius: 10px; overflow: hidden; background: #1a1a2e; img { width: 100%; height: 100%; object-fit: cover; } }
.detail-fields { list-style: none; margin: 0; padding: 0; border: 1px solid $border-color-card; border-radius: 10px; overflow: hidden; display: grid; grid-template-columns: 1fr 1fr; }
.detail-field { display: flex; flex-direction: column; gap: 4px; padding: 10px 14px; border-bottom: 1px solid $border-color-card; border-right: 1px solid $border-color-card;
  &:nth-child(2n) { border-right: none; }
  .df-label { font-size: 12px; color: $text-muted; }
  .df-value { font-size: 13px; color: $text-base; }
}
.detail-desc { padding: 10px 14px; background: #f7f8fa; border-radius: 8px; }
.detail-desc-label { display: block; font-size: 12px; font-weight: 500; color: $text-muted; margin-bottom: 4px; }
.detail-desc-text { margin: 0; font-size: 13px; line-height: 1.6; color: $text-secondary; }

/* 新增弹窗 */
.add-form { display: flex; flex-direction: column; gap: 16px; padding: 8px 4px 4px; }
.add-row { display: flex; flex-direction: column; gap: 6px; }
.add-label { font-size: 13px; font-weight: 500; color: $text-base; }
.req { color: #ff4d4f; margin-right: 2px; }
.add-footer { display: flex; align-items: center; justify-content: space-between; }
.add-error { font-size: 12px; color: #ff4d4f; }
.add-cancel, .add-ok { height: 32px; padding: 0 18px; border-radius: 6px; font-size: 13px; cursor: pointer; font-family: inherit; margin-left: 8px; }
.add-cancel { border: 1px solid $border-color-light; background: #fff; color: $text-secondary; &:hover { color: $color-primary; border-color: $color-primary; } }
.add-ok { border: none; background: $color-primary; color: #fff; &:hover:not(:disabled) { background: $color-primary-hover; } &:disabled { opacity: 0.5; cursor: not-allowed; } }
</style>
