import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isTaskDocument, renderTaskIndex, taskInfo } from './check.mjs'

const historicalFile = 'docs/ops/archive/tasks/done/ED-DS-3-editor-design-system-adoption-gate.md'

test('task documents are only cards in the active, done, and cancelled directories', () => {
  assert.equal(isTaskDocument('docs/ops/tasks/T.md'), true)
  assert.equal(isTaskDocument('docs/ops/archive/tasks/done/T.md'), true)
  assert.equal(isTaskDocument('docs/ops/archive/tasks/cancelled/T.md'), true)
  for (const name of ['README.md', 'index.md', 'TASK-template.md', 'TASK-lite-template.md']) {
    assert.equal(isTaskDocument(`docs/ops/tasks/${name}`), false)
    assert.equal(isTaskDocument(`docs/ops/archive/tasks/done/${name}`), false)
  }
  assert.equal(isTaskDocument('docs/ops/tasks/nested/T.md'), false)
  assert.equal(isTaskDocument('docs/ops/templates/TASK-template.md'), false)
  assert.equal(isTaskDocument('docs/ops/board.md'), false)
})

test('a missing top title falls back to the file name and later status text does not replace Status', () => {
  const untitled = 'docs/ops/tasks/NO-TITLE.md'
  assert.deepEqual(
    taskInfo(untitled, 'Status: draft\n\n## History\n# Later title\nStatus: done\n'),
    {
      file: untitled,
      title: 'NO-TITLE.md',
      status: 'draft',
      historical: false,
    },
  )
  assert.deepEqual(
    taskInfo(
      historicalFile,
      '# Kept\n\nStatus: review\n> **状态**：done\n\n## History\nStatus: blocked\n',
    ),
    { file: historicalFile, title: 'Kept', status: 'review', historical: false },
  )
})

test('a mixed task index sorts, escapes title pipes, and does not mutate the input array', () => {
  const tasks = [
    { file: 'docs/ops/tasks/B.md', title: 'Build | name', status: 'build' },
    { file: 'docs/ops/archive/tasks/done/A.md', title: 'Done', status: 'done' },
    { file: 'docs/ops/archive/tasks/cancelled/C.md', title: 'Cancel', status: 'cancelled' },
    { file: 'docs/ops/tasks/A.md', title: 'Draft', status: 'draft' },
  ]
  const before = structuredClone(tasks)
  assert.equal(
    renderTaskIndex(tasks),
    [
      '# 任务卡索引',
      '',
      '由 `node scripts/docs/check.mjs --print-task-index` 生成；只读取每张卡顶部状态。',
      '当前行动入口为 [看板](../board.md)，维护规则见 [任务卡说明](README.md)。',
      '已关闭卡内的旧指令、签字请求与交接提示均为历史，不自动授权当前执行。',
      '',
      'Last reviewed: 2026-10-17',
      'Template: governance-index-v1 / 1.0.0',
      '',
      '## 目的',
      '- 提供任务卡状态、入口和历史边界的单一导航视图。',
      '',
      '## 范围',
      '- 当前包含：活动、已完成和已取消任务卡的生成索引。',
      '- 明确不包含：产品实现验收、runtime、E2E、视觉或 coverage 结论。',
      '',
      '## 当前状态',
      '- `status`: current',
      '- `lastReviewed`: 2026-10-17',
      '',
      '## 入口与责任',
      '- canonical 入口：`docs/ops/tasks/index.md` 与当前任务卡。',
      '- Owner：Codex 维护生成器与治理账本；任务 Owner 维护卡内状态。',
      '- 下游使用者：看板、任务卡检查器和文档治理 registry。',
      '',
      '## 证据与下一步',
      '- 关键来源：`scripts/docs/check.mjs`、`docs/ops/board.md`、各任务卡顶部 `Status`。',
      '- 未决/阻塞：历史任务的产品验收和证据缺口仍以各卡为准。',
      '- 下一步：每次任务状态或入口变化后重新生成索引并刷新 review SHA。',
      '',
      '## 活动任务',
      '',
      '| 任务 | 顶部状态 | 说明 |',
      '|---|---|---|',
      '| [Draft](A.md) | draft | 以任务卡当前准入与看板分工为准。 |',
      '| [Build \\| name](B.md) | build | 以任务卡当前准入与看板分工为准。 |',
      '',
      '## 已完成（historical）',
      '',
      '| 任务 | 顶部状态 | 说明 |',
      '|---|---|---|',
      '| [Done](../archive/tasks/done/A.md) | done | 完成证据、历史签字与交接见原卡。 |',
      '',
      '## 已取消（superseded / historical）',
      '',
      '| 任务 | 顶部状态 | 说明 |',
      '|---|---|---|',
      '| [Cancel](../archive/tasks/cancelled/C.md) | cancelled | 取消原因与替代项见卡内终态裁决。 |',
      '',
    ].join('\n'),
  )
  assert.deepEqual(tasks, before)
})
