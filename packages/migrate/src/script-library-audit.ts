import type {
  BattleChoreographyAction,
  Command,
  EnemyDef,
  EnemyHookFlow,
  EnemyOnDefeatedCommandV10,
  SceneDef,
  ScriptChunkV1,
  ScriptIndexV1,
  ScriptRef,
  ScriptStage,
} from '@type-pal/content'
import { checkScriptIndex, deriveScriptChunk } from '@type-pal/content'

export interface ScriptSizeAudit {
  source: { normalizedBytes: number; prettyBytes: number; commands: number }
  migrated: { normalizedBytes: number; prettyBytes: number; commands: number }
  authored: { normalizedBytes: number; prettyBytes: number; commands: number }
  ratios: { normalized: number; pretty: number; commands: number }
  largestChunks: Array<{ id: string; bytes: number }>
  largestRoots: Array<{ id: string; bytes: number }>
  maxDependencyClosureBytes: number
  issues: string[]
}

const bytes = (value: string): number => new TextEncoder().encode(value).byteLength

function commandCount(node: unknown): number {
  if (Array.isArray(node)) return node.reduce((sum, value) => sum + commandCount(value), 0)
  if (!node || typeof node !== 'object') return 0
  const record = node as Record<string, unknown>
  let count = typeof record.kind === 'string' ? 1 : 0
  for (const value of Object.values(record)) count += commandCount(value)
  return count
}

export type ScriptAuditRoot =
  | { domain: 'world-command'; id: string; body: readonly Command[] }
  | { domain: 'battle-choreography'; id: string; body: readonly BattleChoreographyAction[] }
  | { domain: 'enemy-on-defeated'; id: string; body: readonly EnemyOnDefeatedCommandV10[] }
  | { domain: 'enemy-hook'; id: string; flow: EnemyHookFlow }

export function worldCommandAuditRoots(
  roots: ReadonlyArray<{ id: string; body: readonly Command[] }>,
): ScriptAuditRoot[] {
  return roots.map((root) => ({ domain: 'world-command', ...root }))
}

export function enemyScriptAuditRoots(enemies: readonly EnemyDef[]): ScriptAuditRoot[] {
  return enemies.flatMap((enemy) => [
    ...(enemy.choreography ?? []).map(
      (hook, index): ScriptAuditRoot => ({
        domain: 'battle-choreography',
        id: `global/enemies/${enemy.id}/choreography-${index}`,
        body: hook.body,
      }),
    ),
    ...(enemy.onDefeated?.length
      ? [
          {
            domain: 'enemy-on-defeated' as const,
            id: `global/enemies/${enemy.id}/on-defeated`,
            body: enemy.onDefeated,
          },
        ]
      : []),
    ...(['ready', 'turnStart'] as const).flatMap((channel): ScriptAuditRoot[] => {
      const flow = enemy.ai.hooks?.[channel]
      return flow
        ? [
            {
              domain: 'enemy-hook',
              id: `global/enemies/${enemy.id}/hook-${channel}`,
              flow,
            },
          ]
        : []
    }),
  ])
}

function walkWorldStages(stages: readonly ScriptStage[], visit: (command: Command) => void): void {
  for (const stage of stages) {
    if (stage.entry) walkWorldCommands(stage.entry.prepare, visit)
    walkWorldCommands(stage.body, visit)
  }
}

/** 只沿世界 Command 明确定义的嵌套体递归；battle context 绝不冒充 Command。 */
function walkWorldCommands(commands: readonly Command[], visit: (command: Command) => void): void {
  for (const command of commands) {
    visit(command)
    switch (command.kind) {
      case 'branch':
        walkWorldCommands(command.then, visit)
        if (command.else) walkWorldCommands(command.else, visit)
        break
      case 'startBattle':
        if (command.onLose) walkWorldCommands(command.onLose, visit)
        if (command.onFlee) walkWorldCommands(command.onFlee, visit)
        break
      case 'teleportOut':
        if (command.onFail) walkWorldCommands(command.onFail, visit)
        break
      case 'confirm':
        walkWorldCommands(command.onNo, visit)
        break
      case 'setEntityAuto':
      case 'setEntityTrigger':
      case 'setSceneOnEnter':
      case 'setSceneOnTeleport':
        if (command.stages) walkWorldStages(command.stages, visit)
        break
    }
  }
}

function rootNode(root: ScriptAuditRoot): unknown {
  return root.domain === 'enemy-hook' ? root.flow : root.body
}

export function auditScriptLibrary(args: {
  sourceJson: unknown
  sourcePrettyBytes: number
  sourceCommandCount: number
  scenes: readonly SceneDef[]
  index: ScriptIndexV1
  chunks: Readonly<Record<string, ScriptChunkV1>>
  extraRoots?: readonly ScriptAuditRoot[]
}): ScriptSizeAudit {
  const { sourceJson, sourcePrettyBytes, sourceCommandCount, scenes, index, chunks } = args
  checkScriptIndex(index)
  const issues: string[] = []
  const allScripts = new Map<string, { chunk: string; body: Command[] }>()
  const largestChunks: Array<{ id: string; bytes: number }> = []
  const largestRoots: Array<{ id: string; bytes: number }> = []
  let normalizedBytes = 0
  let prettyBytes = 0
  let commands = 0
  let authoredNormalizedBytes = 0
  let authoredPrettyBytes = 0
  let authoredCommands = 0

  for (const [chunkId, chunk] of Object.entries(chunks)) {
    const chunkBytes = bytes(JSON.stringify(chunk))
    largestChunks.push({ id: chunkId, bytes: chunkBytes })
    if (chunkBytes >= 1024 * 1024) issues.push(`chunk ${chunkId} ${chunkBytes}B >= 1MiB`)
    if (!index.chunks[chunkId]) issues.push(`chunk ${chunkId} 不在 index`)
    for (const [id, body] of Object.entries(chunk.scripts)) {
      if (allScripts.has(id)) issues.push(`脚本 id 重复 ${id}`)
      allScripts.set(id, { chunk: chunkId, body })
      const compact = bytes(JSON.stringify(body))
      const pretty = bytes(JSON.stringify(body, null, 2))
      const count = commandCount(body)
      if (index.library?.[id]) {
        authoredNormalizedBytes += compact
        authoredPrettyBytes += pretty
        authoredCommands += count
      } else {
        normalizedBytes += compact
        prettyBytes += pretty
        commands += count
      }
      largestRoots.push({ id, bytes: compact })
      if (compact >= 1024 * 1024) issues.push(`脚本根 ${id} ${compact}B >= 1MiB`)
    }
  }
  for (const id of Object.keys(index.chunks))
    if (!chunks[id]) issues.push(`index chunk 缺文件 ${id}`)

  const extraRoots = [
    ...(args.extraRoots ?? []),
    ...scenes.flatMap((scene) =>
      scene.entities.flatMap((entity) =>
        Array.isArray(entity.hostile?.onLose) && entity.hostile.onLose.length
          ? [
              {
                domain: 'world-command' as const,
                id: `scene/${scene.id}/hostile/${entity.id}/on-lose`,
                body: entity.hostile.onLose,
              },
            ]
          : [],
      ),
    ),
  ]
  for (const root of extraRoots) {
    const node = rootNode(root)
    const compact = bytes(JSON.stringify(node))
    normalizedBytes += compact
    prettyBytes += bytes(JSON.stringify(node, null, 2))
    commands += commandCount(node)
    largestRoots.push({ id: root.id, bytes: compact })
    if (compact >= 1024 * 1024) issues.push(`脚本根 ${root.id} ${compact}B >= 1MiB`)
  }

  const checkRef = (ref: ScriptRef): void => {
    const direct = chunks[ref.chunk]?.scripts[ref.id]
    const derived = deriveScriptChunk(ref.id, index.shards)
    const fallback = derived ? chunks[derived]?.scripts[ref.id] : undefined
    if (!direct && !fallback)
      issues.push(`孤儿 ref ${ref.chunk}:${ref.id}(derived=${derived ?? 'none'})`)
  }
  for (const chunk of Object.values(chunks)) {
    for (const body of Object.values(chunk.scripts))
      walkWorldCommands(body, (command) => {
        if (command.kind === 'callScript' || command.kind === 'jumpScript') checkRef(command.ref)
        if (
          command.kind === 'setEntityAuto' ||
          command.kind === 'setEntityTrigger' ||
          command.kind === 'setSceneOnEnter' ||
          command.kind === 'setSceneOnTeleport'
        ) {
          if (command.script) checkRef(command.script)
          for (const stage of command.stages ?? [])
            if (stage.body.length !== 1 || stage.body[0]?.kind !== 'callScript')
              issues.push(`${command.kind} 仍内联命令体`)
        }
      })
  }
  for (const root of extraRoots) {
    if (root.domain !== 'world-command') continue
    walkWorldCommands(root.body, (command) => {
      if (command.kind === 'callScript' || command.kind === 'jumpScript') checkRef(command.ref)
    })
  }

  for (const scene of scenes) {
    const sceneBytes = bytes(JSON.stringify(scene, null, 2))
    if (sceneBytes >= 10 * 1024 * 1024) issues.push(`scene ${scene.id} ${sceneBytes}B >= 10MiB`)
    const stageLists = [
      scene.onEnter,
      scene.onTeleport,
      ...scene.entities.flatMap((entity) =>
        (entity.pages ?? []).flatMap((page) => [page.trigger?.stages, page.auto?.stages]),
      ),
    ]
    for (const stages of stageLists) {
      for (const stage of stages ?? []) {
        if (stage.body.length !== 1 || stage.body[0]?.kind !== 'callScript')
          issues.push(`scene ${scene.id} 的迁移 stage 未缩为单一 callScript`)
        else checkRef(stage.body[0].ref)
      }
    }
  }

  const closureBytes = (start: string): number => {
    const seen = new Set<string>()
    const queue = [start]
    let total = 0
    while (queue.length) {
      const id = queue.pop()
      if (!id) continue
      if (seen.has(id)) continue
      seen.add(id)
      const chunk = chunks[id]
      if (!chunk) continue
      total += bytes(JSON.stringify(chunk))
      for (const dep of chunk.imports ?? []) queue.push(dep)
    }
    return total
  }
  const maxDependencyClosureBytes = Math.max(0, ...Object.keys(chunks).map(closureBytes))
  if (maxDependencyClosureBytes > 8 * 1024 * 1024)
    issues.push(`依赖闭包 ${maxDependencyClosureBytes}B > 8MiB`)

  const sourceNormalizedBytes = bytes(JSON.stringify(sourceJson))
  const ratios = {
    normalized: normalizedBytes / sourceNormalizedBytes,
    pretty: prettyBytes / sourcePrettyBytes,
    commands: commands / sourceCommandCount,
  }
  if (ratios.normalized > 10) issues.push(`normalizedRatio ${ratios.normalized.toFixed(2)} > 10`)
  if (ratios.pretty > 10) issues.push(`prettyRatio ${ratios.pretty.toFixed(2)} > 10`)
  if (ratios.commands > 10) issues.push(`nodeRatio ${ratios.commands.toFixed(2)} > 10`)

  return {
    source: {
      normalizedBytes: sourceNormalizedBytes,
      prettyBytes: sourcePrettyBytes,
      commands: sourceCommandCount,
    },
    migrated: { normalizedBytes, prettyBytes, commands },
    authored: {
      normalizedBytes: authoredNormalizedBytes,
      prettyBytes: authoredPrettyBytes,
      commands: authoredCommands,
    },
    ratios,
    largestChunks: largestChunks.sort((a, b) => b.bytes - a.bytes).slice(0, 20),
    largestRoots: largestRoots.sort((a, b) => b.bytes - a.bytes).slice(0, 20),
    maxDependencyClosureBytes,
    issues,
  }
}

export function assertScriptLibraryAudit(audit: ScriptSizeAudit): void {
  if (audit.issues.length) throw new Error(`脚本库门禁失败:\n${audit.issues.join('\n')}`)
}
