import type { StampTemplate } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import {
  AddStampTemplateCommand,
  DeleteStampTemplateCommand,
  DuplicateStampTemplateCommand,
  ReplaceStampTemplateCommand,
} from './stamp-commands.js'
import { StampDeletionProof } from './tileset-references.js'

function template(id = 'tree', origin: StampTemplate['origin'] = 'authored'): StampTemplate {
  return {
    id,
    name: id,
    origin,
    width: 1,
    height: 1,
    anchor: { row: 0, col: 0 },
    tilesetRefs: ['tiles'],
    layers: [{ id: 'floor', name: '地面', tiles: [[1], [null]], sources: [[0], [null]] }],
    collision: [[null], [null]],
  }
}

function state(stamps: StampTemplate[] = []): EditorState {
  return {
    manifest: { content: {} } as EditorState['manifest'],
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps,
  } as EditorState
}

function deleteCommand(session: EditSession, id: string): DeleteStampTemplateCommand {
  return new DeleteStampTemplateCommand(
    id,
    StampDeletionProof.fromBatch(session.getMapReferenceBatch(), id),
    (current) => session.getCurrentMapReferenceBatch(current),
  )
}

describe('stamp template commands', () => {
  test('首次新增原子登记 manifest，撤销恢复 absent，重做保持单一模板身份', () => {
    const session = new EditSession(state())
    session.dispatch(new AddStampTemplateCommand(template()))
    expect(session.getState().stamps.map((stamp) => stamp.id)).toEqual(['tree'])
    expect(session.getState().manifest.content.stamps).toBe('content/stamps.json')
    expect(() => session.dispatch(new AddStampTemplateCommand(template()))).toThrow('已存在')
    session.undo()
    expect(session.getState().stamps).toEqual([])
    expect(session.getState().manifest.content).not.toHaveProperty('stamps')
    session.redo()
    expect(session.getState().stamps[0]?.id).toBe('tree')
    expect(session.getState().manifest.content.stamps).toBe('content/stamps.json')
  })

  test('更新 migrated 模板必须显式接管，undo 恢复整项', () => {
    const session = new EditSession(state([template('tree', 'migrated')]))
    const next = {
      ...template('tree'),
      name: '我的树',
      layers: [{ ...template().layers[0]!, tiles: [[9], [null]] }],
    }
    expect(() => session.dispatch(new ReplaceStampTemplateCommand(next))).toThrow('显式接管')
    expect(session.getState().stamps[0]).toEqual(template('tree', 'migrated'))
    session.dispatch(new ReplaceStampTemplateCommand(next, { takeOwnership: true }))
    expect(session.getState().stamps[0]).toMatchObject({ name: '我的树', origin: 'authored' })
    session.undo()
    expect(session.getState().stamps[0]).toEqual(template('tree', 'migrated'))
  })

  test('复制 migrated 模板产生独立 authored id，undo/redo 不修改来源', () => {
    const session = new EditSession(state([template('tree', 'migrated')]))
    session.dispatch(new DuplicateStampTemplateCommand('tree', 'tree-copy', '我的树'))
    expect(session.getState().stamps).toEqual([
      template('tree', 'migrated'),
      { ...template('tree', 'migrated'), id: 'tree-copy', name: '我的树', origin: 'authored' },
    ])
    session.undo()
    expect(session.getState().stamps).toEqual([template('tree', 'migrated')])
    session.redo()
    expect(session.getState().stamps[1]?.origin).toBe('authored')
  })

  test('地图引用 batch 同 revision 复用缓存，组合更新只替换目标 facts', () => {
    const session = new EditSession(state([template('a'), template('b')]))
    const before = session.getMapReferenceBatch()
    expect(session.getMapReferenceBatch()).toBe(before)
    const beforeB = before.stampFacts.find((facts) => facts.stampId === 'b')

    session.dispatch(
      new ReplaceStampTemplateCommand({
        ...template('a'),
        name: 'A 改',
        tilesetRefs: ['tiles-next'],
      }),
    )
    const after = session.getMapReferenceBatch()
    expect(after).not.toBe(before)
    expect(after.stampFacts.find((facts) => facts.stampId === 'b')).toBe(beforeB)
    expect(after.stampFacts.find((facts) => facts.stampId === 'a')).toMatchObject({
      stampName: 'A 改',
      tilesetIds: ['tiles-next'],
    })
    expect(session.getMapReferenceBatch()).toBe(after)
  })

  test('错误的 affected stamp 元数据只会令 batch 失效，按需扫描后才恢复', async () => {
    const session = new EditSession(state([template('a')]))
    session.getMapReferenceBatch()
    session.dispatch({
      label: '模拟未来错误命令',
      mapReferenceStampIds: ['wrong-id'],
      apply: (current) => ({
        ...current,
        stamps: current.stamps.map((stamp) =>
          stamp.id === 'a' ? { ...stamp, name: 'A 新名称' } : stamp,
        ),
      }),
      invert: (current) => current,
    })

    expect(session.getMapReferenceBatch()).toMatchObject({
      done: false,
      stampCompleted: 0,
      stampTotal: 1,
    })
    const repaired = await session.ensureMapReferencesIndexed()
    expect(repaired).toMatchObject({ done: true, stampCompleted: 1, stampTotal: 1 })
    expect(repaired.stampFacts[0]?.stampName).toBe('A 新名称')
  })

  test('删除保留原索引并可撤销；不存在时 no-op', () => {
    const session = new EditSession(state([template('a'), template('b')]))
    expect(session.dispatch(deleteCommand(session, 'missing'))).toBe(false)
    session.dispatch(deleteCommand(session, 'a'))
    expect(session.getState().stamps.map((stamp) => stamp.id)).toEqual(['b'])
    session.undo()
    expect(session.getState().stamps.map((stamp) => stamp.id)).toEqual(['a', 'b'])
  })
})
