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
          return instrumentInnTrace(source, file).code
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
        if (file === 'packages/game/src/shell/bootstrap.ts') {
          const draw =
            'flushToCanvas(fb, canvasCtx, applyDialogIconPaletteShift(gs, gs.palette ?? palette))'
          const route =
            'if (!presentBattleFrame(fb, gs, battlePresent, battleAssets, drained, ticked)) {'
          return replaceAnchor(
            replaceAnchor(
              instrumentGameRestore(source, file, '__beeGameRestored'),
              route,
              'const renderedBattle = presentBattleFrame(fb, gs, battlePresent, battleAssets, drained, ticked)\n      if (!renderedBattle) {',
            ),
            draw,
            `${draw}\n      globalThis.__beeGameDraw?.(gs, renderedBattle ? 'battle' : 'world', drained)`,
          )
        }
        return null
      },
    },
  ],
}
