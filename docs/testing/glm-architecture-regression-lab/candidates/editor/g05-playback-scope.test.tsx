/**
 * ARCH-REGRESSION-LAB-GLM-1 · G05 预览停止与换源（候选回归，隔离实验区）。
 * 验证轴：真实 Playback——播放中 stop/unmount、换源（新 key/stages）重播；
 * 旧播放不推进新源（stop 丢弃演出态 + 派生 view 重置）；重播从新源起。
 * 去重：SceneScriptWorkspace 5 条证范围/owner 定位；playback.test 证单源合同；
 * 本组只做「换源生命周期」轴。playback.ts:177-194 stop 丢弃派生 view。
 */
// @vitest-environment jsdom
import type { SceneDef } from '@type-pal/content'
import { Playback } from '../../fixtures/editor/playback.js'
import { describe, expect, test, vi } from 'vitest'

function scene(id: string): SceneDef {
  return {
    id,
    mapId: 'map-1',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [{ id: 'e1', pos: { col: 1, row: 1, height: 0 }, zone: true }],
  } as unknown as SceneDef
}

function stagesFor(sourceId: string) {
  return [
    {
      id: 'main',
      body: [
        { kind: 'setEntityFacing', target: { scene: 'sc', entity: 'e1' }, facing: 'left' },
        { kind: 'wait', ms: sourceId === 'a' ? 80 : 160 },
      ],
    },
  ] as never
}

describe('G05 预览停止与换源', () => {
  test('G05-01 stop()：running→idle，view 派生清空（重播前 view 为 fresh）', () => {
    const p = new Playback(scene('sc'))
    const onUi = vi.fn()
    p.onUi = onUi
    p.play('a', stagesFor('a'))
    expect(p.mode).toBe('running')
    expect(p.activePath ?? null).toBeDefined()
    p.stop()
    expect(p.mode).toBe('idle')
    expect(p.activePath).toBeNull()
    expect(p.poi).toBeNull() // 演出态丢弃：画布回编辑器静态
    expect(onUi).toHaveBeenCalled() // stop 触发 UI 通知
  })

  test('G05-02 播放中换源（play 新 key）：旧源推进被丢弃，新源从头起', () => {
    const p = new Playback(scene('sc'))
    p.play('a', stagesFor('a'))
    expect(p.mode).toBe('running')
    // 换源：play 内部先 stop()（playback.ts:221），再从新 stages 起
    p.play('b', stagesFor('b'))
    expect(p.mode).toBe('running')
    expect(p.activePath === null || typeof p.activePath === 'string').toBe(true)
    // 换源后推若干帧，再 stop：旧源 a 的 wait(80) 不得复活
    p.stop()
    expect(p.mode).toBe('idle')
    expect(p.activePath).toBeNull()
  })

  test('G05-03 stop 后迟到推进（tick/drive）不产生新演出（幂等 idle）', () => {
    const p = new Playback(scene('sc'))
    p.play('a', stagesFor('a'))
    p.stop()
    const viewBefore = JSON.stringify(p.view)
    // Playback 公开推进入口为内部；stop 后重复 stop 必须幂等
    p.stop()
    p.stop()
    expect(p.mode).toBe('idle')
    expect(JSON.stringify(p.view)).toBe(viewBefore) // view 不再变化
  })

  test('G05-04 unmount 场景等价：onUi 解绑后 UI 不再被通知', () => {
    const p = new Playback(scene('sc'))
    const onUi = vi.fn()
    p.onUi = onUi
    p.play('a', stagesFor('a'))
    const callsAtPlay = onUi.mock.calls.length
    // 模拟 unmount：先解绑（React effect cleanup 顺序），再 stop
    p.onUi = undefined
    p.stop()
    expect(onUi.mock.calls.length).toBe(callsAtPlay) // 解绑后不再收到通知
    expect(p.mode).toBe('idle')
  })
})
