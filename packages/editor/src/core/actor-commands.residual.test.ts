/**
 * TEST-CURSOR-COMMAND-BOUNDARIES-3：人物命令残项。
 */
import type { EntityDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { loadBoundaryProject } from './__tests__/cursor-command-boundary-fixtures.js'
import { AddActorCommand, DetachActorEntityCommand, UpdateActorCommand } from './actor-commands.js'
import type { EditorState } from './edit-session.js'
import { AddEntityCommand } from './entity-commands.js'

function expectRejected(
  command: { apply(state: EditorState): EditorState },
  input: EditorState,
  pattern: RegExp,
): void {
  const snapshot = structuredClone(input)
  expect(() => command.apply(input)).toThrow(pattern)
  expect(input).toEqual(snapshot)
}

describe('人物命令残项', () => {
  test('AddActor 拒绝首尾空格 name，输入态不变', async () => {
    const { state } = await loadBoundaryProject('actor-residual-ws')
    expectRejected(
      new AddActorCommand({ id: 'npc', name: ' name.npc ', spriteId: 'hero' }),
      state,
      /人物 name 必须是无首尾空格的非空字符串/,
    )
  })

  test('AddActor 新 id 且 locale 缺名称键 → 名称文本不存在或为空', async () => {
    const { state } = await loadBoundaryProject('actor-residual-locale')
    expectRejected(
      new AddActorCommand({ id: 'npc', name: 'name.npc', spriteId: 'hero' }),
      state,
      /名称文本不存在或为空/,
    )
  })

  test('AddActor 只坏 face 一轴 → 小头像资源不存在或类型错误', async () => {
    const { state } = await loadBoundaryProject('actor-residual-face')
    expectRejected(
      new AddActorCommand({
        id: 'npc',
        name: 'name.hero',
        spriteId: 'hero',
        face: 'missing.face',
      }),
      state,
      /小头像资源不存在或类型错误/,
    )
  })

  test('UpdateActor 只改 coveredBy 为不存在人物 → 援护者不存在', async () => {
    const { state } = await loadBoundaryProject('actor-residual-cover')
    const hero = state.actors.find((actor) => actor.id === 'hero')!
    const battler = structuredClone(hero.battler!)
    battler.coveredBy = 'ghost'
    expectRejected(new UpdateActorCommand('hero', { battler }), state, /援护者不存在/)
  })

  test('AddEntity actor:ghost 后 DetachActorEntity → 人物不存在', async () => {
    const { state } = await loadBoundaryProject('actor-residual-detach')
    const entity: EntityDef = {
      id: 'ghost-npc',
      pos: { col: 2, row: 2, height: 0 },
      actor: 'ghost',
    }
    const withGhost = new AddEntityCommand('start', entity).apply(state)
    expectRejected(new DetachActorEntityCommand('start', 'ghost-npc'), withGhost, /人物不存在/)
  })
})
