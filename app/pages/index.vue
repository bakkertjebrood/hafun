<script setup lang="ts">
definePageMeta({
  layout: false
})

const features = [
  {
    icon: 'i-lucide-map',
    title: 'Slimme havenkaart',
    desc: 'Teken je steigers één keer in. Drag-and-drop ligplaatsen, bezetting in kleur, TV-modus voor de havenmeester.'
  },
  {
    icon: 'i-lucide-calendar-check',
    title: 'Reserveringen & wachtlijst',
    desc: 'Vaste huurders, passanten en wachtlijst. Met automatische plaatsing en notificaties.'
  },
  {
    icon: 'i-lucide-receipt',
    title: 'Facturatie & Moneybird',
    desc: 'Facturen, deelbetalingen, herinneringen en directe sync met je boekhouding.'
  },
  {
    icon: 'i-lucide-shopping-cart',
    title: 'Kassa, standen & werkbonnen',
    desc: 'POS, meterstanden, werkorders en mutatielog — alles in één scherm voor je hele team.'
  },
  {
    icon: 'i-lucide-file-text',
    title: 'Offertes & contracten',
    desc: 'Offertes met line-items, doorzetten naar contract en factuur in één klik.'
  },
  {
    icon: 'i-lucide-users',
    title: 'Huurdersportaal',
    desc: 'Eigen login voor je huurders: facturen, gegevens, ligplaats. Minder telefoontjes.'
  }
]

const steps = [
  { n: '01', title: 'Maak een account', desc: 'Registreer in 30 seconden. Geen creditcard nodig voor de proef.' },
  { n: '02', title: 'Teken je haven', desc: 'AI herkent steigers en plaatst je ligplaatsen automatisch op de kaart.' },
  { n: '03', title: 'Begin met beheren', desc: 'Importeer huurders, koppel boekhouding, en je bent live.' }
]
</script>

<template>
  <div class="min-h-[100dvh] bg-white text-[#0A1520]">
    <!-- Header -->
    <header class="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-black/[0.05]">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center">
          <NautarLogo :size="20" />
        </NuxtLink>
        <nav class="hidden md:flex items-center gap-7 text-sm font-medium text-[#2D3E4A]">
          <a href="#features" class="hover:text-[#0A1520] transition-colors">Functionaliteit</a>
          <a href="#hoe" class="hover:text-[#0A1520] transition-colors">Zo werkt het</a>
          <a href="#prijzen" class="hover:text-[#0A1520] transition-colors">Prijzen</a>
        </nav>
        <div class="flex items-center gap-2">
          <NuxtLink
            to="/login"
            class="hidden sm:inline-flex px-4 py-2 rounded-full text-sm font-semibold text-[#0A1520] hover:bg-black/[0.04] transition-colors"
          >
            Inloggen
          </NuxtLink>
          <NuxtLink
            to="/register"
            class="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            Start gratis
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Hero -->
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 -z-10 bg-gradient-to-b from-primary-50 via-white to-white" />
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-20 lg:py-28 text-center">
        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 text-primary-700 text-xs font-semibold tracking-wide">
          <span class="size-1.5 rounded-full bg-primary-500" />
          Marina management, op stroom
        </span>
        <h1 class="mt-6 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
          De rustigste manier<br>
          om je <span class="text-primary-500">jachthaven</span> te runnen.
        </h1>
        <p class="mt-6 max-w-2xl mx-auto text-base sm:text-lg text-[#2D3E4A] leading-relaxed">
          Eén systeem voor ligplaatsen, huurders, facturen, kassa en meer. Gebouwd door en voor havenmeesters in Nederland.
        </p>
        <div class="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
          <NuxtLink
            to="/register"
            class="w-full sm:w-auto px-6 h-12 inline-flex items-center justify-center gap-2 rounded-full bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            Start gratis proefperiode
            <UIcon name="i-lucide-arrow-right" class="size-4" />
          </NuxtLink>
          <NuxtLink
            to="/login"
            class="w-full sm:w-auto px-6 h-12 inline-flex items-center justify-center rounded-full bg-white border border-black/[0.08] text-sm font-semibold text-[#0A1520] hover:bg-[#F4F7F8] transition-colors"
          >
            Ik heb al een account
          </NuxtLink>
        </div>
        <p class="mt-4 text-xs text-[#5A6A78]">Geen creditcard nodig · Setup in 5 minuten · Nederlands</p>
      </div>
    </section>

    <!-- Features -->
    <section id="features" class="max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
      <div class="text-center max-w-2xl mx-auto mb-12">
        <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight">Alles wat je haven nodig heeft</h2>
        <p class="mt-3 text-[#2D3E4A]">Van ligplaatsindeling tot facturatie. Geen losse losse Excels meer.</p>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="f in features"
          :key="f.title"
          class="bg-white border border-black/[0.06] rounded-[18px] p-6 hover:border-primary-500/30 hover:shadow-[0_4px_20px_rgba(0,169,165,0.08)] transition-all"
        >
          <div class="size-10 rounded-[10px] bg-primary-500/10 text-primary-600 flex items-center justify-center mb-4">
            <UIcon :name="f.icon" class="size-5" />
          </div>
          <h3 class="text-base font-semibold tracking-tight">{{ f.title }}</h3>
          <p class="mt-1.5 text-sm text-[#2D3E4A] leading-relaxed">{{ f.desc }}</p>
        </div>
      </div>
    </section>

    <!-- How it works -->
    <section id="hoe" class="bg-[#F4F7F8] py-16 lg:py-24">
      <div class="max-w-6xl mx-auto px-4 sm:px-6">
        <div class="text-center max-w-2xl mx-auto mb-12">
          <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight">Live in één middag</h2>
          <p class="mt-3 text-[#2D3E4A]">Onze AI doet het zware werk. Jij bevestigt en bent klaar.</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div
            v-for="s in steps"
            :key="s.n"
            class="bg-white border border-black/[0.06] rounded-[18px] p-6"
          >
            <div class="text-xs font-mono font-semibold text-primary-500 mb-2">{{ s.n }}</div>
            <h3 class="text-lg font-semibold tracking-tight">{{ s.title }}</h3>
            <p class="mt-1.5 text-sm text-[#2D3E4A] leading-relaxed">{{ s.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="prijzen" class="max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
      <div class="text-center max-w-2xl mx-auto mb-12">
        <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight">Eerlijke prijs. Geen verrassingen.</h2>
        <p class="mt-3 text-[#2D3E4A]">Eén tarief per haven, ongeacht het aantal medewerkers.</p>
      </div>
      <div class="max-w-md mx-auto bg-white border border-primary-500/30 rounded-[20px] p-8 shadow-[0_8px_40px_rgba(0,169,165,0.10)]">
        <div class="text-xs font-semibold uppercase tracking-widest text-primary-600">Nautar Compleet</div>
        <div class="mt-3 flex items-baseline gap-1">
          <span class="text-5xl font-semibold tracking-tight">€89</span>
          <span class="text-[#5A6A78] text-sm">/ maand · per haven</span>
        </div>
        <p class="mt-2 text-sm text-[#2D3E4A]">Inclusief alle modules, onbeperkt gebruikers, Moneybird-koppeling en e-mailsupport.</p>
        <ul class="mt-6 space-y-3 text-sm">
          <li v-for="t in ['Onbeperkt ligplaatsen & huurders','Reserveringen, wachtlijst, agenda','Offertes, werkbonnen, kassa','Facturatie + Moneybird sync','Huurdersportaal','Mutatielog & dagafsluiting']" :key="t" class="flex gap-2.5 items-start">
            <UIcon name="i-lucide-check" class="size-5 text-primary-500 shrink-0" />
            <span>{{ t }}</span>
          </li>
        </ul>
        <NuxtLink
          to="/register"
          class="mt-7 w-full h-12 inline-flex items-center justify-center rounded-full bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          Begin gratis proefperiode
        </NuxtLink>
        <p class="mt-3 text-center text-xs text-[#5A6A78]">30 dagen gratis · maandelijks opzegbaar</p>
      </div>
    </section>

    <!-- CTA -->
    <section class="bg-[#0A1520] text-white">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-16 lg:py-20 text-center">
        <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight">Klaar om te beginnen?</h2>
        <p class="mt-3 text-white/70 max-w-xl mx-auto">Sluit je aan bij havens die hun administratie en service hebben gestroomlijnd met Nautar.</p>
        <div class="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
          <NuxtLink
            to="/register"
            class="w-full sm:w-auto px-6 h-12 inline-flex items-center justify-center gap-2 rounded-full bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            Account aanmaken
            <UIcon name="i-lucide-arrow-right" class="size-4" />
          </NuxtLink>
          <NuxtLink
            to="/login"
            class="w-full sm:w-auto px-6 h-12 inline-flex items-center justify-center rounded-full bg-white/10 border border-white/20 text-sm font-semibold text-white hover:bg-white/15 transition-colors"
          >
            Inloggen
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-black/[0.06]">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#5A6A78]">
        <div class="flex items-center gap-2">
          <NautarMark :size="20" />
          <span>© {{ new Date().getFullYear() }} Nautar. Alle rechten voorbehouden.</span>
        </div>
        <div class="flex gap-5">
          <NuxtLink to="/login" class="hover:text-[#0A1520]">Inloggen</NuxtLink>
          <NuxtLink to="/register" class="hover:text-[#0A1520]">Registreren</NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>
