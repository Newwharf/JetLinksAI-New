<script setup lang="ts">
/**
 * 护工档案管理
 * 卡片/列表双视图 + 搜索 + 新增/编辑/删除 + 管理负责老人
 */
import { message, Modal } from 'ant-design-vue'
import { useStaffStore } from '@/stores/staff'
import { buildElderly, type StaffProfile } from './bed.mock'
import { type StaffWorkInfo } from './staff.mock'

const staffStore = useStaffStore()
const staffList = computed(() => staffStore.staffList)

const allElderly = buildElderly()

// 搜索
const searchKey = ref('')
const viewMode = ref<'card' | 'list'>('card')

const filtered = computed(() => {
  let list = staffList.value
  if (!searchKey.value.trim()) return list
  const k = searchKey.value.trim().toLowerCase()
  return list.filter(s =>
    s.name.toLowerCase().includes(k) ||
    s.position.includes(k) ||
    s.remark.toLowerCase().includes(k)
  )
})

const shiftColor: Record<string, string> = { '白班': '#fa8c16', '晚班': '#722ed1', '夜班': '#2f54eb' }
const positionColor: Record<string, string> = { '初级护工': '#52c41a', '中级护工': '#1890ff', '高级护工': '#722ed1', '护士长': '#fa8c16' }

// ===== 新增/编辑弹窗 =====
const formVisible = ref(false)
const formMode = ref<'add' | 'edit'>('add')
const editId = ref<string>('')
const form = reactive({
  name: '',
  gender: '女' as '男' | '女',
  age: 30,
  phone: '',
  remark: ''
})

const formError = computed(() => {
  if (!form.name.trim()) return '请输入护工姓名'
  if (!form.phone.trim()) return '请输入联系电话'
  return ''
})

function openAdd() {
  formMode.value = 'add'
  form.name = ''
  form.gender = '女'
  form.age = 30
  form.phone = ''
  form.remark = ''
  formVisible.value = true
}

function openEdit(s: StaffProfile) {
  formMode.value = 'edit'
  editId.value = s.id
  form.name = s.name
  form.gender = s.gender
  form.age = s.age
  form.phone = s.phone
  form.remark = s.remark
  formVisible.value = true
}

function submitForm() {
  if (formError.value) return
  if (formMode.value === 'add') {
    staffStore.addStaff({
      id: `s-new-${Date.now()}`,
      name: form.name.trim(),
      gender: form.gender,
      age: form.age,
      phone: form.phone.trim(),
      position: '初级护工',
      shift: '白班',
      entryDate: new Date().toISOString().slice(0, 10),
      responsible: '待分配',
      elderlyCount: 0,
      careCount: 0,
      completionRate: 100,
      avgResponse: 0,
      rating: 5,
      certificates: [],
      remark: form.remark.trim(),
      elderlyIds: []
    })
    message.success('新增成功')
  } else {
    staffStore.updateStaff(editId.value, {
      name: form.name.trim(),
      gender: form.gender,
      age: form.age,
      phone: form.phone.trim(),
      remark: form.remark.trim()
    })
    message.success('修改成功')
  }
  formVisible.value = false
}

// ===== 删除 =====
function confirmDelete(s: StaffProfile) {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除护工「${s.name}」吗？`,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk() {
      staffStore.removeStaff(s.id)
      message.success('删除成功')
    }
  })
}

// ===== 管理负责老人弹窗 =====
const bindVisible = ref(false)
const bindStaffId = ref<string>('')
const bindStaffName = ref('')
const bindSearch = ref('')
const bindSelected = ref<Set<string>>(new Set())

function openBind(s: StaffWorkInfo) {
  bindStaffId.value = s.id
  bindStaffName.value = s.name
  bindSearch.value = ''
  // 初始选中 = 该护工当前已绑的老人
  bindSelected.value = new Set(s.elderlyIds)
  bindVisible.value = true
}

const boundIds = computed(() => staffStore.boundElderlyIds())

const bindCandidates = computed(() => {
  const k = bindSearch.value.trim().toLowerCase()
  const list = k
    ? allElderly.filter(e =>
        e.name.toLowerCase().includes(k) ||
        String(e.age).includes(k) ||
        e.gender.includes(k) ||
        e.careLevel.includes(k)
      )
    : allElderly

  return list.map(e => {
    const boundByOther = boundIds.value.has(e.id) && !bindSelected.value.has(e.id)
    const isSelected = bindSelected.value.has(e.id)
    return {
      ...e,
      disabled: boundByOther,
      boundStaffName: boundByOther ? staffStore.getStaffById(staffStore.getBoundStaffId(e.id)!)?.name : '',
      selected: isSelected
    }
  })
})

function toggleSelect(id: string, disabled: boolean) {
  if (disabled) return
  const s = bindSelected.value
  if (s.has(id)) s.delete(id)
  else s.add(id)
}

function confirmBind() {
  staffStore.bindElderly(bindStaffId.value, Array.from(bindSelected.value))
  message.success('绑定成功')
  bindVisible.value = false
}

const bindStaffInfo = computed(() => staffStore.getStaffById(bindStaffId.value))
</script>

<template>
  <div class="sp-page">
    <!-- 工具栏 -->
    <header class="sp-toolbar">
      <div class="sp-search">
        <i class="i-ant-design-search-outlined" />
        <input v-model="searchKey" placeholder="搜索姓名、职位或备注" />
      </div>
      <div class="sp-right" style="margin-left: auto;">
        <span class="sp-count">共 {{ filtered.length }} 人</span>
        <div class="sp-view-switch">
          <button class="sp-view-btn" :class="{ active: viewMode === 'card' }" @click="viewMode = 'card'">
            <i class="i-ant-design-appstore-outlined" />
          </button>
          <button class="sp-view-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">
            <i class="i-ant-design-unordered-list-outlined" />
          </button>
        </div>
        <button class="sp-add-btn" @click="openAdd">
          <i class="i-ant-design-plus-outlined" />新增护工
        </button>
      </div>
    </header>

    <!-- 内容区 -->
    <div class="sp-content scroll-thin">
      <!-- 卡片视图 -->
      <div v-if="viewMode === 'card'" class="sp-grid">
        <div v-for="s in filtered" :key="s.id" class="sp-card">
          <div class="sp-card-head">
            <div class="sp-avatar" :class="s.gender">
              <img v-if="s.photo" :src="s.photo" :alt="s.name" />
              <span v-else>{{ s.name.charAt(0) }}</span>
            </div>
            <div class="sp-card-info">
              <div class="sp-card-name">{{ s.name }}</div>
              <div class="sp-card-sub">
                <span>{{ s.gender }}</span>
                <span class="sep">·</span>
                <span>{{ s.age }}岁</span>
              </div>
            </div>
          </div>
          <div class="sp-card-tags">
            <span class="sp-tag" :style="{ color: positionColor[s.position], background: positionColor[s.position] + '18' }">{{ s.position }}</span>
            <span class="sp-tag" :style="{ color: shiftColor[s.shift], background: shiftColor[s.shift] + '18' }">{{ s.shift }}</span>
          </div>
          <div class="sp-card-remark" v-if="s.remark">{{ s.remark }}</div>
          <div class="sp-card-remark sp-muted" v-else>暂无备注</div>
          <div class="sp-card-op">
            <button class="sp-op-bind" @click="openBind(s)">
              <i class="i-ant-design-team-outlined" />管理老人
            </button>
            <button class="sp-op-edit" @click="openEdit(s)">
              <i class="i-ant-design-edit-outlined" />
            </button>
            <button class="sp-op-del" @click="confirmDelete(s)">
              <i class="i-ant-design-delete-outlined" />
            </button>
          </div>
        </div>
        <div v-if="filtered.length === 0" class="sp-empty">
          <i class="i-ant-design-inbox-outlined" />
          <p>暂无护工数据</p>
        </div>
      </div>

      <!-- 列表视图 -->
      <div v-else class="sp-table-wrap">
        <table class="sp-table">
          <thead>
            <tr>
              <th class="col-photo">照片</th>
              <th class="col-name">姓名</th>
              <th class="col-gender">性别</th>
              <th class="col-age">年龄</th>
              <th class="col-remark">备注</th>
              <th class="col-op">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in filtered" :key="s.id" class="sp-row">
              <td class="col-photo">
                <div class="sp-avatar-sm" :class="s.gender">
                  <img v-if="s.photo" :src="s.photo" :alt="s.name" />
                  <span v-else>{{ s.name.charAt(0) }}</span>
                </div>
              </td>
              <td class="col-name">{{ s.name }}</td>
              <td class="col-gender">{{ s.gender }}</td>
              <td class="col-age">{{ s.age }}岁</td>
              <td class="col-remark">{{ s.remark || '—' }}</td>
              <td class="col-op">
                <button class="sp-op-bind sm" @click="openBind(s)">管理老人</button>
                <button class="sp-op-edit sm" @click="openEdit(s)">
                  <i class="i-ant-design-edit-outlined" />
                </button>
                <button class="sp-op-del sm" @click="confirmDelete(s)">
                  <i class="i-ant-design-delete-outlined" />
                </button>
              </td>
            </tr>
            <tr v-if="filtered.length === 0">
              <td colspan="6" class="sp-empty">暂无护工数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <a-modal :open="formVisible" :width="520" centered :title="formMode === 'add' ? '新增护工' : '编辑护工'" @cancel="formVisible = false">
      <div class="sp-form">
        <div class="sp-form-row">
          <label class="sp-form-label"><span class="req">*</span>姓名</label>
          <a-input v-model:value="form.name" placeholder="请输入护工姓名" allow-clear />
        </div>
        <div class="sp-form-row sp-form-2col">
          <div class="sp-form-col">
            <label class="sp-form-label">性别</label>
            <a-select v-model:value="form.gender" :options="[{ value: '男' }, { value: '女' }]" style="width: 100%" />
          </div>
          <div class="sp-form-col">
            <label class="sp-form-label">年龄</label>
            <a-input-number v-model:value="form.age" :min="18" :max="70" style="width: 100%" />
          </div>
        </div>
        <div class="sp-form-row">
          <label class="sp-form-label"><span class="req">*</span>联系电话</label>
          <a-input v-model:value="form.phone" placeholder="请输入联系电话" allow-clear />
        </div>
        <div class="sp-form-row">
          <label class="sp-form-label">备注</label>
          <a-textarea v-model:value="form.remark" placeholder="请输入备注（选填）" :rows="3" :maxlength="200" show-count />
        </div>
      </div>
      <template #footer>
        <div class="sp-form-footer">
          <span v-if="formError" class="sp-form-error">{{ formError }}</span>
          <div>
            <button class="sp-form-cancel" @click="formVisible = false">取消</button>
            <button class="sp-form-ok" :disabled="!!formError" @click="submitForm">确定</button>
          </div>
        </div>
      </template>
    </a-modal>

    <!-- 管理负责老人弹窗 -->
    <a-modal :open="bindVisible" :width="920" :footer="null" centered :title="undefined" @cancel="bindVisible = false">
      <div class="sb-dialog" v-if="bindStaffInfo">
        <div class="sb-head">
          <div class="sb-title">
            <i class="i-ant-design-team-outlined" />
            <span>管理「{{ bindStaffName }}」负责的老人</span>
            <em class="sb-selected-count">已选 {{ bindSelected.size }} 人</em>
          </div>
          <div class="sb-search">
            <i class="i-ant-design-search-outlined" />
            <input v-model="bindSearch" placeholder="搜索姓名 / 年龄 / 性别 / 护理类型" />
          </div>
        </div>
        <div class="sb-list scroll-thin">
          <div
            v-for="e in bindCandidates"
            :key="e.id"
            class="sb-item"
            :class="{ disabled: e.disabled, selected: e.selected }"
            @click="toggleSelect(e.id, e.disabled)"
          >
            <div class="sb-photo" :class="e.gender">
              <img v-if="e.photo" :src="e.photo" :alt="e.name" />
              <span v-else>{{ e.name.charAt(0) }}</span>
            </div>
            <div class="sb-info">
              <div class="sb-name-row">
                <span class="sb-name">{{ e.name }}</span>
                <span class="sb-care-tag" :style="{ background: e.careLevel === '全护' ? '#fff1f0' : e.careLevel === '半护' ? '#fff7e6' : '#e6fffb', color: e.careLevel === '全护' ? '#ff4d4f' : e.careLevel === '半护' ? '#fa8c16' : '#13c2c2' }">{{ e.careLevel }}</span>
              </div>
              <div class="sb-sub">
                <span>{{ e.age }}岁</span>
                <span class="sep">·</span>
                <span :class="e.gender">{{ e.gender }}</span>
              </div>
              <div v-if="e.disabled" class="sb-bound-by">已绑定：{{ e.boundStaffName }}</div>
              <div v-else-if="e.photo" class="sb-bound-by muted">{{ e.building }} · {{ e.room }}</div>
            </div>
            <i v-if="e.selected" class="i-ant-design-check-circle-filled sb-check" />
            <i v-else-if="e.disabled" class="i-ant-design-lock-outlined sb-lock" />
          </div>
          <div v-if="bindCandidates.length === 0" class="sb-empty">
            <i class="i-ant-design-search-outlined" />
            <p>没有找到匹配的老人</p>
          </div>
        </div>
        <div class="sb-footer">
          <button class="sb-cancel" @click="bindVisible = false">取消</button>
          <button class="sb-ok" @click="confirmBind">确认绑定</button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.sp-page {
  height: 100%;
  background: $bg-page;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

/* 工具栏 */
.sp-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 10px 14px;
}

.sp-search {
  position: relative;
  width: 260px;

  i {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%);
    font-size: 14px; color: $text-muted;
  }

  input {
    width: 100%; height: 34px;
    padding: 0 12px 0 36px;
    border: 1px solid $border-color-input;
    border-radius: 6px;
    background: $bg-page;
    font-size: 13px; font-family: inherit;
    color: $text-base; outline: none;
    transition: border-color 0.2s;

    &::placeholder { color: $text-muted; }
    &:focus { border-color: $color-primary; }
  }
}

.sp-shift-filter {
  display: flex;
  border: 1px solid $border-color-input;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.sp-shift-btn {
  height: 34px; padding: 0 12px;
  border: none; background: transparent;
  color: $text-tertiary; font-size: 12px;
  cursor: pointer; font-family: inherit;
  transition: all 0.15s;

  &.active {
    background: $color-primary-bg;
    color: $color-primary;
  }
}

.sp-right {
  display: flex; align-items: center; gap: 12px;
  margin-left: auto;
}

.sp-count { font-size: 13px; color: $text-tertiary; }

.sp-view-switch {
  display: flex;
  border: 1px solid $border-color-input;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.sp-view-btn {
  width: 32px; height: 32px;
  border: none; background: transparent;
  color: $text-tertiary; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;

  i { font-size: 15px; }

  &.active {
    background: $color-primary-bg;
    color: $color-primary;
  }
}

.sp-add-btn {
  display: flex; align-items: center; gap: 4px;
  height: 32px; padding: 0 14px;
  border: none; border-radius: 6px;
  background: $color-primary; color: #fff;
  font-size: 13px; cursor: pointer; font-family: inherit;
  transition: background 0.2s;

  &:hover { background: $color-primary-hover; }
  i { font-size: 14px; }
}

/* 内容区 */
.sp-content {
  flex: 1; min-height: 0;
  overflow-y: auto;
}

/* 卡片视图 */
.sp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}

.sp-card {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: box-shadow 0.2s, border-color 0.2s;

  &:hover {
    border-color: $color-primary;
    box-shadow: 0 2px 12px rgba(110, 75, 255, 0.08);
  }
}

.sp-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sp-avatar {
  width: 44px; height: 44px;
  border-radius: 50%;
  overflow: hidden; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 18px; font-weight: 500; color: #fff;

  img { width: 100%; height: 100%; object-fit: cover; }
  &.女 { background: linear-gradient(135deg, #ff85c0, #eb2f96); }
  &.男 { background: linear-gradient(135deg, #69b1ff, #1677ff); }
}

.sp-card-info { flex: 1; min-width: 0; }

.sp-card-name {
  font-size: 15px; font-weight: 600;
  color: $text-base;
}

.sp-card-sub {
  display: flex; align-items: center; gap: 5px;
  margin-top: 3px;
  font-size: 12px; color: $text-tertiary;

  .sep { color: $border-color-input; }
}

.sp-card-tags {
  display: flex; gap: 6px;
}

.sp-tag {
  font-size: 10px; font-weight: 500;
  padding: 2px 8px; border-radius: 4px;
  white-space: nowrap;
}

.sp-card-remark {
  font-size: 12px; color: $text-tertiary;
  line-height: 1.5;
  min-height: 18px;

  &.sp-muted { color: $text-muted; }
}

.sp-card-op {
  display: flex; align-items: center; gap: 6px;
  padding-top: 8px;
  border-top: 1px solid $border-color-card;
}

.sp-op-bind {
  flex: 1;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  height: 30px;
  border: 1px solid #d9cfff;
  border-radius: 6px;
  background: #f5f0ff;
  color: $color-primary;
  font-size: 12px; cursor: pointer; font-family: inherit;
  transition: all 0.15s;

  i { font-size: 14px; }

  &:hover {
    background: $color-primary; color: #fff;
    border-color: $color-primary;
  }

  &.sm { flex: none; padding: 0 10px; height: 28px; }
}

.sp-op-edit, .sp-op-del {
  width: 30px; height: 30px;
  border: 1px solid $border-color-input;
  border-radius: 6px;
  background: #fff;
  cursor: pointer; display: flex;
  align-items: center; justify-content: center;
  transition: all 0.15s;

  i { font-size: 14px; }

  &.sm { width: 28px; height: 28px; }
}

.sp-op-edit {
  color: $text-secondary;

  &:hover {
    color: $color-primary;
    border-color: $color-primary;
  }
}

.sp-op-del {
  color: $text-muted;

  &:hover {
    color: #ff4d4f;
    border-color: #ff4d4f;
  }
}

/* 空态 */
.sp-empty {
  grid-column: 1 / -1;
  text-align: center; padding: 60px 0;
  color: $text-muted;

  i { font-size: 36px; opacity: 0.4; }
  p { font-size: 13px; margin: 8px 0 0; }
}

/* 列表视图 */
.sp-table-wrap {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
}

.sp-table {
  width: 100%; border-collapse: collapse; font-size: 13px;

  thead { background: #fafbfc; }

  th {
    text-align: left; padding: 12px 14px;
    font-weight: 600; color: $text-secondary;
    border-bottom: 1px solid $border-color-card;
    white-space: nowrap;
  }
}

.sp-row {
  transition: background 0.15s;

  &:hover { background: #faf9ff; }

  td {
    padding: 10px 14px;
    border-bottom: 1px solid $border-color-card;
    color: $text-base; vertical-align: middle;
  }

  &:last-child td { border-bottom: none; }
}

.col-photo { width: 56px; }
.col-name { font-weight: 500; }
.col-gender, .col-age { color: $text-tertiary; white-space: nowrap; }
.col-remark {
  max-width: 240px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
  color: $text-tertiary;
}
.col-op {
  width: 200px; white-space: nowrap;

  .sp-op-bind.sm, .sp-op-edit.sm, .sp-op-del.sm {
    display: inline-flex;
    vertical-align: middle;
    margin-right: 4px;
  }
}

.sp-avatar-sm {
  width: 36px; height: 36px;
  border-radius: 50%; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 500; color: #fff;

  img { width: 100%; height: 100%; object-fit: cover; }
  &.女 { background: linear-gradient(135deg, #ff85c0, #eb2f96); }
  &.男 { background: linear-gradient(135deg, #69b1ff, #1677ff); }
}

/* 新增/编辑表单 */
.sp-form {
  display: flex; flex-direction: column; gap: 16px;
  padding: 8px 4px 4px;
}

.sp-form-row {
  display: flex; flex-direction: column; gap: 8px;

  &.sp-form-2col {
    flex-direction: row; gap: 16px;

    .sp-form-col { flex: 1; display: flex; flex-direction: column; gap: 8px; }
  }
}

.sp-form-label {
  font-size: 13px; font-weight: 500; color: $text-base;
  display: flex; align-items: center; gap: 2px;
}

.req { color: #ff4d4f; margin-right: 2px; }

.sp-form-footer {
  display: flex; align-items: center; justify-content: space-between;
}

.sp-form-error { font-size: 12px; color: #ff4d4f; }

.sp-form-cancel, .sp-form-ok {
  height: 32px; padding: 0 18px;
  border-radius: 6px; font-size: 13px;
  cursor: pointer; font-family: inherit;
  margin-left: 8px; transition: all 0.15s;
}

.sp-form-cancel {
  border: 1px solid $border-color-light;
  background: #fff; color: $text-secondary;

  &:hover { color: $color-primary; border-color: $color-primary; }
}

.sp-form-ok {
  border: none; background: $color-primary; color: #fff;

  &:hover:not(:disabled) { background: $color-primary-hover; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

/* 绑定老人弹窗 */
.sb-dialog {
  display: flex; flex-direction: column; gap: 16px;
  padding: 4px 4px 0;
}

.sb-head {
  display: flex; flex-direction: column; gap: 12px;
}

.sb-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 16px; font-weight: 600; color: $text-base;

  i { font-size: 18px; color: $color-primary; }

  .sb-selected-count {
    font-style: normal; font-size: 13px;
    color: $color-primary;
    background: $color-primary-bg;
    padding: 1px 8px; border-radius: 10px;
  }
}

.sb-search {
  position: relative;

  i {
    position: absolute; left: 12px; top: 50%;
    transform: translateY(-50%);
    font-size: 14px; color: $text-muted;
  }

  input {
    width: 100%; height: 38px;
    padding: 0 12px 0 36px;
    border: 1px solid $border-color-input;
    border-radius: 8px;
    background: $bg-page;
    font-size: 13px; font-family: inherit;
    color: $text-base; outline: none;
    transition: border-color 0.2s;

    &::placeholder { color: $text-muted; }
    &:focus { border-color: $color-primary; }
  }
}

.sb-list {
  max-height: 400px; overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding-right: 4px;
}

.sb-item {
  position: relative;
  display: flex; flex-direction: column;
  align-items: center; gap: 8px;
  padding: 12px 8px;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  cursor: pointer; text-align: center;
  transition: all 0.15s;

  &:hover:not(.disabled) {
    border-color: $color-primary;
    background: #faf9ff;
  }

  &.selected {
    border-color: $color-primary;
    background: $color-primary-bg;
  }

  &.disabled {
    opacity: 0.5; cursor: not-allowed;
  }
}

.sb-photo {
  width: 52px; height: 52px;
  border-radius: 50%; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; font-weight: 500; color: #fff;
  flex-shrink: 0;

  img { width: 100%; height: 100%; object-fit: cover; }
  &.女 { background: linear-gradient(135deg, #ff85c0, #eb2f96); }
  &.男 { background: linear-gradient(135deg, #69b1ff, #1677ff); }
}

.sb-info {
  display: flex; flex-direction: column;
  align-items: center; gap: 4px;
  width: 100%;
}

.sb-name-row {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; flex-wrap: wrap;
}

.sb-name { font-size: 14px; font-weight: 600; color: $text-base; }

.sb-care-tag {
  font-size: 10px; font-weight: 500;
  padding: 1px 7px; border-radius: 4px;
}

.sb-sub {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: $text-tertiary;

  .sep { color: $border-color-input; }
  .女 { color: #eb2f96; }
  .男 { color: #1677ff; }
}

.sb-bound-by {
  font-size: 10px; color: #ff4d4f;
  padding: 1px 6px;
  background: #fff1f0;
  border-radius: 3px;

  &.muted {
    color: $text-muted;
    background: $bg-hover;
  }
}

.sb-check {
  position: absolute; top: 6px; right: 6px;
  font-size: 18px; color: $color-primary;
}

.sb-lock {
  position: absolute; top: 6px; right: 6px;
  font-size: 16px; color: $text-muted;
}

.sb-empty {
  grid-column: 1 / -1;
  text-align: center; padding: 40px 0;
  color: $text-muted;

  i { font-size: 36px; opacity: 0.4; }
  p { font-size: 13px; margin: 8px 0 0; }
}

.sb-footer {
  display: flex; justify-content: flex-end; gap: 10px;
  padding-top: 14px;
  border-top: 1px solid $border-color-card;
}

.sb-cancel, .sb-ok {
  height: 34px; padding: 0 20px;
  border-radius: 8px; font-size: 13px;
  cursor: pointer; font-family: inherit;
  transition: all 0.15s;
}

.sb-cancel {
  border: 1px solid $border-color-light;
  background: #fff; color: $text-secondary;

  &:hover { color: $color-primary; border-color: $color-primary; }
}

.sb-ok {
  border: none; background: $color-primary; color: #fff;

  &:hover { background: $color-primary-hover; }
}
</style>
