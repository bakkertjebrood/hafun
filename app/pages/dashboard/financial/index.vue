<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const loading = ref(true)
const invoices = ref<any[]>([])
const accountingConfig = ref<any>(null)
const customers = ref<any[]>([])
const tariffs = ref<any[]>([])
const marinaId = ref('')
const syncing = ref(false)

const activeTab = ref<'invoices' | 'new'>('invoices')

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

onMounted(async () => {
  const discovered = await $fetch('/api/berths/discover') as any
  marinaId.value = discovered.marinaId
  await Promise.all([fetchInvoices(), fetchConfig(), fetchCustomers(), fetchTariffs()])
  loading.value = false
})

async function fetchInvoices() {
  const data = await $fetch('/api/invoices') as any
  invoices.value = data.invoices || []
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
    alert(e.data?.message || 'Versturen mislukt')
  }
  finally { sending.value = false }
}

async function syncAll() {
  syncing.value = true
  try {
    await $fetch('/api/accounting/sync', { method: 'POST' })
    await fetchInvoices()
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
          <div class="text-sm font-semibold text-[#0A1520]">{{ inv.number || inv.description || 'Factuur' }}</div>
          <div class="text-xs text-[#5A6A78]">
            {{ inv.customer?.name || 'Onbekend' }}
            · {{ formatDate(inv.createdAt) }}
            <span v-if="inv.syncedAt" class="text-[#5A6A78]/60"> · gesynct {{ formatDate(inv.syncedAt) }}</span>
          </div>
        </div>
        <div class="text-sm font-semibold text-[#0A1520] shrink-0">{{ formatCurrency(inv.total) }}</div>
        <span
          class="px-2.5 py-1 rounded-full text-[10px] font-semibold shrink-0"
          :style="{ background: (statusColors[inv.status] || '#5A6A78') + '1A', color: statusColors[inv.status] || '#5A6A78' }"
        >
          {{ statusLabels[inv.status] || inv.status }}
        </span>
        <a
          v-if="inv.externalUrl"
          :href="inv.externalUrl"
          target="_blank"
          class="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#F4F7F8] text-[#5A6A78] shrink-0 hover:bg-black/10"
        >
          Bekijk ↗
        </a>
      </div>
      <div v-if="!invoices.length" class="px-5 py-12 text-center text-sm text-[#5A6A78]">
        Nog geen facturen verstuurd
      </div>
    </div>

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
