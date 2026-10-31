import { createHash } from 'node:crypto'

/** Shared byte identity for snapshot and transaction IO, without content/formatting dependencies. */
export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}
