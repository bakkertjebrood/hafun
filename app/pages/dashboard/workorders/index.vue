<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const loading = ref(true)
const orders = ref<any[]>([])
const customers = ref<any[]>([])
const users = ref<any[]>([])
const berths = ref<any[]>([])
const marinaId = ref('')
const showNew = ref(false)
const saving = ref(false)
const statusFilter = ref<string>('')
const { errorMessage, loadError, messageFor } = useFetchError()

const newOrder = ref({
  customerId: '',
  boatId: '',
  berthId: '',
  title: '',
  description: '',
  priority: 'normal',
  assigneeId: '',
  scheduledAt: ''
})

const statusLabels: Record<string, string> = {
  open: 'Open', in_progress: 'Bezig', done: 'Klaar', invoiced: 'Gefactureerd', cancelled: 'Geannuleerd'
}
const statusColors: Record<string, string> = {
  open: '#F59E0B', in_progress: '#3B82F6', done: '#10B981', invoiced: '#5A6A78', cancelled: '#EF4444'
}
const priorityLabels: Record<string, string> = {
  low: 'Laag', normal: 'Normaal', high: 'Hoog', urgent: 'Urgent'
}
const priorityColors: Record<string, string> = {
  low: '#5A6A78', normal: '#3B82F6', high: '#F59E0B', urgent: '#EF4444'
}

async function fetchOrders() {
  loading.value = true
  loadError.value = ''
  const q: Record<string, string> = {}
  if (statusFilter.value) q.status = statusFilter.value
  try {
    orders.value = await $fetch('/api/workorders', { query: q }) as any[]
  }
  catch (e) {
    loadError.value = messageFor(e, 'Kon werkbonnen niet laden')
  }
  finally {
    loading.value = false
  }
}

async function load() {
  loadError.value = ''
  try {
    const d = await $fetch('/api/berths/discover') as any
    marinaId.value = d.marinaId
    const results = await Promise.allSettled([
      fetchOrders(),
      $fetch('/api/customers', { query: { marinaId: d.marinaId } }).then((c: any) => customers.value = c),
      $fetch('/api/marina/users').then((u: any) => users.value = u),
      $fetch('/api/berths', { query: { marinaId: d.marinaId } }).then((b: any) => berths.value = b)
    ])
    const failed = results.find(r => r.status === 'rejected') as PromiseRejectedResult | undefined
    if (failed && !loadError.value) loadError.value = messageFor(failed.reason, 'Een deel van de gegevens kon niet geladen worden')
  }
  catch (e) {
    loadError.value = messageFor(e, 'Kon werkbonnen niet laden')
  }
}

onMounted(load)
watch(statusFilter, fetchOrders)

async function create() {
  if (!newOrder.value.title) return
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/workorders', { method: 'POST', body: newOrder.value })
    newOrder.value = { customerId: '', boatId: '', berthId: '', title: '', description: '', priority: 'normal', assigneeId: '', scheduledAt: '' }
    showNew.value = false
    await fetchOrders()
  }
  catch (e) {
    errorMessage.value = messageFor(e, 'Werkbon aanmaken mislukt')
  }
  finally {
    saving.value = false
  }
}

async function updateStatus(id: string, status: string) {
  errorMessage.value = ''
  try {
    await $fetch(`/api/workorders/${id}`, { method: 'PUT', body: { status } })
    await fetchOrders()
  }
  catch (e) {
    errorMessage.value = messageFor(e, 'Status bijwerken mislukt')
  }
}

async function remove(id: string) {
  if (!confirm('Verwijderen?')) return
  errorMessage.value = ''
  try {
    await $fetch(`/api/workorders/${id}`, { method: 'DELETE' })
    await fetchOrders()
  }
  catch (e) {
    errorMessage.value = messageFor(e, 'Verwijderen mislukt')
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' })
}
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1200px]">
    <div class="flex items-end justify-between mb-4 lg:mb-6">
      <div>
        <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight">Werkbonnen</h1>
        <div class="text-xs text-[#5A6A78] mt-0.5">{{ orders.length }} werkbonnen</div>
      </div>
      <UButton color="primary" class="rounded-full" size="sm" @click="showNew = !showNew">+ Nieuwe werkbon</UButton>
    </div>

    <!-- Errors -->
    <div v-if="loadError" class="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 flex items-start gap-3">
      <UIcon name="i-lucide-alert-triangle" class="size-4 text-red-600 mt-0.5 shrink-0" />
      <div class="flex-1 text-sm text-red-700">{{ loadError }}</div>
      <button class="text-xs text-red-700 font-semibold underline" @click="load()">Opnieuw laden</button>
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
      <div class="text-sm font-semibold text-[#0A1520] mb-3">Nieuwe werkbon</div>
      <input v-model="newOrder.title" placeholder="Titel" class="w-full mb-3 px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
      <textarea v-model="newOrder.description" rows="2" placeholder="Beschrijving..." class="w-full mb-3 px-3 py-2 text-sm rounded-lg border border-black/[0.1]" />
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <select v-model="newOrder.customerId" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
          <option value="">— Geen klant —</option>
          <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model="newOrder.berthId" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
          <option value="">— Geen ligplaats —</option>
          <option v-for="b in berths" :key="b.id" :value="b.id">{{ b.code }}</option>
        </select>
        <select v-model="newOrder.assigneeId" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
          <option value="">— Niet toegewezen —</option>
          <option v-for="u in users" :key="u.id" :value="u.id">{{ u.firstName }} {{ u.lastName }}</option>
        </select>
        <select v-model="newOrder.priority" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
          <option v-for="(label, key) in priorityLabels" :key="key" :value="key">{{ label }}</option>
        </select>
        <input v-model="newOrder.scheduledAt" type="datetime-local" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
      </div>
      <div class="flex gap-2 mt-3 justify-end">
        <UButton color="neutral" variant="outline" size="sm" @click="showNew = false">Annuleren</UButton>
        <UButton color="primary" size="sm" :loading="saving" @click="create">Opslaan</UButton>
      </div>
    </div>

    <!-- Lijst -->
    <div v-if="loading" class="text-sm text-[#5A6A78]">Laden...</div>
    <div v-else-if="!orders.length" class="bg-white border border-black/[0.08] rounded-[14px] p-8 text-center text-sm text-[#5A6A78]">
      Nog geen werkbonnen
    </div>
    <div v-else class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
      <div
        v-for="(w, i) in orders"
        :key="w.id"
        class="px-5 py-4 flex items-center gap-4"
        :class="i < orders.length - 1 ? 'border-b border-black/[0.08]' : ''"
      >
        <span
          class="w-2 h-10 rounded-full shrink-0"
          :style="{ background: priorityColors[w.priority] }"
        />
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold text-[#0A1520] truncate">{{ w.title }}</span>
            <span class="text-[11px] font-mono text-[#5A6A78]">{{ w.number }}</span>
          </div>
          <div class="text-xs text-[#5A6A78] mt-0.5">
            <span v-if="w.customer">{{ w.customer.name }}</span>
            <span v-if="w.berth" class="ml-2">· {{ w.berth.code }}</span>
            <span v-if="w.assignee" class="ml-2">· {{ w.assignee.firstName }}</span>
            <span v-if="w.scheduledAt" class="ml-2">· gepland {{ formatDate(w.scheduledAt) }}</span>
          </div>
          <div v-if="w.description" class="text-xs text-[#5A6A78] mt-0.5 line-clamp-1 italic">{{ w.description }}</div>
        </div>
        <select
          :value="w.status"
          class="text-xs px-2 py-1 rounded border border-black/[0.1] bg-white shrink-0"
          :style="{ color: statusColors[w.status] }"
          @change="updateStatus(w.id, ($event.target as HTMLSelectElement).value)"
        >
          <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
        </select>
        <button class="text-xs text-red-500 hover:text-red-600 p-1.5 rounded hover:bg-red-500/5" @click="remove(w.id)">
          <UIcon name="i-lucide-trash-2" class="size-4" />
        </button>
      </div>
    </div>
  </div>
</template>
