import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkAuthorProject } from '../src/core/project-io.js'
import { authorProjectSource } from './author-project-source.js'

try {
  const args = process.argv.slice(2)
  if (args.length > 1 || args.some((arg) => arg.startsWith('-')))
    throw new Error('用法：pnpm check:content [工程目录]（仅只读，不支持写盘或恢复参数）')
  const directory = args[0]
    ? resolve(args[0])
    : fileURLToPath(new URL('../../../projects/pal', import.meta.url))
  const report = await checkAuthorProject(await authorProjectSource(directory))
  console.log(
    `作者工程检查通过：${report.projectId}（${report.scenes} 场景 / ${report.maps} 地图 / ${report.assets} 资源）`,
  )
} catch (error) {
  console.error(`作者工程检查失败：${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
