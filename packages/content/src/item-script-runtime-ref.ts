import type { ScriptRef } from './script-library.js'

const AUTHOR_ITEM_PRIVATE_SCRIPT_CHUNK = '__author-item-private-runtime'

/** Current in-memory identity only; author files still store an inline use body. */
export function runtimeItemPrivateScriptRef(itemId: string): ScriptRef {
  return { chunk: AUTHOR_ITEM_PRIVATE_SCRIPT_CHUNK, id: itemId }
}

/** Classify by explicit provenance, never by a user-defined script/owner ID prefix. */
export function isRuntimeItemPrivateScriptRef(ref: Pick<ScriptRef, 'chunk'>): boolean {
  return ref.chunk === AUTHOR_ITEM_PRIVATE_SCRIPT_CHUNK
}
