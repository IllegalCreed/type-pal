// @vitest-environment jsdom
import { act } from 'react'
import { expect, test, vi } from 'vitest'
import { commandForm } from './__tests__/command-form-current-fixture.js'
import { describeCanonicalCommand } from './ScriptEditor.js'

test('the condition editor preserves both explicit entity addresses, fractional range and separate navigation', async () => {
  const from = { scene: 'start', entity: 'npc' }
  const to = { scene: 'start', entity: 'npc-2' }
  const command = {
    kind: 'branch' as const,
    cond: { kind: 'entitiesNear' as const, from, to, range: 0.5 },
    then: [],
    else: [],
  }
  const onOpenEntity = vi.fn()
  const f = await commandForm(command, {
    includeEntity: true,
    includeSecondEntity: true,
    requireLeafFormRow: false,
    onOpenEntity,
  })
  expect(describeCanonicalCommand(command, f.context).label).toContain('距离小于 0.5 格')
  const dialog = document.querySelector('[role="dialog"]')
  expect(dialog?.textContent).toContain('起点实体')
  expect(dialog?.textContent).toContain('目标实体')
  const links = [...(dialog?.querySelectorAll('button') ?? [])].filter((button) =>
    button.textContent?.startsWith('定位 '),
  )
  expect(links).toHaveLength(2)
  await act(async () => links[0]?.click())
  await act(async () => links[1]?.click())
  expect(onOpenEntity.mock.calls).toEqual([[from], [to]])
  const range = dialog?.querySelector<HTMLInputElement>('input[type="number"]')
  expect(range).not.toBeNull()
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(range, '0.25')
    range?.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await f.finish({ ...command, cond: { ...command.cond, range: 0.25 } })
})
