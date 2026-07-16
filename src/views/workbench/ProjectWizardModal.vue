<script setup lang="ts">
/**
 * 新建项目弹窗（单步，左右布局）
 * 左：选择项目模板（可选）；右：填写名称、说明、区域、访问地址、Logo
 * 选择模板后，未被用户手动修改过的字段自动填入
 */
import { ref, reactive, computed, watch } from 'vue'
import { scenarioOptions } from './templates'
import { type Project } from './workbench.mock'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [v: boolean]
  submit: [project: Project]
}>()

// ===== 表单 =====
const form = reactive({
  template: '' as string,
  name: '',
  description: '',
  region: '西南1',
  urlSuffix: '',
  logoImg: '' as string,
  logoPrompt: '' as string  // AI 生成 Logo 的描述
})

// 脏字段追踪：记录用户手动修改过的字段，模板填充时跳过这些字段
const dirty = reactive<Record<string, boolean>>({
  name: false,
  description: false,
  region: false,
  urlSuffix: false
})
// 标记字段为脏（用户输入时触发）
function markDirty(field: keyof typeof dirty) {
  dirty[field] = true
}

// 后缀校验：字母数字连字符，3-20 位
const suffixValid = computed(() => !form.urlSuffix || /^[a-z0-9-]{3,20}$/i.test(form.urlSuffix))
const formValid = computed(() => !!form.name.trim() && suffixValid.value)

// 打开时重置
watch(() => props.open, (v) => {
  if (v) {
    form.template = ''
    form.name = ''
    form.description = ''
    form.region = '西南1'
    form.urlSuffix = 'project-' + Math.random().toString(36).slice(2, 6)
    form.logoImg = ''
    form.logoPrompt = ''
    Object.keys(dirty).forEach(k => (dirty[k] = false))
    createStage.value = 'form'
    currentStep.value = 0
    templateDetail.value = null
    if (createTimer) { clearInterval(createTimer); createTimer = null }
  }
})

const availableTemplates = computed(() => scenarioOptions.filter(item => item.value !== 'blank'))
const templateDetail = ref<(typeof scenarioOptions)[number] | null>(null)

// 选择模板 → 仅填充未被用户修改过的字段
function selectTemplate(value: string) {
  // 切换选中态（再次点击同一模板 = 取消选择）
  if (form.template === value) {
    form.template = ''
    return
  }
  form.template = value
  const t = scenarioOptions.find(o => o.value === value)
  if (!t) return
  if (!dirty.name) form.name = t.name
  if (!dirty.description) form.description = t.desc
  if (!dirty.urlSuffix) form.urlSuffix = t.value + '-' + Math.random().toString(36).slice(2, 6)
}

function openTemplateDetail(t: (typeof scenarioOptions)[number]) {
  templateDetail.value = t
}

// ===== Logo 图片上传（隐藏 input）=====
const fileInput = ref<HTMLInputElement | null>(null)
function triggerUpload() {
  fileInput.value?.click()
}
function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    form.logoImg = URL.createObjectURL(file)
  }
  input.value = ''
}
function clearLogo() {
  form.logoImg = ''
}

// AI 生成 Logo（mock：根据描述生成随机占位图）
function aiGenerateLogo() {
  const prompt = form.logoPrompt.trim()
  const seed = prompt ? prompt : Math.random().toString(36).slice(2, 8)
  form.logoImg = `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(seed)}`
}

// ===== 区域选项 =====
const regions = ['西南1', '华东1', '华东2', '华北1', '华北2', '华南1', '华南2']

// ===== 创建流程：form（填写）→ creating（创建中）=====
type CreateStage = 'form' | 'creating'
const createStage = ref<CreateStage>('form')

// 创建步骤
const createSteps = [
  '初始化项目资源',
  '配置访问地址',
  '应用模板设置',
  '完成项目创建'
]
const currentStep = ref(0)
let createTimer: ReturnType<typeof setInterval> | null = null

const pendingProject = ref<Project | null>(null)
const createProgress = computed(() => Math.round(((currentStep.value + 1) / createSteps.length) * 100))

function close() {
  // 重置到表单态
  if (createTimer) { clearInterval(createTimer); createTimer = null }
  createStage.value = 'form'
  currentStep.value = 0
  emit('update:open', false)
}

function confirmCreate() {
  if (!formValid.value) return
  pendingProject.value = {
    id: `p-${Date.now()}`,
    name: form.name.trim(),
    region: form.region,
    description: form.description.trim() || '暂无说明',
    subscriptionDays: 30,
    status: 'running',
    alarmCount: 0,
    iconColor: scenarioOptions.find(o => o.value === form.template)?.iconColor || '#3b82f6',
    iconChar: form.name.trim().charAt(0)
  }
  // 进入创建中
  createStage.value = 'creating'
  currentStep.value = 0
  // 模拟步骤推进（每 700ms 推进一步）
  createTimer = setInterval(() => {
    if (currentStep.value < createSteps.length - 1) {
      currentStep.value++
    } else {
      // 最后一步完成
      if (createTimer) { clearInterval(createTimer); createTimer = null }
      if (pendingProject.value) {
        emit('submit', pendingProject.value)
      }
      close()
    }
  }, 700)
}
</script>

<template>
  <a-modal
    :open="open"
    :width="createStage === 'form' ? 940 : 520"
    centered
    :footer="null"
    :closable="createStage === 'form'"
    wrap-class-name="project-wizard-modal"
    @cancel="close"
  >
    <template #title>
      <span>{{
        createStage === 'creating' ? '正在创建项目'
        : '新建项目'
      }}</span>
    </template>

    <!-- ===== 表单态：分隔线 + 左右布局 + footer ===== -->
    <template v-if="createStage === 'form'">
      <!-- 标题栏下方：分隔线 -->
      <div class="pw-topbar">
        <div class="pw-topbar__line" />
      </div>
    <div class="pw-layout">
      <!-- ===== 左：选择模板 ===== -->
      <div class="pw-left">
        <div class="pw-section-title">选择模板</div>
        <div class="tpl-list">
          <div
            v-for="t in availableTemplates"
            :key="t.value"
            class="tpl-item"
            :class="{ active: form.template === t.value }"
            @click="selectTemplate(t.value)"
          >
            <div class="tpl-item__logo" :style="{ background: t.iconColor }">
              <i :class="t.icon" style="font-size:18px;color:#fff" />
            </div>
            <div class="tpl-item__text">
              <span class="tpl-item__name">{{ t.label }}</span>
              <span class="tpl-item__desc">{{ t.desc }}</span>
            </div>
            <button
              class="tpl-item__detail"
              type="button"
              @mousedown.stop
              @click.stop.prevent="openTemplateDetail(t)"
            >
              查看详情
            </button>
          </div>
        </div>
      </div>

      <!-- ===== 右：基本信息 ===== -->
      <div class="pw-right">
        <div class="pw-right-head">
          <div class="pw-section-title">基本信息</div>
        </div>

        <div class="pw-right-body">
          <!-- 第一行：项目名称 -->
          <div class="pw-row">
            <div class="pw-field">
              <label class="pw-label"><span class="req">*</span>项目名称</label>
              <a-input
                v-model:value="form.name"
                placeholder="请输入项目名称"
                :maxlength="30"
                @input="markDirty('name')"
              />
            </div>
          </div>

          <!-- 第二行：所在区域 -->
          <div class="pw-row">
            <div class="pw-field">
              <label class="pw-label">所在区域</label>
              <a-select
                v-model:value="form.region"
                class="pw-field__ctl"
                :options="regions.map(r => ({ value: r, label: r }))"
                @change="markDirty('region')"
              />
            </div>
          </div>

          <!-- 第三行：项目地址 -->
          <div class="pw-row">
            <div class="pw-field">
              <label class="pw-label"><span class="req">*</span>项目地址</label>
              <div class="url-wrap">
                <span class="url-prefix">https://jetlinks.cn/p/</span>
                <a-input
                  v-model:value="form.urlSuffix"
                  class="url-suffix"
                  placeholder="仅字母、数字、连字符"
                  @input="markDirty('urlSuffix')"
                />
              </div>
              <span v-if="!suffixValid" class="pw-error">后缀仅允许字母、数字、连字符（3-20 位）</span>
            </div>
          </div>

          <!-- 第四行：项目说明 -->
          <div class="pw-row pw-row--desc">
            <div class="pw-field">
              <label class="pw-label">项目说明</label>
              <a-textarea
                v-model:value="form.description"
                placeholder="请输入项目说明"
                :rows="2"
                :maxlength="100"
                @input="markDirty('description')"
              />
            </div>
          </div>

          <!-- 第五行：Logo（上传 + AI 生成）-->
          <div class="pw-row pw-row--logo">
            <div class="pw-field">
              <label class="pw-label">项目 Logo</label>
              <div class="logo-area">
                <!-- 上传 -->
                <div v-if="form.logoImg" class="logo-preview">
                  <img :src="form.logoImg" alt="Logo" />
                  <button class="logo-clear" @click="clearLogo">
                    <i class="i-ant-design-close-outlined" />
                  </button>
                </div>
                <button v-else class="logo-upload" @click="triggerUpload">
                  <i class="i-ant-design-plus-outlined" />
                  <span>上传 Logo</span>
                </button>
                <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />

                <!-- AI 生成输入框（生成按钮内嵌右侧）-->
                <div class="logo-ai">
                  <a-input
                    v-model:value="form.logoPrompt"
                    placeholder="描述 Logo 风格，AI 帮你生成"
                    @keyup.enter="aiGenerateLogo"
                  >
                    <template #suffix>
                      <button
                        class="logo-ai-btn"
                        :disabled="!form.logoPrompt.trim()"
                        @click="aiGenerateLogo"
                      >
                        <i class="i-lucide-wand-sparkles" />
                        生成
                      </button>
                    </template>
                  </a-input>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="pw-footer">
      <a-button @click="close">取消</a-button>
      <a-button type="primary" :disabled="!formValid" @click="confirmCreate">确认创建</a-button>
    </div>
    </template><!-- /表单态 -->

    <!-- ===== 创建中：加载动画 + 步骤 ===== -->
    <template v-else-if="createStage === 'creating'">
      <div class="creating">
        <div class="creating__status">
          <div class="creating__spinner">
            <i class="i-ant-design-loading-outlined" />
          </div>
          <div class="creating__text">
            <div class="creating__title">正在创建「{{ pendingProject?.name }}」</div>
            <div class="creating__sub">系统正在初始化项目资源，完成后将进入下一步配置</div>
          </div>
        </div>
        <div class="creating__progress">
          <div class="creating__progress-head">
            <span>{{ createSteps[currentStep] }}</span>
            <strong>{{ createProgress }}%</strong>
          </div>
          <div class="creating__progress-bar">
            <i :style="{ width: createProgress + '%' }" />
          </div>
        </div>
        <div class="creating__steps">
          <div
            v-for="(s, i) in createSteps"
            :key="i"
            class="cs-item"
            :class="{ done: i < currentStep, active: i === currentStep }"
          >
            <span class="cs-icon">
              <i v-if="i < currentStep" class="i-ant-design-check-circle-filled" />
              <i v-else-if="i === currentStep" class="i-ant-design-loading-outlined" />
              <i v-else class="i-ant-design-clock-circle-outlined" />
            </span>
            <span class="cs-label">{{ s }}</span>
          </div>
        </div>
      </div>
    </template>

  </a-modal>

  <a-modal
    :open="!!templateDetail"
    :width="420"
    :z-index="2200"
    centered
    :footer="null"
    title="模板详情"
    wrap-class-name="project-template-detail-modal"
    @cancel="templateDetail = null"
  >
    <div v-if="templateDetail" class="tpl-detail">
      <div class="tpl-detail__icon" :style="{ background: templateDetail.iconColor }">
        <i :class="templateDetail.icon" />
      </div>
      <div class="tpl-detail__main">
        <h3>{{ templateDetail.label }}</h3>
        <p>{{ templateDetail.desc }}</p>
        <div class="tpl-detail__meta">
          <span>默认名称</span>
          <strong>{{ templateDetail.name }}</strong>
        </div>
      </div>
    </div>
  </a-modal>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

/* ===== 标题栏下方：分隔线 ===== */
.pw-topbar {
  margin-bottom: 16px;
}

.pw-topbar__line {
  height: 1px;
  background: $border-color-card;
}

/* 右侧标题行：基本信息 */
.pw-right-head {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 14px;
}

/* ===== 左右布局 ===== */
.pw-layout {
  display: flex;
  gap: 20px;
  min-height: 420px;
}

.pw-left {
  width: 320px;
  flex-shrink: 0;
  border-right: 1px solid $border-color-card;
  padding-right: 20px;
  display: flex;
  flex-direction: column;
}

.pw-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.pw-right-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-rows: 68px 68px 68px minmax(120px, 1fr) 104px;
  row-gap: 12px;
}

.pw-section-title {
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
  margin-bottom: 14px;
}

/* 右侧标题在 head 容器内，去掉独立 margin，由 head flex 居中 */
.pw-right-head .pw-section-title {
  margin-bottom: 0;
  line-height: 26px;
}

/* ===== 模板列表（左）===== */
.tpl-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  /* 默认隐藏滚动条 */
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;

  /* hover 时显示滚动条 */
  &:hover {
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  }

  /* webkit 滚动条 */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: transparent;
    border-radius: 3px;
    transition: background 0.2s;
  }

  &:hover::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
  }
}

.tpl-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: $saas-primary;
  }

  &.active {
    border-color: $saas-primary;
    background: $saas-primary-bg;
  }
}

.tpl-item__logo {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 17px;
  font-weight: 600;
  flex-shrink: 0;
}

.tpl-item__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.tpl-item__name {
  font-size: 13px;
  font-weight: 600;
  color: $text-base;
}

.tpl-item__desc {
  font-size: 11px;
  color: $text-muted;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tpl-item__detail {
  flex-shrink: 0;
  height: 26px;
  padding: 0 10px;
  border: 1px solid $border-color-card;
  border-radius: 5px;
  background: #fff;
  color: $saas-primary;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: $saas-primary;
    background: $saas-primary-bg;
  }
}

/* ===== 表单（右）===== */
.pw-row {
  min-height: 0;
  padding-bottom: 12px;

  &--desc,
  &--logo {
    display: flex;
  }

  &--desc .pw-field,
  &--logo .pw-field {
    flex: 1;
  }

  &--desc {
    padding-bottom: 12px;
  }

  &--desc :deep(.ant-input) {
    flex: 1;
    min-height: 98px;
    resize: none;
  }
}

.pw-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &__ctl {
    width: 100%;
  }
}

.pw-label {
  font-size: 13px;
  font-weight: 500;
  color: $text-secondary;

  .req {
    color: #ff4d4f;
    margin-right: 2px;
  }
}

.pw-error {
  font-size: 12px;
  color: #ff4d4f;
}

/* 访问地址：统一边框容器，内部无缝拼接 */
.url-wrap {
  display: flex;
  align-items: stretch;
  border: 1px solid $border-color-input;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: $saas-primary;
  }
}

.url-prefix {
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: $bg-page;
  font-size: 13px;
  color: $text-muted;
  white-space: nowrap;
}

.url-suffix {
  flex: 1;

  /* 去掉 a-input 的 affix-wrapper 边框和圆角，让外层统一控制 */
  :deep(.ant-input-affix-wrapper) {
    border: none;
    border-radius: 0;
    box-shadow: none !important;
  }

  :deep(.ant-input-affix-wrapper-focused) {
    border: none;
    box-shadow: none !important;
  }

  :deep(.ant-input) {
    border: none;
    border-radius: 0;
    box-shadow: none !important;
  }
}

/* Logo 区：上传 + AI 输入 */
.logo-area {
  display: flex;
  align-items: stretch;
  gap: 12px;
  flex: 1;
}

/* AI 生成输入框（与上传按钮等高 64px）*/
.logo-ai {
  flex: 1;
  display: flex;

  :deep(.ant-input-affix-wrapper) {
    flex: 1;
    min-height: 78px;
    align-items: flex-end;
    padding: 0 8px 8px 12px;
  }

  :deep(.ant-input) {
    height: 28px;
  }
}

/* 内嵌生成按钮（输入框右下角）*/
.logo-ai-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 6px;
  background: $saas-primary;
  color: #fff;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  margin-left: 4px;

  i {
    font-size: 13px;
  }

  &:hover:not(:disabled) {
    background: $saas-primary-hover;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.logo-preview {
  position: relative;
  width: 78px;
  height: 78px;

  img {
    width: 100%;
    height: 100%;
    border-radius: 10px;
    object-fit: cover;
    border: 1px solid $border-color-card;
  }
}

.logo-clear {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: #ff4d4f;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;

  i {
    font-size: 10px;
  }
}

.logo-upload {
  width: 78px;
  height: 78px;
  border: 1px dashed $border-color-input;
  border-radius: 10px;
  background: $bg-page;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  color: $text-muted;
  font-size: 11px;

  i {
    font-size: 22px;
  }

  &:hover {
    border-color: $saas-primary;
    color: $saas-primary;
  }
}

/* ===== 底部按钮 ===== */
.pw-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
  padding: 12px 0;
  border-top: 1px solid $border-color-card;
}

/* ===== 创建中 ===== */
.creating {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 4px 12px;

  &__status {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 18px;
    border: 1px solid $border-color-card;
    border-radius: 12px;
    background: linear-gradient(135deg, #fbfaff 0%, #f7fbff 100%);
  }

  &__spinner {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    color: $saas-primary;
    flex-shrink: 0;

    i {
      animation: pw-spin 1s linear infinite;
    }
  }

  &__text {
    min-width: 0;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    color: $text-base;
    margin-bottom: 8px;
  }

  &__sub {
    font-size: 13px;
    color: $text-muted;
    line-height: 1.5;
  }

  &__progress {
    padding: 0 4px;
  }

  &__progress-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 13px;
    color: $text-secondary;

    strong {
      color: $saas-primary;
      font-weight: 650;
    }
  }

  &__progress-bar {
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
    background: $border-color-card;

    i {
      display: block;
      height: 100%;
      border-radius: 999px;
      background: linear-gradient(90deg, $saas-primary 0%, #8b5cf6 100%);
      transition: width 0.25s ease;
    }
  }

  &__steps {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0 4px;
  }
}

@keyframes pw-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.cs-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid #edf0f5;
  background: #f4f7fb;

  &.done {
    border-color: rgba(50, 180, 166, 0.14);
    background: #f0fbf8;
  }

  &.active {
    border-color: rgba(110, 75, 255, 0.16);
    background: #f4f1ff;
  }

  .cs-icon {
    font-size: 16px;
    display: flex;
    align-items: center;
  }

  .cs-label {
    font-size: 13px;
    color: $text-muted;
    transition: color 0.2s;
  }

  &.done .cs-icon {
    color: $color-online;

    i {
      animation: none;
    }
  }

  &.done .cs-label {
    color: $text-secondary;
  }

  &.active .cs-icon {
    color: $saas-primary;
  }

  &.active .cs-label {
    color: $text-base;
    font-weight: 500;
  }
}

.tpl-detail {
  display: flex;
  gap: 14px;
}

.tpl-detail__icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  i {
    font-size: 24px;
    color: #fff;
  }
}

.tpl-detail__main {
  min-width: 0;

  h3 {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 600;
    color: $text-base;
  }

  p {
    margin: 0 0 14px;
    font-size: 13px;
    line-height: 1.6;
    color: $text-secondary;
  }
}

.tpl-detail__meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 8px;
  background: $bg-page;

  span {
    font-size: 12px;
    color: $text-muted;
  }

  strong {
    font-size: 13px;
    color: $text-base;
  }
}

/* ===== 创建成功 ===== */
.success {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28px 0 20px;

  &__icon {
    font-size: 56px;
    color: $color-online;
    margin-bottom: 20px;
  }

  &__title {
    font-size: 18px;
    font-weight: 600;
    color: $text-base;
    margin-bottom: 8px;
  }

  &__sub {
    font-size: 13px;
    color: $text-muted;
    margin-bottom: 28px;
  }

  &__actions {
    display: flex;
    gap: 12px;
  }
}
</style>

<!-- 全局样式：补 antd modal header/close 样式（因 importStyle:false 默认样式未注入）-->
<style lang="scss">
.project-wizard-modal {
  /* content 不留内边距，header/body/footer 各自控制间距 */
  .ant-modal-content {
    padding: 0;
  }

  .ant-modal-header {
    margin-bottom: 0;
    padding: 12px 24px;
  }

  .ant-modal-title {
    display: flex;
    align-items: center;
    font-size: 16px;
    font-weight: 600;
  }

  /* 关闭按钮：content padding 已归零，top 对齐 header 中点，右边对齐分隔线 */
  .ant-modal-close {
    top: 13px;
    inset-inline-end: 24px;
  }

  .ant-modal-close-x {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    font-size: 16px;
  }

  /* body 上下不留额外 padding，由 header/footer 各自控制 */
  .ant-modal-body {
    padding: 0 24px;
  }
}
</style>
