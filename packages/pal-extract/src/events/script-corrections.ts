/** Versioned corrections apply only after faithful decode and raw round-trip. */
import type { SceneEventObject } from '@type-pal/shared'
import type { EventObject, Sss } from '../io/sss.js'
import winPlan from './win-script-corrections.json' with { type: 'json' }

export const SCRIPT_CORRECTION_VERSION = winPlan.version
export const SCRIPT_SOURCE_SHA256 = winPlan.sourceSha256
export type EventObjectMetadata = Pick<
  SceneEventObject,
  'autoTriggerOnce' | 'autoTriggerAnchorX' | 'autoTriggerAnchorY'
>
export interface SupplementalEventObject {
  sceneId: number
  object: SceneEventObject
}
type Instruction = readonly [number, number, number, number]
type Word = number | { block: string }
export interface ScriptCorrectionPlan {
  version: string
  sourceSha256: string
  instructionCount: number
  rules: {
    id: string
    reason: string
    instructions?: { ip: number; before: readonly number[]; after: readonly Word[] }[]
    appends?: { id: string; instructions: readonly (readonly Word[])[] }[]
    objects?: {
      id: number
      before: Partial<EventObject>
      after: Partial<Record<Exclude<keyof EventObject, 'raw'>, Word>>
    }[]
    messages?: { index: number; before: string; after: string }[]
    metadata?: { id: number; value: EventObjectMetadata }[]
    supplementalObjects?: {
      id: number
      sceneId: number
      object: Omit<SceneEventObject, 'id' | 'triggerLabel' | 'autoLabel' | 'supplemental'> & {
        triggerScript?: Word
        autoScript?: Word
      }
    }[]
  }[]
}
export interface ScriptCorrectionManifest {
  source: { file: 'SSS.MKF'; sha256: string }
  mode: 'corrected' | 'faithful'
  version: string | null
  rules: { id: string; reason: string }[]
}

/** Apply a reviewed data plan to a clone. Every old instruction/object/message value is guarded;
 * named appended blocks are allocated together so absolute script addresses remain stable.
 * The engine is resource-neutral; the Win rule data and its primary-source audit own gameplay intent.
 */
export function applyScriptCorrectionPlan(
  source: Sss,
  sourceSha256: string,
  originalMessages: readonly string[],
  plan: ScriptCorrectionPlan,
): {
  sss: Sss
  messages: string[]
  manifest: ScriptCorrectionManifest
  eventMetadata: ReadonlyMap<number, EventObjectMetadata>
  supplementalObjects: SupplementalEventObject[]
} {
  if (sourceSha256 !== plan.sourceSha256)
    throw new Error(
      `Unsupported script source SSS.MKF sha256=${sourceSha256}; use --faithful for an uncorrected audit`,
    )
  if (source.bytecode.byteLength !== plan.instructionCount * 8)
    throw new Error(
      `Script correction precondition: expected ${plan.instructionCount} instructions`,
    )
  const sss = structuredClone(source)
  const messages = [...originalMessages]
  const view = new DataView(
    source.bytecode.buffer,
    source.bytecode.byteOffset,
    source.bytecode.byteLength,
  )
  const instructions: Instruction[] = Array.from({ length: plan.instructionCount }, (_, ip) => [
    view.getUint16(ip * 8, true),
    view.getUint16(ip * 8 + 2, true),
    view.getUint16(ip * 8 + 4, true),
    view.getUint16(ip * 8 + 6, true),
  ])
  const blocks = new Map<string, number>()
  let next = plan.instructionCount
  for (const rule of plan.rules)
    for (const block of rule.appends ?? []) {
      if (blocks.has(block.id)) throw new Error(`Duplicate correction block ${block.id}`)
      blocks.set(block.id, next)
      next += block.instructions.length
    }
  const resolveWord = (word: Word): number => {
    const value = typeof word === 'number' ? word : blocks.get(word.block)
    if (value === undefined || !Number.isInteger(value) || value < 0 || value > 0xffff)
      throw new Error(`Invalid correction word ${JSON.stringify(word)}`)
    return value
  }
  const resolveInstruction = (values: readonly Word[]): Instruction => {
    if (values.length !== 4) throw new Error('Correction instruction needs four words')
    const resolved = values.map(resolveWord)
    return [resolved[0]!, resolved[1]!, resolved[2]!, resolved[3]!]
  }
  const eventMetadata = new Map<number, EventObjectMetadata>()
  const supplementalObjects: SupplementalEventObject[] = []
  for (const rule of plan.rules) {
    for (const edit of rule.instructions ?? []) {
      const actual = instructions[edit.ip]
      if (!actual || edit.before.length !== 4 || actual.some((word, i) => word !== edit.before[i]))
        throw new Error(
          `${rule.id}: instruction ${edit.ip} precondition failed: expected ${edit.before}, got ${actual}`,
        )
      instructions[edit.ip] = resolveInstruction(edit.after)
    }
    for (const edit of rule.objects ?? []) {
      const object = sss.eventObjects[edit.id]
      if (
        !object ||
        Object.entries(edit.before).some(
          ([field, value]) => object[field as keyof EventObject] !== value,
        )
      )
        throw new Error(`${rule.id}: event object ${edit.id} precondition failed`)
      Object.assign(
        object,
        Object.fromEntries(
          Object.entries(edit.after).map(([field, value]) => [field, resolveWord(value)]),
        ),
      )
    }
    for (const edit of rule.messages ?? []) {
      if (messages[edit.index] !== edit.before)
        throw new Error(`${rule.id}: message ${edit.index} precondition failed`)
      messages[edit.index] = edit.after
    }
    for (const block of rule.appends ?? [])
      instructions.push(...block.instructions.map(resolveInstruction))
    for (const entry of rule.metadata ?? []) eventMetadata.set(entry.id, { ...entry.value })
    for (const entry of rule.supplementalObjects ?? []) {
      if (entry.id !== source.eventObjects.length + supplementalObjects.length)
        throw new Error(`${rule.id}: supplemental event ${entry.id} must append the native table`)
      if (
        !Number.isInteger(entry.sceneId) ||
        entry.sceneId < 0 ||
        entry.sceneId >= source.scenes.length
      )
        throw new Error(`${rule.id}: supplemental event ${entry.id} has invalid scene`)
      const { triggerScript, autoScript, ...definition } = entry.object
      const trigger = triggerScript === undefined ? 0 : resolveWord(triggerScript)
      const auto = autoScript === undefined ? 0 : resolveWord(autoScript)
      supplementalObjects.push({
        sceneId: entry.sceneId,
        object: {
          ...definition,
          id: entry.id,
          triggerLabel: trigger ? `L_${trigger}` : undefined,
          autoLabel: auto ? `L_${auto}` : undefined,
          supplemental: true,
        },
      })
    }
  }
  sss.bytecode = new Uint8Array(instructions.length * 8)
  const output = new DataView(sss.bytecode.buffer)
  for (const [ip, instruction] of instructions.entries()) {
    for (const [index, word] of instruction.entries())
      output.setUint16(ip * 8 + index * 2, word, true)
  }
  return {
    sss,
    messages,
    eventMetadata,
    supplementalObjects,
    manifest: {
      source: { file: 'SSS.MKF', sha256: sourceSha256 },
      mode: 'corrected',
      version: plan.version,
      rules: plan.rules.map(({ id, reason }) => ({ id, reason })),
    },
  }
}

export function correctScripts(source: Sss, sourceSha256: string, messages: readonly string[]) {
  return applyScriptCorrectionPlan(source, sourceSha256, messages, winPlan)
}
