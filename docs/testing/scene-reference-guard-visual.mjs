// Prepare an ignored memory-only project entry for Codex's browser verification; no product edits.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const output = join(root, 'packages/editor/build')
mkdirSync(output, { recursive: true })
writeFileSync(
  join(output, 'scene-ref-verify.html'),
  `<!doctype html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>D-02 隔离功能验证</title></head><body><div id="root"></div><script type="module" src="/build/scene-ref-verify.tsx"></script></body></html>
`,
)
writeFileSync(
  join(output, 'scene-ref-verify.tsx'),
  `
import React from 'react'
import { createRoot } from 'react-dom/client'
import { sceneGuardFixture, transitionFlow } from '../src/core/__tests__/scene-reference-fixture.js'
import { observeAuthorSource } from '../src/core/author-disk-baseline.js'
import { createSandboxWorkspaceContext } from '../src/core/workspace-context.js'
import { App } from '../src/ui/App.js'
import '../src/ui/design-system/index.css'
import '../src/ui/editor.css'
import '../src/ui/design-system/form-scope.css'
const flow = transitionFlow()
if (flow.kind !== 'stateMachine') throw new Error('test flow')
flow.machine.states.one!.body = [
  { kind: 'selectSceneHooks', scene: 'target', selection: { onEnter: { kind: 'disabled' } } },
  { kind: 'selectSceneHooks', scene: 'target', selection: { onTeleport: { kind: 'inherit' } } },
]
const f = await sceneGuardFixture(flow)
const observed = observeAuthorSource(f.source)
for (const path of f.disk.files.keys()) await observed.source.readBytes(path)
const authorBaseline = await observed.finish(f.project, f.disk.dir)
const workspace = createSandboxWorkspaceContext(f.project.manifest.id, 'ui-samples')
createRoot(document.getElementById('root')!).render(<App session={f.main} history={f.history} project={f.project} script={{session:f.script}} authorBaseline={authorBaseline} workspace={workspace} forceSandbox />)
`,
)
console.log('Use the existing editor dev server, or pnpm --filter @type-pal/editor run dev.')
console.log(
  'Open http://localhost:6010/build/scene-ref-verify.html (memory-only fixture, real App/worker).',
)
