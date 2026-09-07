import { fsaSource, type LoadedCurrentProjectCore } from '@type-pal/reforge'
import { observeAuthorSource } from '../author-disk-baseline.js'

export function memoryAuthorDirectory(initial: Record<string, unknown> = {}) {
  const files = new Map<string, ArrayBuffer>()
  const directories = new Set([''])
  const changes = { creates: [] as string[], closes: [] as string[], removes: [] as string[] }
  const hooks: {
    afterRead?: (path: string) => void | Promise<void>
    beforeClose?: (path: string) => void | Promise<void>
    afterClose?: (path: string) => void | Promise<void>
    beforeRemove?: (path: string) => void | Promise<void>
  } = {}
  const encode = (value: unknown): ArrayBuffer =>
    value instanceof ArrayBuffer
      ? value.slice(0)
      : new TextEncoder().encode(
          typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`,
        ).buffer
  const set = (path: string, value: unknown) => {
    const segments = path.split('/')
    segments.pop()
    for (let i = 1; i <= segments.length; i++) directories.add(segments.slice(0, i).join('/'))
    files.set(path, encode(value))
  }
  for (const [path, value] of Object.entries(initial)) set(path, value)
  const handles = new Map<string, FileSystemDirectoryHandle>()
  const directory = (prefix: string): FileSystemDirectoryHandle => {
    const cached = handles.get(prefix)
    if (cached) return cached
    const pathOf = (name: string) => (prefix ? `${prefix}/${name}` : name)
    const dir = {
      kind: 'directory',
      name: prefix.split('/').at(-1) || 'author-test',
      async isSameEntry(other: FileSystemHandle) {
        return other === dir
      },
      async resolve(other: FileSystemHandle) {
        for (const [path, handle] of handles)
          if (handle === other && (path === prefix || path.startsWith(`${prefix}/`) || !prefix))
            return path
              .slice(prefix ? prefix.length + 1 : 0)
              .split('/')
              .filter(Boolean)
        return null
      },
      async *entries() {
        const seen = new Set<string>()
        for (const path of [...directories, ...files.keys()]) {
          if (path === prefix || (prefix && !path.startsWith(`${prefix}/`))) continue
          const name = path.slice(prefix ? prefix.length + 1 : 0).split('/')[0]!
          if (!name || seen.has(name)) continue
          seen.add(name)
          yield [
            name,
            directories.has(pathOf(name)) ? directory(pathOf(name)) : await dir.getFileHandle(name),
          ]
        }
      },
      async getDirectoryHandle(name: string, opts?: { create?: boolean }) {
        const path = pathOf(name)
        if (!directories.has(path)) {
          if (!opts?.create) throw new DOMException(path, 'NotFoundError')
          if (files.has(path)) throw new DOMException(path, 'TypeMismatchError')
          directories.add(path)
          changes.creates.push(path)
        }
        return directory(path)
      },
      async getFileHandle(name: string, opts?: { create?: boolean }) {
        const path = pathOf(name)
        if (directories.has(path)) throw new DOMException(path, 'TypeMismatchError')
        if (!files.has(path)) {
          if (!opts?.create) throw new DOMException(path, 'NotFoundError')
          files.set(path, new ArrayBuffer(0))
          changes.creates.push(path)
        }
        return {
          kind: 'file',
          name,
          async getFile() {
            const data = files.get(path)
            if (!data) throw new DOMException(path, 'NotFoundError')
            const file = new Blob([data.slice(0)])
            const readBytes = file.arrayBuffer.bind(file)
            file.arrayBuffer = async () => {
              const bytes = await readBytes()
              await hooks.afterRead?.(path)
              return bytes
            }
            return file as File
          },
          async createWritable() {
            let pending: ArrayBuffer | undefined
            return {
              async write(value: unknown) {
                pending = value instanceof Blob ? await value.arrayBuffer() : encode(value)
              },
              async close() {
                await hooks.beforeClose?.(path)
                if (!pending) throw new Error('nothing written')
                files.set(path, pending)
                changes.closes.push(path)
                await hooks.afterClose?.(path)
              },
            }
          },
        } as FileSystemFileHandle
      },
      async removeEntry(name: string) {
        const path = pathOf(name)
        await hooks.beforeRemove?.(path)
        if (!files.delete(path)) throw new DOMException(path, 'NotFoundError')
        changes.removes.push(path)
      },
    } as unknown as FileSystemDirectoryHandle
    handles.set(prefix, dir)
    return dir
  }
  return {
    dir: directory(''),
    files,
    set,
    hooks,
    changes,
    json: (path: string) => JSON.parse(new TextDecoder().decode(files.get(path))),
    resetChanges() {
      changes.creates.length = 0
      changes.closes.length = 0
      changes.removes.length = 0
    },
  }
}

export function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

/** Existing policy unit fixtures omit canonical loader data; capture their actual bytes once. */
export async function capturePolicyFixtureBaseline(
  dir: FileSystemDirectoryHandle,
  projectId: string,
) {
  const observed = observeAuthorSource(fsaSource(dir))
  const visit = async (current: FileSystemDirectoryHandle, prefix = ''): Promise<void> => {
    for await (const [name, handle] of current.entries()) {
      const path = `${prefix}${name}`
      if (handle.kind === 'directory') await visit(handle as FileSystemDirectoryHandle, `${path}/`)
      else await observed.source.readBytes(path)
    }
  }
  await visit(dir)
  return observed.finish(
    {
      manifest: { id: projectId, assets: { catalog: 'assets/index.json' } },
      mapIndex: { maps: [] },
      assetCatalog: { assets: {} },
    } as unknown as LoadedCurrentProjectCore,
    dir,
  )
}
