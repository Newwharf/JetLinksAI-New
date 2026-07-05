<script setup lang="ts">
/**
 * 区域树节点（递归）
 * 节点右侧：视联设备数 + 物联设备数 + 更多按钮
 */
import type { TreeNode } from './AreaView.vue'

const props = defineProps<{
  node: TreeNode
  selectedId: string
  depth?: number
}>()

const emit = defineEmits<{
  select: [id: string]
  toggle: [node: TreeNode]
  action: [action: string, node: TreeNode]
  rename: [node: TreeNode, newName: string]
}>()

const depth = props.depth ?? 0

// 更多按钮下拉
const moreOpen = ref(false)

// 行内重命名
const renaming = ref(false)
const renameInput = ref('')
const renameInputRef = ref<HTMLInputElement | null>(null)

function nodeIcon(node: TreeNode): string {
  if (node.type === 'park') return 'i-ant-design-apartment-outlined'
  if (node.type === 'building') return 'i-ant-design-home-outlined'
  if (node.type === 'floor') return 'i-ant-design-appstore-outlined'
  return 'i-ant-design-environment-outlined'
}

function handleAction(action: string) {
  moreOpen.value = false
  if (action === 'rename') {
    // 进入行内编辑模式
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

// 确认重命名
function confirmRename() {
  const newName = renameInput.value.trim()
  if (newName && newName !== props.node.label) {
    emit('rename', props.node, newName)
  }
  renaming.value = false
}

// 取消重命名
function cancelRename() {
  renaming.value = false
}

// 统计 tooltip 文案
const statTip = computed(() => {
  const v = props.node.videoCount ?? 0
  const i = props.node.iotCount ?? 0
  return `视频设备：${v} 个，物联设备：${i} 个`
})
</script>

<template>
  <div class="tree-node-wrap">
    <!-- 当前节点 -->
    <div
      class="tree-node"
      :class="{ selected: selectedId === node.id }"
      :style="{ paddingLeft: depth * 8 + 'px' }"
      @click="emit('select', node.id)"
    >
      <!-- 展开/折叠箭头 -->
      <i
        v-if="node.children?.length"
        class="node-arrow"
        :class="node.expanded ? 'i-ant-design-caret-down-filled' : 'i-ant-design-caret-right-filled'"
        @click.stop="emit('toggle', node)"
      />
      <span v-else class="node-arrow-placeholder" />

      <!-- 图标 -->
      <i :class="nodeIcon(node)" class="node-icon" />

      <!-- 名称（普通态） -->
      <span v-if="!renaming" class="node-label">{{ node.label }}</span>
      <!-- 名称（重命名编辑态） -->
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

      <!-- 右侧操作区 -->
      <div v-if="!renaming" class="node-right" @click.stop>
        <!-- 视联设备数 + 物联设备数：合并 tooltip -->
        <a-tooltip :title="statTip" placement="top">
          <span class="device-stat-group">
            <!-- 视联设备数 -->
            <span v-if="node.videoCount !== undefined" class="device-count video-count">
              <i class="i-ant-design-video-camera-outlined" />
              <span>{{ node.videoCount }}</span>
            </span>
            <!-- 物联设备数 -->
            <span v-if="node.iotCount !== undefined" class="device-count iot-count">
              <i class="i-ant-design-control-outlined" />
              <span>{{ node.iotCount }}</span>
            </span>
          </span>
        </a-tooltip>
        <!-- 更多按钮 -->
        <a-dropdown v-model:open="moreOpen" trigger="click" placement="bottomRight">
          <span class="more-btn">
            <i class="i-ant-design-more-outlined" />
          </span>
          <template #overlay>
            <a-menu>
              <a-menu-item key="add" @click="handleAction('add')">
                <i class="i-ant-design-plus-outlined" />
                <span>新增子节点</span>
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

    <!-- 子节点 -->
    <div v-if="node.expanded && node.children?.length" class="tree-children">
      <AreaTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :selected-id="selectedId"
        :depth="depth + 1"
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
  height: 30px;
  padding: 0 4px;
  margin-bottom: 2px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  color: $text-base;
  transition: background 0.15s;

  &:hover {
    background: $bg-hover;

    .node-right {
      opacity: 1;
    }
  }

  &.selected {
    background: rgb(245, 240, 255);
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

  // 右侧操作区
  .node-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;

    // 统计组合：作为 tooltip 触发区域
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
      // 固定宽度对齐
      min-width: 32px;

      i {
        font-size: 12px;
      }

      &.video-count i {
        color: #c0c4cc;
      }

      &.iot-count i {
        color: #c0c4cc;
      }
    }

    .more-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 4px;
      cursor: pointer;

      i {
        font-size: 14px;
        color: $text-secondary;
      }

      &:hover {
        background: rgba(0, 0, 0, 0.06);

        i {
          color: $text-base;
        }
      }
    }
  }
}

// 删除项红色
:deep(.danger-item) {
  color: #ff4d4f !important;

  i {
    color: #ff4d4f !important;
  }
}
</style>
