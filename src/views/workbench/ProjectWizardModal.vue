<script setup lang="ts">
/**
 * 新建项目向导（三步）
 * ① 选模板 → ② 填信息（含 Logo 双模式）→ ③ 接入网关（三方式）→ 确认创建
 */
import { ref, reactive, computed, watch } from 'vue'
import { scenarioOptions } from './templates'
import { gateways, type Project, type Gateway } from './workbench.mock'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{
  'update:open': [v: boolean]
  submit: [project: Project, gatewayId?: string]
}>()

// ===== 步骤索引 =====
const current = ref(0)
const steps = [
  { title: '选择模板', desc: '选择一个场景模板快速开始' },
  { title: '填写信息', desc: '完善项目基本信息' },
  { title: '接入网关', desc: '绑定网关开始采集数据' }
]

// ===== 表单 =====
const form = reactive({
  // 步骤1
  template: '' as string,
  // 步骤2
  name: '',
  description: '',
  region: '西南1',
  urlSuffix: '',
  logoMode: 'char' as 'char' | 'image',
  logoChar: '',
  logoColor: '#3b82f6',
  logoImg: '' as string,
  // 步骤3
  gatewayMode: 'select' as 'select' | 'sn' | 'scan',
  selectedGatewayId: '' as string,
  snInput: '',
  confirmedGateway: null as Gateway | null
})

// Logo 预设色卡
const logoColors = [
  '#3b82f6', '#f59e0b', '#10b981', '#8b5cf6',
  '#ec4899', '#06b6d4', '#ef4444', '#6366f1'
]

// 打开时重置
watch(() => props.open, (v) => {
  if (v) {
    current.value = 0
    form.template = ''
    form.name = ''
    form.description = ''
    form.region = '西南1'
    form.urlSuffix = ''
    form.logoMode = 'char'
    form.logoChar = ''
    form.logoColor = '#3b82f6'
    form.logoImg = ''
    form.gatewayMode = 'select'
    form.selectedGatewayId = ''
    form.snInput = ''
    form.confirmedGateway = null
  }
})

// 名称变化 → 自动更新 logoChar（char 模式且用户未手改时）
watch(() => form.name, (n) => {
  if (form.logoMode === 'char' && n) {
    form.logoChar = n.charAt(0)
  }
})

// 模板选中 → 预填名称/logo/色
function selectTemplate(value: string) {
  form.template = value
  const t = scenarioOptions.find(o => o.value === value)
  if (t) {
    form.name = t.name
    form.logoChar = t.logo
    form.logoColor = t.iconColor
    form.description = t.desc
  }
}

// ===== 步骤校验 =====
const step1Valid = computed(() => !!form.template)
// 后缀校验：字母数字连字符，3-20 位
const suffixValid = computed(() => !form.urlSuffix || /^[a-z0-9-]{3,20}$/i.test(form.urlSuffix))
const step2Valid = computed(() => !!form.name.trim() && suffixValid.value)

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
function clearLogoImg() {
  form.logoImg = ''
}
// AI 生成（mock）
function aiGenerateLogo() {
  if (form.logoMode === 'char') {
    // 随机换色
    form.logoColor = logoColors[Math.floor(Math.random() * logoColors.length)]
  } else {
    // 随机占位图
    const seed = Math.floor(Math.random() * 1000)
    form.logoImg = `https://api.dicebear.com/7.x/shapes/svg?seed=${seed}`
  }
}

// ===== 步骤3：网关 =====
// 未绑定项目的网关（可选择的）
const unboundGateways = computed(() => gateways.value.filter(g => g.projectId === null))

function onSelectGateway(id: string) {
  form.selectedGatewayId = id
  const g = unboundGateways.value.find(x => x.id === id)
  form.confirmedGateway = g || null
}

// SN 查找（mock：匹配现有网关 SN，或返回一个新网关）
function searchBySn() {
  const sn = form.snInput.trim()
  if (!sn) return
  const found = gateways.value.find(g => g.sn.toLowerCase() === sn.toLowerCase())
  if (found) {
    form.confirmedGateway = found
  } else {
    // mock 一个新发现的网关
    form.confirmedGateway = {
      id: `new-${Date.now()}`,
      sn,
      projectId: null,
      projectName: null,
      model: 'JetLinks-Edge-2000',
      cpu: 0,
      memory: 0,
      disk: 0,
      status: 'online'
    }
  }
}

// 扫码（mock）
function simulateScan() {
  form.confirmedGateway = {
    id: `scan-${Date.now()}`,
    sn: 'JLE-SCAN-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    projectId: null,
    projectName: null,
    model: 'JetLinks-Edge-3000',
    cpu: 15,
    memory: 22,
    disk: 10,
    status: 'online'
  }
}

function clearGateway() {
  form.confirmedGateway = null
  form.selectedGatewayId = ''
  form.snInput = ''
}

// ===== 步骤导航 =====
function next() {
  if (current.value < 2) current.value++
}
function prev() {
  if (current.value > 0) current.value--
}
function close() {
  emit('update:open', false)
}

// ===== 提交 =====
function confirmCreate() {
  const id = `p-${Date.now()}`
  const project: Project = {
    id,
    name: form.name.trim(),
    region: form.region,
    description: form.description.trim() || '暂无说明',
    subscriptionDays: 30,
    status: 'running',
    alarmCount: 0,
    iconColor: form.logoMode === 'char' ? form.logoColor : '#3b82f6',
    iconChar: form.logoMode === 'char' ? (form.logoChar || form.name.charAt(0)) : form.name.charAt(0)
  }
  const gwId = form.confirmedGateway?.id
  emit('submit', project, gwId)
  emit('update:open', false)
}
</script>

<template>
  <a-modal
    :open="open"
    :width="720"
    centered
    :footer="null"
    title="新建项目"
    wrap-class-name="project-wizard-modal"
    @cancel="close"
  >
    <!-- 步骤指示器 -->
    <a-steps :current="current" size="small" class="wizard-steps">
      <a-step v-for="(s, i) in steps" :key="i" :title="s.title" :description="s.desc" />
    </a-steps>

    <div class="wizard-body">
      <!-- ===== 步骤1：选模板 ===== -->
      <div v-if="current === 0" class="step-panel">
        <div class="tpl-grid">
          <div
            v-for="t in scenarioOptions"
            :key="t.value"
            class="tpl-card"
            :class="{ active: form.template === t.value }"
            @click="selectTemplate(t.value)"
          >
            <div class="tpl-card__logo" :style="{ background: t.iconColor }">{{ t.logo }}</div>
            <div class="tpl-card__name">{{ t.label }}</div>
            <div class="tpl-card__desc">{{ t.desc }}</div>
            <i v-if="form.template === t.value" class="i-ant-design-check-circle-filled tpl-card__check" />
          </div>
        </div>
      </div>

      <!-- ===== 步骤2：填信息 ===== -->
      <div v-else-if="current === 1" class="step-panel">
        <!-- 项目名称 -->
        <div class="form-row">
          <label class="form-label"><span class="req">*</span>项目名称</label>
          <a-input v-model:value="form.name" placeholder="请输入项目名称" :maxlength="30" />
        </div>

        <!-- 项目说明 -->
        <div class="form-row">
          <label class="form-label">项目说明</label>
          <a-textarea
            v-model:value="form.description"
            placeholder="请输入项目说明"
            :rows="2"
            :maxlength="100"
          />
        </div>

        <!-- 项目区域 -->
        <div class="form-row">
          <label class="form-label">所在区域</label>
          <a-select
            v-model:value="form.region"
            class="form-select"
            :options="['西南1','华东1','华东2','华北1','华北2','华南1','华南2'].map(r => ({ value: r, label: r }))"
          />
        </div>

        <!-- 访问地址 -->
        <div class="form-row">
          <label class="form-label"><span class="req">*</span>项目访问地址</label>
          <div class="url-wrap">
            <span class="url-prefix">https://jetlinks.cn/p/</span>
            <a-input
              v-model:value="form.urlSuffix"
              class="url-suffix"
              placeholder="仅字母、数字、连字符"
            />
          </div>
          <span v-if="!suffixValid" class="form-error">后缀仅允许字母、数字、连字符（3-20 位）</span>
        </div>

        <!-- 选择 Logo -->
        <div class="form-row">
          <label class="form-label">项目 Logo</label>
          <div class="logo-area">
            <!-- 模式切换 -->
            <div class="logo-modes">
              <button
                class="logo-mode-btn"
                :class="{ active: form.logoMode === 'char' }"
                @click="form.logoMode = 'char'"
              >文字 Logo</button>
              <button
                class="logo-mode-btn"
                :class="{ active: form.logoMode === 'image' }"
                @click="form.logoMode = 'image'"
              >图片 Logo</button>
              <button class="logo-ai-btn" @click="aiGenerateLogo">
                <i class="i-lucide-wand-sparkles" /> AI 生成
              </button>
            </div>

            <!-- char 模式 -->
            <div v-if="form.logoMode === 'char'" class="logo-char-wrap">
              <div class="logo-preview" :style="{ background: form.logoColor }">
                {{ form.logoChar || '?' }}
              </div>
              <div class="logo-char-edit">
                <a-input v-model:value="form.logoChar" placeholder="单字" :maxlength="1" class="logo-char-input" />
                <div class="logo-color-chips">
                  <button
                    v-for="c in logoColors"
                    :key="c"
                    class="logo-color-chip"
                    :class="{ active: form.logoColor === c }"
                    :style="{ background: c }"
                    @click="form.logoColor = c"
                  />
                </div>
              </div>
            </div>

            <!-- image 模式 -->
            <div v-else class="logo-img-wrap">
              <div v-if="form.logoImg" class="logo-img-preview">
                <img :src="form.logoImg" alt="Logo" />
                <button class="logo-img-clear" @click="clearLogoImg">
                  <i class="i-ant-design-close-outlined" />
                </button>
              </div>
              <button v-else class="logo-img-upload" @click="triggerUpload">
                <i class="i-ant-design-plus-outlined" />
                <span>上传图片</span>
              </button>
              <input ref="fileInput" type="file" accept="image/*" hidden @change="onFileChange" />
            </div>
          </div>
        </div>
      </div>

      <!-- ===== 步骤3：接入网关 ===== -->
      <div v-else class="step-panel">
        <!-- 已确认网关 → 展示确认卡 -->
        <div v-if="form.confirmedGateway" class="gw-confirm">
          <div class="gw-confirm__title">已选择网关，请确认：</div>
          <div class="gw-confirm__card">
            <div class="gw-confirm__row">
              <span class="gw-confirm__label">SN 号</span>
              <span class="gw-confirm__val">{{ form.confirmedGateway.sn }}</span>
            </div>
            <div class="gw-confirm__row">
              <span class="gw-confirm__label">型号</span>
              <span class="gw-confirm__val">{{ form.confirmedGateway.model }}</span>
            </div>
            <div class="gw-confirm__row">
              <span class="gw-confirm__label">状态</span>
              <span class="gw-confirm__val" :class="form.confirmedGateway.status">
                {{ form.confirmedGateway.status === 'online' ? '在线' : '离线' }}
              </span>
            </div>
          </div>
          <button class="gw-confirm__reselect" @click="clearGateway">重新选择</button>
        </div>

        <!-- 未确认 → 三种方式 -->
        <div v-else>
          <!-- 方式切换 -->
          <div class="gw-modes">
            <button
              class="gw-mode-btn"
              :class="{ active: form.gatewayMode === 'select' }"
              @click="form.gatewayMode = 'select'"
            >从已有网关选择</button>
            <button
              class="gw-mode-btn"
              :class="{ active: form.gatewayMode === 'sn' }"
              @click="form.gatewayMode = 'sn'"
            >输入 SN 号</button>
            <button
              class="gw-mode-btn"
              :class="{ active: form.gatewayMode === 'scan' }"
              @click="form.gatewayMode = 'scan'"
            >扫码加入</button>
          </div>

          <!-- 选择已有 -->
          <div v-if="form.gatewayMode === 'select'" class="gw-mode-panel">
            <div v-if="unboundGateways.length" class="gw-pick-list">
              <div
                v-for="g in unboundGateways"
                :key="g.id"
                class="gw-pick-item"
                :class="{ active: form.selectedGatewayId === g.id }"
                @click="onSelectGateway(g.id)"
              >
                <i class="i-ant-design-hdd-outlined" />
                <div class="gw-pick-info">
                  <span class="gw-pick-sn">{{ g.sn }}</span>
                  <span class="gw-pick-model">{{ g.model }}</span>
                </div>
                <span class="gw-pick-status" :class="g.status">{{ g.status === 'online' ? '在线' : '离线' }}</span>
              </div>
            </div>
            <div v-else class="gw-empty">暂无未绑定项目的网关</div>
          </div>

          <!-- SN 号 -->
          <div v-else-if="form.gatewayMode === 'sn'" class="gw-mode-panel">
            <div class="gw-sn-input">
              <a-input
                v-model:value="form.snInput"
                placeholder="请输入网关 SN 号"
                @keyup.enter="searchBySn"
              />
              <a-button type="primary" :disabled="!form.snInput.trim()" @click="searchBySn">查找</a-button>
            </div>
            <p class="gw-hint">输入网关底部的 SN 编号，系统将自动识别并展示网关信息。</p>
          </div>

          <!-- 扫码 -->
          <div v-else class="gw-mode-panel">
            <div class="gw-scan">
              <div class="gw-scan-frame">
                <i class="i-ant-design-scan-outlined" />
              </div>
              <a-button type="primary" @click="simulateScan">模拟扫码</a-button>
              <p class="gw-hint">扫描网关机身的二维码即可快速加入</p>
            </div>
          </div>
        </div>

        <!-- 跳过提示 -->
        <div class="gw-skip">无需现在接入，可在项目创建后随时绑定网关</div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="wizard-footer">
      <a-button @click="close">取消</a-button>
      <div class="wizard-footer-right">
        <a-button v-if="current > 0" @click="prev">上一步</a-button>
        <a-button v-if="current < 2" type="primary" :disabled="current === 0 ? !step1Valid : !step2Valid" @click="next">
          下一步
        </a-button>
        <a-button v-else type="primary" @click="confirmCreate">确认创建</a-button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

/* ===== a-steps 样式兜底（因 importStyle:false，antd 默认样式不注入）===== */
.wizard-steps {
  margin-bottom: 28px;

  :deep(.ant-steps-item-title) {
    font-size: 14px;
    font-weight: 500;
  }

  :deep(.ant-steps-item-description) {
    font-size: 12px !important;
  }

  :deep(.ant-steps-item-icon) {
    .ant-steps-icon {
      font-size: 14px;
    }
  }

  :deep(.ant-steps-item-finish .ant-steps-item-icon) {
    background-color: $saas-primary;
    border-color: $saas-primary;

    .ant-steps-icon {
      color: #fff;
    }
  }

  :deep(.ant-steps-item-active .ant-steps-item-icon) {
    background-color: #fff;
    border-color: $saas-primary;

    .ant-steps-icon {
      color: $saas-primary;
    }
  }

  :deep(.ant-steps-item-active:not(.ant-steps-item-process) .ant-steps-item-icon) {
    background-color: $saas-primary;
  }

  :deep(.ant-steps-item-finish > .ant-steps-item-container > .ant-steps-item-tail::after) {
    background-color: $saas-primary;
  }
}

.wizard-body {
  min-height: 320px;
  max-height: 460px;
  overflow-y: auto;
}

/* ===== 步骤1：模板选择 ===== */
.tpl-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.tpl-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 18px 14px;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;

  &:hover {
    border-color: $saas-primary;
  }

  &.active {
    border-color: $saas-primary;
    background: $saas-primary-bg;
  }
}

.tpl-card__logo {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 600;
}

.tpl-card__name {
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
}

.tpl-card__desc {
  font-size: 12px;
  color: $text-muted;
  line-height: 1.5;
}

.tpl-card__check {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 18px;
  color: $saas-primary;
}

/* ===== 步骤2：表单 ===== */
.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: $text-secondary;

  .req {
    color: #ff4d4f;
    margin-right: 2px;
  }
}

.form-select {
  width: 100%;
}

.form-error {
  font-size: 12px;
  color: #ff4d4f;
}

/* 访问地址 */
.url-wrap {
  display: flex;
  align-items: center;
  gap: 0;
}

.url-prefix {
  height: 32px;
  line-height: 32px;
  padding: 0 12px;
  background: $bg-page;
  border: 1px solid $border-color-input;
  border-right: none;
  border-radius: 6px 0 0 6px;
  font-size: 13px;
  color: $text-muted;
  white-space: nowrap;
}

.url-suffix {
  flex: 1;

  :deep(.ant-input) {
    border-radius: 0 6px 6px 0;
  }
}

/* Logo 区域 */
.logo-area {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.logo-modes {
  display: flex;
  gap: 8px;
}

.logo-mode-btn,
.logo-ai-btn {
  height: 30px;
  padding: 0 14px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  color: $text-secondary;
  transition: all 0.2s;

  i {
    font-size: 14px;
  }
}

.logo-mode-btn.active {
  border-color: $saas-primary;
  background: $saas-primary-bg;
  color: $saas-primary;
}

.logo-ai-btn {
  border-color: $saas-primary;
  color: $saas-primary;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: $saas-primary-bg;
  }
}

/* char 模式 */
.logo-char-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
}

.logo-preview {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 600;
  flex-shrink: 0;
}

.logo-char-edit {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.logo-char-input {
  width: 60px;
}

.logo-color-chips {
  display: flex;
  gap: 8px;
}

.logo-color-chip {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  padding: 0;
  transition: transform 0.15s;

  &:hover {
    transform: scale(1.15);
  }

  &.active {
    box-shadow: 0 0 0 2px $saas-primary;
  }
}

/* image 模式 */
.logo-img-preview {
  position: relative;
  width: 56px;
  height: 56px;

  img {
    width: 100%;
    height: 100%;
    border-radius: 12px;
    object-fit: cover;
  }
}

.logo-img-clear {
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

.logo-img-upload {
  width: 56px;
  height: 56px;
  border: 1px dashed $border-color-input;
  border-radius: 12px;
  background: $bg-page;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  color: $text-muted;
  font-size: 11px;

  i {
    font-size: 20px;
  }

  &:hover {
    border-color: $saas-primary;
    color: $saas-primary;
  }
}

/* ===== 步骤3：网关 ===== */
/* 方式切换 */
.gw-modes {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.gw-mode-btn {
  height: 32px;
  padding: 0 16px;
  border: 1px solid $border-color-card;
  border-radius: 9999px;
  background: #fff;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  color: $text-secondary;
  transition: all 0.2s;

  &:hover {
    border-color: $saas-primary;
    color: $saas-primary;
  }

  &.active {
    border-color: $saas-primary;
    background: $saas-primary-bg;
    color: $saas-primary;
  }
}

.gw-mode-panel {
  min-height: 120px;
}

/* 已有网关列表 */
.gw-pick-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gw-pick-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  > i {
    font-size: 18px;
    color: $saas-primary;
  }

  &:hover,
  &.active {
    border-color: $saas-primary;
    background: $saas-primary-bg;
  }
}

.gw-pick-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.gw-pick-sn {
  font-size: 13px;
  font-weight: 600;
  color: $text-base;
  font-family: 'SF Mono', Menlo, Consolas, monospace;
}

.gw-pick-model {
  font-size: 12px;
  color: $text-muted;
}

.gw-pick-status {
  font-size: 12px;
  padding: 2px 8px;
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

/* SN 输入 */
.gw-sn-input {
  display: flex;
  gap: 8px;
}

.gw-hint {
  margin: 12px 0 0;
  font-size: 12px;
  color: $text-muted;
}

/* 扫码 */
.gw-scan {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 20px 0;
}

.gw-scan-frame {
  width: 120px;
  height: 120px;
  border: 2px dashed $border-color-input;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;

  i {
    font-size: 40px;
    color: $text-muted;
  }
}

/* 确认卡 */
.gw-confirm {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.gw-confirm__title {
  font-size: 14px;
  color: $text-secondary;
}

.gw-confirm__card {
  background: $bg-page;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gw-confirm__row {
  display: flex;
  align-items: center;

  .gw-confirm__label {
    width: 60px;
    font-size: 13px;
    color: $text-muted;
  }

  .gw-confirm__val {
    font-size: 13px;
    color: $text-base;
    font-weight: 500;

    &.online {
      color: $color-online;
    }

    &.offline {
      color: $text-muted;
    }
  }
}

.gw-confirm__reselect {
  align-self: flex-start;
  border: none;
  background: transparent;
  color: $saas-primary;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  padding: 0;

  &:hover {
    opacity: 0.8;
  }
}

.gw-empty {
  text-align: center;
  padding: 40px 0;
  color: $text-muted;
  font-size: 13px;
}

/* 跳过提示 */
.gw-skip {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px dashed $border-color-card;
  text-align: center;
  font-size: 12px;
  color: $text-muted;
}

/* ===== 底部按钮 ===== */
.wizard-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid $border-color-card;
}

.wizard-footer-right {
  display: flex;
  gap: 8px;
}
</style>
