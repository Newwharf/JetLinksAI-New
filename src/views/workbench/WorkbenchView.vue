<script setup lang="ts">
/**
 * SaaS 工作台 · 欢迎首页（落地页）
 * 全屏渐变背景 + 居中 AI 对话框 + 下方两个快捷入口卡片 + 我的项目/网关列表
 */
import chatHeadImg from '@/assets/saas/chat_head.png'
import chatSendImg from '@/assets/saas/chat_send.png'
import newProjectImg from '@/assets/saas/newproject.png'
import newGatewayImg from '@/assets/saas/newgateway.png'
import bgImg from '@/assets/saas/backgroup.png'
import gatewayImg from '@/assets/cameras/gateway.png'
import gatewayPic1 from '@/assets/gatewaypic/gatew1.png'
import gatewayPic2 from '@/assets/gatewaypic/gatew2.png'
import gatewayPic3 from '@/assets/gatewaypic/gatew3.png'
import gatewayPic4 from '@/assets/gatewaypic/gatew4.png'
import { projects, gateways, type Gateway, type Project } from './workbench.mock'
import ProjectWizardModal from './ProjectWizardModal.vue'
import { useAppStore } from '@/stores/app'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'

const appStore = useAppStore()
const router = useRouter()

// 进入项目：切到安防场景 + 跳仪表盘
function enterProject() {
  appStore.setScenario('security')
  appStore.requestProjectWelcome()
  router.push('/dashboard')
}

// AI 输入框（纯展示）
const aiInput = ref('')

// ===== 新建项目向导 =====
const wizardOpen = ref(false)

function handleSubmit(project: Project) {
  // 项目加入列表首位
  projects.value.unshift(project)
  createdProject.value = project
  projectGuideOpen.value = true
}

// ===== 项目创建后引导 =====
const projectGuideOpen = ref(false)
const createdProject = ref<Project | null>(null)

function closeProjectGuide() {
  projectGuideOpen.value = false
  createdProject.value = null
}

function goAccessGatewayFromGuide() {
  projectGuideOpen.value = false
  gatewayFilter.value = 'unjoined'
  gatewayProjectId.value = undefined
  appStore.startWorkbenchGatewayGuide()
  nextTick(() => window.dispatchEvent(new Event('guide-position-refresh')))
}

// ===== 我的项目 / 我的网关 列表区 =====
type ListTab = 'project' | 'gateway'
const listTab = ref<ListTab>('project')

function switchListTab(tab: ListTab) {
  listTab.value = tab
  if (tab === 'gateway' && appStore.guideStep === 'workbench-gateway-tab') {
    nextTick(() => {
      appStore.setGuideStep('workbench-gateway-access')
      window.dispatchEvent(new Event('guide-position-refresh'))
    })
  }
}

// 网关筛选条件：全部 / 已加入 / 未加入（按项目走下拉）
type GatewayFilter = 'all' | 'joined' | 'unjoined'
const gatewayFilter = ref<GatewayFilter>('all')

// 各筛选条件数量
const gatewayCounts = computed(() => ({
  all: gateways.value.length,
  joined: gateways.value.filter(g => g.projectId !== null).length,
  unjoined: gateways.value.filter(g => g.projectId === null).length
}))

// 按项目筛选时选中的项目 id（下拉）
const gatewayProjectId = ref<string | undefined>(undefined)

// 下拉变化：选了项目 → 按 projectId 过滤；清空 → 回到 all
function onProjectChange() {
  if (gatewayProjectId.value) {
    gatewayFilter.value = 'all' // 不高亮三个胶囊，由下拉主导
  }
}

// 过滤后的网关列表
const filteredGateways = computed(() => {
  // 项目下拉优先
  if (gatewayProjectId.value) {
    return gateways.value.filter(g => g.projectId === gatewayProjectId.value)
  }
  switch (gatewayFilter.value) {
    case 'joined':
      return gateways.value.filter(g => g.projectId !== null)
    case 'unjoined':
      return gateways.value.filter(g => g.projectId === null)
    default:
      return gateways.value
  }
})

const gatewayNameMap: Record<string, string> = {
  g1: '办公室场景网关',
  g2: '办公室备用网关',
  g3: '商场安防网关',
  g4: '商场北区网关',
  g5: '公寓通行网关',
  g6: '养老看护网关',
  g7: '未加入离线网关',
  g8: '未加入在线网关'
}

const gatewaySerialMap: Record<string, string> = {
  g1: 'GT23923011202',
  g2: 'GT23923011203',
  g3: 'GT23923011204',
  g4: 'GT23923011205',
  g5: 'GT23923011206',
  g6: 'GT23923011207',
  g7: 'GT23923011208',
  g8: 'GT23923011209'
}

const gatewayPics = [gatewayPic1, gatewayPic2, gatewayPic3, gatewayPic4]

function getGatewayPic(gateway: Gateway) {
  const seed = [...gateway.id].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return gatewayPics[seed % gatewayPics.length]
}

// 使用率颜色档位
function usageColor(v: number): string {
  if (v >= 80) return '#ff4d4f'
  if (v >= 60) return '#faad14'
  return '#52c41a'
}

// ===== 未加入网关加入项目 =====
const joinProjectOpen = ref(false)
const joiningGateway = ref<Gateway | null>(null)
const joinProjectId = ref<string | undefined>(undefined)

function openJoinProjectModal(gateway: Gateway) {
  if (gateway.projectId) return
  joiningGateway.value = gateway
  joinProjectId.value = undefined
  joinProjectOpen.value = true
}

function closeJoinProjectModal() {
  joinProjectOpen.value = false
  joiningGateway.value = null
  joinProjectId.value = undefined
}

function confirmJoinProject() {
  if (!joiningGateway.value || !joinProjectId.value) return
  const project = projects.value.find(p => p.id === joinProjectId.value)
  if (!project) return

  joiningGateway.value.projectId = project.id
  joiningGateway.value.projectName = project.name
  // 加入项目后系统自动注册并启用，等待后续设备接入。
  joiningGateway.value.status = 'online'
  gatewayFilter.value = 'joined'
  gatewayProjectId.value = undefined
  closeJoinProjectModal()
}

function openGatewayDetail(gateway: Gateway) {
  if (!gateway.projectId) {
    openJoinProjectModal(gateway)
    return
  }
  router.push(`/workbench/gateway/${gateway.id}`).then(() => {
    if (appStore.guideStep === 'workbench-gateway-detail') {
      appStore.setGuideStep('gateway-detail-enter')
      nextTick(() => window.dispatchEvent(new Event('guide-position-refresh')))
    }
  })
}

// ===== 接入网关：复用视联中心新增网关流程 =====
type BindMethod = 'sn' | 'scan'
type GuideBindResult = 'configured' | 'empty' | 'offline'

const bindModalVisible = ref(false)
const bindMethod = ref<BindMethod>('sn')
const snInput = ref('')
const binding = ref(false)
const bindError = ref('')
const scanSuccess = ref(false)
const scanOutsideStyle = ref<Record<string, string>>({})
const guideBindModalVisible = ref(false)

function openGatewayAccessModal() {
  openBindModal()
  if (appStore.guideStep === 'workbench-gateway-access') {
    nextTick(() => {
      setTimeout(() => {
        appStore.setGuideStep('bind-gateway')
        window.dispatchEvent(new Event('guide-position-refresh'))
      }, 120)
    })
  }
}

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
  })
}

function closeBindModal() {
  bindModalVisible.value = false
  snInput.value = ''
  binding.value = false
  bindError.value = ''
  scanSuccess.value = false
}

function switchMethod(method: BindMethod) {
  bindMethod.value = method
  bindError.value = ''
  snInput.value = ''
  scanSuccess.value = false
  nextTick(() => {
    window.dispatchEvent(new Event('guide-position-refresh'))
    setTimeout(updateScanOutsidePosition, 120)
    setTimeout(updateScanOutsidePosition, 360)
  })
}

function handleBind() {
  bindError.value = ''
  const inputValue = snInput.value.trim()
  if (!inputValue) {
    bindError.value = '请输入网关 SN 码'
    return
  }

  binding.value = true
  setTimeout(() => {
    binding.value = false
    if (inputValue === '1') {
      message.success('网关识别成功')
      openGuideBindModal()
    } else {
      bindError.value = '绑定失败，请确认 SN 码是否正确'
    }
  }, 800)
}

function openGuideBindModal() {
  closeBindModal()
  guideBindModalVisible.value = true
}

function registerGateway(result: GuideBindResult) {
  const id = `g-${Date.now()}`
  const sn = `GW-${Math.floor(10000000 + Math.random() * 89999999)}`
  const model = 'JetLinks-Edge-2000'
  const status = result === 'offline' ? 'offline' : 'online'
  const project = createdProject.value || projects.value[0] || null
  const cpu = status === 'online' ? 16 + Math.floor(Math.random() * 28) : 0
  const memory = status === 'online' ? 24 + Math.floor(Math.random() * 34) : 0
  const disk = status === 'online' ? 10 + Math.floor(Math.random() * 26) : 0

  gateways.value.unshift({
    id,
    sn,
    projectId: project?.id || null,
    projectName: project?.name || null,
    model,
    cpu,
    memory,
    disk,
    status
  })
  gatewayNameMap[id] = '新接入网关'
  gatewaySerialMap[id] = sn
  listTab.value = 'gateway'
  gatewayFilter.value = project ? 'joined' : 'unjoined'
  gatewayProjectId.value = undefined
  return id
}

function handleGuideBindSelect(result: GuideBindResult) {
  guideBindModalVisible.value = false
  closeBindModal()
  const gatewayId = registerGateway(result)
  appStore.guideGatewayId = gatewayId
  appStore.guideBindResult = result
  appStore.guideGatewayProjectName = gateways.value.find(item => item.id === gatewayId)?.projectName || '未加入项目'
  message.success(result === 'offline' ? '网关已接入账号，等待上线' : '网关已接入账号')
  nextTick(() => {
    if (result === 'configured') appStore.setGuideStep('gw-online-configured')
    else if (result === 'empty') appStore.setGuideStep('gw-online-empty')
    else appStore.setGuideStep('gw-offline')
  })
}

function handleScanSuccess() {
  scanSuccess.value = true
  nextTick(() => {
    window.dispatchEvent(new Event('guide-position-refresh'))
    updateScanOutsidePosition()
  })
}

watch(() => appStore.guideOfflineUpdateTrigger, () => {
  const gateway = gateways.value.find(item => item.id === appStore.guideGatewayId)
  if (!gateway) return
  gateway.status = 'online'
  gateway.cpu = gateway.cpu || 18
  gateway.memory = gateway.memory || 26
  gateway.disk = gateway.disk || 12
})

watch(() => appStore.guideStep, (step) => {
  if (step !== 'workbench-gateway-detail') return
  listTab.value = 'gateway'
  gatewayFilter.value = 'joined'
  gatewayProjectId.value = undefined
  nextTick(() => window.dispatchEvent(new Event('guide-position-refresh')))
}, { immediate: true })

function onWindowResize() {
  updateScanOutsidePosition()
}

onMounted(() => window.addEventListener('resize', onWindowResize))
onBeforeUnmount(() => window.removeEventListener('resize', onWindowResize))
</script>

<template>
  <div class="wb-page">
    <!-- 背景装饰图（顶部居中铺满宽度）-->
    <img :src="bgImg" alt="" class="wb-bg" draggable="false" />

    <!-- 居中主体 -->
    <section class="wb-hero">
      <!-- 对话框外上方：欢迎标题 -->
      <h1 class="wb-welcome">Hi～欢迎使用 JetLinks Cloud</h1>

      <!-- AI 对话框 -->
      <div class="ai-dialog">
        <!-- 顶部：图标 + 问候/提示文案（整体居中）-->
        <div class="ai-dialog__head">
          <img :src="chatHeadImg" alt="AI 助手" class="ai-head__icon" draggable="false" />
          <div class="ai-head__text">
            <div class="ai-greeting">您好，我是 AI 助手小獭</div>
            <p class="ai-tip">告诉我您的需求，我会帮您快速创建项目、接入设备</p>
          </div>
        </div>

        <!-- 输入框（内含右侧发送按钮）-->
        <div class="ai-input-box">
          <input
            v-model="aiInput"
            class="ai-input"
            placeholder="例如：帮我创建一个园区安防项目"
          />
          <button class="ai-send" title="发送">
            <img :src="chatSendImg" alt="发送" />
          </button>
        </div>
      </div>

      <!-- 下方两个快捷入口卡片 -->
      <div class="wb-actions">
        <div class="wb-entry">
          <div class="wb-entry__main">
            <img :src="newProjectImg" alt="新建项目" class="wb-entry__icon" />
            <div class="wb-entry__text">
              <span class="wb-entry__title">新建项目</span>
              <span class="wb-entry__desc">创建一个项目，开始管理设备与数据</span>
            </div>
          </div>
          <button class="wb-entry__btn" @click="wizardOpen = true">立即创建</button>
        </div>

        <div class="wb-entry">
          <div class="wb-entry__main">
            <img :src="newGatewayImg" alt="接入网关" class="wb-entry__icon" />
            <div class="wb-entry__text">
              <span class="wb-entry__title">接入网关</span>
              <span class="wb-entry__desc">接入 JetLinks-Edge 网关采集设备数据</span>
            </div>
          </div>
          <button class="wb-entry__btn" @click="openGatewayAccessModal">接入网关</button>
        </div>
      </div>

      <!-- ===== 我的项目 / 我的网关 列表 ===== -->
      <div class="wb-list">
        <!-- 标签页 -->
        <div class="wb-tabs">
          <button
            class="wb-tab"
            :class="{ active: listTab === 'project' }"
            @click="switchListTab('project')"
          >
            我的项目
            <em>{{ projects.length }}</em>
          </button>
          <button
            data-guide="workbench-gateway-tab"
            class="wb-tab"
            :class="{ active: listTab === 'gateway', 'is-guide-target': appStore.guideStep === 'workbench-gateway-tab' }"
            @click="switchListTab('gateway')"
          >
            我的网关
            <em>{{ gateways.length }}</em>
          </button>
        </div>

        <!-- 项目列表 -->
        <div v-if="listTab === 'project'" class="wb-grid">
          <div v-for="p in projects" :key="p.id" class="proj-card" @click="enterProject">
            <div class="proj-card__head">
              <div class="proj-card__icon" :style="{ background: p.iconColor }">{{ p.iconChar }}</div>
              <div class="proj-card__title-wrap">
                <span class="proj-card__name">{{ p.name }}</span>
                <span class="proj-card__region">
                  <i class="i-ant-design-environment-outlined" />{{ p.region }}
                </span>
              </div>
              <span class="proj-card__status" :class="p.status">
                {{ p.status === 'running' ? '运行中' : '暂停中' }}
              </span>
            </div>
            <p class="proj-card__desc">{{ p.description }}</p>
            <div class="proj-card__foot">
              <div class="proj-card__meta">
                <span class="proj-card__sub">
                  <i class="i-ant-design-calendar-outlined" />
                  订阅 <strong>{{ p.subscriptionDays }}</strong> 天
                </span>
                <span class="proj-card__sub" :class="{ alarm: p.alarmCount > 0 }">
                  <i class="i-ant-design-alert-outlined" />
                  告警 <strong>{{ p.alarmCount }}</strong>
                </span>
              </div>
              <button class="proj-card__enter" @click.stop="enterProject">进入项目</button>
            </div>
          </div>

          <!-- 新建项目入口（始终在末尾）-->
          <div class="add-card" @click="wizardOpen = true">
            <i class="i-ant-design-plus-outlined add-card__icon" />
            <span class="add-card__text">新建项目</span>
          </div>
        </div>

        <!-- 网关列表 -->
        <div v-else>
          <!-- 筛选条件 -->
          <div class="gw-filter">
            <button
              class="gw-filter__item"
              :class="{ active: gatewayFilter === 'all' }"
              @click="gatewayFilter = 'all'"
            >
              全部 <em>{{ gatewayCounts.all }}</em>
            </button>
            <button
              class="gw-filter__item"
              :class="{ active: gatewayFilter === 'joined' }"
              @click="gatewayFilter = 'joined'"
            >
              已加入项目 <em>{{ gatewayCounts.joined }}</em>
            </button>
            <button
              class="gw-filter__item"
              :class="{ active: gatewayFilter === 'unjoined' }"
              @click="gatewayFilter = 'unjoined'"
            >
              未加入项目 <em>{{ gatewayCounts.unjoined }}</em>
            </button>
            <!-- 按项目筛选下拉（常驻）-->
            <a-select
              v-model:value="gatewayProjectId"
              class="gw-filter__select"
              placeholder="按项目筛选"
              allow-clear
              :options="projects.map(p => ({ value: p.id, label: p.name }))"
              @change="onProjectChange"
            />
          </div>

          <!-- 网关卡片网格 -->
          <div class="wb-grid">
            <div
              v-for="g in filteredGateways"
              :key="g.id"
              class="gw-card"
              :class="{ 'is-guide-target': appStore.guideStep === 'workbench-gateway-detail' && g.id === appStore.guideGatewayId }"
              :data-guide="appStore.guideStep === 'workbench-gateway-detail' && g.id === appStore.guideGatewayId ? 'workbench-gateway-detail' : undefined"
              @click="openGatewayDetail(g)"
            >
              <!-- 上半部分：左侧信息 + 右侧状态/详情（整体垂直居中）-->
              <div class="gw-card__head">
                <div class="gw-card__visual">
                  <img :src="getGatewayPic(g)" alt="网关设备" draggable="false" />
                </div>
                <div class="gw-card__info">
                  <div class="gw-card__name">{{ gatewayNameMap[g.id] || g.sn }}</div>
                  <div class="gw-card__meta-row">
                    <i class="i-ant-design-barcode-outlined" />
                    <span>{{ gatewaySerialMap[g.id] || g.model }}</span>
                  </div>
                  <div class="gw-card__meta-row">
                    <i class="i-ant-design-folder-outlined" />
                    <span>{{ g.projectName || '未加入项目' }}</span>
                  </div>
                </div>
                <div class="gw-card__head-right">
                  <span class="gw-card__status" :class="g.status">
                    {{ g.status === 'online' ? '在线' : '离线' }}
                  </span>
                  <button
                    class="gw-card__detail"
                    @click.stop="openGatewayDetail(g)"
                  >
                    {{ g.projectId ? '网关详情' : '加入项目' }}
                  </button>
                </div>
              </div>

              <div class="gw-card__usage">
                <div class="usage-item">
                  <span class="usage-label">CPU</span>
                  <div class="usage-bar">
                    <div class="usage-fill" :style="{ width: g.cpu + '%', background: usageColor(g.cpu) }" />
                  </div>
                  <span class="usage-val">{{ g.cpu }}%</span>
                </div>
                <div class="usage-item">
                  <span class="usage-label">内存</span>
                  <div class="usage-bar">
                    <div class="usage-fill" :style="{ width: g.memory + '%', background: usageColor(g.memory) }" />
                  </div>
                  <span class="usage-val">{{ g.memory }}%</span>
                </div>
                <div class="usage-item">
                  <span class="usage-label">硬盘</span>
                  <div class="usage-bar">
                    <div class="usage-fill" :style="{ width: g.disk + '%', background: usageColor(g.disk) }" />
                  </div>
                  <span class="usage-val">{{ g.disk }}%</span>
                </div>
              </div>
            </div>

            <!-- 新建网关入口（始终在末尾）-->
            <div
              data-guide="workbench-gateway-access"
              class="add-card"
              :class="{ 'is-guide-target': appStore.guideStep === 'workbench-gateway-access' }"
              @click="openGatewayAccessModal"
            >
              <i class="i-ant-design-plus-outlined add-card__icon" />
              <span class="add-card__text">接入网关</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 新建项目向导弹窗 -->
    <ProjectWizardModal v-model:open="wizardOpen" @submit="handleSubmit" />

    <!-- 项目创建完成后的接入引导 -->
    <a-modal
      v-model:open="projectGuideOpen"
      title="项目创建成功"
      :width="460"
      :footer="null"
      centered
      @cancel="closeProjectGuide"
    >
      <div class="project-guide">
        <div class="project-guide__icon">
          <i class="i-ant-design-check-outlined" />
        </div>
        <strong>项目「{{ createdProject?.name }}」已准备就绪</strong>
        <p>接下来可以接入边缘网关并继续配置设备。</p>
        <div class="project-guide__actions">
          <button class="project-guide__cancel" type="button" @click="closeProjectGuide">稍后再说</button>
          <button class="project-guide__primary" type="button" @click="goAccessGatewayFromGuide">去接入网关</button>
        </div>
      </div>
    </a-modal>

    <!-- 未加入网关加入项目弹窗 -->
    <a-modal
      v-model:open="joinProjectOpen"
      title="加入项目"
      :width="620"
      :footer="null"
      centered
      :body-style="{ padding: '0' }"
      wrap-class-name="gateway-join-modal-wrap"
      @cancel="closeJoinProjectModal"
    >
      <div v-if="joiningGateway" class="gateway-join">
        <div class="gateway-join__notice">
          <i class="i-ant-design-info-circle-outlined" />
          <span>网关加入项目后，系统会自动完成网关注册并启用。完成后可在项目内继续接入设备。</span>
        </div>

        <div class="gateway-join__body">
          <div class="gateway-join__visual">
            <img :src="getGatewayPic(joiningGateway)" alt="网关设备" draggable="false" />
          </div>

          <div class="gateway-join__main">
            <div class="gateway-join__top">
              <strong>{{ gatewayNameMap[joiningGateway.id] || joiningGateway.sn }}</strong>
              <span class="gateway-join__status" :class="joiningGateway.status">
                <i />
                {{ joiningGateway.status === 'online' ? '在线' : '离线' }}
              </span>
            </div>

            <div class="gateway-join__meta">
              <div>
                <span>序列号</span>
                <strong>{{ gatewaySerialMap[joiningGateway.id] || joiningGateway.sn }}</strong>
              </div>
              <div>
                <span>型号</span>
                <strong>{{ joiningGateway.model }}</strong>
              </div>
            </div>

            <label class="gateway-join__label">选择加入项目</label>
            <a-select
              v-model:value="joinProjectId"
              class="gateway-join__select"
              placeholder="请选择一个项目"
              :options="projects.map(p => ({ value: p.id, label: p.name }))"
            />
          </div>
        </div>

        <div class="gateway-join__footer">
          <button class="gateway-join__cancel" type="button" @click="closeJoinProjectModal">取消</button>
          <button
            class="gateway-join__confirm"
            type="button"
            :disabled="!joinProjectId"
            @click="confirmJoinProject"
          >
            确认加入
          </button>
        </div>
      </div>
    </a-modal>

    <!-- SN / 扫码接入 -->
    <a-modal
      v-model:open="bindModalVisible"
      title="新增网关"
      :width="480"
      :footer="null"
      centered
      :mask-closable="!appStore.guideActive"
      :z-index="appStore.guideActive ? 2000 : 1000"
      :body-style="{ padding: '0' }"
      wrap-class-name="bind-modal-wrap"
      @cancel="closeBindModal"
    >
      <div class="bind-modal">
        <div class="bind-tabs">
          <button class="bind-tab" :class="{ active: bindMethod === 'sn' }" @click="switchMethod('sn')">
            <i class="i-ant-design-barcode-outlined" />
            <span>SN 码绑定</span>
          </button>
          <button class="bind-tab" :class="{ active: bindMethod === 'scan' }" @click="switchMethod('scan')">
            <i class="i-ant-design-scan-outlined" />
            <span>扫码接入</span>
          </button>
        </div>

        <div v-if="bindMethod === 'sn'" class="bind-content">
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
          <div class="bind-contact">
            <i class="i-ant-design-customer-service-outlined" />
            <span>如需购买网关，请联系商务或项目负责人</span>
            <div class="bind-contact__ways">
              <span class="bind-contact__way"><i class="i-ant-design-phone-outlined" />400-888-0000</span>
              <span class="bind-contact__way"><i class="i-ant-design-mail-outlined" />business@jetlinks.com</span>
            </div>
          </div>
          <div class="bind-actions">
            <button class="bind-btn bind-btn--primary" type="button" :disabled="binding || !snInput.trim()" @click="handleBind">
              <i v-if="binding" class="i-ant-design-loading-outlined sync-spin" />
              <span>{{ binding ? '识别中' : '下一步' }}</span>
            </button>
          </div>
        </div>

        <div v-if="bindMethod === 'scan'" class="bind-content bind-content--scan">
          <template v-if="!scanSuccess">
            <div class="scan-intro">
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
            <div class="bind-contact">
              <i class="i-ant-design-customer-service-outlined" />
              <span>如需购买网关，请联系商务或项目负责人</span>
              <div class="bind-contact__ways">
                <span class="bind-contact__way"><i class="i-ant-design-phone-outlined" />400-888-0000</span>
                <span class="bind-contact__way"><i class="i-ant-design-mail-outlined" />business@jetlinks.com</span>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="scan-success">
              <div class="scan-success__badge">
                <i class="i-ant-design-check-circle-filled" />
                <span>网关识别成功</span>
              </div>
              <div class="scan-success__info">
                <img :src="gatewayPic1" class="scan-success__img" alt="网关设备" draggable="false" />
                <div class="scan-success__details">
                  <div class="scan-success__row">
                    <span class="scan-success__label">网关名称</span>
                    <span class="scan-success__value">JetLinks 边缘网关</span>
                  </div>
                  <div class="scan-success__row">
                    <span class="scan-success__label">网关序列号</span>
                    <span class="scan-success__value scan-success__value--mono">GW-58740736</span>
                  </div>
                  <div class="scan-success__row">
                    <span class="scan-success__label">所属项目</span>
                    <span class="scan-success__value">{{ createdProject?.name || '未加入项目' }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="bind-actions">
              <button class="bind-btn bind-btn--primary" type="button" @click="openGuideBindModal">下一步</button>
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
      <button class="scan-outside-actions__btn" type="button" @click="handleScanSuccess">
        <i class="i-ant-design-check-outlined" />
        <span>扫码成功</span>
      </button>
    </div>

    <!-- 绑定结果选择 -->
    <a-modal
      v-model:open="guideBindModalVisible"
      title="场景模拟"
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
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.wb-page {
  position: relative;
  min-height: 100%;
  /* 背景透明：渐变由 SaaSLayout 提供，避免两段渐变断层 */
  background: transparent;
  display: flex;
  /* 顶部对齐 + 上内边距，使整体内容偏上 */
  align-items: flex-start;
  justify-content: center;
  padding: 90px 100px 40px;
  overflow: hidden;
}

/* 背景装饰图：fixed 定位覆盖屏幕顶部（含菜单栏），宽度填满，等比压低高度 */
.wb-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 340px; /* 固定高度，等比压低 */
  object-fit: cover; /* 宽度填满，高度裁切 */
  object-position: center top;
  pointer-events: none;
  user-select: none;
  z-index: 0;
  -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%);
  mask-image: linear-gradient(to bottom, #000 0%, #000 55%, transparent 100%);
}

/* ===== 居中主体（置于背景图之上）===== */
.wb-hero {
  position: relative;
  z-index: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
}

/* 对话框外上方：欢迎标题（白色，加大加粗） */
.wb-welcome {
  margin: 0;
  font-size: 34px;
  font-weight: 700;
  color: #ffffff;
  text-shadow: 0 2px 8px rgba(59, 130, 246, 0.2);
  letter-spacing: 1px;
}

/* ===== AI 对话框（宽度 66%）===== */
.ai-dialog {
  width: 66%;
  /* 半透明白色背景（60%），透出底部的蓝色渐变 */
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.1);
  padding: 28px 32px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 顶部：图标 + 文案（整体居中） */
.ai-dialog__head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

/* 文案也居中对齐 */
.ai-head__text {
  min-width: 0;
  text-align: center;
}

.ai-head__icon {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  object-fit: contain;
  user-select: none;
}

.ai-head__text {
  min-width: 0;
}

.ai-greeting {
  font-size: 18px;
  font-weight: 600;
  color: $text-base;
}

.ai-tip {
  margin: 6px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: $text-tertiary;
}

/* 输入框容器：包裹 input + 发送按钮 */
.ai-input-box {
  position: relative;
  display: flex;
  align-items: center;
}

.ai-input {
  width: 100%;
  height: 48px;
  /* 输入框白色半透明（60%）*/
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid transparent;
  border-radius: 12px;
  padding: 0 60px 0 16px; /* 右侧留出发送按钮空间 */
  font-size: 14px;
  font-family: inherit;
  color: $text-base;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;

  &::placeholder {
    color: $text-muted;
  }

  &:focus {
    border-color: $saas-primary;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
  }
}

/* 发送按钮：圆形白底，位于输入框内部右侧 */
.ai-send {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s;

  img {
    width: 16px;
    height: 16px;
  }

  &:hover {
    box-shadow: 0 2px 10px rgba(59, 130, 246, 0.25);
  }
}

/* 创建方式按钮 */
.ai-create {
  display: flex;
  gap: 12px;
}

/* ===== 下方两个快捷入口卡片（撑满，两边各留 100px 由 page padding 提供）===== */
.wb-actions {
  display: flex;
  gap: 16px;
  width: 100%;
  align-self: stretch;
}

.wb-entry {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border: 1px solid $border-color-card;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(4px);
  transition: box-shadow 0.2s, border-color 0.2s;

  &:hover {
    border-color: transparent;
    box-shadow: $shadow-card-active;
  }

  &__main {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  }

  &__icon {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    object-fit: contain;
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
    white-space: nowrap;
  }

  &__desc {
    font-size: 12px;
    color: $text-muted;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__btn {
    flex-shrink: 0;
    height: 32px;
    padding: 0 20px;
    border: 1px solid $border-color-input;
    border-radius: 9999px; /* 完全圆角（胶囊形）*/
    background: #ffffff;
    color: $text-base;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;

    &:hover {
      border-color: $saas-primary;
      color: $saas-primary;
    }
  }
}

@media (max-width: 640px) {
  .wb-actions {
    flex-direction: column;
  }
}

/* ===== 我的项目 / 网关 列表区 ===== */
.wb-list {
  width: 100%;
  align-self: stretch;
  margin-top: 8px;
}

/* 标签页 */
.wb-tabs {
  display: flex;
  gap: 32px;
  border-bottom: 1px solid $border-color-card;
  margin-bottom: 20px;
}

.wb-tab {
  position: relative;
  padding: 12px 0;
  border: none;
  background: transparent;
  font-size: 16px;
  font-weight: 500;
  color: $text-secondary;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: color 0.2s;

  em {
    font-style: normal;
    font-size: 13px;
    color: $text-muted;
  }

  &:hover {
    color: $saas-primary;
  }

  &.active {
    color: $saas-primary;

    em {
      color: $saas-primary;
    }

    &::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: -1px;
      height: 2px;
      background: $saas-primary;
      border-radius: 1px;
    }
  }
}

.wb-tab.is-guide-target,
.add-card.is-guide-target {
  position: relative;
  z-index: 1998;
}

/* 卡片网格 */
.wb-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 1280px) {
    grid-template-columns: repeat(3, 1fr);
  }
  @media (max-width: 980px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

/* ===== 项目卡片 ===== */
.proj-card {
  background: #ffffff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;

  &:hover {
    border-color: transparent;
    box-shadow: $shadow-card-active;
  }
}

.proj-card__head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.proj-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: 600;
  flex-shrink: 0;
}

.proj-card__title-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.proj-card__name {
  font-size: 15px;
  font-weight: 600;
  color: $text-base;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.proj-card__region {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: $text-muted;

  i {
    font-size: 12px;
  }
}

.proj-card__status {
  flex-shrink: 0;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 9999px;

  &.running {
    color: $color-online;
    background: $color-online-bg;
  }

  &.paused {
    color: $text-muted;
    background: $bg-hover;
  }
}

.proj-card__desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: $text-tertiary;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 39px;
}

.proj-card__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid $border-color-card;
}

.proj-card__meta {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  flex-wrap: wrap;
}

.proj-card__sub {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: $text-secondary;

  i {
    font-size: 13px;
    color: $text-muted;
  }

  strong {
    color: $text-base;
    font-weight: 600;
  }

  &.alarm strong {
    color: #ff4d4f;
  }
}

/* 进入项目按钮 */
.proj-card__enter {
  flex-shrink: 0;
  height: 30px;
  padding: 0 14px;
  border: none;
  border-radius: 6px;
  background: $saas-primary-bg;
  color: $saas-primary;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: $saas-primary;
    color: #fff;
  }
}

/* ===== 网关筛选条件 ===== */
.gw-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.gw-filter__item {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 14px;
  border: 1px solid $border-color-card;
  border-radius: 9999px;
  background: #ffffff;
  color: $text-secondary;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;

  em {
    font-style: normal;
    color: $text-muted;
  }

  &:hover {
    border-color: $saas-primary;
    color: $saas-primary;
  }

  &.active {
    border-color: $saas-primary;
    background: $saas-primary-bg;
    color: $saas-primary;

    em {
      color: $saas-primary;
    }
  }
}

/* ===== 网关卡片 ===== */
.gw-card {
  position: relative;
  background: #ffffff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;

  &:hover {
    border-color: transparent;
    box-shadow: $shadow-card-active;
  }

  &.is-guide-target {
    z-index: 1999;
  }
}

.gw-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.gw-card__visual {
  width: 74px;
  height: 58px;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  background: #f8f9fc;
  overflow: hidden;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}

/* 左侧信息块（SN + 项目 + 型号）*/
.gw-card__info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  flex: 1;
}

.gw-card__head-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.gw-card__meta-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: 13px;
  color: $text-secondary;

  i {
    flex-shrink: 0;
    font-size: 14px;
    color: $text-muted;
  }

  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.gw-card__name {
  font-size: 15px;
  font-weight: 600;
  color: $text-base;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gw-card__status {
  flex-shrink: 0;
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 9999px;

  &.online {
    color: $color-online;
    background: $color-online-bg;
  }

  &.offline {
    color: $text-muted;
    background: $bg-hover;
  }
}

.gw-card__project {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: $text-secondary;

  i {
    font-size: 13px;
    color: $text-muted;
  }
}

.gw-card__model {
  font-size: 12px;
  color: $text-muted;
}

/* 使用率条 */
.gw-card__usage {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid $border-color-card;
}

.usage-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.usage-label {
  font-size: 12px;
  color: $text-muted;
  width: 32px;
  flex-shrink: 0;
}

.usage-bar {
  flex: 1;
  height: 6px;
  background: $border-color-card;
  border-radius: 3px;
  overflow: hidden;
}

.usage-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}

.usage-val {
  font-size: 12px;
  font-weight: 600;
  color: $text-base;
  width: 36px;
  text-align: right;
  flex-shrink: 0;
}

/* 网关详情按钮 */
.gw-card__detail {
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  background: $saas-primary-bg;
  color: $saas-primary;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;

  &:hover {
    background: $saas-primary;
    color: #fff;
  }

  &:disabled,
  &:disabled:hover {
    cursor: not-allowed;
    color: $text-muted;
    background: $bg-hover;
  }

  &.is-guide-target {
    position: relative;
    z-index: 1999;
  }
}

/* ===== 新建入口卡片（虚线边框 + 加号）===== */
.add-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border: 1px dashed $border-color-input;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.5);
  min-height: 160px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;

  &:hover {
    border-color: $saas-primary;
    background: $saas-primary-bg;
  }

  .add-card__icon {
    font-size: 28px;
    color: $text-muted;
    transition: color 0.2s;
  }

  .add-card__text {
    font-size: 14px;
    color: $text-secondary;
  }

  &:hover .add-card__icon {
    color: $saas-primary;
  }
}

/* ===== 项目创建完成引导 ===== */
.project-guide {
  padding: 22px 24px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;

  &__icon {
    width: 52px;
    height: 52px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: $color-online-bg;
    color: $color-online;

    i {
      font-size: 24px;
    }
  }

  strong {
    font-size: 16px;
    color: $text-base;
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.7;
    color: $text-tertiary;
  }

  &__actions {
    display: flex;
    justify-content: center;
    gap: 10px;
    padding-top: 8px;
  }

  &__cancel,
  &__primary {
    height: 32px;
    padding: 0 16px;
    border-radius: 6px;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }

  &__cancel {
    border: 1px solid $border-color-light;
    background: #fff;
    color: $text-secondary;

    &:hover {
      border-color: $saas-primary;
      color: $saas-primary;
    }
  }

  &__primary {
    border: 1px solid $saas-primary;
    background: $saas-primary;
    color: #fff;

    &:hover {
      background: $saas-primary-hover;
      border-color: $saas-primary-hover;
    }
  }
}

/* ===== 新增网关流程 ===== */
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
      background: $color-online-bg;
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
    border: 1px solid $saas-primary;
    background: #fff;
    color: $saas-primary;
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.15s ease;
    flex-shrink: 0;

    &:hover {
      background: $saas-primary-bg;
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
    border: 1px dashed rgba(59, 130, 246, 0.45);
    border-radius: 8px;
    background: linear-gradient(180deg, rgba(59, 130, 246, 0.07), rgba(59, 130, 246, 0.03));
    color: $text-base;
    font-family: inherit;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
      border-color: $saas-primary;
      background: $saas-primary-bg;
    }
  }

  &__add-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: $saas-primary;
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
    color: $saas-primary;
    font-size: 16px;
  }
}

.bind-modal {
  display: flex;
  flex-direction: column;
}

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

  i {
    font-size: 22px;
  }

  &:hover,
  &.active {
    color: $saas-primary;
    font-weight: 500;
  }

  &.active::after {
    content: '';
    position: absolute;
    left: 20%;
    right: 20%;
    bottom: -1px;
    height: 2px;
    background: $saas-primary;
    border-radius: 1px;
  }
}

.bind-content {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

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

  i {
    font-size: 16px;
    flex-shrink: 0;
  }
}

.bind-field {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__label {
    font-size: 13px;
    font-weight: 500;
    color: $text-base;
  }

  &__hint {
    margin: 0;
    font-size: 12px;
    color: $text-muted;
    line-height: 1.5;
  }

  &__hint-img {
    width: 100%;
    height: 150px;
    margin-top: 8px;
    border-radius: 8px;
    border: 1px solid $border-color-card;
    object-fit: contain;
  }
}

.bind-contact {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  margin-top: 12px;
  background: rgba(59, 130, 246, 0.05);
  border-radius: 8px;
  font-size: 12.5px;
  color: $text-secondary;
  flex-wrap: wrap;

  > i:first-child {
    font-size: 16px;
    color: $saas-primary;
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

    i {
      font-size: 13px;
      color: $saas-primary;
    }
  }
}

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

  &--default {
    border: 1px solid $border-color-light;
    background: #fff;
    color: $text-secondary;

    &:hover {
      border-color: $saas-primary;
      color: $saas-primary;
    }
  }

  &--primary {
    border: 1px solid $saas-primary;
    background: $saas-primary;
    color: #fff;

    &:hover:not(:disabled) {
      background: $saas-primary-hover;
      border-color: $saas-primary-hover;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.sync-spin {
  animation: sync-spin 1s linear infinite;
}

@keyframes sync-spin {
  to {
    transform: rotate(360deg);
  }
}

.bind-content--scan {
  min-height: 280px;
}

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
  }

  &__num {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: $saas-primary-bg;
    color: $saas-primary;
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

    i {
      font-size: 22px;
    }
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
    object-fit: cover;
    border-radius: 8px;
    display: block;
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
    border: 1px solid $saas-primary;
    border-radius: 20px;
    background: $saas-primary;
    color: #fff;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    box-shadow: 0 10px 26px rgba(59, 130, 246, 0.24);
    transition: all 0.15s ease;

    &:hover {
      background: $saas-primary-hover;
      border-color: $saas-primary-hover;
    }
  }
}

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
      color: $saas-primary;
      flex-shrink: 0;
    }

    > i:last-child {
      font-size: 14px;
      color: $text-muted;
      margin-left: auto;
    }

    &:hover {
      border-color: $saas-primary;
      background: $saas-primary-bg;
    }
  }

  &__option-body {
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
      font-size: 14px;
      font-weight: 600;
      color: $text-base;
    }

    span {
      font-size: 12px;
      color: $text-muted;
    }
  }
}

/* ===== 未加入网关加入项目弹窗 ===== */
.gateway-join {
  padding: 20px 24px 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.gateway-join__notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(59, 130, 246, 0.16);
  border-radius: 8px;
  background: rgba(59, 130, 246, 0.06);
  color: $text-secondary;
  font-size: 13px;
  line-height: 1.6;

  i {
    margin-top: 3px;
    color: $saas-primary;
    font-size: 14px;
    flex-shrink: 0;
  }
}

.gateway-join__body {
  display: grid;
  grid-template-columns: 178px minmax(0, 1fr);
  gap: 20px;
  align-items: stretch;
  padding: 18px 0;
  border-top: 1px solid $border-color-card;
  border-bottom: 1px solid $border-color-card;
}

.gateway-join__visual {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 150px;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  background: #fafbfc;

  img {
    width: 132px;
    height: 98px;
    object-fit: contain;
    user-select: none;
  }
}

.gateway-join__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gateway-join__top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;

  strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 15px;
    color: $text-base;
    font-weight: 600;
  }
}

.gateway-join__status {
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
    background: $color-online-bg;
  }

  &.offline {
    color: $text-muted;
    background: $bg-hover;
  }
}

.gateway-join__meta {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;

  div {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
  }

  span {
    width: 52px;
    flex-shrink: 0;
    color: $text-tertiary;
  }

  strong {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: $text-secondary;
    font-weight: 500;
  }
}

.gateway-join__label {
  margin-top: 2px;
  font-size: 13px;
  font-weight: 500;
  color: $text-base;
}

.gateway-join__select {
  width: 100%;

  :deep(.ant-select-selector) {
    height: 34px !important;
    border-radius: 6px !important;
    border-color: $border-color-input !important;
  }

  :deep(.ant-select-selection-item),
  :deep(.ant-select-selection-placeholder) {
    line-height: 32px !important;
  }
}

.gateway-join__footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.gateway-join__cancel,
.gateway-join__confirm {
  height: 32px;
  padding: 0 15px;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s ease;
}

.gateway-join__cancel {
  border: 1px solid $border-color-input;
  background: #fff;
  color: $text-secondary;

  &:hover {
    border-color: $saas-primary;
    color: $saas-primary;
  }
}

.gateway-join__confirm {
  border: 1px solid $saas-primary;
  background: $saas-primary;
  color: #fff;

  &:hover {
    background: $saas-primary-hover;
    border-color: $saas-primary-hover;
  }

  &:disabled,
  &:disabled:hover {
    cursor: not-allowed;
    border-color: $border-color-input;
    background: $bg-hover;
    color: $text-muted;
  }
}

/* 网关筛选下拉框：完全圆角 */
.gw-filter__select {
  width: 180px;

  :deep(.ant-select-selector) {
    border-radius: 9999px !important;
  }
}

@media (max-width: 640px) {
  .gateway-join__body {
    grid-template-columns: 1fr;
  }
}
</style>
