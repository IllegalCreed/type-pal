/**
 * 开场三 op 翻译回归(2026-07-03 用户实测:李逍遥动作没出来/李大娘没走出场景)。
 * 真值锚:sdlpal script.c 0x0015(dir+gesture)/ 0x0065(setPlayerSprite)/ 0x0073(fadeToScene)。
 */
import type { Command, SceneDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { SourceCmd } from './source-facts.js'
import type { TranslateCtx } from './translate-events.js'
import {
  asBattleCfg,
  battleCfgMarker,
  emptyTranslateReport,
  foldBattleConfig,
  translateStages,
} from './translate-events.js'
import { finalizeBattleConfig } from './migrate-content.js'

/** 手搓链 → labelAt(单段,L_1 起步,end 收尾;raw 命令补 op:'raw' 判别)。 */
function ctxOf(cmds: SourceCmd[], spriteIdForNum?: (num: number) => string): TranslateCtx {
  const raws = cmds.map((c) => ({ op: 'raw', ...c }))
  const chain: SourceCmd[] = [{ ...raws[0]!, label: 'L_1' }, ...raws.slice(1), { op: 'end' }]
  const labelAt = new Map<string, { cmds: readonly SourceCmd[]; idx: number }>()
  chain.forEach((c, i) => {
    if (c.label) labelAt.set(c.label, { cmds: chain, idx: i })
  })
  return {
    labelAt,
    locale: {},
    report: emptyTranslateReport(),
    ...(spriteIdForNum ? { spriteIdForNum } : {}),
  }
}

function bodyOf(ctx: TranslateCtx): Command[] {
  const stages = translateStages('L_1', 'e0', ctx)
  expect(stages?.length).toBeGreaterThan(0)
  return stages![0]!.body
}

describe('0x15 队员方向+姿势(script.c: wFrame = dir*3 + gesture)', () => {
  test('gesture>0 → setPartyFacing 带 gesture(开场练武 [0,9,0])', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x15, operands: [0, 9, 0] }]))
    expect(body).toEqual([{ kind: 'setPartyFacing', facing: 'down', gesture: 9 }])
  })
  test('gesture=0 → 纯朝向(站立帧;不带 gesture 字段 = 运行时清姿势)', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x15, operands: [3, 0, 0] }]))
    expect(body).toEqual([{ kind: 'setPartyFacing', facing: 'right' }])
  })
  test('member>0 → 带 member(跟随者姿势;渲染落地前先保数据)', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x15, operands: [1, 2, 1] }]))
    expect(body).toEqual([{ kind: 'setPartyFacing', facing: 'left', gesture: 2, member: 1 }])
  })
})

describe('0x65 换角色大世界精灵(script.c: rgwSpriteNum[role]=sprite)', () => {
  test('role 0 + 精灵 627 → setActorSprite(li-xiaoyao, 由注册回调定 id)', () => {
    const ids: Record<number, string> = { 627: 'npc-627', 2: 'li-xiaoyao' }
    const body = bodyOf(
      ctxOf([{ opcode: 0x65, operands: [0, 627, 0xffff] }], (n) => ids[n] ?? `npc-${n}`),
    )
    expect(body).toEqual([{ kind: 'setActorSprite', actor: 'li-xiaoyao', sprite: 'npc-627' }])
  })
  test('切回本体精灵 2 → 映射到 actor 自己的精灵 id', () => {
    const ids: Record<number, string> = { 2: 'li-xiaoyao' }
    const body = bodyOf(
      ctxOf([{ opcode: 0x65, operands: [0, 2, 0xffff] }], (n) => ids[n] ?? `npc-${n}`),
    )
    expect(body).toEqual([{ kind: 'setActorSprite', actor: 'li-xiaoyao', sprite: 'li-xiaoyao' }])
  })
  test('无注册回调 → unmigrated(不猜 id)', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x65, operands: [0, 627, 0xffff] }]))
    expect(body[0]!.kind).toBe('unmigrated')
  })
})

describe('0x73 淡入场景(script.c: PAL_MakeScene + VIDEO_FadeScreen)', () => {
  test('→ fade in(时长 = operand[0] 换算,非零)', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x73, operands: [2, 0, 0] }]))
    expect(body).toHaveLength(1)
    const f = body[0]! as Extract<Command, { kind: 'fade' }>
    expect(f.kind).toBe('fade')
    expect(f.dir).toBe('in')
    expect(f.ms).toBeGreaterThan(0)
  })
})

describe('0x06 概率跳转:跳走臂尾必带 stopScript(命中不落穿;script.c:3299 跳0=END 退)', () => {
  test('op1=0(跳 0 号 END) → then 臂 = [stopScript](曾译空臂 → 概率门全废)', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x06, operands: [22, 0, 0] }]))
    expect(body[0]).toEqual({
      kind: 'branch',
      cond: { kind: 'chance', percent: 79 },
      then: [{ kind: 'stopScript' }],
    })
  })
  test('op1=真目标 → 臂 = 内联命令 + 尾 stopScript', () => {
    // 链:L_1 = 0x06 跳 L_9;直走 giveItem;L_9 = showDialog + end
    const raws: SourceCmd[] = [
      { op: 'raw', opcode: 0x06, operands: [22, 9, 0], label: 'L_1' } as unknown as SourceCmd,
      { op: 'giveItem', itemId: 5, count: 0 } as unknown as SourceCmd,
      { op: 'end' } as unknown as SourceCmd,
      { op: 'showDialog', messageIndex: 42, text: '臂内对白', label: 'L_9' } as unknown as SourceCmd,
      { op: 'end' } as unknown as SourceCmd,
    ]
    const labelAt = new Map<string, { cmds: readonly SourceCmd[]; idx: number }>()
    raws.forEach((c, i) => {
      if ((c as { label?: string }).label) labelAt.set((c as { label: string }).label, { cmds: raws, idx: i })
    })
    const ctx: TranslateCtx = { labelAt, locale: {}, report: emptyTranslateReport() }
    const stages = translateStages('L_1', 'e0', ctx)
    const body = stages![0]!.body
    const br = body[0] as Extract<Command, { kind: 'branch' }>
    expect(br.kind).toBe('branch')
    expect(br.then.at(-1)).toEqual({ kind: 'stopScript' }) // 臂尾终止
    expect(br.then.some((c) => c.kind === 'dialog')).toBe(true) // 臂体内联了目标对白
    expect(body.some((c) => c.kind === 'giveItem')).toBe(true) // 直走路径仍在父体
  })
})

describe('giveItem-0 数据 bug 烘焙(扬州宝物屋;键=前句 MSG 下标,一阶段 patchGiveItemZeroBugs 同表)', () => {
  test('「获得紫青玉蓉膏」(msg 12347) 后 giveItem 0 → 翻译期补真 id 103', () => {
    const body = bodyOf(
      ctxOf([
        { op: 'showDialog', messageIndex: 12347, text: '获得紫青玉蓉膏' } as unknown as SourceCmd,
        { op: 'giveItem', itemId: 0, count: 0 } as unknown as SourceCmd,
      ]),
    )
    expect(body.find((c) => c.kind === 'giveItem')).toEqual({ kind: 'giveItem', itemId: '103' })
  })
  test('修正表外的 giveItem 0 原样直译(只修台账 3 处,不越权)', () => {
    const body = bodyOf(
      ctxOf([
        { op: 'showDialog', messageIndex: 999, text: '无关' } as unknown as SourceCmd,
        { op: 'giveItem', itemId: 0, count: 0 } as unknown as SourceCmd,
      ]),
    )
    expect(body.find((c) => c.kind === 'giveItem')).toEqual({ kind: 'giveItem', itemId: '0' })
  })
})

describe('战斗配置(铁律4:0x4A/0x45 持久全局退役 —— 无 override 命令、无持久态)', () => {
  test('foldBattleConfig:成对合并 + 邻战(≤3,隔轻量演出)fold 进 startBattle 一次性参数', () => {
    const body: Command[] = [
      battleCfgMarker({ musicId: 44 }),
      battleCfgMarker({ fieldId: 22 }),
      { kind: 'setEntityFacing', entity: 'e1', facing: 'down' },
      { kind: 'startBattle', team: 27 },
    ]
    const out = foldBattleConfig(body)
    expect(out).toEqual([
      { kind: 'setEntityFacing', entity: 'e1', facing: 'down' },
      { kind: 'startBattle', team: 27, fieldId: 22, musicId: 44 },
    ])
  })

  test('foldBattleConfig:远离战斗/被重命令阻断 → 保留标记(后续 bake 成场景默认)', () => {
    const body: Command[] = [
      battleCfgMarker({ fieldId: 53 }),
      battleCfgMarker({ musicId: 39 }),
      { kind: 'playMusic', musicId: 30 },
      { kind: 'dialog', line: { text: 'x' } },
      { kind: 'startBattle', team: 1 },
    ]
    const out = foldBattleConfig(body)
    expect(asBattleCfg(out[0]!)).toEqual({ kind: 'overrideSceneBattle', fieldId: 53, musicId: 39 })
    expect(out.some((c) => c.kind === 'startBattle' && c.fieldId === undefined)).toBe(true)
  })

  test('finalizeBattleConfig:标记 bake 成 SceneDef 默认(last-wins)+ 从脚本 strip 干净', () => {
    const scene = {
      id: 's',
      map: { reuseOriginalMap: 1 },
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' as const },
      entities: [],
      dialogues: [],
      onEnter: [
        {
          body: [
            { kind: 'playMusic', musicId: 31 },
            battleCfgMarker({ fieldId: 24 }),
            battleCfgMarker({ musicId: 37 }),
            battleCfgMarker({ musicId: 39 }), // 后设的赢 → 39(赤鬼王类打完设回区域曲)
          ],
        },
      ],
    } as unknown as SceneDef
    const r = finalizeBattleConfig(scene)
    expect(r.battleFieldId).toBe(24)
    expect(r.battleMusicId).toBe(39)
    expect(r.onEnter?.[0]?.body).toEqual([{ kind: 'playMusic', musicId: 31 }])
  })
})

describe('0x6D 改场景进场剧情(占位 → 具名 setSceneStage)', () => {
  test('op0=场景号(1-based)op1=地址 → 占位命令(stage=-1 + _addr,post-pass 回填)', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x6d, operands: [21, 2920, 0] }]))
    expect(body).toEqual([{ kind: 'setSceneStage', scene: 's020', stage: -1, _addr: 2920 }])
  })
  test('op1=0(只改 teleport,全游戏 1 站点)→ 保留 unmigrated', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x6d, operands: [21, 0, 777] }]))
    expect(body[0]?.kind).toBe('unmigrated')
  })
})

describe('0x1A 改角色形象(SoA 字段 → setActorAppearance)', () => {
  const spriteIdForNum = (n: number) => `npc-${n}`
  const body1a = (ops: number[]) =>
    bodyOf(ctxOf([{ opcode: 0x1a, operands: ops }], spriteIdForNum))
  test('字段0=头像 → portrait(灵儿 role1)', () => {
    expect(body1a([0, 88, 2])).toEqual([{ kind: 'setActorAppearance', actor: 'zhao-linger', portrait: 88 }])
  })
  test('字段1=战斗精灵 → battleSprite', () => {
    expect(body1a([1, 9, 2])).toEqual([{ kind: 'setActorAppearance', actor: 'zhao-linger', battleSprite: 9 }])
  })
  test('字段2=大世界精灵 → spriteId(经 spriteIdForNum)', () => {
    expect(body1a([2, 38, 2])).toEqual([{ kind: 'setActorAppearance', actor: 'zhao-linger', spriteId: 'npc-38' }])
  })
  test('字段64=走路帧 → 丢弃(新精灵 layout 自带)', () => {
    const stages = translateStages('L_1', 'e0', ctxOf([{ opcode: 0x1a, operands: [64, 4, 2] }], spriteIdForNum))
    expect(stages?.[0]?.body ?? []).toEqual([])
  })
  test('未知字段 → 保留 unmigrated', () => {
    expect(body1a([7, 100, 2])[0]?.kind).toBe('unmigrated')
  })
})

describe('0x90 剧情侧清敌种回合演出(→ clearEnemyChoreo)', () => {
  test('清 turnStart(slot0 清0)→ clearEnemyChoreo(六脚蜘蛛 object 435)', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x90, operands: [435, 0, 0] }]))
    expect(body).toEqual([{ kind: 'clearEnemyChoreo', enemy: 'enemy-435' }])
  })
  test('非清(val≠0)/非 turnStart(slot≠0)→ 保留 unmigrated', () => {
    expect(bodyOf(ctxOf([{ opcode: 0x90, operands: [435, 999, 0] }]))[0]?.kind).toBe('unmigrated')
    expect(bodyOf(ctxOf([{ opcode: 0x90, operands: [435, 0, 1] }]))[0]?.kind).toBe('unmigrated')
  })
})
