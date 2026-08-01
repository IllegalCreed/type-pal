import type { ScriptStage } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { liftEarlyDitherSceneEntry } from './scene-entry.js'

describe('liftEarlyDitherSceneEntry', () => {
  test('把安全前缀与 dither 提升为 Prepare → Reveal → Body', () => {
    const source: ScriptStage = {
      body: [
        { kind: 'playMusic', asset: 'music.pal.031' },
        { kind: 'teleportParty', pos: { col: 59, row: -23, height: 0 } },
        { kind: 'ditherScreen', ms: 2160 },
        { kind: 'dialog', cue: { rows: [{ text: 'after' }] } },
      ],
      next: 'advance',
    }
    const result = liftEarlyDitherSceneEntry(source)
    expect(result.kind).toBe('lifted')
    expect(result.stage).toEqual({
      entry: {
        prepare: source.body.slice(0, 2),
        reveal: { kind: 'dither', ms: 2160, source: 'previousPresentedFrame' },
      },
      body: source.body.slice(3),
      next: 'advance',
    })
    expect(source.entry).toBeUndefined()
    expect(source.body).toHaveLength(4)
  })

  test('阻塞命令、分支和 callScript 前缀均不提升', () => {
    expect(
      liftEarlyDitherSceneEntry(
        { body: [{ kind: 'wait', ms: 1 }, { kind: 'ditherScreen' }] },
        { allowWaitInPrepare: false },
      ),
    ).toMatchObject({ kind: 'unchanged', reason: 'blocked' })
    for (const stage of [
      {
        body: [
          {
            kind: 'branch' as const,
            cond: { kind: 'flag' as const, flag: 'x', is: true },
            then: [],
          },
          { kind: 'ditherScreen' as const },
        ],
      },
      {
        body: [
          {
            kind: 'callScript' as const,
            ref: { chunk: 'scene/s001', id: 'scene/s001/root' },
          },
          { kind: 'ditherScreen' as const },
        ],
      },
    ]) {
      expect(liftEarlyDitherSceneEntry(stage)).toMatchObject({
        kind: 'unchanged',
        reason: 'blocked',
      })
    }
  })

  test('current 迁移允许把 wait 留在隐藏画面的 prepare', () => {
    const stage: ScriptStage = {
      body: [{ kind: 'wait', ms: 180 }, { kind: 'ditherScreen', ms: 720 }],
    }
    expect(liftEarlyDitherSceneEntry(stage)).toEqual({
      kind: 'lifted',
      ditherIndex: 1,
      stage: {
        entry: {
          prepare: [{ kind: 'wait', ms: 180 }],
          reveal: { kind: 'dither', ms: 720, source: 'previousPresentedFrame' },
        },
        body: [],
      },
    })
  })

  test('无 dither 与已有 entry 保持不变', () => {
    const plain: ScriptStage = { body: [{ kind: 'playMusic', asset: 'music.pal.001' }] }
    expect(liftEarlyDitherSceneEntry(plain)).toEqual({
      kind: 'unchanged',
      stage: plain,
      reason: 'no-dither',
    })
    const entry: ScriptStage = {
      entry: { prepare: [], reveal: { kind: 'cut' } },
      body: [],
    }
    expect(liftEarlyDitherSceneEntry(entry)).toEqual({
      kind: 'unchanged',
      stage: entry,
      reason: 'already-entry',
    })
  })
})
