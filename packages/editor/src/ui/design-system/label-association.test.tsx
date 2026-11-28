// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, test } from 'vitest'
import {
  DsDraftNumberInput,
  DsDraftTextArea,
  DsDraftTextInput,
  DsNumberInput,
  DsTextArea,
  DsTextInput,
} from './index.js'

test.each([
  [
    'plain text',
    () => (
      <label>
        精灵 ID
        <DsTextInput defaultValue="spirit" />
      </label>
    ),
  ],
  [
    'plain number',
    () => (
      <label>
        列数
        <DsNumberInput defaultValue={2} />
      </label>
    ),
  ],
  [
    'plain multiline',
    () => (
      <label>
        备注
        <DsTextArea defaultValue="备用帧" />
      </label>
    ),
  ],
  [
    'draft text',
    () => (
      <label>
        用途名称
        <DsDraftTextInput draftKey="sprite:spirit:label" value="灵灯" onCommit={() => false} />
      </label>
    ),
  ],
  [
    'draft number',
    () => (
      <label>
        停留时间
        <DsDraftNumberInput draftKey="frame:0:durationMs" value={120} onCommit={() => false} />
      </label>
    ),
  ],
  [
    'draft multiline',
    () => (
      <label>
        法术说明
        <DsDraftTextArea
          draftKey="skill:heal:description"
          value="恢复体力"
          onCommit={() => false}
        />
      </label>
    ),
  ],
] as const)('%s renders its actual native input inside the author label', (_name, field) => {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(field())
  const label = host.querySelector('label')!
  const input = host.querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!
  expect(input).not.toBeNull()
  expect(label.control).toBe(input)
  expect([...input.labels!]).toEqual([label])
})
