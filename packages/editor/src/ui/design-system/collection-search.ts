/** Shared threshold: collections with 81+ filtered options use a bounded virtual window. */
export const DS_OPTION_VIRTUALIZE_ABOVE = 80

export function filterDsCollection<T>(
  items: readonly T[],
  query: string,
  getSearchParts: (item: T) => readonly (string | number | null | undefined)[],
): readonly T[] {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return items
  return items.filter((item) =>
    getSearchParts(item).some((part) =>
      part == null ? false : String(part).toLocaleLowerCase().includes(needle),
    ),
  )
}
