/** Full archives cross the browser boundary in their persisted JSON representation.
 * Playwright's recursive object transport is disproportionately expensive for repeated
 * world snapshots. This changes serialization only: no fields, samples or resources are filtered.
 * Live decisions must still use small projections, not this archive export.
 */
export async function readEvidenceArchive(page, reader) {
  const bytes = await page.evaluate((name) => {
    if (typeof window[name] !== 'function') throw new Error(`missing evidence reader: ${name}`)
    return JSON.stringify(window[name]())
  }, reader)
  return JSON.parse(bytes)
}
