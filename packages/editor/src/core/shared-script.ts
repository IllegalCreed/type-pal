import {
  AUTHORED_SCRIPT_PREFIX,
  type Command,
  deriveScriptChunk,
  type ScriptIndexV1,
} from '@type-pal/content'

function slugify(name: string): string {
  const ascii = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return ascii || 'script'
}

/** 只在创建时调用；显示名后续变化不影响稳定 id。 */
export function createAuthoredScriptId(
  name: string,
  existing: Iterable<string>,
  entropy: string = crypto.randomUUID(),
): string {
  const used = new Set(existing)
  const suffix = entropy
    .replace(/[^a-f0-9]/gi, '')
    .toLowerCase()
    .slice(0, 8)
    .padEnd(8, '0')
  const base = `${AUTHORED_SCRIPT_PREFIX}${slugify(name)}-${suffix}`
  if (!used.has(base)) return base
  let serial = 2
  while (used.has(`${base}-${serial}`)) serial++
  return `${base}-${serial}`
}

/** 场景/作者编辑器共用的 callScript 构造，避免 UI 各自拼错 ref.chunk。 */
export function createAuthoredScriptCall(
  index: ScriptIndexV1,
  id: string,
  self?: string,
): Extract<Command, { kind: 'callScript' }> {
  if (!index.library?.[id]) throw new Error(`作者共享脚本不存在 ${id}`)
  const chunk = deriveScriptChunk(id, index.shards)
  if (!chunk) throw new Error(`无法推导共享脚本 chunk ${id}`)
  return { kind: 'callScript', ref: { chunk, id }, ...(self ? { self } : {}) }
}
