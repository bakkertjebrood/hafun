<script setup lang="ts">
const props = defineProps<{
  berth: {
    id: string
    code: string
    pier: string
    length: number
    width: number
    status: string
    customer?: { id: string; name: string; contractType?: string } | null
    boat?: { id: string; name: string; type?: string; length: number; width?: number } | null
    notes?: Array<{ id: string; text: string; createdAt: string; author: { firstName: string; lastName: string } }>
    bookings?: Array<{ id: string; dateFrom: string; dateTo: string; status: string; customer?: { name: string } | null; guest?: { name: string } | null }>
  }
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  statusChanged: [status: string]
  noteAdded: []
}>()

const newNote = ref('')
const savingNote = ref(false)

const statusOptions = [
  { value: 'FREE', label: 'Vrij', color: '#10B981' },
  { value: 'OCCUPIED', label: 'Bezet', color: '#EF4444' },
  { value: 'SEASONAL', label: 'Seizoen', color: '#F59E0B' },
  { value: 'STORAGE', label: 'Stalling', color: '#8B5CF6' },
  { value: 'TEMPORARY', label: 'Tijdelijk', color: '#F97316' },
  { value: 'EMPTY', label: 'Leeg', color: '#9CA3AF' },
  { value: 'RELOCATED', label: 'Verplaatst', color: '#6366F1' }
]

function statusLabel(status: string) {
  return statusOptions.find(s => s.value === status)?.label || status
}

function statusColor(status: string) {
  return statusOptions.find(s => s.value === status)?.color || '#9CA3AF'
}

async function changeStatus(status: string) {
  await $fetch(`/api/berths/${props.berth.id}`, {
    method: 'PUT',
    body: { status }
  })
  emit('statusChanged', status)
}

async function addNote() {
  if (!newNote.value.trim()) return
  savingNote.value = true
  try {
    await $fetch(`/api/berths/${props.berth.id}/notes`, {
      method: 'POST',
      body: { text: newNote.value }
    })
    newNote.value = ''
    emit('noteAdded')
  }
  finally {
    savingNote.value = false
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <Transition name="slide">
    <div
      v-if="open"
      class="fixed inset-y-0 right-0 w-[420px] bg-white shadow-2xl z-50 flex flex-col border-l border-black/[0.08]"
    >
      <!-- Header -->
      <div class="px-5 pt-5 pb-4 border-b border-black/[0.08]">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold text-[#0A1520] tracking-tight">{{ berth.code }}</h2>
          <button class="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center" @click="emit('close')">
            <UIcon name="i-lucide-x" class="size-4 text-[#5A6A78]" />
          </button>
        </div>
        <div class="flex items-center gap-2">
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
            :style="{ background: statusColor(berth.status) + '1A', color: statusColor(berth.status) }"
          >
            <span class="w-1.5 h-1.5 rounded-full" :style="{ background: statusColor(berth.status) }" />
            {{ statusLabel(berth.status) }}
          </span>
          <span class="text-xs text-[#5A6A78]">{{ berth.length }}m × {{ berth.width }}m</span>
          <span class="text-xs text-[#5A6A78]">· Steiger {{ berth.pier }}</span>
        </div>
      </div>

      <!-- Content (scrollable) -->
      <div class="flex-1 overflow-y-auto">
        <!-- Customer & Boat -->
        <div class="px-5 py-4 border-b border-black/[0.08]">
          <div v-if="berth.customer" class="mb-3">
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1">Huurder</div>
            <div class="text-sm font-semibold text-[#0A1520]">{{ berth.customer.name }}</div>
            <div v-if="berth.customer.contractType" class="text-xs text-[#5A6A78] mt-0.5">
              {{ berth.customer.contractType === 'YEAR' ? 'Jaarcontract' : berth.customer.contractType === 'SUMMER' ? 'Seizoencontract' : 'Tijdelijk' }}
            </div>
          </div>
          <div v-else class="mb-3">
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1">Huurder</div>
            <div class="text-sm text-[#5A6A78] italic">Geen huurder gekoppeld</div>
          </div>

          <div v-if="berth.boat">
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1">Boot</div>
            <div class="text-sm font-semibold text-[#0A1520]">{{ berth.boat.name }}</div>
            <div class="text-xs text-[#5A6A78] mt-0.5">
              {{ berth.boat.type || 'Onbekend type' }} · {{ berth.boat.length }}m
            </div>
          </div>
          <div v-else>
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1">Boot</div>
            <div class="text-sm text-[#5A6A78] italic">Geen boot gekoppeld</div>
          </div>
        </div>

        <!-- Quick actions: status change -->
        <div class="px-5 py-4 border-b border-black/[0.08]">
          <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">Status wijzigen</div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="opt in statusOptions"
              :key="opt.value"
              class="px-2.5 py-1.5 rounded-full text-[11px] font-semibold border transition-all"
              :class="berth.status === opt.value
                ? 'border-transparent text-white'
                : 'border-black/[0.08] text-[#5A6A78] hover:border-black/20'"
              :style="berth.status === opt.value ? { background: opt.color } : {}"
              @click="changeStatus(opt.value)"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <!-- Notes -->
        <div class="px-5 py-4">
          <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-3">
            Notities ({{ berth.notes?.length || 0 }})
          </div>

          <!-- Add note -->
          <div class="flex gap-2 mb-4">
            <input
              v-model="newNote"
              type="text"
              placeholder="Schrijf een notitie..."
              class="flex-1 px-3 py-2 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              @keydown.enter="addNote"
            >
            <button
              class="px-3 py-2 rounded-[10px] bg-primary-500 text-white text-sm font-semibold disabled:opacity-50"
              :disabled="!newNote.trim() || savingNote"
              @click="addNote"
            >
              +
            </button>
          </div>

          <!-- Notes list -->
          <div class="flex flex-col gap-3">
            <div
              v-for="note in berth.notes"
              :key="note.id"
              class="text-sm"
            >
              <div class="text-[#0A1520]">{{ note.text }}</div>
              <div class="text-[11px] text-[#5A6A78] mt-1">
                {{ formatDateTime(note.createdAt) }} · {{ note.author.firstName }} {{ note.author.lastName }}
              </div>
            </div>
            <div v-if="!berth.notes?.length" class="text-sm text-[#5A6A78] italic">
              Nog geen notities
            </div>
          </div>
        </div>
      </div>

      <!-- Footer actions -->
      <div class="px-5 py-4 border-t border-black/[0.08] flex gap-2">
        <UButton color="primary" class="rounded-full flex-1" size="sm">
          Boeking maken
        </UButton>
        <UButton color="neutral" variant="outline" class="rounded-full flex-1" size="sm">
          Klant koppelen
        </UButton>
      </div>
    </div>
  </Transition>

  <!-- Backdrop -->
  <Transition name="fade">
    <div
      v-if="open"
      class="fixed inset-0 bg-black/20 z-40"
      @click="emit('close')"
    />
  </Transition>
</template>

<style scoped>
.slide-enter-active, .slide-leave-active {
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-enter-from, .slide-leave-to {
  transform: translateX(100%);
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
