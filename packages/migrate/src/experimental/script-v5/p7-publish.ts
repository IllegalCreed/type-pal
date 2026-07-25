import { existsSync, readFileSync } from 'node:fs'
import { isAbsolute, resolve } from 'node:path'
import { validateAssetCatalog } from '@type-pal/content'
import { isAtomicProjectMapPath, PAL_BASELINE_REL, sha256 } from '../../migration-baseline.js'
import type { TransactionChange, TransactionPrecondition } from '../../migration-transaction.js'
import { assertP7ShadowBundle, type P7ShadowBundle } from './p7-shadow.js'
import { stableStringCompare } from './stable-json.js'

const PROJECT_PREFIX = 'target/project/'
const BASELINE_PREFIX = 'target/baseline/'
const PROJECT_ROOT = 'projects/pal/'
const MANIFEST_TARGET = `${PROJECT_ROOT}manifest.json`

function releaseRelativePath(path: string, label: string): string {
  if (
    !path ||
    path.includes('\\') ||
    isAbsolute(path) ||
    path.startsWith('./') ||
    path.split('/').some((part) => part === '' || part === '.' || part === '..')
  )
    throw new Error(`P7 publish: ${label} 路径越界 ${path}`)
  return path
}

function extractPrefix(
  files: ReadonlyMap<string, string>,
  prefix: string,
  label: string,
): Map<string, string> {
  const output = new Map<string, string>()
  for (const [path, body] of files) {
    if (!path.startsWith(prefix)) continue
    const relative = releaseRelativePath(path.slice(prefix.length), label)
    if (output.has(relative)) throw new Error(`P7 publish: ${label} 重复路径 ${relative}`)
    output.set(relative, body)
  }
  if (output.size === 0) throw new Error(`P7 publish: ${label} 为空`)
  return output
}

export function p7ReleaseTargets(bundle: P7ShadowBundle): {
  project: ReadonlyMap<string, string>
  baseline: ReadonlyMap<string, string>
} {
  assertP7ShadowBundle(bundle)
  const project = extractPrefix(bundle.files, PROJECT_PREFIX, 'project target')
  const baseline = extractPrefix(bundle.files, BASELINE_PREFIX, 'baseline target')
  if (!project.has('manifest.json')) throw new Error('P7 publish: project target 缺 manifest.json')
  if (!baseline.has('_state.json')) throw new Error('P7 publish: baseline target 缺 _state.json')
  return { project, baseline }
}

function differs(repo: string, target: string, content: string): boolean {
  const full = resolve(repo, target)
  return !existsSync(full) || readFileSync(full, 'utf8') !== content
}

function releaseManifestPreconditions(
  project: ReadonlyMap<string, string>,
): TransactionPrecondition[] {
  const catalogBody = project.get('assets/index.json')
  if (!catalogBody) throw new Error('P7 publish: project target 缺 assets/index.json')
  let rawCatalog: unknown
  try {
    rawCatalog = JSON.parse(catalogBody)
  } catch {
    throw new Error('P7 publish: assets/index.json 不是合法 JSON')
  }
  const catalog = validateAssetCatalog(rawCatalog, 'P7 project target assets/index.json')
  const byTarget = new Map<string, string>()
  const add = (target: string, hash: string): void => {
    const safe = releaseRelativePath(target, 'manifest precondition')
    const previous = byTarget.get(safe)
    if (previous && previous !== hash) throw new Error(`P7 publish: 资源闭包同路径哈希冲突 ${safe}`)
    byTarget.set(safe, hash)
  }
  add(`${PROJECT_ROOT}assets/index.json`, sha256(catalogBody))
  const stamps = project.get('content/stamps.json')
  if (stamps) add(`${PROJECT_ROOT}content/stamps.json`, sha256(stamps))
  for (const record of Object.values(catalog.assets))
    add(`${PROJECT_ROOT}${record.path}`, record.sha256)
  return [...byTarget]
    .sort(([left], [right]) => stableStringCompare(left, right))
    .map(([target, hash]) => ({ target, hash }))
}

export interface P7ReleasePlan {
  changes: TransactionChange[]
  summary: {
    projectWrites: number
    projectDeletes: number
    baselineWrites: number
    baselineDeletes: number
    manifestWrites: number
  }
}

/**
 * P7 唯一发布计划：canonical project、full ledger、project sidecar、baseline v2 先落，
 * manifest 最后切到 contentVersion 5。current 集合只允许来自已验证的 v4 snapshot/baseline，
 * 不递归删除仓库中未托管的作者文件。
 */
export function planP7ReleaseTransaction(args: {
  repo: string
  project: ReadonlyMap<string, string>
  baseline: ReadonlyMap<string, string>
  currentProjectManaged: ReadonlySet<string>
  currentBaselineManaged: ReadonlySet<string>
}): P7ReleasePlan {
  const project = new Map(
    [...args.project].map(([path, body]) => [releaseRelativePath(path, 'project target'), body]),
  )
  const baseline = new Map(
    [...args.baseline].map(([path, body]) => [releaseRelativePath(path, 'baseline target'), body]),
  )
  const manifestBody = project.get('manifest.json')
  if (!manifestBody) throw new Error('P7 publish: project target 缺 manifest.json')
  if (!baseline.has('_state.json')) throw new Error('P7 publish: baseline target 缺 _state.json')
  let manifest: { contentVersion?: unknown }
  try {
    manifest = JSON.parse(manifestBody) as { contentVersion?: unknown }
  } catch {
    throw new Error('P7 publish: manifest.json 不是合法 JSON')
  }
  if (manifest.contentVersion !== 5)
    throw new Error('P7 publish: manifest.json 必须是 contentVersion 5')

  const changes: TransactionChange[] = []
  const summary = {
    projectWrites: 0,
    projectDeletes: 0,
    baselineWrites: 0,
    baselineDeletes: 0,
    manifestWrites: 0,
  }
  for (const [path, content] of [...project]
    .filter(([path]) => path !== 'manifest.json')
    .sort(([left], [right]) => stableStringCompare(left, right))) {
    const target = `${PROJECT_ROOT}${path}`
    if (!differs(args.repo, target, content)) continue
    changes.push({ target, scope: 'project', content })
    summary.projectWrites++
  }
  for (const path of [...args.currentProjectManaged].sort(stableStringCompare)) {
    const relative = releaseRelativePath(path, 'current project managed')
    if (relative === 'manifest.json' || project.has(relative)) continue
    const target = `${PROJECT_ROOT}${relative}`
    if (!existsSync(resolve(args.repo, target))) continue
    changes.push({ target, scope: 'project' })
    summary.projectDeletes++
  }

  for (const [path, content] of [...baseline]
    .filter(([path]) => path !== '_state.json')
    .sort(([left], [right]) => stableStringCompare(left, right))) {
    const target = `${PAL_BASELINE_REL}/${path}`
    if (!differs(args.repo, target, content)) continue
    changes.push({ target, scope: 'baseline', content })
    summary.baselineWrites++
  }
  for (const path of [...args.currentBaselineManaged].sort(stableStringCompare)) {
    const relative = releaseRelativePath(path, 'current baseline managed')
    if (baseline.has(relative) || isAtomicProjectMapPath(relative)) continue
    const target = `${PAL_BASELINE_REL}/${relative}`
    if (!existsSync(resolve(args.repo, target))) continue
    changes.push({ target, scope: 'baseline' })
    summary.baselineDeletes++
  }
  const baselineState = baseline.get('_state.json')!
  const baselineStateTarget = `${PAL_BASELINE_REL}/_state.json`
  if (differs(args.repo, baselineStateTarget, baselineState)) {
    changes.push({
      target: baselineStateTarget,
      scope: 'baseline',
      content: baselineState,
    })
    summary.baselineWrites++
  }

  const manifestDiffers = differs(args.repo, MANIFEST_TARGET, manifestBody)
  if (changes.length > 0 || manifestDiffers) {
    changes.push({
      target: MANIFEST_TARGET,
      scope: 'manifest',
      content: manifestBody,
      preconditions: releaseManifestPreconditions(project),
    })
    summary.manifestWrites = 1
  }
  return { changes, summary }
}

export function planP7ShadowReleaseTransaction(args: {
  repo: string
  bundle: P7ShadowBundle
  currentProjectManaged: ReadonlySet<string>
  currentBaselineManaged: ReadonlySet<string>
}): P7ReleasePlan {
  const targets = p7ReleaseTargets(args.bundle)
  return planP7ReleaseTransaction({ ...args, ...targets })
}
