/**
 * 编辑器外壳。B1.1 壳/渲染 · B1.2 选中/编辑 · B1.3 工具(拖动/添加/删除)。
 * 五区布局照 docs/phase2/editor/mockups/place-mode.html 定稿。
 *
 * 状态源:EditSession(useSyncExternalStore)。选中/工具是 UI 局部 state。
 * 一切编辑走 dispatch(Command) → 自动 undo/redo + 置脏 + 重渲染。
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { LoadedProject } from '@type-pal/reforge'
import { isActorEntity, resolveEntitySpriteId, validateReferences } from '@type-pal/content'
import type { ActorDef, EntityDef, GridPos, SceneDef } from '@type-pal/content'
import type { EditSession } from '../core/edit-session.js'
import { AddEntityCommand, DeleteEntityCommand, MoveEntityCommand, UpdateEntityCommand, UpdateSceneCommand } from '../core/commands.js'
import { serializeProject, writeProject } from '../core/project-io.js'
import { ActorMode } from './ActorMode.js'
import { DataMode } from './DataMode.js'
import { EventMode } from './EventMode.js'
import { SceneCanvas, type Tool } from './SceneCanvas.js'

const SCENE_NODE = '__scene__'
type Mode = 'place' | 'actor' | 'event' | 'data'

function newEntityId(existing: EntityDef[]): string {
  const ids = new Set(existing.map((e) => e.id))
  let n = 1
  while (ids.has(`entity-${n}`)) n++
  return `entity-${n}`
}

export function App(props: { session: EditSession; project: LoadedProject }) {
  const { session, project } = props
  const subscribe = useMemo(() => (cb: () => void) => session.subscribe(cb), [session])
  const getVersion = useMemo(() => () => session.getVersion(), [session])
  useSyncExternalStore(subscribe, getVersion) // 任一变化(含 markSaved / undo)都重渲染
  const state = session.getState()
  const [selected, setSelected] = useState<string>(SCENE_NODE)
  const [tool, setTool] = useState<Tool>('select')
  const [mode, setMode] = useState<Mode>('place')
  const [placeSceneId, setPlaceSceneId] = useState<string>(state.manifest.entryScene)
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null)
  const [saveErr, setSaveErr] = useState('')

  // 布置模式当前编辑场景(可切;默认入口)。切场景重置选中 —— 实体属于场景。
  const scene = state.scenes.find((s) => s.id === placeSceneId) ?? state.scenes.find((s) => s.id === state.manifest.entryScene)
  const switchPlaceScene = (id: string): void => {
    setPlaceSceneId(id)
    setSelected(SCENE_NODE)
    setTool('select')
  }
  const issues = useMemo(() => validateReferences(state), [state])
  // C0:实体经 actor⊕sprite 解析;玩家精灵 = party[0] → ActorDef.spriteId(与引擎同路径)
  const actorsById = useMemo(
    () => Object.fromEntries(state.actors.map((a) => [a.id, a])) as Record<string, ActorDef>,
    [state.actors],
  )
  const leaderSpriteId = actorsById[state.manifest.startWorld.party[0] ?? '']?.spriteId

  const selEntity = scene?.entities.find((e) => e.id === selected)

  // 删除键:选中实体时删(在输入框里打字不触发)。
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement | null
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')
      if ((e.key === 'Delete' || e.key === 'Backspace') && selEntity && scene && !typing) {
        e.preventDefault()
        session.dispatch(new DeleteEntityCommand(scene.id, selEntity.id))
        setSelected(SCENE_NODE)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [session, scene, selEntity])

  if (!scene) {
    return <div className="boot"><div className="err">入口场景 "{state.manifest.entryScene}" 不在 scenes</div></div>
  }

  const moveEntity = (id: string, cell: { col: number; row: number }): void => {
    const ent = scene.entities.find((e) => e.id === id)
    if (ent) session.dispatch(new MoveEntityCommand(scene.id, id, { col: cell.col, row: cell.row, height: ent.pos.height }))
  }
  const addAt = (cell: { col: number; row: number }): void => {
    const id = newEntityId(scene.entities)
    const sprite = state.sprites[0]?.id ?? ''
    session.dispatch(new AddEntityCommand(scene.id, { id, pos: { col: cell.col, row: cell.row, height: 0 }, sprite }))
    setSelected(id)
    setTool('select')
  }
  const deleteSelected = (): void => {
    if (!selEntity) return
    session.dispatch(new DeleteEntityCommand(scene.id, selEntity.id))
    setSelected(SCENE_NODE)
  }
  // 保存:File System Access。首次弹选文件夹(选工程根 projects/<id>/),之后复用句柄。
  const save = async (): Promise<void> => {
    try {
      let dir = dirHandleRef.current
      if (!dir) {
        dir = await window.showDirectoryPicker({ mode: 'readwrite' })
        dirHandleRef.current = dir
      }
      await writeProject(dir, serializeProject(session.getState()))
      session.markSaved()
      setSaveErr('')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return // 用户取消选择器
      setSaveErr(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="editor">
      <div className="topbar">
        <div className="proj">{state.manifest.name}<span className="kind">{state.manifest.id}</span></div>
        <div className="spacer" />
        <button className="tbtn" disabled={!session.canUndo()} onClick={() => session.undo()} title="撤销">↶</button>
        <button className="tbtn" disabled={!session.canRedo()} onClick={() => session.redo()} title="重做">↷</button>
        <button className="save" disabled={!session.isDirty()} onClick={() => void save()} title="保存到 projects/<id>/(首次选工程文件夹)">💾 保存{session.isDirty() ? <span className="dot">●</span> : null}</button>
      </div>

      <div className="body">
        <div className="rail">
          <button className={`mode${mode === 'place' ? ' active' : ''}`} onClick={() => setMode('place')}><span className="ico">📍</span><span className="lbl">布置</span></button>
          <button className={`mode${mode === 'actor' ? ' active' : ''}`} onClick={() => setMode('actor')}><span className="ico">👥</span><span className="lbl">角色</span></button>
          <div className="mode soon"><span className="ico">🗺️</span><span className="lbl">地图</span></div>
          <button className={`mode${mode === 'event' ? ' active' : ''}`} onClick={() => setMode('event')}><span className="ico">💬</span><span className="lbl">事件</span></button>
          <button className={`mode${mode === 'data' ? ' active' : ''}`} onClick={() => setMode('data')}><span className="ico">📊</span><span className="lbl">数据</span></button>
        </div>

        {mode === 'actor' ? (
          <ActorMode actors={state.actors} sprites={state.sprites} items={Object.fromEntries(state.items.map((i) => [i.id, i]))} skills={Object.fromEntries(state.skills.map((sk) => [sk.id, sk]))} locale={state.locale} assetBase={project.assetBase} session={session} />
        ) : mode === 'data' ? (
          <DataMode sprites={state.sprites} skills={Object.fromEntries(state.skills.map((sk) => [sk.id, sk]))} items={Object.fromEntries(state.items.map((i) => [i.id, i]))} locale={state.locale} assetBase={project.assetBase} session={session} />
        ) : mode === 'event' ? (
          <EventMode
            scenes={state.scenes}
            locale={state.locale}
            initialSceneId={scene.id}
            sprites={state.sprites}
            actorsById={actorsById}
            leaderSpriteId={leaderSpriteId}
            assetBase={project.assetBase}
          />
        ) : (
        <>
        <div className="outliner">
          <div className="pane-h"><span className="t">场景</span><span className="spacer" />
            <button className="mini" title="在进场点添加实体" onClick={() => addAt({ col: scene.entry.pos.col, row: scene.entry.pos.row })}>＋</button>
          </div>
          <select className="in scene-switch" value={placeSceneId} onChange={(e) => switchPlaceScene(e.target.value)} title="切换编辑场景">
            {state.scenes.map((s) => (
              <option key={s.id} value={s.id}>{s.id}{s.id === state.manifest.entryScene ? '(入口)' : ''} · {s.entities.length} 实体</option>
            ))}
          </select>
          <div className="tree">
            <button className={`node${selected === SCENE_NODE ? ' sel' : ''}`} onClick={() => setSelected(SCENE_NODE)}>
              <span className="ico">🗺️</span><span>{scene.id}</span>
            </button>
            <div className="node child"><span className="ico">📍</span><span>进场点</span></div>
            {scene.entities.map((e) => (
              <button key={e.id} className={`node child${selected === e.id ? ' sel' : ''}`} onClick={() => setSelected(e.id)}>
                <span className="ico">{isActorEntity(e) ? '👤' : 'sprite' in e ? '📦' : '⬚'}</span><span>{e.id}</span>
                <span className="k">{isActorEntity(e) ? e.actor : 'sprite' in e ? e.sprite : 'zone'}</span>
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
            <button className={`tool${tool === 'select' ? ' active' : ''}`} onClick={() => setTool('select')} title="选择 / 拖动移位">↖ 选择/移动</button>
            <button className={`tool${tool === 'add' ? ' active' : ''}`} onClick={() => setTool('add')} title="点画布放新实体">＋ 添加实体</button>
            <button className="tool" onClick={deleteSelected} disabled={!selEntity} title="删除选中(Del)">🗑 删除</button>
            <span className="sep" />
            <label className="vtog on"><input type="checkbox" defaultChecked /> 网格</label>
            <label className="vtog"><input type="checkbox" /> 禁入</label>
            <span className="spacer" />
            <span style={{ color: 'var(--faint)', fontSize: 11 }}>{tool === 'add' ? '点画布放实体' : '拖动移位 · Del 删除'}</span>
          </div>
          <SceneCanvas
            scene={scene}
            sprites={state.sprites}
            actorsById={actorsById}
            leaderSpriteId={leaderSpriteId}
            assetBase={project.assetBase}
            selectedId={selEntity ? selected : null}
            tool={tool}
            onSelect={(id) => setSelected(id ?? SCENE_NODE)}
            onMoveEntity={moveEntity}
            onAddAt={addAt}
          />
        </div>

        <div className="inspector">
          {selEntity
            ? <EntityInspector entity={selEntity} session={session} sceneId={scene.id} actorsById={actorsById} dialogueIds={scene.dialogues.map((d) => d.id)} onDelete={deleteSelected} />
            : <SceneInspector scene={scene} session={session} />}
        </div>
        </>
        )}
      </div>

      <div className="valbar">
        {issues.length > 0
          ? <>
              <span className="pill warn">⚠ {issues.length} 问题</span>
              <span className="msg">{issues.slice(0, 2).map((i) => i.message).join(' · ')}</span>
            </>
          : <span className="pill" style={{ color: 'var(--ok)' }}>✓ 引用完整性 OK</span>}
        <span className="spacer" />
        <span style={{ color: saveErr ? 'var(--err)' : 'var(--faint)', fontSize: 11 }}>
          {saveErr ? `保存失败: ${saveErr}` : session.isDirty() ? '未保存改动' : '已保存'}
        </span>
      </div>
    </div>
  )
}

function EntityInspector(props: {
  entity: EntityDef
  session: EditSession
  sceneId: string
  actorsById: Record<string, ActorDef>
  dialogueIds: string[]
  onDelete: () => void
}) {
  const { entity, session, sceneId, actorsById, dialogueIds, onDelete } = props
  const setPos = (patch: Partial<GridPos>): void => {
    session.dispatch(new MoveEntityCommand(sceneId, entity.id, { ...entity.pos, ...patch }))
  }
  const spriteId = resolveEntitySpriteId(entity, actorsById)
  return (
    <>
      <div className="insp-head"><div className="what">选中实体</div><div className="who">{entity.id}</div></div>
      <div className="section">
        <h4>外观 / 交互</h4>
        {/* C0:实体引用只读展示(actor⊕sprite);切换引用/朝向编辑 = C1 角色模式一并做 */}
        {isActorEntity(entity)
          ? <div className="field"><label>角色</label>
              <div className="in pick"><span>{entity.actor}</span><span className="meta">→ {spriteId ?? '(未解析)'}</span></div>
            </div>
          : 'sprite' in entity
            ? <div className="field"><label>精灵</label>
                <div className="in pick"><span>{entity.sprite}</span><span className="meta">prop</span></div>
              </div>
            : <div className="field"><label>触发区</label>
                <div className="in pick"><span>zone</span><span className="meta">隐形(门/脚本锚)</span></div>
              </div>}
        <div className="field"><label>朝向</label>
          <div className="in pick"><span>{entity.facing ?? 'down'}</span><span className="meta">C1 可编</span></div>
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
      <div className="section" style={{ borderBottom: 0 }}>
        <button className="tool" style={{ color: 'var(--err)' }} onClick={onDelete}>🗑 删除此实体</button>
      </div>
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
      <div className="insp-empty">点左侧实体 / 画布上的实体,看编它的属性。工具栏「+ 添加实体」→ 点画布放。</div>
    </>
  )
}
