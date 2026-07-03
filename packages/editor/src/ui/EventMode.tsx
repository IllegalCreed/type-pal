/**
 * 事件模式 —— 脚本查看器（只读）。选场景 → 列该场景的脚本源(进场 + 有触发/巡逻的实体)
 * → 渲染命令树。M3 解锁的验证眼睛;可视化编辑是后续 C-track。
 */
import { useMemo, useState } from 'react'
import type { EntityDef, Locale, SceneDef, ScriptStage } from '@type-pal/content'
import { ScriptTree } from './ScriptTree.js'

interface ScriptSource {
  key: string
  label: string
  kind: 'onEnter' | 'trigger' | 'auto'
  stages: readonly ScriptStage[]
}

/** 收集一个场景的全部脚本源。 */
function collectSources(scene: SceneDef): ScriptSource[] {
  const out: ScriptSource[] = []
  if (scene.onEnter?.length) out.push({ key: '__onEnter__', label: '进场脚本', kind: 'onEnter', stages: scene.onEnter })
  for (const e of scene.entities) {
    const page = e.pages?.[0]
    if (page?.trigger) {
      const on = page.trigger.on === 'interact' ? '交互' : '触碰'
      out.push({ key: `${e.id}:trigger`, label: `${e.id} · ${on}触发`, kind: 'trigger', stages: page.trigger.stages })
    }
    if (page?.auto) out.push({ key: `${e.id}:auto`, label: `${e.id} · 巡逻/动画`, kind: 'auto', stages: page.auto.stages })
  }
  return out
}

/** 统计一个场景的脚本源数(outliner 徽标)。 */
function sourceCount(scene: SceneDef): number {
  let n = scene.onEnter?.length ? 1 : 0
  for (const e of scene.entities) {
    const p = e.pages?.[0]
    if (p?.trigger) n++
    if (p?.auto) n++
  }
  return n
}

const ICON: Record<ScriptSource['kind'], string> = { onEnter: '🚩', trigger: '🔗', auto: '🔁' }

export function EventMode(props: { scenes: SceneDef[]; locale: Locale; initialSceneId: string }) {
  const { scenes, locale, initialSceneId } = props
  const [sceneId, setSceneId] = useState(initialSceneId)
  const [filter, setFilter] = useState('')
  const [srcKey, setSrcKey] = useState<string | null>(null)

  // 只列有脚本的场景(验证眼睛:空场景无意义)
  const scriptedScenes = useMemo(
    () => scenes.map((s) => ({ scene: s, n: sourceCount(s) })).filter((x) => x.n > 0),
    [scenes],
  )
  const shown = useMemo(
    () => scriptedScenes.filter((x) => !filter || x.scene.id.includes(filter)),
    [scriptedScenes, filter],
  )
  const scene = scenes.find((s) => s.id === sceneId)
  const sources = useMemo(() => (scene ? collectSources(scene) : []), [scene])
  const active = sources.find((s) => s.key === srcKey) ?? sources[0]

  return (
    <>
      {/* 场景清单(左) */}
      <div className="outliner">
        <div className="pane-h"><span className="t">有脚本的场景</span><span className="spacer" /><span className="k">{scriptedScenes.length}</span></div>
        <input className="in" placeholder="过滤场景 id…" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ margin: '0 8px 8px' }} />
        <div className="tree">
          {shown.map(({ scene: s, n }) => (
            <button key={s.id} className={`node${s.id === sceneId ? ' sel' : ''}`} onClick={() => { setSceneId(s.id); setSrcKey(null) }}>
              <span className="ico">🗺️</span><span>{s.id}</span><span className="k">{n}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 脚本源 + 命令树(中) */}
      <div className="center event-center">
        <div className="toolbar">
          <span style={{ fontWeight: 600 }}>{sceneId}</span>
          <span className="sep" />
          {sources.map((s) => (
            <button key={s.key} className={`tool${active?.key === s.key ? ' active' : ''}`} onClick={() => setSrcKey(s.key)} title={s.label}>
              {ICON[s.kind]} {s.label}
            </button>
          ))}
          <span className="spacer" />
          <span style={{ color: 'var(--faint)', fontSize: 11 }}>只读 · 验证眼睛</span>
        </div>
        <div className="script-view">
          {active ? <ScriptTree stages={active.stages} locale={locale} /> : <div className="insp-empty">此场景无脚本源。</div>}
        </div>
      </div>

      {/* 说明(右) */}
      <div className="inspector">
        <div className="insp-head"><div className="what">事件 · 脚本查看</div><div className="who">{active?.label ?? '—'}</div></div>
        <div className="section">
          <h4>这是什么</h4>
          <p style={{ fontSize: 12, color: 'var(--faint)', lineHeight: 1.6 }}>
            原版 bytecode 经迁移器翻译成的结构化剧情脚本，渲成可读的中文命令树。
            一眼核对迁移得对不对:对话/传送/给物/走位/分支/立绘。
          </p>
          <p style={{ fontSize: 12, color: 'var(--faint)', lineHeight: 1.6 }}>
            <span className="warn-inline">⚠ 黄色</span> = 未翻译（逃生口，多为战斗侧 op，归 M4）。
          </p>
        </div>
        {active && active.stages.length > 1 ? (
          <div className="section">
            <h4>多段触发</h4>
            <p style={{ fontSize: 12, color: 'var(--faint)', lineHeight: 1.6 }}>
              {active.stages.length} 段:原版「再按一次继续下一段」（宝箱/多阶段对话）的结构化版。
            </p>
          </div>
        ) : null}
      </div>
    </>
  )
}

/** 供 App 判断实体是否有脚本(布置模式 outliner 加徽标可选用)。 */
export function entityHasScript(e: EntityDef): boolean {
  const p = e.pages?.[0]
  return Boolean(p?.trigger || p?.auto)
}
