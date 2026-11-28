// @vitest-environment jsdom

import { describe, expect, test } from 'vitest'
import { solidRgba } from '../__tests__/png-fixtures.js'
import { mp4AudioBytes, mp4SilentBytes } from '../__tests__/video-fixtures.js'
import { installCutsceneTestHost } from './__tests__/cutscene-test-host.js'
import { buttonByLabel } from './__tests__/dom-gestures.js'

const { host, mountTab } = installCutsceneTestHost()

describe('过场资源目录', () => {
  test('shows both resource groups without a redundant catalog search', async () => {
    await mountTab({
      focus: 'video.opening',
      videos: [
        { id: 'video.opening', label: '开场视频', bytes: mp4AudioBytes() },
        { id: 'video.ending', label: '片尾视频', bytes: mp4SilentBytes() },
      ],
      animations: [
        {
          id: 'frame-animation.logo',
          width: 2,
          height: 1,
          defaultFrameMs: 40,
          frames: [solidRgba(2, 1, [0, 30, 200, 255])],
        },
      ],
    })
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('3 项')
    expect(host.querySelector('input[aria-label="搜索过场资源"]')).toBeNull()
    const groups = host.querySelectorAll<HTMLElement>('.cutscene-library-section')
    expect(groups).toHaveLength(2)
    expect(groups[0]?.querySelector('.ds-catalog-group-header__title')?.textContent).toBe('视频')
    expect(groups[0]?.querySelector('.ds-catalog-group-header__count')?.textContent).toBe('2')
    expect(groups[1]?.querySelector('.ds-catalog-group-header__title')?.textContent).toBe('帧动画')
    expect(groups[1]?.querySelector('.ds-catalog-group-header__count')?.textContent).toBe('1')
    expect(
      host.querySelector('.cutscene-main > .ds-object-hero .ds-object-hero__title')?.textContent,
    ).toBe('开场视频')
    expect(
      host.querySelector('.cutscene-main > .ds-object-hero .ds-object-hero__id')?.textContent,
    ).toBe('video.opening')
    expect(host.querySelector('[aria-label="导入视频"]')).not.toBeNull()
    expect(host.querySelector('[aria-label="导入帧动画"]')).not.toBeNull()
    const rows = host.querySelectorAll<HTMLElement>('.cutscene-asset-list .ds-catalog-row')
    expect(rows).toHaveLength(3)
    expect([...rows].map((row) => row.dataset.leading)).toEqual(['none', 'none', 'none'])
    const selected = host.querySelector(
      '.cutscene-asset-list .ds-catalog-row[data-selected="true"]',
    )!
    expect(selected.querySelector('.ds-catalog-row__leading')).toBeNull()
    expect(selected.querySelector('.ds-catalog-row__title')?.textContent).toBe('开场视频')
    expect(selected.querySelector('.ds-catalog-row__meta')?.textContent).toBe('video.opening')
    const unnamed = [...rows].find(
      (row) => row.querySelector('.ds-catalog-row__meta')?.textContent === 'frame-animation.logo',
    )!
    expect(unnamed.querySelector('.ds-catalog-row__title')?.textContent).toBe('未命名帧动画')
    expect(unnamed.querySelector('.ds-catalog-row__title')?.textContent).not.toBe(
      unnamed.querySelector('.ds-catalog-row__meta')?.textContent,
    )
  })

  test('shows empty resource groups and their import actions in a valid empty project', async () => {
    await mountTab()
    expect(host.querySelector('.cutscene-outliner')?.textContent).toContain('此项目还没有视频。')
    expect(host.querySelector('.cutscene-outliner')?.textContent).toContain('此项目还没有帧动画。')
    expect(host.querySelector('.cutscene-empty-workspace')?.textContent).toContain('还没有过场资源')
    expect(buttonByLabel(host, '导入视频')).toBeDefined()
    expect(buttonByLabel(host, '导入帧动画')).toBeDefined()
  })
})
