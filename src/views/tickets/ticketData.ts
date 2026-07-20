export type TicketStatus = '待建单' | '处理中' | '已结单'

export const currentOperatorName = '李明'

export interface TicketMessage {
  id: string
  role: 'user' | 'operator'
  sender: string
  content: string
  time: string
  attachments?: string[]
}

export interface TicketItem {
  id: string
  description: string
  categories: string[]
  status: TicketStatus
  account: string
  assignee?: string
  submitTime: string
  contact: string
  attachments: string[]
  messages: TicketMessage[]
  contactVisible?: boolean
  hasNewUserMessage?: boolean
}

export const moduleOptions = [
  '仪表盘',
  '空间态势',
  '空间管理',
  '视联中心',
  '物联中心',
  'AI对话',
  '文搜图',
  '客流分析',
  '车辆分析',
  '告警中心',
  '巡检',
  '可视化',
  '归档',
  '系统管理',
  '工地态势',
  '风险隐患',
  '事故险肇',
  '工地报告',
  '人员',
  '车辆',
  '作业许可',
  '塔机管理',
  '其他'
]

export const ticketStatusSteps: TicketStatus[] = ['待建单', '处理中', '已结单']

export const ticketStatusConfig: Record<TicketStatus, { color: string; bg: string }> = {
  待建单: { color: '#fa8c16', bg: 'rgba(250,140,22,0.12)' },
  处理中: { color: '#6e4bff', bg: '#ece7ff' },
  已结单: { color: '#2bb3a3', bg: 'rgba(43,179,163,0.10)' }
}

export const tickets = ref<TicketItem[]>([
  {
    id: 'WO-20260716-001',
    description: '视联中心监控墙切换到四分屏后，第二路视频偶发黑屏，需要协助排查网关通道配置。',
    categories: ['视联中心'],
    status: '已结单',
    account: '用户名',
    assignee: currentOperatorName,
    submitTime: '2026-07-16 09:42',
    contact: '13812342196',
    attachments: ['monitor-wall.mp4'],
    hasNewUserMessage: false,
    messages: [
      {
        id: 'm-1',
        role: 'user',
        sender: '用户名',
        content: '监控墙切到四分屏后，第二路视频有时黑屏，刷新页面后恢复。',
        time: '2026-07-16 09:42',
        attachments: ['monitor-wall.mp4']
      },
      {
        id: 'm-2',
        role: 'operator',
        sender: '运维工程师',
        content: '已收到，我们先查看网关通道状态和最近的拉流日志。',
        time: '2026-07-16 10:08'
      },
      {
        id: 'm-3',
        role: 'operator',
        sender: '运维工程师',
        content: '问题已处理完成，工单已结单。',
        time: '2026-07-16 11:26'
      }
    ]
  },
  {
    id: 'WO-20260715-014',
    description: '新增物联设备时产品模板加载较慢，页面等待时间较长。',
    categories: ['物联中心'],
    status: '待建单',
    account: 'ops_user',
    submitTime: '2026-07-15 16:18',
    contact: 'ops@example.com',
    attachments: [],
    hasNewUserMessage: true,
    messages: [
      {
        id: 'm-1',
        role: 'user',
        sender: 'ops_user',
        content: '新增物联设备选择产品模板时加载比较慢，想确认是否是数据量问题。',
        time: '2026-07-15 16:18'
      }
    ]
  },
  {
    id: 'WO-20260715-009',
    description: '客户反馈告警规则保存后未立即生效，需要确认规则下发和执行状态。',
    categories: ['告警中心'],
    status: '处理中',
    account: 'site_admin',
    assignee: currentOperatorName,
    submitTime: '2026-07-15 10:36',
    contact: '13955686812',
    attachments: ['alarm-rule.png'],
    hasNewUserMessage: true,
    messages: [
      {
        id: 'm-1',
        role: 'user',
        sender: 'site_admin',
        content: '我保存了一条设备离线告警规则，但现场设备离线后没有马上触发告警。',
        time: '2026-07-15 10:36',
        attachments: ['alarm-rule.png']
      },
      {
        id: 'm-2',
        role: 'operator',
        sender: currentOperatorName,
        content: '已接单，正在核对规则启用状态和最近一次规则执行日志。',
        time: '2026-07-15 10:48'
      }
    ]
  },
  {
    id: 'WO-20260714-006',
    description: '仪表盘告警统计与告警中心列表数量不一致，希望确认统计口径。',
    categories: ['仪表盘', '告警中心'],
    status: '已结单',
    account: 'project_viewer',
    assignee: '王工',
    submitTime: '2026-07-14 11:05',
    contact: '18690887021',
    attachments: ['dashboard-count.png'],
    hasNewUserMessage: false,
    messages: [
      {
        id: 'm-1',
        role: 'user',
        sender: 'project_viewer',
        content: '仪表盘上显示今日告警 31 条，告警中心筛选今日是 28 条。',
        time: '2026-07-14 11:05',
        attachments: ['dashboard-count.png']
      },
      {
        id: 'm-2',
        role: 'operator',
        sender: '运维工程师',
        content: '仪表盘包含已归档告警，告警中心当前默认只展示有效告警。已为您调整筛选说明。',
        time: '2026-07-14 14:20'
      }
    ]
  }
])

export function createTicket(payload: {
  categories: string[]
  description: string
  contact: string
  attachments: string[]
}) {
  const now = new Date()
  const id = `WO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(tickets.value.length + 1).padStart(3, '0')}`
  const submitTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const ticket: TicketItem = {
    id,
    description: payload.description,
    categories: payload.categories,
    status: '待建单',
    account: '用户名',
    submitTime,
    contact: payload.contact,
    attachments: payload.attachments,
    hasNewUserMessage: true,
    messages: [
      {
        id: `m-${Date.now()}`,
        role: 'user',
        sender: '用户名',
        content: payload.description,
        time: submitTime,
        attachments: payload.attachments
      }
    ]
  }
  tickets.value.unshift(ticket)
  return ticket
}

export function findTicket(id: string) {
  return tickets.value.find(item => item.id === id)
}
