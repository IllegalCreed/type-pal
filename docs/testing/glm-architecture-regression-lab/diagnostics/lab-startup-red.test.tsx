/**
 * LAB-STARTUP 业务红诊断（LAB-STARTUP-RED）：
 * 单点破坏 UpdateProjectMapLayerCommand.apply（改名 no-op），同一绿正控输入
 * 必须业务红（改名未生效）——证明绿正控的业务断言有鉴别力，不是恒真。
 * 产品源文件零改动：通过 Vite load 替换仅在本运行内存中生效。
 * 判据：恰一次失败、失败项为本文件钉名测试、AssertionError 首行、破坏加载见证命中。
 */
// @vitest-environment jsdom

import { UpdateProjectMapLayerCommand } from '@lab/editor/commands'
import type { ProjectMap } from '@type-pal/reforge'
import { buildBlankProjectMap } from '@type-pal/reforge'
import { expect, test } from 'vitest'
import { EditSession } from '../fixtures/editor/lab-session.js'

const MUTATION_APPLIED = globalThis.__LAB_STARTUP_RED_MUTATION__ === true

function labMap(): ProjectMap {
  const map = buildBlankProjectMap(2, 2, 'tiles')
  map.id = 'map-a'
  return map
}

function labState(map: ProjectMap) {
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

test('LAB-STARTUP-RED 破坏 apply 后：改名命令不再落到业务对象（恰在绿正控断言处红）', () => {
  expect(MUTATION_APPLIED).toBe(true) // 破坏加载见证：本运行确实加载了被替换模块
  const map = labMap()
  const session = new EditSession(labState(map))
  const command = new UpdateProjectMapLayerCommand('map-a', map.layers[0]!.id, {
    name: '实验室改名层',
  })
  const _dispatched = session.dispatch(command)
  // 绿正控在此处断言 true + 新名；破坏下改名 no-op：
  // dispatch 可能仍计历史（命令合法），但业务对象不得变成新名 —— 绿正控断言在此红
  expect(session.state.maps['map-a']!.layers[0]!.name).toBe('实验室改名层')
})
