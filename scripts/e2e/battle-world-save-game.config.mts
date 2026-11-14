import assert from 'node:assert/strict'
import base from './battle-world-bee-game.config.mts'

const saves = {
  name: 'game-world-save-evidence',
  apply: 'serve' as const,
  enforce: 'pre' as const,
  transform(source: string, id: string) {
    const path = id.split('?')[0]
    if (path?.endsWith('/packages/game/src/core/menu/menu-driver.ts')) {
      const anchor = 'await Save.saveSlot(slot, gs)'
      assert.equal(source.split(anchor).length, 2, 'Game manual save commit anchor changed')
      return source.replace(anchor, `${anchor}\n          globalThis.__q2SaveWritten?.(slot)`)
    }
    if (path?.endsWith('/packages/game/src/tools/toast.ts')) {
      const anchor = "el.style.transform = 'translateY(0)'"
      assert.equal(source.split(anchor).length, 2, 'Game shown-toast anchor changed')
      return source.replace(anchor, `${anchor}\n  globalThis.__q2SaveToast?.(message)`)
    }
    if (path?.endsWith('/packages/game/src/shell/bootstrap.ts')) {
      const anchor = 'globalThis.__beeGameRestored?.(gs);'
      const absent = `      console.warn(\`[bootstrap.loadGame] slot \${slot} 空,load skip\`)`
      assert.equal(source.split(anchor).length, 2, 'Game after-load anchor changed')
      assert.equal(source.split(absent).length, 2, 'Game missing-slot guard changed')
      return source
        .replace(anchor, `${anchor}\nglobalThis.__q2SaveRestored?.(slot);`)
        .replace(absent, `${absent}\n      globalThis.__q2SaveAbsent?.(slot)`)
    }
    return null
  },
}

export default { ...base, plugins: [...base.plugins, saves] }
