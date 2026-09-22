/** Current migration-only ScriptIndex/Chunk bridge, never editor/runtime persistence. */
import {
  type Command,
  checkScriptLibrary,
  deriveScriptChunk,
  normalizeScriptLibrary,
} from '@type-pal/content'

export const migratedId = 'shared/L_1/default'
export const authoredId = 'shared/user/large-a1b2c3d4'
export function auditLibrary() {
  const shards = { shared: 1, global: {} }
  const chunkId = deriveScriptChunk(authoredId, shards)!
  const bodies: Record<string, Command[]> = {
    [migratedId]: [{ kind: 'wait', ms: 1 }],
    [authoredId]: [
      { kind: 'wait', ms: 2 },
      { kind: 'wait', ms: 3 },
    ],
  }
  const { index, chunks } = normalizeScriptLibrary(
    {
      version: 1,
      shards,
      chunks: {},
      library: { [authoredId]: { name: '作者脚本', self: 'none' } },
    },
    { [chunkId]: { version: 1, id: chunkId, scripts: bodies } },
  )
  checkScriptLibrary(index, chunks)
  const sourceJson = { text: '仙剑', commands: [{ op: 'wait' }] }
  return {
    sourceJson,
    sourcePrettyBytes: new TextEncoder().encode(JSON.stringify(sourceJson, null, 2)).byteLength,
    sourceCommandCount: 1,
    scenes: [],
    index,
    chunks,
  }
}
