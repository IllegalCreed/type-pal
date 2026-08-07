/**
 * E18-1 伤亡脚本编辑器 —— 中区宽幅 master-detail（仿 LevelCurveEditor 交互）。
 *
 * - 顶部 tab:friendDeath / dying;右栏摘要 + 本组件由 ActorMode 中区展开(互斥)。
 * - 左列:概率门 gates + 兜底分支 fallback(点选选中);右列:选中分支的台词/效果编辑。
 * - 全部编辑走 UpdateActorCommand(即时写回 session state);选中态为本地 state(K1:
 *   gates 删除时 clamp/回退 fallback,dispatch 后不丢);数据一律派生自 session(K1:
 *   禁本地副本,undo/切角色回显不漂移)。
 * - K4:槽移除 = 键 undefined;两槽全移除 → casualty 整体 undefined(导出不落脏键)。
 */
import type { ActorDef, CasualtyBranch, CasualtyScript, Locale } from '@type-pal/content'
import { lookupText } from '@type-pal/content'
import { useState } from 'react'
import { UpdateActorCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'

export type CasualtySlot = 'friendDeath' | 'dying'

type BranchTarget = { kind: 'gate'; index: number } | { kind: 'fallback' }

const STYLES = ['bottom', 'top', 'narration'] as const
const STATS = ['attack', 'magic', 'speed', 'luck'] as const

/** 文本 id 预览:lookupText 缺键返回 id 本身,显式标「未找到文本」对齐 nm() 先例(R2)。 */
function previewText(id: string, locale: Locale): string {
  const resolved = lookupText(id, locale)
  return resolved === id ? '未找到文本' : resolved
}

export function CasualtyEditor(props: {
  actor: ActorDef & { battler: NonNullable<ActorDef['battler']> }
  session: EditSession
  locale: Locale
  onClose: () => void
}) {
  const { actor, session, locale, onClose } = props
  const [slot, setSlot] = useState<CasualtySlot>('friendDeath')
  const [target, setTarget] = useState<BranchTarget>({ kind: 'fallback' })
  const script = actor.battler.casualty?.[slot]

  const emptyBranch = (): CasualtyBranch => ({ lines: [], effects: [] })

  const dispatchCasualty = (next: CasualtyScript | undefined): void => {
    const cur = actor.battler.casualty
    const nextCasualty: { friendDeath?: CasualtyScript; dying?: CasualtyScript } = cur
      ? { ...cur }
      : {}
    if (next === undefined) delete nextCasualty[slot]
    else nextCasualty[slot] = next
    session.dispatch(
      new UpdateActorCommand(actor.id, {
        battler: {
          ...actor.battler,
          casualty:
            nextCasualty.friendDeath !== undefined || nextCasualty.dying !== undefined
              ? nextCasualty
              : undefined,
        },
      }),
    )
  }

  const setScript = (fn: (s: CasualtyScript) => CasualtyScript): void =>
    dispatchCasualty(fn(script ?? { gates: [], fallback: emptyBranch() }))

  const addGate = (): void =>
    setScript((s) => ({
      ...s,
      gates: [...s.gates, { chance: 50, branch: emptyBranch() }],
    }))

  const removeGate = (index: number): void => {
    setScript((s) => ({ ...s, gates: s.gates.filter((_, i) => i !== index) }))
    // K1:gates 删除后选中态 clamp/回退 fallback。
    setTarget((t) =>
      t.kind === 'gate' && t.index === index
        ? { kind: 'fallback' }
        : t.kind === 'gate' && t.index > index
          ? { kind: 'gate', index: t.index - 1 }
          : t,
    )
  }

  const setGateChance = (index: number, chance: number): void =>
    setScript((s) => ({
      ...s,
      gates: s.gates.map((g, i) => (i === index ? { ...g, chance } : g)),
    }))

  const branch = target.kind === 'fallback' ? script?.fallback : script?.gates[target.index]?.branch

  const setBranch = (next: CasualtyBranch): void =>
    setScript((s) =>
      target.kind === 'fallback'
        ? { ...s, fallback: next }
        : {
            ...s,
            gates: s.gates.map((g, i) => (i === target.index ? { ...g, branch: next } : g)),
          },
    )

  return (
    <div className="dscroll" style={{ padding: '12px 16px', minWidth: 0 }}>
      <div className="toolbar" style={{ marginBottom: 6, gap: 8 }}>
        <span className="hint">伤亡脚本 · {actor.id}</span>
        <button
          type="button"
          className={`tool${slot === 'friendDeath' ? ' on' : ''}`}
          onClick={() => setSlot('friendDeath')}
        >
          队友阵亡时 (friendDeath)
        </button>
        <button
          type="button"
          className={`tool${slot === 'dying' ? ' on' : ''}`}
          onClick={() => setSlot('dying')}
        >
          自己濒死时 (dying)
        </button>
        <span className="spacer" />
        {script ? (
          <button
            type="button"
            className="tool"
            title="移除本槽（两槽全移除后 casualty 整体清除）"
            onClick={() => dispatchCasualty(undefined)}
          >
            移除本槽
          </button>
        ) : null}
        <button type="button" className="tool" onClick={onClose}>
          ✓ 完成
        </button>
      </div>

      {!script ? (
        <div className="field" style={{ padding: 24 }}>
          <span className="hint">
            本槽未配置 —— {slot === 'friendDeath' ? '队友阵亡' : '自己濒死'}时不触发额外脚本。
          </span>
          <button
            type="button"
            className="tool"
            onClick={() => dispatchCasualty({ gates: [], fallback: emptyBranch() })}
          >
            ＋ 配置
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
          {/* 左列:概率门 + 兜底分支 */}
          <div style={{ flex: '0 0 300px', minWidth: 0 }}>
            <div className="pane-h">
              <span className="t">概率门</span>
              <span className="hint">r∈[1,100]，r≥chance 命中即停</span>
            </div>
            {script.gates.map((g, i) => (
              <div
                key={i}
                className={`arow${target.kind === 'gate' && target.index === i ? ' sel' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setTarget({ kind: 'gate', index: i })}
              >
                <input
                  type="number"
                  className="in mono"
                  style={{ width: 64 }}
                  min={1}
                  max={100}
                  value={g.chance}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setGateChance(i, Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                />
                <span className="meta">%</span>
                <span className="spacer" />
                <button type="button" className="mini-txt" onClick={(e) => { e.stopPropagation(); removeGate(i) }}>
                  ✕
                </button>
              </div>
            ))}
            <button type="button" className="tool" style={{ marginTop: 4 }} onClick={addGate}>
              ＋ 加一扇门
            </button>
            <div
              className={`arow${target.kind === 'fallback' ? ' sel' : ''}`}
              style={{ marginTop: 6 }}
              onClick={() => setTarget({ kind: 'fallback' })}
            >
              兜底分支 (fallback)
            </div>
          </div>
          {/* 右列:选中分支编辑器 */}
          <div style={{ flex: 1, minWidth: 0, borderLeft: '1px solid var(--line, #2c3644)', paddingLeft: 12 }}>
            {branch ? (
              <BranchEditor
                branch={branch}
                locale={locale}
                onChange={setBranch}
                header={
                  target.kind === 'fallback' ? '兜底分支' : `第 ${target.index + 1} 扇门分支`
                }
              />
            ) : (
              <div className="insp-empty">（该门已被删除，请选择其他分支）</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function BranchEditor(props: {
  branch: CasualtyBranch
  locale: Locale
  header: string
  onChange: (next: CasualtyBranch) => void
}) {
  const { branch, locale, header, onChange } = props
  const setLines = (lines: CasualtyBranch['lines']): void => onChange({ ...branch, lines })
  const setEffects = (effects: CasualtyBranch['effects']): void => onChange({ ...branch, effects })

  return (
    <div>
      <div className="pane-h">
        <span className="t">{header}</span>
      </div>
      <div className="pane-h" style={{ marginTop: 4 }}>
        <span className="t">台词</span>
        <span className="spacer" />
        <button
          type="button"
          className="mini-txt"
          onClick={() => setLines([...branch.lines, { text: '', style: 'bottom' }])}
        >
          ＋ 台词
        </button>
      </div>
      {branch.lines.map((line, li) => (
        <div key={li} className="field" style={{ flexWrap: 'wrap', gap: 6 }}>
          <input
            className="in mono"
            style={{ width: 180 }}
            placeholder="文本 id（如 dlg.1208）"
            value={line.text}
            onChange={(e) =>
              setLines(branch.lines.map((l, i) => (i === li ? { ...l, text: e.target.value } : l)))
            }
          />
          <select
            className="in"
            value={line.style}
            onChange={(e) =>
              setLines(
                branch.lines.map((l, i) =>
                  i === li ? { ...l, style: e.target.value as CasualtyBranch['lines'][number]['style'] } : l,
                ),
              )
            }
          >
            {STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span className="hint" style={{ flex: 1, minWidth: 160 }}>
            {line.text ? previewText(line.text, locale) : '（空）'}
          </span>
          <button
            type="button"
            className="mini-txt"
            onClick={() => setLines(branch.lines.filter((_, i) => i !== li))}
          >
            ✕
          </button>
        </div>
      ))}
      {branch.lines.length === 0 ? <span className="hint">（无台词）</span> : null}

      <div className="pane-h" style={{ marginTop: 10 }}>
        <span className="t">效果</span>
        <span className="spacer" />
        <button
          type="button"
          className="mini-txt"
          onClick={() => setEffects([...branch.effects, { kind: 'heal', resource: 'hp' }])}
        >
          ＋ 效果
        </button>
      </div>
      {branch.effects.map((eff, ei) => (
        <div key={ei} className="field" style={{ flexWrap: 'wrap', gap: 6 }}>
          <select
            className="in"
            value={eff.kind}
            onChange={(e) => {
              const kind = e.target.value
              setEffects(
                branch.effects.map((x, i) =>
                  i === ei
                    ? kind === 'heal'
                      ? { kind: 'heal', resource: 'hp' }
                      : { kind: 'tempStatBuff', stat: 'attack', percent: 10 }
                    : x,
                ),
              )
            }}
          >
            <option value="heal">回血 / 回蓝</option>
            <option value="tempStatBuff">临时增益</option>
          </select>
          {eff.kind === 'heal' ? (
            <select
              className="in"
              value={eff.resource}
              onChange={(e) =>
                setEffects(
                  branch.effects.map((x, i) =>
                    i === ei ? { ...x, resource: e.target.value as 'hp' | 'mp' } : x,
                  ),
                )
              }
            >
              <option value="hp">体力</option>
              <option value="mp">真气</option>
            </select>
          ) : (
            <>
              <select
                className="in"
                value={eff.stat}
                onChange={(e) =>
                  setEffects(
                    branch.effects.map((x, i) =>
                      i === ei
                        ? { ...x, stat: e.target.value as (typeof STATS)[number] }
                        : x,
                    ),
                  )
                }
              >
                {STATS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                type="number"
                className="in mono"
                style={{ width: 64 }}
                min={1}
                value={eff.percent}
                onChange={(e) =>
                  setEffects(
                    branch.effects.map((x, i) =>
                      i === ei ? { ...x, percent: Math.max(1, Number(e.target.value) || 1) } : x,
                    ),
                  )
                }
              />
              <span className="hint">%</span>
            </>
          )}
          <button
            type="button"
            className="mini-txt"
            onClick={() => setEffects(branch.effects.filter((_, i) => i !== ei))}
          >
            ✕
          </button>
        </div>
      ))}
      {branch.effects.length === 0 ? <span className="hint">（无效果）</span> : null}
    </div>
  )
}
