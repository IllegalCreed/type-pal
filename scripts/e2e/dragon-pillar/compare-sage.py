"""Validate physical positions, per-step artwork and the first actual cliff dialogue render."""
from hashlib import sha256
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
from statistics import mean
import json
import sys

shared_path = Path(__file__).with_name("compare-interlude.py")
spec = spec_from_file_location("interlude_checks", shared_path)
shared = module_from_spec(spec)
spec.loader.exec_module(shared)

SAGE = "e2465"
INIT = (1024, 624)
END = (1144, 564)
TRAVEL = [(INIT[0] + n * 8, INIT[1] - n * 4) for n in range(1, 16)]
GAIT = ([7, 6, 8, 6] * 4)[:len(TRAVEL)]
TEXT = "你怎么不阻止他们呢！？"


def pixel(npc):
    if "position" in npc:
        p = npc["position"]
        return 16 * (p["col"] - p["row"]), 8 * (p["col"] + p["row"])
    return npc["x"], npc["y"]


def actor(frame, id=SAGE):
    return next((row for row in frame["cast"] if row["id"] == id), None)


def drawing(frame, id=SAGE):
    return next((row for row in frame["draws"] if row["id"] == id and row["intersects"]), None)


def actual_index(sprite):
    return sprite.get("frame", sprite.get("index")) if sprite else None


def read_side(path, engine):
    report = shared.json_file(path)
    assert report["engine"] == engine and report["status"] == "passed"
    assert report["inputExecution"]["status"] == "passed"
    case = report["cases"][0]
    result = shared.checked(path.parent, case["interlude"])
    events = result["events"]
    images = result["images"]
    game = engine == "game"
    sage_cue = case["sageCue"]
    assert sage_cue["text"] == TEXT and "剑圣" in sage_cue["speaker"]
    actual_speech, = (row for row in events if row["kind"] == "sage-first-line-visible")
    assert actual_speech["at"] == sage_cue["at"]
    stage_names = ("150-first-unheld", "150-reveal-full", "150-sage-walk", "150-sage-left", "150-sage-first-line")
    stages = {name: images[name] for name in stage_names if name in images}
    for stage, probe in stages.items():
        file = path.parent / probe["image"]["path"]
        assert sha256(file.read_bytes()).hexdigest() == probe["image"]["sha256"], stage
        assert probe["detail"]["scene"] == "s150"
    full = stages["150-reveal-full"]
    line = stages["150-sage-first-line"]
    turned = stages["150-sage-left"]
    assert line["detail"]["dialogue"]["text"] == TEXT
    assert "剑圣" in line["detail"]["dialogue"]["speaker"]
    assert actor(turned["detail"])["facing"] == "left" and actor(line["detail"])["facing"] == "left"
    assert actual_index(drawing(turned["detail"])) == actual_index(drawing(line["detail"])) == 3
    assert drawing(full["detail"])["sprite"] == (358 if game else "sprite-358")
    for stage in (full, turned, line):
        assert stage["detail"]["camera"] == {"x": 960, "y": 416}
        witness, = (row for row in stage["visibility"] if row["id"] == SAGE)
        assert witness["clippedOpaque"] >= 500
        assert witness["finalPixelsMatching"] / witness["clippedOpaque"] >= 0.9

    def scene_events(kind):
        return [row for row in events if row.get("scene") == "s150" and row["kind"] == kind]

    foreground = [row for row in scene_events("foreground") if row["at"] <= sage_cue["at"]]
    if game:
        foreground = [row for row in foreground if 24998 <= row["ip"] <= 25007]
        assert [row["ip"] for row in foreground] == list(range(24998, 25008))
        start = next(row for row in foreground if row["ip"] == 25000)
        stop = next(row for row in foreground if row["ip"] == 25001)
        turn = next(row for row in foreground if row["ip"] == 25003)
        assert start["operands"] == [15, 0, 0] and stop["operands"] == [2466, 0, 0]
    else:
        stop = next((row for row in foreground if row["op"] == "selectEntityBehavior" and
                     row["target"] == {"scene": "s150", "entity": SAGE} and
                     row["selection"] == {"kind": "disabled"}), None)
        turn = next(row for row in foreground if row["op"] == "setEntityFacing" and
                    row["target"] == {"scene": "s150", "entity": SAGE})
        assert turn["facing"] == "left"
    assert turn["at"] < sage_cue["at"] and (stop is None or stop["at"] <= turn["at"])
    frames = [row for row in scene_events("world-output") if row["at"] <= sage_cue["at"] and
              actor(row) is not None and not row["held"]]
    assert frames
    start_pixel = (1120, 528)
    hidden_pixel = (1152, 560)
    assert all(pixel(actor(row, "e2464")) == start_pixel and actor(row, "e2464")["facing"] == "up"
               and actual_index(drawing(row, "e2464")) == 6 for row in frames)
    assert all(pixel(actor(row, "e2466")) == hidden_pixel and not drawing(row, "e2466") for row in frames)
    auto = [row for row in scene_events("auto-op") if row["at"] < sage_cue["at"]]
    assert all((row.get("id") if game else row["self"]["entity"]) == SAGE for row in auto)
    actual_nudges = [row for row in auto if (row.get("pc") == 24988 if game else row["op"] == "nudgeEntity")]
    steps = []
    prev = INIT
    for frame in frames:
        npc = actor(frame)
        xyz = pixel(npc)
        if xyz == prev:
            continue
        date = frame["at"]
        d = drawing(frame)
        steps.append({
            "at": date, "afterFirstFullRevealMs": round(date - full["at"], 1),
            "opacity": frame.get("opacity"), "fade": frame.get("fade"), "tick": frame["tick"], "position": xyz,
            "delta": (xyz[0] - prev[0], xyz[1] - prev[1]), "facing": npc["facing"],
            "frame": actual_index(d), "intersects": bool(d),
        })
        prev = xyz
    intervals = [new["at"] - old["at"] for old, new in zip(steps, steps[1:])]
    reaches_end = next((row for row in steps if row["position"] == END), None)
    rest = []
    if reaches_end:
        for frame in frames:
            if frame["at"] < reaches_end["at"]:
                continue
            row = actor(frame)
            rest.append({"at": frame["at"], "position": pixel(row), "facing": row["facing"],
                         "frame": actual_index(drawing(frame))})
    stationary = bool(rest) and all(row["position"] == END for row in rest)
    upstream_rest_frames = [row for row in rest if row["at"] < turn["at"]]
    known_final_gait = bool(upstream_rest_frames) and all(row["facing"] == "up" and row["frame"] == 8
                                                          for row in upstream_rest_frames)
    last_drawn_step = steps[-1] if steps else None
    completed_auto_at = None
    if not game and reaches_end and stop:
        completed_auto_at = next((row["at"] for row in frames
                                  if reaches_end["at"] < row["at"] < stop["at"] and
                                  not actor(row).get("activation")), None)
    source = {
        "engine": engine, "report": str(path), "reportSha256": sha256(path.read_bytes()).hexdigest(),
        "revision": report["revision"], "profile": report["profile"], "interlude": case["interlude"],
        "visibleCue": sage_cue, "stages": stages, "frames": frames, "foreground": foreground,
        "nativeSageAutoOpCount": len(actual_nudges), "autoBeforeFirstLine": auto,
        "phaseFullAt": full["at"], "steps": steps,
        "firstFull": pixel(actor(full["detail"])), "stopped": pixel(actor(turned["detail"])),
        "firstToSecondMs": round(intervals[0], 1) if intervals else None,
        "meanIntervalMs": round(mean(intervals[1:]), 1) if len(intervals) > 1 else None,
        "stopRelativeToRevealMs": round(stop["at"] - full["at"], 1) if stop else None,
        "turnRelativeToStopMs": round(turn["at"] - stop["at"], 1) if stop else None,
        "autoSelectionDisabledAt": stop["at"] if stop else None, "leftFacingSelectedAt": turn["at"],
        "automaticCompletedBeforeCleanupAt": completed_auto_at,
        "lastDrawnStepAt": last_drawn_step["at"] if last_drawn_step else None,
        "lastDrawnStepRelativeToRevealMs": last_drawn_step["afterFirstFullRevealMs"] if last_drawn_step else None,
        "turnRelativeToLastDrawnStepMs": round(turned["at"] - last_drawn_step["at"], 1) if last_drawn_step else None,
        "lineRelativeToLastDrawnStepMs": round(line["at"] - last_drawn_step["at"], 1) if last_drawn_step else None,
        "restThroughFirstLine": {"heldAtExpectedEnd": stationary, "keptLastUpFrameBeforeTurn": known_final_gait,
                                 "samples": rest, "beforeTurnSamples": len(upstream_rest_frames)},
        "cueRelativeToRevealMs": round(line["at"] - full["at"], 1),
        "movesAfterTurn": [row for row in steps if row["at"] >= turn["at"]],
    }
    if game:
        assert [row["position"] for row in steps] == TRAVEL
        assert [row["frame"] for row in steps] == GAIT
        assert source["firstFull"] == TRAVEL[0]
        assert 630 <= source["firstToSecondMs"] <= 770
        assert 90 <= source["meanIntervalMs"] <= 110
        assert source["stopped"] == END
        assert source["nativeSageAutoOpCount"] == len(TRAVEL)
        assert not source["movesAfterTurn"]
        assert stationary and known_final_gait
    return source


def visual_issues(game, reforge):
    issues = []
    if reforge["firstFull"] != game["firstFull"]:
        issues.append({"kind": "reveal-phase-position", "expected": game["firstFull"], "actual": reforge["firstFull"]})
    if reforge["stopped"] != END or [row["position"] for row in reforge["steps"]] != TRAVEL:
        issues.append({"kind": "trajectory", "expectedEnd": END, "actualEnd": reforge["stopped"],
                       "expectedSteps": len(TRAVEL), "actualSteps": len(reforge["steps"])})
    if [row["frame"] for row in reforge["steps"]] != GAIT:
        issues.append({"kind": "walk-frame-order", "expected": GAIT, "actual": [row["frame"] for row in reforge["steps"]]})
    first = reforge["firstToSecondMs"]
    if first is None or abs(first - game["firstToSecondMs"]) > 75:
        issues.append({"kind": "reveal-hold-before-second-step", "gameMs": game["firstToSecondMs"], "reforgeMs": first})
    if reforge["meanIntervalMs"] is None or abs(reforge["meanIntervalMs"] - game["meanIntervalMs"]) > 15:
        issues.append({"kind": "walk-beat", "gameMs": game["meanIntervalMs"], "reforgeMs": reforge["meanIntervalMs"]})
    if any(row["facing"] != "up" for row in reforge["steps"]) or reforge["movesAfterTurn"]:
        issues.append({"kind": "facing-and-stop"})
    ref_rest = reforge["restThroughFirstLine"]
    if not (ref_rest["heldAtExpectedEnd"] and ref_rest["keptLastUpFrameBeforeTurn"]):
        issues.append({"kind": "last-walk-pose-through-turn", "heldAtExpectedEnd": ref_rest["heldAtExpectedEnd"],
                       "keptLastUpFrameBeforeTurn": ref_rest["keptLastUpFrameBeforeTurn"]})
    draw_to_turn = (game["turnRelativeToLastDrawnStepMs"], reforge["turnRelativeToLastDrawnStepMs"])
    if draw_to_turn[1] is None or abs(draw_to_turn[1] - draw_to_turn[0]) > 100:
        issues.append({"kind": "pause-before-turn", "gameMs": draw_to_turn[0], "reforgeMs": draw_to_turn[1]})
    return issues


if __name__ == "__main__":
    game_report, reforge_report, output = map(Path, sys.argv[1:])
    game = read_side(game_report, "game")
    reforge = read_side(reforge_report, "reforge")
    assert game["revision"] == reforge["revision"] and game["profile"] == reforge["profile"]
    issues = visual_issues(game, reforge)
    if reforge["nativeSageAutoOpCount"] != len(TRAVEL):
        issues.append({"kind": "wrong-auto-count", "expected": len(TRAVEL), "actual": reforge["nativeSageAutoOpCount"]})
    if reforge["automaticCompletedBeforeCleanupAt"] is None:
        issues.append({"kind": "auto-did-not-complete-before-cleanup"})
    summary = {"status": "differences-observed" if issues else "passed", "game": game, "reforge": reforge,
               "differences": issues}
    with output.open("x", encoding="utf8") as handle:
        json.dump(summary, handle, indent=2, ensure_ascii=False)
        handle.write("\n")
    print(output, json.dumps(issues))
