// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, test } from 'vitest'
import { DsCard } from './card.js'
import * as controls from './controls.js'
import { DsEmptyState, DsStatus } from './feedback.js'
import { DsTabs } from './tabs.js'

describe('U12 tabs card feedback', () => {
  test('keeps tabs, card, and status identity with tablist and alert roles', () => {
    expect(controls.DsTabs).toBe(DsTabs)
    expect(controls.DsCard).toBe(DsCard)
    expect(controls.DsStatus).toBe(DsStatus)
    expect(controls.DsEmptyState).toBe(DsEmptyState)

    const tabsHost = document.createElement('div')
    tabsHost.innerHTML = renderToStaticMarkup(
      <DsTabs
        label="视图"
        activeId="a"
        onChange={() => {}}
        items={[
          { id: 'a', label: '列表' },
          { id: 'b', label: '网格' },
        ]}
      />,
    )
    expect(tabsHost.querySelector('[role="tablist"]')).not.toBeNull()

    expect(renderToStaticMarkup(<DsCard title="面板">内容</DsCard>)).toContain('ds-card__title')
    expect(renderToStaticMarkup(<DsStatus tone="error">失败</DsStatus>)).toContain('role="alert"')
    expect(renderToStaticMarkup(<DsEmptyState title="空" description="暂无" />)).toContain(
      'ds-empty-state',
    )
  })
})
