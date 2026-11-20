import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { instrumentGameBattle } from '../battle-game-instrumentation.mjs'
import { instrumentReforgeBattle } from '../battle-reforge-instrumentation.mjs'
import base from '../battle-scripted-defeat.config.mts'
import {
  instrumentReforgeRenderEvidence,
  REFORGE_RENDER_TARGETS,
} from '../reforge-render-evidence.mjs'

const engine = process.env.Q2_DEFEAT_ENGINE
const itemEntrance = process.env.Q2_BOSS_ITEM_ENTRANCE === '1'

function replaceOnce(source: string, anchor: string, replacement: string): string {
  assert.equal(source.split(anchor).length, 2, `boss observation anchor: ${anchor}`)
  return source.replace(anchor, replacement)
}

function after(source: string, anchor: string, observation: string): string {
  return replaceOnce(source, anchor, `${anchor}\n${observation}`)
}

function gamePresentation(source: string, file: string) {
  if (itemEntrance && file === 'core/event-system.ts') {
    return after(
      source,
      '  gs.itemUseApplyToAll = targetRoleIdOrAll === 0xffff',
      '  globalThis.__defeat?.gameItemContact(gs, itemId, ip, targetRoleIdOrAll)',
    )
  }
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
  if (itemEntrance && file === 'menu/menu-session.ts') {
    return after(
      source,
      '  private dispatchItemUse(request: UseExecutionRequest): Promise<void> {',
      '    globalThis.__defeat?.reforgeItemContact(request)',
    )
  }
  if (file === 'audio/bgm.ts') {
    return after(
      source,
      '      seq.fadeTo(0, fadeOutMs)',
      '      globalThis.__bossMusicFade?.(playing, fadeOutMs, ctx.state)',
    )
  }
  if (file === 'main.ts') {
    if (itemEntrance) {
      source = after(
        source,
        '    // 菜单(UI,最上层)同样 320 逻辑坐标 + ×4 高清(D17)',
        `    {
      const { menu, useMenu } = menus.view
      const level = menu.stack.at(-1)
      globalThis.__bossItemMenu = {
        active: menus.active, panel: menu.openPanel,
        phase: useMenu.phase, cursor: useMenu.cursor,
        items: useMenu.items.map(({ id }) => id),
        level: level && { ids: level.nodes.map(({ id }) => id), cursor: level.cursor },
      }
    }`,
      )
    }
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
      let code = after(
        source,
        '        enemies.push(draw)',
        "        globalThis.__battleEvidence?.labelFighter(draw, 'enemy', i, e.hp <= 0 && !dyingNow)",
      )
      if (process.env.Q2_BOSS_FOREGROUND === '1') {
        const dialogue =
          '    if (this.assets.dialogBox?.visible) {\n      this.assets.dialogBox.render(now)'
        code = replaceOnce(
          code,
          dialogue,
          `    if (!this.assets.dialogBox?.visible && !this.choreoBanner)
      globalThis.__openingCauseDialogueDraw?.('reforge', [])
${dialogue}`,
        )
      }
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

const observeForeground: Plugin = {
  name: 'world-boss-foreground-observation',
  apply: 'serve',
  enforce: 'pre',
  transform(source, id) {
    const path = id.split('?')[0]?.replaceAll('\\', '/')
    if (path?.endsWith('/packages/game/src/present/battle/present-battle.ts')) {
      const anchor = '    const settlement = state.settlement'
      return {
        code: replaceOnce(
          source,
          anchor,
          `    globalThis.__openingCauseDialogueDraw?.('game', gs, assets.dialogAssets)
${anchor}`,
        ),
        map: null,
      }
    }
    if (path?.endsWith('/packages/game/src/present/present.ts')) {
      const actor = '      draw: (f) => drawSprite(f, capturedSprite, capturedSX, capturedSY + 7),'
      let code = replaceOnce(
        source,
        actor,
        `      draw: (f) => {
        drawSprite(f, capturedSprite, capturedSX, capturedSY + 7)
        globalThis.__bossForeground?.gameActor(npc, capturedSprite,
          ctx.npcSpriteFrames?.get(npc.spriteNum)?.indexOf(capturedSprite) ?? null, gs.camera)
      },`,
      )
      if (itemEntrance) {
        const cull = '    if (cullVy >= SCREEN_H || cullVy < -sprite.height) continue'
        code = replaceOnce(
          code,
          cull,
          `    if (cullVy >= SCREEN_H || cullVy < -sprite.height) {
        globalThis.__bossForeground?.gameCulledActor(npc, sprite,
          ctx.npcSpriteFrames?.get(npc.spriteNum)?.indexOf(sprite) ?? null, gs.camera, cullVy)
        continue
      }`,
        )
      }
      const dialog =
        '    drawConfirmBox(fb, gs.eventCursor.confirmYes ?? false, ctx.uiSpriteFrames, ctx.glyphs)\n  }'
      code = after(code, dialog, '  globalThis.__openingCauseDialogueDraw?.("game", gs, dialogCtx)')
      code = after(
        code,
        'function drawDialogOverlay(fb: Framebuffer, gs: GameState, ctx: PresentContext): void {',
        '  globalThis.__bossForeground?.gameBackdrop(gs, fb)',
      )
      code = after(
        code,
        '    drawConfirmBox(fb, gs.eventCursor.confirmYes ?? false, ctx.uiSpriteFrames, ctx.glyphs)',
        '    globalThis.__bossForeground?.showChoice(gs.eventCursor.confirmYes ?? false)',
      )
      code = after(
        code,
        '  const entries: DrawEntry[] = []',
        '  globalThis.__bossForeground?.beginComposite()',
      )
      code = replaceOnce(
        code,
        '\n}\n\nexport function flushToCanvas(',
        '\n  globalThis.__bossForeground?.gameWorldDrawn()\n}\n\nexport function flushToCanvas(',
      )
      return { code, map: null }
    }
    if (path?.endsWith('/packages/game/src/present/screen-shake.ts')) {
      const up = after(
        source,
        '      indices.fill(0, (SCREEN_H - level) * SCREEN_W, SCREEN_H * SCREEN_W)',
        '      globalThis.__bossForeground?.shift(-level)',
      )
      return {
        code: after(
          up,
          '      indices.fill(0, 0, shift)',
          '      globalThis.__bossForeground?.shift(level)',
        ),
        map: null,
      }
    }
    if (path?.endsWith('/packages/reforge/src/screen-shake-presentation.ts')) {
      return {
        code: after(
          source,
          '    context.restore()',
          '    globalThis.__bossForeground?.shift(shift / scale)',
        ),
        map: null,
      }
    }
    if (path?.endsWith('/packages/game/src/shell/bootstrap.ts')) {
      return {
        code: after(
          source,
          '      globalThis.__defeat?.gameDraw(gs, renderedBattle, fb.indices)',
          '      globalThis.__bossForeground?.gameFrame(gs, renderedBattle, canvasCtx)',
        ),
        map: null,
      }
    }
    const reforgeTarget = REFORGE_RENDER_TARGETS.find((file) => path?.endsWith(`/${file}`))
    if (reforgeTarget)
      return { code: instrumentReforgeRenderEvidence(source, reforgeTarget).code, map: null }

    if (path?.endsWith('/packages/reforge/src/main.ts')) {
      const surfaces = after(
        source,
        '      globalThis.__defeat?.reforgeDraw(true)',
        '      globalThis.__bossForeground?.battleFrame()',
      )
      const choice = after(
        surfaces,
        '      scriptConfirmModal.presented()',
        '      globalThis.__bossForeground?.showChoice(scriptConfirm.selectedYes)',
      )
      const staged = after(
        choice,
        '        advanceWaveFrame: motion.worldTicksThisFrame > 0,\n      })',
        `      globalThis.__bossForeground?.reforgeWorld(activeScene.scene.id, camera,
        globalThis.__e2eNpcDrawPasses?.get(sprites), partyLayer)`,
      )
      const dialog = '      dialogBox.render(performance.now())\n      ctx.restore()\n    }'
      const backdrop = after(
        staged,
        '      // Presentation Pass 3:fade 遮罩；Presentation Pass 4 的对话/菜单仍在它之上。\n      drawFadeCurtain()',
        '      globalThis.__bossForeground?.reforgeBackdrop(activeScene.scene.id, ctx)',
      )
      const withDialog = replaceOnce(
        backdrop,
        dialog,
        `${dialog} else { globalThis.__openingCauseDialogueDraw?.('reforge', []) }`,
      )
      const composed = replaceOnce(
        withDialog,
        '      if (dither.output) ctx.putImageData(dither.output, 0, 0)',
        `      if (dither.output) {
        ctx.putImageData(dither.output, 0, 0)
        globalThis.__bossForeground?.dither(step)
      }`,
      )
      return {
        code: replaceOnce(
          composed,
          '      runWithPresentationFinalizer(() => render(frameAt), abortScript)',
          `      globalThis.__bossForeground?.beginComposite()
      runWithPresentationFinalizer(() => render(frameAt), abortScript)
      globalThis.__bossForeground?.reforgeFrame(world.ambience ?? "day", ambienceShown, !!ambienceFx, ctx)`,
        ),
        map: null,
      }
    }
    if (path?.endsWith('/packages/reforge/src/dialog/dialog-box.ts')) {
      const update = '    this.update(nowMs)'
      return {
        code: replaceOnce(
          source,
          update,
          `    globalThis.__openingCauseDialogueDraw?.('reforge', this.observeSlots())\n${update}`,
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
  plugins: [
    ...base.plugins,
    observeBoss,
    ...(process.env.Q2_BOSS_FOREGROUND === '1' ? [observeForeground] : []),
  ],
}
