// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { createPortal } from 'react-dom'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  DsButton,
  DsCatalogControls,
  DsCatalogFilter,
  DsCatalogGroupEmpty,
  DsCatalogGroupHeader,
  DsCatalogGroupList,
  DsCatalogRow,
  DsCatalogWorkspace,
  DsDiagnosticList,
  DsDiagnosticPanel,
  DsDiagnosticRow,
  DsFieldMeasure,
  DsNumberFieldGrid,
  DsInlineComposer,
  DsInspectorHost,
  DsInspectorPortal,
  DsInspectorSection,
  DsInspectorTabs,
  DsObjectHero,
  DsObjectWorkspace,
  DsPropertyGrid,
  DsPropertyRow,
  DsReadoutList,
  DsReadoutRow,
  DsReferenceGroup,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsRepeatRow,
  DsSelectField,
  DsSequenceIndex,
  DsTag,
  DsWorkbenchSection,
} from './index.js'

function InspectorTabsHarness() {
  const [activeId, setActiveId] = useState('properties')
  return (
    <DsInspectorTabs
      id="entity-inspector"
      label="实体属性分区"
      activeId={activeId}
      onChange={setActiveId}
      items={[
        { id: 'properties', label: '属性', panel: <span>属性内容</span> },
        { id: 'lifecycle', label: '生命周期', count: 79, panel: <span>生命周期内容</span> },
        { id: 'behavior', label: '行为', panel: <span>行为内容</span> },
      ]}
    />
  )
}

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

describe('object workbench recipes', () => {
  test('keeps hero domain differences in slots while retaining one heading contract', async () => {
    await act(async () =>
      root.render(
        <DsObjectHero
          eyebrow="技能"
          title="梦蛇"
          objectId="295"
          media={<span>✨</span>}
          summary="改变战斗形态"
          meta={<DsTag tone="neutral">自身</DsTag>}
          actions={<DsButton variant="secondary">试放</DsButton>}
        />,
      ),
    )
    expect(host.querySelectorAll('h1')).toHaveLength(1)
    expect(host.querySelector('.ds-object-hero__title')?.textContent).toBe('梦蛇')
    expect(host.querySelector('.ds-object-hero__media')?.textContent).toBe('✨')
    expect(host.querySelector('.ds-object-hero__actions')?.textContent).toBe('试放')
    expect(host.querySelector('.ds-object-hero__meta .ds-tag')).not.toBeNull()
    expect(host.querySelector('.ds-object-hero__actions .ds-button')).not.toBeNull()
  })

  test('owns one constrained scroll content region below the object hero', async () => {
    await act(async () =>
      root.render(
        <DsObjectWorkspace
          label="音乐工作区"
          className="domain-workspace"
          contentClassName="domain-scroll"
          hero={<DsObjectHero eyebrow="音乐" title="开场" />}
        >
          <DsWorkbenchSection title="基本信息">内容</DsWorkbenchSection>
        </DsObjectWorkspace>,
      ),
    )
    const workspace = host.querySelector('.ds-object-workspace.domain-workspace')!
    expect(workspace.getAttribute('aria-label')).toBe('音乐工作区')
    expect((workspace as HTMLElement).dataset.dsScrollScope).toBe('main')
    expect(workspace.querySelectorAll(':scope > .ds-object-hero')).toHaveLength(1)
    const content = workspace.querySelector<HTMLElement>(
      ':scope > .ds-object-workspace__content.domain-scroll',
    )!
    expect(content.dataset.dsScrollOwner).toBe('main')
    expect(content.dataset.dsScrollAxis).toBe('y')
    expect(content.querySelectorAll(':scope > .ds-workbench-section')).toHaveLength(1)
  })

  test('catalog row owns selected state, density, and the optional leading slot', async () => {
    const onClick = vi.fn()
    await act(async () =>
      root.render(
        <DsCatalogRow
          selected
          title="李逍遥"
          meta="li-xiaoyao"
          leading={<span>▶</span>}
          onClick={onClick}
        />,
      ),
    )
    const row = host.querySelector<HTMLButtonElement>('.ds-catalog-row')!
    expect(row.getAttribute('aria-pressed')).toBe('true')
    expect(row.dataset.selected).toBe('true')
    expect(row.dataset.density).toBe('standard')
    expect(row.dataset.leading).toBe('present')
    expect(row.querySelector('.ds-catalog-row__leading')?.textContent).toBe('▶')
    await act(async () => row.click())
    expect(onClick).toHaveBeenCalledOnce()

    await act(async () => root.render(<DsCatalogRow density="compact" title="紧凑项" />))
    const compact = host.querySelector<HTMLButtonElement>('.ds-catalog-row')!
    expect(compact.dataset.density).toBe('compact')
    expect(compact.dataset.leading).toBe('none')
  })

  test('catalog filter owns one shrink-safe compact search shell', async () => {
    await act(async () =>
      root.render(<DsCatalogFilter aria-label="搜索地图" placeholder="搜索名称或 ID" />),
    )
    const shell = host.querySelector('.ds-catalog-filter')!
    const input = shell.querySelector<HTMLInputElement>('.ds-input')!
    expect(input.getAttribute('aria-label')).toBe('搜索地图')
    expect(input.classList.contains('ds-input--compact')).toBe(true)
    expect(shell.parentElement).toBe(host)
  })

  test('inline composer owns default and compact density plus bounded number measure', async () => {
    for (const density of ['default', 'compact'] as const) {
      await act(async () =>
        root.render(
          <DsInlineComposer
            density={density}
            control={
              <DsSelectField
                label="添加队员"
                aria-label="添加队员"
                value=""
                options={[]}
                onValueChange={() => {}}
              />
            }
            action={<DsButton icon="add">加入队伍</DsButton>}
          />,
        ),
      )

      const composer = host.querySelector<HTMLElement>('.ds-inline-composer')!
      const select = composer.querySelector('.ds-inline-composer__control .ds-select')!
      const action = composer.querySelector('.ds-inline-composer__action .ds-button')!
      expect(composer.dataset.density).toBe(density)
      expect(select.classList.contains('ds-select--compact')).toBe(density === 'compact')
      expect(action.classList.contains('ds-button--compact')).toBe(density === 'compact')
    }

    await act(async () =>
      root.render(
        <DsRepeatRow density="compact">
          <span>物品</span>
          <DsButton>删除</DsButton>
        </DsRepeatRow>,
      ),
    )
    expect(host.querySelector<HTMLElement>('.ds-repeat-row')?.dataset.density).toBe('compact')

    await act(async () =>
      root.render(
        <DsFieldMeasure measure="short-number">
          <span>当前 HP</span>
        </DsFieldMeasure>,
      ),
    )
    expect(host.querySelector('.ds-field-measure--short-number')?.textContent).toBe('当前 HP')
  })

  test('number field grid owns responsive columns without page-level breakpoints', async () => {
    await act(async () =>
      root.render(
        <DsNumberFieldGrid>
          <span>HP</span>
          <span>MP</span>
        </DsNumberFieldGrid>,
      ),
    )
    const grid = host.querySelector<HTMLElement>('[data-ds-number-field-grid]')!
    expect(grid.classList).toContain('ds-number-field-grid')
    expect(grid.children).toHaveLength(2)
  })

  test('inline composer rejects child-level density overrides', () => {
    expect(() =>
      renderToStaticMarkup(
        <DsInlineComposer
          density="compact"
          control={
            <DsSelectField
              label="添加队员"
              aria-label="添加队员"
              value=""
              options={[]}
              size="default"
              onValueChange={() => {}}
            />
          }
          action={<DsButton>加入队伍</DsButton>}
        />,
      ),
    ).toThrow(/density 只能由 DsInlineComposer 设置/)

    expect(() =>
      renderToStaticMarkup(
        <DsInlineComposer
          density="compact"
          control={
            <DsSelectField
              label="添加队员"
              aria-label="添加队员"
              value=""
              options={[]}
              onValueChange={() => {}}
            />
          }
          action={<DsButton size="compact">加入队伍</DsButton>}
        />,
      ),
    ).toThrow(/density 只能由 DsInlineComposer 设置/)

    expect(() =>
      renderToStaticMarkup(
        <DsRepeatRow density="compact">
          <DsButton size="compact">删除</DsButton>
        </DsRepeatRow>,
      ),
    ).toThrow(/density 只能由 DsRepeatRow 设置/)
  })

  test('catalog controls compose the header, optional scope, search, and adaptive filters', async () => {
    const onCreate = vi.fn()
    await act(async () =>
      root.render(
        <DsCatalogControls
          title="组合库"
          count={12}
          unit="项"
          actions={[{ id: 'create', label: '新建组合', icon: 'add', onClick: onCreate }]}
          scope={<div data-testid="scope">来源域</div>}
          search={{ 'aria-label': '搜索组合模板', placeholder: '搜索名称或 ID' }}
          filters={[
            <div key="category">分类</div>,
            <div key="origin">来源</div>,
            <div key="usage">用途</div>,
          ]}
        />,
      ),
    )

    expect(host.querySelector('.ds-list-header__title')?.textContent).toBe('组合库')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toBe('12 项')
    expect(host.querySelector('.ds-catalog-controls__scope')?.textContent).toBe('来源域')
    expect(
      host
        .querySelector<HTMLInputElement>('.ds-catalog-controls__search input')
        ?.getAttribute('aria-label'),
    ).toBe('搜索组合模板')
    const filters = host.querySelector('.ds-catalog-controls__filters')
    expect(filters?.getAttribute('data-filter-count')).toBe('3')
    expect(filters?.querySelectorAll('.ds-catalog-controls__filter')).toHaveLength(3)

    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="新建组合"]')?.click())
    expect(onCreate).toHaveBeenCalledOnce()
  })

  test('catalog controls omit the body when no scope, search, or filters exist', async () => {
    await act(async () => root.render(<DsCatalogControls title="角色" count={6} unit="位" />))
    expect(host.querySelector('.ds-catalog-controls__body')).toBeNull()
  })

  test('catalog workspace keeps fixed chrome outside one labelled scroll owner', async () => {
    const workspaceRef = vi.fn()
    await act(async () =>
      root.render(
        <DsCatalogWorkspace
          ref={workspaceRef}
          label="物品目录"
          className="domain-catalog"
          contentClassName="domain-catalog__content"
          header={<DsCatalogControls title="物品" count={2} unit="项" />}
        >
          <DsCatalogRow title="观音符" meta="61" />
          <DsCatalogRow title="圣灵符" meta="62" />
        </DsCatalogWorkspace>,
      ),
    )

    const workspace = host.querySelector<HTMLElement>('.ds-catalog-workspace.domain-catalog')!
    expect(workspaceRef).toHaveBeenCalledWith(workspace)
    expect(workspace.dataset.dsScrollScope).toBe('catalog')
    expect(workspace.querySelectorAll(':scope > .ds-catalog-controls')).toHaveLength(1)
    const content = workspace.querySelector<HTMLElement>(
      ':scope > nav.ds-catalog-workspace__content.domain-catalog__content',
    )!
    expect(content.getAttribute('aria-label')).toBe('物品目录')
    expect(content.dataset.dsScrollOwner).toBe('catalog')
    expect(content.dataset.dsScrollAxis).toBe('y')
    expect(content.querySelectorAll(':scope > .ds-catalog-row')).toHaveLength(2)
    expect(content.getAttribute('tabindex')).toBeNull()
  })

  test('catalog controls keep one, two, and three filters in the same adaptive grid contract', async () => {
    for (const count of [1, 2, 3]) {
      await act(async () =>
        root.render(
          <DsCatalogControls
            title="筛选合同"
            count={count}
            unit="项"
            filters={Array.from({ length: count }, (_, index) => (
              <button key={`filter-${index}`} aria-label={`筛选 ${index + 1}`} type="button" />
            ))}
          />,
        ),
      )
      const filters = host.querySelector('.ds-catalog-controls__filters')
      expect(filters?.getAttribute('data-filter-count')).toBe(String(count))
      expect(filters?.querySelectorAll('.ds-catalog-controls__filter')).toHaveLength(count)
    }
  })

  test('catalog controls render search without an empty filter container', async () => {
    await act(async () =>
      root.render(
        <DsCatalogControls
          title="变量"
          count={2}
          unit="项"
          search={{ 'aria-label': '过滤变量名字' }}
        />,
      ),
    )
    expect(host.querySelector('.ds-catalog-controls__body')).not.toBeNull()
    expect(host.querySelector('.ds-catalog-controls__search input')).not.toBeNull()
    expect(host.querySelector('.ds-catalog-controls__filters')).toBeNull()
  })

  test('catalog group header separates collection actions from nested category labels', async () => {
    await act(async () =>
      root.render(
        <>
          <DsCatalogGroupHeader
            title="实体"
            count={32}
            actions={<DsButton variant="secondary">新增</DsButton>}
          />
          <DsCatalogGroupHeader title="预制人物" count={6} level="secondary" />
        </>,
      ),
    )
    const headers = host.querySelectorAll('.ds-catalog-group-header')
    expect(headers).toHaveLength(2)
    expect(headers[0]?.getAttribute('data-level')).toBe('primary')
    expect(headers[0]?.querySelector('.ds-catalog-group-header__title')?.tagName).toBe('H3')
    expect(headers[0]?.querySelector('.ds-catalog-group-header__actions .ds-button')).not.toBeNull()
    expect(headers[1]?.getAttribute('data-level')).toBe('secondary')
    expect(headers[1]?.querySelector('.ds-catalog-group-header__title')?.tagName).toBe('H4')
  })

  test('catalog group list owns nested-row indentation and empty-group rhythm', async () => {
    await act(async () =>
      root.render(
        <DsCatalogGroupList label="问题分组">
          <DsCatalogGroupHeader title="警告" count={1} />
          <DsCatalogRow level="secondary" title="音乐" meta="unused-asset" />
          <DsCatalogGroupEmpty>暂无错误</DsCatalogGroupEmpty>
        </DsCatalogGroupList>,
      ),
    )
    const list = host.querySelector('.ds-catalog-group-list')
    const row = host.querySelector('.ds-catalog-row')
    expect(list?.getAttribute('aria-label')).toBe('问题分组')
    expect(row?.getAttribute('data-level')).toBe('secondary')
    expect(row?.classList.contains('ds-catalog-row--secondary')).toBe(true)
    expect(host.querySelector('.ds-catalog-group-list__empty')?.textContent).toBe('暂无错误')
  })

  test('central and inspector sections use separate semantic recipes', async () => {
    await act(async () =>
      root.render(
        <>
          <DsWorkbenchSection title="基础">字段</DsWorkbenchSection>
          <DsInspectorSection title="引用">2 处</DsInspectorSection>
        </>,
      ),
    )
    expect(host.querySelector('.ds-workbench-section')?.textContent).toContain('字段')
    expect(host.querySelector('.ds-inspector-section')?.textContent).toContain('2 处')
    expect(
      host.querySelector('.ds-inspector-section')?.hasAttribute('data-ds-inspector-host'),
    ).toBe(false)
  })

  test('inspector properties share one compact label/value row contract', async () => {
    await act(async () =>
      root.render(
        <DsInspectorHost>
          <DsInspectorSection title="属性">
            <DsPropertyGrid>
              <DsPropertyRow label="名称" labelFor="property-name">
                <input id="property-name" aria-label="名称" />
              </DsPropertyRow>
              <DsPropertyRow label="稳定 ID" help="创建后保持不变。">
                <code>shared/example</code>
              </DsPropertyRow>
            </DsPropertyGrid>
          </DsInspectorSection>
        </DsInspectorHost>,
      ),
    )
    expect(
      host.querySelector('.ds-property-grid')?.closest('[data-ds-inspector-host]'),
    ).not.toBeNull()
    const rows = host.querySelectorAll('.ds-property-row')
    expect(rows).toHaveLength(2)
    expect(rows[0]?.getAttribute('data-property-label')).toBe('名称')
    expect(rows[0]?.querySelector('label')?.getAttribute('for')).toBe('property-name')
    expect(rows[1]?.querySelector('.ds-property-row__help')?.textContent).toContain('保持不变')
  })

  test('property grids outside an Inspector host fail fast in development', () => {
    expect(() =>
      renderToStaticMarkup(
        <DsPropertyGrid className="main-property-grid-fixture">
          <DsPropertyRow label="主工作区">单列回退</DsPropertyRow>
        </DsPropertyGrid>,
      ),
    ).toThrow('DsPropertyGrid must render inside a real DsInspector host')
  })

  test('property grids cannot inherit Inspector context through an ordinary portal', async () => {
    const outside = document.createElement('div')
    document.body.append(outside)
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(
      act(async () =>
        root.render(
          <DsInspectorHost>
            {createPortal(
              <DsPropertyGrid>
                <DsPropertyRow label="越界">错误目标</DsPropertyRow>
              </DsPropertyGrid>,
              outside,
            )}
          </DsInspectorHost>,
        ),
      ),
    ).rejects.toThrow('DsPropertyGrid must render under a real Inspector DOM host')
    error.mockRestore()
    outside.remove()
  })

  test('Inspector portals reject non-Inspector targets and preserve the compact context', async () => {
    const invalidTarget = document.createElement('div')
    expect(() => DsInspectorPortal({ host: invalidTarget, children: null })).toThrow(
      'DsInspectorPortal target must be inside a DsInspector host',
    )

    const shell = document.createElement('div')
    shell.setAttribute('data-ds-inspector-host', '')
    const target = document.createElement('div')
    shell.append(target)
    document.body.append(shell)
    await act(async () =>
      root.render(
        <DsInspectorPortal host={target}>
          <DsPropertyGrid className="portal-property-grid">
            <DsPropertyRow label="名称">组合</DsPropertyRow>
          </DsPropertyGrid>
        </DsInspectorPortal>,
      ),
    )
    expect(target.querySelector('.portal-property-grid')).not.toBeNull()
    shell.remove()
  })

  test('main readouts keep semantic description-list markup outside the Inspector track', async () => {
    await act(async () =>
      root.render(
        <DsReadoutList>
          <DsReadoutRow label="资源">music.pal.001</DsReadoutRow>
          <DsReadoutRow label="引用">3 处</DsReadoutRow>
        </DsReadoutList>,
      ),
    )
    const list = host.querySelector('dl.ds-readout-list')
    expect(list).not.toBeNull()
    expect(list?.querySelectorAll('dt.ds-readout-row__label')).toHaveLength(2)
    expect(list?.querySelectorAll('dd.ds-readout-row__value')).toHaveLength(2)
    expect(list?.querySelector('.ds-property-grid')).toBeNull()
  })

  test('inspector tabs keep one visible scroll panel and expose linked tab semantics', async () => {
    await act(async () => root.render(<InspectorTabsHarness />))
    const tabs = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    expect(tabs).toHaveLength(3)
    expect(tabs[1]?.querySelector('.ds-tab__label')?.textContent).toBe('生命周期')
    expect(tabs[1]?.querySelector('.ds-tab__count')?.textContent).toBe('79')
    expect(tabs[1]?.textContent).toBe('生命周期 79')
    expect(tabs[0]?.getAttribute('aria-controls')).toBe('entity-inspector-panel-properties')
    expect(
      host.querySelector('#entity-inspector-panel-properties')?.getAttribute('aria-labelledby'),
    ).toBe('entity-inspector-tab-properties')
    expect(host.querySelectorAll('[role="tabpanel"]:not([hidden])')).toHaveLength(1)
    expect(host.querySelectorAll('[role="tabpanel"][hidden]')).toHaveLength(2)
    expect(
      host.querySelectorAll('[role="tabpanel"][data-ds-scroll-owner="inspector"]'),
    ).toHaveLength(1)
    expect(host.querySelector('[role="tabpanel"]:not([hidden])')?.textContent).toBe('属性内容')

    await act(async () => tabs[1]!.click())
    expect(tabs[1]?.getAttribute('aria-selected')).toBe('true')
    expect(host.querySelector('[role="tabpanel"]:not([hidden])')?.textContent).toBe('生命周期内容')

    await act(async () =>
      tabs[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })),
    )
    expect(tabs[2]?.getAttribute('aria-selected')).toBe('true')
    expect(document.activeElement).toBe(tabs[2])

    await act(async () =>
      tabs[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
    )
    expect(document.activeElement).toBe(tabs[0])
    expect(tabs[0]?.getAttribute('aria-selected')).toBe('true')

    await act(async () =>
      tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })),
    )
    expect(document.activeElement).toBe(tabs[2])

    await act(async () =>
      tabs[2]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })),
    )
    expect(document.activeElement).toBe(tabs[0])
  })

  test('workbench section owns one header, action, description, and content contract', async () => {
    await act(async () =>
      root.render(
        <DsWorkbenchSection
          eyebrow="战斗"
          title="基础能力"
          description="编辑角色的基础战斗数值。"
          actions={<DsButton variant="secondary">管理</DsButton>}
          contentClassName="domain-layout"
        >
          <span>内容</span>
        </DsWorkbenchSection>,
      ),
    )
    const section = host.querySelector('.ds-workbench-section')!
    expect(section.querySelectorAll(':scope > .ds-workbench-section__header')).toHaveLength(1)
    expect(section.querySelector('.ds-workbench-section__eyebrow')?.textContent).toBe('战斗')
    expect(section.querySelector('.ds-workbench-section__title')?.tagName).toBe('H2')
    expect(section.querySelector('.ds-workbench-section__description')?.textContent).toContain(
      '基础战斗数值',
    )
    expect(section.querySelector('.ds-workbench-section__actions .ds-button')).not.toBeNull()
    expect(section.querySelector('.ds-workbench-section__content.domain-layout')?.textContent).toBe(
      '内容',
    )
  })

  test('reference rows keep domain content in slots while sharing one interaction contract', async () => {
    const onClick = vi.fn()
    await act(async () =>
      root.render(
        <DsReferenceList>
          <DsReferenceRow
            title="人物 wu-hou"
            detail="初始仙术"
            path="actors[3].battler.initialMagic[0]"
            action={{ label: '打开', onActivate: onClick }}
          />
        </DsReferenceList>,
      ),
    )
    const row = host.querySelector<HTMLButtonElement>('.ds-reference-row')!
    expect(row.querySelector('.ds-reference-row__title')?.textContent).toBe('人物 wu-hou')
    expect(row.querySelector('.ds-reference-row__detail')?.textContent).toBe('初始仙术')
    expect(row.querySelector('.ds-reference-row__path')?.textContent).toBe(
      'actors[3].battler.initialMagic[0]',
    )
    expect(row.querySelector('.ds-reference-row__trailing .ds-icon')).not.toBeNull()
    expect(row.textContent).not.toContain('↗')
    await act(async () => row.click())
    expect(onClick).toHaveBeenCalledOnce()
  })

  test('reference panels expose the complete state and count contract without inventing exact counts', async () => {
    const states = [
      ['ready', { kind: 'exact', value: 3 }],
      ['empty', { kind: 'exact', value: 0 }],
      ['loading', { kind: 'at-least', value: 1 }],
      ['partial', { kind: 'at-least', value: 2 }],
      ['error', { kind: 'unknown' }],
    ] as const
    await act(async () =>
      root.render(
        states.map(([state, count]) => (
          <DsReferencePanel
            key={state}
            state={state}
            count={count}
            impact={{ kind: 'blocking', description: `${state} description` }}
          />
        )),
      ),
    )
    expect(host.querySelectorAll('.ds-reference-panel')).toHaveLength(5)
    expect(host.querySelector('[data-state="ready"]')?.textContent).toContain('3 处引用会阻断删除')
    expect(host.querySelector('[data-state="empty"]')?.textContent).toContain('未发现引用')
    expect(host.querySelector('[data-state="loading"]')?.textContent).toContain('至少 1 处')
    expect(host.querySelector('[data-state="partial"]')?.textContent).toContain('结果不完整')
    expect(host.querySelector('[data-state="error"] [role="alert"]')).not.toBeNull()
    expect(host.querySelector('[data-state="error"]')?.textContent).toContain('数量未知')
  })

  test('reference rows use button, link, or article semantics instead of disabled fake actions', async () => {
    const onActivate = vi.fn()
    await act(async () =>
      root.render(
        <DsReferenceList>
          <DsReferenceRow
            key="button"
            title="可定位命令"
            labels={[{ label: '阻断删除', tone: 'warning' }]}
            action={{ label: '打开', onActivate }}
          />
          <DsReferenceRow
            key="link"
            title="可分享位置"
            action={{ label: '在新页打开', href: '/editor?module=scene' }}
          />
          <DsReferenceRow
            key="static"
            title="只读兼容来源"
            status={{ label: '只读', reason: '没有可编辑的精确位置。' }}
          />
        </DsReferenceList>,
      ),
    )
    const rows = host.querySelectorAll<HTMLElement>('.ds-reference-row')
    expect([...rows].map((row) => row.tagName)).toEqual(['BUTTON', 'A', 'ARTICLE'])
    expect(host.querySelector('.ds-reference-row[disabled]')).toBeNull()
    expect(rows[1]?.getAttribute('href')).toBe('/editor?module=scene')
    expect(rows[2]?.textContent).toContain('没有可编辑的精确位置')
    await act(async () => rows[0]?.click())
    expect(onActivate).toHaveBeenCalledOnce()
  })

  test('reference groups count occurrences while the shared list owns 12-row expansion', async () => {
    await act(async () =>
      root.render(
        <DsReferencePanel
          state="ready"
          count={{ kind: 'exact', value: 14 }}
          impact={{ kind: 'informational', description: '仅供定位。' }}
        >
          <DsReferenceGroup title="场景" count={14}>
            <DsReferenceList>
              {Array.from({ length: 13 }, (_, index) => (
                <DsReferenceRow
                  key={`scene-${index}`}
                  title={`场景 ${index}`}
                  occurrenceCount={index === 0 ? 2 : 1}
                />
              ))}
            </DsReferenceList>
          </DsReferenceGroup>
        </DsReferencePanel>,
      ),
    )
    expect(host.querySelector('.ds-reference-group__count')?.textContent).toBe('14')
    expect(host.querySelectorAll('.ds-reference-row')).toHaveLength(12)
    expect(host.textContent).toContain('2 次')
    await act(async () =>
      [...host.querySelectorAll<HTMLButtonElement>('button')]
        .find((button) => button.textContent?.includes('显示其余 1 条'))
        ?.click(),
    )
    expect(host.querySelectorAll('.ds-reference-row')).toHaveLength(13)
    expect(host.textContent).toContain('收起')
  })

  test('reference rows keep long ids and paths reachable without using them as identity', async () => {
    const longTitle = '一段超过二十个汉字的引用对象名称用于验证完整标题仍然可达'
    const longPath = `scenes[0].${'nested.path.'.repeat(12)}command`
    await act(async () =>
      root.render(<DsReferenceRow title={longTitle} path={longPath} status={{ label: '只读' }} />),
    )
    expect(host.querySelector('.ds-reference-row__title')?.getAttribute('title')).toBe(longTitle)
    expect(host.querySelector('.ds-reference-row__path')?.getAttribute('title')).toBe(longPath)
    expect(host.querySelector('.ds-reference-row__path')?.textContent).toBe(longPath)
  })

  test('diagnostic panels expose ready, clear, partial, and failure without fake exact counts', async () => {
    await act(async () =>
      root.render(
        <>
          <DsDiagnosticPanel state="ready" count={{ kind: 'exact', errors: 2, warnings: 3 }} />
          <DsDiagnosticPanel state="clear" count={{ kind: 'exact', errors: 0, warnings: 0 }} />
          <DsDiagnosticPanel state="partial" count={{ kind: 'at-least', errors: 1, warnings: 4 }} />
          <DsDiagnosticPanel state="failure" count={{ kind: 'unknown' }} />
        </>,
      ),
    )

    expect(host.querySelector('[data-state="ready"]')?.textContent).toContain('2 个错误 · 3 个警告')
    expect(host.querySelector('[data-state="clear"]')?.textContent).toContain('未发现诊断问题')
    expect(host.querySelector('[data-state="partial"]')?.textContent).toContain(
      '至少 1 个错误 · 4 个警告',
    )
    expect(host.querySelector('[data-state="failure"]')?.textContent).toContain('数量未知')
    for (const panel of host.querySelectorAll('.ds-diagnostic-panel'))
      expect(panel.querySelectorAll('[role="status"], [role="alert"]')).toHaveLength(1)
  })

  test('diagnostic panels can defer an exact ready summary without hiding incomplete state', async () => {
    await act(async () =>
      root.render(
        <>
          <DsDiagnosticPanel
            state="ready"
            count={{ kind: 'exact', errors: 0, warnings: 2 }}
            statusOwner="external"
          >
            <span>两条诊断明细</span>
          </DsDiagnosticPanel>
          <DsDiagnosticPanel
            state="partial"
            count={{ kind: 'at-least', errors: 0, warnings: 2 }}
            statusOwner="external"
          />
        </>,
      ),
    )

    const readyPanel = host.querySelector('[data-state="ready"]')
    const partialPanel = host.querySelector('[data-state="partial"]')
    expect(readyPanel?.querySelector('.ds-status')).toBeNull()
    expect(readyPanel?.textContent).toContain('两条诊断明细')
    expect(partialPanel?.querySelector('.ds-status')?.textContent).toContain('结果不完整')
  })

  test('diagnostic rows keep severity text and use real button, link, or article roots', async () => {
    const onActivate = vi.fn()
    const longPath = `manifest.${'deep.path.'.repeat(20)}asset`
    await act(async () =>
      root.render(
        <DsDiagnosticList>
          <DsDiagnosticRow
            severity="error"
            title="资源缺失"
            code="missing-asset"
            path={longPath}
            action={{ label: '跳转', ariaLabel: '跳转到缺失资源', onActivate }}
          />
          <DsDiagnosticRow
            severity="warning"
            title="迁移待核对"
            action={{ label: '在问题面板查看', href: '/editor?module=project' }}
          />
          <DsDiagnosticRow severity="warning" title="只读来源" statusLabel="无法定位" />
        </DsDiagnosticList>,
      ),
    )

    const rows = host.querySelectorAll<HTMLElement>('.ds-diagnostic-row')
    expect([...rows].map((row) => row.tagName)).toEqual(['BUTTON', 'A', 'ARTICLE'])
    expect(rows[0]?.textContent).toMatch(/^错误资源缺失missing-asset/)
    expect(rows[1]?.textContent).toContain('警告迁移待核对')
    expect(rows[2]?.textContent).toContain('无法定位')
    expect(rows[0]?.querySelector('.ds-diagnostic-row__trailing .ds-icon')).not.toBeNull()
    expect(rows[1]?.querySelector('.ds-diagnostic-row__trailing .ds-icon')).not.toBeNull()
    expect(host.textContent).not.toContain('↗')
    expect(host.querySelector('.ds-diagnostic-row[disabled]')).toBeNull()
    expect(rows[0]?.querySelector('button, a')).toBeNull()
    expect(rows[0]?.getAttribute('aria-label')).toBe('跳转到缺失资源')
    expect(host.querySelector('.ds-diagnostic-row__path')?.textContent).toBe(longPath)
    await act(async () => rows[0]?.click())
    expect(onActivate).toHaveBeenCalledOnce()
  })

  test('diagnostic list owns 80-row pagination, show-all, collapse, and stable compact handoff', async () => {
    const rows = Array.from({ length: 152 }, (_, index) => (
      <DsDiagnosticRow
        key={`issue-${index}`}
        severity={index % 2 ? 'warning' : 'error'}
        title={`问题 ${index + 1}`}
      />
    ))
    await act(async () =>
      root.render(
        <DsDiagnosticList layout="adaptive-grid" initialVisibleCount={80} pageSize={80}>
          {rows}
        </DsDiagnosticList>,
      ),
    )
    expect(host.querySelector('.ds-diagnostic-list--adaptive-grid')).not.toBeNull()
    expect(host.querySelectorAll('.ds-diagnostic-row')).toHaveLength(80)
    expect(host.textContent).toContain('已显示 80 / 152 项')
    expect(host.querySelectorAll('[role="status"], [role="alert"]')).toHaveLength(1)

    const click = async (label: string) => {
      const target = [...host.querySelectorAll<HTMLButtonElement>('button')].find((button) =>
        button.textContent?.includes(label),
      )
      await act(async () => target?.click())
    }
    await click('继续显示 72 项')
    expect(host.querySelectorAll('.ds-diagnostic-row')).toHaveLength(152)
    await click('收起至前 80 项')
    expect(host.querySelectorAll('.ds-diagnostic-row')).toHaveLength(80)
    await click('显示全部')
    expect(host.querySelectorAll('.ds-diagnostic-row')).toHaveLength(152)

    const onViewAll = vi.fn()
    await act(async () =>
      root.render(
        <DsDiagnosticList initialVisibleCount={30} pageSize={80} onViewAll={onViewAll}>
          {rows}
        </DsDiagnosticList>,
      ),
    )
    await click('查看全部 152 项')
    expect(onViewAll).toHaveBeenCalledOnce()
    expect(host.querySelectorAll('.ds-diagnostic-row')).toHaveLength(30)
  })

  test('sequence index gives ordered rows a centered numeric marker and accessible label', async () => {
    await act(async () => root.render(<DsSequenceIndex value={12} accessibleLabel="第 12 回合" />))
    const index = host.querySelector('.ds-sequence-index')!
    expect(index.querySelector('[aria-hidden="true"]')?.textContent).toBe('12')
    expect(index.querySelector('.ds-visually-hidden')?.textContent).toBe('第 12 回合')
  })

  test('sequence index can be decorative inside a control with its own accessible name', async () => {
    await act(async () =>
      root.render(
        <button type="button" aria-label="选中攻击阶段">
          <DsSequenceIndex value={3} decorative />
        </button>,
      ),
    )
    const index = host.querySelector('.ds-sequence-index')!
    expect(index.getAttribute('aria-hidden')).toBe('true')
    expect(index.querySelector('.ds-visually-hidden')).toBeNull()
  })
})
