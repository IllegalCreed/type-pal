/**
 * 事件模式 —— 脚本查看 + 演出预览(v0)。两段式 outliner:上段选有脚本的场景,下段列该
 * 场景的脚本源;中列上「演出预览画布」(播放/单步/重置/倍速)下「命令树」(跟随高亮当前
 * 命令);右栏演出日志(桩命令)。可视化编辑是后续 C-track。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ActorDef, EntityDef, Locale, SceneDef, ScriptStage, SpriteDef } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { Playback } from '../core/playback.js'
import { PreviewCanvas } from './PreviewCanvas.js'
import { ScriptTree } from './ScriptTree.js'

interface ScriptSource {
  key: string
  label: string
  kind: 'onEnter' | 'trigger' | 'auto'
  sub: string
  stages: readonly ScriptStage[]
}

/** 收集一个场景的全部脚本源。 */
function collectSources(scene: SceneDef): ScriptSource[] {
  const out: ScriptSource[] = []
  if (scene.onEnter?.length) out.push({ key: '__onEnter__', label: '进场脚本', kind: 'onEnter', sub: `${scene.onEnter.length} 段`, stages: scene.onEnter })
  for (const e of scene.entities) {
    const page = e.pages?.[0]
    if (page?.trigger) {
      const on = page.trigger.on === 'interact' ? '交互' : '触碰'
      out.push({ key: `${e.id}:trigger`, label: e.id, kind: 'trigger', sub: `${on}触发`, stages: page.trigger.stages })
    }
    if (page?.auto) out.push({ key: `${e.id}:auto`, label: e.id, kind: 'auto', sub: '巡逻/动画', stages: page.auto.stages })
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

export function EventMode(props: {
  scenes: SceneDef[]
  locale: Locale
  initialSceneId: string
  sprites: SpriteDef[]
  actorsById: Record<string, ActorDef>
  leaderSpriteId: string | undefined
  assetBase: AssetBase
}) {
  const { scenes, locale, initialSceneId, sprites, actorsById, leaderSpriteId, assetBase } = props
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

  // 演出预览控制器:随场景重建;切场景/切源/卸载时停播丢弃演出态
  const playback = useMemo(() => (scene ? new Playback(scene) : null), [scene])
  const [, setUiTick] = useState(0)
  const prevRef = useRef<Playback | null>(null)
  useEffect(() => {
    prevRef.current?.stop()
    prevRef.current = playback
    if (playback) playback.onUi = () => setUiTick((x) => x + 1) // 低频 UI:高亮/对话/日志/mode
    return () => playback?.stop()
  }, [playback])
  // 切脚本源:停播(演出态归当前源)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 仅在源切换时停播
  useEffect(() => {
    playback?.stop()
  }, [active?.key])

  // 预览/命令树 高度比(拖分隔条调;夹 15%~85%)
  const [previewFrac, setPreviewFrac] = useState(0.46)
  const centerRef = useRef<HTMLDivElement>(null)
  const onSplitDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.preventDefault()
    const el = centerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const move = (ev: PointerEvent): void => {
      const frac = (ev.clientY - rect.top - 34) / Math.max(1, rect.height - 34) // 34 ≈ 顶部 toolbar
      setPreviewFrac(Math.min(0.85, Math.max(0.15, frac)))
    }
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <>
      {/* 左:场景列表(上段)+ 脚本源列表(下段)—— 两段式,源垂直排不挤 */}
      <div className="outliner event-outliner">
        <div className="pane-h"><span className="t">有脚本的场景</span><span className="spacer" /><span className="k">{scriptedScenes.length}</span></div>
        <input className="in" placeholder="过滤场景 id…" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ margin: '0 8px 6px' }} />
        <div className="scene-list">
          {shown.map(({ scene: s, n }) => (
            <button key={s.id} className={`node${s.id === sceneId ? ' sel' : ''}`} onClick={() => { setSceneId(s.id); setSrcKey(null) }}>
              <span className="ico">🗺️</span><span>{s.id}</span><span className="k">{n}</span>
            </button>
          ))}
        </div>
        <div className="src-section">
          <div className="pane-h sub"><span className="t">{sceneId} · 脚本源</span><span className="spacer" /><span className="k">{sources.length}</span></div>
          <div className="src-list">
            {sources.map((s) => (
              <button key={s.key} className={`src-item${active?.key === s.key ? ' sel' : ''}`} onClick={() => setSrcKey(s.key)}>
                <span className="src-ico">{ICON[s.kind]}</span>
                <span className="src-label">{s.label}</span>
                <span className="src-sub">{s.sub}</span>
              </button>
            ))}
            {sources.length === 0 ? <div className="script-empty">此场景无脚本源。</div> : null}
          </div>
        </div>
      </div>

      {/* 中:上演出预览 + 拖拽分隔 + 下命令树(跟随高亮) */}
      <div className="center event-center" ref={centerRef}>
        <div className="toolbar">
          <span style={{ fontWeight: 600 }}>{active ? `${ICON[active.kind]} ${active.label}` : sceneId}</span>
          {active ? <span className="src-sub" style={{ marginLeft: 6 }}>{active.sub}</span> : null}
          <span className="spacer" />
          <span style={{ color: 'var(--faint)', fontSize: 11 }}>树只读 · 预览可播</span>
        </div>
        {scene && active && playback ? (
          <>
            <div style={{ flex: `0 0 ${(previewFrac * 100).toFixed(1)}%`, display: 'flex', minHeight: 120 }}>
              <PreviewCanvas
                scene={scene}
                stages={active.stages}
                sourceKey={active.key}
                sprites={sprites}
                actorsById={actorsById}
                leaderSpriteId={leaderSpriteId}
                assetBase={assetBase}
                locale={locale}
                playback={playback}
              />
            </div>
            <div className="v-split" onPointerDown={onSplitDown} title="拖动调节预览/命令树高度" />
          </>
        ) : null}
        <div className="script-view">
          {active ? (
            <ScriptTree stages={active.stages} locale={locale} activePath={playback?.activePath ?? null} />
          ) : (
            <div className="insp-empty">此场景无脚本源。</div>
          )}
        </div>
      </div>

      {/* 右:演出日志 + 说明 */}
      <div className="inspector">
        <div className="insp-head"><div className="what">事件 · 脚本 + 预览</div><div className="who">{active ? `${active.label} · ${active.sub}` : '—'}</div></div>
        {playback && playback.view.logs.length > 0 ? (
          <div className="section">
            <h4>演出日志(桩命令)</h4>
            <div className="pv-logs">
              {playback.view.logs.slice(-40).map((l, i) => (
                <div key={i} className="pv-log">{l}</div>
              ))}
            </div>
          </div>
        ) : null}
        <div className="section">
          <h4>演出预览</h4>
          <p className="hint">
            ▶ 从头播当前脚本源;⏭ 单步 = 执行下一条命令(树中高亮);对话点「继续」推进。
            走位/显隐/朝向/换装/淡幕真演,音乐/战斗/商店等落右侧日志。演出态是临时副本,重置即丢,不改场景数据。
          </p>
          <p className="hint"><span className="warn-inline">⚠ 黄色</span> = 未翻译（逃生口，多为战斗侧 op，归 M4）。</p>
        </div>
        {active && active.stages.length > 1 ? (
          <div className="section">
            <h4>多段触发</h4>
            <p className="hint">{active.stages.length} 段:原版「再按一次继续下一段」的结构化版。v0 预览播第 1 段。</p>
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
