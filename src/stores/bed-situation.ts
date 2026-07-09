import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  buildBeds,
  buildUnboundElderly,
  type Bed,
  type ElderlyPerson
} from '@/views/elderly/bed.mock'

/**
 * 床位态势全局状态
 * - beds: 当前所有床位（含已绑老人 + 空床）
 * - unbound: 未绑定床位的候补老人
 * 绑定操作：把一个未绑老人挂到某张空床位上
 */
export const useBedSituationStore = defineStore('bedSituation', () => {
  const beds = ref<Bed[]>(buildBeds())
  const unbound = ref<ElderlyPerson[]>(buildUnboundElderly())

  /** 绑定老人到空床位 */
  function bindElderly(bedId: string, elderlyId: string) {
    const bed = beds.value.find(b => b.id === bedId)
    if (!bed || bed.elderly) return
    const idx = unbound.value.findIndex(e => e.id === elderlyId)
    if (idx < 0) return
    const e = unbound.value.splice(idx, 1)[0]
    // 更新老人的床位信息
    e.room = bed.room
    e.bedNo = bed.bedNo
    e.building = bed.building
    e.status = 'in-bed'
    bed.elderly = e
    bed.status = 'in-bed'
  }

  /** 解绑（老人离开床位，回到未绑定列表） */
  function unbindBed(bedId: string) {
    const bed = beds.value.find(b => b.id === bedId)
    if (!bed || !bed.elderly) return
    const e = bed.elderly
    e.room = ''
    e.bedNo = ''
    e.building = ''
    e.status = 'leave'
    unbound.value.unshift(e)
    bed.elderly = undefined
    bed.status = 'empty'
  }

  /** 判断某老人是否已绑定床位 */
  function isBound(elderlyId: string): boolean {
    return beds.value.some(b => b.elderly?.id === elderlyId)
  }

  return { beds, unbound, bindElderly, unbindBed, isBound }
})
