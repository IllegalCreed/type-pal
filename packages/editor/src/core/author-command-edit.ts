import type { AuthorCommand } from '@type-pal/content'

export type AuthorCommandChildKey =
  | 'then'
  | 'else'
  | 'body'
  | 'onYes'
  | 'onNo'
  | 'onLose'
  | 'onFlee'
  | 'onFail'

export type AuthorCommandPathSegment = number | AuthorCommandChildKey
export type AuthorCommandPath = readonly AuthorCommandPathSegment[]

const CHILD_KEYS = new Set<AuthorCommandChildKey>([
  'then',
  'else',
  'body',
  'onYes',
  'onNo',
  'onLose',
  'onFlee',
  'onFail',
])

export function parseAuthorCommandPath(path: string): AuthorCommandPathSegment[] {
  if (!path) return []
  return path.split('/').map((segment) => {
    if (CHILD_KEYS.has(segment as AuthorCommandChildKey)) return segment as AuthorCommandChildKey
    const index = Number(segment)
    if (!Number.isInteger(index)) throw new Error(`非法 canonical 指令路径 ${path}`)
    return index
  })
}

export function formatAuthorCommandPath(path: AuthorCommandPath): string {
  return path.join('/')
}

export function authorCommandChildBody(
  command: AuthorCommand,
  key: AuthorCommandChildKey,
): readonly AuthorCommand[] | undefined {
  switch (key) {
    case 'then':
      return command.kind === 'branch' ? command.then : undefined
    case 'else':
      return command.kind === 'branch' ? command.else : undefined
    case 'body':
      return command.kind === 'loop' || command.kind === 'repeat' ? command.body : undefined
    case 'onYes':
      return command.kind === 'confirm' ? command.onYes : undefined
    case 'onNo':
      return command.kind === 'confirm' ? command.onNo : undefined
    case 'onLose':
      return command.kind === 'startBattle' ? command.onLose : undefined
    case 'onFlee':
      return command.kind === 'startBattle' ? command.onFlee : undefined
    case 'onFail':
      return command.kind === 'teleportOut' ? command.onFail : undefined
  }
}

function withChildBody(
  command: AuthorCommand,
  key: AuthorCommandChildKey,
  body: AuthorCommand[],
): AuthorCommand {
  switch (key) {
    case 'then':
      if (command.kind !== 'branch') throw new Error(`${command.kind} 没有 then 子块`)
      return { ...command, then: body }
    case 'else':
      if (command.kind !== 'branch') throw new Error(`${command.kind} 没有 else 子块`)
      return { ...command, else: body }
    case 'body':
      if (command.kind !== 'loop' && command.kind !== 'repeat')
        throw new Error(`${command.kind} 没有 body 子块`)
      return { ...command, body }
    case 'onYes':
      if (command.kind !== 'confirm') throw new Error(`${command.kind} 没有 onYes 子块`)
      return { ...command, onYes: body }
    case 'onNo':
      if (command.kind !== 'confirm') throw new Error(`${command.kind} 没有 onNo 子块`)
      return { ...command, onNo: body }
    case 'onLose':
      if (command.kind !== 'startBattle') throw new Error(`${command.kind} 没有 onLose 子块`)
      return { ...command, onLose: body }
    case 'onFlee':
      if (command.kind !== 'startBattle') throw new Error(`${command.kind} 没有 onFlee 子块`)
      return { ...command, onFlee: body }
    case 'onFail':
      if (command.kind !== 'teleportOut') throw new Error(`${command.kind} 没有 onFail 子块`)
      return { ...command, onFail: body }
  }
}

function updateListAtPath(
  body: readonly AuthorCommand[],
  path: AuthorCommandPath,
  update: (list: readonly AuthorCommand[], index: number) => AuthorCommand[],
): AuthorCommand[] {
  const index = path[0]
  if (typeof index !== 'number') throw new Error(`canonical 指令路径必须从下标开始`)
  if (path.length === 1) return update(body, index)
  const key = path[1]
  if (typeof key !== 'string') throw new Error(`canonical 指令路径缺少子块名`)
  const command = body[index]
  if (!command) throw new Error(`canonical 指令路径下标越界 ${index}`)
  const child = authorCommandChildBody(command, key)
  if (!child) throw new Error(`${command.kind} 没有 ${key} 子块`)
  const nextChild = updateListAtPath(child, path.slice(2), update)
  if (nextChild === child) return body as AuthorCommand[]
  const next = [...body]
  next[index] = withChildBody(command, key, nextChild)
  return next
}

export function getAuthorCommandAt(
  body: readonly AuthorCommand[],
  path: AuthorCommandPath,
): AuthorCommand | undefined {
  const index = path[0]
  if (typeof index !== 'number' || index < 0) return undefined
  const command = body[index]
  if (!command) return undefined
  if (path.length === 1) return command
  const key = path[1]
  if (typeof key !== 'string') return undefined
  const child = authorCommandChildBody(command, key)
  return child ? getAuthorCommandAt(child, path.slice(2)) : undefined
}

export function updateAuthorCommandAt(
  body: readonly AuthorCommand[],
  path: AuthorCommandPath,
  command: AuthorCommand,
): AuthorCommand[] {
  return updateListAtPath(body, path, (list, index) => {
    if (!list[index]) return [...list]
    const next = [...list]
    next[index] = structuredClone(command)
    return next
  })
}

export function removeAuthorCommandAt(
  body: readonly AuthorCommand[],
  path: AuthorCommandPath,
): AuthorCommand[] {
  return updateListAtPath(body, path, (list, index) =>
    index < 0 || index >= list.length ? [...list] : list.filter((_, at) => at !== index),
  )
}

export function moveAuthorCommandAt(
  body: readonly AuthorCommand[],
  path: AuthorCommandPath,
  direction: -1 | 1,
): AuthorCommand[] {
  const index = path.at(-1)
  if (typeof index !== 'number') return body as AuthorCommand[]
  return moveAuthorCommandToIndex(body, path, index + direction)
}

/** Moves one command inside its existing sibling body; the target is an index, never another path. */
export function moveAuthorCommandToIndex(
  body: readonly AuthorCommand[],
  path: AuthorCommandPath,
  targetIndex: number,
): AuthorCommand[] {
  const index = path.at(-1)
  if (typeof index !== 'number' || !Number.isInteger(targetIndex)) return body as AuthorCommand[]
  let siblings: readonly AuthorCommand[] = body
  for (let offset = 0; offset < path.length - 1; offset += 2) {
    const parentIndex = path[offset]
    const childKey = path[offset + 1]
    if (typeof parentIndex !== 'number' || typeof childKey !== 'string')
      return body as AuthorCommand[]
    const parent = siblings[parentIndex]
    const child = parent ? authorCommandChildBody(parent, childKey) : undefined
    if (!child) return body as AuthorCommand[]
    siblings = child
  }
  if (
    index < 0 ||
    index >= siblings.length ||
    targetIndex < 0 ||
    targetIndex >= siblings.length ||
    index === targetIndex
  )
    return body as AuthorCommand[]
  return updateListAtPath(body, path, (list, sourceIndex) => {
    const next = [...list]
    const [command] = next.splice(sourceIndex, 1)
    if (!command) return list as AuthorCommand[]
    next.splice(targetIndex, 0, command)
    if (JSON.stringify(next) === JSON.stringify(list)) return list as AuthorCommand[]
    return next
  })
}

export function insertAuthorCommandAfter(
  body: readonly AuthorCommand[],
  path: AuthorCommandPath,
  command: AuthorCommand,
): AuthorCommand[] {
  return updateListAtPath(body, path, (list, index) => {
    const next = [...list]
    next.splice(Math.max(0, Math.min(list.length, index + 1)), 0, structuredClone(command))
    return next
  })
}

export function copyAuthorCommandAt(
  body: readonly AuthorCommand[],
  path: AuthorCommandPath,
): AuthorCommand[] {
  const command = getAuthorCommandAt(body, path)
  if (!command) return [...body]

  const occupied = new Set(collectAuthorLoopIds(body))
  const copyWithLocalIds = (
    source: AuthorCommand,
    enclosing: ReadonlyMap<string, string>,
  ): AuthorCommand => {
    let copy = structuredClone(source)
    let names = enclosing
    if ((copy.kind === 'loop' || copy.kind === 'repeat') && copy.id) {
      const oldId = copy.id
      let id = `${oldId}-copy`
      let suffix = 2
      while (occupied.has(id)) id = `${oldId}-copy-${suffix++}`
      occupied.add(id)
      copy = { ...copy, id }
      names = new Map([...enclosing, [oldId, id]])
    }
    if (copy.kind === 'continueLoop' && copy.loop && names.has(copy.loop))
      copy = { ...copy, loop: names.get(copy.loop)! }
    for (const key of CHILD_KEYS) {
      const child = authorCommandChildBody(copy, key)
      if (child)
        copy = withChildBody(
          copy,
          key,
          child.map((nested) => copyWithLocalIds(nested, names)),
        )
    }
    return copy
  }

  return insertAuthorCommandAfter(body, path, copyWithLocalIds(command, new Map()))
}

export function mapAuthorCommandTree(
  body: readonly AuthorCommand[],
  map: (command: AuthorCommand) => AuthorCommand,
): AuthorCommand[] {
  return body.map((source) => {
    let command = structuredClone(source)
    for (const key of CHILD_KEYS) {
      const child = authorCommandChildBody(command, key)
      if (child) command = withChildBody(command, key, mapAuthorCommandTree(child, map))
    }
    return map(command)
  })
}

export function collectAuthorLoopIds(body: readonly AuthorCommand[]): string[] {
  const ids: string[] = []
  mapAuthorCommandTree(body, (command) => {
    if ((command.kind === 'loop' || command.kind === 'repeat') && command.id) ids.push(command.id)
    return command
  })
  return ids
}

export function authorLoopAncestors(body: readonly AuthorCommand[], path: AuthorCommandPath) {
  const loops: Array<{ id?: string; label?: string }> = []
  for (let offset = 1; offset < path.length; offset += 2) {
    const parent = getAuthorCommandAt(body, path.slice(0, offset))
    if (path[offset] === 'body' && (parent?.kind === 'loop' || parent?.kind === 'repeat'))
      loops.push({ id: parent.id, label: parent.label })
  }
  return loops
}
