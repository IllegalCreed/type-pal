import {
  buildEntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  type RuntimeCommand,
  resolveAuthorDialogueTree,
  validateActors,
  validateAuthorScenes,
  validateCurrentManifestStartup,
  validateSkills,
  validateSprites,
  type WorldState,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import actorsJson from '../../../projects/pal/content/actors.json' with { type: 'json' }
import skillsJson from '../../../projects/pal/content/skills.json' with { type: 'json' }
import spritesJson from '../../../projects/pal/content/sprites.json' with { type: 'json' }
import manifestJson from '../../../projects/pal/manifest.json' with { type: 'json' }
import { resolveSpriteActionPosition } from './entity-action-player.js'
import type { RuntimeLeafCommand } from './runtime-script-compiler.js'
import { ScriptProjectRuntime } from './runtime-script-project.js'
import { normalizeCurrentSave, preflightCurrentSave } from './save/current-codec.js'
import { buildCurrentSavePayload, buildMeta } from './save/ops.js'
import { MemorySaveStore } from './save/store.js'
import { makeTestWorld } from './test-fixtures.js'

const sceneModules = import.meta.glob<{ default: unknown }>(
  '../../../projects/pal/content/scenes/s*.json',
  { eager: true },
)
const actors = Object.fromEntries(validateActors(actorsJson).map((actor) => [actor.id, actor]))
const scenes = resolveAuthorDialogueTree(
  validateAuthorScenes(Object.values(sceneModules).map((module) => module.default)),
  actors,
)
const references = buildEntityLifecycleReferenceIndex(scenes)
const manifest = validateCurrentManifestStartup(manifestJson).manifest
const signal = new AbortController().signal

function scene(id: string) {
  const value = scenes.find((candidate) => candidate.id === id)
  if (!value) throw new Error(`missing scene ${id}`)
  return value
}

function leaves(commands: RuntimeLeafCommand[]) {
  return commands.flatMap((command) =>
    command.kind === 'dialog' ? command.cue.rows.map((row) => row.text) : [],
  )
}

function harness(
  sceneId: string,
  world: WorldState = {
    ...makeTestWorld(),
    money: 0,
    inventory: [],
    script: emptyWorldScriptState(),
  },
) {
  let currentSceneId = sceneId
  let time = 0
  const effects: RuntimeLeafCommand[] = []
  const choices: boolean[] = []
  const equipped = new Set<string>()
  const inParty = new Set<string>()
  const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, 'd'.repeat(64), {
    lifecycleReferences: references,
    currentSceneId: () => currentSceneId,
    currentSceneSessionId: () => `gov3-${currentSceneId}`,
    scene,
    gameplayNow: () => time,
    executeEffect(command) {
      effects.push(command)
      if (command.kind === 'giveMoney') world.money = Math.max(0, world.money + command.delta)
      if (command.kind === 'giveItem') {
        const owned = world.inventory.find((item) => item.itemId === command.itemId)
        if (owned) owned.count += command.count ?? 1
        else world.inventory.push({ itemId: command.itemId, count: command.count ?? 1 })
      }
      if (command.kind === 'loseItem') {
        const owned = world.inventory.find((item) => item.itemId === command.itemId)
        if (owned) owned.count = Math.max(0, owned.count - (command.count ?? 1))
      }
      // The world transition itself is a shell effect; this host records its request.
      // Explicit scene entry below isolates each invocation while retaining one real world.
    },
    query: {
      entitiesNear: () => false,
      hasItem: (id, count = 1) =>
        world.inventory.some((item) => item.itemId === id && item.count >= count),
      ownsItem: (id, count = 1) =>
        equipped.has(id) ||
        world.inventory.some((item) => item.itemId === id && item.count >= count),
      itemEquipped: (id) => equipped.has(id),
      money: () => world.money,
      inParty: (id) => inParty.has(id),
      allFullHp: () => true,
      entityInScene: () => true,
      facingEntity: () => true,
    },
    confirm: async () => {
      const value = choices.shift()
      if (value === undefined) throw new Error('unexpected confirmation')
      return value
    },
    wait: async (ms) => {
      time += ms
    },
    waitWorldTick: async () => {
      time += 100
    },
    yieldMacroTask: async () => {},
    startBattle: async () => 'victory',
    teleportOut: async () => false,
  })
  return {
    world,
    runtime,
    effects,
    equipped,
    inParty,
    enter(id: string) {
      currentSceneId = id
    },
    async activate(entity: string, ...answers: boolean[]) {
      effects.length = 0
      choices.push(...answers)
      expect(
        await runtime.runEntityBehavior(scene(currentSceneId), entity, 'trigger', { signal }),
      ).toBe(true)
      expect(choices).toEqual([])
      return [...effects]
    },
    async hook() {
      effects.length = 0
      expect(await runtime.runSceneHook(scene(currentSceneId), 'onEnter', { signal })).toBe(true)
      return [...effects]
    },
    async run(body: RuntimeCommand[]) {
      await runtime.runCommands(body, { signal })
    },
    cursor(entity: string) {
      return world.script?.behaviors.entities?.[currentSceneId]?.[entity]?.trigger?.cursor?.at
    },
  }
}

async function restored(world: WorldState, sceneId: string) {
  const store = new MemorySaveStore({ kind: 'project', projectId: manifest.id })
  const payload = buildCurrentSavePayload(
    world,
    { sceneId, pos: scene(sceneId).entry.pos, facing: 'down' },
    manifest.id,
  )
  await store.putSlot(
    buildMeta('m01', world, sceneId, (member) => member.id, 1),
    payload,
    new Blob(),
  )
  const saved = await store.getPayload('m01')
  if (!saved) throw new Error('missing SAVE11 payload')
  expect(saved.version).toBe(11)
  const resolver = await preflightCurrentSave({ manifest, payload: saved })
  return normalizeCurrentSave(saved, resolver, references).world
}

test('求救区域的真实caller安装月如后继，SAVE11读回只复读无署名哼声', async () => {
  const run = harness('s021')
  await run.activate('e404')
  await run.activate('e403')
  const second = harness('s021', await restored(run.world, 's021'))
  for (let i = 0; i < 3; i++) {
    const effects = await second.activate('e403')
    expect(leaves(effects)).toEqual(['dlg.2074'])
    expect(effects.filter((command) => command.kind === 'selectEntityBehavior')).toEqual([])
    expect(effects.find((command) => command.kind === 'dialog')?.cue.speaker).toBeUndefined()
    expect(effects.find((command) => command.kind === 'dialog')?.cue.portrait).toBeUndefined()
  }
})

test('莺莺支线从施舍否分支到茶水小妹、同房嫖客和乞丐求饶，各真实caller正确推进', async () => {
  const run = harness('s121')
  await run.hook()
  run.enter('s100')
  await run.activate('e1824', false)
  run.enter('s131')
  expect(leaves(await run.activate('e2293'))).toEqual(['dlg.6168', 'dlg.6169'])
  expect(leaves(await run.activate('e2293'))).toEqual(['dlg.6170', 'dlg.6171'])
  expect(leaves(await run.activate('e2293'))).toEqual(['dlg.6168', 'dlg.6169'])
  run.enter('s134')
  await run.activate('e2318')
  expect(leaves(await run.activate('e2319'))).toEqual(['dlg.6182'])
  const saved = harness('s134', await restored(run.world, 's134'))
  expect(leaves(await saved.activate('e2319'))).toEqual(['dlg.6183', 'dlg.6184', 'dlg.6185'])
  expect(leaves(await saved.activate('e2319'))).toEqual(['dlg.6183', 'dlg.6184', 'dlg.6185'])
  run.enter('s131')
  await run.hook()
  run.enter('s100')
  const first = await run.activate('e1824')
  expect(first.filter((command) => command.kind === 'setEntityState')).toHaveLength(5)
  const after = harness('s100', await restored(run.world, 's100'))
  for (let i = 0; i < 3; i++) {
    const effects = await after.activate('e1824')
    expect(leaves(effects)).toEqual(['dlg.6248'])
    expect(effects.filter((command) => command.kind === 'setEntityState')).toEqual([])
  }
})

test('嫖客默认复读仍警告偷看，不会执行邻实体给娘送茶', async () => {
  const run = harness('s134')
  expect(leaves(await run.activate('e2319'))).toEqual(['dlg.5441', 'dlg.5442'])
  for (let i = 0; i < 3; i++) expect(leaves(await run.activate('e2319'))).toEqual(['dlg.5444'])
})

test('秋菊的真实caller安装合八字剧情，后续保留源显式林忠姓名牌', async () => {
  const run = harness('s035')
  await run.activate('e590')
  run.enter('s034')
  await run.activate('e573')
  const next = await run.activate('e573')
  expect(leaves(next)).toEqual(['dlg.3147'])
  expect(next.find((command) => command.kind === 'dialog')?.cue.speaker).toBe('spk.林忠')
})

test('巫后真实caller安装石长老，完整推进婚姻往事再进入催促复读', async () => {
  const run = harness('s247')
  await run.activate('e4367')
  run.enter('s262')
  await run.activate('e4568')
  expect(leaves(await run.activate('e4568'))).toEqual(
    Array.from({ length: 7 }, (_, i) => `dlg.${11792 + i}`),
  )
  const saved = harness('s262', await restored(run.world, 's262'))
  for (let i = 0; i < 3; i++)
    expect(leaves(await saved.activate('e4568'))).toEqual(['dlg.11800', 'dlg.11801'])
})

const moneyFailures = [
  { scene: 's005', entity: 'e128', stage: 'initial', cost: 25, choices: [true] },
  { scene: 's029', entity: 'e536', stage: 'initial', cost: 50, choices: [true] },
  { scene: 's029', entity: 'e536', stage: 'phase-002', cost: 50, choices: [true] },
  { scene: 's100', entity: 'e1824', stage: 'initial', cost: 10, choices: [true] },
  { scene: 's127', entity: 'e2228', stage: 'legacy-002', cost: 500, choices: [] },
  { scene: 's131', entity: 'e2292', stage: 'initial', cost: 2000, choices: [true] },
]

for (const entry of moneyFailures)
  test(`${entry.scene}/${entry.entity}/${entry.stage} 不足余额不会扣部分钱或进入成功尾`, async () => {
    for (const money of [0, entry.cost - 1]) {
      const run = harness(entry.scene)
      run.world.money = money
      if (entry.stage === 'phase-002') await run.activate(entry.entity, false)
      if (entry.stage === 'legacy-002') await run.activate(entry.entity)
      const cursorBefore = run.cursor(entry.entity)
      const effects = await run.activate(entry.entity, ...entry.choices)
      expect(run.world.money).toBe(money)
      expect(
        effects.filter((command) =>
          ['giveMoney', 'giveItem', 'selectEntityBehavior', 'loadScene'].includes(command.kind),
        ),
      ).toEqual([])
      expect(run.cursor(entry.entity)).toEqual(cursorBefore ?? { kind: 'stage', stage: 'initial' })
      const saved = harness(entry.scene, await restored(run.world, entry.scene))
      expect(await saved.activate(entry.entity, ...entry.choices)).toEqual(effects)
      expect(saved.world.money).toBe(money)
    }
  })

const itemFailures = [
  { scene: 's023', entity: 'e427', stage: 0, item: '76', count: 1, required: ['76', '80', '78'] },
  { scene: 's023', entity: 'e427', stage: 1, item: '80', count: 1, required: ['76', '80', '78'] },
  { scene: 's023', entity: 'e427', stage: 2, item: '78', count: 1, required: ['76', '80', '78'] },
  ...['81', '83', '82', '86'].map((item) => ({
    scene: 's100',
    entity: 'e1838',
    stage: 0,
    item,
    count: 1,
    required: ['81', '83', '82', '86'],
  })),
  { scene: 's172', entity: 'e2862', stage: 0, item: '152', count: 36, required: ['152'] },
  { scene: 's247', entity: 'e4367', stage: 1, item: '195', count: 1, required: ['195'] },
  { scene: 's266', entity: 'e4662', stage: 0, item: '166', count: 1, required: ['166'] },
]

for (const entry of itemFailures)
  test(`${entry.scene}/${entry.entity} 缺 ${entry.item} 保持步骤且不执行成功副作用`, async () => {
    const run = harness(entry.scene)
    run.world.inventory = entry.required.map((itemId) => ({
      itemId,
      count: itemId === entry.item ? entry.count - 1 : 1,
    }))
    for (let i = 0; i < entry.stage; i++) await run.activate(entry.entity)
    const before = structuredClone(run.world.inventory)
    const cursorBefore = run.cursor(entry.entity)
    const effects = await run.activate(entry.entity)
    expect(run.world.inventory).toEqual(before)
    expect(
      effects.filter((command) =>
        ['giveItem', 'loseItem', 'loadScene', 'setEntityState'].includes(command.kind),
      ),
    ).toEqual([])
    expect(run.cursor(entry.entity)).toEqual(cursorBefore ?? { kind: 'stage', stage: 'initial' })
    const saved = harness(entry.scene, await restored(run.world, entry.scene))
    expect(await saved.activate(entry.entity)).toEqual(effects)
    expect(saved.world.inventory).toEqual(before)
  })

test('玉佛珠未装备只推退，不隐藏门障或推进成功步骤', async () => {
  const run = harness('s064')
  const effects = await run.activate('e1219')
  expect(leaves(effects)).toEqual(['dlg.4345', 'dlg.4346'])
  expect(
    effects.filter(
      (command) => command.kind === 'setEntityState' || command.kind === 'ditherScreen',
    ),
  ).toEqual([])
})

for (const entry of moneyFailures)
  test(`${entry.scene}/${entry.entity}/${entry.stage} 恰好足额才执行一次付款`, async () => {
    const run = harness(entry.scene)
    run.world.money = entry.cost
    if (entry.stage === 'phase-002') await run.activate(entry.entity, false)
    if (entry.stage === 'legacy-002') await run.activate(entry.entity)
    const effects = await run.activate(entry.entity, ...entry.choices)
    expect(run.world.money).toBe(0)
    expect(effects.filter((command) => command.kind === 'giveMoney')).toEqual([
      { kind: 'giveMoney', delta: -entry.cost },
    ])
    if (entry.scene === 's005') expect(run.world.inventory).toEqual([{ itemId: '92', count: 1 }])
    if (entry.scene === 's029')
      expect(effects.filter((command) => command.kind === 'selectEntityBehavior')).toHaveLength(2)
    if (entry.scene === 's131')
      expect(
        effects.some((command) => command.kind === 'loadScene' && command.scene === 's133'),
      ).toBe(true)
  })

for (const entry of moneyFailures.filter((value) => value.choices.length))
  test(`${entry.scene}/${entry.entity}/${entry.stage} 取消确认不付款`, async () => {
    const run = harness(entry.scene)
    run.world.money = entry.cost
    if (entry.stage === 'phase-002') await run.activate(entry.entity, false)
    const effects = await run.activate(entry.entity, false)
    expect(run.world.money).toBe(entry.cost)
    expect(
      effects.filter((command) => ['giveMoney', 'giveItem', 'loadScene'].includes(command.kind)),
    ).toEqual([])
  })

for (const entry of itemFailures)
  test(`${entry.scene}/${entry.entity} ${entry.item} 达到数量后才交付并推进`, async () => {
    const run = harness(entry.scene)
    run.world.inventory = entry.required.map((itemId) => ({
      itemId,
      count: itemId === entry.item ? entry.count : 1,
    }))
    for (let i = 0; i < entry.stage; i++) await run.activate(entry.entity)
    const effects = await run.activate(entry.entity)
    expect(
      effects.some((command) => command.kind === 'loseItem' && command.itemId === entry.item),
    ).toBe(true)
    expect(run.world.inventory.find((item) => item.itemId === entry.item)?.count).toBe(0)
    if (entry.scene === 's266')
      expect(run.world.inventory.find((item) => item.itemId === '265')?.count).toBe(1)
  })

test('装备玉佛珠时才消散障碍，木剑ownsItem资格继续包含装备', async () => {
  const gate = harness('s064')
  gate.equipped.add('274')
  const opened = await gate.activate('e1219')
  expect(opened.filter((command) => command.kind === 'setEntityState')).toEqual([
    { kind: 'setEntityState', state: 0, target: { scene: 's064', entity: 'e1220' } },
  ])
  expect(opened.some((command) => command.kind === 'ditherScreen')).toBe(true)
  const exchange = harness('s266')
  exchange.equipped.add('166')
  await exchange.activate('e4662')
  expect(exchange.world.inventory).toEqual([{ itemId: '265', count: 1 }])
})

test('原6349玉器赠送检查四百文和灵儿在队，不足进入普通商店', async () => {
  for (const money of [0, 399, 400]) {
    const run = harness('s023')
    run.inParty.add('zhao-linger')
    run.world.money = money
    const effects = await run.activate('e433')
    const paid = money >= 400
    expect(run.world.money).toBe(money - (paid ? 400 : 0))
    expect(run.world.inventory).toEqual(paid ? [{ itemId: '199', count: 1 }] : [])
    expect(effects.some((command) => command.kind === 'openShop')).toBe(!paid)
    expect(effects.filter((command) => command.kind === 'giveMoney')).toHaveLength(paid ? 1 : 0)
  }
})

test('原7454少女求助保留确认和一百文门，不足与取消均不付款', async () => {
  for (const money of [0, 99, 100])
    for (const answer of [false, true]) {
      const run = harness('s030')
      run.world.money = money
      await run.activate('e540', answer)
      expect(run.world.money).toBe(money - (answer && money >= 100 ? 100 : 0))
    }
})

test('原19266及19286只测试三万文余额，源扣回加回不增加隐含费用', async () => {
  for (const topUp of [false, true]) {
    const run = harness('s108')
    await run.activate('e2002')
    expect(run.world.money).toBe(30000)
    const full = await run.activate('e2002')
    expect(full.filter((command) => command.kind === 'giveMoney')).toEqual([
      { kind: 'giveMoney', delta: -30000 },
      { kind: 'giveMoney', delta: 30000 },
    ])
    expect(run.world.money).toBe(30000)
    const second = harness('s108')
    await second.activate('e2002')
    second.world.money = 29999
    await second.activate('e2002', topUp)
    expect(second.world.money).toBe(topUp ? 59999 : 29999)
    if (topUp) {
      second.world.money = 29999
      await second.activate('e2002', false)
      expect(second.world.money).toBe(29999)
      const third = harness('s108')
      await third.activate('e2002')
      third.world.money = 0
      await third.activate('e2002', true)
      const exact = await third.activate('e2002')
      expect(exact.filter((command) => command.kind === 'giveMoney')).toEqual([
        { kind: 'giveMoney', delta: -30000 },
        { kind: 'giveMoney', delta: 30000 },
      ])
      expect(third.world.money).toBe(30000)
    }
  }
})

test('原19353由刘府真实caller安装收费道士，两次询价不足或拒绝均不扣钱', async () => {
  for (const money of [0, 14999, 15000])
    for (const answer of [false, true]) {
      const run = harness('s108')
      await run.activate('e2005')
      run.enter('s128')
      run.world.money = money
      const first = await run.activate('e2245', answer)
      const paid = answer && money >= 15000
      expect(run.world.money).toBe(money - (paid ? 15000 : 0))
      expect(first.some((command) => command.kind === 'loadScene')).toBe(paid)
      if (!paid) {
        const saved = harness('s128', await restored(run.world, 's128'))
        const repeat = await saved.activate('e2245', true)
        expect(saved.world.money).toBe(money - (money >= 15000 ? 15000 : 0))
        expect(repeat.some((command) => command.kind === 'loadScene')).toBe(money >= 15000)
      }
    }
})

test('两条法术私有负金额由当前成本模型消费，不恢复场景扣钱脚本', () => {
  const skills = validateSkills(skillsJson).skills
  expect(skills.find((skill) => skill.id === '344')?.cost).toEqual({ mp: 1, money: 500 })
  // Source 43068 subtracts one solely to test nonzero funds, 43069 restores it,
  // then 43070 invokes the capped money-damage effect. It is not an extra one-wen fee.
  expect(skills.find((skill) => skill.id === '394')?.cost).toEqual({ mp: 1 })
  expect(skills.find((skill) => skill.id === '394')?.effects).toEqual([
    { kind: 'moneyDamage', maxSpend: 5000, num: 2, den: 5, elemental: 0 },
  ])
})

test('s005两页保护原初始姿态1，以准确100ms偏移接入新周期而不清除作者相位', () => {
  const definitions = validateSprites(spritesJson)
  for (const row of [
    {
      entity: 'e118',
      sprite: 'sprite-36',
      action: 'pal-auto-v1-3184bfed119790e6',
      oldOffset: 240,
      oldFirst: 240,
    },
    {
      entity: 'e120',
      sprite: 'sprite-37',
      action: 'pal-auto-v1-918a20e9e5ac98b4',
      oldOffset: 660,
      oldFirst: 660,
    },
  ]) {
    const page = scene('s005').entities.find((entity) => entity.id === row.entity)?.pages?.[0]
    expect(page?.animation?.startAtMs).toBe(100)
    const action = definitions.find((sprite) => sprite.id === row.sprite)?.poses?.[row.action]
    if (!action) throw new Error('missing protected page action')
    const original = {
      label: 'PAL 自动循环',
      order: 0,
      steps: [
        { frame: 0, durationMs: row.oldFirst },
        { frame: 1, durationMs: 240 },
        { frame: 2, durationMs: 240 },
        { frame: 3, durationMs: 240 },
      ],
      loopFrom: 0,
    }
    expect(resolveSpriteActionPosition(original, 0, true, row.oldOffset).frame).toBe(1)
    expect(resolveSpriteActionPosition(action, 0, true, 100).frame).toBe(1)
    expect(resolveSpriteActionPosition(original, 239, true, row.oldOffset).frame).toBe(1)
    expect(resolveSpriteActionPosition(original, 240, true, row.oldOffset).frame).toBe(2)
    expect(resolveSpriteActionPosition(action, 199, true, 100).frame).toBe(1)
    expect(resolveSpriteActionPosition(action, 200, true, 100).frame).toBe(2)
    expect(action.steps.every((step) => step.cues === undefined)).toBe(true)
    expect(definitions.find((sprite) => sprite.id === row.sprite)?.layout.kind).toBe('static')
  }
})
