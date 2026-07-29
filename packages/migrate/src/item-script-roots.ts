import type { Command, ItemData } from '@type-pal/content'

/**
 * 把物品能力中的共享脚本引用提升为审计执行根。
 *
 * 仅做一层 callScript 桥接，依赖闭包仍由统一脚本审计器解析；必须传最终 overlay 后的
 * ItemData，确保作者覆盖新增/移除的脚本引用与运行时看到的是同一真值。
 */
export function itemScriptCommandRoots(
  items: readonly ItemData[],
): Array<{ id: string; body: Command[] }> {
  return items.flatMap((item) =>
    (item.use?.effects ?? []).flatMap((effect, index) =>
      effect.kind === 'runScript'
        ? [
            {
              id: `global/items/${item.id}/use-${index}`,
              body: [{ kind: 'callScript' as const, ref: effect.script }],
            },
          ]
        : [],
    ),
  )
}
