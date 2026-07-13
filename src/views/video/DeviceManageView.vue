<script setup lang="ts">
/**
 * 监控设备管理
 * 顶部 4 个 KPI（网关/通道/区域/PTZ，各带在线离线明细）
 * 左侧网关列表 + 右侧该网关下通道卡片（含搜索）
 * 点击通道卡片 → 弹窗播放（复用监控墙弹窗结构：左直播 + 右告警/回放）
 */
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { gateways, channels, areaText, areaTree, areaTreeExpandedKeys, type GatewayDevice, type VideoChannel, type AreaTreeNode } from './device.mock'
import gatewayImg from '@/assets/cameras/gateway.png'

const router = useRouter()
const appStore = useAppStore()

// ===== 左侧筛选模式：通过网关 / 通过区域 =====
type FilterMode = 'gateway' | 'area'
const filterMode = ref<FilterMode>('gateway')

// ===== 区域树 =====
const areaExpandedKeys = ref<string[]>([])
// 初始化展开全部
watchEffect(() => {
  if (areaExpandedKeys.value.length === 0 && areaTreeExpandedKeys.value.length > 0) {
    areaExpandedKeys.value = [...areaTreeExpandedKeys.value]
  }
})

// ===== KPI =====
const kpiCards = computed(() => {
  const gwOnline = gateways.filter(g => g.status === 'online').length
  const gwOffline = gateways.length - gwOnline

  const chOnline = channels.value.filter(c => c.status === 'online').length
  const chOffline = channels.value.length - chOnline

  const covered = new Set(channels.value.filter(c => c.areaPath.length > 0).map(c => areaText(c.areaPath))).size
  // 未覆盖：未绑定区域的通道数
  const uncoveredCount = channels.value.filter(c => c.areaPath.length === 0).length

  const ptzYes = channels.value.filter(c => c.ptz).length
  const ptzNo = channels.value.length - ptzYes

  return [
    {
      key: 'gateway',
      label: '边缘网关',
      value: gateways.length,
      unit: '个',
      icon: 'i-ant-design-cloud-server-outlined',
      color: '#6e4bff',
      detail: [
        { dot: 'online', text: `在线 ${gwOnline}` },
        { dot: 'offline', text: `离线 ${gwOffline}` }
      ]
    },
    {
      key: 'channel',
      label: '视频通道',
      value: channels.value.length,
      unit: '路',
      icon: 'i-ant-design-video-camera-outlined',
      color: '#2bb3a3',
      detail: [
        { dot: 'online', text: `在线 ${chOnline}` },
        { dot: 'offline', text: `离线 ${chOffline}` }
      ]
    },
    {
      key: 'area',
      label: '区域覆盖',
      value: covered,
      unit: '个',
      icon: 'i-ant-design-environment-outlined',
      color: '#faad14',
      detail: [
        { dot: 'online', text: `已覆盖 ${covered}` },
        { dot: 'offline', text: `未绑定 ${uncoveredCount}` }
      ]
    },
    {
      key: 'ptz',
      label: 'PTZ 可控',
      value: ptzYes,
      unit: '路',
      icon: 'i-ant-design-control-outlined',
      color: '#13c2c2',
      detail: [
        { dot: 'online', text: `可控 ${ptzYes}` },
        { dot: 'offline', text: `不可控 ${ptzNo}` }
      ]
    }
  ]
})

// ===== 当前选中的网关 =====
const activeGatewayId = ref<string>(gateways[0]?.id || '')
const activeGateway = computed<GatewayDevice | undefined>(() =>
  gateways.find(g => g.id === activeGatewayId.value)
)

// 某网关下的通道数
function channelCount(gwId: string): number {
  return channels.value.filter(c => c.gatewayId === gwId).length
}

// ===== 当前选中的区域 =====
const activeAreaKey = ref<string>('')
const activeArea = computed<AreaTreeNode | undefined>(() => {
  if (!activeAreaKey.value) return undefined
  // 在树中查找
  function find(nodes: AreaTreeNode[]): AreaTreeNode | undefined {
    for (const n of nodes) {
      if (n.key === activeAreaKey.value) return n
      if (n.children) {
        const r = find(n.children)
        if (r) return r
      }
    }
    return undefined
  }
  return find(areaTree.value)
})

// 收集某节点下所有末级区域的 path（用于通道匹配）
function collectAreaPaths(node: AreaTreeNode): string[] {
  const paths: string[] = []
  function walk(n: AreaTreeNode) {
    if (!n.children || n.children.length === 0) {
      if (n.path) paths.push(n.path.join('/'))
    } else {
      n.children.forEach(walk)
    }
  }
  walk(node)
  return paths
}

// 通道搜索关键字
const searchKey = ref('')

// 当前筛选下、命中搜索的通道（按模式区分）
const filteredChannels = computed(() => {
  let list: VideoChannel[]
  if (filterMode.value === 'gateway') {
    list = channels.value.filter(c => c.gatewayId === activeGatewayId.value)
  } else {
    // 区域模式：选中树节点，匹配该节点下所有末级区域的通道
    const area = activeArea.value
    if (area) {
      const paths = collectAreaPaths(area)
      list = channels.value.filter(c => paths.includes(c.areaPath.join('/')))
    } else {
      list = []
    }
  }
  const kw = searchKey.value.trim().toLowerCase()
  if (!kw) return list
  return list.filter(c =>
    c.name.toLowerCase().includes(kw) ||
    areaText(c.areaPath).toLowerCase().includes(kw)
  )
})

// 右侧标题
const rightPanelTitle = computed(() => {
  if (filterMode.value === 'gateway') {
    return `${activeGateway.value?.name || ''} · 通道列表`
  }
  return `${activeArea.value?.title || ''} · 通道列表`
})

// 选中网关
function selectGateway(id: string) {
  activeGatewayId.value = id
  searchKey.value = ''
}

// 进入网关设备配置页
function gotoGatewayConfig(gw: GatewayDevice, e: Event) {
  e.stopPropagation()
  // 引导联动：进入地址页时推进步骤
  if (appStore.guideStep === 'goto-config') {
    appStore.setGuideStep('gw-address')
  }
  router.push(`/video/device/gateway/${gw.id}/address`)
}

// 选中区域（树节点）
function selectAreaNode(key: string) {
  activeAreaKey.value = key
  searchKey.value = ''
}

// 切换筛选模式时重置选择
watch(filterMode, (mode) => {
  searchKey.value = ''
  if (mode === 'gateway') {
    if (!activeGatewayId.value) activeGatewayId.value = gateways[0]?.id || ''
  } else {
    // 默认选中第一个根节点
    if (!activeAreaKey.value && areaTree.value.length > 0) {
      activeAreaKey.value = areaTree.value[0].key
    }
  }
})

// ===== 同步通道：占位交互（无未同步概念，仅给反馈）=====
const syncingId = ref<string | null>(null)
function syncChannels(gw: GatewayDevice, e?: Event) {
  e?.stopPropagation()
  if (syncingId.value) return
  syncingId.value = gw.id
  setTimeout(() => {
    syncingId.value = null
    message.success(`「${gw.name}」通道已同步`)
  }, 800)
}

// 右侧面板：同步当前选中网关
const isSyncingActive = computed(() => syncingId.value === activeGatewayId.value)
function syncActiveGateway() {
  if (activeGateway.value) syncChannels(activeGateway.value)
}

// ===== 新增网关弹窗 =====
type BindMethod = 'sn' | 'scan'
const bindModalVisible = ref(false)
const bindMethod = ref<BindMethod>('sn')
const snInput = ref('')
const binding = ref(false)
// 绑定错误提示（红色横条）
const bindError = ref('')
// 扫码识别状态：false=待扫码，true=识别成功
const scanSuccess = ref(false)

function openBindModal() {
  bindModalVisible.value = true
}

function closeBindModal() {
  bindModalVisible.value = false
  // 重置
  snInput.value = ''
  binding.value = false
  bindError.value = ''
  scanSuccess.value = false
}

function switchMethod(m: BindMethod) {
  bindMethod.value = m
  bindError.value = ''
  snInput.value = ''
  scanSuccess.value = false
}

/**
 * 绑定网关
 * 规则：输入 "1" 成功，输入 "2" 失败，其他值也失败
 */
function handleBind() {
  bindError.value = ''
  let inputValue = ''
  let errorTip = ''

  if (bindMethod.value === 'sn') {
    inputValue = snInput.value.trim()
    if (!inputValue) { bindError.value = '请输入网关 SN 码'; return }
    errorTip = '绑定失败，请确认 SN 码是否正确'
  } else {
    return // 扫码接入不经过这里
  }

  binding.value = true
  setTimeout(() => {
    binding.value = false
    if (inputValue === '1') {
      // 绑定成功
      message.success('网关绑定成功')
      closeBindModal()

      // 引导流程：绑定成功后添加新网关并推进到「配置设备」步骤
      if (appStore.guideActive && appStore.guideStep === 'bind-gateway') {
        gateways.push({
          id: 'gw-new-' + Date.now(),
          name: '新接入网关',
          brand: 'JetLinks',
          model: 'Edge-2000',
          sn: 'GW-' + Math.floor(10000000 + Math.random() * 89999999),
          ip: '192.168.1.108',
          location: 'E栋 1F 弱电间',
          status: 'online'
        })
        nextTick(() => {
          appStore.setGuideStep('goto-config')
        })
      }
    } else {
      // 绑定失败，不关闭弹窗
      bindError.value = errorTip
    }
  }, 800)
}

// ===== 引导模式：下拉选择绑定结果 =====
const GUIDE_GW_ID = 'gw-guide'

type GuideBindResult = 'configured' | 'empty' | 'offline'

// 引导模式：确定绑定选择弹窗
const guideBindModalVisible = ref(false)

/** 打开绑定结果选择弹窗 */
function openGuideBindModal() {
  guideBindModalVisible.value = true
}

/** 引导模式下，选择绑定结果后创建网关并推进到对应提示页 */
function handleGuideBindSelect(result: GuideBindResult) {
  guideBindModalVisible.value = false
  closeBindModal()

  // 先移除之前引导创建的网关（避免重复）
  const idx = gateways.findIndex(g => g.id === GUIDE_GW_ID)
  if (idx >= 0) gateways.splice(idx, 1)

  // 创建新网关
  const isOnline = result === 'configured' || result === 'empty'
  gateways.push({
    id: GUIDE_GW_ID,
    name: '新接入网关',
    brand: 'JetLinks',
    model: 'Edge-2000',
    sn: 'GW-' + Math.floor(10000000 + Math.random() * 89999999),
    ip: '192.168.1.108',
    location: 'E栋 1F 弱电间',
    status: isOnline ? 'online' : 'offline',
  })

  // 已配置场景：为该网关添加几条摄像头通道
  if (result === 'configured') {
    const camThumbs = [channels.value[0]?.thumb, channels.value[1]?.thumb, channels.value[2]?.thumb]
    const guideChannels: VideoChannel[] = [
      { id: 'ch-guide-1', name: '前门摄像头', thumb: camThumbs[0] || channels.value[0]?.thumb || '', gatewayId: GUIDE_GW_ID, areaPath: ['物联网产业园区', 'E栋', '1F', '公共区域'], status: 'online', ptz: false },
      { id: 'ch-guide-2', name: '大厅摄像头', thumb: camThumbs[1] || channels.value[1]?.thumb || '', gatewayId: GUIDE_GW_ID, areaPath: ['物联网产业园区', 'E栋', '1F', '公共区域'], status: 'online', ptz: false },
      { id: 'ch-guide-3', name: '走廊摄像头', thumb: camThumbs[2] || channels.value[2]?.thumb || '', gatewayId: GUIDE_GW_ID, areaPath: [], status: 'offline', ptz: false },
    ]
    channels.value.push(...guideChannels)
  }

  // 清除该网关下旧的引导通道（切换场景时避免残留）
  if (result !== 'configured') {
    const chIdx: number[] = []
    channels.value.forEach((c, i) => { if (c.gatewayId === GUIDE_GW_ID) chIdx.unshift(i) })
    chIdx.forEach(i => channels.value.splice(i, 1))
  }

  // 选中并记录
  activeGatewayId.value = GUIDE_GW_ID
  appStore.guideGatewayId = GUIDE_GW_ID
  appStore.guideBindResult = result

  // 推进到对应的 center 提示页
  nextTick(() => {
    if (result === 'configured') appStore.setGuideStep('gw-online-configured')
    else if (result === 'empty') appStore.setGuideStep('gw-online-empty')
    else appStore.setGuideStep('gw-offline')
  })
}

// ===== 离线网关：更新通道触发 =====
watch(() => appStore.guideOfflineUpdateTrigger, () => {
  if (!appStore.guideActive) return
  // 将引导网关变为在线（步骤推进由 GuideOverlay 的 handleOfflineUpdateSelect 负责）
  const gw = gateways.find(g => g.id === GUIDE_GW_ID)
  if (gw) gw.status = 'online'
})
watch(() => appStore.guideStep, (step) => {
  if (step === 'bind-gateway' && !bindModalVisible.value) {
    nextTick(() => openBindModal())
  }
}, { immediate: true })

// ===== 引导联动：点击新增网关 → 自动推进到 bind-gateway =====
function openBindModalGuide() {
  openBindModal()
  if (appStore.guideStep === 'add-gateway') {
    appStore.setGuideStep('bind-gateway')
  }
}


// ===== 点击通道 → 弹窗播放（复用监控墙弹窗结构）=====
const playModalVisible = ref(false)
const playTarget = ref<VideoChannel | null>(null)
function playChannel(ch: VideoChannel) {
  playTarget.value = ch
  playTab.value = 'alarm'
  playModalVisible.value = true
}

// 弹窗宽度：屏幕宽度的 2/3（与监控墙 WallView 保持一致）
const viewportWidth = ref(window.innerWidth)
function onResize() {
  viewportWidth.value = window.innerWidth
}
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
const playModalWidth = computed(() => Math.floor(viewportWidth.value * 2 / 3))

// ===== 弹窗右侧：告警事件 / 录像回放 tab =====
const playTab = ref<'alarm' | 'replay'>('alarm')

interface PlayAlarmRow {
  id: string
  level: '紧急' | '警告' | '提示'
  title: string
  time: string
  status: '待处理' | '已处理'
}
const allPlayAlarms = computed<PlayAlarmRow[]>(() => {
  const name = playTarget.value?.name || ''
  if (name.includes('东门')) {
    return [
      { id: 'a1', level: '紧急', title: '人员闯入', time: '2026-07-07 09:12', status: '待处理' },
      { id: 'a2', level: '警告', title: '人员徘徊', time: '2026-07-07 08:40', status: '待处理' },
      { id: 'a3', level: '提示', title: '物品遗留', time: '2026-07-06 18:22', status: '已处理' },
      { id: 'a6', level: '紧急', title: '夜间未归', time: '2026-07-05 23:10', status: '已处理' },
      { id: 'a7', level: '警告', title: '人员聚集', time: '2026-07-05 14:30', status: '已处理' }
    ]
  }
  if (name.includes('南门')) {
    return [
      { id: 'a4', level: '警告', title: '车辆违停', time: '2026-07-07 10:05', status: '待处理' },
      { id: 'a5', level: '紧急', title: '烟火疑似', time: '2026-07-07 07:30', status: '已处理' },
      { id: 'a8', level: '提示', title: '物品遗留', time: '2026-07-06 11:20', status: '已处理' }
    ]
  }
  return []
})
const alarmSearchKey = ref('')
const alarmDateModel = ref<any>(null)
const alarmDate = computed<string | null>(() => {
  if (!alarmDateModel.value) return null
  return alarmDateModel.value.format('YYYY-MM-DD')
})
const playAlarms = computed<PlayAlarmRow[]>(() => {
  let list = allPlayAlarms.value
  const kw = alarmSearchKey.value.trim().toLowerCase()
  if (kw) {
    list = list.filter(r => r.title.toLowerCase().includes(kw) || r.level.includes(kw) || r.status.includes(kw))
  }
  if (alarmDate.value) {
    list = list.filter(r => r.time.slice(0, 10) === alarmDate.value)
  }
  return list
})

interface ReplayClip {
  id: string
  time: string
  label: string
  thumb: string
  duration: string
}
const allReplayClips = computed<ReplayClip[]>(() => {
  const thumb = playTarget.value?.thumb || ''
  return [
    { id: 'r1', time: '2026-07-07 09:10-09:15', label: '人员闯入告警时段', thumb, duration: '5 分钟' },
    { id: 'r2', time: '2026-07-07 08:38-08:45', label: '人员徘徊告警时段', thumb, duration: '7 分钟' },
    { id: 'r3', time: '2026-07-07 06:00-06:10', label: '晨间例行画面', thumb, duration: '10 分钟' },
    { id: 'r4', time: '2026-07-06 18:20-18:25', label: '物品遗留告警时段', thumb, duration: '5 分钟' },
    { id: 'r5', time: '2026-07-06 14:00-14:15', label: '午后例行画面', thumb, duration: '15 分钟' }
  ]
})
const replayDateModel = ref<any>(null)
const replayDate = computed<string | null>(() => {
  if (!replayDateModel.value) return null
  return replayDateModel.value.format('YYYY-MM-DD')
})
const replayClips = computed<ReplayClip[]>(() => {
  if (!replayDate.value) return allReplayClips.value
  return allReplayClips.value.filter(c => c.time.slice(0, 10) === replayDate.value)
})
</script>

<template>
  <div class="device-page">
    <!-- 顶部 KPI -->
    <section class="kpi-grid">
      <article v-for="k in kpiCards" :key="k.key" class="kpi-card">
        <div class="kpi-card__head">
          <span class="kpi-icon" :style="{ background: k.color }">
            <i :class="k.icon" />
          </span>
          <div class="kpi-body">
            <strong class="kpi-value">
              {{ k.value }}<small class="kpi-unit">{{ k.unit }}</small>
            </strong>
            <small class="kpi-label">{{ k.label }}</small>
          </div>
        </div>
        <div class="kpi-detail">
          <span
            v-for="(d, i) in k.detail"
            :key="i"
            class="kpi-detail__item"
          >
            <i class="kpi-detail__dot" :class="d.dot" />
            {{ d.text }}
          </span>
        </div>
      </article>
    </section>

    <!-- 左右两栏 -->
    <section class="split">
      <!-- 左：网关/区域列表 -->
      <aside class="gw-panel">
        <!-- 模式切换 -->
        <div class="filter-mode">
          <button
            class="filter-mode__btn"
            :class="{ active: filterMode === 'gateway' }"
            @click="filterMode = 'gateway'"
          >
            <i class="i-ant-design-cloud-server-outlined" />
            <span>网关</span>
            <em class="filter-mode__badge">{{ gateways.length }}</em>
          </button>
          <button
            class="filter-mode__btn"
            :class="{ active: filterMode === 'area' }"
            @click="filterMode = 'area'"
          >
            <i class="i-ant-design-environment-outlined" />
            <span>区域</span>
          </button>
        </div>

        <!-- ===== 网关模式 ===== -->
        <template v-if="filterMode === 'gateway'">
          <div class="gw-list">
            <div
              v-for="gw in gateways"
              :key="gw.id"
              class="gw-item"
              :class="{ 'is-active': gw.id === activeGatewayId }"
              :data-guide="gw.id === activeGatewayId && appStore.guideStep === 'goto-config' ? 'goto-config' : undefined"
              @click="selectGateway(gw.id)"
            >
              <span class="gw-item__icon-box" :class="gw.status">
                <i class="i-ant-design-cloud-server-outlined" />
              </span>
              <div class="gw-item__main">
                <div class="gw-item__top">
                  <span class="gw-item__name" :title="gw.name">{{ gw.name }}</span>
                  <span class="gw-item__status-text" :class="gw.status">
                    {{ gw.status === 'online' ? '在线' : '离线' }}
                  </span>
                </div>
                <div class="gw-item__desc">{{ channelCount(gw.id) }} 路通道</div>
              </div>
              <!-- 配置设备按钮 -->
              <button
                class="gw-item__config"
                type="button"
                title="配置该网关的摄像头设备"
                @click="gotoGatewayConfig(gw, $event)"
              >
                <i class="i-ant-design-setting-outlined" />
                <span>配置设备</span>
              </button>
            </div>

            <!-- 添加网关卡片 -->
            <button
              class="gw-add-card"
              type="button"
              data-guide="add-gateway"
              @click="appStore.guideActive ? openBindModalGuide() : openBindModal()"
            >
              <i class="i-ant-design-plus-outlined" />
              <span>添加网关</span>
            </button>
          </div>
        </template>

        <!-- ===== 区域模式 ===== -->
        <template v-else>
          <div class="panel-head">
            <strong>区域列表</strong>
          </div>
          <div class="area-tree-wrap">
            <a-tree
              v-model:expandedKeys="areaExpandedKeys"
              :tree-data="areaTree"
              :selected-keys="activeAreaKey ? [activeAreaKey] : []"
              :block-node="true"
              :show-line="false"
              class="area-tree"
              @select="(_, info) => selectAreaNode(String(info.node.key))"
            >
              <template #title="{ title, count, onlineCount }">
                <div class="area-tree-node" :class="{ 'has-children': false }">
                  <span class="area-tree-node__label" :title="title">{{ title }}</span>
                  <span class="area-tree-node__count">
                    <i class="i-ant-design-video-camera-outlined" />
                    <span>{{ count || 0 }}</span>
                    <span v-if="onlineCount !== undefined" class="area-tree-node__online">/{{ onlineCount }}</span>
                  </span>
                </div>
              </template>
            </a-tree>
            <div v-if="areaTree.length === 0" class="area-empty">
              <i class="i-ant-design-environment-outlined" />
              <p>暂无已绑定区域的通道</p>
            </div>
          </div>
        </template>
      </aside>

      <!-- 右：通道卡片 -->
      <div class="ch-panel">
        <div class="ch-panel-head">
          <div class="ch-panel-title">
            <strong>{{ rightPanelTitle }}</strong>
            <span class="panel-count">{{ filteredChannels.length }} 路</span>
          </div>
          <div class="ch-panel-actions">
            <a-input
              v-model:value="searchKey"
              class="ch-search"
              placeholder="搜索通道名称或区域"
              allow-clear
            >
              <template #prefix>
                <i class="i-ant-design-search-outlined" />
              </template>
            </a-input>
            <!-- 更新通道（仅网关模式，同步当前选中网关） -->
            <button
              v-if="filterMode === 'gateway'"
              class="ch-sync-btn"
              type="button"
              :disabled="isSyncingActive"
              title="更新当前网关通道"
              @click="syncActiveGateway"
            >
              <i :class="isSyncingActive ? 'i-ant-design-loading-outlined sync-spin' : 'i-ant-design-sync-outlined'" />
              <span>{{ isSyncingActive ? '更新中' : '更新通道' }}</span>
            </button>
          </div>
        </div>
        <div class="ch-grid">
          <article
            v-for="ch in filteredChannels"
            :key="ch.id"
            class="ch-card"
            @click="playChannel(ch)"
          >
            <div class="ch-card__thumb">
              <img :src="ch.thumb" :alt="ch.name" draggable="false" />
              <div class="ch-card__overlay" />
              <div class="ch-card__top">
                <span class="ch-status" :class="ch.status">
                  <i class="ch-status__dot" />
                  {{ ch.status === 'online' ? '在线' : '离线' }}
                </span>
                <span v-if="ch.ptz" class="ch-ptz" title="支持 PTZ 云台控制">
                  <i class="i-ant-design-control-outlined" />
                  PTZ
                </span>
              </div>
              <div class="ch-card__play">
                <i class="i-ant-design-play-circle-outlined" />
              </div>
            </div>
            <div class="ch-card__body">
              <div class="ch-card__title" :title="ch.name">{{ ch.name }}</div>
              <div class="ch-card__row">
                <i class="i-ant-design-cloud-server-outlined ch-card__row-icon" />
                <span class="ch-card__gateway">{{ gateways.find(g => g.id === ch.gatewayId)?.name || '未知网关' }}</span>
              </div>
              <div class="ch-card__row">
                <i class="i-ant-design-environment-outlined ch-card__row-icon" />
                <span
                  class="ch-card__area"
                  :class="{ 'is-empty': ch.areaPath.length === 0 }"
                  :title="ch.areaPath.length > 0 ? areaText(ch.areaPath) : '未绑定'"
                >
                  {{ ch.areaPath.length > 0 ? areaText(ch.areaPath) : '未绑定' }}
                </span>
              </div>
            </div>
          </article>

          <!-- 空状态 -->
          <div v-if="filteredChannels.length === 0" class="ch-empty">
            <i class="i-ant-design-video-camera-outlined ch-empty__icon" />
            <p>{{ searchKey ? '没有找到匹配的通道' : (filterMode === 'gateway' ? '该网关暂无通道' : '该区域暂无通道') }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== 新增网关弹窗 ===== -->
    <a-modal
      v-model:open="bindModalVisible"
      title="新增网关"
      :width="480"
      :footer="null"
      centered
      :body-style="{ padding: '0' }"
      :mask-closable="!appStore.guideActive"
      :z-index="appStore.guideStep === 'bind-gateway' ? 2000 : 1000"
      wrap-class-name="bind-modal-wrap"
      @cancel="closeBindModal"
    >
      <div class="bind-modal" data-guide="bind-modal">
        <!-- 方式切换 -->
        <div class="bind-tabs">
          <button
            class="bind-tab"
            :class="{ active: bindMethod === 'sn' }"
            @click="switchMethod('sn')"
          >
            <i class="i-ant-design-barcode-outlined" />
            <span>SN 码绑定</span>
          </button>
          <button
            class="bind-tab"
            :class="{ active: bindMethod === 'scan' }"
            @click="switchMethod('scan')"
          >
            <i class="i-ant-design-scan-outlined" />
            <span>扫码接入</span>
          </button>
        </div>

        <!-- 尚未购买网关提示 -->
        <div class="bind-contact">
          <i class="i-ant-design-customer-service-outlined" />
          <span>尚未购买网关？请前往联系商务获取设备</span>
          <div class="bind-contact__ways">
            <span class="bind-contact__way">
              <i class="i-ant-design-phone-outlined" />
              400-888-0000
            </span>
            <span class="bind-contact__way">
              <i class="i-ant-design-mail-outlined" />
              business@jetlinks.com
            </span>
          </div>
        </div>

        <!-- SN 码绑定 -->
        <div v-if="bindMethod === 'sn'" class="bind-content">
          <!-- 错误提示 -->
          <div v-if="bindError" class="bind-error">
            <i class="i-ant-design-close-circle-filled" />
            <span>{{ bindError }}</span>
          </div>
          <div class="bind-field">
            <label class="bind-field__label">网关 SN 码</label>
            <a-input
              v-model:value="snInput"
              class="bind-field__input"
              placeholder="请输入网关 SN 码（输入 1 成功，输入 2 失败）"
              allow-clear
              @pressEnter="handleBind"
            >
              <template #prefix>
                <i class="i-ant-design-barcode-outlined" />
              </template>
            </a-input>
            <p class="bind-field__hint">SN 码印在网关设备背面标签上，通常为 12-16 位字母数字组合。</p>
            <img :src="gatewayImg" class="bind-field__hint-img" alt="网关背面 SN 码位置示意" draggable="false" />
          </div>
          <div class="bind-actions">
            <button class="bind-btn bind-btn--default" type="button" @click="closeBindModal">取消</button>
            <!-- 引导模式：按钮打开选择弹窗 -->
            <button
              v-if="appStore.guideStep === 'bind-gateway'"
              class="bind-btn bind-btn--primary"
              type="button"
              @click="openGuideBindModal"
            >
              <span>确定绑定</span>
            </button>
            <!-- 非引导模式：普通绑定按钮 -->
            <button v-else class="bind-btn bind-btn--primary" type="button" :disabled="binding || !snInput.trim()" @click="handleBind">
              <i v-if="binding" class="i-ant-design-loading-outlined sync-spin" />
              <span>{{ binding ? '绑定中' : '绑定' }}</span>
            </button>
          </div>
        </div>

        <!-- 扫码接入 -->
        <div v-if="bindMethod === 'scan'" class="bind-content bind-content--scan">
          <!-- 扫码说明（未识别时） -->
          <template v-if="!scanSuccess">
            <div class="scan-intro">
              <!-- 二维码示意 -->
              <div class="scan-intro__qr">
                <i class="i-ant-design-qrcode-outlined" />
                <div class="scan-intro__qr-frame">
                  <div class="scan-intro__qr-corner scan-intro__qr-corner--tl" />
                  <div class="scan-intro__qr-corner scan-intro__qr-corner--tr" />
                  <div class="scan-intro__qr-corner scan-intro__qr-corner--bl" />
                  <div class="scan-intro__qr-corner scan-intro__qr-corner--br" />
                  <div class="scan-intro__qr-scanline" />
                  <div class="scan-intro__qr-dots">
                    <span v-for="n in 49" :key="n" class="scan-intro__qr-dot" :class="{ on: (n * 7 + 3) % 3 === 0 }" />
                  </div>
                </div>
              </div>
              <!-- 步骤说明 -->
              <div class="scan-intro__steps">
                <div class="scan-intro__step">
                  <span class="scan-intro__num">1</span>
                  <div class="scan-intro__text">
                    <strong>扫描设备二维码</strong>
                    <span>使用微信或浏览器扫码，扫描网关背面的二维码</span>
                    <img :src="gatewayImg" class="scan-intro__hint-img" alt="网关背面二维码位置示意" draggable="false" />
                  </div>
                </div>
                <div class="scan-intro__step">
                  <span class="scan-intro__num">2</span>
                  <div class="scan-intro__text">
                    <strong>登录账号</strong>
                    <span>扫码后跳转到登录页面，完成账号登录</span>
                  </div>
                </div>
                <div class="scan-intro__step">
                  <span class="scan-intro__num">3</span>
                  <div class="scan-intro__text">
                    <strong>识别成功</strong>
                    <span>登录后系统自动识别设备并开始接入</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="bind-actions">
              <button class="bind-btn bind-btn--default" type="button" @click="closeBindModal">取消</button>
              <button class="bind-btn bind-btn--primary" type="button" @click="scanSuccess = true">
                <i class="i-ant-design-check-outlined" />
                <span>扫码成功</span>
              </button>
            </div>
          </template>

          <!-- 扫码成功（识别成功页） -->
          <template v-else>
            <div class="scan-success">
              <!-- 成功标识 -->
              <div class="scan-success__badge">
                <i class="i-ant-design-check-circle-filled" />
                <span>设备识别成功</span>
              </div>
              <!-- 网关信息 -->
              <div class="scan-success__info">
                <div class="scan-success__row">
                  <span class="scan-success__label">设备名称</span>
                  <span class="scan-success__value">JetLinks 边缘网关</span>
                </div>
                <div class="scan-success__row">
                  <span class="scan-success__label">品牌型号</span>
                  <span class="scan-success__value">JetLinks · Edge-2000</span>
                </div>
                <div class="scan-success__row">
                  <span class="scan-success__label">SN 码</span>
                  <span class="scan-success__value scan-success__value--mono">GW-58740736</span>
                </div>
                <div class="scan-success__row">
                  <span class="scan-success__label">IP 地址</span>
                  <span class="scan-success__value scan-success__value--mono">192.168.1.108</span>
                </div>
              </div>
              <!-- 接入中提示 -->
              <div class="scan-success__status">
                <i class="i-ant-design-loading-outlined sync-spin" />
                <span>正在接入，请稍候...</span>
              </div>
            </div>
            <div class="bind-actions">
              <!-- 引导模式：按钮打开选择弹窗 -->
              <button
                v-if="appStore.guideStep === 'bind-gateway'"
                class="bind-btn bind-btn--primary"
                type="button"
                @click="openGuideBindModal"
              >
                <span>确定绑定</span>
              </button>
              <!-- 非引导模式：完成接入按钮 -->
              <button v-else class="bind-btn bind-btn--primary" type="button" @click="closeBindModal">
                <i class="i-ant-design-check-outlined" />
                <span>完成接入</span>
              </button>
            </div>
          </template>
        </div>
      </div>
    </a-modal>

    <!-- ===== 确定绑定选择弹窗 ===== -->
    <a-modal
      v-model:open="guideBindModalVisible"
      title="确定绑定"
      :width="400"
      :footer="null"
      centered
      :z-index="2100"
      @cancel="guideBindModalVisible = false"
    >
      <div class="guide-bind-modal">
        <p class="guide-bind-modal__desc">请选择绑定结果场景：</p>
        <button class="guide-bind-modal__option" type="button" @click="handleGuideBindSelect('configured')">
          <i class="i-ant-design-video-camera-outlined" />
          <div class="guide-bind-modal__option-body">
            <strong>网关上线且视频已配置</strong>
            <span>网关在线，已接入部分摄像头</span>
          </div>
          <i class="i-ant-design-right-outlined" />
        </button>
        <button class="guide-bind-modal__option" type="button" @click="handleGuideBindSelect('empty')">
          <i class="i-ant-design-inbox-outlined" />
          <div class="guide-bind-modal__option-body">
            <strong>网关上线且视频未配置</strong>
            <span>网关在线，尚未接入摄像头</span>
          </div>
          <i class="i-ant-design-right-outlined" />
        </button>
        <button class="guide-bind-modal__option" type="button" @click="handleGuideBindSelect('offline')">
          <i class="i-ant-design-cloud-server-outlined" />
          <div class="guide-bind-modal__option-body">
            <strong>网关离线</strong>
            <span>网关处于离线状态，需排查</span>
          </div>
          <i class="i-ant-design-right-outlined" />
        </button>
      </div>
    </a-modal>

    <!-- 视频播放弹窗（复用监控墙弹窗结构：左直播 + 右告警/回放） -->
    <a-modal
      v-model:open="playModalVisible"
      :title="playTarget?.name || '视频播放'"
      :footer="null"
      :width="playModalWidth"
      :body-style="{ padding: '0' }"
      wrap-class-name="video-player-modal"
    >
      <div class="player-layout">
        <!-- 左：直播视频 -->
        <div class="player-live">
          <img v-if="playTarget?.thumb" :src="playTarget.thumb" class="player-frame" alt="视频流" />
          <div class="player-overlay">
            <div class="player-controls">
              <i class="i-ant-design-pause-circle-filled player-play-icon" />
              <div class="player-progress">
                <div class="player-progress-bar" />
              </div>
              <span class="player-time">实时</span>
            </div>
          </div>
          <div class="player-info">
            <span class="player-name">{{ playTarget?.name }}</span>
            <span class="player-status" :class="playTarget?.status">
              {{ playTarget?.status === 'online' ? '● LIVE' : '● 离线' }}
            </span>
          </div>
        </div>

        <!-- 右：告警事件 / 录像回放 -->
        <div class="player-side">
          <div class="side-tabs">
            <button
              class="side-tab"
              :class="{ active: playTab === 'alarm' }"
              @click="playTab = 'alarm'"
            >
              <i class="i-ant-design-alert-outlined" />
              <span>告警事件</span>
              <em v-if="allPlayAlarms.length" class="side-tab-badge">{{ allPlayAlarms.filter(a => a.status === '待处理').length }}</em>
            </button>
            <button
              class="side-tab"
              :class="{ active: playTab === 'replay' }"
              @click="playTab = 'replay'"
            >
              <i class="i-ant-design-history-outlined" />
              <span>录像回放</span>
            </button>
          </div>

          <!-- 告警事件 -->
          <div v-if="playTab === 'alarm'" class="side-body">
            <div class="side-search">
              <a-input
                v-model:value="alarmSearchKey"
                class="side-search__input"
                placeholder="搜索告警标题"
                allow-clear
              >
                <template #prefix>
                  <i class="i-ant-design-search-outlined" />
                </template>
              </a-input>
              <a-date-picker
                v-model:value="alarmDateModel"
                class="side-search__date"
                style="width: 100%"
                placeholder="选择日期"
              />
            </div>
            <div class="alarm-list">
              <div
                v-for="row in playAlarms"
                :key="row.id"
                class="alarm-row"
                :class="['lv-' + row.level, 'st-' + row.status]"
              >
                <div class="alarm-row__main">
                  <span class="alarm-title">{{ row.title }}</span>
                  <span class="alarm-time">
                    <i class="i-ant-design-clock-circle-outlined" />
                    {{ row.time }}
                  </span>
                </div>
                <div class="alarm-row__tags">
                  <span class="alarm-level">{{ row.level }}</span>
                  <span class="alarm-status">{{ row.status }}</span>
                </div>
              </div>
              <div v-if="playAlarms.length === 0" class="side-empty">
                <i class="i-ant-design-check-circle-outlined side-empty-icon" />
                <p>该通道暂无告警事件</p>
              </div>
            </div>
          </div>

          <!-- 录像回放 -->
          <div v-else class="side-body">
            <div class="side-search">
              <a-date-picker
                v-model:value="replayDateModel"
                class="side-search__date"
                style="width: 100%"
                placeholder="选择日期"
              />
            </div>
            <div class="replay-list">
              <div
                v-for="clip in replayClips"
                :key="clip.id"
                class="replay-clip"
              >
                <div class="replay-clip__thumb">
                  <img :src="clip.thumb" alt="截帧" draggable="false" />
                  <div class="replay-clip__play">
                    <i class="i-ant-design-caret-right-filled" />
                  </div>
                  <span class="replay-clip__dur">{{ clip.duration }}</span>
                </div>
                <div class="replay-clip__info">
                  <strong class="replay-clip__time">{{ clip.time }}</strong>
                  <span class="replay-clip__label">{{ clip.label }}</span>
                </div>
              </div>
              <div v-if="replayClips.length === 0" class="side-empty">
                <i class="i-ant-design-video-camera-outlined side-empty-icon" />
                <p>所选时段暂无录像</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

/* 新手引导（已移至顶部导航栏） */

.device-page {
  height: 100%;
  background: transparent;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
  color: $text-base;
}

/* ===== KPI ===== */
.kpi-grid {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.kpi-card {
  background: #fff;
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.kpi-card__head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.kpi-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;

  i { font-size: 24px; }
}

.kpi-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.kpi-value {
  font-size: 26px;
  font-weight: 650;
  color: $text-base;
  line-height: 1.1;
  display: flex;
  align-items: baseline;
  gap: 3px;
}

.kpi-unit {
  font-size: 13px;
  font-weight: 400;
  color: $text-muted;
}

.kpi-label {
  font-size: 13px;
  color: $text-secondary;
}

.kpi-detail {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 10px;
  border-top: 1px solid $border-color-card;

  &__item {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: $text-secondary;
  }

  &__dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;

    &.online { background: $color-online; }
    &.offline { background: #bfbfbf; }
  }
}

/* ===== 筛选模式切换 ===== */
.filter-mode {
  display: flex;
  padding: 8px;
  gap: 6px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  &__btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 32px;
    border: 1px solid $border-color-card;
    border-radius: 8px;
    background: #fff;
    color: $text-secondary;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;

    i { font-size: 15px; }

    &:hover {
      border-color: rgba(110, 75, 255, 0.4);
      color: $color-primary;
    }

    &.active {
      border-color: $color-primary;
      background: $color-primary-bg;
      color: $color-primary;
      font-weight: 500;
    }
  }

  &__badge {
    font-style: normal;
    font-size: 11px;
    min-width: 18px;
    height: 18px;
    line-height: 18px;
    text-align: center;
    padding: 0 5px;
    border-radius: 9px;
    background: rgba(110, 75, 255, 0.12);
    color: $color-primary;
  }
}

/* 添加网关虚线卡片 */
.gw-add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px;
  border: 2px dashed $border-color-light;
  border-radius: 10px;
  background: transparent;
  color: $text-muted;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.18s;

  i { font-size: 20px; }

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
    background: $color-primary-bg;
  }
}

/* ===== 区域树 ===== */
.area-tree-wrap {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
}

.area-tree {
  background: transparent;
  font-size: 13px;

  :deep(.ant-tree-treenode) {
    padding: 1px 0;
    width: 100%;
  }

  :deep(.ant-tree-node-content-wrapper) {
    flex: 1;
    border-radius: 8px;
    transition: all 0.15s;

    &:hover {
      background: #faf9ff;
    }
  }

  :deep(.ant-tree-node-selected) {
    background: $color-primary-bg !important;
  }

  :deep(.ant-tree-title) {
    width: 100%;
  }
}

.area-tree-node {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;

  &__label {
    flex: 1;
    min-width: 0;
    font-size: 13px;
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__count {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
    font-size: 12px;
    color: $text-tertiary;
    background: $bg-page;
    padding: 1px 7px;
    border-radius: 9999px;

    i { font-size: 12px; color: $color-primary; }
  }

  &__online {
    color: $color-online;
  }
}

/* 区域空状态 */
.area-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 20px;
  color: $text-muted;

  i { font-size: 36px; opacity: 0.3; }
  p { font-size: 13px; margin: 0; }
}

/* ===== 新增网关弹窗 ===== */
.bind-modal {
  display: flex;
  flex-direction: column;
}

/* 方式切换 tab */
.bind-tabs {
  display: flex;
  border-bottom: 1px solid $border-color-card;
}

.bind-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 14px 8px;
  border: none;
  background: transparent;
  font-size: 12px;
  color: $text-secondary;
  cursor: pointer;
  font-family: inherit;
  position: relative;
  transition: color 0.15s;

  i { font-size: 22px; }

  &:hover { color: $color-primary; }

  &.active {
    color: $color-primary;
    font-weight: 500;

    &::after {
      content: '';
      position: absolute;
      left: 20%;
      right: 20%;
      bottom: -1px;
      height: 2px;
      background: $color-primary;
      border-radius: 1px;
    }
  }
}

/* 绑定内容区 */
.bind-content {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &--wechat {
    gap: 20px;
  }
}

/* 错误横条 */
.bind-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(255, 77, 79, 0.08);
  border: 1px solid rgba(255, 77, 79, 0.3);
  border-radius: 8px;
  color: #ff4d4f;
  font-size: 13px;
  animation: bind-error-shake 0.3s ease;

  i { font-size: 16px; flex-shrink: 0; }
}

/* 尚未购买网关提示 */
.bind-contact {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  margin: 0 24px;
  margin-top: 12px;
  background: rgba(110, 75, 255, 0.05);
  border-radius: 8px;
  font-size: 12.5px;
  color: $text-secondary;
  flex-wrap: wrap;

  > i:first-child {
    font-size: 16px;
    color: $color-primary;
    flex-shrink: 0;
  }

  &__ways {
    display: flex;
    gap: 14px;
    margin-left: auto;
  }

  &__way {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: $text-base;
    font-weight: 500;

    i { font-size: 13px; color: $color-primary; }
  }
}

@keyframes bind-error-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}

/* 输入字段 */
.bind-field {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__label {
    font-size: 13px;
    font-weight: 500;
    color: $text-base;
  }

  &__input {
    width: 100%;
  }

  &__hint {
    margin: 0;
    font-size: 12px;
    color: $text-muted;
    line-height: 1.5;
  }

  &__hint-img {
    width: 100%;
    margin-top: 8px;
    border-radius: 8px;
    border: 1px solid $border-color-card;
  }
}

/* 操作按钮 */
.bind-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 4px;
}

.bind-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 16px;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;

  i { font-size: 14px; }

  &--default {
    border: 1px solid $border-color-light;
    background: #fff;
    color: $text-secondary;
    &:hover { border-color: $color-primary; color: $color-primary; }
  }

  &--primary {
    border: 1px solid $color-primary;
    background: $color-primary;
    color: #fff;
    &:hover:not(:disabled) { background: $color-primary-hover; border-color: $color-primary-hover; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }
}

/* 引导模式：绑定结果下拉框 */
/* ===== 确定绑定选择弹窗 ===== */
.guide-bind-modal {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  &__desc {
    font-size: 13px;
    color: $text-secondary;
    margin: 0 0 4px;
  }

  &__option {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border: 2px solid $border-color-card;
    border-radius: 10px;
    background: #fff;
    cursor: pointer;
    transition: all 0.15s;
    text-align: left;

    > i:first-child {
      font-size: 24px;
      color: $color-primary;
      flex-shrink: 0;
    }

    > i:last-child {
      font-size: 14px;
      color: $text-muted;
      margin-left: auto;
    }

    &:hover {
      border-color: $color-primary;
      background: $color-primary-bg;
    }
  }

  &__option-body {
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong { font-size: 14px; font-weight: 600; color: $text-base; }
    span { font-size: 12px; color: $text-muted; }
  }
}

/* ===== 扫码接入 ===== */
.bind-content--scan {
  min-height: 280px;
  display: flex;
  flex-direction: column;
}

/* 扫码说明页 */
.scan-intro {
  flex: 1;
  display: flex;
  gap: 24px;
  align-items: flex-start;
  padding: 8px 0;

  &__qr {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;

    > i {
      font-size: 24px;
      color: $color-primary;
    }
  }

  &__qr-frame {
    position: relative;
    width: 130px;
    height: 130px;
    background: #fafafa;
    border: 1px solid $border-color-card;
    border-radius: 10px;
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  &__qr-corner {
    position: absolute;
    width: 22px;
    height: 22px;
    border: 3px solid $color-primary;

    &--tl { top: 10px; left: 10px; border-right: none; border-bottom: none; border-radius: 4px 0 0 0; }
    &--tr { top: 10px; right: 10px; border-left: none; border-bottom: none; border-radius: 0 4px 0 0; }
    &--bl { bottom: 10px; left: 10px; border-right: none; border-top: none; border-radius: 0 0 0 4px; }
    &--br { bottom: 10px; right: 10px; border-left: none; border-top: none; border-radius: 0 0 4px 0; }
  }

  &__qr-scanline {
    position: absolute;
    left: 12px;
    right: 12px;
    height: 2px;
    background: linear-gradient(90deg, transparent, $color-primary, transparent);
    animation: scan-line 2s ease-in-out infinite;
  }

  &__qr-dots {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    width: 70px;
    height: 70px;
  }

  &__qr-dot {
    width: 100%;
    aspect-ratio: 1;
    border-radius: 1px;

    &.on { background: $text-base; }
  }

  &__steps {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding-top: 4px;
  }

  &__step {
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }

  &__num {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: $color-primary-bg;
    color: $color-primary;
    font-size: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
      font-size: 13px;
      font-weight: 600;
      color: $text-base;
    }

    span {
      font-size: 12px;
      color: $text-tertiary;
      line-height: 1.5;
    }
  }

  &__hint-img {
    width: 100%;
    max-width: 240px;
    margin-top: 6px;
    border-radius: 8px;
    border: 1px solid $border-color-card;
  }
}

@keyframes scan-line {
  0%, 100% { top: 15%; }
  50% { top: 82%; }
}

/* 扫码成功页 */
.scan-success {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 12px 0;

  &__badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 15px;
    font-weight: 600;
    color: #52c41a;

    i { font-size: 22px; }
  }

  &__info {
    width: 100%;
    background: $bg-page;
    border-radius: 10px;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__label {
    font-size: 13px;
    color: $text-tertiary;
    flex-shrink: 0;
  }

  &__value {
    font-size: 13px;
    color: $text-base;
    font-weight: 500;
    text-align: right;

    &--mono {
      font-family: 'Courier New', monospace;
      font-size: 12.5px;
    }
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: $color-primary;

    i { font-size: 16px; }
  }
}

/* ===== 左右两栏 ===== */
.split {
  flex: 1;
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 8px;
  overflow: hidden;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  strong {
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
  }

  .panel-count {
    font-size: 12px;
    color: $text-muted;
  }
}

/* ===== 左：网关列表 ===== */
.gw-panel {
  background: #fff;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gw-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.gw-item {
  border: 1px solid $border-color-card;
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.18s;
  display: flex;
  align-items: center;
  gap: 12px;

  &:hover {
    border-color: rgba(110, 75, 255, 0.4);
    background: #faf9ff;
  }

  &.is-active {
    border-color: $color-primary;
    background: $color-primary-bg;
  }

  &__icon-box {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    flex-shrink: 0;
    background: $color-primary;

    &.online { background: $color-online; }
    &.offline { background: #bfbfbf; }

    i { font-size: 20px; }
  }

  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  &__status-text {
    font-size: 12px;
    flex-shrink: 0;

    &.online { color: $color-online; }
    &.offline { color: #bfbfbf; }
  }

  &__desc {
    font-size: 12px;
    color: $text-muted;
  }

  &__config {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 12px;
    border: 1px solid $border-color-light;
    border-radius: 6px;
    background: #fff;
    color: $text-secondary;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
    flex-shrink: 0;

    i { font-size: 13px; }
    &:hover {
      border-color: $color-primary;
      color: $color-primary;
    }
  }
}

/* 右侧面板操作区 */
.ch-panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* 更新通道按钮 */
.ch-sync-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid $border-color-light;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;

  i { font-size: 14px; }

  &:hover:not(:disabled) {
    border-color: $color-primary;
    color: $color-primary;
  }

  &:disabled {
    cursor: progress;
    color: $color-primary;
    border-color: $color-primary;
  }
}

.sync-spin {
  animation: sync-spin 1s linear infinite;
}
@keyframes sync-spin {
  to { transform: rotate(360deg); }
}

/* ===== 右：通道面板 ===== */
.ch-panel {
  background: #fff;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.ch-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.ch-panel-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;

  strong {
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .panel-count {
    font-size: 12px;
    color: $text-muted;
    flex-shrink: 0;
  }
}

.ch-search {
  width: 260px;
  flex-shrink: 0;
}

.ch-grid {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
  align-content: start;
}

.ch-card {
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;

  &:hover {
    border-color: $color-primary;
    box-shadow: $shadow-card-active;

    .ch-card__thumb img {
      transform: scale(1.04);
    }

    .ch-card__play {
      opacity: 1;
    }
  }

  &__thumb {
    position: relative;
    aspect-ratio: 16 / 10;
    background: #1a1a2e;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s;
    }
  }

  &__overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5) 0%, transparent 30%);
    pointer-events: none;
  }

  &__top {
    position: absolute;
    top: 8px;
    left: 8px;
    right: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    z-index: 2;
  }

  &__play {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
    z-index: 2;

    i {
      font-size: 26px;
      color: #fff;
    }
  }

  &__body {
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: $text-secondary;
    min-width: 0;
  }

  &__row-icon {
    font-size: 13px;
    color: $text-muted;
    flex-shrink: 0;
  }

  &__gateway,
  &__area {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__area.is-empty {
    color: $text-muted;
    font-style: italic;
  }
}

/* 状态标签 */
.ch-status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 2px 7px;
  border-radius: 3px;
  color: #fff;

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #fff;
  }

  &.online { background: rgba(43, 179, 163, 0.85); }
  &.offline { background: rgba(0, 0, 0, 0.55); }
}

/* PTZ 标签 */
.ch-ptz {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 3px;
  color: #fff;
  background: rgba(19, 194, 194, 0.85);

  i { font-size: 11px; }
}

/* 空状态 */
.ch-empty {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 10px;
  color: $text-muted;

  &__icon {
    font-size: 44px;
    opacity: 0.3;
  }

  p {
    font-size: 13px;
    margin: 0;
  }
}

/* ===== 视频播放弹窗（与监控墙 WallView 一致） ===== */
.player-layout {
  display: flex;
  height: 600px;
  background: #000;
}

.player-live {
  position: relative;
  flex: 2;
  min-width: 0;
  background: #000;
  overflow: hidden;

  .player-frame {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .player-overlay {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.35) 0%, transparent 30%, transparent 70%, rgba(0, 0, 0, 0.6) 100%);

    .player-controls {
      position: absolute;
      bottom: 12px;
      left: 16px;
      right: 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      pointer-events: auto;

      .player-play-icon {
        font-size: 28px;
        color: #fff;
        cursor: pointer;
      }

      .player-progress {
        flex: 1;
        height: 3px;
        background: rgba(255, 255, 255, 0.3);
        border-radius: 2px;
        overflow: hidden;

        .player-progress-bar {
          height: 100%;
          width: 60%;
          background: $color-primary;
          border-radius: 2px;
        }
      }

      .player-time {
        font-size: 12px;
        color: rgba(255, 255, 255, 0.85);
      }
    }
  }

  .player-info {
    position: absolute;
    top: 12px;
    left: 16px;
    display: flex;
    align-items: center;
    gap: 10px;

    .player-name {
      font-size: 14px;
      font-weight: 500;
      color: #fff;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
    }

    .player-status {
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 3px;

      &.online {
        color: #95de64;
        background: rgba(43, 179, 163, 0.2);
      }

      &.offline {
        color: #d9d9d9;
        background: rgba(0, 0, 0, 0.3);
      }
    }
  }
}

.player-side {
  flex: 1;
  min-width: 0;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.side-tabs {
  display: flex;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  .side-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 44px;
    border: none;
    background: transparent;
    font-size: 14px;
    color: $text-secondary;
    cursor: pointer;
    font-family: inherit;
    position: relative;
    transition: color 0.2s;

    i { font-size: 15px; }

    &:hover { color: $color-primary; }

    &.active {
      color: $color-primary;
      font-weight: 500;

      &::after {
        content: '';
        position: absolute;
        left: 16px;
        right: 16px;
        bottom: 0;
        height: 2px;
        background: $color-primary;
        border-radius: 1px;
      }
    }

    .side-tab-badge {
      font-style: normal;
      font-size: 11px;
      min-width: 18px;
      height: 18px;
      line-height: 18px;
      text-align: center;
      padding: 0 5px;
      border-radius: 9px;
      background: #ff4d4f;
      color: #fff;
    }
  }
}

.side-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.side-search {
  display: flex;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
  flex-wrap: wrap;

  .side-search__input {
    flex: 1;
    min-width: 120px;
  }

  .side-search__date {
    flex: 1;
    min-width: 160px;
  }
}

.side-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  gap: 10px;
  color: $text-muted;

  .side-empty-icon {
    font-size: 40px;
    color: $color-online;
    opacity: 0.6;
  }

  p {
    font-size: 13px;
    margin: 0;
  }
}

.alarm-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.alarm-row {
  border: 1px solid $border-color-card;
  border-radius: 8px;
  padding: 10px 12px;
  transition: box-shadow 0.15s;
  display: flex;
  align-items: center;
  gap: 12px;

  &:hover { box-shadow: $shadow-card-active; }

  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .alarm-title {
      font-size: 14px;
      font-weight: 500;
      color: $text-base;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .alarm-time {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: $text-muted;

      i { font-size: 12px; }
    }
  }

  &__tags {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .alarm-level,
  .alarm-status {
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 3px;
  }
}

.alarm-row.lv-紧急 .alarm-level {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}
.alarm-row.lv-警告 .alarm-level {
  color: #d46b08;
  background: rgba(250, 173, 20, 0.12);
}
.alarm-row.lv-提示 .alarm-level {
  color: $color-online;
  background: $color-online-bg;
}
.alarm-row.st-待处理 .alarm-status {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}
.alarm-row.st-已处理 .alarm-status {
  color: $color-online;
  background: $color-online-bg;
}

.replay-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.replay-clip {
  display: flex;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid $border-color-card;
  cursor: pointer;
  transition: background 0.15s;

  &:last-child { border-bottom: none; }

  &:hover {
    .replay-clip__thumb {
      border-color: $color-primary;

      .replay-clip__play {
        background: rgba(110, 75, 255, 0.85);
      }
    }
  }

  &__thumb {
    position: relative;
    width: 120px;
    height: 68px;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    border: 1px solid $border-color-card;
    background: #000;
    transition: border-color 0.15s;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .replay-clip__play {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.15s;

      i {
        font-size: 14px;
        color: #fff;
      }
    }

    .replay-clip__dur {
      position: absolute;
      bottom: 4px;
      right: 4px;
      font-size: 10px;
      padding: 1px 5px;
      border-radius: 2px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
    }
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;

    .replay-clip__time {
      font-size: 13px;
      font-weight: 500;
      color: $text-base;
    }

    .replay-clip__label {
      font-size: 12px;
      color: $text-muted;
    }
  }
}
</style>
