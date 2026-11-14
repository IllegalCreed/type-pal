import { createSeedableRng } from '../../packages/game/src/core/rng.ts'
import { createEvidenceRecorder } from './evidence-recorder.mjs'

export function enemyEscapeObserver(input) {
  return `(${install})(${JSON.stringify(input)}, ${createSeedableRng}, ${createEvidenceRecorder})`
}

function install({ engine, scene, owner, seed }, createRng, createRecorder) {
  const events = []
  const errors = []
  let overflow = false,
    contact = false,
    started = false,
    previousPos,
    previousPaint,
    fighters = []
  const { append } = createRecorder({
    context: () => ({ atMs: performance.now() }),
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  const event = (kind, details) => {
    if (!contact) return
    if (kind === 'battle-start') started = true
    append(events, { kind, ...details }, 3000)
  }
  const gameGrid = ({ x, y }) => [(x / 16 + y / 8) / 2, (y / 8 - x / 16) / 2, 0]
  const rfGrid = ({ col, row, height }) => [col, row, height]
  const gameScene = (n) => `s${String(n - 1).padStart(3, '0')}`
  const role = (id) => ({ 0: 'li-xiaoyao', 2: 'lin-yueru' })[id] ?? String(id)
  const items = (list) =>
    list
      .filter(({ count }) => count > 0)
      .map(({ itemId, count }) => [String(itemId), count])
      .sort(([a], [b]) => Number(a) - Number(b))
  const rng = createRng(seed)
  const take = (method, ...args) => {
    const before = rng.getState()
    const value = rng[method](...args)
    if (before !== rng.getState()) event('rng', { method, value, state: rng.getState() })
    return value
  }
  const readGame = (gs) => {
    if (!gs) return null
    const box = gs.dialogBox
    const npc = gs.npcs.find(({ id }) => `e${id}` === owner)
    const menu = gs.menuStack.at(-1)
    return {
      scene: gameScene(gs.wNumScene),
      position: gameGrid(gs.party),
      ready: globalThis.__routeGameReadiness(gs).routeReady,
      menu: menu ? { kind: menu.kind, cursor: menu.state?.selection?.cursor } : null,
      cash: gs.dwCash,
      items: items(gs.inventory),
      party: gs.partyMembers.map((id) => [
        role(id),
        gs.PlayerRolesRuntime.rgwHP[id],
        gs.PlayerRolesRuntime.rgwMP[id],
        gs.Exp.rgPrimaryExp[id].wExp,
      ]),
      ownerState: npc?.sState,
      retained: gs.dialogBoxKept ? [[gs.dialogBoxKept.style, gs.dialogBoxKept.portraitIcon]] : [],
      box: box
        ? {
            phase: box.phase,
            at: box.lineStartMs ?? 0,
            text: [
              ...box.shownLines,
              box.style === 'narration'
                ? box.currentLineText
                : box.currentLineText?.slice(0, box.charsRevealed),
            ]
              .filter(Boolean)
              .join('\n'),
            style: box.style,
            portrait: box.portraitIcon ?? null,
          }
        : null,
    }
  }
  const readReforge = () => {
    const rt = globalThis.__tpObserve?.readRuntime()
    const world = globalThis.__rfWorld
    if (!rt || !world) return null
    const box = rt.dialogueSlots.find(({ active }) => active)
    const retained = rt.dialogueSlots
      .filter(({ phase }) => phase === 'retained')
      .map(({ slot, portraitAsset }) => [slot, portraitAsset])
    return {
      scene: rt.sceneId,
      position: rfGrid(rt.position),
      ready:
        !rt.battleActive &&
        !rt.scriptRunning &&
        !rt.dialogue &&
        !rt.presentationBusy &&
        !rt.menuActive &&
        rt.fadeBlack === 0,
      checkpoint: globalThis.__tpObserve.readBoot().checkpointLoad,
      cash: world.money,
      items: items(world.inventory),
      party: world.party.map(({ template, hp, mp, exp }) => [template, hp, mp, exp]),
      retained,
      ownerState: world.script.entityState?.[scene]?.[owner],
      box: box
        ? {
            phase: box.phase,
            at: box.pageStartedAtMs,
            text: box.visibleText,
            style: box.slot,
            portrait: box.portraitAsset ?? null,
            ids: box.pageTextIds,
          }
        : null,
    }
  }
  const read = () => (engine === 'game' ? readGame(globalThis.__tpgs) : readReforge())
  const move = (position) => event('move', { position })
  const paint = (state, battle, escape) => {
    if (!started || !state) return
    const { ready, box, ...visible } = state
    const draw = { ...visible, ready, box, battle, escape, fighters }
    const key = JSON.stringify(draw)
    if (key !== previousPaint) {
      previousPaint = key
      event('paint', draw)
    }
  }
  globalThis.__enemyEscape = {
    read,
    trace: () => ({ engine, seed, events, errors, overflow, timeOrigin: performance.timeOrigin }),
    event,
    rng: {
      next: () => take('next'),
      range: (lo, hi) => take('range', lo, hi),
      rangeFloat: (lo, hi) => take('rangeFloat', lo, hi),
      rangeInclusive: (lo, hi) => take('rangeInclusive', lo, hi),
      getState: rng.getState,
    },
    entry(sceneId, id, position) {
      const game = engine === 'game'
      if ((game ? gameScene(sceneId) : sceneId) !== scene || (game ? `e${id}` : id) !== owner)
        return
      contact = true
      event('contact', { scene, owner, position: game ? gameGrid(position) : rfGrid(position) })
    },
    move: (pos) => {
      if (!contact) {
        append(events, { kind: 'approach-move', position: rfGrid(pos) }, 3000)
      } else move(rfGrid(pos))
    },
    beginFrame: () => {
      fighters = []
    },
    fighter: (fighter) => {
      if (contact) fighters.push(fighter)
    },
    gameFrame(gs, rendered) {
      if (!contact) return
      const state = gs.battleState
      paint(readGame(gs), rendered, state?.enemyEscapeAnim ?? null)
    },
    reforgeFrame(s, fleeing, terminal) {
      if (!contact) return
      if (fleeing?.length) {
        const escaped = fleeing.map((index) => s.enemies[index]?.hp)
        const frame = { escaped, terminal: terminal?.result }
        const key = JSON.stringify(frame)
        if (key !== this.previousEscape) {
          this.previousEscape = key
          event('escape-presentation', frame)
        }
      }
    },
    reforgeWorld(rendered) {
      if (!rendered) fighters = []
      paint(readReforge(), rendered, null)
    },
    sound(id, context, buffer) {
      event('sound', {
        id: Number(String(id).split('.').at(-1)),
        context,
        duration: buffer?.duration,
      })
    },
  }
  globalThis.__innGame = (gs, source) => {
    if (gameScene(gs.wNumScene) !== scene) return
    const position = gameGrid(gs.party)
    if (source === 'before:tickSceneInput') previousPos = position
    if (source !== 'commit:tickSceneInput' || !previousPos?.some((n, i) => n !== position[i]))
      return
    if (!contact) append(events, { kind: 'approach-move', position }, 3000)
    else move(position)
  }
}
