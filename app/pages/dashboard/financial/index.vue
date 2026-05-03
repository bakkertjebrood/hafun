<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const loading = ref(true)
const invoices = ref<any[]>([])
const summary = ref<any>({})
const accountingConfig = ref<any>(null)
const customers = ref<any[]>([])
const tariffs = ref<any[]>([])
const marinaId = ref('')
const syncing = ref(false)
const loadError = ref('')
const errorMessage = ref('')

function fetchErrorMessage(e: any, fallback: string) {
  return e?.data?.message || e?.statusMessage || e?.message || fallback
}

const activeTab = ref<'invoices' | 'new'>('invoices')

// Filters
const today = new Date()
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
const filterFrom = ref(monthStart.toISOString().slice(0, 10))
const filterTo = ref(today.toISOString().slice(0, 10))
const filterStatus = ref('')
const filterMethod = ref('')

// Deelbetaling modal
const paymentInvoice = ref<any>(null)
const paymentAmount = ref(0)
const paymentMethod = ref<'cash' | 'pin' | 'transfer' | 'creditcard' | 'online'>('transfer')
const paymentSaving = ref(false)

// New invoice form
const newInvoice = ref({
  customerId: '',
  description: '',
  lines: [{ description: '', quantity: 1, unitPrice: 0, vatRate: 21 }] as Array<{ description: string; quantity: number; unitPrice: number; vatRate: number }>,
  sendEmail: true
})
const sending = ref(false)

const statusLabels: Record<string, string> = {
  draft: 'Concept', sent: 'Verzonden', paid: 'Betaald', overdue: 'Verlopen'
}
const statusColors: Record<string, string> = {
  draft: '#5A6A78', sent: '#F59E0B', paid: '#10B981', overdue: '#EF4444'
}

async function loadAll() {
  loading.value = true
  loadError.value = ''
  try {
    const discovered = await $fetch('/api/berths/discover') as any
    marinaId.value = discovered.marinaId
  }
  catch (e: any) {
    loadError.value = fetchErrorMessage(e, 'Kon haven niet laden')
    loading.value = false
    return
  }

  const results = await Promise.allSettled([fetchInvoices(), fetchConfig(), fetchCustomers(), fetchTariffs()])
  const failed = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[]
  if (failed.length) {
    const first = failed[0].reason
    loadError.value = fetchErrorMessage(first, 'Een deel van de gegevens kon niet geladen worden')
  }
  loading.value = false
}

onMounted(loadAll)

async function fetchInvoices() {
  const q: Record<string, string> = {}
  if (filterFrom.value) q.from = new Date(filterFrom.value).toISOString()
  if (filterTo.value) {
    const t = new Date(filterTo.value); t.setHours(23, 59, 59, 999)
    q.to = t.toISOString()
  }
  if (filterStatus.value) q.status = filterStatus.value
  if (filterMethod.value) q.method = filterMethod.value
  const data = await $fetch('/api/invoices', { query: q }) as any
  invoices.value = data.invoices || []
  summary.value = data.summary || {}
}

watch([filterFrom, filterTo, filterStatus, filterMethod], fetchInvoices)

async function sendReminder(inv: any) {
  if (!confirm(`Herinnering versturen voor ${inv.number}?`)) return
  errorMessage.value = ''
  try {
    await $fetch(`/api/invoices/${inv.id}/reminder`, { method: 'POST' })
    await fetchInvoices()
  }
  catch (e: any) {
    errorMessage.value = fetchErrorMessage(e, 'Herinnering versturen mislukt')
  }
}

function copyPaymentLink(url: string) {
  navigator.clipboard.writeText(url)
  alert('Betaallink gekopieerd naar klembord')
}

function openPayment(inv: any) {
  paymentInvoice.value = inv
  paymentAmount.value = Math.max(0, inv.total - (inv.paidAmount || 0))
  paymentMethod.value = 'transfer'
}

async function savePayment() {
  if (!paymentInvoice.value || !paymentAmount.value) return
  paymentSaving.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/payments', {
      method: 'POST',
      body: {
        invoiceId: paymentInvoice.value.id,
        amount: paymentAmount.value,
        method: paymentMethod.value
      }
    })
    paymentInvoice.value = null
    await fetchInvoices()
  }
  catch (e: any) {
    errorMessage.value = fetchErrorMessage(e, 'Betaling registreren mislukt')
  }
  finally {
    paymentSaving.value = false
  }
}

function exportCsv() {
  const rows = [['Nummer', 'Klant', 'Datum', 'Totaal', 'Betaald', 'Openstaand', 'Status', 'Herinneringen']]
  for (const inv of invoices.value) {
    const outstanding = inv.total - (inv.paidAmount || 0)
    rows.push([
      inv.number || '',
      inv.customer?.name || '',
      new Date(inv.createdAt).toLocaleDateString('nl-NL'),
      String(inv.total),
      String(inv.paidAmount || 0),
      String(outstanding),
      inv.status,
      String(inv.reminderCount || 0)
    ])
  }
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `facturen-${filterFrom.value}-${filterTo.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function printInvoices() {
  window.print()
}

async function fetchConfig() {
  accountingConfig.value = await $fetch('/api/accounting/config')
}

async function fetchCustomers() {
  customers.value = await $fetch('/api/customers', { query: { marinaId: marinaId.value } }) as any[]
}

async function fetchTariffs() {
  tariffs.value = await $fetch('/api/tariffs') as any[]
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

// Apply tariff: fill in a line based on selected tariff + customer's boat
async function applyTariff(tariffId: string) {
  const tariff = tariffs.value.find(t => t.id === tariffId)
  const customer = customers.value.find(c => c.id === newInvoice.value.customerId)
  const boatLength = customer?.boats?.[0]?.length || 10

  if (tariff) {
    const price = tariff.pricePerMeter * boatLength
    newInvoice.value.lines[0] = {
      description: `${tariff.name} — ${boatLength}m`,
      quantity: 1,
      unitPrice: Math.round(price * 100) / 100,
      vatRate: tariff.vatRate
    }
    // Add tourist tax if applicable
    if (tariff.touristTax > 0) {
      if (newInvoice.value.lines.length < 2) addLine()
      newInvoice.value.lines[1] = {
        description: 'Toeristenbelasting',
        quantity: 1,
        unitPrice: tariff.touristTax,
        vatRate: 0
      }
    }
  }
}

async function sendInvoice() {
  if (!newInvoice.value.customerId || !newInvoice.value.lines.some(l => l.description && l.unitPrice > 0)) return
  sending.value = true
  try {
    const result = await $fetch('/api/accounting/send-invoice', {
      method: 'POST',
      body: {
        customerId: newInvoice.value.customerId,
        description: newInvoice.value.description,
        lines: newInvoice.value.lines.filter(l => l.description && l.unitPrice > 0),
        sendEmail: newInvoice.value.sendEmail
      }
    }) as any

    newInvoice.value = { customerId: '', description: '', lines: [{ description: '', quantity: 1, unitPrice: 0, vatRate: 21 }], sendEmail: true }
    activeTab.value = 'invoices'
    await fetchInvoices()

    // Open in external system if URL available
    if (result.externalUrl) {
      window.open(result.externalUrl, '_blank')
    }
  }
  catch (e: any) {
    errorMessage.value = fetchErrorMessage(e, 'Versturen mislukt')
  }
  finally { sending.value = false }
}

async function syncAll() {
  syncing.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/accounting/sync', { method: 'POST' })
    await fetchInvoices()
  }
  catch (e: any) {
    errorMessage.value = fetchErrorMessage(e, 'Sync mislukt')
  }
  finally { syncing.value = false }
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1200px]">
    <div class="flex items-end justify-between mb-5">
      <div>
        <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight">Facturatie</h1>
        <div class="text-xs text-[#5A6A78] mt-0.5">
          <template v-if="accountingConfig?.hasToken">
            Gekoppeld met <span class="font-semibold capitalize">{{ accountingConfig.integration?.provider }}</span>
          </template>
          <template v-else>
            <NuxtLink to="/dashboard/settings" class="text-primary-500 font-medium">Koppel je boekhouding →</NuxtLink>
          </template>
        </div>
      </div>
      <div class="flex gap-2">
        <button
          v-if="accountingConfig?.hasToken"
          class="px-3 py-2 rounded-full bg-[#F4F7F8] text-[#5A6A78] text-xs font-semibold disabled:opacity-50"
          :disabled="syncing"
          @click="syncAll"
        >
          {{ syncing ? 'Syncing...' : 'Sync status' }}
        </button>
        <button
          class="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold"
          @click="activeTab = 'new'"
        >
          + Factuur versturen
        </button>
      </div>
    </div>

    <!-- Load error -->
    <div v-if="loadError" class="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 flex items-start gap-3 print:hidden">
      <UIcon name="i-lucide-alert-triangle" class="size-4 text-red-600 mt-0.5 shrink-0" />
      <div class="flex-1 text-sm text-red-700">{{ loadError }}</div>
      <button class="text-xs text-red-700 font-semibold underline" @click="loadAll">Opnieuw laden</button>
    </div>

    <!-- Action error -->
    <div v-if="errorMessage" class="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 flex items-start gap-3 print:hidden">
      <UIcon name="i-lucide-alert-triangle" class="size-4 text-red-600 mt-0.5 shrink-0" />
      <div class="flex-1 text-sm text-red-700">{{ errorMessage }}</div>
      <button class="text-xs text-red-700 underline" @click="errorMessage = ''">Sluiten</button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-5">
      <button
        class="px-3 py-1.5 rounded-full text-xs font-semibold"
        :class="activeTab === 'invoices' ? 'bg-[#0A1520] text-white' : 'bg-[#F4F7F8] text-[#5A6A78]'"
        @click="activeTab = 'invoices'"
      >
        Facturen ({{ invoices.length }})
      </button>
      <button
        class="px-3 py-1.5 rounded-full text-xs font-semibold"
        :class="activeTab === 'new' ? 'bg-[#0A1520] text-white' : 'bg-[#F4F7F8] text-[#5A6A78]'"
        @click="activeTab = 'new'"
      >
        Nieuwe factuur
      </button>
    </div>

    <!-- No accounting connected warning -->
    <div v-if="!loading && !accountingConfig?.hasToken && activeTab === 'new'" class="bg-amber-50 border border-amber-200 rounded-[14px] p-5 mb-5">
      <div class="text-sm font-semibold text-amber-800 mb-1">Geen boekhouding gekoppeld</div>
      <div class="text-xs text-amber-700 mb-3">
        Koppel eerst je Moneybird (of andere boekhoudsoftware) om facturen te kunnen versturen.
      </div>
      <NuxtLink to="/dashboard/settings" class="px-4 py-2 rounded-full bg-amber-500 text-white text-xs font-semibold">
        Ga naar Beheer → Koppelingen
      </NuxtLink>
    </div>

    <!-- Summary + filters -->
    <div v-if="activeTab === 'invoices'" class="print:hidden">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div class="bg-white border border-black/[0.08] rounded-[10px] px-3 py-2">
          <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold">Ontvangen</div>
          <div class="text-sm font-semibold text-[#0A1520]">{{ formatCurrency(summary.totalRevenue || 0) }}</div>
        </div>
        <div class="bg-white border border-black/[0.08] rounded-[10px] px-3 py-2">
          <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold">Open</div>
          <div class="text-sm font-semibold text-[#F59E0B]">{{ formatCurrency(summary.totalOutstanding || 0) }}</div>
        </div>
        <div class="bg-white border border-black/[0.08] rounded-[10px] px-3 py-2">
          <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold">Verlopen</div>
          <div class="text-sm font-semibold text-[#EF4444]">{{ summary.overdueCount || 0 }}</div>
        </div>
        <div class="bg-white border border-black/[0.08] rounded-[10px] px-3 py-2">
          <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold">Betaald</div>
          <div class="text-sm font-semibold text-[#10B981]">{{ summary.paidCount || 0 }}</div>
        </div>
      </div>

      <div class="flex gap-2 mb-3 flex-wrap items-center">
        <input v-model="filterFrom" type="date" class="px-3 py-2 text-xs rounded-lg border border-black/[0.1] bg-white">
        <span class="text-xs text-[#5A6A78]">t/m</span>
        <input v-model="filterTo" type="date" class="px-3 py-2 text-xs rounded-lg border border-black/[0.1] bg-white">
        <select v-model="filterStatus" class="px-3 py-2 text-xs rounded-lg border border-black/[0.1] bg-white">
          <option value="">Alle statussen</option>
          <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
        </select>
        <select v-model="filterMethod" class="px-3 py-2 text-xs rounded-lg border border-black/[0.1] bg-white">
          <option value="">Alle methodes</option>
          <option value="cash">Contant</option>
          <option value="pin">PIN</option>
          <option value="transfer">Overschrijving</option>
          <option value="creditcard">Creditcard</option>
          <option value="online">Online</option>
        </select>
        <div class="flex-1" />
        <button class="px-3 py-2 rounded-lg bg-[#F4F7F8] text-[#5A6A78] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-black/5" @click="exportCsv">
          <UIcon name="i-lucide-download" class="size-3.5" /> Export CSV
        </button>
        <button class="px-3 py-2 rounded-lg bg-[#F4F7F8] text-[#5A6A78] text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-black/5" @click="printInvoices">
          <UIcon name="i-lucide-printer" class="size-3.5" /> Print
        </button>
      </div>
    </div>

    <!-- Invoice list -->
    <div v-if="activeTab === 'invoices'" class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
      <div
        v-for="(inv, i) in invoices"
        :key="inv.id"
        class="flex items-center gap-3 px-5 py-3.5"
        :class="i < invoices.length - 1 ? 'border-b border-black/[0.08]' : ''"
      >
        <span class="w-2 h-2 rounded-full shrink-0" :style="{ background: statusColors[inv.status] || '#5A6A78' }" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-[#0A1520] flex items-center gap-2">
            {{ inv.number || inv.description || 'Factuur' }}
            <span v-if="inv.reminderCount > 0" class="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-600 font-semibold">{{ inv.reminderCount }}× herinnerd</span>
          </div>
          <div class="text-xs text-[#5A6A78]">
            {{ inv.customer?.name || 'Onbekend' }}
            · {{ formatDate(inv.createdAt) }}
            <span v-if="inv.dueDate"> · vervalt {{ formatDate(inv.dueDate) }}</span>
            <span v-if="inv.syncedAt" class="text-[#5A6A78]/60"> · gesynct {{ formatDate(inv.syncedAt) }}</span>
          </div>
          <div v-if="inv.paidAmount > 0 && inv.paidAmount < inv.total" class="text-[11px] text-emerald-600 mt-0.5">
            {{ formatCurrency(inv.paidAmount) }} voldaan · nog {{ formatCurrency(inv.total - inv.paidAmount) }}
          </div>
        </div>
        <div class="text-sm font-semibold text-[#0A1520] shrink-0">{{ formatCurrency(inv.total) }}</div>
        <span
          class="px-2.5 py-1 rounded-full text-[10px] font-semibold shrink-0"
          :style="{ background: (statusColors[inv.status] || '#5A6A78') + '1A', color: statusColors[inv.status] || '#5A6A78' }"
        >
          {{ statusLabels[inv.status] || inv.status }}
        </span>

        <div class="flex gap-1 shrink-0 print:hidden">
          <button
            v-if="inv.status !== 'paid' && inv.status !== 'draft'"
            class="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#F4F7F8] text-[#5A6A78] hover:bg-emerald-500/10 hover:text-emerald-600"
            title="Deelbetaling registreren"
            @click="openPayment(inv)"
          >€</button>
          <button
            v-if="inv.paymentUrl"
            class="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#F4F7F8] text-[#5A6A78] hover:bg-primary-500/10 hover:text-primary-500"
            title="Betaallink kopiëren"
            @click="copyPaymentLink(inv.paymentUrl)"
          >
            <UIcon name="i-lucide-link" class="size-3" />
          </button>
          <button
            v-if="inv.status !== 'paid' && inv.status !== 'draft'"
            class="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#F4F7F8] text-[#5A6A78] hover:bg-amber-500/10 hover:text-amber-600"
            title="Herinnering versturen"
            @click="sendReminder(inv)"
          >
            <UIcon name="i-lucide-bell" class="size-3" />
          </button>
          <a
            v-if="inv.externalUrl"
            :href="inv.externalUrl"
            target="_blank"
            class="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#F4F7F8] text-[#5A6A78] hover:bg-black/10"
          >↗</a>
        </div>
      </div>
      <div v-if="!invoices.length" class="px-5 py-12 text-center text-sm text-[#5A6A78]">
        Geen facturen in deze periode
      </div>
    </div>

    <!-- Deelbetaling modal -->
    <Teleport to="body">
      <div v-if="paymentInvoice" class="fixed inset-0 z-[1000] bg-black/40 flex items-center justify-center p-4" @click.self="paymentInvoice = null">
        <div class="bg-white rounded-[14px] max-w-md w-full p-5">
          <div class="text-sm font-semibold text-[#0A1520] mb-1">Deelbetaling registreren</div>
          <div class="text-xs text-[#5A6A78] mb-4">{{ paymentInvoice.number }} · {{ paymentInvoice.customer?.name }}</div>
          <div class="text-xs text-[#5A6A78] mb-3">
            Totaal: {{ formatCurrency(paymentInvoice.total) }} · Reeds voldaan: {{ formatCurrency(paymentInvoice.paidAmount || 0) }}
          </div>
          <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold">Bedrag</label>
          <input v-model.number="paymentAmount" type="number" step="0.01" class="w-full mt-1 mb-3 px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
          <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold">Methode</label>
          <select v-model="paymentMethod" class="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
            <option value="cash">Contant</option>
            <option value="pin">PIN</option>
            <option value="transfer">Overschrijving</option>
            <option value="creditcard">Creditcard</option>
            <option value="online">Online</option>
          </select>
          <div class="flex justify-end gap-2 mt-4">
            <UButton color="neutral" variant="outline" size="sm" @click="paymentInvoice = null">Annuleren</UButton>
            <UButton color="primary" size="sm" :loading="paymentSaving" @click="savePayment">Opslaan</UButton>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- New invoice form -->
    <div v-if="activeTab === 'new' && accountingConfig?.hasToken" class="max-w-2xl">
      <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
        <div class="text-sm font-semibold text-[#0A1520] mb-4">Factuur versturen via {{ accountingConfig.integration?.provider }}</div>

        <div class="flex flex-col gap-4">
          <!-- Customer -->
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Klant *</label>
            <select v-model="newInvoice.customerId" class="w-full px-3 py-2.5 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]">
              <option value="">Selecteer klant...</option>
              <option v-for="c in customers" :key="c.id" :value="c.id">
                {{ c.name }}{{ c.boats?.[0] ? ` — ${c.boats[0].name} (${c.boats[0].length}m)` : '' }}
              </option>
            </select>
          </div>

          <!-- Quick tariff apply -->
          <div v-if="tariffs.length && newInvoice.customerId">
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Snel tarief toepassen</label>
            <div class="flex gap-1.5 flex-wrap">
              <button
                v-for="t in tariffs"
                :key="t.id"
                class="px-3 py-1.5 rounded-full text-xs font-medium bg-[#F4F7F8] text-[#5A6A78] hover:bg-primary-500/10 hover:text-primary-500 transition-all"
                @click="applyTariff(t.id)"
              >
                {{ t.name }} · €{{ t.pricePerMeter }}/m
              </button>
            </div>
          </div>

          <!-- Lines -->
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2 block">Regels</label>
            <div v-for="(line, i) in newInvoice.lines" :key="i" class="flex gap-2 mb-2 items-end">
              <div class="flex-1">
                <input v-model="line.description" type="text" placeholder="Omschrijving" class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8]">
              </div>
              <div class="w-20">
                <input v-model.number="line.quantity" type="number" min="1" class="w-full px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] text-center">
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

          <!-- Send email toggle -->
          <label class="flex items-center gap-2 text-sm cursor-pointer">
            <input v-model="newInvoice.sendEmail" type="checkbox" class="accent-primary-500 w-4 h-4">
            <span class="text-[#0A1520] font-medium">Direct per email versturen</span>
          </label>

          <!-- Total + send -->
          <div class="flex items-center justify-between pt-3 border-t border-black/[0.08]">
            <div>
              <div class="text-xs text-[#5A6A78]">Totaal incl. BTW</div>
              <div class="text-xl font-semibold text-[#0A1520]">{{ formatCurrency(invoiceTotal) }}</div>
            </div>
            <button
              class="px-6 py-2.5 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-50"
              :disabled="sending || !newInvoice.customerId || !newInvoice.lines.some(l => l.description && l.unitPrice > 0)"
              @click="sendInvoice"
            >
              {{ sending ? 'Versturen...' : 'Verstuur naar boekhouding' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
