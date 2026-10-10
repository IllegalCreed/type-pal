import { isDeepStrictEqual as same } from 'node:util'
import { verifyDialoguePresentation } from './dialogue-presentation-contract.mjs'
import { checkTransitionTrace, requireTrace } from './trace-refinement.mjs'

const causes = (trace) =>
  [...(trace.initialCauses ?? []), ...(trace.causes ?? [])].sort((a, b) => a.order - b.order)

/** Receipts must refer to an earlier actual dispatch, not merely carry a copied command.
 * The observer attaches the current occurrence of each run to every subsequent receipt.
 * Repeated source IPs are legal; occurrence IDs, unlike IPs, identify executions.
 */
export function checkOccurrenceLineage(trace) {
  const proof = checkTransitionTrace(
    {
      id: 'command-receipt-lineage/v2',
      initial: { runs: {}, occurrences: {}, lastId: 0, commands: 0, receipts: 0, order: -1 },
      // Entries and their canonical evidence are never edited by this model. Only
      // the two indexes and scalar counters change; deep-copying history per receipt
      // makes long traces quadratic in the size of authored command bodies.
      copyState: (s) => ({ ...s, runs: { ...s.runs }, occurrences: { ...s.occurrences } }),
      transitions: {
        cause: (s, e) => {
          requireTrace(e.order > s.order, 'causal-order', `>${s.order}`, e.order)
          s.order = e.order
          if (!e.occurrence) {
            requireTrace(
              e.phase !== 'command',
              'dispatch-occurrence',
              'occurrence',
              null,
              'unknown',
            )
            requireTrace(
              !s.runs[e.runId],
              'receipt-occurrence-present',
              s.runs[e.runId]?.occurrence,
              e.occurrence,
            )
            return s
          }
          requireTrace(e.runId != null, 'dispatch-owner', 'run identity', e.runId, 'unknown')
          if (e.phase === 'command') {
            requireTrace(
              Number.isSafeInteger(e.occurrence.id) && e.occurrence.id > s.lastId,
              'fresh-occurrence',
              `>${s.lastId}`,
              e.occurrence.id,
            )
            s.lastId = e.occurrence.id
            s.runs[e.runId] = Object.freeze({
              occurrence: e.occurrence,
              order: e.order,
              runId: e.runId,
            })
            s.occurrences[e.occurrence.id] = s.runs[e.runId]
            s.commands++
          } else {
            const retained =
              e.engine === 'reforge' &&
              [
                'wait-start',
                'wait-pause',
                'wait-resume',
                'wait-end',
                'io-start',
                'io-wake',
                'io-end',
                'dialogue',
                'gate-wait',
                'gate-ready',
                'gate-rejected',
              ].includes(e.phase)
            const dispatch = retained ? s.occurrences[e.occurrence.id] : s.runs[e.runId]
            requireTrace(
              dispatch &&
                dispatch.runId === e.runId &&
                dispatch.order < e.order &&
                same(dispatch.occurrence, e.occurrence),
              'receipt-after-dispatch',
              dispatch ?? 'preceding dispatch in this run',
              { order: e.order, occurrence: e.occurrence },
            )
            s.receipts++
          }
          return s
        },
      },
      accept: (s) =>
        requireTrace(
          s.commands > 0 && s.receipts > 0,
          'causal-evidence',
          'dispatches and receipts',
          s,
          'unknown',
        ),
    },
    causes(trace).map(({ order, phase, occurrence, runId, engine }) => ({
      type: 'cause',
      order,
      phase,
      occurrence,
      runId,
      engine,
    })),
  )
  return proof.status === 'proved'
    ? {
        model: proof.model,
        status: proof.status,
        commands: proof.final.commands,
        receipts: proof.final.receipts,
      }
    : proof
}

/** Text-only projection of the source control alphabet (not a timing/color oracle).
 * Production parseDialogText is exercised against this independent projection in tests.
 */
export function sourceDialogueText(raw) {
  const chars = [...raw]
  let out = ''
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    if (ch === '~') break
    if (ch === '$') i += 2
    else if (ch === '\\') out += chars[++i] ?? ''
    else if (!['-', "'", '@', '"', '(', ')'].includes(ch)) out += ch
  }
  return out
}

function displayedLines(dialogue, slot) {
  if (!dialogue) return []
  const lines = [...dialogue.lines]
  if (dialogue.text !== null && (slot === 'narration' || dialogue.chars >= dialogue.text.length))
    lines.push(dialogue.text)
  return lines
}

/** Logical dialogue -> actual full-line page -> consumption. No fabricated per-rAF clock.
 * Uses observer snapshots independent of the page being checked, plus actual world draws.
 * Auto narration needs a display witness but does not invent an input-consumption event.
 */
export function checkGameDialogueCausality(trace, { pagePolicy = 'consecutive' } = {}) {
  const events = [
    // Full-slot draws have their own presentation contract; they are not interpreter
    // transitions and must not replace the active page's latest execution state.
    ...causes(trace)
      .filter((event) => event.phase !== 'dialogue-presentation')
      .map(({ order, phase, dialogue, runId, scene, sceneVisit, occurrence, result, channel }) => ({
        type: 'cause',
        order,
        phase,
        dialogue,
        runId,
        scene,
        sceneVisit,
        occurrence,
        result,
        channel,
      })),
    ...(trace.worldRenders ?? []).map(({ order, scene, sceneVisit, renderId }) => ({
      type: 'draw',
      order,
      scene,
      sceneVisit,
      renderId,
    })),
    ...(trace.pages ?? []).map(({ order, scene, sceneVisit, page }) => ({
      type: 'page',
      order,
      scene,
      sceneVisit,
      page,
    })),
  ].sort((a, b) => a.order - b.order)
  const proof = checkTransitionTrace(
    {
      id: 'game-dialogue-causality/v1',
      initial: {
        latest: null,
        draw: null,
        shown: null,
        commands: [],
        pages: 0,
        consumptions: 0,
        nodes: [],
        groups: [],
        pending: null,
        seen: [],
        previous: null,
        // Game initializes at Upper; PAL_EndDialog restores Upper at a completed
        // trigger boundary. An auto end or an attempted end with an open page
        // does not prove that boundary.
        slot: 'top',
        pendingSlot: null,
        endRun: null,
      },
      transitions: {
        cause: (s, e) => {
          requireTrace(!s.pending, 'dialogue-first-draw-coverage', s.pending, {
            nextCause: e.order,
          })
          if (e.phase === 'dialog-input' && ['page-advance', 'dialog-end'].includes(e.result)) {
            const before = s.latest
            const expected = displayedLines(before?.dialogue, s.shown?.slot)
            requireTrace(
              expected.length > 0 &&
                s.shown &&
                same(s.shown.lines, expected) &&
                (pagePolicy !== 'instance' ||
                  (s.shown.instance === before?.dialogue?.instance &&
                    s.shown.sceneVisit === before?.sceneVisit)) &&
                s.shown.order < e.order &&
                s.shown.runId === e.runId,
              'dialogue-display-before-consume',
              { lines: expected, runId: e.runId },
              s.shown,
            )
            s.consumptions++
            s.groups.at(-1).consumed = e.order
          }
          if (e.phase === 'command' && e.occurrence?.command?.op === 'showDialog')
            s.commands.push({
              order: e.order,
              runId: e.runId,
              row: e.occurrence.command.messageIndex,
              text: sourceDialogueText(e.occurrence.command.text),
            })
          if (e.phase === 'command' && e.channel !== 'auto')
            s.endRun = e.occurrence?.command?.op === 'end' ? e.runId : null
          if (e.phase === 'event-after' && e.runId === null && e.dialogue === null && s.endRun) {
            s.slot = 'top'
            s.pendingSlot = null
            s.endRun = null
          }
          const style =
            e.phase === 'command' &&
            {
              setDialogStyleTop: 'top',
              setDialogStyleCenter: 'center',
              setDialogStyleBottom: 'bottom',
              setDialogStyleNarration: 'narration',
            }[e.occurrence?.command?.op]
          if (style) s.pendingSlot = style
          // A style command may first suspend for the old page's confirmation.
          // It takes effect only at the observed cleared body, not at the attempt.
          if (
            (!e.dialogue || (!e.dialogue.lines.length && e.dialogue.text === null)) &&
            s.pendingSlot
          ) {
            s.slot = s.pendingSlot
            s.pendingSlot = null
          }
          if (!e.dialogue || (!e.dialogue.lines.length && e.dialogue.text === null)) s.shown = null
          s.latest = e
          return s
        },
        draw: (s, e) => {
          requireTrace(!s.pending, 'dialogue-first-draw-coverage', s.pending, { nextDraw: e.order })
          requireTrace(
            ['global-body-dedup', 'consecutive', 'instance'].includes(pagePolicy),
            'dialogue-observer-profile',
            'declared dedup profile',
            pagePolicy,
            'unknown',
          )
          s.draw = e
          const lines = displayedLines(s.latest?.dialogue, s.slot)
          if (lines.length && pagePolicy === 'instance')
            requireTrace(
              Number.isSafeInteger(s.latest?.dialogue?.instance) && s.latest.dialogue.instance > 0,
              'dialogue-instance-evidence',
              'native page lifecycle identity',
              s.latest?.dialogue,
              'unknown',
            )
          const signature =
            pagePolicy === 'instance'
              ? JSON.stringify([e.sceneVisit, s.latest?.dialogue?.instance, s.slot, lines])
              : JSON.stringify([e.scene, lines])
          const seen =
            pagePolicy === 'global-body-dedup'
              ? s.seen.includes(signature)
              : s.previous === signature
          if (lines.length && !seen) s.pending = { draw: e.order, lines }
          s.previous = signature
          if (!s.seen.includes(signature)) s.seen.push(signature)
          return s
        },
        page: (s, e) => {
          if (!e.page) {
            s.shown = null
            return s
          }
          const cause = s.latest,
            draw = s.draw
          requireTrace(
            cause &&
              draw &&
              cause.order < draw.order &&
              draw.order < e.order &&
              cause.scene === draw.scene &&
              cause.sceneVisit === draw.sceneVisit &&
              (!e.scene || e.scene === draw.scene),
            'dialogue-page-draw-anchor',
            'preceding same-visit cause and actual draw',
            { cause: cause?.order, draw, page: e.order },
          )
          requireTrace(e.page.slot === s.slot, 'dialogue-source-style', s.slot, e.page.slot)
          if (pagePolicy === 'instance')
            requireTrace(
              e.page.instance === cause.dialogue?.instance && e.sceneVisit === draw.sceneVisit,
              'dialogue-page-instance',
              { instance: cause.dialogue?.instance, sceneVisit: draw.sceneVisit },
              { instance: e.page.instance, sceneVisit: e.sceneVisit },
            )
          const lines = displayedLines(cause.dialogue, s.slot)
          requireTrace(
            lines.length > 0 && same(lines, e.page.lines),
            'dialogue-page-state',
            lines,
            e.page.lines,
          )
          s.pending = null
          let next = cause.order
          const rows = [...lines]
            .reverse()
            .map((text) => {
              const command = s.commands.findLast(
                (c) => c.runId === cause.runId && c.order < next && c.text === text,
              )
              requireTrace(command, 'dialogue-line-source', { text, before: next }, null)
              next = command.order
              return command.row
            })
            .reverse()
          const node = {
            page: e.order,
            draw: draw.order,
            cause: cause.order,
            rows,
            lines,
            scene: draw.scene,
            instance: e.page.instance,
          }
          const prior = s.groups.at(-1)
          if (
            s.shown &&
            prior &&
            prior.consumed === null &&
            (pagePolicy !== 'instance' || prior.instance === e.page.instance) &&
            same(prior.rows, rows.slice(0, prior.rows.length))
          )
            Object.assign(prior, node)
          else s.groups.push({ ...node, started: e.order, consumed: null })
          s.shown = {
            lines,
            rows,
            slot: e.page.slot,
            order: e.order,
            runId: cause.runId,
            instance: e.page.instance,
            sceneVisit: e.sceneVisit,
          }
          s.nodes.push(node)
          s.pages++
          return s
        },
      },
      accept: (s) => {
        requireTrace(!s.pending, 'dialogue-first-draw-coverage', s.pending, 'trace ended')
        requireTrace(
          s.pages > 0,
          'dialogue-pages-present',
          'actual nonempty pages',
          s.pages,
          'unknown',
        )
      },
    },
    events,
  )
  let presentation
  if (
    proof.status === 'proved' &&
    causes(trace).some(
      (event) => event.dialoguePresentationVersion === 1 || event.phase === 'dialogue-presentation',
    )
  ) {
    try {
      presentation = verifyDialoguePresentation(causes(trace), trace.worldRenders ?? [], 'game')
    } catch (error) {
      return {
        model: proof.model,
        status: 'rejected',
        witness: { rule: 'dialogue-slot-presentation', message: String(error) },
      }
    }
  }
  return proof.status === 'proved'
    ? {
        model: proof.model,
        status: proof.status,
        pages: proof.final.pages,
        consumptions: proof.final.consumptions,
        nodes: proof.final.nodes,
        groups: proof.final.groups,
        ...(presentation ? { presentation } : {}),
      }
    : proof
}

/** Semantic dialogue-page correspondence. Progressive full-line reveals refine one page;
 * actual page boundaries and source row identities cannot be shuffled or erased.
 * Local fixed waits, movement and special concurrent choreography retain separate proofs.
 */
export function checkDialogueCorrespondence(gameProof, reforge) {
  if (gameProof.status !== 'proved')
    return {
      model: 'dialogue-page-correspondence/v1',
      status: 'unknown',
      reason: 'Game causal page proof required',
    }
  const pages = (reforge.pages ?? []).filter((e) => e.page)
  const proof = checkTransitionTrace(
    {
      id: 'dialogue-page-correspondence/v1',
      initial: { index: 0 },
      transitions: {
        page: (s, e) => {
          const draw = reforge.worldRenders.findLast((d) => d.order < e.order)
          const ids = e.page.pageTextIds
          const sourceRow = /^dlg\.(\d+)(?:\.v-[a-f0-9]{8})?$/u
          requireTrace(
            Array.isArray(ids) && ids.every((id) => sourceRow.test(id)),
            'dialogue-row-identity',
            'source row IDs or current authored text variants',
            ids,
            'unknown',
          )
          const actual = {
            scene: e.scene ?? draw?.scene,
            rows: ids.map((id) => Number(sourceRow.exec(id)[1])),
          }
          const expected = gameProof.groups[s.index]
          requireTrace(
            expected && same(actual, { scene: expected.scene, rows: expected.rows }),
            'dialogue-page-correspondence',
            expected ?? 'no extra page',
            { ...actual, order: e.order },
          )
          requireTrace(
            typeof e.page.pageText === 'string' && Array.isArray(expected.lines),
            'dialogue-page-text-evidence',
            'actual displayed text in both engines',
            { game: expected.lines, reforge: e.page.pageText },
            'unknown',
          )
          // Variant keys retain the source row identity, but never authorize altered text.
          // Layout whitespace is not dialogue content; colors/timing have separate contracts.
          const text = (value) => value.replace(/\s/gu, '')
          requireTrace(
            text(e.page.pageText) === text(expected.lines.join('\n')),
            'dialogue-displayed-text',
            expected.lines,
            e.page.pageText,
          )
          s.index++
          return s
        },
      },
      accept: (s) =>
        requireTrace(
          s.index === gameProof.groups.length,
          'dialogue-page-coverage',
          gameProof.groups.length,
          s.index,
        ),
    },
    pages.map((e) => ({ ...e, type: 'page' })),
  )
  return proof.status === 'proved'
    ? { status: proof.status, model: proof.model, pages: proof.final.index }
    : proof
}
