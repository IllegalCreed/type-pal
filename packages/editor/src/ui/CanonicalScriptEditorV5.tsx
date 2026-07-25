import type {
  ActorDef,
  AmbienceDef,
  AssetCatalogV1,
  AuthorCommandV5,
  AuthorConditionV5,
  BattleSpriteDef,
  Command,
  EntityAddress,
  Locale,
  SceneDef,
  ScriptFlowV5,
  ShopDef,
  SpriteDef,
  StateTransitionV5,
} from '@type-pal/content'
import type { AssetBase, AudioAssetReader } from '@type-pal/reforge'
import { useEffect, useMemo, useState } from 'react'
import {
  type AuthorCommandChildKeyV5,
  type AuthorCommandPathV5,
  formatAuthorCommandPathV5,
  getAuthorCommandAtV5,
  insertAuthorCommandAfterV5,
  moveAuthorCommandAtV5,
  parseAuthorCommandPathV5,
  removeAuthorCommandAtV5,
  updateAuthorCommandAtV5,
} from '../core/author-command-edit-v5.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { ScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import type { ScriptEditorStateV5 } from '../core/script-v5-editor.js'
import { stateTransitionExecutionLabelV5 } from '../core/script-v5-editor.js'
import { CommandForm } from './CommandForm.js'

export interface CanonicalScriptEditorContextV5 {
  state: ScriptEditorStateV5
  currentSceneId?: string
  shellScenes: SceneDef[]
  locale: Locale
  assetCatalog: AssetCatalogV1
  audioResolver: AudioAssetReader
  assetReader: EditorAssetReader
  references: ScriptReferenceCatalog
  assetBase?: AssetBase
  actors?: Record<string, ActorDef>
  battleSprites: readonly BattleSpriteDef[]
  sprites?: readonly SpriteDef[]
  ambiences?: AmbienceDef[]
  shops?: ShopDef[]
  hasImplicitSelf?: boolean
  onOpenScript?: (id: string) => void
  onOpenSound?: (id: string) => void
  onOpenImage?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
  onOpenSpriteAction?: (spriteId: string, actionId: string) => void
}

interface DescribedCommandV5 {
  icon: string
  label: string
  detail?: string
  children: Array<{
    key: AuthorCommandChildKeyV5
    label: string
    body: readonly AuthorCommandV5[]
  }>
}

function addressLabel(address: EntityAddress): string {
  return `${address.scene}/${address.entity}`
}

function conditionLabel(condition: AuthorConditionV5): string {
  switch (condition.kind) {
    case 'flag':
      return `${condition.flag} ${condition.is ? '为真' : '为假'}`
    case 'var':
      return `${condition.var} ${condition.op} ${condition.value}`
    case 'entityState':
      return `${addressLabel(condition.target)} 状态 = ${condition.is}`
    case 'entityInScene':
      return `${addressLabel(condition.target)} 在场`
    case 'facingEntity':
      return `面向 ${addressLabel(condition.target)}`
    case 'chance':
      return `${condition.percent}% 概率`
    case 'hasItem':
    case 'ownsItem':
    case 'itemEquipped':
      return `${condition.kind} ${condition.itemId}`
    case 'allFullHp':
      return '全队满血'
    case 'hasMoney':
      return `金钱 ≥ ${condition.atLeast}`
    case 'inParty':
      return `队伍包含 ${condition.actorId}`
    case 'all':
      return condition.of.map(conditionLabel).join(' 且 ')
    case 'any':
      return condition.of.map(conditionLabel).join(' 或 ')
    case 'not':
      return `非（${conditionLabel(condition.cond)}）`
  }
}

function commandChildren(command: AuthorCommandV5): DescribedCommandV5['children'] {
  switch (command.kind) {
    case 'branch':
      return [
        { key: 'then', label: '满足条件', body: command.then },
        { key: 'else', label: '不满足条件', body: command.else ?? [] },
      ]
    case 'loop':
      return [{ key: 'body', label: '循环正文', body: command.body }]
    case 'confirm':
      return [{ key: 'onNo', label: '选择“否”', body: command.onNo }]
    case 'startBattle':
      return [
        { key: 'onLose', label: '战败', body: command.onLose ?? [] },
        { key: 'onFlee', label: '逃跑', body: command.onFlee ?? [] },
      ]
    case 'teleportOut':
      return [{ key: 'onFail', label: '无法传送', body: command.onFail ?? [] }]
    default:
      return []
  }
}

function describeCommand(command: AuthorCommandV5): DescribedCommandV5 {
  const children = commandChildren(command)
  switch (command.kind) {
    case 'dialog':
      return {
        icon: '💬',
        label: command.cue.rows.map((row) => row.text).join(' / ') || '空对话',
        detail: command.cue.speaker,
        children,
      }
    case 'wait':
      return { icon: '⏱', label: `等待 ${command.ms}ms`, children }
    case 'setFlag':
      return {
        icon: '🚩',
        label: `${command.flag} = ${command.value ? '真' : '假'}`,
        children,
      }
    case 'setVar':
      return { icon: '🔢', label: `${command.var} = ${command.value}`, children }
    case 'addVar':
      return {
        icon: '🔢',
        label: `${command.var} ${command.delta >= 0 ? '+' : ''}${command.delta}`,
        children,
      }
    case 'giveItem':
      return { icon: '🎁', label: `获得 ${command.itemId} ×${command.count ?? 1}`, children }
    case 'loseItem':
      return { icon: '📤', label: `失去 ${command.itemId} ×${command.count ?? 1}`, children }
    case 'branch':
      return { icon: '🔀', label: `如果 ${conditionLabel(command.cond)}`, children }
    case 'loop':
      return {
        icon: '🔁',
        label: `${command.mode === 'while' ? '当' : '直到'} ${conditionLabel(command.cond)}`,
        detail: `每轮让步 · 最多 ${command.maxIterations} 次`,
        children,
      }
    case 'confirm':
      return { icon: '❓', label: '是/否询问', detail: command.id, children }
    case 'callScript':
      return {
        icon: '↪',
        label: `调用共享脚本 ${command.script}`,
        detail: command.self ? `self=${addressLabel(command.self)}` : undefined,
        children,
      }
    case 'selectEntityBehavior':
      return {
        icon: '🔗',
        label: `${addressLabel(command.target)} 选择${command.channel === 'trigger' ? '触发' : '自动'}行为`,
        detail:
          command.selection.kind === 'use'
            ? command.selection.value
            : command.selection.kind === 'disabled'
              ? '显式禁用'
              : '继承',
        children,
      }
    case 'selectEntityPage':
      return {
        icon: '📄',
        label: `${addressLabel(command.target)} 选择页面`,
        detail: command.selection.kind === 'use' ? command.selection.value : '继承',
        children,
      }
    case 'setEntityTriggerActivation':
      return {
        icon: '🖱',
        label: `${addressLabel(command.target)} 触发方式`,
        detail:
          command.selection.kind === 'use'
            ? `${command.selection.value.on}${command.selection.value.range ?? ''}`
            : command.selection.kind === 'disabled'
              ? '禁用'
              : '继承',
        children,
      }
    case 'selectSceneHooks':
      return { icon: '🪝', label: `${command.scene} 选择场景钩子`, children }
    case 'setEntityState':
      return {
        icon: '👁',
        label: `${addressLabel(command.target)} 状态 → ${command.state}`,
        children,
      }
    case 'setMultiEntityState':
      return {
        icon: '👁',
        label: `${command.targets.length} 个实体状态 → ${command.state}`,
        children,
      }
    case 'moveEntity':
      return {
        icon: '🚶',
        label: `${addressLabel(command.target)} 走到 (${command.to.col},${command.to.row})`,
        detail: command.speed,
        children,
      }
    case 'setEntityFacing':
      return {
        icon: '🧭',
        label: `${addressLabel(command.target)} 转向 ${command.facing}`,
        children,
      }
    case 'playEntityAction':
      return {
        icon: '▶',
        label: `${addressLabel(command.target)} 播放 ${command.sprite}/${command.action}`,
        children,
      }
    case 'startBattle':
      return { icon: '⚔', label: `战斗敌队 ${command.team}`, children }
    default:
      return { icon: '•', label: command.kind, children }
  }
}

function commandPathAfterInsert(path: AuthorCommandPathV5): string {
  const last = path.at(-1)
  if (typeof last !== 'number') return formatAuthorCommandPathV5(path)
  return formatAuthorCommandPathV5([...path.slice(0, -1), last + 1])
}

function CommandRowsV5(props: {
  body: readonly AuthorCommandV5[]
  parentPath: AuthorCommandPathV5
  selectedPath?: string
  onSelect: (path: string) => void
  onInsert: (path: string) => void
  onMove: (path: string, direction: -1 | 1) => void
  onRemove: (path: string) => void
}) {
  if (!props.body.length)
    return (
      <button
        type="button"
        className="canonical-script-empty-add"
        onClick={() => props.onInsert(formatAuthorCommandPathV5([...props.parentPath, -1]))}
      >
        ＋ 添加第一条指令
      </button>
    )
  return (
    <div className="canonical-command-list">
      {props.body.map((command, index) => {
        const path = formatAuthorCommandPathV5([...props.parentPath, index])
        const description = describeCommand(command)
        return (
          <div className="canonical-command-node" key={path}>
            <button
              type="button"
              className={`canonical-command-row${props.selectedPath === path ? ' selected' : ''}`}
              onClick={() => props.onSelect(path)}
            >
              <span>{description.icon}</span>
              <strong>{description.label}</strong>
              {description.detail ? <small>{description.detail}</small> : null}
            </button>
            <div className="canonical-command-actions">
              <button type="button" title="在此后插入" onClick={() => props.onInsert(path)}>
                ＋
              </button>
              <button
                type="button"
                title="上移"
                disabled={index === 0}
                onClick={() => props.onMove(path, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                title="下移"
                disabled={index === props.body.length - 1}
                onClick={() => props.onMove(path, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="danger"
                title="删除"
                onClick={() => props.onRemove(path)}
              >
                ×
              </button>
            </div>
            {description.children.map((child) => (
              <section className="canonical-command-child" key={child.key}>
                <header>
                  <span>{child.label}</span>
                  <small>{child.body.length} 条</small>
                </header>
                <CommandRowsV5
                  body={child.body}
                  parentPath={[...props.parentPath, index, child.key]}
                  selectedPath={props.selectedPath}
                  onSelect={props.onSelect}
                  onInsert={props.onInsert}
                  onMove={props.onMove}
                  onRemove={props.onRemove}
                />
              </section>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function defaultCondition(
  kind: AuthorConditionV5['kind'],
  target?: EntityAddress,
): AuthorConditionV5 {
  switch (kind) {
    case 'flag':
      return { kind, flag: 'my-flag', is: true }
    case 'var':
      return { kind, var: 'my-var', op: '==', value: 0 }
    case 'entityState':
      return { kind, target: target ?? { scene: 'scene', entity: 'entity' }, is: 1 }
    case 'entityInScene':
      return { kind, target: target ?? { scene: 'scene', entity: 'entity' } }
    case 'facingEntity':
      return { kind, target: target ?? { scene: 'scene', entity: 'entity' }, range: 1 }
    case 'chance':
      return { kind, percent: 50 }
    case 'hasItem':
    case 'ownsItem':
    case 'itemEquipped':
      return { kind, itemId: 'item', atLeast: 1 }
    case 'allFullHp':
      return { kind }
    case 'hasMoney':
      return { kind, atLeast: 0 }
    case 'inParty':
      return { kind, actorId: 'actor' }
    case 'all':
    case 'any':
      return { kind, of: [{ kind: 'flag', flag: 'my-flag', is: true }] }
    case 'not':
      return { kind, cond: { kind: 'flag', flag: 'my-flag', is: true } }
  }
}

function EntityAddressEditorV5(props: {
  value: EntityAddress
  state?: ScriptEditorStateV5
  onChange: (value: EntityAddress) => void
}) {
  const scenes = props.state?.scenes ?? []
  const scene = scenes.find((candidate) => candidate.id === props.value.scene)
  return (
    <div className="canonical-address-editor">
      <div className="canonical-address-field">
        <span>场景</span>
        {scenes.length ? (
          <select
            className="in"
            aria-label="场景"
            value={props.value.scene}
            onChange={(event) => {
              const nextScene = scenes.find((candidate) => candidate.id === event.target.value)
              props.onChange({
                scene: event.target.value,
                entity: nextScene?.entities[0]?.id ?? props.value.entity,
              })
            }}
          >
            {!scene ? (
              <option value={props.value.scene}>{props.value.scene}（引用失效）</option>
            ) : null}
            {scenes.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.id}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="in"
            aria-label="场景"
            value={props.value.scene}
            onChange={(event) => props.onChange({ ...props.value, scene: event.target.value })}
          />
        )}
      </div>
      <div className="canonical-address-field">
        <span>实体</span>
        {scene?.entities.length ? (
          <select
            className="in"
            aria-label="实体"
            value={props.value.entity}
            onChange={(event) => props.onChange({ ...props.value, entity: event.target.value })}
          >
            {!scene.entities.some((candidate) => candidate.id === props.value.entity) ? (
              <option value={props.value.entity}>{props.value.entity}（引用失效）</option>
            ) : null}
            {scene.entities.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.id}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="in"
            aria-label="实体"
            value={props.value.entity}
            onChange={(event) => props.onChange({ ...props.value, entity: event.target.value })}
          />
        )}
      </div>
    </div>
  )
}

function ConditionEditorV5(props: {
  value: AuthorConditionV5
  state?: ScriptEditorStateV5
  references?: ScriptReferenceCatalog
  onChange: (condition: AuthorConditionV5) => void
}) {
  const patch = (value: Record<string, unknown>): void =>
    props.onChange({ ...props.value, ...value } as AuthorConditionV5)
  const target =
    props.value.kind === 'entityState' ||
    props.value.kind === 'entityInScene' ||
    props.value.kind === 'facingEntity'
      ? props.value.target
      : undefined
  const firstTarget = props.state?.scenes[0]?.entities[0]
    ? {
        scene: props.state.scenes[0]!.id,
        entity: props.state.scenes[0]!.entities[0]!.id,
      }
    : undefined
  return (
    <div className="canonical-condition-editor">
      <label>
        <span>条件</span>
        <select
          className="in"
          value={props.value.kind}
          onChange={(event) =>
            props.onChange(
              defaultCondition(
                event.target.value as AuthorConditionV5['kind'],
                target ?? firstTarget,
              ),
            )
          }
        >
          <option value="flag">开关</option>
          <option value="var">数值</option>
          <option value="chance">概率</option>
          <option value="hasItem">背包持有物品</option>
          <option value="ownsItem">拥有物品</option>
          <option value="itemEquipped">已装备物品</option>
          <option value="entityState">实体状态</option>
          <option value="entityInScene">实体在场</option>
          <option value="facingEntity">面向实体</option>
          <option value="allFullHp">全队满血</option>
          <option value="hasMoney">金钱</option>
          <option value="inParty">队伍成员</option>
          <option value="all">全部满足</option>
          <option value="any">任一满足</option>
          <option value="not">取反</option>
        </select>
      </label>
      {props.value.kind === 'flag' ? (
        <>
          <label>
            <span>开关 id</span>
            <input
              className="in"
              value={props.value.flag}
              onChange={(event) => patch({ flag: event.target.value })}
            />
          </label>
          <label>
            <span>期望</span>
            <select
              className="in"
              value={props.value.is ? 'true' : 'false'}
              onChange={(event) => patch({ is: event.target.value === 'true' })}
            >
              <option value="true">为真</option>
              <option value="false">为假</option>
            </select>
          </label>
        </>
      ) : null}
      {props.value.kind === 'var' ? (
        <>
          <label>
            <span>数值 id</span>
            <input
              className="in"
              value={props.value.var}
              onChange={(event) => patch({ var: event.target.value })}
            />
          </label>
          <label>
            <span>比较</span>
            <select
              className="in"
              value={props.value.op}
              onChange={(event) =>
                patch({
                  op: event.target.value as Extract<AuthorConditionV5, { kind: 'var' }>['op'],
                })
              }
            >
              {['==', '!=', '>=', '<=', '>', '<'].map((op) => (
                <option key={op}>{op}</option>
              ))}
            </select>
          </label>
          <label>
            <span>值</span>
            <input
              className="in"
              type="number"
              value={props.value.value}
              onChange={(event) => patch({ value: Number(event.target.value) })}
            />
          </label>
        </>
      ) : null}
      {props.value.kind === 'chance' ? (
        <label>
          <span>概率 %</span>
          <input
            className="in"
            type="number"
            min={0}
            max={100}
            value={props.value.percent}
            onChange={(event) =>
              patch({ percent: Math.max(0, Math.min(100, Number(event.target.value))) })
            }
          />
        </label>
      ) : null}
      {props.value.kind === 'hasItem' ||
      props.value.kind === 'ownsItem' ||
      props.value.kind === 'itemEquipped' ? (
        <>
          <label>
            <span>物品</span>
            <select
              className="in"
              value={props.value.itemId}
              onChange={(event) => patch({ itemId: event.target.value })}
            >
              {!props.references?.has('item', props.value.itemId) ? (
                <option value={props.value.itemId}>{props.value.itemId}</option>
              ) : null}
              {props.references?.choices('item').map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.name} · {choice.id}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>至少</span>
            <input
              className="in"
              type="number"
              min={1}
              value={props.value.atLeast ?? 1}
              onChange={(event) => patch({ atLeast: Math.max(1, Number(event.target.value) || 1) })}
            />
          </label>
        </>
      ) : null}
      {target ? (
        <EntityAddressEditorV5
          value={target}
          state={props.state}
          onChange={(next) => patch({ target: next })}
        />
      ) : null}
      {props.value.kind === 'entityState' ? (
        <label>
          <span>状态</span>
          <input
            className="in"
            type="number"
            value={props.value.is}
            onChange={(event) => patch({ is: Number(event.target.value) })}
          />
        </label>
      ) : null}
      {props.value.kind === 'facingEntity' ? (
        <label>
          <span>距离</span>
          <input
            className="in"
            type="number"
            min={0}
            value={props.value.range ?? 1}
            onChange={(event) => patch({ range: Math.max(0, Number(event.target.value)) })}
          />
        </label>
      ) : null}
      {props.value.kind === 'all' || props.value.kind === 'any' ? (
        <div className="canonical-condition-nested">
          {props.value.of.map((condition, index) => (
            <ConditionEditorV5
              key={index}
              value={condition}
              state={props.state}
              references={props.references}
              onChange={(next) => {
                const compound = props.value as Extract<AuthorConditionV5, { kind: 'all' | 'any' }>
                const of = [...compound.of]
                of[index] = next
                props.onChange({ ...compound, of })
              }}
            />
          ))}
          <button
            type="button"
            onClick={() => {
              const compound = props.value as Extract<AuthorConditionV5, { kind: 'all' | 'any' }>
              props.onChange({
                ...compound,
                of: [...compound.of, { kind: 'flag', flag: 'my-flag', is: true }],
              })
            }}
          >
            ＋ 条件
          </button>
        </div>
      ) : null}
      {props.value.kind === 'not' ? (
        <ConditionEditorV5
          value={props.value.cond}
          state={props.state}
          references={props.references}
          onChange={(cond) =>
            props.onChange({
              ...(props.value as Extract<AuthorConditionV5, { kind: 'not' }>),
              cond,
            })
          }
        />
      ) : null}
    </div>
  )
}

const CUSTOM_COMMANDS = new Set<AuthorCommandV5['kind']>([
  'vanishEntity',
  'setEntityState',
  'setMultiEntityState',
  'setEntityPos',
  'setEntityPosRelParty',
  'setEntityLayer',
  'setEntityFacing',
  'setEntityFrame',
  'playEntityAction',
  'stopEntityAction',
  'moveEntity',
  'stepEntity',
  'animEntity',
  'nudgeEntity',
  'takeEntity',
  'releaseEntity',
  'mountParty',
  'ride',
  'startBattle',
  'teleportOut',
  'confirm',
  'branch',
  'loop',
  'selectEntityBehavior',
  'selectEntityPage',
  'setEntityTriggerActivation',
  'selectSceneHooks',
  'callScript',
])

function primitiveField(
  command: AuthorCommandV5,
  key: string,
  value: string | number | boolean | undefined,
  onChange: (command: AuthorCommandV5) => void,
) {
  if (value === undefined) return null
  if (typeof value === 'boolean')
    return (
      <label key={key}>
        <input
          type="checkbox"
          checked={value}
          onChange={(event) =>
            onChange({ ...command, [key]: event.target.checked } as AuthorCommandV5)
          }
        />
        {key}
      </label>
    )
  return (
    <label key={key}>
      <span>{key}</span>
      <input
        className="in"
        type={typeof value === 'number' ? 'number' : 'text'}
        value={value}
        onChange={(event) =>
          onChange({
            ...command,
            [key]: typeof value === 'number' ? Number(event.target.value) : event.target.value,
          } as AuthorCommandV5)
        }
      />
    </label>
  )
}

function CanonicalCommandFormV5(props: {
  command: AuthorCommandV5
  context?: CanonicalScriptEditorContextV5
  onChange: (command: AuthorCommandV5) => void
}) {
  const command = props.command
  const context = props.context
  if (!CUSTOM_COMMANDS.has(command.kind) && context) {
    const scene =
      context.shellScenes.find((candidate) => candidate.id === context.currentSceneId) ??
      context.shellScenes[0]
    if (scene)
      return (
        <CommandForm
          cmd={command as Command}
          scene={scene}
          locale={context.locale}
          assetCatalog={context.assetCatalog}
          audioResolver={context.audioResolver}
          assetReader={context.assetReader}
          scenes={context.shellScenes}
          assetBase={context.assetBase}
          actors={context.actors}
          battleSprites={context.battleSprites}
          sprites={context.sprites}
          ambiences={context.ambiences}
          shops={context.shops}
          references={context.references}
          hasImplicitSelf={context.hasImplicitSelf}
          onOpenSound={context.onOpenSound}
          onOpenImage={context.onOpenImage}
          onOpenBattleSprite={context.onOpenBattleSprite}
          onOpenSpriteAction={context.onOpenSpriteAction}
          onChange={(next) => props.onChange(next as AuthorCommandV5)}
        />
      )
  }

  if (command.kind === 'branch' || command.kind === 'loop')
    return (
      <div className="canonical-command-form-fields">
        {command.kind === 'loop' ? (
          <>
            <label>
              <span>循环方式</span>
              <select
                className="in"
                value={command.mode}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    mode: event.target.value as 'while' | 'until',
                  })
                }
              >
                <option value="while">条件成立时</option>
                <option value="until">直到条件成立</option>
              </select>
            </label>
            <label>
              <span>最大次数</span>
              <input
                className="in"
                type="number"
                min={1}
                value={command.maxIterations}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    maxIterations: Math.max(1, Number(event.target.value) || 1),
                  })
                }
              />
            </label>
          </>
        ) : null}
        <ConditionEditorV5
          value={command.cond}
          state={context?.state}
          references={context?.references}
          onChange={(cond) => props.onChange({ ...command, cond })}
        />
        <p className="hint">分支和循环正文在左侧树中直接增删、排序和编辑。</p>
      </div>
    )

  if (command.kind === 'callScript') {
    const scripts = Object.entries(context?.state.sharedScripts ?? {})
    return (
      <div className="canonical-command-form-fields">
        <label>
          <span>共享脚本</span>
          <select
            className="in"
            value={command.script}
            onChange={(event) => props.onChange({ ...command, script: event.target.value })}
          >
            {!context?.state.sharedScripts[command.script] ? (
              <option value={command.script}>{command.script}（引用失效）</option>
            ) : null}
            {scripts.map(([id, script]) => (
              <option key={id} value={id}>
                {script.name} · {id}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => context?.onOpenScript?.(command.script)}>
          打开共享脚本
        </button>
        {command.self ? (
          <EntityAddressEditorV5
            value={command.self}
            state={context?.state}
            onChange={(self) => props.onChange({ ...command, self })}
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              const scene = context?.state.scenes[0]
              const entity = scene?.entities[0]
              if (scene && entity)
                props.onChange({ ...command, self: { scene: scene.id, entity: entity.id } })
            }}
          >
            ＋ 指定 self
          </button>
        )}
      </div>
    )
  }

  if (
    command.kind === 'setEntityState' ||
    command.kind === 'setEntityPos' ||
    command.kind === 'setEntityPosRelParty' ||
    command.kind === 'setEntityLayer' ||
    command.kind === 'setEntityFacing' ||
    command.kind === 'setEntityFrame' ||
    command.kind === 'playEntityAction' ||
    command.kind === 'stopEntityAction' ||
    command.kind === 'moveEntity' ||
    command.kind === 'stepEntity' ||
    command.kind === 'animEntity' ||
    command.kind === 'nudgeEntity' ||
    command.kind === 'takeEntity' ||
    command.kind === 'mountParty' ||
    command.kind === 'ride' ||
    command.kind === 'vanishEntity' ||
    command.kind === 'selectEntityBehavior' ||
    command.kind === 'selectEntityPage' ||
    command.kind === 'setEntityTriggerActivation'
  ) {
    const target = command.target
    const ignored = new Set(['kind', 'target', 'selection', 'to', 'pos'])
    const triggerActivation =
      command.kind === 'setEntityTriggerActivation' && command.selection.kind === 'use'
        ? command.selection.value
        : undefined
    return (
      <div className="canonical-command-form-fields">
        {target ? (
          <EntityAddressEditorV5
            value={target}
            state={context?.state}
            onChange={(next) => props.onChange({ ...command, target: next } as AuthorCommandV5)}
          />
        ) : (
          <div className="hint">未指定目标：使用当前 self。</div>
        )}
        {'to' in command && command.to ? (
          <div className="canonical-grid-editor">
            <label>
              <span>col</span>
              <input
                className="in"
                type="number"
                value={command.to.col}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    to: { ...command.to, col: Number(event.target.value) },
                  } as AuthorCommandV5)
                }
              />
            </label>
            <label>
              <span>row</span>
              <input
                className="in"
                type="number"
                value={command.to.row}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    to: { ...command.to, row: Number(event.target.value) },
                  } as AuthorCommandV5)
                }
              />
            </label>
          </div>
        ) : null}
        {'pos' in command && command.pos ? (
          <div className="canonical-grid-editor">
            <label>
              <span>col</span>
              <input
                className="in"
                type="number"
                value={command.pos.col}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    pos: { ...command.pos, col: Number(event.target.value) },
                  } as AuthorCommandV5)
                }
              />
            </label>
            <label>
              <span>row</span>
              <input
                className="in"
                type="number"
                value={command.pos.row}
                onChange={(event) =>
                  props.onChange({
                    ...command,
                    pos: { ...command.pos, row: Number(event.target.value) },
                  } as AuthorCommandV5)
                }
              />
            </label>
          </div>
        ) : null}
        {Object.entries(command)
          .filter(
            ([key, value]) =>
              !ignored.has(key) &&
              (typeof value === 'string' ||
                typeof value === 'number' ||
                typeof value === 'boolean'),
          )
          .map(([key, value]) =>
            primitiveField(command, key, value as string | number | boolean, props.onChange),
          )}
        {command.kind === 'selectEntityBehavior' ? (
          <label>
            <span>选择</span>
            <select
              className="in"
              value={
                command.selection.kind === 'use'
                  ? `use:${command.selection.value}`
                  : command.selection.kind
              }
              onChange={(event) => {
                const value = event.target.value
                props.onChange({
                  ...command,
                  selection: value.startsWith('use:')
                    ? { kind: 'use', value: value.slice(4) }
                    : { kind: value as 'inherit' | 'disabled' },
                })
              }}
            >
              <option value="inherit">继承</option>
              <option value="disabled">显式禁用</option>
              {Object.entries(
                context?.state.scenes
                  .find((scene) => scene.id === command.target.scene)
                  ?.entities.find((entity) => entity.id === command.target.entity)?.behaviors?.[
                  command.channel
                ] ?? {},
              ).map(([id, behavior]) => (
                <option key={id} value={`use:${id}`}>
                  {behavior.label} · {id}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {command.kind === 'selectEntityPage' ? (
          <label>
            <span>页面选择</span>
            <select
              className="in"
              value={
                command.selection.kind === 'use'
                  ? `use:${command.selection.value}`
                  : command.selection.kind
              }
              onChange={(event) =>
                props.onChange({
                  ...command,
                  selection: event.target.value.startsWith('use:')
                    ? { kind: 'use', value: event.target.value.slice(4) }
                    : { kind: 'inherit' },
                })
              }
            >
              <option value="inherit">继承当前页面</option>
              {context?.state.scenes
                .find((scene) => scene.id === command.target.scene)
                ?.entities.find((entity) => entity.id === command.target.entity)
                ?.pages?.map((page) => (
                  <option key={page.id} value={`use:${page.id}`}>
                    {page.label} · {page.id}
                  </option>
                ))}
            </select>
          </label>
        ) : null}
        {command.kind === 'setEntityTriggerActivation' ? (
          <>
            <label>
              <span>触发方式来源</span>
              <select
                className="in"
                value={command.selection.kind}
                onChange={(event) => {
                  const kind = event.target.value as 'inherit' | 'disabled' | 'use'
                  props.onChange({
                    ...command,
                    selection:
                      kind === 'use'
                        ? { kind: 'use', value: { on: 'interact', range: 1 } }
                        : { kind },
                  })
                }}
              >
                <option value="inherit">继承页面定义</option>
                <option value="disabled">显式禁用触发</option>
                <option value="use">使用自定义方式</option>
              </select>
            </label>
            {triggerActivation ? (
              <div className="canonical-grid-editor">
                <label>
                  <span>方式</span>
                  <select
                    className="in"
                    value={triggerActivation.on}
                    onChange={(event) =>
                      props.onChange({
                        ...command,
                        selection: {
                          kind: 'use',
                          value: {
                            ...triggerActivation,
                            on: event.target.value as 'interact' | 'touch',
                          },
                        },
                      })
                    }
                  >
                    <option value="interact">交互</option>
                    <option value="touch">触碰</option>
                  </select>
                </label>
                <label>
                  <span>距离</span>
                  <input
                    className="in"
                    type="number"
                    min={0}
                    value={triggerActivation.range ?? ''}
                    onChange={(event) =>
                      props.onChange({
                        ...command,
                        selection: {
                          kind: 'use',
                          value: {
                            ...triggerActivation,
                            range:
                              event.target.value === ''
                                ? undefined
                                : Math.max(0, Number(event.target.value)),
                          },
                        },
                      })
                    }
                  />
                </label>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    )
  }

  if (command.kind === 'setMultiEntityState')
    return (
      <div className="canonical-command-form-fields">
        <label>
          <span>状态</span>
          <input
            className="in"
            type="number"
            value={command.state}
            onChange={(event) => props.onChange({ ...command, state: Number(event.target.value) })}
          />
        </label>
        {command.targets.map((target, index) => (
          <EntityAddressEditorV5
            key={`${target.scene}/${target.entity}/${index}`}
            value={target}
            state={context?.state}
            onChange={(next) => {
              const targets = [...command.targets]
              targets[index] = next
              props.onChange({ ...command, targets })
            }}
          />
        ))}
      </div>
    )

  if (command.kind === 'confirm')
    return (
      <div className="canonical-command-form-fields">
        <label>
          <span>稳定 CommandId</span>
          <input
            className="in"
            value={command.id ?? ''}
            onChange={(event) =>
              props.onChange({ ...command, id: event.target.value.trim() || undefined })
            }
          />
        </label>
        <p className="hint">“否”分支在左侧树中编辑；状态机可按这个 CommandId 分派。</p>
      </div>
    )

  if (command.kind === 'startBattle')
    return (
      <div className="canonical-command-form-fields">
        <label>
          <span>敌队</span>
          <input
            className="in"
            type="number"
            value={command.team}
            onChange={(event) => props.onChange({ ...command, team: Number(event.target.value) })}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={command.auto ?? false}
            onChange={(event) =>
              props.onChange({ ...command, auto: event.target.checked || undefined })
            }
          />
          自动战斗
        </label>
        <label>
          <input
            type="checkbox"
            checked={command.boss ?? false}
            onChange={(event) =>
              props.onChange({ ...command, boss: event.target.checked || undefined })
            }
          />
          Boss
        </label>
        <p className="hint">战败与逃跑分支在左侧树中编辑。</p>
      </div>
    )

  if (command.kind === 'selectSceneHooks') {
    const scene = context?.state.scenes.find((candidate) => candidate.id === command.scene)
    return (
      <div className="canonical-command-form-fields">
        <label>
          <span>场景</span>
          <select
            className="in"
            value={command.scene}
            onChange={(event) => props.onChange({ ...command, scene: event.target.value })}
          >
            {context?.state.scenes.map((candidate) => (
              <option key={candidate.id}>{candidate.id}</option>
            ))}
          </select>
        </label>
        {(['onEnter', 'onTeleport'] as const).map((slot) => {
          const selection = command.selection[slot]
          const variants = scene?.hooks?.[slot]?.variants ?? {}
          const value =
            selection?.kind === 'use' ? `use:${selection.value}` : (selection?.kind ?? '__omit')
          return (
            <label key={slot}>
              <span>{slot === 'onEnter' ? '进入场景' : '传送出口'}</span>
              <select
                className="in"
                value={value}
                onChange={(event) => {
                  const raw = event.target.value
                  const next = { ...command.selection }
                  if (raw === '__omit') {
                    delete next[slot]
                    if (Object.keys(next).length === 0) return
                  } else
                    next[slot] = raw.startsWith('use:')
                      ? { kind: 'use', value: raw.slice(4) }
                      : { kind: raw as 'inherit' | 'disabled' }
                  props.onChange({ ...command, selection: next })
                }}
              >
                <option value="__omit">不修改此槽</option>
                <option value="inherit">恢复继承</option>
                <option value="disabled">显式禁用</option>
                {Object.entries(variants).map(([id, hook]) => (
                  <option key={id} value={`use:${id}`}>
                    {hook.label} · {id}
                  </option>
                ))}
              </select>
            </label>
          )
        })}
        <p className="hint">两类 Hook 都按场景内稳定 HookId 选择，不复制脚本正文。</p>
      </div>
    )
  }

  if (!context && command.kind === 'dialog')
    return (
      <label className="canonical-dialog-fallback">
        <span>对话正文（每行一行）</span>
        <textarea
          className="in"
          value={command.cue.rows.map((row) => row.text).join('\n')}
          onChange={(event) =>
            props.onChange({
              ...command,
              cue: {
                ...command.cue,
                rows: event.target.value.split('\n').map((text) => ({ text })),
              },
            })
          }
        />
      </label>
    )

  return (
    <div className="canonical-command-form-fields">
      {Object.entries(command)
        .filter(
          ([key, value]) =>
            key !== 'kind' &&
            (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'),
        )
        .map(([key, value]) =>
          primitiveField(command, key, value as string | number | boolean, props.onChange),
        )}
      <p className="hint">结构子块在左侧树中编辑。</p>
    </div>
  )
}

function insertionChoices(context?: CanonicalScriptEditorContextV5): Array<{
  label: string
  command: AuthorCommandV5
}> {
  const item = context?.references.choices('item')[0]?.id
  const shared = Object.keys(context?.state.sharedScripts ?? {})[0]
  const currentScene =
    context?.state.scenes.find((scene) => scene.id === context.currentSceneId) ??
    context?.state.scenes[0]
  const entity = currentScene?.entities[0]
  const target = currentScene && entity ? { scene: currentScene.id, entity: entity.id } : undefined
  return [
    {
      label: '💬 对话',
      command: { kind: 'dialog', cue: { rows: [{ text: '(新对话)' }] } },
    },
    { label: '⏱ 等待', command: { kind: 'wait', ms: 200 } },
    { label: '🚩 设开关', command: { kind: 'setFlag', flag: 'my-flag', value: true } },
    { label: '🔢 设数值', command: { kind: 'setVar', var: 'my-var', value: 1 } },
    {
      label: '🔀 条件分支',
      command: {
        kind: 'branch',
        cond: { kind: 'flag', flag: 'my-flag', is: true },
        then: [],
        else: [],
      },
    },
    {
      label: '🔁 结构化循环',
      command: {
        kind: 'loop',
        mode: 'while',
        cond: { kind: 'flag', flag: 'my-flag', is: true },
        body: [],
        yield: 'worldTick',
        maxIterations: 100,
      },
    },
    { label: '❓ 是/否询问', command: { kind: 'confirm', onNo: [] } },
    ...(item
      ? [{ label: '🎁 获得物品', command: { kind: 'giveItem', itemId: item } as AuthorCommandV5 }]
      : []),
    ...(shared
      ? [
          {
            label: '↪ 调用共享脚本',
            command: { kind: 'callScript', script: shared } as AuthorCommandV5,
          },
        ]
      : []),
    ...(target
      ? [
          {
            label: '👁 设置实体状态',
            command: { kind: 'setEntityState', target, state: 1 } as AuthorCommandV5,
          },
          {
            label: '🚶 移动实体',
            command: {
              kind: 'moveEntity',
              target,
              to: { ...entity!.pos },
              speed: 'normal',
            } as AuthorCommandV5,
          },
        ]
      : []),
  ]
}

export function CanonicalScriptBodyEditorV5(props: {
  body: readonly AuthorCommandV5[]
  onChange: (body: AuthorCommandV5[]) => void
  context?: CanonicalScriptEditorContextV5
  onError?: (message: string) => void
  label?: string
}) {
  const [selectedPath, setSelectedPath] = useState<string>()
  const [insertPath, setInsertPath] = useState<string>()
  const selected = selectedPath
    ? getAuthorCommandAtV5(props.body, parseAuthorCommandPathV5(selectedPath))
    : undefined
  const choices = useMemo(() => insertionChoices(props.context), [props.context])

  useEffect(() => {
    if (selectedPath && !getAuthorCommandAtV5(props.body, parseAuthorCommandPathV5(selectedPath)))
      setSelectedPath(undefined)
  }, [props.body, selectedPath])

  const commit = (body: AuthorCommandV5[]): boolean => {
    try {
      props.onChange(body)
      return true
    } catch (error) {
      props.onError?.(error instanceof Error ? error.message : String(error))
      return false
    }
  }

  return (
    <section className="canonical-script-editor" aria-label={props.label ?? '脚本正文编辑器'}>
      <header className="canonical-script-editor-heading">
        <strong>{props.label ?? '脚本正文'}</strong>
        <span>{props.body.length} 条顶层指令</span>
      </header>
      <div className="canonical-script-editor-layout">
        <div className="canonical-script-tree">
          <CommandRowsV5
            body={props.body}
            parentPath={[]}
            selectedPath={selectedPath}
            onSelect={(path) => {
              setSelectedPath(path)
              setInsertPath(undefined)
            }}
            onInsert={(path) => setInsertPath(path)}
            onMove={(path, direction) => {
              const parsed = parseAuthorCommandPathV5(path)
              if (commit(moveAuthorCommandAtV5(props.body, parsed, direction))) {
                const last = parsed.at(-1)
                if (typeof last === 'number')
                  setSelectedPath(
                    formatAuthorCommandPathV5([...parsed.slice(0, -1), last + direction]),
                  )
              }
            }}
            onRemove={(path) => {
              if (commit(removeAuthorCommandAtV5(props.body, parseAuthorCommandPathV5(path))))
                setSelectedPath(undefined)
            }}
          />
        </div>
        <div className="canonical-script-properties">
          {insertPath ? (
            <>
              <h4>插入指令</h4>
              <div className="canonical-script-insert-grid">
                {choices.map((choice) => (
                  <button
                    type="button"
                    key={choice.label}
                    onClick={() => {
                      const path = parseAuthorCommandPathV5(insertPath)
                      if (commit(insertAuthorCommandAfterV5(props.body, path, choice.command))) {
                        setSelectedPath(commandPathAfterInsert(path))
                        setInsertPath(undefined)
                      }
                    }}
                  >
                    {choice.label}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setInsertPath(undefined)}>
                取消
              </button>
            </>
          ) : selected && selectedPath ? (
            <>
              <h4>
                编辑指令 <code>{selectedPath}</code>
              </h4>
              <CanonicalCommandFormV5
                command={selected}
                context={props.context}
                onChange={(command) =>
                  commit(
                    updateAuthorCommandAtV5(
                      props.body,
                      parseAuthorCommandPathV5(selectedPath),
                      command,
                    ),
                  )
                }
              />
            </>
          ) : (
            <div className="canonical-script-editor-empty">
              选择一条指令编辑属性，或插入新指令。
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function defaultTransition(
  kind: StateTransitionV5['kind'],
  states: readonly string[],
  commandIds: readonly string[],
): StateTransitionV5 {
  const state = states[0] ?? 'state'
  switch (kind) {
    case 'stay':
      return { kind }
    case 'restart':
      return { kind }
    case 'continue':
    case 'advance':
      return { kind, state }
    case 'to':
      return { kind, state, yield: 'worldTick' }
    case 'branch':
      return {
        kind,
        cond: { kind: 'flag', flag: 'my-flag', is: true },
        then: { kind: 'stay' },
        else: { kind: 'stay' },
      }
    case 'commandOutcome':
      return {
        kind,
        commandId: commandIds[0] ?? 'confirm',
        command: 'confirm',
        outcome: 'no',
        then: { kind: 'stay' },
        else: { kind: 'stay' },
      }
  }
}

function TransitionEditorV5(props: {
  value: StateTransitionV5
  states: readonly string[]
  commandIds: readonly string[]
  context?: CanonicalScriptEditorContextV5
  label?: string
  onChange: (transition: StateTransitionV5) => void
}) {
  const transition = props.value
  return (
    <div className="canonical-transition-editor">
      <label>
        <span>{props.label ?? '跑完后'}</span>
        <select
          className="in"
          value={transition.kind}
          onChange={(event) =>
            props.onChange(
              defaultTransition(
                event.target.value as StateTransitionV5['kind'],
                props.states,
                props.commandIds,
              ),
            )
          }
        >
          <option value="stay">下次激活保持当前状态</option>
          <option value="restart">下次激活回初始状态</option>
          <option value="continue">同步继续到状态</option>
          <option value="advance">下次激活进入状态</option>
          <option value="to">让步后同次继续</option>
          <option value="branch">按条件分派</option>
          <option value="commandOutcome">按命令结果分派</option>
        </select>
      </label>
      <strong className="canonical-transition-execution">
        {stateTransitionExecutionLabelV5(transition)}
      </strong>
      {transition.kind === 'continue' ||
      transition.kind === 'advance' ||
      transition.kind === 'to' ? (
        <label>
          <span>目标状态</span>
          <select
            className="in"
            value={transition.state}
            onChange={(event) => props.onChange({ ...transition, state: event.target.value })}
          >
            {!props.states.includes(transition.state) ? (
              <option value={transition.state}>{transition.state}（引用失效）</option>
            ) : null}
            {props.states.map((state) => (
              <option key={state}>{state}</option>
            ))}
          </select>
        </label>
      ) : null}
      {transition.kind === 'to' ? (
        <label>
          <span>让步边界</span>
          <select
            className="in"
            value={transition.yield}
            onChange={(event) =>
              props.onChange({
                ...transition,
                yield: event.target.value as 'macroTask' | 'worldTick',
              })
            }
          >
            <option value="worldTick">worldTick</option>
            <option value="macroTask">macroTask</option>
          </select>
        </label>
      ) : null}
      {transition.kind === 'branch' ? (
        <>
          <ConditionEditorV5
            value={transition.cond}
            state={props.context?.state}
            references={props.context?.references}
            onChange={(cond) => props.onChange({ ...transition, cond })}
          />
          <TransitionEditorV5
            {...props}
            label="条件成立"
            value={transition.then}
            onChange={(then) => props.onChange({ ...transition, then })}
          />
          <TransitionEditorV5
            {...props}
            label="条件不成立"
            value={transition.else}
            onChange={(otherwise) => props.onChange({ ...transition, else: otherwise })}
          />
        </>
      ) : null}
      {transition.kind === 'commandOutcome' ? (
        <>
          <label>
            <span>确认命令</span>
            <select
              className="in"
              value={transition.commandId}
              onChange={(event) => props.onChange({ ...transition, commandId: event.target.value })}
            >
              {!props.commandIds.includes(transition.commandId) ? (
                <option value={transition.commandId}>
                  {transition.commandId}（本状态中不存在）
                </option>
              ) : null}
              {props.commandIds.map((id) => (
                <option key={id}>{id}</option>
              ))}
            </select>
          </label>
          <TransitionEditorV5
            {...props}
            label="选择“否”"
            value={transition.then}
            onChange={(then) => props.onChange({ ...transition, then })}
          />
          <TransitionEditorV5
            {...props}
            label="选择“是”"
            value={transition.else}
            onChange={(otherwise) => props.onChange({ ...transition, else: otherwise })}
          />
        </>
      ) : null}
    </div>
  )
}

function confirmIds(body: readonly AuthorCommandV5[]): string[] {
  const ids: string[] = []
  const visit = (commands: readonly AuthorCommandV5[]): void => {
    for (const command of commands) {
      if (command.kind === 'confirm' && command.id) ids.push(command.id)
      for (const child of commandChildren(command)) visit(child.body)
    }
  }
  visit(body)
  return ids
}

export function CanonicalScriptFlowEditorV5(props: {
  flow: ScriptFlowV5
  onChange: (flow: ScriptFlowV5) => void
  context?: CanonicalScriptEditorContextV5
  onError?: (message: string) => void
}) {
  const ids =
    props.flow.kind === 'stages'
      ? props.flow.stages.map((stage) => stage.id)
      : Object.keys(props.flow.machine.states)
  const initialId = props.flow.kind === 'stages' ? props.flow.initial : props.flow.machine.initial
  const [selectedId, setSelectedId] = useState(initialId)
  useEffect(() => {
    if (ids.includes(selectedId)) return
    setSelectedId(initialId)
  }, [ids, initialId, selectedId])

  if (props.flow.kind === 'stages') {
    const flow = props.flow
    const stage = flow.stages.find((candidate) => candidate.id === selectedId) ?? flow.stages[0]
    return (
      <section className="canonical-flow-editor">
        <header>
          <strong>阶段流</strong>
          <label>
            <span>初始阶段</span>
            <select
              className="in"
              value={flow.initial}
              onChange={(event) => props.onChange({ ...flow, initial: event.target.value })}
            >
              {ids.map((id) => (
                <option key={id}>{id}</option>
              ))}
            </select>
          </label>
        </header>
        <nav aria-label="脚本阶段">
          {flow.stages.map((candidate) => (
            <button
              type="button"
              key={candidate.id}
              className={candidate.id === stage?.id ? 'active' : ''}
              onClick={() => setSelectedId(candidate.id)}
            >
              <code>{candidate.id}</code>
              <span>{candidate.body.length} 条</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              let index = flow.stages.length + 1
              let id = `stage-${index}`
              while (ids.includes(id)) id = `stage-${++index}`
              props.onChange({
                ...flow,
                stages: [...flow.stages, { id, body: [] }],
              })
              setSelectedId(id)
            }}
          >
            ＋ 阶段
          </button>
        </nav>
        {stage ? (
          <>
            <label className="canonical-stage-next">
              <span>本次激活结束后</span>
              <select
                className="in"
                value={stage.next ?? ''}
                onChange={(event) => {
                  const stages = flow.stages.map((candidate) =>
                    candidate.id === stage.id
                      ? {
                          ...candidate,
                          next: event.target.value || undefined,
                        }
                      : candidate,
                  )
                  props.onChange({ ...flow, stages })
                }}
              >
                <option value="">停在当前阶段</option>
                {ids.map((id) => (
                  <option key={id} value={id}>
                    下次激活进入 {id}
                  </option>
                ))}
              </select>
            </label>
            {stage.entry ? (
              <CanonicalScriptBodyEditorV5
                label={`${stage.id} · 入场准备`}
                body={stage.entry.prepare}
                context={props.context}
                onError={props.onError}
                onChange={(prepare) =>
                  props.onChange({
                    ...flow,
                    stages: flow.stages.map((candidate) =>
                      candidate.id === stage.id
                        ? { ...candidate, entry: { ...stage.entry!, prepare } }
                        : candidate,
                    ),
                  })
                }
              />
            ) : null}
            <CanonicalScriptBodyEditorV5
              label={`${stage.id} · 正文`}
              body={stage.body}
              context={props.context}
              onError={props.onError}
              onChange={(body) =>
                props.onChange({
                  ...flow,
                  stages: flow.stages.map((candidate) =>
                    candidate.id === stage.id ? { ...candidate, body } : candidate,
                  ),
                })
              }
            />
          </>
        ) : null}
      </section>
    )
  }

  const flow = props.flow
  const state = flow.machine.states[selectedId] ?? Object.values(flow.machine.states)[0]
  const stateId = flow.machine.states[selectedId] ? selectedId : Object.keys(flow.machine.states)[0]
  return (
    <section className="canonical-flow-editor">
      <header>
        <strong>{flow.machine.label}</strong>
        <code>{flow.machine.id}</code>
        <label>
          <span>初始状态</span>
          <select
            className="in"
            value={flow.machine.initial}
            onChange={(event) =>
              props.onChange({
                ...flow,
                machine: { ...flow.machine, initial: event.target.value },
              })
            }
          >
            {ids.map((id) => (
              <option key={id}>{id}</option>
            ))}
          </select>
        </label>
      </header>
      <nav aria-label="脚本状态">
        {Object.entries(flow.machine.states).map(([id, candidate]) => (
          <button
            type="button"
            key={id}
            className={id === stateId ? 'active' : ''}
            onClick={() => setSelectedId(id)}
          >
            <code>{id}</code>
            <span>{candidate.label}</span>
            <small>{stateTransitionExecutionLabelV5(candidate.next)}</small>
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            let index = ids.length + 1
            let id = `state-${index}`
            while (ids.includes(id)) id = `state-${++index}`
            props.onChange({
              ...flow,
              machine: {
                ...flow.machine,
                states: {
                  ...flow.machine.states,
                  [id]: { label: id, body: [], next: { kind: 'stay' } },
                },
              },
            })
            setSelectedId(id)
          }}
        >
          ＋ 状态
        </button>
      </nav>
      {state && stateId ? (
        <>
          <label className="canonical-state-label">
            <span>状态名称</span>
            <input
              className="in"
              value={state.label}
              onChange={(event) =>
                props.onChange({
                  ...flow,
                  machine: {
                    ...flow.machine,
                    states: {
                      ...flow.machine.states,
                      [stateId]: { ...state, label: event.target.value },
                    },
                  },
                })
              }
            />
          </label>
          <CanonicalScriptBodyEditorV5
            label={`${state.label} · 正文`}
            body={state.body}
            context={props.context}
            onError={props.onError}
            onChange={(body) =>
              props.onChange({
                ...flow,
                machine: {
                  ...flow.machine,
                  states: {
                    ...flow.machine.states,
                    [stateId]: { ...state, body },
                  },
                },
              })
            }
          />
          <TransitionEditorV5
            value={state.next}
            states={ids}
            commandIds={confirmIds(state.body)}
            context={props.context}
            onChange={(next) =>
              props.onChange({
                ...flow,
                machine: {
                  ...flow.machine,
                  states: {
                    ...flow.machine.states,
                    [stateId]: { ...state, next },
                  },
                },
              })
            }
          />
        </>
      ) : null}
    </section>
  )
}
