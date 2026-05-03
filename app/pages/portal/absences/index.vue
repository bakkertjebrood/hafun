<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ layout: false })

interface Absence {
  id: string
  berthId: string
  dateFrom: string
  dateTo: string
  releaseForRelet: boolean
  status: string
  note: string | null
  berth: { code: string; pier: string } | null
}

const absences = ref<Absence[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

async function load() {
  loading.value = true
  try {
    absences.value = await $fetch<Absence[]>('/api/portal/absences')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; statusCode?: number }
    error.value = err?.data?.message || 'Kon meldingen niet laden'
  } finally {
    loading.value = false
  }
}

async function remove(id: string) {
  if (!confirm('Melding intrekken?')) return
  await $fetch(`/api/portal/absences/${id}`, { method: 'DELETE' })
  load()
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(load)
</script>

<template>
  <div class="min-h-[100dvh] bg-[#F4F7F8] text-[#0A1520]">
    <header class="bg-white border-b border-black/[0.06]">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <NuxtLink to="/portal" class="flex items-center gap-2 text-sm font-semibold">
          <UIcon name="i-lucide-arrow-left" class="size-4" /> Terug
        </NuxtLink>
        <NuxtLink to="/portal/absences/new" class="px-4 h-10 inline-flex items-center rounded-full bg-primary-500 text-white text-sm font-semibold">
          Nieuwe melding
        </NuxtLink>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-4">
      <h1 class="text-2xl font-semibold tracking-tight">Mijn afwezigheidsmeldingen</h1>
      <div v-if="loading" class="text-[#5A6A78]">Laden…</div>
      <div v-else-if="error" class="bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl p-3">{{ error }}</div>
      <div v-else-if="absences.length === 0" class="bg-white rounded-2xl p-8 text-center text-[#5A6A78]">
        Nog geen meldingen. Meld je gerust afwezig wanneer je boot een tijdje weg is.
      </div>
      <ul v-else class="space-y-2">
        <li v-for="a in absences" :key="a.id" class="bg-white rounded-2xl p-4 flex items-start justify-between gap-3">
          <div>
            <div class="font-semibold">{{ a.berth ? `${a.berth.pier} — ${a.berth.code}` : 'Ligplaats' }}</div>
            <div class="text-sm text-[#5A6A78]">{{ fmt(a.dateFrom) }} t/m {{ fmt(a.dateTo) }}</div>
            <div class="text-xs mt-1">
              <span v-if="a.releaseForRelet" class="text-emerald-700">Vrijgegeven voor onderverhuur</span>
              <span v-else class="text-[#5A6A78]">Alleen ter info</span>
              · status: {{ a.status }}
            </div>
            <div v-if="a.note" class="text-xs text-[#5A6A78] mt-1">{{ a.note }}</div>
          </div>
          <button
            v-if="a.status !== 'cancelled'"
            class="text-xs text-red-600 hover:underline"
            @click="remove(a.id)"
          >
            Intrekken
          </button>
        </li>
      </ul>
    </main>
  </div>
</template>
