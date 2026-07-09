<script setup lang="ts">
/**
 * 老人档案管理
 * 左侧：老人树（楼栋→房间→老人），支持添加/删除老人
 * 右侧：基本信息（可编辑）+ 4个tab（行为统计/老人行为序列/护理行为序列/老人习惯）
 */
import { message, Modal } from 'ant-design-vue'
import ECharts from '@/components/ECharts.vue'
import { roomTree } from './bed.mock'
import {
  buildEvents,
  buildBehaviorStatsOption,
  behaviorTypes,
  personInfoMap,
  type BehaviorEvent,
  type TreeNode
} from './behavior.mock'
import {
  buildCareEvents,
  buildHabits,
  generateHabits,
  careTypes,
  type CareEvent,
  type Habit
} from './profile.mock'

// ===== 老人数据（前端 ref 持有，支持增删）=====
interface ElderProfile {
  id: string
  name: string
  gender: '男' | '女'
  age: number
  room: string
  bedNo: string
  building: string
  photo: string
  remark: string
  careLevel: '自理' | '半护' | '全护'
}

// 性别下拉选项
const genderOptions = [
  { value: '男', label: '男' },
  { value: '女', label: '女' }
]

// 床位树（楼栋→楼层→房间→床位），供新增/编辑弹窗的 tree-select 使用
interface BedTreeNode {
  key: string
  value: string
  label: string
  children?: BedTreeNode[]
}
const bedTreeData: BedTreeNode[] = roomTree.map(b => ({
  key: b.value,
  value: b.value,
  label: b.label,
  children: b.children?.map(f => ({
    key: f.value,
    value: f.value,
    label: f.label,
    children: f.children?.map(r => ({
      key: r.value,
      value: r.value,
      label: r.label,
      children: Array.from({ length: r.bedCount || 6 }, (_, i) => ({
        key: `${r.value}-bed-${i + 1}`,
        value: `${r.label}|${i + 1}床`,
        label: `${i + 1}床`
      }))
    }))
  }))
}))

// 床位值解析：从 "101室|1床" 解析出 room/bedNo/building
function parseBedValue(bedValue: string): { room: string; bedNo: string; building: string } | null {
  if (!bedValue || !bedValue.includes('|')) return null
  const [room, bedNo] = bedValue.split('|')
  // 查找 building
  for (const b of roomTree) {
    for (const f of b.children || []) {
      for (const r of f.children || []) {
        if (r.label === room) {
          return { room, bedNo, building: `${b.label}${f.label}` }
        }
      }
    }
  }
  return { room, bedNo, building: '' }
}

// 从 personInfoMap 初始化
const profiles = ref<ElderProfile[]>(
  Object.entries(personInfoMap).map(([id, p]) => ({
    id,
    name: p.name,
    gender: p.gender,
    age: p.age,
    room: p.room,
    bedNo: p.bedNo,
    building: p.building,
    photo: p.photo,
    remark: p.remark,
    careLevel: (['自理', '半护', '全护'] as const)[id.charCodeAt(1) % 3]
  }))
)

const allEvents = ref<BehaviorEvent[]>(buildEvents())
const allCareEvents = ref<CareEvent[]>(buildCareEvents())

// ===== 选中老人 =====
const selectedId = ref<string>('p1')
const selected = computed(() => profiles.value.find(p => p.id === selectedId.value))

// ===== 构建树 =====
const treeData = computed<TreeNode[]>(() => {
  const buildingMap = new Map<string, Map<string, ElderProfile[]>>()
  for (const p of profiles.value) {
    if (!buildingMap.has(p.building)) buildingMap.set(p.building, new Map())
    const roomMap = buildingMap.get(p.building)!
    if (!roomMap.has(p.room)) roomMap.set(p.room, [])
    roomMap.get(p.room)!.push(p)
  }
  return Array.from(buildingMap.entries()).map(([building, roomMap]) => ({
    key: building,
    value: building,
    label: building,
    nodeType: 'building' as const,
    children: Array.from(roomMap.entries()).map(([room, list]) => ({
      key: room,
      value: room,
      label: room,
      nodeType: 'room' as const,
      subLabel: `${list.length}位老人`,
      children: list.map(p => ({
        key: p.id,
        value: p.id,
        label: p.name,
        nodeType: 'person' as const,
        gender: p.gender,
        photo: p.photo,
        age: p.age,
        subLabel: p.bedNo
      }))
    }))
  }))
})

const treeSearchKey = ref('')
const filteredTree = computed(() => {
  if (!treeSearchKey.value.trim()) return treeData.value
  const k = treeSearchKey.value.trim()
  return treeData.value.map(b => ({
    ...b,
    children: b.children!.map(r => ({
      ...r,
      children: r.children!.filter(p => p.label.includes(k) || r.label.includes(k))
    })).filter(r => r.children!.length > 0)
  })).filter(b => b.children!.length > 0)
})

function onTreeSelect(value: any) {
  const v = String(value)
  if (v.startsWith('p')) selectedId.value = v
}

function onTreeMenu(key: string, personId: string) {
  selectedId.value = personId
  if (key === 'edit') {
    startEdit()
  } else if (key === 'delete') {
    const p = profiles.value.find(x => x.id === personId)
    if (p) deletePerson(p)
  }
}

// ===== 添加老人 =====
const addVisible = ref(false)
const addForm = reactive({
  name: '',
  gender: '女' as '男' | '女',
  age: undefined as number | undefined,
  bedValue: undefined as string | undefined,
  remark: '',
  photo: ''
})
const fileInput = ref<HTMLInputElement | null>(null)
const addError = computed(() => {
  if (!addForm.name.trim()) return '请输入姓名'
  if (!addForm.age) return '请输入年龄'
  if (!addForm.photo) return '请上传老人照片'
  return ''
})
function onPhotoChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files[0]) {
    addForm.photo = URL.createObjectURL(input.files[0])
  }
}
function submitAdd() {
  if (addError.value) return
  const bed = addForm.bedValue ? parseBedValue(addForm.bedValue) : null
  const newP: ElderProfile = {
    id: `p-new-${Date.now()}`,
    name: addForm.name.trim(),
    gender: addForm.gender,
    age: addForm.age!,
    room: bed?.room || '未分配',
    bedNo: bed?.bedNo || '未分配',
    building: bed?.building || '未分配',
    photo: addForm.photo,
    remark: addForm.remark.trim(),
    careLevel: '自理'
  }
  profiles.value.push(newP)
  selectedId.value = newP.id
  addVisible.value = false
  message.success('老人添加成功')
}

// ===== 删除老人 =====
function deletePerson(p: ElderProfile) {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除老人「${p.name}」的档案吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      profiles.value = profiles.value.filter(x => x.id !== p.id)
      if (selectedId.value === p.id) {
        selectedId.value = profiles.value[0]?.id || ''
      }
      message.success('已删除')
    }
  })
}

// ===== 基本信息 编辑（弹窗）=====
const editVisible = ref(false)
const editForm = reactive({
  name: '',
  gender: '女' as '男' | '女',
  age: 0,
  remark: '',
  careLevel: '自理' as '自理' | '半护' | '全护',
  photo: '',
  bedValue: undefined as string | undefined
})
const editFileInput = ref<HTMLInputElement | null>(null)
function startEdit() {
  if (!selected.value) return
  editForm.name = selected.value.name
  editForm.gender = selected.value.gender
  editForm.age = selected.value.age
  editForm.remark = selected.value.remark
  editForm.careLevel = selected.value.careLevel
  editForm.photo = selected.value.photo
  editForm.bedValue = selected.value.room !== '未分配' ? `${selected.value.room}|${selected.value.bedNo}` : undefined
  editVisible.value = true
}
function saveEdit() {
  if (!selected.value) return
  selected.value.name = editForm.name.trim()
  selected.value.gender = editForm.gender
  selected.value.age = editForm.age
  selected.value.remark = editForm.remark.trim()
  selected.value.careLevel = editForm.careLevel
  if (editForm.photo) selected.value.photo = editForm.photo
  const bed = editForm.bedValue ? parseBedValue(editForm.bedValue) : null
  if (bed) {
    selected.value.room = bed.room
    selected.value.bedNo = bed.bedNo
    selected.value.building = bed.building
  }
  editVisible.value = false
  message.success('已保存')
}
function onEditPhotoChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files[0]) {
    editForm.photo = URL.createObjectURL(input.files[0])
  }
}

// ===== tab =====
const activeTab = ref<'stats' | 'behavior' | 'care' | 'habit'>('stats')

// ===== tab1 行为统计 =====
const statDays = ref(7)
const statDaysOptions = [
  { value: 7, label: '近7天' },
  { value: 14, label: '近14天' },
  { value: 30, label: '近30天' }
]
const statEvents = computed(() => {
  const from = Date.now() - statDays.value * 86400000
  return allEvents.value.filter(e => e.timestamp >= from)
})
const statsOption = computed(() =>
  buildBehaviorStatsOption(selectedId.value, statEvents.value, statDays.value)
)

// ===== tab2 老人行为序列 =====
const behaviorKeyword = ref('')
const behaviorRange = ref('近7天')
const behaviorType = ref('all')
const behaviorFiltered = computed(() => {
  let evs = allEvents.value.filter(e => e.personId === selectedId.value)
  // 时间范围
  const now = Date.now()
  if (behaviorRange.value === '今天') {
    const today = new Date().setHours(0, 0, 0, 0)
    evs = evs.filter(e => e.timestamp >= today)
  } else if (behaviorRange.value === '近3天') {
    evs = evs.filter(e => e.timestamp >= now - 3 * 86400000)
  } else if (behaviorRange.value === '近7天') {
    evs = evs.filter(e => e.timestamp >= now - 7 * 86400000)
  } else if (behaviorRange.value === '近30天') {
    evs = evs.filter(e => e.timestamp >= now - 30 * 86400000)
  }
  // 类型
  if (behaviorType.value !== 'all') evs = evs.filter(e => e.typeKey === behaviorType.value)
  // 关键字
  if (behaviorKeyword.value.trim()) {
    const k = behaviorKeyword.value.trim()
    evs = evs.filter(e => e.desc.includes(k) || e.typeName.includes(k) || e.location.includes(k))
  }
  return evs
})
const behaviorDetail = ref<BehaviorEvent | null>(null)
const behaviorDetailOpen = ref(false)
const behaviorVideoVisible = ref(false)
function openBehaviorDetail(ev: BehaviorEvent) {
  behaviorDetail.value = ev
  behaviorDetailOpen.value = true
}

// ===== tab3 护理行为序列 =====
const careKeyword = ref('')
const careRange = ref('近7天')
const careType = ref('all')
const careStaff = ref('all')
// 护工选项
const staffOptions = computed(() => {
  const set = new Map<string, string>()
  for (const e of allCareEvents.value) set.set(e.staffId, e.staffName)
  return Array.from(set.entries()).map(([id, name]) => ({ value: id, label: name }))
})
const careFiltered = computed(() => {
  let evs = allCareEvents.value.filter(e => e.personId === selectedId.value)
  const now = Date.now()
  if (careRange.value === '今天') {
    const today = new Date().setHours(0, 0, 0, 0)
    evs = evs.filter(e => e.timestamp >= today)
  } else if (careRange.value === '近3天') {
    evs = evs.filter(e => e.timestamp >= now - 3 * 86400000)
  } else if (careRange.value === '近7天') {
    evs = evs.filter(e => e.timestamp >= now - 7 * 86400000)
  } else if (careRange.value === '近30天') {
    evs = evs.filter(e => e.timestamp >= now - 30 * 86400000)
  }
  if (careType.value !== 'all') evs = evs.filter(e => e.typeKey === careType.value)
  if (careStaff.value !== 'all') evs = evs.filter(e => e.staffId === careStaff.value)
  if (careKeyword.value.trim()) {
    const k = careKeyword.value.trim()
    evs = evs.filter(e => e.desc.includes(k) || e.typeName.includes(k) || e.staffName.includes(k))
  }
  return evs
})
const careDetail = ref<CareEvent | null>(null)
const careDetailOpen = ref(false)
const careVideoVisible = ref(false)
function openCareDetail(ev: CareEvent) {
  careDetail.value = ev
  careDetailOpen.value = true
}

// ===== tab4 老人习惯 =====
const habitData = ref<{ summary: string; habits: Habit[] }>({ summary: '', habits: [] })
function loadHabits() {
  habitData.value = buildHabits(selectedId.value)
}
watch(selectedId, () => {
  loadHabits()
}, { immediate: true })

// 习惯编辑
const habitEditVisible = ref(false)
const habitEditForm = reactive({ id: '', title: '', desc: '' })
const habitEditIsNew = ref(false)
function addHabit() {
  habitEditForm.id = ''
  habitEditForm.title = ''
  habitEditForm.desc = ''
  habitEditIsNew.value = true
  habitEditVisible.value = true
}
function editHabit(h: Habit) {
  habitEditForm.id = h.id
  habitEditForm.title = h.title
  habitEditForm.desc = h.desc
  habitEditIsNew.value = false
  habitEditVisible.value = true
}
function saveHabit() {
  if (!habitEditForm.title.trim()) { message.warning('请输入习惯标题'); return }
  if (habitEditIsNew.value) {
    habitData.value.habits.push({
      id: `h-${Date.now()}`,
      title: habitEditForm.title.trim(),
      desc: habitEditForm.desc.trim(),
      icon: 'i-ant-design-bulb-outlined'
    })
    message.success('习惯已添加')
  } else {
    const h = habitData.value.habits.find(x => x.id === habitEditForm.id)
    if (h) {
      h.title = habitEditForm.title.trim()
      h.desc = habitEditForm.desc.trim()
    }
    message.success('习惯已更新')
  }
  habitEditVisible.value = false
}
function deleteHabit(h: Habit) {
  habitData.value.habits = habitData.value.habits.filter(x => x.id !== h.id)
  message.success('习惯已删除')
}

// 分析生成
const generating = ref(false)
const genResult = ref<Habit[] | null>(null)
const genModalVisible = ref(false)
function analyzeGenerate() {
  generating.value = true
  setTimeout(() => {
    genResult.value = generateHabits(selectedId.value)
    generating.value = false
    genModalVisible.value = true
  }, 1200)
}
function applyGen(overwrite: boolean) {
  if (!genResult.value) return
  if (overwrite) {
    habitData.value.habits = [...genResult.value]
  } else {
    habitData.value.habits.push(...genResult.value)
  }
  genModalVisible.value = false
  message.success(overwrite ? '已覆盖原有习惯' : '已添加到习惯列表')
}

const careLevelColor: Record<string, string> = { '自理': '#52c41a', '半护': '#fa8c16', '全护': '#ff4d4f' }
</script>

<template>
  <div class="ep-page">
    <!-- 左侧：老人树 -->
    <aside class="ep-sidebar">
      <div class="sidebar-head">
        <span>老人列表</span>
        <button class="add-btn" @click="addVisible = true"><i class="i-ant-design-plus-outlined" /></button>
      </div>
      <div class="sidebar-search">
        <a-input v-model:value="treeSearchKey" placeholder="搜索姓名/房间" allow-clear size="small">
          <template #prefix><i class="i-ant-design-search-outlined" /></template>
        </a-input>
      </div>
      <div class="sidebar-tree scroll-thin">
        <a-tree
          :tree-data="filteredTree"
          :selected-keys="[selectedId]"
          :default-expand-all="true"
          :show-line="false"
          @select="(_k: any, info: any) => onTreeSelect(info.node.value)"
        >
          <template #title="node">
            <span class="tree-node" :class="node.nodeType">
              <i v-if="node.nodeType === 'room'" class="tree-icon i-ant-design-home-outlined" />
              <img v-else-if="node.nodeType === 'person'" class="tree-avatar" :src="node.photo" alt="" />
              <span class="tree-label">{{ node.label }}</span>
              <span v-if="node.subLabel" class="tree-sub">{{ node.subLabel }}</span>
              <a-dropdown v-if="node.nodeType === 'person'" trigger="click" placement="bottomRight">
                <button class="tree-more" @click.stop><i class="i-ant-design-more-outlined" /></button>
                <template #overlay>
                  <a-menu @click="(info: any) => onTreeMenu(info.key, node.value)">
                    <a-menu-item key="edit"><i class="i-ant-design-edit-outlined" />编辑</a-menu-item>
                    <a-menu-item key="delete"><i class="i-ant-design-delete-outlined" />删除</a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </span>
          </template>
        </a-tree>
      </div>
    </aside>

    <!-- 右侧 -->
    <div class="ep-main">
      <template v-if="selected">
        <!-- 基本信息 -->
        <div class="info-card">
          <div class="info-avatar">
            <img :src="selected.photo" alt="老人照片" />
          </div>
          <div class="info-body">
            <div class="info-name-row">
              <span class="info-name">{{ selected.name }}</span>
              <span class="info-tag" :class="selected.gender">{{ selected.gender }}</span>
              <span class="info-age">{{ selected.age }}岁</span>
              <span class="info-care" :style="{ background: careLevelColor[selected.careLevel] + '18', color: careLevelColor[selected.careLevel] }">{{ selected.careLevel }}</span>
            </div>
            <div class="info-meta">
              <span><i class="i-ant-design-environment-outlined" />{{ selected.building }}</span>
              <span><i class="i-ant-design-home-outlined" />{{ selected.room }}</span>
              <span><i class="i-ant-design-bed-outlined" />{{ selected.bedNo }}</span>
            </div>
            <div class="info-remark">
              <span class="remark-label">备注</span>
              <span class="remark-text">{{ selected.remark || '暂无备注' }}</span>
            </div>
          </div>
          <div class="info-actions">
            <button class="act-btn edit" @click="startEdit"><i class="i-ant-design-edit-outlined" />编辑</button>
            <button class="act-btn del" @click="deletePerson(selected)"><i class="i-ant-design-delete-outlined" />删除</button>
          </div>
        </div>

        <!-- tab 区（栏+内容连在一起）-->
        <div class="tab-section">
        <div class="tab-bar">
          <button class="tab-btn" :class="{ active: activeTab === 'stats' }" @click="activeTab = 'stats'">行为统计</button>
          <button class="tab-btn" :class="{ active: activeTab === 'behavior' }" @click="activeTab = 'behavior'">老人行为序列</button>
          <button class="tab-btn" :class="{ active: activeTab === 'care' }" @click="activeTab = 'care'">护理行为序列</button>
          <button class="tab-btn" :class="{ active: activeTab === 'habit' }" @click="activeTab = 'habit'">老人习惯</button>
        </div>

        <!-- tab 内容 -->
        <div class="tab-content">
          <!-- tab1 行为统计 -->
          <div v-if="activeTab === 'stats'" class="tab-pane">
            <div class="pane-toolbar">
              <span class="pane-title">行为统计</span>
              <a-select v-model:value="statDays" :options="statDaysOptions" size="small" style="width:100px" />
            </div>
            <div class="chart-wrap">
              <ECharts :option="statsOption" class="chart" />
            </div>
          </div>

          <!-- tab2 老人行为序列（左右分栏）-->
          <div v-else-if="activeTab === 'behavior'" class="tab-pane">
            <!-- 筛选 -->
            <div class="seq-filters">
              <a-input v-model:value="behaviorKeyword" placeholder="关键字" allow-clear size="small" style="width:130px" />
              <a-select v-model:value="behaviorRange" size="small" style="width:90px" :options="[{value:'今天',label:'今天'},{value:'近3天',label:'近3天'},{value:'近7天',label:'近7天'},{value:'近30天',label:'近30天'}]" />
              <a-select v-model:value="behaviorType" size="small" style="width:110px">
                <a-select-option value="all">全部类型</a-select-option>
                <a-select-option v-for="t in behaviorTypes" :key="t.key" :value="t.key">{{ t.label }}</a-select-option>
              </a-select>
              <span class="seq-count">{{ behaviorFiltered.length }} 条</span>
              <button v-if="behaviorDetailOpen" class="seq-collapse" @click="behaviorDetailOpen = false"><i class="i-ant-design-menu-fold-outlined" />收起详情</button>
            </div>
            <!-- 左右分栏 -->
            <div class="seq-body">
              <div class="seq-list scroll-thin" :class="{ collapsed: behaviorDetailOpen }">
                <div v-for="ev in behaviorFiltered" :key="ev.id" class="seq-card" :class="{ active: behaviorDetail?.id === ev.id }" @click="openBehaviorDetail(ev)">
                  <div class="seq-snap"><img :src="ev.snapshot" alt="" /></div>
                  <div class="seq-info">
                    <span class="seq-type" :style="{ background: (behaviorTypes.find(t => t.key === ev.typeKey)?.color||'#6e4bff')+'18', color: behaviorTypes.find(t=>t.key===ev.typeKey)?.color||'#6e4bff' }">{{ ev.typeName }}</span>
                    <span class="seq-time">{{ ev.time }}</span>
                    <span class="seq-cam"><i class="i-ant-design-video-camera-outlined" />{{ ev.camera }}</span>
                    <p class="seq-desc">{{ ev.desc }}</p>
                  </div>
                </div>
                <div v-if="behaviorFiltered.length===0" class="tl-empty"><i class="i-ant-design-inbox-outlined" /><p>暂无记录</p></div>
              </div>
              <transition name="slide">
                <div v-if="behaviorDetailOpen && behaviorDetail" class="seq-detail scroll-thin">
                  <div class="seq-detail-media" @click="behaviorVideoVisible = true">
                    <img :src="behaviorDetail.snapshot" class="seq-detail-media-img" alt="" />
                    <div class="seq-detail-play"><i class="i-ant-design-play-circle-outlined" /></div>
                    <span class="seq-detail-badge" :style="{ background: behaviorTypes.find(t=>t.key===behaviorDetail?.typeKey)?.color||'#6e4bff' }">{{ behaviorDetail?.typeName }}</span>
                  </div>
                  <div class="seq-detail-info">
                    <div class="seq-detail-type-row">
                      <span class="seq-detail-type-tag" :style="{ background: (behaviorTypes.find(t=>t.key===behaviorDetail?.typeKey)?.color||'#6e4bff')+'18', color: behaviorTypes.find(t=>t.key===behaviorDetail?.typeKey)?.color||'#6e4bff' }">{{ behaviorDetail?.typeName }}</span>
                    </div>
                    <div class="seq-detail-field"><i class="i-ant-design-clock-circle-outlined" /><span>{{ behaviorDetail.time }}</span></div>
                    <div class="seq-detail-field"><i class="i-ant-design-environment-outlined" /><span>{{ behaviorDetail.location }}</span></div>
                    <div class="seq-detail-field"><i class="i-ant-design-video-camera-outlined" /><span>{{ behaviorDetail.camera }}</span></div>
                    <div class="seq-detail-desc-box">
                      <span class="seq-desc-label">事件描述</span>
                      <p class="seq-desc-text">{{ behaviorDetail.desc }}</p>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </div>

          <!-- tab3 护理行为序列（左右分栏）-->
          <div v-else-if="activeTab === 'care'" class="tab-pane">
            <!-- 筛选 -->
            <div class="seq-filters">
              <a-input v-model:value="careKeyword" placeholder="关键字" allow-clear size="small" style="width:120px" />
              <a-select v-model:value="careRange" size="small" style="width:90px" :options="[{value:'今天',label:'今天'},{value:'近3天',label:'近3天'},{value:'近7天',label:'近7天'},{value:'近30天',label:'近30天'}]" />
              <a-select v-model:value="careType" size="small" style="width:110px">
                <a-select-option value="all">全部类型</a-select-option>
                <a-select-option v-for="t in careTypes" :key="t.key" :value="t.key">{{ t.label }}</a-select-option>
              </a-select>
              <a-select v-model:value="careStaff" size="small" style="width:100px">
                <a-select-option value="all">全部护工</a-select-option>
                <a-select-option v-for="s in staffOptions" :key="s.value" :value="s.value">{{ s.label }}</a-select-option>
              </a-select>
              <span class="seq-count">{{ careFiltered.length }} 条</span>
              <button v-if="careDetailOpen" class="seq-collapse" @click="careDetailOpen = false"><i class="i-ant-design-menu-fold-outlined" />收起详情</button>
            </div>
            <!-- 左右分栏 -->
            <div class="seq-body">
              <div class="seq-list scroll-thin" :class="{ collapsed: careDetailOpen }">
                <div v-for="ev in careFiltered" :key="ev.id" class="seq-card" :class="{ active: careDetail?.id === ev.id }" @click="openCareDetail(ev)">
                  <div class="seq-snap"><img :src="ev.snapshot" alt="" /></div>
                  <div class="seq-info">
                    <span class="seq-type" :style="{ background: (careTypes.find(t=>t.key===ev.typeKey)?.color||'#6e4bff')+'18', color: careTypes.find(t=>t.key===ev.typeKey)?.color||'#6e4bff' }">{{ ev.typeName }}</span>
                    <span class="seq-time">{{ ev.time }}</span>
                    <div class="seq-staff"><img class="seq-staff-avatar" :src="ev.staffPhoto" alt="" /><span>{{ ev.staffName }}</span></div>
                    <span class="seq-cam"><i class="i-ant-design-video-camera-outlined" />{{ ev.camera }}</span>
                    <p class="seq-desc">{{ ev.desc }}</p>
                  </div>
                </div>
                <div v-if="careFiltered.length===0" class="tl-empty"><i class="i-ant-design-inbox-outlined" /><p>暂无记录</p></div>
              </div>
              <transition name="slide">
                <div v-if="careDetailOpen && careDetail" class="seq-detail scroll-thin">
                  <div class="seq-detail-media" @click="careVideoVisible = true">
                    <img :src="careDetail.snapshot" class="seq-detail-media-img" alt="" />
                    <div class="seq-detail-play"><i class="i-ant-design-play-circle-outlined" /></div>
                    <span class="seq-detail-badge" :style="{ background: careTypes.find(t=>t.key===careDetail?.typeKey)?.color||'#6e4bff' }">{{ careDetail?.typeName }}</span>
                  </div>
                  <div class="seq-detail-info">
                    <div class="seq-detail-type-row">
                      <span class="seq-detail-type-tag" :style="{ background: (careTypes.find(t=>t.key===careDetail?.typeKey)?.color||'#6e4bff')+'18', color: careTypes.find(t=>t.key===careDetail?.typeKey)?.color||'#6e4bff' }">{{ careDetail?.typeName }}</span>
                    </div>
                    <div class="seq-detail-staff-row">
                      <img class="seq-staff-avatar lg" :src="careDetail.staffPhoto" alt="" />
                      <span>{{ careDetail.staffName }}</span>
                    </div>
                    <div class="seq-detail-field"><i class="i-ant-design-clock-circle-outlined" /><span>{{ careDetail.time }}</span></div>
                    <div class="seq-detail-field"><i class="i-ant-design-video-camera-outlined" /><span>{{ careDetail.camera }}</span></div>
                    <div v-if="careDetail.duration" class="seq-detail-field"><i class="i-ant-design-field-time-outlined" /><span>{{ careDetail.duration }}</span></div>
                    <div class="seq-detail-desc-box">
                      <span class="seq-desc-label">护理描述</span>
                      <p class="seq-desc-text">{{ careDetail.desc }}</p>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </div>

          <!-- tab4 老人习惯 -->
          <div v-else-if="activeTab === 'habit'" class="tab-pane habit-pane scroll-thin">
            <!-- 习惯总结 -->
            <div class="habit-summary-card">
              <div class="hs-content">
                <span class="hs-title"><i class="i-ant-design-bar-chart-outlined" />习惯总结</span>
                <p class="hs-text">{{ habitData.summary }}</p>
              </div>
              <button class="gen-btn" :disabled="generating" @click="analyzeGenerate">
                <i :class="generating ? 'i-ant-design-loading-outlined' : 'i-ant-design-thunderbolt-outlined'" />
                {{ generating ? '分析中...' : '分析生成' }}
              </button>
            </div>
            <!-- 习惯列表 -->
            <div class="habit-list-head">
              <span>习惯列表（{{ habitData.habits.length }}）</span>
            </div>
            <div class="habit-list">
              <div v-for="h in habitData.habits" :key="h.id" class="habit-card">
                <div class="habit-icon-wrap">
                  <i :class="h.icon || 'i-ant-design-bulb-outlined'" />
                </div>
                <div class="habit-content">
                  <div class="habit-title">{{ h.title }}</div>
                  <p class="habit-desc">{{ h.desc }}</p>
                </div>
                <div class="habit-ops">
                  <button class="op-btn" @click="editHabit(h)"><i class="i-ant-design-edit-outlined" /></button>
                  <button class="op-btn del" @click="deleteHabit(h)"><i class="i-ant-design-delete-outlined" /></button>
                </div>
              </div>
              <!-- 末尾添加习惯入口 -->
              <div class="habit-add-entry" @click="addHabit">
                <i class="i-ant-design-plus-outlined" />
                <span>添加习惯</span>
              </div>
              <div v-if="habitData.habits.length === 0" class="habit-empty">暂无习惯记录</div>
            </div>
          </div>
        </div>
        </div>
      </template>

      <!-- 未选中 -->
      <div v-else class="ep-empty">
        <i class="i-ant-design-user-outlined" />
        <p>请从左侧选择老人</p>
      </div>
    </div>

    <!-- 添加老人弹窗 -->
    <a-modal :open="addVisible" :width="520" centered title="添加老人" @cancel="addVisible = false">
      <div class="add-form">
        <div class="add-photo-area">
          <div v-if="addForm.photo" class="photo-preview">
            <img :src="addForm.photo" alt="照片" />
            <button class="photo-del" @click="addForm.photo = ''"><i class="i-ant-design-close-outlined" /></button>
          </div>
          <button v-else class="photo-upload" @click="fileInput?.click()">
            <i class="i-ant-design-camera-outlined" />
            <span>上传照片</span>
          </button>
          <input ref="fileInput" type="file" accept="image/*" hidden @change="onPhotoChange" />
        </div>
        <div class="add-row-grid">
          <div class="add-row"><label><span class="req">*</span>姓名</label><a-input v-model:value="addForm.name" placeholder="姓名" allow-clear /></div>
          <div class="add-row"><label><span class="req">*</span>年龄</label><a-input-number v-model:value="addForm.age" :min="40" :max="120" placeholder="年龄" style="width:100%" /></div>
        </div>
        <div class="add-row-grid">
          <div class="add-row"><label>性别</label><a-select v-model:value="addForm.gender" :options="genderOptions" /></div>
          <div class="add-row"><label>床位</label><a-tree-select v-model:value="addForm.bedValue" :tree-data="bedTreeData" :field-names="{ label: 'label', value: 'value', children: 'children' }" tree-default-expand-all allow-clear placeholder="选择床位（选填）" /></div>
        </div>
        <div class="add-row"><label>备注</label><a-textarea v-model:value="addForm.remark" :rows="2" placeholder="选填" /></div>
      </div>
      <template #footer>
        <div class="modal-footer">
          <span v-if="addError" class="modal-error">{{ addError }}</span>
          <div>
            <button class="btn-cancel" @click="addVisible = false">取消</button>
            <button class="btn-ok" :disabled="!!addError" @click="submitAdd">确定</button>
          </div>
        </div>
      </template>
    </a-modal>

    <!-- 编辑老人弹窗 -->
    <a-modal :open="editVisible" :width="520" centered title="编辑老人信息" @cancel="editVisible = false">
      <div class="add-form">
        <div class="add-photo-area">
          <div class="photo-preview">
            <img :src="editForm.photo" alt="照片" />
            <button class="photo-del" @click="editFileInput?.click()"><i class="i-ant-design-camera-outlined" /></button>
            <input ref="editFileInput" type="file" accept="image/*" hidden @change="onEditPhotoChange" />
          </div>
        </div>
        <div class="add-row-grid">
          <div class="add-row"><label><span class="req">*</span>姓名</label><a-input v-model:value="editForm.name" /></div>
          <div class="add-row"><label><span class="req">*</span>年龄</label><a-input-number v-model:value="editForm.age" :min="40" :max="120" style="width:100%" /></div>
        </div>
        <div class="add-row-grid">
          <div class="add-row"><label>性别</label><a-select v-model:value="editForm.gender" :options="genderOptions" /></div>
          <div class="add-row"><label>护理等级</label><a-select v-model:value="editForm.careLevel" style="width:100%"><a-select-option value="自理">自理</a-select-option><a-select-option value="半护">半护</a-select-option><a-select-option value="全护">全护</a-select-option></a-select></div>
        </div>
        <div class="add-row"><label>床位</label><a-tree-select v-model:value="editForm.bedValue" :tree-data="bedTreeData" :field-names="{ label: 'label', value: 'value', children: 'children' }" tree-default-expand-all allow-clear placeholder="选择床位（选填）" style="width:100%" /></div>
        <div class="add-row"><label>备注</label><a-textarea v-model:value="editForm.remark" :rows="2" /></div>
      </div>
      <template #footer>
        <button class="btn-cancel" @click="editVisible = false">取消</button>
        <button class="btn-ok" @click="saveEdit">保存</button>
      </template>
    </a-modal>

    <!-- 习惯编辑弹窗 -->
    <a-modal :open="habitEditVisible" :width="440" centered :title="habitEditIsNew ? '添加习惯' : '编辑习惯'" @cancel="habitEditVisible = false">
      <div class="habit-edit-form">
        <div class="add-row"><label>标题</label><a-input v-model:value="habitEditForm.title" placeholder="习惯标题" /></div>
        <div class="add-row"><label>描述</label><a-textarea v-model:value="habitEditForm.desc" :rows="3" placeholder="习惯描述" /></div>
      </div>
      <template #footer>
        <button class="btn-cancel" @click="habitEditVisible = false">取消</button>
        <button class="btn-ok" @click="saveHabit">保存</button>
      </template>
    </a-modal>

    <!-- 分析生成结果弹窗 -->
    <a-modal :open="genModalVisible" :width="560" centered title="分析生成结果" @cancel="genModalVisible = false">
      <div class="gen-list">
        <div v-for="h in genResult" :key="h.id" class="gen-item">
          <i :class="h.icon || 'i-ant-design-bulb-outlined'" />
          <div>
            <div class="gen-title">{{ h.title }}</div>
            <p class="gen-desc">{{ h.desc }}</p>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn-cancel" @click="genModalVisible = false">取消</button>
        <button class="btn-ok" @click="applyGen(false)">添加到列表</button>
        <button class="btn-ok" style="background:#ff4d4f" @click="applyGen(true)">覆盖原有</button>
      </template>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.ep-page {
  height: 100%;
  display: flex;
  gap: 12px;
  overflow: hidden;
  padding: 12px 16px;
}

/* ===== 左侧 ===== */
.ep-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-bottom: 1px solid $border-color-card;
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
}

.add-btn {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 5px;
  background: $color-primary;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  i { font-size: 14px; }
  &:hover { background: $color-primary-hover; }
}

.sidebar-search { padding: 8px 10px; border-bottom: 1px solid $border-color-card; }

.sidebar-tree {
  flex: 1;
  overflow-y: auto;
  padding: 4px 6px;
  :deep(.ant-tree) { font-size: 12px; }
  :deep(.ant-tree-indent-unit) { width: 8px !important; min-width: 8px !important; }
  :deep(.ant-tree-switcher) { width: 16px !important; min-width: 16px !important; }
  :deep(.ant-tree-treenode) { padding-top: 1px; padding-bottom: 1px; }
  :deep(.ant-tree .ant-tree-node-content-wrapper) { padding: 2px 4px; flex: 1; }
  :deep(.ant-tree .ant-tree-node-content-wrapper.ant-tree-node-selected) { background: $color-primary-bg; }
}

.tree-node {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  .tree-icon { font-size: 13px; color: $text-muted; flex-shrink: 0; }
  .tree-avatar { width: 20px; height: 20px; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 1px solid $border-color-card; }
  .tree-label { font-size: 12px; color: $text-base; white-space: nowrap; }
  .tree-sub { font-size: 10px; color: $text-muted; white-space: nowrap; }
  &.person .tree-label { font-weight: 500; }
}

/* ===== 右侧 ===== */
.ep-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

/* 基本信息 */
.info-card {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  flex-shrink: 0;
}

.info-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  border: 2px solid #fff;
  box-shadow: 0 0 0 1px $border-color-card;
  img { width: 100%; height: 100%; object-fit: cover; }
}

.info-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }

.info-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.info-name { font-size: 16px; font-weight: 600; color: $text-base; }
.info-tag {
  font-size: 11px; padding: 1px 7px; border-radius: 3px; font-weight: 500;
  &.男 { background: #e6f4ff; color: #1677ff; }
  &.女 { background: #fff0f6; color: #eb2f96; }
}
.info-age { font-size: 12px; color: $text-tertiary; }
.info-care { font-size: 10px; padding: 1px 7px; border-radius: 3px; font-weight: 500; }

.info-meta { display: flex; flex-wrap: wrap; gap: 4px 12px;
  span { display: flex; align-items: center; gap: 3px; font-size: 12px; color: $text-secondary; white-space: nowrap;
    i { font-size: 12px; color: $text-muted; }
  }
}

.info-remark {
  display: flex;
  align-items: baseline;
  gap: 6px;
  .remark-label { font-size: 11px; color: $text-muted; font-weight: 500; flex-shrink: 0; }
  .remark-text { font-size: 12px; color: $text-tertiary; }
}

.edit-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  label { font-size: 12px; color: $text-muted; white-space: nowrap; }
}
.edit-item { display: flex; align-items: center; gap: 6px; }

.info-actions {
  display: flex;
  flex-direction: row;
  gap: 8px;
  flex-shrink: 0;
  align-self: center;
}

.act-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit;
  border: 1px solid $border-color-light; background: #fff; color: $text-secondary;
  i { font-size: 13px; }
  &:hover { color: $color-primary; border-color: $color-primary; }
  &.edit { color: $color-primary; border-color: $color-primary; background: $color-primary-bg; }
  &.del { color: #ff4d4f; border-color: #ffccc7; &:hover { background: #fff1f0; } }
  &.save { background: $color-primary; color: #fff; border-color: $color-primary; }
  &.cancel { color: $text-tertiary; }
}

.upload-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border: 1px dashed $border-color-input; border-radius: 6px;
  background: #fafbfc; color: $text-tertiary; font-size: 12px; cursor: pointer; font-family: inherit;
  &:hover { border-color: $color-primary; color: $color-primary; }
}

/* tab 区（栏+内容连在一起）*/
.tab-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* tab 栏 */
.tab-bar {
  display: flex;
  gap: 2px;
  padding: 0 16px;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px 12px 0 0;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.tab-btn {
  position: relative;
  padding: 10px 16px;
  border: none;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: $text-secondary;
  cursor: pointer;
  font-family: inherit;
  transition: color 0.2s;
  &:hover { color: $color-primary; }
  &.active {
    color: $color-primary;
    &::after {
      content: '';
      position: absolute;
      left: 16px; right: 16px; bottom: 0;
      height: 2px;
      background: $color-primary;
      border-radius: 1px;
    }
  }
}

/* tab 内容 */
.tab-content {
  flex: 1;
  min-height: 0;
  background: #fff;
  border: 1px solid $border-color-card;
  border-top: none;
  border-radius: 0 0 12px 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.tab-pane {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* 序列分栏（行为/护理）*/
.seq-filters {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.seq-count { font-size: 12px; color: $text-tertiary; margin-left: auto; }
.seq-collapse {
  display: flex; align-items: center; gap: 3px;
  border: none; background: $color-primary-bg; color: $color-primary;
  font-size: 11px; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-family: inherit;
  i { font-size: 12px; }
}
.seq-body {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}
.seq-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  &.collapsed { flex: 0 0 45%; }
}
.seq-card {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  &:hover { border-color: $color-primary; }
  &.active { border-color: $color-primary; background: $color-primary-bg; }
}
.seq-snap {
  width: 56px; height: 42px; border-radius: 5px; overflow: hidden; flex-shrink: 0; background: #1a1a2e;
  img { width: 100%; height: 100%; object-fit: cover; }
}
.seq-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.seq-type { font-size: 10px; padding: 1px 6px; border-radius: 3px; font-weight: 500; align-self: flex-start; }
.seq-time { font-size: 11px; color: $text-tertiary; }
.seq-staff { display: flex; align-items: center; gap: 3px; font-size: 11px; color: $text-secondary; }
.seq-staff-avatar { width: 16px; height: 16px; border-radius: 50%; object-fit: cover; border: 1px solid $border-color-card; &.lg { width: 28px; height: 28px; } }
.seq-desc { font-size: 11px; color: $text-tertiary; margin: 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.seq-detail {
  flex: 0 0 55%;
  border-left: 1px solid $border-color-card;
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* 详情媒体区（大图占一半高度+播放按钮） */
.seq-detail-media {
  position: relative;
  flex: 1 1 50%;
  min-height: 240px;
  cursor: pointer;
  overflow: hidden;
  background: #1a1a2e;
}

.seq-detail-media-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.seq-detail-play {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  i { font-size: 28px; color: #fff; }
}

.seq-detail-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  color: #fff;
  font-weight: 500;
}

/* 详情信息区 */
.seq-detail-info {
  flex: 1 1 50%;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
}

.seq-detail-type-row { margin-bottom: 4px; }

.seq-detail-type-tag {
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 4px;
  font-weight: 600;
}

.seq-detail-staff-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: $text-base;
  font-weight: 500;
}

.seq-detail-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: $text-base;
  i { font-size: 14px; color: $text-muted; flex-shrink: 0; }
}

.seq-detail-desc-box {
  margin-top: 6px;
  padding: 10px 12px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 8px;
}

.seq-desc-label {
  font-size: 11px;
  color: $text-muted;
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
}

.seq-desc-text {
  font-size: 13px;
  color: $text-secondary;
  line-height: 1.7;
  margin: 0;
}

/* 卡片中的摄像头字段 */
.seq-cam {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: $text-muted;
  i { font-size: 11px; }
}

.slide-enter-active, .slide-leave-active { transition: all 0.25s ease; }
.slide-enter-from, .slide-leave-to { opacity: 0; transform: translateX(20px); }

/* 树节点更多按钮 */
.tree-more {
  width: 20px; height: 20px;
  border: none; background: transparent; cursor: pointer;
  color: $text-muted; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  i { font-size: 14px; }
  &:hover { background: $bg-hover; color: $text-base; }
}

.pane-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
  .pane-title { font-size: 14px; font-weight: 600; color: $text-base; }
}

.chart-wrap {
  flex: 1;
  min-height: 0;
  padding: 8px 12px;
}
.chart { width: 100%; height: 100%; }

/* 时间轴 */
.timeline { padding: 14px 16px; display: flex; flex-direction: column; }

.tl-item {
  display: flex;
  gap: 12px;
  cursor: pointer;
  &:last-child { margin-bottom: 0; }
}

.tl-axis {
  display: flex; flex-direction: column; align-items: center; width: 10px; flex-shrink: 0;
  .tl-dot { width: 9px; height: 9px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 0 0 1px rgba(0,0,0,0.08); margin-top: 6px; flex-shrink: 0; }
  .tl-line { flex: 1; width: 2px; background: $border-color-card; margin: 1px 0; }
}

.tl-card {
  flex: 1;
  display: flex;
  gap: 10px;
  padding: 8px 10px;
  background: #fafbfc;
  border: 1px solid $border-color-card;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: border-color 0.15s, box-shadow 0.15s;
  &:hover { border-color: $color-primary; box-shadow: 0 2px 8px rgba(110,75,255,0.08); }
}

.tl-snap {
  width: 72px; height: 54px; border-radius: 5px; overflow: hidden; flex-shrink: 0; background: #1a1a2e;
  img { width: 100%; height: 100%; object-fit: cover; }
}

.tl-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.tl-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tl-type { font-size: 11px; padding: 1px 7px; border-radius: 3px; font-weight: 500; }
.tl-time { font-size: 11px; color: $text-tertiary; }
.tl-dur { font-size: 10px; color: $text-muted; }
.tl-staff { display: flex; align-items: center; gap: 4px; font-size: 11px; color: $text-secondary; }
.staff-avatar { width: 18px; height: 18px; border-radius: 50%; object-fit: cover; border: 1px solid $border-color-card;
  &.男 { border-color: #1677ff; }
  &.女 { border-color: #eb2f96; }
}
.tl-desc { font-size: 12px; color: $text-secondary; line-height: 1.4; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

.tl-empty { text-align: center; padding: 50px; color: $text-muted;
  i { font-size: 36px; opacity: 0.4; } p { font-size: 13px; margin: 8px 0 0; }
}

/* 习惯 */
.habit-pane { padding: 14px 16px; gap: 12px; }

.habit-summary-card {
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, #f5f0ff, #fff);
  border: 1px solid rgba(110,75,255,0.15);
  border-radius: 10px;
  padding: 14px 16px;
}

.hs-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.hs-title { font-size: 14px; font-weight: 600; color: $text-base; display: flex; align-items: center; gap: 5px; i { color: $color-primary; } }

.gen-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 16px; border: none; border-radius: 6px;
  background: $color-primary; color: #fff; font-size: 12px; cursor: pointer; font-family: inherit;
  flex-shrink: 0;
  &:hover:not(:disabled) { background: $color-primary-hover; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.hs-text { font-size: 13px; color: $text-secondary; line-height: 1.7; margin: 0; }

.habit-list-head {
  display: flex; align-items: center;
  font-size: 13px; font-weight: 600; color: $text-base;
}

.habit-list { display: flex; flex-direction: column; gap: 8px; }

/* 末尾添加习惯入口 */
.habit-add-entry {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border: 1px dashed $border-color-input;
  border-radius: 8px;
  background: #fafbfc;
  color: $text-tertiary;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  i { font-size: 16px; }

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
    background: $color-primary-bg;
  }
}

.habit-card {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 12px; background: #fff; border: 1px solid $border-color-card; border-radius: 8px;
  &:hover { border-color: $color-primary; }
}

.habit-icon-wrap {
  width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
  background: $color-primary-bg; color: $color-primary;
  display: flex; align-items: center; justify-content: center;
  i { font-size: 16px; }
}

.habit-content { flex: 1; min-width: 0; }
.habit-title { font-size: 13px; font-weight: 600; color: $text-base; margin-bottom: 2px; }
.habit-desc { font-size: 12px; color: $text-tertiary; line-height: 1.5; margin: 0; }

.habit-ops { display: flex; gap: 4px; flex-shrink: 0; }
.op-btn {
  width: 26px; height: 26px; border: none; border-radius: 5px; background: transparent; cursor: pointer;
  color: $text-muted; display: flex; align-items: center; justify-content: center;
  i { font-size: 14px; }
  &:hover { background: $bg-hover; color: $color-primary; }
  &.del:hover { color: #ff4d4f; background: #fff1f0; }
}

.habit-empty { text-align: center; padding: 30px; color: $text-muted; font-size: 13px; }

/* 空状态 */
.ep-empty {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  color: $text-muted;
  i { font-size: 48px; opacity: 0.3; }
  p { font-size: 14px; margin: 0; }
}

/* ===== 弹窗通用 ===== */
.add-form, .habit-edit-form { display: flex; flex-direction: column; gap: 14px; padding: 8px 4px 4px; }
.add-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.add-row { display: flex; flex-direction: column; gap: 6px;
  label { font-size: 13px; font-weight: 500; color: $text-base; }
}
.req { color: #ff4d4f; margin-right: 2px; }

.add-photo-area { display: flex; justify-content: center; }
.photo-preview {
  position: relative;
  width: 80px; height: 80px; border-radius: 50%; overflow: hidden; border: 2px solid $border-color-card;
  img { width: 100%; height: 100%; object-fit: cover; }
}
.photo-del {
  position: absolute; top: 0; right: 0; width: 20px; height: 20px; border: none; border-radius: 50%;
  background: rgba(0,0,0,0.55); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
  i { font-size: 12px; }
}
.photo-upload {
  width: 80px; height: 80px; border: 1px dashed $border-color-input; border-radius: 50%;
  background: #fafbfc; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  color: $text-tertiary; font-family: inherit;
  i { font-size: 22px; } span { font-size: 11px; }
  &:hover { border-color: $color-primary; color: $color-primary; background: $color-primary-bg; }
}

.modal-footer { display: flex; align-items: center; justify-content: space-between; }
.modal-error { font-size: 12px; color: #ff4d4f; }

.btn-cancel, .btn-ok {
  height: 32px; padding: 0 18px; border-radius: 6px; font-size: 13px; cursor: pointer; font-family: inherit; margin-left: 8px;
}
.btn-cancel { border: 1px solid $border-color-light; background: #fff; color: $text-secondary; &:hover { color: $color-primary; border-color: $color-primary; } }
.btn-ok { border: none; background: $color-primary; color: #fff; &:hover:not(:disabled) { background: $color-primary-hover; } }

/* 事件详情弹窗 */
.event-detail { display: flex; gap: 16px; padding: 8px 4px 4px; }
.ed-img { width: 280px; border-radius: 8px; object-fit: cover; flex-shrink: 0; max-height: 240px; }
.ed-info { flex: 1; display: flex; flex-direction: column; gap: 8px;
  h3 { margin: 0 0 4px; font-size: 16px; font-weight: 600; color: $text-base; }
}
.ed-staff { display: flex; align-items: center; gap: 6px; font-size: 13px; color: $text-base; font-weight: 500; }
.ed-staff-avatar { width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 2px solid #fff; box-shadow: 0 0 0 1px $border-color-card;
  &.男 { box-shadow: 0 0 0 1px #1677ff; }
  &.女 { box-shadow: 0 0 0 1px #eb2f96; }
}
.ed-row { display: flex; gap: 10px;
  .l { font-size: 12px; color: $text-muted; min-width: 36px; flex-shrink: 0; }
  .v { font-size: 13px; color: $text-base; }
}

/* 生成结果 */
.gen-list { display: flex; flex-direction: column; gap: 10px; max-height: 400px; overflow-y: auto; }
.gen-item {
  display: flex; gap: 10px; padding: 10px 12px;
  background: #fafbfc; border: 1px solid $border-color-card; border-radius: 8px;
  > i { font-size: 18px; color: $color-primary; margin-top: 2px; }
}
.gen-title { font-size: 13px; font-weight: 600; color: $text-base; }
.gen-desc { font-size: 12px; color: $text-tertiary; margin: 2px 0 0; line-height: 1.5; }
</style>
