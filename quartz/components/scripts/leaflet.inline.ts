type LeafletMapElement = HTMLElement & {
  dataset: HTMLElement["dataset"] & {
    leafletImage?: string
    leafletLat?: string
    leafletLong?: string
    leafletMinZoom?: string
    leafletMaxZoom?: string
    leafletDefaultZoom?: string
    leafletScale?: string
    leafletInit?: string
  }
}

const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"

const initializedMaps = new WeakMap<LeafletMapElement, any>()
let leafletPromise: Promise<any> | null = null

function registerCleanup(fn: () => void) {
  if (typeof window.addCleanup === "function") {
    window.addCleanup(fn)
  }
}

function ensureLeafletCss() {
  if (document.querySelector('link[data-leaflet="css"]')) {
    return
  }
  const link = document.createElement("link")
  link.rel = "stylesheet"
  link.href = LEAFLET_CSS_URL
  link.setAttribute("data-leaflet", "css")
  document.head.appendChild(link)
}

function ensureLeaflet(): Promise<any> {
  const globalWindow = window as Window & { L?: any }
  if (typeof globalWindow.L !== "undefined") {
    return Promise.resolve(globalWindow.L)
  }
  if (leafletPromise) {
    return leafletPromise
  }

  ensureLeafletCss()

  leafletPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-leaflet="js"]')
    if (existingScript) {
      existingScript.addEventListener("load", () => {
        const loadedWindow = window as Window & { L?: any }
        resolve(loadedWindow.L)
      })
      existingScript.addEventListener("error", () =>
        reject(new Error("Failed to load Leaflet resources.")),
      )
      return
    }

    const script = document.createElement("script")
    script.src = LEAFLET_JS_URL
    script.async = true
    script.setAttribute("data-leaflet", "js")
    script.onload = () => {
      const loadedWindow = window as Window & { L?: any }
      resolve(loadedWindow.L)
    }
    script.onerror = () => reject(new Error("Failed to load Leaflet resources."))
    document.head.appendChild(script)
  })

  return leafletPromise
}

function parseZoom(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseScale(value: string | undefined): number {
  if (!value) return 1
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

function parseCoordinate(value: string | undefined, dimension: number): number | undefined {
  if (value === undefined) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return undefined

  if (Math.abs(parsed) <= 1) {
    return parsed * dimension
  }
  if (Math.abs(parsed) <= 100) {
    return (parsed / 100) * dimension
  }

  return parsed
}

function loadImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.decoding = "async"
    img.onload = () => {
      const width = img.naturalWidth || img.width
      const height = img.naturalHeight || img.height
      if (width && height) {
        resolve({ width, height })
      } else {
        reject(new Error("Unable to determine image dimensions."))
      }
    }
    img.onerror = () => reject(new Error(`Failed to load map image: ${url}`))
    img.src = url
  })
}

async function setupLeafletMap(container: LeafletMapElement) {
  if (!container.dataset.leafletImage) {
    console.warn("[Leaflet] Missing image path for map container.", container)
    return
  }

  if (container.dataset.leafletInit === "pending" || initializedMaps.has(container)) {
    return
  }

  container.dataset.leafletInit = "pending"

  try {
    const imageUrl = container.dataset.leafletImage
    const scale = parseScale(container.dataset.leafletScale)
    const [{ width, height }, L] = await Promise.all([
      loadImageDimensions(imageUrl),
      ensureLeaflet(),
    ])

    if (!container.isConnected) {
      return
    }

    const scaledWidth = width * scale
    const scaledHeight = height * scale
    const bounds: [[number, number], [number, number]] = [
      [0, 0],
      [scaledHeight, scaledWidth],
    ]

    const options: Record<string, unknown> = {
      crs: L.CRS.Simple,
    }

    const map = L.map(container, options)

    L.imageOverlay(imageUrl, bounds).addTo(map)
    map.fitBounds(bounds)
    map.setMaxBounds(bounds)

    const centerLat = parseCoordinate(container.dataset.leafletLat, scaledHeight)
    const centerLong = parseCoordinate(container.dataset.leafletLong, scaledWidth)
    const center: [number, number] = [
      Number.isFinite(centerLat) ? (centerLat as number) : scaledHeight / 2,
      Number.isFinite(centerLong) ? (centerLong as number) : scaledWidth / 2,
    ]

    const minZoom = parseZoom(container.dataset.leafletMinZoom)
    const maxZoom = parseZoom(container.dataset.leafletMaxZoom)
    const defaultZoom = parseZoom(container.dataset.leafletDefaultZoom)

    const baseZoom = map.getZoom()
    const referenceZoom = defaultZoom ?? minZoom ?? maxZoom ?? baseZoom
    const adjustZoom = (value?: number) =>
      value === undefined ? undefined : baseZoom + (value - referenceZoom)

    const resolvedMinZoom = adjustZoom(minZoom)
    const resolvedMaxZoom = adjustZoom(maxZoom)
    const resolvedDefaultZoom = adjustZoom(defaultZoom)

    if (resolvedMinZoom !== undefined) {
      map.setMinZoom(resolvedMinZoom)
    }
    if (resolvedMaxZoom !== undefined) {
      map.setMaxZoom(resolvedMaxZoom)
    }
    map.setView(center, resolvedDefaultZoom ?? baseZoom)

    initializedMaps.set(container, map)
    container.dataset.leafletInit = "done"

    registerCleanup(() => {
      if (initializedMaps.has(container)) {
        map.remove()
        initializedMaps.delete(container)
      }
    })
  } catch (error) {
    console.error("[Leaflet] Failed to initialise map.", error)
    container.dataset.leafletInit = "error"
  }
}

async function initLeafletMaps() {
  const containers = Array.from(
    document.querySelectorAll<LeafletMapElement>(".leaflet-map[data-leaflet-image]"),
  )
  if (containers.length === 0) return

  for (const container of containers) {
    // fire and forget but avoid blocking others
    void setupLeafletMap(container)
  }
}

void initLeafletMaps()
document.addEventListener("nav", () => {
  void initLeafletMaps()
})

export {}
