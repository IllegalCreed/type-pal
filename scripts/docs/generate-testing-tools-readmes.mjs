import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const toolsRoot = resolve(repoRoot, 'docs/testing/domains')
const readmes = []
function walk(root) {
  if (!existsSync(root)) return
  const files = readdirSync(root, { withFileTypes: true })
  const tools = files.filter(
    (entry) => entry.isFile() && /\.(?:mjs|mts|js|ts|tsx)$/.test(entry.name),
  )
  if (root.endsWith('/tools')) {
    const plan = relative(resolve(repoRoot, 'docs/testing'), root)
    const lines = [
      `# Testing tools: ${plan}`,
      '',
      '这些脚本是按工程域归位的历史/反控工具，不代表当前 runtime、E2E 或 coverage 已通过。',
      '每个工具的 source SHA、after SHA、caller/import/cwd/runner、合法输入、oracle、排重、截止日和停止线见',
      '[布局收口计划](../../../../archive/migrations/testing-layout-closeout-20261004.json)。',
      '',
      ...tools
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((entry) => `- [${entry.name}](./${entry.name})`),
      '',
    ]
    writeFileSync(resolve(root, 'README.md'), lines.join('\n'))
    const parentReadme = resolve(dirname(root), 'README.md')
    if (existsSync(parentReadme)) {
      const parentText = readFileSync(parentReadme, 'utf8')
      const link = `- [Testing tools](./${relative(dirname(root), root).replaceAll('\\', '/')}/README.md)`
      if (!parentText.includes(link))
        writeFileSync(parentReadme, `${parentText.trimEnd()}\n\n${link}\n`)
    }
    readmes.push(root)
  }
  for (const entry of files) if (entry.isDirectory()) walk(resolve(root, entry.name))
}
walk(toolsRoot)
console.log(`testing tool READMEs generated: ${readmes.length}`)
