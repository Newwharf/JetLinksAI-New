<script setup lang="ts">
/**
 * 工地管理 - 树节点（递归）
 * 省/市/区/工地 四级，只有区节点（level 3）才能新增工地
 */
import type { TreeNode } from './SiteManageView.vue'

const props = defineProps<{
  node: TreeNode
  selectedId: string
  depth?: number
  searchKey?: string
}>()

const emit = defineEmits<{
  select: [id: string]
  toggle: [node: TreeNode]
  action: [action: string, node: TreeNode]
  rename: [node: TreeNode, newName: string]
}>()

const depth = props.depth ?? 0
const moreOpen = ref(false)
const renaming = ref(false)
const renameInput = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)

function nodeIcon(node: TreeNode): string {
  if (node.type === 'province') return 'i-ant-design-global-outlined'
  if (node.type === 'city') return 'i-ant-design-bank-outlined'
  if (node.type === 'district') return 'i-ant-design-environment-outlined'
  return 'i-ant-design-tool-outlined' // site
}

// 只有区节点（level 3）才能新增工地
const canAddChild = computed(() => props.node.type === 'district')

// 点击节点：所有节点都可选中（高亮），省市区同时切换展开/收起
function onNodeClick() {
  emit('select', props.node.id)
  if (props.node.type !== 'site' && props.node.children?.length) {
    emit('toggle', props.node)
  }
}

function handleAction(action: string) {
  moreOpen.value = false
  if (action === 'rename') {
    renameInput.value = props.node.label
    renaming.value = true
    nextTick(() => {
      renameInputRef.value?.focus()
      renameInputRef.value?.select()
    })
    return
  }
  emit('action', action, props.node)
}

function confirmRename() {
  const newName = renameInput.value.trim()
  if (newName && newName !== props.node.label) {
    emit('rename', props.node, newName)
  }
  renaming.value = false
}

function cancelRename() {
  renaming.value = false
}

// 搜索高亮
const isMatch = computed(() => {
  const key = props.searchKey?.trim().toLowerCase()
  if (!key) return false
  return props.node.label.toLowerCase().includes(key)
})

const statTip = computed(() => {
  const v = props.node.videoCount ?? 0
  const i = props.node.iotCount ?? 0
  return `视频设备：${v} 个，物联设备：${i} 个`
})
</script>

<template>
  <div class="tree-node-wrap">
    <div
      class="tree-node"
      :class="{ selected: selectedId === node.id, matched: isMatch }"
      :style="{ paddingLeft: depth * 12 + 'px' }"
      @click="onNodeClick"
    >
      <i
        v-if="node.children?.length"
        class="node-arrow"
        :class="node.expanded ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'"
        @click.stop="emit('toggle', node)"
      />
      <span v-else class="node-arrow-placeholder" />

      <i :class="nodeIcon(node)" class="node-icon" />

      <span v-if="!renaming" class="node-label">{{ node.label }}</span>
      <a-input
        v-else
        ref="renameInputRef"
        v-model:value="renameInput"
        size="small"
        class="rename-input"
        @press-enter="confirmRename"
        @blur="confirmRename"
        @keydown.esc="cancelRename"
      />

      <div v-if="!renaming" class="node-right" @click.stop>
        <a-tooltip v-if="node.type === 'site'" :title="statTip" placement="top">
          <span class="device-stat-group">
            <span v-if="node.videoCount !== undefined" class="device-count">
              <i class="i-ant-design-video-camera-outlined" />
              <span>{{ node.videoCount }}</span>
            </span>
            <span v-if="node.iotCount !== undefined" class="device-count">
              <i class="i-ant-design-control-outlined" />
              <span>{{ node.iotCount }}</span>
            </span>
          </span>
        </a-tooltip>

        <a-dropdown v-model:open="moreOpen" trigger="click" placement="bottomRight">
          <span class="more-btn">
            <i class="i-ant-design-more-outlined" />
          </span>
          <template #overlay>
            <a-menu>
              <a-menu-item v-if="canAddChild" key="add" @click="handleAction('add')">
                <i class="i-ant-design-plus-outlined" />
                <span>新增工地</span>
              </a-menu-item>
              <a-menu-item key="rename" @click="handleAction('rename')">
                <i class="i-ant-design-edit-outlined" />
                <span>重命名</span>
              </a-menu-item>
              <a-menu-item key="move" @click="handleAction('move')">
                <i class="i-ant-design-drag-outlined" />
                <span>移动</span>
              </a-menu-item>
              <a-menu-item key="delete" class="danger-item" @click="handleAction('delete')">
                <i class="i-ant-design-delete-outlined" />
                <span>删除</span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </div>

    <div v-if="node.expanded && node.children?.length" class="tree-children">
      <SiteTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-id="selectedId"
        :depth="depth + 1"
        :search-key="searchKey"
        @select="emit('select', $event)"
        @toggle="emit('toggle', $event)"
        @action="(a, n) => emit('action', a, n)"
        @rename="(n, newName) => emit('rename', n, newName)"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  padding: 0 4px;
  margin-bottom: 2px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: $text-base;
  transition: background 0.15s;

  &:hover {
    background: $bg-hover;
    .node-right { opacity: 1; }
  }

  &.selected {
    background: rgb(245, 240, 255);
  }

  &.matched {
    background: #fff7e6;
  }

  .node-arrow {
    font-size: 10px;
    color: $text-muted;
    flex-shrink: 0;
    width: 14px;
    cursor: pointer;
  }

  .node-arrow-placeholder {
    width: 14px;
    flex-shrink: 0;
  }

  .node-icon {
    font-size: 14px;
    color: $text-secondary;
    flex-shrink: 0;
  }

  .node-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .rename-input {
    flex: 1;
    min-width: 0;
    height: 24px;
    font-size: 13px;
  }

  .node-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    opacity: 0;
    transition: opacity 0.15s;

    .device-stat-group {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: default;
    }

    .device-count {
      display: flex;
      align-items: center;
      gap: 2px;
      font-size: 12px;
      color: $text-tertiary;
      min-width: 32px;

      i { font-size: 12px; color: #c0c4cc; }
    }

    .more-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 4px;
      cursor: pointer;

      i { font-size: 14px; color: $text-secondary; }

      &:hover {
        background: rgba(0, 0, 0, 0.06);
        i { color: $text-base; }
      }
    }
  }
}

:deep(.danger-item) {
  color: #ff4d4f !important;
  i { color: #ff4d4f !important; }
}
</style>
