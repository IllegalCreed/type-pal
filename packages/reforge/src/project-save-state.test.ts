import { describe, expect, test, vi } from 'vitest'
import type { FileSource } from './file-source.js'
import {
  assertProjectSaveReadable,
  PROJECT_SAVE_STATE_PATH,
  parseProjectSaveState,
  readProjectSaveState,
  withStableProjectRead,
} from './project-save-state.js'

const committed = {
  kind: 'type-pal-author-save',
  version: 1,
  operationId: 'cf448da8-601d-4c9c-bbdc-235b7d61d483',
  phase: 'committed',
  planHash: 'a'.repeat(64),
} as const
function source(read: () => Promise<string>): FileSource {
  return {
    readText: vi.fn(read),
    readJson: async () => {
      throw new Error('unexpected JSON read')
    },
    readBytes: async () => {
      throw new Error('unexpected byte read')
    },
    urlFor: async () => {
      throw new Error('unexpected URL')
    },
  }
}
describe('author save read admission', () => {
  test.each([
    null,
    [],
    {},
    { ...committed, version: 0 },
    { ...committed, extra: true },
    { ...committed, kind: 'other' },
    { ...committed, operationId: '../escape' },
    { ...committed, operationId: 1 },
    { ...committed, phase: 'ready' },
    { ...committed, planHash: 'abc' },
    { ...committed, planHash: null },
  ])('rejects invalid records: %j', (value) => {
    expect(() => parseProjectSaveState(value)).toThrow()
  })
  test('recognizes missing, committed and pending without granting writes', async () => {
    const missing = source(async () => {
      throw new DOMException('missing', 'NotFoundError')
    })
    expect(await readProjectSaveState(missing)).toBeNull()
    expect(missing.readText).toHaveBeenCalledWith(PROJECT_SAVE_STATE_PATH)
    expect(await readProjectSaveState(source(async () => JSON.stringify(committed)))).toEqual(
      committed,
    )
    await expect(
      assertProjectSaveReadable(
        source(async () => JSON.stringify({ ...committed, phase: 'pending' })),
      ),
    ).rejects.toThrow('未完成')
  })
  test.each([
    '',
    '<html>SPA</html>',
    '{',
    'null',
  ])('does not swallow a successful invalid response: %j', async (value) => {
    await expect(readProjectSaveState(source(async () => value))).rejects.toThrow('无法读取')
  })
  test.each([
    'NotAllowedError',
    'AbortError',
    'TypeMismatchError',
  ])('preserves %s', async (name) => {
    const error = new DOMException('failed', name)
    await expect(
      readProjectSaveState(
        source(async () => {
          throw error
        }),
      ),
    ).rejects.toBe(error)
  })
  test('pending stops consumption before any project read', async () => {
    const read = vi.fn(async () => 'half state')
    await expect(
      withStableProjectRead(
        source(async () => JSON.stringify({ ...committed, phase: 'pending' })),
        read,
      ),
    ).rejects.toThrow('未完成')
    expect(read).not.toHaveBeenCalled()
  })
  test.each([
    'pending',
    'committed',
    'missing',
  ])('detects a save during the read: %s', async (phase) => {
    let count = 0
    const s = source(async () => {
      if (count++ === 0) return JSON.stringify(committed)
      if (phase === 'missing') throw new DOMException('removed', 'NotFoundError')
      return JSON.stringify({
        ...committed,
        operationId: 'b174d84c-6e57-4479-a5b6-84b1c25e6c71',
        phase,
      })
    })
    await expect(withStableProjectRead(s, async () => 'mixed')).rejects.toThrow()
  })
  test('stable reads return the value; failed reads preserve their cause', async () => {
    const s = source(async () => JSON.stringify(committed))
    expect(await withStableProjectRead(s, async () => 237)).toBe(237)
    const failure = new Error('content invalid')
    await expect(
      withStableProjectRead(s, async () => {
        throw failure
      }),
    ).rejects.toBe(failure)
  })
})
