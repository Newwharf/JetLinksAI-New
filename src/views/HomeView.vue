<script setup lang="ts">
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="h-14 flex-between px-6 bg-white shadow-sm dark:bg-#1d1e1f">
      <div class="flex items-center gap-2">
        <i class="i-ep-cpu text-2xl text-primary" />
        <span class="font-bold text-lg">JetLinks AI</span>
      </div>
      <el-button :icon="appStore.darkMode ? 'Sunny' : 'Moon'" circle @click="appStore.toggleDark" />
    </header>

    <main class="flex-1 p-6">
      <el-card class="max-w-3xl mx-auto">
        <template #header>
          <div class="flex-between">
            <span class="font-semibold">原型已就绪 🎉</span>
            <el-tag type="success">Vue3 + TS + Element Plus</el-tag>
          </div>
        </template>

        <p class="mb-4 c-gray-500">技术栈已配置完成，可以开始开发了。建议从 <code>src/views/</code> 新增页面。</p>

        <el-descriptions :column="1" border>
          <el-descriptions-item label="框架">Vue 3.4 + Composition API</el-descriptions-item>
          <el-descriptions-item label="语言">TypeScript (strict)</el-descriptions-item>
          <el-descriptions-item label="UI 库">Element Plus (按需自动导入)</el-descriptions-item>
          <el-descriptions-item label="路由">Vue Router 4</el-descriptions-item>
          <el-descriptions-item label="状态">Pinia</el-descriptions-item>
          <el-descriptions-item label="样式">UnoCSS (原子化) + SCSS</el-descriptions-item>
        </el-descriptions>
      </el-card>
    </main>
  </div>
</template>
