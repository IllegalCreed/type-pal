// @vitest-environment jsdom
/** Catalog search, filtering, and focus through the live world sprite library. */
import { act } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { clickButtonByText } from '../__tests__/cursor-asset-r1/kit.js'
import {
  buttonByLoose,
  catalogMetas,
  multiAssetProject,
  selectAssetRow,
  setKindFilter,
  setTextFilter,
  setupWorldSpriteLibrarySuite,
  waitMeta,
} from '../__tests__/world-sprite-library-gestures.js'
import type { MountedWorldSpriteLibrary } from '../__tests__/world-sprite-library-test-host.js'

const suite = setupWorldSpriteLibrarySuite()
let mounted: MountedWorldSpriteLibrary | undefined

describe('目录选择与视图归属', () => {
  test('初始 definition 聚焦：检查器 who 显示用途标签且 meta 含实际帧数', async () => {
    const project = await multiAssetProject('c01-g01-01')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    expect(mounted.host.querySelector('.who')?.textContent).toBe('AlphaWalk')
    expect(mounted.host.textContent).toContain('大世界精灵用途')
  })

  test('点击待定义资产行：view 切到 asset 且检查器标题变为资源', async () => {
    const project = await multiAssetProject('c01-g01-02')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await selectAssetRow(mounted, 'sprite.authored.c01gamma')
    await waitMeta(mounted.host, 3, 0)
    expect(mounted.host.querySelector('.what')?.textContent).toBe('大世界精灵资源')
    expect(mounted.focusHistory.at(-1)).toEqual({
      view: 'asset',
      objectId: 'sprite.authored.c01gamma',
    })
  })

  test('用途选择列表切换 sibling：selected 行与 who 同步到 BetaStatic', async () => {
    const project = await multiAssetProject('c01-g01-03')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await selectAssetRow(mounted, 'sprite.authored.c01beta')
    await waitMeta(mounted.host, 4, 1)
    const rows = [
      ...mounted.host.querySelectorAll<HTMLElement>('[aria-label="选择用途定义"] .ds-catalog-row'),
    ]
    expect(rows.length).toBeGreaterThan(0)
    await act(async () => {
      rows[0]!.click()
    })
    expect(mounted.host.querySelector('.who')?.textContent).toBe('BetaStatic')
  })

  test('目录行 aria-label 对无用途资产追加「待定义」标记', async () => {
    const project = await multiAssetProject('c01-g01-04')
    mounted = await suite.mount(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    const row = [...mounted.host.querySelectorAll<HTMLElement>('.sprite-resource-row')].find(
      (candidate) =>
        candidate.querySelector('.ds-catalog-row__meta')?.textContent ===
        'sprite.authored.c01gamma',
    )
    expect(row?.getAttribute('aria-label')).toContain('待定义')
    expect(row?.querySelector('.ds-tag')?.textContent).toBe('待定义')
  })

  test('有用途资产目录行不带待定义 tag', async () => {
    const project = await multiAssetProject('c01-g01-05')
    mounted = await suite.mount(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    const row = [...mounted.host.querySelectorAll<HTMLElement>('.sprite-resource-row')].find(
      (candidate) =>
        candidate.querySelector('.ds-catalog-row__meta')?.textContent === 'sprite.authored.c01beta',
    )
    expect(row?.getAttribute('aria-label')).not.toContain('待定义')
    expect(row?.querySelector('.ds-tag')).toBeNull()
  })

  test('战斗域页签点击触发 onBattleDomain 恰一次且不改当前用途选择', async () => {
    const project = await multiAssetProject('c01-g01-06')
    mounted = await suite.mount(project, { focus: 'c01-alpha-idle' })
    await waitMeta(mounted.host, 8, 2)
    const before = mounted.host.querySelector('.who')?.textContent
    await act(async () => {
      const tabs = [...mounted!.host.querySelectorAll<HTMLElement>('[role="tab"]')]
      const battle = tabs.find((tab) => tab.textContent?.trim() === '战斗')
      expect(battle, '战斗域 tab').toBeDefined()
      battle!.click()
    })
    expect(mounted.battleDomainCalls).toHaveLength(1)
    expect(mounted.host.querySelector('.who')?.textContent).toBe(before)
  })

  test('资源域页签大世界保持 active，点击自身不触发战斗域回调', async () => {
    const project = await multiAssetProject('c01-g01-07')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await act(async () => {
      const tabs = [...mounted!.host.querySelectorAll<HTMLElement>('[role="tab"]')]
      const world = tabs.find((tab) => tab.textContent?.trim() === '大世界')
      expect(world, '大世界 tab').toBeDefined()
      world!.click()
    })
    expect(mounted.battleDomainCalls).toHaveLength(0)
  })

  test('导入源帧资源按钮打开上传叶：中心区出现 SpriteUploadWizard 取消入口', async () => {
    const project = await multiAssetProject('c01-g01-08')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await clickButtonByText(mounted.host, '导入源帧资源')
    await vi.waitFor(() => {
      expect(mounted!.host.textContent).toMatch(/取消|选择图片|上传/)
    })
    expect(mounted.host.querySelector('.world-sprite-center')?.textContent).not.toContain(
      '8 帧 · 2 个用途定义',
    )
  })

  test('上传叶取消后恢复原资源 viewer meta', async () => {
    const project = await multiAssetProject('c01-g01-09')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await clickButtonByText(mounted.host, '导入源帧资源')
    await vi.waitFor(() => expect(buttonByLoose(mounted!.host, '取消')).toBeDefined())
    await act(async () => {
      buttonByLoose(mounted!.host, '取消')!.click()
    })
    await waitMeta(mounted.host, 8, 2)
  })
})

describe('文本过滤与空结果恢复', () => {
  test('按 asset id 片段过滤只保留 c01alpha', async () => {
    const project = await multiAssetProject('c01-g02-01')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setTextFilter(mounted.host, 'sprite.authored.c01alpha')
    await vi.waitFor(() => {
      const metas = catalogMetas(mounted!.host)
      expect(metas).toContain('sprite.authored.c01alpha')
      expect(metas).not.toContain('sprite.authored.c01beta')
      expect(metas).not.toContain('sprite.authored.c01gamma')
    })
  })

  test('按用途 label 过滤命中 AlphaIdle 所属资产', async () => {
    const project = await multiAssetProject('c01-g02-02')
    mounted = await suite.mount(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await setTextFilter(mounted.host, 'alphaidle')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01alpha'])
    })
  })

  test('按只出现在 catalog 标签里的文字匹配资产', async () => {
    const project = await multiAssetProject('c01-g02-03', { betaLabel: '纸灯专用' })
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setTextFilter(mounted.host, '纸灯专用')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01beta'])
    })
  })

  test('无匹配查询显示空态，清空恢复完整目录', async () => {
    const project = await multiAssetProject('c01-g02-05')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    const before = catalogMetas(mounted.host)
    expect(before).toHaveLength(4)
    await setTextFilter(mounted.host, 'zzz-no-such-sprite')
    expect(mounted.host.querySelector('.insp-empty')?.textContent).toBe('没有匹配的精灵。')
    expect(catalogMetas(mounted.host)).toEqual([])
    await setTextFilter(mounted.host, '')
    expect(catalogMetas(mounted.host)).toEqual(before)
  })

  test('过滤命中后点击仅有行会聚焦该资产', async () => {
    const project = await multiAssetProject('c01-g02-06')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    const beforeFilter = mounted.session.getState()
    await setTextFilter(mounted.host, 'c01gamma')
    expect(mounted.session.getState()).toBe(beforeFilter)
    await vi.waitFor(() =>
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01gamma']),
    )
    await selectAssetRow(mounted, 'sprite.authored.c01gamma')
    await waitMeta(mounted.host, 3, 0)
    expect(mounted.focusHistory.at(-1)?.objectId).toBe('sprite.authored.c01gamma')
  })

  test('用途 id 片段过滤可命中 c01-beta-static 资产', async () => {
    const project = await multiAssetProject('c01-g02-07')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setTextFilter(mounted.host, 'c01-beta-static')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01beta'])
    })
  })

  test('过滤大小写不敏感：ALPHAWALK 命中 alpha 资产', async () => {
    const project = await multiAssetProject('c01-g02-08')
    mounted = await suite.mount(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await setTextFilter(mounted.host, 'ALPHAWALK')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01alpha'])
    })
  })

  test('过滤占位提示保持「名称 / id」', async () => {
    const project = await multiAssetProject('c01-g02-09')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    const input = mounted.host.querySelector<HTMLInputElement>(
      'input[aria-label="过滤大世界精灵库"]',
    )
    expect(input?.placeholder).toBe('名称 / id')
  })
})

describe('用途/行为 kind 过滤（不含自动脚本轴）', () => {
  test('无用途过滤只保留 gamma', async () => {
    const project = await multiAssetProject('c01-g03-01')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setKindFilter(mounted.host, '无用途')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01gamma'])
    })
  })

  test('含四向过滤保留 alpha 排除 beta/gamma', async () => {
    const project = await multiAssetProject('c01-g03-02')
    mounted = await suite.mount(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await setKindFilter(mounted.host, '含四向')
    await vi.waitFor(() => {
      const metas = catalogMetas(mounted!.host)
      expect(metas).toContain('sprite.authored.c01alpha')
      expect(metas).not.toContain('sprite.authored.c01beta')
      expect(metas).not.toContain('sprite.authored.c01gamma')
    })
  })

  test('含默认定格过滤保留 alpha 与 beta', async () => {
    const project = await multiAssetProject('c01-g03-03')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setKindFilter(mounted.host, '含默认定格')
    await vi.waitFor(() => {
      const metas = catalogMetas(mounted!.host)
      expect(metas).toEqual(
        expect.arrayContaining(['sprite.authored.c01alpha', 'sprite.authored.c01beta']),
      )
      expect(metas).not.toContain('sprite.authored.c01gamma')
    })
  })

  test('含预制动作过滤只保留有 poses 的 alpha', async () => {
    const project = await multiAssetProject('c01-g03-04')
    mounted = await suite.mount(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await setKindFilter(mounted.host, '含预制动作')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01alpha'])
    })
  })

  test('含循环动作过滤命中 loopFrom 姿态所在资产', async () => {
    const project = await multiAssetProject('c01-g03-05', { betaAction: true })
    mounted = await suite.mount(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await setKindFilter(mounted.host, '含循环动作')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01alpha'])
    })
  })

  test('全部过滤恢复 authored 三资产', async () => {
    const project = await multiAssetProject('c01-g03-06')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setKindFilter(mounted.host, '无用途')
    await vi.waitFor(() => expect(catalogMetas(mounted!.host)).toHaveLength(1))
    await setKindFilter(mounted.host, '全部')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).toEqual(
        expect.arrayContaining([
          'sprite.authored.c01alpha',
          'sprite.authored.c01beta',
          'sprite.authored.c01gamma',
        ]),
      )
    })
  })

  test('kind=无用途 再叠加文本过滤无匹配时 empty', async () => {
    const project = await multiAssetProject('c01-g03-07')
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setKindFilter(mounted.host, '无用途')
    await setTextFilter(mounted.host, 'alpha')
    await vi.waitFor(() => {
      expect(mounted!.host.querySelector('.insp-empty')?.textContent).toBe('没有匹配的精灵。')
    })
  })

  test('用途过滤和文本过滤都缩小结果，只保留实际交集', async () => {
    const project = await multiAssetProject('catalog-intersection', {
      alphaLabel: '夜景步行',
      gammaLabel: '夜景未配置',
    })
    mounted = await suite.mount(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setKindFilter(mounted.host, '含默认定格')
    expect(catalogMetas(mounted.host)).toEqual([
      'sprite.authored.c01alpha',
      'sprite.authored.c01beta',
    ])
    await setTextFilter(mounted.host, '夜景')
    expect(catalogMetas(mounted.host)).toEqual(['sprite.authored.c01alpha'])
    await setKindFilter(mounted.host, '全部')
    expect(catalogMetas(mounted.host)).toEqual([
      'sprite.authored.c01alpha',
      'sprite.authored.c01gamma',
    ])
  })
})
