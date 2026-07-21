<script setup lang="ts">
/**
 * 通用二级 tab 布局
 * 从父路由 meta.tabs 读取 tab 配置，顶部 tab 栏 + 内容区
 * 支持按场景过滤：tab 配置 scenarios 字段时只在指定场景显示
 * 支持路由 meta.hideTabs=true 隐藏 tab 栏，改为返回栏（返回按钮 + 标题）
 */
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const iotDeviceTabGuideOpen = ref(false)
const iotDeviceTabGuideStep = ref(2)
const iotDeviceTabGuideTotal = ref(3)
const iotDeviceTabGuideNext = ref<'video' | 'done'>('done')
const iotDeviceTabGuideStepText = computed(() => `${iotDeviceTabGuideStep.value}/${iotDeviceTabGuideTotal.value}`)
const videoDeviceTabGuideOpen = ref(false)
const videoDeviceTabGuideStep = ref(2)
const videoDeviceTabGuideTotal = ref(3)
const videoDeviceTabGuideStepText = computed(() => `${videoDeviceTabGuideStep.value}/${videoDeviceTabGuideTotal.value}`)

interface TabItem {
  key: string
  label: string
  path: string
  scenarios?: string[]
}

const layoutRoute = computed(() => {
  return route.matched.find(r => Array.isArray(r.meta.tabs)) || route.matched[route.matched.length - 2]
})

const tabs = computed<TabItem[]>(() => {
  const all = (layoutRoute.value?.meta.tabs as TabItem[]) || []
  const sc = appStore.scenario
  return all.filter(t => !t.scenarios || t.scenarios.includes(sc))
})

const activeTab = computed(() => {
  const layoutPath = layoutRoute.value?.path || ''
  const fullPath = route.path
  const rest = fullPath.replace(layoutPath, '').replace(/^\//, '')
  return rest.split('/')[0]
})

watchEffect(() => {
  if (tabs.value.length === 0) return
  const layoutPath = layoutRoute.value?.path || ''
  const rest = route.path.replace(layoutPath, '').replace(/^\//, '')
  const tabKey = rest.split('/')[0]
  if (!tabKey || !tabs.value.some(t => t.key === tabKey)) {
    const first = tabs.value[0]
    if (first && route.path !== first.path) {
      router.replace(first.path)
    }
  }
})

function switchTab(tab: TabItem) {
  router.push(tab.path)
}

watch(
  () => route.query.guide,
  (guide) => {
    iotDeviceTabGuideOpen.value = guide === 'iot-device-tab' && route.path === '/iot/device'
    if (iotDeviceTabGuideOpen.value) {
      iotDeviceTabGuideStep.value = Number(route.query.step || 2)
      iotDeviceTabGuideTotal.value = Number(route.query.total || 3)
      iotDeviceTabGuideNext.value = route.query.next === 'video' ? 'video' : 'done'
    }
    videoDeviceTabGuideOpen.value = guide === 'connect-device' && route.path === '/video/device'
    if (videoDeviceTabGuideOpen.value) {
      videoDeviceTabGuideStep.value = Number(route.query.step || 2)
      videoDeviceTabGuideTotal.value = Number(route.query.total || 3)
    }
  },
  { immediate: true }
)

function closeIotDeviceTabGuide() {
  iotDeviceTabGuideOpen.value = false
}

function goPrevFromIotDeviceTabGuide() {
  iotDeviceTabGuideOpen.value = false
  router.push({
    path: route.path,
    query: {
      projectGuide: iotDeviceTabGuideNext.value === 'video' ? 'both-welcome' : 'iot-choice',
      _t: Date.now()
    }
  })
}

function goIotCreateFromTabGuide() {
  iotDeviceTabGuideOpen.value = false
  router.push({
    path: '/iot/device',
    query: {
      guide: 'create-device',
      next: iotDeviceTabGuideNext.value,
      step: iotDeviceTabGuideStep.value + 1,
      total: iotDeviceTabGuideTotal.value,
      _t: Date.now()
    }
  })
}

function closeVideoDeviceTabGuide() {
  videoDeviceTabGuideOpen.value = false
}

function goPrevFromVideoDeviceTabGuide() {
  videoDeviceTabGuideOpen.value = false
  if (videoDeviceTabGuideTotal.value === 5) {
    router.push({
      path: '/iot/device',
      query: {
        guide: 'create-device',
        next: 'video',
        step: videoDeviceTabGuideStep.value - 1,
        total: videoDeviceTabGuideTotal.value,
        _t: Date.now()
      }
    })
  } else {
    router.push({
      path: route.path,
      query: { projectGuide: 'video-choice', _t: Date.now() }
    })
  }
}

function goAlarmRuleFromVideoGuide() {
  videoDeviceTabGuideOpen.value = false
  router.push({
    path: '/alarm/rule',
    query: {
      guide: 'alarm-rule',
      step: videoDeviceTabGuideStep.value + 1,
      total: videoDeviceTabGuideTotal.value,
      _t: Date.now()
    }
  })
}

// ===== hideTabs 模式：隐藏 tab 栏，由详情页自行渲染返回栏 =====
const hideTabs = computed(() => !!route.meta.hideTabs)
</script>

<template>
  <div class="sub-tab-layout">
    <!-- 隐藏 tab 栏时：不渲染顶部栏，由详情页自行渲染返回栏 -->
    <!-- 正常 tab 栏 -->
    <div v-if="!hideTabs" class="sub-tabs">
      <div
        v-for="t in tabs"
        :key="t.key"
        class="sub-tab"
        :class="{ active: activeTab === t.key }"
        @click="switchTab(t)"
      >
        {{ t.label }}
        <div
          v-if="iotDeviceTabGuideOpen && t.path === '/iot/device'"
          class="sub-tab-guide"
          @click.stop
        >
          <button class="sub-tab-guide__close" type="button" aria-label="关闭" @click.stop="closeIotDeviceTabGuide">
            <i class="i-ant-design-close-outlined" />
          </button>
          <h3>设备列表</h3>
          <p>这里可以新增和管理物联设备，完成设备接入、状态查看和指令下发。</p>
          <div class="sub-tab-guide__footer">
            <span>{{ iotDeviceTabGuideStepText }}</span>
            <div class="sub-tab-guide__actions">
              <button class="sub-tab-guide__btn sub-tab-guide__btn--ghost" type="button" @click.stop="goPrevFromIotDeviceTabGuide">上一步</button>
              <button class="sub-tab-guide__btn" type="button" @click.stop="goIotCreateFromTabGuide">下一步</button>
            </div>
          </div>
        </div>
        <div
          v-if="videoDeviceTabGuideOpen && t.path === '/video/device'"
          class="sub-tab-guide"
          @click.stop
        >
          <button class="sub-tab-guide__close" type="button" aria-label="关闭" @click.stop="closeVideoDeviceTabGuide">
            <i class="i-ant-design-close-outlined" />
          </button>
          <h3>监控设备管理</h3>
          <p>这里可以查看已接入的网关和视联设备，进入网关地址绑定视联设备。</p>
          <div class="sub-tab-guide__footer">
            <span>{{ videoDeviceTabGuideStepText }}</span>
            <div class="sub-tab-guide__actions">
              <button class="sub-tab-guide__btn sub-tab-guide__btn--ghost" type="button" @click.stop="goPrevFromVideoDeviceTabGuide">上一步</button>
              <button class="sub-tab-guide__btn" type="button" @click.stop="goAlarmRuleFromVideoGuide">下一步</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="sub-content">
      <RouterView />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.sub-tab-layout {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-page;
}

.sub-tabs {
  height: 44px;
  background: #fff;
  border-bottom: 1px solid $border-color-card;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 4px;
  flex-shrink: 0;
  overflow: visible;
  position: relative;
  z-index: 5;
}

.sub-tab {
  position: relative;
  height: 44px;
  line-height: 44px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  color: $text-secondary;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s;

  &:hover {
    color: $color-primary;
  }

  &.active {
    color: $color-primary;

    &::after {
      content: '';
      position: absolute;
      left: 16px;
      right: 16px;
      bottom: 0;
      height: 2px;
      background: $color-primary;
      border-radius: 1px;
    }
  }
}

.sub-tab-guide {
  position: absolute;
  top: 48px;
  left: 50%;
  z-index: 40;
  width: 276px;
  padding: 14px 14px 12px;
  border-radius: 8px;
  background: $color-primary;
  color: #fff;
  line-height: 1.4;
  white-space: normal;
  box-shadow: 0 10px 24px rgba(74, 45, 190, 0.22);
  transform: translateX(-50%);

  &::before {
    content: '';
    position: absolute;
    top: -6px;
    left: 50%;
    width: 12px;
    height: 12px;
    background: $color-primary;
    transform: translateX(-50%) rotate(45deg);
  }

  &__close {
    position: absolute;
    top: 8px;
    right: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.78);
    cursor: pointer;

    i { font-size: 12px; }
    &:hover { color: #fff; }
  }

  h3 {
    margin: 0 24px 6px 0;
    color: #fff;
    font-size: 14px;
    line-height: 20px;
    font-weight: 600;
  }

  p {
    margin: 0 0 12px;
    color: rgba(255, 255, 255, 0.88);
    font-size: 12px;
    line-height: 18px;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    span {
      color: rgba(255, 255, 255, 0.84);
      font-size: 12px;
      line-height: 24px;
      font-weight: 600;
    }
  }

  &__actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  &__btn {
    height: 26px;
    padding: 0 10px;
    border: 1px solid #fff;
    border-radius: 6px;
    background: #fff;
    color: $color-primary;
    cursor: pointer;
    font-family: inherit;
    font-size: 12px;
    line-height: 24px;

    &:hover { background: rgba(255, 255, 255, 0.92); }

    &--ghost {
      border-color: rgba(255, 255, 255, 0.34);
      background: transparent;
      color: rgba(255, 255, 255, 0.88);

      &:hover {
        border-color: rgba(255, 255, 255, 0.72);
        background: rgba(255, 255, 255, 0.10);
        color: #fff;
      }
    }
  }
}

/* 返回栏 */
.sub-back-bar {
  height: 44px;
  background: #fff;
  border-bottom: 1px solid $border-color-card;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  flex-shrink: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 10px;
  border: none;
  background: transparent;
  color: $color-primary;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  border-radius: 6px;
  transition: background 0.15s;

  i {
    font-size: 14px;
  }

  &:hover {
    background: $color-primary-bg;
  }
}

.back-title {
  font-size: 15px;
  font-weight: 600;
  color: $text-base;
}

.sub-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
}
</style>
