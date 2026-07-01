<script setup lang="ts">
/**
 * AI 对话能力中心 - 按需求重构
 * 布局：顶部留白 / 中部标题+推荐问题 / 底部 composer（输入框+chip）
 */

interface ModeChip {
  key: string
  label: string
  icon: string
}

const modes: ModeChip[] = [
  { key: 'search', label: '全局检索', icon: 'i-ant-design-search-outlined' },
  { key: 'dashboard', label: '大屏生成', icon: 'i-ant-design-dashboard-outlined' },
  { key: 'brief', label: '简报生成', icon: 'i-ant-design-file-text-outlined' },
  { key: 'auto', label: '自动化任务', icon: 'i-ant-design-thunderbolt-outlined' }
]

// 推荐问题：扩充到 13 个，4~5 个一行共三行
const suggestions = [
  '昨天 9 点谁在门口',
  '找戴眼镜背包的人',
  '最近识别到谁',
  '门口白衣的人有哪些',
  '统计本周客流高峰时段',
  '查看东门今日异常聚集',
  '生成今日 AI 告警日报',
  '对比上周与本周末客流',
  '检索穿红色衣服的人员',
  '查找夜间逗留超过 1 小时的人',
  '哪些设备今天离线了',
  '生成本周巡检完成率简报',
  '创建每日 9 点自动日报任务'
]

const activeMode = ref('search')
const inputText = ref('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)

function selectMode(key: string) {
  activeMode.value = key
}

function useExample(text: string) {
  inputText.value = text
  nextTick(autoResize)
}

// textarea 自适应：默认 2 行，随内容增长，最多 6 行
function autoResize() {
  const el = textareaRef.value
  if (!el) return
  el.style.height = 'auto'
  // 行高 24px，最少 2 行（48px），最多 6 行（144px）
  const minH = 48
  const maxH = 144
  el.style.height = Math.min(Math.max(el.scrollHeight, minH), maxH) + 'px'
}

function onInput() {
  autoResize()
}

function handleSend() {
  if (!inputText.value.trim()) return
  inputText.value = ''
  nextTick(autoResize)
}

// 模拟上传图片
const uploading = ref(false)
function handleUpload() {
  uploading.value = true
  setTimeout(() => {
    uploading.value = false
  }, 1200)
}
</script>

<template>
  <div class="ai-hub">
    <!-- 中部：标题 + 推荐问题 -->
    <section class="hub-middle">
      <!-- 标题：「处理什么」为主题紫色 -->
      <h1 class="hub-title">
        今天需要 AI <span class="title-accent">处理什么</span>
      </h1>

      <!-- 推荐问题：紧跟标题下方，每行 4~5 个，三行 -->
      <div class="suggestions">
        <button
          v-for="s in suggestions"
          :key="s"
          class="suggestion-btn"
          @click="useExample(s)"
        >
          {{ s }}
        </button>
      </div>
    </section>

    <!-- 底部：composer -->
    <section class="hub-bottom">
      <div class="home-composer">
        <!-- 输入区 -->
        <textarea
          ref="textareaRef"
          v-model="inputText"
          class="composer-input"
          placeholder="例如：分析东门聚集是否异常，并生成今日运营简报..."
          rows="2"
          @input="onInput"
          @keydown.enter.prevent="handleSend"
        />
        <!-- 操作行：+按钮、模式chip、发送按钮 同一行 -->
        <div class="composer-actions">
          <!-- 圆形 + 按钮（上传图片） -->
          <a-tooltip title="上传图片">
            <button class="plus-btn" :class="{ uploading }" @click="handleUpload">
              <i :class="uploading ? 'i-ant-design-loading-outlined' : 'i-ant-design-plus-outlined'" />
            </button>
          </a-tooltip>
          <!-- 模式 chip -->
          <button
            v-for="m in modes"
            :key="m.key"
            class="mode-chip"
            :class="{ 'is-active': activeMode === m.key }"
            @click="selectMode(m.key)"
          >
            <i :class="m.icon" />
            <span>{{ m.label }}</span>
          </button>
          <!-- 发送按钮（右端，黑色） -->
          <button class="send-btn" :disabled="!inputText.trim()" @click="handleSend">
            <i class="i-ant-design-arrow-up-outlined" />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.ai-hub {
  height: 100%;
  background: $bg-page;
  padding: 24px 24px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow-y: auto;
}

/* ===== 中部：标题 + 推荐问题 ===== */
.hub-middle {
  width: 100%;
  max-width: 820px;
  // 推到页面中部偏上
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 0;
}

.hub-title {
  font-size: 28px;
  font-weight: 600;
  color: $text-title;
  margin: 0 0 28px;
  text-align: center;

  // 「处理什么」为主题紫色
  .title-accent {
    color: $color-primary;
  }
}

/* 推荐问题 */
.suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  max-width: 820px;
}

.suggestion-btn {
  height: 32px;
  padding: 0 14px;
  border: 1px solid $border-color-light;
  border-radius: $radius-chip;
  background: #fff;
  color: $text-secondary;
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  transition: all 0.2s;

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
  }
}

/* ===== 底部：composer ===== */
.hub-bottom {
  width: 100%;
  max-width: 820px;
  flex-shrink: 0;
  padding-bottom: 8px;
}

.home-composer {
  width: 100%;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: $radius-home-composer;
  box-shadow: $shadow-composer;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
}

.composer-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  color: $text-base;
  font-family: inherit;
  line-height: 24px;
  resize: none;
  // 默认 2 行高度，JS 会动态调整，最大 6 行
  min-height: 48px;
  max-height: 144px;
  overflow-y: auto;
  padding: 0;
  margin-bottom: 10px;

  &::placeholder {
    color: $text-tertiary;
  }
}

// 操作行：+按钮、模式chip、发送按钮 同一行（无分隔线）
.composer-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

// 圆形 + 按钮（上传图片）
.plus-btn {
  width: 28px;
  height: 28px;
  border: 1px solid $border-color-card;
  border-radius: 50%;
  background: $bg-page;
  color: $text-secondary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: all 0.2s;

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
  }

  &.uploading i {
    animation: spin 1s linear infinite;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

// 发送按钮（同行最右，黑色）
.send-btn {
  width: 32px;
  height: 32px;
  border: 1px solid transparent;
  border-radius: $radius-card;
  background: $text-base;
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  box-shadow: $shadow-send-btn;
  transition: opacity 0.2s;
  margin-left: auto;

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    box-shadow: none;
  }
}

/* 模式 chip（与 +按钮、发送按钮同行）*/
.mode-chip {
  height: 30px;
  padding: 5px 10px;
  border-radius: $radius-chip;
  background: $bg-chip;
  border: 1px solid $border-color-card;
  color: $text-secondary;
  font-size: 12.5px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-family: inherit;
  transition: all 0.2s;

  i {
    font-size: 13px;
  }

  &:hover {
    border-color: $color-primary;
  }

  &.is-active {
    background: $color-primary-bg;
    border-color: $color-primary;
    color: $color-primary;
  }
}
</style>
