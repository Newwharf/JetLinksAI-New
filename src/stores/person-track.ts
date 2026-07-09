import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  buildTrackedPersons,
  type TrackedPerson
} from '@/views/image-search/person-track.mock'

/**
 * 临时轨迹跟踪全局状态
 * - 列表页（PersonTrackView）读取/编辑
 * - 文搜图卡片「添加到人员轨迹」写入（后续接入）
 * 原型阶段纯前端持有，刷新丢失
 */
export const usePersonTrackStore = defineStore('personTrack', () => {
  const persons = ref<TrackedPerson[]>(buildTrackedPersons())

  /** 新增跟踪人员 */
  function addPerson(p: TrackedPerson) {
    persons.value.unshift(p)
  }

  /** 结束跟踪 */
  function endTrack(id: string) {
    const p = persons.value.find(x => x.id === id)
    if (p && p.status === 'tracking') {
      p.status = 'ended'
      p.endedAt = new Date().toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      }).replace(/\//g, '-')
    }
  }

  /** 移除 */
  function remove(id: string) {
    const idx = persons.value.findIndex(x => x.id === id)
    if (idx >= 0) persons.value.splice(idx, 1)
  }

  function getById(id: string) {
    return persons.value.find(x => x.id === id)
  }

  return { persons, addPerson, endTrack, remove, getById }
})
