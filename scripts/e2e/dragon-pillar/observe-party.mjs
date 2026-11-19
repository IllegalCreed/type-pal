// Extend the shared post-draw geometry receipt. Do not use the command argument as the actual pose.
export function installContinuousPartyDraws() {
  const renders = []
  let overflow = false
  globalThis.__pillarParty = {
    record(geometry) {
      if (!geometry?.party.length) return
      if (renders.length >= 8192) {
        overflow = true
        return
      }
      renders.push({ atMs: performance.now(), party: geometry.party })
    },
    snapshot: () => ({ renders, overflow }),
  }
}
