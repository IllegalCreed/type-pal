import type { FileSource } from '@type-pal/reforge'
import { loadProjectV13From } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { buildBlankProject } from './seed.js'
import { upgradeLocalProjectV12V13 } from './upgrade-local-v12-v13.js'

function memorySource(files: Record<string, string | ArrayBuffer>): FileSource {
  const readText = async (path: string): Promise<string> => {
    const value = files[path]
    if (value === undefined) throw new DOMException(`NotFound ${path}`, 'NotFoundError')
    return typeof value === 'string' ? value : new TextDecoder().decode(value)
  }
  return {
    readText,
    async readJson<T>(path: string) {
      return JSON.parse(await readText(path)) as T
    },
    async readBytes(path) {
      const value = files[path]
      if (value === undefined) throw new DOMException(`NotFound ${path}`, 'NotFoundError')
      return typeof value === 'string' ? new TextEncoder().encode(value).buffer : value
    },
    async urlFor(path) {
      return path
    },
  }
}

function mockDir(
  name: string,
  files: Record<string, string | ArrayBuffer>,
  writes: string[] = [],
  failClose?: (path: string, attempt: number) => boolean,
): FileSystemDirectoryHandle {
  const closeAttempts = new Map<string, number>()
  const make = (prefix: string): FileSystemDirectoryHandle =>
    ({
      name: prefix ? prefix.split('/').pop() : name,
      async getDirectoryHandle(n: string) {
        return make(prefix ? `${prefix}/${n}` : n)
      },
      async getFileHandle(n: string, options?: { create?: boolean }) {
        const full = prefix ? `${prefix}/${n}` : n
        if (!(full in files) && !options?.create)
          throw new DOMException(`NotFound ${full}`, 'NotFoundError')
        if (!(full in files)) files[full] = ''
        return {
          async getFile() {
            const value = files[full] ?? ''
            return {
              size:
                typeof value === 'string'
                  ? new TextEncoder().encode(value).byteLength
                  : value.byteLength,
              text: async () =>
                typeof value === 'string' ? value : new TextDecoder().decode(value),
              arrayBuffer: async () =>
                typeof value === 'string' ? new TextEncoder().encode(value).buffer : value,
            }
          },
          async createWritable() {
            let pending: string | ArrayBuffer = ''
            return {
              async write(value: string | Blob) {
                pending = typeof value === 'string' ? value : await value.arrayBuffer()
              },
              async close() {
                const attempt = (closeAttempts.get(full) ?? 0) + 1
                closeAttempts.set(full, attempt)
                if (failClose?.(full, attempt))
                  throw new DOMException(`Injected close failure ${full}`, 'InvalidStateError')
                files[full] = pending
                writes.push(full)
              },
            }
          },
        } as FileSystemFileHandle
      },
      async *values() {
        const base = prefix ? `${prefix}/` : ''
        const names = new Set(
          Object.keys(files).flatMap((path) => {
            if (!path.startsWith(base)) return []
            const relative = path.slice(base.length)
            return relative && !relative.includes('/') ? [relative] : []
          }),
        )
        for (const entry of [...names].sort()) yield { kind: 'file', name: entry } as FileSystemFileHandle
      },
    }) as unknown as FileSystemDirectoryHandle
  return make('')
}

const J = (value: unknown): string => JSON.stringify(value)

describe('editor content12→content13 upgrade', () => {
  test('manifest-last 且可重试：manifest 失败后 scene 已升 v13，第二次只补 manifest', async () => {
    const built = await buildBlankProject('Upgrade V13')
    const files = Object.fromEntries(
      Object.entries(built).map(([path, value]) => [path, value instanceof ArrayBuffer ? value : J(value)]),
    ) as Record<string, string | ArrayBuffer>
    const scene = JSON.parse(String(files['content/scenes/start.json'])) as {
      entities: Array<Record<string, unknown>>
    }
    scene.entities = [
      {
        id: 'guard',
        pos: { col: 1, row: 1, height: 0 },
        sprite: 'hero',
        facing: 'down',
        hostile: {
          team: 1,
          respawnSeconds: 80,
          onLose: 'gameOver',
        },
      },
    ]
    files['content/scenes/start.json'] = J(scene)
    const manifest = JSON.parse(String(files['manifest.json'])) as {
      contentVersion: number
      minimumSaveVersion: number
    }
    manifest.contentVersion = 12
    files['manifest.json'] = J(manifest)
    expect(manifest.contentVersion).toBe(12)
    const writes: string[] = []
    const dir = mockDir('upgrade-v12-v13', files, writes, (path, attempt) =>
      path === 'manifest.json' && attempt === 1,
    )
    const source = memorySource(files)

    await expect(upgradeLocalProjectV12V13(dir, source, manifest)).rejects.toThrow(
      'Injected close failure manifest.json',
    )
    expect(writes).toEqual(['content/scenes/start.json'])
    expect(JSON.parse(String(files['manifest.json']))).toMatchObject({
      contentVersion: 12,
      minimumSaveVersion: 8,
    })
    expect(JSON.parse(String(files['content/scenes/start.json']))).toMatchObject({
      entities: [
        {
          hostile: {
            team: 1,
            onLose: 'gameOver',
            onVictory: { kind: 'hide', ticks: 800 },
            onPlayerFlee: { kind: 'remain' },
          },
        },
      ],
    })

    writes.length = 0
    await expect(upgradeLocalProjectV12V13(dir, source, manifest)).resolves.toBe(true)
    expect(writes).toEqual(['manifest.json'])
    expect(JSON.parse(String(files['manifest.json']))).toMatchObject({
      contentVersion: 13,
      minimumSaveVersion: 8,
    })

    const loaded = await loadProjectV13From(source)
    expect(loaded.manifest.contentVersion).toBe(13)
    expect(loaded.entryScene.entities[0]?.hostile).toMatchObject({
      team: 1,
      onVictory: { kind: 'hide', ticks: 800 },
      onPlayerFlee: { kind: 'remain' },
    })
  })
})
