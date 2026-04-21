<script setup lang="ts">
const mobileMenuOpen = ref(false)
const route = useRoute()

const navigation = [
  { label: 'Overzicht', icon: 'i-lucide-layout-dashboard', to: '/dashboard' },
  { label: 'Kaart', icon: 'i-lucide-map', to: '/dashboard/map' },
  { label: 'Reserveringen', icon: 'i-lucide-calendar-check', to: '/dashboard/bookings' },
  { label: 'Huurders', icon: 'i-lucide-users', to: '/dashboard/customers' },
  { label: 'Facturatie', icon: 'i-lucide-receipt', to: '/dashboard/financial' },
  { label: 'Meldingen', icon: 'i-lucide-bell', to: '/dashboard/notifications' }
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
          class="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors"
          active-class="bg-primary-500/10 text-[#0A1520] font-semibold"
          inactive-class="text-[#5A6A78] hover:bg-black/[0.04]"
        >
          <UIcon :name="item.icon" class="size-[18px]" />
          {{ item.label }}
        </NuxtLink>
      </nav>
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

    <!-- Mobile Header -->
    <div class="lg:hidden fixed top-0 left-0 right-0 z-[900] bg-white/95 backdrop-blur-sm border-b border-black/[0.08]">
      <div class="flex items-center justify-between px-4 h-14">
        <NautarLogo :size="16" />
        <div class="w-8 h-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-[12px] font-semibold">
          EB
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
            class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors text-[#5A6A78]"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <UIcon :name="item.icon" class="size-6" />
            <span class="text-[10px] font-medium">{{ item.label }}</span>
          </button>
          <NuxtLink
            v-else
            :to="item.to"
            class="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors"
            active-class="text-primary-500"
            inactive-class="text-[#5A6A78]"
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
          class="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] pb-8 safe-bottom"
          @click.stop
        >
          <div class="w-10 h-1 rounded-full bg-black/10 mx-auto mt-3 mb-4" />
          <nav class="px-4 flex flex-col gap-1">
            <NuxtLink
              v-for="item in navigation"
              :key="item.to"
              :to="item.to"
              class="flex items-center gap-3 px-4 py-3.5 rounded-[12px] text-[15px] font-medium transition-colors"
              active-class="bg-primary-500/10 text-[#0A1520] font-semibold"
              inactive-class="text-[#5A6A78]"
              @click="mobileMenuOpen = false"
            >
              <UIcon :name="item.icon" class="size-5" />
              {{ item.label }}
            </NuxtLink>
          </nav>
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
