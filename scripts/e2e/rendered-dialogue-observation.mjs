/** The existing opening trace calls this port after the real dialogue draw. */
export function installRenderedDialogueObservation() {
  const draws = []
  let previous
  const prior = globalThis.__openingCauseDialogueDraw
  globalThis.__openingCauseDialogueDraw = (engine, value, assets) => {
    prior?.(engine, value, assets)
    const game = engine === 'game'
    const scene = game
      ? `s${String(value.wNumScene - 1).padStart(3, '0')}`
      : globalThis.__rfScene?.id
    const slots = game
      ? [value.dialogBoxKept, value.dialogBox].filter(Boolean).map((box) => {
          const portrait = assets?.portraitFrames?.has(box.portraitIcon) ? box.portraitIcon : null
          const current = box.currentLineText?.slice(
            0,
            box.style === 'narration' ? undefined : box.charsRevealed,
          )
          const lines = [...box.shownLines, current].filter(Boolean)
          return {
            slot: box.style,
            speaker: box.titleText ?? null,
            portrait,
            lines,
            portraitLayout: box.portraitLayout ?? portrait !== null,
          }
        })
      : value
          .filter(({ visibleText }) => visibleText !== null)
          .map((slot) => ({
            slot: slot.slot,
            speaker: slot.speaker,
            portrait:
              slot.portraitAsset === null ? null : Number(slot.portraitAsset.split('.').at(-1)),
            portraitLayout: slot.portraitLayout,
            ids: slot.pageTextIds,
            lines: slot.visibleText.split('\n'),
          }))
    const state = { scene, slots }
    const signature = JSON.stringify(state)
    if (signature === previous) return
    if (draws.length >= 4000) throw new Error('dialogue draw evidence overflow')
    previous = signature
    draws.push({ atMs: performance.now(), ...state })
  }
  globalThis.__e2eRenderedDialogue = () => draws
}
