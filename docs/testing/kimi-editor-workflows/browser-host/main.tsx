/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 最小浏览器宿主（直接组件宿主，非完整 App 入口）。
 * 真实组件 + 真实 EditSession/EditorAssetReader/命令/真实 serializeProject 序列化 + FSA 双写盘 + loader 重读链；壳层授权/journal 为平台原生件不在宿主范围；
 * 磁盘为内存 FSA 端口替身（与核心保存测试同款 memoryAuthorDirectory）。
 */
import '../../../../packages/editor/src/ui/design-system/index.css'
import '../../../../packages/editor/src/ui/editor.css'
import '../../../../packages/editor/src/ui/design-system/form-scope.css'
import {
  type FileSource,
  fsaSource,
  loadAllAuthorScenes,
  loadAllProjectMaps,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { memoryAuthorDirectory } from '../../../../packages/editor/src/core/__tests__/author-save-fixture.js'
import { type EditorState, EditSession } from '../../../../packages/editor/src/core/edit-session.js'
import { createEditorAssetReader } from '../../../../packages/editor/src/core/editor-asset-reader.js'
import { assertProjectSaveValid } from '../../../../packages/editor/src/core/project-diagnostics.js'
import {
  serializeProjectWithMapCopies,
  toEditorState,
} from '../../../../packages/editor/src/core/project-io.js'
import { collectCurrentProjectReferenceIndex } from '../../../../packages/editor/src/core/project-reference-adapters.js'
import { buildBlankProject } from '../../../../packages/editor/src/core/seed.js'
import { BattleSpriteLibrary } from '../../../../packages/editor/src/ui/BattleSpriteLibrary.js'
import { TilesetTab } from '../../../../packages/editor/src/ui/TilesetTab.js'

/**
 * 内存 FSA 句柄的对象字面量方法属 own property，进不了 IDB structured clone。
 * 包一层原型方法委托（own 只留 kind/name 数据，inner 走 WeakMap 不参与克隆），
 * 保存 journal/registry 的 IDB 持久化臂因此可走真实实现；功能调用仍落原句柄。
 */
const innerDirOf = new WeakMap<object, FileSystemDirectoryHandle>()
const innerFileOf = new WeakMap<object, FileSystemFileHandle>()

function unwrapDir(handle: FileSystemDirectoryHandle): FileSystemDirectoryHandle {
  return innerDirOf.get(handle) ?? handle
}

function cloneableFileHandle(inner: FileSystemFileHandle): FileSystemFileHandle {
  const target = { kind: 'file' as const, name: inner.name }
  innerFileOf.set(target, inner)
  Object.setPrototypeOf(target, {
    getFile: () => inner.getFile(),
    createWritable: (opts?: FileSystemWritableOptions) => inner.createWritable(opts),
    isSameEntry: (other: FileSystemHandle) =>
      inner.isSameEntry(innerFileOf.get(other) ?? (other as FileSystemFileHandle)),
  })
  return target as unknown as FileSystemFileHandle
}

function cloneableDirHandle(inner: FileSystemDirectoryHandle): FileSystemDirectoryHandle {
  const target = { kind: 'directory' as const, name: inner.name }
  innerDirOf.set(target, inner)
  Object.setPrototypeOf(target, {
    isSameEntry: (other: FileSystemHandle) =>
      inner.isSameEntry(unwrapDir(other as FileSystemDirectoryHandle)),
    resolve: (other: FileSystemHandle) =>
      inner.resolve(unwrapDir(other as FileSystemDirectoryHandle)),
    getDirectoryHandle: async (name: string, opts?: { create?: boolean }) =>
      cloneableDirHandle(await inner.getDirectoryHandle(name, opts)),
    getFileHandle: async (name: string, opts?: { create?: boolean }) =>
      cloneableFileHandle(await inner.getFileHandle(name, opts)),
    removeEntry: (name: string, opts?: { recursive?: boolean }) => inner.removeEntry(name, opts),
    entries: () => inner.entries(),
    keys: () => inner.keys(),
    values: () => inner.values(),
  })
  return target as unknown as FileSystemDirectoryHandle
}

interface HostContext {
  session: EditSession
  source: FileSource
  assetBase: Awaited<ReturnType<typeof loadCurrentProjectFrom>>['assetBase']
  reload: () => Promise<EditorState>
}

interface HostApi {
  session: EditSession
  catalogIds: () => string[]
  save: () => Promise<{ files: number }>
  reload: () => Promise<{ battleSprites: number; tilesets: number; assets: string[] }>
  /** 读取已保存目录中的文件文本（取证/排障用）。 */
  readSavedFile: (rel: string) => Promise<string>
}

declare global {
  interface Window {
    __kimiHost?: HostApi
  }
}

function setStatus(message: string, error = false): void {
  const el = document.getElementById('kimi-host-status')
  if (!el) return
  el.textContent = message
  el.classList.toggle('error', error)
}

function Workbench(props: { context: HostContext; component: string }) {
  const { session } = props.context
  useSyncExternalStore(
    (callback) => session.subscribe(callback),
    () => session.getVersion(),
  )
  const current = session.getState()
  const [view, setView] = useState<'definition' | 'asset'>('definition')
  const [focus, setFocus] = useState<string | undefined>(undefined)
  const reader = createEditorAssetReader(props.context.source, () => session.getState())
  if (props.component === 'tileset')
    return (
      <TilesetTab
        tilesets={current.tilesets}
        assetCatalog={current.assetCatalog}
        assetReader={reader}
        assetBase={props.context.assetBase}
        session={session}
        mapIndex={current.mapIndex}
        tabBar={null}
        focusObjectId={focus}
        onObjectFocus={setFocus}
      />
    )
  return (
    <BattleSpriteLibrary
      definitions={current.battleSprites}
      catalog={current.assetCatalog}
      assetBase={props.context.assetBase}
      assetReader={reader}
      session={session}
      tabBar={null}
      view={view}
      focusObjectId={focus}
      onViewChange={(next, objectId) => {
        setView(next)
        setFocus(objectId)
      }}
      onObjectFocus={setFocus}
      onWorldDomain={() => undefined}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
      onStatusNotice={(notice) => {
        if (notice) setStatus(notice.message, notice.kind === 'error')
      }}
    />
  )
}

async function boot(): Promise<void> {
  const component =
    new URLSearchParams(window.location.search).get('component') ?? 'battle-sprite-library'
  const disk = memoryAuthorDirectory(await buildBlankProject('kimi-browser-host'))
  const dir = cloneableDirHandle(disk.dir)
  const source = fsaSource(dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const maps = await loadAllProjectMaps(project)
  const state = toEditorStateChecked(project, scenes, maps)
  const session = new EditSession(state)

  let savedDir: FileSystemDirectoryHandle | undefined
  // 壳层授权/journal 是 FSA 平台原生持久化件（核心保存测试亦以 store mock 覆盖），
  // 宿主取证组件→真实序列化器→FSA 双写盘→真实 loader 重读这一段。
  const save: HostApi['save'] = async () => {
    const files = await serializeProjectWithMapCopies(session.getState(), source)
    savedDir = await dir.getDirectoryHandle('saved-roundtrip', { create: true })
    for (const [rel, value] of Object.entries(files)) {
      const segments = rel.split('/')
      let cursor = savedDir
      for (const segment of segments.slice(0, -1))
        cursor = await cursor.getDirectoryHandle(segment, { create: true })
      const name = segments[segments.length - 1]
      if (!name) throw new Error(`非法文件路径 ${rel}`)
      const handle = await cursor.getFileHandle(name, { create: true })
      const writable = await handle.createWritable()
      // 与 writeProject/内存盘 encode 同规格：ArrayBuffer 原样；字符串原样（地图 copy-through）；
      // 其余对象 JSON + 换行。
      await writable.write(
        value instanceof ArrayBuffer
          ? value
          : typeof value === 'string'
            ? value
            : `${JSON.stringify(value, null, 2)}\n`,
      )
      await writable.close()
    }
    session.markSaved()
    return { files: Object.keys(files).length }
  }
  const reload: HostApi['reload'] = async () => {
    if (!savedDir) throw new Error('尚未保存，无可重读目录')
    const savedSource = fsaSource(savedDir)
    const next = await loadCurrentProjectFrom(savedSource)
    const nextScenes = await loadAllAuthorScenes(next)
    const nextMaps = await loadAllProjectMaps(next)
    const nextState = toEditorStateChecked(next, nextScenes, nextMaps)
    return {
      battleSprites: nextState.battleSprites.length,
      tilesets: nextState.tilesets.length,
      assets: Object.keys(nextState.assetCatalog.assets).sort(),
    }
  }
  window.__kimiHost = {
    session,
    catalogIds: () => Object.keys(session.getState().assetCatalog.assets).sort(),
    save,
    reload,
    readSavedFile: async (rel) => {
      if (!savedDir) throw new Error('尚未保存，无可读目录')
      const segments = rel.split('/')
      let cursor = savedDir
      for (const segment of segments.slice(0, -1)) cursor = await cursor.getDirectoryHandle(segment)
      const name = segments[segments.length - 1]
      if (!name) throw new Error(`非法文件路径 ${rel}`)
      const handle = await cursor.getFileHandle(name)
      return (await handle.getFile()).text()
    },
  }

  function Shell() {
    return (
      <>
        <div id="kimi-host-bar">
          <b>kimi-host</b>
          <span>场景：{component}</span>
          <button
            type="button"
            id="kimi-save"
            onClick={() => {
              save()
                .then((result) => setStatus(`已保存 ${result.files} 个文件`))
                .catch((reason: unknown) =>
                  setStatus(reason instanceof Error ? reason.message : String(reason), true),
                )
            }}
          >
            保存到临时项目
          </button>
          <span id="kimi-host-status">就绪</span>
        </div>
        <div id="kimi-workbench" class="body">
          <Workbench
            context={{ session, source, assetBase: project.assetBase, reload }}
            component={component}
          />
        </div>
      </>
    )
  }
  createRoot(document.getElementById('root')!).render(<Shell />)
  setStatus('就绪')
}

function toEditorStateChecked(
  project: Awaited<ReturnType<typeof loadCurrentProjectFrom>>,
  scenes: Awaited<ReturnType<typeof loadAllAuthorScenes>>,
  maps: Awaited<ReturnType<typeof loadAllProjectMaps>>,
): EditorState {
  const state = toEditorState(project, scenes, maps, {}, [])
  assertProjectSaveValid(state)
  return state
}

boot().catch((reason: unknown) =>
  setStatus(reason instanceof Error ? reason.message : String(reason), true),
)
