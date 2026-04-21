<script setup lang="ts">
definePageMeta({
  layout: 'dashboard'
})

const today = new Date()
const dayNames = ['Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag']
const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december']
const dateString = `${dayNames[today.getDay()]} ${today.getDate()} ${monthNames[today.getMonth()]}`

const kpis = [
  { label: 'Bezetting vandaag', value: '74%', change: '+6%', positive: true },
  { label: 'Check-ins', value: '18', change: '4 wachten', neutral: true },
  { label: 'Openstaand', value: '\u20AC 2.480', change: '3 facturen', neutral: true },
  { label: 'Passanten deze week', value: '34', change: '+12', positive: true }
]

const schedule = [
  { time: '10:40', name: 'Linde \u2014 SY Goedewind', kind: 'Aankomst', slot: 'B-12', status: 'onderweg' },
  { time: '11:15', name: 'Pieter van Dam', kind: 'Check-in', slot: 'A-07', status: 'bevestigd' },
  { time: '13:00', name: 'MY Saltwater', kind: 'Vertrek', slot: 'C-21', status: 'ingepland' },
  { time: '15:30', name: 'Family Hendriks', kind: 'Aankomst', slot: 'B-04', status: 'onderweg' },
  { time: '17:00', name: 'Tech Inspectie', kind: 'Intern', slot: 'A-19', status: 'ingepland' }
]

const notifications = [
  { title: '\u20AC 340 betaling ontvangen', sub: 'van Pieter van Dam \u00B7 B-07', color: '#10B981' },
  { title: 'Waterpeil laag \u2014 steiger C', sub: 'sensor \u00B7 2 min geleden', color: '#F59E0B' },
  { title: 'Nieuwe reserveringsaanvraag', sub: '3 nachten \u00B7 SY Nordwind', color: '#00A9A5' }
]

function statusClasses(status: string) {
  switch (status) {
    case 'onderweg': return 'bg-amber-500/12 text-amber-600'
    case 'bevestigd': return 'bg-emerald-500/12 text-emerald-600'
    default: return 'bg-black/5 text-[#5A6A78]'
  }
}
</script>

<template>
  <div class="p-4 lg:p-7 max-w-[1400px]">
    <!-- Topbar -->
    <div class="flex items-end justify-between mb-5 lg:mb-7">
      <div>
        <div class="text-xs text-[#5A6A78] mb-1 tracking-wide">
          {{ dateString }}
        </div>
        <h1 class="text-2xl lg:text-4xl font-semibold tracking-tight text-[#0A1520] leading-tight">
          Dag Elmer.
        </h1>
      </div>
      <div class="hidden sm:flex gap-2.5">
        <UButton color="neutral" variant="outline" class="rounded-full" size="sm">
          Exporteer
        </UButton>
        <UButton color="primary" class="rounded-full" size="sm">
          + Reservering
        </UButton>
      </div>
    </div>

    <!-- KPI row -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 lg:gap-3.5 mb-4 lg:mb-5">
      <div
        v-for="kpi in kpis"
        :key="kpi.label"
        class="bg-white border border-black/[0.08] rounded-[14px] p-4"
      >
        <div class="text-xs text-[#5A6A78] font-medium">{{ kpi.label }}</div>
        <div class="text-3xl font-semibold tracking-tight mt-1.5 leading-none text-[#0A1520]">
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
      <!-- Marina map placeholder -->
      <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
        <div class="flex items-center justify-between mb-3.5">
          <div class="text-sm font-semibold text-[#0A1520] tracking-tight">Ligplaatskaart — Steiger B</div>
          <div class="flex gap-2">
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-black/[0.08] text-xs font-medium">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500" />Vrij 42
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-black/[0.08] text-xs font-medium">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-500" />Reserved 8
            </span>
            <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-black/[0.08] text-xs font-medium">
              <span class="w-1.5 h-1.5 rounded-full bg-red-500" />Bezet 18
            </span>
          </div>
        </div>
        <!-- Simplified marina visualization -->
        <div class="bg-[#E4EEF0] rounded-[10px] p-4 relative overflow-hidden">
          <div v-for="(row, ri) in ['A', 'B', 'C']" :key="row" class="flex items-center gap-1 mb-3 last:mb-0">
            <div class="w-6 font-mono text-[10px] font-semibold text-[#5A6A78]">{{ row }}</div>
            <div class="flex-1 h-1.5 bg-[#0A1520]/80 rounded relative">
              <div class="absolute inset-0 flex justify-between px-1.5 -translate-y-1/2">
                <div
                  v-for="i in 14"
                  :key="i"
                  class="w-2.5 h-4 rounded-sm shadow-sm"
                  :class="[
                    (ri * 31 + i * 7) % 10 < 2 ? 'bg-red-500' :
                    (ri * 31 + i * 7) % 10 < 4 ? 'bg-amber-500' :
                    'bg-emerald-500'
                  ]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Today schedule -->
      <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
        <div class="text-sm font-semibold text-[#0A1520] tracking-tight mb-3.5">Vandaag</div>
        <div class="flex flex-col">
          <div
            v-for="(row, i) in schedule"
            :key="i"
            class="grid grid-cols-[52px_1fr_auto] gap-3 py-3 items-center"
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
      </div>
    </div>

    <!-- Bottom row -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-2.5 lg:gap-3.5 mt-2.5 lg:mt-3.5">
      <!-- Occupancy chart -->
      <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
        <div class="text-sm font-semibold text-[#0A1520] tracking-tight mb-3.5">Bezetting — 14 dagen</div>
        <div class="flex items-end gap-1 h-[150px]">
          <div
            v-for="(val, i) in [47, 60, 55, 70, 62, 78, 85, 74, 52, 65, 58, 72, 80, 88]"
            :key="i"
            class="flex-1 flex flex-col items-center gap-1.5"
          >
            <div
              class="w-full rounded-[6px] relative"
              :class="i === 7 ? 'bg-primary-500' : 'bg-primary-500/30'"
              :style="{ height: `${val * 1.5}px` }"
            >
              <div
                v-if="i === 7"
                class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 text-[11px] font-semibold text-[#0A1520] whitespace-nowrap"
              >
                {{ val }}%
              </div>
            </div>
          </div>
        </div>
        <div class="flex gap-1 mt-2 font-mono text-[10px] text-[#5A6A78]">
          <div
            v-for="(d, i) in ['Ma','Di','Wo','Do','Vr','Za','Zo','Ma','Di','Wo','Do','Vr','Za','Zo']"
            :key="i"
            class="flex-1 text-center"
            :class="i === 7 ? 'font-bold text-[#0A1520]' : ''"
          >
            {{ d }}
          </div>
        </div>
      </div>

      <!-- Notifications -->
      <div class="bg-white border border-black/[0.08] rounded-[14px] p-5">
        <div class="text-sm font-semibold text-[#0A1520] tracking-tight mb-3.5">Meldingen</div>
        <div
          v-for="(notif, i) in notifications"
          :key="i"
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
    </div>
  </div>
</template>
