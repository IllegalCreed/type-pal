import type { GameState } from '../game-state.js'

/** V1 uses native JSON.stringify: methods disappear, Maps become objects and byte arrays
 * become numeric-keyed objects. This describes stored data, not hydrated engine state.
 */
type JsonData<T> = T extends (...args: never[]) => unknown
  ? never
  : T extends Map<number, infer V>
    ? Record<string, JsonData<V>>
    : T extends Uint8Array
      ? Record<string, number>
      : T extends readonly unknown[]
        ? { [K in keyof T]: JsonData<T[K]> }
        : T extends object
          ? {
              [K in keyof T as T[K] extends (...args: never[]) => unknown ? never : K]: JsonData<
                T[K]
              >
            }
          : T

/** The first V1 writer predates nowMs. Parsing must preserve that absence; the loader
 * owns runtime restoration. This type alone does not validate an imported value.
 */
export type SaveDataV1 = Omit<JsonData<GameState>, 'nowMs'> & { nowMs?: number }

/** Slots receive both live snapshots and imported V1 data. Consumers must not assume
 * a loaded snapshot has runtime methods or a current frame timestamp.
 */
export type SaveSnapshot = GameState | SaveDataV1
