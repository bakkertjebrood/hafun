<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

type SearchFilter = 'all' | 'customers' | 'guests' | 'boats' | 'berths'

const search = ref('')
const searchFilter = ref<SearchFilter>('all')
const marinaId = ref('')
const customers = ref<any[]>([])
const overview = ref<any>(null)
const berthResults = ref<any[]>([])
const loading = ref(true)
const showOverview = ref(true)
const { loadError, messageFor } = useFetchError()

const contractLabels: Record<string, string> = {
  YEAR: 'Jaarcontract',
  SUMMER: 'Seizoencontract',
  TEMPORARY: 'Tijdelijk'
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const discovered = await $fetch('/api/berths/discover') as any
    marinaId.value = discovered.marinaId
  }
  catch (e) {
    loadError.value = messageFor(e, 'Kon haven niet laden')
    loading.value = false
    return
  }
  const results = await Promise.allSettled([fetchCustomers(), fetchOverview(), fetchBerths()])
  const failed = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined
  if (failed) loadError.value = messageFor(failed.reason, 'Een deel van de gegevens kon niet geladen worden')
  loading.value = false
}

onMounted(load)

async function fetchCustomers() {
  customers.value = await $fetch('/api/customers', {
    query: { marinaId: marinaId.value, search: search.value }
  }) as any[]
}

async function fetchOverview() {
  overview.value = await $fetch('/api/customers/overview')
}

async function fetchBerths() {
  berthResults.value = await $fetch('/api/berths', { query: { marinaId: marinaId.value } }) as any[]
}

let searchTimeout: ReturnType<typeof setTimeout>
watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(fetchCustomers, 300)
  showOverview.value = !search.value
})

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
}

const filteredBerths = computed(() => {
  if (searchFilter.value !== 'berths' || !search.value) return []
  const q = search.value.toLowerCase()
  return berthResults.value.filter(b => b.code.toLowerCase().includes(q) || b.pier.toLowerCase().includes(q))
})

const filteredGuestsForSearch = computed(() => {
  if (searchFilter.value !== 'guests' || !search.value) return []
  const q = search.value.toLowerCase()
  return (overview.value?.recentGuests || []).filter((g: any) => g.name.toLowerCase().includes(q))
})
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1300px]">
    <!-- Header -->
    <div class="flex items-end justify-between mb-4 lg:mb-6">
      <div>
        <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight">Huurders</h1>
        <div class="text-xs text-[#5A6A78] mt-0.5">{{ customers.length }} klanten</div>
      </div>
      <UButton color="primary" class="rounded-full" size="sm">+ Nieuw</UButton>
    </div>

    <!-- Search + filter -->
    <div class="flex gap-2 mb-4">
      <select v-model="searchFilter" class="px-3 py-2.5 text-sm rounded-full border border-black/[0.08] bg-white">
        <option value="all">Alles</option>
        <option value="customers">Klanten</option>
        <option value="guests">Passanten</option>
        <option value="boats">Boten</option>
        <option value="berths">Ligplaatsen</option>
      </select>
      <input
        v-model="search"
        type="text"
        placeholder="Zoek..."
        class="flex-1 px-4 py-2.5 text-sm rounded-full border border-black/[0.08] bg-white focus:outline-none focus:border-primary-500"
      >
    </div>

    <div v-if="loadError" class="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 flex items-start gap-3">
      <UIcon name="i-lucide-alert-triangle" class="size-4 text-red-600 mt-0.5 shrink-0" />
      <div class="flex-1 text-sm text-red-700">{{ loadError }}</div>
      <button class="text-xs text-red-700 font-semibold underline" @click="load()">Opnieuw laden</button>
    </div>

    <div v-if="loading" class="text-sm text-[#5A6A78]">Laden...</div>

    <template v-else>
      <!-- Overview panels (verborgen bij zoeken) -->
      <div v-if="showOverview && overview" class="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
        <!-- Kolom 1: recent toegevoegd -->
        <div class="space-y-3">
          <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">Klant nieuw</div>
            <div v-if="!overview.recentCustomers.length" class="text-xs text-[#5A6A78]">—</div>
            <NuxtLink
              v-for="c in overview.recentCustomers"
              :key="c.id"
              :to="`/dashboard/customers/${c.id}`"
              class="flex items-center justify-between py-1.5 text-xs hover:text-primary-500"
            >
              <span class="font-medium text-[#0A1520] truncate">{{ c.name }}</span>
              <span class="text-[#5A6A78] shrink-0">{{ formatDate(c.createdAt) }}</span>
            </NuxtLink>
          </div>

          <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">Passant nieuw</div>
            <div v-if="!overview.recentGuests.length" class="text-xs text-[#5A6A78]">—</div>
            <div v-for="g in overview.recentGuests" :key="g.id" class="flex items-center justify-between py-1.5 text-xs">
              <span class="font-medium text-[#0A1520] truncate">{{ g.name }}</span>
              <span class="text-[#5A6A78] shrink-0">{{ formatDate(g.createdAt) }}</span>
            </div>
          </div>

          <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">Boten zonder ligplaats</div>
            <div v-if="!overview.boatsWithoutBerth.length" class="text-xs text-[#5A6A78]">—</div>
            <div v-for="b in overview.boatsWithoutBerth" :key="b.id" class="flex items-center justify-between py-1.5 text-xs">
              <div class="truncate">
                <span class="font-medium text-[#0A1520]">{{ b.name }}</span>
                <span class="text-[#5A6A78] ml-1">· {{ b.length }}m</span>
              </div>
              <span v-if="b.customer" class="text-[#5A6A78] shrink-0 truncate max-w-[100px]">{{ b.customer.name }}</span>
            </div>
          </div>
        </div>

        <!-- Kolom 2: recent bewerkt -->
        <div class="space-y-3">
          <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">Klant bewerkt</div>
            <div v-if="!overview.editedCustomers.length" class="text-xs text-[#5A6A78]">—</div>
            <NuxtLink
              v-for="c in overview.editedCustomers"
              :key="c.id"
              :to="`/dashboard/customers/${c.id}`"
              class="flex items-center justify-between py-1.5 text-xs hover:text-primary-500"
            >
              <span class="font-medium text-[#0A1520] truncate">{{ c.name }}</span>
              <span class="text-[#5A6A78] shrink-0">{{ formatDate(c.updatedAt) }}</span>
            </NuxtLink>
          </div>

          <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">Passant bewerkt</div>
            <div v-if="!overview.editedGuests.length" class="text-xs text-[#5A6A78]">—</div>
            <div v-for="g in overview.editedGuests" :key="g.id" class="flex items-center justify-between py-1.5 text-xs">
              <span class="font-medium text-[#0A1520] truncate">{{ g.name }}</span>
              <span class="text-[#5A6A78] shrink-0">{{ formatDate(g.updatedAt) }}</span>
            </div>
          </div>

          <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">Boot bewerkt</div>
            <div v-if="!overview.editedBoats.length" class="text-xs text-[#5A6A78]">—</div>
            <div v-for="b in overview.editedBoats" :key="b.id" class="flex items-center justify-between py-1.5 text-xs">
              <span class="font-medium text-[#0A1520] truncate">{{ b.name }}</span>
              <span class="text-[#5A6A78] shrink-0">{{ formatDate(b.updatedAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Kolom 3: boten nieuw -->
        <div class="space-y-3">
          <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">Boot nieuw</div>
            <div v-if="!overview.recentBoats.length" class="text-xs text-[#5A6A78]">—</div>
            <div v-for="b in overview.recentBoats" :key="b.id" class="flex items-center justify-between py-1.5 text-xs">
              <div class="truncate">
                <span class="font-medium text-[#0A1520]">{{ b.name }}</span>
                <span v-if="b.berths?.[0]" class="text-primary-500 ml-1">· {{ b.berths[0].code }}</span>
              </div>
              <span class="text-[#5A6A78] shrink-0">{{ formatDate(b.createdAt) }}</span>
            </div>
          </div>

          <!-- Tools -->
          <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">Extra tools</div>
            <NuxtLink to="/dashboard/waitlist" class="block py-1.5 text-xs font-medium text-[#0A1520] hover:text-primary-500">
              → Wachtlijst
            </NuxtLink>
            <NuxtLink to="/dashboard/photoboard" class="block py-1.5 text-xs font-medium text-[#0A1520] hover:text-primary-500">
              → Boten-fotobord
            </NuxtLink>
            <NuxtLink to="/dashboard/meters" class="block py-1.5 text-xs font-medium text-[#0A1520] hover:text-primary-500">
              → Standen-log
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Berth search -->
      <div v-if="searchFilter === 'berths' && search" class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
        <div v-if="!filteredBerths.length" class="px-5 py-8 text-center text-sm text-[#5A6A78]">Geen ligplaatsen gevonden</div>
        <div
          v-for="(b, i) in filteredBerths"
          :key="b.id"
          class="px-5 py-3 flex items-center gap-3"
          :class="i < filteredBerths.length - 1 ? 'border-b border-black/[0.08]' : ''"
        >
          <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-500/10 text-primary-500">{{ b.code }}</span>
          <span class="text-xs text-[#5A6A78]">{{ b.length }}m × {{ b.width }}m</span>
          <span v-if="b.customer" class="text-xs text-[#0A1520] ml-auto">{{ b.customer.name }}</span>
        </div>
      </div>

      <!-- Customers list -->
      <div v-else class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
        <NuxtLink
          v-for="(customer, i) in customers"
          :key="customer.id"
          :to="`/dashboard/customers/${customer.id}`"
          class="flex items-center gap-4 px-5 py-4 hover:bg-black/[0.02] transition-colors"
          :class="i < customers.length - 1 ? 'border-b border-black/[0.08]' : ''"
        >
          <div class="w-10 h-10 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center text-sm font-semibold shrink-0">
            {{ customer.name.split(' ').slice(-1)[0]?.[0] || '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-[#0A1520]">{{ customer.name }}</div>
            <div class="text-xs text-[#5A6A78] mt-0.5 flex items-center gap-2">
              <span v-if="customer.email">{{ customer.email }}</span>
              <span v-if="customer.phone" class="text-[#5A6A78]/60">{{ customer.phone }}</span>
            </div>
          </div>
          <div v-if="customer.boats?.length" class="hidden md:block text-right shrink-0">
            <div class="text-xs font-medium text-[#0A1520]">{{ customer.boats[0].name }}</div>
            <div class="text-[11px] text-[#5A6A78]">{{ customer.boats[0].type }} · {{ customer.boats[0].length }}m</div>
          </div>
          <div v-if="customer.berths?.length" class="shrink-0">
            <span class="px-2 py-0.5 rounded-full text-[10px] lg:text-[11px] font-semibold bg-primary-500/10 text-primary-500">
              {{ customer.berths[0].code }}
            </span>
          </div>
          <div class="hidden lg:block shrink-0 w-28 text-right">
            <span class="text-[11px] text-[#5A6A78]">{{ contractLabels[customer.contractType] || customer.contractType }}</span>
          </div>
          <UIcon name="i-lucide-chevron-right" class="size-4 text-[#5A6A78]/40 shrink-0" />
        </NuxtLink>

        <div v-if="!customers.length" class="px-5 py-12 text-center">
          <div class="text-sm text-[#5A6A78]">Geen klanten gevonden</div>
        </div>
      </div>
    </template>
  </div>
</template>
