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
  type CanonicalScriptEditorContextV5,
  CanonicalScriptFlowEditorV5,
  nextGeneratedScriptVersionIdV5,
  ScriptVersionManagementDialogV5,
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
  activeLabel: string
} {
  return slot === 'onEnter'
    ? {
        title: '进场脚本',
        description: '玩家进入这个场景时执行。上方地图会从场景入口开始预览。',
        activeLabel: '进入场景时自动运行这个版本',
      }
    : {
        title: '传送出口脚本',
        description: '使用引路蜂、土灵珠等传送道具时执行。',
        activeLabel: '使用传送道具时运行这个版本',
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
  const references = selected
    ? sceneHookReferencesV5(props.state, props.sceneId, props.slot, selectedId)
    : []
  const [managementOpen, setManagementOpen] = useState(false)
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

  const createVersion = (label: string): void => {
    const id = nextGeneratedScriptVersionIdV5(
      Object.keys(variants),
      props.slot === 'onEnter' ? 'entry' : 'teleport',
    )
    if (dispatch(new AddSceneHookV5Command(props.sceneId, props.slot, id, defaultHook(label)))) {
      props.onSelectHook?.(id)
      setManagementOpen(false)
    }
  }

  const copyVersion = (): void => {
    if (!selectedId) return
    const id = nextGeneratedScriptVersionIdV5(Object.keys(variants), `${selectedId}-copy`)
    if (dispatch(new CopySceneHookV5Command(props.sceneId, props.slot, selectedId, id))) {
      props.onSelectHook?.(id)
      setManagementOpen(false)
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
        <div>
          <h4>{copy.title}</h4>
          <p>{copy.description}</p>
        </div>
        <span>{entries.length ? `${entries.length} 个剧情版本` : '尚未创建'}</span>
      </header>

      {selected ? (
        <div className="script-v5-behavior-detail script-v5-primary-detail">
          <div className="script-v5-version-bar">
            {entries.length > 1 ? (
              <label>
                <span>正在编辑的剧情版本</span>
                <select
                  className="in"
                  value={selectedId}
                  onChange={(event) => {
                    setManagementOpen(false)
                    props.onSelectHook?.(event.target.value)
                  }}
                >
                  {entries.map(([id, hook]) => (
                    <option key={id} value={id}>
                      {hook.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <strong>{selected.label}</strong>
            )}
            <label className="script-v5-active-version">
              <input
                type="checkbox"
                checked={channel?.initial === selectedId}
                onChange={(event) =>
                  dispatch(
                    new SetSceneHookInitialV5Command(
                      props.sceneId,
                      props.slot,
                      event.target.checked ? selectedId : undefined,
                    ),
                  )
                }
              />
              {copy.activeLabel}
            </label>
            <button type="button" className="mini-txt" onClick={() => setManagementOpen(true)}>
              剧情版本管理…
            </button>
          </div>

          <CanonicalScriptFlowEditorV5
            key={selectedId}
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
          <button type="button" className="pv-btn" onClick={() => setManagementOpen(true)}>
            ＋ 创建第一个剧情版本
          </button>
        </div>
      )}

      {managementOpen ? (
        <ScriptVersionManagementDialogV5
          title={copy.title}
          selectedName={selected?.label}
          references={references.map((reference, index) => ({
            key: `${reference.kind}:${reference.path}:${index}`,
            path: reference.path,
            label:
              reference.kind === 'initial'
                ? '当前场景进入时自动运行'
                : reference.kind === 'command'
                  ? '一条切换场景脚本的指令'
                  : '迁移记录保护',
          }))}
          onOpenReference={props.onOpenReference}
          onClose={() => setManagementOpen(false)}
          onRename={(label) =>
            selected
              ? dispatch(
                  new UpdateSceneHookV5Command(props.sceneId, props.slot, selectedId, { label }),
                )
              : false
          }
          onCopy={copyVersion}
          onCreate={createVersion}
          onDelete={() => {
            if (dispatch(new DeleteSceneHookV5Command(props.sceneId, props.slot, selectedId))) {
              props.onSelectHook?.(entries.find(([id]) => id !== selectedId)?.[0])
              setManagementOpen(false)
            }
          }}
        />
      ) : null}
    </section>
  )
}
