import assert from 'node:assert/strict'
import type { Plugin } from 'vite'
import base from '../../../scripts/e2e/battle-scripted-defeat.config.mts'

function replaceAt(source: string, anchor: string, replacement: string) {
  assert.equal(
    source.split(anchor).length,
    2,
    `Dragon pillar observation anchor changed: ${anchor}`,
  )
  return source.replace(anchor, replacement)
}
function appendAt(source: string, anchor: string, observation: string) {
  return replaceAt(source, anchor, `${anchor}\n${observation}`)
}

const observation: Plugin = {
  name: 'q2-dragon-pillar-world-observer',
  apply: 'serve',
  enforce: 'pre',
  transform(source, id) {
    const file = id.split('?')[0]
    if (file?.endsWith('/packages/game/src/core/scene-system.ts')) {
      return {
        code: appendAt(
          source,
          '      loadEventFromNpc(gs, npc)',
          '      if (gs.eventCursor?.triggerOwnerId === npc.id) globalThis.__defeat?.gameContact(gs, npc)',
        ),
        map: null,
      }
    }
    if (file?.endsWith('/packages/reforge/src/battle/battle-world-result.ts')) {
      const defaultRng = '  rng: () => number = Math.random,'
      assert.equal(source.split(defaultRng).length, 2)
      return {
        code: source.replace(
          defaultRng,
          '  rng: () => number = globalThis.__defeat?.rng ?? Math.random,',
        ),
        map: null,
      }
    }
    if (file?.endsWith('/packages/game/src/core/event-system.ts')) {
      let code = appendAt(
        source,
        '    globalThis.__defeat?.gameOpcode(gs, cursor, cmd)',
        '    globalThis.__interlude?.gameOp(gs, cursor, cmd)',
      )
      code = replaceAt(
        code,
        '  const cmd = cmds[cursor.ip]!\n\n  switch (cmd.op) {',
        '  const cmd = cmds[cursor.ip]!\n  globalThis.__interlude?.gameAuto(gs, npc, cursor, cmd)\n\n  switch (cmd.op) {',
      )
      return { code, map: null }
    }
    if (file?.endsWith('/packages/game/src/present/present.ts')) {
      const apply = '    applyScreenShake(fb.indices, gs, advanceEffects)'
      let code = replaceAt(
        source,
        apply,
        `    const collapseShakeTime = gs.shakeTime
${apply}
    globalThis.__collapse?.gameShake(gs, collapseShakeTime, advanceEffects, fb.indices)
    globalThis.__interlude?.shift((collapseShakeTime % 2 === 1 ? -1 : 1) * gs.shakeLevel)`,
      )
      code = appendAt(
        code,
        '  globalThis.__defeat?.beginWorldDraw(gs.camera, gs.walkingFrame.walking, gs.trail)',
        '  globalThis.__partyPalette?.begin()',
      )
      code = appendAt(
        code,
        'activePartyFrames.indexOf(capturedFrame), gs.party, capturedSX, capturedSY + 4, capturedFrame)',
        '        globalThis.__partyPalette?.gameSprite(leaderRoleId, 0, leaderSpriteNum, activePartyFrames.indexOf(capturedFrame), capturedSX, capturedSY + 4, capturedFrame)',
      )
      code = appendAt(
        code,
        'frames.indexOf(capturedFrame), fpos, capturedSX, capturedSY + 4, capturedFrame)',
        '          globalThis.__partyPalette?.gameSprite(roleId, m, spriteNum, frames.indexOf(capturedFrame), capturedSX, capturedSY + 4, capturedFrame)',
      )
      code = appendAt(
        code,
        '    drawDialogBox(fb, gs.dialogBox, ctx.glyphs, dialogCtx)',
        '    globalThis.__interlude?.gameDialogue(gs, gs.dialogBox)',
      )
      code = replaceAt(
        code,
        '      draw: (f) => drawSprite(f, capturedSprite, capturedSX, capturedSY + 7),',
        `      draw: (f) => {
        drawSprite(f, capturedSprite, capturedSX, capturedSY + 7)
        globalThis.__interlude?.gameDrawNpc(npc, capturedSprite, ctx.npcSpriteFrames?.get(npc.spriteNum)?.indexOf(capturedSprite),
          capturedSX, capturedSY + 7)
      },`,
      )
      return { code, map: null }
    }
    if (file?.endsWith('/packages/game/src/shell/bootstrap.ts')) {
      let code = appendAt(
        source,
        '      flushToCanvas(fb, canvasCtx, applyDialogIconPaletteShift(gs, gs.palette ?? palette))',
        `      globalThis.__collapse?.gameDraw(gs, gs.sceneLoading || renderedBattle)
      globalThis.__partyPalette?.gameWorld(gs, canvasCtx, gs.palette?.colors ?? palette.colors, renderedBattle)
      globalThis.__interlude?.gameWorld(gs, canvasCtx, fb.indices, renderedBattle, ticked)`,
      )
      code = replaceAt(
        code,
        '      const renderedBattle = presentBattleFrame(',
        "      globalThis.__interlude?.begin('s' + String(gs.wNumScene - 1).padStart(3, '0'))\n      const renderedBattle = presentBattleFrame(",
      )
      return { code, map: null }
    }
    if (file?.endsWith('/packages/game/src/shell/rng-player.ts')) {
      let code = appendAt(
        source,
        '      .map((f) => f.index)',
        `    globalThis.__collapse?.gameAnimationBegin(options, frameIndices)
    globalThis.__interlude?.gameFilmBegin(options)`,
      )
      code = appendAt(code, '    let framesShown = 0', '    let collapseIndex = -1')
      code = appendAt(code, '    for (const frame of frames) {', '      collapseIndex++')
      code = appendAt(
        code,
        '      options.fb.indices.set(frame.indices)',
        `      const collapseCount = options.shakeState?.shakeTime ?? 0
      const collapseShiftY = collapseCount
        ? (collapseCount % 2 === 1 ? -1 : 1) * (options.shakeState?.shakeLevel ?? 0)
        : 0`,
      )
      code = replaceAt(
        code,
        'async function fadeInFirstFrame(options: PlayRngOptions): Promise<void> {',
        'async function fadeInFirstFrame(options: PlayRngOptions, observe: () => void): Promise<void> {',
      )
      code = replaceAt(
        code,
        '    flushToCanvas(options.fb, options.canvasCtx, options.palette)\n    return',
        '    flushToCanvas(options.fb, options.canvasCtx, options.palette)\n    observe()\n    return',
      )
      code = appendAt(
        code,
        '  flushToCanvas(options.fb, options.canvasCtx, scalePalette(options.palette, 0))',
        '  observe()',
      )
      code = replaceAt(
        code,
        '        await fadeInFirstFrame(options)',
        `        await fadeInFirstFrame(options, () => {
          globalThis.__collapse?.gameAnimationDraw(options, frameIndices[collapseIndex], 'first-flush', collapseShiftY)
          globalThis.__interlude?.gameFilmDraw(options, frameIndices[collapseIndex])
        })`,
      )
      code = appendAt(
        code,
        '        flushToCanvas(options.fb, options.canvasCtx, options.palette)',
        `        globalThis.__collapse?.gameAnimationDraw(options, frameIndices[collapseIndex], 'flush', collapseShiftY)
        globalThis.__interlude?.gameFilmDraw(options, frameIndices[collapseIndex])`,
      )
      code = appendAt(
        code,
        '    if (skipped && options.shakeState) {\n      const remaining = frames.length - framesShown\n      options.shakeState.shakeTime = Math.max(0, options.shakeState.shakeTime - remaining)\n    }',
        `    globalThis.__collapse?.gameAnimationEnd(options, framesShown, skipped)
    globalThis.__interlude?.gameFilmEnd(options)`,
      )
      return { code, map: null }
    }
    if (file?.endsWith('/packages/reforge/src/frame-animation-player.ts')) {
      let code = appendAt(
        source,
        "  const target = options.eventTarget ?? (typeof window === 'undefined' ? undefined : window)",
        '  globalThis.__collapse?.reforgeAnimationBegin(options.asset, range)',
      )
      code = replaceAt(
        code,
        '      options.onFrame(frame)',
        '      globalThis.__collapse?.reforgeAnimationIndex(options.asset, frameIndex, frame)\n      globalThis.__interlude?.rfFilmIndex(options.asset, frameIndex, frame)\n      options.onFrame(frame)',
      )
      return { code, map: null }
    }
    if (file?.endsWith('/packages/reforge/src/screen-shake-presentation.ts')) {
      const code = appendAt(
        source,
        '    context.restore()',
        `    globalThis.__collapse?.reforgeAppliedShift(shift / scale)
    globalThis.__interlude?.shift(shift / scale)`,
      )
      return { code, map: null }
    }
    if (file?.endsWith('/packages/reforge/src/script-runner-core.ts')) {
      const code = appendAt(
        source,
        '            globalThis.__defeat?.reforgeOpcode(this.self, commandPath, command)',
        '            globalThis.__interlude?.rfStep(this.self, commandPath, command)',
      )
      return { code, map: null }
    }
    if (file?.endsWith('/packages/reforge/src/world-scene-presentation.ts')) {
      let code = appendAt(
        source,
        '      globalThis.__defeat?.tagReforgePartyDraw(draw, leader?.template, 0, leaderDefinition.id, leaderFrameIndex)',
        '      globalThis.__partyPalette?.tag(draw, leader?.template, 0, leaderDefinition.id, leaderFrameIndex)',
      )
      code = appendAt(
        code,
        '      globalThis.__defeat?.tagReforgePartyDraw(draw, member?.template, partyIndex, visual.def.id, frameIndex)',
        '      globalThis.__partyPalette?.tag(draw, member?.template, partyIndex, visual.def.id, frameIndex)',
      )
      code = replaceAt(
        code,
        '      sprites.push({\n        frame,\n        worldX: pixel.x,',
        '      const interludeDraw = {\n        frame,\n        worldX: pixel.x,',
      )
      code = replaceAt(
        code,
        '        occlusionTrigger: false,\n      })\n    }',
        `        occlusionTrigger: false,
      }
      globalThis.__interlude?.rfTag(interludeDraw, entity, frameIndex, definition?.id)
      sprites.push(interludeDraw)
    }`,
      )
      return { code, map: null }
    }
    if (file?.endsWith('/packages/reforge/src/render.ts')) {
      const code = appendAt(
        source,
        '                globalThis.__defeat?.reforgePartyDraw(sprite, x, y, image.width, image.height)',
        `                globalThis.__partyPalette?.rfSprite(sprite, x, y)
                globalThis.__interlude?.rfDraw(sprite, x, y)`,
      )
      return { code, map: null }
    }
    if (file?.endsWith('/packages/reforge/src/main.ts')) {
      let code = appendAt(
        source,
        '    const owner = beginFrameAnimationPlayback()',
        `      globalThis.__collapse?.reforgeAnimationRequest(opts, owner)
      globalThis.__interlude?.rfFilmRequest(opts, activeScene.scene.id)`,
      )
      code = replaceAt(
        code,
        '      const sprites = worldPresentation.sprites({',
        '      globalThis.__partyPalette?.begin()\n      const sprites = worldPresentation.sprites({',
      )
      code = appendAt(
        code,
        '        succeeded = true\n      } finally {\n        frameAnimationPresentation.finishPlayback(owner, {\n          succeeded,\n          holdLastFrame: opts.holdLastFrame,\n        })',
        `        globalThis.__collapse?.reforgeAnimationEnd(opts.asset, succeeded, frameAnimationPresentation.mode)
        globalThis.__interlude?.rfFilmEnd(opts.asset, succeeded, frameAnimationPresentation.mode, activeScene.scene.id)`,
      )
      code = replaceAt(
        code,
        '      runWithPresentationFinalizer(() => render(frameAt), abortScript)',
        `      runWithPresentationFinalizer(() => {
        globalThis.__interlude?.begin(activeScene.scene.id)
        render(frameAt)
        if (activeScene.scene.id === 's149' || activeScene.scene.id === 's150') {
          globalThis.__interlude?.rfWorld(ctx, {
            scene: activeScene.scene.id, tick: motion.worldTick, now: frames.now,
            opacity: fadeDriver.value, mode: frameAnimationPresentation.mode,
            sceneEntryPhase: sceneEntrySession.active?.phase, autoEntryPending: autoRunnersPendingForEntry,
            held: !!sceneEntrySession.heldFrame, camera: { ...camera },
            leader: { position: {...player.pos}, facing, actor: world.party[0]?.template },
          }, activeScene.scene.entities.map((entity) => ({
            id: entity.id, pos: {...entity.pos}, facing: entity.facing, hidden: !entityLifecycleGates(entity).visible,
            pending: autoMotionSlots.get(entity.id)?.kind, activation: autoActivations.get(entity.id)?.epoch,
          })), frameAnimationPresentation.visibleFrame, activeScene.palette.colors)
        }
      }, abortScript)`,
      )
      code = appendAt(
        code,
        '      dialogBox.render(performance.now())',
        '      globalThis.__interlude?.rfDialogue(activeScene.scene.id, globalThis.__tpObserve?.readRuntime()?.dialogueSlots)',
      )
      const composite = '    screenShake.apply(ctx, WORLD_SCALE)'
      if (code.includes(composite)) {
        code = replaceAt(
          code,
          '    shakeScreen: (timeFrames, level) => screenShake.start(timeFrames, level),',
          `    shakeScreen: (timeFrames, level) => {
      screenShake.start(timeFrames, level)
      globalThis.__collapse?.reforgeShake(activeScene.scene.id, frames.now, timeFrames, level)
    },`,
        )
        code = replaceAt(
          code,
          composite,
          `    globalThis.__collapse?.reforgeBeginComposite()
${composite}
    globalThis.__collapse?.reforgeComposited(activeScene.scene.id, frames.now, camera, fadeDriver.value,
      cinematicLayerDrawn, frameAnimationPresentation.visibleFrame, frameAnimationPresentation.mode)
    globalThis.__partyPalette?.rfWorld(activeScene.scene.id, ctx, activeScene.palette.colors, world.ambience,
      world.party, runtimeScript.vars, fadeDriver.value, cinematicLayerDrawn)`,
        )
      } else {
        code = appendAt(
          code,
          '    ctx.drawImage(frameAnimationLayerCanvas, 0, 0, canvas.width, canvas.height)',
          '    globalThis.__collapse?.reforgeAnimationDraw(frameAnimationPresentation.visibleFrame, frameAnimationPresentation.mode, 0)',
        )
        code = appendAt(
          code,
          '      worldPresentation.shake(frames.now, timeFrames, level)',
          '      globalThis.__collapse?.reforgeShake(activeScene.scene.id, frames.now, timeFrames, level)',
        )
        code = replaceAt(
          code,
          '      worldPresentation.renderWorld({\n        scene: activeScene,',
          '      const collapseRenderedCamera = worldPresentation.renderWorld({\n        scene: activeScene,',
        )
        code = appendAt(
          code,
          '      cinematicLayerDrawn = drawCinematicLayer()',
          '      globalThis.__collapse?.reforgeWorld(activeScene.scene.id, frames.now, camera, collapseRenderedCamera, fadeDriver.value, cinematicLayerDrawn)',
        )
      }
      return { code, map: null }
    }
    return null
  },
}

export default { ...base, plugins: [...base.plugins, observation] }
