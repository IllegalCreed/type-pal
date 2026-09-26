// @vitest-environment jsdom
import type { AuthorCommand } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { choose, click, commandForm, input, row } from './__tests__/command-form-current-fixture.js'

describe('Current command data references', () => {
  test('flag reference and boolean are edited together with no intermediate parent commit', async () => {
    const f = await commandForm({ kind: 'setFlag', flag: 'opened', value: true })
    await choose('开关名', '准备')
    await choose('设为', 'false')
    await click('打开变量')
    expect(f.onOpenWorldVariable).toHaveBeenCalledExactlyOnceWith('ready')
    await f.finish({ kind: 'setFlag', flag: 'ready', value: false })
  })
  test.each([
    {
      command: { kind: 'setVar', var: 'score', value: 2 },
      label: '设为',
      expected: { kind: 'setVar', var: 'count', value: -5 },
    },
    {
      command: { kind: 'addVar', var: 'score', delta: 2 },
      label: '增减',
      expected: { kind: 'addVar', var: 'count', delta: -5 },
    },
  ] satisfies Array<{
    command: AuthorCommand
    label: string
    expected: AuthorCommand
  }>)('$command.kind selects number identity and exact signed payload', async ({
    command,
    label,
    expected,
  }) => {
    const f = await commandForm(command)
    await choose('变量名', '数量')
    await input(label, -5)
    await f.finish(expected)
  })
  test('money delta is not an absolute balance and preserves negative values', async () => {
    const f = await commandForm({ kind: 'giveMoney', delta: 50 })
    await input('增减钱', -25)
    await f.finish({ kind: 'giveMoney', delta: -25 })
  })
  test('shop selection serializes numeric identity and changes buy to sell', async () => {
    const f = await commandForm({ kind: 'openShop', shop: 2, mode: 'buy' })
    await choose('店铺', '店 9(0 货)')
    await choose('模式', '卖(当铺收购)')
    await f.finish({ kind: 'openShop', shop: 9, mode: 'sell' })
  })
  test('giveItem selects a named item but commits its opaque ID and explicit count', async () => {
    const f = await commandForm({ kind: 'giveItem', itemId: 'trial-herb' })
    await choose('物品', 'trial.sword')
    await input('数量', 3)
    await f.finish({ kind: 'giveItem', itemId: 'trial-sword', count: 3 })
  })
  test('loseItem returning to one omits the optional count without changing kind', async () => {
    const f = await commandForm({ kind: 'loseItem', itemId: 'trial-herb', count: 3 })
    await input('数量', 1)
    await f.finish({ kind: 'loseItem', itemId: 'trial-herb', count: undefined })
  })
  test('missing registered variable is visible as repair context, and can be replaced with a legal ID', async () => {
    // Structurally valid draft with a dangling reference, not a valid saved-project claim.
    const f = await commandForm({ kind: 'setVar', var: 'missing', value: 2 })
    expect(row('变量名').textContent).toContain('未登记')
    await choose('变量名', '分数')
    await f.finish({ kind: 'setVar', var: 'score', value: 2 })
  })
})
