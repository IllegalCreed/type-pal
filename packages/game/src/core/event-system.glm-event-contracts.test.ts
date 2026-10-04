/**
 * TEST-GLM-GAME-EVENT-CONTRACTS-1 — event-system.ts 四段范围的未证语义合同。
 *
 * 排重结论(对照 event-system.test.ts / cov85 全 6 文件 / glm-event-k01-k06 /
 * runscript-rearm / battle-dialog 等,详见任务卡排重账):
 *  - 1208-1469(autoScript):前提门/owner 门/end 三态/goto/0x09/0x06/0x10/0x11/0x7C/
 *    default/ip 越界均已证(cov85 + 旧测 B 类);本组只补 0x04 多帧 callee 退化臂
 *    (DL15 只证 instant callee)。
 *  - 2903-3154(runScript):end 三态/入队/0x69 defer/0x35 缓冲/兜底 skip/守卫 throw/
 *    0x06/0x1e/0x19/越界返回均已证;本组补 goto 缺 label throw、showDialog explore
 *    throw、结构化 op throw、startBattle/loadScene/setPalette 诊断 skip、explore
 *    防御 no-op、battle 0x04 call/return 与 op1 对象覆盖。
 *  - 3156-3225(runPlayerPoisonEntrySync):全部旧测只注入 stub runner,真入口合同
 *    全组新增。
 *  - 3464-4600(applyRawOpcode):逐 opcode 对照后仅 0x5D/0x74/0x79/0x94/0x78 与
 *    0x20 装备槽补足臂未证(0x4B/0x52/0x62/0x63/0x4C 在旧测 B 类移动 describe 已证)。
 *
 * 公开 caller:runPlayerPoisonEntrySync / runScript / tickAutoScripts / tickEventSystem
 * (均 exported);世界侧 0x29 集成走 tickEventSystem trigger 游标(与旧测 loadEvent 同构)。
 */
import type { AbstractKey, Command, InputSnapshot } from '@type-pal/shared'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { makeBattle } from '../__tests__/coverage85-glm-game/harness.js'
import { createCommandBus } from './command-bus.js'
import {
  buildLabelMap,
  runPlayerPoisonEntrySync,
  runScript,
  tickAutoScripts,
  tickEventSystem,
} from './event-system.js'
import { createInitialGameState, type GameState } from './game-state.js'
import { setObjectPoisons } from './player-poison-state.js'
import { setGlobalEvents } from './script-catalog.js'

function snap(): InputSnapshot {
  return { held: new Set(), pressed: new Set<AbstractKey>(), frameNum: 0 }
}

/** battle runScript 公开入口:一段命令 + 尾随 plain end,返回停止 ip(跳转类 oracle)。 */
function runBattle(gs: GameState, commands: Command[], eventObjectId?: number): number {
  return runScript({
    commands,
    ip: 0,
    bus: createCommandBus(),
    runtimeMode: 'battle',
    battleCtx: { state: gs.battleState!, gs },
    eventObjectId,
  })
}

afterEach(() => {
  setGlobalEvents([])
  setObjectPoisons([])
  vi.restoreAllMocks()
})

// ── runPlayerPoisonEntrySync(event-system.ts:3156-3225,全部旧测只注入 stub)──────
describe('contracts runPlayerPoisonEntrySync 毒入口同步(3156-3225)', () => {
  it('入口解析(3163):L_<ip> 在全局 labelMap → 从标签 ip 起;缺 → 恒等 ip 起步', () => {
    setGlobalEvents([
      { op: 'raw', opcode: 0x1e, operands: [111, 0, 0], label: 'L_5' },
      { op: 'end' },
      { op: 'raw', opcode: 0x1e, operands: [222, 0, 0] },
      { op: 'end' },
    ])
    const hit = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const retHit = runPlayerPoisonEntrySync(hit, 0, 5) // L_5 → ip0 → +111
    expect(hit.dwCash).toBe(111)
    expect(retHit).toBe(0) // 尾随 plain end → 返回起始 entry
    const identity = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const retId = runPlayerPoisonEntrySync(identity, 0, 3) // 无 L_3 → 恒等 ip3(plain end)
    expect(identity.dwCash).toBe(0) // 不误跳到 ip0 的标记
    expect(retId).toBe(3)
  })

  it('raw 真执行 + end 三态返回(3180-3182):plain→startIp;advance→ip+1;reset+resetTo→标签 ip;resetTo 缺→startIp', () => {
    setGlobalEvents([
      { op: 'raw', opcode: 0x1e, operands: [50, 0, 0] },
      { op: 'end', advance: true },
      { op: 'raw', opcode: 0x1e, operands: [60, 0, 0] },
      { op: 'end', label: 'L_3' },
    ])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const ret = runPlayerPoisonEntrySync(gs, 0, 0) // +50 后 advance end → ip+1=2
    expect(gs.dwCash).toBe(50)
    expect(ret).toBe(2) // advance:show-once 下一条;ip2 的 60 不在本轮跑

    setGlobalEvents([
      { op: 'raw', opcode: 0x1e, operands: [50, 0, 0] },
      { op: 'end', reset: true, resetTo: 3 },
      { op: 'raw', opcode: 0x1e, operands: [60, 0, 0] },
      { op: 'end', label: 'L_3' },
    ])
    const gsReset = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(runPlayerPoisonEntrySync(gsReset, 0, 0)).toBe(3) // resetTo 解析 L_3 → ip3

    setGlobalEvents([
      { op: 'raw', opcode: 0x1e, operands: [50, 0, 0] },
      { op: 'end', reset: true, resetTo: 9 }, // L_9 不存在
      { op: 'end' },
    ])
    const gsMissing = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(runPlayerPoisonEntrySync(gsMissing, 0, 0)).toBe(0) // 缺 → 起始 entry
  })

  it('0x04 call 子脚本(3174-3179):子 end 弹帧回 caller,caller 后续 op 续跑到 plain end', () => {
    setGlobalEvents([
      { op: 'raw', opcode: 0x04, operands: [2, 0, 0] },
      { op: 'end' },
      { op: 'raw', opcode: 0x1e, operands: [33, 0, 0], label: 'L_2' },
      { op: 'end' },
    ])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    const ret = runPlayerPoisonEntrySync(gs, 0, 0)
    expect(gs.dwCash).toBe(33) // 子脚本标记已跑
    expect(ret).toBe(0) // 弹帧后 caller ip1 撞 plain end → 起始 entry
  })

  it('goto(3184-3188):目标在 → 跳过后续;目标缺 → 立即返回 startIp(不执行任何 op)', () => {
    setGlobalEvents([
      { op: 'goto', to: 'L_2' },
      { op: 'raw', opcode: 0x1e, operands: [50, 0, 0] },
      { op: 'raw', opcode: 0x1e, operands: [222, 0, 0], label: 'L_2' },
      { op: 'end' },
    ])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(runPlayerPoisonEntrySync(gs, 0, 0)).toBe(0)
    expect(gs.dwCash).toBe(222) // ip1 被跳过

    setGlobalEvents([
      { op: 'goto', to: 'L_99' },
      { op: 'raw', opcode: 0x1e, operands: [50, 0, 0] },
      { op: 'end' },
    ])
    const gsMissing = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(runPlayerPoisonEntrySync(gsMissing, 0, 0)).toBe(0)
    expect(gsMissing.dwCash).toBe(0) // 目标缺失 → 后续 op 不执行
  })

  it('阻塞 op(3205-3207):showDialog 不安全嵌套 → 直接返回 startIp,后续 raw 不执行', () => {
    setGlobalEvents([
      { op: 'end' },
      { op: 'end' },
      { op: 'showDialog', messageIndex: 1, text: '毒发', label: 'L_5' },
      { op: 'raw', opcode: 0x1e, operands: [50, 0, 0] },
      { op: 'end' },
    ])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    // 入口经 L_5 解析到 ip2(≠0):返回值精确等于起始 entry,而非常量
    expect(runPlayerPoisonEntrySync(gs, 0, 5)).toBe(2)
    expect(gs.dwCash).toBe(0)
    expect(gs.dialogBox).toBeUndefined() // 对话未开,留给下一次 tick 的原脚本
  })

  it('ip 越界(3169-3170):commands[ip] 不存在 → 返回 startIp', () => {
    setGlobalEvents([{ op: 'end' }])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    expect(runPlayerPoisonEntrySync(gs, 0, 5)).toBe(5) // 无 L_5 且 ip5 越界
  })

  it('角色目标链(3165):curEventObjectId=roleId — 入口内 0x29 单体施毒命中该 role', () => {
    setObjectPoisons([{ id: 6, level: 1, color: 0, playerScript: 0, enemyScript: 0 }])
    setGlobalEvents([{ op: 'raw', opcode: 0x29, operands: [0, 6, 0] }, { op: 'end' }])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0, 1]
    expect(runPlayerPoisonEntrySync(gs, 1, 0)).toBe(0)
    expect(gs.rgPoisonStatus['0_1']).toEqual({ wPoisonID: 6, wPoisonScript: 0 }) // role1 中毒
    expect(gs.rgPoisonStatus['0_0']?.wPoisonID ?? 0).toBe(0) // 其它 role 不误伤
  })

  it('世界侧集成:trigger raw 0x29(3488 注入真入口)→ 施毒当下同步跑入口,wPoisonScript=入口 advance 返回', () => {
    // 入口脚本装在全局表(playerScript=5 → L_5):+50 后 advance end → 下一轮 entry = 0+1
    setGlobalEvents([
      { op: 'raw', opcode: 0x1e, operands: [50, 0, 0], label: 'L_5' },
      { op: 'end', advance: true },
    ])
    setObjectPoisons([{ id: 6, level: 1, color: 0, playerScript: 5, enemyScript: 0 }])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.partyMembers = [0, 1]
    const commands: Command[] = [{ op: 'raw', opcode: 0x29, operands: [0, 6, 0] }, { op: 'end' }]
    gs.eventCursor = { commands, labelMap: buildLabelMap(commands), ip: 0, currentEventObjectId: 1 }
    gs.mode = 'event'
    tickEventSystem(gs, snap(), createCommandBus())
    expect(gs.dwCash).toBe(50) // 入口脚本在施毒当场同步执行(global.c:1515 真值)
    expect(gs.rgPoisonStatus['0_1']).toEqual({ wPoisonID: 6, wPoisonScript: 2 }) // advance end@ip1 → 下轮 entry = 1+1
    expect(gs.mode).toBe('explore') // trigger 跑完收尾
  })
})

// ── applyRawOpcode 未证 opcode(4288-4347,3729-3745,4583-4601)──────────────────
describe('contracts applyRawOpcode 条件跳转/装备消耗长尾(4288-4601)', () => {
  /** 现金标记判别:ip0 条件跳转 op → 跳则只 +222,不跳则 +111+222。 */
  const markerScript = (opcode: number, operands: [number, number, number]): Command[] => [
    { op: 'raw', opcode, operands },
    { op: 'raw', opcode: 0x1e, operands: [111, 0, 0] },
    { op: 'raw', opcode: 0x1e, operands: [222, 0, 0], label: 'L_2' },
    { op: 'end' },
  ]

  it('0x5D jumpIfNotPoisonKind(4295-4300):role 未中该种毒 → 跳 op1;已中 → 顺序推进', () => {
    const gs = makeBattle().gs
    gs.rgPoisonStatus['0_1'] = { wPoisonID: 7, wPoisonScript: 0 } // role1 已中毒 7
    runBattle(gs, markerScript(0x5d, [7, 2, 0]), 1) // currentEventObjectId=1 → role1
    expect(gs.dwCash).toBe(333) // 中该种毒 → 不跳
    const clean = makeBattle().gs
    runBattle(clean, markerScript(0x5d, [7, 2, 0]), 1)
    expect(clean.dwCash).toBe(222) // 未中 → 跳 L_2
  })

  it('0x74 jumpIfNotAllFullHp(4309-4316):任一队员 HP<MaxHP → 跳 op0;全满 → 顺序', () => {
    const wounded = makeBattle().gs
    wounded.partyMembers = [0, 1]
    wounded.PlayerRolesRuntime.rgwHP[0] = 100
    wounded.PlayerRolesRuntime.rgwMaxHP[0] = 100
    wounded.PlayerRolesRuntime.rgwHP[1] = 50 // role1 未满
    wounded.PlayerRolesRuntime.rgwMaxHP[1] = 100
    runBattle(wounded, markerScript(0x74, [2, 0, 0]))
    expect(wounded.dwCash).toBe(222) // 有人未满 → 跳
    const full = makeBattle().gs
    full.partyMembers = [0, 1]
    for (const r of [0, 1]) {
      full.PlayerRolesRuntime.rgwHP[r] = 100
      full.PlayerRolesRuntime.rgwMaxHP[r] = 100
    }
    runBattle(full, markerScript(0x74, [2, 0, 0]))
    expect(full.dwCash).toBe(333) // 全满 → 不跳
  })

  it('0x79 jumpIfPlayerInParty(4318-4323):队伍含 name==op0 的角色 → 跳 op1;不含 → 顺序', () => {
    const gs = makeBattle().gs
    gs.partyMembers = [0, 1]
    gs.PlayerRolesRuntime.rgwName[1] = 1234
    runBattle(gs, markerScript(0x79, [1234, 2, 0]))
    expect(gs.dwCash).toBe(222) // name 1234 在队 → 跳
    const absent = makeBattle().gs
    absent.partyMembers = [0, 1]
    absent.PlayerRolesRuntime.rgwName[1] = 1234
    runBattle(absent, markerScript(0x79, [4321, 2, 0]))
    expect(absent.dwCash).toBe(333) // 不在 → 顺序
  })

  it('0x94 jumpIfObjState(4341-4347):pCurrent.sState==(SHORT)op1 → 跳 op2;不等 → 顺序', () => {
    const match = makeBattle().gs
    match.npcs = [{ id: 0, x: 0, y: 0, spriteNum: 1, sState: 2 }]
    runBattle(match, markerScript(0x94, [1, 2, 2])) // op0=1 → npc id0;sState 2==2
    expect(match.dwCash).toBe(222)
    const differ = makeBattle().gs
    differ.npcs = [{ id: 0, x: 0, y: 0, spriteNum: 1, sState: 2 }]
    runBattle(differ, markerScript(0x94, [1, 3, 2])) // 2≠3
    expect(differ.dwCash).toBe(333)
  })

  it('0x20 removeItem 装备槽补足臂(3729-3745):库存不足 + 无失败分支 → 清装备槽并撤该部位效果层', () => {
    const gs = makeBattle().gs
    gs.partyMembers = [0, 1]
    gs.inventory = [] // 库存 0 < 需求 1,op2=0 无失败分支 → 走装备槽补足
    const equipRow = gs.PlayerRolesRuntime.rgwEquipment[2]
    if (equipRow) equipRow[1] = 42 // role1 slot2 装备 42
    const effRow = gs.rgEquipmentEffect[2]?.rgwAttackStrength
    if (effRow) effRow[1] = 7 // 该部位效果层加成
    runBattle(gs, [{ op: 'raw', opcode: 0x20, operands: [42, 1, 0] }, { op: 'end' }])
    expect(gs.PlayerRolesRuntime.rgwEquipment[2]?.[1]).toBe(0) // 槽清(global.c 真值)
    expect(gs.rgEquipmentEffect[2]?.rgwAttackStrength[1]).toBe(0) // 效果层撤(PAL_RemoveEquipmentEffect)
    expect(gs.inventory).toEqual([]) // 不经库存
  })

  it('0x78 FIXME no-op(4583-4585)与 default 未实现 opcode 诊断 skip(4595-4601):零状态变化、脚本续跑', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const gs = makeBattle().gs
    const ret = runBattle(gs, [
      { op: 'raw', opcode: 0x78, operands: [0, 0, 0] },
      { op: 'raw', opcode: 0xb9, operands: [1, 2, 3] }, // 未实现 opcode → D26 兜底
      { op: 'raw', opcode: 0x1e, operands: [50, 0, 0] },
      { op: 'end' },
    ])
    expect(gs.dwCash).toBe(50) // 两个 skip 都不挡后续 op
    expect(ret).toBe(0)
    expect(gs.shakeTime ?? 0).toBe(0) // 未误写任何可见状态
    expect(debug).toHaveBeenCalledTimes(1) // 只有未实现 opcode 诊断一次
    expect(debug).toHaveBeenCalledWith('event-system: skip raw opcode=0x00b9', [1, 2, 3])
  })
})

// ── runScript 防御分支(2968-3001,3027-3146)──────────────────────────────────
describe('contracts runScript 防御与结构化分支(2968-3146)', () => {
  it('goto label 缺失(2968-2972)→ throw runScript: goto label 不在 labelMap', () => {
    const gs = makeBattle().gs
    expect(() => runBattle(gs, [{ op: 'goto', to: 'L_40' }, { op: 'end' }])).toThrow(
      'runScript: goto label L_40 不在 labelMap',
    )
  })

  it('showDialog in explore mode(2997-3001)→ throw 应走 tickEventSystem', () => {
    const gs = makeBattle().gs
    expect(() =>
      runScript({
        commands: [{ op: 'showDialog', messageIndex: 1, text: 'x' }, { op: 'end' }],
        ip: 0,
        bus: createCommandBus(),
        runtimeMode: 'explore',
      }),
    ).toThrow('runScript: showDialog in explore mode 应走 tickEventSystem')
    expect(gs.dwCash).toBe(0) // throw 前零副作用
  })

  it('结构化 op sequence/if/choice(3143-3146)→ throw M3 未实现', () => {
    const gs = makeBattle().gs
    expect(() => runBattle(gs, [{ op: 'sequence', steps: [] }])).toThrow(
      'runScript: 结构化 op sequence M3 未实现',
    )
    expect(() => runBattle(gs, [{ op: 'if', cond: { op: 'end' }, then: [] }])).toThrow(
      'runScript: 结构化 op if M3 未实现',
    )
    expect(() => runBattle(gs, [{ op: 'choice', prompt: '选', options: [] }])).toThrow(
      'runScript: 结构化 op choice M3 未实现',
    )
  })

  it('startBattle/loadScene/setPalette 诊断 skip(3126-3141):零状态变化、ip 推进续跑', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {})
    const gs = makeBattle().gs
    const sceneBefore = gs.wNumScene
    const paletteBefore = gs.palette
    const battleBefore = gs.battleState
    const ret = runBattle(gs, [
      { op: 'startBattle', enemyTeamId: 3 },
      { op: 'loadScene', sceneId: 5 },
      { op: 'setPalette', paletteIndex: 7 },
      { op: 'raw', opcode: 0x1e, operands: [50, 0, 0] },
      { op: 'end' },
    ])
    expect(gs.dwCash).toBe(50) // 三个 skip 后续跑标记
    expect(ret).toBe(0)
    expect(gs.wNumScene).toBe(sceneBefore) // 不切场景
    expect(gs.palette).toBe(paletteBefore) // 不换调色板
    expect(gs.battleState).toBe(battleBefore) // 不起战斗
    expect(debug).toHaveBeenCalledTimes(2) // loadScene + setPalette 各诊断一次,startBattle 静默
    expect(debug).toHaveBeenNthCalledWith(
      1,
      '[event-system battle] skip loadScene sceneId=5 ip=1(B 路线 stub)',
    )
    expect(debug).toHaveBeenNthCalledWith(
      2,
      '[event-system battle] skip setPalette paletteIndex=7 ip=2',
    )
  })

  it('explore 防御 no-op(3027-3029,3120-3122):setDialogStyle*/giveItem 零副作用续跑', () => {
    const gs = makeBattle().gs
    const styleBefore = gs.currentDialogStyle
    const ret = runScript({
      commands: [
        { op: 'setDialogStyleTop' },
        { op: 'giveItem', itemId: 5, count: 1 },
        { op: 'end' },
      ],
      ip: 0,
      bus: createCommandBus(),
      runtimeMode: 'explore',
    })
    expect(ret).toBe(0)
    expect(gs.inventory).toEqual([]) // explore 不经 runScript 给物品
    expect(gs.currentDialogStyle).toBe(styleBefore)
    expect(gs.dialogBox).toBeUndefined()
  })
})

// ── battle runScript 0x04 call/return(3081-3103 经 applyRawOpcode 4414-4438)────
describe('contracts runScript battle 0x04 call/return(2952-2957,4414-4438)', () => {
  it('raw 0x04 call:子脚本同步跑完弹帧回 caller;返回值 = caller 侧 plain end', () => {
    const gs = makeBattle().gs
    const ret = runBattle(gs, [
      { op: 'raw', opcode: 0x04, operands: [3, 0, 0] },
      { op: 'raw', opcode: 0x1e, operands: [77, 0, 0] },
      { op: 'end' },
      { op: 'raw', opcode: 0x1e, operands: [33, 0, 0], label: 'L_3' },
      { op: 'end' },
    ])
    expect(gs.dwCash).toBe(110) // 子脚本 +33 → 弹帧 → caller +77(顺序可判别)
    expect(ret).toBe(0) // caller plain end → 起始 entry
  })

  it('0x04 op1 覆盖(4436):curEventObjId = op1-1 持久到子脚本 raw(0x5D 按 role=4 判毒)', () => {
    // 0x29 会被 battle dispatch 拦截(0x61 同),0x5D 不在 battle case 表 → 落 applyRawOpcode,
    // 其 role 取 currentEventObjectId → 是 op1 覆盖是否生效的精确观察点。
    const gs = makeBattle().gs
    gs.rgPoisonStatus['0_4'] = { wPoisonID: 7, wPoisonScript: 0 } // role4 已中毒 7
    const ret = runBattle(
      gs,
      [
        { op: 'raw', opcode: 0x04, operands: [3, 5, 0] }, // op1=5 → 子脚本 curEventObjId=4
        { op: 'end' }, // 弹帧后 caller end
        { op: 'end' }, // 占位(ip2,不被执行)
        { op: 'raw', opcode: 0x5d, operands: [7, 5, 0], label: 'L_3' }, // role4 中毒7 → 不跳
        { op: 'raw', opcode: 0x1e, operands: [111, 0, 0] },
        { op: 'raw', opcode: 0x1e, operands: [222, 0, 0] },
        { op: 'end' },
      ],
      1, // caller 侧 curEventObjId=1(若覆盖失效,role1 无毒 → 跳 ip5 只 +222)
    )
    expect(ret).toBe(0)
    expect(gs.dwCash).toBe(333) // 覆盖生效:role4 判毒不跳,111+222 全跑
  })
})

// ── autoScript 0x04 多帧 callee(1391-1413,DL15 只证 instant callee)──────────
describe('contracts autoScript 0x04 call 多帧 callee(1391-1413)', () => {
  it('callee 内 0x09 wait 退化逐帧推进,callStack 弹帧后 caller 续跑(不挂死)', () => {
    setGlobalEvents([
      { op: 'raw', opcode: 0x04, operands: [3, 0, 0], label: 'L_0' },
      { op: 'raw', opcode: 0x1e, operands: [90, 0, 0] },
      { op: 'end' },
      { op: 'raw', opcode: 0x09, operands: [2, 0, 0], label: 'L_3' }, // callee:wait 2 帧
      { op: 'end' },
    ])
    const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
    gs.npcs = [{ id: 0, x: 0, y: 0, spriteNum: 1, sState: 1, autoCursor: { ip: 0 } }]

    tickAutoScripts(gs) // t1:压栈进 callee,wait 第 1 拍未满 → 卡住防御 break
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(3)
    expect(gs.npcs[0]?.autoCursor?.callStack?.length).toBe(1)
    expect(gs.dwCash).toBe(0)

    tickAutoScripts(gs) // t2:wait 第 2 拍满 → ip 推进
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(4)
    expect(gs.dwCash).toBe(0)

    tickAutoScripts(gs) // t3:callee end → 弹帧回 caller ip1
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(1)
    expect(gs.npcs[0]?.autoCursor?.callStack?.length).toBe(0)

    tickAutoScripts(gs) // t4:caller 标记
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(2)
    expect(gs.dwCash).toBe(90)

    tickAutoScripts(gs) // t5:caller plain end → park
    expect(gs.npcs[0]?.autoCursor?.ip).toBe(2)
    expect(gs.dwCash).toBe(90)
  })
})
