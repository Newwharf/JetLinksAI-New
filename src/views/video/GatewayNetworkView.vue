<script setup lang="ts">
/**
 * 网关网络配置页
 * 不同网段场景下，摄像头需要插两根网线并做网络配置
 */
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { gateways } from './device.mock'

const route = useRoute()
const router = useRouter()

const gatewayId = computed(() => String(route.params.id || ''))
const gateway = computed(() => gateways.find(g => g.id === gatewayId.value))

const form = ref({
  gatewayIp: '192.168.1.108',
  subnetMask: '255.255.255.0',
  defaultGateway: '192.168.1.1',
  cameraNetwork: '192.168.2.0/24',
})

const submitting = ref(false)

function goBack() {
  router.push(`/video/device/gateway/${gatewayId.value}/address`)
}

function handleSubmit() {
  submitting.value = true
  setTimeout(() => {
    submitting.value = false
    message.success('网络配置已提交，请返回同步通道检测网关状态')
    router.push(`/video/device/gateway/${gatewayId.value}/address`)
  }, 800)
}
</script>

<template>
  <div class="nw-page">
    <!-- 顶部信息栏 -->
    <div class="nw-header">
      <div class="nw-header__left">
        <button class="nw-back" type="button" @click="goBack">
          <i class="i-ant-design-arrow-left-outlined" />
          <span>返回</span>
        </button>
        <h2 class="nw-header__title">网络配置</h2>
        <span v-if="gateway" class="nw-header__gw">{{ gateway.name }}</span>
      </div>
    </div>

    <!-- 提示 -->
    <div class="nw-tip">
      <i class="i-ant-design-info-circle-outlined" />
      <div class="nw-tip__body">
        <strong>不同网段网络配置</strong>
        <p>当网关与摄像头不在同一网段时，摄像头需要插两根网线（一根接入网关，一根接入交换机），并完成以下网络配置后设备才能正常通信。</p>
      </div>
    </div>

    <!-- 表单 -->
    <div class="nw-form-card">
      <div class="nw-field">
        <label class="nw-field__label">网关 IP 地址</label>
        <a-input v-model:value="form.gatewayIp" placeholder="如 192.168.1.108" allow-clear>
          <template #prefix><i class="i-ant-design-global-outlined" /></template>
        </a-input>
      </div>
      <div class="nw-field">
        <label class="nw-field__label">子网掩码</label>
        <a-input v-model:value="form.subnetMask" placeholder="如 255.255.255.0" allow-clear>
          <template #prefix><i class="i-ant-design-border-outlined" /></template>
        </a-input>
      </div>
      <div class="nw-field">
        <label class="nw-field__label">默认网关</label>
        <a-input v-model:value="form.defaultGateway" placeholder="如 192.168.1.1" allow-clear>
          <template #prefix><i class="i-ant-design-router-outlined" /></template>
        </a-input>
      </div>
      <div class="nw-field">
        <label class="nw-field__label">摄像头网段</label>
        <a-input v-model:value="form.cameraNetwork" placeholder="如 192.168.2.0/24" allow-clear>
          <template #prefix><i class="i-ant-design-video-camera-outlined" /></template>
        </a-input>
        <p class="nw-field__hint">摄像头所在网段地址，配置后网关可跨网段发现摄像头设备</p>
      </div>

      <div class="nw-actions">
        <button class="nw-btn nw-btn--default" type="button" @click="goBack">取消</button>
        <button class="nw-btn nw-btn--primary" type="button" :disabled="submitting" @click="handleSubmit">
          <i v-if="submitting" class="i-ant-design-loading-outlined sync-spin" />
          <span>{{ submitting ? '提交中...' : '提交配置' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.nw-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 4px;
}

.nw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  &__left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  &__title {
    font-size: 18px;
    font-weight: 600;
    color: $text-base;
    margin: 0;
  }

  &__gw {
    font-size: 13px;
    color: $text-muted;
    padding: 2px 10px;
    background: $bg-page;
    border-radius: 6px;
  }
}

.nw-back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid $border-color-light;
  border-radius: 6px;
  background: #fff;
  font-size: 13px;
  color: $text-secondary;
  cursor: pointer;
  transition: all 0.15s;

  &:hover { border-color: $color-primary; color: $color-primary; }
  i { font-size: 14px; }
}

.nw-tip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px 16px;
  background: rgba(250, 173, 20, 0.06);
  border: 1px solid rgba(250, 173, 20, 0.25);
  border-radius: 10px;

  > i { font-size: 20px; color: #faad14; flex-shrink: 0; margin-top: 1px; }

  &__body {
    strong { font-size: 14px; font-weight: 600; color: $text-base; display: block; margin-bottom: 4px; }
    p { font-size: 13px; color: $text-secondary; line-height: 1.6; margin: 0; }
  }
}

.nw-form-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 520px;
}

.nw-field {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &__label {
    font-size: 13px;
    font-weight: 500;
    color: $text-base;
  }

  &__hint {
    font-size: 12px;
    color: $text-muted;
    margin: 0;
    line-height: 1.5;
  }
}

.nw-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 8px;
}

.nw-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 36px;
  padding: 0 20px;
  border-radius: 8px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;

  &--default {
    border: 1px solid $border-color-light;
    background: #fff;
    color: $text-secondary;
    &:hover { border-color: $color-primary; color: $color-primary; }
  }

  &--primary {
    border: 1px solid $color-primary;
    background: $color-primary;
    color: #fff;
    &:hover:not(:disabled) { background: $color-primary-hover; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }
}
</style>
