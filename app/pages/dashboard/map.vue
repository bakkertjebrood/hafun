<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const mapContainer = ref<HTMLElement>()
let mapInstance: any = null
let L: any = null

const selectedBerth = ref<any>(null)
const slideOverOpen = ref(false)
const activePier = ref<string | null>(null)
const loading = ref(true)
const marinaId = ref('')
const mapData = ref<any>(null)
const editMode = ref(false)
const positioningLoading = ref(false)
const markers: any[] = []

// Pier drawing state
const drawMode = ref<'off' | 'main' | 'head'>('off')
const drawPierName = ref('')
const showPanel = ref(false) // mobile panel toggle
const drawPoints = ref<number[][]>([])
const drawHeadPoints = ref<number[][]>([])
const drawnPiers = ref<any[]>([])
const pierLayers: any[] = []
const vertexHandles: any[] = []
const drawPointMarkers: any[] = []
let drawPolyline: any = null
let drawHeadPolyline: any = null
let drawPreviewLine: any = null

const statusColors: Record<string, string> = {
  FREE: '#10B981', OCCUPIED: '#EF4444', PASSANT: '#EC4899', SEASONAL: '#F59E0B',
  STORAGE: '#8B5CF6', TEMPORARY: '#F97316', EMPTY: '#9CA3AF', RELOCATED: '#6366F1',
  MELDING: '#F43F5E'
}
const statusLabels: Record<string, string> = {
  FREE: 'Vrij', OCCUPIED: 'Klant', PASSANT: 'Passant', SEASONAL: 'Zomer',
  STORAGE: 'Stalling', TEMPORARY: 'Tijdelijk', EMPTY: 'Leeg', RELOCATED: 'Verplaatst',
  MELDING: 'Melding'
}

// Datumfilter — bekijk de bezetting op een andere dag
const viewDate = ref('')
const showLegend = ref(false)
const pierMenuFor = ref<any | null>(null)
const pierMenuPos = ref<{ x: number, y: number } | null>(null)
const pierMenuBerthCount = ref(4)
const pierMenuBerthLength = ref(10)
const pierMenuBerthBusy = ref(false)

// Facility catalog: type → label, emoji marker glyph, brand color
interface FacilityDef { label: string, glyph: string, color: string }
const FACILITY_CATALOG: Record<string, FacilityDef> = {
  SANITAIR: { label: 'Sanitair', glyph: '🚻', color: '#0EA5E9' },
  KANTINE: { label: 'Kantine', glyph: '🍴', color: '#F97316' },
  PARKEREN: { label: 'Parkeren', glyph: 'P', color: '#3B82F6' },
  HAVENMEESTER: { label: 'Havenmeester', glyph: '⚓', color: '#0A1520' },
  TANKSTATION: { label: 'Brandstof', glyph: '⛽', color: '#DC2626' },
  AFVAL: { label: 'Afval', glyph: '🗑', color: '#6B7280' },
  KRAAN: { label: 'Bootkraan', glyph: '🏗', color: '#D97706' },
  WERKPLAATS: { label: 'Werkplaats', glyph: '🔧', color: '#78716C' },
  WINKEL: { label: 'Winkel', glyph: '🛒', color: '#14B8A6' },
  TERRAS: { label: 'Terras', glyph: '☕', color: '#B45309' },
  SPEELTUIN: { label: 'Speeltuin', glyph: '🎪', color: '#EC4899' },
  WATERPUNT: { label: 'Water', glyph: '💧', color: '#0284C7' },
  STROOMPUNT: { label: 'Stroom', glyph: '⚡', color: '#EAB308' },
  WIFI: { label: 'WiFi', glyph: '📶', color: '#8B5CF6' },
  EHBO: { label: 'EHBO', glyph: '✚', color: '#EF4444' },
  HELLING: { label: 'Helling', glyph: '🚤', color: '#2563EB' },
  TOEGANG: { label: 'Toegang', glyph: '🚪', color: '#4B5563' },
  OVERIG: { label: 'Overig', glyph: '📍', color: '#64748B' }
}
const FACILITY_TYPES = Object.keys(FACILITY_CATALOG)

// Facility state
const facilities = ref<any[]>([])
const facilityLayers: any[] = []
const placingFacilityType = ref<string | null>(null)

// Bearing (0 = north, 90 = east) from A to B
function bearingOf(a: number[], b: number[]): number {
  const φ1 = a[0]! * Math.PI / 180
  const φ2 = b[0]! * Math.PI / 180
  const Δλ = (b[1]! - a[1]!) * Math.PI / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

// Overall direction of a pier (first → last point)
function pierBearing(pier: any): number {
  const pts = pier?.points as number[][] | undefined
  if (!pts || pts.length < 2) return 0
  return bearingOf(pts[0]!, pts[pts.length - 1]!)
}

onMounted(async () => {
  const leaflet = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  L = leaflet.default || leaflet

  try {
    const discovered = await $fetch('/api/berths/discover') as any
    marinaId.value = discovered.marinaId
    mapData.value = await $fetch('/api/map/status', { query: { marinaId: marinaId.value, ...(viewDate.value ? { date: viewDate.value } : {}) } })
  } catch (e) {
    console.error('Could not discover marina:', e)
  }

  await nextTick()
  initMap()
  await loadPiers()
  await loadFacilities()
  fitToData()
  loading.value = false

  if (import.meta.client) {
    window.addEventListener('keydown', onKeyDown)
  }
})

onBeforeUnmount(() => {
  if (import.meta.client) {
    window.removeEventListener('keydown', onKeyDown)
  }
})

function onKeyDown(e: KeyboardEvent) {
  if (placingFacilityType.value && e.key === 'Escape') {
    e.preventDefault()
    cancelPlacingFacility()
    return
  }
  if (drawMode.value === 'off') return
  if (e.key === 'Escape') {
    e.preventDefault()
    cancelDraw()
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    if (drawMode.value === 'main') goToHead()
    return
  }
  if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    undoLastPoint()
  }
}

async function refreshMapData() {
  if (!marinaId.value) return
  mapData.value = await $fetch('/api/map/status', { query: { marinaId: marinaId.value, ...(viewDate.value ? { date: viewDate.value } : {}) } })
}

watch(viewDate, async () => {
  await refreshMapData()
  addBerthMarkers()
})

function initMap() {
  if (!mapContainer.value || !L) return

  const center: [number, number] = [
    mapData.value?.marina?.gpsLat || 52.58038836,
    mapData.value?.marina?.gpsLng || 5.75972931
  ]

  mapInstance = L.map(mapContainer.value, { center, zoom: 17, maxZoom: 22 })

  const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; Esri, Maxar, Earthstar Geographics', maxZoom: 22, maxNativeZoom: 22
  })
  const labels = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 22, maxNativeZoom: 20, pane: 'overlayPane'
  })
  const street = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 22, maxNativeZoom: 20
  })

  satellite.addTo(mapInstance)
  labels.addTo(mapInstance)
  L.control.layers({ Satelliet: satellite, Kaart: street }, { Labels: labels }, { position: 'topright' }).addTo(mapInstance)

  mapInstance.on('click', onMapClick)
  mapInstance.on('dblclick', onMapDblClick)
  mapInstance.on('mousemove', onMapMouseMove)

  addBerthMarkers()
}

function onMapMouseMove(e: any) {
  if (drawMode.value === 'off') {
    if (drawPreviewLine) { drawPreviewLine.remove(); drawPreviewLine = null }
    return
  }
  const cursor: [number, number] = [e.latlng.lat, e.latlng.lng]
  let preview: number[][] | null = null
  if (drawMode.value === 'main' && drawPoints.value.length >= 1) {
    preview = [drawPoints.value[drawPoints.value.length - 1]!, cursor]
  } else if (drawMode.value === 'head' && drawHeadPoints.value.length === 1) {
    preview = [drawHeadPoints.value[0]!, cursor]
  }
  if (drawPreviewLine) { drawPreviewLine.remove(); drawPreviewLine = null }
  if (preview) {
    const color = drawMode.value === 'head' ? '#F59E0B' : '#00A9A5'
    drawPreviewLine = L.polyline(preview, { color, weight: 2, opacity: 0.55, dashArray: '4, 6', interactive: false }).addTo(mapInstance)
  }
}

// ─── PIER DRAWING ───────────────────────────────

async function loadPiers() {
  if (!marinaId.value) return
  drawnPiers.value = await $fetch('/api/piers', { query: { marinaId: marinaId.value } }) as any[]
  renderPierLines()
}

function midOf(points: number[][]): [number, number] {
  if (!points.length) return [0, 0]
  const a = points[0]!
  const b = points[points.length - 1]!
  return [(a[0]! + b[0]!) / 2, (a[1]! + b[1]!) / 2]
}

function renderPierLines() {
  pierLayers.forEach(l => l.remove())
  pierLayers.length = 0
  if (!mapInstance || !L) return

  for (const pier of drawnPiers.value) {
    const points = (pier.points as number[][] | null) ?? []
    if (points.length < 2) continue

    // Subtle dark "halo" beneath the colored line for visibility on busy satellite imagery.
    const halo = L.polyline(points, {
      color: '#0A1520', weight: 8, opacity: 0.35, lineCap: 'round', lineJoin: 'round'
    }).addTo(mapInstance)
    const line = L.polyline(points, {
      color: '#00A9A5', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round'
    }).addTo(mapInstance)

    const labelMid = midOf(points)
    const labelIcon = L.divIcon({
      className: 'pier-label',
      html: `<div style="
        background: #00A9A5; color: white;
        font-size: 13px; font-weight: 800; letter-spacing: 0.5px;
        width: 28px; height: 28px; line-height: 24px;
        border: 2px solid white; border-radius: 50%;
        text-align: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.5);
      ">${pier.name}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    })
    const label = L.marker(labelMid, { icon: labelIcon, interactive: false }).addTo(mapInstance)

    // Click on any segment → open the pier action menu
    const onPick = (e: any) => {
      if (!editMode.value || drawMode.value !== 'off' || placingFacilityType.value) return
      const px = mapInstance.latLngToContainerPoint(e.latlng)
      pierMenuFor.value = pier
      pierMenuPos.value = { x: px.x, y: px.y }
      L.DomEvent.stopPropagation(e)
    }
    halo.on('click', onPick)
    line.on('click', onPick)

    pierLayers.push(halo, line, label)

    const headPoints = pier.headPoints as number[][] | null
    if (headPoints && headPoints.length >= 2) {
      const headHalo = L.polyline(headPoints, {
        color: '#0A1520', weight: 7, opacity: 0.35, lineCap: 'round', lineJoin: 'round'
      }).addTo(mapInstance)
      const headLine = L.polyline(headPoints, {
        color: '#F59E0B', weight: 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round'
      }).addTo(mapInstance)
      headHalo.on('click', onPick)
      headLine.on('click', onPick)

      const headMid = midOf(headPoints)
      const headLabel = L.divIcon({
        className: 'pier-label',
        html: `<div style="
          background: #F59E0B; color: white;
          font-size: 10px; font-weight: 700;
          padding: 2px 6px; border-radius: 999px;
          border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
          white-space: nowrap;
        ">${pier.name}-KOP</div>`,
        iconAnchor: [0, 8]
      })
      const hl = L.marker(headMid, { icon: headLabel, interactive: false }).addTo(mapInstance)
      pierLayers.push(headHalo, headLine, hl)
    }
  }

  renderVertexHandles()
}

// ─── VERTEX EDITING ─────────────────────────────

function clearVertexHandles() {
  vertexHandles.forEach(h => h.remove())
  vertexHandles.length = 0
}

function renderVertexHandles() {
  clearVertexHandles()
  if (!editMode.value || drawMode.value !== 'off') return
  if (!mapInstance || !L) return

  for (const pier of drawnPiers.value) {
    const points = (pier.points as number[][] | null) ?? []
    points.forEach((pt, idx) => {
      vertexHandles.push(createVertexHandle(pt, pier, 'main', idx))
    })
    const headPoints = pier.headPoints as number[][] | null
    if (headPoints) {
      headPoints.forEach((pt, idx) => {
        vertexHandles.push(createVertexHandle(pt, pier, 'head', idx))
      })
    }
  }
}

function createVertexHandle(point: number[], pier: any, kind: 'main' | 'head', idx: number) {
  const color = kind === 'main' ? '#00A9A5' : '#F59E0B'
  const isCoarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  const size = isCoarse ? 28 : 18
  const icon = L.divIcon({
    className: 'pier-vertex',
    html: `<div style="
      width: ${size}px; height: ${size}px; background: white;
      border: 3px solid ${color}; border-radius: 50%;
      box-shadow: 0 1px 4px rgba(0,0,0,0.35);
      cursor: grab;
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
  })
  const marker = L.marker(point, { icon, draggable: true, zIndexOffset: 1000 }).addTo(mapInstance)

  marker.on('drag', (e: any) => {
    const pos = e.target.getLatLng()
    if (kind === 'main') pier.points[idx] = [pos.lat, pos.lng]
    else if (pier.headPoints) pier.headPoints[idx] = [pos.lat, pos.lng]
    // Redraw only the pier lines without destroying handles
    redrawPierLinesOnly()
  })

  marker.on('dragend', async (e: any) => {
    const pos = e.target.getLatLng()
    if (kind === 'main') pier.points[idx] = [pos.lat, pos.lng]
    else if (pier.headPoints) pier.headPoints[idx] = [pos.lat, pos.lng]
    try {
      await $fetch(`/api/piers/${pier.id}`, {
        method: 'PUT',
        body: { points: pier.points, headPoints: pier.headPoints }
      })
      await $fetch('/api/piers/position-berths', {
        method: 'POST',
        body: { marinaId: marinaId.value, pierNames: [pier.name], onlyUnpositioned: false }
      })
      await refreshMapData()
      clearMarkers()
      addBerthMarkers()
    } catch (err) {
      console.error('Vertex update failed:', err)
    }
  })

  return marker
}

function redrawPierLinesOnly() {
  pierLayers.forEach(l => l.remove())
  pierLayers.length = 0
  if (!mapInstance || !L) return

  for (const pier of drawnPiers.value) {
    const points = (pier.points as number[][] | null) ?? []
    if (points.length < 2) continue
    const line = L.polyline(points, {
      color: '#00A9A5', weight: 4, opacity: 0.8, dashArray: '8, 6'
    }).addTo(mapInstance)
    pierLayers.push(line)
    const headPoints = pier.headPoints as number[][] | null
    if (headPoints && headPoints.length >= 2) {
      const headLine = L.polyline(headPoints, {
        color: '#F59E0B', weight: 4, opacity: 0.8, dashArray: '8, 6'
      }).addTo(mapInstance)
      pierLayers.push(headLine)
    }
  }
}

function startDrawPier(name: string) {
  drawPierName.value = name
  drawPoints.value = []
  drawHeadPoints.value = []
  drawMode.value = 'main'
  mapInstance.getContainer().style.cursor = 'crosshair'
  mapInstance.doubleClickZoom.disable()
  clearVertexHandles()
}

function nextFreePierName(): string {
  const used = new Set(drawnPiers.value.map((p: any) => p.name as string))
  for (let i = 0; i < 26; i++) {
    const n = String.fromCharCode(65 + i)
    if (!used.has(n)) return n
  }
  return `S${drawnPiers.value.length + 1}`
}

function quickStartDrawPier() {
  closePierMenu()
  startDrawPier(nextFreePierName())
}

function onMapClick(e: any) {
  // Always dismiss any open pier action menu when tapping somewhere else.
  if (pierMenuFor.value) closePierMenu()
  if (placingFacilityType.value) {
    const type = placingFacilityType.value
    placeFacilityAt(type, e.latlng.lat, e.latlng.lng)
    // Keep placing mode on so multiple facilities of the same type can be placed quickly — cancel via picker or Esc
    return
  }
  if (drawMode.value === 'off') return

  const point = [e.latlng.lat, e.latlng.lng]

  if (drawMode.value === 'main') {
    drawPoints.value.push(point)
    updateDrawPreview()
    rippleAt(point, '#00A9A5')
  } else if (drawMode.value === 'head') {
    // T-head is just 2 points (start + end). Replace earlier points so the
    // user can keep tapping to refine; an explicit "Opslaan" button commits.
    if (drawHeadPoints.value.length >= 2) drawHeadPoints.value = []
    drawHeadPoints.value.push(point)
    updateDrawPreview()
    rippleAt(point, '#F59E0B')
  }
}

function onMapDblClick(e: any) {
  if (drawMode.value !== 'main') return
  e.originalEvent.preventDefault()
  goToHead()
}

function goToHead() {
  if (drawMode.value !== 'main' || drawPoints.value.length < 2) return
  drawMode.value = 'head'
  updateDrawPreview()
}

function undoLastPoint() {
  if (drawMode.value === 'main' && drawPoints.value.length > 0) {
    drawPoints.value = drawPoints.value.slice(0, -1)
    updateDrawPreview()
  } else if (drawMode.value === 'head' && drawHeadPoints.value.length > 0) {
    drawHeadPoints.value = drawHeadPoints.value.slice(0, -1)
    updateDrawPreview()
  }
}

function updateDrawPreview() {
  // Main line preview — match rendered pier styling (dark halo + solid teal)
  if (drawPolyline) drawPolyline.remove()
  if (drawPoints.value.length >= 2) {
    const halo = L.polyline(drawPoints.value, {
      color: '#0A1520', weight: 8, opacity: 0.35, lineCap: 'round', lineJoin: 'round'
    }).addTo(mapInstance)
    const main = L.polyline(drawPoints.value, {
      color: '#00A9A5', weight: 5, opacity: 0.95, lineCap: 'round', lineJoin: 'round'
    }).addTo(mapInstance)
    drawPolyline = L.layerGroup([halo, main]).addTo(mapInstance)
  }

  // Head line preview
  if (drawHeadPolyline) drawHeadPolyline.remove()
  if (drawHeadPoints.value.length >= 2) {
    const halo = L.polyline(drawHeadPoints.value, {
      color: '#0A1520', weight: 7, opacity: 0.35, lineCap: 'round', lineJoin: 'round'
    }).addTo(mapInstance)
    const main = L.polyline(drawHeadPoints.value, {
      color: '#F59E0B', weight: 4, opacity: 0.95, lineCap: 'round', lineJoin: 'round'
    }).addTo(mapInstance)
    drawHeadPolyline = L.layerGroup([halo, main]).addTo(mapInstance)
  }

  renderDrawPointMarkers()
}

function clearDrawPointMarkers() {
  drawPointMarkers.forEach(m => m.remove())
  drawPointMarkers.length = 0
}

function renderDrawPointMarkers() {
  clearDrawPointMarkers()
  if (!mapInstance || !L) return
  drawPoints.value.forEach((pt) => {
    drawPointMarkers.push(L.circleMarker(pt as any, {
      radius: 6, color: 'white', weight: 2, fillColor: '#00A9A5', fillOpacity: 1,
      interactive: false
    }).addTo(mapInstance))
  })
  drawHeadPoints.value.forEach((pt) => {
    drawPointMarkers.push(L.circleMarker(pt as any, {
      radius: 6, color: 'white', weight: 2, fillColor: '#F59E0B', fillOpacity: 1,
      interactive: false
    }).addTo(mapInstance))
  })
}

function rippleAt(point: number[], color: string) {
  if (!mapInstance || !L) return
  const icon = L.divIcon({
    className: 'pier-point-ripple',
    html: `<div class="ripple" style="--ripple-color:${color}"></div>`,
    iconSize: [60, 60],
    iconAnchor: [30, 30]
  })
  const marker = L.marker(point as any, { icon, interactive: false, zIndexOffset: 500 }).addTo(mapInstance)
  setTimeout(() => marker.remove(), 700)
}

async function finishDrawPier() {
  if (drawPoints.value.length < 2) return
  const pierName = drawPierName.value

  try {
    await $fetch('/api/piers', {
      method: 'POST',
      body: {
        marinaId: marinaId.value,
        name: pierName,
        points: drawPoints.value,
        headPoints: drawHeadPoints.value.length >= 2 ? drawHeadPoints.value : null
      }
    })
  } catch (err: any) {
    console.error('Pier opslaan mislukt:', err)
    if (typeof window !== 'undefined') {
      const msg = err?.data?.message || err?.message || 'Onbekende fout'
      window.alert(`Steiger opslaan mislukt: ${msg}`)
    }
    return
  }

  cancelDraw()
  await loadPiers()

  // Auto-position berths that still lack coords on this freshly-drawn pier
  try {
    await $fetch('/api/piers/position-berths', {
      method: 'POST',
      body: {
        marinaId: marinaId.value,
        pierNames: [pierName],
        onlyUnpositioned: true
      }
    })
    await refreshMapData()
    clearMarkers()
    addBerthMarkers()
  } catch (err) {
    console.error('Auto-position after draw failed:', err)
  }

  // Pop the pier action menu open near the freshly-drawn pier so the user
  // can immediately add ligplaatsen + assign a function. No sidebar trip needed.
  const justDrawn = drawnPiers.value.find((p: any) => p.name === pierName)
  if (justDrawn && mapInstance) {
    const points = (justDrawn.points as number[][] | null) ?? []
    if (points.length >= 2) {
      const m = midOf(points)
      const px = mapInstance.latLngToContainerPoint(L.latLng(m[0], m[1]))
      pierMenuBerthCount.value = 4
      pierMenuBerthLength.value = 10
      pierMenuFor.value = justDrawn
      pierMenuPos.value = { x: px.x, y: px.y }
    }
  }
}

function skipHead() {
  finishDrawPier()
}

function cancelDraw() {
  drawMode.value = 'off'
  drawPierName.value = ''
  drawPoints.value = []
  drawHeadPoints.value = []
  if (drawPolyline) { drawPolyline.remove(); drawPolyline = null }
  if (drawHeadPolyline) { drawHeadPolyline.remove(); drawHeadPolyline = null }
  if (drawPreviewLine) { drawPreviewLine.remove(); drawPreviewLine = null }
  clearDrawPointMarkers()
  mapInstance?.getContainer()?.style.setProperty('cursor', '')
  mapInstance?.doubleClickZoom.enable()
  renderVertexHandles()
}

async function deletePier(id: string) {
  await $fetch(`/api/piers/${id}`, { method: 'DELETE' })
  await loadPiers()
}

const offsetUpdateTimers: Record<string, any> = {}
function onOffsetInput(pier: any, value: number) {
  pier.berthOffset = value
  clearTimeout(offsetUpdateTimers[pier.id])
  offsetUpdateTimers[pier.id] = setTimeout(async () => {
    try {
      await $fetch(`/api/piers/${pier.id}`, {
        method: 'PUT',
        body: { berthOffset: value }
      })
      await $fetch('/api/piers/position-berths', {
        method: 'POST',
        body: { marinaId: marinaId.value, pierNames: [pier.name] }
      })
      await refreshMapData()
      clearMarkers()
      addBerthMarkers()
    } catch (err) {
      console.error('Offset update failed:', err)
    }
  }, 250)
}

async function flipAllSides(pier: any) {
  const pierBerths = (mapData.value?.berths || []).filter((b: any) => b.pier === pier.name && b.side !== 'HEAD')
  await Promise.all(pierBerths.map((b: any) => $fetch(`/api/berths/${b.id}`, {
    method: 'PUT',
    body: { side: b.side === 'LEFT' ? 'RIGHT' : 'LEFT' }
  })))
  await $fetch('/api/piers/position-berths', {
    method: 'POST',
    body: { marinaId: marinaId.value, pierNames: [pier.name] }
  })
  await refreshMapData()
  clearMarkers()
  addBerthMarkers()
}

// ─── POSITION BERTHS ALONG PIERS ──────────────

async function positionBerthsAlongPiers() {
  if (!marinaId.value) return
  positioningLoading.value = true
  try {
    const result = await $fetch('/api/piers/position-berths', {
      method: 'POST',
      body: { marinaId: marinaId.value }
    }) as any
    await refreshMapData()
    clearMarkers()
    addBerthMarkers()
    if (markers.length > 0) {
      const group = L.featureGroup(markers)
      mapInstance.fitBounds(group.getBounds().pad(0.1))
    }
  } catch (e: any) {
    console.error('Positioning failed:', e)
    alert(e.data?.message || 'Positionering mislukt')
  } finally {
    positioningLoading.value = false
  }
}

// ─── BERTH MARKERS ──────────────────────────────

function clearMarkers() {
  markers.forEach(m => m.remove())
  markers.length = 0
}

function addBerthMarkers() {
  if (!mapInstance || !L || !mapData.value?.berths) return
  clearMarkers()

  const pierByName: Record<string, any> = {}
  for (const p of drawnPiers.value) pierByName[p.name] = p

  const isEdit = editMode.value

  for (const berth of mapData.value.berths) {
    // Skip berths without coordinates — no more floating placeholder grid
    if (berth.gpsLat == null || berth.gpsLng == null) continue
    const lat = berth.gpsLat
    const lng = berth.gpsLng

    const status = berth.displayStatus || berth.status
    const color = statusColors[status] || '#9CA3AF'
    const pier = pierByName[berth.pier]
    // Boat lies perpendicular to pier; rectangle long axis = pier bearing + 90°
    const rot = pier ? (pierBearing(pier) + 90) : 0

    // Rectangle size: represent boat (long axis) perpendicular to pier
    const isCoarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
    const touchBoost = isEdit && isCoarse ? 1.5 : 1
    const w = Math.round((isEdit ? 14 : 10) * touchBoost) // beam (px)
    const h = Math.round((isEdit ? 28 : 20) * touchBoost) // length (px)

    // Side badge color
    const sideColor = berth.side === 'LEFT'
      ? '#3B82F6'
      : berth.side === 'RIGHT'
        ? '#EC4899'
        : berth.side === 'HEAD'
          ? '#F59E0B'
          : '#94A3B8'

    const html = `
      <div class="berth-marker-rot" style="transform: rotate(${rot}deg); transform-origin: center; width: ${w}px; height: ${h}px;">
        <div class="berth-marker" style="
          width: 100%; height: 100%; background: ${color};
          border-radius: 3px; border: 2px solid ${isEdit ? sideColor : 'white'};
          box-shadow: 0 1px 4px rgba(0,0,0,0.35);
          cursor: ${isEdit ? 'grab' : 'pointer'};
          transition: transform 0.15s;
          position: relative;
        " title="${berth.code} — ${statusLabels[status] || status}">
          ${isEdit ? `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:white;font-size:8px;font-weight:700;text-shadow:0 0 2px #000;transform: rotate(${-rot}deg);">${berthShortCode(berth.code)}</div>` : ''}
        </div>
      </div>
    `

    const icon = L.divIcon({
      className: 'berth-marker-wrapper',
      html,
      iconSize: [w, h],
      iconAnchor: [w / 2, h / 2]
    })

    const marker = L.marker([lat, lng], { icon, draggable: isEdit }).addTo(mapInstance)

    if (isEdit) {
      let dragged = false
      marker.on('dragstart', () => { dragged = false })
      marker.on('drag', () => { dragged = true })
      marker.on('dragend', async (e: any) => {
        const pos = e.target.getLatLng()
        berth.gpsLat = pos.lat
        berth.gpsLng = pos.lng
        await $fetch(`/api/berths/${berth.id}`, {
          method: 'PUT',
          body: { gpsLat: pos.lat, gpsLng: pos.lng }
        })
      })
      marker.on('click', async () => {
        if (dragged) { dragged = false; return }
        await flipBerthSide(berth)
      })
    } else {
      marker.on('click', () => openBerth(berth.id))
    }

    marker.on('mouseover', (e: any) => {
      e.target.getElement()?.querySelector('.berth-marker')?.style.setProperty('transform', 'scale(1.25)')
    })
    marker.on('mouseout', (e: any) => {
      e.target.getElement()?.querySelector('.berth-marker')?.style.setProperty('transform', 'scale(1)')
    })

    markers.push(marker)
  }
}

// Extract short code (e.g. "A01-12m" → "A01", "B-KOP-3" → "B3")
function berthShortCode(code: string): string {
  const m = code.match(/^([A-Za-z]+)[^0-9]*?(\d+)/)
  if (m) return `${m[1]}${m[2]}`
  return code.slice(0, 4)
}

async function flipBerthSide(berth: any) {
  const current = berth.side || (berth.code.toUpperCase().includes('KOP') ? 'HEAD' : 'LEFT')
  let next: 'LEFT' | 'RIGHT' | 'HEAD'
  if (current === 'LEFT') next = 'RIGHT'
  else if (current === 'RIGHT') next = 'LEFT'
  else next = 'LEFT' // HEAD flips to LEFT
  try {
    await $fetch(`/api/berths/${berth.id}`, {
      method: 'PUT',
      body: { side: next }
    })
    // Recompute layout for this pier only
    await $fetch('/api/piers/position-berths', {
      method: 'POST',
      body: { marinaId: marinaId.value, pierNames: [berth.pier] }
    })
    await refreshMapData()
    clearMarkers()
    addBerthMarkers()
  } catch (err) {
    console.error('Flip side failed:', err)
  }
}

function toggleEditMode() {
  editMode.value = !editMode.value
  if (!editMode.value) {
    cancelDraw()
    cancelPlacingFacility()
    closePierMenu()
  }
  addBerthMarkers()
  renderVertexHandles()
  renderFacilityMarkers()
}

function fitToData() {
  if (!mapInstance || !L) return
  const layers: any[] = []
  for (const pier of drawnPiers.value) {
    const pts = (pier.points as number[][] | null) ?? []
    if (pts.length >= 2) layers.push(L.polyline(pts))
    const hp = pier.headPoints as number[][] | null
    if (hp && hp.length >= 2) layers.push(L.polyline(hp))
  }
  for (const berth of mapData.value?.berths || []) {
    if (berth.gpsLat != null && berth.gpsLng != null) {
      layers.push(L.marker([berth.gpsLat, berth.gpsLng]))
    }
  }
  if (layers.length) {
    const group = L.featureGroup(layers)
    mapInstance.fitBounds(group.getBounds().pad(0.15), { maxZoom: 20 })
  }
}

async function openBerth(id: string) {
  const detail = await $fetch(`/api/berths/${id}`)
  selectedBerth.value = detail
  slideOverOpen.value = true
}

watch(slideOverOpen, async () => {
  await nextTick()
  setTimeout(() => mapInstance?.invalidateSize(), 260)
})

async function onStatusChanged() {
  await refreshMapData()
  clearMarkers()
  addBerthMarkers()
  if (selectedBerth.value) {
    selectedBerth.value = await $fetch(`/api/berths/${selectedBerth.value.id}`)
  }
}

async function onNoteAdded() {
  if (selectedBerth.value) {
    selectedBerth.value = await $fetch(`/api/berths/${selectedBerth.value.id}`)
  }
}

const counts = computed(() => mapData.value?.counts || {})
const pierNames = computed<string[]>(() => {
  const fromPiers = drawnPiers.value.map((p: any) => p.name as string)
  const fromBerths = (mapData.value?.berths || []).map((b: any) => b.pier as string)
  return [...new Set([...fromPiers, ...fromBerths])].sort()
})
const berthCountByPier = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const b of (mapData.value?.berths || [])) {
    counts[b.pier] = (counts[b.pier] || 0) + 1
  }
  return counts
})
const passantenCountByPier = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {}
  for (const b of (mapData.value?.berths || [])) {
    if (b.isPassanten) counts[b.pier] = (counts[b.pier] || 0) + 1
  }
  return counts
})
const filteredBerths = computed(() => {
  if (!mapData.value?.berths) return []
  if (!activePier.value) return mapData.value.berths
  return mapData.value.berths.filter((b: any) => b.pier === activePier.value)
})
const unpositionedBerths = computed<any[]>(() => {
  if (!mapData.value?.berths) return []
  return mapData.value.berths.filter((b: any) => b.gpsLat == null || b.gpsLng == null)
})
const unpositionedCount = computed(() => unpositionedBerths.value.length)

// ─── DRAG & DROP ONGEPLAATSTE LIGPLAATSEN ──────
const draggingBerthId = ref<string | null>(null)

function onDragStartBerth(e: DragEvent, berth: any) {
  if (!e.dataTransfer) return
  draggingBerthId.value = berth.id
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/berth-id', berth.id)
}

function onDragEndBerth() {
  draggingBerthId.value = null
}

function onMapDragOver(e: DragEvent) {
  if (!draggingBerthId.value && !e.dataTransfer?.types.includes('text/berth-id')) return
  if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
}

async function onMapDrop(e: DragEvent) {
  const id = e.dataTransfer?.getData('text/berth-id') || draggingBerthId.value
  draggingBerthId.value = null
  if (!id || !mapInstance || !mapContainer.value) return

  const rect = mapContainer.value.getBoundingClientRect()
  const point = [e.clientX - rect.left, e.clientY - rect.top] as [number, number]
  const latlng = mapInstance.containerPointToLatLng(point)

  try {
    await $fetch(`/api/berths/${id}`, {
      method: 'PUT',
      body: { gpsLat: latlng.lat, gpsLng: latlng.lng, side: null }
    })
    await refreshMapData()
    addBerthMarkers()
  } catch (err) {
    console.error('Kon ligplaats niet plaatsen', err)
  }
}

// ─── PIER/BERTH MANAGEMENT (edit mode) ───────────

const showAddPier = ref(false)
const addPierName = ref('')
const addPierHasHead = ref(false)
const addPierSaving = ref(false)

const showAddBerth = ref<string | null>(null) // pier name or null
const addBerthCount = ref(4)
const addBerthLength = ref(10)
const addBerthWidth = ref(3.5)
const addBerthPassanten = ref(false)
const addBerthSaving = ref(false)

function nextPierName(): string {
  const existing = new Set(pierNames.value.map(n => n.toUpperCase()))
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i)
    if (!existing.has(letter)) return letter
  }
  return `S${pierNames.value.length + 1}`
}

function openAddPier() {
  addPierName.value = nextPierName()
  addPierHasHead.value = false
  showAddPier.value = true
}

async function createPier() {
  const name = addPierName.value.trim()
  if (!name || !marinaId.value) return
  addPierSaving.value = true
  try {
    await $fetch('/api/piers', {
      method: 'POST',
      body: {
        marinaId: marinaId.value,
        name,
        headPoints: addPierHasHead.value ? [] : null
      }
    })
    showAddPier.value = false
    await loadPiers()
    await refreshMapData()
    // Open add-berth panel for the new pier right away
    openAddBerth(name)
  } catch (e: any) {
    alert(e?.data?.message || 'Steiger toevoegen mislukt')
  } finally {
    addPierSaving.value = false
  }
}

function openAddBerth(pierName: string) {
  showAddBerth.value = pierName
  addBerthCount.value = 4
  addBerthLength.value = 10
  addBerthWidth.value = 3.5
  addBerthPassanten.value = false
}

async function createBerths() {
  const pier = showAddBerth.value
  if (!pier) return
  addBerthSaving.value = true
  try {
    await $fetch('/api/berths/bulk', {
      method: 'POST',
      body: {
        pier,
        count: addBerthCount.value,
        length: addBerthLength.value,
        width: addBerthWidth.value,
        isPassanten: addBerthPassanten.value
      }
    })
    showAddBerth.value = null
    await refreshMapData()
    // If pier is already drawn, position the new berths
    const pierRec = drawnPiers.value.find((p: any) => p.name === pier)
    if (pierRec && Array.isArray(pierRec.points) && pierRec.points.length >= 2) {
      await $fetch('/api/piers/position-berths', {
        method: 'POST',
        body: { marinaId: marinaId.value, pierNames: [pier], onlyUnpositioned: true }
      })
      await refreshMapData()
    }
    clearMarkers()
    addBerthMarkers()
  } catch (e: any) {
    alert(e?.data?.message || 'Ligplaatsen toevoegen mislukt')
  } finally {
    addBerthSaving.value = false
  }
}

async function togglePierPassanten(pier: any) {
  const current = passantenCountByPier.value[pier.name] || 0
  const total = berthCountByPier.value[pier.name] || 0
  const allPassanten = total > 0 && current === total
  try {
    await $fetch(`/api/piers/${pier.id}/passanten`, {
      method: 'PUT',
      body: { isPassanten: !allPassanten }
    })
    await refreshMapData()
  } catch (e: any) {
    alert(e?.data?.message || 'Passanten wijzigen mislukt')
  }
}

function closePierMenu() {
  pierMenuFor.value = null
  pierMenuPos.value = null
}

async function addBerthsFromMenu(pier: any) {
  if (!marinaId.value || !pier?.name) return
  const count = Math.max(1, Math.min(200, Math.floor(pierMenuBerthCount.value)))
  const length = Math.max(2, Math.min(60, pierMenuBerthLength.value))
  pierMenuBerthBusy.value = true
  try {
    // Spread evenly across LEFT and RIGHT so position-berths places them on both sides.
    const left = Math.ceil(count / 2)
    const right = count - left
    if (left > 0) {
      await $fetch('/api/berths/bulk', {
        method: 'POST',
        body: { marinaId: marinaId.value, pier: pier.name, count: left, length, width: 3.5, side: 'LEFT' }
      })
    }
    if (right > 0) {
      await $fetch('/api/berths/bulk', {
        method: 'POST',
        body: { marinaId: marinaId.value, pier: pier.name, count: right, length, width: 3.5, side: 'RIGHT' }
      })
    }
    await $fetch('/api/piers/position-berths', {
      method: 'POST',
      body: { marinaId: marinaId.value, pierNames: [pier.name], onlyUnpositioned: true }
    })
    await refreshMapData()
    clearMarkers()
    addBerthMarkers()
    closePierMenu()
  } catch (e: any) {
    alert(e?.data?.message || 'Toevoegen mislukt')
  } finally {
    pierMenuBerthBusy.value = false
  }
}

async function assignPierFunction(pier: any, kind: 'PASSANTEN' | 'JAARPLAATS' | 'STALLING' | 'SEIZOEN') {
  const body: { pierName: string, isPassanten?: boolean, status?: string } = { pierName: pier.name }
  if (kind === 'PASSANTEN') {
    body.isPassanten = true
    body.status = 'FREE'
  } else if (kind === 'JAARPLAATS') {
    body.isPassanten = false
    body.status = 'FREE'
  } else if (kind === 'STALLING') {
    body.isPassanten = false
    body.status = 'STORAGE'
  } else if (kind === 'SEIZOEN') {
    body.isPassanten = false
    body.status = 'SEASONAL'
  }
  try {
    await $fetch('/api/piers/assign-function', { method: 'POST', body })
    await refreshMapData()
    clearMarkers()
    addBerthMarkers()
    closePierMenu()
  } catch (e: any) {
    alert(e?.data?.message || 'Functie toewijzen mislukt')
  }
}

async function renamePierFromMenu(pier: any) {
  const next = prompt(`Nieuwe naam voor steiger ${pier.name}:`, pier.name)
  if (!next || next.trim() === pier.name) return
  const trimmed = next.trim().toUpperCase()
  if (drawnPiers.value.some((p: any) => p.id !== pier.id && p.name === trimmed)) {
    alert(`Naam "${trimmed}" is al in gebruik`)
    return
  }
  try {
    await $fetch(`/api/piers/${pier.id}`, { method: 'PUT', body: { name: trimmed } })
    await loadPiers()
    await refreshMapData()
    clearMarkers()
    addBerthMarkers()
    closePierMenu()
  } catch (e: any) {
    alert(e?.data?.message || 'Hernoemen mislukt')
  }
}

async function deletePierWithConfirm(pier: any) {
  const count = berthCountByPier.value[pier.name] || 0
  const msg = count > 0
    ? `Steiger ${pier.name} heeft ${count} ligplaats${count === 1 ? '' : 'en'}. Alles verwijderen?`
    : `Steiger ${pier.name} verwijderen?`
  if (!confirm(msg)) return
  try {
    await $fetch(`/api/piers/${pier.id}${count > 0 ? '?cascade=1' : ''}`, { method: 'DELETE' })
    await loadPiers()
    await refreshMapData()
    clearMarkers()
    addBerthMarkers()
  } catch (e: any) {
    alert(e?.data?.message || 'Verwijderen mislukt')
  }
}

async function deleteBerthWithConfirm(berth: any) {
  if (!confirm(`Ligplaats ${berth.code} verwijderen?`)) return
  try {
    await $fetch(`/api/berths/${berth.id}`, { method: 'DELETE' })
    if (selectedBerth.value?.id === berth.id) {
      slideOverOpen.value = false
      selectedBerth.value = null
    }
    await refreshMapData()
    clearMarkers()
    addBerthMarkers()
  } catch (e: any) {
    alert(e?.data?.message || 'Verwijderen mislukt')
  }
}

// ─── FACILITIES ───────────────────────────────

async function loadFacilities() {
  if (!marinaId.value) return
  try {
    facilities.value = await $fetch('/api/facilities', { query: { marinaId: marinaId.value } }) as any[]
    renderFacilityMarkers()
  } catch (e) {
    console.error('Kon faciliteiten niet laden:', e)
  }
}

function clearFacilityMarkers() {
  facilityLayers.forEach(l => l.remove())
  facilityLayers.length = 0
}

function facilityIconHtml(type: string, opts?: { ghost?: boolean, dim?: boolean }): string {
  const def = FACILITY_CATALOG[type] || FACILITY_CATALOG.OVERIG!
  const isGhost = opts?.ghost
  const bg = isGhost ? 'rgba(255,255,255,0.75)' : def.color
  const fg = isGhost ? def.color : 'white'
  const border = isGhost ? `2px dashed ${def.color}` : `2px solid white`
  const opacity = opts?.dim ? '0.55' : '1'
  return `
    <div class="facility-badge" style="
      width: 32px; height: 32px; border-radius: 50%;
      background: ${bg}; color: ${fg};
      border: ${border};
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      display: flex; align-items: center; justify-content: center;
      font-size: 16px; font-weight: 700; line-height: 1;
      opacity: ${opacity};
    ">${def.glyph}</div>`
}

function renderFacilityMarkers() {
  clearFacilityMarkers()
  if (!mapInstance || !L) return
  const isEdit = editMode.value

  for (const f of facilities.value) {
    const icon = L.divIcon({
      className: 'facility-marker-wrapper',
      html: facilityIconHtml(f.type),
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    })
    const marker = L.marker([f.gpsLat, f.gpsLng], {
      icon, draggable: isEdit, zIndexOffset: 500
    }).addTo(mapInstance)

    const label = f.name || FACILITY_CATALOG[f.type]?.label || f.type
    marker.bindTooltip(label, { direction: 'top', offset: [0, -14], opacity: 0.9 })

    if (isEdit) {
      let dragged = false
      marker.on('dragstart', () => { dragged = false })
      marker.on('drag', () => { dragged = true })
      marker.on('dragend', async (e: any) => {
        const pos = e.target.getLatLng()
        f.gpsLat = pos.lat
        f.gpsLng = pos.lng
        try {
          await $fetch(`/api/facilities/${f.id}`, {
            method: 'PUT', body: { gpsLat: pos.lat, gpsLng: pos.lng }
          })
        } catch (err) {
          console.error('Faciliteit verplaatsen mislukt:', err)
        }
      })
      marker.on('click', () => {
        if (dragged) { dragged = false; return }
        editFacility(f)
      })
    }

    facilityLayers.push(marker)
  }
}

async function placeFacilityAt(type: string, lat: number, lng: number) {
  if (!marinaId.value) return
  try {
    const created = await $fetch('/api/facilities', {
      method: 'POST',
      body: { marinaId: marinaId.value, type, gpsLat: lat, gpsLng: lng }
    }) as any
    facilities.value.push(created)
    renderFacilityMarkers()
  } catch (e: any) {
    alert(e?.data?.message || 'Faciliteit plaatsen mislukt')
  }
}

function startPlacingFacility(type: string) {
  placingFacilityType.value = placingFacilityType.value === type ? null : type
  if (mapInstance) {
    mapInstance.getContainer().style.cursor = placingFacilityType.value ? 'crosshair' : ''
  }
}

function cancelPlacingFacility() {
  placingFacilityType.value = null
  if (mapInstance) mapInstance.getContainer().style.cursor = ''
}

async function editFacility(f: any) {
  const def = FACILITY_CATALOG[f.type]
  const currentName = f.name || ''
  const action = prompt(
    `${def?.label || f.type}\n\nNaam (leeg = standaardnaam), typ "verwijder" om te verwijderen:`,
    currentName
  )
  if (action === null) return
  const trimmed = action.trim()
  if (trimmed.toLowerCase() === 'verwijder') {
    await deleteFacility(f)
    return
  }
  try {
    const updated = await $fetch(`/api/facilities/${f.id}`, {
      method: 'PUT', body: { name: trimmed || null }
    }) as any
    Object.assign(f, updated)
    renderFacilityMarkers()
  } catch (e: any) {
    alert(e?.data?.message || 'Bewerken mislukt')
  }
}

async function deleteFacility(f: any) {
  try {
    await $fetch(`/api/facilities/${f.id}`, { method: 'DELETE' })
    facilities.value = facilities.value.filter(x => x.id !== f.id)
    renderFacilityMarkers()
  } catch (e: any) {
    alert(e?.data?.message || 'Verwijderen mislukt')
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Topbar -->
    <div class="px-4 lg:px-6 py-2.5 lg:py-3 bg-white border-b border-black/[0.08] flex items-center justify-between shrink-0 gap-2">
      <div class="shrink-0">
        <h1 class="text-base lg:text-xl font-semibold text-[#0A1520] tracking-tight">
          Kaart
        </h1>
      </div>

      <div class="flex items-center gap-1.5 overflow-x-auto">
        <!-- Pier filters -->
        <div class="flex gap-1 shrink-0">
          <button
            v-for="pier in pierNames"
            :key="pier"
            class="px-2 py-1 rounded-full text-[10px] lg:text-[11px] font-medium transition-all"
            :class="activePier === pier ? 'bg-[#0A1520] text-white' : 'bg-[#F4F7F8] text-[#5A6A78]'"
            @click="activePier = activePier === pier ? null : pier"
          >
            {{ pier }}
          </button>
        </div>

        <!-- Actions (desktop only — mobile uses FAB) -->
        <button
          class="px-2.5 py-1 rounded-full text-[10px] lg:text-xs font-semibold transition-all shrink-0"
          :class="editMode ? 'bg-primary-500 text-white' : 'bg-[#F4F7F8] text-[#5A6A78]'"
          @click="toggleEditMode"
        >
          {{ editMode ? 'Klaar' : 'Bewerken' }}
        </button>

        <!-- Date filter -->
        <div class="flex items-center gap-1 shrink-0">
          <input
            v-model="viewDate"
            type="date"
            title="Bezetting op datum"
            class="px-2 py-1 text-[11px] rounded-md border border-black/[0.08] bg-white"
          >
          <button
            v-if="viewDate"
            class="text-[10px] text-[#5A6A78] hover:text-[#0A1520] px-1"
            title="Datumfilter opheffen"
            @click="viewDate = ''"
          >
            ×
          </button>
        </div>

        <button
          class="px-2 py-1 rounded-full text-[10px] lg:text-xs font-semibold bg-[#F4F7F8] text-[#5A6A78] shrink-0"
          :class="showLegend ? '!bg-primary-500/10 !text-primary-600' : ''"
          title="Legenda"
          @click="showLegend = !showLegend"
        >
          Legenda
        </button>

        <NuxtLink
          to="/dashboard/map-tv"
          target="_blank"
          class="hidden lg:inline-flex px-2 py-1 rounded-full text-[10px] lg:text-xs font-semibold bg-[#F4F7F8] text-[#5A6A78] shrink-0 items-center gap-1"
          title="TV-modus (fullscreen)"
        >
          <UIcon
            name="i-lucide-tv"
            class="size-3"
          /> TV
        </NuxtLink>

        <!-- Status counts (hidden on small mobile) -->
        <div class="hidden sm:flex gap-1">
          <span
            v-for="(count, status) in counts"
            v-show="(count as number) > 0"
            :key="status"
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white border border-black/[0.08] text-[9px] lg:text-[10px] font-medium"
          >
            <span
              class="w-1.5 h-1.5 rounded-full"
              :style="{ background: statusColors[status as string] }"
            />
            {{ count }}
          </span>
        </div>
      </div>
    </div>

    <!-- Legenda-paneel -->
    <div
      v-if="showLegend"
      class="absolute z-[500] right-4 top-20 bg-white/95 backdrop-blur-sm border border-black/[0.08] rounded-[12px] shadow-lg p-3 w-[200px]"
    >
      <div class="flex items-center justify-between mb-2">
        <div class="text-[11px] uppercase tracking-widest text-[#5A6A78] font-semibold">
          Legenda
        </div>
        <button
          class="text-[#5A6A78] hover:text-[#0A1520]"
          @click="showLegend = false"
        >
          <UIcon
            name="i-lucide-x"
            class="size-3.5"
          />
        </button>
      </div>
      <div
        v-if="viewDate"
        class="text-[10px] text-primary-600 mb-2"
      >
        Bezetting op {{ new Date(viewDate).toLocaleDateString('nl-NL') }}
      </div>
      <div class="space-y-1">
        <div
          v-for="(label, key) in statusLabels"
          :key="key"
          class="flex items-center justify-between text-[11px]"
        >
          <div class="flex items-center gap-1.5">
            <span
              class="w-2.5 h-2.5 rounded-full shrink-0"
              :style="{ background: statusColors[key] }"
            />
            <span class="text-[#0A1520]">{{ label }}</span>
          </div>
          <span class="font-mono font-semibold text-[#5A6A78]">{{ counts[key] ?? 0 }}</span>
        </div>
      </div>
    </div>

    <!-- Draw mode bar -->
    <div
      v-if="drawMode !== 'off'"
      class="px-3 lg:px-6 py-2.5 bg-primary-500 text-white flex items-center justify-between shrink-0 gap-2 flex-wrap"
    >
      <div class="flex items-center gap-2 min-w-0">
        <span class="text-[13px] lg:text-sm font-semibold truncate">
          Steiger {{ drawPierName }}
          <span
            v-if="drawMode === 'main'"
            class="font-normal opacity-90"
          >— klik punten ({{ drawPoints.length }})</span>
          <span
            v-if="drawMode === 'head'"
            class="font-normal opacity-90"
          >— klik 2 kop-punten ({{ drawHeadPoints.length }}/2)</span>
        </span>
      </div>
      <div class="flex gap-1.5 shrink-0">
        <button
          class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/15 hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
          :disabled="drawMode === 'main' ? drawPoints.length === 0 : drawHeadPoints.length === 0"
          title="Laatste punt ongedaan maken (Ctrl+Z)"
          @click="undoLastPoint"
        >
          <UIcon
            name="i-lucide-undo-2"
            class="size-3.5"
          />
          <span class="hidden sm:inline">Ongedaan</span>
        </button>
        <button
          v-if="drawMode === 'main'"
          class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white text-primary-600 hover:bg-white/90 disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="drawPoints.length < 2"
          title="Hoofdlijn afronden (Enter of dubbelklik)"
          @click="goToHead"
        >
          Afronden
        </button>
        <button
          v-if="drawMode === 'head' && drawHeadPoints.length >= 2"
          class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white text-primary-600 hover:bg-white/90"
          title="Steiger met T-kop opslaan"
          @click="finishDrawPier"
        >
          Opslaan met T-kop
        </button>
        <button
          v-if="drawMode === 'head'"
          class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/15 hover:bg-white/25"
          @click="skipHead"
        >
          Geen T-kop
        </button>
        <button
          class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/15 hover:bg-white/25"
          title="Annuleren (Esc)"
          @click="cancelDraw"
        >
          Annuleer
        </button>
      </div>
    </div>

    <!-- Map + inline slide-over -->
    <div class="flex-1 flex overflow-hidden min-h-0">
      <!-- Mobile backdrop -->
      <div
        v-if="showPanel"
        class="lg:hidden fixed inset-0 z-[990] bg-black/30"
        @click="showPanel = false"
      />
      <!-- Left panel: berths OR pier tools (inline on desktop, overlay on mobile) -->
      <div
        class="bg-white border-r border-black/[0.08] flex flex-col overflow-y-auto transition-transform duration-300 fixed top-0 left-0 h-full w-[280px] z-[1000] shadow-lg lg:static lg:inset-auto lg:h-full lg:z-auto lg:shadow-none lg:shrink-0 lg:translate-x-0"
        :class="showPanel ? 'translate-x-0' : '-translate-x-full'"
      >
        <!-- Mobile close button -->
        <button
          class="lg:hidden absolute top-2 right-2 z-10 w-8 h-8 rounded-full hover:bg-black/[0.05] flex items-center justify-center"
          aria-label="Sluiten"
          @click="showPanel = false"
        >
          <UIcon name="i-lucide-x" class="size-5 text-[#0A1520]" />
        </button>
        <!-- Edit mode: pier drawing tools -->
        <template v-if="editMode">
          <div class="px-4 py-3 border-b border-black/[0.08]">
            <div class="text-sm font-semibold text-[#0A1520]">
              Steigers beheren
            </div>
            <div class="text-[11px] text-[#5A6A78] mt-0.5">
              Voeg steigers en ligplaatsen toe, teken ze op de kaart, of pas bestaande aan.
            </div>
            <div
              v-if="unpositionedCount > 0"
              class="mt-2 text-[11px] text-[#B45309] bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1.5"
            >
              {{ unpositionedCount }} ligplaats{{ unpositionedCount === 1 ? '' : 'en' }} nog niet op de kaart. Sleep ze hieronder naar de kaart, teken een steiger, of klik "Plaats berths".
            </div>
          </div>

          <!-- Drag-list: unpositioned berths -->
          <div
            v-if="unpositionedCount > 0"
            class="px-3 py-2 border-b border-black/[0.08]"
          >
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">
              Sleep naar kaart ({{ unpositionedCount }})
            </div>
            <div class="flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto">
              <div
                v-for="berth in unpositionedBerths"
                :key="berth.id"
                draggable="true"
                class="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-[11px] font-semibold text-[#B45309] cursor-grab active:cursor-grabbing select-none"
                :class="{ 'opacity-40': draggingBerthId === berth.id }"
                :title="`Sleep ${berth.code} naar een positie op de kaart`"
                @dragstart="onDragStartBerth($event, berth)"
                @dragend="onDragEndBerth"
              >
                <UIcon
                  name="i-lucide-grip-vertical"
                  class="size-3 opacity-60"
                />
                <span>{{ berth.code }}</span>
                <span class="opacity-70 font-normal">{{ berth.length }}m</span>
              </div>
            </div>
          </div>

          <!-- Add pier -->
          <div class="p-3 border-b border-black/[0.08]">
            <button
              v-if="!showAddPier"
              class="w-full py-2 rounded-[10px] border border-dashed border-primary-500/40 text-primary-500 text-sm font-semibold hover:bg-primary-500/5"
              @click="openAddPier"
            >
              + Nieuwe steiger
            </button>
            <div
              v-else
              class="flex flex-col gap-2"
            >
              <label class="flex items-center gap-2">
                <span class="text-[11px] text-[#5A6A78] w-14">Naam</span>
                <input
                  v-model="addPierName"
                  type="text"
                  maxlength="8"
                  class="flex-1 px-2 py-1.5 rounded-md border border-black/[0.12] bg-white text-sm font-semibold text-[#0A1520]"
                >
              </label>
              <label class="flex items-center gap-1.5 text-xs text-[#2D3E4A] cursor-pointer">
                <input
                  v-model="addPierHasHead"
                  type="checkbox"
                  class="accent-primary-500"
                >
                T-kop (kopsteiger aan het eind)
              </label>
              <div class="flex gap-2">
                <button
                  class="flex-1 py-1.5 rounded-md bg-primary-500 text-white text-xs font-semibold disabled:opacity-50"
                  :disabled="addPierSaving || !addPierName.trim()"
                  @click="createPier"
                >
                  {{ addPierSaving ? 'Bezig...' : 'Maak aan' }}
                </button>
                <button
                  class="px-3 py-1.5 rounded-md bg-[#F4F7F8] text-[#5A6A78] text-xs font-medium hover:bg-black/5"
                  @click="showAddPier = false"
                >
                  Annuleer
                </button>
              </div>
            </div>
          </div>

          <!-- All piers (drawn or not) -->
          <div
            v-if="pierNames.length"
            class="px-3 py-2"
          >
            <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-2">
              Steigers ({{ pierNames.length }})
            </div>
            <div
              v-for="name in pierNames"
              :key="name"
              class="py-2 border-t border-black/[0.05] first:border-t-0"
            >
              <div class="flex items-center justify-between text-xs mb-1.5">
                <span class="font-medium text-[#0A1520]">
                  Steiger {{ name }}
                  <span
                    v-if="drawnPiers.find(p => p.name === name)?.headPoints"
                    class="text-[#F59E0B]"
                  >+ T-kop</span>
                  <span class="text-[10px] text-[#5A6A78] ml-1">
                    {{ berthCountByPier[name] || 0 }} plaatsen
                    <span
                      v-if="(passantenCountByPier[name] || 0) > 0"
                      class="text-primary-500"
                    >
                      · {{ passantenCountByPier[name] }} passanten
                    </span>
                  </span>
                </span>
                <button
                  v-if="drawnPiers.find(p => p.name === name)"
                  class="text-red-400 hover:text-red-600 text-[10px]"
                  @click="deletePierWithConfirm(drawnPiers.find(p => p.name === name))"
                >
                  Verwijder
                </button>
              </div>

              <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
                <button
                  class="px-2 py-1 rounded-md text-[10px] font-semibold transition-all"
                  :class="drawnPiers.find(p => p.name === name)
                    ? 'bg-primary-500/10 text-primary-500 hover:bg-primary-500/20'
                    : 'bg-primary-500 text-white hover:bg-primary-600'"
                  @click="startDrawPier(name)"
                >
                  {{ drawnPiers.find(p => p.name === name) ? 'Herteken' : 'Teken op kaart' }}
                </button>
                <button
                  class="px-2 py-1 rounded-md bg-[#F4F7F8] text-[#0A1520] text-[10px] font-semibold hover:bg-black/5"
                  @click="openAddBerth(name)"
                >
                  + Ligplaatsen
                </button>
                <button
                  v-if="drawnPiers.find(p => p.name === name)"
                  class="px-2 py-1 rounded-md text-[10px] font-semibold"
                  :class="(berthCountByPier[name] || 0) > 0 && passantenCountByPier[name] === berthCountByPier[name]
                    ? 'bg-primary-500/10 text-primary-500'
                    : 'bg-[#F4F7F8] text-[#5A6A78] hover:bg-black/5'"
                  :title="'Alle ligplaatsen als passanten markeren'"
                  @click="togglePierPassanten(drawnPiers.find(p => p.name === name))"
                >
                  Passanten
                </button>
                <button
                  v-if="drawnPiers.find(p => p.name === name)"
                  class="px-2 py-1 rounded-md bg-[#F4F7F8] text-[#0A1520] text-[10px] font-semibold hover:bg-black/5"
                  title="Wissel alle ligplaatsen tussen links en rechts"
                  @click="flipAllSides(drawnPiers.find(p => p.name === name))"
                >
                  ⇄ Flip
                </button>
              </div>

              <div
                v-if="drawnPiers.find(p => p.name === name)"
                class="flex items-center gap-2"
              >
                <span class="text-[10px] text-[#5A6A78] shrink-0">
                  Breedte {{ (drawnPiers.find(p => p.name === name)?.berthOffset ?? 3.5).toFixed(1) }} m
                </span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="0.5"
                  :value="drawnPiers.find(p => p.name === name)?.berthOffset ?? 3.5"
                  class="flex-1 accent-primary-500 h-6"
                  @input="(e: any) => onOffsetInput(drawnPiers.find(p => p.name === name), parseFloat(e.target.value))"
                >
              </div>

              <!-- Inline add-berths form -->
              <div
                v-if="showAddBerth === name"
                class="mt-2 p-3 rounded-[10px] bg-white border border-black/[0.12] flex flex-col gap-2.5"
              >
                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <label class="text-[9px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Aantal</label>
                    <input
                      v-model.number="addBerthCount"
                      type="number"
                      min="1"
                      max="200"
                      class="w-full px-2 py-1.5 rounded-[8px] border border-black/[0.12] bg-[#F4F7F8] text-sm text-[#0A1520] font-medium text-center focus:outline-none focus:border-primary-500"
                    >
                  </div>
                  <div>
                    <label class="text-[9px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Lengte (m)</label>
                    <input
                      v-model.number="addBerthLength"
                      type="number"
                      min="2"
                      max="60"
                      step="0.5"
                      class="w-full px-2 py-1.5 rounded-[8px] border border-black/[0.12] bg-[#F4F7F8] text-sm text-[#0A1520] font-medium text-center focus:outline-none focus:border-primary-500"
                    >
                  </div>
                  <div>
                    <label class="text-[9px] uppercase tracking-widest text-[#5A6A78] font-semibold mb-1 block">Breedte (m)</label>
                    <input
                      v-model.number="addBerthWidth"
                      type="number"
                      min="1"
                      max="20"
                      step="0.5"
                      class="w-full px-2 py-1.5 rounded-[8px] border border-black/[0.12] bg-[#F4F7F8] text-sm text-[#0A1520] font-medium text-center focus:outline-none focus:border-primary-500"
                    >
                  </div>
                </div>
                <label class="flex items-center gap-2 text-xs cursor-pointer">
                  <input
                    v-model="addBerthPassanten"
                    type="checkbox"
                    class="accent-primary-500 w-4 h-4"
                  >
                  <span class="text-[#0A1520] font-medium">Passantenplaatsen</span>
                </label>
                <div class="flex gap-1.5">
                  <button
                    class="flex-1 py-1 rounded bg-primary-500 text-white text-[10px] font-semibold disabled:opacity-50"
                    :disabled="addBerthSaving || addBerthCount < 1"
                    @click="createBerths"
                  >
                    {{ addBerthSaving ? 'Bezig...' : `+ ${addBerthCount} ligplaatsen` }}
                  </button>
                  <button
                    class="px-2 py-1 rounded bg-[#F4F7F8] text-[#5A6A78] text-[10px] hover:bg-black/5"
                    @click="showAddBerth = null"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Position berths button -->
          <div
            v-if="drawnPiers.length"
            class="p-3 border-t border-black/[0.08]"
          >
            <button
              class="w-full py-2 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-50"
              :disabled="positioningLoading"
              @click="positionBerthsAlongPiers"
            >
              {{ positioningLoading ? 'Bezig...' : 'Plaats berths op steigers' }}
            </button>
          </div>

          <!-- Facilities (sanitair, kantine, parkeren, …) -->
          <div class="p-3 border-t border-black/[0.08]">
            <div class="flex items-center justify-between mb-2">
              <div class="text-[10px] uppercase tracking-widest text-[#5A6A78] font-semibold">
                Faciliteiten ({{ facilities.length }})
              </div>
            </div>

            <div class="text-[11px] text-[#5A6A78] mb-2">
              Klik op een icoon, klik dan op de kaart om te plaatsen. Klik een icoon op de kaart om te hernoemen of te verwijderen.
            </div>

            <!-- Type picker grid -->
            <div class="grid grid-cols-4 gap-1.5 mb-2">
              <button
                v-for="type in FACILITY_TYPES"
                :key="type"
                class="aspect-square rounded-[10px] flex flex-col items-center justify-center gap-0.5 border transition-all text-[9px] font-medium"
                :class="placingFacilityType === type
                  ? 'bg-primary-500 text-white border-primary-500 shadow-md'
                  : 'bg-white border-black/[0.08] text-[#5A6A78] hover:bg-black/[0.03]'"
                :title="FACILITY_CATALOG[type]?.label"
                @click="startPlacingFacility(type)"
              >
                <span class="text-base leading-none">{{ FACILITY_CATALOG[type]?.glyph }}</span>
                <span class="truncate max-w-full px-0.5">{{ FACILITY_CATALOG[type]?.label }}</span>
              </button>
            </div>

            <div
              v-if="placingFacilityType"
              class="rounded-md bg-primary-500/10 border border-primary-500/20 px-2 py-1.5 text-[11px] text-primary-600 flex items-center justify-between gap-2 mb-2"
            >
              <span class="truncate">
                Klik op de kaart om <strong>{{ FACILITY_CATALOG[placingFacilityType]?.label }}</strong> te plaatsen
              </span>
              <button
                class="text-[10px] underline shrink-0"
                @click="cancelPlacingFacility"
              >
                Stop
              </button>
            </div>

            <!-- Existing facilities list -->
            <div
              v-if="facilities.length"
              class="flex flex-col gap-0.5 max-h-[200px] overflow-y-auto"
            >
              <div
                v-for="f in facilities"
                :key="f.id"
                class="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-black/[0.03]"
              >
                <span class="text-base leading-none">{{ FACILITY_CATALOG[f.type]?.glyph || '📍' }}</span>
                <span class="flex-1 min-w-0 truncate text-[11px] text-[#0A1520]">
                  {{ f.name || FACILITY_CATALOG[f.type]?.label || f.type }}
                </span>
                <button
                  class="text-[9px] text-red-500 hover:text-red-700 shrink-0"
                  @click="deleteFacility(f)"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- Normal mode: berth list -->
        <template v-else>
          <div class="px-4 py-3 border-b border-black/[0.08]">
            <div class="text-sm font-semibold text-[#0A1520]">
              Ligplaatsen
              <span class="text-[#5A6A78] font-normal">({{ filteredBerths.length }})</span>
            </div>
          </div>
          <div class="flex-1 overflow-y-auto max-h-[600px]">
            <button
              v-for="berth in filteredBerths"
              :key="berth.id"
              class="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.03] transition-colors text-left"
              @click="openBerth(berth.id)"
            >
              <span
                class="w-2.5 h-2.5 rounded-sm shrink-0"
                :style="{ background: statusColors[berth.status] }"
              />
              <div class="flex-1 min-w-0">
                <div class="text-[13px] font-semibold text-[#0A1520] truncate">
                  {{ berth.code }}
                </div>
                <div class="text-[11px] text-[#5A6A78] truncate">
                  {{ berth.customer?.name || 'Geen huurder' }}
                </div>
              </div>
              <span class="text-[10px] text-[#5A6A78]">{{ berth.length }}m</span>
            </button>
          </div>
        </template>
      </div>

      <!-- Map area -->
      <div
        class="flex-1 relative min-w-0"
        @dragover.prevent="onMapDragOver"
        @drop.prevent="onMapDrop"
      >
        <div
          ref="mapContainer"
          class="w-full h-full"
        />

        <!-- Mobile panel toggle (only shown when closed; close lives inside the panel) -->
        <button
          v-if="!showPanel"
          class="lg:hidden absolute top-3 left-3 z-[800] w-10 h-10 bg-white/95 backdrop-blur-sm rounded-full border border-black/[0.08] shadow-lg flex items-center justify-center"
          aria-label="Ligplaatsen openen"
          @click="showPanel = true"
        >
          <UIcon name="i-lucide-list" class="size-5 text-[#0A1520]" />
        </button>

        <!-- Edit mode floating "+ Steiger" button -->
        <button
          v-if="editMode && drawMode === 'off' && !pierMenuFor && !placingFacilityType"
          class="absolute z-[1050] bottom-4 left-4 lg:left-6 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-primary-500 text-white text-sm font-semibold shadow-xl hover:bg-primary-600"
          @click="quickStartDrawPier"
        >
          <UIcon
            name="i-lucide-plus"
            class="size-4"
          />
          Nieuwe steiger
        </button>

        <!-- Pier action menu (tap a pier in edit mode) -->
        <div
          v-if="pierMenuFor && pierMenuPos"
          class="absolute z-[1100] bg-white rounded-[14px] shadow-2xl border border-black/[0.08] p-3 w-[260px]"
          :style="{
            left: Math.min(Math.max(pierMenuPos.x - 130, 8), (mapInstance?.getContainer()?.offsetWidth ?? 0) - 268) + 'px',
            top: Math.min(pierMenuPos.y + 16, (mapInstance?.getContainer()?.offsetHeight ?? 0) - 290) + 'px'
          }"
          @click.stop
        >
          <div class="flex items-center justify-between mb-2.5">
            <div class="inline-flex items-center gap-2 min-w-0">
              <div class="w-7 h-7 rounded-full bg-primary-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                {{ pierMenuFor.name }}
              </div>
              <div class="text-sm font-semibold text-[#0A1520] truncate">
                Steiger {{ pierMenuFor.name }}
              </div>
            </div>
            <button
              class="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center"
              @click="closePierMenu"
            >
              <UIcon
                name="i-lucide-x"
                class="size-3.5"
              />
            </button>
          </div>

          <div
            v-if="(berthCountByPier[pierMenuFor.name] || 0) === 0"
            class="bg-[#F4F7F8] rounded-[10px] p-2.5 mb-2.5"
          >
            <div class="text-[10px] uppercase tracking-wide text-[#5A6A78] font-semibold mb-1.5">
              Voeg ligplaatsen toe
            </div>
            <div class="flex items-center gap-2 mb-1.5">
              <label class="flex items-center gap-1 text-[11px] text-[#5A6A78]">
                Aantal
                <input
                  v-model.number="pierMenuBerthCount"
                  type="number"
                  min="1"
                  max="100"
                  class="w-14 px-2 py-1 rounded-md border border-black/[0.12] bg-white text-sm font-semibold text-[#0A1520]"
                >
              </label>
              <label class="flex items-center gap-1 text-[11px] text-[#5A6A78]">
                Lengte
                <input
                  v-model.number="pierMenuBerthLength"
                  type="number"
                  min="4"
                  max="30"
                  class="w-12 px-2 py-1 rounded-md border border-black/[0.12] bg-white text-sm font-semibold text-[#0A1520]"
                ><span class="text-[11px] text-[#5A6A78]">m</span>
              </label>
            </div>
            <button
              class="w-full py-1.5 rounded-full bg-primary-500 text-white text-[12px] font-semibold disabled:opacity-50"
              :disabled="pierMenuBerthBusy"
              @click="addBerthsFromMenu(pierMenuFor)"
            >
              {{ pierMenuBerthBusy ? 'Bezig…' : `+ ${pierMenuBerthCount} ligplaatsen` }}
            </button>
          </div>

          <div class="text-[10px] uppercase tracking-wide text-[#5A6A78] font-semibold mb-1.5">
            Maak alle ligplaatsen
          </div>
          <div class="grid grid-cols-2 gap-1.5 mb-2">
            <button
              class="px-2.5 py-2 rounded-[10px] bg-pink-500/10 text-pink-700 text-[12px] font-semibold hover:bg-pink-500/20"
              @click="assignPierFunction(pierMenuFor, 'PASSANTEN')"
            >
              Passanten
            </button>
            <button
              class="px-2.5 py-2 rounded-[10px] bg-emerald-500/10 text-emerald-700 text-[12px] font-semibold hover:bg-emerald-500/20"
              @click="assignPierFunction(pierMenuFor, 'JAARPLAATS')"
            >
              Jaarplaats
            </button>
            <button
              class="px-2.5 py-2 rounded-[10px] bg-amber-500/10 text-amber-700 text-[12px] font-semibold hover:bg-amber-500/20"
              @click="assignPierFunction(pierMenuFor, 'SEIZOEN')"
            >
              Seizoen
            </button>
            <button
              class="px-2.5 py-2 rounded-[10px] bg-purple-500/10 text-purple-700 text-[12px] font-semibold hover:bg-purple-500/20"
              @click="assignPierFunction(pierMenuFor, 'STALLING')"
            >
              Stalling
            </button>
          </div>

          <div class="border-t border-black/[0.06] pt-2 flex gap-1.5">
            <button
              class="flex-1 px-2.5 py-1.5 rounded-full bg-[#F4F7F8] text-[#0A1520] text-[11px] font-semibold inline-flex items-center justify-center gap-1 hover:bg-black/5"
              @click="renamePierFromMenu(pierMenuFor)"
            >
              <UIcon
                name="i-lucide-pencil"
                class="size-3"
              /> Hernoem
            </button>
            <button
              class="flex-1 px-2.5 py-1.5 rounded-full bg-red-500/5 text-red-600 text-[11px] font-semibold inline-flex items-center justify-center gap-1 hover:bg-red-500/10"
              @click="deletePierWithConfirm(pierMenuFor); closePierMenu()"
            >
              <UIcon
                name="i-lucide-trash-2"
                class="size-3"
              /> Verwijder
            </button>
          </div>
        </div>
      </div>

      <!-- Slide-over: inline on desktop, overlay on mobile -->
      <MapBerthSlideOver
        v-if="selectedBerth"
        :berth="selectedBerth"
        :open="slideOverOpen"
        :edit-mode="editMode"
        @close="slideOverOpen = false"
        @status-changed="onStatusChanged"
        @note-added="onNoteAdded"
        @passanten-changed="onStatusChanged"
        @delete-requested="deleteBerthWithConfirm(selectedBerth)"
      />
    </div>
  </div>
</template>

<style>
.berth-marker-wrapper, .pier-label, .facility-marker-wrapper, .pier-vertex, .pier-endpoint, .pier-point-ripple {
  background: none !important;
  border: none !important;
}
.pier-point-ripple .ripple {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid var(--ripple-color, #00A9A5);
  background: color-mix(in srgb, var(--ripple-color, #00A9A5) 25%, transparent);
  animation: pier-ripple 0.7s ease-out forwards;
  pointer-events: none;
  transform-origin: center;
}
@keyframes pier-ripple {
  0%   { transform: scale(0.15); opacity: 1; }
  100% { transform: scale(1);    opacity: 0; }
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
@media (max-width: 1023px) {
  .leaflet-top.leaflet-left {
    top: 60px;
  }
}
</style>
