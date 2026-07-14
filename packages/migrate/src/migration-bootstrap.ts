import { isDeepStrictEqual } from 'node:util'
import type { MigrationSnapshot } from './migration-baseline.js'
import { sha256 } from './migration-baseline.js'
import type { MigrationFileSet, MigrationJson } from './pal-migration.js'

export type BootstrapResolution = 'ours' | 'theirs' | 'upstream-overlay' | 'unresolved'

interface BootstrapValue {
  present: boolean
  value?: MigrationJson
}

export interface BootstrapDifference {
  file: string
  path: string
  kind: 'add' | 'delete' | 'change' | 'order'
  oursHash: string
  theirsHash: string
  resolution: BootstrapResolution
  reason: string
}

export interface BootstrapReportV1 {
  version: 1
  differences: BootstrapDifference[]
}

export interface BootstrapReportStatus {
  differences: number
  unresolved: number
  upstreamOverlays: number
}

const escapePointer = (value: string): string => value.replaceAll('~', '~0').replaceAll('/', '~1')
const unescapePointer = (value: string): string => value.replaceAll('~1', '/').replaceAll('~0', '~')
const valueHash = (value: BootstrapValue): string =>
  value.present ? sha256(JSON.stringify(value.value)) : 'missing'
const identity = (value: MigrationJson): string | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const id = value.id
  return typeof id === 'string' || typeof id === 'number' ? `${typeof id}:${id}` : undefined
}
const primitiveIdentity = (value: MigrationJson): string | undefined =>
  typeof value === 'string' || typeof value === 'number' ? `${typeof value}:${value}` : undefined

function arrayMode(file: string, path: string): 'id' | 'primitive-id' | 'pages' | 'atomic' {
  if (file === 'content/scenes/index.json' && path === '') return 'primitive-id'
  if (file === 'content/maps/index.json' && path === '/maps') return 'id'
  if (
    path === '' &&
    /content\/(actors|items|sprites|enemies|enemy-teams|music|battle-fields|poisons|shops|tilesets)\.json$/.test(
      file,
    )
  )
    return 'id'
  if (file === 'content/skills.json' && path === '/skills') return 'id'
  if (/^content\/scenes\/s\d+\.json$/.test(file) && path === '/entities') return 'id'
  if (/^content\/scenes\/s\d+\.json$/.test(file) && path.endsWith('/pages')) return 'pages'
  return 'atomic'
}

function pushDifference(
  out: BootstrapDifference[],
  file: string,
  path: string,
  ours: BootstrapValue,
  theirs: BootstrapValue,
  kind?: BootstrapDifference['kind'],
): void {
  out.push({
    file,
    path: path || '/',
    kind: kind ?? (!ours.present ? 'add' : !theirs.present ? 'delete' : 'change'),
    oursHash: valueHash(ours),
    theirsHash: valueHash(theirs),
    resolution: 'unresolved',
    reason: '',
  })
}

function diffNode(
  file: string,
  path: string,
  ours: BootstrapValue,
  theirs: BootstrapValue,
  out: BootstrapDifference[],
): void {
  if (
    ours.present === theirs.present &&
    (!ours.present || isDeepStrictEqual(ours.value, theirs.value))
  )
    return
  if (!ours.present || !theirs.present) {
    pushDifference(out, file, path, ours, theirs)
    return
  }
  const oursValue = ours.value!
  const theirsValue = theirs.value!
  if (
    oursValue &&
    theirsValue &&
    typeof oursValue === 'object' &&
    typeof theirsValue === 'object' &&
    !Array.isArray(oursValue) &&
    !Array.isArray(theirsValue)
  ) {
    const keys = new Set([...Object.keys(oursValue), ...Object.keys(theirsValue)])
    for (const key of keys) {
      diffNode(
        file,
        `${path}/${escapePointer(key)}`,
        key in oursValue ? { present: true, value: oursValue[key]! } : { present: false },
        key in theirsValue ? { present: true, value: theirsValue[key]! } : { present: false },
        out,
      )
    }
    return
  }
  if (Array.isArray(oursValue) && Array.isArray(theirsValue)) {
    const mode = arrayMode(file, path)
    if (mode === 'pages') {
      for (let index = 0; index < Math.max(oursValue.length, theirsValue.length); index++) {
        diffNode(
          file,
          `${path}/${index}`,
          index < oursValue.length
            ? { present: true, value: oursValue[index]! }
            : { present: false },
          index < theirsValue.length
            ? { present: true, value: theirsValue[index]! }
            : { present: false },
          out,
        )
      }
      return
    }
    if (mode === 'id' || mode === 'primitive-id') {
      const getId = mode === 'id' ? identity : primitiveIdentity
      const oursEntries = oursValue.map((value) => [getId(value), value] as const)
      const theirsEntries = theirsValue.map((value) => [getId(value), value] as const)
      if (
        oursEntries.some(([id]) => !id) ||
        theirsEntries.some(([id]) => !id) ||
        new Set(oursEntries.map(([id]) => id)).size !== oursEntries.length ||
        new Set(theirsEntries.map(([id]) => id)).size !== theirsEntries.length
      ) {
        pushDifference(out, file, path, ours, theirs)
        return
      }
      const oursMap = new Map(oursEntries as Array<readonly [string, MigrationJson]>)
      const theirsMap = new Map(theirsEntries as Array<readonly [string, MigrationJson]>)
      const ids = new Set([...oursMap.keys(), ...theirsMap.keys()])
      for (const id of ids) {
        diffNode(
          file,
          `${path}/@${escapePointer(id)}`,
          oursMap.has(id) ? { present: true, value: oursMap.get(id)! } : { present: false },
          theirsMap.has(id) ? { present: true, value: theirsMap.get(id)! } : { present: false },
          out,
        )
      }
      const oursOrder = [...oursMap.keys()]
      const theirsOrder = [...theirsMap.keys()]
      if (!isDeepStrictEqual(oursOrder, theirsOrder)) {
        pushDifference(
          out,
          file,
          `${path}/$order`,
          { present: true, value: oursOrder },
          { present: true, value: theirsOrder },
          'order',
        )
      }
      return
    }
  }
  pushDifference(out, file, path, ours, theirs)
}

export function createBootstrapReport(
  ours: MigrationSnapshot,
  theirs: Pick<MigrationFileSet, 'files' | 'managedFiles'>,
): BootstrapReportV1 {
  const differences: BootstrapDifference[] = []
  const managed = [...new Set([...ours.managedFiles, ...theirs.managedFiles])].sort()
  for (const file of managed) {
    diffNode(
      file,
      '',
      ours.files.has(file) ? { present: true, value: ours.files.get(file)! } : { present: false },
      theirs.files.has(file)
        ? { present: true, value: theirs.files.get(file)! }
        : { present: false },
      differences,
    )
  }
  return { version: 1, differences }
}

function selectorIndex(array: MigrationJson[], selector: string): number {
  const expected = selector.slice(1)
  return array.findIndex(
    (value) => identity(value) === expected || primitiveIdentity(value) === expected,
  )
}

function selectedValue(root: MigrationJson, path: string): BootstrapValue {
  if (path === '/') return { present: true, value: root }
  let node: MigrationJson = root
  for (const raw of path.split('/').slice(1)) {
    const part = unescapePointer(raw)
    if (part === '$order') {
      if (!Array.isArray(node)) return { present: false }
      return {
        present: true,
        value: node.map((value) => identity(value) ?? primitiveIdentity(value)!),
      }
    }
    if (Array.isArray(node)) {
      const index = part.startsWith('@') ? selectorIndex(node, part) : Number(part)
      if (index < 0 || index >= node.length) return { present: false }
      node = node[index]!
    } else if (node && typeof node === 'object') {
      if (!(part in node)) return { present: false }
      node = node[part]!
    } else return { present: false }
  }
  return { present: true, value: node }
}

function applyValue(target: MigrationJson, path: string, source: BootstrapValue): MigrationJson {
  if (path === '/') return source.present ? structuredClone(source.value!) : target
  const parts = path.split('/').slice(1).map(unescapePointer)
  let node: MigrationJson = target
  for (let depth = 0; depth < parts.length - 1; depth++) {
    const part = parts[depth]!
    if (Array.isArray(node)) {
      const index = part.startsWith('@') ? selectorIndex(node, part) : Number(part)
      if (index < 0) throw new Error(`bootstrap 应用找不到数组身份 ${path}`)
      node = node[index]!
    } else if (node && typeof node === 'object') node = node[part]!
    else throw new Error(`bootstrap 应用路径无效 ${path}`)
  }
  const leaf = parts.at(-1)!
  if (leaf === '$order') {
    if (!source.present || !Array.isArray(source.value) || !Array.isArray(node))
      throw new Error(`bootstrap order 路径无效 ${path}`)
    const order = source.value as string[]
    const byId = new Map(node.map((value) => [identity(value) ?? primitiveIdentity(value), value]))
    const selected = order.flatMap((id) => (byId.has(id) ? [byId.get(id)!] : []))
    const selectedIds = new Set(order)
    const remaining = node.filter(
      (value) => !selectedIds.has(identity(value) ?? primitiveIdentity(value)!),
    )
    node.splice(0, node.length, ...selected, ...remaining)
    return target
  }
  if (Array.isArray(node)) {
    const index = leaf.startsWith('@') ? selectorIndex(node, leaf) : Number(leaf)
    if (source.present) {
      if (index < 0) node.push(structuredClone(source.value!))
      else node[index] = structuredClone(source.value!)
    } else if (index >= 0) node.splice(index, 1)
  } else if (node && typeof node === 'object') {
    if (source.present) node[leaf] = structuredClone(source.value!)
    else delete node[leaf]
  }
  return target
}

export function applyBootstrapReport(
  ours: MigrationSnapshot,
  theirs: Pick<MigrationFileSet, 'files' | 'managedFiles'>,
  report: BootstrapReportV1,
): MigrationSnapshot {
  const status = verifyBootstrapReport(ours, theirs, report)
  if (status.unresolved || status.upstreamOverlays) throw new Error('bootstrap 尚未闭合')
  const files = new Map(
    [...theirs.files].map(([file, value]) => [file, structuredClone(value)] as const),
  )
  const decisions = [...report.differences].sort((left, right) => {
    const leftOrder = left.path.endsWith('/$order') || left.path === '/$order'
    const rightOrder = right.path.endsWith('/$order') || right.path === '/$order'
    return Number(leftOrder) - Number(rightOrder)
  })
  for (const decision of decisions) {
    if (decision.resolution !== 'ours') continue
    if (decision.path === '/') {
      if (ours.files.has(decision.file))
        files.set(decision.file, structuredClone(ours.files.get(decision.file)!))
      else files.delete(decision.file)
      continue
    }
    const oursRoot = ours.files.get(decision.file)
    if (oursRoot === undefined) throw new Error(`bootstrap ours 缺文件: ${decision.file}`)
    const source = selectedValue(oursRoot, decision.path)
    const targetRoot = files.get(decision.file)
    if (targetRoot === undefined) {
      if (decision.path !== '/' || !source.present) continue
      files.set(decision.file, structuredClone(source.value!))
    } else files.set(decision.file, applyValue(targetRoot, decision.path, source))
  }
  return {
    files,
    managedFiles: new Set([...ours.managedFiles, ...theirs.managedFiles]),
  }
}

export function verifyBootstrapReport(
  ours: MigrationSnapshot,
  theirs: Pick<MigrationFileSet, 'files' | 'managedFiles'>,
  report: BootstrapReportV1,
): BootstrapReportStatus {
  const actual = createBootstrapReport(ours, theirs)
  if (report.version !== 1 || report.differences.length !== actual.differences.length)
    throw new Error('bootstrap 报告未精确覆盖当前差异')
  const expected = new Map(
    report.differences.map((difference) => [`${difference.file}\0${difference.path}`, difference]),
  )
  if (expected.size !== report.differences.length) throw new Error('bootstrap 报告包含重复差异决策')
  const resolutions = new Set<BootstrapResolution>([
    'ours',
    'theirs',
    'upstream-overlay',
    'unresolved',
  ])
  for (const difference of actual.differences) {
    const decision = expected.get(`${difference.file}\0${difference.path}`)
    if (
      !decision ||
      decision.oursHash !== difference.oursHash ||
      decision.theirsHash !== difference.theirsHash
    )
      throw new Error(`bootstrap 差异漂移: ${difference.file}${difference.path}`)
    if (!resolutions.has(decision.resolution))
      throw new Error(`bootstrap 分类非法: ${difference.file}${difference.path}`)
    if (decision.resolution !== 'unresolved' && !decision.reason.trim())
      throw new Error(`bootstrap 分类缺理由: ${difference.file}${difference.path}`)
  }
  return {
    differences: report.differences.length,
    unresolved: report.differences.filter((item) => item.resolution === 'unresolved').length,
    upstreamOverlays: report.differences.filter((item) => item.resolution === 'upstream-overlay')
      .length,
  }
}
