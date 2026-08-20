import type { EntityLifecycleCommand } from '@type-pal/content'
import type { EditSession } from '../core/edit-session.js'
import {
  collectEntityLifecycleCommandBodies,
  DeleteEntityLifecycleCommand,
  InsertEntityLifecycleCommand,
  UpdateEntityLifecycleCommand,
} from '../core/lifecycle-command-editor.js'

function isLifecycleCommand(value: unknown): value is EntityLifecycleCommand {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const kind = (value as { kind?: unknown }).kind
  return (
    kind === 'suspendEntity' ||
    kind === 'hideEntity' ||
    kind === 'restoreEntity' ||
    kind === 'removeEntity'
  )
}

function withKind(
  command: EntityLifecycleCommand,
  kind: EntityLifecycleCommand['kind'],
): EntityLifecycleCommand {
  if (kind === 'suspendEntity')
    return {
      kind,
      target: structuredClone(command.target),
      ticks: command.kind === 'suspendEntity' ? command.ticks : 15,
    }
  if (kind === 'hideEntity')
    return {
      kind,
      target: structuredClone(command.target),
      ticks: command.kind === 'hideEntity' ? command.ticks : 800,
    }
  return { kind, target: structuredClone(command.target) }
}

export function LifecycleCommandPanel(props: {
  session: EditSession
  sceneId: string
  entityId: string
}) {
  const state = props.session.getState()
  const bodies = collectEntityLifecycleCommandBodies(
    state,
    props.sceneId,
    props.entityId,
  )
  const dispatchUpdate = (
    location: (typeof bodies)[number]['location'],
    index: number,
    command: EntityLifecycleCommand,
  ): void => {
    props.session.dispatch(new UpdateEntityLifecycleCommand(location, index, command))
  }

  return (
    <div className="section lifecycle-command-editor">
      <h3>实体生命周期命令</h3>
      <p className="hint">
        当前模型明确区分暂停、隐藏后离屏重现、立即恢复和永久移除；全局撤销/重做同样适用。
      </p>
      {bodies.length === 0 ? (
        <p className="hint">此实体还没有可编辑的具名行为正文；先创建触发或自动行为后再添加。</p>
      ) : (
        bodies.map((body, bodyIndex) => {
          const lifecycleRows = body.commands.flatMap((command, index) =>
            isLifecycleCommand(command) ? [{ command, index }] : [],
          )
          return (
            <div
              className="lifecycle-command-body"
              key={body.location.path.join('/') + ':' + bodyIndex}
            >
              <div className="field">
                <span className="field-label">{body.label}</span>
                <button
                  type="button"
                  onClick={() =>
                    props.session.dispatch(
                      new InsertEntityLifecycleCommand(
                        body.location,
                        body.commands.length,
                        {
                          kind: 'suspendEntity',
                          target: { scene: props.sceneId, entity: props.entityId },
                          ticks: 15,
                        },
                      ),
                    )
                  }
                >
                  ＋ 生命周期命令
                </button>
              </div>
              {lifecycleRows.length === 0 ? (
                <p className="hint">此正文暂无生命周期叶命令。</p>
              ) : null}
              {lifecycleRows.map(({ command, index }) => {
                const targetScene = state.scenes.find(
                  (scene) => scene.id === command.target.scene,
                )
                return (
                  <div className="lifecycle-command-row" key={index}>
                    <div className="field">
                      <span className="field-label">动作</span>
                      <select
                        className="in"
                        value={command.kind}
                        onChange={(event) =>
                          dispatchUpdate(
                            body.location,
                            index,
                            withKind(
                              command,
                              event.target.value as EntityLifecycleCommand['kind'],
                            ),
                          )
                        }
                      >
                        <option value="suspendEntity">短暂暂停自动行为</option>
                        <option value="hideEntity">隐藏后离屏重现</option>
                        <option value="restoreEntity">立即恢复</option>
                        <option value="removeEntity">永久移除</option>
                      </select>
                    </div>
                    <div className="field">
                      <span className="field-label">目标场景</span>
                      <select
                        className="in"
                        value={command.target.scene}
                        onChange={(event) => {
                          const scene = state.scenes.find(
                            (candidate) => candidate.id === event.target.value,
                          )
                          const entity = scene?.entities[0]
                          if (!scene || !entity) return
                          dispatchUpdate(body.location, index, {
                            ...command,
                            target: { scene: scene.id, entity: entity.id },
                          })
                        }}
                      >
                        {state.scenes.map((scene) => (
                          <option key={scene.id} value={scene.id}>
                            {scene.id}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <span className="field-label">目标实体</span>
                      <select
                        className="in"
                        value={command.target.entity}
                        onChange={(event) =>
                          dispatchUpdate(body.location, index, {
                            ...command,
                            target: {
                              scene: command.target.scene,
                              entity: event.target.value,
                            },
                          })
                        }
                      >
                        {(targetScene?.entities ?? []).map((entity) => (
                          <option key={entity.id} value={entity.id}>
                            {entity.id}
                          </option>
                        ))}
                      </select>
                    </div>
                    {command.kind === 'suspendEntity' || command.kind === 'hideEntity' ? (
                      <div className="field">
                        <span className="field-label">ticks</span>
                        <input
                          className="in mono"
                          type="number"
                          min={1}
                          step={1}
                          value={command.ticks}
                          onChange={(event) => {
                            const ticks = event.target.valueAsNumber
                            if (!Number.isSafeInteger(ticks) || ticks <= 0) return
                            dispatchUpdate(body.location, index, { ...command, ticks })
                          }}
                        />
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="danger"
                      onClick={() =>
                        props.session.dispatch(
                          new DeleteEntityLifecycleCommand(body.location, index),
                        )
                      }
                    >
                      删除命令
                    </button>
                  </div>
                )
              })}
            </div>
          )
        })
      )}
    </div>
  )
}
