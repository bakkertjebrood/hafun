<script setup lang="ts">
const emit = defineEmits<{ close: []; done: [] }>()

const step = ref(1) // 1: gast, 2: boot, 3: plek, 4: periode, 5: bevestig
const saving = ref(false)

// Form data
const guest = ref({ name: '', persons: 1 })
const boat = ref({ name: '', length: 0, type: '' })
const selectedBerth = ref<any>(null)
const period = ref({
  dateFrom: new Date().toISOString().split('T')[0],
  dateTo: ''
})

// Suggestions
const suggestions = ref<any[]>([])
const loadingSuggestions = ref(false)

const nights = computed(() => {
  if (!period.value.dateFrom || !period.value.dateTo) return 0
  return Math.ceil((new Date(period.value.dateTo).getTime() - new Date(period.value.dateFrom).getTime()) / 86400000)
})

// Step validation
const canNext = computed(() => {
  switch (step.value) {
    case 1: return guest.value.name.trim().length > 0
    case 2: return boat.value.length > 0
    case 3: return !!selectedBerth.value
    case 4: return !!period.value.dateTo && nights.value > 0
    default: return true
  }
})

async function goStep(s: number) {
  step.value = s
  if (s === 3) await loadSuggestions()
}

async function loadSuggestions() {
  loadingSuggestions.value = true
  try {
    const data = await $fetch('/api/berths/suggest', {
      query: {
        boatLength: boat.value.length,
        dateFrom: period.value.dateFrom,
        dateTo: period.value.dateTo
      }
    }) as any
    suggestions.value = data.suggestions
  }
  finally { loadingSuggestions.value = false }
}

async function confirm() {
  saving.value = true
  try {
    // 1. Create guest
    const guestRecord = await $fetch('/api/guests', {
      method: 'POST',
      body: {
        name: guest.value.name,
        boatName: boat.value.name,
        boatLength: boat.value.length,
        arrival: period.value.dateFrom,
        departure: period.value.dateTo,
        persons: guest.value.persons
      }
    }) as any

    // 2. Create booking
    await $fetch('/api/bookings', {
      method: 'POST',
      body: {
        berthId: selectedBerth.value.id,
        guestId: guestRecord.id,
        dateFrom: period.value.dateFrom,
        dateTo: period.value.dateTo,
        persons: guest.value.persons,
        status: 'checked_in'
      }
    })

    // 3. Update berth status to OCCUPIED zolang deze passant er ligt
    await $fetch(`/api/berths/${selectedBerth.value.id}`, {
      method: 'PUT',
      body: { status: 'OCCUPIED' }
    })

    step.value = 6 // done
    setTimeout(() => emit('done'), 1500)
  }
  catch (e: any) {
    alert(e.data?.message || 'Check-in mislukt')
  }
  finally { saving.value = false }
}
</script>

<template>
  <div class="fixed inset-0 z-[2000] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('close')" />

    <div class="relative bg-white rounded-[20px] shadow-2xl w-full max-w-md overflow-hidden">
      <!-- Progress -->
      <div class="flex gap-1 px-6 pt-5">
        <div v-for="i in 5" :key="i" class="flex-1 h-1 rounded-full" :class="i <= step ? 'bg-primary-500' : 'bg-black/[0.08]'" />
      </div>

      <!-- Header -->
      <div class="px-6 pt-4 pb-2 flex items-center justify-between">
        <h2 class="text-lg font-semibold text-[#0A1520]">Passant inchecken</h2>
        <button class="w-8 h-8 rounded-full hover:bg-black/5 flex items-center justify-center" @click="emit('close')">
          <UIcon name="i-lucide-x" class="size-4 text-[#5A6A78]" />
        </button>
      </div>

      <!-- Step 1: Gast -->
      <div v-if="step === 1" class="px-6 pb-6">
        <div class="text-sm text-[#5A6A78] mb-4">Wie checkt in?</div>
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Naam *</label>
            <input v-model="guest.name" type="text" placeholder="Naam van de gast" autofocus
              class="w-full px-4 py-3 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Aantal personen</label>
            <input v-model.number="guest.persons" type="number" min="1" max="20"
              class="w-full px-4 py-3 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
          </div>
        </div>
      </div>

      <!-- Step 2: Boot -->
      <div v-if="step === 2" class="px-6 pb-6">
        <div class="text-sm text-[#5A6A78] mb-4">Boot gegevens</div>
        <div class="flex flex-col gap-3">
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Bootnaam</label>
            <input v-model="boat.name" type="text" placeholder="Naam van de boot"
              class="w-full px-4 py-3 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Lengte (m) *</label>
              <input v-model.number="boat.length" type="number" step="0.1" min="1" placeholder="10.5"
                class="w-full px-4 py-3 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
            </div>
            <div>
              <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Type</label>
              <select v-model="boat.type"
                class="w-full px-4 py-3 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
                <option value="">Kies type</option>
                <option value="Zeilboot">Zeilboot</option>
                <option value="Motorboot">Motorboot</option>
                <option value="Motorjacht">Motorjacht</option>
                <option value="Catamaran">Catamaran</option>
                <option value="Anders">Anders</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Plek kiezen -->
      <div v-if="step === 3" class="px-6 pb-6">
        <div class="text-sm text-[#5A6A78] mb-3">
          Beschikbare plekken voor {{ boat.length }}m
          <span v-if="loadingSuggestions" class="text-primary-500">laden...</span>
        </div>
        <div class="flex flex-col gap-2 max-h-[300px] overflow-y-auto">
          <button
            v-for="berth in suggestions"
            :key="berth.id"
            class="flex items-center gap-3 px-4 py-3 rounded-[10px] border transition-all text-left"
            :class="selectedBerth?.id === berth.id
              ? 'border-primary-500 bg-primary-500/5'
              : 'border-black/[0.08] hover:border-black/20'"
            @click="selectedBerth = berth"
          >
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
              :class="selectedBerth?.id === berth.id ? 'border-primary-500 bg-primary-500' : 'border-black/[0.12]'"
            >
              <svg v-if="selectedBerth?.id === berth.id" class="w-3 h-3 text-white" fill="none" viewBox="0 0 10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M1.5 5l2.5 2.5L8.5 2" /></svg>
            </div>
            <div class="flex-1">
              <div class="text-sm font-semibold text-[#0A1520]">{{ berth.code }}</div>
              <div class="text-xs text-[#5A6A78]">Steiger {{ berth.pier }} · {{ berth.length }}m × {{ berth.width }}m</div>
            </div>
          </button>
          <div v-if="!suggestions.length && !loadingSuggestions" class="py-6 text-center text-sm text-[#5A6A78]">
            Geen vrije plekken gevonden voor deze bootlengte
          </div>
        </div>
      </div>

      <!-- Step 4: Periode -->
      <div v-if="step === 4" class="px-6 pb-6">
        <div class="text-sm text-[#5A6A78] mb-4">Wanneer? · {{ selectedBerth?.code }}</div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Aankomst</label>
            <input v-model="period.dateFrom" type="date"
              class="w-full px-4 py-3 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
          </div>
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Vertrek *</label>
            <input v-model="period.dateTo" type="date" :min="period.dateFrom"
              class="w-full px-4 py-3 text-sm rounded-[10px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500">
          </div>
        </div>
        <div v-if="nights > 0" class="text-center text-sm text-[#0A1520] font-medium py-2 bg-[#F4F7F8] rounded-[10px]">
          {{ nights }} nacht{{ nights > 1 ? 'en' : '' }}
        </div>
      </div>

      <!-- Step 5: Bevestig -->
      <div v-if="step === 5" class="px-6 pb-6">
        <div class="text-sm text-[#5A6A78] mb-4">Controleer de gegevens</div>
        <div class="bg-[#F4F7F8] rounded-[14px] p-4 space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-[#5A6A78]">Gast</span>
            <span class="font-semibold text-[#0A1520]">{{ guest.name }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[#5A6A78]">Boot</span>
            <span class="font-semibold text-[#0A1520]">{{ boat.name || 'Onbekend' }} · {{ boat.length }}m</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[#5A6A78]">Ligplaats</span>
            <span class="font-semibold text-primary-500">{{ selectedBerth?.code }}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[#5A6A78]">Periode</span>
            <span class="font-semibold text-[#0A1520]">{{ period.dateFrom }} → {{ period.dateTo }} ({{ nights }}n)</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-[#5A6A78]">Personen</span>
            <span class="font-semibold text-[#0A1520]">{{ guest.persons }}</span>
          </div>
        </div>
      </div>

      <!-- Step 6: Done -->
      <div v-if="step === 6" class="px-6 pb-8 text-center">
        <div class="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-4 mt-4">
          <UIcon name="i-lucide-check" class="size-8" />
        </div>
        <div class="text-lg font-semibold text-[#0A1520]">Ingecheckt!</div>
        <div class="text-sm text-[#5A6A78] mt-1">{{ guest.name }} op {{ selectedBerth?.code }}</div>
      </div>

      <!-- Footer nav -->
      <div v-if="step < 6" class="px-6 pb-6 flex gap-2">
        <button
          v-if="step > 1"
          class="px-5 py-3 rounded-full bg-[#F4F7F8] text-[#5A6A78] text-sm font-semibold"
          @click="step--"
        >
          ← Terug
        </button>
        <button
          v-if="step < 5"
          class="flex-1 py-3 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-50"
          :disabled="!canNext"
          @click="goStep(step + 1)"
        >
          Volgende →
        </button>
        <button
          v-if="step === 5"
          class="flex-1 py-3 rounded-full bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50"
          :disabled="saving"
          @click="confirm"
        >
          {{ saving ? 'Bezig...' : 'Bevestig check-in' }}
        </button>
      </div>
    </div>
  </div>
</template>
