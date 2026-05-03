<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const loading = ref(true)
const data = ref<any>({ notes: [], overdueInvoices: [], todayBookings: 0 })
const { loadError, messageFor } = useFetchError()

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    data.value = await $fetch('/api/notifications')
  }
  catch (e) {
    loadError.value = messageFor(e, 'Kon meldingen niet laden')
  }
  finally {
    loading.value = false
  }
}

onMounted(load)

function formatDateTime(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n)
}

function timeAgo(d: string) {
  const now = Date.now()
  const then = new Date(d).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'zojuist'
  if (mins < 60) return `${mins} min geleden`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} uur geleden`
  const days = Math.floor(hours / 24)
  return `${days} dag${days > 1 ? 'en' : ''} geleden`
}
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[900px]">
    <h1 class="text-xl lg:text-2xl font-semibold text-[#0A1520] tracking-tight mb-5">Meldingen</h1>

    <div v-if="loadError" class="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 flex items-start gap-3">
      <UIcon name="i-lucide-alert-triangle" class="size-4 text-red-600 mt-0.5 shrink-0" />
      <div class="flex-1 text-sm text-red-700">{{ loadError }}</div>
      <button class="text-xs text-red-700 font-semibold underline" @click="load()">Opnieuw laden</button>
    </div>

    <div v-if="loading" class="text-sm text-[#5A6A78]">Laden...</div>

    <template v-else>
      <!-- Alerts -->
      <div v-if="data.overdueInvoices.length" class="mb-5">
        <div class="text-[10px] uppercase tracking-widest text-red-500 font-semibold mb-2">
          Verlopen facturen ({{ data.overdueInvoices.length }})
        </div>
        <div class="bg-white border border-red-200 rounded-[14px] overflow-hidden">
          <div
            v-for="(inv, i) in data.overdueInvoices"
            :key="inv.id"
            class="flex items-center gap-3 px-5 py-3"
            :class="i < data.overdueInvoices.length - 1 ? 'border-b border-red-100' : ''"
          >
            <span class="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <div class="flex-1">
              <div class="text-sm font-semibold text-[#0A1520]">{{ inv.number }} · {{ inv.customer?.name }}</div>
              <div class="text-xs text-red-500">Vervallen op {{ formatDate(inv.dueDate) }}</div>
            </div>
            <div class="text-sm font-semibold text-[#0A1520]">{{ formatCurrency(inv.total - inv.paidAmount) }}</div>
          </div>
        </div>
      </div>

      <!-- Today summary -->
      <div v-if="data.todayBookings > 0" class="mb-5 bg-primary-500/5 border border-primary-500/20 rounded-[14px] p-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-primary-500/10 text-primary-500 flex items-center justify-center font-semibold">
          {{ data.todayBookings }}
        </div>
        <div>
          <div class="text-sm font-semibold text-[#0A1520]">{{ data.todayBookings }} boeking{{ data.todayBookings > 1 ? 'en' : '' }} vandaag</div>
          <div class="text-xs text-[#5A6A78]">Bekijk de reserveringen pagina voor details</div>
        </div>
      </div>

      <!-- Notes timeline -->
      <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">
        Recente notities ({{ data.notes.length }})
      </div>
      <div class="bg-white border border-black/[0.08] rounded-[14px] overflow-hidden">
        <div
          v-for="(note, i) in data.notes"
          :key="note.id"
          class="flex gap-3 px-5 py-3.5"
          :class="i < data.notes.length - 1 ? 'border-b border-black/[0.08]' : ''"
        >
          <div class="w-8 h-8 rounded-full bg-[#F4F7F8] flex items-center justify-center text-xs font-semibold text-[#5A6A78] shrink-0 mt-0.5">
            {{ (note.author?.firstName?.[0] || '') + (note.author?.lastName?.[0] || '') }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="text-sm font-semibold text-[#0A1520]">{{ note.author?.firstName }} {{ note.author?.lastName }}</span>
              <span v-if="note.berth" class="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-primary-500/10 text-primary-500">
                {{ note.berth.code }}
              </span>
              <span class="text-[10px] text-[#5A6A78] ml-auto shrink-0">{{ timeAgo(note.createdAt) }}</span>
            </div>
            <div class="text-sm text-[#0A1520]">{{ note.text }}</div>
          </div>
        </div>
        <div v-if="!data.notes.length" class="px-5 py-12 text-center text-sm text-[#5A6A78]">Geen meldingen</div>
      </div>
    </template>
  </div>
</template>
