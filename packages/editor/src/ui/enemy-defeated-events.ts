import type {
  ActorDef,
  AssetCatalogV1,
  AuthorCondition,
  AuthorEnemyDef,
  ItemData,
  Locale,
  SceneDef,
  WorldVariableKindV1,
  WorldVariableRegistryV1,
} from '@type-pal/content'
import { lookupText, parseRichText } from '@type-pal/content'

export type PresentableEnemyDefeatedCommand = NonNullable<AuthorEnemyDef['onDefeated']>[number]

type PresentableEnemyDefeatedDialog = Extract<
  PresentableEnemyDefeatedCommand,
  { kind: 'dialog' }
>

export interface EnemyDefeatedResolvedReference {
  id: string
  label: string
  invalid: boolean
}

interface EnemyDefeatedResolvedDialogue {
  text: string
  detail?: string
  invalid: boolean
}

export interface EnemyDefeatedPresentationContext {
  item: (id: string) => EnemyDefeatedResolvedReference
  asset: (id: string, expectedKind: 'music' | 'sound') => EnemyDefeatedResolvedReference
  variable: (id: string, expectedKind: WorldVariableKindV1) => EnemyDefeatedResolvedReference
  actor: (id: string) => EnemyDefeatedResolvedReference
  scene: (id: string) => EnemyDefeatedResolvedReference
  entity: (sceneId: string, entityId: string) => EnemyDefeatedResolvedReference
  dialog: (
    command: PresentableEnemyDefeatedDialog,
  ) => EnemyDefeatedResolvedDialogue
}

export interface EnemyDefeatedEventArm {
  kind: 'then' | 'else'
  path: string
  label: '满足时' | '否则'
  nodes: EnemyDefeatedEventNode[]
}

export interface EnemyDefeatedEventNode {
  path: string
  kind: PresentableEnemyDefeatedCommand['kind']
  label: string
  detail?: string
  invalid?: boolean
  arms?: EnemyDefeatedEventArm[]
  branchReachability?: 'then' | 'else' | 'either'
}

export interface EnemyDefeatedItemReward {
  itemId: string
  count: number
  probability: number
}

export interface EditableEnemyDefeatedItemReward extends EnemyDefeatedItemReward {
  startIndex: number
  endIndex: number
  dialog?: Extract<PresentableEnemyDefeatedCommand, { kind: 'dialog' }>
}

export interface EnemyDefeatedEventsPresentation {
  compactSummary: string
  exactReward?: EnemyDefeatedItemReward
  nodes: EnemyDefeatedEventNode[]
}

function missingReference(id: string): EnemyDefeatedResolvedReference {
  return { id, label: id, invalid: true }
}

export function createEnemyDefeatedPresentationContext(args: {
  locale: Locale
  items: readonly ItemData[]
  assetCatalog: AssetCatalogV1
  worldVariables: WorldVariableRegistryV1
  actors: readonly ActorDef[]
  scenes: readonly SceneDef[]
}): EnemyDefeatedPresentationContext {
  const itemById = new Map(args.items.map((item) => [item.id, item]))
  const actorById = new Map(args.actors.map((actor) => [actor.id, actor]))
  const sceneById = new Map(args.scenes.map((scene) => [scene.id, scene]))
  const hasLocaleText = (id: string): boolean => Object.hasOwn(args.locale, id)
  const plainText = (id: string): string =>
    parseRichText(lookupText(id, args.locale))
      .map((span) => span.text)
      .join('')
  const validPortraitAsset = (id: string | undefined): boolean => {
    if (!id) return false
    return args.assetCatalog.assets[id]?.kind === 'portrait'
  }

  return {
    item(id) {
      const item = itemById.get(id)
      return item
        ? { id, label: lookupText(item.name, args.locale), invalid: false }
        : missingReference(id)
    },
    asset(id, expectedKind) {
      const asset = args.assetCatalog.assets[id]
      if (!asset || asset.kind !== expectedKind) return missingReference(id)
      return { id, label: asset.label ?? id, invalid: false }
    },
    variable(id, expectedKind) {
      const variable = args.worldVariables[id]
      if (!variable || variable.kind !== expectedKind) return missingReference(id)
      return { id, label: variable.name, invalid: false }
    },
    actor(id) {
      const actor = actorById.get(id)
      return actor
        ? { id, label: lookupText(actor.name, args.locale), invalid: !hasLocaleText(actor.name) }
        : missingReference(id)
    },
    scene(id) {
      return sceneById.has(id) ? { id, label: id, invalid: false } : missingReference(id)
    },
    entity(sceneId, entityId) {
      const scene = sceneById.get(sceneId)
      if (!scene?.entities.some((entity) => entity.id === entityId))
        return missingReference(`${sceneId}/${entityId}`)
      return { id: `${sceneId}/${entityId}`, label: `${sceneId}/${entityId}`, invalid: false }
    },
    dialog(command) {
      const cue = command.cue
      const textIds = cue.rows.map((row) => row.text)
      const text = textIds.map(plainText).join(' / ') || '空对白'
      const missingText = textIds.some((id) => !hasLocaleText(id))
      let speaker: EnemyDefeatedResolvedReference | undefined
      let portraitId: string | undefined
      let portraitDetail: string | undefined
      let portraitInvalid = false
      let identityDetail: string | undefined
      let identityInvalid = false
      if (cue.identity.kind === 'actor') {
        const actor = actorById.get(cue.identity.actor)
        const actorNameInvalid = !!actor && !hasLocaleText(actor.name)
        identityInvalid = !actor || actorNameInvalid
        identityDetail = !actor
          ? `角色引用缺失：${cue.identity.actor}`
          : actorNameInvalid
            ? `角色名引用缺失：${actor.name}`
            : undefined
        speaker = cue.identity.speakerOverride
          ? {
              id: cue.identity.speakerOverride,
              label: plainText(cue.identity.speakerOverride),
              invalid: !hasLocaleText(cue.identity.speakerOverride),
            }
          : actor
            ? {
                id: cue.identity.actor,
                label: plainText(actor.name),
                invalid: actorNameInvalid,
              }
            : missingReference(cue.identity.actor)
        if (cue.identity.portrait) {
          portraitId =
            cue.identity.portrait.kind === 'default'
              ? actor?.portraits?.default
              : actor?.portraits?.expressions?.[cue.identity.portrait.expression]
          portraitInvalid = !validPortraitAsset(portraitId)
          portraitDetail =
            cue.identity.portrait.kind === 'expression'
              ? portraitId
                ? `表情：${cue.identity.portrait.expression} · 立绘：${portraitId}`
                : `表情：${cue.identity.portrait.expression}（引用缺失）`
              : portraitId
                ? `立绘：${portraitId}`
                : '默认立绘（引用缺失）'
        }
      } else if (cue.identity.kind === 'unbound') {
        if (cue.identity.speaker) {
          speaker = {
            id: cue.identity.speaker,
            label: plainText(cue.identity.speaker),
            invalid: !hasLocaleText(cue.identity.speaker),
          }
        }
        if (cue.identity.portrait) {
          portraitId = cue.identity.portrait.asset
          portraitInvalid = !validPortraitAsset(portraitId)
          portraitDetail = `立绘：${portraitId}${portraitInvalid ? '（引用缺失）' : ''}`
        }
      }
      const sourceDetail = textIds.filter((id) => lookupText(id, args.locale) !== id).join(' / ')
      const detail = [
        speaker?.label ? `说话人：${speaker.label}` : undefined,
        identityDetail,
        sourceDetail || undefined,
        portraitDetail,
      ]
        .filter(Boolean)
        .join(' · ')
      return {
        text,
        ...(detail ? { detail } : {}),
        invalid: missingText || identityInvalid || !!speaker?.invalid || portraitInvalid,
      }
    },
  }
}

function strictSkipPercent(
  command: PresentableEnemyDefeatedCommand | undefined,
  requireAbsentElse: boolean,
): number | undefined {
  if (
    command?.kind !== 'branch' ||
    command.cond.kind !== 'chance' ||
    (requireAbsentElse ? command.else !== undefined : (command.else?.length ?? 0) !== 0) ||
    command.then.length !== 1 ||
    command.then[0]?.kind !== 'stopScript'
  )
    return undefined
  return command.cond.percent
}

function exactItemReward(
  commands: readonly PresentableEnemyDefeatedCommand[],
): EnemyDefeatedItemReward | undefined {
  if (
    commands.length === 2 &&
    commands[0]?.kind === 'giveItem' &&
    commands[1]?.kind === 'dialog'
  )
    return {
      itemId: commands[0].itemId,
      count: commands[0].count ?? 1,
      probability: 100,
    }
  if (
    commands.length === 3 &&
    commands[0]?.kind === 'branch' &&
    commands[1]?.kind === 'giveItem' &&
    commands[2]?.kind === 'dialog'
  ) {
    const skipPercent = strictSkipPercent(commands[0], true)
    if (skipPercent === undefined) return undefined
    return {
      itemId: commands[1].itemId,
      count: commands[1].count ?? 1,
      probability: 100 - skipPercent,
    }
  }
  return undefined
}

function assertNever(value: never): never {
  throw new Error(`未覆盖的击败后事件：${JSON.stringify(value)}`)
}

interface ConditionDescription {
  label: string
  invalid: boolean
}

function describeCondition(
  condition: AuthorCondition,
  context: EnemyDefeatedPresentationContext,
): ConditionDescription {
  switch (condition.kind) {
    case 'flag': {
      const reference = context.variable(condition.flag, 'flag')
      return {
        label: `开关 ${reference.label} 为${condition.is ? '开启' : '关闭'}`,
        invalid: reference.invalid,
      }
    }
    case 'var': {
      const reference = context.variable(condition.var, 'number')
      const operator =
        condition.op === '=='
          ? '='
          : condition.op === '!='
            ? '≠'
            : condition.op === '>='
              ? '≥'
              : condition.op === '<='
                ? '≤'
                : condition.op
      return {
        label: `${reference.label} ${operator} ${condition.value}`,
        invalid: reference.invalid,
      }
    }
    case 'currentScene': {
      const reference = context.scene(condition.scene)
      return { label: `当前场景是 ${reference.label}`, invalid: reference.invalid }
    }
    case 'entityState': {
      const reference = context.entity(condition.target.scene, condition.target.entity)
      return { label: `实体 ${reference.label} 状态为 ${condition.is}`, invalid: reference.invalid }
    }
    case 'entityInScene': {
      const reference = context.entity(condition.target.scene, condition.target.entity)
      return { label: `实体 ${reference.label} 位于目标场景`, invalid: reference.invalid }
    }
    case 'facingEntity': {
      const reference = context.entity(condition.target.scene, condition.target.entity)
      return {
        label: `队伍面向实体 ${reference.label}${condition.range !== undefined ? `（${condition.range} 格内）` : ''}`,
        invalid: reference.invalid,
      }
    }
    case 'chance':
      return { label: `${condition.percent}% 概率`, invalid: false }
    case 'hasItem': {
      const reference = context.item(condition.itemId)
      return {
        label: `背包有 ${reference.label} ×${condition.atLeast ?? 1}`,
        invalid: reference.invalid,
      }
    }
    case 'ownsItem': {
      const reference = context.item(condition.itemId)
      return {
        label: `持有 ${reference.label} ×${condition.atLeast ?? 1}`, invalid: reference.invalid,
      }
    }
    case 'itemEquipped': {
      const reference = context.item(condition.itemId)
      return {
        label: `已装备 ${reference.label} ×${condition.atLeast ?? 1}`, invalid: reference.invalid,
      }
    }
    case 'allFullHp':
      return { label: '全队 HP 已满', invalid: false }
    case 'hasMoney':
      return { label: `金钱不少于 ${condition.atLeast}`, invalid: false }
    case 'inParty': {
      const reference = context.actor(condition.actorId)
      return { label: `${reference.label} 在队伍中`, invalid: reference.invalid }
    }
    case 'all': {
      const children = condition.of.map((child) => describeCondition(child, context))
      return {
        label: children.length
          ? children
              .map((child, index) =>
                condition.of[index]?.kind === 'any' ? `（${child.label}）` : child.label,
              )
              .join(' 且 ')
          : '全部条件',
        invalid: children.some((child) => child.invalid),
      }
    }
    case 'any': {
      const children = condition.of.map((child) => describeCondition(child, context))
      return {
        label: children.length
          ? children
              .map((child, index) =>
                condition.of[index]?.kind === 'all' ? `（${child.label}）` : child.label,
              )
              .join(' 或 ')
          : '任一条件',
        invalid: children.some((child) => child.invalid),
      }
    }
    case 'not': {
      const child = describeCondition(condition.cond, context)
      return { label: `不满足（${child.label}）`, invalid: child.invalid }
    }
    default:
      return assertNever(condition)
  }
}

function referenceDetail(reference: EnemyDefeatedResolvedReference): string | undefined {
  if (reference.invalid) return `引用缺失：${reference.id}`
  return reference.label === reference.id ? undefined : reference.id
}

function signedChange(value: number): string {
  if (value > 0) return `增加 ${value}`
  if (value < 0) return `减少 ${Math.abs(value)}`
  return '保持不变'
}

function presentCommand(
  command: PresentableEnemyDefeatedCommand,
  context: EnemyDefeatedPresentationContext,
  path: string,
): EnemyDefeatedEventNode {
  switch (command.kind) {
    case 'dialog': {
      const dialogue = context.dialog(command)
      return {
        path,
        kind: command.kind,
        label: `显示“${dialogue.text}”`,
        ...(dialogue.detail ? { detail: dialogue.detail } : {}),
        ...(dialogue.invalid ? { invalid: true } : {}),
      }
    }
    case 'clearDialog':
      return { path, kind: command.kind, label: '清除对话框' }
    case 'wait':
      return { path, kind: command.kind, label: `等待 ${command.ms} 毫秒` }
    case 'playSound': {
      const reference = context.asset(command.asset, 'sound')
      return {
        path,
        kind: command.kind,
        label: `播放音效 ${reference.label}`,
        ...(referenceDetail(reference) ? { detail: referenceDetail(reference) } : {}),
        ...(reference.invalid ? { invalid: true } : {}),
      }
    }
    case 'playMusic': {
      const reference = context.asset(command.asset, 'music')
      return {
        path,
        kind: command.kind,
        label: `播放音乐 ${reference.label}`,
        ...(referenceDetail(reference) ? { detail: referenceDetail(reference) } : {}),
        ...(reference.invalid ? { invalid: true } : {}),
      }
    }
    case 'stopMusic':
      return { path, kind: command.kind, label: '停止音乐' }
    case 'giveItem': {
      const reference = context.item(command.itemId)
      return {
        path,
        kind: command.kind,
        label: `获得${reference.label} ×${command.count ?? 1}`,
        ...(referenceDetail(reference) ? { detail: referenceDetail(reference) } : {}),
        ...(reference.invalid ? { invalid: true } : {}),
      }
    }
    case 'loseItem': {
      const reference = context.item(command.itemId)
      return {
        path,
        kind: command.kind,
        label: `移除 ${reference.label} ×${command.count ?? 1}`,
        ...(referenceDetail(reference) ? { detail: referenceDetail(reference) } : {}),
        ...(reference.invalid ? { invalid: true } : {}),
      }
    }
    case 'giveMoney':
      return {
        path,
        kind: command.kind,
        label:
          command.delta > 0
            ? `获得金钱 ${command.delta}`
            : command.delta < 0
              ? `扣除金钱 ${Math.abs(command.delta)}`
              : '金钱不变',
      }
    case 'setFlag': {
      const reference = context.variable(command.flag, 'flag')
      return {
        path,
        kind: command.kind,
        label: `将开关 ${reference.label}设为${command.value ? '开启' : '关闭'}`,
        ...(referenceDetail(reference) ? { detail: referenceDetail(reference) } : {}),
        ...(reference.invalid ? { invalid: true } : {}),
      }
    }
    case 'setVar': {
      const reference = context.variable(command.var, 'number')
      return {
        path,
        kind: command.kind,
        label: `将变量 ${reference.label}设为 ${command.value}`,
        ...(referenceDetail(reference) ? { detail: referenceDetail(reference) } : {}),
        ...(reference.invalid ? { invalid: true } : {}),
      }
    }
    case 'addVar': {
      const reference = context.variable(command.var, 'number')
      return {
        path,
        kind: command.kind,
        label: `变量 ${reference.label} ${signedChange(command.delta)}`,
        ...(referenceDetail(reference) ? { detail: referenceDetail(reference) } : {}),
        ...(reference.invalid ? { invalid: true } : {}),
      }
    }
    case 'stopScript':
      return { path, kind: command.kind, label: '结束本敌槽后续事件' }
    case 'branch': {
      const condition = describeCondition(command.cond, context)
      const arms: EnemyDefeatedEventArm[] = [
        {
          kind: 'then',
          path: `${path}.then`,
          label: '满足时',
          nodes: presentCommands(command.then, context, `${path}.then`),
        },
      ]
      if (command.else)
        arms.push({
          kind: 'else',
          path: `${path}.else`,
          label: '否则',
          nodes: presentCommands(command.else, context, `${path}.else`),
        })
      return {
        path,
        kind: command.kind,
        label:
          command.cond.kind === 'chance' ? `${condition.label}时` : `如果 ${condition.label}`,
        ...(condition.invalid ? { invalid: true } : {}),
        arms,
        branchReachability:
          command.cond.kind !== 'chance'
            ? 'either'
            : command.cond.percent === 100
              ? 'then'
              : command.cond.percent === 0
                ? 'else'
                : 'either',
      }
    }
    default:
      return assertNever(command)
  }
}

function presentCommands(
  commands: readonly PresentableEnemyDefeatedCommand[],
  context: EnemyDefeatedPresentationContext,
  parentPath = 'onDefeated',
): EnemyDefeatedEventNode[] {
  return commands.map((command, index) =>
    presentCommand(command, context, `${parentPath}[${index}]`),
  )
}

const resultSummaryPriority: readonly EnemyDefeatedEventNode['kind'][] = [
  'giveItem',
  'giveMoney',
  'loseItem',
  'setFlag',
  'setVar',
  'addVar',
  'dialog',
]

const summaryCategoryByKind: Partial<Record<EnemyDefeatedEventNode['kind'], string>> = {
  branch: '条件分支',
  dialog: '提示',
  clearDialog: '对话变化',
  wait: '等待',
  playSound: '音效',
  playMusic: '音乐',
  stopMusic: '音乐变化',
  giveItem: '物品结果',
  loseItem: '物品结果',
  giveMoney: '金钱结果',
  setFlag: '状态变化',
  setVar: '状态变化',
  addVar: '状态变化',
  stopScript: '流程终止',
}

interface EnemyDefeatedSummaryCandidate {
  node: EnemyDefeatedEventNode
  conditional: boolean
}

interface EnemyDefeatedSummaryCategory {
  path: string
  kind: EnemyDefeatedEventNode['kind']
  label: string
}

interface EnemyDefeatedSummaryFlow {
  candidates: EnemyDefeatedSummaryCandidate[]
  categories: EnemyDefeatedSummaryCategory[]
  mayContinue: boolean
  mustContinue: boolean
}

function emptySummaryFlow(): EnemyDefeatedSummaryFlow {
  return { candidates: [], categories: [], mayContinue: true, mustContinue: true }
}

function analyzeSummaryNode(
  node: EnemyDefeatedEventNode,
  conditional: boolean,
): EnemyDefeatedSummaryFlow {
  const category = summaryCategoryByKind[node.kind]
  const ownCategories = category
    ? [{ path: node.path, kind: node.kind, label: category }]
    : []
  if (node.kind === 'stopScript') {
    return {
      candidates: [],
      categories: ownCategories,
      mayContinue: false,
      mustContinue: false,
    }
  }
  if (node.kind === 'branch') {
    const thenNodes = node.arms?.find((arm) => arm.kind === 'then')?.nodes ?? []
    const elseArm = node.arms?.find((arm) => arm.kind === 'else')
    const elseNodes = elseArm?.nodes ?? []
    if (node.branchReachability === 'then') {
      const thenFlow = analyzeSummarySequence(thenNodes, conditional)
      return {
        ...thenFlow,
        categories: [...ownCategories, ...thenFlow.categories],
      }
    }
    if (node.branchReachability === 'else') {
      const elseFlow = analyzeSummarySequence(elseNodes, conditional)
      return {
        ...elseFlow,
        categories: [...ownCategories, ...elseFlow.categories],
      }
    }
    const thenFlow = analyzeSummarySequence(thenNodes, true)
    const elseFlow = elseArm ? analyzeSummarySequence(elseNodes, true) : emptySummaryFlow()
    return {
      candidates: [...thenFlow.candidates, ...elseFlow.candidates].map((candidate) => ({
        ...candidate,
        conditional: true,
      })),
      categories: [...ownCategories, ...thenFlow.categories, ...elseFlow.categories],
      mayContinue: thenFlow.mayContinue || elseFlow.mayContinue,
      mustContinue: thenFlow.mustContinue && elseFlow.mustContinue,
    }
  }
  return {
    candidates: resultSummaryPriority.includes(node.kind) ? [{ node, conditional }] : [],
    categories: ownCategories,
    mayContinue: true,
    mustContinue: true,
  }
}

function analyzeSummarySequence(
  nodes: readonly EnemyDefeatedEventNode[],
  inheritedConditional = false,
): EnemyDefeatedSummaryFlow {
  const candidates: EnemyDefeatedSummaryCandidate[] = []
  const categories: EnemyDefeatedSummaryCategory[] = []
  let mayReachNext = true
  let mustReachNext = true
  for (const node of nodes) {
    if (!mayReachNext) break
    const nodeFlow = analyzeSummaryNode(node, inheritedConditional || !mustReachNext)
    candidates.push(...nodeFlow.candidates)
    categories.push(...nodeFlow.categories)
    mayReachNext = mayReachNext && nodeFlow.mayContinue
    mustReachNext = mustReachNext && nodeFlow.mustContinue
  }
  return {
    candidates,
    categories,
    mayContinue: mayReachNext,
    mustContinue: mustReachNext,
  }
}

export function presentEnemyDefeatedEvents(
  commands: readonly PresentableEnemyDefeatedCommand[] | undefined,
  context: EnemyDefeatedPresentationContext,
): EnemyDefeatedEventsPresentation {
  const body = commands ?? []
  const nodes = presentCommands(body, context)
  const exactReward = exactItemReward(body)
  if (exactReward) {
    const item = context.item(exactReward.itemId)
    return {
      compactSummary: `击败后：${exactReward.probability < 100 ? `${exactReward.probability}% ` : ''}获得${item.label} ×${exactReward.count}`,
      exactReward,
      nodes,
    }
  }
  if (!nodes.length) return { compactSummary: '击败后：无额外事件', nodes }

  const flow = analyzeSummarySequence(nodes)
  const main = resultSummaryPriority
    .map((kind) => {
      const matching = flow.candidates.filter((candidate) => candidate.node.kind === kind)
      return matching.find((candidate) => !candidate.conditional) ?? matching[0]
    })
    .find((candidate) => candidate !== undefined)
  const fallback = nodes[0]!
  const primaryPath = main?.node.path ?? fallback.path
  const secondary = [
    ...new Set(
      flow.categories
        .filter((category) => category.path !== primaryPath)
        .filter((category) =>
          main
            ? category.kind !== 'branch' && category.kind !== 'stopScript'
            : fallback.kind !== 'branch' || category.kind !== 'branch',
        )
        .map((category) => category.label),
    ),
  ]
  const mainSummary = main
    ? `${main.conditional ? '按条件可能' : ''}${main.node.label}`
    : fallback.kind === 'branch'
      ? '按条件执行分支'
      : fallback.label
  return {
    compactSummary: `击败后：${mainSummary}${secondary.length ? `；另有${secondary.join('、')}` : ''}`,
    nodes,
  }
}

export function findEditableEnemyDefeatedItemReward(
  commands: readonly PresentableEnemyDefeatedCommand[] | undefined,
): EditableEnemyDefeatedItemReward | undefined {
  if (!commands?.length) return undefined
  const giveIndexes = commands.flatMap((command, index) =>
    command.kind === 'giveItem' ? [index] : [],
  )
  if (giveIndexes.length !== 1) return undefined
  const giveIndex = giveIndexes[0]!
  const give = commands[giveIndex] as Extract<
    PresentableEnemyDefeatedCommand,
    { kind: 'giveItem' }
  >
  const skipPercent = strictSkipPercent(commands[giveIndex - 1], false)
  if (commands[giveIndex - 1]?.kind === 'branch' && skipPercent === undefined) return undefined
  const startIndex = skipPercent === undefined ? giveIndex : giveIndex - 1
  if (
    commands
      .slice(0, startIndex)
      .some((command) => command.kind === 'branch' || command.kind === 'stopScript')
  )
    return undefined
  const following = commands[giveIndex + 1]
  const dialog = following?.kind === 'dialog' ? following : undefined
  return {
    startIndex,
    endIndex: giveIndex + (dialog ? 2 : 1),
    itemId: give.itemId,
    count: give.count ?? 1,
    probability: skipPercent === undefined ? 100 : 100 - skipPercent,
    ...(dialog ? { dialog } : {}),
  }
}

export function replaceEditableEnemyDefeatedItemReward(
  commands: readonly PresentableEnemyDefeatedCommand[] | undefined,
  current: EditableEnemyDefeatedItemReward | undefined,
  next: Pick<EnemyDefeatedItemReward, 'itemId' | 'count' | 'probability'> | undefined,
): PresentableEnemyDefeatedCommand[] | undefined {
  const result = [...(commands ?? [])]
  const replacement: PresentableEnemyDefeatedCommand[] = []
  if (next) {
    if (next.probability < 100) {
      replacement.push({
        kind: 'branch',
        cond: { kind: 'chance', percent: 100 - next.probability },
        then: [{ kind: 'stopScript' }],
      })
    }
    replacement.push({ kind: 'giveItem', itemId: next.itemId, count: next.count })
    if (current?.dialog) replacement.push(current.dialog)
  }
  if (current)
    result.splice(current.startIndex, current.endIndex - current.startIndex, ...replacement)
  else result.push(...replacement)
  return result.length ? result : undefined
}
