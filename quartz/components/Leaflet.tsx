import { QuartzComponent, QuartzComponentConstructor } from "./types"
// @ts-ignore - bundled as inline script
import script from "./scripts/leaflet.inline"

export default (() => {
  const LeafletSupport: QuartzComponent = () => null
  LeafletSupport.afterDOMLoaded = script

  return LeafletSupport
}) satisfies QuartzComponentConstructor
