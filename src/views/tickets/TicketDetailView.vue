<script setup lang="ts">
import { message, Modal } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import { currentOperatorName, findTicket, ticketStatusSteps, type TicketItem } from './ticketData'

const route = useRoute()
const router = useRouter()
const ticket = computed<TicketItem | undefined>(() => findTicket(String(route.params.id)))
const isOpsMode = computed(() => route.path.startsWith('/ops/'))
const ticketBasePath = computed(() => route.path.startsWith('/ops/') ? '/ops/operation/work-order' : '/tickets')
const replyText = ref('')
const replyAttachments = ref<string[]>([])
const replyInputRef = ref()
const currentStepIndex = computed(() => {
  if (!ticket.value) return 0
  return Math.max(ticketStatusSteps.indexOf(ticket.value.status), 0)
})
const userTicketStatusSteps = ticketStatusSteps
const displayStatusSteps = computed(() => {
  return userTicketStatusSteps.map(step => getUserStatusLabel(step))
})
const canReply = computed(() => {
  if (!ticket.value || ticket.value.status === '已结单') return false
  return true
})

const maskedContact = computed(() => {
  const value = ticket.value?.contact || ''
  if (ticket.value?.contactVisible) return value
  if (value.includes('@')) {
    const [name, domain] = value.split('@')
    return `${name.slice(0, 2)}***@${domain}`
  }
  return value.replace(/^(\d{3}).*(\d{4})$/, '$1****$2')
})

function toggleContactVisible() {
  if (!ticket.value) return
  ticket.value.contactVisible = !ticket.value.contactVisible
}

function getUserStatusLabel(status: string) {
  if (!isOpsMode.value && status === '待建单') return '待接单'
  return status
}

function closeTicket() {
  if (!ticket.value) return
  if (ticket.value.status === '已结单') {
    message.info('工单已结单')
    return
  }
  if (isOpsMode.value) {
    Modal.confirm({
      title: '发起结单确认',
      content: '确认向用户发起结单确认吗？',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        if (!ticket.value) return
        const now = new Date()
        const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        ticket.value.assignee = ticket.value.assignee || currentOperatorName
        ticket.value.messages.push({
          id: `m-${Date.now()}`,
          role: 'operator',
          sender: ticket.value.assignee,
          content: '如果您的问题已解决，麻烦您点击【结单】。如果问题尚未解决，您可以继续在本工单中留言，我们会竭尽全力帮助您。',
          time
        })
        message.success('已发起结单确认')
      }
    })
    return
  }
  const now = new Date()
  const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  ticket.value.status = '已结单'
  ticket.value.messages.push({
    id: `m-${Date.now()}`,
    role: 'operator',
    sender: '系统提示',
    content: '您已完成结单，工单已结束。感谢您的反馈。',
    time
  })
  message.success('工单已结单')
}

function handleUpload(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  replyAttachments.value.push(...Array.from(input.files).map(file => file.name))
  input.value = ''
}

function removeAttachment(name: string) {
  replyAttachments.value = replyAttachments.value.filter(item => item !== name)
}

function sendReply() {
  if (!ticket.value) return
  if (!canReply.value) {
    message.warning('已结单工单不能回复')
    return
  }
  if (!replyText.value.trim() && !replyAttachments.value.length) {
    message.warning('请输入回复内容或上传图片')
    return
  }
  const now = new Date()
  const time = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  ticket.value.messages.push({
    id: `m-${Date.now()}`,
    role: isOpsMode.value ? 'operator' : 'user',
    sender: isOpsMode.value ? (ticket.value.assignee || currentOperatorName) : ticket.value.account,
    content: replyText.value.trim() || '补充了附件',
    time,
    attachments: [...replyAttachments.value]
  })
  if (isOpsMode.value && ticket.value.status === '待建单') {
    ticket.value.assignee = currentOperatorName
    ticket.value.status = '处理中'
  }
  replyText.value = ''
  replyAttachments.value = []
  message.success('回复已发送')
}
</script>

<template>
  <div v-if="ticket" class="ticket-detail-page">
    <section class="detail-layout">
      <div class="conversation-panel">
        <div class="conversation-header">
          <div class="progress-actions">
            <button type="button" class="back-btn" @click.stop="router.push(ticketBasePath)">
              <i class="i-ant-design-arrow-left-outlined" />
              返回
            </button>
            <div v-if="isOpsMode ? ticket.status === '处理中' : ticket.status !== '已结单'" class="action-group">
              <button type="button" class="close-btn" @click.stop="closeTicket">
                <i class="i-ant-design-check-circle-outlined" />
                {{ isOpsMode ? '发起结单确认' : '结单' }}
              </button>
            </div>
          </div>
          <div class="ticket-progress" aria-label="工单进度">
            <div
              v-for="(step, index) in displayStatusSteps"
              :key="step"
              class="progress-step"
              :class="{ done: index < currentStepIndex, active: index === currentStepIndex }"
            >
              <span class="step-dot">{{ index < currentStepIndex ? '' : index + 1 }}</span>
              <span class="step-label">{{ step }}</span>
            </div>
          </div>
        </div>

        <div class="conversation-list">
          <div v-for="item in ticket.messages" :key="item.id" class="message-row" :class="item.role">
            <div class="message-avatar">{{ item.role === 'operator' ? '运' : '用' }}</div>
            <div class="message-main">
              <div class="message-meta">
                <span>{{ item.sender }}</span>
                <time>{{ item.time }}</time>
              </div>
              <div class="message-bubble">
                <p>{{ item.content }}</p>
                <div v-if="item.attachments?.length" class="message-attachments">
                  <span v-for="name in item.attachments" :key="name">
                    <i class="i-ant-design-paper-clip-outlined" />
                    {{ name }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="canReply" class="reply-box">
          <div class="reply-composer">
            <a-textarea ref="replyInputRef" v-model:value="replyText" :rows="3" :placeholder="isOpsMode ? '回复用户或记录处理过程' : '继续补充问题，或回复运维工程师'" />
            <div v-if="replyAttachments.length" class="reply-attachments">
              <button v-for="name in replyAttachments" :key="name" type="button" @click="removeAttachment(name)">
                <i class="i-ant-design-paper-clip-outlined" />
                {{ name }}
                <i class="i-ant-design-close-outlined" />
              </button>
            </div>
            <input id="reply-upload" type="file" multiple accept="image/*,video/*" @change="handleUpload">
            <label for="reply-upload" class="upload-btn" title="添加图片或录屏" aria-label="添加图片或录屏">
              <i class="i-ant-design-picture-outlined" />
            </label>
            <button class="send-btn" title="发送" aria-label="发送" @click="sendReply">
              <i class="i-ant-design-send-outlined" />
            </button>
          </div>
        </div>
      </div>

      <aside class="info-panel">
        <h2>工单信息</h2>
        <dl>
          <div>
            <dt>工单ID</dt>
            <dd>{{ ticket.id }}</dd>
          </div>
          <div>
            <dt>板块分类</dt>
            <dd>
              <span v-for="cat in ticket.categories" :key="cat" class="module-tag">{{ cat }}</span>
            </dd>
          </div>
          <div>
            <dt>提交账号</dt>
            <dd>{{ ticket.account }}</dd>
          </div>
          <div v-if="isOpsMode">
            <dt>负责人</dt>
            <dd>{{ ticket.assignee || '-' }}</dd>
          </div>
          <div>
            <dt>提交时间</dt>
            <dd>{{ ticket.submitTime }}</dd>
          </div>
          <div>
            <dt>联系方式</dt>
            <dd class="inline-dd">
              {{ maskedContact }}
              <button @click="toggleContactVisible">{{ ticket.contactVisible ? '隐藏' : '查看' }}</button>
            </dd>
          </div>
        </dl>
      </aside>
    </section>
  </div>

  <div v-else class="missing-page">
    <p>未找到该工单</p>
    <button class="send-btn" @click="router.push(ticketBasePath)">返回工单列表</button>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.ticket-detail-page,
.missing-page {
  min-height: 100%;
  padding: 18px 20px 28px;
  background: $bg-page;
}

.conversation-panel,
.info-panel {
  border: 1px solid $border-color-card;
  background: #fff;
}

.back-btn,
.send-btn,
.upload-btn,
.close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.back-btn,
.upload-btn {
  border: 1px solid $border-color-light;
  color: $text-secondary;
  background: #fff;
}

.close-btn {
  border: 1px solid $color-primary;
  color: #fff;
  background: $color-primary;
}

.send-btn {
  border: 1px solid $color-primary;
  color: #fff;
  background: $color-primary;
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 324px;
  gap: 14px;
}

.conversation-panel {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 118px);
  border-radius: 8px;
  overflow: hidden;
}

.conversation-header {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 18px 18px;
  border-bottom: 1px solid $border-color-card;
  background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
}

.progress-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 32px;
}

.action-group {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;

  .close-btn {
    min-width: 82px;
    height: 32px;
    padding: 0 12px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 400;
    line-height: 30px;
  }
}

.ticket-progress {
  display: flex;
  align-items: center;
  min-width: 0;
  width: 100%;
  max-width: 920px;
  margin: 0 auto;
  padding: 0 8px;
}

.progress-step {
  position: relative;
  display: flex;
  flex: 1;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: $text-secondary;
  font-size: 14px;

  &::after {
    content: '';
    display: block;
    flex: 1;
    height: 1px;
    min-width: 56px;
    margin: 0 18px;
    background: #dbe4f1;
  }

  &:last-child::after {
    display: none;
  }

  &.done,
  &.active {
    color: $color-primary;
  }

  &.done {
    &::after {
      background: $color-primary;
    }

    .step-dot {
      border-color: $color-primary;
      background: $color-primary;

      &::after {
        content: '';
        position: absolute;
        left: 10px;
        top: 7px;
        width: 6px;
        height: 10px;
        border: solid #fff;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
        opacity: 1;
      }
    }
  }

  &.active {
    font-weight: 600;

    .step-dot {
      color: #fff;
      background: $color-primary;
      border-color: $color-primary;
    }
  }
}

.step-dot {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  border: 1px solid #dbe4f1;
  border-radius: 50%;
  color: $text-secondary;
  background: #fff;
  font-size: 13px;
  line-height: 1;
}

.step-label {
  flex: 0 0 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-list {
  flex: 1;
  padding: 20px 22px;
  overflow-y: auto;
  background: #fff;
}

.message-row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 12px;
  margin-bottom: 18px;
  align-items: start;
}

.message-row.operator {
  .message-avatar {
    color: #fff;
    background: $color-online;
  }

  .message-bubble {
    border-color: rgba(43, 179, 163, 0.18);
    background: rgba(43, 179, 163, 0.07);
  }
}

.message-avatar {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 2px solid #fff;
  border-radius: 50%;
  color: #fff;
  background: $color-primary;
  box-shadow: 0 4px 12px rgba(20, 23, 31, 0.10);
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
  color: $text-secondary;
  font-size: 12px;

  span {
    color: $text-base;
    font-weight: 600;
  }

  time {
    color: $text-tertiary;
  }
}

.message-bubble {
  max-width: 820px;
  padding: 12px 14px;
  border: 1px solid rgba(110, 75, 255, 0.16);
  border-radius: 8px;
  background: #faf9ff;

  p {
    margin: 0;
    color: $text-base;
    line-height: 1.7;
  }
}

.message-attachments,
.reply-attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.message-attachments span,
.reply-attachments button {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 26px;
  padding: 0 8px;
  border: 1px solid $border-color-card;
  border-radius: 4px;
  color: $text-secondary;
  background: #fff;
  font-size: 12px;
}

.reply-attachments button {
  cursor: pointer;
}

.reply-box {
  padding: 14px;
  border-top: 1px solid $border-color-card;
  background: #fff;
}

.reply-composer {
  position: relative;
  border: 1px solid $border-color-input;
  border-radius: 8px;
  background: #fff;

  :deep(.ant-input) {
    min-height: 104px;
    padding: 12px 14px 44px;
    border: 0;
    box-shadow: none;
    resize: none;

    &:focus {
      box-shadow: none;
    }
  }

  input {
    display: none;
  }
}

.reply-composer:focus-within {
  border-color: rgba(110, 75, 255, 0.42);
  box-shadow: 0 0 0 2px rgba(110, 75, 255, 0.08);
}

.reply-attachments {
  position: absolute;
  left: 12px;
  right: 52px;
  bottom: 42px;
  max-height: 32px;
  overflow: hidden;
}

.reply-composer .upload-btn,
.reply-composer .send-btn {
  position: absolute;
  bottom: 9px;
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 6px;
}

.reply-composer .upload-btn {
  left: 10px;
}

.reply-composer .send-btn {
  right: 10px;
}

.missing-page .send-btn {
  position: static;
  width: auto;
  height: 32px;
  padding: 0 14px;
}

.info-panel {
  align-self: start;
  border-radius: 8px;
  padding: 18px;

  h2 {
    margin: 0 0 14px;
    color: $text-base;
    font-size: 16px;
  }

  dl {
    display: grid;
    gap: 14px;
    margin: 0;
  }

  dt {
    margin-bottom: 6px;
    color: $text-tertiary;
    font-size: 12px;
  }

  dd {
    margin: 0;
    color: $text-base;
    font-size: 13px;
    line-height: 1.6;
  }
}

.inline-dd {
  display: flex;
  align-items: center;
  gap: 8px;

  button {
    border: 0;
    color: $color-primary;
    background: transparent;
    cursor: pointer;
  }
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
}

.module-tag {
  color: $color-primary;
  background: $color-primary-bg;
}

.missing-page {
  display: grid;
  place-content: center;
  gap: 12px;
  color: $text-tertiary;
}

@media (max-width: 1120px) {
  .detail-layout {
    grid-template-columns: 1fr;
  }
}
</style>
