import { describe, expect, test, vi } from 'vitest'
import { assertLoadedPlayProjectIdentity, resolvePlayWorkspaceRecord } from './play-workspace.js'

const record = {
  workspaceId: '11111111-1111-4111-8111-111111111111',
  projectId: 'pal',
  name: 'PAL sandbox',
  mode: 'sandbox',
  source: 'review-copy',
  handle: {} as FileSystemDirectoryHandle,
  updatedAt: 1,
} as const

describe('local play workspace identity', () => {
  test('missing workspace handle cannot fall back to a same-id HTTP project', async () => {
    await expect(
      resolvePlayWorkspaceRecord(
        record.workspaceId,
        'pal',
        vi.fn(async () => null),
      ),
    ).rejects.toThrow()
  })
  test('workspace query must agree with the stored project identity', async () => {
    await expect(
      resolvePlayWorkspaceRecord(
        record.workspaceId,
        'other',
        vi.fn(async () => record),
      ),
    ).rejects.toThrow('项目 id 与本地 workspace identity 不一致')
    await expect(
      resolvePlayWorkspaceRecord(
        record.workspaceId,
        'pal',
        vi.fn(async () => record),
      ),
    ).resolves.toBe(record)
  })

  test('loaded manifest must agree with the workspace project identity', () => {
    expect(() => assertLoadedPlayProjectIdentity('pal', 'other')).toThrow(
      'manifest 项目 id 与试玩 workspace identity 不一致',
    )
    expect(() => assertLoadedPlayProjectIdentity('pal', 'pal')).not.toThrow()
  })
  test('rejects malformed workspace before looking up a handle and rejects a wrong record key', async () => {
    const lookup = vi.fn(async () => record)
    await expect(resolvePlayWorkspaceRecord('', 'pal', lookup)).rejects.toThrow('标识')
    expect(lookup).not.toHaveBeenCalled()
    await expect(
      resolvePlayWorkspaceRecord('22222222-2222-4222-8222-222222222222', 'pal', lookup),
    ).rejects.toThrow('请求身份')
  })
})
