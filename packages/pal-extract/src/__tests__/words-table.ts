/** 最小完整 Words 表（flat/system/battleUi 为必填段，本组测试只消费具名段）。 */
export function makeWords(
  over: Partial<{ items: string[]; spells: string[]; persons: string[]; enemies: string[] }> = {},
) {
  return {
    items: over.items ?? [],
    spells: over.spells ?? [],
    persons: over.persons ?? [],
    enemies: over.enemies ?? [],
    scenes: [],
    flat: [],
    system: [],
    battleUi: [],
  }
}
