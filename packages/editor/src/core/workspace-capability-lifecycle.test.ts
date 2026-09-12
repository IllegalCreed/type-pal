/** Genuine public capabilities only; real policy, writer, registration guards and locks. */
import { CONTENT_VERSION } from '@type-pal/content'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)

import { type AuthorSavePlan, parseSaveSignature } from './author-save-plan.js'
import { binarySnapshotSignature } from './binary-signature.js'
import {
  loadWorkspaceRecord,
  type WorkspaceHandleRecord,
  withWorkspaceRegistrationLock,
} from './handle-store.js'
import { openLocalProject } from './open-local.js'
import { writeProject } from './project-io.js'
import { buildBlankProject } from './seed.js'
import {
  createLocalWorkspaceContext,
  createSandboxWorkspaceContext,
  type WorkspaceContext,
} from './workspace-context.js'
import {
  type AuthorizedWorkspaceMutation,
  allowAuthorizedSavePrivateFile,
  authorizedDirectory,
  authorizedSaveScope,
  authorizeFirstSaveTarget,
  beginAuthorizedWorkspaceMutation,
  completeAuthorizedWorkspaceData,
  planAuthorizedWorkspacePaths,
  recordAuthorizedWorkspaceRemoveCompleted,
  recordAuthorizedWorkspaceWriteCompleted,
  registerAuthorizedWorkspaceMutation,
  sealAuthorizedSavePlan,
  withAuthorizedSaveJob,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

// Only the IDB storage boundary is replaced, not handle-store's identity/lock business functions.
// Each production transaction issues one request. Writes become visible at completion, not at
// request success; an aborted transaction cannot commit. FSA handles retain native-style identity.
const records = new Map<string, WorkspaceHandleRecord>()
const commits: string[] = []
const copyRecord = (value: WorkspaceHandleRecord | undefined) =>
  value && {
    ...structuredClone({ ...value, handle: undefined }),
    handle: value.handle,
  }
beforeEach(() => {
  records.clear()
  commits.length = 0
  authorSaveStorage.receipts.clear()
  vi.stubGlobal('indexedDB', {
    open(name: string, version: number) {
      expect([name, version]).toEqual(['type-pal-editor', 2])
      const request = {
        onsuccess: null as (() => void) | null,
        result: {
          transaction(store: string, mode: string) {
            expect(store).toBe('project-handles')
            let ended = false
            const tx = {
              oncomplete: null as (() => void) | null,
              onabort: null as (() => void) | null,
              abort() {
                if (ended) return
                ended = true
                queueMicrotask(() => tx.onabort?.())
              },
              objectStore() {
                function request<T>(read: () => T, commit = () => {}) {
                  const r = {
                    result: undefined as T | undefined,
                    onsuccess: null as (() => void) | null,
                  }
                  queueMicrotask(() => {
                    if (ended) return
                    r.result = read()
                    r.onsuccess?.()
                    queueMicrotask(() => {
                      if (ended) return
                      ended = true
                      commit()
                      tx.oncomplete?.()
                    })
                  })
                  return r
                }
                return {
                  get: (key: string) => request(() => copyRecord(records.get(key))),
                  getAll: () => request(() => [...records.values()].map(copyRecord)),
                  put(value: WorkspaceHandleRecord) {
                    expect(mode).toBe('readwrite')
                    const saved = copyRecord(value)!
                    return request(
                      () => saved.workspaceId,
                      () => {
                        records.set(saved.workspaceId, saved)
                        commits.push(saved.workspaceId)
                      },
                    )
                  },
                }
              },
            }
            return tx
          },
        },
      }
      queueMicrotask(() => request.onsuccess?.())
      return request
    },
  })
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

type Disk = ReturnType<typeof memoryAuthorDirectory>
function evidence(disk: Disk) {
  return {
    files: [...disk.files].map(([path, bytes]) => [path, [...new Uint8Array(bytes)]]),
    io: structuredClone(disk.changes),
    records: [...records.values()].map(copyRecord),
    commits: [...commits],
    receipts: [...authorSaveStorage.receipts.values()].map((r) =>
      structuredClone({ ...r, handle: undefined }),
    ),
  }
}
async function fixture() {
  const disk = memoryAuthorDirectory()
  const context = createLocalWorkspaceContext('capability', 'blank-project')
  const target = await authorizeFirstSaveTarget(context, disk.dir)
  return { disk, context, target }
}
function plan(context: WorkspaceContext): AuthorSavePlan {
  return {
    kind: 'type-pal-author-save-plan',
    version: 1,
    contentVersion: CONTENT_VERSION,
    operationId: crypto.randomUUID(),
    identity: {
      workspaceId: context.workspaceId,
      projectId: context.projectId,
      mode: context.mode,
      source: context.source,
    },
    before: {},
    directories: {},
    steps: [],
  }
}
async function expectWriteCapabilityClosed(
  token: AuthorizedWorkspaceMutation,
  validPlan: AuthorSavePlan,
) {
  const started = vi.fn(async () => 'must not run')
  expect(() => authorizedSaveScope(token)).toThrow('保存恢复缺少有效的原始写入授权')
  await expect(withAuthorizedSaveJob(token, started)).rejects.toThrow(
    '保存恢复缺少有效的原始写入授权',
  )
  expect(started).not.toHaveBeenCalled()
  expect(() => sealAuthorizedSavePlan(token, validPlan)).toThrow('保存计划缺少有效原授权或已经封存')
  expect(() =>
    allowAuthorizedSavePrivateFile(
      token,
      validPlan.operationId,
      '.type-pal/save-state.json',
      'marker',
    ),
  ).toThrow('拒绝未授权的恢复元数据准备')
  await expect(beginAuthorizedWorkspaceMutation(token)).rejects.toThrow(
    '拒绝未经 workspace persistence policy 授权的目录写入',
  )
  await expect(planAuthorizedWorkspacePaths(token, ['late.json'])).rejects.toThrow(
    '拒绝未经 active workspace mutation 的路径预检',
  )
  await expect(
    recordAuthorizedWorkspaceWriteCompleted(token, 'late.json', { late: true }),
  ).rejects.toThrow('拒绝未经 active workspace mutation 的写入记录')
  expect(() => recordAuthorizedWorkspaceRemoveCompleted(token, 'project.json')).toThrow(
    '拒绝未经 active workspace mutation 的删除记录',
  )
}

test.each([
  'success',
  'failure',
] as const)('a genuine token expires after %s; no re-entry, bookkeeping, recent or IO side effects', async (outcome) => {
  const { disk, context, target } = await fixture()
  let token!: AuthorizedWorkspaceMutation
  const failure = new Error('owner callback failed')
  const run = withAuthorizedWorkspaceMutation(target, async (current) => {
    token = current
    expect(authorizedDirectory(current)).toBe(disk.dir)
    expect(authorizedSaveScope(current).workspace).toBe(context)
    if (outcome === 'failure') throw failure
    await registerAuthorizedWorkspaceMutation(current, context, 'saved project')
    await writeProject(current, await buildBlankProject(context.projectId))
  })
  if (outcome === 'failure') await expect(run).rejects.toBe(failure)
  else {
    await run
    expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
    expect((await openLocalProject(disk.dir)).project.manifest.id).toBe(context.projectId)
    expect((await loadWorkspaceRecord(context.workspaceId))?.name).toBe('saved project')
  }
  const before = evidence(disk)
  await expectWriteCapabilityClosed(token, plan(context))
  expect(() => authorizedDirectory(token)).toThrow(
    '拒绝未经 active workspace mutation 授权的目录访问',
  )
  await expect(completeAuthorizedWorkspaceData(token)).rejects.toThrow('保存收口缺少有效授权')
  await expect(registerAuthorizedWorkspaceMutation(token, context, 'late')).rejects.toThrow(
    '拒绝未经 workspace mutation 授权的句柄登记',
  )
  const reentered = vi.fn(async () => {})
  await expect(withAuthorizedWorkspaceMutation(token, reentered)).rejects.toThrow()
  await expect(withAuthorizedWorkspaceMutation(target, reentered)).rejects.toThrow()
  expect(reentered).not.toHaveBeenCalled()
  expect(evidence(disk)).toEqual(before)
})

test('committed writer closes write capability before the outer callback exits; late recent declaration is rejected', async () => {
  const { disk, context, target } = await fixture()
  await withAuthorizedWorkspaceMutation(target, async (token) => {
    await writeProject(token, await buildBlankProject(context.projectId))
    expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
    const before = evidence(disk)
    // Directory access and idempotent finalization remain legal until outer scope exit.
    expect(authorizedDirectory(token)).toBe(disk.dir)
    await completeAuthorizedWorkspaceData(token)
    const completedPlan = plan(context)
    completedPlan.operationId = disk.json('.type-pal/save-state.json').operationId
    await expectWriteCapabilityClosed(token, completedPlan)
    await expect(registerAuthorizedWorkspaceMutation(token, context, 'too late')).rejects.toThrow(
      '保存登记必须在内容提交前声明',
    )
    expect(evidence(disk)).toEqual(before)
  })
  expect(records.size).toBe(0)
  expect((await openLocalProject(disk.dir)).project.manifest.id).toBe(context.projectId)
})

test('one declared recent identity is stable before and after commit; duplicate exact declaration is idempotent', async () => {
  const { disk, context, target } = await fixture()
  await withAuthorizedWorkspaceMutation(target, async (token) => {
    await registerAuthorizedWorkspaceMutation(token, context, 'original')
    for (const stage of ['before', 'after'] as const) {
      if (stage === 'after') await writeProject(token, await buildBlankProject(context.projectId))
      const before = evidence(disk)
      await registerAuthorizedWorkspaceMutation(token, context, 'original')
      await expect(
        registerAuthorizedWorkspaceMutation(token, context, 'replacement'),
      ).rejects.toThrow('不能登记多个 recent identity')
      const equalIdentity = createLocalWorkspaceContext(
        context.projectId,
        'blank-project',
        context.workspaceId,
      )
      await expect(
        registerAuthorizedWorkspaceMutation(token, equalIdentity, 'original'),
      ).rejects.toThrow('不能登记多个 recent identity')
      expect(evidence(disk)).toEqual(before)
    }
  })
  expect(commits).toEqual([context.workspaceId])
  expect((await loadWorkspaceRecord(context.workspaceId))?.name).toBe('original')
  expect(disk.json('.type-pal/save-state.json').phase).toBe('committed')
})

test.each([
  'workspaceId',
  'projectId',
  'mode',
  'source',
] as const)('recent %s mismatch is refused before staging; the original identity still commits', async (axis) => {
  const { disk, context, target } = await fixture()
  // Legal constructors for all contexts; mode changes also require its valid source.
  const foreign =
    axis === 'mode'
      ? createSandboxWorkspaceContext(context.projectId, 'review-copy', context.workspaceId)
      : createLocalWorkspaceContext(
          axis === 'projectId' ? 'other' : context.projectId,
          axis === 'source' ? 'save-as' : 'blank-project',
          axis === 'workspaceId' ? crypto.randomUUID() : context.workspaceId,
        )
  await withAuthorizedWorkspaceMutation(target, async (token) => {
    const before = evidence(disk)
    await expect(registerAuthorizedWorkspaceMutation(token, foreign, 'foreign')).rejects.toThrow(
      '写入会话与待登记 workspace identity 不一致',
    )
    expect(authorizedSaveScope(token).registrationName).toBeNull()
    expect(evidence(disk)).toEqual(before)
    await registerAuthorizedWorkspaceMutation(token, context, 'original')
    await writeProject(token, await buildBlankProject(context.projectId))
  })
  expect(commits).toEqual([context.workspaceId])
  expect(await loadWorkspaceRecord(context.workspaceId)).toMatchObject({
    ...plan(context).identity,
    name: 'original',
    handle: disk.dir,
  })
})

test('private preparation admits only this operation metadata, never author paths or another operation', async () => {
  const { disk, context, target } = await fixture()
  await withAuthorizedWorkspaceMutation(target, async (token) => {
    const valid = plan(context)
    const prefix = `.type-pal/save-recovery/${valid.operationId}/`
    const before = evidence(disk)
    for (const path of [
      'project.json',
      `${prefix}plan.json/extra`,
      `${prefix}blobs/not-a-digest`,
      `.type-pal/save-recovery/${crypto.randomUUID()}/plan.json`,
    ]) {
      expect(() => allowAuthorizedSavePrivateFile(token, valid.operationId, path, 'bytes')).toThrow(
        '恢复元数据路径越界',
      )
    }
    for (const path of [
      '.type-pal/save-state.json',
      `${prefix}plan.json`,
      `${prefix}blobs/${'a'.repeat(64)}`,
    ])
      expect(() =>
        allowAuthorizedSavePrivateFile(token, valid.operationId, path, 'bytes'),
      ).not.toThrow()
    expect(() =>
      allowAuthorizedSavePrivateFile(
        token,
        crypto.randomUUID(),
        '.type-pal/save-state.json',
        'bytes',
      ),
    ).toThrow('一次授权不能准备多个恢复计划')
    // The rejected second operation must not poison the first plan's ownership.
    expect(() => sealAuthorizedSavePlan(token, valid)).not.toThrow()
    expect(() => sealAuthorizedSavePlan(token, valid)).toThrow('已经封存')
    expect(evidence(disk)).toEqual(before)
  })
})

test.each([
  'operation',
  'before-size',
  'before-value',
] as const)('plan sealing rejects %s drift against real authorized baseline, then accepts the original plan', async (fault) => {
  const { disk, context, target } = await fixture()
  await withAuthorizedWorkspaceMutation(target, async (token) => {
    await planAuthorizedWorkspacePaths(token, ['planned.json'])
    const valid = plan(context)
    valid.before = { 'planned.json': null }
    allowAuthorizedSavePrivateFile(token, valid.operationId, '.type-pal/save-state.json', 'bytes')
    const bad = structuredClone(valid)
    if (fault === 'operation') bad.operationId = crypto.randomUUID()
    else if (fault === 'before-size') bad.before = {}
    else
      bad.before['planned.json'] = parseSaveSignature(
        await binarySnapshotSignature(new TextEncoder().encode('foreign').buffer),
      )
    const before = evidence(disk)
    expect(() => sealAuthorizedSavePlan(token, bad)).toThrow(
      '恢复计划与原保存授权的身份或作者基线不符',
    )
    expect(() => sealAuthorizedSavePlan(token, valid)).not.toThrow()
    expect(evidence(disk)).toEqual(before)
  })
})

test('retained recovery scope rejects re-entry while owner is active and rejects an unsealed plan after exit', async () => {
  const { disk, context, target } = await fixture()
  let scope!: ReturnType<typeof authorizedSaveScope>
  let consumed = 0
  async function* values() {
    consumed++
    yield ['untrusted.json', null] as const
  }
  // Obtain an authentic lock first, then release it. Active-owner rejection must precede even
  // lock validation; trying to acquire the same identity lock inside the owner would deadlock.
  const oldLock = await withWorkspaceRegistrationLock(context.workspaceId, async (lock) => lock)
  await withAuthorizedWorkspaceMutation(target, async (token) => {
    scope = authorizedSaveScope(token)
    const before = evidence(disk)
    expect(() => scope.assertRecoveryReady()).toThrow('不能在尚未结束的保存操作中重入恢复')
    await expect(scope.reconcileRecovery(oldLock, values())).rejects.toThrow(
      '不能在尚未结束的保存操作中重入恢复',
    )
    expect(evidence(disk)).toEqual(before)
  })
  const before = evidence(disk)
  expect(() => scope.assertRecoveryReady()).not.toThrow()
  await withWorkspaceRegistrationLock(context.workspaceId, async (lock) => {
    await expect(scope.reconcileRecovery(lock, values())).rejects.toThrow(
      '原保存授权尚未封存完整计划，不能推进作者基线',
    )
  })
  expect(consumed).toBe(0)
  expect(evidence(disk)).toEqual(before)
})
