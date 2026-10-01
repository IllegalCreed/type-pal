/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C05-G02：UpdateSpriteCommand 新轴（合法 blank + 真实精灵字节）。
 * 排重：sprite-commands.residual（durationMs=0 / actualFrameCount=0 / 无 provider 删除 / 缺 AssetId）、
 * glm-boundaries（缺席 id 三向、仅 label、sha 过期、static 布局放行）、glm-next-wave（入参篡改）、
 * sprite-reference-commands（动作边阻断/provider 失败/redo 复核）已证。本文件只补：
 * 多字段 patch 的联合捕获与撤销、directional 布局的 frames-per-dir 越界边界与确切帧列表、
 * 非法布局与非法动作各字段的确切报错、proof.asset 失配/缺省、仅 label 不受 proof 约束、
 * 删除动作错误文案对全部被删 ActionId 的列举、provider 仅在“删除”时被咨询、首次 apply 捕获不被覆盖。
 * 非法输入只作为命令入参；项目状态始终取自 loader + assertProjectSaveValid 的合法项目。
 */
import type { SpriteActionDef } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import {
  actionOf,
  C05_ASSET,
  C05_SPRITE,
  type C05CoreOpen,
  openC05Core,
} from '../__tests__/cursor-asset-r1/c05-action-fixtures.js'
import { AddEntityCommand } from './commands.js'
import type { EditorState } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import { SpriteInUseError, UpdateSpriteCommand } from './sprite-commands.js'

const refs = (state: EditorState) => collectCurrentProjectReferenceIndex(state)

function thrown(run: () => unknown): Error {
  try {
    run()
  } catch (reason) {
    if (reason instanceof Error) return reason
    throw new Error(`非 Error 抛出：${String(reason)}`)
  }
  throw new Error('期望抛出但未抛出')
}

function hero(state: EditorState) {
  const found = state.sprites.find((sprite) => sprite.id === C05_SPRITE)
  if (!found) throw new Error('缺 hero')
  return found
}

const ILLEGAL_LAYOUT = `精灵 ${C05_SPRITE} 的布局非法；自动循环请创建预制动作`
const illegalAction = (id: string) => `精灵 ${C05_SPRITE} 的预制动作 ${id} 非法`

function patchPoses(open: C05CoreOpen, poses: Record<string, SpriteActionDef>) {
  return new UpdateSpriteCommand(C05_SPRITE, { poses }, open.proof, refs)
}

describe('C05-G02 UpdateSpriteCommand 联合补丁与非法形状', () => {
  test('C05-G02-01 layout+poses+label 联合补丁一次落地，invert 同时还原三个字段', async () => {
    const open = await openC05Core('c05-g02-01', {
      poses: { idle: actionOf('待机', [0], { order: 0 }) },
    })
    const state = open.session.getState()
    const command = new UpdateSpriteCommand(
      C05_SPRITE,
      {
        label: '联合',
        layout: { kind: 'directional', framesPerDir: 1 },
        poses: { walk: actionOf('走', [1, 2], { order: 0, loopFrom: 0 }) },
      },
      open.proof,
      refs,
    )
    // 注意：idle 被 poses 补丁整体替换，引用索引里没有 idle 的动作引用，可以删除。
    const next = command.apply(state)
    const changed = hero(next)
    expect(changed.label).toBe('联合')
    expect(changed.layout).toEqual({ kind: 'directional', framesPerDir: 1 })
    expect(Object.keys(changed.poses ?? {})).toEqual(['walk'])
    expect(changed.asset).toBe(C05_ASSET)
    const restored = hero(command.invert(next))
    expect(restored.label).toBe('C05 英雄')
    expect(restored.layout).toEqual({ kind: 'static' })
    expect(restored.poses).toEqual({ idle: actionOf('待机', [0], { order: 0 }) })
  })

  test('C05-G02-02 directional 布局：framesPerDir×4 恰等于实际帧数放行，多 1 帧抛出确切越界帧列表', async () => {
    const open = await openC05Core('c05-g02-02', { frameCount: 8 })
    const state = open.session.getState()
    const ok = new UpdateSpriteCommand(
      C05_SPRITE,
      { layout: { kind: 'directional', framesPerDir: 2 } },
      open.proof,
      refs,
    ).apply(state)
    expect(hero(ok).layout).toEqual({ kind: 'directional', framesPerDir: 2 })

    const small = await openC05Core('c05-g02-02b', { frameCount: 6 })
    const overflow = new UpdateSpriteCommand(
      C05_SPRITE,
      { layout: { kind: 'directional', framesPerDir: 2 } },
      small.proof,
      refs,
    )
    expect(thrown(() => overflow.apply(small.session.getState())).message).toBe(
      '布局会新增越界帧 6, 7，资源实际只有 6 帧',
    )
    expect(hero(small.session.getState()).layout).toEqual({ kind: 'static' })
  })

  test('C05-G02-03 非法布局：loop 与 framesPerDir 为 0/负/小数/NaN 全部以同一布局非法文案拒绝且状态原样', async () => {
    const open = await openC05Core('c05-g02-03')
    const state = open.session.getState()
    const before = structuredClone(hero(state))
    const layouts = [
      { kind: 'loop', frameCount: 2 },
      { kind: 'directional', framesPerDir: 0 },
      { kind: 'directional', framesPerDir: -1 },
      { kind: 'directional', framesPerDir: 1.5 },
      { kind: 'directional', framesPerDir: Number.NaN },
    ] as const
    for (const layout of layouts) {
      const command = new UpdateSpriteCommand(C05_SPRITE, { layout }, open.proof, refs)
      expect(thrown(() => command.apply(state)).message).toBe(ILLEGAL_LAYOUT)
    }
    expect(hero(state)).toEqual(before)
  })

  test('C05-G02-04 非法动作：空白名称与空步骤各自以“预制动作 <id> 非法”拒绝，错误指名具体 ActionId', async () => {
    const open = await openC05Core('c05-g02-04')
    const state = open.session.getState()
    const blankLabel = patchPoses(open, { 'spaced-out': { ...actionOf('   ', [0]) } })
    expect(thrown(() => blankLabel.apply(state)).message).toBe(illegalAction('spaced-out'))
    const noSteps = patchPoses(open, {
      ok: actionOf('好', [0], { order: 0 }),
      bare: { label: '空步骤', order: 1, steps: [] },
    })
    expect(thrown(() => noSteps.apply(state)).message).toBe(illegalAction('bare'))
    expect(hero(state).poses).toBeUndefined()
  })

  test('C05-G02-05 非法数值：帧号负数/小数/NaN 与停留小数/负数/NaN 均拒绝', async () => {
    const open = await openC05Core('c05-g02-05')
    const state = open.session.getState()
    const frameCases: SpriteActionDef[] = [
      { label: 'a', steps: [{ frame: -1, durationMs: 100 }] },
      { label: 'a', steps: [{ frame: 0.5, durationMs: 100 }] },
      { label: 'a', steps: [{ frame: Number.NaN, durationMs: 100 }] },
    ]
    const durationCases: SpriteActionDef[] = [
      { label: 'a', steps: [{ frame: 0, durationMs: 12.5 }] },
      { label: 'a', steps: [{ frame: 0, durationMs: -40 }] },
      { label: 'a', steps: [{ frame: 0, durationMs: Number.NaN }] },
    ]
    for (const bad of [...frameCases, ...durationCases])
      expect(thrown(() => patchPoses(open, { bad }).apply(state)).message).toBe(
        illegalAction('bad'),
      )
    expect(hero(state).poses).toBeUndefined()
  })

  test('C05-G02-06 非法序/循环点/音效：order 负数与小数、loopFrom 负/等于步数/小数、cue 空 asset 均拒绝', async () => {
    const open = await openC05Core('c05-g02-06')
    const state = open.session.getState()
    const steps = [
      { frame: 0, durationMs: 100 },
      { frame: 1, durationMs: 100 },
    ]
    const cases: SpriteActionDef[] = [
      { label: 'a', order: -1, steps },
      { label: 'a', order: 0.5, steps },
      { label: 'a', loopFrom: -1, steps },
      { label: 'a', loopFrom: 2, steps },
      { label: 'a', loopFrom: 0.5, steps },
      { label: 'a', steps: [{ frame: 0, durationMs: 100, cues: [{ kind: 'sound', asset: '' }] }] },
    ]
    for (const bad of cases)
      expect(thrown(() => patchPoses(open, { shape: bad }).apply(state)).message).toBe(
        illegalAction('shape'),
      )
    // 边界值本身合法：order=0、loopFrom=最后一步。
    const legal = patchPoses(open, {
      edge: { label: '边界', order: 0, loopFrom: 1, steps },
    }).apply(state)
    expect(hero(legal).poses?.edge?.loopFrom).toBe(1)
  })

  test('C05-G02-07 新增帧边界：帧号=实际帧数-1 放行，=实际帧数 抛出确切文案', async () => {
    const open = await openC05Core('c05-g02-07', { frameCount: 5 })
    const state = open.session.getState()
    const last = patchPoses(open, { last: actionOf('末帧', [4]) }).apply(state)
    expect(hero(last).poses?.last?.steps[0]?.frame).toBe(4)
    const beyond = patchPoses(open, { beyond: actionOf('越界', [0, 5]) })
    expect(thrown(() => beyond.apply(state)).message).toBe('布局会新增越界帧 5，资源实际只有 5 帧')
  })

  test('C05-G02-08 proof.asset 与精灵资产不一致或 proof 缺省均拒绝；仅 label 补丁不受 proof 约束', async () => {
    const open = await openC05Core('c05-g02-08')
    const state = open.session.getState()
    const message = '精灵布局证明缺失或已过期，请等待帧资源重新载入'
    const wrongAsset = new UpdateSpriteCommand(
      C05_SPRITE,
      { poses: { a: actionOf('甲', [0]) } },
      { ...open.proof, asset: 'sprite.authored.elsewhere' },
      refs,
    )
    expect(thrown(() => wrongAsset.apply(state)).message).toBe(message)
    const missing = new UpdateSpriteCommand(
      C05_SPRITE,
      { layout: { kind: 'static' } },
      undefined,
      refs,
    )
    expect(thrown(() => missing.apply(state)).message).toBe(message)
    const labelOnly = new UpdateSpriteCommand(
      C05_SPRITE,
      { label: '仅改名' },
      { ...open.proof, sha256: '0'.repeat(64) },
    )
    expect(hero(labelOnly.apply(state)).label).toBe('仅改名')
  })

  test('C05-G02-09 删除被实体页引用的动作：SpriteInUseError 携带目标文案与真实引用边；撤销引用后同命令放行', async () => {
    const open = await openC05Core('c05-g02-09', {
      poses: {
        idle: actionOf('待机', [0], { order: 0 }),
        walk: actionOf('走', [1], { order: 1 }),
      },
    })
    expect(
      open.session.dispatch(
        new AddEntityCommand('start', {
          id: 'c05-ref',
          pos: { col: 3, row: 3, height: 0 },
          sprite: C05_SPRITE,
          pages: [{ animation: { sprite: C05_SPRITE, action: 'walk', loop: true } }],
        }),
      ),
    ).toBe(true)
    const state = open.session.getState()
    const remove = patchPoses(open, { idle: actionOf('待机', [0], { order: 0 }) })
    const error = thrown(() => remove.apply(state))
    expect(error).toBeInstanceOf(SpriteInUseError)
    expect(error.name).toBe('SpriteInUseError')
    expect((error as SpriteInUseError).targetLabel).toBe(`精灵 ${C05_SPRITE} 的动作 walk`)
    expect((error as SpriteInUseError).references).toHaveLength(1)
    expect(error.message.startsWith(`精灵 ${C05_SPRITE} 的动作 walk 仍被 1 处引用：\n`)).toBe(true)
    expect(Object.keys(hero(state).poses ?? {})).toEqual(['idle', 'walk'])

    expect(open.session.undo()).toBe(true)
    const released = remove.apply(open.session.getState())
    expect(Object.keys(hero(released).poses ?? {})).toEqual(['idle'])
  })

  test('C05-G02-10 一次删除多个动作时错误文案按 poses 键序列出全部被删 ActionId，仅被引用者计入引用数', async () => {
    const open = await openC05Core('c05-g02-10', {
      poses: {
        a: actionOf('甲', [0], { order: 0 }),
        b: actionOf('乙', [1], { order: 1 }),
        c: actionOf('丙', [2], { order: 2 }),
      },
    })
    expect(
      open.session.dispatch(
        new AddEntityCommand('start', {
          id: 'c05-ref-b',
          pos: { col: 4, row: 4, height: 0 },
          sprite: C05_SPRITE,
          pages: [{ animation: { sprite: C05_SPRITE, action: 'b', loop: false } }],
        }),
      ),
    ).toBe(true)
    const state = open.session.getState()
    const error = thrown(() =>
      patchPoses(open, { c: actionOf('丙', [2], { order: 0 }) }).apply(state),
    )
    expect(error).toBeInstanceOf(SpriteInUseError)
    expect((error as SpriteInUseError).targetLabel).toBe(`精灵 ${C05_SPRITE} 的动作 a、b`)
    expect((error as SpriteInUseError).references).toHaveLength(1)
  })

  test('C05-G02-11 引用 provider 只在“删除动作”时被咨询；仅新增或改写既有动作不咨询', async () => {
    const open = await openC05Core('c05-g02-11', {
      poses: { idle: actionOf('待机', [0], { order: 0 }) },
    })
    const state = open.session.getState()
    const provider = vi.fn(refs)
    new UpdateSpriteCommand(
      C05_SPRITE,
      {
        poses: {
          idle: actionOf('待机改', [0], { order: 0 }),
          extra: actionOf('新增', [1], { order: 1 }),
        },
      },
      open.proof,
      provider,
    ).apply(state)
    expect(provider).toHaveBeenCalledTimes(0)
    new UpdateSpriteCommand(C05_SPRITE, { poses: {} }, open.proof, provider).apply(state)
    expect(provider).toHaveBeenCalledTimes(1)
    expect(provider.mock.calls[0]?.[0]).toBe(state)
  })

  test('C05-G02-12 首次 apply 捕获的旧值不被后续 apply 覆盖：对另一状态再 apply 后 invert 仍还原首次旧值', async () => {
    const open = await openC05Core('c05-g02-12')
    const stateA = open.session.getState()
    const renamed = new UpdateSpriteCommand(C05_SPRITE, { label: '甲' })
    const afterA = renamed.apply(stateA)
    expect(hero(afterA).label).toBe('甲')
    const stateB: EditorState = {
      ...stateA,
      sprites: stateA.sprites.map((sprite) =>
        sprite.id === C05_SPRITE ? { ...sprite, label: '乙态' } : sprite,
      ),
    }
    const afterB = renamed.apply(stateB)
    expect(hero(afterB).label).toBe('甲')
    expect(hero(renamed.invert(afterB)).label).toBe('C05 英雄')
  })
})
