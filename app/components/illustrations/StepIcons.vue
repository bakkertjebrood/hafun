<template>
  <!-- 01: Account / persoon + checkmark -->
  <svg
    v-if="step === 1"
    viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
  >
    <circle cx="32" cy="28" r="10" fill="#F4ECDC" stroke="currentColor" stroke-width="2.5"/>
    <path d="M14 60 Q14 44 32 44 T50 60" fill="white" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="56" cy="52" r="14" fill="currentColor"/>
    <path d="M48 52 L54 58 L64 46" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>

  <!-- 02: Pen tekent steiger op kaart -->
  <svg
    v-else-if="step === 2"
    viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
  >
    <rect x="8" y="14" width="56" height="44" rx="6" fill="#EAF2F4" stroke="currentColor" stroke-width="2"/>
    <path d="M14 32 Q24 28 34 32 T58 32" stroke="currentColor" stroke-width="1.4" fill="none" opacity="0.5" stroke-dasharray="3 3"/>
    <line x1="20" y1="46" x2="48" y2="46" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
    <rect x="22" y="40" width="8" height="6" rx="1" fill="currentColor"/>
    <rect x="34" y="40" width="8" height="6" rx="1" fill="#F4ECDC" stroke="currentColor" stroke-width="1.2"/>
    <!-- Pen -->
    <g transform="translate(50 36) rotate(35)">
      <rect x="0" y="0" width="22" height="6" rx="1" fill="white" stroke="currentColor" stroke-width="2"/>
      <path d="M22 0 L30 3 L22 6 Z" fill="currentColor"/>
    </g>
  </svg>

  <!-- 03: Lift-off / live -->
  <svg
    v-else
    viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
  >
    <path d="M40 12 C30 22 26 36 30 50 L50 50 C54 36 50 22 40 12 Z" fill="white" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
    <circle cx="40" cy="32" r="5" fill="#F4ECDC" stroke="currentColor" stroke-width="2"/>
    <path d="M30 50 L26 60 L34 56 Z" fill="currentColor"/>
    <path d="M50 50 L54 60 L46 56 Z" fill="currentColor"/>
    <path d="M40 56 L36 70" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
    <path d="M40 58 L44 70" stroke="#F59E0B" stroke-width="3" stroke-linecap="round"/>
  </svg>
</template>

<script setup lang="ts">
defineProps<{ step: 1 | 2 | 3 }>()
</script>
