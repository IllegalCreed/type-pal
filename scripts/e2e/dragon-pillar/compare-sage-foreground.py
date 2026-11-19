"""Validate who owns each Sword Saint movement, as well as the rendered scene."""
from hashlib import sha256
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import argparse
import json
import subprocess


spec = spec_from_file_location("sage_visuals", Path(__file__).with_name("compare-sage.py"))
visuals = module_from_spec(spec)
spec.loader.exec_module(visuals)

SCENE = "projects/pal/content/scenes/s150.json"
SAGE = {"scene": "s150", "entity": "e2465"}
STRIDE = ("nudgeEntity", "animEntity")
POSE_WRITES = (*STRIDE, "setEntityFacing", "setEntityFrame")


def phase(path):
    return "prepare" if path[1:3] == ["entry", "prepare"] else "body"


def check_author_scene(report, issues, working_scene):
    revision = report["revision"]
    if working_scene:
        assert report["profile"] == "verify", "capture must bind a committed author scene"
        canonical = working_scene.read_bytes()
    else:
        canonical = subprocess.check_output(["git", "show", f"{revision}:{SCENE}"])
    digest = sha256(canonical).hexdigest()
    assert report["hashes"][SCENE] == digest, ("author bytes differ from the recorded Git object", SCENE, revision)
    scene = json.loads(canonical)
    sage, = (row for row in scene["entities"] if row["id"] == SAGE["entity"])
    if sage.get("behaviors", {}).get("auto") or any(page.get("auto") for page in sage.get("pages", [])):
        issues.append({"kind": "authored-sage-auto-binding"})
    hook = scene["hooks"]["onEnter"]
    variant = hook["variants"][hook["initial"]]
    flow = variant["flow"]
    stage, = (row for row in flow["stages"] if row["id"] == flow["initial"])
    entry = stage["entry"]
    expected_reveal = {"kind": "fade", "outMs": 0, "inMs": 600}
    if entry["reveal"] != expected_reveal:
        issues.append({"kind": "author-reveal-does-not-hold-the-first-step", "actual": entry["reveal"]})
    prepare = entry["prepare"]
    prepare_kinds = [row["kind"] for row in prepare]
    if (prepare_kinds != ["shakeScreen", "teleportParty", *STRIDE] or
            any(row.get("target") != SAGE for row in prepare[2:])):
        issues.append({"kind": "author-prepare-must-place-party-and-commit-first-step"})
    repeats = [row for row in stage["body"] if row["kind"] == "repeat"]
    walk = next((row for row in repeats if row.get("count") == 14 and
                 [leaf["kind"] for leaf in row["body"]] == list(STRIDE) and
                 all(leaf.get("target") == SAGE for leaf in row["body"]) and
                 row.get("intervalMs") == 100), None)
    if not walk or not walk.get("label", "").strip():
        issues.append({"kind": "author-body-lacks-the-fourteen-remaining-steps"})
    if stage["body"][:3] != [{"kind": "wait", "ms": 100}, walk, {"kind": "wait", "ms": 400}]:
        issues.append({"kind": "author-first-and-last-beats-lack-explicit-timing"})
    return {
        "revision": revision, "path": SCENE, "sha256": digest, "variant": hook["initial"],
        "variantLabel": variant.get("label"), "stage": stage["id"], "stageLabel": stage.get("label"),
        "reveal": entry["reveal"], "namedWalk": walk,
        "workingAuthorSnapshot": str(working_scene) if working_scene else None,
    }


def check_sage_foreground(report_path, side, working_scene):
    report = visuals.shared.json_file(report_path)
    issues = []
    authoring = check_author_scene(report, issues, working_scene)
    auto = side["autoBeforeFirstLine"]
    if auto:
        issues.append({"kind": "automatic-leaves-before-first-line", "leaves": len(auto),
                       "nudgeLeaves": side["nativeSageAutoOpCount"],
                       "entities": sorted({row["self"]["entity"] for row in auto})})
    forbidden = [row for row in side["foreground"] if row.get("target") == SAGE and row["op"] not in POSE_WRITES]
    if forbidden:
        issues.append({"kind": "extra-foreground-sage-mutation", "commands": forbidden})
    native_foreground = [row for row in side["foreground"] if row.get("target") == SAGE and row["op"] in STRIDE]
    if len(native_foreground) != 2 * len(visuals.TRAVEL):
        issues.append({"kind": "wrong-foreground-path-count", "observed": len(native_foreground)})
    reference = report["cases"][0].get("foregroundSage")
    proof = {"author": authoring, "recordedForegroundPath": native_foreground, "recordedAutomatic": auto}
    if reference is None:
        issues.append({"kind": "missing-gameplay-clock-and-render-effect-witness"})
        return proof, issues
    events = [row for row in visuals.shared.checked(report_path.parent, reference)
              if row["at"] <= side["visibleCue"]["at"]]
    proof["artifact"] = reference
    proof["events"] = events
    commands = [row for row in events if row["kind"] == "command" and row.get("target") == SAGE]
    effects = [row for row in events if row["kind"] == "effect"]
    reveal = [row for row in events if row["kind"] == "entry-reveal"]
    if len(reveal) != 1 or reveal[0]["options"] != authoring["reveal"] or not reveal[0]["ownsOutgoingFrame"]:
        issues.append({"kind": "runtime-reveal-did-not-commit-authored-entry", "reveal": reveal})
    if any(row["timing"] != "interactive" or row.get("self") for row in commands):
        issues.append({"kind": "sage-effect-dispatched-from-wrong-timing"})
    strides = [row for row in commands if row["op"] in STRIDE]
    paints = [row for row in effects if row["op"] in STRIDE]
    expected = list(STRIDE) * len(visuals.TRAVEL)
    matches = [row["op"] for row in strides] == expected and [row["op"] for row in paints] == expected
    if not matches:
        issues.append({"kind": "wrong-stride-apply-count-or-order",
                       "commands": [row["op"] for row in strides], "effects": [row["op"] for row in paints]})
    pose = [row for row in effects if row["op"] in ("setEntityFacing", "setEntityFrame")]
    if not (len(pose) == 2 and pose[0]["op"] == "setEntityFacing" and pose[0].get("facing") == "left" and
            pose[1]["op"] == "setEntityFrame" and pose[1].get("frame") == 0):
        issues.append({"kind": "wrong-final-pose-writes", "writes": pose})
    proof["strides"] = []
    if not matches:
        return proof, issues
    for i, target in enumerate(visuals.TRAVEL):
        moved, painted = strides[2 * i:2 * i + 2]
        move_effect, paint_effect = paints[2 * i:2 * i + 2]
        logical_phase = "body" if i else "prepare"
        clocks = [row["clock"] for row in (moved, move_effect, painted, paint_effect)]
        clocks += [moved["runnerClock"], painted["runnerClock"]]
        one_clock = clocks[0] is not None and all(clock == clocks[0] for clock in clocks)
        exact_pixel = visuals.pixel(move_effect)
        scope = (phase(moved["path"]), phase(painted["path"]))
        audited = {
            "step": i + 1, "phase": logical_phase, "position": exact_pixel, "sameGameplayClock": one_clock,
            "movePath": moved["path"], "animPath": painted["path"], "clocks": clocks,
            "effectAt": move_effect["at"], "fadeBlack": move_effect["fadeBlack"], "held": move_effect["held"],
            "animationCounter": paint_effect["animationCounter"],
        }
        proof["strides"].append(audited)
        if (scope != (logical_phase, logical_phase) or not one_clock or exact_pixel != target or
                [moved["dx"], moved["dy"], move_effect["dx"], move_effect["dy"]] != [8, -4, 8, -4] or
                move_effect["held"] != (i == 0) or paint_effect["held"] != (i == 0) or
                not moved["at"] <= move_effect["at"] <= painted["at"] <= paint_effect["at"]):
            issues.append({"kind": "wrong-stride-clock-position-or-phase", **audited})
    if any(row["fadeBlack"] > 0.001 for row in proof["strides"][1:]):
        issues.append({"kind": "later-stride-ran-before-the-reveal-completed"})
    if not reveal or proof["strides"][0]["effectAt"] > reveal[0]["at"]:
        issues.append({"kind": "first-stride-did-not-prepare-before-reveal"})
    first_visible = next((frame for frame in side["frames"] if 0 <= frame["opacity"] < 0.999), None)
    if (first_visible is None or visuals.pixel(visuals.actor(first_visible)) != visuals.TRAVEL[0] or
            visuals.actual_index(visuals.drawing(first_visible)) != visuals.GAIT[0] or
            first_visible["at"] >= proof["strides"][1]["effectAt"]):
        issues.append({"kind": "first-step-missing-in-visible-fade"})
    else:
        proof["firstVisibleStride"] = {"at": first_visible["at"], "opacity": first_visible["opacity"],
                                       "position": visuals.pixel(visuals.actor(first_visible)),
                                       "frame": visuals.actual_index(visuals.drawing(first_visible))}
    if any(row.get("activation") for f in side["frames"] for row in f["cast"] if row["id"] == SAGE["entity"]):
        issues.append({"kind": "sage-automatic-activation-observed"})
    if [row["path"] for row in strides] != [row["path"] for row in native_foreground]:
        issues.append({"kind": "unmatched-foreground-steps-between-observers"})
    return proof, issues


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("game_report", type=Path)
    parser.add_argument("reforge_report", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--expect-rejected-auto", action="store_true")
    parser.add_argument("--working-scene", type=Path)
    args = parser.parse_args()
    game = visuals.read_side(args.game_report, "game")
    reforge = visuals.read_side(args.reforge_report, "reforge")
    assert game["revision"] == reforge["revision"] and game["profile"] == reforge["profile"]
    appearance = visuals.visual_issues(game, reforge)
    ownership, issues = check_sage_foreground(args.reforge_report, reforge, args.working_scene)
    result = {"status": "differences-observed" if appearance or issues else "passed",
              "visualDifferences": appearance, "ownershipDifferences": issues, "foregroundOwnership": ownership,
              "game": game, "reforge": reforge}
    with args.output.open("x", encoding="utf8") as output:
        json.dump(result, output, indent=2, ensure_ascii=False)
        output.write("\n")
    print(args.output, result["status"], [row["kind"] for row in appearance + issues])
    if args.expect_rejected_auto:
        assert not appearance, ("negative control does not isolate script ownership", appearance)
        assert any(row["kind"] == "automatic-leaves-before-first-line" and row["nudgeLeaves"] == 15
                   for row in issues), "negative control did not reproduce the 15 correctly rendered automatic writes"
        assert any(row["kind"] == "authored-sage-auto-binding" for row in issues)
    else:
        assert result["status"] == "passed", "cliff ownership or presentation differs"
