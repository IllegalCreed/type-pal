import assert from 'node:assert/strict'
import { errandCausalObserverScript } from './errand-observer.mjs'
import { ERRAND_TRACE_TARGETS, instrumentErrandTrace } from './errand-trace-plugin.mjs'

export const ISLAND_SCENES = Object.freeze(['s014', 's015', 's017'])

function replaceScope(source, before, after, count) {
  assert.equal(source.split(before).length - 1, count, 'island observer scope anchor changed')
  return source.replaceAll(before, after)
}

/** Reuse the committed movement, restore, and causal observers with the 007 scene scope. */
export function islandEntranceObserverScript() {
  const script = replaceScope(
    errandCausalObserverScript(),
    "['s001', 's002', 's003', 's004', 's005', 's014']",
    JSON.stringify(ISLAND_SCENES),
    2,
  )
  const scoped = replaceScope(script, '[2, 3, 4, 5, 6, 15]', '[15, 16, 18]', 2)
  return `globalThis.__islandVerify = true; ${scoped}`
}

export function islandEntranceTracePlugin() {
  return {
    name: 'isolated-island-entrance-trace',
    enforce: 'pre',
    apply: 'serve',
    transform(source, id) {
      const file = ERRAND_TRACE_TARGETS.find((path) => id.endsWith(`/${path}`))
      if (!file) return null
      const { code } = instrumentErrandTrace(source, file)
      return {
        code: file.endsWith('/reforge/src/main.ts')
          ? replaceScope(
              code,
              "['s001','s002','s003','s004','s005','s014']",
              JSON.stringify(ISLAND_SCENES),
              1,
            )
          : code,
        map: null,
      }
    },
  }
}
