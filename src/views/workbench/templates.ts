/**
 * 项目模板 / 场景选项（共享常量）
 * 供新建项目向导 + ProjectLayout 场景切换 共用
 */
export interface ScenarioOption {
  value: string
  label: string
  logo: string       // 单字 Logo
  iconColor: string  // Logo 背景色
  name: string       // 默认项目名
  desc: string       // 模板简述（向导用）
}

export const scenarioOptions: ScenarioOption[] = [
  { value: 'general', label: '通用', logo: '通', iconColor: '#3b82f6', name: '通用场景项目', desc: '适用于各类通用物联场景，含设备管理、数据看板等基础能力' },
  { value: 'security', label: '安防', logo: '安', iconColor: '#f59e0b', name: '安防场景项目', desc: '面向园区/楼宇安防，含监控墙、告警中心、问图检索' },
  { value: 'commercial', label: '商业体', logo: '商', iconColor: '#10b981', name: '商业体场景项目', desc: '商业综合体运营，含客流分析、车流、能耗与工单' },
  { value: 'apartment', label: '公寓', logo: '公', iconColor: '#8b5cf6', name: '公寓场景项目', desc: '智慧公寓人通行与安全管理，含门禁访客' },
  { value: 'elderly', label: '养老', logo: '养', iconColor: '#ec4899', name: '养老场景项目', desc: '养老机构安全看护与老人行为分析' }
]
