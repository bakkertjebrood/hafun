<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({ layout: false })

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))

interface MarinaInfo {
  name: string
  slug: string
  logoUrl: string | null
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
  <div class="min-h-[100dvh] bg-white text-[#0A1520]">
    <header class="border-b border-black/[0.06]">
      <div class="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
        <NuxtLink :to="`/h/${slug}`" class="flex items-center gap-2">
          <img v-if="marina?.logoUrl" :src="marina.logoUrl" :alt="marina.name" class="h-8 w-auto" />
          <NautarMark v-else :size="24" />
          <span class="font-semibold tracking-tight">{{ marina?.name || 'Haven' }}</span>
        </NuxtLink>
      </div>
    </header>
    <main class="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div v-if="error || !marina?.selfService.waitlist.enabled" class="text-center py-20 text-[#5A6A78]">
        Deze flow is niet beschikbaar.
      </div>
      <WaitlistForm
        v-else
        :slug="slug"
        :marina="marina"
      />
    </main>
  </div>
</template>
