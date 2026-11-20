import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import game from '../../packages/game/vite.config.ts'
import reforge from '../../packages/reforge/vite.config.ts'
import { instrumentGameBattle } from './battle-game-instrumentation.mjs'
import { instrumentReforgeBattle } from './battle-reforge-instrumentation.mjs'
import { instrumentInnTrace } from './inn-trace-plugin.mjs'
import { instrumentGameRestore } from './scene-lifecycle-trace.mjs'

const engine = process.env.Q2_DEFEAT_ENGINE
assert(engine === 'game' || engine === 'reforge', 'scripted defeat requires one engine')
const base = engine === 'game' ? game : reforge

function replaceOnce(source: string, anchor: string, replacement: string): string {
  assert.equal(source.split(anchor).length, 2, `scripted defeat observation anchor: ${anchor}`)
  return source.replace(anchor, replacement)
}

function after(source: string, anchor: string, observation: string): string {
  return replaceOnce(source, anchor, `${anchor}\n${observation}`)
}

function observeGame(source: string, file: string): string | null {
  const target = `/packages/game/src/${file}`
  switch (file) {
    case 'core/scene-system.ts': {
      const contact = '      globalThis.__defeat?.gameContact(gs, npc)'
      const withTouch = after(
        instrumentInnTrace(source, `packages/game/src/${file}`).code,
        'if (loadEventFromNpc(gs, npc)) {',
        contact,
      )
      return after(
        withTouch,
        '      loadEventFromNpc(gs, npc)',
        '      if (gs.eventCursor?.triggerOwnerId === npc.id) globalThis.__defeat?.gameContact(gs, npc)',
      )
    }
    case 'core/event-system.ts': {
      const dispatch = "    switch (cmd.op) {\n      case 'end':\n        // sdlpal script.c:3475"
      return replaceOnce(
        source,
        dispatch,
        `    globalThis.__defeat?.gameOpcode(gs, cursor, cmd)\n${dispatch}`,
      )
    }
    case 'core/battle/battle-system.ts':
      return replaceOnce(
        instrumentGameBattle(source, target).code,
        'const rng = createSeedableRng(input.rngSeed ?? Date.now())',
        'const rng = createSeedableRng(globalThis.__defeat?.seed ?? input.rngSeed ?? Date.now())',
      )
    case 'core/battle/battle-settlement.ts':
    case 'core/battle/battle-finalization.ts':
    case 'core/rng.ts':
    case 'shell/audio.ts':
      return instrumentGameBattle(source, target).code
    case 'present/battle/present-battle.ts':
      return after(
        source,
        'const completedRounds = Math.floor((total > 0 ? step / total : 1) * 6)',
        '      globalThis.__defeat?.readingEntryBand(completedRounds)',
      )
    case 'present/battle/draw-battle-ui.ts':
      return after(
        source,
        '      drawMainIcons(fb, state, playerRoles, uiSpriteFrames, /* highlight= */ true)',
        "      globalThis.__defeat?.eventOnce('command-menu-drawn', { turn: state.turn + 1 })",
      )
    case 'present/present.ts': {
      const begun = after(
        source,
        '  const entries: DrawEntry[] = []',
        '  globalThis.__defeat?.beginWorldDraw(gs.camera, gs.walkingFrame.walking, gs.trail)',
      )
      const leader = replaceOnce(
        begun,
        "      draw: (f) => drawSprite(f, capturedFrame, capturedSX, capturedSY + 4),\n      id: 'party',",
        `      draw: (f) => {
        drawSprite(f, capturedFrame, capturedSX, capturedSY + 4)
        globalThis.__defeat?.gamePartyDraw(leaderRoleId, 0, leaderSpriteNum,
          activePartyFrames.indexOf(capturedFrame), gs.party, capturedSX, capturedSY + 4, capturedFrame)
      },
      id: 'party',`,
      )
      return replaceOnce(
        leader,
        '        draw: (f) => drawSprite(f, capturedFrame, capturedSX, capturedSY + 4),\n        id,',
        `        draw: (f) => {
          drawSprite(f, capturedFrame, capturedSX, capturedSY + 4)
          globalThis.__defeat?.gamePartyDraw(roleId, m, spriteNum,
            frames.indexOf(capturedFrame), fpos, capturedSX, capturedSY + 4, capturedFrame)
        },
        id,`,
      )
    }
    case 'shell/audio-midi.ts': {
      const played = after(
        source,
        '      sequencer.play()',
        '      globalThis.__defeat?.music(track, ctx.state)',
      )
      const stop = '      playingTrack = -1\n      seq?.pause()\n      last = undefined'
      return replaceOnce(
        played,
        stop,
        `      const stoppedTrack = playingTrack
${stop}
      if (seq && stoppedTrack > 0) globalThis.__defeat?.musicStop(stoppedTrack, ctx.state)`,
      )
    }
    case 'shell/bootstrap.ts': {
      const routed = replaceOnce(
        instrumentGameRestore(source, `packages/game/src/${file}`, '__defeatGameRestored'),
        '      if (!presentBattleFrame(fb, gs, battlePresent, battleAssets, drained, ticked)) {',
        '      const renderedBattle = presentBattleFrame(fb, gs, battlePresent, battleAssets, drained, ticked)\n      if (!renderedBattle) {',
      )
      const drawn = after(
        routed,
        '      flushToCanvas(fb, canvasCtx, applyDialogIconPaletteShift(gs, gs.palette ?? palette))',
        '      globalThis.__defeat?.gameDraw(gs, renderedBattle, fb.indices)',
      )
      return after(
        drawn,
        '      w.__lastBattleFieldId = battleFieldId',
        "      globalThis.__defeat?.event('battle-caller', { enemyTeamId, battleFieldId, isBoss })",
      )
    }
    default:
      return null
  }
}

function observeReforge(source: string, file: string): string | null {
  switch (file) {
    case 'main.ts': {
      const scoped = after(
        source,
        '    if (showingGameOver) return',
        '    globalThis.__defeat?.reforgeDraw(false)',
      )
      const lost = after(
        scoped,
        '    const showingGameOver = gameOverPresentation.draw(ctx, frames.now)',
        '    if (showingGameOver) globalThis.__defeat?.gameOver()',
      )
      const move = '            player.pos = { ...playerOutcome.to }'
      const input = replaceOnce(
        lost,
        move,
        `            const from = { ...player.pos }
${move}
            if (playerMoved && inputDirection)
              globalThis.__defeat?.reforgeMove(activeScene.scene.id, from, player.pos, inputDirection)`,
      )
      const trigger = after(
        input,
        "    if (runner) return\n    const triggerOwnerId =\n      key.startsWith('s:') || key.startsWith('hostile:') ? null : (selfId ?? key)",
        '    globalThis.__defeat?.reforgeContact(activeScene.scene.id, triggerOwnerId, player.pos)',
      )
      const world = replaceOnce(
        trigger,
        '      worldPresentation.renderWorld({\n        scene: activeScene,',
        `      globalThis.__defeat?.beginWorldDraw(camera, walking, trail)
      worldPresentation.renderWorld({
        scene: activeScene,`,
      )
      const origin = after(
        world,
        '        worldBattleEntry = entry',
        '        globalThis.__defeat?.reforgeEntrySource(ctx)',
      )
      const battleFrame = after(
        origin,
        '      battleHost.active.render(ctx, WORLD_SCALE)',
        '      globalThis.__defeat?.reforgeDraw(true)',
      )
      return after(
        battleFrame,
        '    loadLastSave: async (signal) => {',
        '      globalThis.__defeat?.loadLastSave()',
      )
    }
    case 'world-scene-presentation.ts': {
      const leader = replaceOnce(
        source,
        '      sprites.push(partySprite(leaderFrame, input.player.pos, pixel, input.player.layer, 0, true))',
        `      const draw = partySprite(leaderFrame, input.player.pos, pixel, input.player.layer, 0, true)
      globalThis.__defeat?.tagReforgePartyDraw(draw, leader?.template, 0, leaderDefinition.id, leaderFrameIndex)
      sprites.push(draw)`,
      )
      return replaceOnce(
        leader,
        `      sprites.push(
        partySprite(
          frame,
          follower.pos,
          gridToPixel(follower.pos),
          input.player.layer,
          partyIndex,
          true,
        ),
      )`,
        `      const draw = partySprite(frame, follower.pos, gridToPixel(follower.pos), input.player.layer, partyIndex, true)
      globalThis.__defeat?.tagReforgePartyDraw(draw, member?.template, partyIndex, visual.def.id, frameIndex)
      sprites.push(draw)`,
      )
    }
    case 'render.ts': {
      const camera = after(
        source,
        '    const oy = -camera.y',
        '    globalThis.__defeat?.reforgeCamera(camera)',
      )
      return replaceOnce(
        camera,
        '            : () => this.ctx.drawImage(image, x, y),',
        `            : () => {
                this.ctx.drawImage(image, x, y)
                globalThis.__defeat?.reforgePartyDraw(sprite, x, y, image.width, image.height)
              },`,
      )
    }
    case 'battle/battle-entry-presentation.ts': {
      const ready = after(
        source,
        '  show(drawTarget: () => void): Promise<void> {',
        "    globalThis.__defeat?.eventOnce('entry-assets-ready', {})",
      )
      const drawn = replaceOnce(
        ready,
        '      if (complete) reveal.complete()',
        `      globalThis.__defeat?.reforgeEntry(this.frame, reveal.bands, complete, this.pixelScale)
      if (complete) reveal.complete()`,
      )
      return after(
        drawn,
        '\n    ctx.putImageData(this.frame, 0, 0)',
        '    globalThis.__defeat?.reforgeEntry(this.frame, 0, false, this.pixelScale)',
      )
    }
    case 'battle/battle-launch-preparation.ts':
      return after(
        source,
        '    const fieldId = options?.fieldId ?? ports.readScene().battleFieldId ?? 24',
        "    globalThis.__defeat?.event('field', { fieldId })",
      )
    case 'battle/battle-host.ts': {
      const seeded = replaceOnce(
        source,
        '      Math.random,',
        '      globalThis.__defeat?.rng ?? Math.random,',
      )
      const prepared = after(
        seeded,
        '    const { sessionAssets, sessionOptions } = prepared.commit()',
        `    globalThis.__defeat?.event('prepared', {
      team, boss: !!options?.boss, auto: !!options?.auto, music: prepared.battleTrack,
      players: prepared.players.map(({ roleId, hp, mp, defense, magicStrength, baseDexterity }) =>
        ({ roleId, hp, mp, defense, magicStrength, speed: baseDexterity })),
    })
    globalThis.__defeat?.reforgePartyBattleSprites(sessionAssets.playerBaseDefinitionIds)`,
      )
      return after(
        prepared,
        '    this.ports.finishWorld(session, result)',
        '    globalThis.__defeat?.reforgeFinish(session, result, this.ports.readWorld())',
      )
    }
    case 'battle/battle-session.ts': {
      const submit =
        'submit: (playerIndex, action) => this.state.pendingActions.set(playerIndex, action)'
      const committed = replaceOnce(
        source,
        submit,
        `submit: (playerIndex, action) => {
          const committed = this.state.pendingActions.set(playerIndex, action)
          globalThis.__defeat?.command(playerIndex, this.state.turn, action)
          return committed
        }`,
      )
      const acted = replaceOnce(
        committed,
        '      const la = s.lastAction',
        `      const la = s.lastAction
      if (la) globalThis.__defeat?.reforgeAction(la, s)`,
      )
      const drawn = after(
        acted,
        '      drawSettlementScreen(ctx, settlementScreen, ui, g)',
        "      globalThis.__defeat?.eventOnce('settlement', settlementScreen)",
      )
      const completed = after(
        drawn,
        '      const completed = this.settlementPresentation.advance(dtMs, pressed, this.opts.handoffDefeat)',
        '      globalThis.__defeat?.terminalFrameReady(s.phase, completed)',
      )
      return after(
        completed,
        `          this.selection.mainActionValidity(selectionContext),
          true,
        )`,
        `        if (selection.phase === 'menu' && this.selectionStartedForTurn === s.turn)
          globalThis.__defeat?.eventOnce('command-menu-drawn', { turn: s.turn })`,
      )
    }
    case 'script-runner-core.ts': {
      const step = after(
        source,
        '            this.onStep?.({ path: commandPath, command })',
        '            globalThis.__defeat?.reforgeOpcode(this.self, commandPath, command, this.runningTiming)',
      )
      return after(
        step,
        "        frame.control = { kind: 'startBattle', arm }",
        '        globalThis.__defeat?.reforgeArm(this.self, path, arm)',
      )
    }
    case 'script-world.ts': {
      const end = '    return { ...resolved, lease }\n  }\n\n  epochForKey'
      return replaceOnce(
        source,
        end,
        `    globalThis.__defeat?.reforgeSceneHook(scene.id, slot, resolved)\n${end}`,
      )
    }
    case 'audio/bgm.ts': {
      const played = after(
        source,
        '      sequencer.play()',
        '      globalThis.__defeat?.music(asset, ctx.state)',
      )
      return replaceOnce(
        played,
        '        if (seq) seq.pause()\n        playing = undefined',
        `        if (seq) {
          seq.pause()
          if (playing) globalThis.__defeat?.musicStop(playing, ctx.state)
        }
        playing = undefined`,
      )
    }
    case 'audio/sfx.ts':
      return instrumentReforgeBattle(source, `packages/reforge/src/${file}`).code
    default:
      return null
  }
}

const plugin: Plugin = {
  name: 'scripted-defeat-observation',
  apply: 'serve',
  enforce: 'pre',
  transform(source, id) {
    const path = id.split('?')[0]?.replaceAll('\\', '/')
    const owner = `/packages/${engine}/src/`
    const file = path?.split(owner)[1]
    if (!file) return null
    const code = engine === 'game' ? observeGame(source, file) : observeReforge(source, file)
    return code === null ? null : { code, map: null }
  },
}

export default {
  ...base,
  cacheDir: fileURLToPath(
    new URL(`../../build/e2e/vite-battle-scripted-defeat-${engine}`, import.meta.url),
  ),
  plugins: [...base.plugins, plugin],
}
