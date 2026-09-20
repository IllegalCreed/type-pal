import { EQUIP_SLOT_IDS, lookupText } from '@type-pal/content'
import type {
  TrialBag,
  TrialEnemies,
  TrialMember,
  TrialParty,
  TrialPool,
  TrialStats,
} from '@type-pal/reforge'
import { previewBattleTrialParty, TRIAL_MAX_PARTY_MEMBERS } from '@type-pal/reforge'
import { useMemo, useRef } from 'react'
import { emptyTrialMember } from '../core/battle-simulator-state.js'
import type { EditorState } from '../core/edit-session.js'
import {
  DsButton,
  DsDraftNumberField,
  DsEmptyState,
  DsField,
  DsFieldGroup,
  DsSelectField,
} from './design-system/controls.js'
import { DsAddPickerDialog, DsMultiSelect } from './design-system/index.js'
import { DsInlineComposer, DsNumberFieldGrid, DsWorkbenchSection } from './design-system/recipes.js'

const STAT_LABELS: Record<keyof TrialStats, string> = {
  level: '等级',
  maxHP: '最大体力',
  maxMP: '最大真气',
  attack: '武术',
  magicAttack: '灵力',
  defense: '防御',
  speed: '身法',
  luck: '吉运',
}
const SLOT_LABELS = {
  weapon: '武器',
  head: '头部',
  body: '身体',
  cloak: '披风',
  feet: '脚部',
  accessory: '饰品',
}
export function TrialPoolField(props: {
  label: string
  value: TrialPool
  onChange: (value: TrialPool) => void
  scope: string
}) {
  return (
    <DsFieldGroup className="trial-choice-short">
      <DsSelectField
        label={props.label}
        value={props.value.kind}
        options={[
          { value: 'full', label: '满值' },
          { value: 'value', label: '指定数值' },
          { value: 'percent', label: '指定比例' },
        ]}
        onValueChange={(kind) =>
          props.onChange(
            kind === 'full'
              ? { kind: 'full' }
              : { kind: kind === 'percent' ? 'percent' : 'value', value: 0 },
          )
        }
      />
      {props.value.kind !== 'full' && (
        <DsDraftNumberField
          label={props.value.kind === 'percent' ? '比例（%）' : '当前数值'}
          draftKey={props.scope}
          value={props.value.value}
          min={0}
          max={props.value.kind === 'percent' ? 100 : Number.MAX_SAFE_INTEGER}
          integer
          onCommit={(value) =>
            props.onChange({
              kind: props.value.kind === 'percent' ? 'percent' : 'value',
              value: value ?? 0,
            })
          }
        />
      )}
    </DsFieldGroup>
  )
}
export function TrialPartyEditor({
  value,
  onChange,
  state,
  scope,
}: {
  value: TrialParty
  onChange: (value: TrialParty) => void
  state: EditorState
  scope: string
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const revision = useMemo(() => ({ state, value }), [state, value])
  const update = (id: string, patch: Partial<TrialMember>) =>
    onChange({
      members: value.members.map((member) =>
        member.actorId === id ? { ...member, ...patch } : member,
      ),
    })
  const candidates = state.actors.filter(
    (actor) => actor.battler && !value.members.some((member) => member.actorId === actor.id),
  )
  return (
    <section ref={sectionRef} tabIndex={-1} className="trial-collection" aria-label="我方队伍配置">
      <div className="trial-section-heading">
        <strong>
          我方队伍 · {value.members.length} / {TRIAL_MAX_PARTY_MEMBERS} 人
        </strong>
        <DsAddPickerDialog
          adoptionId="simulator/party"
          triggerLabel="添加队员"
          title="添加试打队员"
          description="搜索可参战角色，确认后加入本配置；最多3人，同一角色不能重复加入。"
          confirmLabel="加入队伍"
          options={candidates.map((actor) => ({
            id: actor.id,
            label: lookupText(actor.name, state.locale),
            description: `等级 ${actor.battler?.baseStats.level} · 体力 ${actor.battler?.baseStats.maxHP} · 真气 ${actor.battler?.baseStats.maxMP}`,
          }))}
          scopeKey={`${scope}:members`}
          revision={revision}
          readOnly={value.members.length >= TRIAL_MAX_PARTY_MEMBERS}
          emptyMessage="没有可加入的角色；可先在角色目录配置可参战角色。"
          fallbackFocusRef={sectionRef}
          onConfirm={(actorId) => {
            if (
              value.members.length >= TRIAL_MAX_PARTY_MEMBERS ||
              !candidates.some((actor) => actor.id === actorId)
            )
              return false
            onChange({ members: [...value.members, emptyTrialMember(actorId)] })
          }}
        />
      </div>
      {!value.members.length && (
        <DsEmptyState
          layout="embedded"
          title="尚无队员"
          description={candidates.length ? '从右上角添加队员。' : '请先在角色目录配置可参战角色。'}
        />
      )}
      {value.members.length === TRIAL_MAX_PARTY_MEMBERS && (
        <p className="hint2">已达到{TRIAL_MAX_PARTY_MEMBERS}人上限；可先移出一名队员再替换。</p>
      )}
      {value.members.map((member, index) => {
        const actor = state.actors.find((actor) => actor.id === member.actorId)
        const selectedSkills = member.skills.kind === 'replace' ? member.skills.ids : []
        let effective: ReturnType<typeof previewBattleTrialParty>[number] | undefined
        try {
          effective = previewBattleTrialParty(
            { members: [member] },
            {
              actorsById: Object.fromEntries(state.actors.map((actor) => [actor.id, actor])),
              items: Object.fromEntries(state.items.map((item) => [item.id, item])),
            },
          )[0]
        } catch {
          // Incomplete references remain editable; the workspace lists their precise errors.
        }
        return (
          <DsWorkbenchSection
            key={member.actorId}
            title={actor ? lookupText(actor.name, state.locale) : `缺失角色 ${member.actorId}`}
            description="属性留空表示继承；修改等级不会自动生成成长数值或学习技能。"
            actions={
              <DsButton
                variant="danger"
                onClick={() => {
                  // Focus survives removing the card, including when the add trigger is at its cap.
                  sectionRef.current?.focus()
                  onChange({
                    members: value.members.filter((other) => other.actorId !== member.actorId),
                  })
                }}
              >
                移出队伍
              </DsButton>
            }
          >
            <div className="trial-choice-short">
              <DsSelectField
                label="队伍位置"
                value={String(index)}
                options={value.members.map((_, i) => ({
                  value: String(i),
                  label: `第 ${i + 1} 位`,
                }))}
                onValueChange={(position) => {
                  const members = [...value.members]
                  const other = members[Number(position)]
                  if (!other) return
                  members[index] = other
                  members[Number(position)] = member
                  onChange({ members })
                }}
              />
            </div>
            <div className="trial-base-stats">
              <DsNumberFieldGrid>
                {Object.entries(STAT_LABELS).map(([key, label]) => {
                  const stat = key as keyof TrialStats
                  return (
                    <DsDraftNumberField
                      key={key}
                      label={label}
                      draftKey={`${scope}:${member.actorId}:${key}`}
                      value={member.stats[stat]}
                      placeholder={`继承 ${actor?.battler?.baseStats[stat] ?? '—'}`}
                      allowEmpty
                      integer
                      min={stat === 'level' || stat === 'maxHP' ? 1 : 0}
                      max={Number.MAX_SAFE_INTEGER}
                      onCommit={(next) => {
                        const stats = { ...member.stats }
                        if (next === undefined) delete stats[stat]
                        else stats[stat] = next
                        update(member.actorId, { stats })
                      }}
                    />
                  )
                })}
              </DsNumberFieldGrid>
            </div>
            <div className="trial-config-columns">
              {EQUIP_SLOT_IDS.map((slot) => (
                <DsFieldGroup key={slot}>
                  <DsSelectField
                    label={SLOT_LABELS[slot]}
                    value={
                      member.equipment[slot] === undefined
                        ? 'inherit'
                        : member.equipment[slot] === null
                          ? 'none'
                          : `item:${member.equipment[slot]}`
                    }
                    options={[
                      { value: 'inherit', label: '继承角色默认装备' },
                      { value: 'none', label: '不装备' },
                      ...state.items
                        .filter(
                          (item) =>
                            item.equip?.slot === slot &&
                            item.equip.equipableBy.includes(member.actorId),
                        )
                        .map((item) => ({
                          value: `item:${item.id}`,
                          label: lookupText(item.name, state.locale),
                        })),
                    ]}
                    onValueChange={(next) => {
                      const equipment = { ...member.equipment }
                      if (next === 'inherit') delete equipment[slot]
                      else equipment[slot] = next === 'none' ? null : next.slice(5)
                      update(member.actorId, { equipment })
                    }}
                  />
                </DsFieldGroup>
              ))}
            </div>
            <div className="trial-config-columns">
              <DsFieldGroup className="trial-choice-short">
                <DsSelectField
                  label="习得技能"
                  value={member.skills.kind}
                  options={[
                    { value: 'inherit', label: '继承角色初始技能' },
                    { value: 'replace', label: '指定本预设技能' },
                  ]}
                  onValueChange={(kind) =>
                    update(member.actorId, {
                      skills:
                        kind === 'inherit'
                          ? { kind: 'inherit' }
                          : { kind: 'replace', ids: [...(actor?.battler?.initialMagic ?? [])] },
                    })
                  }
                />
              </DsFieldGroup>
              {member.skills.kind === 'replace' && (
                <DsFieldGroup>
                  <DsField label="指定技能">
                    {(field) => (
                      <DsMultiSelect
                        id={field.id}
                        label="指定技能"
                        summaryMode="count"
                        value={selectedSkills}
                        options={[
                          ...state.skills.map((skill) => ({
                            value: skill.id,
                            label: skill.name,
                            description: skill.id,
                          })),
                          ...selectedSkills
                            .filter((id) => !state.skills.some((skill) => skill.id === id))
                            .map((id) => ({ value: id, label: `${id}（缺失引用）` })),
                        ]}
                        onChange={(ids) =>
                          update(member.actorId, { skills: { kind: 'replace', ids } })
                        }
                      />
                    )}
                  </DsField>
                </DsFieldGroup>
              )}
            </div>
            <p className="hint2">装备授予的技能另由正式战斗派生，不会重复记入习得技能。</p>
            <div className="trial-config-columns trial-pool-columns">
              <TrialPoolField
                label="初始体力"
                value={member.hp}
                scope={`${scope}:${member.actorId}:hp`}
                onChange={(hp) => update(member.actorId, { hp })}
              />
              <TrialPoolField
                label="初始真气"
                value={member.mp}
                scope={`${scope}:${member.actorId}:mp`}
                onChange={(mp) => update(member.actorId, { mp })}
              />
            </div>
            {effective && (
              <section
                className="trial-effective-readout"
                aria-label={`${actor ? lookupText(actor.name, state.locale) : member.actorId}开战有效值`}
              >
                <h3>开战有效值（含装备）</h3>
                <dl className="trial-effective-stats">
                  {[
                    ['体力', `${effective.hp} / ${effective.maxHp}`],
                    ['真气', `${effective.mp} / ${effective.maxMp}`],
                    ['武术', effective.attackStrength],
                    ['灵力', effective.magicStrength],
                    ['防御', effective.defense],
                    ['身法', effective.baseDexterity],
                    ['吉运', effective.fleeRate],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="hint2">
                  有效技能：
                  {effective.skills
                    .map((id) => state.skills.find((skill) => skill.id === id)?.name ?? id)
                    .join('、') || '无'}
                </p>
              </section>
            )}
          </DsWorkbenchSection>
        )
      })}
    </section>
  )
}
export function TrialEnemiesEditor({
  value,
  onChange,
  state,
}: {
  value: TrialEnemies
  onChange: (value: TrialEnemies) => void
  state: EditorState
}) {
  const team =
    value.kind === 'team' ? state.enemyTeams?.find((team) => team.id === value.teamId) : undefined
  return (
    <section className="trial-collection" aria-label="敌方编队配置">
      <div className="trial-config-columns">
        <DsFieldGroup className="trial-choice-short">
          <DsSelectField
            label="编队来源"
            value={value.kind}
            options={[
              { value: 'team', label: '引用已有敌队', disabled: !state.enemyTeams?.length },
              { value: 'slots', label: '预设内临时编队' },
            ]}
            onValueChange={(kind) => {
              if (kind === 'team') {
                const first = state.enemyTeams?.[0]
                if (first) onChange({ kind: 'team', teamId: first.id })
              } else
                onChange({
                  kind: 'slots',
                  slots: Array.from({ length: 5 }, (_, i) => team?.slots[i] ?? null),
                })
            }}
          />
        </DsFieldGroup>
        {value.kind === 'team' ? (
          <DsFieldGroup>
            <DsSelectField
              label="敌队"
              value={value.teamId}
              placeholder="选择敌队"
              options={(state.enemyTeams ?? []).map((team) => ({ value: team.id, label: team.id }))}
              onValueChange={(teamId) => onChange({ kind: 'team', teamId })}
            />
          </DsFieldGroup>
        ) : null}
      </div>
      {value.kind === 'slots' && (
        <div className="trial-config-columns">
          {value.slots.map((id, index) => (
            <DsFieldGroup key={index}>
              <DsSelectField
                label={`敌方槽位 ${index + 1}`}
                value={id === null ? 'empty' : `enemy:${id}`}
                options={[
                  { value: 'empty', label: '空槽' },
                  ...(state.enemies ?? []).map((enemy) => ({
                    value: `enemy:${enemy.id}`,
                    label: lookupText(enemy.name, state.locale),
                  })),
                ]}
                onValueChange={(next) =>
                  onChange({
                    kind: 'slots',
                    slots: value.slots.map((id, i) =>
                      i === index ? (next === 'empty' ? null : next.slice(6)) : id,
                    ),
                  })
                }
              />
            </DsFieldGroup>
          ))}
        </div>
      )}
      <p className="hint2">
        保留五个语义槽和空槽；首批敌方使用正式定义、满体力，不额外设置初始毒和状态。
      </p>
    </section>
  )
}
export function TrialBagEditor({
  value,
  onChange,
  state,
  scope,
}: {
  value: TrialBag
  onChange: (value: TrialBag) => void
  state: EditorState
  scope: string
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const revision = useMemo(() => ({ state, value }), [state, value])
  const candidates = state.items.filter(
    (item) => !value.items.some((row) => row.itemId === item.id),
  )
  return (
    <section ref={sectionRef} tabIndex={-1} className="trial-collection" aria-label="背包物品配置">
      <div className="trial-section-heading">
        <strong>背包物品 · {value.items.length} 种</strong>
        <DsAddPickerDialog
          adoptionId="simulator/bag"
          triggerLabel="添加物品"
          title="添加试打物品"
          confirmLabel="加入背包"
          description="确认后以数量1加入本配置；穿戴装备在我方配置中设置。"
          options={candidates.map((item) => ({
            id: item.id,
            label: lookupText(item.name, state.locale),
          }))}
          scopeKey={`${scope}:items`}
          revision={revision}
          emptyMessage={
            state.items.length ? '所有物品都已加入本配置。' : '项目尚无物品，请先到物品目录创建。'
          }
          fallbackFocusRef={sectionRef}
          onConfirm={(itemId) => {
            if (!candidates.some((item) => item.id === itemId)) return false
            onChange({ items: [...value.items, { itemId, quantity: 1 }] })
          }}
        />
      </div>
      {!value.items.length && (
        <DsEmptyState
          layout="embedded"
          title="背包为空"
          description={candidates.length ? '从右上角添加试打物品。' : '请先在物品目录创建物品。'}
        />
      )}
      <div className="trial-bag-list">
        {value.items.map((row) => (
          <DsInlineComposer
            key={row.itemId}
            density="default"
            control={
              <DsDraftNumberField
                label={lookupText(
                  state.items.find((item) => item.id === row.itemId)?.name ?? row.itemId,
                  state.locale,
                )}
                draftKey={`${scope}:${row.itemId}`}
                value={row.quantity}
                integer
                min={0}
                max={Number.MAX_SAFE_INTEGER}
                onCommit={(quantity) => {
                  if (!quantity) sectionRef.current?.focus()
                  onChange({
                    items: value.items
                      .map((item) =>
                        item.itemId === row.itemId ? { ...item, quantity: quantity ?? 0 } : item,
                      )
                      .filter((item) => item.quantity > 0),
                  })
                }}
              />
            }
            action={
              <DsButton
                variant="danger"
                onClick={() => {
                  sectionRef.current?.focus()
                  onChange({ items: value.items.filter((item) => item.itemId !== row.itemId) })
                }}
              >
                移除物品
              </DsButton>
            }
          />
        ))}
      </div>
      <p className="hint2">
        数量设为0会移除；穿戴装备在我方配置中设置。能否使用或投掷仍按物品的正式战斗用途判断。
      </p>
    </section>
  )
}
