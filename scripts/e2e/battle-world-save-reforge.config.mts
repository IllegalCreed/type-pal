import assert from 'node:assert/strict'
import base from './battle-world-bee-reforge.config.mts'

function after(source: string, anchor: string, line: string): string {
  assert.equal(source.split(anchor).length, 2, `Reforge save evidence anchor changed: ${anchor}`)
  return source.replace(anchor, `${anchor}\n${line}`)
}

function observeRewardFrame(source: string): string {
  return after(
    source,
    '            observer?.surface(null)',
    `
            if (observer) {
              const left = 120 * WORLD_SCALE, top = 42 * WORLD_SCALE
              const width = 80 * WORLD_SCALE, height = 20 * WORLD_SCALE
              const shot = ctx.getImageData(left, top, width, height)
              const held = victoryFrame.frame
              let changed = 0
              for (let y = 0; y < height; y += WORLD_SCALE) {
                for (let x = 0; x < width; x += WORLD_SCALE) {
                  const actual = 4 * (y * width + x)
                  const base = 4 * ((top + y) * held.width + left + x)
                  if (shot.data[actual] !== held.data[base] ||
                      shot.data[actual + 1] !== held.data[base + 1] ||
                      shot.data[actual + 2] !== held.data[base + 2]) changed++
                }
              }
              observer.event('reward-frame', { changed })
            }`,
  )
}

const saves = {
  name: 'reforge-world-save-evidence',
  apply: 'serve' as const,
  enforce: 'pre' as const,
  transform(source: string, id: string) {
    if (!id.split('?')[0]?.endsWith('/packages/reforge/src/main.ts')) return null
    const withMenu = after(
      source,
      '  if (import.meta.env.DEV) runtimeObservationReady = true',
      `
  globalThis.__q2SaveMenu = () => {
    if (!menus.active) return null
    const { menu, systemMenu, saveBrowser } = menus.view
    const active = saveBrowser.active ? saveBrowser : menu.openPanel === 'system' ? systemMenu : menu.stack.at(-1)
    return { kind: saveBrowser.active ? 'save-slot' : menu.openPanel ?? 'in-game',
      cursor: active?.cursor ?? null, mode: saveBrowser.active ? saveBrowser.mode : null };
  };
`,
    )
    const saved = after(
      withMenu,
      '      await saveStore.putSlot(meta, prepared.payload, capturedThumb)',
      '      globalThis.__q2SaveWritten?.(slotId)',
    )
    const restored = after(
      saved,
      "    if ((await doLoad(slotId)) === 'loaded') {",
      '      globalThis.__q2SaveRestored?.(slotId)',
    )
    const atTitle = after(
      restored,
      '      outcome = await doLoad(bootLoadSlot)',
      "      if (outcome === 'loaded') globalThis.__q2SaveRestored?.(bootLoadSlot)",
    )
    const toast = after(
      atTitle,
      `      renderSpans(ctx, [{ text: toast.text }], 120, 6, {
        glyphs,
        shadow: true,
        forceRgba: [231, 223, 195],
      })`,
      '      globalThis.__q2SaveToast?.(toast.text)',
    )
    return observeRewardFrame(toast)
  },
}

export default { ...base, plugins: [...base.plugins, saves] }
