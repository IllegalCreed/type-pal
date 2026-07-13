/**
 * 立绘编辑(C4 编辑器侧)—— 角色模式「头像立绘」区:主头像号 + 预览、命名表情增删改名。
 * 号 = RGM 立绘 chunk(bake 产 /baked/portraits/<n>.png;缺图 onError 隐藏,同 ItemIcon)。
 * 每次变更 = UpdateActorCommand 整 portraits 替换(命令层深拷贝 + undo)。
 */
import type { ActorDef, PortraitSet } from '@type-pal/content'
import { useState } from 'react'
import { UpdateActorCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'

function PortraitImg(props: { base: string; n: number }) {
  return (
    <img
      key={props.n} // 换号重挂,复位上一张的 onError 隐藏态
      src={`${props.base}/${props.n}.png`}
      alt=""
      className="portrait-thumb"
      onError={(e) => {
        ;(e.target as HTMLImageElement).style.visibility = 'hidden'
      }}
    />
  )
}

/** 表情行:名字(失焦改名 = 删旧键加新键)+ 号 + 删。 */
function ExpressionRow(props: {
  name: string
  n: number
  base: string
  onRename: (from: string, to: string) => void
  onSetNum: (name: string, n: number) => void
  onRemove: (name: string) => void
}) {
  const { name, n, base, onRename, onSetNum, onRemove } = props
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <div className="pt-row">
      <PortraitImg base={base} n={n} />
      <input
        className="in pt-name"
        value={draft ?? name}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft && draft !== name) onRename(name, draft)
          setDraft(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
      />
      <input
        className="in mono pt-num"
        type="number"
        value={n}
        onChange={(e) =>
          Number.isFinite(e.target.valueAsNumber) && onSetNum(name, e.target.valueAsNumber)
        }
        onWheel={(e) => e.currentTarget.blur()}
      />
      <button type="button" className="mini" title="删除此表情" onClick={() => onRemove(name)}>
        ✕
      </button>
    </div>
  )
}

export function PortraitEditor(props: {
  actor: ActorDef
  session: EditSession
  /** 立绘目录前缀(assetBase.portraits)。 */
  portraitBase: string
}) {
  const { actor, session, portraitBase } = props
  const p = actor.portraits
  const dispatch = (next: PortraitSet | undefined): void => {
    session.dispatch(new UpdateActorCommand(actor.id, { portraits: next }))
  }
  /** 表情表变更(空表收敛为无 expressions 键,落盘干净)。 */
  const setExpressions = (ex: Record<string, number>): void => {
    if (!p) return
    dispatch(Object.keys(ex).length ? { ...p, expressions: ex } : { default: p.default })
  }
  const newExpressionName = (): string => {
    const ex = p?.expressions ?? {}
    let i = 1
    while (`表情${i}` in ex) i++
    return `表情${i}`
  }

  return (
    <div className="section">
      <h4>
        头像立绘 <span className="hint2">主 + 命名表情 · 剧情按名切换</span>
      </h4>
      {p ? (
        <>
          <div className="pt-row">
            <PortraitImg base={portraitBase} n={p.default} />
            <span className="pt-name pt-main">主(对话默认)</span>
            <input
              className="in mono pt-num"
              type="number"
              value={p.default}
              onChange={(e) =>
                Number.isFinite(e.target.valueAsNumber) &&
                dispatch({ ...p, default: e.target.valueAsNumber })
              }
              onWheel={(e) => e.currentTarget.blur()}
            />
            <button
              type="button"
              className="mini"
              title="删除整个头像组(对话将无立绘)"
              onClick={() => dispatch(undefined)}
            >
              ✕
            </button>
          </div>
          {Object.entries(p.expressions ?? {}).map(([name, n]) => (
            <ExpressionRow
              key={name}
              name={name}
              n={n}
              base={portraitBase}
              onRename={(from, to) => {
                const ex = { ...(p.expressions ?? {}) }
                if (to in ex) return // 重名不覆盖
                const num = ex[from]!
                delete ex[from]
                ex[to] = num
                setExpressions(ex)
              }}
              onSetNum={(nm, num) => setExpressions({ ...(p.expressions ?? {}), [nm]: num })}
              onRemove={(nm) => {
                const ex = { ...(p.expressions ?? {}) }
                delete ex[nm]
                setExpressions(ex)
              }}
            />
          ))}
          <button
            type="button"
            className="tool"
            onClick={() =>
              setExpressions({ ...(p.expressions ?? {}), [newExpressionName()]: p.default })
            }
          >
            ＋ 添加表情
          </button>
        </>
      ) : (
        <div className="field">
          <div className="hint">（无头像 — 对话不显示立绘）</div>
          <button type="button" className="tool" onClick={() => dispatch({ default: 1 })}>
            ＋ 添加头像组
          </button>
        </div>
      )}
    </div>
  )
}
