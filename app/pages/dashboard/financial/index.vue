<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const loading = ref(true)
const data = ref<any>({ invoices: [], summary: {} })
const activeTab = ref<'overview' | 'new'>('overview')
const statusFilter = ref('')
const customers = ref<any[]>([])
const marinaId = ref('')

// New invoice form
const newInvoice = ref({
  customerId: '',
  lines: [{ description: '', quantity: 1, unitPrice: 0, vatRate: 21 }] as Array<{ description: string; quantity: number; unitPrice: number; vatRate: number }>
})
const saving = ref(false)

const statusLabels: Record<string, string> = {
  open: 'Open', partial: 'Deels betaald', paid: 'Betaald', cancelled: 'Geannuleerd'
}
const statusColors: Record<string, string> = {
  open: '#EF4444', partial: '#F59E0B', paid: '#10B981', cancelled: '#9CA3AF'
}

onMounted(async () => {
  const discovered = await $fetch('/api/berths/discover') as any
  marinaId.value = discovered.marinaId
  await Promise.all([fetchInvoices(), fetchCustomers()])
  loading.value = false
})

async function fetchInvoices() {
  data.value = await $fetch('/api/invoices', { query: statusFilter.value ? { status: statusFilter.value } : {} })
}

async function fetchCustomers() {
  customers.value = await $fetch('/api/customers', { query: { marinaId: marinaId.value } }) as any[]
}

function addLine() {
  newInvoice.value.lines.push({ description: '', quantity: 1, unitPrice: 0, vatRate: 21 })
}

function removeLine(i: number) {
  if (newInvoice.value.lines.length > 1) newInvoice.value.lines.splice(i, 1)
}

const invoiceTotal = computed(() => {
  return newInvoice.value.lines.reduce((s, l) => s + l.quantity * l.unitPrice * (1 + l.vatRate / 100), 0)
})

async function createInvoice() {
  if (!newInvoice.value.customerId || !newInvoice.value.lines.some(l => l.description && l.unitPrice > 0)) return
  saving.value = true
  try {
    await $fetch('/api/invoices', {
      method: 'POST',
      body: {
        customerId: newInvoice.value.customerId,
        lines: newInvoice.value.lines.filter(l => l.description && l.unitPrice > 0)
      }
    })
    newInvoice.value = { customerId: '', lines: [{ description: '', quantity: 1, unitPrice: 0, vatRate: 21 }] }
    activeTab.value = 'overview'
    await fetchInvoices()
  }
  finally { saving.value = false }
}

async function markPaid(id: string) {
  await $fetch(`/api/invoices/${id}/pay`, { method: 'POST', body: { method: 'transfer' } })
  await fetchInvoices()
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

watch(statusFilter, () => fetchInvoices())
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1200px]">
    <div class="flex items-end justify-between mb-5">
      <div>
        <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight">Facturatie</h1>
      </div>
      <button class="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold" @click="activeTab = 'new'">
        + Factuur maken
      </button>
    </div>

    <!-- KPI row -->
    <div v-if="!loading" class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
      <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
        <div class="text-xs text-[#5A6A78]">Omzet</div>
        <div class="text-2xl font-semibold text-[#0A1520] mt-1">{{ formatCurrency(data.summary.totalRevenue || 0) }}</div>
      </div>
      <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
        <div class="text-xs text-[#5A6A78]">Openstaand</div>
        <div class="text-2xl font-semibold text-red-500 mt-1">{{ formatCurrency(data.summary.totalOutstanding || 0) }}</div>
      </div>
      <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
        <div class="text-xs text-[#5A6A78]">BTW</div>
        <div class="text-2xl font-semibold text-[#0A1520] mt-1">{{ formatCurrency(data.summary.totalVat || 0) }}</div>
      </div>
      <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
        <div class="text-xs text-[#5A6A78]">Facturen</div>
        <div class="text-2xl font-semibold text-[#0A1520] mt-1">{{ data.summary.openCount || 0 }} open</div>
        <div class="text-xs text-emerald-500 mt-1">{{ data.summary.paidCount || 0 }} betaald</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-5">
      <button
        class="px-3 py-1.5 rounded-full text-xs font-semibold"
        :class="activeTab === 'overview' ? 'bg-[#0A1520] text-white' : 'bg-[#F4F7F8] text-[#5A6A78]'"
        @click="activeTab = 'overview'"
      >
        Overzicht
      </button>
      <button
        class="px-3 py-1.5 rounded-full text-xs font-semibold"
        :class="activeTab === 'new' ? 'bg-[#0A1520] text-white' : 'bg-[#F4F7F8] text-[#5A6A78]'"
        @click="activeTab = 'new'"
      >
        Nieuwe factuur
      </button>
      <!-- Status filters -->
      <select
        v-if="activeTab === 'overview'"
        v-model="statusFilter"
        class="ml-auto px-3 py-1.5 rounded-full text-xs border border-black/[0.08] bg-white"
      >
        <option value="">Alle</option>
        <option value="open">Open</option>
        <option value="partial">Deels betaald</option>
        <option value="paid">Betaald</option>
      </select>
    </div>

    <!-- Invoice list -->
    <div v-if="activeTab === 'overview'" class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
      <div
        v-for="(inv, i) in data.invoices"
        :key="inv.id"
        class="flex items-center gap-3 px-5 py-3.5"
        :class="i < data.invoices.length - 1 ? 'border-b border-black/[0.08]' : ''"
      >
        <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: statusColors[inv.status] }" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-[#0A1520]">{{ inv.number }}</div>
          <div class="text-xs text-[#5A6A78]">{{ inv.customer?.name }} · {{ formatDate(inv.date) }}</div>
        </div>
        <div class="text-sm font-semibold text-[#0A1520] shrink-0">{{ formatCurrency(inv.total) }}</div>
        <span
          class="px-2.5 py-1 rounded-full text-[10px] font-semibold shrink-0"
          :style="{ background: statusColors[inv.status] + '1A', color: statusColors[inv.status] }"
        >
          {{ statusLabels[inv.status] }}
        </span>
        <a
          :href="`/api/invoices/${inv.id}/pdf`"
          target="_blank"
          class="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#F4F7F8] text-[#5A6A78] shrink-0 hover:bg-black/10"
        >
          PDF
        </a>
        <button
          v-if="inv.status === 'open' || inv.status === 'partial'"
          class="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500 text-white shrink-0"
          @click="markPaid(inv.id)"
        >
          Betaald
        </button>
      </div>
      <div v-if="!data.invoices?.length" class="px-5 py-12 text-center text-sm text-[#5A6A78]">Geen facturen</div>
    </div>

    <!-- New invoice form -->
    <div v-if="activeTab === 'new'" class="max-w-2xl">
      <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
        <div class="text-sm font-semibold text-[#0A1520] mb-4">Nieuwe factuur</div>

        <div class="mb-4">
          <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Klant *</label>
          <select v-model="newInvoice.customerId" class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]">
            <option value="">Selecteer klant...</option>
            <option v-for="c in customers" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>

        <!-- Lines -->
        <div class="mb-4">
          <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2 block">Regels</label>
          <div v-for="(line, i) in newInvoice.lines" :key="i" class="flex gap-2 mb-2 items-end">
            <div class="flex-1">
              <input v-model="line.description" type="text" placeholder="Omschrijving" class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]">
            </div>
            <div class="w-20">
              <input v-model.number="line.quantity" type="number" min="1" placeholder="Aantal" class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]">
            </div>
            <div class="w-28">
              <input v-model.number="line.unitPrice" type="number" step="0.01" placeholder="Prijs" class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]">
            </div>
            <div class="w-20">
              <select v-model.number="line.vatRate" class="w-full px-2 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]">
                <option :value="21">21%</option>
                <option :value="9">9%</option>
                <option :value="0">0%</option>
              </select>
            </div>
            <button v-if="newInvoice.lines.length > 1" class="text-red-400 hover:text-red-600 p-2" @click="removeLine(i)">
              <UIcon name="i-lucide-trash-2" class="size-4" />
            </button>
          </div>
          <button class="text-xs text-primary-500 font-semibold mt-1" @click="addLine">+ Regel toevoegen</button>
        </div>

        <div class="flex items-center justify-between pt-3 border-t border-black/[0.08]">
          <div>
            <div class="text-xs text-[#5A6A78]">Totaal incl. BTW</div>
            <div class="text-xl font-semibold text-[#0A1520]">{{ formatCurrency(invoiceTotal) }}</div>
          </div>
          <button
            class="px-6 py-2.5 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-50"
            :disabled="saving || !newInvoice.customerId"
            @click="createInvoice"
          >
            {{ saving ? 'Bezig...' : 'Factuur aanmaken' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
