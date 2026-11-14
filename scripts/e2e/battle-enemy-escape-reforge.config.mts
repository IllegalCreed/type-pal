import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import base from '../../packages/reforge/vite.config.ts'

function replaceOnce(source: string, anchor: string, replacement: string): string {
  assert.equal(source.split(anchor).length, 2, `Reforge enemy escape anchor changed: ${anchor}`)
  return source.replace(anchor, replacement)
}

function after(source: string, anchor: string, observation: string): string {
  return replaceOnce(source, anchor, `${anchor}\n${observation}`)
}

export default {
  ...base,
  cacheDir: fileURLToPath(
    new URL('../../build/e2e/vite-battle-enemy-escape-reforge', import.meta.url),
  ),
  plugins: [
    ...base.plugins,
    {
      name: 'reforge-native-enemy-escape',
      apply: 'serve' as const,
      enforce: 'pre' as const,
      transform(source: string, id: string) {
        const file = id.split('?')[0]?.split('/packages/reforge/src/').at(-1)
        switch (file) {
          case 'main.ts': {
            const touch =
              "    if (runner) return\n    const triggerOwnerId =\n      key.startsWith('s:') || key.startsWith('hostile:') ? null : (selfId ?? key)"
            const drawn = '    if (showingGameOver) return'
            const moving = '            player.pos = { ...playerOutcome.to }'
            const battleDrawn = '      battleHost.active.render(ctx, WORLD_SCALE)'
            const routed = after(
              source,
              touch,
              '    globalThis.__enemyEscape?.entry(activeScene.scene.id, triggerOwnerId, player.pos)',
            )
            const moved = after(
              routed,
              moving,
              '            if (playerMoved && inputDirection) globalThis.__enemyEscape?.move(player.pos)',
            )
            return after(
              after(moved, drawn, '    globalThis.__enemyEscape?.reforgeWorld(false)'),
              battleDrawn,
              '      globalThis.__enemyEscape?.reforgeWorld(true)',
            )
          }
          case 'battle/battle-launch-preparation.ts':
            return after(
              source,
              '    const fieldId = options?.fieldId ?? ports.readScene().battleFieldId ?? 24',
              "    globalThis.__enemyEscape?.event('field', {field: fieldId})",
            )
          case 'battle/battle-host.ts': {
            const setup = '    const { sessionAssets, sessionOptions } = prepared.commit()'
            const finishNormal = '    this.ports.finishWorld(session, result)'
            const seeded = replaceOnce(
              source,
              '      Math.random,',
              `      globalThis.__enemyEscape?.rng.next ?? Math.random,`,
            )
            return after(
              after(seeded, setup, `    globalThis.__enemyEscape?.event('battle-start', {team})`),
              finishNormal,
              `    globalThis.__enemyEscape?.event('finalize', {outcome: result, rewards: session.rewards()})`,
            )
          }
          case 'battle/battle-session.ts': {
            const start =
              '  private renderInner(ctx: CanvasRenderingContext2D, worldScale: number): void {'
            const render = '    const dialogActive = this.assets.dialogBox?.active ?? false'
            const sound = "        this.requestTerminal('enemyFled')"
            const hook = "      case 'fleeBattle': {"
            const drawing = after(source, start, '    globalThis.__enemyEscape?.beginFrame()')
            return after(
              after(
                after(
                  drawing,
                  render,
                  '    globalThis.__enemyEscape?.reforgeFrame(s, this.fleeingEnemies, this.pendingTerminal)',
                ),
                hook,
                `        globalThis.__enemyEscape?.event('escape-hook', { hp: this.state.enemies.map(e => e?.hp) })`,
              ),
              sound,
              `        globalThis.__enemyEscape?.event('terminal-request', {result: this.pendingTerminal.result})`,
            )
          }
          case 'battle/present-battle.ts': {
            const draw = '    const dy = Math.round(draw.y - f.height)'
            return after(
              source,
              draw,
              `    const slot = scene.enemies.indexOf(draw)
    if (slot >= 0) globalThis.__enemyEscape?.fighter({slot, x: draw.x, y: draw.y, frame: draw.frame, width: f.width, firstWidth: draw.sprite.frames[0].width})`,
            )
          }
          case 'audio/sfx.ts': {
            const actual = after(
              source,
              '      source.start()',
              `      const asset = escapeSoundAssets.get(onended)
      if (asset) globalThis.__enemyEscape?.sound(asset, context.state, source.buffer)`,
            )
            return `const escapeSoundAssets = new WeakMap();\n${replaceOnce(
              actual,
              '      source = this.adapter.play(buffer, ended)',
              `      escapeSoundAssets.set(ended, asset)\n      source = this.adapter.play(buffer, ended)`,
            )}`
          }
          default:
            return null
        }
      },
    },
  ],
}
