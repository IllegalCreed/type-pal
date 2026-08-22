import type { BaseSceneHook } from '@type-pal/content'
import { useMemo, useState } from 'react'
import {
  AddSceneHookCommand,
  type CanonicalScriptReference,
  DeleteSceneHookCommand,
  describeCanonicalScriptReference,
  SaveSceneHookDetailsCommand,
  type SceneHookSlot,
  type ScriptEditorCommand,
  type ScriptEditorState,
  type ScriptCommandLocator,
  sceneHookReferences,
  UpdateSceneHookCommand,
} from '../core/script-editor.js'
import {
  type CanonicalScriptEditorContext,
  CanonicalScriptFlowEditor,
  nextGeneratedScriptSchemeId,
  ScriptSchemeCreateDialog,
  ScriptSchemeDetailsDialog,
  ScriptSchemeStrip,
} from './ScriptEditor.js'
import { DsHelpTip } from './design-system/index.js'

function defaultHook(label: string): BaseSceneHook {
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

function sourceCopy(slot: SceneHookSlot): {
  title: string
  description: string
  defaultActiveCopy: string
  defaultInactiveCopy: string
} {
  return slot === 'onEnter'
    ? {
        title: '进场脚本',
        description: '玩家进入这个场景时执行。上方地图会从场景入口开始预览。',
        defaultActiveCopy: '没有剧情指令切换方案时，进入场景会运行这套方案。',
        defaultInactiveCopy: '进入场景时默认运行另一套方案，或不自动运行任何方案。',
      }
    : {
        title: '传送出口脚本',
        description: '使用引路蜂、土灵珠等传送道具时执行。',
        defaultActiveCopy: '没有剧情指令切换方案时，使用传送道具会运行这套方案。',
        defaultInactiveCopy: '使用传送道具时默认运行另一套方案，或不运行任何方案。',
      }
}

export function ScriptSceneHookInspector(props: {
  state: ScriptEditorState
  sceneId: string
  slot: SceneHookSlot
  onSlotChange?: (slot: SceneHookSlot) => void
  selectedHookId?: string
  onSelectHook?: (hookId: string | undefined) => void
  onDispatch: (command: ScriptEditorCommand) => void
  onOpenReference?: (reference: CanonicalScriptReference) => void
  focusCommand?: { locator: ScriptCommandLocator; revision: number }
  onError?: (message: string) => void
  editorContext?: CanonicalScriptEditorContext
}) {
  const scene = props.state.scenes.find((candidate) => candidate.id === props.sceneId)
  const channel = scene?.hooks?.[props.slot]
  const variants = channel?.variants ?? {}
  const entries = useMemo(
    () =>
      Object.entries(variants).sort(
        ([leftId, left], [rightId, right]) =>
          left.order - right.order || leftId.localeCompare(rightId),
      ),
    [variants],
  )
  const selectedId =
    (props.selectedHookId && variants[props.selectedHookId]
      ? props.selectedHookId
      : entries[0]?.[0]) ?? ''
  const selected = variants[selectedId]
  const [detailsId, setDetailsId] = useState<string>()
  const detailsScheme = detailsId ? variants[detailsId] : undefined
  const detailsReferences = detailsScheme
    ? sceneHookReferences(props.state, props.sceneId, props.slot, detailsId!)
    : []
  const [createOpen, setCreateOpen] = useState(false)
  const copy = sourceCopy(props.slot)

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
    const id = nextGeneratedScriptSchemeId(
      Object.keys(variants),
      props.slot === 'onEnter' ? 'entry' : 'teleport',
    )
    if (dispatch(new AddSceneHookCommand(props.sceneId, props.slot, id, defaultHook(label)))) {
      props.onSelectHook?.(id)
      setCreateOpen(false)
    }
  }

  if (!scene)
    return (
      <section className="script-behavior-inspector empty" aria-label={copy.title}>
        <p>场景不存在：{props.sceneId}</p>
      </section>
    )

  return (
    <section className="script-behavior-inspector script-hook-inspector" aria-label={copy.title}>
      <header className="script-behavior-heading">
        <div className="script-heading-title">
          <h4>{copy.title}</h4>
          <DsHelpTip label={copy.title}>{copy.description}</DsHelpTip>
        </div>
        {!entries.length ? <span>尚未创建</span> : null}
      </header>

      {selected ? (
        <div className="script-behavior-detail script-primary-detail">
          <ScriptSchemeStrip
            title={copy.title}
            options={entries.map(([id, hook]) => ({
              id,
              label: hook.label,
              flow: hook.flow,
              isDefault: channel?.initial === id,
            }))}
            selectedId={selectedId}
            onSelect={(id) => {
              setCreateOpen(false)
              props.onSelectHook?.(id)
            }}
            onDetails={setDetailsId}
            onCreate={() => setCreateOpen(true)}
          />

          <CanonicalScriptFlowEditor
            key={selectedId}
            ownerLabel={selected.label}
            flow={selected.flow}
            context={props.editorContext}
            onError={props.onError}
            focusLocator={
              props.focusCommand?.locator.owner.kind === 'scene-hook' &&
              props.focusCommand.locator.owner.sceneId === props.sceneId &&
              props.focusCommand.locator.owner.slot === props.slot &&
              props.focusCommand.locator.owner.hookId === selectedId
                ? props.focusCommand.locator
                : undefined
            }
            focusRevision={
              props.focusCommand?.locator.owner.kind === 'scene-hook' &&
              props.focusCommand.locator.owner.sceneId === props.sceneId &&
              props.focusCommand.locator.owner.slot === props.slot &&
              props.focusCommand.locator.owner.hookId === selectedId
                ? props.focusCommand.revision
                : undefined
            }
            onChange={(flow) =>
              dispatch(new UpdateSceneHookCommand(props.sceneId, props.slot, selectedId, { flow }))
            }
          />
        </div>
      ) : (
        <div className="script-create-first">
          <strong>创建{copy.title}</strong>
          <p>{copy.description}</p>
          <button type="button" className="pv-btn" onClick={() => setCreateOpen(true)}>
            ＋ 新建第一个方案
          </button>
        </div>
      )}

      {detailsId && detailsScheme ? (
        <ScriptSchemeDetailsDialog
          selectedName={detailsScheme.label}
          references={detailsReferences.map((reference, index) => ({
            key: `${reference.kind}:${reference.path}:${index}`,
            reference,
            label: describeCanonicalScriptReference(props.state, reference),
          }))}
          defaultControl={{
            isDefault: channel?.initial === detailsId,
            activeCopy: copy.defaultActiveCopy,
            inactiveCopy: copy.defaultInactiveCopy,
          }}
          onOpenReference={(reference) => {
            setDetailsId(undefined)
            props.onOpenReference?.(reference)
          }}
          onClose={() => setDetailsId(undefined)}
          onSave={(label, isDefault) =>
            dispatch(
              new SaveSceneHookDetailsCommand(
                props.sceneId,
                props.slot,
                detailsId,
                label,
                isDefault === true,
              ),
            )
          }
          onDelete={() => {
            if (dispatch(new DeleteSceneHookCommand(props.sceneId, props.slot, detailsId))) {
              if (selectedId === detailsId)
                props.onSelectHook?.(entries.find(([id]) => id !== detailsId)?.[0])
              setDetailsId(undefined)
            }
          }}
        />
      ) : null}
      {createOpen ? (
        <ScriptSchemeCreateDialog
          title={copy.title}
          first={!entries.length}
          onClose={() => setCreateOpen(false)}
          onCreate={createScheme}
        />
      ) : null}
    </section>
  )
}
