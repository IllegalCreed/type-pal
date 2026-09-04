/**
 * ActorDef.id 的持久引用分类真值。
 *
 * 这里只定义 schema 字段族的 typed ownership/policy；具体 locator 由编辑器按作者对象构造。
 * 删除门禁、诊断和 UI 必须复用这些 kind，禁止各自维护一份容易漏项的字符串清单。
 */

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

/** Inspect one tagged command/condition node only; callers own recursive traversal. */
export function actorTaggedReferencesAtNode(value: unknown, path: string): ActorTaggedReference[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  const out: ActorTaggedReference[] = []
  const record = value as Record<string, unknown>
  const push = (actorId: unknown, kind: ActorTaggedReference['kind'], leaf: string): void => {
    if (typeof actorId === 'string' && actorId.length > 0)
      out.push({ actorId, kind, where: `${path}.${leaf}` })
  }
  switch (record.kind) {
    case 'inParty':
      push(record.actorId, 'condition-in-party', 'actorId')
      break
    case 'playerInParty':
      push(record.role, 'enemy-condition-player-in-party', 'role')
      break
    case 'setActorSprite':
      push(record.actor, 'command-set-actor-sprite', 'actor')
      break
    case 'setActorAppearance':
      push(record.actor, 'command-set-actor-appearance', 'actor')
      break
    case 'setParty':
      if (Array.isArray(record.members))
        record.members.forEach((actorId, index) => {
          push(actorId, 'command-set-party-member', `members[${index}]`)
        })
      break
    case 'applyActorCondition':
    case 'clearActorCondition':
      push(record.actor, 'command-actor-condition', 'actor')
      break
    case 'applyActorGrowth':
      push(record.actor, 'enemy-apply-actor-growth', 'actor')
      break
    case 'playActorCastEffect':
      push(record.actor, 'enemy-play-actor-cast-effect', 'actor')
      break
    case 'dialog': {
      const cue = record.cue
      if (!cue || typeof cue !== 'object' || Array.isArray(cue)) break
      const identity = (cue as Record<string, unknown>).identity
      if (!identity || typeof identity !== 'object' || Array.isArray(identity)) break
      const identityRecord = identity as Record<string, unknown>
      if (identityRecord.kind === 'actor')
        push(identityRecord.actor, 'dialogue-actor', 'cue.identity.actor')
      break
    }
    default:
      break
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
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    out.push(...actorTaggedReferencesAtNode(record, path))
    for (const [key, child] of Object.entries(record)) visit(child, `${path}.${key}`)
  }
  visit(value, where)
  return out
}

/** One canonical command visit: direct command leaves plus its condition tree, never nested arms. */
export function collectCanonicalActorTaggedReferences(
  command: unknown,
  where: string,
): ActorTaggedReference[] {
  const references = actorTaggedReferencesAtNode(command, where)
  if (!command || typeof command !== 'object' || Array.isArray(command)) return references
  const record = command as Record<string, unknown>
  const condition = record.cond
  if (condition !== undefined)
    references.push(...collectActorTaggedReferences(condition, `${where}.cond`))
  if (record.kind === 'startBattle' && record.choreography !== undefined)
    references.push(...collectActorTaggedReferences(record.choreography, `${where}.choreography`))
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
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    if (record.kind === 'dialog') {
      const cue = record.cue
      const identity =
        cue && typeof cue === 'object' && !Array.isArray(cue)
          ? (cue as Record<string, unknown>).identity
          : undefined
      const identityRecord =
        identity && typeof identity === 'object' && !Array.isArray(identity)
          ? (identity as Record<string, unknown>)
          : undefined
      const portrait = identityRecord?.portrait
      const portraitRecord =
        portrait && typeof portrait === 'object' && !Array.isArray(portrait)
          ? (portrait as Record<string, unknown>)
          : undefined
      if (
        identityRecord?.kind === 'actor' &&
        typeof identityRecord.actor === 'string' &&
        (portraitRecord?.kind === 'default' || portraitRecord?.kind === 'expression')
      )
        out.push({
          actorId: identityRecord.actor,
          portraitKind: portraitRecord.kind,
          ...(portraitRecord.kind === 'expression' && typeof portraitRecord.expression === 'string'
            ? { expression: portraitRecord.expression }
            : {}),
          where: `${path}.cue.identity.portrait`,
        })
    }
    for (const [key, child] of Object.entries(record)) visit(child, `${path}.${key}`)
  }
  visit(value, where)
  return out
}

/** expression key refactor；仅改 exact actor+expression 引用，并返回可审计改写数。 */
export function renameDialoguePortraitExpression<T>(
  value: T,
  actorId: string,
  from: string,
  to: string,
): { value: T; rewritten: number } {
  let rewritten = 0
  const visit = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(visit)
    if (!node || typeof node !== 'object') return node
    const record = node as Record<string, unknown>
    if (record.kind === 'dialog') {
      const cue = record.cue
      const identity =
        cue && typeof cue === 'object' && !Array.isArray(cue)
          ? (cue as Record<string, unknown>).identity
          : undefined
      const identityRecord =
        identity && typeof identity === 'object' && !Array.isArray(identity)
          ? (identity as Record<string, unknown>)
          : undefined
      const portrait = identityRecord?.portrait
      const portraitRecord =
        portrait && typeof portrait === 'object' && !Array.isArray(portrait)
          ? (portrait as Record<string, unknown>)
          : undefined
      if (
        identityRecord?.kind === 'actor' &&
        identityRecord.actor === actorId &&
        portraitRecord?.kind === 'expression' &&
        portraitRecord.expression === from
      ) {
        rewritten++
        return {
          ...Object.fromEntries(Object.entries(record).map(([key, child]) => [key, visit(child)])),
          cue: {
            ...(cue as Record<string, unknown>),
            identity: {
              ...identityRecord,
              portrait: { ...portraitRecord, expression: to },
            },
          },
        }
      }
    }
    return Object.fromEntries(Object.entries(record).map(([key, child]) => [key, visit(child)]))
  }
  return { value: visit(value) as T, rewritten }
}
