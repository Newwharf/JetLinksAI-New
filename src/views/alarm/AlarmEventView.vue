<script setup lang="ts">
/**
 * 告警事件
 * 三栏：左 场景/区域/等级筛选 ｜中 告警明细列表｜右 单条明细详情
 */
import { message } from 'ant-design-vue'
import {
  alarmEvents,
  alarmRecords,
  alarmHistory,
  handleHistory,
  sceneIcons,
  areaText,
  type AlarmLevel,
  type AlarmStatus,
  type AlarmHistoryItem
} from './mock'

// ===== 左栏：筛选维度 =====
type FilterMode = 'scene' | 'area' | 'level'
const filterMode = ref<FilterMode>('scene')

// 当前选中的筛选条件
const activeScene = ref<string>('')   // 选中的场景名
const activeEventId = ref<string>('') // 选中的检测项 eventId
const activeLevel = ref<AlarmLevel | ''>('')

// 场景列表（从 events 聚合）
const sceneGroups = computed(() => {
  const map = new Map<string, { name: string; count: number }>()
  for (const e of alarmEvents) {
    const cur = map.get(e.scene) || { name: e.scene, count: 0 }
    cur.count += e.count
    map.set(e.scene, cur)
  }
  return Array.from(map.values())
})

// 某场景下的检测项（events）
function eventsInScene(scene: string) {
  return alarmEvents.filter(e => e.scene === scene)
}

// 区域树（从 records 按 areaPath 聚合为三级树：园区 > 楼栋 > 楼层）
interface AreaNode {
  key: string
  name: string
  count: number
  children?: AreaNode[]
}
const areaTree = computed<AreaNode[]>(() => {
  const root = new Map<string, AreaNode>()
  for (const r of alarmRecords) {
    const path = r.areaPath
    // 第0级：园区
    const p0 = path[0] || '未分配'
    if (!root.has(p0)) root.set(p0, { key: `area-${p0}`, name: p0, count: 0, children: [] })
    const n0 = root.get(p0)!
    n0.count++
    // 第1级：楼栋
    if (path.length > 1) {
      const p1 = path[1]
      n0.children = n0.children || []
      let n1 = n0.children.find(c => c.name === p1)
      if (!n1) {
        n1 = { key: `area-${p0}/${p1}`, name: p1, count: 0, children: [] }
        n0.children.push(n1)
      }
      n1.count++
      // 第2级：楼层
      if (path.length > 2) {
        const p2 = path[2]
        n1.children = n1.children || []
        let n2 = n1.children.find(c => c.name === p2)
        if (!n2) {
          n2 = { key: `area-${p0}/${p1}/${p2}`, name: p2, count: 0 }
          n1.children.push(n2)
        }
        n2.count++
      }
    }
  }
  return Array.from(root.values())
})

// 区域树展开状态
const areaExpandedKeys = ref<Set<string>>(new Set())

function toggleAreaExpand(key: string) {
  if (areaExpandedKeys.value.has(key)) areaExpandedKeys.value.delete(key)
  else areaExpandedKeys.value.add(key)
  // 触发响应式更新
  areaExpandedKeys.value = new Set(areaExpandedKeys.value)
}

// 区域选中逻辑改为按完整路径匹配
function selectAreaPath(path: string) {
  // path 格式：园区/楼栋/楼层，用于匹配 records
  activeAreaPath.value = activeAreaPath.value === path ? '' : path
}
const activeAreaPath = ref('')

// 等级列表
const levelGroups = computed(() => {
  const levels: AlarmLevel[] = ['超紧急', '紧急', '严重', '一般', '提醒']
  return levels.map(lv => ({
    level: lv,
    count: alarmRecords.filter(r => r.level === lv).length
  }))
})

// 当前筛选条件下的 records（左栏选中维度）
const baseFilteredRecords = computed(() => {
  if (filterMode.value === 'scene') {
    if (activeEventId.value) return alarmRecords.filter(r => r.eventId === activeEventId.value)
    if (activeScene.value) {
      const eventIds = eventsInScene(activeScene.value).map(e => e.id)
      return alarmRecords.filter(r => eventIds.includes(r.eventId))
    }
    return alarmRecords
  }
  if (filterMode.value === 'area') {
    if (activeAreaPath.value) return alarmRecords.filter(r => r.areaPath.join('/') === activeAreaPath.value)
    return alarmRecords
  }
  // level
  if (activeLevel.value) return alarmRecords.filter(r => r.level === activeLevel.value)
  return alarmRecords
})

// 中间列标题
const middleTitle = computed(() => {
  if (filterMode.value === 'scene') {
    if (activeEventId.value) return alarmEvents.find(e => e.id === activeEventId.value)?.name || ''
    if (activeScene.value) return activeScene.value
    return '全部'
  }
  if (filterMode.value === 'area') return activeAreaPath.value ? activeAreaPath.value.split('/').pop() : '全部区域'
  return activeLevel.value || '全部等级'
})

// 切换维度时重置选中
watch(filterMode, () => {
  activeScene.value = ''
  activeEventId.value = ''
  activeAreaPath.value = ''
  areaExpandedKeys.value = new Set()
  activeLevel.value = ''
})

// 选中场景
function selectScene(scene: string) {
  if (activeScene.value === scene && !activeEventId.value) {
    // 已选中该场景且没选检测项 → 取消
    activeScene.value = ''
  } else {
    activeScene.value = scene
    activeEventId.value = ''
  }
}
function selectEvent(id: string) {
  activeEventId.value = activeEventId.value === id ? '' : id
}
function selectLevel(lv: AlarmLevel) {
  activeLevel.value = activeLevel.value === lv ? '' : lv
}

// ===== 中栏：有效性 + 状态 过滤 =====
const validFilter = ref<'valid' | 'invalid'>('valid')
const statusFilter = ref<'all' | AlarmStatus>('all')

const filteredRecords = computed(() => {
  let list = baseFilteredRecords.value
  if (validFilter.value === 'valid') list = list.filter(r => r.valid)
  else list = list.filter(r => !r.valid)
  if (statusFilter.value !== 'all') list = list.filter(r => r.status === statusFilter.value)
  return list
})

// 当前选中明细
const activeRecordId = ref<string>('')
const activeRecord = computed(() =>
  alarmRecords.find(r => r.id === activeRecordId.value) || filteredRecords.value[0]
)

// 切换筛选条件时，重置选中
watch(filteredRecords, () => {
  if (!filteredRecords.value.find(r => r.id === activeRecordId.value)) {
    activeRecordId.value = filteredRecords.value[0]?.id || ''
  }
})

function selectRecord(id: string) {
  activeRecordId.value = id
}

// ===== 右栏：操作 =====
function archiveRecord() {
  if (!activeRecord.value) return
  message.success(`「${activeRecord.value.title}」已归档`)
}

// ===== 标记已处理弹窗 =====
const resolveModalVisible = ref(false)
const resolveNote = ref('')
const resolveAttachments = ref<string[]>([])
const resolving = ref(false)

function openResolveModal() {
  resolveNote.value = ''
  resolveAttachments.value = []
  resolving.value = false
  resolveModalVisible.value = true
}

function handleUpload(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  for (const file of Array.from(input.files)) {
    resolveAttachments.value.push(file.name)
  }
}

function removeAttachment(idx: number) {
  resolveAttachments.value.splice(idx, 1)
}

function confirmResolve() {
  if (!activeRecord.value) return
  if (!resolveNote.value.trim()) {
    message.warning('请填写处理说明')
    return
  }
  resolving.value = true
  setTimeout(() => {
    resolving.value = false
    activeRecord.value!.status = '已处理'
    resolveModalVisible.value = false
    message.success('已标记为已处理')
  }, 600)
}

// ===== 抽屉 =====
const drawerType = ref<'alarm' | 'handle' | null>(null)
const drawerTitle = computed(() => drawerType.value === 'alarm' ? '告警历史' : '处理历史')
const drawerRecords = computed(() => {
  if (!activeRecord.value || !drawerType.value) return []
  const rid = activeRecord.value.id
  if (drawerType.value === 'alarm') return alarmHistory.filter(h => h.recordId === rid)
  return handleHistory.filter(h => h.recordId === rid)
})

// ===== 告警历史详情弹窗 =====
const historyDetailVisible = ref(false)
const activeHistoryId = ref<string>('')

// 当前查看的历史记录
const activeHistory = computed(() =>
  alarmHistory.find(h => h.id === activeHistoryId.value) || null
)

// 历史记录所属的告警明细（用于取截图、事件名等）
function getRecordByHistory(h: AlarmHistoryItem | null) {
  if (!h) return null
  return alarmRecords.find(r => r.id === h.recordId) || null
}

// 历史记录所属的事件名（检测类型）
function getEventNameByHistory(h: AlarmHistoryItem | null) {
  const record = getRecordByHistory(h)
  if (!record) return ''
  return alarmEvents.find(e => e.id === record.eventId)?.name || ''
}

function openHistoryDetail(id: string) {
  activeHistoryId.value = id
  historyDetailVisible.value = true
}

// ===== 配色映射 =====
const levelClass: Record<AlarmLevel, string> = {
  超紧急: 'lv-超紧急',
  紧急: 'lv-紧急',
  严重: 'lv-严重',
  一般: 'lv-一般',
  提醒: 'lv-提醒'
}
const statusClass: Record<AlarmStatus, string> = {
  待处理: 'st-待处理',
  已处理: 'st-已处理'
}

// 待处理总数
const pendingTotal = computed(() =>
  alarmRecords.filter(r => r.status === '待处理' && r.valid).length
)
</script>

<template>
  <div class="alarm-page">
    <!-- ===== 左：筛选维度 ===== -->
    <aside class="col col-filter">
      <!-- 维度切换 -->
      <div class="filter-tabs">
        <button class="filter-tab" :class="{ active: filterMode === 'scene' }" @click="filterMode = 'scene'">
          <i class="i-ant-design-appstore-outlined" /><span>场景</span>
        </button>
        <button class="filter-tab" :class="{ active: filterMode === 'area' }" @click="filterMode = 'area'">
          <i class="i-ant-design-environment-outlined" /><span>区域</span>
        </button>
        <button class="filter-tab" :class="{ active: filterMode === 'level' }" @click="filterMode = 'level'">
          <i class="i-ant-design-alert-outlined" /><span>等级</span>
        </button>
      </div>

      <!-- 场景模式 -->
      <div v-if="filterMode === 'scene'" class="filter-body">
        <template v-for="sg in sceneGroups" :key="sg.name">
          <!-- 场景分组 -->
          <div class="scene-group" :class="{ expanded: activeScene === sg.name || (!activeScene && !activeEventId) }">
            <div class="scene-group__head" @click="selectScene(sg.name)">
              <i class="i-ant-design-right-outlined scene-group__arrow" :class="{ rotated: activeScene === sg.name }" />
              <i :class="sceneIcons[sg.name]" class="scene-group__icon" />
              <span class="scene-group__name">{{ sg.name }}</span>
              <em class="scene-group__count">{{ sg.count }}</em>
            </div>
            <!-- 检测项 -->
            <div v-if="activeScene === sg.name" class="scene-children">
              <div
                v-for="e in eventsInScene(sg.name)"
                :key="e.id"
                class="scene-child"
                :class="{ 'is-active': activeEventId === e.id }"
                @click="selectEvent(e.id)"
              >
                <i :class="e.icon" class="scene-child__icon" />
                <span class="scene-child__name">{{ e.name }}</span>
                <em class="scene-child__count">{{ e.count }}</em>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- 区域模式 -->
      <div v-if="filterMode === 'area'" class="filter-body">
        <template v-for="n0 in areaTree" :key="n0.key">
          <!-- 园区 -->
          <div class="area-node area-node--0">
            <div class="area-node__head" @click="toggleAreaExpand(n0.key)">
              <i class="i-ant-design-right-outlined area-node__arrow" :class="{ rotated: areaExpandedKeys.has(n0.key) }" />
              <i class="i-ant-design-bank-outlined area-node__icon" />
              <span class="area-node__name">{{ n0.name }}</span>
              <em class="area-node__count">{{ n0.count }}</em>
            </div>
            <!-- 楼栋 -->
            <template v-if="areaExpandedKeys.has(n0.key) && n0.children">
              <div v-for="n1 in n0.children" :key="n1.key" class="area-node area-node--1">
                <div class="area-node__head" @click="toggleAreaExpand(n1.key)">
                  <i class="i-ant-design-right-outlined area-node__arrow" :class="{ rotated: areaExpandedKeys.has(n1.key) }" />
                  <i class="i-ant-design-apartment-outlined area-node__icon" />
                  <span class="area-node__name">{{ n1.name }}</span>
                  <em class="area-node__count">{{ n1.count }}</em>
                </div>
                <!-- 楼层 -->
                <template v-if="areaExpandedKeys.has(n1.key) && n1.children">
                  <div
                    v-for="n2 in n1.children"
                    :key="n2.key"
                    class="area-leaf"
                    :class="{ 'is-active': activeAreaPath === `${n0.name}/${n1.name}/${n2.name}` }"
                    @click="selectAreaPath(`${n0.name}/${n1.name}/${n2.name}`)"
                  >
                    <span class="area-leaf__dot" />
                    <span class="area-leaf__name">{{ n2.name }}</span>
                    <em class="area-leaf__count">{{ n2.count }}</em>
                  </div>
                </template>
              </div>
            </template>
          </div>
        </template>
      </div>

      <!-- 等级模式 -->
      <div v-if="filterMode === 'level'" class="filter-body">
        <div
          v-for="lg in levelGroups"
          :key="lg.level"
          class="filter-item"
          :class="{ 'is-active': activeLevel === lg.level }"
          @click="selectLevel(lg.level)"
        >
          <span class="filter-item__dot" :class="levelClass[lg.level]" />
          <span class="filter-item__name">{{ lg.level }}</span>
          <em class="filter-item__count">{{ lg.count }}</em>
        </div>
      </div>

      <div class="filter-footer">
        <span class="filter-footer__total">共 {{ alarmRecords.length }} 条告警 · {{ pendingTotal }} 待处理</span>
      </div>
    </aside>

    <!-- ===== 中：告警明细 ===== -->
    <section class="col col-records">
      <div class="col-head">
        <div class="col-title">
          <strong>{{ middleTitle }}</strong>
          <span class="col-count">{{ filteredRecords.length }} 条</span>
        </div>
      </div>

      <!-- 有效性筛选 -->
      <div class="valid-filter">
        <button class="valid-btn" :class="{ active: validFilter === 'valid' }" @click="validFilter = 'valid'">
          <i class="i-ant-design-check-circle-outlined" /><span>有效告警</span>
        </button>
        <button class="valid-btn valid-btn--invalid" :class="{ active: validFilter === 'invalid' }" @click="validFilter = 'invalid'">
          <i class="i-ant-design-block-outlined" /><span>拦截误报</span>
        </button>
      </div>

      <!-- 状态筛选（仅有效告警模式显示） -->
      <div v-if="validFilter === 'valid'" class="record-filter">
        <button class="status-btn" :class="{ active: statusFilter === 'all' }" @click="statusFilter = 'all'">全部</button>
        <button class="status-btn" :class="{ active: statusFilter === '待处理' }" @click="statusFilter = '待处理'">待处理</button>
        <button class="status-btn" :class="{ active: statusFilter === '已处理' }" @click="statusFilter = '已处理'">已处理</button>
      </div>

      <div class="record-list">
        <article
          v-for="r in filteredRecords"
          :key="r.id"
          class="record-item"
          :class="{ 'is-active': r.id === activeRecordId }"
          @click="selectRecord(r.id)"
        >
          <div class="record-item__thumb">
            <img :src="r.thumb" :alt="r.title" draggable="false" />
            <span class="record-item__level" :class="levelClass[r.level]">{{ r.level }}</span>
            <span v-if="!r.valid" class="record-item__invalid">误报</span>
          </div>
          <div class="record-item__body">
            <div class="record-item__title" :title="r.title">{{ r.title }}</div>
            <div class="record-item__row">
              <i class="i-ant-design-video-camera-outlined" />
              <span>{{ r.camera }}</span>
            </div>
            <div class="record-item__row">
              <i class="i-ant-design-environment-outlined" />
              <span class="record-item__area" :title="areaText(r.areaPath)">{{ areaText(r.areaPath) }}</span>
            </div>
            <div class="record-item__foot">
              <span v-if="validFilter === 'valid'" class="record-item__status" :class="statusClass[r.status]">{{ r.status }}</span>
              <span class="record-item__time">
                <i class="i-ant-design-clock-circle-outlined" />
                {{ r.time }}
              </span>
            </div>
          </div>
        </article>
        <div v-if="filteredRecords.length === 0" class="col-empty">
          <i class="i-ant-design-check-circle-outlined col-empty__icon" />
          <p>没有匹配的告警明细</p>
        </div>
      </div>
    </section>

    <!-- ===== 右：明细详情 ===== -->
    <section class="col col-detail">
      <template v-if="activeRecord">
        <!-- 标题行 + 功能按钮 -->
        <div class="detail-top">
          <div class="detail-top__title-row">
            <span v-if="!activeRecord.valid" class="detail-invalid-tag">拦截误报</span>
            <span class="detail-top__title">{{ activeRecord.title }}</span>
            <span class="detail-top__level" :class="levelClass[activeRecord.level]">{{ activeRecord.level }}</span>
            <span v-if="activeRecord.valid" class="detail-top__status" :class="statusClass[activeRecord.status]">{{ activeRecord.status }}</span>
          </div>
          <div class="detail-top__actions">
            <button class="top-btn" @click="drawerType = 'alarm'">
              <i class="i-ant-design-history-outlined" /><span>告警历史</span>
            </button>
            <button class="top-btn" @click="drawerType = 'handle'">
              <i class="i-ant-design-solution-outlined" /><span>处理历史</span>
            </button>
            <button class="top-btn" @click="archiveRecord">
              <i class="i-ant-design-folder-outlined" /><span>归档</span>
            </button>
          </div>
        </div>

        <div class="detail-body">
          <!-- 截图 -->
          <div class="detail-thumb">
            <img :src="activeRecord.thumb" :alt="activeRecord.title" draggable="false" />
            <div class="detail-thumb__overlay" />
          </div>

          <!-- 描述 -->
          <p class="detail-desc">{{ activeRecord.desc }}</p>

          <!-- 字段表 -->
          <ul class="detail-fields">
            <li class="detail-field">
              <span class="detail-field__label">触发时间</span>
              <span class="detail-field__value">{{ activeRecord.time }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field__label">触发摄像头</span>
              <span class="detail-field__value">{{ activeRecord.camera }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field__label">所属网关</span>
              <span class="detail-field__value">{{ activeRecord.gateway }}</span>
            </li>
            <li class="detail-field">
              <span class="detail-field__label">所属区域</span>
              <span class="detail-field__value">{{ areaText(activeRecord.areaPath) }}</span>
            </li>
          </ul>

          <!-- 置信度 - 多目标标签+条形（仅有效告警显示） -->
          <div v-if="activeRecord.valid" class="confidence-section">
            <div class="confidence-section__head">
              <i class="i-ant-design-target-outlined" />
              <span>检测目标置信度</span>
              <em class="confidence-section__count">{{ activeRecord.targets.length }} 个目标</em>
            </div>
            <div class="confidence-tags">
              <div
                v-for="(t, i) in activeRecord.targets"
                :key="i"
                class="conf-tag"
                :class="{ 'conf-tag--high': t.confidence >= 85, 'conf-tag--mid': t.confidence >= 70 && t.confidence < 85, 'conf-tag--low': t.confidence < 70 }"
              >
                <span class="conf-tag__type">{{ t.type }}</span>
                <div class="conf-tag__bar">
                  <div class="conf-tag__bar-fill" :style="{ width: t.confidence + '%' }" />
                </div>
                <span class="conf-tag__value">{{ t.confidence }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作 -->
        <div v-if="activeRecord.valid && activeRecord.status === '待处理'" class="detail-actions">
          <button class="detail-btn detail-btn--primary" @click="openResolveModal">
            <i class="i-ant-design-check-outlined" />
            <span>标记已处理</span>
          </button>
        </div>
      </template>

      <!-- 无选中 -->
      <div v-else class="col-empty detail-empty">
        <i class="i-ant-design-file-search-outlined col-empty__icon" />
        <p>请选择左侧告警明细查看详情</p>
      </div>
    </section>

    <!-- ===== 历史抽屉 ===== -->
    <a-drawer
      :open="drawerType !== null"
      :title="drawerTitle"
      placement="right"
      :width="'33.33%'"
      :body-style="{ padding: '0' }"
      @close="drawerType = null"
    >
      <div class="drawer-list">
        <!-- 告警历史 -->
        <template v-if="drawerType === 'alarm'">
          <div
            v-for="h in drawerRecords"
            :key="h.id"
            class="drawer-item drawer-item--clickable"
            @click="openHistoryDetail(h.id)"
          >
            <div class="drawer-item__time-head">
              <i class="i-ant-design-clock-circle-outlined" />
              <span>{{ h.time }}</span>
              <i class="drawer-item__arrow i-ant-design-right-outlined" />
            </div>
            <p class="drawer-item__scene">{{ (h as any).sceneDesc }}</p>
          </div>
        </template>
        <!-- 处理历史 -->
        <template v-else>
          <div v-for="h in drawerRecords" :key="h.id" class="drawer-item">
            <div class="drawer-item__head">
              <span class="drawer-item__action">{{ (h as any).action }}</span>
              <span class="drawer-item__time">{{ (h as any).time }}</span>
            </div>
            <div class="drawer-item__operator">
              <i class="i-ant-design-user-outlined" />
              <span>{{ (h as any).operator }}</span>
            </div>
            <p class="drawer-item__detail">{{ (h as any).result }}</p>
          </div>
        </template>
        <div v-if="drawerRecords.length === 0" class="drawer-empty">
          <i class="i-ant-design-inbox-outlined" />
          <p>暂无历史记录</p>
        </div>
      </div>
    </a-drawer>

    <!-- ===== 标记已处理弹窗 ===== -->
    <a-modal
      v-model:open="resolveModalVisible"
      title="标记已处理"
      :width="460"
      :footer="null"
      centered
      :body-style="{ padding: '0' }"
      @cancel="resolveModalVisible = false"
    >
      <div class="resolve-modal">
        <!-- 说明信息 -->
        <div class="resolve-field">
          <label class="resolve-field__label">处理说明 <em>*</em></label>
          <a-textarea
            v-model:value="resolveNote"
            placeholder="请描述处理过程和结果"
            :rows="4"
            :max-length="200"
          />
        </div>

        <!-- 附件上传 -->
        <div class="resolve-field">
          <label class="resolve-field__label">附件上传</label>
          <div class="resolve-upload">
            <label class="resolve-upload__zone">
              <input type="file" multiple accept="image/*,.pdf,.doc,.docx" hidden @change="handleUpload" />
              <i class="i-ant-design-cloud-upload-outlined" />
              <span>点击上传</span>
              <small>支持图片、PDF、Word 文件</small>
            </label>
            <div v-if="resolveAttachments.length > 0" class="resolve-upload__files">
              <div v-for="(name, i) in resolveAttachments" :key="i" class="resolve-upload__file">
                <i class="i-ant-design-paper-clip-outlined" />
                <span class="resolve-upload__filename">{{ name }}</span>
                <button type="button" class="resolve-upload__remove" @click="removeAttachment(i)">
                  <i class="i-ant-design-close-outlined" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 操作 -->
        <div class="resolve-actions">
          <button class="detail-btn" type="button" :disabled="resolving" @click="resolveModalVisible = false">取消</button>
          <button class="detail-btn detail-btn--primary" type="button" :disabled="resolving" @click="confirmResolve">
            <i v-if="resolving" class="i-ant-design-loading-outlined sync-spin" />
            <i v-else class="i-ant-design-check-outlined" />
            <span>{{ resolving ? '提交中...' : '确认处理' }}</span>
          </button>
        </div>
      </div>
    </a-modal>

    <!-- ===== 告警历史详情弹窗 ===== -->
    <a-modal
      v-model:open="historyDetailVisible"
      :title="null"
      :width="560"
      :footer="null"
      centered
      :body-style="{ padding: '0' }"
      @cancel="historyDetailVisible = false"
    >
      <div v-if="activeHistory" class="history-modal">
        <!-- 标题：时间 -->
        <div class="history-modal__head">
          <i class="i-ant-design-clock-circle-outlined" />
          <span>{{ activeHistory.time }}</span>
        </div>
        <!-- 摄像头画面 -->
        <div class="history-modal__thumb">
          <img
            :src="getRecordByHistory(activeHistory)?.thumb"
            :alt="getRecordByHistory(activeHistory)?.camera"
            draggable="false"
          />
          <div class="history-modal__thumb-overlay" />
          <span class="history-modal__live">
            <i class="history-modal__live-dot" />录像回放
          </span>
        </div>
        <!-- 检测类型 -->
        <div class="history-modal__type">
          <span class="history-modal__type-label">检测类型</span>
          <span class="history-modal__type-value">{{ getEventNameByHistory(activeHistory) }}</span>
        </div>
        <!-- AI 告警摘要描述 -->
        <div class="history-modal__desc">
          <div class="history-modal__desc-head">
            <i class="i-ant-design-robot-outlined" />
            <span>AI 告警摘要</span>
          </div>
          <p class="history-modal__desc-text">{{ activeHistory.sceneDesc }}</p>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.alarm-page {
  height: 100%;
  background: transparent;
  padding: 8px;
  display: grid;
  grid-template-columns: 280px 360px 1fr;
  gap: 8px;
  overflow: hidden;
  color: $text-base;
}

/* ===== 通用列样式 ===== */
.col {
  background: #fff;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.col-head {
  padding: 14px 16px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.col-title {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;

  strong {
    font-size: 15px;
    font-weight: 600;
    color: $text-base;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-count {
    font-size: 12px;
    color: $text-muted;
    flex-shrink: 0;
  }
}

.col-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: $text-muted;
  padding: 40px 20px;

  &__icon { font-size: 40px; opacity: 0.3; }
  p { font-size: 13px; margin: 0; }
}

/* ===== 左：筛选维度 ===== */
.col-filter { display: flex; flex-direction: column; }

.filter-tabs {
  display: flex;
  padding: 8px;
  gap: 4px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.filter-tab {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 0;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  background: #fff;
  color: $text-secondary;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  i { font-size: 16px; }

  &:hover { border-color: rgba(110, 75, 255, 0.4); color: $color-primary; }
  &.active {
    border-color: $color-primary;
    background: $color-primary-bg;
    color: $color-primary;
    font-weight: 500;
  }
}

.filter-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.filter-footer {
  padding: 10px 14px;
  border-top: 1px solid $border-color-card;
  flex-shrink: 0;

  &__total { font-size: 11px; color: $text-muted; }
}

/* 场景分组 */
.scene-group {
  &__head {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;

    &:hover { background: #faf9ff; }
  }

  &__arrow {
    font-size: 11px;
    color: $text-muted;
    transition: transform 0.2s;
    &.rotated { transform: rotate(90deg); }
  }

  &__icon {
    font-size: 16px;
    color: $color-primary;
  }

  &__name {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: $text-base;
  }

  &__count {
    font-style: normal;
    font-size: 11px;
    min-width: 24px;
    height: 18px;
    line-height: 18px;
    text-align: center;
    padding: 0 6px;
    border-radius: 9px;
    background: $bg-page;
    color: $text-secondary;
  }
}

.scene-children {
  padding-left: 28px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 4px;
}

.scene-child {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { background: #faf9ff; }
  &.is-active {
    background: $color-primary-bg;
    .scene-child__name { color: $color-primary; font-weight: 500; }
    .scene-child__icon { color: $color-primary; }
  }

  &__icon { font-size: 13px; color: $text-muted; }
  &__name { flex: 1; font-size: 12px; color: $text-secondary; }
  &__count {
    font-style: normal;
    font-size: 10px;
    color: $text-muted;
    background: $bg-page;
    padding: 1px 6px;
    border-radius: 8px;
  }
}

/* 区域/等级通用项 */
.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { background: #faf9ff; }
  &.is-active {
    background: $color-primary-bg;
    border-color: rgba(110, 75, 255, 0.25);
  }

  &__icon { font-size: 16px; color: $text-muted; }
  &__name { flex: 1; font-size: 13px; font-weight: 500; color: $text-base; }
  &__count {
    font-style: normal;
    font-size: 11px;
    min-width: 24px;
    height: 18px;
    line-height: 18px;
    text-align: center;
    padding: 0 6px;
    border-radius: 9px;
    background: $bg-page;
    color: $text-secondary;
  }
  &__dot {
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    &.lv-超紧急 { background: #cf1322; }
    &.lv-紧急 { background: #ff4d4f; }
    &.lv-严重 { background: #fa8c16; }
    &.lv-一般 { background: #597ef7; }
    &.lv-提醒 { background: $color-online; }
  }
}

/* 区域树节点 */
.area-node {
  &__head {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;

    &:hover { background: #faf9ff; }
  }

  &__arrow {
    font-size: 11px;
    color: $text-muted;
    transition: transform 0.2s;
    &.rotated { transform: rotate(90deg); }
  }

  &__icon { font-size: 15px; color: $color-primary; }

  &__name {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: $text-base;
  }

  &__count {
    font-style: normal;
    font-size: 11px;
    min-width: 24px;
    height: 18px;
    line-height: 18px;
    text-align: center;
    padding: 0 6px;
    border-radius: 9px;
    background: $bg-page;
    color: $text-secondary;
  }
}

.area-node--1 {
  padding-left: 22px;

  .area-node__name { font-weight: 500; font-size: 12px; }
  .area-node__icon { font-size: 14px; color: $text-secondary; }
}

.area-leaf {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  margin-left: 50px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { background: #faf9ff; }
  &.is-active {
    background: $color-primary-bg;
    .area-leaf__name { color: $color-primary; font-weight: 500; }
  }

  &__dot {
    width: 6px; height: 6px; border-radius: 50%; background: $border-color-light; flex-shrink: 0;
  }
  &__name { flex: 1; font-size: 12px; color: $text-secondary; }
  &__count {
    font-style: normal;
    font-size: 10px;
    color: $text-muted;
    background: $bg-page;
    padding: 1px 6px;
    border-radius: 8px;
  }
}

/* ===== 中：有效性 + 状态筛选 ===== */
.valid-filter {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.valid-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 30px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  i { font-size: 14px; }

  &:hover { border-color: rgba(110, 75, 255, 0.4); color: $color-primary; }

  &.active {
    border-color: $color-online;
    background: rgba(43, 179, 163, 0.08);
    color: $color-online;
    font-weight: 500;
  }

  &--invalid.active {
    border-color: #fa8c16;
    background: rgba(250, 140, 22, 0.08);
    color: #fa8c16;
  }
}

.record-filter {
  display: flex;
  padding: 8px 12px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
  gap: 0;
  background: $bg-page;
  border-radius: 0;
}

.status-btn {
  flex: 1;
  padding: 7px 0;
  border: none;
  background: transparent;
  color: $text-secondary;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
  text-align: center;
  border-radius: 6px;

  & + & { margin-left: 2px; }

  &:hover { color: $color-primary; background: rgba(110, 75, 255, 0.06); }
  &.active {
    background: #fff;
    color: $color-primary;
    font-weight: 600;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }
}

/* ===== 中：明细列表 ===== */
.record-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.record-item {
  display: flex;
  gap: 10px;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid $border-color-card;
  cursor: pointer;
  transition: all 0.18s;

  &:hover { border-color: rgba(110, 75, 255, 0.4); box-shadow: $shadow-card-active; }
  &.is-active { border-color: $color-primary; background: $color-primary-bg; }

  &__thumb {
    position: relative;
    width: 96px;
    aspect-ratio: 16 / 10;
    border-radius: 6px;
    overflow: hidden;
    flex-shrink: 0;
    background: #1a1a2e;

    img { width: 100%; height: 100%; object-fit: cover; }
  }

  &__level {
    position: absolute; top: 4px; left: 4px;
    font-size: 10px; font-weight: 500; padding: 1px 5px; border-radius: 3px; color: #fff;
    &.lv-超紧急 { background: #cf1322; }
    &.lv-紧急 { background: #ff4d4f; }
    &.lv-严重 { background: #fa8c16; }
    &.lv-一般 { background: #597ef7; }
    &.lv-提醒 { background: $color-online; }
  }

  &__invalid {
    position: absolute; bottom: 4px; left: 4px;
    font-size: 9px; font-weight: 500; padding: 1px 5px; border-radius: 3px;
    color: #fa8c16; background: rgba(250, 140, 22, 0.85);
  }

  &__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  &__title { font-size: 14px; font-weight: 600; color: $text-base; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__row { display: flex; align-items: center; gap: 5px; font-size: 12px; color: $text-secondary; min-width: 0;
    i { font-size: 12px; color: $text-muted; flex-shrink: 0; }
  }
  &__area { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 2px; }
  &__status {
    font-size: 11px; padding: 1px 6px; border-radius: 3px;
    &.st-待处理 { color: #ff4d4f; background: rgba(255, 77, 79, 0.1); }
    &.st-已处理 { color: $color-online; background: $color-online-bg; }
  }
  &__time { display: flex; align-items: center; gap: 3px; font-size: 11px; color: $text-muted;
    i { font-size: 11px; }
  }
}

/* ===== 右：详情 ===== */
.col-detail { display: flex; flex-direction: column; }

.detail-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 20px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;

  &__title-row { display: flex; align-items: center; gap: 8px; min-width: 0; }
  &__title { font-size: 17px; font-weight: 650; color: $text-base; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  &__actions { display: flex; gap: 6px; flex-shrink: 0; }
}

.detail-invalid-tag {
  font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 4px;
  color: #fa8c16; background: rgba(250, 140, 22, 0.1); flex-shrink: 0;
}

/* 标题行的等级 / 状态标签（从画面中移出，紧贴标题右侧左对齐） */
.detail-top__level {
  font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 4px; color: #fff; flex-shrink: 0;
  &.lv-超紧急 { background: #cf1322; }
  &.lv-紧急 { background: #ff4d4f; }
  &.lv-严重 { background: #fa8c16; }
  &.lv-一般 { background: #597ef7; }
  &.lv-提醒 { background: $color-online; }
}

.detail-top__status {
  font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 4px; flex-shrink: 0;
  &.st-待处理 { color: #ff4d4f; background: rgba(255, 77, 79, 0.1); }
  &.st-已处理 { color: $color-online; background: $color-online-bg; }
}

.top-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 10px;
  border: 1px solid $border-color-card;
  border-radius: 6px;
  background: #fff;
  color: $text-secondary;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;

  i { font-size: 13px; }
  &:hover { border-color: $color-primary; color: $color-primary; }
}

.detail-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.detail-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  background: #1a1a2e;

  img { width: 100%; height: 100%; object-fit: cover; }

  &__overlay {
    position: absolute; inset: 0;
    background: linear-gradient(to bottom, rgba(0, 0, 0, 0.4) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.3) 100%);
    pointer-events: none;
  }
}

.detail-desc {
  margin: 0;
  padding: 12px 14px;
  background: #f7f8fa;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: $text-secondary;
}

.detail-fields {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.detail-field {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid $border-color-card;

  &:last-child { border-bottom: none; }

  &__label { width: 88px; flex-shrink: 0; font-size: 13px; color: $text-muted; }
  &__value { flex: 1; font-size: 13px; color: $text-base; }
}

/* 置信度区域 */
.confidence-section {
  display: flex;
  flex-direction: column;
  gap: 10px;

  &__head {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: $text-base;

    i { font-size: 15px; color: $color-primary; }
  }

  &__count {
    font-style: normal;
    font-size: 11px;
    color: $text-muted;
    background: $bg-page;
    padding: 1px 7px;
    border-radius: 8px;
    font-weight: 400;
  }
}

.confidence-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.conf-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 8px;
  border-radius: 9999px;
  border: 1px solid $border-color-card;
  background: #fff;

  &__type {
    font-size: 12px;
    font-weight: 500;
    color: $text-base;
    flex-shrink: 0;
  }

  &__bar {
    width: 50px;
    height: 5px;
    border-radius: 3px;
    background: #eef0f4;
    overflow: hidden;
    flex-shrink: 0;
  }

  &__bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s;
  }

  &__value {
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
    min-width: 32px;
  }

  &--high {
    border-color: rgba(43, 179, 163, 0.3);
    background: rgba(43, 179, 163, 0.04);
    .conf-tag__bar-fill { background: $color-online; }
    .conf-tag__value { color: $color-online; }
  }

  &--mid {
    border-color: rgba(110, 75, 255, 0.2);
    .conf-tag__bar-fill { background: $color-primary; }
    .conf-tag__value { color: $color-primary; }
  }

  &--low {
    border-color: rgba(250, 140, 22, 0.2);
    .conf-tag__bar-fill { background: #fa8c16; }
    .conf-tag__value { color: #fa8c16; }
  }
}

/* 操作区 */
.detail-actions {
  display: flex;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid $border-color-card;
  flex-shrink: 0;
}

.detail-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 34px;
  padding: 0 16px;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  background: #fff;
  color: $text-base;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.18s;

  i { font-size: 14px; }
  &:hover { border-color: $color-primary; color: $color-primary; }

  &--primary {
    background: $color-primary;
    border-color: $color-primary;
    color: #fff;
    &:hover { background: $color-primary-hover; border-color: $color-primary-hover; color: #fff; }
  }
}

.detail-empty { flex: 1; }

/* ===== 抽屉 ===== */
.drawer-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.drawer-item {
  padding: 12px 14px;
  border: 1px solid $border-color-card;
  border-radius: 10px;

  &__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }

  &__action {
    font-size: 13px;
    font-weight: 600;
    color: $text-base;
  }

  &__time {
    font-size: 11px;
    color: $text-muted;
  }

  &__operator {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: $color-primary;
    margin-bottom: 4px;

    i { font-size: 12px; }
  }

  &__detail {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: $text-secondary;
  }
}

.drawer-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 60px 20px;
  color: $text-muted;

  i { font-size: 36px; opacity: 0.3; }
  p { font-size: 13px; margin: 0; }
}

/* 告警历史时间标题 + AI 场景描述 */
.drawer-item--clickable {
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: $color-primary;
    background: $color-primary-bg;
    box-shadow: 0 2px 8px rgba(110, 75, 255, 0.08);
  }
}

.drawer-item__time-head {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 600;
  color: $color-primary;
  margin-bottom: 8px;

  i { font-size: 14px; }
}

/* 时间标题里的箭头推到最右，提示可点击查看详情 */
.drawer-item__arrow {
  margin-left: auto;
  font-size: 12px;
  color: $text-muted;
  transition: all 0.15s;
}

.drawer-item--clickable:hover .drawer-item__arrow {
  color: $color-primary;
  transform: translateX(2px);
}

.drawer-item__scene {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: $text-secondary;
  /* 限制 2 行，避免列表过长 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ===== 标记已处理弹窗 ===== */
.resolve-modal {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 20px 24px;
}

.resolve-field {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__label {
    font-size: 13px;
    font-weight: 500;
    color: $text-base;

    em { color: #ff4d4f; font-style: normal; margin-left: 2px; }
  }
}

.resolve-upload {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &__zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 20px;
    border: 2px dashed $border-color-light;
    border-radius: 10px;
    cursor: pointer;
    color: $text-muted;
    transition: all 0.15s;

    &:hover { border-color: $color-primary; color: $color-primary; }

    i { font-size: 24px; }
    span { font-size: 13px; }
    small { font-size: 11px; color: $text-muted; }
  }

  &__files { display: flex; flex-direction: column; gap: 6px; }

  &__file {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border: 1px solid $border-color-card;
    border-radius: 8px;
    background: $bg-page;

    i { font-size: 14px; color: $color-primary; flex-shrink: 0; }
  }

  &__filename { flex: 1; font-size: 12px; color: $text-secondary; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }

  &__remove {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: $text-muted;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;

    i { font-size: 12px; }
    &:hover { background: rgba(255, 77, 79, 0.1); color: #ff4d4f; }
  }
}

.resolve-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* ===== 告警历史详情弹窗 ===== */
.history-modal {
  display: flex;
  flex-direction: column;
}

/* 标题：时间 */
.history-modal__head {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 20px 12px;
  font-size: 14px;
  font-weight: 600;
  color: $color-primary;
  border-bottom: 1px solid $border-color-card;

  i { font-size: 15px; }
}

/* 摄像头画面 */
.history-modal__thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #1a1a2e;
  overflow: hidden;

  img { width: 100%; height: 100%; object-fit: cover; }
}

.history-modal__thumb-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.35) 0%, transparent 30%, transparent 70%, rgba(0, 0, 0, 0.5) 100%);
  pointer-events: none;
}

.history-modal__live {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  color: #fff;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.history-modal__live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: $color-online;
}

/* 检测类型 */
.history-modal__type {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-bottom: 1px solid $border-color-card;
}

.history-modal__type-label {
  font-size: 13px;
  color: $text-muted;
  flex-shrink: 0;
}

.history-modal__type-value {
  font-size: 13px;
  font-weight: 500;
  color: $color-primary;
  background: $color-primary-bg;
  padding: 2px 10px;
  border-radius: 4px;
}

/* AI 告警摘要描述 */
.history-modal__desc {
  padding: 14px 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-modal__desc-head {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 600;
  color: $text-base;

  i { font-size: 15px; color: $color-primary; }
}

.history-modal__desc-text {
  margin: 0;
  padding: 12px 14px;
  background: #f7f8fa;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.7;
  color: $text-secondary;
}
</style>
