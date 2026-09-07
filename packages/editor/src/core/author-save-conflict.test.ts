import ts from 'typescript'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import mainSource from '../main.tsx?raw'
import appSource from '../ui/App.tsx?raw'

const bindings = vi.hoisted(
  () => new Map<string, import('./handle-store.js').WorkspaceHandleRecord>(),
)
vi.mock('./handle-store.js', async (original) => {
  const actual = await original<typeof import('./handle-store.js')>()
  const save = async (
    context: import('./workspace-context.js').WorkspaceContext,
    name: string,
    handle: FileSystemDirectoryHandle,
  ) => {
    bindings.set(context.workspaceId, { ...context, name, handle, updatedAt: 1 })
  }
  return {
    ...actual,
    loadWorkspaceRecord: async (id: string) => bindings.get(id) ?? null,
    findWorkspaceRecordByHandle: async (handle: FileSystemDirectoryHandle) => {
      for (const record of bindings.values())
        if (await handle.isSameEntry(record.handle)) return record
      return null
    },
    saveWorkspaceHandle: save,
    saveWorkspaceHandleUnderLock: async (_lock: unknown, ...args: Parameters<typeof save>) =>
      save(...args),
  }
})

import { deferred, memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import {
  type AuthorDiskBaseline,
  authorBaselineSummary,
  createEmptyAuthorDiskBaseline,
} from './author-disk-baseline.js'
import { RenameProjectCommand, UpdateLocaleCommand } from './commands.js'
import { EditSession } from './edit-session.js'
import { finishOpen, type Opened } from './open-actions.js'
import {
  serializeProjectWithMapCopies,
  toEditorState,
  writeFile,
  writeProject,
} from './project-io.js'
import { ScriptEditSession } from './script-editor.js'
import { mergeEditorProjectionWithCurrentAuthorState } from './script-editor-projection.js'
import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext } from './workspace-context.js'
import {
  authorizeBoundWorkspaceTarget,
  authorizeFirstSaveTarget,
  preflightFirstSaveTarget,
  registerAuthorizedWorkspaceMutation,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

/** Execute the actual App refs/serialization/save callback, not a handwritten copy of its control flow. */
function appSave(
  opened: Opened,
  editor: EditSession,
  options: {
    initialDir?: FileSystemDirectoryHandle | null
    picker?: () => Promise<FileSystemDirectoryHandle | null>
  } = {},
) {
  const ast = ts.createSourceFile(
    'App.tsx',
    appSource,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const names = new Set([
    'dirHandleRef',
    'saveAttemptDirRef',
    'snapshotRef',
    'authorBaselineRef',
    'firstSaveAuthorRef',
    'saveInFlightRef',
    'serializeEditorSnapshot',
    'save',
  ])
  const declarations = new Map<string, string>()
  const visit = (node: ts.Node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && names.has(node.name.text)) {
      if (declarations.has(node.name.text))
        throw new Error(`ambiguous App declaration ${node.name.text}`)
      declarations.set(node.name.text, `const ${node.getText(ast)};`)
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
  expect([...declarations.keys()].sort()).toEqual([...names].sort())
  const error = vi.fn(),
    activity = vi.fn()
  const scriptSession = new ScriptEditSession({
    scenes: structuredClone(opened.scenes),
    items: structuredClone(opened.project.authorContent.items),
    sharedScripts: structuredClone(opened.project.authorContent.sharedScripts),
  })
  const env = {
    props: {
      workspace: opened.workspace,
      authorBaseline: opened.authorBaseline,
      initialDir: options.initialDir === null ? undefined : (options.initialDir ?? opened.dir),
    },
    useRef: <T>(value: T) => ({ current: value }),
    project: opened.project,
    session: editor,
    scriptSession,
    exporting: false,
    setSaveErr: error,
    setSaveActivity: activity,
    window: { confirm: () => true, setTimeout },
    pickDir: options.picker ?? (() => Promise.resolve(null)),
    serializeProjectWithMapCopies,
    mergeEditorProjectionWithCurrentAuthorState,
    createEmptyAuthorDiskBaseline,
    preflightFirstSaveTarget,
    authorizeFirstSaveTarget,
    authorizeBoundWorkspaceTarget,
    withAuthorizedWorkspaceMutation,
    writeProject,
    registerAuthorizedWorkspaceMutation,
  }
  const javascript = ts.transpileModule([...declarations.values()].join('\n'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText
  const run = new Function(...Object.keys(env), `${javascript}; return save;`)(
    ...Object.values(env),
  ) as () => Promise<void>
  return { run, error, activity, scriptSession }
}

beforeEach(() => {
  bindings.clear()
})

function session(opened: Opened) {
  return new EditSession(toEditorState(opened.project, opened.scenes, {}, {}, opened.stamps))
}
async function save(opened: Opened, editor: EditSession) {
  const files = await serializeProjectWithMapCopies(editor.getState(), opened.project.source)
  const target = await authorizeBoundWorkspaceTarget(
    opened.workspace,
    opened.dir!,
    opened.authorBaseline,
  )
  await writeProject(target, files)
  editor.markSaved()
}

describe('real author open and save conflict boundary', () => {
  test.each([
    'same file',
    'different file',
  ])('a stale editor preserves the newer disk and its own dirty %s changes', async (choice) => {
    const disk = memoryAuthorDirectory(await buildBlankProject('save-conflict'))
    const a = await finishOpen(disk.dir),
      b = await finishOpen(disk.dir)
    const aSession = session(a),
      bSession = session(b)
    aSession.dispatch(new UpdateLocaleCommand('name.hero', 'Saved by A'))
    bSession.dispatch(
      choice === 'same file'
        ? new UpdateLocaleCommand('name.hero', 'Unsaved B')
        : new RenameProjectCommand('Unsaved B'),
    )
    await save(a, aSession)
    disk.resetChanges()
    await expect(save(b, bSession)).rejects.toThrow('修改')
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
    expect(disk.json('content/locale.json')['name.hero']).toBe('Saved by A')
    expect(bSession.isDirty()).toBe(true)
    expect(
      choice === 'same file'
        ? bSession.getState().locale['name.hero']
        : bSession.getState().manifest.name,
    ).toBe('Unsaved B')
  })

  test('same-session successful writes advance only that session; a fresh open can save normally', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('save-conflict'))
    const opened = await finishOpen(disk.dir),
      editor = session(opened)
    for (const name of ['first', 'second']) {
      editor.dispatch(new UpdateLocaleCommand('name.hero', name))
      await save(opened, editor)
      expect(editor.isDirty()).toBe(false)
    }
    const reopened = await finishOpen(disk.dir),
      next = session(reopened)
    expect(next.getState().locale['name.hero']).toBe('second')
    next.dispatch(new RenameProjectCommand('new session'))
    await save(reopened, next)
    expect(disk.json('manifest.json').name).toBe('new session')
  })

  test('cooperative concurrent saves serialize, then reject the stale writer', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('save-conflict'))
    const a = await finishOpen(disk.dir),
      b = await finishOpen(disk.dir)
    const left = session(a),
      right = session(b)
    left.dispatch(new RenameProjectCommand('A'))
    right.dispatch(new RenameProjectCommand('B'))
    const entered = deferred(),
      release = deferred()
    let paused = false
    disk.hooks.beforeClose = async () => {
      if (!paused) {
        paused = true
        entered.resolve()
        await release.promise
      }
    }
    const first = save(a, left)
    await entered.promise
    const second = save(b, right)
    const outcomes = Promise.allSettled([first, second])
    release.resolve()
    expect((await outcomes).map((result) => result.status)).toEqual(['fulfilled', 'rejected'])
    expect(disk.json('manifest.json').name).toBe('A')
    expect(right.isDirty()).toBe(true)
  })

  test.each([
    'content/actors.json',
    'content/shared-scripts.json',
    'content/maps/start.json',
    'content/scenes/start.json',
    'content/stamps.json',
  ])('opening drift in %s cannot be silently adopted as the old loader state baseline', async (path) => {
    const disk = memoryAuthorDirectory(await buildBlankProject('save-conflict'))
    let changed = false
    disk.hooks.afterRead = (readPath) => {
      if (readPath === path && !changed) {
        changed = true
        disk.set(path, `${new TextDecoder().decode(disk.files.get(path))} `)
      }
    }
    await expect(finishOpen(disk.dir)).rejects.toThrow('修改')
    expect(bindings.size).toBe(0)
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  })

  test('the opening file census covers actual serialization, including raw unhydrated maps, without reading resource bodies', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('save-conflict'))
    const reads: string[] = []
    disk.hooks.afterRead = (path) => {
      reads.push(path)
    }
    const opened = await finishOpen(disk.dir),
      editor = session(opened)
    const paths = authorBaselineSummary(opened.authorBaseline).paths
    const files = await serializeProjectWithMapCopies(editor.getState(), opened.project.source)
    expect(paths).toEqual(Object.keys(files).sort())
    expect(editor.getState().maps).toEqual({})
    expect(paths).toContain('content/maps/start.json')
    for (const asset of Object.values(opened.project.assetCatalog.assets))
      expect(reads).not.toContain(asset.path)
    expect(authorBaselineSummary(opened.authorBaseline).bytesRead).toBeGreaterThan(0)
  })

  test('missing, mismatched and copied baseline tokens cannot authorize a bound save', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('save-conflict'))
    const opened = await finishOpen(disk.dir)
    await expect(
      authorizeBoundWorkspaceTarget(opened.workspace, disk.dir, undefined as never),
    ).rejects.toThrow('基线')
    await expect(
      authorizeBoundWorkspaceTarget(opened.workspace, disk.dir, {
        ...opened.authorBaseline,
      } as AuthorDiskBaseline),
    ).rejects.toThrow('基线')
    const other = memoryAuthorDirectory(await buildBlankProject('other'))
    const second = await finishOpen(other.dir)
    await expect(
      authorizeBoundWorkspaceTarget(opened.workspace, disk.dir, second.authorBaseline),
    ).rejects.toThrow('不一致')
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  })

  test('post-authorization drift is checked again inside the mutation lock', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('save-conflict'))
    const opened = await finishOpen(disk.dir)
    const target = await authorizeBoundWorkspaceTarget(
      opened.workspace,
      disk.dir,
      opened.authorBaseline,
    )
    disk.set('content/locale.json', { 'name.hero': 'External' })
    await expect(writeFile(target, 'note.txt', 'new')).rejects.toThrow('修改')
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  })

  test('drift after write-set preparation is rejected at the true first create/close', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('save-conflict'))
    const opened = await finishOpen(disk.dir)
    const files = await serializeProjectWithMapCopies(
      session(opened).getState(),
      opened.project.source,
    )
    const target = await authorizeBoundWorkspaceTarget(
      opened.workspace,
      disk.dir,
      opened.authorBaseline,
    )
    await expect(
      writeProject(target, files, {
        onProgress: () => disk.set('content/locale.json', { 'name.hero': 'External' }),
      }),
    ).rejects.toThrow('修改')
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  })

  test('a new output path cannot overwrite a preexisting unrelated file', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('save-conflict'))
    disk.set('notes/keep.txt', 'keep')
    const opened = await finishOpen(disk.dir)
    const target = await authorizeBoundWorkspaceTarget(
      opened.workspace,
      disk.dir,
      opened.authorBaseline,
    )
    await expect(writeFile(target, 'notes/keep.txt', 'replace')).rejects.toThrow('notes/keep.txt')
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  })

  test('resource bodies are checked on replacement using full content, not just equal length', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('save-conflict'))
    const opened = await finishOpen(disk.dir)
    const asset = Object.values(opened.project.assetCatalog.assets).find(
      (entry) => entry.kind === 'sprite',
    )!
    const original = disk.files.get(asset.path)!.slice(0)
    const drift = new Uint8Array(original.slice(0))
    drift[0] = drift[0]! ^ 1
    disk.set(asset.path, drift.buffer)
    const target = await authorizeBoundWorkspaceTarget(
      opened.workspace,
      disk.dir,
      opened.authorBaseline,
    )
    await expect(writeFile(target, asset.path, original)).rejects.toThrow(asset.path)
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  })

  test('a known partial write can retry, but cannot adopt an unrelated change during failure', async () => {
    for (const external of [false, true]) {
      const disk = memoryAuthorDirectory(await buildBlankProject(`partial-${external}`))
      const opened = await finishOpen(disk.dir),
        editor = session(opened)
      editor.dispatch(new RenameProjectCommand('pending'))
      disk.hooks.beforeClose = (path) => {
        if (path === 'manifest.json') {
          if (external) disk.set('content/locale.json', { 'name.hero': 'External' })
          throw new Error('injected close failure')
        }
      }
      await expect(save(opened, editor)).rejects.toThrow('injected close failure')
      expect(editor.isDirty()).toBe(true)
      disk.hooks.beforeClose = undefined
      disk.resetChanges()
      if (external) {
        await expect(save(opened, editor)).rejects.toThrow('修改')
        expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
      } else {
        await save(opened, editor)
        expect(disk.json('manifest.json').name).toBe('pending')
      }
    }
  })

  test('post-write outside changes reject success and preserve dirty state', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('save-conflict'))
    const opened = await finishOpen(disk.dir),
      editor = session(opened)
    editor.dispatch(new RenameProjectCommand('pending'))
    disk.hooks.afterClose = (path) => {
      if (path === 'manifest.json') disk.set('content/locale.json', { 'name.hero': 'External' })
    }
    await expect(save(opened, editor)).rejects.toThrow('保存后的文件')
    expect(editor.isDirty()).toBe(true)
    disk.hooks.afterClose = undefined
    disk.resetChanges()
    await expect(save(opened, editor)).rejects.toThrow('修改')
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  })

  test('the baseline does not revive explicitly forbidden current manifest script shards', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('save-conflict'))
    const manifest = disk.json('manifest.json')
    manifest.content.scripts = 'content/scripts/'
    disk.set('manifest.json', manifest)
    await expect(finishOpen(disk.dir)).rejects.toThrow('禁止 content.scripts')
    expect(bindings.size).toBe(0)
  })

  test('actual App save callback keeps conflict visible, both sessions usable, and newer disk untouched', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('app-conflict'))
    const a = await finishOpen(disk.dir),
      b = await finishOpen(disk.dir)
    const left = session(a),
      right = session(b)
    const leftApp = appSave(a, left),
      rightApp = appSave(b, right)
    left.dispatch(new UpdateLocaleCommand('name.hero', 'Saved by A'))
    right.dispatch(new RenameProjectCommand('Unsaved B'))
    await leftApp.run()
    expect(leftApp.error).toHaveBeenLastCalledWith('')
    expect(left.isDirty()).toBe(false)
    disk.resetChanges()
    await rightApp.run()
    expect(rightApp.error).toHaveBeenLastCalledWith(expect.stringContaining('本次未写入'))
    expect(rightApp.activity).toHaveBeenLastCalledWith(null)
    expect(right.isDirty()).toBe(true)
    expect(disk.json('content/locale.json')['name.hero']).toBe('Saved by A')
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
    right.dispatch(new RenameProjectCommand('Still usable'))
    expect(right.getState().manifest.name).toBe('Still usable')
  })

  test('actual App first-save uses an empty target baseline then reuses its own advanced baseline', async () => {
    const source = memoryAuthorDirectory(await buildBlankProject('app-first'))
    const opened = await finishOpen(source.dir),
      editor = session(opened)
    // Model the existing unbound HTTP/sandbox author context; no source directory is writable.
    const context = createLocalWorkspaceContext(
      opened.project.manifest.id,
      'local-directory',
      '11111111-1111-4111-8111-111111111111',
    )
    const target = memoryAuthorDirectory()
    const app = appSave({ ...opened, workspace: context }, editor, {
      initialDir: null,
      picker: async () => target.dir,
    })
    editor.dispatch(new RenameProjectCommand('first'))
    await app.run()
    expect(app.error).toHaveBeenLastCalledWith('')
    expect(target.json('manifest.json').name).toBe('first')
    editor.dispatch(new RenameProjectCommand('second'))
    await app.run()
    expect(app.error).toHaveBeenLastCalledWith('')
    expect(target.json('manifest.json').name).toBe('second')
    expect(source.json('manifest.json').name).not.toBe('second')
    const readAgain = await finishOpen(target.dir)
    expect(readAgain.workspace.workspaceId).toBe(context.workspaceId)
  })

  test('actual App does not clear newer author edits made while saving an earlier snapshot', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('app-dirty'))
    const opened = await finishOpen(disk.dir),
      editor = session(opened)
    const app = appSave(opened, editor)
    editor.dispatch(new RenameProjectCommand('snapshot'))
    let once = false
    disk.hooks.beforeClose = () => {
      if (!once) {
        once = true
        editor.dispatch(new RenameProjectCommand('newer'))
      }
    }
    await app.run()
    expect(app.error).toHaveBeenLastCalledWith('')
    expect(disk.json('manifest.json').name).toBe('snapshot')
    expect(editor.getState().manifest.name).toBe('newer')
    expect(editor.isDirty()).toBe(true)
    disk.hooks.beforeClose = undefined
    await app.run()
    expect(disk.json('manifest.json').name).toBe('newer')
    expect(editor.isDirty()).toBe(false)
  })

  test('actual App cancel-first-picker neither writes nor clears dirty', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('app-cancel'))
    const opened = await finishOpen(disk.dir),
      editor = session(opened)
    editor.dispatch(new RenameProjectCommand('pending'))
    const app = appSave(opened, editor, { initialDir: null })
    await app.run()
    expect(editor.isDirty()).toBe(true)
    expect(app.error).not.toHaveBeenCalled()
    expect(app.activity).toHaveBeenLastCalledWith(null)
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  })

  test('actual Root remounts author refs on reopening the same workspace without changing its stable identity', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('reopen'))
    const first = await finishOpen(disk.dir),
      second = await finishOpen(disk.dir)
    const ast = ts.createSourceFile(
      'main.tsx',
      mainSource,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const parts = ast.statements.filter(
      (node) =>
        ts.isFunctionDeclaration(node) &&
        ['Root', 'currentCanonicalScriptState'].includes(node.name?.text ?? ''),
    )
    expect(parts).toHaveLength(2)
    let boot: unknown = 'picker'
    const instance = { current: 0 }
    const env = {
      DEV_AUTO: false,
      useEffect: () => undefined,
      useState: () => [
        boot,
        (value: unknown) => {
          boot = value
        },
      ],
      useRef: () => instance,
      React: {
        createElement: (type: unknown, props: Record<string, unknown>) => ({ type, props }),
      },
      App: 'App',
      ProjectPicker: 'ProjectPicker',
      UI_REVIEW_SAMPLES: false,
      EditSession,
      ScriptEditSession,
      toEditorState,
      loadProjectMap: vi.fn(),
    }
    const code = ts.transpileModule(parts.map((node) => node.getText(ast)).join('\n'), {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.None,
        jsx: ts.JsxEmit.React,
      },
    }).outputText
    const root = new Function(...Object.keys(env), `${code}; return Root;`)(
      ...Object.values(env),
    ) as () => {
      props: {
        key: string
        authorBaseline: AuthorDiskBaseline
        workspace: Opened['workspace']
        onOpened: (opened: Opened) => void
      }
    }
    root().props.onOpened(first)
    const a = root()
    expect(a.props.authorBaseline).toBe(first.authorBaseline)
    a.props.onOpened(second)
    const b = root()
    expect(b.props.authorBaseline).toBe(second.authorBaseline)
    expect(b.props.workspace.workspaceId).toBe(a.props.workspace.workspaceId)
    expect(b.props.key).not.toBe(a.props.key)
  })

  test('a second unconsumed first-save authorization cannot discard the first attempt recovery evidence', async () => {
    const disk = memoryAuthorDirectory()
    const workspace = createLocalWorkspaceContext('same-first-attempt', 'blank-project')
    const first = await authorizeFirstSaveTarget(workspace, disk.dir)
    // Both read-only authorizations precede the first write. The unused second token must not
    // replace the shared context's known partial-state evidence with an empty baseline.
    await authorizeFirstSaveTarget(workspace, disk.dir)
    await expect(
      withAuthorizedWorkspaceMutation(first, async (mutation) => {
        await writeFile(mutation, 'own.json', { value: 'first' })
        throw new Error('interrupted')
      }),
    ).rejects.toThrow('interrupted')
    disk.set('own.json', { value: 'outside edit' })
    disk.resetChanges()
    const retry = await authorizeFirstSaveTarget(workspace, disk.dir, {
      resumesInterruptedAttempt: true,
    })
    await expect(writeFile(retry, 'retry.json', { value: 'second' })).rejects.toThrow('修改')
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  })

  test('an interrupted owned scene removal retains exact partial evidence and can finish without deleting other files', async () => {
    const files = await buildBlankProject('remove-retry')
    const index = files['content/scenes/index.json'] as {
      scenes: Array<{ id: string; name: string; path: string }>
    }
    const removedPath = 'content/scenes/optional.json'
    index.scenes.push({ id: 'optional', name: 'optional', path: removedPath })
    files[removedPath] = { ...(files['content/scenes/start.json'] as object), id: 'optional' }
    const disk = memoryAuthorDirectory(files)
    disk.set('keep.txt', 'unmanaged, never delete')
    const opened = await finishOpen(disk.dir)
    const next = await serializeProjectWithMapCopies(
      session(opened).getState(),
      opened.project.source,
    )
    next['content/scenes/index.json'] = {
      ...index,
      scenes: index.scenes.filter((entry) => entry.id !== 'optional'),
    }
    delete next[removedPath]
    const attempt = async () =>
      writeProject(
        await authorizeBoundWorkspaceTarget(opened.workspace, disk.dir, opened.authorBaseline),
        next,
        { removePaths: [removedPath] },
      )
    disk.hooks.beforeRemove = () => {
      throw new Error('remove interrupted')
    }
    await expect(attempt()).rejects.toThrow('remove interrupted')
    expect(disk.files.has(removedPath)).toBe(true)
    disk.hooks.beforeRemove = undefined
    await attempt()
    expect(disk.files.has(removedPath)).toBe(false)
    expect(new TextDecoder().decode(disk.files.get('keep.txt'))).toBe('unmanaged, never delete')
    expect((await finishOpen(disk.dir)).scenes.map((scene) => scene.id)).toEqual(['start'])
  })
})
