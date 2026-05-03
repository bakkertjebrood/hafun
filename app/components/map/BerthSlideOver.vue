<script setup lang="ts">
type BerthType = 'JAARPLAATS' | 'SEIZOEN' | 'WINTERSTALLING' | 'PASSANT' | 'WERKPLEK'

const props = defineProps<{
  berth: {
    id: string
    code: string
    pier: string
    length: number
    width: number
    status: string
    type?: BerthType
    customer?: { id: string; name: string; contractType?: string } | null
    boat?: { id: string; name: string; type?: string; length: number; width?: number } | null
    notes?: Array<{ id: string; text: string; createdAt: string; author: { firstName: string; lastName: string } }>
    bookings?: Array<{ id: string; dateFrom: string; dateTo: string; status: string; customer?: { id?: string; name: string } | null; guest?: { name: string } | null }>
  }
  open: boolean
  editMode?: boolean
}>()

const emit = defineEmits<{
  close: []
  statusChanged: [status: string]
  noteAdded: []
  typeChanged: [value: BerthType]
  deleteRequested: []
  checkinRequested: []
  linkCustomer: []
  flipSide: []
}>()

const typeOptions: { value: BerthType, label: string, color: string }[] = [
  { value: 'JAARPLAATS', label: 'Jaarplaats', color: '#10B981' },
  { value: 'SEIZOEN', label: 'Seizoen', color: '#F59E0B' },
  { value: 'WINTERSTALLING', label: 'Stalling', color: '#8B5CF6' },
  { value: 'PASSANT', label: 'Passant', color: '#EC4899' },
  { value: 'WERKPLEK', label: 'Werkplek', color: '#F97316' }
]

const currentType = computed<BerthType>(() => props.berth.type ?? 'JAARPLAATS')
const isPassant = computed(() => currentType.value === 'PASSANT')

// Active booking for this berth
const activeBooking = computed(() => {
  return props.berth.bookings?.find(b => b.status === 'reserved' || b.status === 'checked_in')
})

// Een vaste plek (Jaarplaats/Seizoen/Stalling) met een actieve booking voor
// iemand anders dan de vaste klant = sublet (vaste ligger weg, tijdelijk
// aan een andere boot verhuurd).
const isSublet = computed(() => {
  const ab = activeBooking.value
  if (!ab || !props.berth.customer || isPassant.value) return false
  if (ab.customer?.id && props.berth.customer.id) {
    return ab.customer.id !== props.berth.customer.id
  }
  const bookingName = ab.customer?.name || ab.guest?.name
  return bookingName !== props.berth.customer.name
})

const checkingIn = ref(false)
const checkingOut = ref(false)

async function checkin() {
  if (!activeBooking.value) return
  checkingIn.value = true
  try {
    await $fetch(`/api/bookings/${activeBooking.value.id}`, {
      method: 'PUT',
      body: { status: 'checked_in' }
    })
    await changeStatus('OCCUPIED')
  }
  finally { checkingIn.value = false }
}

async function checkout() {
  if (!activeBooking.value) return
  checkingOut.value = true
  try {
    await $fetch(`/api/bookings/${activeBooking.value.id}`, {
      method: 'PUT',
      body: { status: 'checked_out' }
    })
    await changeStatus('FREE')
  }
  finally { checkingOut.value = false }
}

async function changeType(next: BerthType) {
  if (next === currentType.value) return
  await $fetch(`/api/berths/${props.berth.id}`, {
    method: 'PUT',
    body: { type: next }
  })
  emit('typeChanged', next)
}

const newNote = ref('')
const savingNote = ref(false)

const statusOptions = [
  { value: 'FREE', label: 'Vrij', color: '#10B981' },
  { value: 'OCCUPIED', label: 'Bezet', color: '#EF4444' },
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
  <!-- Mobile: bottom sheet die omhoog schuift met max 85vh hoogte
       Desktop: gewone side panel rechts naast de kaart -->
  <Transition name="sheet">
    <div
      v-if="open"
      class="fixed bottom-0 left-0 right-0 z-[1100] shadow-2xl bg-white flex flex-col rounded-t-2xl max-h-[85vh] lg:rounded-none lg:static lg:inset-auto lg:z-auto lg:shadow-none lg:w-[420px] lg:shrink-0 lg:h-full lg:max-h-none lg:border-l lg:border-black/[0.08]"
    >
      <!-- Drag handle (mobile only) -->
      <div class="lg:hidden flex justify-center pt-2 pb-1 shrink-0">
        <span class="w-10 h-1 rounded-full bg-black/15" />
      </div>

      <!-- Header -->
      <div class="px-5 pt-2 pb-4 lg:pt-5 border-b border-black/[0.08]">
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
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
            :style="{
              background: typeOptions.find(t => t.value === currentType)!.color + '1A',
              color: typeOptions.find(t => t.value === currentType)!.color
            }"
          >
            {{ typeOptions.find(t => t.value === currentType)!.label }}
          </span>
        </div>
      </div>

      <!-- Content (scrollable) -->
      <div class="flex-1 overflow-y-auto">
        <!-- Sublet banner: vaste plek tijdelijk verhuurd aan iemand anders -->
        <div
          v-if="isSublet && activeBooking"
          class="px-5 py-3 border-b border-purple-500/20 bg-purple-500/5"
        >
          <div class="text-[10px] uppercase tracking-widest text-purple-700 font-semibold mb-1 inline-flex items-center gap-1">
            <UIcon name="i-lucide-calendar-clock" class="size-3" />
            Tijdelijk verhuurd aan
          </div>
          <div class="text-sm font-semibold text-[#0A1520]">{{ activeBooking.customer?.name || activeBooking.guest?.name }}</div>
          <div class="text-xs text-[#5A6A78] mt-0.5">
            {{ formatDate(activeBooking.dateFrom) }} – {{ formatDate(activeBooking.dateTo) }}
          </div>
          <div class="text-[10px] text-[#5A6A78] mt-1">
            Plek blijft gekoppeld aan {{ berth.customer?.name }}
          </div>
        </div>

        <!-- Customer & Boat -->
        <div class="px-5 py-4 border-b border-black/[0.08]">
          <div v-if="berth.customer" class="mb-3">
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1">
              {{ isSublet ? 'Vaste ligger' : 'Huurder' }}
            </div>
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

        <!-- Type wijzigen -->
        <div class="px-5 py-4 border-b border-black/[0.08]">
          <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">Type ligplaats</div>
          <div class="grid grid-cols-3 gap-1.5 lg:grid-cols-5">
            <button
              v-for="opt in typeOptions"
              :key="opt.value"
              class="py-2 rounded-[10px] text-[11px] font-semibold border transition-all inline-flex flex-col items-center gap-0.5"
              :class="currentType === opt.value
                ? 'border-transparent text-white'
                : 'border-black/[0.08] text-[#5A6A78] hover:border-black/20 bg-white'"
              :style="currentType === opt.value ? { background: opt.color } : {}"
              @click="changeType(opt.value)"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="currentType === opt.value ? 'bg-white' : ''" :style="currentType === opt.value ? {} : { background: opt.color }" />
              <span class="leading-tight">{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <!-- Status change -->
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
      <div class="px-5 py-4 border-t border-black/[0.08] flex flex-col gap-2" style="padding-bottom: max(env(safe-area-inset-bottom), 16px);">
        <div v-if="editMode" class="flex gap-2">
          <button
            class="flex-1 py-2 rounded-full bg-[#F4F7F8] text-[#5A6A78] text-xs font-semibold hover:bg-black/5 inline-flex items-center justify-center gap-1"
            title="Wissel naar de andere zijde van de steiger"
            @click="emit('flipSide')"
          >
            <UIcon name="i-lucide-flip-horizontal-2" class="size-3.5" />
            Wissel zijde
          </button>
          <button
            class="px-4 py-2 rounded-full bg-red-500/10 text-red-500 text-xs font-semibold hover:bg-red-500/20"
            @click="emit('deleteRequested')"
          >
            Verwijder
          </button>
        </div>
        <!-- Check-in / Check-out for active booking -->
        <div v-if="activeBooking" class="flex gap-2">
          <button
            v-if="activeBooking.status === 'reserved'"
            class="flex-1 py-2.5 rounded-full bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50"
            :disabled="checkingIn"
            @click="checkin"
          >
            {{ checkingIn ? 'Bezig...' : 'Check-in' }}
          </button>
          <button
            v-if="activeBooking.status === 'checked_in'"
            class="flex-1 py-2.5 rounded-full bg-[#5A6A78] text-white text-sm font-semibold disabled:opacity-50"
            :disabled="checkingOut"
            @click="checkout"
          >
            {{ checkingOut ? 'Bezig...' : 'Check-out' }}
          </button>
        </div>
        <div class="flex gap-2">
          <NuxtLink
            :to="`/dashboard/bookings?berthId=${berth.id}`"
            class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600"
          >
            <UIcon name="i-lucide-calendar-plus" class="size-3.5" />
            {{ berth.customer && !isPassant ? 'Tijdelijk verhuren' : '+ Boeking' }}
          </NuxtLink>
          <UButton color="neutral" variant="outline" class="rounded-full flex-1" size="sm" @click="emit('linkCustomer')">
            Klant koppelen
          </UButton>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Backdrop (only on mobile; on desktop the panel sits next to the map) -->
  <Transition name="fade">
    <div
      v-if="open"
      class="fixed inset-0 bg-black/30 z-[1090] lg:hidden"
      @click="emit('close')"
    />
  </Transition>
</template>

<style scoped>
.sheet-enter-active, .sheet-leave-active {
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
}
/* Bottom-sheet (mobile): slide up from below */
.sheet-enter-from, .sheet-leave-to {
  transform: translateY(100%);
}
/* Side-panel (desktop): slide in from right */
@media (min-width: 1024px) {
  .sheet-enter-from, .sheet-leave-to {
    transform: translateX(100%);
  }
}
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
