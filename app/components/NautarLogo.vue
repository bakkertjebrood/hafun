<script setup lang="ts">
withDefaults(defineProps<{
  size?: number
  ink?: string
  accent?: string
}>(), {
  size: 28,
  ink: '#0A1520',
  accent: '#00A9A5'
})
</script>

<template>
  <div class="inline-flex items-center" :style="{ gap: `${size * 0.42}px` }">
    <NautarMark :size="size * 1.55" :ink="ink" :accent="accent" />
    <span
      class="font-sans leading-none"
      :style="{
        fontSize: `${size}px`,
        fontWeight: 600,
        letterSpacing: '-0.8px',
        color: ink
      }"
    >Nautar</span>
  </div>
</template>
