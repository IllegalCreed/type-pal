import type { EntityAddress, NamedEntityBehaviorV5, Selection } from '@type-pal/content'
import { useMemo, useState } from 'react'
import {
  AddEntityBehaviorV5Command,
  behaviorReferencesV5,
  CopyEntityBehaviorV5Command,
  DeleteEntityBehaviorV5Command,
  presentSelectionV5,
  type ScriptEditorCommandV5,
  type ScriptEditorStateV5,
  UpdateEntityBehaviorV5Command,
} from '../core/script-v5-editor.js'
import {
  CanonicalHelpTipV5,
  type CanonicalScriptEditorContextV5,
  CanonicalScriptFlowEditorV5,
  nextGeneratedScriptSchemeIdV5,
  ScriptSchemeCreateDialogV5,
  ScriptSchemeDetailsDialogV5,
  ScriptSchemeStripV5,
} from './CanonicalScriptEditorV5.js'

type BehaviorChannelV5 = 'trigger' | 'auto'

function entityOf(state: ScriptEditorStateV5, target: EntityAddress) {
  const scene = state.scenes.find((candidate) => candidate.id === target.scene)
  return scene?.entities.find((candidate) => candidate.id === target.entity)
}

function defaultBehavior(label: string): NamedEntityBehaviorV5 {
  return {
    label,
    order: 0,
    flow: {
      kind: 'stages',
      initial: 'start',
      stages: [{ id: 'start', body: [] }],
    },
  }
}

export function BehaviorSelectionEditorV5(props: {
  selection: Selection<string>
  behaviors: Readonly<Record<string, NamedEntityBehaviorV5>>
  onChange: (selection: Selection<string>) => void
  label?: string
}) {
  const entries = useMemo(
    () =>
      Object.entries(props.behaviors).sort(
        ([leftId, left], [rightId, right]) =>
          left.order - right.order || leftId.localeCompare(rightId),
      ),
    [props.behaviors],
  )
  const value =
    props.selection.kind === 'inherit'
      ? '__inherit'
      : props.selection.kind === 'disabled'
        ? '__disabled'
        : props.selection.value
  const danglingValue =
    props.selection.kind === 'use' && props.behaviors[props.selection.value] === undefined
      ? props.selection.value
      : undefined
  const presentation = presentSelectionV5(props.selection, (id) => {
    const behavior = props.behaviors[id]
    return behavior ? behavior.label : `${id}（引用失效）`
  })

  return (
    <label className="script-v5-selection">
      <span className="field-label">{props.label ?? '当前使用的脚本'}</span>
      <select
        className="in"
        aria-label={props.label ?? '当前使用的脚本'}
        value={value}
        onChange={(event) => {
          if (event.target.value === '__inherit') props.onChange({ kind: 'inherit' })
          else if (event.target.value === '__disabled') props.onChange({ kind: 'disabled' })
          else props.onChange({ kind: 'use', value: event.target.value })
        }}
      >
        <option value="__inherit">使用实体页面原本的脚本</option>
        <option value="__disabled">不运行脚本</option>
        {danglingValue ? <option value={danglingValue}>{danglingValue}（引用失效）</option> : null}
        {entries.map(([id, behavior]) => (
          <option key={id} value={id}>
            {behavior.label}
          </option>
        ))}
      </select>
      <small className={`script-v5-selection-status ${presentation.tone}`}>
        {presentation.label}
      </small>
    </label>
  )
}

export function ScriptV5BehaviorInspector(props: {
  state: ScriptEditorStateV5
  target: EntityAddress
  channel: BehaviorChannelV5
  selectedBehaviorId?: string
  onSelectBehavior?: (behaviorId: string) => void
  onDispatch: (command: ScriptEditorCommandV5) => void
  onOpenReference?: (path: string) => void
  onOpenFlow?: (behaviorId: string) => void
  onError?: (message: string) => void
  editorContext?: CanonicalScriptEditorContextV5
}) {
  const entity = entityOf(props.state, props.target)
  const registry = entity?.behaviors?.[props.channel] ?? {}
  const entries = useMemo(
    () =>
      Object.entries(registry).sort(
        ([leftId, left], [rightId, right]) =>
          left.order - right.order || leftId.localeCompare(rightId),
      ),
    [registry],
  )
  const selectedId =
    (props.selectedBehaviorId && registry[props.selectedBehaviorId]
      ? props.selectedBehaviorId
      : entries[0]?.[0]) ?? ''
  const selected = registry[selectedId]
  const [detailsId, setDetailsId] = useState<string>()
  const detailsScheme = detailsId ? registry[detailsId] : undefined
  const detailsReferences = detailsScheme
    ? behaviorReferencesV5(props.state, props.target, props.channel, detailsId!)
    : []
  const [createOpen, setCreateOpen] = useState(false)
  const title = props.channel === 'trigger' ? '交互脚本' : '自动行为'
  const description =
    props.channel === 'trigger'
      ? '玩家与当前实体交互或接触时执行。'
      : '当前实体在场景中自行巡逻、转向或播放动作时循环执行。'

  const dispatch = (command: ScriptEditorCommandV5): boolean => {
    try {
      props.onDispatch(command)
      return true
    } catch (error) {
      props.onError?.(error instanceof Error ? error.message : String(error))
      return false
    }
  }

  const createScheme = (label: string): void => {
    const id = nextGeneratedScriptSchemeIdV5(Object.keys(registry), props.channel)
    if (
      dispatch(
        new AddEntityBehaviorV5Command(props.target, props.channel, id, defaultBehavior(label)),
      )
    ) {
      props.onSelectBehavior?.(id)
      setCreateOpen(false)
    }
  }

  const copyScheme = (sourceId: string): void => {
    const id = nextGeneratedScriptSchemeIdV5(Object.keys(registry), `${sourceId}-copy`)
    if (dispatch(new CopyEntityBehaviorV5Command(props.target, props.channel, sourceId, id))) {
      props.onSelectBehavior?.(id)
      setDetailsId(undefined)
    }
  }

  if (!entity)
    return (
      <section className="script-v5-behavior-inspector empty" aria-label={title}>
        <p>
          实体不存在：{props.target.scene}/{props.target.entity}
        </p>
      </section>
    )

  return (
    <section className="script-v5-behavior-inspector" aria-label={title}>
      <header className="script-v5-behavior-heading">
        <div className="script-v5-heading-title">
          <h4>{title}</h4>
          <CanonicalHelpTipV5 label={title}>{description}</CanonicalHelpTipV5>
        </div>
        {!entries.length ? <span>尚未创建</span> : null}
      </header>

      {selected ? (
        <div className="script-v5-behavior-detail script-v5-primary-detail">
          <ScriptSchemeStripV5
            title={title}
            options={entries.map(([id, behavior]) => ({
              id,
              label: behavior.label,
              flow: behavior.flow,
            }))}
            selectedId={selectedId}
            onSelect={(id) => {
              setCreateOpen(false)
              props.onSelectBehavior?.(id)
            }}
            onDetails={setDetailsId}
            onCreate={() => setCreateOpen(true)}
          />

          <CanonicalScriptFlowEditorV5
            key={selectedId}
            ownerLabel={selected.label}
            flow={selected.flow}
            context={props.editorContext}
            onError={props.onError}
            onChange={(flow) =>
              dispatch(
                new UpdateEntityBehaviorV5Command(props.target, props.channel, selectedId, {
                  flow,
                }),
              )
            }
          />
        </div>
      ) : (
        <div className="script-v5-create-first">
          <strong>创建{title}</strong>
          <p>{description}</p>
          <button type="button" className="pv-btn" onClick={() => setCreateOpen(true)}>
            ＋ 新建第一个方案
          </button>
        </div>
      )}

      {detailsId && detailsScheme ? (
        <ScriptSchemeDetailsDialogV5
          title={title}
          selectedName={detailsScheme.label}
          references={detailsReferences.map((reference, index) => ({
            key: `${reference.kind}:${reference.path}:${index}`,
            path: reference.path,
            label: reference.kind === 'page' ? '当前实体的一个页面' : '一条切换实体脚本方案的指令',
          }))}
          onOpenReference={props.onOpenReference}
          onClose={() => setDetailsId(undefined)}
          onRename={(label) =>
            dispatch(
              new UpdateEntityBehaviorV5Command(props.target, props.channel, detailsId, {
                label,
              }),
            )
          }
          onCopy={() => copyScheme(detailsId)}
          onDelete={() => {
            if (
              dispatch(new DeleteEntityBehaviorV5Command(props.target, props.channel, detailsId))
            ) {
              if (selectedId === detailsId) {
                const next = entries.find(([id]) => id !== detailsId)?.[0]
                if (next) props.onSelectBehavior?.(next)
              }
              setDetailsId(undefined)
            }
          }}
        />
      ) : null}
      {createOpen ? (
        <ScriptSchemeCreateDialogV5
          title={title}
          first={!entries.length}
          onClose={() => setCreateOpen(false)}
          onCreate={createScheme}
        />
      ) : null}
    </section>
  )
}
