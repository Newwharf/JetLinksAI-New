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
import { projects, gateways, type Project } from './workbench.mock'
import ProjectWizardModal from './ProjectWizardModal.vue'
import { useAppStore } from '@/stores/app'
import { useRouter } from 'vue-router'

const appStore = useAppStore()
const router = useRouter()

// 进入项目：切到安防场景 + 跳仪表盘
function enterProject() {
  appStore.setScenario('security')
  router.push('/dashboard')
}

// AI 输入框（纯展示）
const aiInput = ref('')

// ===== 新建项目向导 =====
const wizardOpen = ref(false)

function handleSubmit(project: Project) {
  // 项目加入列表首位
  projects.value.unshift(project)
}

// ===== 我的项目 / 我的网关 列表区 =====
type ListTab = 'project' | 'gateway'
const listTab = ref<ListTab>('project')

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

// 使用率颜色档位
function usageColor(v: number): string {
  if (v >= 80) return '#ff4d4f'
  if (v >= 60) return '#faad14'
  return '#52c41a'
}
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
          <button class="wb-entry__btn">立即创建</button>
        </div>

        <div class="wb-entry">
          <div class="wb-entry__main">
            <img :src="newGatewayImg" alt="接入网关" class="wb-entry__icon" />
            <div class="wb-entry__text">
              <span class="wb-entry__title">接入网关</span>
              <span class="wb-entry__desc">接入 JetLinks-Edge 网关采集设备数据</span>
            </div>
          </div>
          <button class="wb-entry__btn">接入网关</button>
        </div>
      </div>

      <!-- ===== 我的项目 / 我的网关 列表 ===== -->
      <div class="wb-list">
        <!-- 标签页 -->
        <div class="wb-tabs">
          <button
            class="wb-tab"
            :class="{ active: listTab === 'project' }"
            @click="listTab = 'project'"
          >
            我的项目
            <em>{{ projects.length }}</em>
          </button>
          <button
            class="wb-tab"
            :class="{ active: listTab === 'gateway' }"
            @click="listTab = 'gateway'"
          >
            我的网关
            <em>{{ gateways.length }}</em>
          </button>
        </div>

        <!-- 项目列表 -->
        <div v-if="listTab === 'project'" class="wb-grid">
          <div v-for="p in projects" :key="p.id" class="proj-card">
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
              <button class="proj-card__enter" @click="enterProject">进入项目</button>
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
            <div v-for="g in filteredGateways" :key="g.id" class="gw-card">
              <!-- 上半部分：左侧信息 + 右侧状态/详情（整体垂直居中）-->
              <div class="gw-card__head">
                <div class="gw-card__info">
                  <div class="gw-card__sn-wrap">
                    <i class="i-ant-design-hdd-outlined gw-card__sn-icon" />
                    <span class="gw-card__sn">{{ g.sn }}</span>
                  </div>
                  <div class="gw-card__project">
                    <i class="i-ant-design-folder-outlined" />
                    {{ g.projectName || '未绑定项目' }}
                  </div>
                  <div class="gw-card__model">{{ g.model }}</div>
                </div>
                <div class="gw-card__head-right">
                  <span class="gw-card__status" :class="g.status">
                    {{ g.status === 'online' ? '在线' : '离线' }}
                  </span>
                  <button class="gw-card__detail">网关详情</button>
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
            <div class="add-card" @click="">
              <i class="i-ant-design-plus-outlined add-card__icon" />
              <span class="add-card__text">接入网关</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 新建项目向导弹窗 -->
    <ProjectWizardModal v-model:open="wizardOpen" @submit="handleSubmit" />
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
  background: #ffffff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: box-shadow 0.2s, border-color 0.2s;

  &:hover {
    border-color: transparent;
    box-shadow: $shadow-card-active;
  }
}

.gw-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
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

.gw-card__sn-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.gw-card__sn-icon {
  font-size: 16px;
  color: $saas-primary;
  flex-shrink: 0;
}

.gw-card__sn {
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
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

/* 网关筛选下拉框：完全圆角 */
.gw-filter__select {
  width: 180px;

  :deep(.ant-select-selector) {
    border-radius: 9999px !important;
  }
}
</style>
