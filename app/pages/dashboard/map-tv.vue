<script setup lang="ts">
definePageMeta({ layout: false })

const mapContainer = ref<HTMLElement>()
let mapInstance: any = null
let L: any = null
const markers: any[] = []
const pierLayers: any[] = []

const marinaId = ref('')
const mapData = ref<any>(null)
const clock = ref('')

const statusColors: Record<string, string> = {
  FREE: '#10B981', OCCUPIED: '#EF4444', PASSANT: '#EC4899', SUBLET: '#7C3AED', SEASONAL: '#F59E0B',
  STORAGE: '#8B5CF6', TEMPORARY: '#F97316', EMPTY: '#9CA3AF', RELOCATED: '#6366F1',
  MELDING: '#F43F5E'
}
const statusLabels: Record<string, string> = {
  FREE: 'Vrij', OCCUPIED: 'Klant', PASSANT: 'Passant', SUBLET: 'Tijdelijk verhuurd', SEASONAL: 'Zomer',
  STORAGE: 'Stalling', TEMPORARY: 'Tijdelijk', EMPTY: 'Leeg', RELOCATED: 'Verplaatst',
  MELDING: 'Melding'
}

function tick() {
  clock.value = new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

async function fetchMap() {
  mapData.value = await $fetch('/api/map/status', { query: { marinaId: marinaId.value } })
}

function renderBerths() {
  for (const m of markers) mapInstance.removeLayer(m)
  markers.length = 0
  if (!mapData.value?.berths) return

  for (const berth of mapData.value.berths) {
    if (berth.gpsLat == null || berth.gpsLng == null) continue
    const status = berth.displayStatus || berth.status
    const color = statusColors[status] || '#9CA3AF'

    const html = `<div style="width:14px;height:26px;background:${color};border-radius:4px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`
    const icon = L.divIcon({ html, iconSize: [18, 30], iconAnchor: [9, 15], className: 'tv-berth' })
    const m = L.marker([berth.gpsLat, berth.gpsLng], { icon }).addTo(mapInstance)
    markers.push(m)
  }
}

function renderPiers() {
  for (const p of pierLayers) mapInstance.removeLayer(p)
  pierLayers.length = 0
  // Simple: we skip pierLines hier — TV mode is read-only overview
}

onMounted(async () => {
  const leaflet = await import('leaflet')
  await import('leaflet/dist/leaflet.css')
  L = leaflet.default || leaflet

  tick(); setInterval(tick, 30_000)

  const d = await $fetch('/api/berths/discover') as any
  marinaId.value = d.marinaId
  await fetchMap()

  const center: [number, number] = [
    mapData.value?.marina?.gpsLat || 52.58038836,
    mapData.value?.marina?.gpsLng || 5.75972931
  ]

  mapInstance = L.map(mapContainer.value!, {
    center, zoom: 18, maxZoom: 22,
    zoomControl: false, attributionControl: false
  })
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 22 }).addTo(mapInstance)

  renderPiers()
  renderBerths()

  // Auto-refresh elke 60 sec
  setInterval(async () => {
    await fetchMap()
    renderBerths()
  }, 60_000)
})

const counts = computed(() => mapData.value?.counts || {})
const totalCount = computed(() => Object.values(counts.value as Record<string, number>).reduce((a, b) => a + b, 0))

onBeforeUnmount(() => {
  if (mapInstance) mapInstance.remove()
})
</script>

<template>
  <div class="h-screen w-screen bg-black text-white flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-8 py-4 bg-gradient-to-r from-[#0A1520] to-[#1F2937]">
      <div>
        <div class="text-xs uppercase tracking-widest text-white/50">{{ new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) }}</div>
        <div class="text-3xl font-semibold tracking-tight">{{ mapData?.marina?.name || 'Jachthaven' }}</div>
      </div>
      <div class="text-5xl font-mono font-semibold">{{ clock }}</div>
    </div>

    <!-- Kaart -->
    <div class="flex-1 relative">
      <div ref="mapContainer" class="absolute inset-0" />

      <!-- Legenda overlay -->
      <div class="absolute bottom-6 left-6 bg-black/70 backdrop-blur-md rounded-xl p-4 min-w-[220px]">
        <div class="text-[11px] uppercase tracking-widest text-white/50 mb-2">Overzicht — {{ totalCount }} ligplaatsen</div>
        <div class="space-y-1.5">
          <div
            v-for="(label, key) in statusLabels"
            :key="key"
            v-show="(counts[key] || 0) > 0"
            class="flex items-center justify-between text-sm"
          >
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" :style="{ background: statusColors[key] }" />
              <span>{{ label }}</span>
            </div>
            <span class="font-mono font-semibold">{{ counts[key] || 0 }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.leaflet-container { background: #111 !important; }
</style>
