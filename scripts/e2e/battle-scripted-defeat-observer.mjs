import { createSeedableRng } from '../../packages/game/src/core/rng.ts'
import { createEvidenceRecorder } from './evidence-recorder.mjs'

export function scriptedDefeatObserver(input) {
  return `(${install})(${JSON.stringify(input)}, ${createSeedableRng}, ${createEvidenceRecorder})`
}

function install(
  {
    engine,
    scene,
    gameScene,
    contactScene = scene,
    owner,
    seed,
    foreground,
    entrance,
    handoffScene,
    visitScenes,
    routeScenes,
    contactActors = [],
    routeContacts = [],
    itemEntrance = false,
  },
  makeRng,
  createRecorder,
) {
  const entranceGameScene = entrance ? Number(entrance.scene.slice(1)) + 1 : null
  const sceneId = (number) => `s${String(number - 1).padStart(3, '0')}`
  const isMainRouteScene = (id) => id === scene || id === contactScene
  const observedScene = (id) =>
    isMainRouteScene(id) || id === handoffScene || visitScenes?.includes(id)
  const routeScene = (id) =>
    isMainRouteScene(id) || id === entrance?.scene || routeScenes?.includes(id)
  const movementKind = (id) =>
    isMainRouteScene(id) ? 'move' : id === entrance?.scene ? 'entrance-move' : 'route-move'
  const sceneCursors = new WeakSet()
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
    lastWorldGeometry,
    nextCue = 0
  const { append, resources } = createRecorder({
    context: () => ({ atMs: performance.now() }),
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  // This stream mixes sparse battle events with one receipt per submitted world frame.
  // The recorder bounds both groups by bytes, including during long foreground visits.
  const event = (kind, details) => append(events, { kind, ...details }, Number.MAX_SAFE_INTEGER)
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
  const roleName = (id) =>
    ({ 0: 'li-xiaoyao', 1: 'zhao-linger', 2: 'lin-yueru', 4: 'anu', 5: 'gai-luojiao' })[id] ??
    String(id)
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
    if (!routeScene(state.scene)) return
    globalThis.__routeObserve(source, {
      scene: state.scene,
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
    if (foreground) lastWorldGeometry = geometry
    pushRoute('render:world-or-battle', state)
    if (state.scene !== scene && !(visitScenes && observedScene(state.scene))) return
    if (state.gameOver) once('ordinary-game-over-drawn', {})
    if (!contact) return
    const { ready, box, position, actors, party } = state
    const key = JSON.stringify({
      scene: state.scene,
      inBattle,
      ready,
      box,
      position,
      actors,
      party,
      geometry,
    })
    if (key !== previousFrame) {
      previousFrame = key
      event('paint', {
        ...(visitScenes && { scene: state.scene }),
        surface: inBattle ? 'battle' : 'world',
        ready,
        box,
        position,
        actors,
        party,
        geometry,
      })
    }
    if (ended && ready && state.scene === scene)
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
      return {
        state,
        overflow,
        ended: !!ended,
        ...(ended && { outcome: ended.result }),
        menuClosed: menuClosed(),
      }
    },
    worldDraw: () => lastWorldGeometry,
    trace: () => ({
      engine,
      seed,
      timeOrigin: performance.timeOrigin,
      overflow,
      errors,
      events,
      ...(foreground ? { resources: resources() } : {}),
    }),
    beginWorldDraw(camera, walking, trail) {
      if (!foreground && (!contact || !ended)) return
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
      if (foreground || (contact && ended))
        reforgePartySprites.set(sprite, { id, slot, spriteId, frame })
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
      const id = `e${npc.id}`
      if (gs.wNumScene === entranceGameScene && id === entrance.owner) {
        once('entrance-trigger', {
          scene: entrance.scene,
          owner: entrance.owner,
          ip: gs.eventCursor?.ip,
          position: grid(gs.party),
        })
      }
      const routeScene = sceneId(gs.wNumScene)
      if (routeContacts.some(({ scene, owner }) => scene === routeScene && owner === id))
        event('scene-route-trigger', {
          scene: routeScene,
          owner: id,
          ip: gs.eventCursor?.ip,
          position: grid(gs.party),
        })
      if (routeScene !== contactScene || (id !== owner && !contactActors.includes(id))) return
      contact = event('trigger', {
        scene: routeScene,
        owner: id,
        ip: gs.eventCursor?.ip,
        position: grid(gs.party),
      })
    },
    reforgeContact(sceneId, id, position) {
      if (sceneId === entrance?.scene && id === entrance.owner)
        once('entrance-trigger', { scene: sceneId, owner: id, position: rfPos(position) })
      if (routeContacts.some(({ scene, owner }) => scene === sceneId && owner === id))
        event('scene-route-trigger', { scene: sceneId, owner: id, position: rfPos(position) })
      if (sceneId !== contactScene || (id !== owner && !contactActors.includes(id))) return
      contact = event('trigger', { scene: sceneId, owner: id, position: rfPos(position) })
    },
    gameItemContact(gs, id, ip, target) {
      if (!itemEntrance || sceneId(gs.wNumScene) !== contactScene) return
      contact = event('item-trigger', {
        scene: contactScene,
        position: grid(gs.party),
        itemId: String(id),
        ip,
        target,
      })
    },
    reforgeItemContact(request) {
      const state = reforgeWorld()
      if (!itemEntrance || state?.scene !== contactScene) return
      contact = event('item-trigger', {
        scene: state.scene,
        position: state.position,
        itemId: request.itemId,
        target: request.targetCharId ?? null,
        origin: request.origin,
      })
    },
    gameDraw(gs, renderedBattle, indices) {
      if (!observedScene(sceneId(gs.wNumScene)) && gs.wNumScene !== entranceGameScene) return
      const state = gameWorld(gs)
      draw(state, renderedBattle)
      if (!contact || ended) return
      const band = entryPendingBand
      entryPendingBand = undefined
      if (!renderedBattle && !entryStarted && gs.wNumScene === gameScene)
        entryWorldPixels = indexDigests(indices)
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
      if (!contact) return
      const current = sceneId(gs.wNumScene)
      const ownerScript =
        current === contactScene &&
        (cursor.triggerOwnerId === Number(owner.slice(1)) || (itemEntrance && cursor.itemScript))
      const entryScript =
        visitScenes && observedScene(current) && cursor.onEnterSceneId === gs.wNumScene
      if (!ownerScript && !entryScript) return
      if (entryScript && cursor.ip === cursor.onEnterStartIp && !sceneCursors.has(cursor)) {
        sceneCursors.add(cursor)
        event('scene-hook', { scene: current, start: cursor.onEnterStartIp })
      }
      if (command.opcode === 7 || command.op === 'startBattle') {
        entryStarted = true
        once('entry-source', { pixels: entryWorldPixels })
      }
      const target = command.op === 'loadScene' ? sceneId(command.sceneId) : undefined
      if (visitScenes && ended && target === handoffScene) {
        const { party, cash, inventory } = gameWorld(gs)
        once('post-battle-party', { party, cash, inventory })
      }
      // Some frames retry the same waiting instruction. The raw pointer and command
      // remain visible without inventing repeated logical writes for that wait.
      event('script-op', {
        ...(visitScenes && {
          scene: current,
          target,
        }),
        ip: cursor.ip,
        op: command.op,
        opcode: command.opcode,
        operands: command.operands,
        ...(command.op === 'showDialog'
          ? { message: command.messageIndex, text: command.text }
          : {}),
      })
    },
    reforgeSceneHook(scene, slot, resolved) {
      if (!visitScenes || !contact || !observedScene(scene) || slot !== 'onEnter') return
      event('scene-hook', { scene, variant: resolved.hookId, stage: resolved.cursor.stage })
    },
    reforgeOpcode(self, path, command, timing) {
      if (!contact) return
      const current = globalThis.__rfScene?.id
      const ownerScript = self?.scene === contactScene && self.entity === owner
      const entryScript = visitScenes && !self && timing === 'interactive' && observedScene(current)
      if (!ownerScript && !entryScript) return
      const op = command.kind === 'leaf' ? command.command : command
      if (visitScenes && ended && op.kind === 'loadScene' && op.scene === handoffScene) {
        const { party, cash, inventory } = reforgeWorld()
        once('post-battle-party', { party, cash, inventory })
      }
      event('script-op', {
        ...(visitScenes && {
          scene: current,
          ...(op.kind === 'loadScene' && { target: op.scene }),
          ...(op.kind === 'selectSceneHooks' && { selection: op.selection }),
        }),
        path,
        op: op.kind,
        ...(op.kind === 'dialog' ? { rows: op.cue.rows, speaker: op.cue.speaker } : {}),
        ...(op.kind === 'playSound' ? { asset: op.asset } : {}),
        ...(op.kind === 'setParty' ? { members: op.members } : {}),
      })
    },
    reforgeArm(self, path, arm) {
      const ownerScript = self?.scene === contactScene && self.entity === owner
      const arrivalScript = contactScene !== scene && !self && globalThis.__rfScene?.id === scene
      if (ownerScript || arrivalScript) event('script-result', { path, arm })
    },
    reforgePartyBattleSprites(sprites) {
      if (visitScenes && contact) once('party-battle-sprites', { sprites })
    },
    reforgeMove(sceneId, from, to, facing) {
      if (!routeScene(sceneId)) return
      const state = reforgeWorld()
      event(movementKind(sceneId), {
        ...(routeScenes && { scene: sceneId }),
        from: rfPos(from),
        to: rfPos(to),
        facing,
      })
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
    const id = sceneId(gs.wNumScene)
    if (!routeScene(id)) return
    if (source === 'before:tickSceneInput') previousMove = grid(gs.party)
    if (source !== 'commit:tickSceneInput') return
    const to = grid(gs.party)
    if (previousMove?.some((n, i) => n !== to[i]))
      event(movementKind(id), {
        ...(routeScenes && { scene: id }),
        from: previousMove,
        to,
        facing: gs.party.facing,
      })
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
    if (visitScenes) {
      const sprites = battle.players.map(({ roleId }) => roles.roles[roleId].spriteNumInBattle)
      once('party-battle-sprites', { sprites })
    }
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
