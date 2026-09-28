// @vitest-environment jsdom
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K12（批C）：SceneCanvas 真实布置画布工作流补测
 * （锚 SceneCanvas.tsx:494/592/615；scene-stage.ts:100 的消费侧）。
 *
 * 与旧测试的本质差异：不 mock scene-stage/reforge —— useSceneAssets 真实加载 blank 项目的
 * 地图/瓦片集/精灵（gzip+RLE 真解码），命中盒来自真实解码帧；anchor/entity 移动经公开 callback
 * 落到真实 EditSession 命令（与 App.tsx 同一组命令），断言会话状态与 undo 对称。
 *
 * 旧 file/title → 已证合同 → 本组缺口：
 * - SceneCanvas.test.tsx（scene-stage 全 mock，assetReader/assetBase 字面量）：
 *   - '空白 click 清选择一次，越过阈值的空白 drag 只平移' → 已证空白清选择与阈值；不重复。
 *   - 'cursor 覆盖放置、空白、平移和实体命中四态，并在取消后复位' → 已证空白按下后 pointercancel
 *     的 cursor 复位；缺口：实体/锚点**拖动在途** pointercancel 的零提交（本文件 test 1/2）。
 * - SceneCanvas.glm-ui-wave.test.tsx（scene-stage 同样 mock；合法项目 + zone 固定命中盒）：
 *   - '点击命中实体传出精确 onSelectEntity 实参；空白点击仍清选择' → 已证 zone 固定盒点选；缺口：
 *     真实解码精灵帧的 actor 实体命中盒（spriteBlitRect 链路，test 2）。
 *   - '抓取实体拖动提交 onMoveEntity 精确目标格' → 已证 zone 拖动提交（mock stage）；缺口：真实
 *     精灵命中下拖到真实 MoveEntityCommand 提交 + undo（test 2）。
 *   - '放置模式落下传出 onAddAt 精确格子' → 已证固定 zoom=4 的 screen→cell；缺口：滚轮缩放（锚点
 *     不变式）与空白平移后的真实视图下的放置坐标（test 3，真实 useViewZoomPan）。
 * - 锚点（默认落点/命名落点）选择、拖动提交、取消零提交在全部旧测试中均未触达（旧测试一律
 *   layers.entries:false）（test 1）。
 * - 磁盘回退的迟到场景资源归属：scene-stage.test.tsx 用 vi.mock 的 loadProjectMap 证明 alive 丢弃；
 *   缺口：真实磁盘 I/O（gatedFileSource 只闸 readBytes）下切图后迟到的 tileset 解码结果不得
 *   覆盖当前场景（test 4；zoom 读数 21% vs 30% 是归属见证）。
 *
 * jsdom 补齐（k12-fixtures.ts，观测范围以 fixture 头注释为准）：Path2D 记录型、pointer capture、
 * canvas 矩形、scrollIntoView。无产品 mock。
 */
import type { SceneDef } from '@type-pal/content'
import { pixelToGrid } from '@type-pal/content'
import type { AssetBase, ProjectMap } from '@type-pal/reforge'
import { buildBlankProjectMap, spriteBlitRect } from '@type-pal/reforge'
import { act, useState, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { AddEntityCommand, MoveEntityCommand } from '../core/entity-commands.js'
import { UpdateSceneCommand, UpsertSceneEntryCommand } from '../core/scene-commands.js'
import { loadEditorSprite } from '../core/sprite-assets.js'
import { loadLegalUiProject, useActEnvironment } from './__tests__/glm-ui-wave-kit.js'
import {
  diskMapIndex,
  installJsdomStageSemantics,
  loadLegalProjectWithDiskMaps,
  pointerOn,
  type StageViewLike,
  sceneGridClient,
  wheelOn,
} from './__tests__/kimi-editor-workflows/k12-fixtures.js'
import {
  gatedFileSource,
  installBrowserHardwarePorts,
} from './__tests__/kimi-editor-workflows/kit.js'
import { type SceneAnchorSelection, SceneCanvas } from './SceneCanvas.js'
import { fitStageView, mapBoxOf } from './scene-stage.js'

const SCENE_ID = 'start'
const TILESET_ASSET = 'tileset.generated.starter'
const SPRITE_ASSET = 'sprite.generated.starter'

interface AnchorMove {
  anchor: SceneAnchorSelection
  cell: { col: number; row: number }
}

interface Logs {
  selectAnchors: SceneAnchorSelection[]
  anchorMoves: AnchorMove[]
  selectEntities: string[]
  entityMoves: Array<{ id: string; cell: { col: number; row: number } }>
  adds: Array<{ col: number; row: number }>
  clears: number
}

let host: HTMLDivElement
let root: Root
let logs: Logs

beforeEach(() => {
  useActEnvironment()
  installBrowserHardwarePorts()
  installJsdomStageSemantics()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  logs = {
    selectAnchors: [],
    anchorMoves: [],
    selectEntities: [],
    entityMoves: [],
    adds: [],
    clears: 0,
  }
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

function canvas(): HTMLCanvasElement {
  const element = host.querySelector('canvas')
  expect(element, '场景画布').not.toBeNull()
  return element!
}

function noteText(): string {
  const text = host.querySelector('.canvas-note')?.textContent
  expect(text, '画布状态').toBeTruthy()
  return text!
}

function sceneView(map: { width: number; height: number }): StageViewLike {
  return fitStageView(mapBoxOf(map, undefined), { w: 100, h: 100 }, 0.96)
}

/** 与 App.tsx:2693-2722 相同的真实命令接线（移动落点/实体到 EditSession）。 */
function Harness(props: {
  session: EditSession
  reader: EditorAssetReader
  assetBase: AssetBase
  placing: boolean
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const state = props.session.getState()
  const scene = state.scenes.find((candidate) => candidate.id === SCENE_ID) as SceneDef
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null)
  const [selectedAnchor, setSelectedAnchor] = useState<SceneAnchorSelection | null>(null)
  return (
    <SceneCanvas
      scene={scene}
      sprites={state.sprites ?? []}
      actorsById={Object.fromEntries((state.actors ?? []).map((actor) => [actor.id, actor]))}
      leaderSpriteId={undefined}
      assetBase={props.assetBase}
      assetCatalog={state.assetCatalog}
      assetReader={props.reader}
      projectMaps={state.maps}
      mapIndex={state.mapIndex}
      tilesets={state.tilesets ?? []}
      selectedEntityId={selectedEntityId}
      selectedAnchor={selectedAnchor}
      placingEntity={props.placing}
      layers={{
        base: true,
        cover: true,
        entities: true,
        grid: false,
        blocked: false,
        entries: true,
        ghosts: true,
      }}
      onSelectEntity={(id) => {
        logs.selectEntities.push(id)
        setSelectedEntityId(id)
      }}
      onMoveEntity={(id, cell) => {
        logs.entityMoves.push({ id, cell })
        const entity = scene.entities.find((candidate) => candidate.id === id)
        if (entity)
          props.session.dispatch(
            new MoveEntityCommand(SCENE_ID, id, {
              col: cell.col,
              row: cell.row,
              height: entity.pos.height,
            }),
          )
      }}
      onSelectAnchor={(anchor) => {
        logs.selectAnchors.push(anchor)
        setSelectedAnchor(anchor)
      }}
      onMoveAnchor={(anchor, cell) => {
        logs.anchorMoves.push({ anchor, cell })
        if (anchor.kind === 'default') {
          props.session.dispatch(
            new UpdateSceneCommand(SCENE_ID, {
              entry: { pos: { ...scene.entry.pos, ...cell }, facing: scene.entry.facing },
            }),
          )
          return
        }
        const entry = scene.entries?.[anchor.id]
        if (entry)
          props.session.dispatch(
            new UpsertSceneEntryCommand(SCENE_ID, anchor.id, {
              ...entry,
              pos: { ...entry.pos, ...cell },
            }),
          )
      }}
      onAddAt={(cell) => logs.adds.push(cell)}
      onClearSelection={() => {
        logs.clears += 1
        setSelectedEntityId(null)
        setSelectedAnchor(null)
      }}
    />
  )
}

interface Mounted {
  session: EditSession
  reader: EditorAssetReader
  assetBase: AssetBase
  map: ProjectMap
}

async function mount(options: { placing?: boolean; seedActor?: boolean } = {}): Promise<Mounted> {
  const legal = await loadLegalUiProject('kimi-k12-scenecanvas')
  const session = new EditSession(legal.state)
  if (options.seedActor)
    session.dispatch(
      new AddEntityCommand(SCENE_ID, {
        id: 'guard',
        actor: 'hero',
        pos: { col: 4, row: 4, height: 0 },
        facing: 'down',
      }),
    )
  const reader = createEditorAssetReader(legal.source, () => session.getState())
  const map = session.getState().maps[SCENE_ID]!
  await act(async () => {
    root.render(
      <Harness
        session={session}
        reader={reader}
        assetBase={legal.assetBase}
        placing={options.placing ?? false}
      />,
    )
  })
  const expected = `${Math.round(sceneView(map).zoom * 100)}%`
  await vi.waitFor(() => {
    expect(noteText()).toContain(expected)
    expect(noteText()).not.toContain('载入中')
  })
  return { session, reader, assetBase: legal.assetBase, map }
}

async function rerenderPlacing(mounted: Mounted, placing: boolean): Promise<void> {
  await act(async () => {
    root.render(
      <Harness
        session={mounted.session}
        reader={mounted.reader}
        assetBase={mounted.assetBase}
        placing={placing}
      />,
    )
  })
}

async function pointerAt(
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  at: { clientX: number; clientY: number },
): Promise<void> {
  await act(async () => {
    pointerOn(canvas(), type, { clientX: at.clientX, clientY: at.clientY })
  })
}

function sceneEntry(session: EditSession): SceneDef['entry'] {
  return (session.getState().scenes.find((candidate) => candidate.id === SCENE_ID) as SceneDef)
    .entry
}

function sceneOf(session: EditSession): SceneDef {
  return session.getState().scenes.find((candidate) => candidate.id === SCENE_ID) as SceneDef
}

describe('K12 SceneCanvas 真实布置画布工作流', () => {
  test('默认/命名落点：画布点选、拖动提交到真实命令并可撤销；拖动在途取消零提交', async () => {
    const mounted = await mount()
    // 命名落点经真实命令播种（生产构造器，App 同款 UpsertSceneEntryCommand）。
    await act(async () => {
      mounted.session.dispatch(
        new UpsertSceneEntryCommand(SCENE_ID, 'back', {
          label: '后门',
          pos: { col: 2, row: 2, height: 0 },
          facing: 'up',
        }),
      )
    })
    expect(sceneOf(mounted.session).entries?.back?.pos).toMatchObject({ col: 2, row: 2 })
    const afterSeed = structuredClone(sceneOf(mounted.session))
    const view = sceneView(mounted.map)
    const entryAt = sceneGridClient({ col: 12, row: 0 }, view)
    const entryTarget = sceneGridClient({ col: 13, row: 1 }, view)
    const backAt = sceneGridClient({ col: 2, row: 2 }, view)
    const backTarget = sceneGridClient({ col: 3, row: 3 }, view)

    // 点选默认落点（单击不提交移动）。
    await pointerAt('pointerdown', entryAt)
    await pointerAt('pointerup', entryAt)
    expect(logs.selectAnchors).toEqual([{ kind: 'default' }])
    expect(logs.anchorMoves).toEqual([])
    expect(sceneEntry(mounted.session).pos).toMatchObject({ col: 12, row: 0, height: 0 })

    // 拖动默认落点到 (13,1)：公开 callback → UpdateSceneCommand → 会话真实变化，undo 还原。
    await pointerAt('pointerdown', entryAt)
    await pointerAt('pointermove', entryTarget)
    await pointerAt('pointerup', entryTarget)
    expect(logs.anchorMoves).toEqual([{ anchor: { kind: 'default' }, cell: { col: 13, row: 1 } }])
    expect(sceneEntry(mounted.session).pos).toMatchObject({ col: 13, row: 1, height: 0 })
    await act(async () => expect(mounted.session.undo()).toBe(true))
    expect(sceneEntry(mounted.session).pos).toMatchObject({ col: 12, row: 0, height: 0 })

    // 命名落点：点选传出 {kind:'named',id:'back'}，拖到 (3,3) 经 UpsertSceneEntryCommand 落账。
    await pointerAt('pointerdown', backAt)
    await pointerAt('pointerup', backAt)
    expect(logs.selectAnchors.at(-1)).toEqual({ kind: 'named', id: 'back' })
    await pointerAt('pointerdown', backAt)
    await pointerAt('pointermove', backTarget)
    await pointerAt('pointerup', backTarget)
    expect(logs.anchorMoves.at(-1)).toEqual({
      anchor: { kind: 'named', id: 'back' },
      cell: { col: 3, row: 3 },
    })
    expect(sceneOf(mounted.session).entries?.back?.pos).toMatchObject({ col: 3, row: 3 })
    await act(async () => expect(mounted.session.undo()).toBe(true))
    expect(sceneOf(mounted.session).entries?.back?.pos).toMatchObject({ col: 2, row: 2 })

    // 取消侧：默认落点拖动在途 pointercancel → 零提交、cursor 复位、后续 pointerup 不补交。
    const anchorMoveCount = logs.anchorMoves.length
    await pointerAt('pointerdown', entryAt)
    await pointerAt('pointermove', entryTarget)
    await pointerAt('pointercancel', entryTarget)
    expect(canvas().style.cursor).toBe('grab')
    await pointerAt('pointerup', entryTarget)
    expect(logs.anchorMoves).toHaveLength(anchorMoveCount)
    expect(sceneEntry(mounted.session).pos).toMatchObject({ col: 12, row: 0, height: 0 })
    expect(sceneOf(mounted.session)).toEqual(afterSeed)
  })

  test('真实解码精灵帧命中 actor 实体：拖动提交 MoveEntityCommand 可撤销，拖动在途取消零提交', async () => {
    const mounted = await mount({ seedActor: true })
    const view = sceneView(mounted.map)
    // 与组件同一份真实数据推命中点：真实 reader 解码 hero 精灵首帧（directional idle down）。
    const loaded = await loadEditorSprite(mounted.reader, SPRITE_ASSET)
    const frame = loaded.frames[0]!
    const rect = spriteBlitRect({
      worldX: 0, // gridToPixel(4,4).x
      worldY: 64, // spriteScreenY(4,4,0)
      anchorX: Math.floor(frame.width / 2),
      anchorY: frame.height,
      frame,
    })
    const hit = {
      clientX: (rect.x + rect.w / 2 - view.panX) * view.zoom,
      clientY: (rect.y + rect.h / 2 - view.panY) * view.zoom,
    }
    // 抓取偏移从同一真实几何推出（格 = screenToCell(down 点)）。
    const downCell = pixelToGrid(
      hit.clientX / view.zoom + view.panX,
      hit.clientY / view.zoom + view.panY,
    )
    const grab = { dcol: 4 - downCell.col, drow: 4 - downCell.row }

    // 点选实体：真实帧命中盒 → onSelectEntity('guard')。
    await pointerAt('pointerdown', hit)
    await pointerAt('pointerup', hit)
    expect(logs.selectEntities).toEqual(['guard'])
    expect(logs.entityMoves).toEqual([])

    // 拖到指针格 (6,6)：提交格 = 指针格 + 抓取偏移；真实命令落账并可撤销。
    const targetPointer = sceneGridClient({ col: 6, row: 6 }, view)
    await pointerAt('pointerdown', hit)
    await pointerAt('pointermove', targetPointer)
    await pointerAt('pointerup', targetPointer)
    const expectedCell = { col: 6 + grab.dcol, row: 6 + grab.drow }
    expect(logs.entityMoves).toEqual([{ id: 'guard', cell: expectedCell }])
    expect(sceneOf(mounted.session).entities[0]?.pos).toMatchObject(expectedCell)
    await act(async () => expect(mounted.session.undo()).toBe(true))
    expect(sceneOf(mounted.session).entities[0]?.pos).toMatchObject({ col: 4, row: 4, height: 0 })

    // 取消侧：拖动在途 pointercancel → 零提交，实体格不动。
    await pointerAt('pointerdown', hit)
    await pointerAt('pointermove', targetPointer)
    await pointerAt('pointercancel', targetPointer)
    await pointerAt('pointerup', targetPointer)
    expect(logs.entityMoves).toHaveLength(1)
    expect(sceneOf(mounted.session).entities[0]?.pos).toMatchObject({ col: 4, row: 4, height: 0 })
  })

  test('滚轮缩放保持光标锚格不变，平移后放置坐标精确；缩放下限夹回', async () => {
    const mounted = await mount({ placing: true })
    const view = sceneView(mounted.map)
    const anchorPoint = sceneGridClient({ col: 13, row: 1 }, view)

    // 光标锚不变式：在 (13,1) 格像素点上滚轮放大，同一点落下仍是 (13,1)。
    await act(async () => {
      wheelOn(canvas(), {
        deltaY: -100,
        clientX: anchorPoint.clientX,
        clientY: anchorPoint.clientY,
      })
    })
    await vi.waitFor(() => {
      expect(noteText()).toContain(`${Math.round(view.zoom * 1.12 * 100)}%`)
    })
    await pointerAt('pointerdown', anchorPoint)
    await pointerAt('pointerup', anchorPoint)
    expect(logs.adds).toEqual([{ col: 13, row: 1 }])

    // 连续缩小到 0.04 下限并夹回（每次滚轮独立 act：监听器读 viewRef，渲染拍间才推进）。
    await act(async () => {
      wheelOn(canvas(), {
        deltaY: 2400,
        clientX: anchorPoint.clientX,
        clientY: anchorPoint.clientY,
      })
    })
    for (let index = 0; index < 19; index += 1)
      await act(async () => {
        wheelOn(canvas(), {
          deltaY: 2400,
          clientX: anchorPoint.clientX,
          clientY: anchorPoint.clientY,
        })
      })
    await vi.waitFor(() => {
      expect(noteText()).toContain('4%')
    })
    await act(async () => {
      wheelOn(canvas(), {
        deltaY: 2400,
        clientX: anchorPoint.clientX,
        clientY: anchorPoint.clientY,
      })
    })
    expect(noteText()).toContain('4%')
    // 锚定不变式全程成立：(13,1) 的世界像素仍停在原光标点 → 视图可解析。
    const floored = {
      zoom: 0.04,
      panX: 192 - anchorPoint.clientX / 0.04,
      panY: 112 - anchorPoint.clientY / 0.04,
    }

    // 空白拖拽平移（放置关）：(95,10) → (65,30)，不移交清选择。
    await rerenderPlacing(mounted, false)
    await pointerAt('pointerdown', { clientX: 95, clientY: 10 })
    await pointerAt('pointermove', { clientX: 65, clientY: 30 })
    await pointerAt('pointerup', { clientX: 65, clientY: 30 })
    expect(logs.clears).toBe(0)
    const panned = {
      zoom: floored.zoom,
      panX: floored.panX - (65 - 95) / floored.zoom,
      panY: floored.panY - (30 - 10) / floored.zoom,
    }

    // 平移+下限缩放后的放置坐标：选定 (60,10)，其像素落点必在可视区内。
    await rerenderPlacing(mounted, true)
    const target = sceneGridClient({ col: 60, row: 10 }, panned)
    expect(target.clientX).toBeGreaterThan(0)
    expect(target.clientX).toBeLessThan(100)
    expect(target.clientY).toBeGreaterThan(0)
    expect(target.clientY).toBeLessThan(100)
    await pointerAt('pointerdown', target)
    await pointerAt('pointerup', target)
    expect(logs.adds.at(-1)).toEqual({ col: 60, row: 10 })
  })

  test('磁盘回退迟到归属：切图在途的 tileset 解码完成也不覆盖当前场景资源', async () => {
    const legal = await loadLegalProjectWithDiskMaps('kimi-k12-scenecanvas-late', [
      { id: 'map-b', map: buildBlankProjectMap(8, 8, 'starter') },
    ])
    const gate = gatedFileSource(legal.source)
    const session = new EditSession(legal.state)
    const reader = createEditorAssetReader(gate.source, () => session.getState())
    const tilesetPath = session.getState().assetCatalog.assets[TILESET_ASSET]!.path
    const sceneA = session
      .getState()
      .scenes.find((candidate) => candidate.id === SCENE_ID) as SceneDef
    const sceneB: SceneDef = { ...sceneA, id: 'scene-b', mapId: 'map-b' }
    const index = diskMapIndex([
      { id: 'start', name: '起始地图', path: 'content/maps/start.json' },
      { id: 'map-b', name: '迟到对照图', path: 'content/maps/map-b.json' },
    ])
    const zoomA = `${Math.round(sceneView({ width: 12, height: 12 }).zoom * 100)}%`
    const zoomB = `${Math.round(sceneView({ width: 8, height: 8 }).zoom * 100)}%`
    expect(zoomA).toBe('21%')
    expect(zoomB).toBe('30%')

    const renderScene = async (scene: SceneDef): Promise<void> => {
      const state = session.getState()
      await act(async () => {
        root.render(
          <SceneCanvas
            scene={scene}
            sprites={state.sprites ?? []}
            actorsById={Object.fromEntries((state.actors ?? []).map((actor) => [actor.id, actor]))}
            leaderSpriteId={undefined}
            assetBase={legal.assetBase}
            assetCatalog={state.assetCatalog}
            assetReader={reader}
            projectMaps={{}}
            mapIndex={index}
            tilesets={state.tilesets ?? []}
            selectedEntityId={null}
            selectedAnchor={null}
            placingEntity={false}
            layers={{
              base: true,
              cover: true,
              entities: true,
              grid: false,
              blocked: false,
              entries: false,
              ghosts: true,
            }}
            onSelectEntity={() => undefined}
            onMoveEntity={() => undefined}
            onSelectAnchor={() => undefined}
            onMoveAnchor={() => undefined}
            onAddAt={() => undefined}
            onClearSelection={() => undefined}
          />,
        )
      })
    }

    // 首轮磁盘回退真实读图：start 12×12 → 21%。
    await renderScene(sceneA)
    await vi.waitFor(() => {
      expect(noteText()).toContain(zoomA)
      expect(noteText()).not.toContain('载入中')
    })
    expect(gate.calls).toEqual([tilesetPath])
    expect(gate.completed).toEqual([tilesetPath])

    // 切到 map-b：tileset 字节读取进闸门（未开始/在途可区分），状态进入载入中。
    const hold = gate.gate(tilesetPath)
    try {
      await renderScene(sceneB)
      await vi.waitFor(() => {
        expect(gate.calls.length).toBe(2)
      })
      expect(noteText()).toContain('载入中')
      expect(gate.completed).toEqual([tilesetPath])

      // 在途时切回 start：同一 tileset 读取也被闸住（第三进入、仍零完成增量）。
      await renderScene(sceneA)
      await vi.waitFor(() => {
        expect(gate.calls.length).toBe(3)
      })
      expect(gate.completed).toEqual([tilesetPath])
    } finally {
      hold.resolve()
    }

    // 放行后两条读取都真实完成；当前归属是 start（21%），迟到的 map-b（8×8 → 30%）不得覆盖。
    await vi.waitFor(() => {
      expect(noteText()).not.toContain('载入中')
    })
    expect(gate.completed).toEqual([tilesetPath, tilesetPath, tilesetPath])
    expect(noteText()).toContain(zoomA)
    expect(noteText()).not.toContain(zoomB)
  })
})
