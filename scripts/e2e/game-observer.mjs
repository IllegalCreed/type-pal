// Installed only in this runner's fresh browser context. No writes to game state.
export function installVideoObserver() {
  const events = []
  const seen = new WeakSet()
  let overflow = false
  const record = (video, kind) => {
    if (events.length >= 80) {
      overflow = true
      return
    }
    events.push({
      kind,
      path: new URL(video.currentSrc || video.src, location.href).pathname,
      time: video.currentTime,
      duration: Number.isFinite(video.duration) ? video.duration : null,
    })
  }
  const scan = () => {
    for (const video of document.querySelectorAll('video')) {
      if (seen.has(video)) continue
      seen.add(video)
      record(video, 'attached')
      for (const event of ['playing', 'ended', 'error']) {
        video.addEventListener(event, () => record(video, event))
      }
    }
  }
  new MutationObserver(scan).observe(document, { childList: true, subtree: true })
  window.__openingVideoEvidence = () => ({ events, overflow })
}

export function readGame() {
  const gs = window.__tpgs
  const video = document.querySelector('video')
  const menu = gs?.menuStack?.at(-1)
  const dialog = gs?.dialogBox
  return {
    ready: !!gs,
    frame: gs?.frameNum ?? 0,
    scene: gs?.wNumScene ?? null,
    mode: gs?.mode ?? null,
    menu: menu ? { kind: menu.kind, cursor: menu.state?.selection?.cursor } : null,
    dialog: dialog
      ? {
          phase: dialog.phase,
          text: dialog.currentLineText,
          shown: dialog.shownLines,
          title: dialog.titleText,
        }
      : null,
    event: !!gs?.eventCursor,
    loading: !!gs?.sceneLoading,
    suspended: !!gs?.suspendRaf,
    fading: !!(gs?.needToFadeIn || gs?.paletteFadeState || gs?.fadeState || gs?.blackScreenHold),
    video: video
      ? {
          path: new URL(video.currentSrc || video.src, location.href).pathname,
          paused: video.paused,
        }
      : null,
    lastLine: gs?.dialogHistory?.at(-1) ?? null,
  }
}

export function readWorld() {
  const gs = window.__tpgs
  if (!gs) throw new Error('game not initialized')
  for (const key of [
    'party',
    'partyMembers',
    'PlayerRolesRuntime',
    'inventory',
    'rgScene',
    'rgObject',
    'rgEventObject',
    'allEventObjects',
  ]) {
    if (gs[key] === undefined) throw new Error(`missing world field: ${key}`)
  }
  return JSON.parse(
    JSON.stringify({
      scene: gs.wNumScene,
      party: gs.party,
      members: gs.partyMembers,
      roles: gs.PlayerRolesRuntime,
      cash: gs.dwCash,
      inventory: gs.inventory,
      scenes: gs.rgScene,
      objects: gs.rgObject,
      eventObjects: gs.rgEventObject,
      // Animation counters are presentation/time dependent, not checkpoint continuity.
      actors: gs.allEventObjects.map(
        ({
          id,
          x,
          y,
          sState,
          facing,
          triggerLabel,
          triggerResume,
          triggerMode,
          spriteNum,
          autoTriggerOnce,
        }) => ({
          id,
          x,
          y,
          sState,
          facing,
          triggerLabel,
          triggerResume,
          triggerMode,
          spriteNum,
          autoTriggerOnce,
        }),
      ),
    }),
  )
}
