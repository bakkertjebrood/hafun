<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ layout: false })

interface PortalMe {
  customer: {
    berths: { id: string; code: string; pier: string }[]
  }
}

const berths = ref<{ id: string; code: string; pier: string }[]>([])
const form = ref({
  berthId: '',
  dateFrom: '',
  dateTo: '',
  releaseForRelet: false,
  note: ''
})
const submitting = ref(false)
const error = ref<string | null>(null)

async function load() {
  const me = await $fetch<PortalMe>('/api/portal/me')
  berths.value = me.customer.berths
  if (berths.value.length === 1) {
    form.value.berthId = berths.value[0]!.id
  }
}

async function submit() {
  submitting.value = true
  error.value = null
  try {
    await $fetch('/api/portal/absences', { method: 'POST', body: form.value })
    await navigateTo('/portal/absences')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message || err?.message || 'Er ging iets mis'
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="min-h-[100dvh] bg-[#F4F7F8] text-[#0A1520]">
    <header class="bg-white border-b border-black/[0.06]">
      <div class="max-w-2xl mx-auto px-4 sm:px-6 h-16 flex items-center">
        <NuxtLink to="/portal/absences" class="flex items-center gap-2 text-sm font-semibold">
          <UIcon name="i-lucide-arrow-left" class="size-4" /> Terug
        </NuxtLink>
      </div>
    </header>
    <main class="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div class="flex items-center gap-4">
        <AbsenceVacation class="size-16 text-primary-500" />
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Boot is even weg</h1>
          <p class="text-sm text-[#2D3E4A]">Laat de havenmeester weten van wanneer tot wanneer je ligplaats leeg blijft.</p>
        </div>
      </div>

      <div v-if="error" class="bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl p-3">{{ error }}</div>

      <form class="space-y-4 bg-white rounded-2xl p-6" @submit.prevent="submit">
        <label class="block">
          <span class="text-sm font-medium">Ligplaats</span>
          <select v-model="form.berthId" required class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm">
            <option value="" disabled>Kies een ligplaats…</option>
            <option v-for="b in berths" :key="b.id" :value="b.id">{{ b.pier }} — {{ b.code }}</option>
          </select>
        </label>
        <div class="grid grid-cols-2 gap-3">
          <label class="block">
            <span class="text-sm font-medium">Van</span>
            <input v-model="form.dateFrom" type="date" required class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm" />
          </label>
          <label class="block">
            <span class="text-sm font-medium">Tot</span>
            <input v-model="form.dateTo" type="date" required class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3 text-sm" />
          </label>
        </div>
        <label class="flex items-start gap-2 text-sm">
          <input v-model="form.releaseForRelet" type="checkbox" class="mt-1" />
          <span>Mijn ligplaats mag in deze periode aan een passant verhuurd worden.</span>
        </label>
        <label class="block">
          <span class="text-sm font-medium">Opmerking</span>
          <textarea v-model="form.note" rows="3" class="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm" />
        </label>
        <button
          type="submit"
          :disabled="submitting"
          class="w-full h-11 rounded-full text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 disabled:opacity-60"
        >
          {{ submitting ? 'Bezig…' : 'Melding versturen' }}
        </button>
      </form>
    </main>
  </div>
</template>
