/**
 * 编辑器外壳(B1.1)——五区布局(顶栏 | 模式栏 | Outliner | 工具栏+画布 | Inspector | 状态条)。
 * 布局/IA 照 docs/phase2/editor/mockups/place-mode.html 定稿。
 *
 * 状态源:EditSession(useSyncExternalStore 订阅)。选中态是 UI 局部 state。
 * B1.1:壳 + 画布渲染 + Outliner 点选 → Inspector 显属性(只读)。编辑/工具/保存留 B1.2–1.4。
 */
import { useMemo, useState, useSyncExternalStore } from 'react'
import type { LoadedProject } from '@type-pal/reforge'
import { validateReferences } from '@type-pal/content'
import type { EntityDef, SceneDef } from '@type-pal/content'
import type { EditSession, EditorState } from '../core/edit-session.js'
import { SceneCanvas } from './SceneCanvas.js'

const SCENE_NODE = '__scene__'

export function App(props: { session: EditSession; project: LoadedProject }): React.JSX.Element {
  const { session, project } = props
  const subscribe = useMemo(() => (cb: () => void) => session.subscribe(cb), [session])
  const getSnapshot = useMemo(() => () => session.getState(), [session])
  const state = useSyncExternalStore(subscribe, getSnapshot)
  const [selected, setSelected] = useState<string>(SCENE_NODE)

  const scene = state.scenes.find((s) => s.id === state.manifest.entryScene)
  const issues = useMemo(() => validateReferences(state), [state])

  if (!scene) {
    return <div className="boot"><div className="err">入口场景 "{state.manifest.entryScene}" 不在 scenes</div></div>
  }
  const selEntity = scene.entities.find((e) => e.id === selected)

  return (
    <div className="editor">
      {/* 顶栏 */}
      <div className="topbar">
        <div className="proj">{state.manifest.name}<span className="kind">{state.manifest.id}</span></div>
        <div className="spacer" />
        <button className="tbtn" disabled={!session.canUndo()} onClick={() => session.undo()} title="撤销">↶</button>
        <button className="tbtn" disabled={!session.canRedo()} onClick={() => session.redo()} title="重做">↷</button>
        <button className="save" disabled={!session.isDirty()} title="保存(B1.4)">💾 保存{session.isDirty() ? <span className="dot">●</span> : null}</button>
      </div>

      <div className="body">
        {/* 模式 rail */}
        <div className="rail">
          <button className="mode active"><span className="ico">📍</span><span className="lbl">布置</span></button>
          <div className="mode soon"><span className="ico">🗺️</span><span className="lbl">地图</span></div>
          <div className="mode soon"><span className="ico">💬</span><span className="lbl">事件</span></div>
          <div className="mode soon"><span className="ico">📊</span><span className="lbl">数据</span></div>
        </div>

        {/* Outliner */}
        <div className="outliner">
          <div className="pane-h"><span className="t">场景</span><span className="spacer" /><button className="mini" title="添加实体(B1.3)">＋</button></div>
          <div className="tree">
            <button className={`node${selected === SCENE_NODE ? ' sel' : ''}`} onClick={() => setSelected(SCENE_NODE)}>
              <span className="ico">🗺️</span><span>{scene.id}</span>
            </button>
            <div className="node child"><span className="ico">📍</span><span>进场点</span></div>
            {scene.entities.map((e) => (
              <button key={e.id} className={`node child${selected === e.id ? ' sel' : ''}`} onClick={() => setSelected(e.id)}>
                <span className="ico">👤</span><span>{e.id}</span><span className="k">{e.sprite}</span>
              </button>
            ))}
          </div>
          <div className="layers">
            <div className="t">图层 / 显隐</div>
            <label className="lrow"><input type="checkbox" defaultChecked /> 地板</label>
            <label className="lrow"><input type="checkbox" defaultChecked /> 高物(墙·家具)</label>
            <label className="lrow"><input type="checkbox" defaultChecked /> 实体</label>
          </div>
        </div>

        {/* 中:工具栏 + 画布 */}
        <div className="center">
          <div className="toolbar">
            <button className="tool active" title="选择/移动(B1.2)">↖ 选择/移动</button>
            <button className="tool" title="添加实体(B1.3)">＋ 添加实体</button>
            <button className="tool" title="删除(B1.3)">🗑 删除</button>
            <span className="sep" />
            <label className="vtog on"><input type="checkbox" defaultChecked /> 网格</label>
            <label className="vtog"><input type="checkbox" /> 禁入</label>
            <span className="spacer" />
            <span className="canvas-note" style={{ position: 'static', background: 'none' }}>B1.1 · 静态渲染</span>
          </div>
          <SceneCanvas scene={scene} sprites={state.sprites} assetBase={project.assetBase} />
        </div>

        {/* Inspector */}
        <div className="inspector">
          {selEntity ? <EntityInspector entity={selEntity} /> : <SceneInspector scene={scene} />}
        </div>
      </div>

      {/* 状态条 */}
      <div className="valbar">
        {issues.length > 0
          ? <>
              <span className="pill warn">⚠ {issues.length} 问题</span>
              <span className="msg">{issues.slice(0, 2).map((i) => i.message).join(' · ')}</span>
            </>
          : <span className="pill" style={{ color: 'var(--ok)' }}>✓ 引用完整性 OK</span>}
        <span className="spacer" />
        <span style={{ color: 'var(--faint)', fontSize: 11 }}>B1.1 地基就位</span>
      </div>
    </div>
  )
}

function EntityInspector({ entity }: { entity: EntityDef }): React.JSX.Element {
  return (
    <>
      <div className="insp-head"><div className="what">选中实体</div><div className="who">{entity.id}</div></div>
      <div className="section">
        <h4>外观 / 交互</h4>
        <div className="field"><label>精灵</label><input className="in" value={entity.sprite} readOnly /></div>
        <div className="field"><label>碰撞</label><div><input type="checkbox" checked={entity.collide === true} readOnly /> 阻挡通行</div></div>
        <div className="field"><label>交互对话</label><input className="in" value={entity.interact ?? ''} readOnly /></div>
      </div>
      <div className="section">
        <h4>位置<span className="b2"> · 菱形轴</span></h4>
        <div className="posrow">
          <div className="cell"><span>col</span><input className="in mono" value={entity.pos.col} readOnly /></div>
          <div className="cell"><span>row</span><input className="in mono" value={entity.pos.row} readOnly /></div>
          <div className="cell"><span>height</span><input className="in mono" value={entity.pos.height} readOnly /></div>
        </div>
      </div>
      <div className="section"><div className="collapsed">▸ 状态 / 条件 <span style={{ color: 'var(--faint)' }}>(多状态·巡逻 — B2)</span></div></div>
      <div className="insp-empty">B1.1 只读;改字段/拖动 = B1.2。</div>
    </>
  )
}

function SceneInspector({ scene }: { scene: SceneDef }): React.JSX.Element {
  return (
    <>
      <div className="insp-head"><div className="what">选中场景</div><div className="who">{scene.id}</div></div>
      <div className="section">
        <h4>场景</h4>
        <div className="field"><label>进场点</label><input className="in mono" value={`col ${scene.entry.pos.col} · row ${scene.entry.pos.row} · ${scene.entry.facing}`} readOnly /></div>
        <div className="field"><label>地图</label><input className="in mono" value={`reuseOriginalMap ${scene.map.reuseOriginalMap}`} readOnly /></div>
        <div className="field"><label>调色板</label><input className="in mono" value={scene.paletteId ?? 0} readOnly /></div>
      </div>
      <div className="insp-empty">点左侧实体看/编它的属性。</div>
    </>
  )
}
