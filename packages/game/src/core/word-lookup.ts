/**
 * WORD.DAT 词表查询 —— sdlpal `PAL_GetWord(wNumWord)`(text.c)的 ts 等价。
 *
 * sdlpal 运行时按真 WORD id 从 WORD.DAT 取词(菜单文案、状态标签、物品/法术名前缀等全程用)。
 * ts 侧词表来自 extracted/lookup/words.json 的 `flat[]`(565 条全 dump,**index = 真 WORD id**,
 * 由 pal-extract io/word.ts 产出)。bootstrap 启动 loadAll 后 setWordTable(words.flat) 注入。
 *
 * 模块级单例:菜单/UI 在 getWord(id) 处按真 id 取文案,**WORD.DAT 成为唯一文案源**(替代各处硬编码)。
 * fallback 入参 = resilience:words.json 加载失败 / 表未就绪时退化到调用方的默认串(同 bootstrap glyphs→tofu
 * 容错模式),保证菜单不致空白;表一旦载入即以 flat[id] 为准。
 */

let _wordTable: readonly string[] = []

/** 注入 WORD.DAT 词表(words.json 的 flat[]);bootstrap loadAll 后调一次。 */
export function setWordTable(flat: readonly string[]): void {
  _wordTable = flat
}

/**
 * 取第 id 个 WORD（sdlpal PAL_GetWord(id)）。表已载且该项非空 → 返回 flat[id];
 * 否则返回 fallback（缺省空串）。
 */
export function getWord(id: number, fallback = ''): string {
  const w = _wordTable[id]
  return w !== undefined && w !== '' ? w : fallback
}
