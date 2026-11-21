"""Assemble and decode a real-speed split screen from paired last-pillar E2E captures."""
from hashlib import sha256
from math import ceil
from pathlib import Path
import json
import re
import subprocess
import sys

import numpy as np

PANEL_WIDTH, HEIGHT, FPS = 640, 400, 60
PREROLL_S = 0.4
SAGE_LINE_TAIL_S = 0.35


def fingerprint(path):
    return sha256(path.read_bytes()).hexdigest()


def invoke(tool, *args):
    return subprocess.run([tool, *args], check=True, capture_output=True)


def probe(path, *fields):
    return json.loads(invoke("ffprobe", "-v", "error", *fields, "-of", "json", str(path)).stdout)


def input_for(engine, result):
    path = Path(result["report"])
    assert result["reportSha256"] == fingerprint(path)
    report = json.loads(path.read_bytes())
    assert (report["engine"], report["profile"], report["status"]) == (engine, "capture", "passed")
    media = report["media"]
    assert media["status"] == "passed"
    event = media["semanticEnd"]
    assert (event["event"], event["scene"]) == ("cliff-sage-first-line", "s150")
    assert event["dialogue"]["text"] == "你怎么不阻止他们呢！？"
    native = path.parent / Path(media["native"]["path"]).name
    assert fingerprint(native) == media["native"]["sha256"]
    packets = probe(native, "-select_streams", "v:0", "-show_entries", "packet=pts_time,duration_time")["packets"]
    assert packets
    native_end = max(float(p["pts_time"]) + float(p.get("duration_time", 0.0)) for p in packets)
    streams = probe(native, "-show_entries", "stream=codec_type")["streams"]
    assert {s["codec_type"] for s in streams} == {"video", "audio"}
    origin = media["browser"]["startedAt"]
    anchor = (result["semanticAnchor"] - origin) / 1000
    line_at = (event["dialogue"]["at"] - origin) / 1000
    assert 0 <= anchor < (result["s150VisibleAt"] - origin) / 1000 < line_at < native_end
    # Recording shutdown can follow the first line's natural auto-advance. The
    # split ends on the measured complete words while retaining the preceding native timing.
    end = min(native_end, line_at + SAGE_LINE_TAIL_S)
    last = max(float(p["pts_time"]) for p in packets if float(p["pts_time"]) < end)
    assert line_at + 0.1 < last
    return dict(report=str(path), native=str(native), nativeSha256=fingerprint(native),
                engine=engine, revision=report["revision"], originMs=origin,
                anchor=anchor, last=last, end=end, films=result["films"],
                dialogueNativeSeconds=line_at, uncappedNativeEnd=native_end, dialogueTailSeconds=end-line_at,
                endpointAt=result["s150VisibleAt"])


def rgb_frame(video, time, panel=None):
    filters = []
    if panel is not None:
        filters.append(f"crop={PANEL_WIDTH}:{HEIGHT}:{panel * PANEL_WIDTH}:0")
    filters.append(f"scale={PANEL_WIDTH}:{HEIGHT}:flags=neighbor")
    pixels = invoke(
        "ffmpeg", "-v", "error", "-nostdin", "-ss", f"{time:.6f}", "-i", str(video),
        "-vf", ",".join(filters), "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-",
    ).stdout
    assert len(pixels) == PANEL_WIDTH * HEIGHT * 3, (video, time, panel, len(pixels))
    return np.frombuffer(pixels, dtype=np.uint8).reshape(HEIGHT, PANEL_WIDTH, 3)


def light_pixels(frame):
    return int(np.count_nonzero(np.max(frame, axis=2) > 20))


def channel_level(video, channel):
    log = invoke(
        "ffmpeg", "-hide_banner", "-nostdin", "-i", str(video), "-vn",
        "-af", f"pan=mono|c0=c{channel},volumedetect", "-f", "null", "-",
    ).stderr.decode()
    average = re.search(r"mean_volume: (-?[\d.]+) dB", log)
    peak = re.search(r"max_volume: (-?[\d.]+) dB", log)
    assert average and peak
    level = {"meanDb": float(average.group(1)), "peakDb": float(peak.group(1))}
    assert level["meanDb"] > -60
    return level


def assemble(comparison_path, target):
    comparison = json.loads(comparison_path.read_bytes())
    assert comparison["kind"] == "archived-recording-recomparison"
    assert comparison["fragment"] == "dragon-pillar" and comparison["status"] == "passed"
    assert comparison["comparison"]["findings"] == []
    collapse = comparison["comparison"]["collapse"]
    left, right = (input_for(engine, collapse[engine]) for engine in ("game", "reforge"))
    assert left["revision"] == right["revision"]
    sides = [left, right]
    preroll = min(PREROLL_S, left["anchor"], right["anchor"])
    motion_length = max(side["end"] - side["anchor"] + preroll for side in sides)
    length = ceil((motion_length + 0.100) * FPS) / FPS
    filters = []
    for index, side in enumerate(sides):
        trim = side["anchor"] - preroll
        side["trim"] = trim
        end = side["end"]
        hold = length - (end - trim) + 0.12
        filters += [
            f"[{index}:v]trim=start={trim:.6f}:end={end:.6f},setpts=PTS-{trim:.6f}/TB,"
            f"fps={FPS}:start_time=0,scale={PANEL_WIDTH}:{HEIGHT}:flags=neighbor,setsar=1,"
            f"tpad=stop_mode=clone:stop_duration={hold:.6f}[v{index}]",
            f"[{index}:a]atrim=start={trim:.6f}:end={end:.6f},asetpts=PTS-{trim:.6f}/TB,"
            f"aresample=async=1:first_pts=0,aformat=channel_layouts=stereo,pan=mono|c0=0.5*c0+0.5*c1,"
            f"apad[a{index}]",
        ]
    filters += [
        "[v0][v1]hstack=inputs=2[v]",
        "[a0][a1]join=inputs=2:channel_layout=stereo:map=0.0-FL|1.0-FR[a]",
    ]
    command = [
        "ffmpeg", "-v", "error", "-nostdin", "-n", "-copyts",
        "-i", left["native"], "-i", right["native"],
        "-filter_complex", ";".join(filters), "-map", "[v]", "-map", "[a]",
        "-t", f"{length:.6f}", "-c:v", "libx264", "-crf", "18", "-preset", "fast",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(target),
    ]
    subprocess.run(command, check=True)
    info = probe(target, "-show_entries",
                 "format=duration:stream=codec_type,width,height,avg_frame_rate,channels,codec_name")
    video = next(stream for stream in info["streams"] if stream["codec_type"] == "video")
    audio = next(stream for stream in info["streams"] if stream["codec_type"] == "audio")
    assert (video["width"], video["height"], video["avg_frame_rate"], audio["channels"]) == (
        2 * PANEL_WIDTH, HEIGHT, f"{FPS}/1", 2,
    )
    duration = float(info["format"]["duration"])
    assert abs(duration - length) < 0.05
    for index, side in enumerate(sides):
        side["decodedAudio"] = channel_level(target, index)
        side["decodedFilmSamples"] = []
        for film in side["films"]:
            mid_at = (film["firstDrawAt"] + film["lastDrawAt"]) / 2
            output_at = (mid_at - side["originMs"]) / 1000 - side["trim"]
            rgb = rgb_frame(target, output_at, index)
            light = light_pixels(rgb)
            assert light > 100, (side["engine"], film["chunk"], light)
            side["decodedFilmSamples"].append(dict(
                chunk=film["chunk"], outputSeconds=output_at, lightPixels=light,
                rgbSha256=sha256(rgb.tobytes()).hexdigest(),
            ))
        local_end = rgb_frame(side["native"], side["last"] - 0.001)
        output_end = rgb_frame(target, duration - 2.0 / FPS, index)
        pixel_error = float(np.mean(np.abs(local_end.astype(np.int16) - output_end.astype(np.int16))))
        assert light_pixels(output_end) > 100, (side["engine"], "black final panel")
        assert pixel_error <= 6, (side["engine"], "end panel differs from native", pixel_error)
        side["decodedEndpoint"] = dict(
            outputSeconds=duration - 2.0 / FPS, pixelMeanAbsoluteError=pixel_error,
            lightPixels=light_pixels(output_end), rgbSha256=sha256(output_end.tobytes()).hexdigest(),
        )
    return dict(
        video=str(target), sha256=fingerprint(target), revision=left["revision"], speed=1,
        comparison=str(comparison_path), comparisonSha256=fingerprint(comparison_path),
        soundChannels={"left": "game", "right": "reforge"}, media=info, sides=sides, command=command,
    )


if __name__ == "__main__":
    comparison, video, receipt = map(Path, sys.argv[1:])
    assert not video.exists() and not receipt.exists()
    data = assemble(comparison.resolve(), video.resolve())
    with receipt.open("x", encoding="utf8") as destination:
        json.dump(data, destination, ensure_ascii=False, indent=2)
        destination.write("\n")
    print(video, data["media"]["format"]["duration"], data["sha256"])
