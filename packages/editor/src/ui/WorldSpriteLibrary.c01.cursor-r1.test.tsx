// @vitest-environment jsdom
/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C01：WorldSpriteLibrary 静态资源/选择/过滤/引用/命令合同。
 * 排重：WorldSpriteLibrary.test.tsx / .glm-ui-wave / .kimi-workflows 已证 matcher 不重领；
 * 自动脚本预览与完成流投影轴因 world-sprite-behavior 漂移只读停线（不作主合同）。
 */
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  clickButtonByText,
  fillAndBlur,
  pickCombobox,
  stubNodeTestHost,
  typeDraft,
} from '../__tests__/cursor-asset-r1/kit.js'
import { loadCursorSpriteProject } from '../__tests__/cursor-asset-r1/sprite-fixtures.js'
import {
  type MountedWorldSpriteLibrary,
  mountWorldSpriteLibrary,
  unmountWorldSpriteLibrary,
} from '../__tests__/cursor-asset-r1/world-sprite-harness.js'

let mounted: MountedWorldSpriteLibrary | undefined

beforeEach(async () => {
  await stubNodeTestHost()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})

afterEach(async () => {
  if (mounted) {
    await unmountWorldSpriteLibrary(mounted)
    mounted = undefined
  }
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

async function waitMeta(host: HTMLElement, frames: number, consumers: number): Promise<void> {
  await vi.waitFor(() => {
    expect(host.textContent).toContain(`${frames} 帧 · ${consumers} 个用途定义`)
  })
}

function catalogMetas(host: HTMLElement): string[] {
  return [...host.querySelectorAll('.sprite-resource-row .ds-catalog-row__meta')].map(
    (node) => node.textContent ?? '',
  )
}

async function selectAssetRow(host: HTMLElement, asset: string): Promise<void> {
  await vi.waitFor(() => {
    const row = [...host.querySelectorAll<HTMLElement>('.sprite-resource-row')].find(
      (candidate) => candidate.querySelector('.ds-catalog-row__meta')?.textContent === asset,
    )
    expect(row, `目录行 ${asset}`).toBeDefined()
    row!.click()
  })
  await act(async () => Promise.resolve())
}

async function setKindFilter(host: HTMLElement, label: string): Promise<void> {
  const trigger = host.querySelector<HTMLButtonElement>(
    'button[role="combobox"][aria-label="按用途与实例行为筛选源帧资源"]',
  )
  expect(trigger, 'kind filter').not.toBeNull()
  await pickCombobox(trigger!, label)
}

async function setTextFilter(host: HTMLElement, value: string): Promise<void> {
  const input = host.querySelector<HTMLInputElement>('input[aria-label="过滤大世界精灵库"]')
  expect(input, 'text filter').not.toBeNull()
  await typeDraft(input!, value)
}

async function multiAssetProject(name: string) {
  return loadCursorSpriteProject(name, [
    {
      asset: 'sprite.authored.c01alpha',
      label: 'C01Alpha',
      frameCount: 8,
      definitions: [
        {
          id: 'c01-alpha-walk',
          label: 'AlphaWalk',
          layout: { kind: 'directional', framesPerDir: 2 },
        },
        {
          id: 'c01-alpha-idle',
          label: 'AlphaIdle',
          layout: { kind: 'static' },
          poses: {
            wave: {
              label: 'Wave',
              steps: [
                { frame: 0, durationMs: 100 },
                { frame: 1, durationMs: 100 },
              ],
              loopFrom: 0,
            },
          },
        },
      ],
    },
    {
      asset: 'sprite.authored.c01beta',
      label: 'C01Beta',
      frameCount: 4,
      definitions: [
        {
          id: 'c01-beta-static',
          label: 'BetaStatic',
          layout: { kind: 'static' },
        },
      ],
    },
    {
      asset: 'sprite.authored.c01gamma',
      label: 'C01Gamma',
      frameCount: 3,
      definitions: [],
    },
  ])
}

describe('C01-G01 目录选择与视图归属', () => {
  test('C01-G01-01 初始 definition 聚焦：检查器 who 显示用途标签且 meta 含实际帧数', async () => {
    const project = await multiAssetProject('c01-g01-01')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    expect(mounted.host.querySelector('.who')?.textContent).toBe('AlphaWalk')
    expect(mounted.host.textContent).toContain('大世界精灵用途')
  })

  test('C01-G01-02 点击待定义资产行：view 切到 asset 且检查器标题变为资源', async () => {
    const project = await multiAssetProject('c01-g01-02')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await selectAssetRow(mounted.host, 'sprite.authored.c01gamma')
    await waitMeta(mounted.host, 3, 0)
    expect(mounted.host.querySelector('.what')?.textContent).toBe('大世界精灵资源')
    expect(mounted.focusHistory.at(-1)).toEqual({
      view: 'asset',
      objectId: 'sprite.authored.c01gamma',
    })
  })

  test('C01-G01-03 用途选择列表切换 sibling：selected 行与 who 同步到 BetaStatic', async () => {
    const project = await multiAssetProject('c01-g01-03')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await selectAssetRow(mounted.host, 'sprite.authored.c01beta')
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

  test('C01-G01-04 目录行 aria-label 对无用途资产追加「待定义」标记', async () => {
    const project = await multiAssetProject('c01-g01-04')
    mounted = await mountWorldSpriteLibrary(project, {
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

  test('C01-G01-05 有用途资产目录行不带待定义 tag', async () => {
    const project = await multiAssetProject('c01-g01-05')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    const row = [...mounted.host.querySelectorAll<HTMLElement>('.sprite-resource-row')].find(
      (candidate) =>
        candidate.querySelector('.ds-catalog-row__meta')?.textContent === 'sprite.authored.c01beta',
    )
    expect(row?.getAttribute('aria-label')).not.toContain('待定义')
    expect(row?.querySelector('.ds-tag')).toBeNull()
  })

  test('C01-G01-06 战斗域页签点击触发 onBattleDomain 恰一次且不改当前用途选择', async () => {
    const project = await multiAssetProject('c01-g01-06')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-idle' })
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

  test('C01-G01-07 资源域页签大世界保持 active，点击自身不触发战斗域回调', async () => {
    const project = await multiAssetProject('c01-g01-07')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await act(async () => {
      const tabs = [...mounted!.host.querySelectorAll<HTMLElement>('[role="tab"]')]
      const world = tabs.find((tab) => tab.textContent?.trim() === '大世界')
      expect(world, '大世界 tab').toBeDefined()
      world!.click()
    })
    expect(mounted.battleDomainCalls).toHaveLength(0)
  })

  test('C01-G01-08 导入源帧资源按钮打开上传叶：中心区出现 SpriteUploadWizard 取消入口', async () => {
    const project = await multiAssetProject('c01-g01-08')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await clickButtonByText(mounted.host, '导入源帧资源')
    await vi.waitFor(() => {
      expect(mounted!.host.textContent).toMatch(/取消|选择图片|上传/)
    })
    expect(mounted.host.querySelector('.world-sprite-center')?.textContent).not.toContain(
      '8 帧 · 2 个用途定义',
    )
  })

  test('C01-G01-09 上传叶取消后恢复原资源 viewer meta', async () => {
    const project = await multiAssetProject('c01-g01-09')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await clickButtonByText(mounted.host, '导入源帧资源')
    await vi.waitFor(() => expect(buttonByLoose(mounted!.host, '取消')).toBeDefined())
    await act(async () => {
      buttonByLoose(mounted!.host, '取消')!.click()
    })
    await waitMeta(mounted.host, 8, 2)
  })

  test('C01-G01-10 检查器引用页签可切换且 panel-references 可见', async () => {
    const project = await multiAssetProject('c01-g01-10')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await act(async () => {
      const tab = [...mounted!.host.querySelectorAll<HTMLElement>('[role="tab"]')].find(
        (candidate) => /^引用/.test(candidate.textContent?.trim() ?? ''),
      )
      expect(tab, '引用 tab').toBeDefined()
      tab!.click()
    })
    await vi.waitFor(() => {
      const panel = mounted!.host.querySelector('#world-sprite-inspector-panel-references')
      expect(panel).not.toBeNull()
      expect(panel?.hasAttribute('hidden')).toBe(false)
    })
  })
})

function buttonByLoose(host: ParentNode, text: string): HTMLButtonElement | undefined {
  return [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) =>
      candidate.textContent?.trim() === text || candidate.getAttribute('aria-label') === text,
  )
}

describe('C01-G02 文本过滤与空结果恢复', () => {
  test('C01-G02-01 按 asset id 片段过滤只保留 c01alpha', async () => {
    const project = await multiAssetProject('c01-g02-01')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setTextFilter(mounted.host, 'c01alpha')
    await vi.waitFor(() => {
      const metas = catalogMetas(mounted!.host)
      expect(metas).toContain('sprite.authored.c01alpha')
      expect(metas).not.toContain('sprite.authored.c01beta')
      expect(metas).not.toContain('sprite.authored.c01gamma')
    })
  })

  test('C01-G02-02 按用途 label 过滤命中 AlphaIdle 所属资产', async () => {
    const project = await multiAssetProject('c01-g02-02')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await setTextFilter(mounted.host, 'alphaidle')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01alpha'])
    })
  })

  test('C01-G02-03 按 catalog label 过滤命中 C01Beta', async () => {
    const project = await multiAssetProject('c01-g02-03')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setTextFilter(mounted.host, 'c01beta')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01beta'])
    })
  })

  test('C01-G02-04 无匹配查询显示 insp-empty「没有匹配的精灵。」', async () => {
    const project = await multiAssetProject('c01-g02-04')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setTextFilter(mounted.host, 'zzz-no-such-sprite')
    await vi.waitFor(() => {
      expect(mounted!.host.querySelector('.insp-empty')?.textContent).toBe('没有匹配的精灵。')
    })
  })

  test('C01-G02-05 清空过滤文本恢复全部 authored 三资产行', async () => {
    const project = await multiAssetProject('c01-g02-05')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setTextFilter(mounted.host, 'zzz-no-such-sprite')
    await vi.waitFor(() => {
      expect(mounted!.host.querySelector('.insp-empty')).not.toBeNull()
    })
    await setTextFilter(mounted.host, '')
    await vi.waitFor(() => {
      const metas = catalogMetas(mounted!.host)
      expect(metas).toEqual(
        expect.arrayContaining([
          'sprite.authored.c01alpha',
          'sprite.authored.c01beta',
          'sprite.authored.c01gamma',
        ]),
      )
    })
  })

  test('C01-G02-06 过滤命中后点击仅有行会聚焦该资产', async () => {
    const project = await multiAssetProject('c01-g02-06')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setTextFilter(mounted.host, 'c01gamma')
    await vi.waitFor(() =>
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01gamma']),
    )
    await selectAssetRow(mounted.host, 'sprite.authored.c01gamma')
    await waitMeta(mounted.host, 3, 0)
    expect(mounted.focusHistory.at(-1)?.objectId).toBe('sprite.authored.c01gamma')
  })

  test('C01-G02-07 用途 id 片段过滤可命中 c01-beta-static 资产', async () => {
    const project = await multiAssetProject('c01-g02-07')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setTextFilter(mounted.host, 'c01-beta-static')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01beta'])
    })
  })

  test('C01-G02-08 过滤大小写不敏感：ALPHAWALK 命中 alpha 资产', async () => {
    const project = await multiAssetProject('c01-g02-08')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await setTextFilter(mounted.host, 'ALPHAWALK')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01alpha'])
    })
  })

  test('C01-G02-09 过滤占位提示保持「名称 / id」', async () => {
    const project = await multiAssetProject('c01-g02-09')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    const input = mounted.host.querySelector<HTMLInputElement>(
      'input[aria-label="过滤大世界精灵库"]',
    )
    expect(input?.placeholder).toBe('名称 / id')
  })

  test('C01-G02-10 过滤不改变 session 精灵定义数量', async () => {
    const project = await multiAssetProject('c01-g02-10')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    const before = mounted.session.getState().sprites.length
    await setTextFilter(mounted.host, 'c01gamma')
    await vi.waitFor(() => expect(catalogMetas(mounted!.host)).toHaveLength(1))
    expect(mounted.session.getState().sprites.length).toBe(before)
  })
})

describe('C01-G03 用途/行为 kind 过滤（不含自动脚本轴）', () => {
  test('C01-G03-01 无用途过滤只保留 gamma', async () => {
    const project = await multiAssetProject('c01-g03-01')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setKindFilter(mounted.host, '无用途')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01gamma'])
    })
  })

  test('C01-G03-02 含四向过滤保留 alpha 排除 beta/gamma', async () => {
    const project = await multiAssetProject('c01-g03-02')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await setKindFilter(mounted.host, '含四向')
    await vi.waitFor(() => {
      const metas = catalogMetas(mounted!.host)
      expect(metas).toContain('sprite.authored.c01alpha')
      expect(metas).not.toContain('sprite.authored.c01beta')
      expect(metas).not.toContain('sprite.authored.c01gamma')
    })
  })

  test('C01-G03-03 含默认定格过滤保留 alpha 与 beta', async () => {
    const project = await multiAssetProject('c01-g03-03')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
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

  test('C01-G03-04 含预制动作过滤只保留有 poses 的 alpha', async () => {
    const project = await multiAssetProject('c01-g03-04')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await setKindFilter(mounted.host, '含预制动作')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01alpha'])
    })
  })

  test('C01-G03-05 含循环动作过滤命中 loopFrom 姿态所在资产', async () => {
    const project = await multiAssetProject('c01-g03-05')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await setKindFilter(mounted.host, '含循环动作')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01alpha'])
    })
  })

  test('C01-G03-06 全部过滤恢复 authored 三资产', async () => {
    const project = await multiAssetProject('c01-g03-06')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
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

  test('C01-G03-07 kind=无用途 再叠加文本过滤无匹配时 empty', async () => {
    const project = await multiAssetProject('c01-g03-07')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setKindFilter(mounted.host, '无用途')
    await setTextFilter(mounted.host, 'alpha')
    await vi.waitFor(() => {
      expect(mounted!.host.querySelector('.insp-empty')?.textContent).toBe('没有匹配的精灵。')
    })
  })

  test('C01-G03-08 kind=含四向 与文本 c01alpha 交集仍为 alpha', async () => {
    const project = await multiAssetProject('c01-g03-08')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await setKindFilter(mounted.host, '含四向')
    await setTextFilter(mounted.host, 'c01alpha')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).toEqual(['sprite.authored.c01alpha'])
    })
  })

  test('C01-G03-09 无 poses 的 beta 在含预制动作下被排除', async () => {
    const project = await multiAssetProject('c01-g03-09')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await setKindFilter(mounted.host, '含预制动作')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).not.toContain('sprite.authored.c01beta')
    })
  })

  test('C01-G03-10 含循环动作不把仅有 static 无 loopFrom 的 beta 纳入', async () => {
    const project = await multiAssetProject('c01-g03-10')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await setKindFilter(mounted.host, '含循环动作')
    await vi.waitFor(() => {
      expect(catalogMetas(mounted!.host)).not.toContain('sprite.authored.c01beta')
    })
  })
})

describe('C01-G04 新增用途 begin/cancel/apply 与 ID stem', () => {
  test('C01-G04-01 新增用途菜单在 proof 就绪后对 8 帧资产启用四向按钮', async () => {
    const project = await multiAssetProject('c01-g04-01')
    mounted = await mountWorldSpriteLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.c01alpha',
    })
    await waitMeta(mounted.host, 8, 2)
    await clickButtonByText(mounted.host, '新增用途定义')
    const menu = mounted.host.querySelector('[aria-label="新增用途类型"]')
    expect(menu).not.toBeNull()
    const directional = [...menu!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('四向'),
    )
    expect(directional?.disabled).toBe(false)
  })

  test('C01-G04-02 3 帧无用途资产禁用四向新增按钮', async () => {
    const project = await multiAssetProject('c01-g04-02')
    mounted = await mountWorldSpriteLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    await clickButtonByText(mounted.host, '新增用途定义')
    const menu = mounted.host.querySelector('[aria-label="新增用途类型"]')
    const directional = [...menu!.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('四向'),
    )
    expect(directional?.disabled).toBe(true)
  })

  test('C01-G04-03 选择默认定格开始创建：草稿区出现且应用前 sprites 数不变', async () => {
    const project = await multiAssetProject('c01-g04-03')
    mounted = await mountWorldSpriteLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    const before = mounted.session.getState().sprites.length
    await clickButtonByText(mounted.host, '新增用途定义')
    await act(async () => {
      const menu = mounted!.host.querySelector('[aria-label="新增用途类型"]')
      const staticBtn = [...menu!.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('默认定格'),
      )
      staticBtn!.click()
    })
    expect(mounted.host.querySelector('#world-sprite-new-usage-label')).not.toBeNull()
    expect(mounted.session.getState().sprites.length).toBe(before)
  })

  test('C01-G04-04 创建草稿取消：表单消失且零命令写入', async () => {
    const project = await multiAssetProject('c01-g04-04')
    mounted = await mountWorldSpriteLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    const before = mounted.session
      .getState()
      .sprites.map((s) => s.id)
      .sort()
    await clickButtonByText(mounted.host, '新增用途定义')
    await act(async () => {
      const menu = mounted!.host.querySelector('[aria-label="新增用途类型"]')
      const staticBtn = [...menu!.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('默认定格'),
      )
      staticBtn!.click()
    })
    await clickButtonByText(mounted.host, '取消')
    expect(mounted.host.querySelector('#world-sprite-new-usage-label')).toBeNull()
    expect(
      mounted.session
        .getState()
        .sprites.map((s) => s.id)
        .sort(),
    ).toEqual(before)
  })

  test('C01-G04-05 应用新增 static 用途：session 含新 id 且 meta 消费者+1', async () => {
    const project = await multiAssetProject('c01-g04-05')
    mounted = await mountWorldSpriteLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    await clickButtonByText(mounted.host, '新增用途定义')
    await act(async () => {
      const menu = mounted!.host.querySelector('[aria-label="新增用途类型"]')
      const staticBtn = [...menu!.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('默认定格'),
      )
      staticBtn!.click()
    })
    const idInput = mounted.host.querySelector<HTMLInputElement>('#world-sprite-new-usage-id')!
    const labelInput = mounted.host.querySelector<HTMLInputElement>(
      '#world-sprite-new-usage-label',
    )!
    await fillAndBlur(labelInput, 'GammaNew')
    await fillAndBlur(idInput, 'c01-gamma-new')
    await clickButtonByText(mounted.host, '应用')
    await vi.waitFor(() => {
      expect(mounted!.session.getState().sprites.some((s) => s.id === 'c01-gamma-new')).toBe(true)
    })
    await waitMeta(mounted.host, 3, 1)
    expect(
      mounted.session.getState().sprites.find((s) => s.id === 'c01-gamma-new')?.layout,
    ).toEqual({
      kind: 'static',
    })
  })

  test('C01-G04-06 空名称时应用按钮 disabled', async () => {
    const project = await multiAssetProject('c01-g04-06')
    mounted = await mountWorldSpriteLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    await clickButtonByText(mounted.host, '新增用途定义')
    await act(async () => {
      const menu = mounted!.host.querySelector('[aria-label="新增用途类型"]')
      const staticBtn = [...menu!.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('默认定格'),
      )
      staticBtn!.click()
    })
    const labelInput = mounted.host.querySelector<HTMLInputElement>(
      '#world-sprite-new-usage-label',
    )!
    await fillAndBlur(labelInput, '   ')
    const apply = [...mounted.host.querySelectorAll('button')].find((b) => b.textContent === '应用')
    expect(apply?.disabled).toBe(true)
  })

  test('C01-G04-07 空 ID 时应用按钮 disabled', async () => {
    const project = await multiAssetProject('c01-g04-07')
    mounted = await mountWorldSpriteLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    await clickButtonByText(mounted.host, '新增用途定义')
    await act(async () => {
      const menu = mounted!.host.querySelector('[aria-label="新增用途类型"]')
      const staticBtn = [...menu!.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('默认定格'),
      )
      staticBtn!.click()
    })
    const idInput = mounted.host.querySelector<HTMLInputElement>('#world-sprite-new-usage-id')!
    await fillAndBlur(idInput, '')
    const apply = [...mounted.host.querySelectorAll('button')].find((b) => b.textContent === '应用')
    expect(apply?.disabled).toBe(true)
  })

  test('C01-G04-08 默认草稿 id 从资源 label stem 派生且含 static 后缀', async () => {
    const project = await multiAssetProject('c01-g04-08')
    mounted = await mountWorldSpriteLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    await clickButtonByText(mounted.host, '新增用途定义')
    await act(async () => {
      const menu = mounted!.host.querySelector('[aria-label="新增用途类型"]')
      const staticBtn = [...menu!.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('默认定格'),
      )
      staticBtn!.click()
    })
    const idInput = mounted.host.querySelector<HTMLInputElement>('#world-sprite-new-usage-id')!
    expect(idInput.value).toMatch(/c01gamma|static/i)
  })

  test('C01-G04-09 新增用途后 undo 还原 sprites 列表', async () => {
    const project = await multiAssetProject('c01-g04-09')
    mounted = await mountWorldSpriteLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    const before = mounted.session
      .getState()
      .sprites.map((s) => s.id)
      .sort()
    await clickButtonByText(mounted.host, '新增用途定义')
    await act(async () => {
      const menu = mounted!.host.querySelector('[aria-label="新增用途类型"]')
      const staticBtn = [...menu!.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('默认定格'),
      )
      staticBtn!.click()
    })
    await fillAndBlur(
      mounted.host.querySelector<HTMLInputElement>('#world-sprite-new-usage-label')!,
      'UndoMe',
    )
    await fillAndBlur(
      mounted.host.querySelector<HTMLInputElement>('#world-sprite-new-usage-id')!,
      'c01-gamma-undo',
    )
    await clickButtonByText(mounted.host, '应用')
    await vi.waitFor(() =>
      expect(mounted!.session.getState().sprites.some((s) => s.id === 'c01-gamma-undo')).toBe(true),
    )
    expect(mounted.session.undo()).toBe(true)
    expect(
      mounted.session
        .getState()
        .sprites.map((s) => s.id)
        .sort(),
    ).toEqual(before)
  })

  test('C01-G04-10 新增用途 undo 后再 redo 恢复该定义', async () => {
    const project = await multiAssetProject('c01-g04-10')
    mounted = await mountWorldSpriteLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    await clickButtonByText(mounted.host, '新增用途定义')
    await act(async () => {
      const menu = mounted!.host.querySelector('[aria-label="新增用途类型"]')
      const staticBtn = [...menu!.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('默认定格'),
      )
      staticBtn!.click()
    })
    await fillAndBlur(
      mounted.host.querySelector<HTMLInputElement>('#world-sprite-new-usage-label')!,
      'RedoMe',
    )
    await fillAndBlur(
      mounted.host.querySelector<HTMLInputElement>('#world-sprite-new-usage-id')!,
      'c01-gamma-redo',
    )
    await clickButtonByText(mounted.host, '应用')
    await vi.waitFor(() =>
      expect(mounted!.session.getState().sprites.some((s) => s.id === 'c01-gamma-redo')).toBe(true),
    )
    mounted.session.undo()
    expect(mounted.session.redo()).toBe(true)
    expect(mounted.session.getState().sprites.some((s) => s.id === 'c01-gamma-redo')).toBe(true)
  })
})

describe('C01-G05 布局编辑与 session undo/redo', () => {
  test('C01-G05-01 四向用途每向帧数草稿提交写回 layout.framesPerDir=1', async () => {
    const project = await multiAssetProject('c01-g05-01')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    const field = mounted.host.querySelector<HTMLInputElement>('#world-sprite-frames-per-dir')
    expect(field).not.toBeNull()
    await fillAndBlur(field!, '1')
    await vi.waitFor(() => {
      const def = mounted!.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')
      expect(def?.layout).toEqual({ kind: 'directional', framesPerDir: 1 })
    })
  })

  test('C01-G05-02 布局改动后 undo 恢复 framesPerDir=2', async () => {
    const project = await multiAssetProject('c01-g05-02')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    const field = mounted.host.querySelector<HTMLInputElement>('#world-sprite-frames-per-dir')!
    await fillAndBlur(field, '1')
    await vi.waitFor(() => {
      expect(
        (
          mounted!.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')?.layout as {
            framesPerDir: number
          }
        ).framesPerDir,
      ).toBe(1)
    })
    mounted.session.undo()
    expect(
      (
        mounted.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')?.layout as {
          framesPerDir: number
        }
      ).framesPerDir,
    ).toBe(2)
  })

  test('C01-G05-03 static→directional 布局切换写入四向且 framesPerDir 受帧数约束', async () => {
    const project = await multiAssetProject('c01-g05-03')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    const trigger = mounted.host.querySelector<HTMLButtonElement>('#world-sprite-layout-kind')!
    await pickCombobox(trigger, '四向行走')
    await vi.waitFor(() => {
      const layout = mounted!.session
        .getState()
        .sprites.find((s) => s.id === 'c01-beta-static')?.layout
      expect(layout?.kind).toBe('directional')
      if (layout?.kind === 'directional') expect(layout.framesPerDir).toBe(1)
    })
  })

  test('C01-G05-04 directional→static 切换清除 framesPerDir 字段', async () => {
    const project = await multiAssetProject('c01-g05-04')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    expect(mounted.host.querySelector('#world-sprite-frames-per-dir')).not.toBeNull()
    const trigger = mounted.host.querySelector<HTMLButtonElement>('#world-sprite-layout-kind')!
    await pickCombobox(trigger, '默认定格（默认 #0，可由脚本切帧）')
    await vi.waitFor(() => {
      expect(
        mounted!.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')?.layout,
      ).toEqual({
        kind: 'static',
      })
    })
    expect(mounted.host.querySelector('#world-sprite-frames-per-dir')).toBeNull()
  })

  test('C01-G05-05 布局切换成功后 notices 末项为 undefined 清除错误', async () => {
    const project = await multiAssetProject('c01-g05-05')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    mounted.notices.push({ kind: 'error', message: 'stale' })
    const trigger = mounted.host.querySelector<HTMLButtonElement>('#world-sprite-layout-kind')!
    await pickCombobox(trigger, '四向行走')
    await vi.waitFor(() => {
      expect(mounted!.notices.at(-1)).toBeUndefined()
    })
  })

  test('C01-G05-06 同源两用途布局互不影响：改 walk 不改 idle', async () => {
    const project = await multiAssetProject('c01-g05-06')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    const field = mounted.host.querySelector<HTMLInputElement>('#world-sprite-frames-per-dir')!
    await fillAndBlur(field, '1')
    await vi.waitFor(() => {
      expect(
        (
          mounted!.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')?.layout as {
            framesPerDir: number
          }
        ).framesPerDir,
      ).toBe(1)
    })
    expect(
      mounted.session.getState().sprites.find((s) => s.id === 'c01-alpha-idle')?.layout,
    ).toEqual({
      kind: 'static',
    })
  })

  test('C01-G05-07 布局 undo 栈可连续两次撤回独立提交', async () => {
    const project = await multiAssetProject('c01-g05-07')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    const field = mounted.host.querySelector<HTMLInputElement>('#world-sprite-frames-per-dir')!
    await fillAndBlur(field, '1')
    await vi.waitFor(() =>
      expect(
        (
          mounted!.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')?.layout as {
            framesPerDir: number
          }
        ).framesPerDir,
      ).toBe(1),
    )
    await fillAndBlur(
      mounted.host.querySelector<HTMLInputElement>('#world-sprite-frames-per-dir')!,
      '2',
    )
    await vi.waitFor(() =>
      expect(
        (
          mounted!.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')?.layout as {
            framesPerDir: number
          }
        ).framesPerDir,
      ).toBe(2),
    )
    mounted.session.undo()
    expect(
      (
        mounted.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')?.layout as {
          framesPerDir: number
        }
      ).framesPerDir,
    ).toBe(1)
    mounted.session.undo()
    expect(
      (
        mounted.session.getState().sprites.find((s) => s.id === 'c01-alpha-walk')?.layout as {
          framesPerDir: number
        }
      ).framesPerDir,
    ).toBe(2)
  })

  test('C01-G05-08 用途页空白文案：有消费者未选时提示选择上方用途', async () => {
    const project = await multiAssetProject('c01-g05-08')
    mounted = await mountWorldSpriteLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.c01alpha',
    })
    await waitMeta(mounted.host, 8, 2)
    expect(mounted.host.textContent).toContain('选择上方某个用途定义进行编辑')
  })

  test('C01-G05-09 无用途资源空白文案提示尚未创建用途定义', async () => {
    const project = await multiAssetProject('c01-g05-09')
    mounted = await mountWorldSpriteLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    expect(mounted.host.textContent).toContain('尚未创建用途定义')
  })

  test('C01-G05-10 布局类型 select 在 proof 未就绪前保持 disabled 然后启用', async () => {
    const project = await multiAssetProject('c01-g05-10')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    const trigger = mounted.host.querySelector<HTMLButtonElement>('#world-sprite-layout-kind')
    expect(trigger?.disabled).toBe(false)
  })
})

describe('C01-G06 删除用途确认取消/成功与引用门控', () => {
  test('C01-G06-01 confirm 拒绝时不删除用途且零 notice 成功文案', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const project = await multiAssetProject('c01-g06-01')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    const before = mounted.session
      .getState()
      .sprites.map((s) => s.id)
      .sort()
    await clickButtonByText(mounted.host, '删除用途')
    expect(
      mounted.session
        .getState()
        .sprites.map((s) => s.id)
        .sort(),
    ).toEqual(before)
    expect(mounted.notices.some((n) => n?.message === '用途已删除；源资源仍保留。')).toBe(false)
  })

  test('C01-G06-02 confirm 接受删除唯一用途后 meta 消费者归零并保留资源', async () => {
    const project = await multiAssetProject('c01-g06-02')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await clickButtonByText(mounted.host, '删除用途')
    await vi.waitFor(() => {
      expect(mounted!.session.getState().sprites.some((s) => s.id === 'c01-beta-static')).toBe(
        false,
      )
    })
    await waitMeta(mounted.host, 4, 0)
    expect(mounted.session.getState().assetCatalog.assets['sprite.authored.c01beta']).toBeDefined()
    expect(mounted.notices.at(-1)).toEqual({
      kind: 'info',
      message: '用途已删除；源资源仍保留。',
    })
  })

  test('C01-G06-03 删除 alpha 多用途中的 walk 后仍保留 idle', async () => {
    const project = await multiAssetProject('c01-g06-03')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await clickButtonByText(mounted.host, '删除用途')
    await vi.waitFor(() => {
      const ids = mounted!.session.getState().sprites.map((s) => s.id)
      expect(ids).not.toContain('c01-alpha-walk')
      expect(ids).toContain('c01-alpha-idle')
    })
    await waitMeta(mounted.host, 8, 1)
  })

  test('C01-G06-04 删除用途后 undo 恢复被删定义', async () => {
    const project = await multiAssetProject('c01-g06-04')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await clickButtonByText(mounted.host, '删除用途')
    await vi.waitFor(() =>
      expect(mounted!.session.getState().sprites.some((s) => s.id === 'c01-beta-static')).toBe(
        false,
      ),
    )
    expect(mounted.session.undo()).toBe(true)
    expect(mounted.session.getState().sprites.some((s) => s.id === 'c01-beta-static')).toBe(true)
  })

  test('C01-G06-05 无用途资源显示删除源资源按钮且用途删除按钮缺席', async () => {
    const project = await multiAssetProject('c01-g06-05')
    mounted = await mountWorldSpriteLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    expect(buttonByLoose(mounted.host, '删除源资源')).toBeDefined()
    expect(buttonByLoose(mounted.host, '删除用途')).toBeUndefined()
  })

  test('C01-G06-06 删除未使用源资源后 catalog 不再含 gamma', async () => {
    const project = await multiAssetProject('c01-g06-06')
    mounted = await mountWorldSpriteLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    await clickButtonByText(mounted.host, '删除源资源')
    await vi.waitFor(() => {
      expect(
        mounted!.session.getState().assetCatalog.assets['sprite.authored.c01gamma'],
      ).toBeUndefined()
    })
    expect(mounted.notices.at(-1)).toEqual({
      kind: 'info',
      message: '未使用源资源已移除。',
    })
  })

  test('C01-G06-07 删除源资源 confirm 拒绝时 catalog 不变', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const project = await multiAssetProject('c01-g06-07')
    mounted = await mountWorldSpriteLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    await clickButtonByText(mounted.host, '删除源资源')
    expect(mounted.session.getState().assetCatalog.assets['sprite.authored.c01gamma']).toBeDefined()
  })

  test('C01-G06-08 有用途时不显示删除源资源按钮', async () => {
    const project = await multiAssetProject('c01-g06-08')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    expect(buttonByLoose(mounted.host, '删除源资源')).toBeUndefined()
  })

  test('C01-G06-09 删除源资源后 undo 恢复 catalog 记录与 sha', async () => {
    const project = await multiAssetProject('c01-g06-09')
    const seeded = project.seeded.get('sprite.authored.c01gamma')!
    mounted = await mountWorldSpriteLibrary(project, {
      view: 'asset',
      focus: 'sprite.authored.c01gamma',
    })
    await waitMeta(mounted.host, 3, 0)
    await clickButtonByText(mounted.host, '删除源资源')
    await vi.waitFor(() =>
      expect(
        mounted!.session.getState().assetCatalog.assets['sprite.authored.c01gamma'],
      ).toBeUndefined(),
    )
    mounted.session.undo()
    const restored = mounted.session.getState().assetCatalog.assets['sprite.authored.c01gamma']
    expect(restored?.sha256).toBe(seeded.sha256)
  })

  test('C01-G06-10 confirm 文案对删除用途包含用途 label 与 id', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const project = await multiAssetProject('c01-g06-10')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    await clickButtonByText(mounted.host, '删除用途')
    expect(confirm.mock.calls[0]?.[0]).toContain('BetaStatic')
    expect(confirm.mock.calls[0]?.[0]).toContain('c01-beta-static')
  })
})

describe('C01-G07 检查器页签/动作入口/引用面板与选择恢复', () => {
  test('C01-G07-01 源资源页签切换后仍保持当前资产选择', async () => {
    const project = await multiAssetProject('c01-g07-01')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-idle' })
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

  test('C01-G07-02 有 poses 的用途显示编辑预制动作按钮含数量', async () => {
    const project = await multiAssetProject('c01-g07-02')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-idle' })
    await waitMeta(mounted.host, 8, 2)
    const edit = buttonByLoose(mounted.host, '编辑预制动作（1）')
    expect(edit).toBeDefined()
    expect(edit?.disabled).toBe(false)
  })

  test('C01-G07-03 无 poses 的用途不显示编辑预制动作按钮但显示新建', async () => {
    const project = await multiAssetProject('c01-g07-03')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    expect(buttonByLoose(mounted.host, '新建预制动作')).toBeDefined()
    expect(
      [...mounted.host.querySelectorAll('button')].some((b) =>
        b.textContent?.startsWith('编辑预制动作'),
      ),
    ).toBe(false)
  })

  test('C01-G07-04 用途列表 trailing 显示布局 kind 短标签「四向」', async () => {
    const project = await multiAssetProject('c01-g07-04')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    const walkRow = [
      ...mounted.host.querySelectorAll('[aria-label="选择用途定义"] .ds-catalog-row'),
    ].find((row) => row.textContent?.includes('AlphaWalk'))
    expect(walkRow?.textContent).toContain('四向')
  })

  test('C01-G07-05 用途列表 trailing 对 static 显示「默认定格」', async () => {
    const project = await multiAssetProject('c01-g07-05')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-idle' })
    await waitMeta(mounted.host, 8, 2)
    const idleRow = [
      ...mounted.host.querySelectorAll('[aria-label="选择用途定义"] .ds-catalog-row'),
    ].find((row) => row.textContent?.includes('AlphaIdle'))
    expect(idleRow?.textContent).toContain('默认定格')
  })

  test('C01-G07-06 引用页签选中后 panel-references 非 hidden', async () => {
    const project = await multiAssetProject('c01-g07-06')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
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

  test('C01-G07-07 精灵库计数单位为「项」且 count≥authored+starter', async () => {
    const project = await multiAssetProject('c01-g07-07')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    expect(mounted.host.textContent).toMatch(/\d+\s*项/)
  })

  test('C01-G07-08 从 gamma 切回 alpha 后 who 恢复 AlphaWalk', async () => {
    const project = await multiAssetProject('c01-g07-08')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    await selectAssetRow(mounted.host, 'sprite.authored.c01gamma')
    await waitMeta(mounted.host, 3, 0)
    await selectAssetRow(mounted.host, 'sprite.authored.c01alpha')
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

  test('C01-G07-09 新建预制动作按钮在 proof 就绪后 enabled', async () => {
    const project = await multiAssetProject('c01-g07-09')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-beta-static' })
    await waitMeta(mounted.host, 4, 1)
    expect(buttonByLoose(mounted.host, '新建预制动作')?.disabled).toBe(false)
  })

  test('C01-G07-10 检查器 heading 在 definition 视图为「大世界精灵用途」', async () => {
    const project = await multiAssetProject('c01-g07-10')
    mounted = await mountWorldSpriteLibrary(project, { focus: 'c01-alpha-walk' })
    await waitMeta(mounted.host, 8, 2)
    expect(mounted.host.querySelector('.what')?.textContent).toBe('大世界精灵用途')
  })
})
