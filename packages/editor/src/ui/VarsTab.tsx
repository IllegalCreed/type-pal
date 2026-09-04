import type {
  WorldVariableDefinitionV1,
  WorldVariableKindV1,
  WorldVariableRegistryV1,
} from '@type-pal/content'
import { useEffect, useMemo, useState } from 'react'
import {
  AddWorldVariableCommand,
  DeleteWorldVariableCommand,
  UpdateWorldVariableCommand,
  WorldVariableInUseError,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import type { ProjectReferenceEdge, ProjectReferenceIndex } from '../core/project-reference.js'
import type { CurrentProjectReferenceIndexProvider } from '../core/project-reference-adapters.js'
import {
  DsButton,
  DsCheckbox,
  DsField,
  DsNumberField,
  DsSelect,
  DsTextAreaField,
  DsTextField,
} from './design-system/controls.js'
import {
  DsCatalogControls,
  DsCatalogGroupHeader,
  DsCatalogRow,
  DsObjectHero,
  DsObjectWorkspace,
  DsReferenceGroup,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsWorkbenchSection,
} from './design-system/recipes.js'

interface Draft {
  name: string
  description: string
  initial: boolean | number
}

function draftOf(definition: WorldVariableDefinitionV1): Draft {
  return {
    name: definition.name,
    description: definition.description,
    initial: definition.initial,
  }
}

function typeLabel(kind: WorldVariableKindV1): string {
  return kind === 'flag' ? '开关' : '数值'
}

function refsFor(
  references: ReadonlyMap<string, readonly ProjectReferenceEdge[]>,
  id: string | undefined,
): readonly ProjectReferenceEdge[] {
  return id ? (references.get(id) ?? []) : []
}

export function VarsTab(props: {
  variables: WorldVariableRegistryV1
  referenceIndex?: ProjectReferenceIndex
  referenceStatus: EditorDerivedStatus
  getCurrentReferenceIndex: CurrentProjectReferenceIndexProvider
  session: EditSession
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  onOpenReference?: (reference: ProjectReferenceEdge) => void
  tabBar?: React.ReactNode
}) {
  const {
    variables,
    referenceIndex,
    referenceStatus,
    getCurrentReferenceIndex,
    session,
    focusObjectId,
    onObjectFocus,
    onOpenReference,
    tabBar,
  } = props
  const effectiveReferenceStatus =
    referenceStatus === 'current' && !referenceIndex ? 'failed' : referenceStatus
  const references = useMemo(() => {
    const byId = new Map<string, ProjectReferenceEdge[]>()
    for (const reference of referenceIndex?.allReferences() ?? []) {
      if (
        reference.target.kind !== 'world-variable' ||
        reference.relation.kind !== 'world-variable'
      )
        continue
      const entries = byId.get(reference.target.id) ?? []
      entries.push(reference)
      byId.set(reference.target.id, entries)
    }
    return byId
  }, [referenceIndex])
  const [filter, setFilter] = useState('')
  const [selectedId, setSelectedId] = useState(
    focusObjectId && variables[focusObjectId] ? focusObjectId : (Object.keys(variables)[0] ?? ''),
  )
  const [creating, setCreating] = useState(false)
  const [createId, setCreateId] = useState('')
  const [createKind, setCreateKind] = useState<WorldVariableKindV1>('flag')
  const [createName, setCreateName] = useState('')
  const [notice, setNotice] = useState<string>()
  const selected = variables[selectedId]
  const selectedRefs = refsFor(references, selected ? selectedId : undefined)
  const referenceCount =
    effectiveReferenceStatus === 'current'
      ? { kind: 'exact' as const, value: selectedRefs.length }
      : selectedRefs.length
        ? { kind: 'at-least' as const, value: selectedRefs.length }
        : { kind: 'unknown' as const }
  const referencePanelState =
    effectiveReferenceStatus === 'current'
      ? selectedRefs.length
        ? ('ready' as const)
        : ('empty' as const)
      : effectiveReferenceStatus === 'failed'
        ? ('error' as const)
        : effectiveReferenceStatus === 'stale'
          ? ('partial' as const)
          : ('loading' as const)
  const [draft, setDraft] = useState<Draft>(() =>
    selected ? draftOf(selected) : { name: '', description: '', initial: false },
  )

  useEffect(() => {
    if (focusObjectId && variables[focusObjectId]) {
      setSelectedId(focusObjectId)
      setCreating(false)
      return
    }
    if (!creating && !variables[selectedId]) {
      const fallbackId = Object.keys(variables)[0] ?? ''
      setSelectedId(fallbackId)
      onObjectFocus?.(fallbackId || undefined)
    }
  }, [creating, focusObjectId, onObjectFocus, selectedId, variables])

  useEffect(() => {
    if (selected) setDraft(draftOf(selected))
  }, [selected])

  const groups = useMemo(() => {
    const needle = filter.trim().toLocaleLowerCase()
    const entries = Object.entries(variables)
      .filter(([id, definition]) =>
        needle
          ? [id, definition.name, definition.description].some((value) =>
              value.toLocaleLowerCase().includes(needle),
            )
          : true,
      )
      .sort(
        (left, right) =>
          left[1].name.localeCompare(right[1].name) || left[0].localeCompare(right[0]),
      )
    return {
      flag: entries.filter(([, definition]) => definition.kind === 'flag'),
      number: entries.filter(([, definition]) => definition.kind === 'number'),
    }
  }, [filter, variables])

  const undeclared = useMemo(
    () =>
      [...references.entries()]
        .filter(([id]) => !variables[id])
        .map(([id, entries]) => ({
          id,
          entries,
          kinds: new Set(
            entries.flatMap((entry) =>
              entry.relation.kind === 'world-variable' ? [entry.relation.variableKind] : [],
            ),
          ),
        }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    [references, variables],
  )

  const select = (id: string): void => {
    setSelectedId(id)
    setCreating(false)
    setNotice(undefined)
    onObjectFocus?.(id)
  }
  const beginCreate = (id = '', kind: WorldVariableKindV1 = 'flag', name = ''): void => {
    setCreateId(id)
    setCreateKind(kind)
    setCreateName(name || id)
    setCreating(true)
    setNotice(undefined)
    onObjectFocus?.(undefined)
  }
  const create = (): void => {
    const id = createId.trim()
    const name = createName.trim()
    try {
      session.dispatch(
        new AddWorldVariableCommand(
          id,
          createKind === 'flag'
            ? { kind: 'flag', name, description: '', initial: false }
            : { kind: 'number', name, description: '', initial: 0 },
        ),
      )
      select(id)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    }
  }
  const commit = (nextDraft = draft): void => {
    if (!selected) return
    const definition: WorldVariableDefinitionV1 =
      selected.kind === 'flag'
        ? {
            kind: 'flag',
            name: nextDraft.name.trim(),
            description: nextDraft.description.trim(),
            initial: Boolean(nextDraft.initial),
          }
        : {
            kind: 'number',
            name: nextDraft.name.trim(),
            description: nextDraft.description.trim(),
            initial: Number(nextDraft.initial),
          }
    if (
      selected.kind === definition.kind &&
      selected.name === definition.name &&
      selected.description === definition.description &&
      selected.initial === definition.initial
    ) {
      if (
        nextDraft.name !== definition.name ||
        nextDraft.description !== definition.description ||
        nextDraft.initial !== definition.initial
      )
        setDraft(draftOf(definition))
      setNotice(undefined)
      return
    }
    try {
      session.dispatch(new UpdateWorldVariableCommand(selectedId, definition))
      setNotice(undefined)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
      setDraft(draftOf(selected))
    }
  }
  const remove = (): void => {
    if (!selected) return
    if (effectiveReferenceStatus !== 'current') {
      setNotice('变量引用仍在检查，暂不能删除。')
      return
    }
    if (!window.confirm(`删除世界变量 ${selectedId}？此操作可以撤销。`)) return
    const ids = Object.keys(variables)
    const index = ids.indexOf(selectedId)
    const nextId = ids[index + 1] ?? ids[index - 1] ?? ''
    try {
      session.dispatch(new DeleteWorldVariableCommand(selectedId, getCurrentReferenceIndex))
      setSelectedId(nextId)
      onObjectFocus?.(nextId || undefined)
    } catch (error) {
      setNotice(
        error instanceof WorldVariableInUseError
          ? `仍有 ${error.referenceCount} 处引用，请先从右侧处理。`
          : error instanceof Error
            ? error.message
            : String(error),
      )
    }
  }

  const renderRows = (entries: Array<[string, WorldVariableDefinitionV1]>): React.ReactNode =>
    entries.map(([id, definition]) => {
      const entriesForId = references.get(id) ?? []
      const reads = entriesForId.filter(
        (entry) => entry.relation.kind === 'world-variable' && entry.relation.access === 'read',
      ).length
      return (
        <DsCatalogRow
          key={id}
          selected={!creating && selectedId === id}
          title={definition.name}
          meta={id}
          trailing={`读 ${reads} · 写 ${entriesForId.length - reads}`}
          onClick={() => select(id)}
        />
      )
    })

  const reads = selectedRefs.filter(
    (reference) =>
      reference.relation.kind === 'world-variable' && reference.relation.access === 'read',
  )
  const writes = selectedRefs.filter(
    (reference) =>
      reference.relation.kind === 'world-variable' && reference.relation.access === 'write',
  )
  const renderReference = (reference: ProjectReferenceEdge): React.ReactNode => (
    <DsReferenceRow
      key={reference.id}
      title={reference.source.label}
      detail={reference.detail}
      path={reference.where}
      labels={[
        {
          label:
            reference.relation.kind === 'world-variable' && reference.relation.access === 'read'
              ? '读取'
              : '写入',
        },
      ]}
      action={
        reference.locator.kind !== 'unavailable' && onOpenReference
          ? { label: '打开', onActivate: () => onOpenReference(reference) }
          : undefined
      }
      status={
        reference.locator.kind !== 'unavailable' && onOpenReference
          ? undefined
          : {
              label: '精确位置只读',
              reason:
                reference.locator.kind === 'unavailable'
                  ? reference.locator.reason
                  : '当前引用没有可编辑的精确位置。',
            }
      }
    />
  )

  return (
    <>
      <div className="outliner outliner--split data-outliner world-variable-outliner">
        {tabBar}
        <DsCatalogControls
          title="变量"
          count={Object.keys(variables).length}
          unit="项"
          actions={[
            {
              id: 'create-world-variable',
              label: '新建变量',
              icon: 'add',
              onClick: () => beginCreate(),
            },
          ]}
          search={{
            'aria-label': '搜索变量',
            placeholder: '搜索名称、ID 或说明',
            value: filter,
            onChange: (event) => setFilter(event.target.value),
          }}
        />
        <div className="tree world-variable-catalog">
          <DsCatalogGroupHeader title="开关" count={groups.flag.length} />
          {renderRows(groups.flag)}
          <DsCatalogGroupHeader title="数值" count={groups.number.length} />
          {renderRows(groups.number)}
          {undeclared.length ? (
            <>
              <DsCatalogGroupHeader title="未登记引用" count={undeclared.length} />
              {undeclared.map(({ id, entries, kinds }) => (
                <DsCatalogRow
                  key={id}
                  title={id}
                  meta={kinds.size > 1 ? '开关/数值冲突，需人工处理' : `${entries.length} 处使用`}
                  trailing={kinds.size > 1 ? '冲突' : '创建定义'}
                  onClick={() => {
                    if (kinds.size > 1) {
                      setNotice(`变量 ${id} 同时按开关和数值使用，不能自动创建定义。`)
                      return
                    }
                    beginCreate(
                      id,
                      entries[0]!.relation.kind === 'world-variable'
                        ? entries[0]!.relation.variableKind
                        : 'flag',
                      id,
                    )
                  }}
                />
              ))}
            </>
          ) : null}
          {!groups.flag.length && !groups.number.length && !undeclared.length ? (
            <div className="insp-empty">还没有变量定义。</div>
          ) : null}
        </div>
      </div>

      <div className="canvas-wrap data-body world-variable-workbench">
        <DsObjectWorkspace
          as="main"
          label="世界变量工作区"
          contentClassName="world-variable-scroll"
          hero={
            <>
              {notice ? (
                <div className="world-variable-notice" role="alert">
                  {notice}
                </div>
              ) : null}
              {!creating && selected ? (
                <DsObjectHero
                  eyebrow="世界变量"
                  title={selected.name}
                  objectId={selectedId}
                  summary={selected.description || '尚未填写说明。'}
                  meta={`${typeLabel(selected.kind)} · 读 ${reads.length} · 写 ${writes.length}`}
                  actions={
                    <DsButton
                      variant="danger"
                      icon="delete"
                      disabled={effectiveReferenceStatus !== 'current' || selectedRefs.length > 0}
                      title={
                        effectiveReferenceStatus !== 'current'
                          ? '变量引用仍在检查，暂不能删除'
                          : selectedRefs.length
                            ? `仍有 ${selectedRefs.length} 处引用，请先从右侧处理`
                            : '删除变量'
                      }
                      onClick={remove}
                    >
                      删除变量
                    </DsButton>
                  }
                />
              ) : null}
            </>
          }
        >
          {creating ? (
            <section className="world-variable-create-card">
              <p className="eyebrow">新建世界变量</p>
              <h2>先确定稳定 ID 与运行类型</h2>
              <p>ID 和类型创建后保持稳定；显示名称、说明和新开局默认值可继续编辑。</p>
              <DsTextField
                label="稳定 ID"
                autoFocus
                monospace
                value={createId}
                onChange={(event) => setCreateId(event.target.value)}
                help="字母开头；sys: 前缀保留给引擎。"
              />
              <DsField label="类型">
                {({ id }) => (
                  <DsSelect
                    id={id}
                    value={createKind}
                    searchable={false}
                    options={[
                      { value: 'flag', label: '开关（boolean）' },
                      { value: 'number', label: '数值（number）' },
                    ]}
                    onValueChange={(value) => setCreateKind(value as WorldVariableKindV1)}
                  />
                )}
              </DsField>
              <DsTextField
                label="显示名称"
                value={createName}
                onChange={(event) => setCreateName(event.target.value)}
              />
              <div className="world-variable-create-actions">
                <DsButton variant="primary" onClick={create}>
                  创建变量
                </DsButton>
                <DsButton variant="secondary" onClick={() => setCreating(false)}>
                  取消
                </DsButton>
              </div>
            </section>
          ) : selected ? (
            <>
              <DsWorkbenchSection
                title="基本信息"
                description="显示名称与说明只服务作者；稳定 ID 和运行类型创建后只读。"
              >
                <div className="world-variable-readonly-grid">
                  <div>
                    <span>稳定 ID</span>
                    <code>{selectedId}</code>
                  </div>
                  <div>
                    <span>类型</span>
                    <strong>{typeLabel(selected.kind)}</strong>
                  </div>
                </div>
                <DsTextField
                  label="显示名称"
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  onBlur={() => commit()}
                />
                <DsTextAreaField
                  label="说明"
                  rows={4}
                  value={draft.description}
                  onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                  onBlur={() => commit()}
                />
              </DsWorkbenchSection>
              <DsWorkbenchSection
                title="新开局默认值"
                description="只用于创建新世界；修改这里不会覆盖当前存档或预览运行值。"
              >
                {selected.kind === 'flag' ? (
                  <DsCheckbox
                    label="新开局时开启"
                    checked={Boolean(draft.initial)}
                    onChange={(event) => {
                      const next = { ...draft, initial: event.target.checked }
                      setDraft(next)
                      commit(next)
                    }}
                  />
                ) : (
                  <DsNumberField
                    label="初始数值"
                    value={Number(draft.initial)}
                    onChange={(event) =>
                      setDraft({ ...draft, initial: event.target.valueAsNumber })
                    }
                    onBlur={() => commit()}
                  />
                )}
              </DsWorkbenchSection>
            </>
          ) : (
            <section className="world-variable-create-card">
              <h2>建立第一条变量定义</h2>
              <p>变量先定义，再供剧情条件和写入命令选择；未登记字符串会阻断保存。</p>
              <DsButton variant="primary" onClick={() => beginCreate()}>
                新建变量
              </DsButton>
            </section>
          )}
        </DsObjectWorkspace>
      </div>

      <aside className="inspector world-variable-reference-panel">
        <header>
          <p className="eyebrow">世界变量</p>
          <h3>{selected?.name ?? '选择一个变量'}</h3>
        </header>
        {selected ? (
          <DsReferencePanel
            state={referencePanelState}
            count={referenceCount}
            impact={{
              kind: 'blocking',
              description: selectedRefs.length
                ? '任意读取或写入都会阻断删除；可定位项可直接打开。'
                : '未发现脚本引用，当前定义可以安全删除。',
            }}
          >
            {reads.length ? (
              <DsReferenceGroup title="读取" count={reads.length}>
                <DsReferenceList>{reads.map(renderReference)}</DsReferenceList>
              </DsReferenceGroup>
            ) : null}
            {writes.length ? (
              <DsReferenceGroup title="写入" count={writes.length}>
                <DsReferenceList>{writes.map(renderReference)}</DsReferenceList>
              </DsReferenceGroup>
            ) : null}
          </DsReferencePanel>
        ) : (
          <div className="insp-empty">选择一个变量查看读取与写入位置。</div>
        )}
      </aside>
    </>
  )
}
