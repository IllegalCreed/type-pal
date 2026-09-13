import { afterEach, beforeAll, beforeEach, expect, test } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { RenameProjectCommand } from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import { openLocalProject } from './open-local.js'
import { toEditorState } from './project-io.js'
import { ProjectLeaveGuard } from './project-leave-guard.js'
import {
  AddSharedScriptCommand,
  type ScriptEditorState,
  ScriptEditSession,
} from './script-editor.js'
import { buildBlankProject } from './seed.js'

let initial: EditorState
let canonical: ScriptEditorState
let main: EditSession
let script: ScriptEditSession
let guard: ProjectLeaveGuard
let disconnect: () => void
beforeAll(async () => {
  const opened = await openLocalProject(memoryAuthorDirectory(await buildBlankProject('leave')).dir)
  initial = toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps)
  canonical = {
    scenes: opened.scenes,
    items: opened.project.authorContent.items,
    sharedScripts: {},
  }
})
beforeEach(() => {
  main = new EditSession(structuredClone(initial))
  script = new ScriptEditSession(canonical)
  guard = new ProjectLeaveGuard(main, script)
  disconnect = guard.connect()
})
afterEach(() => disconnect())
function edit(axis: string) {
  if (axis !== 'script') main.dispatch(new RenameProjectCommand('changed'))
  if (axis !== 'main')
    script.dispatch(new AddSharedScriptCommand('test', { name: 'Test', self: 'none', body: [] }))
}

test.each([
  'main',
  'script',
  'both',
])('%s dirty blocks either leave before consent and cancel preserves history', (axis) => {
  edit(axis)
  const mainState = main.getState(),
    scriptState = script.getStateSnapshot()
  for (const intent of ['new', 'open'] as const) {
    expect(guard.request(intent)).toBe(false)
    expect(guard.getSnapshot().decision?.intent).toBe(intent)
    guard.cancel()
    expect(guard.getSnapshot().decision).toBeNull()
    expect(main.getState()).toBe(mainState)
    expect(script.getStateSnapshot()).toBe(scriptState)
    expect(guard.isDirty()).toBe(true)
    expect(main.canUndo() || script.canUndo()).toBe(true)
    expect(guard.confirm('decision')).toBeUndefined()
  }
})

test('clean direct leave and explicit discard do not clear dirty or undo', () => {
  expect(guard.request('new')).toBe(true)
  expect(guard.request('open')).toBe(true)
  edit('main')
  expect(guard.request('new')).toBe(false)
  expect(guard.confirm('decision')).toBe('new')
  const token = guard.begin('new')!
  expect(guard.canReplace(token)).toBe(true)
  guard.finish(token)
  expect(main.isDirty()).toBe(true)
  expect(main.canUndo()).toBe(true)
  expect(guard.request('new')).toBe(false)
})

test('edit then full undo conservatively asks again; discardRedo invalidates consent', () => {
  const command = new RenameProjectCommand('changed')
  main.dispatch(command)
  main.undo()
  expect(main.getState().manifest.name).toBe(initial.manifest.name)
  expect(guard.request('open')).toBe(false)
  guard.confirm('decision')
  const token = guard.begin('open')!
  main.discardRedo(command)
  expect(guard.canReplace(token)).toBe(false)
})

test.each([
  'save',
  'open',
  'save-as',
  'export',
] as const)('%s holds synchronous admission until its own completion', (kind) => {
  const token = guard.begin(kind)!
  for (const other of ['save', 'open', 'save-as', 'export', 'new'] as const)
    expect(guard.begin(other)).toBeUndefined()
  expect(guard.request('new')).toBe(false)
  expect(guard.request('open')).toBe(false)
  guard.cancel()
  expect(guard.isCurrent(token)).toBe(true)
  guard.finish(token)
  expect(guard.request('new')).toBe(true)
})

test.each([
  'failed',
  'cancelled',
] as const)('%s save cannot create a saved continuation, even if clean', (outcome) => {
  edit('both')
  guard.request('open')
  const token = guard.begin('save', true)!
  // Deliberately clean to prove admission also consumes the explicit IO result, not dirty alone.
  main.markSaved()
  script.markSaved()
  guard.finish(token, outcome)
  expect(guard.getSnapshot().decision?.phase).toBe('decision')
  expect(guard.getSnapshot().decision?.intent).toBe('open')
})

test('successful save waits for a fresh click and new edits invalidate ready', () => {
  edit('both')
  guard.request('open')
  expect(guard.begin('save')).toBeUndefined()
  const token = guard.begin('save', true)!
  main.markSaved()
  script.markSaved()
  guard.finish(token, 'committed')
  expect(guard.getSnapshot().decision?.phase).toBe('ready')
  expect(guard.begin('open')).toBeUndefined()
  main.dispatch(new RenameProjectCommand('newer'))
  expect(guard.getSnapshot().decision?.phase).toBe('decision')
  guard.cancel()
  guard.request('new')
  const second = guard.begin('save', true)!
  main.markSaved()
  guard.finish(second, 'committed')
  expect(guard.confirm('ready')).toBe('new')
  expect(guard.begin('new')).toBeDefined()
})

test.each([
  'main',
  'script',
])('late %s command invalidates clean/discard/save-as tokens', (axis) => {
  const token = guard.begin('open')!
  edit(axis)
  expect(guard.canReplace(token)).toBe(false)
  guard.finish(token)
  guard.request('open')
  guard.confirm('decision')
  const copy = guard.begin('save-as')!
  if (axis === 'main') main.undo()
  else script.undo()
  expect(guard.canReplace(copy)).toBe(false)
})

test('hydrate and markSaved notify without invalidating a clean open', async () => {
  const map = initial.mapIndex.maps[0]!
  const loaded = await openLocalProject(
    memoryAuthorDirectory(await buildBlankProject('hydrate')).dir,
  )
  const { loadProjectMap } = await import('@type-pal/reforge')
  disconnect()
  main = new EditSession(structuredClone(initial), {
    loadMap: () => loadProjectMap(loaded.project.assetBase, map.path),
  })
  guard = new ProjectLeaveGuard(main, script)
  disconnect = guard.connect()
  const token = guard.begin('open')!
  await main.ensureMapLoaded(map.id)
  main.markSaved()
  script.markSaved()
  expect(main.getState().maps[map.id]).toBeDefined()
  expect(guard.canReplace(token)).toBe(true)
})

test('unmount and reconnect invalidate old completions, including old releases', () => {
  const old = guard.begin('open')!
  disconnect()
  expect(guard.canReplace(old)).toBe(false)
  expect(guard.begin('open')).toBeUndefined()
  disconnect = guard.connect()
  const next = guard.begin('save')!
  guard.finish(old)
  guard.recovering(old)
  expect(guard.isCurrent(next)).toBe(true)
  guard.finish(next)
  expect(guard.blocked()).toBe(false)
})

test('a stale saved-continuation click is never reinterpreted as discard consent', () => {
  edit('main')
  guard.request('open')
  const save = guard.begin('save', true)!
  main.markSaved()
  guard.finish(save, 'committed')
  expect(guard.getSnapshot().decision?.phase).toBe('ready')
  main.dispatch(new RenameProjectCommand('arrived after save'))
  // The button still represents the rendered ready choice, not a new discard decision.
  const intent = guard.confirm('ready')
  expect(intent).toBeUndefined()
  expect(guard.getSnapshot().decision?.phase).toBe('decision')
  expect(main.isDirty()).toBe(true)
})

test('unload observes both live sessions and writes, not harmless open/export', () => {
  expect(guard.shouldWarnBeforeUnload()).toBe(false)
  const open = guard.begin('open')!
  expect(guard.shouldWarnBeforeUnload()).toBe(false)
  guard.recovering(open)
  expect(guard.shouldWarnBeforeUnload()).toBe(true)
  guard.finish(open)
  const save = guard.begin('save-as')!
  expect(guard.shouldWarnBeforeUnload()).toBe(true)
  guard.finish(save)
  const zip = guard.begin('export')!
  expect(guard.shouldWarnBeforeUnload()).toBe(false)
  edit('script')
  expect(guard.shouldWarnBeforeUnload()).toBe(true)
  guard.finish(zip)
  script.markSaved()
  edit('main')
  expect(guard.shouldWarnBeforeUnload()).toBe(true)
})
