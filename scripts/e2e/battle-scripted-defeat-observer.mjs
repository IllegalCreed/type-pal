import { createSeedableRng } from '../../packages/game/src/core/rng.ts'
import { createEvidenceRecorder } from './evidence-recorder.mjs'

export function scriptedDefeatObserver(input) {
  return `(${install})(${JSON.stringify(input)}, ${createSeedableRng}, ${createEvidenceRecorder})`
}

function install({ engine, scene, gameScene, owner, seed }, makeRng, createRecorder) {
  const events = [],
    errors = []
  let overflow = false,
    contact,
    started,
    ended,
    pendingAction,
    previousMove,
    previousFrame,
    entryStarted = false,
    entryPendingBand,
    entryLastBand,
    entryWorldPixels,
    worldGeometry,
    nextCue = 0
  const { append } = createRecorder({
    context: () => ({ atMs: performance.now() }),
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  const event = (kind, details) => append(events, { kind, ...details }, 4096)
  const seen = new Set()
  const once = (kind, details) => {
    if (seen.has(kind)) return
    seen.add(kind)
    event(kind, details)
  }
  // Hash six logical-pixel lanes after a real draw. Game retains indexed framebuffer colors,
  // while Reforge renders directly in RGBA.
  const laneDigests = (image, scale) => {
    const hashes = Array(6).fill(2166136261)
    let pixel = 0
    for (let y = 0; y < image.height; y += scale) {
      for (let x = 0; x < image.width; x += scale) {
        const offset = (y * image.width + x) * 4
        const color =
          image.data[offset] | (image.data[offset + 1] << 8) | (image.data[offset + 2] << 16)
        const lane = pixel++ % 6
        hashes[lane] = Math.imul(hashes[lane] ^ color, 16777619) >>> 0
      }
    }
    return hashes
  }
  const canvasDigests = (ctx, scale) =>
    laneDigests(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height), scale)
  const indexDigests = (indices) => {
    const hashes = Array(6).fill(2166136261)
    for (const [pixel, color] of indices.entries()) {
      const lane = pixel % 6
      hashes[lane] = Math.imul(hashes[lane] ^ color, 16777619) >>> 0
    }
    return hashes
  }
  const observeBand = (band, pixels) => {
    if (!entryStarted || band === entryLastBand) return
    entryLastBand = band
    event('entry-band', { band, pixels })
  }
  const roleName = (id) => ({ 0: 'li-xiaoyao', 2: 'lin-yueru' })[id] ?? String(id)
  const reforgePartySprites = new WeakMap()
  const grid = ({ x, y }) => [(x / 16 + y / 8) / 2, (y / 8 - x / 16) / 2, 0]
  const rfPos = ({ col, row, height }) => [col, row, height]
  const gameBox = (box) =>
    box
      ? {
          phase: box.phase,
          speaker: box.titleText ?? null,
          at: box.lineStartMs ?? 0,
          text: [...box.shownLines, box.currentLineText?.slice(0, box.charsRevealed)]
            .filter(Boolean)
            .join('\n'),
        }
      : null
  const rfBox = (slot) =>
    slot
      ? {
          id: slot.presentationId,
          page: slot.pageIndex,
          at: slot.pageStartedAtMs,
          phase: slot.phase,
          speaker: slot.speaker,
          ids: slot.pageTextIds,
          text: slot.visibleText,
        }
      : null
  const gameParty = (gs) =>
    gs.partyMembers.map((id) => ({
      id: roleName(id),
      hp: gs.PlayerRolesRuntime.rgwHP[id],
      mp: gs.PlayerRolesRuntime.rgwMP[id],
      maxHP: gs.PlayerRolesRuntime.rgwMaxHP[id],
      maxMP: gs.PlayerRolesRuntime.rgwMaxMP[id],
      level: gs.PlayerRolesRuntime.rgwLevel[id],
      exp: gs.Exp.rgPrimaryExp[id].wExp,
      weapon: String(gs.PlayerRolesRuntime.rgwEquipment[3][id]),
    }))
  const liveGameParty = (state, roles) =>
    state.players.map(({ roleId, defending, currentFrame, pos }) => {
      const { hp, mp } = roles.roles[roleId]
      return { id: roleName(roleId), hp, mp, defending, frame: currentFrame, pos }
    })
  const rfParty = (party) =>
    party.map(({ template, hp, mp, maxHP, maxMP, level, exp, equipment }) => ({
      id: template,
      hp,
      mp,
      maxHP,
      maxMP,
      level,
      exp,
      weapon: equipment.weapon,
    }))
  const ordered = (inventory) =>
    inventory
      .filter(({ count }) => count > 0)
      .map(({ itemId, count }) => ({ itemId: String(itemId), count }))
      .sort((left, right) => Number(left.itemId) - Number(right.itemId))
  const gameWorld = (gs) => ({
    scene: `s${String(gs.wNumScene - 1).padStart(3, '0')}`,
    position: grid(gs.party),
    facing: gs.party.facing,
    cash: gs.dwCash,
    inventory: ordered(gs.inventory),
    party: gameParty(gs),
    actors: gs.npcs
      .filter(({ id }) => id === Number(owner.slice(1)) || id === Number(owner.slice(1)) - 1)
      .map((npc) => ({ id: `e${npc.id}`, state: npc.sState, position: grid(npc) })),
    music: gs.wNumMusic,
    mode: gs.mode,
    menu: gs.menuStack.at(-1)
      ? { kind: gs.menuStack.at(-1).kind, cursor: gs.menuStack.at(-1).state?.selection?.cursor }
      : null,
    menuActive: gs.menuStack.length > 0,
    ready: globalThis.__routeGameReadiness(gs).routeReady,
    box: gameBox(gs.dialogBox),
    battle: gs.battleState
      ? {
          phase: gs.battleState.phase,
          turn: gs.battleState.turn + 1,
          menu: gs.battleState.uiState === 'selectMove' && gs.battleState.menuState === 'main',
          slots: gs.battleState.enemies.map(({ objectId, e }) =>
            objectId > 0 ? { id: `enemy-${objectId}`, hp: e.health } : null,
          ),
        }
      : null,
    gameOver: !!gs.gameOverActive || !!gs.deathHoldActive,
  })
  const reforgeWorld = () => {
    const runtime = globalThis.__tpObserve?.readRuntime()
    const world = globalThis.__rfWorld
    if (!runtime || !world) return null
    const battle = globalThis.__rfBattle
    const phase = battle?.debugReadiness().phase
    return {
      scene: runtime.sceneId,
      position: rfPos(runtime.position),
      facing: runtime.facing,
      cash: world.money,
      inventory: ordered(world.inventory),
      party: rfParty(world.party),
      actors: globalThis.__rfScene.entities
        .filter(({ id }) => id === owner || Number(id.slice(1)) === Number(owner.slice(1)) - 1)
        .map(({ id, pos }) => ({
          id,
          state: world.script.entityState?.[runtime.sceneId]?.[id] ?? null,
          position: rfPos(pos),
        })),
      music: Number(world.audio?.currentMusic?.split('.').at(-1) ?? 0),
      mode: runtime.battleActive ? 'battle' : runtime.scriptRunning ? 'event' : 'explore',
      menuActive: runtime.menuActive,
      ready:
        !runtime.battleActive &&
        !runtime.scriptRunning &&
        !runtime.dialogue &&
        !runtime.presentationBusy &&
        !runtime.menuActive &&
        runtime.fadeBlack === 0,
      box: rfBox(runtime.dialogueSlots.find(({ active }) => active)),
      battle: phase
        ? {
            phase,
            menu: phase === 'menu' && seen.has('command-menu-drawn'),
            slots: battle.enemySlotDefs().map(({ id }) => ({ id })),
          }
        : null,
      checkpoint: globalThis.__tpObserve.readBoot().checkpointLoad,
    }
  }
  const pushRoute = (source, state) => {
    if (state.scene !== scene) return
    globalThis.__routeObserve(source, {
      scene,
      sceneVisit: 1,
      routeReady: state.ready,
      routeDialogue: state.box !== null,
      actors: {
        party: {
          position:
            engine === 'game'
              ? [
                  16 * (state.position[0] - state.position[1]),
                  8 * (state.position[0] + state.position[1]),
                ]
              : state.position,
          facing: state.facing,
        },
      },
    })
  }
  const draw = (state, inBattle) => {
    const geometry = inBattle ? undefined : worldGeometry
    worldGeometry = undefined
    if (state.scene !== scene) return
    if (state.gameOver) once('ordinary-game-over-drawn', {})
    pushRoute('render:world-or-battle', state)
    if (!contact) return
    const { ready, box, position, actors, party } = state
    const key = JSON.stringify({ inBattle, ready, box, position, actors, party, geometry })
    if (key !== previousFrame) {
      previousFrame = key
      event('paint', {
        surface: inBattle ? 'battle' : 'world',
        ready,
        box,
        position,
        actors,
        party,
        geometry,
      })
    }
    if (ended && ready)
      once('world-control', {
        position,
        party,
        cash: state.cash,
        inventory: state.inventory,
        music: state.music,
      })
    if (ended && state.menuActive) once('restored-world-menu', { scene, position })
    if (ended && ready && seen.has('restored-world-menu'))
      once('restored-world-menu-closed', { scene, position })
  }
  const menuClosed = () => seen.has('restored-world-menu-closed')
  const rng = makeRng(seed)
  globalThis.__defeat = {
    seed,
    event,
    eventOnce: once,
    rng: () => {
      const value = rng.next()
      event('rng', { value })
      return value
    },
    read: () => {
      const state =
        engine === 'game' ? globalThis.__tpgs && gameWorld(globalThis.__tpgs) : reforgeWorld()
      return { state, ended: !!ended, menuClosed: menuClosed() }
    },
    trace: () => ({ engine, seed, timeOrigin: performance.timeOrigin, overflow, errors, events }),
    beginWorldDraw(camera, walking, trail) {
      if (!contact || !ended) return
      worldGeometry = {
        camera: [camera.x, camera.y],
        walking,
        trail: trail.map((entry) => ({
          position: entry.pos ? rfPos(entry.pos) : grid(entry),
          facing: entry.dir,
        })),
        party: [],
      }
    },
    gamePartyDraw(roleId, slot, spriteId, frame, position, x, y, image) {
      worldGeometry?.party.push({
        id: roleName(roleId),
        slot,
        spriteId,
        frame,
        world: [position.x, position.y],
        foot: [x, y],
        blit: [x - Math.floor(image.width / 2), y - image.height, image.width, image.height],
      })
    },
    tagReforgePartyDraw(sprite, id, slot, spriteId, frame) {
      if (contact && ended) reforgePartySprites.set(sprite, { id, slot, spriteId, frame })
    },
    reforgeCamera(camera) {
      if (worldGeometry) worldGeometry.camera = [camera.x, camera.y]
    },
    reforgePartyDraw(sprite, x, y, width, height) {
      const descriptor = reforgePartySprites.get(sprite)
      if (!descriptor) return
      worldGeometry?.party.push({
        ...descriptor,
        world: [sprite.worldX, sprite.worldY],
        foot: [x + sprite.anchorX, y + sprite.anchorY],
        blit: [x, y, width, height],
      })
    },
    gameContact(gs, npc) {
      if (gs.wNumScene !== gameScene || `e${npc.id}` !== owner) return
      contact = event('trigger', { scene, owner, ip: gs.eventCursor?.ip, position: grid(gs.party) })
    },
    reforgeContact(sceneId, id, position) {
      if (sceneId !== scene || id !== owner) return
      contact = event('trigger', { scene: sceneId, owner: id, position: rfPos(position) })
    },
    gameDraw(gs, renderedBattle, indices) {
      if (gs.wNumScene !== gameScene) return
      const state = gameWorld(gs)
      draw(state, renderedBattle)
      if (!contact || ended) return
      const band = entryPendingBand
      entryPendingBand = undefined
      if (!renderedBattle && !entryStarted) entryWorldPixels = indexDigests(indices)
      if (renderedBattle && band !== undefined && band !== entryLastBand)
        observeBand(band, indexDigests(indices))
      if (renderedBattle && entryLastBand === 6 && !gs.battleState.introFade)
        once('entry-complete', { pixels: indexDigests(indices), size: indices.length })
    },
    readingEntryBand(band) {
      if (!ended) entryPendingBand = band
    },
    reforgeEntrySource(ctx) {
      if (!contact || ended) return
      entryStarted = true
      const scale = Math.round(ctx.canvas.width / 320)
      const pixels = canvasDigests(ctx, scale)
      once('entry-source', { pixels })
    },
    reforgeEntry(frame, band, complete, scale) {
      if (!entryStarted || (band === entryLastBand && (!complete || seen.has('entry-complete'))))
        return
      const pixels = laneDigests(frame, scale)
      observeBand(band, pixels)
      if (complete)
        once('entry-complete', { pixels, size: (frame.width * frame.height) / scale ** 2 })
    },
    reforgeDraw(renderedBattle) {
      const state = reforgeWorld()
      if (!state) return
      draw(state, renderedBattle)
    },
    gameOpcode(gs, cursor, command) {
      if (
        !contact ||
        gs.wNumScene !== gameScene ||
        cursor.triggerOwnerId !== Number(owner.slice(1))
      )
        return
      if (command.opcode === 7 || command.op === 'startBattle') {
        entryStarted = true
        once('entry-source', { pixels: entryWorldPixels })
      }
      // Some frames retry the same waiting instruction. The raw pointer and command
      // remain visible without inventing repeated logical writes for that wait.
      event('script-op', {
        ip: cursor.ip,
        op: command.op,
        opcode: command.opcode,
        operands: command.operands,
        ...(command.op === 'showDialog'
          ? { message: command.messageIndex, text: command.text }
          : {}),
      })
    },
    reforgeOpcode(self, path, command) {
      if (!contact || self?.scene !== scene || self.entity !== owner) return
      const op = command.kind === 'leaf' ? command.command : command
      event('script-op', {
        path,
        op: op.kind,
        ...(op.kind === 'dialog' ? { rows: op.cue.rows, speaker: op.cue.speaker } : {}),
        ...(op.kind === 'playSound' ? { asset: op.asset } : {}),
        ...(op.kind === 'setParty' ? { members: op.members } : {}),
      })
    },
    reforgeArm(self, path, arm) {
      if (self?.scene === scene && self.entity === owner) event('script-result', { path, arm })
    },
    reforgeMove(sceneId, from, to, facing) {
      if (sceneId !== scene) return
      const state = reforgeWorld()
      event('move', { from: rfPos(from), to: rfPos(to), facing })
      pushRoute('commit:player.input', state)
    },
    command(slot, turn, action) {
      event('command', { slot, turn, action })
    },
    reforgeAction(action, state) {
      event('action', {
        turn: state.turn,
        action,
        party: state.players.map(({ roleId, hp, mp }) => ({ id: roleId, hp, mp })),
        slots: state.enemies.map((enemy) => (enemy ? { id: enemy.def.id, hp: enemy.hp } : null)),
      })
    },
    terminalFrameReady(phase, completed) {
      if (phase === 'lost') once('terminal-hold-eligible', { phase, completed })
    },
    reforgeFinish(session, result, world) {
      ended = event('battle-finished', {
        result,
        slots: session.enemySlotDefs().map(({ id }) => id),
        party: rfParty(world.party),
        cash: world.money,
        inventory: ordered(world.inventory),
      })
    },
    gameOver: () => once('ordinary-game-over-drawn', {}),
    loadLastSave: () => event('load-last-save', {}),
    music: (track, context) =>
      event('music-start', { track: Number(String(track).split('.').at(-1)), context }),
    musicStop: (track, context) =>
      event('music-stop', { track: Number(String(track).split('.').at(-1)), context }),
  }
  globalThis.__innGame = (gs, source) => {
    if (gs.wNumScene !== gameScene) return
    if (source === 'before:tickSceneInput') previousMove = grid(gs.party)
    if (source !== 'commit:tickSceneInput') return
    const to = grid(gs.party)
    if (previousMove?.some((n, i) => n !== to[i]))
      event('move', { from: previousMove, to, facing: gs.party.facing })
    pushRoute(source, gameWorld(gs))
  }
  globalThis.__defeatGameRestored = (gs) => event('restore', { scene: gs.wNumScene })
  globalThis.__battleGameStarted = (gs, roles) => {
    if (gs.wNumScene !== gameScene || !contact) return
    const battle = gs.battleState
    started = event('prepared', {
      field: gs.wNumBattleField,
      boss: battle.isBoss,
      auto: battle.fAutoAttack || battle.fAutoBattle,
      music: gs.wNumBattleMusic,
      players: liveGameParty(battle, roles),
      slots: gameWorld(gs).battle.slots,
      resume: { lost: gs.postBattleResume?.lostIp, won: gs.postBattleResume?.wonIp },
    })
  }
  globalThis.__battleGameCommand = (state, slot) => {
    if (started) globalThis.__defeat.command(slot, state.turn + 1, state.pendingActions.get(slot))
  }
  globalThis.__battleGameActionStart = (state, gs, actor, action, roles) => {
    if (started && gs.wNumScene === gameScene)
      pendingAction = { turn: state.turn + 1, actor, action, before: liveGameParty(state, roles) }
  }
  globalThis.__battleGameActionComplete = (state, gs, roles) => {
    if (!pendingAction || gs.wNumScene !== gameScene) return
    event('action', {
      ...pendingAction,
      party: liveGameParty(state, roles),
      slots: gameWorld(gs).battle.slots,
    })
    pendingAction = undefined
  }
  globalThis.__battleGameTick = (gs, state) => {
    if (started && gs.wNumScene === gameScene && state?.phase === 'lost')
      once('terminal-hold-eligible', { phase: state.phase })
  }
  globalThis.__battleGameTerminal = (gs, outcome) => {
    if (!started || gs.wNumScene !== gameScene) return
    const { party, inventory, cash, gameOver } = gameWorld(gs)
    ended = event('battle-finished', {
      result: outcome,
      party,
      inventory,
      cash,
      gameOver,
      continuation: gs.eventCursor?.ip,
    })
  }
  globalThis.__battleGameSettlement = () => once('settlement', {})
  globalThis.__battleGameRandom = (_seed, _state, value) => {
    if (started && !ended) event('rng', { value })
  }
  const audioRequest = (asset) => {
    if (!contact) return undefined
    const cue = ++nextCue
    event('sfx-request', { asset: Number(String(asset).split('.').at(-1)), cue })
    return cue
  }
  const audioStart = (cue, asset, buffer, context) => {
    if (cue === undefined) return
    event('sfx-start', {
      asset: Number(String(asset).split('.').at(-1)),
      cue,
      context: context.state,
      frames: buffer.length,
    })
  }
  globalThis.__battleGameAudioRequested = audioRequest
  globalThis.__battleGameAudioStarted = audioStart
  globalThis.__battleEvidence = {
    audioRequested: audioRequest,
    audioStarted: audioStart,
    audioDecoded() {},
    markRandom() {},
  }
}
