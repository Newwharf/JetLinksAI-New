<script setup lang="ts">
/**
 * 物联设备管理 - 设备管理
 * 左侧工地列表 + 右侧统计卡片 + 搜索 + 表格 + 分页 + 新增设备弹窗
 */
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  constructionSites, regionTree, formatArea, sizeTypeMeta,
  type ConstructionSite, type RegionNode
} from './posture.mock'
import {
  devices, deviceTypeMeta, deviceTypeOptions, deviceStatusMeta, deviceStatusOptions,
  type Device, type DeviceType, type DeviceStatus
} from './device.mock'

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
function onTreeNodeClick(node: RegionNode) { selectedNode.value = { type: 'region', id: node.code } }
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

// ===== 统计卡片 =====
const statCards = computed(() => {
  const list = devices.filter(d => selectedSiteIds.value.has(d.siteId))
  return [
    { label: '设备总数', value: list.length, icon: 'i-ant-design-api-outlined', color: '#6e4bff' },
    { label: '在线设备', value: list.filter(d => d.status === 'online').length, icon: 'i-ant-design-check-circle-outlined', color: '#52c41a' },
    { label: '离线设备', value: list.filter(d => d.status === 'offline').length, icon: 'i-ant-design-disconnect-outlined', color: '#8c8c8c' },
    { label: '健康异常', value: list.filter(d => d.status === 'abnormal').length, icon: 'i-ant-design-warning-outlined', color: '#ff4d4f' }
  ]
})

// ===== 搜索 =====
const keyword = ref('')
const typeFilter = ref<DeviceType | 'all'>('all')
const statusFilter = ref<DeviceStatus | 'all'>('all')
const filteredDevices = computed(() => {
  let list = devices.filter(d => selectedSiteIds.value.has(d.siteId))
  if (keyword.value.trim()) {
    const kw = keyword.value.trim().toLowerCase()
    list = list.filter(d => d.name.toLowerCase().includes(kw) || d.location.toLowerCase().includes(kw) || d.vendor.toLowerCase().includes(kw))
  }
  if (typeFilter.value !== 'all') list = list.filter(d => d.deviceType === typeFilter.value)
  if (statusFilter.value !== 'all') list = list.filter(d => d.status === statusFilter.value)
  return list
})

// ===== 分页 =====
const currentPage = ref(1)
const pageSize = ref(10)
const pagedDevices = computed(() => filteredDevices.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))
watch([keyword, typeFilter, statusFilter, selectedNode], () => { currentPage.value = 1 })
function handleSearch() { currentPage.value = 1 }
function handleReset() { keyword.value = ''; typeFilter.value = 'all'; statusFilter.value = 'all'; currentPage.value = 1 }
function handleExport() { message.success(`已导出 ${filteredDevices.value.length} 条设备记录`) }

// ===== 详情弹窗 =====
const detailVisible = ref(false)
const detailData = ref<Device | null>(null)
function openDetail(record: Device) { detailData.value = record; detailVisible.value = true }

// ===== 新增设备 =====
const addVisible = ref(false)
const addForm = ref({
  siteId: '' as string,
  name: '',
  deviceType: '' as DeviceType | '',
  model: '',
  vendor: '',
  location: ''
})
function openAdd() {
  addForm.value = { siteId: constructionSites[0]?.id || '', name: '', deviceType: '', model: '', vendor: '', location: '' }
  addVisible.value = true
}
function submitAdd() {
  if (!addForm.value.name.trim()) { message.warning('请输入设备名称'); return }
  if (!addForm.value.siteId) { message.warning('请选择工地'); return }
  if (!addForm.value.deviceType) { message.warning('请选择设备类型'); return }
  const site = constructionSites.find(s => s.id === addForm.value.siteId)
  if (!site) return
  const newDevice: Device = {
    id: `dev-new-${Date.now()}`,
    siteId: site.id, siteName: site.name,
    name: addForm.value.name,
    deviceType: addForm.value.deviceType as DeviceType,
    model: addForm.value.model || '—',
    vendor: addForm.value.vendor || '—',
    status: 'offline',
    location: addForm.value.location || '—',
    installTime: new Date().toISOString().substring(0, 10),
    lastHeartbeat: '—',
    gateway: `网关-${site.id}`
  }
  devices.unshift(newDevice)
  message.success('设备已添加')
  addVisible.value = false
}
</script>

<template>
  <div class="dm-page">
    <!-- 左侧工地列表 -->
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
            <i class="i-ant-design-appstore-outlined tree-icon" /><span class="tree-label">全部工地</span><span class="tree-count">{{ constructionSites.length }}</span>
          </div>
          <template v-for="province in regionTree" :key="province.code">
            <div class="tree-node tree-province" @click="toggleExpand(province)">
              <i class="tree-arrow" :class="isExpanded(province) ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'" />
              <i class="i-ant-design-bank-outlined tree-icon" /><span class="tree-label">{{ province.label }}</span><span class="tree-count">{{ filteredSiteCount(province) }}</span>
            </div>
            <template v-if="isExpanded(province) && province.children">
              <template v-for="city in province.children" :key="city.code">
                <div class="tree-node tree-city" :style="{ paddingLeft: '24px' }" @click="toggleExpand(city)">
                  <i class="tree-arrow" :class="isExpanded(city) ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'" />
                  <i class="i-ant-design-home-outlined tree-icon" /><span class="tree-label">{{ city.label }}</span><span class="tree-count">{{ filteredSiteCount(city) }}</span>
                </div>
                <template v-if="isExpanded(city) && city.children">
                  <template v-for="district in city.children" :key="district.code">
                    <div class="tree-node tree-district" :style="{ paddingLeft: '48px' }" @click.stop="onTreeNodeClick(district)">
                      <i class="i-ant-design-environment-outlined tree-icon" /><span class="tree-label">{{ district.label }}</span><span class="tree-count">{{ filteredSiteCount(district) }}</span>
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
      <!-- 统计卡片 -->
      <div class="stat-grid">
        <div v-for="s in statCards" :key="s.label" class="stat-card">
          <div class="stat-icon" :style="{ background: s.color + '1a' }"><i :class="s.icon" :style="{ color: s.color }" /></div>
          <div class="stat-body"><span class="stat-value" :style="{ color: s.color }">{{ s.value }}</span><span class="stat-label">{{ s.label }}</span></div>
        </div>
      </div>

      <!-- 搜索栏 -->
      <div class="search-bar">
        <div class="search-row">
          <div class="search-fields">
            <div class="search-item"><label>设备类型</label>
              <a-select v-model:value="typeFilter" allow-clear placeholder="全部类型"><a-select-option value="all">全部类型</a-select-option><a-select-option v-for="t in deviceTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</a-select-option></a-select>
            </div>
            <div class="search-item"><label>设备状态</label>
              <a-select v-model:value="statusFilter" allow-clear placeholder="全部状态"><a-select-option value="all">全部状态</a-select-option><a-select-option v-for="s in deviceStatusOptions" :key="s.value" :value="s.value">{{ s.label }}</a-select-option></a-select>
            </div>
            <div class="search-item search-item--kw"><label>关键字</label>
              <a-input v-model:value="keyword" placeholder="搜索名称/位置/厂商" allow-clear />
            </div>
            <div class="search-actions search-actions--inline">
              <button class="s-btn s-btn--primary" @click="handleSearch"><i class="i-ant-design-search-outlined" />查询</button>
              <button class="s-btn" @click="handleReset"><i class="i-ant-design-reload-outlined" />重置</button>
            </div>
          </div>
          <div class="search-actions search-actions--right">
            <button class="s-btn s-btn--export" @click="handleExport"><i class="i-ant-design-download-outlined" />导出</button>
            <button class="s-btn s-btn--add" @click="openAdd"><i class="i-ant-design-plus-outlined" />新增设备</button>
          </div>
        </div>
      </div>

      <!-- 表格 -->
      <div class="table-card">
        <div class="table-body-wrap">
          <a-table :data-source="pagedDevices" :pagination="false" row-key="id" :scroll="{ x: 1300 }" size="middle" class="device-table" :custom-row="(record) => ({ onClick: () => openDetail(record) })">
            <a-table-column title="设备名称" data-index="name" :width="160" :ellipsis="true" />
            <a-table-column title="工地" data-index="siteName" :width="150" :ellipsis="true" />
            <a-table-column title="设备类型" :width="130">
              <template #default="{ record }">
                <span class="type-tag type-tag--fit" :style="{ background: deviceTypeMeta[record.deviceType as DeviceType].color + '18', color: deviceTypeMeta[record.deviceType as DeviceType].color }"><i :class="deviceTypeMeta[record.deviceType as DeviceType].icon" />{{ deviceTypeMeta[record.deviceType as DeviceType].label }}</span>
              </template>
            </a-table-column>
            <a-table-column title="型号" data-index="model" :width="120" />
            <a-table-column title="厂商" data-index="vendor" :width="100" />
            <a-table-column title="安装位置" data-index="location" :width="120" :ellipsis="true" />
            <a-table-column title="状态" :width="100">
              <template #default="{ record }">
                <span class="status-tag" :style="{ background: deviceStatusMeta[record.status as DeviceStatus].bg, color: deviceStatusMeta[record.status as DeviceStatus].color }"><span class="status-dot" :style="{ background: deviceStatusMeta[record.status as DeviceStatus].color }" />{{ deviceStatusMeta[record.status as DeviceStatus].label }}</span>
              </template>
            </a-table-column>
            <a-table-column title="最后心跳" data-index="lastHeartbeat" :width="150" />
            <a-table-column title="操作" :width="80" fixed="right">
              <template #default="{ record }">
                <button class="detail-btn" @click.stop="openDetail(record)"><i class="i-ant-design-eye-outlined" />详情</button>
              </template>
            </a-table-column>
          </a-table>
        </div>
        <div class="pagination-bar">
          <span class="page-total">共 {{ filteredDevices.length }} 条</span>
          <a-pagination v-model:current="currentPage" v-model:page-size="pageSize" :total="filteredDevices.length" :page-size-options="['10', '20', '50']" show-size-changer show-quick-jumper />
        </div>
      </div>
    </main>

    <!-- 详情弹窗 -->
    <a-modal v-model:open="detailVisible" :width="560" centered title="设备详情" :footer="null" @cancel="detailVisible = false">
      <template v-if="detailData">
        <div class="detail-modal">
          <ul class="detail-fields">
            <li class="detail-field"><span class="detail-field__label">设备名称</span><span class="detail-field__value">{{ detailData.name }}</span></li>
            <li class="detail-field"><span class="detail-field__label">所属工地</span><span class="detail-field__value">{{ detailData.siteName }}</span></li>
            <li class="detail-field"><span class="detail-field__label">设备类型</span><span class="detail-field__value"><span class="type-tag type-tag--fit" :style="{ background: deviceTypeMeta[detailData.deviceType].color + '18', color: deviceTypeMeta[detailData.deviceType].color }"><i :class="deviceTypeMeta[detailData.deviceType].icon" />{{ deviceTypeMeta[detailData.deviceType].label }}</span></span></li>
            <li class="detail-field"><span class="detail-field__label">型号</span><span class="detail-field__value">{{ detailData.model }}</span></li>
            <li class="detail-field"><span class="detail-field__label">厂商</span><span class="detail-field__value">{{ detailData.vendor }}</span></li>
            <li class="detail-field"><span class="detail-field__label">安装位置</span><span class="detail-field__value">{{ detailData.location }}</span></li>
            <li class="detail-field"><span class="detail-field__label">设备状态</span><span class="detail-field__value"><span class="status-tag" :style="{ background: deviceStatusMeta[detailData.status].bg, color: deviceStatusMeta[detailData.status].color }"><span class="status-dot" :style="{ background: deviceStatusMeta[detailData.status].color }" />{{ deviceStatusMeta[detailData.status].label }}</span></span></li>
            <li class="detail-field"><span class="detail-field__label">安装时间</span><span class="detail-field__value">{{ detailData.installTime }}</span></li>
            <li class="detail-field"><span class="detail-field__label">最后心跳</span><span class="detail-field__value">{{ detailData.lastHeartbeat }}</span></li>
            <li class="detail-field"><span class="detail-field__label">所属网关</span><span class="detail-field__value">{{ detailData.gateway }}</span></li>
            <li v-if="detailData.sim" class="detail-field"><span class="detail-field__label">SIM卡号</span><span class="detail-field__value">{{ detailData.sim }}</span></li>
          </ul>
        </div>
      </template>
    </a-modal>

    <!-- 新增设备弹窗 -->
    <a-modal v-model:open="addVisible" :width="520" centered title="新增设备" :footer="null" @cancel="addVisible = false">
      <div class="add-form">
        <div class="form-row"><label class="form-label">所属工地</label>
          <a-select v-model:value="addForm.siteId" placeholder="请选择工地" style="width: 100%"><a-select-option v-for="s in constructionSites" :key="s.id" :value="s.id">{{ s.name }}</a-select-option></a-select>
        </div>
        <div class="form-row"><label class="form-label">设备名称</label>
          <a-input v-model:value="addForm.name" placeholder="请输入设备名称" />
        </div>
        <div class="form-row"><label class="form-label">设备类型</label>
          <a-select v-model:value="addForm.deviceType" placeholder="请选择类型" style="width: 100%"><a-select-option v-for="t in deviceTypeOptions" :key="t.value" :value="t.value">{{ t.label }}</a-select-option></a-select>
        </div>
        <div class="form-row"><label class="form-label">型号</label>
          <a-input v-model:value="addForm.model" placeholder="请输入设备型号" />
        </div>
        <div class="form-row"><label class="form-label">厂商</label>
          <a-input v-model:value="addForm.vendor" placeholder="请输入设备厂商" />
        </div>
        <div class="form-row"><label class="form-label">安装位置</label>
          <a-input v-model:value="addForm.location" placeholder="请输入安装位置" />
        </div>
        <div class="form-actions">
          <button class="s-btn" @click="addVisible = false">取消</button>
          <button class="s-btn s-btn--primary" @click="submitAdd"><i class="i-ant-design-check-outlined" />确认添加</button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;
.dm-page { height: 100%; display: flex; gap: 8px; padding: 8px; background: $bg-page; overflow: hidden; }
.left-panel { width: 320px; flex-shrink: 0; display: flex; flex-direction: column; overflow: hidden; }
.list-section { flex: 1; background: #fff; border-radius: 10px; border: 1px solid $border-color-card; display: flex; flex-direction: column; overflow: hidden; }
.left-header { height: 44px; display: flex; align-items: center; padding: 0 16px; flex-shrink: 0; &__title { font-size: 15px; font-weight: 600; color: $text-base; } }
.left-search { display: flex; align-items: center; gap: 8px; padding: 0 14px; height: 40px; border-top: 1px solid $border-color-card; border-bottom: 1px solid $border-color-card; flex-shrink: 0; &__icon { font-size: 15px; color: $text-muted; flex-shrink: 0; } &__input { flex: 1; border: none; outline: none; background: transparent; font-size: 13px; color: $text-base; font-family: inherit; &::placeholder { color: $text-muted; } } &__clear { font-size: 14px; color: $text-muted; cursor: pointer; &:hover { color: $text-base; } } }
.site-tree { flex: 1; overflow-y: auto; padding: 6px 8px; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
.tree-node { display: flex; align-items: center; gap: 4px; height: 30px; padding: 0 8px; font-size: 13px; color: $text-base; cursor: pointer; border-radius: 6px; &:hover { background: $bg-hover; } .tree-arrow { font-size: 10px; color: $text-muted; width: 14px; flex-shrink: 0; } .tree-icon { font-size: 13px; color: $text-secondary; flex-shrink: 0; } .tree-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .tree-count { font-size: 11px; color: $text-muted; background: $bg-page; border-radius: 8px; padding: 0 6px; line-height: 18px; flex-shrink: 0; } }
.tree-all { font-weight: 600; color: $color-primary; .tree-icon { color: $color-primary; } &.is-selected { background: $color-primary-bg; } }
.tree-province { font-weight: 600; .tree-icon { color: #6e4bff; } }
.tree-city { font-weight: 500; }
.tree-district { font-size: 12px; color: $text-secondary; }
.site-card { border-radius: 8px; cursor: pointer; border: 1px solid $border-color-card; background: #fff; transition: all 0.2s; margin: 4px 0 4px 34px; &:hover { border-color: $color-primary; box-shadow: $shadow-card-active; } &.is-selected { border-color: $color-primary; background: $color-primary-bg; } &__body { padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; min-width: 0; } &__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; } &__name { font-size: 13px; font-weight: 600; color: $text-base; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } &__area { font-size: 11px; font-weight: 500; color: $text-tertiary; flex-shrink: 0; } &__type { font-size: 11px; font-weight: 500; } }
.right-panel { flex: 1; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; flex-shrink: 0; }
.stat-card { background: #fff; border-radius: 10px; padding: 16px 20px; display: flex; align-items: center; gap: 12px; }
.stat-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; i { font-size: 20px; } }
.stat-body { display: flex; flex-direction: column; gap: 2px; .stat-value { font-size: 22px; font-weight: 700; line-height: 1.1; } .stat-label { font-size: 12px; color: $text-muted; } }
.search-bar { background: #fff; border: 1px solid $border-color-card; border-radius: 10px; padding: 20px 16px; flex-shrink: 0; }
.search-row { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-end; justify-content: space-between; }
.search-fields { display: flex; flex-wrap: wrap; gap: 12px 16px; align-items: flex-end; flex: 1; }
.search-actions { display: flex; gap: 8px; flex-shrink: 0; &--inline { align-items: flex-end; } &--right { align-items: flex-end; } }
.search-item { display: flex; flex-direction: column; gap: 4px; label { font-size: 12px; font-weight: 500; color: $text-muted; white-space: nowrap; } :deep(.ant-select) { width: 150px; } :deep(.ant-select-selector), :deep(.ant-input) { border-radius: 6px !important; font-size: 13px; } &--kw { :deep(.ant-input) { width: 220px; } } }
.s-btn { display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 16px; border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s; i { font-size: 14px; } &:hover { color: $color-primary; border-color: $color-primary; } &--primary { background: $color-primary; border-color: $color-primary; color: #fff; &:hover { background: $color-primary-hover; border-color: $color-primary-hover; color: #fff; } } &--export { border-color: $color-primary; color: $color-primary; background: $color-primary-bg; &:hover { background: $color-primary; color: #fff; } } &--add { border: none; background: #52c41a; color: #fff; &:hover { background: #73d13d; color: #fff; } } }
.table-card { flex: 1; min-height: 0; background: #fff; border: 1px solid $border-color-card; border-radius: 10px; display: flex; flex-direction: column; overflow: hidden; }
.table-body-wrap { flex: 1; min-height: 0; overflow-y: auto; overflow-x: auto; }
.device-table { :deep(.ant-table-thead > tr > th) { background: #fafbfc; font-size: 13px; font-weight: 600; color: $text-base; border-bottom: 1px solid $border-color-card; } :deep(.ant-table-tbody > tr > td) { font-size: 13px; color: $text-secondary; } :deep(.ant-table-tbody > tr) { cursor: pointer; } :deep(.ant-table-tbody > tr:hover > td) { background: #faf9ff; } }
.type-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px; &--fit { width: fit-content; } i { font-size: 12px; } }
.status-tag { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; padding: 2px 8px; border-radius: 4px; .status-dot { width: 6px; height: 6px; border-radius: 50%; } }
.detail-btn { display: inline-flex; align-items: center; gap: 4px; border: none; background: transparent; color: $color-primary; font-size: 13px; cursor: pointer; font-family: inherit; padding: 2px 4px; &:hover { opacity: 0.8; text-decoration: underline; } i { font-size: 14px; } }
.pagination-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-top: 1px solid $border-color-card; flex-shrink: 0; .page-total { font-size: 13px; color: $text-muted; } :deep(.ant-pagination-item) { border-radius: 6px; } :deep(.ant-pagination-item-active) { border-color: $color-primary; a { color: $color-primary; } } }
.detail-modal { display: flex; flex-direction: column; gap: 12px; padding: 4px; }
.detail-fields { list-style: none; margin: 0; padding: 0; border: 1px solid $border-color-card; border-radius: 8px; overflow: hidden; }
.detail-field { display: flex; gap: 16px; padding: 10px 14px; border-bottom: 1px solid $border-color-card; &:last-child { border-bottom: none; } &__label { width: 80px; flex-shrink: 0; font-size: 13px; color: $text-muted; } &__value { flex: 1; font-size: 13px; color: $text-base; } }
.add-form { display: flex; flex-direction: column; gap: 12px; padding: 4px; }
.form-row { display: flex; align-items: flex-start; gap: 12px; .form-label { width: 80px; flex-shrink: 0; font-size: 13px; color: $text-muted; line-height: 32px; } :deep(.ant-input) { border-radius: 6px; } }
.form-actions { display: flex; justify-content: flex-end; gap: 8px; }
</style>
