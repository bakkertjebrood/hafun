<script setup lang="ts">
definePageMeta({ layout: false })

const { user, fetchMe } = useAuthUser()

const step = ref<1 | 2>(1)
const submitting = ref(false)
const error = ref<string | null>(null)

const marinaName = ref('')
const locationQuery = ref('')
const selectedLocation = ref<{ lat: number, lng: number, name: string } | null>(null)

onMounted(() => {
  if (user.value?.marina?.name) {
    marinaName.value = user.value.marina.name
  }
})

function onLocationPick(loc: { lat: number, lng: number, name: string }) {
  selectedLocation.value = loc
}

async function createMarina() {
  if (!marinaName.value.trim()) return
  submitting.value = true
  error.value = null

  try {
    await $fetch('/api/onboarding/setup', {
      method: 'POST',
      body: {
        marinaName: marinaName.value,
        gpsLat: selectedLocation.value?.lat ?? null,
        gpsLng: selectedLocation.value?.lng ?? null,
        piers: []
      }
    })

    await fetchMe()
    step.value = 2
  } catch (e: any) {
    error.value = e.data?.message || 'Aanmaken mislukt'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-[100dvh] bg-[#F4F7F8]">
    <!-- ─── Step 1 — name + location ────────────────── -->
    <div
      v-if="step === 1"
      class="flex items-center justify-center min-h-[100dvh] p-4"
    >
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <NautarLogo
            :size="28"
            class="mx-auto mb-6"
          />
          <h1 class="text-3xl font-semibold text-[#0A1520] tracking-tight">
            Welkom.
          </h1>
          <p class="text-sm text-[#5A6A78] mt-2">
            Geef je haven een naam en locatie. Daarna teken je je steigers op de kaart.
          </p>
        </div>

        <div class="bg-white rounded-[20px] border border-black/[0.08] p-6 space-y-4">
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2 block">Naam van je haven</label>
            <input
              v-model="marinaName"
              type="text"
              placeholder="bijv. Jachthaven Lands End"
              class="w-full px-4 py-3 text-base rounded-[14px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              @keydown.enter="createMarina"
            >
          </div>

          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2 block">Locatie (optioneel)</label>
            <LocationSearchInput
              v-model="locationQuery"
              placeholder="Zoek plaats, adres of haven…"
              @pick="onLocationPick"
            />
            <p
              v-if="selectedLocation"
              class="mt-2 text-[12px] text-primary-600 inline-flex items-center gap-1"
            >
              <UIcon
                name="i-lucide-check"
                class="size-3.5"
              />
              Locatie ingesteld
            </p>
          </div>

          <div
            v-if="error"
            class="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-[10px] px-3 py-2"
          >
            {{ error }}
          </div>

          <button
            class="w-full py-3.5 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            :disabled="!marinaName.trim() || submitting"
            @click="createMarina"
          >
            <UIcon
              v-if="submitting"
              name="i-lucide-loader-2"
              class="size-4 animate-spin"
            />
            {{ submitting ? 'Bezig…' : 'Maak haven aan' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Step 2 — done ───────────────────────────── -->
    <div
      v-if="step === 2"
      class="flex items-center justify-center min-h-[100dvh] p-4"
    >
      <div class="text-center max-w-md">
        <div class="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-6">
          <UIcon
            name="i-lucide-check"
            class="size-10"
          />
        </div>
        <h1 class="text-3xl font-semibold text-[#0A1520] tracking-tight mb-2">
          Haven aangemaakt!
        </h1>
        <p class="text-sm text-[#5A6A78] mb-8">
          {{ marinaName }} staat klaar. Op de kaart kun je nu steigers tekenen
          en ligplaatsen toevoegen via <strong>Bewerken → Nieuwe steiger</strong>.
        </p>
        <NuxtLink
          to="/dashboard/map"
          class="inline-block px-8 py-3.5 rounded-full bg-primary-500 text-white text-sm font-semibold"
        >
          Ga naar de kaart →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
