<script setup lang="ts">
import { message } from 'ant-design-vue'
import { useAppStore } from '@/stores/app'
import { projects, type Project } from '@/views/workbench/workbench.mock'
import { scenarioOptions } from '@/views/workbench/templates'
import serviceQrImg from '@/assets/iot/erweima.png'
import ServiceIcon from './subscription/ServiceIcon.vue'
import {
  subscriptions,
  packageComparison,
  serviceNameMap,
  serviceIconMap,
  tierLabels,
  formatNumber,
  type Subscription
} from './subscription/mock'

const appStore = useAppStore()

const fallbackProject: Project = {
  id: 'p-fallback',
  name: '通用场景项目',
  region: '西南1',
  description: '适用于通用物联场景的项目。',
  subscriptionDays: 30,
  status: 'running',
  alarmCount: 0,
  iconColor: '#6e4bff',
  iconChar: '通',
  template: 'general',
  urlSuffix: 'general-project',
  createdAt: '2026-07-10T09:30:00'
}

const serviceUi: Record<string, { name: string; desc: string }> = {
  basic: { name: '基础服务', desc: '用户、角色等基础资源用量' },
  dev: { name: '开发', desc: '设备接入、消息与属性能力' },
  alarm: { name: '告警', desc: '告警规则与告警配置能力' },
  gateway: { name: '网关', desc: '网关接入能力按关联服务计量' },
  iot: { name: '物联', desc: '物联设备、分组与运行数据' },
  visual: { name: '可视化', desc: '大屏页面与组件资源' },
  spatial: { name: '空间态势', desc: '空间实体与态势展示能力' },
  inspect: { name: '巡检', desc: '巡检计划与巡检路线' },
  video: { name: '视联', desc: '监控点位与录像存储能力' }
}

const currentProject = computed<Project>(() => {
  return projects.value.find(item => item.id === appStore.activeProjectId) || projects.value[0] || fallbackProject
})

const currentTemplate = computed(() => {
  const template = currentProject.value?.template && currentProject.value.template !== 'blank'
    ? currentProject.value.template
    : appStore.scenario || 'general'
  return scenarioOptions.find(item => item.value === template) || scenarioOptions.find(item => item.value === 'general') || scenarioOptions[0]
})

const projectDraft = reactive({
  name: '',
  description: '',
  iconColor: '#6e4bff',
  iconChar: '',
  logoImg: ''
})

const logoInput = ref<HTMLInputElement | null>(null)

const mapDraft = reactive({
  webServiceApi: '',
  jsApi: '',
  securityKey: ''
})

const configEditing = ref(false)
const expansionModalVisible = ref(false)

watch(currentProject, (project) => {
  projectDraft.name = project?.name || currentTemplate.value.name || '未命名项目'
  projectDraft.description = project?.description || currentTemplate.value.desc || ''
  projectDraft.iconColor = project?.iconColor || currentTemplate.value.iconColor || '#6e4bff'
  projectDraft.iconChar = project?.iconChar || projectDraft.name.charAt(0) || currentTemplate.value.logo || '项'
  projectDraft.logoImg = project?.logoImg || ''
  configEditing.value = false
}, { immediate: true })

const projectMeta = computed(() => {
  const project = currentProject.value
  return [
    { label: '项目模板', value: currentTemplate.value?.label || '通用模板' },
    { label: '所在区域', value: project?.region || '西南1' },
    { label: '访问地址', value: `https://jetlinks.cn/p/${project?.urlSuffix || project?.id || 'project'}` },
    { label: '创建时间', value: formatDate(project?.createdAt) }
  ]
})

function formatDate(value?: string) {
  const date = value ? new Date(value) : new Date('2026-07-10T09:30:00')
  if (Number.isNaN(date.getTime())) return '2026-07-10 09:30'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function saveProjectConfig() {
  const project = currentProject.value
  if (!projectDraft.name.trim()) {
    message.warning('请输入项目名称')
    return
  }
  project.name = projectDraft.name.trim()
  project.description = projectDraft.description.trim() || '暂无说明'
  project.iconColor = projectDraft.iconColor
  project.iconChar = projectDraft.iconChar || project.name.charAt(0)
  project.logoImg = projectDraft.logoImg
  configEditing.value = false
  message.success('项目配置已保存')
}

function cancelProjectConfig() {
  const project = currentProject.value
  projectDraft.name = project?.name || currentTemplate.value.name || '未命名项目'
  projectDraft.description = project?.description || currentTemplate.value.desc || ''
  projectDraft.iconColor = project?.iconColor || currentTemplate.value.iconColor || '#6e4bff'
  projectDraft.iconChar = project?.iconChar || projectDraft.name.charAt(0) || currentTemplate.value.logo || '项'
  projectDraft.logoImg = project?.logoImg || ''
  configEditing.value = false
}

function triggerLogoUpload() {
  logoInput.value?.click()
}

function onLogoChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    projectDraft.logoImg = URL.createObjectURL(file)
  }
  input.value = ''
}

function openExpansionModal() {
  expansionModalVisible.value = true
}

function metricKey(feature: string, metric: string) {
  return `${feature}:${metric}`
}

function getComparisonGroup(serviceId: string) {
  return packageComparison.find(group => group.service === serviceNameMap[serviceId])
}

interface UsageMetric {
  key: string
  label: string
  used: number
  total: number
  percent: number
}

function buildMetrics(sub: Subscription): UsageMetric[] {
  const group = getComparisonGroup(sub.id)
  if (!group || group.noOwnMetrics || !group.rows) return []
  return group.rows.reduce<UsageMetric[]>((list, row) => {
    const base = row.quotas[sub.tier]
    if (base === undefined) return list
    const key = metricKey(row.feature, row.metric)
    const total = base + (sub.expansions[key] || 0)
    const used = sub.usage[key]?.used || 0
    const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0
    list.push({ key, label: `${row.feature} · ${row.metric}`, used, total, percent })
    return list
  }, [])
}

const usageCards = computed(() => subscriptions.map(sub => {
  const metrics = buildMetrics(sub)
  const maxPercent = metrics.length ? Math.max(...metrics.map(item => item.percent)) : 0
  const ui = serviceUi[sub.id] || { name: sub.name, desc: '服务用量' }
  return {
    ...sub,
    displayName: ui.name,
    desc: ui.desc,
    icon: serviceIconMap[sub.id] || 'spark',
    plan: tierLabels[sub.tier],
    metrics,
    maxPercent,
    noOwnMetrics: metrics.length === 0
  }
}))
</script>

<template>
  <div class="project-config-page">
    <section class="pc-section pc-config">
        <div class="pc-section__head">
          <div>
            <h3>项目配置</h3>
          </div>
          <div class="pc-section__actions">
            <template v-if="configEditing">
              <button class="pc-btn" type="button" @click="cancelProjectConfig">
                <i class="i-ant-design-close-outlined" />
                取消
              </button>
              <button class="pc-btn pc-btn--primary" type="button" @click="saveProjectConfig">
                <i class="i-ant-design-save-outlined" />
                保存
              </button>
            </template>
            <button v-else class="pc-btn" type="button" @click="configEditing = true">
              <i class="i-ant-design-edit-outlined" />
              编辑
            </button>
          </div>
        </div>

        <div class="pc-config__body">
          <div class="pc-config__main">
            <div class="pc-subhead">
              <h4>基础信息</h4>
            </div>

            <div class="pc-meta-grid pc-meta-grid--inside">
              <div v-for="item in projectMeta" :key="item.label" class="pc-meta">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>

            <div class="pc-form">
              <label>
                <span>项目名称</span>
                <a-input v-model:value="projectDraft.name" :disabled="!configEditing" placeholder="请输入项目名称" />
              </label>
              <label>
                <span>项目说明</span>
                <a-textarea v-model:value="projectDraft.description" :disabled="!configEditing" :rows="4" placeholder="请输入项目说明" />
              </label>
            </div>

            <div class="pc-logo-panel">
              <div class="pc-logo pc-logo--edit" :style="{ background: projectDraft.logoImg ? '#fff' : projectDraft.iconColor }">
                <img v-if="projectDraft.logoImg" :src="projectDraft.logoImg" alt="项目 Logo">
                <span v-else>{{ projectDraft.iconChar }}</span>
              </div>
              <div class="pc-logo-panel__actions">
                <input ref="logoInput" type="file" accept="image/*" hidden @change="onLogoChange">
                <button class="pc-btn" type="button" :disabled="!configEditing" @click="triggerLogoUpload">
                  <i class="i-ant-design-upload-outlined" />
                  上传 Logo
                </button>
              </div>
            </div>
          </div>

          <div class="pc-config__map">
            <div class="pc-subhead">
              <h4>地图配置</h4>
            </div>
            <div class="pc-map-form">
              <label>
                <span>高德地图 Web 服务 API</span>
                <a-input v-model:value="mapDraft.webServiceApi" :disabled="!configEditing" placeholder="未配置" />
              </label>
              <label>
                <span>高德地图 JS API</span>
                <a-input v-model:value="mapDraft.jsApi" :disabled="!configEditing" placeholder="未配置" />
              </label>
              <label>
                <span>高德地图密钥</span>
                <a-input-password v-model:value="mapDraft.securityKey" :disabled="!configEditing" placeholder="未配置" />
              </label>
            </div>
          </div>
        </div>
    </section>

    <section class="pc-section">
      <div class="pc-section__head">
        <div>
          <h3>板块用量</h3>
        </div>
      </div>

      <div class="usage-grid">
        <article v-for="service in usageCards" :key="service.id" class="usage-card">
          <div class="usage-card__head">
            <div class="usage-card__icon">
              <ServiceIcon :name="service.icon" />
            </div>
            <div>
              <h4>{{ service.displayName }}</h4>
            </div>
            <span class="usage-card__plan" :class="`usage-card__plan--${service.tier}`">{{ service.plan }}</span>
          </div>

          <template v-if="service.noOwnMetrics">
            <div class="usage-card__empty">
              <i class="i-ant-design-info-circle-outlined" />
              网关不单独配置用量指标，接入容量计入关联服务。
            </div>
          </template>
          <template v-else>
            <div class="usage-card__summary">
              <span>最高使用率</span>
              <strong>{{ service.maxPercent }}%</strong>
            </div>
            <div class="usage-metrics">
              <div v-for="metric in service.metrics" :key="metric.key" class="usage-metric">
                <div class="usage-metric__row">
                  <span>{{ metric.label }}</span>
                  <em>{{ formatNumber(metric.used) }} / {{ formatNumber(metric.total) }}</em>
                </div>
                <div class="usage-bar">
                  <span :style="{ width: `${metric.percent}%` }" />
                </div>
              </div>
            </div>
          </template>
          <div class="usage-card__actions">
            <button class="usage-expand-btn" type="button" @click="openExpansionModal">
              <i class="i-ant-design-plus-circle-outlined" />
              扩容
            </button>
          </div>
        </article>
      </div>
    </section>

    <a-modal
      v-model:open="expansionModalVisible"
      :width="420"
      :footer="null"
      centered
      :title="null"
    >
      <div class="capacity-modal">
        <div class="capacity-modal__icon">
          <i class="i-ant-design-customer-service-outlined" />
        </div>
        <h3>请联系技术支持</h3>
        <p>如需扩容当前板块用量，请扫码联系售后服务人员。</p>
        <img :src="serviceQrImg" alt="售后服务二维码" class="capacity-modal__qr">
        <button class="pc-btn pc-btn--primary capacity-modal__btn" type="button" @click="expansionModalVisible = false">
          我知道了
        </button>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.project-config-page {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
  background: $bg-page;
}

.pc-section {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  box-shadow: $shadow-card-active;

  &--hero {
    margin-bottom: 12px;
  }

  &__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px 12px;
    border-bottom: 1px solid $border-color-card;

    h3 {
      margin: 0 0 4px;
      font-size: 16px;
      line-height: 24px;
      font-weight: 600;
      color: $text-base;
    }

    p {
      margin: 0;
      font-size: 13px;
      line-height: 20px;
      color: $text-tertiary;
    }
  }

  &__actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex: 0 0 auto;
  }
}

.pc-hero {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 16px;
  padding: 18px;

  &__main {
    min-width: 0;
  }

  &__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;

    h2 {
      margin: 0 0 4px;
      font-size: 20px;
      line-height: 28px;
      color: $text-base;
    }

    p {
      margin: 0;
      font-size: 13px;
      line-height: 20px;
      color: $text-tertiary;
    }
  }
}

.pc-logo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 76px;
  height: 76px;
  border-radius: 8px;
  overflow: hidden;
  color: #fff;
  font-size: 30px;
  font-weight: 700;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &--edit {
    width: 64px;
    height: 64px;
    font-size: 24px;
    flex: 0 0 auto;
  }
}

.pc-meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;

  &--inside {
    padding: 0;
  }
}

.pc-meta {
  min-width: 0;
  padding: 10px 12px;
  border-radius: 6px;
  background: #fafbfc;

  span {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    color: $text-tertiary;
  }

  strong {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 13px;
    line-height: 20px;
    font-weight: 600;
    color: $text-base;
  }
}

.pc-config {
  margin-bottom: 12px;
}

.pc-config__body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 0.46fr);
  gap: 18px;
  padding: 18px;
}

.pc-config__main,
.pc-config__map {
  min-width: 0;
}

.pc-config__main {
  display: grid;
  gap: 14px;
}

.pc-config__map {
  display: flex;
  flex-direction: column;
  border-left: 1px solid $border-color-card;
  padding-left: 18px;
}

.pc-subhead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 24px;

  h4 {
    margin: 0;
    color: $text-base;
    font-size: 14px;
    line-height: 22px;
    font-weight: 600;
  }
}

.pc-form,
.pc-map-form {
  display: grid;
  gap: 12px;
  padding: 0;

  label {
    display: grid;
    gap: 6px;

    > span {
      font-size: 13px;
      font-weight: 600;
      color: $text-secondary;
    }
  }
}

.pc-logo-panel {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0;

  &__actions {
    display: grid;
    grid-template-columns: auto;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }
}

.pc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
  }

  &:disabled {
    border-color: $border-color-card;
    background: #f6f7f9;
    color: $text-muted;
    cursor: not-allowed;
  }

  &--primary {
    border-color: $color-primary;
    background: $color-primary;
    color: #fff;

    &:hover {
      background: $color-primary-hover;
      color: #fff;
    }

    &:disabled {
      border-color: $border-color-card;
      background: #f6f7f9;
      color: $text-muted;
    }
  }

  &--text {
    border-color: transparent;
    color: $text-tertiary;
  }
}

.usage-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 18px;
  background: #fafbfc;
}

.usage-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  border: 1px solid #e7edf5;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(20, 23, 31, 0.04);

  &__head {
    display: grid;
    grid-template-columns: 36px minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
    min-height: 64px;
    padding: 14px;
    border-bottom: 1px solid #eef1f6;
    background: #fcfdff;

    h4 {
      margin: 0;
      font-size: 15px;
      line-height: 22px;
      font-weight: 600;
      color: $text-base;
    }
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: $color-primary-bg;
    color: $color-primary;

    svg {
      width: 20px;
      height: 20px;
    }
  }

  &__plan {
    padding: 2px 8px;
    border-radius: 4px;
    background: #f6f7f9;
    color: $text-secondary;
    font-size: 12px;
    white-space: nowrap;

    &--free {
      background: #f3f5f8;
      color: #64748b;
    }

    &--basic {
      background: #e8f1ff;
      color: #1d4ed8;
    }

    &--enterprise {
      background: #ece7ff;
      color: #6e4bff;
    }
  }

  &__summary {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 14px 14px 8px;

    span {
      font-size: 12px;
      color: $text-tertiary;
    }

    strong {
      font-size: 20px;
      line-height: 28px;
      color: $text-base;
    }
  }

  &__empty {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 92px;
    margin: 14px;
    padding: 12px;
    border: 1px dashed #d8e2f0;
    border-radius: 6px;
    background: #fcfdff;
    color: $text-tertiary;
    font-size: 13px;
    line-height: 20px;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    margin-top: auto;
    padding: 0 14px 14px;
  }
}

.usage-metrics {
  display: grid;
  gap: 10px;
  padding: 0 14px 12px;
}

.usage-metric {
  &__row {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
    font-size: 12px;
    line-height: 18px;

    span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: $text-secondary;
    }

    em {
      flex: 0 0 auto;
      font-style: normal;
      color: $text-tertiary;
    }
  }
}

.capacity-modal {
  display: grid;
  justify-items: center;
  padding: 10px 8px 4px;
  text-align: center;

  &__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    margin-bottom: 12px;
    border-radius: 50%;
    background: $color-primary-bg;
    color: $color-primary;

    i {
      font-size: 22px;
    }
  }

  h3 {
    margin: 0 0 8px;
    font-size: 18px;
    line-height: 26px;
    color: $text-base;
  }

  p {
    margin: 0 0 16px;
    font-size: 13px;
    line-height: 20px;
    color: $text-tertiary;
  }

  &__qr {
    width: 168px;
    height: 168px;
    object-fit: contain;
    margin-bottom: 18px;
    border: 1px solid #eef1f6;
    border-radius: 8px;
  }

  &__btn {
    min-width: 96px;
  }
}

.usage-bar {
  height: 6px;
  border-radius: 999px;
  background: #eef1f6;
  overflow: hidden;

  span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: $color-primary;
  }
}

.usage-expand-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 88px;
  height: 32px;
  padding: 0 14px;
  border: 1px solid $color-primary;
  border-radius: 6px;
  color: #fff;
  background: $color-primary;
  box-shadow: 0 2px 12px rgba(110, 75, 255, 0.28);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;

  &:hover {
    background: $color-primary-hover;
    box-shadow: 0 4px 16px rgba(110, 75, 255, 0.38);
  }

  &:active {
    background: $color-primary-active;
    transform: scale(0.96);
  }
}

@media (max-width: 1180px) {
  .pc-config__body,
  .usage-grid {
    grid-template-columns: 1fr;
  }

  .pc-config__map {
    border-left: 0;
    border-top: 1px solid $border-color-card;
    padding-left: 0;
    padding-top: 18px;
  }

  .pc-meta-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
