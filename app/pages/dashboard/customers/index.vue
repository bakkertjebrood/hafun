<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const search = ref('')
const marinaId = ref('')
const customers = ref<any[]>([])
const loading = ref(true)

const contractLabels: Record<string, string> = {
  YEAR: 'Jaarcontract',
  SUMMER: 'Seizoencontract',
  TEMPORARY: 'Tijdelijk'
}

onMounted(async () => {
  const discovered = await $fetch('/api/berths/discover') as any
  marinaId.value = discovered.marinaId
  await fetchCustomers()
  loading.value = false
})

async function fetchCustomers() {
  customers.value = await $fetch('/api/customers', {
    query: { marinaId: marinaId.value, search: search.value }
  }) as any[]
}

let searchTimeout: ReturnType<typeof setTimeout>
watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(fetchCustomers, 300)
})
</script>

<template>
  <div class="p-7 max-w-[1200px]">
    <!-- Header -->
    <div class="flex items-end justify-between mb-6">
      <div>
        <h1 class="text-2xl font-semibold text-[#0A1520] tracking-tight">Huurders</h1>
        <div class="text-xs text-[#5A6A78] mt-1">{{ customers.length }} klanten</div>
      </div>
      <UButton color="primary" class="rounded-full">
        + Nieuwe klant
      </UButton>
    </div>

    <!-- Search -->
    <div class="mb-5">
      <input
        v-model="search"
        type="text"
        placeholder="Zoek op naam, email, boot..."
        class="w-full max-w-md px-4 py-2.5 text-sm rounded-full border border-black/[0.08] bg-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
      >
    </div>

    <!-- Customer list -->
    <div v-if="loading" class="text-sm text-[#5A6A78]">Laden...</div>
    <div v-else class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
      <NuxtLink
        v-for="(customer, i) in customers"
        :key="customer.id"
        :to="`/dashboard/customers/${customer.id}`"
        class="flex items-center gap-4 px-5 py-4 hover:bg-black/[0.02] transition-colors"
        :class="i < customers.length - 1 ? 'border-b border-black/[0.08]' : ''"
      >
        <!-- Avatar -->
        <div class="w-10 h-10 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center text-sm font-semibold shrink-0">
          {{ customer.name.split(' ').slice(-1)[0]?.[0] || '?' }}
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold text-[#0A1520]">{{ customer.name }}</div>
          <div class="text-xs text-[#5A6A78] mt-0.5 flex items-center gap-2">
            <span v-if="customer.email">{{ customer.email }}</span>
            <span v-if="customer.phone" class="text-[#5A6A78]/60">{{ customer.phone }}</span>
          </div>
        </div>

        <!-- Boats -->
        <div v-if="customer.boats?.length" class="text-right shrink-0">
          <div class="text-xs font-medium text-[#0A1520]">{{ customer.boats[0].name }}</div>
          <div class="text-[11px] text-[#5A6A78]">{{ customer.boats[0].type }} · {{ customer.boats[0].length }}m</div>
        </div>

        <!-- Berth -->
        <div v-if="customer.berths?.length" class="shrink-0">
          <span class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-primary-500/10 text-primary-500">
            {{ customer.berths[0].code }}
          </span>
        </div>

        <!-- Contract -->
        <div class="shrink-0 w-28 text-right">
          <span class="text-[11px] text-[#5A6A78]">{{ contractLabels[customer.contractType] || customer.contractType }}</span>
        </div>

        <!-- Arrow -->
        <UIcon name="i-lucide-chevron-right" class="size-4 text-[#5A6A78]/40 shrink-0" />
      </NuxtLink>

      <div v-if="!customers.length" class="px-5 py-12 text-center">
        <div class="text-sm text-[#5A6A78]">Geen klanten gevonden</div>
        <div class="text-xs text-[#5A6A78]/60 mt-1">Pas je zoekterm aan of voeg een nieuwe klant toe</div>
      </div>
    </div>
  </div>
</template>
