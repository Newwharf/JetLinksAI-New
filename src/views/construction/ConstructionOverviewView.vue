<script setup lang="ts">
/**
 * 工地态势 - 工地总览
 * 左侧：统计区（两行，可点击过滤）+ 搜索 + 省市区树状菜单 + 工地列表
 * 右侧：Leaflet 地图（高德瓦片） + 工地标记 + 点击弹窗（含4标签页事件列表）
 */
import { useRouter } from 'vue-router'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  constructionSites,
  regionTree,
  eventMeta,
  sizeTypeMeta,
  formatArea,
  hasAbnormal,
  getSiteEvents,
  type ConstructionSite,
  type RegionNode,
  type EventType,
  type SiteEvent
} from './posture.mock'

const router = useRouter()

// ===== 事件类型列表（用于标签页）=====
const eventTypes: EventType[] = ['safety', 'risk', 'health', 'alert']

// ===== 搜索 =====
const searchKeyword = ref('')

const filteredSites = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return constructionSites
  return constructionSites.filter(
    s => s.name.toLowerCase().includes(kw) || s.address.toLowerCase().includes(kw)
  )
})

const searching = computed(() => searchKeyword.value.trim().length > 0)

// ===== 统计区点击过滤 =====
// null = 不过滤, 'safety' | 'risk' | 'health' | 'alert' = 按事件类型过滤
const filterType = ref<EventType | null>(null)

function toggleFilter(type: EventType) {
  filterType.value = filterType.value === type ? null : type
}

// 实际展示的工地（搜索 + 事件类型过滤）
const visibleSites = computed(() => {
  let sites = filteredSites.value
  if (filterType.value) {
    sites = sites.filter(s => s.events.some(e => e.type === filterType.value))
  }
  return sites
})

// 判断工地是否在当前过滤条件下可见
function isSiteVisible(site: ConstructionSite): boolean {
  return visibleSites.value.some(s => s.id === site.id)
}

// ===== 顶部统计 =====
const stats = computed(() => {
  const total = constructionSites.length
  const countByType = (t: EventType) =>
    constructionSites.filter(s => s.events.some(e => e.type === t)).length
  return {
    total,
    safetyCount: countByType('safety'),
    riskCount: countByType('risk'),
    healthCount: countByType('health'),
    alertCount: countByType('alert')
  }
})

// ===== 树状菜单展开状态 =====
const expandedKeys = ref<Set<string>>(new Set(['330000', '330100']))

function toggleExpand(node: RegionNode) {
  if (expandedKeys.value.has(node.code)) {
    expandedKeys.value.delete(node.code)
  } else {
    expandedKeys.value.add(node.code)
  }
}

function isExpanded(node: RegionNode): boolean {
  if (searching.value || filterType.value) return true
  return expandedKeys.value.has(node.code)
}

// 搜索或过滤时自动展开全部
watch([searching, filterType], ([s, f]) => {
  if (s || f) {
    regionTree.forEach(collectAllCodes)
  }
})

function collectAllCodes(node: RegionNode) {
  expandedKeys.value.add(node.code)
  if (node.children) node.children.forEach(collectAllCodes)
}

function siteCount(node: RegionNode): number {
  if (node.sites) return node.sites.length
  if (node.children) return node.children.reduce((sum, c) => sum + siteCount(c), 0)
  return 0
}

function filteredSiteCount(node: RegionNode): number {
  const allSites = node.sites || collectSitesFromNode(node)
  if (!searching.value && !filterType.value) return siteCount(node)
  return allSites.filter(s => isSiteVisible(s)).length
}

function collectSitesFromNode(node: RegionNode): ConstructionSite[] {
  const result: ConstructionSite[] = []
  if (node.sites) result.push(...node.sites)
  if (node.children) {
    for (const c of node.children) result.push(...collectSitesFromNode(c))
  }
  return result
}

// ===== 左侧列表选中 =====
const selectedId = ref<string | null>(null)

function selectSite(site: ConstructionSite) {
  selectedId.value = site.id
  flyToSite(site)
  // 同步打开弹窗
  openPopup(site)
}

// ===== Leaflet 地图 =====
let map: L.Map | null = null
const mapContainer = ref<HTMLDivElement | null>(null)

function createNormalIcon(): L.DivIcon {
  return L.divIcon({
    className: 'site-marker',
    html: `<div class="marker-pin marker-normal">
      <i class="i-ant-design-environment-outlined"></i>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  })
}

function createAbnormalIcon(): L.DivIcon {
  return L.divIcon({
    className: 'site-marker',
    html: `<div class="marker-pin marker-abnormal">
      <span class="marker-pulse"></span>
      <i class="i-ant-design-alert-outlined"></i>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  })
}

const hoveredSite = ref<ConstructionSite | null>(null)

// ===== 点击弹窗 =====
const popupSiteId = ref<string | null>(null)
const popupSite = computed(() =>
  constructionSites.find(s => s.id === popupSiteId.value) || null
)

// 弹窗内标签页
const activeEventTab = ref<EventType>('safety')

function openPopup(site: ConstructionSite) {
  popupSiteId.value = popupSiteId.value === site.id ? null : site.id
  selectedId.value = site.id
  // 默认选中第一个有数据的标签
  if (popupSiteId.value) {
    const firstWithType = eventTypes.find(t => getSiteEvents(site.id, t).length > 0)
    activeEventTab.value = firstWithType || 'safety'
  }
}

function closePopup() {
  popupSiteId.value = null
}

function viewDetail(site: ConstructionSite) {
  router.push(`/construction-posture/manage/${site.id}`)
}

// 安全评分等级
function scoreClass(score: number): string {
  if (score >= 85) return 'score-high'
  if (score >= 70) return 'score-mid'
  return 'score-low'
}

function flyToSite(site: ConstructionSite) {
  if (map) {
    map.flyTo([site.lat, site.lng], 14, { duration: 0.8 })
  }
}

// 获取标签页事件数
function tabEventCount(site: ConstructionSite, type: EventType): number {
  const ev = site.events.find(e => e.type === type)
  return ev ? ev.count : 0
}

// 获取标签页事件列表
function tabEvents(site: ConstructionSite, type: EventType): SiteEvent[] {
  return getSiteEvents(site.id, type)
}

// ===== 事件详情弹窗 =====
const detailEvent = ref<SiteEvent | null>(null)

function openEventDetail(event: SiteEvent) {
  detailEvent.value = event
}

function closeEventDetail() {
  detailEvent.value = null
}

onMounted(() => {
  if (!mapContainer.value) return

  map = L.map(mapContainer.value, {
    center: [30.25, 120.15],
    zoom: 9,
    zoomControl: false,
    attributionControl: false
  })

  L.tileLayer('https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}', {
    subdomains: ['1', '2', '3', '4'],
    maxZoom: 18,
    minZoom: 3
  }).addTo(map)

  L.control.zoom({ position: 'bottomright' }).addTo(map)

  for (const site of constructionSites) {
    const icon = hasAbnormal(site) ? createAbnormalIcon() : createNormalIcon()
    const marker = L.marker([site.lat, site.lng], { icon }).addTo(map)

    marker.on('click', () => openPopup(site))
    marker.on('mouseover', () => {
      hoveredSite.value = site
    })
    marker.on('mouseout', () => {
      hoveredSite.value = null
    })
  }

  map.on('click', closePopup)

  // 确保容器尺寸就绪后刷新瓦片
  setTimeout(() => map?.invalidateSize(), 200)
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})

watch(selectedId, (id) => {
  if (!id) return
  const site = constructionSites.find(s => s.id === id)
  if (site) flyToSite(site)
})
</script>

<template>
  <div class="overview-page">
    <!-- ===== 左侧面板 ===== -->
    <aside class="left-panel">
      <!-- ① 顶部统计区 -->
      <div class="stats-bar">
        <!-- 第一行：工地总数 -->
        <div class="stat-card stat-total">
          <div class="stat-icon" style="background: rgba(110,75,255,0.1)">
            <i class="i-ant-design-appstore-outlined" style="color: #6e4bff" />
          </div>
          <div class="stat-body">
            <span class="stat-value" style="color: #6e4bff">{{ stats.total }}</span>
            <span class="stat-label">工地总数</span>
          </div>
        </div>
        <!-- 第二行：4 个事件类型统计 -->
        <div class="stat-row">
          <div
            class="stat-card stat-small"
            :class="{ 'is-active': filterType === 'safety' }"
            @click="toggleFilter('safety')"
          >
            <div class="stat-icon" style="background: rgba(255,77,79,0.1)">
              <i class="i-ant-design-alert-outlined" style="color: #ff4d4f" />
            </div>
            <div class="stat-body">
              <span class="stat-value" style="color: #ff4d4f">{{ stats.safetyCount }}</span>
              <span class="stat-label">安全告警工地</span>
            </div>
          </div>
          <div
            class="stat-card stat-small"
            :class="{ 'is-active': filterType === 'risk' }"
            @click="toggleFilter('risk')"
          >
            <div class="stat-icon" style="background: rgba(250,173,20,0.1)">
              <i class="i-ant-design-warning-outlined" style="color: #faad14" />
            </div>
            <div class="stat-body">
              <span class="stat-value" style="color: #faad14">{{ stats.riskCount }}</span>
              <span class="stat-label">风险预警工地</span>
            </div>
          </div>
          <div
            class="stat-card stat-small"
            :class="{ 'is-active': filterType === 'health' }"
            @click="toggleFilter('health')"
          >
            <div class="stat-icon" style="background: rgba(114,46,209,0.1)">
              <i class="i-ant-design-heart-outlined" style="color: #722ed1" />
            </div>
            <div class="stat-body">
              <span class="stat-value" style="color: #722ed1">{{ stats.healthCount }}</span>
              <span class="stat-label">设备健康异常工地</span>
            </div>
          </div>
          <div
            class="stat-card stat-small"
            :class="{ 'is-active': filterType === 'alert' }"
            @click="toggleFilter('alert')"
          >
            <div class="stat-icon" style="background: rgba(250,140,22,0.1)">
              <i class="i-ant-design-notification-outlined" style="color: #fa8c16" />
            </div>
            <div class="stat-body">
              <span class="stat-value" style="color: #fa8c16">{{ stats.alertCount }}</span>
              <span class="stat-label">设备告警工地</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ② 搜索 + 树状菜单 + 工地列表 -->
      <div class="list-section">
        <div class="search-bar">
          <i class="i-ant-design-search-outlined search-icon" />
          <input
            v-model="searchKeyword"
            class="search-input"
            placeholder="搜索工地名称或地址"
          />
          <i
            v-if="searchKeyword"
            class="i-ant-design-close-circle-filled search-clear"
            @click="searchKeyword = ''"
          />
        </div>

        <div class="site-tree scroll-thin">
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
                        :class="{ 'is-selected': selectedId === site.id }"
                        @click="selectSite(site)"
                      >
                        <div class="site-card__body">
                          <div class="site-card__head">
                            <span class="site-card__name" :title="site.name">{{ site.name }}</span>
                            <span class="site-card__area">{{ formatArea(site.area) }}</span>
                          </div>
                          <div class="site-card__footer">
                            <div class="site-card__personnel">
                              <i class="i-ant-design-team-outlined" />
                              <strong>{{ site.activePersonnel }}</strong>
                              <span>人</span>
                            </div>
                            <div class="site-card__events">
                              <template v-if="site.events.length">
                                <span
                                  v-for="ev in site.events"
                                  :key="ev.type"
                                  class="event-icon"
                                  :style="{ color: eventMeta[ev.type].color, background: eventMeta[ev.type].color + '1a' }"
                                  :title="eventMeta[ev.type].label + ' ' + ev.count"
                                >
                                  <i :class="eventMeta[ev.type].icon" />
                                  {{ ev.count }}
                                </span>
                              </template>
                              <span v-else class="event-normal">
                                <i class="i-ant-design-check-circle-outlined" />
                              </span>
                            </div>
                          </div>
                        </div>
                      </article>
                    </template>
                  </template>
                </template>
              </template>
            </template>
          </template>

          <div v-if="visibleSites.length === 0" class="empty-state">
            <i class="i-ant-design-search-outlined empty-icon" />
            <p>未找到匹配的工地</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- ===== 右侧地图 ===== -->
    <main class="map-panel">
      <div ref="mapContainer" class="map-container" />

      <!-- 悬停 tooltip -->
      <Transition name="tip-fade">
        <div v-if="hoveredSite" class="hover-tip">
          <span class="hover-tip__name">{{ hoveredSite.name }}</span>
          <span class="hover-tip__status" :class="hasAbnormal(hoveredSite) ? 'is-abnormal' : 'is-normal'">
            {{ hasAbnormal(hoveredSite) ? '有异常事件' : '运行正常' }}
          </span>
        </div>
      </Transition>

      <!-- 点击弹窗 -->
      <Transition name="popup">
        <div v-if="popupSite" class="popup-card" @click.stop>
          <button class="popup-close" @click.stop="closePopup">
            <i class="i-ant-design-close-outlined" />
          </button>

          <!-- 缩略图 -->
          <div class="popup-thumb">
            <img :src="popupSite.thumb" :alt="popupSite.name" draggable="false" />
            <!-- 安全评分（左上角） -->
            <div class="popup-score" :class="scoreClass(popupSite.safetyScore || 0)">
              <span class="popup-score__value">{{ popupSite.safetyScore }}</span>
              <span class="popup-score__label">安全评分</span>
            </div>
          </div>

          <div class="popup-body">
            <h3 class="popup-name">{{ popupSite.name }}</h3>

            <div class="popup-row">
              <i class="i-ant-design-environment-outlined popup-row__icon" />
              <span>{{ popupSite.address }}</span>
            </div>
            <div class="popup-row popup-row--desc">
              <i class="i-ant-design-file-text-outlined popup-row__icon" />
              <span>{{ popupSite.desc }}</span>
            </div>
            <div class="popup-row">
              <i class="i-ant-design-area-chart-outlined popup-row__icon" />
              <span>{{ formatArea(popupSite.area) }}</span>
              <span class="popup-size-label" :style="{ color: sizeTypeMeta[popupSite.sizeType].color }">
                · {{ sizeTypeMeta[popupSite.sizeType].label }}
              </span>
            </div>

            <div class="popup-metrics">
              <div class="popup-metric">
                <i class="i-ant-design-cloud-server-outlined" />
                <span>网关 <strong>{{ popupSite.gatewayCount }}</strong></span>
              </div>
              <div class="popup-metric">
                <i class="i-ant-design-video-camera-outlined" />
                <span>视频 <strong>{{ popupSite.videoCount }}</strong></span>
              </div>
              <div class="popup-metric">
                <i class="i-ant-design-api-outlined" />
                <span>设备 <strong>{{ popupSite.deviceCount }}</strong></span>
              </div>
              <div class="popup-metric">
                <i class="i-ant-design-team-outlined" />
                <span>活跃 <strong>{{ popupSite.activePersonnel }}</strong></span>
              </div>
            </div>

            <!-- 事件标签页 -->
            <div class="event-tabs">
              <div
                v-for="t in eventTypes"
                :key="t"
                class="event-tab"
                :class="{ 'is-active': activeEventTab === t }"
                :style="activeEventTab === t ? { color: eventMeta[t].color, borderBottomColor: eventMeta[t].color } : {}"
                @click="activeEventTab = t"
              >
                <i :class="eventMeta[t].icon" />
                <span>{{ eventMeta[t].label }}</span>
                <span class="event-tab__count" :style="{ background: eventMeta[t].color + '1a', color: eventMeta[t].color }">
                  {{ tabEventCount(popupSite, t) }}
                </span>
              </div>
            </div>

            <!-- 事件列表 -->
            <div class="event-list scroll-thin">
              <template v-if="tabEvents(popupSite, activeEventTab).length">
                <div
                  v-for="ev in tabEvents(popupSite, activeEventTab)"
                  :key="ev.id"
                  class="event-item"
                  @click="openEventDetail(ev)"
                >
                  <div class="event-item__thumb">
                    <img :src="ev.thumb" :alt="ev.title" draggable="false" />
                  </div>
                  <div class="event-item__body">
                    <span class="event-item__title">{{ ev.title }}</span>
                    <span class="event-item__location">
                      <i class="i-ant-design-environment-outlined" />
                      {{ ev.location }}
                    </span>
                    <span class="event-item__time">
                      <i class="i-ant-design-clock-circle-outlined" />
                      {{ ev.time }}
                    </span>
                  </div>
                  <i class="i-ant-design-right-outlined event-item__arrow" />
                </div>
              </template>
              <div v-else class="event-empty">
                <i class="i-ant-design-check-circle-outlined" />
                <span>暂无{{ eventMeta[activeEventTab].label }}事件</span>
              </div>
            </div>

            <button class="popup-detail-btn" @click="viewDetail(popupSite)">
              <span>查看工地详情</span>
              <i class="i-ant-design-arrow-right-outlined" />
            </button>
          </div>
        </div>
      </Transition>

      <!-- 事件详情弹窗 -->
      <Transition name="detail-popup">
        <div v-if="detailEvent" class="detail-overlay" @click="closeEventDetail">
          <div class="detail-card" @click.stop>
            <button class="detail-close" @click="closeEventDetail">
              <i class="i-ant-design-close-outlined" />
            </button>
            <div class="detail-thumb">
              <img :src="detailEvent.thumb" :alt="detailEvent.title" draggable="false" />
              <span
                class="detail-type-tag"
                :style="{ background: eventMeta[detailEvent.type].color }"
              >
                <i :class="eventMeta[detailEvent.type].icon" />
                {{ eventMeta[detailEvent.type].label }}
              </span>
            </div>
            <div class="detail-body">
              <h3 class="detail-title">{{ detailEvent.title }}</h3>
              <div class="detail-row">
                <i class="i-ant-design-environment-outlined detail-row__icon" />
                <span>{{ detailEvent.location }}</span>
              </div>
              <div class="detail-row">
                <i class="i-ant-design-clock-circle-outlined detail-row__icon" />
                <span>{{ detailEvent.time }}</span>
              </div>
              <div class="detail-row detail-row--desc">
                <i class="i-ant-design-file-text-outlined detail-row__icon" />
                <span>{{ detailEvent.desc }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>

      <!-- 图例 -->
      <div class="map-legend">
        <div class="legend-item">
          <span class="legend-dot legend-dot--normal" />
          <span>正常</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot legend-dot--abnormal" />
          <span>异常</span>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.overview-page {
  height: 100%;
  display: flex;
  gap: 8px;
  padding: 8px;
  background: $bg-page;
  overflow: hidden;
}

/* ===== 左侧面板 ===== */
.left-panel {
  width: 400px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}

/* ① 顶部统计区 */
.stats-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid $border-color-card;
}

.stat-total { width: 100%; }

.stat-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  width: 100%;
}

.stat-small {
  padding: 10px 6px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;

  &:hover {
    border-color: $color-primary;
    box-shadow: $shadow-card-active;
  }

  &.is-active {
    border-width: 2px;
    padding: 9px 5px;
  }
}

.stat-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  i { font-size: 16px; }
}

.stat-total {
  .stat-icon {
    width: 36px;
    height: 36px;
    i { font-size: 18px; }
  }
  .stat-body {
    flex-direction: row;
    align-items: baseline;
    gap: 8px;
    .stat-value { font-size: 24px; font-weight: 700; }
  }
}

.stat-small {
  .stat-icon {
    width: 28px;
    height: 28px;
    i { font-size: 14px; }
  }
  .stat-body {
    align-items: center;
    .stat-value { font-size: 18px; font-weight: 700; line-height: 1.1; }
    .stat-label { font-size: 10px; text-align: center; line-height: 1.2; white-space: nowrap; overflow: hidden; }
  }
}

.stat-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  .stat-value { font-weight: 700; line-height: 1.1; }
  .stat-label { font-size: 12px; color: $text-muted; }
}

/* ② 搜索 + 树状列表 */
.list-section {
  flex: 1;
  background: #fff;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  height: 44px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  .search-icon { font-size: 15px; color: $text-muted; flex-shrink: 0; }
  .search-input {
    flex: 1; border: none; outline: none; background: transparent;
    font-size: 13px; color: $text-base; font-family: inherit;
    &::placeholder { color: $text-muted; }
  }
  .search-clear {
    font-size: 14px; color: $text-muted; cursor: pointer;
    transition: color 0.15s;
    &:hover { color: $text-base; }
  }
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
  transition: background 0.15s;
  &:hover { background: $bg-hover; }

  .tree-arrow { font-size: 10px; color: $text-muted; width: 14px; flex-shrink: 0; }
  .tree-icon { font-size: 13px; color: $text-secondary; flex-shrink: 0; }
  .tree-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .tree-count {
    font-size: 11px; color: $text-muted; background: $bg-page;
    border-radius: 8px; padding: 0 6px; line-height: 18px; flex-shrink: 0;
  }
}

.tree-province {
  font-weight: 600;
  .tree-icon { color: #6e4bff; }
}
.tree-city { font-weight: 500; }
.tree-district { font-size: 12px; color: $text-secondary; }

/* 工地卡片（无左侧颜色条）*/
.site-card {
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid $border-color-card;
  background: #fff;
  transition: all 0.2s;
  margin: 4px 0 4px 68px;

  &:hover {
    border-color: $color-primary;
    box-shadow: $shadow-card-active;
  }
  &.is-selected {
    border-color: $color-primary;
    background: $color-primary-bg;
  }

  &__body {
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }
  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  &__name {
    font-size: 13px; font-weight: 600; color: $text-base;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  &__area {
    font-size: 11px; font-weight: 500; color: $text-tertiary; flex-shrink: 0;
  }
  &__footer {
    display: flex; align-items: center; justify-content: space-between; gap: 8px;
  }
  &__personnel {
    display: flex; align-items: center; gap: 3px; font-size: 12px; color: $text-secondary;
    i { font-size: 12px; color: $text-muted; }
    strong { font-weight: 600; color: $text-base; }
    span:last-child { color: $text-muted; }
  }
  &__events {
    display: flex; align-items: center; gap: 3px;
  }
}

.event-icon {
  display: inline-flex; align-items: center; justify-content: center; gap: 2px;
  font-size: 11px; font-weight: 600; min-width: 20px; height: 18px; padding: 0 4px;
  border-radius: 4px;
  i { font-size: 10px; }
}

.event-normal {
  display: inline-flex; align-items: center; font-size: 12px; color: $color-online;
  i { font-size: 13px; }
}

.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 60px 0; color: $text-muted;
  .empty-icon { font-size: 36px; opacity: 0.4; margin-bottom: 12px; }
  p { font-size: 13px; }
}

/* ===== 右侧地图 ===== */
.map-panel {
  flex: 1;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  overflow: hidden;
  position: relative;
  background: #e8eef5;
}

.map-container { width: 100%; height: 100%; }

/* Leaflet 标记 */
:deep(.site-marker) { background: transparent !important; border: none !important; }

:deep(.marker-pin) {
  width: 32px; height: 32px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  position: relative; background: #fff; transition: transform 0.2s;
  i { font-size: 16px; z-index: 2; }
}

:deep(.marker-normal) {
  box-shadow: 0 0 0 3px #{$color-online}, 0 2px 8px rgba(0, 0, 0, 0.15);
  i { color: #{$color-online}; }
}

:deep(.marker-abnormal) {
  box-shadow: 0 0 0 3px #ff4d4f, 0 2px 8px rgba(0, 0, 0, 0.15);
  i { color: #ff4d4f; }
}

:deep(.marker-pulse) {
  position: absolute; inset: -3px; border-radius: 50%;
  background: rgba(255, 77, 79, 0.3);
  animation: marker-pulse-anim 1.8s ease-out infinite;
}

@keyframes marker-pulse-anim {
  0% { transform: scale(1); opacity: 0.6; }
  70% { transform: scale(2.2); opacity: 0; }
  100% { transform: scale(2.2); opacity: 0; }
}

:deep(.site-marker:hover .marker-pin) { transform: scale(1.2); }

:deep(.leaflet-control-zoom) {
  border: none !important;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15) !important;
  border-radius: 8px !important;
  overflow: hidden;
  margin-bottom: 16px !important;
  margin-right: 16px !important;
}

:deep(.leaflet-control-zoom a) {
  width: 32px !important; height: 32px !important; line-height: 32px !important;
  font-size: 18px !important; color: $text-secondary !important;
  border: none !important; background: #fff !important;
  &:hover { background: $bg-hover !important; color: $color-primary !important; }
}

/* 悬停 tooltip */
.hover-tip {
  position: absolute; top: 12px; left: 50%; transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.75); border-radius: 6px; padding: 6px 12px;
  display: flex; flex-direction: column; gap: 2px; z-index: 500; pointer-events: none;
  &__name { font-size: 13px; font-weight: 500; color: #fff; }
  &__status {
    font-size: 11px;
    &.is-normal { color: #95de64; }
    &.is-abnormal { color: #ff7875; }
  }
}

.tip-fade-enter-active, .tip-fade-leave-active { transition: opacity 0.15s; }
.tip-fade-enter-from, .tip-fade-leave-to { opacity: 0; }

/* 点击弹窗 */
.popup-card {
  position: absolute; top: 12px; right: 12px; width: 440px;
  background: #fff; border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  border: 1px solid $border-color-card; overflow: hidden; z-index: 600;
  max-height: calc(100% - 24px);
  display: flex; flex-direction: column;
}

.popup-close {
  position: absolute; top: 6px; right: 6px; width: 24px; height: 24px;
  border-radius: 6px; border: none; background: rgba(255, 255, 255, 0.9);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: $text-muted; font-size: 13px; z-index: 5; transition: all 0.15s;
  &:hover { background: $bg-hover; color: $text-base; }
}

.popup-thumb {
  position: relative; width: 100%; aspect-ratio: 16 / 9;
  background: #1a1a2e; overflow: hidden; flex-shrink: 0;
  img { width: 100%; height: 100%; object-fit: cover; }
}

.popup-size-tag {
  position: absolute; top: 6px; left: 6px; font-size: 11px; font-weight: 500;
  color: #fff; padding: 2px 8px; border-radius: 4px;
}

/* 安全评分徽章（左上角） */
.popup-score {
  position: absolute; top: 6px; left: 6px;
  display: flex; flex-direction: column; align-items: center;
  padding: 4px 10px; border-radius: 8px;
  background: rgba(0, 0, 0, 0.65); backdrop-filter: blur(4px);

  &__value { font-size: 22px; font-weight: 800; line-height: 1; }
  &__label { font-size: 9px; color: rgba(255,255,255,0.8); margin-top: 2px; }

  &.score-high .popup-score__value { color: #52c41a; }
  &.score-mid  .popup-score__value { color: #faad14; }
  &.score-low  .popup-score__value { color: #ff4d4f; }
}

.popup-body {
  padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;
  overflow-y: auto; flex: 1;
}

.popup-name {
  font-size: 15px; font-weight: 600; color: $text-base;
  margin: 0; line-height: 1.3;
}

.popup-row {
  display: flex; align-items: flex-start; gap: 6px;
  font-size: 12px; color: $text-secondary; line-height: 1.5;
  &--desc { color: $text-tertiary; }
  &__icon { font-size: 13px; color: $text-muted; flex-shrink: 0; margin-top: 1px; }
}

.popup-size-label { font-weight: 500; margin-left: 4px; }

.popup-metrics {
  display: flex; gap: 12px; padding: 8px 0;
  border-top: 1px solid $border-color-card; border-bottom: 1px solid $border-color-card;
}

.popup-metric {
  display: flex; align-items: center; gap: 4px; font-size: 12px; color: $text-secondary;
  i { font-size: 14px; color: $text-muted; }
  strong { font-weight: 600; color: $text-base; }
}

/* 事件标签页 */
.event-tabs {
  display: flex; gap: 0; border-bottom: 1px solid $border-color-card;
  margin-top: 4px;
}

.event-tab {
  display: flex; align-items: center; gap: 3px;
  padding: 6px 6px; font-size: 11px; font-weight: 500; color: $text-secondary;
  cursor: pointer; border-bottom: 2px solid transparent; transition: all 0.15s;
  flex: 1; justify-content: center; white-space: nowrap;

  i { font-size: 12px; flex-shrink: 0; }

  &__count {
    font-size: 10px; font-weight: 600; padding: 0 5px; border-radius: 8px;
    line-height: 16px; min-width: 16px; text-align: center; flex-shrink: 0;
  }

  &:hover { color: $text-base; }
}

/* 事件列表 */
.event-list {
  display: flex; flex-direction: column; gap: 4px;
  max-height: 310px; overflow-y: auto;
  padding-top: 4px;
}

.event-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px; border-radius: 8px; cursor: pointer;
  border: 1px solid $border-color-card; transition: all 0.15s;

  &:hover {
    border-color: $color-primary;
    background: $color-primary-bg;
  }

  &__thumb {
    width: 48px; height: 36px; border-radius: 6px; overflow: hidden;
    background: #1a1a2e; flex-shrink: 0;
    img { width: 100%; height: 100%; object-fit: cover; }
  }

  &__body {
    flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;
  }

  &__title {
    font-size: 12px; font-weight: 500; color: $text-base;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  &__location, &__time {
    display: flex; align-items: center; gap: 3px;
    font-size: 10px; color: $text-muted;
    i { font-size: 10px; }
  }

  &__arrow {
    font-size: 12px; color: $text-muted; flex-shrink: 0;
  }
}

.event-empty {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 20px 0; color: $color-online;
  i { font-size: 24px; }
  span { font-size: 12px; }
}

.popup-detail-btn {
  display: flex; align-items: center; justify-content: center; gap: 4px;
  height: 32px; border: none; border-radius: 6px;
  background: $color-primary; color: #fff; font-size: 13px; font-weight: 500;
  cursor: pointer; font-family: inherit; transition: background 0.15s; margin-top: 4px;
  flex-shrink: 0;
  i { font-size: 12px; }
  &:hover { background: $color-primary-hover; }
}

/* 弹窗动画 */
.popup-enter-active, .popup-leave-active { transition: opacity 0.2s, transform 0.2s; }
.popup-enter-from, .popup-leave-to { opacity: 0; transform: translateX(20px); }

/* 事件详情弹窗 */
.detail-overlay {
  position: absolute; inset: 0; background: rgba(0, 0, 0, 0.4);
  z-index: 700; display: flex; align-items: center; justify-content: center;
}

.detail-card {
  width: 420px; background: #fff; border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2); overflow: hidden;
  position: relative;
}

.detail-close {
  position: absolute; top: 6px; right: 6px; width: 28px; height: 28px;
  border-radius: 6px; border: none; background: rgba(255, 255, 255, 0.9);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: $text-muted; font-size: 14px; z-index: 5; transition: all 0.15s;
  &:hover { background: $bg-hover; color: $text-base; }
}

.detail-thumb {
  position: relative; width: 100%; aspect-ratio: 16 / 9;
  background: #1a1a2e; overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; }
}

.detail-type-tag {
  position: absolute; top: 8px; left: 8px;
  font-size: 12px; font-weight: 500; color: #fff;
  padding: 3px 10px; border-radius: 4px;
  display: flex; align-items: center; gap: 4px;
  i { font-size: 13px; }
}

.detail-body {
  padding: 16px 20px; display: flex; flex-direction: column; gap: 10px;
}

.detail-title {
  font-size: 17px; font-weight: 600; color: $text-base; margin: 0;
}

.detail-row {
  display: flex; align-items: flex-start; gap: 8px;
  font-size: 13px; color: $text-secondary; line-height: 1.6;
  &--desc { color: $text-tertiary; }
  &__icon { font-size: 14px; color: $text-muted; flex-shrink: 0; margin-top: 2px; }
}

.detail-popup-enter-active, .detail-popup-leave-active { transition: opacity 0.2s; }
.detail-popup-enter-from, .detail-popup-leave-to { opacity: 0; }

/* 图例 */
.map-legend {
  position: absolute; top: 12px; left: 12px;
  background: rgba(255, 255, 255, 0.95); border: 1px solid $border-color-card;
  border-radius: 8px; padding: 8px 12px;
  display: flex; gap: 16px; z-index: 500;
}

.legend-item {
  display: flex; align-items: center; gap: 6px; font-size: 12px; color: $text-secondary;
}

.legend-dot {
  width: 12px; height: 12px; border-radius: 50%; border: 2px solid;
  &--normal { border-color: $color-online; background: #fff; }
  &--abnormal { border-color: #ff4d4f; background: #fff; }
}
</style>
