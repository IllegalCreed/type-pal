import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import base from '../../packages/game/vite.config.ts'
import { instrumentInnTrace } from './inn-trace-plugin.mjs'
import { instrumentGameRestore } from './scene-lifecycle-trace.mjs'

function replaceAnchor(source: string, anchor: string, replacement: string): string {
  assert.equal(source.split(anchor).length, 2, `Game bee observation anchor changed: ${anchor}`)
  return source.replace(anchor, replacement)
}

export default {
  ...base,
  cacheDir: fileURLToPath(new URL('../../build/e2e/vite-battle-world-bee-game', import.meta.url)),
  plugins: [
    ...base.plugins,
    {
      name: 'battle-world-bee-game',
      apply: 'serve' as const,
      enforce: 'pre' as const,
      transform(source: string, id: string) {
        const file = id.slice(id.lastIndexOf('/packages/') + 1)
        if (file === 'packages/game/src/core/scene-system.ts') {
          const contact = 'if (loadEventFromNpc(gs, npc)) {'
          return replaceAnchor(
            instrumentInnTrace(source, file).code,
            contact,
            `${contact}\n      globalThis.__beeGameContact?.(gs, npc)`,
          )
        }
        if (file === 'packages/game/src/core/battle/battle-system.ts') {
          return replaceAnchor(
            source,
            'const rng = createSeedableRng(input.rngSeed ?? Date.now())',
            'const rng = globalThis.__beeGameRng ?? createSeedableRng(input.rngSeed ?? Date.now())',
          )
        }
        if (file === 'packages/game/src/core/battle/battle-settlement.ts') {
          const start = '    if (en && (en.scriptOnBattleEnd ?? 0) > 0) {'
          const end = '    nextPostBattleEnemy.set(settlement, ei + 1)'
          return replaceAnchor(
            replaceAnchor(
              source,
              start,
              `${start}\n      globalThis.__beeGameSlot?.('before', gs, ei, en.scriptOnBattleEnd, state)`,
            ),
            end,
            `${end}\n    if (en && (en.scriptOnBattleEnd ?? 0) > 0) {\n      globalThis.__beeGameSlot?.('after', gs, ei, en.scriptOnBattleEnd, state)\n    }`,
          )
        }
        if (file === 'packages/game/src/present/present.ts') {
          const freeze = 'if (gs.paletteFadeState?.freeze) {'
          const world = 'if (gs.fadeState && !gs.fadeState.backupPixels) {'
          const flush = `palette: Palette,
): void {
  const img = fb.toImageData(palette)
  ctx2d.putImageData(img, 0, 0)
}`
          const observedFlush = `palette: Palette,
  observe?: (image: ImageData, indices: Uint8Array) => void,
): void {
  const img = fb.toImageData(palette)
  ctx2d.putImageData(img, 0, 0)
  observe?.(img, fb.indices)
}`
          return replaceAnchor(
            replaceAnchor(
              replaceAnchor(source, freeze, `${freeze}\n    globalThis.__beeGameLayer?.('frozen')`),
              world,
              `globalThis.__beeGameLayer?.('world')\n  ${world}`,
            ),
            flush,
            observedFlush,
          )
        }
        if (file === 'packages/game/src/present/battle/present-battle.ts') {
          const round = 'const completedRounds = Math.floor((total > 0 ? step / total : 1) * 6)'
          return replaceAnchor(
            source,
            round,
            `${round}\n      globalThis.__beeGameIntro?.(completedRounds)`,
          )
        }
        if (file === 'packages/game/src/shell/audio-midi.ts') {
          const play = '      sequencer.play()'
          const stop = '      playingTrack = -1\n      seq?.pause()\n      last = undefined'
          return replaceAnchor(
            replaceAnchor(
              source,
              play,
              `${play}\n      globalThis.__beeGameMusic?.('play', track, ctx, loop)`,
            ),
            stop,
            `      const stoppedTrack = playingTrack
${stop}
      if (seq && stoppedTrack > 0) globalThis.__beeGameMusic?.('stop', stoppedTrack, ctx)`,
          )
        }
        if (file === 'packages/game/src/shell/audio.ts') {
          const start = '    src.start()'
          return replaceAnchor(
            source,
            start,
            `${start}\n    globalThis.__beeGameAmbient?.(soundId, c.state, src.buffer)`,
          )
        }
        if (file === 'packages/game/src/shell/bootstrap.ts') {
          const draw =
            'flushToCanvas(fb, canvasCtx, applyDialogIconPaletteShift(gs, gs.palette ?? palette))'
          const route =
            'if (!presentBattleFrame(fb, gs, battlePresent, battleAssets, drained, ticked)) {'
          const start = '      w.__lastBattleFieldId = battleFieldId'
          const routed = replaceAnchor(
            instrumentGameRestore(source, file, '__beeGameRestored'),
            route,
            'const renderedBattle = presentBattleFrame(fb, gs, battlePresent, battleAssets, drained, ticked)\n      if (!renderedBattle) {',
          )
          const rendered = replaceAnchor(
            routed,
            draw,
            `const renderer = renderedBattle ? 'battle' : 'world'
      flushToCanvas(fb, canvasCtx, applyDialogIconPaletteShift(gs, gs.palette ?? palette), globalThis.__beeGamePrepareDraw?.(gs, renderer, ticked))
      globalThis.__beeGameDraw?.(gs, renderer, drained)`,
          )
          return replaceAnchor(
            rendered,
            start,
            `${start}\n      globalThis.__beeGameBattleStart?.(gs, enemyTeamId, battleFieldId)`,
          )
        }
        return null
      },
    },
  ],
}
