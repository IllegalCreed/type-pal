import type { MigrationJson } from './pal-migration.js'

type JsonPath = Array<string | number>

export interface PalLoadSceneTransitionDisposition {
  scenePath: string
  commandPath: string
  evidenceId: string
  status: 'applied' | 'already' | 'skipped'
  reason?: 'target-path-missing' | 'target-command-mismatch'
}

export interface PalLoadSceneTransitionResult {
  files: Map<string, MigrationJson>
  dispositions: PalLoadSceneTransitionDisposition[]
}

interface SourceCandidate {
  sourceFile: string
  scenePath: string
  path: JsonPath
  command: Record<string, unknown>
  parent: Array<Record<string, unknown>>
  index: number
  ownerEntity?: string
  hook?: string
  stageIndex?: number
  pageIndex?: number
}

interface CanonicalArray {
  path: JsonPath
  commands: Array<Record<string, unknown>>
  ownerEntity?: string
  hook?: string
  stageIndex?: number
  behaviorId?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function pathText(path: JsonPath): string {
  return path.map((part) => String(part).replaceAll('~', '~0').replaceAll('/', '~1')).join('/')
}

function atPath(root: unknown, path: JsonPath): unknown {
  let current = root
  for (const part of path) {
    if (typeof part === 'number') {
      if (!Array.isArray(current) || part < 0 || part >= current.length) return undefined
      current = current[part]
    } else {
      if (!isRecord(current) || !Object.hasOwn(current, part)) return undefined
      current = current[part]
    }
  }
  return current
}

function parseSourceOwner(path: JsonPath): Pick<SourceCandidate, 'ownerEntity' | 'hook' | 'stageIndex' | 'pageIndex'> {
  const text = path.map(String).join('/')
  const entity = /(?:^|\/)entity-(e\d+)(?:\/|$)/.exec(text) ?? /(?:^|\/)(e\d+)(?:\/|$)/.exec(text)
  const stage = /(?:^|\/)stage-(\d+)(?:\/|$)/.exec(text)
  const page = /(?:^|\/)page-(\d+)(?:\/|$)/.exec(text)
  const hookRaw = /(?:^|\/)(on-[a-z-]+)(?:\/|$)/.exec(text)?.[1]
  const hook = hookRaw
    ? hookRaw.replace(/-([a-z])/g, (_match, letter: string) => letter.toUpperCase())
    : undefined
  return {
    ...(entity?.[1] ? { ownerEntity: entity[1] } : {}),
    ...(hook ? { hook } : {}),
    ...(stage?.[1] ? { stageIndex: Number(stage[1]) } : {}),
    ...(page?.[1] ? { pageIndex: Number(page[1]) } : {}),
  }
}

function collectSourceLoadScenes(
  value: unknown,
  path: JsonPath,
  context: { sourceFile: string; scenePath: string },
  output: SourceCandidate[],
  parent?: Array<Record<string, unknown>>,
  index?: number,
): void {
  if (Array.isArray(value)) {
    const commands = value.every(isRecord) ? value : undefined
    value.forEach((entry, childIndex) =>
      collectSourceLoadScenes(entry, [...path, childIndex], context, output, commands, childIndex),
    )
    return
  }
  if (!isRecord(value)) return
  if (
    value.kind === 'loadScene' &&
    isRecord(value.transition) &&
    value.transition.kind === 'source' &&
    parent &&
    index !== undefined
  ) {
    output.push({
      sourceFile: context.sourceFile,
      scenePath: context.scenePath,
      path,
      command: value,
      parent,
      index,
      ...parseSourceOwner(path),
    })
  }
  for (const [key, child] of Object.entries(value))
    collectSourceLoadScenes(child, [...path, key], context, output)
}

function commandSignature(command: Record<string, unknown>): string {
  const cue = isRecord(command.cue) ? command.cue : undefined
  const rows = cue && Array.isArray(cue.rows)
    ? cue.rows
        .map((row) => (isRecord(row) && typeof row.text === 'string' ? row.text : ''))
        .join('|')
    : ''
  // transition/evidence is intentionally excluded: it is the field being projected.
  return JSON.stringify({
    kind: command.kind,
    scene: command.scene,
    entryId: command.entryId,
    pos: command.pos,
    facing: command.facing,
    dir: command.dir,
    ms: command.ms,
    itemId: command.itemId,
    entity: command.entity,
    state: command.state,
    rows,
  })
}

function collectCanonicalArrays(
  value: unknown,
  path: JsonPath,
  owner: { entity?: string; hook?: string; stage?: number; behaviorId?: string },
  output: CanonicalArray[],
): void {
  if (Array.isArray(value)) {
    if (value.length && value.every(isRecord) && value.some((entry) => typeof entry.kind === 'string'))
      output.push({
        path,
        commands: value,
        ...(owner.entity ? { ownerEntity: owner.entity } : {}),
        ...(owner.hook ? { hook: owner.hook } : {}),
        ...(owner.stage !== undefined ? { stageIndex: owner.stage } : {}),
        ...(owner.behaviorId ? { behaviorId: owner.behaviorId } : {}),
      })
    value.forEach((entry, index) => collectCanonicalArrays(entry, [...path, index], owner, output))
    return
  }
  if (!isRecord(value)) return
  const next = { ...owner }
  const entityMatch = /^e\d+$/.test(String(value.id)) ? String(value.id) : undefined
  if (entityMatch && path[0] === 'entities') next.entity = entityMatch
  const behaviorIndex = path.indexOf('behaviors')
  if (behaviorIndex >= 0 && path[behaviorIndex + 2] !== undefined)
    next.behaviorId = String(path[behaviorIndex + 2])
  const hookMatch = /^(onEnter|onTeleport)$/.test(String(path.at(-1)))
    ? String(path.at(-1))
    : undefined
  if (hookMatch) next.hook = hookMatch
  if (/^\d+$/.test(String(path.at(-1))) && String(path.at(-2)) === 'stages')
    next.stage = Number(path.at(-1))
  for (const [key, child] of Object.entries(value))
    collectCanonicalArrays(child, [...path, key], next, output)
}

function isSubsequence(source: string[], target: string[], sourceIndex: number, targetIndex: number): boolean {
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= target.length) return false
  if (source[sourceIndex] !== target[targetIndex]) return false
  let left = sourceIndex - 1
  let right = targetIndex - 1
  while (left >= 0) {
    while (right >= 0 && target[right] !== source[left]) right--
    if (right < 0) return false
    left--
    right--
  }
  left = sourceIndex + 1
  right = targetIndex + 1
  while (left < source.length) {
    while (right < target.length && target[right] !== source[left]) right++
    if (right >= target.length) return false
    left++
    right++
  }
  return true
}

function locateCanonicalTarget(
  input: ReadonlyMap<string, MigrationJson>,
  candidate: SourceCandidate,
): { path: JsonPath; command: Record<string, unknown> } | undefined {
  const scene = input.get(candidate.scenePath)
  if (scene === undefined) return undefined
  const sourceSignature = candidate.parent.map(commandSignature)
  const targetSignature = commandSignature(candidate.command)
  const arrays: CanonicalArray[] = []
  collectCanonicalArrays(scene, [], {}, arrays)
  const scoped = arrays.filter((entry) =>
    candidate.ownerEntity
      ? entry.ownerEntity === candidate.ownerEntity
      : candidate.hook
        ? entry.hook === candidate.hook
        : true,
  )
  const pageScoped = candidate.pageIndex === undefined
    ? scoped
    : scoped.filter((entry) => entry.behaviorId === 'default')
  const candidates = pageScoped.length ? pageScoped : scoped
  const matches = candidates.flatMap((entry) =>
    entry.commands.flatMap((command, index) =>
      commandSignature(command) === targetSignature &&
      (candidate.stageIndex === undefined || entry.stageIndex === undefined || entry.stageIndex === candidate.stageIndex) &&
      isSubsequence(sourceSignature, entry.commands.map(commandSignature), candidate.index, index)
        ? [{ entry, index, command }]
        : [],
    ),
  )
  const unique = matches.length === 1
    ? matches
    : candidates.flatMap((entry) =>
        entry.commands.flatMap((command, index) =>
          commandSignature(command) === targetSignature &&
          (candidate.stageIndex === undefined || entry.stageIndex === undefined || entry.stageIndex === candidate.stageIndex)
            ? [{ entry, index, command }]
            : [],
      ),
      )
  if (unique.length === 1) {
    const match = unique[0]!
    return { path: [...match.entry.path, match.index], command: match.command }
  }
  // A source one-command alias may be registered both from a root page and from
  // its legacy L_xxx owner. If exact sequence evidence is unavailable, choose the
  // unique closest-length canonical body; ties remain fail-closed.
  const targetMatches = candidates.flatMap((entry) =>
    entry.commands.flatMap((command, index) =>
      commandSignature(command) === targetSignature &&
      (candidate.stageIndex === undefined || entry.stageIndex === undefined || entry.stageIndex === candidate.stageIndex)
        ? [{ entry, index, command }]
        : [],
    ),
  )
  if (targetMatches.length) {
    const distances = targetMatches.map((match) =>
      Math.abs(match.entry.commands.length - candidate.parent.length),
    )
    const best = Math.min(...distances)
    const closest = targetMatches.filter((_, index) => distances[index] === best)
    if (closest.length === 1) {
      const match = closest[0]!
      return { path: [...match.entry.path, match.index], command: match.command }
    }
    if (candidate.parent.length === 1 && targetMatches.every((match) =>
      sameLoadSceneTarget(match.command, targetMatches[0]!.command),
    )) {
      const match = targetMatches[0]!
      return { path: [...match.entry.path, match.index], command: match.command }
    }
  }
  const sceneMatches = candidates.flatMap((entry) =>
    entry.commands.flatMap((command, index) =>
      command.kind === 'loadScene' && command.scene === candidate.command.scene &&
      (candidate.stageIndex === undefined || entry.stageIndex === undefined || entry.stageIndex === candidate.stageIndex)
        ? [{ entry, index, command }]
        : [],
    ),
  )
  const scenePool = sceneMatches.length ? sceneMatches : arrays.flatMap((entry) =>
    entry.commands.flatMap((command, index) =>
      command.kind === 'loadScene' && command.scene === candidate.command.scene
        ? [{ entry, index, command }]
        : [],
    ),
  )
  if (scenePool.length) {
    const distances = scenePool.map((match) =>
      Math.abs(match.entry.commands.length - candidate.parent.length),
    )
    const best = Math.min(...distances)
    const closest = scenePool.filter((_, index) => distances[index] === best)
    if (closest.length === 1) {
      const match = closest[0]!
      return { path: [...match.entry.path, match.index], command: match.command }
    }
  }
  return undefined
}

function sameLoadSceneTarget(left: Record<string, unknown>, right: Record<string, unknown>): boolean {
  const key = (value: Record<string, unknown>) =>
    JSON.stringify({
      kind: value.kind,
      scene: value.scene,
      entryId: value.entryId,
      pos: value.pos,
      facing: value.facing,
    })
  return key(left) === key(right)
}

function sourceScenePath(sourceFile: string): string | undefined {
  const match = /^content\/scripts\/chunks\/scene\/(s\d+)\.json$/.exec(sourceFile)
  return match?.[1] ? `content/scenes/${match[1]}.json` : undefined
}

/**
 * R13-6A 将 source script chunk 内联为 canonical scene flow；因此这里不能把源 chunk
 * 的物理 JSON path 当成目标 path。每个 profile 必须同时通过 owner、stage、命令序列
 * 和 loadScene 目标四重证据映射到唯一 canonical 命令，否则保守 skipped。
 */
export function applyPalR13SixBLoadSceneTransitions(
  input: ReadonlyMap<string, MigrationJson>,
  raw: ReadonlyMap<string, MigrationJson>,
): PalLoadSceneTransitionResult {
  const files = new Map(input)
  const dispositions: PalLoadSceneTransitionDisposition[] = []
  const sourceFiles = [...raw].sort(([left], [right]) => left.localeCompare(right))
  for (const [sourceFile, sourceValue] of sourceFiles) {
    const scenePath = /^content\/scenes\/[^/]+\.json$/.test(sourceFile)
      ? sourceFile
      : sourceScenePath(sourceFile)
    if (!scenePath) continue
    const candidates: SourceCandidate[] = []
    collectSourceLoadScenes(
      sourceValue,
      [],
      { sourceFile, scenePath },
      candidates,
    )
    for (const candidate of candidates) {
      const transition = candidate.command.transition as Record<string, unknown>
      const evidenceId = String(transition.evidenceId)
      const directTarget = /^content\/scenes\/[^/]+\.json$/.test(sourceFile)
        ? atPath(files.get(scenePath), candidate.path)
        : undefined
      const located = isRecord(directTarget)
        ? { path: candidate.path, command: directTarget }
        : locateCanonicalTarget(files, candidate)
      const common = {
        scenePath,
        commandPath: located ? pathText(located.path) : pathText(candidate.path),
        evidenceId,
      }
      if (!located) {
        dispositions.push({ ...common, status: 'skipped', reason: 'target-path-missing' })
        continue
      }
      const target = located.command
      const exactTarget = sameLoadSceneTarget(candidate.command, target)
      const sourceChunk = sourceFile.startsWith('content/scripts/chunks/scene/')
      const looseTarget = sourceChunk &&
        target.kind === 'loadScene' &&
        target.scene === candidate.command.scene
      if (!exactTarget && !looseTarget) {
        dispositions.push({ ...common, status: 'skipped', reason: 'target-command-mismatch' })
        continue
      }
      if (target.transition !== undefined) {
        if (JSON.stringify(target.transition) !== JSON.stringify(transition))
          throw new Error(`${scenePath}/${pathText(located.path)}: 已有 loadScene transition 与源证据冲突`)
        dispositions.push({ ...common, status: 'already' })
        continue
      }
      const source = files.get(scenePath)
      if (source === undefined) {
        dispositions.push({ ...common, status: 'skipped', reason: 'target-path-missing' })
        continue
      }
      const writable = structuredClone(source)
      const writableTarget = atPath(writable, located.path)
      if (!isRecord(writableTarget))
        throw new Error(`${scenePath}/${pathText(located.path)}: clone 后 loadScene path 漂移`)
      writableTarget.transition = structuredClone(transition)
      files.set(scenePath, writable)
      dispositions.push({ ...common, status: 'applied' })
    }
  }
  if (!dispositions.some((entry) => entry.status !== 'skipped'))
    throw new Error('R13-6B loadScene source profile 未命中任何已发布 canonical 站点')
  return { files, dispositions }
}
