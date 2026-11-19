import type { Command, ScriptChunkV1, ScriptRef, SharedScriptSelf } from '@type-pal/content'
import type { EditorState } from '../edit-session.js'

const chunkId = 'shared/c00'

export function fixtureScriptRef(id: string): ScriptRef {
  return { chunk: chunkId, id }
}

/** A single in-memory chunk for the reference reader. The project was loaded separately. */
export function withFixtureScript(
  state: EditorState,
  id: string,
  body: Command[],
  self: SharedScriptSelf = 'none',
  name = id,
): EditorState {
  const chunk: ScriptChunkV1 = {
    version: 1,
    id: chunkId,
    scripts: { ...state.scriptChunks[chunkId]?.scripts, [id]: body },
  }
  return {
    ...state,
    scriptChunks: { [chunkId]: chunk },
    scriptIndex: {
      version: 1,
      shards: { shared: 1, global: {} },
      chunks: {
        [chunkId]: {
          path: 'chunks/shared/c00.json',
          bytes: new TextEncoder().encode(JSON.stringify(chunk)).byteLength,
        },
      },
      library: { ...state.scriptIndex?.library, [id]: { name, self } },
    },
  }
}
