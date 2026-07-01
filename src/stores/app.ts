import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 应用级全局状态示例
 * 用法：const appStore = useAppStore()
 */
export const useAppStore = defineStore('app', () => {
  const darkMode = ref(false)

  function toggleDark() {
    darkMode.value = !darkMode.value
    document.documentElement.classList.toggle('dark', darkMode.value)
  }

  return { darkMode, toggleDark }
})
