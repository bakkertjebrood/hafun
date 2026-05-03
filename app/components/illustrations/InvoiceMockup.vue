<template>
  <svg viewBox="0 0 320 380" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <!-- Documentvel met lichte schaduw -->
    <rect x="14" y="20" width="296" height="356" rx="14" fill="#0A1520" opacity="0.06"/>
    <rect x="10" y="14" width="296" height="356" rx="14" fill="white" stroke="#0A1520" stroke-opacity="0.08"/>

    <!-- Logo + factuurnr -->
    <circle cx="36" cy="44" r="12" fill="#00A9A5" opacity="0.15"/>
    <path d="M28 44 Q34 38 40 44 T52 44" stroke="#00A9A5" stroke-width="2" fill="none" stroke-linecap="round"/>
    <text x="58" y="42" font-family="ui-sans-serif, system-ui" font-size="11" font-weight="700" fill="#0A1520">Jachthaven Wadden</text>
    <text x="58" y="56" font-family="ui-sans-serif, system-ui" font-size="9" fill="#5A6A78">Factuur 2026-014</text>

    <text x="296" y="42" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="#5A6A78" text-anchor="end" letter-spacing="0.4">VERVALT</text>
    <text x="296" y="56" font-family="ui-sans-serif, system-ui" font-size="11" font-weight="700" fill="#0A1520" text-anchor="end">31 mei 2026</text>

    <!-- Klantblok -->
    <rect x="26" y="80" width="120" height="48" rx="8" fill="#F4F7F8"/>
    <text x="38" y="98" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="#5A6A78" letter-spacing="0.4">AAN</text>
    <text x="38" y="114" font-family="ui-sans-serif, system-ui" font-size="11" font-weight="700" fill="#0A1520">A. de Boer</text>
    <text x="38" y="126" font-family="ui-sans-serif, system-ui" font-size="9" fill="#5A6A78">Schiedam</text>

    <!-- Regels -->
    <line x1="26" y1="148" x2="296" y2="148" stroke="#0A1520" stroke-opacity="0.08"/>
    <text x="26" y="166" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="#5A6A78" letter-spacing="0.4">OMSCHRIJVING</text>
    <text x="296" y="166" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="#5A6A78" letter-spacing="0.4" text-anchor="end">BEDRAG</text>
    <line x1="26" y1="172" x2="296" y2="172" stroke="#0A1520" stroke-opacity="0.08"/>

    <text x="26" y="194" font-family="ui-sans-serif, system-ui" font-size="11" fill="#0A1520">Jaarplaats A14 — 2026</text>
    <text x="296" y="194" font-family="ui-sans-serif, system-ui" font-size="11" fill="#0A1520" text-anchor="end">€ 1.870,00</text>

    <text x="26" y="218" font-family="ui-sans-serif, system-ui" font-size="11" fill="#0A1520">Stroomverbruik Q1</text>
    <text x="296" y="218" font-family="ui-sans-serif, system-ui" font-size="11" fill="#0A1520" text-anchor="end">€ 84,30</text>

    <text x="26" y="242" font-family="ui-sans-serif, system-ui" font-size="11" fill="#0A1520">Werkopdracht 2026-08</text>
    <text x="296" y="242" font-family="ui-sans-serif, system-ui" font-size="11" fill="#0A1520" text-anchor="end">€ 142,00</text>

    <text x="26" y="266" font-family="ui-sans-serif, system-ui" font-size="11" fill="#22C55E">↪ Credit onderverhuur (12-26 jul)</text>
    <text x="296" y="266" font-family="ui-sans-serif, system-ui" font-size="11" fill="#22C55E" text-anchor="end">− € 195,00</text>

    <line x1="26" y1="282" x2="296" y2="282" stroke="#0A1520" stroke-opacity="0.08"/>

    <text x="26" y="304" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="#5A6A78" letter-spacing="0.4">TE BETALEN</text>
    <text x="296" y="306" font-family="ui-sans-serif, system-ui" font-size="20" font-weight="700" fill="#0A1520" text-anchor="end">€ 1.901,30</text>

    <!-- Pay-link badge -->
    <rect x="26" y="324" width="120" height="32" rx="16" fill="#00A9A5"/>
    <text x="86" y="344" font-family="ui-sans-serif, system-ui" font-size="11" font-weight="700" fill="white" text-anchor="middle">Betaal online</text>

    <!-- Moneybird-link -->
    <text x="158" y="343" font-family="ui-sans-serif, system-ui" font-size="9" fill="#5A6A78">↻ gesynct met Moneybird</text>
  </svg>
</template>
