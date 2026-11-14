import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import base from '../../packages/game/vite.config.ts'
import { instrumentInnTrace } from './inn-trace-plugin.mjs'

function replaceOnce(source: string, anchor: string, replacement: string): string {
  assert.equal(source.split(anchor).length, 2, `Game enemy escape anchor changed: ${anchor}`)
  return source.replace(anchor, replacement)
}

function after(source: string, anchor: string, observation: string): string {
  return replaceOnce(source, anchor, `${anchor}\n${observation}`)
}

export default {
  ...base,
  cacheDir: fileURLToPath(
    new URL('../../build/e2e/vite-battle-enemy-escape-game', import.meta.url),
  ),
  plugins: [
    ...base.plugins,
    {
      name: 'game-native-enemy-escape',
      apply: 'serve' as const,
      enforce: 'pre' as const,
      transform(source: string, id: string) {
        const file = id.split('?')[0]?.split('/packages/game/src/').at(-1)
        switch (file) {
          case 'core/scene-system.ts':
            return after(
              instrumentInnTrace(source, `packages/game/src/${file}`).code,
              'if (loadEventFromNpc(gs, npc)) {',
              `      globalThis.__enemyEscape?.entry(gs.wNumScene, npc.id, gs.party)`,
            )
          case 'core/battle/battle-system.ts':
            return replaceOnce(
              source,
              'const rng = createSeedableRng(input.rngSeed ?? Date.now())',
              'const rng = globalThis.__enemyEscape?.rng ?? createSeedableRng(input.rngSeed ?? Date.now())',
            )
          case 'core/battle/battle-finalization.ts':
            return after(
              source,
              '  resumePostBattleScript(gs, outcome)',
              `  globalThis.__enemyEscape?.event('finalize', {outcome, resume: gs.eventCursor?.ip, owner: gs.eventCursor?.triggerOwnerId})`,
            )
          case 'shell/audio.ts':
            return after(
              source,
              '    src.start()',
              `    globalThis.__enemyEscape?.sound(String(soundId), c.state, src.buffer)`,
            )
          case 'shell/bootstrap.ts': {
            const begin =
              '      if (!presentBattleFrame(fb, gs, battlePresent, battleAssets, drained, ticked)) {'
            const paint =
              '      flushToCanvas(fb, canvasCtx, applyDialogIconPaletteShift(gs, gs.palette ?? palette))'
            const started = '      w.__lastBattleFieldId = battleFieldId'
            return after(
              after(
                replaceOnce(
                  source,
                  begin,
                  `      globalThis.__enemyEscape?.beginFrame()
      const renderedBattle = presentBattleFrame(fb, gs, battlePresent, battleAssets, drained, ticked)
      if (!renderedBattle) {`,
                ),
                paint,
                `      globalThis.__enemyEscape?.gameFrame(gs, renderedBattle)`,
              ),
              started,
              `      globalThis.__enemyEscape?.event('battle-start', {team: enemyTeamId, field: battleFieldId, boss: isBoss})`,
            )
          }
          case 'present/battle/draw-battle-sprites.ts': {
            const frame = '    const frame = sprite.frames[frameIdx] ?? sprite.frames[0]!'
            return after(
              source,
              frame,
              `    globalThis.__enemyEscape?.fighter({slot: i, id: enemy.objectId, x: pos.x, y: pos.y, frame: frameIdx, width: frame.width, firstWidth: sprite.frames[0].width})`,
            )
          }
          default:
            return null
        }
      },
    },
  ],
}
