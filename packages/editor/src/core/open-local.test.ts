import { normalizeScriptLibrary, type ScriptChunkV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { DeleteAssetCommand, UpsertAssetCommand } from './commands.js'
import { EditSession } from './edit-session.js'
import { openLocalProject } from './open-local.js'
import { serializeProject, toEditorState, writeProject } from './project-io.js'
import type { SoundUpgradeProgress } from './upgrade-local-v2.js'

/** 内存 mock 目录句柄:覆盖 FSA 读、写、删，供 v2 一次性升级集成测试。 */
function mockDir(
  name: string,
  files: Record<string, string | ArrayBuffer>,
  writes: string[] = [],
  mockOptions: { failClose?: (path: string, attempt: number) => boolean } = {},
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
              text: async () => {
                return typeof value === 'string' ? value : new TextDecoder().decode(value)
              },
              arrayBuffer: async () => {
                return typeof value === 'string' ? new TextEncoder().encode(value).buffer : value
              },
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
                if (mockOptions.failClose?.(full, attempt))
                  throw new DOMException(`Injected close failure ${full}`, 'InvalidStateError')
                files[full] = pending
                writes.push(full)
              },
            }
          },
        }
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
        for (const entry of [...names].sort())
          yield { kind: 'file', name: entry } as FileSystemFileHandle
      },
      async removeEntry(n: string) {
        const full = prefix ? `${prefix}/${n}` : n
        if (!(full in files)) throw new DOMException(`NotFound ${full}`, 'NotFoundError')
        delete files[full]
      },
    }) as unknown as FileSystemDirectoryHandle
  return make('')
}

const J = (v: unknown): string => JSON.stringify(v)
const hash = 'a'.repeat(64)

function waveBytes(marker = 0): ArrayBuffer {
  return new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x05, 0, 0, 0, 0x57, 0x41, 0x56, 0x45, marker])
    .buffer
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function soundFamilyManifest(): {
  manifest: Record<string, unknown> & {
    assets: { roles: Record<string, string>; legacy: Record<string, unknown> }
  }
  text: string
} {
  const manifest = JSON.parse(String(fullProject['manifest.json'])) as Record<string, unknown> & {
    assets: { roles: Record<string, string>; legacy: Record<string, unknown> }
  }
  manifest.assets.legacy = {
    ...manifest.assets.legacy,
    families: ['sound', 'tileset', 'sprite', 'color-table'],
    sounds: 'assets/extracted/sounds',
  }
  return { manifest, text: J(manifest) }
}

const fullProject: Record<string, string | ArrayBuffer> = {
  'manifest.json': J({
    id: 'proj',
    name: 'P',
    contentVersion: 3,
    entryScene: 's1',
    content: {
      actors: 'content/actors.json',
      skills: 'content/skills.json',
      items: 'content/items.json',
      locale: 'content/locale.json',
      scenes: 'content/scenes/',
      maps: 'content/maps/index.json',
      tilesets: 'content/tilesets.json',
    },
    assets: {
      catalog: 'assets/index.json',
      roles: {},
      legacy: {
        families: ['tileset', 'sprite', 'color-table'],
        root: 'assets/extracted/data',
        tilesets: 'tileset',
        sprites: 'sprite',
        palettes: 'palette',
      },
    },
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
  }),
  'content/actors.json': J([{ id: 'a', name: 'name.a', spriteId: 'gs' }]),
  'content/skills.json': J({ skills: [], levelUp: {} }),
  'content/items.json': J([]),
  'content/locale.json': J({}),
  'content/scenes/index.json': J(['s1']),
  'content/scenes/s1.json': J({
    id: 's1',
    mapId: 'map-001',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
  }),
  'content/maps/index.json': J({
    version: 1,
    maps: [{ id: 'map-001', name: '地图 1', path: 'content/maps/map-001.json' }],
  }),
  'content/tilesets.json': J([
    { id: 'tileset-001', name: '瓦片集 1', category: 'builtin', path: 'tileset/1.rle' },
  ]),
  'assets/index.json': J({ version: 1, assets: {} }),
}

function v3MusicProject(musicIds: readonly string[], openingMenuMusic?: string) {
  const manifest = JSON.parse(String(fullProject['manifest.json'])) as Record<string, unknown> & {
    assets: { roles: Record<string, string> }
  }
  const fallback = musicIds[0]
  if (!fallback) throw new Error('测试工程至少需要一首音乐')
  manifest.assets.roles = {
    'audio.midiSoundfont': 'soundfont.default',
    'audio.defaultBattleMusic': fallback,
    'audio.bossVictoryMusic': fallback,
    'audio.normalVictoryMusic': fallback,
    ...(openingMenuMusic ? { 'audio.openingMenuMusic': openingMenuMusic } : {}),
  }
  const musicAssets = Object.fromEntries(
    musicIds.map((id) => [
      id,
      {
        kind: 'music',
        path: `assets/migrated/music/${id.slice(-3)}.mid`,
        mediaType: 'audio/midi',
        bytes: 3,
        sha256: hash,
        origin: { kind: 'legacy-migrated' },
      },
    ]),
  )
  return {
    ...fullProject,
    'manifest.json': J(manifest),
    'assets/index.json': J({
      version: 1,
      assets: {
        ...musicAssets,
        'soundfont.default': {
          kind: 'soundfont',
          path: 'assets/runtime/soundfont.sf3',
          mediaType: 'audio/sf3',
          bytes: 3,
          sha256: hash,
          origin: { kind: 'licensed' },
        },
      },
    }),
  }
}

describe('openLocalProject', () => {
  test('有效工程夹 → 装配 project + 全量场景', async () => {
    const { project, scenes } = await openLocalProject(mockDir('my-proj', fullProject))
    expect(project.manifest.id).toBe('proj')
    expect(project.entryScene.id).toBe('s1')
    expect(scenes.map((s) => s.id)).toEqual(['s1'])
    expect(project.source).toBeDefined()
  })

  test('无 manifest.json → 友好报错(带夹名)', async () => {
    await expect(openLocalProject(mockDir('空夹', {}))).rejects.toThrow('空夹')
  })

  test.each([
    {
      name: '优先使用 PAL 004',
      ids: ['music.pal.004', 'music.pal.037'],
      expected: 'music.pal.004',
    },
    {
      name: '缺 004 时按 AssetId 确定性回退',
      ids: ['music.pal.009', 'music.pal.001'],
      expected: 'music.pal.001',
    },
  ])('旧 v3 音乐工程补齐标题菜单角色：$name', async ({ ids, expected }) => {
    const files = v3MusicProject(ids)
    const writes: string[] = []
    const dir = mockDir('old-v3', files, writes)
    const opened = await openLocalProject(dir)
    expect(opened.project.manifest.assets.roles['audio.openingMenuMusic']).toBe(expected)
    expect(writes.filter((path) => path === 'manifest.json')).toHaveLength(1)

    writes.length = 0
    await openLocalProject(dir)
    expect(writes).toEqual([])
  })

  test('已有标题菜单角色不覆盖，无音乐工程不新增角色', async () => {
    const custom = v3MusicProject(['music.pal.004', 'music.pal.009'], 'music.pal.009')
    const customWrites: string[] = []
    const opened = await openLocalProject(mockDir('custom-v3', custom, customWrites))
    expect(opened.project.manifest.assets.roles['audio.openingMenuMusic']).toBe('music.pal.009')
    expect(customWrites).toEqual([])

    const silentFiles = { ...fullProject }
    const silentWrites: string[] = []
    const silent = await openLocalProject(mockDir('silent-v3', silentFiles, silentWrites))
    expect(silent.project.manifest.assets.roles['audio.openingMenuMusic']).toBeUndefined()
    expect(silentWrites).toEqual([])
  })

  test('旧 v3 sound family 复制登记、改写引用并以 manifest 最后发布', async () => {
    const wave = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x04, 0, 0, 0, 0x57, 0x41, 0x56, 0x45])
      .buffer
    const manifest = JSON.parse(String(fullProject['manifest.json'])) as {
      content: Record<string, string>
      assets: { roles: Record<string, string>; legacy: Record<string, unknown> }
    }
    manifest.assets.legacy = {
      ...manifest.assets.legacy,
      families: ['sound', 'tileset', 'sprite', 'color-table'],
      sounds: 'assets/extracted/sounds',
    }
    manifest.content.scripts = 'content/scripts/'
    const rawChunk = {
      version: 1 as const,
      id: 'scene/s1',
      scripts: {
        'scene/s1/test': [{ kind: 'playSound', soundId: 45 }],
      },
    }
    const rawScripts = normalizeScriptLibrary(
      {
        version: 1,
        shards: { shared: 16, global: {} },
        chunks: { 'scene/s1': { path: 'chunks/scene/s1.json', bytes: 0 } },
      },
      { 'scene/s1': rawChunk as unknown as ScriptChunkV1 },
    )
    const files: Record<string, string | ArrayBuffer> = {
      ...fullProject,
      'manifest.json': J(manifest),
      'content/actors.json': J([{ id: 'a', name: 'name.a', spriteId: 'gs' }]),
      'content/skills.json': J({
        skills: [
          {
            id: 's',
            name: 'S',
            cost: { mp: 0 },
            target: 'self',
            effects: [{ kind: 'summon', godId: 1, sound: 5 }],
            animation: { sound: 4 },
          },
        ],
        levelUp: {},
      }),
      'content/items.json': J([
        {
          id: 'i',
          name: 'I',
          icon: 0,
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: { target: 'self', consuming: false, effects: [], sound: 6 },
        },
      ]),
      'content/scenes/s1.json': J({
        id: 's1',
        mapId: 'map-001',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [],
        onEnter: [
          {
            id: 'sounds',
            body: [
              { kind: 'playSound', soundId: 45 },
              { kind: 'playSound', soundId: 122 },
            ],
          },
        ],
      }),
      'content/scripts/index.json': J(rawScripts.index),
      'content/scripts/chunks/scene/s1.json': J(rawChunk),
      ...Object.fromEntries(
        [4, 5, 6, 28, 29, 45, 47].map((id) => [`assets/extracted/sounds/${id}.wav`, wave]),
      ),
    }
    const writes: string[] = []
    const progress: SoundUpgradeProgress[] = []
    const dir = mockDir('old-v3-sounds', files, writes)
    const opened = await openLocalProject(dir, {
      onSoundUpgradeProgress: (value) => progress.push(value),
    })
    expect(opened.project.manifest.assets.legacy?.families).not.toContain('sound')
    expect(opened.project.manifest.assets.legacy?.sounds).toBeUndefined()
    expect(opened.scenes[0]?.onEnter?.[0]?.body).toEqual([
      { kind: 'playSound', asset: 'sound.pal.045' },
    ])
    expect(opened.project.skills.s?.animation.sound).toBe('sound.pal.004')
    expect(opened.project.items.i?.use?.sound).toBe('sound.pal.006')
    expect(opened.scriptChunks['scene/s1']?.scripts['scene/s1/test']).toEqual([
      { kind: 'playSound', asset: 'sound.pal.045' },
    ])
    expect(opened.project.manifest.assets.roles).toMatchObject({
      'audio.battleItemUseSound': 'sound.pal.028',
      'audio.battleCoopCastSound': 'sound.pal.029',
      'audio.battleEscapeSound': 'sound.pal.045',
      'audio.battleEnemyTransformSound': 'sound.pal.047',
    })
    expect(opened.project.assetCatalog.assets['sound.pal.122']).toBeUndefined()
    expect(files['assets/migrated/sounds/045.wav']).toEqual(wave)
    expect(writes.at(-1)).toBe('manifest.json')
    const readProgress = progress.filter((value) => value.phase === 'read')
    expect(readProgress[0]).toEqual({ phase: 'read', completed: 0, total: 7 * wave.byteLength })
    expect(readProgress.at(-1)).toEqual({
      phase: 'read',
      completed: 7 * wave.byteLength,
      total: 7 * wave.byteLength,
    })
    const writeProgress = progress.filter((value) => value.phase === 'write')
    const firstWrite = writeProgress[0]!
    const lastWrite = writeProgress.at(-1)!
    expect(firstWrite).toMatchObject({ phase: 'write', completed: 0 })
    expect(firstWrite.total).toBeGreaterThan(7 * wave.byteLength)
    expect(lastWrite).toEqual({
      phase: 'write',
      completed: lastWrite.total,
      total: lastWrite.total,
    })
    const storedIndex = JSON.parse(String(files['content/scripts/index.json']))
    const storedChunk = JSON.parse(
      String(files['content/scripts/chunks/scene/s1.json']),
    ) as ScriptChunkV1
    expect(normalizeScriptLibrary(storedIndex, { 'scene/s1': storedChunk }).index).toEqual(
      storedIndex,
    )

    writes.length = 0
    await openLocalProject(dir)
    expect(writes).toEqual([])
  })

  test('旧 v3 sound family 保留同 AssetId 的 authored WAV，不用 legacy 字节覆盖', async () => {
    const legacyWave = waveBytes(1)
    const authoredWave = waveBytes(2)
    const { manifest } = soundFamilyManifest()
    const authoredPath = 'assets/authored/escape.wav'
    const files: Record<string, string | ArrayBuffer> = {
      ...fullProject,
      'manifest.json': J(manifest),
      'assets/index.json': J({
        version: 1,
        assets: {
          'sound.pal.045': {
            kind: 'sound',
            path: authoredPath,
            mediaType: 'audio/wav',
            bytes: authoredWave.byteLength,
            sha256: await sha256Hex(authoredWave),
            label: '作者替换的逃跑音效',
            origin: { kind: 'authored' },
          },
        },
      }),
      'assets/extracted/sounds/45.wav': legacyWave,
      [authoredPath]: authoredWave,
    }
    const writes: string[] = []
    const opened = await openLocalProject(mockDir('authored-sound', files, writes))
    expect(opened.project.assetCatalog.assets['sound.pal.045']).toMatchObject({
      path: authoredPath,
      origin: { kind: 'authored' },
    })
    expect(files[authoredPath]).toBe(authoredWave)
    expect(writes).not.toContain(authoredPath)
    expect(opened.project.manifest.assets.roles['audio.battleEscapeSound']).toBe('sound.pal.045')
  })

  test('旧 v3 sound family 在已有 catalog WAV 缺失或 hash 错误时写前失败', async () => {
    const legacyWave = waveBytes(1)
    const authoredWave = waveBytes(2)
    for (const scenario of ['missing', 'bad-hash'] as const) {
      const { manifest, text: originalManifest } = soundFamilyManifest()
      const authoredPath = `assets/authored/${scenario}.wav`
      const files: Record<string, string | ArrayBuffer> = {
        ...fullProject,
        'manifest.json': originalManifest,
        'assets/index.json': J({
          version: 1,
          assets: {
            'sound.pal.045': {
              kind: 'sound',
              path: authoredPath,
              mediaType: 'audio/wav',
              bytes: authoredWave.byteLength,
              sha256: scenario === 'bad-hash' ? '0'.repeat(64) : await sha256Hex(authoredWave),
              origin: { kind: 'authored' },
            },
          },
        }),
        'assets/extracted/sounds/45.wav': legacyWave,
        ...(scenario === 'bad-hash' ? { [authoredPath]: authoredWave } : {}),
      }
      const writes: string[] = []
      await expect(
        openLocalProject(mockDir(`invalid-${scenario}`, files, writes)),
      ).rejects.toThrow()
      expect(writes).toEqual([])
      expect(files['manifest.json']).toBe(originalManifest)
      expect(manifest.assets.legacy.families).toContain('sound')
    }
  })

  test('旧 v3 sound family 在 manifest 发布失败后保留旧判据，并可重试滚前完成', async () => {
    const { manifest } = soundFamilyManifest()
    const files: Record<string, string | ArrayBuffer> = {
      ...fullProject,
      'manifest.json': J(manifest),
      'content/scenes/s1.json': J({
        id: 's1',
        mapId: 'map-001',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [],
        onEnter: [{ id: 'sound', body: [{ kind: 'playSound', soundId: 45 }] }],
      }),
      'assets/extracted/sounds/45.wav': waveBytes(1),
    }
    const writes: string[] = []
    const dir = mockDir('retry-sound-upgrade', files, writes, {
      failClose: (path, attempt) => path === 'manifest.json' && attempt === 1,
    })

    await expect(openLocalProject(dir)).rejects.toThrow('Injected close failure manifest.json')
    expect(writes).not.toContain('manifest.json')
    expect(
      (JSON.parse(String(files['manifest.json'])) as { assets: { legacy: { families: string[] } } })
        .assets.legacy.families,
    ).toContain('sound')
    expect(
      (
        JSON.parse(String(files['content/scenes/s1.json'])) as {
          onEnter: Array<{ body: unknown[] }>
        }
      ).onEnter[0]?.body,
    ).toEqual([{ kind: 'playSound', asset: 'sound.pal.045' }])

    writes.length = 0
    const opened = await openLocalProject(dir)
    expect(opened.project.manifest.assets.legacy?.families).not.toContain('sound')
    expect(writes.at(-1)).toBe('manifest.json')
    expect(opened.project.assetCatalog.assets['sound.pal.045']?.kind).toBe('sound')
    expect(opened.scenes[0]?.onEnter?.[0]?.body).toEqual([
      { kind: 'playSound', asset: 'sound.pal.045' },
    ])

    writes.length = 0
    await openLocalProject(dir)
    expect(writes).toEqual([])
  })

  test('v2 音乐+sound-family 工程一次打开连续升级闭包，并保留别名、引用与字节', async () => {
    const midi = new Uint8Array([0x4d, 0x54, 0x68, 0x64]).buffer
    const soundfont = new Uint8Array([1, 2, 3]).buffer
    const files: Record<string, string | ArrayBuffer> = {
      ...fullProject,
      'manifest.json': J({
        id: 'old',
        name: '旧工程',
        contentVersion: 2,
        entryScene: 's1',
        content: {
          actors: 'content/actors.json',
          skills: 'content/skills.json',
          items: 'content/items.json',
          locale: 'content/locale.json',
          scenes: 'content/scenes/',
          maps: 'content/maps/index.json',
          tilesets: 'content/tilesets.json',
          music: 'content/music.json',
        },
        assets: {
          root: 'assets/extracted/data',
          tilesets: 'tileset',
          sprites: 'sprite',
          palettes: 'palette',
          music: 'assets/extracted/music',
          sounds: 'assets/extracted/sounds',
        },
        startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
      }),
      'content/music.json': J([{ id: 1, name: '蝶恋' }]),
      'content/scenes/s1.json': J({
        id: 's1',
        mapId: 'map-001',
        musicId: 1,
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [],
        onEnter: [{ id: 'sound', body: [{ kind: 'playSound', soundId: 45 }] }],
      }),
      'assets/extracted/music/001.mid': midi,
      'assets/extracted/sounds/45.wav': waveBytes(1),
    }
    const opened = await openLocalProject(mockDir('old', files), {
      readSoundfont: async () => soundfont,
    })

    expect(opened.project.manifest.contentVersion).toBe(3)
    expect(opened.project.manifest.assets.legacy?.families).not.toContain('sound')
    expect(opened.scenes[0]?.music).toBe('music.pal.001')
    expect(opened.scenes[0]?.onEnter?.[0]?.body).toEqual([
      { kind: 'playSound', asset: 'sound.pal.045' },
    ])
    expect(opened.project.assetCatalog.assets['music.pal.001']?.label).toBe('蝶恋')
    expect(opened.project.assetCatalog.assets['sound.pal.045']?.kind).toBe('sound')
    expect(opened.project.assetCatalog.assets['music.pal.001']?.bytes).toBe(4)
    expect(opened.project.manifest.assets.roles['audio.openingMenuMusic']).toBe('music.pal.001')
    expect(files['content/music.json']).toBeUndefined()
    expect(files['assets/migrated/music/001.mid']).toEqual(midi)
    expect(files['assets/migrated/sounds/045.wav']).toEqual(files['assets/extracted/sounds/45.wav'])
    expect(files['assets/runtime/soundfont.sf3']).toEqual(soundfont)
  })

  test('mock FSA：资源替换/删除在保存后撤销，再保存重开仍恢复 catalog 与原字节', async () => {
    const assetId = 'sound.demo'
    const oldPath = 'assets/authored/old.wav'
    const nextPath = 'assets/authored/next.wav'
    const oldBytes = waveBytes(7)
    const nextBytes = waveBytes(8)
    const oldRecord = {
      kind: 'sound' as const,
      path: oldPath,
      mediaType: 'audio/wav' as const,
      bytes: oldBytes.byteLength,
      sha256: await sha256Hex(oldBytes),
      label: '原音效',
      origin: { kind: 'authored' as const },
    }
    const nextRecord = {
      ...oldRecord,
      path: nextPath,
      bytes: nextBytes.byteLength,
      sha256: await sha256Hex(nextBytes),
      label: '替换音效',
    }
    const files: Record<string, string | ArrayBuffer> = {
      ...fullProject,
      'assets/index.json': J({ version: 1, assets: { [assetId]: oldRecord } }),
      [oldPath]: oldBytes,
    }
    const dir = mockDir('asset-save-undo', files)
    const openSession = async (): Promise<EditSession> => {
      const opened = await openLocalProject(dir)
      return new EditSession(toEditorState(opened.project, opened.scenes, {}, opened.scriptChunks))
    }
    const diskBytes = (path: string): Uint8Array => new Uint8Array(files[path] as ArrayBuffer)

    const replaceSession = await openSession()
    replaceSession.dispatch(new UpsertAssetCommand(assetId, nextRecord, nextBytes, oldBytes))
    let snapshot = await writeProject(dir, serializeProject(replaceSession.getState()), {
      removePaths: replaceSession.getDeletedAssetPaths(),
    })
    replaceSession.markSaved()
    expect(files[oldPath]).toBeUndefined()
    expect(diskBytes(nextPath)).toEqual(new Uint8Array(nextBytes))

    replaceSession.undo()
    snapshot = await writeProject(dir, serializeProject(replaceSession.getState()), {
      prevSnapshot: snapshot,
      removePaths: replaceSession.getDeletedAssetPaths(),
    })
    replaceSession.markSaved()
    expect(files[nextPath]).toBeUndefined()
    expect(diskBytes(oldPath)).toEqual(new Uint8Array(oldBytes))
    let reopened = await openLocalProject(dir)
    expect(reopened.project.assetCatalog.assets[assetId]).toEqual(oldRecord)

    const deleteSession = new EditSession(
      toEditorState(reopened.project, reopened.scenes, {}, reopened.scriptChunks),
    )
    deleteSession.dispatch(new DeleteAssetCommand(assetId, oldBytes))
    snapshot = await writeProject(dir, serializeProject(deleteSession.getState()), {
      prevSnapshot: snapshot,
      removePaths: deleteSession.getDeletedAssetPaths(),
    })
    deleteSession.markSaved()
    expect(files[oldPath]).toBeUndefined()
    reopened = await openLocalProject(dir)
    expect(reopened.project.assetCatalog.assets[assetId]).toBeUndefined()

    deleteSession.undo()
    await writeProject(dir, serializeProject(deleteSession.getState()), {
      prevSnapshot: snapshot,
      removePaths: deleteSession.getDeletedAssetPaths(),
    })
    deleteSession.markSaved()
    reopened = await openLocalProject(dir)
    expect(reopened.project.assetCatalog.assets[assetId]).toEqual(oldRecord)
    expect(diskBytes(oldPath)).toEqual(new Uint8Array(oldBytes))
  })
})
