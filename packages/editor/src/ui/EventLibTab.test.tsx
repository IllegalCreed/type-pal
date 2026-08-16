// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { COMMAND_CATALOG } from '../core/command-catalog.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'
import { EventLibTab } from './EventLibTab.js'

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

describe('EventLibTab catalog controls', () => {
  test('filters the command handbook without changing its total catalog count', async () => {
    await act(async () => root.render(<EventLibTab />))
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe(
      `${COMMAND_CATALOG.length} 条`,
    )
    const search = host.querySelector<HTMLInputElement>('input[aria-label="搜索指令手册"]')!
    const target = COMMAND_CATALOG[0]!
    await setCatalogSearch(search, target.kind)
    expect(host.querySelector('.canvas-wrap')?.textContent).toContain(target.name)
    expect(host.querySelectorAll('.cat-row').length).toBeLessThan(COMMAND_CATALOG.length)

    await setCatalogSearch(search, '不存在的指令')
    expect(host.querySelectorAll('.cat-row')).toHaveLength(0)
    await setCatalogSearch(search, '')
    expect(host.querySelectorAll('.cat-row')).toHaveLength(COMMAND_CATALOG.length)
  })
})
