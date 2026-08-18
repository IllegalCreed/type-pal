// @vitest-environment jsdom
import type { StampTemplate } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { MapStampPalette } from './MapStampPalette.js'

const previewRender = vi.hoisted(() => vi.fn())

vi.mock('./StampPreviewCanvas.js', () => ({
  StampMiniPreview: (props: { template: StampTemplate }) => {
    previewRender(props.template.id)
    return <canvas data-stamp-preview={props.template.id} />
  },
}))

function templates(count: number): StampTemplate[] {
  return Array.from({ length: count }, (_, index) => {
    const suffix = index.toString().padStart(4, '0')
    return {
      id: `stamp-${suffix}`,
      name: `模板 ${suffix}`,
      category: '测试',
      origin: 'authored',
      anchor: { row: 0, col: 0 },
      width: 1,
      height: 1,
      tilesetRefs: ['tiles-a'],
      layers: [{ id: 'floor', name: '地板', tiles: [[1], [null]], sources: [[0], [null]] }],
      collision: [[null], [null]],
    }
  })
}

function button(text: string, root: ParentNode): HTMLButtonElement {
  return [...root.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
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

async function chooseCategory(optionText: string): Promise<void> {
  const trigger = host.querySelector<HTMLButtonElement>(
    '[role="combobox"][aria-label="筛选组合分类"]',
  )!
  await act(async () => trigger.click())
  expect(document.querySelector('.ds-select-popover__search-input')).toBeNull()
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.textContent === optionText,
  )!
  await act(async () => option.click())
}

let root: Root
let host: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  previewRender.mockClear()
  document.body.innerHTML = ''
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

describe('MapStampPalette scale budget', () => {
  test('600 templates mount in deterministic 60-item batches and pointer movement does not expand work', async () => {
    const onPick = vi.fn()
    await act(async () => {
      root.render(
        <MapStampPalette
          stamps={templates(600)}
          tilesets={[]}
          assetCatalog={{ version: 1, assets: {} }}
          assetReader={{} as never}
          assetBase={{} as never}
          recentStampIds={[]}
          onPick={onPick}
        />,
      )
      await Promise.resolve()
    })

    expect(host.querySelectorAll('.map-stamp-card')).toHaveLength(60)
    expect(host.querySelectorAll('[data-stamp-preview]')).toHaveLength(60)
    expect(previewRender).toHaveBeenCalledTimes(60)

    const showMore = button('再显示 60 个', host)
    expect(showMore.className).toContain('ds-button--quiet')
    await act(async () => showMore.click())
    expect(host.querySelectorAll('.map-stamp-card')).toHaveLength(120)
    expect(host.querySelectorAll('[data-stamp-preview]')).toHaveLength(120)

    await input(host.querySelector<HTMLInputElement>('[aria-label="搜索地图组合"]')!, '模板')
    expect(host.querySelectorAll('.map-stamp-card')).toHaveLength(60)
    expect(host.querySelectorAll('[data-stamp-preview]')).toHaveLength(60)

    const renderCount = previewRender.mock.calls.length
    const palette = host.querySelector<HTMLElement>('.map-stamp-palette')!
    await act(async () => {
      for (let index = 0; index < 500; index++)
        palette.dispatchEvent(new MouseEvent('pointermove', { bubbles: true }))
    })
    expect(host.querySelectorAll('.map-stamp-card')).toHaveLength(60)
    expect(previewRender).toHaveBeenCalledTimes(renderCount)

    await act(async () => host.querySelector<HTMLButtonElement>('.map-stamp-card')!.click())
    expect(onPick).toHaveBeenCalledWith('stamp-0000')
  })

  test('分类使用不可搜索共享 Select，切换分类重置 60 条 limit', async () => {
    const stamps = templates(140).map((stamp, index) => ({
      ...stamp,
      category: index < 70 ? '甲类' : '乙类',
    }))
    await act(async () => {
      root.render(
        <MapStampPalette
          stamps={stamps}
          tilesets={[]}
          assetCatalog={{ version: 1, assets: {} }}
          assetReader={{} as never}
          assetBase={{} as never}
          recentStampIds={[]}
          onPick={vi.fn()}
        />,
      )
      await Promise.resolve()
    })
    const category = host.querySelector<HTMLButtonElement>(
      '[role="combobox"][aria-label="筛选组合分类"]',
    )!
    expect(category.className).toContain('ds-select--compact')
    await act(async () => button('再显示 60 个', host).click())
    expect(host.querySelectorAll('.map-stamp-card')).toHaveLength(120)

    await chooseCategory('甲类')
    expect(host.querySelectorAll('.map-stamp-card')).toHaveLength(60)
    expect(button('再显示 60 个', host)).not.toBeNull()
  })

  test('多瓦片源组合、最近排序、选中态和可选管理入口保持原语义', async () => {
    const stamps = templates(3)
    stamps[1] = { ...stamps[1]!, category: '异域', tilesetRefs: ['tiles-b'] }
    const onPick = vi.fn()
    const onOpenLibrary = vi.fn()
    await act(async () => {
      root.render(
        <MapStampPalette
          stamps={stamps}
          tilesets={[]}
          assetCatalog={{ version: 1, assets: {} }}
          assetReader={{} as never}
          assetBase={{} as never}
          activeStampId="stamp-0000"
          recentStampIds={['stamp-0002']}
          onPick={onPick}
          onOpenLibrary={onOpenLibrary}
        />,
      )
      await Promise.resolve()
    })
    const cards = [...host.querySelectorAll<HTMLButtonElement>('.map-stamp-card')]
    expect(
      cards.map(
        (card) =>
          card.querySelector<HTMLCanvasElement>('[data-stamp-preview]')?.dataset.stampPreview,
      ),
    ).toEqual(['stamp-0002', 'stamp-0000', 'stamp-0001'])
    expect(cards[1]?.getAttribute('aria-pressed')).toBe('true')
    expect(cards[2]?.disabled).toBe(false)
    await act(async () => cards[0]!.click())
    expect(onPick).toHaveBeenCalledWith('stamp-0002')

    const manage = button('管理组合', host)
    expect(manage.className).toContain('ds-button--secondary')
    await act(async () => manage.click())
    expect(onOpenLibrary).toHaveBeenCalledOnce()

    await chooseCategory('异域')
    expect(host.querySelectorAll('.map-stamp-card')).toHaveLength(1)
    expect(host.querySelector<HTMLButtonElement>('.map-stamp-card')?.disabled).toBe(false)
  })

  test('管理入口缺席和搜索空结果均保持明确状态', async () => {
    await act(async () => {
      root.render(
        <MapStampPalette
          stamps={templates(2)}
          tilesets={[]}
          assetCatalog={{ version: 1, assets: {} }}
          assetReader={{} as never}
          assetBase={{} as never}
          recentStampIds={[]}
          onPick={vi.fn()}
        />,
      )
      await Promise.resolve()
    })
    expect(button('管理组合', host)).toBeUndefined()
    await input(host.querySelector<HTMLInputElement>('[aria-label="搜索地图组合"]')!, '不存在')
    expect(host.textContent).toContain('没有匹配组合')
    expect(host.querySelectorAll('.map-stamp-card')).toHaveLength(0)
  })
})
