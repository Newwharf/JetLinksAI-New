<script setup lang="ts">
/**
 * 视频设备管理
 * 顶部 4 个 KPI（网关/通道/区域/PTZ，各带在线离线明细）
 * 左侧网关列表 + 右侧该网关下通道卡片
 * 点击通道卡片 -> 弹窗播放（左直播 + 右告警/回放）
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
type TreeSelectInfo = { node: { key: string | number } }
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

// 当前筛选下、命中搜索的通道
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
    return `${activeGateway.value?.name || ''} / 通道列表`
  }
  return `${activeArea.value?.title || ''} / 通道列表`
})

// 选中网关
function selectGateway(id: string) {
  activeGatewayId.value = id
  searchKey.value = ''
}

// 进入网关设备配置页
function gotoGatewayConfig(gw: GatewayDevice, e: Event) {
  e.stopPropagation()
  const routeHref = router.resolve({
    path: `/video/device/gateway/${gw.id}/address`
  }).href
  const url = new URL(routeHref, window.location.origin).href
  window.open(url, '_blank')
  connectingStatus.value = 'pending'
  connectingModalVisible.value = true
}

// ===== 视联设备接入弹窗 =====
const connectingModalVisible = ref(false)
const connectingStatus = ref<'pending' | 'done'>('pending')

function toggleConnectingStatus() {
  connectingStatus.value = connectingStatus.value === 'pending' ? 'done' : 'pending'
}

function goToAlarmFromConnecting() {
  connectingModalVisible.value = false
  router.push('/alarm/rule')
}

// 选中区域
function selectAreaNode(key: string) {
  activeAreaKey.value = key
  searchKey.value = ''
}

function handleAreaTreeSelect(_: unknown, info: TreeSelectInfo) {
  selectAreaNode(String(info.node.key))
}

// 切换筛选模式时重置选中状态
watch(filterMode, (mode) => {
  searchKey.value = ''
  if (mode === 'gateway') {
    if (!activeGatewayId.value) activeGatewayId.value = gateways[0]?.id || ''
  } else {
    // 区域模式默认选中第一个区域
    if (!activeAreaKey.value && areaTree.value.length > 0) {
      activeAreaKey.value = areaTree.value[0].key
    }
  }
})

// ===== 同步通道 =====
const syncingId = ref<string | null>(null)
function syncChannels(gw: GatewayDevice, e?: Event) {
  e?.stopPropagation()
  if (syncingId.value) return
  syncingId.value = gw.id
  setTimeout(() => {
    syncingId.value = null
    message.success(`${gw.name}通道已更新`)
  }, 800)
}

// 当前网关是否正在同步
const isSyncingActive = computed(() => syncingId.value === activeGatewayId.value)
function syncActiveGateway() {
  if (activeGateway.value) syncChannels(activeGateway.value)
}

// ===== 新增网关弹窗 =====
// ===== 可加入项目的网关 =====
const gatewayPoolModalVisible = ref(false)
const unjoinedGateways = ref<GatewayDevice[]>([
  {
    id: 'gw-pool-1',
    name: '研发楼 1F 网关',
    brand: 'JetLinks',
    model: 'Edge-2000',
    sn: 'GW-90368215',
    ip: '192.168.1.118',
    location: '',
    status: 'online'
  },
  {
    id: 'gw-pool-2',
    name: '生产区入口网关',
    brand: 'JetLinks',
    model: 'Edge-2000',
    sn: 'GW-90368242',
    ip: '192.168.1.126',
    location: '',
    status: 'offline'
  }
])

function openGatewayPoolModal() {
  gatewayPoolModalVisible.value = true
}

function closeGatewayPoolModal() {
  gatewayPoolModalVisible.value = false
}

function addExistingGateway(gw: GatewayDevice) {
  gatewayPoolModalVisible.value = false
  pendingJoinGateway.value = gw
  if (gw.status === 'offline') {
    handleGuideBindSelect('offline')
  } else {
    guideBindModalVisible.value = true
  }
}

function refreshGuidePosition() {
  nextTick(() => {
    setTimeout(() => window.dispatchEvent(new Event('guide-position-refresh')), 80)
    setTimeout(() => window.dispatchEvent(new Event('guide-position-refresh')), 220)
    setTimeout(() => window.dispatchEvent(new Event('guide-position-refresh')), 420)
    setTimeout(() => window.dispatchEvent(new Event('guide-position-refresh')), 700)
  })
}

function openBindModalFromPool() {
  gatewayPoolModalVisible.value = false
  openBindModal()
  refreshGuidePosition()
}

function backToGatewayPool() {
  closeBindModal()
  gatewayPoolModalVisible.value = true
  refreshGuidePosition()
}

type BindMethod = 'sn' | 'scan'
const bindModalVisible = ref(false)
const bindMethod = ref<BindMethod>('sn')
const snInput = ref('')
const binding = ref(false)
// 绑定失败错误提示
const bindError = ref('')
// 扫码接入状态：false=未扫码，true=识别成功
const scanSuccess = ref(false)
const scanOutsideStyle = ref<Record<string, string>>({})

function updateScanOutsidePosition() {
  if (!bindModalVisible.value || bindMethod.value !== 'scan' || scanSuccess.value) return
  const modal = document.querySelector('.bind-modal-wrap .ant-modal') as HTMLElement | null
  if (!modal) return

  const rect = modal.getBoundingClientRect()
  const gap = 16
  const buttonWidth = 132
  let left = rect.right + gap
  if (left + buttonWidth > window.innerWidth - gap) {
    left = rect.left - buttonWidth - gap
  }
  left = Math.max(gap, left)

  scanOutsideStyle.value = {
    left: `${left}px`,
    top: `${Math.min(rect.bottom - 96, window.innerHeight - 72)}px`,
    transform: 'none'
  }
}

function openBindModal() {
  bindModalVisible.value = true
  nextTick(() => {
    setTimeout(updateScanOutsidePosition, 120)
    setTimeout(updateScanOutsidePosition, 360)
    setTimeout(updateScanOutsidePosition, 800)
    setTimeout(updateScanOutsidePosition, 1200)
  })
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
  nextTick(() => {
    setTimeout(updateScanOutsidePosition, 120)
    setTimeout(updateScanOutsidePosition, 360)
    setTimeout(updateScanOutsidePosition, 800)
    setTimeout(updateScanOutsidePosition, 1200)
  })
}

/**
 * 绑定网关
 * 模拟：输入 "1" 成功，输入 "2" 失败
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
    return // 扫码接入不走这个分支
  }

  binding.value = true
  setTimeout(() => {
    binding.value = false
    if (inputValue === '1') {
      // 网关识别成功后进入绑定结果场景选择，普通流程和新手引导共用
      message.success('网关识别成功')
      openGuideBindModal()
    } else {
      // 网关绑定失败
      bindError.value = errorTip
    }
  }, 800)
}

// ===== 引导绑定结果场景 =====
const GUIDE_GW_ID = 'gw-guide'

type GuideBindResult = 'configured' | 'empty' | 'offline'

// 引导绑定弹窗
const guideBindModalVisible = ref(false)
const pendingJoinGateway = ref<GatewayDevice | null>(null)

/** 打开绑定结果选择 */
function openGuideBindModal() {
  closeBindModal()
  guideBindModalVisible.value = true
}

/** 根据绑定结果进入对应引导弹窗 */
function handleGuideBindSelect(result: GuideBindResult) {
  guideBindModalVisible.value = false
  closeBindModal()
  const selectedGateway = pendingJoinGateway.value
  const targetGatewayId = selectedGateway?.id || GUIDE_GW_ID

  // 先移除同 id 网关，避免重复
  const idx = gateways.findIndex(g => g.id === targetGatewayId)
  if (idx >= 0) gateways.splice(idx, 1)

  // 网关状态
  const isOnline = result === 'configured' || result === 'empty'
  if (selectedGateway) {
    gateways.push({ ...selectedGateway, status: isOnline ? 'online' : 'offline' })
    unjoinedGateways.value = unjoinedGateways.value.filter(g => g.id !== selectedGateway.id)
  } else {
  gateways.push({
    id: GUIDE_GW_ID,
    name: '新接入网关',
    brand: 'JetLinks',
    model: 'Edge-2000',
    sn: 'GW-' + Math.floor(10000000 + Math.random() * 89999999),
    ip: '192.168.1.108',
    location: '',
    status: isOnline ? 'online' : 'offline',
  })

  // 根据场景更新摄像头通道
  }
  if (result === 'configured') {
    const camThumbs = [channels.value[0]?.thumb, channels.value[1]?.thumb, channels.value[2]?.thumb]
    const guideChannels: VideoChannel[] = [
      { id: 'ch-guide-1', name: '前门摄像头', thumb: camThumbs[0] || channels.value[0]?.thumb || '', gatewayId: GUIDE_GW_ID, areaPath: ['物联网产业园区', 'E 栋', '1F', '公共区域'], status: 'online', ptz: false },
      { id: 'ch-guide-2', name: '大厅摄像头', thumb: camThumbs[1] || channels.value[1]?.thumb || '', gatewayId: GUIDE_GW_ID, areaPath: ['物联网产业园区', 'E 栋', '1F', '公共区域'], status: 'online', ptz: false },
      { id: 'ch-guide-3', name: '走廊摄像头', thumb: camThumbs[2] || channels.value[2]?.thumb || '', gatewayId: GUIDE_GW_ID, areaPath: [], status: 'offline', ptz: false },
    ]
    const oldChannelIdx: number[] = []
    channels.value.forEach((c, i) => { if (c.gatewayId === targetGatewayId) oldChannelIdx.unshift(i) })
    oldChannelIdx.forEach(i => channels.value.splice(i, 1))
    channels.value.push(...guideChannels.map((ch, index) => ({
      ...ch,
      id: `ch-${targetGatewayId}-${index + 1}`,
      gatewayId: targetGatewayId
    })))
  }

  // 无设备或离线场景清空通道
  if (result !== 'configured') {
    const chIdx: number[] = []
    channels.value.forEach((c, i) => { if (c.gatewayId === targetGatewayId) chIdx.unshift(i) })
    chIdx.forEach(i => channels.value.splice(i, 1))
  }

  // 选中网关
  activeGatewayId.value = targetGatewayId
  appStore.guideGatewayId = targetGatewayId
  appStore.guideBindResult = result
  pendingJoinGateway.value = null

  message.success(result === 'offline' ? '网关已加入，当前离线' : '网关已加入项目')
}

// ===== 播放弹窗 =====
const playModalVisible = ref(false)
const playTarget = ref<VideoChannel | null>(null)
function playChannel(ch: VideoChannel) {
  playTarget.value = ch
  playTab.value = 'alarm'
  playModalVisible.value = true
}

// 播放弹窗宽度：屏幕 2/3
const viewportWidth = ref(window.innerWidth)
function onResize() {
  viewportWidth.value = window.innerWidth
  updateScanOutsidePosition()
}
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
const playModalWidth = computed(() => Math.floor(viewportWidth.value * 2 / 3))

// ===== 告警 / 回放 tab =====
const playTab = ref<'alarm' | 'replay'>('alarm')

type AlarmLevel = 'urgent' | 'warning' | 'info'
type AlarmStatus = 'pending' | 'done'

interface PlayAlarmRow {
  id: string
  level: AlarmLevel
  title: string
  time: string
  status: AlarmStatus
}

function alarmLevelText(level: AlarmLevel) {
  return level === 'urgent' ? '紧急' : level === 'warning' ? '警告' : '提示'
}

function alarmStatusText(status: AlarmStatus) {
  return status === 'pending' ? '待处理' : '已处理'
}

const allPlayAlarms = computed<PlayAlarmRow[]>(() => {
  const name = playTarget.value?.name || ''
  if (name.includes('门') || name.includes('入口')) {
    return [
      { id: 'a1', level: 'urgent', title: '人员闯入', time: '2026-07-07 09:12', status: 'pending' },
      { id: 'a2', level: 'warning', title: '人员徘徊', time: '2026-07-07 08:40', status: 'pending' },
      { id: 'a3', level: 'info', title: '物品遗留', time: '2026-07-06 18:22', status: 'done' }
    ]
  }
  if (name.includes('车库') || name.includes('停车')) {
    return [
      { id: 'a4', level: 'warning', title: '车辆违停', time: '2026-07-07 10:05', status: 'pending' },
      { id: 'a5', level: 'urgent', title: '烟火疑似', time: '2026-07-07 07:30', status: 'done' },
      { id: 'a8', level: 'info', title: '物品遗留', time: '2026-07-06 11:20', status: 'done' }
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
    { id: 'r1', time: '2026-07-07 09:10-09:15', label: '前门摄像头录像片段', thumb, duration: '5 分钟' },
    { id: 'r2', time: '2026-07-07 08:38-08:45', label: '大厅摄像头录像片段', thumb, duration: '7 分钟' },
    { id: 'r3', time: '2026-07-07 06:00-06:10', label: '入口摄像头录像片段', thumb, duration: '10 分钟' },
    { id: 'r4', time: '2026-07-06 18:20-18:25', label: '走廊摄像头录像片段', thumb, duration: '5 分钟' },
    { id: 'r5', time: '2026-07-06 14:00-14:15', label: '停车场摄像头录像片段', thumb, duration: '15 分钟' }
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

void [
  gatewayImg,
  gotoGatewayConfig,
  toggleConnectingStatus,
  goToAlarmFromConnecting,
  isSyncingActive,
  syncActiveGateway,
  closeGatewayPoolModal,
  addExistingGateway,
  openBindModalFromPool,
  backToGatewayPool,
  switchMethod,
  handleBind,
  openGuideBindModal,
  playChannel,
  playModalWidth,
  playAlarms,
  replayClips,
]
</script>

<template>
  <div class="device-page">
    <!-- 妞ゅ爼鍎?KPI -->
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

    <!-- 主体内容 -->
    <section class="split">
      <!-- 左侧网关/区域筛选 -->
      <aside class="gw-panel">
        <!-- 筛选模式 -->
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

        <!-- ===== 网关列表 ===== -->
        <template v-if="filterMode === 'gateway'">
          <div class="gw-list">
            <div
              v-for="gw in gateways"
              :key="gw.id"
              class="gw-item"
              :class="{ 'is-active': gw.id === activeGatewayId }"
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
                title="配置该网关的摄像头"
                @click="gotoGatewayConfig(gw, $event)"
              >
                <i class="i-ant-design-setting-outlined" />
                <span>配置设备</span>
              </button>
            </div>

            <!-- 新增网关 -->
            <button
              v-if="false"
              class="gw-add-card"
              type="button"
              @click="openGatewayPoolModal"
            >
              <i class="i-ant-design-plus-outlined" />
              <span>新增网关</span>
            </button>
          </div>
        </template>

        <!-- ===== 区域列表 ===== -->
        <template v-else>
          <div class="panel-head">
            <strong>区域筛选</strong>
          </div>
          <div class="area-tree-wrap">
            <a-tree
              v-model:expandedKeys="areaExpandedKeys"
              :tree-data="areaTree"
              :selected-keys="activeAreaKey ? [activeAreaKey] : []"
              :block-node="true"
              :show-line="false"
              class="area-tree"
              @select="handleAreaTreeSelect"
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
              <p>暂无区域数据</p>
            </div>
          </div>
        </template>
      </aside>

      <!-- 通道列表 -->
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
            <!-- 更新通道：同步当前网关 -->
            <button
              v-if="filterMode === 'gateway'"
              class="ch-sync-btn"
              type="button"
              :disabled="isSyncingActive"
              title="同步当前网关通道"
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
                <span v-if="ch.ptz" class="ch-ptz" title="支持 PTZ 控制">
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
                  :title="ch.areaPath.length > 0 ? areaText(ch.areaPath) : '未绑定区域'"
                >
                  {{ ch.areaPath.length > 0 ? areaText(ch.areaPath) : '未绑定区域' }}
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
      v-model:open="gatewayPoolModalVisible"
      title="新增网关"
      :width="560"
      :footer="null"
      centered
      :body-style="{ padding: '0' }"
      :mask-closable="true"
      :z-index="1000"
      wrap-class-name="gateway-pool-modal-wrap"
      @cancel="closeGatewayPoolModal"
    >
      <div class="gateway-pool">
        <div class="gateway-pool__header">
          <strong>可加入当前项目的网关</strong>
          <span>这些网关已添加到账号，但还没有加入当前项目。</span>
        </div>

        <div v-if="unjoinedGateways.length > 0" class="gateway-pool__list">
          <div v-for="gw in unjoinedGateways" :key="gw.id" class="gateway-pool__row">
            <img :src="gatewayImg" class="gateway-pool__img" alt="网关设备" draggable="false" />
            <div class="gateway-pool__main">
              <div class="gateway-pool__top">
                <strong>{{ gw.name }}</strong>
                <span class="gateway-pool__status" :class="gw.status">
                  <i />
                  {{ gw.status === 'online' ? '在线' : '离线' }}
                </span>
              </div>
              <div class="gateway-pool__meta">
                <span>序列号 {{ gw.sn }}</span>
              </div>
            </div>
            <button class="gateway-pool__join" type="button" @click="addExistingGateway(gw)">加入项目</button>
          </div>
        </div>

        <div v-else class="gateway-pool__empty">
          <i class="i-ant-design-cloud-server-outlined" />
          <span>暂无可加入当前项目的网关</span>
        </div>

        <button class="gateway-pool__add" type="button" @click="openBindModalFromPool">
          <span class="gateway-pool__add-icon">
            <i class="i-ant-design-plus-outlined" />
          </span>
          <span class="gateway-pool__add-text">
            <strong>新增网关</strong>
            <small>通过 SN 码或扫码接入新的网关设备</small>
          </span>
          <i class="i-ant-design-arrow-right-outlined gateway-pool__add-arrow" />
        </button>
      </div>
    </a-modal>

    <a-modal
      v-model:open="bindModalVisible"
      title="新增网关"
      :width="480"
      :footer="null"
      centered
      :body-style="{ padding: '0' }"
      :mask-closable="true"
      :z-index="1000"
      wrap-class-name="bind-modal-wrap"
      @cancel="closeBindModal"
    >
      <div class="bind-modal">
        <!-- 绑定方式 tab -->
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
          <!-- 联系商务 -->
          <div class="bind-contact">
            <i class="i-ant-design-customer-service-outlined" />
            <span>如需购买网关，请联系商务或项目负责人</span>
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
          <div class="bind-actions">
            <button class="bind-btn bind-btn--default" type="button" @click="backToGatewayPool">返回</button>
            <button class="bind-btn bind-btn--primary" type="button" :disabled="binding || !snInput.trim()" @click="handleBind">
              <i v-if="binding" class="i-ant-design-loading-outlined sync-spin" />
              <span>{{ binding ? '识别中' : '下一步' }}</span>
            </button>
          </div>
        </div>

        <!-- 扫码接入 -->
        <div v-if="bindMethod === 'scan'" class="bind-content bind-content--scan">
          <!-- 扫码说明 -->
          <template v-if="!scanSuccess">
            <div class="scan-intro">
              <!-- 扫码步骤 -->
              <div class="scan-intro__steps">
                <div class="scan-intro__step">
                  <span class="scan-intro__num">1</span>
                  <div class="scan-intro__text">
                    <strong>扫描网关二维码</strong>
                    <span>使用微信或浏览器扫描网关背面的二维码</span>
                    <img :src="gatewayImg" class="scan-intro__hint-img" alt="网关背面二维码位置示意" draggable="false" />
                  </div>
                </div>
                <div class="scan-intro__step">
                  <span class="scan-intro__num">2</span>
                  <div class="scan-intro__text">
                    <strong>登录账号</strong>
                    <span>跳转到登录页后，请使用当前平台账号完成授权</span>
                  </div>
                </div>
                <div class="scan-intro__step">
                  <span class="scan-intro__num">3</span>
                  <div class="scan-intro__text">
                    <strong>识别成功</strong>
                    <span>系统自动识别网关并返回识别结果</span>
                  </div>
                </div>
              </div>
            </div>
            <!-- 联系商务 -->
            <div class="bind-contact">
              <i class="i-ant-design-customer-service-outlined" />
              <span>如需购买网关，请联系商务或项目负责人</span>
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
            <div class="bind-actions">
              <button class="bind-btn bind-btn--default" type="button" @click="backToGatewayPool">返回</button>
            </div>
          </template>

          <!-- 扫码成功 -->
          <template v-else>
            <div class="scan-success">
              <!-- 识别成功状态 -->
              <div class="scan-success__badge">
                <i class="i-ant-design-check-circle-filled" />
                <span>网关识别成功</span>
              </div>
              <!-- 网关信息 -->
              <div class="scan-success__info">
                <img :src="gatewayImg" class="scan-success__img" alt="网关设备" draggable="false" />
                <div class="scan-success__details">
                  <div class="scan-success__row">
                    <span class="scan-success__label">网关名称</span>
                    <span class="scan-success__value">JetLinks 边缘网关</span>
                  </div>
                  <div class="scan-success__row">
                    <span class="scan-success__label">网关序列号</span>
                    <span class="scan-success__value scan-success__value--mono">GW-58740736</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="bind-actions">
              <button class="bind-btn bind-btn--primary" type="button" @click="openGuideBindModal">
                <span>下一步</span>
              </button>
            </div>
          </template>
        </div>
      </div>
    </a-modal>

    <div
      v-if="bindModalVisible && bindMethod === 'scan' && !scanSuccess"
      class="scan-outside-actions"
      :style="scanOutsideStyle"
    >
      <button class="scan-outside-actions__btn" type="button" @click="scanSuccess = true">
        <i class="i-ant-design-check-outlined" />
        <span>扫码成功</span>
      </button>
    </div>

    <!-- ===== 绑定结果选择 ===== -->
    <a-modal
      v-model:open="guideBindModalVisible"
      title="确认绑定"
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
            <strong>网关已接入且视频已配置</strong>
            <span>网关在线，已接入部分摄像头</span>
          </div>
          <i class="i-ant-design-right-outlined" />
        </button>
        <button class="guide-bind-modal__option" type="button" @click="handleGuideBindSelect('empty')">
          <i class="i-ant-design-inbox-outlined" />
          <div class="guide-bind-modal__option-body">
            <strong>网关已接入且视频未配置</strong>
            <span>网关在线，尚未接入摄像头</span>
          </div>
          <i class="i-ant-design-right-outlined" />
        </button>
        <button v-if="!pendingJoinGateway" class="guide-bind-modal__option" type="button" @click="handleGuideBindSelect('offline')">
          <i class="i-ant-design-cloud-server-outlined" />
          <div class="guide-bind-modal__option-body">
            <strong>网关离线</strong>
            <span>网关处于离线状态，需排查</span>
          </div>
          <i class="i-ant-design-right-outlined" />
        </button>
      </div>
    </a-modal>

    <!-- 视频播放弹窗 -->
    <a-modal
      v-model:open="playModalVisible"
      :title="playTarget?.name || '视频预览'"
      :footer="null"
      :width="playModalWidth"
      :body-style="{ padding: '0' }"
      wrap-class-name="video-player-modal"
    >
      <div class="player-layout">
        <!-- 左侧直播 -->
        <div class="player-live">
          <img v-if="playTarget?.thumb" :src="playTarget.thumb" class="player-frame" alt="视频流" />
          <div class="player-overlay">
            <div class="player-controls">
              <i class="i-ant-design-pause-circle-filled player-play-icon" />
              <div class="player-progress">
                <div class="player-progress-bar" />
              </div>
              <span class="player-time">实时画面</span>
            </div>
          </div>
          <div class="player-info">
            <span class="player-name">{{ playTarget?.name }}</span>
            <span class="player-status" :class="playTarget?.status">
              {{ playTarget?.status === 'online' ? 'LIVE' : '离线' }}
            </span>
          </div>
        </div>

        <!-- 右侧告警 / 回放 -->
        <div class="player-side">
          <div class="side-tabs">
            <button
              class="side-tab"
              :class="{ active: playTab === 'alarm' }"
              @click="playTab = 'alarm'"
            >
              <i class="i-ant-design-alert-outlined" />
              <span>告警事件</span>
              <em v-if="allPlayAlarms.length" class="side-tab-badge">{{ allPlayAlarms.filter(a => a.status === 'pending').length }}</em>
            </button>
            <button
              class="side-tab"
              :class="{ active: playTab === 'replay' }"
              @click="playTab = 'replay'"
            >
              <i class="i-ant-design-history-outlined" />
              <span>回放记录</span>
            </button>
          </div>

          <!-- 告警事件 -->
          <div v-if="playTab === 'alarm'" class="side-body">
            <div class="side-search">
              <a-input
                v-model:value="alarmSearchKey"
                class="side-search__input"
                placeholder="搜索告警事件"
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
                  <span class="alarm-level">{{ alarmLevelText(row.level) }}</span>
                  <span class="alarm-status">{{ alarmStatusText(row.status) }}</span>
                </div>
              </div>
              <div v-if="playAlarms.length === 0" class="side-empty">
                <i class="i-ant-design-check-circle-outlined side-empty-icon" />
                <p>暂无告警事件</p>
              </div>
            </div>
          </div>

          <!-- 回放记录 -->
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
                  <img :src="clip.thumb" alt="回放片段" draggable="false" />
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
                <p>暂无回放记录</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- ===== 视联设备接入中 ===== -->
    <a-modal
      v-model:open="connectingModalVisible"
      :title="null"
      :footer="null"
      :width="380"
      centered
      :closable="false"
      :mask-closable="false"
      :z-index="1500"
      wrap-class-name="connecting-modal-wrap"
    >
      <div class="connecting-modal">
        <div v-if="connectingStatus === 'pending'" class="connecting-modal__spinner">
          <span class="connecting-modal__ring" />
          <span class="connecting-modal__ring connecting-modal__ring--2" />
          <i class="i-ant-design-video-camera-outlined connecting-modal__icon" />
        </div>
        <div v-else class="connecting-modal__done-icon">
          <i class="i-ant-design-check-circle-filled" />
        </div>

        <template v-if="connectingStatus === 'pending'">
          <h3 class="connecting-modal__title">视联设备接入中</h3>
          <p class="connecting-modal__desc">正在同步网关下的摄像头信息，请稍候...</p>
        </template>

        <template v-else>
          <h3 class="connecting-modal__title">视联设备接入完成</h3>
          <p class="connecting-modal__desc">已完成视联设备接入，建议继续新增告警规则。</p>
          <div class="connecting-modal__actions">
            <button class="connecting-modal__btn" type="button" @click="connectingModalVisible = false">知道了</button>
            <button class="connecting-modal__btn connecting-modal__btn--primary" type="button" @click="goToAlarmFromConnecting">
              <i class="i-ant-design-bell-outlined" />
              去新增告警规则
            </button>
          </div>
        </template>
      </div>
    </a-modal>

    <div v-if="connectingModalVisible" class="connecting-switch">
      <button class="connecting-switch__btn" type="button" @click="toggleConnectingStatus">
        {{ connectingStatus === 'pending' ? '模拟接入完成' : '切换为接入中' }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

/* 页面布局 */

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

/* ===== 绛涙ā寮忓垏?===== */
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

/* 新增网关入口 */
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

/* ===== 区域 ===== */
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
.gateway-pool {
  padding: 20px 24px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &__header {
    display: flex;
    flex-direction: column;
    gap: 4px;

    strong {
      font-size: 15px;
      color: $text-base;
      font-weight: 600;
    }

    span {
      font-size: 13px;
      color: $text-tertiary;
      line-height: 1.5;
    }
  }

  &__list {
    display: flex;
    flex-direction: column;
    border-top: 1px solid $border-color-card;
    border-bottom: 1px solid $border-color-card;
  }

  &__row {
    min-height: 86px;
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid $border-color-card;

    &:last-child {
      border-bottom: none;
    }
  }

  &__img {
    width: 72px;
    height: 54px;
    object-fit: contain;
    flex-shrink: 0;
  }

  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  &__top {
    display: flex;
    align-items: center;
    gap: 8px;

    strong {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 14px;
      color: $text-base;
      font-weight: 600;
    }
  }

  &__status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 22px;
    padding: 0 8px;
    border-radius: 999px;
    font-size: 12px;
    flex-shrink: 0;

    i {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    &.online {
      color: $color-online;
      background: rgba(43, 179, 163, 0.1);
    }

    &.offline {
      color: #ff4d4f;
      background: rgba(255, 77, 79, 0.08);
    }
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 12.5px;
    color: $text-tertiary;
  }

  &__join {
    height: 32px;
    padding: 0 14px;
    border-radius: 6px;
    border: 1px solid $color-primary;
    background: #fff;
    color: $color-primary;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;

    &:hover {
      background: $color-primary-bg;
    }
  }

  &__empty {
    height: 112px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: $text-muted;
    border-top: 1px solid $border-color-card;
    border-bottom: 1px solid $border-color-card;

    i {
      font-size: 28px;
      opacity: 0.36;
    }

    span {
      font-size: 13px;
    }
  }

  &__add {
    min-height: 72px;
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 14px 16px;
    border: 1px dashed rgba(110, 75, 255, 0.45);
    border-radius: 8px;
    background: linear-gradient(180deg, rgba(110, 75, 255, 0.07), rgba(110, 75, 255, 0.03));
    color: $text-base;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: $color-primary;
      background: $color-primary-bg;
    }
  }

  &__add-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: $color-primary;
    color: #fff;
    flex-shrink: 0;

    i {
      font-size: 18px;
    }
  }

  &__add-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;

    strong {
      font-size: 14px;
      color: $text-base;
      font-weight: 600;
    }

    small {
      font-size: 12.5px;
      color: $text-tertiary;
    }
  }

  &__add-arrow {
    color: $color-primary;
    font-size: 16px;
  }
}

.bind-modal {
  display: flex;
  flex-direction: column;
}

/* 绑定方式 tab */
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

/* 缁戝畾鍐?*/
.bind-content {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &--wechat {
    gap: 20px;
  }
}

/* 错误提示 */
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

/* 联系商务 */
.bind-contact {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
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

/* 扫码说明 */
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

/* 扫码成功 */
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

/* 引导绑定结果选择 */
/* ===== 绑定结果选择 ===== */
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

/* 扫码步骤 */
.scan-intro {
  flex: 1;
  display: block;
  padding: 4px 0;

  &__steps {
    display: flex;
    flex-direction: column;
    gap: 18px;
    width: 100%;
  }

  &__step {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    width: 100%;
    padding: 0;
    text-align: left;
  }

  &__num {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
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
    align-items: flex-start;
    gap: 4px;
    min-width: 0;
    flex: 1;
    width: 100%;

    strong {
      font-size: 14px;
      font-weight: 600;
      color: $text-base;
    }

    span {
      font-size: 13px;
      color: $text-tertiary;
      line-height: 1.5;
    }
  }

  &__hint-img {
    width: 100%;
    height: 136px;
    margin-top: 8px;
    border-radius: 8px;
    border: 1px solid $border-color-card;
    background: #fff;
    object-fit: contain;
  }
}

/* 扫码成功 */
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
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 14px;
    border: 1px solid $border-color-card;
  }

  &__img {
    flex-shrink: 0;
    width: 96px;
    height: 72px;
    object-fit: contain;
    border-radius: 8px;
    background: #fff;
    border: 1px solid $border-color-card;
  }

  &__details {
    flex: 1;
    min-width: 0;
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

.scan-outside-actions {
  position: fixed;
  z-index: 2101;

  &__btn {
    height: 40px;
    padding: 0 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px solid $color-primary;
    border-radius: 20px;
    background: $color-primary;
    color: #fff;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    box-shadow: 0 10px 26px rgba(110, 75, 255, 0.24);
    transition: all 0.15s ease;

    i {
      font-size: 15px;
    }

    &:hover {
      background: $color-primary-hover;
      border-color: $color-primary-hover;
      box-shadow: 0 12px 30px rgba(110, 75, 255, 0.3);
    }
  }
}

/* ===== 瀹革箑褰告稉銈嗙埉 ===== */
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

/* ===== 左侧网关列表 ===== */
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

/* 右侧面板操作 */
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

/* ===== 通道卡片 ===== */
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

/* 鐘舵爣?*/
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

/* PTZ 控制 */
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

/* 绌虹姸?*/
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

/* ===== 视频播放弹窗 ===== */
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

.alarm-row.lv-urgent .alarm-level {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}
.alarm-row.lv-warning .alarm-level {
  color: #d46b08;
  background: rgba(250, 173, 20, 0.12);
}
.alarm-row.lv-info .alarm-level {
  color: $color-online;
  background: $color-online-bg;
}
.alarm-row.st-pending .alarm-status {
  color: #ff4d4f;
  background: rgba(255, 77, 79, 0.1);
}
.alarm-row.st-done .alarm-status {
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

/* ===== 视联设备接入中 ===== */
.connecting-modal {
  padding: 32px 28px 24px;
  text-align: center;

  &__spinner {
    position: relative;
    width: 64px;
    height: 64px;
    margin: 0 auto 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 3px solid rgba(110, 75, 255, 0.15);
    border-top-color: $color-primary;
    animation: connecting-spin 1s linear infinite;

    &--2 {
      inset: 8px;
      border: 2px solid rgba(110, 75, 255, 0.1);
      border-bottom-color: rgba(110, 75, 255, 0.5);
      animation-duration: 1.5s;
      animation-direction: reverse;
    }
  }

  &__icon {
    position: relative;
    z-index: 1;
    font-size: 24px;
    color: $color-primary;
  }

  &__done-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: rgba(82, 196, 26, 0.1);

    i {
      font-size: 38px;
      color: #52c41a;
    }
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: $text-base;
    margin: 0 0 8px;
  }

  &__desc {
    font-size: 13px;
    color: $text-secondary;
    line-height: 1.6;
    margin: 0 0 20px;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 28px;
    border: 1px solid $border-color-light;
    border-radius: 6px;
    background: #fff;
    color: $text-secondary;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
    &:hover { border-color: $color-primary; color: $color-primary; }

    &--primary {
      border-color: $color-primary;
      background: $color-primary;
      color: #fff;

      &:hover {
        border-color: $color-primary-hover;
        background: $color-primary-hover;
        color: #fff;
      }
    }
  }

  &__actions {
    display: flex;
    justify-content: center;
    gap: 8px;
  }
}

.connecting-switch {
  position: fixed;
  left: 50%;
  top: calc(50% + 250px);
  z-index: 1600;
  transform: translateX(-50%);

  &__btn {
    height: 36px;
    padding: 0 18px;
    border: 1px solid $color-primary;
    border-radius: 18px;
    background: #fff;
    color: $color-primary;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    box-shadow: 0 8px 24px rgba(17, 20, 24, 0.14);
    transition: all 0.15s ease;

    &:hover {
      background: $color-primary-bg;
      box-shadow: 0 10px 28px rgba(110, 75, 255, 0.18);
    }
  }
}

@keyframes connecting-spin {
  to { transform: rotate(360deg); }
}
</style>
