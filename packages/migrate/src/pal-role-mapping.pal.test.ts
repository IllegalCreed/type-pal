import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { ActorDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { mapActor, mapRoleSpritesByNumber, mapSprites } from './pal-role-mapping.js'
import type { SourceRole } from './pal-source-types.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const readJson = <T>(rel: string): T => JSON.parse(readFileSync(root + rel, 'utf8')) as T
const src = {
  roles: readJson<{ roles: SourceRole[] }>('data/extracted/data/player-roles.json').roles,
  levelUpExp: readJson<number[]>('data/extracted/data/level-up-exp.json'),
}
const out = {
  actors: src.roles.map((role) => mapActor(role, src.levelUpExp)),
  sprites: mapSprites(src.roles),
}
const demoLi = readJson<ActorDef[]>('projects/demo/content/actors.json').find(
  (a) => a.id === 'li-xiaoyao',
)!
describe('PAL 原始角色到作者战斗定义', () => {
  test('李逍遥的装备槽顺序与属性符合独立对照，初始不带演示仙术', () => {
    const li = out.actors.find((a) => a.id === 'li-xiaoyao')!
    expect(li.spriteId).toBe(demoLi.spriteId)
    expect(li.name).toBe(demoLi.name)
    expect(li.battler!.baseStats).toEqual(demoLi.battler!.baseStats)
    expect(li.battler!.initialEquipment).toEqual(demoLi.battler!.initialEquipment) // ⚠ 槽序雷的自动哨兵
    // 原版真值:role0 初始只会气疗术(296)。demo 手作的 ['296','298','299'] 是菜单演示播种
    // 此处直接以原版角色表为 ActorDef.initialMagic 唯一种子源。
    expect(li.battler!.initialMagic).toEqual(['296'])
    // 原始角色表提供默认立绘号。
    expect(li.portraits).toEqual({ default: 'portrait.pal.001' })
    expect(li.face).toBe('face.pal.li-xiaoyao')

    const gai = out.actors.find((actor) => actor.id === 'gai-luojiao')!
    expect(gai.portraits).toEqual({ default: 'portrait.pal.044' })
    expect(gai).not.toHaveProperty('face')
    expect(out.actors.filter((actor) => actor.face).map(({ id, face }) => [id, face])).toEqual([
      ['li-xiaoyao', 'face.pal.li-xiaoyao'],
      ['zhao-linger', 'face.pal.zhao-linger'],
      ['lin-yueru', 'face.pal.lin-yueru'],
      ['wu-hou', 'face.pal.wu-hou'],
      ['anu', 'face.pal.anu'],
    ])
  })
  test('6 角色齐 + expTable 100 级 + 战斗精灵定义引用', () => {
    expect(out.actors.map((a) => a.id)).toEqual([
      'li-xiaoyao',
      'zhao-linger',
      'lin-yueru',
      'wu-hou',
      'anu',
      'gai-luojiao',
    ])
    for (const actor of out.actors) expect(actor.battler?.leveling?.expTable).toHaveLength(100)
    expect(out.actors.map(({ battler }) => battler?.battleSprite)).toEqual([
      'player-fighter-0',
      'player-fighter-1',
      'player-fighter-2',
      'player-fighter-3',
      'player-fighter-4',
      'player-fighter-8',
    ])
    expect(src.roles[0]!._name).toBe('李逍遥')
    expect(src.roles[4]!._name).toBe('阿奴') // roleId 4 = 阿奴(3/4 对调 parser 已修的确认)
    expect(src.roles[3]!._name).toBe('巫后')
  })
})

describe('PAL 原始角色的大世界精灵定义', () => {
  test('6 张,asset=player-roles.spriteNum 对应 AssetId,布局 directional×(walkFrames||3)', () => {
    expect(out.sprites.map((s) => s.asset)).toEqual([
      'sprite.pal.002',
      'sprite.pal.003',
      'sprite.pal.007',
      'sprite.pal.525',
      'sprite.pal.005',
      'sprite.pal.026',
    ])
    for (const s of out.sprites) expect(s.layout).toEqual({ kind: 'directional', framesPerDir: 3 })
  })

  test('六个来源精灵编号绑定实际角色身份', () => {
    expect(
      [...mapRoleSpritesByNumber(src.roles, out.sprites)].map(([spriteNum, sprite]) => [
        spriteNum,
        sprite.id,
      ]),
    ).toEqual([
      [2, 'li-xiaoyao'],
      [3, 'zhao-linger'],
      [7, 'lin-yueru'],
      [525, 'wu-hou'],
      [5, 'anu'],
      [26, 'gai-luojiao'],
    ])
  })
})
