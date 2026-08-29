/**
 * 毒/状态编辑页(数据模式·毒标签,B10 编辑器侧)。
 * 引擎侧毒系统全数据化(tick 序列指针推进/致死配对/相克环/可解度分层),此前编辑器零入口
 * (poisons 压根不在 EditorState)—— 本页补齐:左列表;中结构化表单(基础/玩家敌人双 tick
 * 序列/关系);右侧全局关系总览(致死对对称性校验 + 相克链推导,数据错一眼看出)。
 */
import type { ItemData, PoisonCurability, PoisonDef, PoisonTick } from '@type-pal/content'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { type BattleDataReference } from '../core/battle-data-references.js'
import {
  AddPoisonCommand,
  BattleDataInUseError,
  DeletePoisonCommand,
  UpdatePoisonCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import {
  DsButton,
  DsCheckbox,
  DsDraftNumberInput,
  DsDraftTextInput,
  DsField,
  DsIconButton,
  DsSelect,
  DsTag,
  DsPressable,
} from './design-system/controls.js'
import {
  DsCatalogControls,
  DsCatalogRow,
  DsCatalogWorkspace,
  DsInspectorHost,
  DsInspectorSection,
  DsInspectorTabs,
  DsObjectHero,
  DsObjectWorkspace,
  DsObjectWorkspaceContent,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsSequenceIndex,
  DsWorkbenchSection,
} from './design-system/recipes.js'
import {
  DsReorderCollection,
  DsReorderItem,
  DsReorderMoveButton,
  reorderDsItems,
  sameDsSerializableValue,
  type DsReorderIntent,
  useDsReorderKeys,
} from './design-system/reorder.js'

type PoisonInspectorTab = 'references' | 'relations' | 'help'

const CURABILITY: { v: PoisonCurability; label: string; hint: string }[] = [
  { v: 'common', label: '常规', hint: '常规解毒(灵血咒/九节菖蒲)即解' },
  { v: 'severe', label: '剧毒', hint: '仅复活类或相克可解(六大毒级)' },
  { v: 'incurable', label: '无解', hint: '谁都解不掉(无影毒/寄生,只能撑到期)' },
]
const CURABILITY_BADGE: Record<PoisonCurability, string> = {
  common: '常规',
  severe: '剧毒',
  incurable: '无解',
}

function Num(props: {
  draftKey: string
  syncToken: number
  v: number | undefined
  on: (n: number | undefined) => void
  ph?: string
  size?: 'default' | 'compact'
}) {
  return (
    <DsDraftNumberInput
      draftKey={props.draftKey}
      syncToken={props.syncToken}
      size={props.size}
      monospace
      value={props.v}
      allowEmpty
      placeholder={props.ph}
      onCommit={props.on}
    />
  )
}

/** 单条 tick 的一行编辑(扣血/半血/产道具/自解)。 */
function TickRow(props: {
  draftScope: string
  syncToken: number
  tick: PoisonTick
  items: ItemData[]
  onChange: (next: PoisonTick) => void
  onRemove: () => void
  reorderKey: string
  idx: number
}) {
  const { draftScope, syncToken, tick, items, onChange, onRemove, reorderKey, idx } = props
  // patch 语义:undefined = 删键(落盘 JSON 不留空键)
  const set = (p: Partial<PoisonTick>): void => {
    const next = { ...tick, ...p } as Record<string, unknown>
    for (const [k, v] of Object.entries(p)) if (v === undefined) delete next[k]
    onChange(next as PoisonTick)
  }
  return (
    <div className="ef-row">
      <DsSequenceIndex value={idx + 1} accessibleLabel={`第 ${idx + 1} 回合`} />
      <div className="ef-fields">
        <DsField label="扣血">
          <Num
            draftKey={`${draftScope}:hp-delta`}
            syncToken={syncToken}
            size="compact"
            v={tick.hpDelta}
            on={(n) => set({ hpDelta: n })}
          />
        </DsField>
        <DsField label="半血上限">
          <Num
            draftKey={`${draftScope}:halve-hp`}
            syncToken={syncToken}
            size="compact"
            v={tick.halveHp}
            ph="留空 = 无"
            on={(n) => set({ halveHp: n })}
          />
        </DsField>
        <DsField label="产道具">
          {(field) => (
            <DsSelect
              size="compact"
              {...field}
              value={tick.grantItem ?? ''}
              options={[
                { value: '', label: '(无)' },
                ...items.map((item) => ({ value: String(item.id), label: item.name })),
              ]}
              onValueChange={(grantItem) => set({ grantItem: grantItem || undefined })}
            />
          )}
        </DsField>
        <DsCheckbox
          size="compact"
          label="自解"
          checked={tick.selfCure === true}
          title="本回合跑完自动移除此毒"
          onChange={(e) => set({ selfCure: e.target.checked || undefined })}
        />
      </div>
      <span className="ef-ops">
        <DsReorderMoveButton
          itemKey={reorderKey}
          direction="backward"
          label={`上移回合 ${idx + 1}`}
        />
        <DsReorderMoveButton
          itemKey={reorderKey}
          direction="forward"
          label={`下移回合 ${idx + 1}`}
        />
        <DsIconButton
          size="compact"
          variant="danger"
          icon="delete"
          label={`删除回合 ${idx + 1}`}
          onClick={onRemove}
        />
      </span>
    </div>
  )
}

/** tick 序列编辑器(玩家/敌人各一份)。 */
interface TicksEditorProps {
  draftScope: string
  syncToken: number
  title: string
  hint: string
  ticks: PoisonTick[] | undefined
  items: ItemData[]
  onChange: (next: PoisonTick[] | undefined) => void
}

function TicksEditorView(props: TicksEditorProps) {
  const { draftScope, syncToken, title, hint, ticks, items, onChange } = props
  const list = ticks ?? []
  const reorderKeys = useDsReorderKeys(list)
  const setAt = (i: number, next: PoisonTick): void => {
    const arr = [...list]
    arr[i] = next
    onChange(arr)
  }
  const reorder = (intent: DsReorderIntent): boolean => {
    const next = reorderDsItems(list, intent, 'insert', sameDsSerializableValue)
    if (next === list) return false
    reorderKeys.move(intent)
    onChange([...next])
    return true
  }
  return (
    <DsWorkbenchSection title={title} description={hint}>
      <DsReorderCollection
        adoptionId="poison/ticks"
        scopeKey={draftScope}
        entries={list.map((_tick, index) => ({
          key: reorderKeys.keys[index]!,
          label: `${title}第 ${index + 1} 回合`,
        }))}
        revision={syncToken}
        onReorder={reorder}
      >
        {list.map((t, i) => {
          const reorderKey = reorderKeys.keys[i]!
          return (
            <DsReorderItem itemKey={reorderKey} key={reorderKey}>
              <TickRow
                reorderKey={reorderKey}
                draftScope={`${draftScope}:${reorderKey}`}
                syncToken={syncToken}
                tick={t}
                items={items}
                idx={i}
                onChange={(next) => setAt(i, next)}
                onRemove={() => {
                  const arr = list.filter((_, j) => j !== i)
                  onChange(arr.length ? arr : undefined) // 清空 = 删键(无 DoT)
                }}
              />
            </DsReorderItem>
          )
        })}
      </DsReorderCollection>
      <DsButton
        variant="secondary"
        icon="add"
        onClick={() => onChange([...list, { hpDelta: -10 }])}
      >
        添加回合
      </DsButton>
    </DsWorkbenchSection>
  )
}

/** Name/relationship edits do not invalidate either tick editor. */
const TicksEditor = memo(
  TicksEditorView,
  (left, right) =>
    left.draftScope === right.draftScope &&
    left.syncToken === right.syncToken &&
    left.title === right.title &&
    left.hint === right.hint &&
    left.ticks === right.ticks &&
    left.items === right.items &&
    left.onChange === right.onChange,
)

/** 全局关系总览:致死对(对称性校验)+ 相克链(单向环推导)。数据驱动,配错一眼看出。 */
function RelationOverview(props: { poisons: PoisonDef[]; onPick: (id: number) => void }) {
  const { poisons, onPick } = props
  const byId = useMemo(() => new Map(poisons.map((p) => [p.id, p])), [poisons])
  const nameOf = (id: number): string => byId.get(id)?.name ?? `?${id}`

  // 致死对:去重(A<B 归一);不对称(A 指 B 而 B 不指回)标警
  const lethalPairs: { a: number; b: number; symmetric: boolean }[] = []
  const seen = new Set<string>()
  for (const p of poisons) {
    if (p.lethalWith === undefined) continue
    const [a, b] = p.id < p.lethalWith ? [p.id, p.lethalWith] : [p.lethalWith, p.id]
    const key = `${a}-${b}`
    if (seen.has(key)) continue
    seen.add(key)
    lethalPairs.push({ a, b, symmetric: byId.get(p.lethalWith)?.lethalWith === p.id })
  }

  // 相克链:从任一带 counters 的毒沿 counters 走,直到回头/断链(环则收口标 ⟲)
  const chains: { ids: number[]; loop: boolean }[] = []
  const visited = new Set<number>()
  for (const p of poisons) {
    if (p.counters === undefined || visited.has(p.id)) continue
    const ids = [p.id]
    visited.add(p.id)
    let cur = byId.get(p.counters)
    let loop = false
    while (cur) {
      if (cur.id === ids[0]) {
        loop = true
        break
      }
      if (visited.has(cur.id)) break
      ids.push(cur.id)
      visited.add(cur.id)
      cur = cur.counters !== undefined ? byId.get(cur.counters) : undefined
    }
    chains.push({ ids, loop })
  }

  return (
    <>
      <div className="section">
        <h4>
          致死对 <span className="hint2">投掷互为暴毙;应两两对称</span>
        </h4>
        {lethalPairs.length ? (
          lethalPairs.map((pr) => (
            <div key={`${pr.a}-${pr.b}`} className="rel-line">
              <DsPressable type="button" className="rel-poison" onClick={() => onPick(pr.a)}>
                {nameOf(pr.a)}
              </DsPressable>
              <span className="rel-op">☠</span>
              <DsPressable type="button" className="rel-poison" onClick={() => onPick(pr.b)}>
                {nameOf(pr.b)}
              </DsPressable>
              {!pr.symmetric && (
                <span className="rel-warn" title="仅单向指回:另一侧 lethalWith 没指回来">
                  ⚠ 不对称
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="insp-empty">无致死配对。</div>
        )}
      </div>
      <div className="section">
        <h4>
          相克链 <span className="hint2">对己服毒沿箭头解上一环(以毒攻毒)</span>
        </h4>
        {chains.length ? (
          chains.map((c) => (
            <div key={c.ids.join('-')} className="rel-line rel-chain">
              {c.ids.map((id, i) => (
                <span key={id} className="rel-chain-node">
                  {i > 0 && <span className="rel-op">→</span>}
                  <DsPressable type="button" className="rel-poison" onClick={() => onPick(id)}>
                    {nameOf(id)}
                  </DsPressable>
                </span>
              ))}
              {c.loop && (
                <span className="rel-op" title="首尾闭环">
                  ⟲
                </span>
              )}
            </div>
          ))
        ) : (
          <div className="insp-empty">无相克关系。</div>
        )}
      </div>
    </>
  )
}

export function PoisonTab(props: {
  poisons: PoisonDef[]
  items: ItemData[]
  session: EditSession
  referenceIndex: ReadonlyMap<string, readonly BattleDataReference[]>
  referenceStatus: EditorDerivedStatus
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  onOpenReference?: (reference: BattleDataReference) => void
}) {
  const {
    poisons,
    items,
    session,
    referenceIndex,
    referenceStatus,
    focusObjectId,
    onObjectFocus,
    onOpenReference,
  } = props
  const [filter, setFilter] = useState('')
  const [selId, setSelId] = useState<number>(poisons[0]?.id ?? 0)
  const [inspectorTab, setInspectorTab] = useState<PoisonInspectorTab>('references')
  const appliedFocusObjectId = useRef<string | undefined>(undefined)
  const shown = useMemo(
    () =>
      poisons.filter((p) => !filter || String(p.id).includes(filter) || p.name.includes(filter)),
    [poisons, filter],
  )
  const poison = poisons.find((p) => p.id === selId) ?? shown[0]
  const syncToken = session.getHistoryVersion()
  const references = poison ? (referenceIndex.get(String(poison.id)) ?? []) : []
  const referenceCount =
    referenceStatus === 'current'
      ? { kind: 'exact' as const, value: references.length }
      : references.length
        ? { kind: 'at-least' as const, value: references.length }
        : { kind: 'unknown' as const }
  const referencePanelState =
    referenceStatus === 'current'
      ? references.length
        ? ('ready' as const)
        : ('empty' as const)
      : referenceStatus === 'failed'
        ? ('error' as const)
        : referenceStatus === 'stale'
          ? ('partial' as const)
          : ('loading' as const)
  const others = poisons.filter((p) => p.id !== poison?.id)
  const selectPoison = (id: number): void => {
    setSelId(id)
    onObjectFocus?.(String(id))
  }

  useEffect(() => {
    const id = Number(focusObjectId)
    if (
      focusObjectId &&
      appliedFocusObjectId.current !== focusObjectId &&
      Number.isInteger(id) &&
      poisons.some((candidate) => candidate.id === id)
    ) {
      setSelId(id)
      appliedFocusObjectId.current = focusObjectId
    }
  }, [focusObjectId, poisons])

  const patch = useCallback(
    (p: Partial<Omit<PoisonDef, 'id'>>): void => {
      if (poison?.id !== undefined) session.dispatch(new UpdatePoisonCommand(poison.id, p))
    },
    [poison?.id, session],
  )
  const patchPlayerTicks = useCallback(
    (ticks: PoisonTick[] | undefined): void => patch({ playerTicks: ticks }),
    [patch],
  )
  const patchEnemyTicks = useCallback(
    (ticks: PoisonTick[] | undefined): void => patch({ enemyTicks: ticks }),
    [patch],
  )
  const removePoison = (): void => {
    if (!poison || referenceStatus !== 'current' || references.length) return
    if (!window.confirm(`删除毒 ${poison.name}(${poison.id})？此操作可以撤销。`)) return
    const index = poisons.findIndex((entry) => entry.id === poison.id)
    const next = poisons[index + 1] ?? poisons[index - 1]
    try {
      session.dispatch(new DeletePoisonCommand(poison.id))
      if (next) selectPoison(next.id)
      else {
        setSelId(0)
        onObjectFocus?.(undefined)
      }
    } catch (error) {
      if (!(error instanceof BattleDataInUseError)) throw error
    }
  }

  return (
    <>
      {/* 左:标签栏 + 毒列表 */}
      <DsCatalogWorkspace
        label="毒目录"
        className="outliner data-outliner"
        header={
          <DsCatalogControls
            title="毒"
            count={poisons.length}
            unit="种"
            actions={[
              {
                id: 'create-poison',
                label: '新建毒',
                icon: 'add',
                onClick: () => {
                  const name = window.prompt('新毒名字:', '')?.trim()
                  if (!name) return
                  let n = 1000
                  while (poisons.some((poisonEntry) => poisonEntry.id === n)) n++
                  session.dispatch(new AddPoisonCommand(n, name))
                  selectPoison(n)
                },
              },
            ]}
            search={{
              'aria-label': '过滤毒',
              placeholder: '过滤 id/名…',
              value: filter,
              onChange: (event) => setFilter(event.target.value),
            }}
          />
        }
      >
        {shown.map((p) => (
          <DsCatalogRow
            key={p.id}
            selected={p.id === poison?.id}
            title={p.name}
            meta={p.id}
            trailing={<DsTag tone="neutral">{CURABILITY_BADGE[p.curability]}</DsTag>}
            onClick={() => selectPoison(p.id)}
          />
        ))}
      </DsCatalogWorkspace>

      {/* 中：独立的毒编辑表单，不复用技能页私有样式。 */}
      <DsObjectWorkspace
        as="div"
        label="毒工作区"
        className="canvas-wrap data-body"
        contentMode="manual"
      >
        {poison ? (
          <>
            <DsObjectHero
              eyebrow="毒"
              title={poison.name}
              objectId={String(poison.id)}
              summary="管理玩家/敌人逐回合效果、可解度、致死配对与相克关系。"
              meta={<DsTag tone="neutral">{CURABILITY_BADGE[poison.curability]}</DsTag>}
              actions={
                <DsButton
                  variant="danger"
                  icon="delete"
                  disabled={referenceStatus !== 'current' || references.length > 0}
                  title={
                    referenceStatus !== 'current'
                      ? '毒引用仍在检查，暂不能删除'
                      : references.length
                        ? `仍有 ${references.length} 处引用，请先从右侧处理`
                        : '删除毒'
                  }
                  onClick={removePoison}
                >
                  删除毒
                </DsButton>
              }
            />
            <DsObjectWorkspaceContent className="et-scroll battle-data-form">
              <DsWorkbenchSection title="基础" description="定义显示名称、可解度与状态头像染色。">
                <div className="battle-data-grid">
                  <DsField label="名字">
                    {(field) => (
                      <DsDraftTextInput
                        {...field}
                        draftKey={`poison:${poison.id}:name`}
                        syncToken={syncToken}
                        value={poison.name}
                        onCommit={(name) => patch({ name })}
                      />
                    )}
                  </DsField>
                  <DsField
                    label="可解度"
                    help={CURABILITY.find((c) => c.v === poison.curability)?.hint}
                  >
                    {(field) => (
                      <DsSelect
                        {...field}
                        value={poison.curability}
                        options={CURABILITY.map((curability) => ({
                          value: curability.v,
                          label: curability.label,
                          description: curability.hint,
                        }))}
                        onValueChange={(curability) =>
                          patch({ curability: curability as PoisonCurability })
                        }
                      />
                    )}
                  </DsField>
                  <DsField label="染色#" help="状态页头像染色的调色板色号；0 = 不染">
                    <Num
                      draftKey={`poison:${poison.id}:color`}
                      syncToken={syncToken}
                      v={poison.color}
                      on={(n) => patch({ color: n ?? 0 })}
                    />
                  </DsField>
                </div>
              </DsWorkbenchSection>

              <TicksEditor
                draftScope={`poison:${poison.id}:player-ticks`}
                syncToken={syncToken}
                title="玩家中毒 · 逐回合"
                hint="每回合跑一格、指针前进;到尾重复末格(勾「自解」则移除)"
                ticks={poison.playerTicks}
                items={items}
                onChange={patchPlayerTicks}
              />
              <TicksEditor
                draftScope={`poison:${poison.id}:enemy-ticks`}
                syncToken={syncToken}
                title="敌人中毒 · 逐回合"
                hint="同毒对敌通常更狠(原版双档);留空 = 对敌无 DoT"
                ticks={poison.enemyTicks}
                items={items}
                onChange={patchEnemyTicks}
              />

              <DsWorkbenchSection
                title="关系"
                description="致死表示投掷到已中配对毒者当场暴毙；相克表示对己服毒解掉所克之毒。"
              >
                <div className="battle-data-grid">
                  <DsField label="致死配对">
                    {(field) => (
                      <DsSelect
                        {...field}
                        value={poison.lethalWith == null ? '' : String(poison.lethalWith)}
                        options={[
                          { value: '', label: '(无)' },
                          ...others.map((other) => ({
                            value: String(other.id),
                            label: other.name,
                          })),
                        ]}
                        onValueChange={(lethalWith) =>
                          patch({
                            lethalWith: lethalWith === '' ? undefined : Number(lethalWith),
                          })
                        }
                      />
                    )}
                  </DsField>
                  <DsField label="所克之毒">
                    {(field) => (
                      <DsSelect
                        {...field}
                        value={poison.counters == null ? '' : String(poison.counters)}
                        options={[
                          { value: '', label: '(无)' },
                          ...others.map((other) => ({
                            value: String(other.id),
                            label: other.name,
                          })),
                        ]}
                        onValueChange={(counters) =>
                          patch({
                            counters: counters === '' ? undefined : Number(counters),
                          })
                        }
                      />
                    )}
                  </DsField>
                </div>
              </DsWorkbenchSection>
            </DsObjectWorkspaceContent>
          </>
        ) : (
          <div className="insp-empty ds-empty-state--roomy">无毒定义</div>
        )}
      </DsObjectWorkspace>

      {/* 右:提示 + 关系总览 */}
      <DsInspectorHost className="inspector inspector--tabbed battle-data-inspector poison-inspector">
        <div className="insp-head">
          <div className="what">毒</div>
          <div className="who">{poison?.name ?? '未选择'}</div>
        </div>
        <DsInspectorTabs
          id="poison-inspector"
          label="毒检查器"
          activeId={inspectorTab}
          onChange={(id) => setInspectorTab(id as PoisonInspectorTab)}
          items={[
            {
              id: 'references',
              label: '引用',
              count: references.length,
              panel: (
                <DsInspectorSection
                  title="引用"
                  description="技能、物品和其他毒定义中的关系边会阻断删除。"
                >
                  <DsReferencePanel
                    state={referencePanelState}
                    count={referenceCount}
                    impact={{
                      kind: 'blocking',
                      description:
                        referenceStatus !== 'current'
                          ? '引用结果尚未刷新完成；当前仅展示上一份已知结果，暂不能删除。'
                          : references.length
                            ? '解除技能、物品或其他毒定义中的关系边后才能删除。'
                            : '当前毒定义可以安全删除。',
                    }}
                  >
                    {references.length ? (
                      <DsReferenceList>
                        {references.map((reference) => (
                          <DsReferenceRow
                            key={`${reference.where}:${reference.kind}`}
                            title={reference.label}
                            detail={reference.detail}
                            path={reference.where}
                            action={
                              reference.locator && onOpenReference
                                ? {
                                    label: '打开',
                                    onActivate: () => onOpenReference(reference),
                                  }
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
                </DsInspectorSection>
              ),
            },
            {
              id: 'relations',
              label: '关系',
              panel: <RelationOverview poisons={poisons} onPick={selectPoison} />,
            },
            {
              id: 'help',
              label: '说明',
              panel: (
                <DsInspectorSection title="编辑说明">
                  <p className="insp-hint">
                    逐回合序列会按指针推进，到尾重复；末格「自解」用于暴扣后自除或寄生到期。
                  </p>
                </DsInspectorSection>
              ),
            },
          ]}
        />
      </DsInspectorHost>
    </>
  )
}
