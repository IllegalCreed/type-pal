export type FlowPhase = 'boot' | 'ready' | 'error'

export interface CursorFlowSnapshot {
  flowId: string
  phase: FlowPhase
  label: string
  /** 合同专用 oracle；Playwright 读 before/after。 */
  oracle: Record<string, unknown>
  canvas2d?: { ok: boolean; sample?: number[]; note?: string }
}

declare global {
  interface Window {
    __cursorFlow?: {
      getSnapshot: () => CursorFlowSnapshot
      probeCanvas2d: () => { ok: boolean; sample?: number[]; note?: string }
    }
  }
}

let snapshot: CursorFlowSnapshot = {
  flowId: 'none',
  phase: 'boot',
  label: 'booting',
  oracle: {},
}

export function setFlowSnapshot(next: CursorFlowSnapshot): void {
  snapshot = {
    ...snapshot,
    ...next,
    oracle: next.oracle ? { ...snapshot.oracle, ...next.oracle } : snapshot.oracle,
  }
  const status = document.getElementById('flow-boot-status')
  if (status) {
    status.hidden = false
    status.textContent = `${next.flowId}:${next.phase}`
  }
}

export function patchOracle(patch: Record<string, unknown>): void {
  snapshot = { ...snapshot, oracle: { ...snapshot.oracle, ...patch } }
}

export function probeCanvas2d(): { ok: boolean; sample?: number[]; note?: string } {
  const canvas = document.createElement('canvas')
  canvas.width = 2
  canvas.height = 2
  const ctx = canvas.getContext('2d')
  if (!ctx) return { ok: false, note: 'getContext("2d") returned null' }
  ctx.fillStyle = 'rgb(12, 34, 56)'
  ctx.fillRect(0, 0, 1, 1)
  const sample = [...ctx.getImageData(0, 0, 1, 1).data]
  const ok = sample[0] === 12 && sample[1] === 34 && sample[2] === 56 && sample[3] === 255
  return { ok, sample, note: ok ? 'real Canvas2D readback' : 'unexpected pixel sample' }
}

export function installFlowBridge(): void {
  window.__cursorFlow = {
    getSnapshot: () => structuredClone(snapshot),
    probeCanvas2d,
  }
}
