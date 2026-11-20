import assert from 'node:assert/strict'
import { scriptedDefeatObserver } from '../battle-scripted-defeat-observer.mjs'

export function bossObserver(input) {
  let world = scriptedDefeatObserver(input)
  if (input.watched?.length) {
    const watchers = [
      [
        '.filter(({ id }) => id === Number(owner.slice(1)) || id === Number(owner.slice(1)) - 1)',
        `.filter(({ id }) => id === Number(owner.slice(1)) || ${JSON.stringify(input.watched)}.includes('e' + id))`,
      ],
      [
        '.filter(({ id }) => id === owner || Number(id.slice(1)) === Number(owner.slice(1)) - 1)',
        `.filter(({ id }) => id === owner || ${JSON.stringify(input.watched)}.includes(id))`,
      ],
    ]
    for (const [anchor, replacement] of watchers) {
      assert.equal(world.split(anchor).length, 2, 'boss actor observation source changed')
      world = world.replace(anchor, replacement)
    }
  }
  const battle = `(${installBossFrameObserver})(${JSON.stringify(input.engine)})`
  const foreground = input.foreground ? `;(${installBossForeground})(${JSON.stringify(input)})` : ''
  return `${world};${battle}${foreground}`
}

function installBossForeground({
  scene,
  handoffScene,
  owner,
  watched,
  visitScenes,
  assets,
  scriptedReturn,
  entrance,
  includesParty,
  victoryFade,
  watchChoice,
}) {
  const observation = globalThis.__defeat
  const ids = [owner, ...(watched ?? [])]
  let gameActors = {}
  let gameWorldDrawn = false
  let pending
  let previous
  let previousVisible
  let successor
  let returned
  let entered
  let shift = 0
  let requestedShift = 0
  let ditherStep
  let previousComposite
  let victoryReturnComplete = false
  let choice
  let jarDark = false
  let jarRevealed = false
  let firstFieldReturned = false
  let lastVisit
  const watchesScene = (id) => id === scene || id === handoffScene || visitScenes?.includes(id)

  function canvasState(context) {
    const { width, height } = context.canvas
    const colors = [0.2, 0.48, 0.79].flatMap((x) =>
      [0.18, 0.47, 0.72].map((y) =>
        Array.from(context.getImageData(Math.floor(x * width), Math.floor(y * height), 1, 1).data),
      ),
    )
    const black =
      colors.every(([r, g, b]) => r === 0 && g === 0 && b === 0) &&
      context.getImageData(0, 0, width, height).data.every((value, i) => i % 4 === 3 || value === 0)
    return { colors, black }
  }

  function recordVictoryReturn(frame, context) {
    if (!victoryFade || victoryReturnComplete) return
    const { ended, state } = observation.read()
    if (!ended || state.scene !== scene) return
    const { colors, black } = canvasState(context)
    observation.event('victory-return-paint', {
      scene,
      black,
      ready: state.ready,
      colors,
      world: frame && { ...frame, party: observation.worldDraw()?.party },
    })
    victoryReturnComplete = state.ready && !!frame && !black
  }

  function recordJarPresentation(frame, context) {
    if (!watchChoice || choice?.yes !== true || firstFieldReturned) return
    const { ended } = observation.read()
    if (jarRevealed && !ended) return
    const { colors, black } = canvasState(context)
    if (!jarRevealed) {
      if (black && !jarDark) {
        jarDark = true
        observation.eventOnce('jar-black-drawn', { scene, colors })
      } else if (!black && jarDark) {
        jarRevealed = true
        observation.eventOnce('jar-reveal-drawn', {
          ...frame,
          colors,
          party: frame && observation.worldDraw()?.party,
        })
      }
    } else if (!black) {
      firstFieldReturned = true
      observation.eventOnce('tian-first-return-drawn', {
        ...frame,
        colors,
        party: frame && observation.worldDraw()?.party,
      })
    }
  }

  function recordComposite(sceneId, context, step) {
    if (!includesParty || (!requestedShift && step === undefined && !previousComposite)) return
    const key = JSON.stringify([sceneId, step, shift, requestedShift])
    if (key === previousComposite) return
    previousComposite = key
    const { width, height } = context.canvas
    const scale = width / 320
    const band = Math.abs(shift) * scale
    const black =
      band > 0 &&
      context
        .getImageData(0, shift > 0 ? 0 : height - band, width, band)
        .data.every((value, index) => index % 4 === 3 || value === 0)
    let notePlatePixels
    if (step === 0) {
      // Sample the Earth Bead scroll panel on the unmodified first dither output.
      const panel = context.getImageData(112 * scale, 45 * scale, 98 * scale, 9 * scale).data
      let pale = 0
      for (let pixel = 0; pixel < panel.length; pixel += 4) {
        const [r, g, b] = [panel[pixel], panel[pixel + 1], panel[pixel + 2]]
        if (g >= 105 && b >= 85 && Math.abs(r - g) < 30) pale++
      }
      notePlatePixels = Math.round(pale / (scale * scale))
    }
    observation.event('scene-composite', {
      scene: sceneId,
      ditherStep: step,
      shift,
      requestedShift,
      black,
      notePlatePixels,
    })
  }
  function commit(frame, context, step) {
    if (includesParty) frame = { ...frame, party: observation.worldDraw()?.party }
    if (visitScenes && step !== undefined) frame = { ...frame, ditherStep: step }
    const signature = JSON.stringify(frame)
    const entering = entrance && frame.scene === scene && !entered
    const arriving = handoffScene && frame.scene === handoffScene && !successor
    const returning = scriptedReturn && !returned && observation.read().ended
    const leaving = handoffScene && frame.scene === scene && !successor && observation.read().ended
    const newVisit = visitScenes && lastVisit !== frame.scene
    if (previous === signature && !entering && !arriving && !returning && !leaving && !newVisit)
      return
    const { width, height } = context.canvas
    const colors = [0.2, 0.48, 0.79].flatMap((x) =>
      [0.18, 0.47, 0.72].map((y) =>
        Array.from(context.getImageData(Math.floor(x * width), Math.floor(y * height), 1, 1).data),
      ),
    )
    const visible =
      !(visitScenes && step === 0) &&
      (entering || arriving || returning || leaving || newVisit
        ? context
            .getImageData(0, 0, width, height)
            .data.some((value, index) => index % 4 !== 3 && value > 0)
        : colors.some(([red, green, blue]) => Math.max(red, green, blue) > 0))
    if (previous === signature && previousVisible === visible) return
    previous = signature
    previousVisible = visible
    observation.event('world-drawn', { ...frame, colors, visible })
    if (newVisit && visible) {
      lastVisit = frame.scene
      observation.event('scene-first-drawn', { ...frame, colors })
    }
    if (entering && visible) {
      entered = true
      observation.eventOnce('entrance-drawn', { ...frame, colors })
    }
    if (arriving && visible) {
      successor = { ...frame, colors }
      observation.eventOnce('successor-drawn', successor)
    }
    if (returning && visible) {
      returned = { ...frame, colors }
      observation.eventOnce('scripted-return-drawn', returned)
    }
  }

  globalThis.__bossForeground = {
    successor: () => successor,
    scriptedReturn: () => returned,
    choice: () => choice,
    showChoice(yes) {
      if (!watchChoice || choice?.yes === yes) return
      choice = observation.event('jar-choice-drawn', { yes })
    },
    beginComposite() {
      shift = 0
      requestedShift = 0
      ditherStep = undefined
    },
    shift(value) {
      shift = value
      requestedShift = value
    },
    dither(step) {
      ditherStep = step
      shift = 0
    },
    battleFrame() {
      previous = undefined
    },
    gameWorldDrawn() {
      gameWorldDrawn = true
    },
    gameActor(npc, sprite, frame) {
      const id = `e${npc.id}`
      if (!ids.includes(id)) return
      gameActors[id] = {
        asset: npc.spriteNum,
        position: [npc.x, npc.y],
        facing: npc.facing ?? null,
        frame,
        resource: globalThis.__e2eRecordSpriteFrame(sprite),
        rect: [npc.x - sprite.anchorX, npc.y + 7 - sprite.anchorY, sprite.width, sprite.height],
      }
    },
    gameFrame(gs, battle, context) {
      const actors = gameActors
      const drewWorld = gameWorldDrawn
      gameActors = {}
      gameWorldDrawn = false
      const sceneId = `s${String(gs.wNumScene - 1).padStart(3, '0')}`
      if (!drewWorld || battle || !watchesScene(sceneId)) {
        previous = undefined
        recordVictoryReturn(undefined, context)
        recordJarPresentation(undefined, context)
        return
      }
      const frame = {
        scene: sceneId,
        camera: [gs.camera.x, gs.camera.y],
        leader: [gs.party.x, gs.party.y],
        actors,
        ambience: gs.nightPalette ? 'night' : 'day',
        changing: !!gs.paletteFadeState,
        ...(includesParty && { partyLayer: gs.wLayer / 8 }),
      }
      commit(frame, context, gs.fadeState?.appliedSteps)
      recordVictoryReturn(frame, context)
      recordJarPresentation(frame, context)
      recordComposite(sceneId, context, gs.fadeState?.appliedSteps)
    },
    reforgeWorld(sceneId, camera, draws, partyLayer) {
      if (!watchesScene(sceneId)) return
      const pixels = ([col, row]) => [16 * (col - row), 8 * (col + row)]
      const actors = {}
      for (const id of ids) {
        const pose = draws?.[id]
        if (pose?.drawStatus !== 'drawn') continue
        const [x, y, w, h] = pose.geometry.worldRect
        if (x + w <= camera.x || x >= camera.x + 320 || y + h <= camera.y || y >= camera.y + 200)
          continue
        actors[id] = {
          asset: assets[pose.assetId] ?? null,
          position: pixels(pose.position),
          facing: pose.facing,
          frame: pose.frame,
          resource: pose.frameResourceId,
          rect: pose.geometry.worldRect,
        }
      }
      if (draws?.party?.drawStatus !== 'drawn') return
      pending = {
        scene: sceneId,
        camera: [camera.x, camera.y],
        leader: pixels(draws.party.position),
        actors,
        ...(includesParty && { partyLayer }),
      }
    },
    reforgeFrame(ambience, tint, changing, context) {
      if (!pending) {
        previous = undefined
        recordVictoryReturn(undefined, context)
        recordJarPresentation(undefined, context)
        return
      }
      const frame = pending
      pending = undefined
      commit({ ...frame, ambience, tint, changing }, context, ditherStep)
      recordVictoryReturn(frame, context)
      recordJarPresentation(frame, context)
      recordComposite(frame.scene, context, ditherStep)
    },
  }
}

function installBossFrameObserver(engine) {
  const observation = globalThis.__defeat
  globalThis.__bossMusicFade = (asset, ms, context) =>
    observation.event('music-fade-out', { track: Number(asset.split('.').at(-1)), ms, context })
  let drop
  const observeRandom = globalThis.__battleGameRandom
  globalThis.__battleGameRandom = (...args) => {
    observeRandom(...args)
    if (drop) observation.event('drop-sample', { ...drop, value: args[2] })
  }
  globalThis.__bossDrop = {
    begin(slot, id) {
      drop = { slot, id }
      observation.event('defeated-script-start', drop)
    },
    end() {
      const inventory =
        engine === 'game' ? globalThis.__tpgs.inventory : globalThis.__rfWorld.inventory
      observation.event('defeated-script-end', {
        ...drop,
        inventory: inventory
          .filter(({ count }) => count > 0)
          .map(({ itemId, count }) => ({ itemId: String(itemId), count })),
      })
      drop = undefined
    },
    active: () => !!drop,
    sample() {
      const value = observation.rng()
      observation.event('drop-sample', { ...drop, value })
      return value
    },
  }
  globalThis.__bossSettlement = (screen) => {
    if (screen?.kind === 'exp-cash')
      observation.eventOnce('victory-summary-drawn', {
        exp: screen.expGained ?? screen.exp,
        cash: screen.cashGained ?? screen.cash,
      })
  }
  const nativeTerminal = globalThis.__battleGameTerminal
  let victory = false
  globalThis.__battleGameTerminal = (gs, outcome) => {
    nativeTerminal(gs, outcome)
    victory = outcome === 'won'
  }
  globalThis.__bossNarration = (state) => {
    const text = state.currentLineText ?? state.shownLines[0]
    if (text && (victory || globalThis.__tpgs.battleState?.phase === 'won')) {
      const kind = victory ? 'reward-note-drawn' : 'defeated-note-drawn'
      observation.eventOnce(kind, { text })
    }
  }
  globalThis.__bossReforgeNarration = (text, victoryHeld) => {
    if (text && victoryHeld && drop) observation.eventOnce('defeated-note-drawn', { text })
  }
  const seen = new WeakMap()
  const frameKeys = new Map()
  let actor, lastAction
  const nativeStart = globalThis.__battleGameActionStart
  globalThis.__battleGameActionStart = (state, gs, who, action, roles) => {
    nativeStart(state, gs, who, action, roles)
    actor = {
      turn: state.turn + 1,
      side: who.isEnemy ? 'enemy' : 'player',
      slot: who.idx,
      kind: action.type,
      target: action.target,
    }
  }
  const nativeComplete = globalThis.__battleGameActionComplete
  globalThis.__battleGameActionComplete = (...args) => {
    nativeComplete(...args)
    actor = undefined
  }
  const nativeReforgeAction = observation.reforgeAction
  observation.reforgeAction = (action, state) => {
    nativeReforgeAction(action, state)
    lastAction = {
      turn: state.turn,
      side: action.side,
      slot: action.idx,
      kind: action.kind,
      target: action.targetPlayerIdx ?? action.targetEnemyIdx ?? null,
    }
  }
  Object.assign(globalThis.__battleEvidence, {
    labelFighter(draw, side, slot, fading, frame) {
      seen.set(draw, { side, slot, fading, frame })
    },
    fighterDrawn(draw, frame) {
      const identity = seen.get(draw)
      if (identity?.side !== 'enemy' || identity.fading) return
      const active =
        engine === 'game'
          ? globalThis.__tpgs.battleState?.battleAnim && actor
          : globalThis.__rfBattle?.actionPresentation.active && lastAction
      const { x, y } = draw
      const recorded = {
        slot: identity.slot,
        frame: frame ?? identity.frame,
        x,
        y,
        active: active || null,
      }
      const key = JSON.stringify(recorded)
      if (frameKeys.get(identity.slot) !== key) {
        observation.event('boss-frame', recorded)
        frameKeys.set(identity.slot, key)
      }
    },
    magicOverlayDrawn() {},
  })
}
