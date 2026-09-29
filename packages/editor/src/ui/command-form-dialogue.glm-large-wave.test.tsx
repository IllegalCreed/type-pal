// @vitest-environment jsdom
/**
 * TEST-GLM-LARGE-WAVE-4 A02（dialogue 对）：立绘启用/表情切换的提交合同。
 * 去重：CommandForm.current-dialog 已证身份切换、称谓覆盖、位置/光标/自动推进、加行；
 * current-characterization 已证 actor 立绘选项清单与说话人回调分离。本文件只补：
 * unbound 身份从目录首张 portrait 资产启用立绘、side 切换保资产、取消清除；
 * actor 立绘启用后主立绘↔命名表情切换。运行时方言 cue（无 identity）的说话人/立绘臂
 * 对 canonical 作者路径不可达，登记回执不测试。
 */
import type { DialogueIdentity } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  chooseRowOption,
  mountCommandForm,
  row,
} from '../__tests__/glm-large-wave/command-form-glw-kit.js'
import type { SharedAuthorCommand } from './command-form-contract.js'

type UnboundIdentity = Extract<DialogueIdentity, { kind: 'unbound' }>

function unboundCommand(): SharedAuthorCommand {
  const identity: UnboundIdentity = { kind: 'unbound', speaker: '路人' }
  return { kind: 'dialog', cue: { identity, rows: [{ text: '一行' }] } }
}

async function toggleCheckbox(label: string, checked: boolean): Promise<void> {
  const box = row(label).querySelector<HTMLInputElement>('input[type="checkbox"]')
  if (!box) throw new Error(`missing checkbox ${label}`)
  if (box.checked !== checked) {
    const { act } = await import('react')
    await act(async () => box.click())
  }
}

test('unbound identity enables a portrait from the first catalog portrait and commits the asset id', async () => {
  const form = await mountCommandForm(unboundCommand(), { portraitAssets: ['portrait-guest'] })
  await toggleCheckbox('立绘', true)
  expect(form.expectLegal()).toEqual({
    kind: 'dialog',
    cue: {
      identity: {
        kind: 'unbound',
        speaker: '路人',
        portrait: { asset: 'portrait-guest', side: 'right' },
      },
      rows: [{ text: '一行' }],
    },
  })
})

test('unbound portrait keeps its asset when the side flips and clears the whole portrait when disabled', async () => {
  const form = await mountCommandForm(
    {
      kind: 'dialog',
      cue: {
        identity: {
          kind: 'unbound',
          speaker: '路人',
          portrait: { asset: 'portrait-guest', side: 'right' },
        },
        rows: [{ text: '一行' }],
      },
    },
    { portraitAssets: ['portrait-guest'] },
  )
  // 行内第一个组合框是立绘资产选择器，第二个是左右侧。
  await chooseRowOption('立绘', '左', 1)
  expect(form.expectLegal()).toMatchObject({
    cue: { identity: { portrait: { asset: 'portrait-guest', side: 'left' } } },
  })
  await toggleCheckbox('立绘', false)
  expect(form.expectLegal()).toEqual({
    kind: 'dialog',
    cue: { identity: { kind: 'unbound', speaker: '路人' }, rows: [{ text: '一行' }] },
  })
})

test('actor portrait enables from the actor portrait set and switches to a named expression', async () => {
  const form = await mountCommandForm(
    {
      kind: 'dialog',
      cue: {
        identity: { kind: 'actor', actor: 'hero' },
        rows: [{ text: '一行' }],
      },
    },
    {
      portraitAssets: ['portrait-hero', 'portrait-hero-mad'],
      heroPortraits: { default: 'portrait-hero', expressions: { angry: 'portrait-hero-mad' } },
    },
  )
  await toggleCheckbox('人物立绘', true)
  expect(form.expectLegal()).toMatchObject({
    cue: {
      identity: { kind: 'actor', actor: 'hero', portrait: { kind: 'default', side: 'right' } },
    },
  })
  await chooseRowOption('人物立绘', 'angry', 0)
  expect(form.expectLegal()).toMatchObject({
    cue: {
      identity: {
        kind: 'actor',
        portrait: { kind: 'expression', expression: 'angry', side: 'right' },
      },
    },
  })
})
