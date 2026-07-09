import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  buildPersonProfiles,
  type PersonProfile
} from '@/views/image-search/person-profile.mock'

/**
 * 人员档案全局状态
 * - 列表页（PersonProfileView）读取/编辑
 * - 文搜图卡片「添加到人员档案」写入
 * 原型阶段纯前端持有，刷新丢失
 */
export const usePersonProfileStore = defineStore('personProfile', () => {
  const profiles = ref<PersonProfile[]>(buildPersonProfiles())

  /** 切换重点关注 */
  function toggleFocus(id: string) {
    const p = profiles.value.find(x => x.id === id)
    if (p) p.keyFocus = !p.keyFocus
  }

  /** 新增档案（来自列表页表单） */
  function addProfile(p: PersonProfile) {
    profiles.value.unshift(p)
  }

  function getById(id: string) {
    return profiles.value.find(x => x.id === id)
  }

  return { profiles, toggleFocus, addProfile, getById }
})
