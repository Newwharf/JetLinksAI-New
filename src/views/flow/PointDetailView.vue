<script setup lang="ts">
/**
 * 客流点位详情
 * 用于配置摄像头画面中的进出线框，并查看越线日志。
 */
import { flowPointCards, type FlowLineStatus } from './mock'
import { useRoute, useRouter } from 'vue-router'

type DetailTab = 'line' | 'log'

interface LineFrame {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
  rotate: number
  tilt: number
  flipped: boolean
}

const route = useRoute()
const router = useRouter()
const activeTab = ref<DetailTab>('line')
const drawingMode = ref(false)
const cameraFullscreen = ref(false)
const selectedFrameId = ref<string | null>(null)
const previewImage = ref('')

const currentPoint = computed(() => {
  const id = String(route.params.id || '')
  return flowPointCards.find(point => point.key === id) || flowPointCards[0]
})

const frames = ref<LineFrame[]>([
  {
    id: 'line-1',
    name: '线框 1',
    x: 16,
    y: 28,
    width: 58,
    height: 24,
    rotate: 11,
    tilt: 18,
    flipped: false
  }
])

const selectedFrame = computed(() => frames.value.find(frame => frame.id === selectedFrameId.value) || null)
const pointRemark = computed(() => currentPoint.value.remark || '暂无说明')

const logRows = computed(() => [
  { time: '2026-07-10 09:42:16', direction: '进', count: 1, snapshot: currentPoint.value.thumb },
  { time: '2026-07-10 09:38:51', direction: '出', count: 1, snapshot: currentPoint.value.thumb },
  { time: '2026-07-10 09:31:08', direction: '进', count: 2, snapshot: currentPoint.value.thumb },
  { time: '2026-07-10 09:12:44', direction: '出', count: 1, snapshot: currentPoint.value.thumb },
  { time: '2026-07-10 08:58:27', direction: '进', count: 3, snapshot: currentPoint.value.thumb }
])

function fullArea(path: string[]) {
  return path.join(' / ')
}

function lineStatusMeta(status: FlowLineStatus) {
  return status === 'done'
    ? { text: '已划线', cls: 'done' }
    : { text: '待划线', cls: 'pending' }
}

function frameStyle(frame: LineFrame) {
  return {
    left: `${frame.x}%`,
    top: `${frame.y}%`,
    width: `${frame.width}%`,
    height: `${frame.height}%`,
    '--frame-rotate': `${frame.rotate}deg`
  }
}

function startDraw() {
  drawingMode.value = true
  selectedFrameId.value = null
}

function refreshCamera() {
  drawingMode.value = false
}

function toggleFullscreen() {
  cameraFullscreen.value = !cameraFullscreen.value
  drawingMode.value = false
}

function createFakeFrame() {
  if (!drawingMode.value) return

  const index = frames.value.length + 1
  const frame: LineFrame = {
    id: `line-${Date.now()}`,
    name: `线框 ${index}`,
    x: 24,
    y: 36,
    width: 46,
    height: 22,
    rotate: -8,
    tilt: 12,
    flipped: false
  }

  frames.value.push(frame)
  selectedFrameId.value = frame.id
  drawingMode.value = false
}

function flipDirection() {
  if (!selectedFrame.value) return
  selectedFrame.value.flipped = !selectedFrame.value.flipped
}

function deleteFrame() {
  if (!selectedFrame.value) return
  frames.value = frames.value.filter(frame => frame.id !== selectedFrame.value?.id)
  selectedFrameId.value = null
}

function crossingAction(direction: string) {
  return direction === '进' ? '进入' : '离开'
}
</script>

<template>
  <div class="point-detail-page">
    <section class="detail-info-card">
      <div class="detail-info-main">
        <h2>{{ currentPoint.name }}</h2>
        <div class="detail-meta">
          <span class="line-tag" :class="lineStatusMeta(currentPoint.lineStatus).cls">
            {{ lineStatusMeta(currentPoint.lineStatus).text }}
          </span>
          <span :title="fullArea(currentPoint.areaPath)">
            <i class="i-ant-design-environment-outlined" />
            {{ fullArea(currentPoint.areaPath) }}
          </span>
          <span :title="currentPoint.gatewayName">
            <i class="i-ant-design-cloud-server-outlined" />
            {{ currentPoint.gatewayName }}
          </span>
          <span :title="currentPoint.cameraName">
            <i class="i-ant-design-video-camera-outlined" />
            {{ currentPoint.cameraName }}
          </span>
        </div>
        <p class="detail-remark">{{ pointRemark }}</p>
      </div>
      <div class="detail-actions">
        <button class="ghost-btn" @click="router.push('/flow/point')">
          <i class="i-ant-design-arrow-left-outlined" />
          返回
        </button>
      </div>
    </section>

    <section class="detail-tabs-card">
      <div class="detail-tabs">
        <button :class="{ active: activeTab === 'line' }" @click="activeTab = 'line'">划线配置</button>
        <button :class="{ active: activeTab === 'log' }" @click="activeTab = 'log'">越线日志</button>
      </div>

      <div v-if="activeTab === 'line'" class="line-config-layout">
        <section class="camera-panel" :class="{ fullscreen: cameraFullscreen }">
          <header class="panel-head">
            <button class="primary-btn" :class="{ active: drawingMode }" @click="startDraw">
              <i class="i-ant-design-plus-outlined" />
              新增进出线框
            </button>
            <div class="camera-tools">
              <button class="ghost-btn" @click="refreshCamera">
                <i class="i-ant-design-reload-outlined" />
                画面刷新
              </button>
              <button class="ghost-btn" @click="toggleFullscreen">
                <i :class="cameraFullscreen ? 'i-ant-design-fullscreen-exit-outlined' : 'i-ant-design-fullscreen-outlined'" />
                {{ cameraFullscreen ? '退出全屏' : '切换全屏' }}
              </button>
            </div>
          </header>

          <div class="camera-stage" :class="{ drawing: drawingMode }" @mousedown="createFakeFrame">
            <img :src="currentPoint.thumb" :alt="currentPoint.cameraName" draggable="false" />
            <button
              v-for="frame in frames"
              :key="frame.id"
              class="line-frame"
              :class="{ selected: selectedFrameId === frame.id, flipped: frame.flipped }"
              :style="frameStyle(frame)"
              @click.stop="selectedFrameId = frame.id"
            >
              <span class="frame-label">{{ frame.name }}</span>
              <span class="handle handle-a" />
              <span class="handle handle-b" />
              <span class="handle handle-c" />
              <span class="handle handle-d" />
              <span class="flow-arrow flow-arrow--in">进</span>
              <span class="flow-arrow flow-arrow--out">出</span>
            </button>
          </div>
        </section>

        <aside class="frame-panel">
          <template v-if="selectedFrame">
            <header class="frame-panel__head">
              <strong>画框基本信息</strong>
              <span>{{ selectedFrame.name }}</span>
            </header>

            <div class="frame-info-list">
              <label class="info-row">
                <span>名称</span>
                <input v-model="selectedFrame.name" />
              </label>
              <label class="info-row">
                <span>坐标 X</span>
                <input v-model.number="selectedFrame.x" type="number" min="0" max="100" />
              </label>
              <label class="info-row">
                <span>坐标 Y</span>
                <input v-model.number="selectedFrame.y" type="number" min="0" max="100" />
              </label>
              <label class="info-row">
                <span>倾角</span>
                <input v-model.number="selectedFrame.tilt" type="number" />
              </label>
            </div>

            <div class="detect-card">
              <div class="detect-card__title">检测区域</div>
              <div class="detect-grid">
                <label>
                  <span>旋转角度</span>
                  <input v-model.number="selectedFrame.rotate" type="number" />
                </label>
                <label>
                  <span>区域宽度</span>
                  <input v-model.number="selectedFrame.width" type="number" min="1" max="100" />
                </label>
                <label>
                  <span>区域高度</span>
                  <input v-model.number="selectedFrame.height" type="number" min="1" max="100" />
                </label>
              </div>
            </div>

            <div class="frame-actions">
              <button class="ghost-btn" @click="flipDirection">
                <i class="i-ant-design-swap-outlined" />
                调转进出方向
              </button>
              <button class="danger-btn" @click="deleteFrame">
                <i class="i-ant-design-delete-outlined" />
                删除画框
              </button>
            </div>
          </template>

          <div v-else class="frame-empty">
            <i class="i-ant-design-select-outlined" />
            <strong>未选中画框</strong>
            <p>请选择画面中的线框，或点击“新增进出线框”后在画面中绘制。</p>
          </div>
        </aside>
      </div>

      <div v-else class="log-panel">
        <header class="log-head">
          <div>
            <strong>实时越线记录</strong>
            <span>{{ currentPoint.name }}</span>
          </div>
          <span class="live-badge">实时</span>
        </header>

        <div class="crossing-list scroll-thin">
          <article v-for="row in logRows" :key="row.time" class="crossing-item" @click="previewImage = row.snapshot">
            <div class="crossing-shot">
              <img :src="row.snapshot" :alt="`${row.time} 越线截图`" draggable="false" />
            </div>
            <div class="crossing-content">
              <div class="crossing-title">
                <span class="direction-pill" :class="row.direction === '进' ? 'in' : 'out'">{{ row.direction }}</span>
                <strong>{{ crossingAction(row.direction) }} {{ row.count }} 人</strong>
              </div>
              <div class="crossing-meta">
                <span>
                  <i class="i-ant-design-clock-circle-outlined" />
                  {{ row.time }}
                </span>
              </div>
            </div>
            <div class="crossing-count">
              <span>人数</span>
              <strong>{{ row.count }}</strong>
            </div>
          </article>
        </div>
      </div>
    </section>

    <div v-if="previewImage" class="image-preview-mask" @click="previewImage = ''">
      <img :src="previewImage" alt="越线截图放大" />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.point-detail-page {
  height: 100%;
  min-height: 0;
  padding: 8px;
  background: $bg-page;
  color: $text-base;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: hidden;
}

.detail-info-card,
.detail-tabs-card {
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  box-shadow: 0 1px rgba(20, 22, 30, 0.04);
}

.detail-info-card {
  min-height: 112px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
}

.detail-info-main {
  min-width: 0;

  h2 {
    margin: 0 0 12px;
    color: $text-base;
    font-size: 20px;
    font-weight: 650;
    line-height: 1.2;
  }
}

.detail-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;

  span:not(.line-tag) {
    display: flex;
    align-items: center;
    gap: 5px;
    min-width: 0;
    max-width: 360px;
    color: $text-secondary;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  i {
    color: $text-muted;
    flex-shrink: 0;
  }
}

.detail-remark {
  margin: 10px 0 0;
  max-width: 960px;
  color: $text-tertiary;
  font-size: 13px;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-actions,
.frame-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.ghost-btn,
.danger-btn,
.primary-btn {
  height: 34px;
  padding: 0 12px;
  border-radius: 6px;
  font-family: inherit;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.15s;

  i {
    font-size: 14px;
  }
}

.ghost-btn {
  border: 1px solid $border-color-card;
  background: #fff;
  color: $text-secondary;

  &:hover {
    color: $color-primary;
    border-color: $color-primary;
  }
}

.danger-btn {
  border: 1px solid rgba(255, 77, 79, 0.22);
  background: rgba(255, 77, 79, 0.08);
  color: #cf1322;

  &:hover {
    border-color: #ff7875;
    background: rgba(255, 77, 79, 0.14);
  }
}

.primary-btn {
  border: 1px solid $color-primary;
  background: $color-primary;
  color: #fff;

  &.active,
  &:hover {
    background: #5a3ee6;
    border-color: #5a3ee6;
  }
}

.line-tag {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 4px;

  &.done {
    color: $color-online;
    background: $color-online-bg;
  }

  &.pending {
    color: #fa8c16;
    background: rgba(250, 140, 22, 0.12);
  }
}

.detail-tabs-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.detail-tabs {
  height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid $border-color-card;
  display: flex;
  align-items: center;
  gap: 20px;
  flex-shrink: 0;

  button {
    height: 48px;
    border: none;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: $text-secondary;
    font-family: inherit;
    font-size: 14px;
    cursor: pointer;

    &.active {
      color: $color-primary;
      border-bottom-color: $color-primary;
      font-weight: 600;
    }
  }
}

.line-config-layout {
  flex: 1;
  min-height: 0;
  padding: 12px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 12px;
}

.camera-panel,
.frame-panel,
.log-panel {
  min-height: 0;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}

.camera-panel {
  display: flex;
  flex-direction: column;

  &.fullscreen {
    position: fixed;
    inset: 0;
    z-index: 1200;
    border: none;
    border-radius: 0;
    background: #000;
    box-shadow: none;

    .panel-head {
      position: absolute;
      top: 16px;
      right: 16px;
      left: auto;
      width: auto;
      height: 40px;
      padding: 0;
      border: none;
      background: transparent;
      z-index: 10;
    }

    .primary-btn,
    .camera-tools .ghost-btn:first-child {
      display: none;
    }

    .ghost-btn {
      border-color: rgba(255, 255, 255, 0.28);
      background: rgba(15, 23, 42, 0.7);
      color: #fff;
      backdrop-filter: blur(8px);

      &:hover {
        border-color: rgba(255, 255, 255, 0.5);
        color: #fff;
      }
    }

    .camera-stage {
      min-height: 100vh;
    }
  }
}

.panel-head {
  height: 52px;
  padding: 0 14px;
  border-bottom: 1px solid $border-color-card;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;

}

.camera-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.camera-stage {
  position: relative;
  flex: 1;
  min-height: 420px;
  overflow: hidden;
  background: #171b25;
  cursor: default;

  &.drawing {
    cursor: crosshair;

    &::after {
      content: '长按画面创建线框';
      position: absolute;
      left: 50%;
      top: 16px;
      transform: translateX(-50%);
      height: 30px;
      padding: 0 12px;
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.72);
      color: #fff;
      font-size: 12px;
      display: flex;
      align-items: center;
      pointer-events: none;
      z-index: 5;
    }
  }

  > img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    user-select: none;
  }
}

.line-frame {
  position: absolute;
  transform: rotate(var(--frame-rotate));
  transform-origin: center;
  border: 5px solid #2fd7ec;
  background: rgba(47, 215, 236, 0.16);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.22), 0 8px 24px rgba(0, 0, 0, 0.24);
  cursor: pointer;
  padding: 0;
  z-index: 2;

  &.selected {
    border-color: #1677ff;
    background: rgba(22, 119, 255, 0.18);
    box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.3), 0 10px 26px rgba(0, 0, 0, 0.28);
  }

  &.flipped {
    .flow-arrow--in {
      left: 58%;
      background: #22c55e;
    }

    .flow-arrow--out {
      left: 34%;
      background: #ff7a1a;
    }
  }
}

.frame-label {
  position: absolute;
  left: -6px;
  top: -44px;
  min-width: 82px;
  height: 32px;
  padding: 0 14px;
  border-radius: 16px;
  background: #24bed6;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 14px;
  pointer-events: none;
}

.handle {
  position: absolute;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 5px solid #1677ff;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}

.handle-a {
  left: -15px;
  top: -15px;
}

.handle-b {
  right: -15px;
  top: -15px;
}

.handle-c {
  right: -15px;
  bottom: -15px;
}

.handle-d {
  left: -15px;
  bottom: -15px;
}

.flow-arrow {
  position: absolute;
  top: 44%;
  width: 42px;
  height: 24px;
  border-radius: 4px 14px 14px 4px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: rotate(34deg);
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    right: -11px;
    top: 0;
    width: 0;
    height: 0;
    border-top: 12px solid transparent;
    border-bottom: 12px solid transparent;
    border-left: 12px solid currentColor;
    color: inherit;
  }
}

.flow-arrow--in {
  left: 34%;
  background: #ff7a1a;
}

.flow-arrow--out {
  left: 58%;
  background: #22c55e;
}

.frame-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
}

.frame-panel__head {
  margin-bottom: 14px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;

  strong {
    font-size: 15px;
    font-weight: 600;
  }

  span {
    color: $text-muted;
    font-size: 12px;
  }
}

.frame-info-list {
  border: 1px solid $border-color-card;
  border-radius: 8px;
  overflow: hidden;
}

.info-row {
  min-height: 46px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  + .info-row {
    border-top: 1px solid $border-color-card;
  }

  span {
    color: $text-tertiary;
    font-size: 13px;
  }

  input {
    width: 132px;
    height: 30px;
    border: 1px solid rgb(235, 237, 240);
    border-radius: 6px;
    padding: 0 9px;
    background: #fff;
    color: $text-base;
    font-size: 13px;
    font-family: inherit;
    text-align: right;
    outline: none;

    &:focus {
      border-color: $color-primary;
    }
  }
}

.detect-card {
  margin-top: 12px;
  padding: 12px;
  border-radius: 8px;
  background: $bg-page;
  border: 1px solid $border-color-card;
}

.detect-card__title {
  margin-bottom: 10px;
  color: $text-base;
  font-size: 13px;
  font-weight: 600;
}

.detect-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;

  label {
    min-height: 38px;
    padding: 8px 10px;
    border-radius: 6px;
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  span {
    color: $text-tertiary;
    font-size: 12px;
  }

  input {
    width: 92px;
    height: 28px;
    border: 1px solid rgb(235, 237, 240);
    border-radius: 6px;
    padding: 0 8px;
    background: #fff;
    color: $text-base;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    text-align: right;
    outline: none;

    &:focus {
      border-color: $color-primary;
    }
  }
}

.frame-actions {
  margin-top: auto;
  padding-top: 16px;
  align-items: stretch;

  button {
    flex: 1;
  }
}

.frame-empty {
  flex: 1;
  min-height: 360px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: $text-muted;

  i {
    margin-bottom: 10px;
    font-size: 38px;
    opacity: 0.55;
  }

  strong {
    margin-bottom: 6px;
    color: $text-base;
    font-size: 15px;
  }

  p {
    width: 220px;
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
  }
}

.log-panel {
  margin: 12px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.log-head {
  height: 58px;
  padding: 0 16px;
  border-bottom: 1px solid $border-color-card;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-shrink: 0;

  div {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  strong {
    color: $text-base;
    font-size: 15px;
    font-weight: 600;
  }

  span {
    color: $text-muted;
    font-size: 12px;
  }
}

.live-badge {
  position: relative;
  height: 24px;
  padding: 0 10px 0 20px;
  border-radius: 12px;
  background: rgba(34, 197, 94, 0.12);
  color: #16a34a !important;
  display: inline-flex;
  align-items: center;
  font-weight: 600;

  &::before {
    content: '';
    position: absolute;
    left: 9px;
    top: 50%;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
    transform: translateY(-50%);
  }
}

.crossing-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.crossing-item {
  min-height: 104px;
  padding: 10px 16px 10px 10px;
  border: 1px solid $border-color-card;
  border-radius: 10px;
  background: linear-gradient(180deg, #fff 0%, #fbfcff 100%);
  display: grid;
  grid-template-columns: 154px minmax(0, 1fr) 76px;
  gap: 16px;
  align-items: center;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s;

  &:hover {
    border-color: rgba(110, 75, 255, 0.35);
    box-shadow: 0 2px 8px rgba(20, 22, 30, 0.06);

    .crossing-shot img {
      transform: scale(1.04);
    }
  }
}

.crossing-shot {
  position: relative;
  height: 84px;
  border-radius: 8px;
  overflow: hidden;
  background: #171b25;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.2s;
  }
}

.crossing-content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.crossing-title {
  display: flex;
  align-items: center;
  gap: 8px;

  strong {
    color: $text-base;
    font-size: 16px;
    font-weight: 650;
  }
}

.crossing-meta {
  display: flex;
  align-items: center;
  gap: 8px;

  span {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 5px;
    color: $text-tertiary;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  i {
    color: $text-muted;
    flex-shrink: 0;
  }
}

.crossing-count {
  height: 64px;
  border-left: 1px solid $border-color-card;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;

  span {
    color: $text-muted;
    font-size: 12px;
  }

  strong {
    color: $text-base;
    font-size: 22px;
    font-weight: 700;
  }
}

.direction-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 38px;
  height: 22px;
  border-radius: 11px;
  font-size: 12px;
  font-weight: 600;

  &.in {
    color: #16a34a;
    background: rgba(34, 197, 94, 0.12);
  }

  &.out {
    color: #ea580c;
    background: rgba(249, 115, 22, 0.12);
  }
}

.image-preview-mask {
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    max-width: 92vw;
    max-height: 92vh;
    object-fit: contain;
    display: block;
  }
}

@media (max-width: 1280px) {
  .line-config-layout {
    grid-template-columns: minmax(0, 1fr) 320px;
  }

  .detail-meta span:not(.line-tag) {
    max-width: 240px;
  }
}
</style>
