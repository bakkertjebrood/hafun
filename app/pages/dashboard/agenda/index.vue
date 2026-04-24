<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

type View = 'day' | 'week' | 'list'
const view = ref<View>('week')
const anchor = ref(new Date())
const loading = ref(true)
const events = ref<any[]>([])
const showNew = ref(false)
const saving = ref(false)

const newEvent = ref({
  title: '',
  description: '',
  type: 'OTHER',
  startAt: '',
  endAt: '',
  allDay: false,
  location: ''
})

const typeLabels: Record<string, string> = {
  MEETING: 'Overleg',
  MAINTENANCE: 'Onderhoud',
  EVENT: 'Evenement',
  REMINDER: 'Herinnering',
  ARRIVAL: 'Aankomst',
  DEPARTURE: 'Vertrek',
  OTHER: 'Overig'
}

const typeColors: Record<string, string> = {
  MEETING: '#3B82F6',
  MAINTENANCE: '#F59E0B',
  EVENT: '#8B5CF6',
  REMINDER: '#EF4444',
  ARRIVAL: '#10B981',
  DEPARTURE: '#5A6A78',
  OTHER: '#64748B'
}

const range = computed(() => {
  const d = new Date(anchor.value)
  if (view.value === 'day') {
    const start = new Date(d); start.setHours(0, 0, 0, 0)
    const end = new Date(d); end.setHours(23, 59, 59, 999)
    return { from: start, to: end }
  }
  if (view.value === 'week') {
    const day = d.getDay() || 7
    const start = new Date(d); start.setDate(d.getDate() - day + 1); start.setHours(0, 0, 0, 0)
    const end = new Date(start); end.setDate(start.getDate() + 6); end.setHours(23, 59, 59, 999)
    return { from: start, to: end }
  }
  // list: komende 60 dagen
  const start = new Date(d); start.setHours(0, 0, 0, 0)
  const end = new Date(start); end.setDate(start.getDate() + 60)
  return { from: start, to: end }
})

async function fetchEvents() {
  loading.value = true
  events.value = await $fetch('/api/agenda', {
    query: { from: range.value.from.toISOString(), to: range.value.to.toISOString() }
  }) as any[]
  loading.value = false
}

onMounted(fetchEvents)
watch([view, anchor], fetchEvents)

function shift(delta: number) {
  const d = new Date(anchor.value)
  if (view.value === 'day') d.setDate(d.getDate() + delta)
  else if (view.value === 'week') d.setDate(d.getDate() + delta * 7)
  else d.setDate(d.getDate() + delta * 30)
  anchor.value = d
}

const weekDays = computed(() => {
  if (view.value !== 'week') return []
  const days: { date: Date; events: any[] }[] = []
  const start = new Date(range.value.from)
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(d); dayEnd.setHours(23, 59, 59, 999)
    days.push({
      date: d,
      events: events.value.filter(e => {
        const s = new Date(e.startAt)
        return s >= dayStart && s <= dayEnd
      })
    })
  }
  return days
})

function formatDate(d: Date | string) {
  return new Date(d).toLocaleDateString('nl-NL', { weekday: 'short', day: '2-digit', month: 'short' })
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}
function formatFull(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
}

const headerLabel = computed(() => {
  const r = range.value
  if (view.value === 'day') return formatFull(r.from.toISOString())
  if (view.value === 'week') return `${formatDate(r.from)} — ${formatDate(r.to)}`
  return `Vanaf ${formatDate(r.from)}`
})

async function createEvent() {
  if (!newEvent.value.title || !newEvent.value.startAt) return
  saving.value = true
  try {
    await $fetch('/api/agenda', { method: 'POST', body: newEvent.value })
    newEvent.value = { title: '', description: '', type: 'OTHER', startAt: '', endAt: '', allDay: false, location: '' }
    showNew.value = false
    await fetchEvents()
  }
  finally {
    saving.value = false
  }
}

async function remove(id: string) {
  if (!confirm('Verwijderen?')) return
  await $fetch(`/api/agenda/${id}`, { method: 'DELETE' })
  await fetchEvents()
}
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1300px]">
    <div class="flex items-end justify-between mb-4 lg:mb-6 flex-wrap gap-3">
      <div>
        <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight">Agenda</h1>
        <div class="text-xs text-[#5A6A78] mt-0.5">{{ headerLabel }}</div>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex rounded-full bg-white border border-black/[0.08] overflow-hidden">
          <button
            v-for="v in ['day','week','list'] as View[]"
            :key="v"
            class="px-3 py-1.5 text-xs font-medium"
            :class="view === v ? 'bg-primary-500 text-white' : 'text-[#5A6A78]'"
            @click="view = v"
          >
            {{ v === 'day' ? 'Dag' : v === 'week' ? 'Week' : 'Lijst' }}
          </button>
        </div>
        <UButton color="neutral" variant="outline" size="sm" @click="shift(-1)">‹</UButton>
        <UButton color="neutral" variant="outline" size="sm" @click="anchor = new Date()">Vandaag</UButton>
        <UButton color="neutral" variant="outline" size="sm" @click="shift(1)">›</UButton>
        <UButton color="primary" class="rounded-full" size="sm" @click="showNew = !showNew">+ Nieuw</UButton>
      </div>
    </div>

    <!-- Nieuw event -->
    <div v-if="showNew" class="bg-white border border-primary-500/30 rounded-[14px] p-5 mb-4">
      <div class="text-sm font-semibold text-[#0A1520] mb-3">Nieuw agendapunt</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input v-model="newEvent.title" placeholder="Titel" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        <select v-model="newEvent.type" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
          <option v-for="(label, key) in typeLabels" :key="key" :value="key">{{ label }}</option>
        </select>
        <div>
          <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold">Start</label>
          <input v-model="newEvent.startAt" type="datetime-local" class="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        </div>
        <div>
          <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold">Einde</label>
          <input v-model="newEvent.endAt" type="datetime-local" class="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        </div>
        <input v-model="newEvent.location" placeholder="Locatie" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        <label class="flex items-center gap-2 text-sm text-[#0A1520]">
          <input v-model="newEvent.allDay" type="checkbox"> Hele dag
        </label>
      </div>
      <textarea v-model="newEvent.description" rows="2" placeholder="Beschrijving..." class="w-full mt-3 px-3 py-2 text-sm rounded-lg border border-black/[0.1]" />
      <div class="flex gap-2 mt-3 justify-end">
        <UButton color="neutral" variant="outline" size="sm" @click="showNew = false">Annuleren</UButton>
        <UButton color="primary" size="sm" :loading="saving" @click="createEvent">Opslaan</UButton>
      </div>
    </div>

    <!-- Content -->
    <div v-if="loading" class="text-sm text-[#5A6A78]">Laden...</div>

    <!-- Week view -->
    <div v-else-if="view === 'week'" class="grid grid-cols-1 md:grid-cols-7 gap-2">
      <div
        v-for="day in weekDays"
        :key="day.date.toISOString()"
        class="bg-white border border-black/[0.08] rounded-[10px] p-3 min-h-[140px]"
      >
        <div class="text-[11px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">
          {{ formatDate(day.date) }}
        </div>
        <div v-if="!day.events.length" class="text-[11px] text-[#5A6A78]/60 italic">—</div>
        <div v-else class="space-y-1.5">
          <div
            v-for="ev in day.events"
            :key="ev.id"
            class="text-[11px] leading-tight rounded px-2 py-1.5"
            :style="{ background: typeColors[ev.type] + '15', borderLeft: `3px solid ${typeColors[ev.type]}` }"
          >
            <div class="font-semibold text-[#0A1520]">{{ ev.title }}</div>
            <div v-if="!ev.allDay" class="text-[#5A6A78] mt-0.5">{{ formatTime(ev.startAt) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Day / list view -->
    <div v-else class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
      <div v-if="!events.length" class="p-8 text-center text-sm text-[#5A6A78]">Geen agendapunten</div>
      <div
        v-for="(ev, i) in events"
        :key="ev.id"
        class="px-5 py-4 flex items-start gap-4"
        :class="i < events.length - 1 ? 'border-b border-black/[0.08]' : ''"
      >
        <div class="w-14 shrink-0 text-center">
          <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold">{{ formatDate(ev.startAt) }}</div>
          <div v-if="!ev.allDay" class="text-xs font-mono text-[#0A1520] mt-0.5">{{ formatTime(ev.startAt) }}</div>
          <div v-else class="text-[10px] text-[#5A6A78] mt-0.5">Hele dag</div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: typeColors[ev.type] }" />
            <span class="text-sm font-semibold text-[#0A1520]">{{ ev.title }}</span>
            <span class="text-[10px] uppercase tracking-widest text-[#5A6A78]">{{ typeLabels[ev.type] }}</span>
          </div>
          <div v-if="ev.description" class="text-xs text-[#5A6A78] mt-0.5">{{ ev.description }}</div>
          <div v-if="ev.location" class="text-[11px] text-[#5A6A78] mt-0.5">📍 {{ ev.location }}</div>
        </div>
        <button
          class="text-xs text-red-500 hover:text-red-600 p-1.5 rounded hover:bg-red-500/5"
          @click="remove(ev.id)"
        >
          <UIcon name="i-lucide-trash-2" class="size-4" />
        </button>
      </div>
    </div>
  </div>
</template>
