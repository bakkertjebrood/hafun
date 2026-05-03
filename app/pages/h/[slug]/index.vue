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
  publicBio: string | null
  gpsLat: number | null
  gpsLng: number | null
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

const accentStyle = computed(() => marina.value?.accentColor
  ? { '--ss-accent': marina.value.accentColor } as Record<string, string>
  : {})
</script>

<template>
  <div :style="accentStyle" class="min-h-[100dvh] bg-white text-[#0A1520]">
    <header class="border-b border-black/[0.06]">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
        <img v-if="marina?.logoUrl" :src="marina.logoUrl" :alt="marina.name" class="h-8 w-auto" />
        <NautarMark v-else :size="24" />
        <span class="font-semibold tracking-tight">{{ marina?.name || 'Haven' }}</span>
      </div>
    </header>

    <main class="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div v-if="error" class="text-center py-20 text-[#5A6A78]">
        Deze haven is niet gevonden.
      </div>
      <template v-else-if="marina">
        <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight">{{ marina.name }}</h1>
        <p v-if="marina.publicBio" class="mt-3 text-[#2D3E4A] max-w-2xl">{{ marina.publicBio }}</p>

        <div class="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NuxtLink
            v-if="marina.selfService.passant.enabled"
            :to="`/h/${marina.slug}/passant`"
            class="group rounded-2xl border border-black/[0.08] p-6 hover:border-[var(--ss-accent,#00A9A5)] transition-colors"
          >
            <PassantQR class="size-12 text-[var(--ss-accent,#00A9A5)] mb-3" />
            <div class="font-semibold tracking-tight">Boek als passant</div>
            <p class="mt-1 text-sm text-[#2D3E4A]">Reserveer een ligplaats voor één of meer nachten.</p>
          </NuxtLink>

          <NuxtLink
            v-if="marina.selfService.waitlist.enabled"
            :to="`/h/${marina.slug}/wachtlijst`"
            class="group rounded-2xl border border-black/[0.08] p-6 hover:border-[var(--ss-accent,#00A9A5)] transition-colors"
          >
            <WaitlistSignup class="size-12 text-[var(--ss-accent,#00A9A5)] mb-3" />
            <div class="font-semibold tracking-tight">Schrijf je in voor de wachtlijst</div>
            <p class="mt-1 text-sm text-[#2D3E4A]">Voor een vaste ligplaats — we nemen contact op.</p>
          </NuxtLink>
        </div>

        <div v-if="!marina.selfService.passant.enabled && !marina.selfService.waitlist.enabled" class="mt-10 text-[#5A6A78]">
          Deze haven gebruikt nog geen self-service. Neem contact op met de havenmeester.
        </div>
      </template>
    </main>
  </div>
</template>
