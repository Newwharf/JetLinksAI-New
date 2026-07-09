import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  buildStaffWorkInfo,
  type StaffWorkInfo
} from '@/views/elderly/staff.mock'
import { type StaffProfile } from '@/views/elderly/bed.mock'

/**
 * 护工全局状态
 * - 护工列表（含负责老人）
 * - 绑定/解绑老人
 * - 增删改
 */
export const useStaffStore = defineStore('staff', () => {
  const staffList = ref<StaffWorkInfo[]>(buildStaffWorkInfo())

  function getStaffById(id: string) {
    return staffList.value.find(s => s.id === id)
  }

  /** 批量绑定老人到护工（替换该护工的全部负责老人） */
  function bindElderly(staffId: string, elderlyIds: string[]) {
    const s = staffList.value.find(x => x.id === staffId)
    if (s) s.elderlyIds = [...elderlyIds]
  }

  /** 判断某老人是否已被任何护工绑定 */
  function isElderlyBound(elderlyId: string): boolean {
    return staffList.value.some(s => s.elderlyIds.includes(elderlyId))
  }

  /** 获取老人被哪个护工绑定 */
  function getBoundStaffId(elderlyId: string): string | undefined {
    const s = staffList.value.find(x => x.elderlyIds.includes(elderlyId))
    return s?.id
  }

  /** 获取所有已绑定老人的 id 集合 */
  function boundElderlyIds(): Set<string> {
    const set = new Set<string>()
    for (const s of staffList.value) {
      for (const id of s.elderlyIds) set.add(id)
    }
    return set
  }

  /** 新增护工 */
  function addStaff(staff: StaffWorkInfo) {
    staffList.value.unshift(staff)
  }

  /** 更新护工信息 */
  function updateStaff(id: string, data: Partial<StaffProfile>) {
    const s = staffList.value.find(x => x.id === id)
    if (s) Object.assign(s, data)
  }

  /** 删除护工 */
  function removeStaff(id: string) {
    const idx = staffList.value.findIndex(x => x.id === id)
    if (idx >= 0) staffList.value.splice(idx, 1)
  }

  return {
    staffList,
    getStaffById,
    bindElderly,
    isElderlyBound,
    getBoundStaffId,
    boundElderlyIds,
    addStaff,
    updateStaff,
    removeStaff
  }
})
