/**
 * TEST-EDITOR-MAP-DATA-1 M03：prepareProjectMapPatch 重复/单轴/清源（map-patch.ts）。
 * 既有 map-patch.test 已覆盖 ownership 先于 no-op/窄入口/高度往返/坏 patch/防御复制——不重复。
 * 本文件：collision 重复同格不同值拒绝、视觉坐标/值单轴、合法旧非空改 null 同步清 source、
 * 完整 issues 与 map/patch/permission 实参快照不变。
 */
import { buildBlankProjectMap, paintProjectMapTiles } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import {
  applyPreparedProjectMapPatch,
  ProjectMapPatchError,
  prepareProjectMapPatch,
} from './map-patch.js'

const TILESET = 'ts'
const permission = (writable: string[]) => ({
  requiredWritableLayerIds: writable,
  hiddenLayerIds: [],
  lockedLayerIds: [],
})

/** 拒绝见证取值形式：返回抛出的 ProjectMapPatchError 或 'ok'。 */
function outcomeOf(run: () => unknown): ProjectMapPatchError | 'ok' {
  try {
    run()
    return 'ok'
  } catch (error) {
    expect(error).toBeInstanceOf(ProjectMapPatchError)
    return error as ProjectMapPatchError
  }
}

describe('M03 prepareProjectMapPatch 单轴与清源', () => {
  test('collision 同格重复写入拒绝（同值/不同值都不允许）；视觉坐标/值单轴各自拒绝', () => {
    const map = paintProjectMapTiles(buildBlankProjectMap(2, 2, TILESET), [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: TILESET, height: 0 },
    ])
    const dupDifferent = outcomeOf(() =>
      prepareProjectMapPatch(
        map,
        {
          visual: [],
          collision: [
            { ref: { row: 0, col: 0 }, value: 1 },
            { ref: { row: 0, col: 0 }, value: 2 },
          ],
        },
        permission(['floor']),
      ),
    )
    expect(dupDifferent).not.toBe('ok')
    expect((dupDifferent as ProjectMapPatchError).issues).toEqual([
      {
        code: 'duplicate-channel',
        message: '格点 0:0 的 collision 通道重复写入',
        ref: { row: 0, col: 0 },
      },
    ])
    const dupSame = outcomeOf(() =>
      prepareProjectMapPatch(
        map,
        {
          visual: [],
          collision: [
            { ref: { row: 0, col: 0 }, value: 1 },
            { ref: { row: 0, col: 0 }, value: 1 },
          ],
        },
        permission(['floor']),
      ),
    )
    expect((dupSame as ProjectMapPatchError).issues[0]!.code).toBe('duplicate-channel')
    // 视觉坐标非整数 / tileId 负值单轴
    const badCoordinate = outcomeOf(() =>
      prepareProjectMapPatch(
        map,
        {
          visual: [{ channel: 'tileId', ref: { layerId: 'floor', row: 1.5, col: 0 }, value: 1 }],
          collision: [],
        },
        permission(['floor']),
      ),
    )
    expect((badCoordinate as ProjectMapPatchError).issues.map((issue) => issue.code)).toEqual([
      'invalid-coordinate',
    ])
    const badValue = outcomeOf(() =>
      prepareProjectMapPatch(
        map,
        {
          visual: [{ channel: 'tileId', ref: { layerId: 'floor', row: 0, col: 1 }, value: -3 }],
          collision: [],
        },
        permission(['floor']),
      ),
    )
    expect((badValue as ProjectMapPatchError).issues.map((issue) => issue.code)).toEqual([
      'invalid-value',
      'missing-source', // 空槽聚合视角：无效值仍按“将写非空”要求来源
    ])
  })
  test('合法旧非空视觉改 null：tileId/tilesetId 同步 null 且 next 快照含清 source；实参不变', () => {
    const map = paintProjectMapTiles(buildBlankProjectMap(2, 2, TILESET), [
      { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: TILESET, height: 2 },
    ])
    const mapSnapshot = structuredClone(map) // 完整实际 map 快照（layers/sources/heights/collision/owner）
    const patch = {
      visual: [
        { channel: 'tileId' as const, ref: { layerId: 'floor', row: 0, col: 0 }, value: null },
        { channel: 'tilesetId' as const, ref: { layerId: 'floor', row: 0, col: 0 }, value: null },
        { channel: 'height' as const, ref: { layerId: 'floor', row: 0, col: 0 }, value: 0 },
      ],
      collision: [],
    }
    const patchSnapshot = structuredClone(patch)
    const actualPermission = permission(['floor']) // 持有同一权限对象（污染实际入参即红）
    const permissionSnapshot = structuredClone(actualPermission)
    const prepared = prepareProjectMapPatch(map, patch, actualPermission)
    expect(prepared.nextVisual).toEqual([
      { layerId: 'floor', row: 0, col: 0, tileId: null, tilesetId: null, height: 0 },
    ])
    expect(prepared.prevVisual).toEqual([
      { layerId: 'floor', row: 0, col: 0, tileId: 1, tilesetId: TILESET, height: 2 },
    ])
    const next = applyPreparedProjectMapPatch(map, prepared)
    expect(next.layers[0]!.tiles[0]![0]).toBeNull()
    expect(next.layers[0]!.sources[0]![0]).toBeNull()
    expect(structuredClone(map)).toEqual(mapSnapshot)
    expect(structuredClone(patch)).toEqual(patchSnapshot)
    expect(actualPermission).toEqual(permissionSnapshot) // 同一实际权限对象前后一致
  })
})
