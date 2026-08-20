/** 项目级作者变量定义；运行值仍只存在于 WorldScriptState。 */

export type WorldVariableKindV1 = 'flag' | 'number'

interface WorldVariableDefinitionBaseV1 {
  kind: WorldVariableKindV1
  name: string
  description: string
}

export interface WorldFlagDefinitionV1 extends WorldVariableDefinitionBaseV1 {
  kind: 'flag'
  initial: boolean
}

export interface WorldNumberDefinitionV1 extends WorldVariableDefinitionBaseV1 {
  kind: 'number'
  initial: number
}

export type WorldVariableDefinitionV1 = WorldFlagDefinitionV1 | WorldNumberDefinitionV1
export type WorldVariableRegistryV1 = Record<string, WorldVariableDefinitionV1>

export const WORLD_VARIABLE_ID_MAX_LENGTH = 128
export const WORLD_VARIABLE_NAME_MAX_LENGTH = 80
export const WORLD_VARIABLE_DESCRIPTION_MAX_LENGTH = 500

const ID_PATTERN = /^[A-Za-z][A-Za-z0-9._:-]*$/

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], path: string): void {
  const allowedSet = new Set(allowed)
  const unknown = Object.keys(value).filter((key) => !allowedSet.has(key))
  if (unknown.length) throw new Error(`${path}: 未知字段 ${unknown.join(', ')}`)
}

export function validateWorldVariableIdV1(value: unknown, path = 'worldVariable.id'): string {
  if (typeof value !== 'string') throw new Error(`${path}: 期望字符串`)
  if (!value.length) throw new Error(`${path}: 不能为空`)
  if (value !== value.trim()) throw new Error(`${path}: 不得包含首尾空格`)
  if (value.length > WORLD_VARIABLE_ID_MAX_LENGTH)
    throw new Error(`${path}: 长度不得超过 ${WORLD_VARIABLE_ID_MAX_LENGTH}`)
  if (!ID_PATTERN.test(value))
    throw new Error(`${path}: 只允许字母开头及字母、数字、点、冒号、下划线、连字符`)
  if (value.startsWith('sys:')) throw new Error(`${path}: sys: 命名空间保留给引擎`)
  return value
}

function text(
  value: unknown,
  path: string,
  maxLength: number,
  options: { allowEmpty: boolean },
): string {
  if (typeof value !== 'string') throw new Error(`${path}: 期望字符串`)
  if (value !== value.trim()) throw new Error(`${path}: 不得包含首尾空格`)
  if (!options.allowEmpty && !value) throw new Error(`${path}: 不能为空`)
  if (value.length > maxLength) throw new Error(`${path}: 长度不得超过 ${maxLength}`)
  return value
}

export function validateWorldVariableRegistryV1(value: unknown): WorldVariableRegistryV1 {
  const input = record(value, 'worldVariables')
  const output: WorldVariableRegistryV1 = {}
  for (const [rawId, rawDefinition] of Object.entries(input)) {
    const id = validateWorldVariableIdV1(rawId, `worldVariables.${rawId || '<empty>'}`)
    const definition = record(rawDefinition, `worldVariables.${id}`)
    exactKeys(definition, ['kind', 'name', 'description', 'initial'], `worldVariables.${id}`)
    const name = text(
      definition.name,
      `worldVariables.${id}.name`,
      WORLD_VARIABLE_NAME_MAX_LENGTH,
      { allowEmpty: false },
    )
    const description = text(
      definition.description,
      `worldVariables.${id}.description`,
      WORLD_VARIABLE_DESCRIPTION_MAX_LENGTH,
      { allowEmpty: true },
    )
    if (definition.kind === 'flag') {
      if (typeof definition.initial !== 'boolean')
        throw new Error(`worldVariables.${id}.initial: flag 期望 boolean`)
      output[id] = { kind: 'flag', name, description, initial: definition.initial }
      continue
    }
    if (definition.kind === 'number') {
      if (typeof definition.initial !== 'number' || !Number.isFinite(definition.initial))
        throw new Error(`worldVariables.${id}.initial: number 期望有限数值`)
      output[id] = { kind: 'number', name, description, initial: definition.initial }
      continue
    }
    throw new Error(`worldVariables.${id}.kind: 只允许 flag / number`)
  }
  return output
}

/** 新开局唯一初始化入口；返回 fresh records，绝不把 registry 引用泄漏到运行态。 */
export function initialWorldVariablesV1(registry: WorldVariableRegistryV1): {
  flags: Record<string, boolean>
  vars: Record<string, number>
} {
  const checked = validateWorldVariableRegistryV1(registry)
  const flags: Record<string, boolean> = {}
  const vars: Record<string, number> = {}
  for (const [id, definition] of Object.entries(checked)) {
    if (definition.kind === 'flag') flags[id] = definition.initial
    else vars[id] = definition.initial
  }
  return { flags, vars }
}
