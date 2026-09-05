import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { basename, dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  cancelledReasons,
  currentSections,
  historicalStatusFiles,
  linkExceptions,
} from './config.mjs'
import { markdownLinks } from './markdown.mjs'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const taskDirectory = 'docs/ops/tasks/'
const archivedTaskDirectories = ['docs/ops/archive/tasks/done', 'docs/ops/archive/tasks/cancelled']
const taskIndex = `${taskDirectory}index.md`
const statuses = new Set(['draft', 'build', 'review', 'done', 'blocked', 'rework', 'cancelled'])
const terminal = new Set(['done', 'cancelled'])

export function isTaskDocument(file) {
  return (
    [taskDirectory.slice(0, -1), ...archivedTaskDirectories].includes(dirname(file)) &&
    !['README.md', 'index.md', 'TASK-template.md', 'TASK-lite-template.md'].includes(basename(file))
  )
}

export function checkoutTargets(files) {
  const targets = new Set(['.'])
  for (const file of files) {
    let path = file
    while (path !== '.') {
      targets.add(path)
      const parent = dirname(path)
      if (parent === path) break
      path = parent
    }
  }
  return targets
}

export function localTarget(source, target) {
  if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(target)) return undefined
  const path = decodeURIComponent(target.split(/[?#]/, 1)[0])
  if (!path) return undefined
  return path.startsWith('/') ? path.slice(1) : relative('.', resolve(dirname(source), path))
}

export function taskInfo(file, text) {
  const top = text.split(/^## /m, 1)[0]
  const status = /^Status:\s*([a-z]+)/m.exec(top)?.[1]
  const historical = /^>\s*\*\*状态\*\*[：:]\s*([a-z]+)/m.exec(top)?.[1]
  const value = status ?? (historicalStatusFiles.has(basename(file)) ? historical : undefined)
  return {
    file,
    title: /^#\s+(.+)$/m.exec(top)?.[1] ?? basename(file),
    status: value,
    historical: !status && Boolean(value),
  }
}

const tableText = (value) => value.replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ')

export function renderTaskIndex(tasks) {
  const out = [
    '# 任务卡索引',
    '',
    '由 `node scripts/docs/check.mjs --print-task-index` 生成；只读取每张卡顶部状态。',
    '当前行动入口为 [看板](../board.md)，维护规则见 [任务卡说明](README.md)。',
    '已关闭卡内的旧指令、签字请求与交接提示均为历史，不自动授权当前执行。',
    '',
  ]
  const ordered = [...tasks].sort((a, b) => a.file.localeCompare(b.file, 'en'))
  for (const [label, group] of [
    ['活动任务', ordered.filter((task) => !terminal.has(task.status))],
    ['已完成（historical）', ordered.filter((task) => task.status === 'done')],
    ['已取消（superseded / historical）', ordered.filter((task) => task.status === 'cancelled')],
  ]) {
    out.push(`## ${label}`, '', '| 任务 | 顶部状态 | 说明 |', '|---|---|---|')
    for (const task of group) {
      const reason =
        task.status === 'cancelled'
          ? (cancelledReasons[basename(task.file)] ?? '取消原因与替代项见卡内终态裁决。')
          : task.status === 'done'
            ? '完成证据、历史签字与交接见原卡。'
            : '以任务卡当前准入与看板分工为准。'
      out.push(
        `| [${tableText(task.title)}](${relative(taskDirectory, task.file)}) | ${task.status} | ${reason} |`,
      )
    }
    out.push('')
  }
  return `${out.join('\n')}\n`
}

export function checkCurrentSection(text, rule, expected) {
  let section = text
  if (rule.start) {
    const match = rule.start.exec(text)
    if (!match) return ['现行合同起点不存在，请更新检查规则并核对文档分界']
    section = text.slice(match.index)
  }
  if (rule.end) {
    const match = rule.end.exec(section)
    if (!match) return ['现行合同终点不存在，请更新检查规则并核对文档分界']
    section = section.slice(0, match.index)
  }
  const errors = []
  // Ignore rejection ranges (1..19). Only content/SAVE identifiers are checked,
  // never map/catalog local format axes; history stays outside selected sections.
  const mentions = [
    ...section.matchAll(/\b(contentVersion\s*[:：=]?\s*|content\s*|SAVE\s*)(\d+)(?!\d|\.\.)/gi),
  ]
  let currentContent = false
  for (const match of mentions) {
    const axis = /^SAVE/i.test(match[1]) ? 'save' : 'content'
    const value = Number(match[2])
    if (axis === 'content' && value === expected.content) currentContent = true
    const clause = section
      .slice(0, match.index)
      .split(/[\n。；;，,]/)
      .at(-1)
    if (value !== expected[axis] && /不(?:保留|支持|接受)|拒绝/.test(clause)) continue
    if (value !== expected[axis]) errors.push(`${match[0]} 与源码 ${axis}=${expected[axis]} 不一致`)
  }
  if (!currentContent) errors.push('现行合同缺少明确的 content 版本声明')
  return [...new Set(errors)]
}

export function auditDocuments({
  documents,
  exists,
  expectedVersions,
  sectionRules = currentSections,
  exceptions = linkExceptions,
}) {
  const issues = []
  const add = (file, line, message) => issues.push({ file, line, message })
  const linked = new Map()
  const usedExceptions = new Set()
  let linkCount = 0
  for (const [file, text] of documents) {
    const destinations = new Set()
    for (const link of markdownLinks(text)) {
      let target
      try {
        target = localTarget(file, link.target)
      } catch {
        add(file, link.line, `链接编码无效：${link.target}`)
        continue
      }
      if (target === undefined) continue
      linkCount++
      destinations.add(target.replace(/\/$/, ''))
      const exception = exceptions.findIndex(
        (entry) => entry.source === file && entry.target === link.target,
      )
      if (exception >= 0) {
        usedExceptions.add(exception)
        if (!exceptions[exception].reason?.trim()) add(file, link.line, '链接例外缺少理由')
        if (exists(target)) add(file, link.line, `链接已恢复，应删除过期例外：${link.target}`)
      } else if (target.startsWith('../') || !exists(target)) {
        add(file, link.line, `本地目标不存在或无法随仓库检出：${link.target} → ${target}`)
      }
    }
    linked.set(file, destinations)
  }
  for (let i = 0; i < exceptions.length; i++) {
    if (!usedExceptions.has(i))
      add(exceptions[i].source, 1, `未命中例外，应删除或重新核准：${exceptions[i].target}`)
  }

  const docDirectories = new Set(
    [...documents.keys()].filter((file) => file.startsWith('docs/')).map(dirname),
  )
  for (const directory of docDirectories) {
    const index = `${directory}/README.md`
    if (!documents.has(index)) add(index, 1, '含 Markdown 的文档目录缺少 README 索引')
  }
  const tasks = [...documents.entries()]
    .filter(([file]) => isTaskDocument(file))
    .map(([file, text]) => taskInfo(file, text))
  for (const task of tasks) {
    if (!statuses.has(task.status))
      add(task.file, 1, '顶部缺少有效 Status；不要把正文历史状态当成当前状态')
    if (task.historical && !terminal.has(task.status))
      add(task.file, 1, '历史中文状态例外只用于终态卡，活动卡必须使用 Status')
    if (terminal.has(task.status) && dirname(task.file) !== `docs/ops/archive/tasks/${task.status}`)
      add(task.file, 1, '终态任务应移入对应 done/cancelled 归档目录，并更新引用与索引')
    if (!terminal.has(task.status) && dirname(task.file) !== taskDirectory.slice(0, -1))
      add(task.file, 1, '活动任务不能放在历史归档目录')
  }
  const expectedIndex = renderTaskIndex(tasks)
  if (documents.get(taskIndex)?.trimEnd() !== expectedIndex.trimEnd())
    add(taskIndex, 1, '任务索引与卡片顶部状态不一致，请重新生成')
  const board = 'docs/ops/board.md'
  if (!documents.has(board)) add(board, 1, '当前任务看板不存在')
  for (const task of tasks) {
    const onBoard = linked.get(board)?.has(task.file)
    if (!terminal.has(task.status) && !onBoard) add(board, 1, `活动任务未链接：${task.file}`)
    if (terminal.has(task.status) && onBoard) add(board, 1, `当前看板仍链接终态任务：${task.file}`)
  }
  for (const [index, row] of (documents.get(board) ?? '').split('\n').entries()) {
    if (!row.startsWith('|')) continue
    const rowStatus = row
      .split('|')[3]
      ?.trim()
      .match(/^(draft|build|review|done|blocked|rework|cancelled)\b/)?.[1]
    for (const link of markdownLinks(row)) {
      const task = tasks.find((candidate) => candidate.file === localTarget(board, link.target))
      if (task && rowStatus !== task.status)
        add(
          board,
          index + 1,
          `看板状态 ${rowStatus ?? '缺失'} 与 ${basename(task.file)} 的 ${task.status} 不一致`,
        )
    }
  }
  // Every immediate topic document must be reachable from its README. Large
  // historical task folders use the mechanically verified dedicated index.
  for (const file of documents.keys()) {
    if (
      !file.startsWith('docs/') ||
      basename(file) === 'README.md' ||
      isTaskDocument(file) ||
      file === taskIndex
    )
      continue
    const readme = `${dirname(file)}/README.md`
    if (documents.has(readme) && !linked.get(readme)?.has(file))
      add(readme, 1, `目录索引未链接：${basename(file)}`)
  }
  if (!linked.get(`${taskDirectory}README.md`)?.has(taskIndex))
    add(`${taskDirectory}README.md`, 1, '缺少生成任务索引入口')

  for (const directory of docDirectories) {
    if (directory === 'docs') continue
    const parentIndex = `${dirname(directory)}/README.md`
    if (
      documents.has(parentIndex) &&
      !linked.get(parentIndex)?.has(directory) &&
      !linked.get(parentIndex)?.has(`${directory}/README.md`)
    ) {
      add(parentIndex, 1, `子目录未进入导航：${directory}`)
    }
  }
  for (const file of documents.keys()) {
    if (!file.startsWith('docs/phase2/')) continue
    const parts = file.slice('docs/phase2/'.length).split('/')
    const allowed =
      parts.length === 1
        ? [
            'README.md',
            'READ-FIRST.md',
            'roadmap.md',
            'capability-map.md',
            'decisions.md',
            'design-backlog.md',
          ].includes(parts[0])
        : ['specs', 'guides', 'reference', 'archive'].includes(parts[0])
    if (!allowed) add(file, 1, '第二阶段文档须归入现行规范、指南、参考或历史归档；顶层仅保留方针')
    if (parts[0] === 'specs' && /(?:-plan|-audit|-report)\.md$/.test(file))
      add(file, 1, '计划/审计报告不能作为现行规范存放')
  }

  for (const rule of sectionRules) {
    const text = documents.get(rule.file)
    if (text === undefined) add(rule.file, 1, '现行合同文档不存在')
    else
      for (const error of checkCurrentSection(text, rule, expectedVersions))
        add(rule.file, 1, error)
  }
  return { issues, tasks, expectedIndex, linkCount }
}

function main(args) {
  if (args.some((arg) => !['--print-task-index', '--json'].includes(arg)))
    throw new Error('用法：node scripts/docs/check.mjs [--json | --print-task-index]')
  const files = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: repoRoot, encoding: 'utf8' },
  )
    .split('\0')
    .filter((file) => file && existsSync(resolve(repoRoot, file)))
  const available = checkoutTargets(files)
  const paths = files.filter((file) => /\.md$/i.test(file))
  const documents = new Map(
    [...new Set(paths)].sort().map((file) => [file, readFileSync(resolve(repoRoot, file), 'utf8')]),
  )
  const source = readFileSync(resolve(repoRoot, 'packages/content/src/character.ts'), 'utf8')
  const content = Number(/export const CONTENT_VERSION = (\d+) as const/.exec(source)?.[1])
  const save = Number(
    /export const CURRENT_PROJECT_MINIMUM_SAVE_VERSION = (\d+) as const/.exec(source)?.[1],
  )
  if (!Number.isInteger(content) || !Number.isInteger(save))
    throw new Error('无法读取 canonical 版本常量，停止检查')
  const result = auditDocuments({
    documents,
    exists: (path) => available.has(path) && existsSync(resolve(repoRoot, path)),
    expectedVersions: { content, save },
  })
  if (args.includes('--print-task-index')) {
    const invalid = result.tasks.filter((task) => !statuses.has(task.status))
    if (invalid.length)
      throw new Error(`无法生成索引，任务状态无效：${invalid.map((task) => task.file).join(', ')}`)
    process.stdout.write(result.expectedIndex)
    return
  }
  if (args.includes('--json'))
    console.log(
      JSON.stringify(
        { documents: documents.size, links: result.linkCount, issues: result.issues },
        null,
        2,
      ),
    )
  else {
    console.log(
      `docs: ${documents.size} Markdown / ${result.linkCount} local links / ${result.tasks.length} tasks / content${content} SAVE${save}`,
    )
    for (const issue of result.issues)
      console.error(`${issue.file}:${issue.line}: ${issue.message}`)
    console.log(`docs: ${result.issues.length ? 'FAIL' : 'PASS'} (${result.issues.length} issues)`)
  }
  if (result.issues.length) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  main(process.argv.slice(2))
