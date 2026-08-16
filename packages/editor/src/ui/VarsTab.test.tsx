// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import type { RefIndex } from '../core/ref-index.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'
import { VarsTab } from './VarsTab.js'

const refs: RefIndex = {
  flags: new Map([
    ['quest.started', [{ sceneId: 's001', srcKey: 'enter', srcLabel: '进场', access: 'write', detail: '= true' }]],
  ]),
  vars: new Map([
    ['score.total', [{ sceneId: 's002', srcKey: 'trigger', srcLabel: '触发', access: 'read', detail: '>= 1' }]],
  ]),
  items: new Map(),
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

describe('VarsTab catalog controls', () => {
  test('keeps total count while filtering flags and vars through an accessible shared search', async () => {
    await act(async () => root.render(<VarsTab refIndex={refs} onJumpToEvent={() => undefined} />))
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('2 项')
    const search = host.querySelector<HTMLInputElement>('input[aria-label="过滤变量名字"]')!
    expect(search).not.toBeNull()

    await setCatalogSearch(search, 'quest')
    expect(host.querySelector('.canvas-wrap')?.textContent).toContain('quest.started')
    expect(host.querySelector('.canvas-wrap')?.textContent).not.toContain('score.total')

    await setCatalogSearch(search, '不存在')
    expect(host.querySelector('.canvas-wrap')?.textContent).not.toContain('quest.started')
    expect(host.querySelector('.canvas-wrap')?.textContent).not.toContain('score.total')
    await setCatalogSearch(search, '')
    expect(host.querySelector('.canvas-wrap')?.textContent).toContain('quest.started')
    expect(host.querySelector('.canvas-wrap')?.textContent).toContain('score.total')
  })
})
