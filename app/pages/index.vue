<script setup lang="ts">
definePageMeta({
  middleware: [
    function () {
      return navigateTo('/dashboard')
    }
  ]
})
</script>

<template>
  <div>Redirecting...</div>
</template>
