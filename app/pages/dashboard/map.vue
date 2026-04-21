<script setup lang="ts">
definePageMeta({ layout: 'dashboard' })

const mapContainer = ref<HTMLElement>()
let mapInstance: any = null
let maplibregl: any = null
const selectedBerth = ref<any>(null)
const slideOverOpen = ref(false)
const activePier = ref<string | null>(null)
const loading = ref(true)

// TODO: get from auth/session. Hardcoded for now.
const marinaId = ref('')

const statusColors: Record<string, string> = {
  FREE: '#10B981',
  OCCUPIED: '#EF4444',
  SEASONAL: '#F59E0B',
  STORAGE: '#8B5CF6',
  TEMPORARY: '#F97316',
  EMPTY: '#9CA3AF',
  RELOCATED: '#6366F1'
}

const statusLabels: Record<string, string> = {
  FREE: 'Vrij',
  OCCUPIED: 'Bezet',
  SEASONAL: 'Seizoen',
  STORAGE: 'Stalling',
  TEMPORARY: 'Tijdelijk',
  EMPTY: 'Leeg',
  RELOCATED: 'Verplaatst'
}

const mapData = ref<any>(null)

onMounted(async () => {
  // Dynamic import — maplibre-gl doesn't work with SSR
  const ml = await import('maplibre-gl')
  await import('maplibre-gl/dist/maplibre-gl.css')
  maplibregl = ml

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
  loading.value = false
})

async function refreshMapData() {
  if (!marinaId.value) return
  mapData.value = await $fetch('/api/map/status', { query: { marinaId: marinaId.value } })
}

function initMap() {
  if (!mapContainer.value || !maplibregl) return

  const center: [number, number] = [
    mapData.value?.marina?.gpsLng || 5.75972931,
    mapData.value?.marina?.gpsLat || 52.58038836
  ]

  const MapClass = maplibregl.Map || maplibregl.default?.Map
  if (!MapClass) {
    console.error('MapLibre Map class not found', Object.keys(maplibregl))
    return
  }

  mapInstance = new MapClass({
    container: mapContainer.value,
    style: 'https://demotiles.maplibre.org/style.json',
    center,
    zoom: 15,
    maxZoom: 20
  })

  const NavControl = maplibregl.NavigationControl || maplibregl.default?.NavigationControl
  if (NavControl) mapInstance.addControl(new NavControl(), 'top-right')

  mapInstance.on('load', () => {
    addBerthMarkers()
  })

  // Fallback: if map already loaded (style was cached)
  if (mapInstance.loaded()) {
    addBerthMarkers()
  }
}

function addBerthMarkers() {
  if (!mapInstance || !maplibregl || !mapData.value?.berths) return

  // Since berths don't have real GPS coords yet, arrange them
  // along the piers near the marina center
  const center = {
    lng: mapData.value.marina?.gpsLng || 5.75972931,
    lat: mapData.value.marina?.gpsLat || 52.58038836
  }

  const piers = [...new Set(mapData.value.berths.map(b => b.pier))].sort()
  const pierOffsets: Record<string, { lat: number; lng: number; angle: number }> = {}

  piers.forEach((pier, idx) => {
    pierOffsets[pier] = {
      lat: center.lat + (idx - piers.length / 2) * 0.0006,
      lng: center.lng - 0.001,
      angle: 0
    }
  })

  for (const berth of mapData.value.berths) {
    const pierData = pierOffsets[berth.pier]
    if (!pierData) continue

    const berthsInPier = mapData.value.berths.filter(b => b.pier === berth.pier)
    const idx = berthsInPier.indexOf(berth)

    const lng = pierData.lng + idx * 0.00025
    const lat = pierData.lat

    const color = statusColors[berth.status] || '#9CA3AF'

    const el = document.createElement('div')
    el.className = 'berth-marker'
    el.style.cssText = `
      width: 18px; height: 24px; background: ${color};
      border-radius: 4px; border: 2px solid white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      cursor: pointer; transition: transform 0.15s;
    `
    el.title = `${berth.code} — ${statusLabels[berth.status] || berth.status}`

    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.3)'
      el.style.zIndex = '10'
    })
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)'
      el.style.zIndex = '1'
    })
    el.addEventListener('click', () => openBerth(berth.id))

    const MarkerClass = maplibregl.Marker || maplibregl.default?.Marker
    new MarkerClass({ element: el })
      .setLngLat([lng, lat])
      .addTo(mapInstance)
  }
}

async function openBerth(id: string) {
  const detail = await $fetch(`/api/berths/${id}`)
  selectedBerth.value = detail
  slideOverOpen.value = true
}

async function onStatusChanged() {
  await refreshMapData()
  if (selectedBerth.value) {
    const detail = await $fetch(`/api/berths/${selectedBerth.value.id}`)
    selectedBerth.value = detail
  }
  // Rebuild markers
  document.querySelectorAll('.berth-marker').forEach(el => el.remove())
  // Remove all existing markers by re-adding
  if (mapInstance) {
    addBerthMarkers()
  }
}

async function onNoteAdded() {
  if (selectedBerth.value) {
    const detail = await $fetch(`/api/berths/${selectedBerth.value.id}`)
    selectedBerth.value = detail
  }
}

const counts = computed(() => mapData.value?.counts || {})
const piers = computed(() => {
  if (!mapData.value?.berths) return []
  return [...new Set(mapData.value.berths.map(b => b.pier))].sort()
})

const filteredBerths = computed(() => {
  if (!mapData.value?.berths) return []
  if (!activePier.value) return mapData.value.berths
  return mapData.value.berths.filter(b => b.pier === activePier.value)
})
</script>

<template>
  <div class="flex flex-col" style="height: calc(100vh)">
    <!-- Topbar -->
    <div class="px-6 py-4 bg-white border-b border-black/[0.08] flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-xl font-semibold text-[#0A1520] tracking-tight">Ligplaatskaart</h1>
        <div class="text-xs text-[#5A6A78] mt-0.5">{{ mapData?.marina?.name || 'Laden...' }}</div>
      </div>

      <div class="flex items-center gap-3">
        <!-- Pier filters -->
        <div class="flex gap-1">
          <button
            class="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            :class="!activePier ? 'bg-[#0A1520] text-white' : 'bg-[#F4F7F8] text-[#5A6A78] hover:bg-black/10'"
            @click="activePier = null"
          >
            Alle
          </button>
          <button
            v-for="pier in piers"
            :key="pier"
            class="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            :class="activePier === pier ? 'bg-[#0A1520] text-white' : 'bg-[#F4F7F8] text-[#5A6A78] hover:bg-black/10'"
            @click="activePier = activePier === pier ? null : pier"
          >
            {{ pier }}
          </button>
        </div>

        <!-- Legend pills -->
        <div class="flex gap-1.5 ml-2">
          <span
            v-for="(count, status) in counts"
            :key="status"
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-black/[0.08] text-[11px] font-medium"
          >
            <span class="w-1.5 h-1.5 rounded-full" :style="{ background: statusColors[status as string] }" />
            {{ statusLabels[status as string] }} {{ count }}
          </span>
        </div>
      </div>
    </div>

    <!-- Map -->
    <div class="flex-1 relative">
      <div ref="mapContainer" class="w-full h-full" />

      <!-- Berth list overlay (left side) -->
      <div class="absolute top-4 left-4 w-[280px] max-h-[calc(100%-32px)] bg-white/95 backdrop-blur-sm rounded-[14px] border border-black/[0.08] shadow-lg overflow-hidden flex flex-col">
        <div class="px-4 py-3 border-b border-black/[0.08]">
          <div class="text-sm font-semibold text-[#0A1520]">
            Ligplaatsen
            <span class="text-[#5A6A78] font-normal">({{ filteredBerths.length }})</span>
          </div>
        </div>
        <div class="flex-1 overflow-y-auto">
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
              <div class="text-[13px] font-semibold text-[#0A1520] truncate">{{ berth.code }}</div>
              <div class="text-[11px] text-[#5A6A78] truncate">
                {{ berth.customer?.name || (berth.boat?.name || 'Geen huurder') }}
              </div>
            </div>
            <span class="text-[10px] text-[#5A6A78]">{{ berth.length }}m</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Slide-over -->
    <MapBerthSlideOver
      v-if="selectedBerth"
      :berth="selectedBerth"
      :open="slideOverOpen"
      @close="slideOverOpen = false"
      @status-changed="onStatusChanged"
      @note-added="onNoteAdded"
    />
  </div>
</template>
