// @vitest-environment jsdom
import type { StartWorld } from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ProjectIssue } from '../core/project-diagnostics.js'
import { IssueList, StartWorldFields } from './ProjectWorkbenchTab.js'

function issues(count: number): ProjectIssue[] {
  return Array.from({ length: count }, (_, index) => ({
    severity: 'warn',
    code: 'unused-asset',
    message: `未引用资源 ${index + 1}`,
    path: `assets[${index + 1}]`,
  }))
}

function button(host: HTMLElement, text: string): HTMLButtonElement {
  return [...host.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )!
}

async function input(element: HTMLInputElement, value: string): Promise<void> {
  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
    setter.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function ResourceHarness() {
  const [value, setValue] = useState<StartWorld>({
    party: [],
    money: 0,
    learnedSkills: {},
    inventory: [],
  })
  return (
    <StartWorldFields
      value={value}
      actors={[]}
      items={[]}
      skills={[]}
      locale={{}}
      onChange={setValue}
    />
  )
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('工程问题列表', () => {
  test('主面板可分批加载、显示全部和收起', async () => {
    await act(async () => root.render(<IssueList issues={issues(303)} />))

    expect(host.querySelectorAll('.project-issue')).toHaveLength(80)
    expect(host.textContent).toContain('已显示 80 / 303 项')

    await act(async () => button(host, '继续显示 80 项').click())
    expect(host.querySelectorAll('.project-issue')).toHaveLength(160)

    await act(async () => button(host, '显示全部').click())
    expect(host.querySelectorAll('.project-issue')).toHaveLength(303)
    expect(host.textContent).toContain('已显示全部 303 项')

    await act(async () => button(host, '收起至前 80 项').click())
    expect(host.querySelectorAll('.project-issue')).toHaveLength(80)
  })

  test('右侧摘要保持 30 项上限并提供全部问题入口', async () => {
    const onViewAll = vi.fn()
    await act(async () =>
      root.render(<IssueList issues={issues(303)} compact onViewAll={onViewAll} />),
    )

    expect(host.querySelectorAll('.project-issue')).toHaveLength(30)
    await act(async () => button(host, '查看全部 303 项').click())
    expect(onViewAll).toHaveBeenCalledOnce()
    expect(host.querySelectorAll('.project-issue')).toHaveLength(30)
  })

  test('恰好 80 项时不显示多余的分批控件', async () => {
    await act(async () => root.render(<IssueList issues={issues(80)} />))

    expect(host.querySelectorAll('.project-issue')).toHaveLength(80)
    expect(host.querySelector('.project-issue-more')).toBeNull()
  })
})

describe('入口开局世界资源', () => {
  test('可新增、修改和删除稳定资源键，并拒绝重复定义 collectValue', async () => {
    await act(async () => root.render(<ResourceHarness />))

    const keyInput = host.querySelector<HTMLInputElement>('input[aria-label="新世界资源稳定键"]')!
    const addButton = button(host, '添加资源')
    await input(keyInput, 'alchemyEnergy')
    expect(addButton.disabled).toBe(false)
    await act(async () => addButton.click())

    const valueInput = host.querySelector<HTMLInputElement>(
      'input[aria-label="alchemyEnergy 初始值"]',
    )!
    expect(valueInput.value).toBe('0')
    await input(valueInput, '7')
    expect(valueInput.value).toBe('7')

    const row = valueInput.closest('.project-resource-row')!
    await act(async () => button(row as HTMLElement, '删除').click())
    expect(host.querySelector('input[aria-label="alchemyEnergy 初始值"]')).toBeNull()

    await input(keyInput, 'collectValue')
    expect(addButton.disabled).toBe(true)
  })
})
