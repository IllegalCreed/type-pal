import assert from 'node:assert/strict'

export const LIMITS = Object.freeze({ actions: 240, events: 600, timeoutMs: 240_000 })

// Phase 1 uses 1-based scene numbers. This is deliberately not a Reforge adapter.
export function isControllableRoom(s) {
  return (
    s.ready &&
    s.scene === 2 &&
    s.mode === 'explore' &&
    !s.dialog &&
    !s.event &&
    !s.menu &&
    !s.loading &&
    !s.suspended &&
    !s.fading &&
    !s.video
  )
}

export function assertOpeningEvidence({ videos, lines, final }) {
  assert(
    videos.some((v) => v.kind === 'ended' && v.path === '/extracted/videos/3.mp4'),
    '001 must finish native video 3, not skip it',
  )
  // dialogHistory.map is the actual map asset ID, NOT wNumScene (event-system.ts).
  // Extracted scene 0/1 declare mapNum 20/12 respectively.
  for (const [map, text] of [
    [20, '作恶多端的罗煞鬼婆'],
    [12, '真没意思'],
    [12, '现在被发现就惨了'],
  ]) {
    assert(
      lines.some((line) => line.map === map && line.text.includes(text)),
      `missing story anchor on map ${map}: ${text}`,
    )
  }
  assert(isControllableRoom(final), '001 must end controllable in the actual room')
}

export function storyAction(s) {
  if (!s.ready) return 'wait'
  assert([1, 2].includes(s.scene), `unexpected scene ${s.scene}`)
  assert(['event', 'explore'].includes(s.mode), `unexpected story mode ${s.mode}`)
  assert(!s.menu, 'unexpected menu during 001')
  if (s.video) {
    assert.equal(s.video.path, '/extracted/videos/3.mp4', 'unexpected story video')
    return 'wait'
  }
  if (s.dialog) {
    assert(
      ['typing', 'line-done', 'waiting-page-key', 'waiting-end-key'].includes(s.dialog.phase),
      `unknown dialogue phase ${s.dialog.phase}`,
    )
    return s.dialog.phase.startsWith('waiting-') ? 'confirm' : 'wait'
  }
  return isControllableRoom(s) ? 'finish' : 'wait'
}

export function appendBounded(list, item, limit = LIMITS.events) {
  assert(list.length < limit, `evidence overflow (${limit}); refusing silent truncation`)
  list.push(item)
}

export function stateKey(s) {
  // Excludes frame counters/typewriter glyphs/NPC coordinates: changes only, not per-frame logs.
  return JSON.stringify([
    s.ready,
    s.scene,
    s.mode,
    s.menu,
    s.dialog,
    s.event,
    s.loading,
    s.suspended,
    s.fading,
    s.video,
    s.lastLine,
  ])
}
