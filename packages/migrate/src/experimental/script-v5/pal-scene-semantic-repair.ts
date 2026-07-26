import type { AuthorCommandV5, SceneDefV5 } from '@type-pal/content'
import { validateScenesV5 } from '@type-pal/content'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import type { SourceCmd } from '../../source-facts.js'
import { stableJsonSha256 } from './stable-json.js'

const FADE_REPAIRS = [
  {
    sceneId: 's048',
    target: { kind: 'scene-hook' },
    before: 'dlg.3809',
    after: 'dlg.3813',
    fadeOutAddress: 10729,
    fadeOperand: 0xfffc,
    consumer: { kind: 'redraw', address: 10735, delayFrames: 2 },
  },
  {
    sceneId: 's110',
    target: {
      kind: 'entity-behavior',
      entityId: 'e2061',
      channel: 'trigger',
      behaviorId: 'default',
    },
    before: 'dlg.5863',
    after: 'dlg.5865',
    fadeOutAddress: 16791,
    fadeOperand: 0xfffc,
    consumer: {
      kind: 'wait',
      address: 16799,
      frames: 28,
      anchor: {
        target: { scene: 's110', entity: 'e2056' },
        channel: 'auto',
        behaviorId: 'legacy-001',
      },
    },
  },
  {
    sceneId: 's172',
    target: { kind: 'scene-hook' },
    before: 'dlg.10025',
    after: 'dlg.10026',
    fadeOutAddress: 28296,
    fadeOperand: 0xffff,
    consumer: { kind: 'redraw', address: 28305, delayFrames: 3 },
  },
] as const

const S048_CHECKPOINT = {
  sceneId: 's048',
  address: 10747,
  tailBattlefieldAddress: 10748,
  endAddress: 10749,
  tailDialogue: 'dlg.3818',
  completedStageId: 'completed',
} as const

export interface PalSceneSemanticRepairEvidenceV1 {
  generator: {
    id: 'pal-scene-semantic-repair'
    version: 1
  }
  sourceSites: {
    sceneId: string
    kind: 'implicit-scene-fade-in' | 'trigger-entry-checkpoint'
    addresses: number[]
    digest: string
  }[]
  targets: {
    sceneId: string
    owner: string
    digest: string
  }[]
}

export interface PalSceneSemanticRepair {
  snapshot: MigrationSnapshot
  evidence: PalSceneSemanticRepairEvidenceV1
}

function cloneSnapshot(source: MigrationSnapshot): MigrationSnapshot {
  return {
    files: new Map(
      [...source.files].map(([path, value]) => [path, structuredClone(value)] as const),
    ),
    managedFiles: new Set(source.managedFiles),
    ...(source.hashes ? { hashes: new Map(source.hashes) } : {}),
    ...(source.baselineMetadata
      ? { baselineMetadata: structuredClone(source.baselineMetadata) }
      : {}),
  }
}

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function sourceCommand(commands: readonly SourceCmd[], address: number, label: string): SourceCmd {
  const command = commands[address]
  if (!command) throw new Error(`PAL scene semantic repair: ${label} 缺源地址 ${address}`)
  const expectedLabel = `L_${address}`
  if (command.label !== undefined && command.label !== expectedLabel)
    throw new Error(
      `PAL scene semantic repair: all.json label/index 漂移 ${command.label} != ${expectedLabel}`,
    )
  return command
}

function assertRaw(
  commands: readonly SourceCmd[],
  address: number,
  opcode: number,
  operands: readonly number[],
  label: string,
): SourceCmd {
  const command = sourceCommand(commands, address, label)
  if (
    command.op !== 'raw' ||
    command.opcode !== opcode ||
    command.operands?.length !== operands.length ||
    operands.some((operand, index) => command.operands?.[index] !== operand)
  )
    throw new Error(`PAL scene semantic repair: ${label} 源语义漂移 @${address}`)
  return command
}

function onEnterFlow(scene: SceneDefV5) {
  const channel = scene.hooks?.onEnter
  const hook = channel?.initial ? channel.variants[channel.initial] : undefined
  if (!hook) throw new Error(`PAL scene semantic repair: ${scene.id} 缺默认 onEnter`)
  if (hook.flow.kind !== 'stages')
    throw new Error(`PAL scene semantic repair: ${scene.id} 默认 onEnter 不是 stages`)
  return hook.flow
}

function repairFlow(scene: SceneDefV5, spec: (typeof FADE_REPAIRS)[number]) {
  const target = spec.target
  if (target.kind === 'scene-hook') return onEnterFlow(scene)
  const entity = scene.entities.find((candidate) => candidate.id === target.entityId)
  const behavior = entity?.behaviors?.[target.channel]?.[target.behaviorId]
  if (!behavior)
    throw new Error(
      `PAL scene semantic repair: ${scene.id}/${target.entityId} 缺 ${target.channel}/${target.behaviorId}`,
    )
  if (behavior.flow.kind !== 'stages')
    throw new Error(
      `PAL scene semantic repair: ${scene.id}/${target.entityId} 目标 behavior 不是 stages`,
    )
  return behavior.flow
}

function repairOwner(spec: (typeof FADE_REPAIRS)[number]): string {
  const target = spec.target
  return target.kind === 'scene-hook'
    ? 'onEnter'
    : `${target.entityId}/${target.channel}/${target.behaviorId}`
}

function containsDialogueText(command: AuthorCommandV5, text: string): boolean {
  return command.kind === 'dialog' && command.cue.rows.some((row) => row.text === text)
}

function uniqueCommandIndex(
  body: readonly AuthorCommandV5[],
  predicate: (command: AuthorCommandV5) => boolean,
  range: { from: number; to: number },
  label: string,
): number {
  const matches: number[] = []
  for (let index = range.from; index < range.to; index++)
    if (predicate(body[index]!)) matches.push(index)
  if (matches.length !== 1)
    throw new Error(`PAL scene semantic repair: ${label} 锚点数量 ${matches.length}，期望恰好 1 个`)
  return matches[0]!
}

function isFadeIn(command: AuthorCommandV5 | undefined, ms: number): boolean {
  return command?.kind === 'fade' && command.dir === 'in' && command.ms === ms
}

function isWait(command: AuthorCommandV5 | undefined, ms: number): boolean {
  return command?.kind === 'wait' && command.ms === ms
}

function restoreImplicitFadeIn(scene: SceneDefV5, spec: (typeof FADE_REPAIRS)[number]): void {
  const flow = repairFlow(scene, spec)
  const stage = flow.stages.find((candidate) => candidate.id === flow.initial)
  if (!stage) throw new Error(`PAL scene semantic repair: ${scene.id} 缺初始步骤`)
  const consumerSpec = spec.consumer
  const before = uniqueCommandIndex(
    stage.body,
    (command) => containsDialogueText(command, spec.before),
    { from: 0, to: stage.body.length },
    `${scene.id} 前置对话 ${spec.before}`,
  )
  const after = uniqueCommandIndex(
    stage.body,
    (command) => containsDialogueText(command, spec.after),
    { from: before + 1, to: stage.body.length },
    `${scene.id} 后置对话 ${spec.after}`,
  )
  const fadeOut = uniqueCommandIndex(
    stage.body,
    (command) => command.kind === 'fade' && command.dir === 'out',
    { from: before + 1, to: after },
    `${scene.id} 淡出`,
  )
  const fadeIns = stage.body
    .slice(fadeOut + 1, after)
    .filter((command) => command.kind === 'fade' && command.dir === 'in')

  if (consumerSpec.kind === 'redraw') {
    const consumer = uniqueCommandIndex(
      stage.body,
      (command) => command.kind === 'clearDialog',
      { from: fadeOut + 1, to: after },
      `${scene.id} PAL_MakeScene 重画`,
    )
    const tail = stage.body.slice(consumer + 1, after)
    if (tail.length === 0 && fadeIns.length === 0) {
      stage.body.splice(
        consumer + 1,
        0,
        { kind: 'fade', dir: 'in', ms: 600 },
        { kind: 'wait', ms: consumerSpec.delayFrames * 60 },
      )
      return
    }
    if (
      tail.length === 2 &&
      fadeIns.length === 1 &&
      isFadeIn(tail[0], 600) &&
      isWait(tail[1], consumerSpec.delayFrames * 60)
    )
      return
    throw new Error(`PAL scene semantic repair: ${scene.id} PAL_MakeScene 重画目标形状漂移`)
  }

  const anchorSpec = consumerSpec.anchor
  const anchor = uniqueCommandIndex(
    stage.body,
    (command) =>
      command.kind === 'selectEntityBehavior' &&
      command.target.scene === anchorSpec.target.scene &&
      command.target.entity === anchorSpec.target.entity &&
      command.channel === anchorSpec.channel &&
      command.selection.kind === 'use' &&
      command.selection.value === anchorSpec.behaviorId,
    { from: fadeOut + 1, to: after },
    `${scene.id} PAL_MakeScene 等待前行为切换`,
  )
  const tail = stage.body.slice(anchor + 1, after)
  const totalWaitMs = consumerSpec.frames * 40
  const remainingWaitMs = (consumerSpec.frames - 1) * 40
  if (tail.length === 1 && fadeIns.length === 0 && isWait(tail[0], totalWaitMs)) {
    stage.body.splice(
      anchor + 1,
      1,
      { kind: 'clearDialog' },
      { kind: 'wait', ms: 40 },
      { kind: 'fade', dir: 'in', ms: 600 },
      { kind: 'wait', ms: remainingWaitMs },
    )
    return
  }
  if (
    tail.length === 4 &&
    fadeIns.length === 1 &&
    tail[0]?.kind === 'clearDialog' &&
    isWait(tail[1], 40) &&
    isFadeIn(tail[2], 600) &&
    isWait(tail[3], remainingWaitMs)
  )
    return
  throw new Error(`PAL scene semantic repair: ${scene.id} PAL_MakeScene 等待目标形状漂移`)
}

function restoreS048Checkpoint(scene: SceneDefV5): void {
  if (scene.battleFieldId !== 6)
    throw new Error('PAL scene semantic repair: s048 checkpoint 战场折叠语义漂移')
  const flow = onEnterFlow(scene)
  const initial = flow.stages.find((stage) => stage.id === flow.initial)
  if (!initial) throw new Error('PAL scene semantic repair: s048 缺初始步骤')
  const tailDialogue = uniqueCommandIndex(
    initial.body,
    (command) => containsDialogueText(command, S048_CHECKPOINT.tailDialogue),
    { from: 0, to: initial.body.length },
    `s048 checkpoint 尾部对话 ${S048_CHECKPOINT.tailDialogue}`,
  )
  if (tailDialogue !== initial.body.length - 1)
    throw new Error('PAL scene semantic repair: s048 checkpoint 尾部投影不完整')
  const completed = flow.stages.find((stage) => stage.id === S048_CHECKPOINT.completedStageId)
  if (completed) {
    if (
      flow.stages.length !== 2 ||
      initial.next !== completed.id ||
      completed.body.length !== 0 ||
      completed.next !== undefined
    )
      throw new Error('PAL scene semantic repair: s048 已有 completed 步骤但语义不匹配')
    return
  }
  if (flow.stages.length !== 1 || initial.next !== undefined)
    throw new Error('PAL scene semantic repair: s048 checkpoint 基线形状漂移')
  initial.next = S048_CHECKPOINT.completedStageId
  flow.stages.push({ id: S048_CHECKPOINT.completedStageId, body: [] })
}

/**
 * P7 full ledger 已发布后，旧数据中三个依赖 SDLPal 隐式运行态的站点需要显式化。
 * 这里仅修改纯 canonical generated snapshot，不重开 P0-P7，也不改冻结 ledger/sidecar。
 */
export function repairPalSceneSemanticsAfterP7(args: {
  snapshot: MigrationSnapshot
  sourceCommands: readonly SourceCmd[]
}): PalSceneSemanticRepair {
  const sourceSites: PalSceneSemanticRepairEvidenceV1['sourceSites'] = []
  for (const spec of FADE_REPAIRS) {
    const fade = assertRaw(
      args.sourceCommands,
      spec.fadeOutAddress,
      0x93,
      [spec.fadeOperand, 0, 0],
      `${spec.sceneId} SceneFade`,
    )
    const consumer =
      spec.consumer.kind === 'redraw'
        ? assertRaw(
            args.sourceCommands,
            spec.consumer.address,
            0x05,
            [0, spec.consumer.delayFrames, 0],
            `${spec.sceneId} PAL_MakeScene`,
          )
        : assertRaw(
            args.sourceCommands,
            spec.consumer.address,
            0x09,
            [spec.consumer.frames, 0, 0],
            `${spec.sceneId} wait/PAL_MakeScene`,
          )
    sourceSites.push({
      sceneId: spec.sceneId,
      kind: 'implicit-scene-fade-in',
      addresses: [spec.fadeOutAddress, spec.consumer.address],
      digest: stableJsonSha256([fade, consumer]),
    })
  }

  const checkpoint = assertRaw(
    args.sourceCommands,
    S048_CHECKPOINT.address,
    0x08,
    [0, 0, 0],
    's048 checkpoint',
  )
  const battlefield = assertRaw(
    args.sourceCommands,
    S048_CHECKPOINT.tailBattlefieldAddress,
    0x4a,
    [6, 0, 0],
    's048 checkpoint tail',
  )
  const end = sourceCommand(args.sourceCommands, S048_CHECKPOINT.endAddress, 's048 checkpoint end')
  const endControl = end as SourceCmd & { advance?: boolean; reset?: boolean }
  if (endControl.op !== 'end' || endControl.advance || endControl.reset)
    throw new Error('PAL scene semantic repair: s048 checkpoint 普通收尾语义漂移')
  sourceSites.push({
    sceneId: S048_CHECKPOINT.sceneId,
    kind: 'trigger-entry-checkpoint',
    addresses: [
      S048_CHECKPOINT.address,
      S048_CHECKPOINT.tailBattlefieldAddress,
      S048_CHECKPOINT.endAddress,
    ],
    digest: stableJsonSha256([checkpoint, battlefield, end]),
  })

  const snapshot = cloneSnapshot(args.snapshot)
  const targets: PalSceneSemanticRepairEvidenceV1['targets'] = []
  for (const spec of FADE_REPAIRS) {
    const path = `content/scenes/${spec.sceneId}.json`
    const raw = snapshot.files.get(path)
    if (!raw) throw new Error(`PAL scene semantic repair: 缺 ${path}`)
    const scene = validateScenesV5([structuredClone(raw)])[0]!
    if (scene.id !== spec.sceneId)
      throw new Error(`PAL scene semantic repair: ${path} 内容 id=${scene.id} 与路径不匹配`)
    restoreImplicitFadeIn(scene, spec)
    if (scene.id === S048_CHECKPOINT.sceneId) restoreS048Checkpoint(scene)
    validateScenesV5([scene])
    snapshot.files.set(path, asJson(scene))
    snapshot.managedFiles.add(path)
    targets.push({
      sceneId: scene.id,
      owner: repairOwner(spec),
      digest: stableJsonSha256(
        scene.id === S048_CHECKPOINT.sceneId
          ? { flow: repairFlow(scene, spec), battleFieldId: scene.battleFieldId }
          : repairFlow(scene, spec),
      ),
    })
  }

  return {
    snapshot,
    evidence: {
      generator: { id: 'pal-scene-semantic-repair', version: 1 },
      sourceSites,
      targets,
    },
  }
}
