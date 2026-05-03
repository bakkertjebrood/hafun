<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const route = useRoute()
const customer = ref<any>(null)
const loading = ref(true)
const { loadError, messageFor } = useFetchError()

const contractLabels: Record<string, string> = {
  YEAR: 'Jaarcontract',
  SUMMER: 'Seizoencontract',
  TEMPORARY: 'Tijdelijk'
}

const statusColors: Record<string, string> = {
  open: '#EF4444',
  partial: '#F59E0B',
  paid: '#10B981',
  cancelled: '#9CA3AF'
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    customer.value = await $fetch(`/api/customers/${route.params.id}`)
  }
  catch (e) {
    loadError.value = messageFor(e, 'Kon klantgegevens niet laden')
  }
  finally {
    loading.value = false
  }
}

onMounted(load)

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(amount)
}
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1200px]">
    <div v-if="loadError" class="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 flex items-start gap-3">
      <UIcon name="i-lucide-alert-triangle" class="size-4 text-red-600 mt-0.5 shrink-0" />
      <div class="flex-1 text-sm text-red-700">{{ loadError }}</div>
      <button class="text-xs text-red-700 font-semibold underline" @click="load()">Opnieuw laden</button>
    </div>

    <div v-if="loading" class="text-sm text-[#5A6A78]">Laden...</div>
    <template v-else-if="customer">
      <!-- Back + Header -->
      <div class="mb-6">
        <NuxtLink to="/dashboard/customers" class="inline-flex items-center gap-1 text-xs text-[#5A6A78] hover:text-[#0A1520] mb-3">
          <UIcon name="i-lucide-arrow-left" class="size-3.5" />
          Huurders
        </NuxtLink>
        <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div class="flex items-center gap-3 lg:gap-4">
            <div class="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-primary-500 text-white flex items-center justify-center text-lg lg:text-xl font-semibold shrink-0">
              {{ customer.name.split(' ').slice(-1)[0]?.[0] || '?' }}
            </div>
            <div>
              <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight">{{ customer.name }}</h1>
              <div class="flex flex-wrap items-center gap-2 mt-1">
                <span class="text-xs text-[#5A6A78]">{{ contractLabels[customer.contractType] }}</span>
                <span v-if="customer.email" class="text-xs text-[#5A6A78] hidden sm:inline">{{ customer.email }}</span>
                <span v-if="customer.phone" class="text-xs text-[#5A6A78]">{{ customer.phone }}</span>
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <UButton color="neutral" variant="outline" class="rounded-full flex-1 sm:flex-none" size="sm">
              Bericht
            </UButton>
            <UButton color="primary" class="rounded-full flex-1 sm:flex-none" size="sm">
              Factuur
            </UButton>
          </div>
        </div>
      </div>

      <!-- Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        <!-- Boten -->
        <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
          <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-3">
            Boten ({{ customer.boats?.length || 0 }})
          </div>
          <div v-for="boat in customer.boats" :key="boat.id" class="flex items-center gap-3 py-3 border-b border-black/[0.08] last:border-0">
            <div class="w-9 h-9 rounded-[10px] bg-[#F4F7F8] flex items-center justify-center">
              <UIcon name="i-lucide-sailboat" class="size-4 text-primary-500" />
            </div>
            <div class="flex-1">
              <div class="text-sm font-semibold text-[#0A1520]">{{ boat.name }}</div>
              <div class="text-xs text-[#5A6A78]">{{ boat.type }} · {{ boat.length }}m × {{ boat.width || '?' }}m</div>
            </div>
            <div v-if="boat.registration" class="text-[11px] font-mono text-[#5A6A78]">{{ boat.registration }}</div>
          </div>
          <div v-if="!customer.boats?.length" class="text-sm text-[#5A6A78] italic py-3">Geen boten</div>
        </div>

        <!-- Ligplaatsen -->
        <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
          <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-3">
            Ligplaatsen ({{ customer.berths?.length || 0 }})
          </div>
          <div v-for="berth in customer.berths" :key="berth.id" class="flex items-center gap-3 py-3 border-b border-black/[0.08] last:border-0">
            <NuxtLink :to="`/dashboard/map`" class="flex items-center gap-3 flex-1">
              <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary-500/10 text-primary-500">
                {{ berth.code }}
              </span>
              <div class="flex-1">
                <div class="text-sm text-[#0A1520]">Steiger {{ berth.code[0] }}</div>
                <div v-if="berth.boat" class="text-xs text-[#5A6A78]">{{ berth.boat.name }}</div>
              </div>
            </NuxtLink>
          </div>
          <div v-if="!customer.berths?.length" class="text-sm text-[#5A6A78] italic py-3">Geen ligplaatsen</div>
        </div>

        <!-- Facturen -->
        <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
          <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-3">
            Facturen ({{ customer.invoices?.length || 0 }})
          </div>
          <div v-for="inv in customer.invoices" :key="inv.id" class="flex items-center gap-3 py-3 border-b border-black/[0.08] last:border-0">
            <span
              class="w-2 h-2 rounded-full shrink-0"
              :style="{ background: statusColors[inv.status] || '#9CA3AF' }"
            />
            <div class="flex-1">
              <div class="text-sm font-medium text-[#0A1520]">{{ inv.number }}</div>
              <div class="text-xs text-[#5A6A78]">{{ formatDate(inv.date) }}</div>
            </div>
            <div class="text-sm font-semibold text-[#0A1520]">{{ formatCurrency(inv.total) }}</div>
            <span
              class="px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize"
              :style="{
                background: (statusColors[inv.status] || '#9CA3AF') + '1A',
                color: statusColors[inv.status] || '#9CA3AF'
              }"
            >
              {{ inv.status === 'open' ? 'Open' : inv.status === 'paid' ? 'Betaald' : inv.status === 'partial' ? 'Deels' : inv.status }}
            </span>
          </div>
          <div v-if="!customer.invoices?.length" class="text-sm text-[#5A6A78] italic py-3">Geen facturen</div>
        </div>

        <!-- Notities -->
        <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
          <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-3">
            Notities ({{ customer.notes?.length || 0 }})
          </div>
          <div v-for="note in customer.notes" :key="note.id" class="py-3 border-b border-black/[0.08] last:border-0">
            <div class="text-sm text-[#0A1520]">{{ note.text }}</div>
            <div class="text-[11px] text-[#5A6A78] mt-1">
              {{ formatDate(note.createdAt) }} · {{ note.author.firstName }} {{ note.author.lastName }}
            </div>
          </div>
          <div v-if="!customer.notes?.length" class="text-sm text-[#5A6A78] italic py-3">Geen notities</div>
        </div>
      </div>
    </template>
  </div>
</template>
