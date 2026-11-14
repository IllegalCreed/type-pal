import assert from 'node:assert/strict'
import { createSeedableRng } from '../../packages/game/src/core/rng.ts'
import {
  beeWorldArguments,
  beeWorldInput as input,
  beePartyMember as party,
  honeycombText as prompt,
} from './battle-world-bee-scenario.mjs'
import { runBrowserJourney, sha256 } from './browser-journey.mjs'
import { installCommittedRoutePlayback, replayCommittedRoute } from './committed-route.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { createEvidenceRecorder } from './evidence-recorder.mjs'
import { fixedRoutePlan } from './fixed-route-plan.mjs'
import { canonicalInput, pressRecordedKey } from './input-ledger.mjs'

const { cases: selected, capture: captureRequested } = beeWorldArguments()
const { scene, start, hold, stop, returnInput } = input
const plan = fixedRoutePlan('game', {
  id: 'bee-approach',
  scene,
  start,
  holds: hold,
  completion: { scene, position: stop, mode: 'ready' },
})
const sweepDamage = new Map([
  [4, [747, 373, 249, 124]],
  [99, [249, 124, 747, 373]],
  [138, [249, 124, 249, 124]],
])

function installBeeObserver(makeRng, createRecorder) {
  const seed = new URL(location.href).searchParams.get('q2WorldSeed')
  const errors = [],
    rng = [],
    slots = [],
    frames = [],
    commands = [],
    moves = [],
    restores = [],
    handoff = [],
    inputs = [],
    music = [],
    ambient = []
  let overflow = false
  const { append } = createRecorder({
    context: () => ({ atMs: performance.now() }),
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  if (seed !== null) {
    const native = makeRng(Number(seed))
    const take = (kind, ...args) => {
      const before = native.getState()
      const value = native[kind](...args)
      const after = native.getState()
      if (after !== before) append(rng, { kind, args, value, before, after }, 64)
      return value
    }
    globalThis.__beeGameRng = {
      next: () => take('next'),
      range: (lo, hi) => take('range', lo, hi),
      rangeFloat: (lo, hi) => take('rangeFloat', lo, hi),
      rangeInclusive: (lo, hi) => take('rangeInclusive', lo, hi),
      getState: native.getState,
    }
  }

  function read(gs = globalThis.__tpgs) {
    if (!gs) return null
    const actor = gs.npcs.find((npc) => npc.id === 154)
    const menu = gs.menuStack.at(-1)
    const box = gs.dialogBox
    const battle = gs.battleState
    const settlement = battle?.settlement
    const [x, y] = [gs.party.x, gs.party.y]
    return {
      scene: gs.wNumScene,
      mode: gs.mode,
      field: gs.wNumBattleField,
      party: gs.partyMembers.map((id) => ({
        id,
        hp: gs.PlayerRolesRuntime.rgwHP[id],
        mp: gs.PlayerRolesRuntime.rgwMP[id],
        maxHP: gs.PlayerRolesRuntime.rgwMaxHP[id],
        maxMP: gs.PlayerRolesRuntime.rgwMaxMP[id],
        level: gs.PlayerRolesRuntime.rgwLevel[id],
        weapon: gs.PlayerRolesRuntime.rgwEquipment[3][id],
      })),
      position: [x, y],
      grid: [(x / 16 + y / 8) / 2, (y / 8 - x / 16) / 2],
      facing: gs.party.facing,
      ready: globalThis.__routeGameReadiness(gs).routeReady,
      cash: gs.dwCash,
      loot: gs.inventory.find((item) => item.itemId === 115)?.count ?? 0,
      npc: actor
        ? {
            position: [actor.x, actor.y],
            state: actor.sState,
            vanishTime: actor.sVanishTime ?? 0,
            label: actor.triggerLabel,
            cursor: actor.triggerResume ?? null,
          }
        : null,
      menu: menu ? { kind: menu.kind, cursor: menu.state?.selection?.cursor } : null,
      event: gs.eventCursor
        ? { entry: gs.eventCursor.ip, owner: gs.eventCursor.triggerOwnerId ?? null }
        : null,
      resume: gs.postBattleResume
        ? {
            entry: gs.postBattleResume.wonIp,
            owner: gs.postBattleResume.triggerOwnerId,
            lost: gs.postBattleResume.lostIp,
            fled: gs.postBattleResume.fledIp,
          }
        : null,
      starts: globalThis.__battleStartCount ?? 0,
      team: globalThis.__lastBattleEnemyTeam ?? null,
      battle: battle
        ? {
            phase: battle.phase,
            ui: battle.uiState,
            menu: battle.menuState,
            selection: battle.selectedAction,
            round: battle.turn,
            active: battle.currentActionIndex,
            auto: !!(battle.fAutoAttack || battle.fAutoBattle),
            enemies: battle.enemies.map((enemy) => ({
              id: enemy.objectId,
              hp: enemy.e.health,
              defeated: !!enemy.defeated,
            })),
            players: battle.players.map((p) => ({
              id: p.roleId,
              dual: p.status.dualAttack,
              frame: p.currentFrame,
              position: p.pos,
            })),
            animation: battle.battleAnim?.idx ?? null,
            pending: [...battle.pendingActions],
            queue: battle.actionQueue.map(({ idx, isEnemy, dex }) => ({ idx, isEnemy, dex })),
            settlement: settlement
              ? {
                  index: settlement.index,
                  shownMs: settlement.shownMs,
                  screen: settlement.screens[settlement.index] ?? null,
                }
              : null,
          }
        : null,
      dialog: box ? { text: box.currentLineText, style: box.style } : null,
    }
  }

  // Read the ImageData just passed to the real canvas. Hashes are quick fingerprints;
  // the frozen-source claim compares every index to the last live battle frame.
  function inspectPixels({ data, width, height }, indices, sourceIndices) {
    let rgbTotal = 0,
      maxChannel = 0,
      nonBlack = 0,
      opaque = 0
    let rgbaHash = 0x811c9dc5,
      indexHash = 0x811c9dc5
    let sameIndices = sourceIndices?.length === indices.length
    for (let i = 0, offset = 0; i < indices.length; i++, offset += 4) {
      const red = data[offset],
        green = data[offset + 1],
        blue = data[offset + 2],
        alpha = data[offset + 3]
      rgbTotal += red + green + blue
      maxChannel = Math.max(maxChannel, red, green, blue)
      if (red || green || blue) nonBlack++
      if (alpha === 255) opaque++
      rgbaHash = Math.imul(
        rgbaHash ^ (red | (green << 8) | (blue << 16) | (alpha << 24)),
        0x01000193,
      )
      indexHash = Math.imul(indexHash ^ indices[i], 0x01000193)
      if (sameIndices && sourceIndices[i] !== indices[i]) sameIndices = false
    }
    return {
      width,
      height,
      rgbMean: rgbTotal / (width * height * 3),
      maxChannel,
      nonBlack,
      opaque,
      rgbaHash: (rgbaHash >>> 0).toString(16).padStart(8, '0'),
      indexHash: (indexHash >>> 0).toString(16).padStart(8, '0'),
      ...(sourceIndices && { sameIndicesAsBattleSource: sameIndices }),
    }
  }
  const point = (stage, gs, extra = {}) => {
    const { x, y } = gs.party
    const box = gs.dialogBox
    return {
      stage,
      scene: gs.wNumScene,
      grid: [(x / 16 + y / 8) / 2, (y / 8 - x / 16) / 2],
      mode: gs.mode,
      dialog: box ? { text: box.currentLineText, style: box.style } : null,
      ready: globalThis.__routeGameReadiness(gs).routeReady,
      sceneMusic: gs.wNumMusic,
      battleMusic: gs.wNumBattleMusic,
      battlePhase: gs.battleState?.phase ?? null,
      ...extra,
    }
  }
  const eventKeys = new Set(['ArrowRight', 'Space', 'Escape'])
  let contacted,
    battleEntered = false,
    commandReady = false,
    worldReady = false
  let layer,
    introRounds,
    lastIntroRounds = 0,
    draw = 0,
    lastBattleDraw,
    lastBattleImage,
    lastBattleIndices,
    frozenSourceDraw
  globalThis.__beeGameContact = (gs, npc) => {
    if (seed === null || gs.wNumScene !== 7 || npc.id !== 154) return
    contacted = append(
      handoff,
      point('contact', gs, {
        entityId: 'e154',
        entry: gs.eventCursor.ip,
        enemyPosition: [npc.x, npc.y],
      }),
      512,
    )
  }
  globalThis.__beeGameBattleStart = (gs, teamId, battleFieldId) => {
    if (!contacted || gs.wNumScene !== 7) return
    append(handoff, point('battle-start', gs, { teamId, battleFieldId }), 512)
  }
  globalThis.__beeGameLayer = (value) => {
    layer = value
  }
  globalThis.__beeGameIntro = (value) => {
    introRounds = value
  }
  globalThis.__beeGamePrepareDraw = (gs, renderer, ticked) => {
    const renderedLayer = renderer === 'battle' ? 'battle' : layer
    const completedRounds = introRounds
    layer = undefined
    introRounds = undefined
    if (seed === null || gs.wNumScene !== 7) return undefined
    draw++
    if (!contacted || worldReady) return undefined
    const fade = gs.paletteFadeState
    const phase = gs.battleState?.phase
    let stage
    if (renderer === 'battle') {
      if (!battleEntered) {
        battleEntered = true
        stage = 'battle-entry'
      } else if (completedRounds > lastIntroRounds) {
        stage = 'battle-intro'
      } else if (
        !commandReady &&
        phase === 'selectAction' &&
        gs.battleState.uiState === 'selectMove'
      ) {
        commandReady = true
        stage = 'battle-command-ready'
      } else if (phase === 'won') stage = 'battle-victory'
      if (completedRounds !== undefined) lastIntroRounds = completedRounds
    } else if (!battleEntered) stage = 'contact-world'
    else if (lastBattleDraw) {
      // The immediately preceding successful draw becomes the frozen source only at handoff.
      append(
        handoff,
        {
          ...lastBattleDraw,
          stage: 'battle-source',
          pixels: inspectPixels(lastBattleImage, lastBattleIndices),
        },
        512,
      )
      frozenSourceDraw = lastBattleDraw.draw
      lastBattleDraw = undefined
      lastBattleImage = undefined
    }
    if (renderer === 'world' && battleEntered) {
      if (fade?.fade60 === 'out') stage = 'fade-out'
      else if (fade?.fade60 === 'in') stage = 'world-fade-in'
      else if (globalThis.__routeGameReadiness(gs).routeReady) {
        worldReady = true
        stage = 'world-ready'
      } else stage = 'world-handoff'
    }
    if (!stage) return undefined

    const paletteFade = fade
      ? {
          direction: fade.fade60 ?? fade.fade63 ?? null,
          freeze: fade.freeze === true,
          startAtMs: fade.startTimeMs,
          durationMs: fade.totalMs,
        }
      : null
    return (image, indices) => {
      const atMs = performance.now()
      const isFrozen = renderedLayer === 'frozen' && lastBattleIndices !== undefined
      if (stage === 'battle-victory') {
        lastBattleIndices ??= new Uint8Array(indices.length)
        lastBattleIndices.set(indices)
        lastBattleImage = image
        lastBattleDraw = point(stage, gs, {
          atMs,
          draw,
          renderer,
          layer: renderedLayer,
          ticked,
          paletteFade,
        })
        return
      }
      const pixels = inspectPixels(image, indices, isFrozen ? lastBattleIndices : undefined)
      append(
        handoff,
        point(
          pixels.nonBlack === 0 && (stage === 'fade-out' || stage === 'world-handoff')
            ? 'black'
            : stage,
          gs,
          {
            atMs,
            draw,
            renderer,
            layer: renderedLayer ?? null,
            ticked,
            paletteFade,
            pixels,
            ...(completedRounds !== undefined && { completedRounds }),
            ...(isFrozen && { frozenFromDraw: frozenSourceDraw }),
            settlement:
              gs.battleState?.settlement?.screens[gs.battleState.settlement.index]?.kind ?? null,
          },
        ),
        512,
      )
    }
  }
  globalThis.__beeGameMusic = (stage, track, ctx, loop) => {
    if (!contacted) return
    append(
      music,
      {
        stage,
        backend: 'midi',
        track,
        loop,
        audioContextTime: ctx.currentTime,
        audioContextState: ctx.state,
      },
      24,
    )
  }
  globalThis.__beeGameAmbient = (track, audioContextState, buffer) => {
    if (seed === null || ![66, 73].includes(track) || globalThis.__tpgs?.wNumScene !== 7) return
    append(ambient, { track, audioContextState, seconds: buffer.duration }, 32)
  }
  for (const type of ['keydown', 'keyup']) {
    globalThis.addEventListener(
      type,
      (event) => {
        if (!restores.length || !event.isTrusted || event.repeat || !eventKeys.has(event.code))
          return
        const gs = globalThis.__tpgs
        if (gs?.wNumScene !== 7) return
        append(
          inputs,
          {
            kind: type === 'keydown' ? 'down' : 'up',
            code: event.code,
            key: event.key,
            eventTimeStamp: event.timeStamp,
            mode: gs.mode,
            battlePhase: gs.battleState?.phase ?? null,
          },
          24,
        )
      },
      true,
    )
  }

  const routePoint = (gs, source) =>
    globalThis.__routeObserve(source, {
      scene: 's006',
      sceneVisit: 1,
      actors: { party: { position: [gs.party.x, gs.party.y], facing: gs.party.facing } },
      ...globalThis.__routeGameReadiness(gs),
    })
  let beforeInput, lastFrame, lastKey
  globalThis.__innGame = (gs, source) => {
    if (gs.wNumScene !== 7) return
    if (source === 'before:tickSceneInput') beforeInput = [gs.party.x, gs.party.y]
    if (source !== 'commit:tickSceneInput') return
    const to = [gs.party.x, gs.party.y]
    if (beforeInput && (beforeInput[0] !== to[0] || beforeInput[1] !== to[1]))
      append(moves, { source, from: beforeInput, to, facing: gs.party.facing }, 16)
    routePoint(gs, source)
  }
  globalThis.__beeGameRead = read
  globalThis.__beeGameLastFrame = () => lastFrame
  globalThis.__beeGameEvidence = () => ({
    seed: Number(seed),
    overflow,
    errors,
    moves,
    restores,
    native: {
      rng,
      slots,
      frames,
      commands,
      handoff,
      inputs,
      music,
      ambient,
      timeOrigin: performance.timeOrigin,
    },
  })
  globalThis.__beeGameRestored = (gs) => append(restores, read(gs), 1)
  globalThis.__beeGameSlot = (stage, gs, slot, entry, state) => {
    const {
      party: [member],
      loot,
    } = read(gs)
    append(
      slots,
      {
        stage,
        slot,
        entry,
        draws: rng.length,
        loot,
        hp: member.hp,
        mp: member.mp,
        messages: state.battleDialogQueue?.map(({ text }) => text) ?? [],
      },
      4,
    )
  }
  globalThis.__beeGameDraw = (gs, renderer, drained) => {
    if (gs.wNumScene !== 7) return
    const current = read(gs)
    const { settlement, ...action } = current.battle ?? {}
    // An unchanged hold does not create extra cues or movement observations.
    const key = JSON.stringify({
      renderer,
      ...current,
      npc: current.npc?.state,
      battle: { ...action, screen: settlement?.screen },
    })
    if (key !== lastKey) {
      lastFrame = append(frames, { renderer, draw, rngDraws: rng.length, ...current }, 256)
      lastKey = key
    }
    if (drained.length && current.battle)
      append(commands, { commands: drained.map(({ cmd }) => cmd) }, 128)
    routePoint(gs, 'render:canvas')
  }
}

const ready = (s) => s?.scene === 7 && s.ready
const read = (page) => page.evaluate(() => globalThis.__beeGameRead?.())
const wait = (page, until, accept, label) => until(() => read(page), accept, label)
const hpMp = ({ party: [member] }) => [member.hp, member.mp]
const startingHpMp = [party.hp, party.mp]
const recoveredHpMp = [475, 405]

async function dismissBoot(page) {
  const reject = page.getByRole('button', { name: '拒绝', exact: true })
  if (await reject.isVisible()) await reject.click()
  const enter = page.locator('#boot-loading-enter-btn')
  if (await enter.isVisible()) await enter.click()
  const start = page.getByText('点击屏幕开始 / Click to start', { exact: true })
  if (await start.isVisible()) await start.click()
}

async function buildFixture(setup, baseURL, until) {
  await setup.goto(`${baseURL}/?skip-intro=1&dev-scene=6`)
  const initial = await until(
    async () => {
      await dismissBoot(setup)
      return read(setup)
    },
    ready,
    'canonical Game map 4 exploration boot',
    60_000,
  )
  assert.equal(initial.field, 12)
  assert.deepEqual(initial.npc, {
    position: [912, 1176],
    state: 1,
    vanishTime: 0,
    label: 'L_41142',
    cursor: null,
  })
  const baseline = await setup.evaluate(async () => {
    const { serializeSave } = await import('/src/tools/save-io.ts')
    return serializeSave(globalThis.__tpgs)
  })
  const fixture = JSON.parse(baseline)
  const [x, y] = plan.steps[0].from
  // This is an offline V1 fixture. Native scene entities and script cursors come from boot.
  fixture.gs.party = { x, y, facing: 'right' }
  fixture.gs.camera = { x: x - 160, y: y - 112 }
  fixture.gs.trail = Array.from({ length: 5 }, (_, i) => ({
    x: x - 16 * i,
    y: y - 8 * i,
    dir: 'right',
  }))
  fixture.gs.partyMembers = [party.role]
  const roles = fixture.gs.PlayerRolesRuntime
  assert.equal(roles.rgwEquipment[3][party.role], 192)
  roles.rgwEquipment[3][party.role] = party.weapon
  roles.rgwHP[party.role] = party.hp
  roles.rgwMP[party.role] = party.mp
  return { fixture, canonicalSha256: sha256(baseline) }
}

async function restore(page, baseURL, seed, fixture, press, until) {
  await page.goto(`${baseURL}/?q2WorldSeed=${seed}`)
  await until(
    async () => {
      await dismissBoot(page)
      const video = await page.evaluate(() => document.querySelector('video')?.currentSrc)
      if (video) {
        await press('Enter', 'restore', 'close title prelude')
        await until(
          () => page.evaluate(() => document.querySelector('video')?.currentSrc),
          (v) => v !== video,
          'title prelude closed',
        )
      }
      return read(page)
    },
    (state) => state?.menu?.kind === 'opening',
    'opening menu',
    60_000,
  )
  const readback = await page.evaluate(async (text) => {
    const { Save } = await import('/src/core/save/api.ts')
    const { parseImportedSave, serializeSave } = await import('/src/tools/save-io.ts')
    if ((await Save.listSlots()).length !== 0) throw new Error('save slot already occupied')
    await Save.saveSlot(1, parseImportedSave(text))
    return serializeSave(await Save.loadSlot(1))
  }, JSON.stringify(fixture))
  assert.deepEqual(JSON.parse(readback), fixture)
  await press('ArrowDown', 'restore', 'select 旧的回忆')
  await wait(page, until, (s) => s.menu?.kind === 'opening' && s.menu.cursor === 1, 'load selected')
  await press('Enter', 'restore', 'open save slots')
  await wait(
    page,
    until,
    (s) => s.menu?.kind === 'save-slot' && s.menu.cursor === 0,
    'first slot selected',
  )
  await press('Enter', 'restore', 'load fixture in slot 1')
  const loaded = await wait(page, until, ready, 'title load restores Game s006')
  assert.deepEqual(loaded.grid, start)
  assert.deepEqual(hpMp(loaded), startingHpMp)
  assert.equal(loaded.party[0].weapon, party.weapon)
  assert.equal(loaded.loot, 0)
  return { loaded, slotReadback: sha256(`${readback}\n`) }
}

function verifyHandoff({ handoff, inputs, music, timeOrigin }, milestones, hasLoot) {
  const event = (stage) => {
    const found = handoff.find((row) => row.stage === stage)
    assert(found, `missing ${stage} observation`)
    return found
  }
  const contact = event('contact')
  const startBattle = event('battle-start')
  const initialWorld = event('contact-world')
  const entry = event('battle-entry')
  const command = event('battle-command-ready')
  const source = event('battle-source')
  const fadeOut = event('fade-out')
  const black = event('black')
  const fadeIn = event('world-fade-in')
  const worldReady = event('world-ready')
  const intro = handoff.filter(({ stage }) => stage === 'battle-intro')
  const drawEvents = handoff.filter(({ pixels }) => pixels)
  const drawOrder = drawEvents.map(({ draw }) => draw)
  assert.deepEqual(
    drawOrder,
    [...new Set(drawOrder)].sort((a, b) => a - b),
  )
  assert(
    drawEvents.every(
      ({ pixels }) => pixels.opaque === 320 * 200 && pixels.width === 320 && pixels.height === 200,
    ),
  )
  assert.deepEqual([contact.entityId, contact.entry, contact.grid], ['e154', 41142, stop])
  assert.deepEqual([startBattle.teamId, startBattle.battleFieldId], [4, 12])
  assert(
    contact.atMs < initialWorld.atMs &&
      initialWorld.atMs < startBattle.atMs &&
      startBattle.atMs < entry.atMs,
  )
  assert.deepEqual(
    [entry.completedRounds, entry.pixels.indexHash, entry.pixels.rgbaHash],
    [0, initialWorld.pixels.indexHash, initialWorld.pixels.rgbaHash],
  )
  assert.deepEqual(
    intro.map(({ completedRounds }) => completedRounds),
    [1, 2, 3, 4, 5, 6],
  )
  assert(intro[0].pixels.indexHash !== entry.pixels.indexHash)
  assert(intro.at(-1).atMs < command.atMs)
  assert.equal(command.draw, milestones.firstCommand.draw)

  assert.equal(handoff.filter(({ stage }) => stage === 'battle-source').length, 1)
  assert.deepEqual(source.dialog, hasLoot ? { text: prompt, style: 'narration' } : null)
  assert(source.draw === fadeOut.draw - 1 && source.renderer === 'battle')
  assert.equal(fadeOut.draw, milestones.firstHidden.draw)
  const frozen = drawEvents.filter(({ layer }) => layer === 'frozen')
  assert(
    frozen.length > 2 &&
      frozen.every(
        ({ frozenFromDraw, pixels }) =>
          frozenFromDraw === source.draw && pixels.sameIndicesAsBattleSource === true,
      ),
  )
  assert(fadeOut.pixels.rgbMean < source.pixels.rgbMean)
  assert.equal(fadeOut.paletteFade.durationMs, 600)
  assert.equal(fadeIn.paletteFade.durationMs, 600)
  assert(fadeOut.atMs < black.atMs && black.atMs < fadeIn.atMs && fadeIn.atMs < worldReady.atMs)
  assert.deepEqual(
    [black.pixels.maxChannel, black.pixels.nonBlack, fadeIn.pixels.nonBlack],
    [0, 0, 0],
  )
  assert.equal(fadeIn.layer, 'world')
  assert.equal(worldReady.paletteFade, null)
  assert.deepEqual([worldReady.ready, worldReady.layer, worldReady.grid], [true, 'world', stop])
  assert(worldReady.pixels.rgbMean > 0 && worldReady.draw < milestones.menu.draw)

  assert(Number.isFinite(timeOrigin) && timeOrigin > 0)
  assert.deepEqual(
    inputs.map(({ kind, code }) => [kind, code]),
    ['ArrowRight', 'Space', 'Space', 'Escape', 'Escape'].flatMap((code) => [
      ['down', code],
      ['up', code],
    ]),
  )
  assert(
    inputs.every(
      ({ atMs, eventTimeStamp }) => Number.isFinite(eventTimeStamp) && eventTimeStamp <= atMs,
    ),
  )
  const [approach, attack, confirm, openMenu, closeMenu] = inputs.filter(
    ({ kind }) => kind === 'down',
  )
  assert(
    approach.atMs < contact.atMs &&
      command.atMs < attack.atMs &&
      attack.atMs < milestones.attack.atMs,
  )
  assert(confirm.battlePhase === 'won' && confirm.atMs < source.atMs)
  assert(worldReady.atMs < openMenu.atMs && openMenu.atMs < milestones.menu.atMs)
  assert(milestones.menu.atMs < closeMenu.atMs && closeMenu.atMs < milestones.end.atMs)

  const battleMusic = music.find(({ stage, track }) => stage === 'play' && track === 37)
  const victoryMusicStop = music.find(({ stage, track }) => stage === 'stop' && track === 3)
  assert(
    battleMusic &&
      battleMusic.audioContextState === 'running' &&
      battleMusic.atMs > intro.at(-1).atMs,
  )
  assert(
    victoryMusicStop &&
      victoryMusicStop.atMs > source.atMs &&
      victoryMusicStop.atMs <= fadeOut.atMs,
  )
  assert.deepEqual([source.sceneMusic, fadeOut.sceneMusic, worldReady.sceneMusic], [0, 0, 0])
  return Object.fromEntries(
    [
      contact,
      startBattle,
      entry,
      intro[0],
      command,
      source,
      fadeOut,
      black,
      fadeIn,
      worldReady,
    ].map(({ stage, order }) => [stage, order]),
  )
}

function verifyTrace(trace, result) {
  const { seed, rolls, grants, returned } = result
  assert.equal(trace.seed, seed)
  assert.equal(trace.overflow, false)
  assert.deepEqual(trace.errors, [])
  assert.equal(trace.restores.length, 1)
  const [restored] = trace.restores
  assert.deepEqual(restored.grid, start)
  assert.deepEqual(hpMp(restored), startingHpMp)
  assert.equal(restored.party[0].id, party.role)
  assert.equal(restored.party[0].weapon, party.weapon)
  assert.equal(restored.npc.state, 1)
  assert.deepEqual(
    trace.moves.map(({ from, to, source }) => ({ from, to, source })),
    plan.steps.map(({ from, to, source }) => ({ from, to, source })),
  )

  const { rng, slots, frames, commands } = trace.native
  assert.deepEqual(
    rng.map(({ kind, args }) => [kind, args]),
    [
      ...Array.from({ length: 3 }, () => ['rangeFloat', [0.9, 1.1]]),
      ...Array.from({ length: 2 }, () => ['rangeInclusive', [0, 5]]),
      ['rangeInclusive', [2, 3]],
      ['rangeInclusive', [1, 100]],
      ['rangeInclusive', [1, 100]],
    ],
  )
  assert.deepEqual(
    rng.slice(6).map(({ value }) => value),
    rolls,
  )
  assert.equal(slots.length, 4, 'expected before and after evidence for both enemy slots')
  let count = 0
  for (const [slot, grant] of grants.entries()) {
    const [before, after] = slots.slice(slot * 2, slot * 2 + 2)
    assert.deepEqual(
      [before.stage, before.slot, before.entry, before.draws, before.loot, before.messages],
      ['before', slot, 41027, 6 + slot, count, []],
    )
    count += grant
    assert.deepEqual(
      [after.stage, after.slot, after.entry, after.draws, after.loot, after.messages],
      ['after', slot, 41027, 7 + slot, count, grant ? [prompt] : []],
    )
    assert.deepEqual([before.hp, before.mp, after.hp, after.mp], [...startingHpMp, ...startingHpMp])
  }
  const attack = frames.find((frame) => frame.battle?.pending.length)
  assert(attack, 'missing native attack commit')
  const [[player, command]] = attack.battle.pending
  assert.deepEqual(
    [
      attack.battle.pending.length,
      player,
      command.type,
      command.target,
      command.targetSide,
      attack.battle.auto,
    ],
    [1, 0, 'attack', -1, 'enemy', false],
  )
  const sweepPositions = [
    [232, 166],
    [220, 158],
  ]
  const sweeps = sweepPositions.map(([x, y]) =>
    frames.find((frame) => {
      const player = frame.battle?.players[0]
      return (
        frame.renderer === 'battle' &&
        player?.frame === 9 &&
        player.position?.x === x &&
        player.position.y === y
      )
    }),
  )
  assert(
    sweeps[0] && sweeps[1] && sweeps[0].order < sweeps[1].order,
    'missing native group strike frames',
  )
  const observed = commands.flatMap(({ commands: entries }) => entries)
  assert.equal(observed.filter((cmd) => cmd.op === 'playSound' && cmd.soundId === 4).length, 2)
  const damage = observed.filter((cmd) => cmd.op === 'showDamageNum')
  assert.deepEqual(
    damage.map(({ target, color }) => [target.kind, target.idx, color]),
    [1, 0, 1, 0].map((idx) => ['enemy', idx, 'blue']),
  )
  assert.deepEqual(
    damage.map(({ value }) => value),
    sweepDamage.get(seed),
  )
  const deaths = observed.filter((cmd) => cmd.op === 'playEnemyDeath')
  assert.deepEqual(
    deaths.map(({ enemyIdx }) => enemyIdx),
    [0, 1],
  )
  const rewardDraws = frames.filter(({ dialog }) => dialog?.text === prompt)
  assert.deepEqual(
    rewardDraws.map((frame) => [frame.renderer, frame.loot, frame.npc.state, ...hpMp(frame)]),
    Array.from({ length: count }, (_, i) => ['battle', i + 1, 1, ...startingHpMp]),
  )
  const grantsWithPrompts = slots.filter(({ messages }) => messages.length)
  assert(rewardDraws.every(({ order }, i) => order > grantsWithPrompts[i].order))
  const firstRecovery = frames.find((frame) => hpMp(frame).join() === recoveredHpMp.join())
  const firstHidden = frames.find(({ npc }) => npc?.state === -1)
  assert(firstRecovery && firstHidden, 'missing actual world recovery or enemy hide frame')
  assert(firstRecovery.order > slots.at(-1).order)
  assert(rewardDraws.every(({ order }) => order < firstRecovery.order))
  assert.deepEqual(
    [firstHidden.renderer, firstHidden.npc.vanishTime, firstHidden.event?.owner],
    ['world', 800, 154],
  )
  assert.equal(firstHidden.order, firstRecovery.order)
  assert.equal(returned.loot, count)
  const menu = frames.find(
    ({ menu, order }) => menu?.kind === 'in-game' && order > firstHidden.order,
  )
  assert(menu, 'world menu input was not accepted after victory')
  assert.deepEqual([result.end.grid, result.end.renderer, result.end.ready], [stop, 'world', true])
  assert(result.end.order > menu.order)
  const firstCommand = frames.find(
    ({ battle }) => battle?.phase === 'selectAction' && battle.ui === 'selectMove',
  )
  const handoff = verifyHandoff(
    trace.native,
    { firstCommand, attack, firstHidden, menu, end: result.end },
    count > 0,
  )
  return {
    handoff,
    attack: attack.order,
    sweeps: sweeps.map(({ order }) => order),
    rewardDraws: rewardDraws.map(({ order }) => order),
    recovery: firstRecovery.order,
    hidden: firstHidden.order,
  }
}

await runBrowserJourney({
  name: `q2-world-bee-game${captureRequested ? `-${selected[0].seed}-capture` : ''}`,
  packageName: '@type-pal/game',
  environment: { E2E: '1' },
  traceConfig: 'scripts/e2e/battle-world-bee-game.config.mts',
  sources: [
    'data/extracted/data/scene/6.json',
    'data/extracted/data/tilemap/4.json',
    'data/extracted/data/items.json',
    'data/extracted/data/player-roles.json',
    'data/extracted/data/enemies.json',
    'data/extracted/data/enemy-objects.json',
    'data/extracted/data/enemy-teams.json',
    'data/extracted/data/battle-fields.json',
    'data/extracted/data/battle-bgs.json',
    'data/extracted/events/all.json',
    'data/extracted/sounds/66.wav',
    'data/extracted/sounds/73.wav',
    'data/extracted/music/003.mid',
    'data/extracted/music/037.mid',
  ],
  arguments: ['--headless', ...(captureRequested ? ['--capture'] : [])],
  viewport: { width: 960, height: 720 },
  initScripts: [
    installCommittedRoutePlayback,
    `(${installBeeObserver})(${createSeedableRng}, ${createEvidenceRecorder})`,
  ],
  async journey({ newPage, baseURL, out, report, until, health, capture }) {
    Object.assign(report, { engine: 'game', fragment: 'q2-world-bee', input, cases: [] })
    const setup = await newPage('canonical-scene-baseline')
    let fixture
    try {
      const built = await buildFixture(setup, baseURL, until)
      fixture = built.fixture
      report.save = {
        ...(await writeEvidenceArtifact(out, 'game-input.json', fixture)),
        canonicalSha256: built.canonicalSha256,
      }
      report.predecessor = { kind: 'canonical-world-save-fixture', ...report.save }
    } finally {
      await setup.close()
    }
    for (const spec of selected) {
      for (const repetition of capture.enabled ? [1] : [1, 2]) {
        const { seed } = spec
        const label = `seed-${seed}-run-${repetition}`
        const result = { ...spec, label, repetition, actionRange: { start: report.actions.length } }
        report.cases.push(result)
        const page = await newPage(label)
        const record = (action) => report.actions.push(action)
        const press = (key, phase, reason) =>
          pressRecordedKey({
            keyboard: page.keyboard,
            action: canonicalInput({ context: label, phase, key, reason }),
            record,
          })
        const walk = (route, phase) =>
          replayCommittedRoute({
            page,
            route,
            health,
            onInput: (event) => record(canonicalInput({ ...event, context: label, phase })),
          })
        let trace
        try {
          const { loaded, slotReadback } = await restore(page, baseURL, seed, fixture, press, until)
          assert.equal(slotReadback, report.save.sha256)
          result.initial = loaded
          result.slotReadback = slotReadback
          await capture.arm(page, {
            event: 'before-world-movement',
            seed,
            scene,
            grid: loaded.grid,
          })
          await walk(plan, 'world-approach')
          const encounter = await wait(
            page,
            until,
            (s) => s?.battle?.phase === 'selectAction' && s.battle.ui === 'selectMove',
            'native Game bee battle command',
          )
          assert.deepEqual(
            [
              encounter.starts,
              encounter.team,
              encounter.field,
              encounter.resume.owner,
              encounter.resume.entry,
            ],
            [1, 4, 12, 154, 41143],
          )
          assert.deepEqual(encounter.grid, stop)
          assert.deepEqual(
            encounter.battle.enemies.map(({ id, hp }) => [id, hp]),
            [
              [403, 32],
              [403, 32],
            ],
          )
          assert.equal(encounter.battle.selection, 0)
          result.encounter = encounter
          result.role = await page.evaluate(async () => {
            const { getBattleResources } = await import(
              '/src/core/battle/battle-runtime-context.ts'
            )
            const {
              attackStrength,
              defense,
              magicStrength,
              dexterity,
              fleeRate,
              attackAll,
              spriteNumInBattle,
              attackSound,
              weaponSound,
              equipment,
            } = getBattleResources(globalThis.__tpgs).playerRoles.roles[4]
            return {
              attackStrength,
              defense,
              magicStrength,
              dexterity,
              fleeRate,
              attackAll,
              spriteNumInBattle,
              attackSound,
              weaponSound,
              equipment,
            }
          })
          assert.equal(result.role.attackAll, 1)
          await press('Space', 'battle', 'confirm normal group attack')
          const victory = await wait(
            page,
            until,
            (s) =>
              s?.battle?.settlement?.screen?.kind === 'exp-cash' &&
              s.battle.settlement.shownMs > 40,
            'actual deaths and victory settlement',
          )
          assert.deepEqual(
            victory.battle.enemies.map(({ hp, defeated }) => [hp, defeated]),
            [
              [0, true],
              [0, true],
            ],
          )
          assert.deepEqual(victory.battle.settlement.screen, {
            kind: 'exp-cash',
            expGained: 4,
            cashGained: 4,
            isBoss: false,
          })
          assert.deepEqual(hpMp(victory), startingHpMp)
          result.victory = victory
          if (capture.enabled)
            await capture.readable(
              '获得经验值 4，打败敌人得 4 文钱',
              true,
              async () => (await read(page)).battle?.settlement?.screen?.kind === 'exp-cash',
            )
          await press('Space', 'settlement', 'confirm earned experience and cash screen')
          const returned = await wait(
            page,
            until,
            (s) => ready(s) && s.npc?.state === -1,
            'same world ready with hidden bee',
          )
          assert.deepEqual(returned.grid, stop)
          assert.deepEqual(hpMp(returned), recoveredHpMp)
          assert.equal(returned.cash - loaded.cash, 4)
          assert.equal(returned.battle, null)
          result.returned = returned
          await press(returnInput[0], 'world-control', 'open world menu after victory')
          result.control = await wait(
            page,
            until,
            (state) => state?.menu?.kind === 'in-game',
            'world menu accepts input after victory',
          )
          await press(returnInput[1], 'world-control', 'close world menu')
          result.end = await until(
            () => page.evaluate(() => globalThis.__beeGameLastFrame()),
            (frame) => ready(frame) && frame.grid[0] === stop[0] && frame.grid[1] === stop[1],
            'rendered world after closing menu',
          )
          await until(
            () =>
              page.evaluate(() => {
                const { ambient, handoff } = globalThis.__beeGameEvidence().native
                const resumed = handoff.find(({ stage }) => stage === 'world-ready')
                return resumed && ambient.some(({ atMs }) => atMs >= resumed.atMs)
              }),
            Boolean,
            'actual ten-mile ambience resumes after the world menu closes',
            2_000,
          )
          trace = await page.evaluate(() => globalThis.__beeGameEvidence())
          result.raw = await writeEvidenceArtifact(out, `${label}-trace.json`, trace)
          result.milestones = verifyTrace(trace, result)
          if (capture.enabled)
            await capture.readable('探索画面', true, async () => ready(await read(page)))
          await capture.finish(page, {
            event: 'after-world-menu-round-trip',
            seed,
            scene,
            grid: result.end.grid,
          })
        } finally {
          result.actionRange.end = report.actions.length
          try {
            if (!trace) {
              const partial = await page.evaluate(() => globalThis.__beeGameEvidence?.())
              if (partial)
                result.raw = await writeEvidenceArtifact(out, `${label}-trace.json`, partial)
            }
          } finally {
            if (!capture.enabled) await page.close()
          }
        }
      }
    }
  },
})
