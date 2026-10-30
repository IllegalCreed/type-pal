/** Internal file writers; the caller owns the destination tree. Errors propagate unchanged. */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2))
}

export function writeBinary(path: string, data: Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, data)
}
