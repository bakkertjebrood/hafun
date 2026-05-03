<script setup lang="ts">
const mobileMenuOpen = ref(false)
const route = useRoute()
const { user, initials, fullName, roleLabel, logout } = useAuthUser()

const navigation = [
  { label: 'Overzicht', icon: 'i-lucide-layout-dashboard', to: '/dashboard' },
  { label: 'Kaart', icon: 'i-lucide-map', to: '/dashboard/map' },
  { label: 'Agenda', icon: 'i-lucide-calendar', to: '/dashboard/agenda' },
  { label: 'Reserveringen', icon: 'i-lucide-calendar-check', to: '/dashboard/bookings' },
  { label: 'Huurders', icon: 'i-lucide-users', to: '/dashboard/customers' },
  { label: 'Wachtlijst', icon: 'i-lucide-list-checks', to: '/dashboard/waitlist' },
  { label: 'Offertes', icon: 'i-lucide-file-text', to: '/dashboard/quotes' },
  { label: 'Werkbonnen', icon: 'i-lucide-wrench', to: '/dashboard/workorders' },
  { label: 'Kassa', icon: 'i-lucide-shopping-cart', to: '/dashboard/pos' },
  { label: 'Standen', icon: 'i-lucide-gauge', to: '/dashboard/meters' },
  { label: 'Fotobord', icon: 'i-lucide-images', to: '/dashboard/photoboard' },
  { label: 'Facturatie', icon: 'i-lucide-receipt', to: '/dashboard/financial' },
  { label: 'Dagafsluiting', icon: 'i-lucide-calculator', to: '/dashboard/closing' },
  { label: 'Meldingen', icon: 'i-lucide-bell', to: '/dashboard/notifications' },
  { label: 'Mutatielog', icon: 'i-lucide-history', to: '/dashboard/audit' },
  { label: 'Beheer', icon: 'i-lucide-settings', to: '/dashboard/settings' }
]

// Bottom nav: most important items for mobile
const bottomNav = [
  { label: 'Overzicht', icon: 'i-lucide-layout-dashboard', to: '/dashboard' },
  { label: 'Kaart', icon: 'i-lucide-map', to: '/dashboard/map' },
  { label: 'Huurders', icon: 'i-lucide-users', to: '/dashboard/customers' },
  { label: 'Meer', icon: 'i-lucide-menu', action: 'menu' }
]

watch(route, () => { mobileMenuOpen.value = false })
</script>

<template>
  <div class="flex h-[100dvh] bg-[#F4F7F8]">
    <!-- Desktop Sidebar -->
    <aside class="hidden lg:flex w-[220px] bg-white border-r border-black/[0.08] flex-col shrink-0">
      <div class="px-5 pt-6 pb-6">
        <NautarLogo :size="18" />
      </div>
      <nav class="flex-1 flex flex-col gap-1 px-3">
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors text-[#0A1520] hover:bg-black/[0.04]"
          active-class="!bg-primary-500/10 font-semibold"
        >
          <UIcon :name="item.icon" class="size-[18px]" />
          {{ item.label }}
        </NuxtLink>
      </nav>
      <div class="p-3 mt-auto">
        <div class="flex items-center gap-2.5 p-3 rounded-[10px] bg-[#F4F7F8] border border-black/[0.08]">
          <div class="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-[13px] font-semibold shrink-0">
            {{ initials }}
          </div>
          <div class="leading-tight min-w-0 flex-1">
            <div class="text-[13px] font-semibold text-[#0A1520] truncate">{{ fullName }}</div>
            <div class="text-[11px] text-[#5A6A78] truncate">{{ roleLabel }}</div>
          </div>
          <button
            type="button"
            class="shrink-0 p-1.5 rounded-md text-[#0A1520] hover:bg-black/[0.04]"
            aria-label="Uitloggen"
            @click="logout"
          >
            <UIcon name="i-lucide-log-out" class="size-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Mobile Header -->
    <div class="lg:hidden fixed top-0 left-0 right-0 z-[900] bg-white/95 backdrop-blur-sm border-b border-black/[0.08]">
      <div class="flex items-center justify-between px-4 h-14">
        <NautarLogo :size="16" />
        <div class="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-[12px] font-semibold">
          {{ initials }}
        </div>
      </div>
    </div>

    <!-- Main content -->
    <main class="flex-1 overflow-auto min-h-0 lg:pt-0 pt-14 pb-16 lg:pb-0">
      <slot />
    </main>

    <!-- Mobile Bottom Nav -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-[900] bg-white/95 backdrop-blur-sm border-t border-black/[0.08] safe-bottom">
      <div class="flex justify-around items-center h-16 px-2">
        <template v-for="item in bottomNav" :key="item.label">
          <button
            v-if="item.action === 'menu'"
            class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors text-[#0A1520]"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <UIcon :name="item.icon" class="size-6" />
            <span class="text-[10px] font-medium">{{ item.label }}</span>
          </button>
          <NuxtLink
            v-else
            :to="item.to"
            class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors text-[#0A1520]"
            active-class="!text-primary-500"
          >
            <UIcon :name="item.icon" class="size-6" />
            <span class="text-[10px] font-medium">{{ item.label }}</span>
          </NuxtLink>
        </template>
      </div>
    </nav>

    <!-- Mobile slide-up menu -->
    <Transition name="slide-up">
      <div
        v-if="mobileMenuOpen"
        class="lg:hidden fixed inset-0 z-[950]"
        @click="mobileMenuOpen = false"
      >
        <div class="absolute inset-0 bg-black/30" />
        <div
          class="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] pb-8 safe-bottom flex flex-col max-h-[85dvh]"
          @click.stop
        >
          <div class="relative shrink-0">
            <div class="w-10 h-1 rounded-full bg-black/10 mx-auto mt-3 mb-4" />
            <button
              type="button"
              class="absolute top-2 right-3 w-8 h-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center"
              aria-label="Sluiten"
              @click="mobileMenuOpen = false"
            >
              <UIcon name="i-lucide-x" class="size-5 text-[#0A1520]" />
            </button>
          </div>
          <nav class="px-4 flex flex-col gap-1 overflow-y-auto flex-1 min-h-0">
            <NuxtLink
              v-for="item in navigation"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-4 py-3.5 rounded-[12px] text-[15px] font-medium transition-colors text-[#0A1520]"
              active-class="!bg-primary-500/10 font-semibold"
              @click="mobileMenuOpen = false"
            >
              <UIcon :name="item.icon" class="size-5" />
              {{ item.label }}
            </NuxtLink>
          </nav>
          <div v-if="user" class="shrink-0 mt-3 mx-4 pt-3 border-t border-black/[0.08] flex items-center gap-3">
            <div class="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center text-[13px] font-semibold shrink-0">
              {{ initials }}
            </div>
            <div class="leading-tight min-w-0 flex-1">
              <div class="text-[14px] font-semibold text-[#0A1520] truncate">{{ fullName }}</div>
              <div class="text-[12px] text-[#5A6A78] truncate">{{ roleLabel }}</div>
            </div>
            <button
              type="button"
              class="px-3 py-2 rounded-[10px] text-[13px] font-medium text-[#0A1520] hover:bg-black/[0.04] inline-flex items-center gap-1.5"
              @click="logout"
            >
              <UIcon name="i-lucide-log-out" class="size-4" />
              Uitloggen
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from .absolute:last-child,
.slide-up-leave-to .absolute:last-child {
  transform: translateY(100%);
}
.slide-up-enter-from, .slide-up-leave-to {
  opacity: 0;
}
</style>
