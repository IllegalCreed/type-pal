"""The single CI job owns the complete graph; subprocess failures cannot turn green."""
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
MODULE = ROOT / "scripts/docs/restore-e2e-evidence.py"
spec = importlib.util.spec_from_file_location("retained_evidence_restore", MODULE)
restore = importlib.util.module_from_spec(spec)
spec.loader.exec_module(restore)
EXPECTED = (
    "pnpm test:docs-tools", "node scripts/docs/check.mjs",
    "node scripts/docs/check-document-model.mjs", "pnpm check:testing-docs",
    "node scripts/docs/check-phase-lore-governance.mjs",
    "node scripts/docs/check-content-review.mjs --strict",
    "node scripts/docs/report-governance-progress.mjs",
)
LABELS = ["tools", "navigation", "model", "testing", "phase", "strict", "progress",
          "source-tests", "plan-tests", "lint"]


class CiPlan(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="docs-single-ci-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.docs = self.root / "scripts/docs"
        self.docs.mkdir(parents=True)
        self.scripts = {"check:docs": " && ".join(EXPECTED),
                        "test:docs-tools": "node --test scripts/docs/*.test.mjs",
                        "check:testing-docs": "node scripts/docs/testing.mjs",
                        "lint": "node scripts/docs/lint.mjs"}
        self.trace = self.root / "trace"
        write = "import {appendFileSync} from 'node:fs';appendFileSync('trace',%s);\n"
        for name, label in [("check.mjs", "navigation"), ("check-document-model.mjs", "model"),
                            ("testing.mjs", "testing"), ("check-phase-lore-governance.mjs", "phase"),
                            ("check-content-review.mjs", "strict"),
                            ("report-governance-progress.mjs", "progress"), ("lint.mjs", "lint")]:
            (self.docs / name).write_text(write % json.dumps(label + "\n"))
        (self.docs / "owned.test.mjs").write_text(
            "import {test} from 'node:test';" + write % json.dumps("tools\n") + "test('owned sentinel',()=>{});\n")
        for name, label in [("git-document-snapshot-cache.test.py", "source-tests"),
                            ("documentation-ci-plan.test.py", "plan-tests")]:
            (self.docs / name).write_text("from pathlib import Path\nwith Path('trace').open('a') as f:f.write(" +
                                           repr(label + "\n") + ")\n")
        (self.root / "package.json").write_text(json.dumps({"private": True, "scripts": self.scripts}))

    def run_fixture(self):
        # These are owned sentinel programs testing orchestration, not stand-ins
        # for the real document checks or evidence restoration acceptance.
        program = """
import importlib.util,json,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('runner',sys.argv[1]);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
root=Path(sys.argv[2]);scripts=json.loads((root/'package.json').read_text())['scripts']
module.run_ci_commands(root,module.ci_commands(scripts,'all',root))
"""
        return subprocess.run([sys.executable, "-B", "-c", program, str(MODULE), str(self.root)],
                              stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    def test_one_visible_job_owns_every_original_gate_and_keeps_per_test_deadlines(self):
        self.assertEqual(restore.CHECK_COMMANDS, EXPECTED)
        workflow = (ROOT / ".github/workflows/docs.yml").read_text()
        self.assertEqual(re.findall(r"^  ([a-z-]+):$", workflow.split("jobs:\n")[1], re.M), ["documentation"])
        self.assertNotIn("matrix:", workflow)
        self.assertNotIn("continue-on-error", workflow)
        self.assertRegex(workflow, r"(?m)^    timeout-minutes: 30$")
        self.assertIn("fetch-depth: 0", workflow)
        self.assertIn("pnpm install --frozen-lockfile", workflow)
        self.assertIn("--ci-stage all", workflow)
        commands = restore.ci_commands(self.scripts, "all", self.root)
        self.assertEqual(commands[:6], [command.split() for command in EXPECTED[:6]])
        self.assertEqual(commands[6], EXPECTED[6].split() + ["--require-complete"])
        self.assertEqual(commands[7:], [["python3", "-B", "scripts/docs/git-document-snapshot-cache.test.py"],
                                       ["python3", "-B", "scripts/docs/documentation-ci-plan.test.py"], ["pnpm", "lint"]])
        self.assertFalse(any("--test-shard" in word or "--test-only" in word for c in commands for word in c))

    def test_actual_subprocesses_execute_the_complete_owned_sequence_once(self):
        run = self.run_fixture()
        self.assertEqual(run.returncode, 0, run.stdout + run.stderr)
        self.assertEqual(run.stderr, "")
        self.assertEqual(self.trace.read_text().splitlines(), LABELS)
        self.assertIn("# skipped 0", run.stdout)
        self.assertEqual(run.stdout.count('"argv":'), 10)

    def test_one_real_assertion_failure_aborts_before_any_later_gate(self):
        path = self.docs / "check-document-model.mjs"
        path.write_text(path.read_text() + "import assert from 'node:assert/strict';assert.fail('EXPECTED_GATE_COUNTER');\n")
        run = self.run_fixture()
        self.assertNotEqual(run.returncode, 0)
        self.assertIn("ERR_ASSERTION", run.stderr)
        self.assertIn("EXPECTED_GATE_COUNTER", run.stderr)
        self.assertIn("documentation CI child failed with exit 1", run.stderr)
        self.assertEqual(self.trace.read_text().splitlines(), LABELS[:3])
        self.assertEqual(run.stdout.count('"argv":'), 3)

    def test_added_removed_or_reordered_graphs_reject_before_execution(self):
        original = self.scripts["check:docs"]
        for changed in [original + " && node unassigned.mjs", " && ".join(EXPECTED[:-1]),
                        " && ".join(reversed(EXPECTED))]:
            for stage in ["all", "tools", "structure", "completeness"]:
                with self.assertRaisesRegex(ValueError, "explicit stage ownership required"):
                    restore.ci_commands({**self.scripts, "check:docs": changed}, stage, self.root)
        self.assertFalse(self.trace.exists())

    def test_changed_test_scope_or_success_masking_is_not_an_all_green_run(self):
        for changed in ["node --test scripts/docs/selected.test.mjs",
                        "node --test --test-only scripts/docs/*.test.mjs",
                        self.scripts["test:docs-tools"] + " || true"]:
            with self.assertRaisesRegex(ValueError, "explicit ownership required"):
                restore.ci_commands({**self.scripts, "test:docs-tools": changed}, "all", self.root)

    def test_an_unknown_stage_or_empty_inventory_cannot_report_success(self):
        with self.assertRaisesRegex(ValueError, "unknown documentation CI stage"):
            restore.ci_commands(self.scripts, "unknown", self.root)
        with self.assertRaisesRegex(ValueError, "complete nonempty"):
            restore.ci_commands(self.scripts, "all")
        (self.docs / "owned.test.mjs").unlink()
        with self.assertRaisesRegex(ValueError, "complete nonempty"):
            restore.ci_commands(self.scripts, "all", self.root)


if __name__ == "__main__":
    unittest.main()
