<script setup lang="ts">
import { message, Modal } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import { createTicket, currentOperatorName, moduleOptions, tickets, ticketStatusConfig, type TicketItem } from './ticketData'

type TicketFilter = '待建单' | '我负责' | '处理中' | '已结单'
type WorkOrderView = '我的工单' | '全部工单'
type AllTicketFilter = '全部' | '待建单' | '处理中' | '已结单'
type UserTicketFilter = '全部' | '待接单' | '处理中' | '已结单'

const route = useRoute()
const router = useRouter()
const isOpsMode = computed(() => route.path.startsWith('/ops/'))
const ticketBasePath = computed(() => route.path.startsWith('/ops/') ? '/ops/operation/work-order' : '/tickets')
const searchKey = ref('')
const workOrderView = ref<WorkOrderView>('我的工单')
const workOrderViews: WorkOrderView[] = ['我的工单', '全部工单']
const statusFilter = ref<TicketFilter>('我负责')
const filterOptions: TicketFilter[] = ['待建单', '我负责', '处理中', '已结单']
const allStatusFilter = ref<AllTicketFilter>('全部')
const allFilterOptions: AllTicketFilter[] = ['全部', '待建单', '处理中', '已结单']
const userStatusFilter = ref<UserTicketFilter>('全部')
const userFilterOptions: UserTicketFilter[] = ['全部', '待接单', '处理中', '已结单']
const assigneeFilter = ref('全部负责人')
const addVisible = ref(false)
const addForm = ref({
  category: '',
  description: '',
  contact: '',
  attachments: [] as string[]
})

const filteredTickets = computed(() => {
  const kw = searchKey.value.trim().toLowerCase()
  const selectedAssignee = assigneeFilter.value
  return tickets.value.filter(item => {
    const matchStatus = !isOpsMode.value
      ? (
          userStatusFilter.value === '全部' ||
          getUserStatusLabel(item.status) === userStatusFilter.value
        )
      : workOrderView.value === '我的工单'
      ? (
          (statusFilter.value === '待建单' && item.status === '待建单') ||
          (statusFilter.value === '我负责' && item.assignee === currentOperatorName) ||
          (statusFilter.value === '处理中' && item.assignee === currentOperatorName && item.status === '处理中') ||
          (statusFilter.value === '已结单' && item.assignee === currentOperatorName && item.status === '已结单')
        )
      : (
          (allStatusFilter.value === '全部' || item.status === allStatusFilter.value) &&
          (selectedAssignee === '全部负责人' || (selectedAssignee === '未分配' ? !item.assignee : item.assignee === selectedAssignee))
        )
    const matchKeyword = !kw ||
      item.id.toLowerCase().includes(kw) ||
      item.description.toLowerCase().includes(kw) ||
      item.categories.join('、').toLowerCase().includes(kw) ||
      item.account.toLowerCase().includes(kw) ||
      (item.assignee || '').toLowerCase().includes(kw)
    return matchStatus && matchKeyword
  })
})

const assigneeOptions = computed(() => {
  const names = new Set<string>()
  tickets.value.forEach(item => {
    if (item.assignee) names.add(item.assignee)
  })
  return ['全部负责人', '未分配', ...Array.from(names)]
})

function switchWorkOrderView(view: WorkOrderView) {
  workOrderView.value = view
}

function getUserStatusLabel(status: string) {
  if (!isOpsMode.value && status === '待建单') return '待接单'
  return status
}

function getDisplayStatusConfig(item: TicketItem) {
  return ticketStatusConfig[item.status]
}

const finalCategories = computed(() => {
  return addForm.value.category ? [addForm.value.category] : []
})

function resetAddForm() {
  addForm.value = {
    category: '',
    description: '',
    contact: '',
    attachments: []
  }
}

function openAddModal() {
  resetAddForm()
  addVisible.value = true
}

watch(
  () => [route.query.action, route.query._t],
  ([action]) => {
    if (action === 'create') {
      openAddModal()
    }
  },
  { immediate: true }
)

function handleUpload(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  addForm.value.attachments.push(...Array.from(input.files).map(file => file.name))
  input.value = ''
}

function removeAttachment(name: string) {
  addForm.value.attachments = addForm.value.attachments.filter(item => item !== name)
}

function submitTicket() {
  if (!finalCategories.value.length) {
    message.warning('请选择板块分类')
    return
  }
  if (!addForm.value.description.trim()) {
    message.warning('请输入问题描述')
    return
  }
  if (!addForm.value.contact.trim()) {
    message.warning('请输入联系方式')
    return
  }
  const ticket = createTicket({
    categories: finalCategories.value,
    description: addForm.value.description.trim(),
    contact: addForm.value.contact.trim(),
    attachments: addForm.value.attachments
  })
  addVisible.value = false
  message.success('工单已提交')
  router.push(`${ticketBasePath.value}/${ticket.id}`)
}

function handleTicketAction(item: TicketItem) {
  if (!isOpsMode.value) {
    router.push(`${ticketBasePath.value}/${item.id}`)
    return
  }
  if (item.status === '待建单') {
    Modal.confirm({
      title: '确认接单',
      content: `确认接收工单「${item.id}」吗？接单后该工单将进入处理中，并分配给你负责。`,
      okText: '确认接单',
      cancelText: '取消',
      onOk: () => {
        item.assignee = currentOperatorName
        item.status = '处理中'
        item.hasNewUserMessage = false
        message.success('已接单')
        router.push(`${ticketBasePath.value}/${item.id}`)
      }
    })
    return
  }
  item.hasNewUserMessage = false
  router.push(`${ticketBasePath.value}/${item.id}`)
}
</script>

<template>
  <div class="ticket-page">
    <section class="ticket-toolbar">
      <div>
        <h1>工单管理</h1>
      </div>
      <button v-if="!isOpsMode" class="primary-btn" @click="openAddModal">
        <i class="i-ant-design-plus-outlined" />
        新增工单
      </button>
    </section>

    <section class="filter-bar">
      <div v-if="isOpsMode" class="view-switch">
        <button
          v-for="item in workOrderViews"
          :key="item"
          type="button"
          :class="{ active: workOrderView === item }"
          @click="switchWorkOrderView(item)"
        >
          {{ item }}
        </button>
      </div>
      <a-input v-model:value="searchKey" class="search-input" placeholder="搜索工单编号、问题描述、板块分类、提交账号" allow-clear>
        <template #prefix>
          <i class="i-ant-design-search-outlined" />
        </template>
      </a-input>
      <a-select v-if="!isOpsMode" v-model:value="userStatusFilter" class="status-select">
        <a-select-option v-for="item in userFilterOptions" :key="item" :value="item">{{ item === '全部' ? '全部状态' : item }}</a-select-option>
      </a-select>
      <a-select v-else-if="workOrderView === '我的工单'" v-model:value="statusFilter" class="status-select">
        <a-select-option v-for="item in filterOptions" :key="item" :value="item">{{ item }}</a-select-option>
      </a-select>
      <template v-else>
        <a-select v-model:value="allStatusFilter" class="status-select">
          <a-select-option v-for="item in allFilterOptions" :key="item" :value="item">{{ item }}</a-select-option>
        </a-select>
        <a-select v-model:value="assigneeFilter" class="assignee-select">
          <a-select-option v-for="item in assigneeOptions" :key="item" :value="item">{{ item }}</a-select-option>
        </a-select>
      </template>
    </section>

    <section class="ticket-table-wrap">
      <table class="ticket-table" :class="{ 'project-ticket-table': !isOpsMode, 'ops-ticket-table': isOpsMode }">
        <thead>
          <tr>
            <th>工单编号</th>
            <th>问题描述</th>
            <th>板块分类</th>
            <th>状态</th>
            <th>提交账号</th>
            <th v-if="isOpsMode">负责人</th>
            <th>提交时间</th>
            <th v-if="isOpsMode">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in filteredTickets"
            :key="item.id"
            :class="{ clickable: !isOpsMode }"
            @click="!isOpsMode && router.push(`${ticketBasePath}/${item.id}`)"
          >
            <td class="ticket-id">{{ item.id }}</td>
            <td class="desc-cell" :title="item.description">{{ item.description }}</td>
            <td>
              <span class="module-tag">{{ item.categories[0] }}</span>
            </td>
            <td>
              <span class="status-wrap">
                <span class="status-tag" :style="{ color: getDisplayStatusConfig(item).color, background: getDisplayStatusConfig(item).bg }">
                  {{ getUserStatusLabel(item.status) }}
                </span>
                <span v-if="isOpsMode && item.hasNewUserMessage" class="new-message-dot" title="用户发了新的消息" />
              </span>
            </td>
            <td>{{ item.account }}</td>
            <td v-if="isOpsMode">{{ item.assignee || '-' }}</td>
            <td class="time-cell">{{ item.submitTime }}</td>
            <td v-if="isOpsMode">
              <button
                v-if="item.status === '待建单' || item.status === '处理中' || item.status === '已结单'"
                type="button"
                class="table-action-btn"
                @click="handleTicketAction(item)"
              >
                {{ item.status === '待建单' ? '接单' : '查看详情' }}
              </button>
              <span v-else class="table-action-empty">-</span>
            </td>
          </tr>
          <tr v-if="!filteredTickets.length">
            <td :colspan="isOpsMode ? 8 : 6" class="empty-cell">暂无匹配工单</td>
          </tr>
        </tbody>
      </table>
    </section>

    <a-modal v-model:open="addVisible" title="新增工单" width="720px" :footer="null" destroy-on-close>
      <div class="ticket-form">
        <label>
          <span>板块分类</span>
          <a-select v-model:value="addForm.category" placeholder="请选择一个板块" class="full-input">
            <a-select-option v-for="item in moduleOptions" :key="item" :value="item">{{ item }}</a-select-option>
          </a-select>
        </label>
        <label>
          <span>描述</span>
          <a-textarea v-model:value="addForm.description" :rows="5" placeholder="请描述遇到的问题、复现步骤或期望结果" />
        </label>
        <label>
          <span>截图或录屏</span>
          <div class="upload-line">
            <input id="ticket-upload" type="file" multiple accept="image/*,video/*" @change="handleUpload">
            <label for="ticket-upload" class="upload-btn">
              <i class="i-ant-design-upload-outlined" />
              上传附件
            </label>
            <span class="upload-tip">支持图片或视频，可多选</span>
          </div>
          <div v-if="addForm.attachments.length" class="attachment-list">
            <button v-for="name in addForm.attachments" :key="name" type="button" @click="removeAttachment(name)">
              <i class="i-ant-design-paper-clip-outlined" />
              {{ name }}
              <i class="i-ant-design-close-outlined" />
            </button>
          </div>
        </label>
        <label>
          <span>联系方式</span>
          <a-input v-model:value="addForm.contact" placeholder="请输入手机号、邮箱或其他联系方式" />
        </label>
        <div class="modal-actions">
          <button class="ghost-btn" @click="addVisible = false">取消</button>
          <button class="primary-btn" @click="submitTicket">提交工单</button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.ticket-page {
  min-height: 100%;
  padding: 18px 20px 28px;
  background: $bg-page;
}

.ticket-toolbar,
.filter-bar,
.ticket-table-wrap {
  border: 1px solid $border-color-card;
  background: #fff;
}

.ticket-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
  border-radius: 8px 8px 0 0;

  h1 {
    margin: 0;
    color: $text-base;
    font-size: 20px;
    line-height: 1.4;
  }

  p {
    margin: 4px 0 0;
    color: $text-tertiary;
    font-size: 13px;
  }
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  border-top: 0;
  border-bottom: 0;
}

.view-switch {
  display: inline-flex;
  flex: 0 0 auto;
  height: 32px;
  padding: 3px;
  border-radius: 7px;
  background: $bg-page;

  button {
    min-width: 78px;
    height: 26px;
    padding: 0 12px;
    border: 0;
    border-radius: 5px;
    color: $text-secondary;
    background: transparent;
    font-size: 13px;
    cursor: pointer;

    &.active {
      color: $color-primary;
      background: #fff;
      box-shadow: 0 2px 8px rgba(26, 35, 56, 0.08);
    }
  }
}

.search-input {
  max-width: 420px;
}

.status-select {
  width: 140px;
}

.assignee-select {
  width: 132px;
}

.ticket-table-wrap {
  border-radius: 0 0 8px 8px;
  overflow: hidden;
}

.ticket-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 13px;

  th,
  td {
    height: 48px;
    padding: 0 14px;
    border-bottom: 1px solid $border-color-card;
    text-align: left;
    vertical-align: middle;
  }

  th {
    background: $bg-page;
    color: $text-secondary;
    font-weight: 600;
  }

  tbody tr {
    transition: background 0.18s;

    &:hover {
      background: #faf9ff;
    }

    &.clickable {
      cursor: pointer;
    }
  }

  th:nth-child(1) { width: 168px; }
  th:nth-child(2) { width: 30%; }
  th:nth-child(4) { width: 100px; }
  th:nth-child(5) { width: 132px; }
  th:nth-child(6) { width: 104px; }
  th:nth-child(7) { width: 156px; }
  th:nth-child(8) { width: 124px; }
}

.project-ticket-table {
  th:nth-child(1) { width: 176px; }
  th:nth-child(2) { width: auto; }
  th:nth-child(3) { width: 180px; }
  th:nth-child(4) { width: 112px; }
  th:nth-child(5) { width: 128px; }
  th:nth-child(6) { width: 176px; }
}

.ticket-id {
  color: $color-primary;
  font-weight: 600;
}

.desc-cell {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time-cell {
  white-space: nowrap;
}

.module-tag,
.status-tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  margin: 2px 4px 2px 0;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}

.module-tag {
  color: $color-primary;
  background: $color-primary-bg;
}

.status-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.new-message-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ff4d4f;
  box-shadow: 0 0 0 3px rgba(255, 77, 79, 0.12);
  flex-shrink: 0;
}

.empty-cell {
  color: $text-tertiary;
  text-align: center !important;
}

.primary-btn,
.ghost-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 14px;
  border-radius: 6px;
  border: 1px solid transparent;
  font-size: 13px;
  cursor: pointer;
}

.primary-btn {
  color: #fff;
  background: $color-primary;
  border-color: $color-primary;
}

.ghost-btn {
  color: $text-secondary;
  background: #fff;
  border-color: $border-color-light;
}

.table-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 82px;
  height: 28px;
  padding: 0 12px;
  border: 1px solid rgba(110, 75, 255, 0.18);
  border-radius: 6px;
  color: $color-primary;
  background: #f7f4ff;
  font-size: 13px;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
}

.table-action-empty {
  color: $text-tertiary;
}

.ticket-form {
  display: grid;
  gap: 14px;

  label {
    display: grid;
    gap: 8px;
    color: $text-secondary;
    font-size: 13px;
  }
}

.full-input {
  width: 100%;
}

.upload-line {
  display: flex;
  align-items: center;
  gap: 10px;

  input {
    display: none;
  }
}

.upload-btn {
  display: inline-flex !important;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border: 1px dashed $border-color-light;
  border-radius: 6px;
  color: $color-primary !important;
  cursor: pointer;
}

.upload-tip {
  color: $text-tertiary;
  font-size: 12px;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 28px;
    padding: 0 8px;
    border: 1px solid $border-color-card;
    border-radius: 4px;
    color: $text-secondary;
    background: $bg-page;
    cursor: pointer;
  }
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}
</style>
