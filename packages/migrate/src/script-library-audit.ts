import type { Command, SceneDef, ScriptChunkV1, ScriptIndexV1, ScriptRef } from '@type-pal/content'
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

function walkCommands(node: unknown, visit: (command: Command) => void): void {
  if (Array.isArray(node)) {
    for (const value of node) walkCommands(value, visit)
    return
  }
  if (!node || typeof node !== 'object') return
  const record = node as Record<string, unknown>
  if (typeof record.kind === 'string') visit(record as unknown as Command)
  for (const value of Object.values(record)) walkCommands(value, visit)
}

export function auditScriptLibrary(args: {
  sourceJson: unknown
  sourcePrettyBytes: number
  sourceCommandCount: number
  scenes: readonly SceneDef[]
  index: ScriptIndexV1
  chunks: Readonly<Record<string, ScriptChunkV1>>
  extraRoots?: ReadonlyArray<{ id: string; body: readonly Command[] }>
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
        entity.hostile?.onLose?.length
          ? [{ id: `scene/${scene.id}/hostile/${entity.id}/on-lose`, body: entity.hostile.onLose }]
          : [],
      ),
    ),
  ]
  for (const root of extraRoots) {
    const compact = bytes(JSON.stringify(root.body))
    normalizedBytes += compact
    prettyBytes += bytes(JSON.stringify(root.body, null, 2))
    commands += commandCount(root.body)
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
    walkCommands(chunk.scripts, (command) => {
      if (command.kind === 'callScript' || command.kind === 'jumpScript') checkRef(command.ref)
      if (
        (command.kind === 'setEntityAuto' ||
          command.kind === 'setEntityTrigger' ||
          command.kind === 'setSceneOnTeleport') &&
        command.stages?.length
      )
        issues.push(`${command.kind} 仍嵌 ${command.stages.length} 段`)
      if (
        (command.kind === 'setEntityAuto' ||
          command.kind === 'setEntityTrigger' ||
          command.kind === 'setSceneOnTeleport') &&
        command.script
      )
        checkRef(command.script)
    })
  }
  for (const root of extraRoots) {
    walkCommands(root.body, (command) => {
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
