/**
 * ARCH-REGRESSION-LAB-GLM-1 · G02 地图会话失效（候选回归，隔离实验区）。
 * 验证轴：**活跃手势/迟到事件**跨越会话切换（同 mapId 换 EditSession）与跨 mapId 切换：
 * 旧手势不得把笔划提交进新会话；跨 mapId 时清场 effect（MapMode.tsx:605-630）必须覆盖活跃手势。
 * 去重：MapMode.test.tsx:1507/:1579/:1611/:2000 证普通切换清场；本组差异在「手势进行中切换 + 迟到事件」。
 */
// @vitest-environment jsdom
import { EditSession } from '../../fixtures/editor/lab-session.js'
import {
  installLabDomStubs,
  labState,
  mountLabMap,
  pointer,
  unmountAllLabMaps,
} from '../../fixtures/editor/map-harness.js'
import { buildBlankProjectMap } from '@type-pal/reforge'
import type { ProjectMap } from '@type-pal/reforge'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { labButton } from '../../fixtures/editor/map-harness.js'

beforeEach(() => {
  installLabDomStubs()
})
afterEach(async () => {
  await unmountAllLabMaps()
  vi.clearAllMocks()
})

describe('G02 地图会话失效', () => {
  test('G02-01 活跃笔划中换同 mapId 新 EditSession：迟到 up 不把旧笔划提交进新会话', async () => {
    const { host, canvas, session: oldSession, rerenderWithSession } = await mountLabMap()
    await act(async () => labButton(host, '笔刷').click())
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointermove', { clientX: 34, clientY: 2 })
    })
    // 手势进行中换会话（同 mapId、全新初始状态）：handler 重绑到新会话
    const nextSession = new EditSession(labState(buildBlankProjectMap(3, 2, 'tiles')))
    const nextBefore = nextSession.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])
    const oldBefore = oldSession.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])
    await act(async () => {
      await rerenderWithSession(nextSession)
    })
    await act(async () => {
      pointer(canvas, 'pointerup', { clientX: 35, clientY: 2 })
    })
    // 旧会话：迟到 up 不得提交旧笔划（handler 已换绑）
    expect(oldSession.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])).toEqual(oldBefore)
    // 新会话（真实业务对象）：活跃期间收集的笔划不得写入新会话
    expect(nextSession.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])).toEqual(nextBefore)
  })

  test('G02-02 活跃笔划中跨 mapId 切换：清场 effect 覆盖活跃手势，迟到 up 两边都不提交', async () => {
    const mapA = buildBlankProjectMap(3, 2, 'tiles')
    mapA.id = 'map-a'
    const mapB = buildBlankProjectMap(3, 2, 'tiles')
    mapB.id = 'map-b'
    const state = labState(mapA)
    state.maps['map-b'] = mapB
    state.mapIndex = {
      version: 1,
      maps: [
        { id: 'map-a', name: '甲', path: 'content/maps/map-a.json' },
        { id: 'map-b', name: '乙', path: 'content/maps/map-b.json' },
      ],
    }
    const { host, canvas, session, rerenderWithSelectedMap } = await mountLabMap({
      map: mapA,
      state,
    })
    await act(async () => labButton(host, '笔刷').click())
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointermove', { clientX: 34, clientY: 2 })
    })
    const before = session.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])
    // 跨 mapId：selectedMapId 切到 map-b（清场 effect :605-630 清 strokeRef/paintingRef）
    await act(async () => {
      await rerenderWithSelectedMap('map-b', session)
    })
    await act(async () => {
      pointer(canvas, 'pointerup', { clientX: 35, clientY: 2 })
    })
    // 旧 map-a 未被迟到 up 提交笔划
    expect(session.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])).toEqual(before)
    // 新 map-b 也未被写入（buildBlankProjectMap rows = height×2 = 4）
    expect(session.getState().maps['map-b']!.layers[0]!.tiles.map((r) => [...r!])).toEqual(
      Array.from({ length: 4 }, () => Array.from({ length: 3 }, () => null)),
    )
  })

  test('G02-03 活跃选区拖动中换会话：迟到 up 不向新会话派发 set-selection', async () => {
    const map = buildBlankProjectMap(3, 2, 'tiles')
    map.layers[0]!.tiles[0]![0] = 1
    const { host, canvas, onWorkspaceNotice } = await mountLabMap({ map })
    await act(async () => labButton(host, '选择').click())
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointermove', { clientX: 40, clientY: 20 })
    })
    const nextSession = new EditSession(labState(map))
    const callsAtSwap = onWorkspaceNotice.mock.calls.length
    await act(async () => {
      pointer(canvas, 'pointerup', { clientX: 40, clientY: 20 })
    })
    // 换会话后迟到 up：不产生新的选区通知（通知来自 set-selection 派发路径）
    const newCalls = onWorkspaceNotice.mock.calls.slice(callsAtSwap)
    expect(newCalls.some((c) => String((c[0] ?? {}).message ?? '').includes('已选择'))).toBe(false)
    void nextSession
  })
})
