import type { NamedSceneHookV5 } from '@type-pal/content'
import { useMemo, useState } from 'react'
import {
  AddSceneHookV5Command,
  CopySceneHookV5Command,
  DeleteSceneHookV5Command,
  type SceneHookSlotV5,
  type ScriptEditorCommandV5,
  type ScriptEditorStateV5,
  SetSceneHookInitialV5Command,
  sceneHookReferencesV5,
  UpdateSceneHookV5Command,
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

function defaultHook(label: string): NamedSceneHookV5 {
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

function sourceCopy(slot: SceneHookSlotV5): {
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

export function ScriptV5SceneHookInspector(props: {
  state: ScriptEditorStateV5
  sceneId: string
  slot: SceneHookSlotV5
  onSlotChange?: (slot: SceneHookSlotV5) => void
  selectedHookId?: string
  onSelectHook?: (hookId: string | undefined) => void
  onDispatch: (command: ScriptEditorCommandV5) => void
  onOpenReference?: (path: string) => void
  onError?: (message: string) => void
  editorContext?: CanonicalScriptEditorContextV5
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
    ? sceneHookReferencesV5(props.state, props.sceneId, props.slot, detailsId!)
    : []
  const [createOpen, setCreateOpen] = useState(false)
  const copy = sourceCopy(props.slot)

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
    const id = nextGeneratedScriptSchemeIdV5(
      Object.keys(variants),
      props.slot === 'onEnter' ? 'entry' : 'teleport',
    )
    if (dispatch(new AddSceneHookV5Command(props.sceneId, props.slot, id, defaultHook(label)))) {
      props.onSelectHook?.(id)
      setCreateOpen(false)
    }
  }

  const copyScheme = (sourceId: string): void => {
    const id = nextGeneratedScriptSchemeIdV5(Object.keys(variants), `${sourceId}-copy`)
    if (dispatch(new CopySceneHookV5Command(props.sceneId, props.slot, sourceId, id))) {
      props.onSelectHook?.(id)
      setDetailsId(undefined)
    }
  }

  if (!scene)
    return (
      <section className="script-v5-behavior-inspector empty" aria-label={copy.title}>
        <p>场景不存在：{props.sceneId}</p>
      </section>
    )

  return (
    <section
      className="script-v5-behavior-inspector script-v5-hook-inspector"
      aria-label={copy.title}
    >
      <header className="script-v5-behavior-heading">
        <div className="script-v5-heading-title">
          <h4>{copy.title}</h4>
          <CanonicalHelpTipV5 label={copy.title}>{copy.description}</CanonicalHelpTipV5>
        </div>
        {!entries.length ? <span>尚未创建</span> : null}
      </header>

      {selected ? (
        <div className="script-v5-behavior-detail script-v5-primary-detail">
          <ScriptSchemeStripV5
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

          <CanonicalScriptFlowEditorV5
            key={selectedId}
            ownerLabel={selected.label}
            flow={selected.flow}
            context={props.editorContext}
            onError={props.onError}
            onChange={(flow) =>
              dispatch(
                new UpdateSceneHookV5Command(props.sceneId, props.slot, selectedId, { flow }),
              )
            }
          />
        </div>
      ) : (
        <div className="script-v5-create-first">
          <strong>创建{copy.title}</strong>
          <p>{copy.description}</p>
          <button type="button" className="pv-btn" onClick={() => setCreateOpen(true)}>
            ＋ 新建第一个方案
          </button>
        </div>
      )}

      {detailsId && detailsScheme ? (
        <ScriptSchemeDetailsDialogV5
          title={copy.title}
          selectedName={detailsScheme.label}
          references={detailsReferences.map((reference, index) => ({
            key: `${reference.kind}:${reference.path}:${index}`,
            path: reference.path,
            label:
              reference.kind === 'initial'
                ? '当前场景进入时自动运行'
                : '一条切换场景脚本方案的指令',
          }))}
          defaultControl={{
            isDefault: channel?.initial === detailsId,
            activeCopy: copy.defaultActiveCopy,
            inactiveCopy: copy.defaultInactiveCopy,
            onSetDefault: () =>
              dispatch(new SetSceneHookInitialV5Command(props.sceneId, props.slot, detailsId)),
            onClearDefault: () =>
              dispatch(new SetSceneHookInitialV5Command(props.sceneId, props.slot, undefined)),
          }}
          onOpenReference={props.onOpenReference}
          onClose={() => setDetailsId(undefined)}
          onRename={(label) =>
            dispatch(new UpdateSceneHookV5Command(props.sceneId, props.slot, detailsId, { label }))
          }
          onCopy={() => copyScheme(detailsId)}
          onDelete={() => {
            if (dispatch(new DeleteSceneHookV5Command(props.sceneId, props.slot, detailsId))) {
              if (selectedId === detailsId)
                props.onSelectHook?.(entries.find(([id]) => id !== detailsId)?.[0])
              setDetailsId(undefined)
            }
          }}
        />
      ) : null}
      {createOpen ? (
        <ScriptSchemeCreateDialogV5
          title={copy.title}
          first={!entries.length}
          onClose={() => setCreateOpen(false)}
          onCreate={createScheme}
        />
      ) : null}
    </section>
  )
}
