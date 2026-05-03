<template>
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <!-- Klembord -->
    <rect x="40" y="30" width="120" height="150" rx="10" fill="white" stroke="currentColor" stroke-width="2.5"/>
    <rect x="78" y="20" width="44" height="20" rx="4" fill="currentColor" opacity="0.85"/>
    <!-- Formulier-lijnen -->
    <line x1="58" y1="60" x2="142" y2="60" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="58" y1="74" x2="120" y2="74" stroke="currentColor" stroke-width="1.5" opacity="0.4" stroke-linecap="round"/>
    <line x1="58" y1="90" x2="142" y2="90" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <line x1="58" y1="104" x2="125" y2="104" stroke="currentColor" stroke-width="1.5" opacity="0.4" stroke-linecap="round"/>
    <line x1="58" y1="120" x2="142" y2="120" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <!-- Bootje (op formulier) -->
    <path d="M60 152 L100 152 L94 162 L66 162 Z" fill="#F4ECDC" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <line x1="80" y1="138" x2="80" y2="152" stroke="currentColor" stroke-width="1.8"/>
    <path d="M80 138 L92 152 L80 152 Z" fill="white" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <!-- Stempel -->
    <g transform="translate(120 132) rotate(-12)">
      <rect x="-2" y="-2" width="34" height="22" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>
      <text x="15" y="13" font-family="ui-sans-serif, system-ui" font-size="9" font-weight="800" fill="currentColor" text-anchor="middle">OK</text>
    </g>
  </svg>
</template>
