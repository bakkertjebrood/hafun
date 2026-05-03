<script setup lang="ts">
import { onMounted, onUnmounted, nextTick } from 'vue'

// Notify the parent window of our content height so it can resize the iframe.
function postHeight() {
  const height = document.documentElement.scrollHeight
  try {
    window.parent.postMessage({ type: 'hafun:resize', height }, '*')
  } catch {
    // Cross-origin parent without listener — ignore.
  }
}

let observer: ResizeObserver | null = null

onMounted(() => {
  nextTick(postHeight)
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(() => postHeight())
    observer.observe(document.documentElement)
  }
  window.addEventListener('load', postHeight)
})

onUnmounted(() => {
  observer?.disconnect()
  observer = null
  window.removeEventListener('load', postHeight)
})
</script>

<template>
  <div class="min-h-[100dvh] bg-white text-[#0A1520]">
    <main class="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <slot />
    </main>
  </div>
</template>
