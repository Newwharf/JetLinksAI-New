<script setup lang="ts">
/**
 * 欢迎弹窗 — 首次进入项目时引导用户创建设备
 * 三个入口：创建物联设备、创建视联设备、跳过
 */
import { useAppStore } from '@/stores/app'
import { useRouter } from 'vue-router'

const appStore = useAppStore()
const router = useRouter()

function createIotDevice() {
  appStore.welcomeVisible = false
  appStore.guideActive = true
  appStore.setGuideStep('iot-add')
  router.push('/iot/device')
}

function createVideoDevice() {
  // 先启动引导再跳转，确保引导状态在路由切换前就绪
  appStore.startVideoGuide()
  router.push('/video/device')
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
          让我们添加第一个设备来开始使用平台。选择下方任意<br />
          入口，跟随引导快速完成配置。
        </p>

        <!-- 入口卡片 -->
        <div class="welcome-dialog__cards">
          <button class="welcome-card welcome-card--iot" type="button" @click="createIotDevice">
            <div class="welcome-card__icon">
              <i class="i-ant-design-api-outlined" />
            </div>
            <div class="welcome-card__body">
              <span class="welcome-card__name">创建物联设备</span>
              <span class="welcome-card__hint">接入传感器、网关等物联设备</span>
            </div>
            <i class="welcome-card__arrow i-ant-design-arrow-right-outlined" />
          </button>

          <button class="welcome-card welcome-card--video" type="button" @click="createVideoDevice">
            <div class="welcome-card__icon">
              <i class="i-ant-design-video-camera-outlined" />
            </div>
            <div class="welcome-card__body">
              <span class="welcome-card__name">创建视联设备</span>
              <span class="welcome-card__hint">接入摄像头、NVR 等视频设备</span>
            </div>
            <i class="welcome-card__arrow i-ant-design-arrow-right-outlined" />
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

  &__cards {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 16px;
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

/* 入口卡片 */
.welcome-card {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border: 2px solid $border-color-card;
  border-radius: 12px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
  font-family: inherit;

  &:hover:not(:disabled) {
    border-color: $color-primary;
    background: #faf9ff;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  &__icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }

  &--iot .welcome-card__icon {
    background: rgba(24, 144, 255, 0.1);
    color: #1890ff;
  }

  &--video .welcome-card__icon {
    background: $color-primary-bg;
    color: $color-primary;
  }

  &__body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-size: 14px;
    font-weight: 600;
    color: $text-base;
  }

  &__hint {
    font-size: 12px;
    color: $text-muted;
  }

  &__tag {
    font-size: 10px;
    color: $text-muted;
    background: $bg-page;
    padding: 2px 8px;
    border-radius: 9999px;
    flex-shrink: 0;
  }

  &__arrow {
    font-size: 16px;
    color: $color-primary;
    flex-shrink: 0;
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
