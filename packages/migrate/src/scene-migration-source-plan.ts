import type { ScriptRoot } from './script-graph.js'
import type { SourceCmd } from './source-facts.js'
import { partyPosToGrid, sceneSlug } from './source-facts.js'

export interface SourceEventObject {
  id: number
  x: number
  y: number
  spriteNum: number
  triggerMode?: number
  sState?: number
  sLayer?: number
  nSpriteFrames?: number
  nSpriteFramesAuto?: number
  direction?: number
  autoLabel?: string
  triggerLabel?: string
}

export interface SourceScene {
  sceneId: number
  mapNum: number
  onEnterLabel?: string
  onTeleportLabel?: string
  eventObjects: SourceEventObject[]
}

type ArrivalPosition = ReturnType<typeof partyPosToGrid>

export interface SceneMigrationSourcePlan {
  orderedScenes: SourceScene[]
  orderedEventSources: Array<[number, readonly SourceCmd[]]>
  arrivals: Map<number, Array<{ src: number; pos: ArrivalPosition }>>
  indexedArrivals: Map<number, ArrivalPosition[]>
  entriesFound: number
  allCommands: readonly SourceCmd[] | undefined
  labelAt: Map<string, { cmds: readonly SourceCmd[]; idx: number }>
  labelScene: Map<string, string | undefined>
  explicitLabels: Set<string>
  addressesByCommands: Map<readonly SourceCmd[], Array<number | undefined>>
  ownerScene: Map<string, string>
  graphRoots: ScriptRoot[]
}

export function sourceAddressFromLabel(label: string | undefined): number | undefined {
  const match = label ? /L_(\d+)$/.exec(label) : null
  return match?.[1] === undefined ? undefined : Number(match[1])
}

/**
 * 场景迁移的纯输入规划阶段：确定所有“首见”顺序并建立落点、地址、owner 和根索引。
 */
export function planSceneMigrationSources(
  sourceScenes: readonly SourceScene[],
  eventsByScene: ReadonlyMap<number, readonly SourceCmd[]>,
): SceneMigrationSourcePlan {
  // 所有会影响“首见”语义的输入先规范化，隔离调用方 Map 插入顺序与读盘顺序。
  const orderedScenes = [...sourceScenes].sort((left, right) => left.sceneId - right.sceneId)
  const eventSourceRank = (sceneId: number): number =>
    sceneId >= 0 ? 0 : sceneId === -1 ? 1 : sceneId === -2 ? 2 : 3
  const orderedEventSources = [...eventsByScene].sort(([left], [right]) => {
    const rank = eventSourceRank(left) - eventSourceRank(right)
    return rank || (left >= 0 && right >= 0 ? left - right : right - left)
  })

  const arrivals = new Map<number, Array<{ src: number; pos: ArrivalPosition }>>()
  const indexedArrivals = new Map<number, ArrivalPosition[]>()
  let entriesFound = 0
  // setPartyPos(raw70) 到 loadScene 的距离允许 ≤4；中间的 end 不隔断真实控制流。
  // all.json(-2) 只提供无具体来源场景的索引兜底，不进入来源计数与命名落点。
  for (const [srcId, commands] of orderedEventSources) {
    let last: { pos: ArrivalPosition; at: number } | null = null
    commands.forEach((command, index) => {
      if (command.op === 'raw' && command.opcode === 70) {
        const [col = 0, row = 0, height = 0] = command.operands ?? []
        last = { pos: partyPosToGrid(col, row, height), at: index }
        return
      }
      const rawTarget =
        (command as { op?: string; sceneId?: number }).op === 'loadScene'
          ? (command as { sceneId?: number }).sceneId
          : undefined
      const target = typeof rawTarget === 'number' ? Math.max(0, rawTarget - 1) : undefined
      if (target !== undefined) {
        if (last && index - last.at <= 4) {
          if (srcId === -2) {
            const list = indexedArrivals.get(target) ?? []
            list.push(last.pos)
            indexedArrivals.set(target, list)
          } else {
            const list = arrivals.get(target) ?? []
            list.push({ src: srcId, pos: last.pos })
            arrivals.set(target, list)
            entriesFound++
          }
        }
        last = null
      }
    })
  }

  const allCommands = eventsByScene.get(-2)
  const labelAt = new Map<string, { cmds: readonly SourceCmd[]; idx: number }>()
  const labelScene = new Map<string, string | undefined>()
  const explicitLabels = new Set<string>()
  const addressesByCommands = new Map<readonly SourceCmd[], Array<number | undefined>>()
  // auto/trigger label 可以指向共享段或他场景段；地址型 label 全局唯一，重复时首见归属生效。
  for (const [sourceScene, commands] of orderedEventSources)
    commands.forEach((command, index) => {
      if (command.label && !labelAt.has(command.label)) {
        labelAt.set(command.label, { cmds: commands, idx: index })
        labelScene.set(command.label, sourceScene >= 0 ? sceneSlug(sourceScene) : undefined)
      }
    })
  for (const [, commands] of orderedEventSources) {
    const addresses: Array<number | undefined> = []
    let address: number | undefined
    commands.forEach((command, index) => {
      const match = command.label ? /^L_(\d+)$/.exec(command.label) : null
      if (match?.[1] !== undefined) address = Number(match[1])
      else if (address !== undefined) address++
      addresses[index] = address
    })
    addressesByCommands.set(commands, addresses)
  }
  if (allCommands) {
    allCommands.forEach((command, address) => {
      const expected = `L_${address}`
      if (command.label !== undefined && command.label !== expected)
        throw new Error(
          `all.json 显式 label 与数组地址不一致: index=${address}, label=${command.label}`,
        )
      if (command.label) explicitLabels.add(command.label)
      if (!labelAt.has(expected)) labelAt.set(expected, { cmds: allCommands, idx: address })
    })
    addressesByCommands.set(
      allCommands,
      Array.from({ length: allCommands.length }, (_, address) => address),
    )
  }

  const ownerScene = new Map<string, string>()
  const graphRoots: ScriptRoot[] = []
  for (const sourceScene of orderedScenes) {
    const owner = sceneSlug(sourceScene.sceneId)
    for (const entity of sourceScene.eventObjects)
      ownerScene.set(`e${entity.id}`, sceneSlug(sourceScene.sceneId))
    for (const label of [sourceScene.onEnterLabel, sourceScene.onTeleportLabel]) {
      const entry = sourceAddressFromLabel(label)
      if (entry !== undefined) graphRoots.push({ entry, owner, kind: 'scene' })
    }
    for (const entity of sourceScene.eventObjects) {
      for (const label of [entity.triggerLabel, entity.autoLabel]) {
        const entry = sourceAddressFromLabel(label)
        if (entry !== undefined) graphRoots.push({ entry, owner, kind: 'scene' })
      }
    }
  }

  return {
    orderedScenes,
    orderedEventSources,
    arrivals,
    indexedArrivals,
    entriesFound,
    allCommands,
    labelAt,
    labelScene,
    explicitLabels,
    addressesByCommands,
    ownerScene,
    graphRoots,
  }
}
