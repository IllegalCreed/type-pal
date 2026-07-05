/**
 * 音乐库页(数据模式·音乐标签,W5)—— 工程曲库一览:编号 | 别名 | 试听。
 * 原版曲子无官方名,别名是创作者自己起的(存 content/music.json,BGM 选择器显示);
 * 别名输入失焦才提交命令(输入过程不刷 undo 栈)。试听全局单路(MusicPicker mini-store)。
 */
import type { MusicDef } from '@type-pal/content'
import { useMemo, useState } from 'react'
import { UpdateMusicNameCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { PreviewButton } from './MusicPicker.js'

function NameCell(props: { m: MusicDef; session: EditSession }) {
  const { m, session } = props
  const [draft, setDraft] = useState<string | null>(null) // null = 未在编辑,显 store 值
  return (
    <input
      className="in"
      value={draft ?? m.name ?? ''}
      placeholder="(未命名,显示编号)"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== null && draft !== (m.name ?? '')) {
          session.dispatch(new UpdateMusicNameCommand(m.id, draft))
        }
        setDraft(null)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
    />
  )
}

export function MusicTab(props: {
  music: MusicDef[]
  /** 试听资产前缀(assetBase.music)。 */
  musicBase: string
  session: EditSession
  tabBar?: React.ReactNode
}) {
  const { music, musicBase, session, tabBar } = props
  const [filter, setFilter] = useState('')
  const shown = useMemo(
    () =>
      music.filter(
        (m) =>
          !filter ||
          String(m.id).includes(filter) ||
          m.id.toString().padStart(3, '0').includes(filter) ||
          (m.name ?? '').includes(filter),
      ),
    [music, filter],
  )
  return (
    <>
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">音乐</span>
          <span className="spacer" />
          <span className="k">{shown.length} 首</span>
        </div>
        <input
          className="in"
          placeholder="过滤 编号/别名"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="insp-empty" style={{ marginTop: 8 }}>
          别名存 content/music.json,BGM 选择器按别名显示。曲子本体是只读提取资产
          (assets/music),编辑器不改 MIDI。
        </div>
      </div>
      <div className="canvas-wrap data-body">
        <div className="et-scroll">
          {music.length === 0 ? (
            <div className="insp-empty">
              工程没带音乐库(manifest.content.music 未声明或 music.json 为空)。
            </div>
          ) : (
            <table className="music-table">
              <thead>
                <tr>
                  <th style={{ width: 56 }}>编号</th>
                  <th>别名</th>
                  <th style={{ width: 44 }}>试听</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((m) => (
                  <tr key={m.id}>
                    <td className="mono">{m.id.toString().padStart(3, '0')}</td>
                    <td>
                      <NameCell m={m} session={session} />
                    </td>
                    <td>
                      <PreviewButton track={m.id} baseUrl={musicBase} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
