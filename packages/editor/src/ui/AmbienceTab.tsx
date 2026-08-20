/**
 * 氛围页(数据模式·氛围标签,W6 昼夜)—— 氛围表一览:id | 名字 | 乘色 | 滤镜预览。
 * 乘色 = 全帧 multiply 滤镜色(引擎每帧最后一步);恒等白 [255,255,255] = 不染。
 * 预览 = 一条彩色样例上叠 mix-blend-mode:multiply 的滤镜色,所见即引擎效果。
 * 夜晚缺省值拟合自原版夜盘(R×0.458/G×0.899/B×1.0,见 docs/phase2/ambience-design.md)。
 */
import type { AmbienceDef } from '@type-pal/content'
import { useId, useState } from 'react'
import { AddAmbienceCommand, UpdateAmbienceCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { DsButton, DsDialog, DsListHeader, DsTextField } from './design-system/index.js'

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
  tabBar?: React.ReactNode
}) {
  const { ambiences, session, tabBar } = props
  const createFormId = useId()
  const createIdFieldId = useId()
  const [createOpen, setCreateOpen] = useState(false)
  const [createId, setCreateId] = useState('')
  const [createName, setCreateName] = useState('')
  const [createError, setCreateError] = useState('')

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

  return (
    <>
      <div className="outliner data-outliner">
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
              工程没带氛围表(manifest.content.ambiences 未声明)。「切氛围」指令将不生效。
            </div>
          ) : (
            <table className="music-table amb-table">
              <thead>
                <tr>
                  <th style={{ width: 90 }}>id</th>
                  <th style={{ width: 180 }}>名字</th>
                  <th style={{ width: 130 }}>乘色</th>
                  <th>滤镜预览</th>
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
    </>
  )
}
