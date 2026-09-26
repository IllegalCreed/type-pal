/**
 * 指令属性表单(C-track v1)—— 事件模式右栏:选中树行 → 编辑该指令参数。
 *
 * 高频指令给专控件;其余(branch/startBattle/confirm/页切换等结构类)
 * 走 JSON 兜底(textarea + 应用,保证全指令可编)。每次变更通过 onChange 产出整条新指令；
 * canonical 调用方必须在弹层/侧栏持有 aggregate draft，并只在“完成”时写入编辑会话。
 *
 * 对话文本:cue.rows[].text 是 TextId(locale 键);编辑即改写为**字面量**(lookupText
 * 未命中回显原文,引擎/预览同语义)——新写的行直接放中文,旧行一改即脱离 locale 键。
 */
import type {
  AmbienceDef,
  AssetCatalogV1,
  BattleSpriteDef,
  CarryableStatusId,
  Command,
  Locale,
  SceneDef,
  ScriptIndexV1,
  SharedScriptMetaV1,
  ShopDef,
  SpriteDef,
  WalkSpeed,
  WorldVariableRegistryV1,
} from '@type-pal/content'
import {
  ACTOR_STATUS_DEFINITIONS,
  type ActorDef,
  CARRIED_STATUS_TURN_RANGE,
  CARRYABLE_STATUS_IDS,
  deriveScriptChunk,
} from '@type-pal/content'
import type { AssetBase, AudioAssetReader } from '@type-pal/reforge'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { ScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import {
  EntitySel,
  JsonForm,
  Num,
  Row,
  Sel,
  Txt,
  WorldVariablePicker,
} from './command-form-controls.js'
import { DialogueCommandForm } from './command-form-dialogue.js'
import { WorldCommandForm } from './command-form-world.js'
import {
  DsActionGroup,
  DsButton,
  DsIconButton,
  DsNumberInput,
  DsReorderCollection,
  type DsReorderIntent,
  DsReorderItem,
  DsReorderMoveButton,
  DsRepeatRow,
  DsSelect,
  reorderDsItems,
  useDsReorderKeys,
} from './design-system/index.js'
import { MusicPicker } from './MusicPicker.js'
import { NamedIdPicker } from './NamedIdPicker.js'
import { SoundPicker } from './SoundPicker.js'

export { WorldVariablePicker } from './command-form-controls.js'
export type { LoadSceneTarget } from './command-form-world.js'
export { makeLoadScene, retargetLoadScene } from './command-form-world.js'

const SPEEDS: WalkSpeed[] = ['slow', 'normal', 'fast', 'run']

export function CommandForm(props: {
  cmd: Command
  scene: SceneDef
  locale: Locale
  assetCatalog: AssetCatalogV1
  audioResolver: AudioAssetReader
  assetReader: EditorAssetReader
  /** 全场景(loadScene 目标下拉;W4)。缺省 = 只有当前场景。 */
  scenes?: SceneDef[]
  /** 资产 base(战场选择器预览;B2)。缺省退化数字输入。 */
  assetBase?: AssetBase
  /** 角色表(setParty 队伍编辑下拉;C7)。缺省退化 JSON 兜底。 */
  actors?: Record<string, ActorDef>
  battleSprites: readonly BattleSpriteDef[]
  /** 大世界精灵与预制动作；playEntityAction 使用稳定 sprite/action 复合引用。 */
  sprites?: readonly SpriteDef[]
  /** 氛围表(setAmbience 下拉;W6)。缺省退化文本输入。 */
  ambiences?: AmbienceDef[]
  /** 店铺表(openShop 店下拉)。缺省退化数字输入。 */
  shops?: ShopDef[]
  /** 所有已有名称表的稳定引用；树、条件摘要与表单共用同一真值。 */
  references: ScriptReferenceCatalog
  /** N6 作者共享脚本目录；用于区分作者共享目标与场景内部目标。 */
  scriptIndex?: ScriptIndexV1
  /** 当前执行上下文是否保证有可继承 self。 */
  hasImplicitSelf?: boolean
  /** 打开 callScript/jumpScript 目标；调用方决定留在场景内或进入作者共享库。 */
  onOpenScript?: (id: string) => void
  /** 项目级变量登记表；变量与条件字段只允许从对应类型中选择。 */
  worldVariables?: WorldVariableRegistryV1
  onOpenWorldVariable?: (id: string) => void
  onOpenSound?: (id: string) => void
  onOpenImage?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
  onOpenSpriteAction?: (spriteId: string, actionId: string) => void
  /** K2：新建/更新称谓 locale 与 cue 更新由调用方合成一次 undo。 */
  onDialogueSpeakerOverrideChange?: (text: string) => void
  /** 非作者态展示可保留逃生 JSON 编辑器；当前作者态隐藏它。 */
  showRawJson?: boolean
  /** 当前 aggregate command draft 的稳定身份；用于隔离内部有序集合手势。 */
  reorderScopeKey?: string
  onChange: (next: Command) => void
}) {
  const {
    cmd,
    scene,
    locale,
    assetCatalog,
    audioResolver,
    assetReader,
    scenes,
    actors,
    battleSprites,
    sprites = [],
    ambiences,
    shops,
    references,
    scriptIndex,
    hasImplicitSelf,
    onOpenScript,
    worldVariables,
    onOpenWorldVariable,
    onOpenSound,
    onOpenImage,
    onOpenBattleSprite,
    onOpenSpriteAction,
    onDialogueSpeakerOverrideChange,
    showRawJson = true,
    reorderScopeKey = `command-form:${cmd.kind}`,
    onChange,
  } = props
  const partyMemberReorderKeys = useDsReorderKeys(cmd.kind === 'setParty' ? cmd.members : [])
  const set = (patch: object): void => onChange({ ...cmd, ...patch } as Command)
  const actorChoices = references.choices('actor')
  const conditionActorChoices = actorChoices.filter((choice) => actors?.[choice.id]?.battler)
  const poisonChoices = references.choices('poison')
  switch (cmd.kind) {
    case 'dialog':
      return (
        <DialogueCommandForm
          command={cmd}
          locale={locale}
          assetCatalog={assetCatalog}
          assetReader={assetReader}
          actors={actors}
          onOpenImage={onOpenImage}
          onDialogueSpeakerOverrideChange={onDialogueSpeakerOverrideChange}
          showRawJson={showRawJson}
          reorderScopeKey={reorderScopeKey}
          onChange={onChange}
        />
      )
    case 'wait':
    case 'fade':
    case 'holdScreen':
    case 'revealScreen':
    case 'ditherScreen':
    case 'teleportParty':
    case 'setPartyFacing':
    case 'moveParty':
    case 'moveEntity':
    case 'setEntityState':
    case 'setEntityFacing':
    case 'setEntityFrame':
    case 'playEntityAction':
    case 'stopEntityAction':
    case 'stepEntity':
    case 'animEntity':
    case 'nudgeEntity':
    case 'nudgeParty':
    case 'setActorSprite':
    case 'setActorAppearance':
    case 'loadScene':
    case 'takeEntity':
    case 'releaseEntity':
      return (
        <WorldCommandForm
          command={cmd}
          scene={scene}
          scenes={scenes}
          actors={actors}
          battleSprites={battleSprites}
          sprites={sprites}
          assetCatalog={assetCatalog}
          assetReader={assetReader}
          references={references}
          onOpenImage={onOpenImage}
          onOpenBattleSprite={onOpenBattleSprite}
          onOpenSpriteAction={onOpenSpriteAction}
          onChange={onChange}
        />
      )
    case 'applyActorCondition': {
      const currentActorChoice = actorChoices.find((choice) => choice.id === cmd.actor)
      const actorOptions = [
        ...(!conditionActorChoices.some((choice) => choice.id === cmd.actor)
          ? [
              {
                value: cmd.actor,
                label: currentActorChoice
                  ? `${currentActorChoice.name}（${cmd.actor}，不可参战）`
                  : `${cmd.actor}（角色不存在）`,
                disabled: true,
              },
            ]
          : []),
        ...conditionActorChoices.map((choice) => ({
          value: choice.id,
          label: `${choice.name}（${choice.id}）`,
        })),
      ]
      const conditionKind = cmd.condition.kind
      return (
        <>
          <Row label="目标角色">
            <DsSelect
              size="compact"
              searchable
              value={cmd.actor}
              options={actorOptions}
              onValueChange={(actor) => set({ actor })}
            />
          </Row>
          <Row label="当前状态">
            <DsSelect
              size="compact"
              value={conditionKind}
              options={[
                { value: 'poison', label: '中毒', disabled: poisonChoices.length === 0 },
                { value: 'status', label: '定时增益或减益' },
                { value: 'poisonResistance', label: '临时毒抗' },
              ]}
              onValueChange={(kind) => {
                if (kind === 'poison') {
                  const poisonId = Number(poisonChoices[0]?.id)
                  if (Number.isSafeInteger(poisonId) && poisonId > 0)
                    set({ condition: { kind, poisonId } })
                  return
                }
                if (kind === 'status') {
                  set({ condition: { kind, status: 'protect', turns: 7 } })
                  return
                }
                set({ condition: { kind: 'poisonResistance', amount: 1 } })
              }}
            />
          </Row>
          {cmd.condition.kind === 'poison' ? (
            <Row label="毒种">
              <DsSelect
                size="compact"
                searchable
                value={String(cmd.condition.poisonId)}
                options={[
                  ...(!references.has('poison', String(cmd.condition.poisonId))
                    ? [
                        {
                          value: String(cmd.condition.poisonId),
                          label: references.label('poison', String(cmd.condition.poisonId)),
                        },
                      ]
                    : []),
                  ...poisonChoices.map((choice) => ({
                    value: choice.id,
                    label: choice.name,
                    description: choice.id,
                  })),
                ]}
                onValueChange={(poisonId) =>
                  set({ condition: { kind: 'poison', poisonId: Number(poisonId) } })
                }
              />
            </Row>
          ) : null}
          {cmd.condition.kind === 'status' ? (
            <>
              <Row label="状态">
                <DsSelect
                  size="compact"
                  value={cmd.condition.status}
                  options={CARRYABLE_STATUS_IDS.map((status) => ({
                    value: status,
                    label: ACTOR_STATUS_DEFINITIONS[status].label,
                    description: ACTOR_STATUS_DEFINITIONS[status].description,
                  }))}
                  onValueChange={(status) =>
                    set({
                      condition: {
                        ...cmd.condition,
                        status: status as CarryableStatusId,
                      },
                    })
                  }
                />
              </Row>
              <Row label="持续回合">
                <DsNumberInput
                  size="compact"
                  min={CARRIED_STATUS_TURN_RANGE.min}
                  max={CARRIED_STATUS_TURN_RANGE.max}
                  step={1}
                  value={cmd.condition.turns}
                  onChange={(event) =>
                    set({
                      condition: {
                        ...cmd.condition,
                        turns: Math.max(
                          CARRIED_STATUS_TURN_RANGE.min,
                          Math.min(
                            CARRIED_STATUS_TURN_RANGE.max,
                            Math.floor(Number(event.target.value)),
                          ),
                        ),
                      },
                    })
                  }
                />
              </Row>
            </>
          ) : null}
          {cmd.condition.kind === 'poisonResistance' ? (
            <Row label="毒抗加值">
              <DsNumberInput
                size="compact"
                min={1}
                max={Number.MAX_SAFE_INTEGER}
                step={1}
                value={cmd.condition.amount}
                onChange={(event) =>
                  set({
                    condition: {
                      kind: 'poisonResistance',
                      amount: Math.max(1, Math.floor(Number(event.target.value))),
                    },
                  })
                }
              />
            </Row>
          ) : null}
          <p className="ds-supporting-copy">
            目标必须已由入口或前面的“调整队伍成员”实例化。选择“中毒”时保证命中，不再进行毒抗随机判定；状态在大世界中不自行衰减。
          </p>
        </>
      )
    }
    case 'clearActorCondition': {
      const currentActorChoice = actorChoices.find((choice) => choice.id === cmd.actor)
      const actorOptions = [
        ...(!conditionActorChoices.some((choice) => choice.id === cmd.actor)
          ? [
              {
                value: cmd.actor,
                label: currentActorChoice
                  ? `${currentActorChoice.name}（${cmd.actor}，不可参战）`
                  : `${cmd.actor}（角色不存在）`,
                disabled: true,
              },
            ]
          : []),
        ...conditionActorChoices.map((choice) => ({
          value: choice.id,
          label: `${choice.name}（${choice.id}）`,
        })),
      ]
      const conditionKind = cmd.condition.kind
      return (
        <>
          <Row label="目标角色">
            <DsSelect
              size="compact"
              searchable
              value={cmd.actor}
              options={actorOptions}
              onValueChange={(actor) => set({ actor })}
            />
          </Row>
          <Row label="清除状态">
            <DsSelect
              size="compact"
              value={conditionKind}
              options={[
                { value: 'poison', label: '指定毒', disabled: poisonChoices.length === 0 },
                { value: 'status', label: '指定定时增益或减益' },
                { value: 'poisonResistance', label: '全部临时毒抗' },
              ]}
              onValueChange={(kind) => {
                if (kind === 'poison') {
                  const poisonId = Number(poisonChoices[0]?.id)
                  if (Number.isSafeInteger(poisonId) && poisonId > 0)
                    set({ condition: { kind, poisonId } })
                  return
                }
                if (kind === 'status') {
                  set({ condition: { kind, status: 'protect' } })
                  return
                }
                set({ condition: { kind: 'poisonResistance' } })
              }}
            />
          </Row>
          {cmd.condition.kind === 'poison' ? (
            <Row label="毒种">
              <DsSelect
                size="compact"
                searchable
                value={String(cmd.condition.poisonId)}
                options={[
                  ...(!references.has('poison', String(cmd.condition.poisonId))
                    ? [
                        {
                          value: String(cmd.condition.poisonId),
                          label: references.label('poison', String(cmd.condition.poisonId)),
                        },
                      ]
                    : []),
                  ...poisonChoices.map((choice) => ({
                    value: choice.id,
                    label: choice.name,
                    description: choice.id,
                  })),
                ]}
                onValueChange={(poisonId) =>
                  set({ condition: { kind: 'poison', poisonId: Number(poisonId) } })
                }
              />
            </Row>
          ) : null}
          {cmd.condition.kind === 'status' ? (
            <Row label="状态">
              <DsSelect
                size="compact"
                value={cmd.condition.status}
                options={CARRYABLE_STATUS_IDS.map((status) => ({
                  value: status,
                  label: ACTOR_STATUS_DEFINITIONS[status].label,
                  description: ACTOR_STATUS_DEFINITIONS[status].description,
                }))}
                onValueChange={(status) =>
                  set({ condition: { kind: 'status', status: status as CarryableStatusId } })
                }
              />
            </Row>
          ) : null}
          <p className="ds-supporting-copy">
            只清除选择的当前状态；清除临时毒抗会移除该角色的全部临时毒抗加值。
          </p>
        </>
      )
    }
    case 'setParty': {
      const battlers = actors ? Object.values(actors).filter((a) => a.battler) : []
      if (!battlers.length) break // 无角色表 → 走底部 JSON 兜底
      const members = cmd.members
      const setMembers = (next: string[]): void => set({ members: next })
      const reorderMembers = (intent: DsReorderIntent): boolean => {
        const next = reorderDsItems(members, intent)
        if (next === members) return false
        partyMemberReorderKeys.move(intent)
        setMembers([...next])
        return true
      }
      return (
        <>
          <DsReorderCollection
            adoptionId="story/set-party-members"
            scopeKey={`${reorderScopeKey}:party-members`}
            entries={members.map((id, index) => ({
              key: partyMemberReorderKeys.keys[index]!,
              label: references.label('actor', id),
            }))}
            revision={cmd}
            onReorder={reorderMembers}
          >
            <div className="cf-party-row-list">
              {members.map((id, i) => {
                const memberKey = partyMemberReorderKeys.keys[i]!
                const memberName = references.label('actor', id)
                return (
                  <DsReorderItem itemKey={memberKey} key={memberKey}>
                    <DsRepeatRow density="compact" className="cf-party-row">
                      <span className="cf-label">{i === 0 ? '队长' : `队员 ${i}`}</span>
                      <DsSelect
                        aria-label={i === 0 ? '队长' : `队员 ${i}`}
                        value={id}
                        options={battlers.map((actor) => ({
                          value: actor.id,
                          label: references.label('actor', actor.id),
                        }))}
                        onValueChange={(actorId) =>
                          setMembers(members.map((member, j) => (j === i ? actorId : member)))
                        }
                      />
                      <DsActionGroup density="compact" className="cf-party-row-actions">
                        <DsReorderMoveButton itemKey={memberKey} direction="backward" />
                        <DsReorderMoveButton itemKey={memberKey} direction="forward" />
                        <DsIconButton
                          variant="danger"
                          icon="delete"
                          label={`从队伍移出：${memberName}`}
                          onClick={() => setMembers(members.filter((_, j) => j !== i))}
                        />
                      </DsActionGroup>
                    </DsRepeatRow>
                  </DsReorderItem>
                )
              })}
            </div>
          </DsReorderCollection>
          <Row label="">
            <DsButton
              data-ds-add-picker-deferred="story/set-party-members-append-default"
              size="compact"
              variant="secondary"
              icon="add"
              onClick={() => {
                const used = new Set(members)
                const cand = battlers.find((a) => !used.has(a.id)) ?? battlers[0]
                if (cand) setMembers([...members, cand.id])
              }}
            >
              添加队员
            </DsButton>
            <span className="ds-supporting-copy">顺序=站位;落选进 reserve 不丢状态</span>
          </Row>
        </>
      )
    }
    case 'mountParty':
      return (
        <>
          <Row label="载具实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="偏移 dx/dy">
            <Num value={cmd.dx ?? 0} onChange={(n) => set({ dx: n || undefined })} />
            <Num value={cmd.dy ?? 0} onChange={(n) => set({ dy: n || undefined })} />
          </Row>
        </>
      )
    case 'ride':
      return (
        <>
          <Row label="载具实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="col / row">
            <Num value={cmd.to.col} onChange={(n) => set({ to: { ...cmd.to, col: n } })} />
            <Num value={cmd.to.row} onChange={(n) => set({ to: { ...cmd.to, row: n } })} />
          </Row>
          <Row label="速度">
            <Sel value={cmd.speed} options={SPEEDS} onChange={(v) => set({ speed: v })} />
          </Row>
        </>
      )
    case 'setFlag':
      return (
        <>
          <Row label="开关名">
            <WorldVariablePicker
              value={cmd.flag}
              kind="flag"
              variables={worldVariables}
              onChange={(flag) => set({ flag })}
              onOpen={onOpenWorldVariable}
            />
          </Row>
          <Row label="设为">
            <Sel
              value={cmd.value ? 'true' : 'false'}
              options={['true', 'false']}
              onChange={(v) => set({ value: v === 'true' })}
            />
          </Row>
        </>
      )
    case 'setVar':
      return (
        <>
          <Row label="变量名">
            <WorldVariablePicker
              value={cmd.var}
              kind="number"
              variables={worldVariables}
              onChange={(variable) => set({ var: variable })}
              onOpen={onOpenWorldVariable}
            />
          </Row>
          <Row label="设为">
            <Num value={cmd.value} onChange={(n) => set({ value: n })} />
          </Row>
        </>
      )
    case 'addVar':
      return (
        <>
          <Row label="变量名">
            <WorldVariablePicker
              value={cmd.var}
              kind="number"
              variables={worldVariables}
              onChange={(variable) => set({ var: variable })}
              onOpen={onOpenWorldVariable}
            />
          </Row>
          <Row label="增减">
            <Num value={cmd.delta} onChange={(delta) => set({ delta })} />
          </Row>
        </>
      )
    case 'branch': {
      const c = cmd.cond
      const itemCondition =
        c.kind === 'hasItem' || c.kind === 'ownsItem' || c.kind === 'itemEquipped' ? c : undefined
      return (
        <>
          {c.kind === 'flag' ? (
            <>
              <Row label="条件:开关">
                <WorldVariablePicker
                  value={c.flag}
                  kind="flag"
                  variables={worldVariables}
                  onChange={(flag) => set({ cond: { ...c, flag } })}
                  onOpen={onOpenWorldVariable}
                />
              </Row>
              <Row label="要求为">
                <Sel
                  value={c.is ? 'true' : 'false'}
                  options={['true', 'false']}
                  onChange={(v) => set({ cond: { ...c, is: v === 'true' } })}
                />
              </Row>
            </>
          ) : c.kind === 'var' ? (
            <>
              <Row label="条件:数值">
                <WorldVariablePicker
                  value={c.var}
                  kind="number"
                  variables={worldVariables}
                  onChange={(variable) => set({ cond: { ...c, var: variable } })}
                  onOpen={onOpenWorldVariable}
                />
              </Row>
              <Row label="比较">
                <Sel
                  value={c.op}
                  options={['==', '!=', '>=', '<=', '>', '<'] as const}
                  onChange={(op) => set({ cond: { ...c, op } })}
                />
              </Row>
              <Row label="值">
                <Num value={c.value} onChange={(value) => set({ cond: { ...c, value } })} />
              </Row>
            </>
          ) : itemCondition ? (
            <>
              <Row label="条件">
                <span className="cf-readonly">
                  {itemCondition.kind === 'hasItem'
                    ? '背包持有'
                    : itemCondition.kind === 'ownsItem'
                      ? '背包与装备合计'
                      : '当前已装备'}
                </span>
              </Row>
              <Row label="物品">
                <NamedIdPicker
                  value={itemCondition.itemId}
                  choices={references.choices('item')}
                  kindLabel="物品"
                  inputName="script-condition-item"
                  onChange={(itemId) => set({ cond: { ...itemCondition, itemId } })}
                />
              </Row>
              <Row label="至少">
                <Num
                  value={itemCondition.atLeast ?? 1}
                  onChange={(atLeast) =>
                    set({
                      cond: {
                        ...itemCondition,
                        atLeast: atLeast > 1 ? atLeast : undefined,
                      },
                    })
                  }
                />
              </Row>
            </>
          ) : (
            <p className="hint">非 flag 条件({c.kind})用下方 JSON 编辑。</p>
          )}
          <p className="hint">
            成立走 then 臂、不成立走 else 臂 —— 树里展开臂内行,行悬停 ＋ 插指令。
          </p>
        </>
      )
    }
    case 'playSound':
      return (
        <Row label="音效">
          <SoundPicker
            value={cmd.asset}
            onChange={(asset) => {
              if (asset) set({ asset })
            }}
            catalog={assetCatalog}
            reader={assetReader}
            onOpenAsset={onOpenSound}
          />
        </Row>
      )
    case 'playMusic':
      return (
        <Row label="音乐">
          <MusicPicker
            value={cmd.asset}
            onChange={(asset) => {
              if (typeof asset === 'string') set({ asset })
            }}
            catalog={assetCatalog}
            resolver={audioResolver}
          />
        </Row>
      )
    case 'openShop':
      return (
        <>
          <Row label="店铺">
            {shops?.length ? (
              <Sel
                value={String(cmd.shop)}
                options={shops.map((x) => String(x.id))}
                labels={shops.map((x) => `店 ${x.id}(${x.items.length} 货)`)}
                onChange={(v) => set({ shop: Number(v) })}
              />
            ) : (
              <Num value={cmd.shop} onChange={(n) => set({ shop: n })} />
            )}
          </Row>
          <Row label="模式">
            <Sel
              value={cmd.mode}
              options={['buy', 'sell']}
              labels={['买(店铺货单)', '卖(当铺收购)']}
              onChange={(v) => set({ mode: v })}
            />
          </Row>
        </>
      )
    case 'setAmbience':
      return (
        <Row label="氛围">
          {ambiences?.length ? (
            <NamedIdPicker
              value={cmd.ambience}
              choices={references.choices('ambience')}
              kindLabel="氛围"
              inputName="script-ambience"
              onChange={(ambience) => set({ ambience })}
            />
          ) : (
            <Txt value={cmd.ambience} onChange={(s) => set({ ambience: s })} />
          )}
        </Row>
      )
    case 'giveMoney':
      return (
        <Row label="增减钱">
          <Num value={cmd.delta} onChange={(n) => set({ delta: n })} />
        </Row>
      )
    case 'learnSkill':
      return (
        <>
          <Row label="原版角色槽位">
            <Num value={cmd.role} onChange={(role) => set({ role })} />
          </Row>
          <Row label="仙术">
            <NamedIdPicker
              value={cmd.skill}
              choices={references.choices('skill')}
              kindLabel="仙术"
              inputName="script-skill"
              onChange={(skill) => set({ skill })}
            />
          </Row>
          <p className="cf-warn">
            角色仍使用原版数字槽位；它不是新项目可用的稳定角色引用，已纳入脚本模型现代化整改。
          </p>
        </>
      )
    case 'giveItem':
    case 'loseItem':
      return (
        <>
          <Row label="物品">
            <NamedIdPicker
              value={cmd.itemId}
              choices={references.choices('item')}
              kindLabel="物品"
              inputName="script-item"
              onChange={(itemId) => set({ itemId })}
            />
          </Row>
          <Row label="数量">
            <Num value={cmd.count ?? 1} onChange={(n) => set({ count: n > 1 ? n : undefined })} />
          </Row>
        </>
      )
    case 'setEntityAuto':
    case 'setEntityTrigger':
    case 'setSceneOnEnter':
    case 'setSceneOnTeleport': {
      const targetId = cmd.script?.id
      const targetMeta = targetId ? scriptIndex?.library?.[targetId] : undefined
      return (
        <>
          {targetId ? (
            <Row label={targetMeta ? '可复用脚本' : '迁移内部实现'}>
              <span className="cf-ref-row">
                <code className="cf-ref-target">
                  {targetMeta ? references.label('authorScript', targetId) : targetId}
                </code>
                {onOpenScript ? (
                  <DsButton
                    size="compact"
                    variant="quiet"
                    icon="open"
                    title={targetMeta ? '打开可复用脚本' : '打开迁移内部实现'}
                    onClick={() => onOpenScript(targetId)}
                  >
                    打开
                  </DsButton>
                ) : null}
              </span>
            </Row>
          ) : null}
          {showRawJson ? <JsonForm cmd={cmd} onChange={onChange} /> : null}
        </>
      )
    }
    case 'jumpScript': {
      const targetMeta = scriptIndex?.library?.[cmd.ref.id]
      const explicitEntities = scene.entities.map((entity) => entity.id)
      const selfValue = cmd.self ?? ''
      return (
        <>
          <Row label={targetMeta ? '可复用脚本' : '迁移内部实现'}>
            <span className="cf-ref-row">
              <code className="cf-ref-target">
                {targetMeta ? references.label('authorScript', cmd.ref.id) : cmd.ref.id}
              </code>
              {onOpenScript ? (
                <DsButton
                  size="compact"
                  variant="quiet"
                  icon="open"
                  title={targetMeta ? '打开可复用脚本' : '打开迁移内部实现'}
                  onClick={() => onOpenScript(cmd.ref.id)}
                >
                  打开
                </DsButton>
              ) : null}
            </span>
          </Row>
          <Row label="self">
            <DsSelect
              size="compact"
              value={selfValue}
              options={[
                { value: '', label: '继承当前执行者' },
                ...explicitEntities.map((id) => ({ value: id, label: id })),
                ...(selfValue && !explicitEntities.includes(selfValue)
                  ? [{ value: selfValue, label: `${selfValue}(不在场)` }]
                  : []),
              ]}
              onValueChange={(self) => set({ self: self || undefined })}
            />
          </Row>
        </>
      )
    }
    case 'callScript': {
      const authored: [string, SharedScriptMetaV1][] = Object.entries(
        scriptIndex?.library ?? {},
      ).sort(([, a], [, b]) => a.name.localeCompare(b.name))
      const options: [string, SharedScriptMetaV1][] = authored.some(([id]) => id === cmd.ref.id)
        ? authored
        : [[cmd.ref.id, { name: `${cmd.ref.id}（内部）`, self: 'none' as const }], ...authored]
      const targetMeta = scriptIndex?.library?.[cmd.ref.id]
      const explicitEntities = scene.entities.map((entity) => entity.id)
      const selfValue = cmd.self ?? ''
      return (
        <>
          <Row label="目标">
            <span className="cf-ref-row">
              <DsSelect
                size="compact"
                value={cmd.ref.id}
                options={options.map(([id, meta]) => ({
                  value: id,
                  label: references.has('authorScript', id)
                    ? references.label('authorScript', id)
                    : meta.name,
                }))}
                onValueChange={(id) => {
                  const chunk = scriptIndex ? deriveScriptChunk(id, scriptIndex.shards) : undefined
                  set({ ref: { id, chunk: chunk ?? cmd.ref.chunk } })
                }}
              />
              {onOpenScript ? (
                <DsButton
                  size="compact"
                  variant="quiet"
                  icon="open"
                  title={targetMeta ? '打开可复用脚本' : '打开迁移内部实现'}
                  onClick={() => onOpenScript(cmd.ref.id)}
                >
                  打开
                </DsButton>
              ) : null}
            </span>
          </Row>
          <Row label="self">
            <DsSelect
              size="compact"
              value={selfValue}
              options={[
                { value: '', label: '继承当前执行者' },
                ...explicitEntities.map((id) => ({ value: id, label: id })),
                ...(selfValue && !explicitEntities.includes(selfValue)
                  ? [{ value: selfValue, label: `${selfValue}(不在场)` }]
                  : []),
              ]}
              onValueChange={(self) => set({ self: self || undefined })}
            />
          </Row>
          {targetMeta?.self === 'required' && !cmd.self && !hasImplicitSelf ? (
            <p className="cf-err">目标要求 self；当前来源没有可继承执行者，请显式选择实体。</p>
          ) : null}
          <p className="hint mono">{cmd.ref.id}</p>
        </>
      )
    }
    case 'cameraPan':
      return (
        <>
          <Row label="dx">
            <Num value={cmd.dx} onChange={(n) => set({ dx: n })} />
          </Row>
          <Row label="dy">
            <Num value={cmd.dy} onChange={(n) => set({ dy: n })} />
          </Row>
          <Row label="帧数">
            <Num value={cmd.frames} onChange={(n) => set({ frames: n })} />
          </Row>
        </>
      )
    case 'clearDialog':
    case 'cameraSnap':
      return (
        <p className="hint">
          此指令无可编参数
          {cmd.kind === 'cameraSnap' && cmd.to && showRawJson ? '(定位坐标用 JSON)' : ''}。
        </p>
      )
    default:
      // 结构类(branch/confirm/startBattle/页切换)与低频指令:JSON 兜底
      return showRawJson ? (
        <JsonForm cmd={cmd} onChange={onChange} />
      ) : (
        <p className="hint">此指令请使用新版结构化属性表单编辑。</p>
      )
  }
}
