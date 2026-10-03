// @vitest-environment jsdom
import { type AuthorCommand, type AuthorScriptFlow, checkAuthorScriptFlow } from '@type-pal/content'
import { act } from 'react'
import { expect, test } from 'vitest'
import { click, commandForm } from './__tests__/command-form-current-fixture.js'
import { removeTriggerStage } from './ScriptEditor.js'

async function chooseField(label: string, option: string) {
  const field = [...document.querySelectorAll<HTMLLabelElement>('[role="dialog"] label')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  expect(field).toBeDefined()
  const select = document.getElementById(field!.htmlFor)!
  await act(async () => select.click())
  const choice = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.textContent === option,
  )
  expect(choice).toBeDefined()
  await act(async () => choice!.click())
}

test.each([
  ['下次仍执行当前步骤', { kind: 'stay' }],
  ['下次进入复读', { kind: 'stage', stage: 'repeat' }],
  ['本方案完成，不再执行', { kind: 'complete' }],
] as const)('finishStep authors %s directly without an outcome/state form', async (label, next) => {
  const f = await commandForm(
    { kind: 'finishStep', next: { kind: 'stage', stage: 'first' } },
    {
      requireLeafFormRow: false,
      commandScope: {
        kind: 'flow',
        currentStep: 'first',
        steps: [
          { id: 'first', label: '首次交谈' },
          { id: 'repeat', label: '复读' },
        ],
      },
    },
  )
  await chooseField('结束本次执行后', label)
  expect(document.body.textContent).not.toContain('结果识别名')
  expect(document.body.textContent).not.toContain('目标状态')
  await f.finish({ kind: 'finishStep', next })
})

test('repeat and conditional loops use explicit count/mode rather than scheduling controls', async () => {
  const f = await commandForm(
    {
      kind: 'loop',
      mode: 'while',
      cond: { kind: 'flag', flag: 'again', is: true },
      body: [{ kind: 'wait', ms: 20 }],
    },
    { requireLeafFormRow: false },
  )
  await chooseField('循环方式', '持续循环')
  expect(document.body.textContent).not.toContain('最大次数')
  expect(document.body.textContent).not.toContain('worldTick')
  await f.finish({ kind: 'loop', mode: 'forever', body: [{ kind: 'wait', ms: 20 }] })
})

test('continueLoop selects a named lexical ancestor while preserving nested bodies', async () => {
  const original: AuthorCommand = {
    kind: 'repeat',
    id: 'outer',
    label: '外层尝试',
    count: 3,
    body: [
      {
        kind: 'repeat',
        id: 'inner',
        label: '内层动作',
        count: 2,
        body: [{ kind: 'continueLoop' }],
      },
    ],
  }
  const f = await commandForm(original, { requireLeafFormRow: false })
  await click('关闭')
  const row = document.querySelector<HTMLElement>('[data-command-path="0/body/0/body/0"]')!
  expect(row).not.toBeNull()
  await act(async () => row.dispatchEvent(new MouseEvent('dblclick', { bubbles: true })))
  await chooseField('开始下一轮', '外层尝试')
  const expected: AuthorCommand = {
    ...original,
    body: [
      {
        kind: 'repeat',
        id: 'inner',
        label: '内层动作',
        count: 2,
        body: [{ kind: 'continueLoop', loop: 'outer' }],
      },
    ],
  }
  await f.finish(expected)
})

test('deleting a step rewrites nested finish targets as well as the default successor', () => {
  const flow: AuthorScriptFlow = {
    kind: 'stages',
    initial: 'first',
    stages: [
      {
        id: 'first',
        next: 'old',
        body: [
          {
            kind: 'confirm',
            onYes: [
              {
                kind: 'repeat',
                count: 2,
                body: [{ kind: 'finishStep', next: { kind: 'stage', stage: 'old' } }],
              },
            ],
            onNo: [],
          },
        ],
      },
      { id: 'old', body: [] },
      { id: 'replacement', body: [] },
    ],
  }
  const before = structuredClone(flow)
  const result = removeTriggerStage(flow, 'old', 'replacement')
  expect(result.stages[0]?.next).toBe('replacement')
  expect(result.stages[0]?.body).toEqual([
    {
      kind: 'confirm',
      onYes: [
        {
          kind: 'repeat',
          count: 2,
          body: [{ kind: 'finishStep', next: { kind: 'stage', stage: 'replacement' } }],
        },
      ],
      onNo: [],
    },
  ])
  expect(() => checkAuthorScriptFlow(result, 'flow')).not.toThrow()
  expect(flow).toEqual(before)
})
