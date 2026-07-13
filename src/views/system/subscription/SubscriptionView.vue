<script setup lang="ts">
/**
 * 订阅服务
 * 展示已订阅服务卡片网格 + 订阅抽屉 + 扩充指标抽屉 + 购物车弹窗
 * 按 design.html 设计规范实现
 */
import { message } from 'ant-design-vue'
import ServiceIcon from './ServiceIcon.vue'
import {
  subscriptions as rawSubscriptions,
  serviceCatalog,
  packageComparison,
  serviceNameMap,
  serviceNarratives,
  serviceIconMap,
  featureIconMap,
  tierIds,
  tierLabels,
  formatNumber,
  formatPrice,
  type TierId,
  type Subscription
} from './mock'

// ===== 工具函数 =====
function metricKey(feature: string, metric: string) {
  return `${feature}:${metric}`
}

function parseMetricKey(key: string) {
  const idx = key.indexOf(':')
  return { feature: key.slice(0, idx), metric: key.slice(idx + 1) }
}

function getServiceIcon(id: string) {
  return serviceIconMap[id] || 'spark'
}

function getFeatureIcon(name: string) {
  return featureIconMap[name] || 'layout'
}

function getComparisonGroup(serviceId: string) {
  const name = serviceNameMap[serviceId]
  return packageComparison.find(g => g.service === name)
}

function getServiceTiers(serviceId: string): TierId[] {
  const group = getComparisonGroup(serviceId)
  if (!group) return tierIds.slice()
  if (group.tiers) return group.tiers
  if (group.noOwnMetrics) return tierIds.slice()
  if (group.rows && group.rows.length) {
    const firstQuotas = group.rows[0].quotas
    return tierIds.filter(t => firstQuotas[t] !== undefined)
  }
  return tierIds.slice()
}

function normalizeTier(serviceId: string, tier: TierId): TierId {
  const tiers = getServiceTiers(serviceId)
  return tiers.includes(tier) ? tier : tiers[0]
}

function getTierRank(tier: TierId) {
  return tierIds.indexOf(tier)
}

function getSubscribedTier(serviceId: string): TierId {
  const sub = subscriptions.value.find(s => s.id === serviceId)
  return normalizeTier(serviceId, sub ? sub.tier : 'free')
}

function canSelectTier(serviceId: string, tier: TierId) {
  const normalized = normalizeTier(serviceId, tier)
  return getTierRank(normalized) >= getTierRank(getSubscribedTier(serviceId))
}

function clampUpgradeTier(serviceId: string, tier: TierId): TierId {
  const normalized = normalizeTier(serviceId, tier)
  const subscribed = getSubscribedTier(serviceId)
  return getTierRank(normalized) < getTierRank(subscribed) ? subscribed : normalized
}

function isNoOwnMetrics(serviceId: string) {
  const group = getComparisonGroup(serviceId)
  return !!(group && group.noOwnMetrics)
}

function getReferenceNote(serviceId: string) {
  const group = getComparisonGroup(serviceId)
  return group && group.referenceNote ? group.referenceNote : ''
}

function getServiceDef(serviceId: string) {
  return serviceCatalog.find(s => s.id === serviceId)
}

function getMetricDef(serviceId: string, featureName: string, metricName: string) {
  const service = getServiceDef(serviceId)
  if (!service) return null
  const feature = service.features.find(f => f.name === featureName)
  if (!feature) return null
  return feature.metrics.find(m => m.name === metricName) || null
}

function getTierBillingInfo(serviceId: string, tier: TierId) {
  if (tier === 'free') return { price: 0, unit: '', label: '免费' }
  const service = getServiceDef(serviceId)
  if (!service) return { price: 0, unit: '', label: '免费' }
  const planId = tier === 'basic' ? 'standard' : 'enterprise'
  const plan = service.plans.find(p => p.id === planId)
  if (!plan) return { price: 0, unit: '', label: '免费' }
  const unit = service.billingCycle === 'year' ? '年' : '月'
  return { price: plan.price, unit, label: `¥${formatPrice(plan.price)}/${unit}` }
}

function getServiceTierPrice(serviceId: string, tier: TierId) {
  return getTierBillingInfo(serviceId, tier).price
}

function canExpandService(sub: Subscription) {
  return !isNoOwnMetrics(sub.id)
}

function getSubscription(serviceId: string) {
  return subscriptions.value.find(s => s.id === serviceId)
}

// ===== 服务用量指标计算 =====
interface MetricDisplay {
  key: string
  feature: string
  metric: string
  base: number
  extra: number
  total: number
  used: number
  percent: number
}

function getMetricsForService(sub: Subscription): MetricDisplay[] {
  const group = getComparisonGroup(sub.id)
  if (!group || group.noOwnMetrics || !group.rows) return []
  return group.rows.reduce<MetricDisplay[]>((list, row) => {
    const base = row.quotas[sub.tier]
    if (base === undefined) return list
    const key = metricKey(row.feature, row.metric)
    const extra = sub.expansions[key] || 0
    const total = base + extra
    const used = sub.usage[key] ? sub.usage[key].used : 0
    const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
    list.push({ key, feature: row.feature, metric: row.metric, base, extra, total, used, percent })
    return list
  }, [])
}

function getServiceStatusText(sub: Subscription) {
  if (sub.remainingDays <= 7 || sub.statusType === 'warning') return '即将到期'
  if (sub.tier === 'free') return '可随时升级'
  return '服务稳定中'
}

function getPlanLabel(sub: Subscription) {
  return tierLabels[sub.tier] || '服务方案'
}

function getServiceCycleLabel(sub: Subscription) {
  const def = getServiceDef(sub.id)
  return def ? (def.billingCycle === 'year' ? '按年订阅' : '按月订阅') : ''
}

function getServiceAmountLabel(sub: Subscription) {
  if (sub.tier === 'free') return '免费使用'
  const amount = getServiceTierPrice(sub.id, sub.tier)
  const cycle = getServiceCycleLabel(sub)
  return `¥${formatPrice(amount)}${cycle ? ' / ' + cycle.replace('按', '').replace('订阅', '') : ''}`
}

function getServiceHighlight(sub: Subscription, metrics: MetricDisplay[]) {
  if (metrics.length) {
    const topMetric = [...metrics].sort((a, b) => b.percent - a.percent)[0]
    return { label: '最高使用率', value: `${topMetric.percent}%`, note: `${topMetric.feature} · ${topMetric.metric}` }
  }
  if (isNoOwnMetrics(sub.id)) {
    return { label: '接入说明', value: '关联服务', note: '容量跟随其他已订阅服务' }
  }
  return { label: '当前状态', value: getServiceStatusText(sub), note: '可继续完善订阅配置' }
}

// ===== 响应式状态 =====
const subscriptions = ref<Subscription[]>(JSON.parse(JSON.stringify(rawSubscriptions)))
const metricPreviewLimit = 4
const expandedMetricCards = ref<Record<string, boolean>>({})

// 订阅抽屉状态
const subscribeDrawerVisible = ref(false)
const highlightedSubscribeServiceId = ref<string | null>(null)
const drawerSelection = ref<Record<string, { tier: TierId }>>({})
const subscribeDuration = ref(1)
const subscribeDurationMax = 10

// 扩充抽屉状态
const expandDrawerVisible = ref(false)
const expansionServiceId = ref<string | null>(null)
const expansionDraft = ref<Record<string, number>>({})
const expansionCart = ref<Record<string, Record<string, number>>>({})

// 购物车弹窗状态
const cartModalVisible = ref(false)

// ===== 订阅抽屉逻辑 =====
function initDrawerSelection() {
  drawerSelection.value = {}
  serviceCatalog.forEach(service => {
    drawerSelection.value[service.id] = { tier: getSubscribedTier(service.id) }
  })
}

const subscribeTotal = computed(() => {
  let total = 0
  serviceCatalog.forEach(service => {
    const state = drawerSelection.value[service.id]
    if (!state || state.tier === 'free') return
    total += getServiceTierPrice(service.id, state.tier) * subscribeDuration.value
  })
  return total
})

function setSubscribeDuration(next: number) {
  subscribeDuration.value = Math.max(1, Math.min(subscribeDurationMax, next))
}

function applyBulkTier(tier: TierId) {
  serviceCatalog.forEach(service => {
    if (!drawerSelection.value[service.id]) return
    const tiers = getServiceTiers(service.id)
    if (!tiers.includes(tier)) return
    drawerSelection.value[service.id].tier = clampUpgradeTier(service.id, tier)
  })
}

function selectDrawerTier(serviceId: string, tier: TierId) {
  if (!canSelectTier(serviceId, tier)) return
  if (drawerSelection.value[serviceId]) {
    drawerSelection.value[serviceId].tier = clampUpgradeTier(serviceId, tier)
  }
}

function openSubscribeDrawer(serviceId?: string) {
  highlightedSubscribeServiceId.value = serviceId || null
  subscribeDuration.value = 1
  initDrawerSelection()
  subscribeDrawerVisible.value = true
}

function closeSubscribeDrawer() {
  subscribeDrawerVisible.value = false
  highlightedSubscribeServiceId.value = null
}

function confirmSubscribe() {
  serviceCatalog.forEach(service => {
    const state = drawerSelection.value[service.id]
    const sub = getSubscription(service.id)
    if (!sub || !state) return
    sub.tier = clampUpgradeTier(service.id, state.tier)
    if (state.tier === 'free') {
      sub.remainingDays = 363
      sub.statusType = 'normal'
    } else {
      const serviceDef = getServiceDef(service.id)
      const daysPerUnit = serviceDef && serviceDef.billingCycle === 'year' ? 365 : 30
      sub.remainingDays = subscribeDuration.value * daysPerUnit
      sub.statusType = 'normal'
    }
  })
  subscribeDrawerVisible.value = false
  highlightedSubscribeServiceId.value = null
  message.success('订阅已更新')
}

// ===== 扩充指标逻辑 =====
function initExpansionDraft(serviceId: string) {
  const sub = getSubscription(serviceId)
  if (expansionCart.value[serviceId]) {
    expansionDraft.value = { ...expansionCart.value[serviceId] }
  } else {
    expansionDraft.value = { ...(sub ? sub.expansions : {}) }
  }
}

function calcServiceDeltaTotal(serviceId: string, quantities: Record<string, number> | undefined) {
  const sub = getSubscription(serviceId)
  let total = 0
  if (!quantities) return 0
  Object.keys(quantities).forEach(key => {
    const newQty = quantities[key] || 0
    const oldQty = sub && sub.expansions[key] ? sub.expansions[key] : 0
    const delta = Math.max(0, newQty - oldQty)
    if (!delta) return
    const parts = parseMetricKey(key)
    const metricDef = getMetricDef(serviceId, parts.feature, parts.metric)
    if (metricDef) total += delta * metricDef.unitPrice
  })
  return total
}

function hasServiceDeltas(serviceId: string, quantities: Record<string, number> | undefined) {
  const sub = getSubscription(serviceId)
  if (!quantities) return false
  return Object.keys(quantities).some(key => {
    const newQty = quantities[key] || 0
    const oldQty = sub && sub.expansions[key] ? sub.expansions[key] : 0
    return newQty > oldQty
  })
}

function commitExpansionDraft() {
  if (!expansionServiceId.value) return
  const serviceId = expansionServiceId.value
  if (hasServiceDeltas(serviceId, expansionDraft.value)) {
    expansionCart.value[serviceId] = { ...expansionDraft.value }
  } else {
    delete expansionCart.value[serviceId]
  }
}

function calcCartTotal() {
  let total = 0
  Object.keys(expansionCart.value).forEach(serviceId => {
    total += calcServiceDeltaTotal(serviceId, expansionCart.value[serviceId])
  })
  return total
}

function calcExpansionDrawerTotal() {
  let total = calcCartTotal()
  if (!expansionServiceId.value) return total
  if (expansionCart.value[expansionServiceId.value]) {
    total -= calcServiceDeltaTotal(expansionServiceId.value, expansionCart.value[expansionServiceId.value])
  }
  total += calcServiceDeltaTotal(expansionServiceId.value, expansionDraft.value)
  return total
}

const expansionDrawerTotal = computed(() => calcExpansionDrawerTotal())

function getCartLineItems(serviceId: string) {
  const sub = getSubscription(serviceId)
  const cart = expansionCart.value[serviceId]
  if (!cart) return []
  const lines: Array<{
    key: string; label: string; feature: string; metric: string;
    delta: number; price: number; newQty: number; currentExtra: number;
    step: number; unitPrice: number
  }> = []
  Object.keys(cart).forEach(key => {
    const newQty = cart[key] || 0
    const oldQty = sub && sub.expansions[key] ? sub.expansions[key] : 0
    const delta = newQty - oldQty
    if (delta <= 0) return
    const parts = parseMetricKey(key)
    const metricDef = getMetricDef(serviceId, parts.feature, parts.metric)
    lines.push({
      key, label: `${parts.feature} · ${parts.metric}`, feature: parts.feature, metric: parts.metric,
      delta, price: metricDef ? delta * metricDef.unitPrice : 0,
      newQty, currentExtra: oldQty, step: metricDef ? metricDef.step : 1, unitPrice: metricDef ? metricDef.unitPrice : 0
    })
  })
  return lines
}

function countCartItems() {
  let count = 0
  Object.keys(expansionCart.value).forEach(serviceId => {
    count += getCartLineItems(serviceId).length
  })
  return count
}

function applyExpansionCart() {
  Object.keys(expansionCart.value).forEach(serviceId => {
    const sub = getSubscription(serviceId)
    if (!sub) return
    sub.expansions = { ...expansionCart.value[serviceId] }
  })
  expansionCart.value = {}
  expansionDraft.value = {}
}

function openExpansionDrawer(serviceId: string) {
  const sub = getSubscription(serviceId)
  if (!sub || !canExpandService(sub)) return
  expansionServiceId.value = serviceId
  initExpansionDraft(serviceId)
  expandDrawerVisible.value = true
}

function closeExpansionDrawer() {
  expandDrawerVisible.value = false
  expansionServiceId.value = null
  expansionDraft.value = {}
}

function continueExpansionShopping() {
  commitExpansionDraft()
  expandDrawerVisible.value = false
  expansionServiceId.value = null
  expansionDraft.value = {}
}

function checkoutExpansionCart() {
  if (expandDrawerVisible.value && expansionServiceId.value) {
    commitExpansionDraft()
  }
  if (countCartItems() === 0) return
  applyExpansionCart()
  expandDrawerVisible.value = false
  cartModalVisible.value = false
  message.success('扩充已生效')
}

// 扩充抽屉中指标行
function expansionRowData(row: { feature: string; metric: string; quotas: Partial<Record<TierId, number>> }, tier: TierId) {
  const sub = getSubscription(expansionServiceId.value!)
  const key = metricKey(row.feature, row.metric)
  const base = row.quotas[tier]!
  const extra = expansionDraft.value[key] || 0
  const currentExtra = sub && sub.expansions[key] ? sub.expansions[key] : 0
  const delta = Math.max(0, extra - currentExtra)
  const metricDef = getMetricDef(expansionServiceId.value!, row.feature, row.metric)
  const step = metricDef ? metricDef.step : 1
  const unitPrice = metricDef ? metricDef.unitPrice : 0
  return { key, base, extra, currentExtra, delta, step, unitPrice, linePrice: delta * unitPrice }
}

function onExpansionInput(key: string, event: Event) {
  const target = event.target as HTMLInputElement
  let qty = Math.max(0, parseInt(target.value, 10) || 0)
  const sub = getSubscription(expansionServiceId.value!)
  const currentExtra = sub && sub.expansions[key] ? sub.expansions[key] : 0
  // 不能低于已扩充数，且不能为 0（最少保留 currentExtra）
  qty = Math.max(currentExtra, qty)
  target.value = String(qty)
  expansionDraft.value[key] = qty
}

// 步进器 +/- 按钮，每次 ±1，不能低于 currentExtra
function onExpansionStep(
  key: string,
  rowData: { step: number; currentExtra: number },
  dir: 1 | -1
) {
  const currentVal = expansionDraft.value[key] || 0
  let next = currentVal + dir
  next = Math.max(rowData.currentExtra, next)
  expansionDraft.value[key] = next
}

// 当前编辑服务的对比组行
const expansionComparisonRows = computed(() => {
  if (!expansionServiceId.value) return []
  const sub = getSubscription(expansionServiceId.value)
  if (!sub) return []
  const group = getComparisonGroup(expansionServiceId.value)
  if (!group || group.noOwnMetrics || !group.rows) return []
  return group.rows.filter(row => row.quotas[sub.tier] !== undefined)
})

// ===== 购物车弹窗逻辑 =====
function openCartModal() {
  if (countCartItems() === 0) return
  cartModalVisible.value = true
}

function getCartServiceIds() {
  return Object.keys(expansionCart.value).filter(serviceId => getCartLineItems(serviceId).length > 0)
}

function updateCartMetricQuantity(serviceId: string, key: string, qty: number, target: HTMLInputElement) {
  const sub = getSubscription(serviceId)
  if (!sub || !expansionCart.value[serviceId]) return
  const currentExtra = sub.expansions[key] ? sub.expansions[key] : 0
  qty = Math.max(currentExtra, qty)
  target.value = String(qty)
  expansionCart.value[serviceId][key] = qty
  if (!hasServiceDeltas(serviceId, expansionCart.value[serviceId])) {
    delete expansionCart.value[serviceId]
    if (countCartItems() === 0) cartModalVisible.value = false
  }
}

// 购物车步进器 +/- 按钮，每次 ±1，不能低于 currentExtra（不能减到 0）
function stepCartQuantity(serviceId: string, key: string, currentExtra: number, dir: 1 | -1) {
  if (!expansionCart.value[serviceId]) return
  const currentVal = expansionCart.value[serviceId][key] || currentExtra
  let next = currentVal + dir
  next = Math.max(currentExtra, next)
  expansionCart.value[serviceId][key] = next
  if (!hasServiceDeltas(serviceId, expansionCart.value[serviceId])) {
    delete expansionCart.value[serviceId]
    if (countCartItems() === 0) cartModalVisible.value = false
  }
}

function clearCartService(serviceId: string) {
  delete expansionCart.value[serviceId]
  if (expansionServiceId.value === serviceId) {
    initExpansionDraft(serviceId)
  }
  if (countCartItems() === 0) cartModalVisible.value = false
}

function clearCartLine(serviceId: string, key: string) {
  if (!expansionCart.value[serviceId]) return
  delete expansionCart.value[serviceId][key]
  if (!hasServiceDeltas(serviceId, expansionCart.value[serviceId])) {
    delete expansionCart.value[serviceId]
  }
  if (countCartItems() === 0) cartModalVisible.value = false
}

const cartTotal = computed(() => calcCartTotal())
const cartItemCount = computed(() => countCartItems())
const showCartBar = computed(() => cartItemCount.value > 0 && !expandDrawerVisible.value && !cartModalVisible.value)

// ===== 卡片指标展开/收起 =====
function toggleMetrics(serviceId: string) {
  expandedMetricCards.value[serviceId] = !expandedMetricCards.value[serviceId]
}

function getVisibleMetrics(sub: Subscription) {
  const metrics = getMetricsForService(sub)
  const expanded = !!expandedMetricCards.value[sub.id]
  return expanded ? metrics : metrics.slice(0, metricPreviewLimit)
}

// 当前编辑服务信息
const expansionSub = computed(() => expansionServiceId.value ? getSubscription(expansionServiceId.value) : null)
const expansionServiceDef = computed(() => expansionServiceId.value ? getServiceDef(expansionServiceId.value) : null)

// 抽屉滚动定位
const subscribeDrawerBodyRef = ref<HTMLElement | null>(null)
function scrollToHighlighted() {
  nextTick(() => {
    if (!highlightedSubscribeServiceId.value || !subscribeDrawerBodyRef.value) return
    const el = subscribeDrawerBodyRef.value.querySelector(
      `[data-drawer-service="${highlightedSubscribeServiceId.value}"]`
    ) as HTMLElement | null
    el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  })
}

// ===== ESC 关闭 =====
function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (cartModalVisible.value) cartModalVisible.value = false
  else if (expandDrawerVisible.value) closeExpansionDrawer()
  else if (subscribeDrawerVisible.value) closeSubscribeDrawer()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="sub-page">
    <!-- 顶部操作行 -->
    <div class="sub-topbar">
      <button class="btn-primary" type="button" @click="openSubscribeDrawer()">
        <i class="i-ant-design-plus-outlined" />
        <span>订阅服务</span>
      </button>
    </div>

    <!-- 服务卡片网格 -->
    <div class="sub-dashboard">
      <article
        v-for="sub in subscriptions"
        :key="sub.id"
        class="sub-card"
        :class="{ 'is-expanded': expandedMetricCards[sub.id] }"
      >
        <!-- 卡片头部 -->
        <div class="sub-card__head">
          <div class="sub-card__head-info">
            <h3 class="sub-card__title">
              <span class="sub-card__icon"><ServiceIcon :name="getServiceIcon(sub.id)" /></span>
              {{ sub.name }}
            </h3>
            <p class="sub-card__desc">{{ serviceNarratives[sub.id] || '围绕项目服务能力进行订阅与扩容配置。' }}</p>
          </div>
          <span
            class="version-tag"
            :class="[
              `version-tag--${sub.tier}`,
              { 'is-warning': sub.statusType === 'warning' || sub.remainingDays <= 7 }
            ]"
          >
            {{ tierLabels[sub.tier] }} · 剩余{{ sub.remainingDays }}天
          </span>
        </div>

        <!-- 卡片 Hero -->
        <div class="sub-card__hero">
          <div class="sub-card__hero-main">
            <div class="sub-card__hero-label">当前方案</div>
            <div class="sub-card__hero-value">{{ getServiceAmountLabel(sub) }}</div>
            <div class="sub-card__hero-note">{{ getPlanLabel(sub) }} · {{ getServiceCycleLabel(sub) }} · 剩余 {{ sub.remainingDays }} 天</div>
          </div>
          <div class="sub-card__hero-side">
            <div class="sub-card__hero-side-label">{{ getServiceHighlight(sub, getMetricsForService(sub)).label }}</div>
            <div class="sub-card__hero-side-value">{{ getServiceHighlight(sub, getMetricsForService(sub)).value }}</div>
          </div>
        </div>

        <!-- 指标列表 -->
        <div class="sub-card__metrics">
          <template v-if="getMetricsForService(sub).length">
            <div
              v-for="metric in getVisibleMetrics(sub)"
              :key="metric.key"
              class="metric-row"
            >
              <div class="metric-row__head">
                <span class="metric-row__name">
                  <ServiceIcon :name="getFeatureIcon(metric.feature)" class="metric-row__icon" />
                  {{ metric.feature }}
                  <span class="metric-row__metric-text">{{ metric.metric }}</span>
                </span>
                <span class="metric-row__nums">
                  <strong>{{ formatNumber(metric.used) }}</strong>
                  <span class="metric-row__total">/ {{ formatNumber(metric.total) }}</span>
                  <span v-if="metric.extra > 0" class="metric-row__extra">+{{ formatNumber(metric.extra) }}</span>
                </span>
              </div>
              <div class="metric-bar" :class="{ 'is-warn': metric.percent >= 80 }">
                <div class="metric-bar__fill" :style="{ width: metric.percent + '%' }" />
              </div>
            </div>
          </template>
          <div v-else class="sub-card__metrics-empty">
            <p>{{ getReferenceNote(sub.id) || '当前服务暂无独立指标。' }}</p>
          </div>
        </div>

        <!-- 卡片底部 -->
        <div class="sub-card__foot">
          <div class="sub-card__foot-left">
            <button class="btn-primary btn-sm" type="button" @click="openSubscribeDrawer(sub.id)">升级订阅</button>
            <button
              v-if="canExpandService(sub)"
              class="btn-default btn-sm"
              type="button"
              @click="openExpansionDrawer(sub.id)"
            >
              扩充指标
            </button>
            <span v-else class="sub-card__hint">指标容量跟随关联服务</span>
          </div>
          <button
            v-if="getMetricsForService(sub).length > metricPreviewLimit"
            class="btn-text btn-sm"
            type="button"
            @click="toggleMetrics(sub.id)"
          >
            {{ expandedMetricCards[sub.id] ? '收起' : '查看更多' }}
            <i
              class="i-ant-design-down-outlined"
              :class="{ 'is-flip': expandedMetricCards[sub.id] }"
            />
          </button>
        </div>
      </article>
    </div>

    <!-- ===== 订阅服务抽屉 ===== -->
    <a-drawer
      v-model:open="subscribeDrawerVisible"
      title="订阅服务"
      placement="right"
      :width="720"
      :body-style="{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }"
      :header-style="{ padding: '14px 24px', borderBottom: '1px solid #f4f5f7' }"
      @after-open="scrollToHighlighted"
    >
      <template #extra>
        <div class="bulk-tier">
          <span class="bulk-tier__label">一键选择</span>
          <button
            v-for="t in tierIds"
            :key="t"
            class="bulk-tier__btn"
            type="button"
            @click="applyBulkTier(t)"
          >{{ tierLabels[t] }}</button>
        </div>
      </template>

      <div ref="subscribeDrawerBodyRef" class="drawer-scroll">
        <div class="drawer-intro">
          <i class="i-ant-design-info-circle-outlined" />
          <span>点击对比表中的版本列选择订阅版本；仅支持升级，不可降级。</span>
        </div>

        <div
          v-for="service in serviceCatalog"
          :key="service.id"
          :data-drawer-service="service.id"
          class="d-service"
          :class="{ 'is-highlighted': highlightedSubscribeServiceId === service.id }"
        >
          <!-- 服务头 -->
          <div class="d-service__head">
            <div class="d-service__head-left">
              <span class="d-service__icon-box">
                <ServiceIcon :name="getServiceIcon(service.id)" />
              </span>
              <div>
                <h4 class="d-service__name">{{ service.name }}</h4>
                <span class="d-service__billing">{{ service.billingCycle === 'year' ? '按年计费' : '按月计费' }}</span>
              </div>
            </div>
            <span
              class="d-service__tag"
              :class="{ 'is-change': getSubscribedTier(service.id) !== drawerSelection[service.id]?.tier }"
            >
              <template v-if="getSubscribedTier(service.id) === drawerSelection[service.id]?.tier">
                当前：{{ tierLabels[drawerSelection[service.id]?.tier || 'free'] }}
              </template>
              <template v-else>
                {{ tierLabels[drawerSelection[service.id]?.tier || 'free'] }}
              </template>
            </span>
          </div>

          <!-- 版本对比卡片 -->
          <div v-if="!isNoOwnMetrics(service.id)" class="d-tiers">
            <div
              v-for="t in getServiceTiers(service.id)"
              :key="t"
              class="d-tier"
              :class="{
                'is-selected': t === drawerSelection[service.id]?.tier,
                'is-disabled': !canSelectTier(service.id, t)
              }"
              @click="selectDrawerTier(service.id, t)"
            >
              <div class="d-tier__radio" :class="{ 'is-checked': t === drawerSelection[service.id]?.tier }" />
              <div class="d-tier__info">
                <span class="d-tier__name">{{ tierLabels[t] }}</span>
                <span class="d-tier__price">{{ getTierBillingInfo(service.id, t).label }}</span>
              </div>
            </div>
          </div>

          <!-- 配额表格 -->
          <div v-if="!isNoOwnMetrics(service.id) && getComparisonGroup(service.id)?.rows?.length" class="d-quota-table">
            <table>
              <thead>
                <tr>
                  <th>功能</th>
                  <th>计费指标</th>
                  <th v-for="t in getServiceTiers(service.id)" :key="t" :class="{ 'is-active': t === drawerSelection[service.id]?.tier }">
                    {{ tierLabels[t] }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, ri) in getComparisonGroup(service.id)!.rows!"
                  :key="ri"
                >
                  <td class="d-quota-table__feature">
                    <ServiceIcon :name="getFeatureIcon(row.feature)" class="d-quota-table__icon" />
                    {{ row.feature }}
                  </td>
                  <td class="d-quota-table__metric">{{ row.metric }}</td>
                  <td
                    v-for="t in getServiceTiers(service.id)"
                    :key="t"
                    :class="{ 'is-active': t === drawerSelection[service.id]?.tier }"
                  >
                    {{ row.quotas[t] !== undefined ? formatNumber(row.quotas[t]!) : '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- 无独立指标说明 -->
          <div v-if="isNoOwnMetrics(service.id)" class="d-ref-note">
            <i class="i-ant-design-bulb-outlined" />
            <span>{{ getReferenceNote(service.id) }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <div class="drawer-footer__top">
            <div class="drawer-footer__price">
              <span class="drawer-footer__price-label">合计费用</span>
              <span class="drawer-footer__price-value">¥{{ formatPrice(subscribeTotal) }}</span>
            </div>
            <div class="duration-stepper">
              <span class="duration-stepper__label">购买时长</span>
              <div class="duration-stepper__control">
                <button
                  class="duration-stepper__btn"
                  type="button"
                  :disabled="subscribeDuration <= 1"
                  @click="setSubscribeDuration(subscribeDuration - 1)"
                >−</button>
                <span class="duration-stepper__value">{{ subscribeDuration }}</span>
                <button
                  class="duration-stepper__btn"
                  type="button"
                  :disabled="subscribeDuration >= subscribeDurationMax"
                  @click="setSubscribeDuration(subscribeDuration + 1)"
                >+</button>
              </div>
            </div>
          </div>
          <p class="drawer-footer__hint">按年计费的服务计 N 年，按月计费的服务计 N 月</p>
          <div class="drawer-footer__actions">
            <button class="btn-default" type="button" @click="closeSubscribeDrawer">取消</button>
            <button class="btn-primary" type="button" @click="confirmSubscribe">确认订阅</button>
          </div>
        </div>
      </template>
    </a-drawer>

    <!-- ===== 扩充指标抽屉 ===== -->
    <a-drawer
      v-model:open="expandDrawerVisible"
      title="扩充指标"
      placement="right"
      :width="640"
      :body-style="{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }"
      :header-style="{ padding: '14px 24px', borderBottom: '1px solid #f4f5f7' }"
    >
      <template #extra>
        <span v-if="expansionServiceDef" class="expand-drawer__subtitle">
          {{ expansionServiceDef.name }} · {{ tierLabels[expansionSub?.tier || 'free'] }}
        </span>
      </template>

      <div v-if="expansionSub" class="drawer-scroll">
        <!-- Hero 区 -->
        <div class="expand-hero">
          <div class="expand-hero__left">
            <span class="expand-hero__icon-box">
              <ServiceIcon :name="getServiceIcon(expansionSub.id)" />
            </span>
            <div>
              <div class="expand-hero__title">{{ expansionSub.name }}</div>
              <p class="expand-hero__desc">设置各指标扩充数量后点击「继续选购」加入购物车，在当前版本上按需追加资源。</p>
            </div>
          </div>
          <div class="expand-hero__right">
            <span class="expand-hero__tier">{{ tierLabels[expansionSub.tier] }}</span>
            <span class="expand-hero__days">剩余 {{ expansionSub.remainingDays }} 天</span>
          </div>
        </div>

        <!-- 指标编辑列表 -->
        <div class="expand-list">
          <div class="expand-list__title">正在编辑指标</div>
          <div
            v-for="row in expansionComparisonRows"
            :key="metricKey(row.feature, row.metric)"
            class="expand-row"
          >
            <div class="expand-row__icon-box">
              <ServiceIcon :name="getFeatureIcon(row.feature)" />
            </div>
            <div class="expand-row__info">
              <span class="expand-row__feature">{{ row.feature }}</span>
              <span class="expand-row__metric">{{ row.metric }}</span>
              <span class="expand-row__base">
                当前配额 {{ formatNumber(row.quotas[expansionSub.tier]!) }}
                <template v-if="expansionSub.expansions[metricKey(row.feature, row.metric)]">
                  · 已扩充 {{ formatNumber(expansionSub.expansions[metricKey(row.feature, row.metric)]) }}
                </template>
              </span>
            </div>
            <div class="expand-row__stepper">
              <button
                class="expand-row__stepper-btn"
                type="button"
                @click="onExpansionStep(metricKey(row.feature, row.metric), expansionRowData(row, expansionSub.tier), -1)"
              >−</button>
              <input
                class="expand-row__stepper-input"
                type="number"
                :step="expansionRowData(row, expansionSub.tier).step"
                :value="expansionDraft[metricKey(row.feature, row.metric)] || 0"
                @input="onExpansionInput(metricKey(row.feature, row.metric), $event)"
              />
              <button
                class="expand-row__stepper-btn"
                type="button"
                @click="onExpansionStep(metricKey(row.feature, row.metric), expansionRowData(row, expansionSub.tier), 1)"
              >+</button>
            </div>
            <span class="expand-row__price">¥{{ formatPrice(expansionRowData(row, expansionSub.tier).linePrice) }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="drawer-footer">
          <div class="drawer-footer__total-row">
            <span class="drawer-footer__price-label">合计费用（全部服务）</span>
            <span class="drawer-footer__price-value">¥{{ formatPrice(expansionDrawerTotal) }}</span>
          </div>
          <div class="drawer-footer__actions">
            <button class="btn-default" type="button" @click="continueExpansionShopping">继续选购</button>
            <button class="btn-primary" type="button" @click="checkoutExpansionCart">确认付款</button>
          </div>
        </div>
      </template>
    </a-drawer>

    <!-- ===== 购物车浮条 ===== -->
    <Transition name="cart-bar">
      <div v-if="showCartBar" class="cart-bar">
        <div class="cart-bar__info">
          已选 <strong>{{ cartItemCount }}</strong> 项扩充，合计
          <strong class="cart-bar__price">¥{{ formatPrice(cartTotal) }}</strong>
        </div>
        <div class="cart-bar__actions">
          <button class="cart-bar__cart" type="button" @click="openCartModal">
            <i class="i-ant-design-shopping-cart-outlined" />
            <span class="cart-bar__badge">{{ cartItemCount }}</span>
          </button>
          <button class="btn-primary btn-sm" type="button" @click="checkoutExpansionCart">确认付款</button>
        </div>
      </div>
    </Transition>

    <!-- ===== 购物车弹窗 ===== -->
    <a-modal
      v-model:open="cartModalVisible"
      title="扩充购物车"
      :width="560"
      :footer="null"
      centered
    >
      <div class="cart-modal__body">
        <div v-if="getCartServiceIds().length === 0" class="cart-modal__empty">
          <i class="i-ant-design-shopping-cart-outlined" />
          <p>购物车为空</p>
        </div>
        <div
          v-for="serviceId in getCartServiceIds()"
          :key="serviceId"
          class="cart-modal__group"
        >
          <!-- 服务头 -->
          <div class="cart-modal__group-head">
            <span class="cart-modal__group-icon">
              <ServiceIcon :name="getServiceIcon(serviceId)" />
            </span>
            <span class="cart-modal__group-name">{{ getSubscription(serviceId)?.name }}</span>
            <span class="cart-modal__group-count">{{ getCartLineItems(serviceId).length }} 项</span>
            <button class="cart-modal__group-clear" type="button" @click="clearCartService(serviceId)">
              <i class="i-ant-design-delete-outlined" />移除
            </button>
          </div>
          <!-- 指标行 -->
          <div
            v-for="line in getCartLineItems(serviceId)"
            :key="line.key"
            class="cart-modal__item"
          >
            <div class="cart-modal__item-icon">
              <ServiceIcon :name="getFeatureIcon(line.feature)" />
            </div>
            <div class="cart-modal__item-info">
              <span class="cart-modal__item-name">{{ line.feature }}</span>
              <span class="cart-modal__item-metric">{{ line.metric }}</span>
            </div>
            <div class="cart-modal__item-qty">
              <button
                class="cart-modal__stepper-btn"
                type="button"
                @click="stepCartQuantity(serviceId, line.key, line.currentExtra, -1)"
              >−</button>
              <input
                class="cart-modal__stepper-input"
                type="number"
                :min="line.currentExtra"
                :step="line.step"
                :value="line.newQty"
                @input="updateCartMetricQuantity(serviceId, line.key, parseInt(($event.target as HTMLInputElement).value, 10) || 0, $event.target as HTMLInputElement)"
              />
              <button
                class="cart-modal__stepper-btn"
                type="button"
                @click="stepCartQuantity(serviceId, line.key, line.currentExtra, 1)"
              >+</button>
            </div>
            <span class="cart-modal__item-price">¥{{ formatPrice(line.price) }}</span>
            <button class="cart-modal__item-remove" type="button" @click="clearCartLine(serviceId, line.key)">
              <i class="i-ant-design-close-outlined" />
            </button>
          </div>
        </div>
      </div>
      <!-- 底部结算 -->
      <div class="cart-modal__checkout">
        <div class="cart-modal__checkout-total">
          <span class="cart-modal__checkout-label">合计</span>
          <span class="cart-modal__checkout-value">¥{{ formatPrice(cartTotal) }}</span>
        </div>
        <div class="cart-modal__checkout-actions">
          <button class="btn-default" type="button" @click="cartModalVisible = false">关闭</button>
          <button class="btn-primary" type="button" @click="checkoutExpansionCart">确认付款</button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.sub-page {
  position: relative;
  height: 100%;
  overflow-y: auto;
  padding: 16px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
}

// ===== 按钮 =====
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  border: 1px solid $color-primary;
  border-radius: $radius-btn;
  background: $color-primary;
  color: #fff;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { background: $color-primary-hover; border-color: $color-primary-hover; }
  &:active { background: $color-primary-active; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}
.btn-default {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  border: 1px solid $border-color-light;
  border-radius: $radius-btn;
  background: #fff;
  color: $text-secondary;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { border-color: $color-primary; color: $color-primary; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}
.btn-text {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 8px;
  border: none;
  background: transparent;
  color: $color-primary;
  font-size: 13px;
  cursor: pointer;
  &:hover { opacity: 0.8; }
}
.btn-sm { height: 28px; padding: 0 12px; font-size: 12px; }

// ===== 顶部操作行 =====
.sub-topbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: 12px;
  flex-shrink: 0;
}

// ===== 卡片网格 =====
.sub-dashboard {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

// ===== 卡片（固定结构高度对齐） =====
.sub-card {
  background: $bg-card;
  border: 1px solid $border-color-card;
  border-radius: 14px;
  box-shadow: 0 1px 3px 0 rgba(20, 23, 31, 0.06);
  display: flex;
  flex-direction: column;
  transition: border-color 0.15s, box-shadow 0.15s;
  overflow: hidden;

  &:hover {
    border-color: $color-primary;
    box-shadow: 0 2px 8px rgba(110, 75, 255, 0.08);
  }
}

// 头部 - 固定高度
.sub-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
  flex-shrink: 0;
}
.sub-card__head-info { flex: 1; min-width: 0; }
.sub-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  color: $text-base;
}
.sub-card__icon {
  display: inline-flex;
  width: 20px;
  height: 20px;
  color: $color-primary;
  flex-shrink: 0;
  svg { width: 100%; height: 100%; }
}
.sub-card__desc {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: $text-tertiary;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 36px;
}

// Hero 区 - 固定高度
.sub-card__hero {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 0 16px;
  padding: 12px 14px;
  background: $bg-page;
  border-radius: 10px;
  flex-shrink: 0;
}
.sub-card__hero-main { flex: 1; min-width: 0; }
.sub-card__hero-label { font-size: 11px; color: $text-tertiary; }
.sub-card__hero-value { font-size: 18px; font-weight: 600; color: $text-base; line-height: 1.3; }
.sub-card__hero-note { font-size: 11px; color: $text-muted; margin-top: 2px; }
.sub-card__hero-side {
  flex-shrink: 0;
  text-align: right;
  padding-left: 16px;
  border-left: 1px solid $border-color-card;
}
.sub-card__hero-side-label { font-size: 11px; color: $text-tertiary; }
.sub-card__hero-side-value { font-size: 16px; font-weight: 600; color: $color-primary; }

// 指标区 - flex:1 撑满
.sub-card__metrics {
  flex: 1;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}
.sub-card__metrics-empty {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 12px 14px;
  background: $bg-page;
  border-radius: 8px;
  margin: 12px 16px 4px;
  p { margin: 0; font-size: 12px; color: $text-tertiary; line-height: 1.6; }
}

// ===== 指标行 - 重新设计，更宽的进度条 =====
.metric-row {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }
  &__name {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 500;
    color: $text-base;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  &__icon {
    display: inline-flex;
    width: 14px;
    height: 14px;
    color: $text-tertiary;
    flex-shrink: 0;
    svg { width: 100%; height: 100%; }
  }
  &__metric-text { font-size: 11px; color: $text-muted; font-weight: 400; }
  &__nums {
    flex-shrink: 0;
    font-size: 12px;
    color: $text-muted;
    strong { font-size: 13px; font-weight: 600; color: $text-base; }
  }
  &__total { margin-left: 1px; }
  &__extra {
    font-size: 10px;
    color: $color-primary;
    margin-left: 4px;
  }
}

// 进度条 - 更粗更明显
.metric-bar {
  width: 100%;
  height: 8px;
  background: #eef0f4;
  border-radius: 9999px;
  overflow: hidden;

  &__fill {
    height: 100%;
    background: linear-gradient(90deg, $color-primary, $color-primary-hover);
    border-radius: 9999px;
    transition: width 0.3s ease;
  }
  &.is-warn &__fill {
    background: linear-gradient(90deg, #faad14, #ffc53d);
  }
}

// 卡片底部 - 固定高度
.sub-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 16px;
  border-top: 1px solid $border-color-card;
  flex-shrink: 0;
}
.sub-card__foot-left { display: flex; align-items: center; gap: 8px; }
.sub-card__hint { font-size: 12px; color: $text-muted; }

// 箭头翻转
.is-flip { transform: rotate(180deg); transition: transform 0.2s; }

// ===== 版本标签 =====
.version-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 500;
  white-space: nowrap;
  flex-shrink: 0;
}
.version-tag--free { background: rgba(154, 161, 171, 0.12); color: $text-tertiary; }
.version-tag--basic { background: $color-primary-bg; color: $color-primary; }
.version-tag--enterprise { background: rgba(43, 179, 163, 0.1); color: $color-online; }
.version-tag.is-warning { background: rgba(255, 77, 79, 0.1); color: #ff4d4f; }

// ===== 抽屉通用 =====
.drawer-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 16px 24px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
}

.drawer-intro {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 16px;
  background: $color-primary-bg;
  border-radius: 8px;
  font-size: 12px;
  color: $color-primary;
  i { font-size: 14px; flex-shrink: 0; }
}

.drawer-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  &__top { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  &__price { display: flex; flex-direction: column; gap: 2px; }
  &__price-label { font-size: 12px; color: $text-tertiary; }
  &__price-value { font-size: 22px; font-weight: 700; color: $color-primary; }
  &__total-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
  &__hint { margin: 0; font-size: 11px; color: $text-muted; }
  &__actions { display: flex; justify-content: flex-end; gap: 8px; }
}

// ===== 一键选择 =====
.bulk-tier {
  display: flex;
  align-items: center;
  gap: 6px;
  &__label { font-size: 12px; color: $text-tertiary; }
  &__btn {
    height: 26px;
    padding: 0 10px;
    border: 1px solid $border-color-light;
    border-radius: $radius-btn;
    background: #fff;
    color: $text-secondary;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.15s;
    &:hover { border-color: $color-primary; color: $color-primary; }
  }
}

// ===== 订阅抽屉 - 服务块 =====
.d-service {
  padding: 16px;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  margin-bottom: 12px;
  transition: all 0.2s;

  &.is-highlighted {
    border-color: $color-primary;
    box-shadow: 0 0 0 3px $color-primary-bg;
    background: #fdfcff;
  }

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }
  &__head-left { display: flex; align-items: center; gap: 10px; }
  &__icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: $color-primary-bg;
    color: $color-primary;
    flex-shrink: 0;
    svg { width: 20px; height: 20px; }
  }
  &__name { margin: 0; font-size: 15px; font-weight: 600; color: $text-base; }
  &__billing { font-size: 11px; color: $text-muted; }
  &__tag {
    font-size: 12px;
    color: $color-online;
    white-space: nowrap;
    &.is-change { color: $color-primary; font-weight: 600; }
  }
}

// ===== 版本选择卡片 =====
.d-tiers {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.d-tier {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 2px solid $border-color-card;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(.is-disabled) { border-color: $color-primary-hover; background: #faf9ff; }
  &.is-selected { border-color: $color-primary; background: $color-primary-bg; }
  &.is-disabled { opacity: 0.4; cursor: not-allowed; }

  &__radio {
    width: 16px;
    height: 16px;
    border: 2px solid $border-color-light;
    border-radius: 50%;
    flex-shrink: 0;
    position: relative;
    transition: all 0.15s;
    &.is-checked {
      border-color: $color-primary;
      &::after {
        content: '';
        position: absolute;
        top: 2px; left: 2px;
        width: 8px; height: 8px;
        background: $color-primary;
        border-radius: 50%;
      }
    }
  }
  &__info { display: flex; flex-direction: column; gap: 1px; }
  &__name { font-size: 13px; font-weight: 600; color: $text-base; }
  &__price { font-size: 11px; color: $text-tertiary; }
}

// ===== 配额表 =====
.d-quota-table {
  border: 1px solid $border-color-card;
  border-radius: 8px;
  overflow: hidden;

  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th {
    padding: 8px 12px;
    text-align: left;
    font-weight: 600;
    font-size: 12px;
    color: $text-secondary;
    background: $bg-page;
    border-bottom: 1px solid $border-color-card;
    white-space: nowrap;
    &.is-active { color: $color-primary; background: $color-primary-bg; }
  }
  td {
    padding: 8px 12px;
    border-bottom: 1px solid $border-color-card;
    color: $text-secondary;
    &.is-active { background: $color-primary-bg; color: $color-primary; font-weight: 600; }
  }
  tr:last-child td { border-bottom: none; }
  &__feature { white-space: nowrap; font-weight: 500; color: $text-base; }
  &__icon { display: inline-flex; width: 14px; height: 14px; color: $text-tertiary; vertical-align: middle; margin-right: 2px; svg { width: 100%; height: 100%; } }
  &__metric { color: $text-tertiary; white-space: nowrap; }
}

// 无指标说明
.d-ref-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 10px 12px;
  background: $bg-page;
  border-radius: 8px;
  font-size: 12px;
  color: $text-tertiary;
  line-height: 1.6;
  i { font-size: 14px; color: #faad14; flex-shrink: 0; margin-top: 2px; }
}

// ===== 购买时长步进器 =====
.duration-stepper {
  display: flex;
  align-items: center;
  gap: 8px;
  &__label { font-size: 12px; color: $text-tertiary; }
  &__control { display: flex; align-items: center; gap: 4px; }
  &__btn {
    width: 28px;
    height: 28px;
    border: 1px solid $border-color-light;
    border-radius: $radius-btn;
    background: #fff;
    color: $text-secondary;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    &:hover:not(:disabled) { border-color: $color-primary; color: $color-primary; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }
  &__value { min-width: 32px; text-align: center; font-size: 14px; font-weight: 600; color: $text-base; }
}

// ===== 扩充抽屉 =====
.expand-drawer__subtitle { font-size: 13px; color: $text-tertiary; }

.expand-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: linear-gradient(135deg, $color-primary-bg 0%, #f8f6ff 100%);
  border-radius: 12px;
  margin-bottom: 20px;
}
.expand-hero__left { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.expand-hero__icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: #fff;
  color: $color-primary;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(110, 75, 255, 0.12);
  svg { width: 22px; height: 22px; }
}
.expand-hero__title { font-size: 16px; font-weight: 600; color: $text-base; margin-bottom: 4px; }
.expand-hero__desc { margin: 0; font-size: 12px; line-height: 1.5; color: $text-tertiary; }
.expand-hero__right {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  border-left: 1px solid rgba(110, 75, 255, 0.15);
  padding-left: 16px;
}
.expand-hero__tier { font-size: 14px; font-weight: 600; color: $color-primary; }
.expand-hero__days { font-size: 12px; color: $text-muted; }

.expand-list {
  &__title { font-size: 13px; font-weight: 600; color: $text-secondary; margin-bottom: 8px; padding-left: 4px; }
}
.expand-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  margin-bottom: 8px;
  transition: border-color 0.15s;
  &:hover { border-color: $color-primary-hover; }

  &__icon-box {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px;
    color: $text-tertiary; background: $bg-page;
    border-radius: 8px; flex-shrink: 0;
    svg { width: 16px; height: 16px; }
  }
  &__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  &__feature { font-size: 13px; font-weight: 500; color: $text-base; }
  &__metric { font-size: 12px; color: $text-tertiary; }
  &__base { font-size: 11px; color: $text-muted; }

  // 步进器（与购物车一致）
  &__stepper { display: flex; align-items: center; gap: 0; flex-shrink: 0; }
  &__stepper-btn {
    width: 28px; height: 32px;
    border: 1px solid $border-color-input;
    background: $bg-card;
    color: $text-secondary;
    font-size: 14px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
    &:first-child { border-radius: $radius-btn 0 0 $radius-btn; }
    &:last-child { border-radius: 0 $radius-btn $radius-btn 0; }
    &:hover { border-color: $color-primary; color: $color-primary; z-index: 1; }
  }
  &__stepper-input {
    width: 52px; height: 32px;
    border: 1px solid $border-color-input;
    border-left: none; border-right: none;
    font-size: 13px; text-align: center;
    color: $text-base; background: $bg-card;
    &:focus { outline: none; }
    appearance: textfield;
    -moz-appearance: textfield;
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  }
  &__price { min-width: 72px; text-align: right; font-size: 14px; font-weight: 600; color: $color-primary; flex-shrink: 0; }
}

// ===== 购物车浮条（居中） =====
.cart-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 20px;
  background: $bg-card;
  border: 1px solid $border-color-card;
  border-radius: 9999px;
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.12);
  &__info { font-size: 13px; color: $text-secondary; white-space: nowrap; strong { color: $color-primary; } }
  &__price { font-size: 15px; }
  &__actions { display: flex; align-items: center; gap: 8px; }
  &__cart {
    position: relative;
    width: 36px;
    height: 36px;
    border: 1px solid $border-color-light;
    border-radius: 50%;
    background: #fff;
    color: $text-secondary;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    i { font-size: 18px; }
    &:hover { border-color: $color-primary; color: $color-primary; }
  }
  &__badge {
    position: absolute;
    top: -4px; right: -4px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    background: #ff4d4f;
    color: #fff;
    font-size: 11px;
    border-radius: 9999px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #fff;
  }
}

// ===== 购物车弹窗 =====
.cart-modal {
  &__body {
    max-height: 420px;
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar { display: none; }
  }

  // 空状态
  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 60px 0;
    i { font-size: 40px; color: $border-color-light; }
    p { margin: 0; font-size: 13px; color: $text-muted; }
  }

  // 服务分组
  &__group {
    margin-bottom: 16px;
    border: 1px solid $border-color-card;
    border-radius: 12px;
    overflow: hidden;
    &:last-child { margin-bottom: 0; }
  }

  // 分组头
  &__group-head {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: $bg-page;
    border-bottom: 1px solid $border-color-card;
  }
  &__group-icon {
    display: flex; align-items: center; justify-content: center;
    width: 28px; height: 28px;
    color: $color-primary; background: $bg-card;
    border-radius: 8px; flex-shrink: 0;
    svg { width: 16px; height: 16px; }
  }
  &__group-name { font-size: 14px; font-weight: 600; color: $text-base; flex: 1; min-width: 0; }
  &__group-count {
    font-size: 11px; color: $text-tertiary;
    padding: 1px 8px; background: $bg-card; border-radius: 9999px;
  }
  &__group-clear {
    display: inline-flex; align-items: center; gap: 2px;
    height: 24px; padding: 0 8px;
    border: none; background: transparent;
    font-size: 11px; color: $text-muted;
    cursor: pointer; transition: color 0.15s;
    i { font-size: 13px; }
    &:hover { color: #ff4d4f; }
  }

  // 指标行
  &__item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-bottom: 1px solid $border-color-card;
    transition: background 0.15s;
    &:last-child { border-bottom: none; }
    &:hover { background: #faf9ff; }
  }
  &__item-icon {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px;
    color: $text-tertiary; background: $bg-page;
    border-radius: 8px; flex-shrink: 0;
    svg { width: 16px; height: 16px; }
  }
  &__item-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  &__item-name { font-size: 13px; font-weight: 500; color: $text-base; }
  &__item-metric { font-size: 11px; color: $text-muted; }

  // 数量步进器
  &__item-qty {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }
  &__stepper-btn {
    width: 28px; height: 28px;
    border: 1px solid $border-color-input;
    background: $bg-card;
    color: $text-secondary;
    font-size: 14px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
    &:first-child { border-radius: $radius-btn 0 0 $radius-btn; }
    &:last-child { border-radius: 0 $radius-btn $radius-btn 0; }
    &:hover { border-color: $color-primary; color: $color-primary; z-index: 1; }
  }
  &__stepper-input {
    width: 50px; height: 28px;
    border: 1px solid $border-color-input;
    border-left: none; border-right: none;
    font-size: 13px; text-align: center;
    color: $text-base; background: $bg-card;
    &:focus { outline: none; }
    /* 隐藏 number 旋钮 */
    appearance: textfield;
    -moz-appearance: textfield;
    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
  }

  &__item-price {
    flex-shrink: 0;
    min-width: 64px;
    text-align: right;
    font-size: 14px; font-weight: 600;
    color: $color-primary;
  }
  &__item-remove {
    flex-shrink: 0;
    width: 24px; height: 24px;
    border: none; background: transparent;
    color: $text-muted;
    cursor: pointer; border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.15s;
    i { font-size: 12px; }
    &:hover { color: #ff4d4f; background: rgba(255, 77, 79, 0.08); }
  }

  // 底部结算
  &__checkout {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid $border-color-card;
  }
  &__checkout-total { display: flex; align-items: baseline; gap: 8px; }
  &__checkout-label { font-size: 13px; color: $text-tertiary; }
  &__checkout-value { font-size: 22px; font-weight: 700; color: $color-primary; }
  &__checkout-actions { display: flex; gap: 8px; }
}

// ===== 动画 =====
.cart-bar-enter-active, .cart-bar-leave-active { transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1); }
.cart-bar-enter-from, .cart-bar-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }

// ===== 响应式 =====
@media (max-width: 1199px) {
  .sub-dashboard { grid-template-columns: 1fr; }
}
</style>
