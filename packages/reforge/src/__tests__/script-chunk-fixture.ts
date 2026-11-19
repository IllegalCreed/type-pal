import { checkScriptLibrary, type ScriptChunkV1, type ScriptIndexV1 } from '@type-pal/content'

export function scriptChunkFixture(
  chunks: Record<string, ScriptChunkV1>,
  shards: ScriptIndexV1['shards'] = { shared: 1, global: {} },
  library?: ScriptIndexV1['library'],
) {
  const index: ScriptIndexV1 = {
    version: 1,
    shards,
    ...(library ? { library } : {}),
    chunks: Object.fromEntries(
      Object.entries(chunks).map(([id, chunk]) => [
        id,
        {
          path: `chunks/${id}.json`,
          bytes: new TextEncoder().encode(JSON.stringify(chunk)).byteLength,
        },
      ]),
    ),
  }
  checkScriptLibrary(index, chunks)
  return { index, chunks }
}

export function sceneScriptPair() {
  const firstId = 'scene/s001/on-enter/0'
  const secondId = 'scene/s002/on-enter/0'
  const fixture = scriptChunkFixture({
    'scene/s001': {
      version: 1,
      id: 'scene/s001',
      scripts: { [firstId]: [{ kind: 'wait', ms: 1 }] },
    },
    'scene/s002': {
      version: 1,
      id: 'scene/s002',
      scripts: { [secondId]: [{ kind: 'wait', ms: 2 }] },
    },
  })
  return { ...fixture, firstId, secondId }
}
