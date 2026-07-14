<script setup lang="ts">
/**
 * 塔机设备台账 — 左工地树 + 右（指标卡片 + 台账表格 + 详情）
 */
import { message } from 'ant-design-vue'
import SiteTreePanel from './SiteTreePanel.vue'
import { constructionSites } from './posture.mock'
import {
  towers,
  towerStatusMeta,
  towerTypeMeta,
  type Tower,
  type TowerStatus,
  type TowerType
} from './tower.mock'

// ===== 左侧工地树 =====
const selectedSiteIds = ref<Set<string>>(new Set(constructionSites.map(s => s.id)))
function handleSiteSelect(selected: { type: 'all' | 'site' | 'region'; id: string; siteIds: Set<string> }) {
  selectedSiteIds.value = selected.siteIds
}

const siteFiltered = computed(() => towers.filter(t => selectedSiteIds.value.has(t.siteId)))

// ===== 指标卡片 =====
const metrics = computed(() => {
  const list = siteFiltered.value
  const total = list.length
  const online = list.filter(t => t.status === 'online').length
  const alarm = list.filter(t => t.status === 'alarm').length
  const offline = list.filter(t => t.status === 'offline').length
  return [
    { key: 'total', title: '塔机总数', icon: 'i-ant-design-build-outlined', color: '#6e4bff', value: total, sub: '在册设备' },
    { key: 'online', title: '正常运行', icon: 'i-ant-design-check-circle-outlined', color: '#52c41a', value: online, sub: '在线运行' },
    { key: 'alarm', title: '报警', icon: 'i-ant-design-alert-outlined', color: '#ff4d4f', value: alarm, sub: '需关注' },
    { key: 'offline', title: '离线', icon: 'i-ant-design-api-outlined', color: '#8c8c8c', value: offline, sub: '设备掉线' }
  ]
})

// ===== 台账搜索 =====
const searchKey = ref('')
const statusFilter = ref<TowerStatus | 'all'>('all')
const typeFilter = ref<TowerType | 'all'>('all')

const filtered = computed(() => {
  let list = siteFiltered.value
  if (statusFilter.value !== 'all') list = list.filter(t => t.status === statusFilter.value)
  if (typeFilter.value !== 'all') list = list.filter(t => t.towerType === typeFilter.value)
  const kw = searchKey.value.trim().toLowerCase()
  if (kw) list = list.filter(t => t.deviceNo.toLowerCase().includes(kw) || t.model.toLowerCase().includes(kw) || t.siteName.toLowerCase().includes(kw))
  return list
})

const currentPage = ref(1)
const pageSize = ref(10)
watch([searchKey, statusFilter, typeFilter], () => { currentPage.value = 1 })
const pagedData = computed(() => filtered.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))

function handleReset() {
  searchKey.value = ''; statusFilter.value = 'all'; typeFilter.value = 'all'; currentPage.value = 1
}
function handleExport() { message.success(`已导出 ${filtered.value.length} 条塔机台账`) }

// 详情弹窗
const detailVisible = ref(false)
const detailData = ref<Tower | null>(null)
function openDetail(row: Tower) { detailData.value = row; detailVisible.value = true }

// 检验结果样式映射
const inspectResultMeta: Record<Tower['inspectResult'], { label: string; color: string; bg: string }> = {
  passed:  { label: '合格',   color: '#52c41a', bg: 'rgba(82,196,26,0.1)' },
  pending: { label: '待检',   color: '#fa8c16', bg: 'rgba(250,140,22,0.1)' },
  failed:  { label: '不合格', color: '#ff4d4f', bg: 'rgba(255,77,79,0.1)' }
}

// 用于模板内的类型守卫
const _statusMeta = towerStatusMeta
const _typeMeta = towerTypeMeta
</script>

<template>
  <div class="tl-page">
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

      <!-- 台账表格 -->
      <div class="table-card">
        <div class="search-bar">
          <div class="search-row">
            <div class="search-fields">
              <div class="search-item">
                <label>状态</label>
                <a-select v-model:value="statusFilter" allow-clear placeholder="全部状态">
                  <a-select-option value="all">全部状态</a-select-option>
                  <a-select-option value="online">正常运行</a-select-option>
                  <a-select-option value="offline">离线</a-select-option>
                  <a-select-option value="alarm">报警</a-select-option>
                </a-select>
              </div>
              <div class="search-item">
                <label>类型</label>
                <a-select v-model:value="typeFilter" allow-clear placeholder="全部类型">
                  <a-select-option value="all">全部类型</a-select-option>
                  <a-select-option value="flat_top">平头式</a-select-option>
                  <a-select-option value="hammerhead">锤头式</a-select-option>
                  <a-select-option value="luffing">动臂式</a-select-option>
                </a-select>
              </div>
              <div class="search-item search-item--kw">
                <label>关键字</label>
                <a-input v-model:value="searchKey" placeholder="设备编号/型号/工地" allow-clear />
              </div>
              <div class="search-actions search-actions--inline">
                <button class="s-btn s-btn--primary" @click="currentPage = 1"><i class="i-ant-design-search-outlined" />查询</button>
                <button class="s-btn" @click="handleReset"><i class="i-ant-design-reload-outlined" />重置</button>
              </div>
            </div>
            <div class="search-actions search-actions--right">
              <button class="s-btn s-btn--export" @click="handleExport"><i class="i-ant-design-download-outlined" />导出</button>
            </div>
          </div>
        </div>

        <div class="table-body-wrap">
          <a-table :data-source="pagedData" :pagination="false" row-key="id" :scroll="{ x: 1400 }" size="middle" class="tl-table">
            <a-table-column title="设备编号" data-index="deviceNo" :width="130" />
            <a-table-column title="规格型号" data-index="model" :width="140" />
            <a-table-column title="类型" :width="90">
              <template #default="{ record }">
                {{ _typeMeta[record.towerType as TowerType].label }}
              </template>
            </a-table-column>
            <a-table-column title="工地" data-index="siteName" :width="160" :ellipsis="true" />
            <a-table-column title="最大起重" :width="100">
              <template #default="{ record }">
                <span>{{ record.maxLift }} 吨</span>
              </template>
            </a-table-column>
            <a-table-column title="最大幅度" :width="100">
              <template #default="{ record }">
                <span>{{ record.maxRadius }} 米</span>
              </template>
            </a-table-column>
            <a-table-column title="状态" :width="100">
              <template #default="{ record }">
                <span class="status-tag" :style="{ background: _statusMeta[record.status as TowerStatus].bg, color: _statusMeta[record.status as TowerStatus].color }">{{ _statusMeta[record.status as TowerStatus].label }}</span>
              </template>
            </a-table-column>
            <a-table-column title="安装日期" data-index="installDate" :width="120" />
            <a-table-column title="检验结果" :width="100">
              <template #default="{ record }">
                <span class="status-tag" :style="{ background: inspectResultMeta[record.inspectResult as Tower['inspectResult']].bg, color: inspectResultMeta[record.inspectResult as Tower['inspectResult']].color }">{{ inspectResultMeta[record.inspectResult as Tower['inspectResult']].label }}</span>
              </template>
            </a-table-column>
            <a-table-column title="操作" :width="90" fixed="right">
              <template #default="{ record }">
                <div class="row-actions" @click.stop>
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
    <a-modal v-model:open="detailVisible" :width="600" centered title="塔机详情" :footer="null">
      <template v-if="detailData">
        <div class="detail-body">
          <ul class="detail-fields">
            <li class="detail-field"><span class="df-label">设备编号</span><span class="df-value">{{ detailData.deviceNo }}</span></li>
            <li class="detail-field"><span class="df-label">规格型号</span><span class="df-value">{{ detailData.model }}</span></li>
            <li class="detail-field"><span class="df-label">制造厂家</span><span class="df-value">{{ detailData.manufacturer }}</span></li>
            <li class="detail-field"><span class="df-label">塔机类型</span><span class="df-value">{{ _typeMeta[detailData.towerType].label }}</span></li>
            <li class="detail-field"><span class="df-label">所属工地</span><span class="df-value">{{ detailData.siteName }}</span></li>
            <li class="detail-field"><span class="df-label">运行状态</span><span class="df-value" :style="{ color: _statusMeta[detailData.status].color, fontWeight: 600 }">{{ _statusMeta[detailData.status].label }}</span></li>
            <li class="detail-field"><span class="df-label">最大起重量</span><span class="df-value">{{ detailData.maxLift }} 吨</span></li>
            <li class="detail-field"><span class="df-label">最大幅度</span><span class="df-value">{{ detailData.maxRadius }} 米</span></li>
            <li class="detail-field"><span class="df-label">最大起升高度</span><span class="df-value">{{ detailData.maxHeight }} 米</span></li>
            <li class="detail-field"><span class="df-label">安装日期</span><span class="df-value">{{ detailData.installDate }}</span></li>
            <li class="detail-field"><span class="df-label">检验日期</span><span class="df-value">{{ detailData.inspectDate }}</span></li>
            <li class="detail-field"><span class="df-label">检验结果</span><span class="df-value" :style="{ color: inspectResultMeta[detailData.inspectResult].color, fontWeight: 600 }">{{ inspectResultMeta[detailData.inspectResult].label }}</span></li>
            <li class="detail-field"><span class="df-label">使用登记证号</span><span class="df-value">{{ detailData.certNo }}</span></li>
            <li class="detail-field"><span class="df-label">当前吊重</span><span class="df-value">{{ detailData.currentLoad }} 吨</span></li>
            <li class="detail-field"><span class="df-label">当前幅度</span><span class="df-value">{{ detailData.currentRadius }} 米</span></li>
            <li class="detail-field"><span class="df-label">吊钩高度</span><span class="df-value">{{ detailData.currentHeight }} 米</span></li>
            <li class="detail-field"><span class="df-label">回转角度</span><span class="df-value">{{ detailData.currentAngle }}°</span></li>
            <li class="detail-field"><span class="df-label">风速</span><span class="df-value">{{ detailData.windSpeed }} m/s</span></li>
            <li class="detail-field"><span class="df-label">载荷率</span><span class="df-value">{{ detailData.loadRate }}%</span></li>
          </ul>
        </div>
      </template>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.tl-page { height: 100%; display: flex; gap: 8px; padding: 8px; overflow: hidden; }
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

.table-card { flex: 1; min-height: 0; background: #fff; border: 1px solid $border-color-card; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; }
.search-bar { background: #fff; border-bottom: 1px solid $border-color-card; padding: 16px; flex-shrink: 0; }
.search-row { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-end; justify-content: space-between; }
.search-fields { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-end; flex: 1; }
.search-actions { display: flex; gap: 8px; flex-shrink: 0; &--inline { align-items: flex-end; } &--right { align-items: flex-end; } }
.search-item { display: flex; flex-direction: column; gap: 4px;
  label { font-size: 12px; font-weight: 500; color: $text-muted; white-space: nowrap; }
  :deep(.ant-select) { width: 150px; }
  :deep(.ant-select-selector), :deep(.ant-input) { border-radius: 6px !important; font-size: 13px; }
  &--kw { :deep(.ant-input) { width: 220px; } }
}
.s-btn { display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 14px; border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s;
  i { font-size: 14px; }
  &:hover { color: $color-primary; border-color: $color-primary; }
  &--primary { background: $color-primary; border-color: $color-primary; color: #fff; &:hover { background: $color-primary-hover; border-color: $color-primary-hover; color: #fff; } }
  &--export { border-color: $color-primary; color: $color-primary; background: $color-primary-bg; &:hover { background: $color-primary; color: #fff; } }
}

.table-body-wrap { flex: 1; min-height: 0; overflow-y: auto; overflow-x: auto; }
.tl-table {
  :deep(.ant-table-thead > tr > th) { background: #fafbfc; font-size: 13px; font-weight: 600; color: $text-base; border-bottom: 1px solid $border-color-card; }
  :deep(.ant-table-tbody > tr > td) { font-size: 13px; color: $text-secondary; }
  :deep(.ant-table-tbody > tr:hover > td) { background: #faf9ff; }
}
.status-tag { display: inline-flex; align-items: center; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px; }

/* 行操作按钮（透明文字链接） */
.row-actions { display: flex; gap: 6px; }
.action-btn { display: flex; align-items: center; gap: 3px; border: none; background: transparent; color: $color-primary; font-size: 13px; cursor: pointer; font-family: inherit; padding: 2px 4px; transition: opacity 0.15s;
  i { font-size: 14px; }
  &:hover { opacity: 0.8; text-decoration: underline; }
}

.pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid $border-color-card; flex-shrink: 0;
  .page-total { font-size: 13px; color: $text-muted; }
  :deep(.ant-pagination-item) { border-radius: 6px; }
  :deep(.ant-pagination-item-active) { border-color: $color-primary; a { color: $color-primary; } }
}

/* 详情弹窗 */
.detail-body { display: flex; flex-direction: column; gap: 14px; padding: 4px; }
.detail-fields { list-style: none; margin: 0; padding: 0; border: 1px solid $border-color-card; border-radius: 10px; overflow: hidden; display: grid; grid-template-columns: 1fr 1fr; }
.detail-field { display: flex; flex-direction: column; gap: 4px; padding: 10px 14px; border-bottom: 1px solid $border-color-card; border-right: 1px solid $border-color-card;
  &:nth-child(2n) { border-right: none; }
  .df-label { font-size: 12px; color: $text-muted; }
  .df-value { font-size: 13px; color: $text-base; }
}
</style>
