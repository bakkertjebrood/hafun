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
let drawPolyline: any = null
let drawHeadPolyline: any = null
let drawPreviewLine: any = null

const statusColors: Record<string, string> = {
  FREE: '#10B981', OCCUPIED: '#EF4444', SEASONAL: '#F59E0B',
  STORAGE: '#8B5CF6', TEMPORARY: '#F97316', EMPTY: '#9CA3AF', RELOCATED: '#6366F1'
}
const statusLabels: Record<string, string> = {
  FREE: 'Vrij', OCCUPIED: 'Bezet', SEASONAL: 'Seizoen',
  STORAGE: 'Stalling', TEMPORARY: 'Tijdelijk', EMPTY: 'Leeg', RELOCATED: 'Verplaatst'
}

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
    mapData.value = await $fetch('/api/map/status', { query: { marinaId: marinaId.value } })
  }
  catch (e) {
    console.error('Could not discover marina:', e)
  }

  await nextTick()
  initMap()
  await loadPiers()
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
  mapData.value = await $fetch('/api/map/status', { query: { marinaId: marinaId.value } })
}

function initMap() {
  if (!mapContainer.value || !L) return

  const center: [number, number] = [
    mapData.value?.marina?.gpsLat || 52.58038836,
    mapData.value?.marina?.gpsLng || 5.75972931
  ]

  mapInstance = L.map(mapContainer.value, { center, zoom: 17, maxZoom: 19 })

  const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; Esri, Maxar, Earthstar Geographics', maxZoom: 19
  })
  const labels = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd', maxZoom: 19, pane: 'overlayPane'
  })
  const street = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO', subdomains: 'abcd', maxZoom: 19
  })

  satellite.addTo(mapInstance)
  labels.addTo(mapInstance)
  L.control.layers({ 'Satelliet': satellite, 'Kaart': street }, { 'Labels': labels }, { position: 'topright' }).addTo(mapInstance)

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
  }
  else if (drawMode.value === 'head' && drawHeadPoints.value.length === 1) {
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

function renderPierLines() {
  pierLayers.forEach(l => l.remove())
  pierLayers.length = 0
  if (!mapInstance || !L) return

  for (const pier of drawnPiers.value) {
    const points = (pier.points as number[][] | null) ?? []
    if (points.length < 2) continue

    const line = L.polyline(points, {
      color: '#00A9A5', weight: 4, opacity: 0.8, dashArray: '8, 6'
    }).addTo(mapInstance)

    const labelIcon = L.divIcon({
      className: 'pier-label',
      html: `<div style="
        background: #00A9A5; color: white; font-size: 11px; font-weight: 700;
        padding: 2px 8px; border-radius: 999px; white-space: nowrap;
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      ">Steiger ${pier.name}</div>`,
      iconAnchor: [-8, 12]
    })
    const label = L.marker(points[0], { icon: labelIcon, interactive: false }).addTo(mapInstance)

    pierLayers.push(line, label)

    const headPoints = pier.headPoints as number[][] | null
    if (headPoints && headPoints.length >= 2) {
      const headLine = L.polyline(headPoints, {
        color: '#F59E0B', weight: 4, opacity: 0.8, dashArray: '8, 6'
      }).addTo(mapInstance)

      const headLabel = L.divIcon({
        className: 'pier-label',
        html: `<div style="
          background: #F59E0B; color: white; font-size: 10px; font-weight: 700;
          padding: 2px 6px; border-radius: 999px; white-space: nowrap;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3);
        ">${pier.name}-KOP</div>`,
        iconAnchor: [-8, 12]
      })
      const hl = L.marker(headPoints[0], { icon: headLabel, interactive: false }).addTo(mapInstance)
      pierLayers.push(headLine, hl)
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
  const icon = L.divIcon({
    className: 'pier-vertex',
    html: `<div style="
      width: 16px; height: 16px; background: white;
      border: 3px solid ${color}; border-radius: 50%;
      box-shadow: 0 1px 4px rgba(0,0,0,0.35);
      cursor: grab;
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
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
    }
    catch (err) {
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

function onMapClick(e: any) {
  if (drawMode.value === 'off') return

  const point = [e.latlng.lat, e.latlng.lng]

  if (drawMode.value === 'main') {
    drawPoints.value.push(point)
    updateDrawPreview()
  }
  else if (drawMode.value === 'head') {
    drawHeadPoints.value.push(point)
    updateDrawPreview()
    // T-head is just 2 points (start + end)
    if (drawHeadPoints.value.length >= 2) {
      finishDrawPier()
    }
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
  }
  else if (drawMode.value === 'head' && drawHeadPoints.value.length > 0) {
    drawHeadPoints.value = drawHeadPoints.value.slice(0, -1)
    updateDrawPreview()
  }
}

function updateDrawPreview() {
  // Main line preview
  if (drawPolyline) drawPolyline.remove()
  if (drawPoints.value.length >= 2) {
    drawPolyline = L.polyline(drawPoints.value, {
      color: '#00A9A5', weight: 5, opacity: 0.9
    }).addTo(mapInstance)
  }

  // Head line preview
  if (drawHeadPolyline) drawHeadPolyline.remove()
  if (drawHeadPoints.value.length >= 1) {
    const pts = drawHeadPoints.value.length >= 2 ? drawHeadPoints.value : [...drawHeadPoints.value]
    if (pts.length >= 2) {
      drawHeadPolyline = L.polyline(pts, {
        color: '#F59E0B', weight: 5, opacity: 0.9
      }).addTo(mapInstance)
    }
  }
}

async function finishDrawPier() {
  if (drawPoints.value.length < 2) return
  const pierName = drawPierName.value

  await $fetch('/api/piers', {
    method: 'POST',
    body: {
      marinaId: marinaId.value,
      name: pierName,
      points: drawPoints.value,
      headPoints: drawHeadPoints.value.length >= 2 ? drawHeadPoints.value : null
    }
  })

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
  }
  catch (err) {
    console.error('Auto-position after draw failed:', err)
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
    }
    catch (err) {
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
  }
  catch (e: any) {
    console.error('Positioning failed:', e)
    alert(e.data?.message || 'Positionering mislukt')
  }
  finally {
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

    const color = statusColors[berth.status] || '#9CA3AF'
    const pier = pierByName[berth.pier]
    // Boat lies perpendicular to pier; rectangle long axis = pier bearing + 90°
    const rot = pier ? (pierBearing(pier) + 90) : 0

    // Rectangle size: represent boat (long axis) perpendicular to pier
    const w = isEdit ? 14 : 10 // beam (px)
    const h = isEdit ? 28 : 20 // length (px)

    // Side badge color
    const sideColor = berth.side === 'LEFT' ? '#3B82F6'
      : berth.side === 'RIGHT' ? '#EC4899'
        : berth.side === 'HEAD' ? '#F59E0B'
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
        " title="${berth.code} — ${statusLabels[berth.status]}">
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
        await $fetch(`/api/berths/${berth.id}`, {
          method: 'PUT',
          body: { gpsLat: pos.lat, gpsLng: pos.lng }
        })
      })
      marker.on('click', async () => {
        if (dragged) { dragged = false; return }
        await flipBerthSide(berth)
      })
    }
    else {
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
  }
  catch (err) {
    console.error('Flip side failed:', err)
  }
}

function toggleEditMode() {
  editMode.value = !editMode.value
  if (!editMode.value) cancelDraw()
  addBerthMarkers()
  renderVertexHandles()
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
    mapInstance.fitBounds(group.getBounds().pad(0.15), { maxZoom: 19 })
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
const unpositionedCount = computed(() => {
  if (!mapData.value?.berths) return 0
  return mapData.value.berths.filter((b: any) => b.gpsLat == null || b.gpsLng == null).length
})

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
  }
  catch (e: any) {
    alert(e?.data?.message || 'Steiger toevoegen mislukt')
  }
  finally {
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
  }
  catch (e: any) {
    alert(e?.data?.message || 'Ligplaatsen toevoegen mislukt')
  }
  finally {
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
  }
  catch (e: any) {
    alert(e?.data?.message || 'Passanten wijzigen mislukt')
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
  }
  catch (e: any) {
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
  }
  catch (e: any) {
    alert(e?.data?.message || 'Verwijderen mislukt')
  }
}
</script>

<template>
  <div class="flex flex-col" style="height: 100vh">
    <!-- Topbar -->
    <div class="px-4 lg:px-6 py-2.5 lg:py-3 bg-white border-b border-black/[0.08] flex items-center justify-between shrink-0 gap-2">
      <div class="shrink-0">
        <h1 class="text-base lg:text-xl font-semibold text-[#0A1520] tracking-tight">Kaart</h1>
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

        <!-- Actions -->
        <button
          class="px-2.5 py-1 rounded-full text-[10px] lg:text-xs font-semibold transition-all shrink-0"
          :class="editMode ? 'bg-primary-500 text-white' : 'bg-[#F4F7F8] text-[#5A6A78]'"
          @click="toggleEditMode"
        >
          {{ editMode ? 'Klaar' : 'Bewerken' }}
        </button>

        <!-- Status counts (hidden on small mobile) -->
        <div class="hidden sm:flex gap-1">
          <span
            v-for="(count, status) in counts"
            :key="status"
            v-show="(count as number) > 0"
            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-white border border-black/[0.08] text-[9px] lg:text-[10px] font-medium"
          >
            <span class="w-1.5 h-1.5 rounded-full" :style="{ background: statusColors[status as string] }" />
            {{ count }}
          </span>
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
          <span v-if="drawMode === 'main'" class="font-normal opacity-90">— klik punten ({{ drawPoints.length }})</span>
          <span v-if="drawMode === 'head'" class="font-normal opacity-90">— klik 2 kop-punten ({{ drawHeadPoints.length }}/2)</span>
        </span>
      </div>
      <div class="flex gap-1.5 shrink-0">
        <button
          class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/15 hover:bg-white/25 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1"
          :disabled="drawMode === 'main' ? drawPoints.length === 0 : drawHeadPoints.length === 0"
          title="Laatste punt ongedaan maken (Ctrl+Z)"
          @click="undoLastPoint"
        >
          <UIcon name="i-lucide-undo-2" class="size-3.5" />
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
          v-if="drawMode === 'head'"
          class="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white text-primary-600 hover:bg-white/90"
          @click="skipHead"
        >
          Geen T-kop, opslaan
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
      <div class="flex-1 relative min-w-0">
      <div ref="mapContainer" class="w-full h-full" />

      <!-- Mobile panel toggle -->
      <button
        class="lg:hidden absolute top-3 left-3 z-[1001] w-10 h-10 bg-white/95 backdrop-blur-sm rounded-full border border-black/[0.08] shadow-lg flex items-center justify-center"
        @click="showPanel = !showPanel"
      >
        <UIcon :name="showPanel ? 'i-lucide-x' : 'i-lucide-list'" class="size-5 text-[#0A1520]" />
      </button>

      <!-- Left panel: berths OR pier tools -->
      <div
        class="absolute z-[1000] bg-white/95 backdrop-blur-sm border border-black/[0.08] shadow-lg overflow-hidden flex flex-col transition-transform duration-300"
        :class="[
          showPanel ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          'top-0 left-0 w-[280px] max-h-full lg:top-4 lg:left-4 lg:max-h-[calc(100%-32px)] lg:rounded-[14px] rounded-r-[14px]'
        ]"
      >
        <!-- Edit mode: pier drawing tools -->
        <template v-if="editMode">
          <div class="px-4 py-3 border-b border-black/[0.08]">
            <div class="text-sm font-semibold text-[#0A1520]">Steigers beheren</div>
            <div class="text-[11px] text-[#5A6A78] mt-0.5">
              Voeg steigers en ligplaatsen toe, teken ze op de kaart, of pas bestaande aan.
            </div>
            <div
              v-if="unpositionedCount > 0"
              class="mt-2 text-[11px] text-[#B45309] bg-amber-500/10 border border-amber-500/20 rounded-md px-2 py-1.5"
            >
              {{ unpositionedCount }} ligplaats{{ unpositionedCount === 1 ? '' : 'en' }} nog niet op de kaart. Teken de bijbehorende steiger of klik "Plaats berths".
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
            <div v-else class="flex flex-col gap-2">
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
                <input v-model="addPierHasHead" type="checkbox" class="accent-primary-500">
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
          <div v-if="pierNames.length" class="px-3 py-2">
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
                  <span v-if="drawnPiers.find(p => p.name === name)?.headPoints" class="text-[#F59E0B]">+ T-kop</span>
                  <span class="text-[10px] text-[#5A6A78] ml-1">
                    {{ berthCountByPier[name] || 0 }} plaatsen
                    <span v-if="(passantenCountByPier[name] || 0) > 0" class="text-primary-500">
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
                class="mt-2 p-2 rounded-md bg-[#FAFBFC] border border-black/[0.08] flex flex-col gap-1.5"
              >
                <div class="flex items-center gap-1.5">
                  <label class="flex items-center gap-1 text-[10px]">
                    <span class="text-[#5A6A78]">Aantal</span>
                    <input
                      v-model.number="addBerthCount"
                      type="number"
                      min="1"
                      max="200"
                      class="w-14 px-1.5 py-0.5 rounded border border-black/[0.12] bg-white text-xs text-center"
                    >
                  </label>
                  <label class="flex items-center gap-1 text-[10px]">
                    <input
                      v-model.number="addBerthLength"
                      type="number"
                      min="2"
                      max="60"
                      step="0.5"
                      class="w-12 px-1.5 py-0.5 rounded border border-black/[0.12] bg-white text-xs text-center"
                    >
                    <span class="text-[#5A6A78]">m</span>
                  </label>
                  <label class="flex items-center gap-1 text-[10px]">
                    <input
                      v-model.number="addBerthWidth"
                      type="number"
                      min="1"
                      max="20"
                      step="0.5"
                      class="w-12 px-1.5 py-0.5 rounded border border-black/[0.12] bg-white text-xs text-center"
                    >
                    <span class="text-[#5A6A78]">br.</span>
                  </label>
                </div>
                <label class="flex items-center gap-1 text-[10px] cursor-pointer">
                  <input v-model="addBerthPassanten" type="checkbox" class="accent-primary-500">
                  <span class="text-[#2D3E4A]">Passantenplaatsen</span>
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
          <div v-if="drawnPiers.length" class="p-3 border-t border-black/[0.08]">
            <button
              class="w-full py-2 rounded-full bg-primary-500 text-white text-sm font-semibold disabled:opacity-50"
              :disabled="positioningLoading"
              @click="positionBerthsAlongPiers"
            >
              {{ positioningLoading ? 'Bezig...' : 'Plaats berths op steigers' }}
            </button>
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
              <span class="w-2.5 h-2.5 rounded-sm shrink-0" :style="{ background: statusColors[berth.status] }" />
              <div class="flex-1 min-w-0">
                <div class="text-[13px] font-semibold text-[#0A1520] truncate">{{ berth.code }}</div>
                <div class="text-[11px] text-[#5A6A78] truncate">{{ berth.customer?.name || 'Geen huurder' }}</div>
              </div>
              <span class="text-[10px] text-[#5A6A78]">{{ berth.length }}m</span>
            </button>
          </div>
        </template>
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
.berth-marker-wrapper, .pier-label {
  background: none !important;
  border: none !important;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
