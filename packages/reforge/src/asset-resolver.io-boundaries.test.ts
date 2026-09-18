/**
 * TEST-REFORGE-RUNTIME-CONTRACTS-1 D4-D6：AssetResolver IO 边界（asset-resolver.ts）。
 * 已有 readBytes/dispose 用例在工程保存/打开回归间接覆盖；本文件钉 readText 失败上下文、
 * urlFor/角色链、双入口 kind 门与 catalog/roles 不被污染。
 */
import { describe, expect, test } from 'vitest'
import {
  dAssetCatalog,
  deepSnapshot,
  memoryFileSource,
} from './__tests__/glm-runtime-contract-fixtures.js'
import { AssetResolver } from './asset-resolver.js'

interface ResolverHarness {
  resolver: AssetResolver
  source: ReturnType<typeof memoryFileSource>
  /** 可修复的单点故障：setBroken(path) 打开，setBroken(undefined) 全修复（同一 source 实例）。 */
  setBroken: (path: string | undefined) => void
}

function harness(files: Record<string, unknown> = {}): ResolverHarness {
  const table: Record<string, unknown> = {}
  for (const record of Object.values(dAssetCatalog().assets))
    table[(record as { path: string }).path] = new Uint8Array([1, 2, 3]).buffer
  Object.assign(table, files)
  let brokenPath: string | undefined
  const source = memoryFileSource(table)
  const rawReadText = source.readText.bind(source)
  const rawReadBytes = source.readBytes.bind(source)
  const rawUrlFor = source.urlFor.bind(source)
  source.readText = async (path: string, signal?: AbortSignal) => {
    if (path === brokenPath) throw new Error(`boom-text:${path}`)
    return rawReadText(path, signal)
  }
  source.readBytes = async (path: string, signal?: AbortSignal) => {
    if (path === brokenPath) throw new Error(`boom-bytes:${path}`)
    return rawReadBytes(path, signal)
  }
  source.urlFor = async (path: string) => {
    if (path === brokenPath) {
      source.reads.push(`url:${path}`) // 失败尝试也计入 IO 轨迹
      throw new Error('url-for backend refused')
    }
    return rawUrlFor(path)
  }
  const resolver = new AssetResolver(
    'proj-x',
    dAssetCatalog() as never,
    {
      'video.startupSplash': 'video.v1',
    } as never,
    source,
  )
  return { resolver, source, setBroken: (path) => (brokenPath = path) }
}

describe('D4 readText 失败上下文与同实例恢复', () => {
  test('失败消息含 projectId/asset/kind/path/底层原因；同一 resolver/source 修复后同 asset 成功', async () => {
    const { resolver, source, setBroken } = harness({
      'assets/generated/sprite-x.png': 'hello-text',
    })
    setBroken('assets/generated/sprite-x.png')
    const error = (await resolver.readText('sprite.x', 'sprite').catch((e: unknown) => e)) as Error
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toContain('proj-x')
    expect(error.message).toContain('sprite.x')
    expect(error.message).toContain('kind=sprite')
    expect(error.message).toContain('assets/generated/sprite-x.png')
    expect(error.message).toContain('boom-text')
    // 同一 resolver/source 实例：修复故障后同 asset 重试成功（非换新对象）
    setBroken(undefined)
    const text = await resolver.readText('sprite.x', 'sprite')
    expect(text).toContain('hello-text')
    expect(source.reads).toContain('text:assets/generated/sprite-x.png')
  })
})

describe('D5 urlFor 与实际角色链', () => {
  test('urlForRole(video.startupSplash) 产 URL 且不读字节；缺角色报错含角色名', async () => {
    const { resolver, source } = harness()
    const url = await resolver.urlForRole('video.startupSplash')
    expect(url).toBe('blob:assets/generated/video-v1.mp4')
    // URL 创建不产生资源读取（reads 中只有 url: 轨迹，无 bytes:）
    expect(source.reads.filter((entry) => entry.startsWith('bytes:'))).toEqual([])
    expect(source.reads).toContain('url:assets/generated/video-v1.mp4')
    await expect(resolver.urlForRole('audio.defaultBattleMusic')).rejects.toThrow(
      /缺资源角色 "audio.defaultBattleMusic"/,
    )
  })
  test('直接 urlFor 成功/未知 asset 拒绝；不把无资源读取误报成功', async () => {
    const { resolver } = harness()
    await expect(resolver.urlFor('music.m1', 'music')).resolves.toBe(
      'blob:assets/generated/music-m1.mid',
    )
    await expect(resolver.urlFor('ghost', 'music')).rejects.toThrow(/catalog 无此记录/)
  })
  test('真实 urlFor IO 失败经 readError 包装：含全上下文与底层原因；同实例修复后恢复', async () => {
    const { resolver, source, setBroken } = harness()
    setBroken('assets/generated/video-v1.mp4')
    const error = (await resolver
      .urlForRole('video.startupSplash')
      .catch((e: unknown) => e)) as Error
    // IO 层失败（非 record/role 层提前拒绝）：走 asset-resolver.ts readError 包装
    expect(error).toBeInstanceOf(Error)
    expect(error.message).toContain('proj-x')
    expect(error.message).toContain('video.v1')
    expect(error.message).toContain('kind=video')
    expect(error.message).toContain('assets/generated/video-v1.mp4')
    expect(error.message).toContain('url-for backend refused')
    // 同一 resolver/source 修复后同 asset 恢复
    setBroken(undefined)
    await expect(resolver.urlForRole('video.startupSplash')).resolves.toBe(
      'blob:assets/generated/video-v1.mp4',
    )
    // 非目标 IO 零调用：整个失败/恢复过程只发生 url: 轨迹（无 bytes:/text: 读取）
    expect(source.reads.filter((entry) => !entry.startsWith('url:'))).toEqual([])
    expect(
      source.reads.filter((entry) => entry === 'url:assets/generated/video-v1.mp4'),
    ).toHaveLength(2)
  })
})

describe('D6 双入口 kind 门与不污染', () => {
  test('显式 asset 入口 kind 门：错 kind 报实际 kind 与 path', async () => {
    const { resolver } = harness()
    await expect(resolver.readText('music.m1', 'sprite')).rejects.toThrow(
      /期望 kind=sprite，实际 kind=music，path=assets\/generated\/music-m1\.mid/,
    )
    await expect(resolver.readBytes('video.v1', 'music')).rejects.toThrow(
      /实际 kind=video，path=assets\/generated\/video-v1\.mp4/,
    )
  })
  test('角色入口 kind 门经 ASSET_ROLE_KINDS；catalog/roles/source 全程不变', async () => {
    const { resolver } = harness()
    // video.startupSplash 期望 video kind → video.v1 合法通过
    await expect(resolver.readRoleBytes('video.startupSplash')).resolves.toBeInstanceOf(ArrayBuffer)
    // 把角色绑到 music 资产上 → 角色入口的 kind 门拒绝（拒绝落成值断言）
    const source2 = memoryFileSource({})
    const wrongRole = new AssetResolver(
      'proj-x',
      dAssetCatalog() as never,
      { 'video.startupSplash': 'music.m1' } as never,
      source2,
    )
    const wrongOutcome = await wrongRole.readRoleBytes('video.startupSplash').then(
      () => undefined,
      (error: unknown) => error as Error,
    )
    expect(wrongOutcome?.message).toMatch(/期望 kind=video，实际 kind=music/)
    // catalog/roles 深快照不变（读取不污染登记）
    const { resolver: clean } = harness()
    const catalogBefore = deepSnapshot(clean.catalog)
    const rolesBefore = deepSnapshot(clean.roles)
    await clean.readText('sprite.x')
    await clean.urlFor('music.m1')
    expect(clean.catalog).toEqual(catalogBefore)
    expect(clean.roles).toEqual(rolesBefore)
  })
})
