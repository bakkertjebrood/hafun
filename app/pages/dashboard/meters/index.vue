<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const loading = ref(true)
const readings = ref<any[]>([])
const berths = ref<any[]>([])
const showNew = ref(false)
const saving = ref(false)
const typeFilter = ref<string>('')
const marinaId = ref('')

const newReading = ref({
  berthId: '',
  type: 'ELECTRICITY' as 'ELECTRICITY' | 'WATER' | 'GAS',
  value: 0,
  note: ''
})

const typeLabels: Record<string, string> = {
  ELECTRICITY: 'Elektra (kWh)',
  WATER: 'Water (m³)',
  GAS: 'Gas (m³)'
}
const typeColors: Record<string, string> = {
  ELECTRICITY: '#F59E0B',
  WATER: '#3B82F6',
  GAS: '#EF4444'
}
const typeIcons: Record<string, string> = {
  ELECTRICITY: 'i-lucide-zap',
  WATER: 'i-lucide-droplet',
  GAS: 'i-lucide-flame'
}

async function fetchReadings() {
  loading.value = true
  const q: Record<string, string> = {}
  if (typeFilter.value) q.type = typeFilter.value
  readings.value = await $fetch('/api/meters', { query: q }) as any[]
  loading.value = false
}

onMounted(async () => {
  const d = await $fetch('/api/berths/discover') as any
  marinaId.value = d.marinaId
  berths.value = await $fetch('/api/berths', { query: { marinaId: d.marinaId } }) as any[]
  await fetchReadings()
})
watch(typeFilter, fetchReadings)

async function create() {
  saving.value = true
  try {
    await $fetch('/api/meters', { method: 'POST', body: newReading.value })
    newReading.value = { berthId: '', type: 'ELECTRICITY', value: 0, note: '' }
    showNew.value = false
    await fetchReadings()
  }
  finally {
    saving.value = false
  }
}

async function remove(id: string) {
  if (!confirm('Verwijderen?')) return
  await $fetch(`/api/meters/${id}`, { method: 'DELETE' })
  await fetchReadings()
}

function formatDate(d: string) {
  return new Date(d).toLocaleString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1100px]">
    <div class="flex items-end justify-between mb-4 lg:mb-6">
      <div>
        <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight">Standen-log</h1>
        <div class="text-xs text-[#5A6A78] mt-0.5">{{ readings.length }} meterstanden</div>
      </div>
      <UButton color="primary" class="rounded-full" size="sm" @click="showNew = !showNew">+ Stand opnemen</UButton>
    </div>

    <!-- Type filter -->
    <div class="flex gap-2 mb-4 flex-wrap">
      <button
        class="px-3 py-1.5 text-xs rounded-full font-medium"
        :class="!typeFilter ? 'bg-primary-500 text-white' : 'bg-white border border-black/[0.08] text-[#5A6A78]'"
        @click="typeFilter = ''"
      >Alle</button>
      <button
        v-for="(label, key) in typeLabels"
        :key="key"
        class="px-3 py-1.5 text-xs rounded-full font-medium inline-flex items-center gap-1.5"
        :class="typeFilter === key ? 'bg-primary-500 text-white' : 'bg-white border border-black/[0.08] text-[#5A6A78]'"
        @click="typeFilter = key"
      >
        <UIcon :name="typeIcons[key]" class="size-3.5" />
        {{ label }}
      </button>
    </div>

    <!-- Nieuw -->
    <div v-if="showNew" class="bg-white border border-primary-500/30 rounded-[14px] p-5 mb-4">
      <div class="text-sm font-semibold text-[#0A1520] mb-3">Nieuwe meterstand</div>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select v-model="newReading.berthId" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
          <option value="">— Geen ligplaats —</option>
          <option v-for="b in berths" :key="b.id" :value="b.id">{{ b.code }}</option>
        </select>
        <select v-model="newReading.type" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
          <option v-for="(label, key) in typeLabels" :key="key" :value="key">{{ label }}</option>
        </select>
        <input v-model.number="newReading.value" type="number" step="0.01" placeholder="Stand" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
      </div>
      <input v-model="newReading.note" placeholder="Notitie (optioneel)" class="w-full mt-3 px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
      <div class="flex gap-2 mt-3 justify-end">
        <UButton color="neutral" variant="outline" size="sm" @click="showNew = false">Annuleren</UButton>
        <UButton color="primary" size="sm" :loading="saving" @click="create">Opslaan</UButton>
      </div>
    </div>

    <!-- Lijst -->
    <div v-if="loading" class="text-sm text-[#5A6A78]">Laden...</div>
    <div v-else-if="!readings.length" class="bg-white border border-black/[0.08] rounded-[14px] p-8 text-center text-sm text-[#5A6A78]">
      Nog geen standen opgenomen
    </div>
    <div v-else class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
      <div
        v-for="(r, i) in readings"
        :key="r.id"
        class="px-5 py-3 flex items-center gap-4"
        :class="i < (readings.length as number) - 1 ? 'border-b border-black/[0.08]' : ''"
      >
        <div
          class="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          :style="{ background: typeColors[r.type] + '15', color: typeColors[r.type] }"
        >
          <UIcon :name="typeIcons[r.type]" class="size-4" />
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-[#0A1520]">
            <span v-if="r.berth">{{ r.berth.code }} — </span>{{ r.value }}
            <span class="text-xs text-[#5A6A78] font-normal ml-1">{{ (typeLabels[r.type] || '').split(' ').pop() }}</span>
          </div>
          <div class="text-xs text-[#5A6A78] mt-0.5">
            {{ formatDate(r.readAt) }}
            <span v-if="r.note" class="ml-2 italic">· {{ r.note }}</span>
          </div>
        </div>
        <button class="text-xs text-red-500 hover:text-red-600 p-1.5 rounded hover:bg-red-500/5" @click="remove(r.id)">
          <UIcon name="i-lucide-trash-2" class="size-4" />
        </button>
      </div>
    </div>
  </div>
</template>
