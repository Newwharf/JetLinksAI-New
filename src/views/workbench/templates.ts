/**
 * 项目模板 / 场景选项（共享常量）
 * 供新建项目向导 + ProjectLayout 场景切换 共用
 */
export interface ScenarioOption {
  value: string
  label: string
  logo: string       // 单字 Logo（兼容旧用法）
  icon: string       // ant-design 图标 class
  iconColor: string  // Logo 背景色
  name: string       // 默认项目名
  desc: string       // 模板简述（向导用）
}

export const scenarioOptions: ScenarioOption[] = [
  { value: 'blank', label: '空白模板', logo: '', icon: 'i-ant-design-plus-outlined', iconColor: '#9ca3af', name: '', desc: '从零开始，自由配置所有功能模块' },
  { value: 'general', label: '通用模板', logo: '通', icon: 'i-ant-design-appstore-outlined', iconColor: '#3b82f6', name: '通用场景项目', desc: '适用于各类通用物联场景，含设备管理、数据看板等基础能力' },
  { value: 'security', label: '安防模板', logo: '安', icon: 'i-ant-design-safety-outlined', iconColor: '#f59e0b', name: '安防场景项目', desc: '面向园区/楼宇安防，含监控墙、告警中心、问图检索' },
  { value: 'commercial', label: '商业体模板', logo: '商', icon: 'i-ant-design-audit-outlined', iconColor: '#10b981', name: '商业体场景项目', desc: '商业综合体运营，含客流分析、车流、能耗与工单' },
  { value: 'apartment', label: '公寓模板', logo: '公', icon: 'i-ant-design-home-outlined', iconColor: '#8b5cf6', name: '公寓场景项目', desc: '智慧公寓人通行与安全管理，含门禁访客' },
  { value: 'elderly', label: '养老模板', logo: '养', icon: 'i-ant-design-medicine-box-outlined', iconColor: '#ec4899', name: '养老场景项目', desc: '养老机构安全看护与老人行为分析' }
]
