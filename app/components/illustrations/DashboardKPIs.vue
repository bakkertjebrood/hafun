<template>
  <svg viewBox="0 0 480 320" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <!-- Browser-frame -->
    <rect width="480" height="320" rx="14" fill="white" stroke="#0A1520" stroke-opacity="0.08" stroke-width="1"/>
    <rect x="0" y="0" width="480" height="36" rx="14" fill="#F4F7F8"/>
    <rect x="0" y="22" width="480" height="14" fill="#F4F7F8"/>
    <circle cx="16" cy="18" r="4" fill="#FF6058"/>
    <circle cx="32" cy="18" r="4" fill="#FFBD2E"/>
    <circle cx="48" cy="18" r="4" fill="#28C940"/>
    <rect x="200" y="11" width="200" height="14" rx="7" fill="white"/>

    <!-- Sidebar -->
    <rect x="0" y="36" width="56" height="284" fill="#0A1520"/>
    <g fill="white" opacity="0.7">
      <circle cx="28" cy="60" r="3"/>
      <circle cx="28" cy="80" r="3"/>
      <circle cx="28" cy="100" r="3"/>
      <circle cx="28" cy="120" r="3"/>
      <circle cx="28" cy="140" r="3"/>
    </g>
    <rect x="14" y="55" width="28" height="10" rx="3" fill="#00A9A5"/>

    <!-- Header titel -->
    <text x="76" y="70" font-family="ui-sans-serif, system-ui" font-size="14" font-weight="700" fill="#0A1520">Overzicht</text>
    <text x="76" y="86" font-family="ui-sans-serif, system-ui" font-size="10" fill="#5A6A78">Vandaag · 18 mei</text>

    <!-- KPI cards -->
    <g>
      <!-- Bezetting -->
      <rect x="76" y="106" width="92" height="74" rx="10" fill="#F4F7F8"/>
      <text x="86" y="124" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="#5A6A78" letter-spacing="0.4">BEZET</text>
      <text x="86" y="148" font-family="ui-sans-serif, system-ui" font-size="20" font-weight="700" fill="#0A1520">87%</text>
      <polyline points="86,168 96,162 106,166 116,158 126,160 136,154 146,156 156,150" stroke="#00A9A5" stroke-width="1.6" fill="none" stroke-linecap="round"/>

      <!-- Open facturen -->
      <rect x="180" y="106" width="92" height="74" rx="10" fill="#F4F7F8"/>
      <text x="190" y="124" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="#5A6A78" letter-spacing="0.4">OPEN</text>
      <text x="190" y="148" font-family="ui-sans-serif, system-ui" font-size="20" font-weight="700" fill="#0A1520">€ 4.2k</text>
      <rect x="190" y="158" width="48" height="6" rx="3" fill="#F59E0B"/>
      <rect x="190" y="158" width="32" height="6" rx="3" fill="#F59E0B" opacity="0.5"/>

      <!-- Wachtlijst -->
      <rect x="284" y="106" width="92" height="74" rx="10" fill="#F4F7F8"/>
      <text x="294" y="124" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="#5A6A78" letter-spacing="0.4">WACHTLIJST</text>
      <text x="294" y="148" font-family="ui-sans-serif, system-ui" font-size="20" font-weight="700" fill="#0A1520">23</text>
      <text x="294" y="170" font-family="ui-sans-serif, system-ui" font-size="9" fill="#22C55E">+3 deze week</text>

      <!-- Passanten -->
      <rect x="388" y="106" width="80" height="74" rx="10" fill="#00A9A5"/>
      <text x="398" y="124" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="white" letter-spacing="0.4" opacity="0.7">PASSANTEN</text>
      <text x="398" y="148" font-family="ui-sans-serif, system-ui" font-size="20" font-weight="700" fill="white">12</text>
      <text x="398" y="170" font-family="ui-sans-serif, system-ui" font-size="9" fill="white" opacity="0.7">vandaag in</text>
    </g>

    <!-- Lijst-blok -->
    <rect x="76" y="200" width="392" height="100" rx="10" fill="#F4F7F8"/>
    <text x="88" y="220" font-family="ui-sans-serif, system-ui" font-size="11" font-weight="700" fill="#0A1520">Komt vandaag aan</text>
    <g>
      <circle cx="98" cy="240" r="8" fill="#00A9A5"/>
      <text x="98" y="244" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="white" text-anchor="middle">JD</text>
      <text x="116" y="240" font-family="ui-sans-serif, system-ui" font-size="11" fill="#0A1520">Jaap de Boer · A14 · 14:00</text>
      <rect x="380" y="234" width="62" height="14" rx="7" fill="#22C55E" opacity="0.15"/>
      <text x="411" y="244" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="#15803D" text-anchor="middle">betaald</text>
    </g>
    <g>
      <circle cx="98" cy="266" r="8" fill="#F59E0B"/>
      <text x="98" y="270" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="white" text-anchor="middle">M</text>
      <text x="116" y="266" font-family="ui-sans-serif, system-ui" font-size="11" fill="#0A1520">Mol — passant via QR · B6 · 16:30</text>
      <rect x="380" y="260" width="62" height="14" rx="7" fill="#0A1520" opacity="0.08"/>
      <text x="411" y="270" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="#0A1520" text-anchor="middle">QR</text>
    </g>
    <line x1="88" y1="252" x2="456" y2="252" stroke="#0A1520" stroke-opacity="0.06" stroke-width="1"/>
    <line x1="88" y1="278" x2="456" y2="278" stroke="#0A1520" stroke-opacity="0.06" stroke-width="1"/>
    <text x="88" y="294" font-family="ui-sans-serif, system-ui" font-size="9" fill="#5A6A78">+ 5 meer</text>
  </svg>
</template>
