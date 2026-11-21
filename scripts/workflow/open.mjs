import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const root = fileURLToPath(new URL('../../', import.meta.url))
const selectors = {
  code: '开发、修改、重构或审查代码',
  docs: '新建、修改或治理文档',
  cleanup: '仓库清理与精简（长期）',
  task: '开始或接手非小改',
  test: '写、改或审查测试',
  game: '第一阶段机制或缺陷',
  reforge: '第二阶段引擎、编辑器或内容',
  lore: '世界观查证、剧情设定或创作',
  phase3: '第三阶段规划、储备或参考',
  e2e: 'E2E、剧情回写或编辑器预览起点',
  release: '封板、合并或发布回执',
}
export const workflowIds = Object.keys(selectors)
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

export async function openWorkflow(operations, card) {
  assert(Array.isArray(operations) && operations.length, `选择工作流: ${workflowIds.join(',')}`)
  const ids = [...new Set(operations)].sort()
  const agents = await readFile(resolve(root, 'AGENTS.md'), 'utf8')
  const selected = new Map([['AGENTS.md', []]])
  for (const id of ids) {
    const label = selectors[id]
    assert(Object.hasOwn(selectors, id), `未知工作流: ${id}`)
    const rows = agents.split('\n').filter((line) => line.startsWith(`| ${label} |`))
    assert.equal(rows.length, 1, `AGENTS 路由不唯一: ${label}`)
    const links = [...rows[0].split('|')[2].matchAll(/\[[^\]]+\]\((docs\/[^\s)#]+)(#[^\s)]+)?\)/gu)]
    assert(links.length, `AGENTS 缺少必读入口: ${label}`)
    for (const [, path, anchor] of links) {
      assert(!path.split('/').includes('..'), '必读入口必须在 docs 下')
      if (!selected.has(path)) selected.set(path, [])
      if (anchor) selected.get(path).push(anchor)
    }
  }
  if (card) {
    assert(/^docs\/tasks\/cards\/[A-Z0-9][A-Za-z0-9-]*\.md$/u.test(card), '使用活动任务卡相对路径')
    selected.set(card, [])
  }
  const documents = await Promise.all(
    [...selected].map(async ([path, anchors]) => {
      const body = path === 'AGENTS.md' ? agents : await readFile(resolve(root, path), 'utf8')
      assert(body.trim(), `必读文档为空: ${path}`)
      return { path, anchors: [...new Set(anchors)], sha256: sha256(body), body }
    }),
  )
  return {
    receipt: {
      kind: 'workflow-source-load',
      checkout: root,
      operations: ids,
      card: card ?? null,
      documents: documents.map(({ body, ...proof }) => proof),
    },
    documents,
  }
}

/** Only a standalone command is exempted from the new-turn tool gate. */
export function workflowInvocation(command) {
  if (typeof command !== 'string') return null
  const match =
    /^node scripts\/workflow\/open\.mjs ([a-z0-9,]+)(?: (docs\/tasks\/cards\/[A-Za-z0-9-]+\.md))?$/u.exec(
      command.trim(),
    )
  return match ? { operations: match[1].split(','), card: match[2] } : null
}

export function workflowNotice(receipt) {
  return `工作流：${receipt.operations.map((id) => selectors[id]).join('；')}。任务：${receipt.card ?? '按当前请求定界'}。必读来源：${receipt.documents.map(({ path, anchors }) => [path, ...anchors].join(' ')).join('、')}。`
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [operations, card, ...extra] = process.argv.slice(2)
  assert(
    operations && !extra.length,
    '用法: node scripts/workflow/open.mjs WORKFLOW[,WORKFLOW] [CARD]',
  )
  const { receipt, documents } = await openWorkflow(operations.split(','), card)
  console.log(workflowNotice(receipt))
  for (const { path, anchors, body } of documents) {
    console.log(`\n--- ${path} ${anchors.join(' ')} ---\n${body}`)
  }
}
