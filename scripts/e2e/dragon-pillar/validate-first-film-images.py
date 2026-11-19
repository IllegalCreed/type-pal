"""Bind the first encoded visible frames to frame 0 of the author cutscene assets."""
from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import json
import subprocess
import sys

import numpy as np
from PIL import Image

tools_path = Path(__file__).with_name("compare-encoded-boundary.py")
spec = spec_from_file_location("decode_interlude", tools_path)
codec = module_from_spec(spec)
spec.loader.exec_module(codec)

FRAME0 = r"""
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'
import { tsImport } from 'tsx/esm/api'
const { parseFrameSequence, decodeFrameSequenceBlock } =
  await tsImport('./packages/content/src/frame-sequence.ts', import.meta.url)
for (const id of [5, 2]) {
  const asset = 'projects/pal/assets/migrated/frame-animations/00' + id + '.tpfs'
  const sequence = parseFrameSequence(readFileSync(asset))
  if (sequence.index.width !== 320 || sequence.index.height !== 200) throw Error('wrong source shape')
  const firstBlock = await decodeFrameSequenceBlock(sequence, 0, inflateSync)
  process.stdout.write(firstBlock[0])
}
"""


def signatures():
    pixels = subprocess.check_output(["node", "--input-type=module", "-e", FRAME0])
    native = np.frombuffer(pixels, dtype=np.uint8).reshape((2, 200, 320, 4))
    references = {}
    for frame, chunk, shift in zip(native, (5, 2), (4, 1)):
        candidates = []
        for offset in (-shift, 0, shift):
            shifted = np.roll(frame, offset, axis=0)
            image = Image.fromarray(shifted, "RGBA").convert("L")
            image = image.resize((codec.WIDTH, codec.HEIGHT), Image.Resampling.BILINEAR)
            candidates.append(codec.visual_signature(np.asarray(image)))
        references[chunk] = candidates
    return references


def inspect(path, stage_times, references, trim, panel=None):
    found = {}
    for chunk, (begin, next_frame) in stage_times.items():
        start = begin - trim + 0.10
        end = next_frame - trim + 0.06
        frames = list(codec.decoded_frames(path, start - 0.08, panel, end))
        observed = []
        for pts, pixels in frames:
            if not start <= pts < end:
                continue
            signature = codec.visual_signature(pixels)
            score = max(float(np.dot(candidate, signature)) for candidate in references[chunk])
            if score >= 0.95 and np.mean(pixels) >= 6:
                observed.append({"pts": pts, "correlation": score})
        assert len(observed) >= 4, (path, chunk, "first frame missing from encoded fade", observed)
        found[chunk] = {"sampledStart": start, "firstFrameThrough": next_frame - trim,
                        "matchedFirstFrameSamples": observed}
    return found


if __name__ == "__main__":
    native_report_path, media_path, output = map(Path, sys.argv[1:])
    refs = signatures()
    report = codec.read_json(native_report_path)
    media = codec.read_json(media_path)
    side = next(s for s in media["sides"] if s["engine"] == "reforge")
    source = codec.get_native(native_report_path)
    assert side["originMs"] == source["align"]["browserStartedAt"]
    data = codec.read_json(native_report_path.parent / report["cases"][0]["interlude"]["path"])
    stages = {}
    for chunk in (5, 2):
        begin, first_next = [
            next(row["at"] for row in data["events"] if row.get("filmAsset") == chunk and row.get("filmIndex") == index)
            for index in (0, 1)
        ]
        assert (first_next - begin) >= 500
        stages[chunk] = [(t - side["originMs"]) / 1000 for t in (begin, first_next)]
    result = {
        "status": "passed",
        "native": inspect(source["movie"], stages, refs, 0),
        "rightPanel": inspect(Path(media["video"]), stages, refs, side["trim"], 1),
    }
    with output.open("x", encoding="utf8") as handle:
        json.dump(result, handle, indent=2)
        handle.write("\n")
    print(output, {name: {key:len(rows["matchedFirstFrameSamples"]) for key,rows in tests.items()} for name, tests in result.items()})
