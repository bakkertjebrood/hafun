<script setup lang="ts">
definePageMeta({ layout: false })

interface ReviewPier {
  name: string
  startLat: number
  startLng: number
  endLat: number
  endLng: number
  leftBerths: number
  rightBerths: number
  hasHead: boolean
  headStartLat?: number
  headStartLng?: number
  headEndLat?: number
  headEndLng?: number
  headBerths: number
  avgBerthLength: number
  avgBerthWidth: number
  confidence: number
  lengthMeters?: number
}

const { user, fetchMe } = useAuthUser()
const { mount: mountMap, capture: captureMap } = useSatelliteMap()

const step = ref<1 | 2 | 3 | 4>(1)
const submitting = ref(false)
const error = ref<string | null>(null)
const info = ref<string | null>(null)

// ─── Step 1 ───────────────────────────────────────
const marinaName = ref('')
const locationQuery = ref('')
const selectedLocation = ref<{ lat: number, lng: number, name: string } | null>(null)

// ─── Step 2/3 — shared map ────────────────────────
const mapContainer = ref<HTMLElement>()
let mapInstance: any = null
let L: any = null

// ─── Step 2 — optional bounding polygon ───────────
const restrictArea = ref(false)
const drawingPolygon = ref(false)
const polygonPoints = ref<number[][]>([])
let polygonLayer: any = null
let polygonPreview: any = null
const polygonVertexLayers: any[] = []

// AI scan
const aiAnalyzing = ref(false)

// ─── Step 3 — review state ────────────────────────
const piers = ref<ReviewPier[]>([])
const warnings = ref<string[]>([])
const tapMode = ref(false)
const tapPoints = ref<number[][]>([])
const countingBerths = ref(false)
let pierLayers: Record<string, { line: any, headLine?: any, startMarker: any, endMarker: any, label: any }> = {}
let tapPreviewLine: any = null
let tapVertexLayers: any[] = []

onMounted(() => {
  if (user.value?.marina?.name) {
    marinaName.value = user.value.marina.name
  }
})

// ─── Step transitions ─────────────────────────────

async function goToMap() {
  if (!marinaName.value.trim()) return
  step.value = 2
  await nextTick()
  await initMap()
}

async function initMap() {
  if (!mapContainer.value) return
  if (mapInstance) {
    mapInstance.off('click', onMapClick)
    mapInstance.remove()
    mapInstance = null
  }
  const center: [number, number] = selectedLocation.value
    ? [selectedLocation.value.lat, selectedLocation.value.lng]
    : [52.3, 5.3]
  const zoom = selectedLocation.value ? 17 : 8
  const result = await mountMap(mapContainer.value, { center, zoom })
  mapInstance = result.map
  L = result.L
  mapInstance.on('click', onMapClick)
}

function onLocationPick(loc: { lat: number, lng: number, name: string }) {
  selectedLocation.value = loc
  if (mapInstance) {
    mapInstance.flyTo([loc.lat, loc.lng], 17, { duration: 1.2 })
  }
}

// ─── Step 2 — Polygon drawing (optional) ──────────

function togglePolygonDraw() {
  if (drawingPolygon.value) {
    cancelPolygonDraw()
    return
  }
  restrictArea.value = true
  drawingPolygon.value = true
  polygonPoints.value = []
  clearPolygon()
  if (mapInstance) mapInstance.getContainer().style.cursor = 'crosshair'
}

function cancelPolygonDraw() {
  drawingPolygon.value = false
  polygonPoints.value = []
  clearPolygon()
  if (mapInstance) mapInstance.getContainer().style.cursor = ''
}

function finishPolygonDraw() {
  if (polygonPoints.value.length < 3) return
  drawingPolygon.value = false
  if (mapInstance) mapInstance.getContainer().style.cursor = ''
  if (polygonPreview) {
    polygonPreview.remove()
    polygonPreview = null
  }
  polygonLayer = L.polygon(polygonPoints.value, {
    color: '#00A9A5', weight: 3, fillColor: '#00A9A5', fillOpacity: 0.12
  }).addTo(mapInstance)
}

function clearPolygon() {
  if (polygonLayer) {
    polygonLayer.remove()
    polygonLayer = null
  }
  if (polygonPreview) {
    polygonPreview.remove()
    polygonPreview = null
  }
  for (const m of polygonVertexLayers) m.remove()
  polygonVertexLayers.length = 0
}

// ─── Map click router ─────────────────────────────

function onMapClick(e: any) {
  if (drawingPolygon.value) {
    addPolygonPoint([e.latlng.lat, e.latlng.lng])
    return
  }
  if (tapMode.value && step.value === 3) {
    addTapPoint([e.latlng.lat, e.latlng.lng])
    return
  }
}

function addPolygonPoint(p: number[]) {
  polygonPoints.value.push(p)
  const marker = L.circleMarker(p, {
    radius: 6, fillColor: '#00A9A5', fillOpacity: 1, color: 'white', weight: 2
  }).addTo(mapInstance)
  polygonVertexLayers.push(marker)
  if (polygonPreview) polygonPreview.remove()
  if (polygonPoints.value.length >= 2) {
    polygonPreview = L.polyline([...polygonPoints.value, polygonPoints.value[0]!], {
      color: '#00A9A5', weight: 3, opacity: 0.8, dashArray: '6, 4'
    }).addTo(mapInstance)
  }
}

// ─── AI scan ──────────────────────────────────────

async function runAiScan() {
  if (!mapInstance) return
  aiAnalyzing.value = true
  error.value = null

  try {
    if (polygonLayer) {
      mapInstance.fitBounds(polygonLayer.getBounds().pad(0.1))
      await nextTick()
    }
    const view = await captureMap(mapInstance, { settleMs: 1500 })

    const result = await $fetch<{
      piers: ReviewPier[]
      warnings?: string[]
      notes?: string
    }>('/api/onboarding/analyze', {
      method: 'POST',
      body: {
        imageBase64: view.imageBase64,
        bounds: view.bounds,
        imageWidth: view.imageWidth,
        imageHeight: view.imageHeight,
        center: view.center,
        zoom: view.zoom,
        marinaName: marinaName.value,
        polygon: polygonPoints.value.length >= 3 ? polygonPoints.value : null
      }
    })

    piers.value = (result.piers || []).map(normalizePier)
    warnings.value = result.warnings || []
    info.value = result.notes || null

    await goToReview()
  } catch (e: any) {
    error.value = e.data?.message || 'AI-analyse mislukt. Probeer opnieuw of teken zelf.'
  } finally {
    aiAnalyzing.value = false
  }
}

function normalizePier(p: any): ReviewPier {
  return {
    name: String(p.name || '?'),
    startLat: Number(p.startLat),
    startLng: Number(p.startLng),
    endLat: Number(p.endLat),
    endLng: Number(p.endLng),
    leftBerths: Number(p.leftBerths) || 0,
    rightBerths: Number(p.rightBerths) || 0,
    hasHead: !!p.hasHead,
    headStartLat: typeof p.headStartLat === 'number' ? p.headStartLat : undefined,
    headStartLng: typeof p.headStartLng === 'number' ? p.headStartLng : undefined,
    headEndLat: typeof p.headEndLat === 'number' ? p.headEndLat : undefined,
    headEndLng: typeof p.headEndLng === 'number' ? p.headEndLng : undefined,
    headBerths: Number(p.headBerths) || 0,
    avgBerthLength: Number(p.avgBerthLength) || 10,
    avgBerthWidth: Number(p.avgBerthWidth) || 3.5,
    confidence: Number(p.confidence) || 0.7,
    lengthMeters: typeof p.lengthMeters === 'number' ? p.lengthMeters : undefined
  }
}

// ─── Step 3 — review ──────────────────────────────

async function goToReview() {
  // Capture map view to restore after re-mount in step 3 layout
  const beforeCenter = mapInstance?.getCenter()
  const beforeZoom = mapInstance?.getZoom()
  if (mapInstance) {
    mapInstance.off('click', onMapClick)
    mapInstance.remove()
    mapInstance = null
  }
  clearPolygon()

  step.value = 3
  await nextTick()
  if (!mapContainer.value) return
  const result = await mountMap(mapContainer.value, {
    center: beforeCenter ? [beforeCenter.lat, beforeCenter.lng] : undefined,
    zoom: beforeZoom
  })
  mapInstance = result.map
  L = result.L
  mapInstance.on('click', onMapClick)
  drawAllPiers()
  if (piers.value.length) fitToPiers()
}

async function goBackToMap() {
  const beforeCenter = mapInstance?.getCenter()
  const beforeZoom = mapInstance?.getZoom()
  if (mapInstance) {
    mapInstance.off('click', onMapClick)
    mapInstance.remove()
    mapInstance = null
  }
  if (beforeCenter) {
    selectedLocation.value = {
      lat: beforeCenter.lat,
      lng: beforeCenter.lng,
      name: selectedLocation.value?.name || ''
    }
  }
  // Reset polygon state — its layers were already disposed with the previous map
  polygonPoints.value = []
  polygonLayer = null
  polygonPreview = null
  polygonVertexLayers.length = 0
  drawingPolygon.value = false
  restrictArea.value = false
  // Reset tap state too in case the user was mid-tap when going back
  disableTapMode()
  step.value = 2
  await nextTick()
  if (!mapContainer.value) return
  const result = await mountMap(mapContainer.value, {
    center: beforeCenter ? [beforeCenter.lat, beforeCenter.lng] : undefined,
    zoom: beforeZoom
  })
  mapInstance = result.map
  L = result.L
  mapInstance.on('click', onMapClick)
}

async function startManualMode() {
  piers.value = []
  warnings.value = []
  info.value = 'Tik twee punten op de kaart per steiger. AI telt dan automatisch de ligplaatsen.'
  await goToReview()
  enableTapMode()
}

function fitToPiers() {
  if (!piers.value.length || !mapInstance || !L) return
  const points: any[] = []
  for (const p of piers.value) {
    points.push([p.startLat, p.startLng])
    points.push([p.endLat, p.endLng])
  }
  const group = L.latLngBounds(points)
  mapInstance.fitBounds(group.pad(0.15))
}

function clearPierLayers() {
  for (const k of Object.keys(pierLayers)) {
    const layer = pierLayers[k]!
    layer.line.remove()
    if (layer.headLine) layer.headLine.remove()
    layer.startMarker.remove()
    layer.endMarker.remove()
    layer.label.remove()
  }
  pierLayers = {}
}

function drawAllPiers() {
  if (!mapInstance || !L) return
  clearPierLayers()
  for (const p of piers.value) drawPier(p)
}

function pierColor(p: ReviewPier): string {
  if (p.confidence >= 0.85) return '#10B981'
  if (p.confidence >= 0.6) return '#F59E0B'
  return '#EF4444'
}

function drawPier(p: ReviewPier) {
  const color = pierColor(p)

  const line = L.polyline(
    [[p.startLat, p.startLng], [p.endLat, p.endLng]],
    { color, weight: 5, opacity: 0.9 }
  ).addTo(mapInstance)

  let headLine: any
  if (p.hasHead && p.headStartLat != null && p.headEndLat != null) {
    headLine = L.polyline(
      [[p.headStartLat, p.headStartLng!], [p.headEndLat, p.headEndLng!]],
      { color, weight: 4, opacity: 0.9, dashArray: '4, 4' }
    ).addTo(mapInstance)
  }

  const start = makeEndpointMarker(p.startLat, p.startLng, color)
  const end = makeEndpointMarker(p.endLat, p.endLng, color)

  start.on('drag', (e: any) => {
    const ll = e.target.getLatLng()
    p.startLat = ll.lat
    p.startLng = ll.lng
    line.setLatLngs([[p.startLat, p.startLng], [p.endLat, p.endLng]])
    repositionLabel(p)
  })
  end.on('drag', (e: any) => {
    const ll = e.target.getLatLng()
    p.endLat = ll.lat
    p.endLng = ll.lng
    line.setLatLngs([[p.startLat, p.startLng], [p.endLat, p.endLng]])
    repositionLabel(p)
  })

  const label = L.marker([(p.startLat + p.endLat) / 2, (p.startLng + p.endLng) / 2], {
    icon: L.divIcon({
      className: 'pier-label',
      html: `<div style="background:${color};color:white;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,0.3);">${p.name}</div>`,
      iconSize: [30, 18],
      iconAnchor: [15, 9]
    }),
    interactive: false
  }).addTo(mapInstance)

  pierLayers[p.name] = { line, headLine, startMarker: start, endMarker: end, label }
}

function repositionLabel(p: ReviewPier) {
  const layer = pierLayers[p.name]
  if (!layer) return
  layer.label.setLatLng([(p.startLat + p.endLat) / 2, (p.startLng + p.endLng) / 2])
}

function makeEndpointMarker(lat: number, lng: number, color: string) {
  const isCoarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  const size = isCoarse ? 28 : 20
  const html = `<div style="
    width:${size}px;height:${size}px;
    background:white;border:3px solid ${color};border-radius:50%;
    box-shadow:0 2px 6px rgba(0,0,0,0.35);
  "></div>`
  return L.marker([lat, lng], {
    icon: L.divIcon({ className: 'pier-endpoint', html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] }),
    draggable: true
  }).addTo(mapInstance)
}

function updatePier(idx: number, next: ReviewPier) {
  piers.value[idx] = { ...next }
}

function removePier(idx: number) {
  const removed = piers.value.splice(idx, 1)[0]
  if (removed && pierLayers[removed.name]) {
    const l = pierLayers[removed.name]!
    l.line.remove()
    l.startMarker.remove()
    l.endMarker.remove()
    l.label.remove()
    if (l.headLine) l.headLine.remove()
    Reflect.deleteProperty(pierLayers, removed.name)
  }
}

function renamePier(idx: number, newName: string) {
  const p = piers.value[idx]
  if (!p) return
  if (piers.value.some((x, i) => i !== idx && x.name === newName)) {
    error.value = `Naam "${newName}" is al in gebruik`
    return
  }
  const oldName = p.name
  p.name = newName
  if (pierLayers[oldName]) {
    pierLayers[newName] = pierLayers[oldName]!
    Reflect.deleteProperty(pierLayers, oldName)
    pierLayers[newName].label.setIcon(L.divIcon({
      className: 'pier-label',
      html: `<div style="background:${pierColor(p)};color:white;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;box-shadow:0 1px 4px rgba(0,0,0,0.3);">${newName}</div>`,
      iconSize: [30, 18],
      iconAnchor: [15, 9]
    }))
  }
}

// ─── Hybrid: tap two points ───────────────────────

function nextPierName(): string {
  const used = new Set(piers.value.map(p => p.name))
  for (let i = 0; i < 26; i++) {
    const n = String.fromCharCode(65 + i)
    if (!used.has(n)) return n
  }
  return `S${piers.value.length + 1}`
}

function enableTapMode() {
  tapMode.value = true
  tapPoints.value = []
  clearTapPreview()
  if (mapInstance) mapInstance.getContainer().style.cursor = 'crosshair'
}

function disableTapMode() {
  tapMode.value = false
  tapPoints.value = []
  clearTapPreview()
  if (mapInstance) mapInstance.getContainer().style.cursor = ''
}

function clearTapPreview() {
  if (tapPreviewLine) {
    tapPreviewLine.remove()
    tapPreviewLine = null
  }
  for (const v of tapVertexLayers) v.remove()
  tapVertexLayers = []
}

async function addTapPoint(p: number[]) {
  tapPoints.value.push(p)
  tapVertexLayers.push(
    L.circleMarker(p, { radius: 7, fillColor: '#00A9A5', fillOpacity: 1, color: 'white', weight: 2 }).addTo(mapInstance)
  )
  if (tapPoints.value.length === 2) {
    if (tapPreviewLine) tapPreviewLine.remove()
    tapPreviewLine = L.polyline(tapPoints.value, { color: '#00A9A5', weight: 4, dashArray: '6, 4' }).addTo(mapInstance)
    await runHybridCount()
  }
}

async function runHybridCount() {
  if (tapPoints.value.length !== 2 || !mapInstance) return
  countingBerths.value = true
  try {
    const view = await captureMap(mapInstance, { settleMs: 800 })
    const start = tapPoints.value[0]!
    const end = tapPoints.value[1]!

    const result = await $fetch<{
      leftBerths: number
      rightBerths: number
      hasHead: boolean
      headBerths: number
      avgBerthLength: number
      avgBerthWidth: number
      confidence: number
      lengthMeters: number
    }>('/api/piers/count-berths-between', {
      method: 'POST',
      body: {
        imageBase64: view.imageBase64,
        bounds: view.bounds,
        imageWidth: view.imageWidth,
        imageHeight: view.imageHeight,
        line: [start, end],
        pierName: nextPierName()
      }
    })

    const newPier: ReviewPier = {
      name: nextPierName(),
      startLat: start[0]!,
      startLng: start[1]!,
      endLat: end[0]!,
      endLng: end[1]!,
      leftBerths: result.leftBerths,
      rightBerths: result.rightBerths,
      hasHead: result.hasHead,
      headBerths: result.headBerths,
      avgBerthLength: result.avgBerthLength,
      avgBerthWidth: result.avgBerthWidth,
      confidence: result.confidence,
      lengthMeters: result.lengthMeters
    }
    piers.value.push(newPier)
    drawPier(newPier)
    info.value = `Steiger ${newPier.name} toegevoegd (${result.leftBerths + result.rightBerths} ligplaatsen)`
  } catch (e: any) {
    error.value = e.data?.message || 'Tellen mislukt'
  } finally {
    countingBerths.value = false
    tapPoints.value = []
    clearTapPreview()
  }
}

// ─── Confirm + create ─────────────────────────────

async function confirmSetup() {
  if (!piers.value.length) {
    error.value = 'Voeg minstens één steiger toe'
    return
  }
  submitting.value = true
  error.value = null

  try {
    const center = mapInstance?.getCenter()
    const piersData = piers.value.map((p) => {
      const berths: { length: number, width: number, count: number, isPassanten: boolean, side?: 'LEFT' | 'RIGHT' | 'HEAD' }[] = []
      if (p.leftBerths > 0) {
        berths.push({ length: p.avgBerthLength, width: p.avgBerthWidth, count: p.leftBerths, isPassanten: false, side: 'LEFT' })
      }
      if (p.rightBerths > 0) {
        berths.push({ length: p.avgBerthLength, width: p.avgBerthWidth, count: p.rightBerths, isPassanten: false, side: 'RIGHT' })
      }
      if (p.hasHead && p.headBerths > 0) {
        berths.push({ length: p.avgBerthLength, width: p.avgBerthWidth, count: p.headBerths, isPassanten: false, side: 'HEAD' })
      }
      return {
        name: p.name,
        hasHead: p.hasHead,
        headBerths: p.headBerths,
        berths
      }
    })

    await $fetch('/api/onboarding/setup', {
      method: 'POST',
      body: {
        marinaName: marinaName.value,
        gpsLat: center?.lat || selectedLocation.value?.lat || null,
        gpsLng: center?.lng || selectedLocation.value?.lng || null,
        piers: piersData
      }
    })

    const discovered = await $fetch<{ marinaId: string }>('/api/berths/discover')

    for (const p of piers.value) {
      const body: { marinaId: string, name: string, points: number[][], headPoints?: number[][] } = {
        marinaId: discovered.marinaId,
        name: p.name,
        points: [[p.startLat, p.startLng], [p.endLat, p.endLng]]
      }
      if (p.hasHead && p.headStartLat != null && p.headEndLat != null) {
        body.headPoints = [[p.headStartLat, p.headStartLng!], [p.headEndLat, p.headEndLng!]]
      }
      await $fetch('/api/piers', { method: 'POST', body })
    }

    await $fetch('/api/piers/position-berths', {
      method: 'POST',
      body: { marinaId: discovered.marinaId }
    })

    await fetchMe()
    step.value = 4
  } catch (e: any) {
    error.value = e.data?.message || 'Setup mislukt'
  } finally {
    submitting.value = false
  }
}

const totalBerthCount = computed(() =>
  piers.value.reduce((s, p) => s + p.leftBerths + p.rightBerths + (p.hasHead ? p.headBerths : 0), 0)
)
</script>

<template>
  <div class="min-h-[100dvh] bg-[#F4F7F8]">
    <!-- ─── Step 1 ────────────────────────────────── -->
    <div
      v-if="step === 1"
      class="flex items-center justify-center min-h-[100dvh] p-4"
    >
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <NautarLogo
            :size="28"
            class="mx-auto mb-6"
          />
          <h1 class="text-3xl font-semibold text-[#0A1520] tracking-tight">
            Welkom.
          </h1>
          <p class="text-sm text-[#5A6A78] mt-2">
            In drie korte stappen staat je haven klaar.
          </p>
        </div>

        <div class="bg-white rounded-[20px] border border-black/[0.08] p-6 space-y-4">
          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2 block">Naam van je haven</label>
            <input
              v-model="marinaName"
              type="text"
              placeholder="bijv. Jachthaven Lands End"
              class="w-full px-4 py-3 text-base rounded-[14px] border border-black/[0.08] bg-[#F4F7F8] focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
              @keydown.enter="goToMap"
            >
          </div>

          <div>
            <label class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2 block">Locatie (optioneel)</label>
            <LocationSearchInput
              v-model="locationQuery"
              placeholder="Zoek plaats, adres of haven…"
              @pick="onLocationPick"
            />
            <p
              v-if="selectedLocation"
              class="mt-2 text-[12px] text-primary-600 inline-flex items-center gap-1"
            >
              <UIcon
                name="i-lucide-check"
                class="size-3.5"
              />
              Locatie ingesteld
            </p>
          </div>

          <button
            class="w-full py-3.5 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-50"
            :disabled="!marinaName.trim()"
            @click="goToMap"
          >
            Naar de kaart →
          </button>
        </div>

        <p class="text-center text-[11px] text-[#5A6A78] mt-4">
          Stap 1 van 3 — naam &amp; locatie
        </p>
      </div>
    </div>

    <!-- ─── Step 2 — map + scan ─────────────────────── -->
    <div
      v-if="step === 2"
      class="h-[100dvh] flex flex-col"
    >
      <div class="px-4 lg:px-6 py-3 bg-white/95 backdrop-blur-sm border-b border-black/[0.08] flex items-center justify-between shrink-0 z-[500] gap-3">
        <div class="min-w-0">
          <div class="text-base font-semibold text-[#0A1520] truncate">
            {{ marinaName }}
          </div>
          <div class="text-xs text-[#5A6A78] truncate">
            Zoom in tot je je haven duidelijk ziet
          </div>
        </div>
        <button
          class="text-[#5A6A78] hover:text-[#0A1520] text-sm shrink-0"
          @click="step = 1"
        >
          ← Terug
        </button>
      </div>

      <div
        v-if="error"
        class="px-4 py-2 bg-red-500 text-white text-center text-sm shrink-0"
      >
        {{ error }}
      </div>

      <div
        ref="mapContainer"
        class="flex-1 relative"
      >
        <!-- Optional polygon controls -->
        <div class="absolute z-[600] top-3 right-3 bg-white rounded-[12px] shadow-md border border-black/[0.08] p-3 max-w-[260px]">
          <label class="flex items-start gap-2 cursor-pointer">
            <input
              :checked="restrictArea"
              type="checkbox"
              class="mt-0.5 accent-primary-500"
              @change="restrictArea = !restrictArea; if (!restrictArea) { cancelPolygonDraw(); clearPolygon() }"
            >
            <div>
              <div class="text-[12px] font-semibold text-[#0A1520]">Beperk tot gebied</div>
              <div class="text-[11px] text-[#5A6A78] leading-snug">
                Optioneel: omcirkel het havengebied zodat AI alleen daarbinnen zoekt.
              </div>
            </div>
          </label>
          <div
            v-if="restrictArea"
            class="mt-2 flex gap-1.5"
          >
            <button
              v-if="!drawingPolygon && polygonPoints.length === 0"
              class="px-2.5 py-1 rounded-full bg-primary-500 text-white text-[11px] font-semibold"
              @click="togglePolygonDraw"
            >
              Start tekenen
            </button>
            <button
              v-if="drawingPolygon && polygonPoints.length >= 3"
              class="px-2.5 py-1 rounded-full bg-primary-500 text-white text-[11px] font-semibold"
              @click="finishPolygonDraw"
            >
              Voltooi
            </button>
            <button
              v-if="drawingPolygon || polygonPoints.length"
              class="px-2.5 py-1 rounded-full bg-[#F4F7F8] text-[#5A6A78] text-[11px] font-semibold"
              @click="cancelPolygonDraw"
            >
              Wis
            </button>
          </div>
          <div
            v-if="drawingPolygon"
            class="mt-2 text-[11px] text-primary-600"
          >
            Tik punten om je haven te omcirkelen ({{ polygonPoints.length }})
          </div>
        </div>
      </div>

      <!-- Bottom action bar -->
      <div
        class="bg-white border-t border-black/[0.08] px-4 py-3 shrink-0 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between"
        style="padding-bottom: max(env(safe-area-inset-bottom), 12px);"
      >
        <div class="text-[12px] text-[#5A6A78] sm:flex-1">
          <span v-if="aiAnalyzing">AI bekijkt je haven en zoekt steigers…</span>
          <span v-else>Klaar om te scannen? AI vindt automatisch de steigers en ligplaatsen.</span>
        </div>
        <div class="flex gap-2">
          <button
            class="px-4 py-3 rounded-full bg-[#F4F7F8] text-[#0A1520] text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
            :disabled="aiAnalyzing"
            @click="startManualMode"
          >
            <UIcon
              name="i-lucide-pencil-line"
              class="size-4"
            />
            Teken zelf
          </button>
          <button
            class="px-5 py-3 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-1.5"
            :disabled="aiAnalyzing"
            @click="runAiScan"
          >
            <UIcon
              :name="aiAnalyzing ? 'i-lucide-loader-2' : 'i-lucide-sparkles'"
              class="size-4"
              :class="aiAnalyzing ? 'animate-spin' : ''"
            />
            {{ aiAnalyzing ? 'Bezig…' : 'Scan met AI' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ─── Step 3 — review ─────────────────────────── -->
    <div
      v-if="step === 3"
      class="h-[100dvh] flex flex-col"
    >
      <div class="px-4 lg:px-6 py-3 bg-white border-b border-black/[0.08] flex items-center justify-between shrink-0 gap-3">
        <div class="min-w-0">
          <div class="text-sm font-semibold text-[#0A1520] truncate">
            {{ piers.length }} {{ piers.length === 1 ? 'steiger' : 'steigers' }} · {{ totalBerthCount }} ligplaatsen
          </div>
          <div class="text-[11px] text-[#5A6A78] truncate">
            Pas waar nodig aan, sleep eindpunten op de kaart
          </div>
        </div>
        <button
          class="text-[#5A6A78] hover:text-[#0A1520] text-sm shrink-0"
          @click="goBackToMap"
        >
          ← Terug
        </button>
      </div>

      <div
        v-if="info"
        class="px-4 py-2 bg-primary-500/10 text-primary-700 text-center text-[12px] shrink-0"
      >
        {{ info }}
        <button
          class="ml-2 text-primary-700/70"
          @click="info = null"
        >
          ×
        </button>
      </div>
      <div
        v-if="error"
        class="px-4 py-2 bg-red-500 text-white text-center text-sm shrink-0"
      >
        {{ error }}
        <button
          class="ml-2"
          @click="error = null"
        >
          ×
        </button>
      </div>

      <div class="flex-1 flex flex-col lg:flex-row min-h-0">
        <!-- Map -->
        <div
          ref="mapContainer"
          class="lg:flex-1 h-[45vh] lg:h-full relative"
        />

        <!-- Pier review sidebar -->
        <div class="lg:w-[380px] lg:shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-black/[0.08] flex flex-col min-h-0">
          <div class="px-4 py-2.5 border-b border-black/[0.08] flex items-center justify-between gap-2 shrink-0">
            <div class="text-[12px] uppercase tracking-widest text-[#5A6A78] font-semibold">
              Steigers
            </div>
            <button
              class="px-3 py-1.5 rounded-full text-[11px] font-semibold inline-flex items-center gap-1.5"
              :class="tapMode ? 'bg-primary-500 text-white' : 'bg-[#F4F7F8] text-[#0A1520]'"
              @click="tapMode ? disableTapMode() : enableTapMode()"
            >
              <UIcon
                :name="tapMode ? 'i-lucide-x' : 'i-lucide-map-pin-plus'"
                class="size-3.5"
              />
              {{ tapMode ? 'Stop' : 'Voeg toe' }}
            </button>
          </div>

          <div
            v-if="tapMode"
            class="px-4 py-2 bg-primary-500/5 border-b border-primary-500/20 text-[11px] text-primary-700 shrink-0"
          >
            <div v-if="!countingBerths">
              Tik 2 punten op de kaart per steiger ({{ tapPoints.length }}/2). AI telt de ligplaatsen.
            </div>
            <div
              v-else
              class="inline-flex items-center gap-1.5"
            >
              <UIcon
                name="i-lucide-loader-2"
                class="size-3.5 animate-spin"
              /> AI telt ligplaatsen…
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-3 space-y-2">
            <div
              v-if="!piers.length"
              class="text-center text-[12px] text-[#5A6A78] py-6"
            >
              Geen steigers gedetecteerd. Voeg er handmatig één toe via "Voeg toe".
            </div>
            <MapPierReviewCard
              v-for="(p, i) in piers"
              :key="p.name + i"
              :pier="p"
              @update="updatePier(i, $event)"
              @remove="removePier(i)"
              @rename="renamePier(i, $event)"
            />

            <div
              v-if="warnings.length"
              class="bg-amber-500/5 border border-amber-500/20 rounded-[12px] p-3"
            >
              <div class="text-[11px] font-semibold text-amber-700 mb-1">
                Opmerkingen
              </div>
              <ul class="text-[11px] text-amber-700 list-disc pl-4 space-y-0.5">
                <li
                  v-for="w in warnings"
                  :key="w"
                >
                  {{ w }}
                </li>
              </ul>
            </div>
          </div>

          <div
            class="px-4 py-3 border-t border-black/[0.08] shrink-0"
            style="padding-bottom: max(env(safe-area-inset-bottom), 12px);"
          >
            <button
              class="w-full py-3 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              :disabled="submitting || !piers.length"
              @click="confirmSetup"
            >
              <UIcon
                v-if="submitting"
                name="i-lucide-loader-2"
                class="size-4 animate-spin"
              />
              {{ submitting ? 'Bezig…' : `Maak haven aan met ${totalBerthCount} ligplaatsen →` }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ─── Step 4 — done ───────────────────────────── -->
    <div
      v-if="step === 4"
      class="flex items-center justify-center min-h-[100dvh] p-4"
    >
      <div class="text-center max-w-md">
        <div class="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-6">
          <UIcon
            name="i-lucide-check"
            class="size-10"
          />
        </div>
        <h1 class="text-3xl font-semibold text-[#0A1520] tracking-tight mb-2">
          Haven aangemaakt!
        </h1>
        <p class="text-sm text-[#5A6A78] mb-8">
          {{ marinaName }} staat klaar met {{ piers.length }} {{ piers.length === 1 ? 'steiger' : 'steigers' }}.
          Op de kaart kun je alles verfijnen en je beheer starten.
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
.pier-endpoint { background: transparent !important; border: none !important; }
.pier-label { background: transparent !important; border: none !important; }
</style>
