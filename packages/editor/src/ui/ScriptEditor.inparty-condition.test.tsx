// @vitest-environment jsdom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { commandForm } from './__tests__/command-form-current-fixture.js'

describe('当前作者脚本：队伍成员条件', () => {
  test('选择已有角色后只提交该 actorId，两侧分支与原脚本不变', async () => {
    const command = {
      kind: 'branch' as const,
      cond: { kind: 'flag' as const, flag: 'opened', is: true },
      then: [{ kind: 'wait' as const, ms: 40 }],
      else: [{ kind: 'wait' as const, ms: 80 }],
    }
    const f = await commandForm(command, { requireLeafFormRow: false })
    const label = [...document.querySelectorAll<HTMLLabelElement>('[role="dialog"] label')].find(
      (element) => element.textContent?.trim() === '条件',
    )
    expect(label).toBeDefined()
    await act(async () => (document.getElementById(label!.htmlFor) as HTMLButtonElement).click())
    const condition = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (element) => element.textContent?.trim() === '队伍成员',
    )
    expect(condition).toBeDefined()
    await act(async () => condition!.click())

    const actorLabel = [
      ...document.querySelectorAll<HTMLLabelElement>('[role="dialog"] label'),
    ].find((element) => element.textContent?.trim() === '队员')
    expect(actorLabel, '队伍成员条件应能选择当前工程的真实角色').toBeDefined()
    await act(async () =>
      (document.getElementById(actorLabel!.htmlFor) as HTMLButtonElement).click(),
    )
    const ally = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((element) =>
      element.textContent?.includes('ally-2'),
    )
    expect(ally).toBeDefined()
    await act(async () => ally!.click())
    await f.finish({ ...command, cond: { kind: 'inParty', actorId: 'ally-2' } })
  })
})
