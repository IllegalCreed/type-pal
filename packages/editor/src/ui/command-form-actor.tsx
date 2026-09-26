import type { CarryableStatusId, SceneDef, WalkSpeed } from '@type-pal/content'
import {
  ACTOR_STATUS_DEFINITIONS,
  type ActorDef,
  CARRIED_STATUS_TURN_RANGE,
  CARRYABLE_STATUS_IDS,
} from '@type-pal/content'
import type { ScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import type { CommandFormCommand } from './command-form-contract.js'
import { EntitySel, JsonForm, Num, Row, Sel } from './command-form-controls.js'
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

const SPEEDS: WalkSpeed[] = ['slow', 'normal', 'fast', 'run']

type ActorCommandKind =
  | 'applyActorCondition'
  | 'clearActorCondition'
  | 'setParty'
  | 'mountParty'
  | 'ride'

type ActorCommand = Extract<CommandFormCommand, { kind: ActorCommandKind }>

export interface ActorCommandFormProps {
  command: ActorCommand
  scene: SceneDef
  actors?: Record<string, ActorDef>
  references: ScriptReferenceCatalog
  showRawJson: boolean
  reorderScopeKey: string
  onChange: (next: CommandFormCommand) => void
}

/** Owns actor condition, party composition and party mount command forms. */
export function ActorCommandForm(props: ActorCommandFormProps) {
  const { command: cmd, scene, actors, references, showRawJson, reorderScopeKey, onChange } = props
  const partyMemberReorderKeys = useDsReorderKeys(cmd.kind === 'setParty' ? cmd.members : [])
  const set = (patch: object): void => onChange({ ...cmd, ...patch } as ActorCommand)
  const actorChoices = references.choices('actor')
  const conditionActorChoices = actorChoices.filter((choice) => actors?.[choice.id]?.battler)
  const poisonChoices = references.choices('poison')

  switch (cmd.kind) {
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
  }

  return showRawJson ? (
    <JsonForm cmd={cmd} onChange={onChange} />
  ) : (
    <p className="hint">此指令请使用新版结构化属性表单编辑。</p>
  )
}
