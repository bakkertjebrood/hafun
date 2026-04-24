<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const loading = ref(true)
const boats = ref<any[]>([])
const marinaId = ref('')
const search = ref('')
const editingBoat = ref<any>(null)
const editPhoto = ref('')
const saving = ref(false)

onMounted(async () => {
  const d = await $fetch('/api/berths/discover') as any
  marinaId.value = d.marinaId
  boats.value = await $fetch('/api/boats', { query: { marinaId: d.marinaId } }) as any[]
  loading.value = false
})

const filtered = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return boats.value
  return boats.value.filter(b =>
    b.name?.toLowerCase().includes(q)
    || b.customer?.name?.toLowerCase().includes(q)
    || b.berths?.[0]?.code?.toLowerCase().includes(q)
  )
})

function startEdit(boat: any) {
  editingBoat.value = boat
  editPhoto.value = boat.photo || ''
}

async function savePhoto() {
  if (!editingBoat.value) return
  saving.value = true
  try {
    const updated = await $fetch(`/api/boats/${editingBoat.value.id}`, {
      method: 'PUT',
      body: { photo: editPhoto.value || null }
    }) as any
    const idx = boats.value.findIndex(b => b.id === editingBoat.value.id)
    if (idx >= 0) boats.value[idx] = { ...boats.value[idx], photo: updated.photo }
    editingBoat.value = null
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1400px]">
    <div class="flex items-end justify-between mb-4 lg:mb-6">
      <div>
        <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight">Boten-fotobord</h1>
        <div class="text-xs text-[#5A6A78] mt-0.5">{{ filtered.length }} boten</div>
      </div>
    </div>

    <input
      v-model="search"
      placeholder="Zoek op bootnaam, klant of ligplaats..."
      class="w-full mb-4 px-4 py-2.5 text-sm rounded-full border border-black/[0.08] bg-white"
    >

    <div v-if="loading" class="text-sm text-[#5A6A78]">Laden...</div>
    <div v-else-if="!filtered.length" class="bg-white border border-black/[0.08] rounded-[14px] p-8 text-center text-sm text-[#5A6A78]">
      Geen boten gevonden
    </div>
    <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      <div
        v-for="b in filtered"
        :key="b.id"
        class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden cursor-pointer hover:border-primary-500 transition-colors"
        @click="startEdit(b)"
      >
        <div class="aspect-[4/3] bg-[#E4EEF0] flex items-center justify-center overflow-hidden">
          <img v-if="b.photo" :src="b.photo" :alt="b.name" class="w-full h-full object-cover">
          <UIcon v-else name="i-lucide-sailboat" class="size-10 text-primary-500/40" />
        </div>
        <div class="p-3">
          <div class="text-sm font-semibold text-[#0A1520] truncate">{{ b.name }}</div>
          <div class="text-xs text-[#5A6A78] truncate">
            <span v-if="b.berths?.[0]">{{ b.berths[0].code }} · </span>{{ b.length }}m
          </div>
          <div v-if="b.customer" class="text-[11px] text-[#5A6A78] truncate mt-0.5">{{ b.customer.name }}</div>
        </div>
      </div>
    </div>

    <!-- Edit modal -->
    <Teleport to="body">
      <div v-if="editingBoat" class="fixed inset-0 z-[1000] bg-black/40 flex items-center justify-center p-4" @click.self="editingBoat = null">
        <div class="bg-white rounded-[14px] max-w-md w-full p-5">
          <div class="text-sm font-semibold text-[#0A1520] mb-3">Foto voor {{ editingBoat.name }}</div>
          <div class="aspect-[4/3] bg-[#E4EEF0] rounded mb-3 overflow-hidden">
            <img v-if="editPhoto" :src="editPhoto" class="w-full h-full object-cover">
            <div v-else class="w-full h-full flex items-center justify-center">
              <UIcon name="i-lucide-sailboat" class="size-12 text-primary-500/40" />
            </div>
          </div>
          <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold">Foto-URL</label>
          <input v-model="editPhoto" placeholder="https://..." class="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
          <div class="text-[11px] text-[#5A6A78] mt-1">Plak een URL of upload via een foto-service</div>
          <div class="flex justify-end gap-2 mt-4">
            <UButton color="neutral" variant="outline" size="sm" @click="editingBoat = null">Annuleren</UButton>
            <UButton color="primary" size="sm" :loading="saving" @click="savePhoto">Opslaan</UButton>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
