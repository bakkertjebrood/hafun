<script setup lang="ts">
interface Suggestion {
  display_name: string
  lat: string
  lon: string
}

const props = withDefaults(defineProps<{
  placeholder?: string
  modelValue?: string
}>(), {
  placeholder: 'Zoek je haven (plaatsnaam, adres)…',
  modelValue: ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', v: string): void
  (e: 'pick', value: { lat: number, lng: number, name: string }): void
}>()

const query = ref(props.modelValue)
const suggestions = ref<Suggestion[]>([])
const open = ref(false)
const loading = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null
let lastReq = 0

watch(query, (v) => {
  emit('update:modelValue', v)
  if (timer) clearTimeout(timer)
  if (!v || v.trim().length < 3) {
    suggestions.value = []
    open.value = false
    return
  }
  timer = setTimeout(() => doSearch(v), 300)
})

async function doSearch(q: string) {
  loading.value = true
  const reqId = ++lastReq
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=6&accept-language=nl`,
      { headers: { Accept: 'application/json' } }
    )
    const data = await res.json() as Suggestion[]
    if (reqId !== lastReq) return // stale
    suggestions.value = Array.isArray(data) ? data : []
    open.value = suggestions.value.length > 0
  } catch {
    suggestions.value = []
  } finally {
    if (reqId === lastReq) loading.value = false
  }
}

function pick(s: Suggestion) {
  query.value = s.display_name
  open.value = false
  emit('pick', { lat: parseFloat(s.lat), lng: parseFloat(s.lon), name: s.display_name })
}

function onBlur() {
  setTimeout(() => { open.value = false }, 150)
}
</script>

<template>
  <div class="relative">
    <div class="flex items-center gap-2 px-4 py-3 bg-white rounded-[14px] border border-black/[0.08] focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
      <UIcon
        name="i-lucide-search"
        class="size-4 text-[#5A6A78] shrink-0"
      />
      <input
        v-model="query"
        type="text"
        :placeholder="placeholder"
        class="flex-1 bg-transparent border-none outline-none text-base text-[#0A1520]"
        autocomplete="off"
        @focus="open = suggestions.length > 0"
        @blur="onBlur"
      >
      <UIcon
        v-if="loading"
        name="i-lucide-loader-2"
        class="size-4 text-primary-500 animate-spin shrink-0"
      />
    </div>

    <div
      v-if="open && suggestions.length"
      class="absolute z-50 left-0 right-0 mt-1 bg-white rounded-[14px] border border-black/[0.08] shadow-lg overflow-hidden max-h-72 overflow-y-auto"
    >
      <button
        v-for="s in suggestions"
        :key="s.lat + s.lon"
        type="button"
        class="w-full text-left px-4 py-3 hover:bg-[#F4F7F8] border-b border-black/[0.04] last:border-0 flex items-start gap-2"
        @mousedown.prevent="pick(s)"
      >
        <UIcon
          name="i-lucide-map-pin"
          class="size-4 text-primary-500 mt-0.5 shrink-0"
        />
        <span class="text-sm text-[#0A1520] line-clamp-2">{{ s.display_name }}</span>
      </button>
    </div>
  </div>
</template>
