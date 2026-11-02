"""Inspect the fixed fifteen history candidates; never rewrite a source receipt.

This produces mechanical observations, not semantic or execution acceptance.
Run from the repository root with --output pointing to a fresh evidence JSON.
"""

import argparse
import datetime
import hashlib
import json
import pathlib
import re
import subprocess


def digest(data):
    return hashlib.sha256(data).hexdigest()


def git(*args):
    return subprocess.check_output(["git", *args], stderr=subprocess.PIPE)


def lookup(value, pointer):
    for key in pointer.strip("/").split("/"):
        try:
            value = value[int(key)] if isinstance(value, list) else value[key]
        except (KeyError, IndexError, TypeError, ValueError):
            return {"present": False}
    return {"present": True, "value": value}


def reporter(raw):
    text = raw.decode("utf-8")
    decoder = json.JSONDecoder()
    for match in re.finditer(r"(?m)^\{", text):
        try:
            obj, _ = decoder.raw_decode(text[match.start():])
        except ValueError:
            continue
        if isinstance(obj, dict) and "testResults" in obj and "numTotalTests" in obj:
            return {key: obj.get(key) for key in [
                "startTime", "success", "numTotalTests", "numPassedTests",
                "numFailedTests", "numPendingTests", "numTodoTests",
            ]}
    return None


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--output", required=True)
parser.add_argument("--current-byte-counters", action="store_true")
args = parser.parse_args()
root = pathlib.Path.cwd()
evidence = root / "docs/ops/evidence/DOCS-RECORD-INTEGRITY-1"
screen_path = evidence / "receipt-history-scan.json"
screen_bytes = screen_path.read_bytes()
screen = json.loads(screen_bytes)
candidates = [c for c in screen["candidates"] if not c["commit"].startswith("183ec0bf0")]
if len(candidates) != 15:
    raise RuntimeError("Expected the fixed fifteen unresolved candidates")
output = pathlib.Path(args.output)
if output.exists():
    raise RuntimeError("Capture is immutable; choose a fresh output path")


def write_record(record):
    biome = root / "node_modules/.bin/biome"
    if not biome.exists():
        biome = pathlib.Path("/Users/zhangxu/illegal/type-pal/node_modules/.bin/biome")
    formatted = subprocess.run([str(biome), "format", "--stdin-file-path", str(output)],
        input=json.dumps(record, ensure_ascii=False).encode(), stdout=subprocess.PIPE,
        stderr=subprocess.PIPE, check=True).stdout
    with output.open("xb") as target:
        target.write(formatted)


if args.current_byte_counters:
    path = "docs/ops/evidence/TEST-COVERAGE85-GLM-GAME-1/mutation-results.json"
    source = (root / path).read_bytes()
    records = []
    for index, item in enumerate(json.loads(source)["results"]):
        for phase, execution in item["execution"].items():
            if not isinstance(execution, dict):
                continue
            for stream in ["stdout", "stderr"]:
                descriptor = execution[stream]
                target = "docs/" + descriptor["file"].split("/docs/", 1)[1]
                raw = (root / target).read_bytes()
                records.append({"id": item["id"], "pointer": f"/results/{index}/execution/{phase}/{stream}",
                    "path": target, "declaredBytes": descriptor["bytes"], "actualUtf8Bytes": len(raw),
                    "actualUtf16CodeUnits": len(raw.decode().encode("utf-16-le")) // 2,
                    "sourceSha256": descriptor["sha256"], "actualSha256": digest(raw),
                    "hashMatches": digest(raw) == descriptor["sha256"],
                    "bytesMatch": len(raw) == descriptor["bytes"]})
    write_record({"schemaVersion": 1, "kind": "current-raw-byte-metadata-counter-not-rewritten-execution",
        "sourceHead": git("rev-parse", "HEAD").decode().strip(), "sourcePath": path,
        "sourceSha256": digest(source), "observedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "owner": "Codex root / forensic author", "records": records,
        "policy": "Original receipt and raw bytes remain unchanged. These observations withdraw inaccurate byte-size claims; they do not replace exit codes, test outcomes, or grant a new product execution.",
        "historicalExecutionReplayed": False})
    print(f"Recorded {len(records)} descriptor checks; {sum(not r['bytesMatch'] for r in records)} byte-size counters")
    raise SystemExit(0)

# These are JSON-pointer reading scopes, not path-based document classifications.
scopes = {
    1: ["/actualPhaseProjections/execution", "/rootC1Repair/actualProjectionRegeneration", "/rootPSWritebackRepair/actualConsumers/producer"],
    2: ["/rootC1Repair/actualProjectionRegeneration"],
    3: ["/rootIntakeAcceptance/report/review/rootSameByteGatesVerifiedNotRerunByThisReviewer/logs"],
    4: ["/rootIndependentAcceptance/fullReview/finalSameBytesRootHardGates/checks"],
    7: ["/rootPairedIntegrationGates"],
    10: ["/coverage"],
    11: ["/baseline", "/injections", "/finalReplay"],
    12: ["/results"],
    15: ["/implementation"],
}
cases = []
for number, candidate in enumerate(candidates, 1):
    revision = candidate["commit"]
    source_path = candidate["path"]
    prior_bytes = git("show", f"{revision}^:{source_path}")
    after_bytes = git("show", f"{revision}:{source_path}")
    if digest(prior_bytes) != candidate["beforeSha256"] or digest(after_bytes) != candidate["afterSha256"]:
        raise RuntimeError(f"Screen source pin mismatch: {revision}")
    before, after = json.loads(prior_bytes), json.loads(after_bytes)
    observations = []
    for field in candidate["changedObservationFields"]:
        pointer = field["field"]
        observations.append({"pointer": pointer, "before": lookup(before, pointer), "after": lookup(after, pointer)})
    artifacts = []
    seen = set()

    def walk(value, pointer):
        if isinstance(value, list):
            for i, child in enumerate(value):
                walk(child, f"{pointer}/{i}")
            return
        if not isinstance(value, dict):
            return
        for key in ["path", "log", "file", "consolePath", "smokeLog"]:
            declared = value.get(key)
            if not isinstance(declared, str) or not re.search(r"\.(log|console|tsv|txt|raw\.gz|json)$", declared):
                continue
            if declared.startswith("/") and not declared.startswith(("/tmp/", "/private/tmp/", "/Users/", "/var/folders/")):
                continue
            if (pointer, declared) in seen:
                continue
            seen.add((pointer, declared))
            expected = value.get("logSha256") if key == "log" else value.get("sha256")
            if key == "consolePath":
                expected = value.get("artifacts", {}).get("console", {}).get("sha256")
            row = {"pointer": f"{pointer}/{key}", "declaredPath": declared,
                   "expectedSha256": expected, "expectedBytes": value.get("bytes"), "locations": []}
            # Absolute historical checkout paths are explicitly mapped to their
            # repository docs suffix, then authenticated against the pinned blob.
            relative = "docs/" + declared.split("/docs/", 1)[1] if "/docs/" in declared else None
            if not declared.startswith("/"):
                relative = str(pathlib.Path(source_path).parent / declared)
            if relative is not None:
                try:
                    data = git("show", f"{revision}:{relative}")
                    oid = git("rev-parse", f"{revision}:{relative}").decode().strip()
                    row["locations"].append({"kind": "fixed-git-blob", "path": relative, "revision": revision,
                        "gitObject": oid, "sha256": digest(data), "bytes": len(data),
                        "hashMatches": None if not expected else digest(data) == expected,
                        "declaredBytesMatch": None if value.get("bytes") is None else len(data) == value["bytes"],
                        "utf16CodeUnits": len(data.decode("utf-8").encode("utf-16-le")) // 2 if declared.endswith(("stdout.txt", "stderr.txt")) else None,
                        "reporter": reporter(data) if key == "file" and declared.endswith("stdout.txt") else None})
                except subprocess.CalledProcessError:
                    pass
            local = pathlib.Path(declared) if declared.startswith("/") else root / relative
            if local.is_file() and declared.startswith(("/tmp/", "/private/tmp/", "/var/folders/")):
                data = local.read_bytes()
                retained = evidence / "raw" / f"retained-{digest(data)}.log"
                if retained.exists():
                    if retained.read_bytes() != data:
                        raise RuntimeError("Retained artifact collision")
                else:
                    retained.write_bytes(data)
                row["locations"].append({"kind": "retained-local-original-bytes", "originalPath": declared,
                    "retainedPath": str(retained.relative_to(root)), "sha256": digest(data), "bytes": len(data),
                    "hashMatches": None if not expected else digest(data) == expected,
                    "mtimeNsObservedNow": local.stat().st_mtime_ns,
                    "mtimeCaveat": "Observed local mtime is not authenticated historical execution time; empty diff logs prove no exit code by themselves."})
            artifacts.append(row)
        for key, child in value.items():
            walk(child, f"{pointer}/{key}")

    for pointer in scopes.get(number, []):
        selected = lookup(after, pointer)
        if selected["present"]:
            walk(selected["value"], pointer)
    comparisons = {}
    if number == 1:
        comparisons["oldProducerPreservedAtRootC1Repair"] = before["actualPhaseProjections"]["execution"]["proof"] == after["rootC1Repair"]["actualProjectionRegeneration"]
        for side, obj in [("before", before), ("after", after)]:
            proof = obj["actualPhaseProjections"]["execution"]["proof"]
            data = git("show", f"{revision + '^' if side == 'before' else revision}:docs/phase-governance/catalog.json")
            comparisons[f"{side}CatalogShaMatches"] = digest(data) == proof["catalogSha256"]
    if number == 6:
        comparisons["oldFailurePreserved"] = before["integration"]["additionalQualityLedgerFailure"] == after["integration"]["additionalQualityLedgerFailure"]["originalRecordedFailure"]
    if number == 11:
        comparisons["identityArtifacts"] = []
        phases = [after["baseline"], after["finalReplay"]["phase"]]
        for injection in after["injections"]:
            phases.extend([injection["mutant"]["phase"], injection["restored"]["phase"]])
        for phase in phases:
            item = phase["identity"]["artifact"]
            path = str(pathlib.Path(source_path).parent / item["path"])
            data = git("show", f"{revision}:{path}")
            rows = data.decode().splitlines()
            statuses = [line.rsplit("\t", 1)[-1] for line in rows]
            comparisons["identityArtifacts"].append({"label": phase["label"], "path": path,
                "hashMatches": digest(data) == item["sha256"], "declaredBytesMatch": len(data) == item["bytes"],
                "rows": len(rows), "declaredRows": phase["identity"]["rows"],
                "failedRows": [line for line in rows if line.rsplit("\t", 1)[-1] == "failed"],
                "passed": statuses.count("passed"), "failed": statuses.count("failed"),
                "otherStatuses": sorted(set(statuses) - {"passed", "failed"})})
    if number == 12:
        comparisons["beforeResultCount"] = len(before["results"])
        comparisons["afterResultCount"] = len(after["results"])
        comparisons["existingPhaseRunIdentities"] = []
        for old, new in zip(before["results"], after["results"]):
            for phase in ["greenBefore", "red", "greenAfter"]:
                pair = {}
                for side, row, rev in [("before", old, revision + "^"), ("after", new, revision)]:
                    descriptor = row["execution"][phase]["stdout"]
                    path = "docs/" + descriptor["file"].split("/docs/", 1)[1]
                    data = git("show", f"{rev}:{path}")
                    pair[side] = {"rawHashMatches": digest(data) == descriptor["sha256"], "reporter": reporter(data)}
                comparisons["existingPhaseRunIdentities"].append({"id": old["id"], "phase": phase, **pair})
    if number == 14:
        comparisons["generatedBefore"] = before["generated"]
        comparisons["generatedAfter"] = after["generated"]
        comparisons["stableLabels"] = []
        for batch in before["batches"]:
            old = {r["label"]: r for r in before["batches"][batch]["counterControl"]["records"]}
            new = {r["label"]: r for r in after["batches"][batch]["counterControl"]["records"]}
            comparisons["stableLabels"].append({"batch": batch, "oldCount": len(old), "newCount": len(new),
                "changedSharedLabels": [k for k in old.keys() & new.keys() if old[k] != new[k]],
                "removed": sorted(old.keys() - new.keys()), "added": sorted(new.keys() - old.keys())})
    cases.append({"id": f"C{number:02}", "commit": revision, "sourcePath": source_path,
        "commitTime": candidate["commitTime"], "beforeGitObject": git("rev-parse", f"{revision}^:{source_path}").decode().strip(),
        "afterGitObject": git("rev-parse", f"{revision}:{source_path}").decode().strip(),
        "beforeSha256": digest(prior_bytes), "afterSha256": digest(after_bytes),
        "changedObservations": observations, "artifacts": artifacts, "comparisons": comparisons,
        "manualAdjudication": f"receipt-candidate-adjudication-20261018.md#c{number:02}",
        "scope": "Specified changed receipt fields and referenced artifacts only; not a full semantic review of each source document or a product rerun."})

result = {"schemaVersion": 1, "kind": "fixed-fifteen-receipt-candidate-mechanical-observations",
    "sourceHead": git("rev-parse", "HEAD").decode().strip(), "observedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "sourceScreen": {"path": str(screen_path.relative_to(root)), "sha256": digest(screen_bytes)},
    "owner": "Codex root / author forensic maintenance; not independent acceptance",
    "policy": "Raw copies preserve original bytes, including JSON/TSV content, as indexed execution artifacts. Missing proof and mismatched byte metadata are findings, never automatic acceptance.",
    "cases": cases, "semanticAcceptanceGranted": False, "historicalExecutionReplayed": False}
write_record(result)
print(f"Recorded {len(cases)} candidate investigations; no semantic or historical execution acceptance granted")
