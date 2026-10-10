import { checkTransitionTrace, requireTrace } from './trace-refinement.mjs'

/** Bounded explicit screen effects: actual output trajectory and settlement, not whole-frame RGBA equality. */
export function checkPresentationEffects(trace) {
  const causes = [...(trace.initialCauses ?? []), ...(trace.causes ?? [])].sort(
    (a, b) => a.order - b.order,
  )
  const commands = (trace.causes ?? []).filter(
    (e) =>
      e.phase === 'command' &&
      ['fade', 'ditherScreen'].includes(e.occurrence?.command?.command?.kind),
  )
  return checkTransitionTrace(
    {
      id: 'explicit-presentation-effects/v1',
      initial: { commands: 0, draws: 0 },
      transitions: {
        command: (state, { command: start }) => {
          const command = start.occurrence.command.command
          const deadline = causes.find(
            (e) =>
              e.order > start.order &&
              e.runId === start.runId &&
              ['command', 'stage-settled', 'run-ended'].includes(e.phase),
          )
          requireTrace(
            deadline,
            'presentation-own-deadline',
            'completed explicit screen effect',
            start.order,
            'unknown',
          )
          const owned = causes.filter(
            (e) =>
              e.runId === start.runId &&
              e.occurrence?.id === start.occurrence.id &&
              e.phase.startsWith('presentation-'),
          )
          const beginnings = owned.filter((e) => e.phase === 'presentation-start'),
            endings = owned.filter((e) => e.phase === 'presentation-end')
          requireTrace(
            beginnings.length === 1 && endings.length === 1,
            'presentation-lifetime-evidence',
            'one actual begin/end',
            { beginnings: beginnings.length, endings: endings.length },
            'unknown',
          )
          const begin = beginnings[0],
            end = endings[0],
            spec = begin.presentation
          requireTrace(
            start.order < begin.order &&
              begin.order < end.order &&
              end.order < deadline.order &&
              owned.every((e) => e.effectId === begin.effectId),
            'presentation-occurrence-order',
            'own effect before continuation',
            owned,
          )
          requireTrace(
            spec.kind === command.kind && spec.ms === command.ms,
            'presentation-authored-parameters',
            command,
            spec,
          )
          requireTrace(
            end.presentation.error === null,
            'presentation-success',
            'successful effect settlement',
            end.presentation,
          )
          const draws = owned.filter(
            (e) => e.phase === 'presentation-draw' && e.order > begin.order && e.order < end.order,
          )
          requireTrace(
            draws.length > 0,
            'presentation-actual-output',
            'successful actual output',
            draws.length,
            'unknown',
          )
          if (command.kind === 'fade') {
            const target = command.dir === 'out' ? 1 : 0
            requireTrace(
              spec.to === target &&
                Number.isFinite(spec.from) &&
                spec.from >= 0 &&
                spec.from <= 1 &&
                Number.isFinite(spec.start),
              'fade-initial-value',
              { to: target, from: 'actual [0,1]' },
              spec,
            )
            for (const draw of draws) {
              const d = draw.presentation,
                progress =
                  spec.ms <= 0 ? 1 : Math.max(0, Math.min(1, (d.now - spec.start) / spec.ms))
              const expected = spec.from + (target - spec.from) * progress
              requireTrace(
                d.value === expected && d.color === (command.color ?? 'black'),
                'fade-output-trajectory',
                { value: expected, color: command.color ?? 'black' },
                d,
              )
              if (expected <= 0.001) requireTrace(d.alpha === 0, 'fade-transparent-output', 0, d)
              else {
                const match = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/u.exec(
                  d.style ?? '',
                )
                const rgb = (command.color ?? 'black') === 'red' ? [150, 12, 12] : [0, 0, 0]
                const hex = /^#[\da-f]{6}$/iu.test(d.style ?? '')
                  ? [1, 3, 5].map((i) => parseInt(d.style.slice(i, i + 2), 16))
                  : null
                const paint = match
                  ? [...match.slice(1, 4).map(Number), Number(match[4])]
                  : hex
                    ? [...hex, 1]
                    : null
                requireTrace(
                  paint &&
                    rgb.every((v, i) => paint[i] === v) &&
                    Math.round(paint[3] * 255) === Math.round(Number(expected.toFixed(3)) * 255),
                  'fade-output-paint',
                  { rgb, alphaByte: Math.round(Number(expected.toFixed(3)) * 255) },
                  d.style,
                )
              }
            }
            requireTrace(
              end.presentation.value === target,
              'fade-terminal-value',
              target,
              end.presentation.value,
            )
            if (spec.from !== target && command.ms > 0)
              requireTrace(
                draws.some((d) => d.presentation.value !== spec.from),
                'fade-progress-output',
                'actual progress during the effect lifetime',
                draws.map((d) => d.presentation.value),
                'unknown',
              )
          } else {
            requireTrace(
              spec.source === 'snapshot',
              'dither-source',
              'explicit snapshot',
              spec.source,
            )
            let previous = -1,
              priorTime = null
            for (const draw of draws) {
              const d = draw.presentation
              requireTrace(
                Number.isFinite(d.startedAt) &&
                  Number.isFinite(d.sampledAt) &&
                  d.sampledAt >= d.startedAt &&
                  (priorTime === null || d.sampledAt >= priorTime),
                'dither-output-clock',
                'monotone actual output clock',
                d,
                'unknown',
              )
              const progressAt = (time) =>
                command.ms <= 0 ? 1 : Math.max(0, Math.min(1, (time - d.startedAt) / command.ms))
              requireTrace(
                d.startedAt === draws[0].presentation.startedAt &&
                  (d.isZeroFrame
                    ? d.pr === 0
                    : d.pr >= progressAt(priorTime ?? d.startedAt) &&
                      d.pr <= progressAt(d.sampledAt)),
                'dither-elapsed-time',
                'computed progress between consecutive successful output clocks',
                d,
              )
              requireTrace(
                Number.isFinite(d.pr) &&
                  d.pr >= 0 &&
                  d.pr <= 1 &&
                  d.step === Math.floor(d.pr * 72) &&
                  d.step >= previous &&
                  d.ms === command.ms,
                'dither-output-trajectory',
                'monotone actual 0..72 output',
                d,
              )
              previous = d.step
              priorTime = d.sampledAt
            }
            requireTrace(
              draws[0].presentation.step === 0 &&
                draws[0].presentation.isZeroFrame === true &&
                previous === 72 &&
                end.presentation.step === 72 &&
                draws.at(-1).order < end.order,
              'dither-complete-output',
              'source frame -> target frame -> settlement',
              {
                first: draws[0].presentation,
                last: draws.at(-1).presentation,
                end: end.presentation,
              },
            )
          }
          state.commands++
          state.draws += draws.length
          return state
        },
      },
      accept: () => {},
    },
    commands.map((command) => ({ type: 'command', command })),
  )
}
