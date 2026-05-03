<script setup lang="ts">
import { ref, onMounted } from 'vue'

definePageMeta({ layout: 'dashboard' })

interface Absence {
  id: string
  berthId: string
  customerId: string
  dateFrom: string
  dateTo: string
  releaseForRelet: boolean
  status: string
  note: string | null
  creditAmount: number | null
  berth: { code: string; pier: string } | null
  customer: { name: string } | null
}

const absences = ref<Absence[]>([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    absences.value = await $fetch<Absence[]>('/api/absences')
  } finally {
    loading.value = false
  }
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })
}

onMounted(load)
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 py-8 space-y-4">
    <h1 class="text-2xl font-semibold tracking-tight">Afwezigheidsmeldingen</h1>
    <p class="text-sm text-[#5A6A78]">Vaste liggers die hebben aangegeven dat hun boot weg is.</p>

    <div v-if="loading" class="text-[#5A6A78]">Laden…</div>
    <div v-else-if="absences.length === 0" class="bg-white rounded-2xl p-8 text-center text-[#5A6A78]">
      Nog geen meldingen.
    </div>
    <table v-else class="w-full text-sm bg-white rounded-2xl overflow-hidden">
      <thead class="bg-[#F4F7F8] text-xs uppercase tracking-widest text-[#5A6A78]">
        <tr>
          <th class="text-left px-4 py-3">Eigenaar</th>
          <th class="text-left px-4 py-3">Ligplaats</th>
          <th class="text-left px-4 py-3">Periode</th>
          <th class="text-left px-4 py-3">Onderverhuur</th>
          <th class="text-left px-4 py-3">Status</th>
          <th class="text-left px-4 py-3">Opmerking</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in absences" :key="a.id" class="border-t border-black/[0.04]">
          <td class="px-4 py-3">{{ a.customer?.name || '—' }}</td>
          <td class="px-4 py-3">{{ a.berth ? `${a.berth.pier} — ${a.berth.code}` : '—' }}</td>
          <td class="px-4 py-3">{{ fmt(a.dateFrom) }} → {{ fmt(a.dateTo) }}</td>
          <td class="px-4 py-3">
            <span v-if="a.releaseForRelet" class="text-emerald-700 text-xs font-semibold">Vrijgegeven</span>
            <span v-else class="text-[#5A6A78] text-xs">Alleen ter info</span>
          </td>
          <td class="px-4 py-3 text-xs">{{ a.status }}</td>
          <td class="px-4 py-3 text-xs text-[#5A6A78]">{{ a.note || '—' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
