import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { auditDocuments, renderTaskIndex, taskInfo } from './check.mjs'
import { checkRouting, checkTemplateBody } from './document-model.mjs'

const config = {
  entry: 'AGENTS.md',
  entrySection: '操作与必读',
  forwardingEntries: ['CLAUDE.md'],
  routes: [{ operation: '改文档', required: ['docs/model.md'] }],
}
const files = {
  'AGENTS.md': '## 操作与必读\n\n| 改文档 | [模型](docs/model.md) | 先核来源与写回 |\n',
  'CLAUDE.md': '[规则](AGENTS.md#操作与必读)',
  'docs/model.md': '# 模型\n',
}

test('a copied historical route cannot authorize work when the live route points elsewhere', () => {
  const read = (path) =>
    path === 'AGENTS.md'
      ? '## 操作与必读\n| 改文档 | [旧规则](docs/old.md) | 读旧规则 |\n## 历史\n| 改文档 | [模型](docs/model.md) | 旧记载 |'
      : files[path]
  assert.deepEqual(checkRouting(config, read), ['改文档: mandatory link missing: docs/model.md'])
})

test('a routed target must exist; merely writing its name cannot satisfy the contract', () => {
  assert.deepEqual(
    checkRouting(config, (path) => files[path]),
    [],
  )
  assert.deepEqual(
    checkRouting(config, (path) => (path === 'docs/model.md' ? undefined : files[path])),
    ['改文档: target missing: docs/model.md'],
  )
})

test('an example fenced table is not the live operation route', () => {
  const read = (path) =>
    path === 'AGENTS.md'
      ? '## 操作与必读\n```md\n| 改文档 | [模型](docs/model.md) | 示例 |\n```'
      : files[path]
  assert.deepEqual(checkRouting(config, read), ['改文档: expected one live route row'])
})

test('a source-copy wrapper does not satisfy the registered index body contract', () => {
  const template = JSON.parse(
    readFileSync(new URL('../../docs/phase-governance/templates/registry.json', import.meta.url)),
  ).types.find((type) => type.docType === 'governance-index')
  const wrapper = '# Pilot\n\n## Preserved source body\n\nOriginal navigation.\n'
  assert.deepEqual(
    checkTemplateBody(wrapper, template),
    template.requiredSections.map((name) => `missing section: ${name}`),
  )
})

test('headings alone, including headings in examples, are insufficient migration evidence', () => {
  const template = { format: 'markdown', requiredSections: ['结果', '限制'] }
  assert.deepEqual(
    checkTemplateBody('# 回执\n## 结果\n### 子标题\n\n```md\n## 限制\n```', template),
    ['empty section: 结果', 'missing section: 限制'],
  )
})

test('moving a machine receipt into payload breaks its public top-level field contract', () => {
  const template = { format: 'json', requiredFields: ['id', 'steps', 'exitCode'] }
  const receipt = { id: 'run-001', steps: [], exitCode: null }
  assert.deepEqual(checkTemplateBody(JSON.stringify(receipt), template), [])
  assert.deepEqual(checkTemplateBody(JSON.stringify({ payload: receipt }), template), [
    'missing machine field: id',
    'missing machine field: steps',
    'missing machine field: exitCode',
  ])
  assert.deepEqual(checkTemplateBody('null', template), ['expected machine evidence object'])
})

test('a source audit cannot become execution evidence by changing its performed flag or envelope label', () => {
  const template = JSON.parse(
    readFileSync(new URL('../../docs/phase-governance/templates/registry.json', import.meta.url)),
  ).types.find((type) => type.docType === 'test-machine-evidence')
  const receipt = JSON.parse(
    readFileSync(new URL('../../docs/testing/e2e/evidence/e2e-001.json', import.meta.url)),
  )
  const options = { variant: 'document-audit-v2' }
  assert.deepEqual(checkTemplateBody(JSON.stringify(receipt), template, options), [])
  const falseExecution = structuredClone(receipt)
  falseExecution.runtimeExecution.performed = true
  assert.deepEqual(checkTemplateBody(JSON.stringify(falseExecution), template, options), [
    'machine field mismatch: runtimeExecution.performed',
  ])
  const mislabeled = structuredClone(receipt)
  mislabeled._governance.variant = 'execution'
  assert.deepEqual(checkTemplateBody(JSON.stringify(mislabeled), template, options), [
    'governance variant mismatch',
  ])
})

test('closing a task keeps its stable path while still removing its active-board authorization', () => {
  const path = 'docs/ops/tasks/T.md'
  const body = '# T\nStatus: done\n'
  const documents = new Map([
    ['docs/README.md', '[ops](ops/README.md)'],
    ['docs/ops/README.md', '[tasks](tasks/README.md) [board](board.md)'],
    ['docs/ops/tasks/README.md', '[index](index.md)'],
    ['docs/ops/tasks/index.md', renderTaskIndex([taskInfo(path, body)])],
    [path, body],
    ['docs/ops/board.md', '# No active tasks'],
  ])
  const run = () =>
    auditDocuments({
      documents,
      exists: (target) => documents.has(target),
      expectedVersions: { content: 20, save: 8 },
      sectionRules: [],
      exceptions: [],
    }).issues
  assert.deepEqual(run(), [])
  documents.set('docs/ops/board.md', '[T](tasks/T.md)')
  assert.match(
    run()
      .map((issue) => issue.message)
      .join('\n'),
    /仍链接终态任务/,
  )
})
