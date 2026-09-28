/** Read only pixels already submitted to the game's canvas, never drive the engine. */
export async function readOpeningFrame() {
  const canvases = document.querySelectorAll('canvas')
  if (canvases.length !== 1) throw new Error(`expected one game canvas, got ${canvases.length}`)
  const canvas = canvases[0],
    context = canvas.getContext('2d')
  if (!context) throw new Error('game canvas is not 2D')
  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)
  let nonBlack = 0
  for (let i = 0; i < data.length; i += 4) if (data[i] || data[i + 1] || data[i + 2]) nonBlack++
  const digest = await crypto.subtle.digest('SHA-256', data)
  return {
    width: canvas.width,
    height: canvas.height,
    nonBlack,
    sha256: Array.from(new Uint8Array(digest), (v) => v.toString(16).padStart(2, '0')).join(''),
  }
}

export function openingFrameMatches(frame, expected) {
  if (
    !frame ||
    frame.width <= 0 ||
    frame.height <= 0 ||
    frame.nonBlack < (frame.width * frame.height) / 5
  )
    return false
  return (
    !expected ||
    (frame.width === expected.width &&
      frame.height === expected.height &&
      frame.sha256 === expected.sha256)
  )
}

export async function waitForOpeningFrame(page, until, expected) {
  // A successful load/menu state can precede its paint. Wait for browser frames, not a fixed sleep.
  await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('opening frame was never painted')), 5000)
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            clearTimeout(timer)
            resolve()
          }),
        )
      }),
  )
  return until(
    () => page.evaluate(readOpeningFrame),
    (frame) => openingFrameMatches(frame, expected),
    expected
      ? 'restored room pixels match the actual end frame'
      : 'non-black room actually painted',
    10_000,
  )
}
