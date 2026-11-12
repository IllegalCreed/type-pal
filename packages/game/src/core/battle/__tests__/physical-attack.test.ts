/** Direct physical-attack contracts; controller scheduling and browser presentation are separate. */
import type { Command, PlayerRole, PlayerRoles } from '@type-pal/shared'
import { afterEach, describe, expect, it } from 'vitest'
import { recordingRng } from '../../../__tests__/scripted-rng.js'
import type { CommandBus } from '../../command-bus.js'
import { runScript, setObjectPoisons } from '../../event-system.js'
import { createSeedableRng } from '../../rng.js'
import { performAttack } from '../actions/attack.js'
import type { BattleState, BattleStatus } from '../battle-state.js'
import {
  enemyActor,
  makeActionFixture,
  makeItem,
  makeRole,
  playerActor,
} from './action.test-fixtures.js'

afterEach(() => {
  setObjectPoisons([])
})

// ============================================================================
// performAttack
// ============================================================================
describe('performAttack', () => {
  // P0#1(2026-06-02 审计核源):玩家物攻 str = PAL_GetPlayerAttackStrength(global.c:1757-1764)
  //   = rgwAttackStrength + Σ装备,**无 level 项**。此前 ts 误加 (level+6)*6(M3 把敌方公式套玩家,fight.c:4917)。
  //   role.attackStrength 已 projected(base+装备)→ 直接用,改后玩家伤害不随 level 虚高。敌方路径有独立等级项。
  it('玩家攻击 str 不含 level 项(同 attackStrength 不同 level → 同伤害)', () => {
    const dmg = (lvl: number): number => {
      const { state, playerRoles, bus } = makeActionFixture({
        role: { level: lvl, attackStrength: 200 },
        enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 30000 }],
      })
      const before = state.enemies[0]!.e.health
      performAttack(state, playerActor, 0, bus, playerRoles)
      return before - state.enemies[0]!.e.health
    }
    expect([dmg(1), dmg(99)]).toEqual([315, 315]) // str=role.attackStrength(200),与 level 无关(旧 bug:242 vs 830)
  })
  it('player 攻击 enemy:扣 enemy.health + emit playPlayerAttack / showDamageNum', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 }, // str = 200(P0#1:无 level 项)
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 100 }],
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(0) // 315 超杀，HP钳0
    const cmds = bus.drain()
    expect(cmds[0]!.cmd).toEqual({ op: 'playPlayerAttack', playerIdx: 0, targetEnemyIdx: 0 })
    // D17b:敌人掉血 → blue(sdlpal fight.c:648-651,sDamage<0);target={kind:'enemy',idx:0}
    expect(cmds[1]!.cmd).toMatchObject({
      op: 'showDamageNum',
      color: 'blue',
      target: { kind: 'enemy', idx: 0 },
      value: 315,
    })
  })
  // sdlpal 玩家打敌人 wHealth 是 WORD,`wHealth -= sDamage`(fight.c:3665)超杀**下溢不钳**,
  //   PAL_BattleDisplayStatChange 用 (SHORT)(wHealth-wPrevHP)(fight.c:638)→ 显示**完整算出伤害**,
  //   非剩余血。(敌打玩家才 `if (hp<sDamage) sDamage=hp` 钳剩余血,fight.c:5064 —— 故意不对称。)
  it('超杀:玩家打敌人显示完整伤害而非剩余血(fight.c:638/3665)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 100 }],
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(0) // 315 > 100 → 击杀
    const cmds = bus.drain()
    const dmg = cmds.map(({ cmd }) => cmd).find((cmd) => cmd.op === 'showDamageNum')
    expect(dmg?.value).toBe(315) // 完整伤害 315,非剩余血 100
  })
  // 群攻同理:sdlpal `wHealth -= sDamage`(fight.c:3726)WORD 下溢,显示完整累加伤害。
  it('超杀:群攻击杀敌显示完整伤害而非剩余血(fight.c:3726)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 50 }],
    })
    performAttack(state, playerActor, -1, bus, playerRoles) // targetIdx<0 = attackAll 群攻
    expect(state.enemies[0]!.e.health).toBe(0) // 314 > 50 → 击杀
    const cmds = bus.drain()
    const dmg = cmds.map(({ cmd }) => cmd).find((cmd) => cmd.op === 'showDamageNum')
    expect(dmg?.value).toBe(314) // 完整伤害 314(群攻无 +1/jitter),非剩余血 50
  })
  // M6 出招声:sdlpal PAL_BattleShowPlayerAttackAnim 起手(fight.c:2058-2071)HP>0 时
  //   !crit→AUDIO_PlaySound(attackSound),crit→criticalSound;在 dual-attack t-loop 内每击一次(fight.c:3673)。
  //   ts 经 bus {op:'playSound'} → bootstrap audio.playSound。命中"武器声"weaponSound 仍由 playPlayerAttack 接。
  it('出招声:玩家物攻起手 emit playSound(非暴击=attackSound,暴击=criticalSound)', () => {
    const drainSounds = (bus: CommandBus): number[] =>
      bus.drain().flatMap(({ cmd }) => (cmd.op === 'playSound' ? [cmd.soundId] : []))

    {
      const { state, playerRoles, bus } = makeActionFixture({
        role: { level: 10, attackStrength: 200, attackSound: 37, criticalSound: 5 },
        enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 100 }],
      })
      performAttack(state, playerActor, 0, bus, playerRoles)
      expect(drainSounds(bus)).toEqual([37])
    }

    {
      const { state, playerRoles, bus } = makeActionFixture({
        role: { level: 10, attackStrength: 200, attackSound: 37, criticalSound: 5 },
        enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 100 }],
        rolls: [1, 0, 1],
      })
      performAttack(state, playerActor, 0, bus, playerRoles)
      expect(drainSounds(bus)).toEqual([5])
    }
  })
  it('群攻(target=-1,attackAll 武器):player 攻击全体活敌(命中序 + division 减半)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 }, // str=200(P0#1 修:无 level 项);每敌 def=54 → base 314
      enemies: [
        { level: 5, defense: 10, physicalResistance: 1, health: 600 },
        { level: 5, defense: 10, physicalResistance: 1, health: 600 },
      ],
    })
    performAttack(state, playerActor, -1, bus, playerRoles)
    // sdlpal fight.c:3684 命中序 {2,1,0,4,3};2 敌(slot 0/1)→ slot1 先打(division1,全额 314)
    //   → slot0 后打(division2,314/2=157)。trunc(600-x)。
    expect(state.enemies[1]!.e.health).toBe(286) // 600-314(满额,先打)
    expect(state.enemies[0]!.e.health).toBe(443) // 600-157(半额,后打)
    const ops = bus.drain().map((c) => c.cmd.op)
    expect(ops.filter((o) => o === 'showDamageNum')).toHaveLength(2) // 2 敌 2 个伤害数字
    expect(ops).toContain('playPlayerAttack')
  })
  it('群攻跳过已 defeated 敌人(wObjectID==0,不计 division)', () => {
    // L21:C 群攻续跳判 wObjectID==0(defeated/清槽),非 health<=0(fight.c:3698)。已死敌 = defeated。
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 },
      enemies: [
        { level: 5, defense: 10, physicalResistance: 1, health: 600 }, // 已 defeated(清槽)→ skip,不计 division
        { level: 5, defense: 10, physicalResistance: 1, health: 600 },
      ],
    })
    state.enemies[0]!.defeated = true // wObjectID==0:死亡结算后清槽
    performAttack(state, playerActor, -1, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(600) // defeated 敌不挨打、不动
    // 仅 slot1 活 → division 全程 1 → 全额 314
    expect(state.enemies[1]!.e.health).toBe(286)
  })
  it('health=0 但未 defeated 的敌(sweep 间窗口)仍挨打 + 让 division 翻倍(fight.c:3698/3728)', () => {
    // C 续跳只判 wObjectID==0,不判 health;首 sweep 打死但本 action 内尚未清槽(checkEnemyDeaths 后跑)的敌
    //   仍参与 division 翻倍(后续活敌伤害减半);C 还对其 wHealth 再扣一次(WORD 下溢,显示完整伤害)。
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 },
      enemies: [
        { level: 5, defense: 10, physicalResistance: 1, health: 600 }, // slot0:HIT_ORDER {2,1,0} 后打
        { level: 5, defense: 10, physicalResistance: 1, health: 0 }, // slot1:health=0 但未 defeated(sweep 间打死),先打
      ],
    })
    performAttack(state, playerActor, -1, bus, playerRoles)
    // slot1(health0 非 defeated)先打 → division*=2;slot0 后打 division2 → 314/2=157
    expect(state.enemies[1]!.e.health).toBe(0) // TS钳0；伤害按钳前数值，不声称C的下溢状态不可观察
    expect(state.enemies[0]!.e.health).toBe(600 - 157) // slot0 半额;改前跳 slot1 → slot0 全额=286
  })
  // ── 敌→我 被动格挡(fAutoDefend,fight.c:4938/5023-5085)──────────────────────
  // BUG(2026-06-04 user 报"高级草妖普攻只出声、无动作、无受击、无掉血"):被动格挡触发时,此前 attack.ts
  //   只 emit playEnemyAttack(经 audio 播敌攻击音)+ return,未建动画 → 有声无动画。修后建格挡动画时间线。
  it('敌→我 被动格挡(掷10触发 fAutoDefend)→ 建格挡动画时间线 + 不掉血', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { hp: 500, maxHP: 500, defense: 10 },
      enemies: [
        {
          level: 5,
          attackStrength: 100,
          defense: 10,
          physicalResistance: 1,
          health: 100,
          attackSound: 39,
        },
      ],
      rolls: [10],
    })
    // buildEnemyPhysicalTimeline 需 posOriginal(否则退化无时间线)
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    const hpBefore = playerRoles.roles[0]!.hp
    performAttack(state, enemyActor, 0, bus, playerRoles)
    // 格挡:建了动画时间线(非只出声 + 空白)
    expect(state.battleAnim).toBeDefined()
    // 格挡:不结算伤害(fight.c:5052 !fAutoDefend gate)
    expect(playerRoles.roles[0]!.hp).toBe(hpBefore)
    // 时间线含玩家格挡姿 frame 3,且全程无 damageNum(无受击数字)
    const frames = state.battleAnim!.frames
    expect(
      frames.some((f) => f.fighters?.some((d) => d.side === 'player' && d.currentFrame === 3)),
    ).toBe(true)
    expect(frames.every((f) => f.damageNum === undefined)).toBe(true)
  })
  // ── D3-b 群攻 crit + division 逐敌减半(fight.c:3681-3748)────────────────────
  it('群攻 division 逐敌减半(3 敌,命中序 {2,1,0})', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 }, // base 314
      enemies: [
        { level: 5, defense: 10, physicalResistance: 1, health: 2000 }, // slot0:division4 → 78.5
        { level: 5, defense: 10, physicalResistance: 1, health: 2000 }, // slot1:division2 → 157
        { level: 5, defense: 10, physicalResistance: 1, health: 2000 }, // slot2:division1 → 314
      ],
    })
    performAttack(state, playerActor, -1, bus, playerRoles)
    expect(state.enemies[2]!.e.health).toBe(2000 - 314) // 先打,全额
    expect(state.enemies[1]!.e.health).toBe(2000 - 157) // 半额
    expect(state.enemies[0]!.e.health).toBe(1921) // 314/4=78.5 → trunc(2000-78.5)=1921
  })
  it('群攻 bravery → 全敌暴击 ×3', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 }, // base 314
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 5000 }],
      playerStatus: { bravery: 1 },
    })
    performAttack(state, playerActor, -1, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(5000 - 314 * 3) // 单敌 division1,314*3=942
  })
  // ── D3 DualAttack 双击武器(仙女剑/玄冥宝刀 等,fight.c:3628/3681 t-loop)──────
  it('DualAttack 武器 → 单体攻击两次', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 }, // base 314,+jitter1=315
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 3000 }],
      playerStatus: { dualAttack: 1 },
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(3000 - 315 * 2) // 两次各 315 = 630
    const dmgNums = bus.drain().flatMap(({ cmd }) => (cmd.op === 'showDamageNum' ? [cmd] : []))
    expect(dmgNums).toHaveLength(2) // 两次攻击 → 两个伤害数字
  })
  // 单体双击出招音只响一次(user 2026-06-05 报):此前 attack.ts loop 内两次 voice + playPlayerAttack 都在
  //   performAttack 同 tick 同步 bus.emit → bootstrap 同帧 drain 同 id 重叠成一次。修:出招声/武器声改挂
  //   时间线 frame.sound(driver 逐 tick 经 bus emit)→ 两段挥砍声音随帧错开各响。sdlpal:每次
  //   ShowPlayerAttackAnim 起手播 attackSound(fight.c:2061-2071)+ currentFrame=9 后播 weaponSound(fight.c:2124)。
  it('单体双击:出招声/武器声挂时间线各帧(逐 tick 播),不再同 tick 同步 emit 重叠(fight.c:2061/2124)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200, attackSound: 37, weaponSound: 88 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 3000 }],
      playerStatus: { dualAttack: 1 },
    })
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    performAttack(state, playerActor, 0, bus, playerRoles)
    const frames = state.battleAnim!.frames
    // 两段挥砍各 frame0 挂出招声(37)→ 共 2;各 currentFrame=9 特效 i==0 帧挂武器声(88)→ 共 2
    expect(frames.filter((f) => f.sound === 37)).toHaveLength(2)
    expect(frames.filter((f) => f.sound === 88)).toHaveLength(2)
    // 武器声不再走 playPlayerAttack 同步命令(已改帧同步,避免双击同 tick 重叠)
    expect(bus.drain().filter((c) => c.cmd.op === 'playPlayerAttack')).toHaveLength(0)
  })
  it('无 DualAttack → 单体只攻击一次(对照)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 3000 }],
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(3000 - 315) // 一次 315
    const dmgNums = bus.drain().flatMap(({ cmd }) => (cmd.op === 'showDamageNum' ? [cmd] : []))
    expect(dmgNums).toHaveLength(1)
  })
  it('DualAttack + attackAll(玄冥宝刀)→ 全体攻击两次', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 }, // base 314
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 5000 }],
      playerStatus: { dualAttack: 1 },
    })
    performAttack(state, playerActor, -1, bus, playerRoles)
    // 两 sweep,每 sweep division 重置 1 → 单敌各全额 314 → 共 628
    expect(state.enemies[0]!.e.health).toBe(5000 - 314 * 2)
    const dmgNums = bus.drain().flatMap(({ cmd }) => (cmd.op === 'showDamageNum' ? [cmd] : []))
    // sdlpal 每 sweep 各调一次 ShowPlayerAttackAnim → 各 sweep i==0 弹自己的数字(PAL_BattleBackupStat 每 swing
    //   后重置 wPrevHP,fight.c:2210/588)→ **两个数字各 314**,非一个总和 628(旧测试"一个总 delta"假设不忠实)。
    expect(dmgNums).toHaveLength(2)
    expect(dmgNums[0]!.value).toBe(314)
    expect(dmgNums[1]!.value).toBe(314)
  })
  // 群攻双击(醉仙望月步授 dualAttack,fight.c:3681 t<(dualAttack?2:1)):sdlpal 每 sweep 各调一次
  //   PAL_BattleShowPlayerAttackAnim(fight.c:3745,在 t-loop 内)→ **两次完整挥砍**,各 sweep i==0 弹自己的
  //   伤害数字(BackupStat 每 swing 后重置 prevHP,fight.c:2210/588)+ 起手出招声 + 命中武器声各播一次。
  //   user 2026-06-05 报"群攻没触发两次 / 出招音效没播两遍"。此前 ts 群攻整段只建一次挥砍 + 武器声一遍。
  //   2026-06-05 进一步:出招/武器声改挂时间线 frame.sound(逐 tick 播,避免同 tick 同步 emit 重叠),不再 playPlayerAttack。
  it('群攻双击:两次完整挥砍段 + 各 sweep i==0 弹自己数字 + 出招/武器声各挂两帧(fight.c:3681/3745/2061/2124)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200, attackSound: 37, weaponSound: 88 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 5000 }],
      playerStatus: { dualAttack: 1 },
    })
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    performAttack(state, playerActor, -1, bus, playerRoles)
    // 两次完整挥砍 → 两个带 damageNums 的命中 i==0 帧,各该 sweep 的 314
    const numFrames = state.battleAnim!.frames.filter((f) => (f.damageNums?.length ?? 0) > 0)
    expect(numFrames, '两个 sweep 各一个 i==0 数字帧').toHaveLength(2)
    expect(numFrames[0]!.damageNums![0]!.value).toBe(314)
    expect(numFrames[1]!.damageNums![0]!.value).toBe(314)
    // 两个完整挥砍段 → 两个命中特效 i==0 帧(currentFrame=9 起手)
    const swingStarts = state.battleAnim!.frames.filter(
      (f) =>
        f.overlay?.kind === 'effect' &&
        f.fighters?.some((d) => d.side === 'player' && d.currentFrame === 9),
    )
    expect(swingStarts, '两次挥砍各一个起手帧').toHaveLength(2)
    // 出招声(37)挂各 sweep frame0、武器声(88)挂各 sweep currentFrame=9 帧 → 时间线各两帧(逐 tick 播,不重叠)
    const frames = state.battleAnim!.frames
    expect(frames.filter((f) => f.sound === 37)).toHaveLength(2)
    expect(frames.filter((f) => f.sound === 88)).toHaveLength(2)
    // 武器声不再走 playPlayerAttack 同步命令
    expect(bus.drain().filter((c) => c.cmd.op === 'playPlayerAttack')).toHaveLength(0)
  })
  // M6/D17a 群攻挥砍动画(林月如等 attackAll 鞭武器):此前群攻**完全无动画**(只即时弹数字),
  //   user 2026-06-03 报"林月如没攻击动画"。修:有 posOriginal → buildPlayerAttackTimeline 挥向中心
  //   (150,100,sdlpal sTarget==-1)。
  // BUG(2026-06-04 user 报"群攻掉血数字出现偏晚"):sdlpal PAL_BattleDisplayStatChange 在
  //   PAL_BattleShowPlayerAttackAnim 挥砍特效**首帧 i==0**(fight.c:2209)就遍历全敌弹数字,**不是**
  //   挥砍播完后。此前 ts 用 pendingDamageNums 时间线后弹(注释误引 fight.c:3748,该处实为 PAL_BattleDelay)
  //   → 数字偏晚。修:群攻伤害数字挂挥砍 i==0 帧(= 首个 effect overlay 帧,与单体同帧),不走 pendingDamageNums。
  it('群攻掉血数字在挥砍 i==0 帧弹(fight.c:2209 DisplayStatChange),非时间线后', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 600 }],
    })
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    performAttack(state, playerActor, -1, bus, playerRoles)
    expect(state.battleAnim, '群攻应建挥砍动画时间线(此前无)').toBeDefined()
    expect(state.battleAnim!.frames.length).toBeGreaterThan(0)
    // i==0 帧 = 首个命中特效 overlay 帧(currentFrame=9 起);DisplayStatChange 在此帧弹全敌数字。
    const swingFrame = state.battleAnim!.frames.find((f) => f.overlay?.kind === 'effect')
    expect(swingFrame, '应有挥砍命中特效帧').toBeDefined()
    expect(swingFrame!.damageNums, '群攻数字挂挥砍 i==0 帧').toHaveLength(1)
    expect(swingFrame!.damageNums![0]!.value).toBe(314)
    expect(swingFrame!.damageNums![0]!.target).toEqual({ kind: 'enemy', idx: 0 })
    expect(swingFrame!.damageNums![0]!.color).toBe('blue')
    // 不再用 pendingDamageNums 时间线后弹(那是法术 PostMagic 的机制,fight.c:3186)
    expect(state.battleAnim!.pendingDamageNums ?? []).toHaveLength(0)
    // frame[0](rush 起手)不即时 emit 数字
    expect(bus.drain().filter((c) => c.cmd.op === 'showDamageNum')).toHaveLength(0)
  })
  // sdlpal PAL_BattleDisplayStatChange 遍历**所有**敌人弹各自数字(fight.c:626-659),群攻命中多敌 →
  //   挥砍 i==0 帧同时弹多个数字(每个掉血敌一个),非逐帧/时间线后弹。
  it('群攻多敌:挥砍 i==0 帧同时弹每个掉血敌的数字(fight.c:626-659)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 },
      enemies: [
        { level: 5, defense: 10, physicalResistance: 1, health: 600 },
        { level: 5, defense: 10, physicalResistance: 1, health: 600 },
      ],
    })
    state.players[0]!.posOriginal = { x: 240, y: 170 }
    state.enemies[0]!.posOriginal = { x: 160, y: 80 }
    state.enemies[1]!.posOriginal = { x: 200, y: 80 }
    performAttack(state, playerActor, -1, bus, playerRoles)
    const swingFrame = state.battleAnim!.frames.find((f) => f.overlay?.kind === 'effect')
    expect(swingFrame!.damageNums, '2 敌各一个数字,同挥砍 i==0 帧').toHaveLength(2)
    // 命中序 {2,1,0,4,3}:slot1 先打(division1 全额 314)/ slot0 后打(division2 半额 157)
    const byIdx = new Map(swingFrame!.damageNums!.map((d) => [d.target.idx, d.value]))
    expect(byIdx.get(1)).toBe(314)
    expect(byIdx.get(0)).toBe(157)
    expect(state.battleAnim!.pendingDamageNums ?? []).toHaveLength(0)
  })
  it('player 低 attackStrength 攻击高 defense enemy:damage 取 1', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 1, attackStrength: 0 }, // str = 0(无 level 项);def 巨大 → calcBase=0
      enemies: [{ level: 50, defense: 10000, physicalResistance: 1, health: 100 }],
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(99) // 100 - 1
  })
  // ── D3-a 单体物理攻击公式真值(fight.c:3636-3663)──────────────────────────
  // damage = CalcPhysical(str,def,res) + RandomLong(1,2) → crit(×3) → 李逍遥(×2)
  //          → ×RandomFloat(1,1.125) → max(1)
  it('单体伤害含 RandomLong(1,2) jitter(无暴击,base+1)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 }, // base = 314(200*2-54*1.6+0.5)
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 600 }],
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(600 - 315) // base314 + jitter1 = 315
  })
  it('jitter 取 2 时 damage = base+2', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 600 }],
      rolls: [2],
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(600 - 316) // base314 + jitter2 = 316
  })
  it('bravery 状态 → 必暴击 ×3(fight.c:3640)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 }, // base 314
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 3000 }],
      playerStatus: { bravery: 1 },
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(3000 - 315 * 3) // (314+1)*3 = 945
  })
  it('RandomFloat(1,1.125) 末乘浮动(factor=1.0625)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, attackStrength: 200 },
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 1000 }],
      factors: [1.0625],
    })
    performAttack(state, playerActor, 0, bus, playerRoles)
    // trunc((314+1) * 1.0625) = trunc(334.6875) = 334
    expect(state.enemies[0]!.e.health).toBe(1000 - 334)
  })
  it('李逍遥(role 0)额外暴击 ×2(fight.c:3649,RandomLong(0,11)==0)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { id: 0, level: 10, attackStrength: 200 }, // role 0 = 李逍遥;base 314
      enemies: [{ level: 5, defense: 10, physicalResistance: 1, health: 3000 }],
    })
    // 脚本化:jitter=1,crit roll=3(≠0 无普通暴击),李逍遥 roll=0(×2),float=1
    state.rng = recordingRng([1, 3, 0], [1])
    performAttack(state, playerActor, 0, bus, playerRoles)
    expect(state.enemies[0]!.e.health).toBe(3000 - 315 * 2) // (314+1)*2 = 630
  })
  it('enemy 攻击 player:扣 role.hp + emit playEnemyAttack', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 5, defense: 10, hp: 200 },
      enemies: [{ level: 10, attackStrength: 200 }],
      rolls: [0, 0, 0],
    })
    performAttack(state, enemyActor, 0, bus, playerRoles)
    expect(playerRoles.roles[0]!.hp).toBe(0) // 伤害钳到剩余HP 200
    const cmds = bus.drain()
    expect(cmds[0]!.cmd).toEqual({ op: 'playEnemyAttack', enemyIdx: 0, targetPlayerIdx: 0 })
    // D17b:player 掉血 → blue,target={kind:'player',idx:0};value=钳后 delta=200(被打死)
    expect(cmds[1]!.cmd).toMatchObject({
      op: 'showDamageNum',
      color: 'blue',
      target: { kind: 'player', idx: 0 },
      value: 200,
    })
  })
  // ── B2 c2:enemy→player 物理公式真值(fight.c:4917-4929 + 5056-5075)──────────
  // def = PlayerDefense(基础+装备防,**无 level 项**)×(defending?2:1);physRes 硬编码 2;
  // sDamage = CalcPhysical(str+RandomLong(0,2), def, 2) + RandomLong(0,1);Protect→/=2
  it('enemy→player def 无 (level+6)*4 项(global.c:1821-1826 真值;修旧 bug)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, defense: 100, hp: 5000 }, // def 真值=100(旧 bug:+ (10+6)*4=164)
      enemies: [{ level: 5, attackStrength: 500 }],
      rolls: [0, 0, 0],
    })
    performAttack(state, enemyActor, 0, bus, playerRoles)
    // base = trunc(566*2 - 100*1.6 + 0.5)=972;/physRes2=486;+0
    expect(5000 - playerRoles.roles[0]!.hp).toBe(486) // 旧 bug 值会是 435(def 164)
  })
  it('enemy→player str+RandomLong(0,2) jitter(str jitter=2，damage jitter=0)', () => {
    const base = makeActionFixture({
      role: { level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      rolls: [0, 0, 0],
    })
    performAttack(base.state, enemyActor, 0, base.bus, base.playerRoles)
    const dmg0 = 5000 - base.playerRoles.roles[0]!.hp
    const hi = makeActionFixture({
      role: { level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      rolls: [0, 2, 0],
    })
    performAttack(hi.state, enemyActor, 0, hi.bus, hi.playerRoles)
    const dmg2 = 5000 - hi.playerRoles.roles[0]!.hp
    expect(dmg0).toBe(486)
    expect(dmg2).toBe(488) // jitter 真加进伤害
  })
  it('enemy→player Protect 状态 → 伤害 /=2(fight.c:5059-5062)', () => {
    const noProt = makeActionFixture({
      role: { level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      rolls: [0, 0, 0],
    })
    performAttack(noProt.state, enemyActor, 0, noProt.bus, noProt.playerRoles)
    const dmgNo = 5000 - noProt.playerRoles.roles[0]!.hp // 486
    const prot = makeActionFixture({
      role: { level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      playerStatus: { protect: 1 },
      rolls: [0, 0, 0],
    })
    performAttack(prot.state, enemyActor, 0, prot.bus, prot.playerRoles)
    const dmgProt = 5000 - prot.playerRoles.roles[0]!.hp
    expect(dmgProt).toBe(Math.trunc(dmgNo / 2)) // 486 → 243
  })
  // ── B2 c3a:fAutoDefend 自动防御全闪避(fight.c:4938 + 5052 !fAutoDefend gate)──────
  it('fAutoDefend(RandomLong(0,16)>=10)命中 → 整次免伤(全闪避)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      rolls: [10],
    })
    performAttack(state, enemyActor, 0, bus, playerRoles)
    expect(playerRoles.roles[0]!.hp).toBe(5000) // 全闪避,血不掉
  })
  it('fAutoDefend 未命中(掷0 → 0>=10 false)→ 正常结算', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      rolls: [0, 0, 0],
    })
    performAttack(state, enemyActor, 0, bus, playerRoles)
    expect(playerRoles.roles[0]!.hp).toBe(4514) // 486伤害
  })
  it('混乱/睡眠/麻痹目标无替挡 → 强制挨打(fight.c:4975-4985,即便 fAutoDefend 命中)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }], // fAutoDefend 本会命中
      playerStatus: { sleep: 1 },
      rolls: [10],
    })
    performAttack(state, enemyActor, 0, bus, playerRoles)
    expect(playerRoles.roles[0]!.hp).toBe(4512) // 强制命中，488伤害
  })
  // ── B2 c3b:守护替挡 cover(rgwCoveredBy,fight.c:4943-4985)──────────────────────
  // 坏状态(混乱/睡眠/麻痹)目标 + fAutoDefend 命中 → 查 coveredBy 找健康替挡者 → 仍闪避(全免伤);
  // 无替挡 / 替挡者也坏状态 → 强制挨打。
  /** 给 state 加第二名队员(守护者)+ playerRoles。 */
  function addCoverer(
    state: BattleState,
    playerRoles: PlayerRoles,
    covererRole: Partial<PlayerRole>,
    covererStatus: Partial<BattleStatus> = {},
  ): void {
    const role = makeRole({ id: 1, hp: 5000, maxHP: 5000, ...covererRole })
    playerRoles.roles[1] = role
    state.players[1] = {
      roleId: 1,
      prevHp: role.hp,
      prevMp: role.mp,
      defending: false,
      status: { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0, ...covererStatus },
    }
  }
  it('混乱目标 + 健康守护者(coveredBy)→ 替挡闪避(免伤)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { id: 0, level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }], // fAutoDefend 命中
      playerStatus: { confused: 1 },
      rolls: [10],
    })
    playerRoles.roles[0]!.coveredBy = 1 // 被 role 1 守护
    addCoverer(state, playerRoles, { hp: 5000 }) // role 1 健康
    performAttack(state, enemyActor, 0, bus, playerRoles)
    expect(playerRoles.roles[0]!.hp).toBe(5000) // 守护者替挡 → 闪避免伤
  })
  it('混乱目标 + 守护者也坏状态 → 无效替挡 → 强制挨打', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { id: 0, level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      playerStatus: { confused: 1 },
      rolls: [10],
    })
    playerRoles.roles[0]!.coveredBy = 1
    addCoverer(state, playerRoles, { hp: 5000 }, { sleep: 1 }) // 守护者睡眠 → 挡不了
    performAttack(state, enemyActor, 0, bus, playerRoles)
    expect(playerRoles.roles[0]!.hp).toBe(4512) // 无有效替挡，488伤害
  })
  it('混乱目标 + coveredBy 指向不在队的角色 → 无替挡 → 挨打', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { id: 0, level: 10, defense: 100, hp: 5000 },
      enemies: [{ level: 5, attackStrength: 500 }],
      playerStatus: { confused: 1 },
      rolls: [10],
    })
    playerRoles.roles[0]!.coveredBy = 3 // role 3 不在队
    performAttack(state, enemyActor, 0, bus, playerRoles)
    expect(playerRoles.roles[0]!.hp).toBe(4512)
  })
  it('player defending → enemy 攻击 damage 显著减小(def *= 2)', () => {
    // 不 defend
    const a = makeActionFixture({
      role: { level: 5, defense: 10, hp: 1000 },
      enemies: [{ level: 10, attackStrength: 200 }],
      defending: false,
      rolls: [0, 0, 0],
    })
    performAttack(a.state, enemyActor, 0, a.bus, a.playerRoles)
    const dmgNoDef = 1000 - a.playerRoles.roles[0]!.hp
    // defend
    const b = makeActionFixture({
      role: { level: 5, defense: 10, hp: 1000 },
      enemies: [{ level: 10, attackStrength: 200 }],
      defending: true,
      rolls: [0, 0, 0],
    })
    performAttack(b.state, enemyActor, 0, b.bus, b.playerRoles)
    const dmgDef = 1000 - b.playerRoles.roles[0]!.hp
    expect(dmgNoDef).toBe(288)
    expect(dmgDef).toBe(280)
  })
  it('enemy str < 0 → clamp 到 0(sdlpal fight.c:4920)', () => {
    const { state, playerRoles, bus } = makeActionFixture({
      role: { level: 1, defense: 1000, hp: 100 },
      // SHORT cast:-32700 仍为负;str = -32700 + (1+6)*6 = -32658 → clamp 0
      enemies: [{ level: 1, attackStrength: 32836 }],
      rolls: [0, 0, 0],
    })
    performAttack(state, enemyActor, 0, bus, playerRoles)
    // str=0, def=1000(无 level 项) → calcBase(0,1000)=0 → damage<=0→1
    expect(playerRoles.roles[0]!.hp).toBe(99)
  })
  function makeBloodwormPoisonFixture(hp: number) {
    // 原盘 39335 与 40862 的操作数保持原样，脚本入口移到本地命令表。
    setObjectPoisons([{ id: 551, level: 0, color: 16, playerScript: 3, enemyScript: 0 }])
    const fixture = makeActionFixture({
      role: { hp, maxHP: 150, defense: 259, deathSound: 23 },
      enemies: [{ level: 12, attackStrength: 16, attackEquivItem: 117, attackEquivItemRate: 4 }],
      rolls: [4, 2, 1, 4, 83, 92, 4, 2, 1, 4, 83, 92],
    })
    const commands: Command[] = [
      { op: 'end' },
      { op: 'raw', opcode: 0x29, operands: [0, 551, 0] },
      { op: 'end' },
      { op: 'raw', opcode: 0x1b, operands: [0, 0xfff9, 0] },
      { op: 'end' },
    ]
    const poison = {
      gs: fixture.gs,
      items: [makeItem({ id: 117, scriptOnUse: 1 })],
      commands,
      runScript,
    }
    return { ...fixture, poison }
  }

  // 敌人普攻 attackEquivItem 中毒(fight.c:5139-5146)—— 29 个敌人(蜜蜂/僵尸/蜘蛛…)普攻附带毒物品
  it('敌普攻附毒物品 117 立即运行 551 的扣血入口，已有同种毒时不重跑', () => {
    const { state, playerRoles, bus, gs, poison } = makeBloodwormPoisonFixture(150)
    performAttack(state, enemyActor, 0, bus, playerRoles, undefined, poison)
    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 551, wPoisonScript: 3 })
    expect(playerRoles.roles[0]!.hp).toBe(142) // physical 1 + first poison entry 7
    expect(
      bus.drain().flatMap(({ cmd }) => (cmd.op === 'showDamageNum' ? [cmd.value] : [])),
    ).toEqual([1])

    performAttack(state, enemyActor, 0, bus, playerRoles, undefined, poison)
    expect(playerRoles.roles[0]!.hp).toBe(141) // only the next physical hit
  })
  it.each([
    { hp: 8, recovery: 1, deathSounds: [] },
    { hp: 1, recovery: 2, deathSounds: [23] },
  ])('敌普攻恢复姿态和阵亡声取附毒前的物理命中结果，受击前 HP=$hp', ({
    hp,
    recovery,
    deathSounds,
  }) => {
    const { state, playerRoles, bus, gs, poison } = makeBloodwormPoisonFixture(hp)
    state.enemies[0]!.posOriginal = { x: 70, y: 90 }
    state.players[0]!.posOriginal = { x: 210, y: 130 }
    state.players[0]!.currentFrame = 1

    performAttack(state, enemyActor, 0, bus, playerRoles, undefined, poison)

    expect(playerRoles.roles[0]!.hp).toBe(0)
    expect(gs.rgPoisonStatus['0_0']).toEqual({ wPoisonID: 551, wPoisonScript: 3 })
    const frames = state.battleAnim?.frames ?? []
    expect(
      frames.map((frame) => frame.damageNum?.value).filter((value) => value !== undefined),
    ).toEqual([1])
    // fight.c:5107–5135 物理后 HP7 用濒死姿态，物理后 HP0 用死亡姿态。附毒在 5143 发生。
    const targetPoses = frames
      .flatMap((frame) => frame.fighters ?? [])
      .filter(
        (delta) => delta.side === 'player' && delta.idx === 0 && delta.currentFrame !== undefined,
      )
    expect(targetPoses.at(-1)?.currentFrame).toBe(recovery)
    expect(frames.flatMap((frame) => (frame.sound === 23 ? [frame.sound] : []))).toEqual(
      deathSounds,
    )
  })
  it('敌普攻 equivItem:rate roll 不过 → 不中毒', () => {
    setObjectPoisons([{ id: 551, level: 0, color: 16, playerScript: 0, enemyScript: 0 }])
    const { state, playerRoles, bus, gs } = makeActionFixture({
      enemies: [{ attackEquivItem: 117, attackEquivItemRate: 2 }],
      rolls: [0, 1, 1, 10], // 不格挡、合法两次伤害抖动，rate=2 被最后的 10 拒绝。
    })
    performAttack(state, enemyActor, 0, bus, playerRoles, undefined, {
      gs,
      items: [makeItem({ id: 117, scriptOnUse: 1 })],
      commands: [{ op: 'end' }, { op: 'raw', opcode: 0x29, operands: [0, 551, 0] }, { op: 'end' }],
      runScript,
    })
    expect(playerRoles.roles[0]!.hp).toBe(132) // 确实命中，排除先格挡退出的假绿。
    expect(gs.rgPoisonStatus['0_0']).toBeUndefined()
  })
  // L22:C 条件链 `iCoverIndex==-1 && !fAutoDefend && rate>=RandomLong(1,10) && PoisonRes<RandomLong(1,100)`
  //   (fight.c:5139)左到右短路 → 非格挡非自卫命中**恒**求值 `rate>=RandomLong(1,10)`,与 equivItem 是否为 0
  //   无关(只第二个 RandomLong(1,100) 受 rate 短路)。旧 TS 加 `equivId!==0 &&` 前置,对普通敌(equivItem=0,
  //   占多数)跳过这次抽取 → 比 C 少消费一次,后续 TS 自身确定性回放数值整体前移。修:删该前置短路。
  it('敌普攻 equivItem==0 命中也消费一次 RandomLong(1,10)(fight.c:5139 短路纪律)', () => {
    let equivRolls = 0 // 统计 (1,10) 抽取(敌→我路径里仅 equiv rate roll 用此参数)
    const { state, playerRoles, bus, gs } = makeActionFixture({
      enemies: [{ attackEquivItem: 0, attackEquivItemRate: 0 }],
    })
    const base = createSeedableRng(1)
    state.rng = {
      ...base,
      rangeInclusive: (lo: number, hi: number) => {
        if (lo === 0 && hi === 16) return 0 // fAutoDefend = 0>=10 = false → 命中(非自卫,进 equiv block)
        if (lo === 1 && hi === 10) {
          equivRolls++
          return 5
        }
        return base.rangeInclusive(lo, hi)
      },
    }
    performAttack(state, enemyActor, 0, bus, playerRoles, undefined, {
      gs,
      items: [], // equivItem=0 找不到物品 → scriptOnUse=0 → 不中毒(等价 C 跑 rgObject[0] 空脚本)
      commands: [{ op: 'end' }],
      runScript,
    })
    expect(equivRolls).toBe(1) // 普通敌命中也消费一次,与 C 短路顺序一致
    expect(gs.rgPoisonStatus['0_0']).toBeUndefined() // 但 equivItem=0 不产生实际中毒
  })
})
