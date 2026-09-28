import { useEffect, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import { UpdateActorCommand } from '../../../../packages/editor/src/core/commands.js'
import { EditSession } from '../../../../packages/editor/src/core/edit-session.js'
import { loadLegalUiProject } from '../../../../packages/editor/src/ui/__tests__/glm-leaf-workflows/legal-session.js'
import '../../../../packages/editor/src/ui/design-system/index.css'
import '../../../../packages/editor/src/ui/editor.css'
import { CasualtyEditor } from '../../../../packages/editor/src/ui/CasualtyEditor.js'

// 直挂组件宿主（非完整 App）：真实 CasualtyEditor + 合法项目会话 + 真实命令种子。

const legal = await loadLegalUiProject('glm-leaf-casualty-host')
const session = new EditSession(legal.state)
const hero = session.getState().actors[0]!
session.dispatch(
  new UpdateActorCommand(hero.id, {
    battler: {
      ...hero.battler!,
      casualty: {
        friendDeath: {
          gates: [
            {
              chance: 40,
              branch: { lines: [{ text: 'name.hero', style: 'bottom' }], effects: [] },
            },
          ],
          fallback: { lines: [], effects: [] },
        },
        dying: {
          gates: [],
          fallback: { lines: [{ text: 'name.hero', style: 'bottom' }], effects: [] },
        },
      },
    },
  }),
)

function Harness() {
  useSyncExternalStore(
    (callback) => session.subscribe(callback),
    () => session.getVersion(),
  )
  const current = session.getState()
  const actor = current.actors.find((candidate) => candidate.id === hero.id)!
  return (
    <CasualtyEditor
      actor={actor as typeof actor & { battler: NonNullable<typeof actor.battler> }}
      session={session}
      locale={current.locale}
      onClose={() => undefined}
    />
  )
}

function StatusBar() {
  const [snap, _setSnap] = usePendingSnap()
  return (
    <p>
      <button type="button" data-undo onClick={() => session.undo()}>
        撤销（真实 session.undo）
      </button>
      <output data-session>{snap}</output>
    </p>
  )
}

function usePendingSnap() {
  const [snap, setSnap] = useState('')
  useEffect(
    () =>
      session.subscribe(() => {
        setSnap(
          JSON.stringify({
            version: session.getHistoryVersion(),
            casualty: session.getState().actors[0]?.battler?.casualty,
          }),
        )
      }),
    [],
  )
  return [snap, setSnap] as const
}

createRoot(document.getElementById('root')!).render(
  <main>
    <Harness />
    <StatusBar />
  </main>,
)
