// @vitest-environment jsdom

import type { AuthorCommand } from '@type-pal/content'
import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { commandForm, row } from './__tests__/command-form-current-fixture.js'

type Dialog = Extract<AuthorCommand, { kind: 'dialog' }>
const dialogue = (): Dialog => ({
  kind: 'dialog',
  cue: {
    identity: { kind: 'narration' },
    rows: [{ text: '第一句' }, { text: '第二句', speed: 24 }],
  },
})

describe('当前对话逐行编辑的原子提交', () => {
  test('下移第一行只交换两句正文和各自速度，不重新写身份', async () => {
    const original = dialogue()
    const f = await commandForm(original)
    const first = row('第 1 行').closest('.cf-dialog-row')
    expect(first).not.toBeNull()
    const down = first!.querySelector<HTMLButtonElement>('[aria-label^="下移"]')
    expect(down).not.toBeNull()
    await act(async () => down!.click())
    expect(row('第 1 行').querySelector('textarea')?.value).toBe('第二句')
    expect(row('第 2 行').querySelector('textarea')?.value).toBe('第一句')
    await f.finish({
      ...original,
      cue: { ...original.cue, rows: [original.cue.rows[1]!, original.cue.rows[0]!] },
    })
  })

  test('删除第二句后必须保留最后一行，禁用按钮与原因可见', async () => {
    const original = dialogue()
    const f = await commandForm(original)
    const remove = document.querySelector<HTMLButtonElement>('[aria-label="删除对话第 2 行"]')
    expect(remove?.disabled).toBe(false)
    await act(async () => remove!.click())
    expect(row('第 1 行').querySelector('textarea')?.value).toBe('第一句')
    const finalRemove = document.querySelector<HTMLButtonElement>('[aria-label="删除对话第 1 行"]')
    expect(finalRemove?.disabled).toBe(true)
    expect(document.querySelector('.cf-dialog-row-action-reason')?.textContent).toBe(
      '至少保留 1 行对话',
    )
    await f.finish({ ...original, cue: { ...original.cue, rows: [original.cue.rows[0]!] } })
  })

  test('首句独立启用打字速度，不改第二句原有速度或正文', async () => {
    const original = dialogue()
    const f = await commandForm(original)
    const first = row('第 1 行').closest('.cf-dialog-row')
    const speed = first?.querySelector<HTMLInputElement>('input[type="checkbox"]')
    expect(speed).not.toBeNull()
    await act(async () => speed!.click())
    const millis = first?.querySelector<HTMLInputElement>(
      'input[name="dialogue-row-1-character-delay-ms"]',
    )
    expect(millis?.value).toBe('24')
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    expect(setter).toBeDefined()
    await act(async () => {
      setter!.call(millis, '8')
      millis!.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(row('第 2 行').querySelector('textarea')?.value).toBe('第二句')
    await f.finish({
      ...original,
      cue: { ...original.cue, rows: [{ text: '第一句', speed: 8 }, original.cue.rows[1]!] },
    })
  })
})
