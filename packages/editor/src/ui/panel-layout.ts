export function clampPanelSize(value: number, min: number, max: number): number {
  const lower = Math.max(0, Math.round(min))
  const upper = Math.max(lower, Math.round(max))
  if (!Number.isFinite(value)) return lower
  return Math.min(upper, Math.max(lower, Math.round(value)))
}

export function fitSidePanelWidths(options: {
  available: number
  left: number
  right: number
  leftMin: number
  rightMin: number
}): { left: number; right: number } {
  const available = Math.max(0, Math.round(options.available))
  const left = Math.max(0, Math.round(options.left))
  const right = Math.max(0, Math.round(options.right))
  if (left + right <= available) return { left, right }

  const leftMin = Math.min(left, Math.max(0, Math.round(options.leftMin)))
  const rightMin = Math.min(right, Math.max(0, Math.round(options.rightMin)))
  const minTotal = leftMin + rightMin
  if (minTotal >= available) {
    if (minTotal === 0) return { left: 0, right: 0 }
    const fittedLeft = Math.round((available * leftMin) / minTotal)
    return { left: fittedLeft, right: available - fittedLeft }
  }

  const flexible = available - minTotal
  const leftExtra = left - leftMin
  const rightExtra = right - rightMin
  const extraTotal = leftExtra + rightExtra
  if (extraTotal === 0) return { left: leftMin, right: rightMin }

  const fittedLeft = leftMin + Math.round((flexible * leftExtra) / extraTotal)
  return { left: fittedLeft, right: available - fittedLeft }
}
