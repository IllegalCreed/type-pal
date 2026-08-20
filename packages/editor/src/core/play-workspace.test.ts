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
  test('workspace query must agree with the stored project identity', async () => {
    await expect(
      resolvePlayWorkspaceRecord(
        record.workspaceId,
        'other',
        vi.fn(async () => record),
      ),
    ).rejects.toThrow('工程 id 与本地 workspace identity 不一致')
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
      'manifest 工程 id 与试玩 workspace identity 不一致',
    )
    expect(() => assertLoadedPlayProjectIdentity('pal', 'pal')).not.toThrow()
  })
})
