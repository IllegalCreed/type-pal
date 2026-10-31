import type { BusEntry } from '../command-bus.js'
/** Preserve the discriminated command (including op), not a weakened structural projection. */
export function damageNums(entries: BusEntry[]) {
  return entries.flatMap((entry) => (entry.cmd.op === 'showDamageNum' ? [entry.cmd] : []))
}
