/** content14 -> 15 敌队稳定字符串引用的一次性工程升级与 current audit。 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import {
  type ManifestV14,
  upgradeEnemyTeamReferencesV14ToV15,
  upgradeManifestV14ToV15,
} from '@type-pal/content'

const repoRoot = resolve(fileURLToPath(new URL('../../..', import.meta.url)))
const write = process.argv.includes('--write')
const requestedProject = process.argv
  .find((argument) => argument.startsWith('--project='))
  ?.slice(10)
const projectIds = requestedProject ? [requestedProject] : ['demo', 'e2e-own', 'pal']

function jsonFiles(root: string): string[] {
  if (!existsSync(root)) return []
  return readdirSync(root).flatMap((name) => {
    const path = resolve(root, name)
    return statSync(path).isDirectory() ? jsonFiles(path) : path.endsWith('.json') ? [path] : []
  })
}

function parse(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown
}

function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

function audit(projectRoot: string): {
  teams: number
  hostile: number
  startBattle: number
  dangling: string[]
} {
  const teamPath = resolve(projectRoot, 'content/enemy-teams.json')
  const teamsValue = existsSync(teamPath) ? parse(teamPath) : []
  const teamIds = new Set(
    Array.isArray(teamsValue)
      ? teamsValue.flatMap((team) =>
          team && typeof team === 'object' && typeof (team as { id?: unknown }).id === 'string'
            ? [(team as { id: string }).id]
            : [],
        )
      : [],
  )
  let hostile = 0
  let startBattle = 0
  const referenced = new Set<string>()
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }
    if (!value || typeof value !== 'object') return
    const record = value as Record<string, unknown>
    if (record.kind === 'startBattle' && typeof record.enemyTeamId === 'string') {
      startBattle++
      referenced.add(record.enemyTeamId)
    }
    if (record.hostile && typeof record.hostile === 'object') {
      const enemyTeamId = (record.hostile as Record<string, unknown>).enemyTeamId
      if (typeof enemyTeamId === 'string') {
        hostile++
        referenced.add(enemyTeamId)
      }
    }
    Object.values(record).forEach(visit)
  }
  jsonFiles(resolve(projectRoot, 'content')).forEach((path) => {
    visit(parse(path))
  })
  return {
    teams: teamIds.size,
    hostile,
    startBattle,
    dangling: [...referenced].filter((id) => !teamIds.has(id)).sort(),
  }
}

for (const projectId of projectIds) {
  const projectRoot = resolve(repoRoot, `projects/${projectId}`)
  const manifestPath = resolve(projectRoot, 'manifest.json')
  if (!existsSync(manifestPath)) throw new Error(`${projectId}: manifest.json 不存在`)
  const manifest = parse(manifestPath) as { contentVersion?: unknown }
  let changedFiles = 0
  if (manifest.contentVersion === 14) {
    for (const path of jsonFiles(resolve(projectRoot, 'content'))) {
      const before = parse(path)
      const after = upgradeEnemyTeamReferencesV14ToV15(before, path.slice(projectRoot.length + 1))
      if (isDeepStrictEqual(before, after)) continue
      changedFiles++
      if (write) writeFileSync(path, serialize(after))
    }
    const nextManifest = upgradeManifestV14ToV15(manifest as ManifestV14)
    changedFiles++
    if (write) writeFileSync(manifestPath, serialize(nextManifest))
  } else if (manifest.contentVersion !== 15) {
    throw new Error(
      `${projectId}: 只接受 contentVersion 14/15，收到 ${String(manifest.contentVersion)}`,
    )
  }
  const currentAudit = manifest.contentVersion === 15 || write ? audit(projectRoot) : undefined
  if (currentAudit?.dangling.length)
    throw new Error(
      `${projectId}: ${currentAudit.dangling.length} 个悬空敌队 ID：${currentAudit.dangling.join(', ')}`,
    )
  if (projectId === 'pal' && currentAudit) {
    if (
      currentAudit.teams !== 380 ||
      currentAudit.hostile !== 828 ||
      currentAudit.startBattle !== 174
    )
      throw new Error(
        `pal census 不符：teams=${currentAudit.teams}, hostile=${currentAudit.hostile}, startBattle=${currentAudit.startBattle}`,
      )
  }
  console.log(
    `${projectId}: version=${write && manifest.contentVersion === 14 ? 15 : String(manifest.contentVersion)} changed=${changedFiles} mode=${write ? 'write' : 'plan'}` +
      (currentAudit
        ? ` teams=${currentAudit.teams} hostile=${currentAudit.hostile} startBattle=${currentAudit.startBattle} dangling=0`
        : ''),
  )
}
