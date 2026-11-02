"""Check complete gate ownership and execute native Node shards with sentinels."""
import collections
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("retained_evidence_restore", ROOT / "scripts/docs/restore-e2e-evidence.py")
restore = importlib.util.module_from_spec(spec)
spec.loader.exec_module(restore)
EXPECTED = (
    "pnpm test:docs-tools", "node scripts/docs/check.mjs",
    "node scripts/docs/check-document-model.mjs", "pnpm check:testing-docs",
    "node scripts/docs/check-phase-lore-governance.mjs",
    "node scripts/docs/check-content-review.mjs --strict",
    "node scripts/docs/report-governance-progress.mjs",
)
STAGES = ("tools-1", "tools-2", "tools-3", "navigation", "model", "review", "progress", "lint")


class CiPlan(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="docs-ci-plan-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        (self.root / "scripts/docs").mkdir(parents=True)
        self.paths = []
        for i in range(7):
            path = self.root / ("scripts/docs/unit-" + str(i) + ".test.mjs")
            path.write_text("import {test} from 'node:test';\n" +
                            "test('fixture-" + str(i) + "',()=>process.stdout.write('WITNESS:" + str(i) + "\\n'));\n")
            self.paths.append(str(path.relative_to(self.root)))
        self.scripts = {"check:docs": " && ".join(EXPECTED),
                        "test:docs-tools": "node --test scripts/docs/*.test.mjs"}

    def commands(self, stage):
        return restore.ci_commands(self.scripts, stage, self.root)

    def run_shards(self):
        runs = []
        for stage in STAGES[:3]:
            command, = self.commands(stage)
            run = subprocess.run(command, cwd=self.root, text=True,
                                 stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.assertEqual(run.stderr, "")
            runs.append(run)
        return runs

    def test_workflow_and_plan_cover_every_frozen_gate_and_all_shards_without_lowering_budget(self):
        self.assertEqual(restore.CHECK_COMMANDS, EXPECTED)
        self.assertEqual(restore.CI_MATRIX_STAGES, STAGES)
        workflow = (ROOT / ".github/workflows/docs.yml").read_text()
        matrix = re.search(r"stage: \[([^\]]+)\]", workflow)
        self.assertIsNotNone(matrix)
        self.assertEqual(tuple(p.strip() for p in matrix[1].split(",")), STAGES)
        self.assertIn("fail-fast: false", workflow)
        self.assertIn("if: ${{ always() }}", workflow)
        self.assertIn("needs: [documentation-gates]", workflow)
        self.assertIn('"$GATES_RESULT" != "success"', workflow)
        self.assertEqual(re.findall(r"timeout-minutes:\s*(\d+)", workflow), ["5", "5"])
        for i, stage in enumerate(STAGES[:3], 1):
            command, = self.commands(stage)
            self.assertEqual(command[:3], ["node", "--test", "--test-shard=" + str(i) + "/3"])
            self.assertEqual(command[3:], self.paths)
        commands = self.commands("navigation") + self.commands("model") + self.commands("review")
        progress, = self.commands("progress")
        self.assertEqual(progress[-2:], ["--json", "--require-complete"])
        commands.append(progress[:-2])
        self.assertEqual(collections.Counter(" ".join(c) for c in commands), collections.Counter(EXPECTED[1:]))
        self.assertEqual(self.commands("lint"), [
            ["python3", "-B", "scripts/docs/git-document-snapshot-cache.test.py"],
            ["python3", "-B", "scripts/docs/documentation-ci-plan.test.py"], ["pnpm", "lint"]])

    def test_real_node_shards_execute_each_sentinel_exactly_once_without_skips(self):
        seen = []
        for run in self.run_shards():
            self.assertEqual(run.returncode, 0, run.stdout)
            self.assertIn("# skipped 0", run.stdout)
            seen.extend(int(v) for v in re.findall(r"WITNESS:(\d+)", run.stdout))
        self.assertEqual(collections.Counter(seen), collections.Counter(range(7)))

    def test_one_real_assertion_failure_fails_exactly_its_shard(self):
        (self.root / self.paths[-1]).write_text(
            "import {test} from 'node:test';import assert from 'node:assert/strict';\n"
            "test('designated-shard-counter',()=>assert.fail('EXPECTED_SHARD_COUNTER'));\n")
        runs = self.run_shards()
        failed = [run for run in runs if run.returncode != 0]
        self.assertEqual(len(failed), 1)
        self.assertIn("EXPECTED_SHARD_COUNTER", failed[0].stdout)
        self.assertIn("ERR_ASSERTION", failed[0].stdout)
        self.assertIn("# fail 1", failed[0].stdout)
        self.assertTrue(all(run.returncode == 0 for run in runs if run is not failed[0]))

    def test_added_removed_or_reordered_gates_reject_before_running_any_stage(self):
        original = self.scripts["check:docs"]
        for changed in [original + " && node unassigned.mjs", " && ".join(EXPECTED[:-1]),
                        " && ".join(reversed(EXPECTED))]:
            scripts = {**self.scripts, "check:docs": changed}
            for stage in STAGES:
                with self.assertRaisesRegex(ValueError, "explicit stage ownership required"):
                    restore.ci_commands(scripts, stage, self.root)

    def test_changed_test_scope_or_success_masking_cannot_hide_behind_sharding(self):
        for changed in ["node --test scripts/docs/selected.test.mjs",
                        "node --test --test-only scripts/docs/*.test.mjs",
                        self.scripts["test:docs-tools"] + " || true"]:
            with self.assertRaisesRegex(ValueError, "explicit shard ownership required"):
                restore.ci_commands({**self.scripts, "test:docs-tools": changed}, "tools-1", self.root)

    def test_missing_or_too_small_inventory_rejects_instead_of_an_empty_shard_success(self):
        with self.assertRaisesRegex(ValueError, "test shard root required"):
            restore.ci_commands(self.scripts, "tools-1")
        for path in self.paths[2:]:
            (self.root / path).unlink()
        with self.assertRaisesRegex(ValueError, "every documentation shard requires"):
            self.commands("tools-1")
        for path in self.paths[:2]:
            (self.root / path).unlink()
        with self.assertRaisesRegex(ValueError, "empty documentation test inventory"):
            self.commands("tools-1")


if __name__ == "__main__":
    unittest.main()
