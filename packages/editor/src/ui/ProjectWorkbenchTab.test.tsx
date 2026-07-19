// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { ProjectIssue } from '../core/project-diagnostics.js'
import { IssueList } from './ProjectWorkbenchTab.js'

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
