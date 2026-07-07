import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 应用级全局状态
 * 用法：const appStore = useAppStore()
 */
export const useAppStore = defineStore('app', () => {
  const darkMode = ref(false)

  function toggleDark() {
    darkMode.value = !darkMode.value
    document.documentElement.classList.toggle('dark', darkMode.value)
  }

  // 当前场景（决定一级菜单组成 + 二级 tab 过滤）
  // general | commercial | security | apartment | factory | elderly
  const scenario = ref<string>('general')

  function setScenario(s: string) {
    scenario.value = s
  }

  return { darkMode, toggleDark, scenario, setScenario }
})
