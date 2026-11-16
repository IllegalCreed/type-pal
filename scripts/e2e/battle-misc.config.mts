import ts from 'typescript'
import game from './battle-game.config.mts'
import reforge from './battle-reforge.config.mts'

const engine = process.env.Q2_MISC_ENGINE
if (engine !== 'game' && engine !== 'reforge') throw new Error('Q2_MISC_ENGINE is required')
const base = engine === 'game' ? game : reforge
const isGame = engine === 'game'
const target = isGame
  ? '/packages/game/src/present/menu/draw-player-status.ts'
  : '/packages/reforge/src/menu/menu-box.ts'
const renderer = isGame ? 'drawPlayerStatus' : 'renderMemberStatus'

export default {
  ...base,
  plugins: [
    ...base.plugins,
    {
      name: 'q2-battle-misc-status-paint',
      apply: 'serve' as const,
      enforce: 'pre' as const,
      transform(code: string, id: string) {
        const file = id.split('?')[0]?.replaceAll('\\', '/')
        if (!file?.endsWith(target)) return null
        const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
        const bodies: ts.Block[] = []
        const visit = (node: ts.Node) => {
          if (
            (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
            node.name?.getText(source) === renderer &&
            node.body
          )
            bodies.push(node.body)
          ts.forEachChild(node, visit)
        }
        visit(source)
        const body = bodies[0]
        if (bodies.length !== 1 || !body) throw new Error(`${renderer} paint anchor changed`)
        const observe = isGame
          ? '{ id: roleId, hp: gs.PlayerRolesRuntime.rgwHP[roleId], mp: gs.PlayerRolesRuntime.rgwMP[roleId], portrait: Boolean(portrait) }'
          : '{ id: c.template, hp: c.hp, mp: c.mp, portrait: Boolean(avatar) }'
        const end = body.end - 1
        return {
          code: `${code.slice(0, end)}\n  globalThis.__battleMiscStatusPaint?.(${observe})\n${code.slice(end)}`,
          map: null,
        }
      },
    },
  ],
}
