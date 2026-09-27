/**
 * TEST-GLM-STATE-COMMANDS-1 C01：actor-commands 残差。
 * 去重：actor-commands.test.ts 13 例、actor-commands.residual.test.ts 五例（name 空白轴/
 * locale 缺键/face 资源坏/UpdateActor coveredBy 缺席/实体人物不存在）、commands.test.ts
 * 「UpdateActor name/portraits」「SetEnemyBattleSprite」、author-save-conflict/commands.test.ts
 * 114 例——本文件只补冻结池内：空串字段左操作数臂、AddActor battler 战斗精灵/援护者缺席、
 * CopyActor 无 levelUp 同引用与未 apply invert、Delete/Update/SetActor 未 apply invert、
 * UpdateActor portraits previous-集合豁免/拒绝与 face 同值豁免、DetachActor 缺场景/普通实体
 * no-op 与二次 apply 首轮快照。
 */
import { describe, expect, test } from 'vitest'
import {
  loadBoundaryProject,
  withSharedEnemyBattleSprite,
} from './__tests__/cursor-command-boundary-fixtures.js'
import {
  deepSnapshot,
  expectExactError,
  expectInputsUnchanged,
} from './__tests__/glm-state-commands-c.js'
import {
  AddActorCommand,
  CopyActorCommand,
  DeleteActorCommand,
  DetachActorEntityCommand,
  SetActorBattleSpriteCommand,
  UpdateActorCommand,
} from './actor-commands.js'
import type { EditorState } from './edit-session.js'
import { AddEntityCommand } from './entity-commands.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'

const realRefs = (state: EditorState) => collectCurrentProjectReferenceIndex(state)

describe('C01 actor-commands 残差', () => {
  test('AddActor：空字符串 id → 字段必须是非空字符串（整串 message）；构造期深拷贝', async () => {
    const { state } = await loadBoundaryProject('actor-glm-empty-id')
    const actor = {
      id: 'npc',
      name: 'name.hero',
      spriteId: 'hero',
    }
    const cmd = new AddActorCommand({ ...actor, id: '' })
    expectExactError(() => cmd.apply(state), '人物 id 必须是无首尾空格的非空字符串')
    const happy = new AddActorCommand(actor)
    actor.name = 'name.mutated-after-construct'
    const next = happy.apply(state)
    expect(next.actors.at(-1)).toMatchObject({ id: 'npc', name: 'name.hero' })
    expectInputsUnchanged(() => happy.apply(state), [state])
  })

  test('AddActor：battler 战斗精灵缺席与援护者缺席各自整串恰抛', async () => {
    const { state } = await loadBoundaryProject('actor-glm-battler-guards')
    const hero = state.actors.find((entry) => entry.id === 'hero')!
    expectExactError(
      () =>
        new AddActorCommand({
          id: 'npc',
          name: 'name.hero',
          spriteId: 'hero',
          battler: { ...structuredClone(hero.battler!), battleSprite: 'missing-fighter' },
        }).apply(state),
      '人物 npc 的战斗精灵不存在：missing-fighter',
    )
    expectExactError(
      () =>
        new AddActorCommand({
          id: 'npc',
          name: 'name.hero',
          spriteId: 'hero',
          battler: { ...structuredClone(hero.battler!), coveredBy: 'ghost' },
        }).apply(state),
      '人物 npc 的援护者不存在：ghost',
    )
    const snap = deepSnapshot(state)
    expect(state).toEqual(snap)
  })

  test('CopyActor：来源无 levelUp → levelUp 同引用；未 apply invert 原引用；来源缺席恰抛', async () => {
    const { state } = await loadBoundaryProject('actor-glm-copy')
    const cmd = new CopyActorCommand('hero', 'hero-two', 'name.hero')
    const next = cmd.apply(state)
    expect(next.actors.at(-1)).toMatchObject({ id: 'hero-two', name: 'name.hero' })
    expect(next.levelUp).toBe(state.levelUp)
    expect(new CopyActorCommand('hero', 'x', 'name.hero').invert(state)).toBe(state)
    expectExactError(
      () => new CopyActorCommand('ghost', 'y', 'name.hero').apply(state),
      '复制来源人物不存在：ghost',
    )
  })

  test('DeleteActor：未 apply invert 原引用；undo 时 id 已被占用恰抛（真实引用索引）', async () => {
    const { state } = await loadBoundaryProject('actor-glm-delete')
    const added = new AddActorCommand({ id: 'npc', name: 'name.hero', spriteId: 'hero' }).apply(
      state,
    )
    const cmd = new DeleteActorCommand('npc', realRefs)
    const removed = cmd.apply(added)
    expect(removed.actors.some((entry) => entry.id === 'npc')).toBe(false)
    const reoccupied = new AddActorCommand({
      id: 'npc',
      name: 'name.hero',
      spriteId: 'hero',
    }).apply(removed)
    expectExactError(() => cmd.invert(reoccupied), '无法撤销删除：人物 id 已被占用 npc')
    expect(new DeleteActorCommand('ghost', realRefs).invert(state)).toBe(state)
  })

  test('UpdateActor：缺席 id/未 apply invert/undo 时缺席 三向原引用', async () => {
    const { state } = await loadBoundaryProject('actor-glm-update-noop')
    const cmd = new UpdateActorCommand('ghost', { name: 'name.hero' })
    expect(cmd.apply(state)).toBe(state)
    expect(cmd.invert(state)).toBe(state)
    const applied = new UpdateActorCommand('hero', { name: 'name.hero' }).apply(state)
    const vanished: typeof state = { ...applied, actors: [] }
    expect(new UpdateActorCommand('hero', { name: 'name.hero' }).invert(vanished)).toBe(vanished)
    expectInputsUnchanged(() => cmd.apply(state), [state])
  })

  test('UpdateActor：portraits 换新值经校验恰抛；合法立绘记录放行后 undo 清回 undefined', async () => {
    const { state } = await loadBoundaryProject('actor-glm-portraits')
    expectExactError(
      () =>
        new UpdateActorCommand('hero', {
          portraits: { default: 'missing.portrait', expressions: {} },
        }).apply(state),
      '人物 hero 的默认立绘资源不存在或类型错误：missing.portrait',
    )
    const withPortrait: typeof state = {
      ...structuredClone(state),
      assetCatalog: {
        version: 1,
        assets: {
          ...state.assetCatalog.assets,
          p1: {
            kind: 'portrait',
            path: 'assets/authored/portraits/p1.png',
            mediaType: 'image/png',
            bytes: 2,
            sha256: 'a'.repeat(64),
            origin: { kind: 'authored' },
          },
        },
      },
    } as typeof state
    const cmd = new UpdateActorCommand('hero', { portraits: { default: 'p1', expressions: {} } })
    const next = cmd.apply(withPortrait)
    expect(next.actors[0]!.portraits!.default).toBe('p1')
    const restored = cmd.invert(next)
    expect(restored.actors[0]!.portraits).toBeUndefined()
  })

  test('UpdateActor：face 同值豁免校验；battler 战斗精灵换缺席值恰抛', async () => {
    const { state } = await loadBoundaryProject('actor-glm-face-battler')
    const unchanged = new UpdateActorCommand('hero', { face: undefined })
    expect(unchanged.apply(state).actors[0]!.face).toBeUndefined()
    const hero = state.actors.find((entry) => entry.id === 'hero')!
    expectExactError(
      () =>
        new UpdateActorCommand('hero', {
          battler: { ...structuredClone(hero.battler!), battleSprite: 'missing-fighter' },
        }).apply(state),
      '人物 hero 的战斗精灵不存在：missing-fighter',
    )
  })

  test('DetachActorEntity：缺席场景/普通实体 no-op；undo 时场景缺席原引用', async () => {
    const { state } = await loadBoundaryProject('actor-glm-detach-noop')
    const cmd = new DetachActorEntityCommand('missing-scene', 'e1')
    expect(cmd.apply(state)).toBe(state)
    expect(cmd.invert(state)).toBe(state)
    const plainEntity = {
      id: 'plain',
      sprite: 'hero',
      pos: { col: 0, row: 0, height: 0 },
    }
    const withPlain = new AddEntityCommand('start', plainEntity).apply(state)
    expect(new DetachActorEntityCommand('start', 'plain').apply(withPlain)).toBe(withPlain)
    const snap = deepSnapshot(state)
    expect(state).toEqual(snap)
  })

  test('DetachActorEntity：二次 apply 保持首轮 original，undo 回首次前实体', async () => {
    const { state } = await loadBoundaryProject('actor-glm-detach-twice')
    const actorEntity = {
      id: 'npc',
      sprite: 'hero',
      pos: { col: 1, row: 1, height: 0 },
      actor: 'hero',
    }
    const withNpc = new AddEntityCommand('start', actorEntity).apply(state)
    const cmd = new DetachActorEntityCommand('start', 'npc')
    const detached = cmd.apply(withNpc)
    const entity = detached.scenes
      .find((scene) => scene.id === 'start')!
      .entities.find((entry) => entry.id === 'npc')!
    expect('actor' in entity).toBe(false)
    if ('sprite' in entity) expect(entity.sprite).toBe('hero')
    const restored = cmd.invert(detached)
    const restoredEntity = restored.scenes
      .find((scene) => scene.id === 'start')!
      .entities.find((entry) => entry.id === 'npc')!
    expect('actor' in restoredEntity && restoredEntity.actor).toBe('hero')
    const modified = structuredClone(restored)
    const modifiedEntity = modified.scenes
      .find((scene) => scene.id === 'start')!
      .entities.find((entry) => entry.id === 'npc')!
    ;(modifiedEntity as { facing?: string }).facing = 'up'
    const detachedAgain = cmd.apply(modified)
    const undone = cmd.invert(detachedAgain)
    const undoneEntity = undone.scenes
      .find((scene) => scene.id === 'start')!
      .entities.find((entry) => entry.id === 'npc')!
    expect('actor' in undoneEntity && undoneEntity.actor).toBe('hero')
    expect('facing' in undoneEntity).toBe(false)
  })

  test('SetActorBattleSprite：无 battler 角色同引用 no-op；未 apply invert 原引用；enemy profile 恰抛', async () => {
    const { source, state } = await loadBoundaryProject('actor-glm-battler-switch')
    const withEnemy = await withSharedEnemyBattleSprite(source, state, 'enemy-shape')
    const battlerLess = new AddActorCommand({ id: 'civilian', name: 'name.hero', spriteId: 'hero' })
    const withCivilian = battlerLess.apply(withEnemy)
    expect(new SetActorBattleSpriteCommand('civilian', 'starter-fighter').apply(withCivilian)).toBe(
      withCivilian,
    )
    expect(new SetActorBattleSpriteCommand('ghost', 'starter-fighter').invert(withCivilian)).toBe(
      withCivilian,
    )
    expectExactError(
      () => new SetActorBattleSpriteCommand('hero', 'enemy-shape').apply(withCivilian),
      '角色只能引用 player-fighter profile：enemy-shape',
    )
    expectInputsUnchanged(() => battlerLess.apply(withEnemy), [withEnemy])
  })
})
