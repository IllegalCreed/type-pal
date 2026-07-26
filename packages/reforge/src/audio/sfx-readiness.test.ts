import type {
  Command,
  EnemyDef,
  ItemData,
  ScriptRef,
  SkillData,
  SpriteDef,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { BattleAction } from '../battle/battle-core.js'
import type { ResolvedScript, ScriptResolver } from '../script-chunk-store.js'
import {
  collectBattleBaseSounds,
  collectSceneSoundAssets,
  collectScriptSoundAssets,
  collectTurnActionSounds,
} from './sfx-readiness.js'

class Resolver implements ScriptResolver {
  active = 0
  peak = 0

  constructor(private readonly scripts: Record<string, Command[]>) {}

  async resolve(ref: ScriptRef): Promise<ResolvedScript> {
    const body = this.scripts[ref.id]
    if (!body) throw new Error(`missing ${ref.id}`)
    this.active++
    this.peak = Math.max(this.peak, this.active)
    let released = false
    return {
      body,
      ref,
      release: () => {
        if (released) return
        released = true
        this.active--
      },
    }
  }
}

const ref = (id: string): ScriptRef => ({ chunk: 'c', id })
const play = (asset: string): Command => ({ kind: 'playSound', asset })

const enemy = (id: string, rules: EnemyDef['ai']['rules'] = []): EnemyDef => ({
  id,
  name: id,
  battleSprite: `battle-sprite.${id}`,
  yPosOffset: 0,
  stats: {
    health: 10,
    level: 1,
    exp: 0,
    cash: 0,
    attackStrength: 1,
    magicStrength: 1,
    defense: 1,
    dexterity: 1,
    fleeRate: 1,
    physicalResistance: 0,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    dualMove: false,
    collectValue: 0,
  },
  ai: { resistanceToSorcery: 0, rules },
  sounds: { action: `sound.${id}` },
})

const skill = (
  id: string,
  sound: string,
  overrides: Partial<Pick<SkillData, 'target' | 'effects'>> = {},
): SkillData => ({
  id,
  name: id,
  desc: '',
  cost: {},
  usableOutsideBattle: false,
  target: overrides.target ?? 'oneEnemy',
  effects: overrides.effects ?? [
    { kind: 'summon', battleSprite: 'battle-sprite.summon.001', sound: `${sound}.summon` },
  ],
  animation: { effectSprite: 1, sound },
})

const item = (
  id: string,
  sound: string,
  poisons: { use?: string; throw?: string } = {},
  throwPresentationSound?: string,
): ItemData => ({
  id,
  name: id,
  desc: [],
  buyPrice: 0,
  sellPrice: 0,
  sellable: false,
  use: {
    target: 'oneAlly',
    consuming: true,
    effects: poisons.use ? [{ kind: 'applyPoison', poisonId: poisons.use }] : [],
    sound: `${sound}.use`,
  },
  throw: {
    effects: poisons.throw ? [{ kind: 'applyPoison', poisonId: poisons.throw }] : [],
    sound: `${sound}.throw`,
    ...(throwPresentationSound
      ? {
          presentation: {
            kind: 'magic' as const,
            animation: { effectSprite: 24, sound: throwPresentationSound },
          },
        }
      : {}),
  },
})

const emptyBase = (
  overrides: Partial<Parameters<typeof collectBattleBaseSounds>[0]> = {},
): Parameters<typeof collectBattleBaseSounds>[0] => ({
  playerSounds: [],
  enemyDefs: [],
  enemiesById: {},
  skills: {},
  itemsById: {},
  roles: {},
  signal: new AbortController().signal,
  ...overrides,
})

const emptyTurn = (
  overrides: Partial<Parameters<typeof collectTurnActionSounds>[0]> = {},
): Parameters<typeof collectTurnActionSounds>[0] => ({
  pendingActions: [],
  skills: {},
  itemsById: {},
  ...overrides,
})

describe('SFX readiness 收集', () => {
  test('递归 ScriptRef、去环并在成功/失败时释放 lease', async () => {
    const resolver = new Resolver({
      a: [play('sound.a'), { kind: 'callScript', ref: ref('b') }],
      b: [play('sound.b'), { kind: 'jumpScript', ref: ref('a') }],
    })
    const sounds = await collectScriptSoundAssets(
      [[play('sound.root'), { kind: 'callScript', ref: ref('a') }]],
      resolver,
      new AbortController().signal,
    )
    expect([...sounds].sort()).toEqual(['sound.a', 'sound.b', 'sound.root'])
    expect(resolver.active).toBe(0)
    expect(resolver.peak).toBe(2)

    await expect(
      collectScriptSoundAssets(
        [[{ kind: 'callScript', ref: ref('missing') }]],
        resolver,
        new AbortController().signal,
      ),
    ).rejects.toThrow('missing')
    expect(resolver.active).toBe(0)
  })

  test('场景包含实体脚本、覆写脚本与背包用品声音', async () => {
    const sounds = await collectSceneSoundAssets({
      scene: {
        id: 's',
        mapId: 'm',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [],
        onEnter: [{ body: [play('sound.scene')] }],
      },
      additionalRoots: [[play('sound.override')]],
      inventoryItems: [
        {
          id: 'i',
          name: 'i',
          desc: [],
          buyPrice: 0,
          sellPrice: 0,
          sellable: false,
          use: { target: 'oneAlly', consuming: true, effects: [], sound: 'sound.item-use' },
          throw: {
            effects: [],
            sound: 'sound.item-throw',
            presentation: {
              kind: 'magic',
              animation: { effectSprite: 24, sound: 'sound.item-fire' },
            },
          },
        },
      ],
      signal: new AbortController().signal,
    })
    expect([...sounds].sort()).toEqual([
      'sound.item-fire',
      'sound.item-throw',
      'sound.item-use',
      'sound.override',
      'sound.scene',
    ])
  })

  test('只递归准备当前场景页绑定与可达动作命令的 cue 音效', async () => {
    const spritesById: Record<string, SpriteDef> = {
      'sprite-8': {
        id: 'sprite-8',
        asset: 'sprite.pal.008',
        label: '蜡烛',
        layout: { kind: 'static' },
        poses: {
          flicker: {
            label: '闪烁',
            steps: [
              {
                frame: 0,
                durationMs: 80,
                cues: [{ kind: 'sound', asset: 'sound.flicker' }],
              },
            ],
          },
          unused: {
            label: '未引用',
            steps: [
              {
                frame: 1,
                durationMs: 80,
                cues: [{ kind: 'sound', asset: 'sound.unused' }],
              },
            ],
          },
        },
      },
    }
    const resolver = new Resolver({
      nested: [
        {
          kind: 'playEntityAction',
          entity: 'e8',
          sprite: 'sprite-8',
          action: 'flicker',
          loop: true,
        },
      ],
    })
    const sounds = await collectSceneSoundAssets({
      scene: {
        id: 's',
        mapId: 'm',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [
          {
            id: 'e8',
            sprite: 'sprite-8',
            pos: { col: 0, row: 0, height: 0 },
            facing: 'down',
            pages: [
              {
                animation: {
                  sprite: 'sprite-8',
                  action: 'flicker',
                  loop: true,
                },
              },
            ],
          },
        ],
        onEnter: [{ body: [{ kind: 'callScript', ref: ref('nested') }] }],
      },
      spritesById,
      resolver,
      signal: new AbortController().signal,
    })

    expect([...sounds]).toEqual(['sound.flicker'])
    expect(resolver.active).toBe(0)
  })

  test('动作 cue readiness 对缺失复合引用 fail-loud', async () => {
    await expect(
      collectSceneSoundAssets({
        scene: {
          id: 's',
          mapId: 'm',
          entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
          entities: [],
          onEnter: [
            {
              body: [
                {
                  kind: 'playEntityAction',
                  entity: 'e',
                  sprite: 'missing',
                  action: 'idle',
                  loop: true,
                },
              ],
            },
          ],
        },
        spritesById: {},
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow('SpriteDef "missing" 不存在')
  })

  test('页默认动作只预取运行时当前支持的 pages[0]，不误读未激活页', async () => {
    const sounds = await collectSceneSoundAssets({
      scene: {
        id: 's',
        mapId: 'm',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [
          {
            id: 'e',
            sprite: 'sprite-8',
            pos: { col: 0, row: 0, height: 0 },
            pages: [{}, { animation: { sprite: 'missing', action: 'missing', loop: true } }],
          },
        ],
      },
      spritesById: {},
      signal: new AbortController().signal,
    })
    expect([...sounds]).toEqual([])
  })

  test('battleBase 递归敌变身/召唤、AI、演出脚本并保留 ScriptRef lease=0', async () => {
    const e3 = enemy('e3')
    const e2 = enemy('e2', [{ at: 'act', do: { kind: 'summon', enemyId: 'e3', count: 1 } }])
    const e1 = enemy('e1', [
      { at: 'act', do: { kind: 'cast', skillId: 'enemy-skill' } },
      { at: 'act', do: { kind: 'transform', enemyId: 'e2' } },
    ])
    e1.steal = { itemId: 'stolen', count: 1 }
    e1.attackEquivItem = { itemId: 'attack-equiv', rate: 10 }
    e2.onDefeated = [{ kind: 'callScript', ref: ref('battle-script') }]
    const resolver = new Resolver({ 'battle-script': [play('sound.script')] })
    const stolen = item('stolen', 'sound.stolen')
    const attackEquiv = item('attack-equiv', 'sound.attack-equiv', { use: '702' })
    const aiGrant = item('ai-grant', 'sound.ai-grant')
    const equivGrant = item('equiv-grant', 'sound.equiv-grant')
    const skills = {
      player: skill('player', 'sound.player-skill'),
      coop: skill('coop', 'sound.coop-skill'),
      'enemy-skill': skill('enemy-skill', 'sound.enemy-skill', {
        effects: [{ kind: 'applyPoison', poisonId: '701' }],
      }),
    }
    const sounds = await collectBattleBaseSounds({
      playerSounds: [{ attack: 'sound.actor' }],
      cooperativeSkillIds: ['coop'],
      enemyDefs: [e1],
      enemiesById: { e1, e2, e3 },
      skills,
      itemsById: {
        stolen,
        'attack-equiv': attackEquiv,
        'ai-grant': aiGrant,
        'equiv-grant': equivGrant,
      },
      poisonDefs: {
        701: {
          id: 701,
          name: 'AI 毒',
          curability: 'common',
          color: 0,
          playerTicks: [{ grantItem: 'ai-grant' }],
        },
        702: {
          id: 702,
          name: '附毒攻击',
          curability: 'common',
          color: 0,
          playerTicks: [{ grantItem: 'equiv-grant' }],
        },
      },
      roles: { 'audio.battleEscapeSound': 'sound.escape' },
      resolver,
      signal: new AbortController().signal,
    })
    expect([...sounds]).toEqual(
      expect.arrayContaining([
        'sound.actor',
        'sound.coop-skill',
        'sound.enemy-skill',
        'sound.e1',
        'sound.e2',
        'sound.e3',
        'sound.escape',
        'sound.script',
        'sound.stolen.use',
        'sound.stolen.throw',
        'sound.ai-grant.use',
        'sound.ai-grant.throw',
        'sound.equiv-grant.use',
        'sound.equiv-grant.throw',
      ]),
    )
    expect(sounds.has('sound.player-skill')).toBe(false)
    expect(sounds.has('sound.attack-equiv.use')).toBe(false)
    expect(sounds.has('sound.attack-equiv.throw')).toBe(false)
    expect(resolver.active).toBe(0)
  })

  test('turn 只收实际 cast/item/throw，施毒目标分别走 enemy/player/enemy ticks', () => {
    const castGrant = item('cast-grant', 'sound.cast-grant')
    const useGrant = item('use-grant', 'sound.use-grant')
    const throwGrant = item('throw-grant', 'sound.throw-grant')
    const medicine = item('medicine', 'sound.medicine', { use: '802', throw: 'unused' })
    const dart = item('dart', 'sound.dart', { use: 'unused', throw: '803' }, 'sound.dart-fire')
    const cast = skill('cast', 'sound.cast', {
      effects: [
        {
          kind: 'summon',
          battleSprite: 'battle-sprite.summon.001',
          sound: 'sound.cast.summon',
        },
        { kind: 'applyPoison', poisonId: '801' },
      ],
    })
    const pendingActions: BattleAction[] = [
      { kind: 'cast', skillId: cast.id, targetEnemyIdx: 0 },
      { kind: 'item', itemId: medicine.id },
      { kind: 'throw', itemId: dart.id, targetEnemyIdx: 0 },
      { kind: 'attack', targetEnemyIdx: 0 },
      { kind: 'coop' },
      { kind: 'defend' },
      { kind: 'flee' },
    ]
    const sounds = collectTurnActionSounds(
      emptyTurn({
        pendingActions,
        skills: { [cast.id]: cast },
        itemsById: {
          [medicine.id]: medicine,
          [dart.id]: dart,
          [castGrant.id]: castGrant,
          [useGrant.id]: useGrant,
          [throwGrant.id]: throwGrant,
        },
        poisonDefs: {
          801: {
            id: 801,
            name: '法术毒',
            curability: 'common',
            color: 0,
            enemyTicks: [{ grantItem: castGrant.id }],
          },
          802: {
            id: 802,
            name: '自用毒',
            curability: 'common',
            color: 0,
            playerTicks: [{ grantItem: useGrant.id }],
          },
          803: {
            id: 803,
            name: '投掷毒',
            curability: 'common',
            color: 0,
            enemyTicks: [{ grantItem: throwGrant.id }],
          },
        },
      }),
    )
    expect([...sounds]).toEqual(
      expect.arrayContaining([
        'sound.cast',
        'sound.cast.summon',
        'sound.medicine.use',
        'sound.dart.throw',
        'sound.dart-fire',
        'sound.cast-grant.use',
        'sound.cast-grant.throw',
        'sound.use-grant.use',
        'sound.use-grant.throw',
        'sound.throw-grant.use',
        'sound.throw-grant.throw',
      ]),
    )
    expect(sounds.has('sound.medicine.throw')).toBe(false)
    expect(sounds.has('sound.dart.use')).toBe(false)
  })

  test('同一 poisonId 的玩家/敌人活跃毒保持两套 tick 身份，base 与 turn 结果一致', async () => {
    const playerOld = item('player-old', 'sound.player-old')
    const playerNow = item('player-now', 'sound.player-now')
    const enemyOld = item('enemy-old', 'sound.enemy-old')
    const enemyNow = item('enemy-now', 'sound.enemy-now')
    const poisonDefs = {
      562: {
        id: 562,
        name: '双侧寄生',
        curability: 'incurable' as const,
        color: 0,
        playerTicks: [{ grantItem: playerOld.id }, { grantItem: playerNow.id }],
        enemyTicks: [{ grantItem: enemyOld.id }, { grantItem: enemyNow.id }],
      },
    }
    const itemsById = {
      [playerOld.id]: playerOld,
      [playerNow.id]: playerNow,
      [enemyOld.id]: enemyOld,
      [enemyNow.id]: enemyNow,
    }
    const activePlayerPoisons = [{ poisonId: 562, tickIndex: 1 }]
    const activeEnemyPoisons = [{ poisonId: 562, tickIndex: 0 }]
    const base = await collectBattleBaseSounds(
      emptyBase({ poisonDefs, itemsById, activePlayerPoisons, activeEnemyPoisons }),
    )
    const turn = collectTurnActionSounds(
      emptyTurn({ poisonDefs, itemsById, activePlayerPoisons, activeEnemyPoisons }),
    )
    for (const sounds of [base, turn]) {
      expect(sounds.has('sound.player-old.use')).toBe(false)
      expect([...sounds]).toEqual(
        expect.arrayContaining([
          'sound.player-now.use',
          'sound.enemy-old.use',
          'sound.enemy-now.use',
        ]),
      )
    }
  })

  test('enemyTicks grantItem 从当前 tick 起递归 use→player / throw→enemy 两侧嵌套毒链', () => {
    const old = item('old', 'sound.old')
    const cocoon = item('cocoon', 'sound.cocoon', { use: '901', throw: '902' })
    const nestedPlayer = item('nested-player', 'sound.nested-player')
    const nestedEnemy = item('nested-enemy', 'sound.nested-enemy')
    const sounds = collectTurnActionSounds(
      emptyTurn({
        itemsById: { old, cocoon, 'nested-player': nestedPlayer, 'nested-enemy': nestedEnemy },
        activePlayerPoisons: [{ poisonId: 562, tickIndex: 1 }],
        activeEnemyPoisons: [{ poisonId: 561, tickIndex: 1 }],
        poisonDefs: {
          561: {
            id: 561,
            name: '食妖虫附',
            curability: 'incurable',
            color: 0,
            enemyTicks: [{ grantItem: old.id }, { grantItem: cocoon.id, selfCure: true }],
          },
          562: {
            id: 562,
            name: '玩家侧无产物对照',
            curability: 'incurable',
            color: 0,
            playerTicks: [{}],
          },
          901: {
            id: 901,
            name: 'use 嵌套',
            curability: 'incurable',
            color: 0,
            playerTicks: [{ grantItem: nestedPlayer.id, selfCure: true }],
          },
          902: {
            id: 902,
            name: 'throw 嵌套',
            curability: 'incurable',
            color: 0,
            enemyTicks: [{ grantItem: nestedEnemy.id, selfCure: true }],
          },
        },
      }),
    )
    expect([...sounds]).toEqual(
      expect.arrayContaining([
        'sound.cocoon.use',
        'sound.cocoon.throw',
        'sound.nested-player.use',
        'sound.nested-player.throw',
        'sound.nested-enemy.use',
        'sound.nested-enemy.throw',
      ]),
    )
    expect(sounds.has('sound.old.use')).toBe(false)
  })
})
