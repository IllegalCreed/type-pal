export function installForegroundSageWitness() {
  const scene = 's150'
  const entity = 'e2465'
  const events = []
  let readStage
  function record(kind, detail) {
    const stage = readStage?.()
    if (stage?.scene !== scene) return
    events.push({ kind, at: performance.now(), ...stage, ...detail })
  }
  globalThis.__sageForeground = {
    attach(read) {
      readStage = read
    },
    command(self, path, compiled, timing, runnerClock) {
      const command = compiled.kind === 'leaf' ? compiled.command : compiled
      record('command', {
        self,
        path,
        timing,
        runnerClock,
        op: command.kind,
        count: command.count,
        intervalMs: command.intervalMs,
        target: command.target,
        dx: command.dx,
        dy: command.dy,
        ms: command.ms,
        facing: command.facing,
        frame: command.frame,
        rows: command.cue?.rows,
      })
    },
    beforeNudge(id, cast) {
      if (id === entity && !events.some((row) => row.kind === 'before-first-nudge'))
        record('before-first-nudge', { cast })
    },
    reveal(options, ownsOutgoingFrame) {
      record('entry-reveal', { options: { ...options }, ownsOutgoingFrame })
    },
    effect(op, id, detail) {
      if (id === entity) record('effect', { op, id, ...detail })
    },
    snapshot() {
      return events
    },
  }
}
