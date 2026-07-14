<script setup lang="ts">
/**
 * 共享工地列表组件（省市区树 + 工地卡片）
 * 从 SafetyDailyView 提取，供安全报告、监理报告等页面复用
 */
import {
  constructionSites,
  regionTree,
  formatArea,
  sizeTypeMeta,
  type ConstructionSite,
  type RegionNode
} from './posture.mock'

// ===== emit：选中变化 =====
const emit = defineEmits<{
  select: [selected: { type: 'all' | 'site' | 'region'; id: string; siteIds: Set<string> }]
}>()

// ===== 搜索 =====
const searchKeyword = ref('')
const filteredSites = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return constructionSites
  return constructionSites.filter(s => s.name.toLowerCase().includes(kw) || s.address.toLowerCase().includes(kw))
})
const searching = computed(() => searchKeyword.value.trim().length > 0)

// ===== 树展开状态 =====
const expandedKeys = ref<Set<string>>(new Set(['330000', '330100']))
function toggleExpand(node: RegionNode) {
  if (expandedKeys.value.has(node.code)) expandedKeys.value.delete(node.code)
  else expandedKeys.value.add(node.code)
}
function isExpanded(node: RegionNode): boolean {
  if (searching.value) return true
  return expandedKeys.value.has(node.code)
}

// ===== 统计 =====
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

// ===== 选中 =====
const selectedNode = ref<{ type: 'all' | 'site' | 'region'; id: string } | null>(null)

function emitSelect() {
  if (!selectedNode.value) {
    emit('select', { type: 'all', id: '', siteIds: new Set(constructionSites.map(s => s.id)) })
    return
  }
  if (selectedNode.value.type === 'site') {
    emit('select', { type: 'site', id: selectedNode.value.id, siteIds: new Set([selectedNode.value.id]) })
  } else {
    const result = new Set<string>()
    const findAndCollect = (nodes: RegionNode[], code: string): boolean => {
      for (const n of nodes) {
        if (n.code === code) { collectSites(n).forEach(s => result.add(s.id)); return true }
        if (n.children && findAndCollect(n.children, code)) return true
      }
      return false
    }
    findAndCollect(regionTree, selectedNode.value.id)
    emit('select', { type: 'region', id: selectedNode.value.id, siteIds: result })
  }
}

function selectSite(site: ConstructionSite) {
  selectedNode.value = { type: 'site', id: site.id }
  emitSelect()
}
function selectAll() {
  selectedNode.value = null
  emitSelect()
}
</script>

<template>
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
        <div class="tree-node tree-all" :class="{ 'is-selected': !selectedNode }" @click="selectAll">
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
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

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
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 14px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
  }
}

.left-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  height: 44px;
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

  &.is-selected, &.tree-all.is-selected {
    background: $color-primary-bg;
    .tree-icon, .tree-label { color: $color-primary; }
  }
}

.tree-province { font-weight: 600; .tree-icon { color: #6e4bff; } }
.tree-city { font-weight: 500; }
.tree-district { font-size: 12px; color: $text-secondary; }

.site-card {
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid $border-color-card;
  background: #fff;
  transition: all 0.2s;
  margin: 4px 0 4px 68px;

  &:hover { border-color: $color-primary; box-shadow: $shadow-card-active; }
  &.is-selected { border-color: $color-primary; background: $color-primary-bg; }

  &__body { padding: 8px 10px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  &__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  &__name { font-size: 13px; font-weight: 600; color: $text-base; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__area { font-size: 11px; font-weight: 500; color: $text-tertiary; flex-shrink: 0; }
  &__type { font-size: 11px; font-weight: 500; }
}
</style>
