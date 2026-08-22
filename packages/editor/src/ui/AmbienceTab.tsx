/**
 * 氛围页(数据模式·氛围标签,W6 昼夜)—— 氛围表一览:id | 名字 | 乘色 | 滤镜预览。
 * 乘色 = 全帧 multiply 滤镜色(引擎每帧最后一步);恒等白 [255,255,255] = 不染。
 * 预览 = 一条彩色样例上叠 mix-blend-mode:multiply 的滤镜色,所见即引擎效果。
 * 夜晚缺省值拟合自原版夜盘(R×0.458/G×0.899/B×1.0,见 docs/phase2/ambience-design.md)。
 */
import type { AmbienceDef } from '@type-pal/content'
import { useId, useRef, useState } from 'react'
import {
  type BlockingAmbienceReference,
  blockingAmbienceReferences,
} from '../core/ambience-references.js'
import {
  AddAmbienceCommand,
  AmbienceInUseError,
  DeleteAmbienceCommand,
  UpdateAmbienceCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { CanonicalScriptReference, ScriptEditSession } from '../core/script-editor.js'
import {
  DsButton,
  DsDialog,
  DsIconButton,
  DsListHeader,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsTextField,
} from './design-system/index.js'

const toHex = (t: readonly [number, number, number]): string =>
  `#${t.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')}`
const fromHex = (h: string): [number, number, number] => [
  Number.parseInt(h.slice(1, 3), 16),
  Number.parseInt(h.slice(3, 5), 16),
  Number.parseInt(h.slice(5, 7), 16),
]

function NameCell(props: { a: AmbienceDef; session: EditSession }) {
  const { a, session } = props
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <input
      className="in"
      value={draft ?? a.name}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null && draft !== a.name)
          session.dispatch(new UpdateAmbienceCommand(a.id, { name: draft }))
        setDraft(null)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

export function AmbienceTab(props: {
  ambiences: AmbienceDef[]
  session: EditSession
  script?: { session: ScriptEditSession }
  onOpenReference?: (reference: CanonicalScriptReference) => void
  tabBar?: React.ReactNode
}) {
  const { ambiences, session, script, onOpenReference, tabBar } = props
  const createFormId = useId()
  const createIdFieldId = useId()
  const [createOpen, setCreateOpen] = useState(false)
  const [createId, setCreateId] = useState('')
  const [createName, setCreateName] = useState('')
  const [createError, setCreateError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
    references: BlockingAmbienceReference[]
  }>()
  const deleteTriggerRef = useRef<HTMLButtonElement | null>(null)
  const deleteButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const outlinerRef = useRef<HTMLDivElement | null>(null)

  const openCreate = () => {
    setCreateId('')
    setCreateName('')
    setCreateError('')
    setCreateOpen(true)
  }

  const closeCreate = () => setCreateOpen(false)

  const createAmbience = () => {
    const id = createId.trim()
    if (!id) {
      setCreateError('请输入稳定 ID。')
      document.getElementById(createIdFieldId)?.focus()
      return
    }
    if (ambiences.some((ambience) => ambience.id === id)) {
      setCreateError(`稳定 ID“${id}”已存在。`)
      document.getElementById(createIdFieldId)?.focus()
      return
    }
    session.dispatch(new AddAmbienceCommand(id, createName.trim() || id))
    setCreateOpen(false)
  }

  const beginDelete = (ambience: AmbienceDef, trigger: HTMLButtonElement) => {
    deleteTriggerRef.current = trigger
    setDeleteTarget({
      id: ambience.id,
      name: ambience.name,
      references: blockingAmbienceReferences(
        session.getState(),
        ambience.id,
        script?.session.getState(),
      ),
    })
  }

  const closeDelete = () => {
    setDeleteTarget(undefined)
    requestAnimationFrame(() => deleteTriggerRef.current?.focus())
  }

  const confirmDelete = () => {
    if (!deleteTarget || deleteTarget.references.length) return
    const targetIndex = ambiences.findIndex((ambience) => ambience.id === deleteTarget.id)
    const nextFocusId =
      ambiences[targetIndex + 1]?.id ?? ambiences[targetIndex - 1]?.id ?? undefined
    try {
      session.dispatch(
        new DeleteAmbienceCommand(
          deleteTarget.id,
          script ? () => script.session.getState() : undefined,
        ),
      )
      setDeleteTarget(undefined)
      requestAnimationFrame(() => {
        const nextDelete = nextFocusId ? deleteButtonRefs.current.get(nextFocusId) : undefined
        if (nextDelete) nextDelete.focus()
        else
          outlinerRef.current
            ?.querySelector<HTMLButtonElement>('button[aria-label="新建氛围"]')
            ?.focus()
        deleteTriggerRef.current = null
      })
    } catch (error) {
      if (!(error instanceof AmbienceInUseError)) throw error
      setDeleteTarget((current) =>
        current ? { ...current, references: [...error.references] } : current,
      )
    }
  }

  return (
    <>
      <div ref={outlinerRef} className="outliner data-outliner">
        {tabBar}
        <DsListHeader
          title="氛围"
          count={ambiences.length}
          unit="条"
          actions={[
            {
              id: 'create-ambience',
              label: '新建氛围',
              icon: 'add',
              onClick: openCreate,
            },
          ]}
        />
        <div className="insp-empty" style={{ marginTop: 8 }}>
          全局昼夜色调(全帧乘法滤镜):脚本「切氛围」指令引用这里的 id,跨场景持续、随存档。 白 =
          不染;夜晚缺省值拟合自原版夜盘。改色即改玩家看到的夜(引擎试玩验)。
        </div>
      </div>
      <div className="canvas-wrap data-body">
        <div className="et-scroll">
          {ambiences.length === 0 ? (
            <div className="insp-empty">
              项目没带氛围表(manifest.content.ambiences 未声明)。「切氛围」指令将不生效。
            </div>
          ) : (
            <table className="music-table amb-table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>id</th>
                  <th style={{ width: 180 }}>名字</th>
                  <th style={{ width: 130 }}>乘色</th>
                  <th>滤镜预览</th>
                  <th className="amb-action-column">操作</th>
                </tr>
              </thead>
              <tbody>
                {ambiences.map((a) => (
                  <tr key={a.id}>
                    <td className="mono">{a.id}</td>
                    <td>
                      <NameCell a={a} session={session} />
                    </td>
                    <td>
                      <span className="amb-tint">
                        <input
                          type="color"
                          value={toHex(a.tint)}
                          onChange={(e) =>
                            session.dispatch(
                              new UpdateAmbienceCommand(a.id, { tint: fromHex(e.target.value) }),
                            )
                          }
                          title="全帧乘法色(白=不染)"
                        />
                        <span className="mono hint2">{toHex(a.tint)}</span>
                      </span>
                    </td>
                    <td>
                      {/* 样例条 × multiply 滤镜 = 引擎同款效果 */}
                      <div className="amb-preview">
                        <div className="amb-preview-base" />
                        <div className="amb-preview-tint" style={{ background: toHex(a.tint) }} />
                      </div>
                    </td>
                    <td className="amb-action-cell">
                      <DsIconButton
                        ref={(node) => {
                          if (node) deleteButtonRefs.current.set(a.id, node)
                          else deleteButtonRefs.current.delete(a.id)
                        }}
                        label={`删除氛围 ${a.name}`}
                        icon="delete"
                        variant="danger"
                        size="compact"
                        onClick={(event) => beginDelete(a, event.currentTarget)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <DsDialog
        open={createOpen}
        title="新建氛围"
        description="创建后稳定 ID 用于脚本引用；初始为白色（不染），可在列表中继续调整乘色。"
        onClose={closeCreate}
        footer={
          <>
            <DsButton onClick={closeCreate}>取消</DsButton>
            <DsButton type="submit" form={createFormId} variant="primary">
              创建氛围
            </DsButton>
          </>
        }
      >
        <form
          id={createFormId}
          className="ambience-create-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            createAmbience()
          }}
        >
          <DsTextField
            id={createIdFieldId}
            name="ambience-id"
            label="稳定 ID"
            required
            monospace
            autoFocus
            autoComplete="off"
            spellCheck={false}
            translate="no"
            placeholder="例如：dusk"
            value={createId}
            help={createError ? undefined : '创建后不可修改，供剧情脚本长期引用。'}
            error={createError || undefined}
            onChange={(event) => {
              setCreateId(event.target.value)
              setCreateError('')
            }}
          />
          <DsTextField
            name="ambience-name"
            label="显示名称"
            autoComplete="off"
            placeholder="留空则使用稳定 ID"
            value={createName}
            help="用于编辑器列表展示，创建后仍可修改。"
            onChange={(event) => setCreateName(event.target.value)}
          />
        </form>
      </DsDialog>
      <DsDialog
        open={Boolean(deleteTarget)}
        title={`删除氛围“${deleteTarget?.name ?? ''}”？`}
        description={
          deleteTarget?.references.length
            ? `仍有 ${deleteTarget.references.length} 处引用；请先处理引用后再删除。`
            : '删除后该定义将从氛围表移除；操作可通过撤销恢复。'
        }
        onClose={closeDelete}
        footer={
          <>
            <DsButton onClick={closeDelete}>取消</DsButton>
            <DsButton
              variant="danger"
              disabled={!deleteTarget || deleteTarget.references.length > 0}
              onClick={confirmDelete}
            >
              确认删除
            </DsButton>
          </>
        }
      >
        {deleteTarget?.references.length ? (
          <DsReferencePanel
            className="ambience-delete-references"
            state="ready"
            count={{ kind: 'exact', value: deleteTarget.references.length }}
            impact={{
              kind: 'blocking',
              description: '删除会让剧情或运行态中的稳定 ID 失去定义。',
            }}
          >
            <DsReferenceList initialVisibleCount={3}>
              {deleteTarget.references.map((reference, index) => (
                <DsReferenceRow
                  key={`${reference.kind}:${reference.where}:${index}`}
                  title={reference.label}
                  path={reference.where}
                  labels={[
                    {
                      label:
                        reference.kind === 'world-state'
                          ? '运行态'
                          : reference.kind === 'toggle-day-night'
                            ? '昼夜切换'
                            : '剧情脚本',
                    },
                  ]}
                  action={
                    reference.locator && onOpenReference
                      ? {
                          label: '打开 ↗',
                          ariaLabel: `打开引用：${reference.label}`,
                          onActivate: () => {
                            setDeleteTarget(undefined)
                            deleteTriggerRef.current = null
                            onOpenReference(reference.locator!)
                          },
                        }
                      : undefined
                  }
                  status={
                    reference.locator && onOpenReference
                      ? undefined
                      : {
                          label: '暂不可定位',
                          reason: '当前引用没有可编辑的精确位置。',
                          tone: 'warning',
                        }
                  }
                />
              ))}
            </DsReferenceList>
          </DsReferencePanel>
        ) : (
          <p className="ds-field__help ambience-delete-help">
            当前未发现脚本、昼夜切换或运行态引用。
          </p>
        )}
      </DsDialog>
    </>
  )
}
