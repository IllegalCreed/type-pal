import type { AssetCatalogV1, CurrentManifest } from '@type-pal/content'
import { fsaSource } from '@type-pal/reforge'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { memoryAuthorDirectory } from './__tests__/author-save-fixture.js'
import { authorSaveStorage, memoryAuthorSaveStore } from './__tests__/author-save-store-fixture.js'

vi.mock('./author-save-store.js', async (original) =>
  memoryAuthorSaveStore(await original<typeof import('./author-save-store.js')>()),
)
vi.mock('./handle-store.js', async (original) => ({
  ...(await original<typeof import('./handle-store.js')>()),
  loadWorkspaceRecord: async () => null,
  findWorkspaceRecordByHandle: async () => null,
  saveWorkspaceHandleUnderLock: async () => undefined,
}))
beforeEach(() => authorSaveStorage.receipts.clear())

import { sha256Hex } from './binary-signature.js'
import { cloneFromPal } from './clone.js'
import { finishOpen } from './open-actions.js'
import { buildBlankProject } from './seed.js'
import { createLocalWorkspaceContext } from './workspace-context.js'
import { authorizeFirstSaveTarget } from './workspace-persistence.js'

async function localTarget(dir: FileSystemDirectoryHandle) {
  return authorizeFirstSaveTarget(
    createLocalWorkspaceContext('pal', 'pal-development-snapshot-clone'),
    dir,
  )
}
const authorWrites = (disk: ReturnType<typeof memoryAuthorDirectory>) =>
  [...disk.changes.creates, ...disk.changes.closes, ...disk.changes.removes].filter(
    (path) => path !== '.type-pal' && !path.startsWith('.type-pal/'),
  )

describe('cloneFromPal', () => {
  test('写当前 manifest、内容和 catalog 资源；进度累计到满', async () => {
    const files = await buildBlankProject('pal')
    const catalog = files['assets/index.json'] as AssetCatalogV1
    const portrait = new ArrayBuffer(50)
    const path = 'assets/migrated/portraits/001.png'
    catalog.assets['portrait.pal.001'] = {
      kind: 'portrait',
      path,
      mediaType: 'image/png',
      bytes: 50,
      sha256: await sha256Hex(portrait),
      origin: { kind: 'legacy-migrated' },
    }
    files[path] = portrait
    files['.type-pal/pal-development.json'] = { workspaceId: 'must-not-clone' }
    files['.type-pal/workspace.json'] = { workspaceId: 'must-not-clone' }
    const source = memoryAuthorDirectory(files),
      target = memoryAuthorDirectory()
    const progress: Array<[number, number, string]> = []
    await cloneFromPal(fsaSource(source.dir), await localTarget(target.dir), (done, total, phase) =>
      progress.push([done, total, phase]),
    )
    const copied = fsaSource(target.dir)
    expect(await copied.readJson('manifest.json')).toEqual(files['manifest.json'])
    for (const path of [
      'content/actors.json',
      'content/scenes/index.json',
      'content/scenes/start.json',
      'assets/migrated/portraits/001.png',
    ])
      expect(target.files.has(path)).toBe(true)
    expect(target.files.has('.type-pal/pal-development.json')).toBe(false)
    expect(target.files.has('.type-pal/workspace.json')).toBe(false)
    const total = [...target.files]
      .filter(([path]) => !path.startsWith('.type-pal/'))
      .reduce((sum, [, bytes]) => sum + bytes.byteLength, 0)
    expect(progress.at(-1)).toEqual([total, total, 'writing'])
    expect(progress[0]?.[2]).toBe('preparing')
    expect(progress.slice(0, -1).every(([done, total]) => done < total)).toBe(true)
    expect(await copied.readJson('.type-pal/save-state.json')).toMatchObject({ phase: 'committed' })
  })

  test('catalog tileset 按描述的 gzip 字节逐字复制', async () => {
    const files = await buildBlankProject('pal')
    const catalog = files['assets/index.json'] as AssetCatalogV1
    const record = Object.values(catalog.assets).find((record) => record.kind === 'tileset')!
    const target = memoryAuthorDirectory()
    await cloneFromPal(
      fsaSource(memoryAuthorDirectory(files).dir),
      await localTarget(target.dir),
      () => {},
    )
    expect(target.files.get(record.path)).toEqual(files[record.path])
    expect([...target.files.keys()].some((path) => path.includes('extracted'))).toBe(false)
  })

  test('battle-sprite 通过结构校验后逐字节复制', async () => {
    const files = await buildBlankProject('pal')
    const catalog = files['assets/index.json'] as AssetCatalogV1
    const record = Object.values(catalog.assets).find((record) => record.kind === 'battle-sprite')!
    const target = memoryAuthorDirectory()
    await cloneFromPal(
      fsaSource(memoryAuthorDirectory(files).dir),
      await localTarget(target.dir),
      () => {},
    )
    expect(target.files.get(record.path)).toEqual(files[record.path])
  })

  test('地图注册表登记的零场景引用地图也完整克隆', async () => {
    const files = await buildBlankProject('pal')
    const mapIndex = files['content/maps/index.json'] as { maps: unknown[] }
    mapIndex.maps.push({ id: 'unused', name: '未引用地图', path: 'content/maps/unused.json' })
    files['content/maps/unused.json'] = structuredClone(files['content/maps/start.json'])
    const target = memoryAuthorDirectory()
    await cloneFromPal(
      fsaSource(memoryAuthorDirectory(files).dir),
      await localTarget(target.dir),
      () => {},
    )
    expect(await fsaSource(target.dir).readJson('content/maps/index.json')).toEqual(mapIndex)
    expect(await fsaSource(target.dir).readText('content/maps/unused.json')).toEqual(
      files['content/maps/unused.json'],
    )
  })

  test('后段源读取失败只留私有暂存，零目标作者写入、零完成进度', async () => {
    const source = memoryAuthorDirectory(await buildBlankProject('pal')),
      target = memoryAuthorDirectory()
    const content = await source.dir.getDirectoryHandle('content')
    const getFile = content.getFileHandle.bind(content)
    content.getFileHandle = async (name, options) => {
      if (name === 'locale.json') throw new Error('late network failure')
      return getFile(name, options)
    }
    const progress = vi.fn()
    await expect(
      cloneFromPal(fsaSource(source.dir), await localTarget(target.dir), progress),
    ).rejects.toThrow('late network failure')
    expect(authorWrites(target)).toEqual([])
    expect(target.files.has('manifest.json')).toBe(false)
    expect(progress.mock.calls.some(([done, total]) => done === total)).toBe(false)
    expect([...authorSaveStorage.receipts.values()][0]?.phase).toBe('staging')
  })

  test('提交中断后无源目录也能从已封存目标恢复完整克隆', async () => {
    const files = await buildBlankProject('pal'),
      source = memoryAuthorDirectory(files),
      target = memoryAuthorDirectory()
    target.hooks.beforeClose = (path) => {
      if (path === 'content/actors.json') throw new Error('interrupt author close')
    }
    await expect(
      cloneFromPal(fsaSource(source.dir), await localTarget(target.dir), () => {}),
    ).rejects.toThrow('interrupt author close')
    expect(target.files.has('manifest.json')).toBe(false)
    expect([...authorSaveStorage.receipts.values()][0]?.phase).toBe('applying')
    target.hooks.beforeClose = undefined
    source.hooks.afterRead = () => {
      throw new Error('source unavailable after sealing')
    }
    const opened = await finishOpen(target.dir)
    expect(opened.project.manifest).toEqual(files['manifest.json'] as CurrentManifest)
    expect(await opened.project.source.readJson('content/actors.json')).toEqual(
      files['content/actors.json'],
    )
    expect(authorWrites(target).filter((path) => path === 'manifest.json')).toHaveLength(2)
  })

  test('源已读内容在暂存中变化时不得封存或写作者目标', async () => {
    const files = await buildBlankProject('pal'),
      source = memoryAuthorDirectory(files),
      target = memoryAuthorDirectory()
    source.hooks.afterRead = (path) => {
      if (path === 'content/locale.json')
        source.set('manifest.json', {
          ...(files['manifest.json'] as CurrentManifest),
          name: 'changed externally',
        })
    }
    await expect(
      cloneFromPal(fsaSource(source.dir), await localTarget(target.dir), () => {}),
    ).rejects.toThrow('manifest.json')
    expect(authorWrites(target)).toEqual([])
    expect([...authorSaveStorage.receipts.values()][0]?.phase).toBe('staging')
  })
})
