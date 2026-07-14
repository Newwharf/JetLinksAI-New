<script setup lang="ts">
/**
 * 作业许可工作台
 * 左侧工地列表 + 右侧统计卡片 + 各类型统计 + 待审批列表 + 今日作业中列表
 */
import { ref, computed } from 'vue'
import {
  constructionSites, regionTree, formatArea, sizeTypeMeta,
  type ConstructionSite, type RegionNode
} from './posture.mock'
import {
  permits,
  permitTypeMeta,
  permitStatusMeta,
  type PermitType
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

// ===== 右侧：按工地筛选的数据 =====
const sitePermits = computed(() => permits.filter(p => selectedSiteIds.value.has(p.siteId)))

const statCards = computed(() => {
  const list = sitePermits.value
  return [
    { label: '许可总数', value: list.length, icon: 'i-ant-design-safety-certificate-outlined', color: '#6e4bff' },
    { label: '待审批', value: list.filter(p => p.status === 'pending').length, icon: 'i-ant-design-clock-circle-outlined', color: '#8c8c8c' },
    { label: '已批准', value: list.filter(p => p.status === 'approved').length, icon: 'i-ant-design-check-circle-outlined', color: '#52c41a' },
    { label: '已驳回', value: list.filter(p => p.status === 'rejected').length, icon: 'i-ant-design-close-circle-outlined', color: '#ff4d4f' }
  ]
})

const typeStats = computed(() => {
  const types: PermitType[] = ['hotwork', 'height', 'lifting', 'electric', 'excavation', 'confinedspace']
  const list = sitePermits.value
  return types.map(t => ({
    type: t,
    label: permitTypeMeta[t].label,
    icon: permitTypeMeta[t].icon,
    color: permitTypeMeta[t].color,
    count: list.filter(p => p.permitType === t).length,
    pending: list.filter(p => p.permitType === t && p.status === 'pending').length,
    working: list.filter(p => p.permitType === t && p.status === 'approved').length
  }))
})

const pendingPermits = computed(() => sitePermits.value.filter(p => p.status === 'pending').slice(0, 8))
const workingPermits = computed(() => sitePermits.value.filter(p => p.status === 'approved').slice(0, 8))
</script>

<template>
  <div class="pw-page">
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
    <main class="right-panel scroll-thin">
      <!-- 统计卡片 -->
      <section class="pw-section">
        <div class="stat-grid">
          <div v-for="s in statCards" :key="s.label" class="stat-card">
            <div class="stat-icon" :style="{ background: s.color + '1a' }">
              <i :class="s.icon" :style="{ color: s.color }" />
            </div>
            <div class="stat-body">
              <span class="stat-value" :style="{ color: s.color }">{{ s.value }}</span>
              <span class="stat-label">{{ s.label }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 各类型统计 -->
      <section class="pw-section">
        <div class="db-card">
          <div class="card-head"><strong>各作业类型统计</strong></div>
          <div class="type-grid">
            <div v-for="t in typeStats" :key="t.type" class="type-card">
              <div class="type-card__head">
                <span class="type-card__icon" :style="{ background: t.color + '1a', color: t.color }"><i :class="t.icon" /></span>
                <span class="type-card__label">{{ t.label }}</span>
              </div>
              <div class="type-card__stats">
                <div class="type-card__stat"><span class="type-card__num">{{ t.count }}</span><span class="type-card__sub">总数</span></div>
                <div class="type-card__stat"><span class="type-card__num" style="color: #8c8c8c">{{ t.pending }}</span><span class="type-card__sub">待审批</span></div>
                <div class="type-card__stat"><span class="type-card__num" style="color: #52c41a">{{ t.working }}</span><span class="type-card__sub">已批准</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- 待审批 + 今日作业中 -->
      <section class="pw-section two-col">
        <div class="db-card">
          <div class="card-head"><strong>待审批许可</strong><span class="card-hint">{{ pendingPermits.length }} 条待处理</span></div>
          <div class="permit-list scroll-thin">
            <article v-for="p in pendingPermits" :key="p.id" class="permit-card">
              <span class="permit-card__type" :style="{ background: permitTypeMeta[p.permitType].color + '18', color: permitTypeMeta[p.permitType].color }"><i :class="permitTypeMeta[p.permitType].icon" />{{ permitTypeMeta[p.permitType].label }}</span>
              <div class="permit-card__body"><span class="permit-card__title" :title="p.title">{{ p.title }}</span><span class="permit-card__site">{{ p.siteName }}</span></div>
              <div class="permit-card__meta"><span class="permit-card__applicant">{{ p.applicant }}</span><span class="permit-card__time">{{ p.applyTime.substring(5) }}</span></div>
            </article>
            <div v-if="pendingPermits.length === 0" class="list-empty"><i class="i-ant-design-check-circle-outlined" /><span>暂无待审批许可</span></div>
          </div>
        </div>
        <div class="db-card">
          <div class="card-head"><strong>已批准许可</strong><span class="card-hint">{{ workingPermits.length }} 项已批准</span></div>
          <div class="permit-list scroll-thin">
            <article v-for="p in workingPermits" :key="p.id" class="permit-card">
              <span class="permit-card__type" :style="{ background: permitTypeMeta[p.permitType].color + '18', color: permitTypeMeta[p.permitType].color }"><i :class="permitTypeMeta[p.permitType].icon" />{{ permitTypeMeta[p.permitType].label }}</span>
              <div class="permit-card__body"><span class="permit-card__title" :title="p.title">{{ p.title }}</span><span class="permit-card__site">{{ p.siteName }}</span></div>
              <div class="permit-card__meta"><span class="permit-card__status" :style="{ background: permitStatusMeta.approved.bg, color: permitStatusMeta.approved.color }">{{ permitStatusMeta.approved.label }}</span><span class="permit-card__time">{{ p.workStartTime.substring(5) }} ~ {{ p.workEndTime.substring(5) }}</span></div>
            </article>
            <div v-if="workingPermits.length === 0" class="list-empty"><i class="i-ant-design-check-circle-outlined" /><span>暂无作业中的许可</span></div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;
.pw-page { height: 100%; display: flex; gap: 8px; padding: 8px; background: $bg-page; overflow: hidden; }
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
.right-panel { flex: 1; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; }
.pw-section { flex-shrink: 0; }
.db-card { background: #fff; border-radius: 14px; padding: 16px 20px; display: flex; flex-direction: column; }
.card-head { margin-bottom: 12px; display: flex; align-items: center; justify-content: space-between; gap: 8px; strong { font-size: 15px; font-weight: 600; color: $text-base; } .card-hint { font-size: 12px; color: $text-muted; } }
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.stat-card { background: #fff; border-radius: 14px; padding: 20px 24px; display: flex; align-items: center; gap: 16px; }
.stat-icon { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; i { font-size: 22px; } }
.stat-body { display: flex; flex-direction: column; gap: 4px; .stat-value { font-size: 28px; font-weight: 700; line-height: 1.1; } .stat-label { font-size: 13px; color: $text-muted; } }
.type-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
.type-card { background: $bg-page; border-radius: 10px; padding: 14px; display: flex; flex-direction: column; gap: 10px; &__head { display: flex; align-items: center; gap: 8px; } &__icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; i { font-size: 16px; } } &__label { font-size: 13px; font-weight: 600; color: $text-base; } &__stats { display: flex; justify-content: space-between; } &__stat { display: flex; flex-direction: column; align-items: center; gap: 2px; } &__num { font-size: 18px; font-weight: 700; color: $text-base; } &__sub { font-size: 10px; color: $text-muted; } }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.permit-list { flex: 1; max-height: 400px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
.permit-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid $border-color-card; border-radius: 8px; transition: all 0.15s; &:hover { border-color: $color-primary; box-shadow: $shadow-card-active; } }
.permit-card__type { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; padding: 3px 8px; border-radius: 4px; white-space: nowrap; flex-shrink: 0; i { font-size: 13px; } }
.permit-card__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.permit-card__title { font-size: 13px; font-weight: 500; color: $text-base; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.permit-card__site { font-size: 11px; color: $text-tertiary; }
.permit-card__meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
.permit-card__applicant { font-size: 12px; color: $text-secondary; }
.permit-card__status { font-size: 11px; font-weight: 500; padding: 1px 6px; border-radius: 4px; }
.permit-card__time { font-size: 11px; color: $text-muted; }
.list-empty { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 30px 0; color: $color-online; i { font-size: 28px; } span { font-size: 13px; } }
</style>
