import { readFileSync } from 'node:fs'

/** Read one archive as owned bytes; callers own paths, admission and failure handling. */
export function readBinary(file: string): Uint8Array {
  return new Uint8Array(readFileSync(file))
}
