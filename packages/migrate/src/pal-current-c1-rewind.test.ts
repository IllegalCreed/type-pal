import { beforeEach, describe, expect, test, vi } from 'vitest'
import type { MigrationSnapshot } from './migration-baseline.js'

const mocks = vi.hoisted(() => ({
  b2Publication: vi.fn(),
  b2Project: vi.fn(),
  c1NpcPublication: vi.fn(),
  c1NpcProject: vi.fn(),
  c1DialoguePublication: vi.fn(),
  c1DialogueProject: vi.fn(),
}))

vi.mock('./pal-b2-battle-field-domain.js', () => ({
  rewindPublishedB2BattleFieldDomainIfPresent: mocks.b2Publication,
  rewindPublishedB2BattleFieldProjectAgainstPublishedBaseline: mocks.b2Project,
}))

vi.mock('./pal-c1-npc-curation-transition.js', () => ({
  rewindPublishedC1NpcCurationIfPresent: mocks.c1NpcPublication,
  rewindPublishedC1NpcProjectAgainstPublishedBaseline: mocks.c1NpcProject,
}))

vi.mock('./pal-c1-dialogue-identity.js', () => ({
  rewindPublishedC1DialogueIdentityIfPresent: mocks.c1DialoguePublication,
  rewindPublishedC1ProjectAgainstPublishedBaseline: mocks.c1DialogueProject,
}))

import {
  rewindCurrentC1ProjectToW9,
  rewindCurrentC1PublicationToW9,
} from './pal-current-c1-rewind.js'

function snapshot(id: string): MigrationSnapshot {
  return {
    files: new Map([['id.json', id]]),
    managedFiles: new Set(['id.json']),
    hashes: new Map(),
  }
}

const manifest = { contentVersion: 14 } as never
const manifestRawText = '{"contentVersion":14}\n'

beforeEach(() => vi.resetAllMocks())

describe('current C1 rewind choke point', () => {
  test('publication always folds B2 before C1-3 and C1-2', () => {
    const current = snapshot('current')
    const b2Parent = snapshot('b2-parent')
    const dialogueParent = snapshot('dialogue-parent')
    const w9 = snapshot('w9')
    mocks.b2Publication.mockReturnValue(b2Parent)
    mocks.c1NpcPublication.mockReturnValue(dialogueParent)
    mocks.c1DialoguePublication.mockReturnValue(w9)
    expect(
      rewindCurrentC1PublicationToW9({ source: current, manifest, manifestRawText }),
    ).toBe(w9)
    expect(mocks.c1NpcPublication).toHaveBeenCalledWith({
      source: b2Parent,
      manifest,
      manifestRawText,
    })
    expect(mocks.c1DialoguePublication).toHaveBeenCalledWith(dialogueParent, manifest)
    expect(mocks.c1DialoguePublication.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.c1NpcPublication.mock.invocationCallOrder[0]!,
    )
    expect(mocks.c1NpcPublication.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.b2Publication.mock.invocationCallOrder[0]!,
    )
  })

  test('project folds the B2 pair and C1-3 pair before handing C1-2 to its project rewind', () => {
    const project = snapshot('project')
    const baseline = snapshot('baseline')
    const projectB2 = snapshot('project-b2')
    const baselineB2 = snapshot('baseline-b2')
    const projectC1 = snapshot('project-c1')
    const baselineC1 = snapshot('baseline-c1')
    const projectW9 = snapshot('project-w9')
    mocks.b2Project.mockReturnValue(projectB2)
    mocks.b2Publication.mockReturnValue(baselineB2)
    mocks.c1NpcProject.mockReturnValue(projectC1)
    mocks.c1NpcPublication.mockReturnValue(baselineC1)
    mocks.c1DialogueProject.mockReturnValue(projectW9)
    expect(
      rewindCurrentC1ProjectToW9({
        project,
        publishedBaseline: baseline,
        manifest,
        manifestRawText,
      }),
    ).toBe(projectW9)
    expect(mocks.c1NpcProject).toHaveBeenCalledWith({
      project: projectB2,
      publishedBaseline: baselineB2,
      manifest,
      manifestRawText,
    })
    expect(mocks.c1NpcPublication).toHaveBeenCalledWith({
      source: baselineB2,
      manifest,
      manifestRawText,
    })
    expect(mocks.c1DialogueProject).toHaveBeenCalledWith(projectC1, baselineC1)
    const finalOrder = mocks.c1DialogueProject.mock.invocationCallOrder[0]!
    expect(mocks.c1NpcProject.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.b2Project.mock.invocationCallOrder[0]!,
    )
    expect(finalOrder).toBeGreaterThan(mocks.c1NpcProject.mock.invocationCallOrder[0]!)
    expect(finalOrder).toBeGreaterThan(mocks.c1NpcPublication.mock.invocationCallOrder[0]!)
  })
})
