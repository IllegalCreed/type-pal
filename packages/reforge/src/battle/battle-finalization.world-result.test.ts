// @vitest-environment jsdom
/**
 * TEST-GLM-REFORGE-BATTLE-FLOW-1：终局与恢复（battle-finalization 家族，BF-01..BF-07）。
 * 卡面 `battle-finalization.ts` 不存在 —— 终局真源 = battle-world-result.ts
 * （settleBattleVictory / finishBattleWorldState，公开 caller main.ts:1172-1174 与
 * battle-trial-session.ts:58-61 的 buildSettlement 钩子）。本文件以 scenarioProject 真工程
 * + createBattlePlayers 真派生构造真实 BattleSession，over 相位经 buildSettlement 走真 settle，
 * done 后按 main 语义直调 finishBattleWorldState；oracle 全部落在大世界可观察状态上。
 * 排重：host 旧测 16 例只覆盖 victory 单景间接路径（money+7/hp90），settle/finish 的
 * exp 门、结算屏 wiring、defeat/flee 恢复、毒清理、金钱/收妖合并从未直接合同化。
 */
import { type ActorDef, type AuthorEnemyDef, buildWorld, lookupText } from '@type-pal/content'
import type { RleFrame } from '@type-pal/shared'
import { expect, test } from 'vitest'
import { realFrame } from '../__tests__/battle-workflows/catalog.js'
import { stubGlyphs } from '../__tests__/battle-workflows/controlled-io.js'
import { drain } from '../__tests__/runtime-shell/driver.js'
import { shellActor } from '../__tests__/runtime-shell/project.js'
import {
  combatActor,
  installShellHost,
  medicine,
  opponent,
  scenarioProject,
} from '../__tests__/runtime-shell/scenarios.js'
import type { LoadedBattleSpriteDefinition } from '../assets.js'
import { loadStandardPalette } from '../assets.js'
import { type LoadedCurrentProject, loadCurrentProjectFrom } from '../project-loader.js'
import { projectItemsView } from '../runtime-project-view.js'
import { createBattlePlayers } from './battle-player-input.js'
import type { BattleResult } from './battle-result.js'
import { BattleSession, type BattleSessionAssets } from './battle-session.js'
import { finishBattleWorldState, settleBattleVictory } from './battle-world-result.js'
import type { SettlementScreen } from './settlement.js'

type ScenarioFixture = Awaited<ReturnType<typeof scenarioProject>>

/** 完整敌属性（opponent 顶层浅覆盖，stats 必须整块替换）。 */
function foeWith(stats: Partial<AuthorEnemyDef['stats']>, extra: Partial<AuthorEnemyDef> = {}) {
  return opponent({
    stats: {
      health: 1,
      level: 1,
      exp: 0,
      cash: 7,
      attackStrength: 1,
      magicStrength: 0,
      defense: 0,
      dexterity: 1,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
      ...stats,
    },
    ...extra,
  })
}

/** 真工程定义 + 真实帧的 LoadedBattleSpriteDefinition（帧资源为 wf 判例许可的合成真帧）。 */
function projectSprite(
  project: ScenarioFixture['project'],
  id: string,
): LoadedBattleSpriteDefinition {
  const definition = project.battleSpritesById[id]
  if (!definition) throw new Error(`fixture 缺战斗精灵定义 ${id}`)
  const frames: RleFrame[] = Array.from({ length: 11 }, () => realFrame())
  return {
    definition,
    sprite: {
      frames,
      anchorX: 0,
      anchorY: 0,
      profile: 'canonical',
      decode: { declaredSlots: 11, trailingSentinel: false, skippedLegacyTailSlots: 0 },
    },
  }
}

interface FinalizationScenario {
  enemy: AuthorEnemyDef
  actors?: ActorDef[]
  items?: ReturnType<typeof medicine>[]
  inventory?: Array<{ itemId: string; count: number }>
  seedStats?: Record<string, { hp?: number; mp?: number }>
  extraSkills?: SceneExtraSkills
  worldPoisons?: Array<{ poisonId: number; tickIndex: number }>
  /** 战前授予首位队员的技能（写 world.learnedSkills；避免 initialMagic 与注入技能的先后环）。 */
  worldSkills?: string[]
  worldCollectValue?: number
  injectPoisons?: boolean
}

interface SceneExtraSkills {
  skills?: Array<Record<string, unknown>>
  levelUp?: Record<string, Array<Record<string, unknown>>>
  locale?: Record<string, string>
}

/**
 * 组装终局场景：scenarioProject 真工程 →（可选注入 skills/locale/poisons 并重载）→
 * buildWorld → createBattlePlayers → 真实 BattleSession（buildSettlement 接真 settle，
 * 与 battle-trial-session 同构）。返回可按键驱动并观察大世界的 harness。
 */
async function finalizationHarness(scenario: FinalizationScenario) {
  const browser = await installShellHost()
  const fixture = await scenarioProject({
    enemies: [scenario.enemy],
    actors: scenario.actors ?? [combatActor(), shellActor('friend')],
    items: scenario.items ?? [],
    inventory: scenario.inventory ?? [],
    seedStats: scenario.seedStats,
  })
  if (scenario.extraSkills || scenario.injectPoisons) {
    const skillsFile = (fixture.files['content/skills.json'] ?? {}) as {
      skills?: unknown[]
      levelUp?: unknown
    }
    if (scenario.extraSkills?.skills)
      fixture.files['content/skills.json'] = {
        ...skillsFile,
        skills: [...(skillsFile.skills ?? []), ...scenario.extraSkills.skills],
      }
    if (scenario.extraSkills?.levelUp)
      fixture.files['content/skills.json'] = {
        ...(fixture.files['content/skills.json'] as object),
        levelUp: scenario.extraSkills.levelUp,
      }
    if (scenario.extraSkills?.locale) {
      const locale = (fixture.files['content/locale.json'] ?? {}) as Record<string, string>
      fixture.files['content/locale.json'] = { ...locale, ...scenario.extraSkills.locale }
    }
    if (scenario.injectPoisons) {
      const manifest = structuredClone(fixture.project.manifest)
      manifest.content.poisons = 'content/poisons.json'
      fixture.files['manifest.json'] = manifest
      fixture.files['content/poisons.json'] = [
        {
          id: 601,
          name: 'BF可解毒',
          curability: 'common',
          color: 0,
          enemyTicks: [{ hpDelta: -1 }],
        },
        {
          id: 602,
          name: 'BF不解毒',
          curability: 'incurable',
          color: 0,
          enemyTicks: [{ hpDelta: -1 }],
        },
      ]
    }
  }
  const project: LoadedCurrentProject =
    scenario.extraSkills || scenario.injectPoisons
      ? await loadCurrentProjectFrom(fixture.source)
      : fixture.project
  const start = project.manifest.entryPoints[0]?.startWorld
  if (!start) throw new Error('fixture 缺入口 startWorld')
  const world = buildWorld(start, project.actorsById)
  world.audio = { currentMusic: null }
  if (scenario.worldPoisons) world.party[0]!.poisons = scenario.worldPoisons.map((p) => ({ ...p }))
  if (scenario.worldSkills) world.learnedSkills[world.party[0]!.id] = [...scenario.worldSkills]
  if (scenario.worldCollectValue !== undefined) world.collectValue = scenario.worldCollectValue
  const content = { ...project, items: projectItemsView(project.items) }
  const players = createBattlePlayers(world, content, { dualLeader: null, allLeader: null })
  const palette = await loadStandardPalette(project.assetBase)
  const battleSprites = new Map<string, LoadedBattleSpriteDefinition>()
  for (const id of ['fighter', 'foe-sprite']) {
    const loaded = projectSprite(project, id)
    battleSprites.set(loaded.definition.id, loaded)
  }
  const assets: BattleSessionAssets = {
    palette,
    glyphs: stubGlyphs,
    battleSprites,
    playerBaseDefinitionIds: players.map(() => 'fighter'),
  }
  const observables = {
    onExpRewardCalls: 0,
    screens: null as SettlementScreen[] | null,
  }
  let sessionRef: BattleSession | undefined
  const session: BattleSession = new BattleSession(
    players,
    [scenario.enemy, null, null, null, null],
    assets,
    (id) => {
      const template = world.party.find((c) => c.id === id)?.template
      return lookupText(
        template ? (project.actorsById[template]?.name ?? template) : id,
        project.locale,
      )
    },
    () => 0,
    {
      skills: project.skills,
      enemiesById: project.enemiesById,
      items: content.items,
      inventory: world.inventory.map((entry) => ({ ...entry })),
      money: world.money,
      locale: project.locale,
      poisonDefs: project.poisonsById,
      actorsById: project.actorsById,
      buildSettlement: () => {
        const screens = settleBattleVictory(
          sessionRef ?? session,
          world,
          project,
          () => {
            observables.onExpRewardCalls += 1
          },
          () => 0,
        )
        observables.screens = screens
        return screens
      },
    },
  )
  sessionRef = session
  const keys = (list: readonly string[]) => new Set(list)
  return {
    browser,
    fixture,
    project,
    world,
    session,
    observables,
    press: (list: readonly string[], dtMs = 16) => session.tick(dtMs, keys(list)),
    idle: (dtMs = 16) => session.tick(dtMs, keys([])),
    finish: (result: BattleResult) => finishBattleWorldState(session, result, world, project),
    close: async () => {
      session.cancel()
      await browser.close()
    },
  }
}

type Harness = Awaited<ReturnType<typeof finalizationHarness>>

/** 微任务冲刷 + 菜单自动补防御/攻击、over 相位空格放行结算屏直至 done 兑现。 */
async function drive(h: Harness, settled: () => string | undefined, filler: 'attack' | 'defend') {
  for (let i = 0; i < 1200 && settled() === undefined; i += 1) {
    const phase = h.session.debugReadiness().phase
    if (phase === 'menu') {
      if (filler === 'attack') {
        h.press([' '], 200)
        h.press([' '], 200)
      } else {
        h.press(['d'], 200)
      }
    } else if (phase === 'over') {
      h.idle(350) // 结算屏确认最小间隔 300ms
      h.press([' '], 50)
    } else {
      h.idle(200)
    }
    await drain()
  }
}

const settleAware = (h: Harness) => {
  let settled: string | undefined
  h.session.done.then(
    (result) => {
      settled = result
    },
    () => {
      settled = 'rejected'
    },
  )
  return () => settled
}

test('BF-01 胜利结算：经验门开、金钱入账、首屏 exp-cash、半恢复不越界', async () => {
  const h = await finalizationHarness({
    enemy: foeWith({ health: 1, exp: 15, cash: 7 }),
    seedStats: { hero: { hp: 60 } },
  })
  try {
    const settled = settleAware(h)
    await drive(h, settled, 'attack')
    expect(settled()).toBe('victory')
    expect(h.observables.onExpRewardCalls).toBe(1) // exp>0 → 恰一次经验提示回调
    expect(h.world.money).toBe(50 + 7) // 战前 50 + 现金奖 7
    expect(h.world.party[0]!.exp).toBe(15) // 无升级曲线角色：经验直加
    const screens = h.observables.screens ?? []
    expect(screens[0]).toEqual({ kind: 'exp-cash', exp: 15, cash: 7 })
    // writeBackHp（60）先落，grantBattleRewards 半恢复后加（80）；结算屏序见 settlement 专项
    const sessionHp = h.session.debugPlayers()[0]!.hp
    const expectedHp = Math.max(sessionHp, 1) + Math.floor((100 - Math.max(sessionHp, 1)) / 2)
    expect(h.world.party[0]!.hp).toBe(expectedHp)
  } finally {
    await h.close()
  }
})

test('BF-02 零经验胜利：经验门关、金钱照入账、无结算屏', async () => {
  const h = await finalizationHarness({ enemy: foeWith({ exp: 0, cash: 7 }) })
  try {
    const settled = settleAware(h)
    await drive(h, settled, 'attack')
    expect(settled()).toBe('victory')
    expect(h.observables.onExpRewardCalls).toBe(0) // exp=0 → 经验提示/胜利曲回调不触发
    expect(h.world.money).toBe(50 + 7)
    expect(h.world.party[0]!.exp).toBe(0)
    expect(h.observables.screens).toEqual([]) // buildSettlementScreens：exp=0 不产首屏
  } finally {
    await h.close()
  }
})

test('BF-03 升级链结算：升级、习得入 learnedSkills、结算屏命名按 settle 真值、升级回满在写回之后', async () => {
  const levelActor = structuredClone(combatActor())
  levelActor.battler!.leveling = { expTable: [0, 10] } // level 1→2 需 10 exp
  const h = await finalizationHarness({
    enemy: foeWith({ health: 1, exp: 15, cash: 0 }),
    actors: [levelActor, shellActor('friend')],
    seedStats: { hero: { hp: 60 } },
    extraSkills: {
      skills: [
        {
          id: 'bf-earn',
          name: 'skill.bf-earn',
          desc: '',
          cost: { mp: 5 },
          usableOutsideBattle: false,
          target: 'oneEnemy',
          effects: [{ kind: 'damage', power: 20, elemental: 0 }],
          animation: { effectSprite: 0 },
        },
      ],
      levelUp: { hero: [{ level: 2, skillId: 'bf-earn' }] },
      locale: { 'skill.bf-earn': 'Earned' },
    },
  })
  try {
    const settled = settleAware(h)
    await drive(h, settled, 'attack')
    expect(settled()).toBe('victory')
    const hero = h.world.party[0]!
    expect(hero.level).toBe(2) // 15 exp ≥ 阈值 10 → 升一级
    expect(h.world.learnedSkills[hero.id]).toContain('bf-earn') // 升级学技入 learnedSkills
    const screens = h.observables.screens ?? []
    expect(screens[0]).toEqual({ kind: 'exp-cash', exp: 15, cash: 0 })
    expect(screens[1]?.kind).toBe('level-up')
    expect(screens[1]).toMatchObject({ name: 'Hero' }) // 名字经 project.locale 解析
    const last = screens[screens.length - 1]
    // settle 真值：角色名经 lookupText(locale)；技能名取 SkillData.name 原文（battle-world-result.ts:33-35）
    expect(last).toMatchObject({ kind: 'learn-magic', name: 'Hero', magicName: 'skill.bf-earn' })
    // 升级回满发生在 writeBackHp 之后：战斗内 60 血被升级 refill 到满值（顺序 oracle）。
    expect(hero.hp).toBe(hero.maxHP)
  } finally {
    await h.close()
  }
})

test('BF-04 胜利后 finish：库存消耗清项、≤severe 毒清 incurable 留、不再改写 HP/金钱', async () => {
  const h = await finalizationHarness({
    enemy: foeWith({ health: 1, exp: 0, cash: 7 }),
    items: [medicine('tonic', 10)],
    inventory: [{ itemId: 'tonic', count: 1 }],
    seedStats: { hero: { hp: 60 } },
    worldPoisons: [
      { poisonId: 601, tickIndex: 0 },
      { poisonId: 602, tickIndex: 0 },
    ],
    injectPoisons: true,
  })
  try {
    const settled = settleAware(h)
    h.press(['e', 'E']) // 打开使用列表（唯一药品）
    h.press([' ']) // 单人队 oneAlly 直接施己
    await drive(h, settled, 'attack')
    expect(settled()).toBe('victory')
    const hpAfterSettle = h.world.party[0]!.hp
    expect(hpAfterSettle).toBeGreaterThan(60) // settle 写回 + 半恢复
    h.finish('victory')
    expect(h.world.party[0]!.hp).toBe(hpAfterSettle) // victory 路径 finish 不重写 HP
    expect(h.world.inventory).toEqual([]) // 消耗到 0 的药品被清项
    expect(h.world.party[0]!.poisons).toEqual([{ poisonId: 602, tickIndex: 0 }]) // severe 清、incurable 留
    expect(h.world.money).toBe(50 + 7) // settle 已入账，finish 不重复加钱
  } finally {
    await h.close()
  }
})

test('BF-05 战败后 finish：HP 精确 0、零结算、毒三件套照清、金钱不动', async () => {
  const h = await finalizationHarness({
    enemy: foeWith({ attackStrength: 200 }),
    worldPoisons: [
      { poisonId: 601, tickIndex: 0 },
      { poisonId: 602, tickIndex: 0 },
    ],
    injectPoisons: true,
  })
  try {
    const settled = settleAware(h)
    await drive(h, settled, 'defend') // 防御后敌一击致死
    expect(settled()).toBe('defeat')
    expect(h.observables.screens).toBeNull() // 败不走胜利结算
    expect(h.observables.onExpRewardCalls).toBe(0)
    expect(h.world.money).toBe(50)
    h.finish('defeat')
    expect(h.world.party[0]!.hp).toBe(0) // lost 分支允许 0
    expect(h.world.party[0]!.poisons).toEqual([{ poisonId: 602, tickIndex: 0 }])
  } finally {
    await h.close()
  }
})

test('BF-06 偷得金钱逃跑保留：moneyDelta 公开读数 + finish 并入大世界', async () => {
  const stealActor = structuredClone(combatActor())
  stealActor.battler!.baseStats.luck = 100 // fleeRate 100：roll 0 必过
  const h = await finalizationHarness({
    enemy: foeWith({ health: 1 }, { steal: { itemId: '0', count: 60 } }),
    actors: [stealActor, shellActor('friend')],
    worldSkills: ['bf-steal'],
    extraSkills: {
      skills: [
        {
          id: 'bf-steal',
          name: 'skill.bf-steal',
          desc: '',
          cost: { mp: 5 },
          usableOutsideBattle: false,
          target: 'oneEnemy',
          effects: [{ kind: 'steal', rate: 10 }],
          animation: { effectSprite: 0 },
        },
      ],
    },
  })
  try {
    const settled = settleAware(h)
    h.press(['ArrowLeft'])
    h.press([' ']) // 进入法术列表
    h.press([' ']) // 选中偷窃技 → 敌目标
    h.press([' ']) // 确认目标 → 提交 cast（rng 0：命中 + 偷得 trunc(60/2)=30 文）
    for (let i = 0; i < 200 && h.session.moneyDelta() === 0; i += 1) {
      h.idle(200)
      await drain()
    } // 等真实施放结算（偷得入账）
    expect(h.session.moneyDelta()).toBe(30) // 公开读数：战内金钱增量（偷钱敌）
    for (let i = 0; i < 200 && h.session.debugReadiness().phase !== 'menu'; i += 1) {
      h.idle(200)
      await drain()
    } // 等本轮敌反击收尾回菜单
    h.press(['q', 'Q']) // 次轮逃跑（fleeRate 100 ≥ roll 0 必成）
    for (let i = 0; i < 200 && settled() === undefined; i += 1) {
      h.idle(200)
      await drain()
    }
    expect(settled()).toBe('playerFled')
    expect(h.observables.screens).toBeNull() // 逃跑无结算
    expect(h.world.money).toBe(50) // finish 之前未入账
    h.finish('playerFled')
    expect(h.world.money).toBe(50 + 30) // 原版语义：逃跑也保留偷得金钱
  } finally {
    await h.close()
  }
})

test('BF-07 收妖值战后并入：collectGained 公开读数 + world.collectValue 累加', async () => {
  const h = await finalizationHarness({
    enemy: foeWith({ health: 1, collectValue: 9 }),
    actors: [structuredClone(combatActor()), shellActor('friend')],
    worldSkills: ['bf-collect'],
    worldCollectValue: 5,
    extraSkills: {
      skills: [
        {
          id: 'bf-collect',
          name: 'skill.bf-collect',
          desc: '',
          cost: { mp: 5 },
          usableOutsideBattle: false,
          target: 'oneEnemy',
          effects: [{ kind: 'collectTreasure' }],
          animation: { effectSprite: 0 },
        },
      ],
    },
  })
  try {
    const settled = settleAware(h)
    h.press(['ArrowLeft'])
    h.press([' '])
    h.press([' '])
    h.press([' ']) // 施放收妖 → 敌 collectValue 9 全额累计
    await drive(h, settled, 'attack') // 次轮普攻收尾
    expect(settled()).toBe('victory')
    expect(h.session.collectGained()).toBe(9)
    expect(h.world.collectValue).toBe(5) // finish 之前不动世界
    h.finish('victory')
    expect(h.world.collectValue).toBe(5 + 9)
  } finally {
    await h.close()
  }
})
