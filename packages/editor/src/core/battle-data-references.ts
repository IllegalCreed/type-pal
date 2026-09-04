import {
  collectActorConditionPoisonReferences,
  collectPoisonDefinitionReferences,
  collectSkillPoisonReferences,
} from '@type-pal/content'
import type { EditorState } from './edit-session.js'

export type BattleDataReferenceLocator =
  | { kind: 'actor'; actorId: string }
  | { kind: 'item'; itemId: string }
  | { kind: 'skill'; skillId: string }
  | { kind: 'enemy'; enemyId: string }
  | { kind: 'poison'; poisonId: number }
  | { kind: 'scene'; sceneId: string }
  | { kind: 'shared-script'; scriptId: string }
  | { kind: 'entry-point'; entryPointId: string }
  | { kind: 'enemy-team'; enemyTeamId: string }

export type BattleDataReferenceKind =
  | 'actor-initial-magic'
  | 'actor-cooperative-magic'
  | 'level-up'
  | 'item-grant-skill'
  | 'enemy-cast'
  | 'command-learn-skill'
  | 'world-learned-skill'
  | 'world-skill-use-count'
  | 'enemy-team-slot'
  | 'enemy-transform'
  | 'enemy-summon'
  | 'poison-counter'
  | 'poison-lethal-pair'
  | 'entry-point-seed-poison'
  | 'command-actor-condition-poison'
  | 'skill-poison'
  | 'item-poison'
  | 'world-active-poison'

export interface BattleDataReference {
  target: 'skill' | 'enemy' | 'poison'
  targetId: string
  kind: BattleDataReferenceKind
  label: string
  where: string
  detail: string
  locator?: BattleDataReferenceLocator
}

function add(
  output: BattleDataReference[],
  target: BattleDataReference['target'],
  targetId: unknown,
  value: Omit<BattleDataReference, 'target' | 'targetId'>,
): void {
  if (
    (typeof targetId !== 'string' && typeof targetId !== 'number') ||
    String(targetId).length === 0
  )
    return
  output.push({ target, targetId: String(targetId), ...value })
}

/**
 * 只识别有明确 `kind` 判别字段的动作/效果；不会把普通同名属性猜成引用。
 * Enemy choreography/onDefeated 的嵌套 arm 也因此无需复制一套递归结构。
 */
function visitTagged(
  value: unknown,
  where: string,
  visit: (node: Record<string, unknown>, where: string) => void,
): void {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      visitTagged(entry, `${where}[${index}]`, visit)
    })
    return
  }
  if (!value || typeof value !== 'object') return
  const record = value as Record<string, unknown>
  if (typeof record.kind === 'string') visit(record, where)
  for (const [key, child] of Object.entries(record)) visitTagged(child, `${where}.${key}`, visit)
}

function collectSkillReferences(state: EditorState): BattleDataReference[] {
  const output: BattleDataReference[] = []
  ;(state.actors ?? []).forEach((actor, actorIndex) => {
    actor.battler?.initialMagic?.forEach((skillId, index) => {
      add(output, 'skill', skillId, {
        kind: 'actor-initial-magic',
        label: `人物 ${actor.id}`,
        where: `actors[${actorIndex}](${actor.id}).battler.initialMagic[${index}]`,
        detail: '初始仙术',
        locator: { kind: 'actor', actorId: actor.id },
      })
    })
    if (actor.battler?.cooperativeMagicSkillId)
      add(output, 'skill', actor.battler.cooperativeMagicSkillId, {
        kind: 'actor-cooperative-magic',
        label: `人物 ${actor.id}`,
        where: `actors[${actorIndex}](${actor.id}).battler.cooperativeMagicSkillId`,
        detail: '角色专属合体技',
        locator: { kind: 'actor', actorId: actor.id },
      })
  })

  for (const [actorId, rows] of Object.entries(state.levelUp ?? {}))
    rows.forEach((row, index) => {
      add(output, 'skill', row.skillId, {
        kind: 'level-up',
        label: `人物 ${actorId} 的升级曲线`,
        where: `levelUp.${actorId}[${index}].skillId`,
        detail: `${row.level} 级习得`,
        locator: { kind: 'actor', actorId },
      })
    })

  ;(state.items ?? []).forEach((item, itemIndex) => {
    item.equip?.effects.forEach((effect, effectIndex) => {
      if (effect.kind !== 'grantSkill') return
      add(output, 'skill', effect.skillId, {
        kind: 'item-grant-skill',
        label: `物品 ${item.name}`,
        where: `items[${itemIndex}](${item.id}).equip.effects[${effectIndex}].skillId`,
        detail: '装备后授予技能',
        locator: { kind: 'item', itemId: item.id },
      })
    })
  })

  ;(state.enemies ?? []).forEach((enemy, enemyIndex) => {
    visitTagged(enemy, `enemies[${enemyIndex}](${enemy.id})`, (node, where) => {
      if (node.kind !== 'cast') return
      add(output, 'skill', node.skillId, {
        kind: 'enemy-cast',
        label: `敌人 ${enemy.id}`,
        where: `${where}.skillId`,
        detail: '敌人 AI / 演出施法',
        locator: { kind: 'enemy', enemyId: enemy.id },
      })
    })
  })
  return output
}

function collectEnemyReferences(state: EditorState): BattleDataReference[] {
  const output: BattleDataReference[] = []
  ;(state.enemyTeams ?? []).forEach((team, teamIndex) => {
    team.slots.forEach((enemyId, slotIndex) => {
      if (!enemyId) return
      add(output, 'enemy', enemyId, {
        kind: 'enemy-team-slot',
        label: `敌队 ${team.id}`,
        where: `enemyTeams[${teamIndex}](${team.id}).slots[${slotIndex}]`,
        detail: `敌队槽位 ${slotIndex + 1}`,
        locator: { kind: 'enemy-team', enemyTeamId: team.id },
      })
    })
  })
  ;(state.enemies ?? []).forEach((owner, ownerIndex) => {
    visitTagged(owner, `enemies[${ownerIndex}](${owner.id})`, (node, where) => {
      if (node.kind !== 'transform' && node.kind !== 'summon') return
      if (node.enemyId === undefined) return
      add(output, 'enemy', node.enemyId, {
        kind: node.kind === 'transform' ? 'enemy-transform' : 'enemy-summon',
        label: `敌人 ${owner.id}`,
        where: `${where}.enemyId`,
        detail: node.kind === 'transform' ? '变身目标' : '召唤目标',
        locator: { kind: 'enemy', enemyId: owner.id },
      })
    })
  })
  return output
}

function collectPoisonReferences(
  state: EditorState,
  includeScriptCommands: boolean,
): BattleDataReference[] {
  const output: BattleDataReference[] = []
  const collectActorConditionCommands = (
    value: unknown,
    where: string,
    label: string,
    locator?: BattleDataReferenceLocator,
  ): void => {
    for (const reference of collectActorConditionPoisonReferences(value, where))
      add(output, 'poison', reference.poisonId, {
        kind: 'command-actor-condition-poison',
        label,
        where: reference.where,
        detail: '剧情施毒或指定解毒',
        locator,
      })
  }

  state.manifest.entryPoints.forEach((entry, entryIndex) => {
    for (const [actorId, seed] of Object.entries(entry.startWorld.seedConditions ?? {}))
      seed.poisonIds?.forEach((poisonId, poisonIndex) => {
        add(output, 'poison', poisonId, {
          kind: 'entry-point-seed-poison',
          label: `入口 ${entry.label} / 角色 ${actorId}`,
          where: `manifest.entryPoints[${entryIndex}](${entry.id}).startWorld.seedConditions.${actorId}.poisonIds[${poisonIndex}]`,
          detail: '开局当前中毒状态',
          locator: { kind: 'entry-point', entryPointId: entry.id },
        })
      })
  })

  if (includeScriptCommands) {
    ;(state.scenes ?? []).forEach((scene, sceneIndex) => {
      collectActorConditionCommands(
        scene,
        `scenes[${sceneIndex}](${scene.id})`,
        `场景 ${scene.id}`,
        {
          kind: 'scene',
          sceneId: scene.id,
        },
      )
    })
  }
  ;(state.skills ?? []).forEach((skill, skillIndex) => {
    for (const reference of collectSkillPoisonReferences(
      skill,
      `skills[${skillIndex}](${skill.id})`,
    ))
      add(output, 'poison', reference.poisonId, {
        kind: 'skill-poison',
        label: `技能 ${skill.name}`,
        where: reference.where,
        detail: reference.use === 'apply' ? '施加毒' : '指定解毒',
        locator: { kind: 'skill', skillId: skill.id },
      })
  })
  ;(state.items ?? []).forEach((item, itemIndex) => {
    visitTagged(item, `items[${itemIndex}](${item.id})`, (node, where) => {
      if (node.kind !== 'applyPoison' && node.kind !== 'curePoison') return
      if (node.poisonId === undefined) return
      add(output, 'poison', node.poisonId, {
        kind: 'item-poison',
        label: `物品 ${item.name}`,
        where: `${where}.poisonId`,
        detail: node.kind === 'applyPoison' ? '施加毒' : '指定解毒',
        locator: { kind: 'item', itemId: item.id },
      })
    })
  })
  if (includeScriptCommands) {
    ;(state.items ?? []).forEach((item, itemIndex) => {
      collectActorConditionCommands(item, `items[${itemIndex}](${item.id})`, `物品 ${item.name}`, {
        kind: 'item',
        itemId: item.id,
      })
    })
    for (const [chunkId, chunk] of Object.entries(state.scriptChunks ?? {}))
      for (const [scriptId, body] of Object.entries(chunk.scripts))
        collectActorConditionCommands(
          body,
          `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`,
          `脚本 ${scriptId}`,
          { kind: 'shared-script', scriptId },
        )
    for (const [scriptId, script] of Object.entries(state.sharedScripts ?? {}))
      collectActorConditionCommands(
        script.body,
        `sharedScripts.${scriptId}.body`,
        `共享脚本 ${script.name}`,
        { kind: 'shared-script', scriptId },
      )
  }
  ;(state.enemies ?? []).forEach((enemy, enemyIndex) => {
    collectActorConditionCommands(
      enemy,
      `enemies[${enemyIndex}](${enemy.id})`,
      `敌人 ${enemy.id}`,
      { kind: 'enemy', enemyId: enemy.id },
    )
  })
  const poisons = state.poisons ?? []
  for (const reference of collectPoisonDefinitionReferences(poisons)) {
    const owner = poisons.find((poison) => poison.id === reference.ownerId)
    if (!owner) continue
    add(output, 'poison', reference.poisonId, {
      kind: reference.kind,
      label: `毒 ${owner.name}`,
      where: reference.where,
      detail: reference.kind === 'poison-lethal-pair' ? '致死配对' : '相克关系',
      locator: { kind: 'poison', poisonId: reference.ownerId },
    })
  }
  return output
}

export function collectBattleDataReferences(
  state: EditorState,
  target: BattleDataReference['target'],
  options: { includeScriptCommands?: boolean } = {},
): BattleDataReference[] {
  const references =
    target === 'skill'
      ? collectSkillReferences(state)
      : target === 'enemy'
        ? collectEnemyReferences(state)
        : collectPoisonReferences(state, options.includeScriptCommands !== false)
  return references.sort((left, right) =>
    left.where < right.where ? -1 : left.where > right.where ? 1 : 0,
  )
}
