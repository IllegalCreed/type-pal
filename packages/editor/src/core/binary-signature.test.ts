import { describe, expect, test } from 'vitest'

import { binarySnapshotSignature, sha256Hex } from './binary-signature.js'

describe('binary-signature', () => {
  test('same-length payloads with different bytes cannot share a digest or snapshot id', async () => {
    const a = new Uint8Array([0x00, 0x01, 0x02, 0xff])
    const b = new Uint8Array([0x00, 0x01, 0x02, 0xfe])
    expect(a.byteLength).toBe(b.byteLength)
    const hashA = await sha256Hex(a)
    const hashB = await sha256Hex(b)
    expect(hashA).toBe('3d1f57c984978ef98a18378c8166c1cb8ede02c03eeb6aee7e2f121dfeee3e56')
    expect(hashB).toBe('d316709e2303b9b97bcef71b446c30044895ad4866c4fa8c73407054d9006cc8')
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
