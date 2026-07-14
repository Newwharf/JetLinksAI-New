<script setup lang="ts">
/**
 * 设备告警规则
 * 搜索栏 + 告警列表（更多气泡操作：编辑/删除）
 */
import { message } from 'ant-design-vue'
import {
  alarmRules, alarmLevelConfig, alarmNotifyConfig,
  type AlarmRule, type AlarmLevel, type AlarmNotifyStatus
} from './mock'

const searchKey = ref('')
const pageSize = ref(10)
const currentPage = ref(1)

const filteredRules = computed(() => {
  const kw = searchKey.value.trim().toLowerCase()
  if (!kw) return alarmRules.value
  return alarmRules.value.filter(r =>
    r.name.toLowerCase().includes(kw) || r.product.toLowerCase().includes(kw) ||
    r.device.toLowerCase().includes(kw) || r.property.toLowerCase().includes(kw)
  )
})

const pagedRules = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredRules.value.slice(start, start + pageSize.value)
})

watch([searchKey, pageSize], () => { currentPage.value = 1 })

// ===== 行操作：更多气泡 =====
const openMenuId = ref<string | null>(null)
function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id
}
function closeMenu() { openMenuId.value = null }

function deleteRule(rule: AlarmRule) {
  closeMenu()
  const idx = alarmRules.value.findIndex(r => r.id === rule.id)
  if (idx >= 0) { alarmRules.value.splice(idx, 1); message.success(`已删除「${rule.name}」`) }
}

// ===== 编辑弹窗 =====
const editModalVisible = ref(false)
const editingRule = ref<AlarmRule | null>(null)
const editForm = ref({
  name: '', product: '', device: '', property: '',
  trigger: '', level: '一般' as AlarmLevel, notifyStatus: 'none' as AlarmNotifyStatus
})

const levelOptions: AlarmLevel[] = ['超紧急', '紧急', '严重', '一般', '提醒']
const notifyOptions: { value: AlarmNotifyStatus; label: string }[] = [
  { value: 'none', label: '未配置' },
  { value: 'disabled', label: '未启用' },
  { value: 'enabled', label: '已启用' }
]

// 产品/设备/属性 下拉选项（从现有告警规则中收集去重）
const productOptions = computed(() => [...new Set(alarmRules.value.map(r => r.product))])
const deviceOptions = computed(() => [...new Set(alarmRules.value.map(r => r.device))])
const propertyOptions = computed(() => [...new Set(alarmRules.value.map(r => r.property))])

function openEditModal(rule: AlarmRule) {
  closeMenu()
  editingRule.value = rule
  editForm.value = {
    name: rule.name, product: rule.product, device: rule.device, property: rule.property,
    trigger: rule.trigger, level: rule.level, notifyStatus: rule.notifyStatus
  }
  editModalVisible.value = true
}
function saveEdit() {
  if (!editingRule.value) return
  if (!editForm.value.name.trim()) { message.warning('请输入告警名称'); return }
  const rule = editingRule.value
  rule.name = editForm.value.name
  rule.product = editForm.value.product
  rule.device = editForm.value.device
  rule.property = editForm.value.property
  rule.trigger = editForm.value.trigger
  rule.level = editForm.value.level
  rule.notifyStatus = editForm.value.notifyStatus
  editModalVisible.value = false
  message.success('告警规则已更新')
}
</script>

<template>
  <div class="al-page" @click="closeMenu">
    <!-- 工具栏 -->
    <div class="al-toolbar">
      <a-input v-model:value="searchKey" class="al-search" placeholder="搜索告警名称、产品、设备、属性" allow-clear>
        <template #prefix><i class="i-ant-design-search-outlined" /></template>
      </a-input>
      <div class="al-toolbar__right">
        <span class="al-total">共 {{ filteredRules.length }} 条</span>
      </div>
    </div>

    <!-- 表格 -->
    <div class="al-table-wrap">
      <table class="al-table">
        <thead>
          <tr>
            <th>告警名称</th><th>产品</th><th>设备</th><th>属性</th>
            <th>触发条件</th><th>告警级别</th><th>通知配置</th><th class="col-ops"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rule in pagedRules" :key="rule.id">
            <td>
              <div class="al-rule-name">
                <i class="i-ant-design-bell-outlined" />
                <span>{{ rule.name }}</span>
              </div>
            </td>
            <td>{{ rule.product }}</td>
            <td>{{ rule.device }}</td>
            <td>{{ rule.property }}</td>
            <td><code class="al-trigger">{{ rule.trigger }}</code></td>
            <td><span class="al-level" :class="alarmLevelConfig[rule.level].class">{{ alarmLevelConfig[rule.level].label }}</span></td>
            <td><span class="al-notify" :class="alarmNotifyConfig[rule.notifyStatus].class">
              <i v-if="rule.notifyStatus === 'enabled'" class="i-ant-design-check-circle-filled" />
              <i v-else-if="rule.notifyStatus === 'disabled'" class="i-ant-design-pause-circle-outlined" />
              <i v-else class="i-ant-design-info-circle-outlined" />
              {{ alarmNotifyConfig[rule.notifyStatus].label }}
            </span></td>
            <td class="col-ops" @click.stop>
              <div class="al-more-wrap">
                <button class="al-more-btn" type="button" @click="toggleMenu(rule.id)"><i class="i-ant-design-ellipsis-outlined" /></button>
                <Transition name="pop">
                  <div v-if="openMenuId === rule.id" class="al-pop-menu">
                    <button type="button" @click="openEditModal(rule)"><i class="i-ant-design-edit-outlined" />编辑</button>
                    <button type="button" class="al-pop-danger" @click="deleteRule(rule)"><i class="i-ant-design-delete-outlined" />删除</button>
                  </div>
                </Transition>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredRules.length === 0" class="al-empty">
        <i class="i-ant-design-bell-outlined al-empty__icon" />
        <p>{{ searchKey ? '没有找到匹配的告警规则' : '暂无告警规则' }}</p>
      </div>
    </div>

    <!-- 分页 -->
    <div class="al-pagination">
      <span class="al-pagination__total">共 {{ filteredRules.length }} 条</span>
      <div class="al-pagination__right">
        <select v-model="pageSize" class="al-page-size"><option :value="10">10 条/页</option><option :value="20">20 条/页</option><option :value="50">50 条/页</option></select>
        <button class="al-page-btn" :disabled="currentPage <= 1" @click="currentPage--"><i class="i-ant-design-left-outlined" /></button>
        <span class="al-page-num">{{ currentPage }} / {{ Math.ceil(filteredRules.length / pageSize) || 1 }}</span>
        <button class="al-page-btn" :disabled="currentPage >= Math.ceil(filteredRules.length / pageSize)" @click="currentPage++"><i class="i-ant-design-right-outlined" /></button>
      </div>
    </div>

    <!-- ===== 编辑弹窗 ===== -->
    <a-modal v-model:open="editModalVisible" title="编辑告警规则" :width="520" :footer="null" centered>
      <div class="modal-form">
        <div class="modal-field"><label>告警名称 <em>*</em></label><a-input v-model:value="editForm.name" placeholder="请输入告警名称" /></div>
        <div class="modal-row">
          <div class="modal-field"><label>产品</label>
            <a-select v-model:value="editForm.product" style="width: 100%" placeholder="请选择产品" show-search allow-clear>
              <a-select-option v-for="p in productOptions" :key="p" :value="p">{{ p }}</a-select-option>
            </a-select>
          </div>
          <div class="modal-field"><label>设备</label>
            <a-select v-model:value="editForm.device" style="width: 100%" placeholder="请选择设备" show-search allow-clear>
              <a-select-option v-for="d in deviceOptions" :key="d" :value="d">{{ d }}</a-select-option>
            </a-select>
          </div>
        </div>
        <div class="modal-field"><label>属性</label>
          <a-select v-model:value="editForm.property" style="width: 100%" placeholder="请选择属性" show-search allow-clear>
            <a-select-option v-for="p in propertyOptions" :key="p" :value="p">{{ p }}</a-select-option>
          </a-select>
        </div>
        <div class="modal-field"><label>触发条件</label><a-input v-model:value="editForm.trigger" placeholder="如：温度不在[10, 30]之间" /></div>
        <div class="modal-row">
          <div class="modal-field"><label>告警级别</label>
            <a-select v-model:value="editForm.level" style="width: 100%">
              <a-select-option v-for="lv in levelOptions" :key="lv" :value="lv">{{ lv }}</a-select-option>
            </a-select>
          </div>
          <div class="modal-field"><label>通知配置</label>
            <a-select v-model:value="editForm.notifyStatus" style="width: 100%">
              <a-select-option v-for="n in notifyOptions" :key="n.value" :value="n.value">{{ n.label }}</a-select-option>
            </a-select>
          </div>
        </div>
        <div class="modal-actions"><button class="al-modal-btn al-modal-btn--default" @click="editModalVisible = false">取消</button><button class="al-modal-btn al-modal-btn--primary" @click="saveEdit">保存</button></div>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.al-page { height: 100%; padding: 8px; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }

/* 工具栏 */
.al-toolbar { display: flex; align-items: center; gap: 12px; flex-shrink: 0; &__right { display: flex; align-items: center; gap: 12px; margin-left: auto; } }
.al-search { width: 380px; }
.al-total { font-size: 13px; color: $text-tertiary; }

/* 表格 */
.al-table-wrap { flex: 1; overflow: auto; background: #fff; border-radius: 12px; overflow: hidden; scrollbar-width: none; -ms-overflow-style: none; &::-webkit-scrollbar { display: none; } }
.al-table { width: 100%; border-collapse: collapse; font-size: 13px;
  thead th { padding: 12px 12px; text-align: left; font-weight: 600; font-size: 12px; color: $text-secondary; background: $bg-page; border-bottom: 1px solid $border-color-card; white-space: nowrap; position: sticky; top: 0; z-index: 1; }
  tbody td { padding: 16px 12px; border-bottom: 1px solid $border-color-card; color: $text-secondary; vertical-align: middle; }
  tbody tr { transition: background 0.15s; &:hover { background: #faf9ff; } }
  .col-ops { width: 48px; text-align: center; } }

/* 告警名称 */
.al-rule-name { display: flex; align-items: center; gap: 8px; color: $text-base; font-weight: 600; font-size: 14px; i { font-size: 16px; color: $color-primary; } }

/* 触发条件 */
.al-trigger { font-family: 'Courier New', monospace; font-size: 12px; color: $text-secondary; background: $bg-page; padding: 2px 8px; border-radius: 4px; }

/* 告警级别标签 */
.al-level { display: inline-flex; align-items: center; font-size: 12px; font-weight: 500; padding: 3px 10px; border-radius: 4px; white-space: nowrap; }
.alarm-critical { background: rgba(255,40,40,0.1); color: #ff2828; }
.alarm-urgent { background: rgba(255,77,79,0.1); color: #ff4d4f; }
.alarm-serious { background: rgba(250,173,20,0.12); color: #d48806; }
.alarm-general { background: rgba(24,144,255,0.1); color: #1890ff; }
.alarm-notice { background: rgba(154,161,171,0.12); color: $text-tertiary; }

/* 通知配置标签 */
.al-notify { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; padding: 3px 10px; border-radius: 4px; white-space: nowrap; i { font-size: 13px; } }
.notify-enabled { background: rgba(43,179,163,0.1); color: $color-online; }
.notify-disabled { background: rgba(250,173,20,0.12); color: #d48806; }
.notify-none { background: rgba(0,0,0,0.06); color: $text-muted; }

/* 更多气泡 */
.al-more-wrap { position: relative; display: inline-flex; }
.al-more-btn { width: 32px; height: 32px; border: 1px solid $border-color-card; border-radius: 8px; background: #fff; color: $text-tertiary; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  &:hover { border-color: $color-primary; color: $color-primary; } i { font-size: 16px; } }
.al-pop-menu { position: absolute; top: 36px; right: 0; z-index: 20; background: #fff; border: 1px solid $border-color-card; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; min-width: 120px;
  button { display: flex; align-items: center; gap: 6px; width: 100%; padding: 9px 14px; border: none; background: transparent; font-size: 13px; color: $text-secondary; cursor: pointer; font-family: inherit; text-align: left; transition: all 0.1s;
    i { font-size: 14px; } &:hover { background: $color-primary-bg; color: $color-primary; } }
  .al-pop-danger { color: #ff4d4f; &:hover { background: rgba(255,77,79,0.08); color: #ff4d4f; } } }

.pop-enter-active, .pop-leave-active { transition: all 0.15s; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(-6px); }

/* 空状态 */
.al-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 80px 20px; color: $text-muted; &__icon { font-size: 48px; opacity: 0.3; } p { font-size: 14px; margin: 0; } }

/* 分页 */
.al-pagination { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; padding: 8px 4px; &__total { font-size: 12px; color: $text-muted; } &__right { display: flex; align-items: center; gap: 8px; } }
.al-page-size { height: 28px; padding: 0 8px; border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary; font-size: 12px; font-family: inherit; cursor: pointer; &:focus { outline: none; border-color: $color-primary; } }
.al-page-btn { width: 28px; height: 28px; border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; &:hover:not(:disabled) { border-color: $color-primary; color: $color-primary; } &:disabled { opacity: 0.4; cursor: not-allowed; } i { font-size: 14px; } }
.al-page-num { font-size: 13px; color: $text-secondary; min-width: 56px; text-align: center; }

/* 弹窗表单 */
.modal-form { display: flex; flex-direction: column; gap: 16px; padding: 8px 0; }
.modal-row { display: flex; gap: 16px; .modal-field { flex: 1; min-width: 0; } }
.modal-field { display: flex; flex-direction: column; gap: 6px; label { font-size: 13px; font-weight: 500; color: $text-base; em { color: #ff4d4f; font-style: normal; } } }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.al-modal-btn { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 16px; border-radius: 6px; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s;
  &--default { border: 1px solid $border-color-light; background: #fff; color: $text-secondary; &:hover { border-color: $color-primary; color: $color-primary; } }
  &--primary { border: 1px solid $color-primary; background: $color-primary; color: #fff; &:hover { background: $color-primary-hover; } } }
</style>
