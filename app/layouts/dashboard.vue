<script setup lang="ts">
const navigation = [
  { label: 'Overzicht', icon: 'i-lucide-layout-dashboard', to: '/dashboard' },
  { label: 'Ligplaatskaart', icon: 'i-lucide-map', to: '/dashboard/map' },
  { label: 'Reserveringen', icon: 'i-lucide-calendar-check', to: '/dashboard/bookings' },
  { label: 'Huurders', icon: 'i-lucide-users', to: '/dashboard/customers' },
  { label: 'Facturatie', icon: 'i-lucide-receipt', to: '/dashboard/financial' },
  { label: 'Meldingen', icon: 'i-lucide-bell', to: '/dashboard/notifications' }
]
</script>

<template>
  <div class="flex h-screen bg-[#F4F7F8]">
    <!-- Sidebar -->
    <aside class="w-[220px] bg-white border-r border-black/[0.08] flex flex-col shrink-0">
      <!-- Logo -->
      <div class="px-5 pt-6 pb-6">
        <NautarLogo :size="18" />
      </div>

      <!-- Nav items -->
      <nav class="flex-1 flex flex-col gap-1 px-3">
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors"
          active-class="bg-primary-500/10 text-[#0A1520] font-semibold"
          inactive-class="text-[#5A6A78] hover:bg-black/[0.04]"
        >
          <UIcon :name="item.icon" class="size-[18px]" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <!-- User -->
      <div class="p-3 mt-auto">
        <div class="flex items-center gap-2.5 p-3 rounded-[10px] bg-[#F4F7F8] border border-black/[0.08]">
          <div class="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-[13px] font-semibold">
            EB
          </div>
          <div class="leading-tight">
            <div class="text-[13px] font-semibold text-[#0A1520]">Elmer Bakker</div>
            <div class="text-[11px] text-[#5A6A78]">Havenmeester</div>
          </div>
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 overflow-auto min-h-0">
      <slot />
    </main>
  </div>
</template>
