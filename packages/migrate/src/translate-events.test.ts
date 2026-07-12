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
  test('→ 通用 ditherScreen，speed=2 精确换算为 2160ms', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x73, operands: [2, 0, 0] }]))
    expect(body).toEqual([{ kind: 'ditherScreen', ms: 2160 }])
  })
})

describe('0x49 setObjectState operand0=0', () => {
  test('不产 e-1 实体命令，但保留两侧对话批次边界', () => {
    const body = bodyOf(
      ctxOf([
        { op: 'showDialog', messageIndex: 10, text: '前页' } as unknown as SourceCmd,
        { opcode: 0x49, operands: [0, 2, 0] },
        { op: 'showDialog', messageIndex: 11, text: '后页' } as unknown as SourceCmd,
      ]),
    )
    expect(body.filter((c) => c.kind === 'dialog')).toHaveLength(2)
    expect(body.some((c) => c.kind === 'setEntityState')).toBe(false)
    expect(JSON.stringify(body)).not.toContain('e-1')
  })
})

describe('0x50/0x51 fade delay 保真', () => {
  test.each([
    [0x50, 0, 'out', 600],
    [0x50, 3, 'out', 1800],
    [0x50, 0xffff, 'out', 0xffff * 600],
    [0x51, 0, 'in', 600],
    [0x51, 3, 'in', 1800],
    [0x51, 0xffff, 'in', 600],
  ] as const)('opcode %# operand=%d → %s %dms', (opcode, operand, dir, ms) => {
    expect(bodyOf(ctxOf([{ opcode, operands: [operand, 0, 0] }]))).toEqual([
      { kind: 'fade', dir, ms },
    ])
  })
})

describe('对话 speaker 在同一 walkBody/slot 内继承', () => {
  test('跨 raw 0x05 flush 仍继承', () => {
    const body = bodyOf(
      ctxOf([
        { op: 'showDialog', messageIndex: 20, text: '李逍遥：' } as unknown as SourceCmd,
        { op: 'showDialog', messageIndex: 21, text: '第一句' } as unknown as SourceCmd,
        { opcode: 0x05, operands: [0, 0, 0] },
        { op: 'showDialog', messageIndex: 22, text: '第二句' } as unknown as SourceCmd,
      ]),
    )
    const lines = body.flatMap((c) => (c.kind === 'dialog' ? [c.line] : []))
    expect(lines.map((line) => line.speaker)).toEqual(['spk.李逍遥', 'spk.李逍遥'])
  })

  test('换 slot 清空；新姓名牌会替换旧姓名', () => {
    const body = bodyOf(
      ctxOf([
        { op: 'showDialog', messageIndex: 30, text: '李逍遥：' } as unknown as SourceCmd,
        { op: 'showDialog', messageIndex: 31, text: '旧姓名' } as unknown as SourceCmd,
        { op: 'showDialog', messageIndex: 32, text: '李大娘：' } as unknown as SourceCmd,
        { op: 'showDialog', messageIndex: 33, text: '新姓名' } as unknown as SourceCmd,
        { op: 'setDialogStyleTop', arg0: 55 } as unknown as SourceCmd,
        { op: 'showDialog', messageIndex: 34, text: '换槽后无姓名' } as unknown as SourceCmd,
      ]),
    )
    const lines = body.flatMap((c) => (c.kind === 'dialog' ? [c.line] : []))
    expect(lines.map((line) => line.speaker)).toEqual([
      'spk.李逍遥',
      'spk.李大娘',
      undefined,
    ])
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

describe('0x9A 批量设实体状态(→ setMultiEntityState)', () => {
  test('区间 [5,7] → e4/e5/e6,state=op2', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x9a, operands: [5, 7, 2] }]))
    expect(body).toEqual([{ kind: 'setMultiEntityState', entities: ['e4', 'e5', 'e6'], state: 2 }])
  })
  test('单点区间 [10,10] → e9', () => {
    const body = bodyOf(ctxOf([{ opcode: 0x9a, operands: [10, 10, 0] }]))
    expect(body).toEqual([{ kind: 'setMultiEntityState', entities: ['e9'], state: 0 }])
  })
})
