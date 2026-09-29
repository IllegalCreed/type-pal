// @vitest-environment jsdom
/**
 * TEST-GLM-NEW-F-1 F03a：DesignLab 当前 fixture 路由回显（此前零渲染测试，仅
 * design-system boundary/text-overflow 两份静态源码检查）。
 * 去重：本文件只证 gallery 壳的公开路由合同——缺省 ?fixture、合法值回显与
 * aria-current 迁移、未知值 fail-loud 错误页；不重复 design-system 控件自身测试。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { useActEnvironment } from '../ui/__tests__/glm-ui-wave-kit.js'
import { EDITOR_DESIGN_SYSTEM_VERSION } from '../ui/design-system/index.js'
import { DesignLab } from './DesignLab.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  useActEnvironment()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

async function renderAt(search: string): Promise<void> {
  window.history.replaceState({}, '', `/${search}`)
  await act(async () => root.render(<DesignLab />))
}

const navLinks = (): HTMLAnchorElement[] => [
  ...host.querySelectorAll<HTMLAnchorElement>('nav.lab-fixture-nav a'),
]

describe('F03 DesignLab fixture 路由回显', () => {
  test('缺省 fixture 参数回显 RF-01 舞台与版本头，导航仅 RF-01 为当前页', async () => {
    await renderAt('')
    const stage = host.querySelector<HTMLElement>('main.lab-stage')
    expect(stage?.dataset.fixture).toBe('RF-01')
    expect(host.querySelector('header.lab-header')?.textContent).toContain('Type-Pal Design Lab')
    expect(host.querySelector('header.lab-header')?.textContent).toContain(
      `v${EDITOR_DESIGN_SYSTEM_VERSION}`,
    )
    const links = navLinks()
    expect(links).toHaveLength(23)
    expect(links.map((link) => link.textContent)).toContain('RF-01')
    const current = links.filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current).toHaveLength(1)
    expect(current[0]?.textContent).toBe('RF-01')
    expect(current[0]?.getAttribute('href')).toBe('?fixture=RF-01')
  })

  test('?fixture=RF-25 切换舞台内容并把 aria-current 迁移到 RF-25', async () => {
    await renderAt('?fixture=RF-25')
    const stage = host.querySelector<HTMLElement>('main.lab-stage')
    expect(stage?.dataset.fixture).toBe('RF-25')
    expect(stage?.textContent).toContain('NumberField 状态与事务')
    expect(host.textContent).toContain('防御')
    const current = navLinks().filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current).toHaveLength(1)
    expect(current[0]?.textContent).toBe('RF-25')
    expect(host.textContent).not.toContain('主任务区域')
  })

  test('未知 fixture 值渲染 lab-error 错误页且不设置舞台', async () => {
    await renderAt('?fixture=RF-99')
    const error = host.querySelector<HTMLElement>('main.lab-error')
    expect(error).not.toBeNull()
    expect(error?.textContent).toContain('未知 fixture')
    expect(host.querySelector('main.lab-stage')).toBeNull()
    const back = error?.querySelector<HTMLAnchorElement>('a')
    expect(back?.getAttribute('href')).toBe('?fixture=RF-01')
    expect(navLinks()).toHaveLength(0)
  })
})
