// @vitest-environment jsdom

import type { EntityPage, SpriteActionBinding, SpriteDef } from '@type-pal/content'
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EntityPageAnimationEditor } from './EntityPageAnimationEditor.js'

const sprite: SpriteDef = {
  id: 'sprite-77',
  asset: 'sprite.pal.077',
  label: '甩鞭人',
  layout: { kind: 'static' },
  poses: {
    late: { label: '后动作', order: 2, steps: [{ frame: 2, durationMs: 100 }] },
    loop: {
      label: '甩鞭循环',
      order: 1,
      steps: [
        { frame: 0, durationMs: 240 },
        { frame: 1, durationMs: 240 },
      ],
      loopFrom: 0,
    },
  },
}

describe('EntityPageAnimationEditor', () => {
  let host: HTMLDivElement
  let root: Root

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

  test('从实体页启用复合动作并编辑循环、相位与反跳', async () => {
    const changes: Array<SpriteActionBinding | undefined> = []
    const open = vi.fn()
    function Harness() {
      const [page, setPage] = useState<EntityPage>({})
      return (
        <EntityPageAnimationEditor
          page={page}
          pageIndex={1}
          sprite={sprite}
          onChange={(binding) => {
            changes.push(binding)
            setPage(binding ? { animation: binding } : {})
          }}
          onOpenAction={open}
        />
      )
    }
    await act(async () => root.render(<Harness />))

    const enabled = host.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    await act(async () => enabled.click())
    expect(changes.at(-1)).toEqual({ sprite: 'sprite-77', action: 'loop', loop: true })

    const select = host.querySelector<HTMLButtonElement>('[aria-label="页面默认动作"]')!
    await act(async () => select.click())
    const late = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find((option) =>
      option.textContent?.includes('后动作'),
    )!
    await act(async () => late.click())
    expect(changes.at(-1)).toEqual({ sprite: 'sprite-77', action: 'late', loop: false })

    const loop = host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')[1]!
    await act(async () => loop.click())
    expect(changes.at(-1)).toMatchObject({ action: 'late', loop: true })

    const phase = host.querySelector<HTMLInputElement>('[aria-label="动作起始相位（毫秒）"]')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(phase, '240')
      phase.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(changes.at(-1)).toMatchObject({ action: 'late', loop: true, startAtMs: 240 })

    await act(async () =>
      Array.from(host.querySelectorAll('button'))
        .find((button) => button.textContent?.includes('打开动作'))
        ?.click(),
    )
    expect(open).toHaveBeenCalledWith('sprite-77', 'late')
  })

  test('悬空复合引用不猜测替换并明确提示', async () => {
    await act(async () =>
      root.render(
        <EntityPageAnimationEditor
          page={{ animation: { sprite: 'wrong', action: 'missing', loop: true } }}
          pageIndex={0}
          sprite={sprite}
          onChange={() => {}}
        />,
      ),
    )
    expect(host.textContent).toContain('wrong/missing（引用失效）')
    expect(host.textContent).toContain('不匹配')
    const openAction = [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
      button.textContent?.includes('打开动作'),
    )!
    expect(openAction.disabled).toBe(true)
  })
})
