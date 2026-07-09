<script setup lang="ts">
/**
 * 人员档案 - 新增弹窗（共享组件）
 * 供「人员档案列表页新增」和「文搜图卡片→添加到人员档案」复用
 * 文搜图入口可传入 presetFaces 预填人脸图（来自抓拍）
 */
import { type PersonProfile } from './person-profile.mock'

const props = defineProps<{
  open: boolean
  /** 预填人脸图（来自抓拍），不带则初始为空 */
  presetFaces?: string[]
}>()

const emit = defineEmits<{
  'update:open': [v: boolean]
  /** 提交：返回构造好的人员档案对象（不含 id/时间，由调用方补充） */
  submit: [data: Omit<PersonProfile, 'id' | 'createdAt' | 'lastSeenAt' | 'lastSeenCamera' | 'lastSeenArea' | 'eventCount' | 'events' | 'weekHeat'>]
}>()

const form = reactive({
  name: '',
  remark: '',
  keyFocus: false,
  files: [] as { name: string; url: string; preset?: boolean }[]
})
const fileInput = ref<HTMLInputElement | null>(null)
const submitting = ref(false)

// 弹窗打开时初始化（含预填图）
watch(() => props.open, (v) => {
  if (v) {
    form.name = ''
    form.remark = ''
    form.keyFocus = false
    form.files = (props.presetFaces || []).map(url => ({ name: url, url, preset: true }))
  }
})

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files) return
  Array.from(input.files).forEach(f => {
    const url = URL.createObjectURL(f)
    form.files.push({ name: f.name, url })
  })
  input.value = ''
}

function removeFile(idx: number) {
  const f = form.files[idx]
  if (!f.preset) URL.revokeObjectURL(f.url)
  form.files.splice(idx, 1)
}

const error = computed(() => {
  if (!form.name.trim()) return '请输入人员名称'
  if (form.files.length === 0) return '请至少上传一张人脸图片'
  return ''
})

function close() {
  emit('update:open', false)
}

function submit() {
  if (error.value) return
  submitting.value = true
  emit('submit', {
    name: form.name.trim(),
    remark: form.remark.trim(),
    faces: form.files.map(f => f.url),
    faceBoxes: [],
    keyFocus: form.keyFocus
  })
  submitting.value = false
  close()
}
</script>

<template>
  <a-modal
    :open="open"
    :width="560"
    centered
    title="新增人员档案"
    @cancel="close"
  >
    <div class="add-form">
      <!-- 人脸上传 -->
      <div class="add-row">
        <label class="add-label">
          <span class="req">*</span>人脸图片
          <span class="add-label-hint">（至少一张，支持多张）</span>
        </label>
        <div class="add-faces">
          <div v-for="(f, i) in form.files" :key="i" class="add-face-item">
            <img :src="f.url" alt="人脸" />
            <button class="add-face-del" @click="removeFile(i)">
              <i class="i-ant-design-close-outlined" />
            </button>
          </div>
          <button class="add-face-upload" @click="fileInput?.click()">
            <i class="i-ant-design-plus-outlined" />
            <span>上传图片</span>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              multiple
              hidden
              @change="onFileChange"
            />
          </button>
        </div>
      </div>

      <!-- 名称 -->
      <div class="add-row">
        <label class="add-label"><span class="req">*</span>人员名称</label>
        <a-input v-model:value="form.name" placeholder="请输入人员名称" allow-clear />
      </div>

      <!-- 备注 -->
      <div class="add-row">
        <label class="add-label">备注说明</label>
        <a-textarea
          v-model:value="form.remark"
          placeholder="请输入备注（选填）"
          :rows="3"
          :maxlength="200"
          show-count
        />
      </div>

      <!-- 重点标记 -->
      <div class="add-row add-row--inline">
        <label class="add-label">设为重点关注</label>
        <a-switch v-model:checked="form.keyFocus" />
      </div>
    </div>

    <template #footer>
      <div class="add-footer">
        <span v-if="error" class="add-error">{{ error }}</span>
        <div>
          <button class="add-cancel" @click="close">取消</button>
          <button class="add-ok" :disabled="!!error || submitting" @click="submit">
            确定
          </button>
        </div>
      </div>
    </template>
  </a-modal>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.add-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 8px 4px 4px;
}

.add-row {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &--inline {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;

    .add-label { margin-bottom: 0; }
  }
}

.add-label {
  font-size: 13px;
  font-weight: 500;
  color: $text-base;
  display: flex;
  align-items: center;
  gap: 2px;
}

.add-label-hint {
  font-size: 12px;
  font-weight: 400;
  color: $text-muted;
}

.req {
  color: #ff4d4f;
  margin-right: 2px;
}

/* 人脸上传区 */
.add-faces {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.add-face-item {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid $border-color-card;
  background: #f0f0f0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.add-face-del {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  i { font-size: 12px; }
}

.add-face-upload {
  width: 96px;
  height: 96px;
  border: 1px dashed $border-color-input;
  border-radius: 8px;
  background: #fafbfc;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: $text-tertiary;
  transition: all 0.15s;

  i { font-size: 22px; }
  span { font-size: 12px; }

  &:hover {
    border-color: $color-primary;
    color: $color-primary;
    background: $color-primary-bg;
  }
}

/* 弹窗 footer */
.add-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.add-error {
  font-size: 12px;
  color: #ff4d4f;
}

.add-cancel,
.add-ok {
  height: 32px;
  padding: 0 18px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  margin-left: 8px;
  transition: all 0.15s;
}

.add-cancel {
  border: 1px solid $border-color-light;
  background: #fff;
  color: $text-secondary;

  &:hover { color: $color-primary; border-color: $color-primary; }
}

.add-ok {
  border: none;
  background: $color-primary;
  color: #fff;

  &:hover:not(:disabled) { background: $color-primary-hover; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}
</style>
