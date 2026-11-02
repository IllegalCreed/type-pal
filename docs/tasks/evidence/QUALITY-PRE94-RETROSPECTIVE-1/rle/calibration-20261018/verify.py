# -*- coding: utf-8 -*-
"""Read-only identity/evidence check; never certifies design or reruns tests."""

from pathlib import Path
import collections
import gzip
import hashlib
import json
import subprocess
import sys


ROOT = Path(__file__).resolve().parents[6]
PACKET = Path(__file__).resolve().parent


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def git(*args):
    return subprocess.check_output(["git", "-C", str(ROOT), *args])


def table(text):
    header = "| 文件 | 类别 | 状态 | 证据 / 验证 | 备注 |"
    body = text.split(header, 1)[1].split("\n\n", 1)[0]
    return {
        line.split("|")[1].strip().strip("`"): line
        for line in body.splitlines()[2:]
        if line.startswith("|")
    }


def main():
    manifest = json.loads((PACKET / "manifest.json").read_text())
    stale = []
    for item in manifest["inputs"]:
        original = git("show", manifest["base"] + ":" + item["path"])
        assert sha(original) == item["sha256"], ("invalid frozen input", item["path"])
        path = ROOT / item["path"]
        if not path.is_file() or sha(path.read_bytes()) != item["sha256"]:
            stale.append(item["path"])
    if stale:
        print("STALE: affected claims need targeted review:", *stale, sep="\n")
        return 2
    for item in manifest["attachments"]:
        assert sha((PACKET / item["path"]).read_bytes()) == item["sha256"], item["path"]
    receipt = json.loads((PACKET / "targeted.json").read_text())
    assert receipt["exit"] == 0 and receipt["signal"] is None
    assert receipt["spawnError"] is None and receipt["fullUncutMergedStdoutStderr"]
    raw = gzip.decompress((PACKET / receipt["raw"]).read_bytes())
    assert len(raw) == receipt["rawBytes"] and sha(raw) == receipt["rawSha256"]
    native = receipt["native"]
    body = gzip.decompress((PACKET / native["path"]).read_bytes())
    assert len(body) == native["uncompressedBytes"]
    assert sha(body) == native["uncompressedSha256"]
    report = json.loads(body)
    assert report["success"] and report["numTotalTests"] == report["numPassedTests"] == 51
    assert report["numFailedTests"] == report["numPendingTests"] == 0
    identities = []
    for file in report["testResults"]:
        # Original absolute reporter paths belong to the recorded execution cwd.
        relative = str(Path(file["name"]).relative_to(receipt["cwd"]))
        for case in file["assertionResults"]:
            identities.append({"file": relative, "fullName": case["fullName"], "status": case["status"]})
    assert identities == manifest["nativeTests"]
    assert all(case["status"] == "passed" for case in identities)
    assert len({(case["file"], case["fullName"]) for case in identities}) == 51
    ledger_path = "docs/ops/audits/code-quality-file-ledger.md"
    drift = json.loads((PACKET / "ledger-drift.json").read_text())
    before = table(git("show", drift["merge"] + "^1:" + ledger_path).decode())
    merged = table(git("show", drift["merge"] + ":" + ledger_path).decode())
    baseline = table(git("show", manifest["base"] + ":" + ledger_path).decode())
    status = lambda row: row.split("|")[3].strip() if row else "missing"
    reviews = {"review", "blocked", "rework"}
    expected = [
        {"path": name, "before": row, "merged": merged.get(name), "current": baseline.get(name)}
        for name, row in before.items()
        if status(row) in reviews and status(merged.get(name)) not in reviews
    ]
    assert drift["lost"] == expected and len(expected) == 243
    assert dict(collections.Counter(status(row["current"]) for row in expected)) == drift["beforeFixCurrentStatusCounts"]
    current = table((ROOT / ledger_path).read_text())
    assert all(status(current.get(name)) == "review" for name in manifest["expectedLedgerRows"])
    print("MATCH: pinned inputs, full artifacts, 51 test identities, 243 historical transitions and two RLE review rows")
    print("LIMIT: identity and recorded execution only; eight-axis semantics and whole-repo gates are not auto-certified")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (AssertionError, OSError, ValueError, KeyError, IndexError, subprocess.CalledProcessError) as error:
        print("FAIL: evidence missing, damaged, or inconsistent:", error)
        sys.exit(1)
