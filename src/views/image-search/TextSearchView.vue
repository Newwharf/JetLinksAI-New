<script setup lang="ts">
/**
 * 文搜图 - 1:1 复刻 video/text-search
 * 页头 + (左侧筛选栏 260px + 右侧内容：工具栏 + 日期分组结果网格)
 */
import FilterSidebar from './FilterSidebar.vue'
import ResultCard from './ResultCard.vue'
import PersonProfileAddModal from './PersonProfileAddModal.vue'
import { buildResults, type ResultCard as ResultCardData } from './mock'
import { usePersonProfileStore } from '@/stores/person-profile'
import { type PersonProfile } from './person-profile.mock'
import { message } from 'ant-design-vue'

const searchKey = ref('')
const results = buildResults()

// 按日期分组（mock：全部归到"今天"）
const groups = computed(() => [
  { title: '今天', date: '2026.07.02', cards: results }
])

// 大图预览
const previewData = ref<ResultCardData | null>(null)
const previewVisible = ref(false)

function handlePreview(data: ResultCardData) {
  previewData.value = data
  previewVisible.value = true
}

// 卡片菜单 → 添加到人员档案
const profileStore = usePersonProfileStore()
const addProfileVisible = ref(false)
const addProfilePreset = ref<string[]>([])

function handleMenu(key: string, data: ResultCardData) {
  if (key === 'add-profile') {
    addProfilePreset.value = [data.img]
    addProfileVisible.value = true
  } else if (key === 'trace') {
    message.success('已添加到临时轨迹跟踪')
  }
}

function handleSubmitProfile(data: Omit<PersonProfile, 'id' | 'createdAt' | 'lastSeenAt' | 'lastSeenCamera' | 'lastSeenArea' | 'eventCount' | 'events' | 'weekHeat'>) {
  profileStore.addProfile({
    id: `pf-new-${Date.now()}`,
    createdAt: '2026-07-08',
    lastSeenAt: '—',
    lastSeenCamera: '—',
    lastSeenArea: '—',
    eventCount: 0,
    events: [],
    weekHeat: Array.from({ length: 7 }, () => new Array(24).fill(0)),
    ...data
  })
  message.success('已添加到人员档案')
}
</script>

<template>
  <div class="text-search-page">
    <!-- 主体：筛选侧栏 + 内容 -->
    <section class="vbt">
      <FilterSidebar />

      <div class="vbt__content">
        <!-- 工具栏：搜索框 + 检索按钮 -->
        <header class="vbt__toolbar">
          <div class="vbt__search">
            <i class="i-ant-design-search-outlined vbt__search-icon" />
            <input
              v-model="searchKey"
              class="vbt__search-input"
              placeholder="按人员或车辆特征搜索，例如：白衣背包男子，或蓝色 SUV"
            />
          </div>
          <button class="vbt__search-btn">检 索</button>
        </header>

        <!-- 结果分组 -->
        <div class="vbt__groups">
          <section v-for="(g, gi) in groups" :key="gi" class="vbt__group">
            <header class="vbt__group-head">
              <h3>{{ g.title }}</h3>
              <span>{{ g.date }}</span>
            </header>
            <div class="vbt__grid">
              <ResultCard v-for="card in g.cards" :key="card.id" :data="card" @preview="handlePreview" @menu="handleMenu" />
            </div>
          </section>
        </div>
      </div>
    </section>

    <!-- 大图预览弹窗 -->
    <a-modal
      :open="previewVisible"
      :width="900"
      :footer="null"
      centered
      @cancel="previewVisible = false"
    >
      <div class="preview-modal" v-if="previewData">
        <div class="preview-img-wrap">
          <img :src="previewData.img" class="preview-img" alt="大图" />
          <div
            v-for="(b, i) in previewData.bboxes"
            :key="i"
            class="preview-bbox"
            :style="{ left: b.x + '%', top: b.y + '%', width: b.w + '%', height: b.h + '%' }"
          />
        </div>
        <div class="preview-meta">
          <div class="preview-title">{{ previewData.title }}</div>
          <div class="preview-info">
            <span class="preview-location">
              <i class="i-ant-design-environment-outlined" />{{ previewData.location }}
            </span>
            <span class="preview-time">
              <i class="i-ant-design-clock-circle-outlined" />{{ previewData.time }}
            </span>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 添加到人员档案弹窗 -->
    <PersonProfileAddModal
      v-model:open="addProfileVisible"
      :preset-faces="addProfilePreset"
      @submit="handleSubmitProfile"
    />

  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.text-search-page {
  height: 100%;
  background: $bg-page;
  padding: 12px 20px;
  display: flex;
  overflow: hidden;
}

/* 主体布局 */
.vbt {
  display: flex;
  align-items: stretch;
  gap: 16px;
  width: 100%;
  height: 100%;
  min-height: 0;
}

/* 左侧筛选栏：固定不滚动 */
.vbt > :first-child {
  flex-shrink: 0;
  align-self: flex-start;
  position: sticky;
  top: 0;
}

.vbt__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
}

/* 工具栏 */
.vbt__toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.vbt__search {
  position: relative;
  flex: 1;

  .vbt__search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 14px;
    color: $text-muted;
    z-index: 1;
  }

  .vbt__search-input {
    width: 100%;
    height: 42px;
    padding: 4px 11px 4px 36px;
    border: 1px solid rgb(235, 237, 240);
    border-radius: 6px;
    background: #fff;
    font-size: 14px;
    color: $text-base;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;

    &::placeholder {
      color: $text-muted;
    }

    &:focus {
      border-color: $color-primary;
    }
  }
}

.vbt__search-btn {
  height: 32px;
  padding: 0 15px;
  border: none;
  border-radius: 6px;
  background: $color-primary;
  color: #fff;
  font-size: 14px;
  cursor: pointer;
  font-family: inherit;
  flex-shrink: 0;
  transition: background 0.2s;

  &:hover {
    background: $color-primary-hover;
  }
}

/* 结果分组 */
.vbt__groups {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.vbt__group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.vbt__group-head {
  display: flex;
  flex-direction: column;
  gap: 3px;

  h3 {
    margin: 0;
    font-size: 22px;
    font-weight: 500;
    color: $text-base;
  }

  span {
    font-size: 14px;
    color: $text-muted;
  }
}

/* 结果网格：auto-fill + 1fr，min 256px。
   UAT 在 1366px 内容区放 5 列（每列 ~263.6px）；
   min 设 256 保证在 ~1365px 时也能排到 5 列并自适应拉伸。*/
.vbt__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(256px, 1fr));
  gap: 12px;
}

/* 大图预览弹窗 */
.preview-modal {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-img-wrap {
  position: relative;
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
  background: #1a1a2e;
}

.preview-img {
  width: 100%;
  max-height: 60vh;
  object-fit: contain;
  display: block;
}

.preview-bbox {
  position: absolute;
  border: 2px solid rgb(52, 199, 89);
  box-sizing: border-box;
  pointer-events: none;
}

.preview-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-title {
  font-size: 16px;
  font-weight: 600;
  color: $text-base;
}

.preview-info {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: $text-tertiary;

  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  i {
    font-size: 13px;
  }
}
</style>
