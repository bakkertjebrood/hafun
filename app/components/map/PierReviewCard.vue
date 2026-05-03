<script setup lang="ts">
interface PierResult {
  name: string
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  leftBerths: number
  rightBerths: number
  hasHead: boolean
  headBerths: number
  avgBerthLength: number
  avgBerthWidth: number
  confidence: number
  lengthMeters?: number
}

const props = defineProps<{ pier: PierResult }>()
const emit = defineEmits<{
  (e: 'update', pier: PierResult): void
  (e: 'remove'): void
  (e: 'rename', name: string): void
}>()

const editingName = ref(false)
const draftName = ref(props.pier.name)
watch(() => props.pier.name, (v) => { draftName.value = v })

const confidenceLabel = computed(() => {
  const c = props.pier.confidence ?? 0
  if (c >= 0.85) return { text: 'Hoog', cls: 'bg-emerald-500/10 text-emerald-600' }
  if (c >= 0.6) return { text: 'Gemiddeld', cls: 'bg-amber-500/10 text-amber-600' }
  return { text: 'Laag', cls: 'bg-red-500/10 text-red-600' }
})

function bump(side: 'leftBerths' | 'rightBerths' | 'headBerths', delta: number) {
  const next = Math.max(0, Math.min(100, (props.pier[side] || 0) + delta))
  emit('update', { ...props.pier, [side]: next })
}

function commitRename() {
  const trimmed = draftName.value.trim()
  if (trimmed && trimmed !== props.pier.name) {
    emit('rename', trimmed)
  }
  editingName.value = false
}
</script>

<template>
  <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
    <div class="flex items-center justify-between gap-2 mb-3">
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-9 h-9 rounded-[10px] bg-primary-500/10 text-primary-600 flex items-center justify-center text-sm font-bold shrink-0">
          {{ pier.name }}
        </div>
        <div class="min-w-0">
          <div
            v-if="!editingName"
            class="flex items-center gap-1.5"
          >
            <div class="text-sm font-semibold text-[#0A1520] truncate">
              Steiger {{ pier.name }}
            </div>
            <button
              class="text-[#5A6A78] hover:text-[#0A1520]"
              title="Hernoem"
              @click="editingName = true"
            >
              <UIcon
                name="i-lucide-pencil"
                class="size-3"
              />
            </button>
          </div>
          <input
            v-else
            v-model="draftName"
            class="text-sm font-semibold text-[#0A1520] bg-[#F4F7F8] rounded-md px-2 py-0.5 w-20"
            autofocus
            @blur="commitRename"
            @keydown.enter="commitRename"
            @keydown.esc="editingName = false; draftName = pier.name"
          >
          <div class="text-[11px] text-[#5A6A78]">
            ~{{ Math.round(pier.lengthMeters ?? 0) }}m · ~{{ pier.leftBerths + pier.rightBerths + (pier.hasHead ? pier.headBerths : 0) }} ligplaatsen
          </div>
        </div>
      </div>
      <span
        class="px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
        :class="confidenceLabel.cls"
      >
        {{ confidenceLabel.text }}
      </span>
    </div>

    <div class="grid grid-cols-2 gap-2 mb-2">
      <div class="bg-[#F4F7F8] rounded-[10px] p-2.5">
        <div class="text-[10px] uppercase tracking-wide text-[#5A6A78] font-semibold">
          Links
        </div>
        <div class="flex items-center justify-between mt-1">
          <button
            class="w-7 h-7 rounded-full bg-white border border-black/[0.08] text-[#0A1520] hover:border-primary-500"
            @click="bump('leftBerths', -1)"
          >
            <UIcon
              name="i-lucide-minus"
              class="size-3.5 mx-auto"
            />
          </button>
          <span class="text-base font-semibold tabular-nums">{{ pier.leftBerths }}</span>
          <button
            class="w-7 h-7 rounded-full bg-white border border-black/[0.08] text-[#0A1520] hover:border-primary-500"
            @click="bump('leftBerths', 1)"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-3.5 mx-auto"
            />
          </button>
        </div>
      </div>
      <div class="bg-[#F4F7F8] rounded-[10px] p-2.5">
        <div class="text-[10px] uppercase tracking-wide text-[#5A6A78] font-semibold">
          Rechts
        </div>
        <div class="flex items-center justify-between mt-1">
          <button
            class="w-7 h-7 rounded-full bg-white border border-black/[0.08] text-[#0A1520] hover:border-primary-500"
            @click="bump('rightBerths', -1)"
          >
            <UIcon
              name="i-lucide-minus"
              class="size-3.5 mx-auto"
            />
          </button>
          <span class="text-base font-semibold tabular-nums">{{ pier.rightBerths }}</span>
          <button
            class="w-7 h-7 rounded-full bg-white border border-black/[0.08] text-[#0A1520] hover:border-primary-500"
            @click="bump('rightBerths', 1)"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-3.5 mx-auto"
            />
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="pier.hasHead"
      class="bg-amber-500/5 border border-amber-500/20 rounded-[10px] p-2.5 mb-2"
    >
      <div class="flex items-center justify-between">
        <div class="text-[11px] font-semibold text-amber-600">
          T-kop
        </div>
        <div class="flex items-center gap-2">
          <button
            class="w-6 h-6 rounded-full bg-white border border-amber-500/30"
            @click="bump('headBerths', -1)"
          >
            <UIcon
              name="i-lucide-minus"
              class="size-3 mx-auto text-amber-600"
            />
          </button>
          <span class="text-sm font-semibold tabular-nums text-amber-700">{{ pier.headBerths }}</span>
          <button
            class="w-6 h-6 rounded-full bg-white border border-amber-500/30"
            @click="bump('headBerths', 1)"
          >
            <UIcon
              name="i-lucide-plus"
              class="size-3 mx-auto text-amber-600"
            />
          </button>
        </div>
      </div>
    </div>

    <button
      class="w-full text-[11px] text-red-500 hover:text-red-600 inline-flex items-center justify-center gap-1 py-1"
      @click="emit('remove')"
    >
      <UIcon
        name="i-lucide-trash-2"
        class="size-3"
      /> Verwijder steiger
    </button>
  </div>
</template>
