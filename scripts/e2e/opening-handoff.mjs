import assert from 'node:assert/strict'

/** Read pixels at DOM video removal, before the next scene can paint. No engine writes or delays. */
export function installOpeningHandoffObserver() {
  let expectedPath = null
  let title = null
  const removals = []
  const canvasFrame = () => {
    const canvas = document.querySelector('#screen')
    if (!canvas) throw new Error('opening handoff canvas missing')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('opening handoff context missing')
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let nonBlack = 0,
      opaque = 0
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] || pixels[i + 1] || pixels[i + 2]) nonBlack++
      if (pixels[i + 3] === 255) opaque++
    }
    return {
      width: canvas.width,
      height: canvas.height,
      nonBlack,
      opaque,
      png: canvas.toDataURL('image/png'),
    }
  }
  new MutationObserver((records) => {
    for (const record of records)
      for (const node of record.removedNodes) {
        if (node.nodeName !== 'VIDEO' || !expectedPath) continue
        const path = new URL(node.currentSrc || node.src, location.href).pathname
        if (path !== expectedPath) continue
        removals.push({
          path,
          naturalEnd: node.ended,
          runtimeReady: !!window.__tpObserve?.readRuntime?.(),
          frame: canvasFrame(),
        })
      }
  }).observe(document, { childList: true, subtree: true })
  window.__openingHandoff = {
    arm(path) {
      if (expectedPath) throw new Error('opening handoff already armed')
      expectedPath = path
      title = canvasFrame()
    },
    read: () => ({ title, removals }),
  }
}

export function assertOpeningHandoff(evidence, introPath) {
  assert(evidence.title?.nonBlack > 0, 'title frame was not captured before selection')
  assert.equal(evidence.removals.length, 1, 'entry video removal not observed exactly once')
  const removal = evidence.removals[0]
  assert.equal(removal.path, introPath)
  assert.equal(removal.naturalEnd, true, 'handoff did not follow native natural video end')
  assert.equal(removal.runtimeReady, false, 'handoff gap was not observed before runtime ready')
  assert.equal(removal.frame.width, evidence.title.width)
  assert.equal(removal.frame.height, evidence.title.height)
  assert.equal(removal.frame.nonBlack, 0, 'video removal exposed stale title canvas pixels')
  assert.equal(
    removal.frame.opaque,
    removal.frame.width * removal.frame.height,
    'handoff curtain is not opaque black',
  )
}
