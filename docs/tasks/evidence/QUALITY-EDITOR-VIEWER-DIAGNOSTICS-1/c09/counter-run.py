# -*- coding: utf-8 -*-
"""Run actual Viewer business counters in a disposable source copy."""
from pathlib import Path
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
scratch = Path(tempfile.mkdtemp(prefix="type-pal-c09-oracle-"))
product_path = "packages/editor/src/ui/SpriteResourceViewer.tsx"
test_path = "packages/editor/src/ui/SpriteResourceViewer.kimi-workflows.test.tsx"
helper_path = "packages/editor/src/__tests__/cursor-asset-r1/upload-harness.tsx"
product = (root / product_path).read_bytes()
new_test = (root / test_path).read_bytes()
old_test = gzip.decompress((evidence / "SpriteResourceViewer.kimi-workflows.test.tsx.before.gz").read_bytes())
helper = (root / helper_path).read_bytes()
final = json.loads(gzip.decompress((evidence / "final-tests.json.gz").read_bytes()))
identities = [item["fullName"] for suite in final["testResults"] for item in suite["assertionResults"]]
recipes = [
    {"name": "append-selection", "needle": "      selectFrame(loaded.sprite.frames.length)\n",
     "replacement": "      selectFrame(0)\n", "expectedFailure": identities[0]},
    {"name": "late-alive", "needle": "      .then(([sprite, palette]) => {\n        if (!alive) return\n",
     "replacement": "      .then(([sprite, palette]) => {\n", "expectedFailure": identities[-1]},
]
receipt = {"candidate": subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=root).decode().strip(),
           "scratch": str(scratch), "product": product_path, "test": test_path,
           "helper": helper_path, "productSha256": sha(product), "oldTestSha256": sha(old_test),
           "newTestSha256": sha(new_test), "helperSha256": sha(helper), "recipes": recipes, "runs": []}


def run(label, variant, mutated, expected_failure=None):
    (scratch / product_path).write_bytes(mutated)
    (scratch / test_path).write_bytes(old_test if variant == "old" else new_test)
    output = scratch / (label + ".json")
    command = ["pnpm", "--filter", "@type-pal/editor", "exec", "vitest", "run",
               "src/ui/SpriteResourceViewer.kimi-workflows.test.tsx", "--maxWorkers=1", "--reporter=default",
               "--reporter=json", "--outputFile.json=" + str(output), "--silent=false"]
    started = time.monotonic()
    process = subprocess.run(command, cwd=scratch, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    raw = process.stdout
    report = output.read_bytes()
    parsed = json.loads(report)
    actual = [{"file": test_path, "fullName": item["fullName"], "status": item["status"],
               "failureMessages": item.get("failureMessages", [])}
              for suite in parsed["testResults"] for item in suite["assertionResults"]]
    (evidence / (label + ".raw.gz")).write_bytes(gzip.compress(raw, mtime=0))
    (evidence / (label + "-tests.json.gz")).write_bytes(gzip.compress(report, mtime=0))
    result = {"label": label, "variant": variant, "command": command, "cwd": str(scratch),
              "exit": process.returncode, "signal": -process.returncode if process.returncode < 0 else None,
              "spawnError": None, "seconds": round(time.monotonic() - started, 2),
              "executedProductSha256": sha(mutated), "executedTestSha256": sha(old_test if variant == "old" else new_test),
              "rawSha256": sha(raw), "runnerSha256": sha(report), "passed": parsed["numPassedTests"],
              "failed": parsed["numFailedTests"], "pending": parsed["numPendingTests"], "identities": actual,
              "unwrappedAct": raw.count(b"was not wrapped in act("),
              "unsupportedActEnvironment": raw.count(b"The current testing environment is not configured to support act"),
              "navigation": raw.count(b"Not implemented: navigation")}
    receipt["runs"].append(result)
    print(json.dumps({key: value for key, value in result.items() if key != "identities"}), flush=True)
    assert [item["fullName"] for item in actual] == identities
    assert result["pending"] == 0
    if expected_failure:
        assert (result["exit"], result["passed"], result["failed"]) == (1, 4, 1)
        failures = [item for item in actual if item["status"] == "failed"]
        assert len(failures) == 1 and failures[0]["fullName"] == expected_failure
        assert any("AssertionError" in message for message in failures[0]["failureMessages"])
        assert all("TypeError" not in message and "timed out" not in message for message in failures[0]["failureMessages"])
    else:
        assert (result["exit"], result["passed"], result["failed"]) == (0, 5, 0)


try:
    names = subprocess.check_output(["git", "ls-files", "-z"], cwd=root).decode().split("\0")
    packages = ("editor", "content", "reforge", "shared")
    files = [name for name in names if name and (any(name.startswith("packages/" + package + "/") for package in packages)
             or name in ("packages/game/package.json", "package.json", "pnpm-workspace.yaml", "pnpm-lock.yaml", "tsconfig.base.json"))]
    manifest = []
    for name in files:
        source = root / name
        if not source.is_file():
            continue
        target = scratch / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        manifest.append({"path": name, "sha256": sha(source.read_bytes())})
    manifest_bytes = json.dumps(manifest, sort_keys=True).encode()
    (evidence / "counter-input-files.json.gz").write_bytes(gzip.compress(manifest_bytes, mtime=0))
    receipt["inputManifestSha256"] = sha(manifest_bytes)
    receipt["inputManifestFiles"] = len(manifest)
    workspace_packages = (*packages, "game")
    for base in (Path("."), *(Path("packages") / package for package in workspace_packages)):
        old = root / base / "node_modules"
        new = scratch / base / "node_modules"
        new.mkdir(exist_ok=True)
        for dependency in old.iterdir() if old.is_dir() else ():
            if dependency.name not in (".vite", ".cache", "@type-pal"):
                (new / dependency.name).symlink_to(dependency.resolve(), target_is_directory=dependency.is_dir())
        (new / "@type-pal").mkdir()
        for package in workspace_packages:
            (new / "@type-pal" / package).symlink_to(scratch / "packages" / package, target_is_directory=True)
    run("counter-before", "new", product)
    for recipe in recipes:
        needle = recipe["needle"].encode()
        assert product.count(needle) == 1
        mutant = product.replace(needle, recipe["replacement"].encode())
        recipe["mutantSha256"] = sha(mutant)
        for variant in ("old", "new"):
            run("counter-" + recipe["name"] + "-" + variant, variant, mutant, recipe["expectedFailure"])
    run("counter-recovery", "new", product)
    assert (root / product_path).read_bytes() == product and (root / test_path).read_bytes() == new_test
    assert (root / helper_path).read_bytes() == helper
    receipt["result"] = "two business counters retained by old and new tests; full recovery green; live files unchanged"
finally:
    assert scratch.parent == Path(tempfile.gettempdir()) and scratch.name.startswith("type-pal-c09-oracle-")
    shutil.rmtree(scratch)
    receipt["scratchRemoved"] = not scratch.exists()
    (evidence / "counter.json").write_text(json.dumps(receipt, indent=2) + "\n")
