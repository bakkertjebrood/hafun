<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const loading = ref(true)
const quotes = ref<any[]>([])
const customers = ref<any[]>([])
const marinaId = ref('')
const showNew = ref(false)
const saving = ref(false)
const statusFilter = ref<string>('')
const { errorMessage, loadError, messageFor } = useFetchError()

const newQuote = ref({
  customerId: '',
  title: '',
  description: '',
  validUntil: '',
  lines: [{ description: '', quantity: 1, unitPrice: 0, vatRate: 21 }]
})

const statusLabels: Record<string, string> = {
  draft: 'Concept', sent: 'Verzonden', accepted: 'Geaccepteerd', rejected: 'Afgewezen', expired: 'Verlopen'
}
const statusColors: Record<string, string> = {
  draft: '#5A6A78', sent: '#F59E0B', accepted: '#10B981', rejected: '#EF4444', expired: '#64748B'
}

async function fetchQuotes() {
  loading.value = true
  loadError.value = ''
  const q: Record<string, string> = {}
  if (statusFilter.value) q.status = statusFilter.value
  try {
    quotes.value = await $fetch('/api/quotes', { query: q }) as any[]
  }
  catch (e) {
    loadError.value = messageFor(e, 'Kon offertes niet laden')
  }
  finally {
    loading.value = false
  }
}

async function fetchCustomers() {
  const d = await $fetch('/api/berths/discover') as any
  marinaId.value = d.marinaId
  customers.value = await $fetch('/api/customers', { query: { marinaId: d.marinaId } }) as any[]
}

onMounted(async () => {
  const results = await Promise.allSettled([fetchQuotes(), fetchCustomers()])
  const failed = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined
  if (failed && !loadError.value) loadError.value = messageFor(failed.reason, 'Kon klantgegevens niet laden')
})
watch(statusFilter, fetchQuotes)

function addLine() {
  newQuote.value.lines.push({ description: '', quantity: 1, unitPrice: 0, vatRate: 21 })
}
function removeLine(i: number) {
  if (newQuote.value.lines.length > 1) newQuote.value.lines.splice(i, 1)
}

const quoteTotal = computed(() => newQuote.value.lines.reduce(
  (s, l) => s + l.quantity * l.unitPrice * (1 + l.vatRate / 100), 0
))

async function create() {
  if (!newQuote.value.title) return
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/quotes', { method: 'POST', body: newQuote.value })
    newQuote.value = { customerId: '', title: '', description: '', validUntil: '', lines: [{ description: '', quantity: 1, unitPrice: 0, vatRate: 21 }] }
    showNew.value = false
    await fetchQuotes()
  }
  catch (e) {
    errorMessage.value = messageFor(e, 'Offerte aanmaken mislukt')
  }
  finally {
    saving.value = false
  }
}

async function updateStatus(id: string, status: string) {
  errorMessage.value = ''
  try {
    await $fetch(`/api/quotes/${id}`, { method: 'PUT', body: { status } })
    await fetchQuotes()
  }
  catch (e) {
    errorMessage.value = messageFor(e, 'Status bijwerken mislukt')
  }
}

async function remove(id: string) {
  if (!confirm('Verwijderen?')) return
  errorMessage.value = ''
  try {
    await $fetch(`/api/quotes/${id}`, { method: 'DELETE' })
    await fetchQuotes()
  }
  catch (e) {
    errorMessage.value = messageFor(e, 'Verwijderen mislukt')
  }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1200px]">
    <div class="flex items-end justify-between mb-4 lg:mb-6">
      <div>
        <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight">Offertes</h1>
        <div class="text-xs text-[#5A6A78] mt-0.5">{{ quotes.length }} offertes</div>
      </div>
      <UButton color="primary" class="rounded-full" size="sm" @click="showNew = !showNew">+ Nieuwe offerte</UButton>
    </div>

    <!-- Errors -->
    <div v-if="loadError" class="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 flex items-start gap-3">
      <UIcon name="i-lucide-alert-triangle" class="size-4 text-red-600 mt-0.5 shrink-0" />
      <div class="flex-1 text-sm text-red-700">{{ loadError }}</div>
      <button class="text-xs text-red-700 font-semibold underline" @click="fetchQuotes()">Opnieuw laden</button>
    </div>
    <div v-if="errorMessage" class="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 flex items-start gap-3">
      <UIcon name="i-lucide-alert-triangle" class="size-4 text-red-600 mt-0.5 shrink-0" />
      <div class="flex-1 text-sm text-red-700">{{ errorMessage }}</div>
      <button class="text-xs text-red-700 underline" @click="errorMessage = ''">Sluiten</button>
    </div>

    <!-- Filter -->
    <div class="flex gap-2 mb-4 flex-wrap">
      <button
        class="px-3 py-1.5 text-xs rounded-full font-medium"
        :class="!statusFilter ? 'bg-primary-500 text-white' : 'bg-white border border-black/[0.08] text-[#5A6A78]'"
        @click="statusFilter = ''"
      >Alle</button>
      <button
        v-for="(label, key) in statusLabels"
        :key="key"
        class="px-3 py-1.5 text-xs rounded-full font-medium"
        :class="statusFilter === key ? 'bg-primary-500 text-white' : 'bg-white border border-black/[0.08] text-[#5A6A78]'"
        @click="statusFilter = key"
      >{{ label }}</button>
    </div>

    <!-- Nieuw -->
    <div v-if="showNew" class="bg-white border border-primary-500/30 rounded-[14px] p-5 mb-4">
      <div class="text-sm font-semibold text-[#0A1520] mb-3">Nieuwe offerte</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <select v-model="newQuote.customerId" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
          <option value="">— Geen klant —</option>
          <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <input v-model="newQuote.validUntil" type="date" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        <input v-model="newQuote.title" placeholder="Titel" class="md:col-span-2 px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        <textarea v-model="newQuote.description" rows="2" placeholder="Omschrijving" class="md:col-span-2 px-3 py-2 text-sm rounded-lg border border-black/[0.1]" />
      </div>

      <div class="text-[11px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">Regels</div>
      <div v-for="(line, i) in newQuote.lines" :key="i" class="grid grid-cols-12 gap-2 mb-2">
        <input v-model="line.description" placeholder="Omschrijving" class="col-span-6 px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        <input v-model.number="line.quantity" type="number" step="0.01" class="col-span-2 px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        <input v-model.number="line.unitPrice" type="number" step="0.01" class="col-span-2 px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        <input v-model.number="line.vatRate" type="number" class="col-span-1 px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        <button class="col-span-1 text-red-500 hover:bg-red-500/5 rounded" @click="removeLine(i)">×</button>
      </div>
      <button class="text-xs text-primary-500 font-medium" @click="addLine">+ Regel toevoegen</button>

      <div class="flex items-center justify-between mt-4 pt-3 border-t border-black/[0.08]">
        <div class="text-sm text-[#5A6A78]">Totaal (incl. btw): <span class="font-semibold text-[#0A1520]">{{ formatCurrency(quoteTotal) }}</span></div>
        <div class="flex gap-2">
          <UButton color="neutral" variant="outline" size="sm" @click="showNew = false">Annuleren</UButton>
          <UButton color="primary" size="sm" :loading="saving" @click="create">Opslaan</UButton>
        </div>
      </div>
    </div>

    <!-- Lijst -->
    <div v-if="loading" class="text-sm text-[#5A6A78]">Laden...</div>
    <div v-else-if="!quotes.length" class="bg-white border border-black/[0.08] rounded-[14px] p-8 text-center text-sm text-[#5A6A78]">
      Nog geen offertes
    </div>
    <div v-else class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
      <div
        v-for="(q, i) in quotes"
        :key="q.id"
        class="px-5 py-4 flex items-center gap-4"
        :class="i < quotes.length - 1 ? 'border-b border-black/[0.08]' : ''"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-[#0A1520] truncate">{{ q.title }}</span>
            <span class="text-[11px] font-mono text-[#5A6A78]">{{ q.number }}</span>
          </div>
          <div class="text-xs text-[#5A6A78] mt-0.5">
            <span v-if="q.customer">{{ q.customer.name }}</span>
            <span class="ml-2">{{ formatDate(q.createdAt) }}</span>
            <span v-if="q.validUntil" class="ml-2">geldig t/m {{ formatDate(q.validUntil) }}</span>
          </div>
        </div>
        <div class="text-sm font-semibold text-[#0A1520] shrink-0">{{ formatCurrency(q.total) }}</div>
        <select
          :value="q.status"
          class="text-xs px-2 py-1 rounded border border-black/[0.1] bg-white shrink-0"
          :style="{ color: statusColors[q.status] }"
          @change="updateStatus(q.id, ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
        </select>
        <button class="text-xs text-red-500 hover:text-red-600 p-1.5 rounded hover:bg-red-500/5" @click="remove(q.id)">
          <UIcon name="i-lucide-trash-2" class="size-4" />
        </button>
      </div>
    </div>
  </div>
</template>
