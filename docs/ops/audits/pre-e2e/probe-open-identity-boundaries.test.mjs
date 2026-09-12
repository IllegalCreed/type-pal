// READ-ONLY PRODUCT DIAGNOSTIC, NOT AN ACCEPTANCE TEST.
// The source-mismatch witness intentionally proves the current defect. After a real fix that
// witness must fail; do not wire this probe into normal check/coverage or bless the bad behavior.
// All filesystem/IDB writes below target memory fixtures only. The real handle-store functions run.
// Run with the adjacent open-identity-probe.config.mts; optional OI_PROBE_OUTPUT records the witness.

import { writeFileSync } from 'node:fs'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from '../../../../packages/editor/src/core/__tests__/author-save-fixture.js'
import {
  authorSaveStorage,
  memoryAuthorSaveStore,
} from '../../../../packages/editor/src/core/__tests__/author-save-store-fixture.js'

vi.mock('../../../../packages/editor/src/core/author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original()),
)

import { finishOpen } from '../../../../packages/editor/src/core/open-actions.js'
import { buildBlankProject } from '../../../../packages/editor/src/core/seed.js'
import {
  createLocalWorkspaceContext,
  createSandboxWorkspaceContext,
  SANDBOX_WORKSPACE_MARKER_PATH,
  sandboxMarkerFor,
} from '../../../../packages/editor/src/core/workspace-context.js'
import {
  authorizedSaveScope,
  authorizeFirstSaveTarget,
  withAuthorizedWorkspaceMutation,
} from '../../../../packages/editor/src/core/workspace-persistence.js'

const records = new Map()
const trace = []
function copy(value) {
  if (value === undefined) return undefined
  return { ...structuredClone({ ...value, handle: undefined }), handle: value.handle }
}
beforeEach(() => {
  records.clear()
  trace.length = 0
  authorSaveStorage.receipts.clear()
  vi.stubGlobal('indexedDB', {
    open(name, version) {
      expect(name).toBe('type-pal-editor')
      expect(version).toBe(2)
      const req = {
        result: {
          transaction(store, mode) {
            expect(store).toBe('project-handles')
            let aborted = false
            const tx = {
              oncomplete: null,
              onerror: null,
              onabort: null,
              abort() {
                aborted = true
                queueMicrotask(() => tx.onabort?.())
              },
              objectStore() {
                const request = (read, commit = () => {}) => {
                  const r = { result: undefined, onsuccess: null, onerror: null }
                  queueMicrotask(() => {
                    if (aborted) return
                    r.result = read()
                    r.onsuccess?.()
                    queueMicrotask(() => {
                      if (!aborted) {
                        commit()
                        tx.oncomplete?.()
                      }
                    })
                  })
                  return r
                }
                return {
                  get: (key) => request(() => copy(records.get(key))),
                  getAll: () => request(() => [...records.values()].map(copy)),
                  put: (value) => {
                    expect(mode).toBe('readwrite')
                    const saved = copy(value)
                    return request(
                      () => saved.workspaceId,
                      () => {
                        trace.push({ kind: 'put', source: saved.source })
                        records.set(saved.workspaceId, saved)
                      },
                    )
                  },
                }
              },
            }
            return tx
          },
        },
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null,
      }
      queueMicrotask(() => req.onsuccess?.())
      return req
    },
  })
})
afterEach(() => vi.unstubAllGlobals())
test('expired genuine token reaches the inactive guard without forging any brand', async () => {
  const disk = memoryAuthorDirectory()
  const context = createLocalWorkspaceContext('expired', 'blank-project')
  const target = await authorizeFirstSaveTarget(context, disk.dir)
  const expired = await withAuthorizedWorkspaceMutation(target, async (mutation) => mutation)
  expect(() => authorizedSaveScope(expired)).toThrow('保存恢复缺少有效的原始写入授权')
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
})
test('real handle-store: same-source positive control opens and reopens', async () => {
  const disk = memoryAuthorDirectory(await buildBlankProject('source-axis'))
  const marker = createSandboxWorkspaceContext('source-axis', 'ui-samples')
  disk.set(SANDBOX_WORKSPACE_MARKER_PATH, sandboxMarkerFor(marker))
  const opened = await finishOpen(disk.dir, { workspaceHint: marker })
  expect(opened.workspace.source).toBe('ui-samples')
  expect(records.get(marker.workspaceId).source).toBe('ui-samples')
  expect((await finishOpen(disk.dir)).workspace.source).toBe('ui-samples')
})
test('real handle-store: one source-axis mismatch creates a contradictory recent record and breaks next open', async () => {
  const disk = memoryAuthorDirectory(await buildBlankProject('source-axis'))
  const marker = createSandboxWorkspaceContext('source-axis', 'ui-samples')
  disk.set(SANDBOX_WORKSPACE_MARKER_PATH, sandboxMarkerFor(marker))
  const hint = createSandboxWorkspaceContext('source-axis', 'review-copy', marker.workspaceId)
  const opened = await finishOpen(disk.dir, { workspaceHint: hint })
  const record = records.get(marker.workspaceId)
  expect(opened.workspace.source).toBe('review-copy')
  expect(disk.json(SANDBOX_WORKSPACE_MARKER_PATH).source).toBe('ui-samples')
  expect(record.source).toBe('review-copy')
  await expect(finishOpen(disk.dir)).rejects.toThrow('沙盒 marker 与最近项目记录不一致')
  expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  if (process.env.OI_PROBE_OUTPUT)
    writeFileSync(
      process.env.OI_PROBE_OUTPUT,
      JSON.stringify(
        {
          markerSource: 'ui-samples',
          hintSource: hint.source,
          returnedSource: opened.workspace.source,
          recordSource: record.source,
          reopenRejected: true,
          trace,
        },
        null,
        2,
      ),
    )
})
