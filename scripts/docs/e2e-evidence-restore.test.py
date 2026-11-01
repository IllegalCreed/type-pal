import hashlib
import importlib.util
import io
import json
import os
import sys
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest import mock

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location("e2e_restore", Path(__file__).with_name("restore-e2e-evidence.py"))
restore = importlib.util.module_from_spec(spec)
spec.loader.exec_module(restore)


def descriptor(path, data):
    return {"path": path, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


class EvidenceRestoreTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="evidence-restore-test-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)
        self.root = self.base / "target"
        self.root.mkdir()
        self.payloads = [("build/e2e/one.json", b'{"oldFailure":true}\n'),
                         ("build/e2e/two.bin", b"\x00retained binary\xff\n")]

    def bundle(self, extra=None, missing=False):
        source = self.base / "source.tar.gz"
        with tarfile.open(source, "w:gz") as archive:
            for path, data in self.payloads[:1] if missing else self.payloads:
                info = tarfile.TarInfo("recording/" + path)
                info.size = len(data)
                archive.addfile(info, io.BytesIO(data))
            if extra:
                archive.addfile(extra, io.BytesIO(b"x" * extra.size))
        entries = [descriptor(path, data) for path, data in self.payloads]
        entries.append(descriptor(restore.ARCHIVE_PATH, source.read_bytes()))
        return source, entries

    def run_restore(self, source, entries):
        return restore.restore_set(self.root, entries, local=source)

    def test_complete_exact_restore_and_zero_write_replay(self):
        source, entries = self.bundle()
        first = self.run_restore(source, entries)
        self.assertEqual(first, {"mode": "restored", "verified": 3, "written": 3, "runtimeCredit": 0})
        before = {row["path"]: restore.identity((self.root / row["path"]).stat()) for row in entries}
        for row in entries:
            data = (self.root / row["path"]).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(), row["sha256"])
        self.assertEqual(self.run_restore(source, entries), {"mode": "already-restored", "verified": 3, "written": 0, "runtimeCredit": 0})
        self.assertEqual(before, {row["path"]: restore.identity((self.root / row["path"]).stat()) for row in entries})
        self.assertFalse((self.root / "build" / restore.LOCK).exists())

    def test_changed_compressed_source_is_rejected_before_tar_parse_or_publication(self):
        for mode in ("size", "same-size-sha"):
            with self.subTest(mode=mode):
                self.root = self.base / mode
                self.root.mkdir()
                source, entries = self.bundle()
                data = bytearray(source.read_bytes())
                if mode == "size":
                    data.extend(b"corrupt")
                else:
                    data[-1] ^= 1
                source.write_bytes(data)
                with mock.patch.object(restore.tarfile, "open") as parse:
                    with self.assertRaisesRegex(ValueError, "size differs|SHA256 differs"):
                        self.run_restore(source, entries)
                    parse.assert_not_called()
                self.assertTrue((self.root / "build" / restore.LOCK).is_file())
                self.assertFalse((self.root / self.payloads[0][0]).exists())

    def test_valid_compressed_hash_cannot_launder_a_wrong_native_payload(self):
        source, entries = self.bundle()
        with tarfile.open(source, "w:gz") as archive:
            for index, (path, data) in enumerate(self.payloads):
                wrong = bytes([data[0] ^ 1]) + data[1:] if index == 0 else data
                info = tarfile.TarInfo("recording/" + path)
                info.size = len(wrong)
                archive.addfile(info, io.BytesIO(wrong))
        entries[-1] = descriptor(restore.ARCHIVE_PATH, source.read_bytes())
        with self.assertRaisesRegex(ValueError, "SHA256 differs"):
            self.run_restore(source, entries)
        self.assertFalse((self.root / self.payloads[0][0]).exists())

    def test_missing_required_payload_publishes_nothing(self):
        source, entries = self.bundle(missing=True)
        with self.assertRaisesRegex(ValueError, "required tar artifacts missing"):
            self.run_restore(source, entries)
        self.assertTrue((self.root / "build" / restore.LOCK).exists())
        self.assertFalse((self.root / self.payloads[0][0]).exists())

    def test_failed_network_boundary_emits_original_stderr_and_preserves_recovery_without_installing(self):
        _source, entries = self.bundle()
        binary = self.base / "fake-bin"
        binary.mkdir()
        executable = binary / "gh"
        executable.write_text("#!/bin/sh\nprintf '%s\\n' 'owned network boundary failure' >&2\nexit 2\n")
        executable.chmod(0o755)
        raw = io.BytesIO()
        stream = io.TextIOWrapper(raw, encoding="utf8", write_through=True)
        self.addCleanup(stream.close)
        with mock.patch.dict(os.environ, {"PATH": str(binary) + os.pathsep + os.environ["PATH"]}), mock.patch.object(restore.sys, "stderr", stream):
            with self.assertRaisesRegex(ValueError, "exit=2"):
                restore.restore_set(self.root, entries)
        self.assertEqual(raw.getvalue(), b"owned network boundary failure\n")
        lock = json.loads((self.root / "build" / restore.LOCK).read_text())
        stage = self.root / "build" / lock["stage"]
        self.assertEqual((stage / "download.stderr").read_bytes(), raw.getvalue())
        self.assertEqual(json.loads((stage / "recovery.json").read_text())["installed"], [])
        self.assertFalse((self.root / self.payloads[0][0]).exists())

    def test_traversal_links_and_duplicate_members_are_rejected_even_with_matching_fixture_archive_hash(self):
        cases = [("../escape", tarfile.REGTYPE), ("/absolute", tarfile.REGTYPE),
                 ("unexpected-link", tarfile.SYMTYPE), ("unexpected-hardlink", tarfile.LNKTYPE),
                 ("recording/" + self.payloads[0][0], tarfile.REGTYPE)]
        for index, (name, kind) in enumerate(cases):
            with self.subTest(name=name, kind=kind):
                self.root = self.base / ("target-" + str(index))
                self.root.mkdir()
                info = tarfile.TarInfo(name)
                info.type = kind
                info.linkname = "../../outside"
                info.size = 0
                source, entries = self.bundle(extra=info)
                with self.assertRaisesRegex(ValueError, "unsafe tar|link/device|duplicate"):
                    self.run_restore(source, entries)
                self.assertFalse((self.root / self.payloads[0][0]).exists())
        self.assertFalse((self.base / "escape").exists())

    def test_existing_wrong_artifact_is_not_overwritten(self):
        source, entries = self.bundle()
        path = self.root / self.payloads[0][0]
        path.parent.mkdir(parents=True)
        path.write_bytes(b"existing unrelated bytes")
        with self.assertRaisesRegex(ValueError, "differs"):
            self.run_restore(source, entries)
        self.assertEqual(path.read_bytes(), b"existing unrelated bytes")
        self.assertFalse((self.root / "build" / restore.LOCK).exists())

    def test_parent_symlink_cannot_redirect_writes(self):
        source, entries = self.bundle()
        outside = self.base / "outside"
        outside.mkdir()
        (self.root / "build").mkdir()
        (self.root / "build/e2e").symlink_to(outside, target_is_directory=True)
        with self.assertRaises(ValueError):
            self.run_restore(source, entries)
        self.assertEqual(list(outside.iterdir()), [])

    def test_mid_install_failure_retains_recovery_and_blocks_replay(self):
        source, entries = self.bundle()
        original = os.link
        count = 0

        def fail_third(*args, **kwargs):
            nonlocal count
            count += 1
            if count == 3:
                raise OSError("owned injected link failure")
            return original(*args, **kwargs)

        with mock.patch.object(restore.os, "link", side_effect=fail_third):
            with self.assertRaisesRegex(ValueError, "owned injected link failure"):
                self.run_restore(source, entries)
        lock = json.loads((self.root / "build" / restore.LOCK).read_text())
        recovery = json.loads((self.root / "build" / lock["stage"] / "recovery.json").read_text())
        self.assertEqual(recovery["installed"], [path for path, _data in self.payloads])
        self.assertEqual(recovery["state"], "installing")
        with self.assertRaisesRegex(ValueError, "active evidence restore lock"):
            self.run_restore(source, entries)
        self.assertEqual(hashlib.sha256(source.read_bytes()).hexdigest(), entries[-1]["sha256"])

    def test_late_parent_swap_cannot_write_into_the_new_symlink_destination(self):
        source, entries = self.bundle()
        outside = self.base / "outside"
        outside.mkdir()
        original = os.link
        swapped = False

        def swap_parent(*args, **kwargs):
            nonlocal swapped
            if not swapped:
                parent = self.root / "build/e2e"
                parent.rename(self.root / "build/e2e-owned-old")
                parent.symlink_to(outside, target_is_directory=True)
                swapped = True
            return original(*args, **kwargs)

        with mock.patch.object(restore.os, "link", side_effect=swap_parent):
            with self.assertRaises(ValueError):
                self.run_restore(source, entries)
        self.assertEqual(list(outside.iterdir()), [])
        self.assertTrue((self.root / "build" / restore.LOCK).is_file())

    def test_descriptor_refresh_or_removal_cannot_launder_the_public_native_contract(self):
        path = self.root / "docs/testing/e2e/evidence/e2e-006-current.json"
        path.parent.mkdir(parents=True)
        for entries in ([], [descriptor("build/e2e/fake-%d.json" % index, b"fake") for index in range(8)]):
            path.write_text(json.dumps({"artifacts": entries}))
            with self.assertRaisesRegex(ValueError, "frozen eight-artifact contract changed"):
                restore.contract(self.root)
        self.assertFalse((self.root / "build").exists())

    def test_ci_stages_cover_every_existing_hard_gate_and_require_completion(self):
        script = ("pnpm test:docs-tools && node scripts/docs/check.mjs && "
                  "node scripts/docs/check-document-model.mjs && pnpm check:testing-docs && "
                  "node scripts/docs/check-phase-lore-governance.mjs && "
                  "node scripts/docs/check-content-review.mjs --strict && "
                  "node scripts/docs/report-governance-progress.mjs")
        tools = restore.ci_commands({"check:docs": script}, "tools")
        structure = restore.ci_commands({"check:docs": script}, "structure")
        completeness = restore.ci_commands({"check:docs": script}, "completeness")
        self.assertEqual(tools, [["pnpm", "test:docs-tools"], ["pnpm", "lint"]])
        self.assertEqual(len(structure), 4)
        self.assertEqual(completeness[0], ["node", "scripts/docs/check-content-review.mjs", "--strict"])
        self.assertEqual(completeness[1], ["node", "scripts/docs/report-governance-progress.mjs", "--json", "--require-complete"])
        normalized = tools[:1] + structure + [completeness[0], completeness[1][:2]]
        self.assertEqual([" ".join(command) for command in normalized], script.split(" && "))

    def test_ci_rejects_added_removed_or_reordered_unassigned_commands(self):
        script = " && ".join(restore.CHECK_COMMANDS)
        for changed in (script + " && node new-unassigned-gate.mjs", " && ".join(restore.CHECK_COMMANDS[:-1]),
                        " && ".join(reversed(restore.CHECK_COMMANDS))):
            with self.assertRaisesRegex(ValueError, "explicit stage ownership required"):
                restore.ci_commands({"check:docs": changed}, "structure")
        with self.assertRaisesRegex(ValueError, "unknown documentation CI stage"):
            restore.ci_commands({"check:docs": script}, "unknown")


if __name__ == "__main__":
    unittest.main()
