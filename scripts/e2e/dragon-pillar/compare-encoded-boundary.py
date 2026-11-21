"""Find source scene and spawn construction in the encoded frames after RNG 002."""
from pathlib import Path
import json
import re
import subprocess
import sys

import numpy as np
from PIL import Image

WIDTH, HEIGHT = 160, 100
CONTENT = (slice(4, -4), slice(4, -4))
MATCH = 0.95


def read_json(path):
    return json.loads(path.read_bytes())


def reference(path):
    with Image.open(path) as image:
        grey = image.convert("L").resize((WIDTH, HEIGHT), Image.Resampling.BILINEAR)
    return np.asarray(grey, dtype=np.uint8)


def visual_signature(pixels):
    array = np.asarray(pixels[CONTENT], dtype=np.float64).ravel()
    array -= np.mean(array)
    std = np.linalg.norm(array)
    return array / std if std else array


def decoded_frames(path, start, panel=None, end=None):
    filters = []
    if panel is not None:
        filters.append(f"crop=640:400:{panel * 640}:0")
    if end is not None:
        filters.append(f"select=lte(t\\,{end:.6f})")
    filters += [f"scale={WIDTH}:{HEIGHT}:flags=bilinear", "format=gray", "showinfo"]
    capture = subprocess.run(
        ["ffmpeg", "-v", "info", "-hide_banner", "-nostdin", "-copyts", "-ss", f"{start:.6f}",
         "-i", str(path), "-map", "0:v:0", "-vf", ",".join(filters), "-fps_mode", "passthrough",
         "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        check=True, capture_output=True,
    )
    times = [float(time) for time in re.findall(r"pts_time:([\d.]+)", capture.stderr.decode())]
    pixels = np.frombuffer(capture.stdout, dtype=np.uint8).reshape((-1, HEIGHT, WIDTH))
    assert len(times) == len(pixels) and len(times) > 10, (path, len(times), len(pixels))
    return zip(times, pixels)


def around_first_film(path, site, align, refs, panel=None):
    original_times = site["firstFilmWindow"]
    seconds = lambda at: (at - align["browserStartedAt"]) / 1000 - align["trimSeconds"]
    dates = {label: seconds(time) for label, time in original_times.items()}
    start = dates["sceneBefore005"]
    first = dates["firstFrame"]
    end = dates["filmEnd"]
    black = dates["after005Black"]
    live = dates["interludeWorld"]

    def summary(pixels, first_time, last_time, templates):
        slots = []
        for time, frame in pixels:
            if not first_time <= time < last_time:
                continue
            sig = visual_signature(frame)
            scores = {label: float(np.dot(sig, template)) for label, template in templates.items()}
            match = max(scores, key=scores.get)
            mean = float(np.mean(frame[CONTENT]))
            slots.append({"ptsSeconds": time, "match": match if scores[match] >= MATCH and mean > 6 else None,
                          "correlation": scores, "meanLuma": mean})
        return slots

    refs_window = {
        "s149-world": refs["s149-world"],
        "rng005-frame-0": visual_signature(reference(site["stages"]["rng-5-frame-0"])),
        "rng005-frame-81": visual_signature(reference(site["stages"]["rng-5-frame-81"])),
        "interlude-crowd": visual_signature(reference(site["stages"]["between-2500ms"])),
    }
    entry_frames = list(decoded_frames(path, max(0, start - 0.12), panel, first + 0.70))
    return_frames = list(decoded_frames(path, end - 0.12, panel, live + 0.16))
    return {
        "windows": dates,
        "prelude": summary(entry_frames, start, first, refs_window),
        "fadingIn": summary(entry_frames, first, first + 0.60, refs_window),
        "heldEnding": summary(return_frames, end, black, refs_window),
        "crowd": summary(return_frames, live - 0.05, live + 0.15, refs_window),
    }


def find_footage(path, align, refs, panel=None):
    base = align["browserStartedAt"]
    seconds = lambda at: (at - base) / 1000 - align["trimSeconds"]
    end = seconds(align["rng002End"])
    frames = []
    for t, pixel in decoded_frames(path, max(0, end - 0.15), panel):
        if t < end - 0.15:
            continue
        sig = visual_signature(pixel)
        scores = {name: float(np.dot(sig, ref)) for name, ref in refs.items()}
        picked = max(scores, key=scores.get)
        frames.append({
            "ptsSeconds": t, "afterRng002Ms": round((t-end)*1000, 1),
            "match": picked if scores[picked] >= MATCH and float(np.mean(pixel[CONTENT])) > 6 else None,
            "correlation": scores,
            "meanLuma": float(np.mean(pixel[CONTENT])),
        })
    labels = {name: [row for row in frames if row["match"] == name and row["afterRng002Ms"] >= 0] for name in refs}
    return {"source": str(path), "align": align, "afterEndMatches": labels, "decodedFrames": frames}


def get_native(path):
    report = read_json(path)
    assert report["engine"] == "reforge" and report["status"] == "passed"
    case = report["cases"][0]
    witness = read_json(path.parent / case["interlude"]["path"])
    events = witness["events"]
    end = next(row for row in events if row["kind"] == "film-end" and row["film"] == 2)
    end_five = next(row["at"] for row in events if row["kind"] == "film-end" and row["film"] == 5)
    initial_five = next(row["at"] for row in events if row.get("filmAsset") == 5 and row.get("filmIndex") == 0)
    black_after = next(row["at"] for row in events if row["kind"] == "world-output" and
                       row["scene"] == "s149" and row["at"] > end_five and row["opacity"] >= 0.999)
    before = next(row["at"] for row in events if row["kind"] == "world-output" and row["scene"] == "s149")
    native = path.parent / Path(report["media"]["native"]["path"]).name
    return {
        "firstFilmWindow": {"sceneBefore005": before, "firstFrame": initial_five, "filmEnd": end_five,
                            "after005Black": black_after, "interludeWorld": witness["images"]["between-2500ms"]["at"]},

        "align": {"browserStartedAt": report["media"]["browser"]["startedAt"], "rng002End": end["at"],
                  "beforeFinalReveal": case["visibleEndpoint"]["at"], "trimSeconds": 0},
        "movie": native,
        "stages": {name: path.parent / raw["image"]["path"] for name, raw in witness["images"].items()},
    }


if __name__ == "__main__":
    baseline_report, candidate_report, destination = map(Path, sys.argv[1:4])
    baseline = get_native(baseline_report)
    candidate = get_native(candidate_report)
    template_paths = {
        "s149-world": baseline["stages"]["149-after-002-uncovered"],
        "s150-default-spawn": baseline["stages"]["150-first-unheld"],
        "s150-correct": baseline["stages"]["150-correct-position"],
        "rng002-frame-92": baseline["stages"]["rng-2-frame-92"],
    }
    refs = {name: visual_signature(reference(path)) for name, path in template_paths.items()}
    old = find_footage(baseline["movie"], baseline["align"], refs)
    assert old["afterEndMatches"]["s149-world"], "baseline native video did not reproduce released RNG frame"
    assert old["afterEndMatches"]["s150-default-spawn"], "baseline native video did not reproduce wrong snow view"
    candidate_paths = {**template_paths, "s150-correct": candidate["stages"]["150-reveal-full"]}
    candidate_refs = {name: visual_signature(reference(path)) for name, path in candidate_paths.items()}
    new = find_footage(candidate["movie"], candidate["align"], candidate_refs)
    old["firstFilm"] = around_first_film(baseline["movie"], baseline, baseline["align"], refs)
    new["firstFilm"] = around_first_film(candidate["movie"], candidate, candidate["align"], refs)
    checked = {"reforgeNative": new}
    if len(sys.argv) > 4:
        media = read_json(Path(sys.argv[4]))
        rf = next(row for row in media["sides"] if row["engine"] == "reforge")
        assert Path(rf["native"]).resolve() == candidate["movie"].resolve()
        assert rf["originMs"] == candidate["align"]["browserStartedAt"]
        panel_align = {**candidate["align"], "trimSeconds": rf["trim"]}
        checked["reforgePanel"] = find_footage(Path(media["video"]), panel_align, candidate_refs, 1)
        checked["reforgePanel"]["firstFilm"] = around_first_film(Path(media["video"]), candidate, panel_align, refs, 1)
    issues = {}
    for name, footage in checked.items():
        outcome = footage["afterEndMatches"]
        failed = [label for label in ("s149-world", "s150-default-spawn") if outcome[label]]
        if not outcome["s150-correct"]:
            failed.append("no-correct-s150-view")
        if len(outcome["rng002-frame-92"]) < 4:
            failed.append("no-visible-held-rng002-frame")
        first = footage["firstFilm"]
        if any(row["match"] in ("s149-world", "interlude-crowd") for row in first["prelude"] + first["heldEnding"]):
            failed.append("exposed-s149-at-005-boundary")
        if sum(row["match"] == "rng005-frame-81" for row in first["heldEnding"]) < 4:
            failed.append("no-visible-held-rng005-frame")
        if not any(row["match"] == "interlude-crowd" for row in first["crowd"]):
            failed.append("no-evidenced-interlude-crowd")
        if failed:
            issues[name] = failed
    result = {"status": "differences-observed" if issues else "passed", "baselineNative": old,
              "candidate": checked, "issues": issues,
              "templates": {"baseline": {label: str(path) for label, path in template_paths.items()},
                            "candidate": {label: str(path) for label, path in candidate_paths.items()}}}
    with destination.open("x", encoding="utf8") as output:
        json.dump(result, output, indent=2)
        output.write("\n")
    print(destination, json.dumps(issues))
    for name, items in {"baseline": old, **checked}.items():
        print(name, {label: [len(frames), frames[0]["ptsSeconds"], frames[-1]["ptsSeconds"]] if frames else [0]
                     for label, frames in items["afterEndMatches"].items()})
