<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const date = ref(new Date().toISOString().slice(0, 10))
const loading = ref(true)
const report = ref<any>(null)

async function fetchReport() {
  loading.value = true
  report.value = await $fetch('/api/reports/closing', { query: { date: date.value } })
  loading.value = false
}

onMounted(fetchReport)
watch(date, fetchReport)

function formatCurrency(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

const methodLabels: Record<string, string> = {
  cash: 'Contant', pin: 'PIN', creditcard: 'Creditcard', transfer: 'Overschrijving', invoice: 'Op factuur', online: 'Online'
}

function print() {
  window.print()
}
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1100px]">
    <div class="flex items-end justify-between mb-4 lg:mb-6 print:hidden">
      <div>
        <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight">Dagafsluiting</h1>
      </div>
      <div class="flex gap-2 items-center">
        <input v-model="date" type="date" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1] bg-white">
        <UButton color="neutral" variant="outline" size="sm" @click="print">
          <UIcon name="i-lucide-printer" class="size-4 mr-1" /> Print
        </UButton>
      </div>
    </div>

    <h2 class="hidden print:block text-lg font-semibold mb-3">Dagafsluiting — {{ new Date(date).toLocaleDateString('nl-NL') }}</h2>

    <div v-if="loading" class="text-sm text-[#5A6A78]">Laden...</div>
    <template v-else-if="report">
      <!-- KPIs -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
          <div class="text-xs text-[#5A6A78]">Ontvangen betalingen</div>
          <div class="text-xl font-semibold text-[#0A1520] mt-1">{{ formatCurrency(report.payments.total) }}</div>
        </div>
        <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
          <div class="text-xs text-[#5A6A78]">Kassa-omzet</div>
          <div class="text-xl font-semibold text-[#0A1520] mt-1">{{ formatCurrency(report.pos.total) }}</div>
          <div class="text-[11px] text-[#5A6A78] mt-0.5">{{ report.pos.count }} transacties</div>
        </div>
        <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
          <div class="text-xs text-[#5A6A78]">Aankomsten</div>
          <div class="text-xl font-semibold text-[#0A1520] mt-1">{{ report.arrivals.length }}</div>
        </div>
        <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
          <div class="text-xs text-[#5A6A78]">Vertrekken</div>
          <div class="text-xl font-semibold text-[#0A1520] mt-1">{{ report.departures.length }}</div>
        </div>
      </div>

      <!-- Ontvangsten per methode -->
      <div class="bg-white border border-black/[0.08] rounded-[14px] p-5 mb-4">
        <div class="text-sm font-semibold text-[#0A1520] mb-3">Ontvangen per betaalmethode</div>
        <div v-if="!Object.keys(report.payments.byMethod).length && !Object.keys(report.pos.byMethod).length" class="text-xs text-[#5A6A78]">Geen ontvangsten op deze dag</div>
        <div v-else class="space-y-2">
          <div
            v-for="(s, m) in { ...report.payments.byMethod }"
            :key="'p-' + m"
            class="flex items-center justify-between text-sm"
          >
            <span class="text-[#5A6A78]">{{ methodLabels[m] || m }} (factuur)</span>
            <span class="font-semibold text-[#0A1520]">{{ formatCurrency(s.total) }} <span class="text-xs text-[#5A6A78]">· {{ s.count }}x</span></span>
          </div>
          <div
            v-for="(s, m) in { ...report.pos.byMethod }"
            :key="'pos-' + m"
            class="flex items-center justify-between text-sm"
          >
            <span class="text-[#5A6A78]">{{ methodLabels[m] || m }} (kassa)</span>
            <span class="font-semibold text-[#0A1520]">{{ formatCurrency(s.total) }} <span class="text-xs text-[#5A6A78]">· {{ s.count }}x</span></span>
          </div>
        </div>
      </div>

      <!-- Aankomsten & vertrekken -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
          <div class="text-sm font-semibold text-[#0A1520] mb-3">Aankomsten</div>
          <div v-if="!report.arrivals.length" class="text-xs text-[#5A6A78]">—</div>
          <div v-for="b in report.arrivals" :key="b.id" class="flex items-center gap-3 py-2 border-b border-black/[0.06] last:border-b-0">
            <div class="font-mono text-[11px] text-[#5A6A78] w-14 shrink-0">{{ formatTime(b.dateFrom) }}</div>
            <div class="flex-1 text-xs">
              <div class="font-semibold text-[#0A1520]">{{ b.customer?.name || b.guest?.name || '—' }}</div>
              <div class="text-[11px] text-[#5A6A78]">{{ b.berth?.code }}</div>
            </div>
          </div>
        </div>
        <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
          <div class="text-sm font-semibold text-[#0A1520] mb-3">Vertrekken</div>
          <div v-if="!report.departures.length" class="text-xs text-[#5A6A78]">—</div>
          <div v-for="b in report.departures" :key="b.id" class="flex items-center gap-3 py-2 border-b border-black/[0.06] last:border-b-0">
            <div class="font-mono text-[11px] text-[#5A6A78] w-14 shrink-0">{{ formatTime(b.dateTo) }}</div>
            <div class="flex-1 text-xs">
              <div class="font-semibold text-[#0A1520]">{{ b.customer?.name || b.guest?.name || '—' }}</div>
              <div class="text-[11px] text-[#5A6A78]">{{ b.berth?.code }}</div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
