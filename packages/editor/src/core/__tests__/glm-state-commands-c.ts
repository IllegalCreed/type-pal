/**
 * TEST-GLM-STATE-COMMANDS-1 C批 fixture：actor/sprite/battle-sprite/tileset 命令残差共用的
 * 薄构造器与输入保真助手。tileset 业务正例基座 = buildBlankProject 正式空白项目
 * （经 cursor-command-boundary-fixtures 的 loadBoundaryProject 载入），在其上**追加**测试
 * 定义/记录/字节，构造后由 assertProjectSaveValid 自证通过正式保存门；有意缺表的防御轴
 * 单独提供，不得当合法正例。不复制产品算法，不被生产导入。
 */
import type { AssetRecordV1, MapIndexV1, ProjectMap } from '@type-pal/content'
import type { TilesetDef } from '@type-pal/reforge'
import {
  type FileSource,
  fsaSource,
  loadAllAuthorScenes,
  loadAllProjectMaps,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { expect } from 'vitest'
import type { EditorState } from '../edit-session.js'
import { assertProjectSaveValid } from '../project-diagnostics.js'
import { toEditorState } from '../project-io.js'
import { buildBlankProject } from '../seed.js'
import { memoryAuthorDirectory } from './author-save-fixture.js'

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

export interface TilesetStateOptions {
  definitions?: TilesetDef[]
  records?: Record<string, AssetRecordV1>
  blobs?: Record<string, ArrayBuffer>
  mapIndex?: MapIndexV1
  maps?: Record<string, ProjectMap>
}

/**
 * 正式空白项目（地图正文已加载）：toEditorState 传入 loadAllProjectMaps 的全量地图，
 * 使 EditSession 构造期即可从 state.maps 提取全部地图事实（引用扫描覆盖完整）。
 */
async function loadHydratedBlankProject(
  name: string,
): Promise<{ source: FileSource; state: EditorState }> {
  const disk = memoryAuthorDirectory(await buildBlankProject(name))
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const maps = await loadAllProjectMaps(project)
  return { source, state: toEditorState(project, scenes, maps, {}, []) }
}

/**
 * tileset 业务正例基座：正式空白项目 + 追加测试定义/记录/字节（blank 自身的
 * starter 瓦片集与起始地图保持原样）。构造后由正式保存门自证。
 */
export async function legalTilesetState(options: TilesetStateOptions = {}): Promise<EditorState> {
  const { state } = await loadHydratedBlankProject('glm-state-commands-c')
  const next = {
    ...state,
    tilesets: [...(state.tilesets ?? []), ...(options.definitions ?? [])],
    assetCatalog: {
      version: 1,
      assets: { ...state.assetCatalog.assets, ...(options.records ?? {}) },
    },
    assetBlobs: { ...state.assetBlobs, ...(options.blobs ?? {}) },
    maps: options.maps ?? state.maps,
    mapIndex: options.mapIndex ?? state.mapIndex,
  } as EditorState
  assertProjectSaveValid(next)
  return next
}

/**
 * 防御轴专用：在合法空白项目上有意把 tilesets 表置为 undefined，探测命令的 `?? []` 回退；
 * 这是刻意非法（缺表）输入，不得当合法正例使用。
 */
export async function defensiveTilesetStateWithoutTilesets(): Promise<EditorState> {
  const { state } = await loadHydratedBlankProject('glm-state-commands-c')
  return { ...state, tilesets: undefined } as EditorState
}

/**
 * 防御轴专用：在合法空白项目上叠加**会被保存门拒绝**的记录（如 kind 错标），
 * 用于触达命令自身对非法 catalog 的守卫；不得当合法正例使用。
 */
export async function defensiveTilesetStateWithRecords(
  records: Record<string, AssetRecordV1>,
): Promise<EditorState> {
  const { state } = await loadHydratedBlankProject('glm-state-commands-c')
  const next = {
    ...state,
    assetCatalog: { version: 1, assets: { ...state.assetCatalog.assets, ...records } },
  } as EditorState
  return next
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
