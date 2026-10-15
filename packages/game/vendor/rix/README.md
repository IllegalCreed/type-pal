# RIX / OPL browser kernel

This is the minimal SDLPAL RIX player and Nuked OPL core used by first-phase DOS FM music.
The original source tree and per-file hashes are pinned in [source-manifest.json](source-manifest.json).
Adapted files carry modification notices dated 2026-10-15. Headers retain the original copyright and license notices: AdPlug LGPL-2.1-or-later,
SDLPAL portions GPL-3.0-or-later, Nuked GPL-2.0-or-later. The distributed project is GPL-3.0;
see [GPL](COPYING-GPL-3.0) and [LGPL](COPYING-LGPL-2.1).

## Browser adaptation

[The patch](browser-adapter.patch.gz) replaces filesystem/SDL loading with an owned MKF memory buffer,
removes unused file-provider and metadata APIs, retains sparse track numbers (including empty 29),
normalizes upstream trailing whitespace, and removes unused parameter names to compile with warnings as errors. Synthesizer tables,
including the reference RIX drum initialization, are unchanged.

[bridge.cpp](bridge.cpp) validates archive/command bounds before decoding, emits stereo float PCM,
advances the RIX clock at 70Hz with integer fractional-sample accounting, and preserves OPL state
on loop rewind. Nuked runs in its OPL2 compatibility mode and performs its own output resampling.
This reproduces the selected reference implementation, not a claim of bit-perfect 1995 hardware output.

## Rebuild

Install and activate **Emscripten 4.0.23**, then from the repository root run:

```sh
RIX_EMXX=/path/to/em++ node scripts/audio/build-rix.mjs
```

The generated `packages/game/src/shell/rix/rix.wasm` is committed so ordinary TypeScript build/CI
needs no C++ toolchain. The build uses `-Wall -Wextra -Werror`, has no host imports, filesystem,
SDL, shared memory or memory growth, and uses a fixed 8MiB heap. Source and binary must be updated together.
The application passes the compiled module and archive into an AudioWorklet; no COOP/COEP headers are required.

The authored single-note test fixture has independent native-reference PCM hashes for 44100/48000Hz,
looping and nonlooping playback. Original game music stays in the existing regenerated resource pipeline.

The adapter patch is gzip-compressed without changing patch bytes; use `gzip -dc browser-adapter.patch.gz` to inspect it.
