/** 敌人战斗脚本翻译(M4c-2)—— 形状取自 2026-07-04 全 54 敌普查实锚。 */
import { describe, expect, test } from 'vitest'
import type { SourceCmd } from './source-facts.js'
import { translateEnemyScripts } from './translate-enemy-scripts.js'
import { emptyTranslateReport, type TranslateCtx } from './translate-events.js'

const raw = (opcode: number, ...operands: number[]): SourceCmd => ({ op: 'raw', opcode, operands })
const end = (): SourceCmd => ({ op: 'end' })
const dlg = (text: string, messageIndex: number): SourceCmd =>
  ({ op: 'showDialog', text, messageIndex }) as SourceCmd

/** 手搓链集 → ctx(多入口:{ip: cmds},各链独立数组)。 */
function ctxOf(chains: Record<number, SourceCmd[]>): TranslateCtx {
  const labelAt = new Map<string, { cmds: readonly SourceCmd[]; idx: number }>()
  for (const [ip, cmds] of Object.entries(chains)) {
    const arr = cmds.map((c, i) => (i === 0 ? { ...c, label: `L_${ip}` } : c))
    arr.forEach((c, i) => {
      if (c.label) labelAt.set(c.label, { cmds: arr, idx: i })
    })
    labelAt.set(`L_${ip}`, { cmds: arr, idx: 0 })
  }
  return { labelAt, locale: {}, report: emptyTranslateReport() }
}

describe('advance 游标状态机 → 规则', () => {
  test('凤梨小妖形:ready = end | 0x06[60]+0x9F[470]+0x67[FFFF] | 0x67[359] …', () => {
    const t = translateEnemyScripts(
      ctxOf({
        100: [
          end(),
          raw(0x06, 60, 0),
          raw(0x9f, 470),
          raw(0x67, 0xffff),
          end(),
          raw(0x67, 359),
          end(),
        ],
      }),
      { ready: 100 },
    )
    expect(t.pending).toEqual([])
    // 段2:60% 变身
    expect(t.rules).toContainEqual({
      at: 'act',
      when: {
        kind: 'all',
        of: [
          { kind: 'turn', op: '>=', value: 2 },
          { kind: 'chance', percent: 60 },
        ],
      },
      do: { kind: 'transform', enemyId: 'enemy-470' },
    })
    // 时间线:k2 哨兵 pass(rate 缺省10→100%)至 k3;k3 起 cast 359
    expect(t.rules).toContainEqual({
      at: 'act',
      when: {
        kind: 'all',
        of: [
          { kind: 'turn', op: '>=', value: 2 },
          { kind: 'not', cond: { kind: 'turn', op: '>=', value: 3 } },
          { kind: 'chance', percent: 100 },
        ],
      },
      do: { kind: 'pass' },
    })
    expect(t.rules).toContainEqual({
      at: 'act',
      when: {
        kind: 'all',
        of: [
          { kind: 'turn', op: '>=', value: 3 },
          { kind: 'chance', percent: 100 },
        ],
      },
      do: { kind: 'cast', skillId: '359' },
    })
  })

  test('血云雾形:turnStart = end | 0x06[50]+0x9C —— 第2轮起 50% 分裂;红史莱姆裸 0x9C', () => {
    const t = translateEnemyScripts(
      ctxOf({ 200: [end(), raw(0x06, 50, 0), raw(0x9c, 0), end()] }),
      { turnStart: 200 },
    )
    expect(t.rules).toEqual([
      {
        at: 'act',
        when: {
          kind: 'all',
          of: [
            { kind: 'turn', op: '>=', value: 2 },
            { kind: 'chance', percent: 50 },
          ],
        },
        do: { kind: 'divide', copies: 1 },
      },
    ])
    const t2 = translateEnemyScripts(ctxOf({ 210: [end(), raw(0x9c, 0), end()] }), {
      turnStart: 210,
    })
    expect(t2.rules[0]!.do).toEqual({ kind: 'divide', copies: 1 })
  })

  test('initial fallback 并入时间线:首段 0x67 覆盖 initial(同 k 后者胜)', () => {
    // 绿叶妖精形:turnStart 首段 0x67[312](rate缺省=10) → 第2段 0x67[0](关)
    const t = translateEnemyScripts(
      ctxOf({ 300: [raw(0x67, 312, 0), end(), raw(0x67, 0, 0), end()] }),
      { turnStart: 300 },
      { magic: 999, rate: 5 }, // 敌表 fallback,被 k=1 的 0x67[312] 覆盖
    )
    expect(t.rules).toEqual([
      {
        at: 'act',
        when: {
          kind: 'all',
          of: [
            { kind: 'not', cond: { kind: 'turn', op: '>=', value: 2 } },
            { kind: 'chance', percent: 100 },
          ],
        },
        do: { kind: 'cast', skillId: '312' },
      },
    ])
  })

  test('嘲讽演出:0x91 首只 + 音效 + 对话 → choreography(once;策略零规则)', () => {
    const t = translateEnemyScripts(
      ctxOf({ 400: [raw(0x91, 0), raw(0x47, 8), dlg('哪来的小娃娃!', 5001), end()] }),
      { turnStart: 400 },
    )
    expect(t.rules).toEqual([])
    expect(t.choreography).toEqual([
      {
        at: 'turnStart',
        once: true,
        when: { kind: 'firstOfKind' },
        body: [
          { kind: 'playSound', soundId: 8 },
          { kind: 'dialog', line: { text: 'dlg.5001' } },
        ],
      },
    ])
  })

  test('召唤(大手简臂)与 逃跑演出(0x69 → fleeBattle)', () => {
    const t = translateEnemyScripts(
      ctxOf({ 500: [end(), raw(0x06, 60, 0), raw(0x9e, 441, 2), raw(0x67, 0xffff), end()] }),
      { ready: 500 },
    )
    expect(t.rules).toContainEqual({
      at: 'act',
      when: {
        kind: 'all',
        of: [
          { kind: 'turn', op: '>=', value: 2 },
          { kind: 'chance', percent: 60 },
        ],
      },
      do: { kind: 'summon', enemyId: 'enemy-441', count: 2 },
    })
    const t2 = translateEnemyScripts(
      ctxOf({ 510: [dlg('捉不到我~', 5002), raw(0x69, 0), end()] }),
      { turnStart: 510 },
    )
    expect(t2.choreography[0]!.body).toEqual([
      { kind: 'dialog', line: { text: 'dlg.5002' } },
      { kind: 'fleeBattle' },
    ])
  })

  test('battleEnd 复用事件翻译 → onDefeated(给物+对白)', () => {
    const t = translateEnemyScripts(
      ctxOf({
        600: [
          { op: 'giveItem', itemId: 42, count: 1 } as unknown as SourceCmd,
          dlg('得到宝贝!', 5003),
          end(),
        ],
      }),
      { battleEnd: 600 },
    )
    expect(t.onDefeated?.some((c) => c.kind === 'giveItem')).toBe(true)
    expect(t.onDefeated?.some((c) => c.kind === 'dialog')).toBe(true)
  })

  test('0x79 段内有后续对话:保留段内(「不跳」臂台词),不 pending 不崩', () => {
    // 0x79 后段内有对话(女飞贼/石长老「不跳」臂):遭遇绑定后队伍门无义 → 保留段内对话
    const t = translateEnemyScripts(ctxOf({ 700: [raw(0x79, 3, 0), dlg('x', 1), end()] }), {
      turnStart: 700,
    })
    expect(t.pending.some((p) => p.includes('0x79'))).toBe(false)
    expect(t.choreography[0]?.body.some((c) => c.kind === 'dialog')).toBe(true)
  })
  test('0x79 段内无后续对话:内联跳转目标台词(胖苗/绿叶 —— 台词只在跳转目标)', () => {
    // 700 段仅 0x79 跳 800;800 是台词。遭遇绑定后无条件内联(boss 场角色必在队)
    const t = translateEnemyScripts(
      ctxOf({ 700: [raw(0x79, 3, 800), end()], 800: [dlg('胖苗台词', 1), end()] }),
      { turnStart: 700 },
    )
    expect(t.pending.some((p) => p.includes('0x79'))).toBe(false)
    expect(t.choreography[0]?.body.some((c) => c.kind === 'dialog')).toBe(true)
  })
})
