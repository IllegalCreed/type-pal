/**
 * TEST-CONTENT-CONTRACTS-1 A4/A6：tagged 引用归组与物理文件闭包（asset.ts）。
 * 既有 asset.test.ts 覆盖主体；本文件补：site 归组精确计数、非目标不误收、
 * validateAssetFileClosure 的字节/摘要双轴与失败传播、真实字节与独立摘要校验。
 */

// @ts-expect-error Node-only test host; content production type environment is DOM-only.
import { createHash } from 'node:crypto'
import { describe, expect, test, vi } from 'vitest'
import { spriteAssetRecord } from './__tests__/glm-content-contract-fixtures.js'
import {
  type AssetCatalogV1,
  collectAssetReferences,
  groupAssetReferencesBySite,
  validateAssetCatalog,
  validateAssetFileClosure,
} from './asset.js'
import { validateAuthorScenes } from './validate-author.js'

const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

describe('A4 collectAssetReferences + groupAssetReferencesBySite · site 归组精确计数', () => {
  test('scene music/battleMusic 各成一 site；普通 flag 字符串不误收；音乐 kind 期望正确', () => {
    // 当前作者场景形态：脚本位于 hooks.onEnter.variants.*.flow（validateAuthorScenes 守卫域）；
    // 普通字符串放在真实 setFlag.flag 脚本字段，而不是非法 page.body 壳。
    const scene = {
      id: 's',
      music: 'music.m1',
      battleMusic: 'music.m1',
      mapId: 'map-s',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' as const },
      hooks: {
        onEnter: {
          variants: {
            main: {
              label: '进场',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 's0',
                stages: [{ id: 's0', body: [{ kind: 'setFlag', flag: 'music.m1', value: true }] }],
              },
            },
          },
        },
      },
      entities: [{ id: 'e1', zone: true, pos: { col: 1, row: 1, height: 0 } }],
    }
    // 主载荷先过当前守卫：本 fixture 是合法当前作者场景
    validateAuthorScenes([scene])
    const references = collectAssetReferences({ scenes: [scene] as never })
    expect(references).toHaveLength(2)
    expect(references.every((r) => r.asset === 'music.m1' && r.expectedKind === 'music')).toBe(true)
    expect(references.map((r) => r.where)).toEqual(['scenes[0].music', 'scenes[0].battleMusic'])
    const grouped = groupAssetReferencesBySite(references)
    // 两个不同 site 各计 1 次
    expect(grouped).toHaveLength(2)
    expect(grouped.every((g) => g.occurrences === 1)).toBe(true)
    // 同 site 重复出现 → occurrences 递增
    const doubled = groupAssetReferencesBySite([...references, { ...references[0]! }])
    const first = doubled.find((g) => g.site === references[0]!.site)
    expect(first!.occurrences).toBe(2)
  })
})

describe('A6 validateAssetFileClosure · 字节/摘要双轴与失败传播', () => {
  const catalogWith = (record: object): AssetCatalogV1 =>
    validateAssetCatalog({ version: 1, assets: { 'sprite.x': record } })
  const realBytes = new Uint8Array([1, 2, 3, 4])
  const realSha = sha(realBytes)
  const baseRecord = () => ({
    ...spriteAssetRecord('sprite.x'),
    bytes: realBytes.byteLength,
    sha256: realSha,
  })
  test('正常闭包（已引用）零 issue；readBytes 收到精确路径、sha 收到真实字节', async () => {
    const readBytes = vi.fn(async () => realBytes)
    const shaFn = vi.fn(async (bytes: Uint8Array) => sha(bytes))
    const issues = await validateAssetFileClosure(
      catalogWith(baseRecord()),
      [{ asset: 'sprite.x', expectedKind: 'sprite' as const, where: 'scene/s', site: '测试' }],
      { readBytes, sha256: shaFn },
    )
    expect(issues).toEqual([])
    expect(readBytes).toHaveBeenCalledWith('assets/generated/sprite.x.png')
    expect(shaFn).toHaveBeenCalledWith(realBytes)
  })
  test('大小错但摘要对 → bytes-mismatch；大小对但摘要错 → hash-mismatch（双轴独立）', async () => {
    const reference = [
      { asset: 'sprite.x', expectedKind: 'sprite' as const, where: 'scene/s', site: '测试' },
    ]
    const wrongSize = { ...baseRecord(), bytes: 99 }
    const sizeIssues = await validateAssetFileClosure(catalogWith(wrongSize), reference, {
      readBytes: async () => realBytes,
      sha256: async () => realSha,
    })
    expect(sizeIssues.map((i) => i.code)).toEqual(['bytes-mismatch'])
    const wrongSha = { ...baseRecord(), sha256: 'b'.repeat(64) }
    const hashIssues = await validateAssetFileClosure(catalogWith(wrongSha), reference, {
      readBytes: async () => realBytes,
      sha256: async () => realSha, // 真实摘要与登记不符
    })
    expect(hashIssues.map((i) => i.code)).toEqual(['hash-mismatch'])
  })
  test('读失败 → missing-file 含错误消息；sha 回调失败传播（不吞错）', async () => {
    const readFail = await validateAssetFileClosure(
      catalogWith(baseRecord()),
      [{ asset: 'sprite.x', expectedKind: 'sprite' as const, where: 'scene/s', site: '测试' }],
      {
        readBytes: async () => {
          throw new Error('disk gone')
        },
        sha256: async () => realSha,
      },
    )
    expect(readFail.map((i) => i.code)).toEqual(['missing-file'])
    expect(readFail[0]!.message).toContain('disk gone')
    await expect(
      validateAssetFileClosure(catalogWith(baseRecord()), [], {
        readBytes: async () => realBytes,
        sha256: async () => {
          throw new Error('sha crashed')
        },
      }),
    ).rejects.toThrow('sha crashed')
  })
  test('未引用记录也核文件（unused warn + 物理验证同时发生）', async () => {
    const twoAssets = validateAssetCatalog({
      version: 1,
      assets: {
        'sprite.x': baseRecord(),
        'sprite.y': { ...baseRecord(), path: 'assets/generated/missing.png' },
      },
    })
    const issues = await validateAssetFileClosure(
      twoAssets,
      [{ asset: 'sprite.x', expectedKind: 'sprite' as const, where: 'scene/s', site: '测试' }],
      {
        readBytes: async (path: string) => {
          if (path.endsWith('missing.png')) throw new Error('ENOENT')
          return realBytes
        },
        sha256: async () => realSha,
      },
    )
    const codes = issues.map((issue) => issue.code).sort()
    expect(codes).toEqual(['missing-file', 'unused-asset'])
  })
})
