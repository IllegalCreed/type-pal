/**
 * ARCH-REGRESSION-LAB-GLM-1 · LAB-STARTUP 启动小样（工作包 §0.4）。
 * 一个真实绿正控（本文件，候选绿套件）+ 一个单点破坏后的业务红负控
 * （diagnostics/lab-startup-red.test.tsx，单独运行）。
 * 真实 EditSession + 真实生产命令（UpdateProjectMapLayerCommand），
 * 断言业务对象实变与 undo/redo 保真；不 mock 命令/会话。
 * State 构造对齐 MapMode.test.tsx 的 editorState 口径（含 assetCatalog 等真实必填键）。
 */
// @vitest-environment jsdom

import type { ProjectMap } from '@type-pal/reforge'
import { buildBlankProjectMap } from '@type-pal/reforge'
import { describe, expect, test } from 'vitest'
import { UpdateProjectMapLayerCommand } from '../../core/commands.js'
import type { EditorState } from '../../core/edit-session.js'
import { EditSession } from '../../core/edit-session.js'

function labMap(): ProjectMap {
  return buildBlankProjectMap(2, 2, 'tiles')
}

function labState(map: ProjectMap): EditorState {
  return {
    manifest: { content: {} } as never,
    scenes: [],
    sceneIndex: { version: 1, scenes: [] },
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    maps: { 'map-a': map },
    mapIndex: {
      version: 1,
      maps: [{ id: 'map-a', name: '测试地图', path: 'content/maps/map-a.json' }],
    },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    stamps: [],
    scriptChunks: {},
  } as EditorState
}

describe('LAB-STARTUP 启动小样', () => {
  test('绿正控：真实 EditSession 执行地图改名命令，undo/redo 业务状态保真', () => {
    const map = labMap()
    const before = structuredClone(map)
    const session = new EditSession(labState(map))
    const command = new UpdateProjectMapLayerCommand('map-a', map.layers[0]!.id, {
      name: '实验室改名层',
    })
    expect(session.dispatch(command)).toBe(true)
    // 业务对象实变（非 mock 计数）
    expect(session.getState().maps['map-a']!.layers[0]!.name).toBe('实验室改名层')
    // undo 保真：回到操作前值
    expect(session.undo()).toBe(true)
    expect(session.getState().maps['map-a']!.layers[0]!.name).toBe(before.layers[0]!.name)
    // redo 保真：再进新值
    expect(session.redo()).toBe(true)
    expect(session.getState().maps['map-a']!.layers[0]!.name).toBe('实验室改名层')
  })
})
