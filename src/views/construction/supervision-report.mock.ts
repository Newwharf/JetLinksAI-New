/**
 * 监理报告 mock 数据
 * 依据 GB/T 50319-2013《建设工程监理规范》及地方智慧工地管理要求设计
 *
 * 三类报告：
 * - 监理季报：按季度编制，汇总工程质量/进度/投资/安全控制情况
 * - 监理专报：针对专项问题编制，如重大质量隐患、设计变更、关键节点验收等
 * - 监理急报：突发紧急事件即时报送，如坍塌事故、极端天气、重大安全隐患等
 */

// ===== 公共类型 =====
export type ReportStatus = 'draft' | 'submitted' | 'reviewed' | 'archived'

export interface ReportStatusMeta {
  label: string
  color: string
  bg: string
}

export const statusMeta: Record<ReportStatus, ReportStatusMeta> = {
  draft:     { label: '草稿',   color: '#8c8c8c', bg: 'rgba(140, 140, 140, 0.1)' },
  submitted: { label: '已报送', color: '#1677ff', bg: 'rgba(22, 119, 255, 0.1)' },
  reviewed:  { label: '已审阅', color: '#52c41a', bg: 'rgba(82, 196, 26, 0.1)' },
  archived:  { label: '已归档', color: '#6e4bff', bg: 'rgba(110, 75, 255, 0.1)' }
}

// ===== 监理季报 =====
export interface QuarterlyReport {
  id: string
  reportNo: string           // 报告编号
  siteName: string           // 工地名称
  title: string              // 报告标题
  quarter: string            // 季度（如 2026年第二季度）
  periodStart: string        // 报告期开始日期
  periodEnd: string          // 报告期结束日期
  chiefSupervisor: string    // 总监理工程师
  status: ReportStatus
  submitTime: string         // 报送时间
  // 季报核心字段
  qualitySummary: string     // 质量控制情况
  progressSummary: string    // 进度控制情况
  costSummary: string        // 投资控制情况
  safetySummary: string      // 安全生产管理情况
  contractSummary: string    // 合同管理与其他事项
  issues: string             // 存在问题及建议
  nextPlan: string           // 下期工作重点
}

export const quarterlyReports: QuarterlyReport[] = [
  {
    id: 'qr-1', reportNo: 'JLQB-2026-Q2-001', siteName: '滨江金融中心一期',
    title: '2026年第二季度监理季报', quarter: '2026年第二季度',
    periodStart: '2026-04-01', periodEnd: '2026-06-30',
    chiefSupervisor: '陈永福', status: 'reviewed', submitTime: '2026-07-03 10:00',
    qualitySummary: '本季度完成主体结构 5-8 层混凝土浇筑，验收合格率 98.5%。发现 3 处钢筋间距偏差超标，已督促整改完毕。钢结构焊缝检测全部合格。',
    progressSummary: '实际进度较计划滞后约 5 天，主要受 6 月持续降雨影响。已要求施工单位增加夜间作业班组，预计 7 月中旬可追回进度。',
    costSummary: '本季度完成产值约 3200 万元，工程款支付 2850 万元。发生设计变更 2 项，增加费用约 45 万元，均已按程序审批。',
    safetySummary: '排查安全隐患 18 项，其中重大隐患 2 项（脚手架连墙件缺失、基坑边缘堆载），已签发监理通知单并督促整改完毕。安全教育培训 4 次。',
    contractSummary: '处理工程变更 2 项，无索赔事项。协调参建方会议 6 次。',
    issues: '建议加强雨季施工排水措施；部分分包单位人员到岗率不足，需督促落实实名制管理。',
    nextPlan: '完成主体结构封顶，启动砌体工程；组织 7 月份质量安全大检查。'
  },
  {
    id: 'qr-2', reportNo: 'JLQB-2026-Q2-002', siteName: '城北科创园二期',
    title: '2026年第二季度监理季报', quarter: '2026年第二季度',
    periodStart: '2026-04-01', periodEnd: '2026-06-30',
    chiefSupervisor: '孙伟', status: 'submitted', submitTime: '2026-07-02 16:30',
    qualitySummary: '本季度完成地下室结构及 1-3 层主体施工，隐蔽工程验收合格率 100%。防水工程一次验收通过。',
    progressSummary: '实际进度与计划基本持平，主体结构施工顺利推进。',
    costSummary: '完成产值约 1850 万元，工程款支付 1620 万元。',
    safetySummary: '排查安全隐患 12 项，均已整改闭环。塔吊作业合规，特种作业人员持证率 100%。',
    contractSummary: '工程变更 1 项（地下室增加人防门），无索赔事项。',
    issues: '部分材料进场检验记录不及时，已督促材料员完善台账。',
    nextPlan: '推进 4-6 层主体结构施工，启动外立面幕墙招标工作。'
  },
  {
    id: 'qr-3', reportNo: 'JLQB-2026-Q2-003', siteName: '萧山国际机场扩建',
    title: '2026年第二季度监理季报', quarter: '2026年第二季度',
    periodStart: '2026-04-01', periodEnd: '2026-06-30',
    chiefSupervisor: '周强', status: 'draft', submitTime: '',
    qualitySummary: '本季度完成航站楼钢结构主体安装，高强螺栓检测合格率 100%。焊接无损检测一次合格率 99.2%。',
    progressSummary: '实际进度超前计划 3 天，钢结构吊装效率高于预期。',
    costSummary: '完成产值约 5600 万元，工程款支付 5040 万元。',
    safetySummary: '排查安全隐患 8 项，无重大隐患。大型机械作业安全可控。',
    contractSummary: '工程变更 3 项，增加费用约 120 万元。',
    issues: '停机坪区域地下管线复杂，建议加强施工前探测。',
    nextPlan: '完成屋面系统安装，启动室内精装工程。'
  },
  {
    id: 'qr-4', reportNo: 'JLQB-2026-Q1-001', siteName: '滨江金融中心一期',
    title: '2026年第一季度监理季报', quarter: '2026年第一季度',
    periodStart: '2026-01-01', periodEnd: '2026-03-31',
    chiefSupervisor: '陈永福', status: 'archived', submitTime: '2026-04-02 09:00',
    qualitySummary: '完成地下室及 1-4 层主体结构施工，验收合格率 99%。',
    progressSummary: '实际进度与计划一致。',
    costSummary: '完成产值约 2800 万元。',
    safetySummary: '排查安全隐患 15 项，全部整改完毕。',
    contractSummary: '工程变更 1 项，无索赔事项。',
    issues: '春节后复工检查中发现部分临边防护缺失，已整改。',
    nextPlan: '推进主体结构施工至 8 层。'
  }
]

// ===== 监理专报 =====
export interface SpecialReport {
  id: string
  reportNo: string           // 报告编号
  siteName: string           // 工地名称
  title: string              // 专报标题
  category: string           // 专报类别（质量/安全/进度/变更/验收）
  eventTime: string          // 事件发生时间
  chiefSupervisor: string    // 总监理工程师
  status: ReportStatus
  submitTime: string         // 报送时间
  // 专报核心字段
  description: string        // 事件描述
  causeAnalysis: string      // 原因分析
  measures: string           // 已采取措施及处理结果
  suggestions: string        // 监理意见与建议
}

export const specialCategoryMeta: Record<string, { label: string; color: string }> = {
  quality:  { label: '质量专项', color: '#1677ff' },
  safety:   { label: '安全专项', color: '#ff4d4f' },
  progress: { label: '进度专项', color: '#fa8c16' },
  change:   { label: '变更专项', color: '#6e4bff' },
  acceptance: { label: '验收专项', color: '#52c41a' }
}

export const specialReports: SpecialReport[] = [
  {
    id: 'sr-1', reportNo: 'JLZB-2026-015', siteName: '滨江金融中心一期',
    title: '5层结构混凝土强度不足专项报告', category: 'quality',
    eventTime: '2026-07-08', chiefSupervisor: '陈永福', status: 'reviewed', submitTime: '2026-07-09 14:00',
    description: '2026年7月8日，对 5 层 C40 柱混凝土进行回弹检测，发现 3 根柱强度推定值为 35.2MPa，不满足设计 C40 要求。',
    causeAnalysis: '经调查，商品混凝土供应商 7 月 5 日发货时水胶比偏大，现场未按规定进行坍落度复检即浇筑。',
    measures: '已下发监理通知单，要求对不合格柱进行结构鉴定；委托第三方检测机构进行钻芯取样检测；对涉及批次混凝土追溯排查。',
    suggestions: '建议对 3 根柱进行加固处理（方案待设计确认）；要求混凝土供应商加强出场检验，现场每车必检坍落度。'
  },
  {
    id: 'sr-2', reportNo: 'JLZB-2026-014', siteName: '滨江金融中心一期',
    title: '脚手架连墙件大面积缺失专项报告', category: 'safety',
    eventTime: '2026-07-05', chiefSupervisor: '陈永福', status: 'submitted', submitTime: '2026-07-05 16:30',
    description: '巡查发现 4-6 层外脚手架连墙件拆除数量超过规范允许值，局部已连续 4 跨未设置连墙件，存在坍塌风险。',
    causeAnalysis: '施工单位为赶工期私自拆除连墙件以便外墙作业，未按程序报批。',
    measures: '已签发工程暂停令（编号 TP-2026-003），暂停 4-6 层外墙施工；要求立即恢复连墙件并全面排查。',
    suggestions: '建议对施工单位处以违约罚款；要求恢复后经监理验收合格方可复工。'
  },
  {
    id: 'sr-3', reportNo: 'JLZB-2026-013', siteName: '城北科创园二期',
    title: '地下室增加人防门设计变更专项报告', category: 'change',
    eventTime: '2026-06-20', chiefSupervisor: '孙伟', status: 'archived', submitTime: '2026-06-21 09:00',
    description: '根据人防办审查意见，地下室需增加 4 樘人防门，涉及结构修改和管线调整。',
    causeAnalysis: '原设计图纸在人防审查阶段提出修改要求，属正常设计完善。',
    measures: '已组织设计交底，施工单位编制变更施工方案，费用增加约 28 万元，已按程序审批。',
    suggestions: '建议施工单位合理安排工序，避免影响主体进度。'
  },
  {
    id: 'sr-4', reportNo: 'JLZB-2026-012', siteName: '萧山国际机场扩建',
    title: '钢结构屋盖合龙验收专项报告', category: 'acceptance',
    eventTime: '2026-06-28', chiefSupervisor: '周强', status: 'reviewed', submitTime: '2026-06-29 10:00',
    description: '航站楼钢结构屋盖于 6 月 28 日完成合龙，进行合龙节点验收。',
    causeAnalysis: '合龙温度控制在设计要求范围内（18-22°C），焊缝检测全部合格。',
    measures: '组织建设、设计、施工、监理四方联合验收，验收合格。',
    suggestions: '建议后续屋面系统安装时加强对合龙节点的保护。'
  },
  {
    id: 'sr-5', reportNo: 'JLZB-2026-011', siteName: '滨江金融中心一期',
    title: '持续降雨影响施工进度专项报告', category: 'progress',
    eventTime: '2026-06-25', chiefSupervisor: '陈永福', status: 'archived', submitTime: '2026-06-26 09:00',
    description: '6月中旬持续降雨导致主体结构施工累计停工 5 天，影响工期。',
    causeAnalysis: '降雨为不可抗力因素，但施工单位雨季施工预案准备不足，排水措施不到位加重了影响。',
    measures: '已要求施工单位完善排水系统，增加防雨覆盖材料，合理安排室内工序。',
    suggestions: '建议建设单位考虑工期顺延 5 天，要求施工单位增加夜间作业追回进度。'
  }
]

// ===== 监理急报 =====
export type UrgencyLevel = 'critical' | 'urgent' | 'general'

export interface UrgencyLevelMeta {
  label: string
  color: string
  bg: string
}

export const urgencyMeta: Record<UrgencyLevel, UrgencyLevelMeta> = {
  critical: { label: '紧急', color: '#ff4d4f', bg: 'rgba(255, 77, 79, 0.12)' },
  urgent:   { label: '重要', color: '#fa8c16', bg: 'rgba(250, 140, 22, 0.12)' },
  general:  { label: '一般', color: '#1677ff', bg: 'rgba(22, 119, 255, 0.12)' }
}

export interface UrgentReport {
  id: string
  reportNo: string           // 报告编号
  siteName: string           // 工地名称
  title: string              // 急报标题
  urgency: UrgencyLevel      // 紧急程度
  eventTime: string          // 事件发生时间（精确到时分）
  location: string           // 事件位置
  chiefSupervisor: string    // 总监理工程师
  status: ReportStatus
  submitTime: string         // 报送时间
  // 急报核心字段
  description: string        // 紧急事项概述
  currentStatus: string      // 事件经过及现状
  measures: string           // 已采取的应急措施
  impactAssessment: string   // 可能造成的影响/后果评估
  coordinationNeeded: string // 需上级或建设单位协调解决的事项
}

export const urgentReports: UrgentReport[] = [
  {
    id: 'ur-1', reportNo: 'JLJB-2026-008', siteName: '滨江金融中心一期',
    title: '基坑北侧支护桩位移超限紧急报告', urgency: 'critical',
    eventTime: '2026-07-10 14:30', location: '基坑北侧支护桩',
    chiefSupervisor: '陈永福', status: 'submitted', submitTime: '2026-07-10 15:00',
    description: '2026年7月10日 14:30，监测数据显示基坑北侧支护桩顶位移达 38mm，超出预警值（30mm），位移速率持续增大。',
    currentStatus: '已立即暂停基坑周边所有施工作业，疏散基坑内作业人员 25 人。目前位移仍在发展，需紧急采取加固措施。',
    measures: '已启动应急预案，安排 24 小时监测；已通知施工单位准备钢支撑加固材料；已联系设计单位出具加固方案。',
    impactAssessment: '如位移持续发展可能导致基坑坍塌，危及周边道路和临时设施安全。',
    coordinationNeeded: '请求建设单位紧急协调设计单位 2 小时内出具加固方案，协调交警部门对基坑南侧道路进行交通管制。'
  },
  {
    id: 'ur-2', reportNo: 'JLJB-2026-007', siteName: '城北科创园二期',
    title: '塔吊基础发现地下水管渗漏紧急报告', urgency: 'critical',
    eventTime: '2026-07-08 09:15', location: '1# 塔吊基础',
    chiefSupervisor: '孙伟', status: 'reviewed', submitTime: '2026-07-08 09:45',
    description: '巡查发现 1# 塔吊基础附近有水渗出，经排查为地下给水管接口渗漏，水流已侵蚀塔吊基础周边土体。',
    currentStatus: '已暂停塔吊使用，疏散作业人员。水管渗漏仍在持续。',
    measures: '已通知自来水公司紧急关阀；已安排抽排水；待水管修复后对塔吊基础进行复测。',
    impactAssessment: '如持续渗水可能导致塔吊基础不均匀沉降，存在塔吊倾覆风险。',
    coordinationNeeded: '请建设单位协调自来水公司尽快修复管道，协调检测单位对塔吊基础进行承载力复测。'
  },
  {
    id: 'ur-3', reportNo: 'JLJB-2026-006', siteName: '滨江金融中心一期',
    title: '强台风预警紧急报告', urgency: 'urgent',
    eventTime: '2026-07-05 08:00', location: '全场区',
    chiefSupervisor: '陈永福', status: 'archived', submitTime: '2026-07-05 08:30',
    description: '气象台发布台风橙色预警，预计 7 月 6 日夜间至 7 日影响杭州地区，阵风可达 10-12 级。',
    currentStatus: '已启动防台预案，正在加固塔吊、脚手架和临时设施。',
    measures: '已通知施工单位在 7 月 6 日 12:00 前完成全部加固工作；安排人员撤离至安置点；切断施工用电。',
    impactAssessment: '台风可能造成塔吊、脚手架损坏，临时设施损毁，预计停工 2-3 天。',
    coordinationNeeded: '请建设单位确认防台物资费用来源，协调社区安排工人撤离安置点。'
  },
  {
    id: 'ur-4', reportNo: 'JLJB-2026-005', siteName: '萧山国际机场扩建',
    title: '钢结构吊装过程中构件滑脱紧急报告', urgency: 'urgent',
    eventTime: '2026-06-30 15:20', location: '航站楼钢结构吊装区',
    chiefSupervisor: '周强', status: 'archived', submitTime: '2026-06-30 16:00',
    description: '钢结构屋盖吊装过程中，一榀桁架吊点钢丝绳出现滑丝，构件发生约 20cm 突降，所幸未造成人员伤亡。',
    currentStatus: '已暂停吊装作业，构件已临时固定。现场无人员受伤。',
    measures: '已更换全部吊装钢丝绳并做探伤检测；已组织吊装安全技术交底会。',
    impactAssessment: '若钢丝绳完全断裂可能造成构件坠落，危及下方作业人员生命安全。',
    coordinationNeeded: '请建设单位协调设备检测单位对所有吊装索具进行全面检测。'
  },
  {
    id: 'ur-5', reportNo: 'JLJB-2026-004', siteName: '城北科创园二期',
    title: '配电箱短路引发明火紧急报告', urgency: 'general',
    eventTime: '2026-06-22 11:00', location: '施工层配电箱 AP-03',
    chiefSupervisor: '孙伟', status: 'archived', submitTime: '2026-06-22 11:15',
    description: '施工层配电箱 AP-03 发生短路并出现明火，现场人员使用灭火器迅速扑灭。',
    currentStatus: '明火已扑灭，配电箱已断电。无人员伤亡，未造成财产损失。',
    measures: '已更换故障配电箱，排查全场区电气线路；已开展消防安全专项检查。',
    impactAssessment: '如未及时发现可能引发火灾，造成人员伤亡和财产损失。',
    coordinationNeeded: '无特殊协调事项，已按程序处置完毕。'
  }
]

// ===== 统一报告类型（用于合并列表）=====
export type ReportType = 'quarterly' | 'special' | 'urgent'

export interface ReportTypeMeta {
  label: string
  color: string
}

export const reportTypeMeta: Record<ReportType, ReportTypeMeta> = {
  quarterly: { label: '监理季报', color: '#6e4bff' },
  special:   { label: '监理专报', color: '#1677ff' },
  urgent:    { label: '监理急报', color: '#ff4d4f' }
}

// ===== 统一报告模型（合并三类报告为一个列表）=====
export interface UnifiedReport {
  id: string
  reportType: ReportType
  reportNo: string
  siteName: string
  title: string
  chiefSupervisor: string
  status: ReportStatus
  submitTime: string
  eventTime: string              // 事件时间（专报/急报用，季报用报告期开始）
  // 分类标签信息（急报=紧急程度，专报=类别，季报=季度）
  tagLabel: string
  tagColor: string
  // 详情原始数据（完整保留各类报告的全部字段）
  detail: Record<string, string>
}

function buildUnifiedList(): UnifiedReport[] {
  const list: UnifiedReport[] = []

  // 季报
  for (const r of quarterlyReports) {
    list.push({
      id: r.id,
      reportType: 'quarterly',
      reportNo: r.reportNo,
      siteName: r.siteName,
      title: r.title,
      chiefSupervisor: r.chiefSupervisor,
      status: r.status,
      submitTime: r.submitTime,
      eventTime: r.periodStart,
      tagLabel: r.quarter,
      tagColor: reportTypeMeta.quarterly.color,
      detail: {
        '报告编号': r.reportNo,
        '工地名称': r.siteName,
        '报告标题': r.title,
        '报告季度': r.quarter,
        '报告期间': `${r.periodStart} ~ ${r.periodEnd}`,
        '总监理工程师': r.chiefSupervisor,
        '报送时间': r.submitTime || '—',
        '质量控制情况': r.qualitySummary,
        '进度控制情况': r.progressSummary,
        '投资控制情况': r.costSummary,
        '安全生产管理情况': r.safetySummary,
        '合同管理与其他事项': r.contractSummary,
        '存在问题及建议': r.issues,
        '下期工作重点': r.nextPlan
      }
    })
  }

  // 专报
  for (const r of specialReports) {
    const catMeta = specialCategoryMeta[r.category]
    list.push({
      id: r.id,
      reportType: 'special',
      reportNo: r.reportNo,
      siteName: r.siteName,
      title: r.title,
      chiefSupervisor: r.chiefSupervisor,
      status: r.status,
      submitTime: r.submitTime,
      eventTime: r.eventTime,
      tagLabel: catMeta.label,
      tagColor: catMeta.color,
      detail: {
        '报告编号': r.reportNo,
        '工地名称': r.siteName,
        '专报标题': r.title,
        '专报类别': catMeta.label,
        '事件时间': r.eventTime,
        '总监理工程师': r.chiefSupervisor,
        '报送时间': r.submitTime,
        '事件描述': r.description,
        '原因分析': r.causeAnalysis,
        '已采取措施及处理结果': r.measures,
        '监理意见与建议': r.suggestions
      }
    })
  }

  // 急报
  for (const r of urgentReports) {
    const urgMeta = urgencyMeta[r.urgency]
    list.push({
      id: r.id,
      reportType: 'urgent',
      reportNo: r.reportNo,
      siteName: r.siteName,
      title: r.title,
      chiefSupervisor: r.chiefSupervisor,
      status: r.status,
      submitTime: r.submitTime,
      eventTime: r.eventTime,
      tagLabel: urgMeta.label,
      tagColor: urgMeta.color,
      detail: {
        '报告编号': r.reportNo,
        '工地名称': r.siteName,
        '急报标题': r.title,
        '紧急程度': urgMeta.label,
        '事件位置': r.location,
        '发生时间': r.eventTime,
        '总监理工程师': r.chiefSupervisor,
        '报送时间': r.submitTime,
        '紧急事项概述': r.description,
        '事件经过及现状': r.currentStatus,
        '已采取的应急措施': r.measures,
        '可能造成的影响/后果评估': r.impactAssessment,
        '需上级或建设单位协调解决的事项': r.coordinationNeeded
      }
    })
  }

  // 按时间倒序
  list.sort((a, b) => (b.submitTime || b.eventTime).localeCompare(a.submitTime || a.eventTime))
  return list
}

export const allSupervisionReports: UnifiedReport[] = buildUnifiedList()
