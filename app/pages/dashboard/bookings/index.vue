<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const activeTab = ref<'today' | 'all' | 'new'>('today')
const bookings = ref<any[]>([])
const todayData = ref<any>({ arrivals: [], departures: [], currentGuests: 0 })
const loading = ref(true)
const berths = ref<any[]>([])
const marinaId = ref('')

// New booking form
const newBooking = ref({
  berthId: '',
  guestName: '',
  boatName: '',
  boatLength: '',
  dateFrom: new Date().toISOString().split('T')[0],
  dateTo: '',
  persons: 1
})
const saving = ref(false)
const errorMessage = ref('')

function fetchErrorMessage(e: any, fallback: string) {
  return e?.data?.message || e?.statusMessage || e?.message || fallback
}

const statusLabels: Record<string, string> = {
  reserved: 'Gereserveerd',
  checked_in: 'Ingecheckt',
  checked_out: 'Uitgecheckt',
  cancelled: 'Geannuleerd'
}

const statusColors: Record<string, string> = {
  reserved: '#F59E0B',
  checked_in: '#10B981',
  checked_out: '#5A6A78',
  cancelled: '#EF4444'
}

onMounted(async () => {
  const discovered = await $fetch('/api/berths/discover') as any
  marinaId.value = discovered.marinaId
  await Promise.all([fetchToday(), fetchAll(), fetchBerths()])
  loading.value = false
})

async function fetchToday() {
  todayData.value = await $fetch('/api/bookings/today')
}

async function fetchAll() {
  bookings.value = await $fetch('/api/bookings') as any[]
}

async function fetchBerths() {
  const data = await $fetch('/api/berths', { query: { marinaId: marinaId.value, status: 'FREE' } }) as any[]
  berths.value = data
}

async function createBooking() {
  if (!newBooking.value.berthId || !newBooking.value.guestName || !newBooking.value.dateTo) return
  saving.value = true
  errorMessage.value = ''
  let guest: { id: string } | null = null
  try {
    guest = await $fetch('/api/guests', {
      method: 'POST',
      body: {
        name: newBooking.value.guestName,
        boatName: newBooking.value.boatName,
        boatLength: newBooking.value.boatLength,
        arrival: newBooking.value.dateFrom,
        departure: newBooking.value.dateTo,
        persons: newBooking.value.persons
      }
    }) as any
  }
  catch (e: any) {
    errorMessage.value = fetchErrorMessage(e, 'Kon passant niet aanmaken')
    saving.value = false
    return
  }

  try {
    await $fetch('/api/bookings', {
      method: 'POST',
      body: {
        berthId: newBooking.value.berthId,
        guestId: guest!.id,
        dateFrom: newBooking.value.dateFrom,
        dateTo: newBooking.value.dateTo,
        persons: newBooking.value.persons
      }
    })

    newBooking.value = { berthId: '', guestName: '', boatName: '', boatLength: '', dateFrom: new Date().toISOString().split('T')[0], dateTo: '', persons: 1 }
    activeTab.value = 'today'
    await Promise.all([fetchToday(), fetchAll()])
  }
  catch (e: any) {
    errorMessage.value = fetchErrorMessage(e, 'Kon boeking niet aanmaken')
  }
  finally { saving.value = false }
}

async function updateStatus(id: string, status: string) {
  errorMessage.value = ''
  try {
    await $fetch(`/api/bookings/${id}`, { method: 'PUT', body: { status } })
    await Promise.all([fetchToday(), fetchAll()])
  }
  catch (e: any) {
    errorMessage.value = fetchErrorMessage(e, 'Status bijwerken mislukt')
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })
}

function formatDateFull(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
}

function nights(from: string, to: string) {
  const diff = new Date(to).getTime() - new Date(from).getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1200px]">
    <!-- Header -->
    <div class="flex items-end justify-between mb-5">
      <div>
        <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight">Reserveringen</h1>
        <div class="text-xs text-[#5A6A78] mt-0.5">{{ todayData.currentGuests }} gasten ingecheckt</div>
      </div>
      <button
        class="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold"
        @click="activeTab = 'new'"
      >
        + Passant inchecken
      </button>
    </div>

    <!-- Error banner -->
    <div v-if="errorMessage" class="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 flex items-start gap-3">
      <UIcon name="i-lucide-alert-triangle" class="size-4 text-red-600 mt-0.5 shrink-0" />
      <div class="flex-1 text-sm text-red-700">{{ errorMessage }}</div>
      <button class="text-xs text-red-700 underline" @click="errorMessage = ''">Sluiten</button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-5">
      <button
        v-for="tab in ([
          { key: 'today', label: 'Vandaag' },
          { key: 'all', label: 'Alle boekingen' },
          { key: 'new', label: 'Nieuwe boeking' }
        ] as const)"
        :key="tab.key"
        class="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
        :class="activeTab === tab.key ? 'bg-[#0A1520] text-white' : 'bg-[#F4F7F8] text-[#5A6A78]'"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Today view -->
    <div v-if="activeTab === 'today'" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Arrivals -->
      <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
        <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-3">
          Aankomsten vandaag ({{ todayData.arrivals.length }})
        </div>
        <div v-for="b in todayData.arrivals" :key="b.id" class="flex items-center gap-3 py-3 border-b border-black/[0.08] last:border-0">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-500/10 text-primary-500">
            {{ b.berth?.code }}
          </span>
          <div class="flex-1">
            <div class="text-sm font-semibold text-[#0A1520]">{{ b.customer?.name || b.guest?.name || 'Onbekend' }}</div>
            <div class="text-xs text-[#5A6A78]">{{ b.boat?.name || b.guest?.boatName || '' }} · {{ nights(b.dateFrom, b.dateTo) }} nachten</div>
          </div>
          <div class="flex gap-1">
            <button
              v-if="b.status === 'reserved'"
              class="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500 text-white"
              @click="updateStatus(b.id, 'checked_in')"
            >
              Check-in
            </button>
            <span
              v-else
              class="px-2.5 py-1 rounded-full text-[10px] font-semibold"
              :style="{ background: statusColors[b.status] + '1A', color: statusColors[b.status] }"
            >
              {{ statusLabels[b.status] }}
            </span>
          </div>
        </div>
        <div v-if="!todayData.arrivals.length" class="text-sm text-[#5A6A78] italic py-4">Geen aankomsten vandaag</div>
      </div>

      <!-- Departures -->
      <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
        <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-3">
          Vertrek vandaag ({{ todayData.departures.length }})
        </div>
        <div v-for="b in todayData.departures" :key="b.id" class="flex items-center gap-3 py-3 border-b border-black/[0.08] last:border-0">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F4F7F8] text-[#5A6A78]">
            {{ b.berth?.code }}
          </span>
          <div class="flex-1">
            <div class="text-sm font-semibold text-[#0A1520]">{{ b.customer?.name || b.guest?.name || 'Onbekend' }}</div>
            <div class="text-xs text-[#5A6A78]">{{ b.boat?.name || '' }}</div>
          </div>
          <button
            v-if="b.status === 'checked_in'"
            class="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#5A6A78] text-white"
            @click="updateStatus(b.id, 'checked_out')"
          >
            Check-out
          </button>
        </div>
        <div v-if="!todayData.departures.length" class="text-sm text-[#5A6A78] italic py-4">Geen vertrek vandaag</div>
      </div>
    </div>

    <!-- All bookings -->
    <div v-if="activeTab === 'all'" class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
      <div
        v-for="(b, i) in bookings"
        :key="b.id"
        class="flex items-center gap-3 px-5 py-3.5"
        :class="i < bookings.length - 1 ? 'border-b border-black/[0.08]' : ''"
      >
        <span
          class="w-2 h-2 rounded-full shrink-0"
          :style="{ background: statusColors[b.status] }"
        />
        <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-500/10 text-primary-500 shrink-0">
          {{ b.berth?.code }}
        </span>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-[#0A1520] truncate">{{ b.customer?.name || b.guest?.name || 'Onbekend' }}</div>
          <div class="text-xs text-[#5A6A78]">{{ formatDateFull(b.dateFrom) }} → {{ formatDateFull(b.dateTo) }} · {{ nights(b.dateFrom, b.dateTo) }}n</div>
        </div>
        <span
          class="px-2.5 py-1 rounded-full text-[10px] font-semibold shrink-0"
          :style="{ background: statusColors[b.status] + '1A', color: statusColors[b.status] }"
        >
          {{ statusLabels[b.status] }}
        </span>
      </div>
      <div v-if="!bookings.length" class="px-5 py-12 text-center text-sm text-[#5A6A78]">Nog geen boekingen</div>
    </div>

    <!-- New booking form (passant check-in) -->
    <div v-if="activeTab === 'new'" class="max-w-lg">
      <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
        <div class="text-sm font-semibold text-[#0A1520] mb-4">Passant inchecken</div>

        <div class="flex flex-col gap-3">
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Naam passant *</label>
            <input v-model="newBooking.guestName" type="text" placeholder="Naam" class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Boot naam</label>
              <input v-model="newBooking.boatName" type="text" placeholder="Bootnaam" class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Lengte (m)</label>
              <input v-model="newBooking.boatLength" type="number" step="0.1" placeholder="10.5" class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
            </div>
          </div>

          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Ligplaats *</label>
            <select v-model="newBooking.berthId" class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
              <option value="">Selecteer een vrije plek...</option>
              <option v-for="b in berths" :key="b.id" :value="b.id">{{ b.code }} ({{ b.length }}m × {{ b.width }}m)</option>
            </select>
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Aankomst *</label>
              <input v-model="newBooking.dateFrom" type="date" class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Vertrek *</label>
              <input v-model="newBooking.dateTo" type="date" class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Personen</label>
              <input v-model.number="newBooking.persons" type="number" min="1" class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
            </div>
          </div>

          <button
            class="w-full py-3 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-50 mt-2"
            :disabled="saving || !newBooking.berthId || !newBooking.guestName || !newBooking.dateTo"
            @click="createBooking"
          >
            {{ saving ? 'Bezig...' : 'Inchecken' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
