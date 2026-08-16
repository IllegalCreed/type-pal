// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  DsButton,
  DsCatalogFilter,
  DsCatalogGroupHeader,
  DsCatalogRow,
  DsInspectorSection,
  DsInspectorTabs,
  DsObjectHero,
  DsReferenceList,
  DsReferenceRow,
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

  test('catalog row exposes one selected-state contract and preserves button behavior', async () => {
    const onClick = vi.fn()
    await act(async () =>
      root.render(<DsCatalogRow selected title="李逍遥" meta="li-xiaoyao" onClick={onClick} />),
    )
    const row = host.querySelector<HTMLButtonElement>('.ds-catalog-row')!
    expect(row.getAttribute('aria-pressed')).toBe('true')
    expect(row.dataset.selected).toBe('true')
    await act(async () => row.click())
    expect(onClick).toHaveBeenCalledOnce()
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
            onClick={onClick}
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
    await act(async () => row.click())
    expect(onClick).toHaveBeenCalledOnce()
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
