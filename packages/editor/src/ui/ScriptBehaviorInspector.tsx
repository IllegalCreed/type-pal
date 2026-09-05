import type { AuthorSceneDef, EntityAddress, Selection } from '@type-pal/content'
import { useMemo, useState } from 'react'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import type { ProjectReferenceEdge, ProjectReferenceIndex } from '../core/project-reference.js'
import {
  AddEntityBehaviorCommand,
  DeleteEntityBehaviorCommand,
  presentSelection,
  ReorderEntityBehaviorSchemesCommand,
  type ScriptCommandLocator,
  type ScriptEditorCommand,
  type ScriptEditorState,
  UpdateEntityBehaviorCommand,
} from '../core/script-editor.js'
import { DsButton, DsHelpTip, DsSelect } from './design-system/controls.js'
import { type DsReorderIntent, reorderDsItems } from './design-system/reorder.js'
import {
  type CanonicalScriptEditorContext,
  CanonicalScriptFlowEditor,
  nextGeneratedScriptSchemeId,
  ScriptSchemeCreateDialog,
  ScriptSchemeDetailsDialog,
  ScriptSchemeStrip,
} from './ScriptEditor.js'

type BehaviorChannel = 'trigger' | 'auto'
type AuthorEntityBehavior = NonNullable<
  NonNullable<AuthorSceneDef['entities'][number]['behaviors']>['trigger']
>[string]

function entityOf(state: ScriptEditorState, target: EntityAddress) {
  const scene = state.scenes.find((candidate) => candidate.id === target.scene)
  return scene?.entities.find((candidate) => candidate.id === target.entity)
}

function defaultBehavior(label: string): AuthorEntityBehavior {
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

export function BehaviorSelectionEditor(props: {
  selection: Selection<string>
  behaviors: Readonly<Record<string, AuthorEntityBehavior>>
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
  const presentation = presentSelection(props.selection, (id) => {
    const behavior = props.behaviors[id]
    return behavior ? behavior.label : `${id}（引用失效）`
  })

  return (
    <div className="script-selection">
      <span className="field-label">{props.label ?? '当前使用的脚本'}</span>
      <DsSelect
        aria-label={props.label ?? '当前使用的脚本'}
        value={value}
        options={[
          { value: '__inherit', label: '使用实体页面原本的脚本' },
          { value: '__disabled', label: '不运行脚本' },
          ...(danglingValue
            ? [{ value: danglingValue, label: `${danglingValue}（引用失效）` }]
            : []),
          ...entries.map(([id, behavior]) => ({ value: id, label: behavior.label })),
        ]}
        onValueChange={(nextValue) => {
          if (nextValue === '__inherit') props.onChange({ kind: 'inherit' })
          else if (nextValue === '__disabled') props.onChange({ kind: 'disabled' })
          else props.onChange({ kind: 'use', value: nextValue })
        }}
      />
      <small
        className={
          presentation.tone === 'disabled'
            ? 'script-selection-status disabled'
            : presentation.tone === 'use'
              ? 'script-selection-status use'
              : 'script-selection-status'
        }
      >
        {presentation.label}
      </small>
    </div>
  )
}

export function ScriptBehaviorInspector(props: {
  state: ScriptEditorState
  target: EntityAddress
  channel: BehaviorChannel
  selectedBehaviorId?: string
  onSelectBehavior?: (behaviorId: string) => void
  onDispatch: (command: ScriptEditorCommand) => void
  onOpenReference?: (reference: ProjectReferenceEdge) => void
  onOpenFlow?: (behaviorId: string) => void
  focusCommand?: { locator: ScriptCommandLocator; revision: number }
  onError?: (message: string) => void
  editorContext?: CanonicalScriptEditorContext
  referenceIndex?: ProjectReferenceIndex
  referenceStatus: EditorDerivedStatus
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
  const referencesReady = props.referenceStatus === 'current' && props.referenceIndex !== undefined
  const detailsReferences =
    detailsScheme && props.referenceIndex
      ? props.referenceIndex.referencesTo({
          kind: 'entity-behavior',
          sceneId: props.target.scene,
          entityId: props.target.entity,
          channel: props.channel,
          behaviorId: detailsId!,
        })
      : []
  const [createOpen, setCreateOpen] = useState(false)
  const title = props.channel === 'trigger' ? '交互脚本' : '自动行为'
  const description =
    props.channel === 'trigger'
      ? '玩家与当前实体交互或接触时执行。'
      : '当前实体在场景中自行巡逻、转向或播放动作时循环执行。'

  const dispatch = (command: ScriptEditorCommand): boolean => {
    try {
      props.onDispatch(command)
      return true
    } catch (error) {
      props.onError?.(error instanceof Error ? error.message : String(error))
      return false
    }
  }

  const createScheme = (label: string): void => {
    const id = nextGeneratedScriptSchemeId(Object.keys(registry), props.channel)
    if (
      dispatch(
        new AddEntityBehaviorCommand(props.target, props.channel, id, defaultBehavior(label)),
      )
    ) {
      props.onSelectBehavior?.(id)
      setCreateOpen(false)
    }
  }
  const reorderSchemes = (intent: DsReorderIntent): boolean => {
    const next = reorderDsItems(entries, intent)
    if (next === entries) return false
    return dispatch(
      new ReorderEntityBehaviorSchemesCommand(
        props.target,
        props.channel,
        next.map(([id]) => id),
      ),
    )
  }

  if (!entity)
    return (
      <section className="script-behavior-inspector empty" aria-label={title}>
        <p>
          实体不存在：{props.target.scene}/{props.target.entity}
        </p>
      </section>
    )

  return (
    <section className="script-behavior-inspector" aria-label={title}>
      <header className="script-behavior-heading">
        <div className="script-heading-title">
          <h4>{title}</h4>
          <DsHelpTip label={title}>{description}</DsHelpTip>
        </div>
        {!entries.length ? <span>尚未创建</span> : null}
      </header>

      {selected ? (
        <div className="script-behavior-detail script-primary-detail">
          <ScriptSchemeStrip
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
            reorder={{
              kind: 'behavior',
              scopeKey: `behavior:${props.target.scene}:${props.target.entity}:${props.channel}`,
              revision: props.state,
              onReorder: reorderSchemes,
            }}
          />

          <CanonicalScriptFlowEditor
            key={selectedId}
            ownerLabel={selected.label}
            flow={selected.flow}
            context={props.editorContext}
            onError={props.onError}
            focusLocator={
              props.focusCommand?.locator.owner.kind === 'entity-behavior' &&
              props.focusCommand.locator.owner.sceneId === props.target.scene &&
              props.focusCommand.locator.owner.entityId === props.target.entity &&
              props.focusCommand.locator.owner.channel === props.channel &&
              props.focusCommand.locator.owner.behaviorId === selectedId
                ? props.focusCommand.locator
                : undefined
            }
            focusRevision={
              props.focusCommand?.locator.owner.kind === 'entity-behavior' &&
              props.focusCommand.locator.owner.sceneId === props.target.scene &&
              props.focusCommand.locator.owner.entityId === props.target.entity &&
              props.focusCommand.locator.owner.channel === props.channel &&
              props.focusCommand.locator.owner.behaviorId === selectedId
                ? props.focusCommand.revision
                : undefined
            }
            onChange={(flow) =>
              dispatch(
                new UpdateEntityBehaviorCommand(props.target, props.channel, selectedId, {
                  flow,
                }),
              )
            }
          />
        </div>
      ) : (
        <div className="script-create-first">
          <strong>创建{title}</strong>
          <p>{description}</p>
          <DsButton onClick={() => setCreateOpen(true)} size="compact" variant="secondary">
            ＋ 新建第一个方案
          </DsButton>
        </div>
      )}

      {detailsId && detailsScheme ? (
        <ScriptSchemeDetailsDialog
          selectedName={detailsScheme.label}
          references={detailsReferences.map((reference) => ({
            key: String(reference.id),
            reference,
            label: reference.source.label,
          }))}
          referencesKnown={referencesReady}
          onOpenReference={(reference) => {
            setDetailsId(undefined)
            props.onOpenReference?.(reference)
          }}
          onClose={() => setDetailsId(undefined)}
          onSave={(label) =>
            dispatch(
              new UpdateEntityBehaviorCommand(props.target, props.channel, detailsId, {
                label,
              }),
            )
          }
          onDelete={() => {
            if (dispatch(new DeleteEntityBehaviorCommand(props.target, props.channel, detailsId))) {
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
        <ScriptSchemeCreateDialog
          title={title}
          first={!entries.length}
          onClose={() => setCreateOpen(false)}
          onCreate={createScheme}
        />
      ) : null}
    </section>
  )
}
