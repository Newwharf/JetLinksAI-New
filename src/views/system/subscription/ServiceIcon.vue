<script setup lang="ts">
/**
 * 订阅服务图标 - 线性 SVG 图标集
 */
const props = defineProps<{ name: string }>()

const iconPaths: Record<string, string> = {
  users: '<circle cx="7" cy="7" r="2.5"/><circle cx="14" cy="8" r="2"/><path d="M2.5 16c0-2.8 2-4.8 4.8-4.8S12 13.2 12 16"/><path d="M12.2 15.6c.2-1.9 1.7-3.4 3.8-3.4 1.1 0 2 .3 2.8.9"/>',
  chip: '<rect x="5" y="5" width="10" height="10" rx="2"/><path d="M8 8h4v4H8z"/><path d="M7 2v3M10 2v3M13 2v3M7 15v3M10 15v3M13 15v3M2 7h3M2 10h3M2 13h3M15 7h3M15 10h3M15 13h3"/>',
  bell: '<path d="M10 3.5a4 4 0 0 0-4 4V10L4.8 12h10.4L14 10V7.5a4 4 0 0 0-4-4Z"/><path d="M8.5 14.5a1.5 1.5 0 0 0 3 0"/>',
  gateway: '<rect x="3" y="5" width="14" height="10" rx="2"/><path d="M6 8h4M6 11h3"/><circle cx="14" cy="10" r="1"/>',
  spark: '<path d="M10 2.5 7.8 7.8 2.5 10l5.3 2.2L10 17.5l2.2-5.3 5.3-2.2-5.3-2.2L10 2.5Z"/>',
  screen: '<rect x="3" y="4" width="14" height="10" rx="2"/><path d="M7 17h6M10 14v3"/>',
  map: '<path d="m3 5 4-2 6 2 4-2v12l-4 2-6-2-4 2V5Z"/><path d="M7 3v12M13 5v12"/>',
  route: '<circle cx="5" cy="5" r="2"/><circle cx="15" cy="15" r="2"/><path d="M6.5 6.5c2 0 2.5 2 4.5 2s2.5-2 2.5-4"/><path d="M13.5 13.5c-2 0-2.5-2-4.5-2S6.5 13.5 6.5 15"/>',
  camera: '<rect x="3" y="6" width="10" height="8" rx="2"/><path d="m13 9 4-2v6l-4-2z"/><circle cx="8" cy="10" r="2"/>',
  shield: '<path d="M10 3 5.5 4.8v4.6c0 3.2 1.9 5.7 4.5 6.6 2.6-.9 4.5-3.4 4.5-6.6V4.8L10 3Z"/>',
  grid: '<rect x="3" y="3" width="5" height="5" rx="1"/><rect x="12" y="3" width="5" height="5" rx="1"/><rect x="3" y="12" width="5" height="5" rx="1"/><rect x="12" y="12" width="5" height="5" rx="1"/>',
  layout: '<rect x="3" y="4" width="14" height="12" rx="2"/><path d="M3 9h14M8 9v7"/>',
  clipboard: '<rect x="5" y="4" width="10" height="13" rx="2"/><path d="M8 4.5h4M8 8h4M8 11h4"/>',
  archive: '<path d="M4 5h12v3H4z"/><path d="M5.5 8v7.5h9V8"/><path d="M8 11h4"/>'
}
</script>

<template>
  <svg
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    v-html="iconPaths[props.name] || iconPaths.spark"
  />
</template>
