import yaml from "js-yaml"
import { visit } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"

interface Options {
  abilityType: string[]
}

const defaultOptions: Options = {
  abilityType: ["ds-ab", "ds-ability"],
}

export const DsElements: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts = { ...defaultOptions, ...userOpts }

  return {
    name: "DsElements",
    markdownPlugins() {
      return [
        () => {
          return (tree: any) => {
            visit(tree, "code", (node, index, parent) => {
              if (node.lang && opts.abilityType.includes(node.lang)) {
                try {
                  const data = yaml.load(node.value) as any
                  const html = `
                      <div class="ds-ability-card">
                        ${data.name ? `<div class="ds-ability-card-header-line"><div class="ds-ability-card-header">${data.name}</div>${data.cost ? `<span class="ds-ability-card-cost">${data.cost}</span>` : ""}</div>` : ""}
                        ${data.flavor ? `<div class="ds-ability-card-description"><em>${data.flavor}</em></div>` : ""}
                        <hr class="card-separator" />
                        <div class="ds-ability-card-upper-properties">
                            <div>${data.keywords ?? "-"}</div>
                            <div>${data.type ?? "-"}</div>
                        </div>
                        <div class="ds-ability-card-lower-properties">
                            <div>📏 ${data.distance ?? "-"}</div>
                            <div>🎯 ${data.target ?? "-"}</div>
                        </div>
                        ${
                          data.effects
                            ? data.effects
                                .map((element: any) => {
                                  if (element.roll) {
                                    const rollContainer = `
                                        <div class="ds-ability-card-rolls ds-ability-card-effect">
                                        <div class="ds-ability-card-roll-label">${element.roll}</div>
                                        <div class="ds-ability-card-roll-line"><div class="tier-key-container t1"><div class="key-body t1"><div class="key-body-text">≤11</div></div></div><span><p>${element.t1 ?? element["11 or lower"] ?? "-"}</p></span></div>
                                        <div class="ds-ability-card-roll-line"><div class="tier-key-container t2"><div class="key-body t2"><div class="key-body-text">12-16</div></div></div><span><p>${element.t2 ?? element["12-16"] ?? "-"}</p></span></div>
                                        <div class="ds-ability-card-roll-line"><div class="tier-key-container t3"><div class="key-body t3"><div class="key-body-text">17+</div></div></div><span><p>${element.t3 ?? element["17+"] ?? "-"}</p></span></div>
                                    </div>`
                                    return rollContainer
                                  } else if (element instanceof Object) {
                                    return Object.keys(element)
                                      .map((key) => {
                                        return `<div class="ds-ability-card-effect"><strong>${key}:</strong> ${element[key]}</div>`
                                      })
                                      .join("")
                                  } else {
                                    return `<div>${element}</div>`
                                  }
                                })
                                .join("")
                            : ""
                        }
                      </div>
                    `
                  parent.children[index] = {
                    type: "html",
                    value: html,
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

/*
 */
