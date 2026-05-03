<script setup lang="ts">
const props = defineProps<{ berthId: string; marinaId: string }>()
const emit = defineEmits<{ close: []; linked: [] }>()

const search = ref('')
const customers = ref<any[]>([])
const loading = ref(false)
const linking = ref(false)

const mode = ref<'search' | 'create'>('search')
const createError = ref('')
const newCustomer = ref({ name: '', email: '', phone: '' })

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

function startCreate() {
  newCustomer.value = { name: search.value.trim(), email: '', phone: '' }
  createError.value = ''
  mode.value = 'create'
}

async function createAndLink() {
  if (!newCustomer.value.name.trim()) {
    createError.value = 'Naam is verplicht'
    return
  }
  linking.value = true
  createError.value = ''
  try {
    const created = await $fetch('/api/customers', {
      method: 'POST',
      body: {
        marinaId: props.marinaId,
        name: newCustomer.value.name.trim(),
        email: newCustomer.value.email.trim() || undefined,
        phone: newCustomer.value.phone.trim() || undefined
      }
    }) as any
    await linkCustomer(created.id)
  }
  catch (e: any) {
    createError.value = e?.data?.message || e?.message || 'Aanmaken mislukt'
    linking.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-[2000] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('close')" />

    <div class="relative bg-white rounded-[20px] shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
      <div class="px-6 pt-5 pb-3 flex items-center justify-between border-b border-black/[0.08]">
        <div class="flex items-center gap-2">
          <button
            v-if="mode === 'create'"
            class="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center -ml-2"
            :disabled="linking"
            @click="mode = 'search'"
          >
            <UIcon name="i-lucide-arrow-left" class="size-4 text-[#5A6A78]" />
          </button>
          <h2 class="text-lg font-semibold text-[#0A1520]">
            {{ mode === 'create' ? 'Nieuwe klant' : 'Klant koppelen' }}
          </h2>
        </div>
        <button class="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center" @click="emit('close')">
          <UIcon name="i-lucide-x" class="size-4 text-[#5A6A78]" />
        </button>
      </div>

      <template v-if="mode === 'search'">
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

        <div class="px-6 py-3 border-t border-black/[0.08]">
          <button
            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-full bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
            :disabled="linking"
            @click="startCreate"
          >
            <UIcon name="i-lucide-plus" class="size-4" />
            Nieuwe klant aanmaken
          </button>
        </div>
      </template>

      <template v-else>
        <form class="flex-1 overflow-y-auto px-6 py-4 space-y-3" @submit.prevent="createAndLink">
          <div>
            <label class="block text-xs font-semibold text-[#5A6A78] mb-1">Naam *</label>
            <input
              v-model="newCustomer.name"
              type="text"
              autofocus
              required
              class="w-full px-4 py-2.5 text-sm rounded-full border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#5A6A78] mb-1">E-mail</label>
            <input
              v-model="newCustomer.email"
              type="email"
              class="w-full px-4 py-2.5 text-sm rounded-full border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500"
            >
          </div>
          <div>
            <label class="block text-xs font-semibold text-[#5A6A78] mb-1">Telefoon</label>
            <input
              v-model="newCustomer.phone"
              type="tel"
              class="w-full px-4 py-2.5 text-sm rounded-full border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500"
            >
          </div>

          <div v-if="createError" class="text-xs text-red-600">{{ createError }}</div>

          <div class="pt-2 flex gap-2">
            <button
              type="button"
              class="flex-1 px-4 py-2.5 text-sm font-semibold rounded-full border border-black/[0.08] hover:bg-black/[0.03] transition-colors"
              :disabled="linking"
              @click="mode = 'search'"
            >
              Annuleren
            </button>
            <button
              type="submit"
              class="flex-1 px-4 py-2.5 text-sm font-semibold rounded-full bg-primary-500 text-white hover:bg-primary-600 transition-colors disabled:opacity-50"
              :disabled="linking || !newCustomer.name.trim()"
            >
              {{ linking ? 'Bezig...' : 'Aanmaken & koppelen' }}
            </button>
          </div>
        </form>
      </template>
    </div>
  </div>
</template>
