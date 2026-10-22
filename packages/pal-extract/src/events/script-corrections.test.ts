import { createHash } from 'node:crypto'
import { expect, test } from 'vitest'
import type { Sss } from '../io/sss.js'
import {
  applyScriptCorrectionPlan,
  correctScripts,
  type ScriptCorrectionPlan,
} from './script-corrections.js'

/** Small legal script/container model for the plan engine, not a fake Win gameplay source. */
function example() {
  const source: Sss = {
    scenes: [],
    objects: new Uint16Array(),
    messageOffsets: new Uint32Array([0, 3]),
    bytecode: new Uint8Array(16),
    eventObjects: [
      {
        vanishTime: 0,
        x: 32,
        y: 32,
        layer: 0,
        triggerScript: 0,
        autoScript: 0,
        state: 1,
        triggerMode: 0,
        spriteNum: 0,
        nSpriteFrames: 0,
        direction: 0,
        currentFrameNum: 0,
        scriptIdleFrame: 0,
        spritePtrOffset: 0,
        nSpriteFramesAuto: 0,
        scriptIdleFrameCountAuto: 0,
        raw: new Uint16Array(16),
      },
    ],
  }
  const sha = createHash('sha256').update(source.bytecode).digest('hex')
  const plan: ScriptCorrectionPlan = {
    version: 'example-1',
    sourceSha256: sha,
    instructionCount: 2,
    rules: [
      {
        id: 'example',
        reason: 'Verify guarded edits and forward block relocation independently of Win rules.',
        instructions: [{ ip: 0, before: [0, 0, 0, 0], after: [3, { block: 'body' }, 0, 0] }],
        appends: [
          { id: 'body', instructions: [[3, { block: 'stop' }, 0, 0]] },
          { id: 'stop', instructions: [[0, 0, 0, 0]] },
        ],
        objects: [
          {
            id: 0,
            before: { state: 1, x: 32 },
            after: { state: 0, triggerScript: { block: 'body' } },
          },
        ],
        messages: [{ index: 0, before: 'old', after: 'new' }],
        metadata: [
          {
            id: 0,
            value: { autoTriggerOnce: true, autoTriggerAnchorX: 32, autoTriggerAnchorY: 48 },
          },
        ],
      },
    ],
  }
  return { source, sha, plan, messages: ['old'] }
}

test('guarded plan relocates forward script/object references and preserves all source inputs', () => {
  const input = example(),
    before = structuredClone(input)
  const out = applyScriptCorrectionPlan(input.source, input.sha, input.messages, input.plan)
  expect(input).toEqual(before)
  const words = Array.from(new Uint16Array(out.sss.bytecode.buffer))
  expect(words).toEqual([3, 2, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0])
  expect(out.sss.eventObjects[0]).toMatchObject({ state: 0, x: 32, triggerScript: 2 })
  expect(out.messages).toEqual(['new'])
  expect(out.eventMetadata.get(0)).toEqual({
    autoTriggerOnce: true,
    autoTriggerAnchorX: 32,
    autoTriggerAnchorY: 48,
  })
  expect(out.manifest).toMatchObject({
    mode: 'corrected',
    version: 'example-1',
    rules: [{ id: 'example' }],
  })
  expect(applyScriptCorrectionPlan(input.source, input.sha, input.messages, input.plan)).toEqual(
    out,
  )
})

test('wrong source identity and instruction count reject before applying edits', () => {
  const input = example(),
    before = structuredClone(input.source)
  expect(() =>
    applyScriptCorrectionPlan(input.source, 'other', input.messages, input.plan),
  ).toThrow('Unsupported script source')
  input.plan.instructionCount++
  expect(() =>
    applyScriptCorrectionPlan(input.source, input.sha, input.messages, input.plan),
  ).toThrow('expected 3 instructions')
  expect(input.source).toEqual(before)
  expect(() => correctScripts(input.source, input.sha, input.messages)).toThrow(
    'Unsupported script source',
  )
})

test('metadata-only rules preserve script, object and message data without requiring empty edit lists', () => {
  const input = example()
  input.plan.rules = [
    {
      id: 'anchor',
      reason: 'Preview trigger metadata only.',
      metadata: input.plan.rules[0]!.metadata,
    },
  ]
  const before = structuredClone(input)
  const out = applyScriptCorrectionPlan(input.source, input.sha, input.messages, input.plan)
  expect(out.sss).toEqual(before.source)
  expect(out.messages).toEqual(before.messages)
  expect(out.eventMetadata.get(0)).toEqual({
    autoTriggerOnce: true,
    autoTriggerAnchorX: 32,
    autoTriggerAnchorY: 48,
  })
  expect(input).toEqual(before)
})

test('an instruction-only rule leaves event metadata empty', () => {
  const input = example()
  input.plan.rules = [
    {
      id: 'end',
      reason: 'Change one guarded instruction.',
      instructions: [{ ip: 0, before: [0, 0, 0, 0], after: [1, 0, 0, 0] }],
    },
  ]
  const out = applyScriptCorrectionPlan(input.source, input.sha, input.messages, input.plan)
  expect(Array.from(new Uint16Array(out.sss.bytecode.buffer))).toEqual([1, 0, 0, 0, 0, 0, 0, 0])
  expect(out.sss.eventObjects).toEqual(input.source.eventObjects)
  expect(out.messages).toEqual(input.messages)
  expect(out.eventMetadata.size).toBe(0)
})

test.each([
  'instruction-address',
  'instruction-shape',
  'object-id',
] as const)('a missing or malformed %s precondition rejects without altering source', (problem) => {
  const input = example()
  if (problem === 'instruction-address') input.plan.rules[0]!.instructions![0]!.ip = 2
  if (problem === 'instruction-shape') input.plan.rules[0]!.instructions![0]!.before = [0]
  if (problem === 'object-id') input.plan.rules[0]!.objects![0]!.id = 1
  const before = structuredClone(input)
  expect(() =>
    applyScriptCorrectionPlan(input.source, input.sha, input.messages, input.plan),
  ).toThrow('precondition failed')
  expect(input).toEqual(before)
})

test.each([
  'instruction',
  'object',
  'message',
] as const)('a drifted %s prevalue leaves source input untouched', (part) => {
  const input = example()
  if (part === 'instruction') input.source.bytecode[0] = 1
  if (part === 'object') input.source.eventObjects[0]!.state = 2
  if (part === 'message') input.messages[0] = 'other'
  const before = structuredClone(input)
  expect(() =>
    applyScriptCorrectionPlan(input.source, input.sha, input.messages, input.plan),
  ).toThrow('precondition failed')
  expect(input).toEqual(before)
})

test.each([
  'duplicate',
  'missing',
  'overflow',
  'shape',
] as const)('an invalid %s block plan fails without a partial result', (problem) => {
  const input = example(),
    rule = input.plan.rules[0]!
  if (problem === 'duplicate') rule.appends!.push({ id: 'body', instructions: [] })
  if (problem === 'missing') rule.instructions![0]!.after = [3, { block: 'absent' }, 0, 0]
  if (problem === 'overflow') rule.instructions![0]!.after = [3, 65536, 0, 0]
  if (problem === 'shape') rule.instructions![0]!.after = [0]
  const before = structuredClone(input.source)
  expect(() =>
    applyScriptCorrectionPlan(input.source, input.sha, input.messages, input.plan),
  ).toThrow(
    problem === 'duplicate'
      ? 'Duplicate'
      : problem === 'shape'
        ? 'four words'
        : 'Invalid correction word',
  )
  expect(input.source).toEqual(before)
})
