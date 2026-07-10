/**
 * 编辑器外壳。B1.1 壳/渲染 · B1.2 选中/编辑 · B1.3 工具(拖动/添加/删除)。
 * 五区布局照 docs/phase2/editor/mockups/place-mode.html 定稿。
 *
 * 状态源:EditSession(useSyncExternalStore)。选中/工具是 UI 局部 state。
 * 一切编辑走 dispatch(Command) → 自动 undo/redo + 置脏 + 重渲染。
 */

import type {
  ActorDef,
  EnemyTeamDef,
  EntityDef,
  GridPos,
  HostileBehavior,
  Locale,
  MusicDef,
  SceneDef,
  SpriteDef,
} from '@type-pal/content'
import {
  isActorEntity,
  isReuseMap,
  lookupText,
  mapRoom,
  resolveEntitySpriteId,
  reuseMapNum,
  validateReferences,
} from '@type-pal/content'
import type { AssetBase, LoadedProject } from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  AddEntityCommand,
  AddSceneCommand,
  DeleteEntityCommand,
  MoveEntityCommand,
  SetEntitySpriteCommand,
  UpdateEntityCommand,
  UpdateSceneCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { serializeProject, writeProject } from '../core/project-io.js'
import { saveHandle } from '../core/handle-store.js'
import { type Opened, openExistingProject, saveProjectAs } from '../core/open-actions.js'
import { ActorMode } from './ActorMode.js'
import { DataMode, type DataTab } from './DataMode.js'
import { MapMode } from './MapMode.js'
import { ScriptDrawer } from './ScriptDrawer.js'
import { MusicPicker } from './MusicPicker.js'
import { SceneCanvas, type Tool } from './SceneCanvas.js'
import { SpriteThumb } from './SpriteThumb.js'

const SCENE_NODE = '__scene__'
/** 进场点节点哨兵(与 SceneCanvas 的 ENTRY_HIT_ID 对齐):选中它 → 专属进场点 inspector(坐标+朝向)。 */
const ENTRY_NODE = '__entry__'
type Mode = 'place' | 'actor' | 'data' | 'map'

function newEntityId(existing: EntityDef[]): string {
  const ids = new Set(existing.map((e) => e.id))
  let n = 1
  while (ids.has(`entity-${n}`)) n++
  return `entity-${n}`
}

export function App(props: {
  session: EditSession
  project: LoadedProject
  /** 启动屏打开/克隆得到的工程目录句柄(P4):保存直接写回此夹,不再首存选夹。 */
  initialDir?: FileSystemDirectoryHandle
  /** 「工程」菜单切到别的工程(打开/另存为)→ 上抛 main 重建 session。 */
  onOpened?: (o: Opened) => void
  /** 「工程」菜单「新建工程」→ 回启动屏。 */
  onBackToPicker?: () => void
}) {
  const { session, project } = props
  const subscribe = useMemo(() => (cb: () => void) => session.subscribe(cb), [session])
  const getVersion = useMemo(() => () => session.getVersion(), [session])
  useSyncExternalStore(subscribe, getVersion) // 任一变化(含 markSaved / undo)都重渲染
  const state = session.getState()
  const [selected, setSelected] = useState<string>(SCENE_NODE)
  const [tool, setTool] = useState<Tool>('select')
  const [mode, setMode] = useState<Mode>('place')
  // 数据页(rail 二级展开驱动,2026-07-05 作者拍板)
  const [dataTab, setDataTab] = useState<DataTab>('sprite')
  // 画布图层显隐(布置模式:左栏 地板/高物/实体 + 工具栏 网格/禁入格)
  const [canvasLayers, setCanvasLayers] = useState({
    base: true,
    cover: true,
    entities: true,
    grid: false,
    blocked: false,
    ghosts: true, // 显隐透视:隐藏实体半透明(编辑器默认开;游戏内不渲染)
  })
  const [placeSceneId, setPlaceSceneId] = useState<string>(state.manifest.entryScene)
  // 放置 palette:add 工具态右栏选「要放的精灵」(审计断点 #1)
  const [placeSpriteId, setPlaceSpriteId] = useState<string>(state.sprites[0]?.id ?? '')
  const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(props.initialDir ?? null)
  // 上次落盘快照(rel → 内容字符串):增量保存只写变化文件(P3)。首存后建立。
  const snapshotRef = useRef<Map<string, string> | null>(null)
  const [saveErr, setSaveErr] = useState('')

  // 布置模式当前编辑场景(可切;默认入口)。切场景重置选中 —— 实体属于场景。
  const scene =
    state.scenes.find((s) => s.id === placeSceneId) ??
    state.scenes.find((s) => s.id === state.manifest.entryScene)
  const switchPlaceScene = (id: string): void => {
    setPlaceSceneId(id)
    setSelected(SCENE_NODE)
    setTool('select')
  }
  // N5 引用跳转:变量页/物品页点引用 → 事件模式定位到 场景+脚本源。
  // 底部脚本抽屉(audit §6 Step2:场景模式内嵌脚本编辑,独立事件模式已退役)
  const [drawer, setDrawer] = useState<{ open: boolean; src: string | null }>({
    open: false,
    src: null,
  })
  const switchMode = (m: Mode): void => {
    setMode(m)
  }
  /** 「去编辑脚本」统一入口(检查器按钮/数据模式引用跳转):回场景模式+定位场景+展开抽屉。 */
  const jumpToEvent = (sceneId: string, srcKey: string): void => {
    setPlaceSceneId(sceneId)
    setMode('place')
    // 源列跟随选中 → 跳转须同步选中目标(实体源选实体,场景级源选场景节点)
    setSelected(srcKey.startsWith('__') ? SCENE_NODE : (srcKey.split(':')[0] ?? SCENE_NODE))
    setDrawer({ open: true, src: srcKey })
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
      const typing =
        t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')
      if ((e.key === 'Delete' || e.key === 'Backspace') && selEntity && scene && !typing) {
        e.preventDefault()
        session.dispatch(new DeleteEntityCommand(scene.id, selEntity.id))
        setSelected(SCENE_NODE)
        return
      }
      // undo/redo 快捷键(⌘/Ctrl+Z,+Shift=redo;输入框内不劫持)
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z') && !typing) {
        e.preventDefault()
        if (e.shiftKey) session.redo()
        else session.undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [session, scene, selEntity])

  if (!scene) {
    return (
      <div className="boot">
        <div className="err">入口场景 "{state.manifest.entryScene}" 不在 scenes</div>
      </div>
    )
  }

  const moveEntity = (id: string, cell: { col: number; row: number }): void => {
    const ent = scene.entities.find((e) => e.id === id)
    if (ent)
      session.dispatch(
        new MoveEntityCommand(scene.id, id, {
          col: cell.col,
          row: cell.row,
          height: ent.pos.height,
        }),
      )
  }
  const addAt = (cell: { col: number; row: number }): void => {
    const id = newEntityId(scene.entities)
    // 放置 palette(审计断点 #1):放当前选中的精灵,不再固定 sprites[0]
    const sprite = placeSpriteId || (state.sprites[0]?.id ?? '')
    session.dispatch(
      new AddEntityCommand(scene.id, {
        id,
        pos: { col: cell.col, row: cell.row, height: 0 },
        sprite,
      }),
    )
    setSelected(id)
    setTool('select')
  }
  const deleteSelected = (): void => {
    if (!selEntity) return
    session.dispatch(new DeleteEntityCommand(scene.id, selEntity.id))
    setSelected(SCENE_NODE)
  }
  // 保存:File System Access + 增量(快照-diff,只写变化;P3)。首次弹选文件夹并把句柄存
  // IndexedDB(工程标识 = manifest.id;将来「打开本地/最近工程」= P4 复用)。
  const save = async (): Promise<void> => {
    try {
      let dir = dirHandleRef.current
      if (!dir) {
        dir = await window.showDirectoryPicker({ mode: 'readwrite' })
        dirHandleRef.current = dir
        snapshotRef.current = null // 新目录 → 快照作废,首存全写
        void saveHandle(state.manifest.id, dir.name, dir) // 持久化句柄(P4 打开本地用)
      }
      snapshotRef.current = await writeProject(dir, serializeProject(session.getState()), {
        ...(snapshotRef.current ? { prevSnapshot: snapshotRef.current } : {}),
      })
      session.markSaved()
      setSaveErr('')
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return // 用户取消选择器
      setSaveErr(e instanceof Error ? e.message : String(e))
    }
  }

  // 「工程」菜单(P4 native-app 手感:新建 / 打开别的 / 另存为)。切工程 → 上抛 main 重建 session。
  const [projMenu, setProjMenu] = useState(false)
  const runProj = async (fn: () => Promise<Opened | null>): Promise<void> => {
    setProjMenu(false)
    try {
      const o = await fn()
      if (o) props.onOpened?.(o)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setSaveErr(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="editor">
      <div className="topbar">
        <div className="proj-menu-wrap">
          <button type="button" className="tbtn" onClick={() => setProjMenu((v) => !v)} title="工程">
            📁 工程 ▾
          </button>
          {projMenu && (
            <>
              <div className="proj-menu-scrim" onClick={() => setProjMenu(false)} />
              <div className="proj-menu">
                <button type="button" onClick={() => { setProjMenu(false); props.onBackToPicker?.() }}>
                  ✨ 新建工程…
                </button>
                <button type="button" onClick={() => void runProj(openExistingProject)}>📂 打开工程…</button>
                <button
                  type="button"
                  onClick={() => void runProj(() => saveProjectAs(serializeProject(session.getState())))}
                >
                  📦 另存为…
                </button>
              </div>
            </>
          )}
        </div>
        <div className="proj">
          {state.manifest.name}
          <span className="kind">{state.manifest.id}</span>
        </div>
        <div className="spacer" />
        <button
          className="tbtn"
          disabled={!session.canUndo()}
          onClick={() => session.undo()}
          title="撤销"
        >
          ↺ 撤销
        </button>
        <button
          className="tbtn"
          disabled={!session.canRedo()}
          onClick={() => session.redo()}
          title="重做"
        >
          ↻ 重做
        </button>
        <button
          className="save"
          disabled={!session.isDirty()}
          onClick={() => void save()}
          title="保存改动到工程文件夹(增量,只写变化;打开工程后直接写回,不再选路径)"
        >
          💾 保存{session.isDirty() ? <span className="dot">●</span> : null}
        </button>
      </div>

      <div className="body">
        <div className="rail">
          <button
            className={`mode${mode === 'place' ? ' active' : ''}`}
            onClick={() => switchMode('place')}
          >
            <span className="ico">📍</span>
            <span className="lbl">场景</span>
          </button>
          <button
            className={`mode${mode === 'actor' ? ' active' : ''}`}
            onClick={() => switchMode('actor')}
          >
            <span className="ico">👥</span>
            <span className="lbl">角色</span>
          </button>
          <button
            className={`mode${mode === 'map' ? ' active' : ''}`}
            onClick={() => switchMode('map')}
          >
            <span className="ico">🗺️</span>
            <span className="lbl">地图</span>
          </button>
          <button
            className={`mode${mode === 'data' ? ' active' : ''}`}
            onClick={() => switchMode('data')}
          >
            <span className="ico">📊</span>
            <span className="lbl">数据</span>
          </button>

        </div>

        {mode === 'map' ? (
          <MapMode
            scene={scene}
            session={session}
            assetBase={project.assetBase}
            ownMaps={state.maps}
            tilesets={state.tilesets ?? []}
            tilesetBlobs={state.tilesetBlobs}
          />
        ) : mode === 'actor' ? (
          <ActorMode
            actors={state.actors}
            sprites={state.sprites}
            items={Object.fromEntries(state.items.map((i) => [i.id, i]))}
            skills={Object.fromEntries(state.skills.map((sk) => [sk.id, sk]))}
            locale={state.locale}
            assetBase={project.assetBase}
            session={session}
            levelUp={state.levelUp}
            startSkills={state.manifest.startWorld.learnedSkills}
          />
        ) : mode === 'data' ? (
          <DataMode
            itemList={state.items}
            sprites={state.sprites}
            skills={Object.fromEntries(state.skills.map((sk) => [sk.id, sk]))}
            items={Object.fromEntries(state.items.map((i) => [i.id, i]))}
            locale={state.locale}
            assetBase={project.assetBase}
            session={session}
            enemies={state.enemies ?? []}
            enemyTeams={state.enemyTeams ?? []}
            music={state.music ?? []}
            tilesets={state.tilesets ?? []}
            tilesetBlobs={state.tilesetBlobs}
            battleFields={state.battleFields ?? []}
            poisons={state.poisons ?? []}
            ambiences={state.ambiences ?? []}
            scenes={state.scenes}
            manifest={state.manifest}
            actors={state.actors}
            skillList={state.skills}
            onJumpToEvent={jumpToEvent}
            tab={dataTab}
            onTab={setDataTab}
          />
        ) : (
          <>
            <div className="outliner">
              <div className="pane-h">
                <span className="t">场景</span>
                <span className="spacer" />
                <button
                  className="mini"
                  title="在进场点添加实体"
                  onClick={() => addAt({ col: scene.entry.pos.col, row: scene.entry.pos.row })}
                >
                  ＋
                </button>
              </div>
              <select
                className="in scene-switch"
                value={placeSceneId}
                onChange={(e) => switchPlaceScene(e.target.value)}
                title="切换编辑场景"
              >
                {state.scenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.id}
                    {s.id === state.manifest.entryScene ? '(入口)' : ''} · {s.entities.length} 实体
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="tool"
                title="新建场景(复用当前场景的地图与进场点起步,建后在属性里改)"
                onClick={() => {
                  const id = window.prompt('新场景 id(kebab-case):', '')?.trim()
                  if (!id) return
                  if (state.scenes.some((sc) => sc.id === id)) {
                    window.alert(`场景 "${id}" 已存在`)
                    return
                  }
                  session.dispatch(
                    new AddSceneCommand(id, reuseMapNum(scene.map) ?? 0, scene.entry),
                  )
                  switchPlaceScene(id)
                }}
              >
                ＋ 新建场景
              </button>
              <div className="tree">
                <button
                  className={`node${selected === SCENE_NODE ? ' sel' : ''}`}
                  onClick={() => setSelected(SCENE_NODE)}
                >
                  <span className="ico">🗺️</span>
                  <span>{scene.id}</span>
                </button>
                <button
                  className={`node child${selected === ENTRY_NODE ? ' sel' : ''}`}
                  onClick={() => setSelected(ENTRY_NODE)}
                >
                  <span className="ico">📍</span>
                  <span>进场点</span>
                </button>
                {scene.entities.map((e) => (
                  <button
                    key={e.id}
                    className={`node child${selected === e.id ? ' sel' : ''}`}
                    onClick={() => setSelected(e.id)}
                  >
                    <span className="ico">
                      {isActorEntity(e) ? '👤' : 'sprite' in e ? '📦' : '⬚'}
                    </span>
                    <span>{e.id}</span>
                    <span className="k">
                      {isActorEntity(e)
                        ? (actorsById[e.actor]
                            ? lookupText(actorsById[e.actor]!.name, state.locale)
                            : e.actor)
                        : 'sprite' in e
                          ? e.sprite
                          : 'zone'}
                    </span>
                  </button>
                ))}
              </div>
              <div className="layers">
                <div className="t">图层 / 显隐</div>
                <label className="lrow">
                  <input
                    type="checkbox"
                    checked={canvasLayers.base}
                    onChange={(e) => setCanvasLayers({ ...canvasLayers, base: e.target.checked })}
                  />{' '}
                  地板
                </label>
                <label className="lrow">
                  <input
                    type="checkbox"
                    checked={canvasLayers.cover}
                    onChange={(e) => setCanvasLayers({ ...canvasLayers, cover: e.target.checked })}
                  />{' '}
                  高物(墙·家具)
                </label>
                <label className="lrow">
                  <input
                    type="checkbox"
                    checked={canvasLayers.entities}
                    onChange={(e) =>
                      setCanvasLayers({ ...canvasLayers, entities: e.target.checked })
                    }
                  />{' '}
                  实体
                </label>
                <label className="lrow" title="初始隐藏的实体(剧情后期才出场)画成半透明幽灵,可点选编排;游戏内不渲染">
                  <input
                    type="checkbox"
                    checked={canvasLayers.ghosts}
                    onChange={(e) => setCanvasLayers({ ...canvasLayers, ghosts: e.target.checked })}
                  />{' '}
                  隐藏实体(透视)
                </label>
              </div>
            </div>

            <div className="center">
              <div className="toolbar">
                <button
                  className={`tool${tool === 'select' ? ' active' : ''}`}
                  onClick={() => setTool('select')}
                  disabled={drawer.open}
                  title="选择 / 拖动移位"
                >
                  ↖ 选择/移动
                </button>
                <button
                  className={`tool${tool === 'add' ? ' active' : ''}`}
                  onClick={() => setTool('add')}
                  disabled={drawer.open}
                  title="点画布放新实体"
                >
                  ＋ 添加实体
                </button>
                <button
                  className="tool"
                  onClick={deleteSelected}
                  disabled={!selEntity}
                  title="删除选中(Del)"
                >
                  🗑 删除
                </button>
                <span className="sep" />
                <label className="vtog on">
                  <input
                    type="checkbox"
                    checked={canvasLayers.grid}
                    onChange={(e) => setCanvasLayers({ ...canvasLayers, grid: e.target.checked })}
                  />{' '}
                  网格
                </label>
                <label className="vtog">
                  <input
                    type="checkbox"
                    checked={canvasLayers.blocked}
                    onChange={(e) =>
                      setCanvasLayers({ ...canvasLayers, blocked: e.target.checked })
                    }
                  />{' '}
                  禁入
                </label>
                <span className="sep" />
                <button
                  className={`tool${drawer.open ? ' active' : ''}`}
                  onClick={() => setDrawer((d) => ({ open: !d.open, src: d.src }))}
                  title="底部脚本抽屉:本场景 onEnter/实体触发/巡逻 就地编 + 预览"
                >
                  📜 脚本
                </button>
                <span className="spacer" />
                <span className="toolbar-hint">
                  {tool === 'add' ? '点画布放实体' : '拖动移位 · Del 删除'}
                </span>
              </div>
              {!drawer.open ? (
              <SceneCanvas
                scene={scene}
                sprites={state.sprites}
                actorsById={actorsById}
                leaderSpriteId={leaderSpriteId}
                assetBase={project.assetBase}
                ownMaps={state.maps}
                tilesets={state.tilesets ?? []}
                tilesetBlobs={state.tilesetBlobs}
                selectedId={selEntity ? selected : null}
                entrySelected={selected === ENTRY_NODE}
                tool={tool}
                layers={canvasLayers}
                onSelect={(id) => setSelected(id ?? SCENE_NODE)}
                onMoveEntity={moveEntity}
                onSelectEntry={() => setSelected(ENTRY_NODE)}
                onMoveEntry={(cell) =>
                  session.dispatch(
                    new UpdateSceneCommand(scene.id, {
                      entry: {
                        pos: { ...cell, height: scene.entry.pos.height ?? 0 },
                        facing: scene.entry.facing,
                      },
                    }),
                  )
                }
                onAddAt={addAt}
              />
              ) : (
                <ScriptDrawer
                  scene={scene}
                  scenes={state.scenes}
                  locale={state.locale}
                  selectedEntityId={selEntity ? selected : null}
                  focusSrcKey={drawer.src}
                  sprites={state.sprites}
                  actorsById={actorsById}
                  leaderSpriteId={leaderSpriteId}
                  assetBase={project.assetBase}
                  ownMaps={state.maps}
                  tilesets={state.tilesets ?? []}
                  tilesetBlobs={state.tilesetBlobs}
                  session={session}
                  music={state.music ?? []}
                  ambiences={state.ambiences ?? []}
                  layers={{
                    grid: canvasLayers.grid,
                    blocked: canvasLayers.blocked,
                    ghosts: canvasLayers.ghosts,
                  }}
                  onClose={() => setDrawer({ open: false, src: null })}
                />
              )}
            </div>

            <div className="inspector">
              {tool === 'add' ? (
                <PlacePalette
                  sprites={state.sprites}
                  selectedId={placeSpriteId}
                  assetBase={project.assetBase}
                  blobs={state.tilesetBlobs}
                  onPick={setPlaceSpriteId}
                />
              ) : selEntity ? (
                <EntityInspector
                  entity={selEntity}
                  session={session}
                  sceneId={scene.id}
                  locale={state.locale}
                  actorsById={actorsById}
                  enemyTeams={state.enemyTeams ?? []}
                  sprites={state.sprites}
                  onJumpToEvent={jumpToEvent}
                  onDelete={deleteSelected}
                />
              ) : selected === ENTRY_NODE ? (
                <EntryInspector scene={scene} session={session} />
              ) : (
                <SceneInspector
                  scene={scene}
                  session={session}
                  music={state.music ?? []}
                  musicBase={project.assetBase.music}
                />
              )}
            </div>
          </>
        )}
      </div>

      <div className="valbar">
        {issues.length > 0 ? (
          <>
            <span className="pill warn">⚠ {issues.length} 问题</span>
            <span className="msg">
              {issues
                .slice(0, 2)
                .map((i) => i.message)
                .join(' · ')}
            </span>
          </>
        ) : (
          <span className="pill" style={{ color: 'var(--ok)' }}>
            ✓ 引用完整性 OK
          </span>
        )}
        <span className="spacer" />
        <span style={{ color: saveErr ? 'var(--err)' : 'var(--faint)', fontSize: 11 }}>
          {saveErr ? `保存失败: ${saveErr}` : session.isDirty() ? '未保存改动' : '已保存'}
        </span>
      </div>
    </div>
  )
}

/** 敌队 id 约定 `team-<N>` → N(引擎 enemyTeamsById[`team-${team}`] 查询键);不合约定返回 undefined。 */
function parseTeamNum(id: string | undefined): number | undefined {
  const m = id?.match(/^team-(\d+)$/)
  return m ? Number(m[1]) : undefined
}

const KIND_ICON: Record<string, string> = { directional: '🚶', static: '🪑', loop: '🔥' }

/** 放置 palette(审计断点 #1):add 工具态右栏选「要放的精灵」,点画布放它。 */
function PlacePalette(props: {
  sprites: SpriteDef[]
  selectedId: string
  assetBase: AssetBase
  /** 上传未保存的精灵字节(A4;键 = def.path,缩略图内存解码)。 */
  blobs?: Record<string, ArrayBuffer>
  onPick: (id: string) => void
}) {
  const { sprites, selectedId, assetBase, blobs, onPick } = props
  const [filter, setFilter] = useState('')
  const shown = sprites.filter(
    (s) =>
      !filter ||
      s.id.includes(filter) ||
      s.label.includes(filter) ||
      String(s.spriteNum).includes(filter),
  )
  return (
    <>
      <div className="insp-head">
        <div className="what">放置精灵</div>
        <div className="who">点画布放选中的精灵</div>
      </div>
      <div className="section">
        <input
          className="in"
          placeholder="过滤 id/名/精灵号…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="palette-list">
          {shown.map((s) => (
            <button
              type="button"
              key={s.id}
              className={`palette-row${s.id === selectedId ? ' sel' : ''}`}
              onClick={() => onPick(s.id)}
            >
              <SpriteThumb
                assetBase={assetBase}
                spriteNum={s.spriteNum}
                path={s.path}
                blob={s.path ? blobs?.[s.path] : undefined}
              />
              <span className="nm">
                {s.label || s.id}
                <span className="sub">
                  {KIND_ICON[s.layout.kind] ?? ''} #{s.spriteNum}
                </span>
              </span>
            </button>
          ))}
          {shown.length === 0 && <div className="insp-empty">(无匹配)</div>}
        </div>
      </div>
    </>
  )
}

function EntityInspector(props: {
  entity: EntityDef
  session: EditSession
  sceneId: string
  locale: Locale
  actorsById: Record<string, ActorDef>
  /** 敌队清单(B9 敌对行为 team 下拉;id 约定 team-<N>,引擎按 N 查)。 */
  enemyTeams: EnemyTeamDef[]
  /** 精灵注册表(prop 实体换精灵下拉)。 */
  sprites: SpriteDef[]
  /** 跳事件模式定位此实体的触发/巡逻脚本(E2)。 */
  onJumpToEvent: (sceneId: string, srcKey: string) => void
  onDelete: () => void
}) {
  const {
    entity,
    session,
    sceneId,
    locale,
    actorsById,
    enemyTeams,
    sprites,
    onJumpToEvent,
    onDelete,
  } = props
  // 实体的中文显示名:actor 实体解引用到角色名(entity.actor 是 id 引用),否则回落实体 id。
  const actorName =
    isActorEntity(entity) && actorsById[entity.actor]
      ? lookupText(actorsById[entity.actor]!.name, locale)
      : undefined
  const setPos = (patch: Partial<GridPos>): void => {
    session.dispatch(new MoveEntityCommand(sceneId, entity.id, { ...entity.pos, ...patch }))
  }
  const spriteId = resolveEntitySpriteId(entity, actorsById)
  const dispatchHostile = (h: HostileBehavior | undefined): void => {
    session.dispatch(new UpdateEntityCommand(sceneId, entity.id, { hostile: h }))
  }
  /** hostile 子字段更新(整对象替换;undefined 值的键显式删,保 JSON 落盘干净)。 */
  const setHostile = (patch: Partial<HostileBehavior>): void => {
    if (!entity.hostile) return
    const next: HostileBehavior = { ...entity.hostile, ...patch }
    if (patch.chase === undefined && 'chase' in patch) delete next.chase
    if (patch.respawnSeconds === undefined && 'respawnSeconds' in patch) delete next.respawnSeconds
    if (patch.onLose === undefined && 'onLose' in patch) delete next.onLose
    dispatchHostile(next)
  }
  return (
    <>
      <div className="insp-head">
        <div className="what">选中实体</div>
        <div className="who">
          {actorName ?? entity.id}
          {actorName && <code style={{ color: 'var(--faint)', fontSize: 11 }}> {entity.id}</code>}
        </div>
      </div>
      <div className="section">
        <h4>外观 / 交互</h4>
        {/* C0:实体引用只读展示(actor⊕sprite);切换引用/朝向编辑 = C1 角色模式一并做 */}
        {isActorEntity(entity) ? (
          <div className="field">
            <label>角色</label>
            <div className="in pick">
              <span>{actorName ?? entity.actor}</span>
              <span className="meta">→ {spriteId ?? '(未解析)'}</span>
            </div>
          </div>
        ) : 'sprite' in entity ? (
          <div className="field">
            <label>精灵</label>
            <select
              className="in"
              value={entity.sprite}
              onChange={(e) =>
                session.dispatch(new SetEntitySpriteCommand(sceneId, entity.id, e.target.value))
              }
            >
              {!sprites.some((sp) => sp.id === entity.sprite) && (
                <option value={entity.sprite}>{entity.sprite} (缺)</option>
              )}
              {sprites.map((sp) => (
                <option key={sp.id} value={sp.id}>
                  {sp.label || sp.id} #{sp.spriteNum}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="field">
            <label>触发区</label>
            <div className="in pick">
              <span>zone</span>
              <span className="meta">隐形(门/脚本锚)</span>
            </div>
          </div>
        )}
        <div className="field">
          <label>朝向</label>
          <div className="in pick">
            <span>{entity.facing ?? 'down'}</span>
            <span className="meta">C1 可编</span>
          </div>
        </div>
        <div className="field">
          <label>碰撞</label>
          <div>
            <input
              type="checkbox"
              checked={entity.collide === true}
              onChange={(e) =>
                session.dispatch(
                  new UpdateEntityCommand(sceneId, entity.id, { collide: e.target.checked }),
                )
              }
            />{' '}
            阻挡通行
          </div>
        </div>
        <div className="field">
          <label>初始显隐</label>
          <div title="隐藏 = 游戏里初始不出现(剧情脚本 setEntityState 可显形);编辑器「隐藏实体(透视)」图层仍半透明可见">
            <input
              type="checkbox"
              checked={entity.hidden === true}
              onChange={(e) =>
                session.dispatch(
                  new UpdateEntityCommand(sceneId, entity.id, {
                    hidden: e.target.checked ? true : undefined,
                  }),
                )
              }
            />{' '}
            初始隐藏(待剧情出场)
          </div>
        </div>
      </div>
      <div className="section">
        <h4>
          位置<span className="b2"> · 菱形轴</span>
        </h4>
        <div className="posrow">
          <div className="cell">
            <span>col</span>
            <input
              className="in mono"
              type="number"
              value={entity.pos.col}
              onChange={(e) =>
                Number.isFinite(e.target.valueAsNumber) && setPos({ col: e.target.valueAsNumber })
              }
            />
          </div>
          <div className="cell">
            <span>row</span>
            <input
              className="in mono"
              type="number"
              value={entity.pos.row}
              onChange={(e) =>
                Number.isFinite(e.target.valueAsNumber) && setPos({ row: e.target.valueAsNumber })
              }
            />
          </div>
          <div className="cell">
            <span>height</span>
            <input
              className="in mono"
              type="number"
              value={entity.pos.height}
              onChange={(e) =>
                Number.isFinite(e.target.valueAsNumber) &&
                setPos({ height: e.target.valueAsNumber })
              }
            />
          </div>
        </div>
      </div>
      <div className="section">
        <h4>
          敌对行为<span className="b2"> · B9 数据驱动</span>
        </h4>
        <div className="field">
          <label>敌对</label>
          <div>
            <input
              type="checkbox"
              checked={!!entity.hostile}
              onChange={(e) =>
                dispatchHostile(
                  e.target.checked
                    ? { team: parseTeamNum(enemyTeams[0]?.id) ?? 1 }
                    : undefined,
                )
              }
            />{' '}
            遇敌开战(触碰即 startBattle)
          </div>
        </div>
        {entity.hostile && (
          <>
            <div className="field">
              <label>敌队</label>
              <select
                className="in"
                value={String(entity.hostile.team)}
                onChange={(e) => setHostile({ team: Number(e.target.value) })}
              >
                {/* 约定 id=team-<N>,引擎按 N 查 enemyTeamsById[`team-${N}`];当前值兜底防悬空 */}
                {!enemyTeams.some((t) => parseTeamNum(t.id) === entity.hostile!.team) && (
                  <option value={String(entity.hostile.team)}>
                    team-{entity.hostile.team} (缺数据)
                  </option>
                )}
                {enemyTeams
                  .map((t) => ({ t, n: parseTeamNum(t.id) }))
                  .filter((x): x is { t: EnemyTeamDef; n: number } => x.n !== undefined)
                  .map(({ t, n }) => (
                    <option key={t.id} value={String(n)}>
                      {t.id}({t.members.length} 敌)
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label>追逐</label>
              <div>
                <input
                  type="checkbox"
                  checked={!!entity.hostile.chase}
                  onChange={(e) =>
                    setHostile({
                      chase: e.target.checked ? { range: 6, speed: 2 } : undefined,
                    })
                  }
                />{' '}
                见人就追(不勾 = 原地怪)
              </div>
            </div>
            {entity.hostile.chase && (
              <div className="posrow">
                <div className="cell">
                  <span>range 格</span>
                  <input
                    className="in mono"
                    type="number"
                    value={entity.hostile.chase.range}
                    onChange={(e) =>
                      Number.isFinite(e.target.valueAsNumber) &&
                      setHostile({
                        chase: { ...entity.hostile!.chase!, range: e.target.valueAsNumber },
                      })
                    }
                  />
                </div>
                <div className="cell">
                  <span>speed</span>
                  <input
                    className="in mono"
                    type="number"
                    value={entity.hostile.chase.speed}
                    onChange={(e) =>
                      Number.isFinite(e.target.valueAsNumber) &&
                      setHostile({
                        chase: { ...entity.hostile!.chase!, speed: e.target.valueAsNumber },
                      })
                    }
                  />
                </div>
                <div className="cell">
                  <span>穿障</span>
                  <input
                    type="checkbox"
                    checked={entity.hostile.chase.floating === true}
                    onChange={(e) => {
                      const chase = { ...entity.hostile!.chase!, floating: true }
                      if (!e.target.checked) delete (chase as { floating?: boolean }).floating
                      setHostile({ chase })
                    }}
                  />
                </div>
              </div>
            )}
            <div className="field">
              <label>重生秒</label>
              <input
                className="in mono"
                type="number"
                placeholder="(空=不复活)"
                value={entity.hostile.respawnSeconds ?? ''}
                onChange={(e) =>
                  setHostile({
                    respawnSeconds: Number.isFinite(e.target.valueAsNumber)
                      ? e.target.valueAsNumber
                      : undefined,
                  })
                }
              />
            </div>
            <div className="field">
              <label>战败</label>
              <select
                className="in"
                value={Array.isArray(entity.hostile.onLose) ? 'custom' : ''}
                onChange={(e) =>
                  setHostile({ onLose: e.target.value === 'custom' ? [] : undefined })
                }
              >
                <option value="">游戏结束(渐红读档,默认)</option>
                <option value="custom">自定义指令(剧情战输了也继续)</option>
              </select>
            </div>
            {Array.isArray(entity.hostile.onLose) && (
              <textarea
                className="in cf-ta"
                key={`${entity.id}-onlose`}
                defaultValue={JSON.stringify(entity.hostile.onLose, null, 2)}
                placeholder='[{ "kind": "dialog", ... }] — Command[] JSON'
                onBlur={(e) => {
                  try {
                    const v = JSON.parse(e.target.value) as HostileBehavior['onLose']
                    if (Array.isArray(v)) setHostile({ onLose: v })
                  } catch {
                    /* 解析失败不落盘;失焦保持原文供修 */
                  }
                }}
                spellCheck={false}
              />
            )}
          </>
        )}
      </div>
      <div className="section">
        <h4>
          行为脚本 <span className="hint2">底部抽屉就地编(E2/E4)</span>
        </h4>
        {/* 一眼徽标 + 单入口(创建/切换动作在抽屉头部,不重复) */}
        <div className="lrow" style={{ gap: 8, alignItems: 'center' }}>
          <span style={{ color: 'var(--dim)', fontSize: 12 }}>
            {entity.pages?.[0]?.trigger
              ? `🔗 ${entity.pages[0].trigger.on === 'interact' ? '交互' : '触碰'}·${entity.pages[0].trigger.stages.length}段`
              : null}
            {entity.pages?.[0]?.auto ? ` 🔁 巡逻·${entity.pages[0].auto.stages.length}段` : null}
            {!entity.pages?.[0]?.trigger && !entity.pages?.[0]?.auto ? '(无脚本)' : null}
          </span>
          <button
            type="button"
            className="mini-txt"
            onClick={() =>
              onJumpToEvent(
                sceneId,
                entity.pages?.[0]?.trigger
                  ? `${entity.id}:trigger`
                  : entity.pages?.[0]?.auto
                    ? `${entity.id}:auto`
                    : `${entity.id}:trigger`,
              )
            }
          >
            📜 编辑脚本
          </button>
        </div>
      </div>
      <div className="section" style={{ borderBottom: 0 }}>
        <button className="tool" style={{ color: 'var(--err)' }} onClick={onDelete}>
          🗑 删除此实体
        </button>
      </div>
    </>
  )
}

/**
 * 进场点 inspector —— 队伍**正常走进**本场景的出生格 + 朝向(scene.entry)。
 * 坐标可数字直填,也可画布拖红针(两条路都走 UpdateSceneCommand,入 undo)。
 * 与「命名入口」(别处 loadScene 指定落点)、「传送出口/引路蜂土灵珠」(onTeleport 脚本把你送出去)
 * 是**三条独立线**,别混:这里只管「正常进来落哪」。
 */
function EntryInspector(props: { scene: SceneDef; session: EditSession }) {
  const { scene, session } = props
  const facings: SceneDef['entry']['facing'][] = ['down', 'up', 'left', 'right']
  const patch = (next: Partial<{ col: number; row: number; facing: SceneDef['entry']['facing'] }>): void => {
    session.dispatch(
      new UpdateSceneCommand(scene.id, {
        entry: {
          pos: {
            col: next.col ?? scene.entry.pos.col,
            row: next.row ?? scene.entry.pos.row,
            height: scene.entry.pos.height ?? 0,
          },
          facing: next.facing ?? scene.entry.facing,
        },
      }),
    )
  }
  return (
    <>
      <div className="insp-head">
        <div className="what">选中进场点</div>
        <div className="who">📍 {scene.id}</div>
      </div>
      <div className="section">
        <h4>
          进场点 <span className="hint2">队伍走进本场景的出生格 + 朝向</span>
        </h4>
        <div className="field">
          <label>坐标</label>
          <div className="row" style={{ gap: 6 }}>
            <input
              className="in mono entry-n"
              type="number"
              title="列 col"
              value={scene.entry.pos.col}
              onChange={(e) =>
                Number.isFinite(e.target.valueAsNumber) && patch({ col: e.target.valueAsNumber })
              }
            />
            <input
              className="in mono entry-n"
              type="number"
              title="行 row"
              value={scene.entry.pos.row}
              onChange={(e) =>
                Number.isFinite(e.target.valueAsNumber) && patch({ row: e.target.valueAsNumber })
              }
            />
          </div>
        </div>
        <div className="field">
          <label>朝向</label>
          <select
            className="in"
            value={scene.entry.facing}
            onChange={(e) => patch({ facing: e.target.value as SceneDef['entry']['facing'] })}
          >
            {facings.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="insp-empty" style={{ marginTop: 8 }}>
          也可直接在画布上拖动红色菱形标记改坐标。这是「正常走进来」的落点;引路蜂/土灵珠把队伍送去哪,
          由本场景的<b>传送出口</b>脚本(📜 脚本模式)决定,和这里无关。
        </div>
      </div>
    </>
  )
}

function SceneInspector(props: {
  scene: SceneDef
  session: EditSession
  /** 音乐库 + 试听前缀(场景 BGM 选择器)。 */
  music: MusicDef[]
  musicBase: string
}) {
  const { scene, session, music, musicBase } = props
  return (
    <>
      <div className="insp-head">
        <div className="what">选中场景</div>
        <div className="who">{scene.id}</div>
      </div>
      <div className="section">
        <h4>场景</h4>
        <div className="field">
          <label>地图</label>
          {isReuseMap(scene.map) ? (
            <input
              className="in mono"
              type="number"
              title="复用原版地图号(改后画布即重载)"
              value={reuseMapNum(scene.map)}
              onChange={(e) =>
                Number.isFinite(e.target.valueAsNumber) &&
                session.dispatch(
                  new UpdateSceneCommand(scene.id, {
                    map: {
                      reuseOriginalMap: e.target.valueAsNumber,
                      ...(mapRoom(scene.map) ? { room: mapRoom(scene.map) } : {}),
                    },
                  }),
                )
              }
            />
          ) : (
            <span className="mono map-file">{scene.map.ownMap}</span>
          )}
        </div>
        <div className="field">
          <label>音乐</label>
          <MusicPicker
            value={scene.musicId}
            onChange={(v) => session.dispatch(new UpdateSceneCommand(scene.id, { musicId: v }))}
            music={music}
            baseUrl={musicBase}
            allowUnset
          />
        </div>
      </div>
      <div className="section">
        <h4>
          命名入口 <span className="hint2">传送落点(loadScene/X5 引用)</span>
        </h4>
        {Object.entries(scene.entries ?? {}).map(([name, ent]) => (
          <EntryRow
            key={name}
            name={name}
            entry={ent}
            onChange={(nextName, nextEntry) => {
              const es = { ...(scene.entries ?? {}) }
              if (nextName !== name) {
                if (nextName in es) return // 重名不覆盖
                delete es[name]
              }
              es[nextName] = nextEntry
              session.dispatch(new UpdateSceneCommand(scene.id, { entries: es }))
            }}
            onRemove={() => {
              const es = { ...(scene.entries ?? {}) }
              delete es[name]
              session.dispatch(
                new UpdateSceneCommand(scene.id, {
                  entries: Object.keys(es).length ? es : undefined, // 空表收敛,落盘干净
                }),
              )
            }}
          />
        ))}
        <button
          type="button"
          className="tool"
          onClick={() => {
            const es = { ...(scene.entries ?? {}) }
            let i = 1
            while (`entry-${i}` in es) i++
            es[`entry-${i}`] = { pos: { ...scene.entry.pos }, facing: scene.entry.facing }
            session.dispatch(new UpdateSceneCommand(scene.id, { entries: es }))
          }}
        >
          ＋ 添加入口(初始 = 进场点)
        </button>
      </div>
      <div className="insp-empty">
        点左侧实体 / 画布上的实体,看编它的属性。工具栏「+ 添加实体」→ 点画布放。
      </div>
    </>
  )
}

/** 命名入口行:名字(失焦改名)+ col/row + 朝向 + 删。 */
function EntryRow(props: {
  name: string
  entry: { pos: GridPos; facing?: SceneDef['entry']['facing'] }
  onChange: (name: string, entry: { pos: GridPos; facing?: SceneDef['entry']['facing'] }) => void
  onRemove: () => void
}) {
  const { name, entry, onChange, onRemove } = props
  const [draft, setDraft] = useState<string | null>(null)
  const facings: SceneDef['entry']['facing'][] = ['down', 'up', 'left', 'right']
  return (
    <div className="entry-row">
      <input
        className="in entry-name mono"
        value={draft ?? name}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft && draft !== name) onChange(draft, entry)
          setDraft(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        }}
      />
      <input
        className="in mono entry-n"
        type="number"
        title="col"
        value={entry.pos.col}
        onChange={(e) =>
          Number.isFinite(e.target.valueAsNumber) &&
          onChange(name, { ...entry, pos: { ...entry.pos, col: e.target.valueAsNumber } })
        }
        onWheel={(e) => e.currentTarget.blur()}
      />
      <input
        className="in mono entry-n"
        type="number"
        title="row"
        value={entry.pos.row}
        onChange={(e) =>
          Number.isFinite(e.target.valueAsNumber) &&
          onChange(name, { ...entry, pos: { ...entry.pos, row: e.target.valueAsNumber } })
        }
        onWheel={(e) => e.currentTarget.blur()}
      />
      <select
        className="in entry-f"
        value={entry.facing ?? 'down'}
        onChange={(e) =>
          onChange(name, { ...entry, facing: e.target.value as SceneDef['entry']['facing'] })
        }
      >
        {facings.map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>
      <button type="button" className="mini" title="删除此入口" onClick={onRemove}>
        ✕
      </button>
    </div>
  )
}
