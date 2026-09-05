import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  auditDocuments,
  checkCurrentSection,
  localTarget,
  renderTaskIndex,
  taskInfo,
} from './check.mjs'
import { markdownLinks } from './markdown.mjs'

test('links handle nested labels, code labels, spaces, balanced paths, titles and references', () => {
  const text = [
    '[`code`](../code.ts#L2) [a [nested] label](<../some file.md> "title")',
    '[x](../file(with-parentheses).md) ![image](./picture.png)',
    '[long][guide] [Guide][] [guide]',
    '[guide]: ../guide.md "A guide"',
  ].join('\n')
  assert.deepEqual(
    markdownLinks(text)
      .map((link) => link.target)
      .sort(),
    [
      '../code.ts#L2',
      '../some file.md',
      '../file(with-parentheses).md',
      './picture.png',
      '../guide.md',
      '../guide.md',
      '../guide.md',
      '../guide.md',
    ].sort(),
  )
})

test('fenced, quoted-fenced, inline code and escaped examples do not become live links', () => {
  const text = [
    '```md',
    '[fake](missing.md)',
    '```',
    '> ~~~~text',
    '> [fake](also-missing.md)',
    '> ~~~~',
    '`[fake](inline.md)` and ``one ` [fake](two.md)``',
    '<!-- [fake](comment.md) -->',
    '\\[fake](escaped.md)',
    '[real](exists.md)',
  ].join('\n')
  assert.deepEqual(markdownLinks(text), [{ target: 'exists.md', line: 10 }])
})

test('prose after array brackets and incomplete destinations are not parsed as valid links', () => {
  assert.deepEqual(
    markdownLinks('InputSnapshot[](向右走 3 步) rgTrail[5](P0.d 已建) [x](unfinished'),
    [],
  )
  assert.deepEqual(markdownLinks('[x](foo.md "valid title") [y](foo.md invalid title)'), [
    { target: 'foo.md', line: 1 },
  ])
})

test('local links decode paths and reject external URLs from file checks', () => {
  assert.equal(localTarget('docs/a.md', '../file%20name.md#part'), 'file name.md')
  assert.equal(localTarget('docs/a.md', '/README.md'), 'README.md')
  assert.equal(localTarget('docs/a.md', 'https://example.org/a.md'), undefined)
  assert.equal(localTarget('docs/a.md', '#local'), undefined)
  assert.equal(localTarget('docs/a.md', '../../outside.md'), '../outside.md')
  assert.throws(() => localTarget('docs/a.md', '%zz'))
})

test('task status comes only from the top, preserving historical alternate spelling for known closed cards', () => {
  assert.equal(
    taskInfo('T.md', '# Task\n\nStatus: done（accepted）\n\n## History\nStatus: blocked').status,
    'done',
  )
  assert.equal(taskInfo('T.md', '# Task\n## History\nStatus: done').status, undefined)
  assert.equal(taskInfo('T.md', '# Task\n> **状态**：done').status, undefined)
  assert.equal(
    taskInfo(
      'docs/ops/tasks/ED-DS-3-editor-design-system-adoption-gate.md',
      '# Task\n> **状态**：done',
    ).status,
    'done',
  )
})

test('current versions are checked in a bounded contract, leaving historical formats intact', () => {
  const rule = { start: /^## Current/m, end: /^## History/m }
  const expected = { content: 20, save: 8 }
  assert.deepEqual(
    checkCurrentSection(
      '## Current\ncontentVersion: 20 / SAVE8\n## History\ncontent19 SAVE7',
      rule,
      expected,
    ),
    [],
  )
  assert.match(
    checkCurrentSection('## Current\ncontent19 SAVE7\n## History', rule, expected).join('\n'),
    /content=20/,
  )
  assert.match(
    checkCurrentSection('## Current\ncontent19 SAVE7\n## History', rule, expected).join('\n'),
    /save=8/,
  )
  assert.match(checkCurrentSection('## Current\ncontent20', rule, expected)[0], /终点不存在/)
  assert.match(
    checkCurrentSection('## Current\nno version\n## History', rule, expected)[0],
    /缺少明确/,
  )
  assert.deepEqual(
    checkCurrentSection('contentVersion 20; 不支持 contentVersion 1..19 / SAVE 1..7', {}, expected),
    [],
  )
})

function fixture() {
  const task = '# T - test\n\nStatus: build\n\n## Evidence\nStatus: done\n'
  const documents = new Map([
    ['docs/README.md', '[ops](ops/README.md)'],
    ['docs/ops/README.md', '[board](board.md)'],
    ['docs/ops/board.md', '[T](tasks/T.md)'],
    ['docs/ops/tasks/README.md', '[index](index.md)'],
    ['docs/ops/tasks/T.md', task],
  ])
  documents.set('docs/ops/tasks/index.md', renderTaskIndex([taskInfo('docs/ops/tasks/T.md', task)]))
  return documents
}

const run = (documents, exceptions = []) =>
  auditDocuments({
    documents,
    exceptions,
    exists: (path) => documents.has(path),
    expectedVersions: { content: 20, save: 8 },
    sectionRules: [],
  })

test('clean document tree and task index pass without generated assets or node_modules', () => {
  assert.deepEqual(run(fixture()).issues, [])
  const documents = fixture()
  const index = 'docs/ops/tasks/index.md'
  documents.set(index, documents.get(index).trimEnd())
  assert.deepEqual(run(documents).issues, [])
})

test('missing files, unindexed documents and active task absent from board fail independently', () => {
  const documents = fixture()
  documents.set('docs/ops/board.md', '[missing](../../missing.md)')
  documents.set('docs/ops/forgotten.md', '# Forgotten')
  documents.set('docs/new-topic/note.md', '# Note')
  const messages = run(documents)
    .issues.map((issue) => issue.message)
    .join('\n')
  assert.match(messages, /本地目标不存在/)
  assert.match(messages, /活动任务未链接/)
  assert.match(messages, /目录索引未链接：forgotten/)
  assert.match(messages, /缺少 README/)
})

test('closed card left on board and stale generated index fail', () => {
  const documents = fixture()
  documents.set('docs/ops/tasks/T.md', '# T - test\nStatus: done\n')
  const messages = run(documents)
    .issues.map((issue) => issue.message)
    .join('\n')
  assert.match(messages, /仍链接终态任务/)
  assert.match(messages, /任务索引与卡片顶部状态不一致/)
})

test('board row and top-level card state must agree', () => {
  const documents = fixture()
  documents.set('docs/ops/board.md', '| T | Test | review | Owner | [T](tasks/T.md) |')
  assert.match(run(documents).issues[0].message, /看板状态 review/)
  documents.set('docs/ops/board.md', '| T | Test | build | Owner | [T](tasks/T.md) |')
  assert.deepEqual(run(documents).issues, [])
})

test('exceptions are exact and require reasons; stale exceptions fail', () => {
  const documents = fixture()
  documents.set('vendor.md', '[source](missing.md)')
  const exceptions = [
    { source: 'vendor.md', target: 'missing.md', reason: 'Frozen upstream reference.' },
  ]
  assert.deepEqual(run(documents, exceptions).issues, [])
  documents.set('vendor.md', '[source](different.md)')
  assert.equal(run(documents, exceptions).issues.length, 2)
  documents.set('vendor.md', '[source](missing.md)')
  documents.set('missing.md', '# Exists now')
  assert.match(run(documents, exceptions).issues[0].message, /过期例外/)
  documents.delete('missing.md')
  assert.match(
    run(documents, [{ source: 'vendor.md', target: 'missing.md' }]).issues[0].message,
    /缺少理由/,
  )
})
