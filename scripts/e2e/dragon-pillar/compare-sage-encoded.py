"""Compare the two cliff poses and the fully painted first line in both encoded outputs."""
from hashlib import sha256
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import json
import subprocess
import sys

import numpy as np
from PIL import Image

WIDTH, HEIGHT = 320, 200
FULL = "150-reveal-full"
TURN = "150-sage-left"
LINE = "150-sage-first-line"


window_spec = spec_from_file_location("previous_cutscene_window", Path(__file__).with_name("compare-encoded-boundary.py"))
window = module_from_spec(window_spec)
window_spec.loader.exec_module(window)


def decoded_rgb(path, seconds, panel):
    filters = [] if panel is None else [f"crop=640:400:{640 * panel}:0"]
    filters.append(f"scale={WIDTH}:{HEIGHT}:flags=neighbor")
    pixels = subprocess.run(
        ["ffmpeg", "-v", "error", "-nostdin", "-ss", f"{seconds:.6f}", "-i", str(path),
         "-vf", ",".join(filters), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        check=True, capture_output=True,
    ).stdout
    assert len(pixels) == WIDTH * HEIGHT * 3, (path, seconds)
    return np.frombuffer(pixels, dtype=np.uint8).reshape(HEIGHT, WIDTH, 3).astype(np.int16)


def stage_reference(report, stage):
    source = report.parent / stage["image"]["path"]
    assert sha256(source.read_bytes()).hexdigest() == stage["image"]["sha256"]
    with Image.open(source) as png:
        image = png.convert("RGB").resize((WIDTH, HEIGHT), Image.Resampling.NEAREST)
        return np.asarray(image, dtype=np.int16)


def score(ref, frame, mask):
    return float(np.mean(np.abs((ref - frame)[mask])))


def sage_mask(stage):
    sprite, = (row for row in stage["detail"]["draws"] if row["id"] == "e2465" and row["intersects"])
    x, y = sprite["x"], sprite["y"]
    assert type(x) is int and type(y) is int, sprite
    mask = np.zeros((HEIGHT, WIDTH), dtype=bool)
    mask[max(y, 0):min(y + sprite["height"], HEIGHT), max(x, 0):min(x + sprite["width"], WIDTH)] = True
    return mask


def samples(sage, media, panel):
    assert sage["engine"] == media["engine"]
    native = Path(media["native"])
    assert Path(sage["report"]).resolve() == Path(media["report"]).resolve()
    report = Path(media["report"])
    refs = {name: stage_reference(report, sage["stages"][name]) for name in (FULL, TURN, LINE)}
    moved_mask = sage_mask(sage["stages"][FULL]) | sage_mask(sage["stages"][TURN])
    dialogue_mask = np.max(np.abs(refs[LINE] - refs[TURN]), axis=2) > 70
    # The scene is static by the turn. The changed pixels include the actual glyphs and portrait.
    assert int(dialogue_mask.sum()) >= 150, dialogue_mask.sum()
    assert score(refs[FULL], refs[TURN], moved_mask) >= 12
    receipt = {}
    for name in (FULL, TURN, LINE):
        seconds = (sage["stages"][name]["at"] - media["originMs"]) / 1000
        mask = dialogue_mask if name == LINE else moved_mask
        other = FULL if name == TURN else TURN
        expectation = refs[name]
        counterexample = refs[other]
        if name == LINE:
            dates = (media["last"] - 0.001,)
        else:
            dates = tuple(seconds + delta for delta in (0.012, 0.034, 0.056, 0.078))
        candidates = {}
        for track, file, times, index in (
            ("native", native, dates, None),
            ("splitScreen", Path(panel["file"]),
             (panel["duration"] - 0.034,) if name == LINE else tuple(v - media["trim"] for v in dates),
             panel["index"]),
        ):
            ratings = []
            for date in times:
                decoded = decoded_rgb(file, date, index)
                ratings.append({"ptsSeconds": date, "meanError": score(expectation, decoded, mask),
                                "wrongStageError": score(counterexample, decoded, mask)})
            best = min(ratings, key=lambda rating: rating["meanError"])
            assert best["meanError"] < 16 and best["wrongStageError"] > best["meanError"] + 10, (
                sage["engine"], name, track, ratings,
            )
            candidates[track] = {"best": best, "samples": ratings}
        receipt[name] = {"comparedPixels": int(mask.sum()), **candidates}
    return receipt


def phase_still(video, target, sides, phase):
    image = Image.new("RGB", (WIDTH * 4, HEIGHT * 2))
    stamps = {}
    for i, engine in enumerate(("game", "reforge")):
        seconds = sides[engine][phase]["splitScreen"]["best"]["ptsSeconds"]
        pixels = decoded_rgb(video, seconds, i).astype(np.uint8)
        panel = Image.fromarray(pixels).resize((WIDTH * 2, HEIGHT * 2), Image.Resampling.NEAREST)
        image.paste(panel, (i * WIDTH * 2, 0))
        stamps[engine] = seconds
    assert not target.exists()
    image.save(target)
    return {"path": str(target), "sha256": sha256(target.read_bytes()).hexdigest(), "splitSeconds": stamps}


def first_identifiable_snow(video, panel, report, full, begin, end):
    path = Path(report).parent / full["image"]["path"]
    signature = window.visual_signature(window.reference(path))
    for pts, luma in window.decoded_frames(video, max(0, begin - 0.06), panel, end + 0.14):
        match = float(np.dot(signature, window.visual_signature(luma)))
        brightness = float(np.mean(luma))
        if match >= 0.94 and brightness > 6:
            return {"ptsSeconds": pts, "correlation": match, "meanLuma": brightness}
    raise AssertionError(("no recognizable cliff picture during reveal", report, begin, end))


if __name__ == "__main__":
    comparison, media_file, destination = map(Path, sys.argv[1:])
    sage = json.loads(comparison.read_bytes())
    media = json.loads(media_file.read_bytes())
    assert sage["status"] == "passed"
    assert sage["game"]["revision"] == sage["reforge"]["revision"] == media["revision"]
    assert sha256(Path(media["video"]).read_bytes()).hexdigest() == media["sha256"]
    data = {"status": "passed", "revision": media["revision"], "video": media["video"], "sides": {}, "timeline": {}}
    for index, side in enumerate(media["sides"]):
        engine = side["engine"]
        data["sides"][engine] = samples(sage[engine], side, {
            "file": media["video"], "duration": float(media["media"]["format"]["duration"]), "index": index,
        })
        labels = {"firstUnheldFrame": "150-first-unheld", "fullReveal": FULL, "turnedLeft": TURN, "firstLine": LINE}
        dates = {key: sage[engine]["stages"][label]["at"] for key, label in labels.items()}
        stamps = {
            key: round((at - side["originMs"]) / 1000 - side["trim"], 3) for key, at in dates.items()
        }
        stamps["firstIdentifiableSnow"] = first_identifiable_snow(
            Path(media["video"]), index, side["report"], sage[engine]["stages"][FULL],
            stamps["firstUnheldFrame"], stamps["fullReveal"],
        )
        data["timeline"][engine] = stamps
    data["phaseStills"] = {
        label: phase_still(Path(media["video"]), destination.parent / name, data["sides"], label)
        for label, name in ((FULL, "cliff-sage-fully-revealed.png"), (LINE, "cliff-sage-first-line.png"))
    }
    with destination.open("x", encoding="utf8") as output:
        json.dump(data, output, indent=2)
        output.write("\n")
    print(destination)
