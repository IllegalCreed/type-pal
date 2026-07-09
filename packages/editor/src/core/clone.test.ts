import type { FileSource } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { cloneFromPal } from './clone.js'

function memSource(files: Record<string, unknown>): FileSource {
  return {
    readText: async (rel) => JSON.stringify(files[rel]),
    readJson: async <T>(rel: string) => {
      if (!(rel in files)) throw new Error(`memSource 404 ${rel}`)
      return files[rel] as T
    },
    readBytes: async (rel) => {
      if (!(rel in files)) throw new Error(`memSource 404 ${rel}`)
      return files[rel] as ArrayBuffer
    },
    urlFor: async (rel) => rel,
  }
}

/** 录写 mock 目录句柄:createWritable 的 write→close 把内容记进 written(全路径为键)。 */
function recordingDir(): { dir: FileSystemDirectoryHandle; written: Map<string, unknown> } {
  const written = new Map<string, unknown>()
  const make = (prefix: string): FileSystemDirectoryHandle =>
    ({
      async getDirectoryHandle(name: string) {
        return make(prefix ? `${prefix}/${name}` : name)
      },
      async getFileHandle(name: string) {
        const full = prefix ? `${prefix}/${name}` : name
        return {
          async createWritable() {
            let buf: unknown
            return {
              async write(v: unknown) {
                buf = v
              },
              async close() {
                written.set(full, buf)
              },
            }
          },
        }
      },
    }) as unknown as FileSystemDirectoryHandle
  return { dir: make(''), written }
}

describe('cloneFromPal', () => {
  const manifest = {
    id: 'pal',
    name: 'PAL',
    contentVersion: 1,
    entryScene: 's1',
    content: { actors: 'content/actors.json', scenes: 'content/scenes/' },
    assets: {
      root: '/extracted/data',
      maps: 'tilemap',
      tilesets: 'tileset',
      sprites: 'sprite',
      palettes: 'palette',
      portraits: '/baked/portraits',
    },
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
  }
  const seedFiles: Record<string, unknown> = {
    'manifest.json': manifest,
    'content/scenes/index.json': ['s1'],
    '/extracted/asset-manifest.json': { files: [{ path: 'data/tileset/1.rle', size: 100 }] },
    '/baked/baked-manifest.json': { files: [{ path: 'portraits/1.png', size: 50 }] },
    'content/actors.json': [{ id: 'a' }],
    'content/scenes/s1.json': { id: 's1' },
    '/extracted/data/tileset/1.rle': new ArrayBuffer(100),
    '/baked/portraits/1.png': new ArrayBuffer(50),
  }

  test('写相对化 manifest + 全部内容/素材文件;进度累计到满', async () => {
    const { dir, written } = recordingDir()
    const prog: Array<[number, number]> = []
    await cloneFromPal(memSource(seedFiles), dir, (d, t) => prog.push([d, t]))

    // manifest 相对化落盘
    const m = JSON.parse(written.get('manifest.json') as string)
    expect(m.assets.root).toBe('assets/extracted/data')
    expect(m.assets.portraits).toBe('assets/baked/portraits')
    // 内容 + 场景 + 素材(extracted/baked)都写了
    expect(written.has('content/actors.json')).toBe(true)
    expect(written.has('content/scenes/index.json')).toBe(true)
    expect(written.has('content/scenes/s1.json')).toBe(true)
    expect(written.has('assets/extracted/data/tileset/1.rle')).toBe(true)
    expect(written.has('assets/baked/portraits/1.png')).toBe(true)
    // 进度:末次 = 满(100 + 50)
    expect(prog.at(-1)).toEqual([150, 150])
  })
})
