// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { unmountHost } from '../../__tests__/react-host-cleanup.js'
import { installReactActEnvironment } from '../../__tests__/react-io-wait.js'
import { DsDraftTextArea, DsDraftTextInput } from './index.js'

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>
let restoreActEnvironment: () => void

beforeEach(() => {
  restoreActEnvironment = installReactActEnvironment()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await unmountHost({ host, root, restoreResourceObservers: restoreActEnvironment })
})

async function keyDown(
  element: HTMLInputElement | HTMLTextAreaElement,
  key: string,
  modifiers: Omit<KeyboardEventInit, 'key'> = {},
): Promise<KeyboardEvent> {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...modifiers })
  await act(async () => element.dispatchEvent(event))
  return event
}

async function typeDraft(element: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const prototype =
    element instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype
  const setValue = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (!setValue) throw new Error('Missing native value setter')
  await act(async () => {
    element.focus()
    setValue.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

test('Enter writes the selected action name once and Escape discards the next draft', async () => {
  const acceptedNames: string[] = []
  let canceledEdits = 0

  function ActionNameField() {
    const [name, setName] = useState('过场转身')
    return (
      <>
        <DsDraftTextInput
          aria-label="名称"
          draftKey="sprite:hero:action:turn:label"
          value={name}
          onCommit={(next) => {
            acceptedNames.push(next)
            setName(next)
          }}
          onCancel={() => {
            canceledEdits++
          }}
        />
        <output>{name}</output>
      </>
    )
  }

  await act(async () => root.render(<ActionNameField />))
  const field = host.querySelector('input')!
  await typeDraft(field, '转向客栈门')
  expect(host.querySelector('output')?.textContent).toBe('过场转身')
  expect(field.getAttribute('data-ds-draft-commit')).toBe('text')
  await keyDown(field, 'Enter')
  expect(host.querySelector('output')?.textContent).toBe('转向客栈门')

  await typeDraft(field, '尚未保存')
  await keyDown(field, 'Escape')
  expect(field.value).toBe('转向客栈门')
  expect(acceptedNames).toEqual(['转向客栈门'])
  expect(canceledEdits).toBe(1)
})

test('an external history revision drops a draft when the canonical name is unchanged', async () => {
  const attemptedNames: string[] = []
  const renderField = (version: number) =>
    act(async () =>
      root.render(
        <DsDraftTextInput
          aria-label="名称"
          draftKey="sprite:hero:action:turn:label"
          syncToken={version}
          value="过场转身"
          onCommit={(name) => {
            attemptedNames.push(name)
          }}
        />,
      ),
    )

  await renderField(1)
  const field = host.querySelector('input')!
  await typeDraft(field, '未保存的新名称')
  expect(field.value).toBe('未保存的新名称')
  await renderField(2)
  expect(field.value).toBe('过场转身')
  await act(async () => field.blur())
  expect(attemptedNames).toEqual([])
})

test('when an author transaction rejects the new name, blur restores the canonical label', async () => {
  const attemptedNames: string[] = []
  await act(async () =>
    root.render(
      <DsDraftTextInput
        aria-label="名称"
        draftKey="sprite:hero:action:turn:label"
        value="过场转身"
        onCommit={(name) => {
          attemptedNames.push(name)
          return false
        }}
      />,
    ),
  )
  const field = host.querySelector('input')!
  await typeDraft(field, '过期编辑')
  await act(async () => field.blur())
  expect(attemptedNames).toEqual(['过期编辑'])
  expect(field.value).toBe('过场转身')
})

test('multiline fields keep Enter for editing and submit the complete text with Ctrl+Enter', async () => {
  const savedDescriptions: string[] = []
  await act(async () =>
    root.render(
      <DsDraftTextArea
        aria-label="说明"
        draftKey="skill:healing:description"
        value="恢复体力。"
        onCommit={(description) => {
          savedDescriptions.push(description)
        }}
      />,
    ),
  )
  const field = host.querySelector('textarea')!
  await typeDraft(field, '恢复体力。\n只对单一队员生效。')
  expect((await keyDown(field, 'Enter')).defaultPrevented).toBe(false)
  expect(savedDescriptions).toEqual([])
  expect(document.activeElement).toBe(field)
  expect((await keyDown(field, 'Enter', { ctrlKey: true })).defaultPrevented).toBe(true)
  expect(savedDescriptions).toEqual(['恢复体力。\n只对单一队员生效。'])
  expect(document.activeElement).not.toBe(field)
})

async function composition(element: HTMLInputElement, type: 'compositionstart' | 'compositionend') {
  await act(async () => element.dispatchEvent(new CompositionEvent(type, { bubbles: true })))
}

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
  await typeDraft(field, '仙剑奇侠传')
  await keyDown(field, 'Enter', { isComposing: true })
  expect(commits).not.toHaveBeenCalled()
  expect(validate).not.toHaveBeenCalled()
  await composition(field, 'compositionend')
  expect(commits).not.toHaveBeenCalled()
  await keyDown(field, 'Enter')
  await act(async () => field.blur())
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
  await typeDraft(field, '李逍遥新')
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

test('drops the draft when only the object identity changes and follows later canonical edits', async () => {
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
  await typeDraft(field, '未提交的甲')
  expect(field.value).toBe('未提交的甲')
  await renderField('actor:b:name', '李逍遥', 0)
  expect(field.value).toBe('李逍遥')
  await act(async () => field.blur())
  expect(commits).not.toHaveBeenCalled()

  await renderField('actor:b:name', '新名字', 1)
  expect(field.value).toBe('新名字')
  await renderField('actor:b:name', '赵灵儿', 2)
  expect(field.value).toBe('赵灵儿')
  await renderField('actor:b:name', '新名字', 3)
  expect(field.value).toBe('新名字')
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
  const finalText = '字'.repeat(100)
  for (let length = 1; length <= finalText.length; length += 1) {
    await typeDraft(field, finalText.slice(0, length))
  }
  expect(field.value).toBe(finalText)
  expect(commits).not.toHaveBeenCalled()
  expect(validate).not.toHaveBeenCalled()
  await act(async () => field.blur())
  expect(commits.mock.calls).toEqual([[finalText]])
  expect(validate.mock.calls).toEqual([[finalText]])
})
