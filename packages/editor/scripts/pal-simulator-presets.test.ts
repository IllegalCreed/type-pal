/** Tracked JSON only: no extracted/raw/binary assets or browser mocks are required. */
import { readFile } from 'node:fs/promises'
import { palMagicEffectSpriteAssetId, validateProjectRelativePath } from '@type-pal/content'
import {
  collectBattleTrialIssues,
  type FileSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  loadStampTemplates,
  prepareBattleTrial,
} from '@type-pal/reforge'
import { beforeAll, expect, test } from 'vitest'
import { collectBattleSkillFireChunks } from '../../reforge/src/battle/battle-sprite-readiness.js'
import { collectReachableEnemySkillIds } from '../../reforge/src/battle/enemy-closure.js'
import {
  BATTLE_SIMULATOR_PATH,
  battleSimulatorRemovalPaths,
  emptyBattleSimulatorLibrary,
  loadBattleSimulatorLibrary,
  parseBattleSimulatorLibrary,
  resolveBattleSimulatorPlan,
} from '../src/core/battle-simulator-library.js'
import { serializeProject, toEditorState } from '../src/core/project-io.js'

const root = new URL('../../../projects/pal/', import.meta.url)
const source: FileSource = {
  async readText(path) {
    validateProjectRelativePath(path, 'preset test source')
    try {
      return await readFile(new URL(path, root), 'utf8')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT')
        throw new DOMException(path, 'NotFoundError')
      throw error
    }
  },
  async readJson<T>(path: string): Promise<T> {
    return JSON.parse(await source.readText(path))
  },
  async readBytes(path) {
    // All consumers in this suite read authored JSON, never untracked binary assets.
    if (!path.endsWith('.json')) throw new Error(`unexpected binary read: ${path}`)
    return new TextEncoder().encode(await source.readText(path)).buffer
  },
  async urlFor(path) {
    throw new Error(`unexpected URL request: ${path}`)
  },
}
let project: Awaited<ReturnType<typeof loadCurrentProjectFrom>>
let library: ReturnType<typeof parseBattleSimulatorLibrary>
beforeAll(async () => {
  project = await loadCurrentProjectFrom(source)
  library = parseBattleSimulatorLibrary(await source.readJson(BATTLE_SIMULATOR_PATH))
})

const expected = [
  ['pal-standard', ['li-xiaoyao', 'zhao-linger', 'lin-yueru'], [15, 15, 15]],
  ['pal-early-solo', ['li-xiaoyao'], [3]],
  ['pal-early-duo', ['li-xiaoyao', 'zhao-linger'], [8, 8]],
  ['pal-middle-duo', ['li-xiaoyao', 'lin-yueru'], [25, 25]],
  ['pal-miao-duo', ['li-xiaoyao', 'anu'], [30, 30]],
  ['pal-final-trio', ['li-xiaoyao', 'zhao-linger', 'anu'], [40, 40, 40]],
  ['pal-dream-duo', ['li-xiaoyao', 'wu-hou'], [30, 48]],
] as const

test('all seven preset FIRE closures resolve real catalog assets without requesting the no-effect marker', () => {
  for (const [id] of expected) {
    const prepared = prepareBattleTrial(resolveBattleSimulatorPlan(library, id), project)
    const chunks = collectBattleSkillFireChunks({
      playerSkillIds: prepared.players.map((player) => player.skills),
      cooperativeSkillIds: prepared.players.flatMap((player) =>
        player.cooperativeMagicSkillId ? [player.cooperativeMagicSkillId] : [],
      ),
      reachableEnemySkillIds: collectReachableEnemySkillIds(
        prepared.enemySlots.filter((enemy) => enemy !== null),
        project.enemiesById,
      ),
      skillsById: project.skills,
    })
    expect(chunks.has(65535), id).toBe(false)
    expect(chunks.size, id).toBeGreaterThan(0)
    for (const chunk of chunks) {
      expect(project.assetCatalog.assets[palMagicEffectSpriteAssetId(chunk)]?.kind, id).toBe(
        'effect-sprite',
      )
    }
  }
})

test.each(expected)('%s resolves and prepares a complete legal battle', (id, actors, levels) => {
  const config = resolveBattleSimulatorPlan(library, id)
  expect(collectBattleTrialIssues(config, project)).toEqual([])
  expect(config.party.members.map((member) => member.actorId)).toEqual(actors)
  expect(config.party.members.map((member) => member.stats.level)).toEqual(levels)
  expect(config).toMatchObject({ auto: false, boss: false, music: { kind: 'default' } })
  expect(config.bag.items.length).toBeGreaterThanOrEqual(6)
  for (const item of config.bag.items) {
    expect(item.quantity).toBeGreaterThan(0)
    expect(item.quantity).toBeLessThanOrEqual(8)
  }
  const prepared = prepareBattleTrial(config, project)
  expect(prepared.world.party.map((member) => member.template)).toEqual(actors)
  expect(prepared.world.party.map((member) => member.level)).toEqual(levels)
  expect(prepared.enemySlots).toHaveLength(5)
  expect(prepared.enemySlots.filter(Boolean).length).toBeGreaterThan(0)
  expect(prepared.world.inventory).toEqual(
    config.bag.items.map(({ itemId, quantity }) => ({ itemId, count: quantity })),
  )
  for (const [index, member] of config.party.members.entries()) {
    expect(Object.keys(member.stats).sort()).toEqual(
      ['level', 'maxHP', 'maxMP', 'attack', 'defense', 'magicAttack', 'speed', 'luck'].sort(),
    )
    expect(Object.keys(member.equipment).sort()).toEqual(
      ['weapon', 'head', 'body', 'cloak', 'feet', 'accessory'].sort(),
    )
    expect(prepared.world.party[index]).toMatchObject(member.stats)
    expect(prepared.players[index]).toMatchObject({
      hp: member.stats.maxHP,
      maxHp: member.stats.maxHP,
      mp: member.stats.maxMP,
      maxMp: member.stats.maxMP,
    })
  }
})

test('all seven plans and reusable directories ship, with the standard trio first', () => {
  expect(library.plans.map((plan) => plan.id)).toEqual(expected.map(([id]) => id))
  expect(library.plans.map((plan) => plan.name)).toEqual([
    '三人成型',
    '初出江湖',
    '逍遥与灵儿',
    '中段双人',
    '苗疆组合',
    '决战准备',
    '回梦往昔',
  ])
  expect(library.allies).toHaveLength(7)
  expect(library.enemies).toHaveLength(7)
  expect(library.bags).toHaveLength(3)
  for (const plan of library.plans) {
    expect(plan.description).toContain('不代表原版剧情固定等级或精确成长')
    expect(plan.config.overrides).toEqual({})
  }
})

test('learned skills follow current initial and level-up tables, not an all-skills grant', () => {
  for (const preset of library.allies) {
    for (const member of preset.config.members) {
      const actor = project.actorsById[member.actorId]!
      const ids = [
        ...new Set([
          ...actor.battler!.initialMagic,
          ...(project.levelUp[member.actorId] ?? [])
            .filter((entry) => entry.level <= member.stats.level!)
            .map((entry) => entry.skillId),
        ]),
      ]
      expect(member.skills).toEqual({ kind: 'replace', ids })
      expect(ids.length).toBeLessThan(Object.keys(project.skills).length)
    }
  }
})

test('gear is applied once and trial changes cannot mutate shipped presets or definitions', () => {
  const config = resolveBattleSimulatorPlan(library, 'pal-standard')
  const actualInputs = {
    config,
    library,
    actors: project.actorsById,
    items: project.items,
    enemies: project.enemiesById,
  }
  const before = structuredClone(actualInputs)
  const trial = prepareBattleTrial(config, project)
  // Fixed authored base 115 plus 戒刀 attack 55; the other five slots do not add attack.
  expect(trial.world.party[0]!.attack).toBe(115)
  expect(trial.players[0]!.attackStrength).toBe(170)
  trial.world.party[0]!.hp = 0
  trial.world.inventory[0]!.count = 0
  trial.world.money = 999999
  trial.enemySlots.find((enemy) => enemy !== null)!.stats.health = 1
  expect(actualInputs).toEqual(before)
  const again = prepareBattleTrial(config, project)
  expect(again.players[0]!.hp).toBe(360)
  expect(again.world.inventory).toEqual(
    config.bag.items.map(({ itemId, quantity }) => ({ itemId, count: quantity })),
  )
  expect(again.world.money).toBe(1000)
})

test('normal editor serialization keeps user changes and missing/deleted libraries are not reinjected', async () => {
  const loaded = await loadBattleSimulatorLibrary(source)
  expect(loaded).toEqual(library)
  const state = toEditorState(
    project,
    await loadAllAuthorScenes(project),
    {},
    {},
    await loadStampTemplates(project),
    loaded,
  )
  state.battleSimulator!.plans[0]!.name = '作者自定方案'
  const files = serializeProject(state)
  const saved = JSON.stringify(files[BATTLE_SIMULATOR_PATH])
  const reopened = await loadBattleSimulatorLibrary({
    ...source,
    readBytes: async (path) =>
      path === BATTLE_SIMULATOR_PATH
        ? new TextEncoder().encode(saved).buffer
        : source.readBytes(path),
  })
  expect(reopened).toEqual(state.battleSimulator)
  expect(library.plans[0]!.name).toBe('三人成型')
  state.battleSimulator = emptyBattleSimulatorLibrary()
  expect(serializeProject(state)).not.toHaveProperty(BATTLE_SIMULATOR_PATH)
  expect(battleSimulatorRemovalPaths(state.battleSimulator)).toEqual([BATTLE_SIMULATOR_PATH])
  expect(
    await loadBattleSimulatorLibrary({
      ...source,
      readBytes: async () => {
        throw new DOMException('deleted by author', 'NotFoundError')
      },
    }),
  ).toBeUndefined()
})
