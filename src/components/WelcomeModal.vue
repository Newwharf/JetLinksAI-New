<script setup lang="ts">
/**
 * 欢迎弹窗 — 首次进入项目时引导用户了解系统板块
 */
import { useAppStore } from '@/stores/app'
import { useRouter } from 'vue-router'

const appStore = useAppStore()
const router = useRouter()

function startGuide() {
  appStore.setScenario('general')
  appStore.startSystemGuide()
  router.push('/dashboard')
}

function skip() {
  appStore.skipGuide()
}
</script>

<template>
  <Transition name="welcome">
    <div v-if="appStore.welcomeVisible" class="welcome-mask">
      <div class="welcome-dialog">
        <!-- 头部图标 -->
        <div class="welcome-dialog__icon">
          <i class="i-ant-design-rocket-outlined" />
        </div>

        <!-- 标题 -->
        <h2 class="welcome-dialog__title">欢迎使用 JetLinks</h2>
        <p class="welcome-dialog__desc">
          完成下面简单几步，快速了解项目中的核心功能和常用入口。
        </p>

        <!-- 操作按钮 -->
        <div class="welcome-dialog__actions">
          <button class="welcome-dialog__primary" type="button" @click="startGuide">
            <i class="i-ant-design-play-circle-outlined" />
            开始新手引导
          </button>
        </div>

        <!-- 跳过 -->
        <button class="welcome-dialog__skip" type="button" @click="skip">
          跳过，稍后再说
        </button>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.welcome-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.welcome-dialog {
  width: 480px;
  background: #fff;
  border-radius: 14px;
  padding: 32px 28px 24px;
  box-shadow: 0 20px 60px 0 rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  align-items: center;

  &__icon {
    width: 60px;
    height: 60px;
    border-radius: 16px;
    background: linear-gradient(135deg, #7d5cff 0%, #6e4bff 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 30px;
    box-shadow: 0 4px 16px rgba(110, 75, 255, 0.3);
    margin-bottom: 16px;
  }

  &__title {
    margin: 0 0 8px;
    font-size: 22px;
    font-weight: 600;
    color: $text-base;
    text-align: center;
  }

  &__desc {
    margin: 0 0 20px;
    font-size: 13px;
    line-height: 1.7;
    color: $text-tertiary;
    text-align: center;
  }

  &__actions {
    width: 100%;
    display: flex;
    justify-content: center;
    margin-bottom: 14px;
  }

  &__primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 136px;
    height: 34px;
    padding: 0 18px;
    border: 1px solid $color-primary;
    border-radius: 6px;
    background: $color-primary;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s;
    gap: 6px;

    i { font-size: 15px; }

    &:hover { background: $color-primary-hover; }
  }

  &__skip {
    border: none;
    background: transparent;
    color: $text-muted;
    font-size: 13px;
    cursor: pointer;
    padding: 4px 8px;
    transition: color 0.15s;
    &:hover { color: $color-primary; }
  }
}

/* 动画 */
.welcome-enter-active, .welcome-leave-active {
  transition: opacity 0.25s;
  .welcome-dialog { transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.25s; }
}
.welcome-enter-from, .welcome-leave-to {
  opacity: 0;
  .welcome-dialog { transform: scale(0.92) translateY(10px); opacity: 0; }
}
</style>
