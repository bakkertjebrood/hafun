<script setup lang="ts">
definePageMeta({ layout: false })

useHead({ title: 'Algemene voorwaarden — Nautar' })

const lastUpdated = '3 mei 2026'
</script>

<template>
  <div class="min-h-[100dvh] bg-white text-[#0A1520]">
    <header class="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-black/[0.05]">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <NuxtLink
          to="/"
          class="flex items-center"
        >
          <NautarLogo :size="20" />
        </NuxtLink>
        <NuxtLink
          to="/login"
          class="text-sm font-semibold text-[#0A1520] hover:text-primary-600"
        >Inloggen</NuxtLink>
      </div>
    </header>

    <main class="max-w-3xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
      <h1 class="text-3xl sm:text-4xl font-semibold tracking-tight">
        Algemene voorwaarden
      </h1>
      <p class="mt-2 text-sm text-[#5A6A78]">
        Laatst bijgewerkt: {{ lastUpdated }}
      </p>

      <div class="prose prose-slate max-w-none mt-8 text-[15px] leading-relaxed text-[#2D3E4A]">
        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          1. Definities
        </h2>
        <p>
          In deze voorwaarden betekenen: <strong>Nautar</strong> de aanbieder van de SaaS-applicatie voor
          jachthavenbeheer; <strong>Klant</strong> de natuurlijke of rechtspersoon die een abonnement
          afsluit; <strong>Dienst</strong> de online applicatie en bijbehorende functionaliteit;
          <strong>Account</strong> de toegang van een gebruiker tot de Dienst.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          2. Toepasselijkheid
        </h2>
        <p>
          Deze voorwaarden zijn van toepassing op elk gebruik van Nautar en op elke overeenkomst tussen
          Nautar en de Klant. Door een account aan te maken aanvaardt de Klant deze voorwaarden.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          3. Proefperiode en abonnement
        </h2>
        <p>
          Nieuwe Klanten krijgen een gratis proefperiode van 30 dagen. Daarna gaat het abonnement
          automatisch over in een betaald abonnement, tenzij de Klant voor afloop opzegt. Het abonnement
          wordt maandelijks gefactureerd op basis van het op dat moment geldende tarief, dat is
          gepubliceerd op nautar.app.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          4. Betaling
        </h2>
        <p>
          Facturen dienen binnen 14 dagen na factuurdatum te worden voldaan. Bij niet-tijdige betaling
          kan Nautar de toegang tot de Dienst opschorten na een herinnering en redelijke termijn.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          5. Gebruik van de Dienst
        </h2>
        <p>
          De Klant gebruikt de Dienst op een manier die niet in strijd is met de wet of de rechten van
          derden. De Klant is verantwoordelijk voor de juistheid van de ingevoerde gegevens en voor het
          beheer van de gebruikersaccounts binnen zijn organisatie. Het delen van inloggegevens is niet
          toegestaan.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          6. Beschikbaarheid en onderhoud
        </h2>
        <p>
          Nautar streeft naar een hoge beschikbaarheid van de Dienst, maar geeft geen garantie op
          ononderbroken beschikbaarheid. Onderhoud wordt waar mogelijk vooraf aangekondigd en buiten
          kantoortijden uitgevoerd.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          7. Gegevens en eigendom
        </h2>
        <p>
          Alle gegevens die de Klant in de Dienst invoert blijven eigendom van de Klant. Nautar verwerkt
          deze gegevens uitsluitend voor het leveren van de Dienst, conform het
          <NuxtLink
            to="/privacy"
            class="text-primary-600 hover:text-primary-700 underline"
          >privacybeleid</NuxtLink>.
          De Klant kan op elk moment een export van zijn gegevens opvragen.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          8. Aansprakelijkheid
        </h2>
        <p>
          De aansprakelijkheid van Nautar voor directe schade is beperkt tot het bedrag dat de Klant in
          de drie maanden voor het schadeveroorzakende voorval voor de Dienst heeft betaald. Nautar is
          niet aansprakelijk voor indirecte schade, gederfde winst of gevolgschade. De aansprakelijkheid
          is niet beperkt bij opzet of grove schuld.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          9. Opzegging
        </h2>
        <p>
          De Klant kan het abonnement op elk moment opzeggen via de instellingen of door contact op te
          nemen met support. De opzegging gaat in aan het einde van de lopende maand. Reeds betaalde
          bedragen worden niet gerestitueerd.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          10. Wijzigingen
        </h2>
        <p>
          Nautar mag deze voorwaarden wijzigen. Wijzigingen worden ten minste 30 dagen voor
          inwerkingtreding aangekondigd via e-mail of via de applicatie. Wanneer de Klant niet akkoord
          is met de wijzigingen, kan hij het abonnement opzeggen voor de ingangsdatum.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          11. Toepasselijk recht
        </h2>
        <p>
          Op deze voorwaarden is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de
          bevoegde rechter in het arrondissement waar Nautar is gevestigd, tenzij dwingend recht anders
          bepaalt.
        </p>
      </div>

      <div class="mt-12 pt-6 border-t border-black/[0.06] flex flex-wrap gap-4 text-sm text-[#5A6A78]">
        <NuxtLink
          to="/privacy"
          class="hover:text-[#0A1520]"
        >Privacybeleid</NuxtLink>
        <NuxtLink
          to="/"
          class="hover:text-[#0A1520]"
        >Terug naar home</NuxtLink>
      </div>
    </main>
  </div>
</template>
