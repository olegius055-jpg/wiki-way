fimport yaml from "js-yaml"
import { visit } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"

function extractImagePath(image: unknown): string {
  if (typeof image === "string") {
    return image
  }

  if (Array.isArray(image)) {
    for (const entry of image) {
      const result = extractImagePath(entry)
      if (result) {
        return result
      }
    }
    return ""
  }

  if (image && typeof image === "object") {
    const keys = Object.keys(image)
    for (const key of keys) {
      if (key) {
        return key
      }
      const value = (image as Record<string, unknown>)[key]
      const nested = extractImagePath(value)
      if (nested) {
        return nested
      }
    }
  }

  return ""
}

function sanitizeAssetPath(rawPath: unknown): string {
  if (typeof rawPath !== "string") {
    return ""
  }

  const trimmed = rawPath.replace(/\[\[|\]\]/g, "").trim()
  if (!trimmed) {
    return ""
  }
  if (/^(https?:)?\/\//i.test(trimmed)) {
    return trimmed
  }
  const normalized = trimmed.replace(/\\/g, "/")
  const encoded = normalized
    .split("/")
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/")
  return `/_Assets/${encoded}`
}

function toNumeric(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return undefined
}

export const LeafletReader: QuartzTransformerPlugin = () => {
  return {
    name: "LeafletReader",
    markdownPlugins() {
      return [
        () => {
          return (tree: any) => {            
            visit(tree, "code", (node, index, parent) => {
              if (node.lang === "leaflet") {
                try {
                  const data = yaml.load(node.value) as any
                  const id = data.id || Math.floor(Math.random() * 10000)
                  const height = String(data.height ?? "500px").replace(/"/g, "&quot;")
                  const imgPath = sanitizeAssetPath(extractImagePath(data.image))
                  const lat = toNumeric(data.lat)
                  const long = toNumeric(data.long)
                  const minZoom = toNumeric(data.minZoom)
                  const maxZoom = toNumeric(data.maxZoom)
                  const defaultZoom = toNumeric(data.defaultZoom)
                  const scale = toNumeric(data.scale)
                  const unit = typeof data.unit === "string" ? data.unit : undefined

                  const attributes: string[] = [
                    `id="leaflet-map-${id}"`,
                    `class="leaflet-map"`,
                    `style="height:${height}; width:100%;"`,
                  ]

                  if (imgPath) {
                    attributes.push(`data-leaflet-image="${imgPath}"`)
                  }
                  if (lat !== undefined) {
                    attributes.push(`data-leaflet-lat="${lat}"`)
                  }
                  if (long !== undefined) {
                    attributes.push(`data-leaflet-long="${long}"`)
                  }
                  if (minZoom !== undefined) {
                    attributes.push(`data-leaflet-min-zoom="${minZoom}"`)
                  }
                  if (maxZoom !== undefined) {
                    attributes.push(`data-leaflet-max-zoom="${maxZoom}"`)
                  }
                  if (defaultZoom !== undefined) {
                    attributes.push(`data-leaflet-default-zoom="${defaultZoom}"`)
                  }
                  if (scale !== undefined) {
                    attributes.push(`data-leaflet-scale="${scale}"`)
                  }
                  if (unit) {
                    attributes.push(`data-leaflet-unit="${unit.replace(/"/g, "&quot;")}"`)
                  }

                  const html = `<div ${attributes.join(" ")}></div>`

                  parent.children[index] = {
                    type: "html",
                    value: html,
                    data: { hName: "raw" },
                  }
                } catch (err) {
                  console.error("YAML parse error:", err)
                }
              }
            })
          }
        },
      ]
    },
  }
}
