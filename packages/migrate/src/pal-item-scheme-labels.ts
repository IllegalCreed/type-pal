import type {
  AuthorCommand,
  AuthorItemData,
  AuthorSceneDef,
  AuthorScriptFlow,
} from '@type-pal/content'

const OPAQUE_ITEM_SCHEME_LABEL = /^物品剧情行为 [0-9a-f]{12}$/

type SchemeAddress =
  | {
      kind: 'entity'
      sceneId: string
      entityId: string
      channel: 'trigger' | 'auto'
      id: string
    }
  | { kind: 'hook'; sceneId: string; channel: 'onEnter' | 'onTeleport'; id: string }

interface SchemeNode {
  key: string
  address: SchemeAddress
  id: string
  label: string
  order: number
  flow: AuthorScriptFlow
  path: string
  edges: SelectionEdge[]
}

interface SelectionEdge {
  target: string
  path: string
}

interface PalItemSchemeLabelPlanEntry {
  address: SchemeAddress
  id: string
  itemId: string
  path: string
  currentLabel: string
  expectedLabel: string
  currentMachineLabel?: string
  expectedMachineLabel?: string
}

export interface PalItemSchemeLabelReport {
  schemes: number
  machineInners: number
  itemRoots: number
  opaqueLabels: number
  labels: Array<{ id: string; itemId: string; path: string; label: string; machineLabel?: string }>
}

interface PalItemSchemeLabelArgs {
  items: readonly AuthorItemData[]
  scenes: readonly AuthorSceneDef[]
  expectedSchemes: number
  expectedMachineInners: number
  expectedItemRoots?: number
}

function keyOf(address: SchemeAddress): string {
  return address.kind === 'entity'
    ? JSON.stringify([address.kind, address.sceneId, address.entityId, address.channel, address.id])
    : JSON.stringify([address.kind, address.sceneId, address.channel, address.id])
}

function walkCommands(
  commands: readonly AuthorCommand[],
  path: string,
  visit: (command: AuthorCommand, path: string) => void,
): void {
  commands.forEach((command, index) => {
    const commandPath = `${path}[${index}]`
    visit(command, commandPath)
    switch (command.kind) {
      case 'branch':
        walkCommands(command.then, `${commandPath}.then`, visit)
        walkCommands(command.else ?? [], `${commandPath}.else`, visit)
        break
      case 'loop':
        walkCommands(command.body, `${commandPath}.body`, visit)
        break
      case 'startBattle':
        walkCommands(command.onLose ?? [], `${commandPath}.onLose`, visit)
        walkCommands(command.onFlee ?? [], `${commandPath}.onFlee`, visit)
        break
      case 'teleportOut':
        walkCommands(command.onFail ?? [], `${commandPath}.onFail`, visit)
        break
      case 'confirm':
        walkCommands(command.onNo, `${commandPath}.onNo`, visit)
        break
    }
  })
}

function walkFlow(
  flow: AuthorScriptFlow,
  path: string,
  visit: (command: AuthorCommand, path: string) => void,
): void {
  if (flow.kind === 'stages') {
    flow.stages.forEach((stage, index) => {
      walkCommands(stage.entry?.prepare ?? [], `${path}.stages[${index}].entry.prepare`, visit)
      walkCommands(stage.body, `${path}.stages[${index}].body`, visit)
    })
    return
  }
  for (const [stateId, state] of Object.entries(flow.machine.states)) {
    walkCommands(
      state.entry?.prepare ?? [],
      `${path}.machine.states.${stateId}.entry.prepare`,
      visit,
    )
    walkCommands(state.body, `${path}.machine.states.${stateId}.body`, visit)
  }
}

function selectionEdges(commands: readonly AuthorCommand[], path: string): SelectionEdge[] {
  const edges: SelectionEdge[] = []
  walkCommands(commands, path, (command, commandPath) => {
    if (command.kind === 'selectEntityBehavior' && command.selection.kind === 'use') {
      edges.push({
        target: keyOf({
          kind: 'entity',
          sceneId: command.target.scene,
          entityId: command.target.entity,
          channel: command.channel,
          id: command.selection.value,
        }),
        path: `${commandPath}.selection.value`,
      })
      return
    }
    if (command.kind !== 'selectSceneHooks') return
    for (const channel of ['onEnter', 'onTeleport'] as const) {
      const selection = command.selection[channel]
      if (selection?.kind !== 'use') continue
      edges.push({
        target: keyOf({
          kind: 'hook',
          sceneId: command.scene,
          channel,
          id: selection.value,
        }),
        path: `${commandPath}.selection.${channel}.value`,
      })
    }
  })
  return edges
}

function flowEdges(flow: AuthorScriptFlow, path: string): SelectionEdge[] {
  const edges: SelectionEdge[] = []
  walkFlow(flow, path, (command, commandPath) => {
    if (command.kind === 'selectEntityBehavior' && command.selection.kind === 'use') {
      edges.push({
        target: keyOf({
          kind: 'entity',
          sceneId: command.target.scene,
          entityId: command.target.entity,
          channel: command.channel,
          id: command.selection.value,
        }),
        path: `${commandPath}.selection.value`,
      })
      return
    }
    if (command.kind !== 'selectSceneHooks') return
    for (const channel of ['onEnter', 'onTeleport'] as const) {
      const selection = command.selection[channel]
      if (selection?.kind !== 'use') continue
      edges.push({
        target: keyOf({
          kind: 'hook',
          sceneId: command.scene,
          channel,
          id: selection.value,
        }),
        path: `${commandPath}.selection.${channel}.value`,
      })
    }
  })
  return edges
}

function isCanonicalTopLabel(label: string, itemNames: readonly string[]): boolean {
  return itemNames.some((name) => {
    const base = `${name}剧情方案`
    if (label === base) return true
    if (!label.startsWith(`${base} `)) return false
    const suffix = label.slice(base.length + 1)
    return /^[2-9][0-9]*$/.test(suffix)
  })
}

function isCandidate(node: SchemeNode, itemNames: readonly string[]): boolean {
  if (OPAQUE_ITEM_SCHEME_LABEL.test(node.label) || isCanonicalTopLabel(node.label, itemNames))
    return true
  if (node.flow.kind !== 'stateMachine') return false
  const machineLabel = node.flow.machine.label
  if (OPAQUE_ITEM_SCHEME_LABEL.test(machineLabel)) return true
  return (
    machineLabel.endsWith('连续流程') &&
    isCanonicalTopLabel(machineLabel.slice(0, -'连续流程'.length), itemNames)
  )
}

function collectNodes(scenes: readonly AuthorSceneDef[]): Map<string, SchemeNode> {
  const nodes = new Map<string, SchemeNode>()
  const add = (node: Omit<SchemeNode, 'key' | 'edges'>): void => {
    const key = keyOf(node.address)
    if (nodes.has(key)) throw new Error(`PAL 物品剧情方案节点重复: ${node.path}`)
    nodes.set(key, { ...node, key, edges: flowEdges(node.flow, `${node.path}.flow`) })
  }
  for (const scene of scenes) {
    for (const entity of scene.entities) {
      for (const channel of ['trigger', 'auto'] as const) {
        for (const [id, behavior] of Object.entries(entity.behaviors?.[channel] ?? {})) {
          const address = {
            kind: 'entity' as const,
            sceneId: scene.id,
            entityId: entity.id,
            channel,
            id,
          }
          add({
            address,
            id,
            label: behavior.label,
            order: behavior.order,
            flow: behavior.flow,
            path: `scenes.${scene.id}.entities.${entity.id}.behaviors.${channel}.${id}`,
          })
        }
      }
    }
    for (const channel of ['onEnter', 'onTeleport'] as const) {
      for (const [id, hook] of Object.entries(scene.hooks?.[channel]?.variants ?? {})) {
        const address = { kind: 'hook' as const, sceneId: scene.id, channel, id }
        add({
          address,
          id,
          label: hook.label,
          order: hook.order,
          flow: hook.flow,
          path: `scenes.${scene.id}.hooks.${channel}.variants.${id}`,
        })
      }
    }
  }
  return nodes
}

/**
 * PAL current-only invariant 的纯推导核。它只读取作者树并给出确定性期望，不修改内容；
 * 一次性 canonical rewrite 完成后，生产路径只调用下方断言。
 */
function derivePalItemSchemeLabelPlan(args: PalItemSchemeLabelArgs): {
  entries: PalItemSchemeLabelPlanEntry[]
  opaqueLabels: number
} {
  const nodes = collectNodes(args.scenes)
  const rootsByNode = new Map<string, Set<string>>()
  const reachable = new Set<string>()
  const itemsById = new Map(args.items.map((item) => [item.id, item]))
  const itemOrder = new Map(args.items.map((item, index) => [item.id, index]))
  const itemNames = args.items.map((item) => item.name)

  const visitRoot = (
    itemId: string,
    edge: SelectionEdge,
    visiting: Set<string>,
    stack: string[],
    done: Set<string>,
  ): void => {
    const node = nodes.get(edge.target)
    if (!node) throw new Error(`PAL 物品剧情方案悬空引用: ${edge.path} -> ${edge.target}`)
    const roots = rootsByNode.get(node.key) ?? new Set<string>()
    roots.add(itemId)
    rootsByNode.set(node.key, roots)
    reachable.add(node.key)
    if (visiting.has(node.key))
      throw new Error(`PAL 物品剧情方案选择图成环: ${[...stack, node.path].join(' -> ')}`)
    if (done.has(node.key)) return
    visiting.add(node.key)
    stack.push(node.path)
    for (const child of node.edges) visitRoot(itemId, child, visiting, stack, done)
    stack.pop()
    visiting.delete(node.key)
    done.add(node.key)
  }

  for (const item of args.items) {
    const done = new Set<string>()
    for (const [effectIndex, effect] of (item.use?.effects ?? []).entries()) {
      if (effect.kind !== 'itemPrivateScript') continue
      const path = `items.${item.id}.use.effects[${effectIndex}].script.body`
      for (const edge of selectionEdges(effect.script.body, path))
        visitRoot(item.id, edge, new Set(), [], done)
    }
  }

  const candidates = new Set(reachable)
  for (const node of nodes.values()) if (isCandidate(node, itemNames)) candidates.add(node.key)

  const grouped = new Map<string, SchemeNode[]>()
  for (const key of candidates) {
    const node = nodes.get(key)!
    const roots = rootsByNode.get(key) ?? new Set<string>()
    if (roots.size === 0) throw new Error(`PAL 物品剧情方案零 item root: ${node.path}`)
    if (roots.size > 1)
      throw new Error(
        `PAL 物品剧情方案多个 item root: ${node.path} -> ${[...roots].sort().join(', ')}`,
      )
    const itemId = [...roots][0]!
    const group = grouped.get(itemId) ?? []
    group.push(node)
    grouped.set(itemId, group)
  }

  if (candidates.size !== args.expectedSchemes)
    throw new Error(`PAL 物品剧情方案数量漂移: ${candidates.size} != ${args.expectedSchemes}`)
  if (args.expectedItemRoots !== undefined && grouped.size !== args.expectedItemRoots)
    throw new Error(
      `PAL 物品剧情方案 item root 数漂移: ${grouped.size} != ${args.expectedItemRoots}`,
    )

  const entries: PalItemSchemeLabelPlanEntry[] = []
  for (const [itemId, group] of [...grouped].sort(
    ([left], [right]) => itemOrder.get(left)! - itemOrder.get(right)!,
  )) {
    const item = itemsById.get(itemId)
    if (!item) throw new Error(`PAL 物品剧情方案缺 item root ${itemId}`)
    group.sort((left, right) => left.order - right.order || left.id.localeCompare(right.id))
    for (let index = 1; index < group.length; index++) {
      const previous = group[index - 1]!
      const current = group[index]!
      if (previous.order === current.order && previous.id === current.id)
        throw new Error(`PAL 物品剧情方案 order + id 不唯一: ${previous.path} / ${current.path}`)
    }
    group.forEach((node, index) => {
      const expectedLabel = `${item.name}剧情方案${index === 0 ? '' : ` ${index + 1}`}`
      const machineLabel = node.flow.kind === 'stateMachine' ? node.flow.machine.label : undefined
      entries.push({
        address: node.address,
        id: node.id,
        itemId,
        path: node.path,
        currentLabel: node.label,
        expectedLabel,
        ...(machineLabel === undefined
          ? {}
          : {
              currentMachineLabel: machineLabel,
              expectedMachineLabel: `${expectedLabel}连续流程`,
            }),
      })
    })
  }

  const machineInners = entries.filter((entry) => entry.currentMachineLabel !== undefined).length
  if (machineInners !== args.expectedMachineInners)
    throw new Error(
      `PAL 物品剧情方案 machine-inner 数漂移: ${machineInners} != ${args.expectedMachineInners}`,
    )
  const opaqueLabels = [...nodes.values()].reduce(
    (count, node) =>
      count +
      Number(OPAQUE_ITEM_SCHEME_LABEL.test(node.label)) +
      Number(
        node.flow.kind === 'stateMachine' && OPAQUE_ITEM_SCHEME_LABEL.test(node.flow.machine.label),
      ),
    0,
  )
  return { entries, opaqueLabels }
}

/** PAL current publication 永久门禁：唯一 root、确定性作者名、machine-inner 同步且无摘要名。 */
export function assertPalItemSchemeLabelInvariant(
  args: PalItemSchemeLabelArgs,
): PalItemSchemeLabelReport {
  const { entries, opaqueLabels } = derivePalItemSchemeLabelPlan(args)
  if (opaqueLabels) throw new Error(`PAL 物品剧情方案仍含 ${opaqueLabels} 个 opaque label`)
  for (const entry of entries) {
    if (entry.currentLabel !== entry.expectedLabel)
      throw new Error(
        `PAL 物品剧情方案名称漂移: ${entry.path}.label = ${JSON.stringify(entry.currentLabel)}，期望 ${JSON.stringify(entry.expectedLabel)}`,
      )
    if (entry.currentMachineLabel !== entry.expectedMachineLabel)
      throw new Error(
        `PAL 物品剧情方案 machine-inner 未与父名同步: ${entry.path}.flow.machine.label = ${JSON.stringify(entry.currentMachineLabel)}，期望 ${JSON.stringify(entry.expectedMachineLabel)}`,
      )
  }
  return {
    schemes: entries.length,
    machineInners: entries.filter((entry) => entry.currentMachineLabel !== undefined).length,
    itemRoots: new Set(entries.map((entry) => entry.itemId)).size,
    opaqueLabels,
    labels: entries.map((entry) => ({
      id: entry.id,
      itemId: entry.itemId,
      path: entry.path,
      label: entry.currentLabel,
      ...(entry.currentMachineLabel === undefined
        ? {}
        : { machineLabel: entry.currentMachineLabel }),
    })),
  }
}
