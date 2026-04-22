<script setup lang="ts">
definePageMeta({ layout: false })

interface BerthRow {
  length: number
  width: number
  count: number
  isPassanten: boolean
}

interface PierDraft {
  id: string
  name: string
  hasHead: boolean
  allPassanten: boolean
  berths: BerthRow[]
}

const { user, fetchMe } = useAuthUser()

const step = ref(1)
const submitting = ref(false)
const error = ref<string | null>(null)

const marinaName = ref('')
const gpsLat = ref<number | null>(null)
const gpsLng = ref<number | null>(null)

const piers = ref<PierDraft[]>([])

const presets = [
  { label: '6 m (sloep)', length: 6, width: 2.5 },
  { label: '8 m', length: 8, width: 3 },
  { label: '10 m', length: 10, width: 3.5 },
  { label: '12 m', length: 12, width: 4 },
  { label: '14 m', length: 14, width: 4.5 },
  { label: '16 m (jacht)', length: 16, width: 5 }
]

onMounted(async () => {
  if (!user.value) await fetchMe()
  if (!user.value) {
    await navigateTo('/login')
    return
  }
  if (user.value.marina.setupComplete) {
    await navigateTo('/dashboard/map')
    return
  }
  marinaName.value = user.value.marina.name
})

function nextLetter(): string {
  const used = new Set(piers.value.map(p => p.name.toUpperCase()))
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i)
    if (!used.has(letter)) return letter
  }
  return `S${piers.value.length + 1}`
}

function addPier(count: number = 1) {
  for (let i = 0; i < count; i++) {
    piers.value.push({
      id: crypto.randomUUID(),
      name: nextLetter(),
      hasHead: false,
      allPassanten: false,
      berths: [{ length: 10, width: 3.5, count: 10, isPassanten: false }]
    })
  }
}

function removePier(id: string) {
  piers.value = piers.value.filter(p => p.id !== id)
}

function addBerthRow(pier: PierDraft) {
  pier.berths.push({ length: 12, width: 4, count: 4, isPassanten: false })
}

function removeBerthRow(pier: PierDraft, idx: number) {
  pier.berths.splice(idx, 1)
}

function totalBerthsFor(pier: PierDraft): number {
  return pier.berths.reduce((sum, r) => sum + (r.count || 0), 0)
}

const totalPiers = computed(() => piers.value.length)
const totalBerths = computed(() => piers.value.reduce((sum, p) => sum + totalBerthsFor(p), 0))
const totalPassanten = computed(() => piers.value.reduce((sum, p) => {
  return sum + p.berths.reduce((s, r) => {
    const passanten = r.isPassanten || p.allPassanten
    return s + (passanten ? (r.count || 0) : 0)
  }, 0)
}, 0))

function canGoNext(): boolean {
  if (step.value === 1) return marinaName.value.trim().length > 0
  if (step.value === 2) return piers.value.length > 0 && piers.value.every(p => p.name.trim().length > 0)
  if (step.value === 3) return piers.value.every(p => p.berths.length > 0 && p.berths.every(r => r.count > 0 && r.length > 0))
  return true
}

function goNext() {
  if (step.value === 2 && piers.value.length === 0) {
    addPier(3)
  }
  step.value += 1
}

function goBack() {
  if (step.value > 1) step.value -= 1
}

async function submit() {
  if (submitting.value) return
  submitting.value = true
  error.value = null
  try {
    await $fetch('/api/onboarding/setup', {
      method: 'POST',
      body: {
        marinaName: marinaName.value.trim(),
        gpsLat: gpsLat.value,
        gpsLng: gpsLng.value,
        piers: piers.value.map(p => ({
          name: p.name.trim(),
          hasHead: p.hasHead,
          allPassanten: p.allPassanten,
          berths: p.berths.map(r => ({
            length: r.length,
            width: r.width,
            count: r.count,
            isPassanten: r.isPassanten
          }))
        }))
      }
    })
    await fetchMe()
    await navigateTo('/dashboard/map?onboarded=1')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }, statusMessage?: string }
    error.value = err?.data?.message || err?.statusMessage || 'Opslaan mislukt'
  } finally {
    submitting.value = false
  }
}

async function skip() {
  if (submitting.value) return
  submitting.value = true
  try {
    await $fetch('/api/onboarding/setup', {
      method: 'POST',
      body: {
        marinaName: marinaName.value.trim() || (user.value?.marina.name ?? ''),
        piers: []
      }
    })
    await fetchMe()
    await navigateTo('/dashboard/map')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }, statusMessage?: string }
    error.value = err?.data?.message || err?.statusMessage || 'Overslaan mislukt'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-[100dvh] bg-[#F4F7F8]">
    <div class="max-w-[820px] mx-auto px-4 py-8 lg:py-12">
      <div class="flex justify-center mb-6">
        <NautarLogo :size="22" />
      </div>

      <!-- Stepper -->
      <div class="flex items-center justify-center gap-2 mb-6">
        <div
          v-for="s in 4"
          :key="s"
          class="h-1.5 rounded-full transition-all"
          :class="[
            s === step ? 'w-10 bg-primary-500' : s < step ? 'w-6 bg-primary-500/50' : 'w-6 bg-black/10'
          ]"
        />
      </div>

      <div class="bg-white border border-black/[0.08] rounded-[16px] p-6 lg:p-8">
        <!-- Step 1: Haven -->
        <template v-if="step === 1">
          <h1 class="text-xl font-semibold tracking-tight text-[#0A1520] mb-1">
            Welkom bij Nautar
          </h1>
          <p class="text-sm text-[#5A6A78] mb-6">
            Laten we je haven in een paar stappen inrichten. Je kunt alles later nog wijzigen op de kaart.
          </p>

          <label class="flex flex-col gap-1.5 mb-4">
            <span class="text-xs font-medium text-[#2D3E4A]">Naam van de haven</span>
            <input
              v-model="marinaName"
              type="text"
              placeholder="Bijv. Jachthaven De Zeemeeuw"
              class="px-3.5 py-2.5 rounded-[10px] border border-black/[0.12] bg-white text-sm text-[#0A1520] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
          </label>

          <div class="grid grid-cols-2 gap-3 mb-2">
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-[#2D3E4A]">Breedtegraad (optioneel)</span>
              <input
                v-model.number="gpsLat"
                type="number"
                step="any"
                placeholder="52.58038"
                class="px-3.5 py-2.5 rounded-[10px] border border-black/[0.12] bg-white text-sm text-[#0A1520] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-medium text-[#2D3E4A]">Lengtegraad (optioneel)</span>
              <input
                v-model.number="gpsLng"
                type="number"
                step="any"
                placeholder="5.75972"
                class="px-3.5 py-2.5 rounded-[10px] border border-black/[0.12] bg-white text-sm text-[#0A1520] focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
            </label>
          </div>
          <p class="text-[11px] text-[#5A6A78]">
            Coördinaten kun je later precies instellen op de kaart.
          </p>
        </template>

        <!-- Step 2: Piers -->
        <template v-else-if="step === 2">
          <h1 class="text-xl font-semibold tracking-tight text-[#0A1520] mb-1">
            Hoeveel steigers heb je?
          </h1>
          <p class="text-sm text-[#5A6A78] mb-5">
            Voeg elke steiger toe. Een T-kop (kopsteiger) kun je per steiger aanvinken.
          </p>

          <div
            v-if="piers.length === 0"
            class="border-2 border-dashed border-black/[0.08] rounded-[12px] p-6 text-center"
          >
            <div class="text-sm text-[#5A6A78] mb-3">
              Nog geen steigers toegevoegd.
            </div>
            <div class="flex gap-2 justify-center flex-wrap">
              <button
                v-for="n in [1, 3, 5, 8]"
                :key="n"
                type="button"
                class="px-3 py-1.5 rounded-full bg-[#F4F7F8] text-[#0A1520] text-sm font-medium hover:bg-black/5"
                @click="addPier(n)"
              >
                {{ n }} {{ n === 1 ? 'steiger' : 'steigers' }}
              </button>
            </div>
          </div>

          <div
            v-else
            class="flex flex-col gap-2 mb-3"
          >
            <div
              v-for="pier in piers"
              :key="pier.id"
              class="flex items-center gap-3 px-3 py-2.5 rounded-[10px] border border-black/[0.08] bg-[#FAFBFC]"
            >
              <span class="text-xs text-[#5A6A78] shrink-0">Naam</span>
              <input
                v-model="pier.name"
                type="text"
                maxlength="8"
                class="w-16 px-2 py-1 rounded-md border border-black/[0.12] bg-white text-sm font-semibold text-[#0A1520]"
              >
              <label class="flex items-center gap-1.5 text-xs text-[#2D3E4A] cursor-pointer">
                <input
                  v-model="pier.hasHead"
                  type="checkbox"
                  class="accent-primary-500"
                >
                T-kop
              </label>
              <label class="flex items-center gap-1.5 text-xs text-[#2D3E4A] cursor-pointer">
                <input
                  v-model="pier.allPassanten"
                  type="checkbox"
                  class="accent-primary-500"
                >
                Passantensteiger
              </label>
              <div class="flex-1" />
              <button
                type="button"
                class="text-red-400 hover:text-red-600 text-xs"
                @click="removePier(pier.id)"
              >
                Verwijder
              </button>
            </div>
          </div>

          <button
            v-if="piers.length > 0"
            type="button"
            class="text-sm text-primary-500 font-medium hover:text-primary-600"
            @click="addPier(1)"
          >
            + Nog een steiger
          </button>
        </template>

        <!-- Step 3: Berths -->
        <template v-else-if="step === 3">
          <h1 class="text-xl font-semibold tracking-tight text-[#0A1520] mb-1">
            Ligplaatsen per steiger
          </h1>
          <p class="text-sm text-[#5A6A78] mb-5">
            Geef per steiger op hoeveel ligplaatsen er zijn en welke maten. Voeg meerdere maten toe als je mix hebt.
          </p>

          <div class="flex flex-col gap-4">
            <div
              v-for="pier in piers"
              :key="pier.id"
              class="border border-black/[0.08] rounded-[12px] p-4"
            >
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-sm font-semibold text-[#0A1520]">Steiger {{ pier.name }}</span>
                  <span
                    v-if="pier.hasHead"
                    class="text-[10px] text-[#F59E0B] bg-amber-500/10 px-1.5 py-0.5 rounded"
                  >T-kop</span>
                  <span
                    v-if="pier.allPassanten"
                    class="text-[10px] text-primary-500 bg-primary-500/10 px-1.5 py-0.5 rounded"
                  >Passanten</span>
                </div>
                <span class="text-xs text-[#5A6A78]">{{ totalBerthsFor(pier) }} ligplaatsen</span>
              </div>

              <div class="flex flex-col gap-2">
                <div
                  v-for="(row, idx) in pier.berths"
                  :key="idx"
                  class="flex items-center gap-2 flex-wrap"
                >
                  <label class="flex items-center gap-1.5">
                    <span class="text-[11px] text-[#5A6A78]">Aantal</span>
                    <input
                      v-model.number="row.count"
                      type="number"
                      min="1"
                      max="200"
                      class="w-16 px-2 py-1 rounded-md border border-black/[0.12] bg-white text-sm text-center"
                    >
                  </label>
                  <span class="text-[11px] text-[#5A6A78]">×</span>
                  <label class="flex items-center gap-1.5">
                    <input
                      v-model.number="row.length"
                      type="number"
                      min="2"
                      max="60"
                      step="0.5"
                      class="w-16 px-2 py-1 rounded-md border border-black/[0.12] bg-white text-sm text-center"
                    >
                    <span class="text-[11px] text-[#5A6A78]">m lang</span>
                  </label>
                  <label class="flex items-center gap-1.5">
                    <input
                      v-model.number="row.width"
                      type="number"
                      min="1"
                      max="20"
                      step="0.5"
                      class="w-16 px-2 py-1 rounded-md border border-black/[0.12] bg-white text-sm text-center"
                    >
                    <span class="text-[11px] text-[#5A6A78]">m breed</span>
                  </label>
                  <label
                    v-if="!pier.allPassanten"
                    class="flex items-center gap-1 text-[11px] text-[#2D3E4A] cursor-pointer"
                  >
                    <input
                      v-model="row.isPassanten"
                      type="checkbox"
                      class="accent-primary-500"
                    >
                    passanten
                  </label>
                  <div class="flex-1" />
                  <button
                    v-if="pier.berths.length > 1"
                    type="button"
                    class="text-red-400 hover:text-red-600 text-[11px]"
                    @click="removeBerthRow(pier, idx)"
                  >
                    ✕
                  </button>
                </div>

                <div class="flex items-center gap-1.5 flex-wrap pt-1">
                  <span class="text-[10px] text-[#5A6A78]">Snel toevoegen:</span>
                  <button
                    v-for="p in presets"
                    :key="p.label"
                    type="button"
                    class="px-2 py-0.5 rounded-md bg-[#F4F7F8] text-[#2D3E4A] text-[10px] font-medium hover:bg-black/5"
                    @click="pier.berths.push({ length: p.length, width: p.width, count: 4, isPassanten: false })"
                  >
                    {{ p.label }}
                  </button>
                </div>

                <button
                  type="button"
                  class="text-xs text-primary-500 font-medium hover:text-primary-600 text-left mt-1"
                  @click="addBerthRow(pier)"
                >
                  + Rij toevoegen
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- Step 4: Summary -->
        <template v-else-if="step === 4">
          <h1 class="text-xl font-semibold tracking-tight text-[#0A1520] mb-1">
            Samenvatting
          </h1>
          <p class="text-sm text-[#5A6A78] mb-5">
            Controleer je keuzes. Hierna kun je de steigers op de kaart tekenen.
          </p>

          <div class="grid grid-cols-3 gap-3 mb-5">
            <div class="bg-[#FAFBFC] border border-black/[0.08] rounded-[10px] p-3">
              <div class="text-[10px] uppercase tracking-widest text-[#5A6A78]">
                Steigers
              </div>
              <div class="text-2xl font-semibold text-[#0A1520]">
                {{ totalPiers }}
              </div>
            </div>
            <div class="bg-[#FAFBFC] border border-black/[0.08] rounded-[10px] p-3">
              <div class="text-[10px] uppercase tracking-widest text-[#5A6A78]">
                Ligplaatsen
              </div>
              <div class="text-2xl font-semibold text-[#0A1520]">
                {{ totalBerths }}
              </div>
            </div>
            <div class="bg-[#FAFBFC] border border-black/[0.08] rounded-[10px] p-3">
              <div class="text-[10px] uppercase tracking-widest text-[#5A6A78]">
                Passanten
              </div>
              <div class="text-2xl font-semibold text-primary-500">
                {{ totalPassanten }}
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <div
              v-for="pier in piers"
              :key="pier.id"
              class="flex items-center justify-between px-3 py-2 rounded-[10px] bg-[#FAFBFC] border border-black/[0.08]"
            >
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-[#0A1520]">Steiger {{ pier.name }}</span>
                <span
                  v-if="pier.hasHead"
                  class="text-[10px] text-[#F59E0B]"
                >T-kop</span>
                <span
                  v-if="pier.allPassanten"
                  class="text-[10px] text-primary-500"
                >Passanten</span>
              </div>
              <span class="text-xs text-[#5A6A78]">
                {{ totalBerthsFor(pier) }} ligplaatsen
                <span class="text-[10px]">
                  ({{ pier.berths.map(r => `${r.count}× ${r.length}m`).join(', ') }})
                </span>
              </span>
            </div>
          </div>
        </template>

        <div
          v-if="error"
          class="mt-5 text-sm text-red-600 bg-red-500/10 border border-red-500/20 rounded-[10px] px-3 py-2"
        >
          {{ error }}
        </div>

        <!-- Footer nav -->
        <div class="flex items-center justify-between mt-7 pt-5 border-t border-black/[0.08]">
          <button
            v-if="step > 1"
            type="button"
            class="text-sm text-[#5A6A78] hover:text-[#0A1520]"
            @click="goBack"
          >
            ← Terug
          </button>
          <button
            v-else
            type="button"
            class="text-sm text-[#5A6A78] hover:text-[#0A1520] disabled:opacity-50"
            :disabled="submitting"
            @click="skip"
          >
            Overslaan
          </button>

          <div class="flex items-center gap-3">
            <span class="text-[11px] text-[#5A6A78]">Stap {{ step }} van 4</span>
            <button
              v-if="step < 4"
              type="button"
              class="h-10 px-5 rounded-[10px] bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50"
              :disabled="!canGoNext()"
              @click="goNext"
            >
              Volgende
            </button>
            <button
              v-else
              type="button"
              class="h-10 px-5 rounded-[10px] bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 disabled:opacity-50"
              :disabled="submitting"
              @click="submit"
            >
              {{ submitting ? 'Bezig...' : 'Afronden & naar kaart' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
