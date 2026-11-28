// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, test, vi } from 'vitest'
import { loadLegalProject } from '../__tests__/cursor-asset-r1/kit.js'
import { CopyActorCommand } from '../core/actor-commands.js'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { UpdateLevelUpCommand } from '../core/level-up-commands.js'
import { UpdateLocaleCommand } from '../core/locale-commands.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { AddSkillCommand } from '../core/skill-commands.js'
import { ActorMode } from './ActorMode.js'

vi.mock('./BattleSpriteInlinePreview.js', () => ({ BattleSpriteInlinePreview: () => null }))

async function withActorWorkspace(
  run: (
    host: HTMLElement,
    session: EditSession,
    render: (section?: string) => Promise<void>,
  ) => Promise<void>,
): Promise<void> {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  vi.stubGlobal('Blob', (await new Response().blob()).constructor)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)

  try {
    const { source, state, assetBase } = await loadLegalProject('actor-growth-summary')
    const session = new EditSession(state)
    const render = async (section?: string) => {
      const current = session.getState()
      assertProjectSaveValid(current)
      await act(async () => {
        root.render(
          <ActorMode
            actors={current.actors}
            sprites={current.sprites}
            battleSprites={current.battleSprites}
            items={Object.fromEntries(current.items.map((item) => [item.id, item]))}
            skills={Object.fromEntries(current.skills.map((skill) => [skill.id, skill]))}
            locale={current.locale}
            assetBase={assetBase}
            session={session}
            assetCatalog={current.assetCatalog}
            assetReader={createEditorAssetReader(source, () => session.getState())}
            levelUp={current.levelUp}
            focusActorId={current.actors.at(-1)?.id}
            focusSection={section}
            referenceIndex={collectCurrentProjectReferenceIndex(current)}
            referenceStatus="current"
            getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
          />,
        )
      })
    }
    await run(host, session, render)
  } finally {
    try {
      await act(async () => root.unmount())
    } finally {
      host.remove()
      vi.unstubAllGlobals()
    }
  }
}

test.each([
  { description: 'an absent entry', hasRows: false, expected: '升级习得0 项' },
  { description: 'registered learning rows', hasRows: true, expected: '升级习得2 项' },
])('growth summary displays $description correctly', async ({ hasRows, expected }) => {
  await withActorWorkspace(async (host, session, render) => {
    session.dispatch(new CopyActorCommand('hero', 'constructor', 'name.hero'))
    if (hasRows) {
      session.dispatch(new AddSkillCommand('walk', '疾步'))
      session.dispatch(new AddSkillCommand('run', '飞步'))
      session.dispatch(
        new UpdateLevelUpCommand('constructor', [
          { level: 3, skillId: 'walk' },
          { level: 5, skillId: 'run' },
        ]),
      )
    }
    await render()
    const growth = [...host.querySelectorAll('.actor-summary-lines span')].find((entry) =>
      entry.textContent?.startsWith('升级习得'),
    )
    expect(growth?.textContent).toBe(expected)
  })
})

test('undo of another edit discards an uncommitted stat draft', async () => {
  await withActorWorkspace(async (host, session, render) => {
    session.dispatch(new UpdateLocaleCommand('name.hero', '编辑中的主角'))
    await render('battle')
    const input = host.querySelector<HTMLInputElement>('input[aria-label="当前体力"]')
    if (!input) throw new Error('actor HP field is missing')
    const initial = input.value
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    if (!setter) throw new Error('native input setter is missing')

    await act(async () => {
      input.focus()
      setter.call(input, '41')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(input.value).toBe('41')

    expect(session.undo()).toBe(true)
    await render('battle')
    expect(input.value).toBe(initial)
  })
})
