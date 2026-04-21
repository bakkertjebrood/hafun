<script setup lang="ts">
withDefaults(defineProps<{
  size?: number
  ink?: string
  accent?: string
}>(), {
  size: 56,
  ink: '#0A1520',
  accent: '#00A9A5'
})
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 56 56">
    <!-- three flowing arcs — tide / wake -->
    <path
      d="M8 36 Q 18 24, 28 36 T 48 36"
      fill="none"
      :stroke="accent"
      stroke-width="3"
      stroke-linecap="round"
    />
    <path
      d="M8 26 Q 18 14, 28 26 T 48 26"
      fill="none"
      :stroke="ink"
      stroke-width="3"
      stroke-linecap="round"
    />
    <!-- dot -->
    <circle cx="48" cy="26" r="2.6" :fill="accent" />
  </svg>
</template>
