<script setup lang="ts">
const props = defineProps<{ berthId: string; marinaId: string }>()
const emit = defineEmits<{ close: []; linked: [] }>()

const search = ref('')
const customers = ref<any[]>([])
const loading = ref(false)
const linking = ref(false)

let searchTimeout: ReturnType<typeof setTimeout>

watch(search, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(fetchCustomers, 300)
})

onMounted(() => fetchCustomers())

async function fetchCustomers() {
  loading.value = true
  try {
    customers.value = await $fetch('/api/customers', {
      query: { marinaId: props.marinaId, search: search.value }
    }) as any[]
  }
  finally { loading.value = false }
}

async function linkCustomer(customerId: string, boatId?: string) {
  linking.value = true
  try {
    await $fetch(`/api/berths/${props.berthId}`, {
      method: 'PUT',
      body: {
        customerId,
        boatId: boatId || null,
        status: 'OCCUPIED'
      }
    })
    emit('linked')
  }
  finally { linking.value = false }
}
</script>

<template>
  <div class="fixed inset-0 z-[2000] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('close')" />

    <div class="relative bg-white rounded-[20px] shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
      <div class="px-6 pt-5 pb-3 flex items-center justify-between border-b border-black/[0.08]">
        <h2 class="text-lg font-semibold text-[#0A1520]">Klant koppelen</h2>
        <button class="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center" @click="emit('close')">
          <UIcon name="i-lucide-x" class="size-4 text-[#5A6A78]" />
        </button>
      </div>

      <div class="px-6 py-3">
        <input
          v-model="search"
          type="text"
          placeholder="Zoek op naam, boot..."
          autofocus
          class="w-full px-4 py-2.5 text-sm rounded-full border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500"
        >
      </div>

      <div class="flex-1 overflow-y-auto px-3 pb-4">
        <button
          v-for="customer in customers"
          :key="customer.id"
          class="w-full flex items-center gap-3 px-3 py-3 rounded-[10px] hover:bg-black/[0.03] transition-colors text-left"
          :disabled="linking"
          @click="linkCustomer(customer.id, customer.boats?.[0]?.id)"
        >
          <div class="w-9 h-9 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center text-xs font-semibold shrink-0">
            {{ customer.name.split(' ').slice(-1)[0]?.[0] || '?' }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-[#0A1520] truncate">{{ customer.name }}</div>
            <div class="text-xs text-[#5A6A78] truncate">
              {{ customer.boats?.[0]?.name || 'Geen boot' }}
              <span v-if="customer.boats?.[0]?.length"> · {{ customer.boats[0].length }}m</span>
            </div>
          </div>
          <UIcon name="i-lucide-link" class="size-4 text-[#5A6A78]/40 shrink-0" />
        </button>

        <div v-if="!customers.length && !loading" class="py-8 text-center text-sm text-[#5A6A78]">
          Geen klanten gevonden
        </div>
      </div>
    </div>
  </div>
</template>
