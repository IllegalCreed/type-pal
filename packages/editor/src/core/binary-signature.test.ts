// @ts-nocheck -- Vitest-only source SHA; editor production bundle intentionally has no Node types.
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { binarySnapshotSignature, sha256Hex } from './binary-signature.js'

const SOURCE = fileURLToPath(new URL('./binary-signature.ts', import.meta.url))
const VIEW_COPY = 'bytes instanceof Uint8Array ? Uint8Array.from(bytes).buffer : bytes'

describe('binary-signature', () => {
  test('same-length payloads with different bytes cannot share a digest or snapshot id', async () => {
    const a = new Uint8Array([0x00, 0x01, 0x02, 0xff])
    const b = new Uint8Array([0x00, 0x01, 0x02, 0xfe])
    expect(a.byteLength).toBe(b.byteLength)
    const hashA = await sha256Hex(a)
    const hashB = await sha256Hex(b)
    expect(hashA).toMatch(/^[0-9a-f]{64}$/)
    expect(hashB).toMatch(/^[0-9a-f]{64}$/)
    expect(hashA).not.toBe(hashB)
    expect(await binarySnapshotSignature(a.buffer)).toBe(`bin:${a.byteLength}:${hashA}`)
    expect(await binarySnapshotSignature(b.buffer)).not.toBe(
      await binarySnapshotSignature(a.buffer),
    )
  })

  test('an offset view hashes only its window and does not mutate the source', async () => {
    const host = new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2])
    const view = new Uint8Array(host.buffer, 2, 4)
    const isolated = new Uint8Array([7, 6, 5, 4])
    expect(await sha256Hex(view)).toBe(await sha256Hex(isolated))
    expect(await sha256Hex(view)).not.toBe(await sha256Hex(host))
    const before = host.slice()
    await sha256Hex(view)
    expect([...host]).toEqual([...before])
    host[2] = 1
    expect(await sha256Hex(view)).not.toBe(await sha256Hex(isolated))
  })

  test('dropping the view copy makes the offset-view contract fail with AssertionError', async () => {
    const before = createHash('sha256').update(readFileSync(SOURCE)).digest('hex')
    const text = readFileSync(SOURCE, 'utf8')
    expect(text).toContain(VIEW_COPY)
    expect(text).not.toContain('bytes instanceof Uint8Array ? bytes.buffer : bytes')

    async function sha256HexWholeBuffer(bytes: ArrayBuffer | Uint8Array): Promise<string> {
      const source = bytes instanceof Uint8Array ? bytes.buffer : bytes
      const digest = await crypto.subtle.digest('SHA-256', source as ArrayBuffer)
      return [...new Uint8Array(digest)]
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('')
    }

    const host = new Uint8Array([9, 8, 7, 6, 5, 4, 3, 2])
    const view = new Uint8Array(host.buffer, 2, 4)
    const isolated = new Uint8Array([7, 6, 5, 4])
    expect(await sha256Hex(view)).toBe(await sha256Hex(isolated))
    await expect(
      (async () => {
        expect(await sha256HexWholeBuffer(view)).toBe(await sha256HexWholeBuffer(isolated))
      })(),
    ).rejects.toThrowError(/expected|AssertionError/i)
    expect(createHash('sha256').update(readFileSync(SOURCE)).digest('hex')).toBe(before)
  })
})
