<template>
  <svg viewBox="0 0 240 380" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <!-- Phone frame -->
    <rect x="20" y="10" width="200" height="360" rx="28" fill="#0A1520"/>
    <rect x="26" y="16" width="188" height="348" rx="22" fill="white"/>
    <!-- Notch -->
    <rect x="98" y="20" width="44" height="6" rx="3" fill="#0A1520"/>
    <!-- Status bar -->
    <text x="40" y="42" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="#0A1520">9:41</text>

    <!-- App header -->
    <text x="40" y="72" font-family="ui-sans-serif, system-ui" font-size="11" fill="#5A6A78">Welkom terug,</text>
    <text x="40" y="90" font-family="ui-sans-serif, system-ui" font-size="16" font-weight="700" fill="#0A1520">Anneke</text>

    <!-- Card: Mijn ligplaats -->
    <rect x="36" y="104" width="168" height="78" rx="12" fill="#EAF2F4"/>
    <text x="48" y="124" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="#5A6A78" letter-spacing="0.4">JOUW LIGPLAATS</text>
    <text x="48" y="146" font-family="ui-sans-serif, system-ui" font-size="18" font-weight="700" fill="#0A1520">A14</text>
    <text x="48" y="164" font-family="ui-sans-serif, system-ui" font-size="10" fill="#5A6A78">Steiger A · 12 m</text>
    <!-- Bootje-icoontje -->
    <g transform="translate(160 130)">
      <path d="M0 16 L24 16 L20 24 L4 24 Z" fill="white" stroke="#00A9A5" stroke-width="1.5"/>
      <line x1="12" y1="2" x2="12" y2="16" stroke="#00A9A5" stroke-width="1.5"/>
      <path d="M12 2 L20 16 L12 16 Z" fill="#F4ECDC" stroke="#00A9A5" stroke-width="1.2"/>
    </g>

    <!-- Card: Open factuur -->
    <rect x="36" y="194" width="168" height="58" rx="12" fill="white" stroke="#0A1520" stroke-opacity="0.08"/>
    <text x="48" y="214" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="#5A6A78" letter-spacing="0.4">FACTUUR 2026-014</text>
    <text x="48" y="234" font-family="ui-sans-serif, system-ui" font-size="14" font-weight="700" fill="#0A1520">€ 412,50</text>
    <rect x="138" y="218" width="58" height="22" rx="11" fill="#00A9A5"/>
    <text x="167" y="232" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="white" text-anchor="middle">Betaal</text>

    <!-- Card: Boot is even weg -->
    <rect x="36" y="264" width="168" height="60" rx="12" fill="#FFF8E6" stroke="#F59E0B" stroke-opacity="0.4"/>
    <g transform="translate(46 274)">
      <circle cx="10" cy="10" r="10" fill="#F59E0B"/>
      <text x="10" y="14" font-family="ui-sans-serif, system-ui" font-size="11" font-weight="700" fill="white" text-anchor="middle">!</text>
    </g>
    <text x="76" y="284" font-family="ui-sans-serif, system-ui" font-size="10" font-weight="700" fill="#0A1520">Boot even weg?</text>
    <text x="76" y="298" font-family="ui-sans-serif, system-ui" font-size="9" fill="#5A6A78">Meld je vakantieperiode</text>
    <text x="76" y="312" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="#00A9A5">Melden →</text>

    <!-- Bottom dock -->
    <line x1="50" y1="346" x2="190" y2="346" stroke="#0A1520" stroke-opacity="0.08"/>
    <circle cx="116" cy="356" r="3" fill="#00A9A5"/>
    <circle cx="124" cy="356" r="3" fill="#0A1520" opacity="0.2"/>
  </svg>
</template>
