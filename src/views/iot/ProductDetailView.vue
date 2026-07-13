<script setup lang="ts">
/**
 * 产品详情穿透页
 * 产品头 + 应用配置 + 关联设备(折叠) + 模板适配 + 设备能力 + 物模型(折叠) + 健康规则(折叠) + 版本记录(折叠)
 * 点击「编辑 App」→ 显示内嵌画布编辑器（3 栏：组件栏 + 手机画布 + 属性面板）
 */
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  products, devices, statusConfig,
  thingModelProps, thingModelEvents, thingModelFunctions,
  healthRules, versionRecords
} from './mock'

const route = useRoute()
const router = useRouter()

const productId = computed(() => String(route.params.id || ''))
const product = computed(() => products.find(p => p.id === productId.value) || products[0])

const relatedDevices = computed(() => devices.value.filter(d => d.productId === product.value.id))

function goBack() { router.push('/iot/product') }

// ===== 折叠面板状态 =====
const expandedPanels = ref({
  related: false,      // 关联设备（默认折叠）
  model: true,         // 物模型（默认展开）
  health: false,       // 健康规则
  version: false,      // 版本记录
  docs: false          // 开发者文档
})
function togglePanel(key: keyof typeof expandedPanels.value) {
  expandedPanels.value[key] = !expandedPanels.value[key]
}

// ===== 物模型 tab =====
const modelTab = ref<'property' | 'event' | 'function' | 'tag'>('property')
const modelData = computed(() => {
  if (modelTab.value === 'property') return thingModelProps
  if (modelTab.value === 'event') return thingModelEvents
  if (modelTab.value === 'function') return thingModelFunctions
  return []
})
const modelTabLabels = computed(() => ({
  property: `属性(${thingModelProps.length})`,
  event: `事件(${thingModelEvents.length})`,
  function: `功能(${thingModelFunctions.length})`,
  tag: '标签(0)'
}))

// ===== App 编辑器画布 =====
const showEditor = ref(false)
const canvasWidth = ref<'375' | 'auto'>('375')

// 可拖拽组件
interface EditorComponent {
  id: string
  name: string
  desc: string
  icon: string
  disabled?: boolean
}
const componentList: EditorComponent[] = [
  { id: 'comp-value', name: '数值详情条', desc: '图标+标题+实时值', icon: 'i-ant-dashboard-outlined' },
  { id: 'comp-gauge', name: '环形仪表盘', desc: '后续扩展', icon: 'i-ant-design-dashboard-outlined', disabled: true },
  { id: 'comp-battery', name: '电池电量', desc: '后续扩展', icon: 'i-ant-design-fund-outlined', disabled: true }
]

// 画布上已放置的组件
interface CanvasItem {
  id: string
  componentId: string
  name: string
  title: string
  unit: string
  boundProperty: string
}
const canvasItems = ref<CanvasItem[]>([])
const selectedCanvasId = ref<string | null>(null)

// 属性面板
const propertyOptions = ['温度 26.4℃', '湿度 62%', '亮度 430 lux']
const showPropertyPicker = ref(false)

function openEditor() { showEditor.value = true }
function closeEditor() { showEditor.value = false }

function onDragStart(comp: EditorComponent, e: DragEvent) {
  e.dataTransfer?.setData('componentId', comp.id)
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  const compId = e.dataTransfer?.getData('componentId')
  if (!compId) return
  const comp = componentList.find(c => c.id === compId)
  if (!comp) return
  const newItem: CanvasItem = {
    id: 'canvas-' + Date.now(),
    componentId: compId,
    name: comp.name,
    title: '温度',
    unit: '℃',
    boundProperty: ''
  }
  canvasItems.value.push(newItem)
  selectedCanvasId.value = newItem.id
}
function onDragOver(e: DragEvent) { e.preventDefault() }

function selectCanvasItem(id: string) { selectedCanvasId.value = id }
function removeCanvasItem(id: string) {
  canvasItems.value = canvasItems.value.filter(c => c.id !== id)
  if (selectedCanvasId.value === id) selectedCanvasId.value = null
}

const selectedCanvasItem = computed(() => canvasItems.value.find(c => c.id === selectedCanvasId.value) || null)

function saveEditor() {
  message.success('App 配置已保存')
  showEditor.value = false
}

function selectProperty(prop: string) {
  if (selectedCanvasItem.value) {
    selectedCanvasItem.value.boundProperty = prop
  }
  showPropertyPicker.value = false
}
</script>

<template>
  <div class="pdt-page">
    <!-- 产品头卡片（返回按钮在右侧） -->
    <div class="pdt-hero">
      <div class="pdt-hero__logo"><i class="i-ant-design-appstore-outlined" /></div>
      <div class="pdt-hero__main">
        <h2>{{ product.name }}</h2>
        <div class="pdt-hero__meta">
          <span>接入方式：<strong>{{ product.accessMethod }}</strong></span>
          <span>设备类型：<strong>{{ product.type }}</strong></span>
          <span>厂商：<strong>{{ product.vendor }}</strong></span>
          <span>型号：<strong>{{ product.model }}</strong></span>
        </div>
        <div class="pdt-hero__tags">
          <span class="pdt-tag">品牌 <em>{{ product.brand }}</em></span>
          <span class="pdt-tag">行业 <em>{{ product.scene }}</em></span>
        </div>
        <p class="pdt-hero__desc">{{ product.desc }}</p>
      </div>
      <button class="pdt-hero__back" type="button" @click="goBack">
        <i class="i-ant-design-arrow-left-outlined" /><span>返回产品列表</span>
      </button>
    </div>

    <!-- ===== App 编辑器画布（覆盖层） ===== -->
    <Transition name="editor-fade">
      <div v-if="showEditor" class="editor-overlay">
        <div class="editor-shell">
          <!-- 工具栏 -->
          <div class="editor-toolbar">
            <div class="editor-toolbar__info">
              <h2>App 画布编辑器</h2>
              <p>{{ product.name }} · 设备详情页</p>
            </div>
            <div class="editor-toolbar__actions">
              <button class="ed-btn ed-btn--ghost" @click="closeEditor">返回应用配置</button>
              <button class="ed-btn ed-btn--ghost">预览</button>
              <button class="ed-btn ed-btn--primary" @click="saveEditor"><i class="i-ant-design-save-outlined" />保存</button>
            </div>
          </div>

          <!-- 工作区 3 栏 -->
          <div class="editor-workbench">
            <!-- 左：组件栏 -->
            <aside class="comp-rail">
              <div class="rail-title">基础组件</div>
              <div
                v-for="comp in componentList"
                :key="comp.id"
                class="comp-tile"
                :class="{ disabled: comp.disabled }"
                :draggable="!comp.disabled"
                @dragstart="onDragStart(comp, $event)"
              >
                <div class="comp-tile__icon"><i :class="comp.icon" /></div>
                <div class="comp-tile__info">
                  <span class="comp-tile__name">{{ comp.name }}</span>
                  <span class="comp-tile__desc">{{ comp.desc }}</span>
                </div>
              </div>
            </aside>

            <!-- 中：画布 -->
            <section class="canvas-stage">
              <div class="canvas-head">
                <span>画布</span>
                <div class="canvas-head__btns">
                  <button :class="{ active: canvasWidth === '375' }" @click="canvasWidth = '375'">375px</button>
                  <button :class="{ active: canvasWidth === 'auto' }" @click="canvasWidth = 'auto'">自适应</button>
                </div>
              </div>
              <div class="canvas-scroll">
                <div class="phone-frame" :style="{ width: canvasWidth === '375' ? '375px' : '100%' }">
                  <div class="phone-status" />
                  <div class="phone-appbar">
                    <span class="phone-back">‹</span>
                    <strong>设备详情</strong>
                    <span class="phone-more">⋯</span>
                  </div>
                  <div
                    class="phone-body"
                    @drop="onDrop"
                    @dragover="onDragOver"
                  >
                    <div v-if="canvasItems.length === 0" class="phone-empty">
                      <i class="i-ant-design-plus-circle-outlined" />
                      <p>拖入组件到此处</p>
                    </div>
                    <div
                      v-for="item in canvasItems"
                      :key="item.id"
                      class="canvas-item"
                      :class="{ selected: item.id === selectedCanvasId }"
                      @click.stop="selectCanvasItem(item.id)"
                    >
                      <div class="canvas-item__icon"><i :class="componentList.find(c => c.id === item.componentId)?.icon" /></div>
                      <div class="canvas-item__body">
                        <span class="canvas-item__title">{{ item.title }}</span>
                        <span class="canvas-item__value">{{ item.boundProperty || '未绑定' }}{{ item.unit ? ' ' + item.unit : '' }}</span>
                      </div>
                      <button class="canvas-item__del" @click.stop="removeCanvasItem(item.id)"><i class="i-ant-design-close-outlined" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- 右：属性面板 -->
            <aside class="prop-panel">
              <template v-if="selectedCanvasItem">
                <div class="rail-title">属性面板 · {{ selectedCanvasItem.name }}</div>
                <div class="prop-field">
                  <label>绑定属性</label>
                  <button class="prop-select" @click="showPropertyPicker = !showPropertyPicker">
                    {{ selectedCanvasItem.boundProperty || '选择属性' }}
                    <i class="i-ant-design-right-outlined" />
                  </button>
                  <Transition name="prop-drop">
                    <div v-if="showPropertyPicker" class="prop-dropdown">
                      <button v-for="p in propertyOptions" :key="p" class="prop-option" @click="selectProperty(p)">{{ p }}</button>
                    </div>
                  </Transition>
                </div>
                <div class="prop-field">
                  <label>显示标题</label>
                  <input v-model="selectedCanvasItem.title" class="prop-input" placeholder="标题" />
                </div>
                <div class="prop-field">
                  <label>单位</label>
                  <input v-model="selectedCanvasItem.unit" class="prop-input" placeholder="单位" />
                </div>
                <div class="prop-note">
                  <i class="i-ant-design-info-circle-outlined" />
                  拖入画布后，选择设备物模型属性，确认后会回填当前值。
                </div>
              </template>
              <div v-else class="prop-empty">
                <i class="i-ant-design-tool-outlined" />
                <p>请选择画布上的组件</p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ===== 产品详情内容 ===== -->
    <div v-if="!showEditor" class="pdt-content">

      <!-- 应用配置 -->
      <div class="pdt-panel">
        <div class="pdt-panel__head">
          <div>
            <strong>应用配置</strong>
            <span class="pdt-panel__sub">配置用户 App 中设备详情、应用管理与添加设备入口</span>
          </div>
        </div>
        <div class="pdt-config-grid">
          <button class="pdt-config-card pdt-config-card--primary" type="button" @click="openEditor">
            <span class="pdt-config-card__num">01</span>
            <strong>编辑 App</strong>
            <p>进入独立画布页面，配置设备详情页的组件布局、属性绑定和展示样式。</p>
          </button>
          <button class="pdt-config-card" type="button">
            <span class="pdt-config-card__num">02</span>
            <strong>管理 App</strong>
            <p>查看当前产品关联的应用，进入应用详情、下载二维码和基础设置。</p>
          </button>
          <button class="pdt-config-card" type="button">
            <span class="pdt-config-card__num">03</span>
            <strong>用户 App 添加设备</strong>
            <p>配置 C 端用户在 App 内扫码、搜索和绑定该产品设备时的引导规则。</p>
          </button>
        </div>
      </div>

      <!-- 关联设备（折叠） -->
      <div class="pdt-collapse" :class="{ expanded: expandedPanels.related }">
        <button class="pdt-collapse__head" type="button" @click="togglePanel('related')">
          <i :class="expandedPanels.related ? 'i-ant-design-down-outlined' : 'i-ant-design-right-outlined'" class="pdt-collapse__arrow" />
          <strong>关联设备</strong>
          <span class="pdt-collapse__sub">默认展示当前产品下的全部设备，仅做只读展示</span>
        </button>
        <Transition name="collapse">
          <div v-if="expandedPanels.related" class="pdt-collapse__body">
            <table class="pdt-mini-table">
              <thead>
                <tr><th>设备名称</th><th>设备 ID</th><th>设备分组</th><th>状态</th></tr>
              </thead>
              <tbody>
                <tr v-for="dev in relatedDevices" :key="dev.id">
                  <td><strong>{{ dev.name }}</strong></td>
                  <td><code class="pdt-code">{{ dev.sn }}</code></td>
                  <td>{{ dev.area }} / {{ dev.business }}</td>
                  <td>
                    <span class="pdt-status" :class="statusConfig[dev.status].class">
                      <i class="pdt-status__dot" />{{ statusConfig[dev.status].label }}
                    </span>
                  </td>
                </tr>
                <tr v-if="relatedDevices.length === 0">
                  <td colspan="4" class="pdt-empty-cell">该产品暂无关联设备</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Transition>
      </div>

      <!-- 模板适配信息 -->
      <div class="pdt-panel">
        <div class="pdt-panel__head"><strong>模板适配信息</strong></div>
        <div class="pdt-template-row">
          <div class="pdt-template-item">
            <span class="pdt-template-label">认证方式</span>
            <strong class="pdt-template-value">{{ product.authMethod }}</strong>
          </div>
          <div class="pdt-template-item">
            <span class="pdt-template-label">当前版本</span>
            <strong class="pdt-template-value">{{ product.version }}</strong>
            <span class="pdt-template-sub">发布时间：{{ product.publishDate }}</span>
          </div>
          <div class="pdt-template-item">
            <span class="pdt-template-label">引用项目</span>
            <strong class="pdt-template-value">{{ product.refProjectCount }} 个项目</strong>
            <span class="pdt-template-sub">近 30 天新增 0 个项目</span>
          </div>
        </div>
      </div>

      <!-- 设备能力 -->
      <div class="pdt-panel">
        <div class="pdt-panel__head"><strong>设备能力</strong></div>
        <div class="pdt-ability-row">
          <div class="pdt-ability">
            <h4><i class="i-ant-design-eye-outlined" /> 实时监测 <small>{{ product.monitorProps.length }} 项属性</small></h4>
            <p>{{ product.monitorProps.join('、') }}</p>
          </div>
          <div class="pdt-ability">
            <h4><i class="i-ant-design-bell-outlined" /> 可触发的告警 <small>{{ product.alertEvents.length }} 类事件</small></h4>
            <p>{{ product.alertEvents.join('、') }}</p>
          </div>
          <div class="pdt-ability">
            <h4><i class="i-ant-design-control-outlined" /> 远程控制 <small>{{ product.remoteControls.length }} 类指令</small></h4>
            <p>{{ product.remoteControls.join(' · ') }}</p>
          </div>
        </div>
      </div>

      <!-- 完整物模型（折叠，默认展开） -->
      <div class="pdt-collapse" :class="{ expanded: expandedPanels.model }">
        <button class="pdt-collapse__head" type="button" @click="togglePanel('model')">
          <i :class="expandedPanels.model ? 'i-ant-design-down-outlined' : 'i-ant-design-right-outlined'" class="pdt-collapse__arrow" />
          <strong>查看完整物模型</strong>
          <span class="pdt-collapse__sub">属性 {{ thingModelProps.length }} · 事件 {{ thingModelEvents.length }} · 功能 {{ thingModelFunctions.length }} · 标签 0</span>
        </button>
        <Transition name="collapse">
          <div v-if="expandedPanels.model" class="pdt-collapse__body">
            <div class="pdt-model-tabs">
              <button v-for="(label, key) in modelTabLabels" :key="key" :class="{ active: modelTab === key }" @click="modelTab = key as any">{{ label }}</button>
            </div>
            <table class="pdt-mini-table">
              <thead>
                <tr><th>名称</th><th>数据类型</th><th>读写类型</th><th>单位</th><th>来源</th><th>配置</th></tr>
              </thead>
              <tbody>
                <tr v-for="item in modelData" :key="item.id">
                  <td><strong>{{ item.name }}</strong><br /><code class="pdt-code">{{ item.id }}</code></td>
                  <td>{{ item.dataType }}</td>
                  <td>{{ item.accessMode }}</td>
                  <td>{{ item.unit }}</td>
                  <td>{{ item.source }}</td>
                  <td><button class="pdt-config-link">查看配置</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </Transition>
      </div>

      <!-- 健康判定规则（折叠） -->
      <div class="pdt-collapse" :class="{ expanded: expandedPanels.health }">
        <button class="pdt-collapse__head" type="button" @click="togglePanel('health')">
          <i :class="expandedPanels.health ? 'i-ant-design-down-outlined' : 'i-ant-design-right-outlined'" class="pdt-collapse__arrow" />
          <strong>健康判定规则</strong>
          <span class="pdt-collapse__sub">用于判断设备连接质量和告警风险</span>
        </button>
        <Transition name="collapse">
          <div v-if="expandedPanels.health" class="pdt-collapse__body">
            <div v-for="(rule, i) in healthRules" :key="i" class="pdt-rule-row">
              <span class="pdt-rule-level" :class="rule.level === '紧急' ? 'lv-urgent' : 'lv-watch'">{{ rule.level }}</span>
              <div>
                <strong>{{ rule.name }}</strong>
                <p>{{ rule.desc }}</p>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- 版本记录（折叠） -->
      <div class="pdt-collapse" :class="{ expanded: expandedPanels.version }">
        <button class="pdt-collapse__head" type="button" @click="togglePanel('version')">
          <i :class="expandedPanels.version ? 'i-ant-design-down-outlined' : 'i-ant-design-right-outlined'" class="pdt-collapse__arrow" />
          <strong>版本记录</strong>
          <span class="pdt-collapse__sub">{{ versionRecords.length }} 条版本记录</span>
        </button>
        <Transition name="collapse">
          <div v-if="expandedPanels.version" class="pdt-collapse__body">
            <div v-for="(ver, i) in versionRecords" :key="i" class="pdt-ver-row">
              <strong>{{ ver.version }}</strong>
              <span class="pdt-ver-date">{{ ver.date }}</span>
              <p>{{ ver.desc }}</p>
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.pdt-page {
  height: 100%; padding: 8px; display: flex; flex-direction: column; gap: 8px; overflow-y: auto;
  scrollbar-width: none; -ms-overflow-style: none; &::-webkit-scrollbar { display: none; }
}

.pdt-content { display: flex; flex-direction: column; gap: 12px; }

/* ===== 产品头 ===== */
.pdt-hero { display: flex; gap: 16px; background: #fff; border-radius: 14px; padding: 20px 24px; flex-shrink: 0; }
.pdt-hero__back {
  display: flex; align-items: center; gap: 4px; height: 32px; padding: 0 12px; margin-left: auto; flex-shrink: 0;
  border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary;
  font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s; align-self: flex-start;
  &:hover { border-color: $color-primary; color: $color-primary; } i { font-size: 14px; }
}
.pdt-hero__logo { width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg, $color-primary-bg 0%, #f0edff 100%); color: $color-primary; display: flex; align-items: center; justify-content: center; font-size: 28px; flex-shrink: 0; }
.pdt-hero__main { flex: 1; min-width: 0; h2 { margin: 0 0 8px; font-size: 20px; font-weight: 600; color: $text-base; } }
.pdt-hero__meta { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 10px; font-size: 13px; color: $text-secondary;
  span { display: flex; align-items: center; gap: 4px; } strong { color: $text-base; }
}
.pdt-hero__tags { display: flex; gap: 6px; margin-bottom: 10px; }
.pdt-tag { font-size: 11px; color: $text-tertiary; background: $bg-page; padding: 2px 10px; border-radius: 9999px; em { font-style: normal; color: $color-primary; font-weight: 500; } }
.pdt-hero__desc { margin: 0; font-size: 13px; line-height: 1.7; color: $text-secondary; }

/* ===== Panel ===== */
.pdt-panel { background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid $border-color-card;
  &__head { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; border-bottom: 1px solid $border-color-card; background: $bg-page;
    strong { font-size: 15px; font-weight: 600; color: $text-base; display: flex; align-items: center; gap: 6px; &::before { content: ''; width: 3px; height: 14px; background: $color-primary; border-radius: 2px; } }
  }
  &__sub { font-size: 12px; color: $text-muted; margin-left: 8px; font-weight: 400; }
}

/* ===== 应用配置卡片 ===== */
.pdt-config-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 14px 16px; }
.pdt-config-card {
  display: flex; flex-direction: column; gap: 6px; padding: 16px; border: 1px solid $border-color-card;
  border-radius: 12px; background: #fff; cursor: pointer; font-family: inherit; transition: all 0.15s; text-align: left;
  &:hover { border-color: $color-primary; box-shadow: 0 2px 12px rgba(110,75,255,0.08); }
  &--primary { border-color: $color-primary; background: linear-gradient(135deg, $color-primary-bg 0%, #fff 100%);
    &:hover { box-shadow: 0 4px 16px rgba(110,75,255,0.12); }
  }
  &__num { font-size: 20px; font-weight: 800; color: $color-primary; opacity: 0.3; }
  strong { font-size: 15px; font-weight: 600; color: $text-base; }
  p { margin: 0; font-size: 12px; line-height: 1.6; color: $text-muted; }
}

/* ===== 折叠面板 ===== */
.pdt-collapse { background: #fff; border-radius: 12px; overflow: hidden; border: 1px solid $border-color-card;
  &.expanded { box-shadow: 0 1px 3px rgba(20,23,31,0.06); }
  &__head {
    display: flex; align-items: center; gap: 8px; width: 100%; padding: 14px 16px;
    border: none; background: $bg-page; cursor: pointer; font-family: inherit; border-bottom: 1px solid transparent;
  }
  &.expanded &__head { border-bottom-color: $border-color-card; }
  &__head strong { font-size: 15px; font-weight: 600; color: $text-base; display: flex; align-items: center; gap: 6px; &::before { content: ''; width: 3px; height: 14px; background: $color-primary; border-radius: 2px; } }
  &__arrow { font-size: 13px; color: $text-muted; transition: transform 0.2s; }
  &__sub { font-size: 12px; color: $text-muted; margin-left: 4px; font-weight: 400; }
  &__body { padding: 12px 16px 14px; }
}

.collapse-enter-active, .collapse-leave-active { transition: all 0.25s ease; overflow: hidden; }
.collapse-enter-from, .collapse-leave-to { opacity: 0; max-height: 0; }

/* ===== 关联设备表格 ===== */
.pdt-mini-table { width: 100%; border-collapse: collapse; font-size: 13px;
  th { padding: 8px 12px; text-align: left; font-weight: 600; font-size: 12px; color: $text-secondary; background: $bg-page; border-bottom: 1px solid $border-color-card; }
  td { padding: 8px 12px; border-bottom: 1px solid $border-color-card; color: $text-secondary; }
  tr:last-child td { border: none; }
}
.pdt-code { font-family: 'Courier New', monospace; font-size: 11px; color: $text-muted; }
.pdt-status { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 2px 8px; border-radius: 3px;
  &__dot { width: 6px; height: 6px; border-radius: 50%; }
}
.st-online { background: rgba(43,179,163,0.1); color: $color-online; .pdt-status__dot { background: $color-online; } }
.st-offline { background: rgba(154,161,171,0.12); color: $text-tertiary; .pdt-status__dot { background: #bfbfbf; } }
.st-alert { background: rgba(255,77,79,0.1); color: #ff4d4f; .pdt-status__dot { background: #ff4d4f; } }
.st-silent { background: rgba(250,173,20,0.12); color: #d48806; .pdt-status__dot { background: #faad14; } }
.st-disabled { background: rgba(0,0,0,0.06); color: $text-muted; .pdt-status__dot { background: #bfbfbf; } }
.pdt-empty-cell { text-align: center; color: $text-muted; padding: 24px; }

/* ===== 模板适配 ===== */
.pdt-template-row { display: flex; gap: 0; padding: 14px 16px; }
.pdt-template-item { flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 0 16px; border-right: 1px solid $border-color-card;
  &:first-child { padding-left: 0; } &:last-child { border-right: none; padding-right: 0; }
}
.pdt-template-label { font-size: 12px; color: $text-muted; }
.pdt-template-value { font-size: 15px; font-weight: 600; color: $text-base; }
.pdt-template-sub { font-size: 11px; color: $text-muted; }

/* ===== 设备能力 ===== */
.pdt-ability-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 14px 16px; }
.pdt-ability { border: 1px solid $border-color-card; border-radius: 10px; padding: 14px;
  h4 { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; font-size: 14px; font-weight: 600; color: $text-base;
    i { color: $color-primary; font-size: 16px; }
    small { font-weight: 400; font-size: 12px; color: $text-muted; }
  }
  p { margin: 0; font-size: 13px; color: $text-secondary; line-height: 1.6; }
}

/* ===== 物模型 tab ===== */
.pdt-model-tabs { display: flex; gap: 4px; margin-bottom: 10px;
  button { padding: 5px 14px; border: 1px solid $border-color-card; border-radius: 6px; background: #fff; font-size: 13px; color: $text-secondary; cursor: pointer; font-family: inherit;
    &.active { border-color: $color-primary; background: $color-primary-bg; color: $color-primary; font-weight: 500; }
  }
}
.pdt-config-link { border: none; background: transparent; color: $color-primary; font-size: 12px; cursor: pointer; font-family: inherit; &:hover { opacity: 0.7; } }

/* ===== 健康规则 ===== */
.pdt-rule-row { display: flex; align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px solid $border-color-card;
  &:last-child { border: none; }
  strong { font-size: 13px; font-weight: 600; color: $text-base; }
  p { margin: 2px 0 0; font-size: 12px; color: $text-muted; }
}
.pdt-rule-level { font-size: 11px; padding: 2px 8px; border-radius: 3px; flex-shrink: 0; font-weight: 500; }
.lv-urgent { background: rgba(255,77,79,0.1); color: #ff4d4f; }
.lv-watch { background: rgba(250,173,20,0.12); color: #d48806; }

/* ===== 版本记录 ===== */
.pdt-ver-row { display: flex; align-items: baseline; gap: 10px; padding: 10px 0; border-bottom: 1px solid $border-color-card; flex-wrap: wrap;
  &:last-child { border: none; }
  strong { font-size: 14px; font-weight: 600; color: $color-primary; }
  p { margin: 0; font-size: 13px; color: $text-secondary; flex: 1; min-width: 200px; }
}
.pdt-ver-date { font-size: 12px; color: $text-muted; }

/* ===== App 编辑器画布 ===== */
.editor-overlay { position: fixed; inset: 0; z-index: 1000; background: #f5f6f8; }
.editor-shell { height: 100%; display: flex; flex-direction: column; }

.editor-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; background: #fff; border-bottom: 1px solid $border-color-card; flex-shrink: 0;
  &__info { h2 { margin: 0; font-size: 16px; font-weight: 600; color: $text-base; } p { margin: 0; font-size: 12px; color: $text-muted; } }
  &__actions { display: flex; gap: 8px; }
}
.ed-btn { display: inline-flex; align-items: center; gap: 4px; height: 32px; padding: 0 14px; border-radius: 6px; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s; i { font-size: 14px; }
  &--ghost { border: 1px solid $border-color-light; background: #fff; color: $text-secondary; &:hover { border-color: $color-primary; color: $color-primary; } }
  &--primary { border: 1px solid $color-primary; background: $color-primary; color: #fff; &:hover { background: $color-primary-hover; } }
}

.editor-workbench { flex: 1; display: grid; grid-template-columns: 220px 1fr 280px; overflow: hidden; }

/* 组件栏 */
.comp-rail { border-right: 1px solid $border-color-card; background: #fff; padding: 12px; overflow-y: auto; }
.rail-title { font-size: 13px; font-weight: 600; color: $text-base; margin-bottom: 10px; }
.comp-tile { display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid $border-color-card; border-radius: 8px; margin-bottom: 6px; cursor: grab; transition: all 0.15s; background: #fff;
  &:hover { border-color: rgba(110,75,255,0.4); background: #faf9ff; }
  &.disabled { opacity: 0.4; cursor: not-allowed; &:hover { border-color: $border-color-card; background: #fff; } }
  &__icon { width: 32px; height: 32px; border-radius: 8px; background: $color-primary-bg; color: $color-primary; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
  &__info { display: flex; flex-direction: column; }
  &__name { font-size: 13px; font-weight: 500; color: $text-base; }
  &__desc { font-size: 11px; color: $text-muted; }
}

/* 画布 */
.canvas-stage { display: flex; flex-direction: column; overflow: hidden; background: #f5f6f8; }
.canvas-head { display: flex; align-items: center; justify-content: space-between; padding: 10px 20px; flex-shrink: 0;
  span { font-size: 14px; font-weight: 600; color: $text-base; }
  &__btns { display: flex; gap: 4px;
    button { height: 26px; padding: 0 10px; border: 1px solid $border-color-light; border-radius: 6px; background: #fff; font-size: 12px; color: $text-secondary; cursor: pointer; font-family: inherit;
      &.active { border-color: $color-primary; color: $color-primary; background: $color-primary-bg; }
    }
  }
}
.canvas-scroll { flex: 1; overflow-y: auto; display: flex; justify-content: center; padding: 20px; }
.phone-frame { background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); overflow: hidden; min-height: 500px; max-width: 100%; }
.phone-status { height: 24px; background: #fff; display: flex; align-items: center; padding: 0 16px; font-size: 10px; color: $text-muted; }
.phone-appbar { height: 44px; background: #fff; border-bottom: 1px solid #f4f5f7; display: flex; align-items: center; justify-content: space-between; padding: 0 16px;
  strong { font-size: 15px; color: $text-base; }
  .phone-back, .phone-more { font-size: 18px; color: $text-secondary; cursor: pointer; }
}
.phone-body { min-height: 400px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.phone-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 300px; color: $text-muted; i { font-size: 40px; opacity: 0.3; } p { font-size: 13px; margin: 0; } }
.canvas-item { display: flex; align-items: center; gap: 10px; padding: 12px; border: 2px solid transparent; border-radius: 10px; background: $bg-page; cursor: pointer; transition: all 0.15s;
  &:hover { border-color: rgba(110,75,255,0.3); }
  &.selected { border-color: $color-primary; background: $color-primary-bg; }
  &__icon { width: 36px; height: 36px; border-radius: 8px; background: $color-primary; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
  &__body { flex: 1; display: flex; flex-direction: column; }
  &__title { font-size: 14px; font-weight: 600; color: $text-base; }
  &__value { font-size: 18px; font-weight: 700; color: $color-primary; }
  &__del { width: 24px; height: 24px; border: none; background: transparent; color: $text-muted; cursor: pointer; border-radius: 4px; display: flex; align-items: center; justify-content: center;
    &:hover { color: #ff4d4f; background: rgba(255,77,79,0.08); } i { font-size: 12px; }
  }
}

/* 属性面板 */
.prop-panel { border-left: 1px solid $border-color-card; background: #fff; padding: 12px; overflow-y: auto; }
.prop-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 200px; color: $text-muted; i { font-size: 32px; opacity: 0.3; } p { font-size: 13px; margin: 0; } }
.prop-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; position: relative;
  label { font-size: 13px; font-weight: 500; color: $text-base; }
}
.prop-select { display: flex; align-items: center; justify-content: space-between; height: 34px; padding: 0 12px; border: 1px solid $border-color-light; border-radius: 8px; background: #fff; font-size: 13px; color: $text-secondary; cursor: pointer; font-family: inherit;
  &:hover { border-color: $color-primary; } i { font-size: 13px; color: $text-muted; }
}
.prop-input { height: 34px; padding: 0 12px; border: 1px solid $border-color-light; border-radius: 8px; font-size: 13px; color: $text-base; font-family: inherit;
  &:focus { outline: none; border-color: $color-primary; }
}
.prop-dropdown { position: absolute; top: 100%; left: 0; right: 0; margin-top: 4px; background: #fff; border: 1px solid $border-color-light; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); z-index: 10; overflow: hidden; }
.prop-option { display: block; width: 100%; padding: 8px 12px; border: none; background: transparent; font-size: 13px; color: $text-secondary; cursor: pointer; font-family: inherit; text-align: left;
  &:hover { background: $color-primary-bg; color: $color-primary; }
}
.prop-note { display: flex; align-items: flex-start; gap: 6px; padding: 10px 12px; background: $bg-page; border-radius: 8px; font-size: 12px; color: $text-muted; line-height: 1.5; margin-top: 8px; i { font-size: 14px; color: $color-primary; flex-shrink: 0; margin-top: 1px; } }

.prop-drop-enter-active, .prop-drop-leave-active { transition: all 0.2s; }
.prop-drop-enter-from, .prop-drop-leave-to { opacity: 0; transform: translateY(-4px); }

/* 编辑器过渡 */
.editor-fade-enter-active, .editor-fade-leave-active { transition: opacity 0.25s; }
.editor-fade-enter-from, .editor-fade-leave-to { opacity: 0; }
</style>
