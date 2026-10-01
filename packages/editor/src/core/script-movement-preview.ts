import type {
  AuthorCommand,
  AuthorScriptFlow,
  AuthorScriptLibrary,
  EntityAddress,
  Facing,
  FlowCursor,
  GridPos,
  SceneDef,
} from '@type-pal/content'
import { pixelDeltaToGridDelta } from '@type-pal/content'
import { previewFlowCursor } from './script-flow-preview.js'

export type MovementPreviewTarget = { kind: 'party' } | { kind: 'entity'; address: EntityAddress }

export interface MovementPreviewNode {
  pos: GridPos
  /** Presentation order within one actor's authored route, not a content identity. */
  number?: number
  kind: 'start' | 'move' | 'teleport' | 'dynamic'
  conditional: boolean
  label: string
}

export interface MovementPreviewTrack {
  target: MovementPreviewTarget
  nodes: MovementPreviewNode[]
  segments: Array<{
    from: MovementPreviewNode
    to: MovementPreviewNode
    conditional: boolean
  }>
}

export interface ScriptMovementPreview {
  tracks: MovementPreviewTrack[]
  notes: string[]
}

interface Position {
  pos?: GridPos
  node?: MovementPreviewNode
}

interface RouteState {
  positions: Map<string, Position>
  stop?: 'script' | 'boundary'
}

const PARTY_KEY = 'party'
const direction: Record<Facing, { dcol: number; drow: number }> = {
  down: { dcol: 0, drow: 0.5 },
  left: { dcol: -0.5, drow: 0 },
  up: { dcol: 0, drow: -0.5 },
  right: { dcol: 0.5, drow: 0 },
}

const entityKey = (address: EntityAddress): string =>
  JSON.stringify([address.scene, address.entity])
const targetKey = (target: MovementPreviewTarget): string =>
  target.kind === 'party' ? PARTY_KEY : entityKey(target.address)
const samePos = (a?: GridPos, b?: GridPos): boolean =>
  !!a && !!b && a.col === b.col && a.row === b.row && a.height === b.height

function selectedBody(flow: AuthorScriptFlow, cursor?: FlowCursor) {
  const selected = previewFlowCursor(flow, cursor)
  if (flow.kind === 'stages' && selected.kind === 'stage')
    return flow.stages.find((stage) => stage.id === selected.stage)
  if (flow.kind === 'stateMachine' && selected.kind === 'state')
    return flow.machine.states[selected.state]
  return undefined
}

function cloneState(state: RouteState): RouteState {
  return {
    positions: new Map([...state.positions].map(([key, position]) => [key, { ...position }])),
    stop: state.stop,
  }
}

/** Merge knowledge, not execution: divergent arms must not supply a fictitious next start point. */
function mergeStates(state: RouteState, arms: readonly RouteState[]): void {
  state.stop = arms.some((arm) => arm.stop === 'boundary')
    ? 'boundary'
    : arms.some((arm) => arm.stop === 'script')
      ? 'script'
      : undefined
  for (const key of state.positions.keys()) {
    const first = arms[0]?.positions.get(key)
    if (!first?.pos || arms.some((arm) => !samePos(first.pos, arm.positions.get(key)?.pos))) {
      state.positions.set(key, {})
      continue
    }
    state.positions.set(key, {
      pos: first.pos,
      node: arms.every((arm) => arm.positions.get(key)?.node === first.node)
        ? first.node
        : undefined,
    })
  }
}

/**
 * Static, side-effect-free authoring guide for the selected step only. It neither evaluates world
 * conditions nor predicts collision/avoidance or live NPC positions. Unknown boundaries break lines.
 */
export function collectScriptMovementPreview(options: {
  scene: SceneDef
  flow: AuthorScriptFlow
  cursor?: FlowCursor
  sharedScripts?: AuthorScriptLibrary
  self?: EntityAddress
  sceneEntry?: boolean
}): ScriptMovementPreview {
  const { scene, flow, cursor, self, sceneEntry } = options
  const sharedScripts = options.sharedScripts ?? {}
  const tracks = new Map<string, MovementPreviewTrack>()
  const nodeNumbers = new Map<string, number>()
  const notes = new Set<string>()
  const state: RouteState = {
    positions: new Map([
      [PARTY_KEY, { pos: { ...scene.entry.pos } }],
      ...scene.entities.map((entity): [string, Position] => [
        entityKey({ scene: scene.id, entity: entity.id }),
        { pos: { ...entity.pos } },
      ]),
    ]),
  }
  let visitedCommands = 0

  const visibleTarget = (target: MovementPreviewTarget): boolean => {
    if (target.kind === 'party') return true
    if (target.address.scene !== scene.id) {
      notes.add('跨场景实体的移动不在当前地图绘制。')
      return false
    }
    if (!state.positions.has(entityKey(target.address))) {
      notes.add(`移动目标 ${target.address.entity} 不在当前场景。`)
      return false
    }
    return true
  }
  const invalidate = (route: RouteState): void => {
    for (const key of route.positions.keys()) route.positions.set(key, {})
  }
  const trackFor = (target: MovementPreviewTarget): MovementPreviewTrack => {
    const key = targetKey(target)
    const existing = tracks.get(key)
    if (existing) return existing
    const track: MovementPreviewTrack = { target, nodes: [], segments: [] }
    tracks.set(key, track)
    return track
  }
  const addPoint = (
    route: RouteState,
    target: MovementPreviewTarget,
    pos: GridPos,
    kind: MovementPreviewNode['kind'],
    conditional: boolean,
    label: string,
  ): void => {
    if (!visibleTarget(target)) return
    const key = targetKey(target)
    const current = route.positions.get(key)
    const track = trackFor(target)
    let from = current?.node
    if (kind === 'move' && current?.pos && !from) {
      from = { pos: { ...current.pos }, kind: 'start', conditional, label: '起点' }
      track.nodes.push(from)
    }
    const number = (nodeNumbers.get(key) ?? 0) + 1
    nodeNumbers.set(key, number)
    const node: MovementPreviewNode = {
      pos: { ...pos },
      number,
      kind,
      conditional,
      label,
    }
    track.nodes.push(node)
    if (kind === 'move' && from)
      track.segments.push({ from, to: node, conditional: conditional || from.conditional })
    route.positions.set(key, { pos: node.pos, node })
  }
  const relativePoint = (
    route: RouteState,
    target: MovementPreviewTarget,
    delta: { dcol: number; drow: number },
    conditional: boolean,
    label: string,
  ): void => {
    if (!visibleTarget(target)) return
    const current = route.positions.get(targetKey(target))?.pos
    if (!current) {
      notes.add('相对移动的起点不确定，未猜测落点。')
      return
    }
    addPoint(
      route,
      target,
      { col: current.col + delta.dcol, row: current.row + delta.drow, height: current.height },
      'move',
      conditional,
      label,
    )
  }

  const walk = (
    commands: readonly AuthorCommand[],
    route: RouteState,
    owner: EntityAddress | undefined,
    conditional: boolean,
    calls: ReadonlySet<string>,
  ): void => {
    const alternatives = (arms: readonly (readonly AuthorCommand[])[]): void => {
      const outcomes = arms.map((body) => {
        const arm = cloneState(route)
        walk(body, arm, owner, true, calls)
        return arm
      })
      mergeStates(route, outcomes)
      notes.add('虚线表示条件或循环路线；分支后的未知位置不会强行连线。')
      if (route.stop) notes.add('部分分支会提前结束，后续路线不作确定预测。')
    }
    for (const command of commands) {
      if (route.stop) break
      if (++visitedCommands > 10000) {
        notes.add('脚本过长，轨迹仅显示前面的编排。')
        route.stop = 'boundary'
        break
      }
      switch (command.kind) {
        case 'stopScript':
          route.stop = 'script'
          break
        case 'moveEntity':
          addPoint(
            route,
            { kind: 'entity', address: command.target },
            command.to,
            'move',
            conditional,
            '移动',
          )
          break
        case 'moveParty':
          addPoint(route, { kind: 'party' }, command.to, 'move', conditional, '队伍移动')
          break
        case 'stepEntity':
          relativePoint(
            route,
            { kind: 'entity', address: command.target },
            direction[command.dir],
            conditional,
            '单步移动',
          )
          break
        case 'nudgeEntity':
          relativePoint(
            route,
            { kind: 'entity', address: command.target },
            pixelDeltaToGridDelta(command.dx, command.dy),
            conditional,
            '相对位移',
          )
          break
        case 'nudgeParty':
          relativePoint(
            route,
            { kind: 'party' },
            pixelDeltaToGridDelta(command.dx, command.dy),
            conditional,
            '队伍相对位移',
          )
          break
        case 'teleportParty':
          addPoint(route, { kind: 'party' }, command.pos, 'teleport', conditional, '队伍瞬移')
          notes.add('菱形节点表示瞬移或重新摆位，不与之前位置连接。')
          break
        case 'setEntityPos':
          addPoint(
            route,
            { kind: 'entity', address: command.target },
            command.pos,
            'teleport',
            conditional,
            '重新摆位',
          )
          notes.add('菱形节点表示瞬移或重新摆位，不与之前位置连接。')
          break
        case 'setEntityPosRelParty': {
          const party = route.positions.get(PARTY_KEY)?.pos
          if (party)
            addPoint(
              route,
              { kind: 'entity', address: command.target },
              {
                col: party.col + command.dcol,
                row: party.row + command.drow,
                height:
                  scene.entities.find((entity) => entity.id === command.target.entity)?.pos
                    .height ?? 0,
              },
              'teleport',
              conditional,
              '相对队伍摆位',
            )
          else {
            route.positions.set(entityKey(command.target), {})
            notes.add('队伍位置不确定，未猜测相对摆位落点。')
          }
          break
        }
        case 'chasePlayer': {
          if (!owner || !visibleTarget({ kind: 'entity', address: owner })) {
            notes.add('追逐缺少当前场景的触发实体，未绘制。')
            break
          }
          const key = entityKey(owner)
          const current = route.positions.get(key)?.pos
          if (current)
            addPoint(
              route,
              { kind: 'entity', address: owner },
              current,
              'dynamic',
              true,
              '追逐：目标随玩家变化',
            )
          route.positions.set(key, {})
          notes.add('追逐目标随玩家变化，不绘制固定终点。')
          break
        }
        case 'ride':
          addPoint(
            route,
            { kind: 'entity', address: command.target },
            command.to,
            'move',
            true,
            '骑行目标',
          )
          route.positions.set(PARTY_KEY, {})
          notes.add('骑行只标出载具目标；队伍挂载位置不作固定路径预测。')
          break
        case 'mountParty':
          route.positions.set(PARTY_KEY, {})
          notes.add('挂载后的队伍位置由载具决定，不与原队伍位置连线。')
          break
        case 'branch':
          alternatives([command.then, command.else ?? []])
          break
        case 'loop':
          alternatives([[], command.body])
          notes.add('循环仅展示一次循环体，不展开重复次数。')
          break
        case 'confirm':
          alternatives([[], command.onNo])
          break
        case 'startBattle':
          alternatives([[], command.onLose ?? [], command.onFlee ?? []])
          break
        case 'teleportOut':
          alternatives([command.onFail ?? []])
          route.stop = 'boundary'
          notes.add('传送结果不确定，后续轨迹不在当前地图继续绘制。')
          break
        case 'callScript': {
          const shared = sharedScripts[command.script]
          if (!shared || calls.has(command.script) || calls.size >= 32) {
            notes.add(
              !shared
                ? `共享脚本 ${command.script} 缺失，后续起点不确定。`
                : '递归共享脚本未展开，后续起点不确定。',
            )
            invalidate(route)
            break
          }
          const inherited = command.self ?? owner
          if (
            (shared.self === 'required' && !inherited) ||
            (shared.self === 'none' && command.self)
          ) {
            notes.add(`共享脚本 ${shared.name} 的触发实体参数不合法，未继续绘制。`)
            route.stop = 'boundary'
            break
          }
          walk(
            shared.body,
            route,
            shared.self === 'none' ? undefined : inherited,
            conditional,
            new Set([...calls, command.script]),
          )
          // Runtime catches ScriptStopped at a shared-call boundary; its caller keeps running.
          if (route.stop === 'script') route.stop = undefined
          break
        }
        case 'loadScene':
        case 'loadLastSave':
        case 'gameOver':
          route.stop = 'boundary'
          notes.add('场景或存档切换之后的轨迹不在当前地图显示。')
          break
        case 'setSceneMapOverride':
          if (!command.scene || command.scene === scene.id) {
            route.stop = 'boundary'
            notes.add('地图更换之后的轨迹不在当前底图显示。')
          }
          break
        default:
          break
      }
    }
  }

  const selected = selectedBody(flow, cursor)
  if (selected) {
    if (sceneEntry) walk(selected.entry?.prepare ?? [], state, self, false, new Set())
    walk(selected.body, state, self, false, new Set())
  }
  return { tracks: [...tracks.values()], notes: [...notes] }
}
