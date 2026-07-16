<script setup lang="ts">
/**
 * 设备分组
 * 左右分栏：左侧 区域/业务 切换（未绑定单独颜色根节点），右侧设备表格
 */
import { useRouter } from 'vue-router'
import {
  devices, regionGroupTree, businessGroups, statusConfig,
  formatRelativeTime, healthScoreColor,
  type GroupTreeNode, type IotDevice
} from './mock'

const router = useRouter()

// 分组模式
type GroupMode = 'region' | 'business'
const groupMode = ref<GroupMode>('region')

// 空间分组树
const expandedKeys = ref<string[]>(['park', 'b-e', 'b-e-4f', 'b-a', 'b-a-1f'])
const selectedGroupKey = ref('b-e-4f-rd')
type TreeSelectInfo = { node: { key: string | number } }

// 业务分组
const selectedBizKey = ref('env')

// 搜索
const searchKey = ref('')
const statusFilter = ref<'all' | 'online' | 'offline' | 'alert'>('all')

// 当前选中的分组信息
const selectedNode = computed<GroupTreeNode | undefined>(() => {
  if (groupMode.value !== 'region') return undefined
  const find = (nodes: GroupTreeNode[]): GroupTreeNode | undefined => {
    for (const n of nodes) {
      if (n.key === selectedGroupKey.value) return n
      if (n.children) { const r = find(n.children); if (r) return r }
    }
    return undefined
  }
  return find(regionGroupTree)
})

const selectedBiz = computed(() => businessGroups.find(b => b.key === selectedBizKey.value))

const selectedGroupLabel = computed(() => {
  if (groupMode.value === 'region') return selectedNode.value?.label || '全部'
  return selectedBiz.value?.label || '全部'
})

// 区域匹配
function matchRegionGroup(dev: IotDevice, groupKey: string): boolean {
  const areaMap: Record<string, string[]> = {
    'b-e-4f-rd': ['研发部办公区'], 'b-e-4f-pm': ['项目部办公区'], 'b-e-4f-meet': ['会议室'],
    'b-e-2f-hall': ['大厅'], 'b-e-2f-corridor': ['走廊'],
    'b-a-1f-ops': ['运营办公室'], 'b-a-1f-front': ['前台'],
    'b-a-b1-storage': ['仓库'], 'b-a-b1-pump': ['水泵房'],
    'outdoor-gate': ['前门'], 'outdoor-factory': ['厂界'],
    'b-e-4f': ['研发部办公区', '项目部办公区', '会议室'],
    'b-e-2f': ['大厅', '走廊'],
    'b-e': ['研发部办公区', '项目部办公区', '会议室', '大厅', '走廊'],
    'b-a-1f': ['运营办公室', '前台'], 'b-a-b1': ['仓库', '水泵房'],
    'b-a': ['运营办公室', '前台', '仓库', '水泵房'],
    'outdoor': ['前门', '厂界'],
    'park': ['研发部办公区', '项目部办公区', '会议室', '大厅', '走廊', '运营办公室', '前台', '仓库', '水泵房', '前门', '厂界', '厨房', '配电室', '地下室'],
    'unbind': []
  }
  return (areaMap[groupKey] || []).includes(dev.area)
}

// 获取设备的完整区域路径（从根节点到设备所在区域）
function getDeviceAreaPath(dev: IotDevice): string {
  // 简化：返回 园区 / 楼栋 / 楼层 / 区域 的完整路径
  const areaToPath: Record<string, string> = {
    '研发部办公区': '智谷园区 / E栋 / 4F / 研发部办公区',
    '项目部办公区': '智谷园区 / E栋 / 4F / 项目部办公区',
    '会议室': '智谷园区 / E栋 / 4F / 会议室',
    '大厅': '智谷园区 / E栋 / 2F / 大厅',
    '走廊': '智谷园区 / E栋 / 2F / 走廊',
    '运营办公室': '智谷园区 / A栋 / 1F / 运营办公室',
    '前台': '智谷园区 / A栋 / 1F / 前台',
    '仓库': '智谷园区 / A栋 / B1 / 仓库',
    '水泵房': '智谷园区 / A栋 / B1 / 水泵房',
    '前门': '智谷园区 / 室外区域 / 大门',
    '厂界': '智谷园区 / 室外区域 / 厂界',
    '厨房': '智谷园区 / 厨房',
    '配电室': '智谷园区 / 配电室',
    '地下室': '智谷园区 / 地下室',
    '研发楼': '智谷园区 / 研发楼'
  }
  return areaToPath[dev.area] || dev.area
}

// 分组设备列表
const groupDevices = computed(() => {
  let list: IotDevice[]
  if (groupMode.value === 'region') {
    list = devices.value.filter(d => matchRegionGroup(d, selectedGroupKey.value))
  } else {
    list = devices.value.filter(d => d.business === selectedGroupLabel.value)
  }
  if (statusFilter.value !== 'all') {
    list = list.filter(d => {
      if (statusFilter.value === 'online') return d.status === 'online'
      if (statusFilter.value === 'offline') return d.status === 'offline' || d.status === 'disabled'
      if (statusFilter.value === 'alert') return d.status === 'alert' || d.status === 'silent'
      return true
    })
  }
  const kw = searchKey.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(d => d.name.toLowerCase().includes(kw) || d.product.toLowerCase().includes(kw))
  }
  return list
})

// KPI 统计
const kpiData = computed(() => {
  const base = groupMode.value === 'region'
    ? devices.value.filter(d => matchRegionGroup(d, selectedGroupKey.value))
    : devices.value.filter(d => d.business === selectedGroupLabel.value)
  const valid = base.filter(d => d.healthScore > 0)
  return {
    total: base.length,
    online: base.filter(d => d.status === 'online').length,
    offline: base.filter(d => d.status === 'offline' || d.status === 'disabled').length,
    alert: base.filter(d => d.status === 'alert' || d.status === 'silent').length,
    health: valid.length > 0 ? (valid.reduce((s, d) => s + d.healthScore, 0) / valid.length).toFixed(1) : '—'
  }
})

// KPI 卡片配置（5个铺满）
const kpiCards = computed(() => [
  { key: 'total', label: '设备总数', value: kpiData.value.total, icon: 'i-ant-design-appstore-outlined', color: '#6e4bff', detail: `在线率 ${kpiData.value.total > 0 ? Math.round(kpiData.value.online / kpiData.value.total * 100) : 0}%`, active: statusFilter.value === 'all' },
  { key: 'online', label: '在线设备', value: kpiData.value.online, icon: 'i-ant-design-check-circle-outlined', color: '#2bb3a3', detail: `离线 ${kpiData.value.offline} 台`, active: statusFilter.value === 'online' },
  { key: 'offline', label: '离线设备', value: kpiData.value.offline, icon: 'i-ant-design-stop-outlined', color: '#bfbfbf', detail: '已断开连接', active: statusFilter.value === 'offline' },
  { key: 'alert', label: '告警设备', value: kpiData.value.alert, icon: 'i-ant-design-warning-outlined', color: '#ff4d4f', detail: '需及时处理', active: statusFilter.value === 'alert' },
  { key: 'health', label: '健康评分', value: kpiData.value.health, icon: 'i-ant-design-heart-outlined', color: healthScoreColor(Number(kpiData.value.health)), detail: kpiData.value.health === '—' ? '暂无数据' : (Number(kpiData.value.health) >= 80 ? '良好' : Number(kpiData.value.health) >= 60 ? '正常' : '需关注'), active: false, static: true }
])

function selectTreeNode(key: string) { selectedGroupKey.value = key; statusFilter.value = 'all' }
function handleRegionTreeSelect(_: unknown, info: TreeSelectInfo) {
  selectTreeNode(String(info.node.key))
}
function selectBiz(key: string) { selectedBizKey.value = key; statusFilter.value = 'all' }

function gotoDetail(dev: IotDevice) {
  router.push(`/iot/device/${dev.id}`)
}
</script>

<template>
  <div class="grp-page">
    <section class="grp-layout">
      <!-- 左侧 -->
      <aside class="grp-sidebar">
        <!-- 切换 -->
        <div class="grp-switch">
          <button :class="{ active: groupMode === 'region' }" @click="groupMode = 'region'">
            <i class="i-ant-design-environment-outlined" />区域
          </button>
          <button :class="{ active: groupMode === 'business' }" @click="groupMode = 'business'">
            <i class="i-ant-design-tags-outlined" />业务
          </button>
        </div>

        <!-- 搜索 -->
        <div class="grp-search-wrap">
          <a-input v-model:value="searchKey" placeholder="搜索设备名称" allow-clear size="small">
            <template #prefix><i class="i-ant-design-search-outlined" /></template>
          </a-input>
        </div>

        <!-- 区域树 -->
        <div v-if="groupMode === 'region'" class="grp-tree-scroll">
          <a-tree
            v-model:expandedKeys="expandedKeys"
            :tree-data="regionGroupTree"
            :selected-keys="[selectedGroupKey]"
            :block-node="true"
            class="grp-tree"
            @select="handleRegionTreeSelect"
          >
            <template #title="{ label, count, unbind }">
              <div class="grp-tree-node" :class="{ 'is-unbind': unbind }">
                <i v-if="unbind" class="grp-tree-node__unbind-icon i-ant-design-disconnect-outlined" />
                <span class="grp-tree-node__label">{{ label }}</span>
                <span class="grp-tree-node__count" :class="{ 'is-unbind': unbind }">{{ count || 0 }}</span>
              </div>
            </template>
          </a-tree>
        </div>

        <!-- 业务列表 -->
        <div v-else class="grp-biz-scroll">
          <button
            v-for="biz in businessGroups"
            :key="biz.key"
            class="grp-biz-item"
            :class="{ active: biz.key === selectedBizKey, 'is-unbind': biz.unbind }"
            @click="selectBiz(biz.key)"
          >
            <span class="grp-biz-item__name">{{ biz.label }}</span>
            <span class="grp-biz-item__count" :class="{ 'is-unbind': biz.unbind }">{{ biz.count }}</span>
          </button>
        </div>
      </aside>

      <!-- 右侧 -->
      <section class="grp-main">
        <!-- 标题栏 -->
        <div class="grp-head">
          <div class="grp-head__title">
            <strong>{{ selectedGroupLabel }}</strong>
            <span class="grp-head__sub">{{ groupDevices.length }} 台设备</span>
          </div>
        </div>

        <!-- KPI 指标卡片（5个铺满，同仪表盘风格） -->
        <div class="grp-kpis">
          <button
            v-for="kpi in kpiCards"
            :key="kpi.key"
            class="grp-kpi"
            :class="{ active: kpi.active, 'grp-kpi--static': kpi.static }"
            @click="!kpi.static && (statusFilter = kpi.key as any)"
          >
            <div class="grp-kpi__head">
              <span class="grp-kpi__icon" :style="{ background: kpi.color }">
                <i :class="kpi.icon" />
              </span>
              <div class="grp-kpi__body">
                <strong class="grp-kpi__value" :style="{ color: kpi.active ? kpi.color : '#111418' }">{{ kpi.value }}</strong>
                <small class="grp-kpi__label">{{ kpi.label }}</small>
              </div>
            </div>
          </button>
        </div>

        <!-- 表格 -->
        <div class="grp-table-wrap">
          <table class="grp-table">
            <thead>
              <tr>
                <th>设备名称</th>
                <th>所属区域</th>
                <th>状态</th>
                <th>业务分组</th>
                <th>健康评分</th>
                <th>最后上报</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="dev in groupDevices" :key="dev.id">
                <td>
                  <div class="grp-device">
                    <span class="grp-device__icon" :style="{ background: healthScoreColor(dev.healthScore) + '20', color: healthScoreColor(dev.healthScore) }">
                      <i :class="dev.icon" />
                    </span>
                    <button class="grp-device__name" type="button" @click="gotoDetail(dev)">{{ dev.name }}</button>
                  </div>
                </td>
                <td class="grp-area-cell">{{ getDeviceAreaPath(dev) }}</td>
                <td>
                  <span class="grp-status" :class="statusConfig[dev.status].class">
                    <i class="grp-status__dot" />{{ statusConfig[dev.status].label }}
                  </span>
                </td>
                <td>
                  <span class="grp-biz-tag">{{ dev.business }}</span>
                </td>
                <td>
                  <span class="grp-score" :style="{ color: healthScoreColor(dev.healthScore), background: healthScoreColor(dev.healthScore) + '15' }">
                    {{ dev.healthScore }}
                  </span>
                </td>
                <td class="grp-time-cell">{{ formatRelativeTime(dev.lastReport) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="groupDevices.length === 0" class="grp-empty">
            <i class="i-ant-design-api-outlined grp-empty__icon" />
            <p>该分组下暂无设备</p>
          </div>
        </div>
      </section>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.grp-page { height: 100%; padding: 8px; overflow: hidden; }
.grp-layout { height: 100%; display: grid; grid-template-columns: 260px 1fr; gap: 8px; overflow: hidden; }

/* ===== 左侧 ===== */
.grp-sidebar { background: #fff; border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }

.grp-switch { display: flex; padding: 10px; gap: 6px; flex-shrink: 0; border-bottom: 1px solid $border-color-card;
  button { flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px; height: 34px;
    border: 1px solid $border-color-card; border-radius: 8px; background: #fff; color: $text-secondary;
    font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s;
    i { font-size: 15px; }
    &:hover { border-color: rgba(110,75,255,0.3); }
    &.active { border-color: $color-primary; background: $color-primary-bg; color: $color-primary; font-weight: 500; }
  }
}
.grp-search-wrap { padding: 8px 10px; flex-shrink: 0; border-bottom: 1px solid $border-color-card; }

/* 区域树 */
.grp-tree-scroll { flex: 1; overflow-y: auto; padding: 6px 8px; scrollbar-width: none; -ms-overflow-style: none; &::-webkit-scrollbar { display: none; } }
.grp-tree {
  background: transparent; font-size: 13px;
  :deep(.ant-tree-treenode) { padding: 1px 0; }
  :deep(.ant-tree-node-content-wrapper) { border-radius: 6px; padding: 4px 8px; &:hover { background: #faf9ff; } }
  :deep(.ant-tree-node-selected) { background: $color-primary-bg !important; }
}
.grp-tree-node { display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 4px;
  &__label { flex: 1; font-size: 13px; color: $text-base; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__count { font-size: 10px; color: $text-muted; background: $bg-page; padding: 0 7px; border-radius: 9999px; line-height: 18px; flex-shrink: 0;
    &.is-unbind { background: rgba(154,161,171,0.12); color: $text-tertiary; }
  }
  &__unbind-icon { font-size: 13px; color: $text-tertiary; flex-shrink: 0; }
  &.is-unbind .grp-tree-node__label { color: $text-tertiary; font-style: italic; }
}

/* 业务列表 */
.grp-biz-scroll { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 4px; scrollbar-width: none; -ms-overflow-style: none; &::-webkit-scrollbar { display: none; } }
.grp-biz-item {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid transparent;
  border-radius: 10px; background: transparent; cursor: pointer; font-family: inherit; transition: all 0.15s;
  &:hover { background: #faf9ff; }
  &.active { border-color: $color-primary; background: $color-primary-bg; }
  &.is-unbind { opacity: 0.8; &:hover { background: rgba(154,161,171,0.06); } &.active { border-color: $text-tertiary; background: rgba(154,161,171,0.08); } }
  &__icon { font-size: 16px; color: $text-tertiary; flex-shrink: 0; .active & { color: $color-primary; } .is-unbind & { color: $text-muted; } }
  &__name { flex: 1; font-size: 13px; color: $text-base; text-align: left; .is-unbind & { color: $text-tertiary; font-style: italic; } }
  &__count { font-size: 10px; color: $text-muted; background: $bg-page; padding: 0 7px; border-radius: 9999px; line-height: 18px; flex-shrink: 0;
    &.is-unbind { background: rgba(154,161,171,0.12); color: $text-tertiary; }
  }
}

/* ===== 右侧 ===== */
.grp-main { background: #fff; border-radius: 14px; display: flex; flex-direction: column; overflow: hidden; }

.grp-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid $border-color-card; flex-shrink: 0;
  &__title { display: flex; align-items: baseline; gap: 8px;
    strong { font-size: 16px; font-weight: 600; color: $text-base; }
  }
  &__sub { font-size: 13px; color: $text-muted; }
}

/* KPI 指标 — 同仪表盘/监控设备管理风格 */
.grp-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; padding: 12px 16px; flex-shrink: 0; }
.grp-kpi {
  background: #fff; border-radius: 14px; padding: 16px 20px;
  display: flex; flex-direction: column; gap: 12px;
  border: 2px solid transparent; cursor: pointer; font-family: inherit; transition: all 0.15s;
  &:hover { border-color: rgba(110,75,255,0.2); box-shadow: 0 2px 8px rgba(20,23,31,0.04); }
  &.active { border-color: $color-primary; background: #fdfcff; }
}
.grp-kpi__head { display: flex; align-items: center; gap: 14px; }
.grp-kpi__icon {
  width: 44px; height: 44px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0;
  i { font-size: 24px; }
}
.grp-kpi__body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.grp-kpi__value { font-size: 26px; font-weight: 650; color: $text-base; line-height: 1.1; }
.grp-kpi__label { font-size: 13px; color: $text-secondary; }
.grp-kpi__detail {
  display: flex; align-items: center; gap: 5px;
  padding-top: 10px; border-top: 1px solid $border-color-card;
  font-size: 12px; color: $text-secondary;
}
.grp-kpi__dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.grp-kpi--static { cursor: default; &:hover { border-color: transparent; box-shadow: none; } }

/* 表格 */
.grp-table-wrap { flex: 1; overflow: auto; scrollbar-width: none; -ms-overflow-style: none; &::-webkit-scrollbar { display: none; } }
.grp-table {
  width: 100%; border-collapse: collapse; font-size: 13px;
  thead th { padding: 12px 14px; text-align: left; font-weight: 600; font-size: 12px; color: $text-secondary; background: $bg-page; border-bottom: 1px solid $border-color-card; white-space: nowrap; position: sticky; top: 0; z-index: 1; }
  tbody td { padding: 18px 14px; border-bottom: 1px solid $border-color-card; color: $text-secondary; }
  tbody tr { transition: background 0.15s; &:hover { background: #faf9ff; } }
}

.grp-device { display: flex; align-items: center; gap: 10px; }
.grp-device__icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; i { font-size: 20px; } }
.grp-device__name { border: none; background: transparent; color: $text-base; font-weight: 600; font-size: 13px; cursor: pointer; font-family: inherit; padding: 0; &:hover { color: $color-primary; } }

.grp-area-cell { font-size: 12px; color: $text-muted; }
.grp-biz-tag { display: inline-flex; align-items: center; font-size: 11px; padding: 2px 8px; border-radius: 4px; background: $bg-page; color: $text-secondary; }
.grp-score { font-size: 14px; font-weight: 700; padding: 2px 10px; border-radius: 6px; }
.grp-time-cell { font-size: 12px; color: $text-muted; }

.grp-status { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 2px 8px; border-radius: 4px;
  &__dot { width: 6px; height: 6px; border-radius: 50%; }
}
.st-online { background: rgba(43,179,163,0.1); color: $color-online; .grp-status__dot { background: $color-online; } }
.st-offline { background: rgba(154,161,171,0.12); color: $text-tertiary; .grp-status__dot { background: #bfbfbf; } }
.st-alert { background: rgba(255,77,79,0.1); color: #ff4d4f; .grp-status__dot { background: #ff4d4f; } }
.st-silent { background: rgba(250,173,20,0.12); color: #d48806; .grp-status__dot { background: #faad14; } }
.st-disabled { background: rgba(0,0,0,0.06); color: $text-muted; .grp-status__dot { background: #bfbfbf; } }

.grp-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 80px 20px; color: $text-muted;
  &__icon { font-size: 48px; opacity: 0.3; } p { font-size: 14px; margin: 0; }
}
</style>
