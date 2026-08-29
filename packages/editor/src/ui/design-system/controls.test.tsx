// @vitest-environment jsdom
import { act, createRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  DsActionLink,
  DsButton,
  DsCheckbox,
  DsControlGroup,
  DsDraftNumberInput,
  DsDraftNumberField,
  DsDraftTextInput,
  DsEmptyState,
  DsField,
  DsFieldGroup,
  DsFilePicker,
  DsHelpTip,
  DsIconButton,
  DsListHeader,
  DsMenuBar,
  type DsMenuDefinition,
  DsMultiSelect,
  DsNumberInput,
  DsNumberField,
  type DsOption,
  DsRadioGroup,
  DsSelect,
  DsSwitch,
  DsTabs,
  DsTag,
  DsTextArea,
  DsTextInput,
  DsToolbar,
} from './index.js'

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
  vi.restoreAllMocks()
})

async function click(element: HTMLElement): Promise<void> {
  await act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true })))
}

async function keyDown(
  element: HTMLElement,
  key: string,
  init: Omit<KeyboardEventInit, 'key'> = {},
): Promise<void> {
  await act(async () =>
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
    ),
  )
}

async function input(element: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function blur(element: HTMLInputElement): Promise<void> {
  await act(async () => element.blur())
}

async function pointerDown(element: HTMLElement): Promise<boolean> {
  const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
  await act(async () => element.dispatchEvent(event))
  return event.defaultPrevented
}

async function composition(element: HTMLInputElement, type: 'compositionstart' | 'compositionend') {
  await act(async () => element.dispatchEvent(new CompositionEvent(type, { bubbles: true })))
}

describe('editor design-system controls', () => {
  test('centers embedded collection empty states without creating another card', () => {
    const markup = renderToStaticMarkup(
      <DsEmptyState layout="embedded" title="暂无初始道具" description="可从右上角添加。" />,
    )
    expect(markup).toContain('class="ds-empty-state ds-empty-state--embedded"')
    expect(markup).toContain('data-layout="embedded"')
    expect(markup).toContain('<h4')
  })

  test('keeps text local through IME and commits Enter plus blur exactly once', async () => {
    const commits = vi.fn()
    const validate = vi.fn(() => undefined)
    await act(async () =>
      root.render(
        <DsDraftTextInput
          aria-label="项目名称"
          draftKey="project:name"
          syncToken={0}
          value="仙剑"
          validate={validate}
          onCommit={commits}
        />,
      ),
    )
    const field = host.querySelector<HTMLInputElement>('input')!
    await act(async () => field.focus())
    await composition(field, 'compositionstart')
    await input(field, '仙剑奇侠传')
    await keyDown(field, 'Enter', { isComposing: true })
    expect(commits).not.toHaveBeenCalled()
    expect(validate).not.toHaveBeenCalled()
    await composition(field, 'compositionend')
    expect(commits).not.toHaveBeenCalled()
    await keyDown(field, 'Enter')
    await blur(field)
    expect(commits).toHaveBeenCalledTimes(1)
    expect(commits).toHaveBeenCalledWith('仙剑奇侠传')
    expect(validate).toHaveBeenCalledTimes(1)
  })

  test('does not cancel or commit an IME draft for Escape or keyCode 229', async () => {
    const commits = vi.fn()
    const cancels = vi.fn()
    await act(async () =>
      root.render(
        <DsDraftTextInput
          aria-label="人物名称"
          draftKey="actor:hero:name"
          value="李逍遥"
          onCommit={commits}
          onCancel={cancels}
        />,
      ),
    )
    const field = host.querySelector<HTMLInputElement>('input')!
    await act(async () => field.focus())
    await composition(field, 'compositionstart')
    await input(field, '李逍遥新')
    await keyDown(field, 'Escape', { isComposing: true })
    expect(document.activeElement).toBe(field)
    expect(field.value).toBe('李逍遥新')
    expect(cancels).not.toHaveBeenCalled()

    await composition(field, 'compositionend')
    for (const key of ['Enter', 'Escape']) {
      const imeKey = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
      })
      Object.defineProperty(imeKey, 'keyCode', { value: 229 })
      await act(async () => field.dispatchEvent(imeKey))
    }
    expect(document.activeElement).toBe(field)
    expect(field.value).toBe('李逍遥新')
    expect(commits).not.toHaveBeenCalled()
    expect(cancels).not.toHaveBeenCalled()
    await keyDown(field, 'Enter')
    expect(commits).toHaveBeenCalledOnce()
    expect(commits).toHaveBeenCalledWith('李逍遥新')
  })

  test('cancels stale object drafts and resyncs canonical undo and redo values', async () => {
    const commits = vi.fn()
    const renderField = async (draftKey: string, value: string, syncToken: number) => {
      await act(async () =>
        root.render(
          <DsDraftTextInput
            aria-label="名称"
            draftKey={draftKey}
            syncToken={syncToken}
            value={value}
            onCommit={commits}
          />,
        ),
      )
    }
    await renderField('actor:a:name', '李逍遥', 0)
    const field = host.querySelector<HTMLInputElement>('input')!
    await input(field, '未提交的甲')
    await renderField('actor:b:name', '赵灵儿', 0)
    expect(field.value).toBe('赵灵儿')
    await blur(field)
    expect(commits).not.toHaveBeenCalled()

    await renderField('actor:b:name', '新名字', 1)
    expect(field.value).toBe('新名字')
    await renderField('actor:b:name', '赵灵儿', 2)
    expect(field.value).toBe('赵灵儿')
    await renderField('actor:b:name', '新名字', 3)
    expect(field.value).toBe('新名字')
  })

  test('rejects invalid numbers, cancels with Escape, and commits one valid integer', async () => {
    const commits = vi.fn()
    await act(async () =>
      root.render(
        <DsDraftNumberInput
          aria-label="买价"
          draftKey="item:potion:buyPrice"
          value={10}
          min={0}
          integer
          onCommit={commits}
        />,
      ),
    )
    const field = host.querySelector<HTMLInputElement>('input')!
    await act(async () => field.focus())
    await input(field, '')
    await blur(field)
    expect(commits).not.toHaveBeenCalled()
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(field.title).toBe('请输入有效数字。')

    await input(field, '-1')
    await keyDown(field, 'Escape')
    expect(field.value).toBe('10')
    expect(commits).not.toHaveBeenCalled()

    await input(field, '25')
    await keyDown(field, 'Enter')
    await blur(field)
    expect(commits).toHaveBeenCalledTimes(1)
    expect(commits).toHaveBeenCalledWith(25)
  })

  test('derives numeric input modes without overriding an explicit caller choice', async () => {
    await act(async () =>
      root.render(
        <>
          <DsDraftNumberInput
            aria-label="整数"
            draftKey="integer"
            value={1}
            integer
            onCommit={() => undefined}
          />
          <DsDraftNumberInput
            aria-label="显式小数键盘"
            draftKey="explicit"
            value={1}
            integer
            inputMode="decimal"
            onCommit={() => undefined}
          />
          <DsNumberInput aria-label="直接整数" integer defaultValue={2} />
          <DsNumberInput aria-label="显式电话键盘" integer inputMode="tel" defaultValue={3} />
        </>,
      ),
    )

    expect(host.querySelector<HTMLInputElement>('[aria-label="整数"]')?.inputMode).toBe('numeric')
    expect(host.querySelector<HTMLInputElement>('[aria-label="显式小数键盘"]')?.inputMode).toBe(
      'decimal',
    )
    expect(host.querySelector<HTMLInputElement>('[aria-label="直接整数"]')?.inputMode).toBe(
      'numeric',
    )
    expect(host.querySelector<HTMLInputElement>('[aria-label="显式电话键盘"]')?.inputMode).toBe(
      'tel',
    )
    expect(
      host.querySelector<HTMLInputElement>('[aria-label="直接整数"]')?.getAttribute('integer'),
    ).toBeNull()
  })

  test('keeps wheel scrolling non-blocking without committing a focused numeric draft', async () => {
    const commits = vi.fn()
    vi.useFakeTimers()
    await act(async () =>
      root.render(
        <DsDraftNumberInput
          aria-label="等级"
          draftKey="enemy:level"
          value={1}
          integer
          onCommit={commits}
        />,
      ),
    )
    const field = host.querySelector<HTMLInputElement>('input')!
    await act(async () => field.focus())
    await input(field, '9')
    const wheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 80 })
    await act(async () => field.dispatchEvent(wheel))

    expect(wheel.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(field)
    expect(field.value).toBe('9')
    expect(field.readOnly).toBe(true)
    expect(commits).not.toHaveBeenCalled()
    await act(async () => vi.runOnlyPendingTimers())
    expect(field.readOnly).toBe(false)
    vi.useRealTimers()
  })

  test('number fields own a bounded accessible stepper and commit a visible draft once', async () => {
    const commits = vi.fn()
    await act(async () =>
      root.render(
        <DsDraftNumberField
          label="数量"
          draftKey="inventory:potion:count"
          value={1}
          min={1}
          max={3}
          integer
          onCommit={commits}
        />,
      ),
    )
    const field = host.querySelector<HTMLInputElement>('input')!
    const decrement = host.querySelector<HTMLButtonElement>('[aria-label="减少数量"]')!
    const increment = host.querySelector<HTMLButtonElement>('[aria-label="增加数量"]')!

    expect(field.inputMode).toBe('numeric')
    expect(field.closest('[data-ds-number-stepper]')).not.toBeNull()
    expect(field.closest('.ds-number-field')).not.toBeNull()
    expect(field.labels?.[0]?.textContent).toBe('数量')
    expect(increment.getAttribute('aria-controls')).toBe(field.id)
    expect(decrement.disabled).toBe(true)
    expect(increment.disabled).toBe(false)

    await act(async () => field.focus())
    await input(field, '2')
    expect(await pointerDown(increment)).toBe(true)
    expect(document.activeElement).toBe(field)
    await click(increment)
    await blur(field)

    expect(commits).toHaveBeenCalledTimes(1)
    expect(commits).toHaveBeenCalledWith(3)
    expect(increment.disabled).toBe(true)
    await click(increment)
    expect(commits).toHaveBeenCalledTimes(1)
  })

  test('steps negative and fractional drafts precisely and disables step any', async () => {
    const negativeCommits = vi.fn()
    const decimalCommits = vi.fn()
    await act(async () =>
      root.render(
        <>
          <DsDraftNumberField
            label="防御"
            draftKey="enemy:defense"
            value={-6}
            integer
            onCommit={negativeCommits}
          />
          <DsDraftNumberField
            label="倍率"
            draftKey="skill:ratio"
            value={0.2}
            step={0.1}
            onCommit={decimalCommits}
          />
          <DsDraftNumberField
            label="任意精度"
            draftKey="any-step"
            value={2}
            step="any"
            onCommit={() => undefined}
          />
        </>,
      ),
    )

    await click(host.querySelector<HTMLButtonElement>('[aria-label="增加防御"]')!)
    await click(host.querySelector<HTMLButtonElement>('[aria-label="增加倍率"]')!)
    expect(negativeCommits).toHaveBeenCalledWith(-5)
    expect(decimalCommits).toHaveBeenCalledWith(0.3)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="减少任意精度"]')?.disabled).toBe(
      true,
    )
    expect(host.querySelector<HTMLButtonElement>('[aria-label="增加任意精度"]')?.disabled).toBe(
      true,
    )
  })

  test('optional bounded number fields step between empty and their minimum', async () => {
    const commits = vi.fn()
    function OptionalNumberField() {
      const [value, setValue] = useState<number | undefined>(1)
      return (
        <DsDraftNumberField
          label="前置震屏帧"
          draftKey="skill:pre-shake-frames"
          value={value}
          allowEmpty
          min={1}
          integer
          placeholder="关闭"
          onCommit={(next) => {
            commits(next)
            setValue(next)
          }}
        />
      )
    }
    await act(async () => root.render(<OptionalNumberField />))

    await click(host.querySelector<HTMLButtonElement>('[aria-label="减少前置震屏帧"]')!)
    expect(commits).toHaveBeenLastCalledWith(undefined)
    expect(host.querySelector<HTMLInputElement>('input')?.value).toBe('')

    await click(host.querySelector<HTMLButtonElement>('[aria-label="增加前置震屏帧"]')!)
    expect(commits).toHaveBeenLastCalledWith(1)
    expect(commits).toHaveBeenCalledTimes(2)
  })

  test('plain number field forwards its real input and emits one native change per step', async () => {
    const inputRef = createRef<HTMLInputElement>()
    const changes = vi.fn()
    await act(async () =>
      root.render(
        <DsNumberField
          inputRef={inputRef}
          label="回合"
          defaultValue={1}
          max={2}
          integer
          onChange={changes}
        />,
      ),
    )
    const field = host.querySelector<HTMLInputElement>('input')!
    expect(inputRef.current).toBe(field)
    await click(host.querySelector<HTMLButtonElement>('[aria-label="增加回合"]')!)
    expect(field.value).toBe('2')
    expect(changes).toHaveBeenCalledTimes(1)
    expect(host.querySelector<HTMLButtonElement>('[aria-label="增加回合"]')?.disabled).toBe(true)
  })

  test('number field stepper follows disabled and readonly semantics', async () => {
    await act(async () =>
      root.render(
        <>
          <DsNumberField label="禁用数值" value={1} disabled onChange={() => undefined} />
          <DsDraftNumberField
            label="只读数值"
            draftKey="readonly"
            value={2}
            readOnly
            onCommit={() => undefined}
          />
        </>,
      ),
    )
    expect(
      [...host.querySelectorAll<HTMLButtonElement>('[data-ds-number-stepper] button')].every(
        (button) => button.disabled,
      ),
    ).toBe(true)
    const inputs = [...host.querySelectorAll<HTMLInputElement>('input')]
    expect(inputs[0]?.disabled).toBe(true)
    expect(inputs[0]?.readOnly).toBe(false)
    expect(inputs[1]?.disabled).toBe(false)
    expect(inputs[1]?.readOnly).toBe(true)
  })

  test('normalizes legacy domain values before integer and range validation', async () => {
    const commits = vi.fn()
    await act(async () =>
      root.render(
        <DsDraftNumberInput
          aria-label="价格"
          draftKey="item:price"
          value={10}
          min={0}
          integer
          normalize={(value) => Math.max(0, Math.floor(value))}
          onCommit={commits}
        />,
      ),
    )
    const field = host.querySelector<HTMLInputElement>('input')!
    await act(async () => field.focus())
    await input(field, '-1.7')
    await blur(field)
    expect(commits).toHaveBeenCalledOnce()
    expect(commits).toHaveBeenCalledWith(0)
  })

  test('resyncs the canonical value when a mutation rejects the commit', async () => {
    let accepted = false
    const commits = vi.fn(() => accepted)
    await act(async () =>
      root.render(
        <DsDraftNumberInput
          aria-label="动作帧"
          draftKey="enemy:a:idle.count"
          value={3}
          integer
          onCommit={commits}
        />,
      ),
    )
    const field = host.querySelector<HTMLInputElement>('input')!
    await act(async () => field.focus())
    await input(field, '9')
    await blur(field)
    expect(commits).toHaveBeenCalledWith(9)
    expect(field.value).toBe('3')

    accepted = true
    await act(async () => field.focus())
    await input(field, '8')
    await keyDown(field, 'Enter')
    await blur(field)
    expect(commits).toHaveBeenCalledTimes(2)
    expect(commits).toHaveBeenLastCalledWith(8)
    expect(field.value).toBe('8')
  })

  test('keeps 100 input events local until one blur commit', async () => {
    const commits = vi.fn()
    const validate = vi.fn(() => undefined)
    await act(async () =>
      root.render(
        <DsDraftTextInput
          aria-label="长文本"
          draftKey="performance:text"
          value=""
          validate={validate}
          onCommit={commits}
        />,
      ),
    )
    const field = host.querySelector<HTMLInputElement>('input')!
    await act(async () => field.focus())
    for (let index = 1; index <= 100; index += 1) await input(field, '字'.repeat(index))
    expect(commits).not.toHaveBeenCalled()
    expect(validate).not.toHaveBeenCalled()
    await blur(field)
    expect(commits).toHaveBeenCalledTimes(1)
    expect(validate).toHaveBeenCalledTimes(1)
  })

  test('handles Enter then another-field click as one history command across undo and redo', async () => {
    const commits = vi.fn()
    function HistoryHarness() {
      const [history, setHistory] = useState({
        past: [] as string[],
        current: '旧值',
        future: [] as string[],
        version: 0,
        dirtyTransitions: 0,
      })
      return (
        <>
          <DsDraftTextInput
            aria-label="名称"
            draftKey="history:name"
            syncToken={history.version}
            value={history.current}
            onCommit={(next) => {
              commits(next)
              setHistory((value) => ({
                past: [...value.past, value.current],
                current: next,
                future: [],
                version: value.version + 1,
                dirtyTransitions: value.dirtyTransitions + 1,
              }))
            }}
          />
          <button type="button" aria-label="另一个字段">
            另一个字段
          </button>
          <button
            type="button"
            aria-label="撤销"
            onClick={() =>
              setHistory((value) => ({
                ...value,
                past: value.past.slice(0, -1),
                current: value.past.at(-1) ?? value.current,
                future: [value.current, ...value.future],
                version: value.version + 1,
              }))
            }
          >
            撤销
          </button>
          <button
            type="button"
            aria-label="重做"
            onClick={() =>
              setHistory((value) => ({
                ...value,
                past: [...value.past, value.current],
                current: value.future[0] ?? value.current,
                future: value.future.slice(1),
                version: value.version + 1,
              }))
            }
          >
            重做
          </button>
          <output data-dirty-transitions>{history.dirtyTransitions}</output>
        </>
      )
    }
    await act(async () => root.render(<HistoryHarness />))
    const field = host.querySelector<HTMLInputElement>('input')!
    await act(async () => field.focus())
    await input(field, '新值')
    await keyDown(field, 'Enter')
    await click(host.querySelector<HTMLButtonElement>('[aria-label="另一个字段"]')!)
    expect(commits).toHaveBeenCalledTimes(1)
    expect(field.value).toBe('新值')
    expect(host.querySelector('[data-dirty-transitions]')?.textContent).toBe('1')
    await click(host.querySelector<HTMLButtonElement>('[aria-label="撤销"]')!)
    expect(field.value).toBe('旧值')
    await click(host.querySelector<HTMLButtonElement>('[aria-label="重做"]')!)
    expect(field.value).toBe('新值')
    expect(commits).toHaveBeenCalledTimes(1)
  })
  test('associates conceptual help with its trigger and lets Escape dismiss it', async () => {
    await act(async () =>
      root.render(<DsHelpTip label="分次执行">每次运行只执行当前步骤。</DsHelpTip>),
    )

    const wrapper = host.querySelector<HTMLElement>('.ds-help-tip')!
    const button = host.querySelector<HTMLButtonElement>('button')!
    const tooltip = host.querySelector<HTMLElement>('[role="tooltip"]')!
    expect(button.getAttribute('aria-describedby')).toBe(tooltip.id)
    expect(document.body.querySelector('.ds-help-tooltip')).toBeNull()
    expect(button.hasAttribute('aria-expanded')).toBe(false)
    expect(wrapper.classList.contains('is-open')).toBe(false)

    await act(async () =>
      button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: null })),
    )
    const visualTooltip = document.body.querySelector<HTMLElement>('.ds-help-tooltip')!
    expect(visualTooltip.textContent).toBe(tooltip.textContent)
    expect(wrapper.contains(visualTooltip)).toBe(false)
    expect(wrapper.classList.contains('is-open')).toBe(true)
    await act(async () => button.focus())
    await act(async () =>
      button.dispatchEvent(
        new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }),
      ),
    )
    expect(wrapper.classList.contains('is-open')).toBe(true)

    const firstEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    await act(async () => button.dispatchEvent(firstEscape))
    expect(firstEscape.defaultPrevented).toBe(true)
    expect(wrapper.classList.contains('is-open')).toBe(false)
    expect(document.body.querySelector('.ds-help-tooltip')).toBeNull()
    expect(document.activeElement).toBe(button)

    const secondEscape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    await act(async () => button.dispatchEvent(secondEscape))
    expect(secondEscape.defaultPrevented).toBe(false)
    await act(async () => button.blur())
    await act(async () => button.focus())
    expect(wrapper.classList.contains('is-open')).toBe(true)
  })

  test('keeps help bubbles in the nearest dialog top layer and SSR descriptions inline', async () => {
    const staticHtml = renderToStaticMarkup(
      <DsHelpTip label="脚本方案">完整的方案说明。</DsHelpTip>,
    )
    const staticHost = document.createElement('div')
    staticHost.innerHTML = staticHtml
    const staticButton = staticHost.querySelector('button')!
    const staticTooltip = staticHost.querySelector<HTMLElement>('[role="tooltip"]')!
    expect(staticButton.getAttribute('aria-describedby')).toBe(staticTooltip.id)
    expect(staticTooltip.textContent).toBe('完整的方案说明。')

    await act(async () =>
      root.render(
        <dialog open>
          <DsHelpTip label="脚本方案">完整的方案说明。</DsHelpTip>
        </dialog>,
      ),
    )
    const dialog = host.querySelector('dialog')!
    const button = dialog.querySelector<HTMLButtonElement>('button')!
    await act(async () =>
      button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: null })),
    )
    const visualTooltip = dialog.querySelector<HTMLElement>('.ds-help-tooltip')
    expect(visualTooltip?.parentElement).toBe(dialog)
    expect(document.body.querySelectorAll('.ds-help-tooltip')).toHaveLength(1)
  })

  test('portals icon-button tooltips outside clipping cards and keeps inline descriptions', async () => {
    await act(async () =>
      root.render(
        <section className="clipping-card" style={{ overflow: 'hidden' }}>
          <DsIconButton label="播放" icon="play" variant="secondary" />
        </section>,
      ),
    )

    const card = host.querySelector<HTMLElement>('.clipping-card')!
    const button = card.querySelector<HTMLButtonElement>('[aria-label="播放"]')!
    const descriptionId = button.getAttribute('aria-describedby')
    expect(descriptionId).not.toBeNull()
    expect(card.querySelector<HTMLElement>(`#${descriptionId}`)?.textContent).toBe('播放')
    expect(document.body.querySelector('.ds-tooltip__bubble')).toBeNull()

    await act(async () =>
      button.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: null })),
    )
    const visualTooltip = document.body.querySelector<HTMLElement>('.ds-tooltip__bubble')!
    expect(visualTooltip.textContent).toBe('播放')
    expect(card.contains(visualTooltip)).toBe(false)
    expect(visualTooltip.parentElement).toBe(document.body)
    expect(visualTooltip.getAttribute('aria-hidden')).toBe('true')

    const escapeEvent = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    await act(async () => button.dispatchEvent(escapeEvent))
    expect(escapeEvent.defaultPrevented).toBe(true)
    expect(document.body.querySelector('.ds-tooltip__bubble')).toBeNull()
  })

  test('dismisses pointer-triggered tooltips instead of keeping clicked controls sticky', async () => {
    await act(async () =>
      root.render(
        <>
          <DsIconButton label="上一帧" icon="chevron-left" variant="secondary" />
          <DsIconButton label="下一帧" icon="chevron-right" variant="secondary" />
        </>,
      ),
    )

    const previous = host.querySelector<HTMLButtonElement>('[aria-label="上一帧"]')!
    const next = host.querySelector<HTMLButtonElement>('[aria-label="下一帧"]')!

    await act(async () =>
      previous.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: null })),
    )
    expect(document.body.querySelector('.ds-tooltip__bubble')?.textContent).toBe('上一帧')

    await act(async () => {
      previous.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
      previous.focus()
    })
    expect(document.body.querySelector('.ds-tooltip__bubble')).toBeNull()

    await act(async () => {
      previous.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, relatedTarget: next }))
      next.dispatchEvent(new MouseEvent('mouseover', { bubbles: true, relatedTarget: previous }))
    })
    const bubbles = document.body.querySelectorAll<HTMLElement>('.ds-tooltip__bubble')
    expect(bubbles).toHaveLength(1)
    expect(bubbles[0]?.textContent).toBe('下一帧')

    await act(async () => {
      next.dispatchEvent(
        new MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }),
      )
      previous.blur()
      next.focus()
    })
    expect(document.body.querySelector('.ds-tooltip__bubble')?.textContent).toBe('下一帧')
  })

  test('buttons and action links share geometry while preserving native semantics', async () => {
    const buttonRef = createRef<HTMLButtonElement>()
    await act(async () =>
      root.render(
        <>
          <DsActionLink
            variant="secondary"
            size="compact"
            icon="open"
            href="/preview"
            target="_blank"
            rel="noopener noreferrer"
          >
            试放
          </DsActionLink>
          <DsButton ref={buttonRef} variant="danger" size="compact" icon="delete">
            删除
          </DsButton>
          <DsTag>使用</DsTag>
          <DsTag tone="neutral">引用 8</DsTag>
        </>,
      ),
    )

    const link = host.querySelector<HTMLAnchorElement>('a')!
    const button = host.querySelector<HTMLButtonElement>('button')!
    expect([...link.classList]).toEqual(
      expect.arrayContaining(['ds-button', 'ds-button--secondary', 'ds-button--compact']),
    )
    expect([...button.classList]).toEqual(
      expect.arrayContaining(['ds-button', 'ds-button--danger', 'ds-button--compact']),
    )
    expect(link.getAttribute('href')).toBe('/preview')
    expect(link.target).toBe('_blank')
    expect(link.rel.split(/\s+/).sort()).toEqual(['noopener', 'noreferrer'])
    expect(buttonRef.current).toBe(button)
    buttonRef.current?.focus()
    expect(document.activeElement).toBe(button)
    expect(host.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(2)
    expect([...host.querySelectorAll('.ds-tag')].map((tag) => tag.textContent)).toEqual([
      '使用',
      '引用 8',
    ])
  })

  test('keeps checkbox mixed state, radio exclusivity and switch semantics programmatic', async () => {
    const onRadio = vi.fn()
    await act(async () =>
      root.render(
        <>
          <DsCheckbox label="已启用" checked readOnly />
          <DsCheckbox label="部分选择" indeterminate />
          <DsCheckbox label="紧凑选择" size="compact" />
          <DsRadioGroup
            name="mode"
            label="移动模式"
            value="normal"
            options={[
              { value: 'normal', label: '普通' },
              { value: 'floating', label: '浮空' },
            ]}
            onChange={onRadio}
          />
          <DsSwitch label="即时预览" checked readOnly />
        </>,
      ),
    )
    const checks = [...host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
    const checked = checks[0]!
    const mixed = checks[1]!
    const compact = checks[2]!
    expect(checked.checked).toBe(true)
    expect(checked.closest('.ds-check-label')).not.toBeNull()
    expect(mixed.indeterminate).toBe(true)
    expect(mixed.getAttribute('aria-checked')).toBe('mixed')
    expect(compact.closest('.ds-check-label')).toHaveProperty(
      'className',
      expect.stringContaining('ds-check-label--compact'),
    )
    const radios = [...host.querySelectorAll<HTMLInputElement>('input[type="radio"]')]
    expect(radios.map((radio) => radio.checked)).toEqual([true, false])
    await click(radios[1]!)
    expect(onRadio).toHaveBeenCalledWith('floating')
    expect(host.querySelector<HTMLInputElement>('[role="switch"]')?.checked).toBe(true)
  })

  test('keeps form shells, labels and trailing actions on the shared size contract', async () => {
    await act(async () =>
      root.render(
        <>
          <DsField id="name" label="名称" help="用于列表显示">
            <DsTextInput id="name" defaultValue="梦蛇" />
          </DsField>
          <DsNumberInput aria-label="数值" defaultValue={99} monospace />
          <DsSelect
            aria-label="紧凑模式"
            size="compact"
            value="self"
            options={[{ value: 'self', label: '自身' }]}
            onValueChange={() => undefined}
          />
          <DsTextArea aria-label="说明" defaultValue="说明文字" />
          <DsFilePicker
            label="选择图片"
            description="PNG / WebP"
            aria-label="导入图片"
            accept="image/png,image/webp"
          />
          <DsControlGroup
            leading={<span data-testid="leading">缩略图</span>}
            control={
              <DsSelect
                aria-label="特效音"
                value="335"
                options={[{ value: '335', label: 'PAL 音效 335' }]}
                onValueChange={() => undefined}
              />
            }
            actions={
              <>
                <DsIconButton label="试听" icon="play" variant="secondary" />
                <DsIconButton label="打开" icon="open" variant="secondary" size="compact" />
              </>
            }
          />
        </>,
      ),
    )

    expect(host.querySelector<HTMLLabelElement>('.ds-field__label')?.htmlFor).toBe('name')
    expect(host.querySelector<HTMLInputElement>('#name')?.className).toBe('ds-input')
    const numberInput = host.querySelector<HTMLInputElement>('[aria-label="数值"]')
    expect(numberInput?.type).toBe('number')
    expect(numberInput?.inputMode).toBe('decimal')
    expect(numberInput?.classList).toContain('ds-control--monospace')
    const fileInput = host.querySelector<HTMLInputElement>('[aria-label="导入图片"]')
    expect(fileInput?.type).toBe('file')
    expect(fileInput?.closest('.ds-file-picker')?.textContent).toContain('PNG / WebP')
    expect(
      host.querySelector<HTMLButtonElement>('[role="combobox"][aria-label="紧凑模式"]')?.classList,
    ).toContain('ds-select--compact')
    expect(host.querySelector<HTMLTextAreaElement>('[aria-label="说明"]')?.className).toBe(
      'ds-textarea',
    )
    expect(
      host.querySelector('.ds-control-group__control > .ds-select[aria-label="特效音"]'),
    ).not.toBeNull()
    expect(host.querySelector('[aria-label="试听"]')?.classList).toContain(
      'ds-icon-button--secondary',
    )
    expect(host.querySelector('[aria-label="打开"]')?.classList).toContain(
      'ds-icon-button--compact',
    )
  })

  test('groups related fields on one responsive label track without changing field semantics', async () => {
    await act(async () =>
      root.render(
        <DsFieldGroup>
          <DsField id="field-group-label" label="标签" help="用于列表显示">
            {(field) => <DsTextInput {...field} defaultValue="新的故事" />}
          </DsField>
          <DsField id="field-group-video" label="入口视频资源" error="请选择可用视频">
            {(field) => <DsTextInput {...field} defaultValue="video.pal.003" />}
          </DsField>
        </DsFieldGroup>,
      ),
    )

    const group = host.querySelector<HTMLElement>('[data-ds-field-group]')
    expect(group?.dataset.layout).toBe('responsive')
    expect(group?.querySelectorAll(':scope > .ds-field')).toHaveLength(2)
    expect(group?.querySelector<HTMLLabelElement>('label[for="field-group-label"]')).not.toBeNull()
    expect(
      group
        ?.querySelector<HTMLInputElement>('#field-group-label')
        ?.getAttribute('aria-describedby'),
    ).toBe('field-group-label-description')
    expect(
      group?.querySelector<HTMLInputElement>('#field-group-video')?.getAttribute('aria-invalid'),
    ).toBe('true')

    await act(async () =>
      root.render(
        <DsFieldGroup layout="stacked">
          <DsField label="整组上下排列">
            <DsTextInput aria-label="整组上下排列" />
          </DsField>
        </DsFieldGroup>,
      ),
    )
    expect(host.querySelector('[data-ds-field-group]')?.getAttribute('data-layout')).toBe('stacked')
  })

  test('select supports portal click and keyboard selection while skipping disabled options', async () => {
    const onValueChange = vi.fn()
    const options: DsOption[] = [
      { value: 'a', label: '甲' },
      { value: 'b', label: '乙', disabled: true },
      { value: 'c', label: '丙' },
    ]
    await act(async () =>
      root.render(
        <DsSelect aria-label="目标" value="a" options={options} onValueChange={onValueChange} />,
      ),
    )

    const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    await click(trigger)

    const listbox = document.querySelector<HTMLElement>('[role="listbox"]')!
    const optionElements = [...document.querySelectorAll<HTMLElement>('[role="option"]')]
    expect(host.contains(listbox)).toBe(false)
    expect(trigger.getAttribute('aria-controls')).toBe(listbox.id)
    expect(optionElements.map((option) => option.textContent)).toEqual(['甲', '乙', '丙'])
    expect(optionElements[1]?.getAttribute('aria-disabled')).toBe('true')

    await click(optionElements[1]!)
    expect(onValueChange).not.toHaveBeenCalled()
    expect(trigger.getAttribute('aria-expanded')).toBe('true')

    await click(optionElements[2]!)
    expect(onValueChange).toHaveBeenCalledWith('c')
    expect(document.querySelector('[role="listbox"]')).toBeNull()

    onValueChange.mockClear()
    await keyDown(trigger, 'ArrowDown')
    await keyDown(trigger, 'ArrowDown')
    const activeId = trigger.getAttribute('aria-activedescendant')
    expect(activeId).not.toBeNull()
    expect(document.getElementById(activeId!)?.textContent).toContain('丙')
    await keyDown(trigger, 'Enter')
    expect(onValueChange).toHaveBeenCalledWith('c')
  })

  test('select preserves full clipped copy and supports a monospace secondary identifier', async () => {
    await act(async () =>
      root.render(
        <DsSelect
          aria-label="资源候选"
          title="灵泉水、炼丹炉·水纹超级长名称 · spiritWater"
          value="spirit-water"
          options={[
            {
              value: 'spirit-water',
              label: '灵泉水、炼丹炉·水纹超级长名称',
              description: 'spiritWater',
              title: '灵泉水、炼丹炉·水纹超级长名称 · spiritWater',
              descriptionMonospace: true,
            },
          ]}
          onValueChange={() => undefined}
        />,
      ),
    )

    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="资源候选"]')!
    expect(trigger.title).toBe('灵泉水、炼丹炉·水纹超级长名称 · spiritWater')
    expect(trigger.querySelector('.ds-select__description')?.classList).toContain(
      'ds-control--monospace',
    )
    await click(trigger)
    const option = document.querySelector<HTMLElement>('[role="option"]')!
    expect(option.title).toBe('灵泉水、炼丹炉·水纹超级长名称 · spiritWater')
    expect(option.querySelector('.ds-select-option__description')?.classList).toContain(
      'ds-control--monospace',
    )
  })

  test('select keeps its popup inside the nearest native dialog top-layer context', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })
    const onValueChange = vi.fn()
    const options: DsOption[] = Array.from({ length: 30 }, (_, index) => ({
      value: String(index),
      label: `选项 ${index}`,
    }))
    await act(async () =>
      root.render(
        <dialog open aria-label="编辑指令">
          <button type="button" aria-label="弹窗前一个控件">
            前一个
          </button>
          <DsSelect aria-label="开关名" value="0" options={options} onValueChange={onValueChange} />
          <button type="button" aria-label="弹窗后一个控件">
            后一个
          </button>
        </dialog>,
      ),
    )

    const dialog = host.querySelector<HTMLDialogElement>('dialog')!
    const trigger = dialog.querySelector<HTMLButtonElement>('[role="combobox"]')!
    await click(trigger)
    const listbox = dialog.querySelector<HTMLElement>('[role="listbox"]')!
    expect(listbox).not.toBeNull()
    expect(listbox.closest('dialog')).toBe(dialog)
    const search = dialog.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
    expect(document.activeElement).toBe(search)
    await keyDown(search, 'Tab')
    expect(document.activeElement).toBe(dialog.querySelector('[aria-label="弹窗后一个控件"]'))
    expect(dialog.hasAttribute('open')).toBe(true)

    trigger.focus()
    await click(trigger)
    const reopenedSearch = dialog.querySelector<HTMLInputElement>(
      '.ds-select-popover__search-input',
    )!
    await keyDown(reopenedSearch, 'Escape')
    expect(dialog.querySelector('[role="listbox"]')).toBeNull()
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(document.activeElement).toBe(trigger)

    await click(trigger)
    const reopenedListbox = dialog.querySelector<HTMLElement>('[role="listbox"]')!
    const option = [...reopenedListbox.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (candidate) => candidate.textContent?.includes('选项 1'),
    )!
    await click(option)
    expect(onValueChange).toHaveBeenCalledWith('1')
  })

  test('select surfaces an unknown controlled value without inventing an option', async () => {
    await act(async () =>
      root.render(
        <DsSelect
          aria-label="未知目标"
          value="missing-id"
          options={[{ value: 'known-id', label: '已知目标' }]}
          onValueChange={() => undefined}
        />,
      ),
    )

    const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!
    expect(trigger.dataset.missing).toBe('true')
    expect(trigger.textContent).toContain('missing-id（缺失）')
    await click(trigger)
    expect(document.querySelectorAll('[role="option"]')).toHaveLength(1)
    expect(document.querySelector('[role="option"]')?.getAttribute('aria-selected')).toBe('false')
  })

  test('large selects search their full data set while mounting only a bounded option window', async () => {
    const options: DsOption[] = Array.from({ length: 500 }, (_, index) => {
      const suffix = String(index).padStart(3, '0')
      return { value: `item-${suffix}`, label: `选项 ${suffix}` }
    })
    await act(async () =>
      root.render(
        <DsSelect
          aria-label="大型列表"
          value="item-050"
          options={options}
          onValueChange={() => undefined}
        />,
      ),
    )

    await click(host.querySelector<HTMLButtonElement>('[role="combobox"]')!)
    const search = document.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
    const mountedOptions = document.querySelectorAll('[role="option"]')
    expect(search.placeholder).toBe('搜索 500 项')
    expect(mountedOptions.length).toBeGreaterThan(0)
    expect(mountedOptions.length).toBeLessThanOrEqual(120)

    await input(search, '选项 499')
    expect(
      [...document.querySelectorAll('[role="option"]')].map((option) => option.textContent),
    ).toEqual(['选项 499'])
    expect(document.querySelector('.ds-select-popover__status')?.textContent).toBe('找到 1 项')
  })

  test('searchable select keeps its active option mounted across filtering and virtual scrolling', async () => {
    const options: DsOption[] = Array.from({ length: 500 }, (_, index) => {
      const suffix = String(index).padStart(3, '0')
      return { value: `item-${suffix}`, label: `选项 ${suffix}` }
    })
    await act(async () =>
      root.render(
        <DsSelect
          aria-label="虚拟列表"
          value="item-450"
          options={options}
          onValueChange={() => undefined}
        />,
      ),
    )

    await click(host.querySelector<HTMLButtonElement>('[aria-label="虚拟列表"]')!)
    const search = document.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
    expect(document.getElementById(search.getAttribute('aria-activedescendant')!)).not.toBeNull()

    await input(search, '选项')
    expect(document.getElementById(search.getAttribute('aria-activedescendant')!)).not.toBeNull()

    const listbox = document.querySelector<HTMLElement>('[role="listbox"]')!
    await act(async () => {
      listbox.scrollTop = 400 * 40
      listbox.dispatchEvent(new Event('scroll', { bubbles: true }))
    })
    const active = document.getElementById(search.getAttribute('aria-activedescendant')!)
    expect(active).not.toBeNull()
    expect(Number(active?.getAttribute('aria-posinset'))).toBeGreaterThanOrEqual(400)
    expect(active?.getAttribute('aria-setsize')).toBe('500')
  })

  test('searchable select restores logical Tab order around its portalled search field', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })
    const options: DsOption[] = Array.from({ length: 30 }, (_, index) => ({
      value: String(index),
      label: `选项 ${index}`,
    }))
    await act(async () =>
      root.render(
        <>
          <button type="button" aria-label="前一个控件">
            前一个
          </button>
          <DsSelect
            aria-label="搜索选择器"
            value="0"
            options={options}
            onValueChange={() => undefined}
          />
          <button type="button" aria-label="后一个控件">
            后一个
          </button>
        </>,
      ),
    )

    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="搜索选择器"]')!
    trigger.focus()
    await click(trigger)
    let search = document.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
    expect(document.activeElement).toBe(search)
    expect(search.getAttribute('role')).toBe('combobox')
    expect(trigger.getAttribute('role')).toBeNull()
    await keyDown(search, 'Tab')
    expect(document.querySelector('[role="listbox"]')).toBeNull()
    expect(document.activeElement).toBe(host.querySelector('[aria-label="后一个控件"]'))

    trigger.focus()
    await click(trigger)
    search = document.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
    await keyDown(search, 'Tab', { shiftKey: true })
    expect(document.activeElement).toBe(host.querySelector('[aria-label="前一个控件"]'))

    trigger.focus()
    await click(trigger)
    search = document.querySelector<HTMLInputElement>('.ds-select-popover__search-input')!
    await keyDown(search, 'Escape')
    expect(document.querySelector('[role="listbox"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  test('select Escape closes its portal and restores focus to the combobox', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })
    await act(async () =>
      root.render(
        <DsSelect
          aria-label="逃离列表"
          value="a"
          options={[
            { value: 'a', label: '甲' },
            { value: 'b', label: '乙' },
          ]}
          onValueChange={() => undefined}
        />,
      ),
    )

    const trigger = host.querySelector<HTMLButtonElement>('[role="combobox"]')!
    trigger.focus()
    await click(trigger)
    await keyDown(trigger, 'Escape')

    expect(document.querySelector('[role="listbox"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  test('tabs use roving tabindex and arrow keys', async () => {
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <DsTabs
          size="compact"
          label="角色分区"
          activeId="overview"
          items={[
            { id: 'overview', label: '总览' },
            { id: 'growth', label: '战斗与成长', count: 8 },
          ]}
          onChange={onChange}
        />,
      ),
    )
    const tabs = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
    expect(tabs.map((tab) => tab.tabIndex)).toEqual([0, -1])
    expect(tabs[0]?.classList).toContain('ds-tab--compact')
    expect(tabs[1]?.querySelector('.ds-tab__label')?.textContent).toBe('战斗与成长')
    expect(tabs[1]?.querySelector('.ds-tab__count')?.textContent).toBe('8')
    await act(async () =>
      tabs[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
    )
    expect(onChange).toHaveBeenCalledWith('growth')
  })

  test('menu navigation is a real link and Escape returns focus to its trigger', async () => {
    const menus: DsMenuDefinition[] = [
      {
        id: 'battle',
        label: '战斗',
        items: [{ id: 'battlefield', label: '战场', href: '?module=battle&page=battlefield' }],
      },
    ]
    await act(async () => root.render(<DsMenuBar label="主菜单" menus={menus} />))
    const trigger = host.querySelector<HTMLButtonElement>('.ds-menu-trigger')!
    await click(trigger)
    const link = host.querySelector<HTMLAnchorElement>('[role="menuitem"][href]')!
    expect(link.getAttribute('href')).toBe('?module=battle&page=battlefield')
    link.focus()
    await act(async () =>
      link.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    )
    expect(document.activeElement).toBe(trigger)
    expect(host.querySelector('.ds-menu-popover')).toBeNull()
  })

  test('section-grid menu exposes modules as groups and pages as primary links', async () => {
    const menus: DsMenuDefinition[] = [
      {
        id: 'navigation',
        label: '导航',
        layout: 'section-grid',
        items: [
          { id: 'scene', section: '场景', label: '场景编排', href: '?module=scene' },
          { id: 'ambience', section: '场景', label: '氛围', href: '?module=scene&page=ambience' },
          {
            id: 'overview',
            section: '项目设置',
            label: '概览',
            href: '?module=project&page=overview',
            current: true,
          },
        ],
      },
    ]
    await act(async () => root.render(<DsMenuBar label="主菜单" menus={menus} />))
    await click(host.querySelector<HTMLButtonElement>('.ds-menu-trigger')!)

    const popover = host.querySelector<HTMLElement>('.ds-menu-popover')!
    expect(popover.dataset.layout).toBe('section-grid')
    expect(popover.querySelector(':scope > .ds-menu-group-flow')?.getAttribute('role')).toBe(
      'presentation',
    )
    expect(
      [...popover.querySelectorAll<HTMLElement>('[role="group"]')].map((group) =>
        group.getAttribute('aria-label'),
      ),
    ).toEqual(['场景', '项目设置'])
    expect(
      [...popover.querySelectorAll<HTMLElement>('.ds-menu-section-title')].map(
        (title) => title.textContent,
      ),
    ).toEqual(['场景', '项目设置'])
    expect(
      [...popover.querySelectorAll<HTMLAnchorElement>('.ds-menu-item')].map(
        (item) => item.textContent,
      ),
    ).toEqual(['场景编排', '氛围', '概览'])
    expect(popover.querySelector('[aria-current="page"]')?.textContent).toBe('概览')
  })

  test('toolbar reuses the supplied handler and never manufactures a second command', async () => {
    const execute = vi.fn()
    await act(async () =>
      root.render(
        <DsToolbar
          label="快捷工具栏"
          groups={[[{ id: 'save', label: '保存', icon: 'save', execute }]]}
        />,
      ),
    )
    await click(host.querySelector<HTMLButtonElement>('[aria-label="保存"]')!)
    expect(execute).toHaveBeenCalledTimes(1)
  })

  test('list headers own the complete action and overflow structure', async () => {
    const create = vi.fn()
    const duplicate = vi.fn()
    await act(async () =>
      root.render(
        <DsListHeader
          title="地图"
          count={223}
          unit="张"
          help={{ label: '地图列表', content: '这里只列出当前项目中的地图。' }}
          actions={[{ id: 'create', label: '新建地图', icon: 'add', onClick: create }]}
          overflowActions={[{ id: 'duplicate', label: '复制地图', onClick: duplicate }]}
        />,
      ),
    )
    expect(host.querySelector('.ds-list-header__title')?.textContent).toBe('地图')
    expect(host.querySelector('.ds-list-header__count')?.textContent).toContain('223 张')
    expect(host.querySelector('[aria-label="地图列表说明"]')).not.toBeNull()
    const createButton = host.querySelector<HTMLButtonElement>('[aria-label="新建地图"]')!
    expect(createButton.classList).toContain('ds-list-header__action')
    expect(createButton.classList).toContain('ds-icon-button--compact')
    expect(createButton.querySelector('.ds-icon')).not.toBeNull()
    await click(createButton)
    expect(create).toHaveBeenCalledOnce()
    const details = host.querySelector<HTMLDetailsElement>('.ds-list-header__menu')!
    details.open = true
    await click(host.querySelector<HTMLButtonElement>('.ds-list-header__menu-popup button')!)
    expect(duplicate).toHaveBeenCalledOnce()
    expect(details.open).toBe(false)
  })

  test('toggle commands expose pressed toolbar and checked menu semantics', async () => {
    const execute = vi.fn()
    await act(async () =>
      root.render(
        <>
          <DsMenuBar
            label="主菜单"
            menus={[
              {
                id: 'view',
                label: '视图',
                items: [
                  {
                    id: 'left',
                    label: '对象列表',
                    icon: 'panel-left',
                    checked: true,
                    onSelect: execute,
                  },
                ],
              },
            ]}
          />
          <DsToolbar
            label="布局"
            groups={[
              [{ id: 'left', label: '对象列表', icon: 'panel-left', pressed: true, execute }],
            ]}
          />
        </>,
      ),
    )
    await click(host.querySelector<HTMLButtonElement>('.ds-menu-trigger')!)
    expect(host.querySelector('[role="menuitemcheckbox"]')?.getAttribute('aria-checked')).toBe(
      'true',
    )
    const toolbar = host.querySelector<HTMLButtonElement>('[aria-label="对象列表"][aria-pressed]')!
    expect(toolbar.getAttribute('aria-pressed')).toBe('true')
    await click(toolbar)
    expect(execute).toHaveBeenCalledOnce()
  })

  test('multi-select preserves multiple identities and exposes selected count', async () => {
    const options: DsOption[] = [
      { value: 'a', label: '甲' },
      { value: 'b', label: '乙' },
      { value: 'c', label: '丙' },
    ]
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <DsMultiSelect
          label="队伍"
          size="compact"
          options={options}
          value={['a', 'b']}
          onChange={onChange}
        />,
      ),
    )

    await click(host.querySelector<HTMLButtonElement>('[aria-label="队伍"]')!)
    expect(document.body.textContent).toContain('已选 2 项')
    expect(document.querySelectorAll('.ds-multiselect__option')).toHaveLength(3)
    for (const label of document.querySelectorAll('.ds-multiselect__option > .ds-check-label'))
      expect(label.classList).toContain('ds-check-label--compact')
    const boxes = [...document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
    await click(boxes[2]!)
    expect(onChange).toHaveBeenCalledWith(['a', 'b', 'c'])
  })

  test('multi-select uses the shared dialog-aware floating layer and restores focus on Escape', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })
    const onChange = vi.fn()
    await act(async () =>
      root.render(
        <dialog open aria-label="队伍设置">
          <DsMultiSelect
            label="队伍"
            options={[
              { value: 'a', label: '甲' },
              { value: 'b', label: '乙' },
              { value: 'c', label: '丙' },
            ]}
            value={['a']}
            onChange={onChange}
          />
        </dialog>,
      ),
    )

    const trigger = host.querySelector<HTMLButtonElement>('[aria-label="队伍"]')!
    await click(trigger)
    const dialog = host.querySelector<HTMLDialogElement>('dialog')!
    const popup = document.querySelector<HTMLElement>('[role="dialog"][aria-label="选择队伍"]')!
    expect(popup.parentElement?.parentElement).toBe(dialog)

    const search = document.querySelector<HTMLInputElement>('[aria-label="搜索队伍"]')!
    await input(search, '丙')
    expect(document.querySelectorAll('.ds-multiselect__option')).toHaveLength(1)
    await click(
      [...document.querySelectorAll<HTMLButtonElement>('.ds-menu-item')].find(
        (button) => button.textContent === '全选',
      )!,
    )
    expect(onChange).toHaveBeenLastCalledWith(['a', 'c'])

    const option = document.querySelector<HTMLInputElement>('input[type="checkbox"]')!
    option.focus()
    await keyDown(option, 'Escape')
    expect(document.querySelector('[role="dialog"][aria-label="选择队伍"]')).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(dialog.open).toBe(true)
  })
})
