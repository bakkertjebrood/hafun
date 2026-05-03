<script setup lang="ts">
definePageMeta({ layout: false })

const { user, logout } = useAuthUser()
const loading = ref(true)
const data = ref<any>(null)
const errorState = ref<{ kind: 'no-profile' | 'unauthorized' | 'server' | 'network'; message?: string } | null>(null)

async function load() {
  loading.value = true
  errorState.value = null
  try {
    data.value = await $fetch('/api/portal/me')
  }
  catch (e: any) {
    const status = e?.statusCode || e?.response?.status
    const message = e?.data?.message || e?.statusMessage
    if (status === 404) {
      errorState.value = { kind: 'no-profile' }
    }
    else if (status === 401 || status === 403) {
      errorState.value = { kind: 'unauthorized', message }
    }
    else if (status >= 500) {
      errorState.value = { kind: 'server', message }
    }
    else {
      errorState.value = { kind: 'network', message }
    }
    console.error('[portal] load failed:', e)
  }
  finally {
    loading.value = false
  }
}

onMounted(load)

function formatCurrency(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })
}

const statusLabels: Record<string, string> = {
  draft: 'Concept', sent: 'Verzonden', paid: 'Betaald', overdue: 'Verlopen'
}
const statusColors: Record<string, string> = {
  draft: '#5A6A78', sent: '#F59E0B', paid: '#10B981', overdue: '#EF4444'
}

const outstanding = computed(() => {
  if (!data.value?.customer?.invoices) return 0
  return data.value.customer.invoices
    .filter((i: any) => i.status !== 'paid' && i.status !== 'draft')
    .reduce((s: number, i: any) => s + (i.total - (i.paidAmount || 0)), 0)
})
</script>

<template>
  <div class="min-h-screen bg-[#F4F7F8]">
    <!-- Header -->
    <header class="bg-white border-b border-black/[0.08]">
      <div class="max-w-[900px] mx-auto px-4 py-4 flex items-center justify-between">
        <NautarLogo :size="18" />
        <div class="flex items-center gap-3">
          <div class="text-right hidden sm:block">
            <div class="text-xs text-[#5A6A78]">{{ data?.marina?.name }}</div>
            <div class="text-sm font-semibold text-[#0A1520]">{{ user?.firstName }} {{ user?.lastName }}</div>
          </div>
          <button class="p-2 text-[#5A6A78] hover:text-[#0A1520]" @click="logout">
            <UIcon name="i-lucide-log-out" class="size-5" />
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-[900px] mx-auto px-4 py-6">
      <div v-if="loading" class="text-sm text-[#5A6A78]">Laden...</div>

      <template v-else-if="errorState">
        <div class="bg-white border border-black/[0.08] rounded-[14px] p-8 text-center">
          <div v-if="errorState.kind === 'no-profile'" class="text-sm text-[#5A6A78]">
            Geen klantprofiel gekoppeld. Neem contact op met de havenmeester.
          </div>
          <template v-else>
            <div class="text-sm font-semibold text-[#0A1520] mb-1">
              <span v-if="errorState.kind === 'unauthorized'">Geen toegang</span>
              <span v-else-if="errorState.kind === 'server'">Er ging iets mis aan onze kant</span>
              <span v-else>Verbinding mislukt</span>
            </div>
            <div class="text-xs text-[#5A6A78] mb-4">
              {{ errorState.message || 'Probeer het zo opnieuw.' }}
            </div>
            <button
              v-if="errorState.kind !== 'unauthorized'"
              class="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold"
              @click="load"
            >
              Opnieuw proberen
            </button>
            <button
              v-else
              class="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold"
              @click="logout"
            >
              Opnieuw inloggen
            </button>
          </template>
        </div>
      </template>

      <template v-else-if="data">
        <h1 class="text-2xl font-semibold text-[#0A1520] tracking-tight mb-1">Welkom, {{ data.user.firstName || data.customer.name.split(' ')[0] }}</h1>
        <div class="text-sm text-[#5A6A78] mb-6">Uw overzicht bij {{ data.marina.name }}</div>

        <!-- KPI -->
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold">Openstaand</div>
            <div class="text-2xl font-semibold mt-1" :class="outstanding > 0 ? 'text-amber-600' : 'text-emerald-600'">
              {{ formatCurrency(outstanding) }}
            </div>
          </div>
          <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold">Boten</div>
            <div class="text-2xl font-semibold mt-1 text-[#0A1520]">{{ data.customer.boats.length }}</div>
          </div>
          <div class="bg-white border border-black/[0.08] rounded-[14px] p-4">
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold">Ligplaatsen</div>
            <div class="text-2xl font-semibold mt-1 text-[#0A1520]">{{ data.customer.berths.length }}</div>
          </div>
        </div>

        <!-- Boten -->
        <section class="mb-6">
          <h2 class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">Mijn boten</h2>
          <div class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
            <div
              v-for="(b, i) in data.customer.boats"
              :key="b.id"
              class="px-5 py-3 flex items-center gap-3"
              :class="i < (data.customer.boats.length as number) - 1 ? 'border-b border-black/[0.08]' : ''"
            >
              <UIcon name="i-lucide-sailboat" class="size-5 text-primary-500" />
              <div class="flex-1">
                <div class="text-sm font-semibold text-[#0A1520]">{{ b.name }}</div>
                <div class="text-xs text-[#5A6A78]">{{ b.type || '—' }} · {{ b.length }}m<span v-if="b.width"> × {{ b.width }}m</span></div>
              </div>
              <div v-if="b.registration" class="text-[11px] font-mono text-[#5A6A78]">{{ b.registration }}</div>
            </div>
            <div v-if="!data.customer.boats.length" class="p-6 text-center text-xs text-[#5A6A78]">Geen boten geregistreerd</div>
          </div>
        </section>

        <!-- Ligplaatsen -->
        <section class="mb-6">
          <h2 class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">Mijn ligplaatsen</h2>
          <div class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
            <div
              v-for="(b, i) in data.customer.berths"
              :key="b.id"
              class="px-5 py-3 flex items-center gap-3"
              :class="i < (data.customer.berths.length as number) - 1 ? 'border-b border-black/[0.08]' : ''"
            >
              <span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-500/10 text-primary-500">{{ b.code }}</span>
              <div class="text-xs text-[#5A6A78]">{{ b.length }}m × {{ b.width }}m · Steiger {{ b.pier }}</div>
            </div>
            <div v-if="!data.customer.berths.length" class="p-6 text-center text-xs text-[#5A6A78]">Geen ligplaatsen toegewezen</div>
          </div>
        </section>

        <!-- Facturen -->
        <section class="mb-6">
          <h2 class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">Mijn facturen</h2>
          <div class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
            <div
              v-for="(inv, i) in data.customer.invoices"
              :key="inv.id"
              class="px-5 py-3 flex items-center gap-3"
              :class="i < (data.customer.invoices.length as number) - 1 ? 'border-b border-black/[0.08]' : ''"
            >
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold text-[#0A1520]">{{ inv.number || 'Factuur' }}</div>
                <div class="text-xs text-[#5A6A78]">{{ formatDate(inv.createdAt) }}<span v-if="inv.dueDate"> · vervalt {{ formatDate(inv.dueDate) }}</span></div>
              </div>
              <div class="text-sm font-semibold text-[#0A1520] shrink-0">{{ formatCurrency(inv.total) }}</div>
              <span
                class="px-2.5 py-1 rounded-full text-[10px] font-semibold shrink-0"
                :style="{ background: statusColors[inv.status] + '1A', color: statusColors[inv.status] }"
              >{{ statusLabels[inv.status] || inv.status }}</span>
              <a v-if="inv.paymentUrl && inv.status !== 'paid'" :href="inv.paymentUrl" target="_blank" class="px-3 py-1 rounded-full text-[11px] font-semibold bg-primary-500 text-white shrink-0">
                Betalen
              </a>
              <a v-else-if="inv.externalUrl" :href="inv.externalUrl" target="_blank" class="text-[11px] text-[#5A6A78] shrink-0">↗</a>
            </div>
            <div v-if="!data.customer.invoices.length" class="p-6 text-center text-xs text-[#5A6A78]">Geen facturen</div>
          </div>
        </section>

        <!-- Meldingen -->
        <section v-if="data.notes.length">
          <h2 class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">Meldingen over uw ligplaats</h2>
          <div class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
            <div
              v-for="(n, i) in data.notes"
              :key="n.id"
              class="px-5 py-3"
              :class="i < (data.notes.length as number) - 1 ? 'border-b border-black/[0.08]' : ''"
            >
              <div class="text-xs text-[#0A1520]">{{ n.text }}</div>
              <div class="text-[11px] text-[#5A6A78] mt-1">{{ formatDate(n.createdAt) }} · {{ n.author.firstName }} {{ n.author.lastName }}</div>
            </div>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
