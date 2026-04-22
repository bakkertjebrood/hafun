<script setup lang="ts">
definePageMeta({ layout: false })

const { user, fetchMe } = useAuthUser()

const step = ref(1) // 1: naam, 2: kaart + polygon, 3: AI resultaat, 4: klaar
const submitting = ref(false)
const error = ref<string | null>(null)

// Step 1
const marinaName = ref('')

// Step 2 - Map
const mapContainer = ref<HTMLElement>()
let mapInstance: any = null
let L: any = null
let polygon: any = null
let drawnPolygon = ref<number[][] | null>(null)
const drawingPoints = ref<number[][]>([])
const isDrawing = ref(false)
let previewLine: any = null

// Step 3 - AI result
const aiResult = ref<any>(null)
const analyzing = ref(false)

onMounted(async () => {
  if (user.value?.marina?.name) {
    marinaName.value = user.value.marina.name
  }
})

// ─── STEP 2: MAP ────────────────────

async function goToMap() {
  if (!marinaName.value.trim()) return
  step.value = 2
  await nextTick()
  await initMap()
}

async function initMap() {
  if (!mapContainer.value) return
  const leaflet = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  L = leaflet.default || leaflet

  mapInstance = L.map(mapContainer.value, {
    center: [52.3, 5.3], // Center of NL
    zoom: 8,
    maxZoom: 22,
    doubleClickZoom: false
  })

  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; Esri',
    maxZoom: 22,
    maxNativeZoom: 19
  }).addTo(mapInstance)

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    maxZoom: 22,
    maxNativeZoom: 19,
    pane: 'overlayPane'
  }).addTo(mapInstance)

  // Search box for finding the marina
  addSearchControl()

  mapInstance.on('click', onMapClick)
  mapInstance.on('dblclick', onMapDblClick)
}

function addSearchControl() {
  const searchDiv = document.createElement('div')
  searchDiv.className = 'leaflet-top leaflet-left'
  searchDiv.style.cssText = 'top: 10px; left: 60px; z-index: 1000;'
  searchDiv.innerHTML = `
    <div style="background: white; border-radius: 999px; padding: 8px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: flex; gap: 8px; align-items: center; width: 320px;">
      <input id="marina-search" type="text" placeholder="Zoek je haven (plaatsnaam)..." style="border: none; outline: none; flex: 1; font-size: 14px; font-family: inherit;">
      <button id="marina-search-btn" style="background: #00A9A5; color: white; border: none; border-radius: 999px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer;">Zoek</button>
    </div>
  `
  mapInstance.getContainer().appendChild(searchDiv)

  const searchInput = document.getElementById('marina-search') as HTMLInputElement
  const searchBtn = document.getElementById('marina-search-btn')

  async function doSearch() {
    const q = searchInput?.value
    if (!q) return
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ' nederland')}&limit=1`)
      const data = await res.json()
      if (data[0]) {
        mapInstance.flyTo([parseFloat(data[0].lat), parseFloat(data[0].lon)], 17, { duration: 1.5 })
      }
    }
    catch {}
  }

  searchBtn?.addEventListener('click', doSearch)
  searchInput?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') doSearch()
  })
}

function startDrawing() {
  isDrawing.value = true
  drawingPoints.value = []
  if (polygon) { polygon.remove(); polygon = null }
  drawnPolygon.value = null
  mapInstance.getContainer().style.cursor = 'crosshair'
}

function onMapClick(e: any) {
  if (!isDrawing.value) return

  const point = [e.latlng.lat, e.latlng.lng]
  drawingPoints.value.push(point)

  // Update preview line
  if (previewLine) previewLine.remove()
  if (drawingPoints.value.length >= 2) {
    previewLine = L.polyline([...drawingPoints.value, drawingPoints.value[0]], {
      color: '#00A9A5', weight: 3, opacity: 0.8, dashArray: '6, 4'
    }).addTo(mapInstance)
  }

  // Add vertex marker
  L.circleMarker(point, {
    radius: 5, fillColor: '#00A9A5', fillOpacity: 1,
    color: 'white', weight: 2
  }).addTo(mapInstance)
}

function onMapDblClick(e: any) {
  if (!isDrawing.value || drawingPoints.value.length < 3) return
  e.originalEvent?.preventDefault()
  finishDrawing()
}

function finishDrawing() {
  if (drawingPoints.value.length < 3) return

  isDrawing.value = false
  if (previewLine) { previewLine.remove(); previewLine = null }

  polygon = L.polygon(drawingPoints.value, {
    color: '#00A9A5', weight: 3, fillColor: '#00A9A5', fillOpacity: 0.15
  }).addTo(mapInstance)

  drawnPolygon.value = drawingPoints.value
  mapInstance.getContainer().style.cursor = ''
}

// ─── STEP 3: AI ANALYSE ────────────

async function analyzeWithAI() {
  if (!drawnPolygon.value || !mapInstance) return
  analyzing.value = true
  error.value = null

  try {
    // Fit map to polygon for best screenshot
    mapInstance.fitBounds(polygon.getBounds().pad(0.1))
    await new Promise(r => setTimeout(r, 1500)) // Wait for tiles to load

    // Capture map screenshot
    const html2canvas = (await import('html2canvas-pro')).default
    const canvas = await html2canvas(mapInstance.getContainer(), {
      useCORS: true,
      allowTaint: true,
      scale: 1,
      width: mapInstance.getContainer().offsetWidth,
      height: mapInstance.getContainer().offsetHeight
    })

    const imageBase64 = canvas.toDataURL('image/png')
    const center = mapInstance.getCenter()

    // Send to AI
    const result = await $fetch('/api/onboarding/analyze', {
      method: 'POST',
      body: {
        imageBase64,
        polygon: drawnPolygon.value,
        center: { lat: center.lat, lng: center.lng },
        zoom: mapInstance.getZoom(),
        marinaName: marinaName.value
      }
    })

    aiResult.value = result
    step.value = 3
  }
  catch (e: any) {
    error.value = e.data?.message || 'AI analyse mislukt. Probeer opnieuw.'
  }
  finally {
    analyzing.value = false
  }
}

// ─── STEP 4: CONFIRM & CREATE ──────

async function confirmSetup() {
  if (!aiResult.value?.piers?.length) return
  submitting.value = true
  error.value = null

  try {
    const center = mapInstance?.getCenter()

    // Build piers + berths data from AI result
    const piersData = aiResult.value.piers.map((pier: any) => {
      const totalBerths = (pier.leftBerths || 0) + (pier.rightBerths || 0)
      return {
        name: pier.name,
        hasHead: pier.hasHead || false,
        headBerths: pier.headBerths || 0,
        startLat: pier.startLat,
        startLng: pier.startLng,
        endLat: pier.endLat,
        endLng: pier.endLng,
        headStartLat: pier.headStartLat,
        headStartLng: pier.headStartLng,
        headEndLat: pier.headEndLat,
        headEndLng: pier.headEndLng,
        berths: [{
          length: pier.avgBerthLength || 10,
          width: pier.avgBerthWidth || 3.5,
          count: totalBerths,
          isPassanten: false
        }]
      }
    })

    await $fetch('/api/onboarding/setup', {
      method: 'POST',
      body: {
        marinaName: marinaName.value,
        gpsLat: center?.lat || null,
        gpsLng: center?.lng || null,
        piers: piersData
      }
    })

    // Position berths along the AI-detected pier lines
    const discovered = await $fetch('/api/berths/discover') as any

    // Save pier lines with AI coordinates
    for (const pier of aiResult.value.piers) {
      if (pier.startLat && pier.endLat) {
        const body: any = {
          marinaId: discovered.marinaId,
          name: pier.name,
          points: [[pier.startLat, pier.startLng], [pier.endLat, pier.endLng]]
        }
        if (pier.hasHead && pier.headStartLat) {
          body.headPoints = [[pier.headStartLat, pier.headStartLng], [pier.headEndLat, pier.headEndLng]]
        }
        await $fetch('/api/piers', { method: 'POST', body })
      }
    }

    // Auto-position berths
    await $fetch('/api/piers/position-berths', {
      method: 'POST',
      body: { marinaId: discovered.marinaId }
    })

    await fetchMe()
    step.value = 4
  }
  catch (e: any) {
    error.value = e.data?.message || 'Setup mislukt'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-[100dvh] bg-[#F4F7F8]">
    <!-- Step 1: Haven naam -->
    <div v-if="step === 1" class="flex items-center justify-center min-h-[100dvh] p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-10">
          <NautarLogo :size="28" class="mx-auto mb-6" />
          <h1 class="text-3xl font-semibold text-[#0A1520] tracking-tight">Welkom terug.</h1>
          <p class="text-sm text-[#5A6A78] mt-2">Laten we je haven instellen.</p>
        </div>

        <div class="bg-white rounded-[20px] border border-black/[0.08] p-6">
          <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2 block">Naam van je haven</label>
          <input
            v-model="marinaName"
            type="text"
            placeholder="bijv. Jachthaven Lands End"
            class="w-full px-4 py-3 text-base rounded-[14px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
            @keydown.enter="goToMap"
          >

          <button
            class="w-full mt-4 py-3.5 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-50"
            :disabled="!marinaName.trim()"
            @click="goToMap"
          >
            Volgende — zoek op de kaart →
          </button>
        </div>
      </div>
    </div>

    <!-- Step 2: Kaart + polygon tekenen -->
    <div v-if="step === 2" class="h-[100dvh] flex flex-col">
      <!-- Top bar -->
      <div class="px-4 lg:px-6 py-3 bg-white/95 backdrop-blur-sm border-b border-black/[0.08] flex items-center justify-between shrink-0 z-[500]">
        <div>
          <div class="text-base font-semibold text-[#0A1520]">{{ marinaName }}</div>
          <div class="text-xs text-[#5A6A78]">Zoom in op je haven en omcirkel het havengebied</div>
        </div>
        <div class="flex gap-2">
          <button
            v-if="!isDrawing && !drawnPolygon"
            class="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold"
            @click="startDrawing"
          >
            Start tekenen
          </button>
          <button
            v-if="isDrawing && drawingPoints.length >= 3"
            class="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold"
            @click="finishDrawing"
          >
            Voltooi vorm
          </button>
          <button
            v-if="isDrawing"
            class="px-4 py-2 rounded-full bg-[#F4F7F8] text-[#5A6A78] text-sm font-semibold"
            @click="isDrawing = false; drawingPoints = []; mapInstance.getContainer().style.cursor = ''"
          >
            Annuleer
          </button>
          <button
            v-if="drawnPolygon && !analyzing"
            class="px-4 py-2 rounded-full bg-primary-500 text-white text-sm font-semibold"
            @click="analyzeWithAI"
          >
            Analyseer met AI →
          </button>
          <button
            v-if="analyzing"
            class="px-4 py-2 rounded-full bg-primary-500/50 text-white text-sm font-semibold"
            disabled
          >
            AI analyseert...
          </button>
          <button
            v-if="drawnPolygon && !analyzing"
            class="px-4 py-2 rounded-full bg-[#F4F7F8] text-[#5A6A78] text-sm font-semibold"
            @click="startDrawing"
          >
            Opnieuw tekenen
          </button>
        </div>
      </div>

      <!-- Drawing instructions -->
      <div
        v-if="isDrawing"
        class="px-4 py-2 bg-primary-500 text-white text-center text-sm font-medium shrink-0"
      >
        Klik op de kaart om punten te plaatsen rondom je haven. Dubbelklik of klik "Voltooi" om af te ronden.
        <span class="opacity-75 ml-2">({{ drawingPoints.length }} punten)</span>
      </div>

      <!-- Error -->
      <div v-if="error" class="px-4 py-2 bg-red-500 text-white text-center text-sm shrink-0">
        {{ error }}
      </div>

      <!-- Map -->
      <div ref="mapContainer" class="flex-1" />
    </div>

    <!-- Step 3: AI resultaat bevestigen -->
    <div v-if="step === 3 && aiResult" class="min-h-[100dvh] p-4 lg:p-8">
      <div class="max-w-3xl mx-auto">
        <div class="text-center mb-8">
          <NautarLogo :size="22" class="mx-auto mb-4" />
          <h1 class="text-2xl font-semibold text-[#0A1520] tracking-tight">AI analyse compleet</h1>
          <p class="text-sm text-[#5A6A78] mt-1">
            We hebben {{ aiResult.piers?.length || 0 }} steigers en ~{{ aiResult.totalBerths || 0 }} ligplaatsen gedetecteerd.
          </p>
        </div>

        <!-- AI notes -->
        <div v-if="aiResult.notes" class="bg-primary-500/5 border border-primary-500/20 rounded-[14px] p-4 mb-6 text-sm text-[#0A1520]">
          {{ aiResult.notes }}
        </div>

        <!-- Piers list -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          <div
            v-for="pier in aiResult.piers"
            :key="pier.name"
            class="bg-white border border-black/[0.08] rounded-[14px] p-4"
          >
            <div class="flex items-center gap-2 mb-3">
              <div class="w-10 h-10 rounded-[10px] bg-primary-500/10 text-primary-500 flex items-center justify-center text-sm font-bold">
                {{ pier.name }}
              </div>
              <div>
                <div class="text-sm font-semibold text-[#0A1520]">Steiger {{ pier.name }}</div>
                <div class="text-xs text-[#5A6A78]">
                  {{ (pier.leftBerths || 0) + (pier.rightBerths || 0) }} ligplaatsen
                  <span v-if="pier.hasHead">+ {{ pier.headBerths || 0 }} kop</span>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-2 text-xs text-[#5A6A78]">
              <div>Links: {{ pier.leftBerths || 0 }}</div>
              <div>Rechts: {{ pier.rightBerths || 0 }}</div>
              <div>Lengte: ~{{ pier.avgBerthLength || '?' }}m</div>
              <div>Breedte: ~{{ pier.avgBerthWidth || '?' }}m</div>
            </div>

            <div v-if="pier.hasHead" class="mt-2 flex items-center gap-1">
              <span class="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber-500/10 text-amber-500">T-steiger</span>
              <span class="text-[10px] text-[#5A6A78]">{{ pier.headBerths || 0 }} kopplaatsen</span>
            </div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="error" class="bg-red-50 border border-red-200 rounded-[14px] p-4 mb-4 text-sm text-red-600">
          {{ error }}
        </div>

        <!-- Actions -->
        <div class="flex gap-3 justify-center">
          <button
            class="px-6 py-3 rounded-full bg-[#F4F7F8] text-[#5A6A78] text-sm font-semibold"
            @click="step = 2"
          >
            ← Opnieuw analyseren
          </button>
          <button
            class="px-8 py-3 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-50"
            :disabled="submitting"
            @click="confirmSetup"
          >
            {{ submitting ? 'Haven wordt aangemaakt...' : 'Bevestig en maak haven aan →' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Step 4: Klaar! -->
    <div v-if="step === 4" class="flex items-center justify-center min-h-[100dvh] p-4">
      <div class="text-center max-w-md">
        <div class="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-6">
          <UIcon name="i-lucide-check" class="size-10" />
        </div>
        <h1 class="text-3xl font-semibold text-[#0A1520] tracking-tight mb-2">Haven aangemaakt!</h1>
        <p class="text-sm text-[#5A6A78] mb-8">
          {{ marinaName }} is klaar. Je kunt nu de steigers verfijnen op de kaart en beginnen met het beheer.
        </p>
        <NuxtLink
          to="/dashboard/map"
          class="inline-block px-8 py-3.5 rounded-full bg-primary-500 text-white text-sm font-semibold"
        >
          Ga naar de kaart →
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style>
.leaflet-container { z-index: 1; }
</style>
