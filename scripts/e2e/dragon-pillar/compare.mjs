import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { recompareBoundStory } from '../bound-story-comparison.mjs'
import { readEvidenceArtifact } from '../evidence-artifact.mjs'
import { compareCollapse } from './compare-collapse.mjs'
import { card, fragment, party, scope } from './contract.mjs'
import { compareGallery, galleryEvidence } from './gallery.mjs'
import { comparePartyTurns, partyTurnEvidence } from './party-turns.mjs'
import { proofSources, readSpecialProofs } from './special-proof.mjs'

async function readSide(path, engine) {
  const directory = dirname(path)
  const reportFile = await readEvidenceArtifact(directory, { path: basename(path) })
  const { value: report } = reportFile
  assert.equal(report.engine, engine)
  assert([fragment, 'cliff-sage-foreground'].includes(report.fragment), 'unrelated recording')
  assert.equal(report.predecessor?.kind, 'canonical-world-save-fixture')
  const [sample] = report.cases
  if (report.fragment === fragment) {
    assert.equal(report.admission.scope, scope)
    assert.equal(report.admission.workflow.card, card)
    for (const { path, sha256 } of report.admission.workflow.documents)
      assert.equal(report.hashes[path], sha256, 'execution did not bind the opened document')
  }
  const [trace, interlude, continuous, palette, ...others] = await Promise.all(
    [
      sample.raw,
      sample.interlude,
      sample.partyRenders,
      sample.partyPalette.collapse,
      sample.collapse,
      report.save,
      sample.foregroundSage,
    ].map((ref) => (ref ? readEvidenceArtifact(directory, ref) : Promise.resolve(null))),
  )
  const files = [trace, interlude, continuous, palette, ...others].filter(Boolean)
  const image = palette.value.image
  assert.equal(basename(image.path), 'party-palette-collapse-cue.png')
  const png = await readFile(resolve(directory, image.path))
  assert.equal(png.byteLength, image.bytes)
  assert.equal(createHash('sha256').update(png).digest('hex'), image.sha256)
  assert(
    files.every(({ binding }) => binding.status === 'verified'),
    'recording evidence hash or byte count missing',
  )
  return {
    report,
    palette: palette.value,
    files: [
      reportFile,
      ...files,
      { path: resolve(directory, image.path), sha256: image.sha256, byteLength: image.bytes },
    ].map(({ path, sha256, byteLength }) => ({
      path,
      sha256,
      byteLength,
    })),
    party: partyTurnEvidence(trace.value, engine, continuous?.value),
    gallery: galleryEvidence(interlude.value, engine),
  }
}

export async function recomparePillar(root, gamePath, reforgePath) {
  const [game, reforge] = await Promise.all([
    readSide(resolve(gamePath), 'game'),
    readSide(resolve(reforgePath), 'reforge'),
  ])
  return recompareBoundStory({
    root,
    fragment,
    scope,
    recordings: [game, reforge],
    semanticPaths: [
      ...proofSources,
      card,
      'AGENTS.md',
      'docs/testing/e2e/contract.md',
      'data/extracted/events/all.json',
      'projects/pal/content/scenes/s144.json',
      'projects/pal/content/scenes/s149.json',
      'projects/pal/content/scenes/s150.json',
    ],
    async compare() {
      const [collapse, special] = await Promise.all([
        compareCollapse(gamePath, reforgePath),
        readSpecialProofs(root, gamePath, reforgePath),
      ])
      const turns = comparePartyTurns(game.party, reforge.party)
      const redPaletteFindings = []
      for (const [side, engine] of [
        [game, 'game'],
        [reforge, 'reforge'],
      ]) {
        const rows = side.palette.rows
        assert.equal(side.palette.details.scene, 's144')
        for (const [slot, id] of party.entries()) {
          const swatch = rows.find((row) => row.id === id && row.slot === slot)
          const expected = [534, 532, 533][slot]
          if (
            !swatch ||
            Number(String(swatch.spriteId).replace(/^sprite-/u, '')) !== expected ||
            swatch.reds < swatch.opaque * 0.45 ||
            swatch.visibleReds < swatch.reds * 0.8
          )
            redPaletteFindings.push({
              type: 'wrong-party-appearance-in-red-hallway',
              engine,
              id,
              expected,
              swatch,
            })
        }
      }
      return {
        findings: [
          ...turns.findings,
          ...redPaletteFindings,
          ...compareGallery(game.gallery, reforge.gallery),
          ...special.findings,
          ...collapse.differences.map((finding) => ({ ...finding, type: 'collapse-presentation' })),
        ],
        party: { game: game.party, reforge: reforge.party, explainedAssets: turns.explainedAssets },
        gallery: { game: game.gallery, reforge: reforge.gallery },
        collapse,
        interlude: special.interlude,
        sage: special.sage,
      }
    },
  })
}
