import { describe, expect, test, vi } from 'vitest'
import type { FileSource } from './file-source.js'
import {
  assertProjectSaveReadable,
  PROJECT_SAVE_STATE_PATH,
  type ProjectSaveState,
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
} satisfies ProjectSaveState
const pending = { ...committed, phase: 'pending' } satisfies ProjectSaveState

const malformed = new Error('项目保存状态损坏，请保留目录并回到编辑器处理')
const invalid = new Error('项目保存状态无效或版本不符，请保留目录并回到编辑器处理')
const needsRecovery = new Error('项目有未完成的保存，请先在编辑器打开原目录完成恢复')
const changed = new Error('项目在读取期间完成了新的保存，请重新打开')
const unreadable = '项目保存状态无法读取，请保留目录并回到编辑器处理'

function textSource(read: (path: string) => Promise<string>) {
  function unexpectedRead(): never {
    throw new Error('Save metadata admission only reads text')
  }
  return {
    readText: vi.fn(read),
    readJson: unexpectedRead,
    readBytes: unexpectedRead,
    urlFor: unexpectedRead,
  } satisfies FileSource
}

const unavailable = () => new DOMException(PROJECT_SAVE_STATE_PATH, 'NotFoundError')

function stateSource(initial: ProjectSaveState | null) {
  let state = initial
  return {
    source: textSource(async (path) => {
      if (path !== PROJECT_SAVE_STATE_PATH) throw new Error(`Unexpected admission path ${path}`)
      if (!state) throw unavailable()
      return JSON.stringify(state)
    }),
    writeState(value: ProjectSaveState | null) {
      state = value
    },
  }
}

describe('author save metadata format', () => {
  test('accepts both legal phases and preserves each required field', () => {
    expect(parseProjectSaveState({ ...pending })).toEqual(pending)
    expect(parseProjectSaveState({ ...committed })).toEqual(committed)
  })

  test.each([
    { name: 'null', value: null },
    { name: 'array', value: [] },
  ])('distinguishes a non-record $name', ({ value }) => {
    expect(() => parseProjectSaveState(value)).toThrow(malformed)
  })

  test.each([
    ['missing fields', {}],
    ['unknown version', { ...committed, version: 0 }],
    ['unexpected field', { ...committed, extra: true }],
    ['unexpected kind', { ...committed, kind: 'other' }],
    ['non-UUID operation id', { ...committed, operationId: '../escape' }],
    ['non-string operation id', { ...committed, operationId: 1 }],
    ['unknown phase', { ...committed, phase: 'ready' }],
    ['short plan hash', { ...committed, planHash: 'abc' }],
    ['non-string plan hash', { ...committed, planHash: null }],
  ])('rejects %s at the metadata boundary', (_label, value) => {
    expect(() => parseProjectSaveState(value)).toThrow(invalid)
  })
})

describe('reading the author save sidecar', () => {
  test('only native NotFoundError means that the sidecar is absent', async () => {
    const { source } = stateSource(null)
    await expect(readProjectSaveState(source)).resolves.toBeNull()
    expect(source.readText).toHaveBeenCalledExactlyOnceWith(PROJECT_SAVE_STATE_PATH)
  })

  test('reading returns the actual committed or pending record, before the separate admission gate', async () => {
    const state = stateSource(committed)
    await expect(readProjectSaveState(state.source)).resolves.toEqual(committed)
    state.writeState(pending)
    await expect(readProjectSaveState(state.source)).resolves.toEqual(pending)
    await expect(assertProjectSaveReadable(state.source)).rejects.toThrow(needsRecovery)
  })

  test.each([
    '',
    '<html>SPA</html>',
    '{',
  ])('preserves the syntax error behind an invalid response: %j', async (value) => {
    await expect(readProjectSaveState(textSource(async () => value))).rejects.toMatchObject({
      message: unreadable,
      cause: expect.any(SyntaxError),
    })
  })

  test('preserves the shape diagnostic behind valid JSON that is not a record', async () => {
    const result = readProjectSaveState(textSource(async () => 'null'))
    await expect(result).rejects.toMatchObject({
      message: unreadable,
      cause: { name: 'Error', message: malformed.message },
    })
  })

  test.each([
    'NotAllowedError',
    'AbortError',
    'TypeMismatchError',
  ])('propagates the original %s', async (name) => {
    const error = new DOMException(PROJECT_SAVE_STATE_PATH, name)
    const result = readProjectSaveState(
      textSource(async () => {
        throw error
      }),
    )
    await expect(result).rejects.toBe(error)
  })
})

describe('admitting one stable project load', () => {
  test('pending refuses before any content reader begins', async () => {
    const { source } = stateSource(pending)
    const read = vi.fn(async () => 'half state')
    await expect(withStableProjectRead(source, read)).rejects.toThrow(needsRecovery)
    expect(read).not.toHaveBeenCalled()
  })

  const laterCommit = { ...committed, operationId: 'b174d84c-6e57-4479-a5b6-84b1c25e6c71' }
  test.each([
    { name: 'pending', after: { ...laterCommit, phase: pending.phase }, error: needsRecovery },
    { name: 'committed', after: laterCommit, error: changed },
    { name: 'missing', after: null, error: changed },
    {
      name: 'plan hash changed',
      after: { ...committed, planHash: 'b'.repeat(64) },
      error: changed,
    },
  ])('drops the result if the sidecar ends as $name during the load', async ({ after, error }) => {
    const state = stateSource(committed)
    const read = vi.fn(async () => {
      state.writeState(after)
      return 'mixed content'
    })
    await expect(withStableProjectRead(state.source, read)).rejects.toThrow(error)
    expect(read).toHaveBeenCalledOnce()
  })

  test('returns the original reader result only after the second status read', async () => {
    const trace: string[] = []
    const source = textSource(async () => {
      trace.push('sidecar')
      return JSON.stringify(committed)
    })
    const project = { id: 'fixture', actors: ['hero'] }
    const opened = await withStableProjectRead(source, async () => {
      trace.push('content')
      return project
    })
    expect(opened).toBe(project)
    expect(trace).toEqual(['sidecar', 'content', 'sidecar'])
  })

  test('propagates a failed content read without replacing its cause', async () => {
    const { source } = stateSource(committed)
    const failure = new Error('content invalid')
    await expect(
      withStableProjectRead(source, async () => {
        throw failure
      }),
    ).rejects.toBe(failure)
    expect(source.readText).toHaveBeenCalledExactlyOnceWith(PROJECT_SAVE_STATE_PATH)
  })
})
