// 常驻回归:demo 工程**真实** JSON(projects/demo/,非 fixture)迁移保真 + buildWorld 端到端。
// 迁移前 initialWorld()/DEMO_* 已删 → 此测接管它们的真值锚,防 JSON 误改 / 数据漂移。
// 放 migrate(数据工具包,有 node fs + content 依赖;不耦合引擎 reforge)。
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type { StartWorld } from '@type-pal/content'
import {
  buildWorld,
  effectiveStat,
  validateActors,
  validateAssetCatalog,
  validateItemsV14,
  validateLocale,
  validateScenesV14,
  validateSkills,
  validateSprites,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'

const root = fileURLToPath(new URL('../../../projects/demo/', import.meta.url))
const read = (rel: string): unknown => JSON.parse(readFileSync(root + rel, 'utf8'))

const manifest = read('manifest.json') as {
  id: string
  contentVersion: number
  minimumSaveVersion: number
  entryScene: string
  startWorld: StartWorld
}
const sceneIds = read('content/scenes/index.json') as string[]
const scenes = validateScenesV14(sceneIds.map((id) => read(`content/scenes/${id}.json`)))
const actors = validateActors(read('content/actors.json'))
const assetCatalog = validateAssetCatalog(read('assets/index.json'))
const sprites = validateSprites(read('content/sprites.json'), assetCatalog)
const { skills } = validateSkills(read('content/skills.json'))
const items = validateItemsV14(read('content/items.json'))
const locale = validateLocale(read('content/locale.json'))

const byId = <T extends { id: string }>(a: T[]): Record<string, T> =>
  Object.fromEntries(a.map((x) => [x.id, x]))
const skillsById = byId(skills)
const itemsById = byId(items)
const actorsById = byId(actors)
const spritesById = byId(sprites)

describe('demo 工程:真实 JSON 迁移保真 + buildWorld 端到端', () => {
  test('数据关键值:入口场景 / 技能 MP / 物品装备槽 / locale', () => {
    expect(manifest.id).toBe('demo')
    expect(manifest.contentVersion).toBe(15)
    expect(manifest.minimumSaveVersion).toBe(8)
    expect(scenes.find((s) => s.id === manifest.entryScene)).toBeDefined() // 入口场景可解析
    expect(skillsById['296']?.name).toBe('气疗术')
    expect(skillsById['296']?.cost.mp).toBe(6)
    expect(skillsById['298']?.cost.mp).toBe(18)
    expect(skillsById['299']?.cost.mp).toBe(40)
    expect(itemsById['208']?.equip?.slot).toBe('body')
    expect(locale['name.li-xiaoyao']).toBe('李逍遥')
    // C0:actor→sprite 链可解析(引擎玩家精灵走此路径,替代写死 2)
    expect(actorsById['li-xiaoyao']?.spriteId).toBe('li-xiaoyao')
    expect(spritesById['li-xiaoyao']?.asset).toBe('sprite.pal.002')
    expect(spritesById.ghost?.layout).toEqual({ kind: 'directional', framesPerDir: 3 })
    expect(actorsById.youhun?.battler).toBeUndefined() // NPC 无 battler
  })

  test('buildWorld:李逍遥实例值 = 迁移前 initialWorld() 真值', () => {
    const w = buildWorld(manifest.startWorld, actorsById)
    const li = w.party[0]
    expect(li?.id).toBe('li-xiaoyao')
    expect(li?.hp).toBe(100) // seedStats 覆盖(< maxHP 150)
    expect(li?.mp).toBe(30) // seedStats 覆盖(< maxMP 100)
    expect(li?.maxHP).toBe(150)
    expect(li?.maxMP).toBe(100)
    expect(li?.attack).toBe(33) // 模板 base(未叠装备)
    expect(li?.exp).toBe(0)
    expect(w.money).toBe(0)
    expect(w.learnedSkills['li-xiaoyao']).toEqual(['296', '298', '299', '345'])
    expect(w.inventory).toEqual([
      { itemId: '267', count: 1 },
      { itemId: '61', count: 2 },
      { itemId: '78', count: 1 },
    ])
  })

  test('effectiveStat:叠装备后 = 迁移前 oracle(防御 32+9=41 / 武术 33+2=35)', () => {
    const li = buildWorld(manifest.startWorld, actorsById).party[0]
    if (!li) throw new Error('no party')
    expect(effectiveStat(li, 'defense', itemsById)).toBe(41)
    expect(effectiveStat(li, 'attack', itemsById)).toBe(35)
  })

  test('buildWorld 返回拷贝(非引用):运行期改动不回写污染 startWorld 源', () => {
    const w = buildWorld(manifest.startWorld, actorsById)
    expect(w.learnedSkills).not.toBe(manifest.startWorld.learnedSkills)
    expect(w.inventory).not.toBe(manifest.startWorld.inventory)
    w.inventory.push({ itemId: 'x', count: 9 })
    w.learnedSkills['li-xiaoyao']?.push('zzz')
    expect(manifest.startWorld.inventory).toHaveLength(3) // 源不受污染
    expect(manifest.startWorld.learnedSkills['li-xiaoyao']).toEqual(['296', '298', '299', '345'])
  })
})
