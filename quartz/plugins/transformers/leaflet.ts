// import "leaflet/dist/leaflet.css"
import L from "leaflet"
import yaml from "js-yaml"
import { visit } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"

interface Options {
}

const defaultOptions: Options = {
}

export const LeafletReader: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }

  return {
    name: "LeafletReader",
    markdownPlugins() {
      return [
        () => {
          return (tree: any) => {            
            let leafletInjected = false
            visit(tree, "code", (node, index, parent) => {
                if (node.lang === "leaflet") {
                try {
                  const data = yaml.load(node.value) as any
                  const id = data.id || Math.floor(Math.random() * 10000)
                  let imgRaw = data.image
                  let imgPath = ""
                  if (typeof imgRaw === "string") {
                    imgPath = imgRaw
                  } else if (Array.isArray(imgRaw)) {
                    imgPath = imgRaw[0]
                  } else if (imgRaw && typeof imgRaw === "object") {
                    imgPath = Object.keys(imgRaw)[0]
                  }

                  imgPath = String(imgPath || "").replace(/\[\[|\]\]/g, "").trim()
                  const height = data.height || "500px"
                  const lat = data.lat || 0
                  const long = data.long || 0
                  const minZoom = data.minZoom || 5
                  const maxZoom = data.maxZoom || 12
                  const defaultZoom = data.defaultZoom || 5

                  let injectLeaflet = ""
                  if (!leafletInjected) {
                    leafletInjected = true
                    injectLeaflet = `
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                    `
                  }

                  const html = `
                    ${injectLeaflet}
                    <div id="leaflet-map-${id}" style="height:${height};"></div>
                    <script>
                      (function() {
                        if (typeof L === 'undefined') {
                          console.error('error');
                          return;
                        }
                        const map = L.map('leaflet-map-${id}', {
                          crs: L.CRS.Simple,
                          minZoom: ${minZoom},
                          maxZoom: ${maxZoom},
                        });
                        const bounds = [[0,0], [100,100]];
                        const image = L.imageOverlay('https://wiki-way.vercel.app/_Assets/${imgPath}').addTo(map);
                        map.fitBounds(bounds);
                        map.setZoom(${defaultZoom});
                        map.setView([${lat}, ${long}]);
                      })();
                    </script>
                  `

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
