<template>
  <svg viewBox="0 0 360 280" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <!-- Achtergrond water -->
    <path d="M0 200 Q60 192 120 200 T240 200 T360 200 L360 280 L0 280 Z" fill="currentColor" opacity="0.10"/>
    <path d="M0 210 Q60 202 120 210 T240 210 T360 210" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.35"/>

    <!-- Steigers -->
    <rect x="40" y="180" width="280" height="10" rx="2" fill="#F4ECDC" stroke="currentColor" stroke-width="2"/>
    <rect x="60" y="190" width="6" height="20" fill="currentColor" opacity="0.7"/>
    <rect x="160" y="190" width="6" height="20" fill="currentColor" opacity="0.7"/>
    <rect x="270" y="190" width="6" height="20" fill="currentColor" opacity="0.7"/>

    <!-- Bootjes op steiger -->
    <g>
      <path d="M70 168 L110 168 L104 180 L76 180 Z" fill="white" stroke="currentColor" stroke-width="2"/>
      <line x1="90" y1="150" x2="90" y2="168" stroke="currentColor" stroke-width="2"/>
      <path d="M90 150 L104 168 L90 168 Z" fill="#F4ECDC" stroke="currentColor" stroke-width="1.6"/>
    </g>
    <g>
      <path d="M180 168 L220 168 L214 180 L186 180 Z" fill="white" stroke="currentColor" stroke-width="2"/>
      <line x1="200" y1="150" x2="200" y2="168" stroke="currentColor" stroke-width="2"/>
      <path d="M200 150 L214 168 L200 168 Z" fill="#F4ECDC" stroke="currentColor" stroke-width="1.6"/>
    </g>
    <g>
      <path d="M260 170 L306 170 L300 182 L266 182 Z" fill="white" stroke="currentColor" stroke-width="2"/>
      <circle cx="283" cy="166" r="6" fill="white" stroke="currentColor" stroke-width="1.6"/>
    </g>

    <!-- Drijvende QR-bon -->
    <g transform="translate(40 30)">
      <rect x="0" y="0" width="100" height="86" rx="10" fill="white" stroke="currentColor" stroke-width="2.5"/>
      <rect x="14" y="14" width="32" height="32" rx="3" fill="currentColor"/>
      <rect x="20" y="20" width="20" height="20" rx="1" fill="white"/>
      <rect x="26" y="26" width="8" height="8" fill="currentColor"/>
      <line x1="56" y1="20" x2="86" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="56" y1="30" x2="80" y2="30" stroke="currentColor" stroke-width="1.5" opacity="0.4" stroke-linecap="round"/>
      <line x1="56" y1="40" x2="86" y2="40" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="14" y1="60" x2="86" y2="60" stroke="currentColor" stroke-width="1.5" opacity="0.4" stroke-linecap="round"/>
      <line x1="14" y1="70" x2="64" y2="70" stroke="currentColor" stroke-width="1.5" opacity="0.4" stroke-linecap="round"/>
    </g>

    <!-- Afwezigheidsmarker -->
    <g transform="translate(220 30)">
      <path d="M30 0 C16 0 6 11 6 25 C6 42 30 70 30 70 C30 70 54 42 54 25 C54 11 44 0 30 0 Z" fill="white" stroke="currentColor" stroke-width="2.5"/>
      <circle cx="30" cy="25" r="9" fill="currentColor" opacity="0.85"/>
      <text x="30" y="29" font-family="ui-sans-serif, system-ui" font-size="11" font-weight="800" fill="white" text-anchor="middle">A</text>
      <rect x="64" y="14" width="74" height="46" rx="6" fill="white" stroke="currentColor" stroke-width="2"/>
      <line x1="64" y1="26" x2="138" y2="26" stroke="currentColor" stroke-width="1" opacity="0.3"/>
      <rect x="72" y="34" width="22" height="8" rx="2" fill="currentColor" opacity="0.85"/>
      <text x="83" y="40" font-family="ui-sans-serif, system-ui" font-size="6" font-weight="700" fill="white" text-anchor="middle">WEG</text>
      <line x1="100" y1="38" x2="130" y2="38" stroke="currentColor" stroke-width="1" opacity="0.3"/>
      <line x1="72" y1="50" x2="120" y2="50" stroke="currentColor" stroke-width="1" opacity="0.3"/>
    </g>
  </svg>
</template>
