import ts from 'typescript'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import mainSource from '../main.tsx?raw'
import appSource from '../ui/App.tsx?raw'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)
beforeEach(() => authorSaveStorage.receipts.clear())

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
  verifySourceAuthorBaseline,
} from './author-disk-baseline.js'
import {
  AddActorCommand,
  AddEntityCommand,
  AddSceneCommand,
  RenameProjectCommand,
  UpdateLocaleCommand,
} from './commands.js'
import { EditSession } from './edit-session.js'
import { createCanonicalPlacedEntity, createPlacedEntity } from './entity-placement.js'
import { finishOpen, type Opened } from './open-actions.js'
import { assetCopyInputs, observeProjectCopySource } from './project-copy-source.js'
import {
  resumeOwnProjectSave,
  serializeProjectWithMapCopies,
  toEditorState,
  writeProject,
} from './project-io.js'
import { ProjectLeaveGuard } from './project-leave-guard.js'
import {
  AddSceneDefinitionCommand,
  AddSceneEntityDefinitionCommand,
  ScriptEditSession,
} from './script-editor.js'
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
    projectGuard: new ProjectLeaveGuard(editor, scriptSession),
    setSaveErr: error,
    setSaveActivity: activity,
    window: { confirm: () => true, setTimeout },
    pickDir: options.picker ?? (() => Promise.resolve(null)),
    serializeProjectWithMapCopies,
    assetCopyInputs,
    observeProjectCopySource,
    verifySourceAuthorBaseline,
    resumeOwnProjectSave,
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
  env.projectGuard.connect()
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
  await resumeOwnProjectSave(opened.workspace, opened.dir!, opened.authorBaseline)
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
    await expect(performPolicyFixtureWrite(target, 'note.txt', 'new')).rejects.toThrow('修改')
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
    ).rejects.toThrow('content/locale.json')
    // Staging is private preparation; the A-02 guarantee here remains zero AUTHOR IO.
    expect(
      Object.fromEntries(
        Object.entries(disk.changes).map(([kind, paths]) => [
          kind,
          paths.filter((path) => path !== '.type-pal' && !path.startsWith('.type-pal/')),
        ]),
      ),
    ).toEqual({ creates: [], closes: [], removes: [] })
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
    await expect(performPolicyFixtureWrite(target, 'notes/keep.txt', 'replace')).rejects.toThrow(
      'notes/keep.txt',
    )
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
    await expect(performPolicyFixtureWrite(target, asset.path, original)).rejects.toThrow(
      asset.path,
    )
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
        await expect(save(opened, editor)).rejects.toThrow('content/locale.json')
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
    await expect(save(opened, editor)).rejects.toThrow('content/locale.json')
    expect(editor.isDirty()).toBe(true)
    disk.hooks.afterClose = undefined
    disk.resetChanges()
    await expect(save(opened, editor)).rejects.toThrow('content/locale.json')
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
        await performPolicyFixtureWrite(mutation, 'own.json', { value: 'first' })
        throw new Error('interrupted')
      }),
    ).rejects.toThrow('interrupted')
    disk.set('own.json', { value: 'outside edit' })
    disk.resetChanges()
    const retry = await authorizeFirstSaveTarget(workspace, disk.dir, {
      resumesInterruptedAttempt: true,
    })
    await expect(
      performPolicyFixtureWrite(retry, 'retry.json', { value: 'second' }),
    ).rejects.toThrow('修改')
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
    const attempt = async () => {
      await resumeOwnProjectSave(opened.workspace, disk.dir, opened.authorBaseline)
      return writeProject(
        await authorizeBoundWorkspaceTarget(opened.workspace, disk.dir, opened.authorBaseline),
        next,
        { removePaths: [removedPath] },
      )
    }
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

  test('actual App save and ordinary reopen complete a new actor and its scene reference together', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('app-recovery'))
    const opened = await finishOpen(disk.dir),
      editor = session(opened)
    const app = appSave(opened, editor)
    const actor = structuredClone(editor.getState().actors[0]!)
    actor.id = 'workflow-npc'
    actor.battler!.baseStats.maxHP = 237
    editor.dispatch(new AddActorCommand(actor))
    editor.dispatch(
      new AddEntityCommand(
        'start',
        createPlacedEntity(
          'workflow-entity',
          { col: 1, row: 1, height: 0 },
          { mode: 'actor', actorId: actor.id },
        ),
      ),
    )
    app.scriptSession.dispatch(
      new AddSceneEntityDefinitionCommand(
        'start',
        createCanonicalPlacedEntity(
          'workflow-entity',
          { col: 1, row: 1, height: 0 },
          { mode: 'actor', actorId: actor.id },
        ),
      ),
    )
    disk.hooks.beforeClose = (path) => {
      if (path === 'content/actors.json') throw new Error('workflow interrupted')
    }
    await app.run()
    expect(app.error).toHaveBeenLastCalledWith('workflow interrupted')
    expect(editor.isDirty()).toBe(true)
    expect(disk.json('content/actors.json').some((a: { id: string }) => a.id === actor.id)).toBe(
      false,
    )
    disk.hooks.beforeClose = undefined
    // No explicit recovery API: the ordinary open action must recover BEFORE its canonical load.
    const reopened = await finishOpen(disk.dir)
    expect(reopened.project.actorsById[actor.id]!.battler!.baseStats.maxHP).toBe(237)
    expect(
      reopened.scenes[0]!.entities.some(
        (e) => e.id === 'workflow-entity' && 'actor' in e && e.actor === actor.id,
      ),
    ).toBe(true)
    await save(reopened, session(reopened))
  })

  test('actual App first-save retry uses its recovered binding even when no author close was observed', async () => {
    const opened = await finishOpen(
      memoryAuthorDirectory(await buildBlankProject('first-save-retry')).dir,
    )
    const editor = session(opened)
    const target = memoryAuthorDirectory()
    const picker = vi.fn(async () => target.dir)
    const app = appSave(
      {
        ...opened,
        workspace: createLocalWorkspaceContext(opened.project.manifest.id, 'blank-project'),
      },
      editor,
      { initialDir: null, picker },
    )
    target.hooks.beforeClose = (path) => {
      if (!path.startsWith('.type-pal/')) throw new Error('first author close failed')
    }
    await app.run()
    expect(app.error).toHaveBeenLastCalledWith('first author close failed')
    target.hooks.beforeClose = undefined
    editor.dispatch(new RenameProjectCommand('new edit while interrupted'))
    await app.run()
    expect(app.error).toHaveBeenLastCalledWith('')
    expect(target.json('manifest.json').name).toBe('new edit while interrupted')
    expect(picker).toHaveBeenCalledTimes(2)
    expect(editor.isDirty()).toBe(false)
    await app.run()
    expect(picker).toHaveBeenCalledTimes(2)
  })

  test('actual App own retry finishes its prior intent then removes a scene undone during interruption', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('undo-pending-scene'))
    const opened = await finishOpen(disk.dir),
      editor = session(opened)
    const app = appSave(opened, editor)
    const added = { ...structuredClone(opened.scenes[0]!), id: 'temporary-scene' }
    const path = 'content/scenes/temporary-scene.json'
    editor.dispatch(
      new AddSceneCommand(
        { id: added.id, name: 'temporary', path },
        { ...structuredClone(editor.getState().scenes[0]!), id: added.id },
      ),
    )
    app.scriptSession.dispatch(new AddSceneDefinitionCommand(added))
    disk.hooks.beforeClose = (p) => {
      if (p === 'content/scenes/start.json') throw new Error('stopped before new scene')
    }
    await app.run()
    expect(app.error).toHaveBeenLastCalledWith('stopped before new scene')
    expect(disk.files.has(path)).toBe(false)
    expect(editor.undo()).toBe(true)
    expect(app.scriptSession.undo()).toBe(true)
    disk.hooks.beforeClose = undefined
    await app.run()
    expect(app.error).toHaveBeenLastCalledWith('')
    expect(disk.files.has(path)).toBe(false)
    expect((await finishOpen(disk.dir)).scenes.map((s) => s.id)).toEqual(['start'])
  })

  test('actual App reports cleanup as saved with warning and IO AbortError as a visible failure', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('cleanup-ui'))
    const opened = await finishOpen(disk.dir),
      editor = session(opened)
    const app = appSave(opened, editor)
    editor.dispatch(new RenameProjectCommand('saved with cleanup warning'))
    disk.hooks.beforeRemove = (path) => {
      if (path.includes('/blobs/')) throw new Error('cleanup denied')
    }
    await app.run()
    expect(app.error).toHaveBeenLastCalledWith(expect.stringContaining('内容已保存'))
    expect(editor.isDirty()).toBe(false)
    disk.hooks.beforeRemove = undefined
    editor.dispatch(new RenameProjectCommand('unsaved after abort'))
    disk.hooks.beforeClose = (path) => {
      if (path === 'manifest.json') throw new DOMException('author write aborted', 'AbortError')
    }
    await app.run()
    expect(app.error).toHaveBeenLastCalledWith('author write aborted')
    expect(editor.isDirty()).toBe(true)
  })

  test('ordinary open refuses force-sandbox repair and conflicting recent identity before author IO', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('open-modes'))
    const opened = await finishOpen(disk.dir),
      editor = session(opened)
    editor.dispatch(new RenameProjectCommand('pending'))
    disk.hooks.beforeClose = (path) => {
      if (path === 'manifest.json') throw new Error('pending stop')
    }
    await expect(save(opened, editor)).rejects.toThrow('pending stop')
    disk.hooks.beforeClose = undefined
    disk.resetChanges()
    await expect(finishOpen(disk.dir, { forceSandbox: true })).rejects.toThrow(
      '评审模式不能恢复源项目',
    )
    const record = bindings.get(opened.workspace.workspaceId)!
    await expect(
      finishOpen(disk.dir, { expectedIdentity: { ...record, projectId: 'another' } }),
    ).rejects.toThrow('工作区身份不符')
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
    expect((await finishOpen(disk.dir)).project.manifest.name).toBe('pending')
  })

  test('a save cannot remove a resource still referenced by its final catalog', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('resource-removal-guard'))
    const opened = await finishOpen(disk.dir)
    const files = await serializeProjectWithMapCopies(
      session(opened).getState(),
      opened.project.source,
    )
    const record = Object.values(opened.project.assetCatalog.assets).find(
      (r) => r.kind === 'sprite',
    )!
    const original = disk.files.get(record.path)!.slice(0)
    await expect(
      writeProject(
        await authorizeBoundWorkspaceTarget(opened.workspace, disk.dir, opened.authorBaseline),
        files,
        { removePaths: [record.path] },
      ),
    ).rejects.toThrow('仍引用的资源')
    expect(disk.files.get(record.path)).toEqual(original)
    expect(disk.changes).toEqual({ creates: [], closes: [], removes: [] })
  })

  test('first save validates missing resource bytes before any author file is published', async () => {
    const files = await buildBlankProject('missing-initial-asset')
    const catalog = files['assets/index.json'] as import('@type-pal/content').AssetCatalogV1
    const record = Object.values(catalog.assets).find((r) => r.kind === 'sprite')!
    delete files[record.path]
    const disk = memoryAuthorDirectory()
    const workspace = createLocalWorkspaceContext('missing-initial-asset', 'blank-project')
    await expect(
      writeProject(await authorizeFirstSaveTarget(workspace, disk.dir), files),
    ).rejects.toThrow(record.path)
    expect([...disk.files.keys()].every((path) => path.startsWith('.type-pal/'))).toBe(true)
    expect(disk.files.has('manifest.json')).toBe(false)
  })

  test('a changed catalog resource must exist even when no new binary was uploaded', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('changed-asset-path'))
    const opened = await finishOpen(disk.dir)
    const files = await serializeProjectWithMapCopies(
      session(opened).getState(),
      opened.project.source,
    )
    const catalog = structuredClone(
      files['assets/index.json'] as import('@type-pal/content').AssetCatalogV1,
    )
    const record = Object.values(catalog.assets).find((r) => r.kind === 'sprite')!
    record.path = 'assets/generated/sprites/unavailable.rle'
    files['assets/index.json'] = catalog
    await expect(
      writeProject(
        await authorizeBoundWorkspaceTarget(opened.workspace, disk.dir, opened.authorBaseline),
        files,
      ),
    ).rejects.toThrow(record.path)
    expect(disk.json('assets/index.json')).toEqual(opened.project.assetCatalog)
    expect(disk.changes.closes.filter((path) => !path.startsWith('.type-pal/'))).toEqual([])
  })

  test('the writer freezes requested content before asynchronous preparation starts', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('frozen-output'))
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
    const pending = writeProject(target, files)
    ;(files['manifest.json'] as { name: string }).name = 'late mutation'
    await pending
    expect(disk.json('manifest.json').name).toBe('frozen-output')
  })

  test('ordinary open holds the workspace lock across recovery and complete author loading', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('locked-open'))
    const opened = await finishOpen(disk.dir)
    const store = await import('./handle-store.js')
    const originalLock = store.withWorkspaceRegistrationLock
    let liveLock: import('./handle-store.js').WorkspaceRegistrationLock | undefined
    const spy = vi
      .spyOn(store, 'withWorkspaceRegistrationLock')
      .mockImplementation((id, operation) =>
        originalLock(id, async (lock) => {
          liveLock = lock
          try {
            return await operation(lock)
          } finally {
            liveLock = undefined
          }
        }),
      )
    const entered = deferred(),
      release = deferred()
    let paused = false
    disk.hooks.afterRead = async (path) => {
      if (!paused && path === 'manifest.json') {
        paused = true
        entered.resolve()
        await release.promise
      }
    }
    const opening = finishOpen(disk.dir)
    try {
      await entered.promise
      expect(liveLock).toBeDefined()
      store.assertWorkspaceRegistrationLock(liveLock!, opened.workspace.workspaceId)
    } finally {
      release.resolve()
      await opening
      spy.mockRestore()
    }
  })

  test('ordinary open explains a missing origin receipt without touching bound or copied pending content', async () => {
    const disk = memoryAuthorDirectory(await buildBlankProject('missing-origin-receipt'))
    const opened = await finishOpen(disk.dir),
      editor = session(opened)
    disk.hooks.beforeClose = (path) => {
      if (path === 'manifest.json') throw new Error('pending before receipt loss')
    }
    await expect(save(opened, editor)).rejects.toThrow('pending before receipt loss')
    disk.hooks.beforeClose = undefined
    authorSaveStorage.receipts.clear()
    const copied = memoryAuthorDirectory(Object.fromEntries(disk.files))
    disk.resetChanges()
    for (const target of [disk, copied]) {
      await expect(finishOpen(target.dir)).rejects.toThrow('回到原浏览器')
      expect(target.changes).toEqual({ creates: [], closes: [], removes: [] })
      expect(target.json('.type-pal/save-state.json').phase).toBe('pending')
    }
  })
})

import { performPolicyFixtureWrite } from './__tests__/policy-io.js'
