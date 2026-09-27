// @vitest-environment jsdom
import type { AuthorCommand } from '@type-pal/content'
import { afterEach, describe, expect, test } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { sceneWithCommands } from './__tests__/runtime-shell/project.js'
import {
  advance,
  bootScenario,
  installShellHost,
  medicine,
  state,
} from './__tests__/runtime-shell/scenarios.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

const target = { scene: 'a', entity: 'npc' }
const initialPos = { col: 4, row: 4, height: 0 }

function story(commands: AuthorCommand[]) {
  const scene = sceneWithCommands('a', [
    { kind: 'wait', ms: 200 },
    ...commands,
    { kind: 'giveMoney', delta: 9 },
  ])
  scene.entities = [
    { id: 'npc', sprite: 'walker', pos: { ...initialPos }, facing: 'down', collide: false },
  ]
  return scene
}

describe('当前 Reforge 主壳的作者脚本效果链', () => {
  test('实体状态、朝向、图层和屏幕波纹从正式 onEnter 走到持久世界与活场景', async () => {
    host = await installShellHost()
    const fixture = await bootScenario(host, {
      first: story([
        { kind: 'setEntityState', target, state: 2 },
        { kind: 'setEntityFacing', target, facing: 'left' },
        { kind: 'setEntityLayer', target, layer: 3 },
        { kind: 'setScreenWave', level: 8, progression: 1 },
      ]),
    })
    expect(state().entities[0]).toMatchObject({ id: 'npc', facing: 'down', pos: initialPos })
    await advance(host, () => !state().script.running && state().world.money === 59)
    expect(state().world.script?.entityState).toEqual({ a: { npc: 2 } })
    expect(state().world.script?.entityLayer).toEqual({ a: { npc: 3 } })
    expect(state().world.script?.vars).toMatchObject({
      'sys:screenWave': 8,
      'sys:waveProgression': 1,
    })
    expect(state().entities[0]).toMatchObject({
      id: 'npc',
      facing: 'left',
      hidden: false,
      pos: initialPos,
    })
    fixture.assertInputUnchanged()
  })

  test('全队资源同加按上限钳制，半钱只取当前钱数，不改变原入口 seed', async () => {
    host = await installShellHost()
    const fixture = await bootScenario(host, {
      party: ['hero', 'friend'],
      first: story([{ kind: 'increaseHpMp', delta: 25, pools: 'both' }, { kind: 'halveMoney' }]),
    })
    const before = structuredClone(state().world.party)
    expect(before.map((member) => [member.hp, member.mp])).toEqual([
      [80, 30],
      [80, 30],
    ])
    await advance(host, () => !state().script.running && state().world.money === 34)
    expect(state().world.party.map((member) => [member.hp, member.mp])).toEqual([
      [100, 40],
      [100, 40],
    ])
    expect(state().world.party.map((member) => member.equipment)).toEqual(
      before.map((member) => member.equipment),
    )
    fixture.assertInputUnchanged()
  })

  test('编外跟随精灵经真实资源准备后提交一次世界态；当前已有队员仍保持身份', async () => {
    host = await installShellHost()
    const fixture = await bootScenario(host, {
      party: ['hero', 'friend'],
      first: story([{ kind: 'setFollowers', sprites: ['walker'] }]),
    })
    const before = structuredClone(state().world.party)
    await advance(host, () => !state().script.running && state().world.money === 59)
    expect(state().world.script?.followers).toEqual(['walker'])
    expect(state().world.party).toEqual(before)
    expect(fixture.fixture.delivered.map(({ path }) => path)).toContain('content/scenes/a.json')
    fixture.assertInputUnchanged()
  })

  test('实体隐藏与恢复经同一脚本状态表实时投影，下一条命令仍能继续', async () => {
    host = await installShellHost()
    const fixture = await bootScenario(host, {
      first: story([
        { kind: 'setEntityState', target, state: 0 },
        { kind: 'wait', ms: 300 },
        { kind: 'setEntityState', target, state: 1 },
      ]),
    })
    await advance(host, () => state().entities[0]?.hidden === true)
    expect(state().world.script?.entityState).toEqual({ a: { npc: 0 } })
    expect(state().world.money).toBe(50)
    await advance(host, () => !state().script.running && state().world.money === 59)
    expect(state().world.script?.entityState).toEqual({ a: { npc: 1 } })
    expect(state().entities[0]?.hidden).toBe(false)
    expect(state().entities[0]?.id).toBe('npc')
    fixture.assertInputUnchanged()
  })

  test('只扣 MP 到零而 HP 不变；正式换队保留成员实例与顺序', async () => {
    host = await installShellHost()
    const fixture = await bootScenario(host, {
      party: ['hero', 'friend'],
      first: story([
        { kind: 'increaseHpMp', delta: -35, pools: 'mp' },
        { kind: 'setParty', members: ['friend', 'hero'] },
      ]),
    })
    const before = structuredClone(state().world.party)
    await advance(host, () => !state().script.running && state().world.money === 59)
    expect(state().world.party.map((member) => [member.template, member.hp, member.mp])).toEqual([
      ['friend', 80, 0],
      ['hero', 80, 0],
    ])
    expect(state().world.party.map((member) => member.id)).toEqual([before[1]?.id, before[0]?.id])
    fixture.assertInputUnchanged()
  })

  test('编外跟随从非空清空后不保留旧资源引用，也不改变队员本体', async () => {
    host = await installShellHost()
    const fixture = await bootScenario(host, {
      first: story([
        { kind: 'setFollowers', sprites: ['walker'] },
        { kind: 'wait', ms: 300 },
        { kind: 'setFollowers', sprites: [] },
      ]),
    })
    const before = structuredClone(state().world.party)
    await advance(host, () => state().world.script?.followers?.[0] === 'walker')
    expect(state().world.money).toBe(50)
    await advance(host, () => !state().script.running && state().world.money === 59)
    expect(state().world.script?.followers).toBeUndefined()
    expect(state().world.party).toEqual(before)
    fixture.assertInputUnchanged()
  })

  test('当前角色形象在合法精灵/战斗资源准备后写入持久实例，定义和素材输入不变', async () => {
    host = await installShellHost()
    const fixture = await bootScenario(host, {
      first: story([
        { kind: 'setActorAppearance', actor: 'hero', spriteId: 'walker', battleSprite: 'fighter' },
      ]),
    })
    await advance(host, () => !state().script.running && state().world.money === 59)
    expect(state().world.party.find((member) => member.template === 'hero')?.appearance).toEqual({
      spriteId: 'walker',
      battleSprite: 'fighter',
    })
    expect(
      state().world.party.find((member) => member.template === 'friend')?.appearance,
    ).toBeUndefined()
    fixture.assertInputUnchanged()
  })

  test('全队恢复跳过阵亡者，复活仅作用阵亡者且按最大体力十分比结算', async () => {
    host = await installShellHost()
    const fixture = await bootScenario(host, {
      party: ['hero', 'friend'],
      seedStats: { hero: { hp: 0, mp: 15 }, friend: { hp: 25, mp: 30 } },
      first: story([
        { kind: 'increaseHpMp', delta: 10, pools: 'both' },
        { kind: 'revivePartyAll', tenths: 3 },
      ]),
    })
    expect(state().world.party.map((member) => [member.hp, member.mp])).toEqual([
      [0, 15],
      [25, 30],
    ])
    await advance(host, () => !state().script.running && state().world.money === 59)
    expect(state().world.party.map((member) => [member.hp, member.mp])).toEqual([
      [30, 15],
      [35, 40],
    ])
    fixture.assertInputUnchanged()
  })

  test('批量实体显隐先持久写两个场景，切场后第二个实体才由当前场景投影隐藏', async () => {
    host = await installShellHost()
    const second = sceneWithCommands('b', [])
    second.entities = [
      { id: 'npc-b', sprite: 'walker', pos: { col: 3, row: 3, height: 0 }, facing: 'up' },
    ]
    const fixture = await bootScenario(host, {
      first: story([
        {
          kind: 'setMultiEntityState',
          targets: [target, { scene: 'b', entity: 'npc-b' }],
          state: 0,
        },
        { kind: 'loadScene', scene: 'b' },
      ]),
      second,
    })
    await advance(host, () => state().sceneId === 'b' && state().world.money === 59)
    expect(state().world.script?.entityState).toEqual({ a: { npc: 0 }, b: { 'npc-b': 0 } })
    expect(state().entities.find((entity) => entity.id === 'npc-b')).toMatchObject({
      hidden: true,
      pos: { col: 3, row: 3, height: 0 },
    })
    fixture.assertInputUnchanged()
  })

  test('显式场景与落点只覆盖启动位置，不偷换所选入口世界或重放 onEnter 奖励', async () => {
    host = await installShellHost('?entry=second&scene=a&pos=6,5&facing=up')
    const fixture = await bootScenario(host, { first: story([]) })
    expect(state().sceneId).toBe('a')
    expect(state().player.pos).toEqual({ col: 6, row: 5, height: 0 })
    expect(state().world.money).toBe(90)
    expect(state().script.running).toBe(false)
    fixture.assertInputUnchanged()
  })

  test('开发期 give 参数只给已登记物品五件，保持正常入口脚本和独立素材闭包', async () => {
    host = await installShellHost('?give=tonic')
    const fixture = await bootScenario(host, {
      first: story([]),
      items: [medicine('tonic')],
    })
    await advance(host, () => !state().script.running && state().world.money === 59)
    expect(state().world.inventory).toEqual([{ itemId: 'tonic', count: 5 }])
    expect(state().world.party.map((member) => member.template)).toEqual(['hero'])
    fixture.assertInputUnchanged()
  })
})
