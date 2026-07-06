/**
 * 入口点(开局档)页(数据模式·入口标签)—— 主菜单每个「开始游戏 / DLC 入口」= 一条 entryPoint。
 * 每条:稳定 id + 标签(主菜单按钮文案)+ 起始场景;可选自带 startWorld(缺 = 用 manifest 默认开局)。
 *
 * 分工(D25 前的入口点决策):**存档状态走数据(startWorld),叙事走该场景 onEnter(脚本)**。
 * 本页编 entryPoints 表(增删改 + 场景下拉)。startWorld 子表单(队伍/道具/技能/钱)= 后续切片,
 * 现只标「用默认开局」/「自带(N 队员)」。整表改走 SetEntryPointsCommand(undo/redo + 存 manifest.json)。
 */
import type {
  ActorDef,
  EntryPoint,
  Locale,
  LoadedManifest,
  SceneDef,
  StartWorld,
} from '@type-pal/content'
import { lookupText } from '@type-pal/content'
import { useMemo, useState } from 'react'
import { SetEntryPointsCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'

/** manifest 无 entryPoints 时,从 entryScene 合成一条 new-game(与运行时 boot 兼容逻辑一致)。 */
function resolveEntryPoints(manifest: LoadedManifest): EntryPoint[] {
  return manifest.entryPoints ?? [{ id: 'new-game', label: '开始游戏', scene: manifest.entryScene }]
}

export function EntryPointTab(props: {
  manifest: LoadedManifest
  scenes: SceneDef[]
  actors: ActorDef[]
  locale: Locale
  session: EditSession
  tabBar?: React.ReactNode
}) {
  const { manifest, scenes, actors, locale, session, tabBar } = props
  const entryPoints = useMemo(() => resolveEntryPoints(manifest), [manifest])
  const [selIdx, setSelIdx] = useState(0)
  const sel = entryPoints[selIdx] ?? entryPoints[0]
  const sceneIds = useMemo(() => scenes.map((s) => s.id).sort(), [scenes])

  const commit = (next: EntryPoint[]): void => {
    session.dispatch(new SetEntryPointsCommand(next))
  }
  const patchSel = (patch: Partial<EntryPoint>): void => {
    if (!sel) return
    commit(entryPoints.map((e, i) => (i === selIdx ? { ...e, ...patch } : e)))
  }
  // 开局数据(startWorld):存档状态走数据(D25 前入口点决策)。自定义 = 从 manifest.startWorld 克隆改;
  // 关自定义 = 删 startWorld 字段(回落默认)。现子表单编队伍 + 金钱;道具/技能/属性待后续切片。
  const patchStartWorld = (patch: Partial<StartWorld>): void => {
    const cur = sel?.startWorld ?? manifest.startWorld
    patchSel({ startWorld: { ...cur, ...patch } })
  }
  const toggleCustom = (custom: boolean): void => {
    patchSel({ startWorld: custom ? structuredClone(manifest.startWorld) : undefined })
  }
  const toggleParty = (actorId: string): void => {
    const cur = (sel?.startWorld ?? manifest.startWorld).party
    patchStartWorld({
      party: cur.includes(actorId) ? cur.filter((id) => id !== actorId) : [...cur, actorId],
    })
  }
  const addEntry = (): void => {
    // 生成不撞的 id
    let n = entryPoints.length
    let id = `dlc-${n}`
    while (entryPoints.some((e) => e.id === id)) id = `dlc-${++n}`
    commit([...entryPoints, { id, label: `新入口 ${n}`, scene: manifest.entryScene }])
    setSelIdx(entryPoints.length)
  }
  const removeEntry = (): void => {
    if (entryPoints.length <= 1) return // 至少留一条开局
    commit(entryPoints.filter((_, i) => i !== selIdx))
    setSelIdx(Math.max(0, selIdx - 1))
  }

  return (
    <>
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">入口点</span>
          <span className="spacer" />
          <span className="k">{entryPoints.length} 条</span>
        </div>
        <div className="insp-empty" style={{ marginTop: 8 }}>
          主菜单每个按钮 = 一条入口点(开始游戏 / DLC 入口…)。选定 → 用它的起始场景 + 开局数据。
          开场视频/梦境写在该场景的 onEnter 脚本(不进本表)。
        </div>
        <div className="et-scroll" style={{ marginTop: 8 }}>
          {entryPoints.map((e, i) => (
            <button
              type="button"
              key={e.id}
              className={`node${i === selIdx ? ' sel' : ''}`}
              onClick={() => setSelIdx(i)}
            >
              <span className="mono">{e.id}</span> · {e.label}
            </button>
          ))}
        </div>
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          <button type="button" className="btn" onClick={addEntry}>
            + 加入口
          </button>
          <button type="button" className="btn" onClick={removeEntry} disabled={entryPoints.length <= 1}>
            删除
          </button>
        </div>
      </div>
      <div className="canvas-wrap data-body">
        <div className="et-scroll" style={{ padding: 16 }}>
          {sel ? (
            <>
              <label className="row" style={{ gap: 8, marginBottom: 12 }}>
                <span className="k" style={{ width: 72 }}>
                  标签
                </span>
                <input
                  className="in"
                  style={{ width: 240 }}
                  value={sel.label}
                  onChange={(e) => patchSel({ label: e.target.value })}
                />
              </label>
              <label className="row" style={{ gap: 8, marginBottom: 12 }}>
                <span className="k" style={{ width: 72 }}>
                  起始场景
                </span>
                <select
                  className="in"
                  style={{ width: 240 }}
                  value={sel.scene}
                  onChange={(e) => patchSel({ scene: e.target.value })}
                >
                  {!sceneIds.includes(sel.scene) && <option value={sel.scene}>{sel.scene}(缺)</option>}
                  {sceneIds.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </label>
              <label className="row" style={{ gap: 8, marginBottom: 8 }}>
                <span className="k" style={{ width: 72 }}>
                  开局数据
                </span>
                <input
                  type="checkbox"
                  checked={!!sel.startWorld}
                  onChange={(e) => toggleCustom(e.target.checked)}
                />
                <span>{sel.startWorld ? '自定义开局' : '用默认开局(manifest.startWorld)'}</span>
              </label>
              {sel.startWorld && (
                <div style={{ paddingLeft: 80 }}>
                  <label className="row" style={{ gap: 8, marginBottom: 8 }}>
                    <span className="k" style={{ width: 48 }}>
                      金钱
                    </span>
                    <input
                      className="in"
                      style={{ width: 120 }}
                      type="number"
                      min={0}
                      value={sel.startWorld.money}
                      onChange={(e) =>
                        patchStartWorld({ money: Math.max(0, Number(e.target.value) || 0) })
                      }
                    />
                  </label>
                  <div className="row" style={{ gap: 8, alignItems: 'flex-start' }}>
                    <span className="k" style={{ width: 48 }}>
                      队伍
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, maxWidth: 520 }}>
                      {actors
                        .filter((a) => a.battler)
                        .map((a) => (
                          <label key={a.id} className="row" style={{ gap: 4 }}>
                            <input
                              type="checkbox"
                              checked={sel.startWorld?.party.includes(a.id) ?? false}
                              onChange={() => toggleParty(a.id)}
                            />
                            <span>{lookupText(a.name, locale)}</span>
                          </label>
                        ))}
                    </div>
                  </div>
                  <div className="insp-empty" style={{ marginTop: 8 }}>
                    初始道具/技能/属性子表单待后续切片;现自定义编队伍 + 金钱(其余沿用克隆的默认值)。
                  </div>
                </div>
              )}
              <div className="insp-empty" style={{ marginTop: 16 }}>
                id <span className="mono">{sel.id}</span>：主菜单/存档引用的稳定标识,勿轻改。
              </div>
            </>
          ) : (
            <div className="insp-empty">无入口点。</div>
          )}
        </div>
      </div>
    </>
  )
}
