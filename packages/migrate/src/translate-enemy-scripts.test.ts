import { checkEnemyHookFlow } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { SourceCmd } from './source-facts.js'
import { translateEnemyScripts } from './translate-enemy-scripts.js'
import { emptyTranslateReport, type TranslateCtx } from './translate-events.js'

interface TestCmd extends SourceCmd {
  advance?: boolean
  reset?: boolean
  resetTo?: number
  to?: string
  frameDelay?: number
  messageIndex?: number
}

const raw = (opcode: number, ...operands: number[]): SourceCmd => ({ op: 'raw', opcode, operands })
const end = (options: Pick<TestCmd, 'advance' | 'reset' | 'resetTo'> = {}): SourceCmd => ({
  op: 'end',
  ...options,
})
const goto = (address: number): SourceCmd =>
  ({
    op: 'goto',
    to: `L_${address}`,
    frameDelay: 0,
  }) as TestCmd
const dialog = (text: string, messageIndex: number): SourceCmd =>
  ({ op: 'showDialog', text, messageIndex }) as TestCmd

/** 手搓链集 → ctx；每个入口用自己的连续源地址空间。 */
function ctxOf(chains: Record<number, SourceCmd[]>): TranslateCtx {
  const labelAt = new Map<string, { cmds: readonly SourceCmd[]; idx: number }>()
  const sourceAddresses = new Map<readonly SourceCmd[], number[]>()
  for (const [rawAddress, source] of Object.entries(chains)) {
    const address = Number(rawAddress)
    const commands = source.map((command, index) =>
      index === 0 ? { ...command, label: `L_${address}` } : command,
    )
    sourceAddresses.set(
      commands,
      commands.map((_, index) => address + index),
    )
    commands.forEach((command, index) => {
      labelAt.set(`L_${address + index}`, { cmds: commands, idx: index })
      if (command.label) labelAt.set(command.label, { cmds: commands, idx: index })
    })
  }
  return {
    labelAt,
    sourceAddressAt: (commands, index) => sourceAddresses.get(commands)?.[index],
    locale: {},
    report: emptyTranslateReport(),
  }
}

const owner = { id: 'enemy-test', name: '测试敌人' }

describe('PAL 敌钩 CFG → persistent EnemyHookFlow', () => {
  test('plain / advance / reset END 分别保持、提交下一状态、重启 initial', () => {
    const plain = translateEnemyScripts(ctxOf({ 10: [end()] }), { ready: 10 }, undefined, owner)
    expect(plain.hooks?.ready?.states.initial?.next).toEqual({ kind: 'stay' })

    const translated = translateEnemyScripts(
      ctxOf({
        20: [
          raw(0x67, 312, 10),
          end({ advance: true }),
          raw(0x67, 0xffff, 10),
          end({ reset: true, resetTo: 20 }),
        ],
      }),
      { ready: 20 },
      undefined,
      owner,
    )
    const flow = translated.hooks?.ready
    expect(flow).toBeDefined()
    checkEnemyHookFlow(flow, 'test.ready')
    expect(flow?.states.initial).toMatchObject({
      body: [
        {
          kind: 'setFallback',
          fallback: { action: { kind: 'cast', skillId: '312' }, chancePercent: 100 },
        },
      ],
      next: { kind: 'advance' },
    })
    const advanced = Object.values(flow?.states ?? {}).find((state) =>
      state.body.some(
        (command) => command.kind === 'setFallback' && command.fallback?.action.kind === 'pass',
      ),
    )
    expect(advanced?.next).toEqual({ kind: 'restart' })
  })

  test.each([
    [1, 0],
    [100, 99],
    [101, 100],
  ])('0x06 rate=%i → 直走 chance=%i，边界不常量折叠', (rate, expected) => {
    const translated = translateEnemyScripts(
      ctxOf({ 100: [raw(0x06, rate, 0), end()] }),
      { turnStart: 100 },
      undefined,
      owner,
    )
    expect(translated.hooks?.turnStart?.states.initial?.next).toEqual({
      kind: 'branch',
      cond: { kind: 'chance', percent: expected },
      then: { kind: 'continue', state: expect.any(String) },
      else: { kind: 'stay' },
    })
  })

  test('0x79 保留队伍条件的两个真实分支；0x91 使用 operand0 作为非首跳转目标', () => {
    const party = translateEnemyScripts(
      ctxOf({
        200: [raw(0x79, 41, 300), dialog('无盖罗娇', 1), end()],
        300: [dialog('有盖罗娇', 2), end()],
      }),
      { turnStart: 200 },
      undefined,
      owner,
    ).hooks?.turnStart
    expect(party?.states.initial?.next).toMatchObject({
      kind: 'branch',
      cond: { kind: 'playerInParty', role: 'gai-luojiao' },
      then: { kind: 'continue' },
      else: { kind: 'continue' },
    })
    expect(
      Object.values(party?.states ?? {}).map((state) =>
        state.body
          .filter((command) => command.kind === 'dialog')
          .map((command) => command.cue.rows[0]?.text),
      ),
    ).toEqual(expect.arrayContaining([['dlg.1'], ['dlg.2']]))

    const first = translateEnemyScripts(
      ctxOf({
        400: [raw(0x91, 500), dialog('首只', 3), end()],
        500: [dialog('非首', 4), end()],
      }),
      { turnStart: 400 },
      undefined,
      owner,
    ).hooks?.turnStart
    expect(first?.states.initial?.next).toMatchObject({
      kind: 'branch',
      cond: { kind: 'firstOfKind' },
      then: { kind: 'continue' },
      else: { kind: 'continue' },
    })
  })

  test('0xA2 生成一次 random 抽样；每个臂经 goto 进入自己的源块', () => {
    const flow = translateEnemyScripts(
      ctxOf({
        600: [raw(0xa2, 4), goto(700), goto(710), goto(720), goto(730)],
        700: [raw(0x67, 301, 10), end()],
        710: [raw(0x67, 302, 10), end()],
        720: [raw(0x67, 303, 10), end()],
        730: [raw(0x67, 304, 10), end()],
      }),
      { ready: 600 },
      undefined,
      owner,
    ).hooks?.ready
    const random = flow?.states.initial?.next
    expect(random).toMatchObject({
      kind: 'random',
      choices: Array.from({ length: 4 }, () => ({
        weight: 1,
        then: { kind: 'continue', state: expect.any(String) },
      })),
    })
    expect(
      Object.values(flow?.states ?? {})
        .flatMap((state) => state.body)
        .filter((command) => command.kind === 'setFallback')
        .map((command) => command.fallback?.action)
        .filter(Boolean),
    ).toEqual(
      expect.arrayContaining(
        [301, 302, 303, 304].map((skill) => ({ kind: 'cast', skillId: String(skill) })),
      ),
    )
  })

  test('summon/divide 的失败地址绑定真实 commandOutcome，不吞正常成功臂', () => {
    const flow = translateEnemyScripts(
      ctxOf({
        800: [raw(0x9e, 441, 2, 900), raw(0x67, 0xffff, 10), end()],
        900: [raw(0x67, 312, 10), end()],
      }),
      { ready: 800 },
      undefined,
      owner,
    ).hooks?.ready
    expect(flow?.states.initial).toMatchObject({
      body: [
        {
          kind: 'effect',
          id: 'effect-800',
          effect: { kind: 'summon', enemyId: 'enemy-441', count: 2 },
        },
      ],
      next: {
        kind: 'commandOutcome',
        commandId: 'effect-800',
        outcome: 'succeeded',
        then: { kind: 'continue' },
        else: { kind: 'continue' },
      },
    })
  })

  test('enemy table 初始 magic/rate 迁为 fallback，不生成伪 turn rule', () => {
    const translated = translateEnemyScripts(ctxOf({}), {}, { magic: 359, rate: 7 }, owner)
    expect(translated.rules).toEqual([])
    expect(translated.fallback).toEqual({
      action: { kind: 'cast', skillId: '359' },
      chancePercent: 70,
    })
  })

  test('未知可达 opcode 直接阻止生成并带 owner/channel/source address', () => {
    expect(() =>
      translateEnemyScripts(
        ctxOf({ 950: [raw(0xff, 1), end()] }),
        { ready: 950 },
        undefined,
        owner,
      ),
    ).toThrow(/enemy-test.*测试敌人.*ready L_950.*0xff/)
  })
})

describe('battleEnd → strict canonical onDefeated', () => {
  test('单 stage 合法子集通过', () => {
    const translated = translateEnemyScripts(
      ctxOf({
        1_000: [
          { op: 'giveItem', itemId: 42, count: 1 } as unknown as SourceCmd,
          dialog('得到宝贝', 10),
          end(),
        ],
      }),
      { battleEnd: 1_000 },
      undefined,
      owner,
    )
    expect(translated.onDefeated?.map((command) => command.kind)).toEqual(['giveItem', 'dialog'])
    expect(translated.battleEndSource).toEqual({
      rootAddress: 1_000,
      reachableSourceAddresses: [1_000, 1_001, 1_002],
    })
  })

  test('多 stage 在读取 body 前 fail-loud', () => {
    expect(() =>
      translateEnemyScripts(
        ctxOf({
          1_100: [dialog('第一段', 11), end({ advance: true }), dialog('第二段', 12), end()],
        }),
        { battleEnd: 1_100 },
        undefined,
        owner,
      ),
    ).toThrow(/enemy-test.*battleEnd L_1100.*恰好 1 个 stage.*2/)
  })

  test('refused world command 不能冒充 onDefeated', () => {
    expect(() =>
      translateEnemyScripts(
        ctxOf({
          1_200: [{ op: 'loadScene', sceneId: 1 } as unknown as SourceCmd, end()],
        }),
        { battleEnd: 1_200 },
        undefined,
        owner,
      ),
    ).toThrow(/battleEnd L_1200.*onDefeated context 不支持命令/)
  })
})
