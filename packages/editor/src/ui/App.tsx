/**
 * 编辑器外壳(B1.1 壳/渲染 + B1.2 选中/编辑)。
 * 五区布局照 docs/phase2/editor/mockups/place-mode.html 定稿。
 *
 * 状态源:EditSession(useSyncExternalStore)。选中态是 UI 局部 state,画布点选与 Outliner 点选同步。
 * 编辑:Inspector 改字段 → dispatch(Command) → 自动 undo/redo + 置脏 + 重渲染。
 */
import { useMemo, useState, useSyncExternalStore } from 'react'
import type { LoadedProject } from '@type-pal/reforge'
import { validateReferences } from '@type-pal/content'
import type { EntityDef, GridPos, SceneDef, SpriteDef } from '@type-pal/content'
import type { EditSession, EditorState } from '../core/edit-session.js'
import { MoveEntityCommand, UpdateEntityCommand, UpdateSceneCommand } from '../core/commands.js'
import { SceneCanvas } from './SceneCanvas.js'

const SCENE_NODE = '__scene__'

export function App(props: { session: EditSession; project: LoadedProject }) {
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
      <div className="topbar">
        <div className="proj">{state.manifest.name}<span className="kind">{state.manifest.id}</span></div>
        <div className="spacer" />
        <button className="tbtn" disabled={!session.canUndo()} onClick={() => session.undo()} title="撤销">↶</button>
        <button className="tbtn" disabled={!session.canRedo()} onClick={() => session.redo()} title="重做">↷</button>
        <button className="save" disabled={!session.isDirty()} title="保存(B1.4)">💾 保存{session.isDirty() ? <span className="dot">●</span> : null}</button>
      </div>

      <div className="body">
        <div className="rail">
          <button className="mode active"><span className="ico">📍</span><span className="lbl">布置</span></button>
          <div className="mode soon"><span className="ico">🗺️</span><span className="lbl">地图</span></div>
          <div className="mode soon"><span className="ico">💬</span><span className="lbl">事件</span></div>
          <div className="mode soon"><span className="ico">📊</span><span className="lbl">数据</span></div>
        </div>

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

        <div className="center">
          <div className="toolbar">
            <button className="tool active" title="选择/移动">↖ 选择/移动</button>
            <button className="tool" title="添加实体(B1.3)">＋ 添加实体</button>
            <button className="tool" title="删除(B1.3)">🗑 删除</button>
            <span className="sep" />
            <label className="vtog on"><input type="checkbox" defaultChecked /> 网格</label>
            <label className="vtog"><input type="checkbox" /> 禁入</label>
            <span className="spacer" />
            <span style={{ color: 'var(--faint)', fontSize: 11 }}>B1.2 · 点选 + 编辑</span>
          </div>
          <SceneCanvas
            scene={scene}
            sprites={state.sprites}
            assetBase={project.assetBase}
            selectedId={selEntity ? selected : null}
            onSelect={(id) => setSelected(id ?? SCENE_NODE)}
          />
        </div>

        <div className="inspector">
          {selEntity
            ? <EntityInspector entity={selEntity} session={session} sceneId={scene.id} sprites={state.sprites} dialogueIds={scene.dialogues.map((d) => d.id)} />
            : <SceneInspector scene={scene} session={session} />}
        </div>
      </div>

      <div className="valbar">
        {issues.length > 0
          ? <>
              <span className="pill warn">⚠ {issues.length} 问题</span>
              <span className="msg">{issues.slice(0, 2).map((i) => i.message).join(' · ')}</span>
            </>
          : <span className="pill" style={{ color: 'var(--ok)' }}>✓ 引用完整性 OK</span>}
        <span className="spacer" />
        <span style={{ color: 'var(--faint)', fontSize: 11 }}>{session.isDirty() ? '未保存改动' : 'B1.2'}</span>
      </div>
    </div>
  )
}

function EntityInspector(props: {
  entity: EntityDef
  session: EditSession
  sceneId: string
  sprites: SpriteDef[]
  dialogueIds: string[]
}) {
  const { entity, session, sceneId, sprites, dialogueIds } = props
  const setPos = (patch: Partial<GridPos>): void => {
    session.dispatch(new MoveEntityCommand(sceneId, entity.id, { ...entity.pos, ...patch }))
  }
  return (
    <>
      <div className="insp-head"><div className="what">选中实体</div><div className="who">{entity.id}</div></div>
      <div className="section">
        <h4>外观 / 交互</h4>
        <div className="field"><label>精灵</label>
          <select className="in" value={entity.sprite}
            onChange={(e) => session.dispatch(new UpdateEntityCommand(sceneId, entity.id, { sprite: e.target.value }))}>
            {sprites.some((s) => s.id === entity.sprite) ? null : <option value={entity.sprite}>{entity.sprite}(缺)</option>}
            {sprites.map((s) => <option key={s.id} value={s.id}>{s.label}(#{s.spriteNum})</option>)}
          </select>
        </div>
        <div className="field"><label>碰撞</label>
          <div><input type="checkbox" checked={entity.collide === true}
            onChange={(e) => session.dispatch(new UpdateEntityCommand(sceneId, entity.id, { collide: e.target.checked }))} /> 阻挡通行</div>
        </div>
        <div className="field"><label>交互对话</label>
          <select className="in" value={entity.interact ?? ''}
            onChange={(e) => session.dispatch(new UpdateEntityCommand(sceneId, entity.id, { interact: e.target.value || undefined }))}>
            <option value="">(无)</option>
            {dialogueIds.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <div className="section">
        <h4>位置<span className="b2"> · 菱形轴</span></h4>
        <div className="posrow">
          <div className="cell"><span>col</span><input className="in mono" type="number" value={entity.pos.col}
            onChange={(e) => Number.isFinite(e.target.valueAsNumber) && setPos({ col: e.target.valueAsNumber })} /></div>
          <div className="cell"><span>row</span><input className="in mono" type="number" value={entity.pos.row}
            onChange={(e) => Number.isFinite(e.target.valueAsNumber) && setPos({ row: e.target.valueAsNumber })} /></div>
          <div className="cell"><span>height</span><input className="in mono" type="number" value={entity.pos.height}
            onChange={(e) => Number.isFinite(e.target.valueAsNumber) && setPos({ height: e.target.valueAsNumber })} /></div>
        </div>
      </div>
      <div className="section"><div className="collapsed">▸ 状态 / 条件 <span style={{ color: 'var(--faint)' }}>(多状态·巡逻 — B2)</span></div></div>
    </>
  )
}

function SceneInspector(props: { scene: SceneDef; session: EditSession }) {
  const { scene, session } = props
  const facings: SceneDef['entry']['facing'][] = ['down', 'up', 'left', 'right']
  return (
    <>
      <div className="insp-head"><div className="what">选中场景</div><div className="who">{scene.id}</div></div>
      <div className="section">
        <h4>场景</h4>
        <div className="field"><label>地图</label><input className="in mono" value={`reuseOriginalMap ${scene.map.reuseOriginalMap}`} readOnly /></div>
        <div className="field"><label>调色板</label>
          <input className="in mono" type="number" value={scene.paletteId ?? 0}
            onChange={(e) => Number.isFinite(e.target.valueAsNumber) && session.dispatch(new UpdateSceneCommand(scene.id, { paletteId: e.target.valueAsNumber }))} />
        </div>
        <div className="field"><label>进场朝向</label>
          <select className="in" value={scene.entry.facing}
            onChange={(e) => session.dispatch(new UpdateSceneCommand(scene.id, { entry: { ...scene.entry, facing: e.target.value as SceneDef['entry']['facing'] } }))}>
            {facings.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </div>
      <div className="insp-empty">点左侧实体 / 画布上的实体,看编它的属性。</div>
    </>
  )
}
