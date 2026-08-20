import type { BaseAuthorCommand } from '@type-pal/content'

export type AuthorCommandChildKey =
  | 'then'
  | 'else'
  | 'body'
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
  'onNo',
  'onLose',
  'onFlee',
  'onFail',
])

export function parseAuthorCommandPath(path: string): AuthorCommandPathSegment[] {
  if (!path) return []
  return path.split('/').map((segment) => {
    if (CHILD_KEYS.has(segment as AuthorCommandChildKey))
      return segment as AuthorCommandChildKey
    const index = Number(segment)
    if (!Number.isInteger(index)) throw new Error(`非法 canonical 指令路径 ${path}`)
    return index
  })
}

export function formatAuthorCommandPath(path: AuthorCommandPath): string {
  return path.join('/')
}

export function authorCommandChildBody(
  command: BaseAuthorCommand,
  key: AuthorCommandChildKey,
): readonly BaseAuthorCommand[] | undefined {
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
  command: BaseAuthorCommand,
  key: AuthorCommandChildKey,
  body: BaseAuthorCommand[],
): BaseAuthorCommand {
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
  body: readonly BaseAuthorCommand[],
  path: AuthorCommandPath,
  update: (list: readonly BaseAuthorCommand[], index: number) => BaseAuthorCommand[],
): BaseAuthorCommand[] {
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
  const next = [...body]
  next[index] = withChildBody(command, key, nextChild)
  return next
}

export function getAuthorCommandAt(
  body: readonly BaseAuthorCommand[],
  path: AuthorCommandPath,
): BaseAuthorCommand | undefined {
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
  body: readonly BaseAuthorCommand[],
  path: AuthorCommandPath,
  command: BaseAuthorCommand,
): BaseAuthorCommand[] {
  return updateListAtPath(body, path, (list, index) => {
    if (!list[index]) return [...list]
    const next = [...list]
    next[index] = structuredClone(command)
    return next
  })
}

export function removeAuthorCommandAt(
  body: readonly BaseAuthorCommand[],
  path: AuthorCommandPath,
): BaseAuthorCommand[] {
  return updateListAtPath(body, path, (list, index) =>
    index < 0 || index >= list.length ? [...list] : list.filter((_, at) => at !== index),
  )
}

export function moveAuthorCommandAt(
  body: readonly BaseAuthorCommand[],
  path: AuthorCommandPath,
  direction: -1 | 1,
): BaseAuthorCommand[] {
  return updateListAtPath(body, path, (list, index) => {
    const target = index + direction
    if (index < 0 || index >= list.length || target < 0 || target >= list.length) return [...list]
    const next = [...list]
    ;[next[index], next[target]] = [next[target]!, next[index]!]
    return next
  })
}

export function insertAuthorCommandAfter(
  body: readonly BaseAuthorCommand[],
  path: AuthorCommandPath,
  command: BaseAuthorCommand,
): BaseAuthorCommand[] {
  return updateListAtPath(body, path, (list, index) => {
    const next = [...list]
    next.splice(Math.max(0, Math.min(list.length, index + 1)), 0, structuredClone(command))
    return next
  })
}
