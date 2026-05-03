<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const { user } = useAuthUser()
const loading = ref(true)
const stats = ref<any>(null)
const showCheckin = ref(false)
const { loadError, messageFor } = useFetchError()

const greeting = computed(() => {
  const name = user.value?.firstName || user.value?.email?.split('@')[0] || ''
  return name ? `Dag ${name}.` : 'Welkom.'
})

const today = new Date()
const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
const dateString = `${dayNames[today.getDay()]} ${today.getDate()} ${monthNames[today.getMonth()]}`

const dayLabels = (() => {
  const labels = []
  const dayShort = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']
  for (let i = 0; i < 14; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - 7 + i)
    labels.push(dayShort[d.getDay()])
  }
  return labels
})()

async function loadStats() {
  loading.value = true
  loadError.value = ''
  try {
    stats.value = await $fetch('/api/dashboard/stats')
  }
  catch (e) {
    loadError.value = messageFor(e, 'Kon dashboardgegevens niet laden')
  }
  finally {
    loading.value = false
  }
}

onMounted(loadStats)

function formatCurrency(n: number) {
  return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function statusClasses(status: string) {
  switch (status) {
    case 'onderweg': return 'bg-amber-500/12 text-amber-600'
    case 'bevestigd': return 'bg-emerald-500/12 text-emerald-600'
    default: return 'bg-black/5 text-[#5A6A78]'
  }
}

const kpis = computed(() => {
  if (!stats.value) return []
  const k = stats.value.kpis
  return [
    { label: 'Bezetting vandaag', value: `${k.occupancy}%`, change: `${k.occupancy > 50 ? '+' : ''}${k.occupancy - 50}% vs gem.`, positive: k.occupancy > 50 },
    { label: 'Check-ins vandaag', value: String(k.checkIns), change: k.checkIns > 0 ? `${k.checkIns} verwacht` : 'Geen vandaag', neutral: true },
    { label: 'Openstaand', value: formatCurrency(k.outstanding), change: `${k.openInvoices} facturen`, neutral: true },
    { label: 'Passanten deze week', value: String(k.passanten), change: k.passanten > 0 ? 'deze week' : 'Geen passanten', neutral: true }
  ]
})

const schedule = computed(() => stats.value?.schedule || [])
const notifications = computed(() => stats.value?.notifications || [])
const occupancyChart = computed(() => stats.value?.occupancyChart || Array(14).fill(0))
const todayIndex = 7 // today is always index 7 in the 14-day window
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1400px]">
    <!-- Topbar -->
    <div class="flex items-end justify-between mb-5 lg:mb-7">
      <div>
        <div class="text-xs text-[#5A6A78] mb-1 tracking-wide">
          {{ dateString }} · {{ user?.marina?.name || '' }}
        </div>
        <h1 class="text-2xl lg:text-4xl font-semibold tracking-tight text-[#0A1520] leading-tight">
          {{ greeting }}
        </h1>
      </div>
      <div class="hidden sm:flex gap-2.5">
        <NuxtLink to="/dashboard/financial">
          <UButton color="neutral" variant="outline" class="rounded-full" size="sm">
            Facturen
          </UButton>
        </NuxtLink>
        <UButton color="primary" class="rounded-full" size="sm" @click="showCheckin = true">
          + Passant inchecken
        </UButton>
      </div>
    </div>

    <!-- Load error -->
    <div v-if="loadError" class="mb-4 px-4 py-3 rounded-[10px] bg-red-50 border border-red-200 flex items-start gap-3">
      <UIcon name="i-lucide-alert-triangle" class="size-4 text-red-600 mt-0.5 shrink-0" />
      <div class="flex-1 text-sm text-red-700">{{ loadError }}</div>
      <button class="text-xs text-red-700 font-semibold underline" @click="loadStats()">Opnieuw laden</button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-sm text-[#5A6A78] py-8 text-center">Dashboard laden...</div>

    <template v-else>
      <!-- KPI row -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3.5 mb-4 lg:mb-5">
        <div
          v-for="kpi in kpis"
          :key="kpi.label"
          class="bg-white border border-black/[0.08] rounded-[14px] p-4"
        >
          <div class="text-xs text-[#5A6A78] font-medium">{{ kpi.label }}</div>
          <div class="text-2xl lg:text-3xl font-semibold tracking-tight mt-1.5 leading-none text-[#0A1520]">
            {{ kpi.value }}
          </div>
          <div
            class="mt-2 text-xs font-medium"
            :class="kpi.positive ? 'text-emerald-500' : 'text-[#5A6A78]'"
          >
            {{ kpi.change }}
          </div>
        </div>
      </div>

      <!-- Two column -->
      <div class="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-2.5 lg:gap-3.5">
        <!-- Quick link to map -->
        <NuxtLink to="/dashboard/map" class="bg-white border border-black/[0.08] rounded-[14px] p-5 hover:border-primary-500/30 transition-colors">
          <div class="flex items-center justify-between mb-3">
            <div class="text-sm font-semibold text-[#0A1520] tracking-tight">Ligplaatskaart</div>
            <span class="text-xs text-primary-500 font-medium">Bekijk kaart →</span>
          </div>
          <div class="bg-[#E4EEF0] rounded-[10px] p-4 text-center text-sm text-[#5A6A78]">
            <UIcon name="i-lucide-map" class="size-8 text-primary-500/40 mx-auto mb-2" />
            Klik om de interactieve havenkaart te openen
          </div>
        </NuxtLink>

        <!-- Today schedule -->
        <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
          <div class="flex items-center justify-between mb-3.5">
            <div class="text-sm font-semibold text-[#0A1520] tracking-tight">Vandaag</div>
            <NuxtLink to="/dashboard/bookings" class="text-xs text-primary-500 font-medium">Alle boekingen →</NuxtLink>
          </div>
          <div v-if="schedule.length" class="flex flex-col">
            <div
              v-for="(row, i) in schedule"
              :key="row.id"
              class="grid grid-cols-[48px_1fr_auto] gap-3 py-3 items-center"
              :class="i < schedule.length - 1 ? 'border-b border-black/[0.08]' : ''"
            >
              <div class="font-mono text-[13px] font-semibold text-[#0A1520]">{{ row.time }}</div>
              <div>
                <div class="text-[13px] font-semibold text-[#0A1520] tracking-tight">{{ row.name }}</div>
                <div class="text-xs text-[#5A6A78] mt-0.5">{{ row.kind }} · {{ row.slot }}</div>
              </div>
              <span
                class="px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize tracking-wide"
                :class="statusClasses(row.status)"
              >
                {{ row.status }}
              </span>
            </div>
          </div>
          <div v-else class="py-6 text-center text-sm text-[#5A6A78]">
            Geen boekingen vandaag
          </div>
        </div>
      </div>

      <!-- Bottom row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-2.5 lg:gap-3.5 mt-2.5 lg:mt-3.5">
        <!-- Occupancy chart -->
        <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
          <div class="text-sm font-semibold text-[#0A1520] tracking-tight mb-3.5">Bezetting — 14 dagen</div>
          <div class="flex items-end gap-1 h-[150px]">
            <div
              v-for="(val, i) in occupancyChart"
              :key="i"
              class="flex-1 flex flex-col items-center gap-1.5"
            >
              <div
                class="w-full rounded-[6px] relative"
                :class="i === todayIndex ? 'bg-primary-500' : 'bg-primary-500/30'"
                :style="{ height: `${Math.max(val * 1.5, 4)}px` }"
              >
                <div
                  v-if="i === todayIndex"
                  class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 text-[11px] font-semibold text-[#0A1520] whitespace-nowrap"
                >
                  {{ val }}%
                </div>
              </div>
            </div>
          </div>
          <div class="flex gap-1 mt-2 font-mono text-[10px] text-[#5A6A78]">
            <div
              v-for="(d, i) in dayLabels"
              :key="i"
              class="flex-1 text-center"
              :class="i === todayIndex ? 'font-bold text-[#0A1520]' : ''"
            >
              {{ d }}
            </div>
          </div>
        </div>

        <!-- Notifications -->
        <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
          <div class="flex items-center justify-between mb-3.5">
            <div class="text-sm font-semibold text-[#0A1520] tracking-tight">Meldingen</div>
            <NuxtLink to="/dashboard/notifications" class="text-xs text-primary-500 font-medium">Alle →</NuxtLink>
          </div>
          <div v-if="notifications.length">
            <div
              v-for="(notif, i) in notifications"
              :key="notif.id"
              class="flex gap-3 py-3"
              :class="i < notifications.length - 1 ? 'border-b border-black/[0.08]' : ''"
            >
              <span
                class="w-2 h-2 rounded-full mt-1.5 shrink-0"
                :style="{ background: notif.color }"
              />
              <div>
                <div class="text-[13px] font-semibold text-[#0A1520]">{{ notif.title }}</div>
                <div class="text-xs text-[#5A6A78] mt-0.5">{{ notif.sub }}</div>
              </div>
            </div>
          </div>
          <div v-else class="py-6 text-center text-sm text-[#5A6A78]">
            Geen meldingen
          </div>
        </div>
      </div>
    </template>

    <!-- Check-in wizard -->
    <BookingCheckinWizard
      v-if="showCheckin"
      @close="showCheckin = false"
      @done="showCheckin = false; loading = true; $fetch('/api/dashboard/stats').then(d => { stats = d; loading = false })"
    />
  </div>
</template>
