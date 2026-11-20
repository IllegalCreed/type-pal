// @vitest-environment jsdom
/**
 * TEST-BATTLE-WORKFLOWS-1 W4（含 W3 变身/召唤接线）：敌 hook 与屏障组合。
 * - 敌 ready/turnStart 经真实 ai.hooks（现行 schema）构造；hook 结束后**同一敌真实行动**
 *   以行首前缀（`ready-hook ` 开头的敌行动行）+ 我方 HP 实际下降作证（C2：子串匹配混淆行动者）；
 * - 敌 hook 等待（wait 命令）期间输入零提交，hook 完成后选择恢复可继续（W4 原合同）；
 * - 变身/召唤经 hook effect 命令接线（W3 原合同）：新敌形/新召唤敌随后真实行动；
 * - prepareTurnSounds 屏障挂起期间输入零业务副作用（一回合恰一次准备回调）；
 *   gate 在 finally 放行并**消费实际返回的 pending**（保留最初断言错误，不留悬挂 Promise）；
 * - 取消经公开 cancel：done 以 AbortError 精确拒绝，迟到放行后日志/队员快照完整不变。
 */
import type { SkillData } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { wfEnemy, wfHealItem, wfPlayer, wfSkill } from '../__tests__/battle-workflows/catalog.js'
import { recordingSfx } from '../__tests__/battle-workflows/controlled-io.js'
import { makeWfSession } from '../__tests__/battle-workflows/session-driver.js'
import { SfxReadinessResourceError } from '../audio/sfx.js'
import { DialogBox } from '../dialog/dialog-box.js'

const defer = <T>(): { promise: Promise<T>; resolve: (v: T) => void } => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((yes) => {
    resolve = yes
  })
  return { promise, resolve }
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i += 1) await Promise.resolve()
}

test.each([
  'oneEnemy',
  'allEnemies',
] as const)('scripted auto battle spends MP on the strongest eligible %s spell without input', (target) => {
  const basic = wfSkill('basic', 5)
  const chosen: SkillData = {
    ...wfSkill('chosen', 7),
    target,
    effects: [{ kind: 'damage', power: 60, elemental: 0 }],
  }
  const ultimate = wfSkill('ultimate', 1)
  const expensive = wfSkill('expensive', 31)
  for (const skill of [ultimate, expensive]) {
    skill.effects = [{ kind: 'damage', power: 100, elemental: 0 }]
  }
  const healing: SkillData = {
    ...wfSkill('healing', 3),
    target: 'self',
    effects: [{ kind: 'healHp', amount: 100 }],
  }
  const skills = [basic, chosen, ultimate, expensive, healing]
  const h = makeWfSession({
    players: [wfPlayer('hero', { skills: skills.map(({ id }) => id) })],
    enemies: [wfEnemy('target-left', { health: 500 }), wfEnemy('target-right', { health: 500 })],
    extraOpts: {
      auto: true,
      skills: Object.fromEntries(skills.map((skill) => [skill.id, skill])),
    },
  })

  for (let i = 0; i < 40 && h.readParty()[0]?.mp === 30; i++) h.idle(40)

  expect(h.readParty()[0]?.mp).toBe(23)
  const hits = h.session.debugLog().filter((line) => line.includes('name.chosen'))
  expect(hits).toEqual(
    target === 'oneEnemy'
      ? [expect.stringContaining('target-left')]
      : [expect.stringContaining('target-left'), expect.stringContaining('target-right')],
  )
})

test('missing the casting item leaves an authored centered warning until a confirm key', () => {
  const wine = wfHealItem('wine')
  const text = '酒不足，无法召唤酒神'
  const skill = wfSkill('summon', 1)
  skill.cost = { mp: 1, items: [{ itemId: wine.id, amount: 1 }], missingItemsText: text }
  const h = makeWfSession({
    players: [wfPlayer('hero', { skills: [skill.id] })],
    enemies: [wfEnemy('lantern', { health: 500 })],
    extraOpts: { skills: { [skill.id]: skill }, items: { [wine.id]: wine }, inventory: [] },
  })
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 200
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is unavailable')
  const dialogue = new DialogBox(ctx, h.assets.glyphs, [])
  h.assets.dialogBox = dialogue
  h.press(['ArrowLeft'])
  h.press(['Enter'])
  h.press(['Enter'])
  h.press(['Enter'])
  for (let i = 0; i < 40 && !dialogue.active; i++) h.idle(40)
  expect(dialogue.observe()).toMatchObject({ slot: 'center', pageText: text })
  expect(h.readParty()[0]?.mp).toBe(29)

  for (let elapsed = 0; elapsed < 1600; elapsed += 40) h.idle(40)
  h.session.render(ctx, 1)
  h.press(['ArrowUp'])
  expect(dialogue.observeSlots()).toMatchObject([{ slot: 'center', visibleText: text }])
  h.press(['Enter'])
  expect(dialogue.active).toBe(false)
  expect(h.readParty()[0]?.mp).toBe(29)
})

test('a successful escape spell plays one retreat, with fallen allies left in place until exit', async () => {
  const spell: SkillData = {
    ...wfSkill('escape', 33),
    target: 'allAllies',
    effects: [{ kind: 'fleeBattle' }],
    animation: { effectSprite: 65535 },
  }
  const sound = 'sound.escape'
  const sfx = recordingSfx()
  const h = makeWfSession({
    players: [
      wfPlayer('hero', { mp: 40, maxMp: 40, skills: [spell.id] }),
      wfPlayer('fallen', { hp: 0 }),
    ],
    enemies: [wfEnemy('guard', { health: 500 })],
    extraOpts: {
      skills: { [spell.id]: spell },
      soundRoles: { 'audio.battleEscapeSound': sound },
    },
  })
  h.assets.sfx = sfx.player
  const fighter = h.assets.battleSprites.get('battle-sprite.player')
  if (!fighter) throw new Error('player fighter fixture unavailable')
  for (const [pose, color] of [
    [0, 30],
    [2, 80],
  ] as const) {
    const frame = fighter.sprite.frames[pose]
    if (!frame) throw new Error('player pose unavailable')
    frame.pixels[0] = color
  }
  h.assets.palette = {
    colors: Array.from({ length: 256 }, (_, index): [number, number, number] => [index, 0, 0]),
    cycles: [],
  }
  const canvas = document.createElement('canvas')
  canvas.width = 320
  canvas.height = 200
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D is unavailable')
  const pixel = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[0]
  h.session.render(ctx, 1)
  expect([pixel(200, 175), pixel(256, 151)]).toEqual([30, 80])

  h.press(['ArrowLeft'])
  h.press(['Enter'])
  h.press(['Enter'])
  for (let i = 0; i < 40 && !sfx.plays.includes(sound); i++) h.idle(40)
  expect(sfx.plays).toContain(sound)
  h.session.render(ctx, 1)
  expect([pixel(205, 179), pixel(200, 175), pixel(256, 151)]).toEqual([30, 0, 80])
  expect(h.session.debugPlayers()[1]?.hp).toBe(0)
  let result: string | undefined
  void h.session.done.then((value) => {
    result = value
  })
  for (let i = 0; i < 50 && result === undefined; i++) {
    h.idle(40)
    await flush()
  }
  expect(result).toBe('playerFled')
  expect(sfx.plays.filter((played) => played === sound)).toEqual([sound])
  expect(h.readParty().map(({ mp }) => mp)).toEqual([7, 30])
})

describe('W4 敌钩子与屏障组合', () => {
  test('敌 ready hook 真实激活：hook 音先播，完成后同一敌以自己名义真实攻击（HP 实降）', async () => {
    const sfx = recordingSfx()
    const enemy = wfEnemy('ready-hook', { attackStrength: 40, health: 500, dexterity: 10 })
    enemy.ai.hooks = {
      ready: {
        initial: 'ready',
        states: {
          ready: {
            body: [{ kind: 'playSound', asset: 'sound.ready' }],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 30, hp: 200, maxHp: 200 })],
      enemies: [enemy],
    })
    Object.assign(h.assets, { sfx: sfx.player })
    h.press([' '])
    h.press([' '])
    h.idle(500)
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'menu'; i += 1) {
      h.idle(500)
      await flush()
    }
    expect(sfx.plays).toContain('sound.ready') // 敌 ready hook 真实执行
    // 同一敌以自己名义行动：敌行动行以「ready-hook 」开头（非我方攻击该敌的行）
    expect(
      h.session.debugLog().some((line) => line.startsWith('ready-hook ') && line.includes('攻击')),
    ).toBe(true)
    // 该敌行动真实落在我方：HP 实际下降（拿走敌行动队列的变异会在此红）
    const players = h.session.debugPlayers()
    expect(players[0]!.hp).toBeLessThan(200)
  })

  test('敌 turnStart hook 真实激活（战斗开场即排队执行）', async () => {
    const sfx = recordingSfx()
    const enemy = wfEnemy('turn-hook', { attackStrength: 1, health: 500 })
    enemy.ai.hooks = {
      turnStart: {
        initial: 'intro',
        states: {
          intro: {
            body: [{ kind: 'playSound', asset: 'sound.intro' }],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const h = makeWfSession({ players: [wfPlayer('p1')], enemies: [enemy] })
    Object.assign(h.assets, { sfx: sfx.player })
    h.idle() // 第一 tick 排队并激活 turnStart
    for (let i = 0; i < 40; i += 1) {
      h.idle(500)
      await flush()
    }
    expect(sfx.plays).toContain('sound.intro')
  })

  test('敌 hook 等待与选择恢复：wait 期间零提交（readiness 快照为证），hook 完成后菜单恢复可继续', async () => {
    const sfx = recordingSfx()
    const enemy = wfEnemy('waiter', { attackStrength: 1, health: 500 })
    enemy.ai.hooks = {
      turnStart: {
        initial: 'hold',
        states: {
          hold: {
            body: [
              { kind: 'wait', ms: 400 },
              { kind: 'playSound', asset: 'sound.after-wait' },
            ],
            next: { kind: 'stay' },
          },
        },
      },
    }
    // 公开 readiness 观察器：prepareTurnSounds 只在动作真正提交进出手准备时被调；
    // 「等待期输入可以提前提交、只是执行被后层挡住」的坏实现会把动作提前交进来（N2 oracle）
    const readinessSnapshots: unknown[] = []
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 30 })],
      enemies: [enemy],
      extraOpts: {
        prepareTurnSounds: (snapshot: unknown) => {
          readinessSnapshots.push(snapshot)
          return Promise.resolve()
        },
      },
    })
    Object.assign(h.assets, { sfx: sfx.player })
    h.idle(16) // 第一 tick：turnStart hook 激活并进入 wait
    // 等待窗口（累计 <400ms）内连按确认：hook 未完成 → 不得提交任何行动（零提交，非仅未执行）
    for (let i = 0; i < 8; i += 1) h.press([' '], 16)
    expect(sfx.plays).not.toContain('sound.after-wait') // hook 仍在等待
    expect(readinessSnapshots.length).toBe(0) // 零提交：无任何动作被交进出手准备
    expect(h.session.debugReadiness().phase).toBe('menu') // 选择未被推进（未被吞进 acting/preparing）
    expect(h.session.debugLog().filter((line) => line.startsWith('p1 ')).length).toBe(0)
    // 时间推过 wait：hook 完成（尾音作证）→ 选择恢复；被吞掉的按键没有留下多余动作
    for (let i = 0; i < 40 && !sfx.plays.includes('sound.after-wait'); i += 1) {
      h.idle(100)
      await flush()
    }
    expect(sfx.plays).toContain('sound.after-wait')
    h.idle(16) // 排干 hook complete 步（该 tick 仍归 hook 泵）
    expect(readinessSnapshots.length).toBe(0) // 恢复瞬间仍是零提交：早前乱按没有残留动作
    // 菜单恢复可继续：默认攻击真实执行（恰一笔）
    h.press([' ']) // 菜单确认 → 选敌
    h.press([' ']) // 确认目标 → 提交
    h.idle(500)
    await flush()
    expect(readinessSnapshots.length).toBe(1) // 恰一次出手准备（本次提交）
    for (let i = 0; i < 40; i += 1) {
      h.idle(500)
      await flush()
    }
    const attacks = h.session
      .debugLog()
      .filter((line) => line.startsWith('p1 ') && line.includes('攻击'))
    expect(attacks.length).toBe(1) // 只有恢复后这一笔攻击（无提前提交/无残留）
  })

  test('敌 hook effect 召唤接线：summon 填空槽，新敌随后以自己名义真实攻击', async () => {
    const sfx = recordingSfx()
    const boss = wfEnemy('boss', { attackStrength: 1, health: 500 })
    boss.ai.hooks = {
      turnStart: {
        initial: 'spawn',
        states: {
          spawn: {
            body: [
              {
                kind: 'effect',
                id: 'spawn',
                effect: { kind: 'summon', enemyId: 'minion', count: 1 },
              },
            ],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 10, hp: 200, maxHp: 200 })],
      enemies: [boss, null], // 固定敌槽留一个空位
      enemiesById: { minion: wfEnemy('minion', { attackStrength: 25, health: 100 }) },
      extraOpts: {
        auto: true,
        soundRoles: { 'audio.battleEnemySummonSound': 'sound.summon' },
      },
    })
    Object.assign(h.assets, { sfx: sfx.player })
    for (let i = 0; i < 80; i += 1) {
      h.idle(500)
      await flush()
    }
    // 召唤经真 runtime → core 接线落进战场：新召唤敌随后以自己名义行动（行首「minion 」）
    expect(
      h.session.debugLog().some((line) => line.startsWith('minion ') && line.includes('攻击')),
    ).toBe(true)
    expect(h.session.debugPlayers()[0]!.hp).toBeLessThan(200) // 其行动真实落在我方
    expect(sfx.plays.filter((asset) => asset === 'sound.summon')).toEqual(['sound.summon'])
  })

  test('分裂填入后方槽位时，分身的回合起手在当前扫描内执行一次', async () => {
    const sfx = recordingSfx()
    const enemy = wfEnemy('slime', { health: 110 })
    enemy.ai.hooks = {
      turnStart: {
        initial: 'divide',
        states: {
          divide: {
            body: [{ kind: 'effect', id: 'divide', effect: { kind: 'divide', copies: 1 } }],
            next: {
              kind: 'commandOutcome',
              commandId: 'divide',
              outcome: 'succeeded',
              then: { kind: 'stay' },
              else: { kind: 'continue', state: 'blocked' },
            },
          },
          blocked: {
            body: [{ kind: 'playSound', asset: 'sound.split-blocked' }],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const h = makeWfSession({ players: [wfPlayer('p1')], enemies: [enemy] })
    Object.assign(h.assets, { sfx: sfx.player })
    for (let i = 0; i < 90; i += 1) {
      h.idle(16)
      await flush()
    }
    expect(sfx.plays).toEqual(['sound.split-blocked'])
  })

  test('同一 ready 脚本连续召唤时，先入场的敌人只在两次亮色停拍中切换闲站帧', async () => {
    const sfx = recordingSfx()
    const summoner = wfEnemy('summoner', { health: 500 })
    summoner.ai.hooks = {
      ready: {
        initial: 'summon-both',
        states: {
          'summon-both': {
            body: [
              {
                kind: 'effect',
                id: 'first-arrival',
                effect: { kind: 'summon', enemyId: 'minion', count: 1 },
              },
              {
                kind: 'effect',
                id: 'second-arrival',
                effect: { kind: 'summon', enemyId: 'minion', count: 1 },
              },
            ],
            next: { kind: 'advance', state: 'finished' },
          },
          finished: { body: [], next: { kind: 'stay' } },
        },
      },
    }
    const minion = wfEnemy('minion', { health: 100 })
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 1, hp: 200, maxHp: 200 })],
      enemies: [null, summoner, null],
      enemiesById: { minion },
      extraOpts: { auto: true, soundRoles: { 'audio.battleEnemySummonSound': 'sound.summon' } },
    })
    h.assets.sfx = sfx.player
    const sprite = h.assets.battleSprites.get(minion.battleSprite)!
    if (sprite.definition.profile.kind !== 'enemy') throw new Error('召唤敌精灵缺闲站姿势')
    sprite.definition.profile.idleTicksPerFrame = 4
    sprite.sprite.frames[0]!.pixels[0] = 0x22
    sprite.sprite.frames[1]!.pixels[0] = 0x26
    h.assets.palette = {
      colors: Array.from({ length: 256 }, (_, index): [number, number, number] => [index, 0, 0]),
      cycles: [],
    }
    const canvas = document.createElement('canvas')
    canvas.width = 320
    canvas.height = 200
    const ctx = canvas.getContext('2d')!
    const drawnPoses = () => {
      h.session.render(ctx, 1)
      return [ctx.getImageData(70, 139, 1, 1).data[0], ctx.getImageData(160, 99, 1, 1).data[0]]
    }
    const summons = () => sfx.plays.filter((asset) => asset === 'sound.summon')
    for (let i = 0; i < 120 && !summons().length; i += 1) {
      h.idle(16)
      await flush()
    }
    expect(summons()).toEqual(['sound.summon'])

    const firstArrivalMs = 72 * 16 * 2 + 2 * 40
    for (let elapsed = 16; elapsed < firstArrivalMs; elapsed += 16) h.idle(16)
    expect(summons()).toEqual(['sound.summon'])
    for (let i = 0; i < 40 && summons().length === 1; i += 1) h.idle(16)
    expect(summons()).toEqual(['sound.summon', 'sound.summon'])
    expect(drawnPoses()[0]).toBe(0x22)
    h.idle(72 * 16 - 16)
    expect(drawnPoses()).toEqual([0x22, 0x2a])
    h.idle(16 + 40)
    expect(drawnPoses()).toEqual([0x22, 0x2a])
    h.idle(40 + 72 * 16 - 16)
    expect(drawnPoses()).toEqual([0x26, 0x22])
  })

  test.each([
    { count: 1, result: 'caster 召唤了 1 个 minion', sounds: ['sound.summon'] },
    { count: 2, result: 'caster 召唤失败', sounds: [] },
  ])('敌普通 AI $result，召唤音等待手势结束并取决于实际入槽', async (sample) => {
    const sfx = recordingSfx()
    const boss = wfEnemy('caster', { health: 500 }, { battleSprite: 'battle-sprite.caster.magic' })
    boss.ai.rules = [
      { at: 'act', do: { kind: 'summon', enemyId: 'minion', count: sample.count }, once: true },
    ]
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 1, hp: 200, maxHp: 200 })],
      enemies: [boss, null],
      enemiesById: { minion: wfEnemy('minion', { health: 100 }) },
      extraOpts: {
        auto: true,
        soundRoles: { 'audio.battleEnemySummonSound': 'sound.summon' },
      },
    })
    Object.assign(h.assets, { sfx: sfx.player })
    for (let i = 0; i < 70 && !h.session.debugLog().includes(sample.result); i += 1) {
      h.idle(40)
      await flush()
    }
    expect(h.session.debugLog()).toContain(sample.result)
    const summonSounds = () => sfx.plays.filter((asset) => asset === 'sound.summon')
    h.idle(39)
    expect(summonSounds()).toEqual([])
    h.idle(1)
    expect(summonSounds()).toEqual(sample.sounds)
    h.idle(40)
    expect(summonSounds()).toEqual(sample.sounds)
  })

  test('敌 hook effect 变身接线：transform 换身后新敌形以新名义继续行动', async () => {
    const boss = wfEnemy('boss', { attackStrength: 1, health: 500 })
    boss.ai.hooks = {
      turnStart: {
        initial: 'reveal',
        states: {
          reveal: {
            body: [
              {
                kind: 'effect',
                id: 'reveal',
                effect: { kind: 'transform', enemyId: 'boss-true' },
              },
            ],
            next: { kind: 'stay' },
          },
        },
      },
    }
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 1, hp: 200, maxHp: 200 })],
      enemies: [boss],
      enemiesById: { 'boss-true': wfEnemy('boss-true', { attackStrength: 30, health: 500 }) },
      extraOpts: { auto: true },
    })
    for (let i = 0; i < 60; i += 1) {
      h.idle(500)
      await flush()
    }
    // 换身后新敌形以新 id 名义行动（原槽位 def 已被 transform 替换），伤害按新形数值落在我方
    expect(
      h.session.debugLog().some((line) => line.startsWith('boss-true ') && line.includes('攻击')),
    ).toBe(true)
    expect(
      h.session
        .debugLog()
        .some(
          (line) =>
            line.startsWith('boss-true ') === false &&
            line.startsWith('boss ') &&
            line.includes('攻击'),
        ),
    ).toBe(false) // 旧 id 不再作为行动者出现（已换形）
    expect(h.session.debugPlayers()[0]!.hp).toBeLessThan(200)
  })

  test('屏障挂起：pending 期间按键零业务副作用（MP 不偷扣），放行后真实推进', async () => {
    const gate = defer<void>()
    let prepareCalls = 0
    let pending: Promise<void> | undefined
    const h = makeWfSession({
      players: [wfPlayer('p1', { skills: ['wf-strike'], mp: 40, maxMp: 40 })],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: {
        skills: {},
        prepareTurnSounds: () => {
          prepareCalls += 1
          pending = gate.promise // 保存实际返回的 pending（finally 消费同一 Promise）
          return gate.promise
        },
      },
    })
    let bodyFailed = false
    try {
      h.press([' '])
      h.press([' '])
      h.idle(16)
      await flush()
      expect(prepareCalls).toBeGreaterThan(0) // 屏障确实已进入（挂起中）
      expect(h.session.debugReadiness().phase).toBe('preparing')
      // 挂起期间乱按技能/确认键：不得产生任何业务提交（MP 偷扣即红）
      h.press(['ArrowLeft'])
      h.press([' '])
      h.press([' '])
      h.press([' '])
      // 屏障合同：一回合恰好一次准备回调；挂起期间输入不得解锁并重新进入准备
      expect(prepareCalls).toBe(1)
      expect(h.readParty()[0]!.mp).toBe(40) // 零业务副作用（非仅 phase 停留）
      expect(h.session.debugReadiness().phase).toBe('preparing')
      gate.resolve()
      for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'menu'; i += 1) {
        h.idle(500)
        await flush()
      }
      expect(h.session.debugReadiness().phase).toBe('menu') // 放行后真实推进
      expect(h.readParty()[0]!.mp).toBe(40) // 乱按未被采纳为零提交
      // 挂起期间的乱按没有产生额外提交：本轮只执行提交前那一笔攻击
      const attacks = h.session
        .debugLog()
        // 我方行动行以「p1 」开头；敌反击行以「e1 」开头
        .filter((line) => line.startsWith('p1 ') && line.includes('攻击'))
      expect(attacks.length).toBe(1)
    } catch (error) {
      bodyFailed = true
      throw error
    } finally {
      // finally 放行并消费同一 pending：断言失败也不遗留悬挂 Promise，且保留最初断言错误
      gate.resolve()
      if (pending)
        await pending.catch((error) => {
          if (!bodyFailed) throw error
        })
    }
  })

  test('屏障资源失败降级继续：SfxReadinessResourceError 后战斗仍到 victory 终态', async () => {
    let failures = 0
    const h = makeWfSession({
      players: [wfPlayer('p1', { attackStrength: 60 })],
      enemies: [wfEnemy('e1', { health: 20, defense: 0, attackStrength: 1 })],
      extraOpts: {
        prepareTurnSounds: async () => {
          failures += 1
          if (failures === 1) throw new SfxReadinessResourceError([new Error('missing.wav')])
        },
        reportReadinessError: () => {},
      },
    })
    h.press([' '])
    h.press([' '])
    h.idle(500)
    for (let i = 0; i < 80 && h.session.debugReadiness().phase !== 'over'; i += 1) {
      h.idle(500)
      await flush()
    }
    expect(h.session.debugReadiness().phase).toBe('over')
    for (let screen = 0; screen < 6; screen += 1) {
      h.idle(350)
      h.press([' '])
      await flush()
    }
    await expect(h.session.done).resolves.toBe('victory') // 降级继续到达精确终态
  })

  test('公开 cancel：pending 屏障期间取消 → done 以 AbortError 精确拒绝，迟到完成零推进', async () => {
    const gate = defer<void>()
    let pending: Promise<void> | undefined
    const h = makeWfSession({
      players: [wfPlayer('p1')],
      enemies: [wfEnemy('e1', { health: 500, attackStrength: 1 })],
      extraOpts: {
        prepareTurnSounds: () => {
          pending = gate.promise
          return gate.promise
        },
      },
    })
    let bodyFailed = false
    try {
      h.press([' '])
      h.press([' '])
      h.idle(16)
      await flush()
      expect(h.session.debugReadiness().phase).toBe('preparing')
      const logAtCancel = [...h.session.debugLog()]
      const playersAtCancel = h.session.debugPlayers()
      h.session.cancel()
      await expect(h.session.done).rejects.toMatchObject({ name: 'AbortError' })
      // 取消后不再接受推进：gate 放行也不复活；业务状态/日志完整不变（非仅 phase 名字）
      gate.resolve()
      await flush()
      h.idle(500)
      expect(h.session.debugReadiness().phase).toBe('preparing') // 迟到完成无新 core 推进
      expect(h.session.debugLog()).toEqual(logAtCancel) // 日志零增长
      expect(h.session.debugPlayers()).toEqual(playersAtCancel) // 队员状态不变
    } catch (error) {
      bodyFailed = true
      throw error
    } finally {
      gate.resolve()
      if (pending)
        await pending.catch((error) => {
          if (!bodyFailed) throw error
        })
    }
  })
})
