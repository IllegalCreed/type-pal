/**
 * ActorDef.id 的持久引用分类真值。
 *
 * 内容校验和编辑器共享引用类别与角色定位规则。编辑器负责对象 locator 和删除决策。
 */

import { dialogueCuesAtNode } from './author-dialogue.js'

export type ActorReferenceKind =
  | 'scene-entity-actor'
  | 'entry-point-party'
  | 'entry-point-seed-stats'
  | 'entry-point-seed-condition'
  | 'condition-in-party'
  | 'enemy-condition-player-in-party'
  | 'actor-covered-by'
  | 'item-equipable-by'
  | 'item-battle-sprite-by-actor'
  | 'command-set-actor-sprite'
  | 'command-set-actor-appearance'
  | 'command-set-party-member'
  | 'command-actor-condition'
  | 'enemy-apply-actor-growth'
  | 'enemy-play-actor-cast-effect'
  | 'dialogue-actor'
  | 'level-up-owner'
  | 'world-party-template'
  | 'world-reserve-template'

export type ActorReferenceOwnership = 'external' | 'companion' | 'runtime-readonly'

export interface ActorReferencePolicy {
  label: string
  ownership: ActorReferenceOwnership
  /** 悬空引用的内容诊断等级；删除门禁对 external/runtime-readonly 一律硬阻塞。 */
  danglingSeverity: 'error' | 'warn'
}

export const ACTOR_REFERENCE_POLICIES: Readonly<Record<ActorReferenceKind, ActorReferencePolicy>> =
  Object.freeze({
    'scene-entity-actor': {
      label: '场景人物实例',
      ownership: 'external',
      danglingSeverity: 'error',
    },
    'entry-point-party': {
      label: '入口开局队伍',
      ownership: 'external',
      danglingSeverity: 'error',
    },
    // seedStats 既是 Actor 引用，也是开局存档种子；保留既有保存前硬错误语义。
    'entry-point-seed-stats': {
      label: '入口属性播种',
      ownership: 'external',
      danglingSeverity: 'error',
    },
    'entry-point-seed-condition': {
      label: '入口当前状态',
      ownership: 'external',
      danglingSeverity: 'error',
    },
    'condition-in-party': {
      label: '脚本在队条件',
      ownership: 'external',
      danglingSeverity: 'error',
    },
    'enemy-condition-player-in-party': {
      label: '敌人玩家在队条件',
      ownership: 'external',
      danglingSeverity: 'error',
    },
    'actor-covered-by': { label: '人物援护关系', ownership: 'external', danglingSeverity: 'error' },
    'item-equipable-by': {
      label: '物品可装备人物',
      ownership: 'external',
      danglingSeverity: 'warn',
    },
    'item-battle-sprite-by-actor': {
      label: '装备战斗形象映射',
      ownership: 'external',
      danglingSeverity: 'error',
    },
    'command-set-actor-sprite': {
      label: '脚本人物精灵切换',
      ownership: 'external',
      danglingSeverity: 'error',
    },
    'command-set-actor-appearance': {
      label: '脚本人物外观切换',
      ownership: 'external',
      danglingSeverity: 'error',
    },
    'command-set-party-member': {
      label: '脚本队伍成员',
      ownership: 'external',
      danglingSeverity: 'error',
    },
    'command-actor-condition': {
      label: '脚本角色当前状态',
      ownership: 'external',
      danglingSeverity: 'error',
    },
    'enemy-apply-actor-growth': {
      label: '敌人编排人物成长',
      ownership: 'external',
      danglingSeverity: 'error',
    },
    'enemy-play-actor-cast-effect': {
      label: '敌人编排人物施法表现',
      ownership: 'external',
      danglingSeverity: 'error',
    },
    'dialogue-actor': { label: '人物对话身份', ownership: 'external', danglingSeverity: 'error' },
    'level-up-owner': { label: '升级习得伴随表', ownership: 'companion', danglingSeverity: 'warn' },
    'world-party-template': {
      label: '运行态队伍模板',
      ownership: 'runtime-readonly',
      danglingSeverity: 'error',
    },
    'world-reserve-template': {
      label: '运行态后备模板',
      ownership: 'runtime-readonly',
      danglingSeverity: 'error',
    },
  })

export interface ActorTaggedReference {
  actorId: string
  kind: Extract<
    ActorReferenceKind,
    | 'condition-in-party'
    | 'enemy-condition-player-in-party'
    | 'command-set-actor-sprite'
    | 'command-set-actor-appearance'
    | 'command-set-party-member'
    | 'command-actor-condition'
    | 'enemy-apply-actor-growth'
    | 'enemy-play-actor-cast-effect'
    | 'dialogue-actor'
  >
  where: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function isActorCueIdentity(value: unknown): value is Record<string, unknown> & { actor: string } {
  return isRecord(value) && value.kind === 'actor' && typeof value.actor === 'string'
}

/** Inspect one command, condition or authored dialogue site. Callers own recursion. */
export function actorTaggedReferencesAtNode(value: unknown, path: string): ActorTaggedReference[] {
  if (!isRecord(value)) return []
  const out: ActorTaggedReference[] = []
  const push = (actorId: unknown, kind: ActorTaggedReference['kind'], leaf: string): void => {
    if (typeof actorId === 'string' && actorId.length > 0)
      out.push({ actorId, kind, where: `${path}.${leaf}` })
  }
  switch (value.kind) {
    case 'inParty':
      push(value.actorId, 'condition-in-party', 'actorId')
      break
    case 'playerInParty':
      push(value.role, 'enemy-condition-player-in-party', 'role')
      break
    case 'setActorSprite':
      push(value.actor, 'command-set-actor-sprite', 'actor')
      break
    case 'setActorAppearance':
      push(value.actor, 'command-set-actor-appearance', 'actor')
      break
    case 'setParty':
      if (Array.isArray(value.members))
        value.members.forEach((actorId, index) => {
          push(actorId, 'command-set-party-member', `members[${index}]`)
        })
      break
    case 'applyActorCondition':
    case 'clearActorCondition':
      push(value.actor, 'command-actor-condition', 'actor')
      break
    case 'applyActorGrowth':
      push(value.actor, 'enemy-apply-actor-growth', 'actor')
      break
    case 'playActorCastEffect':
      push(value.actor, 'enemy-play-actor-cast-effect', 'actor')
      break
    default:
      break
  }
  for (const site of dialogueCuesAtNode(value)) {
    const identity = site.cue.identity
    if (isActorCueIdentity(identity))
      push(identity.actor, 'dialogue-actor', `${site.path.join('.')}.identity.actor`)
  }
  return out
}

/** command / condition / enemy choreography 共用的 actor id 叶扫描器。 */
export function collectActorTaggedReferences(
  value: unknown,
  where: string,
): ActorTaggedReference[] {
  const out: ActorTaggedReference[] = []
  const visit = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((entry, index) => {
        visit(entry, `${path}[${index}]`)
      })
      return
    }
    if (!isRecord(node)) return
    out.push(...actorTaggedReferencesAtNode(node, path))
    for (const [key, child] of Object.entries(node)) visit(child, `${path}.${key}`)
  }
  visit(value, where)
  return out
}

/** One canonical visit includes conditions and battle choreography. Child commands have their own visits. */
export function collectCanonicalActorTaggedReferences(
  command: unknown,
  where: string,
): ActorTaggedReference[] {
  const references = actorTaggedReferencesAtNode(command, where)
  if (!isRecord(command)) return references
  const condition = command.cond
  if (condition !== undefined)
    references.push(...collectActorTaggedReferences(condition, `${where}.cond`))
  if (command.kind === 'startBattle' && command.choreography !== undefined)
    references.push(...collectActorTaggedReferences(command.choreography, `${where}.choreography`))
  return references
}

export interface DialoguePortraitReference {
  actorId: string
  portraitKind: 'default' | 'expression'
  expression?: string
  where: string
}

/** 当前作者对话对人物立绘组的 exact 引用；不扫描 unbound 的全局 AssetId。 */
export function collectDialoguePortraitReferences(
  value: unknown,
  where: string,
): DialoguePortraitReference[] {
  const out: DialoguePortraitReference[] = []
  const visit = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((entry, index) => {
        visit(entry, `${path}[${index}]`)
      })
      return
    }
    if (!isRecord(node)) return
    for (const site of dialogueCuesAtNode(node)) {
      const identity = site.cue.identity
      if (!isActorCueIdentity(identity)) continue
      const portrait = identity.portrait
      if (isRecord(portrait) && (portrait.kind === 'default' || portrait.kind === 'expression'))
        out.push({
          actorId: identity.actor,
          portraitKind: portrait.kind,
          ...(portrait.kind === 'expression' && typeof portrait.expression === 'string'
            ? { expression: portrait.expression }
            : {}),
          where: `${path}.${site.path.join('.')}.identity.portrait`,
        })
    }
    for (const [key, child] of Object.entries(node)) visit(child, `${path}.${key}`)
  }
  visit(value, where)
  return out
}

/** 深拷贝作者正文。只在副本中改写同一角色、同一表情键的引用。 */
export function renameDialoguePortraitExpression<T>(
  value: T,
  actorId: string,
  from: string,
  to: string,
): { value: T; rewritten: number } {
  let rewritten = 0
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(visit)
    if (!isRecord(node)) return node
    const copy = Object.fromEntries(Object.entries(node).map(([key, child]) => [key, visit(child)]))
    // Cue 定位器返回副本中已有的对象，改写方不依赖 notice / empty 的容器层数。
    for (const { cue } of dialogueCuesAtNode(copy)) {
      const identity = cue.identity
      if (!isActorCueIdentity(identity) || identity.actor !== actorId) continue
      const portrait = identity.portrait
      if (isRecord(portrait) && portrait.kind === 'expression' && portrait.expression === from) {
        portrait.expression = to
        rewritten++
      }
    }
    return copy
  }
  return { value: visit(value) as T, rewritten }
}
