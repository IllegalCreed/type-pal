# Version-bound dependency fixes

## @bcoe/v8-coverage 1.0.2

`@bcoe__v8-coverage@1.0.2.patch` preserves the separate identities of V8's static and instance
class initializers when both have the same source span. Ordinary functions keep the original
range-only merge key. Without this fix, two import-only suites can falsely cover uncalled methods.

Owner: Codex. Scope and evidence: [TEST-COVERAGE-TRUTH-1](../docs/ops/archive/tasks/done/TEST-COVERAGE-TRUTH-1-class-initializers.md).
Upstream source: [bcoe/v8-coverage](https://github.com/bcoe/v8-coverage).
No upstream issue/PR has been opened by this task.

Install through `pnpm install --frozen-lockfile`; do not edit installed node_modules. The patch's
SHA-256 is recorded by pnpm in the lockfile, and the installed-resolution regression verifies
the patch file, manifest, lock and actual module path agree. The native and real Vitest tests
exercise that actual installed module, not a copied implementation.

Validation: `node --test scripts/coverage/merge-initializers.test.mjs`.
Remove this patch only after an upstream equivalent fix passes these same regressions and the
official coverage checks. An upgrade requires explicit review; do not silently drop the patch.
This fix does not claim to eliminate unrelated V8/remapper limitations or precisely attribute
every class-field initializer statement.
