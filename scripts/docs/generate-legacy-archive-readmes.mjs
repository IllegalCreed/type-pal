import { existsSync, readdirSync, writeFileSync } from 'node:fs'
import { relative, resolve } from 'node:path'

const repoRoot = resolve(new URL('../..', import.meta.url).pathname)
const archiveRoot = resolve(repoRoot, 'docs/testing/archive/legacy')
const directories = [archiveRoot]
function walk(root) {
  if (!existsSync(root)) return
  for (const item of readdirSync(root, { withFileTypes: true })) {
    const path = resolve(root, item.name)
    if (item.isDirectory()) {
      directories.push(path)
      walk(path)
    }
  }
}
walk(archiveRoot)
for (const directory of directories) {
  const documents = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md')
    .map((entry) => entry.name)
    .sort()
  const childDirectories = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
  const relativeDirectory = relative(archiveRoot, directory)
  const title = relativeDirectory || 'Legacy 历史归档'
  const lines = [
    `# Legacy 历史归档：${title}`,
    '',
    '本目录仅保存历史记录，不提供当前 runtime、E2E 或 coverage 结论。源 SHA、caller、oracle、排重与停止线见',
    `[全量收口决策账](${relative(directory, resolve(archiveRoot, '../migrations')).replaceAll('\\', '/')}/legacy-full-closeout-plan.json)。`,
    '',
    ...documents.map((name) => `- [${name}](./${encodeURIComponent(name).replaceAll('%2F', '/')})`),
    ...childDirectories.map((name) => `- [${name}/](./${name}/README.md)`),
    '',
  ]
  writeFileSync(resolve(directory, 'README.md'), lines.join('\n'))
}
console.log(`legacy archive READMEs generated: ${directories.length} directories`)
