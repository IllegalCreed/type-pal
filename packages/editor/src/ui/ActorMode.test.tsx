// @vitest-environment jsdom
import type { ActorDef, CasualtyScript } from '@type-pal/content'
import { act, useMemo, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { blockingActorReferenceMap } from '../core/actor-references.js'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import type {
  EditorDerivedStore,
  EditorDerivedStoreSnapshot,
} from '../core/editor-derived-store.js'
import { ScriptEditSession } from '../core/script-editor.js'
import { ActorMode } from './ActorMode.js'
import { verifyInspectorTabs } from './inspector-tabs-test-utils.js'
import type { SemanticFrameGroup } from './SpriteFrameWorkbench.js'

vi.mock('./BattleSpriteInlinePreview.js', () => ({
  BattleSpriteInlinePreview: (props: {
    definition?: { id: string; label: string }
    expected?: string
    semanticGroups?: readonly SemanticFrameGroup[]
    showPrimaryPreview?: boolean
  }) => (
    <div
      data-testid="battle-sprite-inline-preview"
      data-definition-id={props.definition?.id}
      data-expected={props.expected}
      data-show-primary={String(props.showPrimaryPreview)}
      data-actions={JSON.stringify(
        props.semanticGroups?.[0]?.rows.map(({ label, frames, loopFrom }) => ({
          label,
          frames,
          loopFrom,
        })) ?? [],
      )}
    >
      {props.definition?.label}
    </div>
  ),
}))

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
})

afterEach(() => {
  act(() => root?.unmount())
  host.remove()
  vi.unstubAllGlobals()
})

const script: CasualtyScript = {
  gates: [
    { chance: 75, branch: { lines: [{ text: 'dlg.talk.0', style: 'bottom' }], effects: [] } },
  ],
  fallback: { lines: [], effects: [] },
}

function actors(): ActorDef[] {
  return [
    {
      id: 'hero',
      name: 'name.hero',
      spriteId: 'hero-sprite',
      battler: {
        battleSprite: 'hero-battle-sprite',
        baseStats: {
          level: 1,
          hp: 100,
          maxHP: 100,
          mp: 10,
          maxMP: 10,
          attack: 5,
          defense: 5,
          magicAttack: 5,
          speed: 5,
          luck: 5,
        },
        initialEquipment: {},
        initialMagic: [],
        coveredBy: undefined,
        cooperativeMagicSkillId: undefined,
        casualty: { friendDeath: script },
      },
    },
    {
      id: 'guard',
      name: 'name.guard',
      spriteId: 'guard-sprite',
      battler: {
        battleSprite: 'guard-battle-sprite',
        baseStats: {
          level: 1,
          hp: 100,
          maxHP: 100,
          mp: 10,
          maxMP: 10,
          attack: 5,
          defense: 5,
          magicAttack: 5,
          speed: 5,
          luck: 5,
        },
        initialEquipment: {},
        initialMagic: [],
      },
    },
  ]
}

function state(actorsList: ActorDef[]): EditorState {
  return {
    manifest: {
      id: 'test',
      name: '测试项目',
      contentVersion: 19,
      minimumSaveVersion: 8,
      defaultEntryId: 'main',
      content: {},
      entryPoints: [
        {
          id: 'main',
          label: '主要入口',
          scene: 'scene-a',
          startWorld: { party: [], money: 0, inventory: [] },
        },
      ],
      assets: { catalog: 'assets/index.json', roles: {} },
    },
    scenes: [],
    actors: actorsList,
    skills: [{ id: '99', name: '测试仙术', effects: [] } as never],
    levelUp: {},
    items: [],
    locale: { 'dlg.talk.0': '你好', 'name.hero': '主角', 'name.guard': '守护者' },
    sprites: [],
    battleSprites: [],
    maps: {},
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    scriptChunks: {},
    stamps: [],
    shops: [],
    poisons: [],
  } as unknown as EditorState
}

function spritePreviewReader(): EditorAssetReader {
  return {
    record: vi.fn((id: string) => ({
      kind: 'sprite',
      path: `assets/${id}.sprite`,
      mediaType: 'application/octet-stream',
      bytes: 0,
      sha256: id,
      origin: { kind: 'authored' },
    })),
    readBytes: vi.fn(async () => {
      throw new Error('本测试不加载精灵像素')
    }),
  } as unknown as EditorAssetReader
}

function Harness(props: {
  session: EditSession
  assetReader?: EditorAssetReader
  onOpenSprite?: (id: string) => void
  referenceStatus?: EditorDerivedStatus
  referenceIndex?: ReturnType<typeof blockingActorReferenceMap>
  getCurrentAuthorState?: () => EditorState | undefined
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const scriptSession = useMemo(
    () => new ScriptEditSession({ scenes: [], items: [], sharedScripts: {} }),
    [],
  )
  const referenceData = {
    statusIssues: [],
    projectIssues: [],
    sceneEntryReferences: [],
    entityAddressReferences: [],
    assetReferences: [],
    assetDiagnostics: [],
    actorReferenceIndex: [...(props.referenceIndex ?? blockingActorReferenceMap(current))] as never,
    itemReferenceIndex: [],
    poisonReferenceIndex: [],
    worldVariableReferences: { all: [], byId: new Map() },
    canonicalBehaviorReferences: [],
    canonicalSceneHookReferences: [],
  }
  const revision = {
    mainHistoryVersion: props.session.getHistoryVersion(),
    scriptHistoryVersion: scriptSession.getHistoryVersion(),
  }
  const referenceStatus = props.referenceStatus ?? 'current'
  const snapshot: EditorDerivedStoreSnapshot =
    referenceStatus === 'current'
      ? { status: 'current', revision, data: referenceData }
      : referenceStatus === 'failed'
        ? {
            status: 'failed',
            targetRevision: revision,
            message: '测试诊断失败',
            lastKnown: { revision, data: referenceData },
          }
        : referenceStatus === 'checking'
          ? { status: 'checking', targetRevision: revision }
          : {
              status: 'stale',
              targetRevision: revision,
              lastKnown: { revision, data: referenceData },
            }
  const derivedStore = useMemo<EditorDerivedStore>(
    () => ({
      start: () => () => undefined,
      retry: () => undefined,
      subscribe: () => () => false,
      getSnapshot: () => snapshot,
    }),
    [snapshot],
  )
  return (
    <ActorMode
      actors={current.actors}
      sprites={current.sprites}
      battleSprites={current.battleSprites}
      items={Object.fromEntries(current.items.map((i) => [i.id, i]))}
      skills={Object.fromEntries(current.skills.map((sk) => [sk.id, sk]))}
      locale={current.locale}
      assetBase={{} as never}
      session={props.session}
      assetCatalog={current.assetCatalog}
      assetReader={props.assetReader ?? ({} as EditorAssetReader)}
      onOpenSprite={props.onOpenSprite}
      levelUp={current.levelUp}
      derivedStore={derivedStore}
      scriptSession={scriptSession}
      getCurrentAuthorState={props.getCurrentAuthorState ?? (() => props.session.getState())}
    />
  )
}

function button(text: string): HTMLButtonElement {
  return [...document.querySelectorAll<HTMLButtonElement>('button')].find((candidate) =>
    candidate.textContent?.includes(text),
  )!
}

function comboboxByLabel(label: string): HTMLButtonElement {
  const fieldLabel = [...document.querySelectorAll<HTMLLabelElement>('label')].find(
    (node) => node.textContent?.trim() === label,
  )
  expect(fieldLabel?.htmlFor, `label ${label}`).toBeTruthy()
  const control = document.getElementById(fieldLabel!.htmlFor)
  expect(control?.getAttribute('role'), `combobox for ${label}`).toBe('combobox')
  return control as HTMLButtonElement
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

async function commitInput(input: HTMLInputElement, value: string): Promise<void> {
  await act(async () => setInputValue(input, value))
  await act(async () =>
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
  )
}

describe('ActorMode 初始状态唯一所有权', () => {
  test('角色页直接编辑 initialMagic，且单次操作可撤销', async () => {
    const session = new EditSession(state(actors()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await act(async () => button('战斗与成长').click())
    expect(host.textContent).not.toContain('直接启动入口技能')
    await act(async () => button('添加初始仙术').click())
    expect(session.getState().actors[0]!.battler!.initialMagic).toEqual(['99'])
    await act(async () => button('移除').click())
    expect(session.getState().actors[0]!.battler!.initialMagic).toEqual([])
    await act(async () => session.undo())
    expect(session.getState().actors[0]!.battler!.initialMagic).toEqual(['99'])
    await act(async () => session.undo())
    expect(session.getState().actors[0]!.battler!.initialMagic).toEqual([])
  })

  test('当前值与最大值分别编辑，改最大值不覆盖当前值', async () => {
    const session = new EditSession(state(actors()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await act(async () => button('战斗与成长').click())
    const currentHp = host.querySelector<HTMLInputElement>('input[aria-label="当前体力"]')!
    const maxHp = host.querySelector<HTMLInputElement>('input[aria-label="最大体力"]')!
    await commitInput(currentHp, '80')
    await commitInput(maxHp, '120')
    expect(session.getState().actors[0]!.battler!.baseStats).toMatchObject({ hp: 80, maxHP: 120 })
  })

  test('战斗形象显示全部语义动作预览，并随选择同步换绑', async () => {
    const current = state(actors())
    const profile = {
      kind: 'player-fighter' as const,
      frames: {
        idle: 0,
        dying: 1,
        dead: 2,
        defend: 3,
        hurt: 4,
        preMagic: 5,
        magic: 6,
        attackWindup: 7,
        attackRush: 8,
        attackStrike: 9,
        steal: 10,
      },
      castEffectBase: 15,
      attackEffectBase: 0,
    }
    current.battleSprites = [
      {
        id: 'hero-battle-sprite',
        label: '主角战斗精灵',
        asset: 'battle-sprite.hero',
        profile,
      },
      {
        id: 'guard-battle-sprite',
        label: '守护者战斗精灵',
        asset: 'battle-sprite.guard',
        profile: structuredClone(profile),
      },
    ] as never
    const session = new EditSession(current)
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await act(async () => button('战斗与成长').click())

    const preview = (): HTMLElement =>
      host.querySelector<HTMLElement>('[data-testid="battle-sprite-inline-preview"]')!
    expect(preview().dataset.definitionId).toBe('hero-battle-sprite')
    expect(preview().dataset.expected).toBe('player-fighter')
    expect(preview().dataset.showPrimary).toBe('false')
    expect(preview().textContent).toBe('主角战斗精灵')
    expect(JSON.parse(preview().dataset.actions ?? '[]')).toEqual([
      { label: '待机', frames: [0] },
      { label: '普通攻击', frames: [7, 8, 9, 0], loopFrom: 0 },
      { label: '施法', frames: [5, 6, 0], loopFrom: 0 },
      { label: '防御', frames: [3] },
      { label: '受伤', frames: [4, 0], loopFrom: 0 },
      { label: '濒死', frames: [1] },
      { label: '死亡', frames: [2] },
      { label: '偷窃', frames: [10, 0], loopFrom: 0 },
    ])

    const picker = host.querySelector<HTMLButtonElement>(
      '[role="combobox"][aria-label="角色战斗精灵"]',
    )!
    await act(async () => picker.click())
    const listbox = document.getElementById(picker.getAttribute('aria-controls')!)
    const guardOption = [...listbox!.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent?.includes('守护者战斗精灵'),
    )
    expect(guardOption).toBeDefined()
    await act(async () => {
      guardOption!.click()
      await Promise.resolve()
    })

    expect(session.getState().actors[0]!.battler!.battleSprite).toBe('guard-battle-sprite')
    expect(preview().dataset.definitionId).toBe('guard-battle-sprite')
    expect(preview().textContent).toBe('守护者战斗精灵')
  })
})

describe('ActorMode 战斗关系节 (E18-1)', () => {
  test('角色检查器只保留摘要与引用，不重复主工作区分区导航', async () => {
    const session = new EditSession(state(actors()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await verifyInspectorTabs(host, '角色检查器', ['摘要', /^引用 \d+$/])
    expect(host.querySelector('[role="group"][aria-label="角色编辑分区"]')).toBeNull()
    expect(host.querySelector('.actor-summary-panel')?.textContent).not.toContain('编辑分区')
    const nameId = host.querySelector<HTMLElement>('.ds-overflow-text.ds-inspector-readonly')
    expect(nameId?.tagName).toBe('CODE')
    expect(nameId?.textContent).toBe(session.getState().actors[0]?.name)
  })

  test('默认主工作区是角色总览；行走帧只在外观资源分区出现', async () => {
    const session = new EditSession(state(actors()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    expect(host.querySelector('[role="tab"][aria-selected="true"]')?.textContent).toBe('总览')
    expect(host.querySelector('.actor-dashboard-grid')).not.toBeNull()
    expect(host.querySelector('.actor-frame-card')).toBeNull()
    expect(host.querySelector('[aria-label="行走精灵"]')).toBeNull()
    const panels = [...host.querySelectorAll('.actor-card')]
    expect(panels.length).toBeGreaterThan(0)
    expect(panels.every((panel) => panel.classList.contains('ds-workbench-section'))).toBe(true)
    expect(host.querySelector('.actor-card-head')).toBeNull()

    await act(async () => button('外观资源').click())
    expect(host.querySelector('.actor-frame-card')).not.toBeNull()
    expect(host.textContent).toContain('行走图与动作帧')
    expect(host.textContent).toContain('选择角色使用的行走精灵')
    expect(comboboxByLabel('行走精灵')).not.toBeNull()
    expect(host.textContent).not.toContain('点任意帧可替换')
    expect(host.textContent).not.toContain('追加帧')
    expect(host.textContent).not.toContain('删除末帧')
  })

  test('外观资源是行走精灵唯一换绑入口，换绑、打开资源与撤销重做使用同一引用', async () => {
    const current = state(actors())
    current.sprites = [
      {
        id: 'hero-sprite',
        label: '主角行走图',
        asset: 'sprite.hero',
        layout: { kind: 'directional', framesPerDir: 3 },
      },
      {
        id: 'guard-sprite',
        label: '守护者行走图',
        asset: 'sprite.guard',
        layout: { kind: 'directional', framesPerDir: 3 },
      },
    ]
    const onOpenSprite = vi.fn()
    const assetReader = spritePreviewReader()
    const session = new EditSession(current)
    await act(async () => {
      root = createRoot(host)
      root.render(
        <Harness session={session} assetReader={assetReader} onOpenSprite={onOpenSprite} />,
      )
    })

    expect(host.querySelector('[aria-label="行走精灵"]')).toBeNull()
    await act(async () => button('外观资源').click())
    const combobox = comboboxByLabel('行走精灵')
    expect(combobox.textContent).toContain('主角行走图')
    expect(combobox.textContent).toContain('hero-sprite')

    await act(async () => combobox.click())
    const listbox = document.getElementById(combobox.getAttribute('aria-controls')!)
    const guardOption = [...listbox!.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent?.includes('守护者行走图'),
    )
    expect(guardOption).toBeDefined()
    await act(async () => guardOption!.click())
    expect(session.getState().actors[0]!.spriteId).toBe('guard-sprite')
    expect(comboboxByLabel('行走精灵').textContent).toContain('guard-sprite')
    expect(assetReader.record).toHaveBeenLastCalledWith('sprite.guard', 'sprite')

    await act(async () => button('在资源库编辑').click())
    expect(onOpenSprite).toHaveBeenCalledWith('guard-sprite')

    await act(async () => session.undo())
    expect(session.getState().actors[0]!.spriteId).toBe('hero-sprite')
    await act(async () => session.redo())
    expect(session.getState().actors[0]!.spriteId).toBe('guard-sprite')
  })

  test('外观资源可把缺失的行走精灵引用修复为注册表中的精灵', async () => {
    const currentActors = actors()
    currentActors[0] = { ...currentActors[0]!, spriteId: 'missing-sprite' }
    const current = state(currentActors)
    current.sprites = [
      {
        id: 'guard-sprite',
        label: '守护者行走图',
        asset: 'sprite.guard',
        layout: { kind: 'directional', framesPerDir: 3 },
      },
    ]
    const onOpenSprite = vi.fn()
    const session = new EditSession(current)
    await act(async () => {
      root = createRoot(host)
      root.render(
        <Harness
          session={session}
          assetReader={spritePreviewReader()}
          onOpenSprite={onOpenSprite}
        />,
      )
    })

    await act(async () => button('外观资源').click())
    const combobox = comboboxByLabel('行走精灵')
    expect(combobox.textContent).toContain('missing-sprite')
    expect(combobox.textContent).toContain('当前引用缺失')
    expect(button('在资源库编辑').disabled).toBe(true)

    await act(async () => combobox.click())
    const listbox = document.getElementById(combobox.getAttribute('aria-controls')!)
    const repairOption = [...listbox!.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent?.includes('守护者行走图'),
    )
    await act(async () => repairOption!.click())
    expect(session.getState().actors[0]!.spriteId).toBe('guard-sprite')
    expect(button('在资源库编辑').disabled).toBe(false)
    await act(async () => button('在资源库编辑').click())
    expect(onOpenSprite).toHaveBeenCalledWith('guard-sprite')

    await act(async () => session.undo())
    expect(session.getState().actors[0]!.spriteId).toBe('missing-sprite')
    expect(button('在资源库编辑').disabled).toBe(true)
  })

  test('角色列表与标题优先显示战斗小头像，未配置时回退人物占位', async () => {
    const currentActors = actors()
    currentActors[0] = { ...currentActors[0]!, face: 'face.hero' }
    currentActors[1] = {
      ...currentActors[1]!,
      portraits: { default: 'portrait.guard-dialog' },
    }
    currentActors.push({ id: 'npc', name: 'name.npc', spriteId: 'npc-sprite' })
    const current = state(currentActors)
    current.locale['name.npc'] = '路人'
    current.assetCatalog.assets['face.hero'] = {
      kind: 'face',
      path: 'assets/faces/hero.png',
      mediaType: 'image/png',
      bytes: 1,
      sha256: 'face-revision',
      origin: { kind: 'authored' },
    }
    const readBytes = vi.fn(async () => new Uint8Array([1]).buffer)
    const assetReader = {
      readBytes,
      record: () => current.assetCatalog.assets['face.hero']!,
    } as unknown as EditorAssetReader
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:face.hero'),
      revokeObjectURL: vi.fn(),
    })
    const session = new EditSession(current)

    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} assetReader={assetReader} />)
      await Promise.resolve()
      await Promise.resolve()
    })

    const faceAvatars = host.querySelectorAll('.actor-avatar--face')
    expect(faceAvatars).toHaveLength(2)
    expect(
      [...faceAvatars].every((avatar) => avatar.querySelector('img')?.src === 'blob:face.hero'),
    ).toBe(true)
    expect(readBytes).toHaveBeenCalledWith('face.hero', 'face')
    expect(readBytes).not.toHaveBeenCalledWith('portrait.guard-dialog', 'portrait')
    expect(host.querySelector('.actor-avatar--catalog.actor-avatar--fallback')?.textContent).toBe(
      '🧑',
    )
    expect(
      [...host.querySelectorAll('.actor-avatar--catalog.actor-avatar--fallback')].some(
        (avatar) => avatar.textContent === '👤',
      ),
    ).toBe(true)

    await act(async () => button('守护者').click())
    expect(host.querySelector('.actor-avatar--hero.actor-avatar--fallback')?.textContent).toBe('🧑')
  })

  test('三字段区域渲染:援护者/合体技下拉 + 伤亡脚本 chip 派生自 state', async () => {
    const session = new EditSession(state(actors()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await act(async () => button('关系与脚本').click())
    expect(host.textContent).toContain('援护者')
    expect(host.textContent).toContain('合体技')
    expect(host.textContent).toContain('队友阵亡已配置')
    expect(host.textContent).toContain('自己濒死未配置')
  })

  test('援护者下拉选择 → 即时写回 session state', async () => {
    const session = new EditSession(state(actors()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await act(async () => button('关系与脚本').click())
    const combobox = comboboxByLabel('援护者')
    await act(async () => combobox.click())
    const listbox = document.getElementById(combobox.getAttribute('aria-controls')!)
    expect(listbox?.getAttribute('role')).toBe('listbox')
    const guardOption = [...listbox!.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (option) => option.textContent?.trim() === '守护者 (guard)',
    )
    expect(guardOption).toBeDefined()
    await act(async () => guardOption!.click())
    expect(session.getState().actors[0]!.battler!.coveredBy).toBe('guard')
  })

  test('✎ 编辑伤亡脚本 → 中区展开 CasualtyEditor;编辑曲线 → 互斥切走(G1)', async () => {
    const session = new EditSession(state(actors()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await act(async () => button('关系与脚本').click())
    await act(async () => button('编辑伤亡脚本').click())
    expect(host.textContent).toContain('伤亡脚本 · hero')
    expect(host.textContent).toContain('概率分支')
    await act(async () => button('完成').click())
    await act(async () => button('战斗与成长').click())
    expect(button('📈 编辑曲线(中区拖点)')).toBeTruthy()
    await act(async () => button('📈 编辑曲线(中区拖点)').click())
    // 中区互斥:曲线编辑器展开后,伤亡脚本编辑器不再渲染。
    expect(host.textContent).not.toContain('概率门')
    expect(host.textContent).toContain('按增量生成')
  })

  test('移除队友阵亡槽 → chip 变未配置 + 键删除;两槽全移除 → casualty undefined(K4)', async () => {
    const session = new EditSession(state(actors()))
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await act(async () => button('关系与脚本').click())
    await act(async () => button('移除队友阵亡').click())
    expect(session.getState().actors[0]!.battler!.casualty?.friendDeath).toBeUndefined()
    expect(host.textContent).toContain('队友阵亡未配置')
    expect(session.getState().actors[0]!.battler!.casualty).toBeUndefined()
  })
})

describe('ActorMode 人物预制 CRUD', () => {
  test('空人物库可创建第一名 NPC，并以单次 undo 移除 Actor + locale', async () => {
    const current = state([])
    current.sprites = [
      {
        id: 'npc-sprite',
        label: 'NPC 精灵',
        asset: 'sprite.npc',
        layout: { kind: 'static' },
      },
    ]
    const session = new EditSession(current)
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="新建人物"]')!.click())
    const id = host.querySelector<HTMLInputElement>('[aria-label="新人物 ID"]')!
    const name = host.querySelector<HTMLInputElement>('[aria-label="新人物显示名称"]')!
    await act(async () => {
      setInputValue(id, 'wine-sage')
      setInputValue(name, '酒剑仙')
    })
    await act(async () => button('创建').click())
    expect(session.getState().actors).toEqual([
      { id: 'wine-sage', name: 'name.wine-sage', spriteId: 'npc-sprite' },
    ])
    expect(session.getState().locale['name.wine-sage']).toBe('酒剑仙')
    await act(async () => session.undo())
    expect(session.getState().actors).toEqual([])
    expect(session.getState().locale['name.wine-sage']).toBeUndefined()
  })

  test('复制人物会复制 levelUp，删除无引用副本会联动清理', async () => {
    const current = state([{ id: 'hero', name: 'name.hero', spriteId: 'hero-sprite' }])
    current.sprites = [
      {
        id: 'hero-sprite',
        label: '主角精灵',
        asset: 'sprite.hero',
        layout: { kind: 'static' },
      },
    ]
    current.levelUp = { hero: [{ level: 8, skillId: '99' }] }
    const session = new EditSession(current)
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[aria-label="复制当前人物"]')!.click(),
    )
    await act(async () => button('复制').click())
    expect(session.getState().actors.some((entry) => entry.id === 'hero-copy')).toBe(true)
    expect(session.getState().levelUp['hero-copy']).toEqual([{ level: 8, skillId: '99' }])
    expect(button('删除人物').closest('.ds-object-hero__actions')).not.toBeNull()
    expect(button('删除人物').closest('.actor-reference-section')).toBeNull()
    await act(async () => button('删除人物').click())
    expect(session.getState().actors.some((entry) => entry.id === 'hero-copy')).toBe(false)
    expect(session.getState().levelUp['hero-copy']).toBeUndefined()
  })

  test('被场景预制实例引用时显示可定位引用并拒绝删除', async () => {
    const current = state(actors())
    current.scenes = [
      {
        id: 'scene-a',
        mapId: 'map-a',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [{ id: 'hero-instance', pos: { col: 1, row: 1, height: 0 }, actor: 'hero' }],
      },
    ]
    const session = new EditSession(current)
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} />)
    })
    expect(host.textContent).toContain('1 处引用会阻断删除')
    expect(host.querySelector('.actor-reference-section .ds-reference-row')?.tagName).toBe(
      'ARTICLE',
    )
    expect(host.textContent).toContain('scenes[0](scene-a).entities[0](hero-instance).actor')
    expect(button('删除人物').disabled).toBe(true)
    expect(button('删除人物').title).toBe('仍有 1 处引用，请先从右侧处理')
    await act(async () => button('删除人物').click())
    expect(session.getState().actors.some((entry) => entry.id === 'hero')).toBe(true)
    expect(host.querySelector('[role="alert"]')).toBeNull()
  })

  test('快照过期时禁删，点击边界出现新引用时仍 fail-closed', async () => {
    const current = state([{ id: 'hero', name: 'name.hero', spriteId: 'hero-sprite' }])
    const session = new EditSession(current)
    await act(async () => {
      root = createRoot(host)
      root.render(<Harness session={session} referenceStatus="stale" />)
    })
    expect(button('删除人物').disabled).toBe(true)
    expect(button('删除人物').title).toContain('引用仍在检查')

    const currentAuthor = structuredClone(current)
    currentAuthor.scenes = [
      {
        id: 'live-scene',
        mapId: 'live-map',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [{ id: 'live', pos: { col: 1, row: 1, height: 0 }, actor: 'hero' }],
      },
    ]
    await act(async () => {
      root.render(
        <Harness
          session={session}
          referenceStatus="current"
          referenceIndex={new Map()}
          getCurrentAuthorState={() => currentAuthor}
        />,
      )
    })
    expect(button('删除人物').disabled).toBe(false)
    await act(async () => button('删除人物').click())
    expect(session.getState().actors.some((actor) => actor.id === 'hero')).toBe(true)
    expect(host.textContent).toContain('live-scene / 实体 live')
  })
})
