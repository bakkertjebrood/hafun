<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

definePageMeta({ layout: 'dashboard' })

interface MarinaSelf {
  id: string
  slug: string
  name: string
  settings: Record<string, unknown> | null
  logoUrl: string | null
  accentColor: string | null
  publicBio: string | null
  allowedEmbedOrigins: string[]
  webhookUrl: string | null
  stripeConnectAccountId: string | null
  stripeConnectChargesEnabled: boolean
}

interface ConnectStatus {
  connected: boolean
  chargesEnabled: boolean
  payoutsEnabled?: boolean
  detailsSubmitted?: boolean
  accountId: string | null
}

interface SelfServiceSettings {
  passant: { enabled: boolean; requirePayment: boolean; allowBerthPick: boolean }
  absence: { enabled: boolean; subletCreditPercent?: number }
  waitlist: { enabled: boolean; applicationFee?: number; requireConsent: boolean }
}

const marina = ref<MarinaSelf | null>(null)
const connect = ref<ConnectStatus | null>(null)
const ss = ref<SelfServiceSettings>({
  passant: { enabled: false, requirePayment: false, allowBerthPick: false },
  absence: { enabled: false },
  waitlist: { enabled: false, requireConsent: true }
})
const newOrigin = ref('')
const saving = ref(false)
const error = ref<string | null>(null)
const saved = ref(false)
const activeSnippet = ref<'passant' | 'waitlist'>('passant')
const route = useRoute()

const baseUrl = computed(() => {
  if (typeof window !== 'undefined') return window.location.origin
  return ''
})

const slugUrl = (path: string) => `${baseUrl.value}/h/${marina.value?.slug || ''}${path}`
const embedUrl = (path: string) => `${baseUrl.value}/embed/${marina.value?.slug || ''}${path}`

async function load() {
  marina.value = await $fetch<MarinaSelf>('/api/marina/me')
  connect.value = await $fetch<ConnectStatus>('/api/stripe/connect/status')
  const settings = (marina.value.settings ?? {}) as { selfService?: Partial<SelfServiceSettings> }
  const p: Partial<SelfServiceSettings['passant']> = settings.selfService?.passant ?? {}
  const a: Partial<SelfServiceSettings['absence']> = settings.selfService?.absence ?? {}
  const w: Partial<SelfServiceSettings['waitlist']> = settings.selfService?.waitlist ?? {}
  ss.value = {
    passant: {
      enabled: p.enabled ?? false,
      requirePayment: p.requirePayment ?? false,
      allowBerthPick: p.allowBerthPick ?? false
    },
    absence: {
      enabled: a.enabled ?? false,
      subletCreditPercent: a.subletCreditPercent
    },
    waitlist: {
      enabled: w.enabled ?? false,
      applicationFee: w.applicationFee,
      requireConsent: w.requireConsent ?? true
    }
  }
}

async function save() {
  if (!marina.value) return
  saving.value = true
  error.value = null
  saved.value = false
  try {
    const newSettings = { ...(marina.value.settings ?? {}), selfService: ss.value }
    await $fetch('/api/marina/update', {
      method: 'PUT',
      body: {
        settings: newSettings,
        logoUrl: marina.value.logoUrl,
        accentColor: marina.value.accentColor,
        publicBio: marina.value.publicBio,
        allowedEmbedOrigins: marina.value.allowedEmbedOrigins,
        webhookUrl: marina.value.webhookUrl
      }
    })
    saved.value = true
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    error.value = err?.data?.message || err?.message || 'Opslaan mislukt'
  } finally {
    saving.value = false
  }
}

async function startConnect() {
  const res = await $fetch<{ url: string }>('/api/stripe/connect/onboard', { method: 'POST' })
  if (res.url) window.location.href = res.url
}

function addOrigin() {
  if (!marina.value || !newOrigin.value) return
  const trimmed = newOrigin.value.trim().replace(/\/$/, '')
  if (!/^https?:\/\//.test(trimmed)) {
    error.value = 'Origin moet beginnen met http:// of https://'
    return
  }
  if (!marina.value.allowedEmbedOrigins.includes(trimmed)) {
    marina.value.allowedEmbedOrigins = [...marina.value.allowedEmbedOrigins, trimmed]
  }
  newOrigin.value = ''
}

function removeOrigin(o: string) {
  if (!marina.value) return
  marina.value.allowedEmbedOrigins = marina.value.allowedEmbedOrigins.filter(x => x !== o)
}

function copy(text: string) {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text)
  }
}

const linkSnippet = computed(() => {
  const url = activeSnippet.value === 'passant' ? slugUrl('/passant') : slugUrl('/wachtlijst')
  const label = activeSnippet.value === 'passant' ? 'Boek als passant' : 'Inschrijven wachtlijst'
  return `<a href="${url}">${label}</a>`
})

const iframeSnippet = computed(() => {
  const url = activeSnippet.value === 'passant' ? embedUrl('/passant') : embedUrl('/wachtlijst')
  return `<iframe src="${url}" style="width:100%;border:0" data-hafun-resize></iframe>
<script src="${baseUrl.value}/embed.js" async><\/script>`
})

const hostedUrl = computed(() => activeSnippet.value === 'passant' ? slugUrl('/passant') : slugUrl('/wachtlijst'))

const qrPng = computed(() => {
  const url = activeSnippet.value === 'passant' ? slugUrl('/passant') : slugUrl('/wachtlijst')
  return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`
})

onMounted(load)
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8 space-y-8">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">Self-service & publieke pagina</h1>
      <p class="mt-1 text-sm text-[#5A6A78]">
        Laat passanten, vaste liggers en wachtlijst-aanmeldingen zichzelf registreren — en bouw je publieke aanwezigheid op.
      </p>
    </div>

    <div v-if="route.query.connect === 'return'" class="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900">
      Stripe-onboarding afgerond. Status wordt bijgewerkt zodra Stripe je account verifieert.
    </div>

    <div v-if="error" class="rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm p-3">{{ error }}</div>
    <div v-if="saved" class="rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm p-3">Opgeslagen.</div>

    <!-- Branding -->
    <section v-if="marina" class="bg-white rounded-2xl border border-black/[0.06] p-6 space-y-4">
      <h2 class="font-semibold tracking-tight">Branding op je publieke pagina</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label class="block text-sm">
          <span class="font-medium">Logo URL</span>
          <input v-model="marina.logoUrl" type="url" placeholder="https://…" class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3" />
        </label>
        <label class="block text-sm">
          <span class="font-medium">Accentkleur (hex)</span>
          <input v-model="marina.accentColor" type="text" placeholder="#00A9A5" class="mt-1 w-full h-11 rounded-xl border border-black/10 px-3" />
        </label>
      </div>
      <label class="block text-sm">
        <span class="font-medium">Korte introductietekst</span>
        <textarea v-model="marina.publicBio" rows="3" class="mt-1 w-full rounded-xl border border-black/10 px-3 py-2 text-sm" />
      </label>
    </section>

    <!-- Stripe Connect -->
    <section class="bg-white rounded-2xl border border-black/[0.06] p-6 space-y-3">
      <h2 class="font-semibold tracking-tight">Online betalen — Stripe Connect</h2>
      <p class="text-sm text-[#5A6A78]">Verbind je eigen Stripe-account om passanten en wachtlijst-fees direct online af te rekenen.</p>
      <div v-if="!connect?.connected" class="flex items-center gap-3">
        <button class="px-4 h-10 rounded-full bg-primary-500 text-white text-sm font-semibold" @click="startConnect">
          Verbind Stripe
        </button>
      </div>
      <div v-else>
        <div class="text-sm">
          <span :class="connect.chargesEnabled ? 'text-emerald-700' : 'text-amber-700'">
            {{ connect.chargesEnabled ? '✓ Klaar om betalingen te ontvangen' : 'Onboarding nog niet voltooid' }}
          </span>
        </div>
        <a v-if="!connect.chargesEnabled" href="/api/stripe/connect/refresh" class="text-sm font-semibold text-primary-600">Onboarding hervatten →</a>
      </div>
    </section>

    <!-- Self-service toggles -->
    <section class="bg-white rounded-2xl border border-black/[0.06] p-6 space-y-6">
      <h2 class="font-semibold tracking-tight">Niveaus van self-service</h2>

      <div class="space-y-3">
        <label class="flex items-start gap-3">
          <input v-model="ss.passant.enabled" type="checkbox" class="mt-1" />
          <div>
            <div class="font-semibold text-sm">Passanten — QR & online aanmelden</div>
            <p class="text-sm text-[#5A6A78]">Gasten scannen een QR, vullen hun gegevens in en krijgen een digitale bon.</p>
          </div>
        </label>
        <div v-if="ss.passant.enabled" class="ml-7 space-y-2 text-sm">
          <label class="flex items-center gap-2">
            <input v-model="ss.passant.requirePayment" type="checkbox" />
            <span>Vraag online betaling (Stripe Connect vereist)</span>
          </label>
          <label class="flex items-center gap-2">
            <input v-model="ss.passant.allowBerthPick" type="checkbox" />
            <span>Laat passant zelf een vrije ligplaats kiezen</span>
          </label>
        </div>
      </div>

      <div class="space-y-3">
        <label class="flex items-start gap-3">
          <input v-model="ss.absence.enabled" type="checkbox" class="mt-1" />
          <div>
            <div class="font-semibold text-sm">Vaste liggers — afwezigheidsmelding</div>
            <p class="text-sm text-[#5A6A78]">Ligplaatshouders melden via het portaal wanneer hun boot weg is.</p>
          </div>
        </label>
        <div v-if="ss.absence.enabled" class="ml-7 space-y-2 text-sm">
          <label class="flex items-center gap-2">
            <span>Credit op factuur bij onderverhuur:</span>
            <input v-model.number="ss.absence.subletCreditPercent" type="number" min="0" max="100" step="5" class="h-9 w-20 rounded-lg border border-black/10 px-2" />
            <span>%</span>
          </label>
          <p class="text-xs text-[#5A6A78]">Leeg of 0 = geen credit; eigenaar gunt de inkomsten aan de haven.</p>
        </div>
      </div>

      <div class="space-y-3">
        <label class="flex items-start gap-3">
          <input v-model="ss.waitlist.enabled" type="checkbox" class="mt-1" />
          <div>
            <div class="font-semibold text-sm">Wachtlijst — zelfinschrijving</div>
            <p class="text-sm text-[#5A6A78]">Geïnteresseerden vullen zelf het inschrijfformulier in.</p>
          </div>
        </label>
        <div v-if="ss.waitlist.enabled" class="ml-7 space-y-2 text-sm">
          <label class="flex items-center gap-2">
            <span>Eenmalige aanmeldfee (€):</span>
            <input v-model.number="ss.waitlist.applicationFee" type="number" min="0" step="5" class="h-9 w-24 rounded-lg border border-black/10 px-2" />
          </label>
          <label class="flex items-center gap-2">
            <input v-model="ss.waitlist.requireConsent" type="checkbox" />
            <span>Toestemmingsvinkje verplicht (AVG)</span>
          </label>
        </div>
      </div>
    </section>

    <!-- Integratie & snippets -->
    <section v-if="marina" class="bg-white rounded-2xl border border-black/[0.06] p-6 space-y-4">
      <h2 class="font-semibold tracking-tight">Integreer met je bestaande website</h2>
      <p class="text-sm text-[#5A6A78]">
        Drie manieren om self-service in te bouwen — kies wat past bij je site.
      </p>

      <div class="flex gap-2 text-sm">
        <button
          class="px-3 h-9 rounded-full border"
          :class="activeSnippet === 'passant' ? 'border-primary-500 text-primary-700 bg-primary-500/5' : 'border-black/10 text-[#2D3E4A]'"
          @click="activeSnippet = 'passant'"
        >Passant</button>
        <button
          class="px-3 h-9 rounded-full border"
          :class="activeSnippet === 'waitlist' ? 'border-primary-500 text-primary-700 bg-primary-500/5' : 'border-black/10 text-[#2D3E4A]'"
          @click="activeSnippet = 'waitlist'"
        >Wachtlijst</button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div class="rounded-xl border border-black/[0.06] p-4 space-y-2">
          <div class="text-xs font-semibold uppercase tracking-widest text-[#5A6A78]">Hosted link</div>
          <div class="text-sm break-all font-mono">{{ hostedUrl }}</div>
          <button class="text-xs font-semibold text-primary-600" @click="copy(hostedUrl)">Kopieer URL</button>
          <a :href="qrPng" target="_blank" class="block text-xs font-semibold text-primary-600">Download QR (PNG) →</a>
        </div>
        <div class="rounded-xl border border-black/[0.06] p-4 space-y-2">
          <div class="text-xs font-semibold uppercase tracking-widest text-[#5A6A78]">Knop / link snippet</div>
          <pre class="text-xs bg-[#F4F7F8] rounded-lg p-2 overflow-x-auto">{{ linkSnippet }}</pre>
          <button class="text-xs font-semibold text-primary-600" @click="copy(linkSnippet)">Kopieer</button>
        </div>
        <div class="rounded-xl border border-black/[0.06] p-4 space-y-2">
          <div class="text-xs font-semibold uppercase tracking-widest text-[#5A6A78]">Iframe-snippet</div>
          <pre class="text-xs bg-[#F4F7F8] rounded-lg p-2 overflow-x-auto">{{ iframeSnippet }}</pre>
          <button class="text-xs font-semibold text-primary-600" @click="copy(iframeSnippet)">Kopieer</button>
        </div>
      </div>

      <div class="pt-4 border-t border-black/[0.06] space-y-2">
        <div class="text-sm font-semibold">Toegestane iframe-origins</div>
        <p class="text-xs text-[#5A6A78]">Voeg het exacte adres toe waarop je het iframe wil tonen, bv. <code>https://www.jouwhaven.nl</code>.</p>
        <ul class="space-y-1">
          <li v-for="o in marina.allowedEmbedOrigins" :key="o" class="flex items-center gap-2 text-sm">
            <span class="font-mono">{{ o }}</span>
            <button class="text-xs text-red-600 hover:underline" @click="removeOrigin(o)">verwijder</button>
          </li>
        </ul>
        <div class="flex gap-2">
          <input v-model="newOrigin" placeholder="https://www.jouwhaven.nl" class="flex-1 h-10 rounded-xl border border-black/10 px-3 text-sm" />
          <button class="px-3 h-10 rounded-xl border border-black/10 text-sm font-semibold" @click="addOrigin">Toevoegen</button>
        </div>
      </div>
    </section>

    <div class="sticky bottom-0 bg-white/80 backdrop-blur-md py-3 -mx-4 px-4 border-t border-black/[0.06]">
      <button :disabled="saving" class="px-5 h-11 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-60" @click="save">
        {{ saving ? 'Opslaan…' : 'Opslaan' }}
      </button>
    </div>
  </div>
</template>
