/** TEST-CURSOR-PURE-WAVE-1 C 包：合法空白/试炼项目经正式 loader 与保存门。 */
import type { AuthorCommand, AuthorItemData, AuthorSceneDef, ItemData } from '@type-pal/content'
import { fsaSource, loadAllAuthorScenes, loadCurrentProjectFrom } from '@type-pal/reforge'
import { assertProjectSaveValid } from '../project-diagnostics.js'
import { toEditorState } from '../project-io.js'
import { ScriptEditSession } from '../script-editor.js'
import { buildBlankProject } from '../seed.js'
import { memoryAuthorDirectory } from './author-save-fixture.js'
import { battleTrialProjectFiles, fixtureSource } from './battle-trial-project.js'
import { stageFlow } from './scene-reference-fixture.js'

export function inputSnap<T>(value: T): T {
  return structuredClone(value)
}

function legalItem(id: string): AuthorItemData {
  return {
    id,
    name: id,
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
  }
}

const loopHasItem: AuthorCommand = {
  kind: 'loop',
  mode: 'while',
  cond: { kind: 'hasItem', itemId: 'target-herb' },
  body: [{ kind: 'wait', ms: 1 }],
}

/** 空白项目 + 两件合法物品 + onEnter loop(hasItem)；经 loader / 保存门。 */
export async function saveGatedLoopHasItemProject() {
  const disk = memoryAuthorDirectory(await buildBlankProject('cursor-pure-c01'))
  const start: AuthorSceneDef = disk.json('content/scenes/start.json')
  start.hooks = {
    onEnter: {
      variants: {
        main: {
          label: '入口方案',
          order: 0,
          flow: stageFlow([loopHasItem]),
        },
      },
    },
  }
  disk.set('content/scenes/start.json', start)
  disk.set('content/items.json', [legalItem('target-herb'), legalItem('sibling-herb')])
  const locale = disk.json('content/locale.json') as Record<string, string>
  disk.set('content/locale.json', {
    ...locale,
    'target-herb': '目标药草',
    'sibling-herb': '旁路药草',
  })
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const state = toEditorState(project, scenes, {}, {}, [])
  const canonical = new ScriptEditSession({
    scenes,
    items: project.authorContent.items,
    sharedScripts: project.authorContent.sharedScripts,
  }).getStateSnapshot()
  assertProjectSaveValid(state)
  return { state, canonical }
}

/** 试炼项目在 trial-sword 上追加 grantSkill(trial-spark)；再经 loader / 保存门。 */
export async function saveGatedGrantSkillProject() {
  const files = await battleTrialProjectFiles()
  const items = files['content/items.json'] as ItemData[]
  const sword = items.find((item) => item.id === 'trial-sword')
  if (!sword?.equip) throw new Error('试炼项目缺 trial-sword 装备合同')
  sword.equip.effects.push({ kind: 'grantSkill', skillId: 'trial-spark' })
  const source = fixtureSource(files)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const state = toEditorState(project, scenes, {}, {}, [])
  assertProjectSaveValid(state)
  return { state }
}
