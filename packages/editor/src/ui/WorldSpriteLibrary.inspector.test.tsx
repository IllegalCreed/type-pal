// @vitest-environment jsdom
/** Inspector focus, resource count, and entry points for named actions. */
import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import {
  buttonByLoose,
  multiAssetProject,
  selectAssetRow,
  setupWorldSpriteLibrarySuite,
  waitMeta,
} from '../__tests__/world-sprite-library-gestures.js'
import type { MountedWorldSpriteLibrary } from '../__tests__/world-sprite-library-test-host.js'

const suite = setupWorldSpriteLibrarySuite()
let mounted: MountedWorldSpriteLibrary | undefined

describe('检查器页签/动作入口/引用面板与选择恢复', () => {
  test('源资源页签切换后仍保持当前资产选择', async () => {
    const project = await multiAssetProject('c01-g07-01')
    mounted = await suite.mount(project, { focus: 'c01-alpha-idle' })
    await waitMeta(mounted.host, 8, 2)
    await act(async () => {
      const tab = [...mounted!.host.querySelectorAll<HTMLElement>('[role="tab"]')].find(
        (candidate) => candidate.textContent?.trim() === '源资源',
      )
      expect(tab, '源资源 tab').toBeDefined()
      tab!.click()
    })
    expect(mounted.host.querySelector('.who')?.textContent).toMatch(/AlphaIdle|C01Alpha/)
  })

  test('有 poses 的用途显示编辑预制动作按钮含数量', async () => {
    const project = await multiAssetProject('c01-g07-02')
    mounted = await suite.mount(project, { focus: 'c01-alpha-idle' })
    await waitMeta(mounted.host, 8, 2)
    const edit = buttonByLoose(mounted.host, '编辑预制动作（1）')
    expect(edit).toBeDefined()
    expect(edit?.disabled).toBe(false)
  })

  test('无 poses 的用途不显示编辑预制动作按钮但显示新建', async () => {
    const project = await multiAssetProject('c01-g07-03')
    mounted = await suite.mount(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    expect(buttonByLoose(mounted.host, '新建预制动作')).toBeDefined()
    expect(
      [...mounted.host.querySelectorAll('button')].some((b) =>
        b.textContent?.startsWith('编辑预制动作'),
      ),
    ).toBe(false)
  })

  test('用途列表 trailing 显示布局 kind 短标签「四向」', async () => {
    const project = await multiAssetProject('c01-g07-04')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    const walkRow = [
      ...mounted.host.querySelectorAll('[aria-label="选择用途定义"] .ds-catalog-row'),
    ].find((row) => row.textContent?.includes('AlphaWalk'))
    expect(walkRow?.textContent).toContain('四向')
  })

  test('用途列表 trailing 对 static 显示「默认定格」', async () => {
    const project = await multiAssetProject('c01-g07-05')
    mounted = await suite.mount(project, { focus: 'c01-alpha-idle' })
    await waitMeta(mounted.host, 8, 2)
    const idleRow = [
      ...mounted.host.querySelectorAll('[aria-label="选择用途定义"] .ds-catalog-row'),
    ].find((row) => row.textContent?.includes('AlphaIdle'))
    expect(idleRow?.textContent).toContain('默认定格')
  })

  test('引用页签选中后 panel-references 非 hidden', async () => {
    const project = await multiAssetProject('c01-g07-06')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await act(async () => {
      const tab = [...mounted!.host.querySelectorAll<HTMLElement>('[role="tab"]')].find(
        (candidate) => /^引用/.test(candidate.textContent?.trim() ?? ''),
      )
      expect(tab, '引用 tab').toBeDefined()
      tab!.click()
    })
    await vi.waitFor(() => {
      const tab = [...mounted!.host.querySelectorAll<HTMLElement>('[role="tab"]')].find(
        (candidate) => /^引用/.test(candidate.textContent?.trim() ?? ''),
      )
      expect(tab?.getAttribute('aria-selected')).toBe('true')
      expect(
        mounted!.host
          .querySelector('#world-sprite-inspector-panel-references')
          ?.hasAttribute('hidden'),
      ).toBe(false)
    })
  })

  test('精灵库精确显示 starter 加三个 authored 资源，共4项', async () => {
    const project = await multiAssetProject('c01-g07-07')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    expect(
      mounted.host.querySelector('.world-sprite-outliner .ds-list-header__count')?.textContent,
    ).toBe('4 项')
  })

  test('从 gamma 切回 alpha 后 who 恢复 AlphaWalk', async () => {
    const project = await multiAssetProject('c01-g07-08')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await selectAssetRow(mounted, 'sprite.authored.c01gamma')
    await waitMeta(mounted.host, 3, 0)
    await selectAssetRow(mounted, 'sprite.authored.c01alpha')
    await waitMeta(mounted.host, 8, 2)
    await act(async () => {
      const walk = [
        ...mounted!.host.querySelectorAll<HTMLElement>(
          '[aria-label="选择用途定义"] .ds-catalog-row',
        ),
      ].find((row) => row.textContent?.includes('AlphaWalk'))
      walk?.click()
    })
    expect(mounted.host.querySelector('.who')?.textContent).toBe('AlphaWalk')
  })

  test('新建预制动作按钮在 proof 就绪后 enabled', async () => {
    const project = await multiAssetProject('c01-g07-09')
    mounted = await suite.mount(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    expect(buttonByLoose(mounted.host, '新建预制动作')?.disabled).toBe(false)
  })

  test('检查器 heading 在 definition 视图为「大世界精灵用途」', async () => {
    const project = await multiAssetProject('c01-g07-10')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    expect(mounted.host.querySelector('.what')?.textContent).toBe('大世界精灵用途')
  })
})
