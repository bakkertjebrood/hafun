<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({ layout: 'embed' })

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

interface MarinaInfo {
  name: string
  slug: string
  accentColor: string | null
  selfService: {
    passant: { enabled: boolean; allowBerthPick: boolean; requirePayment: boolean }
    absence: { enabled: boolean }
    waitlist: { enabled: boolean; applicationFee: number | null; requireConsent: boolean }
  }
}

const { data: marina, error } = await useFetch<MarinaInfo>(
  () => `/api/public/${slug.value}/marina`,
  { key: () => `marina-${slug.value}` }
)
</script>

<template>
  <div v-if="error || !marina?.selfService.passant.enabled" class="text-center py-12 text-[#5A6A78]">
    Deze flow is niet beschikbaar.
  </div>
  <PassantWizard
    v-else
    :slug="slug"
    :marina="marina"
  />
</template>
