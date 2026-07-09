import { describe, expect, test, vi } from 'vitest'
import { ensurePermission } from './handle-store.js'

const handle = (q: PermissionState, r?: PermissionState) =>
  ({
    queryPermission: vi.fn(async () => q),
    requestPermission: vi.fn(async () => r ?? q),
  }) as unknown as FileSystemDirectoryHandle

const reqSpy = (h: FileSystemDirectoryHandle) =>
  (h as unknown as { requestPermission: ReturnType<typeof vi.fn> }).requestPermission

describe('ensurePermission', () => {
  test('已 granted → 直接 granted,不 request', async () => {
    const h = handle('granted')
    expect(await ensurePermission(h, { withRequest: false })).toBe('granted')
    expect(reqSpy(h)).not.toHaveBeenCalled()
  })

  test('prompt + withRequest=false(载入)→ 返回 prompt,不 request(须手势)', async () => {
    const h = handle('prompt')
    expect(await ensurePermission(h, { withRequest: false })).toBe('prompt')
    expect(reqSpy(h)).not.toHaveBeenCalled()
  })

  test('prompt + withRequest=true(点重连=手势)→ request,得 granted', async () => {
    const h = handle('prompt', 'granted')
    expect(await ensurePermission(h, { withRequest: true })).toBe('granted')
    expect(reqSpy(h)).toHaveBeenCalled()
  })
})
