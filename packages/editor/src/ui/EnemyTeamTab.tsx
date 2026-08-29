/** 独立敌队预制工作台：稳定身份、五个语义槽、试玩、汇总与全域引用。 */
import type { EnemyDef, EnemyTeamDef, Locale } from '@type-pal/content'
import { lookupText } from '@type-pal/content'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AddEnemyTeamCommand,
  DeleteEnemyTeamCommand,
  EnemyTeamInUseError,
  UpdateEnemyTeamCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { playProjectQuery } from '../core/play-url.js'
import {
  type BlockingEnemyTeamReference,
  enemyTeamReferences,
} from '../core/enemy-team-references.js'
import type { ScriptEditorState } from '../core/script-editor.js'
import {
  DsActionLink,
  DsButton,
  DsField,
  DsSelect,
  DsTextInput,
  DsPressable,
} from './design-system/controls.js'
import {
  DsCatalogControls,
  DsCatalogRow,
  DsObjectHero,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsWorkbenchSection,
} from './design-system/recipes.js'
import {
  DsReorderCollection,
  DsReorderItem,
  DsReorderMoveButton,
  reorderDsItems,
  type DsReorderIntent,
  useDsReorderKeys,
} from './design-system/reorder.js'

function nextTeamId(teams: readonly EnemyTeamDef[]): string {
  let index = 1
  while (teams.some((team) => team.id === `team-c${index}`)) index++
  return `team-c${index}`
}

function semanticSlots(team: EnemyTeamDef): Array<string | null> {
  return Array.from({ length: 5 }, (_, index) => team.slots[index] ?? null)
}

function storedSlots(slots: readonly (string | null)[]): Array<string | null> {
  const next = slots.slice(0, 5)
  while (next.length && next.at(-1) === null) next.pop()
  return next
}

function enemyTeamCatalogTitle(
  team: EnemyTeamDef,
  enemies: readonly EnemyDef[],
  locale: Locale,
): string {
  const enemyById = new Map(enemies.map((enemy) => [enemy.id, enemy]))
  const orderedMembers: Array<{ label: string; count: number }> = []
  const memberById = new Map<string, { label: string; count: number }>()
  for (const enemyId of team.slots) {
    if (!enemyId) continue
    const current = memberById.get(enemyId)
    if (current) {
      current.count += 1
      continue
    }
    const enemy = enemyById.get(enemyId)
    const member = {
      label: enemy ? lookupText(enemy.name, locale) : enemyId,
      count: 1,
    }
    memberById.set(enemyId, member)
    orderedMembers.push(member)
  }
  if (!orderedMembers.length) return '空敌队'
  return orderedMembers
    .map((member) => `${member.label}${member.count > 1 ? `×${member.count}` : ''}`)
    .join('、')
}


export function EnemyTeamTab(props: {
  enemyTeams: readonly EnemyTeamDef[]
  enemies: readonly EnemyDef[]
  locale: Locale
  projectId: string
  workspaceId?: string
  session: EditSession
  scriptState?: ScriptEditorState
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  onOpenEnemy?: (id: string) => void
  onOpenReference?: (reference: BlockingEnemyTeamReference) => void
}) {
  const {
    enemyTeams,
    enemies,
    locale,
    projectId,
    workspaceId,
    session,
    scriptState,
    focusObjectId,
    onObjectFocus,
    onOpenEnemy,
    onOpenReference,
  } = props
  const [filter, setFilter] = useState('')
  const [selectedId, setSelectedId] = useState(enemyTeams[0]?.id ?? '')
  const [creating, setCreating] = useState(false)
  const [draftId, setDraftId] = useState(() => nextTeamId(enemyTeams))
  const [notice, setNotice] = useState<string>()
  const selected = enemyTeams.find((team) => team.id === selectedId)
  const shown = useMemo(
    () =>
      enemyTeams.filter((team) => {
        if (!filter) return true
        const needle = filter.toLocaleLowerCase()
        return (
          team.id.toLocaleLowerCase().includes(needle) ||
          team.slots.some((enemyId) => {
            if (!enemyId) return false
            const enemy = enemies.find((candidate) => candidate.id === enemyId)
            return (
              enemyId.toLocaleLowerCase().includes(needle) ||
              (enemy ? lookupText(enemy.name, locale).toLocaleLowerCase().includes(needle) : false)
            )
          })
        )
      }),
    [enemies, enemyTeams, filter, locale],
  )
  const references = useMemo(
    () =>
      selected
        ? enemyTeamReferences(session.getState(), selected.id, scriptState)
        : ([] as BlockingEnemyTeamReference[]),
    [scriptState, selected, session],
  )
  const members = useMemo(
    () =>
      selected?.slots.flatMap((enemyId) => {
        if (!enemyId) return []
        const enemy = enemies.find((candidate) => candidate.id === enemyId)
        return enemy ? [enemy] : []
      }) ?? [],
    [enemies, selected],
  )
  const totals = members.reduce(
    (sum, enemy) => ({
      exp: sum.exp + enemy.stats.exp,
      cash: sum.cash + enemy.stats.cash,
      collectValue: sum.collectValue + enemy.stats.collectValue,
    }),
    { exp: 0, cash: 0, collectValue: 0 },
  )

  useEffect(() => {
    if (focusObjectId && enemyTeams.some((team) => team.id === focusObjectId)) {
      setSelectedId(focusObjectId)
      setCreating(false)
    }
  }, [enemyTeams, focusObjectId])

  const select = (id: string): void => {
    setSelectedId(id)
    setCreating(false)
    setNotice(undefined)
    onObjectFocus?.(id)
  }
  const beginCreate = (): void => {
    setDraftId(nextTeamId(enemyTeams))
    setCreating(true)
    setNotice(undefined)
    onObjectFocus?.(undefined)
  }
  const create = (): void => {
    const id = draftId.trim()
    if (!id) {
      setNotice('稳定 ID 不能为空。')
      return
    }
    if (enemyTeams.some((team) => team.id === id)) {
      setNotice(`敌队 ${id} 已存在。`)
      return
    }
    session.dispatch(new AddEnemyTeamCommand({ id, slots: [] }))
    select(id)
  }
  const copy = (): void => {
    if (!selected) return
    const id = nextTeamId(enemyTeams)
    session.dispatch(new AddEnemyTeamCommand({ id, slots: [...selected.slots] }))
    select(id)
  }
  const updateSlots = (slots: readonly (string | null)[]): void => {
    if (!selected) return
    const next = storedSlots(slots)
    if (
      next.length === selected.slots.length &&
      next.every((enemyId, index) => enemyId === selected.slots[index])
    )
      return
    session.dispatch(new UpdateEnemyTeamCommand(selected.id, { ...selected, slots: next }))
  }
  const remove = (): void => {
    if (!selected) return
    if (references.length) {
      setNotice(`仍有 ${references.length} 处引用，请先从右侧处理。`)
      return
    }
    if (!window.confirm(`删除敌队 ${selected.id}？此操作可以撤销。`)) return
    const index = enemyTeams.findIndex((team) => team.id === selected.id)
    const next = enemyTeams[index + 1] ?? enemyTeams[index - 1]
    try {
      session.dispatch(new DeleteEnemyTeamCommand(selected.id))
      setSelectedId(next?.id ?? '')
      onObjectFocus?.(next?.id)
    } catch (error) {
      if (!(error instanceof EnemyTeamInUseError)) throw error
      setNotice(`仍有 ${error.references.length} 处引用，请先从右侧处理。`)
    }
  }
  const slots = selected ? semanticSlots(selected) : []
  const enemyOptions = [
    { value: '', label: '空槽' },
    ...enemies.map((enemy) => ({
      value: enemy.id,
      label: `${lookupText(enemy.name, locale)} · ${enemy.id}`,
    })),
  ]
  const slotKeys = useDsReorderKeys(slots, (enemyId) => enemyId ?? undefined)
  const expectedSlotOrderRef = useRef<{ teamId: string; signature: string } | undefined>(undefined)
  const slotSignature = JSON.stringify(slots)
  useEffect(() => {
    const expected = expectedSlotOrderRef.current
    if (expected && expected.teamId === selected?.id && expected.signature === slotSignature) {
      expectedSlotOrderRef.current = undefined
      return
    }
    expectedSlotOrderRef.current = undefined
    slotKeys.reset()
  }, [selected?.id, slotKeys.reset, slotSignature])
  const slotEntries = slots.map((enemyId, index) => ({
    key: slotKeys.keys[index]!,
    label: enemyId
      ? enemies.find((enemy) => enemy.id === enemyId)
        ? lookupText(enemies.find((enemy) => enemy.id === enemyId)!.name, locale)
        : enemyId
      : `空槽 ${index + 1}`,
  }))
  const reorderSlots = (intent: DsReorderIntent): boolean => {
    const next = reorderDsItems(slots, intent, 'swap')
    if (next === slots) return false
    expectedSlotOrderRef.current = {
      teamId: selected?.id ?? '',
      signature: JSON.stringify(next),
    }
    slotKeys.move(intent, 'swap')
    updateSlots(next)
    return true
  }

  return (
    <>
      <div className="outliner outliner--split data-outliner enemy-team-outliner">
        <DsCatalogControls
          title="敌队"
          count={enemyTeams.length}
          unit="队"
          actions={[
            { id: 'create-enemy-team', label: '新建敌队', icon: 'add', onClick: beginCreate },
            {
              id: 'copy-enemy-team',
              label: '复制当前敌队',
              icon: 'copy',
              disabled: !selected,
              onClick: copy,
            },
          ]}
          search={{
            'aria-label': '搜索敌队',
            placeholder: '搜索 ID 或成员',
            value: filter,
            onChange: (event) => setFilter(event.target.value),
          }}
        />
        <div className="tree enemy-team-catalog">
          {shown.map((team) => (
            <DsCatalogRow
              key={team.id}
              selected={!creating && selected?.id === team.id}
              title={enemyTeamCatalogTitle(team, enemies, locale)}
              meta={team.id}
              onClick={() => select(team.id)}
            />
          ))}
          {!shown.length && !creating ? <div className="insp-empty">没有匹配的敌队。</div> : null}
        </div>
      </div>

      <div className="canvas-wrap data-body enemy-team-workbench">
        <main className="ds-object-workspace">
          {notice ? (
            <div className="enemy-team-notice" role="alert">
              {notice}
            </div>
          ) : null}
          {creating ? (
            <div className="ds-object-workspace__content enemy-team-scroll">
              <section className="enemy-team-create-card">
                <p className="eyebrow">新建敌队</p>
                <h2>先确定稳定 ID</h2>
                <p>ID 会被场景与剧情脚本持久引用；创建后保持稳定，显示顺序和成员可随时修改。</p>
                <DsField label="稳定 ID">
                  {({ id }) => (
                    <DsTextInput
                      id={id}
                      monospace
                      value={draftId}
                      onChange={(event) => setDraftId(event.target.value)}
                    />
                  )}
                </DsField>
                <div className="enemy-team-create-actions">
                  <DsButton variant="primary" onClick={create}>
                    创建敌队
                  </DsButton>
                  <DsButton variant="secondary" onClick={() => setCreating(false)}>
                    取消
                  </DsButton>
                </div>
              </section>
            </div>
          ) : selected ? (
            <>
              <DsObjectHero
                eyebrow="敌队预制"
                title={selected.id}
                objectId={selected.id}
                summary="只负责五个敌人语义槽；奖励、偷取与战败演出仍由每个敌人定义提供。"
                actions={
                  <>
                    <DsActionLink
                      variant="secondary"
                      icon="open"
                      href={`play.html?${playProjectQuery(projectId, workspaceId)}&battle=${encodeURIComponent(selected.id)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="读取磁盘项目；未保存改动不会进入试玩"
                    >
                      试打
                    </DsActionLink>
                    <DsButton
                      variant="danger"
                      icon="delete"
                      disabled={references.length > 0}
                      onClick={remove}
                    >
                      删除敌队
                    </DsButton>
                  </>
                }
              />
              <div className="ds-object-workspace__content enemy-team-scroll">
                <DsWorkbenchSection
                  title="阵容与顺序"
                  description="固定展示五个语义槽；空槽不会挤压后续成员，上移/下移会交换槽位。"
                >
                  <DsReorderCollection
                    adoptionId="enemy-team/fixed-slots"
                    scopeKey={`enemy-team:${selected.id}:slots`}
                    entries={slotEntries}
                    revision={session.getHistoryVersion()}
                    strategy="swap"
                    onReorder={reorderSlots}
                  >
                    <div className="enemy-team-slots">
                      {slots.map((enemyId, index) => (
                        <DsReorderItem
                          itemKey={slotEntries[index]!.key}
                          key={slotEntries[index]!.key}
                        >
                          <div className="enemy-team-slot">
                            <span className="enemy-team-slot__number">槽 {index + 1}</span>
                            <DsSelect
                              aria-label={`${selected.id} 槽 ${index + 1}`}
                              value={enemyId ?? ''}
                              options={enemyOptions}
                              invalid={!!enemyId && !enemies.some((enemy) => enemy.id === enemyId)}
                              onValueChange={(nextId) => {
                                const next = [...slots]
                                next[index] = nextId || null
                                updateSlots(next)
                              }}
                            />
                            <DsReorderMoveButton
                              itemKey={slotEntries[index]!.key}
                              direction="backward"
                              label={`槽 ${index + 1} 上移`}
                            />
                            <DsReorderMoveButton
                              itemKey={slotEntries[index]!.key}
                              direction="forward"
                              label={`槽 ${index + 1} 下移`}
                            />
                          </div>
                        </DsReorderItem>
                      ))}
                    </div>
                  </DsReorderCollection>
                </DsWorkbenchSection>
                <DsWorkbenchSection
                  title="战后结算摘要"
                  description="只读汇总；同一敌人占两个槽会累计两次。点击成员回到敌人定义编辑数据。"
                >
                  <div className="enemy-team-totals">
                    <span>
                      <strong>{totals.exp}</strong> 经验
                    </span>
                    <span>
                      <strong>{totals.cash}</strong> 金钱
                    </span>
                    <span>
                      <strong>{totals.collectValue}</strong> 收妖值
                    </span>
                  </div>
                  <div className="enemy-team-member-summary">
                    {members.map((enemy, index) => (
                      <DsPressable
                        type="button"
                        key={`${enemy.id}:${index}`}
                        onClick={() => onOpenEnemy?.(enemy.id)}
                      >
                        <strong>{lookupText(enemy.name, locale)}</strong>
                        <span>
                          {enemy.steal
                            ? enemy.steal.itemId === '0'
                              ? `偷钱 ×${enemy.steal.count}`
                              : `偷物 ${enemy.steal.itemId} ×${enemy.steal.count}`
                            : '不可偷取'}
                        </span>
                        <span>{enemy.onDefeated?.length ?? 0} 条战败指令</span>
                      </DsPressable>
                    ))}
                    {!members.length ? (
                      <p className="hint">
                        当前敌队为空；可保存为占位预制，但无法形成有效战斗阵容。
                      </p>
                    ) : null}
                  </div>
                </DsWorkbenchSection>
              </div>
            </>
          ) : (
            <div className="ds-object-workspace__content enemy-team-scroll">
              <section className="enemy-team-create-card">
                <h2>还没有敌队</h2>
                <p>创建后即可被场景敌对实体和开战脚本选择。</p>
                <DsButton variant="primary" onClick={beginCreate}>
                  创建第一个敌队
                </DsButton>
              </section>
            </div>
          )}
        </main>
      </div>

      <aside className="inspector enemy-team-reference-panel">
        <header>
          <p className="eyebrow">引用</p>
          <h3>{selected?.id ?? '选择一个敌队'}</h3>
        </header>
        {selected ? (
          <DsReferencePanel
            state={references.length ? 'ready' : 'empty'}
            count={{ kind: 'exact', value: references.length }}
            impact={{
              kind: 'blocking',
              description: references.length
                ? '删除会被任意引用阻断；先跳转处理。'
                : '当前敌队可以安全删除。',
            }}
          >
            {references.length ? (
              <DsReferenceList>
                {references.map((reference) => (
                  <DsReferenceRow
                    key={`${reference.kind}:${reference.where}`}
                    title={reference.label}
                    path={reference.where}
                    labels={[{ label: reference.kind === 'hostile' ? '敌对实体' : '剧情开战' }]}
                    action={
                      reference.locator && onOpenReference
                        ? { label: '打开', onActivate: () => onOpenReference(reference) }
                        : undefined
                    }
                    status={
                      reference.locator && onOpenReference
                        ? undefined
                        : {
                            label: '暂不可定位',
                            reason: '当前没有可编辑的精确位置。',
                            tone: 'warning',
                          }
                    }
                  />
                ))}
              </DsReferenceList>
            ) : null}
          </DsReferencePanel>
        ) : (
          <div className="insp-empty">选择一个敌队查看引用。</div>
        )}
      </aside>
    </>
  )
}
