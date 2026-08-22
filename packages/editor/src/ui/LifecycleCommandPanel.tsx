import type { EntityLifecycleCommand } from '@type-pal/content'
import type { EditSession } from '../core/edit-session.js'
import {
  collectEntityLifecycleCommandBodies,
  DeleteEntityLifecycleCommand,
  InsertEntityLifecycleCommand,
  UpdateEntityLifecycleCommand,
} from '../core/lifecycle-command-editor.js'
import {
  DsButton,
  DsCard,
  DsIconButton,
  DsNumberField,
  DsSelectField,
  DsTag,
} from './design-system/controls.js'
import { DsInspectorSection } from './design-system/recipes.js'

const LIFECYCLE_ACTIONS: ReadonlyArray<{
  value: EntityLifecycleCommand['kind']
  label: string
}> = [
  { value: 'suspendEntity', label: '定时暂停自动活动' },
  { value: 'hideEntity', label: '定时隐藏，离屏后重现' },
  { value: 'restoreEntity', label: '恢复基础状态' },
  { value: 'removeEntity', label: '持续移除（直到恢复）' },
]

const LIFECYCLE_ACTION_HELP: Record<EntityLifecycleCommand['kind'], string> = {
  suspendEntity: '保持目标现有的显隐与碰撞结果；暂停自动行为、接触触发和敌对追击，仍可手动交互。',
  hideEntity: '先隐藏并计时；倒计时结束后，目标离开画面才会重现。',
  restoreEntity: '清除暂停、隐藏或移除状态；不改变位置、朝向或脚本设置的显隐。',
  removeEntity: '不会自动重现；实体定义仍保留，可用“恢复基础状态”重新启用。',
}

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
  const bodies = collectEntityLifecycleCommandBodies(state, props.sceneId, props.entityId)
  const dispatchUpdate = (
    location: (typeof bodies)[number]['location'],
    index: number,
    command: EntityLifecycleCommand,
  ): void => {
    props.session.dispatch(new UpdateEntityLifecycleCommand(location, index, command))
  }

  return (
    <DsInspectorSection
      className="lifecycle-command-editor"
      title="实体状态命令"
      description="每张卡片对应当前实体脚本中的一段执行正文。脚本执行到该正文时，状态命令才会作用于目标实体；新增命令会追加到该正文末尾。"
    >
      <p className="ds-inspector-supporting-copy">
        这里仅汇总暂停、隐藏、恢复和移除命令；分支中的其他脚本指令仍在脚本编辑器中编辑。
      </p>
      {bodies.length === 0 ? (
        <p className="ds-inspector-inline-empty">
          暂无可编辑执行正文。请先为此实体创建触发或自动行为。
        </p>
      ) : (
        <div className="lifecycle-command-body-list">
          {bodies.map((body, bodyIndex) => {
            const lifecycleRows = body.commands.flatMap((command, index) =>
              isLifecycleCommand(command) ? [{ command, index }] : [],
            )
            const bodyOrdinalLabel = `执行正文 ${bodyIndex + 1}`
            const bodyAccessibleLabel = `${bodyOrdinalLabel}：${body.label}`
            return (
              <DsCard
                className="lifecycle-command-body"
                key={`${body.location.path.join('/')}:${bodyIndex}`}
              >
                <header className="lifecycle-command-body__header">
                  <div className="lifecycle-command-body__heading">
                    <span className="lifecycle-command-body__eyebrow">{bodyOrdinalLabel}</span>
                    <h3 className="lifecycle-command-body__title">{body.label}</h3>
                    <span className="lifecycle-command-body__meta">
                      正文共 {body.commands.length} 条指令
                    </span>
                  </div>
                  <div className="lifecycle-command-body__actions">
                    <DsTag tone="neutral">状态命令 {lifecycleRows.length} 条</DsTag>
                    <DsButton
                      size="compact"
                      variant="secondary"
                      icon="add"
                      aria-label={`向“${bodyAccessibleLabel}”末尾添加状态命令`}
                      onClick={() =>
                        props.session.dispatch(
                          new InsertEntityLifecycleCommand(body.location, body.commands.length, {
                            kind: 'suspendEntity',
                            target: { scene: props.sceneId, entity: props.entityId },
                            ticks: 15,
                          }),
                        )
                      }
                    >
                      添加命令
                    </DsButton>
                  </div>
                </header>
                {lifecycleRows.length === 0 ? (
                  <p className="ds-inspector-inline-empty">
                    此执行正文暂无实体状态命令。使用右上角“添加命令”追加到正文末尾。
                  </p>
                ) : (
                  <div className="lifecycle-command-list">
                    {lifecycleRows.map(({ command, index }, lifecycleOrdinal) => {
                      const targetScene = state.scenes.find(
                        (scene) => scene.id === command.target.scene,
                      )
                      const commandLabel = `状态命令 ${lifecycleOrdinal + 1}`
                      return (
                        <section
                          className="lifecycle-command-row"
                          key={index}
                          aria-label={`${bodyOrdinalLabel}的${commandLabel}`}
                        >
                          <header className="lifecycle-command-row__header">
                            <div className="lifecycle-command-row__heading">
                              <h4>{commandLabel}</h4>
                              <DsTag tone="neutral" monospace>
                                正文第 {index + 1} 条
                              </DsTag>
                            </div>
                            <DsIconButton
                              size="compact"
                              variant="danger"
                              icon="delete"
                              label={`删除“${bodyAccessibleLabel}”中的${commandLabel}`}
                              onClick={() =>
                                props.session.dispatch(
                                  new DeleteEntityLifecycleCommand(body.location, index),
                                )
                              }
                            />
                          </header>
                          <div className="lifecycle-command-row__fields">
                            <DsSelectField
                              size="compact"
                              label="动作"
                              value={command.kind}
                              options={LIFECYCLE_ACTIONS}
                              help={LIFECYCLE_ACTION_HELP[command.kind]}
                              onValueChange={(value) =>
                                dispatchUpdate(
                                  body.location,
                                  index,
                                  withKind(command, value as EntityLifecycleCommand['kind']),
                                )
                              }
                            />
                            <DsSelectField
                              size="compact"
                              label="目标场景"
                              value={command.target.scene}
                              options={state.scenes.map((scene) => ({
                                value: scene.id,
                                label: scene.id,
                                description: scene.entities.length === 0 ? '无可选实体' : undefined,
                                disabled: scene.entities.length === 0,
                              }))}
                              onValueChange={(value) => {
                                const scene = state.scenes.find(
                                  (candidate) => candidate.id === value,
                                )
                                const entity = scene?.entities[0]
                                if (!scene || !entity) return
                                dispatchUpdate(body.location, index, {
                                  ...command,
                                  target: { scene: scene.id, entity: entity.id },
                                })
                              }}
                            />
                            <DsSelectField
                              size="compact"
                              label="目标实体"
                              value={command.target.entity}
                              options={(targetScene?.entities ?? []).map((entity) => ({
                                value: entity.id,
                                label: entity.id,
                              }))}
                              onValueChange={(value) =>
                                dispatchUpdate(body.location, index, {
                                  ...command,
                                  target: {
                                    scene: command.target.scene,
                                    entity: value,
                                  },
                                })
                              }
                            />
                            {command.kind === 'suspendEntity' || command.kind === 'hideEntity' ? (
                              <DsNumberField
                                size="compact"
                                label="持续时间"
                                help="单位为世界拍（1 拍约 0.1 秒）；离场或阻塞时暂停计时。"
                                min={1}
                                step={1}
                                value={command.ticks}
                                onChange={(event) => {
                                  const ticks = event.target.valueAsNumber
                                  if (!Number.isSafeInteger(ticks) || ticks <= 0) return
                                  dispatchUpdate(body.location, index, { ...command, ticks })
                                }}
                              />
                            ) : null}
                          </div>
                        </section>
                      )
                    })}
                  </div>
                )}
              </DsCard>
            )
          })}
        </div>
      )}
    </DsInspectorSection>
  )
}
