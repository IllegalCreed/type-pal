import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { instrumentGameBattle } from '../battle-game-instrumentation.mjs'
import { instrumentReforgeBattle } from '../battle-reforge-instrumentation.mjs'
import base from '../battle-scripted-defeat.config.mts'

const engine = process.env.Q2_DEFEAT_ENGINE

function replaceOnce(source: string, anchor: string, replacement: string): string {
  assert.equal(source.split(anchor).length, 2, `boss observation anchor: ${anchor}`)
  return source.replace(anchor, replacement)
}

function after(source: string, anchor: string, observation: string): string {
  return replaceOnce(source, anchor, `${anchor}\n${observation}`)
}

function gamePresentation(source: string, file: string) {
  if (file === 'present/dialog-draw.ts') {
    return after(
      source,
      '    drawNarrationDialog(fb, state, glyphs, ctx)',
      '    globalThis.__bossNarration?.(state)',
    )
  }
  if (file === 'present/battle/present-battle.ts') {
    const end = '        glyphs: assets.glyphs,\n      })\n    }\n\n    // 8.'
    return replaceOnce(
      source,
      end,
      end.replace(
        '      })',
        '      })\n      globalThis.__bossSettlement?.(settlement.screens[settlement.index])',
      ),
    )
  }
  if (file === 'core/battle/battle-settlement.ts') {
    const begin = '    if (en && (en.scriptOnBattleEnd ?? 0) > 0) {'
    const code = after(
      source,
      begin,
      "      globalThis.__bossDrop?.begin(ei, 'enemy-'+en.objectId)",
    )
    const end = '      })\n    }\n    // 只在脚本正常返回后推进'
    return replaceOnce(
      code,
      end,
      end.replace('      })', '      })\n      globalThis.__bossDrop?.end()'),
    )
  }
  return null
}

function reforgeDrop(source: string, file: string) {
  if (file === 'main.ts') {
    const loop = '        for (const def of scripted) {'
    const begin = replaceOnce(
      source,
      loop,
      `        for (const [ordinal, def] of scripted.entries()) {
          globalThis.__bossDrop?.begin(ordinal, def.id)`,
    )
    const end =
      "            timing: 'interactive',\n          })\n          assertCurrent()\n        }"
    return replaceOnce(
      begin,
      end,
      end.replace(
        '          assertCurrent()',
        '          globalThis.__bossDrop?.end()\n          assertCurrent()',
      ),
    )
  }
  if (file === 'dialog/dialog-box.ts') {
    return after(
      source,
      '      this.renderNarrationScroll(r, isActive)',
      '      globalThis.__bossReforgeNarration?.(r.visibleText, Boolean(this.battleVictory))',
    )
  }
  if (file === 'script-project-core.ts') {
    const anchor = '      random: this.options.random,'
    return replaceOnce(
      source,
      anchor,
      `      random: globalThis.__bossDrop?.active() &&
        _context.timing === 'interactive' && condition.kind === 'chance'
        ? globalThis.__bossDrop.sample
        : this.options.random,`,
    )
  }
  return null
}

const observeBoss: Plugin = {
  name: 'world-boss-frame-observation',
  apply: 'serve',
  enforce: 'pre',
  transform(source, id) {
    const file = id.split('?')[0]?.replaceAll('\\', '/')
    const local = file?.split(`/packages/${engine}/src/`)[1]
    if (!local) return null
    const additional =
      engine === 'game' ? gamePresentation(source, local) : reforgeDrop(source, local)
    if (additional !== null) return { code: additional, map: null }
    const gameSprites = '/packages/game/src/present/battle/draw-battle-sprites.ts'
    const reforgeSprites = 'packages/reforge/src/battle/present-battle.ts'
    if (file?.endsWith(gameSprites))
      return { code: instrumentGameBattle(source, gameSprites).code, map: null }
    if (file?.endsWith(`/${reforgeSprites}`))
      return { code: instrumentReforgeBattle(source, reforgeSprites).code, map: null }
    if (file?.endsWith('/packages/reforge/src/battle/battle-session.ts')) {
      const code = after(
        source,
        '        enemies.push(draw)',
        "        globalThis.__battleEvidence?.labelFighter(draw, 'enemy', i, e.hp <= 0 && !dyingNow)",
      )
      return {
        code: after(
          code,
          '      drawSettlementScreen(ctx, settlementScreen, ui, g)',
          '      globalThis.__bossSettlement?.(settlementScreen)',
        ),
        map: null,
      }
    }
    if (file?.endsWith('/packages/reforge/src/battle/battle-world-result.ts')) {
      const anchor = '  rng: () => number = Math.random,'
      assert.equal(source.split(anchor).length, 2)
      return {
        code: source.replace(
          anchor,
          '  rng: () => number = globalThis.__defeat?.rng ?? Math.random,',
        ),
        map: null,
      }
    }
    return null
  },
}

export default {
  ...base,
  cacheDir: fileURLToPath(new URL(`../../../build/e2e/vite-world-boss-${engine}`, import.meta.url)),
  plugins: [...base.plugins, observeBoss],
}
