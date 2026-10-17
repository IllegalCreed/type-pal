/** Detect generated character-separator damage without editing historical quotes. */
export function generatedTextIssues(text) {
  const live = text.replace(
    /<!-- original-source-quote:start -->[\s\S]*?<!-- original-source-quote:end -->/g,
    '',
  )
  return /(?:[\x20-\x7e]；){8,}/.test(live)
    ? ['generated text contains character-by-character semicolon corruption']
    : []
}

/** Mechanical storage metadata cannot grant semantic or non-author credit. */
export function reviewCreditIssues(entry, review) {
  const issues = []
  if (entry.reviewStatus !== review.contentReviewStatus)
    issues.push('registry/review status mismatch')
  if (entry.templateCompliance !== review.templateCompliance)
    issues.push('registry/review template compliance mismatch')
  if (
    review.contentReviewStatus === 'content-reviewed' &&
    (review.claimCorrection || /structured-mechanical-envelope-only/.test(review.readMethod ?? ''))
  )
    issues.push('withdrawn/mechanical review cannot grant content-reviewed')
  return issues
}
