import type { StampTemplateV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import { EditSession } from './edit-session.js'
import {
  AddStampTemplateCommand,
  DeleteStampTemplateCommand,
  DuplicateStampTemplateCommand,
  ReplaceStampTemplateCommand,
} from './stamp-commands.js'

function template(id = 'tree', origin: StampTemplateV1['origin'] = 'authored'): StampTemplateV1 {
  return {
    id,
    name: id,
    tilesetId: 'tiles',
    origin,
    layerSlots: [{ id: 'floor', name: '地面', depthMode: 'flat' }],
    visual: [{ layerSlotId: 'floor', offset: { dRow: 0, du: 0 }, tileId: 1, height: 0 }],
    collision: [],
  }
}

function state(stamps: StampTemplateV1[] = []): EditorState {
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
    startWorld: { party: [], money: 0, learnedSkills: {}, inventory: [] },
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
      visual: [{ ...template().visual[0]!, tileId: 9 }],
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

  test('删除保留原索引并可撤销；不存在时 no-op', () => {
    const session = new EditSession(state([template('a'), template('b')]))
    expect(session.dispatch(new DeleteStampTemplateCommand('missing'))).toBe(false)
    session.dispatch(new DeleteStampTemplateCommand('a'))
    expect(session.getState().stamps.map((stamp) => stamp.id)).toEqual(['b'])
    session.undo()
    expect(session.getState().stamps.map((stamp) => stamp.id)).toEqual(['a', 'b'])
  })
})
