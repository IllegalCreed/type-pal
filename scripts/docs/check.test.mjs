import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  auditDocuments,
  checkCurrentSection,
  checkoutTargets,
  localTarget,
  renderTaskIndex,
  taskInfo,
} from './check.mjs'
import { currentSections } from './config.mjs'
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
      'docs/tasks/cards/ED-DS-3-editor-design-system-adoption-gate.md',
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

test('the shared-script guide checks every live declaration before its fixed original-source boundary', () => {
  const rule = currentSections.find(
    (entry) => entry.file === 'docs/phase2/guides/shared-script-author-guide.md',
  )
  const live = 'contentVersion 23 / SAVE12\n## 当前有效性\ncontent23\n'
  const history = '### 本次来源与完整原文\n````text\ncontentVersion 22 / SAVE12\n````\n'
  assert.deepEqual(checkCurrentSection(live + history, rule, { content: 23, save: 12 }), [])
  assert.match(
    checkCurrentSection(live.replace('contentVersion 23', 'contentVersion 22') + history, rule, {
      content: 23,
      save: 12,
    }).join('\n'),
    /content=23/,
  )
  assert.match(checkCurrentSection(live, rule, { content: 23, save: 12 })[0], /终点不存在/)
})

function fixture() {
  const task = '# T - test\n\nStatus: build\n\n## Evidence\nStatus: done\n'
  const documents = new Map([
    ['docs/README.md', '[tasks](tasks/README.md)'],
    ['docs/tasks/README.md', '[board](board.md) [cards](cards/README.md)'],
    ['docs/tasks/board.md', '[T](cards/T.md)'],
    ['docs/tasks/cards/README.md', '[index](index.md)'],
    ['docs/tasks/cards/T.md', task],
  ])
  documents.set(
    'docs/tasks/cards/index.md',
    renderTaskIndex([taskInfo('docs/tasks/cards/T.md', task)]),
  )
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
  const index = 'docs/tasks/cards/index.md'
  documents.set(index, documents.get(index).trimEnd())
  assert.deepEqual(run(documents).issues, [])
})

test('missing files, unindexed documents and active task absent from board fail independently', () => {
  const documents = fixture()
  documents.set('docs/tasks/board.md', '[missing](../../missing.md)')
  documents.set('docs/tasks/forgotten.md', '# Forgotten')
  documents.set('docs/new-topic/note.md', '# Note')
  const messages = run(documents)
    .issues.map((issue) => issue.message)
    .join('\n')
  assert.match(messages, /本地目标不存在/)
  assert.match(messages, /活动任务未链接/)
  assert.match(messages, /目录索引未链接：forgotten/)
  assert.match(messages, /缺少 README/)
})

test('explicit same-directory index delegation retains complete navigation coverage', () => {
  const documents = fixture()
  documents.set('docs/tasks/evidence/README.md', '[directory](index.md)')
  documents.set('docs/tasks/evidence/index.md', '[note](note.md) [case](case/README.md)')
  documents.set('docs/tasks/evidence/note.md', '# Note')
  documents.set('docs/tasks/evidence/case/README.md', '# Case')
  documents.set(
    'docs/tasks/README.md',
    '[board](board.md) [cards](cards/README.md) [evidence](evidence/README.md)',
  )
  assert.deepEqual(run(documents).issues, [])
  documents.set('docs/tasks/evidence/index.md', '[case](case/README.md)')
  assert.match(
    run(documents)
      .issues.map((issue) => issue.message)
      .join('\n'),
    /目录索引未链接：note/u,
  )
  documents.set('docs/tasks/evidence/index.md', '[note](note.md) [case](case/README.md)')
  documents.set('docs/tasks/evidence/README.md', '# No explicit delegation')
  const issues = run(documents)
    .issues.map((issue) => issue.message)
    .join('\n')
  assert.match(issues, /目录索引未链接：note/u)
  assert.match(issues, /子目录未进入导航：docs\/tasks\/evidence\/case/u)
})

test('closed card left on board and stale generated index fail', () => {
  const documents = fixture()
  documents.set('docs/tasks/cards/T.md', '# T - test\nStatus: done\n')
  const messages = run(documents)
    .issues.map((issue) => issue.message)
    .join('\n')
  assert.match(messages, /仍链接终态任务/)
  assert.match(messages, /任务索引与卡片顶部状态不一致/)
})

test('board row and top-level card state must agree', () => {
  const documents = fixture()
  documents.set('docs/tasks/board.md', '| T | Test | review | Owner | [T](cards/T.md) |')
  assert.match(run(documents).issues[0].message, /看板状态 review/)
  documents.set('docs/tasks/board.md', '| T | Test | build | Owner | [T](cards/T.md) |')
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

test('archived task remains indexed and cannot silently disappear from the census', () => {
  const documents = fixture()
  const old = 'docs/tasks/cards/T.md'
  const archived = 'docs/tasks/archive/done/T.md'
  const body = '# T - test\nStatus: done\n'
  documents.delete(old)
  documents.set(archived, body)
  documents.set('docs/tasks/board.md', '# No active tasks')
  documents.set(
    'docs/tasks/README.md',
    '[board](board.md) [cards](cards/README.md) [archive](archive/README.md)',
  )
  documents.set('docs/tasks/archive/README.md', '[done](done/README.md)')
  documents.set('docs/tasks/archive/done/README.md', '[index](../../cards/index.md)')
  const index = renderTaskIndex([taskInfo(archived, body)])
  documents.set('docs/tasks/cards/index.md', index)
  assert.match(index, /\.\.\/archive\/done\/T\.md/)
  assert.deepEqual(run(documents).issues, [])
  documents.set(archived, '# T - test\nStatus: build\n')
  assert.match(
    run(documents)
      .issues.map((issue) => issue.message)
      .join('\n'),
    /活动任务不能放在历史/,
  )
})

test('phase2 mixed folders and top-level topic drift are rejected', () => {
  const documents = fixture()
  documents.set('docs/phase2/README.md', '[topic](old-topic.md) [foundation](foundation/README.md)')
  documents.set('docs/phase2/old-topic.md', '# Topic')
  documents.set('docs/phase2/foundation/README.md', '# Old mixed folder')
  const messages = run(documents)
    .issues.map((issue) => issue.message)
    .join('\n')
  assert.match(messages, /顶层仅保留方针/)
})

test('rejecting an old content version is not a declaration of the current version', () => {
  assert.deepEqual(
    checkCurrentSection(
      '当前 contentVersion 20。当前产品不保留 content19 parser。',
      {},
      { content: 20, save: 8 },
    ),
    [],
  )
  assert.match(
    checkCurrentSection(
      '不支持旧版本，当前 contentVersion 19。',
      {},
      { content: 20, save: 8 },
    ).join('\n'),
    /不一致/,
  )
})

test('a local OS metadata file cannot make a non-checkout document link pass', () => {
  const documents = fixture()
  documents.set('docs/README.md', '[tasks](tasks/README.md) [metadata](.DS_Store)')
  const diskFiles = new Set([...documents.keys(), 'docs/.DS_Store'])
  const available = checkoutTargets([...documents.keys()])
  const result = auditDocuments({
    documents,
    exists: (path) => diskFiles.has(path) && available.has(path),
    expectedVersions: { content: 20, save: 8 },
    sectionRules: [],
    exceptions: [],
  })
  assert.equal(available.has('docs/tasks'), true)
  assert.equal(result.issues.length, 1)
  assert.match(result.issues[0].message, /无法随仓库检出.*DS_Store/)
})
