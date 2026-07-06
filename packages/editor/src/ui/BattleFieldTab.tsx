/**
 * 战场工作台(D24 作者拍板独立模块)—— 数据模式「战场」标签。
 * 左:战场列表(过滤);右:表单(名字/背景引用/常驻波/五灵加成)+ 着色预览。
 * 战场是一等 content 域(content/battle-fields.json,数字稳定 id 被场景默认/
 * startBattle 参数/明雷实体引用)。破坏演进(props/damageStates)将来纯增量扩字段。
 */
import type { BattleFieldDef, ElementVec } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { loadBattleBg, loadPalette } from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type BattleFieldPatch, UpdateBattleFieldCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'

const ELEM_LABEL: Record<keyof ElementVec, string> = {
  wind: '风',
  thunder: '雷',
  water: '水',
  fire: '火',
  earth: '土',
}

function FieldPreview(props: { assetBase: AssetBase; field: BattleFieldDef }) {
  const { assetBase, field } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const pal = await loadPalette(assetBase, 0)
        const bg = await loadBattleBg(assetBase, field.id, pal)
        if (!alive || !canvasRef.current) return
        const ctx = canvasRef.current.getContext('2d')
        if (!ctx) return
        ctx.imageSmoothingEnabled = false
        ctx.clearRect(0, 0, 320, 200)
        ctx.drawImage(bg, 0, 0, 320, 200)
      } catch {
        const ctx = canvasRef.current?.getContext('2d')
        ctx?.clearRect(0, 0, 320, 200)
      }
    })()
    return () => {
      alive = false
    }
  }, [assetBase, field.id])
  return <canvas ref={canvasRef} width={320} height={200} className="bf-tab-preview" />
}

export function BattleFieldTab(props: {
  battleFields: BattleFieldDef[]
  assetBase: AssetBase
  session: EditSession
  tabBar?: React.ReactNode
}) {
  const { battleFields, assetBase, session, tabBar } = props
  const [filter, setFilter] = useState('')
  const [selId, setSelId] = useState<number>(battleFields[0]?.id ?? 0)
  const shown = useMemo(
    () =>
      battleFields.filter(
        (f) =>
          !filter ||
          String(f.id).includes(filter) ||
          String(f.id).padStart(3, '0').includes(filter) ||
          (f.name ?? '').includes(filter),
      ),
    [battleFields, filter],
  )
  const field = battleFields.find((f) => f.id === selId) ?? shown[0]
  const patch = (p: BattleFieldPatch): void => {
    if (field) session.dispatch(new UpdateBattleFieldCommand(field.id, p))
  }

  return (
    <>
      <div className="outliner data-outliner">
        {tabBar}
        <div className="pane-h">
          <span className="t">战场</span>
          <span className="spacer" />
          <span className="k">{shown.length} 个</span>
        </div>
        <input
          className="in"
          placeholder="过滤 编号/名字"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="tree">
          {shown.map((f) => (
            <div
              key={f.id}
              className={`node${field?.id === f.id ? ' sel' : ''}`}
              onClick={() => setSelId(f.id)}
            >
              <span className="mono">{String(f.id).padStart(3, '0')}</span>
              <span style={{ marginLeft: 6 }}>{f.name ?? ''}</span>
              {f.screenWave > 0 && <span className="k" style={{ marginLeft: 'auto' }}>🌊{f.screenWave}</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="canvas-wrap data-body">
        {!field ? (
          <div className="insp-empty">
            工程没带战场表(manifest.content.battleFields 未声明或 battle-fields.json 为空)。
          </div>
        ) : (
          <div className="et-scroll" style={{ padding: 12 }}>
            <FieldPreview assetBase={assetBase} field={field} />
            <div className="insp-row" style={{ marginTop: 8 }}>
              <span className="k">编号</span>
              <span className="mono">{String(field.id).padStart(3, '0')}</span>
              <span className="k" style={{ marginLeft: 12 }}>
                名字
              </span>
              <input
                className="in"
                style={{ width: 140 }}
                value={field.name ?? ''}
                placeholder="(未命名)"
                onChange={(e) => patch({ name: e.target.value || undefined })}
              />
            </div>
            <div className="insp-row">
              <span className="k">背景</span>
              <input
                className="in"
                style={{ width: 260 }}
                value={field.bg ?? ''}
                placeholder={`battle/bg/${String(field.id).padStart(3, '0')}.png (惯例)`}
                onChange={(e) => patch({ bg: e.target.value || undefined })}
              />
              <span className="k" style={{ marginLeft: 12 }}>
                常驻波
              </span>
              <input
                className="in cf-num"
                type="number"
                value={field.screenWave}
                onChange={(e) => patch({ screenWave: Number(e.target.value) || 0 })}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            <div className="insp-row">
              <span className="k">五灵加成(-10..+10,乘入法术伤害)</span>
            </div>
            <div className="insp-row">
              {(Object.keys(ELEM_LABEL) as (keyof ElementVec)[]).map((k) => (
                <span key={k} style={{ marginRight: 10 }}>
                  <span className="k">{ELEM_LABEL[k]}</span>
                  <input
                    className="in cf-num"
                    type="number"
                    min={-10}
                    max={10}
                    value={field.magicEffect[k]}
                    onChange={(e) =>
                      patch({
                        magicEffect: { ...field.magicEffect, [k]: Number(e.target.value) || 0 },
                      })
                    }
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                </span>
              ))}
            </div>
            <div className="insp-empty" style={{ marginTop: 10 }}>
              引用处:场景默认(battleFieldId)/剧情战 startBattle.fieldId/明雷怪
              hostile.battleFieldId。破坏效果演进(props/damageStates)立项时在此页扩展。
            </div>
          </div>
        )}
      </div>
    </>
  )
}
