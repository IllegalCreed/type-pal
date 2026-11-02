# -*- coding: utf-8 -*-
"""Reproduce the stop-generation counter in an isolated tracked-source copy."""
from pathlib import Path
import datetime
import gzip
import hashlib
import json
import shutil
import subprocess
import tempfile
import time


def sha(data):
    return hashlib.sha256(data).hexdigest()


root = Path(__file__).resolve().parents[5]
evidence = Path(__file__).resolve().parent
scratch = Path(tempfile.mkdtemp(prefix="type-pal-3y-midi-counter-"))
source_path = "packages/game/src/shell/audio-midi.ts"
test_path = "packages/game/src/shell/audio-midi.test.ts"
original = (root / source_path).read_bytes()
test = (root / test_path).read_bytes()
needle = b"    stop() {\n      generation++\n"
replacement = b"    stop() {\n"
assert original.count(needle) == 1
mutant = original.replace(needle, replacement)
receipt = {
    "candidate": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root).decode().strip(),
    "startedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "scratch": str(scratch),
    "source": source_path,
    "test": test_path,
    "sourceSha256": sha(original),
    "testSha256": sha(test),
    "mutantSha256": sha(mutant),
    "recipe": {"needle": needle.decode(), "replacement": replacement.decode()},
    "expectedCounter": "MIDI backend lifecycle at media IO boundaries does not play a fetch response that arrives after stop",
    "runs": [],
}


def run(label):
    output = scratch / (label + ".json")
    command = ["pnpm", "--filter", "@type-pal/game", "exec", "vitest", "run",
               "src/shell/audio-midi.test.ts", "--maxWorkers=1", "--reporter=default",
               "--reporter=json", "--outputFile.json=" + str(output), "--silent=false"]
    started = time.monotonic()
    process = subprocess.run(command, cwd=scratch, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    raw = process.stdout
    report = output.read_bytes()
    parsed = json.loads(report)
    identities = [{"file": test_path, "fullName": item["fullName"], "status": item["status"],
                   "failureMessages": item.get("failureMessages", [])}
                  for suite in parsed["testResults"] for item in suite["assertionResults"]]
    (evidence / (label + ".raw.gz")).write_bytes(gzip.compress(raw, mtime=0))
    (evidence / (label + "-tests.json.gz")).write_bytes(gzip.compress(report, mtime=0))
    result = {"label": label, "command": command, "cwd": str(scratch), "exit": process.returncode,
              "seconds": round(time.monotonic() - started, 2),
              "rawSha256": sha(raw), "runnerSha256": sha(report),
              "passed": parsed["numPassedTests"], "failed": parsed["numFailedTests"],
              "pending": parsed["numPendingTests"], "identities": identities,
              "unwrappedAct": raw.count(b"was not wrapped in act("),
              "unsupportedActEnvironment": raw.count(b"The current testing environment is not configured to support act"),
              "navigation": raw.count(b"Not implemented: navigation")}
    receipt["runs"].append(result)
    print(json.dumps({key: value for key, value in result.items() if key != "identities"}), flush=True)
    return result


try:
    names = subprocess.check_output(["git", "ls-files", "-z"], cwd=root).decode().split("\0")
    files = [name for name in names if name and (name.startswith("packages/game/") or name.startswith("packages/shared/")
             or name in ("package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "tsconfig.base.json"))]
    copied = []
    for name in files:
        source = root / name
        if not source.is_file():
            continue
        target = scratch / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        copied.append({"path": name, "sha256": sha(source.read_bytes())})
    receipt["copiedFiles"] = copied
    for base in (Path("."), Path("packages/game"), Path("packages/shared")):
        old = root / base / "node_modules"
        new = scratch / base / "node_modules"
        new.mkdir(exist_ok=True)
        for dependency in old.iterdir() if old.is_dir() else ():
            if dependency.name not in (".vite", ".cache", "@type-pal"):
                (new / dependency.name).symlink_to(dependency.resolve(), target_is_directory=dependency.is_dir())
        (new / "@type-pal").mkdir()
        (new / "@type-pal/shared").symlink_to(scratch / "packages/shared", target_is_directory=True)
    before = run("counter-before")
    assert before["exit"] == 0 and (before["passed"], before["failed"], before["pending"]) == (12, 0, 0)
    (scratch / source_path).write_bytes(mutant)
    counter = run("counter-mutant")
    failures = [item for item in counter["identities"] if item["status"] == "failed"]
    assert counter["exit"] == 1 and (counter["passed"], counter["failed"], counter["pending"]) == (11, 1, 0)
    assert len(failures) == 1 and failures[0]["fullName"] == receipt["expectedCounter"]
    assert any("AssertionError" in message for message in failures[0]["failureMessages"])
    assert all("TypeError" not in message and "timed out" not in message for message in failures[0]["failureMessages"])
    (scratch / source_path).write_bytes(original)
    recovery = run("counter-recovery")
    assert recovery["exit"] == 0 and (recovery["passed"], recovery["failed"], recovery["pending"]) == (12, 0, 0)
    assert (root / source_path).read_bytes() == original and (root / test_path).read_bytes() == test
    receipt["result"] = "expected-business-assertion-only; recovery green; live source/test unchanged"
finally:
    assert scratch.parent == Path(tempfile.gettempdir()) and scratch.name.startswith("type-pal-3y-midi-counter-")
    shutil.rmtree(scratch)
    receipt["scratchRemoved"] = not scratch.exists()
    (evidence / "counter.json").write_text(json.dumps(receipt, indent=2) + "\n")
