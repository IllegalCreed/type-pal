import type { MigrationJson } from './pal-migration.js'

export interface PalBlackScreenTransactionEvidence {
  scenePath: string
  dialogAnchor: string
  token: string
  holdAddress: number
  revealAddress: number
  outMs: number
  inMs: number
}

/** 源地址只属于迁移 evidence；写入命令的是稳定业务 token，不是运行时 IP。 */
export const PAL_BLACK_SCREEN_TRANSACTION_EVIDENCE: readonly PalBlackScreenTransactionEvidence[] = [
  {
    scenePath: 'content/scenes/s003.json',
    dialogAnchor: 'dlg.1031',
    token: 'pal-blackout-inn-night',
    holdAddress: 2901,
    revealAddress: 2902,
    outMs: 600,
    inMs: 600,
  },
  {
    scenePath: 'content/scenes/s003.json',
    dialogAnchor: 'dlg.1076',
    token: 'pal-blackout-inn-next-day',
    holdAddress: 3051,
    revealAddress: 3052,
    outMs: 3200,
    inMs: 600,
  },
  {
    scenePath: 'content/scenes/s020.json',
    dialogAnchor: 'dlg.1774',
    token: 'pal-blackout-wedding-transition',
    holdAddress: 4729,
    revealAddress: 4744,
    outMs: 1800,
    inMs: 600,
  },
  {
    scenePath: 'content/scenes/s174.json',
    dialogAnchor: 'dlg.9976',
    token: 'pal-blackout-months-later',
    holdAddress: 28095,
    revealAddress: 28100,
    outMs: 1200,
    inMs: 600,
  },
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isDialogAnchor(command: unknown, anchor: string): boolean {
  if (!isRecord(command) || command.kind !== 'dialog' || !isRecord(command.cue)) return false
  const rows = command.cue.rows
  return Array.isArray(rows) && rows.some((row) => isRecord(row) && row.text === anchor)
}

function collectDirectCommandArrays(
  value: unknown,
  anchor: string,
  output: Array<Array<Record<string, unknown>>>,
): void {
  if (Array.isArray(value)) {
    if (value.some((entry) => isDialogAnchor(entry, anchor))) {
      if (!value.every(isRecord)) throw new Error(`R13-6B ${anchor}: command array 混入非对象`)
      output.push(value)
    }
    for (const entry of value) collectDirectCommandArrays(entry, anchor, output)
    return
  }
  if (isRecord(value)) for (const child of Object.values(value)) collectDirectCommandArrays(child, anchor, output)
}

function applyTransaction(
  scene: MigrationJson,
  evidence: PalBlackScreenTransactionEvidence,
): void {
  const candidates: Array<Array<Record<string, unknown>>> = []
  collectDirectCommandArrays(scene, evidence.dialogAnchor, candidates)
  if (candidates.length !== 1)
    throw new Error(
      `R13-6B ${evidence.holdAddress}/${evidence.dialogAnchor}: ` +
        `canonical command array 数量 ${candidates.length}，期望 1`,
    )
  const commands = candidates[0]!
  const existingHold = commands.findIndex(
    (command) => command.kind === 'holdScreen' && command.token === evidence.token,
  )
  const existingReveal = commands.findIndex(
    (command) => command.kind === 'revealScreen' && command.token === evidence.token,
  )
  if (existingHold >= 0 || existingReveal >= 0) {
    if (existingHold < 0 || existingReveal <= existingHold)
      throw new Error(`R13-6B ${evidence.token}: 已迁移 transaction 不闭合`)
    return
  }
  const dialogIndex = commands.findIndex((command) => isDialogAnchor(command, evidence.dialogAnchor))
  const revealIndex = commands.findIndex(
    (command, index) =>
      index > 0 && command.kind === 'fade' && command.dir === 'in' && command.ms === evidence.inMs,
  )
  if (dialogIndex < 0 || revealIndex < 0)
    throw new Error(`R13-6B ${evidence.token}: 缺 dialog 或源 reveal fade`)
  let holdIndex = -1
  for (let index = revealIndex - 1; index >= 0; index--) {
    const command = commands[index]!
    if (command.kind === 'fade' && command.dir === 'out' && command.ms === evidence.outMs) {
      holdIndex = index
      break
    }
  }
  if (holdIndex < 0)
    throw new Error(`R13-6B ${evidence.token}: 缺源 hold fade(${evidence.outMs}ms)`)
  commands.splice(revealIndex, 1, { kind: 'revealScreen', token: evidence.token })
  commands.splice(holdIndex + 1, 0, {
    kind: 'holdScreen',
    color: 'black',
    token: evidence.token,
  })
}

/**
 * 在 R13-6A 已发布 canonical 上物化四个 0x76 transaction。输入/输出均为纯快照，
 * 找不到唯一 hold/reveal 证据时 fail-closed，绝不猜测恢复点。
 */
export function applyPalR13SixBSceneOverlays(
  input: ReadonlyMap<string, MigrationJson>,
): Map<string, MigrationJson> {
  const output = new Map(input)
  const cloned = new Map<string, MigrationJson>()
  for (const evidence of PAL_BLACK_SCREEN_TRANSACTION_EVIDENCE) {
    let scene = cloned.get(evidence.scenePath)
    if (!scene) {
      const source = output.get(evidence.scenePath)
      if (source === undefined) throw new Error(`R13-6B 缺 ${evidence.scenePath}`)
      scene = structuredClone(source)
      cloned.set(evidence.scenePath, scene)
      output.set(evidence.scenePath, scene)
    }
    applyTransaction(scene, evidence)
  }
  return output
}
