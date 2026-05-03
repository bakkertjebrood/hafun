<script setup lang="ts">
const props = defineProps<{
  editMode: boolean
  aiAnalyzing: boolean
  showLegend: boolean
}>()

const emit = defineEmits<{
  (e: 'toggle-edit'): void
  (e: 'run-ai'): void
  (e: 'toggle-legend'): void
}>()

const open = ref(false)

function call(action: 'edit' | 'ai' | 'legend') {
  open.value = false
  if (action === 'edit') emit('toggle-edit')
  if (action === 'ai') emit('run-ai')
  if (action === 'legend') emit('toggle-legend')
}
</script>

<template>
  <div class="lg:hidden fixed bottom-20 right-4 z-[800] flex flex-col items-end gap-2">
    <Transition name="fab-list">
      <div
        v-if="open"
        class="flex flex-col items-stretch gap-2"
      >
        <button
          class="px-4 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 shadow-lg backdrop-blur-sm"
          :class="props.editMode ? 'bg-primary-500 text-white' : 'bg-white text-[#0A1520]'"
          @click="call('edit')"
        >
          <UIcon
            name="i-lucide-pencil-line"
            class="size-4"
          />
          {{ props.editMode ? 'Klaar' : 'Bewerken' }}
        </button>
        <button
          class="px-4 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 shadow-lg backdrop-blur-sm bg-white text-[#0A1520] disabled:opacity-50"
          :disabled="props.aiAnalyzing"
          @click="call('ai')"
        >
          <UIcon
            :name="props.aiAnalyzing ? 'i-lucide-loader-2' : 'i-lucide-sparkles'"
            class="size-4"
            :class="props.aiAnalyzing ? 'animate-spin' : ''"
          />
          {{ props.aiAnalyzing ? 'AI…' : 'AI analyse' }}
        </button>
        <button
          class="px-4 py-2.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 shadow-lg backdrop-blur-sm"
          :class="props.showLegend ? 'bg-primary-500/10 text-primary-600' : 'bg-white text-[#0A1520]'"
          @click="call('legend')"
        >
          <UIcon
            name="i-lucide-list"
            class="size-4"
          />
          Legenda
        </button>
      </div>
    </Transition>

    <button
      class="w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white transition-transform"
      :class="open ? 'bg-[#0A1520] rotate-45' : 'bg-primary-500'"
      :aria-label="open ? 'Sluit menu' : 'Open kaartacties'"
      @click="open = !open"
    >
      <UIcon
        name="i-lucide-plus"
        class="size-6"
      />
    </button>
  </div>
</template>

<style scoped>
.fab-list-enter-active,
.fab-list-leave-active {
  transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-list-enter-from,
.fab-list-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
