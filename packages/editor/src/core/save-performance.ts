/** Opt-in timings only; no file bytes, identities or persistence decisions are cached. */
const enabled =
  import.meta.env.MODE === 'save-performance' &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('profile-save')
const totals = new Map<string, { calls: number; milliseconds: number; maximum: number }>()
const noop = () => {}
let started = 0
export function beginSaveMeasurement(name: string): () => void {
  if (!enabled) return noop
  if (name === 'saveProjectAs') {
    totals.clear()
    started = performance.now()
  }
  if (!started) started = performance.now()
  const start = performance.now()
  return () => {
    const elapsed = performance.now() - start
    const row = totals.get(name) ?? { calls: 0, milliseconds: 0, maximum: 0 }
    row.calls++
    row.milliseconds += elapsed
    row.maximum = Math.max(row.maximum, elapsed)
    totals.set(name, row)
    if (
      name === 'saveProjectAs' ||
      name === 'prepareInsideScope' ||
      name === 'execute' ||
      (name === 'transaction' && row.calls % 1000 === 0)
    )
      console.info(
        '[save-performance]',
        JSON.stringify({
          name,
          wallMilliseconds: performance.now() - started,
          // Compact [calls, total ms, max ms], preserving 0.1ms resolution for native AX capture.
          spans: Object.fromEntries(
            [...totals].map(([key, value]) => [
              key,
              [
                value.calls,
                Math.round(value.milliseconds * 10) / 10,
                Math.round(value.maximum * 10) / 10,
              ],
            ]),
          ),
        }),
      )
  }
}
