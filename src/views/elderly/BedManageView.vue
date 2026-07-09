<script setup lang="ts">
/**
 * 老人床位管理
 * 空间区域列表：楼栋→楼层→房间（可展开/收起）
 * 任意节点都可查看/修改床位数
 */
import { roomTree, type RoomNode } from './bed.mock'

// 用 ref 包一份树，让床位数可编辑
const tree = ref<RoomNode[]>(JSON.parse(JSON.stringify(roomTree)))

// 计算非叶子节点的 bedCount（子节点合计）
function calcNodeBedCount(node: RoomNode): number {
  if (!node.children?.length) return node.bedCount ?? 0
  return node.children.reduce((sum, c) => sum + calcNodeBedCount(c), 0)
}

// 展开状态（默认楼栋+楼层展开）
const expandedKeys = ref<Set<string>>(new Set())
function initExpanded(nodes: RoomNode[], depth = 0) {
  for (const n of nodes) {
    if (n.children?.length) {
      if (depth < 2) expandedKeys.value.add(n.value)
      initExpanded(n.children, depth + 1)
    }
  }
}
initExpanded(tree.value)

function toggleExpand(value: string) {
  const s = expandedKeys.value
  if (s.has(value)) s.delete(value)
  else s.add(value)
}

// 收集所有非叶子节点 value
function collectAllKeys(nodes: RoomNode[]): string[] {
  const keys: string[] = []
  for (const n of nodes) {
    if (n.children?.length) {
      keys.push(n.value)
      keys.push(...collectAllKeys(n.children))
    }
  }
  return keys
}

const allKeys = collectAllKeys(tree.value)

// 是否全部展开
const allExpanded = computed(() => allKeys.every(k => expandedKeys.value.has(k)))

function expandAll() {
  expandedKeys.value = new Set(allKeys)
}

function collapseAll() {
  expandedKeys.value = new Set()
}

// ===== 搜索 =====
const searchKey = ref('')

// 判断节点或其子树是否匹配
function nodeMatches(node: RoomNode, key: string): boolean {
  if (node.label.toLowerCase().includes(key)) return true
  if (node.children) return node.children.some(c => nodeMatches(c, key))
  return false
}

// 过滤后的树
const filteredTree = computed(() => {
  const k = searchKey.value.trim().toLowerCase()
  if (!k) return tree.value
  return tree.value
    .filter(n => nodeMatches(n, k))
    .map(n => filterNode(n, k))
})

function filterNode(node: RoomNode, key: string): RoomNode {
  if (!node.children?.length) return node
  const children = node.children
    .filter(c => nodeMatches(c, key))
    .map(c => filterNode(c, key))
  return { ...node, children }
}

// 搜索时自动展开所有节点
watch(searchKey, (v) => {
  if (v.trim()) {
    // 展开所有有子节点的
    function expandAll(nodes: RoomNode[]) {
      for (const n of nodes) {
        if (n.children?.length) {
          expandedKeys.value.add(n.value)
          expandAll(n.children)
        }
      }
    }
    expandAll(tree.value)
  }
})

// ===== 编辑床位数 =====
const editingValue = ref<string | null>(null)
const editInput = ref(0)

function startEdit(node: RoomNode) {
  editingValue.value = node.value
  editInput.value = node.bedCount ?? calcNodeBedCount(node)
}

function confirmEdit(node: RoomNode) {
  if (editInput.value < 0) editInput.value = 0
  node.bedCount = editInput.value
  editingValue.value = null
}

function cancelEdit() {
  editingValue.value = null
}
</script>

<template>
  <div class="bm-page">
    <div class="bm-card">
      <!-- 搜索栏 -->
      <header class="bm-toolbar">
        <div class="bm-search">
          <i class="i-ant-design-search-outlined" />
          <input
            v-model="searchKey"
            placeholder="搜索楼栋、楼层或房间"
          />
        </div>
        <button class="bm-expand-btn" @click="allExpanded ? collapseAll() : expandAll()">
          <i :class="allExpanded ? 'i-ant-design-fold-outlined' : 'i-ant-design-unfold-outlined'" />
          {{ allExpanded ? '全部收起' : '全部展开' }}
        </button>
      </header>

      <!-- 区域列表 -->
      <div class="bm-list scroll-thin">
        <template v-for="building in filteredTree" :key="building.value">
          <!-- 楼栋 -->
          <div class="bm-node-row level-0" @click="toggleExpand(building.value)">
            <i
              class="i-ant-design-caret-down-filled bm-caret"
              :class="{ collapsed: !expandedKeys.has(building.value) }"
            />
            <i class="i-ant-design-bank-outlined bm-node-icon" />
            <span class="bm-node-label">{{ building.label }}</span>
            <div class="bm-node-right">
              <template v-if="editingValue === building.value">
                <span class="bm-edit-label">床位数</span>
                <a-input-number v-model:value="editInput" :min="0" :max="999" size="small" style="width: 80px" @press-enter="confirmEdit(building)" />
                <button class="bm-btn-ok" @click.stop="confirmEdit(building)"><i class="i-ant-design-check-outlined" /></button>
                <button class="bm-btn-cancel" @click.stop="cancelEdit"><i class="i-ant-design-close-outlined" /></button>
              </template>
              <template v-else>
                <span class="bm-bed-count">{{ calcNodeBedCount(building) }} 床</span>
                <button class="bm-edit-btn" @click.stop="startEdit(building)"><i class="i-ant-design-edit-outlined" />修改</button>
              </template>
            </div>
          </div>

          <template v-if="expandedKeys.has(building.value)">
            <template v-for="floor in building.children" :key="floor.value">
              <!-- 楼层 -->
              <div class="bm-node-row level-1" @click="toggleExpand(floor.value)">
                <i
                  class="i-ant-design-caret-down-filled bm-caret"
                  :class="{ collapsed: !expandedKeys.has(floor.value) }"
                />
                <i class="i-ant-design-appstore-outlined bm-node-icon" />
                <span class="bm-node-label">{{ floor.label }}</span>
                <div class="bm-node-right">
                  <template v-if="editingValue === floor.value">
                    <span class="bm-edit-label">床位数</span>
                    <a-input-number v-model:value="editInput" :min="0" :max="999" size="small" style="width: 80px" @press-enter="confirmEdit(floor)" />
                    <button class="bm-btn-ok" @click.stop="confirmEdit(floor)"><i class="i-ant-design-check-outlined" /></button>
                    <button class="bm-btn-cancel" @click.stop="cancelEdit"><i class="i-ant-design-close-outlined" /></button>
                  </template>
                  <template v-else>
                    <span class="bm-bed-count">{{ calcNodeBedCount(floor) }} 床</span>
                    <button class="bm-edit-btn" @click.stop="startEdit(floor)"><i class="i-ant-design-edit-outlined" />修改</button>
                  </template>
                </div>
              </div>

              <template v-if="expandedKeys.has(floor.value)">
                <!-- 房间 -->
                <div
                  v-for="room in floor.children"
                  :key="room.value"
                  class="bm-node-row level-2"
                >
                  <span class="bm-leaf-spacer" />
                  <i class="i-ant-design-home-outlined bm-node-icon room-icon" />
                  <span class="bm-node-label room-label">{{ room.label }}</span>
                  <div class="bm-node-right">
                    <template v-if="editingValue === room.value">
                      <span class="bm-edit-label">床位数</span>
                      <a-input-number v-model:value="editInput" :min="0" :max="99" size="small" style="width: 80px" @press-enter="confirmEdit(room)" />
                      <button class="bm-btn-ok" @click.stop="confirmEdit(room)"><i class="i-ant-design-check-outlined" /></button>
                      <button class="bm-btn-cancel" @click.stop="cancelEdit"><i class="i-ant-design-close-outlined" /></button>
                    </template>
                    <template v-else>
                      <span class="bm-bed-count" :class="{ zero: (room.bedCount ?? 0) === 0 }">{{ room.bedCount ?? 0 }} 床</span>
                      <button class="bm-edit-btn" @click.stop="startEdit(room)"><i class="i-ant-design-edit-outlined" />修改</button>
                    </template>
                  </div>
                </div>
              </template>
            </template>
          </template>
        </template>

        <div v-if="filteredTree.length === 0" class="bm-empty">
          <i class="i-ant-design-search-outlined" />
          <p>没有找到匹配的空间</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.bm-page {
  height: 100%;
  background: $bg-page;
  padding: 12px 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== 合并卡片 ===== */
.bm-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid $border-color-card;
  border-radius: 12px;
  overflow: hidden;
}

/* ===== 搜索栏 ===== */
.bm-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid $border-color-card;
  flex-shrink: 0;
}

.bm-search {
  position: relative;
  width: 320px;

  i {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: $text-muted;
  }

  input {
    width: 100%;
    height: 34px;
    padding: 0 12px 0 36px;
    border: 1px solid $border-color-input;
    border-radius: 6px;
    background: $bg-page;
    font-size: 13px;
    font-family: inherit;
    color: $text-base;
    outline: none;
    transition: border-color 0.2s;

    &::placeholder { color: $text-muted; }
    &:focus { border-color: $color-primary; }
  }
}

.bm-expand-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 5px;
  height: 32px;
  padding: 0 14px;
  border: 1px solid #d9cfff;
  border-radius: 6px;
  background: #f5f0ff;
  color: $color-primary;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  i { font-size: 14px; }

  &:hover {
    background: $color-primary;
    color: #fff;
    border-color: $color-primary;
  }
}

/* ===== 区域列表 ===== */
.bm-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 8px 0;
}

/* 通用节点行 */
.bm-node-row {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;

  &:hover {
    background: #fafaff;
  }

  &:not(:last-child) {
    border-bottom: 1px solid #f8f8fa;
  }

  &.level-1 { padding-left: 44px; }
  &.level-2 { padding-left: 72px; cursor: default; }
}

.bm-caret {
  font-size: 10px;
  color: $text-muted;
  transition: transform 0.2s;
  flex-shrink: 0;

  &.collapsed { transform: rotate(-90deg); }
}

.bm-leaf-spacer {
  width: 14px;
  flex-shrink: 0;
}

.bm-node-icon {
  font-size: 15px;
  color: $color-primary;
  flex-shrink: 0;
}

.room-icon {
  font-size: 14px;
  color: $text-tertiary;
}

.bm-node-label {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: $text-base;
}

.room-label {
  font-size: 13px;
  font-weight: 400;
  color: $text-secondary;
}

/* 右侧：床位数 + 编辑 */
.bm-node-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.bm-bed-count {
  font-size: 13px;
  font-weight: 600;
  color: $color-primary;
  padding: 2px 10px;
  background: $color-primary-bg;
  border-radius: 4px;
  min-width: 48px;
  text-align: center;

  &.zero {
    color: $text-muted;
    background: $bg-hover;
  }
}

.bm-edit-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 10px;
  border: 1px solid #d9cfff;
  border-radius: 4px;
  background: #f5f0ff;
  color: $color-primary;
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;

  i { font-size: 12px; }

  &:hover {
    background: $color-primary;
    color: #fff;
    border-color: $color-primary;
  }
}

.bm-edit-label {
  font-size: 12px;
  color: $text-tertiary;
}

.bm-btn-ok,
.bm-btn-cancel {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  i { font-size: 12px; }
}

.bm-btn-ok {
  background: $color-primary;
  color: #fff;
  &:hover { background: $color-primary-hover; }
}

.bm-btn-cancel {
  background: $bg-hover;
  color: $text-muted;
  &:hover { background: #ff4d4f; color: #fff; }
}

/* 空态 */
.bm-empty {
  text-align: center;
  padding: 60px 0;
  color: $text-muted;

  i { font-size: 36px; opacity: 0.4; }
  p { font-size: 13px; margin: 8px 0 0; }
}
</style>
