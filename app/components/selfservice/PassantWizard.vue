<script setup lang="ts">
import { ref, computed } from 'vue'
import PassantQR from '../illustrations/PassantQR.vue'

const props = defineProps<{
  slug: string
  marina: {
    name: string
    accentColor?: string | null
    selfService: {
      passant: { enabled: boolean; allowBerthPick: boolean; requirePayment: boolean }
    }
  }
}>()

const step = ref<'dates' | 'boat' | 'berth' | 'review' | 'done'>('dates')
const submitting = ref(false)
const error = ref<string | null>(null)
const result = ref<{ checkinToken: string; total: number; receiptUrl: string; paymentClientSecret: string | null } | null>(null)

const form = ref({
  dateFrom: '',
  dateTo: '',
  name: '',
  email: '',
  phone: '',
  boatName: '',
  boatLength: 0,
  persons: 1,
  berthId: '' as string | ''
})

interface AvailabilityBerth {
  id: string
  code: string
  pier: string
  length: number
  width: number | null
  reletFromAbsence: boolean
}
const berths = ref<AvailabilityBerth[]>([])
const loadingBerths = ref(false)

const allowBerthPick = computed(() => props.marina.selfService.passant.allowBerthPick)

async function loadBerths() {
  if (!allowBerthPick.value) return
  if (!form.value.dateFrom || !form.value.dateTo) return
  loadingBerths.value = true
  try {
    const data = await $fetch<{ berths: AvailabilityBerth[] }>(
      `/api/public/${props.slug}/availability`,
      { query: { dateFrom: form.value.dateFrom, dateTo: form.value.dateTo } }
    )
    berths.value = data.berths
  } catch {
    berths.value = []
  } finally {
    loadingBerths.value = false
  }
}

function nextStep() {
  error.value = null
  if (step.value === 'dates') {
    if (!form.value.dateFrom || !form.value.dateTo) {
      error.value = 'Vul aankomst en vertrek in'
      return
    }
    step.value = 'boat'
  } else if (step.value === 'boat') {
    if (!form.value.name || !form.value.boatLength) {
      error.value = 'Naam en bootlengte zijn verplicht'
      return
    }
    if (allowBerthPick.value) {
      step.value = 'berth'
      loadBerths()
    } else {
      step.value = 'review'
    }
  } else if (step.value === 'berth') {
    step.value = 'review'
  }
}

function prevStep() {
  error.value = null
  if (step.value === 'boat') step.value = 'dates'
  else if (step.value === 'berth') step.value = 'boat'
  else if (step.value === 'review') step.value = allowBerthPick.value ? 'berth' : 'boat'
}

async function submit() {
  submitting.value = true
  error.value = null
  try {
    const data = await $fetch<{
      bookingId: string
      checkinToken: string
      total: number
      receiptUrl: string
      paymentClientSecret: string | null
    }>(`/api/public/${props.slug}/passant`, {
      method: 'POST',
      body: { ...form.value, berthId: form.value.berthId || undefined }
    })
    result.value = data
    step.value = 'done'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message || err?.message || 'Er ging iets mis'
  } finally {
    submitting.value = false
  }
}

const accentStyle = computed(() => props.marina.accentColor
  ? { '--ss-accent': props.marina.accentColor } as Record<string, string>
  : {})
</script>

<template>
  <div :style="accentStyle" class="space-y-6">
    <div v-if="step !== 'done'" class="flex items-center gap-4">
      <PassantQR class="size-16 text-[var(--ss-accent,#00A9A5)] shrink-0" />
      <div>
        <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight">Boek je passantenplek</h1>
        <p class="text-sm text-[#2D3E4A]">{{ marina.name }}</p>
      </div>
    </div>

    <div v-if="error" class="bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl p-3">
      {{ error }}
    </div>

    <!-- Step: dates -->
    <div v-if="step === 'dates'" class="space-y-4">
      <label class="block">
        <span class="text-sm font-medium">Aankomst</span>
        <input v-model="form.dateFrom" type="date" class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm" />
      </label>
      <label class="block">
        <span class="text-sm font-medium">Vertrek</span>
        <input v-model="form.dateTo" type="date" class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm" />
      </label>
    </div>

    <!-- Step: boat / contact -->
    <div v-else-if="step === 'boat'" class="space-y-4">
      <label class="block">
        <span class="text-sm font-medium">Naam</span>
        <input v-model="form.name" type="text" class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm" />
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="text-sm font-medium">E-mail</span>
          <input v-model="form.email" type="email" class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm" />
        </label>
        <label class="block">
          <span class="text-sm font-medium">Telefoon</span>
          <input v-model="form.phone" type="tel" class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm" />
        </label>
      </div>
      <label class="block">
        <span class="text-sm font-medium">Naam boot</span>
        <input v-model="form.boatName" type="text" class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm" />
      </label>
      <div class="grid grid-cols-2 gap-3">
        <label class="block">
          <span class="text-sm font-medium">Lengte (m)</span>
          <input v-model.number="form.boatLength" type="number" step="0.1" min="1" class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm" />
        </label>
        <label class="block">
          <span class="text-sm font-medium">Personen</span>
          <input v-model.number="form.persons" type="number" min="1" class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm" />
        </label>
      </div>
    </div>

    <!-- Step: berth -->
    <div v-else-if="step === 'berth'" class="space-y-3">
      <p class="text-sm text-[#2D3E4A]">Kies een vrije ligplaats — of laat leeg om automatisch toegewezen te worden bij aankomst.</p>
      <div v-if="loadingBerths" class="text-sm text-[#5A6A78]">Vrije plekken laden…</div>
      <div v-else-if="berths.length === 0" class="text-sm text-[#5A6A78]">Geen vrije plekken in deze periode — meld je toch aan en de havenmeester wijst toe.</div>
      <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <button
          v-for="b in berths"
          :key="b.id"
          type="button"
          class="text-left p-3 rounded-xl border text-sm transition-colors"
          :class="form.berthId === b.id ? 'border-[var(--ss-accent,#00A9A5)] bg-[color:var(--ss-accent,#00A9A5)]/5' : 'border-black/10 hover:border-black/30'"
          @click="form.berthId = form.berthId === b.id ? '' : b.id"
        >
          <div class="font-semibold">{{ b.pier }} — {{ b.code }}</div>
          <div class="text-xs text-[#5A6A78]">{{ b.length }}m</div>
        </button>
      </div>
    </div>

    <!-- Step: review -->
    <div v-else-if="step === 'review'" class="space-y-3 text-sm">
      <div class="rounded-xl bg-[#F4F7F8] p-4 space-y-1">
        <div><span class="text-[#5A6A78]">Naam:</span> {{ form.name }}</div>
        <div><span class="text-[#5A6A78]">Boot:</span> {{ form.boatName || '—' }} ({{ form.boatLength }}m)</div>
        <div><span class="text-[#5A6A78]">Periode:</span> {{ form.dateFrom }} t/m {{ form.dateTo }}</div>
        <div><span class="text-[#5A6A78]">Personen:</span> {{ form.persons }}</div>
      </div>
      <p class="text-xs text-[#5A6A78]">
        {{ marina.selfService.passant.requirePayment ? 'Na bevestiging volgt online betaling. Bij problemen kun je ter plekke afrekenen.' : 'Betaling vindt plaats bij de havenmeester op locatie.' }}
      </p>
    </div>

    <!-- Step: done -->
    <div v-else-if="step === 'done' && result" class="space-y-3">
      <div class="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-900">
        <div class="font-semibold">Aanmelding ontvangen — welkom alvast!</div>
        <div class="mt-1">Bewaar deze pagina als digitale bon. De havenmeester ziet je gegevens al in het systeem.</div>
      </div>
      <a :href="result.receiptUrl" class="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ss-accent,#00A9A5)]">
        Bekijk bon →
      </a>
    </div>

    <div v-if="step !== 'done'" class="flex items-center justify-between gap-3 pt-2">
      <button
        v-if="step !== 'dates'"
        type="button"
        class="h-11 px-4 rounded-full text-sm font-semibold border border-black/10 hover:bg-black/5"
        @click="prevStep"
      >
        Terug
      </button>
      <span v-else />
      <button
        v-if="step !== 'review'"
        type="button"
        class="h-11 px-5 rounded-full text-sm font-semibold text-white bg-[var(--ss-accent,#00A9A5)] hover:opacity-90"
        @click="nextStep"
      >
        Volgende
      </button>
      <button
        v-else
        type="button"
        :disabled="submitting"
        class="h-11 px-5 rounded-full text-sm font-semibold text-white bg-[var(--ss-accent,#00A9A5)] hover:opacity-90 disabled:opacity-60"
        @click="submit"
      >
        {{ submitting ? 'Bezig…' : 'Bevestig aanmelding' }}
      </button>
    </div>
  </div>
</template>
