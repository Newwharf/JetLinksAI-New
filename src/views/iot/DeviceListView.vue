<script setup lang="ts">
/**
 * 设备列表
 * 行高加大(显示图标) + 更多气泡操作 + 新增设备(左右结构+图标上传)
 */
import { message } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { useAppStore, type GuideStep } from '@/stores/app'
import serviceQrImg from '@/assets/iot/erweima.png'
import iotGuideStep1 from '@/assets/alarmGuide/wulianyindao/iot1.svg'
import iotGuideStep2 from '@/assets/alarmGuide/wulianyindao/iot2.svg'
import iotGuideStep5 from '@/assets/alarmGuide/wulianyindao/iot3.svg'
import iotGuideStep6 from '@/assets/alarmGuide/wulianyindao/iot4.svg'
import {
  devices, statusConfig, deviceIconColors, healthScoreColor,
  deviceTemplateCategories,
  type IotDevice, type DeviceTemplate
} from './mock'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

const searchKey = ref('')
const pageSize = ref(10)
const currentPage = ref(1)
const createDeviceGuideOpen = ref(false)
const createDeviceGuideNext = ref<'video' | 'done'>('done')
const createDeviceGuideStep = ref(2)
const createDeviceGuideTotal = ref(2)
const createDeviceGuideStepText = computed(() => `${createDeviceGuideStep.value}/${createDeviceGuideTotal.value}`)

const filteredDevices = computed(() => {
  const kw = searchKey.value.trim().toLowerCase()
  if (!kw) return devices.value
  return devices.value.filter(d =>
    d.name.toLowerCase().includes(kw) || d.product.toLowerCase().includes(kw) ||
    d.vendor.toLowerCase().includes(kw) || d.area.toLowerCase().includes(kw) ||
    d.business.toLowerCase().includes(kw)
  )
})

const pagedDevices = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredDevices.value.slice(start, start + pageSize.value)
})

watch([searchKey, pageSize], () => { currentPage.value = 1 })

const selectedIds = ref<Set<string>>(new Set())
function toggleSelect(id: string) {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else selectedIds.value.add(id)
}
function toggleSelectAll() {
  if (selectedIds.value.size === pagedDevices.value.length) selectedIds.value.clear()
  else selectedIds.value = new Set(pagedDevices.value.map(d => d.id))
}
const allSelected = computed(() => pagedDevices.value.length > 0 && selectedIds.value.size === pagedDevices.value.length)

function gotoDetail(dev: IotDevice) { router.push(`/iot/device/${dev.id}`) }

function iconColor(id: string) {
  const idx = id.charCodeAt(id.length - 1) % deviceIconColors.length
  return deviceIconColors[idx]
}

// 完整区域路径
const areaToPath: Record<string, string> = {
  '研发部办公区': '智谷园区 / E栋 / 4F / 研发部办公区',
  '项目部办公区': '智谷园区 / E栋 / 4F / 项目部办公区',
  '会议室': '智谷园区 / E栋 / 4F / 会议室',
  '大厅': '智谷园区 / E栋 / 2F / 大厅',
  '走廊': '智谷园区 / E栋 / 2F / 走廊',
  '运营办公室': '智谷园区 / A栋 / 1F / 运营办公室',
  '前台': '智谷园区 / A栋 / 1F / 前台',
  '仓库': '智谷园区 / A栋 / B1 / 仓库',
  '水泵房': '智谷园区 / A栋 / B1 / 水泵房',
  '前门': '智谷园区 / 室外区域 / 大门',
  '厂界': '智谷园区 / 室外区域 / 厂界',
  '厨房': '智谷园区 / 厨房',
  '配电室': '智谷园区 / 配电室',
  '地下室': '智谷园区 / 地下室',
  '研发楼': '智谷园区 / 研发楼'
}
function getAreaPath(area: string) { return areaToPath[area] || area }

// ===== 行操作：更多气泡 =====
const openMenuId = ref<string | null>(null)
function toggleMenu(id: string) {
  openMenuId.value = openMenuId.value === id ? null : id
}
function closeMenu() { openMenuId.value = null }

function toggleStatus(dev: IotDevice) {
  closeMenu()
  if (dev.status === 'disabled') { dev.status = 'offline'; message.success(`「${dev.name}」已启用，等待设备接入`) }
  else { dev.status = 'disabled'; message.success(`「${dev.name}」已禁用`) }
}
function deleteDevice(dev: IotDevice) {
  closeMenu()
  const idx = devices.value.findIndex(d => d.id === dev.id)
  if (idx >= 0) { devices.value.splice(idx, 1); message.success(`已删除「${dev.name}」`) }
}

// ===== 编辑弹窗 =====
const editModalVisible = ref(false)
const editingDevice = ref<IotDevice | null>(null)
const editForm = ref({ name: '', icon: '', iconType: 'preset' as 'preset' | 'upload', uploadedIcon: '', area: '', business: '', desc: '' })

const iconOptions = [
  'i-ant-design-radar-chart-outlined', 'i-ant-design-thermometer-outlined', 'i-ant-design-aim-outlined',
  'i-ant-design-experiment-outlined', 'i-ant-design-bulb-outlined', 'i-ant-design-fire-outlined',
  'i-ant-design-bell-outlined', 'i-ant-design-door-outlined', 'i-ant-design-team-outlined',
  'i-ant-design-swap-outlined', 'i-ant-design-thunderbolt-outlined', 'i-ant-design-sound-outlined',
  'i-ant-design-cloud-server-outlined', 'i-ant-design-dashboard-outlined', 'i-ant-design-safety-outlined',
  'i-ant-design-control-outlined', 'i-ant-design-environment-outlined', 'i-ant-design-wifi-outlined'
]

function openEditModal(dev: IotDevice) {
  closeMenu()
  editingDevice.value = dev
  editForm.value = { name: dev.name, icon: dev.icon, iconType: 'preset', uploadedIcon: '', area: dev.area, business: dev.business, desc: dev.desc }
  editModalVisible.value = true
}
function saveEdit() {
  if (!editingDevice.value) return
  if (!editForm.value.name.trim()) { message.warning('请输入设备名称'); return }
  const dev = editingDevice.value
  dev.name = editForm.value.name
  dev.icon = editForm.value.iconType === 'upload' && editForm.value.uploadedIcon ? editForm.value.uploadedIcon : editForm.value.icon
  dev.area = editForm.value.area; dev.business = editForm.value.business; dev.desc = editForm.value.desc
  editModalVisible.value = false
  message.success('设备信息已更新')
}

// 更新确认
const updateModalVisible = ref(false)
const updateDevice = ref<IotDevice | null>(null)
function openUpdateModal(dev: IotDevice) { closeMenu(); updateDevice.value = dev; updateModalVisible.value = true }
function confirmUpdate() { if (!updateDevice.value) return; updateModalVisible.value = false; message.success(`已按最新设备库重新安装产品「${updateDevice.value.name}」`) }

// ===== 新增设备 =====
const addModalVisible = ref(false)
const deviceLimitModalVisible = ref(false)
const deviceCreateLimit = 1
const createdDeviceCount = computed(() => devices.value.filter(d => d.productId === 'prod-new').length)
const addStep = ref<'select' | 'config'>('select')
const selectedTemplate = ref<DeviceTemplate | null>(null)
const addForm = ref({ name: '', icon: '', iconType: 'preset' as 'preset' | 'upload', uploadedIcon: '', area: '', business: '', desc: '' })
const iotImageGuideSteps: GuideStep[] = ['iot-add', 'iot-select', 'iot-access', 'iot-access-config']
const iotImageGuideItems = [
  {
    step: 'iot-add',
    title: '新增设备',
    image: iotGuideStep1,
    desc: '点击「新增设备」按钮，从设备库中选择设备模板。'
  },
  {
    step: 'iot-select',
    title: '选择设备库',
    image: iotGuideStep2,
    desc: '左侧选择设备大类，右侧选择具体的设备模板，配置好设备的相关信息。'
  },
  {
    step: 'iot-access',
    title: '设备接入',
    image: iotGuideStep5,
    desc: '点击「设备接入」标签，开始配置设备接入。'
  },
  {
    step: 'iot-access-config',
    title: '配置设备接入参数',
    image: iotGuideStep6,
    desc: '复制对应参数到真实物理设备中进行配置，不同设备接入方式有所不同。详情请参考：https://hanta.yuque.com/px7kg1/yfac2l/wyerndtnhzze17bv'
  }
]
const isIotImageGuide = computed(() => appStore.guideActive && iotImageGuideSteps.includes(appStore.guideStep))
const iotImageGuideIndex = computed(() => Math.max(0, iotImageGuideSteps.indexOf(appStore.guideStep)))
const currentIotImageGuideItem = computed(() => iotImageGuideItems[iotImageGuideIndex.value] || iotImageGuideItems[0])
const iotImageGuideTrackStyle = computed(() => ({
  transform: `translateX(-${iotImageGuideIndex.value * 576}px)`
}))

const activeCategory = ref(deviceTemplateCategories[0].id)
const activeCatObj = computed(() => deviceTemplateCategories.find(c => c.id === activeCategory.value) || deviceTemplateCategories[0])
const guideDemoRowVisible = computed(() => appStore.guideActive && appStore.guideStep === 'iot-detail')

watch(() => appStore.guideStep, (step) => {
  if (!appStore.guideActive) return
  if (iotImageGuideSteps.includes(step)) {
    addModalVisible.value = false
  }
}, { immediate: true })

function goPrevIotImageGuide() {
  if (!isIotImageGuide.value) return
  const prevStep = iotImageGuideSteps[iotImageGuideIndex.value - 1]
  if (prevStep) {
    appStore.setGuideStep(prevStep)
  }
}

function goNextIotImageGuide() {
  if (!isIotImageGuide.value) return
  const nextStep = iotImageGuideSteps[iotImageGuideIndex.value + 1]
  if (nextStep) {
    appStore.setGuideStep(nextStep)
  }
  else appStore.finishGuide()
}

function jumpIotImageGuide(step: GuideStep, index: number) {
  if (index === iotImageGuideIndex.value) return
  appStore.setGuideStep(step)
}

function openAddModal() {
  createDeviceGuideOpen.value = false
  if (appStore.guideActive && appStore.guideStep === 'iot-add') return
  if (devices.value.some(d => d.productId === 'prod-new')) {
    deviceLimitModalVisible.value = true
    return
  }
  addStep.value = 'select'; selectedTemplate.value = null; activeCategory.value = deviceTemplateCategories[0].id
  addModalVisible.value = true
}

watch(
  () => route.query.action,
  (action) => {
    if (action === 'create') {
      nextTick(openAddModal)
    }
  },
  { immediate: true }
)

watch(
  () => route.query.guide,
  (guide) => {
    if (guide === 'create-device') {
      nextTick(() => {
        createDeviceGuideNext.value = route.query.next === 'video' ? 'video' : 'done'
        createDeviceGuideStep.value = Number(route.query.step || 2)
        createDeviceGuideTotal.value = Number(route.query.total || 2)
        createDeviceGuideOpen.value = true
      })
    }
  },
  { immediate: true }
)

function handleCreateDeviceGuideNext() {
  createDeviceGuideOpen.value = false
  if (createDeviceGuideNext.value === 'video') {
    router.push({
      path: '/video/device',
      query: {
        guide: 'connect-device',
        step: createDeviceGuideStep.value + 1,
        total: createDeviceGuideTotal.value,
        _t: Date.now()
      }
    })
  }
}

function handleCreateDeviceGuidePrev() {
  createDeviceGuideOpen.value = false
  router.push({
    path: '/iot/device',
    query: {
      guide: 'iot-device-tab',
      next: createDeviceGuideNext.value,
      step: createDeviceGuideStep.value - 1,
      total: createDeviceGuideTotal.value,
      _t: Date.now()
    }
  })
}

function selectTemplate(tpl: DeviceTemplate) {
  if (appStore.guideActive && appStore.guideStep === 'iot-select') return
  selectedTemplate.value = tpl; addStep.value = 'config'
  addForm.value = { name: '', icon: tpl.icon, iconType: 'preset', uploadedIcon: '', area: '', business: '', desc: tpl.desc }
}
function backToSelect() { addStep.value = 'select'; selectedTemplate.value = null }

function handleUpload(e: Event, target: 'edit' | 'add') {
  const input = e.target as HTMLInputElement
  if (!input.files?.[0]) return
  const file = input.files[0]
  const reader = new FileReader()
  reader.onload = () => {
    const dataUrl = reader.result as string
    if (target === 'edit') { editForm.value.uploadedIcon = dataUrl; editForm.value.iconType = 'upload' }
    else { addForm.value.uploadedIcon = dataUrl; addForm.value.iconType = 'upload' }
  }
  reader.readAsDataURL(file)
}

function saveNewDevice() {
  if (appStore.guideActive && ['iot-select', 'iot-config'].includes(appStore.guideStep)) return
  if (!selectedTemplate.value) return
  if (!addForm.value.name.trim()) { message.warning('请输入设备名称'); return }
  if (devices.value.some(d => d.productId === 'prod-new')) {
    deviceLimitModalVisible.value = true
    return
  }
  const tpl = selectedTemplate.value
  devices.value.unshift({
    id: 'dev-' + Date.now(), name: addForm.value.name, product: tpl.name, productId: 'prod-new',
    vendor: tpl.vendor, model: tpl.model, status: 'offline', type: '直连设备', accessType: 'MQTT直连',
    area: addForm.value.area || '未分配', business: addForm.value.business || '未分组',
    healthScore: 0, lastReport: '—', riskLevel: '无风险', sn: String(Date.now()),
    icon: addForm.value.iconType === 'upload' && addForm.value.uploadedIcon ? addForm.value.uploadedIcon : addForm.value.icon,
    desc: addForm.value.desc
  })
  addModalVisible.value = false
  currentPage.value = 1
  message.success(`设备「${addForm.value.name}」添加成功`)
}

const areaOptions = ['研发部办公区', '项目部办公区', '大厅', '走廊', '仓库', '厨房', '配电室', '水泵房', '地下室', '厂界', '前门']
const businessOptions = ['消防安全', '环境监测', '能耗分析', '安全防护', '姿态监测']
</script>

<template>
  <div class="dl-page" @click="closeMenu">
    <!-- 工具栏 -->
    <div class="dl-toolbar">
      <a-input v-model:value="searchKey" class="dl-search" placeholder="搜索设备名称、产品、厂商、区域" allow-clear>
        <template #prefix><i class="i-ant-design-search-outlined" /></template>
      </a-input>
      <div class="dl-toolbar__right">
        <span class="dl-total">共 {{ filteredDevices.length }} 台</span>
        <div class="dl-add-guide-anchor">
          <button class="dl-add-btn" type="button" data-guide="iot-add-device" @click="openAddModal"><i class="i-ant-design-plus-outlined" /><span>新增设备</span></button>
          <div v-if="createDeviceGuideOpen" class="iot-create-guide">
            <button class="iot-create-guide__close" type="button" aria-label="关闭" @click.stop="createDeviceGuideOpen = false">
              <i class="i-ant-design-close-outlined" />
            </button>
            <h3>创建物联设备</h3>
            <p>通过选择对应的设备库模板创建物联设备。</p>
            <div class="iot-create-guide__footer">
              <span>{{ createDeviceGuideStepText }}</span>
              <div class="iot-create-guide__actions">
                <button v-if="createDeviceGuideNext === 'video'" class="iot-create-guide__btn iot-create-guide__btn--ghost" type="button" @click="handleCreateDeviceGuidePrev">上一步</button>
                <button class="iot-create-guide__btn" type="button" @click="handleCreateDeviceGuideNext">{{ createDeviceGuideNext === 'video' ? '下一步' : '知道了' }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 表格 -->
    <div class="dl-table-wrap">
      <table class="dl-table">
        <thead>
          <tr>
            <th class="col-check"><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></th>
            <th>设备名称</th><th>设备库</th><th>厂商</th><th>型号</th><th>状态</th>
            <th>最近上报</th><th>所属区域</th><th>业务分组</th><th>健康评分</th><th class="col-ops"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-if="guideDemoRowVisible"
            class="dl-row dl-row--guide"
            data-guide="iot-device-row"
          >
            <td class="col-check" @click.stop><input type="checkbox" disabled /></td>
            <td>
              <div class="dl-device">
                <span class="dl-device__icon" style="background: #6e4bff;">
                  <i class="i-ant-design-api-outlined" />
                </span>
                <span class="dl-device__text">
                  <span class="dl-device__name">新增设备实例</span>
                  <small class="dl-device__sn"><span class="dl-skeleton dl-skeleton--sn" /></small>
                </span>
              </div>
            </td>
            <td><span class="dl-skeleton" /></td>
            <td><span class="dl-skeleton dl-skeleton--sm" /></td>
            <td><span class="dl-skeleton dl-skeleton--sm" /></td>
            <td><span class="dl-skeleton dl-skeleton--status" /></td>
            <td><span class="dl-skeleton" /></td>
            <td><span class="dl-skeleton dl-skeleton--lg" /></td>
            <td><span class="dl-skeleton" /></td>
            <td><span class="dl-skeleton dl-skeleton--score" /></td>
            <td class="col-ops" @click.stop><span class="dl-skeleton dl-skeleton--icon" /></td>
          </tr>
          <tr
            v-for="dev in pagedDevices"
            :key="dev.id"
            class="dl-row"
            @click="appStore.guideActive ? undefined : gotoDetail(dev)"
          >
            <td class="col-check" @click.stop><input type="checkbox" :checked="selectedIds.has(dev.id)" @change="toggleSelect(dev.id)" /></td>
            <td>
              <div class="dl-device">
                <span class="dl-device__icon" :style="{ background: iconColor(dev.id) }">
                  <i v-if="!dev.icon.startsWith('data:')" :class="dev.icon" />
                  <img v-else :src="dev.icon" alt="icon" />
                </span>
                <span class="dl-device__text">
                  <span class="dl-device__name">{{ dev.name }}</span>
                  <small class="dl-device__sn">{{ dev.sn }}</small>
                </span>
              </div>
            </td>
            <td>{{ dev.product }}</td><td>{{ dev.vendor }}</td><td>{{ dev.model }}</td>
            <td><span class="dl-status" :class="statusConfig[dev.status].class"><i class="dl-status__dot" />{{ statusConfig[dev.status].label }}</span></td>
            <td class="dl-muted">{{ dev.lastReport }}</td><td class="dl-area">{{ getAreaPath(dev.area) }}</td><td>{{ dev.business }}</td>
            <td><strong class="dl-score" :style="{ color: healthScoreColor(dev.healthScore) }">{{ dev.healthScore }}</strong></td>
            <td class="col-ops" @click.stop>
              <div class="dl-more-wrap">
                <button class="dl-more-btn" type="button" @click="toggleMenu(dev.id)"><i class="i-ant-design-ellipsis-outlined" /></button>
                <Transition name="pop">
                  <div v-if="openMenuId === dev.id" class="dl-pop-menu">
                    <button type="button" @click="toggleStatus(dev)"><i :class="dev.status === 'disabled' ? 'i-ant-design-play-circle-outlined' : 'i-ant-design-pause-circle-outlined'" />{{ dev.status === 'disabled' ? '启用' : '禁用' }}</button>
                    <button type="button" @click="openEditModal(dev)"><i class="i-ant-design-edit-outlined" />编辑</button>
                    <button type="button" @click="openUpdateModal(dev)"><i class="i-ant-design-sync-outlined" />更新</button>
                    <button type="button" class="dl-pop-danger" @click="deleteDevice(dev)"><i class="i-ant-design-delete-outlined" />删除</button>
                  </div>
                </Transition>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredDevices.length === 0" class="dl-empty">
        <i class="i-ant-design-api-outlined dl-empty__icon" />
        <p>{{ searchKey ? '没有找到匹配的设备' : '暂无设备' }}</p>
      </div>
    </div>

    <!-- 分页 -->
    <div class="dl-pagination">
      <span class="dl-pagination__total">共 {{ filteredDevices.length }} 条</span>
      <div class="dl-pagination__right">
        <select v-model="pageSize" class="dl-page-size"><option :value="10">10 条/页</option><option :value="20">20 条/页</option><option :value="50">50 条/页</option></select>
        <button class="dl-page-btn" :disabled="currentPage <= 1" @click="currentPage--"><i class="i-ant-design-left-outlined" /></button>
        <span class="dl-page-num">{{ currentPage }} / {{ Math.ceil(filteredDevices.length / pageSize) || 1 }}</span>
        <button class="dl-page-btn" :disabled="currentPage >= Math.ceil(filteredDevices.length / pageSize)" @click="currentPage++"><i class="i-ant-design-right-outlined" /></button>
      </div>
    </div>

    <!-- ===== 编辑弹窗 ===== -->
    <a-modal v-model:open="editModalVisible" title="编辑设备" :width="480" :footer="null" centered>
      <div class="modal-form">
        <div class="modal-field"><label>设备名称 <em>*</em></label><a-input v-model:value="editForm.name" placeholder="请输入设备名称" /></div>
        <div class="modal-field">
          <label>设备图标</label>
          <div class="icon-area">
            <div class="icon-tabs">
              <button :class="{ active: editForm.iconType === 'preset' }" @click="editForm.iconType = 'preset'">预设图标</button>
              <button :class="{ active: editForm.iconType === 'upload' }" @click="editForm.iconType = 'upload'">上传图片</button>
            </div>
            <div v-if="editForm.iconType === 'preset'" class="icon-picker">
              <button v-for="ic in iconOptions" :key="ic" class="icon-option" :class="{ selected: editForm.icon === ic }" type="button" @click="editForm.icon = ic"><i :class="ic" /></button>
            </div>
            <div v-else class="icon-upload">
              <label class="icon-upload__zone">
                <input type="file" accept="image/*" hidden @change="handleUpload($event, 'edit')" />
                <img v-if="editForm.uploadedIcon" :src="editForm.uploadedIcon" alt="预览" class="icon-upload__preview" />
                <template v-else><i class="i-ant-design-plus-outlined" /><span>点击上传</span></template>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-field"><label>所属区域</label><a-select v-model:value="editForm.area" style="width: 100%" placeholder="请选择区域"><a-select-option v-for="a in areaOptions" :key="a" :value="a">{{ a }}</a-select-option></a-select></div>
        <div class="modal-field"><label>业务分组</label><a-select v-model:value="editForm.business" style="width: 100%" placeholder="请选择业务分组"><a-select-option v-for="b in businessOptions" :key="b" :value="b">{{ b }}</a-select-option></a-select></div>
        <div class="modal-field"><label>说明</label><a-textarea v-model:value="editForm.desc" placeholder="设备说明（选填）" :rows="2" /></div>
        <div class="modal-actions"><button class="dl-modal-btn dl-modal-btn--default" @click="editModalVisible = false">取消</button><button class="dl-modal-btn dl-modal-btn--primary" @click="saveEdit">保存</button></div>
      </div>
    </a-modal>

    <!-- ===== 更新确认 ===== -->
    <a-modal v-model:open="updateModalVisible" title="确认更新" :width="420" :footer="null" centered>
      <div class="confirm-body">
        <div class="confirm-icon"><i class="i-ant-design-sync-outlined" /></div>
        <p class="confirm-text">确认按最新设备库重新安装产品「<strong>{{ updateDevice?.name }}</strong>」？<br />更新后设备将按照最新产品模板重新初始化。</p>
        <div class="modal-actions"><button class="dl-modal-btn dl-modal-btn--default" @click="updateModalVisible = false">取消</button><button class="dl-modal-btn dl-modal-btn--primary" @click="confirmUpdate">确认更新</button></div>
      </div>
    </a-modal>

    <!-- ===== 物联新增设备图片引导弹窗 ===== -->
    <a-modal
      :open="isIotImageGuide"
      :width="760"
      :footer="null"
      :closable="false"
      :title="null"
      :body-style="{ padding: '0' }"
      :mask-closable="false"
      :z-index="2000"
      wrap-class-name="iot-image-guide-modal"
      @cancel="appStore.finishGuide"
    >
      <div class="iot-image-guide">
        <div class="iot-image-guide__panel">
          <div class="iot-image-guide__stage">
            <div class="iot-image-guide__track" :style="iotImageGuideTrackStyle">
              <div
                v-for="(item, index) in iotImageGuideItems"
                :key="item.step"
                class="iot-image-guide__slide"
                :class="{ active: index === iotImageGuideIndex }"
              >
                <img :src="item.image" :alt="item.title">
              </div>
            </div>
          </div>

          <div class="iot-image-guide__footer">
            <div class="iot-image-guide__meta">
              <div class="iot-image-guide__steps" aria-label="物联新增设备引导步骤">
                <button
                  v-for="(item, index) in iotImageGuideItems"
                  :key="item.step"
                  type="button"
                  :aria-label="`跳转到${item.title}`"
                  :class="{ active: index === iotImageGuideIndex, done: index < iotImageGuideIndex }"
                  @click="jumpIotImageGuide(item.step as GuideStep, index)"
                />
              </div>
              <p>{{ currentIotImageGuideItem.desc }}</p>
            </div>
            <div class="iot-image-guide__actions">
              <button
                class="iot-image-guide__btn"
                type="button"
                :disabled="iotImageGuideIndex === 0"
                @click="goPrevIotImageGuide"
              >
                上一步
              </button>
              <button class="iot-image-guide__btn iot-image-guide__btn--primary" type="button" @click="goNextIotImageGuide">
                {{ iotImageGuideIndex === iotImageGuideItems.length - 1 ? '完成' : '下一步' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- ===== 新增设备弹窗 ===== -->
    <a-modal
      v-model:open="addModalVisible"
      :title="addStep === 'select' ? '新增设备 · 选择设备库' : '新增设备 · 填写配置'"
      :width="680"
      :footer="null"
      centered
      :body-style="{ padding: '0' }"
      :z-index="appStore.guideActive ? 2000 : 1000"
      wrap-class-name="iot-add-modal"
    >
      <!-- Step 1: 左右结构选择 -->
      <div v-if="addStep === 'select'" class="add-select-layout">
        <div class="add-cat-list">
          <button v-for="cat in deviceTemplateCategories" :key="cat.id" class="add-cat" :class="{ active: activeCategory === cat.id }" type="button" @click="activeCategory = cat.id">
            <i :class="cat.icon" class="add-cat__icon" /><span>{{ cat.name }}</span>
          </button>
        </div>
        <div class="add-tpl-list">
          <button v-for="tpl in activeCatObj.templates" :key="tpl.id" class="add-tpl-item" type="button" @click="selectTemplate(tpl)">
            <div class="add-tpl-item__icon"><i :class="tpl.icon" /></div>
            <div class="add-tpl-item__info">
              <span class="add-tpl-item__name">{{ tpl.name }}</span>
              <span class="add-tpl-item__meta">{{ tpl.vendor }} · {{ tpl.model }}</span>
              <span class="add-tpl-item__desc">{{ tpl.desc }}</span>
            </div>
            <i class="add-tpl-item__arrow i-ant-design-right-outlined" />
          </button>
        </div>
      </div>

      <!-- Step 2: 填写配置 -->
      <div v-else class="add-config">
        <div class="add-selected-bar">
          <div class="add-selected-info">
            <div class="add-selected-icon"><i :class="selectedTemplate?.icon" /></div>
            <div><strong>{{ selectedTemplate?.name }}</strong><span>{{ selectedTemplate?.vendor }} · {{ selectedTemplate?.model }}</span></div>
          </div>
          <button class="add-change-btn" type="button" @click="backToSelect"><i class="i-ant-design-swap-outlined" />更换</button>
        </div>
        <div class="modal-form">
          <div class="modal-field"><label>设备名称 <em>*</em></label><a-input v-model:value="addForm.name" placeholder="请输入设备名称" /></div>
          <div class="modal-field">
            <label>设备图标</label>
            <div class="icon-area">
              <div class="icon-tabs">
                <button :class="{ active: addForm.iconType === 'preset' }" @click="addForm.iconType = 'preset'">预设图标</button>
                <button :class="{ active: addForm.iconType === 'upload' }" @click="addForm.iconType = 'upload'">上传图片</button>
              </div>
              <div v-if="addForm.iconType === 'preset'" class="icon-picker">
                <button v-for="ic in iconOptions" :key="ic" class="icon-option" :class="{ selected: addForm.icon === ic }" type="button" @click="addForm.icon = ic"><i :class="ic" /></button>
              </div>
              <div v-else class="icon-upload">
                <label class="icon-upload__zone">
                  <input type="file" accept="image/*" hidden @change="handleUpload($event, 'add')" />
                  <img v-if="addForm.uploadedIcon" :src="addForm.uploadedIcon" alt="预览" class="icon-upload__preview" />
                  <template v-else><i class="i-ant-design-plus-outlined" /><span>点击上传</span></template>
                </label>
              </div>
            </div>
          </div>
          <div class="modal-field"><label>所属区域</label><a-select v-model:value="addForm.area" style="width: 100%" placeholder="请选择区域" allow-clear><a-select-option v-for="a in areaOptions" :key="a" :value="a">{{ a }}</a-select-option></a-select></div>
          <div class="modal-field"><label>业务分组</label><a-select v-model:value="addForm.business" style="width: 100%" placeholder="请选择业务分组" allow-clear><a-select-option v-for="b in businessOptions" :key="b" :value="b">{{ b }}</a-select-option></a-select></div>
          <div class="modal-field"><label>说明</label><a-textarea v-model:value="addForm.desc" placeholder="设备说明（选填）" :rows="2" /></div>
        </div>
        <div class="modal-actions"><button class="dl-modal-btn dl-modal-btn--default" @click="backToSelect">上一步</button><button class="dl-modal-btn dl-modal-btn--primary" @click="saveNewDevice"><i class="i-ant-design-check-outlined" />添加设备</button></div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="deviceLimitModalVisible"
      :width="420"
      :footer="null"
      centered
      :title="null"
    >
      <div class="device-limit">
        <div class="device-limit__icon">
          <i class="i-ant-design-exclamation-circle-outlined" />
        </div>
        <h3>已经到达数量上限</h3>
        <p>如需接入更多物联设备，请咨询技术支持。</p>
        <div class="device-limit__usage">
          <span>当前用量</span>
          <strong>{{ createdDeviceCount }} / {{ deviceCreateLimit }}</strong>
          <em>物联设备新增数量</em>
        </div>
        <img :src="serviceQrImg" alt="售后服务二维码" class="device-limit__qr" />
        <button class="dl-modal-btn dl-modal-btn--primary device-limit__btn" type="button" @click="deviceLimitModalVisible = false">我知道了</button>
      </div>
    </a-modal>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

/* 新手引导（已移至顶部导航栏） */

.dl-page { height: 100%; padding: 8px; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }

.dl-toolbar { display: flex; align-items: center; gap: 12px; flex-shrink: 0; &__right { display: flex; align-items: center; gap: 12px; margin-left: auto; } }
.dl-search { width: 380px; }
.dl-total { font-size: 13px; color: $text-tertiary; }
.dl-add-guide-anchor { position: relative; display: inline-flex; }
.dl-add-btn { display: flex; align-items: center; gap: 5px; height: 32px; padding: 0 14px; border: 1px solid $color-primary; border-radius: 6px; background: $color-primary; color: #fff; font-size: 13px; cursor: pointer; font-family: inherit; &:hover { background: $color-primary-hover; } i { font-size: 13px; } }
.iot-create-guide {
  position: absolute;
  top: 42px;
  right: 0;
  z-index: 40;
  width: 276px;
  padding: 14px 14px 12px;
  border-radius: 8px;
  background: $color-primary;
  color: #fff;
  box-shadow: 0 10px 24px rgba(74, 45, 190, 0.22);

  &::before {
    content: '';
    position: absolute;
    top: -6px;
    right: 26px;
    width: 12px;
    height: 12px;
    background: $color-primary;
    transform: rotate(45deg);
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

.dl-table-wrap { flex: 1; overflow: auto; background: #fff; border-radius: 12px; overflow: hidden; scrollbar-width: none; -ms-overflow-style: none; &::-webkit-scrollbar { display: none; } }
.dl-table { width: 100%; border-collapse: collapse; font-size: 13px;
  thead th { padding: 12px 12px; text-align: left; font-weight: 600; font-size: 12px; color: $text-secondary; background: $bg-page; border-bottom: 1px solid $border-color-card; white-space: nowrap; position: sticky; top: 0; z-index: 1; }
  tbody td { padding: 18px 12px; border-bottom: 1px solid $border-color-card; color: $text-secondary; vertical-align: middle; }
  tbody tr { transition: background 0.15s; &:hover { background: #faf9ff; } }
  tbody tr.dl-row { cursor: pointer; }
  .col-check { width: 40px; text-align: center; } .col-ops { width: 48px; text-align: center; } }

.dl-device { display: flex; align-items: center; gap: 10px; }
.dl-device__icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; overflow: hidden; i { font-size: 20px; } img { width: 100%; height: 100%; object-fit: cover; } }
.dl-device__text { display: flex; flex-direction: column; }
.dl-device__name { color: $text-base; font-weight: 600; font-size: 14px; }
.dl-row:hover .dl-device__name { color: $color-primary; }
.dl-device__sn { font-size: 11px; color: $text-muted; font-family: 'Courier New', monospace; }
.dl-row--guide {
  background: #fff;
}
.dl-skeleton {
  display: inline-block;
  width: 82px;
  height: 12px;
  border-radius: 999px;
  vertical-align: middle;
  background: linear-gradient(90deg, #f1f3f6 25%, #e6e9f0 37%, #f1f3f6 63%);
  background-size: 400% 100%;
  animation: dl-skeleton-shimmer 1.2s ease-in-out infinite;

  &--sn { width: 104px; height: 10px; }
  &--sm { width: 58px; }
  &--lg { width: 128px; }
  &--status { width: 54px; height: 18px; border-radius: 4px; }
  &--score { width: 28px; }
  &--icon { width: 26px; height: 26px; }
}
@keyframes dl-skeleton-shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: 0 0; }
}
.dl-muted { font-size: 12px; color: $text-muted; }
.dl-area { font-size: 12px; color: $text-muted; }
.dl-status { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; padding: 2px 8px; border-radius: 3px; &__dot { width: 6px; height: 6px; border-radius: 50%; } }
.st-online { background: rgba(43,179,163,0.1); color: $color-online; .dl-status__dot { background: $color-online; } }
.st-offline { background: rgba(154,161,171,0.12); color: $text-tertiary; .dl-status__dot { background: #bfbfbf; } }
.st-alert { background: rgba(255,77,79,0.1); color: #ff4d4f; .dl-status__dot { background: #ff4d4f; } }
.st-silent { background: rgba(250,173,20,0.12); color: #d48806; .dl-status__dot { background: #faad14; } }
.st-disabled { background: rgba(0,0,0,0.06); color: $text-muted; .dl-status__dot { background: #bfbfbf; } }
.score-low { color: #ff4d4f !important; }
.dl-score { font-size: 15px; font-weight: 700; }

/* 更多气泡 */
.dl-more-wrap { position: relative; display: inline-flex; }
.dl-more-btn { width: 32px; height: 32px; border: 1px solid $border-color-card; border-radius: 8px; background: #fff; color: $text-tertiary; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  &:hover { border-color: $color-primary; color: $color-primary; } i { font-size: 16px; } }
.dl-pop-menu { position: absolute; top: 36px; right: 0; z-index: 20; background: #fff; border: 1px solid $border-color-card; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; min-width: 130px;
  button { display: flex; align-items: center; gap: 6px; width: 100%; padding: 9px 14px; border: none; background: transparent; font-size: 13px; color: $text-secondary; cursor: pointer; font-family: inherit; text-align: left; transition: all 0.1s;
    i { font-size: 14px; } &:hover { background: $color-primary-bg; color: $color-primary; } }
  .dl-pop-danger { color: #ff4d4f; &:hover { background: rgba(255,77,79,0.08); color: #ff4d4f; } } }

.pop-enter-active, .pop-leave-active { transition: all 0.15s; }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: translateY(-6px); }

.dl-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 80px 20px; color: $text-muted; &__icon { font-size: 48px; opacity: 0.3; } p { font-size: 14px; margin: 0; } }

/* 分页 */
.dl-pagination { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; padding: 8px 4px; &__total { font-size: 12px; color: $text-muted; } &__right { display: flex; align-items: center; gap: 8px; } }
.dl-page-size { height: 28px; padding: 0 8px; border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary; font-size: 12px; font-family: inherit; cursor: pointer; &:focus { outline: none; border-color: $color-primary; } }
.dl-page-btn { width: 28px; height: 28px; border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; &:hover:not(:disabled) { border-color: $color-primary; color: $color-primary; } &:disabled { opacity: 0.4; cursor: not-allowed; } i { font-size: 14px; } }
.dl-page-num { font-size: 13px; color: $text-secondary; min-width: 56px; text-align: center; }

/* 弹窗表单 */
.modal-form { display: flex; flex-direction: column; gap: 16px; padding: 8px 0; }
.modal-field { display: flex; flex-direction: column; gap: 6px; label { font-size: 13px; font-weight: 500; color: $text-base; em { color: #ff4d4f; font-style: normal; } } }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 4px; }
.dl-modal-btn { display: inline-flex; align-items: center; gap: 5px; height: 32px; padding: 0 16px; border-radius: 6px; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s;
  &--default { border: 1px solid $border-color-light; background: #fff; color: $text-secondary; &:hover { border-color: $color-primary; color: $color-primary; } }
  &--primary { border: 1px solid $color-primary; background: $color-primary; color: #fff; &:hover { background: $color-primary-hover; } } }

/* 确认弹窗 */
.confirm-body { text-align: center; padding: 12px 0; }
.confirm-icon { width: 48px; height: 48px; margin: 0 auto 12px; border-radius: 50%; background: $color-primary-bg; color: $color-primary; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.confirm-text { margin: 0 0 20px; font-size: 14px; line-height: 1.7; color: $text-secondary; strong { color: $text-base; } }

.iot-image-guide {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0;

  &__panel {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #f0f2f5;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 12px 32px rgba(20, 23, 31, 0.08);
  }

  &__stage {
    position: relative;
    overflow: hidden;
    height: 384px;
    background: #fff;
  }

  &__track {
    display: flex;
    gap: 16px;
    height: 100%;
    padding: 12px 88px;
    transition: transform 0.42s cubic-bezier(0.22, 0.72, 0.18, 1);
    will-change: transform;
    box-sizing: border-box;
  }

  &__slide {
    flex: 0 0 560px;
    height: 100%;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    background: transparent;
    opacity: 0.62;
    transform: scale(0.95);
    transition: opacity 0.28s ease, transform 0.28s ease, box-shadow 0.28s ease;

    &.active {
      opacity: 1;
      transform: scale(1);
      box-shadow: 0 10px 24px rgba(20, 23, 31, 0.08);
    }

    img {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      border-radius: 0;
      object-fit: fill;
      background: transparent;
      box-shadow: none;
    }
  }

  &__footer {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px;
    align-items: end;
    padding: 10px 14px 12px;
    border-top: 1px solid #f0f2f5;
    background: #fff;
  }

  &__meta {
    min-width: 0;

    p {
      margin: 8px 0 0;
      min-height: 34px;
      padding: 7px 10px;
      border: 1px solid rgba(110, 75, 255, 0.12);
      border-radius: 6px;
      background: #faf9ff;
      color: $text-secondary;
      font-size: 12px;
      line-height: 18px;
    }
  }

  &__steps {
    display: flex;
    align-items: center;
    gap: 6px;

    button {
      width: 22px;
      height: 4px;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: #dbe4f1;
      cursor: pointer;
      transition: background 0.15s ease, width 0.15s ease, box-shadow 0.15s ease;

      &.done,
      &.active {
        background: $color-primary;
      }

      &.active {
        width: 34px;
        box-shadow: 0 0 0 3px rgba(110, 75, 255, 0.10);
      }

      &:hover {
        background: $color-primary-hover;
      }
    }
  }

  &__actions {
    display: inline-flex;
    align-self: end;
    align-items: center;
    gap: 10px;
    padding-bottom: 1px;
  }

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 68px;
    height: 28px;
    padding: 0 12px;
    border: 1px solid $border-color-light;
    border-radius: 6px;
    color: $text-secondary;
    background: #fff;
    font-size: 13px;
    cursor: pointer;
    transition: border-color 0.15s ease, color 0.15s ease, background 0.15s ease, transform 0.15s ease;

    &:hover:not(:disabled) {
      border-color: $color-primary;
      color: $color-primary;
      background: #faf9ff;
    }

    &:active:not(:disabled) {
      transform: scale(0.96);
    }

    &:disabled {
      color: $text-muted;
      background: #f6f7f9;
      cursor: not-allowed;
    }

    &--primary {
      border-color: $color-primary;
      color: #fff;
      background: linear-gradient(135deg, #7d5cff 0%, #6e4bff 55%, #5d3bff 100%);
      box-shadow: 0 2px 10px rgba(110, 75, 255, 0.22);

      &:hover:not(:disabled) {
        color: #fff;
        background: $color-primary-hover;
      }
    }
  }
}

:global(.iot-image-guide-modal) {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

:global(.iot-image-guide-modal .ant-modal) {
  top: auto;
  margin: 0;
  padding-bottom: 0;
}

:global(.iot-image-guide-modal .ant-modal-content) {
  background: transparent;
  box-shadow: none;
}

/* 图标选择区 */
.icon-area { border: 1px solid $border-color-card; border-radius: 10px; overflow: hidden; }
.icon-tabs { display: flex; border-bottom: 1px solid $border-color-card;
  button { flex: 1; padding: 8px; border: none; background: transparent; font-size: 13px; color: $text-muted; cursor: pointer; font-family: inherit; border-bottom: 2px solid transparent;
    &.active { color: $color-primary; border-bottom-color: $color-primary; font-weight: 500; background: $color-primary-bg; } } }
.icon-picker { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px; max-height: 120px; overflow-y: auto; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
.icon-option { width: 36px; height: 36px; border: 1px solid $border-color-card; border-radius: 8px; background: #fff; color: $text-tertiary; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  i { font-size: 18px; } &:hover { border-color: rgba(110,75,255,0.4); color: $color-primary; } &.selected { border-color: $color-primary; background: $color-primary-bg; color: $color-primary; } }
.icon-upload { padding: 12px; display: flex; justify-content: center; }
.icon-upload__zone { width: 72px; height: 72px; border: 2px dashed $border-color-light; border-radius: 10px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; cursor: pointer; color: $text-muted; transition: all 0.15s;
  &:hover { border-color: $color-primary; color: $color-primary; } i { font-size: 20px; } span { font-size: 11px; }
  .icon-upload__preview { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; } }

/* 新增 Step1 左右结构 */
.add-select-layout { display: grid; grid-template-columns: 160px 1fr; height: 380px; }
.add-cat-list { border-right: 1px solid $border-color-card; padding: 8px; overflow-y: auto; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
.add-cat { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 12px; border: 1px solid transparent; border-radius: 8px; background: transparent; color: $text-secondary; font-size: 13px; cursor: pointer; font-family: inherit; transition: all 0.15s; margin-bottom: 4px;
  &__icon { font-size: 16px; } &:hover { background: #faf9ff; } &.active { border-color: $color-primary; background: $color-primary-bg; color: $color-primary; font-weight: 500; } }
.add-tpl-list { padding: 8px; overflow-y: auto; scrollbar-width: none; &::-webkit-scrollbar { display: none; } }
.add-tpl-item { display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border: 1px solid $border-color-card; border-radius: 10px; background: #fff; cursor: pointer; font-family: inherit; transition: all 0.15s; text-align: left; margin-bottom: 6px;
  &:hover { border-color: $color-primary; box-shadow: 0 2px 8px rgba(110,75,255,0.06); }
  &__icon { width: 38px; height: 38px; border-radius: 10px; background: $color-primary-bg; color: $color-primary; display: flex; align-items: center; justify-content: center; font-size: 19px; flex-shrink: 0; }
  &__info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
  &__name { font-size: 14px; font-weight: 600; color: $text-base; }
  &__meta { font-size: 11px; color: $text-muted; }
  &__desc { font-size: 11px; color: $text-muted; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &__arrow { font-size: 14px; color: $text-muted; flex-shrink: 0; } }

/* 新增 Step2 */
.add-config { padding: 0; }
.add-selected-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 20px; background: linear-gradient(135deg, $color-primary-bg 0%, #f8f6ff 100%); border-bottom: 1px solid $border-color-card; }
.add-selected-info { display: flex; align-items: center; gap: 10px; }
.add-selected-icon { width: 40px; height: 40px; border-radius: 10px; background: #fff; color: $color-primary; display: flex; align-items: center; justify-content: center; font-size: 20px; box-shadow: 0 2px 6px rgba(110,75,255,0.1); }
.add-selected-info strong { display: block; font-size: 14px; font-weight: 600; color: $text-base; } .add-selected-info span { font-size: 12px; color: $text-muted; }
.add-change-btn { display: flex; align-items: center; gap: 4px; border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary; font-size: 12px; cursor: pointer; font-family: inherit; height: 28px; padding: 0 10px; &:hover { border-color: $color-primary; color: $color-primary; } }
.add-config .modal-form { padding: 16px 20px; } .add-config .modal-actions { padding: 0 20px 16px; }

.device-limit {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0 4px;
  text-align: center;

  &__icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    background: rgba(250, 173, 20, 0.12);
    color: #d48806;

    i { font-size: 26px; }
  }

  h3 {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 600;
    color: $text-base;
  }

  p {
    margin: 0 0 16px;
    font-size: 13px;
    line-height: 1.6;
    color: $text-secondary;
  }

  &__usage {
    display: grid;
    justify-items: center;
    gap: 4px;
    width: 100%;
    padding: 10px 12px;
    margin-bottom: 16px;
    border: 1px solid $border-color-card;
    border-radius: 8px;
    background: #fafbfc;

    span {
      color: $text-tertiary;
      font-size: 12px;
      line-height: 18px;
    }

    strong {
      color: $text-base;
      font-size: 22px;
      line-height: 28px;
      font-weight: 700;
    }

    em {
      color: $text-secondary;
      font-size: 12px;
      font-style: normal;
      line-height: 18px;
    }
  }

  &__qr {
    width: 148px;
    height: 148px;
    object-fit: contain;
    padding: 8px;
    margin-bottom: 18px;
    border: 1px solid $border-color-card;
    border-radius: 8px;
    background: #fff;
  }

  &__btn {
    min-width: 120px;
    justify-content: center;
  }
}
</style>
