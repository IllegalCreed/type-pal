import ts from 'typescript'
import { expect, test, vi } from 'vitest'
import reforgeConfig from '../../../reforge/vite.config.ts?raw'
import editorConfig from '../../vite.config.ts?raw'

type Response = {
  statusCode: number
  setHeader: ReturnType<typeof vi.fn>
  removeHeader: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
}
type Middleware = (request: { url: string }, response: Response, next: () => void) => void
function route(source: string, stat: () => { isFile(): boolean }) {
  const ast = ts.createSourceFile(
    'vite.config.ts',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  )
  const fn = ast.statements.find(
    (node) => ts.isFunctionDeclaration(node) && node.name?.text === 'serveDir',
  )
  if (!fn) throw new Error('missing production serveDir')
  const js = ts.transpileModule(fn.getText(ast), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.None },
  }).outputText
  const pipe = vi.fn(),
    statSync = vi.fn(stat)
  const factory = new Function(
    'statSync',
    'resolve',
    'createReadStream',
    `${js}; return serveDir;`,
  )(
    statSync,
    (base: string, path: string) => `${base}/${path}`,
    () => ({ pipe }),
  ) as (
    prefix: string,
    dir: string,
  ) => { configureServer(server: unknown): void; configurePreviewServer(server: unknown): void }
  const plugin = factory('/projects', '/project-fixture')
  return { plugin, pipe, statSync }
}

for (const [name, source] of [
  ['editor', editorConfig],
  ['reforge', reforgeConfig],
]) {
  for (const phase of ['configureServer', 'configurePreviewServer'] as const) {
    test(`${name} ${phase}: missing recovery JSON is 404, not SPA HTML`, () => {
      const r = route(source!, () => {
        throw Object.assign(new Error('missing'), { code: 'ENOENT' })
      })
      let mw!: Middleware
      r.plugin[phase]({
        middlewares: {
          use: (value: Middleware) => {
            mw = value
          },
        },
      })
      const response = { statusCode: 200, setHeader: vi.fn(), removeHeader: vi.fn(), end: vi.fn() },
        next = vi.fn()
      mw({ url: '/projects/pal/.type-pal/save-state.json?probe=1' }, response, next)
      expect(response.statusCode).toBe(404)
      expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
      expect(response.end).toHaveBeenCalledOnce()
      expect(next).not.toHaveBeenCalled()
    })
    test(`${name} ${phase}: present recovery JSON is noncached JSON`, () => {
      const r = route(source!, () => ({ isFile: () => true }))
      let mw!: Middleware
      r.plugin[phase]({
        middlewares: {
          use: (value: Middleware) => {
            mw = value
          },
        },
      })
      const response = { statusCode: 200, setHeader: vi.fn(), removeHeader: vi.fn(), end: vi.fn() },
        next = vi.fn()
      mw({ url: '/projects/pal/.type-pal/save-state.json' }, response, next)
      expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store')
      expect(response.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/json; charset=utf-8',
      )
      expect(r.pipe).toHaveBeenCalledWith(response)
      expect(next).not.toHaveBeenCalled()
    })
    test.each([
      'EACCES',
      'EIO',
      'ENOTDIR',
      'directory',
    ])(`${name} ${phase}: %s is not a missing record`, (code) => {
      const r = route(source!, () => {
        if (code === 'directory') return { isFile: () => false }
        throw Object.assign(new Error('failed'), { code })
      })
      let mw!: Middleware
      r.plugin[phase]({
        middlewares: {
          use: (value: Middleware) => {
            mw = value
          },
        },
      })
      const response = { statusCode: 200, setHeader: vi.fn(), removeHeader: vi.fn(), end: vi.fn() },
        next = vi.fn()
      mw({ url: '/projects/pal/.type-pal/save-state.json' }, response, next)
      expect(response.statusCode).toBe(500)
      expect(response.end).toHaveBeenCalledOnce()
      expect(next).not.toHaveBeenCalled()
    })
  }
}
