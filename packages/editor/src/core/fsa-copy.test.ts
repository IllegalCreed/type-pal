import { describe, expect, test, vi } from 'vitest'

vi.mock('./handle-store.js', () => ({
  loadWorkspaceRecord: async () => null,
  findWorkspaceRecordByHandle: async () => null,
  withWorkspaceDiscoveryLock: async (operation: () => Promise<unknown>) => operation(),
  withWorkspaceRegistrationLock: async (
    _workspaceId: string,
    operation: (lock: object) => Promise<unknown>,
  ) => operation(Object.freeze({})),
  saveWorkspaceHandleUnderLock: async () => undefined,
}))

import { copyDirRecursive } from './fsa-copy.js'
import { writeFile } from './project-io.js'
import { createLocalWorkspaceContext } from './workspace-context.js'
import {
  authorizeFirstSaveTarget,
  withAuthorizedWorkspaceMutation,
} from './workspace-persistence.js'

/** 双向内存 FSA mock(entries 迭代 + create 写;copy 测试专用)。 */
interface MemDir {
  kind: 'directory'
  name: string
  children: Map<string, MemDir | MemFile>
}
interface MemFile {
  kind: 'file'
  name: string
  data: Uint8Array
}

function dirHandle(d: MemDir): FileSystemDirectoryHandle {
  return {
    kind: 'directory',
    name: d.name,
    async *entries() {
      for (const [name, node] of d.children) {
        yield [name, node.kind === 'file' ? fileHandle(node) : dirHandle(node)]
      }
    },
    async getDirectoryHandle(name: string, opts?: { create?: boolean }) {
      let node = d.children.get(name)
      if (!node && opts?.create) {
        node = { kind: 'directory', name, children: new Map() }
        d.children.set(name, node)
      }
      if (!node || node.kind !== 'directory') throw new DOMException(name, 'NotFoundError')
      return dirHandle(node)
    },
    async getFileHandle(name: string, opts?: { create?: boolean }) {
      let node = d.children.get(name)
      if (!node && opts?.create) {
        node = { kind: 'file', name, data: new Uint8Array() }
        d.children.set(name, node)
      }
      if (!node || node.kind !== 'file') throw new DOMException(name, 'NotFoundError')
      return fileHandle(node)
    },
  } as unknown as FileSystemDirectoryHandle
}

function fileHandle(f: MemFile): FileSystemFileHandle {
  return {
    kind: 'file',
    name: f.name,
    async getFile() {
      return new File([f.data as BlobPart], f.name)
    },
    async createWritable() {
      const chunks: Uint8Array[] = []
      return {
        async write(v: File | Blob | Uint8Array | string) {
          chunks.push(
            typeof v === 'string'
              ? new TextEncoder().encode(v)
              : v instanceof Uint8Array
                ? v
                : new Uint8Array(await (v as Blob).arrayBuffer()),
          )
        },
        async close() {
          const total = chunks.reduce((a, c) => a + c.length, 0)
          const out = new Uint8Array(total)
          let p = 0
          for (const c of chunks) {
            out.set(c, p)
            p += c.length
          }
          f.data = out
        },
      }
    },
  } as unknown as FileSystemFileHandle
}

function tree(files: Record<string, Uint8Array | string>): MemDir {
  const root: MemDir = { kind: 'directory', name: 'root', children: new Map() }
  for (const [path, v] of Object.entries(files)) {
    const segs = path.split('/')
    const fname = segs.pop()!
    let d = root
    for (const s of segs) {
      let sub = d.children.get(s)
      if (!sub) {
        sub = { kind: 'directory', name: s, children: new Map() }
        d.children.set(s, sub)
      }
      d = sub as MemDir
    }
    d.children.set(fname, {
      kind: 'file',
      name: fname,
      data: typeof v === 'string' ? new TextEncoder().encode(v) : v,
    })
  }
  return root
}

function flatten(d: MemDir, prefix = ''): Record<string, Uint8Array> {
  const out: Record<string, Uint8Array> = {}
  for (const [name, node] of d.children) {
    if (node.kind === 'file') out[`${prefix}${name}`] = node.data
    else Object.assign(out, flatten(node, `${prefix}${name}/`))
  }
  return out
}

async function localTarget(dir: FileSystemDirectoryHandle) {
  return authorizeFirstSaveTarget(
    createLocalWorkspaceContext('copy-test', 'save-as', '33333333-3333-4333-8333-333333333333'),
    dir,
  )
}

describe('copyDirRecursive(另存为整树拷贝 —— 素材不丢)', () => {
  test('嵌套树逐字节拷贝(文本 + 二进制)', async () => {
    const bin = new Uint8Array([1, 2, 3, 250, 251])
    const src = tree({
      'manifest.json': '{"id":"p"}',
      'assets/generated/sprites/starter.rle': bin,
      'content/scenes/s000.json': '{"id":"s000"}',
    })
    const dst: MemDir = { kind: 'directory', name: 'dst', children: new Map() }
    const n = await copyDirRecursive(dirHandle(src), await localTarget(dirHandle(dst)))
    expect(n).toBe(3)
    const flat = flatten(dst)
    expect(Object.keys(flat).sort()).toEqual([
      'assets/generated/sprites/starter.rle',
      'content/scenes/s000.json',
      'manifest.json',
    ])
    expect(flat['assets/generated/sprites/starter.rle']).toEqual(bin)
    expect(new TextDecoder().decode(flat['manifest.json'])).toBe('{"id":"p"}')
  })

  test('目标已有文件:同名覆盖、他文件保留', async () => {
    const src = tree({ 'a.txt': 'new' })
    const dstTree = tree({})
    const target = await localTarget(dirHandle(dstTree))
    // Same operation may stage files before the source-tree copy; external mutations between
    // authorization and first write are rejected by the target guard.
    await withAuthorizedWorkspaceMutation(target, async (mutation) => {
      await writeFile(mutation, 'a.txt', 'old')
      await writeFile(mutation, 'keep.txt', 'keep')
      await copyDirRecursive(dirHandle(src), mutation)
    })
    const flat = flatten(dstTree)
    expect(new TextDecoder().decode(flat['a.txt'])).toBe('new')
    expect(new TextDecoder().decode(flat['keep.txt'])).toBe('keep')
  })

  test('另存为不复制源工作区 identity，普通内容仍完整复制', async () => {
    const src = tree({
      '.type-pal/workspace.json': '{"workspaceId":"old"}',
      '.type-pal/pal-development.json': '{"workspaceId":"pal"}',
      '.TYPE-PAL/alias.json': '{"must":"not-copy"}',
      '.type-pal./windows-alias.json': '{"must":"not-copy"}',
      'content/data.json': '{"ok":true}',
    })
    const dst = tree({})
    const target = await localTarget(dirHandle(dst))
    await copyDirRecursive(dirHandle(src), target)
    const flat = flatten(dst)
    expect(flat['.type-pal/workspace.json']).toBeUndefined()
    expect(flat['.type-pal/pal-development.json']).toBeUndefined()
    expect(flat['.TYPE-PAL/alias.json']).toBeUndefined()
    expect(flat['.type-pal./windows-alias.json']).toBeUndefined()
    expect(new TextDecoder().decode(flat['content/data.json'])).toBe('{"ok":true}')
  })

  test('慢源文件读取期间目标 identity 漂移，首个目标 create 前重验并保持零写', async () => {
    const dst = tree({})
    const target = await localTarget(dirHandle(dst))
    const sourceFile = {
      kind: 'file',
      name: 'late.txt',
      async getFile() {
        // Simulate another actor changing the destination while a large source file is loading.
        dst.children.set('intruder.txt', {
          kind: 'file',
          name: 'intruder.txt',
          data: new TextEncoder().encode('external'),
        })
        return new File(['late'], 'late.txt')
      },
    } as unknown as FileSystemFileHandle
    const source = {
      kind: 'directory',
      name: 'slow-source',
      async *entries() {
        yield ['late.txt', sourceFile] as const
      },
    } as unknown as FileSystemDirectoryHandle

    await expect(copyDirRecursive(source, target)).rejects.toThrow('目标文件夹必须为空')
    expect(flatten(dst)['late.txt']).toBeUndefined()
    expect(new TextDecoder().decode(flatten(dst)['intruder.txt'])).toBe('external')
  })

  test('首项为子目录时也先读取嵌套慢文件，再重验并保持目标子目录零创建', async () => {
    const dst = tree({})
    const target = await localTarget(dirHandle(dst))
    const nestedFile = {
      kind: 'file',
      name: 'late.txt',
      async getFile() {
        dst.children.set('intruder.txt', {
          kind: 'file',
          name: 'intruder.txt',
          data: new TextEncoder().encode('external'),
        })
        return new File(['late'], 'late.txt')
      },
    } as unknown as FileSystemFileHandle
    const nested = {
      kind: 'directory',
      name: 'nested',
      async *entries() {
        yield ['late.txt', nestedFile] as const
      },
    } as unknown as FileSystemDirectoryHandle
    const source = {
      kind: 'directory',
      name: 'slow-source',
      async *entries() {
        yield ['nested', nested] as const
      },
    } as unknown as FileSystemDirectoryHandle

    await expect(copyDirRecursive(source, target)).rejects.toThrow('目标文件夹必须为空')
    expect(dst.children.has('nested')).toBe(false)
    expect(new TextDecoder().decode(flatten(dst)['intruder.txt'])).toBe('external')
  })

  test('首项为空目录、后续为慢文件时，完整读取源树后才允许首次目标创建', async () => {
    const dst = tree({})
    const target = await localTarget(dirHandle(dst))
    const empty = {
      kind: 'directory',
      name: 'empty',
      async *entries() {},
    } as unknown as FileSystemDirectoryHandle
    const lateFile = {
      kind: 'file',
      name: 'late.txt',
      async getFile() {
        dst.children.set('intruder.txt', {
          kind: 'file',
          name: 'intruder.txt',
          data: new TextEncoder().encode('external'),
        })
        return new File(['late'], 'late.txt')
      },
    } as unknown as FileSystemFileHandle
    const source = {
      kind: 'directory',
      name: 'slow-source',
      async *entries() {
        yield ['empty', empty] as const
        yield ['late.txt', lateFile] as const
      },
    } as unknown as FileSystemDirectoryHandle

    await expect(copyDirRecursive(source, target)).rejects.toThrow('目标文件夹必须为空')
    expect(dst.children.has('empty')).toBe(false)
    expect(flatten(dst)['late.txt']).toBeUndefined()
    expect(new TextDecoder().decode(flatten(dst)['intruder.txt'])).toBe('external')
  })
})
