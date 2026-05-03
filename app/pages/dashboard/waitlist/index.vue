<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const loading = ref(true)
const entries = ref<any[]>([])
const showNew = ref(false)
const statusFilter = ref<string>('waiting')
const saving = ref(false)
const { errorMessage, loadError, messageFor } = useFetchError()

const newEntry = ref({
  name: '', email: '', phone: '', boatLength: '', boatWidth: '', boatType: '', preferredPier: '', notes: '', priority: 0
})

const statusLabels: Record<string, string> = {
  waiting: 'Wachtend',
  offered: 'Aangeboden',
  accepted: 'Geaccepteerd',
  rejected: 'Afgewezen',
  archived: 'Gearchiveerd'
}

const statusColors: Record<string, string> = {
  waiting: '#F59E0B',
  offered: '#3B82F6',
  accepted: '#10B981',
  rejected: '#EF4444',
  archived: '#5A6A78'
}

async function fetchList() {
  loading.value = true
  loadError.value = ''
  const q: Record<string, string> = {}
  if (statusFilter.value) q.status = statusFilter.value
  try {
    entries.value = await $fetch('/api/waitlist', { query: q }) as any[]
  }
  catch (e) {
    loadError.value = messageFor(e, 'Kon wachtlijst niet laden')
  }
  finally {
    loading.value = false
  }
}

onMounted(fetchList)
watch(statusFilter, fetchList)

async function create() {
  if (!newEntry.value.name) return
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/waitlist', { method: 'POST', body: newEntry.value })
    newEntry.value = { name: '', email: '', phone: '', boatLength: '', boatWidth: '', boatType: '', preferredPier: '', notes: '', priority: 0 }
    showNew.value = false
    await fetchList()
  }
  catch (e) {
    errorMessage.value = messageFor(e, 'Aanmelding aanmaken mislukt')
  }
  finally {
    saving.value = false
  }
}

async function updateStatus(id: string, status: string) {
  errorMessage.value = ''
  try {
    await $fetch(`/api/waitlist/${id}`, { method: 'PUT', body: { status } })
    await fetchList()
  }
  catch (e) {
    errorMessage.value = messageFor(e, 'Status bijwerken mislukt')
  }
}

async function remove(id: string) {
  if (!confirm('Verwijderen?')) return
  errorMessage.value = ''
  try {
    await $fetch(`/api/waitlist/${id}`, { method: 'DELETE' })
    await fetchList()
  }
  catch (e) {
    errorMessage.value = messageFor(e, 'Verwijderen mislukt')
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1100px]">
    <div class="flex items-end justify-between mb-4 lg:mb-6">
      <div>
        <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight">Wachtlijst</h1>
        <div class="text-xs text-[#5A6A78] mt-0.5">{{ entries.length }} aanmeldingen</div>
      </div>
      <UButton color="primary" class="rounded-full" size="sm" @click="showNew = !showNew">
        + Nieuwe aanmelding
      </UButton>
    </div>

    <!-- Errors -->
    <div v-if="loadError" class="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 flex items-start gap-3">
      <UIcon name="i-lucide-alert-triangle" class="size-4 text-red-600 mt-0.5 shrink-0" />
      <div class="flex-1 text-sm text-red-700">{{ loadError }}</div>
      <button class="text-xs text-red-700 font-semibold underline" @click="fetchList()">Opnieuw laden</button>
    </div>
    <div v-if="errorMessage" class="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 flex items-start gap-3">
      <UIcon name="i-lucide-alert-triangle" class="size-4 text-red-600 mt-0.5 shrink-0" />
      <div class="flex-1 text-sm text-red-700">{{ errorMessage }}</div>
      <button class="text-xs text-red-700 underline" @click="errorMessage = ''">Sluiten</button>
    </div>

    <!-- Status filter -->
    <div class="flex gap-2 mb-4 flex-wrap">
      <button
        v-for="(label, key) in statusLabels"
        :key="key"
        class="px-3 py-1.5 text-xs rounded-full font-medium transition-colors"
        :class="statusFilter === key ? 'bg-primary-500 text-white' : 'bg-white border border-black/[0.08] text-[#5A6A78] hover:text-[#0A1520]'"
        @click="statusFilter = key"
      >
        {{ label }}
      </button>
    </div>

    <!-- Nieuw formulier -->
    <div v-if="showNew" class="bg-white border border-primary-500/30 rounded-[14px] p-5 mb-4">
      <div class="text-sm font-semibold text-[#0A1520] mb-3">Nieuwe aanmelding</div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input v-model="newEntry.name" placeholder="Naam" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        <input v-model="newEntry.email" placeholder="E-mail" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        <input v-model="newEntry.phone" placeholder="Telefoon" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        <input v-model="newEntry.boatType" placeholder="Soort boot" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        <input v-model.number="newEntry.boatLength" type="number" step="0.1" placeholder="Lengte (m)" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        <input v-model.number="newEntry.boatWidth" type="number" step="0.1" placeholder="Breedte (m)" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        <input v-model="newEntry.preferredPier" placeholder="Voorkeur steiger" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
        <input v-model.number="newEntry.priority" type="number" placeholder="Prioriteit" class="px-3 py-2 text-sm rounded-lg border border-black/[0.1]">
      </div>
      <textarea v-model="newEntry.notes" rows="2" placeholder="Notities..." class="w-full mt-3 px-3 py-2 text-sm rounded-lg border border-black/[0.1]" />
      <div class="flex gap-2 mt-3 justify-end">
        <UButton color="neutral" variant="outline" size="sm" @click="showNew = false">Annuleren</UButton>
        <UButton color="primary" size="sm" :loading="saving" @click="create">Opslaan</UButton>
      </div>
    </div>

    <!-- Lijst -->
    <div v-if="loading" class="text-sm text-[#5A6A78]">Laden...</div>
    <div v-else-if="!entries.length" class="bg-white border border-black/[0.08] rounded-[14px] p-8 text-center text-sm text-[#5A6A78]">
      Geen aanmeldingen in deze status
    </div>
    <div v-else class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
      <div
        v-for="(entry, i) in entries"
        :key="entry.id"
        class="px-5 py-4 flex items-center gap-4"
        :class="i < entries.length - 1 ? 'border-b border-black/[0.08]' : ''"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-sm font-semibold text-[#0A1520] truncate">{{ entry.name }}</span>
            <span v-if="entry.priority > 0" class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-semibold">P{{ entry.priority }}</span>
          </div>
          <div class="text-xs text-[#5A6A78]">
            <span v-if="entry.email">{{ entry.email }}</span>
            <span v-if="entry.phone" class="ml-2">{{ entry.phone }}</span>
          </div>
          <div class="text-[11px] text-[#5A6A78] mt-0.5">
            <span v-if="entry.boatLength">{{ entry.boatLength }}m</span>
            <span v-if="entry.boatType" class="ml-2">{{ entry.boatType }}</span>
            <span v-if="entry.preferredPier" class="ml-2">Steiger {{ entry.preferredPier }}</span>
            <span class="ml-2">· Aangemeld {{ formatDate(entry.createdAt) }}</span>
          </div>
          <div v-if="entry.notes" class="text-xs text-[#5A6A78] mt-1 italic line-clamp-2">{{ entry.notes }}</div>
        </div>

        <div class="flex items-center gap-2 shrink-0">
          <span
            class="px-2.5 py-1 rounded-full text-[11px] font-semibold"
            :style="{ background: statusColors[entry.status] + '20', color: statusColors[entry.status] }"
          >
            {{ statusLabels[entry.status] }}
          </span>

          <select
            :value="entry.status"
            class="text-xs px-2 py-1 rounded border border-black/[0.1] bg-white"
            @change="updateStatus(entry.id, ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
          </select>

          <button
            class="text-xs text-red-500 hover:text-red-600 p-1.5 rounded hover:bg-red-500/5"
            @click="remove(entry.id)"
          >
            <UIcon name="i-lucide-trash-2" class="size-4" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
