/** GLM Wave G 隔离 battle trial 视觉宿主：真实 runBattleTrial + 真实 pal 工程（HTTP source）。 */

import { parseBattleTrialConfig } from '../../../../../../../../packages/reforge/src/battle-trial-config.js'
import { runBattleTrial } from '../../../../../../../../packages/reforge/src/battle-trial-host.js'
import { battleTrialRevision } from '../../../../../../../../packages/reforge/src/battle-trial-prepare.js'
import { httpSource } from '../../../../../../../../packages/reforge/src/file-source.js'
import { loadCurrentProjectFrom } from '../../../../../../../../packages/reforge/src/project-loader.js'
import { assertProjectSaveReadable } from '../../../../../../../../packages/reforge/src/project-save-state.js'

const pageStatus = document.getElementById('page-status')
if (!pageStatus) throw new Error('page status node missing')

const note = (text: string): void => {
  pageStatus.textContent += `\n[${new Date().toISOString()}] ${text}`
}

window.addEventListener('error', (event) => note(`page error: ${event.message}`))
window.addEventListener('unhandledrejection', (event) => {
  note(`page rejection: ${String(event.reason)}`)
})

async function boot(): Promise<void> {
  const source = httpSource('/projects/pal')
  const project = await loadCurrentProjectFrom(source)
  note(`project loaded: ${project.manifest.name}`)
  const token = await assertProjectSaveReadable(source)
  const revision = await battleTrialRevision(project)
  const config = parseBattleTrialConfig({
    party: {
      members: [
        {
          actorId: 'li-xiaoyao',
          stats: { attack: 9999, speed: 999 },
          equipment: {},
          skills: { kind: 'inherit' },
          hp: { kind: 'full' },
          mp: { kind: 'full' },
        },
      ],
    },
    enemies: { kind: 'team', teamId: 'team-0' },
    bag: { items: [] },
    fieldId: 6,
    music: { kind: 'silent' },
    money: 9999,
    auto: false,
    boss: false,
  })
  note('starting isolated battle trial…')
  void runBattleTrial(project, config, {
    signal: new AbortController().signal,
    sourceToken: token,
    revision,
    onRestart: () => {
      throw new Error('重启失败注入（视觉取证）')
    },
    onResult: (result) => note(`onResult: ${result}`),
  }).then(
    () => note('runBattleTrial settled'),
    (error) =>
      note(`runBattleTrial rejected: ${error instanceof Error ? error.message : String(error)}`),
  )
}

void boot().catch((error: unknown) =>
  note(`boot failed: ${error instanceof Error ? error.message : String(error)}`),
)
