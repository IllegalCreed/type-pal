import { describe, expect, test } from 'vitest'
import { binarySnapshotSignature, sha256Hex } from './binary-signature.js'

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
})
