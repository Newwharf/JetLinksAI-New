<script setup lang="ts">
/**
 * 产品列表
 * 样式同设备列表，带分页，无操作列
 */
import { useRouter } from 'vue-router'
import { products, type Product } from './mock'

const router = useRouter()
const searchKey = ref('')
const pageSize = ref(10)
const currentPage = ref(1)

const filteredProducts = computed(() => {
  const kw = searchKey.value.trim().toLowerCase()
  if (!kw) return products
  return products.filter(p =>
    p.name.toLowerCase().includes(kw) ||
    p.vendor.toLowerCase().includes(kw) ||
    p.model.toLowerCase().includes(kw) ||
    p.scene.toLowerCase().includes(kw)
  )
})

const pagedProducts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredProducts.value.slice(start, start + pageSize.value)
})

watch([searchKey, pageSize], () => { currentPage.value = 1 })

function gotoDetail(product: Product) {
  router.push(`/iot/product/${product.id}`)
}
</script>

<template>
  <div class="pl-page">
    <!-- 工具栏 -->
    <div class="pl-toolbar">
      <a-input v-model:value="searchKey" class="pl-search" placeholder="搜索产品名称、厂商、型号、场景" allow-clear>
        <template #prefix><i class="i-ant-design-search-outlined" /></template>
      </a-input>
      <div class="pl-toolbar__right">
        <span class="pl-total">共 {{ filteredProducts.length }} 个产品</span>
      </div>
    </div>

    <!-- 表格 -->
    <div class="pl-table-wrap">
      <table class="pl-table">
        <thead>
          <tr>
            <th>产品名称</th>
            <th>设备类型</th>
            <th>属性个数</th>
            <th>接入方式</th>
            <th>所属场景</th>
            <th>厂商</th>
            <th>型号</th>
            <th>关联设备</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="prod in pagedProducts" :key="prod.id" @click="gotoDetail(prod)">
            <td>
              <div class="pl-product">
                <span class="pl-product__icon"><i class="i-ant-design-appstore-outlined" /></span>
                <span class="pl-product__text">
                  <button class="pl-product__name" type="button">{{ prod.name }}</button>
                  <small class="pl-product__sn">{{ prod.vendor }} · {{ prod.model }}</small>
                </span>
              </div>
            </td>
            <td>{{ prod.type }}</td>
            <td>{{ prod.propertyCount }}</td>
            <td>{{ prod.accessMethod }}</td>
            <td>{{ prod.scene }}</td>
            <td>{{ prod.vendor }}</td>
            <td>{{ prod.model }}</td>
            <td><strong class="pl-device-count">{{ prod.deviceCount }} 台</strong></td>
          </tr>
        </tbody>
      </table>
      <div v-if="filteredProducts.length === 0" class="pl-empty">
        <i class="i-ant-design-appstore-outlined pl-empty__icon" />
        <p>{{ searchKey ? '没有找到匹配的产品' : '暂无产品' }}</p>
      </div>
    </div>

    <!-- 分页 -->
    <div class="pl-pagination">
      <span class="pl-pagination__total">共 {{ filteredProducts.length }} 条</span>
      <div class="pl-pagination__right">
        <select v-model="pageSize" class="pl-page-size">
          <option :value="10">10 条/页</option>
          <option :value="20">20 条/页</option>
          <option :value="50">50 条/页</option>
        </select>
        <button class="pl-page-btn" :disabled="currentPage <= 1" @click="currentPage--"><i class="i-ant-design-left-outlined" /></button>
        <span class="pl-page-num">{{ currentPage }} / {{ Math.ceil(filteredProducts.length / pageSize) || 1 }}</span>
        <button class="pl-page-btn" :disabled="currentPage >= Math.ceil(filteredProducts.length / pageSize)" @click="currentPage++"><i class="i-ant-design-right-outlined" /></button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables' as *;

.pl-page { height: 100%; padding: 8px; display: flex; flex-direction: column; gap: 8px; overflow: hidden; }

.pl-toolbar { display: flex; align-items: center; gap: 12px; flex-shrink: 0;
  &__right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
}
.pl-search { width: 380px; }
.pl-total { font-size: 13px; color: $text-tertiary; }

.pl-table-wrap {
  flex: 1; overflow: auto; background: #fff; border-radius: 12px; overflow: hidden;
  scrollbar-width: none; -ms-overflow-style: none; &::-webkit-scrollbar { display: none; }
}
.pl-table {
  width: 100%; border-collapse: collapse; font-size: 13px;
  thead th {
    padding: 10px 12px; text-align: left; font-weight: 600; font-size: 12px; color: $text-secondary;
    background: $bg-page; border-bottom: 1px solid $border-color-card; white-space: nowrap; position: sticky; top: 0; z-index: 1;
  }
  tbody td { padding: 18px 12px; border-bottom: 1px solid $border-color-card; color: $text-secondary; vertical-align: middle; }
  tbody tr { cursor: pointer; transition: background 0.15s; &:hover { background: #faf9ff; } }
}

.pl-product { display: flex; align-items: center; gap: 8px; }
.pl-product__icon { width: 40px; height: 40px; border-radius: 10px; background: $color-primary-bg; color: $color-primary; display: flex; align-items: center; justify-content: center; flex-shrink: 0; i { font-size: 20px; } }
.pl-product__text { display: flex; flex-direction: column; }
.pl-product__name { border: none; background: transparent; color: $text-base; font-weight: 600; font-size: 14px; cursor: pointer; font-family: inherit; padding: 0; text-align: left; &:hover { color: $color-primary; } }
.pl-product__sn { font-size: 11px; color: $text-muted; }
.pl-device-count { color: $color-primary; }

.pl-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 80px 20px; color: $text-muted;
  &__icon { font-size: 48px; opacity: 0.3; } p { font-size: 14px; margin: 0; }
}

/* 分页 */
.pl-pagination { display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; padding: 8px 4px;
  &__total { font-size: 12px; color: $text-muted; }
  &__right { display: flex; align-items: center; gap: 8px; }
}
.pl-page-size { height: 28px; padding: 0 8px; border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary; font-size: 12px; font-family: inherit; cursor: pointer; &:focus { outline: none; border-color: $color-primary; } }
.pl-page-btn { width: 28px; height: 28px; border: 1px solid $border-color-light; border-radius: 6px; background: #fff; color: $text-secondary; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;
  &:hover:not(:disabled) { border-color: $color-primary; color: $color-primary; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
  i { font-size: 14px; }
}
.pl-page-num { font-size: 13px; color: $text-secondary; min-width: 56px; text-align: center; }
</style>
