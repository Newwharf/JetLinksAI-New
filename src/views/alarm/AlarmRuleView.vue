<script setup lang="ts">
/**
 * 告警规则管理
 * 列表 + 新建/编辑弹窗（5 步骤向导）
 */
import { message } from 'ant-design-vue'
import { useAppStore, type GuideStep } from '@/stores/app'
import alarmGuideBasic from '@/assets/alarmGuide/gaojingyindao/alarm-guide-basic.svg'
import alarmGuideAlgorithm from '@/assets/alarmGuide/gaojingyindao/alarm-guide-algorithm.svg'
import alarmGuideCamera from '@/assets/alarmGuide/gaojingyindao/alarm-guide-camera.svg'
import alarmGuideSchedule from '@/assets/alarmGuide/gaojingyindao/alarm-guide-schedule.svg'
import alarmGuideNotify from '@/assets/alarmGuide/gaojingyindao/alarm-guide-notify.svg'
import {
  alarmRules, scenes, cameraTree, userOptions,
  scheduleOptions, weekDays, collectCameras, getCamerasInNode,
  notifyCategoryOptions, notifyTemplates,
  type AlarmRule, type AlarmLevel, type CameraTreeNode, type NotifyCategory
} from './rule-mock'

// ===== 列表搜索 =====
const searchKey = ref('')
const filteredRules = computed(() => {
  const kw = searchKey.value.trim().toLowerCase()
  if (!kw) return alarmRules.value
  return alarmRules.value.filter(r => r.name.toLowerCase().includes(kw))
})

// 行操作
function toggleRule(rule: AlarmRule) {
  rule.enabled = !rule.enabled
  message.success(`规则「${rule.name}」已${rule.enabled ? '启用' : '停用'}`)
}
function deleteRule(rule: AlarmRule) {
  const idx = alarmRules.value.findIndex(r => r.id === rule.id)
  if (idx >= 0) {
    alarmRules.value.splice(idx, 1)
    message.success(`已删除「${rule.name}」`)
  }
}

// 更多气泡菜单
const openMenuId = ref<string | null>(null)
function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id
}
function closeMenu() {
  openMenuId.value = null
}
function handleMenuEdit(rule: AlarmRule) {
  closeMenu()
  openEditModal(rule)
}
function handleMenuToggle(rule: AlarmRule) {
  closeMenu()
  toggleRule(rule)
}
function handleMenuDelete(rule: AlarmRule) {
  closeMenu()
  deleteRule(rule)
}

// 等级配色
const levelClass: Record<AlarmLevel, string> = {
  超紧急: 'lv-超紧急', 紧急: 'lv-紧急', 严重: 'lv-严重', 一般: 'lv-一般', 提醒: 'lv-提醒'
}

const appStore = useAppStore()

// ===== 弹窗 =====
const modalVisible = ref(false)
const currentStep = ref(0)
const editingRule = ref<AlarmRule | null>(null)
const steps = ['基础信息', '场景算法', '生效摄像头', '生效时段', '通知对象']

// 表单数据
const formData = ref({
  name: '',
  level: '紧急' as AlarmLevel,
  desc: '',
  selectedAlgorithms: [] as string[],
  selectedCameraIds: [] as string[],
  scheduleType: 'all' as 'all' | 'weekday' | 'night' | 'custom',
  // 自定义时段：7天×24小时，初始全不选
  customSchedule: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false)),
  notifyMethods: [] as string[],
  notifyCategory: '安全告警' as NotifyCategory,
  notifyUsers: [] as string[],
  dedup: false,
  dedupMinutes: 10
})

const alarmGuideStepMap: Partial<Record<GuideStep, number>> = {
  'alarm-step0': 0,
  'alarm-step1': 1,
  'alarm-step2': 2,
  'alarm-step3': 3,
  'alarm-step4': 4
}
const alarmGuideSteps: GuideStep[] = ['alarm-step0', 'alarm-step1', 'alarm-step2', 'alarm-step3', 'alarm-step4']
const alarmGuideItems = [
  {
    step: 'alarm-step0',
    title: '告警规则基础信息',
    image: alarmGuideBasic,
    desc: '填写规则名称、选择告警等级（超紧急/紧急/严重/一般/提醒）和规则描述。'
  },
  {
    step: 'alarm-step1',
    title: '场景算法',
    image: alarmGuideAlgorithm,
    desc: '选择检测场景和算法，决定摄像头可以智能检测的行为类型，可跨场景多选。'
  },
  {
    step: 'alarm-step2',
    title: '生效摄像头',
    image: alarmGuideCamera,
    desc: '选择生效的摄像头，决定哪些摄像头执行此规则。可点击摄像头预览实时画面。'
  },
  {
    step: 'alarm-step3',
    title: '生效时段',
    image: alarmGuideSchedule,
    desc: '选择规则生效的时间段，可以全天、工作日、夜间或自定义。'
  },
  {
    step: 'alarm-step4',
    title: '通知对象',
    image: alarmGuideNotify,
    desc: '选择告警发生时的通知方式和通知人员，还可以开启去重推送避免频繁打扰。'
  }
]
const isAlarmImageGuide = computed(() => appStore.guideActive && alarmGuideSteps.includes(appStore.guideStep))
const alarmGuideImageIndex = computed(() => Math.max(0, alarmGuideSteps.indexOf(appStore.guideStep)))
const currentAlarmGuideItem = computed(() => alarmGuideItems[alarmGuideImageIndex.value] || alarmGuideItems[0])
const alarmGuideTrackStyle = computed(() => ({
  transform: `translateX(-${alarmGuideImageIndex.value * 576}px)`
}))

watch(() => appStore.guideStep, (step) => {
  if (!appStore.guideActive) return
  const stepIndex = alarmGuideStepMap[step]
  if (typeof stepIndex === 'number') {
    modalVisible.value = false
    currentStep.value = stepIndex
  }
}, { immediate: true })

function goPrevAlarmGuideImage() {
  if (!isAlarmImageGuide.value) return
  const prevStep = alarmGuideSteps[alarmGuideImageIndex.value - 1]
  if (prevStep) {
    appStore.setGuideStep(prevStep)
  }
}

function goNextAlarmGuideImage() {
  if (!isAlarmImageGuide.value) return
  const nextStep = alarmGuideSteps[alarmGuideImageIndex.value + 1]
  if (nextStep) {
    appStore.setGuideStep(nextStep)
  } else {
    appStore.finishGuide()
  }
}

function jumpAlarmGuideImage(step: GuideStep, index: number) {
  if (index === alarmGuideImageIndex.value) return
  appStore.setGuideStep(step)
}

function openCreateModal() {
  editingRule.value = null
  currentStep.value = 0
  formData.value = {
    name: '', level: '紧急', desc: '',
    selectedAlgorithms: [], selectedCameraIds: [],
    scheduleType: 'all',
    customSchedule: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false)),
    notifyMethods: [], notifyCategory: '安全告警', notifyUsers: [], dedup: false, dedupMinutes: 10
  }
  modalVisible.value = true
}

function openEditModal(rule: AlarmRule) {
  editingRule.value = rule
  currentStep.value = 0
  formData.value = {
    name: rule.name, level: rule.level, desc: rule.desc,
    selectedAlgorithms: [...rule.algorithms],
    selectedCameraIds: [...rule.cameraIds],
    scheduleType: rule.scheduleType,
    customSchedule: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => false)),
    notifyMethods: [...rule.notifyMethods],
    notifyCategory: rule.notifyCategory,
    notifyUsers: [...rule.notifyUsers],
    dedup: rule.dedup, dedupMinutes: rule.dedupMinutes || 10
  }
  modalVisible.value = true
}

function closeModal() {
  modalVisible.value = false
}

// ===== Step 2: 场景算法 =====
const activeSceneId = ref(scenes[0].id)
const activeScene = computed(() => scenes.find(s => s.id === activeSceneId.value) || scenes[0])

function toggleAlgorithm(name: string) {
  const idx = formData.value.selectedAlgorithms.indexOf(name)
  if (idx >= 0) formData.value.selectedAlgorithms.splice(idx, 1)
  else formData.value.selectedAlgorithms.push(name)
}

// ===== Step 3: 摄像头选择 =====
const treeExpandedKeys = ref(['park', 'b-e', 'b-a', 'area-E栋/4F', 'area-A栋/1F'])

// 树数据：只保留区域/楼层节点，不显示摄像头叶子节点
const areaOnlyTree = computed(() => {
  function filter(nodes: typeof cameraTree): typeof cameraTree {
    return nodes
      .filter(n => !n.isLeaf)
      .map(n => ({
        ...n,
        children: n.children ? filter(n.children) : undefined
      }))
  }
  return filter(cameraTree)
})
const selectedTreeNode = ref('area-E栋/4F')
const allCameras = computed(() => collectCameras(cameraTree))
const currentAreaCameras = computed(() => getCamerasInNode(cameraTree, selectedTreeNode.value))

function toggleCamera(camId: string) {
  const idx = formData.value.selectedCameraIds.indexOf(camId)
  if (idx >= 0) formData.value.selectedCameraIds.splice(idx, 1)
  else formData.value.selectedCameraIds.push(camId)
}

// 已选摄像头详情列表
const selectedCameras = computed(() =>
  allCameras.value.filter(c => c.isLeaf && formData.value.selectedCameraIds.includes(c.camId!))
)

// ===== 摄像头实时预览弹窗 =====
const previewCam = ref<CameraTreeNode | null>(null)
const previewVisible = ref(false)
function openPreview(cam: CameraTreeNode, e: Event) {
  e.stopPropagation()
  previewCam.value = cam
  previewVisible.value = true
}
function closePreview() {
  previewVisible.value = false
  previewCam.value = null
}

// ===== Step 4: 自定义时段 =====
function toggleHour(dayIdx: number, hourIdx: number) {
  formData.value.customSchedule[dayIdx][hourIdx] = !formData.value.customSchedule[dayIdx][hourIdx]
}
function setDayAll(dayIdx: number, value: boolean) {
  formData.value.customSchedule[dayIdx] = Array.from({ length: 24 }, () => value)
}
function getDayCount(dayIdx: number) {
  return formData.value.customSchedule[dayIdx].filter(Boolean).length
}

// ===== 步骤导航 =====
// 点击步骤条直接跳转：仅允许跳到「已完成」或「当前」步骤，向前跳需满足该步校验
function goToStep(target: number) {
  if (target === currentStep.value) return
  // 回退到任意已完成/更早的步骤：放行
  if (target < currentStep.value) {
    currentStep.value = target
    syncGuideStep()
    return
  }
  // 向前跳：需要依次通过目标之前每一步的校验
  for (let i = currentStep.value; i < target; i++) {
    if (!stepValid(i)) return
    currentStep.value = i + 1
  }
  syncGuideStep()
}

// 单步校验（与 nextStep 内规则保持一致）
function stepValid(step: number): boolean {
  if (step === 0 && !formData.value.name.trim()) {
    message.warning('请填写规则名称')
    return false
  }
  if (step === 1 && formData.value.selectedAlgorithms.length === 0) {
    message.warning('请至少选择一个算法')
    return false
  }
  if (step === 2 && formData.value.selectedCameraIds.length === 0) {
    message.warning('请至少选择一个摄像头')
    return false
  }
  return true
}

// 引导联动：步骤变化时推进引导
function syncGuideStep() {
  if (appStore.guideActive && appStore.guideStep.startsWith('alarm-step')) {
    appStore.setGuideStep(`alarm-step${currentStep.value}` as GuideStep)
  }
}

function nextStep() {
  if (!stepValid(currentStep.value)) return
  if (currentStep.value < 4) currentStep.value++
  syncGuideStep()
}
function prevStep() {
  if (currentStep.value > 0) currentStep.value--
}

function saveRule() {
  const scheduleText = scheduleOptions.find(s => s.key === formData.value.scheduleType)?.label || '全天'
  // 通知方式固定为站内信
  const notifyMethods = ['站内信']

  if (editingRule.value) {
    // 编辑
    const rule = editingRule.value
    rule.name = formData.value.name
    rule.level = formData.value.level
    rule.desc = formData.value.desc
    rule.algorithms = [...formData.value.selectedAlgorithms]
    rule.cameraIds = [...formData.value.selectedCameraIds]
    rule.cameraCount = formData.value.selectedCameraIds.length
    rule.scheduleType = formData.value.scheduleType
    rule.scheduleText = scheduleText
    rule.notifyMethods = notifyMethods
    rule.notifyCategory = formData.value.notifyCategory
    rule.notifyUsers = [...formData.value.notifyUsers]
    rule.dedup = formData.value.dedup
    rule.dedupMinutes = formData.value.dedup ? formData.value.dedupMinutes : undefined
    message.success('规则已更新')
  } else {
    // 新建
    alarmRules.value.unshift({
      id: 'rule-' + Date.now(),
      name: formData.value.name,
      level: formData.value.level,
      desc: formData.value.desc,
      algorithms: [...formData.value.selectedAlgorithms],
      cameraIds: [...formData.value.selectedCameraIds],
      cameraCount: formData.value.selectedCameraIds.length,
      scheduleType: formData.value.scheduleType,
      scheduleText,
      notifyMethods,
      notifyCategory: formData.value.notifyCategory,
      notifyUsers: [...formData.value.notifyUsers],
      dedup: formData.value.dedup,
      dedupMinutes: formData.value.dedup ? formData.value.dedupMinutes : undefined,
      triggerCount24h: 0,
      enabled: true
    })
    message.success('规则已创建并启用')
  }
  modalVisible.value = false
  // 引导联动：保存完成 → 推进到 alarm-done
  if (appStore.guideActive) {
    nextTick(() => appStore.setGuideStep('alarm-done'))
  }
}

// ===== 通知模板预览（根据通知配置渲染占位符）=====
const notifyPreview = computed(() => {
  const tpl = notifyTemplates[formData.value.notifyCategory]
  const fill = (s: string) => s
    .replace('{规则名}', formData.value.name || '示例规则')
    .replace('{等级}', formData.value.level)
    .replace('{摄像头}', '东门摄像头')
    .replace('{区域}', '物联网产业园区 / E栋 / 4F')
    .replace('{时间}', '2026-07-13 14:30')
  return {
    title: fill(tpl.title),
    lines: tpl.lines.map(fill)
  }
})
</script>

<template>
  <div class="rule-page">
    <!-- 工具栏 -->
    <div class="rule-toolbar">
      <a-input v-model:value="searchKey" class="rule-search" placeholder="搜索规则名称" allow-clear>
        <template #prefix><i class="i-ant-design-search-outlined" /></template>
      </a-input>
      <div class="rule-toolbar__right">
        <span class="rule-total">共 {{ filteredRules.length }} 条</span>
        <button class="rule-add-btn" type="button" data-guide="alarm-create" @click="openCreateModal">
          <i class="i-ant-design-plus-outlined" /><span>新建告警规则</span>
        </button>
      </div>
    </div>

    <!-- 表格 -->
    <div class="rule-table-wrap">
      <table class="rule-table">
        <thead>
          <tr>
            <th>规则名称</th>
            <th>等级</th>
            <th>部署范围</th>
            <th>生效时段</th>
            <th>通知方式</th>
            <th>24h 触发</th>
            <th>状态</th>
            <th class="col-ops"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rule in filteredRules" :key="rule.id">
            <td>
              <div class="rule-name-cell">
                <span class="rule-name-icon" :class="levelClass[rule.level]">
                  <i class="i-ant-design-bell-outlined" />
                </span>
                <div class="rule-name-text">
                  <button class="rule-name-link" type="button" @click="openEditModal(rule)">{{ rule.name }}</button>
                  <small class="rule-desc-text">{{ rule.algorithms.join('、') }}</small>
                </div>
              </div>
            </td>
            <td><span class="rule-level-tag" :class="levelClass[rule.level]">{{ rule.level }}</span></td>
            <td><span class="rule-camera-count">{{ rule.cameraCount }} 个</span></td>
            <td class="rule-muted">{{ rule.scheduleText }}</td>
            <td>
              <div class="rule-notify-tags">
                <span v-for="m in rule.notifyMethods" :key="m" class="rule-notify-tag">{{ m }}</span>
              </div>
            </td>
            <td><strong class="rule-trigger">{{ rule.triggerCount24h }}</strong></td>
            <td>
              <span class="rule-status" :class="{ enabled: rule.enabled }">
                <i class="rule-status__dot" />{{ rule.enabled ? '启用' : '停用' }}
              </span>
            </td>
            <td class="col-ops">
              <div class="rule-more-wrap">
                <button class="rule-more-btn" type="button" @click="toggleMenu(rule.id)">
                  <i class="i-ant-design-ellipsis-outlined" />
                </button>
                <Transition name="pop">
                  <div v-if="openMenuId === rule.id" class="rule-pop-menu">
                    <button type="button" @click="handleMenuEdit(rule)">
                      <i class="i-ant-design-edit-outlined" />编辑
                    </button>
                    <button type="button" @click="handleMenuToggle(rule)">
                      <i :class="rule.enabled ? 'i-ant-design-pause-circle-outlined' : 'i-ant-design-play-circle-outlined'" />
                      {{ rule.enabled ? '停用' : '启用' }}
                    </button>
                    <button type="button" class="rule-pop-danger" @click="handleMenuDelete(rule)">
                      <i class="i-ant-design-delete-outlined" />删除
                    </button>
                  </div>
                </Transition>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredRules.length === 0" class="rule-empty">
        <i class="i-ant-design-bell-outlined rule-empty__icon" />
        <p>{{ searchKey ? '没有找到匹配的规则' : '暂无告警规则' }}</p>
      </div>
    </div>

    <!-- ===== 告警规则图片引导弹窗 ===== -->
    <a-modal
      :open="isAlarmImageGuide"
      :width="760"
      :footer="null"
      :closable="false"
      :title="null"
      :body-style="{ padding: '0' }"
      :mask-closable="false"
      :z-index="2000"
      wrap-class-name="alarm-image-guide-modal"
      @cancel="appStore.finishGuide"
    >
      <div class="alarm-image-guide">
        <div class="alarm-image-guide__panel">
          <div class="alarm-image-guide__stage">
            <div class="alarm-image-guide__track" :style="alarmGuideTrackStyle">
              <div
                v-for="(item, index) in alarmGuideItems"
                :key="item.step"
                class="alarm-image-guide__slide"
                :class="{ active: index === alarmGuideImageIndex }"
              >
                <img :src="item.image" :alt="item.title">
              </div>
            </div>
          </div>

          <div class="alarm-image-guide__footer">
            <div class="alarm-image-guide__meta">
              <div class="alarm-image-guide__steps" aria-label="告警引导步骤">
                <button
                  v-for="(item, index) in alarmGuideItems"
                  :key="item.step"
                  type="button"
                  :aria-label="`跳转到${item.title}`"
                  :class="{ active: index === alarmGuideImageIndex, done: index < alarmGuideImageIndex }"
                  @click="jumpAlarmGuideImage(item.step as GuideStep, index)"
                />
              </div>
              <p>{{ currentAlarmGuideItem.desc }}</p>
            </div>
            <div class="alarm-image-guide__actions">
              <button
                class="alarm-image-guide__btn"
                type="button"
                :disabled="alarmGuideImageIndex === 0"
                @click="goPrevAlarmGuideImage"
              >
                上一步
              </button>
              <button class="alarm-image-guide__btn alarm-image-guide__btn--primary" type="button" @click="goNextAlarmGuideImage">
                {{ alarmGuideImageIndex === alarmGuideItems.length - 1 ? '完成' : '下一步' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- ===== 新建/编辑弹窗 ===== -->
    <a-modal
      v-model:open="modalVisible"
      :title="editingRule ? '编辑告警规则' : '新建告警规则'"
      :width="760"
      :footer="null"
      centered
      :body-style="{ padding: '0' }"
      :mask-closable="!appStore.guideActive"
      :z-index="appStore.guideActive ? 2000 : 1000"
      wrap-class-name="alarm-wizard-modal"
      @cancel="closeModal"
    >
      <div class="wizard">
        <!-- 步骤条 -->
        <div class="wizard-steps">
          <div
            v-for="(step, i) in steps"
            :key="i"
            class="wizard-step"
            :class="{
              active: i === currentStep,
              done: i < currentStep,
              clickable: i <= currentStep
            }"
            @click="goToStep(i)"
          >
            <span class="wizard-step__num">{{ i < currentStep ? '✓' : i + 1 }}</span>
            <span class="wizard-step__label">{{ step }}</span>
          </div>
        </div>

        <!-- 步骤内容 -->
        <div class="wizard-body">
          <!-- Step 1: 基础信息 -->
          <div v-if="currentStep === 0" class="step-pane">
            <div class="form-field">
              <label class="form-label">规则名称 <em>*</em></label>
              <a-input v-model:value="formData.name" placeholder="请输入规则名称，如：园区周界入侵检测" :max-length="30" />
            </div>
            <div class="form-field">
              <label class="form-label">告警等级 <em>*</em></label>
              <div class="level-picker">
                <button
                  v-for="lv in (['超紧急', '紧急', '严重', '一般', '提醒'] as AlarmLevel[])"
                  :key="lv"
                  class="level-option"
                  :class="[levelClass[lv], { active: formData.level === lv }]"
                  type="button"
                  @click="formData.level = lv"
                >{{ lv }}</button>
              </div>
            </div>
            <div class="form-field">
              <label class="form-label">规则描述</label>
              <a-textarea v-model:value="formData.desc" placeholder="描述规则的用途和检测场景" :rows="3" :max-length="100" />
            </div>
          </div>

          <!-- Step 2: 场景算法 -->
          <div v-if="currentStep === 1" class="step-pane step-scene">
            <div class="scene-layout">
              <!-- 左侧场景列表 -->
              <div class="scene-list">
                <button
                  v-for="s in scenes"
                  :key="s.id"
                  class="scene-item"
                  :class="{ active: activeSceneId === s.id }"
                  type="button"
                  @click="activeSceneId = s.id"
                >
                  <i :class="s.icon" class="scene-item__icon" />
                  <span class="scene-item__name">{{ s.name }}</span>
                  <em class="scene-item__count">{{ s.algorithms.length }}</em>
                </button>
              </div>
              <!-- 右侧算法卡片 -->
              <div class="algo-panel">
                <div class="algo-panel__head">
                  <i :class="activeScene.icon" />
                  <strong>{{ activeScene.name }}</strong>
                  <span class="algo-panel__hint">点击卡片选择算法，可跨场景多选</span>
                </div>
                <div class="algo-grid">
                  <button
                    v-for="algo in activeScene.algorithms"
                    :key="algo.name"
                    class="algo-card"
                    :class="{ selected: formData.selectedAlgorithms.includes(algo.name) }"
                    type="button"
                    @click="toggleAlgorithm(algo.name)"
                  >
                    <div class="algo-card__icon">
                      <i :class="activeScene.icon" />
                    </div>
                    <div class="algo-card__body">
                      <span class="algo-card__name">{{ algo.name }}</span>
                      <small class="algo-card__desc">{{ algo.desc }}</small>
                    </div>
                    <i class="algo-card__check" :class="formData.selectedAlgorithms.includes(algo.name) ? 'i-ant-design-check-circle-filled' : 'i-ant-design-plus-outlined'" />
                  </button>
                </div>
                <!-- 已选汇总 -->
                <div v-if="formData.selectedAlgorithms.length > 0" class="algo-selected-bar">
                  <span class="algo-selected-bar__label">已选 {{ formData.selectedAlgorithms.length }} 个：</span>
                  <span v-for="a in formData.selectedAlgorithms" :key="a" class="algo-tag" @click="toggleAlgorithm(a)">{{ a }} <i class="i-ant-design-close-outlined" /></span>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: 生效摄像头 -->
          <div v-if="currentStep === 2" class="step-pane step-camera">
            <div class="camera-layout">
              <!-- 左侧区域树 -->
              <div class="camera-tree">
                <div class="camera-tree__head">区域列表</div>
                <a-tree
                  v-model:expandedKeys="treeExpandedKeys"
                  :tree-data="areaOnlyTree"
                  :selected-keys="[selectedTreeNode]"
                  :block-node="true"
                  @select="(_, info) => selectedTreeNode = String(info.node.key)"
                >
                  <template #title="{ title, count }">
                    <div class="cam-tree-node">
                      <span>{{ title }}</span>
                      <span v-if="count" class="cam-tree-count">{{ count }}</span>
                    </div>
                  </template>
                </a-tree>
              </div>
              <!-- 右侧上下分栏 -->
              <div class="camera-right">
                <!-- 上方：当前区域可选摄像头 -->
                <div class="camera-pick">
                  <div class="camera-pick__head">
                    <span>可选摄像头</span>
                    <button v-if="formData.selectedCameraIds.length > 0" class="clear-btn" type="button" @click="formData.selectedCameraIds = []">清空已选</button>
                  </div>
                  <div class="camera-pick__grid">
                    <div
                      v-for="cam in currentAreaCameras.filter(c => c.isLeaf)"
                      :key="cam.key"
                      class="cam-card"
                      :class="{ selected: formData.selectedCameraIds.includes(cam.camId!) }"
                      @click="toggleCamera(cam.camId!)"
                    >
                      <div class="cam-card__thumb">
                        <img :src="cam.thumb" :alt="cam.title" draggable="false" />
                        <div class="cam-card__check" :class="{ checked: formData.selectedCameraIds.includes(cam.camId!) }">
                          <i class="i-ant-design-check-outlined" />
                        </div>
                        <!-- 实时预览按钮 -->
                        <button class="cam-card__play" type="button" title="查看实时画面" @click="openPreview(cam, $event)">
                          <i class="i-ant-design-play-circle-outlined" />
                        </button>
                      </div>
                      <div class="cam-card__info">
                        <span class="cam-card__name">{{ cam.title }}</span>
                        <span class="cam-card__status" :class="cam.status">{{ cam.status === 'online' ? '在线' : '离线' }}</span>
                      </div>
                    </div>
                    <div v-if="currentAreaCameras.filter(c => c.isLeaf).length === 0" class="cam-empty">
                      <p>请选择左侧区域查看摄像头</p>
                    </div>
                  </div>
                </div>
                <!-- 下方：已选摄像头 -->
                <div class="camera-selected">
                  <div class="camera-selected__head">
                    <span>已选 <strong>{{ selectedCameras.length }}</strong> 个摄像头</span>
                  </div>
                  <div class="camera-selected__list">
                    <div
                      v-for="cam in selectedCameras"
                      :key="cam.key"
                      class="cam-selected-item"
                      @click="toggleCamera(cam.camId!)"
                    >
                      <img :src="cam.thumb" :alt="cam.title" class="cam-selected-item__thumb" />
                      <span class="cam-selected-item__name">{{ cam.title }}</span>
                      <i class="i-ant-design-close-outlined cam-selected-item__remove" />
                    </div>
                    <div v-if="selectedCameras.length === 0" class="cam-selected-empty">
                      <i class="i-ant-design-video-camera-outlined" />
                      <p>尚未选择摄像头</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 4: 生效时段 -->
          <div v-if="currentStep === 3" class="step-pane step-schedule">
            <div class="sched-options">
              <button
                v-for="opt in scheduleOptions"
                :key="opt.key"
                class="sched-option"
                :class="{ active: formData.scheduleType === opt.key }"
                type="button"
                @click="formData.scheduleType = opt.key as any"
              >
                <div class="sched-option__head">
                  <i :class="formData.scheduleType === opt.key ? 'i-ant-design-check-circle-filled' : 'i-ant-design-circle-outlined'" />
                  <strong>{{ opt.label }}</strong>
                </div>
                <p>{{ opt.desc }}</p>
              </button>
            </div>

            <!-- 自定义时段 -->
            <div v-if="formData.scheduleType === 'custom'" class="custom-sched">
              <div class="custom-sched__head">
                <span>点击格子切换，绿色表示生效</span>
                <div class="custom-sched__legend">
                  <span class="legend-item"><i class="legend-dot on" />生效</span>
                  <span class="legend-item"><i class="legend-dot off" />不生效</span>
                </div>
              </div>
              <div class="sched-grid-wrap">
                <table class="sched-grid">
                  <thead>
                    <tr>
                      <th></th>
                      <th v-for="h in 24" :key="h">{{ (h - 1) % 6 === 0 ? (h - 1) : '' }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(day, di) in weekDays" :key="di">
                      <td class="sched-day">
                        <div class="sched-day__label">{{ day }}</div>
                        <div class="sched-day__actions">
                          <button type="button" @click="setDayAll(di, true)">全</button>
                          <button type="button" @click="setDayAll(di, false)">空</button>
                        </div>
                        <small v-if="getDayCount(di) > 0" class="sched-day__count">{{ getDayCount(di) }}h</small>
                      </td>
                      <td
                        v-for="hi in 24"
                        :key="hi"
                        class="sched-cell"
                        :class="{ on: formData.customSchedule[di][hi - 1] }"
                        :title="`${day} ${hi - 1}:00`"
                        @click="toggleHour(di, hi - 1)"
                      />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Step 5: 通知对象 -->
          <div v-if="currentStep === 4" class="step-pane step-notify">
            <!-- 通知方式（固定站内信，只读展示） -->
            <div class="form-field">
              <label class="form-label">通知方式</label>
              <div class="notify-method-readonly">
                <i class="i-ant-design-message-outlined" />
                <span>站内信</span>
                <small>系统默认通过站内信推送告警</small>
              </div>
            </div>

            <!-- 通知配置：安全告警 / 合规告警 -->
            <div class="form-field">
              <label class="form-label">通知配置 <em>*</em></label>
              <div class="notify-category">
                <button
                  v-for="c in notifyCategoryOptions"
                  :key="c.key"
                  class="notify-cat-card"
                  :class="{ selected: formData.notifyCategory === c.key }"
                  type="button"
                  @click="formData.notifyCategory = c.key"
                >
                  <div class="notify-cat-card__head">
                    <i :class="c.icon" class="notify-cat-card__icon" />
                    <strong>{{ c.label }}</strong>
                    <i
                      :class="formData.notifyCategory === c.key ? 'i-ant-design-check-circle-filled' : 'i-ant-design-circle-outlined'"
                      class="notify-cat-card__check"
                    />
                  </div>
                  <p>{{ c.desc }}</p>
                </button>
              </div>
            </div>

            <!-- 通知内容模板预览 -->
            <div class="form-field">
              <label class="form-label">通知内容预览</label>
              <div class="notify-preview">
                <div class="notify-preview__title">{{ notifyPreview.title }}</div>
                <div class="notify-preview__body">
                  <p v-for="(line, idx) in notifyPreview.lines" :key="idx">{{ line }}</p>
                </div>
                <div class="notify-preview__foot">
                  <i class="i-ant-design-info-circle-outlined" />
                  <span>以上为内容模板示例，实际发送时 {规则名}{等级}{摄像头}{区域}{时间} 将替换为真实告警信息</span>
                </div>
              </div>
            </div>

            <div class="form-field">
              <label class="form-label">通知人员</label>
              <a-select
                v-model:value="formData.notifyUsers"
                mode="multiple"
                placeholder="选择需要通知的人员或群组"
                style="width: 100%"
                :options="userOptions.map(u => ({ label: u, value: u }))"
                :get-popup-container="(trigger: HTMLElement) => trigger.closest('.wizard') as HTMLElement"
              />
            </div>
            <div class="form-field dedup-field">
              <div class="dedup-row">
                <div class="dedup-info">
                  <label class="form-label">去重推送</label>
                  <p class="dedup-desc">开启后，同一摄像头在设定时间窗口内只推送一条告警</p>
                </div>
                <a-switch v-model:checked="formData.dedup" />
              </div>
              <Transition name="dedup-detail">
                <div v-if="formData.dedup" class="dedup-detail">
                  <span>同一摄像头</span>
                  <a-input-number v-model:value="formData.dedupMinutes" :min="1" :max="1440" style="width: 80px" />
                  <span>分钟内只推送一条告警</span>
                </div>
              </Transition>
            </div>
          </div>
        </div>

        <!-- 底部操作 -->
        <div class="wizard-footer">
          <button v-if="currentStep > 0" class="wizard-btn wizard-btn--default" type="button" @click="prevStep">上一步</button>
          <div class="wizard-footer__right">
            <button class="wizard-btn wizard-btn--default" type="button" @click="closeModal">取消</button>
            <button v-if="currentStep < 4" class="wizard-btn wizard-btn--primary" type="button" @click="nextStep">下一步</button>
            <button v-else class="wizard-btn wizard-btn--primary" type="button" @click="saveRule">
              <i class="i-ant-design-check-outlined" />保存并启用
            </button>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- ===== 摄像头实时预览弹窗 ===== -->
    <a-modal
      v-model:open="previewVisible"
      :title="previewCam?.title || '实时画面'"
      :width="640"
      :footer="null"
      centered
      :body-style="{ padding: '0' }"
      @cancel="closePreview"
    >
      <div class="cam-preview">
        <img v-if="previewCam?.thumb" :src="previewCam.thumb" class="cam-preview__frame" alt="实时画面" />
        <div class="cam-preview__overlay">
          <div class="cam-preview__info">
            <span class="cam-preview__name">{{ previewCam?.title }}</span>
            <span class="cam-preview__status" :class="previewCam?.status">
              <i class="cam-preview__dot" />
              {{ previewCam?.status === 'online' ? '● LIVE' : '● 离线' }}
            </span>
          </div>
          <div class="cam-preview__controls">
            <i class="i-ant-design-pause-circle-filled cam-preview__play-icon" />
            <div class="cam-preview__progress">
              <div class="cam-preview__progress-bar" />
            </div>
            <span class="cam-preview__time">实时</span>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.rule-page { height: 100%; padding: 8px; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }

/* 工具栏 */
.rule-toolbar { display: flex; align-items: center; gap: 12px; flex-shrink: 0;
  &__right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
}
.rule-search { width: 320px; }
.rule-total { font-size: 13px; color: $text-tertiary; }
.rule-add-btn {
  display: flex; align-items: center; gap: 5px; height: 32px; padding: 0 14px;
  border: 1px solid $color-primary; border-radius: 6px; background: $color-primary; color: #fff;
  font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s;
  &:hover { background: $color-primary-hover; } i { font-size: 13px; }
}

/* 表格 */
.rule-table-wrap {
  flex: 1; overflow: auto; background: #fff; border-radius: 12px; overflow: hidden;
  scrollbar-width: none; -ms-overflow-style: none; &::-webkit-scrollbar { display: none; }
}
.rule-table {
  width: 100%; border-collapse: collapse; font-size: 13px;
  thead th {
    padding: 12px 12px; text-align: left; font-weight: 600; font-size: 12px; color: $text-secondary;
    background: $bg-page; border-bottom: 1px solid $border-color-card; white-space: nowrap; position: sticky; top: 0; z-index: 1;
  }
  tbody td { padding: 16px 12px; border-bottom: 1px solid $border-color-card; color: $text-secondary; vertical-align: middle; }
  tbody tr { transition: background 0.15s; &:hover { background: #faf9ff; } }
  .col-ops { width: 48px; text-align: center; }
}

/* 规则名称列 */
.rule-name-cell { display: flex; align-items: center; gap: 10px; }
.rule-name-icon {
  width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center;
  color: #fff; flex-shrink: 0;
  i { font-size: 18px; }
  &.lv-超紧急 { background: #cf1322; }
  &.lv-紧急 { background: #ff4d4f; }
  &.lv-严重 { background: #fa8c16; }
  &.lv-一般 { background: #597ef7; }
  &.lv-提醒 { background: $color-online; }
}
.rule-name-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rule-name-link {
  border: none; background: transparent; color: $text-base; font-weight: 600; font-size: 14px;
  cursor: pointer; font-family: inherit; padding: 0; text-align: left;
  position: relative; z-index: 1; pointer-events: auto;
  &:hover { color: $color-primary; }
}
.rule-desc-text { font-size: 11px; color: $text-muted; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 240px; }

/* 等级标签 */
.rule-level-tag { font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 500; white-space: nowrap; }
.lv-超紧急 { background: rgba(207,19,34,0.1); color: #cf1322; }
.lv-紧急 { background: rgba(255,77,79,0.1); color: #ff4d4f; }
.lv-严重 { background: rgba(250,140,22,0.1); color: #fa8c16; }
.lv-一般 { background: rgba(89,126,247,0.1); color: #597ef7; }
.lv-提醒 { background: rgba(43,179,163,0.1); color: $color-online; }

.rule-camera-count { font-size: 13px; color: $color-primary; font-weight: 500; }
.rule-muted { font-size: 12px; color: $text-muted; }

/* 通知标签 */
.rule-notify-tags { display: flex; flex-wrap: wrap; gap: 3px; max-width: 160px; }
.rule-notify-tag { font-size: 10px; padding: 1px 6px; border-radius: 3px; background: $bg-page; color: $text-secondary; }
.rule-trigger { color: $color-primary; font-size: 15px; font-weight: 700; }

/* 状态 */
.rule-status { display: inline-flex; align-items: center; gap: 4px; font-size: 12px;
  &__dot { width: 6px; height: 6px; border-radius: 50%; background: #bfbfbf; }
  &.enabled { color: $color-online; .rule-status__dot { background: $color-online; } }
}

/* 更多气泡菜单 */
.rule-more-wrap { position: relative; display: inline-flex; }
.rule-more-btn {
  width: 32px; height: 32px; border: 1px solid $border-color-card; border-radius: 8px;
  background: #fff; color: $text-tertiary; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
  &:hover { border-color: $color-primary; color: $color-primary; }
  i { font-size: 16px; }
}
.rule-pop-menu {
  position: absolute; top: 36px; right: 0; z-index: 20; background: #fff;
  border: 1px solid $border-color-card; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);
  overflow: hidden; min-width: 130px;
  button {
    display: flex; align-items: center; gap: 6px; width: 100%; padding: 9px 14px;
    border: none; background: transparent; font-size: 13px; color: $text-secondary;
    cursor: pointer; font-family: inherit; text-align: left; transition: all 0.1s;
    i { font-size: 14px; }
    &:hover { background: $color-primary-bg; color: $color-primary; }
  }
  .rule-pop-danger { color: #ff4d4f; &:hover { background: rgba(255,77,79,0.08); color: #ff4d4f; } }
}
.pop-enter-active, .pop-leave-active { transition: all 0.15s; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(-6px); }

/* 空状态 */
.rule-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 80px 20px; color: $text-muted;
  &__icon { font-size: 48px; opacity: 0.3; } p { font-size: 14px; margin: 0; }
}

/* ===== 弹窗向导 ===== */
.wizard { position: relative; display: flex; flex-direction: column; max-height: 680px; }

/* 步骤条 */
.wizard-steps { display: flex; padding: 16px 24px; border-bottom: 1px solid $border-color-card; gap: 4px; flex-shrink: 0; }
.wizard-step {
  display: flex; align-items: center; gap: 6px; flex: 1; padding: 4px 0;
  &__num {
    width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 600; flex-shrink: 0; transition: all 0.2s;
    background: $bg-page; color: $text-muted;
  }
  &__label { font-size: 12px; color: $text-muted; }
  &.active {
    .wizard-step__num { background: $color-primary; color: #fff; }
    .wizard-step__label { color: $color-primary; font-weight: 500; }
  }
  &.done {
    .wizard-step__num { background: $color-online; color: #fff; }
    .wizard-step__label { color: $text-secondary; }
  }
  /* 仅已完成或当前步骤可点击 */
  &.clickable {
    cursor: pointer;
    &:hover {
      .wizard-step__num { background: rgba(110, 75, 255, 0.12); color: $color-primary; }
      .wizard-step__label { color: $color-primary; }
    }
    &.active:hover .wizard-step__num { background: $color-primary; color: #fff; }
    &.done:hover .wizard-step__num { background: $color-online; color: #fff; }
  }
}

/* 内容区 */
.wizard-body { flex: 1; overflow-y: auto; padding: 20px 24px; min-height: 340px; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
.step-pane { display: flex; flex-direction: column; gap: 16px; }
.step-hint { margin: 0; font-size: 12px; color: $text-muted; }

.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 13px; font-weight: 500; color: $text-base; em { color: #ff4d4f; font-style: normal; margin-left: 2px; } }

/* 等级选择 */
.level-picker { display: flex; gap: 8px; }
.level-option {
  padding: 8px 20px; border: 2px solid $border-color-card; border-radius: 8px; background: #fff;
  font-size: 13px; font-weight: 500; color: $text-secondary; cursor: pointer; font-family: inherit; transition: all 0.15s;
  &.active { border-color: currentColor; }
  &.lv-超紧急 { &:hover, &.active { border-color: #cf1322; background: rgba(207,19,34,0.05); color: #cf1322; } }
  &.lv-紧急 { &:hover, &.active { border-color: #ff4d4f; background: rgba(255,77,79,0.05); color: #ff4d4f; } }
  &.lv-严重 { &:hover, &.active { border-color: #fa8c16; background: rgba(250,140,22,0.05); color: #fa8c16; } }
  &.lv-一般 { &:hover, &.active { border-color: #597ef7; background: rgba(89,126,247,0.05); color: #597ef7; } }
  &.lv-提醒 { &:hover, &.active { border-color: $color-online; background: rgba(43,179,163,0.05); color: $color-online; } }
}

/* 场景算法 */
.scene-layout { display: grid; grid-template-columns: 160px 1fr; gap: 0; border: 1px solid $border-color-card; border-radius: 10px; overflow: hidden; height: 320px; }
.scene-list { border-right: 1px solid $border-color-card; padding: 8px; overflow-y: auto; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
.scene-item {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 12px; border: 1px solid transparent;
  border-radius: 8px; background: transparent; color: $text-secondary; font-size: 13px; cursor: pointer; font-family: inherit;
  transition: all 0.15s; text-align: left; margin-bottom: 4px;
  &__icon { font-size: 16px; flex-shrink: 0; }
  &__name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__count { font-style: normal; font-size: 11px; color: $text-muted; flex-shrink: 0; }
  &:hover { background: #faf9ff; }
  &.active { border-color: $color-primary; background: $color-primary-bg; color: $color-primary; font-weight: 500;
    .scene-item__count { color: $color-primary; }
  }
}

.algo-panel { display: flex; flex-direction: column; min-width: 0;
  &__head { display: flex; align-items: center; gap: 6px; padding: 10px 14px; border-bottom: 1px solid $border-color-card; font-size: 13px;
    i { font-size: 16px; color: $color-primary; }
    strong { color: $text-base; font-weight: 600; }
  }
  &__hint { margin-left: auto; font-size: 11px; color: $text-muted; font-weight: 400; }
}
.algo-grid { flex: 1; display: flex; flex-direction: column; gap: 6px; padding: 10px; overflow-y: auto; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
.algo-card {
  display: flex; align-items: center; gap: 12px; padding: 10px 14px; border: 1px solid $border-color-card;
  border-radius: 10px; background: #fff; cursor: pointer; font-family: inherit; transition: all 0.15s; text-align: left; position: relative;
  &__icon { width: 32px; height: 32px; border-radius: 8px; background: $bg-page; color: $text-muted; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; transition: all 0.15s; }
  &__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
  &__name { font-size: 13px; font-weight: 500; color: $text-base; }
  &__desc { font-size: 11px; color: $text-muted; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__check { font-size: 18px; color: $border-color-light; flex-shrink: 0; transition: color 0.15s; }
  &:hover { border-color: rgba(110,75,255,0.4);
    .algo-card__icon { color: $color-primary; }
  }
  &.selected { border-color: $color-primary; background: $color-primary-bg;
    .algo-card__icon { background: $color-primary; color: #fff; }
    .algo-card__name { color: $color-primary; }
    .algo-card__check { color: $color-primary; }
  }
}
.algo-selected-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; padding: 8px 14px; border-top: 1px solid $border-color-card; background: $bg-page;
  &__label { font-size: 11px; color: $text-muted; margin-right: 4px; }
}
.algo-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; padding: 2px 8px; border-radius: 9999px; background: #fff; color: $color-primary; cursor: pointer; border: 1px solid rgba(110,75,255,0.2);
  i { font-size: 9px; }
  &:hover { background: rgba(255,77,79,0.08); color: #ff4d4f; border-color: rgba(255,77,79,0.2); }
}

/* 摄像头选择 */
.clear-btn { border: none; background: transparent; color: $text-muted; font-size: 12px; cursor: pointer; &:hover { color: #ff4d4f; } }
.camera-layout { display: grid; grid-template-columns: 180px 1fr; gap: 12px; height: 340px; }

.camera-tree {
  display: flex; flex-direction: column; border: 1px solid $border-color-card; border-radius: 10px; overflow: hidden;
  &__head { padding: 10px 12px; font-size: 12px; font-weight: 600; color: $text-secondary; border-bottom: 1px solid $border-color-card; background: $bg-page; flex-shrink: 0; }
  :deep(.ant-tree) { padding: 8px; overflow-y: auto; flex: 1; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
  :deep(.ant-tree-node-content-wrapper) { border-radius: 6px; &:hover { background: #faf9ff; } }
  :deep(.ant-tree-node-selected) { background: $color-primary-bg !important; }
}
.cam-tree-node { display: flex; align-items: center; justify-content: space-between; gap: 6px; width: 100%;
  > span:first-child { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cam-tree-count { font-size: 10px; color: $text-muted; flex-shrink: 0; }
}

/* 右侧上下分栏 */
.camera-right { display: flex; flex-direction: column; gap: 8px; min-width: 0; }

/* 上方：可选区 */
.camera-pick {
  flex: 1; display: flex; flex-direction: column; border: 1px solid $border-color-card; border-radius: 10px; overflow: hidden; min-height: 0;
  &__head { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; font-size: 12px; font-weight: 600; color: $text-secondary; border-bottom: 1px solid $border-color-card; background: $bg-page; flex-shrink: 0; }
  &__grid { flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; padding: 10px; align-content: start;
    scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
}
.cam-card { border: 2px solid $border-color-card; border-radius: 8px; overflow: hidden; cursor: pointer; transition: all 0.15s; background: #fff;
  &:hover { border-color: rgba(110,75,255,0.4); }
  &.selected { border-color: $color-primary; }
  &__thumb { position: relative; aspect-ratio: 16/10; background: #1a1a2e;
    img { width: 100%; height: 100%; object-fit: cover; }
  }
  &__check { position: absolute; top: 4px; right: 4px; width: 18px; height: 18px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.5); display: flex; align-items: center; justify-content: center;
    i { font-size: 10px; color: #fff; opacity: 0; }
    &.checked { background: $color-primary; border-color: $color-primary; i { opacity: 1; } }
  }
  &__play { position: absolute; bottom: 4px; right: 4px; width: 24px; height: 24px; border: none; border-radius: 50%; background: rgba(0,0,0,0.45); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.15s;
    i { font-size: 14px; }
    &:hover { background: rgba(0,0,0,0.65); }
  }
  &:hover &__play { opacity: 1; }
  &__info { padding: 6px 8px; display: flex; flex-direction: column; gap: 2px; }
  &__name { font-size: 11px; font-weight: 500; color: $text-base; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__status { font-size: 10px;
    &.online { color: $color-online; } &.offline { color: #bfbfbf; }
  }
}
.cam-empty { grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; color: $text-muted; font-size: 13px; min-height: 80px; }

/* 下方：已选区 */
.camera-selected {
  flex-shrink: 0; max-height: 130px; display: flex; flex-direction: column; border: 1px solid $border-color-card; border-radius: 10px; overflow: hidden;
  &__head { padding: 8px 12px; font-size: 12px; font-weight: 600; color: $text-secondary; border-bottom: 1px solid $border-color-card; background: $bg-page; flex-shrink: 0;
    strong { color: $color-primary; }
  }
  &__list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-wrap: wrap; gap: 6px; align-content: start;
    scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
}
.cam-selected-item {
  display: flex; align-items: center; gap: 5px; padding: 3px 8px 3px 3px; border: 1px solid rgba(110,75,255,0.2); border-radius: 9999px;
  background: $color-primary-bg; cursor: pointer; transition: all 0.15s;
  &__thumb { width: 22px; height: 22px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
  &__name { font-size: 11px; color: $color-primary; white-space: nowrap; }
  &__remove { font-size: 10px; color: $color-primary; opacity: 0.6; }
  &:hover { background: rgba(255,77,79,0.08); border-color: rgba(255,77,79,0.2);
    .cam-selected-item__name, .cam-selected-item__remove { color: #ff4d4f; }
  }
}
.cam-selected-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; width: 100%; color: $text-muted; padding: 16px;
  i { font-size: 22px; opacity: 0.3; }
  p { font-size: 12px; margin: 0; }
}

/* 时段 */
.sched-options { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.sched-option { border: 2px solid $border-color-card; border-radius: 10px; padding: 12px; cursor: pointer; font-family: inherit; transition: all 0.15s; text-align: left; background: #fff;
  &:hover { border-color: rgba(110,75,255,0.3); }
  &.active { border-color: $color-primary; background: $color-primary-bg; }
  &__head { display: flex; align-items: center; gap: 5px; margin-bottom: 4px;
    i { font-size: 14px; color: $text-muted; }
    strong { font-size: 13px; color: $text-base; }
  }
  p { margin: 0; font-size: 11px; color: $text-muted; }
  &.active &__head i { color: $color-primary; }
}

.custom-sched { margin-top: 8px; }
.custom-sched__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 12px; color: $text-muted; }
.custom-sched__legend { display: flex; gap: 10px; }
.legend-item { display: flex; align-items: center; gap: 3px; font-size: 11px; }
.legend-dot { width: 10px; height: 10px; border-radius: 2px; &.on { background: $color-online; } &.off { background: #eef0f4; } }

.sched-grid-wrap { overflow-x: auto; border: 1px solid $border-color-card; border-radius: 8px; }
.sched-grid { border-collapse: collapse; font-size: 10px;
  th { padding: 4px 2px; font-weight: 400; color: $text-muted; min-width: 16px; text-align: center; }
  .sched-day { padding: 4px 6px; text-align: center; white-space: nowrap; border-right: 1px solid $border-color-card; position: sticky; left: 0; background: #fff;
    &__label { font-size: 11px; font-weight: 500; color: $text-base; }
    &__actions { display: flex; gap: 2px; justify-content: center; margin-top: 2px;
      button { border: 1px solid $border-color-card; border-radius: 3px; background: #fff; font-size: 9px; padding: 0 4px; cursor: pointer; color: $text-muted; line-height: 16px;
        &:hover { border-color: $color-primary; color: $color-primary; }
      }
    }
    &__count { font-size: 9px; color: $color-online; }
  }
  .sched-cell { width: 18px; height: 28px; border: 1px solid #f4f5f7; cursor: pointer; transition: background 0.1s; background: #eef0f4;
    &:hover { background: #e8e6f0; }
    &.on { background: $color-online; &:hover { background: #27a092; } }
  }
}

/* 通知 */
.notify-methods { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.notify-method { display: flex; align-items: center; gap: 6px; padding: 10px 12px; border: 2px solid $border-color-card; border-radius: 8px; background: #fff; font-size: 13px; color: $text-secondary; cursor: pointer; font-family: inherit; transition: all 0.15s; text-align: left;
  &__icon { font-size: 16px; color: $text-tertiary; }
  &__check { font-size: 14px; margin-left: auto; }
  &:hover { border-color: rgba(110,75,255,0.3); }
  &.selected { border-color: $color-primary; background: $color-primary-bg; color: $color-primary;
    .notify-method__icon { color: $color-primary; }
    .notify-method__check { color: $color-primary; }
  }
}

/* 通知方式只读（固定站内信） */
.notify-method-readonly {
  display: flex; align-items: center; gap: 6px;
  height: 38px; padding: 0 14px;
  border: 1px solid $border-color-card; border-radius: 8px;
  background: $bg-page; color: $text-secondary; font-size: 13px;
  i { font-size: 15px; color: $color-primary; }
  span { font-weight: 500; color: $text-base; }
  small { font-size: 11px; color: $text-muted; margin-left: 4px; }
}

/* 通知配置：安全告警 / 合规告警 */
.notify-category { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.notify-cat-card {
  display: flex; flex-direction: column; gap: 6px;
  padding: 14px; border: 2px solid $border-color-card; border-radius: 10px;
  background: #fff; cursor: pointer; font-family: inherit; transition: all 0.15s; text-align: left;
  &__head {
    display: flex; align-items: center; gap: 6px;
    i { font-size: 16px; color: $text-muted; }
    strong { font-size: 14px; font-weight: 600; color: $text-base; }
  }
  &__icon { font-size: 16px; }
  &__check { font-size: 15px; margin-left: auto; color: $border-color-light; }
  p { margin: 0; font-size: 12px; line-height: 1.5; color: $text-muted; }
  &:hover { border-color: rgba(110, 75, 255, 0.35);
    .notify-cat-card__icon { color: $color-primary; }
  }
  &.selected { border-color: $color-primary; background: $color-primary-bg;
    .notify-cat-card__icon { color: $color-primary; }
    .notify-cat-card__check { color: $color-primary; }
    strong { color: $color-primary; }
  }
}

/* 通知内容模板预览 */
.notify-preview {
  border: 1px solid $border-color-card; border-radius: 10px; overflow: hidden;
  background: #fff;
  &__title {
    padding: 10px 14px; font-size: 13px; font-weight: 600; color: $text-base;
    background: $bg-page; border-bottom: 1px solid $border-color-card;
  }
  &__body {
    padding: 12px 14px; display: flex; flex-direction: column; gap: 4px;
    p { margin: 0; font-size: 12px; line-height: 1.7; color: $text-secondary; }
  }
  &__foot {
    display: flex; align-items: flex-start; gap: 5px;
    padding: 8px 14px; border-top: 1px dashed $border-color-card;
    i { font-size: 12px; color: $text-muted; flex-shrink: 0; margin-top: 2px; }
    span { font-size: 11px; line-height: 1.5; color: $text-muted; }
  }
}

.dedup-field { border-top: 1px solid $border-color-card; padding-top: 16px; }
.dedup-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.dedup-info { flex: 1; }
.dedup-desc { margin: 4px 0 0; font-size: 12px; color: $text-muted; }
.dedup-detail { display: flex; align-items: center; gap: 6px; margin-top: 10px; padding: 10px 14px; background: $color-primary-bg; border-radius: 8px; font-size: 13px; color: $text-secondary; }

.dedup-detail-enter-active, .dedup-detail-leave-active { transition: all 0.2s; overflow: hidden; }
.dedup-detail-enter-from, .dedup-detail-leave-to { opacity: 0; max-height: 0; margin-top: 0; }

.alarm-image-guide {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;

  &__panel {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #f0f2f5;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 12px 32px rgba(20, 23, 31, 0.08);
  }

  &__stage {
    position: relative;
    overflow: hidden;
    height: 384px;
    background: #fff;
  }

  &__track {
    display: flex;
    gap: 16px;
    height: 100%;
    padding: 12px 88px;
    transition: transform 0.42s cubic-bezier(0.22, 0.72, 0.18, 1);
    will-change: transform;
    box-sizing: border-box;
  }

  &__slide {
    flex: 0 0 560px;
    height: 100%;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: transparent;
    opacity: 0.62;
    transform: scale(0.95);
    transition: opacity 0.28s ease, transform 0.28s ease, box-shadow 0.28s ease;

    &.active {
      opacity: 1;
      transform: scale(1);
      box-shadow: 0 10px 24px rgba(20, 23, 31, 0.08);
    }

    img {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      border-radius: 0;
      object-fit: fill;
      background: transparent;
      box-shadow: none;
    }
  }

  &__footer {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px;
    align-items: end;
    padding: 10px 14px 12px;
    border-top: 1px solid #f0f2f5;
    background: #fff;
  }

  &__meta {
    min-width: 0;

    p {
      margin: 8px 0 0;
      min-height: 34px;
      padding: 7px 10px;
      border: 1px solid rgba(110, 75, 255, 0.12);
      border-radius: 6px;
      background: #faf9ff;
      color: $text-secondary;
      font-size: 12px;
      line-height: 18px;
    }
  }

  &__steps {
    display: flex;
    align-items: center;
    gap: 6px;

    button {
      width: 22px;
      height: 4px;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: #dbe4f1;
      cursor: pointer;
      transition: background 0.15s ease, width 0.15s ease, box-shadow 0.15s ease;

      &.done,
      &.active {
        background: $color-primary;
      }

      &.active {
        width: 34px;
        box-shadow: 0 0 0 3px rgba(110, 75, 255, 0.10);
      }

      &:hover {
        background: $color-primary-hover;
      }
    }
  }

  &__actions {
    display: inline-flex;
    align-self: end;
    align-items: center;
    gap: 10px;
    padding-bottom: 1px;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 68px;
    height: 28px;
    padding: 0 12px;
    border: 1px solid $border-color-light;
    border-radius: 6px;
    color: $text-secondary;
    background: #fff;
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease, transform 0.15s ease;

    &:hover:not(:disabled) {
      border-color: $color-primary;
      color: $color-primary;
      background: #faf9ff;
    }

    &:active:not(:disabled) {
      transform: scale(0.96);
    }

    &:disabled {
      color: $text-muted;
      background: #f6f7f9;
      cursor: not-allowed;
    }

    &--primary {
      border-color: $color-primary;
      color: #fff;
      background: linear-gradient(135deg, #7d5cff 0%, #6e4bff 55%, #5d3bff 100%);
      box-shadow: 0 2px 10px rgba(110, 75, 255, 0.22);

      &:hover:not(:disabled) {
        color: #fff;
        background: $color-primary-hover;
      }
    }
  }
}

:global(.alarm-image-guide-modal) {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

:global(.alarm-image-guide-modal .ant-modal) {
  top: auto;
  margin: 0;
  padding-bottom: 0;
}

:global(.alarm-image-guide-modal .ant-modal-content) {
  background: transparent;
  box-shadow: none;
}

/* 底部 */
.wizard-footer { display: flex; align-items: center; justify-content: space-between; padding: 12px 24px; border-top: 1px solid $border-color-card; flex-shrink: 0;
  &__right { display: flex; gap: 8px; margin-left: auto; }
}
.wizard-btn {
  display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 16px; border-radius: 6px; font-size: 13px; font-family: inherit; cursor: pointer; transition: all 0.15s;
  &--default { border: 1px solid $border-color-light; background: #fff; color: $text-secondary; &:hover { border-color: $color-primary; color: $color-primary; } }
  &--primary { border: 1px solid $color-primary; background: $color-primary; color: #fff; &:hover { background: $color-primary-hover; } }
}

/* 摄像头实时预览弹窗 */
.cam-preview {
  position: relative; aspect-ratio: 16/9; background: #000; overflow: hidden;
  &__frame { width: 100%; height: 100%; object-fit: cover; }
  &__overlay { position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.6) 100%);
  }
  &__info { position: absolute; top: 12px; left: 16px; display: flex; align-items: center; gap: 10px; }
  &__name { font-size: 14px; font-weight: 500; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.6); }
  &__status { font-size: 12px; padding: 2px 6px; border-radius: 3px; display: flex; align-items: center; gap: 4px;
    &.online { color: #95de64; background: rgba(43,179,163,0.2); }
    &.offline { color: #d9d9d9; background: rgba(0,0,0,0.3); }
  }
  &__dot { width: 6px; height: 6px; border-radius: 50%; }
  &__controls { position: absolute; bottom: 12px; left: 16px; right: 16px; display: flex; align-items: center; gap: 12px; pointer-events: auto; }
  &__play-icon { font-size: 28px; color: #fff; cursor: pointer; }
  &__progress { flex: 1; height: 3px; background: rgba(255,255,255,0.3); border-radius: 2px; overflow: hidden;
    &-bar { height: 100%; width: 60%; background: $color-primary; border-radius: 2px; }
  }
  &__time { font-size: 12px; color: rgba(255,255,255,0.85); }
}

/* 新手引导（已移至顶部导航栏） */
</style>
