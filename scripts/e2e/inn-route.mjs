import assert from 'node:assert/strict'

export const INN_DIRECTIONS = Object.freeze([
  { key: 'ArrowLeft', col: -1, row: 0 },
  { key: 'ArrowDown', col: 0, row: 1 },
  { key: 'ArrowRight', col: 1, row: 0 },
  { key: 'ArrowUp', col: 0, row: -1 },
])

/** Plan ordinary keys over immutable map data. The engine still decides/commits every actual step. */
export function planInnRoute(map, start, destination, actors = []) {
  assert.equal(map.version, 4)
  const toCell = (col, row) => ({ col: Math.floor((col - row) / 2), row: col + row })
  const blocked = (col, row) => {
    const cell = toCell(col, row)
    return (
      cell.col < 0 ||
      cell.col >= map.width ||
      cell.row < 0 ||
      cell.row >= map.height * 2 ||
      map.collision[cell.row]?.[cell.col] !== 0 ||
      actors.some((a) => a.collide && a.col === col && a.row === row)
    )
  }
  const key = (col, row) => `${col},${row}`,
    queue = [{ col: start[0], row: start[1], path: [] }],
    seen = new Set([key(...start)])
  for (let i = 0; i < queue.length; i++) {
    assert(i < 32768, 'route search overflow')
    const at = queue[i]
    if (destination(at.col, at.row)) return at.path
    for (const d of INN_DIRECTIONS) {
      const col = at.col + d.col,
        row = at.row + d.row,
        k = key(col, row)
      if (seen.has(k) || blocked(col, row)) continue
      seen.add(k)
      queue.push({ col, row, path: [...at.path, d.key] })
    }
  }
  throw new Error('no normal collision-safe inn route')
}
