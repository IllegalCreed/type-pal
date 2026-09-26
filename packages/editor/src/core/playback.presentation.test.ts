import type { AuthorScriptFlow, SceneReveal } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { flowOf, preview, settle } from './__tests__/playback-canonical-fixtures.js'

describe('Canonical preview presentation clock', () => {
  test.each<{ reveal: SceneReveal; log: string; black: number }>([
    { reveal: { kind: 'fade', outMs: 0, inMs: 120 }, log: '入场呈现：淡入 120ms', black: 1 },
    {
      reveal: { kind: 'dither', ms: 120, source: 'previousPresentedFrame' },
      log: '入场呈现：逐像素渐变 120ms（预览只模拟时长）',
      black: 0,
    },
  ])('entry $reveal.kind finishes preparation before blocking reveal and body', async ({
    reveal,
    log,
    black,
  }) => {
    const r = preview(),
      p = r.p
    const flow: AuthorScriptFlow = {
      kind: 'stages',
      initial: 'entry',
      stages: [
        {
          id: 'entry',
          entry: {
            prepare: [
              { kind: 'teleportParty', pos: { col: 3, row: 4, height: 2 }, facing: 'left' },
            ],
            reveal,
          },
          body: [{ kind: 'giveMoney', delta: 7 }],
        },
      ],
    }
    await r.start(flow, { allowSceneEntry: true, runSceneEntry: true })
    expect(p.view.player.pos).toEqual({ col: 3, row: 4, height: 2 })
    expect(p.view.player.facing).toBe('left')
    expect(p.view.fadeBlack).toBe(black)
    expect(p.view.logs).toEqual([log])
    p.tick(60)
    await settle()
    expect(p.view.fadeBlack).toBe(black / 2)
    expect(p.view.logs).toEqual([log])
    p.tick(60)
    await settle()
    expect(p.mode).toBe('done')
    expect(p.view.fadeBlack).toBe(0)
    expect(p.view.logs).toEqual([log, '💰 +7 钱'])
    r.unchanged()
  })

  test('skipping scene entry does not execute its prepare/reveal but still runs body', async () => {
    const r = preview(),
      p = r.p
    await r.start(
      {
        kind: 'stages',
        initial: 'entry',
        stages: [
          {
            id: 'entry',
            entry: {
              prepare: [{ kind: 'setPartyFacing', facing: 'left' }],
              reveal: { kind: 'fade', outMs: 0, inMs: 300 },
            },
            body: [{ kind: 'giveMoney', delta: 1 }],
          },
        ],
      },
      { allowSceneEntry: true, runSceneEntry: false },
    )
    expect(p.mode).toBe('done')
    expect(p.view.player.facing).toBe('down')
    expect(p.view.logs).toEqual(['💰 +1 钱'])
    expect(p.tick(300)).toBe(false)
    r.unchanged()
  })

  test('default fade duration exposes intermediate alpha and releases its tail only at 300ms', async () => {
    const r = preview(),
      p = r.p
    await r.start(
      flowOf([
        { kind: 'fade', dir: 'out' },
        { kind: 'giveMoney', delta: 4 },
      ]),
    )
    p.tick(75)
    await settle()
    expect(p.view.fadeBlack).toBe(0.25)
    expect(p.view.logs).toEqual([])
    p.tick(225)
    await settle()
    expect(p.view.fadeBlack).toBe(1)
    expect(p.view.logs).toEqual(['💰 +4 钱'])
    expect(p.mode).toBe('done')
    p.stop()
    expect(p.view.fadeBlack).toBe(0)
    r.unchanged()
  })

  test('default dither waits 720ms without pretending to render pixels', async () => {
    const r = preview(),
      p = r.p
    await r.start(flowOf([{ kind: 'ditherScreen' }, { kind: 'giveMoney', delta: 6 }]))
    expect(p.view.logs).toEqual(['逐像素渐变 720ms（编辑器预览只模拟时长）'])
    p.tick(719)
    await settle()
    expect(p.mode).toBe('running')
    expect(p.view.fadeBlack).toBe(0)
    p.tick(1)
    await settle()
    expect(p.mode).toBe('done')
    expect(p.view.logs.at(-1)).toBe('💰 +6 钱')
    r.unchanged()
  })

  test('stopping an active fade clears its activity and never runs the old tail', async () => {
    const r = preview(),
      p = r.p
    await r.start(
      flowOf([
        { kind: 'fade', dir: 'out', ms: 100 },
        { kind: 'giveMoney', delta: 99 },
      ]),
    )
    p.tick(40)
    expect(p.view.fadeBlack).toBe(0.4)
    p.stop()
    await settle()
    const reset = structuredClone(p.view)
    expect(p.tick(1000)).toBe(false)
    await settle()
    expect(p.view).toEqual(reset)
    expect(p.mode).toBe('idle')
    r.unchanged()
  })

  test('canonical scene transfer terminates after its log, clears hold and skips subsequent commands', async () => {
    const r = preview(),
      p = r.p
    await r.start(
      flowOf([
        { kind: 'holdScreen', color: 'black', token: 'cut' },
        { kind: 'loadScene', scene: 'another-room' },
        { kind: 'giveMoney', delta: 99 },
      ]),
    )
    expect(p.mode).toBe('done')
    expect(p.activePath).toBeNull()
    expect(p.view.fadeBlack).toBe(0)
    expect(p.view.logs).toEqual(['⬛ 保持黑屏（cut）', '🚪 切场景 another-room(预览到此为止)'])
    r.unchanged()
  })
})
