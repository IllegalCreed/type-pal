/**
 * ARCH-REGRESSION-LAB-GLM-1 · G02 地图会话失效（正式回归）。
 * 验证轴：**活跃手势/迟到事件**跨越会话切换（同 mapId 换 EditSession）与跨 mapId 切换：
 * 旧手势不得把笔划提交进新会话；跨 mapId 时清场 effect（MapMode.tsx:605-630）必须覆盖活跃手势。
 * 去重：MapMode.test.tsx:1507/:1579/:1611/:2000 证普通切换清场；本组差异在「手势进行中切换 + 迟到事件」。
 */
// @vitest-environment jsdom

import { buildBlankProjectMap } from '@type-pal/reforge'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../../core/edit-session.js'
import {
  installLabDomStubs,
  labButton,
  labState,
  mountLabMap,
  pointer,
  unmountAllLabMaps,
} from './map-harness.js'

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
    expect(oldSession.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])).toEqual(
      oldBefore,
    )
    // 新会话（真实业务对象）：活跃期间收集的笔划不得写入新会话
    expect(nextSession.getState().maps['map-a']!.layers[0]!.tiles.map((r) => [...r!])).toEqual(
      nextBefore,
    )
  })

  test('G02-02 活跃笔划中跨 mapId 切换：清场 effect 覆盖活跃手势，迟到 up 两边都不提交', async () => {
    const mapA = buildBlankProjectMap(3, 2, 'tiles')
    const mapB = buildBlankProjectMap(3, 2, 'tiles')
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

  test('G02-03 活跃选区拖动中换会话：迟到 up 不在新会话提交选区；新会话新选区的删除只写新会话地图', async () => {
    // 选区是 MapMode 组件内 reducer 业务状态（mapWorkspaceReducer change-selection），
    // 其业务结果落在会话地图上：本例以「选区→右键→删除→瓦片消失」证明选区归属新会话编辑上下文。
    // 定位策略同 G01-05：笔刷与选择单击用同一屏幕点，保证选区格 = 已画瓦片格。
    const map = buildBlankProjectMap(3, 2, 'tiles')
    const {
      host,
      canvas,
      onWorkspaceNotice,
      session: oldSession,
      rerenderWithSession,
    } = await mountLabMap({ map })
    const firstPainted = (
      m: NonNullable<ReturnType<EditSession['getState']>['maps'][string]>,
    ): { row: number; col: number } | null => {
      const tiles = m.layers[0]!.tiles
      for (let row = 0; row < tiles.length; row++)
        for (let col = 0; col < tiles[row]!.length; col++)
          if (tiles[row]![col] !== null) return { row, col }
      return null
    }
    await act(async () => labButton(host, '笔刷').click())
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointerup', { clientX: 33, clientY: 1 })
    })
    // EditSession 派发产生新 state：已画瓦片从会话 state 读（业务对象真值）
    const paintedInOld = firstPainted(oldSession.getState().maps['map-a']!)
    expect(paintedInOld).not.toBeNull()
    // 换会话：新会话持有同一已画地图的**独立深拷贝**（业务隔离 witness 用）
    const nextSession = new EditSession(
      labState(structuredClone(oldSession.getState().maps['map-a']!)),
    )
    await act(async () => labButton(host, '选择').click())
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointermove', { clientX: 300, clientY: 300 })
    })
    const callsAtSwap = onWorkspaceNotice.mock.calls.length
    await act(async () => {
      await rerenderWithSession(nextSession)
    })
    await act(async () => {
      pointer(canvas, 'pointerup', { clientX: 300, clientY: 300 })
    })
    // 换会话后迟到 up：不产生新的选区通知，无选区预览（set-selection 未派发到新会话）
    const newCalls = onWorkspaceNotice.mock.calls.slice(callsAtSwap)
    expect(newCalls.some((c) => String(c[0]?.message ?? '').includes('已选择'))).toBe(false)
    expect(host.querySelector('.map-content-selection-preview')).toBeNull()
    // 正控（新会话业务上下文）：换会话会将工具重置回笔刷（MapMode 会话切换重置行为），
    // 重新进入选择工具后以单击 (33,1) 在新会话提交单格选区（同屏点 = 同一格）
    await act(async () => labButton(host, '选择').click())
    await act(async () => {
      pointer(canvas, 'pointerdown', { clientX: 33, clientY: 1 })
      pointer(canvas, 'pointerup', { clientX: 33, clientY: 1 })
    })
    expect(host.querySelector('.map-content-selection-preview')).not.toBeNull()
    // 新会话选区的删除只写新会话地图：老地图瓦片原样，新地图瓦片被真实删除
    await act(async () => {
      canvas.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: 24,
          clientY: 24,
        }),
      )
    })
    const menu = host.querySelector<HTMLElement>('[role="menu"][aria-label="地图选区操作"]')
    expect(menu).not.toBeNull()
    const deleteItem = [...menu!.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes('删除'),
    )
    expect(deleteItem).not.toBeUndefined()
    expect(deleteItem!.disabled).toBe(false)
    await act(async () => deleteItem!.click())
    expect(firstPainted(nextSession.getState().maps['map-a']!)).toBeNull() // 新会话地图：瓦片被删除
    expect(firstPainted(oldSession.getState().maps['map-a']!)).toEqual(paintedInOld) // 老会话地图：原样（业务隔离）
  })
})
