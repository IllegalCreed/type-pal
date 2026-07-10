import { describe, expect, test } from 'vitest'
import { copyDirRecursive } from './fsa-copy.js'

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
        async write(v: File | Blob | Uint8Array) {
          chunks.push(
            v instanceof Uint8Array ? v : new Uint8Array(await (v as Blob).arrayBuffer()),
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

describe('copyDirRecursive(另存为整树拷贝 —— 素材不丢)', () => {
  test('嵌套树逐字节拷贝(文本 + 二进制)', async () => {
    const bin = new Uint8Array([1, 2, 3, 250, 251])
    const src = tree({
      'manifest.json': '{"id":"p"}',
      'assets/sprites/0.rle': bin,
      'content/scenes/s000.json': '{"id":"s000"}',
    })
    const dst: MemDir = { kind: 'directory', name: 'dst', children: new Map() }
    const n = await copyDirRecursive(dirHandle(src), dirHandle(dst))
    expect(n).toBe(3)
    const flat = flatten(dst)
    expect(Object.keys(flat).sort()).toEqual([
      'assets/sprites/0.rle',
      'content/scenes/s000.json',
      'manifest.json',
    ])
    expect(flat['assets/sprites/0.rle']).toEqual(bin)
    expect(new TextDecoder().decode(flat['manifest.json'])).toBe('{"id":"p"}')
  })

  test('目标已有文件:同名覆盖、他文件保留', async () => {
    const src = tree({ 'a.txt': 'new' })
    const dstTree = tree({ 'a.txt': 'old', 'keep.txt': 'keep' })
    await copyDirRecursive(dirHandle(src), dirHandle(dstTree))
    const flat = flatten(dstTree)
    expect(new TextDecoder().decode(flat['a.txt'])).toBe('new')
    expect(new TextDecoder().decode(flat['keep.txt'])).toBe('keep')
  })
})
