import { expect, test } from 'vitest'
import {
  createEnemyReferenceProject,
  createReferenceProject,
} from './__tests__/reference-project.js'
import type { AuthorSceneDef } from './author-scene.js'
import type { AuthorCommand } from './author-script.js'
import { buildWorld } from './character.js'
import { validateMigrationDiagnostics } from './migration-diagnostic.js'
import { validateStampTemplates } from './stamp.js'
import { validateActors, validatePoisons, validateSkills } from './validate.js'
import {
  validateAuthorItems,
  validateAuthorScenes,
  validateAuthorSharedScripts,
} from './validate-author.js'
import { type ContentBundle, validateReferences } from './validate-refs.js'

test('组合模板 tilesetRefs 悬空 → 报 error', () => {
  const { bundle } = createReferenceProject()
  bundle.tilesets = [{ id: 'known', name: '已知', category: 'test', asset: 'tileset.known' }]
  bundle.stamps = [
    {
      id: 'tree',
      name: '树',
      origin: 'authored',
      width: 1,
      height: 1,
      anchor: { row: 0, col: 0 },
      tilesetRefs: ['missing'],
      layers: [
        {
          id: 'ground',
          name: '地面',
          tiles: [[1], [null]],
          sources: [[0], [null]],
        },
      ],
      collision: [[null], [null]],
    },
  ]
  validateStampTemplates(bundle.stamps)
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'error',
      where: 'stamps[0](tree).tilesetRefs[0]',
      message: '瓦片集 "missing" 不在 tilesets 注册表',
    },
  ])
})
test('actor.battler.initialEquipment 指向不存在物品 → 报 warn', () => {
  const { bundle } = createReferenceProject()
  bundle.actors[0]!.battler!.initialEquipment = { weapon: 'no-item' }
  validateActors(bundle.actors)
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'warn',
      where: 'actors[0](hero).battler.initialEquipment[weapon]',
      message: '初始装备 "no-item" 不在 items',
    },
  ])
})
test('EquipSpec.equipableBy 指向不存在角色 → 报 warn', () => {
  const { bundle } = createReferenceProject()
  bundle.items[0]!.equip = {
    slot: 'weapon',
    equipableBy: ['ghost-man'],
    effects: [],
  }
  validateAuthorItems(bundle.items)
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'warn',
      where: 'items[0](herb).equip.equipableBy[0]',
      message: '可装备角色 "ghost-man" 不在 actors',
    },
  ])
})
test('EquipEffect.grantSkill.skillId 不在 skills → 报 warn', () => {
  const { bundle } = createReferenceProject()
  bundle.items[0]!.equip = {
    slot: 'accessory',
    equipableBy: ['hero'],
    effects: [{ kind: 'grantSkill', skillId: '336' }],
  }
  validateAuthorItems(bundle.items)
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'warn',
      where: 'items[0](herb).equip.effects[0].grantSkill',
      message: '授技 "336" 不在 skills',
    },
  ])
})
test('SkillCost.items[].itemId 不在 items → 报 warn', () => {
  const { bundle } = createReferenceProject()
  bundle.skills = [
    {
      id: 'bolt',
      name: '闪电',
      desc: '',
      cost: { items: [{ itemId: 'no-wine', amount: 1 }] },
      usableOutsideBattle: false,
      target: 'oneEnemy',
      effects: [],
      animation: { effectSprite: 1 },
    },
  ]
  validateSkills({ skills: bundle.skills, levelUp: bundle.levelUp })
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'warn',
      where: 'skills[0](bolt).cost.items[0].itemId',
      message: '消耗物品 "no-wine" 不在 items',
    },
  ])
})

test('reports every dangling item recipe, reward, poison and script reference', () => {
  const { bundle } = createReferenceProject()
  bundle.poisons = [{ id: 551, name: '赤毒', curability: 'common', color: 1 }]
  bundle.items = [
    {
      id: 'tool',
      name: '工具',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'craftRecipe',
            recipes: [
              {
                ingredients: [{ itemId: 'missing-material', count: 1 }],
                products: [{ itemId: 'missing-product', count: 1 }],
              },
            ],
          },
        ],
      },
    },
    {
      id: 'pool',
      name: '资源池',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'scene',
        consuming: false,
        effects: [
          {
            kind: 'drawFromResourcePool',
            resource: 'value',
            maxRoll: 1,
            rewards: [{ itemId: 'missing-reward', count: 1 }],
          },
        ],
      },
    },
    {
      id: 'scripted',
      name: '剧情',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      use: {
        target: 'scene',
        consuming: false,
        effects: [{ kind: 'runScript', script: 'missing-script' }],
      },
    },
    {
      id: 'poison',
      name: '毒物',
      desc: [],
      buyPrice: 0,
      sellPrice: 0,
      sellable: false,
      throw: {
        target: 'oneEnemy',
        effects: [{ kind: 'applyPoison', poisonId: '999' }],
      },
    },
  ]
  validateAuthorItems(bundle.items)
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'error',
      where: 'items[0](tool).use.effects[0].recipes[0].ingredients[0].itemId',
      message: '配方物品 "missing-material" 不在 items',
    },
    {
      severity: 'error',
      where: 'items[0](tool).use.effects[0].recipes[0].products[0].itemId',
      message: '配方物品 "missing-product" 不在 items',
    },
    {
      severity: 'error',
      where: 'items[1](pool).use.effects[0].rewards[0].itemId',
      message: '资源池奖励物品 "missing-reward" 不在 items',
    },
    {
      severity: 'error',
      where: 'items[2](scripted).use.effects[0].script',
      message: '共享脚本 "missing-script" 不在脚本库',
    },
    {
      severity: 'error',
      where: 'items[3](poison).throw.effects[0].poisonId',
      message: '毒 "999" 不在 poisons',
    },
  ])
})

test('迁移诊断 target.item 也必须存在', () => {
  const { bundle } = createReferenceProject()
  bundle.migrationDiagnostics = {
    version: 1,
    diagnostics: [
      {
        id: 'item-use:missing',
        severity: 'warn',
        target: {
          domain: 'item',
          objectId: 'missing',
          capability: 'use',
          label: '失踪物品',
        },
        category: 'manual-review',
        reason: '待处理',
        source: { kind: 'legacy-script', label: 'L_1', address: 1 },
      },
    ],
  }
  validateMigrationDiagnostics(bundle.migrationDiagnostics)
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'error',
      where: 'migrationDiagnostics.diagnostics[0].target.objectId',
      message: '待迁移诊断指向的物品 "missing" 不在 items',
    },
  ])
})

function projectWithActorCommands(body: AuthorCommand[]): ContentBundle {
  const { bundle } = createReferenceProject()
  bundle.sharedScripts = validateAuthorSharedScripts({
    script: { name: '角色命令', self: 'none', body },
  })
  return bundle
}

test('reports each missing actor referenced by an appearance, party or condition command', () => {
  const bundle = projectWithActorCommands([
    { kind: 'setActorSprite', actor: 'missing', sprite: 'sprite.hero' },
    { kind: 'setActorAppearance', actor: 'missing', spriteId: 'sprite.hero' },
    { kind: 'setParty', members: ['hero', 'missing'] },
    {
      kind: 'applyActorCondition',
      actor: 'missing',
      condition: { kind: 'status', status: 'protect', turns: 7 },
    },
  ])
  expect(validateReferences(bundle)).toEqual(
    ['body[0].actor', 'body[1].actor', 'body[2].members[1]', 'body[3].actor'].map((path) => ({
      severity: 'error',
      where: `sharedScripts["script"].${path}`,
      message: '角色 "missing" 不在 actors',
    })),
  )
})

test('rejects a non-battler in both apply and clear condition', () => {
  const bundle = projectWithActorCommands([
    {
      kind: 'applyActorCondition',
      actor: 'villager',
      condition: { kind: 'status', status: 'protect', turns: 7 },
    },
    {
      kind: 'clearActorCondition',
      actor: 'villager',
      condition: { kind: 'status', status: 'protect' },
    },
  ])
  bundle.actors = validateActors([
    ...bundle.actors,
    { id: 'villager', name: 'name.hero', spriteId: 'sprite.hero' },
  ])
  expect(validateReferences(bundle)).toEqual(
    [0, 1].map((index) => ({
      severity: 'error',
      where: `sharedScripts["script"].body[${index}].actor`,
      message: '角色 "villager" 无 battler，不可成为当前队员/后备角色',
    })),
  )
})

test('reports unregistered numeric poison IDs for apply and clear', () => {
  const bundle = projectWithActorCommands([
    { kind: 'applyActorCondition', actor: 'hero', condition: { kind: 'poison', poisonId: 999 } },
    { kind: 'clearActorCondition', actor: 'hero', condition: { kind: 'poison', poisonId: 998 } },
  ])
  bundle.poisons = validatePoisons([{ id: 1, name: '一号毒', curability: 'common', color: 0 }])
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'error',
      where: 'sharedScripts["script"].body[0].condition.poisonId',
      message: '毒 999 不在 poisons',
    },
    {
      severity: 'error',
      where: 'sharedScripts["script"].body[1].condition.poisonId',
      message: '毒 998 不在 poisons',
    },
  ])
})

test('checks default, hostile and scripted battlefield IDs independently', () => {
  const { bundle, enemy, scene, entity } = createEnemyReferenceProject()
  bundle.enemyTeams = [{ id: 'patrol', slots: [enemy.id] }]
  const scenes = [
    {
      ...scene,
      battleFieldId: 24,
      entities: [
        {
          ...entity,
          hostile: {
            enemyTeamId: 'patrol',
            battleFieldId: 25,
            onVictory: { kind: 'remain' },
            onPlayerFlee: { kind: 'remain' },
          },
        },
      ],
    },
  ] satisfies AuthorSceneDef[]
  validateAuthorScenes(scenes)
  bundle.scenes = scenes
  bundle.sharedScripts = validateAuthorSharedScripts({
    start: {
      name: '迎敌',
      self: 'none',
      body: [
        {
          kind: 'branch',
          cond: { kind: 'currentScene', scene: 'hall' },
          then: [{ kind: 'startBattle', enemyTeamId: 'patrol', fieldId: 26 }],
        },
      ],
    },
  })
  expect(validateReferences(bundle)).toEqual([
    { severity: 'error', where: 'scenes[0].battleFieldId', message: '战场 24 不在 battleFields' },
    {
      severity: 'error',
      where: 'scenes[0].entities[0].hostile.battleFieldId',
      message: '战场 25 不在 battleFields',
    },
    {
      severity: 'error',
      where: 'sharedScripts["start"].body[0].then[0].fieldId',
      message: '战场 26 不在 battleFields',
    },
  ])
  bundle.battleFields = [24, 25, 26].map((id) => ({
    id,
    screenWave: 0,
    magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
  }))
  expect(validateReferences(bundle)).toEqual([])
})

test('checks skill layers, poison relations and registered runtime actor instances', () => {
  const { bundle, actor, entry } = createReferenceProject()
  bundle.poisons = validatePoisons([
    { id: 1, name: '一号毒', curability: 'common', color: 0, lethalWith: 999, counters: 2 },
    { id: 2, name: '二号毒', curability: 'common', color: 1 },
  ])
  bundle.skills = [
    {
      id: 'poison',
      name: '毒术',
      desc: '',
      cost: {},
      usableOutsideBattle: false,
      target: 'oneEnemy',
      effects: [{ kind: 'applyPoison', poisonId: '998' }],
      animation: { effectSprite: 1 },
      execution: {
        player: { effects: [{ kind: 'curePoison', poisonId: '997' }, { kind: 'curePoison' }] },
        enemy: {
          effects: [
            { kind: 'damage', power: 1, elemental: 0 },
            { kind: 'applyPoison', poisonId: '995' },
          ],
        },
      },
    },
  ]
  validateSkills({ skills: bundle.skills, levelUp: bundle.levelUp })
  const world = buildWorld(entry.startWorld, { hero: actor })
  bundle.worlds = [
    {
      ...world,
      party: world.party.map((member) => ({
        ...member,
        template: 'unregistered-actor',
        poisons: [{ poisonId: 996, tickIndex: 0 }],
      })),
      reserve: world.party.map((member) => ({
        ...member,
        id: 'known-reserve',
        poisons: [{ poisonId: 1, tickIndex: 0 }],
      })),
      learnedSkills: { hero: ['unregistered-learned-skill'] },
      skillUseCounts: { hero: { 'unregistered-counted-skill': 1, poison: 2 } },
    },
  ]
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'error',
      where: 'skills[0](poison).effects[0].poisonId',
      message: '毒 "998" 不在 poisons',
    },
    {
      severity: 'error',
      where: 'skills[0](poison).execution.player.effects[0].poisonId',
      message: '毒 "997" 不在 poisons',
    },
    {
      severity: 'error',
      where: 'skills[0](poison).execution.enemy.effects[1].poisonId',
      message: '毒 "995" 不在 poisons',
    },
    { severity: 'error', where: 'poisons[0](1).lethalWith', message: '毒 999 不在 poisons' },
    {
      severity: 'error',
      where: 'worlds[0].learnedSkills["hero"][0]',
      message: '技能 "unregistered-learned-skill" 不在 skills',
    },
    {
      severity: 'error',
      where: 'worlds[0].skillUseCounts["hero"]["unregistered-counted-skill"]',
      message: '技能 "unregistered-counted-skill" 不在 skills',
    },
    {
      severity: 'error',
      where: 'worlds[0].party[0].poisons[0].poisonId',
      message: '毒 "996" 不在 poisons',
    },
    {
      severity: 'error',
      where: 'worlds[0].party[0].template',
      message: '角色 "unregistered-actor" 不在 actors',
    },
  ])
})

test('checks authored command targets and leaves the selling menu independent of shop IDs', () => {
  const { bundle, enemy, scene, entity } = createEnemyReferenceProject()
  bundle.sharedScripts = validateAuthorSharedScripts({
    targets: {
      name: '检查目标',
      self: 'none',
      body: [
        { kind: 'loadScene', scene: 'garden' },
        { kind: 'loadScene', scene: 'hall', entryId: 'side-door' },
        { kind: 'setSceneMapOverride', mapId: 'winter-map' },
        { kind: 'openShop', shop: 9, mode: 'buy' },
        { kind: 'openShop', shop: 999, mode: 'sell' },
        { kind: 'startBattle', enemyTeamId: 'patrol' },
        { kind: 'setAmbience', ambience: 'night-rain' },
        { kind: 'learnSkill', role: 0, skill: 'rain' },
        {
          kind: 'branch',
          cond: { kind: 'currentScene', scene: 'garden' },
          then: [
            { kind: 'hideEntity', target: { scene: 'hall', entity: 'guard' }, ticks: 1 },
            {
              kind: 'selectSceneHooks',
              scene: 'hall',
              selection: { onEnter: { kind: 'use', value: 'arrive' } },
            },
          ],
        },
      ],
    },
  })
  expect(validateReferences(bundle)).toEqual([
    {
      severity: 'error',
      where: 'sharedScripts["targets"].body[0].scene',
      message: '场景 "garden" 不在 scenes',
    },
    {
      severity: 'error',
      where: 'sharedScripts["targets"].body[1].entryId',
      message: '命名落点 "hall/side-door" 不在 scenes',
    },
    {
      severity: 'error',
      where: 'sharedScripts["targets"].body[2].mapId',
      message: '地图 "winter-map" 不在 map index',
    },
    {
      severity: 'error',
      where: 'sharedScripts["targets"].body[3].shop',
      message: '商店 9 不在 shops',
    },
    {
      severity: 'error',
      where: 'sharedScripts["targets"].body[5].enemyTeamId',
      message: '敌队 "patrol" 不在 enemyTeams',
    },
    {
      severity: 'warn',
      where: 'sharedScripts["targets"].body[6].ambience',
      message: '氛围 "night-rain" 不在 ambiences',
    },
    {
      severity: 'error',
      where: 'sharedScripts["targets"].body[7].skill',
      message: '技能 "rain" 不在 skills',
    },
    {
      severity: 'error',
      where: 'sharedScripts["targets"].body[8].cond.scene',
      message: '场景 "garden" 不在 scenes',
    },
    {
      severity: 'error',
      where: 'sharedScripts["targets"].body[8].then[0].target.entity',
      message: '实体 "hall/guard" 不在 scenes',
    },
    {
      severity: 'error',
      where: 'sharedScripts["targets"].body[8].then[1].selection.onEnter.value',
      message: '场景脚本方案 "hall/onEnter/arrive" 不存在',
    },
  ])
  const scenes = [
    {
      ...scene,
      entries: { 'side-door': { pos: scene.entry.pos } },
      entities: [entity, { ...entity, id: 'guard' }],
      hooks: {
        onEnter: {
          initial: 'arrive',
          variants: {
            arrive: {
              label: '入场',
              order: 0,
              flow: {
                kind: 'stages',
                initial: 'arrive',
                stages: [{ id: 'arrive', body: [{ kind: 'wait', ms: 1 }] }],
              },
            },
          },
        },
      },
    },
    { ...scene, id: 'garden', entities: [] },
  ] satisfies AuthorSceneDef[]
  validateAuthorScenes(scenes)
  bundle.scenes = scenes
  bundle.mapIndex.maps.push({ id: 'winter-map', name: '冬景', path: 'content/maps/winter.json' })
  bundle.shops = [{ id: 9, items: [] }]
  bundle.enemyTeams = [{ id: 'patrol', slots: [enemy.id] }]
  bundle.ambiences = [{ id: 'night-rain', name: '夜雨', tint: [180, 190, 240] }]
  bundle.skills.push({
    id: 'rain',
    name: '雨',
    desc: '',
    cost: {},
    usableOutsideBattle: false,
    target: 'oneEnemy',
    effects: [],
    animation: { effectSprite: 1 },
  })
  validateSkills({ skills: bundle.skills, levelUp: bundle.levelUp })
  expect(validateReferences(bundle)).toEqual([])
})
