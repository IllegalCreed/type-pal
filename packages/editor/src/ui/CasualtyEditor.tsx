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
import {
  DsButton,
  DsDraftNumberInput,
  DsDraftTextInput,
  DsSelect,
  DsSequenceIndex,
  DsPressable,
} from './design-system/index.js'

export type CasualtySlot = 'friendDeath' | 'dying'

type BranchTarget = { kind: 'gate'; index: number } | { kind: 'fallback' }

const STYLE_OPTIONS = [
  { value: 'bottom', label: '底部对话' },
  { value: 'top', label: '顶部对话' },
  { value: 'narration', label: '旁白' },
] as const
const STAT_OPTIONS = [
  { value: 'attack', label: '武术' },
  { value: 'magic', label: '灵力' },
  { value: 'speed', label: '身法' },
  { value: 'luck', label: '吉运' },
] as const

const SLOT_META: Record<CasualtySlot, { label: string; description: string }> = {
  friendDeath: {
    label: '队友阵亡时',
    description: '队伍中其他角色阵亡后触发',
  },
  dying: {
    label: '自己濒死时',
    description: '该角色进入濒死状态时触发',
  },
}

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
  const syncToken = session.getHistoryVersion()
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
  const selectSlot = (next: CasualtySlot): void => {
    setSlot(next)
    setTarget({ kind: 'fallback' })
  }

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
    <div className="casualty-editor">
      <header className="casualty-editor-head">
        <div className="casualty-editor-title">
          <span>角色反应脚本</span>
          <h2>伤亡脚本 · {actor.id}</h2>
          <p>按顺序判定概率分支；全部未命中时执行兜底分支。</p>
        </div>
        <div className="casualty-editor-actions">
          {script ? (
            <DsButton
              className="casualty-remove-slot"
              title="移除当前事件配置；两个事件都移除后会清除整个伤亡脚本"
              onClick={() => dispatchCasualty(undefined)}
              size="compact"
              variant="secondary"
            >
              移除当前事件
            </DsButton>
          ) : null}
          <DsButton className="casualty-done" onClick={onClose} size="compact" variant="secondary">
            ✓ 完成
          </DsButton>
        </div>
      </header>

      <div className="casualty-slot-tabs" role="tablist" aria-label="伤亡事件类型">
        {(Object.keys(SLOT_META) as CasualtySlot[]).map((candidate) => {
          const meta = SLOT_META[candidate]
          const configured = actor.battler.casualty?.[candidate] !== undefined
          return (
            <DsPressable
              key={candidate}
              type="button"
              role="tab"
              aria-selected={slot === candidate}
              className={slot === candidate ? 'active' : ''}
              onClick={() => selectSlot(candidate)}
            >
              <span>{meta.label}</span>
              <small>{meta.description}</small>
              <em>{configured ? '已配置' : '未配置'}</em>
            </DsPressable>
          )
        })}
      </div>

      {!script ? (
        <div className="casualty-unconfigured">
          <span aria-hidden="true">◇</span>
          <h3>{SLOT_META[slot].label}尚未配置</h3>
          <p>{SLOT_META[slot].description}，目前不会播放额外台词或施加效果。</p>
          <DsButton
            onClick={() => dispatchCasualty({ gates: [], fallback: emptyBranch() })}
            size="compact"
            variant="secondary"
          >
            ＋ 配置此事件
          </DsButton>
        </div>
      ) : (
        <div className="casualty-workbench">
          <aside className="casualty-branch-panel" aria-label="概率分支列表">
            <div className="casualty-panel-head">
              <div>
                <span>执行顺序</span>
                <h3>概率分支</h3>
              </div>
              <strong>{script.gates.length + 1}</strong>
            </div>
            <p className="casualty-probability-note">
              从上到下判定；随机数达到阈值时执行该分支并停止。
            </p>
            <div className="casualty-branch-list">
              {script.gates.map((gate, index) => {
                const selected = target.kind === 'gate' && target.index === index
                return (
                  <div key={index} className={`arow casualty-gate-row${selected ? ' sel' : ''}`}>
                    <DsPressable
                      type="button"
                      className="casualty-branch-select"
                      data-gate-select="true"
                      aria-pressed={selected}
                      onClick={() => setTarget({ kind: 'gate', index })}
                    >
                      <DsSequenceIndex
                        value={index + 1}
                        accessibleLabel={`第 ${index + 1} 个概率分支`}
                      />
                      <span>
                        <strong>概率分支</strong>
                        <small>
                          {gate.branch.lines.length} 条台词 · {gate.branch.effects.length} 个效果
                        </small>
                      </span>
                    </DsPressable>
                    <label className="casualty-chance-field">
                      <span>阈值</span>
                      <DsDraftNumberInput
                        draftKey={`actor:${actor.id}:casualty:${slot}:gate:${index}:chance`}
                        syncToken={syncToken}
                        min={1}
                        max={100}
                        step={1}
                        integer
                        normalize={(value) =>
                          Math.max(1, Math.min(100, Math.trunc(value)))
                        }
                        aria-label={`第 ${index + 1} 个概率分支阈值`}
                        value={gate.chance}
                        onCommit={(value) => {
                          const chance = Math.max(1, Math.min(100, value ?? 1))
                          if (chance !== gate.chance) setGateChance(index, chance)
                        }}
                      />
                      <span>%</span>
                    </label>
                    <DsButton
                      className="casualty-delete-branch"
                      aria-label={`删除第 ${index + 1} 个概率分支`}
                      title="删除概率分支"
                      onClick={() => removeGate(index)}
                      size="compact"
                      variant="secondary"
                    >
                      ✕
                    </DsButton>
                  </div>
                )
              })}
            </div>
            <DsButton
              className="casualty-add-branch"
              onClick={addGate}
              size="compact"
              variant="secondary"
            >
              ＋ 添加概率分支
            </DsButton>
            <DsPressable
              type="button"
              className={`arow casualty-fallback-row${target.kind === 'fallback' ? ' sel' : ''}`}
              onClick={() => setTarget({ kind: 'fallback' })}
              aria-pressed={target.kind === 'fallback'}
            >
              <DsSequenceIndex value="末" accessibleLabel="兜底分支" />
              <span>
                <strong>兜底分支</strong>
                <small>
                  {script.fallback.lines.length} 条台词 · {script.fallback.effects.length} 个效果
                </small>
              </span>
              <em>必定执行</em>
            </DsPressable>
          </aside>

          <main className="casualty-branch-editor">
            {branch ? (
              <BranchEditor
                branch={branch}
                locale={locale}
                onChange={setBranch}
                header={target.kind === 'fallback' ? '兜底分支' : `概率分支 ${target.index + 1}`}
                draftScope={`actor:${actor.id}:casualty:${slot}:${
                  target.kind === 'fallback' ? 'fallback' : `gate:${target.index}`
                }`}
                syncToken={syncToken}
              />
            ) : (
              <div className="casualty-empty-state">该分支已删除，请在左侧选择其他分支。</div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}

function BranchEditor(props: {
  branch: CasualtyBranch
  locale: Locale
  header: string
  draftScope: string
  syncToken: number
  onChange: (next: CasualtyBranch) => void
}) {
  const { branch, locale, header, draftScope, syncToken, onChange } = props
  const setLines = (lines: CasualtyBranch['lines']): void => onChange({ ...branch, lines })
  const setEffects = (effects: CasualtyBranch['effects']): void => onChange({ ...branch, effects })

  return (
    <div className="casualty-branch-content">
      <header className="casualty-branch-head">
        <div>
          <span>当前编辑</span>
          <h3>{header}</h3>
        </div>
        <p>
          {branch.lines.length} 条台词 · {branch.effects.length} 个效果
        </p>
      </header>

      <section className="casualty-content-section">
        <header>
          <div>
            <span>演出内容</span>
            <h4>台词</h4>
          </div>
          <DsButton
            onClick={() => setLines([...branch.lines, { text: '', style: 'bottom' }])}
            size="compact"
            variant="secondary"
          >
            ＋ 台词
          </DsButton>
        </header>
        <div className="casualty-item-list">
          {branch.lines.map((line, index) => (
            <article key={index} className="casualty-item-card">
              <header>
                <strong>台词 {index + 1}</strong>
                <DsButton
                  aria-label={`删除台词 ${index + 1}`}
                  onClick={() => setLines(branch.lines.filter((_, i) => i !== index))}
                  size="compact"
                  variant="secondary"
                >
                  ✕
                </DsButton>
              </header>
              <div className="casualty-line-fields">
                <label>
                  <span>文本 ID</span>
                  <DsDraftTextInput
                    placeholder="文本 id（如 dlg.1208）"
                    draftKey={`${draftScope}:line:${index}:text`}
                    syncToken={syncToken}
                    value={line.text}
                    onCommit={(text) =>
                      setLines(
                        branch.lines.map((item, i) =>
                          i === index ? { ...item, text } : item,
                        ),
                      )
                    }
                    monospace
                  />
                </label>
                <div className="casualty-field">
                  <span>显示方式</span>
                  <DsSelect
                    size="compact"
                    aria-label={`第 ${index + 1} 条台词样式`}
                    value={line.style}
                    options={STYLE_OPTIONS}
                    onValueChange={(value) =>
                      setLines(
                        branch.lines.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                style: value as CasualtyBranch['lines'][number]['style'],
                              }
                            : item,
                        ),
                      )
                    }
                  />
                </div>
              </div>
              <div className="casualty-dialog-preview">
                <span>预览</span>
                <p>{line.text ? previewText(line.text, locale) : '尚未选择文本'}</p>
              </div>
            </article>
          ))}
          {branch.lines.length === 0 ? (
            <div className="casualty-empty-state">这个分支没有台词。</div>
          ) : null}
        </div>
      </section>

      <section className="casualty-content-section">
        <header>
          <div>
            <span>状态变化</span>
            <h4>效果</h4>
          </div>
          <DsButton
            onClick={() => setEffects([...branch.effects, { kind: 'heal', resource: 'hp' }])}
            size="compact"
            variant="secondary"
          >
            ＋ 效果
          </DsButton>
        </header>
        <div className="casualty-item-list">
          {branch.effects.map((effect, index) => (
            <article key={index} className="casualty-item-card casualty-effect-card">
              <header>
                <strong>效果 {index + 1}</strong>
                <DsButton
                  aria-label={`删除效果 ${index + 1}`}
                  onClick={() => setEffects(branch.effects.filter((_, i) => i !== index))}
                  size="compact"
                  variant="secondary"
                >
                  ✕
                </DsButton>
              </header>
              <div className="casualty-effect-fields">
                <div className="casualty-field">
                  <span>效果类型</span>
                  <DsSelect
                    size="compact"
                    aria-label={`第 ${index + 1} 个效果类型`}
                    value={effect.kind}
                    options={[
                      { value: 'heal', label: '恢复资源' },
                      { value: 'tempStatBuff', label: '临时属性增益' },
                    ]}
                    onValueChange={(kind) => {
                      setEffects(
                        branch.effects.map((item, i) =>
                          i === index
                            ? kind === 'heal'
                              ? { kind: 'heal', resource: 'hp' }
                              : { kind: 'tempStatBuff', stat: 'attack', percent: 10 }
                            : item,
                        ),
                      )
                    }}
                  />
                </div>
                {effect.kind === 'heal' ? (
                  <div className="casualty-field">
                    <span>恢复对象</span>
                    <DsSelect
                      size="compact"
                      aria-label={`第 ${index + 1} 个效果恢复资源`}
                      value={effect.resource}
                      options={[
                        { value: 'hp', label: '体力' },
                        { value: 'mp', label: '真气' },
                      ]}
                      onValueChange={(value) =>
                        setEffects(
                          branch.effects.map((item, i) =>
                            i === index ? { ...item, resource: value as 'hp' | 'mp' } : item,
                          ),
                        )
                      }
                    />
                  </div>
                ) : (
                  <>
                    <div className="casualty-field">
                      <span>增益属性</span>
                      <DsSelect
                        size="compact"
                        aria-label={`第 ${index + 1} 个效果增益属性`}
                        value={effect.stat}
                        options={STAT_OPTIONS}
                        onValueChange={(value) =>
                          setEffects(
                            branch.effects.map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    stat: value as (typeof STAT_OPTIONS)[number]['value'],
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                    </div>
                    <label>
                      <span>提升比例</span>
                      <span className="casualty-percent-input">
                        <DsDraftNumberInput
                          draftKey={`${draftScope}:effect:${index}:percent`}
                          syncToken={syncToken}
                          min={1}
                          step={1}
                          integer
                          normalize={(value) => Math.max(1, Math.trunc(value))}
                          value={effect.percent}
                          onCommit={(percent) => {
                            const nextPercent = Math.max(1, percent ?? 1)
                            if (nextPercent === effect.percent) return
                            setEffects(
                              branch.effects.map((item, i) =>
                                i === index
                                  ? {
                                      ...item,
                                      percent: nextPercent,
                                    }
                                  : item,
                              ),
                            )
                          }}
                        />
                        <span>%</span>
                      </span>
                    </label>
                  </>
                )}
              </div>
            </article>
          ))}
          {branch.effects.length === 0 ? (
            <div className="casualty-empty-state">这个分支没有附加效果。</div>
          ) : null}
        </div>
      </section>
    </div>
  )
}
