<script setup lang="ts">
defineProps<{
  marinaName?: string
  hasPiers?: boolean
}>()
</script>

<template>
  <div class="absolute z-[600] inset-x-4 top-4 lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:max-w-md pointer-events-none">
    <div class="bg-white rounded-[16px] shadow-xl border border-black/[0.08] p-4 pointer-events-auto">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-[12px] bg-primary-500/10 text-primary-600 flex items-center justify-center shrink-0">
          <UIcon
            name="i-lucide-sparkles"
            class="size-5"
          />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-[#0A1520]">
            {{ hasPiers ? 'Werk je haven verder af' : 'Stel je haven in' }}
          </div>
          <p class="text-[12px] text-[#5A6A78] mt-0.5 leading-snug">
            {{ hasPiers
              ? 'AI vond al wat steigers. Loop ze door en pas waar nodig aan.'
              : 'Eén klik en de AI tekent de steigers en ligplaatsen voor je.' }}
          </p>
          <div class="mt-3 flex gap-2">
            <NuxtLink
              to="/onboarding"
              class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-primary-500 text-white text-[12px] font-semibold hover:bg-primary-600"
            >
              <UIcon
                name="i-lucide-wand-2"
                class="size-3.5"
              />
              {{ hasPiers ? 'Open wizard' : 'Start setup-wizard' }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
