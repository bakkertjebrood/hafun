<script setup lang="ts">
definePageMeta({ layout: false })

useHead({ title: 'Privacybeleid — Nautar' })

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
        Privacybeleid
      </h1>
      <p class="mt-2 text-sm text-[#5A6A78]">
        Laatst bijgewerkt: {{ lastUpdated }}
      </p>

      <div class="prose prose-slate max-w-none mt-8 text-[15px] leading-relaxed text-[#2D3E4A]">
        <p>
          Nautar (hierna "wij", "ons" of "Nautar") respecteert je privacy en verwerkt persoonsgegevens
          uitsluitend in overeenstemming met de Algemene Verordening Gegevensbescherming (AVG/GDPR).
          In dit privacybeleid leggen we uit welke gegevens we verzamelen, waarvoor we ze gebruiken en
          welke rechten je hebt.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          1. Wie is verantwoordelijk?
        </h2>
        <p>
          Verwerkingsverantwoordelijke voor de verwerking van persoonsgegevens via deze applicatie is
          Nautar. Voor vragen over privacy kun je contact opnemen via
          <a
            href="mailto:privacy@nautar.app"
            class="text-primary-600 hover:text-primary-700 underline"
          >privacy@nautar.app</a>.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          2. Welke gegevens verzamelen we?
        </h2>
        <ul class="list-disc pl-6 space-y-1.5">
          <li><strong>Accountgegevens:</strong> naam, e-mailadres, profielfoto (bij Google login), versleuteld wachtwoord, rol en taalvoorkeur.</li>
          <li><strong>Havengegevens:</strong> naam van je haven, locatie, instellingen en configuratie.</li>
          <li><strong>Operationele data:</strong> ligplaatsen, huurders, boten, reserveringen, facturen, agenda, werkbonnen, kassa-transacties en mutatielogs die je in de applicatie invoert.</li>
          <li><strong>Technische gegevens:</strong> IP-adres, browsertype, sessiecookies en logbestanden voor beveiliging en foutopsporing.</li>
        </ul>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          3. Waarvoor gebruiken we deze gegevens?
        </h2>
        <ul class="list-disc pl-6 space-y-1.5">
          <li>Om je toegang te geven tot de Nautar-applicatie en de functionaliteit te leveren.</li>
          <li>Om transactionele e-mails te versturen (bijv. accountbevestiging, factuurherinneringen).</li>
          <li>Om de dienst te beveiligen, fouten op te sporen en misbruik te voorkomen.</li>
          <li>Om aan onze wettelijke verplichtingen te voldoen (bijv. fiscale bewaartermijnen).</li>
        </ul>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          4. Wettelijke grondslag
        </h2>
        <p>
          Wij verwerken persoonsgegevens op basis van de uitvoering van de overeenkomst die we met je
          haven sluiten, op basis van een wettelijke verplichting, of op basis van ons gerechtvaardigd
          belang om de dienst te leveren en te beveiligen. Voor optionele communicatie vragen we je
          expliciete toestemming.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          5. Met wie delen we gegevens?
        </h2>
        <p>
          We delen gegevens uitsluitend met verwerkers die wij inschakelen om de dienst te leveren:
        </p>
        <ul class="list-disc pl-6 space-y-1.5">
          <li><strong>Heroku</strong> — hosting van de applicatie en database.</li>
          <li><strong>Postmark</strong> — verzending van transactionele e-mails.</li>
          <li><strong>Google</strong> — voor zover je inlogt met Google ontvangt Google een login-event.</li>
          <li><strong>Moneybird</strong> (optioneel) — synchronisatie van facturen, alleen wanneer je dit zelf koppelt.</li>
        </ul>
        <p>
          Met al deze partijen hebben wij verwerkersovereenkomsten waarin geheimhouding en beveiliging
          worden geregeld. Wij verkopen je gegevens nooit aan derden.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          6. Hoe lang bewaren we gegevens?
        </h2>
        <p>
          Accountgegevens bewaren wij zolang je account actief is. Operationele gegevens bewaren we
          zolang nodig is voor de dienstverlening en de wettelijke bewaartermijn (zoals de fiscale
          bewaarplicht van 7 jaar voor administratie). Bij opzegging worden gegevens geanonimiseerd of
          verwijderd, behalve waar wettelijke verplichtingen anders vereisen.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          7. Beveiliging
        </h2>
        <p>
          We nemen passende technische en organisatorische maatregelen om je gegevens te beschermen:
          versleutelde verbindingen (HTTPS), gehashte wachtwoorden, toegangscontrole en logging.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          8. Cookies
        </h2>
        <p>
          Nautar plaatst alleen functionele cookies die nodig zijn om in te loggen en je sessie te
          onthouden. Wij gebruiken geen tracking- of advertentiecookies.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          9. Jouw rechten
        </h2>
        <p>
          Je hebt het recht op inzage, correctie, verwijdering, beperking, bezwaar en dataportabiliteit
          van je persoonsgegevens. Stuur een verzoek naar
          <a
            href="mailto:privacy@nautar.app"
            class="text-primary-600 hover:text-primary-700 underline"
          >privacy@nautar.app</a>.
          Je hebt ook het recht een klacht in te dienen bij de Autoriteit Persoonsgegevens.
        </p>

        <h2 class="text-xl font-semibold text-[#0A1520] mt-8 mb-3">
          10. Wijzigingen
        </h2>
        <p>
          We kunnen dit privacybeleid aanpassen. Wijzigingen publiceren we op deze pagina en bij
          ingrijpende wijzigingen informeren we je via e-mail.
        </p>
      </div>

      <div class="mt-12 pt-6 border-t border-black/[0.06] flex flex-wrap gap-4 text-sm text-[#5A6A78]">
        <NuxtLink
          to="/voorwaarden"
          class="hover:text-[#0A1520]"
        >Algemene voorwaarden</NuxtLink>
        <NuxtLink
          to="/"
          class="hover:text-[#0A1520]"
        >Terug naar home</NuxtLink>
      </div>
    </main>
  </div>
</template>
