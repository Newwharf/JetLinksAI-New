<script setup lang="ts">
/**
 * 文搜图 - 1:1 复刻 video/text-search
 * 页头 + (左侧筛选栏 260px + 右侧内容：工具栏 + 日期分组结果网格)
 */
import FilterSidebar from './FilterSidebar.vue'
import ResultCard from './ResultCard.vue'
import { buildResults } from './mock'

const searchKey = ref('')
const results = buildResults()

// 按日期分组（mock：全部归到"今天"）
const groups = computed(() => [
  { title: '今天', date: '2026.07.02', cards: results }
])
</script>

<template>
  <div class="text-search-page">
    <!-- 页头 -->
    <header class="page-header">
      <div class="page-header__title">
        <i class="i-ant-design-file-image-outlined page-header__icon" />
        <h1>文搜图</h1>
        <span class="page-header__desc">使用自然语言描述检索边缘报警、识别事件与录像库中的关键画面。</span>
      </div>
    </header>

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
              <ResultCard v-for="card in g.cards" :key="card.id" :data="card" />
            </div>
          </section>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.text-search-page {
  height: 100%;
  background: $bg-page;
  padding: 0 20px 12px;
  overflow-y: auto;
}

/* 页头 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0 16px;
  margin-bottom: 16px;
}

.page-header__title {
  display: flex;
  align-items: center;
  gap: 12px;

  .page-header__icon {
    font-size: 18px;
    color: $text-base;
  }

  h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
    color: $text-base;
  }

  .page-header__desc {
    margin-left: 4px;
    font-size: 14px;
    color: $text-muted;
  }
}

/* 主体布局 */
.vbt {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.vbt__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
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
</style>
