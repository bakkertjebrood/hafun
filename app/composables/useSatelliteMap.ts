// Shared Leaflet satellite map setup used by onboarding and dashboard.
//
// Returns a small helper to mount a Leaflet map with the Esri satellite layer
// and Carto labels overlay, plus a screenshot helper that captures the current
// map view at high pixel density and returns the data needed by the AI
// analyze endpoint (image base64, dimensions, GPS bounds).

export interface CapturedView {
  imageBase64: string
  imageWidth: number
  imageHeight: number
  bounds: { north: number, south: number, east: number, west: number }
  center: { lat: number, lng: number }
  zoom: number
}

export function useSatelliteMap() {
  async function loadLeaflet() {
    const leaflet = await import('leaflet')
    await import('leaflet/dist/leaflet.css')
    return (leaflet as unknown as { default?: unknown }).default || leaflet
  }

  async function mount(container: HTMLElement, opts: {
    center?: [number, number]
    zoom?: number
  } = {}) {
    const L = await loadLeaflet() as typeof import('leaflet')
    const map = L.map(container, {
      center: opts.center ?? [52.3, 5.3],
      zoom: opts.zoom ?? 8,
      maxZoom: 22,
      doubleClickZoom: false,
      zoomControl: true
    })

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: '&copy; Esri',
      maxZoom: 22,
      maxNativeZoom: 22
    }).addTo(map)

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 22,
      maxNativeZoom: 20,
      pane: 'overlayPane'
    }).addTo(map)

    return { L, map }
  }

  async function capture(map: any, opts: { settleMs?: number } = {}): Promise<CapturedView> {
    // Wait for any pending tiles to load
    await new Promise(r => setTimeout(r, opts.settleMs ?? 1200))

    const html2canvas = (await import('html2canvas-pro')).default
    const container: HTMLElement = map.getContainer()
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    const scale = Math.min(Math.max(dpr * 2, 2), 3)

    const canvas = await html2canvas(container, {
      useCORS: true,
      allowTaint: true,
      scale,
      logging: false,
      width: container.offsetWidth,
      height: container.offsetHeight
    })

    const b = map.getBounds()
    const c = map.getCenter()
    return {
      imageBase64: canvas.toDataURL('image/png'),
      imageWidth: canvas.width,
      imageHeight: canvas.height,
      bounds: {
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest()
      },
      center: { lat: c.lat, lng: c.lng },
      zoom: map.getZoom()
    }
  }

  return { mount, capture, loadLeaflet }
}
