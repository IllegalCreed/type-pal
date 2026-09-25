import assert from 'node:assert/strict'
import { test } from 'node:test'
import { markdownLinks, withoutFences } from './markdown.mjs'

const mixed = [
  '中文导语，不是链接。',
  '```md',
  '[假](fence.md)',
  '```',
  '<!-- 注释 [假](comment.md) -->',
  '见 [指南][guide]',
  '与 [正文](./真实.md)。',
  '',
  '[guide]: ./定义.md',
].join('\n')

test('Chinese multiline fences and comments keep real link lines and positions on the original input', () => {
  const input = mixed
  const hidden = withoutFences(input)
  assert.equal(hidden.length, input.length)
  assert.equal(hidden.split('\n').length, input.split('\n').length)
  assert.equal(hidden.split('\n')[1], ' '.repeat(input.split('\n')[1].length))
  assert.equal(hidden.split('\n')[4], ' '.repeat(input.split('\n')[4].length))
  assert.equal(hidden.split('\n')[6], input.split('\n')[6])

  const definitionAt = input.indexOf('./定义.md')
  const directAt = input.indexOf('./真实.md')
  assert.equal(input.slice(definitionAt, definitionAt + './定义.md'.length), './定义.md')
  assert.equal(input.slice(directAt, directAt + './真实.md'.length), './真实.md')

  const positioned = markdownLinks(input, { positions: true })
  assert.deepEqual(positioned, [
    {
      target: './定义.md',
      line: 9,
      start: definitionAt,
      end: definitionAt + './定义.md'.length,
    },
    {
      target: './定义.md',
      line: 6,
      start: definitionAt,
      end: definitionAt + './定义.md'.length,
    },
    {
      target: './真实.md',
      line: 7,
      start: directAt,
      end: directAt + './真实.md'.length,
    },
  ])
  for (const link of positioned) assert.equal(input.slice(link.start, link.end), link.target)
  assert.notEqual(positioned[1].line, positioned[0].line)
  assert.equal(positioned[1].start, positioned[0].start)
  assert.ok(positioned[1].start > input.indexOf('[指南][guide]'))

  assert.deepEqual(
    markdownLinks(input),
    positioned.map(({ target, line }) => ({ target, line })),
  )
  assert.equal(input, mixed)
})
