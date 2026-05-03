<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({ layout: false })

const route = useRoute()
const slug = computed(() => String(route.params.slug || ''))
const token = computed(() => String(route.params.token || ''))

interface Receipt {
  marinaName: string
  name: string
  boatName: string | null
  boatLength: number | null
  arrival: string
  departure: string | null
  persons: number
  paymentStatus: string
  bookings: { id: string; dateFrom: string; dateTo: string; status: string; berth: { code: string; pier: string } | null }[]
}

const { data: receipt, error } = await useFetch<Receipt>(
  () => `/api/public/${slug.value}/passant/${token.value}`,
  { key: () => `receipt-${slug.value}-${token.value}` }
)

function fmt(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' })
}
</script>

<template>
  <div class="min-h-[100dvh] bg-[#F4F7F8] text-[#0A1520]">
    <main class="max-w-md mx-auto px-4 py-10">
      <div class="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <div v-if="error || !receipt" class="text-center py-10 text-[#5A6A78]">
          Bon niet gevonden.
        </div>
        <template v-else>
          <div class="text-center">
            <div class="text-xs font-semibold uppercase tracking-widest text-[#5A6A78]">Digitale bon</div>
            <div class="mt-1 font-semibold text-lg">{{ receipt.marinaName }}</div>
          </div>
          <div class="border-y border-dashed border-black/10 py-4 space-y-1 text-sm">
            <div class="flex justify-between"><span class="text-[#5A6A78]">Naam</span><span>{{ receipt.name }}</span></div>
            <div v-if="receipt.boatName" class="flex justify-between"><span class="text-[#5A6A78]">Boot</span><span>{{ receipt.boatName }} ({{ receipt.boatLength }}m)</span></div>
            <div class="flex justify-between"><span class="text-[#5A6A78]">Aankomst</span><span>{{ fmt(receipt.arrival) }}</span></div>
            <div v-if="receipt.departure" class="flex justify-between"><span class="text-[#5A6A78]">Vertrek</span><span>{{ fmt(receipt.departure) }}</span></div>
            <div class="flex justify-between"><span class="text-[#5A6A78]">Personen</span><span>{{ receipt.persons }}</span></div>
          </div>
          <div v-for="b in receipt.bookings" :key="b.id" class="text-sm">
            <div class="flex justify-between">
              <span class="text-[#5A6A78]">Plek</span>
              <span>{{ b.berth ? `${b.berth.pier} — ${b.berth.code}` : 'Wordt toegewezen' }}</span>
            </div>
          </div>
          <div class="text-center text-xs text-[#5A6A78]">
            <span v-if="receipt.paymentStatus === 'paid'">Betaling ontvangen — welkom!</span>
            <span v-else-if="receipt.paymentStatus === 'pending'">Betaling staat nog open.</span>
            <span v-else>Afrekenen bij de havenmeester.</span>
          </div>
        </template>
      </div>
    </main>
  </div>
</template>
