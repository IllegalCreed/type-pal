import type { AuthorCommandV5 } from '@type-pal/content'

export type AuthorCommandChildKeyV5 =
  | 'then'
  | 'else'
  | 'body'
  | 'onNo'
  | 'onLose'
  | 'onFlee'
  | 'onFail'

export type AuthorCommandPathSegmentV5 = number | AuthorCommandChildKeyV5
export type AuthorCommandPathV5 = readonly AuthorCommandPathSegmentV5[]

const CHILD_KEYS = new Set<AuthorCommandChildKeyV5>([
  'then',
  'else',
  'body',
  'onNo',
  'onLose',
  'onFlee',
  'onFail',
])

export function parseAuthorCommandPathV5(path: string): AuthorCommandPathSegmentV5[] {
  if (!path) return []
  return path.split('/').map((segment) => {
    if (CHILD_KEYS.has(segment as AuthorCommandChildKeyV5))
      return segment as AuthorCommandChildKeyV5
    const index = Number(segment)
    if (!Number.isInteger(index)) throw new Error(`非法 canonical 指令路径 ${path}`)
    return index
  })
}

export function formatAuthorCommandPathV5(path: AuthorCommandPathV5): string {
  return path.join('/')
}

export function authorCommandChildBodyV5(
  command: AuthorCommandV5,
  key: AuthorCommandChildKeyV5,
): readonly AuthorCommandV5[] | undefined {
  switch (key) {
    case 'then':
      return command.kind === 'branch' ? command.then : undefined
    case 'else':
      return command.kind === 'branch' ? command.else : undefined
    case 'body':
      return command.kind === 'loop' ? command.body : undefined
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
  command: AuthorCommandV5,
  key: AuthorCommandChildKeyV5,
  body: AuthorCommandV5[],
): AuthorCommandV5 {
  switch (key) {
    case 'then':
      if (command.kind !== 'branch') throw new Error(`${command.kind} 没有 then 子块`)
      return { ...command, then: body }
    case 'else':
      if (command.kind !== 'branch') throw new Error(`${command.kind} 没有 else 子块`)
      return { ...command, else: body }
    case 'body':
      if (command.kind !== 'loop') throw new Error(`${command.kind} 没有 body 子块`)
      return { ...command, body }
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
  body: readonly AuthorCommandV5[],
  path: AuthorCommandPathV5,
  update: (list: readonly AuthorCommandV5[], index: number) => AuthorCommandV5[],
): AuthorCommandV5[] {
  const index = path[0]
  if (typeof index !== 'number') throw new Error(`canonical 指令路径必须从下标开始`)
  if (path.length === 1) return update(body, index)
  const key = path[1]
  if (typeof key !== 'string') throw new Error(`canonical 指令路径缺少子块名`)
  const command = body[index]
  if (!command) throw new Error(`canonical 指令路径下标越界 ${index}`)
  const child = authorCommandChildBodyV5(command, key)
  if (!child) throw new Error(`${command.kind} 没有 ${key} 子块`)
  const nextChild = updateListAtPath(child, path.slice(2), update)
  const next = [...body]
  next[index] = withChildBody(command, key, nextChild)
  return next
}

export function getAuthorCommandAtV5(
  body: readonly AuthorCommandV5[],
  path: AuthorCommandPathV5,
): AuthorCommandV5 | undefined {
  const index = path[0]
  if (typeof index !== 'number' || index < 0) return undefined
  const command = body[index]
  if (!command) return undefined
  if (path.length === 1) return command
  const key = path[1]
  if (typeof key !== 'string') return undefined
  const child = authorCommandChildBodyV5(command, key)
  return child ? getAuthorCommandAtV5(child, path.slice(2)) : undefined
}

export function updateAuthorCommandAtV5(
  body: readonly AuthorCommandV5[],
  path: AuthorCommandPathV5,
  command: AuthorCommandV5,
): AuthorCommandV5[] {
  return updateListAtPath(body, path, (list, index) => {
    if (!list[index]) return [...list]
    const next = [...list]
    next[index] = structuredClone(command)
    return next
  })
}

export function removeAuthorCommandAtV5(
  body: readonly AuthorCommandV5[],
  path: AuthorCommandPathV5,
): AuthorCommandV5[] {
  return updateListAtPath(body, path, (list, index) =>
    index < 0 || index >= list.length ? [...list] : list.filter((_, at) => at !== index),
  )
}

export function moveAuthorCommandAtV5(
  body: readonly AuthorCommandV5[],
  path: AuthorCommandPathV5,
  direction: -1 | 1,
): AuthorCommandV5[] {
  return updateListAtPath(body, path, (list, index) => {
    const target = index + direction
    if (index < 0 || index >= list.length || target < 0 || target >= list.length) return [...list]
    const next = [...list]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    return next
  })
}

export function insertAuthorCommandAfterV5(
  body: readonly AuthorCommandV5[],
  path: AuthorCommandPathV5,
  command: AuthorCommandV5,
): AuthorCommandV5[] {
  return updateListAtPath(body, path, (list, index) => {
    const next = [...list]
    next.splice(Math.max(0, Math.min(list.length, index + 1)), 0, structuredClone(command))
    return next
  })
}
