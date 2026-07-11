/**
 * 工地管理 - 可选人员列表（共享常量）
 * 供新增/编辑工地弹窗的人员权限选择使用
 */
import workerImg1 from '@/assets/construction/worker/1.png'
import workerImg2 from '@/assets/construction/worker/2.png'
import workerImg3 from '@/assets/construction/worker/3.png'
import workerImg4 from '@/assets/construction/worker/4.png'

export interface PersonOption {
  id: string
  name: string
  role: string
  avatar: string
}

export const personOptions: PersonOption[] = [
  { id: 'p1', name: '李瀚', role: '项目经理', avatar: workerImg1 },
  { id: 'p2', name: '张建国', role: '安全总监', avatar: workerImg2 },
  { id: 'p3', name: '王德发', role: '施工主管', avatar: workerImg3 },
  { id: 'p4', name: '刘明远', role: '质量负责人', avatar: workerImg4 },
  { id: 'p5', name: '陈永福', role: '监理工程师', avatar: workerImg1 },
  { id: 'p6', name: '赵铁柱', role: '安全管理员', avatar: workerImg2 },
  { id: 'p7', name: '孙伟', role: '技术负责人', avatar: workerImg3 },
  { id: 'p8', name: '周强', role: '资料员', avatar: workerImg4 }
]
