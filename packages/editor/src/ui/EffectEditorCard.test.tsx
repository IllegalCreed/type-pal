// @vitest-environment jsdom

import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { DsButton, DsSelect } from './design-system/controls.js'
import { DsReorderCollection } from './design-system/reorder.js'
import { EffectEditorCard, EffectEditorChain } from './EffectEditorCard.js'

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true })

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

type Entry = { key: string; kind: string }

function Harness(props: { initial?: Entry[] }) {
  const [entries, setEntries] = useState(
    props.initial ?? [
      { key: 'a', kind: 'healHp' },
      { key: 'b', kind: 'applyStatus' },
      { key: 'c', kind: 'gate' },
    ],
  )
  return (
    <EffectEditorChain family="test/effects" label="测试效果链">
      <DsReorderCollection
        adoptionId="test/effects"
        scopeKey="test:effects"
        entries={entries.map((entry) => ({ key: entry.key, label: entry.kind }))}
        revision={0}
        onReorder={() => false}
      >
        <ol className="effect-editor-list">
          {entries.map((entry, index) => (
            <EffectEditorCard
              key={entry.key}
              itemKey={entry.key}
              label={`效果 ${index + 1}`}
              density={index === 0 ? 'default' : 'compact'}
              effectKind={entry.kind}
              kindControl={
                <DsSelect
                  aria-label={`类型 ${entry.key}`}
                  value={entry.kind}
                  options={[{ value: entry.kind, label: entry.kind }]}
                  onValueChange={() => undefined}
                />
              }
              fieldsLayout="item"
              bodyLabel={entry.key === 'b' ? '脚本内容' : undefined}
              preview={
                entry.key === 'a'
                  ? { label: '效果预览', content: <span data-testid="preview">预览内容</span> }
                  : undefined
              }
              onRemove={() => setEntries((current) => current.filter((item) => item !== entry))}
            >
              {entry.key === 'b' ? <span>状态与回合</span> : null}
            </EffectEditorCard>
          ))}
        </ol>
      </DsReorderCollection>
      <DsButton data-effect-editor-add="true" onClick={() => undefined}>
        添加效果
      </DsButton>
    </EffectEditorChain>
  )
}

describe('EffectEditorCard', () => {
  test('把类型与项级动作放在父头，把命名参数和可选预览放在下级区域', async () => {
    await act(async () => root.render(<Harness />))

    const card = host.querySelector<HTMLElement>('[data-effect-editor-key="a"]')!
    const header = card.querySelector<HTMLElement>('[data-effect-editor-header]')!
    const body = card.querySelector<HTMLElement>('.effect-editor-card__body')!
    const item = card.closest<HTMLElement>('[data-ds-reorder-item]')!
    expect(item.tagName).toBe('LI')
    expect(item.dataset.layout).toBe('overlay')
    expect(header.querySelector('[data-effect-editor-kind]')).not.toBeNull()
    expect(header.querySelector('[data-effect-editor-actions]')).not.toBeNull()
    expect(body.querySelector('[data-effect-editor-kind]')).toBeNull()
    expect(body.querySelector('[data-effect-editor-actions]')).toBeNull()
    const semanticBodyTitle = body.querySelector<HTMLElement>('h4')!
    expect(semanticBodyTitle.textContent).toBe('效果参数')
    expect(semanticBodyTitle.classList.contains('ds-visually-hidden')).toBe(true)
    expect(body.getAttribute('aria-labelledby')).toBe(semanticBodyTitle.id)
    expect(
      host.querySelector('[data-effect-editor-key="b"] .effect-editor-card__body-title')
        ?.textContent,
    ).toBe('脚本内容')
    expect(card.querySelector('[data-effect-editor-preview]')?.textContent).toContain('预览内容')
    expect(header.compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
    expect(card.dataset.density).toBe('default')

    const noParameterCard = host.querySelector<HTMLElement>('[data-effect-editor-key="c"]')!
    expect(noParameterCard.dataset.density).toBe('compact')
    expect(noParameterCard.querySelector('[data-effect-editor-fields]')?.textContent).toContain(
      '此效果无需设置参数',
    )
  })

  test('删除后依次恢复到下一类型、上一类型和添加按钮，并由持久 owner 播报', async () => {
    await act(async () => root.render(<Harness />))

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="删除效果 1"]')!.click(),
    )
    expect(document.activeElement).toBe(host.querySelector('[aria-label="类型 b"]'))
    expect(
      [...host.querySelectorAll('.ds-reorder-live')].some((live) =>
        live.textContent?.includes('效果 1 已删除'),
      ),
    ).toBe(true)

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="删除效果 2"]')!.click(),
    )
    expect(document.activeElement).toBe(host.querySelector('[aria-label="类型 b"]'))

    await act(async () =>
      host.querySelector<HTMLButtonElement>('button[aria-label="删除效果 1"]')!.click(),
    )
    expect(document.activeElement).toBe(
      host.querySelector<HTMLButtonElement>('[data-effect-editor-add]'),
    )
  })
})
