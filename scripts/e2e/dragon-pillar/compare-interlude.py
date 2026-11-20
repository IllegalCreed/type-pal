"""Verify the actors and the rendered handoff on both sides of the two PAL films."""
from hashlib import sha256
from pathlib import Path
import json
import sys

IDS = [f"e{index}" for index in range(2456, 2464)]
EXPECTED_ENTRY = (68, -2, 0)
EXPECTED_CAMERA = {"x": 960, "y": 416}


def json_file(path):
    return json.loads(path.read_bytes())


def checked(parent, ref):
    path = parent / ref["path"]
    data = path.read_bytes()
    assert sha256(data).hexdigest() == ref["sha256"], path
    assert len(data) == ref["byteLength"], path
    return json.loads(data)


def cast_positions(rows):
    positions = {}
    for row in rows:
        p = row.get("position")
        if not p:
            x, y = row["x"], row["y"]
            p = ((y / 8 + x / 16) / 2, (y / 8 - x / 16) / 2)
        elif isinstance(p, dict):
            p = (p["col"], p["row"])
        positions[row["id"]] = tuple(p)
    return positions


def position(row):
    data = row["leader"]["position"]
    if isinstance(data, dict):
        return data["col"], data["row"], data["height"]
    return tuple(data)


def output_measurement(report_path, engine):
    report = json_file(report_path)
    assert report["engine"] == engine and report["status"] == "passed"
    case = report["cases"][0]
    presentation = checked(report_path.parent, case["interlude"])
    events = presentation["events"]
    world = [row for row in events if row["kind"] == "world-output"]
    commands = [row for row in events if row["kind"] == "auto-op"]
    script = [row for row in events if row["kind"] == "foreground"]
    stages = presentation["images"]
    for stage, capture in stages.items():
        image = capture["image"]
        assert sha256((report_path.parent / image["path"]).read_bytes()).hexdigest() == image["sha256"], stage
    films = {}
    for chunk in (5, 2):
        start, = (row for row in events if row["kind"] == "film-start" and row["film"] == chunk)
        end, = (row for row in events if row["kind"] == "film-end" and row["film"] == chunk)
        movies = [row for row in events if start["at"] <= row["at"] <= end["at"] and
                  (row["kind"] == "film-draw" or row["kind"] == "world-output" and row.get("filmAsset") == chunk)]
        first = movies[0]
        def poses(row):
            return [(sprite["id"], sprite.get("frame", sprite.get("index")), sprite.get("facing"))
                    for sprite in sorted(row.get("draws", []), key=lambda s: s["id"])]
        films[chunk] = {
            "request": start, "completion": end,
            "firstActualFrame": first, "lastActualFrame": movies[-1],
            "autoCommandsDuring": [row for row in commands if start["at"] <= row["at"] <= end["at"]],
            "castPositionChanges": [row for row in movies[1:]
                                    if cast_positions(row["cast"]) != cast_positions(first["cast"])],
            "poseOrDrawChanges": [
                row["at"] for row in movies[1:]
                if poses(row) != poses(first) or [actor.get("facing") for actor in row["cast"]] !=
                   [actor.get("facing") for actor in first["cast"]]
            ],
        }
    if engine == "game":
        for start, finish in ((24891, 24906),):
            normal = {row["ip"] for row in script if start <= row["ip"] <= finish}
            assert normal == set(range(start, finish + 1)), normal
        for film in films.values():
            assert not film["autoCommandsDuring"] and not film["castPositionChanges"]
            assert film["request"]["cast"] == film["completion"]["cast"]
    travel_start = films[5]["completion"]["at"]
    travel_finish = films[2]["request"]["at"]
    interlude_commands = [row for row in commands if travel_start < row["at"] < travel_finish]
    interlude_actors = sorted({
        row["id"] if engine == "game" else row["self"]["entity"] for row in interlude_commands
    })
    prelude = [row for row in commands if row["at"] < films[5]["request"]["at"]]
    before_first_draw = [row for row in world if row["scene"] == "s149" and
                         row["at"] < films[5]["firstActualFrame"]["at"]]
    exposed_prelude = [
        row for row in before_first_draw
        if not row["held"] and not row.get("cinematic") and row.get("opacity", 0) < 0.999
    ]
    first_reveal = stages["between-first-full"]
    crowd = stages["between-2500ms"]
    visible_actors = [row for row in crowd["visibility"] if row["finalPixelsMatching"] >= 40]
    first_reveal_actors = [row for row in first_reveal["visibility"] if row["finalPixelsMatching"] >= 40]
    ready = case["visibleEndpoint"]["at"]
    s150_rows = [row for row in world if row["scene"] == "s150" and row["at"] <= ready]
    assert s150_rows and position(s150_rows[-1]) == EXPECTED_ENTRY
    assert s150_rows[-1]["camera"] == EXPECTED_CAMERA
    uncovered_wrong_target = [
        row for row in s150_rows
        if not row.get("held", False) and row.get("opacity", 0) < 0.999
        and (position(row) != EXPECTED_ENTRY or row["camera"] != EXPECTED_CAMERA)
    ]
    completion = films[2]["completion"]["at"]
    s149_after_002 = [row for row in world if row["scene"] == "s149" and row["at"] > completion]
    assert s149_after_002
    if engine == "game":
        hold_loss = [row for row in s149_after_002 if row["phase"] == "world"]
        first_hold_loss = []
    else:
        after_five = [row for row in world if row["scene"] == "s149" and travel_start < row["at"] < travel_finish]
        black = next(row["at"] for row in after_five if row["opacity"] >= 0.999)
        def wrong_source(rows, film, index):
            return [row for row in rows if row["opacity"] < 0.999 and not row["held"]
                    and (not row["cinematic"] or (row.get("filmAsset"), row.get("filmIndex")) != (film, index))]
        first_hold_loss = wrong_source([row for row in after_five if row["at"] < black], 5, 81)
        hold_loss = wrong_source(s149_after_002, 2, 92)
    return {
        "engine": engine, "revision": report["revision"], "profile": report["profile"], "report": str(report_path),
        "reportSha256": sha256(report_path.read_bytes()).hexdigest(), "interludeArtifact": case["interlude"],
        "stages": stages, "foreground": script, "autoBeforeFirstFilm": prelude,
        "exposedSceneBeforeFirstFilm": exposed_prelude,
        "films": films, "interludeActorsWithActualCommands": interlude_actors,
        "interludeFirstAutoAt": interlude_commands[0]["at"] if interlude_commands else None,
        "firstFullActors": first_reveal_actors, "crowd": visible_actors,
        "wrongTargetUncoveredFrames": uncovered_wrong_target, "earlyReleaseFramesAfter005": first_hold_loss,
        "earlyReleaseFramesAfter002": hold_loss,
        "correctEntryFinal": s150_rows[-1],
    }


def select_short(side):
    return {
        **side,
        "films": {chunk: {**raw, "castPositionChanges": {
            "count": len(raw["castPositionChanges"]), "first": next(iter(raw["castPositionChanges"]), None),
        }} for chunk, raw in side["films"].items()},
    }


if __name__ == "__main__":
    game_path, reforge_path, destination = map(Path, sys.argv[1:])
    game = output_measurement(game_path, "game")
    reforge = output_measurement(reforge_path, "reforge")
    assert game["revision"] == reforge["revision"] and game["profile"] == reforge["profile"]
    assert game["interludeActorsWithActualCommands"] == IDS
    assert len(game["crowd"]) >= 6 and not game["wrongTargetUncoveredFrames"]
    assert not game["earlyReleaseFramesAfter002"]
    issues = []

    if reforge["exposedSceneBeforeFirstFilm"]:
        issues.append({"kind": "uncovered-s149-before-005", "count": len(reforge["exposedSceneBeforeFirstFilm"])})
    if reforge["autoBeforeFirstFilm"]:
        issues.append({"kind": "auto-before-first-film", "count": len(reforge["autoBeforeFirstFilm"])})
    game_initial = game["films"][5]["request"]["cast"]
    rf_initial = reforge["films"][5]["firstActualFrame"]["cast"]
    if cast_positions(game_initial) != cast_positions(rf_initial):
        issues.append({"kind": "first-film-cast-spawn", "game": cast_positions(game_initial), "reforge": cast_positions(rf_initial)})
    for chunk, film in reforge["films"].items():
        if film["autoCommandsDuring"] or film["castPositionChanges"] or film["poseOrDrawChanges"]:
            issues.append({"kind": "auto-during-film", "chunk": chunk,
                           "commands": len(film["autoCommandsDuring"]),
                           "positionChanges": len(film["castPositionChanges"]),
                           "poseOrDrawChanges": len(film["poseOrDrawChanges"])})
    if reforge["interludeActorsWithActualCommands"] and reforge["interludeActorsWithActualCommands"] != IDS:
        issues.append({"kind": "missing-interlude-activity", "actual": reforge["interludeActorsWithActualCommands"]})
    for stage in ("firstFullActors", "crowd"):
        original_ids = sorted(row["id"] for row in game[stage])
        reforge_ids = sorted(row["id"] for row in reforge[stage])
        if original_ids != reforge_ids:
            issues.append({"kind": "different-visible-crowd", "stage": stage,
                           "game": original_ids, "reforge": reforge_ids})
    for chunk in ("005", "002"):
        dropped = reforge[f"earlyReleaseFramesAfter{chunk}"]
        if dropped:
            issues.append({"kind": f"uncovered-s149-after-{chunk}", "count": len(dropped)})
    if reforge["wrongTargetUncoveredFrames"]:
        issues.append({"kind": "uncovered-s150-default-spawn", "count": len(reforge["wrongTargetUncoveredFrames"])})
    result = {
        "status": "differences-observed" if issues else "passed",
        "game": select_short(game), "reforge": select_short(reforge), "differences": issues,
    }
    with destination.open("x", encoding="utf8") as output:
        json.dump(result, output, indent=2, ensure_ascii=False)
        output.write("\n")
    print(destination, json.dumps(issues))
