<script setup lang="ts">
defineProps<{
  marinaName?: string
  hasPiers?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: 'scan'): void
  (e: 'dismiss'): void
}>()
</script>

<template>
  <div class="absolute z-[1100] inset-x-3 top-3 lg:top-4 lg:inset-x-auto lg:left-1/2 lg:-translate-x-1/2 lg:max-w-md pointer-events-none">
    <div class="bg-white rounded-[16px] shadow-xl border border-black/[0.08] p-3.5 pointer-events-auto">
      <div class="flex items-start gap-3">
        <div class="w-9 h-9 rounded-[10px] bg-primary-500/10 text-primary-600 flex items-center justify-center shrink-0">
          <UIcon
            name="i-lucide-sparkles"
            class="size-4"
          />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-[13px] font-semibold text-[#0A1520]">
            {{ hasPiers ? 'Werk je haven verder af' : 'Stel je haven in' }}
          </div>
          <p class="text-[11.5px] text-[#5A6A78] mt-0.5 leading-snug">
            {{ hasPiers
              ? 'Loop de gevonden steigers door en pas waar nodig aan.'
              : 'Eén klik en de AI tekent de steigers en ligplaatsen voor je.' }}
          </p>
          <div class="mt-2.5 flex gap-2 items-center flex-wrap">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary-500 text-white text-[12px] font-semibold hover:bg-primary-600 disabled:opacity-50"
              :disabled="loading"
              @click="emit('scan')"
            >
              <UIcon
                :name="loading ? 'i-lucide-loader-2' : 'i-lucide-wand-2'"
                class="size-3.5"
                :class="loading ? 'animate-spin' : ''"
              />
              {{ loading ? 'AI bezig…' : 'Scan met AI' }}
            </button>
          </div>
        </div>
        <button
          type="button"
          class="text-[#5A6A78] hover:text-[#0A1520] shrink-0 -mr-1 -mt-1 p-1"
          aria-label="Sluiten"
          @click="emit('dismiss')"
        >
          <UIcon
            name="i-lucide-x"
            class="size-4"
          />
        </button>
      </div>
    </div>
  </div>
</template>
