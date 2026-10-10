/** Exact coordinate conversion only; it does not decide a comparison verdict. */
export function canonicalPosition(position) {
  if (!Array.isArray(position) || position.length < 2) return null
  if (position.length >= 3) return [Number(position[0]), Number(position[1])]
  return [
    (Number(position[0]) / 16 + Number(position[1]) / 8) / 2,
    (Number(position[1]) / 8 - Number(position[0]) / 16) / 2,
  ]
}
