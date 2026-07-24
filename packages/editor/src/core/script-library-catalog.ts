import { type ScriptChunkV1, type SharedScriptMetaV1, visitScriptRefs } from '@type-pal/content'

export interface InternalScriptCatalogEntry {
  id: string
  title: string
  scope: 'item' | 'scene'
  sourceAddress?: number
  callers: string[]
}

function internalScriptFacts(
  id: string,
): Pick<InternalScriptCatalogEntry, 'scope' | 'sourceAddress' | 'title'> {
  const address = /\/L-(\d+)(?:\/|$)/.exec(id)?.[1]
  const sourceAddress = address === undefined ? undefined : Number(address)
  const scope = id.includes('/global/items/') ? 'item' : 'scene'
  const prefix = scope === 'item' ? '物品迁移块' : '场景迁移块'
  return {
    scope,
    ...(sourceAddress === undefined ? {} : { sourceAddress }),
    title: sourceAddress === undefined ? prefix : `${prefix} L_${sourceAddress}`,
  }
}

export function scriptCallerLabel(
  id: string,
  library: Readonly<Record<string, SharedScriptMetaV1>>,
): string {
  const authored = library[id]
  if (authored) return authored.name
  if (id.startsWith('shared/')) return internalScriptFacts(id).title
  const scene = /^scene\/([^/]+)/.exec(id)?.[1]
  return scene ? `场景 ${scene}` : id
}

/** 作者目录之外的 shared/* 都是迁移器生成的控制流块，不是一等作者共享脚本。 */
export function buildInternalScriptCatalog(
  scriptChunks: Readonly<Record<string, ScriptChunkV1>>,
  library: Readonly<Record<string, SharedScriptMetaV1>>,
): InternalScriptCatalogEntry[] {
  const bodies: Array<{ id: string; body: ScriptChunkV1['scripts'][string] }> = []
  for (const chunk of Object.values(scriptChunks))
    for (const [id, body] of Object.entries(chunk.scripts)) bodies.push({ id, body })

  const callersByTarget = new Map<string, Set<string>>()
  for (const { id: caller, body } of bodies)
    visitScriptRefs(body, (ref) => {
      const callers = callersByTarget.get(ref.id) ?? new Set<string>()
      callers.add(caller)
      callersByTarget.set(ref.id, callers)
    })

  return bodies
    .filter(({ id }) => id.startsWith('shared/') && !library[id])
    .map(({ id }) => {
      const facts = internalScriptFacts(id)
      return {
        id,
        ...facts,
        callers: [...(callersByTarget.get(id) ?? [])]
          .map((caller) => scriptCallerLabel(caller, library))
          .sort((left, right) => left.localeCompare(right, 'zh-CN')),
      }
    })
    .sort(
      (left, right) =>
        left.scope.localeCompare(right.scope) ||
        (left.sourceAddress ?? Number.MAX_SAFE_INTEGER) -
          (right.sourceAddress ?? Number.MAX_SAFE_INTEGER) ||
        left.id.localeCompare(right.id),
    )
}
