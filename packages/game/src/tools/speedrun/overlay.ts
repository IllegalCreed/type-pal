// overlay.ts —— 右侧速通覆盖层(.tp-* 暗底金边,pointer-events:none 不挡操作)。
//   每行 4 列:节点名 | 最佳 | 差值(±色) | 本次;底部:预计通关 + 大号主计时。
import type { Checkpoint } from './checkpoints.js'
import type { BestTimes } from './store.js'
import { formatClock, formatDiff, formatHms } from './time-format.js'
import type { RunState } from './timer.js'

const ROOT_ID = 'tp-speedrun-overlay'
const STYLE_ID = 'tp-speedrun-style'

export function injectOverlayStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
#${ROOT_ID} {
  --sr-gold:#d8b365; --sr-cream:#f0e0b0; --sr-dim:#9a8a6a; --sr-fast:#6fcf97; --sr-slow:#e06c5a;
  position:fixed; top:12px; right:12px; z-index:27; width:228px; pointer-events:none; user-select:none;
  background:rgba(17,17,17,0.82); border:1px solid var(--sr-gold); border-radius:7px; padding:8px 10px;
  font:12px/1.5 "Songti SC","SimSun",serif; color:var(--sr-cream);
  box-shadow:0 0 14px rgba(160,30,30,0.4),0 2px 10px rgba(0,0,0,0.5); }
#${ROOT_ID}[hidden] { display:none; }
.tp-sr-row { display:grid; grid-template-columns:1fr auto auto; gap:4px 8px; align-items:baseline;
  font-family:ui-monospace,Menlo,monospace; padding:1px 0; }
.tp-sr-row .nm { font-family:"Songti SC","SimSun",serif; color:var(--sr-dim); white-space:nowrap; }
.tp-sr-row.cur .nm { color:var(--sr-cream); font-weight:bold; }
.tp-sr-best { color:var(--sr-dim); font-size:11px; }
.tp-sr-cur { color:var(--sr-cream); font-size:11px; min-width:62px; text-align:right; }
.tp-sr-diff { font-size:11px; }
.tp-sr-diff.fast { color:var(--sr-fast); } .tp-sr-diff.slow { color:var(--sr-slow); } .tp-sr-diff.even { color:var(--sr-dim); }
.tp-sr-foot { margin-top:7px; padding-top:6px; border-top:1px solid #553322; }
.tp-sr-eta { color:var(--sr-dim); font-size:11px; font-family:ui-monospace,Menlo,monospace; }
.tp-sr-clock { color:var(--sr-gold); font:700 22px/1.2 ui-monospace,Menlo,monospace;
  text-shadow:0 0 10px rgba(160,30,30,0.5); }
`
  document.head.appendChild(style)
}

function ensureRoot(): HTMLElement {
  let root = document.getElementById(ROOT_ID)
  if (!root) {
    injectOverlayStyles()
    root = document.createElement('div')
    root.id = ROOT_ID
    document.body.appendChild(root)
  }
  return root
}

export function hideOverlay(): void {
  if (typeof document === 'undefined') return
  document.getElementById(ROOT_ID)?.remove()
}

export function renderOverlay(run: RunState, checkpoints: readonly Checkpoint[], bests: BestTimes): void {
  if (typeof document === 'undefined') return
  const root = ensureRoot()
  root.replaceChildren()

  checkpoints.forEach((cp, i) => {
    const row = document.createElement('div')
    row.className = i === run.stepIndex ? 'tp-sr-row cur' : 'tp-sr-row'
    const nm = document.createElement('span')
    nm.className = 'nm'
    nm.textContent = cp.name
    const best = document.createElement('span')
    best.className = 'tp-sr-best'
    const b = bests[cp.id] ?? null
    best.textContent = b != null ? formatHms(b) : '--'
    const cur = document.createElement('span')
    cur.className = 'tp-sr-cur'
    const split = run.splits[i]
    if (split != null) {
      cur.textContent = formatHms(split)
      const diff = document.createElement('span')
      if (b != null) {
        const d = split - b
        diff.className = `tp-sr-diff ${d < -1000 ? 'fast' : d > 1000 ? 'slow' : 'even'}`
        diff.textContent = formatDiff(d)
      } else {
        diff.className = 'tp-sr-diff even'
        diff.textContent = ''
      }
      row.append(nm, best, diff, cur)
    } else {
      row.append(nm, best, cur)
    }
    root.appendChild(row)
  })

  const foot = document.createElement('div')
  foot.className = 'tp-sr-foot'
  const eta = document.createElement('div')
  eta.className = 'tp-sr-eta'
  eta.textContent = `预计通关 ${formatEta(run, checkpoints, bests)}`
  const clock = document.createElement('div')
  clock.className = 'tp-sr-clock'
  clock.textContent = `${run.bananaPaused ? '*' : ''}${formatClock(run.elapsedMs)}`
  foot.append(eta, clock)
  root.appendChild(foot)
}

/** 预计通关 = 基准[通关] + 最近已完成节点的差值;无基准 → "--"。 */
function formatEta(run: RunState, checkpoints: readonly Checkpoint[], bests: BestTimes): string {
  const lastId = checkpoints[checkpoints.length - 1]?.id
  const base = lastId != null ? bests[lastId] : null
  if (base == null) return '--'
  let diff = 0
  for (let i = run.stepIndex - 1; i >= 0; i--) {
    const split = run.splits[i]
    const cp = checkpoints[i]
    const b = cp != null ? (bests[cp.id] ?? null) : null
    if (split != null && b != null) {
      diff = split - b
      break
    }
  }
  return formatHms(base + diff)
}
