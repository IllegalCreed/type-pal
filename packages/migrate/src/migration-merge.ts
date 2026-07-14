import { isDeepStrictEqual } from 'node:util'
import type { MigrationJson } from './pal-migration.js'

export interface VersionedJson {
  present: boolean
  value?: MigrationJson
}

export interface MergeConflict {
  file: string
  path: string
  type: 'value' | 'add-add' | 'delete-modify' | 'array-order' | 'invalid-identity'
  base: VersionedJson
  ours: VersionedJson
  theirs: VersionedJson
}

export interface FileMergeResult {
  value: VersionedJson
  conflicts: MergeConflict[]
}

type Node = VersionedJson
type ArrayMode = 'atomic' | 'id' | 'pages' | 'scene-index'

const absent = (): Node => ({ present: false })
const present = (value: MigrationJson): Node => ({ present: true, value })
const cloneNode = (node: Node): Node =>
  node.present ? present(structuredClone(node.value!)) : absent()
const same = (left: Node, right: Node): boolean =>
  left.present === right.present && (!left.present || isDeepStrictEqual(left.value, right.value))
const isObject = (node: Node): node is Node & { value: Record<string, MigrationJson> } =>
  node.present && !!node.value && typeof node.value === 'object' && !Array.isArray(node.value)
const isArray = (node: Node): node is Node & { value: MigrationJson[] } =>
  node.present && Array.isArray(node.value)
const escapePointer = (value: string): string => value.replaceAll('~', '~0').replaceAll('/', '~1')

function snapshot(node: Node): VersionedJson {
  return cloneNode(node)
}

function arrayMode(file: string, path: string): ArrayMode {
  if (file === 'content/scenes/index.json' && path === '') return 'scene-index'
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

function conflict(
  file: string,
  path: string,
  type: MergeConflict['type'],
  base: Node,
  ours: Node,
  theirs: Node,
): MergeConflict {
  return {
    file,
    path: path || '/',
    type,
    base: snapshot(base),
    ours: snapshot(ours),
    theirs: snapshot(theirs),
  }
}

interface MergeContext {
  file: string
  conflicts: MergeConflict[]
}

function mergeObject(base: Node, ours: Node, theirs: Node, path: string, ctx: MergeContext): Node {
  const baseObject = isObject(base) ? base.value : {}
  const oursObject = (ours.value ?? {}) as Record<string, MigrationJson>
  const theirsObject = (theirs.value ?? {}) as Record<string, MigrationJson>
  const keys = [
    ...Object.keys(theirsObject),
    ...Object.keys(oursObject).filter((key) => !(key in theirsObject)),
    ...Object.keys(baseObject).filter((key) => !(key in theirsObject) && !(key in oursObject)),
  ]
  const value: Record<string, MigrationJson> = {}
  for (const key of keys) {
    const childPath = `${path}/${escapePointer(key)}`
    const merged = mergeNode(
      key in baseObject ? present(baseObject[key]!) : absent(),
      key in oursObject ? present(oursObject[key]!) : absent(),
      key in theirsObject ? present(theirsObject[key]!) : absent(),
      childPath,
      ctx,
    )
    if (merged.present) value[key] = merged.value!
  }
  return present(value)
}

function identity(value: MigrationJson): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const id = value.id
  if (typeof id !== 'string' && typeof id !== 'number') return undefined
  return `${typeof id}:${id}`
}

function identityMaps(values: MigrationJson[]):
  | {
      map: Map<string, MigrationJson>
      order: string[]
    }
  | undefined {
  const map = new Map<string, MigrationJson>()
  const order: string[] = []
  for (const value of values) {
    const id = identity(value)
    if (!id || map.has(id)) return undefined
    map.set(id, value)
    order.push(id)
  }
  return { map, order }
}

function primitiveIdentityMaps(values: MigrationJson[]):
  | {
      map: Map<string, MigrationJson>
      order: string[]
    }
  | undefined {
  const map = new Map<string, MigrationJson>()
  const order: string[] = []
  for (const value of values) {
    if (typeof value !== 'string' && typeof value !== 'number') return undefined
    const id = `${typeof value}:${value}`
    if (map.has(id)) return undefined
    map.set(id, value)
    order.push(id)
  }
  return { map, order }
}

function changedOrder(base: string[], side: string[]): boolean {
  const common = new Set(base.filter((id) => side.includes(id)))
  const baseOrder = base.filter((id) => common.has(id))
  const sideOrder = side.filter((id) => common.has(id))
  return !isDeepStrictEqual(baseOrder, sideOrder)
}

function orderedIds(
  baseOrder: string[],
  oursOrder: string[],
  theirsOrder: string[],
  merged: ReadonlyMap<string, Node>,
): string[] {
  const live = (id: string): boolean => merged.get(id)?.present === true
  const output = theirsOrder.filter(live)
  const oursOnly = oursOrder.filter((id) => !theirsOrder.includes(id) && live(id))
  const lastInserted = new Map<string, string>()
  const unanchored: string[] = []
  for (const id of oursOnly) {
    const baseIndex = baseOrder.indexOf(id)
    let anchor: string | undefined
    if (baseIndex >= 0) {
      for (let index = baseIndex - 1; index >= 0; index--) {
        const candidate = baseOrder[index]
        if (candidate && output.includes(candidate)) {
          anchor = lastInserted.get(candidate) ?? candidate
          break
        }
      }
    }
    if (!anchor) {
      unanchored.push(id)
      continue
    }
    const at = output.indexOf(anchor)
    output.splice(at + 1, 0, id)
    const rootAnchor = baseOrder
      .slice(0, baseIndex)
      .reverse()
      .find((candidate) => output.includes(candidate))
    if (rootAnchor) lastInserted.set(rootAnchor, id)
  }
  output.push(...unanchored)
  return output
}

function mergeIdentityArray(
  base: Node & { value: MigrationJson[] },
  ours: Node & { value: MigrationJson[] },
  theirs: Node & { value: MigrationJson[] },
  path: string,
  ctx: MergeContext,
  primitive: boolean,
): Node {
  const read = primitive ? primitiveIdentityMaps : identityMaps
  const baseState = read(base.value)
  const oursState = read(ours.value)
  const theirsState = read(theirs.value)
  if (!baseState || !oursState || !theirsState) {
    ctx.conflicts.push(conflict(ctx.file, path, 'invalid-identity', base, ours, theirs))
    return cloneNode(ours)
  }
  if (
    primitive &&
    changedOrder(baseState.order, oursState.order) &&
    changedOrder(baseState.order, theirsState.order) &&
    !isDeepStrictEqual(oursState.order, theirsState.order)
  ) {
    ctx.conflicts.push(conflict(ctx.file, path, 'array-order', base, ours, theirs))
    return cloneNode(ours)
  }
  const ids = new Set([...baseState.order, ...oursState.order, ...theirsState.order])
  const merged = new Map<string, Node>()
  for (const id of ids) {
    merged.set(
      id,
      mergeNode(
        baseState.map.has(id) ? present(baseState.map.get(id)!) : absent(),
        oursState.map.has(id) ? present(oursState.map.get(id)!) : absent(),
        theirsState.map.has(id) ? present(theirsState.map.get(id)!) : absent(),
        `${path}/@${escapePointer(id)}`,
        ctx,
      ),
    )
  }
  const order = orderedIds(baseState.order, oursState.order, theirsState.order, merged)
  return present(
    order.flatMap((id) => {
      const value = merged.get(id)
      return value?.present ? [value.value!] : []
    }),
  )
}

function mergePages(
  base: Node & { value: MigrationJson[] },
  ours: Node & { value: MigrationJson[] },
  theirs: Node & { value: MigrationJson[] },
  path: string,
  ctx: MergeContext,
): Node {
  const isTailOnlyLengthChange = (side: MigrationJson[]): boolean => {
    if (side.length === base.value.length) return true
    const overlap = Math.min(side.length, base.value.length)
    return isDeepStrictEqual(side.slice(0, overlap), base.value.slice(0, overlap))
  }
  if (!isTailOnlyLengthChange(ours.value) || !isTailOnlyLengthChange(theirs.value)) {
    ctx.conflicts.push(conflict(ctx.file, path, 'array-order', base, ours, theirs))
    return cloneNode(ours)
  }
  const values: MigrationJson[] = []
  const length = Math.max(base.value.length, ours.value.length, theirs.value.length)
  for (let index = 0; index < length; index++) {
    const merged = mergeNode(
      index < base.value.length ? present(base.value[index]!) : absent(),
      index < ours.value.length ? present(ours.value[index]!) : absent(),
      index < theirs.value.length ? present(theirs.value[index]!) : absent(),
      `${path}/${index}`,
      ctx,
    )
    if (merged.present) values[index] = merged.value!
  }
  while (values.length && values.at(-1) === undefined) values.pop()
  if (values.some((value) => value === undefined)) {
    ctx.conflicts.push(conflict(ctx.file, path, 'array-order', base, ours, theirs))
    return cloneNode(ours)
  }
  return present(values)
}

function mergeNode(base: Node, ours: Node, theirs: Node, path: string, ctx: MergeContext): Node {
  if (!base.present && isArray(ours) && isArray(theirs)) {
    const mode = arrayMode(ctx.file, path)
    const empty = present([]) as Node & { value: MigrationJson[] }
    if (mode === 'id') return mergeIdentityArray(empty, ours, theirs, path, ctx, false)
    if (mode === 'scene-index') return mergeIdentityArray(empty, ours, theirs, path, ctx, true)
  }
  if (isArray(base) && isArray(ours) && isArray(theirs)) {
    const mode = arrayMode(ctx.file, path)
    if (mode === 'id') return mergeIdentityArray(base, ours, theirs, path, ctx, false)
    if (mode === 'scene-index') return mergeIdentityArray(base, ours, theirs, path, ctx, true)
    if (mode === 'pages') return mergePages(base, ours, theirs, path, ctx)
  }
  if (isObject(base) && isObject(ours) && isObject(theirs))
    return mergeObject(base, ours, theirs, path, ctx)

  if (same(ours, base)) return cloneNode(theirs)
  if (same(theirs, base)) return cloneNode(ours)
  if (same(ours, theirs)) return cloneNode(ours)

  if (!ours.present || !theirs.present) {
    ctx.conflicts.push(
      conflict(ctx.file, path, base.present ? 'delete-modify' : 'add-add', base, ours, theirs),
    )
    return cloneNode(ours)
  }
  if (!base.present) {
    ctx.conflicts.push(conflict(ctx.file, path, 'add-add', base, ours, theirs))
    return cloneNode(ours)
  }
  ctx.conflicts.push(conflict(ctx.file, path, 'value', base, ours, theirs))
  return cloneNode(ours)
}

export function mergeManagedFile(
  file: string,
  base: VersionedJson,
  ours: VersionedJson,
  theirs: VersionedJson,
): FileMergeResult {
  const conflicts: MergeConflict[] = []
  const value = mergeNode(base, ours, theirs, '', { file, conflicts })
  return { value, conflicts }
}

export const jsonPresent = present
export const jsonAbsent = absent
