/**
 * TEST-GLM-STATE-COMMANDS-1 C批 fixture：actor/sprite/battle-sprite/tileset 命令残差共用的
 * 薄构造器与输入保真助手。最小 tileset 状态形状取自 tileset-lifecycle.test.ts 现行合法种子
 * （mapIndex 覆盖比较要求 manifest/sceneIndex/mapIndex 满足现行类型）；不复制产品算法，
 * 不被生产导入。
 */
import type { AssetRecordV1, MapIndexV1, ProjectMap } from '@type-pal/content'
import type { TilesetDef } from '@type-pal/reforge'
import { expect } from 'vitest'
import type { EditorState } from '../edit-session.js'

/** 独立深快照：与输入完全脱离引用。 */
export function deepSnapshot<T>(value: T): T {
  return structuredClone(value)
}

/** 捕获实际 Error 并整串比较 message（不是 toThrow 子串匹配）。 */
export function expectExactError(run: () => unknown, message: string): void {
  let caught: unknown
  try {
    caught = run()
  } catch (error) {
    caught = error
  }
  expect(caught).toBeInstanceOf(Error)
  expect((caught as Error).message).toBe(message)
}

/**
 * 消息含运行期拼装片段（引用 where/source label）时：断言 Error 实例与稳定片段，
 * 不做整串比较。仅限动态片段无法预知的守卫消息。
 */
export function expectErrorContaining(run: () => unknown, fragment: string): void {
  let caught: unknown
  try {
    caught = run()
  } catch (error) {
    caught = error
  }
  expect(caught).toBeInstanceOf(Error)
  expect((caught as Error).message).toContain(fragment)
}

/**
 * 多实参输入保真——每个对象实参调用前独立快照，执行后立即逐一比较同一实参。
 * 原始不可变标量不传入。
 */
export function expectInputsUnchanged(
  run: (first: object) => void,
  inputs: readonly object[],
): void {
  const snapshots = inputs.map((input) => deepSnapshot(input))
  if (inputs.length > 0) run(inputs[0] as object)
  inputs.forEach((input, index) => {
    expect(input).toEqual(snapshots[index])
  })
}

const EMPTY_INDEX: MapIndexV1 = { version: 1, maps: [] }

export interface TilesetStateOptions {
  definitions?: TilesetDef[]
  records?: Record<string, AssetRecordV1>
  blobs?: Record<string, ArrayBuffer>
  mapIndex?: MapIndexV1
  maps?: Record<string, ProjectMap>
}

/** 最小合法 tileset 状态（mapIndex 空表 → 引用扫描覆盖平凡完整）。 */
export function tilesetState(options: TilesetStateOptions = {}): EditorState {
  return {
    manifest: {
      id: 'tileset-glm',
      name: 'Tileset GLM',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: { maps: 'content/maps/index.json', tilesets: 'content/tilesets.json' },
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 's',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
    },
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    maps: options.maps ?? {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: options.mapIndex ?? EMPTY_INDEX,
    tilesets: options.definitions ?? [],
    tilesetBlobs: {},
    stamps: [],
    assetCatalog: { version: 1, assets: options.records ?? {} },
    assetBlobs: options.blobs ?? {},
    scriptChunks: {},
  } as unknown as EditorState
}

/** 合法 tileset catalog record（bytes/sha 必须来自真实编码产物，由调用方负责）。 */
export function tilesetRecord(path: string, bytes: ArrayBuffer, sha256: string): AssetRecordV1 {
  return {
    kind: 'tileset',
    path,
    mediaType: 'application/vnd.type-pal.rle',
    bytes: bytes.byteLength,
    sha256,
    origin: { kind: 'authored' },
  }
}

/** 合法 sprite catalog record（同上，bytes/sha 来自真实种子产物）。 */
export function spriteRecord(path: string, bytes: ArrayBuffer, sha256: string): AssetRecordV1 {
  return {
    kind: 'sprite',
    path,
    mediaType: 'application/vnd.type-pal.rle',
    bytes: bytes.byteLength,
    sha256,
    origin: { kind: 'authored' },
  }
}
