<template>
  <svg viewBox="0 0 720 380" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <!-- Achtergrond / water -->
    <rect width="720" height="380" rx="18" fill="#EAF2F4"/>
    <path d="M0 0 H720 V120 Q540 140 360 120 T0 130 Z" fill="#F4ECDC" opacity="0.6"/>
    <path d="M620 230 Q700 250 720 290 V380 H560 Q580 310 620 230 Z" fill="#F4ECDC" opacity="0.7"/>
    <!-- Watergolfjes -->
    <path d="M40 180 Q90 174 140 180 T240 180" stroke="#7FB6BD" stroke-width="1.4" fill="none" opacity="0.5"/>
    <path d="M260 230 Q310 224 360 230 T460 230" stroke="#7FB6BD" stroke-width="1.4" fill="none" opacity="0.5"/>
    <path d="M380 320 Q430 314 480 320 T580 320" stroke="#7FB6BD" stroke-width="1.4" fill="none" opacity="0.5"/>

    <!-- Steiger A: 8 berths, mix van statussen -->
    <g>
      <rect x="60" y="155" width="240" height="10" rx="2" fill="#0A1520" opacity="0.85"/>
      <text x="60" y="148" font-family="ui-sans-serif, system-ui" font-size="11" font-weight="700" fill="#0A1520">A</text>
      <!-- Boven: A1-A4 -->
      <rect x="68" y="128" width="44" height="22" rx="3" fill="#3B82F6"/>
      <rect x="120" y="128" width="44" height="22" rx="3" fill="#3B82F6"/>
      <rect x="172" y="128" width="44" height="22" rx="3" fill="#A855F7"/> <!-- sublet -->
      <rect x="224" y="128" width="44" height="22" rx="3" fill="#22C55E"/>
      <!-- Onder: A5-A8 -->
      <rect x="68" y="170" width="44" height="22" rx="3" fill="#3B82F6"/>
      <rect x="120" y="170" width="44" height="22" rx="3" fill="#22C55E"/>
      <rect x="172" y="170" width="44" height="22" rx="3" fill="#F59E0B"/> <!-- passant -->
      <rect x="224" y="170" width="44" height="22" rx="3" fill="#3B82F6"/>
    </g>

    <!-- Steiger B: 6 berths -->
    <g>
      <rect x="340" y="200" width="200" height="10" rx="2" fill="#0A1520" opacity="0.85"/>
      <text x="340" y="193" font-family="ui-sans-serif, system-ui" font-size="11" font-weight="700" fill="#0A1520">B</text>
      <rect x="348" y="173" width="44" height="22" rx="3" fill="#3B82F6"/>
      <rect x="400" y="173" width="44" height="22" rx="3" fill="#22C55E"/>
      <rect x="452" y="173" width="44" height="22" rx="3" fill="#3B82F6"/>
      <rect x="348" y="215" width="44" height="22" rx="3" fill="#F59E0B"/>
      <rect x="400" y="215" width="44" height="22" rx="3" fill="#F59E0B"/>
      <rect x="452" y="215" width="44" height="22" rx="3" fill="#22C55E"/>
    </g>

    <!-- Steiger C: 4 berths -->
    <g>
      <rect x="60" y="290" width="160" height="10" rx="2" fill="#0A1520" opacity="0.85"/>
      <text x="60" y="283" font-family="ui-sans-serif, system-ui" font-size="11" font-weight="700" fill="#0A1520">C</text>
      <rect x="68" y="263" width="44" height="22" rx="3" fill="#3B82F6"/>
      <rect x="120" y="263" width="44" height="22" rx="3" fill="#A855F7"/>
      <rect x="68" y="305" width="44" height="22" rx="3" fill="#3B82F6"/>
      <rect x="120" y="305" width="44" height="22" rx="3" fill="#3B82F6"/>
    </g>

    <!-- Bootje aan A8 -->
    <g transform="translate(229 60)">
      <path d="M0 100 L34 100 L30 110 L4 110 Z" fill="white" stroke="#0A1520" stroke-width="1.5"/>
      <line x1="17" y1="80" x2="17" y2="100" stroke="#0A1520" stroke-width="1.5"/>
      <path d="M17 80 L29 100 L17 100 Z" fill="#F4ECDC" stroke="#0A1520" stroke-width="1.2"/>
    </g>

    <!-- Tooltip op A3 (sublet) -->
    <g transform="translate(180 50)">
      <rect width="180" height="62" rx="10" fill="white" stroke="#0A1520" stroke-width="1.5"/>
      <rect x="0" y="0" width="180" height="62" rx="10" fill="white"/>
      <rect x="0" y="0" width="6" height="62" fill="#A855F7" />
      <text x="14" y="20" font-family="ui-sans-serif, system-ui" font-size="11" font-weight="700" fill="#0A1520">A3 — Onderverhuur</text>
      <text x="14" y="36" font-family="ui-sans-serif, system-ui" font-size="10" fill="#5A6A78">Vaste plek vrijgegeven</text>
      <text x="14" y="50" font-family="ui-sans-serif, system-ui" font-size="10" fill="#5A6A78">12-26 juli · Smit</text>
      <path d="M40 62 L48 70 L56 62 Z" fill="white" stroke="#0A1520" stroke-width="1.5"/>
      <path d="M41 63 L55 63" stroke="white" stroke-width="2"/>
    </g>

    <!-- Legenda rechtsonder -->
    <g transform="translate(540 280)">
      <rect width="160" height="80" rx="10" fill="white" opacity="0.95" stroke="#0A1520" stroke-width="1" stroke-opacity="0.1"/>
      <g font-family="ui-sans-serif, system-ui" font-size="10" fill="#0A1520">
        <rect x="12" y="14" width="14" height="10" rx="2" fill="#3B82F6"/>
        <text x="32" y="23">Vast</text>
        <rect x="12" y="32" width="14" height="10" rx="2" fill="#22C55E"/>
        <text x="32" y="41">Vrij</text>
        <rect x="80" y="14" width="14" height="10" rx="2" fill="#F59E0B"/>
        <text x="100" y="23">Passant</text>
        <rect x="80" y="32" width="14" height="10" rx="2" fill="#A855F7"/>
        <text x="100" y="41">Sublet</text>
        <rect x="12" y="50" width="14" height="10" rx="2" fill="white" stroke="#0A1520" stroke-width="1" stroke-opacity="0.3"/>
        <text x="32" y="59">Leeg</text>
      </g>
    </g>

    <!-- Tellers links bovenin -->
    <g transform="translate(28 28)">
      <rect width="120" height="40" rx="10" fill="white" opacity="0.95"/>
      <text x="14" y="18" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="700" fill="#5A6A78" letter-spacing="0.5">VANDAAG</text>
      <text x="14" y="33" font-family="ui-sans-serif, system-ui" font-size="14" font-weight="700" fill="#0A1520">87% bezet</text>
    </g>
  </svg>
</template>
