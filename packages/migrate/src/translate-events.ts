/**
 * M3a · 原版事件字节码 → 结构化脚本 AST 翻译器(线性层 + 门模式)。
 * 设计:docs/phase2/foundation/script-model-m3-design.md §3;编码事实(2026-07-02 实测):
 *  - 具名 op:showDialog{messageIndex,text} / loadScene{sceneId 0-based} / goto{to,frameDelay}
 *    / giveItem{itemId,count(0=1)} / setDialogStyle{Bottom,Top,Narration,Center} /
 *    end{} | end{advance:true} | end{reset:true,resetTo:<地址>,idleFrames}
 *  - 其余是 raw{opcode,operands};label = "L_<地址>",跳转目标必有 label。
 * 分层规则:
 *  - 线性直译查表;连续 showDialog 成组(尾冒号行 = speaker,后续行拼一页,文本进 locale);
 *  - 门模式:loadScene ± setPartyPos ± fadeOut(窗口 ≤3 命令)折叠成单条 loadScene{scene,pos};
 *  - end.advance/reset → 多段 stages(原版触发入口推进的 clean 版);
 *  - goto:frameDelay→wait,目标内联续走(环 → 截断);
 *  - 跳转族或未知 op 只写迁移期 MigrationGap;可达 gap 会在写盘前统一失败,
 *    不得生成可执行占位命令。
 */
import {
  type AssetId,
  type Command,
  type DialogueCue,
  deriveScriptChunk,
  palFrameAnimationAssetId,
  palMusicAssetId,
  palPortraitAssetId,
  palVideoAssetId,
  pixelDeltaToGridDelta,
  pixelToGrid,
  type ScriptChunkV1,
  type ScriptIndexV1,
  type ScriptRef,
  type ScriptStage,
  stableScriptHash,
} from '@type-pal/content'
import {
  DEFAULT_LEGACY_DIALOG_STATE,
  decodeLegacyDialogueLine,
  LEGACY_DIALOG_DEFAULT_SPEED,
  type LegacyDialogueState,
  putLegacyDialogueText,
} from './legacy-dialog.js'
import type { SoundAssetForNum } from './sound-migration.js'
import { resolveSoundAsset } from './sound-migration.js'
import type { SourceCmd } from './source-facts.js'
import {
  FACING_BY_DIR,
  partyPosToGrid,
  ROLE_SLUGS,
  sceneSlug,
  signExtendI16,
} from './source-facts.js'

/** 提取 JSON 的宽字段(SourceCmd 之上,具名 op 的专有字段)。 */
interface Cmd extends SourceCmd {
  messageIndex?: number
  sceneId?: number
  to?: string
  frameDelay?: number
  itemId?: number
  count?: number
  advance?: boolean
  reset?: boolean
  resetTo?: number
  arg0?: number // 对话样式 op 的 operand[0]:top/bottom = 立绘号(wNumCharFace)
  paletteIndex?: number
}

export interface TranslateReport {
  chains: number
  stages: number
  commands: number
  /** 信息性损耗/折叠说明,不是阻塞缺口。 */
  notes: Record<string, number>
  /** 已由一阶段/原引擎真值证明的 no-op。 */
  knownNoOps: Record<string, number>
  knownNoOpDetails: Array<{
    key: string
    sourceAddress?: number
    legacyId?: number
    owner: string
    path: string
  }>
  /** 已映射为 clean 命令的原 opcode 统计。 */
  resolved: Record<string, number>
  /** 无显式 label 但已按 all.json 数组地址解析的目标。 */
  resolvedAddressTargets: { address: number; operation: string }[]
  /** 可达且无法转成 clean 命令的阻塞诊断。 */
  gaps: MigrationGap[]
  /** 因未实现跳转族而截断的段数。 */
  flowCuts: number
  /** 0x6D 场景脚本覆写站点数(post-pass 回填 clean 绑定)。 */
  sceneScriptPatches?: number
}

export function emptyTranslateReport(): TranslateReport {
  return {
    chains: 0,
    stages: 0,
    commands: 0,
    notes: {},
    knownNoOps: {},
    knownNoOpDetails: [],
    resolved: {},
    resolvedAddressTargets: [],
    gaps: [],
    flowCuts: 0,
  }
}

export interface MigrationGap {
  sourceAddress: number
  opcode: number | string
  operands: number[]
  owner: string
  reachable: true
  path: string
  reason: string
}

export interface TranslateCtx {
  /** 全局 label 索引(跨场景/共享段;mapScenesStatic 已建)。 */
  labelAt: Map<string, { cmds: readonly SourceCmd[]; idx: number }>
  /** 源数组下标 → all.json 全局地址;生产迁移由 mapScenesStatic 注入。 */
  sourceAddressAt?: (cmds: readonly SourceCmd[], idx: number) => number | undefined
  /** all.json 原本显式声明的 label;用于记录补全地址索引的命中。 */
  explicitLabels?: ReadonlySet<string>
  /** 当前翻译引用路径,只用于诊断。 */
  pathStack?: string[]
  /** 报告计数按源站点去重,避免同一共享链因多个 owner 被重复翻译而虚高。 */
  knownNoOpSites?: Set<string>
  /** 分支臂记忆化(label|owner|入口对话态 → 已译体;同一游戏over/败臂被数百战斗共享,防重复走+堆爆)。 */
  armMemo?: Map<string, Command[]>
  /** 非 registry 单测路径的 callScript 对话离开态；生产路径由 ScriptRegistry 持有。 */
  dialogueExitMemo?: Map<string, DialogueEntryState>
  /** 在译链栈(label|owner):0x24/25 页目标可自引用,防 translateStages 无限递归。 */
  translating?: Set<string>
  /** B9:0x8A 置位、下一个 0x07 消费 → startBattle.auto(fAutoBattle 语义)。 */
  pendingAuto?: boolean
  /** 文本累积(dlg.<msgIdx> / spk.<名>);IO 壳并入工程 locale。 */
  locale: Record<string, string>
  report: TranslateReport
  /**
   * 所有旧大世界 spriteNum → 精灵 id 的唯一解析口(0x65/0x1A/0x98；
   * mapScenesStatic 注入:角色本体精灵优先,未注册的补登记 sprite-<num>)。
   * 非空引用缺省会记阻塞 gap。
   */
  spriteIdForNum?: (num: number) => string | undefined
  /** 迁移边界内把旧 mapNum 解析为工程稳定 map id。 */
  mapIdForNum?: (num: number) => string
  /** 旧 sound chunk 到已登记 AssetId；生产迁移用它把空 chunk 转为无命令。 */
  soundAssetForNum?: SoundAssetForNum
  /** M3 分片注册表；生产迁移必须提供，缺省仅供旧 inline 单测/手工窄工具。 */
  registry?: ScriptRegistry
}

interface DialogueEntryState {
  slot?: DialogueCue['slot']
  portrait?: DialogueCue['portrait']
  activeSpeaker?: string
  speakerAwaitingBody?: boolean
  color?: LegacyDialogueState['color']
  speed?: number
}

interface RegisteredScript {
  ref: ScriptRef
  body: Command[]
  status: 'translating' | 'done'
  dialogueExit?: DialogueEntryState
}

export interface ScriptRegistryOutput {
  index: ScriptIndexV1
  chunks: Record<string, ScriptChunkV1>
}

function palMusicCommand(track: number): Command {
  return track <= 0 ? { kind: 'stopMusic' } : { kind: 'playMusic', asset: palMusicAssetId(track) }
}

/** 翻译期图注册表：同一 label+owner+入口对话态只翻译一次，环只留下 O(1) ref。 */
export class ScriptRegistry {
  private readonly scripts = new Map<string, RegisteredScript>()

  constructor(
    private readonly sceneFor: (label: string, owner: string | undefined) => string | undefined,
    readonly shards = { shared: 16, global: {} as Record<string, number> },
    private readonly sharedGroupFor: (label: string) => string = (label) =>
      label.replace(/^L_/, 'L-'),
  ) {}

  private idFor(label: string, owner: string | undefined, state: DialogueEntryState): string {
    const scene = this.sceneFor(label, owner)
    const scope = scene ? `scene/${scene}` : `shared/${this.sharedGroupFor(label)}`
    const summary = JSON.stringify({
      slot: state.slot ?? '',
      portrait: state.portrait ?? null,
      speaker: state.activeSpeaker ?? '',
      awaiting: state.speakerAwaitingBody ?? false,
      color: state.color ?? DEFAULT_LEGACY_DIALOG_STATE.color,
      speed: state.speed ?? DEFAULT_LEGACY_DIALOG_STATE.speed,
    })
    const stateId = stableScriptHash(summary).toString(16).padStart(8, '0')
    return `${scope}/${label.replace(/^L_/, 'L-')}/${owner ?? 'none'}/d-${stateId}`
  }

  private refForId(id: string): ScriptRef {
    const chunk = deriveScriptChunk(id, this.shards)
    if (!chunk) throw new Error(`ScriptRegistry: 无法为稳定 id 推导 chunk: ${id}`)
    return { chunk, id }
  }

  registerTarget(
    label: string,
    owner: string | undefined,
    state: DialogueEntryState,
    ctx: TranslateCtx,
  ): ScriptRef {
    const id = this.idFor(label, owner, state)
    const hit = this.scripts.get(id)
    if (hit) return hit.ref
    const ref = this.refForId(id)
    const record: RegisteredScript = { ref, body: [], status: 'translating' }
    this.scripts.set(id, record)
    const target = ctx.labelAt.get(label)
    if (!target) {
      recordGap(ctx, {
        sourceAddress: addressFromLabel(label) ?? -1,
        opcode: 'target',
        operands: [],
        owner: owner ?? 'scene',
        reason: `脚本引用目标缺失 ${label}`,
      })
    } else {
      recordResolvedAddressTarget(ctx, label, target)
      ctx.pathStack ??= []
      ctx.pathStack.push(`${id} -> ${label}`)
      try {
        const translated = walkBody(target.cmds, target.idx, owner, ctx, 0, state)
        if (translated.term.kind === 'advance' || translated.term.kind === 'reset')
          note(ctx, '引用目标含段转移(按 end 处理)')
        record.body = foldBattleConfig(foldDoorPattern(translated.body))
        record.dialogueExit = translated.dialogueState
      } finally {
        ctx.pathStack.pop()
      }
    }
    record.status = 'done'
    return ref
  }

  registerRoot(id: string, body: Command[]): ScriptRef {
    const ref = this.refForId(id)
    const hit = this.scripts.get(id)
    if (hit) {
      if (JSON.stringify(hit.body) !== JSON.stringify(body))
        throw new Error(`ScriptRegistry: root id 冲突 ${id}`)
      return hit.ref
    }
    this.scripts.set(id, { ref, body, status: 'done' })
    return ref
  }

  commandBodies(): Command[][] {
    return [...this.scripts.values()].map((x) => x.body)
  }

  bodyFor(id: string): Command[] | undefined {
    return this.scripts.get(id)?.body
  }

  dialogueExitFor(ref: ScriptRef): DialogueEntryState | undefined {
    return this.scripts.get(ref.id)?.dialogueExit
  }

  build(): ScriptRegistryOutput {
    const grouped = new Map<string, Record<string, Command[]>>()
    for (const { ref, body, status } of this.scripts.values()) {
      if (status !== 'done') throw new Error(`ScriptRegistry: 未完成脚本 ${ref.id}`)
      const scripts = grouped.get(ref.chunk) ?? {}
      scripts[ref.id] = body
      grouped.set(ref.chunk, scripts)
    }
    const chunks: Record<string, ScriptChunkV1> = {}
    for (const [chunkId, scripts] of [...grouped].sort(([a], [b]) => a.localeCompare(b))) {
      const imports = new Set<string>()
      const visit = (node: unknown): void => {
        if (Array.isArray(node)) {
          for (const value of node) visit(value)
          return
        }
        if (!node || typeof node !== 'object') return
        const value = node as Record<string, unknown>
        if ((value.kind === 'callScript' || value.kind === 'jumpScript') && value.ref) {
          const ref = value.ref as ScriptRef
          if (ref.chunk !== chunkId) imports.add(ref.chunk)
        }
        for (const child of Object.values(value)) visit(child)
      }
      visit(scripts)
      chunks[chunkId] = {
        version: 1,
        id: chunkId,
        ...(imports.size ? { imports: [...imports].sort() } : {}),
        scripts,
      }
    }
    const metas: ScriptIndexV1['chunks'] = {}
    for (const [id, chunk] of Object.entries(chunks)) {
      const json = JSON.stringify(chunk)
      const bytes = new TextEncoder().encode(json).byteLength
      if (bytes >= 1024 * 1024) throw new Error(`ScriptRegistry: chunk ${id} ${bytes}B 超过 1MiB`)
      metas[id] = {
        path: `chunks/${id}.json`,
        bytes,
        hash: stableScriptHash(json).toString(16).padStart(8, '0'),
        ...(chunk.imports?.length ? { imports: chunk.imports } : {}),
      }
    }
    return { index: { version: 1, shards: this.shards, chunks: metas }, chunks }
  }
}

/** 尚未结构化的跳转族(census 全清单减去已结构化:0x06/07/0A/1E/20/58/74/79/83/86/94)。
 * 命中即截断本段,不猜控制流。 */
const JUMP_FAMILY = new Set([
  0x2e, 0x33, 0x34, 0x38, 0x3a, 0x5d, 0x5e, 0x61, 0x64, 0x68, 0x81, 0x84, 0x91, 0x95, 0x9c, 0x9e,
  0xa2,
])
/** 原版速度码 → WalkSpeed。 */
const SPEED: Record<number, 'slow' | 'normal' | 'fast' | 'run'> = {
  2: 'slow',
  3: 'normal',
  4: 'fast',
  8: 'run',
}
/** 原版 giveItem-0 数据 bug 修正表(扬州宝物屋 3 箱「获得X」后 giveItem 0 给空;
 *  键 = 前句 showDialog 的 MSG.DAT 下标,值 = 应给物品号。一阶段 event-system
 *  patchGiveItemZeroBugs 同表;reforge 无运行时 patch 层,烘在翻译期,产物即干净)。 */
const GIVEITEM_ZERO_FIXUP: Record<number, number> = {
  12256: 164, // 「获得九节鞭」→ 九截鞭
  12347: 103, // 「获得紫青玉蓉膏」→ 紫菁玉蓉膏
  12408: 116, // 「获得腐尸肉」→ 尸腐肉
}

/** 分支臂内联深度上限(臂内再遇跳转的嵌套;更深 → MigrationGap,M3c 提共享脚本)。
 *  3→6(2026-07-12):17 条"分支臂不可内联"= 15 个独立段各 1-2 引用(非高频共享),
 *  depth 3 截断过早;提到 6 让多数深层臂闭合。MAX_ARM_BODY=200 仍兜底防组合爆炸。 */
const MAX_ARM_DEPTH = 6
/** 单臂命令上限(超限 → MigrationGap;防组合爆炸,如层层嵌套的战斗败臂)。 */
const MAX_ARM_BODY = 200
/** 每逻辑帧 40ms(一阶段主循环 tick;waitFrames/goto frameDelay 换算)。 */
const FRAME_MS = 40
/** 段体命令上限(防御:超长 cutscene 截断上报,不静默膨胀)。 */
const MAX_BODY = 800

const STYLE_SLOT: Record<string, DialogueCue['slot'] | undefined> = {
  setDialogStyleBottom: undefined, // bottom = 缺省,不写字段
  setDialogStyleTop: 'top',
  setDialogStyleNarration: 'narration',
  setDialogStyleCenter: 'center', // M3b:原版居中窗(开场独白偏上大字),独立 center slot(≠底部叙述窗)
}

/** 说话人行:以全角/半角冒号结尾(原版约定;DialogueCue 显式 speaker 字段的来源)。 */
const SPEAKER_RE = /[∶:：]\s*$/

interface WalkTerm {
  kind: 'end' | 'advance' | 'reset' | 'cut'
  resetTo?: string // L_<addr>
  /** advance:下一段起点(同数组下标)。 */
  nextIdx?: number
}

/**
 * 翻译一条触发/进场链 → stages。
 * @param ownerEntity 0x0F/0x14(无目标操作数)作用的实体 id;onEnter 链传 undefined。
 */
export function translateStages(
  startLabel: string,
  ownerEntity: string | undefined,
  ctx: TranslateCtx,
): ScriptStage[] | undefined {
  const start0 = ctx.labelAt.get(startLabel)
  if (!start0) {
    recordGap(ctx, {
      sourceAddress: addressFromLabel(startLabel) ?? -1,
      opcode: 'target',
      operands: [],
      owner: ownerEntity ?? 'scene',
      reason: `脚本根目标缺失 ${startLabel}`,
    })
    return undefined
  }
  const startAt = start0 // 收窄后常量(闭包内 TS 不保 start0 非空)
  recordResolvedAddressTarget(ctx, startLabel, startAt)
  const tkey = `${startLabel}|${ownerEntity ?? ''}`
  ctx.translating ??= new Set()
  const inFlight = ctx.translating
  if (inFlight.has(tkey)) {
    note(ctx, '链自引用截断(0x24/25 环)')
    return undefined
  }
  inFlight.add(tkey)
  ctx.pathStack ??= []
  ctx.pathStack.push(`${startLabel}@${ownerEntity ?? 'scene'}`)
  try {
    return translateStagesInner()
  } finally {
    ctx.pathStack.pop()
    inFlight.delete(tkey)
  }

  function translateStagesInner(): ScriptStage[] | undefined {
    ctx.report.chains++

    const stages: (ScriptStage & { _next?: string })[] = []
    const idxByLabel = new Map<string, number>()
    /** 段位置去重:goto 回跳 + end.advance 会产生无 label 的重复段位置 → 无限段(scene23 堆爆根因)。 */
    const seenPos = new Set<string>()
    const arrId = new Map<readonly SourceCmd[], number>()
    const posKey = (cmds: readonly SourceCmd[], idx: number): string => {
      let id = arrId.get(cmds)
      if (id === undefined) {
        id = arrId.size
        arrId.set(cmds, id)
      }
      return `${id}:${idx}`
    }
    /** 每链命令总预算(超限截断上报;防病理链膨胀)。 */
    let budget = 4000
    /** 待走队列:reset 目标(按 label);advance 续段在主循环内联(保证 index+1 相邻)。 */
    const queue: string[] = []

    let cursor: { cmds: readonly SourceCmd[]; idx: number; label?: string } | undefined = {
      ...startAt,
      label: startLabel,
    }
    while (cursor) {
      const stageIdx = stages.length
      const pk = posKey(cursor.cmds, cursor.idx)
      if (seenPos.has(pk) || budget <= 0) {
        if (budget <= 0 && stages.length) note(ctx, '链命令预算截断')
        cursor = nextFromQueue()
        continue
      }
      seenPos.add(pk)
      if (cursor.label) {
        if (idxByLabel.has(cursor.label)) {
          cursor = nextFromQueue()
          continue
        }
        idxByLabel.set(cursor.label, stageIdx)
      }
      const { body, term } = walkBody(cursor.cmds, cursor.idx, ownerEntity, ctx)
      budget -= body.length
      ctx.report.stages++
      ctx.report.commands += body.length
      if (term.kind === 'advance' && term.nextIdx !== undefined) {
        stages.push({ body, next: 'advance' })
        const nextLabel = (cursor.cmds[term.nextIdx] as Cmd | undefined)?.label
        cursor = { cmds: cursor.cmds, idx: term.nextIdx, label: nextLabel }
      } else if (term.kind === 'reset' && term.resetTo) {
        stages.push({ body, next: -1, _next: term.resetTo } as ScriptStage & { _next: string })
        if (!idxByLabel.has(term.resetTo)) queue.push(term.resetTo)
        cursor = nextFromQueue()
      } else {
        stages.push({ body })
        cursor = nextFromQueue()
      }
    }

    // 解析 reset 目标 → 段下标(目标已入队走过;缺 = 数据异常,回 0 并上报)
    for (const st of stages) {
      if (st._next !== undefined) {
        const target = idxByLabel.get(st._next)
        if (target === undefined) {
          note(ctx, `reset 目标不可达 ${st._next}`)
          st.next = 0
        } else st.next = target
        delete st._next
      }
    }
    return stages

    function nextFromQueue() {
      const label = queue.shift()
      if (!label) return undefined
      const at = ctx.labelAt.get(label)
      return at ? { ...at, label } : undefined
    }
  }
}

function addressFromLabel(label: string | undefined): number | undefined {
  const match = label ? /^L_(\d+)$/.exec(label) : null
  return match?.[1] === undefined ? undefined : Number(match[1])
}

function sourceAddressAt(ctx: TranslateCtx, cmds: readonly SourceCmd[], idx: number): number {
  const injected = ctx.sourceAddressAt?.(cmds, idx)
  if (injected !== undefined) return injected
  for (let i = idx; i >= 0; i--) {
    const base = addressFromLabel(cmds[i]?.label)
    if (base !== undefined) return base + idx - i
  }
  return idx
}

function operationOf(command: SourceCmd | undefined): string {
  if (!command) return 'missing'
  if (command.op === 'raw') return `raw:0x${(command.opcode ?? 0).toString(16)}`
  return command.op ?? 'unknown'
}

function recordResolvedAddressTarget(
  ctx: TranslateCtx,
  label: string,
  target: { cmds: readonly SourceCmd[]; idx: number },
): void {
  if (!ctx.explicitLabels || ctx.explicitLabels.has(label)) return
  const address = addressFromLabel(label)
  if (address === undefined || ctx.report.resolvedAddressTargets.some((x) => x.address === address))
    return
  ctx.report.resolvedAddressTargets.push({
    address,
    operation: operationOf(target.cmds[target.idx]),
  })
}

function recordGap(
  ctx: TranslateCtx,
  gap: Omit<MigrationGap, 'reachable' | 'path'> & { path?: string },
): void {
  const full: MigrationGap = {
    ...gap,
    reachable: true,
    path: gap.path ?? ctx.pathStack?.join(' -> ') ?? 'unknown-root',
  }
  const key = JSON.stringify(full)
  if (!ctx.report.gaps.some((existing) => JSON.stringify(existing) === key))
    ctx.report.gaps.push(full)
}

export function recordMigrationGap(
  ctx: TranslateCtx,
  gap: Omit<MigrationGap, 'reachable' | 'path'> & { path?: string },
): void {
  recordGap(ctx, gap)
}

export function assertNoMigrationGaps(report: TranslateReport): void {
  if (report.gaps.length === 0 && report.flowCuts === 0) return
  const details = report.gaps
    .slice(0, 20)
    .map(
      (gap) =>
        `@${gap.sourceAddress} opcode=${String(gap.opcode)} operands=${JSON.stringify(gap.operands)} owner=${gap.owner} path=${gap.path}: ${gap.reason}`,
    )
    .join('\n')
  throw new Error(
    `迁移存在 ${report.gaps.length} 个可达 MigrationGap / ${report.flowCuts} 个 flow cut,` +
      `拒绝生成工程${details ? `:\n${details}` : ''}`,
  )
}

function note(ctx: TranslateCtx, key: string): void {
  ctx.report.notes[key] = (ctx.report.notes[key] ?? 0) + 1
}

function knownNoOp(
  ctx: TranslateCtx,
  key: string,
  sourceAddress?: number,
  detail?: { legacyId?: number; owner?: string },
): void {
  ctx.knownNoOpSites ??= new Set()
  const site = `${key}@${sourceAddress ?? 'unknown'}`
  if (ctx.knownNoOpSites.has(site)) return
  ctx.knownNoOpSites.add(site)
  ctx.report.knownNoOps[key] = (ctx.report.knownNoOps[key] ?? 0) + 1
  ctx.report.knownNoOpDetails.push({
    key,
    ...(sourceAddress === undefined ? {} : { sourceAddress }),
    ...(detail?.legacyId === undefined ? {} : { legacyId: detail.legacyId }),
    owner: detail?.owner ?? 'unknown',
    path: ctx.pathStack?.join(' > ') ?? '',
  })
}

function resolved(ctx: TranslateCtx, key: string): void {
  ctx.report.resolved[key] = (ctx.report.resolved[key] ?? 0) + 1
}

/** 走一段体:从 idx 到 end 变体/流截断。 */
function walkBody(
  cmds: readonly SourceCmd[],
  startIdx: number,
  owner: string | undefined,
  ctx: TranslateCtx,
  depth = 0,
  entryState: DialogueEntryState = {},
): { body: Command[]; term: WalkTerm; dialogueState: DialogueEntryState } {
  const body: Command[] = []
  let lastRngChunk = 0 // 0x36 只在迁移边界保存旧段号，0x37 立即映射稳定帧动画 AssetId。
  let slot: DialogueCue['slot'] | undefined = entryState.slot
  /** 当前立绘(对话样式 op 的 arg0 = RGM 立绘号;top→左 / bottom→右;0/narration = 无)。 */
  let portrait: DialogueCue['portrait'] = entryState.portrait
  /** 姓名牌属于整条 walkBody；同 slot 的 flush/clearDialog 不应把梦话说话人抹掉。 */
  let activeSpeaker: string | undefined = entryState.activeSpeaker
  let speakerAwaitingBody = entryState.speakerAwaitingBody ?? false
  let dialogState: LegacyDialogueState = {
    color: entryState.color ?? DEFAULT_LEGACY_DIALOG_STATE.color,
    speed: entryState.speed ?? DEFAULT_LEGACY_DIALOG_STATE.speed,
  }
  /** 对话批:待成组的 showDialog 行。 */
  let batch: { msgIdx: number; text: string }[] = []
  const visited = new Set<number>() // goto 环保护(同数组按下标;跨数组由 steps 总上限兜底)
  let steps = 0
  let at = { cmds, idx: startIdx }

  const dialogueSnapshot = (): DialogueEntryState => ({
    slot,
    portrait,
    activeSpeaker,
    speakerAwaitingBody,
    color: dialogState.color,
    speed: dialogState.speed,
  })
  const applyDialogueState = (state: DialogueEntryState): void => {
    slot = state.slot
    portrait = state.portrait
    activeSpeaker = state.activeSpeaker
    speakerAwaitingBody = state.speakerAwaitingBody ?? false
    dialogState = {
      color: state.color ?? DEFAULT_LEGACY_DIALOG_STATE.color,
      speed: state.speed ?? DEFAULT_LEGACY_DIALOG_STATE.speed,
    }
  }

  const flush = () => {
    if (!batch.length) return
    // 成组:尾冒号行更新 speaker；正文每条 showDialog 独立成 row，~ 在当前 row 后切 cue。
    let parts: { text: string; speed: number }[] = []
    let cursorFrame: DialogueCue['cursorFrame']
    const emit = (autoAdvance?: number) => {
      if (!parts.length) return
      const cue: DialogueCue = {
        rows: parts.map((part) => ({
          text: part.text,
          ...(part.speed !== LEGACY_DIALOG_DEFAULT_SPEED ? { speed: part.speed } : {}),
        })),
      }
      if (activeSpeaker) {
        const sk = `spk.${activeSpeaker}`
        ctx.locale[sk] = activeSpeaker
        cue.speaker = sk
        speakerAwaitingBody = false
      }
      if (slot) cue.slot = slot
      if (portrait) cue.portrait = portrait
      if (cursorFrame !== undefined) cue.cursorFrame = cursorFrame
      if (autoAdvance !== undefined) cue.autoAdvance = autoAdvance
      body.push({ kind: 'dialog', cue })
      parts = []
      cursorFrame = undefined
    }
    for (const l of batch) {
      const decoded = decodeLegacyDialogueLine(l.text, dialogState, slot ?? 'bottom')
      if (SPEAKER_RE.test(decoded.plainText)) {
        emit()
        if (speakerAwaitingBody) note(ctx, '悬空说话人行(无正文)')
        // 一阶段 title 走独立绘制路径，不改变颜色/速度状态。
        activeSpeaker = decoded.plainText.replace(SPEAKER_RE, '')
        speakerAwaitingBody = true
      } else {
        dialogState = decoded.state
        const key = putLegacyDialogueText(ctx.locale, l.msgIdx, l.text, decoded.text)
        parts.push({ text: key, speed: decoded.speed })
        if (decoded.cursorFrame !== undefined) cursorFrame = decoded.cursorFrame
        if (decoded.endedWithTilde) emit(decoded.autoAdvance)
      }
    }
    emit()
    batch = []
  }

  while (at.idx < at.cmds.length && body.length < MAX_BODY && steps++ < MAX_BODY * 4) {
    const c = at.cmds[at.idx] as Cmd
    const op = c.op

    // ── end 族:段终 ──
    if (op === 'end') {
      flush()
      if (c.advance)
        return {
          body,
          term: { kind: 'advance', nextIdx: at.idx + 1 },
          dialogueState: dialogueSnapshot(),
        }
      if (c.reset)
        return {
          body,
          term: { kind: 'reset', resetTo: `L_${c.resetTo}` },
          dialogueState: dialogueSnapshot(),
        }
      return { body, term: { kind: 'end' }, dialogueState: dialogueSnapshot() }
    }
    // ── goto:延迟 → wait;目标内联续走(环 → 截断)──
    if (op === 'goto') {
      flush()
      if ((c.frameDelay ?? 0) > 0) body.push({ kind: 'wait', ms: c.frameDelay! * FRAME_MS })
      // 跨库目标(带 "shared#" 前缀)以前显式截断(0x4C 海内联会展开 49.8 万条);
      // B8 后 0x4C 段翻成单条 chasePlayer 即终止,海已排干 → 放开正常内联(环/超长截断兜底)。
      // 提取器把跨场景共享目标改写为 "shared#L_X"(slice.ts rewriteJumps);索引用裸名 → 剥前缀查
      const toName = (c.to ?? '').split('#').pop() ?? ''
      if (ctx.registry) {
        if (!toName) {
          body.push({ kind: 'stopScript' })
        } else {
          const ref = ctx.registry.registerTarget(
            toName,
            owner,
            {
              slot,
              portrait,
              activeSpeaker,
              speakerAwaitingBody,
              color: dialogState.color,
              speed: dialogState.speed,
            },
            ctx,
          )
          body.push({ kind: 'jumpScript', ref, ...(owner ? { self: owner } : {}) })
        }
        return { body, term: { kind: 'cut' }, dialogueState: dialogueSnapshot() }
      }
      const target = ctx.labelAt.get(toName)
      if (!target || (target.cmds === at.cmds && visited.has(target.idx))) {
        note(ctx, target ? 'goto 环截断' : `goto 目标缺失`)
        ctx.report.flowCuts++
        return { body, term: { kind: 'cut' }, dialogueState: dialogueSnapshot() }
      }
      visited.add(at.idx)
      at = { cmds: target.cmds, idx: target.idx }
      continue
    }
    if (op === 'showDialog') {
      batch.push({ msgIdx: c.messageIndex ?? -1, text: c.text ?? '' })
      at = { cmds: at.cmds, idx: at.idx + 1 }
      continue
    }
    if (op && op in STYLE_SLOT) {
      flush() // 先出旧批(用旧 slot/portrait),再切样式
      if (speakerAwaitingBody) note(ctx, '悬空说话人行(无正文)')
      activeSpeaker = undefined
      speakerAwaitingBody = false
      slot = STYLE_SLOT[op]
      // PAL_StartDialog 重置当前字体色，但脚本级 iDelay 继续保留。
      dialogState = { ...dialogState, color: 'default' }
      // 立绘:top(0x3C)/bottom(0x3D) 的 arg0 = wNumCharFace(RGM 立绘号);sdlpal script.c:3402/3412。
      // top→左 / bottom→右(reforge POS 已定位);center/narration 无立绘(arg0 是颜色,清)。
      const face = op === 'setDialogStyleTop' || op === 'setDialogStyleBottom' ? (c.arg0 ?? 0) : 0
      portrait =
        face > 0
          ? {
              asset: palPortraitAssetId(face),
              side: op === 'setDialogStyleTop' ? 'left' : 'right',
            }
          : undefined
      at = { cmds: at.cmds, idx: at.idx + 1 }
      continue
    }
    if (op === 'loadScene') {
      flush()
      // loadScene operand 1-based(sdlpal rgScene[wNumScene-1])→ 0-based scene index,对齐 sceneSlug/sc.sceneId 命名
      body.push({ kind: 'loadScene', scene: sceneSlug(Math.max(0, (c.sceneId ?? 1) - 1)) })
      at = { cmds: at.cmds, idx: at.idx + 1 }
      continue
    }
    if (op === 'giveItem') {
      // 原版数据 bug 烘焙(扬州宝物屋 3 箱:「获得X」提示后 giveItem 0 给空;一阶段修在
      // 运行时 patchGiveItemZeroBugs,reforge 无运行时 patch 层 → 翻译期按前句 MSG 下标补真 id)
      const fix =
        c.itemId === 0 ? GIVEITEM_ZERO_FIXUP[batch[batch.length - 1]?.msgIdx ?? -1] : undefined
      flush()
      const cnt = c.count && c.count > 1 ? c.count : undefined
      body.push({
        kind: 'giveItem',
        itemId: String(fix ?? c.itemId),
        ...(cnt ? { count: cnt } : {}),
      })
      at = { cmds: at.cmds, idx: at.idx + 1 }
      continue
    }
    if (op === 'setPalette') {
      // 已知视觉缺口,不属于未知命令:二阶段必须用 RGBA 全屏色彩 profile 重写,严禁把
      // paletteId/index 重新带回脚本 schema。这里只记迁移报告,不生成可执行旧节点。
      note(ctx, `known-deferred:setPalette(${c.paletteIndex ?? 0})`)
      at = { cmds: at.cmds, idx: at.idx + 1 }
      continue
    }

    // ── raw 表 ──
    if (op === 'raw' && typeof c.opcode === 'number') {
      const o = c.operands ?? []
      const oc = c.opcode
      const push = (cmd: Command | undefined) => {
        flush()
        if (cmd) body.push(cmd)
      }
      const gap = (reason: string, opcode: number | string = oc, operands = o) => {
        flush()
        recordGap(ctx, {
          sourceAddress: sourceAddressAt(ctx, at.cmds, at.idx),
          opcode,
          operands: [...operands],
          owner: owner ?? 'scene',
          reason,
        })
      }
      // 对象引用:操作数 0xFFFF = 脚本属主"自己";其余是 **1-based 全局**对象号
      // (script.c:631 `pCurrent = &lprgEventObject[operand-1]`;一阶段 resolveGlobalEventObject
      // 同语义)。提取的 eo.id 是 0-based 全局累加(scene1=0..31,scene2=32..),故 -1 即得
      // e<id>。⚠ 曾直译 e${v} 全体 +1 错位(2026-07-03 用户报,考证见 opcode 缺口审计)。
      const entRef = (v: number): string | undefined => (v === 0xffff ? owner : `e${v - 1}`)
      // pCurrent 式引用:0 也是"自己"(script.c:op0==0 → pEvtObj)
      const pcRef = (v: number): string | undefined =>
        v === 0 || v === 0xffff ? owner : `e${v - 1}`
      /** 跳走臂内联:跳转目标链整段翻成 Command[](环/深度超限 → gap)。
       *  臂尾一律补 stopScript:原版跳转命中后链一路跑到 END 即整个脚本结束,臂跑完
       *  绝不落穿回父体(曾漏 → 概率门/确认门全废:then=[] 空臂照跑后续 = 21% 掉落变
       *  100%、选"否"照办事)。addr 0/缺 = 原版跳全局 0 号 END = 当场退,臂就是一条 stop。 */
      const inlineArm = (addr: number | undefined): Command[] => {
        if (!addr) return [{ kind: 'stopScript' }]
        if (ctx.registry) {
          const ref = ctx.registry.registerTarget(
            `L_${addr}`,
            owner,
            {
              slot,
              portrait,
              activeSpeaker,
              speakerAwaitingBody,
              color: dialogState.color,
              speed: dialogState.speed,
            },
            ctx,
          )
          return [{ kind: 'jumpScript', ref, ...(owner ? { self: owner } : {}) }]
        }
        const memoKey = `L_${addr}|${owner ?? ''}|${JSON.stringify(dialogueSnapshot())}`
        ctx.armMemo ??= new Map()
        const memo = ctx.armMemo
        const hit = memo.get(memoKey)
        if (hit) return hit
        const target = ctx.labelAt.get(`L_${addr}`)
        if (!target || depth >= MAX_ARM_DEPTH) {
          gap(target ? '分支臂深度截断' : `分支臂目标缺失 L_${addr}`)
          return [{ kind: 'stopScript' }]
        }
        memo.set(memoKey, []) // 先占位:环(臂内再跳回自己)拿到空臂而非无限递归
        const r = walkBody(target.cmds, target.idx, owner, ctx, depth + 1, dialogueSnapshot())
        if (r.term.kind === 'advance' || r.term.kind === 'reset')
          note(ctx, '分支臂含段转移(按 end 处理)')
        let arm = r.body
        if (arm.length > MAX_ARM_BODY) {
          // 巡逻互跳网(0x87 anim + walkOneStep + 0x06 概率环)内联爆炸:保留前段走步演出(有界),
          // 弃尾部互跳链 —— 不丢成 opcode-0 哨兵(NPC 交互后走一段;概率循环由演出损耗吸收)
          note(ctx, '分支臂超长截断(保留前段走步)')
          arm = arm.slice(0, MAX_ARM_BODY)
        }
        arm = [...arm, { kind: 'stopScript' }]
        memo.set(memoKey, arm)
        return arm
      }
      if (oc === 0x09) push({ kind: 'wait', ms: Math.max(1, o[0] ?? 1) * FRAME_MS })
      else if (oc === 0x46) {
        push({ kind: 'teleportParty', pos: partyPosToGrid(o[0] ?? 0, o[1] ?? 0, o[2] ?? 0) })
      } else if (oc === 0x15) {
        // 原版(script.c 0x0015)同时写 wPartyDirection 和 rgParty[o[2]].wFrame = dir*3 + o[1]。
        // ⚠ 曾只译 o[0] 朝向、丢 o[1] 姿势帧 —— 全场景 775 处的脚本姿势(开场李逍遥
        // 练武/摊手)全部不显(2026-07-03 用户实测 + 一阶段 partyScriptedFrame oracle 实锤)。
        const gesture = o[1] ?? 0
        const member = o[2] ?? 0
        push({
          kind: 'setPartyFacing',
          facing: FACING_BY_DIR[o[0] ?? 0] ?? 'down',
          ...(gesture ? { gesture } : {}), // 0 = 站立帧,省略 → 运行时清脚本姿势
          ...(member ? { member } : {}),
        })
      } else if (oc === 0x9a) {
        // 0x9A 批量设实体状态(script.c:2756):全局对象号区间 [op0,op1] 全设 sState=op2。
        // 展开成实体 id 数组(e<号−1>;杜绝下标式身份);区间钳 512 防病理输入。
        const from = o[0] ?? 0
        const to = Math.min(o[1] ?? from, from + 511)
        const entities: string[] = []
        for (let v = from; v <= to; v++) entities.push(`e${v - 1}`)
        push({ kind: 'setMultiEntityState', entities, state: signExtendI16(o[2] ?? 0) })
      } else if (oc === 0x53) {
        push({ kind: 'setAmbience', ambience: 'day' }) // 0x53 use day palette(script.c:1803)
      } else if (oc === 0x54) {
        push({ kind: 'setAmbience', ambience: 'night' }) // 0x54 use night palette(script.c:1810)
      } else if (oc === 0x9b) {
        push(undefined) // 0x9B fade-to-scene:sdlpal 自认 FIXME wrong(script.c:2769),no-op
      } else if (oc === 0x08) {
        push(undefined) // 0x08 触发入口推进(script.c:3335;stage 推进体系已承担),NOP
      } else if (oc === 0x77) {
        push({ kind: 'stopMusic' }) // 0x77 停当前音乐(script.c:2215)
      } else if (oc === 0xa3) {
        push(palMusicCommand(o[1] ?? 0)) // 0xA3 CD 音轨 → 回退 RIX 曲 op1(script.c:3023)
      } else if (oc === 0x85) {
        push({ kind: 'wait', ms: (o[0] ?? 0) * 80 }) // 0x85 延时 op0×80ms(script.c:2511)
      } else if (oc === 0x8c) {
        // 0x8C 颜色渐变(script.c:2582):ms=64×(op1×10||10);fFrom(op2)=从纯色渐回场景 → fade in
        push({
          kind: 'fade',
          dir: (o[2] ?? 0) !== 0 ? 'in' : 'out',
          ms: 64 * ((o[1] ?? 0) * 10 || 10),
        })
      } else if (oc === 0x93) {
        // 0x93 SceneFade(script.c:2664):step=int16(op0)||1;ms=ceil(64/|step|)×100;step<0=渐暗
        const step = signExtendI16(o[0] ?? 0) || 1
        push({
          kind: 'fade',
          dir: step < 0 ? 'out' : 'in',
          ms: Math.ceil(64 / Math.abs(step)) * 100,
        })
      } else if (oc === 0x13) {
        // 0x13 实体绝对定位(script.c:716):op0 选择器,op1/op2 原版像素 → pixelToGrid
        const ent = pcRef(o[0] ?? 0)
        if (ent)
          push({
            kind: 'setEntityPos',
            entity: ent,
            pos: { ...pixelToGrid(o[1] ?? 0, o[2] ?? 0), height: 0 },
          })
        else gap('0x13 无属主')
      } else if (oc === 0x12) {
        // 0x12 相对队伍摆位(script.c:706):pCurrent = 队伍绝对像素 + op1/op2 偏移。
        // 清洁重写:偏移 → 格偏移(pixelDeltaToGridDelta 防 round 吞小位移),运行时加队伍格坐标。
        const ent = pcRef(o[0] ?? 0)
        if (ent) {
          const { dcol, drow } = pixelDeltaToGridDelta(
            signExtendI16(o[1] ?? 0),
            signExtendI16(o[2] ?? 0),
          )
          push({ kind: 'setEntityPosRelParty', entity: ent, dcol, drow })
        } else gap('0x12 无属主')
      } else if (oc === 0x35) {
        push({ kind: 'shakeScreen', frames: o[0] ?? 0, level: (o[1] ?? 0) || 4 }) // 0x35 震屏
      } else if (oc === 0x71) {
        push({ kind: 'setScreenWave', level: o[0] ?? 0, progression: signExtendI16(o[1] ?? 0) }) // 0x71 屏波
      } else if (oc === 0x7e) {
        const ent = pcRef(o[0] ?? 0)
        if (ent)
          push({ kind: 'setEntityLayer', entity: ent, layer: signExtendI16(o[1] ?? 0) }) // 0x7E 图层
        else gap('0x7E 无属主')
      } else if (oc === 0x1b && (o[0] ?? 0) !== 0) {
        // 剧情侧全队 HP 变化(镇狱明王战后灵儿恢复 999)。
        push({ kind: 'increaseHpMp', delta: signExtendI16(o[1] ?? 0), pools: 'hp' })
      } else if (oc === 0x1d && (o[0] ?? 0) !== 0) {
        push({ kind: 'increaseHpMp', delta: signExtendI16(o[1] ?? 0) }) // 0x1D 全队增血蓝(op0=1)
      } else if (oc === 0x22 && (o[0] ?? 0) !== 0) {
        push({ kind: 'revivePartyAll', tenths: o[1] ?? 0 }) // 0x22 全队复活(op0=1)
      } else if (oc === 0x55 && (o[1] ?? 0) > 0) {
        push({ kind: 'learnSkill', role: (o[1] ?? 1) - 1, skill: String(o[0] ?? 0) }) // 0x55 学仙术
      } else if (oc === 0x23) {
        push({
          kind: 'unequip',
          role: o[0] ?? 0,
          slot: (o[1] ?? 0) === 0 ? 'all' : (o[1] ?? 1) - 1,
        }) // 0x23 卸装
      } else if (oc === 0x80) {
        push({ kind: 'toggleDayNight', ms: (o[0] ?? 0) === 0 ? 3200 : 800 }) // 0x80 昼夜切换
      } else if (oc === 0x98) {
        // 旧 spriteNum 只在迁移边界消解；空数组仍是合法的“清除跟随者”命令。
        const sourceSprites = [o[0] ?? 0, o[1] ?? 0].filter((x) => x > 0)
        const sprites = sourceSprites.map((spriteNum) => ctx.spriteIdForNum?.(spriteNum))
        if (sprites.every((sprite): sprite is string => typeof sprite === 'string'))
          push({ kind: 'setFollowers', sprites })
        else gap('setFollowers 无精灵注册回调')
      } else if (oc === 0x99) {
        // 0x99 换图:op0=0xFFFF 当前场景即时重载;else 目标场景下次进场
        const mapNum = o[1] ?? 0
        const mapId = ctx.mapIdForNum?.(mapNum) ?? `map-${String(mapNum).padStart(3, '0')}`
        if ((o[0] ?? 0) === 0xffff) push({ kind: 'setSceneMapOverride', mapId })
        else push({ kind: 'setSceneMapOverride', scene: sceneSlug((o[0] ?? 1) - 1), mapId })
      } else if (oc === 0x8f) {
        push({ kind: 'halveMoney' }) // 0x8F 金钱减半
      } else if (oc === 0x36) {
        lastRngChunk = o[0] ?? 0 // 0x36 设当前 RNG 序列号(script.c:1537;配 0x37)
      } else if (oc === 0x37) {
        // 0x37 播帧动画(script.c:1544):帧区间闭合，旧 speed 映射统一 frameRate。
        push({
          kind: 'playFrameAnimation',
          asset: palFrameAnimationAssetId(lastRngChunk),
          startFrame: o[0] ?? 0,
          ...((o[1] ?? 0) > 0 ? { endFrame: o[1] } : {}),
          frameRate: (o[2] ?? 0) > 0 ? o[2]! : 16,
        })
      } else if (oc === 0x76) {
        push(undefined) // 0x76 ShowFBP:全数据 op0=0xFFFF 填黑帧缓冲(reforge 每帧重画天然 no-op)
      } else if (oc === 0x6f) {
        // 0x6F 条件同步(script.c:2115):源对象(op0)状态==int16(op1) → 触发者同设该值。
        // 用现有 branch + entityState 条件 + setEntityState,无需新命令(仙灵岛/村口双态机关门)
        const src = pcRef(o[0] ?? 0)
        const val = signExtendI16(o[1] ?? 0)
        if (src && owner) {
          flush()
          // 条件设值,非跳转:then 跑完落穿回父体后续(不补 stopScript)
          body.push({
            kind: 'branch',
            cond: { kind: 'entityState', entity: src, is: val },
            then: [{ kind: 'setEntityState', entity: owner, state: val }],
          })
        } else gap('0x6F 无属主')
      } else if (oc === 0x49) {
        // script.c:operand0==0 是 no-op；仍 flush，保留 opcode 两侧的对话批次边界。
        if ((o[0] ?? 0) === 0) push(undefined)
        else {
          const ent = entRef(o[0] ?? 0)
          if (ent) push({ kind: 'setEntityState', entity: ent, state: signExtendI16(o[1] ?? 0) })
          else {
            gap('0xFFFF 自指但无属主(onEnter)')
          }
        }
      } else if (oc === 0x0f && owner) {
        flush()
        if ((o[0] ?? 0xffff) !== 0xffff)
          body.push({
            kind: 'setEntityFacing',
            entity: owner,
            facing: FACING_BY_DIR[o[0]!] ?? 'down',
          })
        if ((o[1] ?? 0xffff) !== 0xffff)
          body.push({ kind: 'setEntityFrame', entity: owner, frame: o[1]! })
      } else if (oc === 0x14 && owner) {
        flush()
        body.push({ kind: 'setEntityFacing', entity: owner, facing: 'down' })
        body.push({ kind: 'setEntityFrame', entity: owner, frame: o[0] ?? 0 })
      } else if (oc === 0x16) {
        flush()
        const ent16 = (o[0] ?? 0) !== 0 ? entRef(o[0]!) : undefined
        if (ent16) {
          body.push({
            kind: 'setEntityFacing',
            entity: ent16,
            facing: FACING_BY_DIR[o[1] ?? 0] ?? 'down',
          })
          body.push({ kind: 'setEntityFrame', entity: ent16, frame: o[2] ?? 0 })
        }
      } else if (oc === 0x47) {
        const sound = resolveSoundAsset(o[0], ctx.soundAssetForNum)
        if (sound) push({ kind: 'playSound', asset: sound })
        else {
          flush()
          knownNoOp(ctx, 'playSound.emptyChunk', sourceAddressAt(ctx, at.cmds, at.idx), {
            legacyId: o[0],
            owner,
          })
        }
      } else if (oc === 0x43) push(palMusicCommand(o[0] ?? 0))
      // 0x45/0x4A(原版全局变量「从此以后战斗用 X」)→ 迁移期内部标记 BattleCfgMarker
      // (schema overrideSceneBattle 已退役,不复活):邻战 → fold 进 startBattle 一次性参数;
      // 其余 → bakeAndStrip 烘成 SceneDef 默认(打完 boss 回落场景默认;无持久态)。绝不进最终 content。
      else if (oc === 0x45) push(battleCfgMarker({ musicId: o[0] ?? 0 }))
      else if (oc === 0x4a) push(battleCfgMarker({ fieldId: o[0] ?? 0 }))
      else if (oc === 0x50) push({ kind: 'fade', dir: 'out', ms: ((o[0] ?? 0) || 1) * 600 })
      else if (oc === 0x51) {
        const delay = signExtendI16(o[0] ?? 0)
        push({ kind: 'fade', dir: 'in', ms: (delay > 0 ? delay : 1) * 600 })
      } else if (oc === 0x73) {
        // VIDEO_FadeScreen 每 speed 档 10ms、每档 72 个空间步；独立站点同样必须保留。
        push({ kind: 'ditherScreen', ms: ((o[0] ?? 0) + 1) * 10 * 72 })
      } else if (oc === 0x65) {
        // 换角色大世界精灵(script.c 0x0065:rgwSpriteNum[o[0]] = o[1])。开场李逍遥
        // 练武 627/疯跑 193 全靠它;未迁移时角色只会站桩(2026-07-03 用户实测)。
        // o[2](即时重载 flag)不建模:clean 引擎换精灵即时生效,无"延迟到下次装载"语义。
        const actor = ROLE_SLUGS[o[0] ?? 0]
        const sprite = actor !== undefined ? ctx.spriteIdForNum?.(o[1] ?? 0) : undefined
        if (actor && sprite) push({ kind: 'setActorSprite', actor, sprite })
        else {
          gap(sprite ? `setActorSprite 未知 roleId ${o[0]}` : 'setActorSprite 无精灵注册回调')
        }
      } else if (oc === 0x1a) {
        // 0x1A 改角色 SoA 属性(script.c:834:p[field*6 + role] = val)。全游戏 4 站点全是**形象**字段
        // (成年灵儿 role 1):field 0=头像 / 1=战斗精灵 / 2=大世界精灵 / 64=走路帧。映射成具名
        // setActorAppearance,杜绝下标式身份。field 2 的精灵号 → id(spriteIdForNum);64 走路帧
        // 由新精灵 layout 自带,丢弃。o[2]=0(当前玩家,数据中未出现)→ MigrationGap。
        const roleIdx = (o[2] ?? 0) - 1
        const actor = roleIdx >= 0 ? ROLE_SLUGS[roleIdx] : undefined
        const field = o[0] ?? -1
        const val = o[1] ?? 0
        if (actor && field === 0)
          push(
            val > 0
              ? { kind: 'setActorAppearance', actor, portrait: palPortraitAssetId(val) }
              : undefined,
          )
        else if (actor && field === 1)
          push({ kind: 'setActorAppearance', actor, battleSprite: val })
        else if (actor && field === 2) {
          const sprite = ctx.spriteIdForNum?.(val)
          if (sprite) push({ kind: 'setActorAppearance', actor, spriteId: sprite })
          else gap('0x1A setActorAppearance 无精灵注册回调')
        } else if (actor && field === 64) {
          push(undefined) // 走路帧:新精灵 layout 自带,clean 模型无独立帧数字段
        } else gap(`0x1A 字段 ${field}(非形象/o2=0)`)
      } else if (oc === 0x90 && (o[2] ?? 0) === 0 && (o[1] ?? 0) === 0) {
        // 0x90 剧情侧清 enemy scriptOnTurnStart(六脚蜘蛛 s138 酒剑仙救场后降级):原版敌种绑定的
        // 「说一次」hack。二阶段遭遇绑定后**无需** —— 对话属于这场遭遇的 startBattle,丢弃(no-op)。
        push(undefined)
      } else if (oc === 0x05 || oc === 0x8e) push({ kind: 'clearDialog' })
      else if (oc === 0xa7)
        push(undefined) // noop(备份屏)
      else if (oc === 0x1e && (o[1] ?? 0) === 0)
        push({ kind: 'giveMoney', delta: signExtendI16(o[0] ?? 0) })
      else if (oc === 0x20 && (o[2] ?? 0) === 0) {
        const cnt = (o[1] ?? 0) > 1 ? o[1] : undefined
        push({ kind: 'loseItem', itemId: String(o[0]), ...(cnt ? { count: cnt } : {}) })
      } else if (oc >= 0x0b && oc <= 0x0e) {
        if (owner)
          push({ kind: 'stepEntity', entity: owner, dir: FACING_BY_DIR[oc - 0x0b] ?? 'down' })
        else gap('单步无属主')
      } else if (oc === 0x10 || oc === 0x11 || oc === 0x7c || oc === 0x82) {
        const sp = oc === 0x11 ? 2 : oc === 0x10 ? 3 : oc === 0x7c ? 4 : 8
        if (owner)
          push({
            kind: 'moveEntity',
            entity: owner,
            to: partyPosToGrid(o[0] ?? 0, o[1] ?? 0, o[2] ?? 0),
            speed: SPEED[sp]!,
          })
        else gap('walkTo 无属主')
      } else if (oc === 0x70 || oc === 0x7a || oc === 0x7b) {
        const sp = oc === 0x70 ? 2 : oc === 0x7a ? 4 : 8
        push({
          kind: 'moveParty',
          to: partyPosToGrid(o[0] ?? 0, o[1] ?? 0, o[2] ?? 0),
          speed: SPEED[sp]!,
        })
      } else if (oc === 0x75) {
        // SetParty(C7/D22):operand[0..2] = roleId+1(0=空)→ 角色模板 slug 有序表
        const members = o
          .filter((v): v is number => typeof v === 'number' && v > 0)
          .map((v) => ROLE_SLUGS[v - 1])
          .filter((m): m is (typeof ROLE_SLUGS)[number] => m !== undefined)
        push({ kind: 'setParty', members: [...members] })
      } else if (oc === 0xa1) {
        // SetAllPartyPos 全员聚拢队首:骑乘链开头(E7)→ mountParty(属主=载具,全员叠上)
        if (owner) push({ kind: 'mountParty', entity: owner })
        else gap('聚拢无属主')
      } else if (oc === 0x3f || oc === 0x44 || oc === 0x97) {
        // PartyRideEventObject 骑当前对象走位(速 2/4/8);挂载 op-scoped:
        // 引擎 moveParty 走位即下筏(dismountParty),连骑不卸、无持久态
        const sp = oc === 0x3f ? 2 : oc === 0x44 ? 4 : 8
        if (owner)
          push({
            kind: 'ride',
            entity: owner,
            to: partyPosToGrid(o[0] ?? 0, o[1] ?? 0, o[2] ?? 0),
            speed: SPEED[sp]!,
          })
        else gap('骑乘无属主')
      } else if (oc === 0x6e) {
        // sdlpal script.c:2091-2107:每次 0x6E 都写 wLayer = operand[2] * 8；
        // 第三操作数不能丢，否则上桥/血池过场的人物会按地面层参与遮挡。
        // clean schema 存逻辑层号，渲染消费端统一换算为像素深度。
        push({
          kind: 'nudgeParty',
          dx: signExtendI16(o[0] ?? 0),
          dy: signExtendI16(o[1] ?? 0),
          ...(o[2] ? { layer: signExtendI16(o[2]) } : {}),
        })
      } else if (oc === 0x7d) {
        const ent = pcRef(o[0] ?? 0)
        if (ent)
          push({
            kind: 'nudgeEntity',
            entity: ent,
            dx: signExtendI16(o[1] ?? 0),
            dy: signExtendI16(o[2] ?? 0),
          })
        else gap('moveObject 无属主')
      } else if (oc === 0x6c) {
        const ent = pcRef(o[0] ?? 0)
        if (ent) {
          flush()
          body.push({
            kind: 'nudgeEntity',
            entity: ent,
            dx: signExtendI16(o[1] ?? 0),
            dy: signExtendI16(o[2] ?? 0),
          })
          body.push({ kind: 'animEntity', entity: ent })
        } else gap('walkOneStep 无属主')
      } else if (oc === 0x87) {
        if (owner) push({ kind: 'animEntity', entity: owner })
        else gap('animate 无属主')
      } else if (oc === 0x4c) {
        // B8 追逐:0x4C [maxDist, speed, floating](缺省 8/4;script.c:1733-1751)。原版靠
        // goto-self/0x06 概率环逐帧重复 —— 新引擎 auto runner 天然循环,单条声明即持续追逐,
        // 段后骨架整体吞掉(概率停顿细节属演出损耗,可接受)。
        flush()
        body.push({
          kind: 'chasePlayer',
          range: (o[0] ?? 0) || 8,
          speed: (o[1] ?? 0) || 4,
          ...((o[2] ?? 0) !== 0 ? { floating: true } : {}),
        })
        return { body, term: { kind: 'end' }, dialogueState: dialogueSnapshot() }
      } else if (oc === 0x4b) {
        // B8:实体短暂消失(原版 sVanishTime=-15 ≈ 1.5s;野怪战胜后的重生窗)
        push({ kind: 'vanishEntity', seconds: 2 })
      } else if (oc === 0x52) {
        // B8:self 长消失(script.c:1794-1800 sVanishTime=op0||800 帧,10fps ≈ 80s;野怪重生主机制)
        push({ kind: 'vanishEntity', seconds: Math.round(((o[0] ?? 0) || 800) / 10) })
      } else if (oc === 0x4e) {
        push({ kind: 'loadLastSave' })
      } else if (oc === 0x4f) {
        push({ kind: 'fade', dir: 'out', ms: 900, color: 'red' })
      } else if (oc === 0x8a) {
        // B9:标记下一场战斗自动(fAutoBattle);合进紧邻的 startBattle.auto(下方消费 pendingAuto)
        flush()
        ctx.pendingAuto = true
      } else if (oc === 0x07) {
        flush()
        const onLose = (o[1] ?? 0) !== 0 ? inlineArm(o[1]) : undefined
        const onFlee = (o[2] ?? 0) !== 0 ? inlineArm(o[2]) : undefined
        body.push({
          kind: 'startBattle',
          team: o[0] ?? 0,
          ...(onLose?.length ? { onLose } : {}),
          ...(onFlee?.length ? { onFlee } : {}),
          ...(ctx.pendingAuto ? { auto: true } : {}),
          // 原版 fIsBoss = !op2(script.c:3318):无逃跑臂 = 首领战(不可逃+胜利曲 2)
          ...((o[2] ?? 0) === 0 ? { boss: true } : {}),
        })
        ctx.pendingAuto = false
      } else if (oc === 0x06) {
        flush()
        // jumpByRate:random(1,100) ≥ op0 → 跳。跳走臂结构:branch{chance,then:臂},不中直走
        body.push({
          kind: 'branch',
          cond: { kind: 'chance', percent: 101 - (o[0] ?? 100) },
          then: inlineArm(o[1]),
        })
      } else if (oc === 0x0a) {
        flush()
        body.push({ kind: 'confirm', onNo: inlineArm(o[0]) })
      } else if (oc === 0x1e && (o[1] ?? 0) !== 0) {
        flush()
        const amt = signExtendI16(o[0] ?? 0)
        if (amt < 0) {
          // 钱不够 → 跳走臂;够 → 扣钱直走
          body.push({
            kind: 'branch',
            cond: { kind: 'not', cond: { kind: 'hasMoney', atLeast: -amt } },
            then: inlineArm(o[1]),
          })
          body.push({ kind: 'giveMoney', delta: amt })
        } else {
          body.push({ kind: 'giveMoney', delta: amt })
          note(ctx, 'addCash 正数带跳(原版不可能跳)')
        }
      } else if (oc === 0x20 && (o[2] ?? 0) !== 0) {
        flush()
        const cnt = Math.max(1, o[1] ?? 1)
        body.push({
          kind: 'branch',
          cond: { kind: 'not', cond: { kind: 'hasItem', itemId: String(o[0]), atLeast: cnt } },
          then: inlineArm(o[2]),
        })
        body.push({ kind: 'loseItem', itemId: String(o[0]), ...(cnt > 1 ? { count: cnt } : {}) })
      } else if (oc === 0x58 && (o[2] ?? 0) !== 0) {
        // 0x58(script.c:1864)物品数 < op1 → jump op2。纯判定不消耗(区别 0x20 检查即扣)。
        // then=不足段(inlineArm 自带 stopScript);够则 fall-through 继续主线。
        flush()
        body.push({
          kind: 'branch',
          cond: {
            kind: 'not',
            cond: { kind: 'hasItem', itemId: String(o[0]), atLeast: Math.max(1, o[1] ?? 1) },
          },
          then: inlineArm(o[2]),
        })
      } else if (oc === 0x74 && (o[0] ?? 0) !== 0) {
        // 0x74(script.c:2158)非全员满血 → jump op0(洪大夫治伤段)。then=治疗(不满血);
        // fall-through=满血唠叨段。治疗臂自带 stopScript 不落穿,构成 if/else。
        flush()
        body.push({
          kind: 'branch',
          cond: { kind: 'not', cond: { kind: 'allFullHp' } },
          then: inlineArm(o[0]),
        })
      } else if (oc === 0x86 && (o[2] ?? 0) !== 0) {
        // 0x86(script.c:2528)全队装备 op0 件数 < (op1||1) → jump op2(将军冢玉佛珠门禁)。
        // sdlpal#324:op1==0 按 1(否则 count<0 恒假、不戴玉佛珠也破屏障;一阶段同修)。
        flush()
        body.push({
          kind: 'branch',
          cond: {
            kind: 'not',
            cond: {
              kind: 'itemEquipped',
              itemId: String(o[0]),
              atLeast: (o[1] ?? 0) || 1,
            },
          },
          then: inlineArm(o[2]),
        })
      } else if (oc === 0x83 && (o[2] ?? 0) !== 0) {
        // 0x83(script.c:2452)对象 op0 不在本场景 EventObject 下标区间 → jump op2。
        // 清洁重写:全局对象号 → e{号−1} 场景实体 id(杜绝下标身份),判「实体是否属本场景」。
        flush()
        body.push({
          kind: 'branch',
          cond: { kind: 'not', cond: { kind: 'entityInScene', entity: `e${(o[0] ?? 0) - 1}` } },
          then: inlineArm(o[2]),
        })
      } else if (oc === 0x94) {
        flush()
        const ent = entRef(o[0] ?? 0)
        if (ent)
          body.push({
            kind: 'branch',
            cond: { kind: 'entityState', entity: ent, is: signExtendI16(o[1] ?? 0) },
            then: inlineArm(o[2]),
          })
        else gap('jumpIfObjState 无属主')
      } else if (oc === 0x79) {
        flush()
        body.push({
          kind: 'branch',
          cond: { kind: 'inParty', actorId: ROLE_SLUGS[o[0] ?? 0] ?? String(o[0]) },
          then: inlineArm(o[1]),
        })
      } else if (oc === 0x7f) {
        flush()
        const [a = 0, b = 0, cc = 0] = o
        if (a === 0 && b === 0)
          body.push({ kind: 'cameraSnap' }) // 回正
        else if (cc === 0xffff) body.push({ kind: 'cameraSnap', to: partyPosToGrid(a, b, 0) })
        else
          body.push({
            kind: 'cameraPan',
            dx: signExtendI16(a),
            dy: signExtendI16(b),
            frames: Math.max(1, cc),
          })
      } else if (oc === 0x04) {
        // callScript:目标链整段内联(owner 可被 op1 覆盖;memo 防重展)
        flush()
        const callOwner = (o[1] ?? 0) !== 0 ? `e${o[1]}` : owner
        const callEntry = dialogueSnapshot()
        if (ctx.registry) {
          const ref = ctx.registry.registerTarget(`L_${o[0]}`, callOwner, callEntry, ctx)
          body.push({ kind: 'callScript', ref, ...(callOwner ? { self: callOwner } : {}) })
          const exit = ctx.registry.dialogueExitFor(ref)
          if (exit) applyDialogueState(exit)
          at = { cmds: at.cmds, idx: at.idx + 1 }
          continue
        }
        const memoKey = `call:L_${o[0]}|${callOwner ?? ''}|${JSON.stringify(callEntry)}`
        ctx.armMemo ??= new Map()
        ctx.dialogueExitMemo ??= new Map()
        const memo = ctx.armMemo
        let calleeBody = memo.get(memoKey)
        if (!calleeBody) {
          const target = ctx.labelAt.get(`L_${o[0]}`)
          if (!target || depth >= MAX_ARM_DEPTH) {
            gap(target ? 'call 深度截断' : `call 目标缺失 L_${o[0]}`)
            calleeBody = []
            ctx.dialogueExitMemo.set(memoKey, callEntry)
          } else {
            memo.set(memoKey, [])
            const r = walkBody(target.cmds, target.idx, callOwner, ctx, depth + 1, callEntry)
            calleeBody = r.body.length > MAX_ARM_BODY ? [] : r.body
            ctx.dialogueExitMemo.set(memoKey, r.dialogueState)
            if (r.body.length > MAX_ARM_BODY) gap(`call 体超长(${r.body.length})`)
          }
          memo.set(memoKey, calleeBody)
        }
        body.push(...calleeBody)
        applyDialogueState(ctx.dialogueExitMemo.get(memoKey) ?? callEntry)
      } else if (oc === 0x24 || oc === 0x25) {
        flush()
        if ((o[0] ?? 0) === 0) {
          // 原版:op0==0 整条无效
        } else {
          const ent = entRef(o[0]!)
          if (!ent) note(ctx, '页切换无属主')
          else if ((o[1] ?? 0) === 0) {
            body.push(
              oc === 0x24
                ? { kind: 'setEntityAuto', entity: ent, stages: [] }
                : { kind: 'setEntityTrigger', entity: ent, stages: [] },
            )
          } else {
            if (ctx.registry) {
              const ref = ctx.registry.registerTarget(`L_${o[1]}`, ent, {}, ctx)
              body.push(
                oc === 0x24
                  ? { kind: 'setEntityAuto', entity: ent, script: ref }
                  : { kind: 'setEntityTrigger', entity: ent, script: ref },
              )
              at = { cmds: at.cmds, idx: at.idx + 1 }
              continue
            }
            const sub = translateStages(`L_${o[1]}`, ent, ctx)
            if (sub?.length) {
              body.push(
                oc === 0x24
                  ? { kind: 'setEntityAuto', entity: ent, stages: sub }
                  : { kind: 'setEntityTrigger', entity: ent, stages: sub },
              )
            } else {
              gap(`页目标不可译 L_${o[1]}`)
            }
          }
        }
      } else if (oc === 0x40) {
        flush()
        if ((o[0] ?? 0) !== 0) {
          const ent = entRef(o[0]!)
          const mode = o[1] ?? 0
          if (ent) {
            body.push(
              mode >= 1 && mode <= 3
                ? { kind: 'setEntityTriggerMode', entity: ent, on: 'interact', range: mode }
                : mode >= 4 && mode <= 8
                  ? { kind: 'setEntityTriggerMode', entity: ent, on: 'touch', range: mode - 4 }
                  : { kind: 'setEntityTriggerMode', entity: ent },
            )
          }
        }
      } else if (oc === 0x26 || oc === 0x27) {
        push({ kind: 'openShop', shop: o[0] ?? 0, mode: oc === 0x26 ? 'buy' : 'sell' })
      } else if (oc === 0x78) {
        push(undefined)
        knownNoOp(ctx, '0x78', sourceAddressAt(ctx, at.cmds, at.idx))
      } else if (oc === 0xa0) {
        push({
          kind: 'quitToTitle',
          videos: [palVideoAssetId(4), palVideoAssetId(5), palVideoAssetId(6)],
        })
        resolved(ctx, '0xa0 -> quitToTitle')
      } else if (oc === 0x6d) {
        flush()
        const sourceScene = o[0] ?? 0
        if (sourceScene <= 0) {
          gap('0x6D 场景号必须为 1-based 正数')
        } else {
          const scene = sceneSlug(sourceScene - 1)
          const onEnter = o[1] ?? 0
          const onTeleport = o[2] ?? 0
          if (onEnter === 0 && onTeleport === 0) {
            body.push({ kind: 'clearSceneScripts', scene })
          } else {
            const sourceAddress = sourceAddressAt(ctx, at.cmds, at.idx)
            const path = ctx.pathStack?.join(' -> ') ?? 'unknown-root'
            if (onEnter > 0)
              body.push({
                kind: 'setSceneOnEnter',
                scene,
                stages: [],
                _addr: onEnter,
                _sourceAddress: sourceAddress,
                _owner: owner ?? 'scene',
                _path: path,
              } as Command)
            if (onTeleport > 0)
              body.push({
                kind: 'setSceneOnTeleport',
                scene,
                stages: [],
                _addr: onTeleport,
                _sourceAddress: sourceAddress,
                _owner: owner ?? 'scene',
                _path: path,
              } as Command)
          }
          ctx.report.sceneScriptPatches = (ctx.report.sceneScriptPatches ?? 0) + 1
          resolved(ctx, '0x6d -> sceneScriptOverrides')
        }
      } else if (JUMP_FAMILY.has(oc)) {
        // 未实现的跳转族:截断本段(不猜控制流)
        gap(`jump-family 0x${oc.toString(16)}`)
        ctx.report.flowCuts++
        return { body, term: { kind: 'cut' }, dialogueState: dialogueSnapshot() }
      } else {
        gap(`未知 opcode 0x${oc.toString(16)}`)
      }
      at = { cmds: at.cmds, idx: at.idx + 1 }
      continue
    }

    // 未知具名 op(不应出现):记阻塞 gap,继续收集诊断。
    flush()
    recordGap(ctx, {
      sourceAddress: sourceAddressAt(ctx, at.cmds, at.idx),
      opcode: op ?? 'missing-op',
      operands: [...(c.operands ?? [])],
      owner: owner ?? 'scene',
      reason: `未知具名 op ${String(op)}`,
    })
    at = { cmds: at.cmds, idx: at.idx + 1 }
  }
  flush()
  if (body.length >= MAX_BODY) {
    note(ctx, '段体超长截断')
    ctx.report.flowCuts++
  }
  return { body, term: { kind: 'cut' }, dialogueState: dialogueSnapshot() }
}

/**
 * 门模式 peephole:loadScene 与相邻(≤2 距离)teleportParty/fade(out) 折叠为单条
 * loadScene{scene,pos}(主流原版链形 `loadScene setPartyPos fadeOut`×666 及变序)。
 * 引擎的 loadScene 内建淡出/淡入,相邻 fade 一并吸收。
 */
export function foldDoorPattern(body: Command[]): Command[] {
  const out: Command[] = []
  for (let i = 0; i < body.length; i++) {
    const c = body[i]!
    if (c.kind !== 'loadScene') {
      out.push(c)
      continue
    }
    let pos = c.pos
    let facing = c.facing
    // 向前看 ≤2:teleportParty(取坐标)/fade out(吸收)
    let consumed = 0
    for (let j = i + 1; j <= i + 2 && j < body.length; j++) {
      const n = body[j]!
      if (n.kind === 'teleportParty' && !pos) {
        pos = n.pos
        facing ??= n.facing
        consumed = j - i
      } else if (n.kind === 'fade' && n.dir === 'out') {
        consumed = j - i
      } else break
    }
    // 向后看已产出的尾部 ≤2:setPartyPos 先于 loadScene 的变序(33×)
    for (let k = out.length - 1; k >= out.length - 2 && k >= 0 && !pos; k--) {
      const p = out[k]!
      if (p.kind === 'teleportParty') {
        pos = p.pos
        facing ??= p.facing
        out.splice(k, 1)
        break
      }
      if (p.kind !== 'fade') break
    }
    out.push(
      pos
        ? { kind: 'loadScene', scene: c.scene, pos, ...(facing ? { facing } : {}) }
        : { kind: 'loadScene', scene: c.scene, ...(facing ? { facing } : {}) },
    )
    i += consumed
  }
  return out
}

/**
 * 迁移期内部战斗配置标记(原版 0x4A/0x45 全局变量的翻译中转;schema overrideSceneBattle 已退役,
 * 不复活)。以隐藏于 Command[] 的形式(as 出入,免全链改型)流经 fold(邻战 → startBattle 一次性
 * 参数)与 bakeAndStripBattleCfg(→ SceneDef 默认),**绝不出现在最终 content**。kind 判别经 asBattleCfg。
 */
export interface BattleCfgMarker {
  kind: 'overrideSceneBattle'
  scene?: string
  fieldId?: number
  musicId?: number
}
export function battleCfgMarker(cfg: { fieldId?: number; musicId?: number }): Command {
  return {
    kind: 'overrideSceneBattle',
    ...(cfg.fieldId !== undefined ? { fieldId: cfg.fieldId } : {}),
    ...(cfg.musicId !== undefined ? { musicId: cfg.musicId } : {}),
  } as unknown as Command
}
export function asBattleCfg(c: Command): BattleCfgMarker | undefined {
  const m = c as unknown as BattleCfgMarker
  return m.kind === 'overrideSceneBattle' && m.scene === undefined ? m : undefined
}

/**
 * 战斗配置 peephole:BattleCfgMarker(0x45/0x4A 翻译产物)——
 * ① 相邻同类合并(field+music 常成对出现);② 其后 ≤3 距离内出现 startBattle →
 * fold 成该 startBattle 的一次性 fieldId/music(原版剧情战「战前现场设」的 28+28 处);
 * 剩余标记保留(bakeAndStripBattleCfg 烘成 SceneDef 默认;赤鬼王/水魔兽类打完回落场景默认)。
 */
export function foldBattleConfig(body: Command[]): Command[] {
  const out: Command[] = []
  for (let i = 0; i < body.length; i++) {
    const c = body[i]!
    const cfg = asBattleCfg(c)
    if (!cfg) {
      out.push(c)
      continue
    }
    let fieldId = cfg.fieldId
    let musicId = cfg.musicId
    // ① 吸收紧随的同类(合并 field+music 对)
    let j = i + 1
    for (; j < body.length; j++) {
      const n = asBattleCfg(body[j]!)
      if (!n) break
      fieldId = n.fieldId ?? fieldId
      musicId = n.musicId ?? musicId
    }
    // ② 向前看 ≤3:startBattle → fold 成一次性参数
    let folded = false
    for (let k = j; k <= j + 2 && k < body.length; k++) {
      const n = body[k]!
      if (n.kind === 'startBattle') {
        body[k] = {
          ...n,
          ...(fieldId !== undefined ? { fieldId } : {}),
          ...(musicId !== undefined
            ? { music: musicId <= 0 ? null : palMusicAssetId(musicId) }
            : {}),
        }
        folded = true
        break
      }
      // 中途隔的只允许轻量演出指令(设向/帧/音效);其余打断 fold
      if (!['setEntityFacing', 'setEntityFrame', 'playSound', 'wait'].includes(n.kind)) break
    }
    if (!folded && (fieldId !== undefined || musicId !== undefined))
      out.push(battleCfgMarker({ fieldId, musicId }))
    i = j - 1
  }
  return out
}

/**
 * 从脚本段 bake 出战斗配置默认(last-wins 累加进 acc:后设的赢 —— 赤鬼王类「打完设回区域曲」在触发段、
 * 晚于 enter 段,区域常态值胜)+ strip 所有标记 → 干净 stages(标记绝不进最终 content)。
 * 替代原 hoistBattleDefaults;onEnter/实体触发/onTeleport 共用同一场景 acc。
 */
export function bakeAndStripBattleCfg(
  stages: ScriptStage[],
  acc: { battleFieldId?: number; battleMusic?: AssetId | null },
): ScriptStage[] {
  return stages.map((s) => ({
    ...s,
    body: s.body.filter((c) => {
      const m = asBattleCfg(c)
      if (!m) return true
      if (m.fieldId !== undefined) acc.battleFieldId = m.fieldId
      if (m.musicId !== undefined)
        acc.battleMusic = m.musicId <= 0 ? null : palMusicAssetId(m.musicId)
      return false
    }),
  }))
}

/** 对整条 stages 应用 peephole(体内折叠;段间不跨)。 */
export function foldStages(stages: ScriptStage[]): ScriptStage[] {
  return stages.map((s) => ({ ...s, body: foldBattleConfig(foldDoorPattern(s.body)) }))
}
