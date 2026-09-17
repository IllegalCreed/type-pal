/**
 * TEST-EDITOR-LOGIC-COVERAGE-1 C1～C4：组合库命令边界（stamp-commands.ts:24-200）。
 * 既有 stamp-commands.test.ts 已覆盖：首次新增 manifest 登记/撤销、migrated 显式接管、
 * 复制独立 authored、删除保留原索引可撤销。本文件补：重复 id 抛错、同值 replace no-op、
 * authored 不得倒回 migrated、删除须真实 proof（缺 proof/引用数变化拒绝）、
 * invert 恢复时 ID 已占用 no-op（现行合同）、深快照。
 */
import type { StampTemplate } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { baseState, deepSnapshot } from './__tests__/glm-editor-logic-fixtures.js'
import { PaintTilesCommand } from './commands.js'
import { type EditorState, EditSession } from './edit-session.js'
import {
  AddStampTemplateCommand,
  DeleteStampTemplateCommand,
  DuplicateStampTemplateCommand,
  ReplaceStampTemplateCommand,
} from './stamp-commands.js'
import { StampDeletionProof } from './tileset-references.js'

const template = (id = 'tree', origin: StampTemplate['origin'] = 'authored'): StampTemplate => ({
  id,
  name: id,
  origin,
  width: 1,
  height: 1,
  anchor: { row: 0, col: 0 },
  tilesetRefs: ['tiles'],
  layers: [{ id: 'floor', name: '地面', tiles: [[1], [null]], sources: [[0], [null]] }],
  collision: [[null], [null]],
})

function state(stamps: StampTemplate[] = []): EditorState {
  return baseState({
    stamps,
    manifest: {
      id: 'editor-boundaries',
      name: 'E',
      contentVersion: 20,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: stamps.length ? { stamps: 'content/stamps.json' } : {},
      assets: { catalog: 'assets/index.json', roles: {} },
      entryPoints: [
        {
          id: 'main',
          label: '入口',
          scene: 's',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
    },
  })
}

/** 真实地图编辑（触发引用事实 generation bump，构造旧 proof 的真实过期）。 */
function paintEdit(mapRel: string): PaintTilesCommand {
  return new PaintTilesCommand(mapRel, [
    { layerId: 'floor', row: 0, col: 0, tileId: 2, tilesetId: 'tiles', height: 0 },
  ])
}

function deleteCommand(session: EditSession, id: string): DeleteStampTemplateCommand {
  return new DeleteStampTemplateCommand(
    id,
    StampDeletionProof.fromBatch(session.getMapReferenceBatch(), id),
    (current) => session.getCurrentMapReferenceBatch(current),
  )
}

describe('C1 AddStampTemplateCommand · 边界', () => {
  test('重复 id 抛错且状态不变（深快照）', () => {
    const s0 = state([template('tree')])
    const before = deepSnapshot(s0)
    expect(() => new AddStampTemplateCommand(template('tree')).apply(s0)).toThrow(/已存在/)
    expect(s0).toEqual(before)
  })
  test('manifest 无 stamps 路径时首次新增登记路径；invert 恢复 absent 路径', () => {
    const s0 = state() // manifest.content 无 stamps
    expect(s0.manifest.content).not.toHaveProperty('stamps')
    const command = new AddStampTemplateCommand(template('tree'))
    const s1 = command.apply(s0)
    expect(s1.manifest.content.stamps).toBe('content/stamps.json')
    expect(s1.stamps).toHaveLength(1)
    const s2 = command.invert(s1)
    expect(s2.manifest.content).not.toHaveProperty('stamps')
    expect(s2.stamps).toEqual([])
  })
})

describe('C2 ReplaceStampTemplateCommand · 边界', () => {
  test('缺目标抛错；同值 no-op；authored 不得倒回 migrated（现行合同）', () => {
    const s0 = state([template('tree')])
    expect(() => new ReplaceStampTemplateCommand(template('ghost')).apply(s0)).toThrow(/不存在/)
    const sameValue = new ReplaceStampTemplateCommand(template('tree')).apply(s0)
    expect(sameValue.stamps).toEqual(s0.stamps) // 同值 no-op：内容不变（validateNext 可换引用）
    expect(sameValue.stamps).toHaveLength(1)
    const downgraded = template('tree', 'migrated')
    expect(() => new ReplaceStampTemplateCommand(downgraded).apply(s0)).toThrow(
      /作者图章 "tree" 不能改回 migrated/,
    )
  })
  test('migrated 未显式接管拒绝；接管后 origin 必须 authored；invert 恢复迁移前整项', () => {
    const s0 = state([template('tree', 'migrated')])
    const renamed = { ...template('tree'), name: '新名' }
    expect(() => new ReplaceStampTemplateCommand(renamed).apply(s0)).toThrow(/必须显式接管/)
    const command = new ReplaceStampTemplateCommand(renamed, { takeOwnership: true })
    const s1 = command.apply(s0)
    expect(s1.stamps[0]!.name).toBe('新名')
    expect(s1.stamps[0]!.origin).toBe('authored')
    const s2 = command.invert(s1)
    expect(s2.stamps[0]).toEqual(template('tree', 'migrated'))
  })
})

describe('C3 DuplicateStampTemplateCommand · 边界', () => {
  test('缺来源抛错；副本 id 冲突走 Add 守卫；来源保持不动', () => {
    const s0 = state([template('tree')])
    expect(() => new DuplicateStampTemplateCommand('ghost', 'copy').apply(s0)).toThrow(/不存在/)
    expect(() => new DuplicateStampTemplateCommand('tree', 'tree').apply(s0)).toThrow(/已存在/)
    const command = new DuplicateStampTemplateCommand('tree', 'copy', '副本名')
    const s1 = command.apply(s0)
    expect(s1.stamps.map((t) => t.id)).toEqual(['tree', 'copy'])
    expect(s1.stamps[1]!.origin).toBe('authored')
    expect(s1.stamps[1]!.name).toBe('副本名')
    expect(s1.stamps[0]).toEqual(template('tree'))
    const s2 = command.invert(s1)
    expect(s2.stamps.map((t) => t.id)).toEqual(['tree'])
  })
})

describe('C4 DeleteStampTemplateCommand · 边界', () => {
  test('无 proof 拒绝（真实引用扫描合同）；proof 引用数不符拒绝', () => {
    const session = new EditSession(state([template('tree')]))
    expect(() =>
      new DeleteStampTemplateCommand('tree', undefined as unknown as StampDeletionProof, (c) =>
        session.getCurrentMapReferenceBatch(c),
      ).apply(session.getState()),
    ).toThrow(/删除组合前必须完成全项目引用扫描/)
  })
  test('真实旧 proof：取证后地图数据变化 → 事实/索引失配拒绝；重新取证后放行（真实状态变化非伪造字段）', async () => {
    // 状态带一张真实地图；取证 → 真实 PaintTiles 使引用事实过期（重扫未完成/覆盖失配）→ 旧 proof 被生产拒绝。
    const withMap = state([template('tree')])
    withMap.maps = {
      'map-s': {
        version: 4,
        width: 1,
        height: 1,
        tilesetRefs: ['tiles'],
        layers: [{ id: 'floor', name: '地面', tiles: [[1], [null]], sources: [[0], [null]] }],
        collision: [[0], [0]],
      },
    }
    withMap.mapIndex = {
      version: 1,
      maps: [{ id: 'map-s', name: '地图', path: 'assets/maps/s.map.json' }],
    }
    const session = new EditSession(withMap)
    await session.ensureMapReferencesIndexed()
    const staleProof = StampDeletionProof.fromBatch(session.getMapReferenceBatch(), 'tree')
    session.dispatch(paintEdit('map-s'))
    expect(() =>
      new DeleteStampTemplateCommand('tree', staleProof, (c) =>
        session.getCurrentMapReferenceBatch(c),
      ).apply(session.getState()),
    ).toThrow(/地图引用事实已变化|地图索引已变化|地图引用扫描不完整/)
    // 重新对当前状态取证 → 放行（正控）
    await session.ensureMapReferencesIndexed()
    const freshProof = StampDeletionProof.fromBatch(session.getMapReferenceBatch(), 'tree')
    expect(
      new DeleteStampTemplateCommand('tree', freshProof, (c) =>
        session.getCurrentMapReferenceBatch(c),
      )
        .apply(session.getState())
        .stamps.map((t) => t.id),
    ).toEqual([])
  })
  test('缺目标 no-op；invert 恢复到原索引；恢复时 ID 已占用 no-op（现行合同）', () => {
    const session = new EditSession(state([template('a'), template('b'), template('tree')]))
    expect(deleteCommand(session, 'ghost').apply(session.getState())).toBe(session.getState())
    const command = deleteCommand(session, 'b')
    const s1 = command.apply(session.getState())
    expect(s1.stamps.map((t) => t.id)).toEqual(['a', 'tree'])
    const s2 = command.invert(s1)
    expect(s2.stamps.map((t) => t.id)).toEqual(['a', 'b', 'tree'])
    // 恢复时 ID 已被占用 → no-op（现行合同）
    const occupied: EditorState = {
      ...s1,
      stamps: [template('a'), template('b'), template('tree')],
    }
    expect(command.invert(occupied).stamps.map((t) => t.id)).toEqual(['a', 'b', 'tree'])
  })
})
