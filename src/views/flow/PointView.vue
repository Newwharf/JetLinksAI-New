<script setup lang="ts">
/**
 * 客流点位管理 - 1:1 复刻 flow-analysis/point
 * 页头 + 工具栏 + 点位列表表格
 * 注：UAT 账号无该页权限，按 JetLinks 标准列表页范式实现
 */
import { pointManageList } from './mock'

const searchKey = ref('')
const statusFilter = ref<'all' | 'online' | 'offline'>('all')

const filteredList = computed(() => {
  let list = pointManageList
  if (searchKey.value.trim()) {
    const k = searchKey.value.trim().toLowerCase()
    list = list.filter(r => r.name.toLowerCase().includes(k) || r.code.toLowerCase().includes(k) || r.area.toLowerCase().includes(k))
  }
  if (statusFilter.value !== 'all') {
    list = list.filter(r => r.status === statusFilter.value)
  }
  return list
})

const columns = [
  { title: '点位名称', dataIndex: 'name', ellipsis: true },
  { title: '点位编码', dataIndex: 'code', width: 160 },
  { title: '所属区域', dataIndex: 'area', ellipsis: true },
  { title: '绑定设备', dataIndex: 'device', width: 180 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '更新时间', dataIndex: 'updateTime', width: 160 },
  { title: '操作', dataIndex: 'action', width: 120, fixed: 'right' as const }
]

function statusTag(s: string) {
  return s === 'online' ? { text: '在线', color: 'success' } : { text: '离线', color: 'default' }
}
</script>

<template>
  <div class="flow-point-page">
    <!-- 页头 -->
    <header class="cloud-page-header">
      <div class="page-header__title">
        <h1>客流点位管理</h1>
        <span class="page-header__desc">管理客流统计点位，绑定摄像头设备并配置划线规则。</span>
      </div>
      <button class="page-header__add">
        <i class="i-ant-design-plus-outlined" />
        <span>新增点位</span>
      </button>
    </header>

    <!-- 工具栏 -->
    <section class="point-toolbar">
      <a-input
        v-model:value="searchKey"
        placeholder="按点位名称、编码或区域搜索"
        class="toolbar__search"
        allow-clear
      >
        <template #prefix>
          <i class="i-ant-design-search-outlined" />
        </template>
      </a-input>
      <a-segmented
        v-model:value="statusFilter"
        :options="[
          { label: '全部', value: 'all' },
          { label: '在线', value: 'online' },
          { label: '离线', value: 'offline' }
        ]"
      />
    </section>

    <!-- 表格 -->
    <section class="point-table-card">
      <a-table
        :columns="columns"
        :data-source="filteredList"
        :pagination="{ pageSize: 10, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` }"
        size="middle"
        row-key="key"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <a-tag :color="statusTag(record.status).color" style="margin: 0">
              <span class="status-dot" :class="record.status" />
              {{ statusTag(record.status).text }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'action'">
            <div class="cell-actions">
              <button class="action-btn">编辑</button>
              <button class="action-btn action-btn--danger">删除</button>
            </div>
          </template>
        </template>
      </a-table>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.flow-point-page {
  height: 100%;
  background: transparent;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
  color: $text-base;
}

/* 页头 */
.cloud-page-header {
  flex-shrink: 0;
  background: #fff;
  border-radius: 14px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header__title {
  display: flex;
  align-items: baseline;
  gap: 12px;

  h1 {
    margin: 0;
    font-size: 20px;
    font-weight: 650;
    color: $text-base;
  }

  .page-header__desc {
    font-size: 14px;
    color: $text-muted;
  }
}

.page-header__add {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 16px;
  border: none;
  border-radius: 6px;
  background: $color-primary;
  color: #fff;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s;

  i {
    font-size: 13px;
  }

  &:hover {
    background: $color-primary-hover;
  }
}

/* 工具栏 */
.point-toolbar {
  flex-shrink: 0;
  background: #fff;
  border-radius: 14px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.toolbar__search {
  width: 320px;
}

/* 表格卡片 */
.point-table-card {
  background: #fff;
  border-radius: 14px;
  padding: 4px 16px 16px;
}

/* 状态圆点 */
.status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 4px;
  vertical-align: middle;

  &.online {
    background: #52c41a;
  }

  &.offline {
    background: #bfbfbf;
  }
}

/* 操作按钮 */
.cell-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  height: 28px;
  padding: 0 10px;
  border: none;
  background: transparent;
  color: $color-primary;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;

  &:hover {
    background: $color-primary-bg;
  }

  &--danger {
    color: #ff4d4f;

    &:hover {
      background: rgba(255, 77, 79, 0.1);
    }
  }
}
</style>
