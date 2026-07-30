import type {
  AuthorCommandV5,
  AuthorConditionV5,
  Command,
  EnemyOnDefeatedCommandV10,
  ScriptCondition,
  ScriptFlowV5,
  ScriptStage,
  StateTransitionV5,
} from '@type-pal/content'
import type { EditorState } from './edit-session.js'
import {
  type CanonicalScriptReferenceV5,
  describeCanonicalScriptReferenceV5,
  type ScriptEditorStateV5,
  type ScriptV5CommandLocatorV5,
  visitCanonicalScriptCommandsV5,
} from './script-v5-editor.js'

export type ItemReferenceAccess = 'read' | 'lose' | 'consume' | 'reward' | 'hold' | 'configure'

export type ItemReferenceLocator =
  | {
      kind: 'scene-script'
      sceneId: string
      sourceKey: string
      pageIndex?: number
      commandPath?: string
    }
  | { kind: 'shared-script'; scriptId: string; commandPath?: string }
  | { kind: 'shop'; shopId: number }
  | { kind: 'actor'; actorId: string }
  | { kind: 'skill'; skillId: string }
  | { kind: 'enemy'; enemyId: string }
  | { kind: 'poison'; poisonId: number }
  | { kind: 'entry-point'; entryPointId?: string }
  | { kind: 'item'; itemId: string }
  | {
      kind: 'canonical-script'
      reference: Extract<CanonicalScriptReferenceV5, { kind: 'command' }>
    }

export interface ItemReference {
  itemId: string
  access: ItemReferenceAccess
  source:
    | 'scene'
    | 'script'
    | 'shop'
    | 'entry'
    | 'actor'
    | 'skill'
    | 'enemy'
    | 'poison'
    | 'item'
    | 'save'
  label: string
  where: string
  detail: string
  locator?: ItemReferenceLocator
  /** 当前编辑器尚无可解析的精确落点时明确说明，UI 不得伪装成可跳转。 */
  unavailableReason?: string
  /** 删除 owner 自身会一起删除这些边，因此不构成自删除阻塞。 */
  ownerItemId?: string
}

interface ScriptScanContext {
  source: ItemReference['source']
  label: string
  where: string
  locator: Extract<ItemReferenceLocator, { kind: 'scene-script' | 'shared-script' }> | undefined
  unavailableReason?: string
}

function add(
  out: ItemReference[],
  itemId: unknown,
  reference: Omit<ItemReference, 'itemId'>,
): void {
  if (typeof itemId !== 'string' || itemId.length === 0) return
  out.push({ itemId, ...reference })
}

function scanCondition(
  condition: ScriptCondition,
  context: ScriptScanContext,
  path: string,
  out: ItemReference[],
  nestedPath = '',
): void {
  switch (condition.kind) {
    case 'hasItem':
    case 'ownsItem':
    case 'itemEquipped':
      add(out, condition.itemId, {
        access: 'read',
        source: context.source,
        label: context.label,
        where: `${context.where}${path}.cond${nestedPath}`,
        detail:
          condition.kind === 'itemEquipped'
            ? `检查装备数量 ≥ ${condition.atLeast ?? 1}`
            : condition.kind === 'ownsItem'
              ? `检查背包与装备总数 ≥ ${condition.atLeast ?? 1}`
              : `检查背包数量 ≥ ${condition.atLeast ?? 1}`,
        locator: context.locator
          ? { ...context.locator, commandPath: path.replace(/^\//, '') }
          : undefined,
        unavailableReason: context.unavailableReason,
      })
      return
    case 'all':
    case 'any':
      condition.of.forEach((entry, index) => {
        scanCondition(entry, context, path, out, `${nestedPath}.of[${index}]`)
      })
      return
    case 'not':
      scanCondition(condition.cond, context, path, out, `${nestedPath}.cond`)
      return
    default:
      return
  }
}

function commandArms(command: Command): Array<[string, readonly Command[] | undefined]> {
  switch (command.kind) {
    case 'branch':
      return [
        ['then', command.then],
        ['else', command.else],
      ]
    case 'confirm':
      return [['onNo', command.onNo]]
    case 'startBattle':
      return [
        ['onLose', command.onLose],
        ['onFlee', command.onFlee],
      ]
    case 'teleportOut':
      return [['onFail', command.onFail]]
    default:
      return []
  }
}

function scanCommands(
  commands: readonly Command[],
  context: ScriptScanContext,
  prefix: string,
  out: ItemReference[],
): void {
  commands.forEach((command, index) => {
    const path = `${prefix}/${index}`
    const locator = context.locator
      ? { ...context.locator, commandPath: path.replace(/^\//, '') }
      : undefined
    if (command.kind === 'giveItem')
      add(out, command.itemId, {
        access: 'reward',
        source: context.source,
        label: context.label,
        where: `${context.where}${path}.itemId`,
        detail: `给出 ×${command.count ?? 1}`,
        locator,
        unavailableReason: context.unavailableReason,
      })
    else if (command.kind === 'loseItem')
      add(out, command.itemId, {
        access: 'lose',
        source: context.source,
        label: context.label,
        where: `${context.where}${path}.itemId`,
        detail: `失去 ×${command.count ?? 1}`,
        locator,
        unavailableReason: context.unavailableReason,
      })
    else if (command.kind === 'branch') scanCondition(command.cond, context, path, out)

    for (const [segment, body] of commandArms(command))
      if (body?.length) scanCommands(body, context, `${path}/${segment}`, out)

    if (
      command.kind === 'setEntityAuto' ||
      command.kind === 'setEntityTrigger' ||
      command.kind === 'setSceneOnEnter' ||
      command.kind === 'setSceneOnTeleport'
    ) {
      const nestedContext: ScriptScanContext = {
        ...context,
        locator: undefined,
        unavailableReason: '该引用位于页切换指令的嵌套脚本中，当前只能显示来源，尚不能精确聚焦。',
      }
      command.stages?.forEach((stage, stageIndex) => {
        scanCommands(
          stage.entry?.prepare ?? [],
          nestedContext,
          `${path}/stages/${stageIndex}/entry/prepare`,
          out,
        )
        scanCommands(stage.body, nestedContext, `${path}/stages/${stageIndex}/body`, out)
      })
    }
  })
}

function scanStages(
  stages: readonly ScriptStage[] | undefined,
  context: ScriptScanContext,
  out: ItemReference[],
): void {
  stages?.forEach((stage, stageIndex) => {
    scanCommands(stage.entry?.prepare ?? [], context, `${stageIndex}/entry/prepare`, out)
    scanCommands(stage.body, context, String(stageIndex), out)
  })
}

function scanInventory(
  inventory: readonly { itemId: string; count: number }[],
  label: string,
  where: string,
  locator: ItemReferenceLocator | undefined,
  source: 'entry' | 'save',
  out: ItemReference[],
  unavailableReason?: string,
): void {
  inventory.forEach((entry, index) => {
    add(out, entry.itemId, {
      access: 'hold',
      source,
      label,
      where: `${where}.inventory[${index}].itemId`,
      detail: `初始/存档持有 ×${entry.count}`,
      locator,
      unavailableReason,
    })
  })
}

function canonicalReferenceSource(
  locator: ScriptV5CommandLocatorV5,
): Pick<ItemReference, 'source' | 'ownerItemId'> {
  if (locator.owner.kind === 'shared-script') return { source: 'script' }
  if (locator.owner.kind === 'item-private-script')
    return { source: 'item', ownerItemId: locator.owner.itemId }
  return { source: 'scene' }
}

function scanCanonicalCondition(
  condition: AuthorConditionV5,
  addReference: (itemId: string, detail: string, suffix: string) => void,
  suffix = '.cond',
): void {
  switch (condition.kind) {
    case 'hasItem':
    case 'ownsItem':
    case 'itemEquipped':
      addReference(
        condition.itemId,
        condition.kind === 'itemEquipped'
          ? `检查装备数量 ≥ ${condition.atLeast ?? 1}`
          : condition.kind === 'ownsItem'
            ? `检查背包与装备总数 ≥ ${condition.atLeast ?? 1}`
            : `检查背包数量 ≥ ${condition.atLeast ?? 1}`,
        suffix,
      )
      return
    case 'all':
    case 'any':
      condition.of.forEach((entry, index) => {
        scanCanonicalCondition(entry, addReference, `${suffix}.of[${index}]`)
      })
      return
    case 'not':
      scanCanonicalCondition(condition.cond, addReference, `${suffix}.cond`)
      return
    default:
      return
  }
}

function scanEnemyOnDefeatedCommands(
  commands: readonly EnemyOnDefeatedCommandV10[],
  context: ScriptScanContext,
  prefix: string,
  out: ItemReference[],
): void {
  commands.forEach((command, index) => {
    const path = `${prefix}/${index}`
    switch (command.kind) {
      case 'giveItem':
      case 'loseItem':
        add(out, command.itemId, {
          access: command.kind === 'giveItem' ? 'reward' : 'lose',
          source: context.source,
          label: context.label,
          where: `${context.where}${path}.itemId`,
          detail: `${command.kind === 'giveItem' ? '给出' : '失去'} ×${command.count ?? 1}`,
          unavailableReason: context.unavailableReason,
        })
        return
      case 'branch':
        scanCanonicalCondition(
          command.cond,
          (itemId, detail, suffix) =>
            add(out, itemId, {
              access: 'read',
              source: context.source,
              label: context.label,
              where: `${context.where}${path}${suffix}`,
              detail,
              unavailableReason: context.unavailableReason,
            }),
          '.cond',
        )
        scanEnemyOnDefeatedCommands(command.then, context, `${path}/then`, out)
        if (command.else) scanEnemyOnDefeatedCommands(command.else, context, `${path}/else`, out)
        return
      case 'dialog':
      case 'clearDialog':
      case 'wait':
      case 'playSound':
      case 'playMusic':
      case 'stopMusic':
      case 'giveMoney':
      case 'setFlag':
      case 'setVar':
      case 'addVar':
      case 'stopScript':
        return
      default: {
        const unreachable: never = command
        throw new Error(`未知敌人战后命令 ${(unreachable as { kind?: unknown }).kind}`)
      }
    }
  })
}

function scanCanonicalStateTransitionItemReferences(
  transition: StateTransitionV5,
  context: {
    source: 'scene'
    label: string
    where: string
  },
  out: ItemReference[],
): void {
  switch (transition.kind) {
    case 'branch':
      scanCanonicalCondition(
        transition.cond,
        (itemId, detail, suffix) =>
          add(out, itemId, {
            access: 'read',
            source: context.source,
            label: context.label,
            where: `${context.where}${suffix}`,
            detail,
            unavailableReason: '该引用位于连续流程的状态去向条件中；可打开所属方案后编辑。',
          }),
        '.cond',
      )
      scanCanonicalStateTransitionItemReferences(
        transition.then,
        { ...context, where: `${context.where}.then` },
        out,
      )
      scanCanonicalStateTransitionItemReferences(
        transition.else,
        { ...context, where: `${context.where}.else` },
        out,
      )
      return
    case 'commandOutcome':
      scanCanonicalStateTransitionItemReferences(
        transition.then,
        { ...context, where: `${context.where}.then` },
        out,
      )
      scanCanonicalStateTransitionItemReferences(
        transition.else,
        { ...context, where: `${context.where}.else` },
        out,
      )
      return
    default:
      return
  }
}

function scanCanonicalFlowTransitionItemReferences(
  flow: ScriptFlowV5,
  context: { label: string; where: string },
  out: ItemReference[],
): void {
  if (flow.kind !== 'stateMachine') return
  for (const [stateId, state] of Object.entries(flow.machine.states))
    scanCanonicalStateTransitionItemReferences(
      state.next,
      {
        source: 'scene',
        label: `${context.label} / 连续流程“${flow.machine.label}” / 状态“${state.label}”`,
        where: `${context.where}.machine.states.${stateId}.next`,
      },
      out,
    )
}

/** canonical v5 脚本中的物品读取/获得/失去引用；locator 直接复用脚本编辑器稳定定位。 */
export function collectCanonicalItemReferencesV5(state: ScriptEditorStateV5): ItemReference[] {
  const out: ItemReference[] = []

  visitCanonicalScriptCommandsV5(state, (command: AuthorCommandV5, path, commandLocator) => {
    const source = canonicalReferenceSource(commandLocator)
    let reference: Extract<CanonicalScriptReferenceV5, { kind: 'command' }> | undefined
    let label: string | undefined
    const commandReference = (): Extract<CanonicalScriptReferenceV5, { kind: 'command' }> =>
      (reference ??= {
        kind: 'command',
        path,
        locator: commandLocator,
      })
    const commandLabel = (): string =>
      (label ??= describeCanonicalScriptReferenceV5(state, commandReference()))
    const addCommandReference = (
      itemId: string,
      access: ItemReferenceAccess,
      detail: string,
      suffix: string,
    ): void =>
      add(out, itemId, {
        access,
        source: source.source,
        label: commandLabel(),
        where: `${path}${suffix}`,
        detail,
        locator: { kind: 'canonical-script', reference: commandReference() },
        ownerItemId: source.ownerItemId,
      })

    if (command.kind === 'giveItem')
      addCommandReference(command.itemId, 'reward', `获得 ×${command.count ?? 1}`, '.itemId')
    else if (command.kind === 'loseItem')
      addCommandReference(command.itemId, 'lose', `失去 ×${command.count ?? 1}`, '.itemId')
    else if (command.kind === 'branch' || command.kind === 'loop')
      scanCanonicalCondition(command.cond, (itemId, detail, suffix) =>
        addCommandReference(itemId, 'read', detail, suffix),
      )
  })

  for (const scene of state.scenes) {
    for (const entity of scene.entities)
      for (const channel of ['trigger', 'auto'] as const)
        for (const [behaviorId, behavior] of Object.entries(entity.behaviors?.[channel] ?? {}))
          scanCanonicalFlowTransitionItemReferences(
            behavior.flow,
            {
              label: `场景 ${scene.id} / 实体 ${entity.id} / ${channel === 'trigger' ? '交互脚本' : '自动行为'}“${behavior.label}”`,
              where: `scenes.${scene.id}.entities.${entity.id}.behaviors.${channel}.${behaviorId}.flow`,
            },
            out,
          )
    for (const slot of ['onEnter', 'onTeleport'] as const)
      for (const [hookId, hook] of Object.entries(scene.hooks?.[slot]?.variants ?? {}))
        scanCanonicalFlowTransitionItemReferences(
          hook.flow,
          {
            label: `场景 ${scene.id} / ${slot === 'onEnter' ? '进场脚本' : '传送出口脚本'}“${hook.label}”`,
            where: `scenes.${scene.id}.hooks.${slot}.variants.${hookId}.flow`,
          },
          out,
        )
  }

  return out
}

/**
 * 物品删除和右栏检查器共用的全工程闭包。这里不复用旧 RefIndex：它只覆盖场景 page[0]，
 * 也没有共享脚本、开局、商店和战斗数据，不能承担破坏性删除门禁。
 */
export function collectItemReferences(
  state: EditorState,
  canonicalState?: ScriptEditorStateV5,
): ItemReference[] {
  const out: ItemReference[] = []

  state.scenes.forEach((scene, sceneIndex) => {
    const sceneBase = `scenes[${sceneIndex}](${scene.id})`
    scanStages(
      scene.onEnter,
      {
        source: 'scene',
        label: `${scene.id} 进场脚本`,
        where: `${sceneBase}.onEnter`,
        locator: { kind: 'scene-script', sceneId: scene.id, sourceKey: '__onEnter__' },
      },
      out,
    )
    scanStages(
      scene.onTeleport,
      {
        source: 'scene',
        label: `${scene.id} 传送出口`,
        where: `${sceneBase}.onTeleport`,
        locator: { kind: 'scene-script', sceneId: scene.id, sourceKey: '__onTeleport__' },
      },
      out,
    )
    scene.entities.forEach((entity, entityIndex) => {
      entity.pages?.forEach((page, pageIndex) => {
        if (page.trigger)
          scanStages(
            page.trigger.stages,
            {
              source: 'scene',
              label: `${scene.id}/${entity.id} 触发 · 第 ${pageIndex + 1} 页`,
              where: `${sceneBase}.entities[${entityIndex}].pages[${pageIndex}].trigger.stages`,
              locator: {
                kind: 'scene-script',
                sceneId: scene.id,
                sourceKey: `${entity.id}:trigger`,
                pageIndex,
              },
            },
            out,
          )
        if (page.auto)
          scanStages(
            page.auto.stages,
            {
              source: 'scene',
              label: `${scene.id}/${entity.id} 巡逻 · 第 ${pageIndex + 1} 页`,
              where: `${sceneBase}.entities[${entityIndex}].pages[${pageIndex}].auto.stages`,
              locator: {
                kind: 'scene-script',
                sceneId: scene.id,
                sourceKey: `${entity.id}:auto`,
                pageIndex,
              },
            },
            out,
          )
      })
      if (Array.isArray(entity.hostile?.onLose))
        scanCommands(
          entity.hostile.onLose,
          {
            source: 'scene',
            label: `${scene.id}/${entity.id} 战败命令`,
            where: `${sceneBase}.entities[${entityIndex}].hostile.onLose`,
            locator: undefined,
            unavailableReason: '敌对实体的战败命令尚无独立脚本编辑入口。',
          },
          '',
          out,
        )
    })
  })

  for (const [chunkId, chunk] of Object.entries(state.scriptChunks ?? {}))
    for (const [scriptId, body] of Object.entries(chunk.scripts)) {
      const sceneId = /^scene\/([^/]+)\//.exec(scriptId)?.[1]
      const navigable =
        !!state.scriptIndex?.library?.[scriptId] ||
        (!!sceneId && state.scenes.some((scene) => scene.id === sceneId))
      scanCommands(
        body,
        {
          source: 'script',
          label: state.scriptIndex?.library?.[scriptId]?.name
            ? `${state.scriptIndex.library[scriptId]!.name} · ${scriptId}`
            : scriptId,
          where: `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`,
          locator: navigable ? { kind: 'shared-script', scriptId } : undefined,
          unavailableReason: navigable
            ? undefined
            : '该内部脚本未登记为共享脚本，也不属于可打开的场景脚本。',
        },
        '0',
        out,
      )
    }

  ;(state.shops ?? []).forEach((shop, shopIndex) => {
    shop.items.forEach((itemId, itemIndex) => {
      add(out, itemId, {
        access: 'configure',
        source: 'shop',
        label: `商店 ${shop.id}`,
        where: `shops[${shopIndex}](${shop.id}).items[${itemIndex}]`,
        detail: '上架货单',
        locator: { kind: 'shop', shopId: shop.id },
      })
    })
  })

  scanInventory(
    state.manifest.startWorld.inventory,
    '默认开局',
    'manifest.startWorld',
    { kind: 'entry-point' },
    'entry',
    out,
  )
  state.manifest.entryPoints?.forEach((entry, entryIndex) => {
    if (!entry.startWorld) return
    scanInventory(
      entry.startWorld.inventory,
      `入口 ${entry.label}`,
      `manifest.entryPoints[${entryIndex}](${entry.id}).startWorld`,
      { kind: 'entry-point', entryPointId: entry.id },
      'entry',
      out,
    )
  })

  state.actors.forEach((actor, actorIndex) => {
    for (const [slot, itemId] of Object.entries(actor.battler?.initialEquipment ?? {}))
      add(out, itemId, {
        access: 'hold',
        source: 'actor',
        label: `角色 ${actor.id}`,
        where: `actors[${actorIndex}](${actor.id}).battler.initialEquipment.${slot}`,
        detail: `初始装备 · ${slot}`,
        locator: { kind: 'actor', actorId: actor.id },
      })
  })

  state.skills.forEach((skill, skillIndex) => {
    skill.cost?.items?.forEach((entry, entryIndex) => {
      add(out, entry.itemId, {
        access: 'consume',
        source: 'skill',
        label: `技能 ${skill.name || skill.id}`,
        where: `skills[${skillIndex}](${skill.id}).cost.items[${entryIndex}].itemId`,
        detail: `施放消耗 ×${entry.amount}`,
        locator: { kind: 'skill', skillId: skill.id },
      })
    })
  })

  ;(state.enemies ?? []).forEach((enemy, enemyIndex) => {
    if (enemy.steal)
      add(out, enemy.steal.itemId, {
        access: 'reward',
        source: 'enemy',
        label: `敌人 ${enemy.id}`,
        where: `enemies[${enemyIndex}](${enemy.id}).steal.itemId`,
        detail: `可偷取 ×${enemy.steal.count}`,
        locator: { kind: 'enemy', enemyId: enemy.id },
      })
    if (enemy.attackEquivItem)
      add(out, enemy.attackEquivItem.itemId, {
        access: 'read',
        source: 'enemy',
        label: `敌人 ${enemy.id}`,
        where: `enemies[${enemyIndex}](${enemy.id}).attackEquivItem.itemId`,
        detail: `普攻附带 · ${enemy.attackEquivItem.rate}%`,
        locator: { kind: 'enemy', enemyId: enemy.id },
      })
    if (enemy.onDefeated)
      scanEnemyOnDefeatedCommands(
        enemy.onDefeated,
        {
          source: 'enemy',
          label: `敌人 ${enemy.id} 战后剧情`,
          where: `enemies[${enemyIndex}](${enemy.id}).onDefeated`,
          locator: undefined,
          unavailableReason: '敌人战后剧情尚无精确命令跳转入口。',
        },
        '',
        out,
      )
  })

  ;(state.poisons ?? []).forEach((poison, poisonIndex) => {
    for (const [side, ticks] of [
      ['playerTicks', poison.playerTicks],
      ['enemyTicks', poison.enemyTicks],
    ] as const)
      ticks?.forEach((tick, tickIndex) => {
        if (!tick.grantItem) return
        add(out, tick.grantItem, {
          access: 'reward',
          source: 'poison',
          label: `毒 ${poison.name}`,
          where: `poisons[${poisonIndex}](${poison.id}).${side}[${tickIndex}].grantItem`,
          detail: '毒发到期产出',
          locator: { kind: 'poison', poisonId: poison.id },
        })
      })
  })

  state.items.forEach((item, itemIndex) => {
    item.use?.effects.forEach((effect, effectIndex) => {
      if (effect.kind === 'craftRecipe')
        effect.recipes.forEach((recipe, recipeIndex) => {
          for (const [field, entries, access] of [
            ['ingredients', recipe.ingredients, 'consume'],
            ['products', recipe.products, 'reward'],
          ] as const)
            entries.forEach((entry, entryIndex) => {
              add(out, entry.itemId, {
                access,
                source: 'item',
                label: `物品 ${item.name}`,
                where: `items[${itemIndex}](${item.id}).use.effects[${effectIndex}].recipes[${recipeIndex}].${field}[${entryIndex}].itemId`,
                detail:
                  field === 'ingredients' ? `配方材料 ×${entry.count}` : `配方产物 ×${entry.count}`,
                locator: { kind: 'item', itemId: item.id },
                ownerItemId: item.id,
              })
            })
        })
      if (effect.kind === 'drawFromResourcePool')
        effect.rewards.forEach((entry, rewardIndex) => {
          add(out, entry.itemId, {
            access: 'reward',
            source: 'item',
            label: `物品 ${item.name}`,
            where: `items[${itemIndex}](${item.id}).use.effects[${effectIndex}].rewards[${rewardIndex}].itemId`,
            detail: `资源池第 ${rewardIndex + 1} 档 ×${entry.count}`,
            locator: { kind: 'item', itemId: item.id },
            ownerItemId: item.id,
          })
        })
    })
  })

  state.worlds?.forEach((world, worldIndex) => {
    scanInventory(
      world.inventory,
      `存档 ${worldIndex + 1}`,
      `worlds[${worldIndex}]`,
      undefined,
      'save',
      out,
      '运行态存档只读，没有作者对象可供精确跳转。',
    )
    for (const [collection, characters] of [
      ['party', world.party],
      ['reserve', world.reserve ?? []],
    ] as const)
      characters.forEach((character, characterIndex) => {
        for (const [slot, itemId] of Object.entries(character.equipment))
          if (itemId)
            add(out, itemId, {
              access: 'hold',
              source: 'save',
              label: `存档 ${worldIndex + 1}`,
              where: `worlds[${worldIndex}].${collection}[${characterIndex}].equipment.${slot}`,
              detail: '运行态装备',
              unavailableReason: '运行态存档只读，没有作者对象可供精确跳转。',
            })
      })

    for (const [sceneId, override] of Object.entries(world.script?.sceneScriptOverrides ?? {})) {
      for (const [slot, binding] of [
        ['onEnter', override.onEnter],
        ['onTeleport', override.onTeleport],
      ] as const) {
        if (!Array.isArray(binding)) continue
        scanStages(
          binding,
          {
            source: 'save',
            label: `存档 ${worldIndex + 1} · 场景 ${sceneId} ${slot} 覆写`,
            where: `worlds[${worldIndex}].script.sceneScriptOverrides[${JSON.stringify(sceneId)}].${slot}`,
            locator: undefined,
            unavailableReason: '运行态存档只读，没有作者对象可供精确跳转。',
          },
          out,
        )
      }
    }
  })

  if (canonicalState) out.push(...collectCanonicalItemReferencesV5(canonicalState))
  return out
}

export function itemReferenceMap(
  state: EditorState,
  canonicalState?: ScriptEditorStateV5,
): Map<string, ItemReference[]> {
  const result = new Map<string, ItemReference[]>()
  for (const reference of collectItemReferences(state, canonicalState)) {
    const list = result.get(reference.itemId) ?? []
    list.push(reference)
    result.set(reference.itemId, list)
  }
  return result
}

export function blockingItemReferences(
  state: EditorState,
  itemId: string,
  canonicalState?: ScriptEditorStateV5,
): ItemReference[] {
  return collectItemReferences(state, canonicalState).filter(
    (reference) => reference.itemId === itemId && reference.ownerItemId !== itemId,
  )
}
