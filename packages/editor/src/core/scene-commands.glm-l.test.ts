import type { SceneDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { waveLEditorState } from '../__tests__/glm-l/editor-state.js'
import type { EditorState } from './edit-session.js'
import type { CurrentProjectReferenceIndexProvider } from './project-reference-adapters.js'
import {
  AddSceneCommand,
  DeleteSceneCommand,
  DeleteSceneEntryCommand,
  DuplicateSceneCommand,
  UpdateSceneCommand,
  UpdateSceneNameCommand,
  UpsertSceneEntryCommand,
} from './scene-commands.js'

function scene(id: string): SceneDef {
  return {
    id,
    mapId: 'map',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
  }
}

function state(): EditorState {
  return waveLEditorState({
    scenes: [scene('source')],
    sceneIndex: {
      version: 1,
      scenes: [{ id: 'source', name: '来源', path: 'content/scenes/source.json' }],
    },
    maps: {},
  })
}

const neverProvider: CurrentProjectReferenceIndexProvider = () => {
  throw new Error('引用索引不应在缺目标早退时被调用')
}

describe('TEST-GLM-WAVE-L-1 L02 scene command no-op & guard branches', () => {
  test('UpdateScene 对缺场景 apply/invert 均零写；重复 apply 只捕获一次旧值', () => {
    const base = state()
    const command = new UpdateSceneCommand('ghost', { music: 'music-a' })
    expect(command.apply(base)).toBe(base)
    expect(command.invert(base)).toBe(base)

    const withMusic: EditorState = {
      ...base,
      scenes: [{ ...scene('source'), music: 'old' }],
    }
    const replay = new UpdateSceneCommand('source', { music: 'new' })
    const once = replay.apply(withMusic)
    const twice = replay.apply(once)
    expect(twice.scenes[0]?.music).toBe('new')
    const inverted = replay.invert(twice)
    expect(inverted.scenes[0]?.music).toBe('old')
  })

  test('UpsertSceneEntry 拒绝空 id；缺场景 apply/invert 零写', () => {
    expect(
      () =>
        new UpsertSceneEntryCommand('source', '', {
          label: 'x',
          pos: { col: 0, row: 0, height: 0 },
        }),
    ).toThrow('落点 id 不能为空')
    const base = state()
    const command = new UpsertSceneEntryCommand('ghost', 'door', {
      label: '门',
      pos: { col: 1, row: 1, height: 0 },
    })
    expect(command.apply(base)).toBe(base)
    expect(command.invert(base)).toBe(base)
  })

  test('DeleteSceneEntry 缺场景或缺落点时先于引用索引早退', () => {
    const base = state()
    const missingScene = new DeleteSceneEntryCommand('ghost', 'door', neverProvider)
    expect(missingScene.apply(base)).toBe(base)
    const missingEntry = new DeleteSceneEntryCommand('source', 'nope', neverProvider)
    expect(missingEntry.apply(base)).toBe(base)
  })

  test('AddScene 双重身份门：id 重复与 index/id 不符都在 apply 期抛错', () => {
    const base = state()
    const asset = { id: 'source', name: '重复', path: 'content/scenes/source.json' }
    expect(() => new AddSceneCommand(asset, scene('source')).apply(base)).toThrow(
      '场景 id "source" 已存在',
    )
    expect(() =>
      new AddSceneCommand(
        { id: 'created', name: '新', path: 'content/scenes/created.json' },
        scene('other'),
      ).apply(base),
    ).toThrow('场景 index/id 不符 "created" / "other"')
    const command = new AddSceneCommand(
      { id: 'created', name: '新', path: 'content/scenes/created.json' },
      scene('created'),
    )
    expect(command.invert(base)).toBe(base)
  })

  test('DuplicateScene 缺源与目标 id 冲突都在 apply 期抛错', () => {
    const base = state()
    const asset = { id: 'copy', name: '副本', path: 'content/scenes/copy.json' }
    expect(() => new DuplicateSceneCommand('ghost', asset).apply(base)).toThrow('场景不存在 ghost')
    const conflicting = { ...asset, id: 'source' }
    expect(() => new DuplicateSceneCommand('source', conflicting).apply(base)).toThrow(
      '场景 id "source" 已存在',
    )
  })

  test('UpdateSceneName 三个守卫：缺场景抛错、空白名抛错、同名零写', () => {
    const base = state()
    expect(() => new UpdateSceneNameCommand('ghost', '新名').apply(base)).toThrow(
      '场景不存在 ghost',
    )
    expect(() => new UpdateSceneNameCommand('source', '   ').apply(base)).toThrow(
      '场景显示名不能为空',
    )
    const same = new UpdateSceneNameCommand('source', ' 来源 ')
    expect(same.apply(base)).toBe(base)
    expect(same.invert(base)).toBe(base)
  })

  test('DeleteScene 守卫：缺正文、缺登记与未 apply 的 invert 都显式失败', () => {
    const base = state()
    expect(() => new DeleteSceneCommand('ghost', neverProvider).apply(base)).toThrow(
      '场景不存在 ghost',
    )
    const unregistered: EditorState = {
      ...base,
      scenes: [scene('orphan')],
    }
    expect(() => new DeleteSceneCommand('orphan', neverProvider).apply(unregistered)).toThrow(
      'SceneIndex 未登记场景 orphan',
    )
    const command = new DeleteSceneCommand('source', neverProvider)
    expect(() => command.invert(base)).toThrow('删除场景: 尚未 apply')
  })
})
