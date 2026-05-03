<script setup lang="ts">
defineProps<{ mode: 'link' | 'iframe' | 'hosted' }>()
</script>

<template>
  <svg
    v-if="mode === 'link'"
    viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
  >
    <rect x="14" y="28" width="52" height="24" rx="12" fill="white" stroke="currentColor" stroke-width="2.5"/>
    <line x1="26" y1="40" x2="54" y2="40" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M32 40 L38 34 M32 40 L38 46" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
    <path d="M48 40 L42 34 M48 40 L42 46" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>

  <svg
    v-else-if="mode === 'iframe'"
    viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
  >
    <rect x="10" y="14" width="60" height="52" rx="6" fill="white" stroke="currentColor" stroke-width="2.5"/>
    <rect x="10" y="14" width="60" height="10" rx="6" fill="currentColor" opacity="0.15"/>
    <circle cx="16" cy="19" r="1.5" fill="currentColor" opacity="0.6"/>
    <circle cx="22" cy="19" r="1.5" fill="currentColor" opacity="0.6"/>
    <rect x="20" y="32" width="40" height="26" rx="3" fill="#F4ECDC" stroke="currentColor" stroke-width="2" stroke-dasharray="3 2"/>
    <text x="40" y="48" font-family="ui-sans-serif, system-ui" font-size="8" font-weight="700" fill="currentColor" text-anchor="middle">EMBED</text>
  </svg>

  <svg
    v-else
    viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
  >
    <path d="M16 36 L40 18 L64 36 L64 62 L16 62 Z" fill="white" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
    <rect x="34" y="46" width="12" height="16" fill="currentColor" opacity="0.85"/>
    <rect x="22" y="42" width="8" height="8" fill="#F4ECDC" stroke="currentColor" stroke-width="1.5"/>
    <rect x="50" y="42" width="8" height="8" fill="#F4ECDC" stroke="currentColor" stroke-width="1.5"/>
  </svg>
</template>
