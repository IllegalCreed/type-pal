// @vitest-environment jsdom

import { act } from 'react'
import { describe, expect, test } from 'vitest'
import { atlasColors, pngRgba } from '../__tests__/png-fixtures.js'
import type { StaticImageKind } from '../core/static-image.js'
import { installImageWorkbenchTestHost } from './__tests__/image-workbench-test-host.js'
import { patternedRgba, seedImage } from './__tests__/static-image-fixtures.js'
import { setCatalogSearch } from './catalog-controls-test-utils.js'

const { host, mountTab, waitPreviewSize } = installImageWorkbenchTestHost()

function seed(
  mounted: Awaited<ReturnType<typeof mountTab>>,
  id: string,
  kind: StaticImageKind,
  label: string | undefined,
  size: number,
) {
  return seedImage(mounted.session, {
    id,
    kind,
    label,
    png: pngRgba(size, size, patternedRgba(size, size, atlasColors(2))),
  })
}

describe('Image catalog controls', () => {
  test('preserves filtered count semantics and switches the image scope through shared tabs', async () => {
    await mountTab({
      async prepare(mounted) {
        await seed(mounted, 'portrait.primary', 'portrait', '主要立绘', 2)
        await seed(mounted, 'portrait.secondary', 'portrait', '次要立绘', 3)
        await seed(mounted, 'face.primary', 'face', undefined, 4)
      },
    })
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('2 项')
    const search = host.querySelector<HTMLInputElement>('input[aria-label="搜索图像"]')!
    await waitPreviewSize('2 × 2')
    await setCatalogSearch(search, '次要')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('1 项')
    expect(host.querySelectorAll('.image-asset-list .ds-catalog-row')).toHaveLength(1)
    expect(host.querySelector('.image-asset-list [data-selected="true"]')).toBeNull()
    expect(
      host.querySelector('.image-workspace > .ds-object-hero .ds-object-hero__title')?.textContent,
    ).toBe('主要立绘')
    expect(
      host.querySelector('.image-workspace > .ds-object-hero .ds-object-hero__id')?.textContent,
    ).toBe('portrait.primary')

    await setCatalogSearch(search, 'portrait.secondary')
    expect(host.querySelector('.image-asset-list .ds-catalog-row__meta')?.textContent).toBe(
      'portrait.secondary',
    )
    await setCatalogSearch(search, '不存在')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('0 项')
    expect(host.querySelectorAll('.image-asset-list .ds-catalog-row')).toHaveLength(0)
    expect(host.querySelector('.image-asset-list')?.textContent).toContain('没有匹配的图片。')
    await setCatalogSearch(search, '')
    expect(host.querySelector('.image-asset-list [data-selected="true"]')?.textContent).toContain(
      '主要立绘',
    )
    const faceTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find((button) =>
      button.textContent?.includes('战斗头像'),
    )!
    await act(async () => faceTab.click())
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('1 项')
    const unnamedFace = host.querySelector('.image-asset-list .ds-catalog-row')!
    expect(unnamedFace.querySelector('.ds-catalog-row__title')?.textContent).toBe('未命名战斗头像')
    expect(unnamedFace.querySelector('.ds-catalog-row__meta')?.textContent).toBe('face.primary')
    const itemIconTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (button) => button.textContent?.includes('物品图标'),
    )!
    await act(async () => itemIconTab.click())
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('0 项')
    expect(host.querySelector('.image-asset-list')?.textContent).toContain('此项目还没有物品图标。')
    const backgroundTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (button) => button.textContent?.includes('战场背景'),
    )!
    await act(async () => backgroundTab.click())
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('0 项')
    const portraitTab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
      (button) => button.textContent?.includes('立绘'),
    )!
    await act(async () => portraitTab.click())
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('2 项')
    expect(host.querySelector('[aria-label="导入 PNG"]')).not.toBeNull()
  })

  test('a face deep link selects the requested second row and opens the face tab', async () => {
    await mountTab({
      focus: 'face.secondary',
      async prepare(mounted) {
        await seed(mounted, 'face.primary', 'face', '先出现的头像', 2)
        await seed(mounted, 'face.secondary', 'face', '定位的头像', 3)
      },
    })
    expect(host.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('战斗头像')
    expect(host.querySelector('.image-asset-list [data-selected="true"]')?.textContent).toContain(
      '定位的头像',
    )
    await waitPreviewSize('3 × 3')
  })
})
